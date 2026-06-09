/**
 * Benny Yasoto — Prisss-style datamatics fractals (red hard techno palette)
 * Tap/click background to cycle 9 patterns. Deferred load for LCP.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

  const BPM = 145;
  const TEMPO = BPM / 60;
  const FADE_OPACITY = 0.035;
  const PULSE_FREQ = TEMPO * 2;
  const FLASH_THRESHOLD = 0.9;
  const GLITCH_FREQ = TEMPO * 4;

  const C = {
    main: [255, 40, 80],
    hot: [255, 85, 95],
    deep: [196, 24, 53],
  };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const PERFORMANCE_PRESETS = [
    {
      name: 'low',
      pixelStep: 5,
      maxIterations: 24,
      dataDensity: 60,
      dataDensityMobile: 35,
      barnsleyPoints: 1400,
      dragonIterations: 6,
      spiralDepth: 3,
      glitchSlices: 1,
      glitchNoise: 0.0012,
      glitchRows: 3,
      glitchMosh: 1,
      glitchInterval: 440,
      snowflakeIterations: 2,
    },
    {
      name: 'medium',
      pixelStep: 4,
      maxIterations: 34,
      dataDensity: 95,
      dataDensityMobile: 55,
      barnsleyPoints: 2400,
      dragonIterations: 8,
      spiralDepth: 4,
      glitchSlices: 2,
      glitchNoise: 0.0025,
      glitchRows: 4,
      glitchMosh: 2,
      glitchInterval: 340,
      snowflakeIterations: 3,
    },
    {
      name: 'high',
      pixelStep: 3,
      maxIterations: 44,
      dataDensity: 130,
      dataDensityMobile: 70,
      barnsleyPoints: 3600,
      dragonIterations: 10,
      spiralDepth: 5,
      glitchSlices: 3,
      glitchNoise: 0.004,
      glitchRows: 5,
      glitchMosh: 3,
      glitchInterval: 280,
      snowflakeIterations: 4,
    },
  ];

  const performanceState = {
    presetIndex: isMobile ? 0 : 2,
    fpsSample: 60,
    lastTimestamp: performance.now(),
    framesElapsed: 0,
  };

  const TARGET_FPS = isMobile ? 42 : 55;
  const FPS_UPPER_MARGIN = 10;
  const FPS_LOWER_MARGIN = 8;

  let width = 0;
  let height = 0;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let time = 0;
  let currentPattern = 0;
  let lastGlitchTime = performance.now();
  let reusableImageData = null;
  let canvas = null;
  let ctx = null;

  function getQuality() {
    return PERFORMANCE_PRESETS[performanceState.presetIndex];
  }

  function acquireImageData() {
    if (!reusableImageData || reusableImageData.width !== width || reusableImageData.height !== height) {
      reusableImageData = ctx.createImageData(width, height);
    } else {
      reusableImageData.data.fill(0);
    }
    return reusableImageData;
  }

  function fillPixel(d, idx, v) {
    d[idx] = v;
    d[idx + 1] = Math.floor(v * 0.22);
    d[idx + 2] = Math.floor(v * 0.32);
    d[idx + 3] = 140 + v / 1.6;
  }

  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.__lw === w && canvas.__lh === h && canvas.__ldpr === dpr) {
      width = w;
      height = h;
      return;
    }
    canvas.__lw = w;
    canvas.__lh = h;
    canvas.__ldpr = dpr;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    width = w;
    height = h;
    reusableImageData = null;
  }

  function pulseScale() {
    return 1 + 0.28 * Math.abs(Math.sin(time * PULSE_FREQ * Math.PI * 2));
  }

  function setPointer(x, y) {
    mouseX = x / width;
    mouseY = y / height;
  }

  function drawDataStream(quality) {
    const base = isMobile ? quality.dataDensityMobile : quality.dataDensity;
    const density = base + mouseX * base * 0.45;
    const speed = 7 + mouseY * 16;
    const fs = 12 + pulseScale() * 8;
    ctx.font = `${fs}px ${getComputedStyle(document.body).fontFamily}`;

    for (let i = 0; i < density; i++) {
      const x = Math.random() * width;
      const y = (Math.random() * height + time * speed) % height;
      const bits = (Math.random() > 0.5 ? '1' : '0').repeat(6 + Math.floor(Math.random() * 12));
      const col = Math.random() > 0.6 ? C.hot : C.main;
      ctx.fillStyle = rgba(col, 0.35 + Math.sin(time + i) * 0.22);
      ctx.fillText(bits, x, y);
    }
  }

  function drawDataField(quality) {
    const id = acquireImageData();
    const d = id.data;
    const step = quality.pixelStep;
    const maxIter = Math.round(quality.maxIterations + mouseY * 8);
    const zoom = 1.2 + mouseX * 0.55 + 0.22 * Math.sin(time * PULSE_FREQ);
    const cX = -0.75 + mouseX * 0.25;
    const cY = 0.2 + mouseY * 0.15;

    for (let px = 0; px < width; px += step) {
      for (let py = 0; py < height; py += step) {
        let x = (px + step * 0.5 - width / 2) / (0.5 * zoom * width);
        let y = (py + step * 0.5 - height / 2) / (0.5 * zoom * height);
        let iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xt = x * x - y * y + cX;
          y = 2 * x * y + cY;
          x = xt;
          iter++;
        }
        if (iter < maxIter) {
          const v = 255 * (iter / maxIter * pulseScale());
          for (let dx = 0; dx < step && px + dx < width; dx++) {
            for (let dy = 0; dy < step && py + dy < height; dy++) {
              fillPixel(d, ((py + dy) * width + (px + dx)) * 4, v);
            }
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  function drawDataPath(cx2, cy2, segments, depth, rotation) {
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.rotate(rotation + Math.sin(time * TEMPO) * 0.3);
    for (let i = 0; i < depth; i++) {
      const len = 55 + i * 26 * pulseScale();
      const aStep = (Math.PI * 2) / segments;
      for (let j = 0; j < segments; j++) {
        const a = j * aStep + Math.cos(time + i) * 0.15;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = rgba(i % 2 ? C.deep : C.main, 0.45 - (i / depth) * 0.35);
        ctx.lineWidth = 1.2 + pulseScale() * 1.8;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBinaryTriangle(ox, oy, size, depth) {
    ctx.fillStyle = rgba(C.main, 0.75);
    ctx.strokeStyle = rgba(C.hot, 0.55);
    ctx.lineWidth = pulseScale() * 1.2;

    function sier(x, y, sz, d) {
      if (d === 0 || sz < 2) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sz, y);
        ctx.lineTo(x + sz / 2, y - (sz * Math.sqrt(3)) / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
      }
      const hs = sz / 2;
      const hh = (sz * Math.sqrt(3)) / 2;
      sier(x, y, hs, d - 1);
      sier(x + hs, y, hs, d - 1);
      sier(x + hs / 2, y - hh / 2, hs, d - 1);
    }
    sier(ox, oy, size, depth);
  }

  function drawSpiralPattern(quality) {
    const size = Math.min(width, height) * 0.26;
    const maxLevel = quality.spiralDepth + Math.floor(mouseX * 2);
    const scale = 0.78 + mouseY * 0.08;
    const spread = 0.18 + mouseX * 0.16 + Math.sin(time) * 0.07;
    const sides = Math.max(3, Math.floor(3 + mouseY * 3));
    ctx.strokeStyle = rgba(C.main, 0.78);
    ctx.fillStyle = rgba(C.hot, 0.78);
    ctx.lineWidth = Math.max(1, 3 * pulseScale());

    function branch(level) {
      if (level > maxLevel) return;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
      if (level < maxLevel) {
        ctx.save();
        ctx.translate(size * 0.12, 0);
        ctx.scale(scale, scale);
        ctx.rotate(spread);
        branch(level + 1);
        ctx.restore();
        ctx.save();
        ctx.translate(size * 0.48, 0);
        ctx.scale(scale, scale);
        ctx.rotate(spread * 1.35);
        branch(level + 1);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(size * 1.05, 0, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    for (let i = 0; i < sides; i++) {
      ctx.rotate((Math.PI * 2) / sides + time * 0.09);
      branch(0);
    }
    ctx.restore();
  }

  function drawMandelbrot(quality) {
    const id = acquireImageData();
    const d = id.data;
    const step = quality.pixelStep;
    const maxIter = Math.round(quality.maxIterations + mouseY * 6);
    const zoom = 1.22 + mouseX * 0.5 + 0.22 * Math.sin(time * PULSE_FREQ);

    for (let px = 0; px < width; px += step) {
      for (let py = 0; py < height; py += step) {
        let x0 = (px + step * 0.5 - width / 2) / (0.25 * zoom * width) + mouseX * 0.4 - 0.5;
        let y0 = (py + step * 0.5 - height / 2) / (0.25 * zoom * height) + mouseY * 0.4;
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
          const v = 255 * (iter / maxIter * pulseScale());
          for (let dx = 0; dx < step && px + dx < width; dx++) {
            for (let dy = 0; dy < step && py + dy < height; dy++) {
              fillPixel(d, ((py + dy) * width + (px + dx)) * 4, v);
            }
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  function drawDragonCurve(quality) {
    ctx.strokeStyle = rgba(C.main, 0.78);
    ctx.lineWidth = Math.max(1.2, 1.6 * pulseScale());
    ctx.beginPath();
    let x = width / 2;
    let y = height / 2;
    let angle = 0;
    const len = 3 + mouseY * 7;
    const iters = Math.min(11, quality.dragonIterations + Math.floor(mouseX * 3));

    function dragon(iter, dir) {
      if (iter === 0) {
        const ex = x + len * Math.cos(angle);
        const ey = y + len * Math.sin(angle);
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        x = ex;
        y = ey;
        return;
      }
      dragon(iter - 1, 1);
      angle += dir * (Math.PI / 2);
      dragon(iter - 1, -1);
    }
    dragon(iters, 1);
    ctx.stroke();
  }

  function drawBarnsleyFern(quality) {
    ctx.fillStyle = rgba(C.main, 0.72);
    let x = 0;
    let y = 0;
    const pts = quality.barnsleyPoints;
    for (let i = 0; i < pts; i++) {
      const r = Math.random();
      let nx;
      let ny;
      if (r < 0.01) {
        nx = 0;
        ny = 0.16 * y;
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
      const px2 = width / 2 + x * 46 + mouseX * 70 - 35;
      const py2 = height - y * 46 - mouseY * 80;
      ctx.fillRect(px2, py2, 1, 1);
    }
  }

  function drawKochSnowflake(quality) {
    ctx.strokeStyle = rgba(C.hot, 0.78);
    ctx.lineWidth = 1;
    const size = Math.min(width, height) * 0.26;
    const iters = Math.max(1, Math.min(4, quality.snowflakeIterations + Math.floor(mouseX * 1.5)));
    const angle = time * 0.08;

    function koch(x1, y1, x2, y2, iter) {
      if (iter === 0) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
      }
      const dx = x2 - x1;
      const dy = y2 - y1;
      const x3 = x1 + dx / 3;
      const y3 = y1 + dy / 3;
      const x4 = x1 + (2 * dx) / 3;
      const y4 = y1 + (2 * dy) / 3;
      const x5 = x3 + (x4 - x3) * Math.cos(Math.PI / 3) - (y4 - y3) * Math.sin(Math.PI / 3);
      const y5 = y3 + (x4 - x3) * Math.sin(Math.PI / 3) + (y4 - y3) * Math.cos(Math.PI / 3);
      koch(x1, y1, x3, y3, iter - 1);
      koch(x3, y3, x5, y5, iter - 1);
      koch(x5, y5, x4, y4, iter - 1);
      koch(x4, y4, x2, y2, iter - 1);
    }

    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < 3; i++) {
      const a1 = angle + (i * 2 * Math.PI) / 3;
      const a2 = angle + ((i + 1) * 2 * Math.PI) / 3;
      koch(cx + size * Math.cos(a1), cy + size * Math.sin(a1), cx + size * Math.cos(a2), cy + size * Math.sin(a2), iters);
    }
  }

  function pixelSortRow(data, y, startX, endX) {
    const pixels = [];
    for (let x = startX; x < endX; x++) {
      const index = (y * width + x) * 4;
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      pixels.push({
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
        a: data[index + 3],
        brightness,
      });
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

  function applyGlitch(quality) {
    const now = performance.now();
    if (now - lastGlitchTime < quality.glitchInterval) return;
    lastGlitchTime = now;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const numSlices = quality.glitchSlices + Math.floor(Math.random() * 2);

    for (let s = 0; s < numSlices; s++) {
      const sliceY = Math.floor(Math.random() * height);
      const sliceHeight = Math.floor(8 + Math.random() * 14);
      const shift = Math.floor(-22 + Math.random() * 44);
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

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < quality.glitchNoise) {
        data[i] = Math.max(0, Math.min(255, data[i] + Math.floor(-25 + Math.random() * 50)));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + Math.floor(-10 + Math.random() * 20)));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + Math.floor(-10 + Math.random() * 20)));
      }
    }

    for (let s = 0; s < quality.glitchRows; s++) {
      const y = Math.floor(Math.random() * height);
      const segmentLength = Math.floor(40 + Math.random() * 180);
      const startX = Math.floor(Math.random() * Math.max(1, width - segmentLength));
      pixelSortRow(data, y, startX, startX + segmentLength);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function drawPattern(quality) {
    switch (currentPattern) {
      case 0:
        drawDataStream(quality);
        break;
      case 1:
        drawDataField(quality);
        break;
      case 2: {
        const count = (quality.name === 'high' ? 4 : 3) + Math.floor(mouseY * 2);
        const segments = Math.max(10, Math.floor(12 + mouseX * 10));
        const depth = Math.min(9, quality.spiralDepth + 4);
        for (let i = 0; i < count; i++) {
          const x = width / 2 + Math.sin(time * TEMPO + i) * width * 0.18;
          const y = height / 2 + Math.cos(time * TEMPO + i) * height * 0.18;
          drawDataPath(x, y, segments, depth, (time * TEMPO) / 2);
        }
        break;
      }
      case 3: {
        const size = height * 0.4 + mouseY * height * 0.18;
        const offsetX = width / 2 - size / 2;
        const offsetY = height / 2 + size * 0.26;
        drawBinaryTriangle(offsetX, offsetY, size, quality.spiralDepth + 2);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((time * TEMPO) / 3);
        ctx.translate(-width / 2, -height / 2);
        drawBinaryTriangle(offsetX, offsetY, size * 0.68, quality.spiralDepth + 1);
        ctx.restore();
        break;
      }
      case 4:
        drawSpiralPattern(quality);
        break;
      case 5:
        drawMandelbrot(quality);
        break;
      case 6:
        drawDragonCurve(quality);
        break;
      case 7:
        drawBarnsleyFern(quality);
        break;
      case 8:
        drawKochSnowflake(quality);
        break;
      default:
        break;
    }
  }

  function animate(timestamp) {
    requestAnimationFrame(animate);
    setupCanvas();
    if (!width || !height) return;

    if (document.hidden) return;

    const now = timestamp || performance.now();
    let delta = now - performanceState.lastTimestamp;
    if (!Number.isFinite(delta) || delta <= 0) delta = 16;
    else if (delta > 180) delta = 180;

    performanceState.lastTimestamp = now;
    performanceState.fpsSample = performanceState.fpsSample * 0.92 + (1000 / Math.max(delta, 1)) * 0.08;
    performanceState.framesElapsed++;

    if (performanceState.framesElapsed % 45 === 0) {
      const fps = performanceState.fpsSample;
      if (fps < TARGET_FPS - FPS_LOWER_MARGIN && performanceState.presetIndex > 0) {
        performanceState.presetIndex -= 1;
      } else if (fps > TARGET_FPS + FPS_UPPER_MARGIN && performanceState.presetIndex < PERFORMANCE_PRESETS.length - 1) {
        performanceState.presetIndex += 1;
      }
    }

    const quality = getQuality();
    time += delta * 0.0012;

    ctx.fillStyle = `rgba(3, 3, 8, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);

    if (Math.sin(time * PULSE_FREQ * Math.PI * 2) > FLASH_THRESHOLD) {
      ctx.fillStyle = rgba(C.main, 0.1);
      ctx.fillRect(0, 0, width, height);
    }

    drawPattern(quality);

    if (quality.name !== 'low' && Math.sin(time * GLITCH_FREQ * Math.PI * 2) > 0.95) {
      applyGlitch(quality);
    }
  }

  function cyclePattern(e) {
    if (e.target.closest('a, button, .bio-modal, .bio-modal *')) return;
    currentPattern = (currentPattern + 1) % 9;
  }

  function boot() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    document.body.classList.add('visuals-ready');

    window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchstart', (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('resize', () => {
      canvas.__lw = 0;
    }, { passive: true });

    document.addEventListener('click', cyclePattern);

    if (reduceMotion) {
      setupCanvas();
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, width, height);
      currentPattern = 1;
      drawDataField(getQuality());
      return;
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();