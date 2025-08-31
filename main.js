// -------------------- Options & DOM --------------------
const LS_KEY = 'godot_web_options';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');         // main page "Quit"
const quitGameBtn = document.getElementById('quitGameBtn'); // in-game "Quit"
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const saveBtn = document.getElementById('saveOptions');
const menu = document.querySelector('.menu');
const container = document.querySelector('.container');

let gameCanvas = document.getElementById('gameCanvas'); // can be null initially
let ctx = null;

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

// -------------------- Canvas setup --------------------
function ensureCanvas() {
  if (!gameCanvas) {
    gameCanvas = document.createElement('canvas');
    gameCanvas.id = 'gameCanvas';
    document.body.appendChild(gameCanvas);
  }
  if (!ctx) ctx = gameCanvas.getContext('2d', { alpha: false });
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
}
function cssCenter() {
  const w = gameCanvas?.clientWidth || window.innerWidth;
  const h = gameCanvas?.clientHeight || window.innerHeight;
  return { x: w / 2, y: h / 2 };
}

// -------------------- Asset loader (FIX) --------------------
const SPRITES = {
  dogs: [
    'assets/animals/dogs/beagle.png',
    'assets/animals/dogs/labrador.png',
    'assets/animals/dogs/bulldog.png'
  ],
  cat: 'assets/animals/cat.png'
};

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

let ASSETS = { dogs: [], cat: null };
let assetsReady; // Promise

async function ensureAssets() {
  if (!assetsReady) {
    assetsReady = (async () => {
      const results = await Promise.all([
        ...SPRITES.dogs.map(loadImage),
        loadImage(SPRITES.cat)
      ]);
      const cat = results.at(-1);
      const dogs = results.slice(0, SPRITES.dogs.length).filter(Boolean);
      ASSETS = { dogs, cat };
    })();
  }
  return assetsReady;
}

function imgReady(img) {
  // drawImage can throw if image failed decode; check both flags
  return !!img && img.complete && img.naturalWidth > 0;
}

// -------------------- Tiny Dodge Game --------------------
const TIME_LIMIT = 30; // seconds
let rafId = null;
let loopStart = 0;
let lastT = 0;
let elapsed = 0;
let running = false;

const player = { x: 0, y: 0, r: 14 };
let mouse = { x: 0, y: 0, active: false };
let enemies = [];
let spawnTimer = 0; // secs until next spawn

function resetGame() {
  enemies = [];
  elapsed = 0;
  spawnTimer = 0.5;
  const c = cssCenter();
  player.x = c.x; player.y = c.y;
  mouse = { x: c.x, y: c.y, active: false };
}

function spawnEnemy() {
  const w = gameCanvas.clientWidth, h = gameCanvas.clientHeight;
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  let x=0, y=0;
  if (edge === 0) { x = Math.random()*w; y = -20; }
  else if (edge === 1) { x = w + 20; y = Math.random()*h; }
  else if (edge === 2) { x = Math.random()*w; y = h + 20; }
  else { x = -20; y = Math.random()*h; }
  const r = 12 + Math.random()*10;
  const base = 70, scale = 1 + (elapsed / TIME_LIMIT) * 1.6;
  const speed = base * (0.9 + Math.random()*0.4) * scale; // px/sec

  // Choose only from loaded/valid images
  const pool = ASSETS.dogs.filter(imgReady);
  const img = pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;

  enemies.push({ x, y, r, speed, img });
}

function update(dt) {
  if (mouse.active) {
    player.x += (mouse.x - player.x) * Math.min(1, dt*8);
    player.y += (mouse.y - player.y) * Math.min(1, dt*8);
  }

  spawnTimer -= dt;
  const minCadence = 0.25;
  const cadence = Math.max(minCadence, 1.0 - elapsed * 0.02);
  while (spawnTimer <= 0) { spawnEnemy(); spawnTimer += cadence; }

  for (const e of enemies) {
    const dx = player.x - e.x; const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
  }

  for (const e of enemies) {
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (d < player.r + e.r) { endGame(false); sfx(160, 0.15, 0.06, 'sawtooth'); return; }
  }

  if (elapsed >= TIME_LIMIT) {
    endGame(true);
    sfx(880, 0.2, 0.05, 'triangle'); sfx(1320, 0.2, 0.04, 'triangle');
  }
}

function drawBG() {
  const w = gameCanvas.clientWidth, h = gameCanvas.clientHeight;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0f1222'); g.addColorStop(1, '#1d2450');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function drawHUD() {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`Time: ${Math.max(0, TIME_LIMIT - elapsed).toFixed(1)}s`, 12, 12);
  ctx.fillText(`Enemies: ${enemies.length}`, 12, 32);
}
function render() {
  drawBG();

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

  // Player (safe draw)
  if (imgReady(ASSETS.cat)) {
    ctx.drawImage(ASSETS.cat, player.x - player.r, player.y - player.r, player.r*2, player.r*2);
  } else {
    ctx.beginPath();
    ctx.fillStyle = '#5bd9ff';
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();
  }

  if (mouse.active) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mouse.x-8, mouse.y); ctx.lineTo(mouse.x+8, mouse.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y-8); ctx.lineTo(mouse.x, mouse.y+8); ctx.stroke();
  }

  drawHUD();
}

function loop(ts) {
  if (!running) return;
  if (!loopStart) loopStart = ts;
  if (!lastT) lastT = ts;
  const dt = Math.min(0.033, (ts - lastT) / 1000); // clamp for tab-jumps
  lastT = ts;
  elapsed = (ts - loopStart) / 1000;
  update(dt);
  render();
  rafId = requestAnimationFrame(loop);
}

// -------------------- Lifecycle --------------------
function bindInputs() {
  gameCanvas.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKey);
}
function unbindInputs() {
  gameCanvas.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', resizeCanvas);
  window.removeEventListener('keydown', onKey);
}
function onMouseMove(e) {
  const r = gameCanvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
}
function onKey(e) { if (e.key === 'Escape') endGame(false); }

async function startGame() {
  // UI
  container && (container.style.display = 'none');
  menu && (menu.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'inline-block');

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
  running = true; loopStart = 0; lastT = 0; elapsed = 0;
  sfx(520, 0.07, 0.04, 'square');
  rafId = requestAnimationFrame(loop);
}

function endGame(won) {
  if (!ctx) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  unbindInputs();

  // UI restore
  gameCanvas && (gameCanvas.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'none');
  container && (container.style.display = 'block');
  menu && (menu.style.display = '');

  const msg = won ? `Victory! You survived ${TIME_LIMIT}s.` : `Game Over at ${elapsed.toFixed(1)}s.`;
  alert(msg);
}

// -------------------- Hooks --------------------
startBtn?.addEventListener('click', () => { startGame(); });
quitGameBtn?.addEventListener('click', () => endGame(false));
quitBtn?.addEventListener('click', () => alert('Thanks for stopping by! You can close this tab any time.'));
