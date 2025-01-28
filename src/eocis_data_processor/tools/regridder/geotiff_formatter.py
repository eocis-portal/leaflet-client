# -*- coding: utf-8 -*-

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

import os.path

from .formatter import Formatter

class GeotiffFormatter(Formatter):
    """
    Create a formatter for writing spatial data to a geotiff output file
    """

    def __init__(self,path:str=""):
        """
        Construct the geotiff formatter using options

        :param path: path of an output folder in which to create the output files
        """
        super().__init__(path)

    def write(self,dt,data,filename,variable_names):
        """
        Write an entry to the output file covering a time period
        :param dt: date
        :param data: an xarray dataset
        :param filename: the filename to write
        :param variable_names: list of variable names
        """
        fileroot = os.path.splitext(filename)[0]
        for variable_name in variable_names:
            filename = fileroot+"-"+variable_name+".geotiff"
            output_path = os.path.join(self.output_folder,filename)
            da = data[variable_name]
            if "grid_mapping" in da.attrs:
                del da.attrs["grid_mapping"]
            da.rio.write_crs("epsg:4326", inplace=True)
            da.rio.to_raster(output_path)

    def close(self):
        pass

