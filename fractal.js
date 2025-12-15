// Datamatics-Inspired Techno Visualization
// Monochrome data streams, binary pulses, abstract lines

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let mouseX = 0.5;
let mouseY = 0.5;
let time = 0;

// Constants: 128 BPM, monochrome
const TEMPO = 128 / 60;
const PATTERN_CYCLE_SPEED = TEMPO / 2;
const FADE_OPACITY = 0.05;
const PULSE_FREQ = TEMPO * 4; // Faster pulse for data feel
const FLASH_THRESHOLD = 0.98;

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
    return 1 + 0.15 * Math.abs(Math.sin(time * PULSE_FREQ * Math.PI * 2));
}

// Binary data stream function
function drawDataStream() {
    const density = 50 + mouseX * 50;
    const speed = 5 + mouseY * 10;
    
    for (let i = 0; i < density; i++) {
        const x = Math.random() * width;
        const y = (Math.random() * height + time * speed) % height;
        const binary = (Math.random() > 0.5 ? '1' : '0').repeat(5 + Math.floor(Math.random() * 10));
        
        ctx.font = `${10 + pulseScale() * 5}px monospace`;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
        ctx.fillText(binary, x, y);
    }
}

// Abstract line matrix (Datamatics-like paths)
function drawDataPath(centerX, centerY, segments, depth, rotation) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation + Math.sin(time * TEMPO) * 0.2);
    
    for (let i = 0; i < depth; i++) {
        const length = 50 + i * 20 * pulseScale();
        const angleStep = Math.PI * 2 / segments;
        
        for (let j = 0; j < segments; j++) {
            const angle = j * angleStep + Math.cos(time + i) * 0.1;
            const endX = Math.cos(angle) * length;
            const endY = Math.sin(angle) * length;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 - i / depth * 0.3})`;
            ctx.lineWidth = 1 + pulseScale();
            ctx.stroke();
        }
    }
    
    ctx.restore();
}

// Julia-inspired data field (monochrome)
function drawDataField() {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const maxIterations = 50;
    const zoom = 1.2 + mouseX * 0.5 + 0.2 * Math.sin(time * PULSE_FREQ);
    const cX = -0.8 + mouseX * 0.2;
    const cY = 0.156 + mouseY * 0.1;
    
    for (let px = 0; px < width; px += 3) {
        for (let py = 0; py < height; py += 3) {
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
                const value = 255 * (iteration / maxIterations);
                for (let dx = 0; dx < 3 && px + dx < width; dx++) {
                    for (let dy = 0; dy < 3 && py + dy < height; dy++) {
                        const index = ((py + dy) * width + (px + dx)) * 4;
                        data[index] = value;
                        data[index + 1] = value;
                        data[index + 2] = value;
                        data[index + 3] = 128 + value / 2;
                    }
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Sierpinski binary triangles
function drawBinaryTriangle(x, y, size, depth) {
    if (depth === 0 || size < 10) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size / 2, y - size * Math.sin(Math.PI / 3) * pulseScale());
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
        ctx.lineWidth = pulseScale();
        ctx.stroke();
        return;
    }
    
    const halfSize = size / 2;
    const height = size * Math.sin(Math.PI / 3);
    
    drawBinaryTriangle(x, y, halfSize, depth - 1);
    drawBinaryTriangle(x + halfSize, y, halfSize, depth - 1);
    drawBinaryTriangle(x + halfSize / 2, y - height / 2, halfSize, depth - 1);
}

// Animation
function animate() {
    time += 0.02;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);
    
    // Flash pulse
    if (Math.sin(time * PULSE_FREQ * Math.PI * 2) > FLASH_THRESHOLD) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, width, height);
    }
    
    const pattern = Math.floor(time * PATTERN_CYCLE_SPEED) % 4;
    
    if (pattern === 0) {
        drawDataStream();
    } else if (pattern === 1) {
        drawDataField();
    } else if (pattern === 2) {
        const count = 2 + Math.floor(mouseY * 2);
        for (let i = 0; i < count; i++) {
            const x = width / 2 + Math.sin(time * TEMPO + i) * width * 0.15;
            const y = height / 2 + Math.cos(time * TEMPO + i) * height * 0.15;
            drawDataPath(x, y, 12 + Math.floor(mouseX * 8), 6, time * TEMPO / 3);
        }
    } else {
        const size = height * 0.4 + mouseY * height * 0.2;
        const offsetX = width / 2 - size / 2;
        const offsetY = height / 2 + size * 0.25;
        drawBinaryTriangle(offsetX, offsetY, size, 5);
        
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time * TEMPO / 4);
        ctx.translate(-width / 2, -height / 2);
        drawBinaryTriangle(offsetX, offsetY, size * 0.6, 4);
        ctx.restore();
    }
    
    requestAnimationFrame(animate);
}

animate();