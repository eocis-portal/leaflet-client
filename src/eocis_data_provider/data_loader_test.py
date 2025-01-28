import json
import datetime
from data_loader import DataLoader

with open("/home/dev/github/leaflet-client/src/eocis_wms_service/cli/config.json") as f:
    config = json.loads(f.read())

dl = DataLoader(None,config["datasets"],config["bundles"])
dl.load()

dts = dl.get_item_dates("sst", datetime.date(2020,1,1),datetime.date(2020,12,31))
print(len(dts))
print(dts[0:5])