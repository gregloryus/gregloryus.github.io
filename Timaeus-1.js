// Timaeus-1.js — Platonic Elements Simulation
// Based on Plato's Timaeus: Earth:Water::Water:Air::Air:Fire (1:2:4:8 ratio)
// Mass per unit: Earth=8, Water=4, Air=2, Fire=1

console.log("Timaeus: script loaded");

function boot() {
  console.log("Timaeus: booting");

  // === CONFIGURATION ===
  const SCALE_SIZE = 4; // Pixels per cell
  const container = document.getElementById("canvas-div");
  // Use window dimensions directly (container may not have size yet)
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const COLS = Math.max(1, Math.floor(maxW / SCALE_SIZE));
  const ROWS = Math.max(1, Math.floor(maxH / SCALE_SIZE));
  const N = COLS * ROWS;
  const MAX_MASS = 8; // Maximum mass per cell

  // Starting fill percentage (0.0 to 1.0)
  let fillPercent = 0.3;

  // Mass per unit of each element
  const MASS = { E: 8, W: 4, A: 2, F: 1 };

  // Element colors (RGB)
  const COLORS = {
    E: { r: 0, g: 255, b: 0 },     // Earth: pure green
    W: { r: 0, g: 0, b: 255 },     // Water: pure blue
    A: { r: 255, g: 255, b: 255 }, // Air: pure white
    F: { r: 255, g: 0, b: 0 },     // Fire: pure red
  };

  // Transformation rates
  const TRANSFORM_RATE = 0.02; // Base probability per tick

  // Diffusion settings
  let diffusionEnabled = true;
  const DIFFUSION_RATE = 0.3; // Probability of spreading per tick

  // === STATE ===
  let wrapX = true;
  let wrapY = false;
  let paused = false;
  let fastForward = false;
  let fastForwardFactor = 10;
  let quadrantInit = false;
  let ticks = 0;
  let controlsVisible = true;

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

  // Double buffers for updates
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

  let initialMass = 0; // Set after init

  // === INITIALIZATION ===
  function initRandom() {
    E0.fill(0);
    W0.fill(0);
    A0.fill(0);
    F0.fill(0);

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
  }

  function initQuadrants() {
    E0.fill(0);
    W0.fill(0);
    A0.fill(0);
    F0.fill(0);

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

  function reset() {
    rngState = mix32((isFinite(seedParam) ? seedParam : 1337) >>> 0);
    ticks = 0;
    if (quadrantInit) {
      initQuadrants();
    } else {
      initRandom();
    }
    initialMass = computeTotalMass();
    updateTexture();
    console.log(
      `Reset: ${COLS}x${ROWS}, fill=${(fillPercent * 100).toFixed(
        0
      )}%, initialMass=${initialMass}`
    );
  }

  // === NEIGHBOR ANALYSIS ===
  function getNeighborDensityBalance(x, y) {
    // Returns: positive if heavier neighbors dominate, negative if lighter
    // Used for transformation decisions
    let heavierMass = 0;
    let lighterMass = 0;
    const myDensity = getNetDensity(IX(x, y));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ni = neighborIndex(x, y, dx, dy);
        if (ni < 0) continue;

        const neighborDensity = getNetDensity(ni);
        const neighborMass = getTotalMass(ni);

        if (neighborDensity > myDensity) {
          heavierMass += neighborMass;
        } else if (neighborDensity < myDensity) {
          lighterMass += neighborMass;
        }
      }
    }

    return heavierMass - lighterMass;
  }

  // === TRANSFORMATION LOGIC ===
  function transformCell(i, x, y) {
    const balance = getNeighborDensityBalance(x, y);

    // Surrounded by heavier → compress (Fire→Air→Water→Earth)
    if (balance > 0 && rand() < TRANSFORM_RATE * (balance / 16)) {
      // Try to compress: convert 2 lighter units to 1 heavier unit
      if (F0[i] >= 2) {
        F0[i] -= 2;
        A0[i] += 1;
        return;
      }
      if (A0[i] >= 2) {
        A0[i] -= 2;
        W0[i] += 1;
        return;
      }
      if (W0[i] >= 2) {
        W0[i] -= 2;
        E0[i] += 1;
        return;
      }
    }

    // Surrounded by lighter → expand (Earth→Water→Air→Fire)
    if (balance < 0 && rand() < TRANSFORM_RATE * (-balance / 16)) {
      const totalMass = getTotalMass(i);
      // Try to expand: convert 1 heavier unit to 2 lighter units
      if (E0[i] >= 1 && totalMass - MASS.E + 2 * MASS.W <= MAX_MASS) {
        E0[i] -= 1;
        W0[i] += 2;
        return;
      }
      if (W0[i] >= 1 && totalMass - MASS.W + 2 * MASS.A <= MAX_MASS) {
        W0[i] -= 1;
        A0[i] += 2;
        return;
      }
      if (A0[i] >= 1 && totalMass - MASS.A + 2 * MASS.F <= MAX_MASS) {
        A0[i] -= 1;
        F0[i] += 2;
        return;
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
    // Water falls and flows laterally, uses direction persistence

    // Try to continue in last direction if it was downward or lateral
    const persisting = lastDirX[i] !== 0 || lastDirY[i] !== 0;
    if (persisting && lastDirY[i] >= 0 && rand() < 0.8) {
      const continueTarget = neighborIndex(x, y, lastDirX[i], lastDirY[i]);
      if (canSinkInto(i, continueTarget)) return continueTarget;
    }

    // Try down first
    const down = neighborIndex(x, y, 0, 1);
    if (canSinkInto(i, down)) {
      lastDirX[i] = 0;
      lastDirY[i] = 1;
      return down;
    }

    // Try down-diagonals with persistence
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

    // Try lateral (water flows) - only into empty or lighter
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
    // Air drifts with slight upward bias, uses direction persistence
    const persisting = lastDirX[i] !== 0 || lastDirY[i] !== 0;

    // Try to continue in last direction
    if (persisting && rand() < 0.7) {
      const continueTarget = neighborIndex(x, y, lastDirX[i], lastDirY[i]);
      if (lastDirY[i] <= 0) {
        if (canRiseInto(i, continueTarget)) return continueTarget;
      } else {
        if (canSinkInto(i, continueTarget)) return continueTarget;
      }
    }

    // Slight upward bias (50% up, 30% lateral, 20% down)
    const r = rand();
    let preferLeft = lastDirX[i] === -1 ? true : lastDirX[i] === 1 ? false : rand() < 0.5;

    if (r < 0.5) {
      // Try up first
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
    } else if (r < 0.8) {
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
      // Try down (air can sink into empty space)
      const down = neighborIndex(x, y, 0, 1);
      if (down >= 0 && getTotalMass(down) === 0) { lastDirX[i] = 0; lastDirY[i] = 1; return down; }
    }

    // Reset persistence if stuck
    lastDirX[i] = 0;
    lastDirY[i] = 0;
    return -1;
  }

  function tryMoveFire(x, y, i) {
    // Fire rises - use direction persistence for smooth movement
    const persisting = lastDirX[i] !== 0 || lastDirY[i] !== 0;

    // Try to continue in last direction if it was upward
    if (persisting && lastDirY[i] <= 0) {
      const continueTarget = neighborIndex(x, y, lastDirX[i], lastDirY[i]);
      if (canRiseInto(i, continueTarget)) {
        return continueTarget;
      }
    }

    // Try straight up first
    const up = neighborIndex(x, y, 0, -1);
    if (canRiseInto(i, up)) {
      lastDirX[i] = 0;
      lastDirY[i] = -1;
      return up;
    }

    // Try up-diagonals with persistence bias
    let preferLeft = lastDirX[i] === -1 ? true : lastDirX[i] === 1 ? false : rand() < 0.5;
    const ul = neighborIndex(x, y, -1, -1);
    const ur = neighborIndex(x, y, 1, -1);

    if (preferLeft) {
      if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
      if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
    } else {
      if (canRiseInto(i, ur)) { lastDirX[i] = 1; lastDirY[i] = -1; return ur; }
      if (canRiseInto(i, ul)) { lastDirX[i] = -1; lastDirY[i] = -1; return ul; }
    }

    // Try lateral spread at ceiling
    const left = neighborIndex(x, y, -1, 0);
    const right = neighborIndex(x, y, 1, 0);

    if (preferLeft) {
      if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
      if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
    } else {
      if (right >= 0 && getTotalMass(right) === 0) { lastDirX[i] = 1; lastDirY[i] = 0; return right; }
      if (left >= 0 && getTotalMass(left) === 0) { lastDirX[i] = -1; lastDirY[i] = 0; return left; }
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
    // Transform phase
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        transformCell(IX(x, y), x, y);
      }
    }

    // Movement phase
    moveElements();

    // Render
    updateTexture();
    ticks++;

    // Update stats
    const statsEl = document.getElementById("stats");
    if (statsEl) {
      const currentMass = computeTotalMass();
      const conserved =
        currentMass === initialMass ? "✓" : `✗ (${currentMass - initialMass})`;
      statsEl.textContent = `Tick: ${ticks} | Mass: ${currentMass} ${conserved}${
        fastForward ? " [FF]" : ""
      }${paused ? " [PAUSED]" : ""}`;
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
        console.log(`Quadrant init: ${quadrantInit ? "ON" : "OFF"}`);
        reset();
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
