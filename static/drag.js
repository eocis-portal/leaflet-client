

function setup_drag(elt, header_elt) {
  var startx, starty, dx, dy;

  var top = elt.offsetTop - 180;
  var left = elt.offsetLeft;

  header_elt.onmousedown = start_drag;

  function start_drag(e) {
    e.preventDefault();
    startx = e.clientX;
    starty = e.clientY;
    document.onmouseup = close_drag;
    document.onmousemove = move_drag;
  }

  function move_drag(e) {
    e.preventDefault();

    dx = startx - e.clientX;
    dy = starty - e.clientY;
    startx = e.clientX;
    starty = e.clientY;

    top = top - dy;
    left = left - dx;

    elt.style.top = top + "px";
    elt.style.left = left + "px";
  }

  function close_drag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

