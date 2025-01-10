
var map = null;
var popup = null;


class DataViewer {

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
        this.current_layer_names = [];
        this.layer_controls = {};

        this.slider = null;
        this.projection = "";
    }

    async load_metadata() {
        let r = await fetch(this.metadata_url+"/"+this.subset_name);
        let o = await r.json();

        this.layer_metadata = o["layers"];
        this.projection = o["projection"];
        this.min_zoom = o["min_zoom"];
        this.initial_zoom = o["initial_zoom"];
        this.max_zoom = o["max_zoom"];

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
                return proj4(this.projection, 'EPSG:4326', arr).reverse();
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

        this.wmsLayer = L.tileLayer.wms('https://eocis.org/mapproxy/service?', {
            layers: 'osm'
        }).addTo(map);


        this.search_results_modal = new bootstrap.Modal($('#search_results_modal').get(0), {
            keyboard: false
        });

        this.info_modal = new bootstrap.Modal($('#info_modal').get(0), {
           keyboard: false
        });

        this.bind();

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

    }

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

    load_state(state) {
        if (state.layer) {
            let names = state.layer.split(",");
            this.clear_layers();
            this.select_layers(names);
        } else {
            this.clear_layers();
        }
        if (state.view_date) {
            this.view_date = this.string_to_date(state.view_date);
            this.update_view_date();
            this.slider.value = this.view_date;
        }
    }

    update_history() {
        const url = new URL(window.location);
        let state = {};
        if (this.current_layer_names.length) {
            let layer_names_str = this.current_layer_names.join(",");
            url.searchParams.set("layer", layer_names_str);
            state["layer"] = layer_names_str;
        }
        if (this.view_date) {
            let view_date_str = this.date_to_string(this.view_date);
            url.searchParams.set("view_date", view_date_str);
            state["view_date"] = view_date_str;
        }

        history.pushState(state, "", url);
    }

    date_to_string(dt) {
        // return YYY-MM-DD formatted string from Date
        let day = dt.getUTCDate();
        let month = dt.getUTCMonth() + 1;
        let year = dt.getFullYear();
        let s = String(year) + "-" + String(month).padStart(2, '0') + "-" + String(day).padStart(2, '0');
        return s;
    }

    string_to_date(s) {
        // parse YYYY-MM-DD formatted string to Date
        let day = Number.parseInt(s.slice(8, 10));
        let month = Number.parseInt(s.slice(5, 7));
        let year = Number.parseInt(s.slice(0, 4));
        return new Date(year, month - 1, day);
    }

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

    async update_view_date() {
        for(let layer_name in this.current_layers) {
            this.current_layers[layer_name].setParams({'TIME': this.view_date.toISOString()});
        }
        if (this.popup_latlng) {
            await this.update_popup(this.popup_latlng);
        }
    }

    update_time_controls() {
        let has_times = false;
        this.start_date = null;
        this.end_date = null;
        // work out which (if any) layers have a time dimension
        this.current_layer_names.forEach(layer_name => {
            let layer_metadata = this.layer_metadata[layer_name];
            if (layer_metadata.start_date) {
                has_times = true;
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
            this.add_time_slider();
        }
    }

    select_layers(layer_names) {
        this.clear_layers();
        for(var idx=0; idx<layer_names.length; idx++) {
            this.add_layer(layer_names[idx]);
        }
    }

    clear_layers() {
        let layer_names = [];
        for(let layer_name in this.current_layers) {
            layer_names.push(layer_name);
        }
        layer_names.forEach(layer_name => { this.remove_layer(layer_name)});
        this.remove_time_slider();
        this.popup_latlng = null;
        // $("layers").setAttribute("style", "display:none;");
        this.current_layers = {};
        this.current_layer_names = [];
    }

    remove_layer(layer_name) {
        this.current_layer_names = this.current_layer_names.filter((name) => name != layer_name);
        let layer = this.current_layers[layer_name];
        map.removeLayer(layer);
        delete this.current_layers[layer_name];
        let controls = this.layer_controls[layer_name];
        controls.parentElement.removeChild(controls);
        delete this.layer_controls[layer_name];
        this.update_time_controls();
        this.update_history();
        map.closePopup();
    }

    make_colour_entry(col) {
        let elt = document.createElement("span");
        elt.appendChild(document.createTextNode("\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
        elt.style.background = col;
        return elt;
    }

    get_legend_url(layer_name) {
        return this.legend_url+"?layer="+layer_name;
    }

    add_layer(layer_name) {

        if (layer_name in this.current_layers) {
            return; // layer is already included in display, do nothing
        }

        let layer_metadata = this.layer_metadata[layer_name];
        this.current_layer_names.push(layer_name);
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
            'bounds': L.latLngBounds([[this.lat_min, this.lon_min],[this.lat_max, this.lon_max]])
        }

        this.layer_controls[layer_name] = this.add_layer_controls(layer_name, layer_metadata);

        if (this.view_date) {
            wms_params['TIME'] = this.view_date.toISOString()
        }

        this.current_layers[layer_name] = L.tileLayer.wms(this.base_wms_url, wms_params).addTo(map);

        this.current_layers[layer_name].on('loading', function (event) {
            let ele = document.getElementById(layer_name+"_load_status");
            if (ele) {
                ele.style.display = "inline";
            } else {
                alert("missing");
            }
        });

        this.current_layers[layer_name].on('load', function (event) {
            let ele = document.getElementById(layer_name+"_load_status");
            if (ele) {
                ele.style.display = "none";
            } else {
                alert("missing");
            }
        });

        let long_description = layer_metadata.long_description;
        const info = $('layer_info');
        info.innerHTML = long_description;


        this.update_history();
        if (this.popup_latlng) {
            this.update_popup(this.popup_latlng);
        }
    }

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
        let h = document.createElement("h6");
        h.appendChild(document.createTextNode(layer_metadata.name));
        d.appendChild(h);

        if (layer_metadata.units) {
            d.appendChild(document.createTextNode(layer_metadata.units));
        }
        add_spacer(d);

        const legend_table_div = document.getElementById('legend_table_div');

        if (layer_metadata.legend === "table") {
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
            let url = this.get_legend_url(layer_name);
            let legend_img = document.createElement("img");
            legend_img.setAttribute("class", "legend");
            legend_img.style.display = "inline";
            legend_img.setAttribute("src", url);
            let legend_table = document.createElement("table");
            legend_table.style.display = "block";
            let tr = document.createElement("tr");
            let td0 = document.createElement("td");
            td0.setAttribute("class","legend_min");
            td0.appendChild(document.createTextNode(""+layer_metadata.min));
            let td1 = document.createElement("td");
            td1.setAttribute("class","legend_colourbar");
            td1.appendChild(legend_img);
            let td2 = document.createElement("td");
            td2.setAttribute("class","legend_max");
            td2.appendChild(document.createTextNode(""+layer_metadata.max));
            tr.appendChild(td0);
            tr.appendChild(td1);
            tr.appendChild(td2);
            legend_table.appendChild(tr);
            d.appendChild(legend_table);
        }
        add_spacer(d);

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
        d.appendChild(opacity_div);

        add_spacer(d);

        let button = document.createElement("button");
        button.setAttribute("class","btn btn-info");
        button.appendChild(document.createTextNode("Information..."));
        button.addEventListener("click", this.create_info_button_callback(layer_name));
        button.style.marginRight = "10px";
        d.appendChild(button);

        let remove_button = document.createElement("button");
        remove_button.setAttribute("class","btn btn-dark");
        remove_button.appendChild(document.createTextNode("Remove"));
        remove_button.addEventListener("click", this.create_remove_button_callback(layer_name));
        remove_button.style.marginRight = "10px";
        d.appendChild(remove_button);

        let loading_button = document.createElement("button");
        loading_button.setAttribute("class","btn bg-warning");
        loading_button.appendChild(document.createTextNode("Loading..."));
        loading_button.setAttribute("id",layer_name+"_load_status");
        d.appendChild(loading_button);
        return d;
    }

    create_opacity_callback(layer_name) {
        return (ev) => {
            let opacity_fraction = Number.parseFloat(ev.target.value);
            this.current_layers[layer_name].setOpacity(opacity_fraction);
        }
    }

    create_info_button_callback(layer_name) {
        let description = this.layer_metadata[layer_name].long_description;
        return (evt) => {
            document.getElementById("layer_info").innerHTML = description;
            this.info_modal.show();
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    create_remove_button_callback(layer_name) {
        return (evt) => {
            this.remove_layer(layer_name);
        }
    }

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
        console.log("html="+html);
        if (html) {
            html = "<p></p><p>" + location + "</p>" + html;
            popup
                .setLatLng(latlng)
                .setContent(html)
                .openOn(map);
        }
    }

    search_match(search_text, searchable_text) {
        return (searchable_text.toLowerCase().search(search_text.toLowerCase()) != -1);
    }

    make_add_layer_callback(layer_name) {
        return (ev) => {
            this.add_layer(layer_name);
            this.search_results_modal.hide();
        }
    }

    run_search(search_text) {
        let matching_layers = [];
        for (let layer_name in this.layer_metadata) {
            let metadata = this.layer_metadata[layer_name];
            ["name", "short_description", "long_description"].forEach(field => {
                if (this.search_match(search_text, metadata[field])) {
                    if (!matching_layers.includes(layer_name)) {
                        matching_layers.push(layer_name);
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
            for (let idx = 0; idx < matching_layers.length; idx++) {
                let layer_name = matching_layers[idx];
                let li = document.createElement("li");
                let a = document.createElement("a");
                a.setAttribute("class", "search_link");
                let p = document.createElement("p");
                let txt = document.createTextNode(this.layer_metadata[layer_name].name);
                li.appendChild(a);
                a.appendChild(txt);
                let desc_txt = document.createTextNode(this.layer_metadata[layer_name].short_description);
                p.appendChild(desc_txt);
                li.appendChild(p);
                a.addEventListener("click", this.make_add_layer_callback(layer_name));
                ul.appendChild(li);
            }
        }
    }

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

    add_time_slider() {
        if (this.slider) {
            this.remove_time_slider();
        }
        $("#slider_div").get(0).innerHTML = "";
        this.slider = new TimeSlider("slider_div", this.start_date, this.end_date, "daily");
        window.addEventListener("resize", (evt) => {
            this.slider.resize();
        });
        this.slider.addEventListener("change", async (evt) => {
            this.view_date = evt.target.value;
            await this.update_view_date();
            this.update_history();
        });
    }

    remove_time_slider() {
        document.getElementById("slider_div").innerHTML = "";
        this.slider = null;
    }

}






