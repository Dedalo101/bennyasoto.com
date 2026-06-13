/**
 * Benny Yasoto — audio-synced oscilloscope engine (145 BPM)
 * Waveform + kick follow playback; Mixcloud fallback if local MP3 is missing.
 */
(function () {
  'use strict';

  const reduceEffects =
    !window.__VISUALS_FORCE_ANIM__ &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

  const BPM = 145;
  const BEAT_SEC = 60 / BPM;
  const STROBE_MS = 60;
  const AUDIO_SRC = 'assets/audio/benny-yasoto.mp3';
  const MIXCLOUD_FEED = '/forzinvalves/benny-yasoto-mor-club-30-12-2012/';

  const PERFORMANCE_PRESETS = [
    { name: 'low', noiseScale: 200 },
    { name: 'medium', noiseScale: 320 },
    { name: 'high', noiseScale: 400 },
  ];

  const performanceState = {
    presetIndex: isMobile ? 0 : 2,
    fpsSample: 60,
    lastTimestamp: 0,
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
  let wallElapsed = 0;
  let lastBeat = -1;
  let glitchUntil = 0;
  let strobeUntil = 0;
  let sliceUntil = 0;
  let audioBass = 0;
  let audioMode = 'clock';
  let audioPlaying = false;
  let unlocked = false;
  let unlockEl = null;

  let audioEl = null;
  let audioCtx = null;
  let analyser = null;
  let freqData = null;
  let mixWidget = null;
  let mixPosition = 0;

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

  function injectUnlockStyles() {
    if (document.getElementById('visuals-unlock-style')) return;
    const style = document.createElement('style');
    style.id = 'visuals-unlock-style';
    style.textContent = [
      '.audio-unlock {',
      '  position: fixed; inset: 0; z-index: 200;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: rgba(3, 3, 8, 0.72);',
      '  border: 0; cursor: pointer; padding: 0;',
      '  font-family: "Share Tech Mono", ui-monospace, monospace;',
      '  letter-spacing: 0.35em; text-transform: uppercase;',
      '  color: #ff3355; font-size: clamp(11px, 2.5vw, 14px);',
      '}',
      '.audio-unlock span {',
      '  border: 1px solid rgba(255, 51, 85, 0.45);',
      '  padding: 14px 22px; background: rgba(3, 3, 8, 0.9);',
      '}',
      '.audio-unlock.is-hidden { display: none; }',
      '#mixcloud-player {',
      '  position: fixed; bottom: 12px; right: 12px; width: min(340px, 92vw);',
      '  height: 60px; border: 0; z-index: 50; opacity: 0.9;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function showUnlock() {
    if (unlockEl || unlocked) return;
    injectUnlockStyles();
    unlockEl = document.createElement('button');
    unlockEl.type = 'button';
    unlockEl.className = 'audio-unlock';
    unlockEl.setAttribute('aria-label', 'Iniciar audio y visuales');
    unlockEl.innerHTML = '<span>Pulsa para entrar · 145 BPM</span>';
    unlockEl.addEventListener('click', unlockExperience, { once: true });
    document.body.appendChild(unlockEl);
  }

  function hideUnlock() {
    unlocked = true;
    if (unlockEl) unlockEl.classList.add('is-hidden');
  }

  function loadMixcloudScript() {
    return new Promise((resolve) => {
      if (window.Mixcloud) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://widget.mixcloud.com/media/js/widgetApi.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function initMixcloud() {
    return loadMixcloudScript().then(() => {
      if (!window.Mixcloud) return false;
      let iframe = document.getElementById('mixcloud-player');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'mixcloud-player';
        iframe.title = 'Benny Yasoto — Mixcloud';
        iframe.src =
          'https://www.mixcloud.com/widget/iframe/?feed=' +
          encodeURIComponent(MIXCLOUD_FEED) +
          '&hide_cover=1&mini=1';
        iframe.allow = 'autoplay';
        document.body.appendChild(iframe);
      }
      mixWidget = window.Mixcloud.PlayerWidget(iframe);
      return mixWidget.ready.then(() => {
        audioMode = 'mixcloud';
        return true;
      });
    });
  }

  function initFileAudio() {
    return new Promise((resolve) => {
      audioEl = document.createElement('audio');
      audioEl.id = 'site-audio';
      audioEl.src = AUDIO_SRC;
      audioEl.loop = true;
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'auto';
      audioEl.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(audioEl);

      const onReady = () => {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) {
            audioMode = 'file';
            resolve(true);
            return;
          }
          audioCtx = new Ctx();
          const source = audioCtx.createMediaElementSource(audioEl);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.82;
          freqData = new Uint8Array(analyser.frequencyBinCount);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          audioMode = 'file';
          resolve(true);
        } catch (_) {
          audioMode = 'file';
          resolve(true);
        }
      };

      audioEl.addEventListener('canplaythrough', onReady, { once: true });
      audioEl.addEventListener(
        'error',
        () => {
          audioEl.remove();
          audioEl = null;
          resolve(false);
        },
        { once: true }
      );
      audioEl.load();
    });
  }

  function readAnalyser() {
    if (!analyser || !freqData) return;
    analyser.getByteFrequencyData(freqData);
    let bass = 0;
    const bins = Math.min(16, freqData.length);
    for (let i = 0; i < bins; i++) bass += freqData[i];
    audioBass = bass / (bins * 255);
  }

  function pollMixPosition() {
    if (!mixWidget) return;
    mixWidget.getPosition((pos) => {
      mixPosition = pos;
    });
  }

  async function tryAutoplay() {
    if (audioMode === 'file' && audioEl) {
      if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
      try {
        await audioEl.play();
        audioPlaying = true;
        hideUnlock();
        return true;
      } catch (_) {
        return false;
      }
    }
    if (audioMode === 'mixcloud' && mixWidget) {
      try {
        mixWidget.play();
        audioPlaying = true;
        hideUnlock();
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  async function unlockExperience() {
    hideUnlock();
    const ok = await tryAutoplay();
    if (!ok) showUnlock();
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

  function effectiveKick(beatPhase) {
    const clock = kickEnv(beatPhase);
    const audioHit = audioBass * 1.35;
    return Math.min(1, Math.max(clock, audioHit));
  }

  function drawBackground(beatPhase) {
    const k = effectiveKick(beatPhase);
    const bgR = Math.floor(3 + k * 15);
    const bgB = Math.floor(8 * (1 - k));
    ctx.fillStyle = `rgb(${bgR},0,${bgB})`;
    ctx.fillRect(0, 0, width, height);
  }

  function drawWaveform(beatPhase, elapsedSec) {
    const mx = ptrX / width;
    const my = ptrY / height;
    const cy = height * 0.5;
    const kEnv = effectiveKick(beatPhase);
    const distDrive = 1 + my * 18 + kEnv * 22 + audioBass * 28;
    const freqMult = 2 + mx * 6 + audioBass * 1.5;
    const ampScale = (0.28 + kEnv * 0.55 + audioBass * 0.45) * height;

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
      ctx.lineWidth = lw + kEnv * 1.5 + audioBass * 2;
      ctx.stroke();
    });
  }

  function drawKickBurst(beatPhase) {
    const env = effectiveKick(beatPhase);
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
    if (isMobile || reduceEffects) return;
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

  function updateTiming(delta) {
    if (audioMode === 'file' && audioEl && !audioEl.paused) {
      readAnalyser();
      elapsed = audioEl.currentTime;
      wallElapsed = elapsed;
      return;
    }
    if (audioMode === 'mixcloud' && audioPlaying) {
      pollMixPosition();
      if (mixPosition > 0) {
        elapsed = mixPosition;
        wallElapsed = mixPosition;
      } else {
        wallElapsed += delta / 1000;
        elapsed = wallElapsed;
      }
      audioBass = kickEnv((elapsed / BEAT_SEC) % 1) * 0.55;
      return;
    }
    wallElapsed += delta / 1000;
    elapsed = wallElapsed;
    audioBass *= 0.92;
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
    updateTiming(delta);

    const beatF = elapsed / BEAT_SEC;
    const beatN = Math.floor(beatF);
    const beatPhase = beatF - beatN;

    if (beatN !== lastBeat) {
      lastBeat = beatN;
      triggerBeatEffects(now, beatN);
    }

    const isGlitching = !isMobile && !reduceEffects && now < glitchUntil;
    const isStrobing = !isMobile && !reduceEffects && now < strobeUntil;
    const isSlicing = !isMobile && !reduceEffects && now < sliceUntil;
    const glitchInt = isGlitching ? Math.min(1, (glitchUntil - now) / 180) : 0;

    drawBackground(beatPhase);
    drawWaveform(beatPhase, elapsed);
    drawKickBurst(beatPhase);

    if (isGlitching) drawGlitchSlices(glitchInt);
    if (isSlicing) drawGlitchSlices(0.8 + Math.random() * 0.2);

    drawNoise(0.1 + glitchInt * 0.9 + effectiveKick(beatPhase) * 0.4, quality);
    if (!isMobile) drawScanlines();

    if (isStrobing) drawStrobe(Math.min(1, (strobeUntil - now) / STROBE_MS));

    drawBpmWatermark();
  }

  async function boot() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    document.body.classList.add('visuals-ready');
    resizeCanvas();
    performanceState.lastTimestamp = performance.now();

    window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => setPointer(e.clientX, e.clientY), { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('resize', resizeCanvas, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resizeCanvas, { passive: true });
    }

    const hasFile = await initFileAudio();
    if (!hasFile) await initMixcloud();

    ctx.fillStyle = 'rgb(3,0,8)';
    ctx.fillRect(0, 0, width, height);
    requestAnimationFrame(animate);

    const autoplayed = await tryAutoplay();
    if (!autoplayed) showUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();