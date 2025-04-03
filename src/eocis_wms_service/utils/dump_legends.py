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

from eocis_wms_service.load.layer_loader import LayerLoader

output_folder="cmaps"
os.makedirs(output_folder,exist_ok=True)

vmin = 0
vmax = 100
height = 40
width = 200

def get_cmaps():
    cmap_folder = os.path.join(os.path.split(__file__)[0], "..", "cmaps")
    cmaps = os.listdir(cmap_folder)
    return cmaps

def get_cmap(name):
    cmap_folder = os.path.join(os.path.split(__file__)[0], "..", "cmaps")
    cmap_path = os.path.join(cmap_folder, name)

    with open(cmap_path) as f:
        cmap = json.loads(f.read())
        colours = []
        for cpoint in cmap:
            if isinstance(cpoint, list):
                [r_frac, g_frac, b_frac] = cpoint
                colour = "#%2X%2X%2X" % (round(r_frac * 255), round(g_frac * 255), round(b_frac * 255))
                colours.append(colour)
            else:
                colours.append(cpoint)
        return colours

ldata = xr.DataArray(np.zeros((height, width)), dims=("y", "x"))
ldata["x"] = xr.DataArray(np.arange(0, width), dims=("x",))
ldata["y"] = xr.DataArray(np.arange(0, height), dims=("y",))

for i in range(0, width):
    v = vmin + i * (vmax - vmin) / width
    ldata[:, i] = v

for cmap in get_cmaps():
    lcvs = dsh.Canvas(plot_width=width, plot_height=height,
                      x_range=(0, width),
                      y_range=(0, height))

    lagg = lcvs.raster(ldata, agg=rd.first, interpolate='linear')

    lshaded = tf.shade(lagg, cmap=get_cmap(cmap),
                   how="linear",
                   span=(vmin, vmax))

    pil_image = lshaded.to_pil()
    img_io = io.BytesIO()
    cmap_name = os.path.splitext(cmap)[0]
    path = os.path.join("cmaps",cmap_name+".png")

    # pil_image.save(path, format='PNG')

    print(f"<option style=\"background-image: url(images/cmaps/{cmap_name}.png)\" value=\"{cmap_name}\"><div class=\"xxxx\">&nbsp;</div></option>")
