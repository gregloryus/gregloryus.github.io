// Evo Engine — Phase 0: chunked world with sleeping chunks
//
// The thesis of this file: simulation cost should scale with ACTIVITY, not
// world size. The world is divided into 64x64 chunks; a chunk is only
// processed on a tick if something moved in or near it last tick. A fully
// settled world costs ~zero per tick, no matter how large it is.
//
// Phase 0 content: static soil terrain + falling/flowing water. That's all.
// Organisms (Phase 1) will ride on this same substrate.
//
// Runs two ways:
//   browser: evo-engine.html (PIXI rendering, interactive brushes)
//   node evo-engine.js  — headless self-test: rains, drains, verifies the
//                         interior sleeps (cost ∝ surface runners, not
//                         volume) and water is conserved.

"use strict";

// --- World ---
const W = 1024;
const H = 1024;
const N = W * H;
const SHIFT = 6; // chunk = 64x64
const CHUNK = 1 << SHIFT;
const CW = W >> SHIFT;
const CH = H >> SHIFT;
const NC = CW * CH;

const EMPTY = 0;
const SOIL = 1;
const WATER = 2;

const RAIN_RATE = 64; // water cells spawned per tick while raining
const FF_FACTOR = 10;

// --- State (all flat typed arrays, no objects) ---
const type = new Uint8Array(N);
const flow = new Uint8Array(N); // direction persistence: 0 none, 1 left, 2 right
const lastMoved = new Uint32Array(N); // tick stamp: each cell acts at most once per tick
const shade = new Uint8Array(N); // baked per-cell render jitter
let activeNow = new Uint8Array(NC);
let activeNext = new Uint8Array(NC);
const drawDirty = new Uint8Array(NC);

let ticks = 0;
let waterCount = 0;
let raining = true;
let parity = 0;

// --- Seeded PRNG (LCG, same family as rgbfields/simplant) ---
let rngState = 1337 >>> 0;
function setSeed(s) {
  let x = s >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  rngState = (x ^ (x >>> 16)) >>> 0;
}
function rand() {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
}
function randInt(n) {
  return (rand() * n) | 0;
}

// --- Waking ---
// Waking a cell marks its chunk (and any chunk within 1 cell) for the next
// tick, so influence can cross chunk borders. At most 4 chunks per call.
function wakeCell(x, y) {
  const cx0 = (x > 0 ? x - 1 : x) >> SHIFT;
  const cx1 = (x < W - 1 ? x + 1 : x) >> SHIFT;
  const cy0 = (y > 0 ? y - 1 : y) >> SHIFT;
  const cy1 = (y < H - 1 ? y + 1 : y) >> SHIFT;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * CW + cx;
      activeNext[c] = 1;
      drawDirty[c] = 1;
    }
  }
}

// --- Water (monochromagic-10 rules, verbatim) ---
// Priority chain per mono: fall straight down (forget direction); else try
// ONLY the current direction's diagonal; else slide purely sideways in that
// direction; else flip direction, which costs the whole tick. Direction
// persistence is what makes water stream and slosh instead of dithering.
//
// Cost model: interior water and full flat surface rows are blocked on all
// sides — they flip a bit at most, never wake anything, and sleep. Only the
// partial top layer of each pool keeps "runners" bouncing forever, so the
// steady-state cost scales with pool SURFACE, not water volume.
function updateWater(x, y, i) {
  if (lastMoved[i] === ticks) return; // already acted this tick
  const hasBelow = y + 1 < H;
  const b = i + W;

  if (hasBelow && type[b] === EMPTY) {
    type[b] = WATER;
    type[i] = EMPTY;
    flow[b] = 0; // mono: falling straight down resets direction
    flow[i] = 0;
    lastMoved[b] = ticks;
    wakeCell(x, y);
    wakeCell(x, y + 1);
    return;
  }

  let dir = flow[i];
  if (dir === 0) {
    dir = 1 + randInt(2);
    flow[i] = dir;
  }
  const step = dir === 1 ? -1 : 1;
  const nx = x + step;

  if (nx >= 0 && nx < W) {
    if (hasBelow && type[b + step] === EMPTY) {
      const j = b + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir; // diagonal fall keeps direction
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y + 1);
      return;
    }
    if (type[i + step] === EMPTY) {
      const j = i + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir;
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y);
      return;
    }
  }

  flow[i] = 3 - dir; // blocked: switch direction, no move this tick (mono)
}

function rain() {
  for (let k = 0; k < RAIN_RATE; k++) {
    const x = randInt(W);
    const i = 2 * W + x;
    if (type[i] === EMPTY) {
      type[i] = WATER;
      waterCount++;
      wakeCell(x, 2);
    }
  }
}

// --- Tick ---
// Rows are processed globally bottom-up (so a cell falls at most once per
// tick), but within each row only the segments belonging to active chunks
// are touched. X direction serpentines by tick parity to avoid drift bias.
function tick() {
  ticks++; // increment first so the tick stamp is never 0
  const tmp = activeNow;
  activeNow = activeNext;
  activeNext = tmp;
  activeNext.fill(0);

  if (raining) rain();
  parity ^= 1;

  for (let y = H - 1; y >= 0; y--) {
    const cRow = (y >> SHIFT) * CW;
    const rowBase = y * W;
    if (parity === 0) {
      for (let cx = 0; cx < CW; cx++) {
        if (!activeNow[cRow + cx]) continue;
        const x1 = (cx << SHIFT) + CHUNK;
        for (let x = cx << SHIFT; x < x1; x++) {
          const i = rowBase + x;
          if (type[i] === WATER) updateWater(x, y, i);
        }
      }
    } else {
      for (let cx = CW - 1; cx >= 0; cx--) {
        if (!activeNow[cRow + cx]) continue;
        const x0 = cx << SHIFT;
        for (let x = x0 + CHUNK - 1; x >= x0; x--) {
          const i = rowBase + x;
          if (type[i] === WATER) updateWater(x, y, i);
        }
      }
    }
  }
}

function countActive() {
  let c = 0;
  for (let k = 0; k < NC; k++) c += activeNext[k];
  return c;
}

function recountWater() {
  let c = 0;
  for (let i = 0; i < N; i++) if (type[i] === WATER) c++;
  return c;
}

// --- World gen: random-walk terrain with occasional cliffs ---
function initWorld() {
  let h = (H * 0.85) | 0;
  const hMin = (H * 0.7) | 0;
  const hMax = (H * 0.97) | 0;
  for (let x = 0; x < W; x++) {
    if (rand() < 0.01) h += randInt(21) - 10; // cliff
    const r = rand();
    if (r < 0.4) h--;
    else if (r > 0.6) h++;
    if (h < hMin) h = hMin;
    if (h > hMax) h = hMax;
    for (let y = h; y < H; y++) type[y * W + x] = SOIL;
  }
  for (let i = 0; i < N; i++) shade[i] = randInt(24);
  drawDirty.fill(1);
}

// ==================== Headless self-test (node evo-engine.js) ====================
function headlessTest() {
  const seed = parseInt(process.argv[2] || "1337", 10);
  setSeed(seed);
  console.log(`Evo Engine Phase 0 self-test — ${W}x${H}, seed ${seed}`);
  initWorld();

  const RAIN_TICKS = 600;
  raining = true;
  let t0 = performance.now();
  for (let k = 0; k < RAIN_TICKS; k++) tick();
  const rainMs = (performance.now() - t0) / RAIN_TICKS;
  raining = false;
  console.log(
    `rained ${RAIN_TICKS} ticks: ${waterCount} water cells, ` +
      `${rainMs.toFixed(2)} ms/tick, ${countActive()}/${NC} chunks active`
  );

  // Strict mono water never fully sleeps: each pool's partial top layer
  // keeps a few runners bouncing forever. The claim to verify is that the
  // steady state is interior-asleep with cost proportional to surface.
  for (let k = 0; k < 5000; k++) tick(); // level out

  const SAMPLE = 1000;
  t0 = performance.now();
  for (let k = 0; k < SAMPLE; k++) tick();
  const steadyMs = (performance.now() - t0) / SAMPLE;
  const activeSteady = countActive();
  let runners = 0;
  for (let i = 0; i < N; i++) if (lastMoved[i] === ticks) runners++;

  const recount = recountWater();
  const conserved = recount === waterCount;
  console.log(
    `steady state after ${ticks} ticks: ${activeSteady}/${NC} chunks awake, ` +
      `${runners} runners of ${waterCount} water cells, ` +
      `${steadyMs.toFixed(3)} ms/tick (vs ${rainMs.toFixed(2)} raining)`
  );
  console.log(
    `conservation: counter ${waterCount}, recount ${recount} — ${
      conserved ? "OK" : "LEAK"
    }`
  );

  const ok = conserved && activeSteady < NC * 0.25 && steadyMs < rainMs / 2;
  console.log(
    ok
      ? "PASS: interior asleep, steady cost scales with surface runners"
      : "FAIL: steady state too active or water leaked"
  );
  process.exit(ok ? 0 : 1);
}

// ==================== Browser boot ====================
function boot() {
  const params = new URLSearchParams(window.location.search);
  setSeed(parseInt(params.get("seed") || "1337", 10) >>> 0);
  initWorld();

  const app = new PIXI.Application({
    width: W,
    height: H,
    backgroundColor: 0x000000,
    antialias: false,
    autoStart: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";

  const rgba = new Uint8Array(N * 4);
  const texture = PIXI.Texture.fromBuffer(rgba, W, H);
  app.stage.addChild(new PIXI.Sprite(texture));

  function paintChunk(c) {
    const x0 = (c % CW) << SHIFT;
    const y0 = ((c / CW) | 0) << SHIFT;
    for (let ly = 0; ly < CHUNK; ly++) {
      let i = (y0 + ly) * W + x0;
      let p = i * 4;
      for (let lx = 0; lx < CHUNK; lx++, i++, p += 4) {
        const t = type[i];
        const s = shade[i];
        if (t === SOIL) {
          rgba[p] = 84 + s;
          rgba[p + 1] = 60 + s;
          rgba[p + 2] = 38 + (s >> 1);
        } else if (t === WATER) {
          rgba[p] = 30;
          rgba[p + 1] = 90 + (s >> 1);
          rgba[p + 2] = 190 + s;
        } else {
          rgba[p] = 8;
          rgba[p + 1] = 9;
          rgba[p + 2] = 14;
        }
        rgba[p + 3] = 255;
      }
    }
  }

  function flushDraw() {
    let any = false;
    for (let c = 0; c < NC; c++) {
      if (drawDirty[c]) {
        paintChunk(c);
        drawDirty[c] = 0;
        any = true;
      }
    }
    if (any) texture.baseTexture.update();
  }

  // --- Fit canvas to window (CSS scale only; sim stays 1:1) ---
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    app.view.style.width = `${W * s}px`;
    app.view.style.height = `${H * s}px`;
  }
  fit();
  window.addEventListener("resize", fit);

  // --- Brushes ---
  let painting = false;
  let tool = WATER;
  const BRUSH = 4;
  function applyBrush(px, py) {
    const rect = app.view.getBoundingClientRect();
    const x = ((px - rect.left) / rect.width) * W;
    const y = ((py - rect.top) / rect.height) * H;
    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
        const cx = (x + dx) | 0;
        const cy = (y + dy) | 0;
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        const i = cy * W + cx;
        if (tool === WATER && type[i] === EMPTY) {
          type[i] = WATER;
          waterCount++;
        } else if (tool === SOIL && type[i] !== SOIL) {
          if (type[i] === WATER) waterCount--;
          type[i] = SOIL;
        } else if (tool === EMPTY && type[i] !== EMPTY) {
          if (type[i] === WATER) waterCount--;
          type[i] = EMPTY;
          flow[i] = 0;
        } else {
          continue;
        }
        wakeCell(cx, cy);
      }
    }
  }
  app.view.addEventListener("pointerdown", (e) => {
    painting = true;
    applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    if (painting) applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", () => (painting = false));

  // --- Keys ---
  let paused = false;
  let ff = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "r") raining = !raining;
    if (e.key === "p") paused = !paused;
    if (e.key === "f") ff = !ff;
    if (e.key === "1") tool = WATER;
    if (e.key === "2") tool = SOIL;
    if (e.key === "3") tool = EMPTY;
    if (e.key === " ") {
      if (paused) tick();
      e.preventDefault();
    }
    if (e.key === "c") {
      const recount = recountWater();
      console.log(
        `tick ${ticks} | water counter ${waterCount}, recount ${recount} — ${
          recount === waterCount ? "conserved" : "LEAK"
        }`
      );
    }
  });

  // --- Main loop ---
  const hud = document.getElementById("hud");
  let tickMs = 0;
  let frames = 0;
  let fps = 0;
  let fpsTime = performance.now();

  function frame() {
    if (!paused) {
      const n = ff ? FF_FACTOR : 1;
      const t0 = performance.now();
      for (let k = 0; k < n; k++) tick();
      tickMs = tickMs * 0.95 + ((performance.now() - t0) / n) * 0.05;
    }
    flushDraw();
    app.renderer.render(app.stage);

    frames++;
    const now = performance.now();
    if (now - fpsTime >= 1000) {
      fps = frames;
      frames = 0;
      fpsTime = now;
      const toolName = tool === WATER ? "water" : tool === SOIL ? "soil" : "erase";
      hud.textContent =
        `tick ${ticks} | ${fps} fps | ${tickMs.toFixed(2)} ms/tick | ` +
        `${countActive()}/${NC} chunks awake | water ${waterCount} | ` +
        `rain ${raining ? "ON" : "off"}${ff ? " | FF x" + FF_FACTOR : ""}${
          paused ? " | PAUSED" : ""
        }\n` +
        `[r]ain [p]ause [space]step [f]ast [c]onservation | ` +
        `brush: ${toolName} — [1]water [2]soil [3]erase, drag to paint`;
    }
    requestAnimationFrame(frame);
  }
  frame();
}

if (typeof window === "undefined") {
  headlessTest();
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
