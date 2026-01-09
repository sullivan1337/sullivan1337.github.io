// Global state
let deals = [];
let rateTable = [];
let individualChart = null;
let teamChart = null;

// Default quarter colors (faded red, yellow, blue, green)
const defaultQuarterColors = {
    1: 'rgba(255, 0, 0, 0.15)',
    2: 'rgba(255, 255, 0, 0.15)',
    3: 'rgba(0, 0, 255, 0.15)',
    4: 'rgba(0, 255, 0, 0.15)'
};

// Quarter colors (default: faded red, yellow, blue, green)
let quarterColors = {
    1: localStorage.getItem('quarterColor1') || defaultQuarterColors[1],
    2: localStorage.getItem('quarterColor2') || defaultQuarterColors[2],
    3: localStorage.getItem('quarterColor3') || defaultQuarterColors[3],
    4: localStorage.getItem('quarterColor4') || defaultQuarterColors[4]
};

// Default rate table structure (payoutRate is multiplier: 1 = 1x, 1.5 = 1.5x, etc.)
const defaultRateTable = [
    { level: 1, minPercent: 0, maxPercent: 75, payoutRate: 1 },
    { level: 2, minPercent: 76, maxPercent: 100, payoutRate: 1 },
    { level: 3, minPercent: 101, maxPercent: 125, payoutRate: 1.5 },
    { level: 4, minPercent: 126, maxPercent: 150, payoutRate: 2 },
    { level: 5, minPercent: 151, maxPercent: 999, payoutRate: 3 }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeRateTable();
    initializeDealTable();
    initializeEventListeners();
    initializeCharts();
    initializeQuarterLegend();
    
    // Sync mobile inputs with desktop inputs on load
    const fyStartDate = document.getElementById('fyStartDate');
    const payoutFrequency = document.getElementById('payoutFrequency');
    const fyStartDateMobile = document.getElementById('fyStartDateMobile');
    const payoutFrequencyMobile = document.getElementById('payoutFrequencyMobile');
    
    if (fyStartDate && fyStartDateMobile) {
        fyStartDateMobile.value = fyStartDate.value;
    }
    if (payoutFrequency && payoutFrequencyMobile) {
        payoutFrequencyMobile.value = payoutFrequency.value;
    }
    
    calculate();
});

// Calculate which quarter a date falls into based on FY start date
function getQuarterForDate(dateString, fyStartDate) {
    if (!dateString || !fyStartDate) return null;
    
    const dealDate = new Date(dateString);
    const fyStart = new Date(fyStartDate);
    
    if (isNaN(dealDate.getTime()) || isNaN(fyStart.getTime())) return null;
    
    // Calculate months since FY start
    const yearDiff = dealDate.getFullYear() - fyStart.getFullYear();
    const monthDiff = dealDate.getMonth() - fyStart.getMonth();
    const totalMonths = yearDiff * 12 + monthDiff;
    
    // Adjust for day of month (if deal date is before FY start day, count as previous month)
    if (dealDate.getDate() < fyStart.getDate()) {
        const adjustedMonths = totalMonths - 1;
        const quarter = Math.floor(adjustedMonths / 3) + 1;
        return quarter >= 1 && quarter <= 4 ? quarter : null;
    }
    
    const quarter = Math.floor(totalMonths / 3) + 1;
    return quarter >= 1 && quarter <= 4 ? quarter : null;
}

// Convert rgba string to hex color and opacity
function rgbaToHexAndOpacity(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const opacity = match[4] ? parseFloat(match[4]) : 1;
        const hex = '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
        return { hex, opacity: Math.round(opacity * 100) };
    }
    // Fallback for hex colors
    if (rgbaString.startsWith('#')) {
        return { hex: rgbaString.substring(0, 7), opacity: 15 };
    }
    return { hex: '#ff0000', opacity: 15 };
}

// Convert hex and opacity to rgba string
function hexAndOpacityToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const alpha = opacity / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Initialize quarter legend with click handlers
let currentQuarterBeingEdited = null;

function initializeQuarterLegend() {
    const legendItems = document.querySelectorAll('.legend-item');
    const colorPickerModal = document.getElementById('colorPickerModal');
    const colorPickerInput = document.getElementById('colorPickerInput');
    const colorOpacity = document.getElementById('colorOpacity');
    const opacityValue = document.getElementById('opacityValue');
    const colorPreview = document.getElementById('colorPreview');
    const colorPickerTitle = document.getElementById('colorPickerTitle');
    const applyColorBtn = document.getElementById('applyColorBtn');
    const closeColorPicker = document.getElementById('closeColorPicker');
    const cancelColorBtn = document.getElementById('cancelColorBtn');
    const resetColorBtn = document.getElementById('resetColorBtn');
    
    // Update color preview
    function updateColorPreview() {
        const hex = colorPickerInput.value;
        const opacity = parseInt(colorOpacity.value);
        const rgba = hexAndOpacityToRgba(hex, opacity);
        colorPreview.style.backgroundColor = rgba;
        opacityValue.textContent = opacity + '%';
    }
    
    // Initialize color picker event listeners
    colorPickerInput.addEventListener('input', updateColorPreview);
    colorOpacity.addEventListener('input', updateColorPreview);
    
    // Reset to default color
    resetColorBtn.addEventListener('click', () => {
        if (currentQuarterBeingEdited) {
            const quarter = currentQuarterBeingEdited;
            const defaultColor = defaultQuarterColors[quarter];
            const { hex, opacity } = rgbaToHexAndOpacity(defaultColor);
            
            // Update color picker inputs
            colorPickerInput.value = hex;
            colorOpacity.value = opacity;
            updateColorPreview();
        }
    });
    
    // Apply color
    applyColorBtn.addEventListener('click', () => {
        if (currentQuarterBeingEdited) {
            const quarter = currentQuarterBeingEdited;
            const hex = colorPickerInput.value;
            const opacity = parseInt(colorOpacity.value);
            const rgba = hexAndOpacityToRgba(hex, opacity);
            
            quarterColors[quarter] = rgba;
            const colorSpan = document.querySelector(`.legend-item[data-quarter="${quarter}"] .legend-color`);
            if (colorSpan) {
                colorSpan.style.backgroundColor = rgba;
            }
            localStorage.setItem(`quarterColor${quarter}`, rgba);
            renderDealTable();
            calculate();
        }
        colorPickerModal.style.display = 'none';
    });
    
    // Close modal handlers
    closeColorPicker.addEventListener('click', () => {
        colorPickerModal.style.display = 'none';
    });
    cancelColorBtn.addEventListener('click', () => {
        colorPickerModal.style.display = 'none';
    });
    
    // Close on backdrop click
    colorPickerModal.addEventListener('click', (e) => {
        if (e.target === colorPickerModal) {
            colorPickerModal.style.display = 'none';
        }
    });
    
    legendItems.forEach(item => {
        const quarter = parseInt(item.dataset.quarter);
        const colorSpan = item.querySelector('.legend-color');
        
        // Update legend color from stored value
        if (quarterColors[quarter]) {
            colorSpan.style.backgroundColor = quarterColors[quarter];
        }
        
        // Add click handler to open color picker modal
        item.addEventListener('click', () => {
            currentQuarterBeingEdited = quarter;
            colorPickerTitle.textContent = `Select Color for Q${quarter}`;
            
            // Parse current color
            const currentColor = quarterColors[quarter] || 'rgba(255, 0, 0, 0.15)';
            const { hex, opacity } = rgbaToHexAndOpacity(currentColor);
            
            // Set color picker values
            colorPickerInput.value = hex;
            colorOpacity.value = opacity;
            updateColorPreview();
            
            // Show modal
            colorPickerModal.style.display = 'flex';
        });
    });
}

// Theme toggle
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const themeIcons = document.querySelectorAll('.theme-icon');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        themeIcons.forEach(icon => icon.textContent = '☀️');
    } else {
        themeIcons.forEach(icon => icon.textContent = '🌙');
    }
    
    const toggleTheme = () => {
        const isDark = document.body.classList.contains('dark-mode');
        if (isDark) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeIcons.forEach(icon => icon.textContent = '☀️');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            themeIcons.forEach(icon => icon.textContent = '🌙');
            localStorage.setItem('theme', 'dark');
        }
    };
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', toggleTheme);
    }
}

// Initialize rate table
function initializeRateTable() {
    rateTable = JSON.parse(JSON.stringify(defaultRateTable));
    renderRateTable();
}

function renderRateTable() {
    const tbody = document.getElementById('rateTableBody');
    tbody.innerHTML = '';
    hideRateTableError();
    
    rateTable.forEach((rate, index) => {
        const row = document.createElement('tr');
        const isFirst = index === 0;
        const isLast = index === rateTable.length - 1;
        
        // Format range display
        // For first rate, don't show min (implied to be 0 or <)
        // For last rate, don't show max (implied to be >)
        let rangeDisplay = '';
        if (rate.minPercent === -1) {
            rangeDisplay = `<${rate.maxPercent === 999 ? '' : rate.maxPercent}%`;
        } else if (rate.maxPercent === 999) {
            rangeDisplay = `>${rate.minPercent}%`;
        } else if (isFirst && rate.minPercent === 0) {
            // First rate: show "<max%" instead of "-max%"
            rangeDisplay = `<${rate.maxPercent}%`;
        } else if (isLast) {
            // Last rate: don't show max, just show ">min%" or "min%+"
            rangeDisplay = `>${rate.minPercent}%`;
        } else {
            rangeDisplay = `${rate.minPercent}-${rate.maxPercent}%`;
        }
        
        row.innerHTML = `
            <td>Rate ${rate.level}</td>
            <td class="attainment-range-cell">
                <input type="text" 
                       class="attainment-range-input" 
                       data-index="${index}" 
                       value="${rangeDisplay}"
                       placeholder="0-100%">
            </td>
            <td>
                <input type="number" 
                       class="rate-payout-input" 
                       data-index="${index}" 
                       step="0.1" 
                       value="${rate.payoutRate}"
                       placeholder="1.0">
                <span class="multiplier-suffix">x</span>
            </td>
            <td class="actions-column">
                <button class="delete-btn-icon delete-rate-row" data-index="${index}" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for attainment range inputs
    document.querySelectorAll('.attainment-range-input').forEach(input => {
        input.addEventListener('blur', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = e.target.value.trim();
            const oldMin = rateTable[index].minPercent;
            const oldMax = rateTable[index].maxPercent;
            
            // Parse the range input
            let newMin = oldMin;
            let newMax = oldMax;
            
            if (value.startsWith('<')) {
                // Less than format: <50%
                const num = parseFloat(value.substring(1).replace('%', ''));
                if (!isNaN(num)) {
                    newMin = -1;
                    newMax = num;
                }
            } else if (value.startsWith('>')) {
                // Greater than format: >150%
                const num = parseFloat(value.substring(1).replace('%', ''));
                if (!isNaN(num)) {
                    newMin = num;
                    newMax = 999;
                }
            } else if ((value.startsWith('-') || value.startsWith('<')) && isFirst) {
                // First rate format: -75% or <75% (implies 0-75% or <75%)
                const num = parseFloat(value.substring(1).replace('%', ''));
                if (!isNaN(num)) {
                    if (value.startsWith('<')) {
                        newMin = -1;
                        newMax = num;
                    } else {
                        newMin = 0;
                        newMax = num;
                    }
                }
            } else if (value.includes('-')) {
                // Range format: 0-75% or 76-100%
                const parts = value.split('-');
                if (parts.length === 2) {
                    const part1 = parts[0].trim();
                    const part2 = parts[1].trim().replace('%', '');
                    const minVal = part1 === '' ? 0 : parseFloat(part1);
                    const maxVal = parseFloat(part2);
                    if (!isNaN(minVal) && !isNaN(maxVal)) {
                        newMin = minVal;
                        newMax = maxVal;
                    }
                }
            } else {
                // Single number
                const num = parseFloat(value.replace('%', ''));
                if (!isNaN(num)) {
                    if (isFirst) {
                        // First rate: treat as max, min is 0
                        newMin = 0;
                        newMax = num;
                    } else if (isLast) {
                        // Last rate: treat as min, max is infinity
                        newMin = num;
                        newMax = 999;
                    } else {
                        // Middle rate: need both values, can't parse single number
                        // Keep old values
                    }
                }
            }
            
            rateTable[index].minPercent = newMin;
            rateTable[index].maxPercent = newMax;
            
            if (!validateRateTable()) {
                // Revert if validation fails
                rateTable[index].minPercent = oldMin;
                rateTable[index].maxPercent = oldMax;
                renderRateTable();
            } else {
                calculate();
            }
        });
    });
    
    // Add event listeners for payout rate inputs
    document.querySelectorAll('.rate-payout-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            rateTable[index].payoutRate = parseFloat(e.target.value) || 1;
            calculate();
        });
    });
    
    document.querySelectorAll('.delete-rate-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (rateTable.length > 1) {
                rateTable.splice(index, 1);
                // Renumber levels
                rateTable.forEach((rate, idx) => {
                    rate.level = idx + 1;
                });
                renderRateTable();
                calculate();
            } else {
                showRateTableError('At least one rate level is required.');
            }
        });
    });
}

function showRateTableError(message) {
    const errorDiv = document.getElementById('rateTableError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function hideRateTableError() {
    const errorDiv = document.getElementById('rateTableError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

function validateRateTable() {
    hideRateTableError();
    
    // Check for overlaps (excluding less-than and greater-than ranges)
    for (let i = 0; i < rateTable.length; i++) {
        for (let j = i + 1; j < rateTable.length; j++) {
            const rate1 = rateTable[i];
            const rate2 = rateTable[j];
            
            // Skip if either has special ranges
            if (rate1.minPercent === -1 || rate1.maxPercent === 999 || rate1.maxPercent === -1 ||
                rate2.minPercent === -1 || rate2.maxPercent === 999 || rate2.maxPercent === -1) {
                continue;
            }
            
            // Check for overlap
            const overlap = !(rate1.maxPercent < rate2.minPercent || rate1.minPercent > rate2.maxPercent);
            
            if (overlap) {
                const range1 = `${rate1.minPercent}%-${rate1.maxPercent}%`;
                const range2 = `${rate2.minPercent}%-${rate2.maxPercent}%`;
                showRateTableError(`Overlap detected: Rate level ${rate1.level} (${range1}) overlaps with Rate level ${rate2.level} (${range2}). Please adjust the ranges.`);
                return false;
            }
        }
    }
    
    // Check that min <= max for each rate (unless special ranges)
    for (const rate of rateTable) {
        if (rate.minPercent !== -1 && rate.maxPercent !== 999 && rate.maxPercent !== -1) {
            if (rate.minPercent > rate.maxPercent) {
                showRateTableError(`Invalid range for Rate level ${rate.level}: minimum (${rate.minPercent}%) cannot be greater than maximum (${rate.maxPercent}%).`);
                return false;
            }
        }
    }
    
    return true;
}

// Add rate row
document.getElementById('addRateRow').addEventListener('click', () => {
    const lastRate = rateTable[rateTable.length - 1];
    let newMin, newMax;
    
    if (lastRate.maxPercent === 999) {
        // If last rate is "greater than", insert before it
        newMin = lastRate.minPercent - 25;
        newMax = lastRate.minPercent - 1;
        // Update last rate to start from new max
        lastRate.minPercent = newMax + 1;
    } else {
        newMin = lastRate.maxPercent + 1;
        newMax = newMin + 24; // Default 25% range
    }
    
    const newRate = {
        level: rateTable.length + 1,
        minPercent: newMin,
        maxPercent: newMax,
        payoutRate: 1
    };
    rateTable.push(newRate);
    renderRateTable();
    calculate();
});

// Initialize deal table
function initializeDealTable() {
    // Add one empty row by default
    addDealRow();
}

// Unified Deal Functions
function addDealRow() {
    const tbody = document.getElementById('dealTableBody');
    const row = document.createElement('tr');
    const rowIndex = deals.length;
    
    // Get FY start date for quarter calculation
    const fyStartDate = document.getElementById('fyStartDate').value;
    
    // Initialize deal object (defaults to individual, not team-only)
    if (!deals[rowIndex]) {
        deals[rowIndex] = { name: '', closeDate: '', acv: 0, teamOnly: false };
    }
    
    // Calculate quarter for this deal
    const quarter = getQuarterForDate(deals[rowIndex].closeDate, fyStartDate);
    if (quarter && quarterColors[quarter]) {
        row.style.backgroundColor = quarterColors[quarter];
    }
    
    row.innerHTML = `
        <td>
            <input type="checkbox" 
                   class="deal-team-only-checkbox" 
                   data-index="${rowIndex}">
        </td>
        <td>
            <input type="text" 
                   class="deal-name-input" 
                   data-index="${rowIndex}" 
                   placeholder="Opportunity Name">
        </td>
        <td>
            <input type="date"
                   class="deal-date-input"
                   data-index="${rowIndex}">
        </td>
        <td>
            <input type="text" 
                   class="deal-acv-input currency-input" 
                   data-index="${rowIndex}" 
                   placeholder="$0.00">
        </td>
        <td class="individual-accelerated-commission-cell">$0.00</td>
        <td class="team-accelerated-commission-cell">$0.00</td>
        <td class="total-commission-cell">$0.00</td>
        <td class="actions-column">
            <button class="delete-btn-icon delete-deal-row" data-index="${rowIndex}" title="Delete">🗑️</button>
        </td>
    `;
    tbody.appendChild(row);
    
    // Initialize deal object (defaults to individual, not team-only)
    if (!deals[rowIndex]) {
        deals[rowIndex] = { name: '', closeDate: '', acv: 0, teamOnly: false };
    }
    
    setupDealRowListeners(row, rowIndex);
    checkAndAddNewRow();
}

function checkAndAddNewRow() {
    const tbody = document.getElementById('dealTableBody');
    const lastRow = tbody.lastElementChild;
    if (lastRow) {
        const nameInput = lastRow.querySelector('.deal-name-input');
        const dateInput = lastRow.querySelector('.deal-date-input');
        const acvInput = lastRow.querySelector('.deal-acv-input');
        
        if (nameInput.value || dateInput.value || acvInput.value) {
            const hasEmptyRow = Array.from(tbody.children).some(row => {
                const name = row.querySelector('.deal-name-input')?.value || '';
                const date = row.querySelector('.deal-date-input')?.value || '';
                const acv = row.querySelector('.deal-acv-input')?.value || '';
                return !name && !date && !acv;
            });
            
            if (!hasEmptyRow) {
                addDealRow();
            }
        }
    }
}

function renderDealTable() {
    const tbody = document.getElementById('dealTableBody');
    tbody.innerHTML = '';
    
    if (deals.length === 0) {
        deals.push({ name: '', closeDate: '', acv: 0, teamOnly: false });
    }
    
    // Sort deals by close date (empty dates go to end)
    const sortedDeals = [...deals].sort((a, b) => {
        if (!a.closeDate && !b.closeDate) return 0;
        if (!a.closeDate) return 1;
        if (!b.closeDate) return -1;
        return new Date(a.closeDate) - new Date(b.closeDate);
    });
    
    // Create a mapping from sorted index to original index
    const indexMap = sortedDeals.map(sortedDeal => {
        return deals.findIndex(d => d === sortedDeal);
    });
    
    // Get FY start date for quarter calculation
    const fyStartDate = document.getElementById('fyStartDate').value;
    
    sortedDeals.forEach((deal, sortedIndex) => {
        const originalIndex = indexMap[sortedIndex];
        const row = document.createElement('tr');
        
        // Calculate quarter for this deal
        const quarter = getQuarterForDate(deal.closeDate, fyStartDate);
        if (quarter && quarterColors[quarter]) {
            row.style.backgroundColor = quarterColors[quarter];
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" 
                       class="deal-team-only-checkbox" 
                       data-index="${originalIndex}"
                       ${deal.teamOnly ? 'checked' : ''}>
            </td>
            <td>
                <input type="text" 
                       class="deal-name-input" 
                       data-index="${originalIndex}" 
                       value="${deal.name}"
                       placeholder="Opportunity Name">
            </td>
            <td>
                <input type="text" 
                       class="deal-date-input" 
                       data-index="${originalIndex}" 
                       value="${deal.closeDate}"
                       placeholder="YYYY-MM-DD">
            </td>
            <td>
                <input type="text" 
                       class="deal-acv-input currency-input" 
                       data-index="${originalIndex}" 
                       value="${deal.acv > 0 ? formatCurrencyInput(deal.acv) : ''}"
                       placeholder="$0.00">
            </td>
            <td class="individual-accelerated-commission-cell">$0.00</td>
            <td class="team-accelerated-commission-cell">$0.00</td>
            <td class="total-commission-cell">$0.00</td>
            <td class="actions-column">
                <button class="delete-btn-icon delete-deal-row" data-index="${originalIndex}" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
        setupDealRowListeners(row, originalIndex);
    });
    
    // Restore sorting if it was applied
    if (sortColumn) {
        sortDealTable(sortColumn, sortDirection);
    } else {
        // Update total total after rendering
        updateTotalTotal();
    }
    
    const lastRow = tbody.lastElementChild;
    if (lastRow) {
        const nameInput = lastRow.querySelector('.deal-name-input');
        const dateInput = lastRow.querySelector('.deal-date-input');
        const acvInput = lastRow.querySelector('.deal-acv-input');
        
        if (nameInput.value || dateInput.value || acvInput.value) {
            addDealRow();
        }
    }
    calculate();
}

function setupDealRowListeners(row, index) {
    const nameInput = row.querySelector('.deal-name-input');
    const dateInput = row.querySelector('.deal-date-input');
    const acvInput = row.querySelector('.deal-acv-input');
    const teamOnlyCheckbox = row.querySelector('.deal-team-only-checkbox');
    const deleteBtn = row.querySelector('.delete-deal-row');
    
    // Setup team-only checkbox
    if (teamOnlyCheckbox) {
        teamOnlyCheckbox.addEventListener('change', (e) => {
            deals[index].teamOnly = e.target.checked;
            calculate();
        });
    }
    
    // Setup currency input for ACV
    if (acvInput) {
        acvInput.addEventListener('blur', (e) => {
            const value = parseCurrency(e.target.value);
            deals[index].acv = value;
            e.target.value = formatCurrencyInput(value);
            calculate();
        });
        
        acvInput.addEventListener('focus', (e) => {
            const value = parseCurrency(e.target.value);
            e.target.value = value === 0 ? '' : value.toString();
        });
        
        acvInput.addEventListener('input', () => {
            calculate();
        });
    }
    
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            deals[index].name = e.target.value;
            checkAndAddNewRow();
            calculate();
        });
    }
    
    if (dateInput) {
        // Start as date type to enable calendar picker, but allow text input
        dateInput.setAttribute('type', 'date');
        dateInput.setAttribute('placeholder', 'YYYY-MM-DD');
        
        dateInput.addEventListener('input', (e) => {
            deals[index].closeDate = e.target.value;
            // Update row background color based on quarter
            const fyStartDate = document.getElementById('fyStartDate').value;
            const quarter = getQuarterForDate(e.target.value, fyStartDate);
            const row = e.target.closest('tr');
            if (quarter && quarterColors[quarter]) {
                row.style.backgroundColor = quarterColors[quarter];
            } else {
                row.style.backgroundColor = '';
            }
            checkAndAddNewRow();
            calculate();
        });
        
        // Allow text input by temporarily switching to text on focus
        // This allows users to type directly
        dateInput.addEventListener('keydown', (e) => {
            // If user starts typing, switch to text mode temporarily
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                if (e.target.getAttribute('type') === 'date') {
                    e.target.setAttribute('type', 'text');
                    // If field is empty, allow typing from scratch
                    if (!e.target.value) {
                        e.target.value = '';
                    }
                }
            }
        });
        
        // When user clicks the calendar icon or field, ensure it's date type
        dateInput.addEventListener('focus', (e) => {
            // If empty, allow date picker
            if (!e.target.value || e.target.value === '') {
                e.target.setAttribute('type', 'date');
            }
            // If it has a value that's not in date format, check if we should allow picker
            else if (e.target.getAttribute('type') === 'text') {
                // If value looks like a date, switch to date type for picker
                const value = e.target.value;
                if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    e.target.setAttribute('type', 'date');
                    e.target.value = value; // Restore value
                }
            }
        });
        
        // On blur, if it's text type with a valid date, convert back to date format
        dateInput.addEventListener('blur', (e) => {
            const value = e.target.value;
            // If we have a value and it's currently text type, try to format it
            if (value && e.target.getAttribute('type') === 'text') {
                // Try to parse as date and format properly
                const dateMatch = value.match(/(\d{4})-?(\d{2})-?(\d{2})/);
                if (dateMatch) {
                    const formattedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                    e.target.value = formattedDate;
                    deals[index].closeDate = formattedDate;
                }
            }
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            deals.splice(index, 1);
            renderDealTable();
        });
    }
}

// Currency formatting functions
function parseCurrency(value) {
    if (!value) return 0;
    // Remove all non-numeric characters except decimal point
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
}

function formatCurrencyInput(value) {
    if (!value && value !== 0) return '';
    const num = typeof value === 'string' ? parseCurrency(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

function setupCurrencyInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Format on blur
    input.addEventListener('blur', (e) => {
        const value = parseCurrency(e.target.value);
        e.target.value = formatCurrencyInput(value);
        calculate();
    });
    
    // Allow typing without formatting interfering
    input.addEventListener('focus', (e) => {
        const value = parseCurrency(e.target.value);
        e.target.value = value === 0 ? '' : value.toString();
    });
    
    // Calculate on input
    input.addEventListener('input', calculate);
}

// Auto-calculate Base Payout Rate when OTE and Quota are provided
// Formula: Payout Rate = (OTE / Quota) * 100
function setupAutoCalculate(oteId, quotaId, payoutRateId) {
    const oteInput = document.getElementById(oteId);
    const quotaInput = document.getElementById(quotaId);
    const payoutRateInput = document.getElementById(payoutRateId);
    
    if (!oteInput || !quotaInput || !payoutRateInput) return;
    
    // Function to calculate payout rate
    const calculatePayoutRate = () => {
        const ote = parseCurrency(oteInput.value);
        const quota = parseCurrency(quotaInput.value);
        
        // Only calculate if both OTE and Quota are provided
        if (ote > 0 && quota > 0) {
            const calculatedRate = (ote / quota) * 100;
            payoutRateInput.value = Math.round(calculatedRate * 100) / 100; // Round to 2 decimals
            calculate();
        }
    };
    
    // Calculate on any input change
    oteInput.addEventListener('input', calculatePayoutRate);
    quotaInput.addEventListener('input', calculatePayoutRate);
}

// Initialize event listeners
function initializeEventListeners() {
    // Input fields - Desktop
    const fyStartDate = document.getElementById('fyStartDate');
    const payoutFrequency = document.getElementById('payoutFrequency');
    
    if (fyStartDate) {
        fyStartDate.addEventListener('input', () => {
            // Sync with mobile input if it exists
            const mobileInput = document.getElementById('fyStartDateMobile');
            if (mobileInput) mobileInput.value = fyStartDate.value;
            calculate();
            renderDealTable(); // Re-render to update quarter colors
        });
    }
    
    if (payoutFrequency) {
        payoutFrequency.addEventListener('change', () => {
            // Sync with mobile input if it exists
            const mobileSelect = document.getElementById('payoutFrequencyMobile');
            if (mobileSelect) mobileSelect.value = payoutFrequency.value;
            calculate();
        });
    }
    
    // Mobile inputs - sync with desktop
    const fyStartDateMobile = document.getElementById('fyStartDateMobile');
    const payoutFrequencyMobile = document.getElementById('payoutFrequencyMobile');
    
    if (fyStartDateMobile) {
        fyStartDateMobile.addEventListener('input', () => {
            if (fyStartDate) fyStartDate.value = fyStartDateMobile.value;
            calculate();
            renderDealTable();
        });
    }
    
    if (payoutFrequencyMobile) {
        payoutFrequencyMobile.addEventListener('change', () => {
            if (payoutFrequency) payoutFrequency.value = payoutFrequencyMobile.value;
            calculate();
        });
    }
    
    // Currency inputs
    setupCurrencyInput('teamQuota');
    setupCurrencyInput('individualQuota');
    setupCurrencyInput('teamVariable');
    setupCurrencyInput('individualVariable');
    setupCurrencyInput('baseSalary');
    
    // Auto-calculate OTE, Quota, and Payout Rate
    setupAutoCalculate('teamVariable', 'teamQuota', 'teamBaseRate');
    setupAutoCalculate('individualVariable', 'individualQuota', 'individualBaseRate');
    
    // Regular number inputs - recalculate on any change
    document.getElementById('teamBaseRate').addEventListener('input', calculate);
    document.getElementById('individualBaseRate').addEventListener('input', calculate);
    
    // Export/Import - Desktop
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    
    // Export/Import - Mobile
    const exportBtnMobile = document.getElementById('exportBtnMobile');
    const importBtnMobile = document.getElementById('importBtnMobile');
    
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const copyBtn = document.getElementById('copyBtn');
    const importConfirmBtn = document.getElementById('importConfirmBtn');
    const jsonModal = document.getElementById('jsonModal');
    
    const setupExportImport = (exportBtnEl, importBtnEl) => {
        if (exportBtnEl) {
            exportBtnEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showExportModal();
            });
        }
        
        if (importBtnEl) {
            importBtnEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showImportModal();
            });
        }
    };
    
    setupExportImport(exportBtn, importBtn);
    setupExportImport(exportBtnMobile, importBtnMobile);
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            copyToClipboard();
        });
    }
    
    if (importConfirmBtn) {
        importConfirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            importFromJSON();
        });
    }
    
    // Close modal when clicking outside
    if (jsonModal) {
        jsonModal.addEventListener('click', (e) => {
            if (e.target.id === 'jsonModal') {
                closeModal();
            }
        });
    }
    
    // Setup table sorting
    setupTableSorting();
}

// Table sorting functionality
let sortColumn = null;
let sortDirection = 'asc';

function setupTableSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            sortDealTable(column, sortDirection);
            updateSortIndicators();
        });
    });
}

function updateSortIndicators() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.column === sortColumn) {
            header.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

function sortDealTable(column, direction) {
    const tbody = document.getElementById('dealTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamOnly':
                const aCheckbox = a.querySelector('.deal-team-only-checkbox');
                const bCheckbox = b.querySelector('.deal-team-only-checkbox');
                aValue = aCheckbox ? aCheckbox.checked : false;
                bValue = bCheckbox ? bCheckbox.checked : false;
                break;
            case 'name':
                const aNameInput = a.querySelector('.deal-name-input');
                const bNameInput = b.querySelector('.deal-name-input');
                aValue = aNameInput ? (aNameInput.value || '').toLowerCase() : '';
                bValue = bNameInput ? (bNameInput.value || '').toLowerCase() : '';
                break;
            case 'closeDate':
                const aDateInput = a.querySelector('.deal-date-input');
                const bDateInput = b.querySelector('.deal-date-input');
                aValue = aDateInput ? aDateInput.value || '' : '';
                bValue = bDateInput ? bDateInput.value || '' : '';
                break;
            case 'acv':
                const aAcvInput = a.querySelector('.deal-acv-input');
                const bAcvInput = b.querySelector('.deal-acv-input');
                aValue = parseCurrency(aAcvInput ? aAcvInput.value : '0');
                bValue = parseCurrency(bAcvInput ? bAcvInput.value : '0');
                break;
            case 'individualCommission':
                const aIndCell = a.querySelector('.individual-accelerated-commission-cell');
                const bIndCell = b.querySelector('.individual-accelerated-commission-cell');
                aValue = parseCurrency(aIndCell ? aIndCell.textContent : '0');
                bValue = parseCurrency(bIndCell ? bIndCell.textContent : '0');
                break;
            case 'teamCommission':
                const aTeamCell = a.querySelector('.team-accelerated-commission-cell');
                const bTeamCell = b.querySelector('.team-accelerated-commission-cell');
                aValue = parseCurrency(aTeamCell ? aTeamCell.textContent : '0');
                bValue = parseCurrency(bTeamCell ? bTeamCell.textContent : '0');
                break;
            case 'totalCommission':
                const aTotalCell = a.querySelector('.total-commission-cell');
                const bTotalCell = b.querySelector('.total-commission-cell');
                aValue = parseCurrency(aTotalCell ? aTotalCell.textContent : '0');
                bValue = parseCurrency(bTotalCell ? bTotalCell.textContent : '0');
                break;
            default:
                return 0;
        }
        
        // Compare values
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
    
    // Update total total after sorting
    updateTotalTotal();
}

// Get current period based on FY start and payout frequency
function getCurrentPeriod() {
    const fyStartDate = new Date(document.getElementById('fyStartDate').value);
    const payoutFrequency = document.getElementById('payoutFrequency').value;
    const today = new Date();
    
    let periodStart, periodEnd;
    
    if (payoutFrequency === 'monthly') {
        // Find which month we're in relative to FY start
        const monthsSinceFYStart = (today.getFullYear() - fyStartDate.getFullYear()) * 12 + 
                                   (today.getMonth() - fyStartDate.getMonth());
        periodStart = new Date(fyStartDate);
        periodStart.setMonth(periodStart.getMonth() + monthsSinceFYStart);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month
    } else if (payoutFrequency === 'quarterly') {
        const monthsSinceFYStart = (today.getFullYear() - fyStartDate.getFullYear()) * 12 + 
                                   (today.getMonth() - fyStartDate.getMonth());
        const quarter = Math.floor(monthsSinceFYStart / 3);
        periodStart = new Date(fyStartDate);
        periodStart.setMonth(periodStart.getMonth() + quarter * 3);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(0);
    } else if (payoutFrequency === 'bi-annually') {
        const monthsSinceFYStart = (today.getFullYear() - fyStartDate.getFullYear()) * 12 + 
                                   (today.getMonth() - fyStartDate.getMonth());
        const half = Math.floor(monthsSinceFYStart / 6);
        periodStart = new Date(fyStartDate);
        periodStart.setMonth(periodStart.getMonth() + half * 6);
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 6);
        periodEnd.setDate(0);
    } else { // annually
        periodStart = new Date(fyStartDate);
        periodEnd = new Date(fyStartDate);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
    }
    
    return { start: periodStart, end: periodEnd };
}

// Get YTD period (from FY start to today)
function getYTDPeriod() {
    const fyStartDate = new Date(document.getElementById('fyStartDate').value);
    const today = new Date();
    return { start: fyStartDate, end: today };
}

// Calculate commissions
function calculate() {
    const teamOnTargetEarnings = parseCurrency(document.getElementById('teamVariable').value);
    const teamQuota = parseCurrency(document.getElementById('teamQuota').value);
    const teamBaseRate = parseFloat(document.getElementById('teamBaseRate').value) || 0;
    const individualOnTargetEarnings = parseCurrency(document.getElementById('individualVariable').value);
    const individualQuota = parseCurrency(document.getElementById('individualQuota').value);
    const individualBaseRate = parseFloat(document.getElementById('individualBaseRate').value) || 0;
    
    const period = getCurrentPeriod();
    const ytdPeriod = getYTDPeriod();
    
    // Filter deals for period and YTD
    // Team deals: all deals count toward team (teamOnly=true OR teamOnly=false)
    // Individual deals: only deals where teamOnly === false
    const teamPeriodDeals = deals.filter(deal => {
        if (!deal.closeDate) return false;
        const closeDate = new Date(deal.closeDate);
        return closeDate >= period.start && closeDate <= period.end;
    });
    
    const teamYtdDeals = deals.filter(deal => {
        if (!deal.closeDate) return false;
        const closeDate = new Date(deal.closeDate);
        return closeDate >= ytdPeriod.start && closeDate <= ytdPeriod.end;
    });
    
    const individualPeriodDeals = deals.filter(deal => {
        if (!deal.closeDate || deal.teamOnly) return false;
        const closeDate = new Date(deal.closeDate);
        return closeDate >= period.start && closeDate <= period.end;
    });
    
    const individualYtdDeals = deals.filter(deal => {
        if (!deal.closeDate || deal.teamOnly) return false;
        const closeDate = new Date(deal.closeDate);
        return closeDate >= ytdPeriod.start && closeDate <= ytdPeriod.end;
    });
    
    // Calculate ACVs
    const teamACVPeriod = teamPeriodDeals.reduce((sum, deal) => sum + deal.acv, 0);
    const teamACVYTD = teamYtdDeals.reduce((sum, deal) => sum + deal.acv, 0);
    const individualACVPeriod = individualPeriodDeals.reduce((sum, deal) => sum + deal.acv, 0);
    const individualACVYTD = individualYtdDeals.reduce((sum, deal) => sum + deal.acv, 0);
    
    // Calculate attainment percentages
    const teamAttainment = teamQuota > 0 ? (teamACVYTD / teamQuota) * 100 : 0;
    const individualAttainment = individualQuota > 0 ? (individualACVYTD / individualQuota) * 100 : 0;
    
    // Update FY label
    const fyStartDate = new Date(document.getElementById('fyStartDate').value);
    const fyYear = fyStartDate.getFullYear();
    const fyLabel = `FY${fyYear.toString().substring(2)}`;
    document.getElementById('teamQuotaLabel').textContent = `Your ${fyLabel} Team Quota is:`;
    document.getElementById('individualQuotaLabel').textContent = `Your ${fyLabel} Individual Quota is:`;
    
    // Update display
    document.getElementById('teamACVYTD').textContent = formatCurrency(teamACVYTD);
    document.getElementById('teamQuotaDisplay').textContent = formatCurrency(teamQuota);
    document.getElementById('teamAttainment').textContent = formatPercent(teamAttainment);
    
    document.getElementById('individualACVYTD').textContent = formatCurrency(individualACVYTD);
    document.getElementById('individualQuotaDisplay').textContent = formatCurrency(individualQuota);
    document.getElementById('individualAttainment').textContent = formatPercent(individualAttainment);
    
    // Update charts
    updateCharts(teamACVYTD, teamQuota, individualACVYTD, individualQuota);
    
    // Calculate and display deal commissions
    calculateDealCommissions();
    
    // Update total total after commissions are calculated
    updateTotalTotal();
}

// Calculate progressive/marginal commission (like taxes)
// Returns both base commission and accelerated commission
// On Target Earnings = total commission at 100% attainment (this is the dollar amount, not a percentage)
// Base Rate = percentage multiplier (e.g., 100% = 1.0, 50% = 0.5)
// The commission is calculated progressively: each portion of the deal in a bracket gets that bracket's multiplier
function calculateProgressiveCommission(dealACV, attainmentBeforeDeal, attainmentAfterDeal, quota, onTargetEarnings, baseRate, rateTable) {
    if (quota <= 0 || onTargetEarnings <= 0 || dealACV <= 0) {
        return { baseCommission: 0, acceleratedCommission: 0 };
    }
    
    // Calculate base commission rate per dollar of ACV
    // On Target Earnings = total commission at 100% attainment
    // At 100% attainment: ACV = quota, and commission = On Target Earnings
    // So commission per dollar of ACV = On Target Earnings / quota
    const commissionPerDollarOfACV = onTargetEarnings / quota;
    
    // Calculate base commission (without accelerators)
    const baseCommission = dealACV * commissionPerDollarOfACV;
    
    // Sort rate table by minPercent
    const sortedRates = [...rateTable].sort((a, b) => {
        const aMin = a.minPercent === -1 ? 0 : a.minPercent;
        const bMin = b.minPercent === -1 ? 0 : b.minPercent;
        return aMin - bMin;
    });
    
    let totalAcceleratedCommission = 0;
    
    // Calculate how much of this deal's ACV falls into each bracket
    const dealAttainmentStart = Math.max(0, attainmentBeforeDeal);
    const dealAttainmentEnd = attainmentAfterDeal;
    const dealAttainmentRange = dealAttainmentEnd - dealAttainmentStart;
    
    // If no attainment range, use the entire deal
    if (dealAttainmentRange <= 0) {
        // Find the applicable rate for the current attainment
        const applicableRate = sortedRates.find(rate => {
            const bracketMin = rate.minPercent === -1 ? 0 : rate.minPercent;
            const bracketMax = rate.maxPercent === 999 || rate.maxPercent === -1 ? Infinity : rate.maxPercent;
            return dealAttainmentEnd >= bracketMin && dealAttainmentEnd <= bracketMax;
        }) || sortedRates[0];
        
        const multiplier = applicableRate ? applicableRate.payoutRate : 1;
        totalAcceleratedCommission = dealACV * commissionPerDollarOfACV * multiplier;
        return { baseCommission, acceleratedCommission: totalAcceleratedCommission };
    }
    
    // For each rate bracket, calculate if any portion of this deal falls in it
    for (let i = 0; i < sortedRates.length; i++) {
        const rate = sortedRates[i];
        const bracketMin = rate.minPercent === -1 ? 0 : rate.minPercent;
        const bracketMax = rate.maxPercent === 999 || rate.maxPercent === -1 ? Infinity : rate.maxPercent;
        
        // Check if this bracket overlaps with the deal's attainment range
        if (dealAttainmentEnd <= bracketMin || dealAttainmentStart >= bracketMax) {
            continue;
        }
        
        // Calculate the portion of this deal that falls in this bracket
        const bracketStart = Math.max(dealAttainmentStart, bracketMin);
        const bracketEnd = Math.min(dealAttainmentEnd, bracketMax);
        const bracketPercent = bracketEnd - bracketStart;
        
        if (bracketPercent > 0 && dealAttainmentRange > 0) {
            // Calculate the ACV amount that falls in this bracket
            const bracketACV = dealACV * (bracketPercent / dealAttainmentRange);
            
            // Calculate commission for this bracket portion
            const bracketCommission = bracketACV * commissionPerDollarOfACV * rate.payoutRate;
            totalAcceleratedCommission += bracketCommission;
        }
    }
    
    return { baseCommission, acceleratedCommission: totalAcceleratedCommission };
}

function calculateDealCommissions() {
    const teamBaseRate = parseFloat(document.getElementById('teamBaseRate').value) || 0;
    const teamOnTargetEarnings = parseCurrency(document.getElementById('teamVariable').value);
    const individualBaseRate = parseFloat(document.getElementById('individualBaseRate').value) || 0;
    const individualOnTargetEarnings = parseCurrency(document.getElementById('individualVariable').value);
    const teamQuota = parseCurrency(document.getElementById('teamQuota').value);
    const individualQuota = parseCurrency(document.getElementById('individualQuota').value);
    const ytdPeriod = getYTDPeriod();
    
    // Calculate commissions for all deals
    const rows = document.querySelectorAll('#dealTableBody tr');
    rows.forEach((row) => {
        const indexAttr = row.querySelector('.deal-name-input')?.dataset.index;
        if (indexAttr === undefined) return;
        const index = parseInt(indexAttr);
        if (index >= deals.length) return;
        
        const deal = deals[index];
        
        if (!deal.name || !deal.closeDate || deal.acv <= 0) {
            row.querySelector('.individual-accelerated-commission-cell').textContent = '$0.00';
            row.querySelector('.team-accelerated-commission-cell').textContent = '$0.00';
            row.querySelector('.total-commission-cell').textContent = '$0.00';
            return;
        }
        
        const dealDate = new Date(deal.closeDate);
        
        // Calculate individual commissions (if not team-only)
        let individualCommission = 0;
        if (!deal.teamOnly) {
            const individualDealsUpToThis = deals.filter(d => {
                if (!d.closeDate || d.teamOnly) return false;
                const closeDate = new Date(d.closeDate);
                return closeDate >= ytdPeriod.start && closeDate <= dealDate;
            });
            
            const individualACVBeforeThis = individualDealsUpToThis.filter(d => d !== deal).reduce((sum, d) => sum + d.acv, 0);
            const individualACVAfterThis = individualACVBeforeThis + deal.acv;
            
            const individualAttainmentBefore = individualQuota > 0 ? (individualACVBeforeThis / individualQuota) * 100 : 0;
            const individualAttainmentAfter = individualQuota > 0 ? (individualACVAfterThis / individualQuota) * 100 : 0;
            
            const individualResult = calculateProgressiveCommission(
                deal.acv,
                individualAttainmentBefore,
                individualAttainmentAfter,
                individualQuota,
                individualOnTargetEarnings,
                individualBaseRate,
                rateTable
            );
            
            individualCommission = individualResult.acceleratedCommission;
            const individualBase = individualResult.baseCommission;
            const individualAccelerator = individualCommission - individualBase;
            
            const indCell = row.querySelector('.individual-accelerated-commission-cell');
            if (individualAccelerator > 0) {
                indCell.innerHTML = `${formatCurrency(individualBase)} <span class="accelerator-bonus">(+${formatCurrency(individualAccelerator)})</span>`;
            } else {
                indCell.textContent = formatCurrency(individualCommission);
            }
        } else {
            row.querySelector('.individual-accelerated-commission-cell').textContent = '$0.00';
        }
        
        // Calculate team commissions (all deals count toward team)
        const teamDealsUpToThis = deals.filter(d => {
            if (!d.closeDate) return false;
            const closeDate = new Date(d.closeDate);
            return closeDate >= ytdPeriod.start && closeDate <= dealDate;
        });
        
        const teamACVBeforeThis = teamDealsUpToThis.filter(d => d !== deal).reduce((sum, d) => sum + d.acv, 0);
        const teamACVAfterThis = teamACVBeforeThis + deal.acv;
        
        const teamAttainmentBefore = teamQuota > 0 ? (teamACVBeforeThis / teamQuota) * 100 : 0;
        const teamAttainmentAfter = teamQuota > 0 ? (teamACVAfterThis / teamQuota) * 100 : 0;
        
        const teamResult = calculateProgressiveCommission(
            deal.acv,
            teamAttainmentBefore,
            teamAttainmentAfter,
            teamQuota,
            teamOnTargetEarnings,
            teamBaseRate,
            rateTable
        );
        
        const teamCommission = teamResult.acceleratedCommission;
        const teamBase = teamResult.baseCommission;
        const teamAccelerator = teamCommission - teamBase;
        
        const teamCell = row.querySelector('.team-accelerated-commission-cell');
        if (teamAccelerator > 0) {
            teamCell.innerHTML = `${formatCurrency(teamBase)} <span class="accelerator-bonus">(+${formatCurrency(teamAccelerator)})</span>`;
        } else {
            teamCell.textContent = formatCurrency(teamCommission);
        }
        
        // Calculate total commission
        const totalCommission = individualCommission + teamCommission;
        row.querySelector('.total-commission-cell').textContent = formatCurrency(totalCommission);
    });
    
    // Calculate and display TOTAL TOTAL
    updateTotalTotal();
}

// Calculate and update the TOTAL TOTAL row
function updateTotalTotal() {
    const totalCells = document.querySelectorAll('.total-commission-cell');
    let grandTotal = 0;
    
    totalCells.forEach(cell => {
        const value = parseCurrency(cell.textContent);
        grandTotal += value;
    });
    
    const totalTotalCell = document.getElementById('totalTotalCommission');
    if (totalTotalCell) {
        totalTotalCell.textContent = formatCurrency(grandTotal);
    }
    
    // Calculate and display On Target Earnings (Base + Commissions)
    const baseSalary = parseCurrency(document.getElementById('baseSalary')?.value || '0');
    const totalOTE = baseSalary + grandTotal;
    const totalOTECell = document.getElementById('totalOTE');
    if (totalOTECell) {
        totalOTECell.textContent = formatCurrency(totalOTE);
    }
}

// Chart.js plugin to draw YTD ACV text - register globally
if (typeof Chart !== 'undefined') {
    Chart.register({
        id: 'ytdACVLabel',
        afterDraw: (chart) => {
            if (chart.ytdACV !== undefined && chart.chartArea) {
                const ctx = chart.ctx;
                const chartArea = chart.chartArea;
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const xPos = (chartArea.left + chartArea.right) / 2;
                const yPos = chartArea.top - 2; // Position at top with 2px padding
                ctx.fillText(formatCurrency(chart.ytdACV), xPos, yPos);
                ctx.restore();
            }
        }
    });
}

// Initialize charts
function initializeCharts() {
    // Destroy existing charts if they exist
    if (individualChart) {
        individualChart.destroy();
        individualChart = null;
    }
    if (teamChart) {
        teamChart.destroy();
        teamChart = null;
    }
    
    const individualCtx = document.getElementById('individualChart').getContext('2d');
    const teamCtx = document.getElementById('teamChart').getContext('2d');
    
    individualChart = new Chart(individualCtx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: ['Individual YTD ACV vs Plan'],
            datasets: [{
                label: 'Actual',
                data: [0],
                backgroundColor: '#4a9eff',
                borderRadius: 8
            }, {
                label: 'Remaining',
                data: [0],
                backgroundColor: '#666666',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                y: {
                    stacked: true
                }
            },
            animation: false
        }
    });
    
    teamChart = new Chart(teamCtx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: ['Team YTD ACV vs Plan'],
            datasets: [{
                label: 'Actual',
                data: [0],
                backgroundColor: '#4a9eff',
                borderRadius: 8
            }, {
                label: 'Remaining',
                data: [0],
                backgroundColor: '#666666',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                y: {
                    stacked: true
                }
            },
            animation: false
        }
    });
}

function updateCharts(teamACVYTD, teamQuota, individualACVYTD, individualQuota) {
    if (individualChart) {
        const isOverQuota = individualACVYTD > individualQuota;
        const actual = isOverQuota ? individualQuota : Math.min(individualACVYTD, individualQuota);
        const remaining = isOverQuota ? 0 : Math.max(0, individualQuota - individualACVYTD);
        const overage = isOverQuota ? individualACVYTD - individualQuota : 0;
        
        individualChart.data.datasets[0].data = [actual];
        individualChart.data.datasets[0].backgroundColor = '#4a9eff'; // Always blue for normal fill
        individualChart.data.datasets[1].data = [remaining];
        if (overage > 0) {
            // Add overage as a third dataset if over quota
            if (individualChart.data.datasets.length < 3) {
                individualChart.data.datasets.push({
                    label: 'Overage',
                    data: [overage],
                    backgroundColor: '#4caf50', // Green for overage
                    borderRadius: 8
                });
            } else {
                individualChart.data.datasets[2].data = [overage];
                individualChart.data.datasets[2].backgroundColor = '#4caf50'; // Ensure green for overage
            }
        } else if (individualChart.data.datasets.length > 2) {
            individualChart.data.datasets[2].data = [0];
        }
        
        // Store YTD ACV for the afterDraw plugin hook
        individualChart.ytdACV = individualACVYTD;
        individualChart.update();
    }
    
    if (teamChart) {
        const isOverQuota = teamACVYTD > teamQuota;
        const actual = isOverQuota ? teamQuota : Math.min(teamACVYTD, teamQuota);
        const remaining = isOverQuota ? 0 : Math.max(0, teamQuota - teamACVYTD);
        const overage = isOverQuota ? teamACVYTD - teamQuota : 0;
        
        teamChart.data.datasets[0].data = [actual];
        teamChart.data.datasets[0].backgroundColor = '#4a9eff'; // Always blue for normal fill
        teamChart.data.datasets[1].data = [remaining];
        if (overage > 0) {
            // Add overage as a third dataset if over quota
            if (teamChart.data.datasets.length < 3) {
                teamChart.data.datasets.push({
                    label: 'Overage',
                    data: [overage],
                    backgroundColor: '#4caf50', // Green for overage
                    borderRadius: 8
                });
            } else {
                teamChart.data.datasets[2].data = [overage];
                teamChart.data.datasets[2].backgroundColor = '#4caf50'; // Ensure green for overage
            }
        } else if (teamChart.data.datasets.length > 2) {
            teamChart.data.datasets[2].data = [0];
        }
        
        // Store YTD ACV for the afterDraw plugin hook
        teamChart.ytdACV = teamACVYTD;
        teamChart.update();
    }
}

// Export/Import Modal Functions
function showExportModal() {
    try {
        const modal = document.getElementById('jsonModal');
        const textarea = document.getElementById('jsonTextarea');
        const title = document.getElementById('modalTitle');
        const copyBtn = document.getElementById('copyBtn');
        const importBtn = document.getElementById('importConfirmBtn');
        
        if (!modal || !textarea || !title) {
            console.error('Modal elements not found');
            return;
        }
        
        title.textContent = 'Export JSON';
        if (copyBtn) copyBtn.style.display = 'inline-block';
        if (importBtn) importBtn.style.display = 'none';
        
        const data = {
            fyStartDate: document.getElementById('fyStartDate').value,
            payoutFrequency: document.getElementById('payoutFrequency').value,
            baseSalary: parseCurrency(document.getElementById('baseSalary')?.value || '0'),
            teamVariable: parseCurrency(document.getElementById('teamVariable').value),
            teamQuota: parseCurrency(document.getElementById('teamQuota').value),
            teamBaseRate: parseFloat(document.getElementById('teamBaseRate').value) || 0,
            individualVariable: parseCurrency(document.getElementById('individualVariable').value),
            individualQuota: parseCurrency(document.getElementById('individualQuota').value),
            individualBaseRate: parseFloat(document.getElementById('individualBaseRate').value) || 0,
            rateTable: rateTable,
            deals: deals.filter(deal => deal.name || deal.closeDate || deal.acv > 0),
            quarterColors: quarterColors
        };
        
        textarea.value = JSON.stringify(data, null, 2);
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        setTimeout(() => {
            textarea.select();
            textarea.focus();
        }, 100);
    } catch (error) {
        console.error('Error in showExportModal:', error);
        showToast('Error exporting data: ' + error.message, 'error');
    }
}

function showImportModal() {
    try {
        const modal = document.getElementById('jsonModal');
        const textarea = document.getElementById('jsonTextarea');
        const title = document.getElementById('modalTitle');
        const copyBtn = document.getElementById('copyBtn');
        const importBtn = document.getElementById('importConfirmBtn');
        
        if (!modal || !textarea || !title) {
            console.error('Modal elements not found');
            return;
        }
        
        title.textContent = 'Import JSON';
        if (copyBtn) copyBtn.style.display = 'none';
        if (importBtn) importBtn.style.display = 'inline-block';
        textarea.value = '';
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        setTimeout(() => {
            textarea.focus();
        }, 100);
    } catch (error) {
        console.error('Error in showImportModal:', error);
        showToast('Error opening import modal: ' + error.message, 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('jsonModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
    }
}

function copyToClipboard() {
    const textarea = document.getElementById('jsonTextarea');
    textarea.select();
    
    // Try modern clipboard API first, fallback to execCommand
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textarea.value).then(() => {
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(() => {
            // Fallback to execCommand
            document.execCommand('copy');
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    } else {
        // Fallback to execCommand for older browsers
        document.execCommand('copy');
        const copyBtn = document.getElementById('copyBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }
}

// Import from JSON
function importFromJSON() {
    const textarea = document.getElementById('jsonTextarea');
    try {
        const data = JSON.parse(textarea.value);
        
        // Load all fields
        if (data.fyStartDate) document.getElementById('fyStartDate').value = data.fyStartDate;
        if (data.payoutFrequency) document.getElementById('payoutFrequency').value = data.payoutFrequency;
        if (data.baseSalary !== undefined) {
            const baseSalaryInput = document.getElementById('baseSalary');
            if (baseSalaryInput) baseSalaryInput.value = formatCurrencyInput(data.baseSalary);
        }
        if (data.teamVariable !== undefined) document.getElementById('teamVariable').value = formatCurrencyInput(data.teamVariable);
        if (data.teamQuota !== undefined) document.getElementById('teamQuota').value = formatCurrencyInput(data.teamQuota);
        if (data.teamBaseRate !== undefined) document.getElementById('teamBaseRate').value = data.teamBaseRate;
        if (data.individualVariable !== undefined) document.getElementById('individualVariable').value = formatCurrencyInput(data.individualVariable);
        if (data.individualQuota !== undefined) document.getElementById('individualQuota').value = formatCurrencyInput(data.individualQuota);
        if (data.individualBaseRate !== undefined) document.getElementById('individualBaseRate').value = data.individualBaseRate;
        
        if (data.rateTable && Array.isArray(data.rateTable)) {
            rateTable = data.rateTable;
            renderRateTable();
        }
        
        // Restore quarter colors if present
        if (data.quarterColors && typeof data.quarterColors === 'object') {
            quarterColors = { ...quarterColors, ...data.quarterColors };
            // Save to localStorage
            Object.keys(quarterColors).forEach(quarter => {
                localStorage.setItem(`quarterColor${quarter}`, quarterColors[quarter]);
            });
            // Update legend display
            const legendItems = document.querySelectorAll('.legend-item');
            legendItems.forEach(item => {
                const quarter = parseInt(item.dataset.quarter);
                const colorSpan = item.querySelector('.legend-color');
                if (colorSpan && quarterColors[quarter]) {
                    colorSpan.style.backgroundColor = quarterColors[quarter];
                }
            });
        }
        
        // Handle new unified format and legacy formats
        if (data.deals && Array.isArray(data.deals)) {
            // New unified format
            deals = data.deals.map(deal => ({
                ...deal,
                teamOnly: deal.teamOnly || false
            }));
            renderDealTable();
        } else if (data.teamDeals && Array.isArray(data.teamDeals) || data.individualDeals && Array.isArray(data.individualDeals)) {
            // Legacy format - combine team and individual deals
            deals = [];
            if (data.teamDeals && Array.isArray(data.teamDeals)) {
                data.teamDeals.forEach(deal => {
                    deals.push({ ...deal, teamOnly: true });
                });
            }
            if (data.individualDeals && Array.isArray(data.individualDeals)) {
                data.individualDeals.forEach(deal => {
                    deals.push({ ...deal, teamOnly: false });
                });
            }
            renderDealTable();
        }
        
        calculate();
        closeModal();
        showToast('Data imported successfully!');
    } catch (error) {
        showToast('Error importing JSON: ' + error.message, 'error');
    }
}

// Toast notification functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatPercent(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
