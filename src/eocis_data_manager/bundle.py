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

import os
import yaml
from yaml import Loader

"""
The bundle module deals with the representation of a logical bundle of data, consisting of one or more datasets.
"""


class Bundle:

    def __init__(self, bundle_id:str, bundle_name:str, spec:dict, dataset_ids:list[str], enabled=True):
        self.bundle_id = bundle_id
        self.bundle_name = bundle_name
        self.spec = spec
        self.dataset_ids = dataset_ids
        self.enabled = True

    def __repr__(self) -> str:
        import json
        spec = json.dumps(self.spec)
        dataset_ids = json.dumps(self.dataset_ids)
        return f"Bundle({self.bundle_id},{self.bundle_name},{spec},{dataset_ids})"

    def __eq__(self,other) -> bool:
        return self.bundle_id == other.bundle_id \
            and self.bundle_name == other.bundle_name \
            and sorted(self.dataset_ids) == sorted(other.dataset_ids) \
            and self.spec == other.spec


