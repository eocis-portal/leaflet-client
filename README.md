# leaflet-client

Client for viewing EOCIS datasets, based on leaflet

## create datashader env

```
mamba create -n datashader_env python=3.10
mamba activate datashader_env
mamba install netcdf4 xarray dask zarr aiohttp flask datashader pandas pillow requests pyyaml scipy postgresql pyscopg2
conda install rioxarray matplotlib

pip install pystac_client
pip install gunicorn
```
