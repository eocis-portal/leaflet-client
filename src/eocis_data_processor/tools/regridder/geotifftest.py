
path="/home/dev/data/regrid/sst/2022/01/01/20220101120000-C3S-L4_GHRSST-SSTdepth-OSTIA-GLOB_ICDR3.0-v02.0-fv01.0.nc"

import xarray as xr
ds = xr.open_dataset(path)
print(ds)

import numpy as np
import copy

class MetadataExporter:

    @staticmethod
    def decode4json(o):
        if isinstance(o,dict):
            for key in o:
                o[key] = MetadataExporter.decode4json(o[key])
            return o
        elif isinstance(o,list):
            for idx in range(len(o)):
                o[idx] = MetadataExporter.decode4json(o[idx])
            return o
        elif isinstance(o,np.float32):
            return float(o)
        elif isinstance(o,np.int32) or isinstance(o,np.int16) or isinstance(o,np.int8):
            return int(o)
        elif isinstance(o,np.ndarray):
            return MetadataExporter.decode4json(o.tolist())
        else:
            return o

    @staticmethod
    def to_json(ds,variable):
        metadata = copy.deepcopy(ds.attrs)
        for (key,value) in ds[variable].attrs.items():
            metadata[key] = value

        return MetadataExporter.decode4json(metadata)

    @staticmethod
    def check(self, ds):
        pass # TODO check for missing or invalid CF/CHUK metadata


da = ds["analysed_sst"]
del da.attrs["grid_mapping"]
da.rio.write_crs("epsg:4326", inplace=True)
da.rio.to_raster("test.tif", tags=MetadataExporter.to_json(ds,"analysed_sst"))