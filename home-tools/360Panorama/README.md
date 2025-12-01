# 360° Panorama Viewer

A beautiful, locally-hosted 360° panorama viewer built with [Marzipano](https://www.marzipano.net/).

## Features

- 🖼️ **Drag & Drop Support** - Simply drag your equirectangular panorama images onto the viewer
- 🎯 **Interactive Hotspots** - Add clickable markers to your panoramas
- 🔄 **Autorotate** - Automatic rotation for hands-free viewing
- 🖥️ **Fullscreen Mode** - Immersive fullscreen experience
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Dark theme with cyan accents

## Quick Start

### Option 1: Python HTTP Server (Recommended)

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000 in your browser.

### Option 2: Node.js

```bash
# Install a simple server
npx serve

# Or with http-server
npx http-server
```

### Option 3: VS Code Live Server

If you use VS Code, install the "Live Server" extension and click "Go Live" in the status bar.

## Usage

### Loading a Panorama

1. **Drag & Drop**: Drag an equirectangular panorama image onto the upload zone
2. **Click to Browse**: Click the upload zone to open a file picker
3. **Demo Mode**: Click "Load Sample Panorama" to see a procedurally generated demo

### Controls

| Action | Mouse/Touch | Keyboard |
|--------|------------|----------|
| Look Around | Drag | - |
| Zoom | Scroll wheel | `+` / `-` |
| Reset View | - | `H` |
| Toggle Autorotate | - | `Space` |
| Fullscreen | - | `F` |

### Hotspots

1. Navigate to the position where you want to add a hotspot
2. Click the "+ Add" button in the Hotspots panel
3. Click on hotspots to interact with them

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

**Note**: Images must be in equirectangular format (2:1 aspect ratio recommended).

## File Structure

```
marzipano/
├── index.html      # Main HTML file
├── style.css       # Styles
├── app.js          # Application logic
├── marzipano.js    # Marzipano library
└── README.md       # This file
```

## Sample Panoramas

You can find free equirectangular panoramas at:
- [Poly Haven](https://polyhaven.com/hdris)
- [HDRIHaven](https://hdrihaven.com/) (HDR images)
- [Flickr Equirectangular Group](https://www.flickr.com/groups/equirectangular/)

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## License

Marzipano is licensed under the Apache License 2.0.

