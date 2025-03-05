let samlRequests = [];
let currentRequestIndex = 0;

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const contents = e.target.result;
        analyzeFile(contents);
    };

    reader.readAsText(file);
});

document.getElementById('analyzeRawBtn').addEventListener('click', function() {
    analyzeRawInput();
});

document.getElementById('resetBtn').addEventListener('click', function() {
    document.getElementById('fileInput').value = "";
    document.getElementById('rawTextInput').value = "";
    document.getElementById('results').textContent = "";
    document.getElementById('decodedSAML').textContent = "";
    document.getElementById('samlSummary').textContent = "";
    document.getElementById('navigation').style.display = 'none';
    samlRequests = [];
    currentRequestIndex = 0;
});

function analyzeFile(contents) {
    let data;
    try {
        data = JSON.parse(contents);
    } catch (err) {
        document.getElementById('results').textContent = 'Invalid JSON file.';
        return;
    }
    
    // Determine file type based on structure
    if (data.log && data.log.entries) {
        // HAR file format
        samlRequests = data.log.entries.filter(entry => 
            entry.request.method === 'POST' && 
            (entry.request.postData?.text?.includes('SAMLRequest') || 
             entry.request.postData?.text?.includes('SAMLResponse'))
        );
    } else if (data.requests) {
        // SAML tracer export format
        samlRequests = data.requests.filter(req => 
            req.method === 'POST' && 
            (req.postData?.text?.includes('SAMLRequest') || 
             req.postData?.text?.includes('SAMLResponse'))
        );
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

function analyzeRawInput() {
    const rawText = document.getElementById('rawTextInput').value.trim();
    if (!rawText) {
        alert("Please paste raw SAML trace/response.");
        return;
    }
    let formattedXML = "";
    try {
        if (rawText.startsWith("<")) {
            // Assume it's XML
            formattedXML = formatXML(rawText);
        } else {
            // Assume it's URL or base64 encoded SAML
            formattedXML = decodeAndFormatSAML(rawText);
        }
    } catch(e) {
        formattedXML = "Error processing raw input.";
    }
    document.getElementById('decodedSAML').textContent = formattedXML;
    const summary = getSAMLSummary(formattedXML);
    document.getElementById('samlSummary').innerHTML = summary;
    document.getElementById('results').textContent = "Processed raw SAML input.";
    // Hide navigation since it's not file-based
    document.getElementById('navigation').style.display = 'none';
}

function updateNavigation() {
    const prevButton = document.getElementById('prevRequest');
    const nextButton = document.getElementById('nextRequest');
    const currentUrl = document.getElementById('currentUrl');
    const entry = samlRequests[currentRequestIndex];
    // Use entry.request if available, otherwise use entry directly
    const req = entry.request ? entry.request : entry;
    
    prevButton.disabled = currentRequestIndex === 0;
    nextButton.disabled = currentRequestIndex === samlRequests.length - 1;
    currentUrl.textContent = req.url;
}

function displaySAMLRequest(index) {
    const entry = samlRequests[index];
    // Use entry.request if available, otherwise use entry directly
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
        
        // Extract SAMLResponse from the post data
        const match = decodedText.match(/SAMLResponse=([^&]+)/);
        if (match) {
            samlResponse = match[1];
        }
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

document.getElementById('prevRequest').addEventListener('click', function() {
    if (currentRequestIndex > 0) {
        currentRequestIndex--;
        updateNavigation();
        displaySAMLRequest(currentRequestIndex);
    }
});

document.getElementById('nextRequest').addEventListener('click', function() {
    if (currentRequestIndex < samlRequests.length - 1) {
        currentRequestIndex++;
        updateNavigation();
        displaySAMLRequest(currentRequestIndex);
    }
});

function decodeAndFormatSAML(encodedSAML) {
    try {
        let urlDecoded;
        try {
            urlDecoded = decodeURIComponent(encodedSAML);
        } catch(e) {
            urlDecoded = encodedSAML;
        }
        let base64Decoded;
        try {
            base64Decoded = atob(urlDecoded);
        } catch(e) {
            base64Decoded = urlDecoded;
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
    xml.split(/>\s*</).forEach(function(node) {
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

    // Response
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

    // Assertion
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

    // AttributeStatement
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

function addTableResizers() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const cols = table.querySelectorAll('th');
        
        // Calculate initial column widths
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

        let firstColWidth = Math.min(firstColMaxWidth, totalWidth * 0.4); // Max 40% of total width
        let secondColWidth = totalWidth - firstColWidth;

        // Set initial widths
        cols[0].style.width = `${firstColWidth}px`;
        cols[1].style.width = `${secondColWidth}px`;

        cols.forEach((col, index) => {
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
