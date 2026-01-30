console.log("RGB Fields v15: Buoyancy Swap Convection");

function boot() {
  const COLS = 128;
  const ROWS = 128;
  const N = COLS * ROWS;
  const MAX_R = 8;
  const MAX_W = 4;

  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  const RNG_SEED = (isFinite(seedParam) ? seedParam : 1337) >>> 0;

  // --- Convection parameters ---
  const BOTTOM_HEAT_RATE = 0.05;    // Higher rate
  const BOTTOM_HEAT_AMOUNT = 3;      // More heat per injection
  const TOP_COOL_RATE = 0.08;        // Aggressive cooling
  const TOP_COOL_AMOUNT = 2;

  // Buoyancy: hot water swaps with cooler cell above
  const BUOYANCY_HEAT_DIFF = 2;      // Need this much more heat to rise
  const BUOYANCY_PROB = 0.4;         // Chance to swap when conditions met

  // Water diffusion (spreads sideways when level differs)
  const WATER_SPREAD_PROB = 0.3;

  const START_HEAT_SEEDS = Math.floor(N / 30);

  // --- Green knobs ---
  const ENABLE_SPONTANEOUS_G = false;
  const G_GROW_R_COST = 4;
  const G_GROW_B_COST = 2;

  // --- Layout ---
  const container = document.getElementById("canvas-div");
  function computeBestLayout() {
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    const scaleRow = Math.floor(Math.min(maxW / (COLS * 3), maxH / ROWS));
    const scaleTwo = Math.floor(Math.min(maxW / (COLS * 2), maxH / (ROWS * 2)));
    const scaleCol = Math.floor(Math.min(maxW / COLS, maxH / (ROWS * 3)));
    let mode = "twoRow", scale = scaleTwo;
    if (scaleRow >= scale && scaleRow >= scaleCol) { mode = "row"; scale = scaleRow; }
    else if (scaleCol >= scale) { mode = "col"; scale = scaleCol; }
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

  // --- PIXI ---
  const app = new PIXI.Application({
    width: (LAYOUT.mode === "row" ? COLS * 3 : LAYOUT.mode === "twoRow" ? COLS * 2 : COLS) * SCALE_SIZE,
    height: (LAYOUT.mode === "row" ? ROWS : LAYOUT.mode === "twoRow" ? ROWS * 2 : ROWS * 3) * SCALE_SIZE,
    backgroundColor: 0x000000,
    antialias: false,
  });
  if (container) container.appendChild(app.view);
  if (app.view) app.view.style.imageRendering = "pixelated";
  if (app.renderer) app.renderer.roundPixels = true;

  // --- Fields ---
  let U0 = new Uint8Array(N);  // Heat
  let U1 = new Uint8Array(N);
  let W0 = new Uint8Array(N);  // Water
  let W1 = new Uint8Array(N);
  let G0 = new Uint8Array(N);  // Green
  let G1 = new Uint8Array(N);

  // --- Scratch buffers ---
  const spreadOut = new Uint8Array(N);
  const spreadIn = new Uint8Array(N);

  // --- Neighbor table ---
  let wrapX = true, wrapY = false;
  const neighborOffsets = new Int32Array(N * 8);
  const N_D = 0, N_U = 1, N_L = 2, N_R = 3, N_DL = 4, N_DR = 5, N_UL = 6, N_UR = 7;

  function rebuildNeighborTable() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const base = i * 8;
        neighborOffsets[base + N_D] = y < ROWS - 1 ? i + COLS : wrapY ? x : -1;
        neighborOffsets[base + N_U] = y > 0 ? i - COLS : wrapY ? (ROWS - 1) * COLS + x : -1;
        neighborOffsets[base + N_L] = x > 0 ? i - 1 : wrapX ? i + COLS - 1 : -1;
        neighborOffsets[base + N_R] = x < COLS - 1 ? i + 1 : wrapX ? i - COLS + 1 : -1;
        // Diagonals
        const canD = y < ROWS - 1 || wrapY;
        const canU = y > 0 || wrapY;
        const canL = x > 0 || wrapX;
        const canR = x < COLS - 1 || wrapX;
        const ny_d = y < ROWS - 1 ? y + 1 : wrapY ? 0 : -1;
        const ny_u = y > 0 ? y - 1 : wrapY ? ROWS - 1 : -1;
        const nx_l = x > 0 ? x - 1 : wrapX ? COLS - 1 : -1;
        const nx_r = x < COLS - 1 ? x + 1 : wrapX ? 0 : -1;
        neighborOffsets[base + N_DL] = canD && canL ? ny_d * COLS + nx_l : -1;
        neighborOffsets[base + N_DR] = canD && canR ? ny_d * COLS + nx_r : -1;
        neighborOffsets[base + N_UL] = canU && canL ? ny_u * COLS + nx_l : -1;
        neighborOffsets[base + N_UR] = canU && canR ? ny_u * COLS + nx_r : -1;
      }
    }
  }
  rebuildNeighborTable();

  function getN(i, dir) { return neighborOffsets[i * 8 + dir]; }

  // --- PRNG ---
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
  function randInt4() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState & 3;
  }

  // --- Textures ---
  const UNIT_TO_BYTE = new Uint8Array(9);
  for (let u = 0; u <= 8; u++) UNIT_TO_BYTE[u] = u === 0 ? 0 : u * 32 - 1;
  const WATER_TO_BYTE = new Uint8Array([0, 63, 127, 191, 255]);

  const rgbaR = new Uint8Array(N * 4);
  const rgbaRB = new Uint8Array(N * 4);
  const rgbaB = new Uint8Array(N * 4);
  const texR = PIXI.Texture.fromBuffer(rgbaR, COLS, ROWS);
  const texRB = PIXI.Texture.fromBuffer(rgbaRB, COLS, ROWS);
  const texB = PIXI.Texture.fromBuffer(rgbaB, COLS, ROWS);
  const sprR = new PIXI.Sprite(texR);
  const sprRB = new PIXI.Sprite(texRB);
  const sprB = new PIXI.Sprite(texB);
  sprR.scale.set(SCALE_SIZE);
  sprRB.scale.set(SCALE_SIZE);
  sprB.scale.set(SCALE_SIZE);

  function positionSprites() {
    if (combinedOnlyView) { sprRB.x = sprRB.y = 0; return; }
    const gw = COLS * SCALE_SIZE, gh = ROWS * SCALE_SIZE;
    if (LAYOUT.mode === "row") {
      sprR.x = 0; sprR.y = 0;
      sprRB.x = gw; sprRB.y = 0;
      sprB.x = gw * 2; sprB.y = 0;
    } else if (LAYOUT.mode === "twoRow") {
      sprRB.x = Math.floor((2 * gw - gw) / 2); sprRB.y = 0;
      sprR.x = 0; sprR.y = gh;
      sprB.x = gw; sprB.y = gh;
    } else {
      sprR.x = 0; sprR.y = 0;
      sprRB.x = 0; sprRB.y = gh;
      sprB.x = 0; sprB.y = gh * 2;
    }
  }
  positionSprites();
  app.stage.addChild(sprR, sprRB, sprB);

  function updateTextures() {
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const r = UNIT_TO_BYTE[U0[i]];
      rgbaR[j] = r; rgbaR[j+1] = 0; rgbaR[j+2] = 0; rgbaR[j+3] = 255;
      rgbaRB[j] = r; rgbaRB[j+1] = G0[i] ? 255 : 0; rgbaRB[j+2] = WATER_TO_BYTE[W0[i]]; rgbaRB[j+3] = 255;
      rgbaB[j] = 0; rgbaB[j+1] = 0; rgbaB[j+2] = WATER_TO_BYTE[W0[i]]; rgbaB[j+3] = 255;
    }
    texR.baseTexture.update();
    texRB.baseTexture.update();
    texB.baseTexture.update();
  }

  // --- Heat source/sink ---
  function applyHeatSourceSink() {
    // Bottom: add heat
    const bottomRow = (ROWS - 1) * COLS;
    for (let x = 0; x < COLS; x++) {
      const i = bottomRow + x;
      if (rand() < BOTTOM_HEAT_RATE && U0[i] < MAX_R) {
        U0[i] = Math.min(MAX_R, U0[i] + BOTTOM_HEAT_AMOUNT);
      }
    }
    // Top: remove heat
    for (let x = 0; x < COLS; x++) {
      if (rand() < TOP_COOL_RATE && U0[x] > 0) {
        U0[x] = Math.max(0, U0[x] - TOP_COOL_AMOUNT);
      }
    }
  }

  // --- Buoyancy: hot cells swap with cooler cells above ---
  function applyBuoyancy() {
    // Process bottom-to-top so rising bubbles can chain
    for (let y = ROWS - 1; y > 0; y--) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const above = getN(i, N_U);
        if (above < 0) continue;

        const heatHere = U0[i];
        const heatAbove = U0[above];
        const waterHere = W0[i];
        const waterAbove = W0[above];

        // Buoyancy condition: this cell is hotter AND has water
        // Hot water rises, displacing cooler water/air
        if (waterHere > 0 && heatHere >= heatAbove + BUOYANCY_HEAT_DIFF) {
          if (rand() < BUOYANCY_PROB) {
            // Swap water
            W0[i] = waterAbove;
            W0[above] = waterHere;
            // Swap heat (hot rises with its water)
            U0[i] = heatAbove;
            U0[above] = heatHere;
          }
        }
      }
    }
  }

  // --- Water gravity and spreading ---
  function applyWaterGravity() {
    // Gravity: water falls if cell below has less water
    for (let y = ROWS - 2; y >= 0; y--) {  // bottom-up so falling chains
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const below = getN(i, N_D);
        if (below < 0) continue;

        const wHere = W0[i];
        const wBelow = W0[below];

        if (wHere > 0 && wBelow < MAX_W) {
          // Move one unit down
          const transfer = Math.min(wHere, MAX_W - wBelow);
          if (transfer > 0) {
            W0[i] -= 1;
            W0[below] += 1;
            // Heat advects with water (partial)
            if (U0[i] > 0 && U0[below] < MAX_R) {
              const heatMove = Math.min(1, U0[i], MAX_R - U0[below]);
              U0[i] -= heatMove;
              U0[below] += heatMove;
            }
          }
        }
      }
    }

    // Spreading: water levels out sideways
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const wHere = W0[i];
        if (wHere < 2) continue;  // need excess to spread

        const left = getN(i, N_L);
        const right = getN(i, N_R);

        // Try to equalize with a random neighbor
        const tryLeft = rand() < 0.5;
        const neighbor = tryLeft ? left : right;
        if (neighbor < 0) continue;

        const wNeighbor = W0[neighbor];
        if (wHere > wNeighbor + 1 && rand() < WATER_SPREAD_PROB) {
          W0[i]--;
          W0[neighbor]++;
        }
      }
    }
  }

  // --- Heat diffusion (simpler: random walk to cooler neighbor) ---
  function diffuseHeat() {
    spreadOut.fill(0);
    spreadIn.fill(0);

    for (let i = 0; i < N; i++) {
      const h = U0[i];
      if (h === 0) continue;

      // Pick random cardinal direction
      const d4 = randInt4();
      const dir = d4 === 0 ? N_U : d4 === 1 ? N_R : d4 === 2 ? N_D : N_L;
      const j = getN(i, dir);
      if (j < 0) continue;

      // Only move to cooler
      if (U0[j] < h) {
        spreadOut[i]++;
        spreadIn[j]++;
      }
    }

    for (let i = 0; i < N; i++) {
      U0[i] = U0[i] - spreadOut[i] + spreadIn[i];
    }
  }

  // --- Green growth ---
  function updateGreen() {
    G1.set(G0);
    for (let i = 0; i < N; i++) {
      if (!G0[i]) continue;
      const below = getN(i, N_D);
      const above = getN(i, N_U);
      if (below < 0 || above < 0) continue;
      if (G0[below] && !G0[above]) {
        if (U0[i] >= G_GROW_R_COST && W0[i] >= G_GROW_B_COST) {
          G1[above] = 1;
          U0[i] -= G_GROW_R_COST;
          W0[i] -= G_GROW_B_COST;
        }
      }
    }
    [G0, G1] = [G1, G0];

    // Kill starved
    for (let i = 0; i < N; i++) {
      if (G0[i] && U0[i] === 0 && W0[i] === 0) G0[i] = 0;
    }
  }

  // --- Main tick ---
  function advanceTick() {
    applyHeatSourceSink();
    applyBuoyancy();       // Hot water rises (swap-based)
    applyWaterGravity();   // Cold water falls + spreads
    diffuseHeat();         // Heat diffuses randomly
    updateGreen();
    updateTextures();
    ticks++;
  }

  // --- Initialization ---
  U0.fill(0);
  W0.fill(0);
  G0.fill(0);

  // Scatter some initial heat
  for (let n = 0; n < START_HEAT_SEEDS; n++) {
    const idx = (rand() * N) | 0;
    U0[idx] = 4 + (rand() * 4) | 0;
  }

  // Put water in a band across middle (will fall and create convection)
  const waterBandTop = Math.floor(ROWS * 0.3);
  const waterBandBot = Math.floor(ROWS * 0.5);
  for (let y = waterBandTop; y < waterBandBot; y++) {
    for (let x = 0; x < COLS; x++) {
      W0[y * COLS + x] = 2 + (rand() * 2) | 0;
    }
  }

  // Green seed at center
  const cx = COLS >> 1, cy = ROWS >> 1;
  const ci = cy * COLS + cx;
  const cBelow = getN(ci, N_D);
  if (cBelow >= 0) {
    G0[ci] = 1;
    G0[cBelow] = 1;
    U0[ci] = G_GROW_R_COST + 2;
    W0[ci] = G_GROW_B_COST + 1;
  }

  console.log(`v15: ${COLS}x${ROWS}, buoyancy-based convection`);
  updateTextures();

  // --- Controls ---
  let paused = false;
  let ticks = 0;

  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") paused = !paused;
    if (e.key === " ") { if (paused) advanceTick(); e.preventDefault(); }
    if (e.key === "c" || e.key === "C") {
      const hSum = U0.reduce((a,b) => a+b, 0);
      const wSum = W0.reduce((a,b) => a+b, 0);
      const gSum = G0.reduce((a,b) => a+b, 0);
      console.log(`Tick ${ticks} | Heat: ${hSum} | Water: ${wSum} | Green: ${gSum}`);
    }
    if (e.key === "v" || e.key === "V") {
      combinedOnlyView = !combinedOnlyView;
      sprR.visible = sprB.visible = !combinedOnlyView;
      onResize();
    }
    if (e.key === "x" || e.key === "X") { wrapX = !wrapX; rebuildNeighborTable(); console.log(`wrapX: ${wrapX}`); }
    if (e.key === "y" || e.key === "Y") { wrapY = !wrapY; rebuildNeighborTable(); console.log(`wrapY: ${wrapY}`); }
  });

  // --- Loop ---
  setInterval(() => { if (!paused) advanceTick(); }, 16);
  function mainLoop() { app.renderer.render(app.stage); requestAnimationFrame(mainLoop); }
  mainLoop();

  // --- Resize ---
  function onResize() {
    LAYOUT = computeBestLayout();
    SCALE_SIZE = Math.max(1, combinedOnlyView ? computeBestScaleSingle() : LAYOUT.scale);
    const w = combinedOnlyView ? COLS * SCALE_SIZE :
      (LAYOUT.mode === "row" ? COLS * 3 : LAYOUT.mode === "twoRow" ? COLS * 2 : COLS) * SCALE_SIZE;
    const h = combinedOnlyView ? ROWS * SCALE_SIZE :
      (LAYOUT.mode === "row" ? ROWS : LAYOUT.mode === "twoRow" ? ROWS * 2 : ROWS * 3) * SCALE_SIZE;
    app.renderer.resize(w, h);
    sprR.scale.set(SCALE_SIZE);
    sprRB.scale.set(SCALE_SIZE);
    sprB.scale.set(SCALE_SIZE);
    positionSprites();
  }
  window.addEventListener("resize", onResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
