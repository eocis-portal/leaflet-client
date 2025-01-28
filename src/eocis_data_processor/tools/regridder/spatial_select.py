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

"""
This module slices and aggregates input spatiotemporal data to the desired spatial and temporal resolution
"""
import datetime
import xarray as xr
import numpy as np


def mean_log_reducer(data, axis):
    return np.power(10, np.nanmean(np.log10(data), axis))


class SpatialSelect(object):
    """
    Select data from a spatial bounding box
    """

    def __init__(self, x_min:float, y_min:float, x_max:float, y_max:float,
                 y_dim_name:str, x_dim_name:str, t_dim_name:str):
        """
        Construct the aggregator with the given spatial parameters

        :param x_min:  minimum x-coordinate of box
        :param y_min:  minimum y-coordinate of box
        :param x_max:  maximum x-coordinate of box
        :param y_max:  maximum y-coordinate of box

        :param y_dim_name: the name of the y dimension
        :param x_dim_name: the name of the x dimension
        :param t_dim_name: the name of the time dimension

        """
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max

        self.lat_weighting = None
        self.y_dim_name = y_dim_name
        self.x_dim_name = x_dim_name
        self.t_dim_name = t_dim_name

    def format_dt(self, dt: datetime.datetime) -> str:
        return dt.strftime("%Y-%m-%d")

    def select(self,data:xr.Dataset) -> xr.Dataset:
        """
        Perform spatial selection on the data

        :param data: an xarray dataset with the input cube

        :return: xarray dataset containing selected area
        """

        reverse_lat_order = data[self.y_dim_name].values[0] > data[self.y_dim_name].values[-1]
        data = data.sel({
            self.y_dim_name:slice(self.y_max,self.y_min) if reverse_lat_order else slice(self.y_min,self.y_max),
            self.x_dim_name:slice(self.x_min, self.x_max)})

        return data

