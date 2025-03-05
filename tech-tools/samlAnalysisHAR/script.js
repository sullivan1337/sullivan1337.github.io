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

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', function () {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  this.textContent = isDarkMode ? '☀️' : '🌙';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Help modals
document.getElementById('helpHarBtn').addEventListener('click', () => {
  document.getElementById('helpHarModal').style.display = 'block';
});
document.getElementById('helpSamlBtn').addEventListener('click', () => {
  document.getElementById('helpSamlModal').style.display = 'block';
});
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', (e) => {
    const modalId = e.target.getAttribute('data-close');
    document.getElementById(modalId).style.display = 'none';
  });
});
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// File input
document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => analyzeFile(e.target.result);
  reader.readAsText(file);
});

// Drag and drop
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
      const reader = new FileReader();
      reader.onload = evt => analyzeFile(evt.target.result);
      reader.readAsText(files[0]);
    }
  });
}

// Analyze raw input
document.getElementById('analyzeRawBtn').addEventListener('click', function () {
  analyzeRawInput();
});

// Reset
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

// Update capture timestamp from SAML
function updateCaptureTimestampFromSAML(decodedSAML) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decodedSAML, "text/xml");
    let ts = "";
    const response = xmlDoc.getElementsByTagName("Response")[0];
    if (response && response.getAttribute("IssueInstant")) {
      ts = response.getAttribute("IssueInstant");
    } else {
      const assertion = xmlDoc.getElementsByTagName("Assertion")[0];
      if (assertion && assertion.getAttribute("IssueInstant")) {
        ts = assertion.getAttribute("IssueInstant");
      }
    }
    if (ts) {
      const displayTime = new Date(ts).toLocaleString();
      document.getElementById('captureTimestamp').textContent = `Captured at: ${displayTime}`;
    } else {
      document.getElementById('captureTimestamp').textContent = "";
    }
  } catch(e) {
    document.getElementById('captureTimestamp').textContent = "";
  }
}

// Validate & analyze raw input
function analyzeRawInput() {
  const rawText = document.getElementById('rawTextInput').value.trim();
  const validationStatus = document.getElementById('validationStatus');
  if (!rawText) {
    alert("Please paste raw SAML trace/response.");
    return;
  }

  let validType = "";
  // Attempt JSON
  try { JSON.parse(rawText); validType = "JSON"; } catch(e) {}
  // Attempt XML
  if (!validType) {
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(rawText, "text/xml");
    if (!xmlDoc.getElementsByTagName("parsererror").length) {
      validType = "XML";
    }
  }
  // Attempt Base64
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

  if (validType === "JSON") {
    try {
      analyzeFile(rawText);
      return;
    } catch(e) {}
  }

  let formattedXML = "";
  if (rawText.startsWith("<")) {
    formattedXML = formatXML(rawText);
  } else {
    formattedXML = decodeAndFormatSAML(rawText);
  }
  
  document.getElementById('decodedSAML').textContent = formattedXML;
  updateCaptureTimestampFromSAML(formattedXML);
  const summary = getSAMLSummary(formattedXML);
  document.getElementById('samlSummary').innerHTML = summary;
  document.getElementById('results').textContent = "Processed raw SAML input.";
  document.getElementById('navigation').style.display = 'none';
}

// Analyze file contents
function analyzeFile(contents) {
  let data;
  try {
    data = JSON.parse(contents);
  } catch (err) {
    // Maybe it's raw XML
    if (contents.trim().startsWith("<")) {
      const formattedXML = formatXML(contents.trim());
      document.getElementById('decodedSAML').textContent = formattedXML;
      updateCaptureTimestampFromSAML(formattedXML);
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
  
  // HAR or SAML tracer
  if (data.log && data.log.entries) {
    // HAR
    samlRequests = data.log.entries.filter(entry =>
      entry.request.method === 'POST' && 
      ((entry.request.postData?.text?.includes('SAMLRequest') || entry.request.postData?.text?.includes('SAMLResponse')))
    );
  } else if (data.requests) {
    // SAML tracer export
    samlRequests = data.requests.filter(req => {
      if (req.method !== 'POST') return false;
      if (req.postData?.text?.includes('SAMLRequest') || req.postData?.text?.includes('SAMLResponse')) {
        return true;
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

// Navigation
function updateNavigation() {
  const prevButton = document.getElementById('prevRequest');
  const nextButton = document.getElementById('nextRequest');
  const currentUrl = document.getElementById('currentUrl');
  const entry = samlRequests[currentRequestIndex];
  const req = entry.request ? entry.request : entry;
  
  prevButton.disabled = (currentRequestIndex === 0);
  nextButton.disabled = (currentRequestIndex === samlRequests.length - 1);
  currentUrl.textContent = req.url;
}

document.getElementById('prevRequest').addEventListener('click', () => {
  if (currentRequestIndex > 0) {
    currentRequestIndex--;
    updateNavigation();
    displaySAMLRequest(currentRequestIndex);
  }
});
document.getElementById('nextRequest').addEventListener('click', () => {
  if (currentRequestIndex < samlRequests.length - 1) {
    currentRequestIndex++;
    updateNavigation();
    displaySAMLRequest(currentRequestIndex);
  }
});

// Display a single SAML request
function displaySAMLRequest(index) {
  const entry = samlRequests[index];
  const req = entry.request ? entry.request : entry;
  let results = '';
  let samlResponse = '';

  results += `SAML Request ${index + 1}:\n`;
  results += `URL: ${req.url}\n`;
  results += `Method: ${req.method}\n`;
  results += 'Headers:\n';
  (req.headers || req.requestHeaders)?.forEach(header => {
    results += `  ${header.name}: ${header.value}\n`;
  });
  results += 'Post Data:\n';
  if (req.postData?.text) {
    const decodedText = decodeURIComponent(req.postData.text);
    results += prettier.format(decodedText, { parser: "html", plugins: prettierPlugins });
    const match = decodedText.match(/SAMLResponse=([^&]+)/);
    if (match) {
      samlResponse = match[1];
    }
  }
  document.getElementById('results').textContent = results;

  if (samlResponse) {
    const decodedSAML = decodeAndFormatSAML(samlResponse);
    document.getElementById('decodedSAML').textContent = decodedSAML;
    updateCaptureTimestampFromSAML(decodedSAML);
    const summary = getSAMLSummary(decodedSAML);
    document.getElementById('samlSummary').innerHTML = summary;
  } else {
    document.getElementById('decodedSAML').textContent = 'No SAMLResponse found in this request.';
    document.getElementById('samlSummary').textContent = 'No SAMLResponse found in this request.';
  }
}

// Decode & format
function decodeAndFormatSAML(encodedSAML) {
  try {
    let decoded = encodedSAML;
    try {
      decoded = decodeURIComponent(encodedSAML);
    } catch(e) {}
    decoded = decoded.replace(/-/g, "+").replace(/_/g, "/");
    while (decoded.length % 4 !== 0) decoded += "=";
    let base64Decoded = "";
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

function formatXML(xml) {
  let formatted = '';
  let indent = '';
  const tab = '    ';
  xml.split(/>\s*</).forEach(node => {
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

// Summaries
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
    table += '<tr><th>Attribute</th><th>Value</th></tr>';
    for (let [key, value] of Object.entries(data)) {
      table += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    table += '</table>';
    return table;
  }

  function createTableFromRows(title, rows, duplicateAttributes) {
    let note = "";
    if (duplicateAttributes.size > 0) {
      note = `<p class="duplicate-note">Note: Duplicate values detected for attribute(s): ${[...duplicateAttributes].join(", ")}</p>`;
    }
    let table = `<h3>${title}</h3>${note}<table>`;
    table += '<tr><th>Attribute</th><th>Value</th></tr>';
    rows.forEach(r => {
      let duplicateClass = r.duplicate ? ' duplicate-value' : '';
      table += `<tr><td>${r.attribute}</td><td class="${duplicateClass}">${r.value}</td></tr>`;
    });
    table += '</table>';
    return table;
  }

  // SAML Response
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

  // SAML Assertion
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

  // Attribute Statement
  const attributeStatement = getElementByTagNames(xmlDoc, ['AttributeStatement']);
  if (attributeStatement) {
    const attributes = attributeStatement.getElementsByTagNameNS("*", 'Attribute');
    const rows = [];
    const duplicateAttributes = new Set();
    for (let attr of attributes) {
      const name = attr.getAttribute('Name');
      if (!name) continue;
      const valueElements = attr.getElementsByTagNameNS("*", 'AttributeValue');
      const freq = {};
      for (let ve of valueElements) {
        freq[ve.textContent] = (freq[ve.textContent] || 0) + 1;
      }
      for (let ve of valueElements) {
        const val = ve.textContent;
        const isDup = freq[val] > 1;
        if (isDup) duplicateAttributes.add(name);
        rows.push({ attribute: name, value: val, duplicate: isDup });
      }
    }
    if (rows.length > 0) {
      summary += createTableFromRows('Attribute Statement', rows, duplicateAttributes);
    }
  }

  return summary;
}
