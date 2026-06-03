/**
 * Benny Yasoto — full-page wave (Glue Records / hard techno)
 * + glitches, strobes, pulsing grid, hero electric title
 */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('visuals-ready');
    return;
  }

  const PTR = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  const BPM = 145;
  const BEAT_SEC = 60 / BPM;
  const IS_MOBILE = () => innerWidth < 768;

  function setPointer(x, y) {
    PTR.x = x;
    PTR.y = y;
    PTR.nx = (x / innerWidth) * 2 - 1;
    PTR.ny = (y / innerHeight) * 2 - 1;
  }

  window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('touchstart', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function fitCanvas(cv, ctx) {
    const dpr = Math.min(devicePixelRatio || 1, IS_MOBILE() ? 1.25 : 1.75);
    const w = innerWidth;
    const h = innerHeight;
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, dpr };
  }

  function kickEnv(phase) {
    return Math.max(0, Math.exp(-phase * 14));
  }

  function distortedSine(x, drive) {
    const s = Math.sin(x);
    return Math.max(-1, Math.min(1, s * drive)) / Math.min(1, drive);
  }

  /* ── Background: waveform + grid + glitch ─────────────────────── */
  function initBg() {
    const cv = document.getElementById('bg-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H;
    let startTime = null;
    let glitchUntil = 0;
    let strobeUntil = 0;
    let sliceUntil = 0;
    let flashUntil = 0;
    let lastBeat = -1;
    let mx = 0.5;
    let my = 0.5;
    let gridT = 0;

    function syncPointer() {
      mx = PTR.x / W;
      my = PTR.y / H;
    }

    function drawPulseGrid(elapsed) {
      const cx = W / 2 + (PTR.nx * W * 0.22);
      const cy = H / 2 + (PTR.ny * H * 0.18);
      const step = Math.max(IS_MOBILE() ? 36 : 28, Math.floor(W / (IS_MOBILE() ? 14 : 18)));
      gridT += 0.028;

      for (let x = step / 2; x < W; x += step) {
        for (let y = step / 2; y < H; y += step) {
          const d = Math.hypot(x - cx, y - cy);
          const wave = Math.sin(gridT * 2.8 - d * 0.018) * 0.5 + 0.5;
          const size = 2.2 * wave + 0.4;
          const al = wave * 0.45 + 0.04;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,224,${al.toFixed(2)})`;
          ctx.fill();
          if (x + step < W) {
            const wave2 = Math.sin(gridT * 2.8 - (d + step * 0.5) * 0.018) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + step, y);
            ctx.strokeStyle = `rgba(255,40,80,${(wave * wave2 * 0.12).toFixed(2)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      for (let ring = 1; ring < (IS_MOBILE() ? 4 : 6); ring++) {
        const r2 = ring * Math.max(W, H) * 0.09 + Math.sin(gridT * 1.8 + ring) * 10;
        const al = Math.max(0, 0.28 - ring * 0.05) * (0.5 + 0.5 * Math.sin(gridT * 2 + ring));
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,224,${al.toFixed(2)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }

    function drawWaveform(beatPhase, elapsed) {
      const cy = H * 0.48 + (my - 0.5) * H * 0.08;
      const kEnv = kickEnv(beatPhase);
      const distDrive = 1 + my * 14 + kEnv * 18 + Math.hypot(PTR.nx, PTR.ny) * 4;
      const freqMult = 1.8 + mx * 5;
      const ampScale = (0.22 + kEnv * 0.5) * H * (IS_MOBILE() ? 0.75 : 1);

      const layers = [
        { freq: freqMult, col: 'rgba(0,255,224,', lw: 2, phase: 0 },
        { freq: freqMult * 0.5, col: 'rgba(255,40,80,', lw: 1.2, phase: Math.PI },
        { freq: freqMult * 2, col: 'rgba(255,255,255,', lw: 0.6, phase: elapsed * 0.7 },
      ];

      const stepPx = IS_MOBILE() ? 3 : 2;
      layers.forEach(({ freq, col, lw, phase: ph }) => {
        ctx.beginPath();
        for (let px = 0; px < W; px += stepPx) {
          const t2 = (px / W) * Math.PI * 2 * freq + elapsed * 4.2 * freq * 0.3 + ph + PTR.nx * 0.8;
          const raw = distortedSine(t2, distDrive);
          const ripple = Math.sin(px * 0.01 + elapsed * 2 + PTR.ny * 2) * 0.5 + 0.5;
          const y = cy + raw * ampScale * (0.45 + ripple * 0.55);
          px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        const al = (0.35 + kEnv * 0.55).toFixed(2);
        ctx.strokeStyle = `${col}${al})`;
        ctx.lineWidth = lw + kEnv * 1.2;
        ctx.stroke();
      });
    }

    function drawKickBurst(beatPhase) {
      const env = kickEnv(beatPhase);
      if (env < 0.04) return;
      const n = Math.floor(4 + env * (IS_MOBILE() ? 8 : 14));
      for (let i = 0; i < n; i++) {
        const x = Math.random() * W;
        const len = (16 + env * H * 0.5) * (0.3 + Math.random() * 0.7);
        const y0 = Math.random() * H;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + len);
        ctx.strokeStyle = `rgba(255,255,255,${(env * (0.35 + Math.random() * 0.45)).toFixed(2)})`;
        ctx.lineWidth = 0.5 + Math.random();
        ctx.stroke();
      }
      const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55);
      grd.addColorStop(0, `rgba(255,40,80,${(env * 0.14).toFixed(2)})`);
      grd.addColorStop(0.4, `rgba(0,255,224,${(env * 0.06).toFixed(2)})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    function drawGlitchSlices(intensity) {
      const n = Math.floor(2 + intensity * (IS_MOBILE() ? 6 : 12));
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H;
        const h2 = 1 + Math.random() * (4 + intensity * 8);
        const shift = (Math.random() - 0.5) * (16 + intensity * W * 0.28);
        try {
          const slice = ctx.getImageData(0, y, W, h2);
          ctx.putImageData(slice, shift, y);
        } catch (_) { /* skip */ }
        ctx.fillStyle = `rgba(0,255,224,${(0.04 + Math.random() * 0.12 * intensity).toFixed(2)})`;
        ctx.fillRect(0, y, W, h2);
      }
    }

    function drawStrobe(intensity) {
      ctx.fillStyle = `rgba(255,255,255,${(intensity * 0.75).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
    }

    function drawNoise(intensity) {
      const n = Math.floor(intensity * (IS_MOBILE() ? 180 : 350));
      for (let i = 0; i < n; i++) {
        const col = Math.random() > 0.55 ? '255,40,80' : '0,255,224';
        ctx.fillStyle = `rgba(${col},${(0.15 + Math.random() * 0.5).toFixed(2)})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
    }

    function draw(ts) {
      requestAnimationFrame(draw);
      ({ w: W, h: H } = fitCanvas(cv, ctx));
      syncPointer();

      if (!startTime) startTime = ts;
      const elapsed = (ts - startTime) / 1000;
      const beatF = elapsed / BEAT_SEC;
      const beatN = Math.floor(beatF);
      const beatPhase = beatF - beatN;

      if (beatN !== lastBeat) {
        lastBeat = beatN;
        const isFour = beatN % 4 === 0;
        const isEight = beatN % 8 === 0;
        glitchUntil = ts + (isFour ? 160 : 50) + Math.random() * 35;
        if (isFour) {
          strobeUntil = ts + 45 + Math.random() * 25;
          flashUntil = ts + 80;
          document.body.classList.add('beat-flash');
          setTimeout(() => document.body.classList.remove('beat-flash'), 90);
        }
        if (isEight) sliceUntil = ts + 100;
      }

      const glitchInt = ts < glitchUntil ? Math.min(1, (glitchUntil - ts) / 160) : 0;
      const bgCyan = kickEnv(beatPhase) * 8;
      const bgMag = kickEnv(beatPhase) * 4;

      ctx.fillStyle = `rgb(${bgMag},${bgCyan * 0.3},${Math.floor(bgCyan * 0.5)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(3,3,8,0.72)';
      ctx.fillRect(0, 0, W, H);

      drawPulseGrid(elapsed);
      drawWaveform(beatPhase, elapsed);
      drawKickBurst(beatPhase);

      if (glitchInt > 0) drawGlitchSlices(glitchInt);
      if (ts < sliceUntil) drawGlitchSlices(0.75 + Math.random() * 0.25);
      drawNoise(0.08 + glitchInt * 0.85 + kickEnv(beatPhase) * 0.35);

      if (ts < strobeUntil) drawStrobe(Math.min(1, (strobeUntil - ts) / 50));

      if (Math.random() < 0.004) {
        ctx.fillStyle = `rgba(0,255,224,${(0.02 + Math.random() * 0.06).toFixed(2)})`;
        ctx.fillRect(0, Math.random() * H, W, Math.random() * 2 + 1);
      }
    }

    window.addEventListener('resize', () => fitCanvas(cv, ctx), { passive: true });
    requestAnimationFrame(draw);
  }

  /* ── Hero title: electric arcs (mouse + touch) ────────────────── */
  function initTitleElectric() {
    const wrap = document.querySelector('.title-wrap');
    const cv = document.getElementById('title-canvas');
    const titleEl = document.getElementById('lcp-title');
    if (!wrap || !cv || !titleEl) return;

    const ctx = cv.getContext('2d');
    let bolts = [];
    let titleRect = null;
    let intensity = 0;

    function measure() {
      const r = wrap.getBoundingClientRect();
      const pad = 40;
      cv.width = Math.floor((r.width + pad * 2) * (devicePixelRatio || 1));
      cv.height = Math.floor((r.height + pad * 2) * (devicePixelRatio || 1));
      cv.style.width = r.width + pad * 2 + 'px';
      cv.style.height = r.height + pad * 2 + 'px';
      ctx.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
      titleRect = {
        x: pad,
        y: pad,
        w: r.width,
        h: r.height,
        cx: pad + r.width / 2,
        cy: pad + r.height / 2,
      };
    }

    function spawnBolt(fromX, fromY, power) {
      const tr = titleRect;
      const targets = [
        [tr.x, tr.y + Math.random() * tr.h],
        [tr.x + tr.w, tr.y + Math.random() * tr.h],
        [tr.x + Math.random() * tr.w, tr.y],
        [tr.x + Math.random() * tr.w, tr.y + tr.h],
        [tr.cx + (Math.random() - 0.5) * tr.w * 0.6, tr.cy + (Math.random() - 0.5) * tr.h * 0.4],
      ];
      const [tx, ty] = targets[Math.floor(Math.random() * targets.length)];
      const segs = [];
      let x = fromX;
      let y = fromY;
      const steps = 6 + Math.floor(Math.random() * 6);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const nx = x + (tx - x) * t + (Math.random() - 0.5) * 28 * power;
        const ny = y + (ty - y) * t + (Math.random() - 0.5) * 22 * power;
        segs.push({ x: nx, y: ny });
        x = nx;
        y = ny;
      }
      bolts.push({
        segs,
        life: 1,
        decay: 0.06 + Math.random() * 0.05,
        hue: Math.random() > 0.4 ? 'cyan' : 'magenta',
      });
    }

    function localPointer() {
      const wr = wrap.getBoundingClientRect();
      const pad = 40;
      return {
        x: PTR.x - wr.left + pad,
        y: PTR.y - wr.top + pad,
      };
    }

    function tick() {
      requestAnimationFrame(tick);
      measure();
      const tr = titleRect;
      const lp = localPointer();
      const dist = Math.hypot(lp.x - tr.cx, lp.y - tr.cy);
      const maxD = Math.max(tr.w, tr.h) * 1.4;
      intensity = Math.max(0, 1 - dist / maxD);

      titleEl.classList.toggle('title--charged', intensity > 0.12);

      ctx.clearRect(0, 0, cv.width, cv.height);

      if (intensity > 0.05) {
        const count = Math.floor(intensity * (IS_MOBILE() ? 3 : 6));
        for (let i = 0; i < count; i++) {
          spawnBolt(lp.x, lp.y, intensity);
        }
      }

      bolts = bolts.filter((b) => {
        b.life -= b.decay;
        if (b.life <= 0) return false;
        const col =
          b.hue === 'cyan'
            ? `rgba(0,255,224,${(b.life * 0.85).toFixed(2)})`
            : `rgba(255,40,80,${(b.life * 0.75).toFixed(2)})`;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1 + b.life * 1.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8 * b.life;
        ctx.beginPath();
        if (b.segs.length) {
          ctx.moveTo(b.segs[0].x, b.segs[0].y);
          b.segs.forEach((p) => ctx.lineTo(p.x, p.y));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        return true;
      });

      if (intensity > 0.35 && Math.random() < intensity * 0.15) {
        ctx.fillStyle = `rgba(255,255,255,${(intensity * 0.08).toFixed(2)})`;
        ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
      }
    }

    window.addEventListener('resize', measure, { passive: true });
    tick();
  }

  function boot() {
    document.body.classList.add('visuals-ready');
    initBg();
    initTitleElectric();
  }

  function schedule() {
    requestAnimationFrame(() => requestAnimationFrame(boot));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();