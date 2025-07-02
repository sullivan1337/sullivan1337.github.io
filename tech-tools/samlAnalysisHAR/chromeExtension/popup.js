let samlRequests = [];
let currentRequestIndex = 0;

const COGNITO_RELAY_STATE_KEY_MAP = {
  a: "user_pool_id",
  b: "identity_provider",
  c: "client_id",
  d: "redirect_uri",
  e: "response_type",
  f: "idp_initiated",
  g: "scope",
  h: "client_metadata_b64",
  k: "cookie",
  l: "cognito_domain",
  m: "expire_timestamp",
  p: "is_protected",
  r: "request_id",
  t: "in_response_to",
};

function debounce(func, delay = 500) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  
  // Use chrome.storage.local for theme persistence
  chrome.storage.local.get(['theme'], (result) => {
    // Default to dark mode if no theme is set
    if (result.theme === 'light') {
      document.body.classList.remove('dark-mode');
      themeToggle.textContent = '🌙';
    } else {
      document.body.classList.add('dark-mode');
      themeToggle.textContent = '☀️';
    }
  });

  const rawTextInput = document.getElementById('rawTextInput');
  const relayStateInput = document.getElementById('relayStateInput');
  const debouncedAnalysis = debounce(analyzeRawInput);

  if (rawTextInput) {
      rawTextInput.addEventListener('input', debouncedAnalysis);
  }
  if (relayStateInput) {
      relayStateInput.addEventListener('input', debouncedAnalysis);
  }
});

document.getElementById('themeToggle').addEventListener('click', function () {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  const newTheme = isDarkMode ? 'dark' : 'light';
  this.textContent = isDarkMode ? '☀️' : '🌙';
  chrome.storage.local.set({ theme: newTheme });
});

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

document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => analyzeFile(e.target.result);
  reader.readAsText(file);
});

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

document.getElementById('resetBtn').addEventListener('click', function () {
  document.getElementById('fileInput').value = "";
  document.getElementById('rawTextInput').value = "";
  document.getElementById('relayStateInput').value = "";
  document.getElementById('results').textContent = "";
  document.getElementById('decodedSAML').textContent = "";
  document.getElementById('samlSummary').textContent = "";
  const nav = document.getElementById('navigation');
  nav.style.display = 'none';
  nav.classList.remove('highlight');
  document.getElementById('samlCount').textContent = '';
  samlRequests = [];
  currentRequestIndex = 0;
  document.getElementById('validationStatus').textContent = "";
  document.getElementById('relayStateValidationStatus').textContent = "";
  document.getElementById('captureTimestamp').textContent = "";
});

function updateCaptureTimestampFromSAML(decodedSAML) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(decodedSAML, "text/xml");
    let ts = "";
    const root = xmlDoc.documentElement;
    if (root && root.localName === 'AuthnRequest' && root.getAttribute("IssueInstant")) {
      ts = root.getAttribute("IssueInstant");
    } else {
      const response = xmlDoc.getElementsByTagNameNS("*", "Response")[0];
      if (response && response.getAttribute("IssueInstant")) {
        ts = response.getAttribute("IssueInstant");
      } else {
        const assertion = xmlDoc.getElementsByTagNameNS("*", "Assertion")[0];
        if (assertion && assertion.getAttribute("IssueInstant")) {
          ts = assertion.getAttribute("IssueInstant");
        }
      }
    }
    if (ts) {
      const displayTime = new Date(ts).toLocaleString();
      document.getElementById('captureTimestamp').textContent = `Captured at: ${displayTime}`;
    } else {
      document.getElementById('captureTimestamp').textContent = "";
    }
  } catch (e) {
    document.getElementById('captureTimestamp').textContent = "";
  }
}

function validateInput(text, statusElementId) {
    const statusElement = document.getElementById(statusElementId);
    if (!text) {
        statusElement.textContent = '';
        return;
    }
    try {
        JSON.parse(text);
        statusElement.textContent = 'Valid JSON ✓';
        statusElement.style.color = 'limegreen';
        return;
    } catch (e) {}
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(text, "text/xml");
    if (!xmlDoc.getElementsByTagName("parsererror").length && text.trim().startsWith('<')) {
        statusElement.textContent = 'Valid XML ✓';
        statusElement.style.color = 'limegreen';
        return;
    }
    try {
        if (/^[A-Za-z0-9+/=._-]+$/.test(text)) {
            atob(text.replace(/-/g, '+').replace(/_/g, '/').split('.')[0]);
            statusElement.textContent = 'Valid Base64 ✓';
            statusElement.style.color = 'limegreen';
            return;
        }
    } catch (e) {}
    statusElement.textContent = `Attempting to parse unknown format...`;
    statusElement.style.color = "orange";
}

function analyzeRawInput() {
  const rawText = document.getElementById('rawTextInput').value.trim();
  const separateRelayState = document.getElementById('relayStateInput').value.trim();
  
  validateInput(rawText, 'validationStatus');
  validateInput(separateRelayState, 'relayStateValidationStatus');

  if (!rawText) {
    document.getElementById('decodedSAML').textContent = "";
    document.getElementById('samlSummary').textContent = "";
    document.getElementById('results').textContent = "";
    document.getElementById('captureTimestamp').textContent = "";
    return;
  }
  
  analyzeFile(rawText, separateRelayState);
}

function analyzeFile(contents, separateRelayState = "") {
  try {
    const data = JSON.parse(contents);
    if (data.log && data.log.entries) {
      samlRequests = data.log.entries.filter(entry => {
        if (!entry || !entry.request || entry.request.method !== 'POST' || !entry.request.postData) return false;
        if (entry.request.postData.params) return entry.request.postData.params.some(p => p.name === 'SAMLRequest' || p.name === 'SAMLResponse');
        if (typeof entry.request.postData.text === "string") return entry.request.postData.text.includes('SAMLRequest') || entry.request.postData.text.includes('SAMLResponse');
        return false;
      });
    } else if (data.requests) {
      samlRequests = data.requests.filter(req => {
        if (req.saml && typeof req.saml === "string" && req.saml.trim().length > 0) return true;
        if (req.method === "POST" && req.postData && typeof req.postData.text === "string") return req.postData.text.includes('SAMLRequest') || req.postData.text.includes('SAMLResponse');
        if (req.method === "POST" && req.post && Array.isArray(req.post)) return req.post.some(pair => Array.isArray(pair) && pair.length >= 2 && (pair[0] === 'SAMLRequest' || pair[0] === 'SAMLResponse') && !!pair[1]);
        if (req.method === "GET" && req.get && Array.isArray(req.get)) return req.get.some(pair => Array.isArray(pair) && pair.length >= 2 && (pair[0] === 'SAMLRequest' || pair[0] === 'SAMLResponse') && !!pair[1]);
        return false;
      });
    } else {
        processRawContent(contents, separateRelayState);
        return;
    }

    const nav = document.getElementById('navigation');
    if (samlRequests.length > 1) {
        nav.style.display = 'flex';
        nav.classList.add('highlight');
        currentRequestIndex = 0;
        updateNavigation();
        displaySAMLRequest(currentRequestIndex);
    } else if (samlRequests.length === 1) {
        nav.style.display = 'none';
        nav.classList.remove('highlight');
        document.getElementById('samlCount').textContent = '';
        currentRequestIndex = 0;
        displaySAMLRequest(currentRequestIndex);
    } else {
        document.getElementById('results').textContent = 'No SAML requests found in the file.';
        nav.style.display = 'none';
        nav.classList.remove('highlight');
    }

  } catch (err) {
    processRawContent(contents, separateRelayState);
  }
}

function processRawContent(rawText, separateRelayState) {
    let formattedXML = "";
    if (rawText.startsWith("<")) {
        formattedXML = formatXML(rawText);
    } else {
        formattedXML = decodeAndFormatSAML(rawText);
    }
    document.getElementById('decodedSAML').textContent = formattedXML;
    updateCaptureTimestampFromSAML(formattedXML);
    let summaryHTML = getSAMLSummary(formattedXML);

    if (separateRelayState) {
        const relayStateData = decodeRelayState(separateRelayState);
        const relayStateTableData = {
            'Raw Value': `<textarea readonly class="cert-textarea">${separateRelayState}</textarea>`,
            'Parsed String Value': `<pre>${relayStateData.parsedStringValue}</pre>`,
            'Full String Value': `<pre>${relayStateData.fullStringValue}</pre>`,
            'Decoded JSON': `<pre>${relayStateData.decoded}</pre>`,
        };
        if (relayStateData.notes) {
            relayStateTableData['Notes'] = relayStateData.notes;
        }
        summaryHTML += createTable('Relay State (from separate input)', relayStateTableData);
    }

    document.getElementById('samlSummary').innerHTML = summaryHTML;
    document.getElementById('results').textContent = "Processed raw SAML input.";
    document.getElementById('navigation').style.display = 'none';
    document.getElementById('samlCount').textContent = '';
}

function updateNavigation() {
  try {
    const prevButton = document.getElementById('prevRequest');
    const nextButton = document.getElementById('nextRequest');
    const currentUrl = document.getElementById('currentUrl');
    const samlCountSpan = document.getElementById('samlCount');
    
    if (!samlRequests || samlRequests.length === 0 || !samlRequests[currentRequestIndex]) return;

    const entry = samlRequests[currentRequestIndex];
    const req = entry.request ? entry.request : entry;

    prevButton.disabled = (currentRequestIndex === 0);
    nextButton.disabled = (currentRequestIndex === samlRequests.length - 1);
    currentUrl.textContent = req.url || '(no URL)';
    
    if (samlRequests.length > 1) {
      samlCountSpan.textContent = `(${currentRequestIndex + 1} of ${samlRequests.length})`;
    } else {
      samlCountSpan.textContent = '';
    }
  } catch (e) {
      console.error("Error in updateNavigation:", e);
  }
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

function displaySAMLRequest(index) {
  try {
    if (!samlRequests || !samlRequests[index]) return;

    const entry = samlRequests[index];
    const req = entry.request ? entry.request : entry;

    let results = `SAML Request ${index + 1}:\n`;
    results += `URL: ${req.url}\n`;
    results += `Method: ${req.method}\n`;
    results += 'Headers:\n';
    (req.headers || req.requestHeaders || []).forEach(header => {
      results += `  ${header.name}: ${header.value}\n`;
    });
    results += 'Post Data:\n';

    let samlResponse = "";
    let relayState = "";

    if (req.postData && Array.isArray(req.postData.params)) {
        const samlParam = req.postData.params.find(p => p.name === 'SAMLResponse' || p.name === 'SAMLRequest');
        if (samlParam) samlResponse = samlParam.value;

        const relayStateParam = req.postData.params.find(p => p.name === 'RelayState');
        if (relayStateParam) relayState = relayStateParam.value;

        req.postData.params.forEach(p => {
            results += `${p.name}: ${p.value.substring(0, 100)}...\n\n`;
        });

    } else if (req.postData && req.postData.text) {
        const decodedText = decodeURIComponent(req.postData.text);
        results += decodedText;
        const samlMatch = decodedText.match(/(SAMLResponse|SAMLRequest)=([^&]+)/);
        if (samlMatch) samlResponse = samlMatch[2];
        const relayMatch = decodedText.match(/RelayState=([^&]+)/);
        if (relayMatch) relayState = relayMatch[1];
    }

    document.getElementById('results').textContent = results;

    let decodedSAML = "";
    if (req.saml && typeof req.saml === "string" && req.saml.trim().length > 0) {
      decodedSAML = formatXML(req.saml);
    } else if (samlResponse) {
      decodedSAML = decodeAndFormatSAML(samlResponse);
    } else {
      decodedSAML = 'No SAMLResponse or SAMLRequest found in this request.';
    }

    document.getElementById('decodedSAML').textContent = decodedSAML;
    updateCaptureTimestampFromSAML(decodedSAML);
    let summaryHTML = getSAMLSummary(decodedSAML);

    const separateRelayState = document.getElementById('relayStateInput').value.trim();
    const finalRelayState = relayState || separateRelayState;

    if (finalRelayState) {
        const relayStateData = decodeRelayState(finalRelayState);
        const relayStateTableData = {
            'Raw Value': `<textarea readonly class="cert-textarea">${finalRelayState}</textarea>`,
            'Parsed String Value': `<pre>${relayStateData.parsedStringValue}</pre>`,
            'Full String Value': `<pre>${relayStateData.fullStringValue}</pre>`,
            'Decoded JSON': `<pre>${relayStateData.decoded}</pre>`,
        };
        if (relayStateData.notes) {
            relayStateTableData['Notes'] = relayStateData.notes;
        }
        summaryHTML += createTable('Relay State', relayStateTableData);
    }
    document.getElementById('samlSummary').innerHTML = summaryHTML;

  } catch (e) {
      console.error(`Error displaying SAML Request at index ${index}:`, e);
      alert(`An error occurred while displaying request #${index + 1}. Please check the developer console for details.`);
  }
}

function decodeAndFormatSAML(encodedSAML) {
  try {
    let decoded = encodedSAML;
    try {
      decoded = decodeURIComponent(decoded);
    } catch (e) {}
    decoded = decoded.replace(/-/g, '+').replace(/_/g, '/');
    while (decoded.length % 4 !== 0) decoded += "=";
    let base64Decoded = "";
    try {
      base64Decoded = atob(decoded);
    } catch (e) {
      base64Decoded = decoded;
    }
    return formatXML(base64Decoded);
  } catch (err) {
    return "Error decoding SAML response.";
  }
}

// CORRECTED: Restored the original, working formatXML function
function formatXML(xml) {
  try {
    let cleanedXml = xml.trim().replace(/ /g, ' ').replace(/(")([a-zA-Z0-9_-]+=")/g, '$1 $2');
    let formatted = '', indent = '', tab = '    ';
    const xmlArr = cleanedXml.replace(/>\s*</g, '>\n<').split('\n');
    for (const node of xmlArr) {
      const trimmedNode = node.trim();
      if (!trimmedNode) continue;
      const isClosingTag = trimmedNode.startsWith('</');
      const isSelfClosing = trimmedNode.endsWith('/>');
      const isOpeningTag = trimmedNode.startsWith('<') && !isClosingTag && !isSelfClosing;
      const isInlineTag = isOpeningTag && trimmedNode.includes('</');
      if (isClosingTag && !isInlineTag) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + trimmedNode + '\r\n';
      if (isOpeningTag && !isInlineTag) {
        indent += tab;
      }
    }
    return formatted.trim();
  } catch (e) {
    return xml;
  }
}

function decodeRelayState(relayState) {
  const defaultReturn = { decoded: relayState, notes: 'Value is likely plain text or an unknown format.', stringValue: relayState, parsedStringValue: relayState };
  if (!relayState) return { decoded: '', notes: 'Not present.', stringValue: '', parsedStringValue: '' };

  const processDecodedString = (decodedString) => {
    try {
      const parsed = JSON.parse(decodedString);
      const expanded = {};
      const fullStringParams = new URLSearchParams();
      const parsedStringParams = new URLSearchParams();
      const parsedStringKeys = ['client_id', 'identity_provider', 'redirect_uri', 'response_type', 'scope'];

      for (const key in parsed) {
        expanded[COGNITO_RELAY_STATE_KEY_MAP[key] || `unknownKey_${key}`] = parsed[key];
      }
      
      let finalRedirectUri = expanded.redirect_uri;
      if (expanded.cognito_domain) {
          const domainMatch = expanded.cognito_domain.match(/^([a-f0-9-]+)/);
          if (domainMatch && domainMatch[1]) {
               finalRedirectUri = `https://auth.app.wiz.io/api/idp-init-callback/${domainMatch[1]}`;
          }
      }

      for (const key in expanded) {
          let value = expanded[key];
          if (key === 'scope' && Array.isArray(value)) {
              value = value.join(' ');
          }
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              fullStringParams.append(key, value);
          }
      }
      
      parsedStringKeys.forEach(key => {
        if (expanded.hasOwnProperty(key)) {
            let value = (key === 'redirect_uri') ? finalRedirectUri : expanded[key];
            if (key === 'scope' && Array.isArray(value)) {
                value = value.join(' ');
            }
            parsedStringParams.append(key, value);
        }
      });
      
      if (expanded.client_metadata_b64) {
          try {
              expanded.client_metadata_decoded = JSON.parse(atob(expanded.client_metadata_b64));
          } catch (e) {
              expanded.client_metadata_decoded = "Could not decode Base64/JSON.";
          }
      }

      return { 
          decoded: JSON.stringify(expanded, null, 2),
          fullStringValue: decodeURIComponent(fullStringParams.toString()),
          parsedStringValue: decodeURIComponent(parsedStringParams.toString())
      };

    } catch (e) {
      return { decoded: decodedString, fullStringValue: decodedString, parsedStringValue: 'Could not parse from JSON.' };
    }
  };
  
  let mainPart = relayState.split('.')[0];
  let standardBase64 = mainPart.replace(/-/g, '+').replace(/_/g, '/');
  while (standardBase64.length % 4) {
      standardBase64 += '=';
  }

  if (standardBase64.startsWith('H4sIA')) {
      if (typeof pako === 'undefined') {
          return { ...defaultReturn, notes: 'Value appears to be GZIP compressed. Include Pako.js library to decode.' };
      }
      try {
          const binaryData = Uint8Array.from(atob(standardBase64), c => c.charCodeAt(0));
          const inflated = pako.inflate(binaryData, { to: 'string' });
          return { ...processDecodedString(inflated), notes: null };
      } catch(e) {
          console.error("GZIP Decode Error:", e);
          return { ...defaultReturn, notes: `Error during GZIP decode: ${e.message}` };
      }
  }
  
  try {
      const decoded = atob(standardBase64);
      if (/^[\x20-\x7E\r\n\t]*$/.test(decoded)) {
           return { ...processDecodedString(decoded), notes: null };
      }
  } catch(e) {}

  try {
      const decoded = decodeURIComponent(relayState);
      if (decoded !== relayState) {
          return { ...processDecodedString(decoded), notes: null };
      }
  } catch(e) {}
  
  return defaultReturn;
}

function formatCertAttributes(attrs) {
  const parts = {};
  attrs.forEach(attr => {
    const key = attr.shortName || attr.name;
    parts[key] = attr.value;
  });
  return Object.entries(parts).map(([k, v]) => `${k}=${v}`).join(', ');
}

function getCertificateDetails(certBase64) {
  if (typeof forge === 'undefined') {
    return { 'Error': 'Forge.js library not loaded. Cannot parse certificate.' };
  }
  try {
    const cleanedBase64 = certBase64.replace(/\s/g, '');
    const certDer = forge.util.decode64(cleanedBase64);
    const certAsn1 = forge.asn1.fromDer(certDer);
    const cert = forge.pki.certificateFromAsn1(certAsn1);
    const md = forge.md.sha1.create();
    md.update(forge.asn1.toDer(certAsn1).getBytes());
    const thumbprint = md.digest().toHex().match(/.{1,2}/g).join(':');
    return {
      'Subject': formatCertAttributes(cert.subject.attributes),
      'Issuer': formatCertAttributes(cert.issuer.attributes),
      'Valid From (Not Before)': cert.validity.notBefore.toLocaleString(),
      'Valid To (Not After)': cert.validity.notAfter.toLocaleString(),
      'Serial Number': cert.serialNumber,
      'SHA-1 Thumbprint': thumbprint.toUpperCase(),
      'Signature Algorithm': forge.pki.oids[cert.signatureOid] || cert.signatureOid,
      'Public Key Algorithm': forge.pki.oids[cert.publicKey.oid] || cert.publicKey.oid,
      'Full Value': `<textarea readonly class="cert-textarea">${cleanedBase64}</textarea>`
    };
  } catch (e) {
    console.error('Error parsing certificate:', e);
    return { 'Error': 'Could not parse certificate data.', 'Message': e.message };
  }
}

function createTable(title, data) {
  let table = `<h3>${title}</h3><table>`;
  table += '<tr><th>Attribute</th><th>Value</th></tr>';
  for (let [key, value] of Object.entries(data)) {
    if (value !== null) {
      table += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
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

function getSAMLSummary(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  if (xmlDoc.getElementsByTagName("parsererror").length) {
    return `<p class="duplicate-note">Could not parse SAML XML. It may be malformed.</p>`;
  }
  let summary = '';

  function getElementByTagNames(doc, tags) {
    for (let tag of tags) {
      const elements = doc.getElementsByTagNameNS("*", tag);
      if (elements.length > 0) return elements[0];
    }
    return null;
  }

  const root = xmlDoc.documentElement;
  if (root && root.localName === 'AuthnRequest') {
    const data = {
      'ID': root.getAttribute('ID') || '',
      'IssueInstant': root.getAttribute('IssueInstant') || '',
      'Version': root.getAttribute('Version') || '',
      'Destination': root.getAttribute('Destination') || '',
      'AssertionConsumerServiceURL': root.getAttribute('AssertionConsumerServiceURL') || ''
    };
    summary += createTable('SAML AuthnRequest', data);
    const nameIDPolicy = root.getElementsByTagNameNS("*", 'NameIDPolicy')[0];
    if (nameIDPolicy) {
      const policyData = {
        'AllowCreate': nameIDPolicy.getAttribute('AllowCreate') || '',
        'Format': nameIDPolicy.getAttribute('Format') || ''
      };
      summary += createTable('NameIDPolicy', policyData);
    }
  } else {
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
      if (issuer) assertionData['Issuer'] = issuer.textContent;
      const subject = getElementByTagNames(assertion, ['Subject']);
      if (subject) {
        const nameID = subject.getElementsByTagNameNS("*", 'NameID')[0];
        if (nameID) assertionData['Subject'] = nameID.textContent;
      }
      summary += createTable('SAML Assertion', assertionData);
    }
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
    const certElements = xmlDoc.getElementsByTagNameNS("*", 'X509Certificate');
    if (certElements.length > 0) {
      for (let i = 0; i < certElements.length; i++) {
        const certNode = certElements[i];
        if (certNode.textContent) {
          const certDetails = getCertificateDetails(certNode.textContent);
          summary += createTable(`X.509 Certificate Details #${i + 1}`, certDetails);
        }
      }
    }
  }
  return summary;
}