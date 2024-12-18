function calculate() {
    // Get old values
    let old_tireWidth = parseFloat(document.getElementById('old_tireWidth').value);
    let old_aspectRatio = parseFloat(document.getElementById('old_aspectRatio').value);
    let old_wheelDiameter = parseFloat(document.getElementById('old_wheelDiameter').value);
    let old_wheelWidth = parseFloat(document.getElementById('old_wheelWidth').value);
    let old_offset = parseFloat(document.getElementById('old_offset').value);

    // Get new values
    let new_tireWidth = parseFloat(document.getElementById('new_tireWidth').value);
    let new_aspectRatio = parseFloat(document.getElementById('new_aspectRatio').value);
    let new_wheelDiameter = parseFloat(document.getElementById('new_wheelDiameter').value);
    let new_wheelWidth = parseFloat(document.getElementById('new_wheelWidth').value);
    let new_offset = parseFloat(document.getElementById('new_offset').value);

    // Calculate old tire sidewall and diameter
    let old_sidewall = old_tireWidth * (old_aspectRatio / 100);
    let old_diameter = (old_wheelDiameter * 25.4) + (2 * old_sidewall);
    let old_circumference = Math.PI * old_diameter;

    // Calculate new tire sidewall and diameter
    let new_sidewall = new_tireWidth * (new_aspectRatio / 100);
    let new_diameter = (new_wheelDiameter * 25.4) + (2 * new_sidewall);
    let new_circumference = Math.PI * new_diameter;

    // Convert wheel widths to mm
    let old_wheelWidth_mm = old_wheelWidth * 25.4;
    let new_wheelWidth_mm = new_wheelWidth * 25.4;

    // Calculate poke and inset
    let old_poke = ((old_wheelWidth_mm / 2) - old_offset);
    let old_inset = ((old_wheelWidth_mm / 2) + old_offset);

    let new_poke = ((new_wheelWidth_mm / 2) - new_offset);
    let new_inset = ((new_wheelWidth_mm / 2) + new_offset);

    // Speedometer error
    let speedo_error_ratio = (old_circumference - new_circumference) / old_circumference;
    let speedo_error_pct = (speedo_error_ratio * 100).toFixed(2);

    // Speed readouts
    let readAt30 = 30 * (old_circumference / new_circumference);
    let readAt60 = 60 * (old_circumference / new_circumference);

    // Update Results Table
    document.getElementById('res_oldDiameter').innerText = old_diameter.toFixed(1) + " mm";
    document.getElementById('res_newDiameter').innerText = new_diameter.toFixed(1) + " mm";
    document.getElementById('res_oldCirc').innerText = old_circumference.toFixed(1) + " mm";
    document.getElementById('res_newCirc').innerText = new_circumference.toFixed(1) + " mm";
    document.getElementById('res_oldPoke').innerText = old_poke.toFixed(1) + " mm";
    document.getElementById('res_newPoke').innerText = new_poke.toFixed(1) + " mm";
    document.getElementById('res_oldInset').innerText = old_inset.toFixed(1) + " mm";
    document.getElementById('res_newInset').innerText = new_inset.toFixed(1) + " mm";
    document.getElementById('res_speedoError').innerText = speedo_error_pct + "% (Speedometer error)";

    document.getElementById('res_30new').innerText = readAt30.toFixed(2) + " mph";
    document.getElementById('res_60new').innerText = readAt60.toFixed(2) + " mph";

    // Show results
    document.getElementById('results').style.display = 'block';

    // Show Diagram
    drawDiagram(
      old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
      new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
    );
}

function drawDiagram(
    old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
    new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
) {
    // Clear previous diagram
    const svg = document.getElementById('diagram');
    svg.innerHTML = '';

    document.getElementById('diagram-container').style.display = 'block';

    // Unified scale factor for both width and height for proportional representation
    const scale = 0.2;  // Adjust this if needed for better visualization

    const SVG_WIDTH = 600;
    const SVG_HEIGHT = 300;

    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;

    // Centers (hub line is centerX)
    const old_center = centerX - (old_offset * scale);
    const new_center = centerX - (new_offset * scale);

    // Tire dimensions in pixels
    let old_tire_width_px = old_tireWidth * scale;
    let old_tire_height_px = old_diameter * scale;

    let new_tire_width_px = new_tireWidth * scale;
    let new_tire_height_px = new_diameter * scale;

    // Wheel (rim) dimensions in pixels
    let old_rim_width_px = old_wheelWidth_mm * scale;
    let old_rim_height_px = (old_wheelDiameter * 25.4) * scale;

    let new_rim_width_px = new_wheelWidth_mm * scale;
    let new_rim_height_px = (new_wheelDiameter * 25.4) * scale;

    // Suspension stylization
    drawSuspension(svg, centerX, centerY);

    // Hub line
    let hubLine = createSVGElement('line', {
        x1: centerX, y1: 0,
        x2: centerX, y2: SVG_HEIGHT,
        stroke: '#333', 'stroke-width': '2'
    });
    svg.appendChild(hubLine);

    // Lug studs near hub line (just small circles)
    for (let i = -1; i <= 1; i++) {
        let lug = createSVGElement('circle', {
            cx: centerX,
            cy: centerY + i * 10,
            r: 2,
            fill: '#333'
        });
        svg.appendChild(lug);
    }

    // Draw OLD rim rectangle (black, dashed)
    let oldRimRect = createSVGElement('rect', {
        x: old_center - (old_rim_width_px / 2),
        y: centerY - (old_rim_height_px / 2),
        width: old_rim_width_px,
        height: old_rim_height_px,
        fill: 'none',
        stroke: 'black',
        'stroke-width': '1',
        'stroke-dasharray': '3 2'
    });
    svg.appendChild(oldRimRect);

    // Draw OLD tire top and bottom lines (no vertical lines)
    let oldTireTopLine = createSVGElement('line', {
        x1: old_center - (old_tire_width_px / 2),
        y1: centerY - (old_tire_height_px / 2),
        x2: old_center + (old_tire_width_px / 2),
        y2: centerY - (old_tire_height_px / 2),
        stroke: 'black',
        'stroke-width': '2'
    });
    svg.appendChild(oldTireTopLine);

    let oldTireBottomLine = createSVGElement('line', {
        x1: old_center - (old_tire_width_px / 2),
        y1: centerY + (old_tire_height_px / 2),
        x2: old_center + (old_tire_width_px / 2),
        y2: centerY + (old_tire_height_px / 2),
        stroke: 'black',
        'stroke-width': '2'
    });
    svg.appendChild(oldTireBottomLine);

    // Draw sidewalls for OLD (lines connecting rim to tire at top & bottom)
    drawSidewalls(svg, old_center, centerY, old_tire_width_px, old_tire_height_px, old_rim_width_px, old_rim_height_px, 'black');

    // Draw NEW rim rectangle (orange, dashed)
    let newRimRect = createSVGElement('rect', {
        x: new_center - (new_rim_width_px / 2),
        y: centerY - (new_rim_height_px / 2),
        width: new_rim_width_px,
        height: new_rim_height_px,
        fill: 'none',
        stroke: 'orange',
        'stroke-width': '1',
        'stroke-dasharray': '3 2'
    });
    svg.appendChild(newRimRect);

    // Draw NEW tire top and bottom lines (no vertical lines)
    let newTireTopLine = createSVGElement('line', {
        x1: new_center - (new_tire_width_px / 2),
        y1: centerY - (new_tire_height_px / 2),
        x2: new_center + (new_tire_width_px / 2),
        y2: centerY - (new_tire_height_px / 2),
        stroke: 'orange',
        'stroke-width': '2'
    });
    svg.appendChild(newTireTopLine);

    let newTireBottomLine = createSVGElement('line', {
        x1: new_center - (new_tire_width_px / 2),
        y1: centerY + (new_tire_height_px / 2),
        x2: new_center + (new_tire_width_px / 2),
        y2: centerY + (new_tire_height_px / 2),
        stroke: 'orange',
        'stroke-width': '2'
    });
    svg.appendChild(newTireBottomLine);

    // Draw sidewalls for NEW (lines connecting rim to tire at top & bottom)
    drawSidewalls(svg, new_center, centerY, new_tire_width_px, new_tire_height_px, new_rim_width_px, new_rim_height_px, 'orange');
}

function drawSidewalls(svg, centerX, centerY, tireW, tireH, rimW, rimH, color) {
    // Top sidewalls
    // Left top sidewall
    let leftTopSidewall = createSVGElement('line', {
        x1: centerX - (rimW / 2),
        y1: centerY - (rimH / 2),
        x2: centerX - (tireW / 2),
        y2: centerY - (tireH / 2),
        stroke: color,
        'stroke-width': '2'
    });
    svg.appendChild(leftTopSidewall);

    // Right top sidewall
    let rightTopSidewall = createSVGElement('line', {
        x1: centerX + (rimW / 2),
        y1: centerY - (rimH / 2),
        x2: centerX + (tireW / 2),
        y2: centerY - (tireH / 2),
        stroke: color,
        'stroke-width': '2'
    });
    svg.appendChild(rightTopSidewall);

    // Bottom sidewalls
    // Left bottom sidewall
    let leftBottomSidewall = createSVGElement('line', {
        x1: centerX - (rimW / 2),
        y1: centerY + (rimH / 2),
        x2: centerX - (tireW / 2),
        y2: centerY + (tireH / 2),
        stroke: color,
        'stroke-width': '2'
    });
    svg.appendChild(leftBottomSidewall);

    // Right bottom sidewall
    let rightBottomSidewall = createSVGElement('line', {
        x1: centerX + (rimW / 2),
        y1: centerY + (rimH / 2),
        x2: centerX + (tireW / 2),
        y2: centerY + (tireH / 2),
        stroke: color,
        'stroke-width': '2'
    });
    svg.appendChild(rightBottomSidewall);
}

function drawSuspension(svg, centerX, centerY) {
    // Simple stylized suspension:
    const coiloverX = centerX - 150;
    const coiloverY = centerY - 60;

    // Coilover main line
    let coiloverLine = createSVGElement('line', {
      x1: coiloverX, y1: coiloverY - 20,
      x2: coiloverX + 20, y2: coiloverY + 20,
      stroke: '#555', 'stroke-width': '4'
    });
    svg.appendChild(coiloverLine);

    // Coil (just a few arcs)
    for (let i = 0; i < 3; i++) {
      let coilArc = createSVGElement('path', {
        d: `M ${coiloverX} ${coiloverY + i*10} C ${coiloverX+10} ${coiloverY + i*10 -5}, ${coiloverX+10} ${coiloverY + i*10 +5}, ${coiloverX+20} ${coiloverY + i*10}`,
        stroke: '#888', 'stroke-width': '2', fill: 'none'
      });
      svg.appendChild(coilArc);
    }

    // Knuckle: line from hub center to coilover
    let knuckle = createSVGElement('line', {
      x1: centerX, y1: centerY,
      x2: coiloverX+20, y2: coiloverY+20,
      stroke: '#444', 'stroke-width': '3'
    });
    svg.appendChild(knuckle);

    // Lower control arm: line below hub
    let armX = centerX - 100;
    let armY = centerY + 40;
    let controlArm = createSVGElement('line', {
      x1: armX, y1: armY,
      x2: centerX, y2: centerY,
      stroke: '#444', 'stroke-width': '3'
    });
    svg.appendChild(controlArm);

    // Axle: horizontal line at hub height
    let axle = createSVGElement('line', {
      x1: centerX - 80, y1: centerY,
      x2: centerX + 80, y2: centerY,
      stroke: '#444', 'stroke-width': '2',
      'stroke-dasharray': '2 2'
    });
    svg.appendChild(axle);
}

function createSVGElement(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
    return el;
}
