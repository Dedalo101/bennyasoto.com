// Dark Techno Fractal Visualization
// CPU-rendered patterns for TECHNO aesthetic

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let mouseX = 0;
let mouseY = 0;
let time = 0;

// Configuration constants
const PATTERN_CYCLE_SPEED = 0.5;
const FADE_OPACITY = 0.15;
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
    
    // Create gradient for each branch - darker tones
    const gradient = ctx.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, `hsla(${hue}, 20%, 20%, 0.6)`);
    gradient.addColorStop(1, `hsla(${hue + 10}, 20%, 10%, 0.3)`);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = depth * 0.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Recursive branches
    const angleOffset = Math.PI / 5 + mouseX * Math.PI / 10;
    const lengthFactor = 0.6 + mouseY * 0.15;
    
    drawFractalTree(endX, endY, length * lengthFactor, angle - angleOffset, depth - 1, hue + 5);
    drawFractalTree(endX, endY, length * lengthFactor, angle + angleOffset, depth - 1, hue + 5);
}

// Draw Julia set inspired pattern - desaturated
function drawJuliaPattern() {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    const maxIterations = 40;
    const zoom = 1.2 + mouseX * 0.4;
    const cX = -0.8 + mouseX * 0.2;
    const cY = 0.156 + mouseY * 0.1;
    
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
                const hue = (iteration / maxIterations * 360 + time * 30) % 360;
                const saturation = 10 + mouseY * 10;
                const lightness = 15 + (iteration / maxIterations) * 10;
                
                const rgb = hslToRgb(hue / 360, saturation / 100, lightness / 100);
                
                // Fill 2x2 block
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

// Draw geometric fractal mandala - darker
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
    
    ctx.strokeStyle = `hsla(${hue}, 15%, 25%, ${depth / 8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Recursive smaller mandalas
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        drawFractalMandala(x, y, radius * 0.35, sides, depth - 1, rotation + 0.05, hue + 10);
    }
    
    ctx.restore();
}

// Draw Sierpinski-inspired triangular patterns - industrial feel
function drawSierpinskiPattern(x, y, size, depth, hue) {
    if (depth === 0 || size < 10) {
        // Draw filled triangle - low opacity
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x + size / 2, y - size * Math.sin(Math.PI / 3));
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 10%, 15%, 0.2)`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue + 20}, 15%, 25%, 0.4)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        return;
    }
    
    const halfSize = size / 2;
    const height = size * Math.sin(Math.PI / 3);
    
    // Recursive subdivision
    drawSierpinskiPattern(x, y, halfSize, depth - 1, hue + 5);
    drawSierpinskiPattern(x + halfSize, y, halfSize, depth - 1, hue + 5);
    drawSierpinskiPattern(x + halfSize / 2, y - height / 2, halfSize, depth - 1, hue + 5);
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
    
    // Clear canvas with stronger fade for persistence
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);
    
    // Subtle base hue rotation - limited range for dark vibe
    const baseHue = 200 + (Math.sin(time) * 20); // Cool blues/grays
    
    // Choose pattern based on time
    const pattern = Math.floor(time * PATTERN_CYCLE_SPEED) % 3;
    
    if (pattern === 0) {
        // Fractal tree - fewer, taller
        const treeCount = 2 + Math.floor(mouseX * 2);
        for (let i = 0; i < treeCount; i++) {
            const x = (width / (treeCount + 1)) * (i + 1);
            const y = height;
            const angle = -Math.PI / 2 + Math.sin(time + i) * 0.1;
            const length = height * 0.2;
            drawFractalTree(x, y, length, angle, 7, baseHue + i * 30);
        }
    } else if (pattern === 1) {
        // Mandala - slower rotation
        const mandalaCount = 1 + Math.floor(mouseY * 2);
        for (let i = 0; i < mandalaCount; i++) {
            const x = width / 2 + Math.cos(time * 0.5 + i * Math.PI * 2 / mandalaCount) * width * 0.15;
            const y = height / 2 + Math.sin(time * 0.5 + i * Math.PI * 2 / mandalaCount) * height * 0.15;
            const sides = 4 + Math.floor(mouseX * 4);
            drawFractalMandala(x, y, height * 0.2, sides, 5, time * 0.2, baseHue + i * 60);
        }
    } else {
        // Sierpinski - larger, rotating
        const triangleSize = height * 0.5 + mouseY * height * 0.2;
        const offsetX = width / 2 - triangleSize / 2;
        const offsetY = height / 2 + triangleSize * 0.25;
        drawSierpinskiPattern(offsetX, offsetY, triangleSize, 6, baseHue);
        
        // Symmetric overlay
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time * 0.3);
        ctx.translate(-width / 2, -height / 2);
        drawSierpinskiPattern(offsetX, offsetY, triangleSize * 0.6, 5, baseHue + 60);
        ctx.restore();
    }
    
    requestAnimationFrame(animate);
}

// Start animation
animate();