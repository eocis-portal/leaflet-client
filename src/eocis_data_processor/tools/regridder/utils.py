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
This module contains common utilities used by the regridding code
"""

import datetime
from math import cos, radians
from calendar import monthrange
import numpy as np
from typing import Union


class TimeSeriesUtils(object):
    """
    Implement some handy utility methods to help with time series extraction
    """

    # some metadata uses seconds since 1981
    EPOCH = datetime.datetime(1981, 1, 1)

    @staticmethod
    def seconds_since_1981(dt: datetime.datetime) -> int:
        """Compute the number of seconds since Jan 1st 1982"""
        return int((dt - TimeSeriesUtils.EPOCH).total_seconds())

    @staticmethod
    def create_latitude_weighting(lat_min: float, lat_max: float) -> np.array:
        """Create an array of latitude area weighting values for the given latitude range"""
        height = round((lat_max - lat_min) / 0.05)
        arraydata = []
        for y in range(0, height):
            lat = lat_min + (0.05 * y) + 0.025
            weight = cos(radians(lat))
            arraydata.append(weight)
        # reshape so can be multiplied along the latitude access of an array organised by (time,latitude,longitude)
        return np.array(arraydata).reshape(-1, 1)

    @staticmethod
    def k_to_deg_C(k: float) -> float:
        """Convert from kelvin to degrees centigrade"""
        return k - 273.15

    @staticmethod
    def get_days_in_year(year: int) -> int:
        """Get the number of days in a year"""
        d1 = datetime.date(year, 1, 1)
        d2 = datetime.date(year, 12, 31)
        return 1 + (d2 - d1).days

    @staticmethod
    def last_day_in_month(year: int, month: int) -> int:
        """Work out how many days there are in a given month"""
        return monthrange(year, month)[1]

