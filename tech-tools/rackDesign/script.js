const rack = document.getElementById('rack');
const totalUnitsInput = document.getElementById('totalUnits');
const rackItems = document.getElementById('rackItems');
const darkModeToggle = document.getElementById('darkModeToggle');
const projectNameDisplay = document.getElementById('projectNameDisplay');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const jsonModal = document.getElementById('jsonModal');
const jsonTextarea = document.getElementById('jsonTextarea');
const modalTitle = document.getElementById('modalTitle');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalImportBtn = document.getElementById('modalImportBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const iconModal = document.getElementById('iconModal');
const iconGrid = document.getElementById('iconGrid');
const iconSearchInput = document.getElementById('iconSearchInput');
const iconUrlBtn = document.getElementById('iconUrlBtn');
const iconFavorites = document.getElementById('iconFavorites');

let draggedItemSize = 0;
let draggedItem = null;
let draggedItemClone = null;
let touchStartY = 0;
let touchStartX = 0;
let currentIconSelectItem = null;

// Favorite Material Icons - commonly used rack equipment
const favoriteIcons = [
    { name: 'Network Device', icon: 'lan' },
    { name: 'Storage Device', icon: 'storage' },
    { name: 'UPS/Battery', icon: 'battery_charging_60' },
    { name: 'Audio Amplifier', icon: 'audio_video_receiver' },
    { name: 'Patch Panel', icon: 'cable' },
    { name: 'Internet/Modem', icon: 'globe' },
    { name: 'Power/PDU', icon: 'power' },
    { name: 'Server', icon: 'host' },
];

// Comprehensive list of Material Icons for search (common tech/server-related icons)
const materialIconsList = [
    'lan', 'storage', 'battery_charging_60', 'audio_video_receiver', 'cable', 'globe', 'power', 'host',
    'computer', 'dns', 'router', 'hub', 'switch', 'cloud', 'cloud_done', 'cloud_sync', 'cloud_upload',
    'database', 'memory', 'chip', 'memory_alt', 'hardware', 'devices', 'devices_other', 'device_hub',
    'settings_input_component', 'settings_input_hdmi', 'settings_ethernet', 'settings_cell', 'settings',
    'wifi', 'wifi_off', 'wifi_lock', 'signal_wifi_4_bar', 'signal_cellular_4_bar', 'network_check',
    'network_wifi', 'network_locked', 'perm_data_setting', 'data_usage', 'data_object', 'data_saver_on',
    'security', 'shield', 'vpn_lock', 'lock', 'lock_open', 'admin_panel_settings', 'verified_user',
    'monitor', 'monitor_heart', 'desktop_windows', 'desktop_mac', 'laptop', 'laptop_windows', 'laptop_mac',
    'tablet', 'phone_android', 'smartphone', 'watch', 'tv', 'cast', 'cast_connected', 'screen_share',
    'keyboard', 'mouse', 'headphones', 'speaker', 'volume_up', 'volume_down', 'volume_off', 'volume_mute',
    'mic', 'videocam', 'camera', 'camera_alt', 'camera_roll', 'photo_camera', 'movie', 'video_library',
    'folder', 'folder_open', 'folder_shared', 'folder_special', 'drive_file', 'drive_folder_upload',
    'insert_drive_file', 'description', 'file_present', 'attach_file', 'link', 'link_off', 'insert_link',
    'usb', 'usb_off', 'bluetooth', 'bluetooth_connected', 'bluetooth_disabled', 'bluetooth_searching',
    'nfc', 'nfc_variant', 'qr_code', 'qr_code_scanner', 'barcode', 'barcode_reader', 'scanner',
    'print', 'print_disabled', 'local_printshop', 'print_connect', 'print_off', 'receipt', 'receipt_long',
    'label', 'label_important', 'label_off', 'bookmark', 'bookmark_border', 'star', 'star_border',
    'favorite', 'favorite_border', 'thumb_up', 'thumb_down', 'rate_review', 'feedback', 'support_agent',
    'help', 'help_outline', 'info', 'info_outline', 'question_answer', 'contact_support', 'live_help',
    'error', 'error_outline', 'warning', 'warning_amber', 'report', 'report_problem', 'bug_report',
    'notifications', 'notifications_active', 'notifications_off', 'notifications_none', 'notifications_paused',
    'alarm', 'alarm_on', 'alarm_off', 'schedule', 'access_time', 'timer', 'timer_off', 'hourglass_empty',
    'event', 'event_available', 'event_busy', 'event_note', 'calendar_today', 'calendar_month', 'date_range',
    'home', 'home_work', 'business', 'business_center', 'apartment', 'store', 'storefront', 'shopping_cart',
    'add_shopping_cart', 'remove_shopping_cart', 'payment', 'credit_card', 'account_balance', 'account_balance_wallet',
    'attach_money', 'money', 'money_off', 'currency_exchange', 'trending_up', 'trending_down', 'show_chart',
    'bar_chart', 'pie_chart', 'multiline_chart', 'insert_chart', 'assessment', 'analytics', 'insights',
    'dashboard', 'dashboard_customize', 'widgets', 'view_module', 'view_list', 'view_quilt', 'view_comfy',
    'grid_view', 'view_agenda', 'view_week', 'view_day', 'view_headline', 'view_stream', 'view_column',
    'menu', 'menu_open', 'menu_book', 'menu_book_outlined', 'restaurant_menu', 'more_vert', 'more_horiz',
    'apps', 'apps_outage', 'app_registration', 'app_settings_alt', 'extension', 'extension_off', 'plugin',
    'build', 'build_circle', 'construction', 'engineering', 'handyman', 'plumbing', 'electrical_services',
    'home_repair_service', 'cleaning_services', 'carpenter', 'directions', 'directions_car', 'directions_bus',
    'directions_subway', 'directions_walk', 'directions_run', 'directions_bike', 'directions_boat', 'flight',
    'flight_takeoff', 'flight_land', 'train', 'tram', 'subway', 'bus_alert', 'local_taxi', 'car_rental',
    'parking', 'local_parking', 'local_gas_station', 'ev_station', 'charging_station', 'battery_charging_full',
    'battery_full', 'battery_std', 'battery_unknown', 'battery_alert', 'battery_1_bar', 'battery_2_bar',
    'battery_3_bar', 'battery_4_bar', 'battery_5_bar', 'battery_6_bar', 'battery_0_bar', 'battery_saver',
    'battery_very_low', 'battery_low', 'battery_medium', 'battery_high', 'power_input', 'power_off',
    'power_settings_new', 'power', 'flash_on', 'flash_off', 'flash_auto', 'bolt', 'lightning_charge',
    'electric_bolt', 'electrical_services', 'electrical_services_outlined', 'cable', 'cable_off', 'cable_management',
    'fiber_new', 'fiber_manual_record', 'fiber_smart_record', 'fiber_pin', 'fiber_dvr', 'fiber_manual_record_outlined',
    'fiber_new_outlined', 'fiber_smart_record_outlined', 'fiber_pin_outlined', 'fiber_dvr_outlined',
    'wifi_tethering', 'wifi_tethering_error', 'wifi_tethering_off', 'wifi_calling', 'wifi_calling_1',
    'wifi_calling_2', 'wifi_calling_3', 'wifi_calling_off', 'wifi_protected_setup', 'wifi_find',
    'signal_wifi_0_bar', 'signal_wifi_1_bar', 'signal_wifi_2_bar', 'signal_wifi_3_bar', 'signal_wifi_4_bar',
    'signal_wifi_4_bar_lock', 'signal_wifi_bad', 'signal_wifi_connected_no_internet_4', 'signal_wifi_off',
    'signal_wifi_statusbar_4_bar', 'signal_wifi_statusbar_connected_no_internet_4', 'signal_wifi_statusbar_not_connected',
    'signal_wifi_statusbar_null', 'signal_cellular_0_bar', 'signal_cellular_1_bar', 'signal_cellular_2_bar',
    'signal_cellular_3_bar', 'signal_cellular_4_bar', 'signal_cellular_alt', 'signal_cellular_alt_1_bar',
    'signal_cellular_alt_2_bar', 'signal_cellular_connected_no_internet_0_bar', 'signal_cellular_connected_no_internet_1_bar',
    'signal_cellular_connected_no_internet_2_bar', 'signal_cellular_connected_no_internet_3_bar', 'signal_cellular_connected_no_internet_4_bar',
    'signal_cellular_no_sim', 'signal_cellular_nodata', 'signal_cellular_null', 'signal_cellular_off',
    'signal_cellular_pause', 'signal_cellular_pause_outlined', 'network_cell', 'network_wifi', 'network_lock',
    'network_ping', 'network_check', 'network_node', 'network_manage', 'network_wifi_1_bar', 'network_wifi_2_bar',
    'network_wifi_3_bar', 'network_wifi_4_bar', 'network_wifi_5_bar', 'network_wifi_6_bar', 'network_wifi_off',
    'network_wifi_off_outlined', 'network_wifi_protected_setup', 'network_wifi_protected_setup_outlined',
    'network_wifi_round', 'network_wifi_round_outlined', 'network_wifi_round_1_bar', 'network_wifi_round_2_bar',
    'network_wifi_round_3_bar', 'network_wifi_round_4_bar', 'network_wifi_round_5_bar', 'network_wifi_round_6_bar',
    'network_wifi_round_off', 'network_wifi_round_off_outlined', 'network_wifi_round_protected_setup',
    'network_wifi_round_protected_setup_outlined', 'hub', 'hub_outlined', 'router', 'router_outlined',
    'switch', 'switch_access_shortcut', 'switch_access_shortcut_add', 'switch_account', 'switch_camera',
    'switch_left', 'switch_right', 'switch_video', 'dns', 'dns_outlined', 'dns_off', 'dns_off_outlined',
    'cloud', 'cloud_done', 'cloud_done_outlined', 'cloud_off', 'cloud_off_outlined', 'cloud_queue',
    'cloud_queue_outlined', 'cloud_sync', 'cloud_sync_outlined', 'cloud_upload', 'cloud_upload_outlined',
    'cloud_download', 'cloud_download_outlined', 'cloud_circle', 'cloud_circle_outlined', 'cloud_outlined',
    'cloud_off_outlined', 'cloud_upload_outlined', 'cloud_download_outlined', 'cloud_sync_outlined',
    'cloud_queue_outlined', 'cloud_done_outlined', 'cloud_off_outlined', 'cloud_circle_outlined',
    'storage', 'storage_outlined', 'database', 'database_outlined', 'data_object', 'data_object_outlined',
    'data_usage', 'data_usage_outlined', 'data_saver_on', 'data_saver_off', 'data_saver_off_outlined',
    'data_saver_on_outlined', 'data_array', 'data_array_outlined', 'data_exploration', 'data_exploration_outlined',
    'data_thresholding', 'data_thresholding_outlined', 'data_file', 'data_file_outlined', 'data_table',
    'data_table_outlined', 'data_table_bar', 'data_table_bar_outlined', 'data_table_chart', 'data_table_chart_outlined',
    'host', 'host_outlined', 'computer', 'computer_outlined', 'desktop_windows', 'desktop_windows_outlined',
    'desktop_mac', 'desktop_mac_outlined', 'laptop', 'laptop_outlined', 'laptop_windows', 'laptop_windows_outlined',
    'laptop_mac', 'laptop_mac_outlined', 'tablet', 'tablet_outlined', 'tablet_android', 'tablet_android_outlined',
    'tablet_mac', 'tablet_mac_outlined', 'phone', 'phone_outlined', 'phone_android', 'phone_android_outlined',
    'phone_iphone', 'phone_iphone_outlined', 'smartphone', 'smartphone_outlined', 'watch', 'watch_outlined',
    'tv', 'tv_outlined', 'monitor', 'monitor_outlined', 'monitor_heart', 'monitor_heart_outlined',
    'monitor_weight', 'monitor_weight_outlined', 'monitor_weight_gain', 'monitor_weight_gain_outlined',
    'monitor_weight_loss', 'monitor_weight_loss_outlined', 'monitor_play', 'monitor_play_outlined',
    'monitor_pause', 'monitor_pause_outlined', 'monitor_stop', 'monitor_stop_outlined', 'monitor_record',
    'monitor_record_outlined', 'monitor_off', 'monitor_off_outlined', 'monitor_screenshot', 'monitor_screenshot_outlined',
    'monitor_share', 'monitor_share_outlined', 'monitor_lock', 'monitor_lock_outlined', 'monitor_unlock',
    'monitor_unlock_outlined', 'monitor_volume', 'monitor_volume_outlined', 'monitor_volume_off',
    'monitor_volume_off_outlined', 'monitor_volume_down', 'monitor_volume_down_outlined', 'monitor_volume_up',
    'monitor_volume_up_outlined', 'monitor_mute', 'monitor_mute_outlined', 'monitor_unmute', 'monitor_unmute_outlined',
    'monitor_play_outlined', 'monitor_pause_outlined', 'monitor_stop_outlined', 'monitor_record_outlined',
    'monitor_off_outlined', 'monitor_screenshot_outlined', 'monitor_share_outlined', 'monitor_lock_outlined',
    'monitor_unlock_outlined', 'monitor_volume_outlined', 'monitor_volume_off_outlined', 'monitor_volume_down_outlined',
    'monitor_volume_up_outlined', 'monitor_mute_outlined', 'monitor_unmute_outlined', 'monitor_heart_outlined',
    'monitor_weight_outlined', 'monitor_weight_gain_outlined', 'monitor_weight_loss_outlined', 'monitor_play_outlined',
    'monitor_pause_outlined', 'monitor_stop_outlined', 'monitor_record_outlined', 'monitor_off_outlined',
    'monitor_screenshot_outlined', 'monitor_share_outlined', 'monitor_lock_outlined', 'monitor_unlock_outlined',
    'monitor_volume_outlined', 'monitor_volume_off_outlined', 'monitor_volume_down_outlined', 'monitor_volume_up_outlined',
    'monitor_mute_outlined', 'monitor_unmute_outlined', 'audio_video_receiver', 'audio_video_receiver_outlined',
    'speaker', 'speaker_outlined', 'speaker_group', 'speaker_group_outlined', 'speaker_notes', 'speaker_notes_outlined',
    'speaker_notes_off', 'speaker_notes_off_outlined', 'speaker_phone', 'speaker_phone_outlined', 'volume_up',
    'volume_up_outlined', 'volume_down', 'volume_down_outlined', 'volume_off', 'volume_off_outlined', 'volume_mute',
    'volume_mute_outlined', 'volume_high', 'volume_high_outlined', 'volume_low', 'volume_low_outlined', 'volume_medium',
    'volume_medium_outlined', 'volume_very_low', 'volume_very_low_outlined', 'volume_very_high', 'volume_very_high_outlined',
    'mic', 'mic_outlined', 'mic_none', 'mic_none_outlined', 'mic_off', 'mic_off_outlined', 'headphones',
    'headphones_outlined', 'headphones_battery', 'headphones_battery_outlined', 'headphones_connected',
    'headphones_connected_outlined', 'headphones_disconnected', 'headphones_disconnected_outlined', 'headphones_off',
    'headphones_off_outlined', 'headphones_on', 'headphones_on_outlined', 'headphones_wireless',
    'headphones_wireless_outlined', 'headphones_wireless_connected', 'headphones_wireless_connected_outlined',
    'headphones_wireless_disconnected', 'headphones_wireless_disconnected_outlined', 'headphones_wireless_off',
    'headphones_wireless_off_outlined', 'headphones_wireless_on', 'headphones_wireless_on_outlined',
    'globe', 'globe_outlined', 'globe_off', 'globe_off_outlined', 'globe_on', 'globe_on_outlined',
    'globe_asia', 'globe_asia_outlined', 'globe_europe', 'globe_europe_outlined', 'globe_north_america',
    'globe_north_america_outlined', 'globe_south_america', 'globe_south_america_outlined', 'globe_africa',
    'globe_africa_outlined', 'globe_oceania', 'globe_oceania_outlined', 'globe_antarctica', 'globe_antarctica_outlined',
];

// Dark mode toggle functionality
darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

// Check for saved dark mode preference
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
} else if (savedDarkMode === null) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
    localStorage.setItem('darkMode', 'true');
}

// Load saved project name
const savedProjectName = localStorage.getItem('projectName');
if (savedProjectName) {
    projectNameDisplay.textContent = savedProjectName;
}

// Project name inline editing
projectNameDisplay.addEventListener('click', () => {
    startProjectNameEdit();
});

function startProjectNameEdit() {
    const currentText = projectNameDisplay.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-name-input';
    input.value = currentText;
    
    const finishEdit = () => {
        const newText = input.value.trim();
        if (newText) {
            projectNameDisplay.textContent = newText;
            localStorage.setItem('projectName', newText);
        } else {
            projectNameDisplay.textContent = 'Untitled Rack';
            localStorage.removeItem('projectName');
        }
        projectNameDisplay.style.display = '';
        input.remove();
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            projectNameDisplay.style.display = '';
            input.remove();
        }
    });
    
    projectNameDisplay.style.display = 'none';
    projectNameDisplay.parentNode.insertBefore(input, projectNameDisplay);
    input.focus();
    input.select();
}

// Modal management
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// Close modals on backdrop click
[jsonModal, iconModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// JSON Export functionality
exportBtn.addEventListener('click', () => {
    const rackData = {
        projectName: projectNameDisplay.textContent || 'Untitled Rack',
        totalUnits: parseInt(totalUnitsInput.value),
        items: []
    };

    const placedItems = rack.querySelectorAll('.rack-item-placed');
    placedItems.forEach(item => {
        const icon = item.querySelector('.rack-item-icon');
        let iconData = null;
        if (icon) {
            if (icon.dataset.iconType === 'material') {
                iconData = { type: 'material', value: icon.dataset.iconValue || icon.textContent };
            } else if (icon.dataset.iconType === 'url') {
                iconData = { type: 'url', value: icon.dataset.iconValue || (icon.querySelector('img')?.src) };
            } else if (icon.querySelector('img')) {
                iconData = { type: 'url', value: icon.querySelector('img').src };
            } else if (icon.textContent) {
                iconData = { type: 'material', value: icon.textContent };
            }
        }
        rackData.items.push({
            unit: parseInt(item.dataset.unit),
            size: parseInt(item.dataset.size),
            name: item.querySelector('.item-name').textContent,
            icon: iconData
        });
    });

    const jsonString = JSON.stringify(rackData, null, 2);
    jsonTextarea.value = jsonString;
    modalTitle.textContent = 'Export JSON';
    modalImportBtn.style.display = 'none';
    modalCopyBtn.style.display = 'inline-block';
    openModal(jsonModal);
});

// JSON Copy to clipboard
modalCopyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(jsonTextarea.value);
        const originalText = modalCopyBtn.textContent;
        modalCopyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            modalCopyBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        alert('Failed to copy to clipboard');
    }
});

// JSON Import functionality
importBtn.addEventListener('click', () => {
    jsonTextarea.value = '';
    modalTitle.textContent = 'Import JSON';
    modalImportBtn.style.display = 'inline-block';
    modalCopyBtn.style.display = 'none';
    openModal(jsonModal);
});

modalImportBtn.addEventListener('click', () => {
    try {
        const rackData = JSON.parse(jsonTextarea.value);
        
        if (rackData.projectName) {
            projectNameDisplay.textContent = rackData.projectName;
            localStorage.setItem('projectName', rackData.projectName);
        }
        
        if (rackData.totalUnits) {
            totalUnitsInput.value = rackData.totalUnits;
            updateRack();
        }
        
        // Clear existing items
        rack.querySelectorAll('.rack-item-placed').forEach(item => {
            const startUnit = parseInt(item.dataset.unit);
            const size = parseInt(item.dataset.size);
            freeSpaces(startUnit, size);
            item.remove();
        });
        
        // Place imported items
        if (rackData.items && Array.isArray(rackData.items)) {
            rackData.items.forEach(itemData => {
                let iconData = itemData.icon;
                // Handle legacy string format
                if (typeof iconData === 'string') {
                    iconData = { type: 'url', value: iconData };
                }
                placeItem(itemData.unit, itemData.size, itemData.name || `${itemData.size}U Item`, iconData);
            });
        }
        
        closeModal(jsonModal);
        alert('Rack imported successfully!');
    } catch (err) {
        alert('Invalid JSON format. Please check your data.');
        console.error(err);
    }
});

modalCloseBtn.addEventListener('click', () => closeModal(jsonModal));
jsonModal.querySelector('.modal-close').addEventListener('click', () => closeModal(jsonModal));

// Icon picker functionality
function openIconPicker(item) {
    currentIconSelectItem = item;
    populateFavorites();
    populateIconGrid();
    openModal(iconModal);
}

function populateFavorites() {
    iconFavorites.innerHTML = '';
    favoriteIcons.forEach(fav => {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        iconItem.innerHTML = `
            <span class="material-symbols-rounded">${fav.icon}</span>
            <span class="icon-item-name">${fav.name}</span>
        `;
        iconItem.title = fav.name;
        iconItem.addEventListener('click', () => {
            selectIcon(fav.icon, 'material');
        });
        iconFavorites.appendChild(iconItem);
    });
}

function populateIconGrid(searchTerm = '') {
    iconGrid.innerHTML = '';
    const filteredIcons = materialIconsList.filter(iconName => 
        iconName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredIcons.forEach(iconName => {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        iconItem.innerHTML = `
            <span class="material-symbols-rounded">${iconName}</span>
            <span class="icon-item-name">${iconName}</span>
        `;
        iconItem.title = iconName;
        iconItem.addEventListener('click', () => {
            selectIcon(iconName, 'material');
        });
        iconGrid.appendChild(iconItem);
    });
}

iconSearchInput.addEventListener('input', (e) => {
    populateIconGrid(e.target.value);
});

iconUrlBtn.addEventListener('click', () => {
    const url = iconSearchInput.value.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
        selectIcon(url, 'url');
    } else {
        alert('Please enter a valid URL (http://, https://, or data:)');
    }
});

function selectIcon(iconValue, iconType = 'material') {
    if (currentIconSelectItem) {
        // Remove placeholder if exists
        const placeholder = currentIconSelectItem.querySelector('.rack-item-icon[style*="border"]');
        if (placeholder) {
            placeholder.remove();
        }
        
        let iconElement = currentIconSelectItem.querySelector('.rack-item-icon');
        if (!iconElement) {
            iconElement = document.createElement('span');
            iconElement.className = 'rack-item-icon material-symbols-rounded';
            const content = currentIconSelectItem.querySelector('.rack-item-content');
            currentIconSelectItem.insertBefore(iconElement, content);
        }
        
        if (iconType === 'material') {
            iconElement.textContent = iconValue;
            iconElement.className = 'rack-item-icon material-symbols-rounded';
            iconElement.dataset.iconType = 'material';
            iconElement.dataset.iconValue = iconValue;
        } else {
            // Handle URL-based icons
            iconElement.innerHTML = '';
            iconElement.className = 'rack-item-icon';
            const img = document.createElement('img');
            img.src = iconValue;
            img.alt = 'Icon';
            iconElement.appendChild(img);
            iconElement.dataset.iconType = 'url';
            iconElement.dataset.iconValue = iconValue;
        }
        
        iconElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openIconPicker(currentIconSelectItem);
        });
    }
    closeModal(iconModal);
    currentIconSelectItem = null;
    iconSearchInput.value = '';
}

iconModalCloseBtn.addEventListener('click', () => {
    closeModal(iconModal);
    currentIconSelectItem = null;
});
iconModal.querySelector('.modal-close').addEventListener('click', () => {
    closeModal(iconModal);
    currentIconSelectItem = null;
});

function updateRack() {
    const totalUnits = parseInt(totalUnitsInput.value);
    
    // Save current items before clearing
    const currentItems = [];
    rack.querySelectorAll('.rack-item-placed').forEach(item => {
        const icon = item.querySelector('.rack-item-icon');
        let iconData = null;
        if (icon) {
            if (icon.dataset.iconType === 'material') {
                iconData = { type: 'material', value: icon.dataset.iconValue || icon.textContent };
            } else if (icon.dataset.iconType === 'url') {
                iconData = { type: 'url', value: icon.dataset.iconValue || (icon.querySelector('img')?.src) };
            } else if (icon.querySelector('img')) {
                iconData = { type: 'url', value: icon.querySelector('img').src };
            } else if (icon.textContent) {
                iconData = { type: 'material', value: icon.textContent };
            }
        }
        currentItems.push({
            unit: parseInt(item.dataset.unit),
            size: parseInt(item.dataset.size),
            name: item.querySelector('.item-name').textContent,
            icon: iconData
        });
        freeSpaces(parseInt(item.dataset.unit), parseInt(item.dataset.size));
    });
    
    rack.innerHTML = '';
    for (let i = 0; i < totalUnits; i++) {
        const space = document.createElement('div');
        space.className = 'rack-space';
        space.textContent = `${totalUnits - i}U`;
        space.dataset.unit = totalUnits - i;
        space.addEventListener('dragover', dragOver);
        space.addEventListener('dragleave', dragLeave);
        space.addEventListener('drop', drop);
        rack.appendChild(space);
    }
    
    // Set initial rack width
    updateRackWidth();
    
    // Restore items that fit in new rack size
    currentItems.forEach(itemData => {
        if (itemData.unit <= totalUnits && canPlaceItem(itemData.unit, itemData.size)) {
            placeItem(itemData.unit, itemData.size, itemData.name, itemData.icon);
        }
    });
    // Update width again after items are placed
    updateRackWidth();
}

totalUnitsInput.addEventListener('change', updateRack);

rackItems.addEventListener('dragstart', dragStart);
rackItems.addEventListener('touchstart', touchStart, { passive: false });

rack.addEventListener('dragstart', dragStart);
rack.addEventListener('touchstart', touchStart, { passive: false });

document.addEventListener('touchmove', touchMove, { passive: false });
document.addEventListener('touchend', touchEnd);

function dragStart(e) {
    if (e.target.classList.contains('rack-item') || e.target.classList.contains('rack-item-placed')) {
        draggedItem = e.target;
        draggedItemSize = parseInt(e.target.dataset.size);
        e.dataTransfer.setData('text/plain', JSON.stringify({
            size: draggedItemSize,
            isNew: !e.target.classList.contains('rack-item-placed'),
            oldUnit: e.target.dataset.unit ? parseInt(e.target.dataset.unit) : null
        }));
    }
}

function touchStart(e) {
    if (e.target.classList.contains('rack-item') || e.target.classList.contains('rack-item-placed')) {
        e.preventDefault();
        draggedItem = e.target;
        draggedItemSize = parseInt(e.target.dataset.size);
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;

        draggedItemClone = draggedItem.cloneNode(true);
        draggedItemClone.style.position = 'fixed';
        draggedItemClone.style.opacity = '0.8';
        draggedItemClone.style.pointerEvents = 'none';
        document.body.appendChild(draggedItemClone);

        updateDraggedItemPosition(touchStartX, touchStartY);
    }
}

function updateDraggedItemPosition(x, y) {
    if (draggedItemClone) {
        draggedItemClone.style.left = `${x - draggedItemClone.offsetWidth / 2}px`;
        draggedItemClone.style.top = `${y - draggedItemClone.offsetHeight / 2}px`;
    }
}

function dragOver(e) {
    e.preventDefault();
    const targetUnit = parseInt(e.target.dataset.unit);
    highlightSpaces(targetUnit, draggedItemSize);
}

function touchMove(e) {
    if (draggedItem) {
        e.preventDefault();
        const touch = e.touches[0];
        updateDraggedItemPosition(touch.clientX, touch.clientY);
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.classList.contains('rack-space')) {
            const targetUnit = parseInt(targetElement.dataset.unit);
            highlightSpaces(targetUnit, draggedItemSize);
        } else {
            clearHighlights();
        }
    }
}

function dragLeave(e) {
    clearHighlights();
}

function drop(e) {
    e.preventDefault();
    handleDrop(e.target.closest('.rack-space'));
}

function touchEnd(e) {
    if (draggedItem) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.closest('.rack-space')) {
            handleDrop(targetElement.closest('.rack-space'));
        }
        if (draggedItemClone) {
            draggedItemClone.remove();
            draggedItemClone = null;
        }
        draggedItem = null;
    }
    clearHighlights();
}

function handleDrop(targetSpace) {
    if (!targetSpace) return;
    
    clearHighlights();
    const targetUnit = parseInt(targetSpace.dataset.unit);
    
    if (canPlaceItem(targetUnit, draggedItemSize)) {
        if (draggedItem.classList.contains('rack-item')) {
            placeItem(targetUnit, draggedItemSize, `${draggedItemSize}U Item`);
        } else {
            moveItem(parseInt(draggedItem.dataset.unit), targetUnit, draggedItemSize);
        }
    } else {
        alert('Not enough space to place this item here.');
    }
    draggedItemSize = 0;
    draggedItem = null;
}

function highlightSpaces(startUnit, size) {
    clearHighlights();
    const canPlace = canPlaceItem(startUnit, size);
    const highlightClass = canPlace ? 'highlight' : 'highlight-invalid';
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit - i}"]`);
        if (space) {
            space.classList.add(highlightClass);
        }
    }
}

function clearHighlights() {
    rack.querySelectorAll('.highlight, .highlight-invalid').forEach(space => {
        space.classList.remove('highlight', 'highlight-invalid');
    });
}

function canPlaceItem(targetUnit, size) {
    const totalUnits = parseInt(totalUnitsInput.value);
    if (targetUnit - size + 1 < 1) {
        return false;
    }
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${targetUnit - i}"]`);
        if (!space || space.classList.contains('occupied')) {
            return false;
        }
    }
    return true;
}

function placeItem(targetUnit, size, name, iconData = null) {
    const item = createRackItem(targetUnit, size, name, iconData);
    const firstSpace = rack.querySelector(`.rack-space[data-unit="${targetUnit}"]`);
    firstSpace.parentNode.insertBefore(item, firstSpace);
    occupySpaces(targetUnit, size);
    updateRackWidth();
}

function moveItem(oldUnit, newUnit, size) {
    const item = rack.querySelector(`.rack-item-placed[data-unit="${oldUnit}"]`);
    if (item) {
        freeSpaces(oldUnit, size);
        item.dataset.unit = newUnit;
        const firstSpace = rack.querySelector(`.rack-space[data-unit="${newUnit}"]`);
        firstSpace.parentNode.insertBefore(item, firstSpace);
        occupySpaces(newUnit, size);
        updateRackWidth();
    }
}

function createRackItem(unit, size, name, iconData = null) {
    const item = document.createElement('div');
    item.className = 'rack-item-placed';
    item.style.height = `${size * 32}px`;
    
    const content = document.createElement('div');
    content.className = 'rack-item-content';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = name;
    nameSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        startInlineEdit(nameSpan, item);
    });
    
    const sizeSpan = document.createElement('span');
    sizeSpan.textContent = `(${size}U)`;
    sizeSpan.style.opacity = '0.7';
    sizeSpan.style.fontSize = '0.9em';
    
    content.appendChild(nameSpan);
    content.appendChild(sizeSpan);
    
    item.appendChild(content);
    
    // Add icon if provided, otherwise add placeholder
    if (iconData) {
        let iconElement;
        if (iconData.type === 'material' || (typeof iconData === 'string' && !iconData.startsWith('http') && !iconData.startsWith('data:'))) {
            // Material icon
            const iconValue = iconData.type === 'material' ? iconData.value : iconData;
            iconElement = document.createElement('span');
            iconElement.className = 'rack-item-icon material-symbols-rounded';
            iconElement.textContent = iconValue;
            iconElement.dataset.iconType = 'material';
            iconElement.dataset.iconValue = iconValue;
        } else {
            // URL-based icon
            const iconUrl = iconData.type === 'url' ? iconData.value : iconData;
            iconElement = document.createElement('span');
            iconElement.className = 'rack-item-icon';
            iconElement.dataset.iconType = 'url';
            iconElement.dataset.iconValue = iconUrl;
            const img = document.createElement('img');
            img.src = iconUrl;
            img.alt = 'Icon';
            iconElement.appendChild(img);
        }
        iconElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openIconPicker(item);
        });
        item.insertBefore(iconElement, content);
    } else {
        // Add placeholder for icon
        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.className = 'rack-item-icon';
        iconPlaceholder.style.width = '24px';
        iconPlaceholder.style.height = '24px';
        iconPlaceholder.style.border = '1px dashed #999';
        iconPlaceholder.style.borderRadius = '3px';
        iconPlaceholder.style.cursor = 'pointer';
        iconPlaceholder.style.display = 'flex';
        iconPlaceholder.style.alignItems = 'center';
        iconPlaceholder.style.justifyContent = 'center';
        iconPlaceholder.innerHTML = '+';
        iconPlaceholder.title = 'Click to add icon';
        iconPlaceholder.addEventListener('click', (e) => {
            e.stopPropagation();
            openIconPicker(item);
        });
        item.insertBefore(iconPlaceholder, content);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-item';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', removeItem);
    item.appendChild(removeBtn);
    
    item.draggable = true;
    item.dataset.unit = unit;
    item.dataset.size = size;
    item.addEventListener('dblclick', () => {
        startInlineEdit(nameSpan, item);
    });
    
    return item;
}

function updateRackWidth() {
    let maxWidth = 200;
    
    // Measure all placed items to find the widest one
    rack.querySelectorAll('.rack-item-placed').forEach(item => {
        // Temporarily make item visible to measure its content width
        const originalDisplay = item.style.display;
        const originalWidth = item.style.width;
        item.style.display = 'flex';
        item.style.width = 'auto';
        
        // Measure the actual content width
        const contentWidth = item.scrollWidth || item.offsetWidth;
        if (contentWidth > maxWidth) {
            maxWidth = contentWidth;
        }
        
        // Restore original styles
        item.style.display = originalDisplay || '';
        item.style.width = originalWidth || '';
    });
    
    // Calculate the final width (content + padding, capped at 600px)
    // Rack has 10px padding on each side, so we add 20px total
    const rackPadding = 20; // 10px left + 10px right
    const finalWidth = Math.min(maxWidth + rackPadding, 600);
    
    // Set the rack width (this will be the container width)
    rack.style.width = finalWidth + 'px';
    
    // Set all rack spaces to match the rack width (accounting for rack padding)
    const spaceWidth = finalWidth - rackPadding; // Spaces are inside the padding
    rack.querySelectorAll('.rack-space').forEach(space => {
        space.style.width = spaceWidth + 'px';
        space.style.minWidth = spaceWidth + 'px';
    });
    
    // Set all placed items to match the rack width (accounting for rack padding)
    rack.querySelectorAll('.rack-item-placed').forEach(item => {
        item.style.width = spaceWidth + 'px';
        item.style.minWidth = spaceWidth + 'px';
    });
}

function startInlineEdit(nameElement, item) {
    const currentText = nameElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item-name-input';
    input.value = currentText;
    
    const finishEdit = () => {
        const newText = input.value.trim();
        if (newText) {
            nameElement.textContent = newText;
        }
        nameElement.style.display = '';
        input.remove();
        updateRackWidth();
        nameElement.addEventListener('click', (e) => {
            e.stopPropagation();
            startInlineEdit(nameElement, item);
        });
    };
    
    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            nameElement.style.display = '';
            input.remove();
            nameElement.addEventListener('click', (e) => {
                e.stopPropagation();
                startInlineEdit(nameElement, item);
            });
        }
    });
    
    nameElement.style.display = 'none';
    nameElement.parentNode.insertBefore(input, nameElement);
    input.focus();
    input.select();
}

function removeItem(e) {
    e.stopPropagation();
    const item = e.target.closest('.rack-item-placed');
    const startUnit = parseInt(item.dataset.unit);
    const size = parseInt(item.dataset.size);
    freeSpaces(startUnit, size);
    item.remove();
}

function occupySpaces(startUnit, size) {
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit - i}"]`);
        space.classList.add('occupied');
        space.style.display = 'none';
    }
}

function freeSpaces(startUnit, size) {
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit - i}"]`);
        space.classList.remove('occupied');
        space.style.display = 'flex';
    }
}

updateRack();
populateFavorites();
populateIconGrid();
