document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                console.log("Parsed Data: ", results.data);  // Debugging line
                const data = results.data;
                populateSelectOptions(data);
                setupChartUpdate(data);
                displayTable(data);
            },
            error: function(error) {
                console.error("Parsing Error: ", error);  // Debugging line
            }
        });
    }
});

let chart1 = null;
let chart2 = null;
let chart3 = null;

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
    const time = data.map(row => row.TIME).filter(isValidNumber);

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

    const updateChart1 = () => {
        const datasets = chart1Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : data.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart1Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);
        updateChart(chart1, chart1Title.value || 'Chart 1', time, datasets);
    };

    const updateChart2 = () => {
        const datasets = chart2Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : data.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart2Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);
        updateChart(chart2, chart2Title.value || 'Chart 2', time, datasets);
    };

    const updateChart3 = () => {
        const datasets = chart3Selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : data.map(row => row[select.value]).filter(isValidNumber),
            borderColor: chart3Colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);
        updateChart(chart3, chart3Title.value || 'Chart 3', time, datasets);
    };

    chart1Selects.forEach(select => select.addEventListener('change', updateChart1));
    chart2Selects.forEach(select => select.addEventListener('change', updateChart2));
    chart3Selects.forEach(select => select.addEventListener('change', updateChart3));

    chart1Colors.forEach(color => color.addEventListener('input', updateChart1));
    chart2Colors.forEach(color => color.addEventListener('input', updateChart2));
    chart3Colors.forEach(color => color.addEventListener('input', updateChart3));

    chart1Title.addEventListener('input', updateChart1);
    chart2Title.addEventListener('input', updateChart2);
    chart3Title.addEventListener('input', updateChart3);

    // Initial chart setup without default data selection
    chart1 = createChart('chart1', 'Chart 1', time, []);
    chart2 = createChart('chart2', 'Chart 2', time, []);
    chart3 = createChart('chart3', 'Chart 3', time, []);
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
    const tableBody = document.querySelector('#summaryTable tbody');
    tableBody.innerHTML = '';

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
