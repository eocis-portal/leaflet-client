
var map = null;
var popup = null;


class DataViewer {

    constructor(base_wms_url, point_service_base_url, metadata_url) {
        this.base_wms_url = base_wms_url;
        this.point_service_base_url = point_service_base_url;
        this.metadata_url = metadata_url;

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
        await fetch(this.metadata_url).then(
            r => r.json()
        ).then(
            o => {
                this.layer_metadata = o
            }
        );

        for (var layer_name in this.layer_metadata) {
            this.projection = this.layer_metadata[layer_name].projection;
            if (this.projection) {
                break;
            }
        }

        if (this.projection === "EPSG:4326") {
            this.crs = L.CRS.EPSG4326;
            this.bounds = [[-180,-90],[180,90]];
            this.center = [0,0];
        } else {
            if ((!this.projection in custom_crs)) {
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

            this.center = [51,-1];

        }

        // Initialize the map.
        const mapOptions = {
            crs: this.crs,
            minZoom: 0,
            maxZoom: 9,
            center: this.center,
            zoom: 3,
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

        this.explore_datasets_modal = new bootstrap.Modal($('#explore_datasets_modal').get(0), {
            keyboard: false
        });

        this.bind();

        setup_drag(document.getElementById("layers"),document.getElementById("layers_header"));

        document.getElementById("layers_close_btn").addEventListener("click", (evt) => {
            document.getElementById("layers").style.display = "none";
        });

        document.getElementById("layers_open_btn").addEventListener("click", (evt) => {
            document.getElementById("layers").style.display = "block";
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
        if (sp.has("layer")) {
            let names = sp.get("layer");
            if (names) {
                names = names.split(",");
                this.select_layers(names);
            }
        }

        window.addEventListener("popstate", (evt) => {
            if (history.state.layer) {
                let names = history.state.layer.split(",");
                this.clear_layers();
                this.select_layers(names);
            } else {
                this.clear_layers();
            }
        });
    }

    update_history() {
        const url = new URL(window.location);
        url.searchParams.set("layer", this.current_layer_names.join(","));
        history.pushState({"layer": this.current_layer_names.join(",")}, "", url);
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
            let start_date = new Date(Date.parse(start));
            let end_date = new Date(Date.parse(end));

            if (this.start_date === null || start_date >= this.start_date) {
                this.start_date = start_date;
            }
            if (this.end_date === null || end_date <= this.end_date) {
                this.end_date = end_date;
            }
            if (this.view_date === null || this.view_date > this.end_date) {
                this.view_date = this.end_date;
            }
            if (this.view_date === null || this.view_date < this.start_date) {
                this.view_date = this.start_date;
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
        for(let layer_name in this.current_layers) {
            let layer_metadata = this.layer_metadata[layer_name];
            if (layer_metadata.start_date !== "") {
                has_times = true;
            }
        }
        this.remove_time_slider();
        if (has_times) {
            // set the start_date and end_date to the intersection of layer ranges
            // if the view date lies outside the start/end range, set it to the start or end (whichever is closest)
            let old_view_date = this.view_date;
            for(let layer_name in this.current_layers) {
                this.set_date_range(layer_name);
            }
            this.add_time_slider();
            if (old_view_date !== this.view_date) {
                this.update_view_date();
            }
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
        return this.base_wms_url+"?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&LAYER="+layer_name+"&SCALE=841.4360508601347";
    }

    add_layer(layer_name) {

        if (layer_name in this.current_layers) {
            return; // layer is already included in display, do nothing
        }

        let layer_metadata = this.layer_metadata[layer_name];

        map.closePopup();

        if (this.popup_latlng != null) {
            this.popup_latlng = null;
        }

        $("layer_title").value = layer_metadata.name;

        this.current_popup_coordinate = null;

        let wms_params = {'LAYERS': layer_metadata.layer, 'format':"image/png", 'version':'1.3.0'}

        this.current_layers[layer_name] = L.tileLayer.wms(this.base_wms_url, wms_params).addTo(map);
        this.current_layer_names.push(layer_name);

        let long_description = layer_metadata.long_description;
        const info = $('layer_info');
        info.innerHTML = long_description;
        this.layer_controls[layer_name] = this.add_layer_controls(layer_name, layer_metadata);
        this.update_time_controls();
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
        add_spacer(d);

        const legend_table_div = document.getElementById('legend_table_div');

        if (layer_metadata.legend === "wms") {
            let url = this.get_legend_url(layer_metadata.layer);
            let legend_img = document.createElement("img");
            legend_img.setAttribute("class","legend");
            legend_img.style.display = "inline";
            legend_img.setAttribute("src", url);
            d.appendChild(legend_img);
        } else if (layer_metadata.legend === "table") {
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

        opacity_control.addEventListener("change", this.create_opacity_callback(layer_name));

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
        d.appendChild(remove_button);
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
            let layer = this.layer_metadata[layer_name].layer;
            let name = this.layer_metadata[layer_name].name;
            let url = "";
            if (this.view_date) {
                let dt_s = this.view_date.toISOString().split('T')[0];
                url = this.point_service_base_url + "/" + layer + "/" + lat + ":" + lon + "/" + dt_s;
            } else {
                url = this.point_service_base_url + "/" + layer + "/" + lat + ":" + lon;
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

    run_explore() {

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
                this.run_explore();
            } catch (e) {
                console.error(e);
            }
            this.explore_datasets_modal.show();
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
        });
    }

    remove_time_slider() {
        document.getElementById("slider_div").innerHTML = "";
        this.slider = null;
    }

}






