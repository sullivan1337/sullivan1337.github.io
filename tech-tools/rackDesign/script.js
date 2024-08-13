const rack = document.getElementById('rack');
const totalUnitsInput = document.getElementById('totalUnits');
const rackItems = document.getElementById('rackItems');
let draggedItemSize = 0;

function updateRack() {
    const totalUnits = parseInt(totalUnitsInput.value);
    rack.innerHTML = '';
    for (let i = 0; i < totalUnits; i++) {
        const space = document.createElement('div');
        space.className = 'rack-space';
        space.textContent = `${i + 1}U`;
        space.dataset.unit = i + 1;
        space.addEventListener('dragover', dragOver);
        space.addEventListener('dragleave', dragLeave);
        space.addEventListener('drop', drop);
        rack.appendChild(space);
    }
}

totalUnitsInput.addEventListener('change', updateRack);

rackItems.addEventListener('dragstart', (e) => {
    draggedItemSize = parseInt(e.target.dataset.size);
    e.dataTransfer.setData('text/plain', JSON.stringify({size: draggedItemSize, isNew: true}));
});

rack.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('rack-item-placed')) {
        draggedItemSize = parseInt(e.target.dataset.size);
        e.dataTransfer.setData('text/plain', JSON.stringify({
            size: draggedItemSize,
            isNew: false,
            oldUnit: parseInt(e.target.dataset.unit)
        }));
    }
});

function dragOver(e) {
    e.preventDefault();
    const targetUnit = parseInt(e.target.dataset.unit);
    highlightSpaces(targetUnit, draggedItemSize);
}

function dragLeave(e) {
    clearHighlights();
}

function drop(e) {
    e.preventDefault();
    clearHighlights();
    const data = JSON.parse(e.dataTransfer.getData('text'));
    const size = parseInt(data.size);
    const targetUnit = parseInt(e.target.closest('.rack-space').dataset.unit);
    
    if (canPlaceItem(targetUnit, size)) {
        if (data.isNew) {
            placeItem(targetUnit, size, `${size}U Item`);
        } else {
            moveItem(data.oldUnit, targetUnit, size);
        }
    } else {
        alert('Not enough space to place this item here.');
    }
    draggedItemSize = 0;
}

function highlightSpaces(startUnit, size) {
    clearHighlights();
    const canPlace = canPlaceItem(startUnit, size);
    const highlightClass = canPlace ? 'highlight' : 'highlight-invalid';
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit + i}"]`);
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
    if (targetUnit + size - 1 > parseInt(totalUnitsInput.value)) {
        return false;
    }
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${targetUnit + i}"]`);
        if (!space || (space.classList.contains('occupied') && space.style.display !== 'none')) {
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
    item.innerHTML = `<span class="item-name">${name}</span> (${size}U)`;
    item.draggable = true;
    item.dataset.unit = unit;
    item.dataset.size = size;
    item.addEventListener('dblclick', handleItemClick);
    item.querySelector('.item-name').addEventListener('click', handleItemClick);
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

function occupySpaces(startUnit, size) {
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit + i}"]`);
        space.classList.add('occupied');
        space.style.display = 'none';
    }
}

function freeSpaces(startUnit, size) {
    for (let i = 0; i < size; i++) {
        const space = rack.querySelector(`.rack-space[data-unit="${startUnit + i}"]`);
        space.classList.remove('occupied');
        space.style.display = 'flex';
    }
}

updateRack();