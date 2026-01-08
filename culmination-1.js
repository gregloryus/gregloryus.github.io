/**
 * CULMINATION v2 - Slow, deliberate plant evolution
 *
 * Design principles:
 * - SLOW: One plant lifecycle ~500 frames, visible generations
 * - SCARCE: Energy is precious, growth is expensive
 * - COMPETITIVE: Limited carrying capacity, plants compete for light
 * - LEGIBLE: You can follow what's happening
 * - EVOLVING: Genes affect fitness, selection is visible
 */

// === CONSTANTS ===
const SCALE = 6;
const COLS = Math.floor(window.innerWidth / SCALE);
const ROWS = Math.floor(window.innerHeight / SCALE);

// Carrying capacity - prevents explosive growth
const CARRYING_CAPACITY = Math.floor(COLS * ROWS * 0.3); // Max 30% coverage

const ENERGY = {
  SEED_START: 15,
  GROWTH_COST: 8,
  COLLECTION_BASE: 0.03,     // Base chance per empty cardinal neighbor
  REPRODUCE_THRESHOLD: 40,
  SEED_GIFT: 12,
  MAX: 60,
  MAINTENANCE_COST: 0.15,    // Significant drain per tick
};

const GROWTH = {
  INTERVAL: 20,              // Ticks between growth attempts (SLOW)
  MAX_AGE: 600,              // ~10 seconds at 60fps
  SEED_DISPERSE_STEPS: 40,
  MAX_CELLS_PER_PLANT: 50,   // Prevent single plant domination
};

// === GLOBALS ===
let app, grid, plants, seeds;
let frame = 0;
let paused = false;
let fastForward = false;
let fastForwardFactor = 5;
let plantIdCounter = 0;
let totalCells = 0;

// === PIXI SETUP ===
function init() {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0a0a12,
    resolution: 1,
  });
  document.getElementById('canvas-div').appendChild(app.view);

  grid = new OccupancyGrid(COLS, ROWS);
  plants = new Map(); // plantId -> Plant object
  seeds = [];

  // Start with a few seeds spread out
  const spacing = Math.floor(COLS / 4);
  for (let i = 0; i < 3; i++) {
    const x = spacing + i * spacing + Math.floor(Math.random() * 20 - 10);
    const y = Math.floor(ROWS / 2) + Math.floor(Math.random() * 20 - 10);
    if (!grid.isOccupied(x, y)) {
      const seed = new Seed(x, y, null);
      seeds.push(seed);
    }
  }

  setupControls();
  mainLoop();
}

// === OCCUPANCY GRID ===
class OccupancyGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.data = new Array(cols * rows).fill(null);
  }

  idx(x, y) { return y * this.cols + x; }
  inBounds(x, y) { return x >= 0 && x < this.cols && y >= 0 && y < this.rows; }
  get(x, y) { return this.inBounds(x, y) ? this.data[this.idx(x, y)] : null; }
  set(x, y, cell) { if (this.inBounds(x, y)) this.data[this.idx(x, y)] = cell; }
  remove(x, y) { if (this.inBounds(x, y)) this.data[this.idx(x, y)] = null; }
  isOccupied(x, y) { return !this.inBounds(x, y) || this.data[this.idx(x, y)] !== null; }

  emptyCardinals(x, y) {
    let count = 0;
    for (const [dx, dy] of [[0,-1], [1,0], [0,1], [-1,0]]) {
      if (!this.isOccupied(x + dx, y + dy)) count++;
    }
    return count;
  }

  // Crown shyness - can only grow if no OTHER plant's cells nearby
  canGrowWithShyness(x, y, plantId) {
    if (this.isOccupied(x, y)) return false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const cell = this.get(x + dx, y + dy);
        if (cell && cell.plantId !== plantId) return false;
      }
    }
    return true;
  }
}

// === PLANT (manages all cells of one organism) ===
class Plant {
  constructor(id, genes) {
    this.id = id;
    this.genes = genes;
    this.cells = [];
    this.buds = [];
    this.age = 0;
    this.dead = false;
    this.reproduced = false;
  }

  get totalEnergy() {
    return this.cells.reduce((sum, c) => sum + c.energy, 0);
  }

  get cellCount() {
    return this.cells.length;
  }

  addCell(cell) {
    this.cells.push(cell);
    if (cell.isBud) this.buds.push(cell);
    totalCells++;
  }

  removeCell(cell) {
    this.cells = this.cells.filter(c => c !== cell);
    this.buds = this.buds.filter(c => c !== cell);
    totalCells--;
  }

  budMatured(cell) {
    this.buds = this.buds.filter(c => c !== cell);
  }

  update() {
    if (this.dead) return;
    this.age++;

    // Check if plant is dead (no cells left)
    if (this.cells.length === 0) {
      this.dead = true;
      return;
    }

    // Update all cells
    for (const cell of [...this.cells]) {
      cell.update();
    }

    // Remove dead cells
    this.cells = this.cells.filter(c => !c.dead);
    this.buds = this.buds.filter(c => !c.dead);

    // Try to reproduce if enough total energy and not too many cells
    if (!this.reproduced && this.totalEnergy >= ENERGY.REPRODUCE_THRESHOLD && this.cells.length >= 5) {
      this.tryReproduce();
    }

    // Die of old age
    if (this.age > GROWTH.MAX_AGE) {
      this.die();
    }
  }

  tryReproduce() {
    // Find a cell with enough energy to spawn a seed
    for (const cell of this.cells) {
      if (cell.energy >= ENERGY.SEED_GIFT) {
        // Find empty spot nearby
        const dirs = [[0,-1], [1,0], [0,1], [-1,0], [-1,-1], [1,-1], [-1,1], [1,1]];
        for (const [dx, dy] of dirs) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (!grid.isOccupied(nx, ny)) {
            const seed = new Seed(nx, ny, this.genes);
            seeds.push(seed);
            cell.energy -= ENERGY.SEED_GIFT;
            this.reproduced = true; // Only reproduce once per lifetime
            return;
          }
        }
      }
    }
  }

  die() {
    this.dead = true;
    for (const cell of this.cells) {
      cell.die();
    }
    this.cells = [];
    this.buds = [];
  }
}

// === GENES ===
function createGenes() {
  return {
    // Growth pattern: [left, forward, right] - at least forward must be true
    pattern: [Math.random() < 0.4, true, Math.random() < 0.4],
    // Internode spacing (stems between branch points)
    internode: 2 + Math.floor(Math.random() * 3),
    // Color
    hue: Math.random() * 360,
    // Efficiency: affects energy collection (0.8 to 1.2)
    efficiency: 0.9 + Math.random() * 0.2,
  };
}

function mutateGenes(genes) {
  const g = { ...genes, pattern: [...genes.pattern] };

  // Mutate pattern (15% per slot, but keep forward always true)
  if (Math.random() < 0.15) g.pattern[0] = !g.pattern[0];
  if (Math.random() < 0.15) g.pattern[2] = !g.pattern[2];

  // Mutate internode
  if (Math.random() < 0.1) {
    g.internode = Math.max(1, Math.min(5, g.internode + (Math.random() < 0.5 ? -1 : 1)));
  }

  // Mutate hue (drift)
  g.hue = (g.hue + (Math.random() - 0.5) * 25 + 360) % 360;

  // Mutate efficiency
  if (Math.random() < 0.1) {
    g.efficiency = Math.max(0.7, Math.min(1.3, g.efficiency + (Math.random() - 0.5) * 0.1));
  }

  return g;
}

// === FACING DIRECTIONS ===
const FACING = {
  N: { left: [-1, 0], fwd: [0, -1], right: [1, 0] },
  E: { left: [0, -1], fwd: [1, 0], right: [0, 1] },
  S: { left: [1, 0], fwd: [0, 1], right: [-1, 0] },
  W: { left: [0, 1], fwd: [-1, 0], right: [0, -1] },
};

function getFacing(dx, dy) {
  if (dy < 0) return 'N';
  if (dx > 0) return 'E';
  if (dy > 0) return 'S';
  return 'W';
}

// === SEED ===
class Seed {
  constructor(x, y, parentGenes) {
    this.x = x;
    this.y = y;
    this.genes = parentGenes ? mutateGenes(parentGenes) : createGenes();
    this.stepsRemaining = GROWTH.SEED_DISPERSE_STEPS;
    this.landed = false;

    this.sprite = new PIXI.Graphics();
    this.drawSprite();
    app.stage.addChild(this.sprite);
  }

  drawSprite() {
    this.sprite.clear();
    this.sprite.beginFill(hslToHex(this.genes.hue, 70, 65));
    this.sprite.drawCircle(SCALE/2, SCALE/2, SCALE/2 - 1);
    this.sprite.endFill();
    this.sprite.x = this.x * SCALE;
    this.sprite.y = this.y * SCALE;
  }

  update() {
    if (this.landed) return this.germinate();

    if (this.stepsRemaining > 0) {
      // Drift randomly
      const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
      const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      const nx = Math.max(0, Math.min(COLS - 1, this.x + dx));
      const ny = Math.max(0, Math.min(ROWS - 1, this.y + dy));

      if (!grid.isOccupied(nx, ny)) {
        this.x = nx;
        this.y = ny;
        this.sprite.x = nx * SCALE;
        this.sprite.y = ny * SCALE;
      }
      this.stepsRemaining--;
    } else {
      // Try to land
      if (grid.canGrowWithShyness(this.x, this.y, -1) && totalCells < CARRYING_CAPACITY) {
        this.landed = true;
      } else {
        this.remove();
        return false;
      }
    }
    return true;
  }

  germinate() {
    // Create new plant
    const plantId = plantIdCounter++;
    const plant = new Plant(plantId, this.genes);
    plants.set(plantId, plant);

    // Create root cell
    const rootCell = new PlantCell(this.x, this.y, plant, 'N', true);
    rootCell.energy = ENERGY.SEED_START;
    plant.addCell(rootCell);
    grid.set(this.x, this.y, rootCell);

    this.remove();
    return false;
  }

  remove() {
    if (this.sprite.parent) app.stage.removeChild(this.sprite);
  }
}

// === PLANT CELL ===
class PlantCell {
  constructor(x, y, plant, facing, isBud) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.plantId = plant.id;
    this.facing = facing;
    this.isBud = isBud;
    this.energy = 0;
    this.growthTick = 0;
    this.growthsSinceNode = 0;
    this.dead = false;

    this.sprite = new PIXI.Graphics();
    this.updateVisual();
    app.stage.addChild(this.sprite);
  }

  updateVisual() {
    this.sprite.clear();
    const genes = this.plant.genes;

    // Brightness based on energy (dim when low, bright when high)
    const energyRatio = Math.min(1, this.energy / 20);
    const lum = 25 + energyRatio * 35;
    const sat = this.isBud ? 80 : 50;

    this.sprite.beginFill(hslToHex(genes.hue, sat, lum));
    this.sprite.drawRect(0, 0, SCALE - 1, SCALE - 1);
    this.sprite.endFill();

    this.sprite.x = this.x * SCALE;
    this.sprite.y = this.y * SCALE;
  }

  update() {
    if (this.dead) return;

    // Maintenance cost
    this.energy -= ENERGY.MAINTENANCE_COST;

    // Collect energy from empty neighbors (light)
    const emptyCount = grid.emptyCardinals(this.x, this.y);
    const genes = this.plant.genes;
    for (let i = 0; i < emptyCount; i++) {
      if (Math.random() < ENERGY.COLLECTION_BASE * genes.efficiency) {
        this.energy = Math.min(ENERGY.MAX, this.energy + 1);
      }
    }

    // Starve if no energy
    if (this.energy <= 0) {
      this.die();
      return;
    }

    // Buds try to grow periodically
    if (this.isBud) {
      this.growthTick++;
      if (this.growthTick >= GROWTH.INTERVAL) {
        this.growthTick = 0;
        if (this.energy >= ENERGY.GROWTH_COST && totalCells < CARRYING_CAPACITY) {
          if (this.plant.cellCount < GROWTH.MAX_CELLS_PER_PLANT) {
            this.tryGrow();
          }
        }
      }
    }

    // Update visual every few frames
    if (frame % 10 === 0) this.updateVisual();
  }

  tryGrow() {
    const genes = this.plant.genes;
    const dirs = FACING[this.facing];
    const pattern = genes.pattern;
    let grew = false;

    this.growthsSinceNode++;
    const shouldBranch = this.growthsSinceNode >= genes.internode;

    // Try each growth direction
    const slots = ['left', 'fwd', 'right'];
    for (let i = 0; i < 3; i++) {
      if (!pattern[i]) continue;
      if (i !== 1 && !shouldBranch) continue; // Only forward unless branching
      if (this.energy < ENERGY.GROWTH_COST) break;

      const [dx, dy] = dirs[slots[i]];
      const nx = this.x + dx;
      const ny = this.y + dy;

      if (grid.canGrowWithShyness(nx, ny, this.plantId)) {
        this.energy -= ENERGY.GROWTH_COST;

        const newFacing = getFacing(dx, dy);
        const newCell = new PlantCell(nx, ny, this.plant, newFacing, true);
        newCell.energy = 3; // Small starting energy

        this.plant.addCell(newCell);
        grid.set(nx, ny, newCell);
        grew = true;
      }
    }

    if (grew) {
      if (shouldBranch) this.growthsSinceNode = 0;
      this.isBud = false;
      this.plant.budMatured(this);
      this.updateVisual();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    grid.remove(this.x, this.y);
    if (this.sprite.parent) app.stage.removeChild(this.sprite);
    this.plant.removeCell(this);
  }
}

// === UTILITIES ===
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return parseInt(`${f(0)}${f(8)}${f(4)}`, 16);
}

// === MAIN LOOP ===
function mainLoop() {
  if (!paused) {
    const updates = fastForward ? fastForwardFactor : 1;
    for (let i = 0; i < updates; i++) {
      frame++;

      // Update seeds
      seeds = seeds.filter(s => s.update());

      // Update plants
      for (const [id, plant] of plants) {
        plant.update();
        if (plant.dead) plants.delete(id);
      }

      // Respawn if extinction
      if (seeds.length === 0 && plants.size === 0) {
        for (let i = 0; i < 3; i++) {
          const x = Math.floor(Math.random() * COLS);
          const y = Math.floor(Math.random() * ROWS);
          if (!grid.isOccupied(x, y)) {
            seeds.push(new Seed(x, y, null));
          }
        }
      }
    }
  }

  // Update info
  const info = document.getElementById('info');
  const avgEfficiency = plants.size > 0
    ? ([...plants.values()].reduce((s, p) => s + p.genes.efficiency, 0) / plants.size).toFixed(2)
    : '-';
  info.innerHTML = `Frame: ${frame} | Cells: ${totalCells}/${CARRYING_CAPACITY} | Plants: ${plants.size} | Seeds: ${seeds.length}<br>Avg Efficiency Gene: ${avgEfficiency}`;
  if (fastForward) info.innerHTML += ' | [FAST]';
  if (paused) info.innerHTML += ' | [PAUSED]';

  requestAnimationFrame(mainLoop);
}

// === CONTROLS ===
function setupControls() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') fastForward = !fastForward;
    if (e.key === ' ') { paused = !paused; e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') reset();
  });
}

function reset() {
  for (const [id, plant] of plants) {
    for (const cell of plant.cells) {
      if (cell.sprite.parent) app.stage.removeChild(cell.sprite);
    }
  }
  for (const seed of seeds) {
    if (seed.sprite.parent) app.stage.removeChild(seed.sprite);
  }

  plants.clear();
  seeds = [];
  grid = new OccupancyGrid(COLS, ROWS);
  frame = 0;
  plantIdCounter = 0;
  totalCells = 0;

  const spacing = Math.floor(COLS / 4);
  for (let i = 0; i < 3; i++) {
    const x = spacing + i * spacing;
    const y = Math.floor(ROWS / 2);
    if (!grid.isOccupied(x, y)) {
      seeds.push(new Seed(x, y, null));
    }
  }
}

// === START ===
document.addEventListener('DOMContentLoaded', init);
