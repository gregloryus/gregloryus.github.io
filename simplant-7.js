// Simplant: A CA-style plant simulation
// Based on the Triple Bit Trees framework

console.log("Simplant: script loaded");

// --- Constants ---
const CONSTANTS = {
  // World
  SCALE_SIZE: 4,

  // Simulation
  TICK_INTERVAL_MS: 1,
  RNG_SEED: 1337,

  // Colors
  COLORS: {
    SEED_IDLE: 0x8b4513, // brown
    SEED_READY: 0xff0000, // red
    SEED_CHARGED: 0xffffff, // white
    SEED: 0x8b4513, // brown (legacy, still used for initial)
    STEM: 0x228b22, // green
    LIGHT: 0xffff00, // yellow
    BG: 0x000000, // black
  },

  // Energy
  LIGHT_ABSORB_PROB: 0.1,
  LIGHT_COOLDOWN: 10,
  LIGHT_ABSORPTION_PAUSE: 5,

  // Seeds
  FORCE_SEED_STALK: true, // Enforce seeds start with 010 (Up Stalk)
  AIRBORNE_STEPS: 100,
  MUTATION_RATE: 0.5, // Chance that a new seed has a mutated genome (0.0 to 1.0)

  // Death
  MAX_PLANT_AGE: 100, // Per gene limit (total life = this * genome.length)
  STARVATION_TICKS: 100,
};

// --- Global State ---
let app;
let cols, rows;
let occupancyGrid;
let textures = {};
let frame = 0;
let paused = true; // Start paused
let fastForward = false;
let fastForwardFactor = 1; // 1x, 10x, 100x
let fastForwardLevels = [1, 10, 100];
let fastForwardIndex = 0;
let lastTickTime = 0;
let lightParticles = [];
let travelingSeeds = [];
let plants = []; // Moved to global scope proper

// UI
let fpsText;
let particleCountText;
let statsText; // New text field for detailed stats
let lastStatsUpdateTime = 0;
let cachedStats = "";

// --- PRNG (Seeded) ---
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(
  params.get("seed") || CONSTANTS.RNG_SEED.toString(),
  10
);
let rngState = (isFinite(seedParam) ? seedParam : CONSTANTS.RNG_SEED) >>> 0;

function rand() {
  // xorshift32
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
    this.children = [null, null, null]; // left, up, right
    this.slotFromParent = null; // 0, 1, or 2
    this.cell = null; // PlantCell when instantiated
    this.grownMask = 0; // Bits tracking which children are grown
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

// Decode flat genome array into GeneNode tree
function decodeGenomeToTree(genome) {
  let index = 0;

  function buildNode() {
    if (index >= genome.length) return null;

    const geneBits = genome[index++];
    const node = new GeneNode(geneBits);

    // Create children in L→U→R order
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

// Encode GeneNode tree back to flat array
function encodeTreeToGenome(root) {
  const result = [];

  function traverse(node) {
    if (!node) return;
    result.push(node.geneBits);

    // Traverse children in L→U→R order
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
  // Clone genome
  const newGenome = new Uint8Array(genome);

  // Pick random bit to flip
  let geneIdx = randInt(newGenome.length);

  // If forcing seed stalk, protect index 0 (root) from mutation
  if (CONSTANTS.FORCE_SEED_STALK) {
    if (newGenome.length <= 1) {
      // If only root exists and it's forced, we can't mutate it.
      return newGenome;
    }
    // Pick any index except 0
    geneIdx = randInt(newGenome.length - 1) + 1;
  }

  const bitIdx = randInt(3);

  // Decode to tree
  let root = decodeGenomeToTree(newGenome);

  // Find target node
  const targetNode = getNodeAtIndex(root, geneIdx);

  // If we couldn't find the node (shouldn't happen if index is valid), return clone
  if (!targetNode) return newGenome;

  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;

  // Flip the bit
  targetNode.geneBits ^= bitMask;

  if (wasBitSet) {
    // Was 1→0: remove child subtree
    targetNode.children[bitIdx] = null;
  } else {
    // Was 0→1: add new random child
    const newGeneBits = randInt(8); // 0-7
    const newChild = new GeneNode(newGeneBits);
    targetNode.children[bitIdx] = newChild;
    newChild.parent = targetNode;
    newChild.slotFromParent = bitIdx;
  }

  // Re-encode
  return encodeTreeToGenome(root);
}

function getNodeAtIndex(root, index) {
  let current = 0;
  let result = null;

  function traverse(node) {
    if (!node || result) return; // Stop if found
    if (current === index) {
      result = node;
      return;
    }
    current++;
    // Traverse children in L→U→R order to match decoding order
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) traverse(node.children[slot]);
    }
  }

  traverse(root);
  return result;
}

// --- Data Structures ---

function isInBounds(x, y) {
  // With toroidal topology, "bounds" are just conceptual.
  // We use this to check if coordinates are valid numbers, though technically
  // wrapping handles the logic.
  // However, existing code might rely on this. Let's keep it simple:
  // effectively everything is "in bounds" once wrapped, but let's
  // provide a helper to wrap coordinates instead.
  return true;
}

function wrapCoords(x, y) {
  let wx = x % cols;
  let wy = y % rows;
  if (wx < 0) wx += cols;
  if (wy < 0) wy += rows;
  return { x: wx, y: wy };
}

function checkMooreNeighborsEmpty(x, y) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;

      const { x: nx, y: ny } = wrapCoords(x + dx, y + dy);

      // isInBounds is effectively true now
      if (occupancyGrid.get(nx, ny)) return false;
    }
  }
  return true;
}

// --- Plant System ---

let idCounter = 0;

class Plant {
  constructor(genome, seedCell) {
    this.id = idCounter++;
    this.genome = genome; // Uint8Array of 3-bit values
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell; // SeedCell reference
    this.energy = 0;
    this.freeSproutUsed = false;

    // Optimization Caches
    this.cells = []; // Flat list of all cells in this plant
    this.frontier = []; // List of {node, slot} candidates for growth

    // Reproduction state machine
    this.reproPhase = "idle"; // 'idle' | 'planning' | 'charging'
    this.childGenome = null;
    this.childGeneCount = 0;

    // Death
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
      // Add potential growth slots to frontier
      for (let slot = 0; slot < 3; slot++) {
        // Only add to frontier if the child NODE actually exists in the tree
        if (cell.node.children[slot] && !cell.node.isChildGrown(slot)) {
          this.frontier.push({ node: cell.node, slot });
        }
      }
    }
  }

  tryGrowOneStep() {
    if (this.energy < 1 && this.freeSproutUsed) return;

    // Iterate through frontier to find a valid spot
    // Note: We iterate backwards to make splicing efficient/safe if we remove items
    for (let i = this.frontier.length - 1; i >= 0; i--) {
      const { node, slot } = this.frontier[i];

      // Check if we have energy (or free sprout)
      if (this.energy < 1 && this.freeSproutUsed) return;

      const pos = node.cell.getChildPosForSlot(slot);

      if (node.cell.canGrowAt(pos)) {
        // Success! Grow here.
        node.cell.growChildInSlot(slot);

        // Cost
        if (this.freeSproutUsed) {
          this.energy--;
        } else {
          this.freeSproutUsed = true;
        }

        // Remove from frontier as it's now grown
        this.frontier.splice(i, 1);

        // We only grow ONE cell per tick per plant
        return;
      } else {
        // Blocked. Mark as "grown" (processed) effectively pruning this branch from future attempts
        // This is a design choice: permanent blockage vs retry.
        // The original code marked it grown, so we stick to that.
        node.markChildGrown(slot);
        this.frontier.splice(i, 1);
      }
    }
  }

  die() {
    this.dead = true;
    // Use cached cells list - O(N) where N is cells in this plant
    for (const cell of this.cells) {
      occupancyGrid.remove(cell.pos.x, cell.pos.y);
      app.stage.removeChild(cell.sprite);
      if (cell.node) {
        cell.node.cell = null; // Unlink
      }
    }

    // Clear caches
    this.cells = [];
    this.frontier = [];

    // Light particles referencing this plant should be destroyed
    // This requires global scan unless we link particles to plant
    // Current global lightParticles is fine for now, it filters efficiently enough usually
    // or we could link particles to plant.
    // Optimization: Filter global list once.
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
      // Lerp Brown -> Red as energy goes 0 -> G
      const t = Math.min(1, this.energy / G);
      color = lerpColor(
        CONSTANTS.COLORS.SEED_IDLE,
        CONSTANTS.COLORS.SEED_READY,
        t
      );
    } else if (this.reproPhase === "charging") {
      // Lerp Red -> White as energy goes G -> G + childG
      // Note: energy starts at G (or slightly more)
      // target is G + this.childGeneCount
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
    this.node = plant.rootNode; // Root node
    this.parent = null; // Seeds have no parent
    this.children = [];
    this.cooldown = 0;

    // Sprite setup
    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = y * CONSTANTS.SCALE_SIZE;
    this.sprite.tint = CONSTANTS.COLORS.SEED_IDLE; // Initial tint
    app.stage.addChild(this.sprite);

    // Register in grid
    occupancyGrid.set(x, y, this);

    // Register with plant (Optimized Cache)
    this.plant.registerCell(this);
  }

  getSeed() {
    return this;
  }

  getChildPosForSlot(slot) {
    // Seeds always face NORTH
    const offsets = [
      { dx: -1, dy: 0 }, // left = west
      { dx: 0, dy: -1 }, // up = north
      { dx: 1, dy: 0 }, // right = east
    ];
    const off = offsets[slot];
    return { x: this.pos.x + off.dx, y: this.pos.y + off.dy };
  }

  canGrowAt(pos) {
    const { x, y } = wrapCoords(pos.x, pos.y);
    // if (!isInBounds(x, y)) return false;
    return !occupancyGrid.get(x, y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return; // Safety check

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoords(rawPos.x, rawPos.y);

    const facing = this.getChildFacing(slot);

    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
    // this.node.markChildGrown(slot); // Handled by tryGrowOneStep or caller
  }

  getChildFacing(slot) {
    // Seeds face north, children rotate
    const facings = ["W", "N", "E"]; // left, up, right
    return facings[slot];
  }

  hasClearForward5() {
    // Check 5 spaces in front: Left, Left-Diag, Front, Right-Diag, Right
    // Seed always faces North
    const offsets = [
      { dx: -1, dy: 0 }, // Left
      { dx: -1, dy: -1 }, // Left-Up
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: -1 }, // Right-Up
      { dx: 1, dy: 0 }, // Right
    ];

    for (const { dx, dy } of offsets) {
      const { x: nx, y: ny } = wrapCoords(this.pos.x + dx, this.pos.y + dy);

      // Must be empty
      if (occupancyGrid.get(nx, ny)) {
        return false;
      }
    }
    return true;
  }
}

class PlantCell {
  constructor(x, y, plant, node, parent, facing) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = node;
    this.parent = parent; // SeedCell or PlantCell
    this.facing = facing; // 'N', 'E', 'S', 'W'
    this.children = [];
    this.cooldown = 0;

    // Sprite
    this.sprite = new PIXI.Sprite(textures.stem);
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = y * CONSTANTS.SCALE_SIZE;
    app.stage.addChild(this.sprite);

    // Register
    occupancyGrid.set(x, y, this);

    // Register with plant (Optimized Cache)
    this.plant.registerCell(this);
  }

  getSeed() {
    let cell = this;
    while (cell.parent) cell = cell.parent;
    return cell;
  }

  getChildPosForSlot(slot) {
    // Compute relative to facing
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
    // Rotate based on slot
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
    // if (!isInBounds(x, y)) return false;
    return !occupancyGrid.get(x, y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return; // Safety check

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoords(rawPos.x, rawPos.y);

    const facing = this.getChildFacing(slot);

    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
    // this.node.markChildGrown(slot); // Handled by tryGrowOneStep or caller
  }

  hasClearForward5() {
    const OFFSETS = {
      N: [
        { dx: -1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: 1, dy: 0 },
      ],
      E: [
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 },
      ],
      S: [
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: 0 },
      ],
      W: [
        { dx: 0, dy: 1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
      ],
    };

    const offsets = OFFSETS[this.facing];

    for (const { dx, dy } of offsets) {
      const { x: nx, y: ny } = wrapCoords(this.pos.x + dx, this.pos.y + dy);

      // Must be empty
      if (occupancyGrid.get(nx, ny)) {
        return false;
      }
    }
    return true;
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
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = cell;
    }
  }

  get(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      return this.grid[this.getIndex(x, y)];
    }
    return null;
  }

  remove(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = null;
    }
  }
}

// --- Initialization ---

const NUM_STARTER_SEEDS = 64;
const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

function createPlant(genome, x, y) {
  const plant = new Plant(genome, null);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

function initializeSeeds() {
  // Start with a single seed in the middle
  const x = Math.floor(cols / 2);
  const y = Math.floor(rows / 2);

  const genome = new Uint8Array(DEFAULT_GENOME);
  const plant = createPlant(genome, x, y);
  plants.push(plant);
}

function init() {
  console.log("Simplant: initializing");

  // 1. PIXI Setup
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: CONSTANTS.COLORS.BG,
    antialias: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Crisp pixels
  app.view.style.imageRendering = "pixelated";
  app.renderer.roundPixels = true;

  // Grid dimensions
  cols = Math.floor(window.innerWidth / CONSTANTS.SCALE_SIZE);
  rows = Math.floor(window.innerHeight / CONSTANTS.SCALE_SIZE);

  console.log(
    `Grid dimensions: ${cols}x${rows} (scale: ${CONSTANTS.SCALE_SIZE})`
  );

  // 2. Occupancy Grid
  occupancyGrid = new OccupancyGrid(cols, rows);

  // 3. Textures
  createTextures();

  // 3a. UI Setup
  createUI();

  // 3b. Initialize Seeds
  initializeSeeds();

  // 4. Event Listeners
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  app.view.addEventListener("click", () => {
    // Only toggle pause if not clicking UI elements (simple heuristic: top left corner)
    // For now, click anywhere to tick if paused.
    if (paused) advanceTick();
  });

  // Add Fast Forward Button
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
    console.log("Speed set to:", fastForwardFactor + "x");
    // Unpause if setting speed > 1
    if (fastForward) paused = false;
  };
  document.body.appendChild(btn);

  // 5. Start Loops
  app.ticker.add(gameLoop);

  // Unpause after 1000ms
  setTimeout(() => {
    if (frame === 0) paused = false;
  }, 1000);
}

function createTextures() {
  function createRectTexture(color, alpha = 1.0) {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color, alpha);
    graphics.drawRect(0, 0, 1, 1); // 1x1 pixel texture, scaled by sprite
    graphics.endFill();
    return app.renderer.generateTexture(graphics);
  }

  textures.seed = createRectTexture(0xffffff); // White for tinting
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
  fpsText.zIndex = 1000; // Ensure on top
  app.stage.addChild(fpsText);

  particleCountText = new PIXI.Text("Particles: 0", style);
  particleCountText.x = 10;
  particleCountText.y = 30;
  particleCountText.zIndex = 1000; // Ensure on top
  app.stage.addChild(particleCountText);

  // Enable z-sorting
  app.stage.sortableChildren = true;

  statsText = new PIXI.Text("", style);
  statsText.x = 10;
  statsText.y = 50;
  // app.stage.addChild(statsText); // Hidden by default, used for console dump logic if needed or removed
}

class LightParticle {
  constructor(cell) {
    this.cell = cell; // Current cell position
    this.plant = cell.plant;

    // Sprite (overlay, no grid registration)
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
      // Move to parent
      this.cell = this.cell.parent;
      this.sprite.x = this.cell.pos.x * CONSTANTS.SCALE_SIZE;
      this.sprite.y = this.cell.pos.y * CONSTANTS.SCALE_SIZE;
    } else {
      // Reached seed
      this.plant.energy++;
      this.destroy();
    }
  }

  destroy() {
    app.stage.removeChild(this.sprite);
    lightParticles = lightParticles.filter((p) => p !== this);
  }
}

class TravelingSeed {
  constructor(plant, childGenome) {
    this.state = "attached"; // 'attached' | 'airborne'
    this.parentPlant = plant;
    this.childGenome = childGenome;
    this.currentNode = plant.rootNode; // Start at seed

    // Airborne properties (used later)
    this.pos = null;
    this.stepsTaken = 0;
    this.maxSteps = CONSTANTS.AIRBORNE_STEPS;
    this.sprite = null;
  }

  updateAttached() {
    // Safety check: If the host cell died, the seed is destroyed
    if (!this.currentNode.cell) {
      this.destroy();
      return;
    }

    // Find children with cells
    const childCells = this.currentNode.children.filter(
      (child) => child && child.cell
    );

    if (childCells.length > 0) {
      // Randomly pick one and move there
      const next = childCells[randInt(childCells.length)];
      this.currentNode = next;
    } else {
      // No children, become airborne
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

    // Create sprite
    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.alpha = 0.8;
    this.sprite.scale.set(CONSTANTS.SCALE_SIZE);
    this.sprite.x = this.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = this.pos.y * CONSTANTS.SCALE_SIZE;
    app.stage.addChild(this.sprite);
  }

  updateAirborne() {
    if (this.stepsTaken >= this.maxSteps) {
      this.tryLand();
      return;
    }

    // Random cardinal step
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    const dir = dirs[randInt(4)];

    // Wrap position
    const { x, y } = wrapCoords(this.pos.x + dir.dx, this.pos.y + dir.dy);
    this.pos.x = x;
    this.pos.y = y;

    this.sprite.x = this.pos.x * CONSTANTS.SCALE_SIZE;
    this.sprite.y = this.pos.y * CONSTANTS.SCALE_SIZE;
    this.stepsTaken++;
  }

  tryLand() {
    if (checkMooreNeighborsEmpty(this.pos.x, this.pos.y)) {
      // Create new plant!
      const newPlant = createPlant(this.childGenome, this.pos.x, this.pos.y);
      plants.push(newPlant);
    }

    // Either way, this seed is done
    this.destroy();
  }

  destroy() {
    if (this.sprite) {
      app.stage.removeChild(this.sprite);
    }
    travelingSeeds = travelingSeeds.filter((s) => s !== this);
  }
}

function updateReproduction(plant) {
  const G = plant.geneCount;

  switch (plant.reproPhase) {
    case "idle":
      if (plant.energy >= G) {
        // Start planning child
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
        // Spawn traveling seed
        const seed = new TravelingSeed(plant, plant.childGenome);
        travelingSeeds.push(seed);

        // Deduct cost
        plant.energy -= plant.childGeneCount;

        // Reset
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
      // Run multiple ticks per frame
      for (let i = 0; i < fastForwardFactor; i++) {
        advanceTick();
      }
      updated = true;
    } else {
      // Normal speed: 1 tick per interval
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
  // Iterate backwards to allow safe removal
  for (let i = plants.length - 1; i >= 0; i--) {
    const plant = plants[i];

    // Age & Starvation
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

    // Use optimized growth step
    plant.tryGrowOneStep();
  }

  // 2. LIGHT ABSORPTION PHASE
  for (const plant of plants) {
    // Use cached cells list - O(N) per plant where N is cell count
    for (const cell of plant.cells) {
      // Seeds don't absorb light directly
      if (cell === plant.seed) continue;

      if (cell.cooldown > 0) {
        cell.cooldown--;
        continue;
      }

      if (cell.hasClearForward5()) {
        // Directional light bias
        let bias = 1.0;
        if (cell.facing === "S") bias = 0.0;
        else if (cell.facing === "E" || cell.facing === "W") bias = 0.5;

        if (rand() < CONSTANTS.LIGHT_ABSORB_PROB * bias) {
          const light = new LightParticle(cell);
          lightParticles.push(light);
          cell.cooldown =
            CONSTANTS.LIGHT_COOLDOWN + CONSTANTS.LIGHT_ABSORPTION_PAUSE;
          plant.ticksWithoutLight = 0; // Reset starvation
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
    plant.updateVisuals(); // Update seed color
  }

  // 5. SEED TRANSPORT
  for (const seed of [...travelingSeeds]) {
    if (seed.state === "attached") {
      seed.updateAttached();
    } else {
      seed.updateAirborne();
    }
  }

  // 6. RENDER is handled by PIXI ticker
}

function updateUI() {
  if (!fpsText || !particleCountText || !statsText) return;

  // Basic stats - cheap
  fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;

  // Total particles = Light Particles + Traveling Seeds + Sprouted Seeds (Plants)
  // We sum all cells across all plants to get the visual "particle" count
  const plantCellCount = plants.reduce((sum, p) => sum + p.cells.length, 0);
  const totalParticles =
    lightParticles.length + travelingSeeds.length + plantCellCount;
  particleCountText.text = `Total Particles: ${totalParticles} | Ticks: ${frame}`;

  // Auto-restart if extinction
  if (totalParticles === 0) {
    console.log("Extinction detected. Restarting with new seed...");

    // Reset Simulation State
    frame = 0;

    // Increment PRNG Seed
    // We need to mix the current state to get a fresh start, effectively "incrementing" the entropy
    rngState = (rngState + 1337) >>> 0;

    // Clear any lingering PIXI objects just in case (though 0 particles implies clean)
    // In a robust engine we'd do a full stage clear, but our state arrays are empty so it should be fine.

    // Re-initialize
    initializeSeeds();
  }

  // Expensive stats - Removed from UI, only calculated on 'R' keypress
  // if (frame - lastStatsUpdateTime > 100) { ... }

  // statsText.text = cachedStats;
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
    // Print stats
    console.log("=== STATS ===");
    console.log("Frame:", frame);
    console.log("Plants:", plants.length);
    console.log("Traveling seeds:", travelingSeeds.length);
    console.log("Light particles:", lightParticles.length);

    if (plants.length > 0) {
      let totalLen = 0;
      const genomeCounts = new Map(); // Key: string(genome), Val: count

      for (const p of plants) {
        const len = p.genome.length;
        totalLen += len;
        const k = p.genome.toString();
        genomeCounts.set(k, (genomeCounts.get(k) || 0) + 1);
      }

      const avgLen = (totalLen / plants.length).toFixed(1);
      console.log(`Average Genome Length: ${avgLen}`);

      // Find mode (most common clone)
      let maxCount = 0;
      let modeGenomeStr = "";

      for (const [k, count] of genomeCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          modeGenomeStr = k;
        }
      }

      if (modeGenomeStr) {
        // Convert string back to readable array format or binary
        // It's "num,num,num"
        const parts = modeGenomeStr.split(",").map(Number);

        // Create just the raw 3-bit string: "110, 000, 000"
        const bitsStr = parts
          .map((n) => n.toString(2).padStart(3, "0"))
          .join(", ");

        console.log(`Most Common Genome (${maxCount} live clones):`);
        console.log(`Length: ${parts.length}`);
        console.log(`Genes: [${bitsStr}]`);
      }
    }

    // Detailed plant list (optional, maybe comment out if too spammy?)
    /*
    for (const plant of plants) {
      console.log(
        `Plant ${plant.id}: ${plant.cells.length} cells, ${plant.energy} energy`
      );
    }
    */
  }
}

function onResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  // For simplicity in V1, we won't dynamically resize the simulation grid data structure.
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
