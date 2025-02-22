// script.js

document.addEventListener('DOMContentLoaded', () => {
    const outputEl = document.getElementById('output');
    const runBtn = document.getElementById('runBtn');
  
    runBtn.addEventListener('click', async () => {
      outputEl.textContent = "Running...";
  
      const jsonText = document.getElementById('jsonInput').value;
      const filter = document.getElementById('jqFilter').value;
  
      try {
        // Wait for the WASM to finish initializing
        await window.jqReady;
  
        // Now we can call the global function window.jq(...)
        const result = window.jq(jsonText, filter);
        outputEl.textContent = result;
      } catch (err) {
        outputEl.textContent = "Error: " + err;
      }
    });
  });
  