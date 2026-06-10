// ====== Elements ======
const canvas = document.getElementById('albumArt');
const ctx = canvas.getContext('2d');

const fileInput = document.getElementById('fileInput');
const audioPlayer = document.getElementById('audioPlayer');

const songName = document.getElementById('songName');
const modeLabel = document.getElementById('modeLabel');

const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const modeBtn = document.getElementById('modeBtn');

const seekBar = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const volumeBar = document.getElementById('volumeBar');

const playlistEl = document.getElementById('playlist');

const AUDIO_BOOST = 1.2;

// ====== Canvas sizing ======
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ====== Playlist ======
const tracks = [
    { name: 'Change (In the House of Flies)', src: 'music/Change (In the House of Flies).mp3' },
    { name: 'Depeche Mode - Precious', src: 'music/Depeche_Mode-Precious_(Remastered).mp3' },
    { name: 'Skrillex - Bangarang feat. Sirah', src: 'music/SKRILLEX-Bangarang-feat.Sirah.mp3' },
    { name: 'The Weeknd - Blinding Lights', src: 'music/The Weeknd - Blinding Lights (Official Audio).mp3' },
];

let currentTrack = -1;

function renderPlaylist() {
    playlistEl.innerHTML = '';
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = track.name;
        if (index === currentTrack) li.classList.add('active');
        li.addEventListener('click', () => loadTrack(index, true));
        playlistEl.appendChild(li);
    });
}

function loadTrack(index, autoplay) {
    if (index < 0 || index >= tracks.length) return;
    currentTrack = index;
    const track = tracks[currentTrack];
    audioPlayer.src = encodeURI(track.src);
    songName.textContent = track.name;
    renderPlaylist();
    if (autoplay) {
        audioPlayer.play();
    }
}

fileInput.addEventListener('change', () => {
    const startIndex = tracks.length;
    Array.from(fileInput.files).forEach((file) => {
        tracks.push({ name: file.name, src: URL.createObjectURL(file) });
    });
    renderPlaylist();
    loadTrack(startIndex, true);
});

renderPlaylist();

// ====== Audio context / analyser ======
let audioContext;
let analyser;
let audioSourceConnected = false;

function ensureAudioGraph() {
    if (audioSourceConnected) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioPlayer);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    audioSourceConnected = true;
}

audioPlayer.addEventListener('play', () => {
    ensureAudioGraph();
    audioContext.resume();
    playIcon.innerHTML = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"></path>';
});

audioPlayer.addEventListener('pause', () => {
    playIcon.innerHTML = '<path d="M8 5v14l11-7z"></path>';
});

audioPlayer.addEventListener('ended', () => {
    playNext();
});

// ====== Playback controls ======
playBtn.addEventListener('click', () => {
    if (currentTrack === -1) {
        loadTrack(0, true);
        return;
    }
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
});

function playPrev() {
    if (tracks.length === 0) return;
    const next = currentTrack <= 0 ? tracks.length - 1 : currentTrack - 1;
    loadTrack(next, true);
}

function playNext() {
    if (tracks.length === 0) return;
    const next = (currentTrack + 1) % tracks.length;
    loadTrack(next, true);
}

prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

// ====== Seek bar / time ======
function formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

audioPlayer.addEventListener('loadedmetadata', () => {
    seekBar.max = audioPlayer.duration;
    durationTimeEl.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener('timeupdate', () => {
    if (!seekBar.matches(':active')) {
        seekBar.value = audioPlayer.currentTime;
    }
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
});

seekBar.addEventListener('input', () => {
    audioPlayer.currentTime = seekBar.value;
});

// ====== Volume ======
volumeBar.addEventListener('input', () => {
    audioPlayer.volume = volumeBar.value;
});

// ====== Visualization modes ======
let mode = 0;
const modeNames = ['Barras', 'Partículas', 'Onda', 'Radial'];

modeBtn.addEventListener('click', () => {
    mode = (mode + 1) % modeNames.length;
    modeLabel.textContent = `Modo: ${modeNames[mode]}`;
});

function fadeFond() {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---- Particles ----
function Particula() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
}

const particulas = [];
for (let i = 0; i < 100; i++) {
    particulas.push(new Particula());
}

function ParticulaExplosion() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = 0;
    this.life = 0;
    this.active = false;
}

const explosivas = [];
for (let i = 0; i < 8; i++) {
    explosivas.push(new ParticulaExplosion());
}

// ====== Main draw loop ======
function draw() {
    requestAnimationFrame(draw);

    if (!analyser) {
        fadeFond();
        return;
    }

    if (mode === 1) {
        fadeFond();
    } else {
        ctx.fillStyle = 'rgb(10, 10, 20)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (mode === 0) drawBars();
    if (mode === 1) drawParticulas();
    if (mode === 2) drawWave();
    if (mode === 3) drawRadial();
}
requestAnimationFrame(draw);

function drawBars() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = Math.pow(dataArray[i] / 255, 1.6) * canvas.height * AUDIO_BOOST;
        const hue = 200 + (i / dataArray.length) * 120;
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

function drawParticulas() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];
        const audioValue = dataArray[i % dataArray.length];

        const BOOST = 2.5;
        const targetSize = (audioValue / 255) * 18 * BOOST;
        p.size += (targetSize - p.size) * 0.6;

        const force = ((audioValue - 80) / 80) * BOOST;
        p.x += p.speedX * BOOST + force;
        p.y += p.speedY * BOOST + force;

        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        const intensity = audioValue / 255;
        const color = audioValue > 200
            ? `rgb(0,255,255)`
            : `rgb(${255 * intensity},${200 * intensity},255)`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = intensity * 50;
        ctx.shadowColor = color;
        ctx.fill();

        if (audioValue > 220 && Math.random() < 0.03) {
            const e = explosivas[Math.floor(Math.random() * explosivas.length)];
            e.x = Math.random() * canvas.width;
            e.y = Math.random() * canvas.height;
            e.size = 0;
            e.life = 1;
            e.active = true;
        }
    }

    for (let i = 0; i < explosivas.length; i++) {
        const e = explosivas[i];
        if (!e.active) continue;

        e.size += 5;
        e.life -= 0.02;
        if (e.life <= 0) {
            e.active = false;
            continue;
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,255,${e.life})`;
        ctx.shadowBlur = 50;
        ctx.shadowColor = 'cyan';
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

function drawWave() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    for (let i = 0; i < dataArray.length; i++) {
        const y = Math.pow(dataArray[i] / 255, 1.8) * canvas.height * AUDIO_BOOST;
        ctx.lineTo(i * (canvas.width / dataArray.length), canvas.height - y);
    }
    ctx.strokeStyle = '#8fd3ff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#8fd3ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// ---- PSP-style radial spectrum ----
function drawRadial() {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.18;
    const bars = dataArray.length;

    for (let i = 0; i < bars; i++) {
        const value = dataArray[i] / 255;
        const barLength = Math.pow(value, 1.5) * baseRadius * 1.8 * AUDIO_BOOST;
        const angle = (i / bars) * Math.PI * 2;

        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barLength);
        const y2 = cy + Math.sin(angle) * (baseRadius + barLength);

        const hue = (i / bars) * 360;
        ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // glowing center circle
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#8fd3ff';
    ctx.fill();
    ctx.shadowBlur = 0;
}
