console.log("RGB Fields v17: Temperature-based Cohesion (Lava Lamp Blobs)");

function boot() {
  const COLS = 128;
  const ROWS = 128;
  const N = COLS * ROWS;
  const MAX_R = 8;
  const MAX_W = 4;

  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  const RNG_SEED = (isFinite(seedParam) ? seedParam : 1337) >>> 0;

  // --- Heat physics: hot air rises, wraps top→bottom ---
  const HEAT_RISE_BIAS = 0.35; // Probability heat moves UP vs other directions
  const HEAT_DIFFUSE_PROB = 0.8; // 80% of heat in AIR tries to move each tick
  const WATER_DIFFUSE_PROB = 0.3; // 30% of heat in WATER tries to move (2.6x slower than air)

  // --- Water physics ---
  const WATER_SPREAD_PROB = 0.3;
  const HOT_WATER_THRESHOLD = 3; // Heat >= 3: rises

  // --- Green ---
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
    let mode = "twoRow",
      scale = scaleTwo;
    if (scaleRow >= scale && scaleRow >= scaleCol) {
      mode = "row";
      scale = scaleRow;
    } else if (scaleCol >= scale) {
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

  // --- PIXI ---
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
  if (app.view) app.view.style.imageRendering = "pixelated";
  if (app.renderer) app.renderer.roundPixels = true;

  // --- Fields ---
  let U0 = new Uint8Array(N);
  let W0 = new Uint8Array(N);
  let G0 = new Uint8Array(N);
  let G1 = new Uint8Array(N);

  // --- Scratch ---
  const spreadOut = new Uint8Array(N);
  const spreadIn = new Uint8Array(N);

  // --- Neighbor table ---
  let wrapX = true,
    wrapY = false;
  const neighborOffsets = new Int32Array(N * 8);
  const N_D = 0,
    N_U = 1,
    N_L = 2,
    N_R = 3,
    N_DL = 4,
    N_DR = 5,
    N_UL = 6,
    N_UR = 7;

  function rebuildNeighborTable() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const base = i * 8;
        neighborOffsets[base + N_D] = y < ROWS - 1 ? i + COLS : wrapY ? x : -1;
        neighborOffsets[base + N_U] =
          y > 0 ? i - COLS : wrapY ? (ROWS - 1) * COLS + x : -1;
        neighborOffsets[base + N_L] = x > 0 ? i - 1 : wrapX ? i + COLS - 1 : -1;
        neighborOffsets[base + N_R] =
          x < COLS - 1 ? i + 1 : wrapX ? i - COLS + 1 : -1;
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

  function getN(i, dir) {
    return neighborOffsets[i * 8 + dir];
  }

  // --- PRNG ---
  let rngState = (function (x) {
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return (x ^ (x >>> 16)) >>> 0;
  })(RNG_SEED);

  function rand() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
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
    if (combinedOnlyView) {
      sprRB.x = sprRB.y = 0;
      return;
    }
    const gw = COLS * SCALE_SIZE,
      gh = ROWS * SCALE_SIZE;
    if (LAYOUT.mode === "row") {
      sprR.x = 0;
      sprR.y = 0;
      sprRB.x = gw;
      sprRB.y = 0;
      sprB.x = gw * 2;
      sprB.y = 0;
    } else if (LAYOUT.mode === "twoRow") {
      sprRB.x = Math.floor((2 * gw - gw) / 2);
      sprRB.y = 0;
      sprR.x = 0;
      sprR.y = gh;
      sprB.x = gw;
      sprB.y = gh;
    } else {
      sprR.x = 0;
      sprR.y = 0;
      sprRB.x = 0;
      sprRB.y = gh;
      sprB.x = 0;
      sprB.y = gh * 2;
    }
  }
  positionSprites();
  app.stage.addChild(sprR, sprRB, sprB);

  function updateTextures() {
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const r = UNIT_TO_BYTE[U0[i]];
      const w = WATER_TO_BYTE[Math.min(W0[i], 4)]; // Clamp water display to max
      rgbaR[j] = r;
      rgbaR[j + 1] = 0;
      rgbaR[j + 2] = 0;
      rgbaR[j + 3] = 255;
      rgbaRB[j] = r;
      rgbaRB[j + 1] = G0[i] ? 255 : 0;
      rgbaRB[j + 2] = w;
      rgbaRB[j + 3] = 255;
      rgbaB[j] = 0;
      rgbaB[j + 1] = 0;
      rgbaB[j + 2] = w;
      rgbaB[j + 3] = 255;
    }
    texR.baseTexture.update();
    texRB.baseTexture.update();
    texB.baseTexture.update();
  }

  // --- Get total heat ---
  function getTotalHeat() {
    let sum = 0;
    for (let i = 0; i < N; i++) sum += U0[i];
    return sum;
  }

  // --- Heat diffusion with upward bias (hot air rises) ---
  // Boundary rule: heat exiting top appears at bottom (convection loop)
  function diffuseHeat() {
    spreadOut.fill(0);
    spreadIn.fill(0);

    for (let i = 0; i < N; i++) {
      const h = U0[i];
      if (h === 0) continue;

      const y = (i / COLS) | 0;
      const x = i % COLS;

      // Heat moves slower in water (20%) than in air (80%)
      const diffuseProb = W0[i] > 0 ? WATER_DIFFUSE_PROB : HEAT_DIFFUSE_PROB;
      if (rand() > diffuseProb) continue;

      // Direction selection
      let dir;
      // Heat in water: equal diffusion (no convection)
      // Heat in air: upward bias (convection)
      if (W0[i] > 0) {
        const r = rand();
        dir = r < 0.25 ? N_D : r < 0.5 ? N_U : r < 0.75 ? N_L : N_R;
      } else {
        const r = rand();
        if (r < HEAT_RISE_BIAS) {
          dir = N_U; // Try to go up
        } else {
          const r2 = rand();
          dir = r2 < 0.33 ? N_D : r2 < 0.66 ? N_L : N_R;
        }
      }

      let j = getN(i, dir);

      // Boundary condition: heat at top wraps to absolute bottom
      // (convection loop - heat rises, wraps, heats water at bottom)
      if (dir === N_U && y === 0) {
        j = (ROWS - 1) * COLS + x;
        spreadOut[i]++;
        spreadIn[j]++;
        continue;
      }

      if (j < 0) continue;

      // Normal diffusion: move to cooler OR same temp
      if (U0[j] <= h) {
        spreadOut[i]++;
        spreadIn[j]++;
      }
    }

    for (let i = 0; i < N; i++) {
      U0[i] = U0[i] - spreadOut[i] + spreadIn[i];
    }
  }

  // --- Water gravity and spreading ---
  function applyWaterPhysics() {
    // Simple: hot water rises, cold water sinks (with MAX_W limit)
    for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (W0[i] === 0) continue;

        const heat = U0[i];

        // Hot water (3+) rises - but only if destination has room
        if (heat >= HOT_WATER_THRESHOLD) {
          const above = getN(i, N_U);
          if (above >= 0 && W0[above] < MAX_W && rand() < 0.5) {
            W0[i]--;
            W0[above]++;
          }
        }
        // Cold water sinks - but only if destination has room
        else {
          const below = getN(i, N_D);
          if (below >= 0 && W0[below] < MAX_W && rand() < 0.5) {
            W0[i]--;
            W0[below]++;
          }
        }
      }
    }

    // Spreading
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (W0[i] < 2) continue;

        const neighbor = rand() < 0.5 ? getN(i, N_L) : getN(i, N_R);
        if (neighbor < 0) continue;

        if (W0[i] > W0[neighbor] + 1 && rand() < WATER_SPREAD_PROB) {
          W0[i]--;
          W0[neighbor]++;
        }
      }
    }
  }

  // --- Green ---
  function updateGreen() {
    G1.set(G0);
    for (let i = 0; i < N; i++) {
      if (!G0[i]) continue;
      const below = getN(i, N_D);
      const above = getN(i, N_U);
      if (below < 0 || above < 0) continue;
      if (
        G0[below] &&
        !G0[above] &&
        U0[i] >= G_GROW_R_COST &&
        W0[i] >= G_GROW_B_COST
      ) {
        G1[above] = 1;
        U0[i] -= G_GROW_R_COST;
        W0[i] -= G_GROW_B_COST;
      }
    }
    [G0, G1] = [G1, G0];
    for (let i = 0; i < N; i++) {
      if (G0[i] && U0[i] === 0 && W0[i] === 0) G0[i] = 0;
    }
  }

  // --- Main tick ---
  function advanceTick() {
    applyWaterPhysics(); // Water moves (hot rises, cold sinks) - BEFORE cooling
    diffuseHeat(); // Heat rises, wraps top→bottom
    updateGreen();
    updateTextures();
    ticks++;
  }

  // --- Initialization ---
  U0.fill(0);
  W0.fill(0);
  G0.fill(0);

  // Heat at absolute bottom (heat source)
  for (let y = Math.floor(ROWS * 0.9); y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      U0[y * COLS + x] = 6 + ((rand() * 2) | 0); // Heat 6-7
    }
  }

  // Water at bottom (will heat up and rise)
  for (let y = Math.floor(ROWS * 0.8); y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      W0[y * COLS + x] = 3; // Dense water layer
    }
  }

  // No green seed (to preserve heat conservation)

  console.log(
    `v17: ${COLS}x${ROWS}, simple convection (hot rises, cold sinks), initial: ${getTotalHeat()}`
  );
  console.log(
    "Water at bottom heats up & rises (3+). Movement before diffusion. Press 'c'/'d' for stats."
  );
  updateTextures();

  // --- Controls ---
  let paused = false;
  let ticks = 0;

  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") paused = !paused;
    if (e.key === " ") {
      if (paused) advanceTick();
      e.preventDefault();
    }
    if (e.key === "c" || e.key === "C") {
      const hSum = getTotalHeat();
      const wSum = W0.reduce((a, b) => a + b, 0);
      const gSum = G0.reduce((a, b) => a + b, 0);
      console.log(
        `Tick ${ticks} | Heat: ${hSum} (conserved) | Water: ${wSum} | Green: ${gSum}`
      );
    }
    if (e.key === "d" || e.key === "D") {
      // Diagnostic: vertical slice at center (columns 62-65, averaged)
      console.log("=== Vertical Slice (rows 0-127, cols 62-65 avg) ===");
      console.log("Row | Heat | Water | Visual");
      const sliceCols = [62, 63, 64, 65];
      for (let y = 0; y < ROWS; y += 4) {
        // Sample every 4 rows
        let hAvg = 0,
          wAvg = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (const x of sliceCols) {
            const i = (y + dy) * COLS + x;
            hAvg += U0[i];
            wAvg += W0[i];
          }
        }
        hAvg = (hAvg / 16).toFixed(1);
        wAvg = (wAvg / 16).toFixed(1);
        const hBar = "█".repeat(Math.min(10, Math.round(hAvg)));
        const wBar = "▓".repeat(Math.min(10, Math.round(wAvg)));
        console.log(
          `${String(y).padStart(3)} | ${hAvg.padStart(4)} | ${wAvg.padStart(
            5
          )} | H:${hBar.padEnd(10)} W:${wBar}`
        );
      }
      // Summary by region
      let topH = 0,
        midH = 0,
        botH = 0;
      let topW = 0,
        midW = 0,
        botW = 0;
      for (let i = 0; i < N; i++) {
        const y = (i / COLS) | 0;
        if (y < ROWS / 3) {
          topH += U0[i];
          topW += W0[i];
        } else if (y < (2 * ROWS) / 3) {
          midH += U0[i];
          midW += W0[i];
        } else {
          botH += U0[i];
          botW += W0[i];
        }
      }
      console.log("=== Region Summary ===");
      console.log(`Top third:    Heat=${topH}, Water=${topW}`);
      console.log(`Middle third: Heat=${midH}, Water=${midW}`);
      console.log(`Bottom third: Heat=${botH}, Water=${botW}`);
    }
    if (e.key === "v" || e.key === "V") {
      combinedOnlyView = !combinedOnlyView;
      sprR.visible = sprB.visible = !combinedOnlyView;
      onResize();
    }
  });

  // --- Loop ---
  setInterval(() => {
    if (!paused) advanceTick();
  }, 16);
  function mainLoop() {
    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }
  mainLoop();

  // --- Resize ---
  function onResize() {
    LAYOUT = computeBestLayout();
    SCALE_SIZE = Math.max(
      1,
      combinedOnlyView ? computeBestScaleSingle() : LAYOUT.scale
    );
    const w = combinedOnlyView
      ? COLS * SCALE_SIZE
      : (LAYOUT.mode === "row"
          ? COLS * 3
          : LAYOUT.mode === "twoRow"
          ? COLS * 2
          : COLS) * SCALE_SIZE;
    const h = combinedOnlyView
      ? ROWS * SCALE_SIZE
      : (LAYOUT.mode === "row"
          ? ROWS
          : LAYOUT.mode === "twoRow"
          ? ROWS * 2
          : ROWS * 3) * SCALE_SIZE;
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
