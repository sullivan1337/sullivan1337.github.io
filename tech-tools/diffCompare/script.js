// ============== GLOBAL VARIABLES & THEME SETUP ==============
let diffParts = [];
let rawOldArr = [], rawNewArr = [];      // Raw lines from inputs
let normOldArr = [], normNewArr = [];      // Normalized lines for diff computation
let currentView = 'side';                // Default view is side-by-side

// Light/dark mode from your existing site
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  } else {
    themeToggle.textContent = '☀️';
  }
});

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', function () {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  this.textContent = isDarkMode ? '☀️' : '🌙';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// ============== DOM REFERENCES ==============
const text1El = document.getElementById('text1');
const text2El = document.getElementById('text2');
const file1El = document.getElementById('file1');
const file2El = document.getElementById('file2');
const inlineViewBtn = document.getElementById('inlineViewBtn');
const sideViewBtn = document.getElementById('sideViewBtn');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');
const ignoreSpaceEl = document.getElementById('ignore-space');
const ignoreCaseEl = document.getElementById('ignore-case');
const showChangesEl = document.getElementById('show-changes');
const summaryEl = document.getElementById('summary');
const diffOutputEl = document.getElementById('diffOutput');
const inlineDiffEl = document.getElementById('inline-diff');
const sideBySideDiffEl = document.getElementById('side-by-side-diff');
const lineCount1El = document.getElementById('lineCount1');
const lineCount2El = document.getElementById('lineCount2');

// ============== FILE UPLOAD & AUTO-UPDATE DIFF ==============
function handleFileUpload(fileInput, textArea) {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    textArea.value = reader.result;
    updateLineCounts();
    performDiff();
  };
  reader.readAsText(file);
}
file1El.addEventListener('change', () => handleFileUpload(file1El, text1El));
file2El.addEventListener('change', () => handleFileUpload(file2El, text2El));

// Update line counts beneath each text input
function updateLineCounts() {
  const count1 = text1El.value ? text1El.value.split('\n').length : 0;
  const count2 = text2El.value ? text2El.value.split('\n').length : 0;
  lineCount1El.textContent = `Total lines: ${count1}`;
  lineCount2El.textContent = `Total lines: ${count2}`;
}
text1El.addEventListener('input', () => { updateLineCounts(); performDiff(); });
text2El.addEventListener('input', () => { updateLineCounts(); performDiff(); });
ignoreSpaceEl.addEventListener('change', performDiff);
ignoreCaseEl.addEventListener('change', performDiff);
showChangesEl.addEventListener('change', () => {
  diffOutputEl.classList.toggle('hide-unchanged', showChangesEl.checked);
});

// ============== VIEW TOGGLE (Inline vs Side-by-Side) ==============
inlineViewBtn.addEventListener('click', () => {
  currentView = 'inline';
  inlineViewBtn.classList.add('active');
  sideViewBtn.classList.remove('active');
  performDiff();
});
sideViewBtn.addEventListener('click', () => {
  currentView = 'side';
  sideViewBtn.classList.add('active');
  inlineViewBtn.classList.remove('active');
  performDiff();
});

// ============== RESET BUTTON ==============
resetBtn.addEventListener('click', () => {
  text1El.value = '';
  text2El.value = '';
  file1El.value = '';
  file2El.value = '';
  inlineDiffEl.innerHTML = '';
  sideBySideDiffEl.innerHTML = '';
  summaryEl.innerHTML = '';
  updateLineCounts();
});

// ============== HELPER: WORD-LEVEL HIGHLIGHTING ==============
function getHighlightedDiff(original, modified) {
  const wordDiff = Diff.diffWords(original, modified);
  let originalHtml = '';
  let modifiedHtml = '';
  wordDiff.forEach(part => {
    if (part.added) {
      modifiedHtml += `<span class="inner-added">${part.value}</span>`;
    } else if (part.removed) {
      originalHtml += `<span class="inner-removed">${part.value}</span>`;
    } else {
      originalHtml += part.value;
      modifiedHtml += part.value;
    }
  });
  return { originalHtml, modifiedHtml };
}

// ============== HELPER: NORMALIZE A LINE ==============
function applyLineNormalization(line) {
  let out = line;
  if (ignoreSpaceEl.checked) {
    out = out.replace(/[ \t]+/g, '');
  }
  if (ignoreCaseEl.checked) {
    out = out.toLowerCase();
  }
  return out;
}

// ============== MAIN DIFF FUNCTION (Using diffArrays for line-by-line diff) ==============
function performDiff() {
  const text1 = text1El.value || '';
  const text2 = text2El.value || '';
  updateLineCounts();
  
  if (!text1 && !text2) {
    diffParts = [];
    summaryEl.innerHTML = '';
    inlineDiffEl.innerHTML = '';
    sideBySideDiffEl.innerHTML = '';
    return;
  }
  
  // Split raw text into arrays for display and line numbering
  rawOldArr = text1.split('\n');
  rawNewArr = text2.split('\n');
  
  // Normalize arrays for diff computation
  normOldArr = rawOldArr.map(line => applyLineNormalization(line));
  normNewArr = rawNewArr.map(line => applyLineNormalization(line));
  
  // Compute diff using diffArrays
  diffParts = Diff.diffArrays(normOldArr, normNewArr);
  
  // Clear previous outputs
  inlineDiffEl.innerHTML = '';
  sideBySideDiffEl.innerHTML = '';
  
  // Auto-scale line number width
  const totalLines = Math.max(rawOldArr.length, rawNewArr.length);
  const digits = String(totalLines).length;
  const lineNumberWidth = (digits + 1) + 'ch';
  document.documentElement.style.setProperty('--line-num-width', lineNumberWidth);
  
  // Initialize counters and indices
  let oldIndex = 0;
  let newIndex = 0;
  let additions = 0, deletions = 0, modifications = 0;
  
  // Create side-by-side table
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  sideBySideDiffEl.appendChild(table);
  
  // Process each diff part
  for (let i = 0; i < diffParts.length; i++) {
    const part = diffParts[i];
    const lines = part.value;  // Array of normalized lines
    
    // Check for adjacent removed + added block (treat as modified)
    if (part.removed && i + 1 < diffParts.length && diffParts[i + 1].added) {
      const removedLines = part.value;
      const addedLines = diffParts[i + 1].value;
      const maxLen = Math.max(removedLines.length, addedLines.length);
      for (let k = 0; k < maxLen; k++) {
        const oldLineRaw = (k < removedLines.length) ? rawOldArr[oldIndex + k] : '';
        const newLineRaw = (k < addedLines.length) ? rawNewArr[newIndex + k] : '';
        
        // Build side-by-side row with line numbers
        const row = document.createElement('tr');
        
        const oldNumCell = document.createElement('td');
        oldNumCell.className = 'line-number';
        oldNumCell.textContent = oldLineRaw ? (oldIndex + k + 1) : '';
        
        const oldTextCell = document.createElement('td');
        oldTextCell.className = 'old';
        
        const newNumCell = document.createElement('td');
        newNumCell.className = 'line-number';
        newNumCell.textContent = newLineRaw ? (newIndex + k + 1) : '';
        
        const newTextCell = document.createElement('td');
        newTextCell.className = 'new';
        
        if (oldLineRaw && newLineRaw && oldLineRaw !== newLineRaw) {
          row.classList.add('changed');
          oldTextCell.classList.add('removed');
          newTextCell.classList.add('added');
          const highlight = getHighlightedDiff(oldLineRaw, newLineRaw);
          oldTextCell.innerHTML = highlight.originalHtml;
          newTextCell.innerHTML = highlight.modifiedHtml;
        } else if (oldLineRaw && !newLineRaw) {
          row.classList.add('removed');
          oldTextCell.classList.add('removed');
          oldTextCell.textContent = oldLineRaw;
        } else if (!oldLineRaw && newLineRaw) {
          row.classList.add('added');
          newTextCell.classList.add('added');
          newTextCell.textContent = newLineRaw;
        } else {
          row.classList.add('unchanged');
          oldTextCell.textContent = oldLineRaw;
          newTextCell.textContent = newLineRaw;
        }
        
        row.appendChild(oldNumCell);
        row.appendChild(oldTextCell);
        row.appendChild(newNumCell);
        row.appendChild(newTextCell);
        tbody.appendChild(row);
        
        // Build inline diff line with inline line number for removed line
        if (oldLineRaw) {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'diff-line removed';
          const numSpan = `<span class="inline-line-number">${oldIndex + k + 1}</span>`;
          if (oldLineRaw && newLineRaw && oldLineRaw !== newLineRaw) {
            lineDiv.innerHTML = numSpan + ' - ' + getHighlightedDiff(oldLineRaw, newLineRaw).originalHtml;
          } else {
            lineDiv.innerHTML = numSpan + ' - ' + oldLineRaw;
          }
          inlineDiffEl.appendChild(lineDiv);
        }
        // Build inline diff line with inline line number for added line
        if (newLineRaw) {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'diff-line added';
          const numSpan = `<span class="inline-line-number">${newIndex + k + 1}</span>`;
          if (oldLineRaw && newLineRaw && oldLineRaw !== newLineRaw) {
            lineDiv.innerHTML = numSpan + ' + ' + getHighlightedDiff(oldLineRaw, newLineRaw).modifiedHtml;
          } else {
            lineDiv.innerHTML = numSpan + ' + ' + newLineRaw;
          }
          inlineDiffEl.appendChild(lineDiv);
        }
      }
      modifications += Math.min(removedLines.length, addedLines.length);
      if (addedLines.length > removedLines.length) {
        additions += (addedLines.length - removedLines.length);
      }
      if (removedLines.length > addedLines.length) {
        deletions += (removedLines.length - addedLines.length);
      }
      oldIndex += removedLines.length;
      newIndex += addedLines.length;
      i++; // Skip the added block already processed
    }
    else if (part.removed) {
      // Purely removed lines
      for (let k = 0; k < lines.length; k++) {
        const oldLineRaw = rawOldArr[oldIndex + k];
        const row = document.createElement('tr');
        row.className = 'removed';
        const oldNumCell = document.createElement('td');
        oldNumCell.className = 'line-number';
        oldNumCell.textContent = oldLineRaw ? (oldIndex + k + 1) : '';
        const oldTextCell = document.createElement('td');
        oldTextCell.className = 'old removed';
        oldTextCell.textContent = oldLineRaw;
        const newNumCell = document.createElement('td');
        newNumCell.className = 'line-number';
        newNumCell.textContent = '';
        const newTextCell = document.createElement('td');
        newTextCell.className = 'new empty';
        row.appendChild(oldNumCell);
        row.appendChild(oldTextCell);
        row.appendChild(newNumCell);
        row.appendChild(newTextCell);
        tbody.appendChild(row);
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line removed';
        lineDiv.innerHTML = `<span class="inline-line-number">${oldIndex + k + 1}</span> - ${oldLineRaw}`;
        inlineDiffEl.appendChild(lineDiv);
      }
      deletions += lines.length;
      oldIndex += lines.length;
    }
    else if (part.added) {
      // Purely added lines
      for (let k = 0; k < lines.length; k++) {
        const newLineRaw = rawNewArr[newIndex + k];
        const row = document.createElement('tr');
        row.className = 'added';
        const oldNumCell = document.createElement('td');
        oldNumCell.className = 'line-number';
        oldNumCell.textContent = '';
        const oldTextCell = document.createElement('td');
        oldTextCell.className = 'old empty';
        const newNumCell = document.createElement('td');
        newNumCell.className = 'line-number';
        newNumCell.textContent = newLineRaw ? (newIndex + k + 1) : '';
        const newTextCell = document.createElement('td');
        newTextCell.className = 'new added';
        newTextCell.textContent = newLineRaw;
        row.appendChild(oldNumCell);
        row.appendChild(oldTextCell);
        row.appendChild(newNumCell);
        row.appendChild(newTextCell);
        tbody.appendChild(row);
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line added';
        lineDiv.innerHTML = `<span class="inline-line-number">${newIndex + k + 1}</span> + ${newLineRaw}`;
        inlineDiffEl.appendChild(lineDiv);
      }
      additions += lines.length;
      newIndex += lines.length;
    }
    else {
      // Unchanged lines
      for (let k = 0; k < lines.length; k++) {
        const oldLineRaw = rawOldArr[oldIndex + k];
        const newLineRaw = rawNewArr[newIndex + k];
        const row = document.createElement('tr');
        row.className = 'unchanged';
        const oldNumCell = document.createElement('td');
        oldNumCell.className = 'line-number';
        oldNumCell.textContent = oldLineRaw ? (oldIndex + k + 1) : '';
        const oldTextCell = document.createElement('td');
        oldTextCell.className = 'old';
        oldTextCell.textContent = oldLineRaw;
        const newNumCell = document.createElement('td');
        newNumCell.className = 'line-number';
        newNumCell.textContent = newLineRaw ? (newIndex + k + 1) : '';
        const newTextCell = document.createElement('td');
        newTextCell.className = 'new';
        newTextCell.textContent = newLineRaw;
        row.appendChild(oldNumCell);
        row.appendChild(oldTextCell);
        row.appendChild(newNumCell);
        row.appendChild(newTextCell);
        tbody.appendChild(row);
        
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line unchanged';
        lineDiv.innerHTML = `<span class="inline-line-number">${oldIndex + k + 1}</span>   ${oldLineRaw}`;
        inlineDiffEl.appendChild(lineDiv);
      }
      oldIndex += lines.length;
      newIndex += lines.length;
    }
  } // End for each diff part
  
  // Build summary with GitHub–style icons, two spaces after counts, and explanatory text (without total lines)
  if (additions === 0 && deletions === 0 && modifications === 0) {
    summaryEl.textContent = 'No differences found.';
  } else {
    summaryEl.innerHTML =
      `<span class="summary-item added">➕ <span class="summary-count">${additions}</span>&nbsp;lines added</span>` +
      `<span class="summary-item removed">➖ <span class="summary-count">${deletions}</span>&nbsp;lines removed</span>` +
      `<span class="summary-item modified">✏️ <span class="summary-count">${modifications}</span>&nbsp;lines modified</span>`;
  }
  
  // Display the chosen view
  if (currentView === 'side') {
    inlineDiffEl.style.display = 'none';
    sideBySideDiffEl.style.display = 'block';
  } else {
    sideBySideDiffEl.style.display = 'none';
    inlineDiffEl.style.display = 'block';
  }
  
  diffOutputEl.classList.toggle('hide-unchanged', showChangesEl.checked);
}

// ============== COPY DIFF (Unified Text) ==============
copyBtn.addEventListener('click', () => {
  let diffText = '';
  let oIndex = 0, nIndex = 0;
  diffParts.forEach(part => {
    const lines = part.value;
    if (part.added) {
      lines.forEach(() => {
        diffText += '+ ' + (rawNewArr[nIndex] || '') + '\n';
        nIndex++;
      });
    } else if (part.removed) {
      lines.forEach(() => {
        diffText += '- ' + (rawOldArr[oIndex] || '') + '\n';
        oIndex++;
      });
    } else {
      lines.forEach(() => {
        if (!showChangesEl.checked) {
          diffText += '  ' + (rawOldArr[oIndex] || '') + '\n';
        }
        oIndex++;
        nIndex++;
      });
    }
  });
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(diffText).catch(err => console.error('Clipboard error:', err));
  } else {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = diffText;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
  }
});
