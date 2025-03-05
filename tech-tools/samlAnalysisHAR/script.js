let samlRequests = [];
let currentRequestIndex = 0;

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

// Theme toggle event
document.getElementById('themeToggle').addEventListener('click', function () {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  this.textContent = isDarkMode ? '☀️' : '🌙';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Event listeners for Help modals
document.getElementById('helpHarBtn').addEventListener('click', () => {
  document.getElementById('helpHarModal').style.display = 'block';
});

document.getElementById('helpSamlBtn').addEventListener('click', () => {
  document.getElementById('helpSamlModal').style.display = 'block';
});

// Close modals when clicking on the close icon
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', (e) => {
    const modalId = e.target.getAttribute('data-close');
    document.getElementById(modalId).style.display = 'none';
  });
});

// Close modals if user clicks outside the modal content
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// File upload event handling (traditional file picker)
document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const contents = e.target.result;
    updateTimestamp();
    analyzeFile(contents);
  };
  reader.readAsText(file);
});

// Drag and drop file upload support
const fileDropArea = document.querySelector('.file-drop-area');
if (fileDropArea) {
  fileDropArea.addEventListener('dragover', e => {
    e.preventDefault();
    fileDropArea.classList.add('dragover');
  });
  fileDropArea.addEventListener('dragleave', e => {
    e.preventDefault();
    fileDropArea.classList.remove('dragover');
  });
  fileDropArea.addEventListener('drop', e => {
    e.preventDefault();
    fileDropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('fileInput');
      fileInput.files = files;
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;
        updateTimestamp();
        analyzeFile(contents);
      };
      reader.readAsText(files[0]);
    }
  });
}

// Analyze raw input event
document.getElementById('analyzeRawBtn').addEventListener('click', function () {
  analyzeRawInput();
});

// Reset event
document.getElementById('resetBtn').addEventListener('click', function () {
  document.getElementById('fileInput').value = "";
  document.getElementById('rawTextInput').value = "";
  document.getElementById('results').textContent = "";
  document.getElementById('decodedSAML').textContent = "";
  document.getElementById('samlSummary').textContent = "";
  document.getElementById('navigation').style.display = 'none';
  samlRequests = [];
  currentRequestIndex = 0;
  document.getElementById('validationStatus').textContent = "";
  document.getElementById('captureTimestamp').textContent = "";
});

// Update capture timestamp next to SAML Summary heading
function updateTimestamp() {
  const ts = new Date().toLocaleString();
  document.getElementById('captureTimestamp').textContent = `Captured at: ${ts}`;
}

// Validate raw input and process accordingly
function analyzeRawInput() {
  const rawText = document.getElementById('rawTextInput').value.trim();
  const validationStatus = document.getElementById('validationStatus');
  if (!rawText) {
    alert("Please paste raw SAML trace/response.");
    return;
  }

  // Validate input as JSON, XML, or Base64
  let validType = "";
  try {
    JSON.parse(rawText);
    validType = "JSON";
  } catch(e) {}
  
  if (!validType) {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(rawText, "text/xml");
    if (!xmlDoc.getElementsByTagName("parsererror").length) {
      validType = "XML";
    }
  }
  
  if (!validType) {
    try {
      atob(rawText);
      validType = "Base64";
    } catch(e) {}
  }
  
  if (validType) {
    validationStatus.textContent = `Valid ${validType} input ✓`;
    validationStatus.style.color = "limegreen";
  } else {
    validationStatus.textContent = `Input not strictly valid, attempting to parse...`;
    validationStatus.style.color = "orange";
  }
  
  updateTimestamp();
  
  let formattedXML = "";
  if (validType === "JSON") {
    analyzeFile(rawText);
    return;
  } else if (rawText.startsWith("<")) {
    formattedXML = formatXML(rawText);
  } else {
    formattedXML = decodeAndFormatSAML(rawText);
  }
  
  document.getElementById('decodedSAML').textContent = formattedXML;
  const summary = getSAMLSummary(formattedXML);
  document.getElementById('samlSummary').innerHTML = summary;
  document.getElementById('results').textContent = "Processed raw SAML input.";
  document.getElementById('navigation').style.display = 'none';
}

// Process file contents (JSON or raw XML/base64)
function analyzeFile(contents) {
  let data;
  try {
    data = JSON.parse(contents);
  } catch (err) {
    if (contents.trim().startsWith("<")) {
      const formattedXML = formatXML(contents.trim());
      document.getElementById('decodedSAML').textContent = formattedXML;
      const summary = getSAMLSummary(formattedXML);
      document.getElementById('samlSummary').innerHTML = summary;
      document.getElementById('results').textContent = "Processed raw SAML input from text file.";
      document.getElementById('navigation').style.display = 'none';
      return;
    } else {
      document.getElementById('results').textContent = 'Invalid JSON file.';
      return;
    }
  }
  
  if (data.log && data.log.entries) {
    samlRequests = data.log.entries.filter(entry => 
      entry.request.method === 'POST' &&
      (
        (entry.request.postData && typeof entry.request.postData.text === "string" &&
         (entry.request.postData.text.includes('SAMLRequest') || entry.request.postData.text.includes('SAMLResponse')))
        ||
        (entry.request.post && Array.isArray(entry.request.post) && entry.request.post.some(pair => {
          if (pair.length >= 2) {
            const key = pair[0];
            const value = pair[1];
            if (key === 'SAMLResponse' || key === 'SAMLRequest') return !!value;
            try {
              let decoded = value.replace(/-/g, "+").replace(/_/g, "/");
              while (decoded.length % 4 !== 0) { decoded += "="; }
              return atob(decoded).trim().startsWith("<saml");
            } catch(e) {
              return false;
            }
          }
          return false;
        }))
      )
    );
  } else if (data.requests) {
    samlRequests = data.requests.filter(req => {
      if(req.method !== 'POST') return false;
      if (req.postData && typeof req.postData.text === "string") {
        return req.postData.text.includes('SAMLRequest') || req.postData.text.includes('SAMLResponse');
      }
      if (req.post && Array.isArray(req.post)) {
        return req.post.some(pair => {
          if (pair.length >= 2) {
            const key = pair[0];
            const value = pair[1];
            if (key === 'SAMLResponse' || key === 'SAMLRequest') return !!value;
            try {
              let decoded = value.replace(/-/g, "+").replace(/_/g, "/");
              while(decoded.length % 4 !== 0) { decoded += "="; }
              return atob(decoded).trim().startsWith("<saml");
            } catch(e) {
              return false;
            }
          }
          return false;
        });
      }
      return false;
    });
  } else {
    document.getElementById('results').textContent = 'Unsupported file format.';
    return;
  }
  
  if (samlRequests.length > 0) {
    document.getElementById('navigation').style.display = 'flex';
    currentRequestIndex = 0;
    updateNavigation();
    displaySAMLRequest(currentRequestIndex);
  } else {
    document.getElementById('results').textContent = 'No SAML requests found in the file.';
  }
}

// Update navigation controls
function updateNavigation() {
  const prevButton = document.getElementById('prevRequest');
  const nextButton = document.getElementById('nextRequest');
  const currentUrl = document.getElementById('currentUrl');
  const entry = samlRequests[currentRequestIndex];
  const req = entry.request ? entry.request : entry;
  prevButton.disabled = currentRequestIndex === 0;
  nextButton.disabled = currentRequestIndex === samlRequests.length - 1;
  currentUrl.textContent = req.url;
}

// Display a specific SAML request
function displaySAMLRequest(index) {
  const entry = samlRequests[index];
  const req = entry.request ? entry.request : entry;
  let results = '';
  let samlResponse = '';

  results += `SAML Request ${index + 1}:\n`;
  results += `URL: ${req.url}\n`;
  results += `Method: ${req.method}\n`;
  results += 'Headers:\n';
  (req.headers || req.requestHeaders).forEach(header => {
    results += `  ${header.name}: ${header.value}\n`;
  });
  results += 'Post Data:\n';
  if (req.postData && req.postData.text) {
    const decodedText = decodeURIComponent(req.postData.text);
    results += prettier.format(decodedText, { parser: "html", plugins: prettierPlugins });
    const match = decodedText.match(/SAMLResponse=([^&]+)/);
    if (match) {
      samlResponse = match[1];
    }
  } else if (req.post && Array.isArray(req.post)) {
    req.post.forEach(pair => {
      if (pair.length >= 2) {
        const key = pair[0];
        const value = pair[1];
        results += `${key}: ${value}\n`;
        if ((key === 'SAMLResponse' || key === 'SAMLRequest') && value) {
          samlResponse = value;
        }
        if (!samlResponse) {
          try {
            let decoded = value.replace(/-/g, "+").replace(/_/g, "/");
            while(decoded.length % 4 !== 0) { decoded += "="; }
            const atobDecoded = atob(decoded);
            if (atobDecoded.trim().startsWith("<saml")) {
              samlResponse = value;
            }
          } catch(e) {}
        }
      }
    });
  }
  document.getElementById('results').textContent = results;
  if (samlResponse) {
    const decodedSAML = decodeAndFormatSAML(samlResponse);
    document.getElementById('decodedSAML').textContent = decodedSAML;
    const summary = getSAMLSummary(decodedSAML);
    document.getElementById('samlSummary').innerHTML = summary;
    addTableResizers();
  } else {
    document.getElementById('decodedSAML').textContent = 'No SAMLResponse found in this request.';
    document.getElementById('samlSummary').textContent = 'No SAMLResponse found in this request.';
  }
}

// Navigation buttons events
document.getElementById('prevRequest').addEventListener('click', function () {
  if (currentRequestIndex > 0) {
    currentRequestIndex--;
    updateNavigation();
    displaySAMLRequest(currentRequestIndex);
  }
});
document.getElementById('nextRequest').addEventListener('click', function () {
  if (currentRequestIndex < samlRequests.length - 1) {
    currentRequestIndex++;
    updateNavigation();
    displaySAMLRequest(currentRequestIndex);
  }
});

// Decode and format SAML response
function decodeAndFormatSAML(encodedSAML) {
  try {
    let decoded = encodedSAML;
    try {
      decoded = decodeURIComponent(encodedSAML);
    } catch(e) {}
    decoded = decoded.replace(/-/g, "+").replace(/_/g, "/");
    while (decoded.length % 4 !== 0) { decoded += "="; }
    let base64Decoded;
    try {
      base64Decoded = atob(decoded);
    } catch(e) {
      base64Decoded = decoded;
    }
    return formatXML(base64Decoded);
  } catch(err) {
    return "Error decoding SAML response.";
  }
}

// Simple XML formatter
function formatXML(xml) {
  let formatted = '';
  let indent = '';
  const tab = '    ';
  xml.split(/>\s*</).forEach(function (node) {
    if (node.match(/^\/\w/)) {
      indent = indent.substring(tab.length);
    }
    formatted += indent + '<' + node + '>\r\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) {
      indent += tab;
    }
  });
  return formatted.substring(1, formatted.length - 3);
}

// Generate SAML summary tables
function getSAMLSummary(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  let summary = '';
  function getElementByTagNames(doc, tags) {
    for (let tag of tags) {
      const elements = doc.getElementsByTagNameNS("*", tag);
      if (elements.length > 0) return elements[0];
    }
    return null;
  }
  function createTable(title, data) {
    let table = `<h3>${title}</h3><table>`;
    table += '<tr><th>Attribute<div class="resizer"></div></th><th>Value<div class="resizer"></div></th></tr>';
    for (let [key, value] of Object.entries(data)) {
      table += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    table += '</table>';
    return table;
  }
  const response = getElementByTagNames(xmlDoc, ['Response']);
  if (response) {
    const responseData = {
      'ID': response.getAttribute('ID') || '',
      'Version': response.getAttribute('Version') || '',
      'IssueInstant': response.getAttribute('IssueInstant') || '',
      'Destination': response.getAttribute('Destination') || '',
      'InResponseTo': response.getAttribute('InResponseTo') || ''
    };
    summary += createTable('SAML Response', responseData);
  }
  const assertion = getElementByTagNames(xmlDoc, ['Assertion']);
  if (assertion) {
    const assertionData = {
      'ID': assertion.getAttribute('ID') || '',
      'Version': assertion.getAttribute('Version') || '',
      'IssueInstant': assertion.getAttribute('IssueInstant') || ''
    };
    const issuer = getElementByTagNames(assertion, ['Issuer']);
    if (issuer) {
      assertionData['Issuer'] = issuer.textContent;
    }
    const subject = getElementByTagNames(assertion, ['Subject']);
    if (subject) {
      const nameID = subject.getElementsByTagNameNS("*", 'NameID')[0];
      if (nameID) {
        assertionData['Subject'] = nameID.textContent;
      }
    }
    summary += createTable('SAML Assertion', assertionData);
  }
  const attributeStatement = getElementByTagNames(xmlDoc, ['AttributeStatement']);
  if (attributeStatement) {
    const attributes = attributeStatement.getElementsByTagNameNS("*", 'Attribute');
    const attributeData = {};
    for (let attr of attributes) {
      const name = attr.getAttribute('Name');
      const value = attr.getElementsByTagNameNS("*", 'AttributeValue')[0];
      if (name && value) {
        attributeData[name] = value.textContent;
      }
    }
    summary += createTable('Attribute Statement', attributeData);
  }
  return summary;
}

// Add resizers to tables
function addTableResizers() {
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const cols = table.querySelectorAll('th');
    let totalWidth = table.offsetWidth;
    let firstColMaxWidth = 0;
    let secondColMaxWidth = 0;
    table.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length === 2) {
        firstColMaxWidth = Math.max(firstColMaxWidth, cells[0].scrollWidth);
        secondColMaxWidth = Math.max(secondColMaxWidth, cells[1].scrollWidth);
      }
    });
    let firstColWidth = Math.min(firstColMaxWidth, totalWidth * 0.4);
    let secondColWidth = totalWidth - firstColWidth;
    cols[0].style.width = `${firstColWidth}px`;
    cols[1].style.width = `${secondColWidth}px`;
    cols.forEach((col) => {
      const resizer = col.querySelector('.resizer');
      let x = 0;
      let w = 0;
      const mouseDownHandler = function(e) {
        x = e.clientX;
        const styles = window.getComputedStyle(col);
        w = parseInt(styles.width, 10);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        resizer.classList.add('resizing');
      };
      const mouseMoveHandler = function(e) {
        const dx = e.clientX - x;
        col.style.width = `${w + dx}px`;
      };
      const mouseUpHandler = function() {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        resizer.classList.remove('resizing');
      };
      resizer.addEventListener('mousedown', mouseDownHandler);
    });
  });
}
