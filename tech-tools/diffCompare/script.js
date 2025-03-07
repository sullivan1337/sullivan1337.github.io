// Global variables for diff processing
let diffParts = [];
let origLines = [], newLines = [];

// Light/dark mode (from your existing site)
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

// File upload handlers for both inputs
const text1El = document.getElementById('text1');
const text2El = document.getElementById('text2');
const file1El = document.getElementById('file1');
const file2El = document.getElementById('file2');

function handleFileUpload(fileInput, textArea) {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    textArea.value = reader.result;
    performDiff();
  };
  reader.readAsText(file);
}
file1El.addEventListener('change', () => handleFileUpload(file1El, text1El));
file2El.addEventListener('change', () => handleFileUpload(file2El, text2El));

// Diff option elements
const copyBtn = document.getElementById('copyBtn');
const viewModeRadios = document.getElementsByName('viewMode');
const ignoreSpaceEl = document.getElementById('ignore-space');
const ignoreCaseEl = document.getElementById('ignore-case');
const showChangesEl = document.getElementById('show-changes');
const summaryEl = document.getElementById('summary');
const diffOutputEl = document.getElementById('diffOutput');
const inlineDiffEl = document.getElementById('inline-diff');
const sideBySideDiffEl = document.getElementById('side-by-side-diff');

/**
 * Returns an object with highlighted HTML strings for the original and modified text,
 * using Diff.diffWords to compute word-level differences.
 */
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

// Main diff function using jsdiff
function performDiff() {
  const text1 = text1El.value;
  const text2 = text2El.value;
  if (text1 === '' && text2 === '') {
    diffParts = [];
    summaryEl.textContent = '';
    inlineDiffEl.innerHTML = '';
    sideBySideDiffEl.innerHTML = '';
    return;
  }
  const ignoreWhitespace = ignoreSpaceEl.checked;
  const ignoreCase = ignoreCaseEl.checked;
  let normText1 = text1;
  let normText2 = text2;
  if (ignoreWhitespace) {
    const spaceRegex = /[ \t]+/g;
    normText1 = normText1.split('\n').map(line => line.replace(spaceRegex, '')).join('\n');
    normText2 = normText2.split('\n').map(line => line.replace(spaceRegex, '')).join('\n');
  }
  if (ignoreCase) {
    normText1 = normText1.toLowerCase();
    normText2 = normText2.toLowerCase();
  }
  diffParts = Diff.diffLines(normText1, normText2);
  origLines = text1.split('\n');
  newLines = text2.split('\n');

  inlineDiffEl.innerHTML = '';
  sideBySideDiffEl.innerHTML = '';
  const table = document.createElement('table');
  sideBySideDiffEl.appendChild(table);
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  let oldIndex = 0;
  let newIndex = 0;

  for (let i = 0; i < diffParts.length; i++) {
    const part = diffParts[i];
    let lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (part.removed && i + 1 < diffParts.length && diffParts[i + 1].added) {
      // Modified block (removed followed by added)
      const removedLines = lines;
      const addedLines = diffParts[i + 1].value.split('\n');
      if (addedLines[addedLines.length - 1] === '') {
        addedLines.pop();
      }
      const maxLen = Math.max(removedLines.length, addedLines.length);
      for (let k = 0; k < maxLen; k++) {
        const origLine = k < removedLines.length ? origLines[oldIndex + k] : '';
        const newLine = k < addedLines.length ? newLines[newIndex + k] : '';
        const row = document.createElement('tr');

        const oldCell = document.createElement('td');
        oldCell.className = 'old';
        const newCell = document.createElement('td');
        newCell.className = 'new';

        // If both lines exist and differ, compute inner diff highlighting
        if (origLine && newLine && origLine !== newLine) {
          const highlighted = getHighlightedDiff(origLine, newLine);
          oldCell.innerHTML = highlighted.originalHtml;
          newCell.innerHTML = highlighted.modifiedHtml;
        } else {
          oldCell.textContent = origLine;
          newCell.textContent = newLine;
        }

        // Apply diff-specific classes
        if (origLine !== '' && newLine !== '') {
          row.classList.add('changed');
          oldCell.classList.add('removed');
          newCell.classList.add('added');
        } else if (origLine === '' && newLine !== '') {
          row.classList.add('added');
          newCell.classList.add('added');
        } else if (origLine !== '' && newLine === '') {
          row.classList.add('removed');
          oldCell.classList.add('removed');
        }
        row.appendChild(oldCell);
        row.appendChild(newCell);
        tbody.appendChild(row);

        // Inline diff: output two lines for modified block with inner highlighting
        if (origLine) {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'diff-line removed';
          if (origLine && newLine && origLine !== newLine) {
            lineDiv.innerHTML = '- ' + getHighlightedDiff(origLine, newLine).originalHtml;
          } else {
            lineDiv.textContent = '- ' + origLine;
          }
          inlineDiffEl.appendChild(lineDiv);
        }
        if (newLine) {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'diff-line added';
          if (origLine && newLine && origLine !== newLine) {
            lineDiv.innerHTML = '+ ' + getHighlightedDiff(origLine, newLine).modifiedHtml;
          } else {
            lineDiv.textContent = '+ ' + newLine;
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
      i++; // Skip the added part already processed
    } else if (part.removed) {
      lines.forEach(() => {
        const row = document.createElement('tr');
        row.className = 'removed';
        const oldCell = document.createElement('td');
        oldCell.className = 'old removed';
        oldCell.textContent = origLines[oldIndex];
        const newCell = document.createElement('td');
        newCell.className = 'new empty';
        row.appendChild(oldCell);
        row.appendChild(newCell);
        tbody.appendChild(row);
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line removed';
        lineDiv.textContent = '- ' + origLines[oldIndex];
        inlineDiffEl.appendChild(lineDiv);
        oldIndex++;
      });
      deletions += lines.length;
    } else if (part.added) {
      lines.forEach(() => {
        const row = document.createElement('tr');
        row.className = 'added';
        const oldCell = document.createElement('td');
        oldCell.className = 'old empty';
        const newCell = document.createElement('td');
        newCell.className = 'new added';
        newCell.textContent = newLines[newIndex];
        row.appendChild(oldCell);
        row.appendChild(newCell);
        tbody.appendChild(row);
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line added';
        lineDiv.textContent = '+ ' + newLines[newIndex];
        inlineDiffEl.appendChild(lineDiv);
        newIndex++;
      });
      additions += lines.length;
    } else {
      lines.forEach(() => {
        const row = document.createElement('tr');
        row.className = 'unchanged';
        const oldCell = document.createElement('td');
        oldCell.className = 'old';
        oldCell.textContent = origLines[oldIndex];
        const newCell = document.createElement('td');
        newCell.className = 'new';
        newCell.textContent = newLines[newIndex];
        row.appendChild(oldCell);
        row.appendChild(newCell);
        tbody.appendChild(row);
        const lineDiv = document.createElement('div');
        lineDiv.className = 'diff-line unchanged';
        lineDiv.textContent = '  ' + origLines[oldIndex];
        inlineDiffEl.appendChild(lineDiv);
        oldIndex++;
        newIndex++;
      });
    }
  }

  summaryEl.textContent = (additions === 0 && deletions === 0 && modifications === 0)
    ? 'No differences found.'
    : `Additions: ${additions}, Deletions: ${deletions}, Modifications: ${modifications}`;

  const viewMode = document.querySelector('input[name="viewMode"]:checked').value;
  if (viewMode === 'side') {
    inlineDiffEl.style.display = 'none';
    sideBySideDiffEl.style.display = 'block';
  } else {
    sideBySideDiffEl.style.display = 'none';
    inlineDiffEl.style.display = 'block';
  }

  diffOutputEl.classList.toggle('hide-unchanged', showChangesEl.checked);
}

// Auto-update diff on input events
text1El.addEventListener('input', performDiff);
text2El.addEventListener('input', performDiff);
ignoreSpaceEl.addEventListener('change', performDiff);
ignoreCaseEl.addEventListener('change', performDiff);
showChangesEl.addEventListener('change', () => {
  diffOutputEl.classList.toggle('hide-unchanged', showChangesEl.checked);
});

// Toggle between side-by-side and inline view
viewModeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      if (radio.value === 'side') {
        inlineDiffEl.style.display = 'none';
        sideBySideDiffEl.style.display = 'block';
      } else {
        sideBySideDiffEl.style.display = 'none';
        inlineDiffEl.style.display = 'block';
      }
    }
  });
});

// Copy diff output to clipboard (unified diff text format)
copyBtn.addEventListener('click', () => {
  let diffText = '';
  let oIndex = 0, nIndex = 0;
  diffParts.forEach(part => {
    let lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    if (part.added) {
      lines.forEach(() => {
        diffText += '+ ' + newLines[nIndex] + '\n';
        nIndex++;
      });
    } else if (part.removed) {
      lines.forEach(() => {
        diffText += '- ' + origLines[oIndex] + '\n';
        oIndex++;
      });
    } else {
      lines.forEach(() => {
        if (!showChangesEl.checked) {
          diffText += '  ' + origLines[oIndex] + '\n';
        }
        oIndex++;
        nIndex++;
      });
    }
  });
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(diffText);
  } else {
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = diffText;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
  }
});
