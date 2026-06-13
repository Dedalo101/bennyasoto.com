/**
 * Benny Yasoto — full-viewport oscilloscope engine (145 BPM)
 * Ports GlueRecords #c-benny tile aesthetic: waveform, kick bursts, glitch, scanlines.
 */
(function () {
  'use strict';

  const reduceMotion =
    !window.__VISUALS_FORCE_ANIM__ &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

  const BPM = 145;
  const BEAT_SEC = 60 / BPM;
  const STROBE_MS = 60;

  const PERFORMANCE_PRESETS = [
    { name: 'low', noiseScale: 200 },
    { name: 'medium', noiseScale: 320 },
    { name: 'high', noiseScale: 400 },
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
  let elapsed = 0;
  let lastBeat = -1;
  let glitchUntil = 0;
  let strobeUntil = 0;
  let sliceUntil = 0;

  function getQuality() {
    return PERFORMANCE_PRESETS[performanceState.presetIndex];
  }

  function kickEnv(phase) {
    return Math.max(0, Math.exp(-phase * 14));
  }

  function distortedSine(x, drive) {
    const s = Math.sin(x);
    return Math.max(-1, Math.min(1, s * drive)) / Math.min(1, drive);
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
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

  function drawBackground(beatPhase) {
    const k = kickEnv(beatPhase);
    const bgR = Math.floor(3 + k * 15);
    const bgB = Math.floor(8 * (1 - k));
    ctx.fillStyle = `rgb(${bgR},0,${bgB})`;
    ctx.fillRect(0, 0, width, height);
  }

  function drawWaveform(beatPhase, elapsedSec) {
    const mx = ptrX / width;
    const my = ptrY / height;
    const cy = height * 0.5;
    const kEnv = kickEnv(beatPhase);
    const distDrive = 1 + my * 18 + kEnv * 22;
    const freqMult = 2 + mx * 6;
    const ampScale = (0.28 + kEnv * 0.55) * height;

    const layers = [
      { freq: freqMult, col: 'rgba(255,20,20,', lw: 2.2, phase: 0 },
      { freq: freqMult * 0.5, col: 'rgba(255,255,255,', lw: 0.8, phase: Math.PI },
      { freq: freqMult * 2, col: 'rgba(180,0,0,', lw: 0.5, phase: elapsedSec * 0.7 },
    ];

    layers.forEach(({ freq, col, lw, phase: ph }) => {
      ctx.beginPath();
      for (let px = 0; px <= width; px += 2) {
        const t2 = (px / width) * Math.PI * 2 * freq + elapsedSec * 4.2 * freq * 0.3 + ph;
        const raw = distortedSine(t2, distDrive);
        const y = cy + raw * ampScale * (0.5 + Math.sin(px * 0.012 + elapsedSec) * 0.5);
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      const al = (0.6 + kEnv * 0.4).toFixed(2);
      ctx.strokeStyle = `${col}${al})`;
      ctx.lineWidth = lw + kEnv * 1.5;
      ctx.stroke();
    });
  }

  function drawKickBurst(beatPhase) {
    const env = kickEnv(beatPhase);
    if (env < 0.04) return;
    const n = Math.floor(6 + env * 14);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * width;
      const len = (20 + env * height * 0.7) * (0.3 + Math.random() * 0.7);
      const y0 = Math.random() * height;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + len);
      ctx.strokeStyle = `rgba(255,255,255,${(env * (0.4 + Math.random() * 0.5)).toFixed(2)})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.2;
      ctx.stroke();
    }
    const grd = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    grd.addColorStop(0, `rgba(255,0,0,${(env * 0.22).toFixed(2)})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGlitchSlices(intensity) {
    const n = Math.floor(2 + intensity * 12);
    for (let i = 0; i < n; i++) {
      const y = Math.random() * height;
      const h2 = 1 + Math.random() * (4 + intensity * 8);
      const shift = (Math.random() - 0.5) * (20 + intensity * width * 0.35);
      try {
        const slice = ctx.getImageData(0, y, width, h2);
        ctx.putImageData(slice, shift, y);
      } catch (_) {
        /* canvas readback unavailable */
      }
      ctx.fillStyle = `rgba(255,0,0,${(0.05 + Math.random() * 0.15 * intensity).toFixed(2)})`;
      ctx.fillRect(0, y, width, h2);
    }
  }

  function drawStrobe(intensity) {
    ctx.fillStyle = `rgba(255,255,255,${(intensity * 0.85).toFixed(2)})`;
    ctx.fillRect(0, 0, width, height);
  }

  function drawScanlines() {
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, y, width, 1);
    }
  }

  function drawNoise(intensity, quality) {
    const scale = isMobile ? quality.noiseScale * 0.5 : quality.noiseScale;
    const n = Math.floor(intensity * scale);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const v = Math.random();
      ctx.fillStyle =
        v > 0.7
          ? `rgba(255,0,0,${(0.4 + Math.random() * 0.6).toFixed(2)})`
          : `rgba(255,255,255,${(Math.random() * 0.4).toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function drawBpmWatermark() {
    ctx.font = `bold ${Math.max(9, width * 0.028)}px 'Share Tech Mono',monospace`;
    ctx.fillStyle = 'rgba(255,0,0,0.18)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${BPM} BPM`, width - 10, 10);
    ctx.textAlign = 'left';
  }

  function triggerBeatEffects(now, beatN) {
    if (isMobile) return;
    const isFourBeat = beatN % 4 === 0;
    const isEightBeat = beatN % 8 === 0;

    glitchUntil = now + (isFourBeat ? 180 : 55) + Math.random() * 40;

    if (isFourBeat) {
      // Photosensitivity: strobe capped at 60ms per flash
      strobeUntil = now + STROBE_MS;
    }

    if (isEightBeat) {
      sliceUntil = now + 120;
    }
  }

  function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!width || !height || document.hidden) return;

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
      else if (fps > TARGET_FPS + 10 && performanceState.presetIndex < PERFORMANCE_PRESETS.length - 1) {
        performanceState.presetIndex += 1;
      }
    }

    const quality = getQuality();
    elapsed += delta / 1000;

    const beatF = elapsed / BEAT_SEC;
    const beatN = Math.floor(beatF);
    const beatPhase = beatF - beatN;

    if (beatN !== lastBeat) {
      lastBeat = beatN;
      triggerBeatEffects(now, beatN);
    }

    const isGlitching = !isMobile && now < glitchUntil;
    const isStrobing = !isMobile && now < strobeUntil;
    const isSlicing = !isMobile && now < sliceUntil;
    const glitchInt = isGlitching ? Math.min(1, (glitchUntil - now) / 180) : 0;

    drawBackground(beatPhase);
    drawWaveform(beatPhase, elapsed);
    drawKickBurst(beatPhase);

    if (isGlitching) drawGlitchSlices(glitchInt);
    if (isSlicing) drawGlitchSlices(0.8 + Math.random() * 0.2);

    drawNoise(0.1 + glitchInt * 0.9 + kickEnv(beatPhase) * 0.4, quality);
    if (!isMobile) drawScanlines();

    if (isStrobing) drawStrobe(Math.min(1, (strobeUntil - now) / STROBE_MS));

    drawBpmWatermark();
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
    document.addEventListener('touchmove', (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('resize', resizeCanvas, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resizeCanvas, { passive: true });
    }

    if (reduceMotion) {
      drawBackground(0);
      drawWaveform(0, 0);
      drawBpmWatermark();
      return;
    }

    ctx.fillStyle = 'rgb(3,0,8)';
    ctx.fillRect(0, 0, width, height);
    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();