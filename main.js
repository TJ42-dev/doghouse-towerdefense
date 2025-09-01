// -------------------- Options & DOM --------------------
const LS_KEY = 'godot_web_options';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');         // main page "Quit"
const quitGameBtn = document.getElementById('quitGameBtn'); // in-game "Quit"
const nextWaveBtn = document.getElementById('nextWaveBtn'); // force next wave
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const saveBtn = document.getElementById('saveOptions');
const menu = document.querySelector('.menu');
const container = document.querySelector('.container');
const hoverMenu = document.getElementById('hoverMenu');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const wallBtn = document.getElementById('wallBtn');
const cannonBtn = document.getElementById('cannonBtn');
const laserBtn = document.getElementById('laserBtn');
const cancelBuildBtn = document.getElementById('cancelBuildBtn');
const upgradeDamageBtn = document.getElementById('upgradeDamage');
const upgradeFireRateBtn = document.getElementById('upgradeFireRate');
const upgradeRangeBtn = document.getElementById('upgradeRange');
const sellBtn = document.getElementById('sellTower');
const selectedTowerInfo = document.getElementById('selectedTowerInfo');
const damageBar = document.getElementById('damageBar');
const fireRateBar = document.getElementById('fireRateBar');
const rangeBar = document.getElementById('rangeBar');
const quitInMenuBtn = document.getElementById('quitInMenuBtn');
const contextMenu = document.getElementById('contextMenu');
let selectedTower = null;

let gameCanvas = document.getElementById('gameCanvas'); // can be null initially
let ctx = null;

// -------------------- Grid & Build --------------------
// Fixed logical grid
const GRID_COLS = 36;
const GRID_ROWS = 26;
let CELL_PX = 22; // pixel size of a cell (computed on resize)
let originPx = { x: 0, y: 0 }; // top-left of playfield in pixels

// Occupancy map mirrors walls & towers
let occupancy = new Set();
let walls = [];
let selectedBuild = null;
let towers = [];
let bullets = [];
let beams = [];
let money = 0;

// Landmarks
const DOGHOUSE_DOOR_CELL = { x: 28, y: 21 };
const DOGHOUSE_SPAWN_CELL = { x: 27, y: 21 };

// Entry points for enemies
const ENTRIES = [
  { x: 5, y: 0 },
  { x: 15, y: 0 },
  { x: 0, y: 10 }
];

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

function canPlace(cell) {
  if (!inBounds(cell)) return false;
  if (occupancy.has(key(cell.x, cell.y))) return false;
  addOccupancy(cell.x, cell.y);
  const ok = ENTRIES.every(e => findPath(e, DOGHOUSE_DOOR_CELL).length > 0);
  removeOccupancy(cell.x, cell.y);
  return ok;
}

// Tower and enemy stats are loaded from external JSON for easier tuning
let CANNON_BASE = { damage: 80, fireRate: 0.5, range: 4, bulletSpeed: 5 };
let LASER_BASE = { damage: 120, fireRate: 0.4, range: 4 };
let TOWER_TYPES = [];

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
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? { mute:false, fullscreen:false }; }
  catch { return { mute:false, fullscreen:false }; }
}
function saveOpts(o) { localStorage.setItem(LS_KEY, JSON.stringify(o)); }
function syncUI() {
  const o = loadOpts();
  if (optMute) optMute.checked = !!o.mute;
  if (optFullscreen) optFullscreen.checked = !!o.fullscreen;
}
optionsBtn?.addEventListener('click', () => { syncUI(); dlg?.showModal?.(); });
saveBtn?.addEventListener('click', () => { saveOpts({ mute: optMute?.checked, fullscreen: optFullscreen?.checked }); });

// ----- Hover Menu -----
function activateTab(name) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}
tabButtons.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

wallBtn?.addEventListener('click', () => { selectedBuild = 'wall'; });
cannonBtn?.addEventListener('click', () => { selectedBuild = 'cannon'; });
laserBtn?.addEventListener('click', () => { selectedBuild = 'laser'; });
cancelBuildBtn?.addEventListener('click', () => { selectedBuild = null; });

let drag = null;
hoverMenu?.addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON') return;
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
  if (selectedTower) { upgradeTower(selectedTower, 'damage'); rankUp(); updateSelectedTowerInfo(); }
});
upgradeFireRateBtn?.addEventListener('click', () => {
  if (selectedTower) { upgradeTower(selectedTower, 'fireRate'); rankUp(); updateSelectedTowerInfo(); }
});
upgradeRangeBtn?.addEventListener('click', () => {
  if (selectedTower) { upgradeTower(selectedTower, 'range'); rankUp(); updateSelectedTowerInfo(); }
});
sellBtn?.addEventListener('click', () => {
  if (selectedTower) {
    removeOccupancy(selectedTower.gx, selectedTower.gy);
    towers = towers.filter(t => t !== selectedTower);
    selectedTower = null;
    updateSelectedTowerInfo();
  }
});
quitInMenuBtn?.addEventListener('click', () => endGame());

function updateSelectedTowerInfo() {
  if (!selectedTowerInfo) return;
  if (selectedTower) {
    selectedTowerInfo.textContent = `Selected: ${selectedTower.type}`;
    const maxD = selectedTower.base?.damage * 2;
    const maxF = selectedTower.base?.fireRate * 2;
    const maxR = selectedTower.base?.range * 2;
    if (damageBar && maxD) damageBar.style.width = Math.min(100, selectedTower.damage / maxD * 100) + '%';
    if (fireRateBar && maxF) fireRateBar.style.width = Math.min(100, selectedTower.fireRate / maxF * 100) + '%';
    if (rangeBar && maxR) rangeBar.style.width = Math.min(100, selectedTower.range / maxR * 100) + '%';
  } else {
    selectedTowerInfo.textContent = 'No tower selected';
    if (damageBar) damageBar.style.width = '0%';
    if (fireRateBar) fireRateBar.style.width = '0%';
    if (rangeBar) rangeBar.style.width = '0%';
  }
}

gameCanvas?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!contextMenu) return;
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.style.display = 'block';
});
document.addEventListener('click', () => { if (contextMenu) contextMenu.style.display = 'none'; });

function upgradeTower(t, stat) {
  if (!t.upgrades) t.upgrades = { damage: 0, fireRate: 0, range: 0 };
  if (!t.base) t.base = { damage: t.damage, fireRate: t.fireRate, range: t.range };
  if (t.upgrades[stat] >= 10) return;
  t.upgrades[stat]++;
  t[stat] = t.base[stat] * (1 + 0.1 * t.upgrades[stat]);
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
  const w = Math.max(320, Math.floor(window.innerWidth));
  const h = Math.max(240, Math.floor(window.innerHeight));
  gameCanvas.style.width = w + 'px';
  gameCanvas.style.height = h + 'px';
  gameCanvas.width = Math.floor(w * ratio);
  gameCanvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // draw in CSS pixels
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textBaseline = 'top';
  CELL_PX = Math.floor(Math.min(w / GRID_COLS, h / GRID_ROWS) * 1.1);
  const playW = CELL_PX * GRID_COLS;
  const playH = CELL_PX * GRID_ROWS;
  originPx = {
    x: Math.floor((w - playW) / 2),
    y: Math.floor((h - playH) / 2)
  };
  towers.forEach(t => {
    const p = cellToPx({ x: t.gx, y: t.gy });
    t.x = p.x; t.y = p.y;
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
const CANNON_SRC = 'assets/cannon.svg';
const LASER_SRC = 'assets/laser.svg';
const WALL_SRC = 'assets/wall.svg';
const BOSS_SRC = 'assets/animals/dogs/german.png';
const BOSS_STATS = { baseHealth: 500, baseSpeed: 1.2 };

let DATA_LOADED = false;
async function loadData() {
  if (DATA_LOADED) return;
  try {
    const [towerJson, dogJson] = await Promise.all([
      fetch('data/towers.json').then(r => r.json()),
      fetch('data/dogs.json').then(r => r.json())
    ]);
    if (Array.isArray(towerJson)) {
      TOWER_TYPES = towerJson;
      const cannon = TOWER_TYPES.find(t => t.id === 'cannon');
      if (cannon) CANNON_BASE = { ...CANNON_BASE, ...cannon };
      const laser = TOWER_TYPES.find(t => t.id === 'laser');
      if (laser) LASER_BASE = { ...LASER_BASE, ...laser };
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

let ASSETS = { dogs: [], boss: null, cat: null, cannon: null, laser: null, wall: null };
let assetsReady; // Promise

async function ensureAssets() {
  await loadData();
  if (!assetsReady) {
    assetsReady = (async () => {
        const dogImgs = await Promise.all(DOG_TYPES.map(t => loadImage(t.src)));
        dogImgs.forEach((img, i) => { DOG_TYPES[i].img = img; });
        ASSETS = {
          dogs: DOG_TYPES,
          boss: await loadImage(BOSS_SRC),
          cat: await loadImage(CAT_SRC),
          cannon: await loadImage(CANNON_SRC),
          laser: await loadImage(LASER_SRC),
          wall: await loadImage(WALL_SRC)
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
const START_DELAY = 10; // secs before first wave
const SPAWN_INTERVAL = 0.5; // seconds between enemy spawns
const BOSS_WAVE_INDEX = 4; // zero-based (wave 5)
const HEALTH_SCALE_AFTER_BOSS = 0.2; // 20% more health per wave after boss
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

const player = { x: 0, y: 0, r: 0 };
let mouse = { x: 0, y: 0, active: false };
let enemies = [];
const INITIAL_LIVES = 9;
let catLives = [];

function resetGame() {
  enemies = [];
  selectedBuild = null;
  towers = [];
  bullets = [];
  money = 0;
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
  const c = cssCenter();
  player.x = c.x; player.y = c.y; player.r = 0;
  mouse = { x: c.x, y: c.y, active: false };

  // place cat head lives near the bottom-right, about 9 cells from the edge,
  // then offset them down 4 cells and right 2 cells
  catLives = [];
  const cols = 3, rows = 3;
  const margin = 9; // cells from right edge
  const startCellX = Math.max(0, GRID_COLS - cols - margin) + 2;
  const startCellY = GRID_ROWS - rows - 1 + 4;
  for (let i = 0; i < INITIAL_LIVES; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cell = { x: startCellX + col, y: startCellY + row };
    const p = cellToPx(cell);
    catLives.push({ x: p.x, y: p.y, r: CELL_PX / 2, alive: true });
  }
}

function spawnEnemy() {
  const entry = ENTRIES[Math.floor(Math.random() * ENTRIES.length)];
  const p = cellToPx(entry);
  const r = CELL_PX / 2;
  let stats;
  let img;
  if (waveIndex === BOSS_WAVE_INDEX) {
    stats = BOSS_STATS;
    img = imgReady(ASSETS.boss) ? ASSETS.boss : null;
  } else {
    const type = ASSETS.dogs[waveIndex % ASSETS.dogs.length] || {};
    stats = { ...DEFAULT_DOG_STATS, ...type };
    img = imgReady(type.img) ? type.img : null;
  }
  const baseSpeed = 2.5 * stats.baseSpeed; // cells per second
  const speed = baseSpeed * (0.9 + Math.random()*0.4);
  let health = stats.baseHealth;
  if (waveIndex > BOSS_WAVE_INDEX) {
    const scale = 1 + (waveIndex - BOSS_WAVE_INDEX) * HEALTH_SCALE_AFTER_BOSS;
    health = Math.round(health * scale);
  }
  const path = findPath(entry, DOGHOUSE_DOOR_CELL);

  enemies.push({ x: p.x, y: p.y, r, speed, img, path, goalCell: DOGHOUSE_DOOR_CELL, health });
  enemiesSpawnedInWave++;
}

function startWave() {
  waveActive = true;
  preWaveTimer = 0;
  waveElapsed = 0;
  enemiesSpawnedInWave = 0;
  spawnTimer = 0;
  spawnInterval = SPAWN_INTERVAL;
  horn();
}

function nextWave() {
  waveIndex++;
  startWave();
}

function update(dt) {
  if (mouse.active) {
    player.x += (mouse.x - player.x) * Math.min(1, dt*8);
    player.y += (mouse.y - player.y) * Math.min(1, dt*8);
  }

  if (!waveActive) {
    preWaveTimer -= dt;
    if (preWaveTimer <= 0) startWave();
    return;
  }

  waveElapsed += dt;
  spawnTimer -= dt;
  const enemiesPerWave = waveIndex === BOSS_WAVE_INDEX ? 1 : ENEMIES_PER_WAVE;
  while (spawnTimer <= 0 && enemiesSpawnedInWave < enemiesPerWave) {
    spawnEnemy();
    spawnTimer += spawnInterval;
  }

  const liveTargets = catLives.filter(l => l.alive);
  enemies = enemies.filter(e => {
    const target = liveTargets[0];
    if (!target) return false;

    const goalCell = DOGHOUSE_DOOR_CELL;
    const curCell = pxToCell({ x: e.x, y: e.y });

    if (!e.path || !e.path.length) {
      e.path = findPath(curCell, goalCell);
    }

    if (e.path && e.path.length && isWallAt(e.path[0].x, e.path[0].y)) {
      e.path = findPath(curCell, goalCell);
    }

    let dest = doorPx();
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

    const dtgt = Math.hypot(target.x - e.x, target.y - e.y);
    if (dtgt < e.r + target.r) { target.alive = false; sfx(160, 0.15, 0.06, 'sawtooth'); return false; }

    return true;
  });

  // Tower behavior
  for (const t of towers) {
    t.cooldown -= dt;
    const rangePx = t.range * CELL_PX;
    let target = null;
    let closest = rangePx;
    for (const e of enemies) {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= closest) { target = e; closest = d; }
    }
    t.target = target;
    if (t.cooldown <= 0 && target) {
      if (t.type === 'laser') {
        target.health -= t.damage;
        bark();
        beams.push({ x1: t.x, y1: t.y, x2: target.x, y2: target.y, time: 0.05 });
        t.cooldown = 1 / t.fireRate;
        sfx(1200, 0.05, 0.04, 'sine');
        if (target.health <= 0) {
          enemies.splice(enemies.indexOf(target), 1);
          money += 10;
        }
      } else {
        bullets.push({ x: t.x, y: t.y, target, speed: CANNON_BASE.bulletSpeed * CELL_PX, damage: t.damage });
        t.cooldown = 1 / t.fireRate;
        sfx(880, 0.07, 0.03, 'square');
      }
    }
  }

  // Bullets
  bullets = bullets.filter(b => {
    if (!b.target || !enemies.includes(b.target)) return false;
    const dx = b.target.x - b.x;
    const dy = b.target.y - b.y;
    const dist = Math.hypot(dx, dy);
    const move = b.speed * dt;
    if (dist <= move) {
      b.target.health -= b.damage;
      bark();
      if (b.target.health <= 0) {
        enemies.splice(enemies.indexOf(b.target), 1);
        money += 10;
      }
      return false;
    }
    b.x += (dx / dist) * move;
    b.y += (dy / dist) * move;
    return true;
  });

  beams = beams.filter(b => {
    b.time -= dt;
    return b.time > 0;
  });

  if (waveActive && enemies.length === 0 && enemiesSpawnedInWave >= enemiesPerWave) {
    money += 50;
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
  if (!statsEl) return;
  let html = '';
  if (!waveActive && preWaveTimer > 0) {
    html += `Next wave in: ${preWaveTimer.toFixed(1)}s<br>`;
    html += `Lives: ${catLives.filter(l => l.alive).length}<br>`;
    html += `Money: $${money}`;
  } else {
    html += `Wave: ${waveIndex + 1}<br>`;
    html += `Time: ${Math.max(0, WAVE_TIME - waveElapsed).toFixed(1)}s<br>`;
    html += `Enemies: ${enemies.length}<br>`;
    html += `Lives: ${catLives.filter(l => l.alive).length}<br>`;
    html += `Money: $${money}`;
  }
  statsEl.innerHTML = html;
}
function render() {
  drawBG();
  if (selectedBuild && mouse.active) {
    const cell = pxToCell(mouse);
    const x = originPx.x + cell.x * CELL_PX;
    const y = originPx.y + cell.y * CELL_PX;
    ctx.fillStyle = canPlace(cell) ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
    ctx.fillRect(x, y, CELL_PX, CELL_PX);
  }

    // Towers
    for (const t of towers) {
      const img = t.type === 'laser' ? ASSETS.laser : ASSETS.cannon;
      if (imgReady(img)) {
        const angle = t.target ? Math.atan2(t.target.y - t.y, t.target.x - t.x) : 0;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle);
        ctx.drawImage(img, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX);
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
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  for (const beam of beams) {
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
  }

  // Bullets
  for (const b of bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#ff0';
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
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
  window.addEventListener('keydown', onKey);
}
function unbindInputs() {
  gameCanvas.removeEventListener('mousemove', onMouseMove);
  gameCanvas.removeEventListener('click', onCanvasClick);
  window.removeEventListener('resize', resizeCanvas);
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

  if (selectedBuild === 'wall') {
    if (canPlace(cell)) {
      addOccupancy(gx, gy);
      walls.push({ x: gx, y: gy });
    }
  } else if (selectedBuild === 'cannon') {
    if (canPlace(cell)) {
      addOccupancy(gx, gy);
      const p = cellToPx(cell);
      towers.push({
        gx,
        gy,
        x: p.x,
        y: p.y,
        type: 'cannon',
        cooldown: 0,
        base: { damage: CANNON_BASE.damage, fireRate: CANNON_BASE.fireRate, range: CANNON_BASE.range },
        damage: CANNON_BASE.damage,
        fireRate: CANNON_BASE.fireRate,
        range: CANNON_BASE.range,
        upgrades: { damage: 0, fireRate: 0, range: 0 },
        target: null
      });
    }
  } else if (selectedBuild === 'laser') {
    if (canPlace(cell)) {
      addOccupancy(gx, gy);
      const p = cellToPx(cell);
      towers.push({
        gx,
        gy,
        x: p.x,
        y: p.y,
        type: 'laser',
        cooldown: 0,
        base: { damage: LASER_BASE.damage, fireRate: LASER_BASE.fireRate, range: LASER_BASE.range },
        damage: LASER_BASE.damage,
        fireRate: LASER_BASE.fireRate,
        range: LASER_BASE.range,
        upgrades: { damage: 0, fireRate: 0, range: 0 },
        target: null
      });
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
  hoverMenu && (hoverMenu.style.display = 'block');

  // Canvas
  ensureCanvas();
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
  container && (container.style.display = 'block');
  menu && (menu.style.display = '');
  selectedTower = null;
  updateSelectedTowerInfo();
  contextMenu && (contextMenu.style.display = 'none');

  const msg = `Game Over at wave ${waveIndex + 1} after ${waveElapsed.toFixed(1)}s.`;
  alert(msg);
}

// -------------------- Hooks --------------------
startBtn?.addEventListener('click', () => { startGame(); });
quitGameBtn?.addEventListener('click', () => endGame());
quitBtn?.addEventListener('click', () => alert('Thanks for stopping by! You can close this tab any time.'));
nextWaveBtn?.addEventListener('click', () => {
  if (!running) return;
  if (!waveActive) startWave();
  else nextWave();
});
