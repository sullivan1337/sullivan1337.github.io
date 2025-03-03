// Canvas and Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sidebar Elements
const levelInfoEl = document.getElementById('level-info');
const livesInfoEl = document.getElementById('lives-info');
const pointsInfoEl = document.getElementById('points-info');
const waveInfoEl = document.getElementById('wave-info');
const newGameBtn = document.getElementById('new-game-btn');
const towerOptions = document.querySelectorAll('.tower-option');
const hoverInfoEl = document.getElementById('hover-info');

// Tower Menu Elements
const towerMenuEl = document.getElementById('tower-menu');
const towerMenuInfoEl = document.getElementById('tower-menu-info');
const towerStatsEl = document.getElementById('tower-stats');
const upgradeBtn = document.getElementById('upgrade-btn');
const sellBtn = document.getElementById('sell-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');

// Grid Settings
const cellSize = 40;
const gridCols = canvas.width / cellSize; // 20
const gridRows = canvas.height / cellSize; // 15

// Game State Variables
let towers = [];      // Placed towers
let enemies = [];     // Active enemies
let projectiles = []; // Projectiles in flight
let pathCells = [];   // Array of {col, row} making up enemy path
let points = 500;
let lives = 20;
let currentLevel = 1;
// Wave variables for enemy spawning:
let waveEnemies = 0;      // total enemies for current wave
let spawnedEnemies = 0;   // how many have been spawned so far
let enemySpawnInterval = 1000; // spawn every second
let lastEnemySpawn = 0;
let waveActive = false;   // is the current wave running?

// Tower Costs
const TOWER_COST = 50;
const UPGRADE_COST = 30;
const SELL_REFUND = 25;

// Tower Type Names
const towerTypeNames = {
  1: "Damage",
  2: "Range",
  3: "Rapid",
  4: "Balanced"
};

let selectedTowerType = 1; // default tower type from gallery
let hoveredTower = null;   // tower currently under mouse
let selectedTower = null;  // tower selected via click (for menu)

// -----------------------
// Utility Functions
// -----------------------
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function getGridCoords(x, y) {
  return {
    col: Math.floor(x / cellSize),
    row: Math.floor(y / cellSize)
  };
}

function cellCenter(col, row) {
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2
  };
}

function formatTowerStats(tower) {
  return `Damage: ${tower.damage} | Range: ${tower.range} | Fire Rate: ${tower.fireRate}ms`;
}

// -----------------------
// Generate a non-self-intersecting, grid-based snaking path.
// For each column, choose a row (step -1, 0, or +1 from previous).
function generatePath() {
  let path = [];
  let startRow = Math.floor(Math.random() * (gridRows - 4)) + 2;
  let prev = { col: 0, row: startRow };
  path.push({ ...prev });
  for (let col = 1; col < gridCols; col++) {
    let step = [-1, 0, 1][Math.floor(Math.random() * 3)];
    let newRow = prev.row + step;
    newRow = Math.max(1, Math.min(gridRows - 2, newRow));
    if (newRow !== prev.row) {
      let verticalStep = newRow > prev.row ? 1 : -1;
      for (let r = prev.row + verticalStep; r !== newRow + verticalStep; r += verticalStep) {
        path.push({ col: col, row: r });
      }
    }
    let current = { col: col, row: newRow };
    path.push(current);
    prev = current;
  }
  return path;
}

// -----------------------
// Draw Grid and Path
// -----------------------
function drawGrid() {
  ctx.strokeStyle = '#ccc';
  for (let c = 0; c <= gridCols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize, 0);
    ctx.lineTo(c * cellSize, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= gridRows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellSize);
    ctx.lineTo(canvas.width, r * cellSize);
    ctx.stroke();
  }
}

function drawPath() {
  ctx.fillStyle = '#999';
  pathCells.forEach(cell => {
    ctx.fillRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
  });
}

// -----------------------
// Tower Class
// -----------------------
class Tower {
  constructor(col, row, type) {
    const pos = cellCenter(col, row);
    this.col = col;
    this.row = row;
    this.x = pos.x;
    this.y = pos.y;
    this.type = type;
    this.typeName = towerTypeNames[type];
    this.level = 1;
    // Set base stats based on tower type:
    switch(this.type) {
      case 1: // Damage
        this.baseRange = 70;
        this.baseDamage = 15;
        this.baseFireRate = 1200;
        break;
      case 2: // Range
        this.baseRange = 100;
        this.baseDamage = 10;
        this.baseFireRate = 1000;
        break;
      case 3: // Rapid
        this.baseRange = 60;
        this.baseDamage = 8;
        this.baseFireRate = 600;
        break;
      case 4: // Balanced
        this.baseRange = 80;
        this.baseDamage = 12;
        this.baseFireRate = 900;
        break;
    }
    this.lastShotTime = 0;
    this.setAttributes();
  }
  setAttributes() {
    switch (this.type) {
      case 1: // Damage oriented
        this.range = this.baseRange + (this.level - 1) * 10;
        this.damage = this.baseDamage + (this.level - 1) * 7;
        this.fireRate = Math.max(300, this.baseFireRate - (this.level - 1) * 100);
        break;
      case 2: // Range
        this.range = this.baseRange + (this.level - 1) * 15;
        this.damage = this.baseDamage;
        this.fireRate = this.baseFireRate;
        break;
      case 3: // Rapid Fire
        this.range = this.baseRange; // remains constant
        this.damage = this.baseDamage + (this.level - 1) * 2;
        this.fireRate = Math.max(200, this.baseFireRate - (this.level - 1) * 100);
        break;
      case 4: // Balanced
        this.range = this.baseRange + (this.level - 1) * 12;
        this.damage = this.baseDamage + (this.level - 1) * 4;
        this.fireRate = Math.max(250, this.baseFireRate - (this.level - 1) * 80);
        break;
    }
  }
  upgrade() {
    if (this.level < 3 && points >= UPGRADE_COST) {
      points -= UPGRADE_COST;
      this.level++;
      this.setAttributes();
    }
  }
  sell() {
    points += SELL_REFUND;
  }
  canShoot(currentTime) {
    return currentTime - this.lastShotTime >= this.fireRate;
  }
  shoot(target, currentTime) {
    if (this.canShoot(currentTime)) {
      projectiles.push(new Projectile(this.x, this.y, target, this.damage));
      this.lastShotTime = currentTime;
    }
  }
  draw() {
    // Draw tower base
    ctx.fillStyle = '#1e90ff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Label with type and level
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    const label = `${this.typeName} L${this.level}`;
    ctx.fillText(label, this.x - cellSize * 0.4, this.y);
  }
  // Draw the range circle for hover
  drawRange() {
    ctx.strokeStyle = 'rgba(30,144,255,0.5)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// -----------------------
// Enemy Class
// -----------------------
class Enemy {
  constructor(isBoss = false) {
    this.path = pathCells.map(cell => cellCenter(cell.col, cell.row));
    this.currentWaypoint = 0;
    const startPos = this.path[0];
    this.x = startPos.x;
    this.y = startPos.y;
    this.isBoss = isBoss;
    this.speed = isBoss ? 0.5 : 1.0;
    this.maxHealth = isBoss ? 200 : 50;
    this.health = this.maxHealth;
    this.reward = isBoss ? 50 : 10;
  }
  update() {
    if (this.currentWaypoint < this.path.length) {
      let target = this.path[this.currentWaypoint];
      let dx = target.x - this.x;
      let dy = target.y - this.y;
      let dist = Math.hypot(dx, dy);
      if (dist < this.speed) {
        this.x = target.x;
        this.y = target.y;
        this.currentWaypoint++;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    }
  }
  draw() {
    ctx.fillStyle = this.isBoss ? '#9932cc' : '#ff4500';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.isBoss ? 15 : 10, 0, Math.PI * 2);
    ctx.fill();
    // Health Bar
    const barWidth = this.isBoss ? 30 : 20;
    const healthRatio = Math.max(0, this.health / this.maxHealth);
    const healthWidth = barWidth * healthRatio;
    ctx.fillStyle = '#32cd32';
    ctx.fillRect(this.x - barWidth / 2, this.y - (this.isBoss ? 25 : 20), healthWidth, 4);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(this.x - barWidth / 2, this.y - (this.isBoss ? 25 : 20), barWidth, 4);
  }
}

// -----------------------
// Projectile Class
// -----------------------
class Projectile {
  constructor(x, y, target, damage) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = 3;
    this.active = true;
  }
  update() {
    if (!this.active || !this.target) return;
    let dx = this.target.x - this.x;
    let dy = this.target.y - this.y;
    let dist = Math.hypot(dx, dy);
    if (dist < this.speed) {
      this.target.health -= this.damage;
      this.active = false;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }
  draw() {
    if (!this.active) return;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// -----------------------
// Game Management & Wave System
// -----------------------
function resetGame(confirmReset = true) {
  if (confirmReset && !confirm("Are you sure you want to start a new game?")) return;
  towers = [];
  enemies = [];
  projectiles = [];
  points = 500;
  lives = 20;
  currentLevel = 1;
  waveEnemies = currentLevel * 5;
  spawnedEnemies = 0;
  enemySpawnInterval = 1000;
  lastEnemySpawn = 0;
  waveActive = true;
  pathCells = generatePath();
}

function updateScoreboard() {
  levelInfoEl.textContent = 'Level: ' + currentLevel;
  livesInfoEl.textContent = 'Lives: ' + lives;
  pointsInfoEl.textContent = 'Points: ' + points;
  let remaining = waveEnemies - spawnedEnemies + enemies.length;
  waveInfoEl.textContent = 'Enemies left: ' + remaining;
}

// Check if the current wave is complete and then progress.
function checkWaveCompletion() {
  if (waveActive && spawnedEnemies >= waveEnemies && enemies.length === 0) {
    currentLevel++;
    points += 20;
    waveEnemies = currentLevel * 5;
    spawnedEnemies = 0;
    waveActive = true;
  }
}

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPath();
  
  // Draw towers (and show range if hovered).
  towers.forEach(tower => {
    tower.draw();
    if (hoveredTower === tower) {
      tower.drawRange();
    }
    let target = enemies.find(enemy => distance(tower.x, tower.y, enemy.x, enemy.y) <= tower.range);
    if (target) {
      tower.shoot(target, timestamp);
    }
  });
  
  // Update and draw enemies.
  enemies.forEach((enemy, i) => {
    enemy.update();
    enemy.draw();
    if (enemy.currentWaypoint >= enemy.path.length) {
      lives--;
      enemies.splice(i, 1);
    } else if (enemy.health <= 0) {
      points += enemy.reward;
      enemies.splice(i, 1);
    }
  });
  
  // Update and draw projectiles.
  projectiles.forEach((proj, i) => {
    proj.update();
    proj.draw();
    if (!proj.active) {
      projectiles.splice(i, 1);
    }
  });
  
  // Spawn enemies if wave is active.
  if (waveActive && timestamp - lastEnemySpawn > enemySpawnInterval && spawnedEnemies < waveEnemies) {
    if (currentLevel % 10 === 0) {
      enemies.push(new Enemy(true));
    } else {
      enemies.push(new Enemy());
    }
    spawnedEnemies++;
    lastEnemySpawn = timestamp;
  }
  
  checkWaveCompletion();
  updateScoreboard();
  
  // If lives run out, offer to restart.
  if (lives <= 0) {
    if (confirm("Game Over! Start a new game?")) {
      resetGame(false);
    } else {
      return;
    }
  }
  
  requestAnimationFrame(gameLoop);
}

// -----------------------
// Tower Placement, Selection, and In-Game Menu
// -----------------------
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const cell = getGridCoords(mouseX, mouseY);
  
  // If a tower exists on this cell, show the in-game menu.
  let clickedTower = towers.find(t => t.col === cell.col && t.row === cell.row);
  if (clickedTower) {
    selectedTower = clickedTower;
    const pos = cellCenter(cell.col, cell.row);
    towerMenuEl.style.left = (pos.x + canvas.offsetLeft + 10) + 'px';
    towerMenuEl.style.top = (pos.y + canvas.offsetTop - 20) + 'px';
    towerMenuInfoEl.textContent = `${clickedTower.typeName} Tower (L${clickedTower.level})`;
    towerStatsEl.textContent = formatTowerStats(clickedTower);
    towerMenuEl.classList.remove('hidden');
    return;
  }
  
  // Hide the tower menu if clicking an empty cell.
  towerMenuEl.classList.add('hidden');
  
  // Prevent tower placement on the path or on an occupied cell.
  let onPath = pathCells.some(p => p.col === cell.col && p.row === cell.row);
  if (onPath || towers.some(t => t.col === cell.col && t.row === cell.row)) return;
  
  // Place a tower if enough points.
  if (points >= TOWER_COST) {
    points -= TOWER_COST;
    towers.push(new Tower(cell.col, cell.row, selectedTowerType));
  } else {
    alert("Not enough points to place a tower!");
  }
});

// In-game tower menu button handlers.
upgradeBtn.addEventListener('click', () => {
  if (selectedTower) {
    selectedTower.upgrade();
    towerMenuInfoEl.textContent = `${selectedTower.typeName} Tower (L${selectedTower.level})`;
    towerStatsEl.textContent = formatTowerStats(selectedTower);
  }
});
sellBtn.addEventListener('click', () => {
  if (selectedTower) {
    selectedTower.sell();
    towers = towers.filter(t => t !== selectedTower);
    towerMenuEl.classList.add('hidden');
  }
});
closeMenuBtn.addEventListener('click', () => {
  towerMenuEl.classList.add('hidden');
});

// Tower Gallery Selection
towerOptions.forEach(option => {
  option.addEventListener('click', () => {
    towerOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    selectedTowerType = parseInt(option.getAttribute('data-type'));
  });
});
document.querySelector('.tower-option[data-type="1"]').classList.add('selected');

// Mouse Move: update hovered tower info for displaying stats.
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const cell = getGridCoords(mouseX, mouseY);
  hoveredTower = towers.find(t => t.col === cell.col && t.row === cell.row) || null;
  if (hoveredTower) {
    hoverInfoEl.textContent = `${hoveredTower.typeName} Tower (L${hoveredTower.level}) - ${formatTowerStats(hoveredTower)}`;
  } else {
    hoverInfoEl.textContent = "";
  }
});

// New Game Button
newGameBtn.addEventListener('click', () => {
  resetGame();
});

// On page load, generate and show the path.
pathCells = generatePath();
resetGame(false);
requestAnimationFrame(gameLoop);
