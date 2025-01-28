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
    return datetime.datetime.strptime(s,DATE_FORMAT).date()

"""
The dataset module deals with the representation of a dataset, consisting of one or more variables.
"""

class Variable:

    def __init__(self,variable_id:str,variable_name:str,spec:dict):
        self.variable_id = variable_id
        self.variable_name = variable_name
        self.spec = spec

    def __repr__(self) -> str:
        spec = json.dumps(self.spec)
        return f"Variable({self.variable_id},{self.variable_name},{spec})"

    def __eq__(self, other:"Variable") -> bool:
        return self.variable_id == other.variable_id \
            and self.variable_name == other.variable_name \
            and self.spec == other.spec


class DataSet:

    def __init__(self, dataset_id:str, dataset_name:str, temporal_resolution:str, spatial_resolution:str, start_date:datetime.date, end_date:datetime.date, collection:str, spec:dict, variables:list[Variable], enabled:bool=True):
        self.dataset_id = dataset_id
        self.dataset_name = dataset_name
        self.temporal_resolution = temporal_resolution
        self.spatial_resolution = spatial_resolution
        self.start_date = start_date
        self.end_date = end_date
        self.collection = collection
        self.spec = spec
        self.variables = variables
        self.enabled = enabled

    def get_variable(self, variable_id):
        for v in self.variables:
            if v.variable_id == variable_id:
                return v
        return None

    def __repr__(self) -> str:
        spec = json.dumps(self.spec)
        variables = ", ".join([str(v) for v in self.variables])
        return f"DataSet({self.dataset_id},{self.dataset_name},{self.temporal_resolution},{self.spatial_resolution},{self.start_date},{self.end_date},{self.collection},{spec},{variables})"

    def __eq__(self,other) -> bool:
        return self.dataset_id == other.dataset_id \
            and self.dataset_name == other.dataset_name \
            and self.temporal_resolution == other.temporal_resolution \
            and self.spatial_resolution == other.spatial_resolution \
            and self.start_date == other.start_date \
            and self.end_date == other.end_date \
            and self.spec == other.spec \
            and self.variables == other.variables
