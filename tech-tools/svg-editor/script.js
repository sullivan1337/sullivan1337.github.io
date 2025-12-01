// Sample SVG templates
const sampleRectangle = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" x="50" y="50" fill="red" />
</svg>`;

const sampleMoonScene = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Background -->
  <defs>
    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1b26;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#24283b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#c0caf5;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#c0caf5;stop-opacity:0" />
    </linearGradient>
  </defs>
  
  <!-- Sky background -->
  <rect width="400" height="300" fill="url(#skyGradient)"/>
  
  <!-- Stars -->
  <circle cx="50" cy="40" r="1.5" fill="#7aa2f7" opacity="0.8"/>
  <circle cx="120" cy="60" r="1" fill="#bb9af7" opacity="0.6"/>
  <circle cx="200" cy="30" r="1.5" fill="#7aa2f7" opacity="0.9"/>
  <circle cx="280" cy="50" r="1" fill="#c0caf5" opacity="0.7"/>
  <circle cx="350" cy="35" r="1.5" fill="#bb9af7" opacity="0.8"/>
  <circle cx="80" cy="90" r="1" fill="#7aa2f7" opacity="0.5"/>
  <circle cx="320" cy="80" r="1" fill="#c0caf5" opacity="0.6"/>
  
  <!-- Moon glow -->
  <circle cx="320" cy="70" r="50" fill="url(#moonGlow)"/>
  
  <!-- Moon -->
  <circle cx="320" cy="70" r="25" fill="#c0caf5"/>
  <circle cx="330" cy="65" r="20" fill="#24283b"/>
  
  <!-- Mountains -->
  <polygon points="0,300 100,150 200,300" fill="#3b4261"/>
  <polygon points="100,300 200,120 300,300" fill="#2f3549"/>
  <polygon points="200,300 320,160 400,300" fill="#3b4261"/>
  
  <!-- Trees silhouette -->
  <polygon points="50,300 60,240 70,300" fill="#1a1b26"/>
  <polygon points="80,300 95,220 110,300" fill="#1a1b26"/>
  <polygon points="340,300 355,250 370,300" fill="#1a1b26"/>
  
  <!-- Text -->
  <text x="200" y="280" 
        font-family="system-ui, sans-serif" 
        font-size="14" 
        fill="#7aa2f7" 
        text-anchor="middle"
        opacity="0.8">
    Edit this SVG code →
  </text>
</svg>`;

// Default to rectangle
const defaultSVG = sampleRectangle;

// SVG Elements for auto-completion
const svgElements = [
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
  'text', 'tspan', 'textPath', 'image',
  'linearGradient', 'radialGradient', 'stop', 'pattern',
  'clipPath', 'mask', 'filter',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDropShadow', 'feFlood', 'feFuncR', 'feFuncG', 'feFuncB', 'feFuncA',
  'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight',
  'feTile', 'feTurbulence',
  'animate', 'animateMotion', 'animateTransform', 'set', 'mpath',
  'marker', 'switch', 'foreignObject', 'a'
];

// Common SVG attributes
const svgAttributes = {
  global: ['id', 'class', 'style', 'transform', 'opacity', 'fill', 'stroke', 'stroke-width'],
  svg: ['xmlns', 'viewBox', 'width', 'height', 'preserveAspectRatio'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
  path: ['d', 'pathLength'],
  text: ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-family', 'font-size', 'font-weight'],
  linearGradient: ['x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
  radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform'],
  stop: ['offset', 'stop-color', 'stop-opacity'],
  image: ['href', 'x', 'y', 'width', 'height', 'preserveAspectRatio'],
  use: ['href', 'x', 'y', 'width', 'height'],
  filter: ['x', 'y', 'width', 'height', 'filterUnits', 'primitiveUnits'],
  feGaussianBlur: ['in', 'stdDeviation', 'result'],
  feOffset: ['in', 'dx', 'dy', 'result'],
  feDropShadow: ['dx', 'dy', 'stdDeviation', 'flood-color', 'flood-opacity'],
  animate: ['attributeName', 'from', 'to', 'dur', 'repeatCount', 'fill', 'begin', 'end'],
  animateTransform: ['attributeName', 'type', 'from', 'to', 'dur', 'repeatCount'],
  marker: ['viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient']
};

let editor;
let zoomLevel = 100;
const MIN_ZOOM = 25;
const MAX_ZOOM = 400;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
  // Register SVG completion provider
  monaco.languages.registerCompletionItemProvider('xml', {
    triggerCharacters: ['<', ' ', '"'],
    provideCompletionItems: function(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      
      const lineContent = model.getLineContent(position.lineNumber);
      const lineUntilPosition = lineContent.substring(0, position.column - 1);
      
      const suggestions = [];
      
      // Check if we're inside a tag (for attributes)
      const tagMatch = lineUntilPosition.match(/<(\w+)(?:\s+[^>]*)?$/);
      if (tagMatch) {
        const tagName = tagMatch[1];
        const attrs = [...(svgAttributes[tagName] || []), ...svgAttributes.global];
        
        attrs.forEach(attr => {
          suggestions.push({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr}="$1"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `SVG attribute: ${attr}`
          });
        });
      }
      // Check if we should suggest elements
      else if (lineUntilPosition.endsWith('<') || lineUntilPosition.match(/<$/)) {
        svgElements.forEach(el => {
          suggestions.push({
            label: el,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: el,
            documentation: `SVG element: <${el}>`
          });
        });
      }
      
      return { suggestions };
    }
  });

  // Create editor
  const isDark = document.body.classList.contains('dark-mode');
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: defaultSVG,
    language: 'xml',
    theme: isDark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    formatOnPaste: true,
    formatOnType: true,
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    bracketPairColorization: { enabled: true },
    padding: { top: 16 }
  });

  // Update preview on content change
  editor.onDidChangeModelContent(debounce(updatePreview, 150));
  
  // Update cursor position
  editor.onDidChangeCursorPosition((e) => {
    document.getElementById('cursorPosition').textContent = 
      `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
  });

  // Initial preview
  updatePreview();
});

// Update SVG preview
function updatePreview() {
  const svgCode = editor.getValue();
  const previewEl = document.getElementById('preview');
  const parseStatus = document.getElementById('parseStatus');
  const svgSize = document.getElementById('svgSize');
  
  try {
    // Parse SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const errorNode = doc.querySelector('parsererror');
    
    if (errorNode) {
      throw new Error('Invalid SVG');
    }
    
    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
      throw new Error('No SVG element found');
    }
    
    // Update preview
    previewEl.innerHTML = svgCode;
    
    // Apply zoom
    previewEl.style.transform = `scale(${zoomLevel / 100})`;
    
    // Update status
    parseStatus.textContent = '✓ Valid SVG';
    parseStatus.className = 'status-ok';
    
    // Get size info
    const width = svgEl.getAttribute('width') || svgEl.viewBox?.baseVal?.width || 'auto';
    const height = svgEl.getAttribute('height') || svgEl.viewBox?.baseVal?.height || 'auto';
    svgSize.textContent = `${width} × ${height}`;
    
  } catch (e) {
    parseStatus.textContent = '✗ ' + e.message;
    parseStatus.className = 'status-error';
  }
}

// Debounce utility
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Show toast notification
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = type === 'success' 
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${message}`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${message}`;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('sunIcon').style.display = isDark ? 'block' : 'none';
  document.getElementById('moonIcon').style.display = isDark ? 'none' : 'block';
  
  if (editor) {
    monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
  }
});

// New SVG
document.getElementById('newBtn').addEventListener('click', () => {
  const newSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Your SVG content here -->
  <rect x="50" y="50" width="300" height="200" fill="#7aa2f7" rx="10"/>
</svg>`;
  editor.setValue(newSVG);
  showToast('New SVG created');
});

// Load file
document.getElementById('loadBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      editor.setValue(event.target.result);
      showToast(`Loaded: ${file.name}`);
    };
    reader.readAsText(file);
  }
});

// Download SVG
document.getElementById('downloadBtn').addEventListener('click', () => {
  const svgCode = editor.getValue();
  const blob = new Blob([svgCode], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawing.svg';
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('SVG downloaded');
});

// Copy code
document.getElementById('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(editor.getValue());
    showToast('Copied to clipboard');
  } catch (e) {
    showToast('Failed to copy', 'error');
  }
});

// Format code
document.getElementById('formatBtn').addEventListener('click', () => {
  editor.getAction('editor.action.formatDocument').run();
  showToast('Code formatted');
});

// Background toggle
document.getElementById('bgToggle').addEventListener('change', (e) => {
  const wrapper = document.getElementById('preview-wrapper');
  if (e.target.checked) {
    wrapper.classList.add('grid-bg');
  } else {
    wrapper.classList.remove('grid-bg');
  }
});

// Initialize grid background
document.getElementById('preview-wrapper').classList.add('grid-bg');

// Zoom controls
document.getElementById('zoomInBtn').addEventListener('click', () => {
  if (zoomLevel < MAX_ZOOM) {
    zoomLevel = Math.min(zoomLevel + 25, MAX_ZOOM);
    updateZoom();
  }
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
  if (zoomLevel > MIN_ZOOM) {
    zoomLevel = Math.max(zoomLevel - 25, MIN_ZOOM);
    updateZoom();
  }
});

document.getElementById('resetZoomBtn').addEventListener('click', () => {
  zoomLevel = 100;
  updateZoom();
});

function updateZoom() {
  document.getElementById('zoomLevel').textContent = `${zoomLevel}%`;
  document.getElementById('preview').style.transform = `scale(${zoomLevel / 100})`;
}

// Resizer functionality
const resizer = document.getElementById('resizer');
const editorPanel = document.querySelector('.editor-panel');
const previewPanel = document.querySelector('.preview-panel');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  resizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  
  const container = document.querySelector('.editor-container');
  const containerRect = container.getBoundingClientRect();
  const newEditorWidth = e.clientX - containerRect.left;
  
  const minWidth = 300;
  const maxWidth = containerRect.width - 300;
  
  if (newEditorWidth >= minWidth && newEditorWidth <= maxWidth) {
    const percentage = (newEditorWidth / containerRect.width) * 100;
    editorPanel.style.flex = `0 0 ${percentage}%`;
    previewPanel.style.flex = `1`;
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// Mouse wheel zoom in preview
document.getElementById('preview-wrapper').addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0 && zoomLevel < MAX_ZOOM) {
      zoomLevel = Math.min(zoomLevel + 10, MAX_ZOOM);
    } else if (e.deltaY > 0 && zoomLevel > MIN_ZOOM) {
      zoomLevel = Math.max(zoomLevel - 10, MIN_ZOOM);
    }
    updateZoom();
  }
}, { passive: false });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S = Download
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('downloadBtn').click();
  }
  // Ctrl/Cmd + Shift + C = Copy
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    document.getElementById('copyBtn').click();
  }
});

// Sample toggle buttons
const sampleRectBtn = document.getElementById('sampleRectBtn');
const sampleMoonBtn = document.getElementById('sampleMoonBtn');

sampleRectBtn.addEventListener('click', () => {
  editor.setValue(sampleRectangle);
  sampleRectBtn.classList.add('active');
  sampleMoonBtn.classList.remove('active');
  showToast('Loaded: Rectangle sample');
});

sampleMoonBtn.addEventListener('click', () => {
  editor.setValue(sampleMoonScene);
  sampleMoonBtn.classList.add('active');
  sampleRectBtn.classList.remove('active');
  showToast('Loaded: Moon Scene sample');
});

