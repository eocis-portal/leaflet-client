#!/bin/bash

rootfolder=`dirname $0`/..

rsync -avrL $rootfolder/static dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/src dev@eocis.org:/home/dev/services/leaflet_viewer


