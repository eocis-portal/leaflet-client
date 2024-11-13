
import json
import logging
import os
from io import BytesIO
from flask import Flask, render_template, request, send_from_directory, abort, jsonify, send_file
import xarray as xr
import datetime
import numpy as np
import io
import math

from pystac_client import Client

import datashader as dsh
import datashader.transfer_functions as tf
from datashader import reductions as rd
from threading import Lock

cache_location = "cache"


class DataLoader:

    def __init__(self, cache_location, layer_definitions):
        self.cache_location = cache_location
        self.layer_definitions = layer_definitions
        self.client = Client.open("https://api.stac.ceda.ac.uk")
        self.load_lock = Lock()

    def get_layer_definitions(self):
        return self.layer_definitions

    def __open_dataarray_from_stac_item(self, item, variable):
        ref_url = ""
        filename = ""
        for (key, value) in item.assets.items():
            if key == "reference_file":
                ref_url = value.href
            else:
                filename = key+".nc"

        try:
            cache_path = os.path.join(self.cache_location,filename)
            self.load_lock.acquire()
            if not os.path.exists(cache_path):
                ds = xr.open_dataset("reference://", engine="zarr", backend_kwargs={
                   "consolidated": False,
                   "storage_options": {"fo": ref_url, "remote_protocol": "https", "remote_options": {}}
                })
                da = ds[variable].squeeze()
                ds = xr.Dataset({variable:da})
                ds.to_netcdf(cache_path)

            ds = xr.open_mfdataset(cache_path)

            da = ds[variable]
            return da
        finally:
            self.load_lock.release()

        return None

    def get_dataarray(self, layer_name, date):
        layer_definition = self.layer_definitions[layer_name]
        collection = layer_definition.get("collection", None)
        path = layer_definition.get("path", None)
        variable = layer_definition["variable"]

        da = None

        if path:
            ds = xr.open_mfdataset([path])
            da = ds[variable]
            flip = self.layer_definitions[layer_name].get("flip","")
            if flip:
                da = da.isel(**{flip:slice(None, None, -1)})

        elif collection:

            search = self.client.search(
                collections=[collection],
                datetime=(datetime.datetime(date.year,date.month,date.day,0,0,0),datetime.datetime(date.year,date.month,date.day,23,59,59))
            )

            for item in search.item_collection().items:
                da = self.__open_dataarray_from_stac_item(item,variable)

        climatology_path = self.layer_definitions[layer_name].get("climatology_path",None)
        if da is not None and climatology_path:
            climatology_path = climatology_path.replace("{DOY}",f"{date.timetuple()[7]:03d}")
            print(climatology_path)
            if os.path.exists(climatology_path):
                climatology_da = xr.open_mfdataset([climatology_path])[variable].squeeze(drop=True)
                da = da - climatology_da

        else:
            if "scale" in layer_definition:
                da = da * layer_definition["scale"]
            if "offset" in layer_definition:
                da = da + layer_definition["offset"]
        return da

    def get_legend(self, layer_name, width=300, height=30):
        vmin = self.layer_definitions[layer_name]["min"]
        vmax = self.layer_definitions[layer_name]["max"]

        ldata = xr.DataArray(np.zeros((height, width)), dims=("y", "x"))
        ldata["x"] = xr.DataArray(np.arange(0, width), dims=("x",))
        ldata["y"] = xr.DataArray(np.arange(0, height), dims=("y",))

        for i in range(0, width):
            v = vmin + i * (vmax - vmin) / width
            ldata[:, i] = v

        lcvs = dsh.Canvas(plot_width=width, plot_height=height,
                          x_range=(0, width),
                          y_range=(0, height))

        lagg = lcvs.raster(ldata, agg=rd.first, interpolate='linear')

        lshaded = tf.shade(lagg, cmap=self.get_cmap(self.layer_definitions[layer_name]["cmap"]),
                           how="linear",
                           span=(vmin, vmax))

        pil_image = lshaded.to_pil()
        img_io = io.BytesIO()
        pil_image.save(img_io, format='PNG')
        img_io.seek(0)
        return img_io

    def get_image(self, layer_name, dt, width, height, x_min, y_min, x_max, y_max):
        minv = self.layer_definitions[layer_name]["min"]
        maxv = self.layer_definitions[layer_name]["max"]
        aggfn = self.layer_definitions[layer_name].get("aggfn","mean")

        if aggfn == "mode":
            agg = rd.mode
        elif aggfn == "mean":
            agg = rd.mean
        elif aggfn == "first":
            agg = rd.first
        elif aggfn == "last":
            agg = rd.last
        elif aggfn == "sum":
            agg = rd.sum
        else:
            raise Exception(f"Unknown aggregation function {aggfn}")

        da = self.get_dataarray(layer_name, dt)

        if da is None:
            raise Exception("Could not load data")

        cvs = dsh.Canvas(plot_width=width, plot_height=height,
                         x_range=(x_min, x_max),
                         y_range=(y_min, y_max))


        agg = cvs.raster(da, agg=agg, interpolate='nearest')

        shaded = tf.shade(agg, cmap=self.get_cmap(self.layer_definitions[layer_name]["cmap"]),
                          how="linear",
                          span=(minv, maxv))

        p = shaded.to_pil()
        img_io = BytesIO()
        p.save(img_io, format="PNG")
        img_io.seek(0)
        return img_io

    def get_point_value(self, layer_name, y, x, dt: datetime.datetime = None):

        v = None

        da = self.get_dataarray(layer_name, dt)

        if da is not None:
            layer_definition = self.layer_definitions[layer_name]

            x_dim = layer_definition.get("x_dim", "lon")
            y_dim = layer_definition.get("y_dim", "lat")
            selector = {y_dim: y, x_dim: x, "method": "nearest"}

            if dt is not None:
                t_dim = layer_definition.get("t_dim", None)
                if t_dim is not None:
                    selector[t_dim] = dt.strftime("%Y-%m-%d")

            v = da.sel(**selector).load().item()
            if math.isnan(v):
                v = None

        result = {}
        crs = layer_definition.get("crs", "EPSG:4326")
        if crs == "EPSG:27700":
            result["location"] = f"northing={int(y)},easting={int(x)}"
        else:
            result["location"] = f"lat={y:.2f},lon={x:.2f}"

        if v is None:
            return result

        if "categories" in layer_definition:
            result["category"] = layer_definition["categories"].get(str(int(v)), "?")
        else:
            result["value"] = v
            result["label"] = layer_definition["name"]
            result["units"] = layer_definition["units"]

        return result

    def get_cmap(self, name):
        cmap_folder = os.path.join(os.path.split(__file__)[0],"..","cmaps")
        cmap_path = os.path.join(cmap_folder, name+".json")
        if os.path.exists(cmap_path):
            with open(cmap_path) as f:
                cmap = json.loads(f.read())
                colours = []
                for cpoint in cmap:
                    [r_frac,g_frac,b_frac] = cpoint
                    colour = "#%2X%2X%2X" % (round(r_frac*255),round(g_frac*255),round(b_frac*255))
                    colours.append(colour)
                return colours
        else:
            raise Exception(f"colour map {name} not found")

config = None
with open(os.path.join(os.path.split(__file__)[0],"config.json")) as f:
    config = json.loads(f.read())

data_loader = DataLoader("cache",config["layers"])

app = Flask(__name__)

app.config.from_object(config["app"])

class App:
    """
    Define the routes and handlers for the web service
    """

    logger = logging.getLogger("app")

    def __init__(self):
        pass

    @staticmethod
    @app.route('/', methods=['GET'])
    @app.route('/index.html', methods=['GET'])
    def fetch():
        return send_from_directory('../../../static', 'index.html')

    @staticmethod
    @app.route('/legend', methods=['GET'])
    def legend():
        layer = request.args.get("layer")
        img = data_loader.get_legend(layer)
        return send_file(img, mimetype='image/png')

    @staticmethod
    @app.route('/layers', methods=['GET'])
    def layers():
        response = jsonify(data_loader.get_layer_definitions())
        return response

    @staticmethod
    @app.route('/wms_service', methods=['GET'])
    def wms():
        service = request.args.get("service")
        req = request.args.get("request")
        if service == "WMS" and req == "GetMap":
            layers = request.args.get("layers")
            styles = request.args.get("styles")
            format = request.args.get("format")
            transparent = request.args.get("transparent")
            version = request.args.get("version")
            width = int(request.args.get("width"))
            height = int(request.args.get("height"))
            srs = request.args.get("srs")
            bbox = request.args.get("bbox")
            time = request.args.get("TIME")
            dt = datetime.datetime.strptime(time[:16],"%Y-%m-%dT%H:%M") if time else None
            print(service,req,layers,styles,format,transparent,version,width,height,srs,bbox,dt)
            coords = bbox.split(",")
            y_min = float(coords[0])
            x_min = float(coords[1])
            y_max = float(coords[2])
            x_max = float(coords[3])
            img = data_loader.get_image(layers,dt,width,height,x_min,y_min,x_max,y_max)
            return send_file(img, mimetype='image/png')
        else:
            abort(404)

    @staticmethod
    @app.route("/point_service/<string:layer>/<string:yx>/<string:dt>", methods=['GET'])
    def fetch_with_time(layer, yx, dt):
        (y, x) = tuple(yx.split(":"))
        (y, x) = (float(y), float(x))
        dt = datetime.datetime.strptime(dt, "%Y-%m-%d")
        value = data_loader.get_point_value(layer, y, x, dt)
        response = jsonify(value)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    @staticmethod
    @app.route("/point_service/<string:layer>/<string:yx>", methods=['GET'])
    def fetch_without_time(layer, yx):
        (y, x) = tuple(yx.split(":"))
        (y, x) = (float(y), float(x))
        value = data_loader.get_point_value(layer, y, x)
        response = jsonify(value)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    @app.route('/<path:path>')
    def catch_all(path):
        return send_from_directory('../../../static', path)


if __name__ == '__main__':
    host = app.config.get("HOST", "0.0.0.0")
    port = app.config.get("PORT", 9019)
    app.run(host=host,port=port,threaded=True)
