console.log("RGB Fields CA: script loaded");

function boot() {
  console.log("RGB Fields CA: booting");
  // --- Constants ---
  const COLS = 64;
  const ROWS = 64;
  const N = COLS * ROWS;
  const MAX_R = 8;
  const WATER_TICK_PROB = 0.1; // donor gate for water; recipient gate for air->water
  const BETA_UNIT = 0.9; // per-unit carry probability for blue advection
  const SHOW_GRIDS = false; // set to true to show grid overlays
  // URL param "seed" sets PRNG; number of start seeds is a code constant
  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  const RNG_SEED = (isFinite(seedParam) ? seedParam : 1337) >>> 0;
  const START_SEEDS = 512; // adjust here in code (single URL param reserved for ?seed)
  const START_BLUES = 512; // adjust here in code for number of initial blue particles

  // --- Container and scale computation (integer fit) ---
  const container = document.getElementById("canvas-div");
  function computeBestLayout() {
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    // Option A: single row (R | RB | B) -> width 3*COLS, height ROWS
    const scaleRow = Math.floor(Math.min(maxW / (COLS * 3), maxH / ROWS));
    // Option B: two rows (top: RB alone centered; bottom: R | B) -> width 2*COLS, height 2*ROWS
    const scaleTwo = Math.floor(Math.min(maxW / (COLS * 2), maxH / (ROWS * 2)));
    // Option C: single column (R / RB / B) -> width COLS, height 3*ROWS
    const scaleCol = Math.floor(Math.min(maxW / COLS, maxH / (ROWS * 3)));
    // Pick the mode that yields the largest integer scale
    let mode = "twoRow";
    let scale = scaleTwo;
    if (scaleRow >= scale && scaleRow >= scaleCol) {
      mode = "row";
      scale = scaleRow;
    } else if (scaleCol >= scale && scaleCol >= scaleRow) {
      mode = "col";
      scale = scaleCol;
    }
    return { mode, scale };
  }
  let LAYOUT = computeBestLayout();
  let SCALE_SIZE = Math.max(1, LAYOUT.scale);

  // --- PIXI setup (canvas size derived from scale) ---
  const app = new PIXI.Application({
    width:
      (LAYOUT.mode === "row"
        ? COLS * 3
        : LAYOUT.mode === "twoRow"
        ? COLS * 2
        : COLS) * SCALE_SIZE,
    height:
      (LAYOUT.mode === "row"
        ? ROWS
        : LAYOUT.mode === "twoRow"
        ? ROWS * 2
        : ROWS * 3) * SCALE_SIZE,
    backgroundColor: 0x000000,
    antialias: false,
  });
  if (container) container.appendChild(app.view);
  // prefer crisp pixel rendering
  if (app.view && app.view.style) {
    app.view.style.imageRendering = "pixelated";
  }
  if (app.renderer) {
    app.renderer.roundPixels = true;
  }

  // --- Field buffers ---
  // R units as discrete 0..8, each maps to 0,31,63,...,255
  let U0 = new Uint8Array(N);
  let U1 = new Uint8Array(N);
  // B binary field 0/1 (rendered as 0/255)
  let B0 = new Uint8Array(N);
  let B1 = new Uint8Array(N);

  // --- Persistent CA state/scratch (allocation-free per tick) ---
  // Outgoing and incoming unit counts planned this tick
  const spreadOut = new Uint8Array(N);
  const spreadIn = new Uint8Array(N);

  // --- Precompute Binomial CDFs for n=0..MAX_R with per-unit prob BETA_UNIT ---
  const comb = new Float64Array((MAX_R + 1) * (MAX_R + 1));
  function C(n, k) {
    return comb[n * (MAX_R + 1) + k];
  }
  // Build Pascal triangle for combinations
  for (let n = 0; n <= MAX_R; n++) {
    for (let k = 0; k <= n; k++) {
      if (k === 0 || k === n) {
        comb[n * (MAX_R + 1) + k] = 1;
      } else {
        comb[n * (MAX_R + 1) + k] =
          comb[(n - 1) * (MAX_R + 1) + (k - 1)] +
          comb[(n - 1) * (MAX_R + 1) + k];
      }
    }
  }
  const binomCDF = new Array(MAX_R + 1);
  (function buildBinomCDF(p) {
    const q = 1 - p;
    for (let n = 0; n <= MAX_R; n++) {
      const cdf = new Float64Array(n + 1);
      let acc = 0;
      for (let k = 0; k <= n; k++) {
        // P(K=k) = C(n,k) * p^k * q^(n-k)
        const prob = C(n, k) * Math.pow(p, k) * Math.pow(q, n - k);
        acc += prob;
        cdf[k] = acc;
      }
      // Numerical guard: ensure final entry is exactly 1
      cdf[n] = 1.0;
      binomCDF[n] = cdf;
    }
  })(BETA_UNIT);
  function sampleBinomial(n) {
    if (n <= 0) return 0;
    const u = rand();
    const cdf = binomCDF[n];
    // Linear scan is fine for n<=8
    for (let k = 0; k < cdf.length; k++) {
      if (u < cdf[k]) return k;
    }
    return cdf.length - 1;
  }

  // --- Packed RGBA buffers and textures for three views ---
  const rgbaR = new Uint8Array(N * 4);
  const rgbaRB = new Uint8Array(N * 4);
  const rgbaB = new Uint8Array(N * 4);
  const texR = PIXI.Texture.fromBuffer(rgbaR, COLS, ROWS);
  const texRB = PIXI.Texture.fromBuffer(rgbaRB, COLS, ROWS);
  const texB = PIXI.Texture.fromBuffer(rgbaB, COLS, ROWS);
  const sprR = new PIXI.Sprite(texR);
  const sprRB = new PIXI.Sprite(texRB);
  const sprB = new PIXI.Sprite(texB);
  sprR.scale.set(SCALE_SIZE, SCALE_SIZE);
  sprRB.scale.set(SCALE_SIZE, SCALE_SIZE);
  sprB.scale.set(SCALE_SIZE, SCALE_SIZE);
  function positionSpritesByLayout() {
    if (LAYOUT.mode === "row") {
      sprR.x = 0;
      sprR.y = 0;
      sprRB.x = COLS * SCALE_SIZE;
      sprRB.y = 0;
      sprB.x = COLS * 2 * SCALE_SIZE;
      sprB.y = 0;
    } else if (LAYOUT.mode === "twoRow") {
      // twoRow: canvas width = 2*COLS*SCALE, height = 2*ROWS*SCALE
      const gridW = COLS * SCALE_SIZE;
      const gridH = ROWS * SCALE_SIZE;
      sprRB.x = Math.floor((2 * gridW - gridW) / 2); // center top
      sprRB.y = 0;
      sprR.x = 0;
      sprR.y = gridH; // bottom-left
      sprB.x = gridW;
      sprB.y = gridH; // bottom-right
    } else {
      // col: three stacked vertically: R (top), RB (middle), B (bottom)
      const gridW = COLS * SCALE_SIZE;
      const gridH = ROWS * SCALE_SIZE;
      sprR.x = 0;
      sprR.y = 0;
      sprRB.x = 0;
      sprRB.y = gridH;
      sprB.x = 0;
      sprB.y = gridH * 2;
    }
  }
  positionSpritesByLayout();
  app.stage.addChild(sprR);
  app.stage.addChild(sprRB);
  app.stage.addChild(sprB);
  console.log(
    `Canvas ready: ${COLS}x${ROWS} x3 grids @ scale ${SCALE_SIZE} -> ${
      COLS * 3 * SCALE_SIZE
    }x${ROWS * SCALE_SIZE} px (seed=${RNG_SEED})`
  );

  // --- Grid overlays for each view ---
  function makeOverlay() {
    const g = new PIXI.Graphics();
    g.lineStyle(1, 0x555555, 0.8);
    return g;
  }
  const overlayR = makeOverlay();
  const overlayRB = makeOverlay();
  const overlayB = makeOverlay();
  function redrawOverlay(g) {
    g.clear();
    g.lineStyle(1, 0x555555, 0.8);
    const W = COLS * SCALE_SIZE;
    const H = ROWS * SCALE_SIZE;
    g.drawRect(0.5, 0.5, W - 1, H - 1);
    for (let cx = 1; cx < COLS; cx++) {
      const x = cx * SCALE_SIZE + 0.5;
      g.moveTo(x, 0.5);
      g.lineTo(x, H - 0.5);
    }
    for (let cy = 1; cy < ROWS; cy++) {
      const y = cy * SCALE_SIZE + 0.5;
      g.moveTo(0.5, y);
      g.lineTo(W - 0.5, y);
    }
  }
  function positionOverlaysByLayout() {
    const gridW = COLS * SCALE_SIZE;
    const gridH = ROWS * SCALE_SIZE;
    if (LAYOUT.mode === "row") {
      overlayR.x = 0;
      overlayR.y = 0;
      overlayRB.x = gridW;
      overlayRB.y = 0;
      overlayB.x = gridW * 2;
      overlayB.y = 0;
    } else if (LAYOUT.mode === "twoRow") {
      overlayRB.x = Math.floor((2 * gridW - gridW) / 2);
      overlayRB.y = 0;
      overlayR.x = 0;
      overlayR.y = gridH;
      overlayB.x = gridW;
      overlayB.y = gridH;
    } else {
      overlayR.x = 0;
      overlayR.y = 0;
      overlayRB.x = 0;
      overlayRB.y = gridH;
      overlayB.x = 0;
      overlayB.y = gridH * 2;
    }
  }
  if (SHOW_GRIDS) {
    redrawOverlay(overlayR);
    redrawOverlay(overlayRB);
    redrawOverlay(overlayB);
    positionOverlaysByLayout();
    app.stage.addChild(overlayR);
    app.stage.addChild(overlayRB);
    app.stage.addChild(overlayB);
  }

  // --- Helpers ---
  const IX = (x, y) => y * COLS + x;

  // Map unit count (0..8) to display value (0,31,63,...,255)
  const UNIT_TO_BYTE = new Uint8Array(9);
  for (let u = 0; u <= 8; u++) UNIT_TO_BYTE[u] = u === 0 ? 0 : u * 32 - 1;

  // Deterministic PRNG (LCG) with seed avalanche to avoid sequential correlation
  function mix32(x) {
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    x = x ^ (x >>> 16);
    return x >>> 0;
  }
  let rngState = mix32(RNG_SEED);
  function rand() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296; // 2**32
  }

  function updateTextures(units, blue) {
    // Left: R only
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const u = units[i] & 0xff;
      const rByte = u >= 8 ? 255 : UNIT_TO_BYTE[u];
      rgbaR[j + 0] = rByte;
      rgbaR[j + 1] = 0;
      rgbaR[j + 2] = 0;
      rgbaR[j + 3] = 255;
    }
    if (texR.baseTexture && typeof texR.baseTexture.update === "function") {
      texR.baseTexture.update();
    }
    // Center: both R and B
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const u = units[i] & 0xff;
      const rByte = u >= 8 ? 255 : UNIT_TO_BYTE[u];
      rgbaRB[j + 0] = rByte;
      rgbaRB[j + 1] = 0;
      rgbaRB[j + 2] = blue[i] ? 255 : 0;
      rgbaRB[j + 3] = 255;
    }
    if (texRB.baseTexture && typeof texRB.baseTexture.update === "function") {
      texRB.baseTexture.update();
    }
    // Right: B only
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      rgbaB[j + 0] = 0;
      rgbaB[j + 1] = 0;
      rgbaB[j + 2] = blue[i] ? 255 : 0;
      rgbaB[j + 3] = 255;
    }
    if (texB.baseTexture && typeof texB.baseTexture.update === "function") {
      texB.baseTexture.update();
    }
  }

  // Red diffusion: donor-gated random-walk to one random neighbor if cooler
  function diffuseRed(src, dst, blue) {
    // Reset destination to current state
    dst.set(src);
    // Reset scratch buffers
    spreadOut.fill(0);
    spreadIn.fill(0);

    for (let y = 0; y < ROWS; y++) {
      const yOff = y * COLS;
      for (let x = 0; x < COLS; x++) {
        const i = yOff + x;
        const s = src[i];
        if (s === 0) continue;

        // Donor gate: water donors attempt with WATER_TICK_PROB; air always attempts
        if (blue[i] === 1 && rand() >= WATER_TICK_PROB) continue;

        // Pick one random direction: 0=up,1=right,2=down,3=left
        const dir = (rand() * 4) | 0;
        let nx = x,
          ny = y;
        if (dir === 0) ny = y - 1;
        else if (dir === 1) nx = x + 1;
        else if (dir === 2) ny = y + 1;
        else nx = x - 1;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;

        const j = ny * COLS + nx;
        const t = src[j];
        if (t >= s) continue; // only to cooler

        // Recipient gate only for air -> water crossings
        if (blue[i] === 0 && blue[j] === 1 && rand() >= WATER_TICK_PROB)
          continue;

        spreadOut[i] += 1;
        spreadIn[j] += 1;
      }
    }

    // Apply planned transfers
    for (let i = 0; i < N; i++) {
      dst[i] = src[i] - spreadOut[i] + spreadIn[i];
    }
  }

  // Simple falling-sand blue flow (binary 0/1); one move per blue cell per tick
  // Includes red advection via Binomial(n=BETA_UNIT) carry using one RNG per move
  function flowBlue(src, dst) {
    dst.set(src);
    // To avoid double-moving, we’ll record target claims per tick
    const claimed = new Uint8Array(N);
    // Shuffle scan order lightly based on PRNG to reduce bias
    const order = new Uint32Array(N);
    for (let i = 0; i < N; i++) order[i] = i;
    for (let i = N - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    for (let idx = 0; idx < N; idx++) {
      const i = order[idx];
      if (src[i] === 0) continue;
      const x = i % COLS;
      const y = (i / COLS) | 0;
      // Try down
      const tryTargets = [];
      if (y + 1 < ROWS) tryTargets.push({ x, y: y + 1 });
      // down-left vs down-right in random order
      if (y + 1 < ROWS) {
        if (rand() < 0.5) {
          if (x - 1 >= 0) tryTargets.push({ x: x - 1, y: y + 1 });
          if (x + 1 < COLS) tryTargets.push({ x: x + 1, y: y + 1 });
        } else {
          if (x + 1 < COLS) tryTargets.push({ x: x + 1, y: y + 1 });
          if (x - 1 >= 0) tryTargets.push({ x: x - 1, y: y + 1 });
        }
      }
      // left/right in random order
      if (rand() < 0.5) {
        if (x - 1 >= 0) tryTargets.push({ x: x - 1, y });
        if (x + 1 < COLS) tryTargets.push({ x: x + 1, y });
      } else {
        if (x + 1 < COLS) tryTargets.push({ x: x + 1, y });
        if (x - 1 >= 0) tryTargets.push({ x: x - 1, y });
      }
      // Attempt first available empty target
      for (let t = 0; t < tryTargets.length; t++) {
        const tx = tryTargets[t].x;
        const ty = tryTargets[t].y;
        const j = ty * COLS + tx;
        if (src[j] === 0 && claimed[j] === 0) {
          // move
          dst[i] = 0;
          dst[j] = 1;
          claimed[j] = 1;
          // Heat advection: carry K ~ Binomial(U0[i], BETA_UNIT) into j, limited by capacity
          const nUnits = U0[i];
          if (nUnits > 0) {
            const space = MAX_R - U0[j];
            if (space > 0) {
              const k = sampleBinomial(nUnits);
              const moved = k < space ? k : space;
              if (moved > 0) {
                U0[i] = nUnits - moved;
                U0[j] = U0[j] + moved;
              }
            }
          }
          break;
        }
      }
    }
  }

  function advanceTick() {
    // 1) Move blue with advection carrying red
    flowBlue(B0, B1);
    [B0, B1] = [B1, B0];
    // 2) Diffuse red with donor/recipient gates
    diffuseRed(U0, U1, B0);
    [U0, U1] = [U1, U0];
    // 3) Update visuals
    updateTextures(U0, B0);
    ticks++;
  }

  // --- Initialization ---
  U0.fill(0);
  B0.fill(0);
  const chosen = new Set();
  while (chosen.size < START_SEEDS) {
    const idx = (rand() * N) | 0;
    if (!chosen.has(idx)) chosen.add(idx);
  }
  const seedCoords = [];
  for (const idx of chosen) {
    U0[idx] = 8; // 8 units -> 255 display
    seedCoords.push({ x: idx % COLS, y: (idx / COLS) | 0, i: idx });
  }
  console.log(
    `Initialized grid ${COLS}x${ROWS}. Seeds=${START_SEEDS}`,
    seedCoords
  );
  // Place distinct blue particles for debugging visibility (static)
  const blueChosen = new Set();
  while (blueChosen.size < Math.min(START_BLUES, N)) {
    const idx = (rand() * N) | 0;
    if (!blueChosen.has(idx)) blueChosen.add(idx);
  }
  for (const bi of blueChosen) B0[bi] = 1;
  console.log("Blue seeds at:", Array.from(blueChosen));
  updateTextures(U0, B0);

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
  const STEP_INTERVAL_MS = 1;
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

  // --- Handle resize: recompute integer scale and resize renderer/sprites/overlay ---
  function onResize() {
    const best = computeBestLayout();
    const newScale = Math.max(1, best.scale);
    if (newScale === SCALE_SIZE) return;
    SCALE_SIZE = newScale;
    LAYOUT = best;
    app.renderer.resize(
      (LAYOUT.mode === "row"
        ? COLS * 3
        : LAYOUT.mode === "twoRow"
        ? COLS * 2
        : COLS) * SCALE_SIZE,
      (LAYOUT.mode === "row"
        ? ROWS
        : LAYOUT.mode === "twoRow"
        ? ROWS * 2
        : ROWS * 3) * SCALE_SIZE
    );
    sprR.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprRB.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprB.scale.set(SCALE_SIZE, SCALE_SIZE);
    positionSpritesByLayout();
    if (SHOW_GRIDS) {
      redrawOverlay(overlayR);
      redrawOverlay(overlayRB);
      redrawOverlay(overlayB);
      positionOverlaysByLayout();
    }
  }
  window.addEventListener("resize", onResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
