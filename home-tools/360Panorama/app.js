/**
 * 360° Panorama Studio
 * A complete panorama tour creator built with Marzipano
 * https://www.marzipano.net/
 */

(function() {
    'use strict';

    // ============================================
    // Application State
    // ============================================
    
    const app = {
        viewer: null,
        scenes: [],           // Array of scene data objects
        marzipanoScenes: {},  // Map of scene id -> Marzipano scene
        currentSceneId: null,
        selectedHotspot: null,
        isAutorotating: false,
        autorotate: null,
        contextMenuPosition: null,
        idCounter: 0,
        
        settings: {
            mouseMode: 'drag',
            autorotateEnabled: false,
            autorotateSpeed: 0.03,
            autorotateDelay: 3000,
            showControls: true,
            showFullscreen: true
        }
    };

    // ============================================
    // DOM Elements Cache
    // ============================================
    
    const el = {};
    
    function cacheElements() {
        // Main containers
        el.pano = document.getElementById('pano');
        el.loadingOverlay = document.getElementById('loading-overlay');
        el.welcomeScreen = document.getElementById('welcome-screen');
        el.toolbar = document.getElementById('toolbar');
        el.sceneSidebar = document.getElementById('scene-sidebar');
        el.propertiesSidebar = document.getElementById('properties-sidebar');
        el.controlBar = document.getElementById('control-bar');
        
        // Welcome screen
        el.uploadZone = document.getElementById('upload-zone');
        el.fileInput = document.getElementById('file-input');
        el.loadDemoBtn = document.getElementById('load-demo');
        
        // Toolbar buttons
        el.btnAddPano = document.getElementById('btn-add-pano');
        el.addPanoInput = document.getElementById('add-pano-input');
        el.btnAddInfoHotspot = document.getElementById('btn-add-info-hotspot');
        el.btnAddLinkHotspot = document.getElementById('btn-add-link-hotspot');
        el.btnSetInitialView = document.getElementById('btn-set-initial-view');
        el.btnSettings = document.getElementById('btn-settings');
        el.btnImport = document.getElementById('btn-import');
        el.importInput = document.getElementById('import-input');
        el.btnImportWelcome = document.getElementById('btn-import-welcome');
        el.importInputWelcome = document.getElementById('import-input-welcome');
        el.btnExport = document.getElementById('btn-export');
        
        // Scene sidebar
        el.sceneList = document.getElementById('scene-list');
        el.sceneCount = document.getElementById('scene-count');
        el.sidebarToggle = document.getElementById('sidebar-toggle');
        el.sidebarClose = document.getElementById('sidebar-close');
        
        // Create sidebar backdrop for mobile
        el.sidebarBackdrop = document.createElement('div');
        el.sidebarBackdrop.className = 'sidebar-backdrop';
        document.body.appendChild(el.sidebarBackdrop);
        
        // Properties sidebar
        el.propertiesContent = document.getElementById('properties-content');
        el.btnCloseProperties = document.getElementById('btn-close-properties');
        
        // Control bar
        el.btnHome = document.getElementById('btn-home');
        el.btnAutorotate = document.getElementById('btn-autorotate');
        el.btnFullscreen = document.getElementById('btn-fullscreen');
        el.btnZoomIn = document.getElementById('btn-zoom-in');
        el.btnZoomOut = document.getElementById('btn-zoom-out');
        el.zoomSlider = document.getElementById('zoom-slider');
        
        // View info in sidebar
        el.sidebarInfoYaw = document.getElementById('sidebar-info-yaw');
        el.sidebarInfoPitch = document.getElementById('sidebar-info-pitch');
        el.sidebarInfoFov = document.getElementById('sidebar-info-fov');
        
        // Modals
        el.modalOverlay = document.getElementById('modal-overlay');
        el.hotspotModal = document.getElementById('hotspot-modal');
        el.modalTitle = document.getElementById('modal-title');
        el.infoHotspotForm = document.getElementById('info-hotspot-form');
        el.linkHotspotForm = document.getElementById('link-hotspot-form');
        el.hotspotTitle = document.getElementById('hotspot-title');
        el.hotspotText = document.getElementById('hotspot-text');
        el.hotspotTarget = document.getElementById('hotspot-target');
        el.linkHotspotTitle = document.getElementById('link-hotspot-title');
        el.hotspotYaw = document.getElementById('hotspot-yaw');
        el.hotspotPitch = document.getElementById('hotspot-pitch');
        el.hotspotRotation = document.getElementById('hotspot-rotation');
        el.rotationPicker = document.getElementById('rotation-picker');
        el.btnDeleteHotspot = document.getElementById('btn-delete-hotspot');
        el.btnSaveHotspot = document.getElementById('btn-save-hotspot');
        
        el.settingsModalOverlay = document.getElementById('settings-modal-overlay');
        el.mouseMode = document.getElementById('mouse-mode');
        el.autorotateEnabled = document.getElementById('autorotate-enabled');
        el.autorotateSpeed = document.getElementById('autorotate-speed');
        el.autorotateSpeedValue = document.getElementById('autorotate-speed-value');
        el.autorotateDelay = document.getElementById('autorotate-delay');
        el.showControls = document.getElementById('show-controls');
        el.showFullscreen = document.getElementById('show-fullscreen');
        
        el.exportModalOverlay = document.getElementById('export-modal-overlay');
        el.projectName = document.getElementById('project-name');
        el.exportProgress = document.getElementById('export-progress');
        el.exportProgressFill = document.getElementById('export-progress-fill');
        el.exportProgressText = document.getElementById('export-progress-text');
        el.btnDoExport = document.getElementById('btn-do-export');
        
        el.sceneModalOverlay = document.getElementById('scene-modal-overlay');
        el.sceneName = document.getElementById('scene-name');
        el.initialViewPreview = document.getElementById('initial-view-preview');
        el.btnUseCurrentView = document.getElementById('btn-use-current-view');
        el.thumbnailPreview = document.getElementById('thumbnail-preview');
        el.btnDeleteScene = document.getElementById('btn-delete-scene');
        el.btnSaveScene = document.getElementById('btn-save-scene');
        
        // Context menu
        el.contextMenu = document.getElementById('context-menu');
        
        // Toast container
        el.toastContainer = document.getElementById('toast-container');
    }

    // ============================================
    // Utilities
    // ============================================
    
    function generateId() {
        return 'id_' + (++app.idCounter) + '_' + Date.now().toString(36);
    }

    function radToDeg(rad) {
        return (rad * 180 / Math.PI).toFixed(1);
    }

    function degToRad(deg) {
        return parseFloat(deg) * Math.PI / 180;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        el.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    }

    function updateLoadingText(text) {
        const loadingText = el.loadingOverlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = text;
    }

    function showLoading(show = true) {
        if (show) {
            el.loadingOverlay.classList.remove('fade-out');
        } else {
            el.loadingOverlay.classList.add('fade-out');
        }
    }

    // ============================================
    // Viewer Initialization
    // ============================================
    
    function initViewer() {
        updateLoadingText('Initializing viewer...');
        
        app.viewer = new Marzipano.Viewer(el.pano, {
            controls: {
                mouseViewMode: app.settings.mouseMode
            },
            stage: {
                preserveDrawingBuffer: true
            }
        });

        // Create autorotate movement
        updateAutorotate();

        // Set up idle autorotate
        if (app.settings.autorotateEnabled) {
            app.viewer.setIdleMovement(app.settings.autorotateDelay, app.autorotate);
        }

        setTimeout(() => showLoading(false), 500);
    }

    function updateAutorotate() {
        app.autorotate = Marzipano.autorotate({
            yawSpeed: app.settings.autorotateSpeed,
            targetPitch: 0,
            targetFov: Math.PI / 2
        });
    }

    // ============================================
    // Scene Management
    // ============================================
    
    function createSceneData(imageUrl, name = null) {
        const id = generateId();
        return {
            id: id,
            name: name || `Scene ${app.scenes.length + 1}`,
            imageUrl: imageUrl,
            initialView: {
                yaw: 0,
                pitch: 0,
                fov: Math.PI / 2
            },
            hotspots: [],
            thumbnail: null
        };
    }

    async function createMarzipanoScene(sceneData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
                try {
                    const width = img.width;
                    const geometry = new Marzipano.EquirectGeometry([{ width: width }]);
                    const source = Marzipano.ImageUrlSource.fromString(sceneData.imageUrl);
                    
                    const limiter = Marzipano.RectilinearView.limit.traditional(
                        width,
                        degToRad(120)
                    );
                    
                    const view = new Marzipano.RectilinearView(sceneData.initialView, limiter);
                    
                    const scene = app.viewer.createScene({
                        source: source,
                        geometry: geometry,
                        view: view,
                        pinFirstLevel: true
                    });
                    
                    // Store reference
                    app.marzipanoScenes[sceneData.id] = scene;
                    
                    // Create thumbnail
                    createThumbnail(sceneData, img);
                    
                    // Set up view change listener
                    view.addEventListener('change', updateViewInfo);
                    
                    resolve(scene);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = sceneData.imageUrl;
        });
    }

    function createThumbnail(sceneData, img) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        
        // Calculate crop for thumbnail
        const srcAspect = img.width / img.height;
        const dstAspect = canvas.width / canvas.height;
        let sx, sy, sw, sh;
        
        if (srcAspect > dstAspect) {
            sh = img.height;
            sw = sh * dstAspect;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / dstAspect;
            sx = 0;
            sy = (img.height - sh) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        sceneData.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
    }

    async function addScene(imageUrl, name = null) {
        updateLoadingText('Processing panorama...');
        showLoading(true);
        
        try {
            const sceneData = createSceneData(imageUrl, name);
            await createMarzipanoScene(sceneData);
            
            app.scenes.push(sceneData);
            updateSceneList();
            
            // Switch to new scene
            switchToScene(sceneData.id);
            
            showUI();
            showLoading(false);
            showToast(`Added "${sceneData.name}"`, 'success');
            
            return sceneData;
        } catch (error) {
            showLoading(false);
            showToast('Failed to add panorama: ' + error.message, 'error');
            throw error;
        }
    }

    function switchToScene(sceneId, transitionDuration = 1000) {
        const sceneData = app.scenes.find(s => s.id === sceneId);
        if (!sceneData) return;
        
        const marzipanoScene = app.marzipanoScenes[sceneId];
        if (!marzipanoScene) return;
        
        // Clear any existing hotspot elements from previous scene
        clearHotspotElements();
        
        // Switch scene
        marzipanoScene.switchTo({ transitionDuration });
        
        // Set view to initial view
        const view = marzipanoScene.view();
        view.setParameters(sceneData.initialView);
        
        // Update current scene
        app.currentSceneId = sceneId;
        
        // Recreate hotspots for this scene
        sceneData.hotspots.forEach(hotspotData => {
            createHotspotElement(hotspotData, marzipanoScene);
        });
        
        // Update UI
        updateSceneList();
        updateViewInfo();
        
        // Stop autorotate when switching
        if (app.isAutorotating) {
            app.viewer.stopMovement();
            app.isAutorotating = false;
            el.btnAutorotate.classList.remove('active');
        }
    }

    function deleteScene(sceneId) {
        const index = app.scenes.findIndex(s => s.id === sceneId);
        if (index === -1) return;
        
        const sceneData = app.scenes[index];
        const marzipanoScene = app.marzipanoScenes[sceneId];
        
        // Destroy Marzipano scene
        if (marzipanoScene) {
            app.viewer.destroyScene(marzipanoScene);
            delete app.marzipanoScenes[sceneId];
        }
        
        // Remove from array
        app.scenes.splice(index, 1);
        
        // Update link hotspots that target this scene
        app.scenes.forEach(scene => {
            scene.hotspots.forEach(hotspot => {
                if (hotspot.type === 'link' && hotspot.target === sceneId) {
                    hotspot.target = null;
                }
            });
        });
        
        // Switch to another scene if available
        if (app.currentSceneId === sceneId) {
            if (app.scenes.length > 0) {
                switchToScene(app.scenes[0].id);
            } else {
                app.currentSceneId = null;
                hideUI();
            }
        }
        
        updateSceneList();
        showToast(`Deleted "${sceneData.name}"`);
    }

    function updateSceneList() {
        el.sceneList.innerHTML = '';
        el.sceneCount.textContent = app.scenes.length;
        
        app.scenes.forEach(scene => {
            const item = document.createElement('div');
            item.className = 'scene-item' + (scene.id === app.currentSceneId ? ' active' : '');
            item.dataset.sceneId = scene.id;
            
            const hotspotCount = scene.hotspots.length;
            
            item.innerHTML = `
                <div class="scene-thumb">
                    ${scene.thumbnail ? `<img src="${scene.thumbnail}" alt="">` : ''}
                </div>
                <div class="scene-info">
                    <div class="scene-name">${scene.name}</div>
                    <div class="scene-meta">${hotspotCount} hotspot${hotspotCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="scene-actions">
                    <button class="scene-action-btn edit-scene" title="Edit">✎</button>
                </div>
            `;
            
            // Click to switch scene
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.scene-actions')) {
                    switchToScene(scene.id);
                }
            });
            
            // Edit button
            item.querySelector('.edit-scene').addEventListener('click', (e) => {
                e.stopPropagation();
                openSceneModal(scene.id);
            });
            
            el.sceneList.appendChild(item);
        });
    }

    // ============================================
    // Hotspot Management
    // ============================================
    
    function createHotspotData(type, position, data = {}) {
        return {
            id: generateId(),
            type: type, // 'info' or 'link'
            position: { ...position },
            ...data
        };
    }

    // Arrow rotation values
    const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];
    
    function getNextRotation(current) {
        const index = ROTATIONS.indexOf(current);
        return ROTATIONS[(index + 1) % ROTATIONS.length];
    }

    function createHotspotElement(hotspotData, marzipanoScene) {
        const template = document.getElementById(
            hotspotData.type === 'info' ? 'info-hotspot-template' : 'link-hotspot-template'
        );
        
        const element = template.content.cloneNode(true).firstElementChild;
        element.dataset.hotspotId = hotspotData.id;
        
        const labelEl = element.querySelector('.hotspot-label');
        const tooltipEl = element.querySelector('.hotspot-tooltip');
        
        if (hotspotData.type === 'info') {
            const textEl = element.querySelector('.hotspot-tooltip-text');
            labelEl.textContent = hotspotData.title || 'Info';
            textEl.textContent = hotspotData.text || '';
            
            // Only show tooltip if there's description text
            if (hotspotData.text && hotspotData.text.trim()) {
                tooltipEl.classList.add('has-text');
            } else {
                tooltipEl.classList.remove('has-text');
            }
        } else {
            const targetScene = app.scenes.find(s => s.id === hotspotData.target);
            labelEl.textContent = hotspotData.label || (targetScene ? targetScene.name : 'Unlinked');
            
            // Apply arrow rotation
            const rotation = hotspotData.rotation || 0;
            const iconSvg = element.querySelector('.hotspot-icon svg');
            if (iconSvg) {
                iconSvg.style.transform = `rotate(${rotation}deg)`;
            }
        }
        
        // Get control buttons
        const editBtn = element.querySelector('.edit-btn');
        const deleteBtn = element.querySelector('.delete-btn');
        const rotateBtn = element.querySelector('.rotate-btn');
        const dragHandle = element.querySelector('.hotspot-drag-handle');
        const hotspotIcon = element.querySelector('.hotspot-icon');
        const controlsContainer = element.querySelector('.hotspot-controls');
        
        // Prevent any events from bubbling through the controls container
        controlsContainer.addEventListener('click', (e) => e.stopPropagation());
        controlsContainer.addEventListener('dblclick', (e) => e.stopPropagation());
        controlsContainer.addEventListener('mousedown', (e) => e.stopPropagation());
        
        // Edit button
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openHotspotModal(hotspotData);
        });
        
        // Delete button
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHotspot(hotspotData);
        });
        
        // Rotate button (link hotspots only)
        if (rotateBtn) {
            rotateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                rotateHotspotArrow(hotspotData);
            });
        }
        
        // Click on icon - for link hotspots, navigate; for info, show tooltip (handled by CSS)
        hotspotIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hotspotData.type === 'link' && hotspotData.target) {
                switchToScene(hotspotData.target);
            }
        });
        
        // Double-click on icon only to edit (not on controls)
        hotspotIcon.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openHotspotModal(hotspotData);
        });
        
        // Right-click to edit
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openHotspotModal(hotspotData);
        });
        
        // Drag handling
        setupHotspotDrag(element, hotspotData, marzipanoScene, dragHandle);
        
        // Inline label editing
        setupLabelEditing(labelEl, hotspotData);
        
        // Create Marzipano hotspot
        const hotspot = marzipanoScene.hotspotContainer().createHotspot(
            element,
            hotspotData.position
        );
        
        // Store reference
        hotspotData._element = element;
        hotspotData._marzipanoHotspot = hotspot;
        
        return element;
    }
    
    function rotateHotspotArrow(hotspotData) {
        if (hotspotData.type !== 'link') return;
        
        const currentRotation = hotspotData.rotation || 0;
        const newRotation = getNextRotation(currentRotation);
        hotspotData.rotation = newRotation;
        
        // Update visual
        if (hotspotData._element) {
            const iconSvg = hotspotData._element.querySelector('.hotspot-icon svg');
            if (iconSvg) {
                iconSvg.style.transform = `rotate(${newRotation}deg)`;
            }
        }
        
        updateSceneList();
    }
    
    function setupHotspotDrag(element, hotspotData, marzipanoScene, dragHandle) {
        let isDragging = false;
        let startX, startY;
        
        const startDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            element.classList.add('dragging');
            
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            
            // Disable viewer controls during drag
            app.viewer.controls().disable();
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', endDrag);
        };
        
        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            const rect = el.pano.getBoundingClientRect();
            
            // Calculate position relative to pano
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Convert screen position to view coordinates
            const view = marzipanoScene.view();
            const coords = view.screenToCoordinates({ x, y });
            
            if (coords) {
                hotspotData.position = {
                    yaw: coords.yaw,
                    pitch: coords.pitch
                };
                
                // Update hotspot position
                if (hotspotData._marzipanoHotspot) {
                    hotspotData._marzipanoHotspot.setPosition(hotspotData.position);
                }
            }
        };
        
        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            element.classList.remove('dragging');
            
            // Re-enable viewer controls
            app.viewer.controls().enable();
            
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', endDrag);
            
            showToast('Hotspot moved', 'success');
        };
        
        // Attach to drag handle
        dragHandle.addEventListener('mousedown', startDrag);
        dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    }
    
    function setupLabelEditing(labelEl, hotspotData) {
        labelEl.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Don't start editing if already editing
            if (labelEl.classList.contains('editing')) return;
            
            // Start inline editing
            labelEl.classList.add('editing');
            const currentText = labelEl.textContent;
            
            // Create input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'hotspot-label-input';
            input.value = currentText;
            
            labelEl.textContent = '';
            labelEl.appendChild(input);
            input.focus();
            input.select();
            
            const finishEditing = () => {
                const newValue = input.value.trim();
                labelEl.classList.remove('editing');
                
                if (hotspotData.type === 'info') {
                    hotspotData.title = newValue || 'Info';
                    labelEl.textContent = hotspotData.title;
                } else {
                    hotspotData.label = newValue;
                    const targetScene = app.scenes.find(s => s.id === hotspotData.target);
                    labelEl.textContent = newValue || (targetScene ? targetScene.name : 'Unlinked');
                }
                
                updateSceneList();
            };
            
            input.addEventListener('blur', finishEditing);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    input.value = currentText;
                    input.blur();
                }
            });
        });
    }

    function clearHotspotElements() {
        const currentScene = app.scenes.find(s => s.id === app.currentSceneId);
        if (!currentScene) return;
        
        currentScene.hotspots.forEach(hotspot => {
            if (hotspot._marzipanoHotspot) {
                const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
                if (marzipanoScene) {
                    marzipanoScene.hotspotContainer().destroyHotspot(hotspot._marzipanoHotspot);
                }
                hotspot._element = null;
                hotspot._marzipanoHotspot = null;
            }
        });
    }

    function addHotspot(type, position = null) {
        const currentScene = app.scenes.find(s => s.id === app.currentSceneId);
        if (!currentScene) {
            showToast('No scene selected', 'error');
            return;
        }
        
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        // Use current view position if not specified
        if (!position) {
            const view = marzipanoScene.view();
            position = {
                yaw: view.yaw(),
                pitch: view.pitch()
            };
        }
        
        const hotspotData = createHotspotData(type, position, {
            title: type === 'info' ? 'New Info' : '',
            text: '',
            target: null,
            label: ''
        });
        
        currentScene.hotspots.push(hotspotData);
        createHotspotElement(hotspotData, marzipanoScene);
        
        updateSceneList();
        showToast(`Added ${type} hotspot`, 'success');
        
        // Open editor for the new hotspot
        openHotspotModal(hotspotData);
    }

    function updateHotspot(hotspotData) {
        // Update element content
        if (hotspotData._element) {
            const labelEl = hotspotData._element.querySelector('.hotspot-label');
            const tooltipEl = hotspotData._element.querySelector('.hotspot-tooltip');
            
            if (hotspotData.type === 'info') {
                const textEl = hotspotData._element.querySelector('.hotspot-tooltip-text');
                labelEl.textContent = hotspotData.title || 'Info';
                textEl.textContent = hotspotData.text || '';
                
                // Only show tooltip if there's description text
                if (hotspotData.text && hotspotData.text.trim()) {
                    tooltipEl.classList.add('has-text');
                } else {
                    tooltipEl.classList.remove('has-text');
                }
            } else {
                const targetScene = app.scenes.find(s => s.id === hotspotData.target);
                labelEl.textContent = hotspotData.label || (targetScene ? targetScene.name : 'Unlinked');
                
                // Update arrow rotation
                const rotation = hotspotData.rotation || 0;
                const iconSvg = hotspotData._element.querySelector('.hotspot-icon svg');
                if (iconSvg) {
                    iconSvg.style.transform = `rotate(${rotation}deg)`;
                }
            }
        }
        
        // Update position
        if (hotspotData._marzipanoHotspot) {
            hotspotData._marzipanoHotspot.setPosition(hotspotData.position);
        }
        
        updateSceneList();
    }

    function deleteHotspot(hotspotData) {
        const currentScene = app.scenes.find(s => s.id === app.currentSceneId);
        if (!currentScene) return;
        
        const index = currentScene.hotspots.findIndex(h => h.id === hotspotData.id);
        if (index === -1) return;
        
        // Destroy Marzipano hotspot
        if (hotspotData._marzipanoHotspot) {
            const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
            if (marzipanoScene) {
                marzipanoScene.hotspotContainer().destroyHotspot(hotspotData._marzipanoHotspot);
            }
        }
        
        currentScene.hotspots.splice(index, 1);
        updateSceneList();
        showToast('Hotspot deleted');
    }

    // ============================================
    // Modal Handling
    // ============================================
    
    function openHotspotModal(hotspotData) {
        app.selectedHotspot = hotspotData;
        
        el.modalTitle.textContent = hotspotData.type === 'info' ? 'Edit Info Hotspot' : 'Edit Link Hotspot';
        
        // Show correct form
        el.infoHotspotForm.classList.toggle('hidden', hotspotData.type !== 'info');
        el.linkHotspotForm.classList.toggle('hidden', hotspotData.type !== 'link');
        
        // Populate form
        if (hotspotData.type === 'info') {
            el.hotspotTitle.value = hotspotData.title || '';
            el.hotspotText.value = hotspotData.text || '';
        } else {
            // Populate scene dropdown
            el.hotspotTarget.innerHTML = '<option value="">Select a scene...</option>';
            app.scenes.forEach(scene => {
                if (scene.id !== app.currentSceneId) {
                    const option = document.createElement('option');
                    option.value = scene.id;
                    option.textContent = scene.name;
                    option.selected = scene.id === hotspotData.target;
                    el.hotspotTarget.appendChild(option);
                }
            });
            el.linkHotspotTitle.value = hotspotData.label || '';
            
            // Set rotation
            const rotation = hotspotData.rotation || 0;
            el.hotspotRotation.value = rotation;
            updateRotationPicker(rotation);
        }
        
        // Position
        el.hotspotYaw.value = radToDeg(hotspotData.position.yaw);
        el.hotspotPitch.value = radToDeg(hotspotData.position.pitch);
        
        el.modalOverlay.classList.remove('hidden');
    }

    function closeHotspotModal() {
        el.modalOverlay.classList.add('hidden');
        app.selectedHotspot = null;
    }

    function saveHotspot() {
        if (!app.selectedHotspot) return;
        
        if (app.selectedHotspot.type === 'info') {
            app.selectedHotspot.title = el.hotspotTitle.value;
            app.selectedHotspot.text = el.hotspotText.value;
        } else {
            app.selectedHotspot.target = el.hotspotTarget.value || null;
            app.selectedHotspot.label = el.linkHotspotTitle.value;
            app.selectedHotspot.rotation = parseInt(el.hotspotRotation.value) || 0;
        }
        
        app.selectedHotspot.position = {
            yaw: degToRad(el.hotspotYaw.value),
            pitch: degToRad(el.hotspotPitch.value)
        };
        
        updateHotspot(app.selectedHotspot);
        closeHotspotModal();
        showToast('Hotspot saved', 'success');
    }
    
    function updateRotationPicker(rotation) {
        el.rotationPicker.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.rotation) === rotation);
        });
    }
    
    function setupRotationPicker() {
        el.rotationPicker.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rotation = parseInt(btn.dataset.rotation);
                el.hotspotRotation.value = rotation;
                updateRotationPicker(rotation);
            });
        });
    }

    function openSceneModal(sceneId) {
        const scene = app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        el.sceneName.value = scene.name;
        el.initialViewPreview.innerHTML = `
            Yaw: ${radToDeg(scene.initialView.yaw)}° | 
            Pitch: ${radToDeg(scene.initialView.pitch)}° | 
            FOV: ${radToDeg(scene.initialView.fov)}°
        `;
        
        el.thumbnailPreview.innerHTML = scene.thumbnail 
            ? `<img src="${scene.thumbnail}" alt="">`
            : '';
        
        el.sceneModalOverlay.dataset.sceneId = sceneId;
        el.sceneModalOverlay.classList.remove('hidden');
    }

    function closeSceneModal() {
        el.sceneModalOverlay.classList.add('hidden');
        delete el.sceneModalOverlay.dataset.sceneId;
    }

    function saveScene() {
        const sceneId = el.sceneModalOverlay.dataset.sceneId;
        const scene = app.scenes.find(s => s.id === sceneId);
        if (!scene) return;
        
        scene.name = el.sceneName.value || 'Untitled';
        updateSceneList();
        closeSceneModal();
        showToast('Scene saved', 'success');
    }

    function openSettingsModal() {
        // Populate settings
        el.mouseMode.value = app.settings.mouseMode;
        el.autorotateEnabled.checked = app.settings.autorotateEnabled;
        el.autorotateSpeed.value = app.settings.autorotateSpeed;
        el.autorotateSpeedValue.textContent = app.settings.autorotateSpeed;
        el.autorotateDelay.value = app.settings.autorotateDelay / 1000;
        el.showControls.checked = app.settings.showControls;
        el.showFullscreen.checked = app.settings.showFullscreen;
        
        el.settingsModalOverlay.classList.remove('hidden');
    }

    function closeSettingsModal() {
        el.settingsModalOverlay.classList.add('hidden');
    }

    function openExportModal() {
        el.exportProgress.classList.add('hidden');
        el.exportProgressFill.style.width = '0%';
        el.exportModalOverlay.classList.remove('hidden');
    }

    function closeExportModal() {
        el.exportModalOverlay.classList.add('hidden');
    }

    // ============================================
    // Initial View
    // ============================================
    
    function setInitialView() {
        const currentScene = app.scenes.find(s => s.id === app.currentSceneId);
        if (!currentScene) return;
        
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        const view = marzipanoScene.view();
        currentScene.initialView = {
            yaw: view.yaw(),
            pitch: view.pitch(),
            fov: view.fov()
        };
        
        showToast('Initial view set for ' + currentScene.name, 'success');
    }

    // ============================================
    // View Controls
    // ============================================
    
    function updateViewInfo() {
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        const view = marzipanoScene.view();
        
        const yawText = radToDeg(view.yaw()) + '°';
        const pitchText = radToDeg(view.pitch()) + '°';
        const fovText = radToDeg(view.fov()) + '°';
        
        // Update sidebar view info
        el.sidebarInfoYaw.textContent = yawText;
        el.sidebarInfoPitch.textContent = pitchText;
        el.sidebarInfoFov.textContent = fovText;
        
        // Update zoom slider
        const fovDeg = parseFloat(radToDeg(view.fov()));
        el.zoomSlider.value = 150 - fovDeg; // Invert for intuitive slider
    }

    function resetView() {
        const currentScene = app.scenes.find(s => s.id === app.currentSceneId);
        if (!currentScene) return;
        
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        marzipanoScene.lookTo(currentScene.initialView, { transitionDuration: 1000 });
    }

    function toggleAutorotate() {
        if (app.isAutorotating) {
            app.viewer.stopMovement();
            app.isAutorotating = false;
            el.btnAutorotate.classList.remove('active');
        } else {
            app.viewer.startMovement(app.autorotate);
            app.isAutorotating = true;
            el.btnAutorotate.classList.add('active');
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                showToast('Fullscreen not available', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    function zoom(direction) {
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        const view = marzipanoScene.view();
        const currentFov = view.fov();
        const newFov = direction === 'in' ? currentFov * 0.85 : currentFov * 1.18;
        view.setFov(newFov);
    }

    function setZoomFromSlider() {
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (!marzipanoScene) return;
        
        const view = marzipanoScene.view();
        const fovDeg = 150 - parseFloat(el.zoomSlider.value);
        view.setFov(degToRad(fovDeg));
    }

    // ============================================
    // Context Menu
    // ============================================
    
    function showContextMenu(x, y, panoX, panoY) {
        app.contextMenuPosition = { x: panoX, y: panoY };
        
        // Convert screen position to view position
        const marzipanoScene = app.marzipanoScenes[app.currentSceneId];
        if (marzipanoScene) {
            const view = marzipanoScene.view();
            const coords = view.screenToCoordinates({ x: panoX, y: panoY });
            if (coords) {
                app.contextMenuPosition.yaw = coords.yaw;
                app.contextMenuPosition.pitch = coords.pitch;
            }
        }
        
        el.contextMenu.style.left = x + 'px';
        el.contextMenu.style.top = y + 'px';
        el.contextMenu.classList.remove('hidden');
    }

    function hideContextMenu() {
        el.contextMenu.classList.add('hidden');
        app.contextMenuPosition = null;
    }

    function handleContextMenuAction(action) {
        if (!app.contextMenuPosition) return;
        
        const position = {
            yaw: app.contextMenuPosition.yaw,
            pitch: app.contextMenuPosition.pitch
        };
        
        switch (action) {
            case 'add-info-hotspot':
                addHotspot('info', position);
                break;
            case 'add-link-hotspot':
                addHotspot('link', position);
                break;
            case 'set-initial-view':
                setInitialView();
                break;
            case 'copy-position':
                const posText = `Yaw: ${radToDeg(position.yaw)}°, Pitch: ${radToDeg(position.pitch)}°`;
                navigator.clipboard.writeText(posText).then(() => {
                    showToast('Position copied', 'success');
                });
                break;
        }
        
        hideContextMenu();
    }

    // ============================================
    // File Handling
    // ============================================
    
    function handleFiles(files) {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            showToast('No valid image files', 'error');
            return;
        }
        
        imageFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const name = file.name.replace(/\.[^/.]+$/, '');
                addScene(e.target.result, name);
            };
            reader.readAsDataURL(file);
        });
    }

    function setupFileHandlers() {
        // Welcome screen upload
        el.uploadZone.addEventListener('click', () => el.fileInput.click());
        el.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFiles(e.target.files);
        });
        
        // Add panorama button
        el.btnAddPano.addEventListener('click', () => el.addPanoInput.click());
        el.addPanoInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFiles(e.target.files);
        });
        
        // Drag and drop
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        
        el.uploadZone.addEventListener('dragover', (e) => {
            handleDragOver(e);
            el.uploadZone.classList.add('drag-over');
        });
        
        el.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            el.uploadZone.classList.remove('drag-over');
        });
        
        el.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            el.uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        });
        
        // Global drag and drop (when UI is visible)
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!el.welcomeScreen.classList.contains('hidden') || el.toolbar.classList.contains('hidden')) return;
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        });
    }

    // ============================================
    // Export Functionality
    // ============================================
    
    function exportProject() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const projectName = el.projectName.value || 'panorama-project';
        
        el.exportProgress.classList.remove('hidden');
        el.btnDoExport.disabled = true;
        
        if (exportType === 'json') {
            exportAsJSON(projectName);
        } else {
            exportAsHTML(projectName);
        }
    }

    function exportAsJSON(projectName) {
        el.exportProgressText.textContent = 'Generating project file...';
        el.exportProgressFill.style.width = '50%';
        
        setTimeout(() => {
            const projectData = {
                name: projectName,
                version: '1.0',
                settings: app.settings,
                scenes: app.scenes.map(scene => ({
                    id: scene.id,
                    name: scene.name,
                    imageUrl: scene.imageUrl,
                    thumbnail: scene.thumbnail,
                    initialView: scene.initialView,
                    hotspots: scene.hotspots.map(h => ({
                        id: h.id,
                        type: h.type,
                        position: h.position,
                        title: h.title,
                        text: h.text,
                        target: h.target,
                        label: h.label,
                        rotation: h.rotation || 0
                    }))
                }))
            };
            
            el.exportProgressFill.style.width = '100%';
            el.exportProgressText.textContent = 'Download starting...';
            
            const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
            downloadBlob(blob, projectName + '.json');
            
            setTimeout(() => {
                el.btnDoExport.disabled = false;
                closeExportModal();
                showToast('Project exported!', 'success');
            }, 500);
        }, 500);
    }

    function exportAsHTML(projectName) {
        el.exportProgressText.textContent = 'Generating standalone viewer...';
        el.exportProgressFill.style.width = '30%';
        
        setTimeout(() => {
            // Generate self-contained HTML
            const html = generateStandaloneHTML(projectName);
            
            el.exportProgressFill.style.width = '100%';
            el.exportProgressText.textContent = 'Download starting...';
            
            const blob = new Blob([html], { type: 'text/html' });
            downloadBlob(blob, projectName + '.html');
            
            setTimeout(() => {
                el.btnDoExport.disabled = false;
                closeExportModal();
                showToast('HTML exported!', 'success');
            }, 500);
        }, 500);
    }

    function generateStandaloneHTML(projectName) {
        const scenesData = app.scenes.map(scene => ({
            id: scene.id,
            name: scene.name,
            imageUrl: scene.imageUrl,
            initialView: scene.initialView,
            hotspots: scene.hotspots.map(h => ({
                id: h.id,
                type: h.type,
                position: h.position,
                title: h.title,
                text: h.text,
                target: h.target,
                label: h.label,
                rotation: h.rotation || 0
            }))
        }));
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <script src="https://cdn.jsdelivr.net/npm/marzipano@0.10.2/dist/marzipano.js"><\/script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; font-family: system-ui, sans-serif; }
        #pano { position: absolute; inset: 0; background: #111; }
        .hotspot { cursor: pointer; transform: translate(-50%, -50%); }
        .hotspot-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .info-hotspot .hotspot-icon { background: #00e5ff; color: #000; box-shadow: 0 0 20px rgba(0,229,255,0.4); }
        .link-hotspot .hotspot-icon { background: #ffab00; color: #000; box-shadow: 0 0 20px rgba(255,171,0,0.4); }
        .hotspot-icon svg { width: 20px; height: 20px; }
        .hotspot-tooltip { position: absolute; left: 50%; bottom: calc(100% + 12px); transform: translateX(-50%); background: #1a1a25; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; min-width: 160px; opacity: 0; visibility: hidden; transition: 0.2s; pointer-events: none; color: #fff; }
        .info-hotspot:hover .hotspot-tooltip { opacity: 1; visibility: visible; }
        .hotspot-tooltip h4 { font-size: 14px; margin-bottom: 4px; }
        .hotspot-tooltip p { font-size: 12px; color: #888; }
        .hotspot-label { position: absolute; left: 50%; top: calc(100% + 8px); transform: translateX(-50%); background: #1a1a25; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; font-size: 12px; white-space: nowrap; color: #fff; }
        #scene-nav { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 100; }
        .scene-btn { padding: 8px 16px; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; cursor: pointer; transition: 0.2s; }
        .scene-btn:hover, .scene-btn.active { background: #00e5ff; color: #000; border-color: #00e5ff; }
    </style>
</head>
<body>
    <div id="pano"></div>
    <div id="scene-nav"></div>
    <script>
        const scenesData = ${JSON.stringify(scenesData)};
        let viewer, scenes = {}, currentSceneId = null;
        
        function init() {
            viewer = new Marzipano.Viewer(document.getElementById('pano'));
            scenesData.forEach(createScene);
            if (scenesData.length) switchScene(scenesData[0].id);
            renderNav();
        }
        
        function createScene(data) {
            const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);
            const source = Marzipano.ImageUrlSource.fromString(data.imageUrl);
            const limiter = Marzipano.RectilinearView.limit.traditional(4096, 120 * Math.PI / 180);
            const view = new Marzipano.RectilinearView(data.initialView, limiter);
            const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
            scenes[data.id] = { scene, data };
        }
        
        function switchScene(id) {
            const { scene, data } = scenes[id];
            scene.switchTo({ transitionDuration: 1000 });
            scene.view().setParameters(data.initialView);
            currentSceneId = id;
            
            scene.hotspotContainer().listHotspots().forEach(h => scene.hotspotContainer().destroyHotspot(h));
            data.hotspots.forEach(h => createHotspot(h, scene));
            
            document.querySelectorAll('.scene-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));
        }
        
        function createHotspot(data, scene) {
            const el = document.createElement('div');
            el.className = 'hotspot ' + (data.type === 'info' ? 'info-hotspot' : 'link-hotspot');
            
            if (data.type === 'info') {
                el.innerHTML = '<div class="hotspot-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div class="hotspot-tooltip"><h4>' + (data.title || 'Info') + '</h4><p>' + (data.text || '') + '</p></div>';
            } else {
                const target = scenesData.find(s => s.id === data.target);
                const rotation = data.rotation || 0;
                el.innerHTML = '<div class="hotspot-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(' + rotation + 'deg)"><circle cx="12" cy="12" r="8"/><path d="M12 8l4 4-4 4M8 12h8"/></svg></div><div class="hotspot-label">' + (data.label || (target ? target.name : '')) + '</div>';
                if (data.target) el.onclick = () => switchScene(data.target);
            }
            
            scene.hotspotContainer().createHotspot(el, data.position);
        }
        
        function renderNav() {
            const nav = document.getElementById('scene-nav');
            scenesData.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'scene-btn';
                btn.dataset.id = s.id;
                btn.textContent = s.name;
                btn.onclick = () => switchScene(s.id);
                nav.appendChild(btn);
            });
        }
        
        init();
    <\/script>
</body>
</html>`;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============================================
    // Import Project
    // ============================================
    
    async function importProject(projectData) {
        updateLoadingText('Importing project...');
        showLoading(true);
        
        // Clear existing scenes
        app.scenes.forEach(scene => {
            const marzipanoScene = app.marzipanoScenes[scene.id];
            if (marzipanoScene) {
                app.viewer.destroyScene(marzipanoScene);
            }
        });
        app.scenes = [];
        app.marzipanoScenes = {};
        app.currentSceneId = null;
        
        // Import settings
        if (projectData.settings) {
            app.settings = { ...app.settings, ...projectData.settings };
            updateAutorotate();
        }
        
        // Import scenes sequentially
        let firstSceneId = null;
        for (let i = 0; i < projectData.scenes.length; i++) {
            const sceneData = projectData.scenes[i];
            updateLoadingText(`Loading scene ${i + 1} of ${projectData.scenes.length}...`);
            
            try {
                const newScene = {
                    ...sceneData,
                    hotspots: sceneData.hotspots || []
                };
                
                await createMarzipanoScene(newScene);
                app.scenes.push(newScene);
                
                if (i === 0) {
                    firstSceneId = newScene.id;
                }
            } catch (error) {
                showToast('Failed to import scene: ' + sceneData.name, 'error');
                console.error('Import error:', error);
            }
        }
        
        // Switch to first scene and show UI
        if (firstSceneId) {
            switchToScene(firstSceneId);
            showUI();
        }
        
        updateSceneList();
        showLoading(false);
        showToast(`Imported ${app.scenes.length} scene(s)`, 'success');
    }
    
    function handleImportFile(file) {
        if (!file || !file.name.endsWith('.json')) {
            showToast('Please select a valid JSON project file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                
                if (!projectData.scenes || !Array.isArray(projectData.scenes)) {
                    showToast('Invalid project file format', 'error');
                    return;
                }
                
                importProject(projectData);
            } catch (error) {
                showToast('Failed to parse project file: ' + error.message, 'error');
            }
        };
        reader.onerror = () => {
            showToast('Failed to read file', 'error');
        };
        reader.readAsText(file);
    }

    // ============================================
    // Demo Panoramas
    // ============================================
    
    function loadDemoPanoramas() {
        // Generate procedural demo panoramas
        const demos = [
            { name: 'Night Sky', colors: ['#0c1445', '#1a237e', '#283593'], hasStars: true, hasAurora: true },
            { name: 'Sunset Beach', colors: ['#ff6b35', '#f7931e', '#ffd23f'], hasStars: false, hasAurora: false },
            { name: 'Forest Clearing', colors: ['#1b4332', '#2d6a4f', '#40916c'], hasStars: false, hasAurora: false }
        ];
        
        demos.forEach((demo, index) => {
            const canvas = generateDemoPanorama(demo);
            setTimeout(() => {
                addScene(canvas.toDataURL('image/jpeg', 0.9), demo.name);
            }, index * 500);
        });
    }

    function generateDemoPanorama(config) {
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        config.colors.forEach((color, i) => {
            gradient.addColorStop(i / (config.colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stars
        if (config.hasStars) {
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height * 0.5;
                const size = Math.random() * 2 + 0.5;
                ctx.globalAlpha = Math.random() * 0.8 + 0.2;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        // Aurora
        if (config.hasAurora) {
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 5; i++) {
                const auroraGradient = ctx.createLinearGradient(
                    Math.random() * canvas.width, canvas.height * 0.2,
                    Math.random() * canvas.width, canvas.height * 0.5
                );
                const auroraColors = ['#00e676', '#69f0ae', '#00bcd4'];
                auroraGradient.addColorStop(0, 'transparent');
                auroraGradient.addColorStop(0.5, auroraColors[Math.floor(Math.random() * auroraColors.length)]);
                auroraGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = auroraGradient;
                ctx.fillRect(i * canvas.width / 5, canvas.height * 0.1, canvas.width / 4, canvas.height * 0.4);
            }
            ctx.globalAlpha = 1;
        }
        
        // Ground
        const groundY = canvas.height * 0.7;
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
        groundGradient.addColorStop(0, '#1b5e20');
        groundGradient.addColorStop(1, '#0d3010');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        
        // Hills
        ctx.fillStyle = '#2e7d32';
        for (let i = 0; i < 10; i++) {
            const hillX = (canvas.width / 10) * i + Math.random() * 200;
            const hillHeight = 40 + Math.random() * 80;
            ctx.beginPath();
            ctx.moveTo(hillX - 200, groundY);
            ctx.quadraticCurveTo(hillX, groundY - hillHeight, hillX + 200, groundY);
            ctx.fill();
        }
        
        // Title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 80px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(config.name, canvas.width / 2, canvas.height * 0.45);
        
        ctx.font = '36px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Demo Panorama - Add your own!', canvas.width / 2, canvas.height * 0.52);
        
        return canvas;
    }

    // ============================================
    // UI Helpers
    // ============================================
    
    function showUI() {
        el.welcomeScreen.classList.add('hidden');
        el.toolbar.classList.remove('hidden');
        el.sceneSidebar.classList.remove('hidden');
        el.controlBar.classList.remove('hidden');
        el.controlBar.classList.remove('no-sidebar');
        el.sidebarToggle.classList.remove('hidden');
        el.pano.classList.add('with-sidebar-left');
        // Update viewer size after layout change
        setTimeout(() => {
            if (app.viewer) app.viewer.updateSize();
        }, 300);
    }

    function hideUI() {
        el.toolbar.classList.add('hidden');
        el.sceneSidebar.classList.add('hidden');
        el.propertiesSidebar.classList.add('hidden');
        el.controlBar.classList.add('hidden');
        el.controlBar.classList.add('no-sidebar');
        el.sidebarToggle.classList.add('hidden');
        el.welcomeScreen.classList.remove('hidden');
        el.pano.classList.remove('with-sidebar-left', 'with-sidebar-right');
        closeMobileSidebar();
    }
    
    function toggleMobileSidebar() {
        const isOpen = el.sceneSidebar.classList.contains('mobile-open');
        if (isOpen) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    }
    
    function openMobileSidebar() {
        el.sceneSidebar.classList.add('mobile-open');
        el.sidebarBackdrop.classList.add('visible');
        el.sidebarToggle.classList.add('active');
    }
    
    function closeMobileSidebar() {
        el.sceneSidebar.classList.remove('mobile-open');
        el.sidebarBackdrop.classList.remove('visible');
        el.sidebarToggle.classList.remove('active');
        // Update viewer size after sidebar animation
        setTimeout(() => {
            if (app.viewer) app.viewer.updateSize();
        }, 300);
    }

    // ============================================
    // Event Handlers Setup
    // ============================================
    
    function setupEventHandlers() {
        // Toolbar buttons
        el.btnAddInfoHotspot.addEventListener('click', () => addHotspot('info'));
        el.btnAddLinkHotspot.addEventListener('click', () => addHotspot('link'));
        el.btnSetInitialView.addEventListener('click', setInitialView);
        el.btnSettings.addEventListener('click', openSettingsModal);
        el.btnExport.addEventListener('click', openExportModal);
        
        // Control bar
        el.btnHome.addEventListener('click', resetView);
        el.btnAutorotate.addEventListener('click', toggleAutorotate);
        el.btnFullscreen.addEventListener('click', toggleFullscreen);
        el.btnZoomIn.addEventListener('click', () => zoom('in'));
        el.btnZoomOut.addEventListener('click', () => zoom('out'));
        el.zoomSlider.addEventListener('input', setZoomFromSlider);
        
        // Demo button
        el.loadDemoBtn.addEventListener('click', loadDemoPanoramas);
        
        // Import buttons
        el.btnImport.addEventListener('click', () => el.importInput.click());
        el.importInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImportFile(e.target.files[0]);
                e.target.value = ''; // Reset to allow reimporting same file
            }
        });
        
        el.btnImportWelcome.addEventListener('click', () => el.importInputWelcome.click());
        el.importInputWelcome.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImportFile(e.target.files[0]);
                e.target.value = '';
            }
        });
        
        // Modal close buttons
        document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                closeHotspotModal();
                closeSceneModal();
                closeSettingsModal();
                closeExportModal();
            });
        });
        
        // Hotspot modal
        el.btnSaveHotspot.addEventListener('click', saveHotspot);
        el.btnDeleteHotspot.addEventListener('click', () => {
            if (app.selectedHotspot) {
                deleteHotspot(app.selectedHotspot);
                closeHotspotModal();
            }
        });
        
        // Scene modal
        el.btnSaveScene.addEventListener('click', saveScene);
        el.btnDeleteScene.addEventListener('click', () => {
            const sceneId = el.sceneModalOverlay.dataset.sceneId;
            if (sceneId && confirm('Delete this scene?')) {
                deleteScene(sceneId);
                closeSceneModal();
            }
        });
        el.btnUseCurrentView.addEventListener('click', () => {
            const sceneId = el.sceneModalOverlay.dataset.sceneId;
            const scene = app.scenes.find(s => s.id === sceneId);
            if (scene) {
                const marzipanoScene = app.marzipanoScenes[sceneId];
                if (marzipanoScene) {
                    const view = marzipanoScene.view();
                    scene.initialView = {
                        yaw: view.yaw(),
                        pitch: view.pitch(),
                        fov: view.fov()
                    };
                    el.initialViewPreview.innerHTML = `
                        Yaw: ${radToDeg(scene.initialView.yaw)}° | 
                        Pitch: ${radToDeg(scene.initialView.pitch)}° | 
                        FOV: ${radToDeg(scene.initialView.fov)}°
                    `;
                    showToast('Initial view updated', 'success');
                }
            }
        });
        
        // Settings
        el.autorotateSpeed.addEventListener('input', () => {
            el.autorotateSpeedValue.textContent = el.autorotateSpeed.value;
            app.settings.autorotateSpeed = parseFloat(el.autorotateSpeed.value);
            updateAutorotate();
        });
        
        // Export
        el.btnDoExport.addEventListener('click', exportProject);
        
        // Properties sidebar close
        el.btnCloseProperties.addEventListener('click', () => {
            el.propertiesSidebar.classList.add('hidden');
            el.pano.classList.remove('with-sidebar-right');
        });
        
        // Mobile sidebar toggle
        el.sidebarToggle.addEventListener('click', toggleMobileSidebar);
        el.sidebarClose.addEventListener('click', closeMobileSidebar);
        el.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
        
        // Context menu
        el.pano.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!app.currentSceneId) return;
            
            const rect = el.pano.getBoundingClientRect();
            showContextMenu(e.clientX, e.clientY, e.clientX - rect.left, e.clientY - rect.top);
        });
        
        el.contextMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => handleContextMenuAction(btn.dataset.action));
        });
        
        document.addEventListener('click', (e) => {
            if (!el.contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });
        
        // Stop autorotate on user interaction
        el.pano.addEventListener('mousedown', () => {
            if (app.isAutorotating) {
                app.viewer.stopMovement();
                app.isAutorotating = false;
                el.btnAutorotate.classList.remove('active');
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    toggleAutorotate();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'h':
                    resetView();
                    break;
                case '+':
                case '=':
                    zoom('in');
                    break;
                case '-':
                    zoom('out');
                    break;
                case 'escape':
                    closeHotspotModal();
                    closeSceneModal();
                    closeSettingsModal();
                    closeExportModal();
                    hideContextMenu();
                    break;
            }
        });
        
        // Click outside modals to close
        [el.modalOverlay, el.settingsModalOverlay, el.exportModalOverlay, el.sceneModalOverlay].forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeHotspotModal();
                    closeSceneModal();
                    closeSettingsModal();
                    closeExportModal();
                }
            });
        });
    }

    // ============================================
    // Initialization
    // ============================================
    
    function init() {
        cacheElements();
        
        if (typeof Marzipano === 'undefined') {
            showToast('Marzipano library not loaded!', 'error');
            updateLoadingText('Error: Marzipano not found');
            return;
        }
        
        initViewer();
        setupFileHandlers();
        setupEventHandlers();
        setupRotationPicker();
        setupResizeHandler();
        
        console.log('360° Panorama Studio initialized');
    }
    
    function setupResizeHandler() {
        // Debounced resize handler to update Marzipano when container changes
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (app.viewer) {
                    app.viewer.updateSize();
                }
            }, 100);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
