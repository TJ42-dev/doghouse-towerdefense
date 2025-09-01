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
const catLivesElm = document.getElementById('catLives');
let selectedTower = null;

let gameCanvas = document.getElementById('gameCanvas'); // can be null initially
let ctx = null;

// -------------------- Grid & Build --------------------
// Fixed playfield grid
const GRID_COLS = 36;
const GRID_ROWS = 26;

const DOGHOUSE_DOOR_CELL = { x: 28, y: 21 };
const DOGHOUSE_SPAWN_CELL = { x: 27, y: 21 };
const DOOR_TARGET = { gx: DOGHOUSE_DOOR_CELL.x, gy: DOGHOUSE_DOOR_CELL.y, r: 0.5 };
const ENEMY_ENTRIES = [
  { x: 5, y: 0 },
  { x: Math.floor(GRID_COLS / 2), y: 0 },
  { x: GRID_COLS - 6, y: 0 },
  { x: 0, y: Math.floor(GRID_ROWS / 2) },
  { x: 0, y: GRID_ROWS - 6 }
];

let CELL_PX = 20; // size of one grid cell in pixels (computed on resize)
let originPxX = 0; // playfield offset from canvas top-left in pixels
let originPxY = 0;
let walls = [];
let occupied = new Set();
let selectedBuild = null;
let towers = [];
let bullets = [];
let beams = [];
let money = 0;
let buildHistory = [];

const occKey = (x, y) => `${x},${y}`;
function addWall(gx, gy) {
  const k = occKey(gx, gy);
  if (!occupied.has(k)) {
    walls.push({ x: gx, y: gy });
    occupied.add(k);
  }
}
function hasWall(gx, gy) { return occupied.has(occKey(gx, gy)); }
function removeWall(gx, gy) {
  const k = occKey(gx, gy);
  occupied.delete(k);
  walls = walls.filter(w => w.x !== gx || w.y !== gy);
}
function isBlocked(gx, gy) { return hasWall(gx, gy); }

function canPlace(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS) return false;
  const k = occKey(gx, gy);
  if (occupied.has(k)) return false;
  occupied.add(k);
  const ok = ENEMY_ENTRIES.every(entry => {
    const p = findPath(entry, DOGHOUSE_DOOR_CELL);
    return p.length > 0 || (entry.x === DOGHOUSE_DOOR_CELL.x && entry.y === DOGHOUSE_DOOR_CELL.y);
  });
  occupied.delete(k);
  return ok;
}

// Tower and enemy stats are loaded from external JSON for easier tuning
let CANNON_BASE = { damage: 80, fireRate: 0.5, range: 4, bulletSpeed: 5 };
let LASER_BASE = { damage: 120, fireRate: 0.4, range: 4 };
let TOWER_TYPES = [];

function cellToPx(cell) {
  return {
    x: originPxX + (cell.x + 0.5) * CELL_PX,
    y: originPxY + (cell.y + 0.5) * CELL_PX,
  };
}

function pxToCell(px) {
  return {
    x: Math.min(GRID_COLS - 1, Math.max(0, Math.floor((px.x - originPxX) / CELL_PX))),
    y: Math.min(GRID_ROWS - 1, Math.max(0, Math.floor((px.y - originPxY) / CELL_PX))),
  };
}

function doorPx() { return cellToPx(DOGHOUSE_DOOR_CELL); }
function doorSpawnPx() { return cellToPx(DOGHOUSE_SPAWN_CELL); }

function positionCatLives() {
  if (!catLivesElm || !gameCanvas) return;
  const p = doorPx();
  const rect = gameCanvas.getBoundingClientRect();
  catLivesElm.style.left = (rect.left + p.x) + 'px';
  catLivesElm.style.top = (rect.top + p.y) + 'px';
}

function updateCatLivesUI() {
  if (!catLivesElm) return;
  const count = catLives.filter(l => l.alive).length;
  catLivesElm.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    img.src = CAT_SRC;
    img.width = CELL_PX;
    img.height = CELL_PX;
    catLivesElm.appendChild(img);
  }
  catLivesElm.style.width = (CELL_PX * 3) + 'px';
  catLivesElm.style.height = (CELL_PX * 3) + 'px';
}

// Basic BFS pathfinding to navigate around walls
function findPath(start, goal) {
  const key = (x, y) => `${x},${y}`;
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
  ];
  const h = (x, y) => Math.hypot(x - goal.x, y - goal.y);
  const open = [start];
  const cameFrom = new Map();
  const gScore = new Map([[key(start.x, start.y), 0]]);
  const fScore = new Map([[key(start.x, start.y), h(start.x, start.y)]]);
  const closed = new Set();

  while (open.length) {
    let bestIdx = 0;
    let bestF = fScore.get(key(open[0].x, open[0].y)) ?? Infinity;
    for (let i = 1; i < open.length; i++) {
      const k = key(open[i].x, open[i].y);
      const f = fScore.get(k) ?? Infinity;
      if (f < bestF) { bestF = f; bestIdx = i; }
    }
    const current = open.splice(bestIdx, 1)[0];
    const ck = key(current.x, current.y);
    if (current.x === goal.x && current.y === goal.y) break;
    closed.add(ck);

    for (const [dx, dy, cost] of dirs) {
      const nx = current.x + dx, ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_COLS || ny >= GRID_ROWS) continue;
      if (dx && dy) {
        if (isBlocked(current.x + dx, current.y) || isBlocked(current.x, current.y + dy)) continue;
      }
      if (isBlocked(nx, ny) && !(nx === goal.x && ny === goal.y)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const tentative = (gScore.get(ck) ?? Infinity) + cost;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + h(nx, ny));
        if (!open.find(n => n.x === nx && n.y === ny)) open.push({ x: nx, y: ny });
      }
    }
  }

  const path = [];
  let cur = goal;
  const goalKey = key(goal.x, goal.y);
  if (!cameFrom.has(goalKey) && (goal.x !== start.x || goal.y !== start.y)) return path;
  while (cur.x !== start.x || cur.y !== start.y) {
    path.push(cur);
    const k = key(cur.x, cur.y);
    cur = cameFrom.get(k);
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
    removeWall(selectedTower.gx, selectedTower.gy);
    towers = towers.filter(t => t !== selectedTower);
    buildHistory = buildHistory.filter(b => b.tower !== selectedTower);
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
  CELL_PX = Math.floor(Math.min(gameCanvas.clientWidth / GRID_COLS, gameCanvas.clientHeight / GRID_ROWS));
  const pfW = CELL_PX * GRID_COLS;
  const pfH = CELL_PX * GRID_ROWS;
  originPxX = Math.floor((gameCanvas.clientWidth - pfW) / 2);
  originPxY = Math.floor((gameCanvas.clientHeight - pfH) / 2);
  positionCatLives();
  updateCatLivesUI();
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
  walls = [];
  occupied = new Set();
  selectedBuild = null;
  towers = [];
  bullets = [];
  money = 0;
  buildHistory = [];
  selectedTower = null;
  updateSelectedTowerInfo();
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

  // Block outer ring and doghouse region
  for (let x = 0; x < GRID_COLS; x++) { addWall(x, 0); addWall(x, GRID_ROWS - 1); }
  for (let y = 1; y < GRID_ROWS - 1; y++) { addWall(0, y); addWall(GRID_COLS - 1, y); }
  const dogX0 = GRID_COLS - 7 - 1;
  const dogY0 = GRID_ROWS - 8 - 1;
  for (let x = 0; x < 7; x++) {
    for (let y = 0; y < 8; y++) addWall(dogX0 + x, dogY0 + y);
  }

  // reset cat lives and position UI near the doghouse door
  catLives = [];
  const cols = 3;
  const startCellX = DOGHOUSE_DOOR_CELL.x - 1;
  const startCellY = DOGHOUSE_DOOR_CELL.y - 1;
  for (let i = 0; i < INITIAL_LIVES; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    catLives.push({ gx: startCellX + col, gy: startCellY + row, r: 0.5, alive: true });
  }
  updateCatLivesUI();
  positionCatLives();
}

function spawnEnemy() {
  const entry = ENEMY_ENTRIES[Math.floor(Math.random() * ENEMY_ENTRIES.length)];
  let x = entry.x + 0.5;
  let y = entry.y + 0.5;
  if (entry.y === 0) y -= 1;
  if (entry.x === 0) x -= 1;
  const r = 0.5;
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
  const baseSpeed = 2.5 * stats.baseSpeed;
  const speed = baseSpeed * (0.9 + Math.random()*0.4); // cells/sec
  let health = stats.baseHealth;
  if (waveIndex > BOSS_WAVE_INDEX) {
    const scale = 1 + (waveIndex - BOSS_WAVE_INDEX) * HEALTH_SCALE_AFTER_BOSS;
    health = Math.round(health * scale);
  }
  const startCell = { x: entry.x, y: entry.y };
  const goalCell = { x: DOOR_TARGET.gx, y: DOOR_TARGET.gy };
  const path = findPath(startCell, goalCell);

  enemies.push({ x, y, r, speed, img, path, goalCell, health });
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

  enemies = enemies.filter(e => {
    const goal = DOOR_TARGET;
    const goalCell = { x: goal.gx, y: goal.gy };
    const curCell = { x: Math.min(Math.max(Math.floor(e.x), 0), GRID_COLS-1),
                      y: Math.min(Math.max(Math.floor(e.y), 0), GRID_ROWS-1) };

    if (!e.path || !e.path.length || !e.goalCell || e.goalCell.x !== goalCell.x || e.goalCell.y !== goalCell.y) {
      e.path = findPath(curCell, goalCell);
      e.goalCell = goalCell;
    }

    if (
      e.path &&
      e.path.length &&
      isBlocked(e.path[0].x, e.path[0].y) &&
      !(e.path[0].x === goalCell.x && e.path[0].y === goalCell.y)
    ) {
      e.path = findPath(curCell, goalCell);
    }

    let destX = goalCell.x + 0.5, destY = goalCell.y + 0.5;
    if (e.path && e.path.length) {
      const step = e.path[0];
      destX = step.x + 0.5;
      destY = step.y + 0.5;
    }

    const prevX = e.x, prevY = e.y;
    const dx = destX - e.x;
    const dy = destY - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = e.speed * dt;
    if (d <= move) {
      e.x = destX;
      e.y = destY;
      if (e.path && e.path.length) e.path.shift();
    } else {
      e.x += (dx / d) * move;
      e.y += (dy / d) * move;
    }
    const gx = Math.floor(e.x);
    const gy = Math.floor(e.y);
    if (isBlocked(gx, gy) && !(gx === goalCell.x && gy === goalCell.y)) {
      e.x = prevX; e.y = prevY;
      e.path = findPath(curCell, goalCell);
    }

    const dtgt = Math.hypot((goalCell.x + 0.5) - e.x, (goalCell.y + 0.5) - e.y);
    if (dtgt < e.r + goal.r) {
      const life = catLives.find(l => l.alive);
      if (life) life.alive = false;
      updateCatLivesUI();
      sfx(160, 0.15, 0.06, 'sawtooth');
      return false;
    }

    return true;
  });

  // Tower behavior
  for (const t of towers) {
    t.cooldown -= dt;
    const tx = t.gx + 0.5;
    const ty = t.gy + 0.5;
    const range = t.range;
    let target = null;
    let closest = range;
    for (const e of enemies) {
      const d = Math.hypot(e.x - tx, e.y - ty);
      if (d <= closest) { target = e; closest = d; }
    }
    t.target = target;
    if (t.cooldown <= 0 && target) {
      if (t.type === 'laser') {
        target.health -= t.damage;
        bark();
        beams.push({ x1: tx, y1: ty, x2: target.x, y2: target.y, time: 0.05 });
        t.cooldown = 1 / t.fireRate;
        sfx(1200, 0.05, 0.04, 'sine');
        if (target.health <= 0) {
          enemies.splice(enemies.indexOf(target), 1);
          money += 10;
        }
      } else {
        bullets.push({ x: tx, y: ty, target, speed: CANNON_BASE.bulletSpeed, damage: t.damage });
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
    const x = originPxX + i * CELL_PX;
    ctx.moveTo(x, originPxY);
    ctx.lineTo(x, originPxY + GRID_ROWS * CELL_PX);
    ctx.stroke();
  }
  for (let i = 0; i <= GRID_ROWS; i++) {
    ctx.beginPath();
    const y = originPxY + i * CELL_PX;
    ctx.moveTo(originPxX, y);
    ctx.lineTo(originPxX + GRID_COLS * CELL_PX, y);
    ctx.stroke();
  }
  for (const wObj of walls) {
    if (towers.some(t => t.gx === wObj.x && t.gy === wObj.y)) continue;
    const center = cellToPx({ x: wObj.x, y: wObj.y });
    const px = center.x - CELL_PX / 2;
    const py = center.y - CELL_PX / 2;
    if (imgReady(ASSETS.wall)) {
      ctx.drawImage(ASSETS.wall, px, py, CELL_PX, CELL_PX);
    } else {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.fillRect(px, py, CELL_PX, CELL_PX);
    }
  }
}
function drawGhost() {
  if (!selectedBuild || !mouse.active) return;
  if (mouse.x < originPxX || mouse.y < originPxY ||
      mouse.x >= originPxX + GRID_COLS * CELL_PX ||
      mouse.y >= originPxY + GRID_ROWS * CELL_PX) return;
  const cell = pxToCell(mouse);
  const gx = cell.x, gy = cell.y;
  const valid = canPlace(gx, gy);
  const pos = cellToPx(cell);
  let img = null;
  if (selectedBuild === 'wall') img = ASSETS.wall;
  else if (selectedBuild === 'cannon') img = ASSETS.cannon;
  else if (selectedBuild === 'laser') img = ASSETS.laser;
  ctx.save();
  ctx.globalAlpha = 0.5;
  if (imgReady(img)) {
    ctx.drawImage(img, pos.x - CELL_PX / 2, pos.y - CELL_PX / 2, CELL_PX, CELL_PX);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillRect(pos.x - CELL_PX / 2, pos.y - CELL_PX / 2, CELL_PX, CELL_PX);
  }
  if (!valid) {
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(pos.x - CELL_PX / 2, pos.y - CELL_PX / 2, CELL_PX, CELL_PX);
  }
  ctx.restore();
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

  // Towers
  for (const t of towers) {
    const img = t.type === 'laser' ? ASSETS.laser : ASSETS.cannon;
    const center = cellToPx({ x: t.gx, y: t.gy });
    if (imgReady(img)) {
      const cx = t.gx + 0.5;
      const cy = t.gy + 0.5;
      const angle = t.target ? Math.atan2(t.target.y - cy, t.target.x - cx) : 0;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);
      ctx.drawImage(img, -CELL_PX / 2, -CELL_PX / 2, CELL_PX, CELL_PX);
      ctx.restore();
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(center.x - CELL_PX / 2, center.y - CELL_PX / 2, CELL_PX, CELL_PX);
    }
  }

  drawGhost();

  // Enemies (safe draw)
  for (const e of enemies) {
    const pos = cellToPx({ x: e.x, y: e.y });
    const rPx = e.r * CELL_PX;
    if (imgReady(e.img)) {
      ctx.drawImage(e.img, pos.x - rPx, pos.y - rPx, rPx * 2, rPx * 2);
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rPx, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }

  // Beams
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  for (const beam of beams) {
    const p1 = cellToPx({ x: beam.x1, y: beam.y1 });
    const p2 = cellToPx({ x: beam.x2, y: beam.y2 });
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Bullets
  for (const b of bullets) {
    const pos = cellToPx({ x: b.x, y: b.y });
    ctx.beginPath();
    ctx.fillStyle = '#ff0';
    ctx.arc(pos.x, pos.y, CELL_PX / 6, 0, Math.PI * 2);
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
  const px = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (px.x < originPxX || px.y < originPxY ||
      px.x >= originPxX + GRID_COLS * CELL_PX ||
      px.y >= originPxY + GRID_ROWS * CELL_PX) return;
  const cell = pxToCell(px);
  const gx = cell.x;
  const gy = cell.y;

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

  if (!canPlace(gx, gy)) return;

  if (selectedBuild === 'wall') {
    addWall(gx, gy);
    buildHistory.push({ type: 'wall', gx, gy });
  } else if (selectedBuild === 'cannon') {
    addWall(gx, gy);
    const t = {
      gx,
      gy,
      type: 'cannon',
      cooldown: 0,
      base: { damage: CANNON_BASE.damage, fireRate: CANNON_BASE.fireRate, range: CANNON_BASE.range },
      damage: CANNON_BASE.damage,
      fireRate: CANNON_BASE.fireRate,
      range: CANNON_BASE.range,
      upgrades: { damage: 0, fireRate: 0, range: 0 },
      target: null
    };
    towers.push(t);
    buildHistory.push({ type: 'cannon', gx, gy, tower: t });
  } else if (selectedBuild === 'laser') {
    addWall(gx, gy);
    const t = {
      gx,
      gy,
      type: 'laser',
      cooldown: 0,
      base: { damage: LASER_BASE.damage, fireRate: LASER_BASE.fireRate, range: LASER_BASE.range },
      damage: LASER_BASE.damage,
      fireRate: LASER_BASE.fireRate,
      range: LASER_BASE.range,
      upgrades: { damage: 0, fireRate: 0, range: 0 },
      target: null
    };
    towers.push(t);
    buildHistory.push({ type: 'laser', gx, gy, tower: t });
  }
}
function undoLastPlacement() {
  const last = buildHistory.pop();
  if (!last) return;
  removeWall(last.gx, last.gy);
  if (last.tower) {
    towers = towers.filter(t => t !== last.tower);
    if (selectedTower === last.tower) { selectedTower = null; updateSelectedTowerInfo(); }
  }
}
function onKey(e) {
  if (e.key === 'Escape') endGame();
  else if (e.key.toLowerCase() === 'z') undoLastPlacement();
}

async function startGame() {
  // UI
  container && (container.style.display = 'none');
  menu && (menu.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'inline-block');
  nextWaveBtn && (nextWaveBtn.style.display = 'inline-block');
  hoverMenu && (hoverMenu.style.display = 'block');
  catLivesElm && (catLivesElm.style.display = 'grid');

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
  catLivesElm && (catLivesElm.style.display = 'none');
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
