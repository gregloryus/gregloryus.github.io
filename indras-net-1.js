"use strict";
// ============================================================
// INDRA'S NET — v1
// One rule, one sentence:
//   Each moment, every cell becomes a copy of the one neighbor
//   its current color points to — plus a rare whisper of hue drift.
//
// No self-term in the update. No hidden state: the screen IS the
// simulation. Hue (0..255) is read as a compass direction
// (hue>>5 -> one of 8 neighbors). Torus topology. Seeded.
//
// The single tuning knob is the drift (mutation) rate.
// ============================================================

(() => {
  // ---------- seeded PRNG (mulberry32) ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const q = new URLSearchParams(location.search);
  let seedParam = parseInt(q.get("seed"), 10);
  const SEED = (Number.isFinite(seedParam) ? seedParam : Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rand = mulberry32(SEED);

  // ---------- grid ----------
  const SCALE = 2; // screen pixels per cell
  const W = Math.max(32, Math.floor(window.innerWidth / SCALE));
  const H = Math.max(32, Math.floor(window.innerHeight / SCALE));
  const N = W * H;

  let cur = new Uint8Array(N);
  let nxt = new Uint8Array(N);

  // ---------- hue -> direction ----------
  // hue 0 (red) points east; each +32 of hue rotates the compass 45°
  // clockwise on screen. (Gauge symmetry: +k to every hue = global wind.)
  const DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY = [0, 1, 1, 1, 0, -1, -1, -1];
  const DIR = new Uint8Array(256);
  for (let h = 0; h < 256; h++) DIR[h] = h >> 5;

  // ---------- precomputed torus neighbor table ----------
  const NBR = new Int32Array(N * 8);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const base = (y * W + x) * 8;
      for (let d = 0; d < 8; d++) {
        const nx = (x + DX[d] + W) % W;
        const ny = (y + DY[d] + H) % H;
        NBR[base + d] = ny * W + nx;
      }
    }
  }

  // ---------- palette (hue -> RGBA, little-endian ABGR words) ----------
  function hsv2rgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s), qq = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = qq; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = qq; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = qq; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  const PAL = new Uint32Array(256);
  for (let h = 0; h < 256; h++) {
    const [r, g, b] = hsv2rgb(h / 256, 0.8, 0.95);
    PAL[h] = (255 << 24) | (b << 16) | (g << 8) | r;
  }

  // ---------- canvas ----------
  const canvas = document.getElementById("world");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const octx = off.getContext("2d");
  const img = octx.createImageData(W, H);
  const px = new Uint32Array(img.data.buffer);

  // ---------- state / knobs ----------
  let driftRate = 1e-5;   // expected mutations per cell per tick — THE knob
  let stepsPerFrame = 1;
  let paused = false;
  let windOn = false;
  const WIND_PERIOD = 8;  // every 8 ticks, all hues += 1 (45°/256-tick season)
  let tick = 0;

  function initNoise() {
    for (let i = 0; i < N; i++) cur[i] = (rand() * 256) | 0;
    tick = 0;
  }
  function initCrystal() {
    cur.fill((rand() * 256) | 0);
    tick = 0;
  }

  // ---------- the one rule ----------
  function step() {
    for (let i = 0; i < N; i++) {
      nxt[i] = cur[NBR[(i << 3) | DIR[cur[i]]]];
    }
    // the whisper: rare hue drift
    const expected = N * driftRate;
    let k = Math.floor(expected) + (rand() < expected % 1 ? 1 : 0);
    while (k-- > 0) {
      const i = (rand() * N) | 0;
      const delta = 1 + ((rand() * 8) | 0);
      nxt[i] = (nxt[i] + (rand() < 0.5 ? delta : 256 - delta)) & 255;
    }
    const tmp = cur; cur = nxt; nxt = tmp;
    tick++;
    if (windOn && tick % WIND_PERIOD === 0) {
      for (let i = 0; i < N; i++) cur[i] = (cur[i] + 1) & 255;
    }
  }

  function render() {
    for (let i = 0; i < N; i++) px[i] = PAL[cur[i]];
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }

  // ---------- overlay ----------
  const overlay = document.getElementById("overlay");
  let overlayOn = true;
  let fps = 0, frames = 0, lastFpsT = performance.now();
  function updateOverlay() {
    if (!overlayOn) return;
    overlay.textContent =
      `INDRA'S NET  ·  seed ${SEED}  ·  ${W}×${H} = ${N.toLocaleString()} cells\n` +
      `tick ${tick.toLocaleString()}   fps ${fps}   ${paused ? "PAUSED" : "running"}\n` +
      `drift ${driftRate.toExponential(1)} /cell/tick   steps/frame ${stepsPerFrame}   wind ${windOn ? "ON" : "off"}\n` +
      `\n` +
      `space pause · . step · r reseed noise · c crystal\n` +
      `- / = drift ÷2 ×2 · [ / ] speed ÷2 ×2 · w wind · h hide`;
  }

  // ---------- keys ----------
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case " ": paused = !paused; e.preventDefault(); break;
      case ".": if (paused) { step(); render(); } break;
      case "r": location.search = "?seed=" + ((Math.random() * 0xffffffff) >>> 0); break;
      case "c": initCrystal(); break;
      case "-": driftRate = Math.max(1e-8, driftRate / 2); break;
      case "=": case "+": driftRate = Math.min(1e-2, driftRate * 2); break;
      case "[": stepsPerFrame = Math.max(1, stepsPerFrame >> 1); break;
      case "]": stepsPerFrame = Math.min(64, stepsPerFrame << 1); break;
      case "w": windOn = !windOn; break;
      case "h": overlayOn = !overlayOn; overlay.style.display = overlayOn ? "block" : "none"; break;
    }
    updateOverlay();
  });

  // ---------- main loop ----------
  function loop() {
    if (!paused) {
      for (let s = 0; s < stepsPerFrame; s++) step();
    }
    render();
    frames++;
    const now = performance.now();
    if (now - lastFpsT >= 1000) {
      fps = frames; frames = 0; lastFpsT = now;
      updateOverlay();
    }
    requestAnimationFrame(loop);
  }

  initNoise();
  updateOverlay();
  loop();
})();
