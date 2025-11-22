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
    
    // Legacy power matching card elements (for backward compatibility)
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
        
        const speakersInZone = state.speakers.filter(s => s.zoneId === zone.id);
        
        // Create amp channel section
        const ampChannelHTML = `
            <div class="amp-channel-section">
                <h4>Amplifier Channel</h4>
                <div class="amp-power-input-group">
                    <label for="zone-${zone.id}-amp-power">Power @ 8Ω (W RMS)</label>
                    <input type="number" id="zone-${zone.id}-amp-power" class="zone-amp-power-input" placeholder="e.g., 100" min="1">
                </div>
                <div class="amp-power-results" id="zone-${zone.id}-power-results">
                    <div class="power-result-item">
                        <span>Power Delivered:</span>
                        <strong id="zone-${zone.id}-delivered-power">- W</strong>
                    </div>
                    <div class="power-result-item">
                        <span>Recommended:</span>
                        <strong id="zone-${zone.id}-recommended-power">- W</strong>
                    </div>
                </div>
            </div>
        `;
        
        const resultsHTML = zone.results ? `
            <div class="load-results">
                <div class="result-item">
                    <span>${zone.results.mode} Load:</span>
                    <strong>${zone.results.impedance.toFixed(2)} &Omega;</strong>
                </div>
                <div class="result-item">
                    <span>Power Handling:</span>
                    <strong>${zone.results.power.toFixed(0)} W</strong>
                </div>
                ${zone.results.warnings && zone.results.warnings.length > 0 ? `
                    <div class="zone-warnings">
                        ${zone.results.warnings.map(warning => `<div class="zone-warning">${warning}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        ` : '<p class="placeholder-text">Calculate a load for this zone.</p>';

        zoneEl.innerHTML = `
            <div class="zone-header">
                <span class="zone-title">Amplifier Zone ${zone.id}</span>
                <button class="zone-remove-btn" title="Remove Zone">&times;</button>
            </div>
            
            <div class="zone-content">
                <div class="zone-workspace">
                    <div class="speaker-drop-area">
                        <div class="speaker-holder"></div>
                        <svg class="zone-wiring-svg"></svg>
                    </div>
                    <div class="zone-info">
                        ${resultsHTML}
                        ${ampChannelHTML}
                    </div>
                </div>
                
                <div class="zone-controls">
                    <button class="btn series" data-mode="Series">Calculate Series</button>
                    <button class="btn parallel" data-mode="Parallel">Calculate Parallel</button>
                </div>
            </div>
        `;
        
        const speakerHolder = zoneEl.querySelector('.speaker-holder');
        if (speakersInZone.length === 0) {
             speakerHolder.innerHTML = `<p class="placeholder-text">Drag speakers here</p>`;
        }
        speakersInZone.forEach(speaker => {
            speakerHolder.appendChild(createSpeakerElement(speaker));
        });
        
        // Set up amp power input event listener
        const ampPowerInput = zoneEl.querySelector('.zone-amp-power-input');
        if (ampPowerInput) {
            ampPowerInput.addEventListener('input', (e) => {
                updateZonePowerDelivery(zone.id);
            });
        }
        
        return zoneEl;
    }


    // --- STATE MUTATION ---
    function addSpeaker() {
        const impedance = parseFloat(impedanceInput.value);
        const power = parseFloat(powerInput.value);
        
        // Enhanced validation with user feedback
        if (isNaN(impedance) || isNaN(power)) {
            showMessage('Please enter valid numbers for impedance and power', 'error');
            return;
        }
        
        if (impedance <= 0 || power <= 0) {
            showMessage('Impedance and power must be greater than 0', 'error');
            return;
        }
        
        if (impedance < 1 || impedance > 32) {
            showMessage('Warning: Impedance outside typical range (1-32Ω). Verify this is correct.', 'warning');
        }
        
        if (power > 1000) {
            showMessage('Warning: Very high power rating. Verify this is correct.', 'warning');
        }

        state.speakers.push({
            id: nextSpeakerId++,
            impedance,
            power,
            zoneId: null, // Initially unassigned
        });
        render();
        showMessage(`Speaker added: ${impedance}Ω, ${power}W RMS`, 'success');
    }
    
    function showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // Style based on type
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        switch(type) {
            case 'error':
                messageEl.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ffc107';
                messageEl.style.color = '#000';
                break;
            case 'success':
                messageEl.style.backgroundColor = '#28a745';
                break;
            default:
                messageEl.style.backgroundColor = '#17a2b8';
        }
        
        document.body.appendChild(messageEl);
        
        // Animate in
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 4000);
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

        // Add validation warnings
        const warnings = [];
        if (totalImpedance < 2) {
            warnings.push('⚠️ Critical: Load below 2Ω may damage most amplifiers');
        } else if (totalImpedance < 4) {
            warnings.push('⚠️ Caution: Load below 4Ω - verify amplifier compatibility');
        } else if (totalImpedance > 16) {
            warnings.push('ℹ️ High impedance load - amplifier may deliver reduced power');
        }

        // Preserve existing amp power input value when recalculating
        // Amp power is always rated at 8Ω, so it should persist between series/parallel modes
        let existingAmpPower = null;
        
        // First check if there's a current input value in the DOM
        const zoneAmpInput = document.getElementById(`zone-${zoneId}-amp-power`);
        if (zoneAmpInput && zoneAmpInput.value) {
            existingAmpPower = parseFloat(zoneAmpInput.value);
        }
        // Fall back to saved value in zone results
        else if (zone.results && zone.results.ampPower) {
            existingAmpPower = zone.results.ampPower;
        }

        zone.results = { 
            mode, 
            impedance: totalImpedance, 
            power: totalPower,
            warnings: warnings,
            ampPower: existingAmpPower // Preserve amp power setting
        };
        
        // Update the zone's amp power input if we have a saved value
        if (existingAmpPower && zoneAmpInput) {
            zoneAmpInput.value = existingAmpPower;
            // Trigger power calculation update
            updateZonePowerDelivery(zoneId);
        }
        
        // Legacy power matching card update (if elements exist)
        if (pmZoneName && pmImpedance) {
            pmZoneName.textContent = `Zone ${zone.id}`;
            pmImpedance.textContent = `${totalImpedance.toFixed(2)} Ω`;
        }
        if (ampPowerInput && existingAmpPower) {
            ampPowerInput.value = existingAmpPower; // Preserve existing value
        }
        if (powerMatchingCard) {
            powerMatchingCard.classList.remove('hidden');
        }

        render();
    }

    function resetPowerMatchingCard() {
        if (powerMatchingCard) {
            powerMatchingCard.classList.add('hidden');
        }
        if (ampPowerInput) {
            ampPowerInput.value = '';
        }
        if (estimatedPowerDelivered) {
            estimatedPowerDelivered.textContent = '- W';
        }
        if (recommendedSpeakerPower) {
            recommendedSpeakerPower.textContent = '- W';
        }
    }
    
    function updateZonePowerDelivery(zoneId) {
        const zone = state.zones.find(z => z.id === zoneId);
        if (!zone || !zone.results) return;

        const ampPowerInput = document.getElementById(`zone-${zoneId}-amp-power`);
        const deliveredPowerEl = document.getElementById(`zone-${zoneId}-delivered-power`);
        const recommendedPowerEl = document.getElementById(`zone-${zoneId}-recommended-power`);
        
        if (!ampPowerInput || !deliveredPowerEl || !recommendedPowerEl) return;

        const ampPowerAt8Ohms = parseFloat(ampPowerInput.value);
        if(isNaN(ampPowerAt8Ohms) || ampPowerAt8Ohms <= 0) {
            deliveredPowerEl.textContent = '- W';
            recommendedPowerEl.textContent = '- W';
            // Save null to indicate no valid power value
            if (zone.results) {
                zone.results.ampPower = null;
            }
            return;
        }

        // Save the amp power value to preserve it when recalculating
        if (zone.results) {
            zone.results.ampPower = ampPowerAt8Ohms;
        }

        const actualImpedance = zone.results.impedance;
        
        // More realistic power calculation considering amplifier behavior
        const referenceImpedance = 8.0;
        let actualPower;
        
        if (actualImpedance >= referenceImpedance) {
            // Higher impedance = less power (voltage limited)
            actualPower = ampPowerAt8Ohms * (referenceImpedance / actualImpedance);
        } else {
            // Lower impedance - most amps can't deliver full power into very low loads
            const powerReduction = Math.max(0.3, actualImpedance / referenceImpedance);
            actualPower = ampPowerAt8Ohms * powerReduction;
        }

        deliveredPowerEl.textContent = `${actualPower.toFixed(0)} W`;
        recommendedPowerEl.textContent = `${(actualPower * 1.5).toFixed(0)} W`;
        
        // Update safety warnings for this zone
        updateZoneSafetyWarnings(zoneId, actualImpedance);
    }
    
    function updateZoneSafetyWarnings(zoneId, impedance) {
        const warningsContainer = document.querySelector(`[data-zone-id="${zoneId}"] .zone-warnings`);
        if (!warningsContainer) return;
        
        // Clear existing warnings and add new ones
        warningsContainer.innerHTML = '';
        
        if (impedance < 2) {
            const warning = document.createElement('div');
            warning.className = 'zone-warning';
            warning.innerHTML = '⚠️ <strong>Critical:</strong> Load below 2Ω may damage amplifier';
            warningsContainer.appendChild(warning);
        } else if (impedance < 4) {
            const warning = document.createElement('div');
            warning.className = 'zone-warning';
            warning.innerHTML = '⚠️ <strong>Caution:</strong> Load below 4Ω - ensure amplifier supports this impedance';
            warningsContainer.appendChild(warning);
        } else if (impedance > 16) {
            const warning = document.createElement('div');
            warning.className = 'zone-warning';
            warning.innerHTML = 'ℹ️ <strong>Info:</strong> High impedance load - amplifier may deliver reduced power';
            warningsContainer.appendChild(warning);
        }
    }

    // Legacy function for the old power matching card (keeping for backward compatibility)
    function updatePowerDelivery() {
        if (!pmZoneName || !pmZoneName.textContent) return;
        
        const activeZoneIdText = pmZoneName.textContent;
        if (!activeZoneIdText.startsWith('Zone ')) return;
        
        const activeZoneId = parseInt(activeZoneIdText.replace('Zone ', ''), 10);
        updateZonePowerDelivery(activeZoneId);
        
        // Also update the old card if it exists
        const activeZone = state.zones.find(z => z.id === activeZoneId);
        if (!activeZone || !activeZone.results) return;

        const ampPowerAt8Ohms = ampPowerInput ? parseFloat(ampPowerInput.value) : 0;
        if(isNaN(ampPowerAt8Ohms) || ampPowerAt8Ohms <= 0) {
            if (estimatedPowerDelivered) estimatedPowerDelivered.textContent = '- W';
            if (recommendedSpeakerPower) recommendedSpeakerPower.textContent = '- W';
            return;
        }

        const actualImpedance = activeZone.results.impedance;
        const referenceImpedance = 8.0;
        let actualPower;
        
        if (actualImpedance >= referenceImpedance) {
            actualPower = ampPowerAt8Ohms * (referenceImpedance / actualImpedance);
        } else {
            const powerReduction = Math.max(0.3, actualImpedance / referenceImpedance);
            actualPower = ampPowerAt8Ohms * powerReduction;
        }

        if (estimatedPowerDelivered) estimatedPowerDelivered.textContent = `${actualPower.toFixed(0)} W`;
        if (recommendedSpeakerPower) recommendedSpeakerPower.textContent = `${(actualPower * 1.5).toFixed(0)} W`;
    }
    
    function updateSafetyWarnings(impedance) {
        const warningsContainer = document.getElementById('safety-warnings');
        if (!warningsContainer) return;
        
        warningsContainer.innerHTML = '';
        
        if (impedance < 2) {
            const warning = document.createElement('div');
            warning.className = 'safety-warning critical';
            warning.innerHTML = '⚠️ <strong>Critical:</strong> Load below 2Ω may damage amplifier';
            warningsContainer.appendChild(warning);
        } else if (impedance < 4) {
            const warning = document.createElement('div');
            warning.className = 'safety-warning caution';
            warning.innerHTML = '⚠️ <strong>Caution:</strong> Load below 4Ω - ensure amplifier supports this impedance';
            warningsContainer.appendChild(warning);
        }
    }
    
    if (ampPowerInput) {
        ampPowerInput.addEventListener('input', updatePowerDelivery);
    }


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
        const amp = { 
            x: zoneEl.offsetWidth / 2, 
            y: speakerHolder.offsetTop + speakerHolder.offsetHeight + 80,
            width: 60,
            height: 40
        };

        const spkCoords = speakersInZone.map(el => ({
            x: el.offsetLeft + el.offsetWidth / 2,
            y: el.offsetTop + el.offsetHeight,
            posOffsetX: -el.offsetWidth / 4,
            negOffsetX: el.offsetWidth / 4,
            width: el.offsetWidth,
            height: el.offsetHeight
        }));

        // Draw amplifier symbol
        drawAmpSymbol(svg, amp);

        if (mode === 'Series') {
            drawSeriesWiring(svg, amp, spkCoords);
        } else if (mode === 'Parallel') {
            drawParallelWiring(svg, amp, spkCoords);
        }
        
        // Add connection labels
        drawConnectionLabels(svg, mode, spkCoords.length);
    }
    
    function drawAmpSymbol(svg, amp) {
        // Amplifier rectangle
        const ampRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ampRect.setAttribute('x', amp.x - amp.width/2);
        ampRect.setAttribute('y', amp.y - amp.height/2);
        ampRect.setAttribute('width', amp.width);
        ampRect.setAttribute('height', amp.height);
        ampRect.setAttribute('fill', '#f0f0f0');
        ampRect.setAttribute('stroke', '#333');
        ampRect.setAttribute('stroke-width', '2');
        ampRect.setAttribute('rx', '4');
        svg.appendChild(ampRect);
        
        // Amp label
        const ampLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ampLabel.setAttribute('x', amp.x);
        ampLabel.setAttribute('y', amp.y + 5);
        ampLabel.setAttribute('text-anchor', 'middle');
        ampLabel.setAttribute('font-size', '12');
        ampLabel.setAttribute('font-weight', 'bold');
        ampLabel.setAttribute('fill', '#333');
        ampLabel.textContent = 'AMP';
        svg.appendChild(ampLabel);
        
        // Positive and negative terminals
        drawTerminal(svg, amp.x - amp.width/2 - 8, amp.y - 8, '+', '#d90429');
        drawTerminal(svg, amp.x - amp.width/2 - 8, amp.y + 8, '-', '#333');
    }
    
    function drawTerminal(svg, x, y, label, color) {
        const terminal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        terminal.setAttribute('cx', x);
        terminal.setAttribute('cy', y);
        terminal.setAttribute('r', '6');
        terminal.setAttribute('fill', color);
        terminal.setAttribute('stroke', '#fff');
        terminal.setAttribute('stroke-width', '1');
        svg.appendChild(terminal);
        
        const terminalLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        terminalLabel.setAttribute('x', x);
        terminalLabel.setAttribute('y', y + 4);
        terminalLabel.setAttribute('text-anchor', 'middle');
        terminalLabel.setAttribute('font-size', '10');
        terminalLabel.setAttribute('font-weight', 'bold');
        terminalLabel.setAttribute('fill', '#fff');
        terminalLabel.textContent = label;
        svg.appendChild(terminalLabel);
    }
    
    function drawSeriesWiring(svg, amp, spkCoords) {
        const POS_COLOR = '#d90429';
        const NEG_COLOR = '#333';
        
        // Calculate connection points more precisely
        const ampPosX = amp.x - amp.width/2 - 15;
        const ampNegX = amp.x - amp.width/2 - 15;
        
        if (spkCoords.length === 0) return;
        
        // Amp positive to first speaker positive
        const firstSpk = spkCoords[0];
        drawLine(svg, `M ${ampPosX},${amp.y - 8} V ${firstSpk.y + 15} H ${firstSpk.x + firstSpk.posOffsetX}`, POS_COLOR, 3);
        
        // Daisy-chain speakers (negative to positive)
        for (let i = 0; i < spkCoords.length - 1; i++) {
            const currentSpk = spkCoords[i];
            const nextSpk = spkCoords[i + 1];
            // Connect from current speaker negative terminal to next speaker positive terminal
            drawLine(svg, `M ${currentSpk.x + currentSpk.negOffsetX},${currentSpk.y} V ${currentSpk.y + 10} H ${nextSpk.x + nextSpk.posOffsetX} V ${nextSpk.y}`, NEG_COLOR, 3);
        }
        
        // Last speaker negative to amp negative
        const lastSpk = spkCoords[spkCoords.length - 1];
        drawLine(svg, `M ${lastSpk.x + lastSpk.negOffsetX},${lastSpk.y} V ${lastSpk.y + 15} H ${ampNegX} V ${amp.y + 8}`, NEG_COLOR, 3);
    }
    
    function drawParallelWiring(svg, amp, spkCoords) {
        const POS_COLOR = '#d90429';
        const NEG_COLOR = '#333';
        
        const firstSpk = spkCoords[0];
        const lastSpk = spkCoords[spkCoords.length - 1];
        const ampPosX = amp.x - amp.width/2 - 15;
        const ampNegX = amp.x - amp.width/2 - 15;
        const posBusY = amp.y - 50;
        const negBusY = amp.y - 30;
        
        // Amp to bus lines
        drawLine(svg, `M ${ampPosX},${amp.y - 8} V ${posBusY} H ${firstSpk.x + firstSpk.posOffsetX}`, POS_COLOR, 3);
        drawLine(svg, `M ${ampNegX},${amp.y + 8} V ${negBusY} H ${firstSpk.x + firstSpk.negOffsetX}`, NEG_COLOR, 3);

        // Horizontal bus lines
        if (spkCoords.length > 1) {
            drawLine(svg, `M ${firstSpk.x + firstSpk.posOffsetX},${posBusY} H ${lastSpk.x + lastSpk.posOffsetX}`, POS_COLOR, 3);
            drawLine(svg, `M ${firstSpk.x + firstSpk.negOffsetX},${negBusY} H ${lastSpk.x + lastSpk.negOffsetX}`, NEG_COLOR, 3);
        }

        // Speakers to bus lines
        spkCoords.forEach(c => {
            drawLine(svg, `M ${c.x + c.posOffsetX},${c.y} V ${posBusY}`, POS_COLOR, 2);
            drawLine(svg, `M ${c.x + c.negOffsetX},${c.y} V ${negBusY}`, NEG_COLOR, 2);
        });
    }
    
    function drawConnectionLabels(svg, mode, speakerCount) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', '10');
        label.setAttribute('y', '20');
        label.setAttribute('font-size', '12');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', mode === 'Series' ? '#2a9d8f' : '#e76f51');
        
        if (mode === 'Series') {
            label.textContent = `Series: ${speakerCount} speakers in chain`;
        } else {
            label.textContent = `Parallel: ${speakerCount} speakers on bus`;
        }
        svg.appendChild(label);
    }
    
    function drawLine(svg, path, color, width = 2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', path);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        line.setAttribute('opacity', '0.9');
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
        document.querySelectorAll('.amp-zone, .unassigned-speakers-container, .speaker-drop-area').forEach(el => el.classList.remove('drag-over'));
        const dropTarget = getDropTarget(e);
        if (dropTarget) {
            if (dropTarget.classList.contains('amp-zone')) {
                const dropArea = dropTarget.querySelector('.speaker-drop-area');
                if (dropArea) {
                    dropArea.classList.add('drag-over');
                } else {
                    dropTarget.classList.add('drag-over');
                }
            } else {
                dropTarget.classList.add('drag-over');
            }
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
        
        // Look for the speaker drop area specifically, or fall back to zone/unassigned container
        const dropArea = elementUnderneath ? elementUnderneath.closest('.speaker-drop-area') : null;
        if (dropArea) {
            return dropArea.closest('.amp-zone');
        }
        
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