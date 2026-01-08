/**
 * TERRARIUM - Top-down field ecology simulation
 *
 * Heat flows from sun through field to plants:
 * - Sun deposits heat as it sweeps
 * - Heat dissipates each tick
 * - Plants absorb heat × empty cardinal neighbors
 * - Moon triggers germination (dormant) and death (mature)
 * - Bud physically moves, leaving stem trail behind
 *
 * GENETICS: Path-keyed urns with triple-bit genes (0-7)
 * - Each growth decision is keyed by PATH from seed, not position
 * - Gene bits: 0bLFR (Left, Forward, Right relative to facing)
 * - Urns reinforce successful outcomes across generations
 */

'use strict';

const CONFIG = {
  SCALE: 8,

  SUN: {
    SPEED: 1,
    HEAT_DEPOSIT: 80,
    HEAT_RADIUS: 2,
  },

  HEAT: {
    MAX: 255,
    DECAY: 0.998,
    DIFFUSION: 0.35,
    AMBIENT: 5,
  },

  PLANT: {
    ABSORPTION_RATE: 0.003,
    MAINTENANCE: 0.02,
    GROWTH_COST: 0.8,
    GROWTH_THRESHOLD: 1.2,
    SEED_ENERGY: 5.0,
    DEATH_TICKS: 30,
    MAX_DEPTH: 20,           // Max path depth (prevents infinite growth)
  },

  GENETICS: {
    DEFAULT_URN: [0, 1],           // Later gens: 50/50 grow or don't
    FIRST_GEN_FORWARD: [0, 1, 1],  // First gen forward: 66% chance (straight stems)
    FIRST_GEN_SIDE: [0, 0, 0, 1],  // First gen L/R: 25% chance (rare branching)
    LEARNING_INTENSITY: 3,         // How many copies of outcome to add to urn
  },
};

// === DIRECTION SYSTEM ===
// Absolute directions: N=0, E=1, S=2, W=3
const DIR_NAMES = ['N', 'E', 'S', 'W'];
const DIR_DELTAS = [
  [0, -1],  // N
  [1, 0],   // E
  [0, 1],   // S
  [-1, 0],  // W
];

// Relative directions mapped to absolute based on facing
// facing -> { left, forward, right } -> absolute direction index
const REL_TO_ABS = {
  0: { left: 3, forward: 0, right: 1 },  // Facing N: L=W, F=N, R=E
  1: { left: 0, forward: 1, right: 2 },  // Facing E: L=N, F=E, R=S
  2: { left: 1, forward: 2, right: 3 },  // Facing S: L=E, F=S, R=W
  3: { left: 2, forward: 3, right: 0 },  // Facing W: L=S, F=W, R=N
};

// Gene bits: bit0=Left, bit1=Forward, bit2=Right
const GENE_SLOTS = ['left', 'forward', 'right'];

// Cardinal directions for energy absorption
const CARDINALS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// All 8 directions for crown shyness
const DIRS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1]
];

// === GLOBALS ===
let canvas, ctx;
let cols, rows, totalCells;
let grid;          // Plant cells
let heat;          // Heat field (Float32Array)
let cells = [];    // All plant cells
let sun, moon;
let frame = 0;
let paused = false;
let fastForward = false;

// === INITIALIZATION ===
function init() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  cols = Math.floor(canvas.width / CONFIG.SCALE);
  rows = Math.floor(canvas.height / CONFIG.SCALE);
  totalCells = cols * rows;

  grid = new Array(totalCells).fill(null);
  heat = new Float32Array(totalCells);
  heat.fill(CONFIG.HEAT.AMBIENT);  // 0-255 range

  // Sun starts at (0, 0)
  sun = { x: 0, y: 0, step: 0 };

  // Moon starts halfway through cycle
  const moonOffset = Math.floor(totalCells / 2);
  moon = { x: 0, y: 0, step: moonOffset };
  for (let i = 0; i < moonOffset; i++) {
    advancePosition(moon);
  }

  // Initial seeds scattered across field
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!grid[idx(x, y)] && hasEmptyNeighborhood(x, y)) {
      createSeed(x, y, null);
    }
  }

  setupControls();
  requestAnimationFrame(mainLoop);
}

function idx(x, y) { return y * cols + x; }
function inBounds(x, y) { return x >= 0 && x < cols && y >= 0 && y < rows; }

function hasEmptyNeighborhood(x, y) {
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny) && grid[idx(nx, ny)]) return false;
  }
  return true;
}

// Count empty cardinal neighbors (for heat absorption)
function countEmptyCardinals(x, y, seed) {
  let count = 0;
  for (const [dx, dy] of CARDINALS) {
    const nx = x + dx, ny = y + dy;
    // Out of bounds counts as empty (edge of world = open sky)
    if (!inBounds(nx, ny)) {
      count++;
    } else if (!grid[idx(nx, ny)]) {
      count++;
    }
    // Cells from same plant don't block (they're part of you)
    // But cells from OTHER plants do block
  }
  return count;
}

// Crown shyness: can't grow next to OTHER plants
// Also 5-spot self-check: prevents growing into crowded areas of same plant
function canGrowAt(x, y, seed, facing = 0) {
  if (!inBounds(x, y)) return false;
  if (grid[idx(x, y)]) return false;

  // Check Moore neighborhood for OTHER plants
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny)) {
      const neighbor = grid[idx(nx, ny)];
      if (neighbor && neighbor.seed !== seed) return false;
    }
  }

  // 5-spot forward check (like triplebittrees) - prevents self-crowding
  // Check: left, right, and 3 cells "forward" based on facing
  const FORWARD_CHECKS = {
    0: [[-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]],  // Facing N
    1: [[0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],     // Facing E
    2: [[-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],     // Facing S
    3: [[0, -1], [0, 1], [-1, -1], [-1, 0], [-1, 1]],  // Facing W
  };

  const checks = FORWARD_CHECKS[facing] || FORWARD_CHECKS[0];
  for (const [dx, dy] of checks) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny) && grid[idx(nx, ny)]) {
      return false;  // Blocked by ANY cell (including own plant)
    }
  }

  return true;
}

// === CELESTIAL MOVEMENT ===
function advancePosition(body) {
  body.x += CONFIG.SUN.SPEED;
  if (body.x >= cols) {
    body.x = 0;
    body.y += 1;
    if (body.y >= rows) {
      body.y = 0;
    }
  }
  body.step++;
}

// === SUN: Deposits heat into field ===
function updateSun() {
  advancePosition(sun);

  // Deposit heat in radius
  const r = CONFIG.SUN.HEAT_RADIUS;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = sun.x + dx, ny = sun.y + dy;
      if (inBounds(nx, ny)) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          const intensity = CONFIG.SUN.HEAT_DEPOSIT * (1 - dist / r);
          heat[idx(nx, ny)] += intensity;
        }
      }
    }
  }
}

// === MOON: Triggers germination and death ===
function updateMoon() {
  advancePosition(moon);

  const cell = grid[idx(moon.x, moon.y)];
  if (cell && cell.type === 'SEED' && !cell.dying) {
    if (!cell.germinated) {
      // Germinate dormant seed
      cell.germinate();
    } else if (cell.mature) {
      // Kill mature plant
      cell.die();
    }
  }
}

// === HEAT: Diffuses and decays each tick ===
function updateHeat() {
  // Create buffer for new heat values
  const newHeat = new Float32Array(heat.length);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = idx(x, y);
      const current = heat[i];

      // Start with decayed current value
      let remaining = current * (1 - CONFIG.HEAT.DIFFUSION);

      // Diffuse to cardinal neighbors (equal spread)
      const spreadAmount = current * CONFIG.HEAT.DIFFUSION / 4;

      for (const [dx, dy] of CARDINALS) {
        const nx = x + dx, ny = y + dy;
        if (inBounds(nx, ny)) {
          newHeat[idx(nx, ny)] += spreadAmount;
        }
        // Heat that would go out of bounds is lost
      }

      newHeat[i] += remaining;
    }
  }

  // Apply decay toward ambient, clamp to max, and copy back
  for (let i = 0; i < heat.length; i++) {
    const decayed = CONFIG.HEAT.AMBIENT + (newHeat[i] - CONFIG.HEAT.AMBIENT) * CONFIG.HEAT.DECAY;
    heat[i] = Math.min(CONFIG.HEAT.MAX, decayed);
  }
}

// === GENEBANK: Path-keyed urns with binary (0/1) decisions per slot ===
// Each slot (L/F/R) at each path has its own urn of 0s and 1s
class GeneBank {
  constructor(copyFrom = null) {
    this.urns = new Map();  // Key: "path/SLOT" -> [0s and 1s]
    this.hue = Math.random() * 360;
    this.isFirstGen = copyFrom === null;

    if (copyFrom) {
      // Inherit urns from parent
      for (const [key, urn] of copyFrom.urns.entries()) {
        this.urns.set(key, urn.slice());  // Copy array
      }
      // Slight hue drift
      this.hue = (copyFrom.hue + (Math.random() - 0.5) * 20 + 360) % 360;
      this.isFirstGen = false;
    }
  }

  // Get urn for a specific path+slot, creating default if needed
  // pathKey format: "seed/L", "seed/F/R", etc.
  getUrn(pathKey) {
    if (!this.urns.has(pathKey)) {
      let urn;
      if (this.isFirstGen) {
        // First gen: bias toward straight stems
        // Check if this is a forward slot (ends with /F)
        const isForward = pathKey.endsWith('/F');
        urn = isForward
          ? CONFIG.GENETICS.FIRST_GEN_FORWARD.slice()
          : CONFIG.GENETICS.FIRST_GEN_SIDE.slice();
      } else {
        // Later generations: 50/50 for new paths
        urn = CONFIG.GENETICS.DEFAULT_URN.slice();
      }
      this.urns.set(pathKey, urn);
    }
    return this.urns.get(pathKey);
  }

  // Sample a binary decision (0 or 1) for a slot at this path
  // Returns true if should grow, false if not
  sampleSlot(basePath, slot) {
    const slotKey = `${basePath}/${slot}`;
    const urn = this.getUrn(slotKey);
    const decision = urn[Math.floor(Math.random() * urn.length)];
    return decision === 1;
  }

  // Reinforce a slot decision
  reinforceSlot(basePath, slot, grew) {
    const slotKey = `${basePath}/${slot}`;
    const urn = this.getUrn(slotKey);
    const value = grew ? 1 : 0;
    for (let i = 0; i < CONFIG.GENETICS.LEARNING_INTENSITY; i++) {
      urn.push(value);
    }
  }

  // Get stats for debugging
  getStats() {
    return {
      urnCount: this.urns.size,
      hue: this.hue,
    };
  }
}

// Get absolute direction from facing + relative slot
function getAbsoluteDir(facing, slot) {
  return REL_TO_ABS[facing][slot];
}

// Get delta for absolute direction
function getDelta(absDir) {
  return DIR_DELTAS[absDir];
}

// === CELLS ===
class Cell {
  constructor(x, y, type, seed) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.seed = seed;
    this.energy = 1.0;
    this.dying = false;
    this.dyingTicks = 0;

    grid[idx(x, y)] = this;
    cells.push(this);
  }

  absorbHeat() {
    const h = heat[idx(this.x, this.y)];
    const openSides = countEmptyCardinals(this.x, this.y, this.seed);
    const absorbed = h * openSides * CONFIG.PLANT.ABSORPTION_RATE;
    this.energy += absorbed;
  }

  payMaintenance() {
    this.energy -= CONFIG.PLANT.MAINTENANCE;
  }

  update() {
    if (this.dying) {
      this.dyingTicks--;
      if (this.dyingTicks <= 0) {
        this.remove();
      }
      return;
    }

    this.absorbHeat();
    this.payMaintenance();

    // Die if energy depleted
    if (this.energy <= 0) {
      this.die();
    }
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.dyingTicks = CONFIG.PLANT.DEATH_TICKS;

    // Propagate death to connected cells of same plant
    for (const [dx, dy] of DIRS) {
      const nx = this.x + dx, ny = this.y + dy;
      if (inBounds(nx, ny)) {
        const neighbor = grid[idx(nx, ny)];
        if (neighbor && neighbor.seed === this.seed && !neighbor.dying) {
          neighbor.die();
        }
      }
    }
  }

  remove() {
    grid[idx(this.x, this.y)] = null;
    const i = cells.indexOf(this);
    if (i >= 0) cells.splice(i, 1);
  }
}

// === SEED ===
class Seed extends Cell {
  constructor(x, y, parentGeneBank) {
    super(x, y, 'SEED', null);
    this.seed = this;  // Seed is its own root
    this.geneBank = new GeneBank(parentGeneBank);
    this.germinated = false;
    this.mature = false;
    this.buds = [];        // Active buds for this plant
    this.cellCount = 1;    // Track total cells for maturity
    this.energy = CONFIG.PLANT.SEED_ENERGY;
  }

  germinate() {
    if (this.germinated) return;
    this.germinated = true;

    // Initial facing is North (0)
    const initialFacing = 0;
    const basePath = 'seed';

    // Sample each slot independently from its own urn
    for (const slot of GENE_SLOTS) {
      const slotChar = slot[0].toUpperCase();  // L, F, or R
      const shouldGrow = this.geneBank.sampleSlot(basePath, slotChar);

      if (!shouldGrow) {
        // Reinforce the "don't grow" decision
        this.geneBank.reinforceSlot(basePath, slotChar, false);
        continue;
      }

      const absDir = getAbsoluteDir(initialFacing, slot);
      const [dx, dy] = getDelta(absDir);
      const nx = this.x + dx, ny = this.y + dy;

      if (canGrowAt(nx, ny, this, absDir)) {
        // Path encodes the slot we took
        const newPath = `${basePath}/${slotChar}`;
        const bud = new Bud(nx, ny, this, absDir, newPath, 1);
        this.buds.push(bud);
        // Reinforce the "grow" decision
        this.geneBank.reinforceSlot(basePath, slotChar, true);
      } else {
        // Wanted to grow but blocked - reinforce "don't grow" (blocked)
        this.geneBank.reinforceSlot(basePath, slotChar, false);
      }
    }
  }

  update() {
    if (this.dying) {
      super.update();
      return;
    }

    this.absorbHeat();
    this.payMaintenance();

    if (this.energy <= 0) {
      this.die();
    }

    // Check maturity: no active buds left means we're done growing
    if (this.germinated && this.buds.length === 0 && !this.mature) {
      this.mature = true;
    }
  }

  removeBud(bud) {
    const i = this.buds.indexOf(bud);
    if (i >= 0) this.buds.splice(i, 1);
  }

  reproduce() {
    // Create new airborne seed with inherited genes
    const newSeed = new AirborneSeed(this.x, this.y, this.geneBank);
  }
}

// === AIRBORNE SEED (random walk before landing) ===
class AirborneSeed {
  constructor(x, y, parentGeneBank) {
    this.x = x;
    this.y = y;
    this.parentGeneBank = parentGeneBank;
    this.stepsTaken = 0;
    this.maxSteps = 25 + Math.floor(Math.random() * 20);
    cells.push(this);
    this.type = 'AIRBORNE';
    this.dying = false;
  }

  update() {
    this.stepsTaken++;

    // Random walk
    const dir = CARDINALS[Math.floor(Math.random() * 4)];
    this.x = Math.max(0, Math.min(cols - 1, this.x + dir[0]));
    this.y = Math.max(0, Math.min(rows - 1, this.y + dir[1]));

    // Try to land
    if (this.stepsTaken >= this.maxSteps) {
      if (!grid[idx(this.x, this.y)] && hasEmptyNeighborhood(this.x, this.y)) {
        // Land and become real seed with inherited genes
        createSeed(this.x, this.y, this.parentGeneBank);
      }
      // Remove airborne seed either way
      const i = cells.indexOf(this);
      if (i >= 0) cells.splice(i, 1);
    }
  }

  remove() {
    const i = cells.indexOf(this);
    if (i >= 0) cells.splice(i, 1);
  }
}

// === BUD (moving meristem with path-keyed genetics) ===
class Bud extends Cell {
  constructor(x, y, seed, facing, pathKey, depth) {
    super(x, y, 'BUD', seed);
    this.facing = facing;      // Absolute direction (0-3)
    this.pathKey = pathKey;    // Path from seed (e.g., "seed/F/L/F")
    this.depth = depth;        // Path depth for max limit
    this.energy = 2.0;
    this.hasGrown = false;     // Has this bud executed its gene yet?
  }

  update() {
    if (this.dying) {
      super.update();
      return;
    }

    this.absorbHeat();
    this.payMaintenance();

    if (this.energy <= 0) {
      this.die();
      return;
    }

    // Try to grow if we have enough energy and haven't grown yet
    if (!this.hasGrown &&
        this.energy >= CONFIG.PLANT.GROWTH_THRESHOLD &&
        this.depth < CONFIG.PLANT.MAX_DEPTH) {
      this.executeGene();
    }
  }

  executeGene() {
    this.hasGrown = true;

    const basePath = this.pathKey;
    let grewForward = false;
    let grewAny = false;

    // Sample each slot independently from its own urn
    for (const slot of GENE_SLOTS) {
      const slotChar = slot[0].toUpperCase();  // L, F, or R
      const shouldGrow = this.seed.geneBank.sampleSlot(basePath, slotChar);

      if (!shouldGrow) {
        // Reinforce "don't grow"
        this.seed.geneBank.reinforceSlot(basePath, slotChar, false);
        continue;
      }

      const absDir = getAbsoluteDir(this.facing, slot);
      const [dx, dy] = getDelta(absDir);
      const nx = this.x + dx, ny = this.y + dy;

      if (canGrowAt(nx, ny, this.seed, absDir)) {
        const newPath = `${basePath}/${slotChar}`;

        // Forward slot: this bud continues moving
        if (slot === 'forward') {
          // Leave stem at current position
          const stem = new Stem(this.x, this.y, this.seed);
          grid[idx(this.x, this.y)] = stem;

          // Move bud forward
          this.x = nx;
          this.y = ny;
          this.pathKey = newPath;
          this.depth++;
          this.facing = absDir;
          this.hasGrown = false;  // Can grow again next tick
          grid[idx(nx, ny)] = this;

          this.energy -= CONFIG.PLANT.GROWTH_COST;
          this.seed.cellCount++;
          grewForward = true;
          grewAny = true;

          // Reinforce "grow"
          this.seed.geneBank.reinforceSlot(basePath, slotChar, true);
        } else {
          // Side branch: spawn new bud
          const newBud = new Bud(nx, ny, this.seed, absDir, newPath, this.depth + 1);
          this.seed.buds.push(newBud);
          this.seed.cellCount++;
          this.energy -= CONFIG.PLANT.GROWTH_COST * 0.5;
          grewAny = true;

          // Reinforce "grow"
          this.seed.geneBank.reinforceSlot(basePath, slotChar, true);
        }
      } else {
        // Wanted to grow but blocked
        this.seed.geneBank.reinforceSlot(basePath, slotChar, false);
      }
    }

    // If we didn't grow forward, this bud terminates (becomes stem)
    if (!grewForward) {
      if (grewAny) {
        this.convertToStem();  // Grew branches, now done
      } else {
        this.terminate();  // Terminal node
      }
    }
  }

  terminate() {
    // Remove from seed's active buds list
    this.seed.removeBud(this);
    // Convert to stem cell
    this.type = 'STEM';
  }

  convertToStem() {
    // Keep position but become a stem
    this.seed.removeBud(this);
    this.type = 'STEM';
  }

  die() {
    this.seed.removeBud(this);
    super.die();
  }
}

// === STEM ===
class Stem extends Cell {
  constructor(x, y, seed) {
    super(x, y, 'STEM', seed);
    this.energy = 1.0;
  }
  // Uses default Cell.update()
}

// === FACTORY ===
function createSeed(x, y, parentGeneBank) {
  return new Seed(x, y, parentGeneBank);
}

// === SUN REPRODUCTION TRIGGER ===
function checkSunReproduction() {
  const cell = grid[idx(sun.x, sun.y)];
  if (cell && cell.type === 'SEED' && cell.germinated && cell.mature && !cell.dying) {
    cell.reproduce();
  }
}

// === RENDERING ===
function render() {
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;

  // Draw heat field as background
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = idx(x, y);
      // Normalize heat to 0-1 range with sqrt for smoother gradient
      const rawH = Math.max(0, heat[i] - CONFIG.HEAT.AMBIENT);
      const h = Math.sqrt(rawH / CONFIG.HEAT.MAX);  // sqrt gives smoother perception

      // Dark base, warming to orange/red with heat
      const baseR = 10 + Math.floor(h * 140);
      const baseG = 8 + Math.floor(h * 50);
      const baseB = 5 + Math.floor(h * 10);

      for (let py = 0; py < CONFIG.SCALE; py++) {
        for (let px = 0; px < CONFIG.SCALE; px++) {
          const pi = ((y * CONFIG.SCALE + py) * canvas.width + (x * CONFIG.SCALE + px)) * 4;
          data[pi] = baseR;
          data[pi + 1] = baseG;
          data[pi + 2] = baseB;
          data[pi + 3] = 255;
        }
      }
    }
  }

  // Draw cells
  for (const cell of cells) {
    if (cell.type === 'AIRBORNE') {
      // Airborne seeds: small bright dot
      drawCell(data, cell.x, cell.y, 255, 200, 100, 1.0);
      continue;
    }

    const hue = cell.seed ? cell.seed.geneBank.hue : 0;
    const energyRatio = Math.min(1, Math.max(0.2, cell.energy / 3));

    let r, g, b;

    if (cell.dying) {
      // Fading white
      const fade = cell.dyingTicks / CONFIG.PLANT.DEATH_TICKS;
      r = g = b = Math.floor(200 * fade);
    } else if (cell.type === 'SEED') {
      // Brown seed
      r = 180; g = 120; b = 60;
    } else if (cell.type === 'BUD') {
      // Bright tip colored by hue, brightness by energy
      [r, g, b] = hslToRgb(hue / 360, 0.8, 0.3 + energyRatio * 0.4);
    } else {
      // Stem: darker, still shows energy
      [r, g, b] = hslToRgb(hue / 360, 0.5, 0.15 + energyRatio * 0.25);
    }

    drawCell(data, cell.x, cell.y, r, g, b, 1.0);
  }

  // Draw sun (yellow)
  drawCelestialBody(data, sun.x, sun.y, 255, 240, 80);
  // Draw moon (pale blue-white)
  drawCelestialBody(data, moon.x, moon.y, 200, 210, 255);

  ctx.putImageData(imageData, 0, 0);
}

function drawCell(data, cx, cy, r, g, b, alpha) {
  const px = cx * CONFIG.SCALE;
  const py = cy * CONFIG.SCALE;
  for (let dy = 0; dy < CONFIG.SCALE; dy++) {
    for (let dx = 0; dx < CONFIG.SCALE; dx++) {
      const pi = ((py + dy) * canvas.width + (px + dx)) * 4;
      data[pi] = r;
      data[pi + 1] = g;
      data[pi + 2] = b;
    }
  }
}

function drawCelestialBody(data, cx, cy, r, g, b) {
  const px = cx * CONFIG.SCALE + CONFIG.SCALE / 2;
  const py = cy * CONFIG.SCALE + CONFIG.SCALE / 2;
  const radius = Math.floor(CONFIG.SCALE * 0.7);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const pi = ((py + dy) * canvas.width + (px + dx)) * 4;
        if (pi >= 0 && pi < data.length - 3) {
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = b;
        }
      }
    }
  }
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// === INFO ===
function updateInfo() {
  const seeds = cells.filter(c => c.type === 'SEED' && !c.dying);
  const buds = cells.filter(c => c.type === 'BUD' && !c.dying);
  const stems = cells.filter(c => c.type === 'STEM' && !c.dying);
  const airborne = cells.filter(c => c.type === 'AIRBORNE');

  const yearProgress = Math.floor((sun.step % totalCells) / totalCells * 100);

  // Count urns across all plants
  let totalUrns = 0;
  let maxUrns = 0;
  for (const cell of cells) {
    if (cell.type === 'SEED' && cell.geneBank) {
      const count = cell.geneBank.urns.size;
      totalUrns += count;
      if (count > maxUrns) maxUrns = count;
    }
  }

  document.getElementById('info').innerHTML = `
    Frame: ${frame} | Year: ${yearProgress}%<br>
    Seeds: ${seeds.length} | Buds: ${buds.length} | Stems: ${stems.length}<br>
    Airborne: ${airborne.length} | Urns: ${totalUrns} (max: ${maxUrns})<br>
    ${fastForward ? '[FAST] ' : ''}${paused ? '[PAUSED]' : ''}
  `;
}

// === MAIN LOOP ===
function mainLoop() {
  if (!paused) {
    const updates = fastForward ? 10 : 1;
    for (let i = 0; i < updates; i++) {
      frame++;

      updateSun();
      checkSunReproduction();
      updateMoon();
      updateHeat();

      // Update all cells (iterate backwards for safe removal)
      for (let j = cells.length - 1; j >= 0; j--) {
        cells[j].update();
      }

      // Respawn if empty
      if (cells.filter(c => c.type === 'SEED').length === 0 && frame % 60 === 0) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (!grid[idx(x, y)]) createSeed(x, y, null);
      }
    }
  }

  render();
  updateInfo();
  requestAnimationFrame(mainLoop);
}

// === CONTROLS ===
function setupControls() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') fastForward = !fastForward;
    if (e.key === ' ') { paused = !paused; e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') reset();
    if (e.key === 's' || e.key === 'S') {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!grid[idx(x, y)]) createSeed(x, y, null);
    }
  });

  canvas.addEventListener('click', (e) => {
    const x = Math.floor(e.clientX / CONFIG.SCALE);
    const y = Math.floor(e.clientY / CONFIG.SCALE);
    if (!grid[idx(x, y)]) createSeed(x, y, null);
  });
}

function reset() {
  grid.fill(null);
  heat.fill(CONFIG.HEAT.AMBIENT);
  cells = [];
  frame = 0;

  sun = { x: 0, y: 0, step: 0 };
  const moonOffset = Math.floor(totalCells / 2);
  moon = { x: 0, y: 0, step: moonOffset };
  for (let i = 0; i < moonOffset; i++) {
    advancePosition(moon);
  }

  for (let i = 0; i < 6; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!grid[idx(x, y)] && hasEmptyNeighborhood(x, y)) {
      createSeed(x, y, null);
    }
  }
}

window.addEventListener('DOMContentLoaded', init);
