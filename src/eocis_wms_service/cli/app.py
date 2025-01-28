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
from flask import Flask, render_template, request, send_from_directory, abort, jsonify, send_file
import datetime
from eocis_wms_service.load.layer_loader import LayerLoader
from config import Config

config = None
with open(Config.DATA_CONFIGURATION_PATH) as f:
    config = json.loads(f.read())

layer_loader = LayerLoader(config)

app = Flask(__name__)

app.config.from_object(Config)

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
        return send_from_directory('../../../map_viewer/static', 'index.html')

    @staticmethod
    @app.route('/', methods=['GET'])
    @app.route('/index_chuk.html', methods=['GET'])
    def fetch_chuk():
        return send_from_directory('../../../map_viewer/static', 'index_chuk.html')

    @staticmethod
    @app.route('/legend', methods=['GET'])
    def legend():
        layer = request.args.get("layer")
        img = layer_loader.get_legend(layer)
        return send_file(img, mimetype='image/png')

    @staticmethod
    @app.route('/layers/<string:subset_name>', methods=['GET'])
    def layers(subset_name):
        response = jsonify(layer_loader.get_layer_definitions(subset_name))
        return response

    @staticmethod
    @app.route('/wms_service', methods=['GET'])
    def wms():
        service = request.args.get("service")
        req = request.args.get("request")
        if service == "WMS" and req == "GetMap":
            layers = request.args.get("layers")
            width = int(request.args.get("width"))
            height = int(request.args.get("height"))
            srs = request.args.get("srs")
            bbox = request.args.get("bbox")
            time = request.args.get("TIME")
            dt = datetime.datetime.strptime(time[:16],"%Y-%m-%dT%H:%M") if time else None

            coords = bbox.split(",")
            y_min = float(coords[0])
            x_min = float(coords[1])
            y_max = float(coords[2])
            x_max = float(coords[3])
            try:
                img = layer_loader.get_image(layers,dt,width,height,x_min,y_min,x_max,y_max)
                return send_file(img, mimetype='image/png')
            except Exception as ex:
                print(ex)
                abort(404)
        else:
            abort(404)

    @staticmethod
    @app.route("/point_service/<string:layer>/<string:yx>/<string:dt>", methods=['GET'])
    def fetch_with_time(layer, yx, dt):
        (y, x) = tuple(yx.split(":"))
        (y, x) = (float(y), float(x))
        dt = datetime.datetime.strptime(dt, "%Y-%m-%d")
        value = layer_loader.get_point_value(layer, y, x, dt)
        response = jsonify(value)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    @staticmethod
    @app.route("/point_service/<string:layer>/<string:yx>", methods=['GET'])
    def fetch_without_time(layer, yx):
        (y, x) = tuple(yx.split(":"))
        (y, x) = (float(y), float(x))
        value = layer_loader.get_point_value(layer, y, x)
        response = jsonify(value)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    @app.route('/<path:path>')
    def catch_all(path):
        return send_from_directory('../../../map_viewer/static', path)


if __name__ == '__main__':
    host = app.config.get("HOST", "0.0.0.0")
    port = app.config.get("PORT", 9019)
    print(f"http://{host}:{port}/index.html")
    print(f"http://{host}:{port}/index_chuk.html")
    logging.basicConfig(level=logging.INFO)
    app.run(host=host,port=port,threaded=True)
