console.log("RGB Fields v14: Optimized + Convection Dynamics");

function boot() {
  // --- Constants ---
  const COLS = 128; // Doubled for perf testing
  const ROWS = 128;
  const N = COLS * ROWS;
  const MAX_R = 8;
  const MAX_W = 4;
  const WATER_TICK_PROB = 0.1;
  const SHOW_GRIDS = false;

  // URL param "seed" sets PRNG
  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  const RNG_SEED = (isFinite(seedParam) ? seedParam : 1337) >>> 0;

  // --- Dynamics: Heat source at bottom, cooling at top ---
  const ENABLE_CONVECTION = true;
  const BOTTOM_HEAT_PROB = 0.02; // Chance per bottom cell per tick to add heat
  const BOTTOM_HEAT_AMOUNT = 2;
  const TOP_COOL_PROB = 0.03; // Chance per top cell per tick to remove heat
  const TOP_COOL_AMOUNT = 1;
  // Hot water rises: if heat >= threshold, water can move up
  const HOT_WATER_RISE_THRESHOLD = 5;
  const HOT_WATER_RISE_PROB = 0.3;

  // Reduced random seeds for cleaner dynamics
  const START_SEEDS = Math.floor(N / 20); // Heat seeds
  const START_WATERS = Math.floor(N / 8); // Water - more water for convection

  // --- Green (Life) knobs ---
  const ENABLE_SPONTANEOUS_G = false;
  const G_BIRTH_R_MIN = 5;
  const G_BIRTH_B_MIN = 3;
  const G_BIRTH_P_NEAR = 0.01;
  const G_BIRTH_P_ALONE = 0.001;
  const G_GROW_R_COST = 4;
  const G_GROW_B_COST = 2;
  const enableGCapillaryForWater = true;
  const gatesBlockAdvectionAcrossBoundary = true;

  // --- Container and scale ---
  const container = document.getElementById("canvas-div");
  function computeBestLayout() {
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    const scaleRow = Math.floor(Math.min(maxW / (COLS * 3), maxH / ROWS));
    const scaleTwo = Math.floor(Math.min(maxW / (COLS * 2), maxH / (ROWS * 2)));
    const scaleCol = Math.floor(Math.min(maxW / COLS, maxH / (ROWS * 3)));
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
  let combinedOnlyView = false;

  function computeBestScaleSingle() {
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    return Math.floor(Math.min(maxW / COLS, maxH / ROWS));
  }

  // --- PIXI setup ---
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
  if (app.view && app.view.style) {
    app.view.style.imageRendering = "pixelated";
  }
  if (app.renderer) {
    app.renderer.roundPixels = true;
  }

  // --- Field buffers (typed arrays) ---
  let U0 = new Uint8Array(N);
  let U1 = new Uint8Array(N);
  let W0 = new Uint8Array(N);
  let W1 = new Uint8Array(N);
  let G0 = new Uint8Array(N);
  let G1 = new Uint8Array(N);

  // --- Pre-allocated scratch buffers (OPTIMIZATION: no per-tick allocation) ---
  const spreadOut = new Uint8Array(N);
  const spreadIn = new Uint8Array(N);
  const waterOut = new Uint8Array(N);
  const waterIn = new Uint8Array(N);
  const heatOut = new Uint8Array(N);
  const heatIn = new Uint8Array(N);
  const choice = new Int32Array(N);
  const accepted = new Uint8Array(N);
  const cap = new Uint8Array(N);

  // --- OPTIMIZATION: Pre-computed neighbor offset table ---
  // For each cell, store offsets to 8 neighbors (or -1 if out of bounds)
  // Layout: [D, U, L, R, DL, DR, UL, UR] per cell
  const neighborOffsets = new Int32Array(N * 8);
  let wrapX = true;
  let wrapY = false;

  function rebuildNeighborTable() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const base = i * 8;
        // D (0,1)
        neighborOffsets[base + 0] = y < ROWS - 1 ? i + COLS : wrapY ? x : -1;
        // U (0,-1)
        neighborOffsets[base + 1] = y > 0 ? i - COLS : wrapY ? (ROWS - 1) * COLS + x : -1;
        // L (-1,0)
        neighborOffsets[base + 2] = x > 0 ? i - 1 : wrapX ? i + COLS - 1 : -1;
        // R (1,0)
        neighborOffsets[base + 3] = x < COLS - 1 ? i + 1 : wrapX ? i - COLS + 1 : -1;
        // DL (-1,1)
        {
          let nx = x > 0 ? x - 1 : wrapX ? COLS - 1 : -1;
          let ny = y < ROWS - 1 ? y + 1 : wrapY ? 0 : -1;
          neighborOffsets[base + 4] = nx >= 0 && ny >= 0 ? ny * COLS + nx : -1;
        }
        // DR (1,1)
        {
          let nx = x < COLS - 1 ? x + 1 : wrapX ? 0 : -1;
          let ny = y < ROWS - 1 ? y + 1 : wrapY ? 0 : -1;
          neighborOffsets[base + 5] = nx >= 0 && ny >= 0 ? ny * COLS + nx : -1;
        }
        // UL (-1,-1)
        {
          let nx = x > 0 ? x - 1 : wrapX ? COLS - 1 : -1;
          let ny = y > 0 ? y - 1 : wrapY ? ROWS - 1 : -1;
          neighborOffsets[base + 6] = nx >= 0 && ny >= 0 ? ny * COLS + nx : -1;
        }
        // UR (1,-1)
        {
          let nx = x < COLS - 1 ? x + 1 : wrapX ? 0 : -1;
          let ny = y > 0 ? y - 1 : wrapY ? ROWS - 1 : -1;
          neighborOffsets[base + 7] = nx >= 0 && ny >= 0 ? ny * COLS + nx : -1;
        }
      }
    }
  }
  rebuildNeighborTable();

  // Neighbor indices: D=0, U=1, L=2, R=3, DL=4, DR=5, UL=6, UR=7
  const N_D = 0, N_U = 1, N_L = 2, N_R = 3, N_DL = 4, N_DR = 5, N_UL = 6, N_UR = 7;

  // Inline neighbor lookup
  function getNeighbor(i, dir) {
    return neighborOffsets[i * 8 + dir];
  }

  // --- RGBA buffers and textures ---
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
    if (combinedOnlyView) {
      sprRB.x = 0;
      sprRB.y = 0;
      return;
    }
    if (LAYOUT.mode === "row") {
      sprR.x = 0;
      sprR.y = 0;
      sprRB.x = COLS * SCALE_SIZE;
      sprRB.y = 0;
      sprB.x = COLS * 2 * SCALE_SIZE;
      sprB.y = 0;
    } else if (LAYOUT.mode === "twoRow") {
      const gridW = COLS * SCALE_SIZE;
      const gridH = ROWS * SCALE_SIZE;
      sprRB.x = Math.floor((2 * gridW - gridW) / 2);
      sprRB.y = 0;
      sprR.x = 0;
      sprR.y = gridH;
      sprB.x = gridW;
      sprB.y = gridH;
    } else {
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

  // --- PRNG (LCG) ---
  function mix32(x) {
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return (x ^ (x >>> 16)) >>> 0;
  }
  let rngState = mix32(RNG_SEED);
  function rand() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  }
  // OPTIMIZATION: integer random for direction selection (avoid division)
  function randInt4() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState & 3; // 0-3
  }

  // --- Lookup tables ---
  const UNIT_TO_BYTE = new Uint8Array(9);
  for (let u = 0; u <= 8; u++) UNIT_TO_BYTE[u] = u === 0 ? 0 : u * 32 - 1;
  const WATER_TO_BYTE = new Uint8Array([0, 63, 127, 191, 255]);

  // --- Texture update ---
  function updateTextures(units, water, green) {
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const rByte = UNIT_TO_BYTE[units[i]];
      rgbaR[j] = rByte;
      rgbaR[j + 1] = 0;
      rgbaR[j + 2] = 0;
      rgbaR[j + 3] = 255;
    }
    texR.baseTexture.update();

    for (let i = 0, j = 0; i < N; i++, j += 4) {
      rgbaRB[j] = UNIT_TO_BYTE[units[i]];
      rgbaRB[j + 1] = green[i] ? 255 : 0;
      rgbaRB[j + 2] = WATER_TO_BYTE[water[i]];
      rgbaRB[j + 3] = 255;
    }
    texRB.baseTexture.update();

    for (let i = 0, j = 0; i < N; i++, j += 4) {
      rgbaB[j] = 0;
      rgbaB[j + 1] = 0;
      rgbaB[j + 2] = WATER_TO_BYTE[water[i]];
      rgbaB[j + 3] = 255;
    }
    texB.baseTexture.update();
  }

  // --- Heat convection: add heat at bottom, remove at top ---
  function applyConvection(U) {
    if (!ENABLE_CONVECTION) return;

    // Bottom row: add heat
    const bottomY = ROWS - 1;
    for (let x = 0; x < COLS; x++) {
      const i = bottomY * COLS + x;
      if (rand() < BOTTOM_HEAT_PROB && U[i] < MAX_R) {
        U[i] = Math.min(MAX_R, U[i] + BOTTOM_HEAT_AMOUNT);
      }
    }

    // Top row: remove heat
    for (let x = 0; x < COLS; x++) {
      const i = x; // y=0
      if (rand() < TOP_COOL_PROB && U[i] > 0) {
        U[i] = Math.max(0, U[i] - TOP_COOL_AMOUNT);
      }
    }
  }

  // --- Red diffusion (OPTIMIZED: inline neighbor lookup) ---
  function diffuseRed(src, dst, water, green) {
    dst.set(src);
    spreadOut.fill(0);
    spreadIn.fill(0);

    for (let i = 0; i < N; i++) {
      const s = src[i];
      if (s === 0) continue;

      // Donor gate for water
      if (water[i] > 0 && rand() >= WATER_TICK_PROB) continue;

      // Pick direction (0=U, 1=R, 2=D, 3=L)
      // Inside G: bias down for energy flow to roots
      let dir;
      if (green && green[i]) {
        const r = rand();
        dir = r < 0.4 ? N_D : r < 0.7 ? N_U : r < 0.85 ? N_R : N_L;
      } else {
        const d4 = randInt4();
        dir = d4 === 0 ? N_U : d4 === 1 ? N_R : d4 === 2 ? N_D : N_L;
      }

      const j = getNeighbor(i, dir);
      if (j < 0) continue;

      const t = src[j];
      if (t >= s) continue; // only to cooler

      // Recipient gate for air->water
      if (water[i] === 0 && water[j] > 0 && rand() >= WATER_TICK_PROB) continue;

      // G-aware: no leak from G to non-G
      if (green && green[i] && !green[j]) continue;

      spreadOut[i]++;
      spreadIn[j]++;
    }

    for (let i = 0; i < N; i++) {
      dst[i] = src[i] - spreadOut[i] + spreadIn[i];
    }
  }

  // --- Water flow (OPTIMIZED: simplified direction logic) ---
  let heatAffectsWater = true;
  let advectionEnabled = true;

  function canTransferWater(source, target) {
    if (target >= MAX_W) return false;
    const diff = source - target;
    return diff >= 2 || (source >= 3 && diff >= 1);
  }

  function flowWater(W_src, W_dst, U, tickCount, green) {
    W_dst.set(W_src);
    waterOut.fill(0);
    waterIn.fill(0);
    heatOut.fill(0);
    heatIn.fill(0);
    choice.fill(-1);
    accepted.fill(0);

    for (let i = 0; i < N; i++) {
      cap[i] = MAX_W - W_src[i];
    }

    const flip = (tickCount & 1) !== 0;

    // PASS 1: each source chooses target
    for (let y = 0; y < ROWS; y++) {
      const leftToRight = ((y & 1) === 0) !== flip;
      const xStart = leftToRight ? 0 : COLS - 1;
      const xEnd = leftToRight ? COLS : -1;
      const xStep = leftToRight ? 1 : -1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = y * COLS + x;
        const w = W_src[i];
        if (w === 0) continue;

        const heat = heatAffectsWater ? U[i] : 4;
        const base = i * 8;

        // OPTIMIZATION: inline direction priority based on heat
        // Hot water (heat >= threshold) can rise
        let targetFound = -1;

        if (ENABLE_CONVECTION && heat >= HOT_WATER_RISE_THRESHOLD && rand() < HOT_WATER_RISE_PROB) {
          // Hot water tries to rise first
          const up = neighborOffsets[base + N_U];
          if (up >= 0 && W_src[up] < MAX_W) {
            if (!green || !green[i] || green[up]) { // G-gate
              targetFound = up;
            }
          }
        }

        if (targetFound < 0) {
          // Normal gravity: try down first
          const down = neighborOffsets[base + N_D];
          if (down >= 0 && W_src[down] < MAX_W) {
            if (!green || !green[i] || green[down]) {
              targetFound = down;
            }
          }
        }

        if (targetFound < 0) {
          // Try diagonals down
          const dl = neighborOffsets[base + N_DL];
          const dr = neighborOffsets[base + N_DR];
          if (dl >= 0 && canTransferWater(w, W_src[dl])) {
            if (!green || !green[i] || green[dl]) {
              targetFound = dl;
            }
          } else if (dr >= 0 && canTransferWater(w, W_src[dr])) {
            if (!green || !green[i] || green[dr]) {
              targetFound = dr;
            }
          }
        }

        if (targetFound < 0 && heat >= 4) {
          // Warm water spreads sideways
          const lr = randInt4() & 1;
          const first = lr ? N_L : N_R;
          const second = lr ? N_R : N_L;
          const n1 = neighborOffsets[base + first];
          const n2 = neighborOffsets[base + second];
          if (n1 >= 0 && canTransferWater(w, W_src[n1])) {
            if (!green || !green[i] || green[n1]) targetFound = n1;
          } else if (n2 >= 0 && canTransferWater(w, W_src[n2])) {
            if (!green || !green[i] || green[n2]) targetFound = n2;
          }
        }

        if (targetFound >= 0) {
          choice[i] = targetFound;
        }
      }
    }

    // PASS 2: accept transfers
    for (let y = 0; y < ROWS; y++) {
      const leftToRight = ((y & 1) === 0) !== flip;
      const xStart = leftToRight ? 0 : COLS - 1;
      const xEnd = leftToRight ? COLS : -1;
      const xStep = leftToRight ? 1 : -1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = y * COLS + x;
        const j = choice[i];
        if (j < 0) continue;
        if (accepted[j] < cap[j]) {
          accepted[j]++;
          waterOut[i] = 1;
          waterIn[j]++;

          // Heat advection
          if (advectionEnabled && U[i] > 0) {
            if (!gatesBlockAdvectionAcrossBoundary || !green || (green[i] === green[j])) {
              const availHeat = U[i] - heatOut[i];
              const availCap = MAX_R - U[j] - heatIn[j];
              if (availHeat > 0 && availCap > 0) {
                const move = Math.min(availHeat, availCap);
                heatOut[i] += move;
                heatIn[j] += move;
              }
            }
          }
        }
      }
    }

    // Apply
    for (let i = 0; i < N; i++) {
      W_dst[i] = W_src[i] - waterOut[i] + waterIn[i];
      const uNext = U[i] - heatOut[i] + heatIn[i];
      U[i] = uNext < 0 ? 0 : uNext > MAX_R ? MAX_R : uNext;
    }
  }

  // --- Green functions ---
  function birthGreen(R, B, G_src, G_dst) {
    if (!ENABLE_SPONTANEOUS_G) return;
    G_dst.set(G_src);
    for (let i = 0; i < N; i++) {
      if (G_src[i]) continue;
      if (R[i] < G_BIRTH_R_MIN || B[i] < G_BIRTH_B_MIN) continue;
      const x = i % COLS;
      const y = (i / COLS) | 0;
      let nearG = false;
      for (let d = 0; d < 8 && !nearG; d++) {
        const j = getNeighbor(i, d);
        if (j >= 0 && G_src[j]) nearG = true;
      }
      const p = nearG ? G_BIRTH_P_NEAR : G_BIRTH_P_ALONE;
      if (rand() < p) G_dst[i] = 1;
    }
  }

  function growGreen(R, B, G_src, G_dst) {
    G_dst.set(G_src);
    for (let i = 0; i < N; i++) {
      if (!G_src[i]) continue;
      const below = getNeighbor(i, N_D);
      const above = getNeighbor(i, N_U);
      if (below < 0 || above < 0) continue;
      if (G_src[below] && !G_src[above]) {
        if (R[i] >= G_GROW_R_COST && B[i] >= G_GROW_B_COST) {
          G_dst[above] = 1;
          R[i] = Math.max(0, R[i] - G_GROW_R_COST);
          B[i] = Math.max(0, B[i] - G_GROW_B_COST);
        }
      }
    }
  }

  function killGreen(R, B, G) {
    for (let i = 0; i < N; i++) {
      if (G[i] && R[i] === 0 && B[i] === 0) {
        G[i] = 0;
      }
    }
  }

  // --- Main tick ---
  function advanceTick() {
    applyConvection(U0);
    flowWater(W0, W1, U0, ticks, G0);
    [W0, W1] = [W1, W0];
    diffuseRed(U0, U1, W0, G0);
    [U0, U1] = [U1, U0];
    birthGreen(U0, W0, G0, G1);
    growGreen(U0, W0, G0, G1);
    [G0, G1] = [G1, G0];
    killGreen(U0, W0, G0);
    updateTextures(U0, W0, G0);
    ticks++;
  }

  // --- Initialization ---
  U0.fill(0);
  W0.fill(0);
  G0.fill(0);
  G1.fill(0);

  // Place heat seeds randomly
  const chosen = new Set();
  while (chosen.size < Math.min(START_SEEDS, N)) {
    chosen.add((rand() * N) | 0);
  }
  for (const idx of chosen) {
    U0[idx] = 8;
  }

  // Place water - concentrated in upper half to create convection cycle
  // Water falls, gets heated at bottom, rises, cools at top, falls again
  for (let y = 0; y < ROWS / 2; y++) {
    for (let x = 0; x < COLS; x++) {
      if (rand() < 0.3) {
        W0[y * COLS + x] = 2 + (rand() * 3) | 0;
      }
    }
  }

  // Place initial green stalk at center
  const sx = COLS >> 1;
  const sy = ROWS >> 1;
  const si = sy * COLS + sx;
  const below = getNeighbor(si, N_D);
  if (below >= 0) {
    G0[si] = 1;
    G0[below] = 1;
    // Give it resources
    U0[si] = G_GROW_R_COST + 2;
    W0[si] = G_GROW_B_COST + 1;
  }

  console.log(`Initialized ${COLS}x${ROWS} grid. Heat seeds: ${chosen.size}, Convection: ${ENABLE_CONVECTION}`);
  updateTextures(U0, W0, G0);

  // --- Controls ---
  let paused = false;
  let ticks = 0;

  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") paused = !paused;
    if (e.key === " ") {
      if (paused) advanceTick();
      e.preventDefault();
    }
    if (e.key === "h" || e.key === "H") {
      heatAffectsWater = !heatAffectsWater;
      console.log(`heatAffectsWater: ${heatAffectsWater}`);
    }
    if (e.key === "c" || e.key === "C") {
      console.log(`Tick: ${ticks}, Heat sum: ${U0.reduce((a,b)=>a+b,0)}, Water sum: ${W0.reduce((a,b)=>a+b,0)}`);
    }
    if (e.key === "x" || e.key === "X") {
      wrapX = !wrapX;
      rebuildNeighborTable();
      console.log(`wrapX: ${wrapX}`);
    }
    if (e.key === "y" || e.key === "Y") {
      wrapY = !wrapY;
      rebuildNeighborTable();
      console.log(`wrapY: ${wrapY}`);
    }
    if (e.key === "v" || e.key === "V") {
      combinedOnlyView = !combinedOnlyView;
      sprR.visible = !combinedOnlyView;
      sprB.visible = !combinedOnlyView;
      onResize();
      console.log(`combinedOnlyView: ${combinedOnlyView}`);
    }
  });

  // --- Main loop ---
  const STEP_INTERVAL_MS = 16; // ~60 FPS target
  setInterval(() => {
    if (!paused) advanceTick();
  }, STEP_INTERVAL_MS);

  function mainLoop() {
    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }
  mainLoop();

  // --- Resize handler ---
  function onResize() {
    const best = computeBestLayout();
    const singleScale = computeBestScaleSingle();
    SCALE_SIZE = Math.max(1, combinedOnlyView ? singleScale : best.scale);
    LAYOUT = best;
    const newWidth = combinedOnlyView
      ? COLS * SCALE_SIZE
      : (LAYOUT.mode === "row" ? COLS * 3 : LAYOUT.mode === "twoRow" ? COLS * 2 : COLS) * SCALE_SIZE;
    const newHeight = combinedOnlyView
      ? ROWS * SCALE_SIZE
      : (LAYOUT.mode === "row" ? ROWS : LAYOUT.mode === "twoRow" ? ROWS * 2 : ROWS * 3) * SCALE_SIZE;
    app.renderer.resize(newWidth, newHeight);
    sprR.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprRB.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprB.scale.set(SCALE_SIZE, SCALE_SIZE);
    positionSpritesByLayout();
  }
  window.addEventListener("resize", onResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
