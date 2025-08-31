// simple localStorage-backed options
const LS_KEY = 'godot_web_options';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const saveBtn = document.getElementById('saveOptions');
const menu = document.querySelector('.menu');
const container = document.querySelector('.container');

let gameCanvas = document.getElementById('gameCanvas'); // may be null if not in DOM yet
let ctx = null;

// --- Game state ---
let targetX = 0, targetY = 0;
let posX = 0, posY = 0;
const radius = 20;
let animId = null;
let timerId = null;
let caught = false;
let mouseBound = false;

// ---------- Options ----------
function loadOpts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? { mute:false, fullscreen:false }; }
  catch { return { mute:false, fullscreen:false }; }
}
function saveOpts(o) {
  localStorage.setItem(LS_KEY, JSON.stringify(o));
}
function syncUI() {
  const o = loadOpts();
  optMute.checked = !!o.mute;
  optFullscreen.checked = !!o.fullscreen;
}

optionsBtn.addEventListener('click', () => {
  syncUI();
  if (dlg?.showModal) dlg.showModal();
});

saveBtn.addEventListener('click', () => {
  saveOpts({ mute: optMute.checked, fullscreen: optFullscreen.checked });
});

// ---------- Canvas / sizing ----------
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
  if (!gameCanvas) return;
  const ratio = window.devicePixelRatio || 1;
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  gameCanvas.style.width = w + 'px';
  gameCanvas.style.height = h + 'px';
  gameCanvas.width = Math.floor(w * ratio);
  gameCanvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // draw in CSS pixels
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textBaseline = 'top';
}

// ---------- Input ----------
function bindMouseOnce() {
  if (mouseBound || !gameCanvas) return;
  gameCanvas.addEventListener('mousemove', (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
  });
  mouseBound = true;
}

// ---------- Game loop ----------
function draw() {
  // spring toward target
  posX += (targetX - posX) * 0.1;
  posY += (targetY - posY) * 0.1;

  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  // player circle
  ctx.beginPath();
  ctx.arc(posX, posY, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'blue';
  ctx.fill();

  // win/lose condition
  if (Math.hypot(targetX - posX, targetY - posY) < radius) {
    caught = true;
  }

  animId = requestAnimationFrame(draw);
}

// ---------- Flow ----------
function startGame() {
  // Hide UI, show canvas
  if (container) container.style.display = 'none';
  if (menu) menu.style.display = 'none';

  ensureCanvas();
  gameCanvas.style.display = 'block';
  resizeCanvas();
  bindMouseOnce();
  window.addEventListener('resize', resizeCanvas);

  // Fullscreen if requested
  const opts = loadOpts();
  if (opts.fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {/* ignore */});
  }

  // Reset state
  targetX = posX = gameCanvas.width / (window.devicePixelRatio || 1) / 2;
  targetY = posY = gameCanvas.height / (window.devicePixelRatio || 1) / 2;
  caught = false;

  // Start loop & timer
  animId = requestAnimationFrame(draw);
  timerId = setTimeout(endGame, 10_000);
}

function endGame() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  if (timerId) clearTimeout(timerId);
  timerId = null;
  window.removeEventListener('resize', resizeCanvas);

  if (gameCanvas) gameCanvas.style.display = 'none';
  if (container) container.style.display = 'block';
  if (menu) menu.style.display = '';

  alert(caught ? 'You were caught!' : 'You escaped!');
}

// ---------- Hooks ----------
startBtn.addEventListener('click', startGame);

quitBtn.addEventListener('click', () => {
  alert('Thanks for stopping by! You can close this tab any time.');
});
