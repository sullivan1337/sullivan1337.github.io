document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const contents = e.target.result;
        analyzeHAR(contents);
    };

    reader.readAsText(file);
});

function analyzeHAR(contents) {
    const har = JSON.parse(contents);
    const samlRequests = har.log.entries.filter(entry => 
        entry.request.method === 'POST' && 
        (entry.request.postData?.text?.includes('SAMLRequest') || 
         entry.request.postData?.text?.includes('SAMLResponse'))
    );

    let results = '';
    let samlResponse = '';

    samlRequests.forEach((entry, index) => {
        results += `SAML Request ${index + 1}:\n`;
        results += `URL: ${entry.request.url}\n`;
        results += `Method: ${entry.request.method}\n`;
        results += 'Headers:\n';
        entry.request.headers.forEach(header => {
            results += `  ${header.name}: ${header.value}\n`;
        });
        results += 'Post Data:\n';
        if (entry.request.postData && entry.request.postData.text) {
            const decodedText = decodeURIComponent(entry.request.postData.text);
            results += prettier.format(decodedText, { parser: "html", plugins: prettierPlugins });
            
            // Extract SAMLResponse
            const match = decodedText.match(/SAMLResponse=([^&]+)/);
            if (match) {
                samlResponse = match[1];
            }
        }
        results += '\n\n';
    });

    document.getElementById('results').textContent = results || 'No SAML requests found in the HAR file.';
    
    if (samlResponse) {
        const decodedSAML = decodeAndFormatSAML(samlResponse);
        document.getElementById('decodedSAML').textContent = decodedSAML;
        
        const summary = getSAMLSummary(decodedSAML);
        document.getElementById('samlSummary').innerHTML = summary;
    } else {
        document.getElementById('decodedSAML').textContent = 'No SAMLResponse found in the HAR file.';
        document.getElementById('samlSummary').textContent = 'No SAMLResponse found in the HAR file.';
    }
}

function decodeAndFormatSAML(encodedSAML) {
    const urlDecoded = decodeURIComponent(encodedSAML);
    const base64Decoded = atob(urlDecoded);
    return formatXML(base64Decoded);
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

    let summary = '<table>';
    summary += '<tr><th>Attribute</th><th>Value</th></tr>';

    // Function to get element by tag name, considering different namespaces
    function getElementByTagNames(doc, tags) {
        for (let tag of tags) {
            const elements = doc.getElementsByTagNameNS("*", tag);
            if (elements.length > 0) return elements[0];
        }
        return null;
    }

    // Get Response or Assertion element
    const responseOrAssertion = getElementByTagNames(xmlDoc, ['Response', 'Assertion']);

    if (responseOrAssertion) {
        // Destination
        const destination = responseOrAssertion.getAttribute('Destination');
        if (destination) {
            summary += `<tr><td>Destination</td><td>${destination}</td></tr>`;
        }

        // IssueInstant
        const issueInstant = responseOrAssertion.getAttribute('IssueInstant');
        if (issueInstant) {
            summary += `<tr><td>IssueInstant</td><td>${issueInstant}</td></tr>`;
        }

        // Issuer
        const issuer = getElementByTagNames(responseOrAssertion, ['Issuer']);
        if (issuer) {
            summary += `<tr><td>Issuer</td><td>${issuer.textContent}</td></tr>`;
        }

        // Subject
        const subject = getElementByTagNames(responseOrAssertion, ['Subject']);
        if (subject) {
            const nameID = subject.getElementsByTagNameNS("*", 'NameID')[0];
            if (nameID) {
                summary += `<tr><td>Subject</td><td>${nameID.textContent}</td></tr>`;
            }
        }
    }

    // AttributeStatement
    const attributeStatement = getElementByTagNames(xmlDoc, ['AttributeStatement']);
    if (attributeStatement) {
        const attributes = attributeStatement.getElementsByTagNameNS("*", 'Attribute');
        for (let attr of attributes) {
            const name = attr.getAttribute('Name');
            const value = attr.getElementsByTagNameNS("*", 'AttributeValue')[0];
            if (name && value) {
                summary += `<tr><td>${name}</td><td>${value.textContent}</td></tr>`;
            }
        }
    }

    summary += '</table>';
    return summary;
}