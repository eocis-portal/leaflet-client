#!/bin/bash

conda activate datashader_env

nohup gunicorn -b 127.0.0.1:9019 -w 4 --timeout 200 --preload app:app &