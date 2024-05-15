
var time_slider_base_url = document.currentScript.src.split("/").slice(0,-1).join("/");

class TimeSlider {

    constructor(parent_id, start_date, end_date, step) {
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
        this.slide_container.appendChild(this.slider_div);
        this.scale_div = document.createElement("div");
        this.slide_container.appendChild(this.scale_div);
        this.event_handlers = {};
        this.start_date = start_date;
        this.end_date = end_date;
        this.step = step;

        this.width = 100;
        this.current_value = end_date;
        this.slider.addEventListener("change", (evt) => {
            let frac = Number.parseFloat(evt.target.value);
            const t1 = this.start_date.getTime();
            const t2 = this.end_date.getTime();
            let t3 = t1 + (frac*(t2-t1));
            let new_dt = new Date(t3);
            if (this.step === "monthly") {
                new_dt.setDate(15); // mid month
            }
            if (this.step === "yearly") {
                // set to 1st July
                new_dt.setMonth(6);
                new_dt.setDate(1);
            }
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
        switch(this.step) {
            case "daily":
                var d = new Date(this.current_value);
                d.setDate(d.getDate() + nr_steps);
                if (d >= this.start_date && d <= this.end_date) {
                    this.value = d;
                }
                break;
            case "monthly":
                var d = new Date(this.current_value);
                d.setMonth(d.getMonth()+nr_steps);
                if (d >= this.start_date && d <= this.end_date) {
                    this.value = d;
                }
                break;
            case "yearly":
                var d = new Date(this.current_value);
                let year = d.getFullYear();
                year += nr_steps;
                d = new Date(year,d.getMonth(),d.getDate(),12,0,0);
                if (d >= this.start_date && d <= this.end_date) {
                    this.value = d;
                }
                break;
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
        this.draw_scale();
    }

    draw_scale() {
        this.scale_div.innerHTML = "";
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("height","50");
        this.canvas.setAttribute("width",this.width);
        this.scale_div.appendChild(this.canvas);
        let ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.canvas.width, 5);
        const t1 = this.start_date.getTime();
        const t2 = this.end_date.getTime();
        let start_year = this.start_date.getFullYear();
        let end_year = this.end_date.getFullYear();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.lineCap = "square";
        let last_x = 0;
        let last_text_x = -20;
        const label_gap = 40;
        for (var year = start_year; year <= (end_year+1); year += 1) {
            let dt = new Date(year, 0, 1);
            let frac = (dt.getTime() - t1) / (t2 - t1);
            let x = frac * this.canvas.width;
            if (frac >= 0 && frac <= 1) {
                ctx.beginPath();
                ctx.moveTo(x, 5);
                ctx.lineTo(x, 10);
                ctx.stroke();
            }
            if (last_x === null) {
                last_x = x;
            } else {
                let mid_x = (x + last_x) / 2;
                if (mid_x - last_text_x > label_gap) {
                    ctx.font = "12px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText("" + (year-1), mid_x, 15);
                    last_text_x = mid_x;
                }
                last_x = x;
            }
        }
    }
}

