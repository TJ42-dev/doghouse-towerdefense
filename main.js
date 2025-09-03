// -------------------- Options & DOM --------------------
const LS_KEY = 'godot_web_options';
const BEST_WAVE_KEY = 'godot_web_best_wave';
// DOM helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $id = (id) => document.getElementById(id);

// Map of all IDs you reference (add more as needed)
const ids = [
  'startBtn','optionsBtn','quitBtn','quitGameBtn','nextWaveBtn',
  'statsOverlay','overlayStats','upNextBanner','gameOverPanel','gameOverText',
  'retryBtn','gameOverQuitBtn','optionsDialog','optMute','optFullscreen',
  'optGridSize','optGridOverride','optDifficulty','saveOptions',
  'hoverMenu','hoverMenuHeader','buildList','bestWave','pauseBtn',
  'contextMenu','contextSell','contextStats','battlefieldBtn','battlefieldDialog',
  'saveBattlefield','selectedTowerName','damageValue','damageNext','damageCost',
  'fireRateValue','fireRateNext','fireRateCost','rangeValue','rangeNext','rangeCost',
  'upgradeDamage','upgradeFireRate','upgradeRange','maxDamage','maxFireRate','maxRange',
  'basicUpgrades','specialUpgrades','upgradeSniper','upgradeShotgun','upgradeDualLaser',
  'upgradeRailgun','upgradeNuke','upgradeHellfire','upgradeTerminator','upgradeWunderwaffe',
  'sniperCost','shotgunCost','dualLaserCost','railgunCost','nukeCost','hellfireCost',
  'terminatorCost','wunderwaffeCost','quitInMenuBtn','gameCanvas'
];
const el = Object.fromEntries(ids.map(k => [k, $id(k)]));

// Non-ID selectors
const overlayHeader = $('#statsOverlay .overlay-header');
const menu = $('.menu');
const container = $('.container');
const tabButtons = $$('.tab-btn');
const tabContents = $$('.tab-content');

const friendlyNames = {
  sniper: 'Sniper', shotgun: 'Shotgun', dualLaser: 'Dual Laser', railgun: 'Railgun',
  nuke: 'Nuke', hellfire: 'Hellfire', terminator: 'Terminator', wunderwaffe: 'Wunderwaffe'
};
function caps(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Track canvas separately since it may be replaced later
let gameCanvas = el.gameCanvas; // can be null initially
let ctx = null;
const MAP_KEY = 'godot_web_battlefield';
// Default/fallback map definition
const DEFAULT_MAP = {
  name: 'Backyard',
  img: './assets/maps/backyard/backyard.png',
  grid: 'medium',
  entries: [{ x: 0, y: 0 }],
  catLives: [
    { x: 24, y: 11 }, { x: 25, y: 11 }, { x: 26, y: 11 },
    { x: 24, y: 12 }, { x: 25, y: 12 }, { x: 26, y: 12 },
    { x: 24, y: 13 }, { x: 25, y: 13 }, { x: 26, y: 13 }
  ]
};

const MAP_CONFIG_FILES = {
  backyard: './assets/maps/backyard/config.json',
  ally_cats: './assets/maps/ally_cats/config.json'
};

// Start with default; loader can replace this after reading config
let currentMap = DEFAULT_MAP;
let selectedTower = null;
let contextTarget = null;
let rangePreview = null;

// -------------------- Grid & Build --------------------
// Fixed logical grid
let GRID_COLS = 36;
// Trim top and bottom rows so only the visible play area is usable
let GRID_ROWS = 24;
let CELL_PX = 26; // fixed pixel size for each grid cell
const TOWER_SCALE = 1.75; // render tower sprites 25% larger
const TOWER_PX = CELL_PX * TOWER_SCALE;
const NUKE_SPLASH_RADIUS = CELL_PX * 2;
const STRAY_ROCKET_RADIUS = CELL_PX;
let originPx = { x: 0, y: 0 }; // top-left of playfield in pixels
let gridCache = null, gridCtx = null, gridCacheW = 0, gridCacheH = 0;

// Occupancy map mirrors walls & towers
let occupancy = new Set();
let walls = [];
let NAV_VERSION = 0;
function bumpNav() { NAV_VERSION++; }
let selectedBuild = null;
let towers = [];
let bullets = [];
let smokes = [];
let beams = [];
let zaps = [];
let explosions = [];
let catLives = [];
let money = 0;
const BALANCE = {
  wallCost: 10,
  specializationCosts: {
    sniper: 950,
    shotgun: 1200,
    dualLaser: 1500,
    railgun: 2500,
    nuke: 3000,
    hellfire: 2000,
    terminator: 2200,
    wunderwaffe: 2600
  },
  difficulties: {
    easy: { startingCash: 500, killReward: 15, waveReward: 75, healthMultiplier: 0.8 },
    medium: { startingCash: 350, killReward: 10, waveReward: 50, healthMultiplier: 1 },
    hard: { startingCash: 250, killReward: 8, waveReward: 40, healthMultiplier: 1.2 },
    free: { startingCash: 99999, killReward: 10, waveReward: 50, healthMultiplier: 1 }
  },
  defaultDogStats: { baseHealth: 100, baseSpeed: 1.0 },
  healthScalePerWave: 0.375, // enemy health increases 37.5% each wave
  wave: {
    time: 60, // seconds per wave
    enemiesPerWave: 10,
    startDelay: 15, // secs before first wave
    spawnInterval: 0.5, // seconds between enemy spawns
    postWaveDelay: 5 // delay after a wave clears
  }
};
let difficulty = 'medium';
let difficultySettings = { ...BALANCE.difficulties[difficulty] };

const SPECIALIZE_BY_BASE = {
  cannon: ['sniper', 'shotgun'],
  laser: ['dualLaser', 'railgun'],
  rocket: ['nuke', 'hellfire'],
  tesla: ['terminator', 'wunderwaffe']
};
const SPECIAL_COST_SPANS = {
  sniper: el.sniperCost, shotgun: el.shotgunCost, dualLaser: el.dualLaserCost, railgun: el.railgunCost,
  nuke: el.nukeCost, hellfire: el.hellfireCost, terminator: el.terminatorCost, wunderwaffe: el.wunderwaffeCost
};
const SPECIAL_BUTTONS = {
  sniper: el.upgradeSniper, shotgun: el.upgradeShotgun, dualLaser: el.upgradeDualLaser, railgun: el.upgradeRailgun,
  nuke: el.upgradeNuke, hellfire: el.upgradeHellfire, terminator: el.upgradeTerminator, wunderwaffe: el.upgradeWunderwaffe
};
for (const [k, span] of Object.entries(SPECIAL_COST_SPANS)) {
  if (span) span.textContent = `$${BALANCE.specializationCosts[k]}`;
}

const GRID_SIZES = {
  large: { cols: 36, rows: 24 },
  medium: { cols: 30, rows: 20 },
  small: { cols: 24, rows: 16 }
};

function applyGridSize(size) {
  const g = GRID_SIZES[size] || GRID_SIZES.medium;
  GRID_COLS = g.cols;
  GRID_ROWS = g.rows;
  if (currentMap?.extraCols) GRID_COLS += currentMap.extraCols;
  if (currentMap?.extraRows) GRID_ROWS += currentMap.extraRows;
  initOccupancy();
  resizeCanvas();
}

function rebuildGridCache() {
  const w = GRID_COLS * CELL_PX, h = GRID_ROWS * CELL_PX;
  if (!gridCache || w !== gridCacheW || h !== gridCacheH) {
    gridCache = document.createElement('canvas');
    gridCache.width = w; gridCache.height = h;
    gridCtx = gridCache.getContext('2d');
    gridCacheW = w; gridCacheH = h;
  } else {
    gridCtx.clearRect(0, 0, w, h);
  }
  gridCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  gridCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_COLS; i++) {
    gridCtx.beginPath();
    gridCtx.moveTo(i * CELL_PX, 0); gridCtx.lineTo(i * CELL_PX, h); gridCtx.stroke();
  }
  for (let j = 0; j <= GRID_ROWS; j++) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, j * CELL_PX); gridCtx.lineTo(w, j * CELL_PX); gridCtx.stroke();
  }
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

function isWallAt(gx, gy) {
  return occupancy.has(key(gx, gy));
}

function addOccupancy(x, y) {
  occupancy.add(key(x, y));
  bumpNav();
}
function removeOccupancy(x, y) {
  occupancy.delete(key(x, y));
  bumpNav();
}

function initOccupancy() {
  // Start with an empty grid; cells become occupied only when walls or towers
  // are placed during gameplay.
  occupancy = new Set();
  walls = [];
  bumpNav();
}

function createZap(x1, y1, x2, y2, segments = 5) {
  const points = [{ x: x1, y: y1 }];
  const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const nx = x1 + (x2 - x1) * t;
    const ny = y1 + (y2 - y1) * t;
    const offset = (Math.random() - 0.5) * 20;
    points.push({
      x: nx + Math.cos(angle) * offset,
      y: ny + Math.sin(angle) * offset
    });
  }
  points.push({ x: x2, y: y2 });
  return points;
}

function removeTowerProjectiles(t) {
  bullets = bullets.filter(b => b.source !== t);
}

function canPlace(cell) {
  if (!inBounds(cell)) return false;
  if (occupancy.has(key(cell.x, cell.y))) return false;
  // Temporarily occupy to test pathing without bumping nav version
  occupancy.add(key(cell.x, cell.y));
  const target = catLives.find(l => l.alive);
  const goal = target ? { x: target.gx, y: target.gy } : currentMap.entries[0];
  const ok =
    currentMap.entries.every(e => findPath(e, goal).length > 0) &&
    enemies.every(en => findPath(pxToCell({ x: en.x, y: en.y }), goal).length > 0);
  occupancy.delete(key(cell.x, cell.y));
  return ok;
}

function recalcEnemyPaths() {
  const target = catLives.find(l => l.alive);
  const goal = target ? { x: target.gx, y: target.gy } : currentMap.entries[0];
  for (const en of enemies) {
    const start = pxToCell({ x: en.x, y: en.y });
    en.path = findPath(start, goal);
    en.goalCell = goal;
    en.navVersion = NAV_VERSION;
  }
}

// Tower and enemy stats are loaded from external JSON for easier tuning
const TOWER_BASES = {
  cannon: { damage: 80, fireRate: 0.5, range: 4, bulletSpeed: 5, cost: 50 },
  laser:  { damage: 120, fireRate: 0.4, range: 4,           cost: 100 },
  rocket: { damage: 200, fireRate: 0.4, range: 5.5, bulletSpeed: 4.5, cost: 175 },
  tesla:  { damage: 400, fireRate: 0.3, range: 6,           cost: 400 }
};
// Compatibility variables for existing references
let CANNON_BASE = TOWER_BASES.cannon;
let LASER_BASE  = TOWER_BASES.laser;
let ROCKET_BASE = TOWER_BASES.rocket;
let TESLA_BASE  = TOWER_BASES.tesla;
let TOWER_TYPES = [];

function makeTower(type, gx, gy) {
  const base = TOWER_BASES[type];
  const p = cellToPx({ x: gx, y: gy });
  return {
    gx, gy, x: p.x, y: p.y,
    type, cooldown: 0, angle: 0, anim: 0,
    base: { damage: base.damage, fireRate: base.fireRate, range: base.range },
    damage: base.damage, fireRate: base.fireRate, range: base.range,
    cost: base.cost, spent: base.cost, fireSound: base.fireSound,
    upgrades: { damage: 0, fireRate: 0, range: 0 },
    target: null, kills: 0
  };
}

function getBuildItems() {
  return [
    { id: 'wall', name: 'Wall', cost: BALANCE.wallCost, damage: 0, range: 0, fireRate: 0 },
    ...Object.entries(TOWER_BASES).map(([id, b]) => ({
      id,
      name: friendlyNames[id] || caps(id),
      cost: b.cost,
      damage: b.damage,
      range: b.range,
      fireRate: b.fireRate
    }))
  ];
}

function updateBuildMenuAvailability() {
  if (!el.buildList) return;
  const builds = getBuildItems();
  el.buildList.querySelectorAll('.build-item').forEach(btn => {
    const b = builds.find(x => x.id === btn.dataset.build);
    if (b) btn.disabled = money < b.cost;
  });
}

function renderBuildMenu() {
  if (!el.buildList) return;
  el.buildList.innerHTML = '';
  getBuildItems().forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'build-item';
    btn.dataset.build = b.id;
    btn.innerHTML = `<div class="title">${b.name} $${b.cost}</div>` +
      `<div class="stats">DMG ${b.damage} • RNG ${b.range} • SPD ${b.fireRate}</div>`;
    btn.addEventListener('click', () => {
      if (money >= b.cost) selectedBuild = b.id;
    });
    el.buildList.appendChild(btn);
  });
  updateBuildMenuAvailability();
}
renderBuildMenu();

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
let lastSfx = 0;
function sfx(freq = 440, dur = 0.07, vol = 0.03, type = 'square') {
  const now = performance.now();
  if (now - lastSfx < 30) return;
  lastSfx = now;
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

const audioCache = new Map();
function playAudio(url) {
  let a = audioCache.get(url);
  if (!a) {
    a = new Audio(url);
    audioCache.set(url, a);
  }
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playFireSound(t) {
  const snd = t.fireSound;
  if (snd && snd.endsWith('.wav')) playAudio(snd);
  else sfx(880, 0.07, 0.03, 'square');
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
  if (el.optMute) el.optMute.checked = !!o.mute;
  if (el.optFullscreen) el.optFullscreen.checked = !!o.fullscreen;
  if (el.optGridOverride) el.optGridOverride.checked = !!o.gridOverride;
  if (el.optGridSize) {
    el.optGridSize.value = o.gridSize || 'medium';
    el.optGridSize.disabled = !o.gridOverride;
  }
  if (el.optDifficulty) el.optDifficulty.value = o.difficulty || 'medium';
}
el.optionsBtn?.addEventListener('click', () => { syncUI(); el.optionsDialog?.showModal?.(); });
el.optGridOverride?.addEventListener('change', () => {
  if (el.optGridSize) el.optGridSize.disabled = !el.optGridOverride.checked;
});
el.saveOptions?.addEventListener('click', () => {
  const override = el.optGridOverride?.checked;
  const grid = override ? el.optGridSize?.value : (currentMap?.grid || 'medium');
  const difficulty = el.optDifficulty?.value || 'medium';
  const opts = {
    mute: el.optMute?.checked,
    fullscreen: el.optFullscreen?.checked,
    gridSize: grid,
    gridOverride: override,
    difficulty,
    startingCash: BALANCE.difficulties[difficulty].startingCash
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
  if (el.bestWave) el.bestWave.textContent = loadBestWave();
}

function loadBattlefield() {
  try {
    return localStorage.getItem(MAP_KEY) || 'backyard';
  } catch {
    return 'backyard';
  }
}
function saveBattlefield(v) { localStorage.setItem(MAP_KEY, v); }
async function setBattlefield(map) {
  const path = MAP_CONFIG_FILES[map] || MAP_CONFIG_FILES.backyard;
  try {
    const m = await fetch(path).then(r => r.json());
    currentMap = m;
    if (gameCanvas) {
      gameCanvas.style.background = `url('${m.img}') center/cover no-repeat`;
    }
  } catch (err) {
    console.warn('Failed to load map config', err);
currentMap = DEFAULT_MAP;
if (gameCanvas) {
  gameCanvas.style.background = `url('${DEFAULT_MAP.img}') center/cover no-repeat`;
}
  }
}

async function init() {
  ensureCanvas();
  const initialMap = loadBattlefield();
  await setBattlefield(initialMap);
  const initialOpts = loadOpts();
  const initialGrid = initialOpts.gridOverride ? initialOpts.gridSize : currentMap.grid;
  if (!initialOpts.gridOverride && initialOpts.gridSize !== initialGrid) {
    initialOpts.gridSize = initialGrid;
    saveOpts(initialOpts);
  }
  applyGridSize(initialGrid);
  syncBestWave();
}

init();


// ----- Hover Menu -----
function activateTab(name) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}
tabButtons.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

let drag = null;
el.hoverMenuHeader?.addEventListener('mousedown', (e) => {
  drag = { x: e.offsetX, y: e.offsetY };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
});
function onDrag(e) {
  if (!drag) return;
  el.hoverMenu.style.left = (e.pageX - drag.x) + 'px';
  el.hoverMenu.style.top = (e.pageY - drag.y) + 'px';
}
function stopDrag() {
  drag = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

function tryUpgrade(stat, max = false) {
  if (!selectedTower) return;
  let upgraded = false;
  const limit = () => (selectedTower.upgrades?.[stat] ?? 0) < 10;
  if (max) {
    while (limit() && money >= getUpgradeCost(selectedTower, stat)) {
      if (!upgradeTower(selectedTower, stat)) break;
      upgraded = true;
    }
  } else if (limit() && money >= getUpgradeCost(selectedTower, stat)) {
    upgraded = upgradeTower(selectedTower, stat);
  }
  if (upgraded) { rankUp(); updateSelectedTowerInfo(); }
}

el.upgradeDamage?.addEventListener('click', () => tryUpgrade('damage'));
el.upgradeFireRate?.addEventListener('click', () => tryUpgrade('fireRate'));
el.upgradeRange?.addEventListener('click', () => tryUpgrade('range'));
el.maxDamage?.addEventListener('click', () => tryUpgrade('damage', true));
el.maxFireRate?.addEventListener('click', () => tryUpgrade('fireRate', true));
el.maxRange?.addEventListener('click', () => tryUpgrade('range', true));
for (const [kind, btn] of Object.entries(SPECIAL_BUTTONS)) {
  btn?.addEventListener('click', () => {
    if (!selectedTower) return;
    specializeTower(selectedTower, kind);
    updateSelectedTowerInfo();
  });
}
el.quitInMenuBtn?.addEventListener('click', () => returnToMenu());

el.pauseBtn?.addEventListener('click', () => {
  if (running) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    el.pauseBtn.textContent = 'Resume';
  } else {
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(loop);
    el.pauseBtn.textContent = 'Pause';
  }
});

function updateSelectedTowerInfo() {
  if (!el.selectedTowerName) return;
  if (selectedTower) {
    el.selectedTowerName.classList.remove('no-selection');
    const isSpecial = ['sniper','shotgun','dualLaser','railgun','nuke','hellfire','terminator','wunderwaffe'].includes(selectedTower.type);
    const isBaseTower = ['cannon','laser','rocket','tesla'].includes(selectedTower.type);
    const fullyUpgraded = isBaseTower && ['damage','fireRate','range'].every(s => selectedTower.upgrades?.[s] >= 10);
    rangePreview = { x: selectedTower.x, y: selectedTower.y, r: selectedTower.range * CELL_PX };
    if (fullyUpgraded) {
      el.selectedTowerName.textContent = 'Choose specialization';
      el.basicUpgrades && (el.basicUpgrades.style.display = 'none');
      el.specialUpgrades && (el.specialUpgrades.style.display = '');
      const allowed = SPECIALIZE_BY_BASE[selectedTower.type] || [];
      for (const [kind, btn] of Object.entries(SPECIAL_BUTTONS)) {
        if (!btn) continue;
        const show = allowed.includes(kind);
        btn.parentElement && (btn.parentElement.style.display = show ? '' : 'none');
        btn.disabled = money < BALANCE.specializationCosts[kind];
      }
    } else {
      el.basicUpgrades && (el.basicUpgrades.style.display = '');
      el.specialUpgrades && (el.specialUpgrades.style.display = 'none');
      const typeName = friendlyNames[selectedTower.type] || caps(selectedTower.type);
      el.selectedTowerName.textContent = isSpecial ? `${typeName} (Maxed)` : `Selected: ${typeName}`;
      const stats = {
        damage: { value: el.damageValue, next: el.damageNext, cost: el.damageCost, btn: el.upgradeDamage, maxBtn: el.maxDamage },
        fireRate: { value: el.fireRateValue, next: el.fireRateNext, cost: el.fireRateCost, btn: el.upgradeFireRate, maxBtn: el.maxFireRate },
        range: { value: el.rangeValue, next: el.rangeNext, cost: el.rangeCost, btn: el.upgradeRange, maxBtn: el.maxRange }
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
          if (isSpecial) {
            els.cost.textContent = '';
            els.cost.style.display = 'none';
          } else if (lvl >= 10) {
            els.cost.textContent = '(MAX!)';
            els.cost.style.display = '';
          } else {
            els.cost.textContent = `$${getUpgradeCost(selectedTower, stat)}`;
            els.cost.style.display = '';
          }
        }
        if (els.btn) {
          if (isSpecial) {
            els.btn.style.display = 'none';
          } else {
            els.btn.style.display = '';
            els.btn.disabled = money < getUpgradeCost(selectedTower, stat) || lvl >= 10;
          }
        }
        if (els.maxBtn) {
          if (isSpecial) {
            els.maxBtn.style.display = 'none';
          } else {
            els.maxBtn.style.display = '';
            els.maxBtn.disabled = money < getUpgradeCost(selectedTower, stat) || lvl >= 10;
          }
        }
      }
    }
  } else {
    el.selectedTowerName.textContent = 'No tower selected';
    el.selectedTowerName.classList.add('no-selection');
    rangePreview = null;
    [el.damageValue, el.damageNext, el.damageCost, el.fireRateValue, el.fireRateNext, el.fireRateCost, el.rangeValue, el.rangeNext, el.rangeCost].forEach(el => {
      if (el) el.textContent = '-';
    });
    [el.upgradeDamage, el.upgradeFireRate, el.upgradeRange, el.maxDamage, el.maxFireRate, el.maxRange].forEach(btn => { if (btn) { btn.disabled = true; btn.style.display = ''; } });
    if (el.basicUpgrades) el.basicUpgrades.style.display = '';
    if (el.specialUpgrades) el.specialUpgrades.style.display = 'none';
  }
}

gameCanvas?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!el.contextMenu || !el.contextSell || !el.contextStats) return;
  const r = gameCanvas.getBoundingClientRect();
  const cell = pxToCell({ x: e.clientX - r.left, y: e.clientY - r.top });
  const t = towers.find(tt => tt.gx === cell.x && tt.gy === cell.y);
  const w = walls.find(ww => ww.x === cell.x && ww.y === cell.y);
  if (!t && !w) {
    el.contextMenu.style.display = 'none';
    contextTarget = null;
    rangePreview = null;
    if (selectedBuild) selectedBuild = null;
    return;
  }
  contextTarget = { gx: cell.x, gy: cell.y };
  if (t) {
    const sellVal = Math.floor((t.spent || t.cost || 0) * 0.8);
    el.contextStats.innerHTML = `Damage: ${Math.round(t.damage)}<br>Kills: ${t.kills || 0}<br>Sell: $${sellVal}`;
    el.contextSell.textContent = '$';
    rangePreview = { x: t.x, y: t.y, r: t.range * CELL_PX };
  } else {
    el.contextStats.innerHTML = `Sell: $${BALANCE.wallCost}`;
    el.contextSell.textContent = '$';
    rangePreview = null;
  }
  el.contextMenu.style.left = e.clientX + 'px';
  el.contextMenu.style.top = e.clientY + 'px';
  el.contextMenu.style.display = 'block';
});
document.addEventListener('click', () => {
  if (el.contextMenu) el.contextMenu.style.display = 'none';
  contextTarget = null;
  if (selectedTower) {
    rangePreview = { x: selectedTower.x, y: selectedTower.y, r: selectedTower.range * CELL_PX };
  } else {
    rangePreview = null;
  }
});
el.contextSell?.addEventListener('click', () => {
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
      money += BALANCE.wallCost;
    }
  }
  recalcEnemyPaths();
  el.contextMenu.style.display = 'none';
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
  const cost = BALANCE.specializationCosts[kind];
  if (money < cost) return;
  money -= cost;
  t.spent = (t.spent || t.cost || 0) + cost;
  if (t.type === 'cannon') {
    if (kind === 'sniper') {
      const idx = Math.max(0, waveIndex - 1);
      const scale = 1 + idx * BALANCE.healthScalePerWave;
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
      const idx = Math.max(0, waveIndex - 1);
      const scale = 1 + idx * BALANCE.healthScalePerWave;
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
  } else if (t.type === 'tesla') {
    if (kind === 'terminator') {
      t.type = 'terminator';
      t.damage = Math.round(t.damage * 1.2);
      t.fireRate = t.fireRate * 1.2;
      // range unchanged
    } else if (kind === 'wunderwaffe') {
      t.type = 'wunderwaffe';
      t.damage = Math.round(t.damage * 1.5);
      t.fireRate = t.fireRate * 0.75;
      // range unchanged
    } else {
      return;
    }
  } else {
    return;
  }
  const cfg = (typeof TOWER_TYPES !== 'undefined') ? TOWER_TYPES.find(x => x.id === t.type) : null;
  if (cfg && cfg.fireSound) t.fireSound = cfg.fireSound;
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
  const offset = currentMap?.gridOffset || { x: 0, y: 0 };
  originPx = {
    x: Math.floor((w - playW) / 2 + offset.x * CELL_PX),
    y: Math.floor((h - playH) / 2 + h * 0.15 + offset.y * CELL_PX)
  };
  towers.forEach(t => {
    const p = cellToPx({ x: t.gx, y: t.gy });
    t.x = p.x; t.y = p.y;
  });
  catLives.forEach(l => {
    const p = cellToPx({ x: l.gx, y: l.gy });
    l.x = p.x; l.y = p.y; l.r = CELL_PX / 2;
  });
  rebuildGridCache();
}
function cssCenter() {
  const w = gameCanvas?.clientWidth || window.innerWidth;
  const h = gameCanvas?.clientHeight || window.innerHeight;
  return { x: w / 2, y: h / 2 };
}

// -------------------- Enemy definitions & asset loader --------------------
// Add new dog heads here. Omit baseHealth/baseSpeed to use balanced defaults.
let DEFAULT_DOG_STATS = { ...BALANCE.defaultDogStats };
let DOG_TYPES = [];
const CAT_SRC = 'assets/animals/cat.png';
const CANNON_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const CANNON_TURRET_SRC = 'assets/towers/turrets/cannon_turret.svg';
const LASER_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const LASER_TURRET_SRC = 'assets/towers/turrets/laser_turret.svg';
const ROCKET_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const ROCKET_TURRET_SRC = 'assets/towers/turrets/rocket_launcher_turret.svg';
const NUKE_BASE_SRC = 'assets/towers/bases/nuke_base.svg';
const NUKE_TURRET_SRC = 'assets/towers/turrets/nuke_turret.svg';
const HELLFIRE_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const HELLFIRE_TURRET_SRC = 'assets/towers/turrets/hellfire_turret.svg';
const DUAL_LASER_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const DUAL_LASER_TURRET_SRC = 'assets/towers/turrets/laser_dual_turret.svg';
const RAILGUN_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const RAILGUN_TURRET_SRC = 'assets/towers/turrets/railgun_turret.svg';
const WALL_SRC = 'assets/towers/bases/fence.png';
const SNIPER_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const SNIPER_TURRET_SRC = 'assets/towers/turrets/sniper_turret.svg';
const SHOTGUN_BASE_SRC = 'assets/towers/bases/tower_base.svg';
const SHOTGUN_TURRET_SRC = 'assets/towers/turrets/shotgun_turret.svg';
const TESLA_BASE_SRC = 'assets/towers/bases/tesla_base.svg';
const TESLA_TURRET_SRC = 'assets/towers/turrets/tesla_turret.svg';
const TERMINATOR_BASE_SRC = 'assets/towers/bases/terminator_base.svg';
const TERMINATOR_TURRET_SRC = 'assets/towers/turrets/terminator_turret.svg';
const WUNDERWAFFE_BASE_SRC = 'assets/towers/bases/D2_base.svg';
const WUNDERWAFFE_TURRET_SRC = 'assets/towers/turrets/D2_turret.svg';
const WAVE_START_SOUND = 'assets/sounds/wave_start.wav';
const WAVE_COMPLETE_SOUND = 'assets/sounds/wave_complete.wav';
const BOSS_WAVE_START_SOUND = 'assets/sounds/boss_wave_start.wav';
const ROCKET_HIT_SOUND = 'assets/sounds/rocket_hit.wav';
const NUKE_HIT_SOUND = 'assets/sounds/nuke_hit.wav';
const GAME_START_SOUND = 'assets/sounds/game_start.wav';
const GAME_OVER_SOUND = 'assets/sounds/game_over.wav';
const CAT_DEATH_SOUND = 'assets/sounds/cat_death.wav';

const ART_SPECS = {
  wall: { base: WALL_SRC },
  cannon: { base: CANNON_BASE_SRC, turret: CANNON_TURRET_SRC },
  laser: { base: LASER_BASE_SRC, turret: LASER_TURRET_SRC },
  rocket: { base: ROCKET_BASE_SRC, turret: ROCKET_TURRET_SRC },
  nuke: { base: NUKE_BASE_SRC, turret: NUKE_TURRET_SRC },
  hellfire: { base: HELLFIRE_BASE_SRC, turret: HELLFIRE_TURRET_SRC },
  dualLaser: { base: DUAL_LASER_BASE_SRC, turret: DUAL_LASER_TURRET_SRC },
  railgun: { base: RAILGUN_BASE_SRC, turret: RAILGUN_TURRET_SRC },
  sniper: { base: SNIPER_BASE_SRC, turret: SNIPER_TURRET_SRC },
  shotgun: { base: SHOTGUN_BASE_SRC, turret: SHOTGUN_TURRET_SRC },
  tesla: { base: TESLA_BASE_SRC, turret: TESLA_TURRET_SRC },
  terminator: { base: TERMINATOR_BASE_SRC, turret: TERMINATOR_TURRET_SRC },
  wunderwaffe: { base: WUNDERWAFFE_BASE_SRC, turret: WUNDERWAFFE_TURRET_SRC }
};
const TOWER_CONFIG_IDS = [
  'cannon',
  'laser',
  'rocket',
  'sniper',
  'shotgun',
  'dualLaser',
  'railgun',
  'nuke',
  'hellfire',
  'tesla',
  'terminator',
  'wunderwaffe'
];

let DATA_LOADED = false;
async function loadData() {
  if (DATA_LOADED) return;
  try {
    const towerPromises = TOWER_CONFIG_IDS.map(id =>
      fetch(`assets/towers/tower configurations/${id}.json`).then(r => r.json())
    );
    const [towerJson, dogJson] = await Promise.all([
      Promise.all(towerPromises),
      fetch('assets/enemies/enemies.json').then(r => r.json())
    ]);
    if (Array.isArray(towerJson)) {
      TOWER_TYPES = towerJson;
      for (const t of TOWER_TYPES) {
        if (TOWER_BASES[t.id]) {
          TOWER_BASES[t.id] = { ...TOWER_BASES[t.id], ...t };
        }
      }
      CANNON_BASE = TOWER_BASES.cannon;
      LASER_BASE  = TOWER_BASES.laser;
      ROCKET_BASE = TOWER_BASES.rocket;
      TESLA_BASE  = TOWER_BASES.tesla;
      renderBuildMenu();
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

let ASSETS = { dogs: [] };
let assetsReady; // Promise

async function ensureAssets() {
  await loadData();
  if (!assetsReady) {
    assetsReady = (async () => {
      const dogImgs = await Promise.all(DOG_TYPES.map(t => loadImage(t.src)));
      dogImgs.forEach((img, i) => { DOG_TYPES[i].img = img; });
      const art = {};
      for (const [k, spec] of Object.entries(ART_SPECS)) {
        art[k] = {
          base: spec.base ? await loadImage(spec.base) : null,
          turret: spec.turret ? await loadImage(spec.turret) : null
        };
      }
      ASSETS = {
        dogs: DOG_TYPES,
        cat: await loadImage(CAT_SRC),
        wall: art.wall.base,
        cannon: art.cannon, laser: art.laser, rocket: art.rocket, nuke: art.nuke,
        hellfire: art.hellfire, dualLaser: art.dualLaser, railgun: art.railgun,
        sniper: art.sniper, shotgun: art.shotgun, tesla: art.tesla,
        terminator: art.terminator, wunderwaffe: art.wunderwaffe
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
let rafId = null;
let lastT = 0;
let running = false;

let waveActive = false;
let preWaveTimer = BALANCE.wave.startDelay;
let waveElapsed = 0; // time into current wave
// waveIndex tracks how many waves have been completed
let waveIndex = 0;
// queue of active waves, each with {waveNum, enemiesSpawned, total, spawnTimer}
let waveQueue = [];
let spawnInterval = BALANCE.wave.spawnInterval;
let firstPlacementDone = false;

const player = { x: 0, y: 0, r: 0 };
let mouse = { x: 0, y: 0, active: false };
let enemies = [];
const INITIAL_LIVES = 9;
let killReward = 0;
const WAVE1_DEBUFF = 0.5; // enemies start at half health on wave 1
let wave1DebuffActive = true;
let bossBaseHealthBonus = 0;
let healthBuffMultiplier = 1;

function resetGame() {
  enemies = [];
  selectedBuild = null;
  towers = [];
  bullets = [];
  smokes = [];
  zaps = [];
  explosions = [];
  const opts = loadOpts();
  difficulty = opts.difficulty || 'medium';
  difficultySettings = { ...BALANCE.difficulties[difficulty] };
  money = difficultySettings.startingCash;
  killReward = difficultySettings.killReward;
  healthBuffMultiplier = 1;
  bossBaseHealthBonus = 0;
  wave1DebuffActive = true;
  selectedTower = null;
  updateSelectedTowerInfo();
  initOccupancy();
  waveActive = false;
  preWaveTimer = BALANCE.wave.startDelay;
  waveElapsed = 0;
  waveIndex = 0;
  waveQueue = [];
  spawnInterval = BALANCE.wave.spawnInterval;
  firstPlacementDone = false;
  const c = cssCenter();
  player.x = c.x; player.y = c.y; player.r = 0;
  mouse = { x: c.x, y: c.y, active: false };

  // place initial cat lives at map-specific locations
  catLives = [];
  for (const cell of currentMap.catLives) {
    const p = cellToPx(cell);
    catLives.push({ x: p.x, y: p.y, r: CELL_PX / 2, alive: true, gx: cell.x, gy: cell.y });
  }
}

function spawnEnemy(waveNum) {
  const entry = currentMap.entries[0];
  const p = cellToPx(entry);
  const r = CELL_PX / 2;
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
  let baseHealth = stats.baseHealth;
  if (type.id === 'boss') {
    baseHealth += bossBaseHealthBonus;
  }
  let health = baseHealth * difficultySettings.healthMultiplier * healthBuffMultiplier;
  if (waveNum === 1 && wave1DebuffActive) {
    health *= WAVE1_DEBUFF;
  }
  const target = catLives.find(l => l.alive);
  const goalCell = target ? { x: target.gx, y: target.gy } : entry;
  const path = findPath(entry, goalCell);

  enemies.push({ x: p.x, y: p.y, r, speed, img, path, goalCell, health, velX: 0, velY: 0, waveNum, navVersion: NAV_VERSION, lastCell: entry });
}

function getNextWaveEnemyName() {
  let nextWaveNum;
  if (waveActive) {
    nextWaveNum = waveIndex + waveQueue.length + 1;
  } else {
    nextWaveNum = waveIndex + 1;
  }
  if (!ASSETS.dogs || ASSETS.dogs.length === 0) return '';
  if (nextWaveNum % 5 === 0) {
    const boss = ASSETS.dogs.find(t => t.id === 'boss');
    return boss ? boss.name : '';
  }
  const nonBoss = ASSETS.dogs.filter(t => t.id !== 'boss');
  const nonBossIndex = (nextWaveNum - 1) - Math.floor((nextWaveNum - 1) / 5);
  const type = nonBoss[nonBossIndex % nonBoss.length];
  return type ? type.name : '';
}

function applyWaveEndRewards(completedWave) {
  // Slightly increase kill reward every wave
  killReward += (completedWave >= 30) ? 3 : (completedWave > 20) ? 2 : 1;

  // Every 5 waves, buff enemy health and give bonus money
  if (completedWave % 5 === 0) {
    const stage = (completedWave >= 30) ? 3 : (completedWave > 20) ? 2 : 1;
    const healthInc = (stage === 3) ? 0.15 : (stage === 2) ? 0.2 : 0.3;
    healthBuffMultiplier *= 1 + healthInc;
    const bossCount = completedWave / 5;
    // Scale boss base health linearly to avoid runaway difficulty
    bossBaseHealthBonus += 250 * bossCount;
    money += (stage === 3) ? 1000 : (stage === 2) ? 500 : 0;
    killReward += (stage === 3) ? 20 : (stage === 2) ? 10 : 5;
  }
  if (completedWave === 1 && wave1DebuffActive) {
    wave1DebuffActive = false;
  }
}

function queueWave() {
  const nextWaveNum = waveIndex + waveQueue.length + 1;
  const isBossWave = nextWaveNum % 5 === 0;
  if (!waveActive) {
    waveActive = true;
    preWaveTimer = 0;
    waveElapsed = 0;
    spawnInterval = BALANCE.wave.spawnInterval;
    beams = [];
    zaps = [];
    playAudio(isBossWave ? BOSS_WAVE_START_SOUND : WAVE_START_SOUND);
  }
  const total = isBossWave ? 1 : BALANCE.wave.enemiesPerWave;
  waveQueue.push({ waveNum: nextWaveNum, enemiesSpawned: 0, total, spawnTimer: 0 });
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
        if (b.variant === 'rocket' || b.variant === 'hellfire') {
          playAudio(ROCKET_HIT_SOUND);
        }
        if (b.variant === 'nuke') {
          playAudio(NUKE_HIT_SOUND);
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

  zaps = zaps.filter(z => {
    if (z.delay) {
      z.delay -= dt;
      if (z.delay > 0) return true;
    }
    z.time -= dt;
    return z.time > 0;
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

  if (waveActive) {
    waveElapsed += dt;
    for (const w of waveQueue) {
      w.spawnTimer -= dt;
      while (w.spawnTimer <= 0 && w.enemiesSpawned < w.total) {
        spawnEnemy(w.waveNum);
        w.enemiesSpawned++;
        w.spawnTimer += spawnInterval;
      }
    }
  }

  const liveTargets = catLives.filter(l => l.alive);
  enemies = enemies.filter(e => {
    const target = liveTargets[0];
    if (!target) return false;

    const goalCell = { x: target.gx, y: target.gy };
    const curCell = pxToCell({ x: e.x, y: e.y });
    const crossed = !e.lastCell || e.lastCell.x !== curCell.x || e.lastCell.y !== curCell.y;
    e.lastCell = curCell;

    if (
      !e.path || !e.path.length ||
      !e.goalCell || e.goalCell.x !== goalCell.x || e.goalCell.y !== goalCell.y ||
      (e.navVersion !== NAV_VERSION && crossed)
    ) {
      e.path = findPath(curCell, goalCell);
      e.goalCell = goalCell;
      e.navVersion = NAV_VERSION;
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
      e.goalCell = goalCell;
      e.navVersion = NAV_VERSION;
    }

    e.velX = (e.x - prevX) / dt;
    e.velY = (e.y - prevY) / dt;

    const dtgt = Math.hypot(target.x - e.x, target.y - e.y);
    if (dtgt < e.r + target.r) {
      target.alive = false;
      playAudio(CAT_DEATH_SOUND);
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
    let possible = [];
    for (const e of enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= rangePx) {
        if (d <= closest) { target = e; closest = d; }
        if (t.type === 'terminator') possible.push({ e, d });
      }
    }
    if (t.type === 'terminator') {
      possible.sort((a, b) => a.d - b.d);
      t.targets = possible.slice(0, 5).map(p => p.e);
    } else {
      t.targets = null;
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
          playFireSound(t);
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
        playFireSound(t);
      }
    } else if (t.cooldown <= 0 && target) {
      const angle = t.angle;
      if (t.type === 'laser' || t.type === 'dualLaser') {
        target.health -= t.damage;
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
        playFireSound(t);
        if (target.health <= 0) {
            enemies.splice(enemies.indexOf(target), 1);
            money += killReward;
            t.kills = (t.kills || 0) + 1;
        }
      } else if (t.type === 'tesla') {
        target.health -= t.damage;
        const x1 = t.x + Math.cos(angle) * (CELL_PX / 2);
        const y1 = t.y + Math.sin(angle) * (CELL_PX / 2);
        const points = createZap(x1, y1, target.x, target.y);
        zaps.push({ points, time: 0.1 });
        t.cooldown = 1 / t.fireRate;
        playFireSound(t);
        if (target.health <= 0) {
            enemies.splice(enemies.indexOf(target), 1);
            money += killReward;
            t.kills = (t.kills || 0) + 1;
        }
      } else if (t.type === 'terminator') {
        const targets = t.targets || [];
        if (targets.length) {
          for (const e of targets) {
            const ang = Math.atan2(e.y - t.y, e.x - t.x);
            const x1 = t.x + Math.cos(ang) * (CELL_PX / 2);
            const y1 = t.y + Math.sin(ang) * (CELL_PX / 2);
            const points = createZap(x1, y1, e.x, e.y);
            zaps.push({ points, time: 0.1, colors: ['#f88','#f00'] });
            e.health -= t.damage;
            if (e.health <= 0) {
              enemies.splice(enemies.indexOf(e), 1);
              money += killReward;
              t.kills = (t.kills || 0) + 1;
            }
          }
          t.cooldown = 1 / t.fireRate;
          playFireSound(t);
        }
      } else if (t.type === 'wunderwaffe') {
        const angle = t.angle;
        let x1 = t.x + Math.cos(angle) * (CELL_PX / 2);
        let y1 = t.y + Math.sin(angle) * (CELL_PX / 2);
        let delay = 0;
        const chain = enemies.slice();
        const idx = chain.indexOf(target);
        if (idx > -1) { chain.splice(idx,1); chain.unshift(target); }
        for (const e of chain) {
          const points = createZap(x1, y1, e.x, e.y);
          zaps.push({ points, time: 0.1, delay });
          e.health -= t.damage;
          if (e.health <= 0) {
            enemies.splice(enemies.indexOf(e), 1);
            money += killReward;
            t.kills = (t.kills || 0) + 1;
          }
          x1 = e.x; y1 = e.y; delay += 0.05;
        }
        t.cooldown = 1 / t.fireRate;
        playFireSound(t);
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
        playFireSound(t);
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
        playFireSound(t);
      } else {
        const angle = t.angle;
        const sx = t.x + Math.cos(angle) * (CELL_PX / 2);
        const sy = t.y + Math.sin(angle) * (CELL_PX / 2);
        bullets.push({ x: sx, y: sy, target, speed: CANNON_BASE.bulletSpeed * CELL_PX, damage: t.damage, source: t });
        t.cooldown = 1 / t.fireRate;
        playFireSound(t);
      }
    }
  }

  updateProjectiles(dt);
  if (catLives.every(l => !l.alive)) { endGame(); return; }
  if (!waveActive) {
    if (!firstPlacementDone) return;
    preWaveTimer -= dt;
    if (preWaveTimer <= 0) queueWave();
    return;
  }

  const currentWave = waveQueue[0];
  if (currentWave && currentWave.enemiesSpawned >= currentWave.total) {
    const remaining = enemies.some(e => e.waveNum === currentWave.waveNum);
    if (!remaining) {
      money += difficultySettings.waveReward;
      playAudio(WAVE_COMPLETE_SOUND);
      const completedWave = currentWave.waveNum;
      applyWaveEndRewards(completedWave);
      waveQueue.shift();
      waveIndex++;
      waveElapsed = 0;
      if (waveQueue.length === 0) {
        waveActive = false;
        preWaveTimer = BALANCE.wave.postWaveDelay;
      }
    }
  }

  if (waveElapsed >= BALANCE.wave.time) {
    queueWave();
    waveElapsed = 0;
  }
}

function drawBG() {
  const w = gameCanvas.clientWidth, h = gameCanvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (gridCache) ctx.drawImage(gridCache, originPx.x, originPx.y);
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
  const statsEl = $id('gameStats');
  const overlayEl = el.overlayStats;
  if (!statsEl && !overlayEl && !el.upNextBanner) return;
  let html = '';
  html += `Wave: ${waveIndex + 1}<br>`;
  html += `Enemies: ${enemies.length}<br>`;
  if (!waveActive) {
    if (firstPlacementDone && preWaveTimer > 0) {
      html += `Next wave in: ${preWaveTimer.toFixed(1)}s<br>`;
    }
  } else {
    html += `Time: ${Math.max(0, BALANCE.wave.time - waveElapsed).toFixed(1)}s<br>`;
  }
  html += `Lives: ${catLives.filter(l => l.alive).length}<br>`;
  html += `Money: $${money}`;
  if (el.upNextBanner) {
    const nextName = getNextWaveEnemyName();
    el.upNextBanner.textContent = nextName ? `Up Next: ${nextName}` : '';
  }
  updateBuildMenuAvailability();
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
        t.type === 'tesla' ? ASSETS.tesla :
        t.type === 'terminator' ? ASSETS.terminator :
        t.type === 'wunderwaffe' ? ASSETS.wunderwaffe :
        t.type === 'nuke' ? ASSETS.nuke :
        t.type === 'hellfire' ? ASSETS.hellfire :
        t.type === 'dualLaser' ? ASSETS.dualLaser :
        t.type === 'railgun' ? ASSETS.railgun :
        t.type === 'sniper' ? ASSETS.sniper :
        t.type === 'shotgun' ? ASSETS.shotgun : ASSETS.cannon;
      if (imgReady(art.base)) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.drawImage(art.base, -TOWER_PX / 2, -TOWER_PX / 2, TOWER_PX, TOWER_PX);
        if (imgReady(art.turret)) {
          const angle = t.angle || 0;
          ctx.rotate(angle);
          ctx.drawImage(art.turret, -TOWER_PX / 2, -TOWER_PX / 2, TOWER_PX, TOWER_PX);
          if ((t.type === 'rocket' || t.type === 'hellfire') && t.anim > 0) {
            ctx.beginPath();
            ctx.fillStyle = 'orange';
            ctx.arc(TOWER_PX / 2, 0, 6 * (t.anim / 0.1), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(
          originPx.x + t.gx * CELL_PX - (TOWER_PX - CELL_PX) / 2,
          originPx.y + t.gy * CELL_PX - (TOWER_PX - CELL_PX) / 2,
          TOWER_PX,
          TOWER_PX
        );
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

  // Zaps
  for (const zap of zaps) {
    if (zap.delay && zap.delay > 0) continue;
    const pts = zap.points;
    const cols = zap.colors || ['#ccf', '#66f'];
    const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    cols.forEach((c, i) => grad.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
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
  const dt = Math.min(0.025, (ts - lastT) / 1000); // clamp for tab-jumps
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
  mouse.x = e.offsetX; mouse.y = e.offsetY; mouse.active = true;
}
function onCanvasClick(e) {
  const cell = pxToCell({ x: e.offsetX, y: e.offsetY });
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
        money += BALANCE.wallCost;
      }
    }
    recalcEnemyPaths();
    return;
  }

  if (selectedBuild === 'wall') {
    if (canPlace(cell) && money >= BALANCE.wallCost) {
      money -= BALANCE.wallCost;
      addOccupancy(gx, gy);
      walls.push({ x: gx, y: gy });
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  } else {
    // Any tower type in TOWER_BASES
    const base = TOWER_BASES[selectedBuild];
    if (base && canPlace(cell) && money >= base.cost) {
      money -= base.cost;
      addOccupancy(gx, gy);
      towers.push(makeTower(selectedBuild, gx, gy));
      firstPlacementDone = true;
      recalcEnemyPaths();
    }
  }
}
function onKey(e) {
  if (e.key === 'Escape') {
    endGame();
  } else if (e.key === '1') {
    if (money >= BALANCE.wallCost) selectedBuild = 'wall';
  } else if (e.key === '2') {
    if (money >= CANNON_BASE.cost) selectedBuild = 'cannon';
  } else if (e.key === '3') {
    if (money >= LASER_BASE.cost) selectedBuild = 'laser';
  } else if (e.key === '4') {
    if (money >= ROCKET_BASE.cost) selectedBuild = 'rocket';
  } else if (e.key === '5') {
    if (money >= TESLA_BASE.cost) selectedBuild = 'tesla';
  } else if (e.key.toLowerCase() === 'x') {
    selectedBuild = 'sell';
  }
}

async function startGame() {
  // UI
  container && (container.style.display = 'none');
  menu && (menu.style.display = 'none');
  el.quitGameBtn && (el.quitGameBtn.style.display = 'inline-block');
  el.nextWaveBtn && (el.nextWaveBtn.style.display = 'inline-block');
  el.statsOverlay && (el.statsOverlay.style.display = 'block');
  el.hoverMenu && (el.hoverMenu.style.display = 'flex');
  overlayHeader && (overlayHeader.style.display = 'flex');
  el.overlayStats && (el.overlayStats.style.display = 'block');
  el.upNextBanner && (el.upNextBanner.style.display = 'block');
  el.gameOverPanel && (el.gameOverPanel.style.display = 'none');

  // Canvas
  ensureCanvas();
  await setBattlefield(loadBattlefield());
  const opts = loadOpts();
  const grid = opts.gridOverride ? opts.gridSize : currentMap.grid;
  applyGridSize(grid);
  gameCanvas.style.display = 'block';
  resizeCanvas();

  // Optional fullscreen
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
  playAudio(GAME_START_SOUND);
  rafId = requestAnimationFrame(loop);
}

function endGame() {
  if (!ctx) return;
  running = false;
  playAudio(GAME_OVER_SOUND);
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  unbindInputs();
  selectedTower = null;
  updateSelectedTowerInfo();
  selectedBuild = null;
  el.contextMenu && (el.contextMenu.style.display = 'none');
  el.hoverMenu && (el.hoverMenu.style.display = 'none');
  overlayHeader && (overlayHeader.style.display = 'none');
  el.overlayStats && (el.overlayStats.style.display = 'none');
  el.upNextBanner && (el.upNextBanner.style.display = 'none');
  el.nextWaveBtn && (el.nextWaveBtn.style.display = 'none');
  el.quitGameBtn && (el.quitGameBtn.style.display = 'none');
  el.statsOverlay && (el.statsOverlay.style.display = 'block');
  el.gameOverPanel && (el.gameOverPanel.style.display = 'block');
  el.pauseBtn && (el.pauseBtn.textContent = 'Pause');

  const waveNum = waveIndex; // waves completed
  recordBestWave(waveNum);
  syncBestWave();
  if (el.gameOverText) {
    el.gameOverText.textContent = `Game Over at wave ${waveNum} after ${waveElapsed.toFixed(1)}s.`;
  }
}

function returnToMenu() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  unbindInputs();
  gameCanvas && (gameCanvas.style.display = 'none');
  el.hoverMenu && (el.hoverMenu.style.display = 'none');
  el.statsOverlay && (el.statsOverlay.style.display = 'none');
  el.gameOverPanel && (el.gameOverPanel.style.display = 'none');
  container && (container.style.display = 'block');
  menu && (menu.style.display = '');
  selectedTower = null;
  updateSelectedTowerInfo();
  selectedBuild = null;
  el.contextMenu && (el.contextMenu.style.display = 'none');
  el.pauseBtn && (el.pauseBtn.textContent = 'Pause');
}

// -------------------- Hooks --------------------

el.battlefieldBtn?.addEventListener('click', () => {
  const current = loadBattlefield();
  if (el.battlefieldDialog) {
    const radios = el.battlefieldDialog.querySelectorAll('input[name="battlefield"]');
    radios.forEach(r => { r.checked = (r.value === current); });
    el.battlefieldDialog.showModal();
  }
});
el.saveBattlefield?.addEventListener('click', async () => {
  const selected = el.battlefieldDialog?.querySelector('input[name="battlefield"]:checked')?.value || 'backyard';
  saveBattlefield(selected);
  await setBattlefield(selected);
  const opts = loadOpts();
  if (!opts.gridOverride) {
    opts.gridSize = currentMap.grid;
    saveOpts(opts);
    applyGridSize(opts.gridSize);
  }
});

el.startBtn?.addEventListener('click', () => {
  startGame();
});
el.quitGameBtn?.addEventListener('click', () => endGame());
el.quitBtn?.addEventListener('click', () => alert('Thanks for stopping by! You can close this tab any time.'));
el.nextWaveBtn?.addEventListener('click', () => {
  if (!running) return;
  queueWave();
});
el.retryBtn?.addEventListener('click', () => startGame());
el.gameOverQuitBtn?.addEventListener('click', () => returnToMenu());
