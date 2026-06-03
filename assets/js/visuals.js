/** Benny Yasoto — lightweight industrial grid background */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function boot() {
    document.body.classList.add('visuals-ready');
    const cv = document.getElementById('bg-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, t = 0;
    const PTR = { x: innerWidth / 2, y: innerHeight / 2 };

    function fit() {
      const dpr = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.25 : 1.5);
      W = cv.width = Math.floor(innerWidth * dpr);
      H = cv.height = Math.floor(innerHeight * dpr);
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    fit();
    window.addEventListener('resize', fit, { passive: true });
    window.addEventListener('mousemove', (e) => {
      PTR.x = e.clientX;
      PTR.y = e.clientY;
    }, { passive: true });

    const step = innerWidth < 768 ? 48 : 32;

    function frame() {
      t += 0.008;
      const w = innerWidth;
      const h = innerHeight;
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      const offX = Math.sin(t * 0.4) * 12 + (PTR.x / w - 0.5) * 24;
      const offY = Math.cos(t * 0.35) * 10 + (PTR.y / h - 0.5) * 20;

      ctx.strokeStyle = 'rgba(0,255,224,0.06)';
      ctx.lineWidth = 1;
      for (let x = -step; x < w + step; x += step) {
        const px = x + offX;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px + offY * 0.3, h);
        ctx.stroke();
      }
      for (let y = -step; y < h + step; y += step) {
        const py = y + offY;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py - offX * 0.2);
        ctx.stroke();
      }

      const g = ctx.createRadialGradient(PTR.x, PTR.y, 0, PTR.x, PTR.y, Math.min(w, h) * 0.35);
      g.addColorStop(0, 'rgba(255,40,80,0.08)');
      g.addColorStop(0.5, 'rgba(0,255,224,0.04)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(frame);
    }
    frame();
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