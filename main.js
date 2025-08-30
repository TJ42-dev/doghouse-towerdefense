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

startBtn.addEventListener('click', () => {
  // pass options via query string; Godot page can read window.location.search if desired
  const o = loadOpts();
  const qs = new URLSearchParams({
    mute: o.mute ? '1' : '0',
    fs: o.fullscreen ? '1' : '0'
  }).toString();
  window.location.href = `/game/index.html?${qs}`;
});

quitBtn.addEventListener('click', () => {
  // Web pages can't truly "quit". Give a graceful UX.
  alert('Thanks for stopping by! You can close this tab any time.');
});
