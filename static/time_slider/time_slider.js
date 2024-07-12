
var time_slider_base_url = document.currentScript.src.split("/").slice(0,-1).join("/");

class TimeSlider {

    constructor(parent_id, start_date, end_date) {
        this.parent = document.getElementById(parent_id);
        this.dec_btn = document.createElement("button");
        this.dec_btn_image = document.createElement("img");
        this.dec_btn_image.setAttribute("src",time_slider_base_url+"/images/chevron_left_FILL0_wght400_GRAD0_opsz24.svg");
        this.dec_btn.appendChild(this.dec_btn_image);
        this.parent.appendChild(this.dec_btn);
        this.date_input = document.createElement("input");
        this.date_input.setAttribute("type","date");
        this.date_input.setAttribute("min",start_date.toISOString().slice(0,10));
        this.date_input.setAttribute("max",end_date.toISOString().slice(0,10));
        this.date_input.setAttribute("value",end_date.toISOString().slice(0,10));
        this.parent.appendChild(this.date_input);
        this.inc_btn = document.createElement("button");
        this.inc_btn_image = document.createElement("img");
        this.inc_btn_image.setAttribute("src",time_slider_base_url+"/images/chevron_right_FILL0_wght400_GRAD0_opsz24.svg");
        this.inc_btn.appendChild(this.inc_btn_image);
        this.parent.appendChild(this.inc_btn);
        this.slide_container = document.createElement("div");
        this.slide_container.setAttribute("class","slide_container");
        this.parent.appendChild(this.slide_container);
        this.slider_div = document.createElement("div");
        this.slider = document.createElement("input");
        this.slider.setAttribute("id","time_slider_range");
        this.slider.setAttribute("type","range");
        this.slider.setAttribute("min","0");
        this.slider.setAttribute("max", "1");
        this.slider.setAttribute("step", "0.0000001");
        this.slider_div.appendChild(this.slider);
        this.datalist = document.createElement("datalist");
        this.datalist.setAttribute("id","date_values");
        this.slider_div.appendChild(this.datalist);
        this.slider.setAttribute("list","date_values");
        this.slide_container.appendChild(this.slider_div);

        this.event_handlers = {};
        this.start_date = start_date;
        this.end_date = end_date;

        let start_year = 1900+this.start_date.getYear();
        let end_year = 1900+this.end_date.getYear();

        for(let year=start_year; year <= end_year; year+=1) {
            const t1 = this.start_date.getTime();
            const t2 = this.end_date.getTime();
            const t3 = new Date(year+"-01-01").getTime();
            if (t3 >= t1 && t3 <= t2) {
                let v = (t3-t1)/(t2-t1);
                let option = document.createElement("option");
                option.setAttribute("value",""+v);
                option.setAttribute("label",""+year);
                this.datalist.appendChild(option);
            }
        }

        this.width = 100;
        this.current_value = end_date;
        this.slider.addEventListener("change", (evt) => {
            let frac = Number.parseFloat(evt.target.value);
            const t1 = this.start_date.getTime();
            const t2 = this.end_date.getTime();
            let t3 = t1 + (frac*(t2-t1));
            let new_dt = new Date(t3);
            new_dt.setHours(12, 0, 0, 0);
            this.value = new_dt;
        });
        this.dec_btn.addEventListener("click", (evt) => {
            this.adjust(-1);
        });
        this.inc_btn.addEventListener("click", (evt) => {
            this.adjust(1);
        });
        this.date_input.addEventListener("change", (evt) => {
            this.value = new Date(evt.target.value);
        });

        this.canvas = undefined;
        window.setTimeout(() => { this.resize(); },100);
    }

    adjust(nr_steps) {
        var d = new Date(this.current_value);
        d.setDate(d.getDate() + nr_steps);
        if (d >= this.start_date && d <= this.end_date) {
            this.value = d;
        }
    }

    set value(v) {
        const t1 = this.start_date.getTime();
        const t2 = this.end_date.getTime();
        const t3 = v.getTime();
        if (t3 < t1) {
            this.slider.value = 0;
            this.current_value = new Date(t1);
        } else if (t3 > t2) {
            this.slider.value = 1;
            this.current_value = new Date(t2);
        } else {
            this.slider.value = (t3-t1)/(t2-t1);
            this.current_value = new Date(t3);
        }
        this.date_input.value = this.current_value.toISOString().slice(0,10);
        this.fireEvent("change");
    }

    get value() {
        return this.current_value;
    }

    addEventListener(event_type, handler) {
        if (!(event_type in this.event_handlers)) {
            this.event_handlers[event_type] = [];
        }
        this.event_handlers[event_type].push(handler);
    }

    fireEvent(event_type) {
        if (event_type in this.event_handlers) {
            this.event_handlers[event_type].forEach((handler) => {
                handler({"target":this});
            });
        }
    }

    resize() {
        if (this.canvas) {
            this.scale_div.removeChild(this.canvas);
            this.canvas = null;
        }
        let r = this.slide_container.getBoundingClientRect();
        this.width = r.width;
        console.log("resize:"+this.width);
    }

}

