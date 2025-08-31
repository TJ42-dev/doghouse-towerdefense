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
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + dur);
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
  optMute.checked = !!o.mute;
  optFullscreen.checked = !!o.fullscreen;
}
optionsBtn?.addEventListener('click', () => { syncUI(); dlg?.showModal?.(); });
saveBtn?.addEventListener('click', () => { saveOpts({ mute: optMute.checked, fullscreen: optFullscreen.checked }); });

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
  // center in CSS pixels (matches our transform)
  const w = gameCanvas?.clientWidth || window.innerWidth;
  const h = gameCanvas?.clientHeight || window.innerHeight;
  return { x: w / 2, y: h / 2 };
}

// -------------------- Tiny Dodge Game --------------------
// Player follows mouse. Enemies spawn at edges and home in. Survive TIME_LIMIT to win.
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
  // pick edge
  const edge = Math.floor(Math.random() * 4); // 0 top, 1 right, 2 bottom, 3 left
  let x=0, y=0;
  if (edge === 0) { x = Math.random()*w; y = -20; }
  else if (edge === 1) { x = w + 20; y = Math.random()*h; }
  else if (edge === 2) { x = Math.random()*w; y = h + 20; }
  else { x = -20; y = Math.random()*h; }
  const r = 12 + Math.random()*10;
  // speed scales with time survived
  const base = 70, scale = 1 + (elapsed / TIME_LIMIT) * 1.6; // gets harder
  const speed = base * (0.9 + Math.random()*0.4) * scale; // px/sec
  enemies.push({ x, y, r, speed, hue: Math.floor(0 + Math.random()*12)*30 });
}

function update(dt) {
  // Player target is mouse; if not moved yet, keep current
  if (mouse.active) {
    // smooth follow
    player.x += (mouse.x - player.x) * Math.min(1, dt*8);
    player.y += (mouse.y - player.y) * Math.min(1, dt*8);
  }

  // Spawn logic: faster spawns over time
  spawnTimer -= dt;
  const minCadence = 0.25; // min seconds between spawns
  const cadence = Math.max(minCadence, 1.0 - elapsed * 0.02); // curve
  while (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer += cadence;
  }

  // Move enemies toward player
  for (const e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const vx = (dx / d) * e.speed * dt;
    const vy = (dy / d) * e.speed * dt;
    e.x += vx; e.y += vy;
  }

  // Collisions
  const pr = player.r;
  for (const e of enemies) {
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (d < pr + e.r) {
      // hit -> lose
      endGame(false);
      sfx(160, 0.15, 0.06, 'sawtooth');
      return;
    }
  }

  // Win condition
  if (elapsed >= TIME_LIMIT) {
    endGame(true);
    sfx(880, 0.2, 0.05, 'triangle');
    sfx(1320, 0.2, 0.04, 'triangle');
  }
}

function drawBG() {
  const w = gameCanvas.clientWidth, h = gameCanvas.clientHeight;
  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0f1222');
  g.addColorStop(1, '#1d2450');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawHUD() {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`Time: ${Math.max(0, TIME_LIMIT - elapsed).toFixed(1)}s`, 12, 12);
  ctx.fillText(`Enemies: ${enemies.length}`, 12, 32);
}

function render() {
  drawBG();

  // Enemies
  for (const e of enemies) {
    ctx.beginPath();
    ctx.fillStyle = `hsl(${e.hue}deg 80% 55%)`;
    ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
    ctx.fill();
  }

  // Player
  ctx.beginPath();
  ctx.fillStyle = '#5bd9ff';
  ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
  ctx.fill();

  // Crosshair on mouse
  if (mouse.active) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1;
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
  // mouse move only during game; removed on end
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
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  mouse.active = true;
}
function onKey(e) {
  if (e.key === 'Escape') endGame(false);
}

function startGame() {
  // UI
  container && (container.style.display = 'none');
  menu && (menu.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'inline-block');

  // Canvas
  ensureCanvas();
  gameCanvas.style.display = 'block';
  resizeCanvas();

  // Fullscreen (optional)
  const opts = loadOpts();
  if (opts.fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  // Reset state & go
  resetGame();
  bindInputs();
  running = true; loopStart = 0; lastT = 0; elapsed = 0;
  sfx(520, 0.07, 0.04, 'square');
  rafId = requestAnimationFrame(loop);
}

function endGame(won) {
  if (!ctx) return; // if never started, ignore
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  unbindInputs();

  // UI restore
  gameCanvas && (gameCanvas.style.display = 'none');
  quitGameBtn && (quitGameBtn.style.display = 'none');
  container && (container.style.display = 'block');
  menu && (menu.style.display = '');

  // Summary
  const msg = won
    ? `Victory! You survived ${TIME_LIMIT}s.`
    : `Game Over at ${elapsed.toFixed(1)}s.`;
  alert(msg);
}

// -------------------- Hooks --------------------
startBtn?.addEventListener('click', startGame);
quitGameBtn?.addEventListener('click', () => endGame(false));
quitBtn?.addEventListener('click', () => alert('Thanks for stopping by! You can close this tab any time.'));
