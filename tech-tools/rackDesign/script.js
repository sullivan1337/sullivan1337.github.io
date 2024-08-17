const rack = document.getElementById('rack');
const totalUnitsInput = document.getElementById('totalUnits');
const rackItems = document.getElementById('rackItems');
const darkModeToggle = document.getElementById('darkModeToggle');
let draggedItemSize = 0;
let draggedItem = null;
let draggedItemClone = null;
let touchStartY = 0;
let touchStartX = 0;

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
    // Enable dark mode by default if no preference is saved
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
    localStorage.setItem('darkMode', 'true');
}

function updateRack() {
    const totalUnits = parseInt(totalUnitsInput.value);
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

function placeItem(targetUnit, size, name) {
    const item = createRackItem(targetUnit, size, name);
    const firstSpace = rack.querySelector(`.rack-space[data-unit="${targetUnit}"]`);
    firstSpace.parentNode.insertBefore(item, firstSpace);
    occupySpaces(targetUnit, size);
}

function moveItem(oldUnit, newUnit, size) {
    const item = rack.querySelector(`.rack-item-placed[data-unit="${oldUnit}"]`);
    if (item) {
        freeSpaces(oldUnit, size);
        item.dataset.unit = newUnit;
        const firstSpace = rack.querySelector(`.rack-space[data-unit="${newUnit}"]`);
        firstSpace.parentNode.insertBefore(item, firstSpace);
        occupySpaces(newUnit, size);
    }
}

function createRackItem(unit, size, name) {
    const item = document.createElement('div');
    item.className = 'rack-item-placed';
    item.style.height = `${size * 32}px`;
    item.innerHTML = `
        <span class="item-name">${name}</span> (${size}U)
        <button class="remove-item">×</button>
    `;
    item.draggable = true;
    item.dataset.unit = unit;
    item.dataset.size = size;
    item.addEventListener('dblclick', handleItemClick);
    item.querySelector('.item-name').addEventListener('click', handleItemClick);
    item.querySelector('.remove-item').addEventListener('click', removeItem);
    return item;
}

function handleItemClick(e) {
    const item = e.target.closest('.rack-item-placed');
    const currentName = item.querySelector('.item-name').textContent;
    const newName = prompt('Enter a new name for this item:', currentName);
    if (newName && newName !== currentName) {
        item.querySelector('.item-name').textContent = newName;
    }
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