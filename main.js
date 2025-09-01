// -------------------- Options & DOM --------------------
const LS_KEY = 'godot_web_options';
const BEST_WAVE_KEY = 'godot_web_best_wave';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');         // main page "Quit"
const quitGameBtn = document.getElementById('quitGameBtn'); // in-game "Quit"
const nextWaveBtn = document.getElementById('nextWaveBtn'); // force next wave
const statsOverlay = document.getElementById('statsOverlay');
const overlayStats = document.getElementById('overlayStats');
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const optGridSize = document.getElementById('optGridSize');
const optGridOverride = document.getElementById('optGridOverride');
const optDifficulty = document.getElementById('optDifficulty');
const saveBtn = document.getElementById('saveOptions');
const menu = document.querySelector('.menu');
const container = document.querySelector('.container');
const hoverMenu = document.getElementById('hoverMenu');
const hoverMenuHeader = document.getElementById('hoverMenuHeader');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const wallBtn = document.getElementById('wallBtn');
const cannonBtn = document.getElementById('cannonBtn');
const laserBtn = document.getElementById('laserBtn');
const rocketBtn = document.getElementById('rocketBtn');
const cancelBuildBtn = document.getElementById('cancelBuildBtn');
const sellBuildBtn = document.getElementById('sellBuildBtn');
const upgradeDamageBtn = document.getElementById('upgradeDamage');
const upgradeFireRateBtn = document.getElementById('upgradeFireRate');
const upgradeRangeBtn = document.getElementById('upgradeRange');
const sellBtn = document.getElementById('sellTower');
const selectedTowerInfo = document.getElementById('selectedTowerInfo');
const damageValue = document.getElementById('damageValue');
const damageNext = document.getElementById('damageNext');
const damageCost = document.getElementById('damageCost');
const fireRateValue = document.getElementById('fireRateValue');
const fireRateNext = document.getElementById('fireRateNext');
const fireRateCost = document.getElementById('fireRateCost');
const rangeValue = document.getElementById('rangeValue');
const rangeNext = document.getElementById('rangeNext');
const rangeCost = document.getElementById('rangeCost');
const basicUpgrades = document.getElementById('basicUpgrades');
const specialUpgrades = document.getElementById('specialUpgrades');
const upgradeSniperBtn = document.getElementById('upgradeSniper');
const upgradeShotgunBtn = document.getElementById('upgradeShotgun');
const upgradeDualLaserBtn = document.getElementById('upgradeDualLaser');
const upgradeRailgunBtn = document.getElementById('upgradeRailgun');
const upgradeNukeBtn = document.getElementById('upgradeNuke');
const upgradeHellfireBtn = document.getElementById('upgradeHellfire');
const sniperCostSpan = document.getElementById('sniperCost');
const shotgunCostSpan = document.getElementById('shotgunCost');
const dualLaserCostSpan = document.getElementById('dualLaserCost');
const railgunCostSpan = document.getElementById('railgunCost');
const nukeCostSpan = document.getElementById('nukeCost');
const hellfireCostSpan = document.getElementById('hellfireCost');
const quitInMenuBtn = document.getElementById('quitInMenuBtn');
const pauseBtn = document.getElementById('pauseBtn');
const contextMenu = document.getElementById('contextMenu');
const contextSellBtn = document.getElementById('contextSell');
const contextStats = document.getElementById('contextStats');
const bestWaveSpan = document.getElementById('bestWave');
const battlefieldBtn = document.getElementById('battlefieldBtn');
const battlefieldDlg = document.getElementById('battlefieldDialog');
const saveBattlefieldBtn = document.getElementById('saveBattlefield');
const MAP_KEY = 'godot_web_battlefield';
const MAPS = {
  backyard: {
    name: 'Backyard',
    img: './assets/maps/backyard/backyard.png',
    grid: 'medium',
    entries: [{ x: 0, y: 0 }],
    catLives() {
      const cols = 3, rows = 3;
      const startCellX = DOGHOUSE_DOOR_CELL.x + 2;
      const yOffset = GRID_ROWS === GRID_SIZES.medium.rows ? 5 : 1;
      const startCellY = DOGHOUSE_DOOR_CELL.y - yOffset;
      const cells = [];
      for (let i = 0; i < cols * rows; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        cells.push({ x: startCellX + col, y: startCellY + row });
      }
      return cells;
    }
  }
};
let currentMap = MAPS.backyard;
let selectedTower = null;
let contextTarget = null;
let rangePreview = null;

let gameCanvas = document.getElementById('gameCanvas'); // can be null initially
let ctx = null;

// -------------------- Grid & Build --------------------
// Fixed logical grid
let GRID_COLS = 36;
// Trim top and bottom rows so only the visible play area is usable
let GRID_ROWS = 24;
let CELL_PX = 26; // fixed pixel size for each grid cell
const NUKE_SPLASH_RADIUS = CELL_PX * 2;
const STRAY_ROCKET_RADIUS = CELL_PX;
let originPx = { x: 0, y: 0 }; // top-left of playfield in pixels

// Occupancy map mirrors walls & towers
let occupancy = new Set();
let walls = [];
let selectedBuild = null;
let towers = [];
let bullets = [];
let smokes = [];
let beams = [];
let explosions = [];
let catLives = [];
let money = 0;
const WALL_COST = 10;
const SPECIALIZATION_COSTS = {
  sniper: 950,
  shotgun: 1200,
  dualLaser: 1500,
  railgun: 2500,
  nuke: 3000,
  hellfire: 2000
};

const DIFFICULTY_SETTINGS = {
  easy: { startingCash: 500, killReward: 15, waveReward: 75, healthMultiplier: 0.8 },
  medium: { startingCash: 350, killReward: 10, waveReward: 50, healthMultiplier: 1 },
  hard: { startingCash: 250, killReward: 8, waveReward: 40, healthMultiplier: 1.2 },
  free: { startingCash: 99999, killReward: 10, waveReward: 50, healthMultiplier: 1 }
};
let difficulty = 'medium';
let difficultySettings = { ...DIFFICULTY_SETTINGS[difficulty] };

sniperCostSpan && (sniperCostSpan.textContent = `$${SPECIALIZATION_COSTS.sniper}`);
shotgunCostSpan && (shotgunCostSpan.textContent = `$${SPECIALIZATION_COSTS.shotgun}`);
dualLaserCostSpan && (dualLaserCostSpan.textContent = `$${SPECIALIZATION_COSTS.dualLaser}`);
railgunCostSpan && (railgunCostSpan.textContent = `$${SPECIALIZATION_COSTS.railgun}`);
nukeCostSpan && (nukeCostSpan.textContent = `$${SPECIALIZATION_COSTS.nuke}`);
hellfireCostSpan && (hellfireCostSpan.textContent = `$${SPECIALIZATION_COSTS.hellfire}`);

// Landmarks
let DOGHOUSE_DOOR_CELL = { x: 28, y: 20 };
let DOGHOUSE_SPAWN_CELL = { x: 27, y: 20 };


const GRID_SIZES = {
  large: { cols: 36, rows: 24 },
  medium: { cols: 30, rows: 20 },
  small: { cols: 24, rows: 16 }
};

function updateLandmarks() {
  DOGHOUSE_DOOR_CELL = { x: GRID_COLS - 8, y: GRID_ROWS - 4 };
  DOGHOUSE_SPAWN_CELL = { x: GRID_COLS - 9, y: GRID_ROWS - 4 };
}

function applyGridSize(size) {
  const g = GRID_SIZES[size] || GRID_SIZES.medium;
  GRID_COLS = g.cols;
  GRID_ROWS = g.rows;
  updateLandmarks();
  initOccupancy();
  resizeCanvas();
}

// Pure helpers ------------------------------------------------------------
const key = (x, y) => `${x},${y}`;
function cellToPx(cell) {
  return {
    x: originPx.x + (cell.x + 0.5) * CELL_PX,
    y: originPx.y + (cell.y + 0.5) * CELL_PX
  };
}
function pxToCell(px) {
  const x = Math.min(
    GRID_COLS - 1,
    Math.max(0, Math.floor((px.x - originPx.x) / CELL_PX))
  );
  const y = Math.min(
    GRID_ROWS - 1,
    Math.max(0, Math.floor((px.y - originPx.y) / CELL_PX))
  );
  return { x, y };
}
function inBounds(cell) {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < GRID_COLS &&
    cell.y < GRID_ROWS
  );
}
function doorPx() { return cellToPx(DOGHOUSE_DOOR_CELL); }
function doorSpawnPx() { return cellToPx(DOGHOUSE_SPAWN_CELL); }

function isWallAt(gx, gy) {
  return occupancy.has(key(gx, gy));
}

function addOccupancy(x, y) {
  occupancy.add(key(x, y));
}
function removeOccupancy(x, y) {
  occupancy.delete(key(x, y));
}

function initOccupancy() {
  // Start with an empty grid; cells become occupied only when walls or towers
  // are placed during gameplay.
  occupancy = new Set();
  walls = [];
}

function removeTowerProjectiles(t) {
  bullets = bullets.filter(b => b.source !== t);
}

function canPlace(cell) {
  if (!inBounds(cell)) return false;
  if (occupancy.has(key(cell.x, cell.y))) return false;
  addOccupancy(cell.x, cell.y);
  const target = catLives.find(l => l.alive);
  const goal = target ? { x: target.gx, y: target.gy } : DOGHOUSE_DOOR_CELL;
  const ok =
    currentMap.entries.every(e => findPath(e, goal).length > 0) &&
    enemies.every(en => findPath(pxToCell({ x: en.x, y: en.y }), goal).length > 0);
  removeOccupancy(cell.x, cell.y);
  return ok;
}

function recalcEnemyPaths() {
  const target = catLives.find(l => l.alive);
  const goal = target ? { x: target.gx, y: target.gy } : DOGHOUSE_DOOR_CELL;
  for (const en of enemies) {
    const start = pxToCell({ x: en.x, y: en.y });
    en.path = findPath(start, goal);
    en.goalCell = goal;
  }
}

// Tower and enemy stats are loaded from external JSON for easier tuning
let CANNON_BASE = { damage: 80, fireRate: 0.5, range: 4, bulletSpeed: 5, cost: 50 };
let LASER_BASE = { damage: 120, fireRate: 0.4, range: 4, cost: 100 };
let ROCKET_BASE = { damage: 200, fireRate: 0.4, range: 5.5, bulletSpeed: 4.5, cost: 175 };
let TOWER_TYPES = [];

function updateBuildButtonLabels() {
  if (wallBtn) wallBtn.textContent = `Wall $${WALL_COST}`;
  if (cannonBtn) cannonBtn.textContent = `Cannon $${CANNON_BASE.cost}`;
  if (laserBtn) laserBtn.textContent = `Laser $${LASER_BASE.cost}`;
  if (rocketBtn) rocketBtn.textContent = `Rocket $${ROCKET_BASE.cost}`;
}
updateBuildButtonLabels();

// Basic BFS pathfinding to navigate around walls
function findPath(start, goal) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const queue = [start];
  let qi = 0;
  const visited = new Set([key(start.x, start.y)]);
  const prev = new Map();
  while (qi < queue.length) {
    const cur = queue[qi++];
    if (cur.x === goal.x && cur.y === goal.y) break;
    for (const [dx,dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_COLS || ny >= GRID_ROWS) continue;
      if (isWallAt(nx, ny)) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      queue.push({x:nx, y:ny});
      prev.set(k, cur);
    }
  }
  const path = [];
  let cur = goal;
  const goalKey = key(goal.x, goal.y);
  if (!prev.has(goalKey) && (goal.x !== start.x || goal.y !== start.y)) return path;
  while (cur.x !== start.x || cur.y !== start.y) {
    path.push(cur);
    const k = key(cur.x, cur.y);
    cur = prev.get(k);
    if (!cur) break;
  }
  path.reverse();
  return path;
}

// -------------------- Small SFX (respects "Mute") --------------------
let audioCtx = null;
function sfx(freq = 440, dur = 0.07, vol = 0.03, type = 'square') {
  const opts = loadOpts();
  if (opts.mute) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

function horn() {
  sfx(350, 0.25, 0.08, 'square');
  setTimeout(() => sfx(220, 0.35, 0.09, 'sawtooth'), 200);
}

function bark() {
  sfx(500, 0.1, 0.05, 'sawtooth');
  setTimeout(() => sfx(400, 0.1, 0.05, 'square'), 70);
}

function rankUp() {
  sfx(1200, 0.15, 0.05, 'sine');
  setTimeout(() => sfx(1500, 0.2, 0.05, 'sine'), 120);
}

function victory() {
  sfx(660, 0.25, 0.06, 'square');
  setTimeout(() => sfx(880, 0.3, 0.06, 'square'), 200);
}

// -------------------- Options helpers --------------------
function loadOpts() {
  const defaults = { mute: false, fullscreen: true, gridSize: 'medium', gridOverride: false, difficulty: 'medium' };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
}
function saveOpts(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }
function syncUI() {
  const o = loadOpts();
  if (optMute) optMute.checked = !!o.mute;
  if (optFullscreen) optFullscreen.checked = !!o.fullscreen;
  if (optGridOverride) optGridOverride.checked = !!o.gridOverride;
  if (optGridSize) {
    optGridSize.value = o.gridSize || 'medium';
    optGridSize.disabled = !o.gridOverride;
  }
  if (optDifficulty) optDifficulty.value = o.difficulty || 'medium';
}
optionsBtn?.addEventListener('click', () => { syncUI(); dlg?.showModal?.(); });
optGridOverride?.addEventListener('change', () => {
  if (optGridSize) optGridSize.disabled = !optGridOverride.checked;
});
saveBtn?.addEventListener('click', () => {
  const override = optGridOverride?.checked;
  const map = loadBattlefield();
  const grid = override ? optGridSize?.value : MAPS[map].grid;
  const difficulty = optDifficulty?.value || 'medium';
  const opts = {
    mute: optMute?.checked,
    fullscreen: optFullscreen?.checked,
    gridSize: grid,
    gridOverride: override,
    difficulty,
    startingCash: DIFFICULTY_SETTINGS[difficulty].startingCash
  };
  saveOpts(opts);
  applyGridSize(grid);
});

function loadBestWave() {
  try {
    return parseInt(localStorage.getItem(BEST_WAVE_KEY), 10) || 0;
  } catch {
    return 0;
  }
}

function recordBestWave(wave) {
  const best = loadBestWave();
  if (wave > best) {
    localStorage.setItem(BEST_WAVE_KEY, wave);
  }
}

function syncBestWave() {
  if (bestWaveSpan) bestWaveSpan.textContent = loadBestWave();
}

function loadBattlefield() {
  try {
    return localStorage.getItem(MAP_KEY) || 'backyard';
  } catch {
    return 'backyard';
  }
}
function saveBattlefield(v) { localStorage.setItem(MAP_KEY, v); }
function setBattlefield(map) {
  const m = MAPS[map] || MAPS.backyard;
  currentMap = m;
  if (gameCanvas) {
    gameCanvas.style.background = `url('${m.img}') center/cover no-repeat`;
  }
}

ensureCanvas();
const initialMap = loadBattlefield();
setBattlefield(initialMap);
const initialOpts = loadOpts();
const initialGrid = initialOpts.gridOverride ? initialOpts.gridSize : MAPS[initialMap].grid;
if (!initialOpts.gridOverride && initialOpts.gridSize !== initialGrid) {
  initialOpts.gridSize = initialGrid;
  saveOpts(initialOpts);
}
applyGridSize(initialGrid);
syncBestWave();


// ----- Hover Menu -----
function activateTab(name) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}
tabButtons.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

wallBtn?.addEventListener('click', () => {
  if (money >= WALL_COST) selectedBuild = 'wall';
});
cannonBtn?.addEventListener('click', () => {
  if (money >= CANNON_BASE.cost) selectedBuild = 'cannon';
});
laserBtn?.addEventListener('click', () => {
  if (money >= LASER_BASE.cost) selectedBuild = 'laser';
});
rocketBtn?.addEventListener('click', () => {
  if (money >= ROCKET_BASE.cost) selectedBuild = 'rocket';
});
sellBuildBtn?.addEventListener('click', () => { selectedBuild = 'sell'; selectedTower = null; updateSelectedTowerInfo(); });
cancelBuildBtn?.addEventListener('click', () => { selectedBuild = null; });

let drag = null;
hoverMenuHeader?.addEventListener('mousedown', (e) => {
  drag = { x: e.offsetX, y: e.offsetY };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
});
function onDrag(e) {
  if (!drag) return;
  hoverMenu.style.left = (e.pageX - drag.x) + 'px';
  hoverMenu.style.top = (e.pageY - drag.y) + 'px';
}
function stopDrag() {
  drag = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

upgradeDamageBtn?.addEventListener('click', () => {
  if (selectedTower && upgradeTower(selectedTower, 'damage')) { rankUp(); updateSelectedTowerInfo(); }
});
upgradeFireRateBtn?.addEventListener('click', () => {
  if (selectedTower && upgradeTower(selectedTower, 'fireRate')) { rankUp(); updateSelectedTowerInfo(); }
});
upgradeRangeBtn?.addEventListener('click', () => {
  if (selectedTower && upgradeTower(selectedTower, 'range')) { rankUp(); updateSelectedTowerInfo(); }
});
upgradeSniperBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'sniper'); updateSelectedTowerInfo(); }
});
upgradeShotgunBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'shotgun'); updateSelectedTowerInfo(); }
});
upgradeDualLaserBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'dualLaser'); updateSelectedTowerInfo(); }
});
upgradeRailgunBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'railgun'); updateSelectedTowerInfo(); }
});
upgradeNukeBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'nuke'); updateSelectedTowerInfo(); }
});
upgradeHellfireBtn?.addEventListener('click', () => {
  if (selectedTower) { specializeTower(selectedTower, 'hellfire'); updateSelectedTowerInfo(); }
});
sellBtn?.addEventListener('click', () => {
  if (selectedTower) {
    const refund = Math.floor((selectedTower.spent || selectedTower.cost || 0) * 0.8);
    money += refund;
    removeOccupancy(selectedTower.gx, selectedTower.gy);
    removeTowerProjectiles(selectedTower);
    towers = towers.filter(t => t !== selectedTower);
    selectedTower = null;
    updateSelectedTowerInfo();
    recalcEnemyPaths();
  }
});
quitInMenuBtn?.addEventListener('click', () => endGame());

pauseBtn?.addEventListener('click', () => {
  if (running) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    pauseBtn.textContent = 'Resume';
  } else {
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(loop);
    pauseBtn.textContent = 'Pause';
  }
});

function updateSelectedTowerInfo() {
  if (!selectedTowerInfo) return;
  if (selectedTower) {
    const isSpecial = ['sniper','shotgun','dualLaser','railgun','nuke','hellfire'].includes(selectedTower.type);
    const fullyUpgraded = ['cannon','laser','rocket'].includes(selectedTower.type) && ['damage','fireRate','range'].every(s => selectedTower.upgrades?.[s] >= 10);
    rangePreview = { x: selectedTower.x, y: selectedTower.y, r: selectedTower.range * CELL_PX };
    if (fullyUpgraded) {
      selectedTowerInfo.textContent = 'Choose specialization';
      if (basicUpgrades) basicUpgrades.style.display = 'none';
      if (specialUpgrades) {
        specialUpgrades.style.display = '';
        const isCannon = selectedTower.type === 'cannon';
        const isLaser = selectedTower.type === 'laser';
        const isRocket = selectedTower.type === 'rocket';
        if (upgradeSniperBtn) {
          upgradeSniperBtn.parentElement && (upgradeSniperBtn.parentElement.style.display = isCannon ? '' : 'none');
          upgradeSniperBtn.disabled = money < SPECIALIZATION_COSTS.sniper;
        }
        if (upgradeShotgunBtn) {
          upgradeShotgunBtn.parentElement && (upgradeShotgunBtn.parentElement.style.display = isCannon ? '' : 'none');
          upgradeShotgunBtn.disabled = money < SPECIALIZATION_COSTS.shotgun;
        }
        if (upgradeDualLaserBtn) {
          upgradeDualLaserBtn.parentElement && (upgradeDualLaserBtn.parentElement.style.display = isLaser ? '' : 'none');
          upgradeDualLaserBtn.disabled = money < SPECIALIZATION_COSTS.dualLaser;
        }
        if (upgradeRailgunBtn) {
          upgradeRailgunBtn.parentElement && (upgradeRailgunBtn.parentElement.style.display = isLaser ? '' : 'none');
          upgradeRailgunBtn.disabled = money < SPECIALIZATION_COSTS.railgun;
        }
        if (upgradeNukeBtn) {
          upgradeNukeBtn.parentElement && (upgradeNukeBtn.parentElement.style.display = isRocket ? '' : 'none');
          upgradeNukeBtn.disabled = money < SPECIALIZATION_COSTS.nuke;
        }
        if (upgradeHellfireBtn) {
          upgradeHellfireBtn.parentElement && (upgradeHellfireBtn.parentElement.style.display = isRocket ? '' : 'none');
          upgradeHellfireBtn.disabled = money < SPECIALIZATION_COSTS.hellfire;
        }
      }
    } else {
      if (basicUpgrades) basicUpgrades.style.display = '';
      if (specialUpgrades) specialUpgrades.style.display = 'none';
      selectedTowerInfo.textContent = isSpecial ? 'Tower Maxed out!' : `Selected: ${selectedTower.type}`;
      const stats = {
        damage: { value: damageValue, next: damageNext, cost: damageCost, btn: upgradeDamageBtn },
        fireRate: { value: fireRateValue, next: fireRateNext, cost: fireRateCost, btn: upgradeFireRateBtn },
        range: { value: rangeValue, next: rangeNext, cost: rangeCost, btn: upgradeRangeBtn }
      };
      for (const [stat, els] of Object.entries(stats)) {
        const lvl = selectedTower.upgrades?.[stat] || 0;
        const curr = selectedTower[stat];
        const next = selectedTower.base[stat] * (1 + 0.1 * (lvl + 1));
        const inc = next - curr;
        if (els.value) {
          els.value.textContent =
            stat === 'fireRate' ? curr.toFixed(2) :
            stat === 'range' ? curr.toFixed(1) :
            Math.round(curr);
        }
        if (els.next) {
          const incText =
            stat === 'fireRate' ? inc.toFixed(2) :
            stat === 'range' ? inc.toFixed(1) :
            Math.round(inc);
          els.next.textContent = isSpecial ? '' : `(+${incText})`;
          els.next.style.display = isSpecial ? 'none' : '';
        }
        if (els.cost) {
          els.cost.textContent = isSpecial ? '' : `$${getUpgradeCost(selectedTower, stat)}`;
          els.cost.style.display = isSpecial ? 'none' : '';
        }
        if (els.btn) {
          if (isSpecial) {
            els.btn.style.display = 'none';
          } else {
            els.btn.style.display = '';
            els.btn.disabled = money < getUpgradeCost(selectedTower, stat) || lvl >= 10;
          }
        }
      }
    }
    if (sellBtn) {
      const refund = Math.floor((selectedTower.spent || selectedTower.cost || 0) * 0.8);
      sellBtn.textContent = `Sell ($${refund})`;
      sellBtn.disabled = false;
    }
  } else {
    selectedTowerInfo.textContent = 'No tower selected';
    rangePreview = null;
    [damageValue, damageNext, damageCost, fireRateValue, fireRateNext, fireRateCost, rangeValue, rangeNext, rangeCost].forEach(el => {
      if (el) el.textContent = '-';
    });
    [upgradeDamageBtn, upgradeFireRateBtn, upgradeRangeBtn].forEach(btn => { if (btn) { btn.disabled = true; btn.style.display = ''; } });
    if (basicUpgrades) basicUpgrades.style.display = '';
    if (specialUpgrades) specialUpgrades.style.display = 'none';
    if (sellBtn) {
      sellBtn.textContent = 'Sell';
      sellBtn.disabled = true;
    }
  }
}

gameCanvas?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!contextMenu || !contextSellBtn || !contextStats) return;
  const r = gameCanvas.getBoundingClientRect();
  const cell = pxToCell({ x: e.clientX - r.left, y: e.clientY - r.top });
  const t = towers.find(tt => tt.gx === cell.x && tt.gy === cell.y);
  const w = walls.find(ww => ww.x === cell.x && ww.y === cell.y);
  if (!t && !w) {
    contextMenu.style.display = 'none';
    contextTarget = null;
    rangePreview = null;
    if (selectedBuild) selectedBuild = null;
    return;
  }
  contextTarget = { gx: cell.x, gy: cell.y };
  if (t) {
    const sellVal = Math.floor((t.spent || t.cost || 0) * 0.8);
    contextStats.innerHTML = `Damage: ${Math.round(t.damage)}<br>Kills: ${t.kills || 0}<br>Sell: $${sellVal}`;
    contextSellBtn.textContent = '$';
    rangePreview = { x: t.x, y: t.y, r: t.range * CELL_PX };
  } else {
    contextStats.innerHTML = `Sell: $${WALL_COST}`;
    contextSellBtn.textContent = '$';
    rangePreview = null;
  }
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.style.display = 'block';
});
document.addEventListener('click', () => {
  if (contextMenu) contextMenu.style.display = 'none';
  contextTarget = null;
  if (selectedTower) {
    rangePreview = { x: selectedTower.x, y: selectedTower.y, r: selectedTower.range * CELL_PX };
  } else {
    rangePreview = null;
  }
});
contextSellBtn?.addEventListener('click', () => {
  if (!contextTarget) return;
  const { gx, gy } = contextTarget;
  const t = towers.find(t => t.gx === gx && t.gy === gy);
  if (t) {
    const refund = Math.floor((t.spent || t.cost || 0) * 0.8);
    money += refund;
    removeOccupancy(gx, gy);
    removeTowerProjectiles(t);
    towers = towers.filter(tt => tt !== t);
    selectedTower = null;
    updateSelectedTowerInfo();
  } else {
    const idx = walls.findIndex(w => w.x === gx && w.y === gy);
    if (idx !== -1) {
      walls.splice(idx, 1);
      removeOccupancy(gx, gy);
      money += WALL_COST;
    }
  }
  recalcEnemyPaths();
  contextMenu.style.display = 'none';
  contextTarget = null;
  rangePreview = null;
});

function getUpgradeCost(t, stat) {
  const base = t.cost || 50;
  const lvl = t.upgrades?.[stat] || 0;
  let cost = Math.floor(base * 0.5 * (lvl + 1));
  if (t.type === 'rocket') cost = Math.floor(cost * 1.5);
  return cost;
}

function upgradeTower(t, stat) {
  if (!t.upgrades) t.upgrades = { damage: 0, fireRate: 0, range: 0 };
  if (!t.base) t.base = { damage: t.damage, fireRate: t.fireRate, range: t.range };
  if (t.upgrades[stat] >= 10) return false;
  const cost = getUpgradeCost(t, stat);
  if (money < cost) return false;
  money -= cost;
  t.spent = (t.spent || t.cost || 0) + cost;
  t.upgrades[stat]++;
  if (t.type === 'rocket' && stat === 'damage') {
    t[stat] = t.base[stat] * (1 + 0.15 * t.upgrades[stat]);
  } else {
    t[stat] = t.base[stat] * (1 + 0.1 * t.upgrades[stat]);
  }
  if (stat === 'range' && rangePreview && selectedTower === t) {
    rangePreview.r = t.range * CELL_PX;
  }
  return true;
}

function specializeTower(t, kind) {
  if (!t.upgrades) return;
  const maxed = ['damage','fireRate','range'].every(s => t.upgrades[s] >= 10);
  if (!maxed) return;
  const cost = SPECIALIZATION_COSTS[kind];
  if (money < cost) return;
  money -= cost;
  t.spent = (t.spent || t.cost || 0) + cost;
  if (t.type === 'cannon') {
    if (kind === 'sniper') {
      const idx = 24; // wave 25 zero-based
      const scale = 1 + idx * HEALTH_SCALE_PER_WAVE;
      t.type = 'sniper';
      t.damage = Math.round(DEFAULT_DOG_STATS.baseHealth * scale);
      t.fireRate = 0.6;
      t.range = t.range * 1.5;
    } else if (kind === 'shotgun') {
      t.type = 'shotgun';
      t.damage = Math.round(t.damage * 1.5);
      // fireRate unchanged; reduce range for close-quarters spread
      t.range = 4.5;
    }
  } else if (t.type === 'laser') {
    if (kind === 'dualLaser') {
      t.type = 'dualLaser';
      t.damage = Math.round(t.damage * 1.2);
      t.fireRate = t.fireRate * 2;
      // range unchanged
    } else if (kind === 'railgun') {
      t.type = 'railgun';
      t.damage = Math.round(t.damage * 4);
      t.fireRate = t.fireRate * 0.5;
      // range unchanged
    }
  } else if (t.type === 'rocket') {
    if (kind === 'nuke') {
      const idx = 24; // wave 25 zero-based
      const scale = 1 + idx * HEALTH_SCALE_PER_WAVE;
      removeTowerProjectiles(t);
      t.type = 'nuke';
      t.damage = Math.round(DEFAULT_DOG_STATS.baseHealth * scale);
      t.fireRate = 0.6;
      // range unchanged
    } else if (kind === 'hellfire') {
      t.type = 'hellfire';
      // moderate fire rate boost
      t.fireRate = t.fireRate * 1.5;
      // damage unchanged
    } else {
      return;
    }
  } else {
    return;
  }
  t.base = { damage: t.damage, fireRate: t.fireRate, range: t.range };
  t.upgrades = { damage: 0, fireRate: 0, range: 0 };
}

// -------------------- Canvas setup --------------------
function ensureCanvas() {
  if (!gameCanvas) {
    gameCanvas = document.createElement('canvas');
    gameCanvas.id = 'gameCanvas';
    document.body.appendChild(gameCanvas);
  }
  if (!ctx) ctx = gameCanvas.getContext('2d');
  return gameCanvas;
}
function resizeCanvas() {
  if (!gameCanvas || !ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const vp = window.visualViewport;
  const scale = vp?.scale || 1;
  const w = Math.max(
    320,
    Math.floor((vp ? vp.width * scale : window.innerWidth * scale))
  );
  const h = Math.max(
    240,
    Math.floor((vp ? vp.height * scale : window.innerHeight * scale))
  );
  gameCanvas.style.width = w + 'px';
  gameCanvas.style.height = h + 'px';
  gameCanvas.width = Math.floor(w * ratio);
  gameCanvas.height = Math.floor(h * ratio);
  gameCanvas.style.transformOrigin = '0 0';
  gameCanvas.style.transform = `scale(${1 / scale})`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // draw in CSS pixels
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textBaseline = 'top';
  const playW = CELL_PX * GRID_COLS;
  const playH = CELL_PX * GRID_ROWS;
  originPx = {
    x: Math.floor((w - playW) / 2),
    y: Math.floor((h - playH) / 2 + h * 0.15)
  };
  towers.forEach(t => {
    const p = cellToPx({ x: t.gx, y: t.gy });
    t.x = p.x; t.y = p.y;
  });
  catLives.forEach(l => {
    const p = cellToPx({ x: l.gx, y: l.gy });
    l.x = p.x; l.y = p.y; l.r = CELL_PX / 2;
  });
}
function cssCenter() {
  const w = gameCanvas?.clientWidth || window.innerWidth;
  const h = gameCanvas?.clientHeight || window.innerHeight;
  return { x: w / 2, y: h / 2 };
}

// -------------------- Enemy definitions & asset loader --------------------
// Add new dog heads here. Omit baseHealth/baseSpeed to use balanced defaults.
let DEFAULT_DOG_STATS = { baseHealth: 100, baseSpeed: 1.0 };
let DOG_TYPES = [];
const CAT_SRC = 'assets/animals/cat.png';
const CANNON_BASE_SRC = 'assets/towers/bases/cannon.svg';
const CANNON_TURRET_SRC = 'assets/towers/turrets/cannon.svg';
const LASER_BASE_SRC = 'assets/towers/bases/laser.svg';
const LASER_TURRET_SRC = 'assets/towers/turrets/laser.svg';
const ROCKET_BASE_SRC = 'assets/towers/bases/rocket.svg';
const ROCKET_TURRET_SRC = 'assets/towers/turrets/rocket.svg';
const NUKE_BASE_SRC = 'assets/towers/bases/nuke.svg';
const NUKE_TURRET_SRC = 'assets/towers/turrets/nuke.svg';
const HELLFIRE_BASE_SRC = 'assets/towers/bases/hellfire.svg';
const HELLFIRE_TURRET_SRC = 'assets/towers/turrets/hellfire.svg';
const DUAL_LASER_BASE_SRC = 'assets/towers/bases/laser_dual.svg';
const DUAL_LASER_TURRET_SRC = 'assets/towers/turrets/laser_dual.svg';
const RAILGUN_BASE_SRC = 'assets/towers/bases/railgun.svg';
const RAILGUN_TURRET_SRC = 'assets/towers/turrets/railgun.svg';
const WALL_SRC = 'assets/wall.svg';
const SNIPER_BASE_SRC = 'assets/towers/bases/sniper.svg';
const SNIPER_TURRET_SRC = 'assets/towers/turrets/sniper.svg';
const SHOTGUN_BASE_SRC = 'assets/towers/bases/shotgun.svg';
const SHOTGUN_TURRET_SRC = 'assets/towers/turrets/shotgun.svg';
const TOWER_CONFIG_IDS = ['cannon', 'laser', 'rocket'];

let DATA_LOADED = false;
async function loadData() {
  if (DATA_LOADED) return;
  try {
    const towerPromises = TOWER_CONFIG_IDS.map(id =>
      fetch(`data/towers/${id}.json`).then(r => r.json())
    );
    const [towerJson, dogJson] = await Promise.all([
      Promise.all(towerPromises),
      fetch('assets/enemies/enemies.json').then(r => r.json())
    ]);
    if (Array.isArray(towerJson)) {
      TOWER_TYPES = towerJson;
      const cannon = TOWER_TYPES.find(t => t.id === 'cannon');
      if (cannon) CANNON_BASE = { ...CANNON_BASE, ...cannon };
      const laser = TOWER_TYPES.find(t => t.id === 'laser');
      if (laser) LASER_BASE = { ...LASER_BASE, ...laser };
      const rocket = TOWER_TYPES.find(t => t.id === 'rocket');
      if (rocket) ROCKET_BASE = { ...ROCKET_BASE, ...rocket };
      updateBuildButtonLabels();
    }
    if (dogJson) {
      DEFAULT_DOG_STATS = { ...DEFAULT_DOG_STATS, ...(dogJson.default || {}) };
      DOG_TYPES = Array.isArray(dogJson.types) ? dogJson.types : [];
    }
  } catch (err) {
    console.warn('Failed to load data files', err);
  }
  DATA_LOADED = true;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    // If your assets are on a different origin and you use COEP/COOP,
    // you’ll need CORS headers on the server and this:
    // img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // treat as missing, don't crash
    img.src = src;
    // If the browser supports decode(), use it for reliable readiness.
    if (img.decode) img.decode().then(() => resolve(img)).catch(() => resolve(null));
  });
}

let ASSETS = {
  dogs: [],
  cat: null,
  wall: null,
  cannon: { base: null, turret: null },
  laser: { base: null, turret: null },
  rocket: { base: null, turret: null },
  nuke: { base: null, turret: null },
  hellfire: { base: null, turret: null },
  dualLaser: { base: null, turret: null },
  railgun: { base: null, turret: null },
  sniper: { base: null, turret: null },
  shotgun: { base: null, turret: null }
};
let assetsReady; // Promise

async function ensureAssets() {
  await loadData();
  if (!assetsReady) {
    assetsReady = (async () => {
        const dogImgs = await Promise.all(DOG_TYPES.map(t => loadImage(t.src)));
        dogImgs.forEach((img, i) => { DOG_TYPES[i].img = img; });
        ASSETS = {
          dogs: DOG_TYPES,
          cat: await loadImage(CAT_SRC),
          wall: await loadImage(WALL_SRC),
          cannon: { base: await loadImage(CANNON_BASE_SRC), turret: await loadImage(CANNON_TURRET_SRC) },
          laser: { base: await loadImage(LASER_BASE_SRC), turret: await loadImage(LASER_TURRET_SRC) },
          rocket: { base: await loadImage(ROCKET_BASE_SRC), turret: await loadImage(ROCKET_TURRET_SRC) },
          nuke: { base: await loadImage(NUKE_BASE_SRC), turret: await loadImage(NUKE_TURRET_SRC) },
          hellfire: { base: await loadImage(HELLFIRE_BASE_SRC), turret: await loadImage(HELLFIRE_TURRET_SRC) },
          dualLaser: { base: await loadImage(DUAL_LASER_BASE_SRC), turret: await loadImage(DUAL_LASER_TURRET_SRC) },
          railgun: { base: await loadImage(RAILGUN_BASE_SRC), turret: await loadImage(RAILGUN_TURRET_SRC) },
          sniper: { base: await loadImage(SNIPER_BASE_SRC), turret: await loadImage(SNIPER_TURRET_SRC) },
          shotgun: { base: await loadImage(SHOTGUN_BASE_SRC), turret: await loadImage(SHOTGUN_TURRET_SRC) }
        };
    })();
  }
  return assetsReady;
}

function imgReady(img) {
  // drawImage can throw if image failed decode; check both flags
  return !!img && img.complete && img.naturalWidth > 0;
}

// -------------------- Tiny Dodge Game --------------------
const WAVE_TIME = 60; // seconds per wave
const ENEMIES_PER_WAVE = 10;
const START_DELAY = 15; // secs before first wave
const SPAWN_INTERVAL = 0.5; // seconds between enemy spawns
const POST_WAVE_DELAY = 5; // delay after a wave clears
let rafId = null;
let lastT = 0;
let running = false;

let waveActive = false;
let preWaveTimer = START_DELAY;
let waveElapsed = 0; // time into current wave
let waveIndex = 0;
let enemiesSpawnedInWave = 0;
let spawnTimer = 0; // secs until next spawn
let spawnInterval = SPAWN_INTERVAL;
let firstPlacementDone = false;

const player = { x: 0, y: 0, r: 0 };
let mouse = { x: 0, y: 0, active: false };
let enemies = [];
const INITIAL_LIVES = 9;
let killReward = 0;
let healthBuffMultiplier = 1;

function resetGame() {
  enemies = [];
  selectedBuild = null;
  towers = [];
  bullets = [];
  smokes = [];
  explosions = [];
  const opts = loadOpts();
  difficulty = opts.difficulty || 'medium';
  difficultySettings = { ...DIFFICULTY_SETTINGS[difficulty] };
  money = difficultySettings.startingCash;
  killReward = difficultySettings.killReward;
  healthBuffMultiplier = 1;
  selectedTower = null;
  updateSelectedTowerInfo();
  initOccupancy();
  waveActive = false;
  preWaveTimer = START_DELAY;
  waveElapsed = 0;
  waveIndex = 0;
  enemiesSpawnedInWave = 0;
  spawnInterval = SPAWN_INTERVAL;
  spawnTimer = 0;
  firstPlacementDone = false;
  const c = cssCenter();
  player.x = c.x; player.y = c.y; player.r = 0;
  mouse = { x: c.x, y: c.y, active: false };

  // place initial cat lives at map-specific locations
  catLives = [];
  for (const cell of currentMap.catLives()) {
    const p = cellToPx(cell);
    catLives.push({ x: p.x, y: p.y, r: CELL_PX / 2, alive: true, gx: cell.x, gy: cell.y });
  }
}

function spawnEnemy() {
  const entry = currentMap.entries[0];
  const p = cellToPx(entry);
  const r = CELL_PX / 2;
  const waveNum = waveIndex + 1;
  let type;
  if (waveNum % 5 === 0) {
    type = ASSETS.dogs.find(t => t.id === 'boss') || {};
  } else {
    const nonBoss = ASSETS.dogs.filter(t => t.id !== 'boss');
    const nonBossIndex = (waveNum - 1) - Math.floor((waveNum - 1) / 5);
    type = nonBoss[nonBossIndex % nonBoss.length] || {};
  }
  const stats = { ...DEFAULT_DOG_STATS, ...type };
  const img = imgReady(type.img) ? type.img : null;
  const speed = 2.5 * stats.baseSpeed; // cells per second
  let health = stats.baseHealth * difficultySettings.healthMultiplier * healthBuffMultiplier;
  const target = catLives.find(l => l.alive);
  const goalCell = target ? { x: target.gx, y: target.gy } : DOGHOUSE_DOOR_CELL;
  const path = findPath(entry, goalCell);

  enemies.push({ x: p.x, y: p.y, r, speed, img, path, goalCell, health, velX: 0, velY: 0 });
  enemiesSpawnedInWave++;
}

function startWave() {
  waveActive = true;
  preWaveTimer = 0;
  waveElapsed = 0;
  enemiesSpawnedInWave = 0;
  spawnTimer = 0;
  spawnInterval = SPAWN_INTERVAL;
  beams = [];
  horn();
}

function nextWave() {
  const completedWave = waveIndex + 1;
  const nextWaveNum = waveIndex + 2;
  const stageNext = nextWaveNum >= 30 ? 3 : nextWaveNum > 20 ? 2 : 1;
  // increase kill reward slightly every wave
  killReward += stageNext === 3 ? 3 : stageNext === 2 ? 2 : 1;
  if (completedWave % 5 === 0) {
    const stageCompleted = completedWave >= 30 ? 3 : completedWave > 20 ? 2 : 1;
    const healthInc = stageCompleted === 3 ? 0.025 : stageCompleted === 2 ? 0.05 : 0.1;
    healthBuffMultiplier *= 1 + healthInc;
    killReward += stageCompleted === 3 ? 20 : stageCompleted === 2 ? 10 : 5;
    money += stageCompleted === 3 ? 100 : stageCompleted === 2 ? 500 : 0;
  }
  waveIndex++;
  waveActive = false;
  preWaveTimer = POST_WAVE_DELAY;
  waveElapsed = 0;
}

function updateProjectiles(dt) {
  bullets = bullets.filter(b => {
    if (b.type === 'rocket') {
      b.speed = Math.min(b.maxSpeed, b.speed + b.accel * dt);
      const move = b.speed * dt;

      const needsNewTarget =
        !b.target ||
        !enemies.includes(b.target) ||
        b.target.health <= 0;

      if (needsNewTarget) {
        b.target = null;
        let closest = null;
        let closestDist = Infinity;
        const maxSearchDist = 800;
        for (const e of enemies) {
          if (e.health <= 0) continue;
          const dx = e.x - b.x;
          const dy = e.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxSearchDist * maxSearchDist) continue;
          if (distSq < closestDist) {
            closestDist = distSq;
            closest = e;
          }
        }
        b.target = closest;
        if (b.target) {
          b.orbitCenter = null;
        } else {
          if (!b.orbitCenter) {
            b.orbitCenter = { x: b.x, y: b.y };
            b.orbitAng = b.angle || 0;
          }
          b.orbitAng += (b.speed / STRAY_ROCKET_RADIUS) * dt;
          b.x = b.orbitCenter.x + Math.cos(b.orbitAng) * STRAY_ROCKET_RADIUS;
          b.y = b.orbitCenter.y + Math.sin(b.orbitAng) * STRAY_ROCKET_RADIUS;
          b.angle = b.orbitAng + Math.PI / 2;
          b.smoke -= dt;
          if (b.smoke <= 0) {
            smokes.push({ x: b.x, y: b.y, life: 0.5 });
            b.smoke = 0.05;
          }
          if (
            b.x < originPx.x ||
            b.x > originPx.x + GRID_COLS * CELL_PX ||
            b.y < originPx.y ||
            b.y > originPx.y + GRID_ROWS * CELL_PX
          ) {
            return false;
          }
          return true;
        }
      }

      const targetVelX = b.target.velX || 0;
      const targetVelY = b.target.velY || 0;
      const distToTarget = Math.hypot(b.target.x - b.x, b.target.y - b.y);
      const leadTime = distToTarget / b.speed;
      const predictedX = b.target.x + targetVelX * leadTime * 0.5;
      const predictedY = b.target.y + targetVelY * leadTime * 0.5;

      const desired = Math.atan2(predictedY - b.y, predictedX - b.x);
      let diff = ((desired - b.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
      const turnRateMultiplier = Math.min(2.0, Math.max(0.5, 200 / distToTarget));
      const maxTurn = b.turnRate * turnRateMultiplier * dt;
      if (diff > maxTurn) diff = maxTurn;
      if (diff < -maxTurn) diff = -maxTurn;
      b.angle += diff;

      b.x += Math.cos(b.angle) * move;
      b.y += Math.sin(b.angle) * move;

      b.smoke -= dt;
      if (b.smoke <= 0) {
        smokes.push({ x: b.x, y: b.y, life: 0.5 });
        b.smoke = 0.05;
      }

      const newDist = Math.hypot(b.target.x - b.x, b.target.y - b.y);
      const hitRadius = b.target.r + 2;
      if (newDist <= hitRadius) {
        b.target.health -= b.damage;
        bark();
        if (b.variant === 'nuke') {
          const targetX = b.target.x;
          const targetY = b.target.y;
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e !== b.target && Math.hypot(e.x - targetX, e.y - targetY) <= NUKE_SPLASH_RADIUS) {
                e.health -= b.damage * 0.8;
                if (e.health <= 0) {
                  enemies.splice(i, 1);
                  money += killReward;
                  if (b.source) b.source.kills = (b.source.kills || 0) + 1;
                }
            }
          }
          explosions.push({ x: targetX, y: targetY, life: 0.3, max: 0.3 });
        }
        if (b.target.health <= 0) {
          const targetIndex = enemies.indexOf(b.target);
          if (targetIndex !== -1) {
            enemies.splice(targetIndex, 1);
            money += killReward;
            if (b.source) b.source.kills = (b.source.kills || 0) + 1;
          }
        }
        return false;
      }
      return true;
    }
    if (b.straight) {
      const move = b.speed * dt;
      b.x += b.dx * move;
      b.y += b.dy * move;
      for (const e of enemies) {
        if (Math.hypot(e.x - b.x, e.y - b.y) <= e.r) {
          e.health -= b.damage;
          bark();
          if (e.health <= 0) {
            enemies.splice(enemies.indexOf(e), 1);
            money += killReward;
            if (b.source) b.source.kills = (b.source.kills || 0) + 1;
          }
          return false;
        }
      }
      if (
        b.x < originPx.x ||
        b.x > originPx.x + GRID_COLS * CELL_PX ||
        b.y < originPx.y ||
        b.y > originPx.y + GRID_ROWS * CELL_PX
      ) {
        return false;
      }
      return true;
    }
    if (!b.target || !enemies.includes(b.target)) return false;
    const move = b.speed * dt;
    const dx = b.target.x - b.x;
    const dy = b.target.y - b.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= move) {
      b.target.health -= b.damage;
      bark();
      if (b.target.health <= 0) {
        enemies.splice(enemies.indexOf(b.target), 1);
        money += killReward;
        if (b.source) b.source.kills = (b.source.kills || 0) + 1;
      }
      return false;
    }
    b.x += (dx / dist) * move;
    b.y += (dy / dist) * move;
    return true;
  });

  smokes = smokes.filter(s => {
    s.life -= dt;
    return s.life > 0;
  });

  explosions = explosions.filter(e => {
    e.life -= dt;
    return e.life > 0;
  });

  beams = beams.filter(b => {
    b.time -= dt;
    return b.time > 0;
  });
}

function update(dt) {
  if (mouse.active) {
    player.x += (mouse.x - player.x) * Math.min(1, dt*8);
    player.y += (mouse.y - player.y) * Math.min(1, dt*8);
  }

  const enemiesPerWave = ((waveIndex + 1) % 5 === 0) ? 1 : ENEMIES_PER_WAVE;

  if (waveActive) {
    waveElapsed += dt;
    spawnTimer -= dt;
    while (spawnTimer <= 0 && enemiesSpawnedInWave < enemiesPerWave) {
      spawnEnemy();
      spawnTimer += spawnInterval;
    }
  }

  const liveTargets = catLives.filter(l => l.alive);
  enemies = enemies.filter(e => {
    const target = liveTargets[0];
    if (!target) return false;

    const goalCell = { x: target.gx, y: target.gy };
    const curCell = pxToCell({ x: e.x, y: e.y });

    if (
      !e.path ||
      !e.path.length ||
      !e.goalCell ||
      e.goalCell.x !== goalCell.x ||
      e.goalCell.y !== goalCell.y
    ) {
      e.path = findPath(curCell, goalCell);
      e.goalCell = goalCell;
    }

    if (e.path && e.path.length && isWallAt(e.path[0].x, e.path[0].y)) {
      e.path = findPath(curCell, goalCell);
      e.goalCell = goalCell;
    }

    let dest = cellToPx(goalCell);
    if (e.path && e.path.length) {
      dest = cellToPx(e.path[0]);
    }

    const prevX = e.x, prevY = e.y;
    const dx = dest.x - e.x;
    const dy = dest.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = e.speed * CELL_PX * dt;
    if (d <= move) {
      e.x = dest.x;
      e.y = dest.y;
      if (e.path && e.path.length) e.path.shift();
    } else {
      e.x += (dx / d) * move;
      e.y += (dy / d) * move;
    }
    const gx = pxToCell({ x: e.x, y: e.y });
    if (isWallAt(gx.x, gx.y)) {
      e.x = prevX; e.y = prevY;
      e.path = findPath(curCell, goalCell);
    }

    e.velX = (e.x - prevX) / dt;
    e.velY = (e.y - prevY) / dt;

    const dtgt = Math.hypot(target.x - e.x, target.y - e.y);
    if (dtgt < e.r + target.r) {
      target.alive = false;
      sfx(160, 0.15, 0.06, 'sawtooth');
      return false;
    }

    return true;
  });

  // Tower behavior
  for (const t of towers) {
    t.cooldown -= dt;
    if (t.anim) t.anim -= dt;
    const rangePx = t.range * CELL_PX;
    let target = null;
    let closest = rangePx;
    for (const e of enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= closest) { target = e; closest = d; }
    }
    t.target = target;
    if (target) {
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
    }
    if (t.type === 'rocket' || t.type === 'hellfire' || t.type === 'nuke') {
      const isHellfire = t.type === 'hellfire';
      const isRocket = t.type === 'rocket';
      const hasCap = isHellfire ? true : t.upgrades.range >= 5 && t.upgrades.fireRate >= 3;
      const cap = isHellfire ? 5 : (isRocket && hasCap ? 3 : 0);
      const existing = bullets.filter(b => b.type === 'rocket' && b.source === t).length;
      const maxSpeed = ROCKET_BASE.bulletSpeed * CELL_PX;
      const baseAngle = t.type === 'nuke' ? -Math.PI / 2 : (t.angle || 0);
      const sx = t.x + Math.cos(baseAngle) * (CELL_PX / 2);
      const sy = t.y + Math.sin(baseAngle) * (CELL_PX / 2);
      if (cap > 0) {
        if (existing < cap && t.cooldown <= 0) {
          bullets.push({
            x: sx,
            y: sy,
            target,
            speed: maxSpeed * 0.2,
            maxSpeed,
            accel: maxSpeed,
            damage: t.damage,
            source: t,
            type: 'rocket',
            angle: baseAngle,
            turnRate: Math.PI,
            smoke: 0,
            variant: t.type
          });
          t.cooldown = 1 / t.fireRate;
          t.anim = 0.1;
          sfx(200, 0.2, 0.04, 'sawtooth');
        }
      } else if (t.cooldown <= 0 && target) {
        bullets.push({
          x: sx,
          y: sy,
          target,
          speed: maxSpeed * 0.2,
          maxSpeed,
          accel: maxSpeed,
          damage: t.damage,
          source: t,
          type: 'rocket',
          angle: baseAngle,
          turnRate: Math.PI,
          smoke: 0,
          variant: t.type
        });
        t.cooldown = 1 / t.fireRate;
        t.anim = 0.1;
        sfx(200, 0.2, 0.04, 'sawtooth');
      }
    } else if (t.cooldown <= 0 && target) {
      const angle = t.angle;
      if (t.type === 'laser' || t.type === 'dualLaser') {
        target.health -= t.damage;
        bark();
        if (t.type === 'dualLaser') {
          const perp = angle + Math.PI / 2;
          const offset = t.alt ? 5 : -5;
          const x1 = t.x + Math.cos(perp) * offset + Math.cos(angle) * (CELL_PX / 2);
          const y1 = t.y + Math.sin(perp) * offset + Math.sin(angle) * (CELL_PX / 2);
          t.alt = !t.alt;
          beams.push({ x1, y1, x2: target.x, y2: target.y, time: 0.05 });
        } else {
          const x1 = t.x + Math.cos(angle) * (CELL_PX / 2);
          const y1 = t.y + Math.sin(angle) * (CELL_PX / 2);
          beams.push({ x1, y1, x2: target.x, y2: target.y, time: 0.05 });
        }
        t.cooldown = 1 / t.fireRate;
        sfx(1200, 0.05, 0.04, 'sine');
        if (target.health <= 0) {
            enemies.splice(enemies.indexOf(target), 1);
            money += killReward;
            t.kills = (t.kills || 0) + 1;
        }
      } else if (t.type === 'railgun') {
        const angle = t.angle;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const sx = t.x + dx * (CELL_PX / 2);
        const sy = t.y + dy * (CELL_PX / 2);
        // Determine where the beam hits the edge of the grid
        const minX = originPx.x;
        const maxX = originPx.x + GRID_COLS * CELL_PX;
        const minY = originPx.y;
        const maxY = originPx.y + GRID_ROWS * CELL_PX;
        let edgeT = Infinity;
        if (dx > 0) edgeT = Math.min(edgeT, (maxX - sx) / dx);
        else if (dx < 0) edgeT = Math.min(edgeT, (minX - sx) / dx);
        if (dy > 0) edgeT = Math.min(edgeT, (maxY - sy) / dy);
        else if (dy < 0) edgeT = Math.min(edgeT, (minY - sy) / dy);
        const endX = sx + dx * edgeT;
        const endY = sy + dy * edgeT;
        // Damage every enemy intersected by the beam up to the edge
        for (const e of [...enemies]) {
          const ex = e.x - sx;
          const ey = e.y - sy;
          const along = ex * dx + ey * dy;
          const perp = Math.abs(ex * dy - ey * dx);
          if (along > 0 && along <= edgeT && perp <= e.r) {
            e.health -= t.damage;
            bark();
            if (e.health <= 0) {
                enemies.splice(enemies.indexOf(e), 1);
                money += killReward;
                t.kills = (t.kills || 0) + 1;
            }
          }
        }
        // Railgun beam is wider for a more powerful visual effect
        beams.push({ x1: sx, y1: sy, x2: endX, y2: endY, time: 0.1, width: 10, colors: ['#ff0','#f0f','#0ff'] });
        t.cooldown = 1 / t.fireRate;
        sfx(300, 0.2, 0.04, 'sawtooth');
      } else if (t.type === 'shotgun') {
        const angle = t.angle;
        const spread = Math.PI / 12;
        for (let i = -1; i <= 1; i++) {
          const ang = angle + i * spread;
          const sx = t.x + Math.cos(ang) * (CELL_PX / 2);
          const sy = t.y + Math.sin(ang) * (CELL_PX / 2);
          bullets.push({ x: sx, y: sy, dx: Math.cos(ang), dy: Math.sin(ang), speed: CANNON_BASE.bulletSpeed * CELL_PX, damage: t.damage, source: t, straight: true });
        }
        t.cooldown = 1 / t.fireRate;
        sfx(880, 0.07, 0.03, 'square');
      } else {
        const angle = t.angle;
        const sx = t.x + Math.cos(angle) * (CELL_PX / 2);
        const sy = t.y + Math.sin(angle) * (CELL_PX / 2);
        bullets.push({ x: sx, y: sy, target, speed: CANNON_BASE.bulletSpeed * CELL_PX, damage: t.damage, source: t });
        t.cooldown = 1 / t.fireRate;
        sfx(880, 0.07, 0.03, 'square');
      }
    }
  }

  updateProjectiles(dt);
  if (!waveActive) {
    if (!firstPlacementDone) return;
    preWaveTimer -= dt;
    if (preWaveTimer <= 0) startWave();
    return;
  }

  if (waveActive && enemies.length === 0 && enemiesSpawnedInWave >= enemiesPerWave) {
    money += difficultySettings.waveReward;
    victory();
    nextWave();
  }

  if (catLives.every(l => !l.alive)) { endGame(); return; }

  if (waveElapsed >= WAVE_TIME) {
    nextWave();
  }
}

function drawBG() {
  const w = gameCanvas.clientWidth, h = gameCanvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  // Ensure grid lines stay consistent even after drawing wide beams
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_COLS; i++) {
    ctx.beginPath();
    const x = originPx.x + i * CELL_PX;
    ctx.moveTo(x, originPx.y); ctx.lineTo(x, originPx.y + GRID_ROWS * CELL_PX); ctx.stroke();
  }
  for (let i = 0; i <= GRID_ROWS; i++) {
    ctx.beginPath();
    const y = originPx.y + i * CELL_PX;
    ctx.moveTo(originPx.x, y); ctx.lineTo(originPx.x + GRID_COLS * CELL_PX, y); ctx.stroke();
  }
  for (const wObj of walls) {
    const x = originPx.x + wObj.x * CELL_PX;
    const y = originPx.y + wObj.y * CELL_PX;
    if (imgReady(ASSETS.wall)) {
      ctx.drawImage(ASSETS.wall, x, y, CELL_PX, CELL_PX);
    } else {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.fillRect(x, y, CELL_PX, CELL_PX);
    }
  }
}
function drawHUD() {
  const statsEl = document.getElementById('gameStats');
  const overlayEl = overlayStats;
  if (!statsEl && !overlayEl) return;
  let html = '';
  if (!waveActive) {
    if (firstPlacementDone && preWaveTimer > 0) {
      html += `Next wave in: ${preWaveTimer.toFixed(1)}s<br>`;
    }
    html += `Lives: ${catLives.filter(l => l.alive).length}<br>`;
    html += `Money: $${money}`;
  } else {
    html += `Wave: ${waveIndex + 1}<br>`;
    html += `Time: ${Math.max(0, WAVE_TIME - waveElapsed).toFixed(1)}s<br>`;
    html += `Enemies: ${enemies.length}<br>`;
    html += `Lives: ${catLives.filter(l => l.alive).length}<br>`;
    html += `Money: $${money}`;
  }
  if (wallBtn) wallBtn.disabled = money < WALL_COST;
  if (cannonBtn) cannonBtn.disabled = money < CANNON_BASE.cost;
  if (laserBtn) laserBtn.disabled = money < LASER_BASE.cost;
  if (rocketBtn) rocketBtn.disabled = money < ROCKET_BASE.cost;
  if (statsEl) statsEl.innerHTML = html;
  if (overlayEl) overlayEl.innerHTML = html;
}
function render() {
  drawBG();
  if (selectedBuild && mouse.active && selectedBuild !== 'sell') {
    const cell = pxToCell(mouse);
    const x = originPx.x + cell.x * CELL_PX;
    const y = originPx.y + cell.y * CELL_PX;
    ctx.fillStyle = canPlace(cell) ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
    ctx.fillRect(x, y, CELL_PX, CELL_PX);
  }

  if (rangePreview) {
    ctx.beginPath();
    ctx.arc(rangePreview.x, rangePreview.y, rangePreview.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,0,0.15)';
    ctx.strokeStyle = 'rgba(0,255,0,0.4)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

    // Towers
    for (const t of towers) {
      const art = t.type === 'laser' ? ASSETS.laser :
        t.type === 'rocket' ? ASSETS.rocket :
        t.type === 'nuke' ? ASSETS.nuke :
        t.type === 'hellfire' ? ASSETS.hellfire :
        t.type === 'dualLaser' ? ASSETS.dualLaser :
        t.type === 'railgun' ? ASSETS.railgun :
        t.type === 'sniper' ? ASSETS.sniper :
        t.type === 'shotgun' ? ASSETS.shotgun : ASSETS.cannon;
      if (imgReady(art.base)) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.drawImage(art.base, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX);
        if (imgReady(art.turret)) {
          const angle = t.angle || 0;
          ctx.rotate(angle);
          ctx.drawImage(art.turret, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX);
          if ((t.type === 'rocket' || t.type === 'hellfire') && t.anim > 0) {
            ctx.beginPath();
            ctx.fillStyle = 'orange';
            ctx.arc(CELL_PX / 2, 0, 6 * (t.anim / 0.1), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(originPx.x + t.gx * CELL_PX, originPx.y + t.gy * CELL_PX, CELL_PX, CELL_PX);
      }
    }

  // Cat lives
  for (const life of catLives) {
    if (!life.alive) continue;
    if (imgReady(ASSETS.cat)) {
      ctx.drawImage(ASSETS.cat, life.x - life.r, life.y - life.r, life.r*2, life.r*2);
    } else {
      ctx.beginPath();
      ctx.fillStyle = '#5bd9ff';
      ctx.arc(life.x, life.y, life.r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Enemies (safe draw)
  for (const e of enemies) {
    if (imgReady(e.img)) {
      ctx.drawImage(e.img, e.x - e.r, e.y - e.r, e.r*2, e.r*2);
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    }
  }

  // Beams
  for (const beam of beams) {
    const grad = ctx.createLinearGradient(beam.x1, beam.y1, beam.x2, beam.y2);
    const cols = beam.colors || ['#0ff'];
    cols.forEach((c, i) => grad.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
    ctx.strokeStyle = grad;
    ctx.lineWidth = beam.width || 2;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
  }
  // Reset line width after drawing beams to avoid affecting later strokes
  ctx.lineWidth = 1;
  // Smoke trails
  for (const s of smokes) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(200,200,200,${s.life / 0.5})`;
    ctx.arc(s.x, s.y, 4, 0, Math.PI*2);
    ctx.fill();
  }

  // Explosions
  for (const e of explosions) {
    const alpha = e.life / e.max;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,165,0,${alpha})`;
    ctx.arc(e.x, e.y, NUKE_SPLASH_RADIUS, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,0,0,${alpha})`;
    ctx.arc(e.x, e.y, NUKE_SPLASH_RADIUS / 2, 0, Math.PI*2);
    ctx.fill();
  }

  // Bullets
  for (const b of bullets) {
    if (b.type === 'rocket') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle || 0);
      const isNuke = b.variant === 'nuke';
      ctx.fillStyle = isNuke ? '#ccc' : '#f00';
      const w = isNuke ? 16 : 8;
      const h = isNuke ? 8 : 4;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.fillStyle = '#ff0';
      ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }

    drawHUD();
  }

function loop(ts) {
  if (!running) return;
  if (!lastT) lastT = ts;
  const dt = Math.min(0.033, (ts - lastT) / 1000); // clamp for tab-jumps
  lastT = ts;
  update(dt);
  render();
  rafId = requestAnimationFrame(loop);
}

// -------------------- Lifecycle --------------------
function bindInputs() {
  gameCanvas.addEventListener('mousemove', onMouseMove);
  gameCanvas.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', resizeCanvas);
  window.visualViewport?.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKey);
}
function unbindInputs() {
  gameCanvas.removeEventListener('mousemove', onMouseMove);
  gameCanvas.removeEventListener('click', onCanvasClick);
  window.removeEventListener('resize', resizeCanvas);
  window.visualViewport?.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('keydown', onKey);
}
function onMouseMove(e) {
  const r = gameCanvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
}
function onCanvasClick(e) {
  const r = gameCanvas.getBoundingClientRect();
  const cell = pxToCell({ x: e.clientX - r.left, y: e.clientY - r.top });
  const gx = cell.x, gy = cell.y;
  if (!inBounds(cell)) return;

  if (!selectedBuild) {
    const t = towers.find(t => t.gx === gx && t.gy === gy);
    if (t) {
      selectedTower = t;
      updateSelectedTowerInfo();
      activateTab('upgrade');
    } else {
      selectedTower = null;
      updateSelectedTowerInfo();
    }
    return;
  }

  if (selectedBuild === 'sell') {
    const t = towers.find(t => t.gx === gx && t.gy === gy);
    if (t) {
      const refund = Math.floor((t.spent || t.cost || 0) * 0.8);
      money += refund;
      removeOccupancy(gx, gy);
      removeTowerProjectiles(t);
      towers = towers.filter(tt => tt !== t);
      selectedTower = null;
      updateSelectedTowerInfo();
    } else {
      const idx = walls.findIndex(w => w.x === gx && w.y === gy);
      if (idx !== -1) {
        walls.splice(idx, 1);
        removeOccupancy(gx, gy);
        money += WALL_COST;
      }
    }
    recalcEnemyPaths();
    return;
  }

  if (selectedBuild === 'wall') {
    if (canPlace(cell) && money >= WALL_COST) {
      money -= WALL_COST;
      addOccupancy(gx, gy);
      walls.push({ x: gx, y: gy });
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  } else if (selectedBuild === 'cannon') {
    if (canPlace(cell) && money >= CANNON_BASE.cost) {
      money -= CANNON_BASE.cost;
      addOccupancy(gx, gy);
      const p = cellToPx(cell);
      towers.push({
        gx,
        gy,
        x: p.x,
        y: p.y,
        type: 'cannon',
        cooldown: 0,
        angle: 0,
        base: { damage: CANNON_BASE.damage, fireRate: CANNON_BASE.fireRate, range: CANNON_BASE.range },
        damage: CANNON_BASE.damage,
        fireRate: CANNON_BASE.fireRate,
        range: CANNON_BASE.range,
        cost: CANNON_BASE.cost,
        spent: CANNON_BASE.cost,
        upgrades: { damage: 0, fireRate: 0, range: 0 },
        target: null,
        kills: 0
      });
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  } else if (selectedBuild === 'rocket') {
    if (canPlace(cell) && money >= ROCKET_BASE.cost) {
      money -= ROCKET_BASE.cost;
      addOccupancy(gx, gy);
      const p = cellToPx(cell);
      towers.push({
        gx,
        gy,
        x: p.x,
        y: p.y,
        type: 'rocket',
        cooldown: 0,
        angle: 0,
        base: { damage: ROCKET_BASE.damage, fireRate: ROCKET_BASE.fireRate, range: ROCKET_BASE.range },
        damage: ROCKET_BASE.damage,
        fireRate: ROCKET_BASE.fireRate,
        range: ROCKET_BASE.range,
        cost: ROCKET_BASE.cost,
        spent: ROCKET_BASE.cost,
        upgrades: { damage: 0, fireRate: 0, range: 0 },
        target: null,
        kills: 0,
        anim: 0
      });
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  } else if (selectedBuild === 'laser') {
    if (canPlace(cell) && money >= LASER_BASE.cost) {
      money -= LASER_BASE.cost;
      addOccupancy(gx, gy);
      const p = cellToPx(cell);
      towers.push({
        gx,
        gy,
        x: p.x,
        y: p.y,
        type: 'laser',
        cooldown: 0,
        angle: 0,
        base: { damage: LASER_BASE.damage, fireRate: LASER_BASE.fireRate, range: LASER_BASE.range },
        damage: LASER_BASE.damage,
        fireRate: LASER_BASE.fireRate,
        range: LASER_BASE.range,
        cost: LASER_BASE.cost,
        spent: LASER_BASE.cost,
        upgrades: { damage: 0, fireRate: 0, range: 0 },
        target: null,
        kills: 0
      });
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  }
}
function onKey(e) { if (e.key === 'Escape') endGame(); }

async function startGame() {
  // UI
  container && (container.style.display = 'none');
  menu && (menu.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'inline-block');
  nextWaveBtn && (nextWaveBtn.style.display = 'inline-block');
  statsOverlay && (statsOverlay.style.display = 'block');
  hoverMenu && (hoverMenu.style.display = 'block');

  // Canvas
  
ensureCanvas();
  setBattlefield(loadBattlefield());
  gameCanvas.style.display = 'block';
  resizeCanvas();

  // Optional fullscreen
  const opts = loadOpts();
  if (opts.fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  // ---- Load assets (FIX) with a tiny loading screen ----
  let loading = true;
  const loadingLoop = () => {
    if (!loading) return;
    drawBG();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Loading assets…', 12, 12);
    requestAnimationFrame(loadingLoop);
  };
  loadingLoop();
  await ensureAssets(); // never throws; missing files are filtered out
  loading = false;

  // Reset state & go
  resetGame();
  bindInputs();
  running = true; lastT = 0;
  sfx(520, 0.07, 0.04, 'square');
  rafId = requestAnimationFrame(loop);
}

function endGame() {
  if (!ctx) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  unbindInputs();

  // UI restore
  gameCanvas && (gameCanvas.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'none');
  nextWaveBtn && (nextWaveBtn.style.display = 'none');
  hoverMenu && (hoverMenu.style.display = 'none');
  statsOverlay && (statsOverlay.style.display = 'none');
  container && (container.style.display = 'block');
    menu && (menu.style.display = '');
    selectedTower = null;
    updateSelectedTowerInfo();
    contextMenu && (contextMenu.style.display = 'none');
    pauseBtn && (pauseBtn.textContent = 'Pause');

  const waveNum = waveIndex + 1;
  recordBestWave(waveNum);
  syncBestWave();
  const msg = `Game Over at wave ${waveNum} after ${waveElapsed.toFixed(1)}s.`;
  alert(msg);
}

// -------------------- Hooks --------------------

battlefieldBtn?.addEventListener('click', () => {
  const current = loadBattlefield();
  if (battlefieldDlg) {
    const radios = battlefieldDlg.querySelectorAll('input[name="battlefield"]');
    radios.forEach(r => { r.checked = (r.value === current); });
    battlefieldDlg.showModal();
  }
});
saveBattlefieldBtn?.addEventListener('click', () => {
  const selected = battlefieldDlg?.querySelector('input[name="battlefield"]:checked')?.value || 'backyard';
  saveBattlefield(selected);
  setBattlefield(selected);
  const opts = loadOpts();
  if (!opts.gridOverride) {
    opts.gridSize = MAPS[selected].grid;
    saveOpts(opts);
    applyGridSize(opts.gridSize);
  }
});

startBtn?.addEventListener('click', () => {
  const opts = loadOpts();
  if (!opts.gridOverride) {
    applyGridSize(MAPS[loadBattlefield()].grid);
  }
  startGame();
});
quitGameBtn?.addEventListener('click', () => endGame());
quitBtn?.addEventListener('click', () => alert('Thanks for stopping by! You can close this tab any time.'));
nextWaveBtn?.addEventListener('click', () => {
  if (!running) return;
  if (!waveActive) startWave();
  else { nextWave(); startWave(); }
});
