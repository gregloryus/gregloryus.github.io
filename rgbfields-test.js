// Headless test of rgbfields-16 simulation logic
const COLS = 128;
const ROWS = 128;
const N = COLS * ROWS;
const MAX_R = 8;
const MAX_W = 4;

const HEAT_RISE_BIAS = 0.35;
const HEAT_DIFFUSE_PROB = 0.8;  // 80% of heat in AIR tries to move
const WATER_DIFFUSE_PROB = 0.3;  // 30% of heat in WATER tries to move
const SURFACE_HEAT_RETENTION = 0.3;
const HOT_WATER_THRESHOLD = 3;  // Lower threshold so water moves before cooling
const COLD_WATER_THRESHOLD = 1;
const TEMP_COHESION_STRENGTH = 0.7;
const WATER_SPREAD_PROB = 0.3;

let U0 = new Uint8Array(N);
let W0 = new Uint8Array(N);
const spreadOut = new Uint8Array(N);
const spreadIn = new Uint8Array(N);

// Neighbor table
const neighborOffsets = new Int32Array(N * 8);
const N_D = 0, N_U = 1, N_L = 2, N_R = 3, N_DL = 4, N_DR = 5, N_UL = 6, N_UR = 7;
const wrapX = true, wrapY = false;

for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const i = y * COLS + x;
    const base = i * 8;
    neighborOffsets[base + N_D] = y < ROWS - 1 ? i + COLS : -1;
    neighborOffsets[base + N_U] = y > 0 ? i - COLS : -1;
    neighborOffsets[base + N_L] = x > 0 ? i - 1 : wrapX ? i + COLS - 1 : -1;
    neighborOffsets[base + N_R] = x < COLS - 1 ? i + 1 : wrapX ? i - COLS + 1 : -1;

    // Diagonals
    const canD = y < ROWS - 1;
    const canU = y > 0;
    const canL = x > 0 || wrapX;
    const canR = x < COLS - 1 || wrapX;
    const xL = x > 0 ? x - 1 : wrapX ? COLS - 1 : -1;
    const xR = x < COLS - 1 ? x + 1 : wrapX ? 0 : -1;

    neighborOffsets[base + N_DL] = canD && canL ? (y + 1) * COLS + xL : -1;
    neighborOffsets[base + N_DR] = canD && canR ? (y + 1) * COLS + xR : -1;
    neighborOffsets[base + N_UL] = canU && canL ? (y - 1) * COLS + xL : -1;
    neighborOffsets[base + N_UR] = canU && canR ? (y - 1) * COLS + xR : -1;
  }
}

function getN(i, dir) { return neighborOffsets[i * 8 + dir]; }

// PRNG
let rngState = 1337;
function rand() {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
}

// Heat diffusion with wrap
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

    let dir;
    // Heat in water: equal diffusion (no convection)
    // Heat in air: upward bias (convection)
    if (W0[i] > 0) {
      const r = rand();
      dir = r < 0.25 ? N_D : r < 0.5 ? N_U : r < 0.75 ? N_L : N_R;
    } else {
      if (rand() < HEAT_RISE_BIAS) {
        dir = N_U;
      } else {
        const r2 = rand();
        dir = r2 < 0.33 ? N_D : r2 < 0.66 ? N_L : N_R;
      }
    }

    let j = getN(i, dir);

    // Wrap top to absolute bottom
    if (dir === N_U && y === 0) {
      j = (ROWS - 1) * COLS + x;
      spreadOut[i]++;
      spreadIn[j]++;
      continue;
    }

    if (j < 0) continue;

    if (U0[j] <= h) {
      spreadOut[i]++;
      spreadIn[j]++;
    }
  }

  for (let i = 0; i < N; i++) {
    U0[i] = U0[i] - spreadOut[i] + spreadIn[i];
  }
}

// Buoyancy
let hotRiseSwaps = 0, coldSinkSwaps = 0;
function applyBuoyancy() {
  // Hot rises
  for (let y = ROWS - 1; y > 0; y--) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      const above = getN(i, N_U);
      if (above < 0) continue;

      // Only water cells participate
      if (W0[i] === 0) continue;
      if (U0[i] < BUOYANCY_HEAT_THRESHOLD) continue;

      // Only swap water with water (no evaporation)
      if (W0[above] > 0) {
        if (U0[i] > U0[above] && rand() < BUOYANCY_PROB) {
          [W0[i], W0[above]] = [W0[above], W0[i]];
          [U0[i], U0[above]] = [U0[above], U0[i]];
          hotRiseSwaps++;
        }
      }
    }
  }
  // Cold sinks
  for (let y = 0; y < ROWS - 1; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      const below = getN(i, N_D);
      if (below < 0) continue;
      if (W0[i] > 0 && W0[below] > 0 && U0[i] < U0[below] && U0[below] >= BUOYANCY_HEAT_THRESHOLD) {
        if (rand() < BUOYANCY_PROB) {
          [W0[i], W0[below]] = [W0[below], W0[i]];
          [U0[i], U0[below]] = [U0[below], U0[i]];
          coldSinkSwaps++;
        }
      }
    }
  }
}

// Water physics - SIMPLIFIED: just move, ignore MAX_W
let moveUpCount = 0, moveDownCount = 0;
function applyWaterPhysics() {
  moveUpCount = 0;
  moveDownCount = 0;
  for (let y = ROWS - 2; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (W0[i] === 0) continue;

      const heat = U0[i];

      // Hot water (4+) goes up
      if (heat >= HOT_WATER_THRESHOLD) {
        const above = getN(i, N_U);
        if (above >= 0) {
          W0[i]--;
          W0[above]++;
          moveUpCount++;
        }
      }
      // Cold water sinks
      else {
        const below = getN(i, N_D);
        if (below >= 0) {
          W0[i]--;
          W0[below]++;
          moveDownCount++;
        }
      }
    }
  }
  // Spread
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

function tick() {
  applyWaterPhysics();  // Move water FIRST (before it cools)
  diffuseHeat();
}

function printSlice() {
  console.log("Row | Heat | Water");
  const col = 64;
  for (let y = 0; y < ROWS; y += 8) {
    let hSum = 0, wSum = 0;
    for (let dy = 0; dy < 8; dy++) {
      const i = (y + dy) * COLS + col;
      hSum += U0[i];
      wSum += W0[i];
    }
    const hAvg = (hSum / 8).toFixed(1).padStart(4);
    const wAvg = (wSum / 8).toFixed(1).padStart(4);
    const hBar = "█".repeat(Math.round(hSum / 8));
    const wBar = "░".repeat(Math.round(wSum / 8));
    console.log(`${String(y).padStart(3)}-${String(y+7).padStart(3)} | ${hAvg} ${hBar.padEnd(8)} | ${wAvg} ${wBar}`);
  }
}

function regionSummary() {
  let topH = 0, midH = 0, botH = 0;
  let topW = 0, midW = 0, botW = 0;
  let highestWater = ROWS;
  for (let i = 0; i < N; i++) {
    const y = (i / COLS) | 0;
    if (y < ROWS / 3) { topH += U0[i]; topW += W0[i]; }
    else if (y < 2 * ROWS / 3) { midH += U0[i]; midW += W0[i]; }
    else { botH += U0[i]; botW += W0[i]; }
    if (W0[i] > 0 && y < highestWater) highestWater = y;
  }
  console.log(`Top (0-42):     Heat=${topH}, Water=${topW}`);
  console.log(`Mid (43-84):    Heat=${midH}, Water=${midW}`);
  console.log(`Bot (85-127):   Heat=${botH}, Water=${botW}`);
  console.log(`Highest water row: ${highestWater}, Buoyancy: rise=${hotRiseSwaps}, sink=${coldSinkSwaps}`);
}

// Initialize - extreme conditions for testing
U0.fill(0);
W0.fill(0);

// Water at bottom with high heat (should form hot blobs and rise)
for (let y = Math.floor(ROWS * 0.8); y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    W0[y * COLS + x] = 3;
    U0[y * COLS + x] = 6 + Math.floor(rand() * 2); // Heat 6-7 (hot!)
  }
}

console.log("=== INITIAL STATE ===");
let waterHeat0 = 0, airHeat0 = 0, waterCells0 = 0, airCells0 = 0;
for (let i = 0; i < N; i++) {
  if (W0[i] > 0) {
    waterHeat0 += U0[i];
    waterCells0++;
  } else {
    airHeat0 += U0[i];
    airCells0++;
  }
}
console.log(`Water avg=${(waterHeat0/waterCells0).toFixed(2)}, Air avg=${(airHeat0/airCells0).toFixed(2)}`);

// Track water rising
console.log("\n=== WATER RISING TEST (cohesion) ===");

for (let t = 0; t <= 100; t++) {
  tick();
  if (t === 0 || t === 50 || t === 100) {
    console.log(`\n--- Tick ${t} ---`);
    console.log("Row | Water total");
    for (let y = 95; y < ROWS; y++) {
      let waterInRow = 0;
      for (let x = 0; x < COLS; x++) {
        waterInRow += W0[y * COLS + x];
      }
      if (waterInRow > 0) console.log(`${String(y).padStart(3)} | ${waterInRow}`);
    }
  }
}

console.log("\n=== DONE ===");
