console.log("RGB Fields CA: script loaded");

function boot() {
  console.log("RGB Fields CA: booting");
  // --- Constants ---
  const COLS = 64;
  const ROWS = 64;
  const N = COLS * ROWS;
  const MAX_R = 8;
  const MAX_W = 4; // divisible water 0..4
  const WATER_TICK_PROB = 0.1; // donor gate for water; recipient gate for air->water
  const SHOW_GRIDS = false; // set to true to show grid overlays
  // URL param "seed" sets PRNG; number of start seeds is a code constant
  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  const RNG_SEED = (isFinite(seedParam) ? seedParam : 1337) >>> 0;
  const START_SEEDS = (COLS * ROWS) / 10; // adjust here in code (single URL param reserved for ?seed)
  const START_WATERS = (COLS * ROWS) / 10; // initial water placements (start at 2 units)

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
  const SHOW_WATER_NUMBERS_DEFAULT = false; // toggle overlay for water unit counts

  // Combined-only view toggle (show only RB panel at max scale)
  let combinedOnlyView = false;

  function computeBestScaleSingle() {
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    return Math.floor(Math.min(maxW / COLS, maxH / ROWS));
  }

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
  // W divisible water field 0..4
  let W0 = new Uint8Array(N);
  let W1 = new Uint8Array(N);
  // G binary life field 0/1 with double buffer
  let G0 = new Uint8Array(N);
  let G1 = new Uint8Array(N);

  // --- Green (Life) knobs ---
  const ENABLE_SPONTANEOUS_G = false; // v1 off; single seed only
  const G_BIRTH_R_MIN = 5;
  const G_BIRTH_B_MIN = 3;
  const G_BIRTH_P_NEAR = 0.01; // near existing G
  const G_BIRTH_P_ALONE = 0.001; // no adjacent G
  const G_GROW_R_COST = 4; // consumed at parent when creating new G
  const G_GROW_B_COST = 2;
  const enableGCapillaryForWater = true; // allow B to move within G up/down with bias
  const gatesBlockAdvectionAcrossBoundary = true; // block R advection across G boundary

  // --- Persistent CA state/scratch (allocation-free per tick) ---
  // Outgoing and incoming unit counts planned this tick
  const spreadOut = new Uint8Array(N);
  const spreadIn = new Uint8Array(N);

  // --- Water flow scratch arrays ---
  const waterOut = new Uint8Array(N); // number of water units leaving (0/1)
  const waterIn = new Uint8Array(N); // number of water units entering (0/1)
  const heatOut = new Uint8Array(N); // number of heat units leaving due to advection
  const heatIn = new Uint8Array(N); // number of heat units entering due to advection
  const choice = new Int32Array(N); // target chosen by each source (-1 = none)
  const wantIn = new Uint8Array(N); // demand count per target (diagnostic)
  const accepted = new Uint8Array(N); // accepted transfers per target
  const cap = new Uint8Array(N); // water capacity per cell

  // Direction offsets for neighbor indexing
  const OFF = {
    D: COLS,
    U: -COLS,
    L: -1,
    R: 1,
    DL: COLS - 1,
    DR: COLS + 1,
    UL: -COLS - 1,
    UR: -COLS + 1,
  };

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
    if (combinedOnlyView) {
      overlayRB.x = 0;
      overlayRB.y = 0;
      return;
    }
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

  // --- Water count overlay (digits) ---
  // Tiny 3x5 bitmap digits for 1..4
  const DIGITS_3x5 = {
    1: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    2: [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
    3: [1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1],
    4: [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  };
  const waterDigits = new PIXI.Graphics();
  app.stage.addChild(waterDigits);
  let showWaterNumbers = SHOW_WATER_NUMBERS_DEFAULT;

  function drawWaterNumbers(water) {
    waterDigits.visible = !!showWaterNumbers;
    if (!showWaterNumbers) return;
    waterDigits.clear();
    waterDigits.beginFill(0xffffff, 0.5);
    const tileSize = SCALE_SIZE;
    if (tileSize <= 1) {
      waterDigits.endFill();
      return;
    }
    const dot = Math.max(1, Math.floor(tileSize / 5));
    const glyphW = 3 * dot;
    const glyphH = 5 * dot;
    const offsetXInTile = Math.floor((tileSize - glyphW) / 2);
    const offsetYInTile = Math.floor((tileSize - glyphH) / 2);
    // Draw on water-only panel normally; on combined-only view, draw on RB panel
    const targetPanel = combinedOnlyView ? sprRB : sprB;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const w = water[i] | 0;
        if (w <= 0) continue;
        const glyph = DIGITS_3x5[w];
        if (!glyph) continue;
        const baseX = targetPanel.x + x * tileSize + offsetXInTile;
        const baseY = targetPanel.y + y * tileSize + offsetYInTile;
        for (let gy = 0; gy < 5; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            if (glyph[gy * 3 + gx]) {
              waterDigits.drawRect(
                baseX + gx * dot,
                baseY + gy * dot,
                dot,
                dot
              );
            }
          }
        }
      }
    }
    waterDigits.endFill();
  }

  // --- Helpers ---
  const IX = (x, y) => y * COLS + x;

  // Per-axis wrapping controls (default: wrap left/right, don't wrap top/bottom)
  let wrapX = true;
  let wrapY = false;

  // Toggle: whether heat influences water flow direction selection
  let heatAffectsWater = true;

  // --- Advection knobs (easy to tweak) ---
  // Master switch for heat advection (heat carried with water moves)
  let advectionEnabled = true;
  // If true, use a fixed probability for advection; otherwise use pCarry(u)
  let advectionUseFixedProb = true; // default to deterministic advection
  // Fixed probability used when advectionUseFixedProb is true (0..1)
  let advectionFixedProb = 1.0; // move heat on every accepted water move
  // If true, move as many heat units as capacity allows (up to source heat)
  let advectionMoveAllHeat = true; // move all available heat by default
  // If advectionMoveAllHeat is false, maximum number of heat units to move per accepted water move
  let advectionUnitsPerMove = 1;

  // Neighbor indexing with per-axis wrapping
  function neighborIndex(x, y, dx, dy) {
    let nx = x + dx;
    let ny = y + dy;
    if (wrapX) {
      if (nx < 0) nx = COLS - 1;
      else if (nx >= COLS) nx = 0;
    } else {
      if (nx < 0 || nx >= COLS) return -1;
    }
    if (wrapY) {
      if (ny < 0) ny = ROWS - 1;
      else if (ny >= ROWS) ny = 0;
    } else {
      if (ny < 0 || ny >= ROWS) return -1;
    }
    return IX(nx, ny);
  }

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

  const WATER_TO_BYTE = new Uint8Array([0, 63, 127, 191, 255]);

  function updateTextures(units, water, green) {
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
    // Center: R, G, and W
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const u = units[i] & 0xff;
      const rByte = u >= 8 ? 255 : UNIT_TO_BYTE[u];
      rgbaRB[j + 0] = rByte;
      rgbaRB[j + 1] = green && green[i] ? 255 : 0;
      rgbaRB[j + 2] = WATER_TO_BYTE[water[i]];
      rgbaRB[j + 3] = 255;
    }
    if (texRB.baseTexture && typeof texRB.baseTexture.update === "function") {
      texRB.baseTexture.update();
    }
    // Right: W only
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      rgbaB[j + 0] = 0;
      rgbaB[j + 1] = 0;
      rgbaB[j + 2] = WATER_TO_BYTE[water[i]];
      rgbaB[j + 3] = 255;
    }
    if (texB.baseTexture && typeof texB.baseTexture.update === "function") {
      texB.baseTexture.update();
    }
    // Update water digit overlay
    drawWaterNumbers(water);
  }

  // Red diffusion: donor-gated random-walk to one random neighbor if cooler
  function diffuseRed(src, dst, water, green) {
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
        if (water[i] > 0 && rand() >= WATER_TICK_PROB) continue;

        // Pick direction with bias when inside G: favor up over down (~2x)
        let dir;
        if (green && green[i]) {
          const r = rand();
          dir = r < 0.4 ? 0 : r < 0.7 ? 2 : r < 0.85 ? 1 : 3; // up,down,right,left
        } else {
          // 0=up,1=right,2=down,3=left
          dir = (rand() * 4) | 0;
        }
        const j =
          dir === 0
            ? neighborIndex(x, y, 0, -1)
            : dir === 1
            ? neighborIndex(x, y, 1, 0)
            : dir === 2
            ? neighborIndex(x, y, 0, 1)
            : neighborIndex(x, y, -1, 0);
        if (j < 0) continue;
        const t = src[j];
        if (t >= s) continue; // only to cooler

        // Recipient gate only for air -> water crossings
        if (water[i] === 0 && water[j] > 0 && rand() >= WATER_TICK_PROB)
          continue;
        // G-aware gating: no leaking from G -> non-G; allow env -> G freely; allow inside G
        if (green) {
          const gi = green[i] !== 0;
          const gj = green[j] !== 0;
          if (gi && !gj) continue;
        }

        spreadOut[i] += 1;
        spreadIn[j] += 1;
      }
    }

    // Apply planned transfers
    for (let i = 0; i < N; i++) {
      dst[i] = src[i] - spreadOut[i] + spreadIn[i];
    }
  }

  // Water transfer eligibility
  function canTransferWater(source, target) {
    if (target >= MAX_W) return false; // target full
    const diff = source - target;
    return diff >= 2 || (source >= 3 && diff >= 1);
  }

  // Heat-graded direction schedule
  function buildDirections(x, y, heat, W_src) {
    const dirs = [];
    function idx(dx, dy) {
      return neighborIndex(x, y, dx, dy);
    }
    function orderPair(a, b) {
      if (a < 0 || b < 0) return [a, b];
      const Wa = W_src[a] || 0,
        Wb = W_src[b] || 0;
      if (Wa < Wb) return [a, b];
      if (Wb < Wa) return [b, a];
      return rand() < 0.5 ? [a, b] : [b, a];
    }
    switch (heat) {
      case 0:
        dirs.push(idx(0, 1));
        break;
      case 1:
        dirs.push(idx(0, 1));
        if (rand() < 0.5) {
          const [dl, dr] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl, dr);
        }
        break;
      case 2:
        dirs.push(idx(0, 1));
        {
          const [dl2, dr2] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl2, dr2);
        }
        break;
      case 3:
        dirs.push(idx(0, 1));
        {
          const [dl3, dr3] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl3, dr3);
        }
        if (rand() < 0.5) {
          const [l3, r3] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l3, r3);
        }
        break;
      case 4:
        dirs.push(idx(0, 1));
        {
          const [dl4, dr4] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl4, dr4);
        }
        {
          const [l4, r4] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l4, r4);
        }
        break;
      case 5:
        dirs.push(idx(0, 1));
        {
          const [dl5, dr5] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl5, dr5);
        }
        {
          const [l5, r5] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l5, r5);
        }
        if (rand() < 0.5) {
          const [ul5, ur5] = orderPair(idx(-1, -1), idx(1, -1));
          dirs.push(ul5, ur5);
        }
        break;
      case 6:
        dirs.push(idx(0, 1));
        {
          const [dl6, dr6] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl6, dr6);
        }
        {
          const [l6, r6] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l6, r6);
        }
        {
          const [ul6, ur6] = orderPair(idx(-1, -1), idx(1, -1));
          dirs.push(ul6, ur6);
        }
        break;
      case 7:
        dirs.push(idx(0, 1));
        {
          const [dl7, dr7] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl7, dr7);
        }
        {
          const [l7, r7] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l7, r7);
        }
        {
          const [ul7, ur7] = orderPair(idx(-1, -1), idx(1, -1));
          dirs.push(ul7, ur7);
        }
        dirs.push(idx(0, -1));
        break;
      default:
        dirs.push(idx(0, -1));
        {
          const [ul8, ur8] = orderPair(idx(-1, -1), idx(1, -1));
          dirs.push(ul8, ur8);
        }
        {
          const [l8, r8] = orderPair(idx(-1, 0), idx(1, 0));
          dirs.push(l8, r8);
        }
        {
          const [dl8, dr8] = orderPair(idx(-1, 1), idx(1, 1));
          dirs.push(dl8, dr8);
        }
        dirs.push(idx(0, 1));
        break;
    }
    if (dirs.length > 5) dirs.length = 5;
    return dirs.filter((i) => i >= 0);
  }

  function pCarry(u) {
    return Math.min(0.4, 0.05 + 0.04 * u);
  }

  function flowWater(W_src, W_dst, U, tickCount, green) {
    W_dst.set(W_src);
    waterOut.fill(0);
    waterIn.fill(0);
    heatOut.fill(0);
    heatIn.fill(0);
    choice.fill(-1);
    wantIn.fill(0);
    accepted.fill(0);
    for (let i = 0; i < N; i++) {
      cap[i] = MAX_W - W_src[i];
    }

    const flip = (tickCount & 1) !== 0;

    // PASS 1: each source chooses one target
    for (let y = 0; y < ROWS; y++) {
      const leftToRight = ((y & 1) === 0) ^ flip;
      const xStart = leftToRight ? 0 : COLS - 1;
      const xEnd = leftToRight ? COLS : -1;
      const xStep = leftToRight ? 1 : -1;
      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = y * COLS + x;
        const w = W_src[i];
        if (w === 0) continue;

        // Quick capacity precheck
        let hasCapacity = false;
        const neighborDeltas = [
          [0, 1],
          [0, -1],
          [-1, 0],
          [1, 0],
          [-1, 1],
          [1, 1],
          [-1, -1],
          [1, -1],
        ];
        for (let k = 0; k < neighborDeltas.length; k++) {
          const [dx, dy] = neighborDeltas[k];
          const n = neighborIndex(x, y, dx, dy);
          if (n >= 0 && W_src[n] < MAX_W) {
            hasCapacity = true;
            break;
          }
        }
        if (!hasCapacity) continue;

        const heat = heatAffectsWater ? U[i] : 4; // neutral schedule when off
        let dirs = buildDirections(x, y, heat, W_src);
        // Within G, bias schedule to prefer down (twice) and include up early
        if (green && green[i]) {
          const up = neighborIndex(x, y, 0, -1);
          const down = neighborIndex(x, y, 0, 1);
          const prefer = [];
          if (down >= 0) {
            prefer.push(down, down); // 2x down
          }
          if (up >= 0) {
            prefer.push(up); // ensure up appears early
          }
          const seen = new Set();
          const merged = [];
          for (let k = 0; k < prefer.length; k++) {
            const v = prefer[k];
            if (v >= 0 && !seen.has(v)) {
              merged.push(v);
              seen.add(v);
            }
          }
          for (let k = 0; k < dirs.length; k++) {
            const v = dirs[k];
            if (v >= 0 && !seen.has(v)) {
              merged.push(v);
              seen.add(v);
            }
          }
          if (merged.length > 0)
            dirs = merged.slice(0, Math.min(5, merged.length));
        }
        for (let k = 0; k < dirs.length; k++) {
          const j = dirs[k];
          if (j < 0) continue;
          const targetW = W_src[j];
          // G-aware gating: block G->non-G; allow non-G->G
          if (green) {
            const gi = green[i] !== 0;
            const gj = green[j] !== 0;
            if (gi && !gj) continue;
          }
          // Relaxed gravity: always allow straight-down if target has capacity
          const downIndex = neighborIndex(x, y, 0, 1);
          if (j === downIndex && targetW < MAX_W) {
            choice[i] = j;
            wantIn[j]++;
            break;
          }
          if (canTransferWater(w, targetW)) {
            choice[i] = j;
            wantIn[j]++;
            break;
          }
        }
      }
    }

    // PASS 2: accept transfers up to capacity; conservative heat advection
    for (let y = 0; y < ROWS; y++) {
      const leftToRight = ((y & 1) === 0) ^ flip;
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
          waterIn[j] += 1;

          // heat advection: configurable via knobs above
          if (advectionEnabled && U[i] > 0) {
            // Optionally block advection across G boundary
            if (
              gatesBlockAdvectionAcrossBoundary &&
              green &&
              (green[i] !== 0) ^ (green[j] !== 0)
            ) {
              // skip advection across G boundary
            } else {
              const prob = advectionUseFixedProb
                ? advectionFixedProb
                : pCarry(U[i]);
              if (rand() < prob) {
                // compute how many units we can move this step
                const availableSourceHeat = U[i] - heatOut[i];
                const availableCapacityAtTarget = MAX_R - U[j] - heatIn[j];
                if (availableSourceHeat > 0 && availableCapacityAtTarget > 0) {
                  const desiredUnits = advectionMoveAllHeat
                    ? availableSourceHeat
                    : Math.max(
                        0,
                        Math.min(advectionUnitsPerMove, availableSourceHeat)
                      );
                  const unitsToMove = Math.min(
                    desiredUnits,
                    availableCapacityAtTarget
                  );
                  if (unitsToMove > 0) {
                    heatOut[i] += unitsToMove;
                    heatIn[j] += unitsToMove;
                  }
                }
              }
            }
          }
        }
      }
    }

    // APPLY: conservation for water and heat
    for (let i = 0; i < N; i++) {
      W_dst[i] = W_src[i] - waterOut[i] + waterIn[i];
      const uNext = U[i] - heatOut[i] + heatIn[i];
      U[i] = uNext < 0 ? 0 : uNext > MAX_R ? MAX_R : uNext;
    }
  }

  function advanceTick() {
    // Environment first
    flowWater(W0, W1, U0, ticks, G0);
    [W0, W1] = [W1, W0];
    diffuseRed(U0, U1, W0, G0);
    [U0, U1] = [U1, U0];
    // Life (birth/grow/death)
    birthGreen(U0, W0, G0, G1);
    growGreen(U0, W0, G0, G1);
    [G0, G1] = [G1, G0];
    killGreen(U0, W0, G0);
    // Render
    updateTextures(U0, W0, G0);
    ticks++;
  }

  // --- Green (Life) functions ---
  function birthGreen(R, B, G_src, G_dst) {
    if (!ENABLE_SPONTANEOUS_G) return;
    G_dst.set(G_src);
    for (let i = 0; i < N; i++) {
      if (G_src[i]) continue;
      const r = R[i] | 0;
      const b = B[i] | 0;
      if (r < G_BIRTH_R_MIN || b < G_BIRTH_B_MIN) continue;
      // neighbor check (Moore)
      let nearG = false;
      const x = i % COLS;
      const y = (i / COLS) | 0;
      for (let dy = -1; dy <= 1 && !nearG; dy++) {
        for (let dx = -1; dx <= 1 && !nearG; dx++) {
          if (dx === 0 && dy === 0) continue;
          const j = neighborIndex(x, y, dx, dy);
          if (j >= 0 && G_src[j]) nearG = true;
        }
      }
      const p = nearG ? G_BIRTH_P_NEAR : G_BIRTH_P_ALONE;
      if (rand() < p) G_dst[i] = 1;
    }
  }

  function growGreen(R, B, G_src, G_dst) {
    G_dst.set(G_src);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (!G_src[i]) continue;
        const below = neighborIndex(x, y, 0, 1);
        const above = neighborIndex(x, y, 0, -1);
        if (below < 0 || above < 0) continue;
        // bud: exactly one G neighbor and it's below; attempt up only (v1)
        if (G_src[below] && !G_src[above]) {
          if ((R[i] | 0) >= G_GROW_R_COST && (B[i] | 0) >= G_GROW_B_COST) {
            // create new cell above, consume at parent
            G_dst[above] = 1;
            const rNew = (R[i] | 0) - G_GROW_R_COST;
            const bNew = (B[i] | 0) - G_GROW_B_COST;
            R[i] = rNew < 0 ? 0 : rNew > MAX_R ? MAX_R : rNew;
            B[i] = bNew < 0 ? 0 : bNew > MAX_W ? MAX_W : bNew;
          }
        }
      }
    }
  }

  // --- Initialization ---
  U0.fill(0);
  W0.fill(0);
  G0.fill(0);
  G1.fill(0);
  const chosen = new Set();
  const SEEDS_TO_PLACE = Math.min(START_SEEDS, N);
  while (chosen.size < SEEDS_TO_PLACE) {
    const idx = (rand() * N) | 0;
    if (!chosen.has(idx)) chosen.add(idx);
  }
  const seedCoords = [];
  for (const idx of chosen) {
    U0[idx] = 8; // 8 units -> 255 display
    seedCoords.push({ x: idx % COLS, y: (idx / COLS) | 0, i: idx });
  }
  console.log(
    `Initialized grid ${COLS}x${ROWS}. Seeds=${SEEDS_TO_PLACE}`,
    seedCoords
  );
  // Place initial water for visibility
  const waterChosen = new Set();
  while (waterChosen.size < Math.min(START_WATERS, N)) {
    const idx = (rand() * N) | 0;
    if (!waterChosen.has(idx)) waterChosen.add(idx);
  }
  for (const wi of waterChosen) W0[wi] = 4; // start with 2 units for visibility
  console.log(
    "Water seeds at:",
    Array.from(waterChosen).slice(0, 50),
    waterChosen.size > 50 ? `... (+${waterChosen.size - 50} more)` : ""
  );
  // Place a single initial G seed at center
  {
    const sx = COLS >> 1;
    const sy = ROWS >> 1;
    const si = IX(sx, sy);
    // Create a parent-bud pair so the upper cell is a bud with a G below
    const below = neighborIndex(sx, sy, 0, 1);
    if (below >= 0) {
      G0[si] = 1; // bud (upper)
      G0[below] = 1; // parent (lower)
    } else {
      G0[si] = 1;
    }
    // Ensure the bud has enough resources to grow at least once
    const needR = G_GROW_R_COST;
    const needB = G_GROW_B_COST;
    if ((U0[si] | 0) < needR) U0[si] = needR;
    if ((W0[si] | 0) < needB) W0[si] = needB;
  }
  updateTextures(U0, W0, G0);

  // --- Controls ---
  let paused = false;
  let ticks = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") {
      paused = !paused;
    }
    if (e.key === "n" || e.key === "N") {
      showWaterNumbers = !showWaterNumbers;
      drawWaterNumbers(W0);
    }
    if (e.key === "h" || e.key === "H") {
      heatAffectsWater = !heatAffectsWater;
      console.log(`heatAffectsWater: ${heatAffectsWater ? "ON" : "OFF"}`);
    }
    if (e.key === "x" || e.key === "X") {
      wrapX = !wrapX;
      console.log(`wrapX (left/right): ${wrapX ? "ON" : "OFF"}`);
    }
    if (e.key === "y" || e.key === "Y") {
      wrapY = !wrapY;
      console.log(`wrapY (top/bottom): ${wrapY ? "ON" : "OFF"}`);
    }
    if (e.key === "v" || e.key === "V") {
      combinedOnlyView = !combinedOnlyView;
      // hide/show sprites accordingly
      sprR.visible = !combinedOnlyView;
      sprB.visible = !combinedOnlyView;
      sprRB.visible = true;
      onResize();
      console.log(`combinedOnlyView: ${combinedOnlyView ? "ON" : "OFF"}`);
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
    if (e.key === "w" || e.key === "W") {
      let totalUnits = 0;
      const levelCounts = new Uint32Array(MAX_W + 1);
      let wetCells = 0;
      for (let i = 0; i < N; i++) {
        const w = W0[i] | 0;
        levelCounts[w]++;
        if (w > 0) wetCells++;
        totalUnits += w;
      }
      const fullRowsEquivalent = totalUnits / (COLS * MAX_W);
      console.log(
        `W stats -> totalUnits:${totalUnits} (~${fullRowsEquivalent.toFixed(
          2
        )} full rows) wetCells:${wetCells} levels:${Array.from(
          levelCounts
        ).join(",")}`
      );
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
    const singleScale = computeBestScaleSingle();
    const desiredScale = combinedOnlyView ? singleScale : best.scale;
    const newScale = Math.max(1, desiredScale);
    SCALE_SIZE = newScale;
    LAYOUT = best;
    const newWidth = combinedOnlyView
      ? COLS * SCALE_SIZE
      : (LAYOUT.mode === "row"
          ? COLS * 3
          : LAYOUT.mode === "twoRow"
          ? COLS * 2
          : COLS) * SCALE_SIZE;
    const newHeight = combinedOnlyView
      ? ROWS * SCALE_SIZE
      : (LAYOUT.mode === "row"
          ? ROWS
          : LAYOUT.mode === "twoRow"
          ? ROWS * 2
          : ROWS * 3) * SCALE_SIZE;
    app.renderer.resize(newWidth, newHeight);
    sprR.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprRB.scale.set(SCALE_SIZE, SCALE_SIZE);
    sprB.scale.set(SCALE_SIZE, SCALE_SIZE);
    positionSpritesByLayout();
    if (SHOW_GRIDS) {
      redrawOverlay(overlayR);
      redrawOverlay(overlayRB);
      redrawOverlay(overlayB);
      positionOverlaysByLayout();
      overlayR.visible = !combinedOnlyView;
      overlayB.visible = !combinedOnlyView;
      overlayRB.visible = true;
    }
    // Repaint overlay to match new positions/scale
    drawWaterNumbers(W0);
  }
  window.addEventListener("resize", onResize);

  function killGreen(R, B, G_dst) {
    for (let i = 0; i < N; i++) {
      if (G_dst[i] && R[i] === 0 && B[i] === 0) {
        G_dst[i] = 0;
      }
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
