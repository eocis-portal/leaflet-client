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

"""Defines a service configuration useful for service development and debugging on a developer's laptop"""

class Config:

    # web service configuration
    HOST="127.0.0.1"                    # the host name or IP address that the web service will listen on
    PORT=50010                          # the port that the web service will listen on
    # DATA_URL_PREFIX = "https://eocis.org/joboutput"  # URL prefix for the links to output files
    DATA_URL_PREFIX = "/joboutput"  # URL prefix for the links to output files

    # database
    DATABASE_PATH="dbname=eocis user=eocis"     # the path to the jobs database

    # monitor
    TASK_QUOTA=1                        # the number of regridding tasks that can run in parallel
    JOB_QUOTA=2                         # the number of regridding jobs that can run in parallel

    MAX_TASK_RETRIES = 1                # how many times a failed task can be retried

    # output file location
    OUTPUT_PATH = "/data/data_service/joboutput"  # the path to the location to store job output files
    OUTPUT_FILENAME_PATTERN = "{Y}{m}{d}{H}{M}{S}-EOCIS-{LEVEL}-{PRODUCT}-v{VERSION}-fv01.0"

    DATA_CONFIGURATION_PATH = os.path.join(os.path.split(__file__)[0],"config.json")

    MAX_JOB_PIXELS = 1e9

    SCRATCH_AREA = "/tmp"
    CONDA_PATH = "/home/dev/miniforge3/bin/conda"

    CLEANUP_AFTER_SECS = 100

