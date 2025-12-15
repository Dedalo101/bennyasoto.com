// Intense Datamatics Techno Visualization with Enhanced Glitch
// Added scan lines, pixel sorting; optimized by reducing slices/noise, glitch on beat only

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let mouseX = 0.5;
let mouseY = 0.5;
let time = 0;

// Constants
const TEMPO = 128 / 60;
const PATTERN_CYCLE_SPEED = TEMPO / 2;
const FADE_OPACITY = 0.03;
const PULSE_FREQ = TEMPO * 8;
const FLASH_THRESHOLD = 0.9;
const GLITCH_FREQ = TEMPO * 4;

// Resize
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse/touch
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / width;
    mouseY = e.clientY / height;
});

document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX / width;
        mouseY = e.touches[0].clientY / height;
    }
});

// Pulse
function pulseScale() {
    return 1 + 0.3 * Math.abs(Math.sin(time * PULSE_FREQ * Math.PI * 2));
}

// Data stream
function drawDataStream() {
    const density = 100 + mouseX * 100;
    const speed = 10 + mouseY * 20;
    
    for (let i = 0; i < density; i++) {
        const x = Math.random() * width;
        const y = (Math.random() * height + time * speed) % height;
        const binary = (Math.random() > 0.5 ? '1' : '0').repeat(10 + Math.floor(Math.random() * 20));
        
        ctx.font = `${15 + pulseScale() * 10}px monospace`;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(time + i) * 0.3})`;
        ctx.fillText(binary, x, y);
    }
}

// Data path
function drawDataPath(centerX, centerY, segments, depth, rotation) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation + Math.sin(time * TEMPO) * 0.3);
    
    for (let i = 0; i < depth; i++) {
        const length = 70 + i * 30 * pulseScale();
        const angleStep = Math.PI * 2 / segments;
        
        for (let j = 0; j < segments; j++) {
            const angle = j * angleStep + Math.cos(time + i) * 0.15;
            const endX = Math.cos(angle) * length;
            const endY = Math.sin(angle) * length;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - i / depth * 0.4})`;
            ctx.lineWidth = 2 + pulseScale() * 2;
            ctx.stroke();
        }
    }
    
    ctx.restore();
}

// Data field
function drawDataField() {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const maxIterations = 60;
    const zoom = 1.3 + mouseX * 0.6 + 0.3 * Math.sin(time * PULSE_FREQ);
    const cX = -0.75 + mouseX * 0.25;
    const cY = 0.2 + mouseY * 0.15;
    
    for (let px = 0; px < width; px += 2) {
        for (let py = 0; py < height; py += 2) {
            let x = (px - width / 2) / (0.5 * zoom * width);
            let y = (py - height / 2) / (0.5 * zoom * height);
            
            let iteration = 0;
            while (x * x + y * y <= 4 && iteration < maxIterations) {
                const xTemp = x * x - y * y + cX;
                y = 2 * x * y + cY;
                x = xTemp;
                iteration++;
            }
            
            if (iteration < maxIterations) {
                const value = 255 * (iteration / maxIterations * pulseScale());
                for (let dx = 0; dx < 2 && px + dx < width; dx++) {
                    for (let dy = 0; dy < 2 && py + dy < height; dy++) {
                        const index = ((py + dy) * width + (px + dx)) * 4;
                        data[index] = value;
                        data[index + 1] = value;
                        data[index + 2] = value;
                        data[index + 3] = 160 + value / 1.5;
                    }
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Binary triangle
function drawBinaryTriangle(x, y, size, depth) {
    if (depth === 0 || size < 10) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size / 2, y - size * Math.sin(Math.PI / 3) * pulseScale());
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
        ctx.lineWidth = pulseScale() * 1.5;
        ctx.stroke();
        return;
    }
    
    const halfSize = size / 2;
    const height = size * Math.sin(Math.PI / 3);
    
    drawBinaryTriangle(x, y, halfSize, depth - 1);
    drawBinaryTriangle(x + halfSize, y, halfSize, depth - 1);
    drawBinaryTriangle(x + halfSize / 2, y - height / 2, halfSize, depth - 1);
}

// Pixel sort helper
function pixelSortRow(data, y, startX, endX) {
    const pixels = [];
    for (let x = startX; x < endX; x++) {
        const index = (y * width + x) * 4;
        const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
        pixels.push({r: data[index], g: data[index+1], b: data[index+2], a: data[index+3], brightness});
    }
    pixels.sort((a, b) => a.brightness - b.brightness);
    for (let x = startX; x < endX; x++) {
        const index = (y * width + x) * 4;
        const p = pixels[x - startX];
        data[index] = p.r;
        data[index + 1] = p.g;
        data[index + 2] = p.b;
        data[index + 3] = p.a;
    }
}

// Glitch effect
function applyGlitch() {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Optimized row shifts: fewer slices
    const numSlices = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < numSlices; s++) {
        const sliceY = Math.floor(Math.random() * height);
        const sliceHeight = Math.floor(10 + Math.random() * 20);
        const shift = Math.floor(-30 + Math.random() * 60);
        
        for (let y = sliceY; y < sliceY + sliceHeight && y < height; y++) {
            for (let x = 0; x < width; x++) {
                const origIndex = (y * width + x) * 4;
                const newX = (x + shift + width) % width;
                const newIndex = (y * width + newX) * 4;
                
                data[newIndex] = data[origIndex];
                data[newIndex + 1] = data[origIndex + 1];
                data[newIndex + 2] = data[origIndex + 2];
                data[newIndex + 3] = data[origIndex + 3];
            }
        }
    }
    
    // Optimized noise: lower density
    const noiseDensity = 0.005;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < noiseDensity) {
            const noise = Math.floor(-30 + Math.random() * 60);
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
    }
    
    // Pixel sorting: few rows
    const numSortRows = 5 + Math.floor(Math.random() * 5);
    for (let s = 0; s < numSortRows; s++) {
        const y = Math.floor(Math.random() * height);
        const segmentLength = Math.floor(50 + Math.random() * 200);
        const startX = Math.floor(Math.random() * (width - segmentLength));
        pixelSortRow(data, y, startX, startX + segmentLength);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Scan lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// Animation
function animate() {
    time += 0.02;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);
    
    // Flash
    if (Math.sin(time * PULSE_FREQ * Math.PI * 2) > FLASH_THRESHOLD) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, 0, width, height);
    }
    
    const pattern = Math.floor(time * PATTERN_CYCLE_SPEED) % 4;
    
    if (pattern === 0) {
        drawDataStream();
    } else if (pattern === 1) {
        drawDataField();
    } else if (pattern === 2) {
        const count = 3 + Math.floor(mouseY * 3);
        for (let i = 0; i < count; i++) {
            const x = width / 2 + Math.sin(time * TEMPO + i) * width * 0.2;
            const y = height / 2 + Math.cos(time * TEMPO + i) * height * 0.2;
            drawDataPath(x, y, 16 + Math.floor(mouseX * 12), 8, time * TEMPO / 2);
        }
    } else {
        const size = height * 0.45 + mouseY * height * 0.25;
        const offsetX = width / 2 - size / 2;
        const offsetY = height / 2 + size * 0.3;
        drawBinaryTriangle(offsetX, offsetY, size, 6);
        
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time * TEMPO / 3);
        ctx.translate(-width / 2, -height / 2);
        drawBinaryTriangle(offsetX, offsetY, size * 0.7, 5);
        ctx.restore();
    }
    
    // Glitch on beat only
    if (Math.sin(time * GLITCH_FREQ * Math.PI * 2) > 0.95) {
        applyGlitch();
    }
    
    requestAnimationFrame(animate);
}

animate();