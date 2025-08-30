// simple localStorage-backed options
const LS_KEY = 'godot_web_options';
const startBtn = document.getElementById('startBtn');
const optionsBtn = document.getElementById('optionsBtn');
const quitBtn = document.getElementById('quitBtn');
const dlg = document.getElementById('optionsDialog');
const optMute = document.getElementById('optMute');
const optFullscreen = document.getElementById('optFullscreen');
const saveBtn = document.getElementById('saveOptions');

// canvas setup
const container = document.querySelector('.container');
const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 400;
canvas.style.display = 'none';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let targetX = canvas.width / 2;
let targetY = canvas.height / 2;
let posX = targetX;
let posY = targetY;
const radius = 20;
let animId;
let timerId;
let caught = false;

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  targetX = e.clientX - rect.left;
  targetY = e.clientY - rect.top;
});

function draw() {
  posX += (targetX - posX) * 0.1;
  posY += (targetY - posY) * 0.1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(posX, posY, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'blue';
  ctx.fill();
  if (Math.hypot(targetX - posX, targetY - posY) < radius) {
    caught = true;
  }
  animId = requestAnimationFrame(draw);
}

function startGame() {
  container.style.display = 'none';
  canvas.style.display = 'block';
  targetX = posX = canvas.width / 2;
  targetY = posY = canvas.height / 2;
  caught = false;
  animId = requestAnimationFrame(draw);
  timerId = setTimeout(endGame, 10000);
}

function endGame() {
  cancelAnimationFrame(animId);
  clearTimeout(timerId);
  canvas.style.display = 'none';
  container.style.display = 'block';
  alert(caught ? 'You were caught!' : 'You escaped!');
}

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

startBtn.addEventListener('click', () => {
  startGame();
});

quitBtn.addEventListener('click', () => {
  // Web pages can't truly "quit". Give a graceful UX.
  alert('Thanks for stopping by! You can close this tab any time.');
});
