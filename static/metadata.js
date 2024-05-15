
let analysed_sst_metadata = {
        "name": "Sea Surface Temperatures",
        "short_description": "Daily Sea Surface Temperature Estimates",
        "units": "Degrees Centigrade",
        "start_date": "1980-01-01",
        "end_date": "2024-02-17",
        "long_description": 'This dataset provides daily estimates of global sea surface temperature (SST) based on observations from multiple satellite sensors.\n\nResolution: 5km.\n\n.Available from September 1981 to current. <a href="https://eocis.org/dataset-sea-surface-temperatures/" target="_blank">More Information</a>',
        "step": "daily",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let sea_ice_fraction_metadata = {
        "name": "Sea Ice Fraction",
        "short_description": "Fraction of cell that is covered by sea ice",
        "units": "Fraction",
        "start_date": "1980-01-01",
        "end_date": "2023-09-23",
        "long_description": 'This dataset provides daily estimates of global sea ice fraction based on observations from multiple satellite sensors.\n\nResolution: 5km.\n\n.Available from September 1981 to current. <a href="https://eocis.org/dataset-sea-surface-temperatures/" target="_blank">More Information</a>',
        "step": "daily",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let analysed_sst_anomaly_metadata = {
        "name": "Sea Surface Temperature Anomalies",
        "short_description": "Daily Sea Surface Temperature Anomaly Estimates",
        "units": "Degrees Centigrade",
        "start_date": "1980-01-01",
        "end_date": "2023-09-23",
        "long_description": 'This dataset provides daily estimates of global sea surface temperature (SST) based on observations from multiple satellite sensors.\n\nResolution: 5km.\n\n.Available from September 1981 to current. <a href="https://eocis.org/dataset-sea-surface-temperatures/" target="_blank">More Information</a>',
        "step": "daily",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let sea_ice_fraction_anomaly_metadata = {
        "name": "Sea Ice Fraction Anomalies",
        "short_description": "Anomaly Fraction of cell that is covered by sea ice",
        "units": "Fraction",
        "start_date": "1980-01-01",
        "end_date": "2023-09-23",
        "long_description": 'This dataset provides daily estimates of global sea ice fraction based on observations from multiple satellite sensors.\n\nResolution: 5km.\n\n.Available from September 1981 to current. <a href="https://eocis.org/dataset-sea-surface-temperatures/" target="_blank">More Information</a>',
        "step": "daily",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let soil_moisture_metadata = {
        "name": "Soil Moisture",
        "short_description": "Soil Moisture",
        "units": "Fraction",
        "start_date": "1984-01-01",
        "end_date": "2021-12-31",
        "long_description": 'Soil Moisture Long Description',
        "lat": 0,
        "lon": 10,
        "zoom": 4,
        "step": "daily",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let monthly_chlor_a_metadata = {
        "name": "Ocean Colour - Monthly",
        "short_description": "Monthly Ocean Colour",
        "units": "milligram m-3",
        "start_date": "1997-09-15",
        "end_date": "2021-12-15",
        "long_description": 'This dataset provides global monthly estimates of ocean surface chlorophyll-a concentration and remote sensing reflectance derived from multiple satellite sensors.  <a href="https://eocis.org/dataset-ocean-colour/" target="_blank">EOCIS Ocean Colour</a>',
        "step": "monthly",
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let chuk_maxst_metadata = {
        "name": "Maximum Temperature 2019-2022",
        "short_description": "Maximum Land Surface Temperature recorded by Landsat 8/9 between 2019 and 2022",
        "units": "Degrees Centigrade",
        "start_date": "",
        "end_date": "",
        "long_description": "Max Surface Temperature at ~11am over the period 2019-2022 as measured by Landsat 8/9 TIRS courtesy of the U.S. Geological Survey.",
        "legend": "wms",
        "projection": "EPSG:27700"
    };

let chuk_landcover_metadata = {
        "name": "UK Land Cover",
        "short_description": "UK Land Cover",
        "units": "",
        "long_description": 'UK Land Cover - See <a href="https://catalogue.ceh.ac.uk/documents/a1f85307-cad7-4e32-a445-84410efdfa70" target="_blank">CEH Land Cover Map 2021</a>',
        "legend": "table",
        "legend_classes": "Deciduous_woodland Coniferous_woodland Arable Improved_grassland Neutral_grassland Calcareous_grassland Acid_grassland Fen Heather Heather_grassland Bog Inland_rock Saltwater Freshwater Supralittoral_rock Supralittoral_sediment Littoral_rock Littoral_sediment Saltmarsh Urban Suburban",
        "legend_colors": "#006600 #732600 #00FF00 #7FE57F #70A800 #998100 #FFFF00 #801A80 #E68CA6 #008073 #D2D2FF #000080 #0000FF #CCB300 #CCB300 #FFFF80 #FFFF80 #8080FF #000000 #808080 #00FFFFFF",
        "start_date": "",
        "end_date": "",
        "projection": "EPSG:27700"
        };

let chuk_builtarea_urban_metadata = {
        "name": "UK Fraction Urban",
        "short_description": "UK Land Cover - Fraction of Urban Development",
        "units": "",
        "long_description": 'UK Land Cover - See <a href="https://catalogue.ceh.ac.uk/documents/a1f85307-cad7-4e32-a445-84410efdfa70" target="_blank">CEH Land Cover Map 2021</a>',
        "legend": "wms",
        "start_date": "",
        "end_date": "",
        "projection": "EPSG:27700"
        };

let chuk_builtarea_suburban_metadata = {
        "name": "UK Fraction Suburban",
        "short_description": "UK Land Cover - Fraction of Suburban Development",
        "units": "",
        "long_description": 'UK Land Cover - See <a href="https://catalogue.ceh.ac.uk/documents/a1f85307-cad7-4e32-a445-84410efdfa70" target="_blank">CEH Land Cover Map 2021</a>',
        "legend": "wms",
        "start_date": "",
        "end_date": "",
        "projection": "EPSG:27700"
        };

let chuk_landcover_historical_metadata = {
        "name": "UK Land Cover Change 2001-2020",
        "short_description": "UK Land Cover Historical - 2001 to 2020 - ESA",
        "units": "",
        "long_description": 'UK Land Cover Historical - 2001 to 2020 - <a href="https://cds.climate.copernicus.eu/cdsapp#!/dataset/satellite-land-cover?tab=overview" target="_blank">ESA Satellite Land Cover">Based on ESA Land Cover</a>',
        "legend": "table",
        legend_classes: "cropland_rainfed cropland_rainfed_herbaceous_cover cropland_rainfed_tree_or_shrub_cover cropland_irrigated mosaic_cropland mosaic_natural_vegetation tree_broadleaved_evergreen_closed_to_open tree_broadleaved_deciduous_closed_to_open tree_broadleaved_deciduous_closed tree_broadleaved_deciduous_open tree_needleleaved_evergreen_closed_to_open tree_needleleaved_evergreen_closed tree_needleleaved_evergreen_open tree_needleleaved_deciduous_closed_to_open tree_needleleaved_deciduous_closed tree_needleleaved_deciduous_open tree_mixed mosaic_tree_and_shrub mosaic_herbaceous shrubland shrubland_evergreen shrubland_deciduous grassland lichens_and_mosses sparse_vegetation sparse_tree sparse_shrub sparse_herbaceous tree_cover_flooded_fresh_or_brakish_water tree_cover_flooded_saline_water shrub_or_herbaceous_cover_flooded urban bare_areas bare_areas_consolidated bare_areas_unconsolidated water snow_and_ice",
        legend_colors: "#ffff64 #ffff64 #ffff00 #aaf0f0 #dcf064 #c8c864 #006400 #00a000 #00a000 #aac800 #003c00 #003c00 #005000 #285000 #285000 #286400 #788200 #8ca000 #be9600 #966400 #966400 #966400 #ffb432 #ffdcd2 #ffebaf #ffc864 #ffd278 #ffebaf #00785a #009678 #00dc82 #c31400 #fff5d7 #dcdcdc #fff5d7 #0046c8 #ffffff",
        "step": "yearly",
        "start_date": "2001-01-01",
        "end_date": "2020-12-31",
        "projection": "EPSG:27700"
        };

let chuk_power_lines_metadata = {
     "name": "UK Power Lines",
        "short_description": "UK Power Lines",
        "units": "",
        "long_description": "Location of UK power transmission lines, with Voltages if known",
        "legend": "table",
        legend_classes: "Other-voltage 33kV 66kV 132kV 275kV 400kV",
        legend_colors: "#AA0000 #BB0000 #CC0000 #DD0000 #EE0000 #FF0000",
        "start_date": "",
        "end_date": "",
        "projection": "EPSG:27700"
}

let chuk_railways_metadata = {
     "name": "UK Railways",
     "short_description": "UK Railway Line Locations",
     "units": "",
     "long_description": "Location of UK railway lines (Electrified and Non-electrified)",
     "legend": "table",
     legend_classes: "Non-electrified Electrified",
     legend_colors: "#808080 #BB0000",
     "start_date": "",
     "end_date": "",
     "projection": "EPSG:27700"
}

let chuk_roads_metadata = {
     "name": "UK Roads",
     "short_description": "UK Road Locations",
     "units": "",
     "long_description": "Location of major UK Roads (Motorways and A-roads)",
     "legend": "table",
     legend_classes: "Motorway A-Road",
     legend_colors: "#FF0000 #0000FF",
     "start_date": "",
     "end_date": "",
     "projection": "EPSG:27700"
}

let chuk_lakes_metadata = {
     "name": "UK Lakes",
     "short_description": "UK Freshwater Lakes Locations",
     "units": "",
     "long_description": "Locations of all UK Freshwater Lakes",
     "legend": "table",
     legend_classes: "Lake",
     legend_colors: "#0000FF",
     "start_date": "",
     "end_date": "",
     "projection": "EPSG:27700"
}

let chuk_rivers_metadata = {
     "name": "UK Rivers",
     "short_description": "UK River Locations",
     "units": "",
     "long_description": "Location of UK Rivers and Waterways",
     "legend": "table",
     legend_classes: "River",
     legend_colors: "#0000FF",
     "start_date": "",
     "end_date": "",
     "projection": "EPSG:27700"
}

let monthly_aerosol_metadata = {
        "name": "Aerosol Optical Depth - Monthly",
        "short_description": "Estimates the thickness of dust and other aerosols in the atmosphere",
        "units": "Fraction",
        "start_date": "2018-05-15",
        "end_date": "2023-03-15",
        "step": "monthly",
        "long_description": 'This data set provides observational records of aerosol properties obtained from observations collected by various satellite instruments. Aerosols are minor constituents of the atmosphere by mass, but critical components in terms of impact on climate. Aerosols influence the global radiation balance directly by scattering and absorbing radiation, and indirectly through influencing cloud reflectivity, cloud cover and cloud lifetime. <a href="https://eocis.org/dataset-aerosol-and-particulate-matter/" target="_blank">EOCIS Aerosol and Particulate Matter Dataset Information Page</a>',
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let monthly_ice_sheet_metadata = {
        "name": "Ice Sheet Surface Elevation Change - Monthly",
        "short_description": "Ice Sheet Surface Elevation Change - Monthly",
        "units": "Fraction",
        "start_date": "1994-11-15",
        "end_date": "2020-06-01",
        "step": "daily",
        "long_description": '',
        "legend": "wms",
        "projection": "EPSG:3031"
    };


let monthly_fm_aerosol_metadata = {
        "name": "Fine Aerosol Optical Depth - Monthly",
        "short_description": "Estimates the thickness of fine particles and other aerosols in the atmosphere",
        "units": "Fraction",
        "start_date": "2018-05-15",
        "end_date": "2023-03-15",
        "step": "monthly",
        "long_description": 'This data set provides observational records of aerosol properties obtained from observations collected by various satellite instruments. Aerosols are minor constituents of the atmosphere by mass, but critical components in terms of impact on climate. Aerosols influence the global radiation balance directly by scattering and absorbing radiation, and indirectly through influencing cloud reflectivity, cloud cover and cloud lifetime. <a href="https://eocis.org/dataset-aerosol-and-particulate-matter/" target="_blank">EOCIS Aerosol and Particulate Matter Dataset Information Page</a>',
        "legend": "wms",
        "projection": "EPSG:4326"
    };

let layer_metadata = {
    "analysed_sst": analysed_sst_metadata,
    "analysed_sst_anomaly": analysed_sst_anomaly_metadata,
    "monthly_chlor_a": monthly_chlor_a_metadata,
    /* "sea_ice_fraction": sea_ice_fraction_metadata, */
    /* "sea_ice_fraction_anomaly": sea_ice_fraction_anomaly_metadata, */
    "chuk_maxst": chuk_maxst_metadata,
    /* "beta_c4grass": soil_moisture_metadata, */
    "AOD550_mean": monthly_aerosol_metadata,
    /* "FM_AOD550_mean": monthly_fm_aerosol_metadata, */
    "chuk_landcover": chuk_landcover_metadata,
    "chuk_builtarea_urban": chuk_builtarea_urban_metadata,
    /* "chuk_builtarea_suburban": chuk_builtarea_suburban_metadata, */
    "chuk_landcover_historical": chuk_landcover_historical_metadata,
    "chuk_roads": chuk_roads_metadata,
    "chuk_railways": chuk_railways_metadata,
    "chuk_lakes": chuk_lakes_metadata,
    "chuk_rivers": chuk_rivers_metadata,
    "chuk_power_lines": chuk_power_lines_metadata,
    "ice_sheet_monthly": monthly_ice_sheet_metadata
}
