// Simplant v12: Bird's Eye View (No Gravity)
// - Removed height/gravity orientation - world is now top-down like a map
// - Up/Down are now North/South, not High/Low
// - Removed terrain, falling sand, tetris clearing
// - Seeds random walk in all 4 directions equally, then germinate where they land
// - Initial population: 64 seeds, half default genome, half mutated

console.log("Simplant v12: Bird's Eye View - script loaded");

// --- Constants ---
const CONSTANTS = {
  // World
  SCALE_SIZE: 8,

  // Simulation
  TICK_INTERVAL_MS: 1,
  RNG_SEED: 1337,

  // Colors
  COLORS: {
    SEED_IDLE: 0x8b4513, // brown
    SEED_READY: 0xff0000, // red
    SEED_CHARGED: 0xffffff, // white
    SEED: 0x8b4513, // brown
    STEM: 0x228b22, // green
    LIGHT: 0xffff00, // yellow
    BG: 0x1a1a2e, // dark blue-grey (more "earthy" for bird's eye)
  },

  // Energy
  LIGHT_ABSORB_PROB: 0.3, // Base probability
  LIGHT_COOLDOWN: 30, // Ticks between absorptions
  LIGHT_ABSORPTION_PAUSE: 1,

  // Seeds & Population
  NUM_STARTER_SEEDS: 64, // As per original brief
  FORCE_SEED_STALK: true,
  AIRBORNE_STEPS: 40, // Random walk steps (back to brief spec)
  MUTATION_RATE: 0.5, // 50% of initial seeds mutated, also used for offspring

  // Death
  MAX_PLANT_AGE: 1200,
  STARVATION_TICKS: 800,

  // Germination
  GERMINATION_CLEAR_RADIUS: 1, // Must have this many cells clear around landing spot
};

// --- Global State ---
let app;
let cols, rows;
let occupancyGrid;
let textures = {};
let frame = 0;
let paused = true;
let fastForward = false;
let fastForwardFactor = 1;
let fastForwardLevels = [1, 10, 100];
let fastForwardIndex = 0;
let lastTickTime = 0;
let lightParticles = [];
let travelingSeeds = [];
let plants = [];

// UI
let fpsText;
let particleCountText;

// --- PRNG (Seeded) ---
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(
  params.get("seed") || CONSTANTS.RNG_SEED.toString(),
  10
);
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
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

// --- Genetics System ---

class GeneNode {
  constructor(geneBits) {
    this.geneBits = geneBits; // 0-7
    this.parent = null;
    this.children = [null, null, null]; // left, forward, right (relative to facing)
    this.slotFromParent = null;
    this.cell = null;
    this.grownMask = 0;
  }

  hasChildInSlot(slot) {
    return (this.geneBits >> slot) & 1;
  }

  isChildGrown(slot) {
    return (this.grownMask >> slot) & 1;
  }

  markChildGrown(slot) {
    this.grownMask |= 1 << slot;
  }
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
      if (node.children[slot]) {
        traverse(node.children[slot]);
      }
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
    const i1 = randInt(len);
    const i2 = randInt(len);
    geneIdx = Math.max(i1, i2); // Tip bias

    if (CONSTANTS.FORCE_SEED_STALK && geneIdx === 0) {
      geneIdx = randInt(len - 1) + 1;
    }
  } else {
    geneIdx = 0;
  }

  const bitIdx = randInt(3);

  let root = decodeGenomeToTree(newGenome);
  const targetNode = getNodeAtIndex(root, geneIdx);

  if (!targetNode) return newGenome;

  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;

  // Backbone protection
  if (wasBitSet) {
    const childNode = targetNode.children[bitIdx];
    if (childNode && childNode.geneBits > 0) {
      return newGenome; // Veto
    }
  }

  targetNode.geneBits ^= bitMask;

  if (wasBitSet) {
    targetNode.children[bitIdx] = null;
  } else {
    const newGeneBits = randInt(8);
    const newChild = new GeneNode(newGeneBits);
    targetNode.children[bitIdx] = newChild;
    newChild.parent = targetNode;
    newChild.slotFromParent = bitIdx;
  }

  return encodeTreeToGenome(root);
}

function getNodeAtIndex(root, index) {
  let current = 0;
  let result = null;

  function traverse(node) {
    if (!node || result) return;
    if (current === index) {
      result = node;
      return;
    }
    current++;
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) traverse(node.children[slot]);
    }
  }

  traverse(root);
  return result;
}

// --- Grid Utilities (No Gravity) ---

function wrapCoords(x, y) {
  const wx = ((x % cols) + cols) % cols;
  const wy = ((y % rows) + rows) % rows;
  return { x: wx, y: wy };
}

function isCellEmpty(x, y) {
  const { x: wx, y: wy } = wrapCoords(x, y);
  return !occupancyGrid.get(wx, wy);
}

function checkNeighborsEmpty(x, y, radius) {
  // Check if all cells within radius are empty (for germination)
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!isCellEmpty(x + dx, y + dy)) return false;
    }
  }
  return true;
}

// --- Plant System ---

let idCounter = 0;

class Plant {
  constructor(genome, seedCell) {
    this.id = idCounter++;
    this.genome = genome;
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell;
    this.energy = 0;
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

  get geneCount() {
    return this.genome.length;
  }

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

        if (this.freeSproutUsed) {
          this.energy--;
        } else {
          this.freeSproutUsed = true;
        }

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
      const { x, y } = cell.pos;
      occupancyGrid.remove(x, y);
      app.stage.removeChild(cell.sprite);
      if (cell.node) {
        cell.node.cell = null;
      }
    }

    this.cells = [];
    this.frontier = [];

    for (let i = lightParticles.length - 1; i >= 0; i--) {
      if (lightParticles[i].plant === this) {
        lightParticles[i].destroy();
      }
    }
  }

  updateVisuals() {
    if (!this.seed || !this.seed.sprite) return;

    let color = CONSTANTS.COLORS.SEED_IDLE;
    const G = this.geneCount;

    if (this.reproPhase === "idle") {
      const t = Math.min(1, this.energy / G);
      color = lerpColor(
        CONSTANTS.COLORS.SEED_IDLE,
        CONSTANTS.COLORS.SEED_READY,
        t
      );
    } else if (this.reproPhase === "charging") {
      const base = G;
      const target = G + this.childGeneCount;
      const t = Math.min(1, (this.energy - base) / (target - base));
      color = lerpColor(
        CONSTANTS.COLORS.SEED_READY,
        CONSTANTS.COLORS.SEED_CHARGED,
        t
      );
    }

    this.seed.sprite.tint = color;
  }
}

class SeedCell {
  constructor(x, y, plant) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = plant.rootNode;
    this.parent = null;
    this.children = [];
    this.cooldown = 0;
    this.facing = ["N", "E", "S", "W"][randInt(4)]; // Random initial facing

    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = y * CONSTANTS.SCALE_SIZE;
    this.sprite.tint = CONSTANTS.COLORS.SEED_IDLE;
    app.stage.addChild(this.sprite);

    occupancyGrid.set(x, y, this);
    this.plant.registerCell(this);
  }

  getSeed() {
    return this;
  }

  getChildPosForSlot(slot) {
    // Slots: 0=left, 1=forward, 2=right (relative to facing)
    const dirMap = {
      N: [
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
      ],
      E: [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
      ],
      S: [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ],
      W: [
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
      ],
    };
    const off = dirMap[this.facing][slot];
    return { x: this.pos.x + off.dx, y: this.pos.y + off.dy };
  }

  canGrowAt(pos) {
    const { x, y } = wrapCoords(pos.x, pos.y);
    return isCellEmpty(x, y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return;

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoords(rawPos.x, rawPos.y);

    const facing = this.getChildFacing(slot);

    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  getChildFacing(slot) {
    const rotations = {
      N: ["W", "N", "E"],
      E: ["N", "E", "S"],
      S: ["E", "S", "W"],
      W: ["S", "W", "N"],
    };
    return rotations[this.facing][slot];
  }

  // Count open cardinal neighbors (for light absorption)
  countOpenCardinals() {
    let count = 0;
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    for (const { dx, dy } of cardinals) {
      if (isCellEmpty(this.pos.x + dx, this.pos.y + dy)) {
        count++;
      }
    }
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

    this.sprite = new PIXI.Sprite(textures.stem);
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = y * CONSTANTS.SCALE_SIZE;
    app.stage.addChild(this.sprite);

    occupancyGrid.set(x, y, this);
    this.plant.registerCell(this);
  }

  getSeed() {
    let cell = this;
    while (cell.parent) cell = cell.parent;
    return cell;
  }

  getChildPosForSlot(slot) {
    const dirMap = {
      N: [
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
      ],
      E: [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
      ],
      S: [
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ],
      W: [
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: -1 },
      ],
    };
    const off = dirMap[this.facing][slot];
    return { x: this.pos.x + off.dx, y: this.pos.y + off.dy };
  }

  getChildFacing(slot) {
    const rotations = {
      N: ["W", "N", "E"],
      E: ["N", "E", "S"],
      S: ["E", "S", "W"],
      W: ["S", "W", "N"],
    };
    return rotations[this.facing][slot];
  }

  canGrowAt(pos) {
    const { x, y } = wrapCoords(pos.x, pos.y);
    return isCellEmpty(x, y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return;

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoords(rawPos.x, rawPos.y);

    const facing = this.getChildFacing(slot);

    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  // Count open cardinal neighbors (for light absorption)
  countOpenCardinals() {
    let count = 0;
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    for (const { dx, dy } of cardinals) {
      if (isCellEmpty(this.pos.x + dx, this.pos.y + dy)) {
        count++;
      }
    }
    return count;
  }
}

class OccupancyGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(cols * rows).fill(null);
  }

  getIndex(x, y) {
    return y * this.cols + x;
  }

  set(x, y, cell) {
    const { x: wx, y: wy } = wrapCoords(x, y);
    this.grid[this.getIndex(wx, wy)] = cell;
  }

  get(x, y) {
    const { x: wx, y: wy } = wrapCoords(x, y);
    return this.grid[this.getIndex(wx, wy)];
  }

  remove(x, y) {
    const { x: wx, y: wy } = wrapCoords(x, y);
    this.grid[this.getIndex(wx, wy)] = null;
  }
}

// --- Initialization ---

const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

function createPlant(genome, x, y) {
  const plant = new Plant(genome, null);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

function initializeSeeds() {
  // Place NUM_STARTER_SEEDS randomly across the world
  // Half with default genome, half with mutated genome (per original brief)
  const numSeeds = CONSTANTS.NUM_STARTER_SEEDS;
  const halfMutated = Math.floor(numSeeds / 2);

  for (let i = 0; i < numSeeds; i++) {
    // Find an empty spot
    let x, y;
    let attempts = 0;
    do {
      x = randInt(cols);
      y = randInt(rows);
      attempts++;
    } while (!isCellEmpty(x, y) && attempts < 1000);

    if (attempts >= 1000) {
      console.warn("Could not find empty spot for seed", i);
      continue;
    }

    // Determine genome: first half default, second half mutated
    let genome;
    if (i < numSeeds - halfMutated) {
      genome = new Uint8Array(DEFAULT_GENOME);
    } else {
      genome = mutateGenome(DEFAULT_GENOME);
    }

    const plant = createPlant(genome, x, y);
    plants.push(plant);
  }

  console.log(`Initialized ${plants.length} seeds (${halfMutated} mutated)`);
}

function init() {
  console.log("Simplant v12: initializing");

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

  console.log(
    `Grid dimensions: ${cols}x${rows} (scale: ${CONSTANTS.SCALE_SIZE})`
  );

  occupancyGrid = new OccupancyGrid(cols, rows);

  createTextures();
  createUI();
  initializeSeeds();

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  app.view.addEventListener("click", () => {
    if (paused) advanceTick();
  });

  // Fast Forward Button
  const btn = document.createElement("button");
  btn.id = "ff-btn";
  btn.innerText = "1x";
  btn.style.position = "absolute";
  btn.style.top = "10px";
  btn.style.right = "10px";
  btn.style.zIndex = "1000";
  btn.style.padding = "10px";
  btn.style.backgroundColor = "#333";
  btn.style.color = "#fff";
  btn.style.border = "1px solid #fff";
  btn.style.cursor = "pointer";
  btn.onclick = () => {
    fastForwardIndex = (fastForwardIndex + 1) % fastForwardLevels.length;
    fastForwardFactor = fastForwardLevels[fastForwardIndex];
    btn.innerText = `${fastForwardFactor}x`;
    fastForward = fastForwardFactor > 1;
    if (fastForward) paused = false;
  };
  document.body.appendChild(btn);

  app.ticker.add(gameLoop);

  setTimeout(() => {
    if (frame === 0) paused = false;
  }, 1000);
}

function createTextures() {
  function createRectTexture(color, alpha = 1.0) {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color, alpha);
    graphics.drawRect(0, 0, 1, 1);
    graphics.endFill();
    return app.renderer.generateTexture(graphics);
  }

  textures.seed = createRectTexture(0xffffff);
  textures.stem = createRectTexture(CONSTANTS.COLORS.STEM);
  textures.light = createRectTexture(CONSTANTS.COLORS.LIGHT);
}

function createUI() {
  const style = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 14,
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 2,
  });

  fpsText = new PIXI.Text("FPS: 0", style);
  fpsText.x = 10;
  fpsText.y = 10;
  fpsText.zIndex = 1000;
  app.stage.addChild(fpsText);

  particleCountText = new PIXI.Text("Particles: 0", style);
  particleCountText.x = 10;
  particleCountText.y = 30;
  particleCountText.zIndex = 1000;
  app.stage.addChild(particleCountText);

  app.stage.sortableChildren = true;
}

// --- Light Particles ---

class LightParticle {
  constructor(cell) {
    this.cell = cell;
    this.plant = cell.plant;

    this.sprite = new PIXI.Sprite(textures.light);
    this.sprite.alpha = 0.5;
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = cell.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = cell.pos.y * CONSTANTS.SCALE_SIZE;
    app.stage.addChild(this.sprite);

    this.pauseTicks = CONSTANTS.LIGHT_ABSORPTION_PAUSE;
  }

  update() {
    if (this.pauseTicks > 0) {
      this.pauseTicks--;
      return;
    }

    if (this.cell.parent) {
      this.cell = this.cell.parent;
      this.sprite.x = this.cell.pos.x * CONSTANTS.SCALE_SIZE;
      this.sprite.y = this.cell.pos.y * CONSTANTS.SCALE_SIZE;
    } else {
      this.plant.energy++;
      this.destroy();
    }
  }

  destroy() {
    app.stage.removeChild(this.sprite);
    lightParticles = lightParticles.filter((p) => p !== this);
  }
}

// --- Traveling Seeds (No Gravity - Pure Random Walk) ---

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
  }

  updateAttached() {
    if (!this.currentNode.cell) {
      this.destroy();
      return;
    }

    const childCells = this.currentNode.children.filter(
      (child) => child && child.cell
    );

    if (childCells.length > 0) {
      const next = childCells[randInt(childCells.length)];
      this.currentNode = next;
    } else {
      this.becomeAirborne();
    }
  }

  becomeAirborne() {
    this.state = "airborne";
    this.pos = {
      x: this.currentNode.cell.pos.x,
      y: this.currentNode.cell.pos.y,
    };
    this.stepsTaken = 0;

    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.alpha = 0.8;
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = this.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = this.pos.y * CONSTANTS.SCALE_SIZE;
    app.stage.addChild(this.sprite);
  }

  updateAirborne() {
    if (this.stepsTaken >= this.maxSteps) {
      this.tryGerminate();
      return;
    }

    // Pure random walk - all 4 directions equal (no gravity bias)
    const dirs = [
      { dx: -1, dy: 0 }, // West
      { dx: 1, dy: 0 }, // East
      { dx: 0, dy: -1 }, // North
      { dx: 0, dy: 1 }, // South
    ];
    const dir = dirs[randInt(4)];

    const { x, y } = wrapCoords(this.pos.x + dir.dx, this.pos.y + dir.dy);
    this.pos.x = x;
    this.pos.y = y;

    this.sprite.x = this.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = this.pos.y * CONSTANTS.SCALE_SIZE;
    this.stepsTaken++;
  }

  tryGerminate() {
    const x = this.pos.x;
    const y = this.pos.y;

    // Check if landing spot is empty
    if (!isCellEmpty(x, y)) {
      this.destroy();
      return;
    }

    // Check surrounding area is clear enough
    if (!checkNeighborsEmpty(x, y, CONSTANTS.GERMINATION_CLEAR_RADIUS)) {
      this.destroy();
      return;
    }

    // Success - create new plant
    const newPlant = createPlant(this.childGenome, x, y);
    plants.push(newPlant);
    this.destroy();
  }

  destroy() {
    if (this.sprite) {
      app.stage.removeChild(this.sprite);
    }
    travelingSeeds = travelingSeeds.filter((s) => s !== this);
  }
}

// --- Reproduction ---

function updateReproduction(plant) {
  const G = plant.geneCount;

  switch (plant.reproPhase) {
    case "idle":
      if (plant.energy >= G) {
        plant.childGenome =
          rand() < CONSTANTS.MUTATION_RATE
            ? mutateGenome(plant.genome)
            : new Uint8Array(plant.genome);
        plant.childGeneCount = plant.childGenome.length;
        plant.reproPhase = "charging";
      }
      break;

    case "charging":
      if (plant.energy >= G + plant.childGeneCount) {
        const seed = new TravelingSeed(plant, plant.childGenome);
        travelingSeeds.push(seed);

        plant.energy -= plant.childGeneCount;

        plant.reproPhase = "idle";
        plant.childGenome = null;
        plant.childGeneCount = 0;
      }
      break;
  }
}

// --- Main Loop ---

function gameLoop(delta) {
  const now = Date.now();
  let updated = false;

  if (!paused) {
    if (fastForward) {
      for (let i = 0; i < fastForwardFactor; i++) {
        advanceTick();
      }
      updated = true;
    } else {
      if (now - lastTickTime >= CONSTANTS.TICK_INTERVAL_MS) {
        advanceTick();
        lastTickTime = now;
        updated = true;
      }
    }
  }

  if (updated) {
    updateUI();
  }
}

function advanceTick() {
  frame++;

  // 1. GROWTH PHASE
  for (let i = plants.length - 1; i >= 0; i--) {
    const plant = plants[i];

    plant.age++;
    plant.ticksWithoutLight++;

    if (
      plant.age >= CONSTANTS.MAX_PLANT_AGE * plant.geneCount ||
      plant.ticksWithoutLight >= CONSTANTS.STARVATION_TICKS
    ) {
      plant.die();
      plants.splice(i, 1);
      continue;
    }

    plant.tryGrowOneStep();
  }

  // 2. LIGHT ABSORPTION PHASE
  // Now uses "3 open cardinal neighbors" rule from the original brief
  for (const plant of plants) {
    for (const cell of plant.cells) {
      if (cell === plant.seed) continue;

      if (cell.cooldown > 0) {
        cell.cooldown--;
        continue;
      }

      // Original brief: "3 open cardinal directions"
      const openCardinals = cell.countOpenCardinals();
      if (openCardinals >= 3) {
        if (rand() < CONSTANTS.LIGHT_ABSORB_PROB) {
          const light = new LightParticle(cell);
          lightParticles.push(light);
          cell.cooldown = CONSTANTS.LIGHT_COOLDOWN;
          plant.ticksWithoutLight = 0;
        }
      }
    }
  }

  // 3. LIGHT PROPAGATION
  for (const light of [...lightParticles]) {
    light.update();
  }

  // 4. REPRODUCTION PHASE
  for (const plant of plants) {
    updateReproduction(plant);
    plant.updateVisuals();
  }

  // 5. SEED TRANSPORT
  for (const seed of [...travelingSeeds]) {
    if (seed.state === "attached") {
      seed.updateAttached();
    } else if (seed.state === "airborne") {
      seed.updateAirborne();
    }
  }
}

function updateUI() {
  if (!fpsText || !particleCountText) return;

  fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;

  const plantCellCount = plants.reduce((sum, p) => sum + p.cells.length, 0);
  const totalParticles =
    lightParticles.length + travelingSeeds.length + plantCellCount;
  particleCountText.text = `Plants: ${plants.length} | Cells: ${plantCellCount} | Ticks: ${frame}`;

  // Auto-restart on extinction
  if (plants.length === 0 && travelingSeeds.length === 0) {
    console.log("Extinction detected. Restarting...");
    frame = 0;
    rngState = (rngState + 1337) >>> 0;
    initializeSeeds();
  }
}

// --- Input Handling ---

function onKeyDown(e) {
  if (e.key === " " || e.code === "Space") {
    if (paused) advanceTick();
    e.preventDefault();
  }

  if (e.key === "p" || e.key === "P") {
    paused = !paused;
    console.log(paused ? "PAUSED" : "RUNNING");
  }

  if (e.key === "f" || e.key === "F") {
    fastForward = !fastForward;
    console.log("Fast Forward:", fastForward ? "ON" : "OFF");
  }

  if (e.key === "r" || e.key === "R") {
    console.log("=== STATS ===");
    console.log("Frame:", frame);
    console.log("Plants:", plants.length);
    console.log("Traveling seeds:", travelingSeeds.length);
    console.log("Light particles:", lightParticles.length);

    if (plants.length > 0) {
      let totalLen = 0;
      const genomeCounts = new Map();

      for (const p of plants) {
        totalLen += p.genome.length;
        const k = p.genome.toString();
        genomeCounts.set(k, (genomeCounts.get(k) || 0) + 1);
      }

      const avgLen = (totalLen / plants.length).toFixed(1);
      console.log(`Average Genome Length: ${avgLen}`);

      let maxCount = 0;
      let modeGenomeStr = "";

      for (const [k, count] of genomeCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          modeGenomeStr = k;
        }
      }

      if (modeGenomeStr) {
        const parts = modeGenomeStr.split(",").map(Number);
        const bitsStr = parts
          .map((n) => n.toString(2).padStart(3, "0"))
          .join(", ");

        console.log(`Most Common Genome (${maxCount} clones):`);
        console.log(`Length: ${parts.length}`);
        console.log(`Genes: [${bitsStr}]`);
      }
    }
  }
}

function onResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
