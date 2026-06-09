/**
 * Benny Yasoto — reactive wave/grid + Prisss-style fractals (red, 145 BPM)
 * Pointer/touch warps all layers. Patterns auto-cycle every 16 beats.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const BPM = 145;
  const TEMPO = BPM / 60;
  const BEAT_SEC = 60 / BPM;
  const WAVE_SCROLL = BPM * 0.078;
  const GRID_STEP = BPM * 0.00048;
  const FADE_OPACITY = 0.04;
  const PULSE_FREQ = TEMPO * 2;
  const FLASH_THRESHOLD = 0.88;
  const GLITCH_FREQ = TEMPO * 4;
  const PATTERN_CYCLE_BEATS = 16;

  const C = {
    main: [255, 40, 80],
    hot: [255, 85, 95],
    deep: [196, 24, 53],
  };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const CSTR = { main: '255,40,80', hot: '255,85,95', deep: '196,24,53' };

  const PERFORMANCE_PRESETS = [
    {
      name: 'low',
      pixelStep: 5,
      maxIterations: 22,
      dataDensity: 55,
      dataDensityMobile: 32,
      barnsleyPoints: 1200,
      dragonIterations: 6,
      spiralDepth: 3,
      glitchSlices: 1,
      glitchNoise: 0.001,
      glitchRows: 2,
      glitchInterval: 480,
      snowflakeIterations: 2,
    },
    {
      name: 'medium',
      pixelStep: 4,
      maxIterations: 32,
      dataDensity: 90,
      dataDensityMobile: 50,
      barnsleyPoints: 2200,
      dragonIterations: 8,
      spiralDepth: 4,
      glitchSlices: 2,
      glitchNoise: 0.002,
      glitchRows: 4,
      glitchInterval: 360,
      snowflakeIterations: 3,
    },
    {
      name: 'high',
      pixelStep: 3,
      maxIterations: 42,
      dataDensity: 120,
      dataDensityMobile: 65,
      barnsleyPoints: 3400,
      dragonIterations: 10,
      spiralDepth: 5,
      glitchSlices: 3,
      glitchNoise: 0.0035,
      glitchRows: 5,
      glitchInterval: 300,
      snowflakeIterations: 4,
    },
  ];

  const performanceState = {
    presetIndex: isMobile ? 0 : 2,
    fpsSample: 60,
    lastTimestamp: performance.now(),
    framesElapsed: 0,
  };

  const TARGET_FPS = isMobile ? 40 : 55;

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let ptrX = 0;
  let ptrY = 0;
  let ptrNX = 0;
  let ptrNY = 0;
  let time = 0;
  let elapsed = 0;
  let currentPattern = 0;
  let lastPatternBeat = -1;
  let lastGlitchTime = performance.now();
  let gridT = 0;
  let reusableImageData = null;

  function getQuality() {
    return PERFORMANCE_PRESETS[performanceState.presetIndex];
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    reusableImageData = null;
    ptrX = width / 2;
    ptrY = height / 2;
    ptrNX = 0;
    ptrNY = 0;
  }

  function setPointer(x, y) {
    if (!width || !height) return;
    ptrX = x;
    ptrY = y;
    ptrNX = (x / width) * 2 - 1;
    ptrNY = (y / height) * 2 - 1;
  }

  function pulseScale() {
    return 1 + 0.3 * Math.abs(Math.sin(time * PULSE_FREQ * Math.PI * 2));
  }

  function kickEnv(phase) {
    return Math.max(0, Math.exp(-phase * 14));
  }

  function distortedSine(x, drive) {
    const d = Math.max(1, drive);
    const s = Math.sin(x);
    return Math.max(-1, Math.min(1, (s * d) / d));
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
    d[idx + 1] = Math.floor(v * 0.2);
    d[idx + 2] = Math.floor(v * 0.3);
    d[idx + 3] = 150 + v / 1.4;
  }

  /* ── Always-on reactive base: grid + waves (pointer-driven) ───── */
  function drawPulseGrid() {
    const cx = width * 0.5 + ptrNX * width * 0.28;
    const cy = height * 0.5 + ptrNY * height * 0.22;
    const step = Math.max(isMobile ? 44 : 32, Math.floor(width / 14));
    gridT += GRID_STEP;

    for (let x = step / 2; x < width; x += step) {
      for (let y = step / 2; y < height; y += step) {
        const d = Math.hypot(x - cx, y - cy);
        const wave = Math.sin(gridT * 2.8 - d * 0.018) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 2.8 * wave + 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CSTR.main},${(wave * 0.6 + 0.15).toFixed(2)})`;
        ctx.fill();
        if (x + step < width) {
          const w2 = Math.sin(gridT * 2.8 - (d + step * 0.5) * 0.018) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + step, y);
          ctx.strokeStyle = `rgba(${CSTR.deep},${(wave * w2 * 0.28).toFixed(2)})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }

    for (let ring = 1; ring < 5; ring++) {
      const r = ring * Math.max(width, height) * 0.085 + Math.sin(gridT * 1.8 + ring) * 14;
      const al = Math.max(0, 0.38 - ring * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${CSTR.main},${al.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawWaveform(beatPhase) {
    const mx = ptrX / width;
    const my = ptrY / height;
    const cy = height * 0.5 + (my - 0.5) * height * 0.14;
    const kEnv = kickEnv(beatPhase);
    const drive = 1 + my * 14 + kEnv * 18;
    const freq = 1.6 + mx * 4.5;
    const amp = (0.32 + kEnv * 0.58) * height * 0.44;

    const layers = [
      { freq, col: `rgba(${CSTR.main},`, lw: 2.8 },
      { freq: freq * 0.5, col: `rgba(${CSTR.deep},`, lw: 1.6 },
      { freq: freq * 1.8, col: `rgba(${CSTR.hot},`, lw: 1 },
    ];

    layers.forEach((layer, li) => {
      ctx.beginPath();
      for (let px = 0; px <= width; px += 2) {
        const t2 =
          (px / width) * Math.PI * 2 * layer.freq +
          elapsed * WAVE_SCROLL * layer.freq +
          beatPhase * Math.PI * 2 +
          ptrNX * 0.8 +
          li * 0.5;
        const y = cy + distortedSine(t2, drive) * amp;
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      const al = 0.6 + kEnv * 0.38;
      ctx.strokeStyle = `${layer.col}${al})`;
      ctx.lineWidth = layer.lw + kEnv;
      ctx.stroke();
    });
  }

  function drawKickBurst(beatPhase) {
    const env = kickEnv(beatPhase);
    if (env < 0.05) return;
    const m = isMobile ? 0.5 : 0.8;
    const g = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.52);
    g.addColorStop(0, `rgba(${CSTR.main},${(env * 0.14 * m).toFixed(2)})`);
    g.addColorStop(0.35, `rgba(${CSTR.deep},${(env * 0.07 * m).toFixed(2)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  /* ── Fractal patterns (pointer-reactive, auto-cycle) ──────────── */
  function drawDataStream(quality) {
    const base = isMobile ? quality.dataDensityMobile : quality.dataDensity;
    const density = base + ptrX / width * base * 0.5;
    const speed = 9 + (ptrY / height) * 20;
    ctx.font = `${13 + pulseScale() * 9}px monospace`;
    for (let i = 0; i < density; i++) {
      const x = Math.random() * width;
      const y = (Math.random() * height + time * speed) % height;
      const bits = (Math.random() > 0.5 ? '1' : '0').repeat(8 + Math.floor(Math.random() * 14));
      const col = Math.random() > 0.5 ? C.hot : C.main;
      ctx.fillStyle = rgba(col, 0.45 + Math.sin(time + i) * 0.25);
      ctx.fillText(bits, x, y);
    }
  }

  function drawDataField(quality) {
    const id = acquireImageData();
    const d = id.data;
    const step = quality.pixelStep;
    const maxIter = Math.round(quality.maxIterations + (ptrY / height) * 10);
    const zoom = 1.15 + (ptrX / width) * 0.6 + 0.25 * Math.sin(time * PULSE_FREQ);
    const cX = -0.75 + (ptrX / width) * 0.3;
    const cY = 0.2 + (ptrY / height) * 0.18;
    const ox = ptrNX * 0.12;
    const oy = ptrNY * 0.1;

    for (let px = 0; px < width; px += step) {
      for (let py = 0; py < height; py += step) {
        let x = (px + step * 0.5 - width / 2) / (0.5 * zoom * width) + ox;
        let y = (py + step * 0.5 - height / 2) / (0.5 * zoom * height) + oy;
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
    ctx.rotate(rotation + Math.sin(time * TEMPO) * 0.35);
    for (let i = 0; i < depth; i++) {
      const len = 60 + i * 28 * pulseScale();
      const aStep = (Math.PI * 2) / segments;
      for (let j = 0; j < segments; j++) {
        const a = j * aStep + Math.cos(time + i) * 0.18;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = rgba(i % 2 ? C.deep : C.main, 0.5 - (i / depth) * 0.38);
        ctx.lineWidth = 1.4 + pulseScale() * 2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBinaryTriangle(ox, oy, size, depth) {
    ctx.fillStyle = rgba(C.main, 0.8);
    ctx.strokeStyle = rgba(C.hot, 0.6);
    ctx.lineWidth = pulseScale() * 1.4;
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
    const size = Math.min(width, height) * 0.28;
    const maxLevel = quality.spiralDepth + Math.floor((ptrX / width) * 2);
    const scale = 0.78 + (ptrY / height) * 0.1;
    const spread = 0.18 + (ptrX / width) * 0.18 + Math.sin(time) * 0.08;
    const sides = Math.max(3, Math.floor(3 + (ptrY / height) * 3));
    ctx.strokeStyle = rgba(C.main, 0.82);
    ctx.fillStyle = rgba(C.hot, 0.82);
    ctx.lineWidth = Math.max(1.2, 3.5 * pulseScale());

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
      ctx.arc(size * 1.05, 0, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    const ox = width / 2 + ptrNX * width * 0.06;
    const oy = height / 2 + ptrNY * height * 0.05;
    ctx.save();
    ctx.translate(ox, oy);
    for (let i = 0; i < sides; i++) {
      ctx.rotate((Math.PI * 2) / sides + time * 0.1);
      branch(0);
    }
    ctx.restore();
  }

  function drawMandelbrot(quality) {
    const id = acquireImageData();
    const d = id.data;
    const step = quality.pixelStep;
    const maxIter = Math.round(quality.maxIterations + (ptrY / height) * 8);
    const zoom = 1.2 + (ptrX / width) * 0.55 + 0.25 * Math.sin(time * PULSE_FREQ);
    const panX = ptrNX * 0.35;
    const panY = ptrNY * 0.35;

    for (let px = 0; px < width; px += step) {
      for (let py = 0; py < height; py += step) {
        let x0 = (px + step * 0.5 - width / 2) / (0.25 * zoom * width) + panX - 0.5;
        let y0 = (py + step * 0.5 - height / 2) / (0.25 * zoom * height) + panY;
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
    ctx.strokeStyle = rgba(C.main, 0.82);
    ctx.lineWidth = Math.max(1.4, 1.8 * pulseScale());
    ctx.beginPath();
    const ox = width / 2 + ptrNX * width * 0.08;
    const oy = height / 2 + ptrNY * height * 0.06;
    let x = ox;
    let y = oy;
    let angle = time * 0.15;
    const len = 4 + (ptrY / height) * 8;
    const iters = Math.min(11, quality.dragonIterations + Math.floor((ptrX / width) * 3));
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
    ctx.fillStyle = rgba(C.main, 0.78);
    let x = 0;
    let y = 0;
    for (let i = 0; i < quality.barnsleyPoints; i++) {
      const r = Math.random();
      let nx;
      let ny;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; }
      else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
      else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
      else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      x = nx;
      y = ny;
      const px2 = width / 2 + x * 48 + ptrNX * 80;
      const py2 = height - y * 48 - (ptrY / height) * 90;
      ctx.fillRect(px2, py2, 1.2, 1.2);
    }
  }

  function drawKochSnowflake(quality) {
    ctx.strokeStyle = rgba(C.hot, 0.82);
    ctx.lineWidth = 1.2;
    const size = Math.min(width, height) * 0.28;
    const iters = Math.max(1, Math.min(4, quality.snowflakeIterations + Math.floor((ptrX / width) * 1.5)));
    const angle = time * 0.1;
    const cx = width / 2 + ptrNX * width * 0.05;
    const cy = height / 2 + ptrNY * height * 0.04;

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

    for (let i = 0; i < 3; i++) {
      const a1 = angle + (i * 2 * Math.PI) / 3;
      const a2 = angle + ((i + 1) * 2 * Math.PI) / 3;
      koch(cx + size * Math.cos(a1), cy + size * Math.sin(a1), cx + size * Math.cos(a2), cy + size * Math.sin(a2), iters);
    }
  }

  function applyGlitch(quality) {
    const now = performance.now();
    if (now - lastGlitchTime < quality.glitchInterval) return;
    lastGlitchTime = now;
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let s = 0; s < quality.glitchSlices; s++) {
        const sliceY = Math.floor(Math.random() * height);
        const sliceH = Math.floor(8 + Math.random() * 16);
        const shift = Math.floor(-28 + Math.random() * 56);
        for (let y = sliceY; y < sliceY + sliceH && y < height; y++) {
          for (let x = 0; x < width; x++) {
            const oi = (y * width + x) * 4;
            const nx = (x + shift + width) % width;
            const ni = (y * width + nx) * 4;
            data[ni] = data[oi];
            data[ni + 1] = data[oi + 1];
            data[ni + 2] = data[oi + 2];
            data[ni + 3] = data[oi + 3];
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (_) { /* skip if security/taint */ }
  }

  function drawFractalPattern(quality) {
    switch (currentPattern) {
      case 0: drawDataStream(quality); break;
      case 1: drawDataField(quality); break;
      case 2: {
        const count = (quality.name === 'high' ? 4 : 3) + Math.floor((ptrY / height) * 2);
        const segments = Math.max(10, Math.floor(12 + (ptrX / width) * 12));
        const depth = Math.min(9, quality.spiralDepth + 4);
        for (let i = 0; i < count; i++) {
          const x = width / 2 + ptrNX * width * 0.12 + Math.sin(time * TEMPO + i) * width * 0.16;
          const y = height / 2 + ptrNY * height * 0.1 + Math.cos(time * TEMPO + i) * height * 0.16;
          drawDataPath(x, y, segments, depth, (time * TEMPO) / 2);
        }
        break;
      }
      case 3: {
        const size = height * 0.42 + (ptrY / height) * height * 0.2;
        const offsetX = width / 2 - size / 2 + ptrNX * 30;
        const offsetY = height / 2 + size * 0.26 + ptrNY * 20;
        drawBinaryTriangle(offsetX, offsetY, size, quality.spiralDepth + 2);
        ctx.save();
        ctx.translate(width / 2 + ptrNX * 20, height / 2 + ptrNY * 15);
        ctx.rotate((time * TEMPO) / 3);
        ctx.translate(-width / 2, -height / 2);
        drawBinaryTriangle(offsetX, offsetY, size * 0.68, quality.spiralDepth + 1);
        ctx.restore();
        break;
      }
      case 4: drawSpiralPattern(quality); break;
      case 5: drawMandelbrot(quality); break;
      case 6: drawDragonCurve(quality); break;
      case 7: drawBarnsleyFern(quality); break;
      case 8: drawKochSnowflake(quality); break;
      default: break;
    }
  }

  function maybeCyclePattern(beatN) {
    const bar = Math.floor(beatN / PATTERN_CYCLE_BEATS);
    if (bar !== lastPatternBeat) {
      lastPatternBeat = bar;
      currentPattern = (currentPattern + 1) % 9;
    }
  }

  function manualCycle(e) {
    if (e.target.closest('a, button, .site-modal, .site-modal *')) return;
    currentPattern = (currentPattern + 1) % 9;
    lastPatternBeat = Math.floor(Math.floor(elapsed / BEAT_SEC) / PATTERN_CYCLE_BEATS);
  }

  function animate(timestamp) {
    requestAnimationFrame(animate);
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
      if (fps < TARGET_FPS - 8 && performanceState.presetIndex > 0) performanceState.presetIndex -= 1;
      else if (fps > TARGET_FPS + 10 && performanceState.presetIndex < PERFORMANCE_PRESETS.length - 1) performanceState.presetIndex += 1;
    }

    const quality = getQuality();
    time += delta * 0.00125;
    elapsed += delta / 1000;

    const beatPhase = (elapsed / BEAT_SEC) % 1;
    const beatN = Math.floor(elapsed / BEAT_SEC);
    maybeCyclePattern(beatN);

    ctx.fillStyle = `rgba(3, 3, 8, ${FADE_OPACITY})`;
    ctx.fillRect(0, 0, width, height);

    drawPulseGrid();
    drawWaveform(beatPhase);
    drawKickBurst(beatPhase);

    if (Math.sin(time * PULSE_FREQ * Math.PI * 2) > FLASH_THRESHOLD) {
      ctx.fillStyle = rgba(C.main, 0.12);
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalAlpha = 0.72;
    drawFractalPattern(quality);
    ctx.globalAlpha = 1;

    if (quality.name !== 'low' && Math.sin(time * GLITCH_FREQ * Math.PI * 2) > 0.94) {
      applyGlitch(quality);
    }
  }

  function boot() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    document.body.classList.add('visuals-ready');
    resizeCanvas();

    window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('click', manualCycle);

    if (reduceMotion) {
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, width, height);
      drawPulseGrid();
      drawWaveform(0);
      currentPattern = 1;
      drawFractalPattern(getQuality());
      return;
    }

    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, width, height);
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();