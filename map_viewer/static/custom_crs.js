 // https://epsg.io/?format=json&q=3031

 const custom_crs = {
    "EPSG:3031": {
            "accuracy":"",
            "area":"Antarctica.",
            "authority":"EPSG",
            "bbox":[-60.0,-180.0,-90.0,180.0],
            "code":"3031",
            "default_trans":0,
            "kind":"CRS-PROJCRS",
            "name":"WGS 84 / Antarctic Polar Stereographic",
            "proj4":"+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
            "trans":[9189,9690,9691,15960],
            "unit":"metre",
            "wkt":"PROJCS[\"WGS 84 / Antarctic Polar Stereographic\",GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563,AUTHORITY[\"EPSG\",\"7030\"]],AUTHORITY[\"EPSG\",\"6326\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]],AUTHORITY[\"EPSG\",\"4326\"]],PROJECTION[\"Polar_Stereographic\"],PARAMETER[\"latitude_of_origin\",-71],PARAMETER[\"central_meridian\",0],PARAMETER[\"false_easting\",0],PARAMETER[\"false_northing\",0],UNIT[\"metre\",1,AUTHORITY[\"EPSG\",\"9001\"]],AUTHORITY[\"EPSG\",\"3031\"]]"
        },
    "EPSG:27700": {
            "accuracy":1.0,
            "area":"United Kingdom (UK) - offshore to boundary of UKCS within 49°45'N to 61°N and 9°W to 2°E; onshore Great Britain (England, Wales and Scotland). Isle of Man onshore.",
            "authority":"EPSG",
            "bbox":[65,-15.0,48,5],
            "code":"27700",
            "default_trans":7710,
            "kind":"CRS-PROJCRS",
            "name":"OSGB36 / British National Grid",
            "proj4":"+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs",
            "trans":[1195,1196,1197,1198,1199,1314,1315,5338,5339,5622,7709,7710],
            "unit":"metre","wkt":"PROJCS[\"OSGB36 / British National Grid\",GEOGCS[\"OSGB36\",DATUM[\"Ordnance_Survey_of_Great_Britain_1936\",SPHEROID[\"Airy 1830\",6377563.396,299.3249646],EXTENSION[\"PROJ4_GRIDS\",\"OSTN15_NTv2_OSGBtoETRS.gsb\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]],AUTHORITY[\"EPSG\",\"4277\"]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"latitude_of_origin\",49],PARAMETER[\"central_meridian\",-2],PARAMETER[\"scale_factor\",0.9996012717],PARAMETER[\"false_easting\",400000],PARAMETER[\"false_northing\",-100000],UNIT[\"metre\",1,AUTHORITY[\"EPSG\",\"9001\"]],AXIS[\"Easting\",EAST],AXIS[\"Northing\",NORTH],AUTHORITY[\"EPSG\",\"27700\"]]",
            "resolutions": [ 1792, 896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75 ],
            "origin": [-238375.0, 1376256.0]   ,
            "minx": 0,
            "miny": 0,
            "maxx": 10000,
            "maxy": 10000,
            "center": [55,-4]
    }
}