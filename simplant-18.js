// Simplant v18: Object Pooling for Sprites
// Based on v17, with sprite pooling to eliminate creation/destruction overhead
// Key change: Reuse sprites instead of new/destroy

console.log("Simplant v18: Object Pooling - script loaded");

// --- Constants ---
const CONSTANTS = {
  SCALE_SIZE: 4,
  TICK_INTERVAL_MS: 1,
  RNG_SEED: 14,
  ENABLE_PLANT_TINT: true,
  PLANT_TINT_STRENGTH: 0.5,

  COLORS: {
    SEED_IDLE: 0x8b4513,
    SEED_READY: 0xff0000,
    SEED_CHARGED: 0xffffff,
    SEED: 0x8b4513,
    STEM: 0x228b22,
    LIGHT: 0xffff00,
    BG: 0x000000,
  },

  THEMES: [
    { NAME: "Original", COLORS: { SEED_IDLE: 0x8b4513, SEED_READY: 0xff0000, SEED_CHARGED: 0xffffff, SEED: 0x8b4513, STEM: 0x228b22, LIGHT: 0xffff00, BG: 0x000000 } },
    { NAME: "Bioluminescent Abyss", COLORS: { SEED_IDLE: 0xffaa00, SEED_READY: 0xff00ff, SEED_CHARGED: 0xffffff, SEED: 0xffaa00, STEM: 0x00ffff, LIGHT: 0xff0088, BG: 0x050510 } },
    { NAME: "Satellite Infrared", COLORS: { SEED_IDLE: 0x4b0082, SEED_READY: 0xffffff, SEED_CHARGED: 0xff0000, SEED: 0x4b0082, STEM: 0xff4500, LIGHT: 0xffff00, BG: 0x2f4f4f } },
    { NAME: "Paper & Ink", COLORS: { SEED_IDLE: 0x2f2f2f, SEED_READY: 0x8b0000, SEED_CHARGED: 0x000000, SEED: 0x2f2f2f, STEM: 0x556b2f, LIGHT: 0x87ceeb, BG: 0xf5f5dc } },
    { NAME: "Dark Ink", COLORS: { SEED_IDLE: 0x888888, SEED_READY: 0xff4444, SEED_CHARGED: 0xffffff, SEED: 0x888888, STEM: 0x6b8e23, LIGHT: 0xadd8e6, BG: 0x000000 } },
  ],

  LIGHT_ABSORB_PROB: 0.6,
  LIGHT_COOLDOWN: 30,
  LIGHT_ABSORPTION_PAUSE: 1,
  NUM_STARTER_SEEDS: 1,
  FORCE_SEED_STALK: true,
  ENABLE_RANDOM_FACING: false,
  AIRBORNE_STEPS: 40,
  MUTATION_RATE: 0.2,
  MAX_PLANT_AGE: 1000,
  STARVATION_TICKS: 200,
  GERMINATION_CLEAR_RADIUS: 3,
  GRADUATED_ABSORPTION: false,
  CHILD_STARTING_ENERGY: false,
  DISTANCE_BONUS: false,
  DISTANCE_BONUS_FACTOR: 0.1,
};

// --- Global State ---
let app;
let cols, rows;
let occupancyGrid;
let textures = {};
let frame = 0;
let paused = true;
let fastForward = true;
let fastForwardFactor = 100;
let fastForwardLevels = [0.5, 1, 10, 100];
let fastForwardIndex = 3;
let lastTickTime = 0;
let lightParticles = [];
let travelingSeeds = [];
let plants = [];
let currentThemeIndex = 0;

// UI
let fpsText, particleCountText, experimentText;
let uiUpdateCounter = 0;
const UI_UPDATE_INTERVAL = 15;

// --- Sprite Pools ---
// Pool sprites are kept on stage but with visible=false when inactive
// This avoids addChild/removeChild overhead entirely
class SpritePool {
  constructor(texture, initialSize = 100) {
    this.texture = texture;
    this.pool = [];
    this.activeCount = 0;
  }

  acquire(x, y, tint = 0xffffff, alpha = 1) {
    let sprite;
    if (this.activeCount < this.pool.length) {
      sprite = this.pool[this.activeCount];
    } else {
      sprite = new PIXI.Sprite(this.texture);
      sprite.scale.set(CONSTANTS.SCALE_SIZE);
      app.stage.addChild(sprite);
      this.pool.push(sprite);
    }
    sprite.x = x * CONSTANTS.SCALE_SIZE;
    sprite.y = y * CONSTANTS.SCALE_SIZE;
    sprite.tint = tint;
    sprite.alpha = alpha;
    sprite.visible = true;
    this.activeCount++;
    return sprite;
  }

  release(sprite) {
    sprite.visible = false;
    // Swap with last active sprite for O(1) removal
    const idx = this.pool.indexOf(sprite);
    if (idx !== -1 && idx < this.activeCount) {
      this.activeCount--;
      // Swap positions in array
      const lastActive = this.pool[this.activeCount];
      this.pool[idx] = lastActive;
      this.pool[this.activeCount] = sprite;
    }
  }

  updateTexture(newTexture) {
    this.texture = newTexture;
    for (const sprite of this.pool) {
      sprite.texture = newTexture;
    }
  }
}

let lightPool, seedPool, stemPool;

// --- PRNG ---
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(params.get("seed") || CONSTANTS.RNG_SEED.toString(), 10);
let rngState = (isFinite(seedParam) ? seedParam : CONSTANTS.RNG_SEED) >>> 0;

function rand() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0x100000000;
}

function randInt(n) {
  return Math.floor(rand() * n);
}

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
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
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  return hsvToRgbInt((sum * 0.01) % 1, 0.85, 1.0);
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

function mutateGenome(genome) {
  const newGenome = new Uint8Array(genome);
  let geneIdx;
  const len = newGenome.length;
  if (len > 1) {
    geneIdx = Math.max(randInt(len), randInt(len));
    if (CONSTANTS.FORCE_SEED_STALK && geneIdx === 0) geneIdx = randInt(len - 1) + 1;
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

function getNodeAtIndex(root, index) {
  let current = 0, result = null;
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

// --- Grid Utilities ---
function wrapX(x) { return ((x % cols) + cols) % cols; }
function wrapY(y) { return ((y % rows) + rows) % rows; }

function isCellEmpty(x, y) {
  return !occupancyGrid.grid[wrapY(y) * cols + wrapX(x)];
}

function checkNeighborsEmpty(x, y, radius) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!isCellEmpty(x + dx, y + dy)) return false;
    }
  }
  return true;
}

function hasOtherPlantNeighborMoore(x, y, plant) {
  const grid = occupancyGrid.grid;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const cell = grid[wrapY(y + dy) * cols + wrapX(x + dx)];
      if (cell && cell.plant !== plant) return true;
    }
  }
  return false;
}

// --- Direction Tables ---
const DIR_MAP_N = [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }];
const DIR_MAP_E = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
const DIR_MAP_S = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
const DIR_MAP_W = [{ dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }];
const DIR_MAPS = { N: DIR_MAP_N, E: DIR_MAP_E, S: DIR_MAP_S, W: DIR_MAP_W };
const ROTATIONS = { N: ["W", "N", "E"], E: ["N", "E", "S"], S: ["E", "S", "W"], W: ["S", "W", "N"] };

let idCounter = 0;

// --- Plant ---
class Plant {
  constructor(genome, seedCell, startingEnergy = 0) {
    this.id = idCounter++;
    this.color = plantColorFromGenome(genome);
    this.stemTint = CONSTANTS.ENABLE_PLANT_TINT
      ? lerpColor(CONSTANTS.COLORS.STEM, this.color, CONSTANTS.PLANT_TINT_STRENGTH)
      : CONSTANTS.COLORS.STEM;
    this.genome = genome;
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell;
    this.energy = startingEnergy;
    this.freeSproutUsed = false;
    this.cells = [];
    this.frontier = [];
    this.reproPhase = "idle";
    this.childGenome = null;
    this.childGeneCount = 0;
    this.age = 0;
    this.ticksWithoutLight = 0;
    this.dead = false;
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
      const off = DIR_MAPS[node.cell.facing][slot];
      const px = node.cell.pos.x + off.dx;
      const py = node.cell.pos.y + off.dy;
      const wx = wrapX(px), wy = wrapY(py);
      if (isCellEmpty(wx, wy) && !hasOtherPlantNeighborMoore(wx, wy, this)) {
        node.cell.growChildInSlot(slot, wx, wy);
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
      occupancyGrid.grid[cell.pos.y * cols + cell.pos.x] = null;
      if (cell.isSeed) seedPool.release(cell.sprite);
      else stemPool.release(cell.sprite);
      if (cell.node) cell.node.cell = null;
    }
    this.cells = [];
    this.frontier = [];
    for (let i = lightParticles.length - 1; i >= 0; i--) {
      if (lightParticles[i].plant === this) {
        lightParticles[i].markedForRemoval = true;
      }
    }
  }

  updateVisuals() {
    if (!this.seed || !this.seed.sprite) return;
    let color = CONSTANTS.COLORS.SEED_IDLE;
    const G = this.geneCount;
    if (this.reproPhase === "idle") {
      color = lerpColor(CONSTANTS.COLORS.SEED_IDLE, CONSTANTS.COLORS.SEED_READY, Math.min(1, this.energy / G));
    } else if (this.reproPhase === "charging") {
      const t = Math.min(1, (this.energy - G) / this.childGeneCount);
      color = lerpColor(CONSTANTS.COLORS.SEED_READY, CONSTANTS.COLORS.SEED_CHARGED, t);
    }
    this.seed.sprite.tint = color;
  }
}

// --- Cells ---
class SeedCell {
  constructor(x, y, plant) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = plant.rootNode;
    this.parent = null;
    this.children = [];
    this.cooldown = 0;
    this.facing = CONSTANTS.ENABLE_RANDOM_FACING ? ["N", "E", "S", "W"][randInt(4)] : "N";
    this.isSeed = true;
    this.sprite = seedPool.acquire(x, y, CONSTANTS.COLORS.SEED_IDLE, 1);
    occupancyGrid.grid[y * cols + x] = this;
    this.plant.registerCell(this);
  }

  growChildInSlot(slot, wx, wy) {
    const childNode = this.node.children[slot];
    if (!childNode) return;
    const facing = ROTATIONS[this.facing][slot];
    const child = new PlantCell(wx, wy, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  countOpenCardinals() {
    const x = this.pos.x, y = this.pos.y;
    let count = 0;
    if (isCellEmpty(x, y - 1)) count++;
    if (isCellEmpty(x + 1, y)) count++;
    if (isCellEmpty(x, y + 1)) count++;
    if (isCellEmpty(x - 1, y)) count++;
    return count;
  }
}

class PlantCell {
  constructor(x, y, plant, node, parent, facing) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facing = facing;
    this.children = [];
    this.cooldown = 0;
    this.isSeed = false;
    this.sprite = stemPool.acquire(x, y, this.plant.stemTint, 1);
    occupancyGrid.grid[y * cols + x] = this;
    this.plant.registerCell(this);
  }

  growChildInSlot(slot, wx, wy) {
    const childNode = this.node.children[slot];
    if (!childNode) return;
    const facing = ROTATIONS[this.facing][slot];
    const child = new PlantCell(wx, wy, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  countOpenCardinals() {
    const x = this.pos.x, y = this.pos.y;
    let count = 0;
    if (isCellEmpty(x, y - 1)) count++;
    if (isCellEmpty(x + 1, y)) count++;
    if (isCellEmpty(x, y + 1)) count++;
    if (isCellEmpty(x - 1, y)) count++;
    return count;
  }
}

class OccupancyGrid {
  constructor(c, r) {
    this.cols = c;
    this.rows = r;
    this.grid = new Array(c * r).fill(null);
  }
}

// --- Light Particles (Pooled) ---
class LightParticle {
  constructor(cell, baseEnergy = 1) {
    this.cell = cell;
    this.plant = cell.plant;
    this.baseEnergy = baseEnergy;
    this.steps = 0;
    this.markedForRemoval = false;
    this.sprite = lightPool.acquire(cell.pos.x, cell.pos.y, CONSTANTS.COLORS.LIGHT, 0.5);
    this.pauseTicks = CONSTANTS.LIGHT_ABSORPTION_PAUSE;
  }

  update() {
    if (this.pauseTicks > 0) { this.pauseTicks--; return; }
    if (this.cell.parent) {
      this.cell = this.cell.parent;
      this.steps++;
      this.sprite.x = this.cell.pos.x * CONSTANTS.SCALE_SIZE;
      this.sprite.y = this.cell.pos.y * CONSTANTS.SCALE_SIZE;
    } else {
      let finalEnergy = this.baseEnergy;
      if (CONSTANTS.DISTANCE_BONUS) {
        finalEnergy = this.baseEnergy * (1 + this.steps * CONSTANTS.DISTANCE_BONUS_FACTOR);
      }
      this.plant.energy += finalEnergy;
      this.markedForRemoval = true;
    }
  }

  destroy() {
    lightPool.release(this.sprite);
  }
}

// --- Traveling Seeds (Pooled) ---
class TravelingSeed {
  constructor(plant, childGenome) {
    this.state = "attached";
    this.parentPlant = plant;
    this.childGenome = childGenome;
    this.currentNode = plant.rootNode;
    this.pos = null;
    this.stepsTaken = 0;
    this.maxSteps = CONSTANTS.AIRBORNE_STEPS;
    this.sprite = null;
    this.markedForRemoval = false;
  }

  updateAttached() {
    if (!this.currentNode.cell) { this.markedForRemoval = true; return; }
    const children = this.currentNode.children;
    let validChildren = [];
    for (let i = 0; i < 3; i++) {
      if (children[i] && children[i].cell) validChildren.push(children[i]);
    }
    if (validChildren.length > 0) {
      this.currentNode = validChildren[randInt(validChildren.length)];
    } else {
      this.becomeAirborne();
    }
  }

  becomeAirborne() {
    this.state = "airborne";
    this.pos = { x: this.currentNode.cell.pos.x, y: this.currentNode.cell.pos.y };
    this.stepsTaken = 0;
    this.sprite = seedPool.acquire(this.pos.x, this.pos.y, CONSTANTS.COLORS.SEED_IDLE, 0.1);
  }

  updateAirborne() {
    if (this.stepsTaken >= this.maxSteps) { this.tryGerminate(); return; }
    const dir = randInt(4);
    let dx = 0, dy = 0;
    if (dir === 0) dx = -1;
    else if (dir === 1) dx = 1;
    else if (dir === 2) dy = -1;
    else dy = 1;
    this.pos.x = wrapX(this.pos.x + dx);
    this.pos.y = wrapY(this.pos.y + dy);
    this.sprite.x = this.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = this.pos.y * CONSTANTS.SCALE_SIZE;
    this.stepsTaken++;
  }

  tryGerminate() {
    const x = this.pos.x, y = this.pos.y;
    if (!isCellEmpty(x, y) || !checkNeighborsEmpty(x, y, CONSTANTS.GERMINATION_CLEAR_RADIUS)) {
      this.markedForRemoval = true;
      return;
    }
    const startingEnergy = CONSTANTS.CHILD_STARTING_ENERGY ? this.childGenome.length : 0;
    plants.push(createPlant(this.childGenome, x, y, startingEnergy));
    this.markedForRemoval = true;
  }

  destroy() {
    if (this.sprite) seedPool.release(this.sprite);
  }
}

// --- Init ---
const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

function createPlant(genome, x, y, startingEnergy = 0) {
  const plant = new Plant(genome, null, startingEnergy);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

function initializeSeeds() {
  const numSeeds = CONSTANTS.NUM_STARTER_SEEDS;
  const halfMutated = Math.floor(numSeeds / 2);
  for (let i = 0; i < numSeeds; i++) {
    let x, y;
    if (numSeeds === 1 && i === 0) {
      x = Math.floor(cols / 2);
      y = Math.floor(rows / 2);
      if (!isCellEmpty(x, y)) { x = randInt(cols); y = randInt(rows); }
    } else {
      let attempts = 0;
      do { x = randInt(cols); y = randInt(rows); attempts++; } while (!isCellEmpty(x, y) && attempts < 1000);
      if (attempts >= 1000) continue;
    }
    const genome = i < numSeeds - halfMutated ? new Uint8Array(DEFAULT_GENOME) : mutateGenome(DEFAULT_GENOME);
    plants.push(createPlant(genome, x, y));
  }
  console.log(`Initialized ${plants.length} seeds`);
}

function init() {
  console.log("Simplant v18: initializing with object pooling");
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: CONSTANTS.COLORS.BG,
    antialias: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";
  app.renderer.roundPixels = true;

  cols = Math.floor(window.innerWidth / CONSTANTS.SCALE_SIZE);
  rows = Math.floor(window.innerHeight / CONSTANTS.SCALE_SIZE);
  console.log(`Grid: ${cols}x${rows}`);

  occupancyGrid = new OccupancyGrid(cols, rows);
  createTextures();

  // Initialize pools after textures exist
  lightPool = new SpritePool(textures.light, 500);
  seedPool = new SpritePool(textures.seed, 200);
  stemPool = new SpritePool(textures.stem, 2000);

  createUI();
  initializeSeeds();

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  app.view.addEventListener("click", () => { if (paused) advanceTick(); });

  const btn = document.createElement("button");
  btn.id = "ff-btn";
  btn.innerText = `${fastForwardFactor}x`;
  btn.style.cssText = "position:absolute;top:10px;right:10px;z-index:1000;padding:10px;background:#333;color:#fff;border:1px solid #fff;cursor:pointer";
  btn.onclick = () => {
    fastForwardIndex = (fastForwardIndex + 1) % fastForwardLevels.length;
    fastForwardFactor = fastForwardLevels[fastForwardIndex];
    btn.innerText = `${fastForwardFactor}x`;
    fastForward = fastForwardFactor > 1;
    if (fastForward) paused = false;
  };
  document.body.appendChild(btn);

  app.ticker.add(gameLoop);
  setTimeout(() => { if (frame === 0) paused = false; }, 1000);
}

function createTextures() {
  function createRectTexture(color) {
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(0, 0, 1, 1);
    g.endFill();
    return app.renderer.generateTexture(g);
  }
  textures.seed = createRectTexture(0xffffff);
  textures.stem = createRectTexture(0xffffff);
  textures.light = createRectTexture(CONSTANTS.COLORS.LIGHT);
}

function createUI() {
  const style = new PIXI.TextStyle({ fontFamily: "Arial", fontSize: 14, fill: "#ffffff", stroke: "#000000", strokeThickness: 2 });
  fpsText = new PIXI.Text("FPS: 0", style);
  fpsText.x = 10; fpsText.y = 10; fpsText.zIndex = 1000;
  app.stage.addChild(fpsText);

  particleCountText = new PIXI.Text("", style);
  particleCountText.x = 10; particleCountText.y = 30; particleCountText.zIndex = 1000;
  app.stage.addChild(particleCountText);

  experimentText = new PIXI.Text("", style);
  experimentText.x = 10; experimentText.y = 50; experimentText.zIndex = 1000;
  app.stage.addChild(experimentText);
  updateExperimentText();

  app.stage.sortableChildren = true;
}

function updateExperimentText() {
  if (!experimentText) return;
  experimentText.text = `[1] Graduated: ${CONSTANTS.GRADUATED_ABSORPTION ? "ON" : "OFF"} | [2] ChildEnergy: ${CONSTANTS.CHILD_STARTING_ENERGY ? "ON" : "OFF"} | [3] DistBonus: ${CONSTANTS.DISTANCE_BONUS ? "ON" : "OFF"}`;
}

function resetSimulation() {
  console.log("Resetting...");
  for (const plant of plants) {
    for (const cell of plant.cells) {
      if (cell.isSeed) seedPool.release(cell.sprite);
      else stemPool.release(cell.sprite);
    }
  }
  plants = [];
  for (const light of lightParticles) lightPool.release(light.sprite);
  lightParticles = [];
  for (const seed of travelingSeeds) { if (seed.sprite) seedPool.release(seed.sprite); }
  travelingSeeds = [];
  occupancyGrid = new OccupancyGrid(cols, rows);
  frame = 0;
  idCounter = 0;
  rngState = CONSTANTS.RNG_SEED >>> 0;
  initializeSeeds();
  updateExperimentText();
  console.log("Reset complete");
}

// --- Reproduction ---
function updateReproduction(plant) {
  const G = plant.geneCount;
  if (plant.reproPhase === "idle") {
    if (plant.energy >= G) {
      plant.childGenome = rand() < CONSTANTS.MUTATION_RATE ? mutateGenome(plant.genome) : new Uint8Array(plant.genome);
      plant.childGeneCount = plant.childGenome.length;
      plant.reproPhase = "charging";
    }
  } else if (plant.reproPhase === "charging") {
    if (plant.energy >= G + plant.childGeneCount) {
      travelingSeeds.push(new TravelingSeed(plant, plant.childGenome));
      plant.energy -= plant.childGeneCount;
      plant.reproPhase = "idle";
      plant.childGenome = null;
      plant.childGeneCount = 0;
    }
  }
}

// --- Main Loop ---
function gameLoop() {
  if (paused) return;

  if (fastForward) {
    for (let i = 0; i < fastForwardFactor; i++) advanceTick();
  } else {
    const now = Date.now();
    let interval = CONSTANTS.TICK_INTERVAL_MS;
    if (fastForwardFactor < 1) interval = 1000 / 60 / fastForwardFactor;
    if (now - lastTickTime >= interval) {
      advanceTick();
      lastTickTime = now;
    } else return;
  }

  uiUpdateCounter++;
  if (uiUpdateCounter >= UI_UPDATE_INTERVAL) {
    updateUI();
    uiUpdateCounter = 0;
  }
}

function advanceTick() {
  frame++;

  // 1. GROWTH & DEATH
  for (let i = plants.length - 1; i >= 0; i--) {
    const plant = plants[i];
    plant.age++;
    plant.ticksWithoutLight++;
    if (plant.age >= CONSTANTS.MAX_PLANT_AGE * plant.geneCount || plant.ticksWithoutLight >= CONSTANTS.STARVATION_TICKS) {
      plant.die();
      plants.splice(i, 1);
      continue;
    }
    plant.tryGrowOneStep();
  }

  // 2. LIGHT ABSORPTION
  for (let p = 0; p < plants.length; p++) {
    const plant = plants[p];
    const cells = plant.cells;
    const seed = plant.seed;
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      if (cell === seed) continue;
      if (cell.cooldown > 0) { cell.cooldown--; continue; }
      const openCardinals = cell.countOpenCardinals();
      let canAbsorb = false, baseEnergy = 1;
      if (CONSTANTS.GRADUATED_ABSORPTION) {
        if (openCardinals >= 1) {
          canAbsorb = true;
          baseEnergy = openCardinals >= 3 ? 1.5 : openCardinals === 2 ? 1.0 : 0.5;
        }
      } else {
        if (openCardinals >= 3) canAbsorb = true;
      }
      if (canAbsorb && rand() < CONSTANTS.LIGHT_ABSORB_PROB) {
        lightParticles.push(new LightParticle(cell, baseEnergy));
        cell.cooldown = CONSTANTS.LIGHT_COOLDOWN;
        plant.ticksWithoutLight = 0;
      }
    }
  }

  // 3. LIGHT PROPAGATION
  for (let i = lightParticles.length - 1; i >= 0; i--) lightParticles[i].update();
  for (let i = lightParticles.length - 1; i >= 0; i--) {
    if (lightParticles[i].markedForRemoval) {
      lightParticles[i].destroy();
      lightParticles.splice(i, 1);
    }
  }

  // 4. REPRODUCTION
  for (let i = 0; i < plants.length; i++) {
    updateReproduction(plants[i]);
    plants[i].updateVisuals();
  }

  // 5. SEED TRANSPORT
  for (let i = travelingSeeds.length - 1; i >= 0; i--) {
    const seed = travelingSeeds[i];
    if (seed.state === "attached") seed.updateAttached();
    else seed.updateAirborne();
  }
  for (let i = travelingSeeds.length - 1; i >= 0; i--) {
    if (travelingSeeds[i].markedForRemoval) {
      travelingSeeds[i].destroy();
      travelingSeeds.splice(i, 1);
    }
  }
}

function updateUI() {
  fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;
  let cellCount = 0;
  for (let i = 0; i < plants.length; i++) cellCount += plants[i].cells.length;
  particleCountText.text = `Plants: ${plants.length} | Cells: ${cellCount} | Ticks: ${frame}`;
  if (plants.length === 0 && travelingSeeds.length === 0) {
    console.log("Extinction. Restarting...");
    frame = 0;
    rngState = (rngState + 1337) >>> 0;
    initializeSeeds();
  }
}

// --- Input ---
function onKeyDown(e) {
  if (e.key === " " || e.code === "Space") { if (paused) advanceTick(); e.preventDefault(); }
  if (e.key === "p" || e.key === "P") { paused = !paused; console.log(paused ? "PAUSED" : "RUNNING"); }
  if (e.key === "f" || e.key === "F") { fastForward = !fastForward; }
  if (e.key === "o" || e.key === "O") { CONSTANTS.ENABLE_RANDOM_FACING = !CONSTANTS.ENABLE_RANDOM_FACING; }
  if (e.key === "c" || e.key === "C") { currentThemeIndex = (currentThemeIndex + 1) % CONSTANTS.THEMES.length; applyTheme(currentThemeIndex); }
  if (e.key === "r" || e.key === "R") {
    console.log("=== STATS ===");
    console.log("Frame:", frame, "Plants:", plants.length, "Light:", lightParticles.length, "Seeds:", travelingSeeds.length);
    console.log("Pool sizes - Light:", lightPool.pool.length, "Seed:", seedPool.pool.length, "Stem:", stemPool.pool.length);
  }
  if (e.key === "1") { CONSTANTS.GRADUATED_ABSORPTION = !CONSTANTS.GRADUATED_ABSORPTION; resetSimulation(); }
  if (e.key === "2") { CONSTANTS.CHILD_STARTING_ENERGY = !CONSTANTS.CHILD_STARTING_ENERGY; resetSimulation(); }
  if (e.key === "3") { CONSTANTS.DISTANCE_BONUS = !CONSTANTS.DISTANCE_BONUS; resetSimulation(); }
  if (e.key === "0") { resetSimulation(); }
}

function onResize() { app.renderer.resize(window.innerWidth, window.innerHeight); }

function applyTheme(index) {
  const theme = CONSTANTS.THEMES[index];
  console.log(`Theme: ${theme.NAME}`);
  Object.assign(CONSTANTS.COLORS, theme.COLORS);
  if (app && app.renderer) app.renderer.backgroundColor = CONSTANTS.COLORS.BG;
  createTextures();
  lightPool.updateTexture(textures.light);
  seedPool.updateTexture(textures.seed);
  stemPool.updateTexture(textures.stem);
  for (const plant of plants) {
    plant.stemTint = CONSTANTS.ENABLE_PLANT_TINT ? lerpColor(CONSTANTS.COLORS.STEM, plant.color, CONSTANTS.PLANT_TINT_STRENGTH) : CONSTANTS.COLORS.STEM;
    for (const cell of plant.cells) {
      if (!cell.isSeed) cell.sprite.tint = plant.stemTint;
    }
    plant.updateVisuals();
  }
}

// Boot
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
