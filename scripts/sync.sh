#!/bin/bash

rootfolder=`dirname $0`/..

rsync -avrL $rootfolder/static dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/src dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/map_viewer dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/subset_tool dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/mapproxy dev@eocis.org:/home/dev/services/leaflet_viewer
rsync -avrL $rootfolder/scripts dev@eocis.org:/home/dev/services/leaflet_viewer
