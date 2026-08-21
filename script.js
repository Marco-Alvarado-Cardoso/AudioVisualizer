/* ============================================================
   WaterWaveMusic — JavaScript
   Web Audio API + Canvas visualizer
   ============================================================ */

'use strict';

// ── DOM refs ──────────────────────────────────────────────────
const audio         = document.getElementById('audio');
const canvas        = document.getElementById('visualizer');
const ctx           = canvas.getContext('2d');
const discCanvas    = document.getElementById('disc-canvas');
const discCtx       = discCanvas.getContext('2d');
const fileInput     = document.getElementById('fileInput');

const btnPlay       = document.getElementById('btn-play');
const btnPrev       = document.getElementById('btn-prev');
const btnNext       = document.getElementById('btn-next');
const btnShuffle    = document.getElementById('btn-shuffle');
const btnRepeat     = document.getElementById('btn-repeat');
const btnPlaylist   = document.getElementById('btn-playlist');
const btnClosePl    = document.getElementById('btn-close-pl');

const progTrack     = document.getElementById('prog-track');
const progFill      = document.getElementById('prog-fill');
const progThumb     = document.getElementById('prog-thumb');
const timeCur       = document.getElementById('time-cur');
const timeTot       = document.getElementById('time-tot');

const volTrack      = document.getElementById('vol-track');
const volFill       = document.getElementById('vol-fill');
const volThumb      = document.getElementById('vol-thumb');

const songTitle     = document.getElementById('song-title');
const songArtist    = document.getElementById('song-artist');
const songAlbum     = document.getElementById('song-album');
const songNum       = document.getElementById('song-num');
const artIcon       = document.getElementById('art-icon');
const albumArtEl    = document.getElementById('album-art');
const playlistEl    = document.getElementById('playlist');
const playlistPanel = document.getElementById('playlist-panel');
const tbClock       = document.getElementById('tb-clock');
const vizBtns       = document.querySelectorAll('.viz-btn');

// ── Theme panel refs ──────────────────────────────────────────
const themePanel      = document.getElementById('theme-panel');
const themeBackdrop   = document.getElementById('theme-backdrop');
const btnTheme        = document.getElementById('btn-theme');
const btnCloseTheme   = document.getElementById('btn-close-theme');
const themePresetsEl  = document.getElementById('theme-presets');
const pickAccent      = document.getElementById('pick-accent');
const pickAccent2     = document.getElementById('pick-accent2');
const pickBg          = document.getElementById('pick-bg');
const btnApplyCustom  = document.getElementById('btn-apply-custom');

// ── Random viz refs ───────────────────────────────────────────
const randomControls  = document.getElementById('random-controls');
const btnNewViz       = document.getElementById('btn-new-viz');
const btnSaveViz      = document.getElementById('btn-save-viz');
const btnOpenSaved    = document.getElementById('btn-open-saved');
const savedPanel      = document.getElementById('saved-panel');
const savedBackdrop   = document.getElementById('saved-backdrop');
const btnCloseSaved   = document.getElementById('btn-close-saved');
const savedListEl     = document.getElementById('saved-list');

// ── State ─────────────────────────────────────────────────────
let playlist        = [];      // { file, url, name }
let currentIdx      = -1;
let isPlaying       = false;
let shuffleOn       = false;
let repeatMode      = 0;       // 0=off 1=one 2=all
let vizMode         = 0;       // 0=bars 1=particles 2=wave 3=random
let volume          = 0.8;
let isDraggingProg  = false;
let isDraggingVol   = false;

// ── Color Theme System ────────────────────────────────────────
const PRESETS = [
  { name: 'Cian',   accent: '#00dcff', accent2: '#7b5fff', bg: '#03040f' },
  { name: 'Neon',   accent: '#00ff88', accent2: '#00aaff', bg: '#030f08' },
  { name: 'Sunset', accent: '#ff6b35', accent2: '#ff0080', bg: '#0f0305' },
  { name: 'Gold',   accent: '#ffd700', accent2: '#ff6b00', bg: '#0a0800' },
  { name: 'Rosa',   accent: '#ff6b9d', accent2: '#c44dff', bg: '#0f030a' },
  { name: 'Matrix', accent: '#00ff41', accent2: '#00cc88', bg: '#000a00' },
];

let themeAccentH  = 186;
let themeAccent2H = 258;
let themeBgRgba   = 'rgba(3,4,15,0.25)';
let activePresetIdx = 0;

function hexToHue(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g-b)/d + (g<b?6:0))/6;
  else if (max === g) h = ((b-r)/d + 2)/6;
  else h = ((r-g)/d + 4)/6;
  return Math.round(h * 360);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyTheme(accent, accent2, bg, save = true) {
  const root = document.documentElement;
  root.style.setProperty('--accent',  accent);
  root.style.setProperty('--accent2', accent2);
  root.style.setProperty('--bg',      bg);
  root.style.setProperty('--border',  hexToRgba(accent, 0.22));
  root.style.setProperty('--glow',    `0 0 12px ${hexToRgba(accent, 0.55)}`);

  const br = parseInt(bg.slice(1,3),16);
  const bg_ = parseInt(bg.slice(3,5),16);
  const bb = parseInt(bg.slice(5,7),16);
  root.style.setProperty('--app-bg',    `rgba(${br},${bg_},${bb},0.72)`);
  root.style.setProperty('--overlay-bg',`rgba(${br},${bg_},${bb},0.92)`);

  themeBgRgba   = `rgba(${br},${bg_},${bb},0.25)`;
  themeAccentH  = hexToHue(accent);
  themeAccent2H = hexToHue(accent2);

  pickAccent.value  = accent;
  pickAccent2.value = accent2;
  pickBg.value      = bg;

  if (save) {
    try { localStorage.setItem('wwm-theme', JSON.stringify({ accent, accent2, bg })); } catch(_) {}
  }
}

function renderPresets() {
  themePresetsEl.innerHTML = '';
  PRESETS.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (i === activePresetIdx ? ' active' : '');
    btn.innerHTML = `
      <div class="preset-swatches">
        <div class="preset-dot" style="background:${p.accent}"></div>
        <div class="preset-dot" style="background:${p.accent2}"></div>
        <div class="preset-dot" style="background:${p.bg}"></div>
      </div>
      <span class="preset-label">${p.name}</span>
    `;
    btn.addEventListener('click', () => {
      activePresetIdx = i;
      applyTheme(p.accent, p.accent2, p.bg);
      document.querySelectorAll('.preset-btn').forEach((b,j) =>
        b.classList.toggle('active', j === i));
    });
    themePresetsEl.appendChild(btn);
  });
}

(function initTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('wwm-theme') || 'null');
    if (saved) {
      const idx = PRESETS.findIndex(p =>
        p.accent === saved.accent && p.accent2 === saved.accent2 && p.bg === saved.bg);
      activePresetIdx = idx >= 0 ? idx : -1;
      applyTheme(saved.accent, saved.accent2, saved.bg, false);
    }
  } catch(_) {}
  renderPresets();
})();

function openTheme() {
  themePanel.classList.remove('hidden');
  themeBackdrop.classList.remove('hidden');
}
function closeTheme() {
  themePanel.classList.add('hidden');
  themeBackdrop.classList.add('hidden');
}
btnTheme.addEventListener('click', openTheme);
btnCloseTheme.addEventListener('click', closeTheme);
themeBackdrop.addEventListener('click', closeTheme);

btnApplyCustom.addEventListener('click', () => {
  activePresetIdx = -1;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  applyTheme(pickAccent.value, pickAccent2.value, pickBg.value);
  closeTheme();
});

// ── Car Widget BroadcastChannel ───────────────────────────────
const carCh = new BroadcastChannel('psp-car-widget');
let carFrameTick = 0;

carCh.onmessage = ({ data: msg }) => {
  if (msg.type !== 'control') return;
  switch (msg.action) {
    case 'play': togglePlay(); break;
    case 'prev': prevTrack();  break;
    case 'next': nextTrack();  break;
    case 'ping':
      carCh.postMessage({
        type: 'meta',
        title:  songTitle.textContent,
        artist: songArtist.textContent,
        playing: isPlaying,
      });
      break;
  }
};

// ── Audio graph ───────────────────────────────────────────────
const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
const source    = audioCtx.createMediaElementSource(audio);
const analyser  = audioCtx.createAnalyser();
const gainNode  = audioCtx.createGain();

source.connect(analyser);
analyser.connect(gainNode);
gainNode.connect(audioCtx.destination);

analyser.fftSize              = 512;
analyser.smoothingTimeConstant = 0.75;
gainNode.gain.value           = volume;

const bufLen  = analyser.frequencyBinCount;
const dataArr = new Uint8Array(bufLen);

// ── Resize canvas ─────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Disc canvas ───────────────────────────────────────────────
discCanvas.width  = 108;
discCanvas.height = 108;
let discAngle = 0;

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  tbClock.textContent = `${hh}:${mm}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Format seconds ────────────────────────────────────────────
function fmt(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2,'0');
  return `${m}:${sec}`;
}

// ── File input ────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  if (!files.length) return;

  files.forEach(f => {
    const url  = URL.createObjectURL(f);
    const name = f.name.replace(/\.[^.]+$/, '');
    playlist.push({ file: f, url, name });
  });

  renderPlaylist();
  if (currentIdx === -1) loadTrack(0, true);
});

// ── Playlist render ───────────────────────────────────────────
function renderPlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((track, i) => {
    const li = document.createElement('li');
    li.dataset.idx = i;
    if (i === currentIdx) li.classList.add('active');

    li.innerHTML = `
      <span class="pl-num">${i + 1}</span>
      <span class="pl-name">${track.name}</span>
      ${i === currentIdx ? '<span class="pl-active-icon">▶</span>' : ''}
    `;
    li.addEventListener('click', () => { loadTrack(i, true); playlistPanel.classList.add('hidden'); });
    playlistEl.appendChild(li);
  });

  songNum.textContent = playlist.length ? `${currentIdx + 1} / ${playlist.length}` : '';
}

// ── Load track ────────────────────────────────────────────────
function loadTrack(idx, autoplay = false) {
  if (!playlist.length) return;
  if (idx < 0) idx = playlist.length - 1;
  if (idx >= playlist.length) idx = 0;

  currentIdx = idx;
  const track = playlist[idx];

  audio.src = track.url;
  audio.load();

  songTitle.textContent  = track.name;
  songArtist.textContent = '—';
  songAlbum.textContent  = '—';
  artIcon.style.display  = 'block';

  const oldImg = albumArtEl.querySelector('img');
  if (oldImg) oldImg.remove();

  if (window.jsmediatags) {
    window.jsmediatags.read(track.file, {
      onSuccess(tag) {
        const t = tag.tags;
        if (t.title)  songTitle.textContent  = t.title;
        if (t.artist) songArtist.textContent = t.artist;
        if (t.album)  songAlbum.textContent  = t.album;
        if (t.picture) {
          const { data, format } = t.picture;
          const blob = new Blob([new Uint8Array(data)], { type: format });
          const imgUrl = URL.createObjectURL(blob);
          const img = document.createElement('img');
          img.src = imgUrl;
          albumArtEl.appendChild(img);
          artIcon.style.display = 'none';
        }
        checkMarquee();
      }
    });
  }

  checkMarquee();
  renderPlaylist();

  setTimeout(() => {
    carCh.postMessage({
      type: 'meta',
      title:  songTitle.textContent,
      artist: songArtist.textContent,
      playing: autoplay,
    });
  }, 80);

  if (autoplay) {
    audioCtx.resume().then(() => audio.play());
  }
}

function checkMarquee() {
  const wrap = document.getElementById('song-title-wrap');
  songTitle.classList.toggle('scrolling', songTitle.scrollWidth > wrap.clientWidth);
}

// ── Playback controls ─────────────────────────────────────────
btnPlay.addEventListener('click', togglePlay);
btnPrev.addEventListener('click', prevTrack);
btnNext.addEventListener('click', nextTrack);

function togglePlay() {
  if (!playlist.length) { fileInput.click(); return; }
  if (audio.paused) {
    audioCtx.resume().then(() => audio.play());
  } else {
    audio.pause();
  }
}

function prevTrack() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let idx = currentIdx - 1;
  if (shuffleOn) idx = randomIdx();
  loadTrack(idx, isPlaying);
}

function nextTrack() {
  let idx = currentIdx + 1;
  if (shuffleOn) idx = randomIdx();
  loadTrack(idx, isPlaying);
}

function randomIdx() {
  if (playlist.length <= 1) return 0;
  let r;
  do { r = Math.floor(Math.random() * playlist.length); } while (r === currentIdx);
  return r;
}

audio.addEventListener('play',  () => { isPlaying = true;  btnPlay.textContent = '⏸'; discCanvas.classList.add('spinning');    carCh.postMessage({ type: 'state', playing: true  }); });
audio.addEventListener('pause', () => { isPlaying = false; btnPlay.textContent = '▶'; discCanvas.classList.remove('spinning'); carCh.postMessage({ type: 'state', playing: false }); });

audio.addEventListener('ended', () => {
  if (repeatMode === 1) { audio.currentTime = 0; audio.play(); return; }
  if (shuffleOn)        { loadTrack(randomIdx(), true); return; }
  if (currentIdx < playlist.length - 1) { nextTrack(); }
  else if (repeatMode === 2)             { loadTrack(0, true); }
  else                                   { isPlaying = false; btnPlay.textContent = '▶'; }
});

// ── Shuffle / Repeat ──────────────────────────────────────────
btnShuffle.addEventListener('click', () => {
  shuffleOn = !shuffleOn;
  btnShuffle.classList.toggle('active', shuffleOn);
});

const repeatIcons = ['↻', '🔂', '🔁'];
btnRepeat.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  btnRepeat.textContent = repeatIcons[repeatMode];
  btnRepeat.classList.toggle('active', repeatMode > 0);
});

// ── Progress bar ──────────────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  if (isDraggingProg) return;
  const pct = audio.duration ? audio.currentTime / audio.duration : 0;
  setProgressUI(pct);
  timeCur.textContent = fmt(audio.currentTime);
  timeTot.textContent = fmt(audio.duration);
});

function setProgressUI(pct) {
  const p = Math.max(0, Math.min(1, pct)) * 100;
  progFill.style.width  = p + '%';
  progThumb.style.left  = p + '%';
}

function seekTo(e) {
  const rect = progTrack.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
  setProgressUI(pct);
}

progTrack.addEventListener('mousedown', e => { isDraggingProg = true; seekTo(e); });
document.addEventListener('mousemove',  e => { if (isDraggingProg) seekTo(e); });
document.addEventListener('mouseup',    ()  => { isDraggingProg = false; });

progTrack.addEventListener('touchstart', e => { isDraggingProg = true; seekTo(e.touches[0]); }, { passive: true });
document.addEventListener('touchmove',   e => { if (isDraggingProg) seekTo(e.touches[0]); }, { passive: true });
document.addEventListener('touchend',    ()  => { isDraggingProg = false; });

// ── Volume bar ────────────────────────────────────────────────
function setVolUI(pct) {
  const p = Math.max(0, Math.min(1, pct)) * 100;
  volFill.style.width = p + '%';
  volThumb.style.left = p + '%';
}

function setVol(e) {
  const rect = volTrack.getBoundingClientRect();
  volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  gainNode.gain.value = volume;
  setVolUI(volume);
}

setVolUI(volume);
volTrack.addEventListener('mousedown', e => { isDraggingVol = true; setVol(e); });
document.addEventListener('mousemove', e => { if (isDraggingVol) setVol(e); });
document.addEventListener('mouseup',   ()  => { isDraggingVol = false; });
volTrack.addEventListener('touchstart', e => { isDraggingVol = true; setVol(e.touches[0]); }, { passive: true });
document.addEventListener('touchmove',  e => { if (isDraggingVol) setVol(e.touches[0]); }, { passive: true });
document.addEventListener('touchend',   ()  => { isDraggingVol = false; });

// ── Playlist panel ────────────────────────────────────────────
btnPlaylist.addEventListener('click', () => {
  playlistPanel.classList.toggle('hidden');
});
btnClosePl.addEventListener('click', () => {
  playlistPanel.classList.add('hidden');
});

// ── Viz mode selector ─────────────────────────────────────────
vizBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    vizMode = parseInt(btn.dataset.mode);
    vizBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateRandomVizUI();
  });
});

// ── Keyboard shortcuts ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')       { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight')  { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
  if (e.code === 'ArrowLeft')   { audio.currentTime = Math.max(0, audio.currentTime - 5); }
  if (e.code === 'ArrowUp')     { gainNode.gain.value = volume = Math.min(1, volume + 0.05); setVolUI(volume); }
  if (e.code === 'ArrowDown')   { gainNode.gain.value = volume = Math.max(0, volume - 0.05); setVolUI(volume); }
  if (e.code === 'KeyN')        { nextTrack(); }
  if (e.code === 'KeyP')        { prevTrack(); }
});

// ── Disc animation ────────────────────────────────────────────
function drawDisc() {
  const w = discCanvas.width, h = discCanvas.height;
  const cx = w / 2, cy = h / 2, r = w / 2;

  discCtx.clearRect(0, 0, w, h);
  if (!isPlaying) return;

  discAngle += 0.012;

  discCtx.save();
  discCtx.translate(cx, cy);
  discCtx.rotate(discAngle);

  const ac = pickAccent.value;
  const grad = discCtx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
  grad.addColorStop(0,   hexToRgba(ac, 0.0));
  grad.addColorStop(0.7, hexToRgba(ac, 0.06));
  grad.addColorStop(1,   hexToRgba(ac, 0.25));
  discCtx.beginPath();
  discCtx.arc(0, 0, r, 0, Math.PI * 2);
  discCtx.fillStyle = grad;
  discCtx.fill();

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    discCtx.beginPath();
    discCtx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    discCtx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
    discCtx.strokeStyle = hexToRgba(ac, 0.1 + 0.1 * (i % 3));
    discCtx.lineWidth = 1;
    discCtx.stroke();
  }

  discCtx.restore();

  discCtx.beginPath();
  discCtx.arc(cx, cy, 5, 0, Math.PI * 2);
  discCtx.fillStyle  = ac;
  discCtx.shadowBlur = 10;
  discCtx.shadowColor = ac;
  discCtx.fill();
  discCtx.shadowBlur = 0;
}

// ── Particles setup ───────────────────────────────────────────
const PARTICLE_COUNT = 120;
const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
  x:      Math.random() * window.innerWidth,
  y:      Math.random() * window.innerHeight,
  size:   Math.random() * 3 + 1,
  speedX: (Math.random() - 0.5) * 1.5,
  speedY: (Math.random() - 0.5) * 1.5,
}));

const explosions = Array.from({ length: 10 }, () => ({
  x: 0, y: 0, size: 0, life: 0, active: false
}));

// ── Main draw loop ────────────────────────────────────────────
function draw() {
  requestAnimationFrame(draw);

  const W = canvas.width, H = canvas.height;
  analyser.getByteFrequencyData(dataArr);

  carFrameTick++;
  if (carFrameTick % 2 === 0) {
    carCh.postMessage({ type: 'freq', data: Array.from(dataArr) });
  }

  ctx.fillStyle = themeBgRgba;
  ctx.fillRect(0, 0, W, H);

  if      (vizMode === 0) drawBars(W, H);
  else if (vizMode === 1) drawParticles(W, H);
  else if (vizMode === 2) drawWave(W, H);
  else                    drawRandom(W, H);

  drawDisc();
}

// ── Bars ──────────────────────────────────────────────────────
function drawBars(W, H) {
  const count    = Math.min(bufLen, 128);
  const barW     = (W / count) - 1;
  const boost    = 1.3;
  const centerY  = H;

  for (let i = 0; i < count; i++) {
    const val      = dataArr[i] / 255;
    const barH     = Math.pow(val, 1.5) * H * 0.75 * boost;
    const hue      = themeAccentH + i * (60 / count);
    const alpha    = 0.55 + val * 0.45;

    const x = i * (barW + 1);

    const g = ctx.createLinearGradient(0, centerY, 0, centerY - barH);
    g.addColorStop(0, `hsla(${hue},100%,60%,${alpha})`);
    g.addColorStop(1, `hsla(${hue - 40},100%,80%,${alpha * 0.6})`);

    ctx.fillStyle = g;
    ctx.shadowBlur   = val > 0.7 ? 18 : 0;
    ctx.shadowColor  = `hsla(${hue},100%,70%,0.8)`;
    ctx.fillRect(x, centerY - barH, barW, barH);
  }
  ctx.shadowBlur = 0;
}

// ── Particles ─────────────────────────────────────────────────
function drawParticles(W, H) {
  const BOOST = 2.8;

  for (let i = 0; i < particles.length; i++) {
    const p   = particles[i];
    const val = dataArr[i % bufLen] / 255;

    const targetSize = val * 14 * BOOST;
    p.size += (targetSize - p.size) * 0.5;

    const force = (dataArr[i % bufLen] - 90) / 90 * BOOST * 0.5;
    p.x += p.speedX * (1 + val * BOOST * 0.5) + force;
    p.y += p.speedY * (1 + val * BOOST * 0.5) + force;

    if (p.x > W) p.x = 0;
    if (p.x < 0) p.x = W;
    if (p.y > H) p.y = 0;
    if (p.y < 0) p.y = H;

    const hue = val > 0.8 ? themeAccentH : themeAccent2H + val * 60;
    const color = `hsl(${hue},100%,${60 + val * 30}%)`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.shadowBlur  = val * 30;
    ctx.shadowColor = color;
    ctx.fill();

    if (val > 0.88 && Math.random() < 0.04) {
      const e = explosions[Math.floor(Math.random() * explosions.length)];
      e.x = p.x; e.y = p.y; e.size = 0; e.life = 1; e.active = true;
    }
  }

  for (const e of explosions) {
    if (!e.active) continue;
    e.size += 6;
    e.life -= 0.025;
    if (e.life <= 0) { e.active = false; continue; }

    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fillStyle   = hexToRgba(pickAccent.value, e.life * 0.5);
    ctx.shadowBlur  = 40;
    ctx.shadowColor = pickAccent.value;
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

// ── Wave ──────────────────────────────────────────────────────
function drawWave(W, H) {
  const midY  = H * 0.5;
  const BOOST = 1.4;

  for (const dir of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(0, midY);

    for (let i = 0; i < bufLen; i++) {
      const val = Math.pow(dataArr[i] / 255, 1.6);
      const x   = (i / bufLen) * W;
      const y   = midY + dir * val * (H * 0.42) * BOOST;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }

    const hue = dir > 0 ? themeAccentH : themeAccent2H;
    ctx.strokeStyle = `hsl(${hue},100%,65%)`;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = `hsl(${hue},100%,65%)`;
    ctx.stroke();
  }

  const avg = dataArr.reduce((s, v) => s + v, 0) / bufLen / 255;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(W, midY);
  ctx.strokeStyle = hexToRgba(pickAccent.value, 0.1 + avg * 0.4);
  ctx.lineWidth   = 1;
  ctx.shadowBlur  = avg * 20;
  ctx.stroke();

  ctx.shadowBlur = 0;
}

// ── Car Mode button ───────────────────────────────────────────
document.getElementById('btn-car').addEventListener('click', () => {
  window.open(
    'car-widget.html',
    'WWM_CarDisplay',
    'width=960,height=540,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
  );
});

// ================================================================
//  RANDOM VIZ SYSTEM
// ================================================================

const VIZ_TYPES = ['radial','tunnel','dna','starfield','polygon','orb','lissajous','grid'];
const VIZ_NAMES = {
  radial: 'Radial', tunnel: 'Túnel', dna: 'Hélice ADN',
  starfield: 'Estrellas', polygon: 'Polígono', orb: 'Orbe',
  lissajous: 'Lissajous', grid: 'Cuadrícula'
};

let currentRandomConfig = null;
let randomVizState      = {};
let savedVisualizations = [];

try { savedVisualizations = JSON.parse(localStorage.getItem('wwm-saved-viz') || '[]'); } catch(_) {}

// ── Helpers ───────────────────────────────────────────────────
const rnd    = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function vizColorH(c, t) {
  // t in [0,1]: blend from primaryHue toward secondaryHue
  // if useTheme, use the current theme hues instead
  const h1 = c.useTheme ? themeAccentH  : c.primaryHue;
  const h2 = c.useTheme ? themeAccent2H : c.secondaryHue;
  return h1 + (h2 - h1) * t;
}

// ── Config generator ──────────────────────────────────────────
function generateRandomConfig() {
  const type        = VIZ_TYPES[Math.floor(Math.random() * VIZ_TYPES.length)];
  const primaryHue  = Math.floor(Math.random() * 360);
  const secondaryHue= (primaryHue + 100 + Math.floor(Math.random() * 140)) % 360;
  const useTheme    = Math.random() > 0.35;
  const base        = { type, primaryHue, secondaryHue, useTheme, createdAt: Date.now() };

  switch (type) {
    case 'radial':
      return { ...base,
        count:      rndInt(72, 200),
        innerRatio: rnd(0.07, 0.18),
        maxRatio:   rnd(0.28, 0.44),
        rotSpeed:   (Math.random() - 0.5) * 0.03,
        mirror:     Math.random() > 0.5,
      };
    case 'tunnel':
      return { ...base,
        rings:    rndInt(5, 15),
        rotSpeed: rnd(0.006, 0.028) * (Math.random() > 0.5 ? 1 : -1),
      };
    case 'dna':
      return { ...base,
        freq:      rnd(0.8, 2.8),
        amplitude: rnd(0.10, 0.28),
        speed:     rnd(0.016, 0.055),
        barCount:  rndInt(25, 65),
      };
    case 'starfield':
      return { ...base,
        starCount: rndInt(130, 300),
        speedBase: rnd(1.0, 3.8),
      };
    case 'polygon':
      return { ...base,
        sides:    rndInt(3, 9),
        layers:   rndInt(2, 5),
        rotSpeed: (Math.random() - 0.5) * 0.032,
        scale:    rnd(0.16, 0.38),
      };
    case 'orb':
      return { ...base,
        rayCount:  rndInt(40, 140),
        orbRadius: rnd(0.035, 0.09),
        rotSpeed:  (Math.random() - 0.5) * 0.02,
      };
    case 'lissajous':
      return { ...base,
        freqX:      rndInt(1, 5),
        freqY:      rndInt(1, 5),
        phaseSpeed: rnd(0.004, 0.024),
        trailLength:rndInt(240, 650),
      };
    case 'grid':
      return { ...base,
        cols:  rndInt(10, 24),
        rows:  rndInt(6, 15),
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
        gap:   rnd(0.18, 0.35),
      };
  }
}

// ── State reset ───────────────────────────────────────────────
function resetVizState(config) {
  randomVizState = { angle: 0, time: 0 };
  if (config.type === 'starfield') {
    randomVizState.stars = Array.from({ length: config.starCount }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
    }));
  }
  if (config.type === 'lissajous') {
    randomVizState.trail = [];
    randomVizState.phase = Math.random() * Math.PI * 2;
  }
}

// ── Activate new random viz ───────────────────────────────────
function activateNewRandomViz() {
  currentRandomConfig = generateRandomConfig();
  resetVizState(currentRandomConfig);
}

// ── Dispatcher ────────────────────────────────────────────────
function drawRandom(W, H) {
  if (!currentRandomConfig) { activateNewRandomViz(); return; }
  randomVizState.time += 0.016;
  const c = currentRandomConfig;
  switch (c.type) {
    case 'radial':    drawVizRadial(W, H, c);    break;
    case 'tunnel':    drawVizTunnel(W, H, c);    break;
    case 'dna':       drawVizDNA(W, H, c);       break;
    case 'starfield': drawVizStarfield(W, H, c); break;
    case 'polygon':   drawVizPolygon(W, H, c);   break;
    case 'orb':       drawVizOrb(W, H, c);       break;
    case 'lissajous': drawVizLissajous(W, H, c); break;
    case 'grid':      drawVizGrid(W, H, c);      break;
  }
}

// ── RADIAL: barras en círculo ─────────────────────────────────
function drawVizRadial(W, H, c) {
  const cx = W / 2, cy = H / 2;
  const minDim = Math.min(W, H);
  randomVizState.angle += c.rotSpeed;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(randomVizState.angle);

  const inner = minDim * c.innerRatio;
  const bW    = Math.max(1, (2 * Math.PI * inner / c.count) * 0.65);

  for (let i = 0; i < c.count; i++) {
    const val   = Math.pow(dataArr[Math.floor(i * bufLen / c.count)] / 255, 1.35);
    const angle = (i / c.count) * Math.PI * 2;
    const barH  = val * minDim * c.maxRatio;
    const hue   = vizColorH(c, i / c.count);

    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle   = `hsl(${hue % 360},100%,${50 + val * 38}%)`;
    ctx.shadowBlur  = val > 0.5 ? 14 : 0;
    ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;
    ctx.fillRect(-bW / 2, inner, bW, barH);
    if (c.mirror) ctx.fillRect(-bW / 2, -(inner + barH), bW, barH);
    ctx.restore();
  }

  ctx.restore();
  ctx.shadowBlur = 0;
}

// ── TUNNEL: anillos concéntricos con picos ────────────────────
function drawVizTunnel(W, H, c) {
  const cx = W / 2, cy = H / 2;
  const minDim = Math.min(W, H) * 0.48;
  randomVizState.angle += c.rotSpeed;

  for (let r = 0; r < c.rings; r++) {
    const t    = r / c.rings;
    const val  = dataArr[Math.floor(t * bufLen * 0.7)] / 255;
    const rad  = minDim * (1 - t) * (0.82 + val * 0.28);
    const hue  = vizColorH(c, t);
    const alpha= 0.25 + val * 0.75;
    const spikes = 5 + r * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(randomVizState.angle * (r % 2 === 0 ? 1 : -1));

    ctx.beginPath();
    for (let s = 0; s < spikes; s++) {
      const a0 = (s / spikes) * Math.PI * 2;
      const a1 = ((s + 0.5) / spikes) * Math.PI * 2;
      const sv = dataArr[Math.floor((s / spikes) * bufLen)] / 255;
      const rO = rad;
      const rI = rad * (0.62 - sv * 0.25);
      if (s === 0) ctx.moveTo(Math.cos(a0) * rO, Math.sin(a0) * rO);
      else         ctx.lineTo(Math.cos(a0) * rO, Math.sin(a0) * rO);
      ctx.lineTo(Math.cos(a1) * rI, Math.sin(a1) * rI);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue % 360},100%,65%,${alpha})`;
    ctx.lineWidth   = 1.5 + val;
    ctx.shadowBlur  = val * 22;
    ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

// ── DNA HELIX ─────────────────────────────────────────────────
function drawVizDNA(W, H, c) {
  const midY = H * 0.5;
  const t    = randomVizState.time;

  for (let i = 0; i < c.barCount; i++) {
    const x     = (i / c.barCount) * W;
    const val   = dataArr[Math.floor((i / c.barCount) * bufLen)] / 255;
    const phase = (i / c.barCount) * Math.PI * 2 * c.freq - t * c.speed * 60;
    const amp   = H * c.amplitude * (0.5 + val * 0.6);

    const y1 = midY + Math.sin(phase)           * amp;
    const y2 = midY + Math.sin(phase + Math.PI) * amp;
    const h1 = vizColorH(c, 0);
    const h2 = vizColorH(c, 1);

    // Connecting bar
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = `hsla(${(h1 + h2) / 2 % 360},60%,65%,${0.18 + val * 0.28})`;
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 0;
    ctx.stroke();

    // Dot strand 1
    ctx.beginPath();
    ctx.arc(x, y1, 2 + val * 5.5, 0, Math.PI * 2);
    ctx.fillStyle   = `hsl(${h1 % 360},100%,${55 + val * 35}%)`;
    ctx.shadowBlur  = val * 20;
    ctx.shadowColor = `hsl(${h1 % 360},100%,70%)`;
    ctx.fill();

    // Dot strand 2
    ctx.beginPath();
    ctx.arc(x, y2, 2 + val * 5.5, 0, Math.PI * 2);
    ctx.fillStyle   = `hsl(${h2 % 360},100%,${55 + val * 35}%)`;
    ctx.shadowColor = `hsl(${h2 % 360},100%,70%)`;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── STARFIELD: campo de estrellas ────────────────────────────
function drawVizStarfield(W, H, c) {
  const cx   = W / 2, cy = H / 2;
  const avg  = dataArr.reduce((s, v) => s + v, 0) / bufLen / 255;
  const bass = dataArr[1] / 255;

  for (const star of randomVizState.stars) {
    star.z -= 0.004 + avg * c.speedBase * 0.012;
    if (star.z <= 0) {
      star.x = (Math.random() - 0.5) * 2;
      star.y = (Math.random() - 0.5) * 2;
      star.z = 1;
    }

    const sx    = (star.x / star.z) * W * 0.5 + cx;
    const sy    = (star.y / star.z) * H * 0.5 + cy;
    const size  = (1 - star.z) * 3.5 * (1 + bass * 2.2);
    const alpha = 1 - star.z;
    const hue   = bass > 0.55 ? vizColorH(c, 0) : vizColorH(c, 1);

    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.3, size), 0, Math.PI * 2);
    ctx.fillStyle   = `hsla(${hue % 360},100%,${68 + bass * 28}%,${alpha})`;
    ctx.shadowBlur  = bass > 0.5 ? 12 : 0;
    ctx.shadowColor = `hsl(${hue % 360},100%,80%)`;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// ── POLYGON: polígonos giratorios por capas ───────────────────
function drawVizPolygon(W, H, c) {
  const cx = W / 2, cy = H / 2;
  const minDim = Math.min(W, H) * 0.5;
  randomVizState.angle += c.rotSpeed;

  for (let layer = 0; layer < c.layers; layer++) {
    const t    = layer / (c.layers - 1 || 1);
    const val  = dataArr[Math.floor(t * bufLen * 0.8)] / 255;
    const rad  = minDim * c.scale * (0.5 + t * 1.1) * (0.7 + val * 0.55);
    const hue  = vizColorH(c, t);
    const alpha= 0.35 + val * 0.65;
    const rot  = randomVizState.angle + (layer % 2 === 0 ? 0 : Math.PI / c.sides);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    ctx.beginPath();
    for (let s = 0; s < c.sides; s++) {
      const a  = (s / c.sides) * Math.PI * 2 - Math.PI / 2;
      const sv = dataArr[Math.floor((s / c.sides) * bufLen * 0.5)] / 255;
      const r2 = rad * (0.82 + sv * 0.28);
      s === 0
        ? ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2)
        : ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.closePath();
    ctx.strokeStyle = `hsla(${hue % 360},100%,65%,${alpha})`;
    ctx.lineWidth   = 1.5 + val * 2.5;
    ctx.shadowBlur  = val * 28;
    ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

// ── ORB: orbe central con rayos de frecuencia ─────────────────
function drawVizOrb(W, H, c) {
  const cx = W / 2, cy = H / 2;
  const minDim  = Math.min(W, H);
  const bass    = dataArr[1] / 255;
  const orbR    = minDim * c.orbRadius * (1 + bass * 1.6);
  const orbHue  = vizColorH(c, 0);

  // Glow orb
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 3);
  grad.addColorStop(0,   `hsl(${orbHue % 360},100%,95%)`);
  grad.addColorStop(0.35,`hsl(${orbHue % 360},100%,65%)`);
  grad.addColorStop(1,   `hsla(${orbHue % 360},100%,50%,0)`);
  ctx.beginPath();
  ctx.arc(cx, cy, orbR * 3, 0, Math.PI * 2);
  ctx.fillStyle   = grad;
  ctx.shadowBlur  = 35 + bass * 45;
  ctx.shadowColor = `hsl(${orbHue % 360},100%,70%)`;
  ctx.fill();

  // Rays
  randomVizState.angle += c.rotSpeed;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(randomVizState.angle);

  for (let i = 0; i < c.rayCount; i++) {
    const val   = Math.pow(dataArr[Math.floor(i * bufLen / c.rayCount)] / 255, 1.25);
    const angle = (i / c.rayCount) * Math.PI * 2;
    const len   = val * minDim * 0.43;
    const hue   = vizColorH(c, i / c.rayCount);

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * orbR,         Math.sin(angle) * orbR);
    ctx.lineTo(Math.cos(angle) * (orbR + len), Math.sin(angle) * (orbR + len));
    ctx.strokeStyle = `hsl(${hue % 360},100%,${52 + val * 38}%)`;
    ctx.lineWidth   = Math.max(0.5, val * 2.8);
    ctx.shadowBlur  = val > 0.55 ? 16 : 0;
    ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;
    ctx.stroke();
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

// ── LISSAJOUS: figura XY tipo osciloscopio ────────────────────
function drawVizLissajous(W, H, c) {
  randomVizState.phase += c.phaseSpeed;
  const avg  = dataArr.reduce((s, v) => s + v, 0) / bufLen / 255;
  const cx   = W / 2, cy = H / 2;
  const amp  = Math.min(W, H) * 0.38 * (0.55 + avg * 0.65);

  const x = cx + Math.sin(c.freqX * randomVizState.phase) * amp;
  const y = cy + Math.sin(c.freqY * randomVizState.phase + Math.PI / 4) * amp;

  randomVizState.trail.push({ x, y, v: avg });
  if (randomVizState.trail.length > c.trailLength) randomVizState.trail.shift();

  const trail = randomVizState.trail;
  for (let i = 1; i < trail.length; i++) {
    const p   = trail[i - 1];
    const q   = trail[i];
    const t   = i / trail.length;
    const hue = vizColorH(c, t);

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = `hsla(${hue % 360},100%,${52 + q.v * 38}%,${t * 0.88})`;
    ctx.lineWidth   = 0.8 + q.v * 2.8;
    ctx.shadowBlur  = q.v > 0.6 ? 10 : 0;
    ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// ── GRID: cuadrícula reactiva ─────────────────────────────────
function drawVizGrid(W, H, c) {
  const gW   = W / c.cols;
  const gH   = H / c.rows;

  for (let row = 0; row < c.rows; row++) {
    for (let col = 0; col < c.cols; col++) {
      const idx  = Math.floor((col / c.cols) * bufLen);
      const val  = Math.pow(dataArr[idx] / 255, 1.2);
      const cx   = (col + 0.5) * gW;
      const cy   = (row + 0.5) * gH;
      const size = Math.min(gW, gH) * 0.5 * (c.gap + val * (1 - c.gap));
      const hue  = vizColorH(c, (row % 2) * 0.5) + col * (35 / c.cols);

      ctx.fillStyle   = `hsl(${hue % 360},100%,${44 + val * 46}%)`;
      ctx.shadowBlur  = val > 0.45 ? 14 : 0;
      ctx.shadowColor = `hsl(${hue % 360},100%,70%)`;

      if (c.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
      }
    }
  }
  ctx.shadowBlur = 0;
}

// ================================================================
//  RANDOM VIZ UI
// ================================================================

function updateRandomVizUI() {
  const isRandom = vizMode === 3;
  randomControls.classList.toggle('hidden', !isRandom);
  if (isRandom && !currentRandomConfig) activateNewRandomViz();
}

// "Nueva" — genera una animación completamente nueva
btnNewViz.addEventListener('click', () => {
  activateNewRandomViz();
  btnSaveViz.textContent = '💾 Guardar';
});

// "Guardar" — guarda la config actual en localStorage
btnSaveViz.addEventListener('click', () => {
  if (!currentRandomConfig) return;
  const n = savedVisualizations.length + 1;
  const entry = {
    ...currentRandomConfig,
    name: `${VIZ_NAMES[currentRandomConfig.type]} #${n}`,
    savedAt: Date.now(),
  };
  savedVisualizations.unshift(entry);
  try { localStorage.setItem('wwm-saved-viz', JSON.stringify(savedVisualizations)); } catch(_) {}
  btnSaveViz.textContent = '✓ Guardado';
  setTimeout(() => { btnSaveViz.textContent = '💾 Guardar'; }, 1800);
});

// Panel de guardadas — abrir / cerrar
function openSavedPanel() {
  renderSavedPanel();
  savedPanel.classList.remove('hidden');
  savedBackdrop.classList.remove('hidden');
}
function closeSavedPanel() {
  savedPanel.classList.add('hidden');
  savedBackdrop.classList.add('hidden');
}
btnOpenSaved.addEventListener('click', openSavedPanel);
btnCloseSaved.addEventListener('click', closeSavedPanel);
savedBackdrop.addEventListener('click', closeSavedPanel);

// ── Render saved panel ────────────────────────────────────────
function renderSavedPanel() {
  savedListEl.innerHTML = '';
  if (!savedVisualizations.length) {
    savedListEl.innerHTML = `
      <div class="saved-empty">
        <span class="saved-empty-icon">🎲</span>
        <p>Aún no tienes guardadas.<br>Activa el modo aleatorio, genera algo que te guste y presiona <strong>💾 Guardar</strong>.</p>
      </div>`;
    return;
  }

  savedVisualizations.forEach((viz, i) => {
    const card = document.createElement('div');
    card.className = 'saved-card';
    const date = new Date(viz.savedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    const h1   = viz.useTheme ? themeAccentH  : viz.primaryHue;
    const h2   = viz.useTheme ? themeAccent2H : viz.secondaryHue;

    card.innerHTML = `
      <div class="saved-card-left">
        <div class="saved-swatches">
          <div class="saved-swatch" style="background:hsl(${h1},100%,60%)"></div>
          <div class="saved-swatch" style="background:hsl(${h2},100%,60%)"></div>
        </div>
        <div class="saved-card-text">
          <span class="saved-card-name">${viz.name}</span>
          <span class="saved-card-meta">${VIZ_NAMES[viz.type]} · ${date}</span>
        </div>
      </div>
      <div class="saved-card-actions">
        <button class="saved-use-btn">▶ Usar</button>
        <button class="saved-del-btn" title="Eliminar">✕</button>
      </div>
    `;

    card.querySelector('.saved-use-btn').addEventListener('click', () => {
      currentRandomConfig = { ...viz };
      resetVizState(currentRandomConfig);
      // Cambiar a modo aleatorio
      vizMode = 3;
      vizBtns.forEach((b, j) => b.classList.toggle('active', j === 3));
      updateRandomVizUI();
      closeSavedPanel();
    });

    card.querySelector('.saved-del-btn').addEventListener('click', () => {
      savedVisualizations.splice(i, 1);
      try { localStorage.setItem('wwm-saved-viz', JSON.stringify(savedVisualizations)); } catch(_) {}
      renderSavedPanel();
    });

    savedListEl.appendChild(card);
  });
}

// ── Start loop ────────────────────────────────────────────────
draw();
