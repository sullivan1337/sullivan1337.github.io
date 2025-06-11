// This is the core logic from the SAML analyzer tool, without any UI / DOM stuff
// Meant to be used as a module in headless or backend environments

// Decode & format base64 SAML response (handles URL-safe + padding)
function decodeAndFormatSAML(encodedSAML) {
  try {
    let decoded = encodedSAML;
    try {
      decoded = decodeURIComponent(encodedSAML);
    } catch (e) {}
    decoded = decoded.replace(/-/g, "+").replace(/_/g, "/");
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

// Quick and dirty XML formatter so you can actually read the SAML
function formatXML(xml) {
  let formatted = '';
  let indent = '';
  const tab = '    ';
  xml.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
    formatted += indent + '<' + node + '>' + '\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
  });
  return formatted.trim();
}

// Pulls basic metadata out of the SAML XML string
function getSAMLSummary(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  let summary = {};

  function getElementByTagNames(doc, tags) {
    for (let tag of tags) {
      const elements = doc.getElementsByTagNameNS("*", tag);
      if (elements.length > 0) return elements[0];
    }
    return null;
  }

  const root = xmlDoc.documentElement;

  if (root && root.localName === 'AuthnRequest') {
    summary.authnRequest = {
      ID: root.getAttribute('ID') || '',
      IssueInstant: root.getAttribute('IssueInstant') || '',
      Version: root.getAttribute('Version') || '',
      Destination: root.getAttribute('Destination') || '',
      AssertionConsumerServiceURL: root.getAttribute('AssertionConsumerServiceURL') || ''
    };
    const nameIDPolicy = root.getElementsByTagNameNS("*", 'NameIDPolicy')[0];
    if (nameIDPolicy) {
      summary.authnRequest.nameIDPolicy = {
        AllowCreate: nameIDPolicy.getAttribute('AllowCreate') || '',
        Format: nameIDPolicy.getAttribute('Format') || ''
      };
    }
  } else {
    const response = getElementByTagNames(xmlDoc, ['Response']);
    if (response) {
      summary.response = {
        ID: response.getAttribute('ID') || '',
        Version: response.getAttribute('Version') || '',
        IssueInstant: response.getAttribute('IssueInstant') || '',
        Destination: response.getAttribute('Destination') || '',
        InResponseTo: response.getAttribute('InResponseTo') || ''
      };
    }
    const assertion = getElementByTagNames(xmlDoc, ['Assertion']);
    if (assertion) {
      const assertionData = {
        ID: assertion.getAttribute('ID') || '',
        Version: assertion.getAttribute('Version') || '',
        IssueInstant: assertion.getAttribute('IssueInstant') || ''
      };
      const issuer = getElementByTagNames(assertion, ['Issuer']);
      if (issuer) assertionData.Issuer = issuer.textContent;
      const subject = getElementByTagNames(assertion, ['Subject']);
      if (subject) {
        const nameID = subject.getElementsByTagNameNS("*", 'NameID')[0];
        if (nameID) assertionData.Subject = nameID.textContent;
      }
      summary.assertion = assertionData;
    }
    const attributeStatement = getElementByTagNames(xmlDoc, ['AttributeStatement']);
    if (attributeStatement) {
      const attributes = attributeStatement.getElementsByTagNameNS("*", 'Attribute');
      summary.attributes = {};
      for (let attr of attributes) {
        const name = attr.getAttribute('Name');
        const valueElements = attr.getElementsByTagNameNS("*", 'AttributeValue');
        summary.attributes[name] = Array.from(valueElements).map(v => v.textContent);
      }
    }
  }
  return summary;
}

// Expose core functions for reuse elsewhere
export {
  decodeAndFormatSAML,
  formatXML,
  getSAMLSummary
};
