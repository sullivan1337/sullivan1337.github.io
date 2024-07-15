function processJSON() {
    const jsonInput = document.getElementById('jsonInput').value;
    const jqFilter = document.getElementById('jqFilter').value;
    let output;

    try {
        const json = JSON.parse(jsonInput);
        console.log('Parsed JSON:', json); // Debugging line

        jq.promised.json(json, jqFilter)
            .then(result => {
                console.log('jq result:', result); // Debugging line
                output = JSON.stringify(result, null, 2);
                document.getElementById('output').textContent = output;
            })
            .catch(error => {
                console.error('jq processing error:', error); // Debugging line
                document.getElementById('output').textContent = `Error: ${error.message}`;
            });
    } catch (e) {
        console.error('JSON parsing error:', e); // Debugging line
        document.getElementById('output').textContent = 'Invalid JSON';
    }
}
