document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                const data = results.data;
                populateSelectOptions(data);
                setupChartUpdate(data);
                setupTimeRangeInputs(data);
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

function populateSelectOptions(data) {
    const keys = Object.keys(data[0]);
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
    const chart1XAxis = document.getElementById('chart1XAxis');
    const chart2XAxis = document.getElementById('chart2XAxis');
    const chart3XAxis = document.getElementById('chart3XAxis');
    const timeColumnPicker = document.getElementById('timeColumnPicker');

    function addOptions(selectElements, options) {
        selectElements.forEach(select => {
            select.innerHTML = ""; // Clear existing options
            options.forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.text = optionValue;
                select.appendChild(option);
            });
        });
    }

    addOptions(chart1Selects, keys);
    addOptions(chart2Selects, keys);
    addOptions(chart3Selects, keys);
    addOptions([chart1XAxis, chart2XAxis, chart3XAxis, timeColumnPicker], keys);
}

function setupChartUpdate(data) {
    const timeColumnPicker = document.getElementById('timeColumnPicker');
    const globalStartTime = document.getElementById('globalStartTime');
    const globalEndTime = document.getElementById('globalEndTime');

    function getTimeData() {
        const timeColumn = timeColumnPicker.value;
        return data.map(row => row[timeColumn]).filter(isValidNumber);
    }

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

    const chart1XAxis = document.getElementById('chart1XAxis');
    const chart2XAxis = document.getElementById('chart2XAxis');
    const chart3XAxis = document.getElementById('chart3XAxis');

    const chart1Title = document.getElementById('chart1Title');
    const chart2Title = document.getElementById('chart2Title');
    const chart3Title = document.getElementById('chart3Title');

    function updateChart(chart, title, xAxis, selects, colors, time) {
        const datasets = selects.map((select, index) => ({
            label: select.value,
            data: select.value === "null" ? [] : data.map(row => row[select.value]).filter(isValidNumber),
            borderColor: colors[index].value,
            fill: false
        })).filter(dataset => dataset.data.length > 0);

        const startValue = globalStartTime.value / 100;
        const endValue = globalEndTime.value / 100;
        const maxTime = Math.max(...time);
        const minTime = Math.min(...time);
        const startTime = minTime + (maxTime - minTime) * startValue;
        const endTime = minTime + (maxTime - minTime) * endValue;

        const filteredXAxis = xAxis.filter(timeValue => timeValue >= startTime && timeValue <= endTime);
        const filteredDatasets = datasets.map(dataset => ({
            ...dataset,
            data: dataset.data.slice(filteredXAxis[0], filteredXAxis[filteredXAxis.length - 1] + 1)
        }));

        updateChartInstance(chart, title, filteredXAxis, filteredDatasets);
    }

    function updateAllCharts() {
        const time = getTimeData();
        updateChart(chart1, chart1Title.value || 'Chart 1', getChartData(chart1XAxis.value, time), chart1Selects, chart1Colors, time);
        updateChart(chart2, chart2Title.value || 'Chart 2', getChartData(chart2XAxis.value, time), chart2Selects, chart2Colors, time);
        updateChart(chart3, chart3Title.value || 'Chart 3', getChartData(chart3XAxis.value, time), chart3Selects, chart3Colors, time);
    }

    function getChartData(xAxisKey, time) {
        return xAxisKey === "null" ? time : data.map(row => row[xAxisKey]).filter(isValidNumber);
    }

    timeColumnPicker.addEventListener('change', () => {
        setupTimeRangeInputs(data, timeColumnPicker.value);
        updateAllCharts();
    });

    globalStartTime.addEventListener('input', updateAllCharts);
    globalEndTime.addEventListener('input', updateAllCharts);

    chart1Selects.forEach(select => select.addEventListener('change', updateAllCharts));
    chart2Selects.forEach(select => select.addEventListener('change', updateAllCharts));
    chart3Selects.forEach(select => select.addEventListener('change', updateAllCharts));

    chart1Colors.forEach(color => color.addEventListener('input', updateAllCharts));
    chart2Colors.forEach(color => color.addEventListener('input', updateAllCharts));
    chart3Colors.forEach(color => color.addEventListener('input', updateAllCharts));

    chart1XAxis.addEventListener('change', updateAllCharts);
    chart2XAxis.addEventListener('change', updateAllCharts);
    chart3XAxis.addEventListener('change', updateAllCharts);

    chart1Title.addEventListener('input', updateAllCharts);
    chart2Title.addEventListener('input', updateAllCharts);
    chart3Title.addEventListener('input', updateAllCharts);

    // Initial chart setup without default data selection
    const initialTime = getTimeData();
    chart1 = createChart('chart1', 'Chart 1', initialTime, []);
    chart2 = createChart('chart2', 'Chart 2', initialTime, []);
    chart3 = createChart('chart3', 'Chart 3', initialTime, []);
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
            maintainAspectRatio: false,
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

function updateChartInstance(chart, label, labels, datasets) {
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

function setupTimeRangeInputs(data, timeColumnKey) {
    const xAxis = data.map(row => row[timeColumnKey]).filter(isValidNumber);
    const minTime = Math.min(...xAxis);
    const maxTime = Math.max(...xAxis);

    const startTimeRange = document.getElementById('globalStartTime');
    const endTimeRange = document.getElementById('globalEndTime');
    
    startTimeRange.setAttribute('min', minTime);
    startTimeRange.setAttribute('max', maxTime);
    startTimeRange.setAttribute('value', minTime);

    endTimeRange.setAttribute('min', minTime);
    endTimeRange.setAttribute('max', maxTime);
    endTimeRange.setAttribute('value', maxTime);
}

// Add event listener to handle resizing
document.querySelectorAll('.resizable').forEach(function(element) {
    element.addEventListener('mousemove', function(event) {
        if (event.buttons === 1) { // If the left mouse button is pressed
            event.preventDefault();
            element.style.width = event.clientX + 'px';
            const chartContainers = document.querySelectorAll('.chart-container');
            chartContainers.forEach(container => {
                container.style.width = `calc(100% - ${element.style.width})`;
                container.querySelector('.chart-wrapper').style.width = '100%';
            });
            // Trigger chart resize
            if (chart1) chart1.resize();
            if (chart2) chart2.resize();
            if (chart3) chart3.resize();
        }
    });
});
