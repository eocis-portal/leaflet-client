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


import json
import datetime

# date format for parsing data values from the YAML file
DATE_FORMAT = "%d-%m-%Y"

def parse_date(s):
    return datetime.datetime.strptime(s,DATE_FORMAT).replace(tzinfo=None).date()

"""
The dataset module deals with the representation of a dataset, consisting of one or more variables.
"""

class Variable:

    def __init__(self,variable_id:str,variable_name:str,
                 description:str=""):
        self.variable_id = variable_id
        self.variable_name = variable_name
        self.description = description

    def __repr__(self) -> str:
        return f"Variable({self.variable_id},{self.variable_name})"


class DataSet:

    def __init__(self, dataset_id:str, dataset_name:str,
                 description:str,
                 temporal_resolution:str, spatial_resolution:str,
                 start_date:datetime.date, end_date:datetime.date, collection:str,
                 path: str,
                 variables:list[Variable],
                 x_min: float, y_min: float, x_max: float, y_max: float,
                 x_coord_name:str, y_coord_name:str,
                 x_dim_name:str, y_dim_name:str,
                 license:str="", citation:str="", enabled=True, link="", reindex=False):
        self.dataset_id = dataset_id
        self.dataset_name = dataset_name
        self.description = description
        self.temporal_resolution = temporal_resolution
        self.spatial_resolution = spatial_resolution
        self.start_date = start_date
        self.end_date = end_date
        self.collection = collection
        self.path = path
        self.variables = variables
        self.enabled = enabled
        self.license = license
        self.citation = citation
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
        self.x_coord_name = x_coord_name
        self.y_coord_name = y_coord_name
        self.x_dim_name = x_dim_name
        self.y_dim_name = y_dim_name
        self.reindex = reindex
        self.link = link

    def get_variable(self, variable_id):
        for v in self.variables:
            if v.variable_id == variable_id:
                return v
        return None

    def __repr__(self) -> str:
        variables = ", ".join([str(v) for v in self.variables])
        return f"DataSet({self.dataset_id},{self.dataset_name},{self.temporal_resolution},{self.spatial_resolution},{self.start_date},{self.end_date},{self.collection},{variables})"

