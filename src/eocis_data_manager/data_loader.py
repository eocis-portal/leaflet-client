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
import calendar

from pystac_client import Client
from .data_importer import DataImporter
from .dataset import DataSet

class DataLoader:

    def __init__(self, dataset_schema, scratch_area):
        self.logger = logging.getLogger("data_loader")
        self.max_retries = 3
        self.dataset_schema = dataset_schema
        self.scratch_area = scratch_area
        self.client = Client.open("https://api.stac.ceda.ac.uk")

    def get_stac_client(self):
        return self.client

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
                self.logger.info("opening dataset: "+ref_url)
                ds = xr.open_mfdataset(["reference://"], engine="zarr", backend_kwargs={
                   "consolidated": False,
                   "storage_options": {"fo": ref_url, "remote_protocol": "https", "remote_options": {}}
                })
                self.logger.info("opened dataset: " + ref_url)
                return (ds, filename)
            except Exception as ex:
                self.logger.error(f"loading {dataset_id} retry {retry}: {str(ex)}")
                retry += 1
                if retry > self.max_retries:
                    raise ex

        return None

    def decode_crs(self,projection):
        return int(projection.split(":")[1])

    def get_item_dates(self, dataset:DataSet, start_date, end_date):
        search = self.client.search(
            limit=None,
            collections=[dataset.collection],
            datetime=(datetime.datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0),
                      datetime.datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59))
        )

        dts = []
        for item in search.item_collection().items:
            dts.append(item.datetime)

        return dts

    def get_dataarray(self, dataset_id, variable, date):
        (ds, filename) = self.get_dataset(dataset_id,[variable], date)
        da = ds[variable].squeeze()
        return da

    def download_dataset(self, dataset_id, ds, variables):
        dataset = self.dataset_schema.get_dataset(dataset_id)
        x_dim = ds[dataset.x_coord_name].dims[0]
        y_dim = ds[dataset.y_coord_name].dims[0]
        if dataset.collection:
            importer = DataImporter(ds, variables, folder=self.scratch_area, x_dimension=x_dim, y_dimension=y_dim, x_coord=dataset.x_coord_name, y_coord=dataset.y_coord_name)
            imported_ds = importer.import_dataset()
            return imported_ds, importer
        else:
            return ds, None

    def get_dataset(self, dataset_id, variables, date):
        dataset = self.dataset_schema.get_dataset(dataset_id)

        ds = None
        filename = None

        if dataset.path:
            path = dataset.path
            if isinstance(dataset.path,str):
                path = [dataset.path]
            for p in path:
                if date:
                    yyyy = "%04d"%date.year
                    mm = "%02d" % date.month
                    dd = "%02d" % date.day
                    p = p.replace("{YYYY}",yyyy).replace("{MM}",mm).replace("{DD}",dd)
                if os.path.exists(p):
                    filename = os.path.split(p)[0]
                    if dataset.start_date is not None:
                        ds = xr.open_mfdataset([p],concat_dim=("time",),combine="nested")
                    else:
                        ds = xr.open_mfdataset([p])
                    break

        elif dataset.collection:

            # establish search criteria
            if dataset.temporal_resolution == "monthly":
                (_,days_in_month) = calendar.monthrange(date.year, date.month)
                datetime_range = datetime.datetime(date.year, date.month, 1, 0, 0, 0), datetime.datetime(
                    date.year, date.month, days_in_month, 23, 59, 59)
            else:
                datetime_range = datetime.datetime(date.year,date.month,date.day,0,0,0),datetime.datetime(date.year,date.month,date.day,23,59,59)

            search = self.client.search(
                collections=[dataset.collection],
                datetime=datetime_range
            )

            # return the first match
            for item in search.item_collection().items:
                (ds, filename) = self.__open_dataset_from_stac_item(item,dataset_id)
                break

        if dataset.reindex:
            ds = ds.reset_coords().set_coords((dataset.x_coord_name, dataset.y_coord_name)) \
                .set_index({dataset.x_dim_name: dataset.x_coord_name, dataset.y_dim_name: dataset.y_coord_name})

        return (ds[variables], filename)
