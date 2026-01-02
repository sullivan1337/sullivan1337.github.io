// File handling
let filesToProcess = [];
let processedFiles = [];

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const filesResultsSection = document.getElementById('filesResultsSection');
const controlsSection = document.getElementById('controlsSection');
const resultsList = document.getElementById('resultsList');
const processAllBtn = document.getElementById('processAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const bulkDownloadBtn = document.getElementById('bulkDownloadBtn');
const sanitizeNamesCheckbox = document.getElementById('sanitizeNames');
const autoProcessCheckbox = document.getElementById('autoProcess');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');

// Supported file types
const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

// Initialize
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('drop', handleDrop);
dropZone.addEventListener('dragleave', handleDragLeave);
fileInput.addEventListener('change', handleFileSelect);
processAllBtn.addEventListener('click', processAllFiles);
clearAllBtn.addEventListener('click', clearAll);
bulkDownloadBtn.addEventListener('click', downloadAllFiles);

// Initialize UI state
processAllBtn.disabled = true;
sanitizeNamesCheckbox.checked = true; // Enable by default

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragover');
  
  const items = e.dataTransfer.items;
  
  // Handle folder drops and file drops using DataTransferItem API
  if (items && items.length > 0) {
    const filePromises = [];
    const directFiles = [];
    
    for (let item of items) {
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory) {
            filePromises.push(scanEntry(entry));
          } else if (entry.isFile) {
            const filePromise = new Promise((resolve) => {
              entry.file((file) => {
                if (isSupportedFile(file)) {
                  directFiles.push(file);
                }
                resolve();
              });
            });
            filePromises.push(filePromise);
          }
        }
      } else {
        // Fallback for browsers without webkitGetAsEntry
        const file = item.getAsFile();
        if (file && isSupportedFile(file)) {
          directFiles.push(file);
        }
      }
    }
    
    await Promise.all(filePromises);
    if (directFiles.length > 0) {
      filesToProcess.push(...directFiles);
      updateFilesList();
      updateUI();
      
      // Auto-process files if option is enabled
      if (autoProcessCheckbox.checked) {
        await autoProcessFiles(directFiles);
      }
    }
  } else {
    // Fallback: use files from dataTransfer
    const files = Array.from(e.dataTransfer.files);
    await addFiles(files);
  }
}

function scanEntry(entry) {
  return new Promise(async (resolve) => {
    if (entry.isFile) {
      entry.file(async (file) => {
        if (isSupportedFile(file)) {
          filesToProcess.push(file);
          updateFilesList();
          updateUI();
          // Auto-process this file immediately if option is enabled
          if (autoProcessCheckbox.checked) {
            await autoProcessFiles([file]);
          }
        }
        resolve();
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      reader.readEntries(async (entries) => {
        await Promise.all(entries.map(scanEntry));
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

function isSupportedFile(file) {
  const type = file.type.toLowerCase();
  return imageTypes.includes(type) || videoTypes.includes(type) || 
         /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi)$/i.test(file.name);
}

async function addFiles(newFiles) {
  const validFiles = newFiles.filter(isSupportedFile);
  if (validFiles.length === 0) {
    alert('No supported files found. Please select images (JPG, PNG, GIF, WebP) or videos (MP4, WebM, MOV).');
    return;
  }
  
  filesToProcess.push(...validFiles);
  updateFilesList();
  updateUI();
  
  // Auto-process files as they are added if option is enabled
  if (autoProcessCheckbox.checked) {
    await autoProcessFiles(validFiles);
  }
}

function updateFilesList() {
  filesList.innerHTML = '';
  filesToProcess.forEach((file, index) => {
    const fileItem = createFileItem(file, index);
    filesList.appendChild(fileItem);
  });
}

function createFileItem(file, index) {
  const item = document.createElement('div');
  item.className = 'file-item';
  
  const icon = imageTypes.includes(file.type) ? '🖼️' : '🎥';
  const size = formatFileSize(file.size);
  const isImage = imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  
  // Create thumbnail for images
  let thumbnailHTML = '';
  if (isImage) {
    const thumbnailUrl = URL.createObjectURL(file);
    thumbnailHTML = `<img src="${thumbnailUrl}" alt="Thumbnail" class="file-thumbnail" onload="URL.revokeObjectURL(this.src)" />`;
  } else {
    thumbnailHTML = `<span class="file-icon">${icon}</span>`;
  }
  
  item.innerHTML = `
    <div class="file-info" onclick="showFileMetadata(${index}, 'original')" style="cursor: pointer;">
      ${thumbnailHTML}
      <div class="file-details">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">${size} • ${file.type || 'Unknown type'}</div>
      </div>
    </div>
    <button class="btn-remove" onclick="event.stopPropagation(); removeFile(${index})" title="Remove">×</button>
  `;
  
  return item;
}

function removeFile(index) {
  filesToProcess.splice(index, 1);
  updateFilesList();
  updateUI();
}

function updateUI() {
  if (filesToProcess.length > 0) {
    filesResultsSection.style.display = 'grid';
  } else {
    filesResultsSection.style.display = 'none';
  }
  
  // Controls are always visible now, but disable process button if no files
  if (filesToProcess.length === 0) {
    processAllBtn.disabled = true;
  } else {
    processAllBtn.disabled = false;
  }
  
  // Show/hide bulk download button
  if (processedFiles.length > 0) {
    bulkDownloadBtn.style.display = 'inline-flex';
  } else {
    bulkDownloadBtn.style.display = 'none';
  }
}

function clearAll() {
  if (confirm('Clear all files?')) {
    filesToProcess = [];
    processedFiles = [];
    updateFilesList();
    updateUI();
    resultsList.innerHTML = '';
    updateProgress(0, 0);
  }
}

async function autoProcessFiles(files) {
  // Ensure results section is visible
  if (files.length > 0) {
    filesResultsSection.style.display = 'grid';
  }
  
  const shouldSanitize = sanitizeNamesCheckbox.checked;
  
  // Get current counts for sequential naming
  const currentImageCount = processedFiles.filter(f => f.type === 'image').length;
  const currentVideoCount = processedFiles.filter(f => f.type === 'video').length;
  
  let imageCount = currentImageCount;
  let videoCount = currentVideoCount;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const globalIndex = filesToProcess.indexOf(file);
    
    try {
      // Determine file type for sequential naming
      const type = file.type.toLowerCase();
      const isImage = imageTypes.includes(type) || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      const isVideo = videoTypes.includes(type) || /\.(mp4|webm|mov|avi)$/i.test(file.name);
      
      let fileType = 'image';
      let fileIndex = 0;
      
      if (isImage) {
        imageCount++;
        fileIndex = imageCount;
        fileType = 'image';
      } else if (isVideo) {
        videoCount++;
        fileIndex = videoCount;
        fileType = 'video';
      }
      
      const processed = await processFile(file, shouldSanitize, fileType, fileIndex);
      processedFiles.push(processed);
      addResultItem(processed, processedFiles.length - 1);
      updateUI();
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      addErrorItem(file, error.message);
    }
  }
}

async function processAllFiles() {
  if (filesToProcess.length === 0) return;
  
  // Process all unprocessed files
  const unprocessedFiles = filesToProcess.filter((file, index) => {
    // Check if this file has already been processed
    return !processedFiles.some(pf => pf.original === file);
  });
  
  if (unprocessedFiles.length === 0) {
    // All files already processed
    return;
  }
  
  await autoProcessFiles(unprocessedFiles);
}

function updateProgress(current, total) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total} files processed`;
}

function sanitizeFileName(fileName, fileType, index) {
  // Get file extension from original filename
  const lastDot = fileName.lastIndexOf('.');
  const extension = lastDot > 0 ? fileName.substring(lastDot) : '';
  
  // Determine base name based on file type
  const baseName = fileType === 'image' ? 'image' : 'video';
  
  // Return sequential name: image1.jpg, image2.png, video1.mp4, etc.
  return `${baseName}${index}${extension}`;
}

async function processFile(file, shouldSanitize = false, fileType = 'image', fileIndex = 1) {
  const type = file.type.toLowerCase();
  
  if (imageTypes.includes(type) || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
    return await processImage(file, shouldSanitize, fileType, fileIndex);
  } else if (videoTypes.includes(type) || /\.(mp4|webm|mov|avi)$/i.test(file.name)) {
    return await processVideo(file, shouldSanitize, fileType, fileIndex);
  } else {
    throw new Error('Unsupported file type');
  }
}

async function processImage(file, shouldSanitize = false, fileType = 'image', fileIndex = 1) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Draw image to canvas (this strips metadata)
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob
        const outputType = file.type || 'image/png';
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          let fileName = file.name;
          if (shouldSanitize) {
            fileName = sanitizeFileName(file.name, fileType, fileIndex);
          }
          
          const processedFile = new File([blob], fileName, {
            type: outputType,
            lastModified: Date.now()
          });
          
          resolve({
            original: file,
            processed: processedFile,
            type: 'image',
            size: file.size,
            newSize: blob.size
          });
        }, outputType, 0.95);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function processVideo(file, shouldSanitize = false, fileType = 'video', fileIndex = 1) {
  // Video metadata removal is complex and typically requires server-side processing
  // or specialized libraries. For client-side, we'll provide the file with a note.
  // The browser's File API doesn't provide easy access to video metadata to remove it.
  
  // Note: True video metadata removal would require:
  // - Parsing the video container format (MP4, WebM, etc.)
  // - Removing metadata atoms/boxes (like moov, uuid, etc. in MP4)
  // - Re-encoding or at least re-muxing the video
  // This is beyond the scope of simple client-side JavaScript
  
  let fileName = file.name;
  if (shouldSanitize) {
    fileName = sanitizeFileName(file.name, fileType, fileIndex);
  }
  
  const processedFile = new File([file], fileName, {
    type: file.type,
    lastModified: Date.now()
  });
  
  return {
    original: file,
    processed: processedFile,
    type: 'video',
    size: file.size,
    newSize: file.size,
    note: 'Note: Full video metadata removal requires specialized tools. This file may still contain metadata. For complete removal, consider using tools like ExifTool or ffmpeg.'
  };
}

function addResultItem(result, index) {
  const item = document.createElement('div');
  item.className = 'result-item';
  
  const icon = result.type === 'image' ? '🖼️' : '🎥';
  const sizeReduction = result.size > 0 
    ? `${((1 - result.newSize / result.size) * 100).toFixed(1)}% smaller`
    : 'Size unchanged';
  const sizeInfo = result.note 
    ? `<div class="result-note">${result.note}</div>`
    : `<div class="result-size">${formatFileSize(result.original.size)} → ${formatFileSize(result.newSize)} (${sizeReduction})</div>`;
  
  // Create thumbnail for processed images
  let thumbnailHTML = '';
  if (result.type === 'image') {
    const thumbnailUrl = URL.createObjectURL(result.processed);
    thumbnailHTML = `<img src="${thumbnailUrl}" alt="Thumbnail" class="result-thumbnail" onload="URL.revokeObjectURL(this.src)" />`;
  } else {
    thumbnailHTML = `<span class="result-icon">${icon}</span>`;
  }
  
  item.innerHTML = `
    <div class="result-info" onclick="showProcessedMetadata(${index})" style="cursor: pointer;">
      ${thumbnailHTML}
      <div class="result-details">
        <div class="result-name">${result.processed.name}</div>
        ${sizeInfo}
      </div>
    </div>
    <button class="btn-download" onclick="event.stopPropagation(); downloadFile(${index})" title="Download">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download
    </button>
  `;
  
  resultsList.appendChild(item);
}

function addErrorItem(file, error) {
  const item = document.createElement('div');
  item.className = 'result-item error';
  
  item.innerHTML = `
    <div class="result-info">
      <span class="result-icon">❌</span>
      <div class="result-details">
        <div class="result-name">${file.name}</div>
        <div class="result-error">Error: ${error}</div>
      </div>
    </div>
  `;
  
  resultsList.appendChild(item);
}

function downloadFile(index) {
  const result = processedFiles[index];
  if (!result) return;
  
  const url = URL.createObjectURL(result.processed);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.processed.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadAllFiles() {
  if (processedFiles.length === 0) return;
  
  // Create a zip-like download by triggering multiple downloads
  // Note: Browsers may block multiple simultaneous downloads
  // We'll add a small delay between each download
  for (let i = 0; i < processedFiles.length; i++) {
    const result = processedFiles[i];
    const url = URL.createObjectURL(result.processed);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.processed.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Small delay to prevent browser from blocking multiple downloads
    if (i < processedFiles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    URL.revokeObjectURL(url);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Metadata display functions
async function showFileMetadata(index, type) {
  const file = filesToProcess[index];
  if (!file) return;
  
  const modal = document.getElementById('metadataModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('metadataContent');
  
  modalTitle.textContent = `Metadata: ${file.name}`;
  modalContent.innerHTML = '<div class="loading">Loading metadata...</div>';
  modal.style.display = 'flex';
  
  const isImage = imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  
  if (isImage) {
    await readImageMetadata(file, modalContent);
  } else {
    modalContent.innerHTML = '<div class="metadata-info"><p>Video metadata reading is not supported in the browser. Video files may contain metadata that requires specialized tools to remove.</p></div>';
  }
}

async function showProcessedMetadata(index) {
  const result = processedFiles[index];
  if (!result) return;
  
  const modal = document.getElementById('metadataModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('metadataContent');
  
  modalTitle.textContent = `Metadata: ${result.processed.name}`;
  modalContent.innerHTML = '<div class="loading">Checking metadata...</div>';
  modal.style.display = 'flex';
  
  if (result.type === 'image') {
    await readImageMetadata(result.processed, modalContent, true);
  } else {
    modalContent.innerHTML = '<div class="metadata-info"><p>✓ Video file processed. Note: Full video metadata removal requires specialized tools.</p></div>';
  }
}

async function readImageMetadata(file, container, isProcessed = false) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const image = new Image();
      image.onload = function() {
        try {
          EXIF.getData(image, function() {
            const allMetaData = EXIF.getAllTags(this);
            
            // Add image dimensions from the actual image element (these always exist)
            if (!allMetaData.ImageWidth) {
              allMetaData.ImageWidth = image.width;
            }
            if (!allMetaData.ImageHeight) {
              allMetaData.ImageHeight = image.height;
            }
            
            
            if (isProcessed) {
              // Show remaining metadata for processed files
              if (Object.keys(allMetaData).length === 0) {
                container.innerHTML = `
                  <div class="metadata-info">
                    <h3>Processed File Metadata</h3>
                    <p>No EXIF metadata found in this processed image.</p>
                    ${formatMetadata(allMetaData)}
                  </div>
                `;
              } else {
                container.innerHTML = `
                  <div class="metadata-info">
                    <h3>Processed File Metadata</h3>
                    <p>Remaining metadata in processed image:</p>
                    ${formatMetadata(allMetaData)}
                  </div>
                `;
              }
            } else {
              // Show original metadata
              if (Object.keys(allMetaData).length === 0) {
                container.innerHTML = `
                  <div class="metadata-info">
                    <h3>Original File Metadata</h3>
                    <p>No EXIF metadata found in this image.</p>
                    ${formatMetadata(allMetaData)}
                  </div>
                `;
              } else {
                container.innerHTML = `
                  <div class="metadata-info">
                    <h3>Original File Metadata</h3>
                    <p>Metadata found in original image:</p>
                    ${formatMetadata(allMetaData)}
                  </div>
                `;
              }
            }
            resolve();
          });
        } catch (error) {
          container.innerHTML = `
            <div class="metadata-info error">
              <h3>Error Reading Metadata</h3>
              <p>Could not read metadata from this file: ${error.message}</p>
            </div>
          `;
          resolve();
        }
      };
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatMetadata(metadata) {
  const sections = {
    'Camera Info': ['Make', 'Model', 'Software', 'DateTime', 'DateTimeOriginal'],
    'Image Properties': ['ImageWidth', 'ImageHeight', 'Orientation', 'ColorSpace', 'XResolution', 'YResolution', 'PixelXDimension', 'PixelYDimension'],
    'Location': ['GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSLatitudeRef', 'GPSLongitudeRef'],
    'Camera Settings': ['ExposureTime', 'FNumber', 'ISO', 'Flash', 'FocalLength', 'WhiteBalance'],
    'Other': []
  };
  
  let html = '<div class="metadata-sections">';
  
  // Check for GPS coordinates to create map link
  const hasGPS = metadata.GPSLatitude && metadata.GPSLongitude;
  let gpsLink = '';
  if (hasGPS) {
    const lat = metadata.GPSLatitude;
    const lon = metadata.GPSLongitude;
    const latRef = metadata.GPSLatitudeRef || 'N';
    const lonRef = metadata.GPSLongitudeRef || 'E';
    
    // Convert to decimal if needed (EXIF sometimes stores as degrees/minutes/seconds)
    let latDecimal = lat;
    let lonDecimal = lon;
    
    if (Array.isArray(lat) && lat.length === 3) {
      // Convert DMS to decimal
      latDecimal = lat[0] + lat[1]/60 + lat[2]/3600;
      if (latRef === 'S') latDecimal = -latDecimal;
    } else if (typeof lat === 'number') {
      if (latRef === 'S') latDecimal = -lat;
    }
    
    if (Array.isArray(lon) && lon.length === 3) {
      lonDecimal = lon[0] + lon[1]/60 + lon[2]/3600;
      if (lonRef === 'W') lonDecimal = -lonDecimal;
    } else if (typeof lon === 'number') {
      if (lonRef === 'W') lonDecimal = -lon;
    }
    
    const mapsUrl = `https://www.google.com/maps?q=${latDecimal},${lonDecimal}`;
    gpsLink = `<a href="${mapsUrl}" target="_blank" class="gps-link" title="Open in Google Maps">📍 View on Google Maps <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`;
  }
  
  for (const [sectionName, keys] of Object.entries(sections)) {
    const sectionData = {};
    const otherKeys = [];
    
    for (const key in metadata) {
      if (keys.includes(key)) {
        sectionData[key] = metadata[key];
      } else if (!Object.values(sections).flat().includes(key)) {
        otherKeys.push(key);
      }
    }
    
    if (sectionName === 'Other') {
      otherKeys.forEach(key => {
        sectionData[key] = metadata[key];
      });
    }
    
    if (Object.keys(sectionData).length > 0) {
      if (sectionName === 'Location' && gpsLink) {
        html += `<div class="metadata-section"><div class="section-header-with-link"><h4>${sectionName}</h4>${gpsLink}</div>`;
      } else {
        html += `<div class="metadata-section"><h4>${sectionName}</h4>`;
      }
      html += '<table class="metadata-table">';
      for (const [key, value] of Object.entries(sectionData)) {
        html += `<tr><td class="metadata-key">${key}</td><td class="metadata-value">${formatMetadataValue(key, value, metadata)}</td></tr>`;
      }
      html += '</table></div>';
    }
  }
  
  html += '</div>';
  return html;
}

function formatMetadataValue(key, value, allMetadata = {}) {
  if (value === null || value === undefined) return 'N/A';
  
  // Handle GPS coordinates specially
  if (key === 'GPSLatitude' || key === 'GPSLongitude') {
    if (Array.isArray(value) && value.length === 3) {
      // Degrees, minutes, seconds format
      return `${value[0]}° ${value[1]}' ${value[2]}"`;
    }
  }
  
  if (Array.isArray(value)) {
    return value.map(v => formatMetadataValue(key, v, allMetadata)).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Format resolution/DPI
  if (key === 'XResolution' || key === 'YResolution') {
    if (typeof value === 'number') {
      return `${value} DPI`;
    }
  }
  
  // Format dimensions
  if (key === 'ImageWidth' || key === 'ImageHeight' || key === 'PixelXDimension' || key === 'PixelYDimension') {
    return `${value} pixels`;
  }
  
  return String(value);
}

function closeMetadataModal() {
  const modal = document.getElementById('metadataModal');
  modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('metadataModal');
  if (event.target === modal) {
    closeMetadataModal();
  }
}

// Make functions available globally for onclick handlers
window.removeFile = removeFile;
window.downloadFile = downloadFile;
window.showFileMetadata = showFileMetadata;
window.showProcessedMetadata = showProcessedMetadata;
window.closeMetadataModal = closeMetadataModal;

