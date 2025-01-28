

from pystac_client import Client
client = Client.open("https://api.stac.ceda.ac.uk")
collection_id = "eocis-sst-cdrv3"
collection = client.get_collection(collection_id)
start_dt = collection.extent.temporal.intervals[0][0]
end_dt = collection.extent.temporal.intervals[-1][1]
print(start_dt, end_dt)