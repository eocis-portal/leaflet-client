#!/bin/bash

export PYTHONPATH=..

nohup gunicorn -b 127.0.0.1:50010 -w 1 --timeout 200 --preload app:app &