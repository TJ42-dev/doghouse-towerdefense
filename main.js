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
let gameCanvas = document.getElementById('gameCanvas'); // may be null if not in DOM

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

// ---------------- Game bootstrap (merged + optimized) ----------------
let rafId = null;
let onEndHandler = null;
let player = null;
let startTime = 0;

function ensureCanvas() {
  if (!gameCanvas) {
    gameCanvas = document.createElement('canvas');
    gameCanvas.id = 'gameCanvas';
    document.body.appendChild(gameCanvas);
  }
  gameCanvas.style.display = 'block';
  return gameCanvas;
}

function resizeCanvas(ctx) {
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

function endGame() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  window.removeEventListener('resize', _onResize);
  if (onEndHandler) window.removeEventListener('gameEnded', onEndHandler), onEndHandler = null;

  if (gameCanvas) gameCanvas.style.display = 'none';
  if (menu) menu.style.display = ''; // show menu again
}

function _onResize() {
  const ctx = gameCanvas.getContext('2d');
  resizeCanvas(ctx);
}

function startGame() {
  // Hide the menu UI
  if (menu) menu.style.display = 'none';

  // Prepare canvas and context
  const canvas = ensureCanvas();
  const ctx = canvas.getContext('2d', { alpha: false });

  // Apply fullscreen if requested
  const opts = loadOpts();
  if (opts.fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {/* ignore */});
  }

  // Init game state
  player = { x: canvas.width / 2, y: canvas.height / 2, radius: 20 };
  startTime = performance.now();

  // Size & events
  resizeCanvas(ctx);
  window.addEventListener('resize', _onResize);

  // Allow other code to end the game by dispatching: window.dispatchEvent(new Event('gameEnded'))
  onEndHandler = () => endGame();
  window.addEventListener('gameEnded', onEndHandler);

  // Main loop (single RAF)
  function loop(t) {
    // simple demo scene
    const elapsed = (t - startTime) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();

    // HUD
    ctx.fillStyle = 'black';
    ctx.fillText(`Time: ${elapsed.toFixed(1)}s`, 12, 12);

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startGame);

// ---------------- Misc ----------------
quitBtn.addEventListener('click', () => {
  alert('Thanks for stopping by! You can close this tab any time.');
});
