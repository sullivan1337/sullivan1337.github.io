/***********************************************************
 * script.js
 * Combines your existing calculation logic with an updated
 * drawDiagram that supports an optional "fender" arc.
 ***********************************************************/

/**
 * Main calculation and UI update function
 */
function calculate() {
    // Get old wheel/tire values from the form
    let old_tireWidth = parseFloat(document.getElementById('old_tireWidth').value);
    let old_aspectRatio = parseFloat(document.getElementById('old_aspectRatio').value);
    let old_wheelDiameter = parseFloat(document.getElementById('old_wheelDiameter').value);
    let old_wheelWidth = parseFloat(document.getElementById('old_wheelWidth').value);
    let old_offset = parseFloat(document.getElementById('old_offset').value);
  
    // Get new wheel/tire values from the form
    let new_tireWidth = parseFloat(document.getElementById('new_tireWidth').value);
    let new_aspectRatio = parseFloat(document.getElementById('new_aspectRatio').value);
    let new_wheelDiameter = parseFloat(document.getElementById('new_wheelDiameter').value);
    let new_wheelWidth = parseFloat(document.getElementById('new_wheelWidth').value);
    let new_offset = parseFloat(document.getElementById('new_offset').value);
  
    // Validate numeric inputs
    if (
      isNaN(old_tireWidth) || isNaN(old_aspectRatio) || isNaN(old_wheelDiameter) ||
      isNaN(old_wheelWidth) || isNaN(old_offset) ||
      isNaN(new_tireWidth) || isNaN(new_aspectRatio) || isNaN(new_wheelDiameter) ||
      isNaN(new_wheelWidth) || isNaN(new_offset)
    ) {
      alert('Please ensure all fields are filled with valid numbers.');
      return;
    }
  
    // Calculate old tire sidewall, diameter, circumference
    let old_sidewall = old_tireWidth * (old_aspectRatio / 100);
    let old_diameter = (old_wheelDiameter * 25.4) + (2 * old_sidewall);
    let old_circumference = Math.PI * old_diameter;
  
    // Calculate new tire sidewall, diameter, circumference
    let new_sidewall = new_tireWidth * (new_aspectRatio / 100);
    let new_diameter = (new_wheelDiameter * 25.4) + (2 * new_sidewall);
    let new_circumference = Math.PI * new_diameter;
  
    // Convert wheel widths from inches to mm
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
  
    // Speed readouts (compare old circumference vs new)
    let readAt30 = 30 * (old_circumference / new_circumference);
    let readAt60 = 60 * (old_circumference / new_circumference);
  
    // Update results table
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
  
    // Show the results container
    document.getElementById('results').style.display = 'block';
  
    // Now draw the diagram (no static vertical line)
    drawDiagram(
      old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
      new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
    );
  }
  
  /**
   * Draw our updated diagram in the <svg> with id="diagram"
   *   - No static vertical hub line
   *   - Optionally draws a "fender" if the user has "Show Fender?" checked
   */
  function drawDiagram(
    old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
    new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
  ) {
    // Clear previous diagram
    const svg = document.getElementById('diagram');
    svg.innerHTML = '';
  
    // Make sure diagram container is visible
    document.getElementById('diagram-container').style.display = 'block';
  
    // Determine final SVG width/height (or fallback if 0)
    const container = document.getElementById('diagram-container');
    const SVG_WIDTH = 600;
    const SVG_HEIGHT = 400;
  
    // Set our <svg> dimensions
    svg.setAttribute('width', SVG_WIDTH);
    svg.setAttribute('height', SVG_HEIGHT);
  
    // A scale factor so your parts don't go offscreen
    const scale = Math.min(SVG_WIDTH, SVG_HEIGHT) / 750;
  
    // The center of our coordinate system
    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;
  
    // Convert mm to pixel space
    const old_centerX = centerX - (old_offset * scale);
    const new_centerX = centerX - (new_offset * scale);
  
    const old_tireWidth_px  = old_tireWidth * scale;
    const old_tireHeight_px = old_diameter * scale;
    const old_rimWidth_px   = old_wheelWidth_mm * scale;
    const old_rimHeight_px  = (old_wheelDiameter * 25.4) * scale;
  
    const new_tireWidth_px  = new_tireWidth * scale;
    const new_tireHeight_px = new_diameter * scale;
    const new_rimWidth_px   = new_wheelWidth_mm * scale;
    const new_rimHeight_px  = (new_wheelDiameter * 25.4) * scale;
  
    // 1) Draw suspension / arms / coilover (minus vertical hub line)
    drawSuspension(svg, centerX, centerY, SVG_WIDTH, SVG_HEIGHT);
  
    // 2) Draw some lug circles near the hub center
    //    (Spacing them by 10 px up/down from center)
    for (let i = -1; i <= 1; i++) {
      const lug = createSVGElement('circle', {
        cx: centerX,
        cy: centerY + i * 10,
        r: 2,
        fill: '#333'
      });
      svg.appendChild(lug);
    }
  
    // 3) Draw "old" setup in Blue
    drawWheelAndTire(
      svg,
      old_centerX, centerY,
      old_rimWidth_px, old_rimHeight_px,
      old_tireWidth_px, old_tireHeight_px,
      '#0078d4'  // or "blue"
    );
  
    // 4) Draw "new" setup in Orange
    drawWheelAndTire(
      svg,
      new_centerX, centerY,
      new_rimWidth_px, new_rimHeight_px,
      new_tireWidth_px, new_tireHeight_px,
      '#ff5722'  // or "orange"
    );
  
    // 5) Draw optional Fender if "Show Fender?" is checked
    const showFenderCheckbox = document.getElementById('showFender');
    if (showFenderCheckbox && showFenderCheckbox.checked) {
      const fenderGapInput = document.getElementById('fenderGap');
      const offsetXSlider  = document.getElementById('fenderOffsetX');
      const offsetYSlider  = document.getElementById('fenderOffsetY');
  
      if (fenderGapInput && offsetXSlider && offsetYSlider) {
        const fenderGap = parseFloat(fenderGapInput.value) || 80;
        const offsetX   = parseFloat(offsetXSlider.value) || 0;
        const offsetY   = parseFloat(offsetYSlider.value) || 0;
  
        drawFender(svg, centerX, centerY, scale, fenderGap, offsetX, offsetY);
      }
    }
  }
  
  /**
   * Draw the Wheel + Tire: 
   *   - Rim rectangle (dashed)
   *   - Tire top/bottom lines
   *   - Sidewalls (lines from rim corners to tire corners)
   */
  function drawWheelAndTire(
    svg, centerX, centerY,
    rimW, rimH,
    tireW, tireH,
    color
  ) {
    // Rim rectangle (dashed)
    const rimRect = createSVGElement('rect', {
      x: centerX - rimW / 2,
      y: centerY - rimH / 2,
      width: rimW,
      height: rimH,
      fill: 'none',
      stroke: color,
      'stroke-width': '1',
      'stroke-dasharray': '3 2'
    });
    svg.appendChild(rimRect);
  
    // Tire top line
    const tireTop = createSVGElement('line', {
      x1: centerX - tireW / 2,
      y1: centerY - tireH / 2,
      x2: centerX + tireW / 2,
      y2: centerY - tireH / 2,
      stroke: color,
      'stroke-width': '2'
    });
    svg.appendChild(tireTop);
  
    // Tire bottom line
    const tireBottom = createSVGElement('line', {
      x1: centerX - tireW / 2,
      y1: centerY + tireH / 2,
      x2: centerX + tireW / 2,
      y2: centerY + tireH / 2,
      stroke: color,
      'stroke-width': '2'
    });
    svg.appendChild(tireBottom);
  
    // Sidewalls
    drawSidewalls(svg, centerX, centerY, tireW, tireH, rimW, rimH, color);
  }
  
  /**
   * Draw the sidewalls: lines from the rim corners to the tire corners (top and bottom)
   */
  function drawSidewalls(svg, centerX, centerY, tireW, tireH, rimW, rimH, color) {
    // Top sidewalls
    // Left top
    svg.appendChild(createSVGElement('line', {
      x1: centerX - rimW / 2,
      y1: centerY - rimH / 2,
      x2: centerX - tireW / 2,
      y2: centerY - tireH / 2,
      stroke: color,
      'stroke-width': '2'
    }));
    // Right top
    svg.appendChild(createSVGElement('line', {
      x1: centerX + rimW / 2,
      y1: centerY - rimH / 2,
      x2: centerX + tireW / 2,
      y2: centerY - tireH / 2,
      stroke: color,
      'stroke-width': '2'
    }));
  
    // Bottom sidewalls
    // Left bottom
    svg.appendChild(createSVGElement('line', {
      x1: centerX - rimW / 2,
      y1: centerY + rimH / 2,
      x2: centerX - tireW / 2,
      y2: centerY + tireH / 2,
      stroke: color,
      'stroke-width': '2'
    }));
    // Right bottom
    svg.appendChild(createSVGElement('line', {
      x1: centerX + rimW / 2,
      y1: centerY + rimH / 2,
      x2: centerX + tireW / 2,
      y2: centerY + tireH / 2,
      stroke: color,
      'stroke-width': '2'
    }));
  }
  
  /**
   * Optional stylized "Fender" arc above the wheel, with user offsets
   *   fenderGap: hub-to-fender distance in mm (converted to px)
   *   offsetX / offsetY: user slider offsets in px
   */
  function drawFender(svg, hubCenterX, hubCenterY, scale, fenderGap, offsetX, offsetY) {
    // Convert gap from mm to pixels
    const gapPx = fenderGap * scale;
  
    // "Center" of the circle is offset above the hub by gapPx, plus user offsets
    const cx = hubCenterX + offsetX;
    const cy = hubCenterY - gapPx + offsetY;
  
    // We'll define radius for the arc. Tweak as desired.
    const r = 120; // how big the quarter circle is
  
    // Move from top of circle (cx, cy - r) to right side (cx + r, cy)
    const pathData = `
      M ${cx} ${cy - r}
      A ${r} ${r} 0 0 1 ${cx + r} ${cy}
    `;
  
    const arc = createSVGElement('path', {
      d: pathData,
      stroke: '#666',
      'stroke-width': '4',
      fill: 'none'
    });
    svg.appendChild(arc);
  }
  
  
  /**
   * Draw stylized suspension (no static vertical line):
   *   - coilover, arcs, knuckle, lower control arm, axle line
   */
  function drawSuspension(svg, centerX, centerY, w, h) {
    // Position it to the left of the hub
    const coiloverX = centerX - 150;
    const coiloverY = centerY - 60;
  
    // Coilover main line
    const coiloverLine = createSVGElement('line', {
      x1: coiloverX,      y1: coiloverY - 20,
      x2: coiloverX + 20, y2: coiloverY + 20,
      stroke: '#555',
      'stroke-width': '4'
    });
    svg.appendChild(coiloverLine);
  
    // Coil arcs
    for (let i = 0; i < 3; i++) {
      const coilArc = createSVGElement('path', {
        d: `M ${coiloverX} ${coiloverY + i * 10}
             C ${coiloverX + 10} ${coiloverY + i * 10 - 5},
               ${coiloverX + 10} ${coiloverY + i * 10 + 5},
               ${coiloverX + 20} ${coiloverY + i * 10}`,
        stroke: '#888',
        'stroke-width': '2',
        fill: 'none'
      });
      svg.appendChild(coilArc);
    }
  
    // Knuckle line
    const knuckle = createSVGElement('line', {
      x1: centerX,      y1: centerY,
      x2: coiloverX + 20, y2: coiloverY + 20,
      stroke: '#444',
      'stroke-width': '3'
    });
    svg.appendChild(knuckle);
  
    // Lower control arm
    const armX = centerX - 100;
    const armY = centerY + 40;
    const controlArm = createSVGElement('line', {
      x1: armX,     y1: armY,
      x2: centerX,  y2: centerY,
      stroke: '#444',
      'stroke-width': '3'
    });
    svg.appendChild(controlArm);
  
    // Axle: dashed horizontal line through the hub
    const axle = createSVGElement('line', {
      x1: centerX - 80,
      y1: centerY,
      x2: centerX + 80,
      y2: centerY,
      stroke: '#444',
      'stroke-width': '2',
      'stroke-dasharray': '2 2'
    });
    svg.appendChild(axle);
  }
  
  /**
   * Utility for creating an SVG element with a set of attributes
   */
  function createSVGElement(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
    return el;
  }
  
  
  /***********************************************************
   * Event listeners for the "Show Fender?" checkbox and sliders
   * so that we can update the diagram live (optional).
   *
   * Note: If you prefer the user to click "Calculate" each time,
   * you can omit these live listeners and just rely on `calculate()`.
   ***********************************************************/
  
  // Show/hide fender options
  document.getElementById('showFender').addEventListener('change', function() {
    const fenderOpts = document.getElementById('fenderOptions');
    if (this.checked) {
      fenderOpts.style.display = 'block';
    } else {
      fenderOpts.style.display = 'none';
    }
    // Optionally auto redraw:
    calculate();
  });
  
  // Live slider updates for X offset
  document.getElementById('fenderOffsetX').addEventListener('input', function() {
    document.getElementById('fenderOffsetXValue').textContent = this.value;
    // Optionally auto redraw:
    calculate();
  });
  
  // Live slider updates for Y offset
  document.getElementById('fenderOffsetY').addEventListener('input', function() {
    document.getElementById('fenderOffsetYValue').textContent = this.value;
    // Optionally auto redraw:
    calculate();
  });
  
  // Live updates for the "Hub to Fender" mm input
  document.getElementById('fenderGap').addEventListener('input', function() {
    // Optionally auto redraw:
    calculate();
  });
  