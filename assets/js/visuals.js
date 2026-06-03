/**
 * Benny Yasoto — wave + grid + glitch (Glue Records style)
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PTR = { x: window.innerWidth / 2, y: window.innerHeight / 2, nx: 0, ny: 0 };
  const BPM = 145;
  const BEAT_SEC = 60 / BPM;
  /** Wave scroll rate — one visual cycle ≈ quarter-note at 145 BPM */
  const WAVE_SCROLL = BPM * 0.078;
  const GRID_STEP = BPM * 0.00048;
  const C = { main: '255,40,80', hot: '255,85,95', deep: '196,24,53' };

  function setPointer(x, y) {
    PTR.x = x;
    PTR.y = y;
    PTR.nx = (x / window.innerWidth) * 2 - 1;
    PTR.ny = (y / window.innerHeight) * 2 - 1;
  }

  window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function isMobile() {
    return window.innerWidth < 768;
  }

  function setupCanvas(cv, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (cv.__lw !== w || cv.__lh !== h || cv.__ldpr !== dpr) {
      cv.__lw = w;
      cv.__lh = h;
      cv.__ldpr = dpr;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function kickEnv(phase) {
    return Math.max(0, Math.exp(-phase * 14));
  }

  function distortedSine(x, drive) {
    const d = Math.max(1, drive);
    const s = Math.sin(x);
    return Math.max(-1, Math.min(1, (s * d) / d));
  }

  /* ── Background ─────────────────────────────────────────────────── */
  function initBg() {
    const cv = document.getElementById('bg-canvas');
    if (!cv) return null;
    const ctx = cv.getContext('2d', { alpha: true });
    if (!ctx) return null;

    let W = 0;
    let H = 0;
    let startTime = null;
    let glitchUntil = 0;
    let strobeUntil = 0;
    let lastBeat = -1;
    let gridT = 0;

    function drawPulseGrid(elapsed) {
      const cx = W * 0.5 + PTR.nx * W * 0.22;
      const cy = H * 0.5 + PTR.ny * H * 0.18;
      const step = Math.max(isMobile() ? 40 : 30, Math.floor(W / 16));
      gridT += GRID_STEP;

      for (let x = step / 2; x < W; x += step) {
        for (let y = step / 2; y < H; y += step) {
          const d = Math.hypot(x - cx, y - cy);
          const wave = Math.sin(gridT * 2.8 - d * 0.018) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 2.5 * wave + 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${C.main},${(wave * 0.55 + 0.12).toFixed(2)})`;
          ctx.fill();
          if (x + step < W) {
            const w2 = Math.sin(gridT * 2.8 - (d + step * 0.5) * 0.018) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + step, y);
            ctx.strokeStyle = `rgba(${C.deep},${(wave * w2 * 0.22).toFixed(2)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (let ring = 1; ring < 5; ring++) {
        const r = ring * Math.max(W, H) * 0.08 + Math.sin(gridT * 1.8 + ring) * 12;
        const al = Math.max(0, 0.35 - ring * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${C.main},${al.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawWaveform(beatPhase, elapsed) {
      const mx = PTR.x / W;
      const my = PTR.y / H;
      const cy = H * 0.5 + (my - 0.5) * H * 0.1;
      const kEnv = kickEnv(beatPhase);
      const drive = 1 + my * 12 + kEnv * 16;
      const freq = 1.6 + mx * 4;
      const amp = (0.28 + kEnv * 0.55) * H * 0.42;

      const layers = [
        { freq, col: `rgba(${C.main},`, lw: 2.5 },
        { freq: freq * 0.5, col: `rgba(${C.deep},`, lw: 1.5 },
        { freq: freq * 1.8, col: `rgba(${C.hot},`, lw: 0.8 },
      ];

      layers.forEach((layer, li) => {
        ctx.beginPath();
        for (let px = 0; px <= W; px += 2) {
          const t2 =
            (px / W) * Math.PI * 2 * layer.freq +
            elapsed * WAVE_SCROLL * layer.freq +
            beatPhase * Math.PI * 2 +
            PTR.nx * 0.6 +
            li * 0.5;
          const y = cy + distortedSine(t2, drive) * amp;
          px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        const al = 0.55 + kEnv * 0.4;
        ctx.strokeStyle = `${layer.col}${al})`;
        ctx.lineWidth = layer.lw + kEnv;
        ctx.stroke();
      });
    }

    function drawKickBurst(beatPhase) {
      const env = kickEnv(beatPhase);
      if (env < 0.05) return;
      const m = isMobile() ? 0.45 : 0.75;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.5);
      g.addColorStop(0, `rgba(${C.main},${(env * 0.12 * m).toFixed(2)})`);
      g.addColorStop(0.35, `rgba(${C.deep},${(env * 0.06 * m).toFixed(2)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawGlitch(intensity) {
      const scale = isMobile() ? 0.35 : 0.55;
      const n = 1 + Math.floor(intensity * 3 * scale);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H;
        const h2 = 1 + Math.random() * 3;
        const shift = (Math.random() - 0.5) * 18 * intensity * scale;
        ctx.fillStyle = `rgba(${C.main},${(0.03 + Math.random() * 0.06 * intensity).toFixed(2)})`;
        ctx.fillRect(shift, y, W, h2);
        ctx.fillStyle = `rgba(${C.hot},${(0.02 + Math.random() * 0.04 * intensity).toFixed(2)})`;
        ctx.fillRect(-shift * 0.5, y + 1, W, 1);
      }
    }

    function draw(ts) {
      requestAnimationFrame(draw);
      ({ w: W, h: H } = setupCanvas(cv, ctx));
      if (!W || !H) return;

      if (!startTime) startTime = ts;
      const elapsed = (ts - startTime) / 1000;
      const beatPhase = (elapsed / BEAT_SEC) % 1;
      const beatN = Math.floor(elapsed / BEAT_SEC);

      if (beatN !== lastBeat) {
        lastBeat = beatN;
        const bar = beatN % 16 === 0;
        const flashBar = isMobile() ? beatN % 16 === 0 : beatN % 8 === 0;
        if (bar) glitchUntil = ts + (isMobile() ? 50 : 70);
        if (flashBar && !isMobile()) {
          strobeUntil = ts + 22;
          document.body.classList.add('beat-flash');
          setTimeout(() => document.body.classList.remove('beat-flash'), 45);
        }
      }

      const glitchInt =
        ts < glitchUntil ? Math.min(0.5, (glitchUntil - ts) / 80) * (isMobile() ? 0.4 : 0.65) : 0;

      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, W, H);

      drawPulseGrid(elapsed);
      drawWaveform(beatPhase, elapsed);
      drawKickBurst(beatPhase);

      if (glitchInt > 0) drawGlitch(glitchInt);

      if (ts < strobeUntil && !isMobile()) {
        const dur = 22;
        const a = 0.1 * (1 - (ts - (strobeUntil - dur)) / dur);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, a).toFixed(2)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    if (!reduceMotion) {
      requestAnimationFrame(draw);
    } else {
      ({ w: W, h: H } = setupCanvas(cv, ctx));
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, W, H);
      drawWaveform(0, 0);
      drawPulseGrid(0);
    }

    window.addEventListener('resize', () => {
      cv.__lw = 0;
    }, { passive: true });

    return cv;
  }

  /* ── Title electric ───────────────────────────────────────────── */
  function initTitleElectric() {
    const wrap = document.querySelector('.title-wrap');
    const cv = document.getElementById('title-canvas');
    const titleEl = document.getElementById('lcp-title');
    if (!wrap || !cv || !titleEl || reduceMotion) return;

    const ctx = cv.getContext('2d');
    let bolts = [];
    let lastSize = '';

    function layout() {
      const r = wrap.getBoundingClientRect();
      const pad = 48;
      const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (key === lastSize && key !== '0x0') return { r, pad, key };
      lastSize = key;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.floor((r.width + pad * 2) * dpr));
      cv.height = Math.max(1, Math.floor((r.height + pad * 2) * dpr));
      cv.style.width = r.width + pad * 2 + 'px';
      cv.style.height = r.height + pad * 2 + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { r, pad, key };
    }

    function addBolt(lp, rect, pad, power) {
      const tx = pad + Math.random() * rect.width;
      const ty = pad + Math.random() * rect.height;
      const segs = [{ x: lp.x, y: lp.y }];
      const steps = 5 + Math.floor(Math.random() * 5);
      let x = lp.x;
      let y = lp.y;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        x = x + (tx - x) * t + (Math.random() - 0.5) * 24 * power;
        y = y + (ty - y) * t + (Math.random() - 0.5) * 18 * power;
        segs.push({ x, y });
      }
      bolts.push({ segs, life: 1, hue: Math.random() > 0.45 ? 0 : 1 });
    }

    function tick() {
      requestAnimationFrame(tick);
      const laid = layout();
      if (!laid || laid.r.width < 10) return;

      const { r, pad } = laid;
      const wr = wrap.getBoundingClientRect();
      const lp = { x: PTR.x - wr.left + pad, y: PTR.y - wr.top + pad };
      const cx = pad + r.width / 2;
      const cy = pad + r.height / 2;
      const dist = Math.hypot(lp.x - cx, lp.y - cy);
      const intensity = Math.max(0, 1 - dist / (Math.max(r.width, r.height) * 1.2));

      titleEl.classList.toggle('title--charged', intensity > 0.1);

      ctx.clearRect(0, 0, cv.width, cv.height);

      if (intensity > 0.08) {
        const n = 1 + Math.floor(intensity * 5);
        for (let i = 0; i < n; i++) addBolt(lp, r, pad, intensity);
      }

      bolts = bolts.filter((b) => {
        b.life -= 0.07;
        if (b.life <= 0) return false;
        const col = b.hue
          ? `rgba(${C.deep},${(b.life * 0.9).toFixed(2)})`
          : `rgba(${C.main},${(b.life * 0.95).toFixed(2)})`;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2 + b.life * 2;
        ctx.beginPath();
        b.segs.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        return true;
      });
    }

    tick();
  }

  function boot() {
    document.body.classList.add('visuals-ready');
    try {
      initBg();
      initTitleElectric();
    } catch (err) {
      console.error('[Benny Yasoto visuals]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();