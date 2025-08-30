// simple localStorage-backed options
const LS_KEY = 'godot_web_options';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const saveBtn = document.getElementById('saveOptions');

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
  dlg.showModal();
});

saveBtn.addEventListener('click', () => {
  saveOpts({ mute: optMute.checked, fullscreen: optFullscreen.checked });
});

startBtn.addEventListener('click', startGame);

let player;
let startTime;

function startGame() {
  // Old redirect logic removed; game now runs on this page.
  // const o = loadOpts();
  // const qs = new URLSearchParams({
  //   mute: o.mute ? '1' : '0',
  //   fs: o.fullscreen ? '1' : '0'
  // }).toString();
  // window.location.href = `/game/index.html?${qs}`;

  // Hide the main menu container.
  const menu = document.querySelector('main.container');
  if (menu) menu.style.display = 'none';

  // Create and display a canvas for gameplay.
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Initialize game state.
  player = { x: canvas.width / 2, y: canvas.height / 2, radius: 20 };
  startTime = Date.now();

  function loop() {
    const elapsed = (Date.now() - startTime) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillText(`Time: ${elapsed.toFixed(1)}`, 10, 20);
    requestAnimationFrame(loop);
  }

  loop();
}

quitBtn.addEventListener('click', () => {
  // Web pages can't truly "quit". Give a graceful UX.
  alert('Thanks for stopping by! You can close this tab any time.');
});
