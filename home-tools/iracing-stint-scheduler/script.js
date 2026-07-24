// Data Presets
const presetData = {
    car: {
        "gt3": { capacityL: 105, pitTime: 40 },
        "gtp": { capacityL: 75, pitTime: 35 },
        "lmp2": { capacityL: 75, pitTime: 35 }
    },
    track: {
        "daytona": {
            "gt3": { lapTime: 104, fuelPerLapL: 3.1 },
            "gtp": { lapTime: 93, fuelPerLapL: 2.2 },
            "lmp2": { lapTime: 96, fuelPerLapL: 2.5 }
        },
        "lemans": {
            "gt3": { lapTime: 235, fuelPerLapL: 6.5 },
            "gtp": { lapTime: 195, fuelPerLapL: 4.8 },
            "lmp2": { lapTime: 205, fuelPerLapL: 5.2 }
        },
        "spa": {
            "gt3": { lapTime: 138, fuelPerLapL: 4.2 },
            "gtp": { lapTime: 122, fuelPerLapL: 3.0 },
            "lmp2": { lapTime: 125, fuelPerLapL: 3.2 }
        },
        "roadamerica": {
            "gt3": { lapTime: 124, fuelPerLapL: 4.0 },
            "gtp": { lapTime: 107, fuelPerLapL: 2.7 },
            "lmp2": { lapTime: 111, fuelPerLapL: 3.0 }
        }
    }
};

const defaultColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
let colorIndex = 0;

// State Management
const state = {
    drivers: [],
    unavailabilities: [], // { driverId, start, end }
    schedule: [],
    qualifyingDriverId: null,
    isScheduleManuallyEdited: false
};

let driverIdCounter = 1;

// DOM Elements
const raceDurationEl = document.getElementById('race-duration');
const raceStartEl = document.getElementById('race-start');
const maxConsecutiveEl = document.getElementById('max-consecutive');
const presetCarEl = document.getElementById('preset-car');
const presetTrackEl = document.getElementById('preset-track');
const fuelUnitEl = document.getElementById('fuel-unit');
const avgLapTimeEl = document.getElementById('avg-lap-time');
const pitStopTimeEl = document.getElementById('pit-stop-time');
const fuelPerLapEl = document.getElementById('fuel-per-lap');
const tankCapacityEl = document.getElementById('tank-capacity');

const summaryMaxLapsEl = document.getElementById('summary-max-laps');
const summaryStintTimeEl = document.getElementById('summary-stint-time');

const addDriverForm = document.getElementById('add-driver-form');
const driverNameEl = document.getElementById('driver-name');
const driverColorEl = document.getElementById('driver-color');
const driversListEl = document.getElementById('drivers-list');

const addUnavailabilityForm = document.getElementById('add-unavailability-form');
const unavailDriverSelect = document.getElementById('unavail-driver-select');
const unavailStartEl = document.getElementById('unavail-start');
const unavailEndEl = document.getElementById('unavail-end');
const unavailListEl = document.getElementById('unavail-list');

const generateBtn = document.getElementById('generate-btn');
const deleteLastBtn = document.getElementById('delete-last-btn');
const scheduleBody = document.getElementById('schedule-body');
const headerStatsEl = document.getElementById('header-stats');
const driverStatsContainerEl = document.getElementById('driver-stats-container');

// Modal Elements
const ioModalEl = document.getElementById('io-modal');
const ioTextareaEl = document.getElementById('io-textarea');
const ioBtnEl = document.getElementById('io-btn');
const copyJsonBtnEl = document.getElementById('copy-json-btn');
const importJsonBtnEl = document.getElementById('import-json-btn');
const closeModalBtnEl = document.getElementById('close-modal-btn');

// Format Helpers
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
    return date.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

// Initial Setup
function init() {
    // Set default start time to today at 14:00
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    raceStartEl.value = localISOTime;

    // Listeners
    addDriverForm.addEventListener('submit', handleAddDriver);
    addUnavailabilityForm.addEventListener('submit', handleAddUnavailability);
    generateBtn.addEventListener('click', () => {
        generateSchedule();
        encodeStateToURL();
    });
    
    presetCarEl.addEventListener('change', () => {
        updatePresets();
        encodeStateToURL();
    });
    presetTrackEl.addEventListener('change', () => {
        updatePresets();
        encodeStateToURL();
    });
    fuelUnitEl.addEventListener('change', () => {
        updateUnits();
        encodeStateToURL();
    });
    
    driverColorEl.value = defaultColors[colorIndex];

    // Calc listeners
    [avgLapTimeEl, fuelPerLapEl, tankCapacityEl, raceDurationEl, raceStartEl, pitStopTimeEl].forEach(el => {
        el.addEventListener('input', () => {
            updateCalcSummary();
            encodeStateToURL();
        });
    });
    
    maxConsecutiveEl.addEventListener('change', () => {
        if (state.drivers.length > 0) {
            if (state.isScheduleManuallyEdited) {
                recalculateStatsAndRender();
            } else {
                generateSchedule();
            }
        }
        encodeStateToURL();
    });
    
    // Modal Listeners
    ioBtnEl.addEventListener('click', openIOModal);
    closeModalBtnEl.addEventListener('click', closeIOModal);
    copyJsonBtnEl.addEventListener('click', copyJSONConfig);
    importJsonBtnEl.addEventListener('click', importJSONConfigAction);
    
    const shareLinkBtnEl = document.getElementById('share-link-btn');
    if (shareLinkBtnEl) {
        shareLinkBtnEl.addEventListener('click', copyShareLink);
    }
    
    document.getElementById('close-alert-btn').addEventListener('click', () => {
        document.getElementById('alert-modal').style.display = 'none';
    });
    
    deleteLastBtn.addEventListener('click', handleDeleteLastStint);

    updateCalcSummary();

    // Check URL Hash for deep link data
    const loadedFromURL = decodeStateFromURL();
    if (!loadedFromURL) {
        encodeStateToURL();
    }
}

// Calculations
function getStintSpecs() {
    const fuelPerLap = parseFloat(fuelPerLapEl.value);
    const tankCapacity = parseFloat(tankCapacityEl.value);
    const avgLapTimeSec = parseFloat(avgLapTimeEl.value);
    const pitStopTimeSec = parseFloat(pitStopTimeEl.value);

    if (fuelPerLap <= 0 || tankCapacity <= 0 || avgLapTimeSec <= 0) {
        return { maxLaps: 0, stintTimeSec: 0, totalStintTimeSec: 0 };
    }

    // Apply 2% buffer below maximum fuel capacity for safety margin
    const usableCapacity = tankCapacity * 0.98;
    const maxLaps = Math.floor(usableCapacity / fuelPerLap);
    const stintTimeSec = maxLaps * avgLapTimeSec;
    const totalStintTimeSec = stintTimeSec + pitStopTimeSec;

    return { maxLaps, stintTimeSec, totalStintTimeSec };
}

function updateCalcSummary() {
    const specs = getStintSpecs();
    if (specs.maxLaps > 0) {
        summaryMaxLapsEl.textContent = specs.maxLaps;
        summaryStintTimeEl.textContent = formatDuration(specs.stintTimeSec);
    } else {
        summaryMaxLapsEl.textContent = '--';
        summaryStintTimeEl.textContent = '--';
    }
    updateSessionTimesHeader();
}

function updateSessionTimesHeader() {
    const badgeEl = document.getElementById('session-times-badge');
    if (!badgeEl) return;
    const raceStartVal = raceStartEl.value;
    if (!raceStartVal) {
        badgeEl.style.display = 'none';
        return;
    }
    const raceStartTime = new Date(raceStartVal);
    if (isNaN(raceStartTime.getTime())) {
        badgeEl.style.display = 'none';
        return;
    }

    const qualyStartTime = new Date(raceStartTime.getTime() - 15 * 60 * 1000);
    const practiceStartTime = new Date(raceStartTime.getTime() - 45 * 60 * 1000);

    badgeEl.style.display = 'flex';
    badgeEl.innerHTML = `
        <div class="session-time-item">
            <span class="session-label"><i class="fa-solid fa-stopwatch"></i> Practice (30m)</span>
            <span class="session-val">${formatTime(practiceStartTime)}</span>
        </div>
        <div class="session-time-item">
            <span class="session-label"><i class="fa-solid fa-flag-checkered"></i> Qualy (15m)</span>
            <span class="session-val">${formatTime(qualyStartTime)}</span>
        </div>
        <div class="session-time-item">
            <span class="session-label"><i class="fa-solid fa-play"></i> Race Start</span>
            <span class="session-val">${formatTime(raceStartTime)}</span>
        </div>
    `;
}

// Driver Management
function updateUnitsLabelsOnly() {
    const unit = fuelUnitEl.value;
    document.getElementById('label-fuel-per-lap').textContent = `Fuel Per Lap (${unit})`;
    document.getElementById('label-tank-capacity').textContent = `Tank Capacity (${unit})`;
}

function updateUnits() {
    updateUnitsLabelsOnly();
    updatePresets();
}

function updatePresets() {
    const car = presetCarEl.value;
    const track = presetTrackEl.value;
    const unit = fuelUnitEl.value;
    
    if (car && presetData.car[car]) {
        let cap = presetData.car[car].capacityL;
        if (unit === 'G') cap = cap / 3.78541;
        tankCapacityEl.value = cap.toFixed(1);
        pitStopTimeEl.value = presetData.car[car].pitTime;
    }
    if (car && track && presetData.track[track] && presetData.track[track][car]) {
        const td = presetData.track[track][car];
        avgLapTimeEl.value = td.lapTime;
        let fuel = td.fuelPerLapL;
        if (unit === 'G') fuel = fuel / 3.78541;
        fuelPerLapEl.value = fuel.toFixed(2);
    }
    updateCalcSummary();
}

function updateDriverColor(id, color) {
    const d = state.drivers.find(d => d.id === id);
    if (d) {
        d.color = color;
        renderDrivers();
        if (state.schedule.length > 0) {
            if (state.isScheduleManuallyEdited) {
                recalculateStatsAndRender();
            } else {
                generateSchedule();
            }
        }
    }
}

function handleAddDriver(e) {
    e.preventDefault();
    const name = driverNameEl.value.trim();
    const color = driverColorEl.value;

    if (!name) return;

    const driver = { id: driverIdCounter++, name, color };
    state.drivers.push(driver);
    
    driverNameEl.value = '';
    
    colorIndex = (colorIndex + 1) % defaultColors.length;
    driverColorEl.value = defaultColors[colorIndex];
    
    renderDrivers();
    renderDriverSelect();
    encodeStateToURL();
}

function removeDriver(id) {
    state.drivers = state.drivers.filter(d => d.id !== id);
    state.unavailabilities = state.unavailabilities.filter(u => u.driverId !== id);
    if (state.qualifyingDriverId === id) {
        state.qualifyingDriverId = null;
    }
    renderDrivers();
    renderDriverSelect();
    renderUnavailabilities();
    encodeStateToURL();
}

function renderDrivers() {
    driversListEl.innerHTML = '';
    if (state.drivers.length === 0) {
        driversListEl.innerHTML = '<div class="list-item" style="color: var(--text-muted); justify-content: center;">No drivers added</div>';
        renderQualifyingBanner();
        return;
    }

    const qualyId = getActiveQualifyingDriverId();

    state.drivers.forEach((driver, idx) => {
        const div = document.createElement('div');
        div.className = 'list-item roster-item';
        div.setAttribute('draggable', 'true');
        div.setAttribute('data-roster-index', idx);
        div.setAttribute('ondragstart', `handleDriverDragStart(event, ${driver.id})`);
        div.setAttribute('ondragover', 'handleRosterDragOver(event)');
        div.setAttribute('ondragleave', 'handleRosterDragLeave(event)');
        div.setAttribute('ondrop', `handleRosterDrop(event, ${idx})`);
        
        const isQualy = qualyId === driver.id;
        const starClass = isQualy ? 'fa-solid fa-star text-yellow' : 'fa-regular fa-star';
        
        div.innerHTML = `
            <div class="driver-info">
                <input type="color" class="driver-color-picker" value="${driver.color}" onchange="updateDriverColor(${driver.id}, this.value)" title="Change color">
                <span>${driver.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="btn-star" onclick="toggleQualifying(${driver.id})" title="Set as Qualifying & 1st Stint Driver">
                    <i class="${starClass}"></i>
                </button>
                <i class="fa-solid fa-bars drag-handle" title="Drag to Schedule"></i>
                <button class="btn-danger" onclick="removeDriver(${driver.id})" title="Remove Driver">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        driversListEl.appendChild(div);
    });
    
    renderQualifyingBanner();
}

function renderDriverSelect() {
    const currentVal = unavailDriverSelect.value;
    unavailDriverSelect.innerHTML = '<option value="" disabled selected>Select Driver...</option>';
    
    state.drivers.forEach(driver => {
        const opt = document.createElement('option');
        opt.value = driver.id;
        opt.textContent = driver.name;
        unavailDriverSelect.appendChild(opt);
    });

    if (currentVal && state.drivers.find(d => d.id == currentVal)) {
        unavailDriverSelect.value = currentVal;
    }
}

// Unavailability Management
function handleAddUnavailability(e) {
    e.preventDefault();
    const driverId = parseInt(unavailDriverSelect.value);
    const start = new Date(unavailStartEl.value);
    const end = new Date(unavailEndEl.value);

    if (!driverId || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        alert('Please provide valid driver and time range.');
        return;
    }

    state.unavailabilities.push({
        id: Date.now(), // simple unique id
        driverId,
        start,
        end
    });

    unavailStartEl.value = '';
    unavailEndEl.value = '';
    renderUnavailabilities();
    encodeStateToURL();
}

function removeUnavailability(id) {
    state.unavailabilities = state.unavailabilities.filter(u => u.id !== id);
    renderUnavailabilities();
    encodeStateToURL();
}

function renderUnavailabilities() {
    unavailListEl.innerHTML = '';
    if (state.unavailabilities.length === 0) {
        unavailListEl.innerHTML = '<div class="list-item" style="color: var(--text-muted); justify-content: center;">No unavailable times set</div>';
        return;
    }

    state.unavailabilities.sort((a, b) => a.start - b.start).forEach(u => {
        const driver = state.drivers.find(d => d.id === u.driverId);
        if (!driver) return; // Should not happen

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="unavail-info">
                <span class="driver-name-badge" style="color: ${driver.color}">${driver.name}</span>
                <span class="time-range">${formatDateTime(u.start)} - ${formatDateTime(u.end)}</span>
            </div>
            <button class="btn-danger" onclick="removeUnavailability(${u.id})" title="Remove Block">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        unavailListEl.appendChild(div);
    });
}

// Schedule Generation
function isDriverAvailable(driverId, stintStart, stintEnd) {
    const blocks = state.unavailabilities.filter(u => u.driverId === driverId);
    for (const block of blocks) {
        // Overlap condition: start < block.end AND end > block.start
        if (stintStart < block.end && stintEnd > block.start) {
            return false;
        }
    }
    return true;
}

function generateSchedule() {
    state.isScheduleManuallyEdited = false;
    if (state.drivers.length === 0) {
        alert("Please add at least one driver.");
        return;
    }

    const raceStartVal = raceStartEl.value;
    if (!raceStartVal) {
        alert("Please set a race start time.");
        return;
    }

    const raceDurationMinutes = parseFloat(raceDurationEl.value);
    const specs = getStintSpecs();

    if (specs.maxLaps <= 0) {
        alert("Please check your lap and fuel configuration.");
        return;
    }

    const raceStartTime = new Date(raceStartVal);
    const raceEndTime = new Date(raceStartTime.getTime() + raceDurationMinutes * 60 * 1000);
    
    let currentTime = new Date(raceStartTime.getTime());
    
    state.schedule = [];
    
    // Track drive time to ensure fair rotation among available drivers
    const driverStats = {};
    state.drivers.forEach(d => {
        driverStats[d.id] = { totalDriveTimeSec: 0, stints: 0 };
    });

    let stintNumber = 1;
    let cumulativeLaps = 0;

    let consecutiveDriverId = null;
    let consecutiveCount = 0;
    const maxConsecutiveRaw = parseInt(maxConsecutiveEl.value);
    const maxConsecutive = isNaN(maxConsecutiveRaw) ? 2 : maxConsecutiveRaw;

    let previousDriverId = null; // Try to avoid immediate double stints if possible

    while (currentTime < raceEndTime) {
        const stintStart = new Date(currentTime.getTime());
        // Calculate remaining time
        const remainingSec = (raceEndTime - currentTime) / 1000;
        
        let isFinalStint = false;
        let currentStintTimeSec = specs.stintTimeSec;
        let currentStintLaps = specs.maxLaps;
        
        // If remaining time is less than a full stint + pitstop, adjust
        // We only care about drive time for the final stint (no pitstop after flag)
        if (remainingSec <= specs.stintTimeSec) {
            currentStintTimeSec = remainingSec;
            currentStintLaps = Math.ceil(currentStintTimeSec / parseFloat(avgLapTimeEl.value));
            isFinalStint = true;
        }

        const stintEndDrive = new Date(stintStart.getTime() + currentStintTimeSec * 1000);
        
        // Find available driver
        let availableDrivers = state.drivers.filter(d => isDriverAvailable(d.id, stintStart, stintEndDrive));
        
        // Filter out drivers who have hit consecutive limit if maxConsecutive > 0
        if (maxConsecutive > 0 && consecutiveDriverId !== null && consecutiveCount >= maxConsecutive && availableDrivers.length > 1) {
            availableDrivers = availableDrivers.filter(d => d.id !== consecutiveDriverId);
        }
        
        let selectedDriver = null;

        // Stint 1 priority: qualifying driver (starred driver or first driver in roster)
        const qualyId = getActiveQualifyingDriverId();
        if (stintNumber === 1 && qualyId) {
            const qualyDriver = state.drivers.find(d => d.id === qualyId);
            if (qualyDriver && availableDrivers.some(d => d.id === qualyId)) {
                selectedDriver = qualyDriver;
            }
        }

        if (!selectedDriver && availableDrivers.length > 0) {
            // Sort by minimum drive time first.
            // If equal, prefer someone other than the previous driver.
            // If still equal, break ties by roster order (top driver gets priority).
            availableDrivers.sort((a, b) => {
                const timeA = driverStats[a.id].totalDriveTimeSec;
                const timeB = driverStats[b.id].totalDriveTimeSec;
                if (timeA !== timeB) return timeA - timeB;
                
                const aPrev = (a.id === previousDriverId);
                const bPrev = (b.id === previousDriverId);
                if (aPrev !== bPrev) return aPrev ? 1 : -1;
                
                const idxA = state.drivers.indexOf(a);
                const idxB = state.drivers.indexOf(b);
                return idxA - idxB;
            });
            selectedDriver = availableDrivers[0];
        }

        if (selectedDriver) {
            driverStats[selectedDriver.id].totalDriveTimeSec += currentStintTimeSec;
            driverStats[selectedDriver.id].stints += 1;
            
            if (selectedDriver.id === consecutiveDriverId) {
                consecutiveCount++;
            } else {
                consecutiveDriverId = selectedDriver.id;
                consecutiveCount = 1;
            }
            previousDriverId = selectedDriver.id;
        } else {
            previousDriverId = null;
            consecutiveDriverId = null;
            consecutiveCount = 0;
        }

        cumulativeLaps += currentStintLaps;

        state.schedule.push({
            stintNumber,
            driver: selectedDriver,
            startTime: stintStart,
            scheduledStartTime: new Date(stintStart.getTime()),
            endTime: stintEndDrive,
            scheduledEndTime: new Date(stintEndDrive.getTime()),
            laps: currentStintLaps,
            cumulativeLaps
        });

        // Advance time for next stint
        currentTime = new Date(stintEndDrive.getTime() + (isFinalStint ? 0 : parseFloat(pitStopTimeEl.value) * 1000));
        stintNumber++;
    }

    renderSchedule(driverStats);
}

function renderSchedule(driverStats) {
    scheduleBody.innerHTML = '';
    
    if (state.schedule.length === 0) {
        scheduleBody.innerHTML = '<tr class="empty-state"><td colspan="6">No schedule generated.</td></tr>';
        headerStatsEl.style.display = 'none';
        driverStatsContainerEl.style.display = 'none';
        deleteLastBtn.style.display = 'none';
        return;
    }
    
    deleteLastBtn.style.display = 'inline-flex';

    state.schedule.forEach((stint, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'stint-row';
        tr.setAttribute('data-stint-index', idx);
        tr.setAttribute('ondragover', 'handleStintDragOver(event)');
        tr.setAttribute('ondragleave', 'handleStintDragLeave(event)');
        tr.setAttribute('ondrop', `handleStintDrop(event, ${idx})`);
        
        let driverContent = `
            <div class="driver-cell empty-driver" onclick="handleDriverCellClick(event, ${idx})" style="cursor: pointer;">
                <span style="color: var(--danger-color)">NO DRIVER AVAILABLE</span>
                <i class="fa-solid fa-pencil edit-icon" style="margin-left: auto; font-size: 0.8rem; opacity: 0.3;"></i>
            </div>
        `;
        if (stint.driver) {
            driverContent = `
                <div class="driver-cell" draggable="true" ondragstart="handleStintDragStart(event, ${idx})" onclick="handleDriverCellClick(event, ${idx})" style="cursor: pointer;">
                    <div class="driver-color-dot" style="background-color: ${stint.driver.color}"></div>
                    <span>${stint.driver.name}</span>
                    <i class="fa-solid fa-bars drag-handle" style="margin-left: auto; font-size: 0.8rem;" title="Drag to swap" onclick="event.stopPropagation()"></i>
                </div>
            `;
        }

        let startTimeClass = '';
        if (stint.scheduledStartTime) {
            const diffStart = stint.startTime.getTime() - stint.scheduledStartTime.getTime();
            if (diffStart < -1000) {
                startTimeClass = 'start-time-earlier';
            } else if (diffStart > 1000) {
                startTimeClass = 'start-time-later';
            }
        }

        let endTimeClass = '';
        if (stint.scheduledEndTime) {
            const diffEnd = stint.endTime.getTime() - stint.scheduledEndTime.getTime();
            if (diffEnd < -1000) {
                endTimeClass = 'start-time-earlier';
            } else if (diffEnd > 1000) {
                endTimeClass = 'start-time-later';
            }
        }

        tr.innerHTML = `
            <td>${stint.stintNumber}</td>
            <td>${driverContent}</td>
            <td class="start-time-cell ${startTimeClass}" onclick="handleStartTimeClick(event, ${idx})" style="cursor: pointer;">
                ${formatDateTime(stint.startTime)} 
                <i class="fa-solid fa-pencil edit-icon" style="font-size: 0.65rem; opacity: 0.3; margin-left: 0.25rem;"></i>
            </td>
            <td class="${endTimeClass}">${formatDateTime(stint.endTime)}</td>
            <td>${stint.laps}</td>
            <td>${stint.cumulativeLaps}</td>
        `;
        scheduleBody.appendChild(tr);
    });

    // Render Stats
    headerStatsEl.innerHTML = '';
    headerStatsEl.style.display = 'flex';
    
    driverStatsContainerEl.innerHTML = '';
    driverStatsContainerEl.style.display = 'grid';

    // Total Laps / Stints stat
    const totalStints = state.schedule.length;
    const totalLaps = state.schedule[state.schedule.length - 1].cumulativeLaps;
    const totalPitStops = totalStints > 1 ? totalStints - 1 : 0;
    const totalPitTime = totalPitStops * parseFloat(pitStopTimeEl.value);

    headerStatsEl.innerHTML = `
        <div class="header-stat-item">
            <span class="label">Total Laps</span>
            <span class="value">${totalLaps}</span>
        </div>
        <div class="header-stat-item">
            <span class="label">Total Stints</span>
            <span class="value">${totalStints}</span>
        </div>
        <div class="header-stat-item">
            <span class="label">Total Pit Time</span>
            <span class="value">${formatDuration(totalPitTime)}</span>
        </div>
    `;

    // Driver specific stats
    state.drivers.forEach(d => {
        const stats = driverStats[d.id];
        driverStatsContainerEl.innerHTML += `
            <div class="stat-card" style="border-top: 3px solid ${d.color}">
                <h3>${d.name}</h3>
                <div class="value">${formatDuration(stats.totalDriveTimeSec)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">${stats.stints} stints</div>
            </div>
        `;
    });
}

// Drag and Drop variables and handlers
let draggedDriverId = null;
let draggedStintIndex = null;
let draggedRosterIndex = null;

window.handleDriverDragStart = function(e, id) {
    draggedDriverId = id;
    draggedStintIndex = null;
    draggedRosterIndex = state.drivers.findIndex(d => d.id === id);
    e.dataTransfer.setData('text/plain', 'driver');
};

window.handleStintDragStart = function(e, index) {
    draggedStintIndex = index;
    draggedDriverId = null;
    e.dataTransfer.setData('text/plain', 'stint');
};

window.handleStintDragOver = function(e) {
    e.preventDefault();
    const tr = e.currentTarget;
    tr.classList.add('drag-over');
};

window.handleStintDragLeave = function(e) {
    const tr = e.currentTarget;
    tr.classList.remove('drag-over');
};

window.handleStintDrop = function(e, targetIndex) {
    e.preventDefault();
    const tr = e.currentTarget;
    tr.classList.remove('drag-over');
    
    const targetStint = state.schedule[targetIndex];
    if (!targetStint) return;
    
    if (draggedDriverId !== null) {
        // Assigning driver to stint
        const driver = state.drivers.find(d => d.id === draggedDriverId);
        if (!driver) return;
        
        // Check availability
        if (!isDriverAvailable(driver.id, targetStint.startTime, targetStint.endTime)) {
            showAlert(`${driver.name} is unavailable during Stint ${targetStint.stintNumber}!`);
            return;
        }
        
        targetStint.driver = driver;
        state.isScheduleManuallyEdited = true;
        recalculateStatsAndRender();
    } else if (draggedStintIndex !== null) {
        const sourceStint = state.schedule[draggedStintIndex];
        if (!sourceStint) return;
        
        // Swap drivers
        const sourceDriver = sourceStint.driver;
        const targetDriver = targetStint.driver;
        
        // Validate both availabilities
        if (sourceDriver && !isDriverAvailable(sourceDriver.id, targetStint.startTime, targetStint.endTime)) {
            showAlert(`${sourceDriver.name} is unavailable during Stint ${targetStint.stintNumber}!`);
            return;
        }
        if (targetDriver && !isDriverAvailable(targetDriver.id, sourceStint.startTime, sourceStint.endTime)) {
            showAlert(`${targetDriver.name} is unavailable during Stint ${sourceStint.stintNumber}!`);
            return;
        }
        
        sourceStint.driver = targetDriver;
        targetStint.driver = sourceDriver;
        
        state.isScheduleManuallyEdited = true;
        recalculateStatsAndRender();
    }
};

function recalculateStatsAndRender() {
    const driverStats = {};
    state.drivers.forEach(d => {
        driverStats[d.id] = { totalDriveTimeSec: 0, stints: 0 };
    });
    
    state.schedule.forEach(stint => {
        if (stint.driver) {
            const duration = (stint.endTime - stint.startTime) / 1000;
            driverStats[stint.driver.id].totalDriveTimeSec += duration;
            driverStats[stint.driver.id].stints += 1;
        }
    });
    
    renderSchedule(driverStats);
    encodeStateToURL();
}

// Modal and JSON Configuration Handlers
function openIOModal() {
    ioTextareaEl.value = getJSONConfig();
    ioModalEl.style.display = 'flex';
}

function closeIOModal() {
    ioModalEl.style.display = 'none';
}

function copyJSONConfig() {
    ioTextareaEl.select();
    navigator.clipboard.writeText(ioTextareaEl.value)
        .then(() => {
            const originalText = copyJsonBtnEl.innerHTML;
            copyJsonBtnEl.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(() => {
                copyJsonBtnEl.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => alert('Failed to copy configuration: ' + err));
}

function getJSONConfig() {
    return JSON.stringify({
        duration: raceDurationEl.value,
        startTime: raceStartEl.value,
        maxConsecutive: maxConsecutiveEl.value,
        avgLapTime: avgLapTimeEl.value,
        pitStopTime: pitStopTimeEl.value,
        fuelUnit: fuelUnitEl.value,
        fuelPerLap: fuelPerLapEl.value,
        tankCapacity: tankCapacityEl.value,
        presetCar: presetCarEl.value,
        presetTrack: presetTrackEl.value,
        qualifyingDriverId: state.qualifyingDriverId,
        drivers: state.drivers,
        unavailabilities: state.unavailabilities.map(u => ({
            driverId: u.driverId,
            start: u.start.toISOString(),
            end: u.end.toISOString()
        })),
        schedule: state.schedule.map(stint => ({
            stintNumber: stint.stintNumber,
            driverId: stint.driver ? stint.driver.id : null,
            startTime: stint.startTime.toISOString(),
            scheduledStartTime: stint.scheduledStartTime ? stint.scheduledStartTime.toISOString() : stint.startTime.toISOString(),
            endTime: stint.endTime.toISOString(),
            scheduledEndTime: stint.scheduledEndTime ? stint.scheduledEndTime.toISOString() : stint.endTime.toISOString(),
            laps: stint.laps,
            cumulativeLaps: stint.cumulativeLaps
        }))
    }, null, 2);
}

function importJSONConfigAction() {
    const jsonStr = ioTextareaEl.value.trim();
    if (!jsonStr) return;
    
    if (importJSONConfig(jsonStr)) {
        closeIOModal();
    }
}

function importJSONConfig(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        raceDurationEl.value = data.duration || 1440;
        raceStartEl.value = data.startTime || '';
        maxConsecutiveEl.value = data.maxConsecutive || 2;
        avgLapTimeEl.value = data.avgLapTime || 120;
        pitStopTimeEl.value = data.pitStopTime || 45;
        fuelUnitEl.value = data.fuelUnit || 'L';
        fuelPerLapEl.value = data.fuelPerLap || 3.5;
        tankCapacityEl.value = data.tankCapacity || 105;
        presetCarEl.value = data.presetCar || '';
        presetTrackEl.value = data.presetTrack || '';
        state.qualifyingDriverId = data.qualifyingDriverId || null;
        
        state.drivers = data.drivers || [];
        driverIdCounter = state.drivers.reduce((max, d) => Math.max(max, d.id), 0) + 1;
        
        state.unavailabilities = (data.unavailabilities || []).map(u => ({
            id: Math.random(),
            driverId: u.driverId,
            start: new Date(u.start),
            end: new Date(u.end)
        }));
        
        updateUnitsLabelsOnly();
        updateCalcSummary();
        renderDrivers();
        renderDriverSelect();
        renderUnavailabilities();
        
        if (data.schedule && data.schedule.length > 0) {
            state.isScheduleManuallyEdited = true;
            state.schedule = data.schedule.map(stint => ({
                stintNumber: stint.stintNumber,
                driver: state.drivers.find(d => d.id === stint.driverId) || null,
                startTime: new Date(stint.startTime),
                scheduledStartTime: stint.scheduledStartTime ? new Date(stint.scheduledStartTime) : new Date(stint.startTime),
                endTime: new Date(stint.endTime),
                scheduledEndTime: stint.scheduledEndTime ? new Date(stint.scheduledEndTime) : new Date(stint.endTime),
                laps: stint.laps,
                cumulativeLaps: stint.cumulativeLaps
            }));
            recalculateStatsAndRender();
        } else if (state.drivers.length > 0) {
            generateSchedule();
        }
        return true;
    } catch (e) {
        alert('Invalid JSON config: ' + e.message);
        return false;
    }
}

function getActiveQualifyingDriverId() {
    if (state.qualifyingDriverId && state.drivers.some(d => d.id === state.qualifyingDriverId)) {
        return state.qualifyingDriverId;
    }
    return state.drivers.length > 0 ? state.drivers[0].id : null;
}

window.toggleQualifying = function(driverId) {
    const activeQualyId = getActiveQualifyingDriverId();
    if (activeQualyId === driverId) {
        state.qualifyingDriverId = (state.drivers[0] && state.drivers[0].id === driverId) ? null : driverId;
    } else {
        state.qualifyingDriverId = driverId;
    }
    renderDrivers();
    if (state.drivers.length > 0) {
        if (state.isScheduleManuallyEdited) {
            recalculateStatsAndRender();
        } else {
            generateSchedule();
        }
    }
    encodeStateToURL();
};

function renderQualifyingBanner() {
    const banner = document.getElementById('qualifying-banner');
    const qualyId = getActiveQualifyingDriverId();
    if (!qualyId) {
        banner.style.display = 'none';
        return;
    }
    const driver = state.drivers.find(d => d.id === qualyId);
    if (!driver) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = 'flex';
    banner.innerHTML = `
        <i class="fa-solid fa-star star-icon"></i>
        <span>Qualifying Driver & 1st Stint:</span>
        <span class="driver-badge">
            <div class="driver-color-dot" style="background-color: ${driver.color}; width: 10px; height: 10px; border-radius: 50%;"></div>
            ${driver.name}
        </span>
    `;
}

function showAlert(message) {
    document.getElementById('alert-message').innerHTML = message;
    document.getElementById('alert-modal').style.display = 'flex';
}

window.handleRosterDragOver = function(e) {
    e.preventDefault();
    const item = e.currentTarget;
    item.classList.add('drag-over-roster');
};

window.handleRosterDragLeave = function(e) {
    const item = e.currentTarget;
    item.classList.remove('drag-over-roster');
};

window.handleRosterDrop = function(e, targetIndex) {
    e.preventDefault();
    const item = e.currentTarget;
    item.classList.remove('drag-over-roster');
    
    if (draggedRosterIndex !== null && draggedRosterIndex !== undefined && draggedRosterIndex !== targetIndex) {
        // Reorder state.drivers
        const driver = state.drivers[draggedRosterIndex];
        state.drivers.splice(draggedRosterIndex, 1);
        state.drivers.splice(targetIndex, 0, driver);
        
        renderDrivers();
        renderDriverSelect();
        if (state.drivers.length > 0) {
            if (state.isScheduleManuallyEdited) {
                recalculateStatsAndRender();
            } else {
                generateSchedule();
            }
        }
    }
};

window.handleDriverCellClick = function(event, stintIndex) {
    const cell = event.currentTarget;
    if (cell.querySelector('select')) return;
    
    event.stopPropagation();
    
    const stint = state.schedule[stintIndex];
    if (!stint) return;
    
    // Create inline dropdown select
    const select = document.createElement('select');
    select.className = 'inline-driver-select';
    select.style.width = '100%';
    select.style.background = 'var(--bg-card)';
    select.style.color = 'var(--text-primary)';
    select.style.border = '1px solid var(--border-color)';
    select.style.borderRadius = 'var(--radius-sm)';
    select.style.padding = '0.2rem';
    
    // Default option
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = '-- Unassigned --';
    if (!stint.driver) optNone.selected = true;
    select.appendChild(optNone);
    
    state.drivers.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        if (stint.driver && stint.driver.id === d.id) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
    
    cell.innerHTML = '';
    cell.appendChild(select);
    select.focus();
    
    // Listeners
    select.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
            stint.driver = null;
            state.isScheduleManuallyEdited = true;
            recalculateStatsAndRender();
        } else {
            const driverId = parseInt(val);
            const driver = state.drivers.find(d => d.id === driverId);
            if (driver) {
                if (!isDriverAvailable(driver.id, stint.startTime, stint.endTime)) {
                    showAlert(`${driver.name} is unavailable during Stint ${stint.stintNumber}!`);
                    recalculateStatsAndRender();
                    return;
                }
                stint.driver = driver;
                state.isScheduleManuallyEdited = true;
                recalculateStatsAndRender();
            }
        }
    });
    
    select.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.body.contains(select)) {
                recalculateStatsAndRender();
            }
        }, 150);
    });
    
    select.addEventListener('click', (e) => {
        e.stopPropagation();
    });
};

window.handleStartTimeClick = function(event, stintIndex) {
    const cell = event.currentTarget;
    if (cell.querySelector('input')) return;
    
    event.stopPropagation();
    
    const stint = state.schedule[stintIndex];
    if (!stint) return;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'inline-time-input';
    input.style.background = 'var(--bg-card)';
    input.style.color = 'var(--text-primary)';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = 'var(--radius-sm)';
    input.style.padding = '0.2rem';
    input.style.fontSize = '0.8rem';
    
    // Set current value in local datetime format
    const tzOffset = stint.startTime.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(stint.startTime - tzOffset)).toISOString().slice(0, 16);
    input.value = localISOTime;
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    
    // Change listener
    input.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
            recalculateStatsAndRender();
            return;
        }
        
        const newStart = new Date(val);
        if (isNaN(newStart.getTime())) {
            recalculateStatsAndRender();
            return;
        }
        
        shiftScheduleTimes(stintIndex, newStart);
    });
    
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.body.contains(input)) {
                recalculateStatsAndRender();
            }
        }, 150);
    });
    
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
};

function shiftScheduleTimes(startIndex, newStartTime) {
    const stint = state.schedule[startIndex];
    if (!stint) return;
    
    const timeDelta = newStartTime.getTime() - stint.startTime.getTime();
    if (timeDelta === 0) {
        recalculateStatsAndRender();
        return;
    }
    
    let conflicts = [];

    // Adjust previous stint's end time to match overridden stint start time
    if (startIndex > 0) {
        const prevStint = state.schedule[startIndex - 1];
        if (prevStint) {
            prevStint.endTime = new Date(newStartTime.getTime());
            if (prevStint.driver && !isDriverAvailable(prevStint.driver.id, prevStint.startTime, prevStint.endTime)) {
                conflicts.push(`Stint ${prevStint.stintNumber} (${prevStint.driver.name})`);
                prevStint.driver = null;
            }
        }
    }
    
    // Shift this stint
    const duration = stint.endTime.getTime() - stint.startTime.getTime();
    stint.startTime = newStartTime;
    stint.endTime = new Date(newStartTime.getTime() + duration);
    
    // Check conflict for this stint
    if (stint.driver && !isDriverAvailable(stint.driver.id, stint.startTime, stint.endTime)) {
        conflicts.push(`Stint ${stint.stintNumber} (${stint.driver.name})`);
        stint.driver = null;
    }
    
    // Shift all subsequent stints
    const pitStopTimeMs = parseFloat(pitStopTimeEl.value) * 1000;
    
    for (let i = startIndex + 1; i < state.schedule.length; i++) {
        const currentStint = state.schedule[i];
        const prevStint = state.schedule[i - 1];
        
        const stintDuration = currentStint.endTime.getTime() - currentStint.startTime.getTime();
        
        currentStint.startTime = new Date(prevStint.endTime.getTime() + pitStopTimeMs);
        currentStint.endTime = new Date(currentStint.startTime.getTime() + stintDuration);
        
        if (currentStint.driver && !isDriverAvailable(currentStint.driver.id, currentStint.startTime, currentStint.endTime)) {
            conflicts.push(`Stint ${currentStint.stintNumber} (${currentStint.driver.name})`);
            currentStint.driver = null;
        }
    }
    
    state.isScheduleManuallyEdited = true;
    recalculateStatsAndRender();
    
    if (conflicts.length > 0) {
        showAlert(`The following stints had driver availability conflicts due to the time shift and were set to UNASSIGNED:<br><br>${conflicts.join('<br>')}`);
    }
}

function handleDeleteLastStint() {
    if (state.schedule.length === 0) return;
    state.schedule.pop();
    state.isScheduleManuallyEdited = true;
    recalculateStatsAndRender();
}

// URL Hash Deep Linking & Sharing
function encodeStateToURL() {
    try {
        const jsonStr = getJSONConfig();
        const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
        history.replaceState(null, '', '#' + base64);
    } catch (e) {
        console.error('Failed to sync URL state', e);
    }
}

function decodeStateFromURL() {
    try {
        const hash = location.hash.replace(/^#/, '').trim();
        if (!hash) return false;
        const rawBase64 = hash.startsWith('config=') ? hash.slice(7) : hash;
        if (!rawBase64) return false;
        
        const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(rawBase64), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return importJSONConfig(jsonStr, false);
    } catch (e) {
        console.error('Failed to decode URL config', e);
        return false;
    }
}

function copyShareLink() {
    encodeStateToURL();
    const shareLinkBtnEl = document.getElementById('share-link-btn');
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            if (shareLinkBtnEl) {
                const originalText = shareLinkBtnEl.innerHTML;
                shareLinkBtnEl.innerHTML = '<i class="fa-solid fa-check"></i> Copied Link!';
                setTimeout(() => {
                    shareLinkBtnEl.innerHTML = originalText;
                }, 2000);
            }
        })
        .catch(err => alert('Failed to copy link: ' + err));
}

// Initialize App
init();
