# leaflet-client

Client for viewing EOCIS datasets, based on leaflet

## create datashader env

```
conda create -n datashader_env python=3.10
conda activate datashader_env
conda install netcdf4 xarray dask zarr aiohttp flask datashader pandas pillow requests pyyaml scipy postgrersql pyscopg2
conda install rioxarray

pip install pystac_client
pip install gunicorn
```
