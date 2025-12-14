// Fractal Groove Visualization
// CPU-rendered fractal patterns using Canvas API

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let mouseX = 0;
let mouseY = 0;
let time = 0;

// Configuration constants
const PATTERN_CYCLE_SPEED = 0.2;
const FADE_OPACITY = 0.1;
const HUE_ROTATION_SPEED = 30;

// Resize canvas to fill window
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

// Initialize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / width;
    mouseY = e.clientY / height;
});

// Touch support for mobile
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX / width;
        mouseY = e.touches[0].clientY / height;
    }
});

// Default mouse position
mouseX = 0.5;
mouseY = 0.5;

// Draw recursive fractal pattern
function drawFractalTree(x, y, length, angle, depth, hue) {
    if (depth === 0 || length < 2) return;
    
    const endX = x + length * Math.cos(angle);
    const endY = y + length * Math.sin(angle);
    
    // Create gradient for each branch
    const gradient = ctx.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
    gradient.addColorStop(1, `hsla(${hue + 30}, 100%, 50%, 0.4)`);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = depth * 0.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Recursive branches
    const angleOffset = Math.PI / 4 + mouseX * Math.PI / 8;
    const lengthFactor = 0.7 + mouseY * 0.1;
    
    drawFractalTree(endX, endY, length * lengthFactor, angle - angleOffset, depth - 1, hue + 10);
    drawFractalTree(endX, endY, length * lengthFactor, angle + angleOffset, depth - 1, hue + 10);
}

// Draw Julia set inspired pattern
function drawJuliaPattern() {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const maxIterations = 50;
    const zoom = 1.5 + mouseX * 0.5;
    const cX = -0.7 + mouseX * 0.3;
    const cY = 0.27015 + mouseY * 0.1;
    
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
                const hue = (iteration / maxIterations * 360 + time * 50) % 360;
                const saturation = 100;
                const lightness = 50;
                
                const rgb = hslToRgb(hue / 360, saturation / 100, lightness / 100);
                
                // Fill 2x2 block to avoid gaps
                for (let dx = 0; dx < 2 && px + dx < width; dx++) {
                    for (let dy = 0; dy < 2 && py + dy < height; dy++) {
                        const index = ((py + dy) * width + (px + dx)) * 4;
                        data[index] = rgb[0];
                        data[index + 1] = rgb[1];
                        data[index + 2] = rgb[2];
                        data[index + 3] = 255;
                    }
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Draw geometric fractal mandala
function drawFractalMandala(centerX, centerY, radius, sides, depth, rotation, hue) {
    if (depth === 0 || radius < 5) return;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Draw polygon
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    ctx.strokeStyle = `hsla(${hue}, 80%, 50%, ${depth / 10})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Recursive smaller mandalas at vertices
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        drawFractalMandala(x, y, radius * 0.4, sides, depth - 1, rotation + 0.1, hue + 20);
    }
    
    ctx.restore();
}

// Draw Sierpinski-inspired triangular patterns
function drawSierpinskiPattern(x, y, size, depth, hue) {
    if (depth === 0 || size < 10) {
        // Draw filled triangle
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size / 2, y - size * Math.sin(Math.PI / 3));
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 90%, 50%, 0.3)`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue + 30}, 100%, 60%, 0.6)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
    }
    
    const halfSize = size / 2;
    const height = size * Math.sin(Math.PI / 3);
    
    // Recursive subdivision
    drawSierpinskiPattern(x, y, halfSize, depth - 1, hue + 10);
    drawSierpinskiPattern(x + halfSize, y, halfSize, depth - 1, hue + 10);
    drawSierpinskiPattern(x + halfSize / 2, y - height / 2, halfSize, depth - 1, hue + 10);
}

// Helper function to convert HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Main animation loop
function animate() {
    time += 0.01;
    
    // Clear canvas with fade effect
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);
    
    // Rotating base hue
    const baseHue = (time * HUE_ROTATION_SPEED) % 360;
    
    // Choose pattern based on time cycling
    const pattern = Math.floor(time * PATTERN_CYCLE_SPEED) % 3;
    
    if (pattern === 0) {
        // Fractal tree pattern
        const treeCount = 3 + Math.floor(mouseX * 3);
        for (let i = 0; i < treeCount; i++) {
            const x = (width / (treeCount + 1)) * (i + 1);
            const y = height;
            const angle = -Math.PI / 2 + Math.sin(time + i) * 0.2;
            const length = height * 0.15;
            drawFractalTree(x, y, length, angle, 8, baseHue + i * 60);
        }
    } else if (pattern === 1) {
        // Mandala pattern
        const mandalaCount = 2 + Math.floor(mouseY * 2);
        for (let i = 0; i < mandalaCount; i++) {
            const x = width / 2 + Math.cos(time + i * Math.PI * 2 / mandalaCount) * width * 0.2;
            const y = height / 2 + Math.sin(time + i * Math.PI * 2 / mandalaCount) * height * 0.2;
            const sides = 5 + Math.floor(mouseX * 3);
            drawFractalMandala(x, y, height * 0.15, sides, 4, time, baseHue + i * 90);
        }
    } else {
        // Sierpinski triangle pattern
        const triangleSize = height * 0.4 + mouseY * height * 0.3;
        const offsetX = width / 2 - triangleSize / 2;
        const offsetY = height / 2 + triangleSize * 0.3;
        drawSierpinskiPattern(offsetX, offsetY, triangleSize, 5, baseHue);
        
        // Add symmetric patterns
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time);
        ctx.translate(-width / 2, -height / 2);
        drawSierpinskiPattern(offsetX, offsetY, triangleSize * 0.5, 4, baseHue + 120);
        ctx.restore();
    }
    
    requestAnimationFrame(animate);
}

// Start animation
animate();
