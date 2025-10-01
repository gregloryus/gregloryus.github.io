console.log("RGB Fields CA: script loaded");

function boot() {
  console.log("RGB Fields CA: booting");
  // --- Constants ---
  const COLS = 64;
  const ROWS = 64;
  const SCALE_SIZE = 8; // pixels per cell
  const N = COLS * ROWS;

  // --- PIXI setup (fixed-size canvas) ---
  const app = new PIXI.Application({
    width: COLS * SCALE_SIZE,
    height: ROWS * SCALE_SIZE,
    backgroundColor: 0x000000,
    antialias: false,
  });
  const container = document.getElementById("canvas-div");
  if (container) container.appendChild(app.view);
  // prefer crisp pixel rendering
  if (app.view && app.view.style) {
    app.view.style.imageRendering = "pixelated";
  }
  if (app.renderer) {
    app.renderer.roundPixels = true;
  }

  // --- Field buffers as discrete units (0..8), each unit = 32 display value ---
  let U0 = new Uint8Array(N);
  let U1 = new Uint8Array(N);

  // --- Packed RGBA buffer and texture ---
  const rgba = new Uint8Array(N * 4);
  const baseTex = PIXI.Texture.fromBuffer(rgba, COLS, ROWS);
  const spr = new PIXI.Sprite(baseTex);
  spr.scale.set(SCALE_SIZE, SCALE_SIZE);
  app.stage.addChild(spr);
  console.log(
    `Canvas ready: ${COLS}x${ROWS} cells @ scale ${SCALE_SIZE} -> ${
      COLS * SCALE_SIZE
    }x${ROWS * SCALE_SIZE} px`
  );

  // --- Grid overlay (1px lines, fully closed) ---
  const gridOverlay = new PIXI.Graphics();
  gridOverlay.lineStyle(1, 0x555555, 0.8);
  // Draw outer rectangle inset by 0.5 to land on pixel centers
  const W = COLS * SCALE_SIZE;
  const H = ROWS * SCALE_SIZE;
  gridOverlay.drawRect(0.5, 0.5, W - 1, H - 1);
  // Internal vertical lines (exclude outermost already drawn)
  for (let cx = 1; cx < COLS; cx++) {
    const x = cx * SCALE_SIZE + 0.5;
    gridOverlay.moveTo(x, 0.5);
    gridOverlay.lineTo(x, H - 0.5);
  }
  // Internal horizontal lines (exclude outermost already drawn)
  for (let cy = 1; cy < ROWS; cy++) {
    const y = cy * SCALE_SIZE + 0.5;
    gridOverlay.moveTo(0.5, y);
    gridOverlay.lineTo(W - 0.5, y);
  }
  app.stage.addChild(gridOverlay);

  // --- Helpers ---
  const IX = (x, y) => y * COLS + x;

  // Map unit count (0..8) to display value (0,31,63,...,255)
  const UNIT_TO_BYTE = new Uint8Array(9);
  for (let u = 0; u <= 8; u++) UNIT_TO_BYTE[u] = u === 0 ? 0 : u * 32 - 1;

  // Deterministic PRNG (LCG)
  let rngState = 1337 >>> 0;
  function rand() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296; // 2**32
  }

  function packRGBAFrom(units) {
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const u = units[i] & 0xff;
      const rByte = u >= 8 ? 255 : UNIT_TO_BYTE[u];
      rgba[j + 0] = rByte; // R
      rgba[j + 1] = 0; // G
      rgba[j + 2] = 0; // B
      rgba[j + 3] = 255; // A
    }
    if (
      baseTex &&
      baseTex.baseTexture &&
      typeof baseTex.baseTexture.update === "function"
    ) {
      baseTex.baseTexture.update();
    } else if (
      baseTex &&
      baseTex.baseTexture &&
      baseTex.baseTexture.resource &&
      typeof baseTex.baseTexture.resource.update === "function"
    ) {
      baseTex.baseTexture.resource.update();
    }
  }

  // Conservative, discrete, unit-preserving spread
  function spreadUnits(src, dst, tick) {
    // Reset destination to current state
    dst.set(src);
    const out = new Uint8Array(N);
    const inn = new Uint8Array(N);
    // Helper to shuffle 4 directions per cell deterministically
    function shuffledNeighbors(x, y) {
      const arr = [];
      if (y > 0) arr.push({ nx: x, ny: y - 1 }); // up
      if (x < COLS - 1) arr.push({ nx: x + 1, ny: y }); // right
      if (y < ROWS - 1) arr.push({ nx: x, ny: y + 1 }); // down
      if (x > 0) arr.push({ nx: x - 1, ny: y }); // left
      // Fisher–Yates using seeded rand()
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (rand() * (i + 1)) | 0;
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      return arr;
    }
    for (let y = 0; y < ROWS; y++) {
      const yOff = y * COLS;
      for (let x = 0; x < COLS; x++) {
        const i = yOff + x;
        let s = src[i];
        if (s === 0) continue;
        // Local snapshot of neighbor units for this cell's decisions
        const neigh = shuffledNeighbors(x, y);
        // Build a temp map for neighbor current values
        for (let k = 0; k < neigh.length; k++) {
          const j = neigh[k].ny * COLS + neigh[k].nx;
          neigh[k].u = src[j];
          neigh[k].idx = j;
        }
        for (let k = 0; k < neigh.length; k++) {
          const j = neigh[k].idx;
          const n = neigh[k].u;
          // give 1 unit only if after transfer source >= neighbor
          if (s - n >= 2 && s > 0) {
            out[i]++;
            inn[j]++;
            s -= 1;
            neigh[k].u = n + 1;
          }
        }
      }
    }
    // Apply planned transfers and log changes
    for (let y = 0; y < ROWS; y++) {
      const yOff = y * COLS;
      for (let x = 0; x < COLS; x++) {
        const i = yOff + x;
        const before = src[i];
        const after = before - out[i] + inn[i];
        dst[i] = after;
        if (after !== before) {
          const bDisp = UNIT_TO_BYTE[before];
          const aDisp = UNIT_TO_BYTE[after];
          console.log(
            `tick ${tick} change at (${x},${y}): ${bDisp} -> ${aDisp}`
          );
        }
      }
    }
  }

  function advanceTick() {
    spreadUnits(U0, U1, ticks);
    [U0, U1] = [U1, U0];
    packRGBAFrom(U0);
    ticks++;
  }

  // --- Initialization ---
  U0.fill(0);
  const seedIndex = (rand() * N) | 0;
  U0[seedIndex] = 8; // 8 units -> 255 display
  const seedX = seedIndex % COLS;
  const seedY = (seedIndex / COLS) | 0;
  console.log(
    `Initialized grid ${COLS}x${ROWS}. Seed R=255 at (${seedX},${seedY}) [i=${seedIndex}]`
  );
  packRGBAFrom(U0);

  // --- Controls ---
  let paused = false;
  let ticks = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") {
      paused = !paused;
    }
    if (e.key === " ") {
      if (paused) {
        advanceTick();
      }
      e.preventDefault();
    }
    if (e.key === "r" || e.key === "R") {
      // quick stats
      let min = 255,
        max = 0,
        sum = 0;
      for (let i = 0; i < N; i++) {
        const v = UNIT_TO_BYTE[U0[i]];
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
      }
      const mean = sum / N;
      console.log(`R stats -> min:${min} max:${max} mean:${mean.toFixed(2)}`);
    }
  });

  // --- Main loop ---
  // step once per second automatically when not paused
  const STEP_INTERVAL_MS = 1000;
  setInterval(() => {
    if (!paused) {
      advanceTick();
    }
  }, STEP_INTERVAL_MS);

  function mainLoop() {
    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }
  mainLoop();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
