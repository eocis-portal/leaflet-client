


class DataViewer {

    constructor(point_service_base_url) {
        this.point_service_base_url = point_service_base_url;
        this.container = $('#popup');
        this.layers = $("#layers");

        this.start_date = new Date(2021, 0, 1);
        this.view_date = new Date(2021, 11, 31);
        this.end_date = new Date(2021, 11, 31);

        this.current_projection = "EPSG:4326";

        this.opacity_control = $("#opacity_control");
        if (this.opacity_control) {
            this.opacity_control.on("change", (ev) => {
                let opacity_fraction = Number.parseFloat(this.opacity_control.value);
                this.update_opacity(opacity_fraction);
            });
        }

        this.current_layer_name = null;
        this.current_layer = null;
        this.current_popup_coordinate = null;
        this.slider = null;

        this.map = L.map('map', {
            center: [0,0],
            zoom: 3,
            crs: L.CRS.EPSG4326
        });

        var wmsLayer = L.tileLayer.wms('https://ows.terrestris.de/osm/service?', {layers: 'OSM-WMS'}).addTo(this.map);

        // var wmsLayer = L.tileLayer.wms('http://ows.mundialis.de/services/service?', {layers: 'TOPO-OSM-WMS'}).addTo(this.map);

        /**
         * Add a click handler to the map to render the popup.
         */
        /* this.map.on('singleclick', function (evt) {
            this.current_popup_coordinate = evt.coordinate;
            this.update_popup();
        }); */

        this.closer = $("#popup-closer");
        this.closer.onclick = function () {
            this.current_popup_coordinate = null;
            this.overlay.setPosition(undefined);
            this.closer.blur();
            return false;
        };


        this.search_results_modal = new bootstrap.Modal($('#search_results_modal').get(0), {
            keyboard: false
        });

        this.info_modal = new bootstrap.Modal($('#info_modal').get(0), {
            keyboard: false
        });

        this.bind();
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
        let start = layer_metadata[layer_name].start_date;
        let end = layer_metadata[layer_name].end_date;

        if (start == "") {
            this.start_date = null;
            this.end_date = null;
            this.view_date = null;
        } else {
            this.start_date = new Date(Date.parse(start));
            this.end_date = new Date(Date.parse(end));
            this.view_date = new Date(Date.parse(end));
            this.update_view_date();
        }
    }

    update_view_date() {
        if (this.current_layer) {
            this.current_layer.getSource().updateParams({'TIME': this.view_date.toISOString().slice(0, 10)});
        }
        if (this.current_popup_coordinate) {
            update_popup();
        }
    }

    update_opacity(opacity_fraction) {
        this.current_layer.setOpacity(opacity_fraction);
    }

    change_map_projection(new_projection) {

    }

    clear_layer() {
        if (this.current_layer != null) {
            // this.map.removeLayer(this.current_layer);
            this.current_layer = null;
            this.remove_time_slider();
            this.current_popup_coordinate = null;
            $("layers").setAttribute("style", "display:none;");
        }
    }

    make_colour_entry(col) {
        let elt = document.createElement("span");
        elt.appendChild(document.createTextNode("\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
        elt.style.background = col;
        return elt;
    }

    select_layer(layer_name) {

        if (layer_name === this.current_layer_name) {
            return;
        }
        if (this.current_layer != null) {
            // this.map.removeLayer(this.current_layer);
        }

        this.set_date_range(layer_name);
        $("layer_title").value = layer_metadata[layer_name].name;

        const url = new URL(window.location);
        url.searchParams.set("layer", layer_name);
        history.pushState({"layer": layer_name}, "", url);

        this.current_popup_coordinate = null;

        let wms_params = {'LAYERS': layer_name, 'format':"image/png", 'version':'1.3.0'}
        let metadata = layer_metadata[layer_name];

        if (this.view_date) {
            this.add_time_slider(metadata.step);
            wms_params['TIME'] = this.view_date.toISOString();
        } else {
            this.remove_time_slider();
        }

        this.current_layer = L.tileLayer.wms('https://eocis.org/wms', wms_params).addTo(this.map);

        this.current_layer_name = layer_name;

        if ("lat" in metadata && "lon" in metadata && "zoom" in metadata) {
            // this.map.getView().animate({zoom: metadata.zoom, center: [metadata.lon, metadata.lat]});
        }
        // this.map.addLayer(window.current_layer);
        // const resolution = this.map.getView().getResolution();
/*
        const legend_img = $('legend');
        const legend_table_div = $('legend_table_div');

        if (metadata.legend === "wms") {
            const graphicUrl = wms_src.getLegendUrl(resolution);
            legend_table_div.style.display = "none";
            legend_img.style.display = "inline";
            legend_img.src = graphicUrl;
        } else if (metadata.legend === "table") {
            const legend_table = document.getElementById('legend_table');
            legend_img.style.display = "none";
            legend_table.innerHTML = "";
            legend_table_div.style.display = "block";
            let classes = metadata.legend_classes.split(" ");
            let colors = metadata.legend_colors.split(" ");
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
        } */

        let long_description = metadata.long_description;
        const info = $('layer_info');
        info.innerHTML = long_description;
        // this.layers.style.display = "block";
        // this.change_map_projection(metadata.projection);
    }

    update_popup() {
        if (this.current_popup_coordinate == null) {
            return;
        }
        let lon = this.current_popup_coordinate[0];
        let lat = this.current_popup_coordinate[1];
        let url = "";
        if (this.view_date) {
            let dt_s = this.view_date.toISOString().split('T')[0];
            url = this.point_service_base_url + "/" + this.current_layer_name + "/" + lat + ":" + lon + "/" + dt_s;
        } else {
            url = this.point_service_base_url + "/" + this.current_layer_name + "/" + lat + ":" + lon;
        }
        fetch(url).then(r => r.text(), e => {
            console.error(e);
        }).then(t => {
            let data = JSON.parse(t);
            let html = "";
            let location = data["location"];
            if (!("value" in data) && !("category" in data)) {
                html = "<p></p><p>" + location + "</p><p>No Data</p>";
            } else {
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
                html = "<p></p></p><p>" + location + "</p><p>" + text + "</p>";
            }
            $("popup-content-value").innerHTML = html;
            this.overlay.setPosition(this.current_popup_coordinate);
        }, e => {
            console.error(e)
        });
    }

    search_match(search_text, searchable_text) {
        return (searchable_text.toLowerCase().search(search_text.toLowerCase()) != -1);
    }

    make_select_layer_callback(layer_name) {
        return (ev) => {
            this.select_layer(layer_name);
            this.search_results_modal.hide();
        }
    }

    run_search(search_text) {
        alert("run_search");
        let matching_layers = [];
        for (let layer_name in layer_metadata) {
            let metadata = layer_metadata[layer_name];
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
                let txt = document.createTextNode(layer_metadata[layer_name].name);
                li.appendChild(a);
                a.appendChild(txt);
                let desc_txt = document.createTextNode(layer_metadata[layer_name].short_description);
                p.appendChild(desc_txt);
                li.appendChild(p);
                a.addEventListener("click", this.make_select_layer_callback(layer_name));
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

        $("#info_btn").on("click",
            (evt) => {
                this.info_modal.show();
                ev.preventDefault();
                ev.stopPropagation();
            });
    }

    add_time_slider(step) {
        $("#slider_div").get(0).innerHTML = "";
        this.slider = new TimeSlider("slider_div", this.start_date, this.end_date, step);
        window.addEventListener("resize", (evt) => {
            this.slider.resize();
        });
        this.slider.addEventListener("change", (evt) => {
            this.view_date = evt.target.value;
            this.update_view_date();
        });
    }

    remove_time_slider() {
        document.getElementById("slider_div").innerHTML = "";
    }
}




