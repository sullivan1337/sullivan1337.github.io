document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('generated-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const url = document.getElementById('url').value;
        const content = document.getElementById('content').value;
        const headers = getHeaders();
        const authentication = getAuthentication();
        const validateJson = document.getElementById('validate-json').checked;
    
        if (validateJson) {
            try {
                JSON.parse(content);
            } catch (e) {
                alert('Invalid JSON. Please fix the content and try again.');
                return;
            }
        }
    
        if (authentication.method === 'basic') {
            const basicAuth = btoa(`${authentication.username}:${authentication.password}`);
            headers['Authorization'] = `Basic ${basicAuth}`;
        } else if (authentication.method === 'token') {
            headers['Authorization'] = `Bearer ${authentication.token}`;
        }
    
        const webhook = {
            url: url,
            method: 'POST',
            headers: headers,
            body: content
        };
    
        document.getElementById('output').textContent = JSON.stringify(webhook, null, 2);
        document.getElementById('curl-output').textContent = generateCurlCommand(webhook);
    });
    
    document.getElementById('add-header').addEventListener('click', addHeaderRow);
    
    function addHeaderRow(headerKey = '', headerValue = '') {
        // Check if first argument is an event object
        if (headerKey instanceof Event) {
            headerKey = '';
            headerValue = '';
        }
    
        const row = document.createElement('div');
        row.className = 'row mb-2';
    
        const col1 = document.createElement('div');
        col1.className = 'col';
        const input1 = document.createElement('input');
        input1.type = 'text';
        input1.className = 'form-control';
        input1.placeholder = 'Header Key';
        input1.value = headerKey;
        col1.appendChild(input1);
    
        const col2 = document.createElement('div');
        col2.className = 'col';
        const input2 = document.createElement('input');
        input2.type = 'text';
        input2.className = 'form-control';
        input2.placeholder = 'Header Value';
        input2.value = headerValue;
        col2.appendChild(input2);
    
        const col3 = document.createElement('div');
        col3.className = 'col-auto align-self-center';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            row.remove();
        });
        col3.appendChild(removeBtn);
    
        row.appendChild(col1);
        row.appendChild(col2);
        row.appendChild(col3);
        document.getElementById('headers-container').appendChild(row);
    }
    
     
    
    document.querySelectorAll('input[type=radio][name=authentication]').forEach((radio) => {
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
    
    function getHeaders() {
        const headers = {};
        const rows = document.getElementById('headers-container').querySelectorAll('.row');
    
        for (const row of rows) {
            const key = row.children[0].children[0].value;
            const value = row.children[1].children[0].value;
            if (key && value) {
                headers[key] = value;
            }
        }
        return headers;
    }
    
    function getAuthentication() {
        const authMethod = document.querySelector('input[type=radio][name=authentication]:checked').value;
    
        if (authMethod === 'basic') {
            return {
                method: 'basic',
                username: document.getElementById('basic-username').value,
                password: document.getElementById('basic-password').value
            };
        } else if (authMethod === 'token') {
            return {
                method: 'token',
                token: document.getElementById('token').value

            };
        } else {
            return {
                method: 'none'
            };
        }
    }
    
    function generateCurlCommand(webhook) {
        let command = `curl -X POST '${webhook.url}'`;
    
        for (const key in webhook.headers) {
            command += ` -H '${key}: ${webhook.headers[key]}'`;
        }
    
        command += ` -d '${webhook.body}'`;
    
        return command;
    }
    
    // Add default headers
    addHeaderRow('Accept', 'application/json');
    addHeaderRow('Content-Type', 'application/json');
    
    
    const copyBtn = document.getElementById('copy-curl');
    const curlOutput = document.getElementById('curl-output');
    
    copyBtn.addEventListener('click', () => {
        // Create a new range object and select the contents of the cURL command element
        const range = document.createRange();
        range.selectNode(curlOutput);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    
        // Copy the selected text to the clipboard
        document.execCommand('copy');
        
        // Deselect the text and show a tooltip to indicate that the command has been copied
        window.getSelection().removeAllRanges();
        copyBtn.setAttribute('data-original-title', 'Copied!');
        $(copyBtn).tooltip('show');
        setTimeout(() => {
            $(copyBtn).tooltip('hide');
        }, 1000);
    });
    

  });
  