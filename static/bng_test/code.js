
function run() {

    const crs = new L.Proj.CRS('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs', {
        resolutions: [ 896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75 ],
        origin: [ -238375.0, 1376256.0 ]
    });

    // Transform coordinates.
    const transformCoords = function(arr) {
        return proj4('EPSG:27700', 'EPSG:4326', arr).reverse();
    };

    let min_y = 96050;
    let max_y= 135950;

    let min_x = 443350;
    let max_x = 483250;

//    lonlat_min = proj4('EPSG:27700', 'EPSG:4326', [x_min-50,y_min-50]);
//    lonlat_max = proj4('EPSG:27700', 'EPSG:4326', [x_max+50,y_max+50]);

    // Initialize the map.
    const mapOptions = {
        crs: crs,
        minZoom: 0,
        maxZoom: 9,
        center: [51,-1], // transformCoords([ 337297, 503695 ]),
        zoom: 6,
        bounds: [
            transformCoords([ -238375.0, 0.0 ]),
            transformCoords([ 900000.0, 1376256.0 ])
        ]
    };

    const map = L.map('map', mapOptions);

    var wmsLayer = L.tileLayer.wms('https://eocis.org/mapproxy/service?', {
        layers: 'osm'
    }).addTo(map);

    L.tileLayer.wms('https://eocis.org/wms', {"version":"1.3.0", layers: "chuk_landcover","format":"image/png"}).addTo(map).setOpacity(0.5);
}
