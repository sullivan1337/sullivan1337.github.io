document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        speakers: [],
        zones: []
    };
    let nextSpeakerId = 1;
    let nextZoneId = 1;

    // --- DRAG STATE ---
    let dragState = {
        isDragging: false,
        element: null,
        speakerId: null,
        originalZoneId: null,
        offsetX: 0,
        offsetY: 0
    };

    // --- DOM ELEMENT REFERENCES ---
    const impedanceInput = document.getElementById('speaker-impedance');
    const powerInput = document.getElementById('speaker-power');
    const addSpeakerBtn = document.getElementById('add-speaker-btn');
    const addZoneBtn = document.getElementById('add-zone-btn');

    const unassignedSpeakerHolder = document.getElementById('unassigned-speaker-holder');
    const zonesArea = document.getElementById('zones-area');
    
    // Power Matching Card
    const powerMatchingCard = document.getElementById('power-matching-card');
    const pmZoneName = document.getElementById('power-match-zone-name');
    const pmImpedance = document.getElementById('power-match-impedance');
    const ampPowerInput = document.getElementById('amp-power');
    const estimatedPowerDelivered = document.getElementById('estimated-power-delivered');
    const recommendedSpeakerPower = document.getElementById('recommended-speaker-power');


    // --- RENDER FUNCTIONS ---
    function render() {
        // Clear existing elements
        unassignedSpeakerHolder.innerHTML = '';
        zonesArea.innerHTML = '';

        // Render unassigned speakers
        const unassignedSpeakers = state.speakers.filter(s => s.zoneId === null);
        if (unassignedSpeakers.length === 0 && state.speakers.length > 0) {
            unassignedSpeakerHolder.innerHTML = `<p class="placeholder-text">All speakers are in zones.</p>`;
        } else if (unassignedSpeakers.length === 0) {
             unassignedSpeakerHolder.innerHTML = `<p class="placeholder-text">Add speakers using the panel on the left.</p>`;
        }
        
        unassignedSpeakers.forEach(speaker => {
            unassignedSpeakerHolder.appendChild(createSpeakerElement(speaker));
        });

        // Render zones and their assigned speakers
        state.zones.forEach(zone => {
            zonesArea.appendChild(createZoneElement(zone));
            // Redraw wiring for this zone if results are present
            if(zone.results && zone.results.mode) {
                renderWiring(zone.id, zone.results.mode);
            }
        });
    }

    function createSpeakerElement(speaker) {
        const el = document.createElement('div');
        el.className = 'speaker';
        el.dataset.speakerId = speaker.id;
        el.innerHTML = `
            <button class="speaker-remove-btn" title="Remove Speaker">&times;</button>
            <div class="speaker-id">SPK ${speaker.id}</div>
            <div>${speaker.impedance}&Omega; / ${speaker.power}W</div>
        `;
        return el;
    }

    function createZoneElement(zone) {
        const zoneEl = document.createElement('div');
        zoneEl.className = 'amp-zone';
        zoneEl.dataset.zoneId = zone.id;
        
        const resultsHTML = zone.results ? `
            <div class="result-item">
                <span>${zone.results.mode} Load:</span>
                <strong>${zone.results.impedance.toFixed(2)} &Omega;</strong>
            </div>
            <div class="result-item">
                <span>Power Handling:</span>
                <strong>${zone.results.power.toFixed(0)} W</span>
            </div>
        ` : '<p class="placeholder-text">Calculate a load for this zone.</p>';

        zoneEl.innerHTML = `
            <div class="zone-header">
                <span class="zone-title">Amplifier Zone ${zone.id}</span>
                <button class="zone-remove-btn" title="Remove Zone">&times;</button>
            </div>
            <div class="zone-workspace">
                <div class="speaker-holder"></div>
                <svg class="zone-wiring-svg"></svg>
            </div>
            <div class="zone-results">${resultsHTML}</div>
            <div class="zone-controls">
                <button class="btn series" data-mode="Series">Calculate Series</button>
                <button class="btn parallel" data-mode="Parallel">Calculate Parallel</button>
            </div>
        `;
        
        const speakerHolder = zoneEl.querySelector('.speaker-holder');
        const speakersInZone = state.speakers.filter(s => s.zoneId === zone.id);
        if (speakersInZone.length === 0) {
             speakerHolder.innerHTML = `<p class="placeholder-text">Drag speakers here</p>`;
        }
        speakersInZone.forEach(speaker => {
            speakerHolder.appendChild(createSpeakerElement(speaker));
        });
        return zoneEl;
    }


    // --- STATE MUTATION ---
    function addSpeaker() {
        const impedance = parseFloat(impedanceInput.value);
        const power = parseFloat(powerInput.value);
        if (isNaN(impedance) || isNaN(power) || impedance <= 0 || power <= 0) return;

        state.speakers.push({
            id: nextSpeakerId++,
            impedance,
            power,
            zoneId: null, // Initially unassigned
        });
        render();
    }
    
    function removeSpeaker(speakerId) {
        state.speakers = state.speakers.filter(s => s.id !== speakerId);
        // Clear results for any zone that contained this speaker
        state.zones.forEach(z => {
           if(z.speakersInZone && z.speakersInZone.includes(speakerId)) {
               z.results = null;
           }
        });
        resetPowerMatchingCard();
        render();
    }

    function addZone() {
        state.zones.push({
            id: nextZoneId++,
            results: null
        });
        render();
    }

    function removeZone(zoneId) {
        // Un-assign speakers that were in this zone
        state.speakers.forEach(s => {
            if (s.zoneId === zoneId) s.zoneId = null;
        });
        state.zones = state.zones.filter(z => z.id !== zoneId);
        resetPowerMatchingCard();
        render();
    }

    function assignSpeakerToZone(speakerId, zoneId) {
        const speaker = state.speakers.find(s => s.id === speakerId);
        if (speaker) {
            speaker.zoneId = zoneId;
        }
        // When a speaker is moved, invalidate the results of its old and new zones
        state.zones.forEach(z => z.results = null);
        resetPowerMatchingCard();
        render();
    }

    // --- CALCULATION LOGIC ---
    function calculateForZone(zoneId, mode) {
        const zone = state.zones.find(z => z.id === zoneId);
        const speakersInZone = state.speakers.filter(s => s.zoneId === zoneId);
        if (!zone || speakersInZone.length === 0) return;
        
        let totalImpedance = 0;
        let totalPower = 0;

        if (mode === 'Series' && speakersInZone.length > 0) {
            totalImpedance = speakersInZone.reduce((acc, s) => acc + s.impedance, 0);
            totalPower = speakersInZone.reduce((acc, s) => acc + s.power, 0);
        } else if (mode === 'Parallel' && speakersInZone.length > 0) {
            totalImpedance = 1 / speakersInZone.reduce((acc, s) => acc + (1 / s.impedance), 0);
            totalPower = speakersInZone.reduce((acc, s) => acc + s.power, 0);
        } else {
            return; // Not enough speakers for this mode
        }

        zone.results = { mode, impedance: totalImpedance, power: totalPower };
        
        // Update and show power matching card
        pmZoneName.textContent = `Zone ${zone.id}`;
        pmImpedance.textContent = `${totalImpedance.toFixed(2)} Ω`;
        ampPowerInput.value = ''; // Clear previous input
        updatePowerDelivery(); // Update calculations with empty input
        powerMatchingCard.classList.remove('hidden');

        render();
    }

    function resetPowerMatchingCard() {
        powerMatchingCard.classList.add('hidden');
        ampPowerInput.value = '';
        estimatedPowerDelivered.textContent = '- W';
        recommendedSpeakerPower.textContent = '- W';
    }
    
    function updatePowerDelivery() {
        const activeZoneIdText = pmZoneName.textContent;
        if (!activeZoneIdText.startsWith('Zone ')) return;
        
        const activeZoneId = parseInt(activeZoneIdText.replace('Zone ', ''), 10);
        const activeZone = state.zones.find(z => z.id === activeZoneId);
        if (!activeZone || !activeZone.results) return;

        const ampPowerAt8Ohms = parseFloat(ampPowerInput.value);
        if(isNaN(ampPowerAt8Ohms) || ampPowerAt8Ohms <= 0) {
            estimatedPowerDelivered.textContent = '- W';
            recommendedSpeakerPower.textContent = '- W';
            return;
        }

        const actualImpedance = activeZone.results.impedance;
        const referenceImpedance = 8.0;
        const actualPower = ampPowerAt8Ohms * (referenceImpedance / actualImpedance);

        estimatedPowerDelivered.textContent = `${actualPower.toFixed(0)} W`;
        recommendedSpeakerPower.textContent = `${(actualPower * 1.5).toFixed(0)} W`;
    }
    
    ampPowerInput.addEventListener('input', updatePowerDelivery);


    // --- WIRING DIAGRAM LOGIC ---
    function renderWiring(zoneId, mode) {
        const zoneEl = document.querySelector(`.amp-zone[data-zone-id="${zoneId}"]`);
        if (!zoneEl) return;
        const svg = zoneEl.querySelector('.zone-wiring-svg');
        const speakerHolder = zoneEl.querySelector('.speaker-holder');
        svg.innerHTML = '';
        
        const speakersInZone = Array.from(speakerHolder.querySelectorAll('.speaker'));
        if (speakersInZone.length === 0) return;

        // Create a virtual amp for positioning
        const amp = { x: zoneEl.offsetWidth / 2, y: speakerHolder.offsetTop + speakerHolder.offsetHeight + 60 };

        const spkCoords = speakersInZone.map(el => ({
            x: el.offsetLeft + el.offsetWidth / 2,
            y: el.offsetTop + el.offsetHeight,
            posOffsetX: -el.offsetWidth / 4,
            negOffsetX: el.offsetWidth / 4
        }));

        const POS_COLOR = 'var(--positive-wire)';
        const NEG_COLOR = 'var(--negative-wire)';

        if (mode === 'Series') {
            // Amp to first speaker
            drawLine(svg, `M ${amp.x - 10},${amp.y} V ${spkCoords[0].y + 10} H ${spkCoords[0].x + spkCoords[0].posOffsetX}`, POS_COLOR);
            // Daisy-chain speakers
            for (let i = 0; i < spkCoords.length - 1; i++) {
                drawLine(svg, `M ${spkCoords[i].x + spkCoords[i].negOffsetX},${spkCoords[i].y} H ${spkCoords[i+1].x + spkCoords[i+1].posOffsetX}`, NEG_COLOR);
            }
            // Last speaker to amp
            const lastSpk = spkCoords[spkCoords.length - 1];
            drawLine(svg, `M ${lastSpk.x + lastSpk.negOffsetX},${lastSpk.y} V ${lastSpk.y + 10} H ${amp.x + 10} V ${amp.y}`, NEG_COLOR);

        } else if (mode === 'Parallel') {
             const firstSpk = spkCoords[0];
             const lastSpk = spkCoords[spkCoords.length - 1];
             const posBusY = amp.y - 30;
             const negBusY = amp.y - 10;
             
             // Amp to bus lines
             drawLine(svg, `M ${amp.x - 10},${amp.y} V ${posBusY} H ${firstSpk.x + firstSpk.posOffsetX}`, POS_COLOR);
             drawLine(svg, `M ${amp.x + 10},${amp.y} V ${negBusY} H ${firstSpk.x + firstSpk.negOffsetX}`, NEG_COLOR);

             // Horizontal bus lines
             if (spkCoords.length > 1) {
                 drawLine(svg, `M ${firstSpk.x + firstSpk.posOffsetX},${posBusY} H ${lastSpk.x + lastSpk.posOffsetX}`, POS_COLOR);
                 drawLine(svg, `M ${firstSpk.x + firstSpk.negOffsetX},${negBusY} H ${lastSpk.x + lastSpk.negOffsetX}`, NEG_COLOR);
             }

             // Speakers to bus lines
             spkCoords.forEach(c => {
                 drawLine(svg, `M ${c.x + c.posOffsetX},${c.y} V ${posBusY}`, POS_COLOR);
                 drawLine(svg, `M ${c.x + c.negOffsetX},${c.y} V ${negBusY}`, NEG_COLOR);
             });
        }
    }
    
    function drawLine(svg, path, color) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('fill', 'none');
        svg.appendChild(line);
    }


    // --- DRAG AND DROP HANDLERS ---
    function onMouseDown(e) {
        if (!e.target.closest('.speaker')) return;
        e.preventDefault();

        dragState.element = e.target.closest('.speaker');
        dragState.speakerId = parseInt(dragState.element.dataset.speakerId);
        
        const speaker = state.speakers.find(s => s.id === dragState.speakerId);
        dragState.originalZoneId = speaker.zoneId;

        const rect = dragState.element.getBoundingClientRect();
        dragState.offsetX = e.clientX - rect.left;
        dragState.offsetY = e.clientY - rect.top;
        
        dragState.element.classList.add('dragging');
        document.body.appendChild(dragState.element); // Move to body for absolute positioning
        
        dragState.element.style.left = `${e.clientX - dragState.offsetX}px`;
        dragState.element.style.top = `${e.clientY - dragState.offsetY}px`;
        
        dragState.isDragging = true;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    }

    function onMouseMove(e) {
        if (!dragState.isDragging) return;
        dragState.element.style.left = `${e.clientX - dragState.offsetX}px`;
        dragState.element.style.top = `${e.clientY - dragState.offsetY}px`;
        
        // Highlight drop target
        document.querySelectorAll('.amp-zone, .unassigned-speakers-container').forEach(el => el.classList.remove('drag-over'));
        const dropTarget = getDropTarget(e);
        if (dropTarget) {
            dropTarget.classList.add('drag-over');
        }
    }

    function onMouseUp(e) {
        if (!dragState.isDragging) return;
        
        // Cleanup visuals BEFORE changing state and re-rendering
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        const dropTarget = getDropTarget(e);
        let newZoneId = dragState.originalZoneId;

        if (dropTarget) {
            if(dropTarget.classList.contains('unassigned-speakers-container')) {
                newZoneId = null;
            } else {
                newZoneId = parseInt(dropTarget.dataset.zoneId);
            }
        }
        
        // The dragging class is on the cloned element that we will remove.
        // The state change will re-render the original element in its new home without the class.
        assignSpeakerToZone(dragState.speakerId, newZoneId); 
        
        // Final cleanup of drag state object
        dragState.isDragging = false;
        if (dragState.element && dragState.element.parentElement === document.body) {
             document.body.removeChild(dragState.element);
        }
        dragState.element = null;
        document.removeEventListener('mousemove', onMouseMove);
    }

    function getDropTarget(e) {
        // Hide the dragged element to check what's underneath
        dragState.element.style.display = 'none';
        const elementUnderneath = document.elementFromPoint(e.clientX, e.clientY);
        dragState.element.style.display = ''; // Show it again
        
        return elementUnderneath ? elementUnderneath.closest('.amp-zone, .unassigned-speakers-container') : null;
    }


    // --- GLOBAL EVENT LISTENERS ---
    addSpeakerBtn.addEventListener('click', addSpeaker);
    addZoneBtn.addEventListener('click', addZone);
    document.addEventListener('mousedown', onMouseDown);

    // Event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
        // Remove Speaker
        const removeSpeakerBtn = e.target.closest('.speaker-remove-btn');
        if(removeSpeakerBtn) {
            const speakerId = parseInt(removeSpeakerBtn.parentElement.dataset.speakerId);
            removeSpeaker(speakerId);
            return;
        }

        // Remove Zone
        const removeZoneBtn = e.target.closest('.zone-remove-btn');
        if(removeZoneBtn) {
            const zoneId = parseInt(removeZoneBtn.closest('.amp-zone').dataset.zoneId);
            removeZone(zoneId);
            return;
        }
        
        // Calculate Buttons
        const calcBtn = e.target.closest('.zone-controls .btn');
        if(calcBtn) {
            const zoneId = parseInt(calcBtn.closest('.amp-zone').dataset.zoneId);
            const mode = calcBtn.dataset.mode;
            calculateForZone(zoneId, mode);
            return;
        }
    });

    // --- INITIALIZATION ---
    render();
});