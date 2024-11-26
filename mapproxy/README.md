# mapproxy installation

This mapproxy service will serve OSM WMS imagery in EPSG:27700

# installation

```
conda env create -n mapproxy_env python=3.10
conda activate mapproxy_env
pip install mapproxy
pip install pyproj
mkdir /path/to/mapproxy_install
cp mapproxy.yaml /path/to/mapproxy_install
cd /path/to/mapproxy_install
# mapproxy-util create -t base-config ./
nohup mapproxy-util serve-develop ./mapproxy.yaml -b 127.0.0.1:8181
```

# nginx configuration to forward from https://eocis.org/mapproxy/service?...

```
location /mapproxy {
    proxy_pass http://127.0.0.1:8181/;
    proxy_set_header Host $host;
}
```