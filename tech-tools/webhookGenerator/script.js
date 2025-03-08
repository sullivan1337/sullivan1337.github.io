document.addEventListener('DOMContentLoaded', () => {
  // Dark mode toggle logic (from the template)
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  } else {
    themeToggle.textContent = '☀️';
  }
  
  themeToggle.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    this.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });
  
  // Reset button functionality: clear all form fields and reset headers to default
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    document.getElementById('webhook-form').reset();
    document.getElementById('basic-auth').style.display = 'none';
    document.getElementById('token-auth').style.display = 'none';
    const headersContainer = document.getElementById('headers-container');
    headersContainer.innerHTML = '';
    addHeaderRow('Accept', 'application/json');
    addHeaderRow('Content-Type', 'application/json');
    document.getElementById('output').textContent = '';
    document.getElementById('curl-output').textContent = '';
  });
  
  // -------------------------------
  // Webhook Generator Logic Below
  // -------------------------------
  
  // Toggle Authentication Inputs
  const authRadios = document.querySelectorAll('input[name="authentication"]');
  authRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('basic-auth').style.display = 'none';
      document.getElementById('token-auth').style.display = 'none';
      if (radio.value === 'basic') {
        document.getElementById('basic-auth').style.display = 'block';
      } else if (radio.value === 'token') {
        document.getElementById('token-auth').style.display = 'block';
      }
    });
  });
  
  // Function to add a new header row
  document.getElementById('add-header').addEventListener('click', addHeaderRow);
  
  function addHeaderRow(headerKey = '', headerValue = '') {
    const row = document.createElement('div');
    row.className = 'webhook-row';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Header Key';
    keyInput.value = headerKey;
    keyInput.className = 'form-control';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Header Value';
    valueInput.value = headerValue;
    valueInput.className = 'form-control';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'btn-danger';
    removeBtn.addEventListener('click', () => {
      row.remove();
    });
    
    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    
    document.getElementById('headers-container').appendChild(row);
  }
  
  // Initialize default headers
  addHeaderRow('Accept', 'application/json');
  addHeaderRow('Content-Type', 'application/json');
  
  // Retrieve headers from the form
  function getHeaders() {
    const headers = {};
    const rows = document.getElementById('headers-container').querySelectorAll('.webhook-row');
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 2) {
        const key = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        if (key && value) {
          headers[key] = value;
        }
      }
    });
    return headers;
  }
  
  // Get authentication values
  function getAuthentication() {
    const selected = document.querySelector('input[name="authentication"]:checked').value;
    if (selected === 'basic') {
      return {
        method: 'basic',
        username: document.getElementById('basic-username').value,
        password: document.getElementById('basic-password').value
      };
    } else if (selected === 'token') {
      return {
        method: 'token',
        token: document.getElementById('token').value
      };
    } else {
      return { method: 'none' };
    }
  }
  
  // Generate the curl command from webhook data
  function generateCurlCommand(webhook) {
    let cmd = `curl -X POST '${webhook.url}'`;
    for (let key in webhook.headers) {
      cmd += ` -H '${key}: ${webhook.headers[key]}'`;
    }
    cmd += ` -d '${webhook.body}'`;
    return cmd;
  }
  
  // Handle form submission to generate the webhook JSON and curl command
  document.getElementById('generated-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const bodyContent = document.getElementById('content').value;
    const headers = getHeaders();
    const auth = getAuthentication();
    const validateJson = document.getElementById('validate-json').checked;
    
    if (validateJson) {
      try {
        JSON.parse(bodyContent);
      } catch (err) {
        return;
      }
    }
    
    if (auth.method === 'basic') {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers['Authorization'] = `Basic ${encoded}`;
    } else if (auth.method === 'token') {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    
    const webhook = {
      url: url,
      method: 'POST',
      headers: headers,
      body: bodyContent
    };
    
    document.getElementById('output').textContent = JSON.stringify(webhook, null, 2);
    document.getElementById('curl-output').textContent = generateCurlCommand(webhook);
  });
  
  // Copy the curl command to clipboard (no popups)
  document.getElementById('copy-curl').addEventListener('click', () => {
    const outputElem = document.getElementById('curl-output');
    const range = document.createRange();
    range.selectNodeContents(outputElem);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
  });
  
  // Copy the full webhook JSON to clipboard (no popups)
  document.getElementById('copy-json').addEventListener('click', () => {
    const outputElem = document.getElementById('output');
    const range = document.createRange();
    range.selectNodeContents(outputElem);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
  });
});
