// Simplant v16: Headless to 1M ticks, then render final state
// - Runs simulation without rendering until target tick
// - Shows progress bar during simulation
// - Renders final state when complete
// - Toggle experiments with 1/2/3 before or after run

console.log("Simplant v16: Headless Evolution - script loaded");

// --- Configuration ---
const CONFIG = {
  TARGET_TICKS: 1000000,
  GRID_SIZE: 100, // 100x100 grid
  SCALE_SIZE: 8,
  RNG_SEED: 14,

  // Core simulation
  LIGHT_ABSORB_PROB: 0.6,
  LIGHT_COOLDOWN: 30,
  GERMINATION_CLEAR_RADIUS: 3,
  MUTATION_RATE: 0.2,
  MAX_PLANT_AGE: 1000,
  STARVATION_TICKS: 200,
  AIRBORNE_STEPS: 40,

  // Experimental features
  GRADUATED_ABSORPTION: false,
  CHILD_STARTING_ENERGY: false,
  DISTANCE_BONUS: false,
  DISTANCE_BONUS_FACTOR: 0.1,
};

// --- State ---
let rngState = CONFIG.RNG_SEED >>> 0;
let frame = 0;
let plants = [];
let lightParticles = [];
let travelingSeeds = [];
let idCounter = 0;
let cols, rows;
let grid;
let running = false;
let completed = false;

// PIXI state (only used for final render)
let app;
let textures = {};

// --- PRNG ---
function rand() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0x100000000;
}
function randInt(n) { return Math.floor(rand() * n); }

// --- Grid ---
function idx(x, y) { return y * cols + x; }
function wrap(x, y) {
  return { x: ((x % cols) + cols) % cols, y: ((y % rows) + rows) % rows };
}
function getCell(x, y) {
  const w = wrap(x, y);
  return grid[idx(w.x, w.y)];
}
function setCell(x, y, cell) {
  const w = wrap(x, y);
  grid[idx(w.x, w.y)] = cell;
}
function clearCell(x, y) {
  const w = wrap(x, y);
  grid[idx(w.x, w.y)] = null;
}
function isEmpty(x, y) { return !getCell(x, y); }

function countOpenCardinals(x, y) {
  let count = 0;
  if (isEmpty(x, y - 1)) count++;
  if (isEmpty(x + 1, y)) count++;
  if (isEmpty(x, y + 1)) count++;
  if (isEmpty(x - 1, y)) count++;
  return count;
}

function hasOtherPlantNeighborMoore(x, y, plant) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const cell = getCell(x + dx, y + dy);
      if (cell && cell.plant !== plant) return true;
    }
  }
  return false;
}

function checkNeighborsEmpty(x, y, radius) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!isEmpty(x + dx, y + dy)) return false;
    }
  }
  return true;
}

// --- Genetics ---
class GeneNode {
  constructor(geneBits) {
    this.geneBits = geneBits;
    this.parent = null;
    this.children = [null, null, null];
    this.slotFromParent = null;
    this.cell = null;
    this.grownMask = 0;
  }
  hasChildInSlot(slot) { return (this.geneBits >> slot) & 1; }
  isChildGrown(slot) { return (this.grownMask >> slot) & 1; }
  markChildGrown(slot) { this.grownMask |= 1 << slot; }
}

function decodeGenomeToTree(genome) {
  let index = 0;
  function buildNode() {
    if (index >= genome.length) return null;
    const geneBits = genome[index++];
    const node = new GeneNode(geneBits);
    for (let slot = 0; slot < 3; slot++) {
      if (node.hasChildInSlot(slot)) {
        const child = buildNode();
        if (child) {
          node.children[slot] = child;
          child.parent = node;
          child.slotFromParent = slot;
        }
      }
    }
    return node;
  }
  return buildNode();
}

function encodeTreeToGenome(root) {
  const result = [];
  function traverse(node) {
    if (!node) return;
    result.push(node.geneBits);
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) traverse(node.children[slot]);
    }
  }
  traverse(root);
  return new Uint8Array(result);
}

function getNodeAtIndex(root, index) {
  let current = 0;
  let result = null;
  function traverse(node) {
    if (!node || result) return;
    if (current === index) { result = node; return; }
    current++;
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) traverse(node.children[slot]);
    }
  }
  traverse(root);
  return result;
}

function mutateGenome(genome) {
  const newGenome = new Uint8Array(genome);
  const len = newGenome.length;
  let geneIdx;
  if (len > 1) {
    const i1 = randInt(len);
    const i2 = randInt(len);
    geneIdx = Math.max(i1, i2);
    if (geneIdx === 0) geneIdx = randInt(len - 1) + 1;
  } else {
    geneIdx = 0;
  }
  const bitIdx = randInt(3);
  let root = decodeGenomeToTree(newGenome);
  const targetNode = getNodeAtIndex(root, geneIdx);
  if (!targetNode) return newGenome;
  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;
  if (wasBitSet) {
    const childNode = targetNode.children[bitIdx];
    if (childNode && childNode.geneBits > 0) return newGenome;
  }
  targetNode.geneBits ^= bitMask;
  if (wasBitSet) {
    targetNode.children[bitIdx] = null;
  } else {
    const newChild = new GeneNode(0);
    targetNode.children[bitIdx] = newChild;
    newChild.parent = targetNode;
    newChild.slotFromParent = bitIdx;
  }
  return encodeTreeToGenome(root);
}

// --- Headless Cell/Plant Classes ---
const dirMap = {
  N: [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }],
  E: [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
  S: [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }],
  W: [{ dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }],
};
const rotations = {
  N: ["W", "N", "E"], E: ["N", "E", "S"], S: ["E", "S", "W"], W: ["S", "W", "N"],
};

class Cell {
  constructor(x, y, plant, node, parent, facing, isSeed = false) {
    this.pos = wrap(x, y);
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facing = facing;
    this.children = [];
    this.cooldown = 0;
    this.isSeed = isSeed;
    setCell(this.pos.x, this.pos.y, this);
    plant.registerCell(this);
  }

  getChildPosForSlot(slot) {
    const off = dirMap[this.facing][slot];
    return { x: this.pos.x + off.dx, y: this.pos.y + off.dy };
  }

  getChildFacing(slot) { return rotations[this.facing][slot]; }

  canGrowAt(pos) {
    const w = wrap(pos.x, pos.y);
    return isEmpty(w.x, w.y) && !hasOtherPlantNeighborMoore(w.x, w.y, this.plant);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return;
    const rawPos = this.getChildPosForSlot(slot);
    const w = wrap(rawPos.x, rawPos.y);
    const facing = this.getChildFacing(slot);
    const child = new Cell(w.x, w.y, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  countOpenCardinals() {
    return countOpenCardinals(this.pos.x, this.pos.y);
  }
}

function hsvToRgbInt(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function plantColorFromGenome(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) {
    sum += genome[i] + (i % 7);
  }
  const h = (sum * 0.01) % 1;
  return hsvToRgbInt(h, 0.85, 1.0);
}

class Plant {
  constructor(genome, x, y, startingEnergy = 0) {
    this.id = idCounter++;
    this.genome = genome;
    this.color = plantColorFromGenome(genome);
    this.rootNode = decodeGenomeToTree(genome);
    this.cells = [];
    this.frontier = [];
    this.energy = startingEnergy;
    this.freeSproutUsed = false;
    this.reproPhase = "idle";
    this.childGenome = null;
    this.childGeneCount = 0;
    this.age = 0;
    this.ticksWithoutLight = 0;
    this.dead = false;

    this.seed = new Cell(x, y, this, this.rootNode, null, "N", true);
  }

  get geneCount() { return this.genome.length; }

  registerCell(cell) {
    this.cells.push(cell);
    if (cell.node) {
      cell.node.cell = cell;
      for (let slot = 0; slot < 3; slot++) {
        if (cell.node.children[slot] && !cell.node.isChildGrown(slot)) {
          this.frontier.push({ node: cell.node, slot });
        }
      }
    }
  }

  tryGrowOneStep() {
    if (this.energy < 1 && this.freeSproutUsed) return;
    for (let i = this.frontier.length - 1; i >= 0; i--) {
      const { node, slot } = this.frontier[i];
      if (this.energy < 1 && this.freeSproutUsed) return;
      const pos = node.cell.getChildPosForSlot(slot);
      if (node.cell.canGrowAt(pos)) {
        node.cell.growChildInSlot(slot);
        if (this.freeSproutUsed) this.energy--;
        else this.freeSproutUsed = true;
        this.frontier.splice(i, 1);
        return;
      } else {
        node.markChildGrown(slot);
        this.frontier.splice(i, 1);
      }
    }
  }

  die() {
    this.dead = true;
    for (const cell of this.cells) {
      clearCell(cell.pos.x, cell.pos.y);
      if (cell.node) cell.node.cell = null;
    }
    this.cells = [];
    this.frontier = [];
  }
}

// --- Light Particle (headless) ---
class LightParticle {
  constructor(cell, baseEnergy = 1) {
    this.cell = cell;
    this.plant = cell.plant;
    this.baseEnergy = baseEnergy;
    this.steps = 0;
    this.pauseTicks = 1;
    lightParticles.push(this);
  }

  update() {
    if (this.pauseTicks > 0) { this.pauseTicks--; return; }
    if (this.cell.parent) {
      this.cell = this.cell.parent;
      this.steps++;
    } else {
      let finalEnergy = this.baseEnergy;
      if (CONFIG.DISTANCE_BONUS) {
        finalEnergy = this.baseEnergy * (1 + this.steps * CONFIG.DISTANCE_BONUS_FACTOR);
      }
      this.plant.energy += finalEnergy;
      this.destroy();
    }
  }

  destroy() {
    const idx = lightParticles.indexOf(this);
    if (idx >= 0) lightParticles.splice(idx, 1);
  }
}

// --- Traveling Seed (headless) ---
class TravelingSeed {
  constructor(plant, childGenome) {
    this.state = "attached";
    this.parentPlant = plant;
    this.childGenome = childGenome;
    this.currentNode = plant.rootNode;
    this.pos = null;
    this.stepsTaken = 0;
    travelingSeeds.push(this);
  }

  update() {
    if (this.state === "attached") {
      if (!this.currentNode.cell) { this.destroy(); return; }
      const childCells = this.currentNode.children.filter(c => c && c.cell);
      if (childCells.length > 0) {
        this.currentNode = childCells[randInt(childCells.length)];
      } else {
        this.state = "airborne";
        this.pos = { ...this.currentNode.cell.pos };
        this.stepsTaken = 0;
      }
    } else {
      if (this.stepsTaken >= CONFIG.AIRBORNE_STEPS) {
        this.tryGerminate();
        return;
      }
      const dirs = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }];
      const dir = dirs[randInt(4)];
      const w = wrap(this.pos.x + dir.dx, this.pos.y + dir.dy);
      this.pos = w;
      this.stepsTaken++;
    }
  }

  tryGerminate() {
    if (!isEmpty(this.pos.x, this.pos.y)) { this.destroy(); return; }
    if (!checkNeighborsEmpty(this.pos.x, this.pos.y, CONFIG.GERMINATION_CLEAR_RADIUS)) {
      this.destroy(); return;
    }
    const startingEnergy = CONFIG.CHILD_STARTING_ENERGY ? this.childGenome.length : 0;
    const newPlant = new Plant(this.childGenome, this.pos.x, this.pos.y, startingEnergy);
    plants.push(newPlant);
    this.destroy();
  }

  destroy() {
    const idx = travelingSeeds.indexOf(this);
    if (idx >= 0) travelingSeeds.splice(idx, 1);
  }
}

// --- Simulation Tick ---
function tick() {
  frame++;

  // Growth & death
  for (let i = plants.length - 1; i >= 0; i--) {
    const plant = plants[i];
    plant.age++;
    plant.ticksWithoutLight++;

    if (plant.age >= CONFIG.MAX_PLANT_AGE * plant.geneCount ||
        plant.ticksWithoutLight >= CONFIG.STARVATION_TICKS) {
      plant.die();
      plants.splice(i, 1);
      for (let j = lightParticles.length - 1; j >= 0; j--) {
        if (lightParticles[j].plant === plant) {
          lightParticles.splice(j, 1);
        }
      }
      continue;
    }
    plant.tryGrowOneStep();
  }

  // Light absorption
  for (const plant of plants) {
    for (const cell of plant.cells) {
      if (cell.isSeed) continue;
      if (cell.cooldown > 0) { cell.cooldown--; continue; }

      const openCardinals = cell.countOpenCardinals();
      let canAbsorb = false;
      let baseEnergy = 1;

      if (CONFIG.GRADUATED_ABSORPTION) {
        if (openCardinals >= 1) {
          canAbsorb = true;
          if (openCardinals >= 3) baseEnergy = 1.5;
          else if (openCardinals === 2) baseEnergy = 1.0;
          else baseEnergy = 0.5;
        }
      } else {
        if (openCardinals >= 3) {
          canAbsorb = true;
          baseEnergy = 1;
        }
      }

      if (canAbsorb && rand() < CONFIG.LIGHT_ABSORB_PROB) {
        new LightParticle(cell, baseEnergy);
        cell.cooldown = CONFIG.LIGHT_COOLDOWN;
        plant.ticksWithoutLight = 0;
      }
    }
  }

  // Light propagation
  for (const light of [...lightParticles]) {
    light.update();
  }

  // Reproduction
  for (const plant of plants) {
    const G = plant.geneCount;
    if (plant.reproPhase === "idle") {
      if (plant.energy >= G) {
        plant.childGenome = rand() < CONFIG.MUTATION_RATE
          ? mutateGenome(plant.genome)
          : new Uint8Array(plant.genome);
        plant.childGeneCount = plant.childGenome.length;
        plant.reproPhase = "charging";
      }
    } else if (plant.reproPhase === "charging") {
      if (plant.energy >= G + plant.childGeneCount) {
        new TravelingSeed(plant, plant.childGenome);
        plant.energy -= plant.childGeneCount;
        plant.reproPhase = "idle";
        plant.childGenome = null;
        plant.childGeneCount = 0;
      }
    }
  }

  // Seed transport
  for (const seed of [...travelingSeeds]) {
    seed.update();
  }

  // Extinction restart
  if (plants.length === 0 && travelingSeeds.length === 0) {
    rngState = (rngState + 1337) >>> 0;
    const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);
    const newPlant = new Plant(DEFAULT_GENOME, Math.floor(cols / 2), Math.floor(rows / 2), 0);
    plants.push(newPlant);
  }
}

// --- Initialize Headless ---
function initHeadless() {
  cols = CONFIG.GRID_SIZE;
  rows = CONFIG.GRID_SIZE;
  grid = new Array(cols * rows).fill(null);
  plants = [];
  lightParticles = [];
  travelingSeeds = [];
  frame = 0;
  idCounter = 0;
  rngState = CONFIG.RNG_SEED >>> 0;

  const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);
  const startPlant = new Plant(DEFAULT_GENOME, Math.floor(cols / 2), Math.floor(rows / 2), 0);
  plants.push(startPlant);
}

// --- Run Simulation with Progress ---
async function runSimulation() {
  if (running) return;
  running = true;
  completed = false;

  initHeadless();
  updateUI();

  const startTime = Date.now();
  const BATCH_SIZE = 10000; // Ticks per batch

  while (frame < CONFIG.TARGET_TICKS) {
    // Run a batch of ticks
    for (let i = 0; i < BATCH_SIZE && frame < CONFIG.TARGET_TICKS; i++) {
      tick();
    }

    // Update progress
    const progress = (frame / CONFIG.TARGET_TICKS) * 100;
    const elapsed = (Date.now() - startTime) / 1000;
    const ticksPerSec = frame / elapsed;
    const eta = (CONFIG.TARGET_TICKS - frame) / ticksPerSec;

    document.getElementById("progress-bar").style.width = `${progress}%`;
    document.getElementById("progress-text").textContent =
      `${frame.toLocaleString()} / ${CONFIG.TARGET_TICKS.toLocaleString()} ticks (${progress.toFixed(1)}%) - ETA: ${eta.toFixed(1)}s`;

    // Yield to browser
    await new Promise(r => setTimeout(r, 0));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Simulation complete in ${totalTime}s`);

  running = false;
  completed = true;

  // Render final state
  renderFinalState();
  updateUI();
}

// --- Render Final State ---
function renderFinalState() {
  // Initialize PIXI if needed
  if (!app) {
    app = new PIXI.Application({
      width: cols * CONFIG.SCALE_SIZE,
      height: rows * CONFIG.SCALE_SIZE,
      backgroundColor: 0x000000,
      antialias: false,
    });
    document.getElementById("canvas-div").appendChild(app.view);
    app.view.style.imageRendering = "pixelated";

    // Create textures
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xffffff);
    graphics.drawRect(0, 0, 1, 1);
    graphics.endFill();
    textures.cell = app.renderer.generateTexture(graphics);
  }

  // Clear previous sprites
  app.stage.removeChildren();

  // Render all plants
  for (const plant of plants) {
    const stemColor = lerpColor(0x228b22, plant.color, 0.5);

    for (const cell of plant.cells) {
      const sprite = new PIXI.Sprite(textures.cell);
      sprite.scale.set(CONFIG.SCALE_SIZE);
      sprite.x = cell.pos.x * CONFIG.SCALE_SIZE;
      sprite.y = cell.pos.y * CONFIG.SCALE_SIZE;
      sprite.tint = cell.isSeed ? 0x8b4513 : stemColor;
      app.stage.addChild(sprite);
    }
  }

  // Show stats
  showStats();
}

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

function showStats() {
  if (plants.length === 0) {
    document.getElementById("stats").innerHTML = "No plants survived.";
    return;
  }

  let totalLen = 0, totalCells = 0, maxLen = 0;
  const genomeCounts = new Map();

  for (const p of plants) {
    totalLen += p.genome.length;
    totalCells += p.cells.length;
    if (p.genome.length > maxLen) maxLen = p.genome.length;
    const k = p.genome.toString();
    genomeCounts.set(k, (genomeCounts.get(k) || 0) + 1);
  }

  let maxCount = 0, modeGenome = "";
  for (const [k, count] of genomeCounts.entries()) {
    if (count > maxCount) { maxCount = count; modeGenome = k; }
  }

  const modeGenomeBits = modeGenome.split(",").map(n => parseInt(n).toString(2).padStart(3, "0")).join(" ");

  document.getElementById("stats").innerHTML = `
    <strong>Final State at ${frame.toLocaleString()} ticks:</strong><br>
    Plants: ${plants.length}<br>
    Total Cells: ${totalCells.toLocaleString()}<br>
    Avg Genome Length: ${(totalLen / plants.length).toFixed(2)}<br>
    Max Genome Length: ${maxLen}<br>
    Dominant Genome (${maxCount} clones): ${modeGenomeBits.substring(0, 60)}...
  `;
}

// --- UI ---
function updateUI() {
  const b = CONFIG.GRADUATED_ABSORPTION ? "ON" : "OFF";
  const c = CONFIG.CHILD_STARTING_ENERGY ? "ON" : "OFF";
  const d = CONFIG.DISTANCE_BONUS ? "ON" : "OFF";

  document.getElementById("toggles").innerHTML = `
    <button onclick="toggleGraduated()" style="background:${CONFIG.GRADUATED_ABSORPTION ? '#4a4' : '#444'}">[1] Graduated: ${b}</button>
    <button onclick="toggleChildEnergy()" style="background:${CONFIG.CHILD_STARTING_ENERGY ? '#4a4' : '#444'}">[2] ChildEnergy: ${c}</button>
    <button onclick="toggleDistBonus()" style="background:${CONFIG.DISTANCE_BONUS ? '#4a4' : '#444'}">[3] DistBonus: ${d}</button>
    <button onclick="runSimulation()" style="background:#48f" ${running ? 'disabled' : ''}>${running ? 'Running...' : 'Run 1M Ticks'}</button>
  `;
}

function toggleGraduated() {
  if (running) return;
  CONFIG.GRADUATED_ABSORPTION = !CONFIG.GRADUATED_ABSORPTION;
  updateUI();
}

function toggleChildEnergy() {
  if (running) return;
  CONFIG.CHILD_STARTING_ENERGY = !CONFIG.CHILD_STARTING_ENERGY;
  updateUI();
}

function toggleDistBonus() {
  if (running) return;
  CONFIG.DISTANCE_BONUS = !CONFIG.DISTANCE_BONUS;
  updateUI();
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (running) return;
  if (e.key === "1") toggleGraduated();
  if (e.key === "2") toggleChildEnergy();
  if (e.key === "3") toggleDistBonus();
  if (e.key === "Enter") runSimulation();
});

// Initialize UI on load
window.addEventListener("load", () => {
  updateUI();
});
