#!/bin/bash

rootfolder=`dirname $0`/..

rsync -avrL $rootfolder/static dev@eocis.org:/home/dev/services/leaf_viewer

