/*
# MIT License
#
# Copyright (C) 2023-2025 National Centre For Earth Observation (NCEO)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software
# and associated documentation files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use, copy, modify, merge, publish,
# distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all copies or
# substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
# BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var map = null;
var popup = null;

/**
 * Define a class to manage a leafletJS-based viewer for WMS data layers
 */
class DataViewer {

    /**
     * Create a data viewer for a named subset of layers
     *
     * @param subset_name
     */
    constructor(subset_name) {

        this.subset_name = subset_name;
        this.base_wms_url = "wms_service";
        this.point_service_base_url = "point_service";
        this.metadata_url = "layers";
        this.legend_url = "legend";

        this.popup_latlng = null;

        this.start_date = null;
        this.end_date = null;
        this.view_date = null;

        // mapping from layer_name to metadata object loaded from the metadata_url
        this.layer_metadata = {};

        // map from layer_name to the map layer, for all currently visible layers
        this.current_layers = {};
        // list of layer names, ordered from top to bottom
        this.current_layer_names = [];
        // map from layer name to the div element that holds controls for that layer
        this.layer_controls = {};

        // map from layer_name to legend <img> elements and min/max controls
        this.legend_imgs= {};
        this.legend_mins= {};
        this.legend_maxes= {};

        this.slider = null;
        this.projection = "";

        // bounding box
        this.min_y = null;
        this.max_y = null;
        this.min_x = null;
        this.max_x = null;
        this.rectangle = null;
        this.remove_area_btn = document.getElementById("removeArea");
        this.remove_area_btn.style.display = "none";

        this.base_map_none = document.getElementById("base_map_none");
        this.base_map_osm = document.getElementById("base_map_osm");
        this.base_map_coastline = document.getElementById("base_map_coastline");

        this.base_map_none.addEventListener("input", (evt) => {
            if (this.base_layer) {
                map.removeLayer(this.base_layer);
                this.base_layer = null;
            }
        });

        if (this.base_map_osm) {
            this.base_map_osm.addEventListener("input", (evt) => {
                if (this.base_layer === null) {
                    this.add_base_layer("osm");
                    this.base_layer.bringToBack();
                }
            });
        }

        if (this.base_map_coastline) {
            this.base_map_coastline.addEventListener("input", (evt) => {
                if (this.base_layer === null) {
                    this.add_base_layer("coastline");
                    this.base_layer.bringToBack();
                }
            });
        }
    }

    /**
     * Add a base layer to the map
     */
    add_base_layer(type) {
        if (type === "osm") {
            this.base_layer = L.tileLayer.wms('http://127.0.0.1:8181/service?', { // 'https://eocis.org/mapproxy/service?', {
                layers: 'osm',
                attribution: '© OpenStreetMap'
            }).addTo(map);
        }
        if (type === "coastline") {
            fetch("coastline.geojson").then(r => r.json()).then(o => {
                this.base_layer = L.geoJSON(o).addTo(map);
            });
        }
    }

    /**
     * Load metadata and then initialise the map
     *
     * @returns {Promise<void>}
     */
    async load_metadata() {
        let r = await fetch(this.metadata_url+"/"+this.subset_name);
        let o = await r.json();

        this.layer_metadata = o["layers"];
        this.projection = o["projection"];
        this.min_zoom = o["min_zoom"];
        this.initial_zoom = o["initial_zoom"];
        this.max_zoom = o["max_zoom"];
        this.data_url = o["data_url"];

        this.lon_min = o["lon_min"];
        this.lon_max = o["lon_max"];
        this.lat_min = o["lat_min"];
        this.lat_max = o["lat_max"];

        if (this.projection === "EPSG:4326") {
            this.crs = L.CRS.EPSG4326;

            const lat_center = (this.lat_max+this.lat_min) / 2;
            const lon_center = (this.lon_max+this.lon_min) / 2;

            this.bounds = [[this.lon_min,this.lat_min],[this.lon_max,this.lat_max]];
            this.center = [lon_center,lat_center];

        } else {
            if (!(this.projection in custom_crs)) {
                throw "Unknown projection: " + this.projection;
            }

            let c = custom_crs[this.projection];

            this.crs = new L.Proj.CRS(this.projection, c.proj4, {
                resolutions: c.resolutions,
                origin: c.origin
            });

            this.transformCoords = function (arr) {
                return proj4(this.projection, 'EPSG:4326', arr); // .reverse();
            };

            this.bounds = [
                this.transformCoords([ c.minx, c.miny ]),
                this.transformCoords([ c.maxx, c.maxy ])
            ];

            this.center = c.center;

        }

        // Initialize the map.
        const mapOptions = {
            crs: this.crs,
            center: this.center,
            zoom: this.initial_zoom,
            minZoom: this.min_zoom,
            maxZoom: this.max_zoom,
            bounds: this.bounds
        };

        map = L.map('map', mapOptions);

        if (this.base_map_osm) {
            this.add_base_layer("osm");
        }

        if (this.base_map_coastline) {
            this.add_base_layer("coastline");
        }

        this.search_results_modal = new bootstrap.Modal($('#search_results_modal').get(0), {
            keyboard: false
        });

        this.info_modal = new bootstrap.Modal($('#info_modal').get(0), {
           keyboard: false
        });

        this.scale_modal = new bootstrap.Modal($('#scale_modal').get(0), {
           keyboard: false
        });
        this.scale_min  = document.getElementById("scale_min");
        this.scale_max  = document.getElementById("scale_max");
        this.scale_cmap = document.getElementById("scale_cmap");
        this.scale_update_btn = document.getElementById("scale_update_btn");

        // bind search controls
        this.bind();

        // attach layers panel open / close buttons
        document.getElementById("layers_close_btn").addEventListener("click", (evt) => {
            document.getElementById("layers").style.display = "none";
            document.getElementById("map").style.left = "10px";
            map.invalidateSize();
        });

        document.getElementById("layers_open_btn").addEventListener("click", (evt) => {
            document.getElementById("layers").style.display = "flex";
            document.getElementById("map").style.left = "420px";
            map.invalidateSize();
        });

        popup = L.popup();

        popup.on('remove', ()=> {
           this.popup_latlng = null;
        });

        map.on('click', async (e) => {
            this.popup_latlng = e.latlng;
            await this.update_popup(e.latlng);
        });

        if (this.projection === "EPSG:4326") {

            var drawnItems = new L.FeatureGroup();

            map.addLayer(drawnItems);

            var drawControl = new L.Control.Draw({
                draw: {
                    rectangle: true,
                    polyline: false,
                    polygon: false,
                    marker: false,
                    line: false,
                    circle: false,
                    circlemarker: false
                }
            });
            map.addControl(drawControl);

            map.on('draw:created', (e) => {
                var layer = e.layer;
                let poly = layer.getLatLngs()[0];

                if (this.rectangle !== null) {
                    this.rectangle.remove();
                    this.rectangle = null;
                }

                this.min_y = null;
                this.max_y = null;
                this.min_x = null;
                this.max_x = null;

                for (let idx = 0; idx < poly.length; idx++) {
                    let p = poly[idx];
                    if (this.min_y === null || p.lat < this.min_y) {
                        this.min_y = p.lat;
                    }
                    if (this.max_y === null || p.lat > this.max_y) {
                        this.max_y = p.lat;
                    }
                    if (this.min_x === null || p.lng < this.min_x) {
                        this.min_x = p.lng;
                    }
                    if (this.max_x  === null || p.lng > this.max_x ) {
                        this.max_x = p.lng;
                    }
                }
                let bounds = [[this.min_y, this.min_x], [this.max_y, this.max_x]];
                this.rectangle = L.rectangle(bounds, {"color": "blue"}).addTo(map);
                drawnItems.addLayer(this.rectangle);

                this.remove_area_btn.style.display = "inline";
            });

            this.remove_area_btn.addEventListener("click", (evt) => {
                this.rectangle.remove();
                this.rectangle = null;
                this.min_y = null;
                this.max_y = null;
                this.min_x = null;
                this.max_x = null;
                this.remove_area_btn.style.display = "none";
            });
        }
    }

    /**
     * Initialise the viewer, loading any parameters from the URL that specify layers and viewing time
     */
    init() {
        let sp = new URLSearchParams(location.search);
        let state = {};
        if (sp.has("layer")) {
            state["layer"] = sp.get("layer");
        }

        if (sp.has("view_date")) {
            state["view_date"] = sp.get("view_date");
        }

        this.load_state(state);

        window.addEventListener("popstate", (evt) => {
            this.load_state(history.state);
        });
    }

    /**
     * Load the state from an object collected from the URL
     *
     * @param state an object containing layer and view_date attributes to configure the viewer
     */
    load_state(state) {
        this.clear_layers();
        if (state.layer) {
            let names = state.layer.split(",");
            for(var idx=0; idx<names.length; idx++) {
                let layer_name = names[idx];
                if (layer_name in this.layer_metadata && !this.layer_metadata[layer_name].disabled) {
                    this.add_layer(layer_name);
                }
            }
        }
        if (state.view_date) {
            this.view_date = this.string_to_date(state.view_date);
            this.update_view_date();
            this.slider.value = this.view_date;
        }
    }

    /**
     * record updated layer and view date selections in the browser history
     */
    update_history() {
        const url = new URL(window.location);
        let state = {};

        if (this.current_layer_names.length) {
            let layer_names_str = this.current_layer_names.join(",");
            url.searchParams.set("layer", layer_names_str);
            state["layer"] = layer_names_str;
        } else {
            url.searchParams.delete("layer");
        }

        if (this.view_date) {
            let view_date_str = this.date_to_string(this.view_date);
            url.searchParams.set("view_date", view_date_str);
            state["view_date"] = view_date_str;
        } else {
            url.searchParams.delete("view_date");
        }

        history.pushState(state, "", url);
    }

    /**
     * Provide a standard string representation of dates
     *
     * @param {Date} dt a javascript date
     *
     * @returns {string} in format YYYY-MM-DD
     */
    date_to_string(dt) {
        // return YYY-MM-DD formatted string from Date
        let day = dt.getUTCDate();
        let month = dt.getUTCMonth() + 1;
        let year = dt.getFullYear();
        let s = String(year) + "-" + String(month).padStart(2, '0') + "-" + String(day).padStart(2, '0');
        return s;
    }

    /**
     * Parse a string
     *
     * @param s a string in format YYYY-MM-DD
     *
     * @returns {Date} a javascript Date object parsed from the string
     */
    string_to_date(s) {
        // parse YYYY-MM-DD formatted string to Date
        let day = Number.parseInt(s.slice(8, 10));
        let month = Number.parseInt(s.slice(5, 7));
        let year = Number.parseInt(s.slice(0, 4));
        return new Date(year, month - 1, day, 12, 0, 0);
    }

    /**
     * Adjust the date range of the viewer given a layer.  This will potentially widen the date range.
     *
     * @param {string} layer_name the name of the layer
     */
    set_date_range(layer_name) {
        let start = this.layer_metadata[layer_name].start_date;
        let end = this.layer_metadata[layer_name].end_date;

        if (start !== "") {
            let start_date = this.string_to_date(start);
            if (this.start_date === null || start_date < this.start_date) {
                this.start_date = start_date;
            }
        }

        if (end !== "") {
            let end_date = this.string_to_date(end);
            if (this.end_date === null || end_date > this.end_date) {
                this.end_date = end_date;
            }
        }
    }

    /**
     * Called when the view date is updated.  Update the map layers and popup (if open)
     *
     * @returns {Promise<void>}
     */
    async update_view_date() {
        for(let layer_name in this.current_layers) {
            if (this.layer_metadata[layer_name].step === "monthly") {
                // round to mid-month
                let midmonth_date = new Date(this.view_date.getTime());
                midmonth_date.setHours(12, 0, 0, 0);
                midmonth_date.setDate(15);
                this.current_layers[layer_name].setParams({'TIME': midmonth_date.toISOString()});
            } else {
                this.current_layers[layer_name].setParams({'TIME': this.view_date.toISOString()});
            }
        }
        if (this.popup_latlng) {
            await this.update_popup(this.popup_latlng);
        }
    }

    /**
     * Update the time controls by scanning the current set of layers and seeing which temporal resolution/step
     * they have.  This may remove or add the time slider control...
     */
    update_time_controls() {
        let has_times = false;
        this.start_date = null;
        this.end_date = null;
        // work out which (if any) layers have a time dimension
        // and which time step to use
        let time_step = "monthly";
        this.current_layer_names.forEach(layer_name => {
            let layer_metadata = this.layer_metadata[layer_name];
            if (layer_metadata.start_date) {
                has_times = true;
                if (layer_metadata.step === "daily") {
                    // use a daily time step if any layers are daily
                    time_step = "daily";
                }
            }
        });
        this.remove_time_slider();
        if (has_times) {
            // set the start_date and end_date to the union of layer ranges
            this.current_layer_names.forEach(layer_name => {
                this.set_date_range(layer_name);
            });
            if (this.view_date == null) {
                this.view_date = this.end_date;
            }
            this.add_time_slider(time_step);
        }
    }

    /**
     * Remove all layers from the viewer
     */
    clear_layers() {
        let layer_names = [];
        for(let layer_name in this.current_layers) {
            layer_names.push(layer_name);
        }
        layer_names.forEach(layer_name => { this.remove_layer(layer_name)});
        this.remove_time_slider();
        this.popup_latlng = null;
    }

    /**
     * Remove a layer from the viewer
     *
     * @param {string} layer_name the name of the layer to remove
     */
    remove_layer(layer_name) {
        this.current_layer_names = this.current_layer_names.filter((name) => name != layer_name);
        this.update_top_buttons();
        let layer = this.current_layers[layer_name];
        map.removeLayer(layer);
        delete this.current_layers[layer_name];
        let controls = this.layer_controls[layer_name];
        controls.parentElement.removeChild(controls);
        delete this.layer_controls[layer_name];
        this.update_time_controls();
        if (this.start_date != null && this.end_date != null) {
            if (this.view_date < this.start_date) {
                this.view_date = this.start_date;
                if (this.slider) {
                    this.slider.value = this.view_date;
                }
            }
            if (this.view_date > this.end_date) {
                this.view_date = this.end_date;
                if (this.slider) {
                    this.slider.value = this.view_date;
                }
            }
        } else {
            this.view_date = null;
        }
        this.update_history();
        map.closePopup();
    }

    /**
     * Make an empty span element with a given HTML background colour
     *
     * @param {string} col the HTML colour string
     *
     * @returns {HTMLSpanElement}
     */
    make_colour_entry(col) {
        let elt = document.createElement("span");
        elt.appendChild(document.createTextNode("\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
        elt.style.background = col;
        return elt;
    }

    /**
     * Gets a URL for a layer's legend
     *
     * @param layer_name
     * @returns {string}
     */
    get_legend_url(layer_name) {
        return this.legend_url+"?cmap="+this.layer_metadata[layer_name].cmap;
    }

    /**
     * Add a layer to the viewer
     *
     * @param {string} layer_name the name of the layer to add
     */
    add_layer(layer_name) {

        if (layer_name in this.current_layers) {
            return; // layer is already included in display, do nothing
        }

        let layer_metadata = this.layer_metadata[layer_name];
        this.current_layer_names = [layer_name].concat(this.current_layer_names);

        this.update_time_controls();

        map.closePopup();

        if (this.popup_latlng != null) {
            this.popup_latlng = null;
        }

        $("layer_title").value = layer_metadata.name;

        this.current_popup_coordinate = null;

        let wms_params = {
            'layers': layer_name,
            'format':"image/png",
            'version':'1.3.0',
            'transparent': true,
            'bounds': L.latLngBounds([[this.lat_min, this.lon_min],[this.lat_max, this.lon_max]]),
            'CMAP': this.layer_metadata[layer_name].cmap,
            'VMIN': this.layer_metadata[layer_name].min,
            'VMAX': this.layer_metadata[layer_name].max,
            updateWhenIdle: false,
            updateWhenZooming: false,
            keepBuffer: 4
        }

        this.layer_controls[layer_name] = this.add_layer_controls(layer_name, layer_metadata);

        this.update_top_buttons();

        if (this.view_date) {
            wms_params['TIME'] = this.view_date.toISOString()
        }

        this.current_layers[layer_name] = L.tileLayer.wms(this.base_wms_url, wms_params).addTo(map);

        this.current_layers[layer_name].on('loading', function (event) {
            let ele = document.getElementById(layer_name+"_load_status");
            if (ele) {
                ele.style.visibility = "visible";
            }
        });

        this.current_layers[layer_name].on('load', function (event) {
            let ele = document.getElementById(layer_name+"_load_status");
            if (ele) {
                ele.style.visibility = "hidden";
            }
        });

        let description = layer_metadata.description;
        const info = $('layer_info');
        info.innerHTML = description;

        this.update_history();
        if (this.popup_latlng) {
            this.update_popup(this.popup_latlng);
        }
    }

    /**
     * Add a set of controls for a given layer to the control panel, returning the div element containing the controls
     *
     * @param {string} layer_name the name of the layer to add controls for
     * @param {object} layer_metadata metadata associated with the layer
     *
     * @returns {HTMLDivElement}
     */
    add_layer_controls(layer_name,layer_metadata) {

        function add_spacer(ele) {
            let spacer = document.createElement("div");
            spacer.setAttribute("style","height:20px;")
            ele.appendChild(spacer);
        }

        let parent = document.getElementById("layer_column");

        let d = document.createElement("div");
        d.appendChild(document.createElement("hr"));

        if (parent.firstChild) {
            parent.insertBefore(d,parent.firstChild);
        } else {
            parent.appendChild(d);
        }
        add_spacer(d);

        // add some header information text for the layer (dataset name, layer name, units if defined)

        let h0 = document.createElement("h6");
        h0.appendChild(document.createTextNode(layer_metadata.dataset_name));
        d.appendChild(h0);

        let h = document.createElement("h6");
        h.appendChild(document.createTextNode(layer_metadata.name));
        d.appendChild(h);

        if (layer_metadata.units) {
            d.appendChild(document.createTextNode(layer_metadata.units));
        }

        add_spacer(d);

        // add the legend

        const legend_table_div = document.getElementById('legend_table_div');

        // depending on whether the legend is discrete or continuous...
        if (layer_metadata.legend === "table") {
            // discrete
            let legend_table_div = document.createElement("div");
            let legend_table = document.createElement("table");
            legend_table.innerHTML = "";
            legend_table_div.style.display = "block";
            let classes = layer_metadata.legend_classes.split(" ");
            let colors = layer_metadata.legend_colors.split(" ");
            for (let row = 0; row < classes.length; row += 1) {
                let tr = document.createElement("tr");
                let tc1 = document.createElement("td");
                let tc2 = document.createElement("td");

                tc1.appendChild(document.createTextNode(classes[row]));
                tc2.appendChild(this.make_colour_entry(colors[row]));

                tr.appendChild(tc1);
                tr.appendChild(tc2);

                legend_table.appendChild(tr);
            }
            legend_table_div.appendChild(legend_table);
            d.appendChild(legend_table_div);
        } else {
            // continuous
            let url = this.get_legend_url(layer_name);
            let legend_img = document.createElement("img");
            legend_img.setAttribute("class", "legend");
            legend_img.style.display = "inline";
            legend_img.setAttribute("src", url);
            this.legend_imgs[layer_name] = legend_img;
            let legend_table = document.createElement("table");
            legend_table.style.display = "block";
            let tr = document.createElement("tr");
            let td0 = document.createElement("td");
            td0.setAttribute("class","legend_min");
            td0.appendChild(document.createTextNode(""+layer_metadata.min));
            this.legend_mins[layer_name] = td0;
            let td1 = document.createElement("td");
            td1.setAttribute("class","legend_colourbar");
            td1.appendChild(legend_img);
            let td2 = document.createElement("td");
            td2.setAttribute("class","legend_max");
            td2.appendChild(document.createTextNode(""+layer_metadata.max));
            this.legend_maxes[layer_name] = td2;
            tr.appendChild(td0);
            tr.appendChild(td1);
            tr.appendChild(td2);
            legend_table.appendChild(tr);
            d.appendChild(legend_table);
        }
        add_spacer(d);

        // add an opacity slider control and a loading status button
        let opacity_id = layer_name+"_opacity";
        let opacity_div = document.createElement("div");
        let opacity_label = document.createElement("label");
        opacity_label.setAttribute("for", opacity_id);
        opacity_label.setAttribute("class","opacity_control_label");
        opacity_label.appendChild(document.createTextNode("Opacity"));

        let opacity_control = document.createElement("input");
        opacity_control.setAttribute("id",opacity_id);
        opacity_control.setAttribute("class","opacity_control");
        opacity_control.setAttribute("type","range");
        opacity_control.setAttribute("step", "0.01");
        opacity_control.setAttribute("min","0.0");
        opacity_control.setAttribute("max","1.0");
        opacity_control.setAttribute("value","1.0");

        opacity_control.addEventListener("input", this.create_opacity_callback(layer_name));

        opacity_div.appendChild(opacity_label);
        opacity_div.appendChild(opacity_control);
        let loading_button = document.createElement("button");
        loading_button.setAttribute("class","btn btn-warning loading-btn");
        loading_button.appendChild(document.createTextNode("Loading"));
        loading_button.setAttribute("id",layer_name+"_load_status");
        loading_button.style.marginLeft = "10px";
        opacity_div.appendChild(loading_button);

        d.appendChild(opacity_div);

        add_spacer(d);

        // add a row of buttons associated with the layer

        // info button
        let button = document.createElement("button");
        button.setAttribute("class","btn btn-light");
        button.appendChild(document.createTextNode("Info"));
        button.addEventListener("click", this.create_info_button_callback(layer_name));
        button.style.marginRight = "5px";
        d.appendChild(button);

        // for continuous scaled layers, add a rescale button
        if (layer_metadata.legend !== "table") {
            let rescale_button = document.createElement("button");
            rescale_button.setAttribute("class", "btn btn-light");
            rescale_button.appendChild(document.createTextNode("Rescale"));
            rescale_button.addEventListener("click", this.create_rescale_button_callback(layer_name));
            rescale_button.style.marginRight = "5px";
            d.appendChild(rescale_button);
        }

        // add a button to remove the layer
        let remove_button = document.createElement("button");
        remove_button.setAttribute("class","btn btn-light");
        remove_button.appendChild(document.createTextNode("Remove"));
        remove_button.addEventListener("click", this.create_remove_button_callback(layer_name));
        remove_button.style.marginRight = "5px";
        d.appendChild(remove_button);

        // if this viewer is linked to the data ordering service, add a button to open the data ordering page
        if (this.data_url) {
            let data_button = document.createElement("button");
            data_button.setAttribute("class", "btn btn-light");
            data_button.appendChild(document.createTextNode("Data"));
            data_button.addEventListener("click", (evt) => {
                this.open_data_ordering_page(layer_name)
            });
            data_button.style.marginRight = "5px";
            d.appendChild(data_button);
        }

        // add a button that can move this layer to the top
        let top_btn = document.createElement("button");
        top_btn.setAttribute("class","btn btn-light");
        top_btn.setAttribute("id",layer_name+"_top_btn");
        top_btn.innerHTML = "Top";
        top_btn.addEventListener("click", this.create_top_button_callback(layer_name));
        d.appendChild(top_btn);

        return d;
    }

    /**
     * Create a callback for adjusting the opacity
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    create_opacity_callback(layer_name) {
        return (ev) => {
            let opacity_fraction = Number.parseFloat(ev.target.value);
            this.current_layers[layer_name].setOpacity(opacity_fraction);
        }
    }

    /**
     * Create a callback for opening the information modal
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    create_info_button_callback(layer_name) {
        let layer_metadata = this.layer_metadata[layer_name];
        let description = layer_metadata.description;
        return (evt) => {
            document.getElementById("info_label").innerHTML = "Info - " + layer_metadata.dataset_name;
            document.getElementById("layer_info_dataset").innerHTML = layer_metadata.dataset_description;
            document.getElementById("layer_info_variable").innerHTML = "Variable: "+ layer_metadata.name;
            document.getElementById("layer_info").innerHTML = ""; // description !== layer_metadata.dataset_description ? description : "";
            document.getElementById("layer_info_date_range").innerText = layer_metadata.start_date ?
                (layer_metadata.start_date + " to " + layer_metadata.end_date) : "";
            if (layer_metadata.link) {
                document.getElementById("layer_info_link").innerHTML = "<a target=\"_new\" href=\""+layer_metadata.link+"\">More Information on this data...</a>";
            } else {
                document.getElementById("layer_info_link").innerHTML = "";
            }
            this.info_modal.show();
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    /**
     * Create a callback for rescaling the layer's colour scale
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    create_rescale_button_callback(layer_name) {
        return (evt) => {
            let defn = this.layer_metadata[layer_name];
            this.scale_min.value = defn.min;
            this.scale_max.value = defn.max;
            this.scale_cmap.value = defn.cmap;
            this.scale_modal.show();
            setTimeout(() => {
                for (let idx = 0; idx < this.scale_cmap.childElementCount; idx++) {
                    let option = this.scale_cmap.children[idx];
                    if (option.getAttribute("value") === defn.cmap) {
                        option.scrollIntoView();
                    }
                }
            },500);
            this.scale_update_btn.onclick = (evt) => {
                defn.cmap = this.scale_cmap.value;
                defn.min = Number.parseFloat(this.scale_min.value);
                defn.max = Number.parseFloat(this.scale_max.value);
                this.current_layers[layer_name].setParams({'CMAP': defn.cmap, 'VMIN':defn.min, 'VMAX':defn.max});
                this.legend_imgs[layer_name].setAttribute("src",this.get_legend_url(layer_name));
                this.legend_mins[layer_name].innerText = this.scale_min.value;
                this.legend_maxes[layer_name].innerText = this.scale_max.value;
            }
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    /**
     * Create a callback for removing a layer
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    create_remove_button_callback(layer_name) {
        return (evt) => {
            this.remove_layer(layer_name);
        }
    }

    /**
     * Create a callback for moving a layer to the front
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    create_top_button_callback(layer_name) {
        return (evt) => {
            this.current_layer_names = [layer_name].concat(this.current_layer_names.filter((name) => name != layer_name));
            this.current_layers[layer_name].bringToFront();
            let controls = this.layer_controls[layer_name];
            let container = controls.parentElement;
            container.removeChild(controls);
            if (container.firstChild) {
                container.insertBefore(controls, container.firstChild);
            } else {
                container.appendChild(controls);
            }
            this.update_top_buttons();
        }
    }

    /**
     * Enable/disable the "top" buttons for each layer according to whether the
     * layer is already at the top (disable the top button) or not (enable the top button)
     */
    update_top_buttons() {
        // enable the top button on all other layers except the first
        for (let idx=0; idx<this.current_layer_names.length; idx++) {
            let layer_name = this.current_layer_names[idx];
            let btn_id = layer_name + "_top_btn";
            let btn = document.getElementById(btn_id);
            if (btn) {
                if (idx===0) {
                    btn.disabled = true;
                } else {
                    btn.disabled = false;
                }
            }
        }
    }

    /**
     * Called to update a popup
     *
     * @param {object} latlng a leaflet object defining lng and lat properties
     * @returns {Promise<void>}
     */
    async update_popup(latlng) {

        let lon = latlng.lng;
        let lat = latlng.lat;

        let html = "";
        let location = "";
        for(let layer_idx in this.current_layer_names) {
            let layer_name = this.current_layer_names[layer_idx];
            let name = this.layer_metadata[layer_name].name;
            let url = "";
            if (this.view_date) {
                let dt_s = this.view_date.toISOString().split('T')[0];
                url = this.point_service_base_url + "/" + layer_name + "/" + lat + ":" + lon + "/" + dt_s;
            } else {
                url = this.point_service_base_url + "/" + layer_name + "/" + lat + ":" + lon;
            }

            await fetch(url).then(r => r.text(), e => {
                console.error(e);
            }).then(t => {
                try {
                    let data = JSON.parse(t);
                    location = data["location"];
                    if (!("value" in data) && !("category" in data)) {
                        // ignore
                    } else {
                        html += "<p>" + name + "</p>";
                        let text = "?";
                        if ("value" in data) {
                            let current_value = data["value"];
                            let units = data["units"];
                            let current_value_label = "?";
                            if (current_value !== null && current_value !== undefined) {
                                current_value_label = current_value.toFixed(2)
                            }
                            text = current_value_label + " " + units;
                        } else if ("category" in data) {
                            text = data["category"];
                        }
                        html += "<p>" + text + "</p>";
                    }
                } catch(e) {
                    console.error(e);
                }
            }, e => {
                console.error(e)
            });
        }

        if (html) {
            html = "<p></p><p>" + location + "</p>" + html;
            popup
                .setLatLng(latlng)
                .setContent(html)
                .openOn(map);
        }
    }

    /**
     * Check for a search case-insensitive match
     *
     * @param {string} search_text the text to search for
     * @param {string} searchable_text the text to search in
     * @returns {boolean} whether the search text was found or not
     */
    search_match(search_text, searchable_text) {
        return (searchable_text.toLowerCase().search(search_text.toLowerCase()) != -1);
    }

    /**
     * Create a callback to add a layer to the viewer
     *
     * @param {string} layer_name
     * @returns {(function(*): void)|*}
     */
    make_add_layer_callback(layer_name) {
        return (ev) => {
            this.add_layer(layer_name);
            this.search_results_modal.hide();
        }
    }

    /**
     * Open the data ordering page in a new tab configured for a particular layer's dataset and variable
     *
     * @param {string} layer_name
     */
    open_data_ordering_page(layer_name) {
        let metadata = this.layer_metadata[layer_name];
        let url = this.data_url+"?dataset="+metadata["dataset"]+"&variable="+metadata["variable"];
        if (this.view_date) {
            url += "&start_date="+this.view_date.toISOString().slice(0,10)+"&end_date="+this.view_date.toISOString().slice(0,10);
        }
        if (this.min_x !== null && this.min_y !== null && this.max_x !== null && this.max_y !== null) {
            url += "&min_x="+this.min_x+"&min_y="+this.min_y + "&max_x="+this.max_x+"&max_y="+this.max_y;
        }
        window.open(url,"_new");
    }

    /**
     * perform a search through layer metadata, opening the results in a modal window
     *
     * @param {string} search_text the search string
     */
    run_search(search_text) {
        let matching_layers = {}; // dataset => [layer_name]
        for (let layer_name in this.layer_metadata) {
            let metadata = this.layer_metadata[layer_name];
            if (metadata.disabled) {
                continue;
            }
            ["dataset_name", "dataset_description", "name", "description"].forEach(field => {
                if ((field in metadata) && this.search_match(search_text, metadata[field])) {
                    let dataset = metadata["dataset"];
                    if (dataset) {
                        if (!(dataset in matching_layers)) {
                            matching_layers[dataset] = [];
                        }

                        if (!matching_layers[dataset].includes(layer_name)) {
                            matching_layers[dataset].push(layer_name);
                        }
                    }
                }
            });
        }
        let search_results = $("#search_results").get(0);
        search_results.innerHTML = "";

        if (matching_layers.length == 0) {
            search_results.innerHTML = "No matches";
        } else {
            let ul = document.createElement("ul");
            search_results.appendChild(ul);
            for(let dataset in matching_layers) {
                let li = document.createElement("li");
                let first_layer_name = matching_layers[dataset][0];
                li.appendChild(document.createTextNode(this.layer_metadata[first_layer_name].dataset_name));
                let dataset_description = document.createElement("p");

                dataset_description.appendChild(document.createTextNode(this.layer_metadata[first_layer_name].dataset_description));

                let button = document.createElement("a");
                button.setAttribute("class", "dataset_link");
                dataset_description.appendChild(button);
                li.appendChild(dataset_description);

                let sul = document.createElement("ul");
                let layer_id = dataset+"_layers";
                sul.setAttribute("id",layer_id);
                sul.setAttribute("class", "display:none;");
                let handler = this.create_dataset_list_handler(sul,button);
                handler();
                button.addEventListener("click",handler);
                li.appendChild(sul);
                ul.appendChild(li);
                for (let idx = 0; idx < matching_layers[dataset].length; idx++) {
                    let layer_name = matching_layers[dataset][idx];
                    let li = document.createElement("li");
                    let a = document.createElement("a");
                    a.setAttribute("class", "search_link");
                    let p = document.createElement("p");
                    let txt = document.createTextNode(this.layer_metadata[layer_name].name);
                    li.appendChild(a);
                    a.appendChild(txt);
                    if (this.layer_metadata[layer_name].description && this.layer_metadata[layer_name].description !== this.layer_metadata[layer_name].name) {
                        let desc_txt = document.createTextNode(this.layer_metadata[layer_name].description);
                        p.appendChild(desc_txt);
                    }
                    li.appendChild(p);
                    a.addEventListener("click", this.make_add_layer_callback(layer_name));
                    sul.appendChild(li);
                }
            }
        }
    }

    /**
     * Create a callback function to manage the search results for a group of layers which belong to a particular dataset
     * @param layer_list
     * @param button
     * @returns {(function(): void)|*}
     */
    create_dataset_list_handler(layer_list, button) {
        let list_open = true;
        return () => {
            list_open = !list_open;
            if (list_open) {
                layer_list.setAttribute("style", "display:block;");
                button.innerHTML = "[Hide Layers]";
            } else {
                layer_list.setAttribute("style", "display:none;");
                button.innerHTML = "[Show Layers]";
            }
        }
    }

    /**
     * Bind search and add layer controls
     */
    bind() {
        $("#search_btn").get(0).addEventListener("click", (evt) => {

            let search_text = $("#search_text").get(0).value;
            evt.preventDefault();
            evt.stopPropagation();

            try {
                this.run_search(search_text);
            } catch (e) {
                console.error(e);
            }
            this.search_results_modal.show();

        });

        $("#add_layer_btn").get(0).addEventListener("click", (evt) => {
            try {
                this.search_results_modal.show();
                this.run_search("");
            } catch (e) {
                console.error(e);
            }
        });

    }

    /**
     * Add a time slider control to the viewer
     *
     * @param {string} step the time step, currently accepts "daily" or "monthly"
     */
    add_time_slider(step) {
        if (this.slider) {
            this.remove_time_slider();
        }
        $("#slider_div").get(0).innerHTML = "";

        this.slider = new TimeSlider("slider_div", this.start_date, this.end_date, this.view_date, step);
        window.addEventListener("resize", (evt) => {
            this.slider.resize();
        });
        this.slider.addEventListener("change", async (evt) => {
            this.view_date = evt.target.value;
            await this.update_view_date();
            this.update_history();
        });
    }

    /**
     * Remove the time slider from the viewer
     */
    remove_time_slider() {
        document.getElementById("slider_div").innerHTML = "";
        this.slider = null;
    }

}






