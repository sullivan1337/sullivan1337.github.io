/**
 * PEX Radiant Floor Designer
 * A browser-based tool for designing radiant floor heating layouts
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  room: {
    width: 20,        // feet
    height: 15,       // feet
    cutouts: [],      // Array of cutouts for L-shapes: { width, height, corner }
    // Wall types: 'exterior' prioritizes heat near that wall, 'interior' deprioritizes
    walls: {
      top: 'exterior',
      right: 'exterior', 
      bottom: 'exterior',
      left: 'exterior'
    }
  },
  pex: {
    spacing: 6,       // inches
    maxLoopLength: 300, // feet
    wallOffset: 6,    // inches
    manifoldPosition: 'auto',
    manifoldX: null,  // Custom position when dragged
    manifoldY: null
  },
  loops: [],
  loopDirections: {}, // Store direction preferences per loop index
  selectedLoopIndex: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  
  // Drag state
  isDragging: false,
  dragType: null,
  dragStart: null,
  
  // Auto-generate debounce
  autoGenerateTimeout: null,
  
  // Available colors for loops
  loopColors: [
    '#e85858', // Red
    '#4da6ff', // Blue
    '#6bc77a', // Green
    '#f5a862', // Orange
    '#bb6bd9', // Purple
    '#45b8ac', // Teal
    '#ff6b9d', // Pink
    '#ffd93d', // Yellow
    '#6366f1', // Indigo
    '#14b8a6', // Cyan
  ],
  
  // Preset colors for color picker
  presetColors: [
    '#e85858', '#ff6b6b', '#ff8787', '#ffa8a8',
    '#4da6ff', '#74b9ff', '#a29bfe', '#6c5ce7',
    '#6bc77a', '#55efc4', '#00cec9', '#81ecec',
    '#f5a862', '#fdcb6e', '#ffeaa7', '#e17055',
    '#bb6bd9', '#fd79a8', '#fab1a0', '#e84393',
    '#2d3436', '#636e72', '#b2bec3', '#dfe6e9',
  ]
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const canvas = document.getElementById('roomCanvas');
const ctx = canvas.getContext('2d');

const elements = {
  // Room controls
  roomWidth: document.getElementById('roomWidth'),
  roomHeight: document.getElementById('roomHeight'),
  areaDisplay: document.getElementById('areaDisplay'),
  addCornerBtn: document.getElementById('addCornerBtn'),
  cornerControls: document.getElementById('cornerControls'),
  cutoutList: document.getElementById('cutoutList'),
  
  // PEX settings
  maxLoopLength: document.getElementById('maxLoopLength'),
  wallOffset: document.getElementById('wallOffset'),
  
  // Action buttons
  newRoomBtn: document.getElementById('newRoomBtn'),
  exportBtn: document.getElementById('exportBtn'),
  generatePexBtn: document.getElementById('generatePexBtn'),
  themeToggle: document.getElementById('themeToggle'),
  
  // Zoom controls
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  resetZoomBtn: document.getElementById('resetZoomBtn'),
  zoomLevel: document.getElementById('zoomLevel'),
  
  // Results
  loopSummary: document.getElementById('loopSummary'),
  totalLoops: document.getElementById('totalLoops'),
  totalLength: document.getElementById('totalLength'),
  coverageArea: document.getElementById('coverageArea'),
  manifoldPorts: document.getElementById('manifoldPorts'),
  
  // Status
  mousePos: document.getElementById('mousePos'),
  roomShape: document.getElementById('roomShape'),
  statusMessage: document.getElementById('statusMessage'),
  
  // Dimension labels
  dimTop: document.getElementById('dimTop'),
  dimRight: document.getElementById('dimRight'),
  
  // Modal
  colorModal: document.getElementById('colorModal'),
  colorGrid: document.getElementById('colorGrid'),
  customColor: document.getElementById('customColor'),
  closeModal: document.getElementById('closeModal'),
  cancelColor: document.getElementById('cancelColor'),
  applyColor: document.getElementById('applyColor'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

// ============================================================================
// CANVAS SETUP
// ============================================================================

const PIXELS_PER_FOOT = 30;
const PADDING = 100;
const HANDLE_SIZE = 10;
const MANIFOLD_HANDLE_SIZE = 14;

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  draw();
}

function getScale() {
  const maxRoomWidth = state.room.width;
  const maxRoomHeight = state.room.height;
  
  const availableWidth = canvas.width - PADDING * 2;
  const availableHeight = canvas.height - PADDING * 2;
  
  const scaleX = availableWidth / (maxRoomWidth * PIXELS_PER_FOOT);
  const scaleY = availableHeight / (maxRoomHeight * PIXELS_PER_FOOT);
  
  return Math.min(scaleX, scaleY, 1) * state.zoom;
}

function roomToCanvas(x, y) {
  const scale = getScale();
  const roomPixelWidth = state.room.width * PIXELS_PER_FOOT * scale;
  const roomPixelHeight = state.room.height * PIXELS_PER_FOOT * scale;
  
  const offsetX = (canvas.width - roomPixelWidth) / 2 + state.pan.x;
  const offsetY = (canvas.height - roomPixelHeight) / 2 + state.pan.y;
  
  return {
    x: offsetX + x * PIXELS_PER_FOOT * scale,
    y: offsetY + y * PIXELS_PER_FOOT * scale
  };
}

function canvasToRoom(canvasX, canvasY) {
  const scale = getScale();
  const roomPixelWidth = state.room.width * PIXELS_PER_FOOT * scale;
  const roomPixelHeight = state.room.height * PIXELS_PER_FOOT * scale;
  
  const offsetX = (canvas.width - roomPixelWidth) / 2 + state.pan.x;
  const offsetY = (canvas.height - roomPixelHeight) / 2 + state.pan.y;
  
  return {
    x: (canvasX - offsetX) / (PIXELS_PER_FOOT * scale),
    y: (canvasY - offsetY) / (PIXELS_PER_FOOT * scale)
  };
}

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawRoom();
  drawWallOffset();
  drawWallLabels();
  drawWallMeasurements();
  drawPexLoops();
  drawManifold();
  drawDragHandles();
}

function drawRoom() {
  ctx.save();
  
  const path = getRoomPath();
  
  // Draw room fill
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim() || '#12171d';
  ctx.beginPath();
  path.forEach((point, i) => {
    const canvasPoint = roomToCanvas(point.x, point.y);
    if (i === 0) {
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
    } else {
      ctx.lineTo(canvasPoint.x, canvasPoint.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  
  // Draw room outline
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#e07850';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  ctx.restore();
}

function drawWallOffset() {
  const scale = getScale();
  const offsetFeet = state.pex.wallOffset / 12;
  
  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-secondary').trim() || '#f5a862';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  
  const innerPath = getInnerRoomPath(offsetFeet);
  
  ctx.beginPath();
  innerPath.forEach((point, i) => {
    const canvasPoint = roomToCanvas(point.x, point.y);
    if (i === 0) {
      ctx.moveTo(canvasPoint.x, canvasPoint.y);
    } else {
      ctx.lineTo(canvasPoint.x, canvasPoint.y);
    }
  });
  ctx.closePath();
  ctx.stroke();
  
  ctx.setLineDash([]);
  ctx.restore();
}

function drawWallLabels() {
  const scale = getScale();
  const w = state.room.width;
  const h = state.room.height;
  
  ctx.save();
  ctx.font = `${10 * Math.max(scale, 0.6)}px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const walls = getWallSegments();
  
  walls.forEach(wall => {
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    const canvasPoint = roomToCanvas(midX, midY);
    
    // Offset label closer to wall (before measurements)
    let labelX = canvasPoint.x;
    let labelY = canvasPoint.y;
    const labelOffset = 18;
    
    if (wall.side === 'top') labelY -= labelOffset;
    else if (wall.side === 'bottom') labelY += labelOffset;
    else if (wall.side === 'left') labelX -= labelOffset;
    else if (wall.side === 'right') labelX += labelOffset;
    
    // Draw background for better visibility
    const isExterior = state.room.walls[wall.side] === 'exterior';
    const label = isExterior ? 'EXT' : 'INT';
    const metrics = ctx.measureText(label);
    const padding = 3;
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#181e26';
    ctx.fillRect(
      labelX - metrics.width / 2 - padding,
      labelY - 7 - padding,
      metrics.width + padding * 2,
      14 + padding * 2
    );
    
    ctx.strokeStyle = isExterior ? 
      getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() : 
      getComputedStyle(document.body).getPropertyValue('--border-color').trim();
    ctx.lineWidth = 1;
    ctx.strokeRect(
      labelX - metrics.width / 2 - padding,
      labelY - 7 - padding,
      metrics.width + padding * 2,
      14 + padding * 2
    );
    
    // Draw wall type indicator
    ctx.fillStyle = isExterior ? 
      getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() : 
      getComputedStyle(document.body).getPropertyValue('--text-muted').trim();
    
    ctx.fillText(label, labelX, labelY);
  });
  
  ctx.restore();
}

function drawWallMeasurements() {
  const scale = getScale();
  const w = state.room.width;
  const h = state.room.height;
  
  ctx.save();
  ctx.font = `bold ${11 * Math.max(scale, 0.6)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e8ebe5';
  
  const walls = getWallSegments();
  
  walls.forEach(wall => {
    const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
    if (length < 0.5) return; // Skip tiny segments
    
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    const canvasPoint = roomToCanvas(midX, midY);
    
    // Position measurement labels further out (past EXT/INT labels)
    let labelX = canvasPoint.x;
    let labelY = canvasPoint.y;
    const labelOffset = 55; // Further out to avoid EXT/INT labels at 18px
    
    // Determine if horizontal or vertical wall
    const isHorizontal = Math.abs(wall.y2 - wall.y1) < 0.01;
    
    if (isHorizontal) {
      if (wall.side === 'top' || midY < h / 2) {
        labelY -= labelOffset;
      } else {
        labelY += labelOffset;
      }
    } else {
      if (wall.side === 'left' || midX < w / 2) {
        labelX -= labelOffset;
      } else {
        labelX += labelOffset;
      }
    }
    
    // Draw background
    const text = `${length.toFixed(1)}'`;
    const metrics = ctx.measureText(text);
    const padding = 4;
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#181e26';
    ctx.fillRect(
      labelX - metrics.width / 2 - padding,
      labelY - 8 - padding,
      metrics.width + padding * 2,
      16 + padding * 2
    );
    
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#2a343f';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      labelX - metrics.width / 2 - padding,
      labelY - 8 - padding,
      metrics.width + padding * 2,
      16 + padding * 2
    );
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#e8ebe5';
    ctx.fillText(text, labelX, labelY);
  });
  
  ctx.restore();
}

function getWallSegments() {
  const w = state.room.width;
  const h = state.room.height;
  const walls = [];
  
  if (state.room.cutouts.length === 0) {
    walls.push({ x1: 0, y1: 0, x2: w, y2: 0, side: 'top' });
    walls.push({ x1: w, y1: 0, x2: w, y2: h, side: 'right' });
    walls.push({ x1: w, y1: h, x2: 0, y2: h, side: 'bottom' });
    walls.push({ x1: 0, y1: h, x2: 0, y2: 0, side: 'left' });
  } else {
    // For multiple cutouts, use the room path to determine walls
    const path = getRoomPath();
    for (let i = 0; i < path.length; i++) {
      const p1 = path[i];
      const p2 = path[(i + 1) % path.length];
      
      // Determine which side this segment belongs to
      let side = 'top';
      if (Math.abs(p1.y - p2.y) < 0.01) {
        // Horizontal segment
        side = p1.y < h / 2 ? 'top' : 'bottom';
      } else {
        // Vertical segment
        side = p1.x < w / 2 ? 'left' : 'right';
      }
      
      walls.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, side });
    }
  }
  
  return walls;
}

// ============================================================================
// ROOM PATH GENERATION (Multiple Cutouts Support)
// ============================================================================

function getRoomPath() {
  const w = state.room.width;
  const h = state.room.height;
  
  if (state.room.cutouts.length === 0) {
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h }
    ];
  }
  
  // Build path from cutouts
  return buildPathFromCutouts(w, h, state.room.cutouts);
}

function buildPathFromCutouts(w, h, cutouts) {
  // Start with full rectangle
  let path = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ];
  
  // Apply each cutout
  cutouts.forEach(cutout => {
    path = applyCutoutToPath(path, w, h, cutout);
  });
  
  return path;
}

function applyCutoutToPath(path, w, h, cutout) {
  const cw = cutout.width;
  const ch = cutout.height;
  const corner = cutout.corner;
  
  // Get cutout rectangle points
  let cutoutRect;
  switch (corner) {
    case 'top-right':
      cutoutRect = [
        { x: w - cw, y: 0 },
        { x: w, y: 0 },
        { x: w, y: ch },
        { x: w - cw, y: ch }
      ];
      break;
    case 'top-left':
      cutoutRect = [
        { x: 0, y: 0 },
        { x: cw, y: 0 },
        { x: cw, y: ch },
        { x: 0, y: ch }
      ];
      break;
    case 'bottom-right':
      cutoutRect = [
        { x: w - cw, y: h - ch },
        { x: w, y: h - ch },
        { x: w, y: h },
        { x: w - cw, y: h }
      ];
      break;
    case 'bottom-left':
      cutoutRect = [
        { x: 0, y: h - ch },
        { x: cw, y: h - ch },
        { x: cw, y: h },
        { x: 0, y: h }
      ];
      break;
    default:
      return path;
  }
  
  // Simple polygon subtraction - find intersection and rebuild path
  return subtractCutoutFromPath(path, cutoutRect, corner);
}

function subtractCutoutFromPath(path, cutoutRect, corner) {
  // Find where cutout intersects with path and rebuild
  const newPath = [];
  let inCutout = false;
  
  for (let i = 0; i < path.length; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % path.length];
    
    // Check if this edge intersects with cutout
    const intersects = edgeIntersectsCutout(p1, p2, cutoutRect, corner);
    
    if (!intersects) {
      if (!inCutout) {
        newPath.push(p1);
      }
    } else {
      // Add intersection points and cutout perimeter
      if (!inCutout) {
        newPath.push(p1);
        // Add cutout perimeter (reversed to maintain CCW order)
        addCutoutPerimeter(newPath, cutoutRect, corner, true);
        inCutout = true;
      } else {
        inCutout = false;
        // Add cutout perimeter exit
        addCutoutPerimeter(newPath, cutoutRect, corner, false);
      }
    }
  }
  
  // Remove duplicate consecutive points
  return removeDuplicatePoints(newPath);
}

function edgeIntersectsCutout(p1, p2, cutoutRect, corner) {
  // Check if edge crosses into cutout area
  const minX = Math.min(...cutoutRect.map(p => p.x));
  const maxX = Math.max(...cutoutRect.map(p => p.x));
  const minY = Math.min(...cutoutRect.map(p => p.y));
  const maxY = Math.max(...cutoutRect.map(p => p.y));
  
  return (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
         (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY);
}

function addCutoutPerimeter(path, cutoutRect, corner, entering) {
  // Add cutout perimeter points in correct order
  if (entering) {
    switch (corner) {
      case 'top-right':
        path.push(cutoutRect[0], cutoutRect[3], cutoutRect[2]);
        break;
      case 'top-left':
        path.push(cutoutRect[1], cutoutRect[2], cutoutRect[3]);
        break;
      case 'bottom-right':
        path.push(cutoutRect[0], cutoutRect[1], cutoutRect[2]);
        break;
      case 'bottom-left':
        path.push(cutoutRect[1], cutoutRect[0], cutoutRect[3]);
        break;
    }
  } else {
    switch (corner) {
      case 'top-right':
        path.push(cutoutRect[1]);
        break;
      case 'top-left':
        path.push(cutoutRect[0]);
        break;
      case 'bottom-right':
        path.push(cutoutRect[3]);
        break;
      case 'bottom-left':
        path.push(cutoutRect[2]);
        break;
    }
  }
}

function removeDuplicatePoints(path) {
  const result = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = result[result.length - 1];
    if (!prev || Math.abs(p.x - prev.x) > 0.01 || Math.abs(p.y - prev.y) > 0.01) {
      result.push(p);
    }
  }
  return result;
}

function getInnerRoomPath(offset) {
  const w = state.room.width;
  const h = state.room.height;
  
  if (state.room.cutouts.length === 0) {
    return [
      { x: offset, y: offset },
      { x: w - offset, y: offset },
      { x: w - offset, y: h - offset },
      { x: offset, y: h - offset }
    ];
  }
  
  // Build inner path with offset applied to cutouts
  const innerCutouts = state.room.cutouts.map(c => ({
    ...c,
    width: Math.max(0, c.width - offset),
    height: Math.max(0, c.height - offset)
  }));
  
  return buildPathFromCutouts(w - 2 * offset, h - 2 * offset, innerCutouts).map(p => ({
    x: p.x + offset,
    y: p.y + offset
  }));
}

// ============================================================================
// CUTOUT MANAGEMENT
// ============================================================================

function addCutout() {
  state.room.cutouts.push({
    width: 5,
    height: 5,
    corner: 'top-right',
    id: Date.now() // Unique ID for this cutout
  });
  updateCutoutList();
  updateArea();
  scheduleAutoGenerate();
  draw();
}

function removeCutout(id) {
  state.room.cutouts = state.room.cutouts.filter(c => c.id !== id);
  updateCutoutList();
  updateArea();
  scheduleAutoGenerate();
  draw();
}

function updateCutout(cutoutId, field, value) {
  const cutout = state.room.cutouts.find(c => c.id === cutoutId);
  if (cutout) {
    cutout[field] = value;
    updateArea();
    scheduleAutoGenerate();
    draw();
  }
}

function updateCutoutList() {
  if (state.room.cutouts.length === 0) {
    elements.cutoutList.innerHTML = '<p class="empty-hint">No L-shapes added</p>';
    return;
  }
  
  let html = '';
  state.room.cutouts.forEach((cutout, index) => {
    html += `
      <div class="cutout-item" data-id="${cutout.id}">
        <div class="cutout-header">
          <span class="cutout-label">L-Shape ${index + 1}</span>
          <button class="btn-danger btn-small" onclick="removeCutout(${cutout.id})" title="Remove">×</button>
        </div>
        <div class="input-group">
          <label>Width (ft)</label>
          <input type="number" value="${cutout.width}" min="1" max="50" step="0.5" 
                 onchange="updateCutout(${cutout.id}, 'width', parseFloat(this.value))"/>
        </div>
        <div class="input-group">
          <label>Length (ft)</label>
          <input type="number" value="${cutout.height}" min="1" max="50" step="0.5"
                 onchange="updateCutout(${cutout.id}, 'height', parseFloat(this.value))"/>
        </div>
        <div class="input-group">
          <label>Corner Position</label>
          <select onchange="updateCutout(${cutout.id}, 'corner', this.value)">
            <option value="top-right" ${cutout.corner === 'top-right' ? 'selected' : ''}>Top Right</option>
            <option value="top-left" ${cutout.corner === 'top-left' ? 'selected' : ''}>Top Left</option>
            <option value="bottom-right" ${cutout.corner === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
            <option value="bottom-left" ${cutout.corner === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
          </select>
        </div>
      </div>
    `;
  });
  
  elements.cutoutList.innerHTML = html;
}

// Make functions available globally
window.addCutout = addCutout;
window.removeCutout = removeCutout;
window.updateCutout = updateCutout;

// ============================================================================
// DRAG HANDLES (Simplified for multiple cutouts)
// ============================================================================

function drawDragHandles() {
  const scale = getScale();
  
  ctx.save();
  
  const handleColor = getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() || '#68b8e0';
  
  const handles = getResizeHandles();
  
  handles.forEach(handle => {
    const canvasPoint = roomToCanvas(handle.x, handle.y);
    
    ctx.fillStyle = handleColor;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(canvasPoint.x, canvasPoint.y, HANDLE_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  
  ctx.restore();
}

function getResizeHandles() {
  const w = state.room.width;
  const h = state.room.height;
  const handles = [];
  
  handles.push({ x: w, y: h / 2, type: 'resize-width', cursor: 'ew-resize' });
  handles.push({ x: w / 2, y: h, type: 'resize-height', cursor: 'ns-resize' });
  handles.push({ x: w, y: h, type: 'resize-corner', cursor: 'nwse-resize' });
  
  // Note: Cutout handles removed for simplicity with multiple cutouts
  // Users can resize cutouts via the UI controls
  
  return handles;
}

// ============================================================================
// MANIFOLD & PEX LOOPS
// ============================================================================

function drawManifold() {
  const manifoldPos = getManifoldPosition();
  const canvasPos = roomToCanvas(manifoldPos.x, manifoldPos.y);
  const scale = getScale();
  
  ctx.save();
  
  const boxWidth = 50 * scale;
  const boxHeight = Math.max(35 * scale, (state.loops.length || 1) * 10 * scale);
  
  // Draw manifold box
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#181e26';
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() || '#68b8e0';
  ctx.lineWidth = 3;
  
  ctx.beginPath();
  ctx.roundRect(canvasPos.x - boxWidth / 2, canvasPos.y - boxHeight / 2, boxWidth, boxHeight, 6);
  ctx.fill();
  ctx.stroke();
  
  // Draw manifold icon/label
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() || '#68b8e0';
  ctx.font = `bold ${12 * scale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', canvasPos.x, canvasPos.y);
  
  // Draw drag indicator
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#5e6a76';
  ctx.font = `${8 * scale}px 'Outfit', sans-serif`;
  ctx.fillText('drag', canvasPos.x, canvasPos.y + boxHeight / 2 - 8 * scale);
  
  ctx.restore();
}

function drawPexLoops() {
  state.loops.forEach((loop, index) => {
    drawLoop(loop, index);
  });
}

function drawLoop(loop, index) {
  if (!loop.path || loop.path.length < 2) return;
  
  const scale = getScale();
  const color = loop.color || state.loopColors[index % state.loopColors.length];
  const isSelected = state.selectedLoopIndex === index;
  
  ctx.save();
  
  ctx.strokeStyle = color;
  ctx.lineWidth = (isSelected ? 4 : 2.5) * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (isSelected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }
  
  drawSmoothPath(loop.path, scale);
  
  // Draw flow direction arrows
  drawFlowArrows(loop, scale, color);
  
  ctx.restore();
}

function drawSmoothPath(path, scale) {
  if (path.length < 2) return;
  
  const radius = (state.pex.spacing / 12) * PIXELS_PER_FOOT * scale * 0.4;
  
  ctx.beginPath();
  
  for (let i = 0; i < path.length; i++) {
    const current = roomToCanvas(path[i].x, path[i].y);
    
    if (i === 0) {
      ctx.moveTo(current.x, current.y);
    } else if (i === path.length - 1) {
      ctx.lineTo(current.x, current.y);
    } else {
      const prev = roomToCanvas(path[i - 1].x, path[i - 1].y);
      const next = roomToCanvas(path[i + 1].x, path[i + 1].y);
      
      const v1 = { x: current.x - prev.x, y: current.y - prev.y };
      const v2 = { x: next.x - current.x, y: next.y - current.y };
      
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      if (len1 > 0 && len2 > 0) {
        const cornerRadius = Math.min(radius, len1 / 2, len2 / 2);
        ctx.arcTo(current.x, current.y, next.x, next.y, cornerRadius);
      } else {
        ctx.lineTo(current.x, current.y);
      }
    }
  }
  
  ctx.stroke();
}

function drawFlowArrows(loop, scale, color) {
  if (!loop.path || loop.path.length < 3) return;
  
  const arrowSize = 8 * scale;
  const arrowSpacing = 60 * scale;
  let distanceTraveled = 0;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * scale;
  
  for (let i = 1; i < loop.path.length; i++) {
    const prev = loop.path[i - 1];
    const curr = loop.path[i];
    
    const segmentLength = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    
    const isMainRun = segmentLength > 0.5;
    
    if (isMainRun && distanceTraveled % arrowSpacing < segmentLength) {
      const t = (arrowSpacing - (distanceTraveled % arrowSpacing)) / segmentLength;
      const arrowX = prev.x + (curr.x - prev.x) * t;
      const arrowY = prev.y + (curr.y - prev.y) * t;
      
      const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      
      const canvasPoint = roomToCanvas(arrowX, arrowY);
      
      ctx.save();
      ctx.translate(canvasPoint.x, canvasPoint.y);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowSize, -arrowSize * 0.5);
      ctx.lineTo(-arrowSize * 0.6, 0);
      ctx.lineTo(-arrowSize, arrowSize * 0.5);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
    
    distanceTraveled += segmentLength;
    
    if (distanceTraveled > arrowSpacing * 10) {
      distanceTraveled = 0;
    }
  }
}

// ============================================================================
// PEX LOOP GENERATION
// ============================================================================

function generatePexLoops() {
  // Preserve loop direction preferences
  const savedDirections = { ...state.loopDirections };
  
  state.loops = [];
  state.selectedLoopIndex = null;
  
  // Restore direction preferences
  state.loopDirections = savedDirections;
  
  const offsetFeet = state.pex.wallOffset / 12;
  const spacingFeet = state.pex.spacing / 12;
  const maxLength = state.pex.maxLoopLength;
  
  // Get coverage zones (respecting multiple cutouts)
  const zones = getCoverageZones(offsetFeet);
  
  if (zones.length === 0) {
    updateLoopSummary();
    updateStats();
    draw();
    return;
  }
  
  // Calculate total coverage and required loops
  let totalArea = 0;
  zones.forEach(zone => {
    totalArea += zone.width * zone.height;
  });
  
  const runsPerFoot = 12 / state.pex.spacing;
  const estimatedTotalLength = totalArea * runsPerFoot * 1.2;
  
  // Calculate optimal number of loops for 10% balance
  const numLoops = Math.max(1, Math.ceil(estimatedTotalLength / (maxLength * 0.85)));
  
  // Generate loops with proper zone coverage
  generateBalancedZoneLoops(zones, spacingFeet, maxLength, numLoops);
  
  // Verify and adjust for 10% balance
  ensureLoopBalance();
  
  updateLoopSummary();
  updateStats();
  draw();
}

function getCoverageZones(offset) {
  const w = state.room.width;
  const h = state.room.height;
  const zones = [];
  
  if (state.room.cutouts.length === 0) {
    zones.push({
      id: 'main',
      x: offset,
      y: offset,
      width: w - 2 * offset,
      height: h - 2 * offset,
      priority: getZonePriority('main')
    });
  } else {
    // For multiple cutouts, divide room into zones
    // This is a simplified approach - could be enhanced with proper polygon clipping
    const mainZone = {
      id: 'main',
      x: offset,
      y: offset,
      width: w - 2 * offset,
      height: h - 2 * offset,
      priority: 1
    };
    
    // Subtract cutouts from main zone
    zones.push(mainZone);
    
    // Add separate zones for cutout areas if they're large enough
    state.room.cutouts.forEach((cutout, idx) => {
      const cw = Math.max(0, cutout.width - offset);
      const ch = Math.max(0, cutout.height - offset);
      
      if (cw > 1 && ch > 1) {
        let cutoutZone;
        switch (cutout.corner) {
          case 'top-right':
            cutoutZone = {
              id: `cutout-${idx}`,
              x: w - cutout.width,
              y: offset,
              width: cw,
              height: ch,
              priority: 2
            };
            break;
          case 'top-left':
            cutoutZone = {
              id: `cutout-${idx}`,
              x: offset,
              y: offset,
              width: cw,
              height: ch,
              priority: 2
            };
            break;
          case 'bottom-right':
            cutoutZone = {
              id: `cutout-${idx}`,
              x: w - cutout.width,
              y: h - cutout.height,
              width: cw,
              height: ch,
              priority: 2
            };
            break;
          case 'bottom-left':
            cutoutZone = {
              id: `cutout-${idx}`,
              x: offset,
              y: h - cutout.height,
              width: cw,
              height: ch,
              priority: 2
            };
            break;
        }
        if (cutoutZone) zones.push(cutoutZone);
      }
    });
  }
  
  return zones.filter(z => z.width > 0.5 && z.height > 0.5);
}

function getZonePriority(zoneId) {
  const exteriorCount = Object.values(state.room.walls).filter(w => w === 'exterior').length;
  return exteriorCount;
}

function generateBalancedZoneLoops(zones, spacing, maxLength, targetNumLoops) {
  const manifoldPos = getManifoldPosition();
  
  // Collect all strips from all zones
  const allStrips = [];
  
  zones.forEach((zone, zoneIndex) => {
    const runDirection = zone.runDirection || (zone.width > zone.height ? 'horizontal' : 'vertical');
    
    if (runDirection === 'horizontal') {
      const numRuns = Math.max(1, Math.floor(zone.height / spacing));
      const actualSpacing = zone.height / numRuns;
      
      for (let i = 0; i < numRuns; i++) {
        const y = zone.y + (i + 0.5) * actualSpacing;
        allStrips.push({
          x1: zone.x,
          x2: zone.x + zone.width,
          y1: y,
          y2: y,
          length: zone.width,
          zoneIndex,
          direction: 'horizontal'
        });
      }
    } else {
      const numRuns = Math.max(1, Math.floor(zone.width / spacing));
      const actualSpacing = zone.width / numRuns;
      
      for (let i = 0; i < numRuns; i++) {
        const x = zone.x + (i + 0.5) * actualSpacing;
        allStrips.push({
          x1: x,
          x2: x,
          y1: zone.y,
          y2: zone.y + zone.height,
          length: zone.height,
          zoneIndex,
          direction: 'vertical'
        });
      }
    }
  });
  
  if (allStrips.length === 0) return;
  
  // Sort strips based on proximity to exterior walls
  sortStripsByExteriorPriority(allStrips);
  
  // Calculate strips per loop for balance
  const stripsPerLoop = Math.ceil(allStrips.length / targetNumLoops);
  
  // Assign strips to loops with staggered entry/exit to avoid overlap
  for (let loopIndex = 0; loopIndex < targetNumLoops; loopIndex++) {
    const startIdx = loopIndex * stripsPerLoop;
    const endIdx = Math.min(startIdx + stripsPerLoop, allStrips.length);
    
    if (startIdx >= allStrips.length) break;
    
    let loopStrips = allStrips.slice(startIdx, endIdx);
    
    // Apply loop-specific direction if set
    const preferredDirection = state.loopDirections[loopIndex];
    if (preferredDirection) {
      const zoneIndices = [...new Set(loopStrips.map(s => s.zoneIndex))];
      
      loopStrips = [];
      zoneIndices.forEach(zoneIdx => {
        const zone = zones[zoneIdx];
        if (!zone) return;
        
        if (preferredDirection === 'horizontal') {
          const numRuns = Math.max(1, Math.floor(zone.height / spacing));
          const actualSpacing = zone.height / numRuns;
          
          for (let i = 0; i < numRuns; i++) {
            const y = zone.y + (i + 0.5) * actualSpacing;
            loopStrips.push({
              x1: zone.x,
              x2: zone.x + zone.width,
              y1: y,
              y2: y,
              length: zone.width,
              zoneIndex: zoneIdx,
              direction: 'horizontal'
            });
          }
        } else {
          const numRuns = Math.max(1, Math.floor(zone.width / spacing));
          const actualSpacing = zone.width / numRuns;
          
          for (let i = 0; i < numRuns; i++) {
            const x = zone.x + (i + 0.5) * actualSpacing;
            loopStrips.push({
              x1: x,
              x2: x,
              y1: zone.y,
              y2: zone.y + zone.height,
              length: zone.height,
              zoneIndex: zoneIdx,
              direction: 'vertical'
            });
          }
        }
      });
      
      if (preferredDirection === 'horizontal') {
        loopStrips.sort((a, b) => a.y1 - b.y1);
      } else {
        loopStrips.sort((a, b) => a.x1 - b.x1);
      }
      
      const originalCount = endIdx - startIdx;
      if (loopStrips.length > originalCount) {
        loopStrips = loopStrips.slice(0, originalCount);
      }
    }
    
    const loop = createLoopFromStrips(loopStrips, spacing, manifoldPos, loopIndex, targetNumLoops);
    
    if (loop && loop.path.length > 2) {
      loop.direction = preferredDirection || loopStrips[0]?.direction || 'horizontal';
      state.loops.push(loop);
    }
  }
}

function sortStripsByExteriorPriority(strips) {
  const w = state.room.width;
  const h = state.room.height;
  
  strips.sort((a, b) => {
    const aDistTop = state.room.walls.top === 'exterior' ? Math.min(a.y1, a.y2) : Infinity;
    const aDistBottom = state.room.walls.bottom === 'exterior' ? h - Math.max(a.y1, a.y2) : Infinity;
    const aDistLeft = state.room.walls.left === 'exterior' ? Math.min(a.x1, a.x2) : Infinity;
    const aDistRight = state.room.walls.right === 'exterior' ? w - Math.max(a.x1, a.x2) : Infinity;
    const aMinDist = Math.min(aDistTop, aDistBottom, aDistLeft, aDistRight);
    
    const bDistTop = state.room.walls.top === 'exterior' ? Math.min(b.y1, b.y2) : Infinity;
    const bDistBottom = state.room.walls.bottom === 'exterior' ? h - Math.max(b.y1, b.y2) : Infinity;
    const bDistLeft = state.room.walls.left === 'exterior' ? Math.min(b.x1, b.x2) : Infinity;
    const bDistRight = state.room.walls.right === 'exterior' ? w - Math.max(b.x1, b.x2) : Infinity;
    const bMinDist = Math.min(bDistTop, bDistBottom, bDistLeft, bDistRight);
    
    return aMinDist - bMinDist;
  });
}

function createLoopFromStrips(strips, spacing, manifoldPos, loopIndex, totalLoops) {
  if (strips.length === 0) return null;
  
  const path = [];
  let currentLength = 0;
  
  const firstStrip = strips[0];
  const isHorizontal = firstStrip.direction === 'horizontal';
  
  let entryX, entryY;
  let startAtExterior = false;
  
  const w = state.room.width;
  const h = state.room.height;
  
  if (isHorizontal) {
    const leftDist = firstStrip.x1;
    const rightDist = w - firstStrip.x2;
    const leftIsExterior = state.room.walls.left === 'exterior';
    const rightIsExterior = state.room.walls.right === 'exterior';
    
    if (leftIsExterior && !rightIsExterior) {
      entryX = firstStrip.x1;
      startAtExterior = true;
    } else if (rightIsExterior && !leftIsExterior) {
      entryX = firstStrip.x2;
      startAtExterior = true;
    } else {
      entryX = (manifoldPos.x < (firstStrip.x1 + firstStrip.x2) / 2) ? firstStrip.x1 : firstStrip.x2;
    }
    entryY = firstStrip.y1;
  } else {
    const topDist = firstStrip.y1;
    const bottomDist = h - firstStrip.y2;
    const topIsExterior = state.room.walls.top === 'exterior';
    const bottomIsExterior = state.room.walls.bottom === 'exterior';
    
    if (topIsExterior && !bottomIsExterior) {
      entryY = firstStrip.y1;
      startAtExterior = true;
    } else if (bottomIsExterior && !topIsExterior) {
      entryY = firstStrip.y2;
      startAtExterior = true;
    } else {
      entryY = (manifoldPos.y < (firstStrip.y1 + firstStrip.y2) / 2) ? firstStrip.y1 : firstStrip.y2;
    }
    entryX = firstStrip.x1;
  }
  
  const offsetAmount = loopIndex * spacing * 0.3;
  path.push({ x: manifoldPos.x, y: manifoldPos.y });
  
  if (totalLoops > 1) {
    const waypointX = manifoldPos.x + (loopIndex % 2 === 0 ? offsetAmount : -offsetAmount);
    const waypointY = manifoldPos.y + (Math.floor(loopIndex / 2) * offsetAmount);
    path.push({ x: waypointX, y: waypointY });
  }
  
  let goingForward = true;
  
  if (startAtExterior) {
    if (isHorizontal) {
      goingForward = (entryX === strips[0].x1);
    } else {
      goingForward = (entryY === strips[0].y1);
    }
  }
  
  for (let i = 0; i < strips.length; i++) {
    const strip = strips[i];
    
    if (strip.direction === 'horizontal') {
      if (goingForward) {
        path.push({ x: strip.x1, y: strip.y1 });
        path.push({ x: strip.x2, y: strip.y2 });
      } else {
        path.push({ x: strip.x2, y: strip.y2 });
        path.push({ x: strip.x1, y: strip.y1 });
      }
    } else {
      if (goingForward) {
        path.push({ x: strip.x1, y: strip.y1 });
        path.push({ x: strip.x2, y: strip.y2 });
      } else {
        path.push({ x: strip.x2, y: strip.y2 });
        path.push({ x: strip.x1, y: strip.y1 });
      }
    }
    
    currentLength += strip.length;
    
    if (i < strips.length - 1) {
      const nextStrip = strips[i + 1];
      if (strip.direction === 'horizontal') {
        currentLength += Math.abs(nextStrip.y1 - strip.y1);
      } else {
        currentLength += Math.abs(nextStrip.x1 - strip.x1);
      }
    }
    
    goingForward = !goingForward;
  }
  
  const lastPoint = path[path.length - 1];
  
  if (totalLoops > 1) {
    const returnWaypointX = manifoldPos.x + (loopIndex % 2 === 0 ? -offsetAmount : offsetAmount);
    const returnWaypointY = manifoldPos.y + ((totalLoops - 1 - Math.floor(loopIndex / 2)) * offsetAmount);
    path.push({ x: returnWaypointX, y: returnWaypointY });
  }
  
  path.push({ x: manifoldPos.x, y: manifoldPos.y });
  
  let actualLength = 0;
  for (let i = 1; i < path.length; i++) {
    actualLength += Math.sqrt(
      Math.pow(path[i].x - path[i-1].x, 2) + 
      Math.pow(path[i].y - path[i-1].y, 2)
    );
  }
  
  const flowDirection = {
    startPoint: path[path.length - 2] || path[1],
    endPoint: path[path.length - 1]
  };
  
  return {
    path,
    length: Math.round(actualLength * 10) / 10,
    color: state.loopColors[loopIndex % state.loopColors.length],
    direction: strips[0]?.direction || 'horizontal',
    flowDirection: flowDirection
  };
}

function ensureLoopBalance() {
  if (state.loops.length < 2) return;
  
  const maxDeviation = 0.10;
  let iterations = 0;
  const maxIterations = 10;
  
  while (iterations < maxIterations) {
    const avgLength = state.loops.reduce((sum, l) => sum + l.length, 0) / state.loops.length;
    const maxLoop = state.loops.reduce((max, l) => l.length > max.length ? l : max, state.loops[0]);
    const minLoop = state.loops.reduce((min, l) => l.length < min.length ? l : min, state.loops[0]);
    
    const deviation = (maxLoop.length - minLoop.length) / avgLength;
    
    if (deviation <= maxDeviation) break;
    
    iterations++;
  }
}

function getManifoldPosition() {
  if (state.pex.manifoldX !== null && state.pex.manifoldY !== null) {
    return { x: state.pex.manifoldX, y: state.pex.manifoldY };
  }
  
  const w = state.room.width;
  const h = state.room.height;
  const offset = state.pex.wallOffset / 12;
  
  switch (state.pex.manifoldPosition) {
    case 'top':
      return { x: w / 2, y: offset / 2 };
    case 'bottom':
      return { x: w / 2, y: h - offset / 2 };
    case 'left':
      return { x: offset / 2, y: h / 2 };
    case 'right':
      return { x: w - offset / 2, y: h / 2 };
    case 'auto':
    default:
      if (state.room.cutouts.length === 0) {
        return { x: w / 2, y: h - offset / 2 };
      } else {
        // For rooms with cutouts, use bottom center
        return { x: w / 2, y: h - offset / 2 };
      }
  }
}

// ============================================================================
// AUTO-GENERATE
// ============================================================================

function scheduleAutoGenerate() {
  if (state.autoGenerateTimeout) {
    clearTimeout(state.autoGenerateTimeout);
  }
  
  state.autoGenerateTimeout = setTimeout(() => {
    generatePexLoops();
  }, 300);
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateArea() {
  let area = state.room.width * state.room.height;
  
  // Subtract all cutout areas
  state.room.cutouts.forEach(cutout => {
    area -= cutout.width * cutout.height;
  });
  
  elements.areaDisplay.textContent = `${Math.round(area * 10) / 10} sq ft`;
}

function updateInputsFromState() {
  elements.roomWidth.value = state.room.width;
  elements.roomHeight.value = state.room.height;
}

function updateLoopSummary() {
  if (state.loops.length === 0) {
    elements.loopSummary.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12 C8 10, 10 10, 10 12 C10 14, 12 14, 12 12 C12 10, 14 10, 14 12 C14 14, 16 14, 16 12"/>
        </svg>
        <p>Adjust room settings to generate PEX layout</p>
      </div>
    `;
    return;
  }
  
  const avgLength = state.loops.reduce((sum, l) => sum + l.length, 0) / state.loops.length;
  
  let html = '';
  state.loops.forEach((loop, index) => {
    const deviation = Math.abs(loop.length - avgLength) / avgLength * 100;
    const balanceClass = deviation <= 10 ? 'balanced' : (deviation <= 15 ? 'warning' : 'unbalanced');
    const directionIcon = loop.direction === 'horizontal' ? '↔' : '↕';
    
    html += `
      <div class="loop-item ${balanceClass}" data-index="${index}">
        <div class="loop-color clickable" style="background: ${loop.color}" onclick="openColorPicker(${index})" title="Click to change color"></div>
        <div class="loop-info">
          <span class="loop-name">Loop ${index + 1} <span class="loop-direction" title="Click to toggle direction">${directionIcon}</span></span>
          <span class="loop-length">${loop.length} ft (${deviation.toFixed(0)}%)</span>
        </div>
      </div>
    `;
  });
  
  elements.loopSummary.innerHTML = html;
  
  // Add click handlers
  document.querySelectorAll('.loop-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.loop-color')) return;
      
      if (e.target.closest('.loop-direction')) {
        const index = parseInt(item.dataset.index);
        toggleLoopDirection(index);
        return;
      }
      
      const index = parseInt(item.dataset.index);
      selectLoop(index);
    });
  });
}

function toggleLoopDirection(index) {
  const loop = state.loops[index];
  if (!loop) return;
  
  const currentDirection = state.loopDirections[index] || loop.direction || 'horizontal';
  const newDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
  state.loopDirections[index] = newDirection;
  
  generatePexLoops();
}

function updateStats() {
  elements.totalLoops.textContent = state.loops.length;
  
  const totalLength = state.loops.reduce((sum, loop) => sum + loop.length, 0);
  elements.totalLength.textContent = `${Math.round(totalLength)} ft`;
  
  let area = state.room.width * state.room.height;
  state.room.cutouts.forEach(cutout => {
    area -= cutout.width * cutout.height;
  });
  elements.coverageArea.textContent = `${Math.round(area)} sq ft`;
  
  elements.manifoldPorts.textContent = state.loops.length * 2;
}

function selectLoop(index) {
  state.selectedLoopIndex = state.selectedLoopIndex === index ? null : index;
  
  document.querySelectorAll('.loop-item').forEach((item, i) => {
    item.classList.toggle('selected', i === state.selectedLoopIndex);
  });
  
  draw();
}

// ============================================================================
// WALL TYPE CONTROLS
// ============================================================================

function updateWallTypeControls() {
  const container = document.getElementById('wallTypeControls');
  if (!container) return;
  
  let html = '';
  ['top', 'right', 'bottom', 'left'].forEach(side => {
    const isExterior = state.room.walls[side] === 'exterior';
    html += `
      <div class="wall-type-item" data-side="${side}">
        <span class="wall-side">${side.charAt(0).toUpperCase() + side.slice(1)}</span>
        <button class="wall-type-btn ${isExterior ? 'exterior' : 'interior'}" onclick="toggleWallType('${side}')">
          ${isExterior ? 'EXT' : 'INT'}
        </button>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function toggleWallType(side) {
  state.room.walls[side] = state.room.walls[side] === 'exterior' ? 'interior' : 'exterior';
  updateWallTypeControls();
  generatePexLoops();
  draw();
}

window.toggleWallType = toggleWallType;

// ============================================================================
// COLLAPSIBLE PANELS
// ============================================================================

function setupCollapsiblePanels() {
  document.querySelectorAll('.panel-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      
      const panel = header.closest('.panel');
      panel.classList.toggle('collapsed');
    });
  });
}

// ============================================================================
// COLOR PICKER
// ============================================================================

let currentColorEditIndex = null;

function openColorPicker(loopIndex) {
  currentColorEditIndex = loopIndex;
  const currentColor = state.loops[loopIndex].color;
  
  let gridHtml = '';
  state.presetColors.forEach(color => {
    const isSelected = color.toLowerCase() === currentColor.toLowerCase();
    gridHtml += `<button style="background: ${color}" class="${isSelected ? 'selected' : ''}" onclick="selectPresetColor('${color}')"></button>`;
  });
  elements.colorGrid.innerHTML = gridHtml;
  
  elements.customColor.value = currentColor;
  elements.colorModal.classList.add('show');
}

function closeColorPicker() {
  elements.colorModal.classList.remove('show');
  currentColorEditIndex = null;
}

function selectPresetColor(color) {
  document.querySelectorAll('.color-grid button').forEach(btn => {
    btn.classList.toggle('selected', btn.style.background === color);
  });
  elements.customColor.value = color;
}

window.selectPresetColor = selectPresetColor;

function applyColorChange() {
  if (currentColorEditIndex !== null) {
    state.loops[currentColorEditIndex].color = elements.customColor.value;
    updateLoopSummary();
    draw();
  }
  closeColorPicker();
}

window.openColorPicker = openColorPicker;

// ============================================================================
// DRAG HANDLING
// ============================================================================

function getHandleAtPosition(canvasX, canvasY) {
  const manifoldPos = getManifoldPosition();
  const manifoldCanvas = roomToCanvas(manifoldPos.x, manifoldPos.y);
  const manifoldDist = Math.sqrt(
    Math.pow(canvasX - manifoldCanvas.x, 2) + 
    Math.pow(canvasY - manifoldCanvas.y, 2)
  );
  
  if (manifoldDist <= MANIFOLD_HANDLE_SIZE + 10) {
    return { x: manifoldPos.x, y: manifoldPos.y, type: 'manifold', cursor: 'move' };
  }
  
  const handles = getResizeHandles();
  
  for (const handle of handles) {
    const canvasPoint = roomToCanvas(handle.x, handle.y);
    const dist = Math.sqrt(Math.pow(canvasX - canvasPoint.x, 2) + Math.pow(canvasY - canvasPoint.y, 2));
    
    if (dist <= HANDLE_SIZE + 5) {
      return handle;
    }
  }
  
  const walls = getWallSegments();
  for (const wall of walls) {
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    const canvasPoint = roomToCanvas(midX, midY);
    
    let labelX = canvasPoint.x;
    let labelY = canvasPoint.y;
    const labelOffset = 20;
    
    if (wall.side === 'top') labelY -= labelOffset;
    else if (wall.side === 'bottom') labelY += labelOffset;
    else if (wall.side === 'left') labelX -= labelOffset;
    else if (wall.side === 'right') labelX += labelOffset;
    
    const dist = Math.sqrt(Math.pow(canvasX - labelX, 2) + Math.pow(canvasY - labelY, 2));
    if (dist <= 20) {
      return { type: 'wall-type', side: wall.side, cursor: 'pointer' };
    }
  }
  
  return null;
}

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  
  const handle = getHandleAtPosition(canvasX, canvasY);
  
  if (handle) {
    if (handle.type === 'wall-type') {
      toggleWallType(handle.side);
      return;
    }
    
    state.isDragging = true;
    state.dragType = handle.type;
    state.dragStart = canvasToRoom(canvasX, canvasY);
    canvas.style.cursor = handle.cursor;
    return;
  }
  
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    state.isDragging = true;
    state.dragType = 'pan';
    state.dragStart = { x: canvasX, y: canvasY };
    canvas.style.cursor = 'grabbing';
  }
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  const roomPos = canvasToRoom(canvasX, canvasY);
  
  const x = Math.max(0, Math.min(state.room.width, roomPos.x));
  const y = Math.max(0, Math.min(state.room.height, roomPos.y));
  elements.mousePos.textContent = `X: ${x.toFixed(1)} ft, Y: ${y.toFixed(1)} ft`;
  
  if (state.isDragging) {
    switch (state.dragType) {
      case 'pan':
        state.pan.x += e.movementX;
        state.pan.y += e.movementY;
        draw();
        break;
        
      case 'manifold':
        const offset = state.pex.wallOffset / 12;
        state.pex.manifoldX = Math.max(offset, Math.min(state.room.width - offset, roomPos.x));
        state.pex.manifoldY = Math.max(offset, Math.min(state.room.height - offset, roomPos.y));
        state.pex.manifoldPosition = 'custom';
        
        document.querySelectorAll('input[name="manifold"]').forEach(r => r.checked = false);
        
        scheduleAutoGenerate();
        draw();
        break;
        
      case 'resize-width':
        state.room.width = Math.max(5, Math.round(roomPos.x * 2) / 2);
        updateInputsFromState();
        updateArea();
        scheduleAutoGenerate();
        draw();
        break;
        
      case 'resize-height':
        state.room.height = Math.max(5, Math.round(roomPos.y * 2) / 2);
        updateInputsFromState();
        updateArea();
        scheduleAutoGenerate();
        draw();
        break;
        
      case 'resize-corner':
        state.room.width = Math.max(5, Math.round(roomPos.x * 2) / 2);
        state.room.height = Math.max(5, Math.round(roomPos.y * 2) / 2);
        updateInputsFromState();
        updateArea();
        scheduleAutoGenerate();
        draw();
        break;
    }
  } else {
    const handle = getHandleAtPosition(canvasX, canvasY);
    canvas.style.cursor = handle ? handle.cursor : 'crosshair';
  }
}

function handleMouseUp() {
  if (state.isDragging && state.dragType !== 'pan') {
    generatePexLoops();
  }
  
  state.isDragging = false;
  state.dragType = null;
  state.dragStart = null;
  canvas.style.cursor = 'crosshair';
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupEventListeners() {
  elements.roomWidth.addEventListener('change', (e) => {
    state.room.width = parseFloat(e.target.value) || 20;
    updateArea();
    scheduleAutoGenerate();
    draw();
  });
  
  elements.roomHeight.addEventListener('change', (e) => {
    state.room.height = parseFloat(e.target.value) || 15;
    updateArea();
    scheduleAutoGenerate();
    draw();
  });
  
  elements.addCornerBtn.addEventListener('click', addCutout);
  
  document.querySelectorAll('input[name="spacing"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.pex.spacing = parseInt(e.target.value);
      scheduleAutoGenerate();
    });
  });
  
  elements.maxLoopLength.addEventListener('change', (e) => {
    state.pex.maxLoopLength = parseInt(e.target.value) || 300;
    scheduleAutoGenerate();
  });
  
  elements.wallOffset.addEventListener('change', (e) => {
    state.pex.wallOffset = parseInt(e.target.value) || 6;
    scheduleAutoGenerate();
    draw();
  });
  
  document.querySelectorAll('input[name="manifold"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.pex.manifoldPosition = e.target.value;
      state.pex.manifoldX = null;
      state.pex.manifoldY = null;
      scheduleAutoGenerate();
    });
  });
  
  elements.newRoomBtn.addEventListener('click', () => {
    state.room = {
      width: 20,
      height: 15,
      cutouts: [],
      walls: { top: 'exterior', right: 'exterior', bottom: 'exterior', left: 'exterior' }
    };
    state.loops = [];
    state.loopDirections = {};
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    state.pex.manifoldX = null;
    state.pex.manifoldY = null;
    state.pex.manifoldPosition = 'auto';
    
    elements.roomWidth.value = 20;
    elements.roomHeight.value = 15;
    elements.zoomLevel.textContent = '100%';
    
    document.querySelector('input[name="manifold"][value="auto"]').checked = true;
    
    updateArea();
    updateCutoutList();
    updateWallTypeControls();
    updateLoopSummary();
    updateStats();
    scheduleAutoGenerate();
    draw();
    showToast('New room created', 'success');
  });
  
  elements.generatePexBtn.addEventListener('click', generatePexLoops);
  
  elements.exportBtn.addEventListener('click', exportDesign);
  
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  elements.zoomInBtn.addEventListener('click', () => {
    state.zoom = Math.min(state.zoom * 1.2, 3);
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
    draw();
  });
  
  elements.zoomOutBtn.addEventListener('click', () => {
    state.zoom = Math.max(state.zoom / 1.2, 0.25);
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
    draw();
  });
  
  elements.resetZoomBtn.addEventListener('click', () => {
    state.zoom = 1;
    state.pan = { x: 0, y: 0 };
    elements.zoomLevel.textContent = '100%';
    draw();
  });
  
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.zoom = Math.max(0.25, Math.min(3, state.zoom * delta));
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
    draw();
  });
  
  elements.closeModal.addEventListener('click', closeColorPicker);
  elements.cancelColor.addEventListener('click', closeColorPicker);
  elements.applyColor.addEventListener('click', applyColorChange);
  
  elements.colorModal.addEventListener('click', (e) => {
    if (e.target === elements.colorModal) {
      closeColorPicker();
    }
  });
  
  window.addEventListener('resize', resizeCanvas);
}

// ============================================================================
// THEME
// ============================================================================

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  
  document.getElementById('sunIcon').style.display = isLight ? 'none' : 'block';
  document.getElementById('moonIcon').style.display = isLight ? 'block' : 'none';
  
  draw();
}

// ============================================================================
// EXPORT
// ============================================================================

function exportDesign() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  
  const margin = 60;
  const scale = 20;
  const width = state.room.width * scale + margin * 2;
  const height = state.room.height * scale + margin * 2;
  
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns', svgNS);
  
  const bg = document.createElementNS(svgNS, 'rect');
  bg.setAttribute('width', width);
  bg.setAttribute('height', height);
  bg.setAttribute('fill', '#ffffff');
  svg.appendChild(bg);
  
  const roomPath = getRoomPath();
  const pathData = roomPath.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${margin + p.x * scale} ${margin + p.y * scale}`
  ).join(' ') + ' Z';
  
  const room = document.createElementNS(svgNS, 'path');
  room.setAttribute('d', pathData);
  room.setAttribute('fill', '#f5f5f5');
  room.setAttribute('stroke', '#333333');
  room.setAttribute('stroke-width', '2');
  svg.appendChild(room);
  
  state.loops.forEach((loop) => {
    if (loop.path && loop.path.length > 1) {
      let pathStr = loop.path.map((p, i) => {
        const px = margin + p.x * scale;
        const py = margin + p.y * scale;
        return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
      }).join(' ');
      
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', pathStr);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', loop.color);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
    }
  });
  
  const mPos = getManifoldPosition();
  const manifold = document.createElementNS(svgNS, 'rect');
  manifold.setAttribute('x', margin + mPos.x * scale - 20);
  manifold.setAttribute('y', margin + mPos.y * scale - 12);
  manifold.setAttribute('width', 40);
  manifold.setAttribute('height', 24);
  manifold.setAttribute('rx', 4);
  manifold.setAttribute('fill', '#2196F3');
  manifold.setAttribute('stroke', '#1565C0');
  svg.appendChild(manifold);
  
  const mLabel = document.createElementNS(svgNS, 'text');
  mLabel.setAttribute('x', margin + mPos.x * scale);
  mLabel.setAttribute('y', margin + mPos.y * scale + 4);
  mLabel.setAttribute('text-anchor', 'middle');
  mLabel.setAttribute('fill', 'white');
  mLabel.setAttribute('font-size', '12');
  mLabel.setAttribute('font-weight', 'bold');
  mLabel.setAttribute('font-family', 'Arial');
  mLabel.textContent = 'M';
  svg.appendChild(mLabel);
  
  const walls = getWallSegments();
  walls.forEach(wall => {
    const length = Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2));
    if (length < 1) return;
    
    const midX = (wall.x1 + wall.x2) / 2;
    const midY = (wall.y1 + wall.y2) / 2;
    
    let labelX = margin + midX * scale;
    let labelY = margin + midY * scale;
    const labelOffset = 25;
    
    const isHorizontal = Math.abs(wall.y2 - wall.y1) < 0.01;
    
    if (isHorizontal) {
      labelY += (midY < state.room.height / 2) ? -labelOffset : labelOffset;
    } else {
      labelX += (midX < state.room.width / 2) ? -labelOffset : labelOffset;
    }
    
    const dimText = document.createElementNS(svgNS, 'text');
    dimText.setAttribute('x', labelX);
    dimText.setAttribute('y', labelY);
    dimText.setAttribute('text-anchor', 'middle');
    dimText.setAttribute('fill', '#333');
    dimText.setAttribute('font-size', '10');
    dimText.setAttribute('font-family', 'Arial');
    dimText.textContent = `${length.toFixed(1)}'`;
    svg.appendChild(dimText);
  });
  
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `pex-design-${Date.now()}.svg`;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('Design exported as SVG!', 'success');
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function showToast(message, type = 'success') {
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  resizeCanvas();
  setupEventListeners();
  setupCollapsiblePanels();
  updateArea();
  updateCutoutList();
  updateWallTypeControls();
  draw();
  
  setTimeout(() => {
    generatePexLoops();
  }, 100);
  
  elements.statusMessage.textContent = 'Ready';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
