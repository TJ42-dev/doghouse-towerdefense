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
const wallBtn = document.getElementById('wallBtn');
const cannonBtn = document.getElementById('cannonBtn');
const cancelBuildBtn = document.getElementById('cancelBuildBtn');
const upgradeBtn = document.getElementById('upgradeTower');
const sellBtn = document.getElementById('sellTower');
const upgradeInfo = document.getElementById('upgradeInfo');
const statWave = document.getElementById('statWave');
const statTime = document.getElementById('statTime');
const statEnemies = document.getElementById('statEnemies');
const statLives = document.getElementById('statLives');
const statMoney = document.getElementById('statMoney');
const optionsQuitBtn = document.getElementById('optionsQuitBtn');
const tabButtons = document.querySelectorAll('#hoverMenu .tab-btn');
const tabPanes = document.querySelectorAll('#hoverMenu .tab-pane');
let selectedTower = null;

let gameCanvas = document.getElementById('gameCanvas'); // can be null initially
let ctx = null;

// -------------------- Grid & Build --------------------
// Base grid resolution. Lower numbers mean larger cells.
const GRID_SIZE = 15;
let CELL = 20; // size of one grid cell in pixels (computed on resize)
let GRID_COLS = GRID_SIZE; // dynamic grid width in cells
let GRID_ROWS = GRID_SIZE; // dynamic grid height in cells
let walls = [];
let selectedBuild = null;
let towers = [];
let bullets = [];
let money = 0;

const CANNON_BASE = { damage: 80, fireRate: 0.5, range: 4, bulletSpeed: 5 };
function cannonDamage() { return CANNON_BASE.damage / (waveIndex + 1); }

function isWallAt(gx, gy) {
  return walls.some(w => w.x === gx && w.y === gy) || towers.some(t => t.gx === gx && t.gy === gy);
}

// Basic BFS pathfinding to navigate around walls
function findPath(start, goal) {
  const key = (x, y) => `${x},${y}`;
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
wallBtn?.addEventListener('click', () => { selectedBuild = 'wall'; });
cannonBtn?.addEventListener('click', () => { selectedBuild = 'cannon'; });
cancelBuildBtn?.addEventListener('click', () => { selectedBuild = null; });
if (hoverMenu) {
  let drag = null;
  hoverMenu.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('tab-btn')) return;
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
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

switchTab('build');

upgradeBtn?.addEventListener('click', () => {
  if (selectedTower) { upgradeTower(selectedTower); rankUp(); }
  updateUpgradeTab();
});

sellBtn?.addEventListener('click', () => {
  if (selectedTower) {
    towers = towers.filter(t => t !== selectedTower);
    selectedTower = null;
  }
  updateUpgradeTab();
});

optionsQuitBtn?.addEventListener('click', () => endGame());

function switchTab(name) {
  tabPanes.forEach(p => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
}

function updateUpgradeTab() {
  if (!upgradeInfo) return;
  if (selectedTower) {
    upgradeInfo.textContent = `Tower Level ${selectedTower.level || 1}`;
    upgradeBtn.disabled = false;
    sellBtn.disabled = false;
  } else {
    upgradeInfo.textContent = 'Select a tower';
    upgradeBtn.disabled = true;
    sellBtn.disabled = true;
  }
}
function upgradeTower(t) {
  t.level = (t.level || 1) + 1;
  t.damage *= 1.25;
  t.fireRate *= 1.1;
  t.range *= 1.1;
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
  CELL = Math.floor(Math.min(gameCanvas.clientWidth, gameCanvas.clientHeight) / GRID_SIZE);
  GRID_COLS = Math.floor(gameCanvas.clientWidth / CELL);
  GRID_ROWS = Math.floor(gameCanvas.clientHeight / CELL);
  towers.forEach(t => { t.x = (t.gx + 0.5) * CELL; t.y = (t.gy + 0.5) * CELL; });
}
function cssCenter() {
  const w = gameCanvas?.clientWidth || window.innerWidth;
  const h = gameCanvas?.clientHeight || window.innerHeight;
  return { x: w / 2, y: h / 2 };
}

// -------------------- Enemy definitions & asset loader --------------------
// Add new dog heads here. Omit baseHealth/baseSpeed to use balanced defaults.
const DEFAULT_DOG_STATS = { baseHealth: 100, baseSpeed: 1.0 };
const DOG_TYPES = [
  { name: 'beagle', src: 'assets/animals/dogs/beagle.png', baseHealth: 60, baseSpeed: 1.3 }, // fast but weak
  { name: 'labrador', src: 'assets/animals/dogs/labrador.png' }, // balanced
  { name: 'bulldog', src: 'assets/animals/dogs/bulldog.png', baseHealth: 150, baseSpeed: 0.7 }, // tough but slow
];
const CAT_SRC = 'assets/animals/cat.png';
const CANNON_SRC = 'assets/cannon.svg';
const WALL_SRC = 'assets/wall.svg';

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

let ASSETS = { dogs: [], cat: null, cannon: null, wall: null };
let assetsReady; // Promise

async function ensureAssets() {
  if (!assetsReady) {
    assetsReady = (async () => {
        const dogImgs = await Promise.all(DOG_TYPES.map(t => loadImage(t.src)));
        dogImgs.forEach((img, i) => { DOG_TYPES[i].img = img; });
        ASSETS = {
          dogs: DOG_TYPES,
          cat: await loadImage(CAT_SRC),
          cannon: await loadImage(CANNON_SRC),
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
  selectedBuild = null;
  towers = [];
  bullets = [];
  money = 0;
  selectedTower = null;
  updateUpgradeTab();
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

  // place cat head lives near the bottom-right, about 9 cells from the edge
  catLives = [];
  const cols = 3, rows = 3;
  const margin = 9; // cells from right edge
  const startCellX = Math.max(0, GRID_COLS - cols - margin);
  const startCellY = GRID_ROWS - rows - 1;
  for (let i = 0; i < INITIAL_LIVES; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    catLives.push({ x: (startCellX + col + 0.5) * CELL, y: (startCellY + row + 0.5) * CELL, r: CELL / 2, alive: true });
  }
}

function spawnEnemy() {
  const x = Math.floor(GRID_COLS / 2) * CELL + CELL / 2;
  const y = -CELL;
  const r = CELL / 2;
  const type = ASSETS.dogs[waveIndex % ASSETS.dogs.length] || {};
  const stats = { ...DEFAULT_DOG_STATS, ...type };
  const baseSpeed = CELL * 2.5 * stats.baseSpeed;
  const speed = baseSpeed * (0.9 + Math.random()*0.4); // px/sec
  const health = stats.baseHealth;

  const img = imgReady(type.img) ? type.img : null;
  const target = catLives.find(l => l.alive) || null;
  const startCell = { x: Math.floor(x / CELL), y: 0 };
  const goalCell = target ? { x: Math.floor(target.x / CELL), y: Math.floor(target.y / CELL) } : null;
  const path = goalCell ? findPath(startCell, goalCell) : [];

  enemies.push({ x, y, r, speed, img, target, path, goalCell, health });
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
  while (spawnTimer <= 0 && enemiesSpawnedInWave < ENEMIES_PER_WAVE) {
    spawnEnemy();
    spawnTimer += spawnInterval;
  }

  const liveTargets = catLives.filter(l => l.alive);
  enemies = enemies.filter(e => {
    if (!e.target || !e.target.alive) e.target = liveTargets[0];
    if (!e.target) return false;

    const goalCell = { x: Math.floor(e.target.x / CELL), y: Math.floor(e.target.y / CELL) };
    const curCell = { x: Math.min(Math.max(Math.floor(e.x / CELL), 0), GRID_COLS-1),
                      y: Math.min(Math.max(Math.floor(e.y / CELL), 0), GRID_ROWS-1) };

    if (!e.path || !e.path.length || !e.goalCell || e.goalCell.x !== goalCell.x || e.goalCell.y !== goalCell.y) {
      e.path = findPath(curCell, goalCell);
      e.goalCell = goalCell;
    }

    if (e.path && e.path.length && isWallAt(e.path[0].x, e.path[0].y)) {
      e.path = findPath(curCell, goalCell);
    }

    let destX = e.target.x, destY = e.target.y;
    if (e.path && e.path.length) {
      const step = e.path[0];
      destX = (step.x + 0.5) * CELL;
      destY = (step.y + 0.5) * CELL;
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
    const gx = Math.floor(e.x / CELL);
    const gy = Math.floor(e.y / CELL);
    if (isWallAt(gx, gy)) {
      e.x = prevX; e.y = prevY;
      e.path = findPath(curCell, goalCell);
    }

    const dtgt = Math.hypot(e.target.x - e.x, e.target.y - e.y);
    if (dtgt < e.r + e.target.r) { e.target.alive = false; sfx(160, 0.15, 0.06, 'sawtooth'); return false; }

    return true;
  });

  // Tower behavior
    for (const t of towers) {
      t.cooldown -= dt;
      const rangePx = t.range * CELL;
      let target = null;
      let closest = rangePx;
      for (const e of enemies) {
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= closest) { target = e; closest = d; }
      }
      t.target = target;
      if (t.cooldown <= 0 && target) {
        bullets.push({ x: t.x, y: t.y, target, speed: CANNON_BASE.bulletSpeed * CELL, damage: cannonDamage() });
        t.cooldown = 1 / t.fireRate;
        sfx(880, 0.07, 0.03, 'square');
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

  if (waveActive && enemies.length === 0 && enemiesSpawnedInWave >= ENEMIES_PER_WAVE) {
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
    ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID_ROWS * CELL); ctx.stroke();
  }
  for (let i = 0; i <= GRID_ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL); ctx.lineTo(GRID_COLS * CELL, i * CELL); ctx.stroke();
  }
    for (const wObj of walls) {
      if (imgReady(ASSETS.wall)) {
        ctx.drawImage(ASSETS.wall, wObj.x * CELL, wObj.y * CELL, CELL, CELL);
      } else {
        ctx.fillStyle = 'rgba(120,120,120,0.5)';
        ctx.fillRect(wObj.x * CELL, wObj.y * CELL, CELL, CELL);
      }
    }
}
function updateStatsUI() {
  if (!statWave) return;
  if (!waveActive && preWaveTimer > 0) {
    statWave.textContent = `Next wave in: ${preWaveTimer.toFixed(1)}s`;
    statTime.textContent = '';
    statEnemies.textContent = '';
    statLives.textContent = `Lives: ${catLives.filter(l => l.alive).length}`;
    statMoney.textContent = `Money: $${money}`;
  } else {
    statWave.textContent = `Wave: ${waveIndex + 1}`;
    statTime.textContent = `Time: ${Math.max(0, WAVE_TIME - waveElapsed).toFixed(1)}s`;
    statEnemies.textContent = `Enemies: ${enemies.length}`;
    statLives.textContent = `Lives: ${catLives.filter(l => l.alive).length}`;
    statMoney.textContent = `Money: $${money}`;
  }
}
function render() {
  drawBG();

    // Towers
    for (const t of towers) {
      if (imgReady(ASSETS.cannon)) {
        const angle = t.target ? Math.atan2(t.target.y - t.y, t.target.x - t.x) : 0;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle);
        ctx.drawImage(ASSETS.cannon, -CELL / 2, -CELL / 2, CELL, CELL);
        ctx.restore();
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(t.gx * CELL, t.gy * CELL, CELL, CELL);
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

  // Bullets
  for (const b of bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#ff0';
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
  }

    updateStatsUI();
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
  const gx = Math.floor((e.clientX - r.left) / CELL);
  const gy = Math.floor((e.clientY - r.top) / CELL);
  if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS) return;

  if (!selectedBuild) {
    const t = towers.find(t => t.gx === gx && t.gy === gy);
    selectedTower = t || null;
    updateUpgradeTab();
    if (t) switchTab('upgrade');
    return;
  }

  if (selectedBuild === 'wall') {
    if (!walls.some(w => w.x === gx && w.y === gy) && !towers.some(t => t.gx === gx && t.gy === gy)) {
      walls.push({ x: gx, y: gy });
    }
  } else if (selectedBuild === 'cannon') {
    if (!isWallAt(gx, gy) && !towers.some(t => t.gx === gx && t.gy === gy)) {
        towers.push({
          gx,
          gy,
          x: (gx + 0.5) * CELL,
          y: (gy + 0.5) * CELL,
          cooldown: 0,
          damage: CANNON_BASE.damage,
          fireRate: CANNON_BASE.fireRate,
          range: CANNON_BASE.range,
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
  container && (container.style.display = 'block');
  menu && (menu.style.display = '');
  selectedTower = null;
  updateUpgradeTab();
  switchTab('build');

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
