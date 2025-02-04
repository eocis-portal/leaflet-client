# MIT License
#
# Copyright (C) 2023-2025 National Centre For Earth Observation (NCEO)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software
# and associated documentation files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all copies or
# substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import json
import logging
import os
from io import BytesIO
import xarray as xr
import datetime
import numpy as np
import io
import math
import pyproj
from PIL import Image

from eocis_data_manager.data_schema import DataSchema
from eocis_data_manager.data_loader import DataLoader

import datashader as dsh
import datashader.transfer_functions as tf
from datashader import reductions as rd

class LayerLoader:

    def __init__(self, data_config_path, viewer_config_path, scratch_area):
        self.logger = logging.getLogger("layer_loader")
        self.data_schema = DataSchema(data_config_path)
        self.data_loader = DataLoader(dataset_schema=self.data_schema, scratch_area=scratch_area)

        with open(viewer_config_path) as f:
            self.config = json.loads(f.read())

        # get a flattened list of all layers
        self.layer_definitions = {}
        for subset_name in self.config:
            for layer_name in self.config[subset_name]["layers"]:
                print(layer_name)
                self.logger.info(f"Loading layer {layer_name}")
                layer = self.config[subset_name]["layers"][layer_name]
                if layer_name in self.layer_definitions:
                    raise Exception(f"layer {layer_name} appears in multiple subsets")
                self.layer_definitions[layer_name] = layer
                layer["subset"] = subset_name
                layer["projection"] = self.config[subset_name]["projection"]
                dataset_id = layer["dataset"]
                variable_id = layer["variable"]
                dataset = self.data_schema.get_dataset(dataset_id)
                if dataset.start_date is not None:
                    layer["start_date"] = dataset.start_date.strftime("%Y-%m-%d")
                if dataset.end_date is not None:
                    layer["end_date"] = dataset.end_date.strftime("%Y-%m-%d")
                variable = dataset.get_variable(variable_id)
                if "name" not in layer:
                    layer["name"] = variable.variable_name
                if "short_description" not in layer:
                    layer["short_description"] = variable.short_description
                if "long_description" not in layer:
                    layer["long_description"] = variable.long_description

    def get_layer_definitions(self, subset_name):
        return self.config[subset_name]

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

    def get_dataarray(self, layer_name, dt):
        layer_definition = self.layer_definitions[layer_name]
        dataset_id = layer_definition["dataset"]
        variable = layer_definition["variable"]

        da = self.data_loader.get_dataarray(dataset_id, variable, dt)

        if da is not None:
            if "scale" in layer_definition:
                da = da * layer_definition["scale"]
            if "offset" in layer_definition:
                da = da + layer_definition["offset"]

            flip = self.layer_definitions[layer_name].get("flip", "")
            if flip:
                da = da.isel(**{flip: slice(None, None, -1)})

        return da

    def get_image(self, layer_name, dt, width, height, x_min, y_min, x_max, y_max):
        try:
            layer_definition = self.layer_definitions[layer_name]
            minv = layer_definition["min"]
            maxv = layer_definition["max"]
            subset = layer_definition["subset"]
            clip_min = layer_definition.get("clip_min",None)

            if subset == "chuk":
                # TODO for some reason leaflet is sending x and y swapped for EPSG:27700
                # workaround for now by swapping
                x_min, y_min = (y_min, x_min)
                x_max, y_max = (y_max, x_max)
            aggfn = layer_definition.get("aggfn","mean")

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

            if clip_min is not None:
                da = da.where(da >= clip_min, np.nan)

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
        except Exception as ex:
            self.logger.exception(ex)
            img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            img_io = BytesIO()
            img.save(img_io, format="PNG")
            img_io.seek(0)
            return img_io

    def get_point_value(self, layer_name, y, x, dt: datetime.datetime = None):
        dataset = self.layer_definitions[layer_name]["dataset"]
        variable = self.layer_definitions[layer_name]["variable"]
        v = None

        da = self.get_dataarray(layer_name, dt)

        layer_definition = self.layer_definitions[layer_name]
        crs = layer_definition["projection"]

        if da is not None:

            if crs != "EPSG:4326":
                x,y = pyproj.transform("EPSG:4326",crs,x,y,always_xy=True)

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
                    if isinstance(cpoint,list):
                        [r_frac,g_frac,b_frac] = cpoint
                        colour = "#%2X%2X%2X" % (round(r_frac*255),round(g_frac*255),round(b_frac*255))
                        colours.append(colour)
                    else:
                        colours.append(cpoint)
                return colours
        else:
            raise Exception(f"colour map {name} not found")

