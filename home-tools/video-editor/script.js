let clips = [];
let selectedClipId = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const timelineSection = document.getElementById('timelineSection');
const timelineList = document.getElementById('timelineList');
const previewModal = document.getElementById('previewModal');
const previewModalOverlay = document.getElementById('previewModalOverlay');
const closePreviewModalBtn = document.getElementById('closePreviewModal');
const previewVideo = document.getElementById('previewVideo');
const previewName = document.getElementById('previewName');
const previewDuration = document.getElementById('previewDuration');
const previewStart = document.getElementById('previewStart');
const previewEnd = document.getElementById('previewEnd');
const applyTrimBtn = document.getElementById('applyTrimBtn');

const buildVideoBtn = document.getElementById('buildVideoBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const autoDurationCheckbox = document.getElementById('autoDuration');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const ffmpegCommandText = document.getElementById('ffmpegCommand');
const copyFfmpegBtn = document.getElementById('copyFfmpegBtn');

// Target video size for concat (unify mixed sources)
// Use landscape 1920x1080 with padding
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

let ffmpegInstance = null;
let ffmpegLoading = false;

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

buildVideoBtn.addEventListener('click', combineVideo);
clearAllBtn.addEventListener('click', clearAll);
applyTrimBtn.addEventListener('click', applyPreviewTrim);
closePreviewModalBtn.addEventListener('click', closePreviewModal);
previewModalOverlay.addEventListener('click', closePreviewModal);
copyFfmpegBtn.addEventListener('click', copyFfmpegCommand);

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

  const files = Array.from(e.dataTransfer.files || []);
  await addFiles(files);
}

async function handleFileSelect(e) {
  const files = Array.from(e.target.files || []);
  await addFiles(files);
}

function isVideoFile(file) {
  const type = (file.type || '').toLowerCase();
  return type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

async function addFiles(files) {
  const videoFiles = files.filter(isVideoFile);
  if (videoFiles.length === 0) {
    alert('Please select supported video files (MP4, WebM, MOV).');
    return;
  }

  const startIndex = clips.length;

  for (let i = 0; i < videoFiles.length; i++) {
    const file = videoFiles[i];
    const id = `${Date.now()}-${startIndex + i}-${Math.random().toString(36).slice(2, 7)}`;
    const clip = {
      id,
      file,
      name: file.name,
      duration: null,
      start: 0,
      end: null
    };

    clips.push(clip);
    loadClipDuration(clip);
  }

  updateTimeline();
  updateUI();
  updateFfmpegCommand();
}

function loadClipDuration(clip) {
  const video = document.createElement('video');
  video.preload = 'metadata';

  video.onloadedmetadata = () => {
    URL.revokeObjectURL(video.src);
    const duration = video.duration || 0;
    clip.duration = duration;

    if (autoDurationCheckbox.checked || clip.end == null) {
      clip.end = duration;
    }

    updateTimeline();
    analyzeAudioForClip(clip);
    updateFfmpegCommand();
  };

  video.onerror = () => {
    URL.revokeObjectURL(video.src);
  };

  video.src = URL.createObjectURL(clip.file);
}

function updateTimeline() {
  timelineList.innerHTML = '';

  clips.forEach((clip, index) => {
    const item = document.createElement('div');
    item.className = 'clip-item';
    item.setAttribute('data-id', clip.id);
    item.setAttribute('draggable', 'true');

    const durationText = clip.duration != null
      ? `${clip.duration.toFixed(1)}s`
      : 'Loading...';

    const startVal = clip.start != null ? clip.start.toFixed(2) : 0;
    const endVal = clip.end != null ? clip.end.toFixed(2) : '';

    const thumbUrl = URL.createObjectURL(clip.file);

    item.innerHTML = `
      <div class="clip-handle" title="Drag to reorder">☰</div>
      <div class="clip-thumb-wrapper">
        <video class="clip-thumb" src="${thumbUrl}" muted></video>
        <div class="clip-thumb-overlay">
          <span class="clip-index">Clip ${index + 1}</span>
          <span class="clip-duration">${durationText}</span>
        </div>
      </div>
      <div class="clip-main">
        <div class="clip-name">${clip.name}</div>
        <div class="clip-meta">In: ${startVal}s • Out: ${endVal || '—'}</div>
        <div class="clip-trim-bar">
          <div class="clip-trim-range">
            <div class="trim-handle start"></div>
            <div class="trim-handle end"></div>
          </div>
        </div>
        <canvas class="clip-wave" width="220" height="32"></canvas>
      </div>
      <div class="clip-actions">
        <button class="btn btn-secondary small preview-btn">Preview</button>
        <button class="btn btn-secondary small remove-btn">✕</button>
      </div>
    `;

    const previewBtn = item.querySelector('.preview-btn');
    const removeBtn = item.querySelector('.remove-btn');
    const metaEl = item.querySelector('.clip-meta');
    const trimBar = item.querySelector('.clip-trim-bar');
    const trimRange = item.querySelector('.clip-trim-range');
    const leftHandle = item.querySelector('.trim-handle.start');
    const rightHandle = item.querySelector('.trim-handle.end');
    const waveCanvas = item.querySelector('.clip-wave');

    previewBtn.addEventListener('click', () => {
      selectClipForPreview(clip.id);
    });

    removeBtn.addEventListener('click', () => {
      removeClip(clip.id);
    });

    setupTrimInteractions(clip, trimBar, trimRange, leftHandle, rightHandle, metaEl);

    if (clip.waveform && waveCanvas) {
      drawWaveform(waveCanvas, clip.waveform);
    }

    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOverItem);
    item.addEventListener('dragleave', handleDragLeaveItem);
    item.addEventListener('drop', handleDropItem);

    timelineList.appendChild(item);
  });

  updateFfmpegCommand();
}

function updateUI() {
  if (clips.length > 0) {
    timelineSection.style.display = 'block';
    buildVideoBtn.disabled = false;
    progressText.textContent = `${clips.length} clip${clips.length > 1 ? 's' : ''} loaded`;
  } else {
    timelineSection.style.display = 'none';
    buildVideoBtn.disabled = true;
    progressText.textContent = 'No clips loaded';
    progressFill.style.width = '0%';
    closePreviewModal();
    selectedClipId = null;
  }
}

function selectClipForPreview(id) {
  const clip = clips.find(c => c.id === id);
  if (!clip) return;

  selectedClipId = id;
  openPreviewModal();

  const url = URL.createObjectURL(clip.file);
  previewVideo.src = url;
  previewVideo.onloadedmetadata = () => {
    const duration = previewVideo.duration || clip.duration || 0;
    previewDuration.textContent = `Duration: ${duration.toFixed(2)}s`;
    if (!clip.duration) {
      clip.duration = duration;
      if (clip.end == null || autoDurationCheckbox.checked) {
        clip.end = duration;
      }
      updateTimeline();
    }
  };

  previewName.textContent = clip.name;
  previewStart.value = clip.start != null ? clip.start : 0;
  previewEnd.value = clip.end != null ? clip.end : (clip.duration || '');
}

function applyPreviewTrim() {
  if (!selectedClipId) return;
  const clip = clips.find(c => c.id === selectedClipId);
  if (!clip) return;

  let start = parseFloat(previewStart.value);
  let end = parseFloat(previewEnd.value);

  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end)) end = clip.duration || start;

  if (clip.duration != null) {
    if (start > clip.duration) start = clip.duration;
    if (end > clip.duration) end = clip.duration;
  }

  if (end < start) end = start;

  clip.start = start;
  clip.end = end;

  updateTimeline();
  updateFfmpegCommand();
}

function removeClip(id) {
  clips = clips.filter(c => c.id !== id);
  if (selectedClipId === id) {
    selectedClipId = null;
    closePreviewModal();
  }
  updateTimeline();
  updateUI();
  updateFfmpegCommand();
}

let dragSrcId = null;

function handleDragStart(e) {
  dragSrcId = e.currentTarget.getAttribute('data-id');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function handleDragOverItem(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeaveItem(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDropItem(e) {
  e.preventDefault();
  const targetId = e.currentTarget.getAttribute('data-id');
  e.currentTarget.classList.remove('drag-over');

  if (!dragSrcId || dragSrcId === targetId) return;

  const fromIndex = clips.findIndex(c => c.id === dragSrcId);
  const toIndex = clips.findIndex(c => c.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = clips.splice(fromIndex, 1);
  clips.splice(toIndex, 0, moved);

  updateTimeline();
}

function clearAll() {
  if (!clips.length) return;
  if (!confirm('Clear all clips?')) return;

  clips = [];
  selectedClipId = null;
  updateTimeline();
  updateUI();
  updateFfmpegCommand();
}

function setProgress(label, percent) {
  progressText.textContent = label;
  progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

async function ensureFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) {
    while (!ffmpegInstance) {
      await new Promise(r => setTimeout(r, 200));
    }
    return ffmpegInstance;
  }

  ffmpegLoading = true;
  try {
    const globalFFmpeg = window.FFmpeg || (typeof FFmpeg !== 'undefined' ? FFmpeg : null);
    if (!globalFFmpeg || !globalFFmpeg.createFFmpeg) {
      throw new Error('ffmpeg.wasm library is not available in this environment.');
    }

    const { createFFmpeg } = globalFFmpeg;
    const ffmpeg = createFFmpeg({
      log: true
    });

    setProgress('Loading video engine (ffmpeg.wasm)...', 5);
    await ffmpeg.load();
    ffmpegInstance = ffmpeg;
    setProgress('Video engine ready.', 10);
    return ffmpegInstance;
  } finally {
    ffmpegLoading = false;
  }
}

function openPreviewModal() {
  if (!previewModal) return;
  previewModal.classList.add('open');
}

function closePreviewModal() {
  if (!previewModal) return;
  previewModal.classList.remove('open');
}

function setupTrimInteractions(clip, trimBar, trimRange, leftHandle, rightHandle, metaEl) {
  if (!trimBar || !trimRange || !leftHandle || !rightHandle || !metaEl) return;
  if (!clip.duration || clip.duration <= 0) return;

  const minSegment = 0.1; // seconds

  function updateMeta() {
    const startVal = clip.start != null ? clip.start.toFixed(2) : '0.00';
    const endVal = clip.end != null ? clip.end.toFixed(2) : (clip.duration || 0).toFixed(2);
    metaEl.textContent = `In: ${startVal}s • Out: ${endVal}s`;
  }

  function updateUIFromClip() {
    const duration = clip.duration || 0;
    const rect = trimBar.getBoundingClientRect();
    const barWidth = rect.width || 1;

    const startFrac = duration ? (clip.start || 0) / duration : 0;
    const endFrac = duration ? (clip.end != null ? clip.end : duration) / duration : 1;

    const leftPx = startFrac * barWidth;
    const rightPx = endFrac * barWidth;

    trimRange.style.left = `${leftPx}px`;
    trimRange.style.width = `${Math.max(rightPx - leftPx, 2)}px`;

    leftHandle.style.left = `${leftPx}px`;
    rightHandle.style.left = `${rightPx}px`;

    updateMeta();
  }

  let activeHandle = null;

  function onPointerMove(e) {
    if (!activeHandle) return;
    const rect = trimBar.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));

    const duration = clip.duration || 0;
    if (!duration) return;

    const frac = x / rect.width;
    const time = frac * duration;

    if (activeHandle === 'start') {
      const maxStart = clip.end != null ? clip.end - minSegment : duration - minSegment;
      clip.start = Math.max(0, Math.min(time, Math.max(0, maxStart)));
    } else if (activeHandle === 'end') {
      const minEnd = (clip.start || 0) + minSegment;
      clip.end = Math.max(minEnd, Math.min(time, duration));
    }

    updateUIFromClip();
  }

  function stopDragging() {
    if (!activeHandle) return;
    activeHandle = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
  }

  function startDragging(which, e) {
    e.preventDefault();
    activeHandle = which;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
  }

  leftHandle.addEventListener('pointerdown', (e) => startDragging('start', e));
  rightHandle.addEventListener('pointerdown', (e) => startDragging('end', e));

  trimBar.addEventListener('pointerdown', (e) => {
    if (e.target === trimBar || e.target === trimRange) {
      const rect = trimBar.getBoundingClientRect();
      let x = e.clientX - rect.left;
      x = Math.max(0, Math.min(rect.width, x));
      const duration = clip.duration || 0;
      const frac = x / rect.width;
      const time = frac * duration;
      const halfSegment = Math.max(minSegment, duration * 0.1);
      clip.start = Math.max(0, time - halfSegment / 2);
      clip.end = Math.min(duration, clip.start + halfSegment);
      updateUIFromClip();
    }
  });

  updateUIFromClip();
}

async function analyzeAudioForClip(clip) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!analyzeAudioForClip.audioCtx) {
      analyzeAudioForClip.audioCtx = new AudioCtx();
    }
    const audioCtx = analyzeAudioForClip.audioCtx;

    const arrayBuffer = await clip.file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const samples = 120;
    const blockSize = Math.max(1, Math.floor(channelData.length / samples));
    const peaks = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
        const val = channelData[start + j];
        sum += val * val;
      }
      const rms = Math.sqrt(sum / blockSize);
      peaks.push(rms);
    }

    const max = Math.max(...peaks) || 1;
    clip.waveform = peaks.map(v => v / max);

    updateTimeline();
  } catch (e) {
    console.warn('Audio analysis failed for clip', e);
  }
}

function drawWaveform(canvas, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const mid = height / 2;
  const step = width / data.length;

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < data.length; i++) {
    const x = i * step;
    const amp = data[i] * (height / 2 - 2);
    ctx.moveTo(x, mid - amp);
    ctx.lineTo(x, mid + amp);
  }

  ctx.stroke();
}

function openPreviewModal() {
  if (!previewModal) return;
  previewModal.classList.add('open');
}

function closePreviewModal() {
  if (!previewModal) return;
  previewModal.classList.remove('open');
}

async function combineVideo() {
  if (!clips.length) return;

  if (!window.crossOriginIsolated) {
    alert('Combining clips in the browser requires SharedArrayBuffer support with cross-origin isolation (COOP/COEP headers). This environment does not support that, so the merge step cannot run here. You can still trim and reorder clips, then export using a local ffmpeg install.');
    return;
  }

  const invalid = clips.some(c => c.end == null || c.end <= (c.start || 0));
  if (invalid) {
    alert('Each clip must have an end time greater than its start time before combining.');
    return;
  }

  buildVideoBtn.disabled = true;

  try {
    const ffmpeg = await ensureFFmpeg();
    const totalSteps = clips.length * 2 + 2;
    let currentStep = 0;

    const parts = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const inputName = `input${i}.mp4`;
      const partName = `part${i}.mp4`;

      setProgress(`Preparing clip ${i + 1} of ${clips.length}...`, (currentStep / totalSteps) * 100);

      const data = new Uint8Array(await clip.file.arrayBuffer());
      ffmpeg.FS('writeFile', inputName, data);
      currentStep++;

      const ss = clip.start || 0;
      const to = clip.end;
      const trimArgs = [];

      if (ss > 0) {
        trimArgs.push('-ss', ss.toString());
      }
      if (to != null) {
        trimArgs.push('-to', to.toString());
      }

      const args = [
        ...trimArgs,
        '-i', inputName,
        '-c', 'copy',
        partName
      ];

      setProgress(`Trimming clip ${i + 1}...`, (currentStep / totalSteps) * 100);
      await ffmpeg.run(...args);
      currentStep++;

      parts.push(partName);
    }

    const concatFileContent = parts.map(name => `file '${name}'`).join('\n');
    ffmpeg.FS('writeFile', 'concat.txt', new TextEncoder().encode(concatFileContent));
    currentStep++;
    setProgress('Combining clips...', (currentStep / totalSteps) * 100);

    const outputName = 'combined.mp4';
    await ffmpeg.run(
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      outputName
    );
    currentStep++;
    setProgress('Finalizing video...', (currentStep / totalSteps) * 100);

    const data = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combined-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setProgress('Combined video ready for download.', 100);
  } catch (err) {
    console.error(err);
    alert('There was an error while combining the video: ' + (err && err.message ? err.message : 'Unknown error') + '. Check the console for details.');
    setProgress('Error while combining video.', 0);
  } finally {
    buildVideoBtn.disabled = false;
  }
}

function updateFfmpegCommand() {
  if (!ffmpegCommandText || !copyFfmpegBtn) return;

  if (!clips.length) {
    ffmpegCommandText.value =
      '# Add clips in the editor to generate an ffmpeg command.\n' +
      '# Example (no trims):\n' +
      '# ffmpeg -i "clip1.mp4" -i "clip2.mp4" -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" output.mp4';
    copyFfmpegBtn.disabled = true;
    return;
  }

  ffmpegCommandText.value = buildFfmpegCommand();
  copyFfmpegBtn.disabled = false;
}

function buildFfmpegCommand() {
  if (!clips.length) return '';

  const inputs = [];
  clips.forEach((clip) => {
    const safeName = clip.name.replace(/"/g, '\\"');
    inputs.push('-i', `"${safeName}"`);
  });

  const filterParts = [];
  clips.forEach((clip, index) => {
    const labelBase = index;
    const vLabelIn = `${labelBase}:v`;
    const aLabelIn = `${labelBase}:a`;
    const vLabelOut = `v${index}`;
    const aLabelOut = `a${index}`;

    const trimArgs = [];
    if (clip.start && clip.start > 0) {
      trimArgs.push(`start=${clip.start.toFixed(3)}`);
    }
    if (clip.end != null && clip.end > 0) {
      trimArgs.push(`end=${clip.end.toFixed(3)}`);
    }

    const trimExpr = trimArgs.length ? trimArgs.join(':') : '';

    // Normalize video to common resolution and format for concat
    if (trimExpr) {
      filterParts.push(
        `[${vLabelIn}]trim=${trimExpr},setpts=PTS-STARTPTS,` +
        `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2,` +
        `setsar=1,format=yuv420p[${vLabelOut}]`
      );
      filterParts.push(
        `[${aLabelIn}]atrim=${trimExpr},asetpts=PTS-STARTPTS[${aLabelOut}]`
      );
    } else {
      filterParts.push(
        `[${vLabelIn}]setpts=PTS-STARTPTS,` +
        `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2,` +
        `setsar=1,format=yuv420p[${vLabelOut}]`
      );
      filterParts.push(
        `[${aLabelIn}]asetpts=PTS-STARTPTS[${aLabelOut}]`
      );
    }
  });

  const concatInputs = clips
    .map((_, index) => `[v${index}][a${index}]`)
    .join('');
  filterParts.push(
    `${concatInputs}concat=n=${clips.length}:v=1:a=1[v][a]`
  );

  const filterComplex = `"${filterParts.join('; ')}"`;

  const cmdParts = [
    'ffmpeg',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '"[v]"',
    '-map',
    '"[a]"',
    'output.mp4'
  ];

  return cmdParts.join(' ');
}

async function copyFfmpegCommand() {
  if (!ffmpegCommandText || !ffmpegCommandText.value) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(ffmpegCommandText.value);
    } else {
      ffmpegCommandText.select();
      document.execCommand('copy');
    }
    setProgress('ffmpeg command copied to clipboard.', 100);
    setTimeout(() => setProgress(`${clips.length} clip${clips.length > 1 ? 's' : ''} loaded`, (clips.length ? 20 : 0)), 1200);
  } catch (e) {
    console.warn('Failed to copy ffmpeg command', e);
  }
}

