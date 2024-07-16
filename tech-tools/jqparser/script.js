async function processJSON() {
    const jsonInput = document.getElementById('jsonInput').value;
    const jqFilter = document.getElementById('jqFilter').value;
    let output;

    try {
        const json = JSON.parse(jsonInput);
        console.log('Parsed JSON:', json); // Debugging line

        const jqModule = await initJq();
        console.log('jqModule loaded:', jqModule); // Debugging line

        jqModule.promised.json(json, jqFilter).then(result => {
            console.log('jq result:', result); // Debugging line
            output = JSON.stringify(result, null, 2);
            document.getElementById('output').textContent = output;
        }).catch(e => {
            console.error('jq processing error:', e); // Debugging line
            document.getElementById('output').textContent = `Error: ${e.message}`;
        });
    } catch (e) {
        console.error('Error:', e); // Debugging line
        document.getElementById('output').textContent = `Error: ${e.message}`;
    }
}

async function initJq() {
    return new Promise((resolve, reject) => {
        jq.onRuntimeInitialized = () => {
            console.log('jqModule initialized'); // Debugging line
            resolve(jq);
        };
    });
}
