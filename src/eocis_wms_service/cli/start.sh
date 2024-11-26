#!/bin/bash

nohup gunicorn -b 127.0.0.1:9019 -w 8 'app:app'