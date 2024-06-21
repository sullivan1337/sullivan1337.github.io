document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                console.log("Parsed Data: ", results.data);
                const data = results.data;
                populateSelectOptions(data);
                populateTimeColumnSelect(data);
                setupChartUpdate(data);
                displayTable(data);
            },
            error: function(error) {
                console.error("Parsing Error: ", error);
            }
        });
    }
});

let chart1 = null;
let chart2 = null;
let chart3 = null;

let chart1Instance = null;
let chart2Instance = null;
let chart3Instance = null;

function populateTimeColumnSelect(data) {
    const timeColumnSelect = document.getElementById('timeColumnSelect');
    const keys = Object.keys(data[0]);

    keys.forEach((key, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `Column ${index + 1}: ${key}`;
        timeColumnSelect.appendChild(option);
    });
}

function populateSelectOptions(data) {
    const keys = ["null"].concat(Object.keys(data[0]));
    const chart1Selects = [
        document.getElementById('chart1Select1'),
        document.getElementById('chart1Select2'),
        document.getElementById('chart1Select3'),
        document.getElementById('chart1Select4')
    ];
    const chart2Selects = [
        document.getElementById('chart2Select1'),
        document.getElementById('chart2Select2'),
        document.getElementById('chart2Select3'),
        document.getElementById('chart2Select4')
    ];
    const chart3Selects = [
        document.getElementById('chart3Select1'),
        document.getElementById('chart3Select2'),
        document.getElementById('chart3Select3'),
        document.getElementById('chart3Select4')
    ];

    keys.forEach(key => {
        chart1Selects.forEach(select => {
            const option = document.createElement('option');
            option.value = key;
            option.text = key === "null" ? "None" : key;
            select.appendChild(option);
        });
        chart2Selects.forEach(select => {
            const option = document.createElement('option');
            option.value = key;
            option.text = key === "null" ? "None" : key;
            select.appendChild(option);
        });
        chart3Selects.forEach(select => {
            const option = document.createElement('option');
            option.value = key;
            option.text = key === "null" ? "None" : key;
            select.appendChild(option);
        });
    });
}

function setupChartUpdate(data) {
    const timeColumnSelect = document.getElementById('timeColumnSelect');
    let timeColumnIndex = timeColumnSelect.value;
    let time = data.map(row => row[Object.keys(row)[timeColumnIndex]]).filter(isValidNumber);

    const chart1Selects = [
        document.getElementById('chart1Select1'),
        document.getElementById('chart1Select2'),
        document.getElementById('chart1Select3'),
        document.getElementById('chart1Select4')
    ];
    const chart2Selects = [
        document.getElementById('chart2Select1'),
        document.getElementById('chart2Select2'),
        document.getElementById('chart2Select3'),
        document.getElementById('chart2Select4')
    ];
    const chart3Selects = [
        document.getElementById('chart3Select1'),
        document.getElementById('chart3Select2'),
        document.getElementById('chart3Select3'),
        document.getElementById('chart3Select4')
    ];

    const chart1Colors = [
        document.getElementById('chart1Color1'),
        document.getElementById('chart1Color2'),
        document.getElementById('chart1Color3'),
        document.getElementById('chart1Color4')
    ];
    const chart2Colors = [
        document.getElementById('chart2Color1'),
        document.getElementById('chart2Color2'),
        document.getElementById('chart2Color3'),
        document.getElementById('chart2Color4')
    ];
    const chart3Colors = [
        document.getElementById('chart3Color1'),
        document.getElementById('chart3Color2'),
        document.getElementById('chart3Color3'),
        document.getElementById('chart3Color4')
    ];

    const chart1Title = document.getElementById('chart1Title');
    const chart2Title = document.getElementById('chart2Title');
    const chart3Title = document.getElementById('chart3Title');

    const updateCharts = () => {
        const startRow = parseInt(document.getElementById('dataStartRow').value);
        const endRow = parseInt(document.getElementById('dataEndRow').value) || data.length;
        const filteredData = data.slice(startRow, endRow);

        const chart1Datasets = chart1Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : filteredData.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart1Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);

        const chart2Datasets = chart2Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : filteredData.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart2Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);

        const chart3Datasets = chart3Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : filteredData.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart3Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);

        updateChart(chart1Instance, chart1Title.value || 'Chart 1', filteredData.map(row => row[Object.keys(row)[timeColumnIndex]]).filter(isValidNumber), chart1Datasets);
        updateChart(chart2Instance, chart2Title.value || 'Chart 2', filteredData.map(row => row[Object.keys(row)[timeColumnIndex]]).filter(isValidNumber), chart2Datasets);
        updateChart(chart3Instance, chart3Title.value || 'Chart 3', filteredData.map(row => row[Object.keys(row)[timeColumnIndex]]).filter(isValidNumber), chart3Datasets);
    };

    chart1Selects.forEach(select => select.addEventListener('change', updateCharts));
    chart2Selects.forEach(select => select.addEventListener('change', updateCharts));
    chart3Selects.forEach(select => select.addEventListener('change', updateCharts));

    chart1Colors.forEach(color => color.addEventListener('input', updateCharts));
    chart2Colors.forEach(color => color.addEventListener('input', updateCharts));
    chart3Colors.forEach(color => color.addEventListener('input', updateCharts));

    chart1Title.addEventListener('input', updateCharts);
    chart2Title.addEventListener('input', updateCharts);
    chart3Title.addEventListener('input', updateCharts);

    // Create new chart instances
    chart1Instance = createChart('chart1', 'Chart 1', time, []);
    chart2Instance = createChart('chart2', 'Chart 2', time, []);
    chart3Instance = createChart('chart3', 'Chart 3', time, []);

    // Add event listener to update charts when "TIME" column selection changes
    timeColumnSelect.addEventListener('change', () => {
        timeColumnIndex = timeColumnSelect.value;
        updateCharts();
    });
    
    // Add event listeners for start and end row inputs
    document.getElementById('dataStartRow').addEventListener('input', updateCharts);
    document.getElementById('dataEndRow').addEventListener('input', updateCharts);
    
    // Initial chart update
    updateCharts();
}

function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function createChart(chartId, label, labels, datasets) {
    const ctx = document.getElementById(chartId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: { 
                    type: 'linear', 
                    position: 'bottom',
                    grid: {
                        color: '#333'  // Gray grid lines
                    }
                },
                y: {
                    grid: {
                        color: '#333'  // Gray grid lines
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: label
                },
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                hover: {
                    mode: 'nearest',
                    intersect: false
                }
            }
        }
    });
}

function updateChart(chart, label, labels, datasets) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.options.plugins.title.text = label;
    chart.update();
}

function displayTable(data) {
    const tableHeader = document.querySelector('#summaryTable thead tr');
    const tableBody = document.querySelector('#summaryTable tbody');

    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';

    // Populate header
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        tableHeader.appendChild(th);
    });

    // Populate rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}
