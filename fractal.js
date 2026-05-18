// Intense Datamatics Techno Visualization with Enhanced Glitch
// Click to cycle patterns, move to interact, audio-reactive brutalist visuals.

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');
const patternLabel = document.getElementById('patternLabel');

let width, height;
let mouseX = 0.5;
let mouseY = 0.5;
let time = 0;
let currentPattern = 0;
let isAnimating = true;

const patternNames = [
    'DATA STREAM',
    'JULIA SET',
    'SPIRAL CHAOS',
    'MANDELBROT',
    'DRAGON FRACTAL'
];

let audioContext;
let analyser;
let dataArray;
let audioInitialized = false;
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const TEMPO = 128 / 60;
const FADE_OPACITY = 0.03;
const PULSE_FREQ = TEMPO * 8;
const FLASH_THRESHOLD = 0.9;
const GLITCH_FREQ = TEMPO * 4;
const clickDebounce = 250;
let lastClickTime = 0;
let nextPattern = 0;
let transitioning = false;
let transitionProgress = 1;
const transitionSpeed = 0.04;
function ease(t) {
    return t * t * (3 - 2 * t);
}

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function updatePatternLabel() {
    if (!patternLabel) return;
    patternLabel.textContent = `PATTERN: ${patternNames[currentPattern]}`;
    patternLabel.style.animation = 'none';
    setTimeout(() => {
        patternLabel.style.animation = 'flicker 0.2s infinite alternate';
    }, 10);
}

function initAudio() {
    if (audioInitialized || !navigator.mediaDevices) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            audioInitialized = true;
        })
        .catch(() => {
            audioInitialized = false;
        });
}

function handlePatternChange() {
    const now = Date.now();
    if (now - lastClickTime < clickDebounce || transitioning) return;
    lastClickTime = now;
    nextPattern = (currentPattern + 1) % patternNames.length;
    transitioning = true;
    transitionProgress = 0;
}

function pulseScale() {
    return 1 + 0.3 * Math.abs(Math.sin(time * PULSE_FREQ * Math.PI * 2));
}

function drawDataStream() {
    const density = (isMobile ? 40 : 80) + mouseX * (isMobile ? 40 : 80);
    const speed = 10 + mouseY * 18;

    ctx.font = `${14 + pulseScale() * 10}px monospace`;
    for (let i = 0; i < density; i++) {
        const x = Math.random() * width;
        const y = (Math.random() * height + time * speed) % height;
        const binary = (Math.random() > 0.5 ? '1' : '0').repeat(10 + Math.floor(Math.random() * 20));
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(time + i) * 0.25})`;
        ctx.fillText(binary, x, y);
    }
}

function drawDataPath(cx, cy, segments, depth, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation + Math.sin(time * TEMPO) * 0.3);

    for (let i = 0; i < depth; i++) {
        const len = 60 + i * 24 * pulseScale();
        const step = Math.PI * 2 / segments;
        for (let j = 0; j < segments; j++) {
            const angle = j * step + Math.cos(time + i) * 0.18;
            const x = Math.cos(angle) * len;
            const y = Math.sin(angle) * len;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x, y);
            ctx.strokeStyle = `rgba(255,255,255,${0.5 - i / depth * 0.4})`;
            ctx.lineWidth = 2 + pulseScale() * 2;
            ctx.stroke();
        }
    }

    ctx.restore();
}

function drawDataField() {
    const imageData = ctx.createImageData(width, height);
    const pxData = imageData.data;
    const maxIter = isMobile ? 28 : 56;
    const zoom = 1.3 + mouseX * 0.6 + 0.3 * Math.sin(time * PULSE_FREQ);
    const cRe = -0.75 + mouseX * 0.25;
    const cIm = 0.2 + mouseY * 0.15;

    for (let px = 0; px < width; px += 2) {
        for (let py = 0; py < height; py += 2) {
            let x = (px - width / 2) / (0.5 * zoom * width);
            let y = (py - height / 2) / (0.5 * zoom * height);
            let iter = 0;
            while (x * x + y * y <= 4 && iter < maxIter) {
                const xt = x * x - y * y + cRe;
                y = 2 * x * y + cIm;
                x = xt;
                iter++;
            }
            if (iter < maxIter) {
                const shade = 255 * (iter / maxIter * pulseScale());
                for (let dx = 0; dx < 2 && px + dx < width; dx++) {
                    for (let dy = 0; dy < 2 && py + dy < height; dy++) {
                        const idx = ((py + dy) * width + (px + dx)) * 4;
                        pxData[idx] = shade;
                        pxData[idx + 1] = shade;
                        pxData[idx + 2] = shade;
                        pxData[idx + 3] = 160 + shade / 1.4;
                    }
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function drawSierpinskiTriangle() {
    const depth = isMobile ? 4 : 6;
    const size = Math.min(width, height) * 0.38;
    const x0 = width / 2 - size / 2;
    const y0 = height / 2 + size * 0.32;

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = pulseScale() * 1.5;

    function drawTriangle(x, y, s, d) {
        if (d === 0 || s < 2) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + s, y);
            ctx.lineTo(x + s / 2, y - s * Math.sqrt(3) / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            return;
        }
        const h = s * Math.sqrt(3) / 2;
        drawTriangle(x, y, s / 2, d - 1);
        drawTriangle(x + s / 2, y, s / 2, d - 1);
        drawTriangle(x + s / 4, y - h / 2, s / 2, d - 1);
    }

    drawTriangle(x0, y0, size, depth);
}

function drawSpiralPattern() {
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 4;

    const size = Math.min(width, height) * 0.28;
    const levelMax = 5 + Math.floor(mouseX * 3);
    const scale = 0.8 + mouseY * 0.12;
    const spread = 0.15 + mouseX * 0.2 + Math.sin(time) * 0.1;
    const color = 'rgba(255,255,255,0.85)';
    const lineWidth = 5 + pulseScale() * 2;
    const branches = Math.max(3, Math.floor(3 + mouseY * 3));

    function branch(level) {
        if (level > levelMax) return;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        ctx.save();
        ctx.translate(size * 0.12, 0);
        ctx.scale(scale, scale);
        ctx.rotate(spread);
        branch(level + 1);
        ctx.restore();

        ctx.save();
        ctx.translate(size * 0.5, 0);
        ctx.scale(scale, scale);
        ctx.rotate(spread * 1.4);
        branch(level + 1);
        ctx.restore();

        ctx.save();
        ctx.translate(size * 0.62, 0);
        ctx.scale(scale * 0.35, scale * 0.35);
        ctx.rotate(spread * 0.6);
        branch(level + 1);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(size * 1.05, 0, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    for (let i = 0; i < branches; i++) {
        ctx.rotate((Math.PI * 2) / branches + time * 0.1);
        branch(0);
    }
    ctx.restore();
}

function drawMandelbrot() {
    const imageData = ctx.createImageData(width, height);
    const pxData = imageData.data;
    const maxIter = isMobile ? 28 : 56;
    const zoom = 1.3 + mouseX * 0.6 + 0.3 * Math.sin(time * PULSE_FREQ);

    for (let px = 0; px < width; px += 2) {
        for (let py = 0; py < height; py += 2) {
            let x0 = (px - width / 2) / (0.25 * zoom * width) + mouseX * 0.5 - 0.5;
            let y0 = (py - height / 2) / (0.25 * zoom * height) + mouseY * 0.5;
            let x = 0;
            let y = 0;
            let iter = 0;
            while (x * x + y * y <= 4 && iter < maxIter) {
                const xt = x * x - y * y + x0;
                y = 2 * x * y + y0;
                x = xt;
                iter++;
            }
            if (iter < maxIter) {
                const shade = 255 * (iter / maxIter * pulseScale());
                for (let dx = 0; dx < 2 && px + dx < width; dx++) {
                    for (let dy = 0; dy < 2 && py + dy < height; dy++) {
                        const idx = ((py + dy) * width + (px + dx)) * 4;
                        pxData[idx] = shade;
                        pxData[idx + 1] = shade;
                        pxData[idx + 2] = shade;
                        pxData[idx + 3] = 160 + shade / 1.4;
                    }
                }
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function drawDragonCurve() {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2 + pulseScale();
    ctx.beginPath();

    let x = width / 2;
    let y = height / 2;
    let angle = 0;
    const step = 5 + mouseY * 10;
    const iter = (isMobile ? 8 : 10) + Math.floor(mouseX * 5);

    function dragon(n, dir) {
        if (n === 0) {
            const nx = x + step * Math.cos(angle);
            const ny = y + step * Math.sin(angle);
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            x = nx;
            y = ny;
            return;
        }
        dragon(n - 1, 1);
        angle += dir * Math.PI / 2;
        dragon(n - 1, -1);
    }

    dragon(iter, 1);
    ctx.stroke();
}

function drawBarnsleyFern() {
    ctx.fillStyle = 'rgba(0,255,0,0.75)';
    let x = 0;
    let y = 0;
    const points = isMobile ? 2200 : 5000;

    for (let i = 0; i < points; i++) {
        const r = Math.random();
        let nx, ny;
        if (r < 0.01) {
            nx = 0; ny = 0.16 * y;
        } else if (r < 0.86) {
            nx = 0.85 * x + 0.04 * y;
            ny = -0.04 * x + 0.85 * y + 1.6;
        } else if (r < 0.93) {
            nx = 0.2 * x - 0.26 * y;
            ny = 0.23 * x + 0.22 * y + 1.6;
        } else {
            nx = -0.15 * x + 0.28 * y;
            ny = 0.26 * x + 0.24 * y + 0.44;
        }
        x = nx;
        y = ny;
        const px = width / 2 + x * 50 + mouseX * 100 - 50;
        const py = height - y * 50 - mouseY * 100;
        ctx.fillRect(px, py, 1, 1);
    }
}

function drawKochSnowflake() {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    const size = Math.min(width, height) * 0.3;
    const depth = (isMobile ? 3 : 4) + Math.floor(mouseX * 2);

    function koch(x1, y1, x2, y2, d) {
        if (d === 0) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            return;
        }
        const dx = (x2 - x1) / 3;
        const dy = (y2 - y1) / 3;
        const x3 = x1 + dx;
        const y3 = y1 + dy;
        const x4 = x1 + dx * 2;
        const y4 = y1 + dy * 2;
        const mx = x3 + (dx * Math.cos(Math.PI / 3) - dy * Math.sin(Math.PI / 3));
        const my = y3 + (dx * Math.sin(Math.PI / 3) + dy * Math.cos(Math.PI / 3));
        koch(x1, y1, x3, y3, d - 1);
        koch(x3, y3, mx, my, d - 1);
        koch(mx, my, x4, y4, d - 1);
        koch(x4, y4, x2, y2, d - 1);
    }

    const cx = width / 2;
    const cy = height / 2;
    const angle = time * 0.1;
    for (let i = 0; i < 3; i++) {
        const a1 = angle + i * 2 * Math.PI / 3;
        const a2 = angle + (i + 1) * 2 * Math.PI / 3;
        koch(cx + Math.cos(a1) * size, cy + Math.sin(a1) * size,
             cx + Math.cos(a2) * size, cy + Math.sin(a2) * size, depth);
    }
}

function pixelSortRow(data, y, sx, ex) {
    const pixels = [];
    for (let x = sx; x < ex; x++) {
        const idx = (y * width + x) * 4;
        const bright = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        pixels.push({r: data[idx], g: data[idx+1], b: data[idx+2], a: data[idx+3], bright});
    }
    pixels.sort((a, b) => a.bright - b.bright);
    for (let x = sx; x < ex; x++) {
        const idx = (y * width + x) * 4;
        const p = pixels[x - sx];
        data[idx] = p.r;
        data[idx+1] = p.g;
        data[idx+2] = p.b;
        data[idx+3] = p.a;
    }
}

function applyGlitch() {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const slices = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < slices; i++) {
        const row = Math.floor(Math.random() * height);
        const heightSlice = Math.min(height - row, 10 + Math.floor(Math.random() * 25));
        const shift = Math.floor(-30 + Math.random() * 60);
        for (let y = row; y < row + heightSlice; y++) {
            for (let x = 0; x < width; x++) {
                const src = (y * width + x) * 4;
                const dst = (y * width + (x + shift + width) % width) * 4;
                data[dst] = data[src];
                data[dst+1] = data[src+1];
                data[dst+2] = data[src+2];
                data[dst+3] = data[src+3];
            }
        }
    }

    const noiseDensity = 0.004;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < noiseDensity) {
            const n = Math.floor(-20 + Math.random() * 40);
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + n));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + n));
        }
    }

    const stripes = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < stripes; i++) {
        const y = Math.floor(Math.random() * height);
        const seg = Math.min(width, 60 + Math.floor(Math.random() * 180));
        const startX = Math.floor(Math.random() * (width - seg));
        pixelSortRow(data, y, startX, startX + seg);
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function animate() {
    if (!isAnimating) return;
    time += 0.02;
    let audioLevel = 0;
    if (audioInitialized) {
        analyser.getByteFrequencyData(dataArray);
        audioLevel = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
    }

    ctx.fillStyle = `rgba(0,0,0,${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);
    if (Math.sin(time * PULSE_FREQ * Math.PI * 2) > FLASH_THRESHOLD - audioLevel * 0.2) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(0, 0, width, height);
    }

    const drawByIndex = (index) => {
        switch (index) {
            case 0: drawDataStream(); break;
            case 1: drawDataField(); break;
            case 2: drawSpiralPattern(); break;
            case 3: drawMandelbrot(); break;
            case 4: drawDragonCurve(); break;
            default: drawDataStream();
        }
    };

    if (transitioning) {
        transitionProgress = Math.min(1, transitionProgress + transitionSpeed);
        const fade = ease(transitionProgress);

        ctx.save();
        ctx.globalAlpha = 1 - fade;
        drawByIndex(currentPattern);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = fade;
        drawByIndex(nextPattern);
        ctx.restore();

        if (transitionProgress >= 1) {
            currentPattern = nextPattern;
            transitioning = false;
            updatePatternLabel();
        }
    } else {
        drawByIndex(currentPattern);
    }

    if (Math.sin(time * GLITCH_FREQ * Math.PI * 2) > (isMobile ? 0.975 : 0.93) - audioLevel * 0.1) {
        applyGlitch();
    }
    requestAnimationFrame(animate);
}

document.body.style.overflow = 'hidden';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';

document.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
document.addEventListener('mousemove', e => {
    mouseX = e.clientX / width;
    mouseY = e.clientY / height;
    initAudio();
});
document.addEventListener('touchmove', e => {
    if (e.touches.length) {
        mouseY = e.touches[0].clientY / height;
        mouseX = 0.5;
    }
    initAudio();
});
document.addEventListener('click', handlePatternChange);
document.addEventListener('touchend', handlePatternChange);

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
updatePatternLabel();
animate();
