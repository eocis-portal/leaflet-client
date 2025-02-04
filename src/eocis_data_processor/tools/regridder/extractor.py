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
This module handles the extraction of SST, uncertainty and sea-ice fraction data from L4 SST data saved in zarr format
(see the "timeseries_region.reslicing" module for the code that creates the zarr format data)
"""

import datetime
from eocis_data_manager.data_loader import DataLoader
from eocis_data_manager.dataset import DataSet

class Extractor(object):

    """
    This class handles the efficient extraction of data from the input datset
    for the exact time bounded regions to be processed, and providing an iterator to lazily return data
    for each discrete time point.
    """

    def __init__(self, data_loader:DataLoader, dataset:DataSet, variable_names:list[str], t_dim_name:str):
        """
        Constructor

        :param data_loader:
            the DataLoader
        :param dataset:
            the dataset instance
        :param variable_names:
            list of variable names to include
        :param t_dim_name:
            the name of the time dimension
        """
        self.data_loader = data_loader
        self.dataset = dataset
        self.variable_names = variable_names
        self.t_dim_name = t_dim_name


    def generate_year_data(self, start_date:datetime.datetime, end_date:datetime.datetime):
        """Generator that yields the time period within a year

        :param start_date: the datetime of the start day (inclusive).  Time must be set to mid day.
        :param end_date: the datetime of the end day (inclusive).  Time must be set to mid day.  Must be in same year as start_date.

        The generator yields (dt,dataset) tuples
        """

        dates = self.data_loader.get_item_dates(self.dataset, start_date, end_date)

        for dt in dates:
            (ds, filename) = self.data_loader.get_dataset(self.dataset.dataset_id, self.variable_names, dt)
            yield (dt,ds,filename)

    def generate_data(self, start_dt:datetime.datetime, end_dt:datetime.datetime):
        """Generator that lazily yields the time period data for a given time and space range

        :param start_date: the datetime of the start day (inclusive).  Time must be set to mid day.
        :param end_date: the datetime of the end day (inclusive).  Time must be set to mid day.


        The generator yields ((start_dt,mid_dt,end_dt),xr.Dataset) tuples
        """
        year = start_dt.year
        while year <= end_dt.year:
            # go through each year in turn...
            slice_end_dt = datetime.datetime(year,12,31,12,0,0) if year < end_dt.year else end_dt
            slice_start_dt = datetime.datetime(year,1,1,12,0,0) if year > start_dt.year else start_dt
            # yield from that year's generator until exhausted
            yield from self.generate_year_data(slice_start_dt, slice_end_dt)
            # move to the next year
            year += 1



