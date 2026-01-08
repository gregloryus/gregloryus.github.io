// Timaeus-3.js — Platonic Elements Simulation with Heat Field
// Based on Plato's Timaeus: Earth:Water::Water:Air::Air:Fire (1:2:4:8 ratio)
// Mass per unit: Earth=8, Water=4, Air=2, Fire=1
// Heat field (0-7) drives transformations and movement bias

console.log("Timaeus-2: script loaded");

function boot() {
  console.log("Timaeus-2: booting");

  // === CONFIGURATION ===
  const SCALE_SIZE = 4; // Pixels per cell
  const container = document.getElementById("canvas-div");
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const COLS = Math.max(1, Math.floor(maxW / SCALE_SIZE));
  const ROWS = Math.max(1, Math.floor(maxH / SCALE_SIZE));
  const N = COLS * ROWS;
  const MAX_MASS = 8; // Maximum mass per cell
  const MAX_HEAT = 7; // Heat range 0-7

  // Starting fill percentage (0.0 to 1.0)
  let fillPercent = 0.3;

  // Mass per unit of each element
  const MASS = { E: 8, W: 4, A: 2, F: 1 };

  // Element colors (RGB) - designed for heat overlay compatibility
  const COLORS = {
    E: { r: 34, g: 139, b: 34 },   // Earth: forest green
    W: { r: 0, g: 206, b: 209 },   // Water: cyan/teal
    A: { r: 211, g: 211, b: 211 }, // Air: light gray
    F: { r: 255, g: 140, b: 0 },   // Fire: orange
  };

  // === HEAT-BASED TRANSFORMATION SETTINGS ===
  // Thresholds (on 0-7 scale)
  const HEAT_THRESH = {
    EARTH_TO_WATER: 7,   // Earth melts ONLY at max heat
    WATER_TO_EARTH: 1,   // Water freezes only when very cold
    WATER_TO_AIR: 5,     // Water evaporates at moderate-high heat
    AIR_TO_WATER: 2,     // Air condenses when cool
    AIR_TO_FIRE: 7,      // Air ignites only at max heat (rare!)
    FIRE_TO_AIR: 4,      // Fire cools readily
  };

  // Base transformation chances (scale with distance from threshold)
  let TRANSFORM_CHANCE = {
    EARTH_TO_WATER: 0.008, // VERY slow melting - Earth persists as base layer
    WATER_TO_EARTH: 0.02,  // Slow freezing
    WATER_TO_AIR: 0.04,    // Moderate evaporation
    AIR_TO_WATER: 0.05,    // Moderate condensation
    AIR_TO_FIRE: 0.02,     // Rare ignition
    FIRE_TO_AIR: 0.20,     // Fire cools easily
  };

  // Chance scaling factor (how much extra chance per heat level beyond threshold)
  const CHANCE_SCALE = 0.3;

  // === HEAT DIFFUSION SETTINGS ===
  const HEAT_DIFFUSE_BASE = 0.3; // Base chance to diffuse heat
  const HEAT_DIFFUSE_MOD = {
    EMPTY: 1.0,
    E: 0.05, // Earth: VERY slow diffusion (heats up gradually)
    W: 0.15, // Water: slow diffusion
    A: 0.5,  // Air: medium diffusion
    F: 1.5,  // Fire: fast diffusion (radiates)
  };

  // Heat sources (sinks happen naturally when heat diffuses off canvas edges)
  let heatSourcesEnabled = false; // OFF by default - press S to enable
  let HEAT_SOURCE_RATE = 0.08;  // Gentle heat injection - Earth should persist
  let HEAT_SOURCE_AMOUNT = 1;   // How much heat to add (1-7, use +/- keys)

  // === MOVEMENT SETTINGS ===
  const HEAT_MOVEMENT_BIAS = 0.4; // Strength of heat influence on Air/Fire
  const HEAT_NEUTRAL = 3; // Heat level considered "neutral" for movement

  // === STATE ===
  let wrapX = true;
  let wrapY = false;
  let paused = false;
  let fastForward = false;
  let fastForwardFactor = 10;
  let quadrantInit = false;
  let ticks = 0;
  let controlsVisible = true;
  let showHeatOverlay = true; // ON by default

  // === PRNG (deterministic) ===
  const params = new URLSearchParams(window.location.search);
  const seedParam = parseInt(params.get("seed") || "1337", 10);
  let rngState = (isFinite(seedParam) ? seedParam : 1337) >>> 0;

  function mix32(x) {
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return (x ^ (x >>> 16)) >>> 0;
  }
  rngState = mix32(rngState);

  function rand() {
    rngState = (1664525 * rngState + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  // === PIXI SETUP ===
  const app = new PIXI.Application({
    width: COLS * SCALE_SIZE,
    height: ROWS * SCALE_SIZE,
    backgroundColor: 0x000000,
    antialias: false,
  });
  if (container) container.appendChild(app.view);
  if (app.view && app.view.style) {
    app.view.style.imageRendering = "pixelated";
  }

  // === FIELD BUFFERS ===
  // Quantity of each element per cell (in units, not mass)
  let E0 = new Uint8Array(N); // Earth
  let W0 = new Uint8Array(N); // Water
  let A0 = new Uint8Array(N); // Air
  let F0 = new Uint8Array(N); // Fire

  // Heat field (0-7 per cell)
  let H0 = new Uint8Array(N);
  let H1 = new Uint8Array(N);

  // Double buffers for element updates
  let E1 = new Uint8Array(N);
  let W1 = new Uint8Array(N);
  let A1 = new Uint8Array(N);
  let F1 = new Uint8Array(N);

  // Scratch arrays
  const moveOut = new Int8Array(N); // Direction chosen for movement (-1 = none)
  const moveTarget = new Int32Array(N); // Target cell index

  // Direction persistence for smoother movement (like monochromagic)
  const lastDirX = new Int8Array(N); // -1, 0, or 1
  const lastDirY = new Int8Array(N); // -1, 0, or 1

  // === TEXTURE ===
  const rgba = new Uint8Array(N * 4);
  const texture = PIXI.Texture.fromBuffer(rgba, COLS, ROWS);
  const sprite = new PIXI.Sprite(texture);
  sprite.scale.set(SCALE_SIZE, SCALE_SIZE);
  app.stage.addChild(sprite);

  // === HELPERS ===
  const IX = (x, y) => y * COLS + x;

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

  function getTotalMass(i) {
    return E0[i] * MASS.E + W0[i] * MASS.W + A0[i] * MASS.A + F0[i] * MASS.F;
  }

  function getDominant(i) {
    const me = E0[i] * MASS.E;
    const mw = W0[i] * MASS.W;
    const ma = A0[i] * MASS.A;
    const mf = F0[i] * MASS.F;

    const max = Math.max(me, mw, ma, mf);
    if (max === 0) return null;

    // Ties go to heavier element (more stable)
    if (me === max) return "E";
    if (mw === max) return "W";
    if (ma === max) return "A";
    if (mf === max) return "F";
    return null;
  }

  function getNetDensity(i) {
    // Returns average density of cell (mass-weighted)
    // Earth=8 density, Water=4, Air=2, Fire=1
    const total = getTotalMass(i);
    if (total === 0) return 0;

    const me = E0[i] * MASS.E;
    const mw = W0[i] * MASS.W;
    const ma = A0[i] * MASS.A;
    const mf = F0[i] * MASS.F;

    // Weighted average of densities
    return (me * 8 + mw * 4 + ma * 2 + mf * 1) / total;
  }

  // === MASS TRACKING ===
  function computeTotalMass() {
    let total = 0;
    for (let i = 0; i < N; i++) {
      total +=
        E0[i] * MASS.E + W0[i] * MASS.W + A0[i] * MASS.A + F0[i] * MASS.F;
    }
    return total;
  }

  function computeTotalHeat() {
    let total = 0;
    for (let i = 0; i < N; i++) {
      total += H0[i];
    }
    return total;
  }

  let initialMass = 0; // Set after init
  let initialHeat = 0; // Set after init

  // === INITIALIZATION ===
  function initRandom() {
    E0.fill(0);
    W0.fill(0);
    A0.fill(0);
    F0.fill(0);
    H0.fill(0);
    H1.fill(0);

    const fillCount = Math.floor(N * fillPercent);

    for (let n = 0; n < fillCount; n++) {
      const i = Math.floor(rand() * N);
      const totalMass = getTotalMass(i);
      if (totalMass >= MAX_MASS) continue;

      const r = rand();
      if (r < 0.25) {
        if (totalMass + MASS.E <= MAX_MASS) E0[i]++;
      } else if (r < 0.5) {
        if (totalMass + MASS.W <= MAX_MASS) W0[i]++;
      } else if (r < 0.75) {
        if (totalMass + MASS.A <= MAX_MASS) A0[i]++;
      } else {
        if (totalMass + MASS.F <= MAX_MASS) F0[i]++;
      }
    }

    // Initialize heat field uniformly at neutral temperature
    H0.fill(HEAT_NEUTRAL);
    H1.fill(0);
  }

  function initQuadrants() {
    E0.fill(0);
    W0.fill(0);
    A0.fill(0);
    F0.fill(0);
    H0.fill(HEAT_NEUTRAL); // Uniform neutral heat
    H1.fill(0);

    const halfX = Math.floor(COLS / 2);
    const halfY = Math.floor(ROWS / 2);

    // Randomly assign an element to each quadrant (can repeat)
    const elements = ['E', 'W', 'A', 'F'];
    const quadrantElements = [
      elements[Math.floor(rand() * 4)], // top-left
      elements[Math.floor(rand() * 4)], // top-right
      elements[Math.floor(rand() * 4)], // bottom-left
      elements[Math.floor(rand() * 4)], // bottom-right
    ];
    console.log(`Quadrants: TL=${quadrantElements[0]} TR=${quadrantElements[1]} BL=${quadrantElements[2]} BR=${quadrantElements[3]}`);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = IX(x, y);
        const inLeft = x < halfX;
        const inTop = y < halfY;

        // Skip some cells for visual interest
        if (rand() > 0.7) continue;

        // Determine quadrant index: TL=0, TR=1, BL=2, BR=3
        const qIdx = (inTop ? 0 : 2) + (inLeft ? 0 : 1);
        const elem = quadrantElements[qIdx];

        switch (elem) {
          case 'F': F0[i] = Math.floor(rand() * 8) + 1; break;
          case 'A': A0[i] = Math.floor(rand() * 4) + 1; break;
          case 'W': W0[i] = Math.floor(rand() * 2) + 1; break;
          case 'E': E0[i] = 1; break;
        }
      }
    }
  }

  function reset(preserveRng = false) {
    if (!preserveRng) {
      rngState = mix32((isFinite(seedParam) ? seedParam : 1337) >>> 0);
    }
    ticks = 0;
    if (quadrantInit) {
      initQuadrants();
    } else {
      initRandom();
    }
    initialMass = computeTotalMass();
    initialHeat = computeTotalHeat();
    updateTexture();
    console.log(
      `Reset: ${COLS}x${ROWS}, fill=${(fillPercent * 100).toFixed(
        0
      )}%, initialMass=${initialMass}, initialHeat=${initialHeat}`
    );
  }

  // === HEAT-BASED TRANSFORMATION LOGIC ===
  // Calculate effective transformation chance based on distance from threshold
  function getTransformChance(baseChance, heat, threshold, isHigherBetter) {
    const distance = isHigherBetter ? (heat - threshold) : (threshold - heat);
    if (distance < 0) return 0; // Below threshold
    // Scale chance by how far past threshold we are
    return Math.min(1, baseChance + (distance * CHANCE_SCALE * baseChance));
  }

  function applyTransformations() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = IX(x, y);
        const heat = H0[i];
        const totalMass = getTotalMass(i);

        // EXPANSION (heating transforms heavier → 2 lighter)
        // Earth → 2 Water (H >= 4)
        if (E0[i] >= 1 && heat >= HEAT_THRESH.EARTH_TO_WATER) {
          const chance = getTransformChance(TRANSFORM_CHANCE.EARTH_TO_WATER, heat, HEAT_THRESH.EARTH_TO_WATER, true);
          if (rand() < chance && totalMass - MASS.E + 2 * MASS.W <= MAX_MASS) {
            E0[i] -= 1;
            W0[i] += 2;
            continue;
          }
        }

        // Water → 2 Air (H >= 5)
        if (W0[i] >= 1 && heat >= HEAT_THRESH.WATER_TO_AIR) {
          const chance = getTransformChance(TRANSFORM_CHANCE.WATER_TO_AIR, heat, HEAT_THRESH.WATER_TO_AIR, true);
          if (rand() < chance && totalMass - MASS.W + 2 * MASS.A <= MAX_MASS) {
            W0[i] -= 1;
            A0[i] += 2;
            continue;
          }
        }

        // Air → 2 Fire (H >= 6)
        if (A0[i] >= 1 && heat >= HEAT_THRESH.AIR_TO_FIRE) {
          const chance = getTransformChance(TRANSFORM_CHANCE.AIR_TO_FIRE, heat, HEAT_THRESH.AIR_TO_FIRE, true);
          if (rand() < chance && totalMass - MASS.A + 2 * MASS.F <= MAX_MASS) {
            A0[i] -= 1;
            F0[i] += 2;
            continue;
          }
        }

        // COMPRESSION (cooling transforms 2 lighter → heavier)
        // 2 Fire → Air (H <= 5)
        // Can borrow 1 Fire from adjacent cell if we only have 1
        if (F0[i] >= 1 && heat <= HEAT_THRESH.FIRE_TO_AIR) {
          const chance = getTransformChance(TRANSFORM_CHANCE.FIRE_TO_AIR, heat, HEAT_THRESH.FIRE_TO_AIR, false);
          if (rand() < chance) {
            if (F0[i] >= 2) {
              // Have 2 locally
              F0[i] -= 2;
              A0[i] += 1;
              continue;
            } else {
              // Try to borrow 1 from adjacent cell
              const dirs = [[0,-1], [0,1], [-1,0], [1,0]];
              for (const [dx, dy] of dirs) {
                const ni = neighborIndex(x, y, dx, dy);
                if (ni >= 0 && F0[ni] >= 1) {
                  F0[i] -= 1;
                  F0[ni] -= 1;
                  A0[i] += 1;
                  break;
                }
              }
              continue;
            }
          }
        }

        // 2 Air → Water (H <= 2)
        // Can borrow 1 Air from adjacent cell if we only have 1
        if (A0[i] >= 1 && heat <= HEAT_THRESH.AIR_TO_WATER) {
          const chance = getTransformChance(TRANSFORM_CHANCE.AIR_TO_WATER, heat, HEAT_THRESH.AIR_TO_WATER, false);
          if (rand() < chance) {
            if (A0[i] >= 2) {
              A0[i] -= 2;
              W0[i] += 1;
              continue;
            } else {
              const dirs = [[0,-1], [0,1], [-1,0], [1,0]];
              for (const [dx, dy] of dirs) {
                const ni = neighborIndex(x, y, dx, dy);
                if (ni >= 0 && A0[ni] >= 1) {
                  A0[i] -= 1;
                  A0[ni] -= 1;
                  W0[i] += 1;
                  break;
                }
              }
              continue;
            }
          }
        }

        // 2 Water → Earth (H <= 2)
        // Can borrow 1 Water from adjacent cell if we only have 1
        if (W0[i] >= 1 && heat <= HEAT_THRESH.WATER_TO_EARTH) {
          const chance = getTransformChance(TRANSFORM_CHANCE.WATER_TO_EARTH, heat, HEAT_THRESH.WATER_TO_EARTH, false);
          if (rand() < chance) {
            if (W0[i] >= 2) {
              W0[i] -= 2;
              E0[i] += 1;
              continue;
            } else {
              const dirs = [[0,-1], [0,1], [-1,0], [1,0]];
              for (const [dx, dy] of dirs) {
                const ni = neighborIndex(x, y, dx, dy);
                if (ni >= 0 && W0[ni] >= 1) {
                  W0[i] -= 1;
                  W0[ni] -= 1;
                  E0[i] += 1;
                  break;
                }
              }
              continue;
            }
          }
        }
      }
    }
  }

  // === HEAT DIFFUSION ===
  function getDiffusionMod(i) {
    // Get the diffusion modifier for a cell based on its dominant element
    const dominant = getDominant(i);
    if (!dominant) return HEAT_DIFFUSE_MOD.EMPTY;
    return HEAT_DIFFUSE_MOD[dominant];
  }

  function diffuseHeat() {
    // Copy current heat to buffer
    H1.set(H0);

    // Process each cell
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = IX(x, y);
        const myHeat = H0[i];
        if (myHeat === 0) continue;

        // Donor gate: probability based on this cell's element
        const donorMod = getDiffusionMod(i);
        if (rand() >= HEAT_DIFFUSE_BASE * donorMod) continue;

        // Pick a random cardinal neighbor
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // N, S, W, E
        const dir = dirs[Math.floor(rand() * 4)];
        const ni = neighborIndex(x, y, dir[0], dir[1]);

        // Off canvas edge
        if (ni < 0) {
          // Heat only escapes when sources are on (open system)
          // When sources are off, conserve heat (closed system)
          if (heatSourcesEnabled) {
            H1[i]--;
          }
          continue;
        }

        const neighborHeat = H0[ni];

        // Only diffuse if neighbor is cooler and can accept more heat
        if (neighborHeat >= myHeat || neighborHeat >= MAX_HEAT) continue;

        // Transfer one unit of heat
        H1[i]--;
        H1[ni]++;
      }
    }

    // Swap buffers
    [H0, H1] = [H1, H0];
  }

  // === HEAT SOURCES ===
  // (Sinks happen naturally when heat diffuses off canvas edges)
  function applyHeatSources() {
    if (!heatSourcesEnabled) return;

    // Heat source at bottom row
    const bottomY = ROWS - 1;
    for (let x = 0; x < COLS; x++) {
      const i = IX(x, bottomY);
      if (rand() < HEAT_SOURCE_RATE) {
        H0[i] = Math.min(MAX_HEAT, H0[i] + HEAT_SOURCE_AMOUNT);
      }
    }
  }

  // === MOVEMENT LOGIC ===
  function moveElements() {
    // Copy to destination buffers
    E1.set(E0);
    W1.set(W0);
    A1.set(A0);
    F1.set(F0);
    moveOut.fill(-1);
    moveTarget.fill(-1);

    const flip = (ticks & 1) !== 0;

    // Process each cell
    for (let y = 0; y < ROWS; y++) {
      const leftToRight = ((y & 1) === 0) !== flip;
      const xStart = leftToRight ? 0 : COLS - 1;
      const xEnd = leftToRight ? COLS : -1;
      const xStep = leftToRight ? 1 : -1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = IX(x, y);
        const dominant = getDominant(i);
        if (!dominant) continue;

        const totalMass = getTotalMass(i);
        if (totalMass === 0) continue;

        // Movement depends on dominant element
        let targetI = -1;

        switch (dominant) {
          case "E": // Earth: falls straight down, swaps with lighter
            targetI = tryMoveDown(x, y, i, "E");
            break;

          case "W": // Water: falls, flows laterally
            targetI = tryMoveWater(x, y, i);
            break;

          case "A": // Air: drifts with slight upward bias
            targetI = tryMoveAir(x, y, i);
            break;

          case "F": // Fire: rises
            targetI = tryMoveFire(x, y, i);
            break;
        }

        if (targetI >= 0) {
          moveTarget[i] = targetI;
          moveOut[i] = 1;
        }
      }
    }

    // Apply movements (swap entire cell contents)
    for (let i = 0; i < N; i++) {
      if (moveOut[i] === 1 && moveTarget[i] >= 0) {
        const j = moveTarget[i];

        // Check if target is trying to move to us (mutual swap)
        if (moveTarget[j] === i) {
          // Both want to swap - do it once (lower index initiates)
          if (i < j) {
            swapCells(i, j);
          }
        } else if (moveTarget[j] < 0) {
          // Target isn't moving - check if swap is valid
          // The movement functions already validated direction preference,
          // so we just need density to be favorable for the swap
          const myDensity = getNetDensity(i);
          const theirDensity = getNetDensity(j);
          const myY = Math.floor(i / COLS);
          const theirY = Math.floor(j / COLS);
          const myX = i % COLS;
          const theirX = j % COLS;

          // Calculate actual movement direction (accounting for wrap)
          let deltaY = theirY - myY;
          let deltaX = theirX - myX;

          // Adjust for wrapping
          if (wrapY) {
            if (deltaY > ROWS / 2) deltaY -= ROWS;
            if (deltaY < -ROWS / 2) deltaY += ROWS;
          }
          if (wrapX) {
            if (deltaX > COLS / 2) deltaX -= COLS;
            if (deltaX < -COLS / 2) deltaX += COLS;
          }

          // Moving down (deltaY > 0): we should be denser, or target empty
          // Moving up (deltaY < 0): we should be lighter, or target empty
          // Lateral (deltaY == 0): allow if target is lighter or empty
          let allowSwap = false;
          const targetEmpty = getTotalMass(j) === 0;

          if (deltaY > 0) {
            // Sinking - allow if target is empty or less dense
            if (targetEmpty || myDensity > theirDensity) {
              allowSwap = true;
            }
          } else if (deltaY < 0) {
            // Rising - allow if target is empty or more dense
            if (targetEmpty || myDensity < theirDensity) {
              allowSwap = true;
            }
          } else {
            // Lateral movement - allow if target is lighter or empty
            if (targetEmpty || theirDensity < myDensity) {
              allowSwap = true;
            }
          }

          if (allowSwap) {
            swapCells(i, j);
          }
        }
      }
    }

    // Swap buffers
    [E0, E1] = [E1, E0];
    [W0, W1] = [W1, W0];
    [A0, A1] = [A1, A0];
    [F0, F1] = [F1, F0];
  }

  function swapCells(i, j) {
    // Swap in destination buffers
    const te = E1[i];
    E1[i] = E1[j];
    E1[j] = te;
    const tw = W1[i];
    W1[i] = W1[j];
    W1[j] = tw;
    const ta = A1[i];
    A1[i] = A1[j];
    A1[j] = ta;
    const tf = F1[i];
    F1[i] = F1[j];
    F1[j] = tf;
  }

  // Helper: can this element rise into target cell?
  function canRiseInto(i, targetI) {
    if (targetI < 0) return false;
    const targetMass = getTotalMass(targetI);
    if (targetMass === 0) return true; // Empty cell - free to move
    return getNetDensity(targetI) > getNetDensity(i); // Can rise through denser
  }

  // Helper: can this element sink into target cell?
  function canSinkInto(i, targetI) {
    if (targetI < 0) return false;
    const targetMass = getTotalMass(targetI);
    if (targetMass === 0) return true; // Empty cell - free to move
    return getNetDensity(targetI) < getNetDensity(i); // Can sink through lighter
  }

  function tryMoveDown(x, y, i, element) {
    // Earth falls straight down, uses direction persistence for diagonals

    // Try straight down first
    const down = neighborIndex(x, y, 0, 1);
    if (canSinkInto(i, down)) {
      lastDirX[i] = 0;
      lastDirY[i] = 1;
      return down;
    }

    // Try diagonals with persistence
    let preferLeft = lastDirX[i] === -1 ? true : lastDirX[i] === 1 ? false : rand() < 0.5;
    const dl = neighborIndex(x, y, -1, 1);
    const dr = neighborIndex(x, y, 1, 1);

    if (preferLeft) {
      if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
      if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
    } else {
      if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
      if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
    }

    lastDirX[i] = 0;
    lastDirY[i] = 0;
    return -1;
  }

  function tryMoveWater(x, y, i) {
    // Water: falls normally, but bubbles UP through denser materials (like Earth)
    // This handles the case where Earth melts into Water at the bottom

    // Purely random left/right - no persistence to avoid directional bias
    const preferLeft = rand() < 0.5;

    // Try down first (gravity)
    const down = neighborIndex(x, y, 0, 1);
    if (canSinkInto(i, down)) {
      lastDirX[i] = 0;
      lastDirY[i] = 1;
      return down;
    }

    // Try down-diagonals
    const dl = neighborIndex(x, y, -1, 1);
    const dr = neighborIndex(x, y, 1, 1);

    if (preferLeft) {
      if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
      if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
    } else {
      if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
      if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
    }

    // Can't fall - try to rise through denser material (buoyancy)
    // Water (density 4) can bubble up through Earth (density 8)
    const up = neighborIndex(x, y, 0, -1);
    if (canRiseInto(i, up)) {
      lastDirX[i] = 0;
      lastDirY[i] = -1;
      return up;
    }

    // Try up-diagonals through denser material
    const ul = neighborIndex(x, y, -1, -1);
    const ur = neighborIndex(x, y, 1, -1);

    if (preferLeft) {
      if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
      if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
    } else {
      if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
      if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
    }

    // Try lateral flow into empty space
    const left = neighborIndex(x, y, -1, 0);
    const right = neighborIndex(x, y, 1, 0);

    if (preferLeft) {
      if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
      if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
    } else {
      if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
      if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
    }

    lastDirX[i] = 0;
    lastDirY[i] = 0;
    return -1;
  }

  function tryMoveAir(x, y, i) {
    // Air: brownian motion with heat-based vertical bias
    // Hot air rises, cold air sinks
    const heat = H0[i];
    const heatBias = (heat - HEAT_NEUTRAL) / MAX_HEAT * HEAT_MOVEMENT_BIAS;

    // Probabilities for direction: base brownian + heat bias
    // Heat > neutral: more likely to rise
    // Heat < neutral: more likely to sink
    const upChance = 0.3 + heatBias;
    const downChance = 0.3 - heatBias;
    const lateralChance = 0.4;

    const r = rand();
    // Purely random left/right - no persistence to avoid directional bias
    const preferLeft = rand() < 0.5;

    if (r < upChance) {
      // Try up
      const up = neighborIndex(x, y, 0, -1);
      if (canRiseInto(i, up)) { lastDirX[i] = 0; lastDirY[i] = -1; return up; }
      // Try up-diagonals
      const ul = neighborIndex(x, y, -1, -1);
      const ur = neighborIndex(x, y, 1, -1);
      if (preferLeft) {
        if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
        if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
      } else {
        if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
        if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
      }
    } else if (r < upChance + lateralChance) {
      // Try lateral
      const left = neighborIndex(x, y, -1, 0);
      const right = neighborIndex(x, y, 1, 0);
      if (preferLeft) {
        if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
        if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
      } else {
        if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
        if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
      }
    } else {
      // Try down
      const down = neighborIndex(x, y, 0, 1);
      if (canSinkInto(i, down)) { lastDirX[i] = 0; lastDirY[i] = 1; return down; }
      // Try down-diagonals
      const dl = neighborIndex(x, y, -1, 1);
      const dr = neighborIndex(x, y, 1, 1);
      if (preferLeft) {
        if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
        if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
      } else {
        if (canSinkInto(i, dr)) { lastDirX[i] = 1; lastDirY[i] = 1; return dr; }
        if (canSinkInto(i, dl)) { lastDirX[i] = -1; lastDirY[i] = 1; return dl; }
      }
    }

    // Reset persistence if stuck
    lastDirX[i] = 0;
    lastDirY[i] = 0;
    return -1;
  }

  function tryMoveFire(x, y, i) {
    // Fire: brownian motion with strong heat-based upward bias
    // Fire is always buoyant but more so when hot
    const heat = H0[i];
    const heatBias = (heat - HEAT_NEUTRAL) / MAX_HEAT * HEAT_MOVEMENT_BIAS;

    // Fire has a stronger base upward tendency than air
    const baseUp = 0.5;
    const upChance = Math.min(0.9, baseUp + heatBias);
    const lateralChance = 0.3;

    const r = rand();
    // Purely random left/right - no persistence to avoid directional bias
    const preferLeft = rand() < 0.5;

    if (r < upChance) {
      // Try up
      const up = neighborIndex(x, y, 0, -1);
      if (canRiseInto(i, up)) { lastDirX[i] = 0; lastDirY[i] = -1; return up; }
      // Try up-diagonals
      const ul = neighborIndex(x, y, -1, -1);
      const ur = neighborIndex(x, y, 1, -1);
      if (preferLeft) {
        if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
        if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
      } else {
        if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
        if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
      }
    } else if (r < upChance + lateralChance) {
      // Try lateral spread
      const left = neighborIndex(x, y, -1, 0);
      const right = neighborIndex(x, y, 1, 0);
      if (preferLeft) {
        if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
        if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
      } else {
        if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
        if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
      }
    } else {
      // Fire can occasionally sink when cool (rare)
      const down = neighborIndex(x, y, 0, 1);
      if (canSinkInto(i, down)) { lastDirX[i] = 0; lastDirY[i] = 1; return down; }
    }

    // Reset persistence if stuck
    lastDirX[i] = 0;
    lastDirY[i] = 0;
    return -1;
  }

  // === RENDER ===
  function updateTexture() {
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const totalMass = getTotalMass(i);
      const heat = H0[i];

      if (showHeatOverlay) {
        // Heat overlay mode: show heat as red-blue gradient
        // Blue (cold) -> Purple -> Red (hot)
        const heatRatio = heat / MAX_HEAT;
        if (totalMass === 0) {
          // Empty cells show heat directly
          rgba[j] = Math.floor(heatRatio * 200);     // Red
          rgba[j + 1] = 0;                            // Green
          rgba[j + 2] = Math.floor((1 - heatRatio) * 200); // Blue
          rgba[j + 3] = 255;
        } else {
          // Cells with elements: blend element color with heat tint
          const dominant = getDominant(i);
          const color = COLORS[dominant] || { r: 0, g: 0, b: 0 };
          const alpha = Math.min(255, Math.floor((totalMass / MAX_MASS) * 255));
          const blend = alpha / 255;

          // Add red tint for heat, blue tint for cold
          const heatTint = (heatRatio - 0.5) * 0.4; // -0.2 to +0.2
          rgba[j] = Math.min(255, Math.max(0, Math.floor(color.r * blend + heatTint * 255)));
          rgba[j + 1] = Math.floor(color.g * blend * (1 - Math.abs(heatTint)));
          rgba[j + 2] = Math.min(255, Math.max(0, Math.floor(color.b * blend - heatTint * 255)));
          rgba[j + 3] = 255;
        }
        continue;
      }

      // Normal rendering
      if (totalMass === 0) {
        rgba[j] = 0;
        rgba[j + 1] = 0;
        rgba[j + 2] = 0;
        rgba[j + 3] = 255;
        continue;
      }

      const dominant = getDominant(i);
      const color = COLORS[dominant] || { r: 0, g: 0, b: 0 };

      // Alpha based on mass (mass/8 = opacity)
      const alpha = Math.min(255, Math.floor((totalMass / MAX_MASS) * 255));

      // Blend with black background based on alpha
      const blend = alpha / 255;
      rgba[j] = Math.floor(color.r * blend);
      rgba[j + 1] = Math.floor(color.g * blend);
      rgba[j + 2] = Math.floor(color.b * blend);
      rgba[j + 3] = 255; // Full alpha for the pixel itself
    }

    if (
      texture.baseTexture &&
      typeof texture.baseTexture.update === "function"
    ) {
      texture.baseTexture.update();
    }
  }

  // === MAIN LOOP ===
  function advanceTick() {
    // Heat sources (heat escapes off canvas edges during diffusion)
    applyHeatSources();

    // Heat diffusion
    diffuseHeat();

    // Transform phase (heat-based)
    applyTransformations();

    // Movement phase
    moveElements();

    // Render
    updateTexture();
    ticks++;

    // Update stats
    const statsEl = document.getElementById("stats");
    if (statsEl) {
      const currentMass = computeTotalMass();
      const currentHeat = computeTotalHeat();
      const massConserved =
        currentMass === initialMass ? "✓" : `✗ (${currentMass - initialMass})`;
      const heatInfo = heatSourcesEnabled ? ` | Heat: ${currentHeat}` : ` | Heat: ${currentHeat} (closed)`;
      statsEl.textContent = `Tick: ${ticks} | Mass: ${currentMass} ${massConserved}${heatInfo}${
        fastForward ? " [FF]" : ""
      }${paused ? " [PAUSED]" : ""}${showHeatOverlay ? " [HEAT]" : ""}`;
    }
  }

  function mainLoop() {
    if (!paused) {
      const updates = fastForward ? fastForwardFactor : 1;
      for (let i = 0; i < updates; i++) {
        advanceTick();
      }
    }

    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }

  // === CONTROLS ===
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    switch (key) {
      case "p":
        paused = !paused;
        break;
      case " ":
        if (paused) advanceTick();
        e.preventDefault();
        break;
      case "f":
        fastForward = !fastForward;
        console.log(`Fast-forward: ${fastForward ? "ON" : "OFF"}`);
        break;
      case "q":
        quadrantInit = !quadrantInit;
        // Mix in current time for different random quadrants each time
        rngState = mix32(rngState ^ Date.now());
        console.log(`Quadrant init: ${quadrantInit ? "ON" : "OFF"}`);
        reset(true); // Preserve the new RNG state
        break;
      case "r":
        reset();
        break;
      case "x":
        wrapX = !wrapX;
        console.log(`Wrap X: ${wrapX ? "ON" : "OFF"}`);
        break;
      case "y":
        wrapY = !wrapY;
        console.log(`Wrap Y: ${wrapY ? "ON" : "OFF"}`);
        break;
      case "h":
        controlsVisible = !controlsVisible;
        const ctrl = document.getElementById("controls");
        if (ctrl) ctrl.style.display = controlsVisible ? "block" : "none";
        break;
      case "t":
        showHeatOverlay = !showHeatOverlay;
        console.log(`Heat overlay: ${showHeatOverlay ? "ON" : "OFF"}`);
        updateTexture();
        break;
      case "s":
        heatSourcesEnabled = !heatSourcesEnabled;
        console.log(`Heat sources: ${heatSourcesEnabled ? "ON" : "OFF"}`);
        break;
      case "=":
      case "+":
        HEAT_SOURCE_AMOUNT = Math.min(MAX_HEAT, HEAT_SOURCE_AMOUNT + 1);
        console.log(`Heat source strength: ${HEAT_SOURCE_AMOUNT}`);
        break;
      case "-":
        HEAT_SOURCE_AMOUNT = Math.max(1, HEAT_SOURCE_AMOUNT - 1);
        console.log(`Heat source strength: ${HEAT_SOURCE_AMOUNT}`);
        break;
      case "1":
        fillPercent = 0.1;
        console.log(`Fill: 10%`);
        reset();
        break;
      case "2":
        fillPercent = 0.2;
        console.log(`Fill: 20%`);
        reset();
        break;
      case "3":
        fillPercent = 0.3;
        console.log(`Fill: 30%`);
        reset();
        break;
      case "4":
        fillPercent = 0.4;
        console.log(`Fill: 40%`);
        reset();
        break;
      case "5":
        fillPercent = 0.5;
        console.log(`Fill: 50%`);
        reset();
        break;
      case "6":
        fillPercent = 0.6;
        console.log(`Fill: 60%`);
        reset();
        break;
      case "7":
        fillPercent = 0.7;
        console.log(`Fill: 70%`);
        reset();
        break;
      case "8":
        fillPercent = 0.8;
        console.log(`Fill: 80%`);
        reset();
        break;
      case "9":
        fillPercent = 0.9;
        console.log(`Fill: 90%`);
        reset();
        break;
      case "0":
        fillPercent = 1.0;
        console.log(`Fill: 100%`);
        reset();
        break;
    }
  });

  // === INIT ===
  reset();
  mainLoop();

  console.log(`Timaeus initialized: ${COLS}x${ROWS} @ scale ${SCALE_SIZE}`);
}

// Boot on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
