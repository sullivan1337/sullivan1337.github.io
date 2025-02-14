// script.js

document.addEventListener('DOMContentLoaded', () => {
    const outputEl = document.getElementById('output');
    const runBtn = document.getElementById('runBtn');
  
    runBtn.addEventListener('click', async () => {
      const jsonInput = document.getElementById('jsonInput').value;
      const jqFilter = document.getElementById('jqFilter').value;
      outputEl.textContent = 'Running...';
  
      try {
        // jq.js from fiatjaf/jq-web exposes a Promise "window.jqReady"
        // and a global function "window.jq(json, filter)" once loaded.
        await window.jqReady; 
        
        // Call the jq function provided by the wasm build:
        const result = window.jq(jsonInput, jqFilter);
        outputEl.textContent = result;
      } catch (err) {
        outputEl.textContent = 'Error: ' + err;
      }
    });
  });
  