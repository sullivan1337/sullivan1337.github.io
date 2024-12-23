/***********************************************************
 * script.js
 * 1) Adds highlight if Distance to Fender > -2mm (red).
 * 2) Adds highlight if speedo error > +/- 2%.
 * 3) Fixes offset sliders to a certain width so no jumpy layout.
 * 4) Shows "Modified Fender" (in mm) that combines offsetX with fenderGapWidth.
 ***********************************************************/

/***********************************************************
 * Add live update event listeners to all inputs
 ***********************************************************/

function addLiveUpdateListeners() {
  const inputIds = [
    'old_tireWidth', 'old_aspectRatio', 'old_wheelDiameter', 'old_wheelWidth', 'old_offset',
    'new_tireWidth', 'new_aspectRatio', 'new_wheelDiameter', 'new_wheelWidth', 'new_offset',
    'fenderGapHeight', 'fenderGapWidth', 'fenderOffsetX', 'fenderOffsetY'
  ];

  inputIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', calculate); // Call calculate on value change
    }
  });
}

// Call this function once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  addLiveUpdateListeners();
  calculate(); // Initial calculation
});


/**
 * Main calculation and UI update function
 */
function calculate() {
    // Get old wheel/tire values from the form
    let old_tireWidth      = parseFloat(document.getElementById('old_tireWidth').value);
    let old_aspectRatio    = parseFloat(document.getElementById('old_aspectRatio').value);
    let old_wheelDiameter  = parseFloat(document.getElementById('old_wheelDiameter').value);
    let old_wheelWidth     = parseFloat(document.getElementById('old_wheelWidth').value);
    let old_offset         = parseFloat(document.getElementById('old_offset').value);

    // Get new wheel/tire values
    let new_tireWidth      = parseFloat(document.getElementById('new_tireWidth').value);
    let new_aspectRatio    = parseFloat(document.getElementById('new_aspectRatio').value);
    let new_wheelDiameter  = parseFloat(document.getElementById('new_wheelDiameter').value);
    let new_wheelWidth     = parseFloat(document.getElementById('new_wheelWidth').value);
    let new_offset         = parseFloat(document.getElementById('new_offset').value);

    // Validate numeric inputs
    if (
      isNaN(old_tireWidth)   || isNaN(old_aspectRatio)   || isNaN(old_wheelDiameter) ||
      isNaN(old_wheelWidth)  || isNaN(old_offset)        ||
      isNaN(new_tireWidth)   || isNaN(new_aspectRatio)   || isNaN(new_wheelDiameter) ||
      isNaN(new_wheelWidth)  || isNaN(new_offset)
    ) {
      alert('Please ensure all fields are filled with valid numbers.');
      return;
    }

    // Calculate old tire sidewall, diameter, circumference
    let old_sidewall      = old_tireWidth * (old_aspectRatio / 100);
    let old_diameter      = (old_wheelDiameter * 25.4) + (2 * old_sidewall);
    let old_circumference = Math.PI * old_diameter;

    // Calculate new tire sidewall, diameter, circumference
    let new_sidewall      = new_tireWidth * (new_aspectRatio / 100);
    let new_diameter      = (new_wheelDiameter * 25.4) + (2 * new_sidewall);
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
    let speedo_error_pct   = (speedo_error_ratio * 100).toFixed(2); // string format

    // Speed readouts
    let readAt30 = 30 * (old_circumference / new_circumference);
    let readAt60 = 60 * (old_circumference / new_circumference);

    // Update results table
    document.getElementById('res_oldDiameter').innerText = old_diameter.toFixed(1) + " mm";
    document.getElementById('res_newDiameter').innerText = new_diameter.toFixed(1) + " mm";
    document.getElementById('res_oldCirc').innerText     = old_circumference.toFixed(1) + " mm";
    document.getElementById('res_newCirc').innerText     = new_circumference.toFixed(1) + " mm";
    document.getElementById('res_oldPoke').innerText     = old_poke.toFixed(1) + " mm";
    document.getElementById('res_newPoke').innerText     = new_poke.toFixed(1) + " mm";
    document.getElementById('res_oldInset').innerText    = old_inset.toFixed(1) + " mm";
    document.getElementById('res_newInset').innerText    = new_inset.toFixed(1) + " mm";
    document.getElementById('res_speedoError').innerText = speedo_error_pct + "% (Speedometer error)";
    document.getElementById('res_30new').innerText       = readAt30.toFixed(2) + " mph";
    document.getElementById('res_60new').innerText       = readAt60.toFixed(2) + " mph";

    // Highlight speedo error cell if more than +/-2.0%
    let speedoCell = document.getElementById('res_speedoError');
    let errVal = parseFloat(speedo_error_pct); // number
    if (Math.abs(errVal) > 2.0) {
      speedoCell.style.backgroundColor = "red";
      speedoCell.style.color = "#fff";
    } else {
      speedoCell.style.backgroundColor = "";
      speedoCell.style.color = "";
    }

    // Show results
    document.getElementById('results').style.display = 'block';

    // Draw the diagram
    drawDiagram(
      old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
      new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
    );
}

function updateValue(inputId, increment) {
  const input = document.getElementById(inputId);

  // Read current value and step
  const step = parseFloat(input.step || 1);
  const currentValue = parseFloat(input.value || 0);

  // Scale everything to integers to avoid floating-point issues
  const scale = 1 / step; // E.g., for step = 0.5, scale = 2
  const newValue = (currentValue * scale + increment * scale) / scale;

  // Ensure the new value respects min/max constraints (if defined)
  const min = input.min ? parseFloat(input.min) : -Infinity;
  const max = input.max ? parseFloat(input.max) : Infinity;

  if (!isNaN(newValue) && newValue >= min && newValue <= max) {
    // Determine precision based on the input field
    const precision = (inputId === 'old_wheelWidth' || inputId === 'new_wheelWidth') ? 1 : 0;
    input.value = newValue.toFixed(precision); // Show decimal for wheel widths, integers for others
    input.dispatchEvent(new Event('input')); // Trigger input listeners
  }
}

// Interval ID for click-and-hold behavior
let holdInterval;

// Define the `startHold` function
function startHold(inputId, increment) {
  // Update the value immediately
  updateValue(inputId, increment);

  // Start an interval for continuous increment/decrement
  holdInterval = setInterval(() => updateValue(inputId, increment), 250);
}

// Define the `stopHold` function
function stopHold() {
  // Clear the interval when the button is released
  clearInterval(holdInterval);
}

/**
 * Draw our updated diagram in the <svg> with id="diagram"
 *   - Optionally draws a "fender" 
 *   - Then calculates "Distance to Fender" for BOTH old & new tires
 */
function drawDiagram(
    old_offset, old_wheelWidth_mm, old_diameter, old_wheelDiameter, old_tireWidth,
    new_offset, new_wheelWidth_mm, new_diameter, new_wheelDiameter, new_tireWidth
  ) {
    // Clear previous diagram
    const svg = document.getElementById('diagram');
    svg.innerHTML = '';
  
    // Ensure container is visible
    document.getElementById('diagram-container').style.display = 'block';
  
    // Get the container's width
    const container = document.getElementById('diagram-container');
    const SVG_WIDTH = container.offsetWidth;
    
    // Instead of using container.offsetHeight, use a ratio
    const SVG_HEIGHT = Math.round(SVG_WIDTH * 0.66);
  
    // Set the SVG dimensions
    svg.setAttribute('width', SVG_WIDTH);
    svg.setAttribute('height', SVG_HEIGHT);

  // Scale factor
  const scale = Math.min(SVG_WIDTH, SVG_HEIGHT) / 750;

  // Center point
  const centerX = SVG_WIDTH / 2;
  const centerY = SVG_HEIGHT / 2;

  // --- Old tire setup in px
  const old_centerX       = centerX - (old_offset * scale);
  const old_tireWidth_px  = old_tireWidth * scale;
  const old_diameter_px   = old_diameter * scale;
  const old_rimWidth_px   = old_wheelWidth_mm * scale;
  const old_rimHeight_px  = (old_wheelDiameter * 25.4) * scale;

  // --- New tire setup in px
  const new_centerX       = centerX - (new_offset * scale);
  const new_tireWidth_px  = new_tireWidth * scale;
  const new_diameter_px   = new_diameter * scale;
  const new_rimWidth_px   = new_wheelWidth_mm * scale;
  const new_rimHeight_px  = (new_wheelDiameter * 25.4) * scale;

  // Draw suspension
  drawSuspension(svg, centerX, centerY, SVG_WIDTH, SVG_HEIGHT);

  // Lug circles
  for (let i = -1; i <= 1; i++) {
    const lug = createSVGElement('circle', {
      cx: centerX,
      cy: centerY + i * 10,
      r: 2,
      fill: '#333'
    });
    svg.appendChild(lug);
  }

  // Draw old wheel/tire
  drawWheelAndTire(
    svg,
    old_centerX, centerY,
    old_rimWidth_px, old_rimHeight_px,
    old_tireWidth_px, old_diameter_px,
    '#0078d4'
  );

  // Draw new wheel/tire
  drawWheelAndTire(
    svg,
    new_centerX, centerY,
    new_rimWidth_px, new_rimHeight_px,
    new_tireWidth_px, new_diameter_px,
    '#ff5722'
  );

  // If "Show Fender?" is unchecked => set both fender dists to "N/A"
  const showFenderCheckbox = document.getElementById('showFender');
  if (!showFenderCheckbox || !showFenderCheckbox.checked) {
    document.getElementById('res_oldFenderDist').innerText = "N/A";
    document.getElementById('res_newFenderDist').innerText = "N/A";
    return;
  }

  // Otherwise, read the fender inputs and draw the arc
  const fenderGapHeightInput = document.getElementById('fenderGapHeight');
  const fenderGapWidthInput  = document.getElementById('fenderGapWidth');
  const offsetXSlider        = document.getElementById('fenderOffsetX');
  const offsetYSlider        = document.getElementById('fenderOffsetY');

  if (fenderGapHeightInput && fenderGapWidthInput && offsetXSlider && offsetYSlider) {
    const fenderGapHeight = parseFloat(fenderGapHeightInput.value) || 0;
    const fenderGapWidth  = parseFloat(fenderGapWidthInput.value)  || 0;
    const offsetX         = parseFloat(offsetXSlider.value) || 0;
    const offsetY         = parseFloat(offsetYSlider.value) || 0;

    // 1) Draw the arc
    const r = drawFender(svg, centerX, centerY, scale,
                         fenderGapHeight, fenderGapWidth,
                         offsetX, offsetY);

    // 2) Compute distance for both Old + New top-right corners
    //    We'll replicate the "top-right corner" logic from how we drew the tire.

    // Old tire corner
    const oldTireTopRightX = old_centerX + (old_tireWidth_px / 2);
    const oldTireTopRightY = centerY - (old_diameter_px / 2);
    const oldDistToFenderMm = computeDistanceToArc(
      oldTireTopRightX, oldTireTopRightY,
      centerX, centerY, offsetX, offsetY,
      fenderGapHeight, fenderGapWidth,
      r, scale
    );

    // New tire corner
    const newTireTopRightX = new_centerX + (new_tireWidth_px / 2);
    const newTireTopRightY = centerY - (new_diameter_px / 2);
    const newDistToFenderMm = computeDistanceToArc(
      newTireTopRightX, newTireTopRightY,
      centerX, centerY, offsetX, offsetY,
      fenderGapHeight, fenderGapWidth,
      r, scale
    );

    // Update table cells
    const oldCell = document.getElementById('res_oldFenderDist');
    const newCell = document.getElementById('res_newFenderDist');

    oldCell.innerText = oldDistToFenderMm.toFixed(1) + " mm";
    newCell.innerText = newDistToFenderMm.toFixed(1) + " mm";

    // Highlight red if distance > -2 mm (meaning the corner is 
    // within or past the fender by less than 2 mm).
    highlightFenderCell(oldCell, oldDistToFenderMm);
    highlightFenderCell(newCell, newDistToFenderMm);

    // 3) Also show "Modified Fender" readout:
    // Convert offsetX from px => mm via scale, then add fenderGapWidth
    let offsetX_mm = offsetX / scale; // px -> mm
    let totalFenderWidth = fenderGapWidth + offsetX_mm;
    // Suppose we show it in an element: <span id="fenderWidthCalc"></span>
    const fwEl = document.getElementById('fenderWidthCalc');
    if (fwEl) {
      fwEl.innerText = totalFenderWidth.toFixed(1) + " mm";
    }
  }
}

/**
 * Draw the Wheel + Tire
 */
function drawWheelAndTire(
  svg, wheelCenterX, wheelCenterY,
  rimW, rimH,
  tireW, tireH,
  color
) {
  // Rim (dashed)
  const rimRect = createSVGElement('rect', {
    x: wheelCenterX - rimW / 2,
    y: wheelCenterY - rimH / 2,
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
    x1: wheelCenterX - tireW / 2,
    y1: wheelCenterY - tireH / 2,
    x2: wheelCenterX + tireW / 2,
    y2: wheelCenterY - tireH / 2,
    stroke: color,
    'stroke-width': '2'
  });
  svg.appendChild(tireTop);

  // Tire bottom line
  const tireBottom = createSVGElement('line', {
    x1: wheelCenterX - tireW / 2,
    y1: wheelCenterY + tireH / 2,
    x2: wheelCenterX + tireW / 2,
    y2: wheelCenterY + tireH / 2,
    stroke: color,
    'stroke-width': '2'
  });
  svg.appendChild(tireBottom);

  // Sidewalls
  drawSidewalls(svg, wheelCenterX, wheelCenterY, tireW, tireH, rimW, rimH, color);
}

/**
 * Draw sidewalls
 */
function drawSidewalls(svg, centerX, centerY, tireW, tireH, rimW, rimH, color) {
  // Top sidewalls
  svg.appendChild(createSVGElement('line', {
    x1: centerX - rimW / 2,
    y1: centerY - rimH / 2,
    x2: centerX - tireW / 2,
    y2: centerY - tireH / 2,
    stroke: color,
    'stroke-width': '2'
  }));
  svg.appendChild(createSVGElement('line', {
    x1: centerX + rimW / 2,
    y1: centerY - rimH / 2,
    x2: centerX + tireW / 2,
    y2: centerY - tireH / 2,
    stroke: color,
    'stroke-width': '2'
  }));

  // Bottom sidewalls
  svg.appendChild(createSVGElement('line', {
    x1: centerX - rimW / 2,
    y1: centerY + rimH / 2,
    x2: centerX - tireW / 2,
    y2: centerY + tireH / 2,
    stroke: color,
    'stroke-width': '2'
  }));
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
 * Draw a 1/4 circle "fender" 
 * Return the radius used
 */
function drawFender(
  svg, hubCenterX, hubCenterY, scale,
  fenderGapHeight, fenderGapWidth,
  offsetX, offsetY
) {
  // Arc radius
  const r = 120;

  // Convert mm to px
  const gapPxHeight = fenderGapHeight * scale;
  const gapPxWidth  = fenderGapWidth  * scale;

  // Shift so "Width=0" keeps arc over hub
  const cx = (hubCenterX + offsetX + gapPxWidth) - r;
  const cy = (hubCenterY + offsetY) - gapPxHeight;

  // Draw arc from (cx, cy-r) to (cx+r, cy)
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

  return r;
}

/**
 * Compute the distance (in mm) from a given corner (cornerX, cornerY)
 * to the "fender arc" which has center = (cx, cy) - r
 */
function computeDistanceToArc(
  cornerX, cornerY,
  hubCenterX, hubCenterY, offsetX, offsetY,
  fenderGapHeight, fenderGapWidth,
  r, scale
) {
  // Recreate the center
  const gapPxHeight = fenderGapHeight * scale;
  const gapPxWidth  = fenderGapWidth  * scale;

  const cx = (hubCenterX + offsetX + gapPxWidth) - r;
  const cy = (hubCenterY + offsetY) - gapPxHeight;

  // Dist from corner -> arc center
  const dx = cornerX - cx;
  const dy = cornerY - cy;
  const distPx = Math.sqrt(dx*dx + dy*dy);

  // gapPx = distPx - r
  const gapPx = distPx - r;

  // Convert to mm
  return gapPx / scale;
}

/**
 * Highlight the cell if distanceToFender > -2 mm
 */
function highlightFenderCell(cell, distMm) {
  // If distMm > -2 => the tire is within ~2 mm or out past the arc
  if (distMm > -2) {
    cell.style.backgroundColor = "red";
    cell.style.color = "#fff";
  } else {
    cell.style.backgroundColor = "";
    cell.style.color = "";
  }
}

/**
 * Draw stylized suspension
 */
function drawSuspension(svg, centerX, centerY, w, h) {
  const coiloverX = centerX - 175;
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
      d: `M ${coiloverX} ${coiloverY + i*10}
           C ${coiloverX + 10} ${coiloverY + i*10 - 5},
             ${coiloverX + 10} ${coiloverY + i*10 + 5},
             ${coiloverX + 20} ${coiloverY + i*10}`,
      stroke: '#888',
      'stroke-width': '2',
      fill: 'none'
    });
    svg.appendChild(coilArc);
  }

  // Knuckle
  const knuckle = createSVGElement('line', {
    x1: centerX,     y1: centerY,
    x2: coiloverX + 20, y2: coiloverY + 20,
    stroke: '#444',
    'stroke-width': '3'
  });
  svg.appendChild(knuckle);

  // Lower control arm
  const armX = centerX - 100;
  const armY = centerY + 40;
  const controlArm = createSVGElement('line', {
    x1: armX,    y1: armY,
    x2: centerX, y2: centerY,
    stroke: '#444',
    'stroke-width': '3'
  });
  svg.appendChild(controlArm);

  // Axle: dashed line
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
 * Utility function to create an SVG element
 */
function createSVGElement(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
  return el;
}


/***********************************************************
 * Event listeners (live updates)
 ***********************************************************/

// Show/hide fender options in a consistent container
document.getElementById('showFender').addEventListener('change', function() {
  const fenderOpts = document.getElementById('fenderOptions');
  fenderOpts.style.display = this.checked ? 'block' : 'none';
  calculate();
});

// Fix slider text display widths via a small inline style or CSS:
const fxSlider = document.getElementById('fenderOffsetXValue');
const fySlider = document.getElementById('fenderOffsetYValue');
fxSlider.style.width = "40px";
fySlider.style.width = "40px";

// X slider
document.getElementById('fenderOffsetX').addEventListener('input', function() {
  const fxSliderValue = this.value;
  
  // Update the span with the slider value
  fxSlider.textContent = fxSliderValue;

  // Update the "Hub to Fender Depth (Width/Out)" input box
  const fenderGapWidthInput = document.getElementById('fenderGapWidth');
  const initialWidth = parseFloat(fenderGapWidthInput.getAttribute('data-initial-value')) || 120; // Default to 120 if not set
  const newWidth = initialWidth + parseFloat(fxSliderValue);
  fenderGapWidthInput.value = Math.round(newWidth); // Round to the nearest whole number

  // Recalculate visualization and results
  calculate();
});

// Y slider
document.getElementById('fenderOffsetY').addEventListener('input', function() {
  fySlider.textContent = this.value;
  calculate();
});

// Height
document.getElementById('fenderGapHeight').addEventListener('input', function() {
  calculate();
});

// Width
document.getElementById('fenderGapWidth').addEventListener('input', function() {
  calculate();
});
