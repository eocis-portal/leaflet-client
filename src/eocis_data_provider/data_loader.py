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

import logging
import os
import xarray as xr
import datetime

from multiprocessing import Lock
from pystac_client import Client

class DataLoader:

    def __init__(self, dataset_config, bundle_config):
        self.logger = logging.getLogger("data_loader")

        self.max_retries = 3

        self.dataset_config = dataset_config
        self.bundle_config = bundle_config

        self.client = Client.open("https://api.stac.ceda.ac.uk")

    def get_dataset_config(self):
        return self.dataset_config

    def get_bundle_config(self):
        return self.bundle_config

    def load(self):
        for dataset_id in self.dataset_config:
            dataset = self.dataset_config[dataset_id]

            if "time_axis" in dataset:
                (start_dt,end_dt) = self.get_date_range(dataset_id)
                dataset["start_date"] = start_dt.strftime("%Y-%m-%d")
                dataset["end_date"] = end_dt.strftime("%Y-%m-%d")

    def get_dataset_definition(self, dataset_id):
        return self.dataset_config[dataset_id]

    def __open_dataset_from_stac_item(self, item, dataset_id):

        ref_url = ""
        filename = ""
        for (key, value) in item.assets.items():
            if key == "reference_file":
                ref_url = value.href
            else:
                filename = key+".nc"

        if not ref_url and not filename:
            self.logger.warning("Error reading stac item")
            return None

        retry=0
        while True:
            try:
                ds = xr.open_mfdataset(["reference://"], engine="zarr", backend_kwargs={
                   "consolidated": False,
                   "storage_options": {"fo": ref_url, "remote_protocol": "https", "remote_options": {}}
                })
                return (ds, filename)
            except Exception as ex:
                self.logger.error(f"loading {dataset_id} retry {retry}: {str(ex)}")
                retry += 1
                if retry > self.max_retries:
                    raise ex

        return None

    def decode_crs(self,projection):
        return int(projection.split(":")[1])

    def get_date_range(self, dataset_id):
        dataset = self.get_dataset_definition(dataset_id)
        collection_id = dataset.get("collection", None)
        collection = self.client.get_collection(collection_id)
        start_dt = collection.extent.temporal.intervals[0][0]
        end_dt = collection.extent.temporal.intervals[-1][1]
        return (start_dt, end_dt)

    def get_item_dates(self, dataset_id, start_date, end_date):
        dataset = self.get_dataset_definition(dataset_id)
        collection = dataset.get("collection", None)
        search = self.client.search(
            limit=None,
            collections=[collection],
            datetime=(datetime.datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0),
                      datetime.datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59))
        )

        dts = []
        for item in search.item_collection().items:
            if "platform" in dataset:
                if item.common_metadata.platform != dataset["platform"]:
                    continue
            dts.append(item.datetime)
        return dts

    def get_dataarray(self, dataset_id, variable, date):
        (ds, filename) = self.get_dataset(dataset_id,[variable], date)
        da = ds[variable].squeeze()
        return da

    def get_dataset(self, dataset_id, variables, date):
        dataset = self.get_dataset_definition(dataset_id)
        collection = dataset.get("collection", None)
        path = dataset.get("path", None)

        base_variables = []
        anomaly_variables = []
        for variable in variables:
            climatology_path = dataset["variables"][variable].get("climatology_path", None)
            if climatology_path:
                based_on_variable = dataset["variables"][variable].get("based_on_variable", None)
                if based_on_variable not in base_variables:
                    base_variables.append(based_on_variable)
                anomaly_variables.append((variable,based_on_variable,climatology_path))
            else:
                base_variables.append(variable)

        ds = None
        filename = None

        if path:

            if isinstance(path,str):
                path = [path]
            for p in path:
                if date:
                    yyyy = "%04d"%date.year
                    mm = "%02d" % date.month
                    dd = "%02d" % date.day
                    p = p.replace("{YYYY}",yyyy).replace("{MM}",mm).replace("{DD}",dd)
                if os.path.exists(p):
                    filename = os.path.split(p)[0]
                    ds = xr.open_mfdataset([p])
                    break

        elif collection:

            search = self.client.search(
                collections=[collection],
                datetime=(datetime.datetime(date.year,date.month,date.day,0,0,0),datetime.datetime(date.year,date.month,date.day,23,59,59))
            )

            for item in search.item_collection().items:
                if "platform" in dataset:
                    if item.common_metadata.platform != dataset["platform"]:
                        continue
                (ds, filename) = self.__open_dataset_from_stac_item(item,dataset_id)
                break

        for (variable,based_on_variable,climatology_path) in anomaly_variables:
            climatology_path = climatology_path.replace("{DOY}", f"{date.timetuple()[7]:03d}")
            climatology_da = xr.open_mfdataset([climatology_path])[variable].squeeze(drop=True)
            ds[variable] = ds[based_on_variable] - climatology_da

        return (ds[variables], filename)
