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
This module extracts regions of data from the L4 C3S/CCI dataset.  The time series:

* aggregates data over a number of different time granularities (daily, N-daily, pentads, dekads, monthly)
* region is defined using a spatial bounding box aligned on 0.05 degree boundaries and up to 5 degrees on each side
* can compute climatology-based anomalies or absolute SSTs
* allows the user to ignore input cells with sea ice fractions above a user specified value (f_max)
* outputs a a standard error based on user specified parameters tau and spatial lambda
* optionally, outputs the sea ice fraction of the ocean area
* outputs to netcdf4 or comma separated variable formats

This data accepts as input climatology and C3S/CCI L4 SST files that have been spatially resliced from the original
one-file-per-day format.  The resliced format stores data in zarr format, with 5 degree spatial and 7 day temporal chunking
and is efficient for the retrieval of time series data for a small area.

This module can be invoked from the command line, use --help to show the options.
This module can also be invoked by importing and calling the makeTimeSeriesSSTs function
"""

import os.path
import datetime
import json

from .extractor import Extractor
from .spatial_select import SpatialSelect
from .netcdf4_formatter import NetCDF4Formatter
from .geotiff_formatter import GeotiffFormatter

from eocis_data_provider.data_loader import DataLoader

def regrid(conf_path:str, dataset_id: str, variables: list[str], x_min: float, x_max: float, y_min: float, y_max: float,
           start_date: datetime.datetime,
           end_date: datetime.datetime,
           output_path: str,
           output_format: str,
           y_dim_name: str = "lat", x_dim_name: str = "lon", t_dim_name: str = "time"):
    """
    Obtain an extract from a dataset.

    :param conf_path:
        The data configuration path

    :param dataset_id:
        The id of the dataset

    :param variables:
        A list of variable names to extract

    :param x_min:
        The minimum x coordinate of the spatial area to aggregate.

    :param x_max:
        The maximum x coordinate of the spatial area to aggregate.

    :param y_min:
        The minimum y coordinate of the spatial area to aggregate.

    :param y_max:
        The maximum y coordinate of the spatial area to aggregate.

    :param start_date:
        The date at which the extracted data should begin.

    :param end_date:
        The date at which the extracted data should end.

    :param output_path:
        Folder to write the data.

    :param output_format:
        Name of the output format, eg "csv", "netcdf4", "geotiff"

    :param y_dim_name:
        Name of the y/lat dimension in the dataset

    :param x_dim_name:
        Name of the x/lon dimension in the dataset

    :param t_dim_name:
        Name of the time dimension in the dataset
    """

    os.makedirs(output_path, exist_ok=True)

    with open(conf_path) as f:
        config = json.loads(f.read())
    data_loader = DataLoader(dataset_config=config["datasets"], bundle_config=config["bundles"])

    # create an extractor to read the relevant part of the input data covering the extraction times and spatial boundaries
    extractor = Extractor(data_loader, dataset_id=dataset_id, variable_names=variables, t_dim_name=t_dim_name)

    # create a selector to select a part of the extracted data
    select = SpatialSelect(x_min=x_min, y_min=y_min, x_max=x_max,
                            y_max=y_max, x_dim_name=x_dim_name,
                            y_dim_name=y_dim_name,
                            t_dim_name=t_dim_name)

    # create a formatter (either CSV or netcdf4 based) to handle writing the aggregated data to file

    if output_format == "netcdf4":
        formatter = NetCDF4Formatter(output_path)
    elif output_format == "geotiff":
        formatter = GeotiffFormatter(output_path)
    else:
        raise Exception(f"Export format {output_format} is not supported")


    # loop over each time period in the required date range...
    for (dt, slice_data, filename) in extractor.generate_data(start_dt=start_date, end_dt=end_date):
        # aggregate this time period...
        selected_data = select.select(data=slice_data)
        # print("slice:",mid_dt,sst_or_anomaly,uncertainty,sea_ice_fraction)

        # and append it to the output file
        formatter.write(dt, selected_data, filename, variable_names=variables)

    formatter.close()


def createParser():
    import argparse
    parser = argparse.ArgumentParser(description='extract regridded data.')

    parser.add_argument('--x-min', type=float)

    parser.add_argument('--x-max', type=float)

    parser.add_argument('--y-min', type=float)

    parser.add_argument('--y-max', type=float)

    parser.add_argument('--start-year', type=int,
                        help='The start year of the time series.')

    parser.add_argument('--start-month', type=int,
                        help='The start month of the time series.')

    parser.add_argument('--start-day', type=int,
                        help='The start day of the time series.')

    parser.add_argument('--end-year', type=int,
                        help='The end year of the time series.')

    parser.add_argument('--end-month', type=int,
                        help='The end month of the time series.')

    parser.add_argument('--end-day', type=int,
                        help='The end day of the time series.')

    parser.add_argument('--in-path',
                        help='Path to the input dataset.')

    parser.add_argument('--out-path',
                        help='The path in which to write the output.')

    parser.add_argument('--config-path',
                        help='path to the configuration file')

    parser.add_argument('--dataset-id',
                        help='the id of the dataset')

    parser.add_argument(
        "--output-format", metavar="<FORMAT>", help="define the output format", default="netcdf4")

    parser.add_argument('--variables', default="",
                        help='Supply a comma separated list of variables.')

    return parser


def dispatch(args):
    # assemble the start and end dates from the input/output year/month/day components
    start_dt = datetime.datetime(args.start_year, args.start_month, args.start_day, 12, 0, 0)
    end_dt = datetime.datetime(args.end_year, args.end_month, args.end_day, 12, 0, 0)

    variables = list(map(lambda name: name.strip(), args.variables.split(",")))

    regrid(dataset_id=args.dataset_id, variables=variables, x_min=args.x_min, y_min=args.y_min, x_max=args.x_max, y_max=args.y_max,
           start_date=start_dt, end_date=end_dt,
           output_path=args.out_path,
           conf_path=args.config_path, output_format=args.output_format)


def main():
    parser = createParser()
    args = parser.parse_args()
    dispatch(args)


if __name__ == '__main__':
    main()
