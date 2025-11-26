// Simplant: A CA-style plant simulation
// Based on the Triple Bit Trees framework

console.log("Simplant: script loaded");

// --- Constants ---
const CONSTANTS = {
  // World
  SCALE_SIZE: 8,

  // Simulation
  TICK_INTERVAL_MS: 100,
  RNG_SEED: 1337,

  // Colors
  COLORS: {
    SEED: 0x8b4513, // brown
    STEM: 0x228b22, // green
    LIGHT: 0xffff00, // yellow
    BG: 0x000000, // black
  },

  // Energy
  LIGHT_ABSORB_PROB: 0.03,
  LIGHT_COOLDOWN: 10,

  // Seeds
  AIRBORNE_STEPS: 40,

  // Death
  MAX_PLANT_AGE: 1000,
  STARVATION_TICKS: 50,
};

// --- Global State ---
let app;
let cols, rows;
let occupancyGrid;
let textures = {};
let frame = 0;
let paused = true; // Start paused
let lastTickTime = 0;
let lightParticles = [];
let travelingSeeds = [];

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
  // xorshift32
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0x100000000;
}

function randInt(n) {
  return Math.floor(rand() * n);
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
  const geneIdx = randInt(newGenome.length);
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
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function checkMooreNeighborsEmpty(x, y) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!isInBounds(x + dx, y + dy)) return false;
      if (occupancyGrid.get(x + dx, y + dy)) return false;
    }
  }
  return true;
}

// --- Plant System ---

let idCounter = 0;
let plants = [];

class Plant {
  constructor(genome, seedCell) {
    this.id = idCounter++;
    this.genome = genome; // Uint8Array of 3-bit values
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell; // SeedCell reference
    this.energy = 0;
    this.freeSproutUsed = false;

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

  // Find all nodes that can grow
  getFrontierNodes() {
    const frontier = [];
    const stack = [this.rootNode];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node.cell) continue; // Not yet instantiated

      // Check each child slot
      for (let slot = 0; slot < 3; slot++) {
        if (node.children[slot] && !node.children[slot].cell) {
          // Child exists in genome but not yet grown
          if (!(node.grownMask & (1 << slot))) {
            frontier.push({ node, slot });
          }
        }
      }

      // Continue traversing instantiated children
      node.children.forEach((child) => {
        if (child && child.cell) stack.push(child);
      });
    }
    return frontier;
  }

  die() {
    this.dead = true;
    const cells = getAllCells(this);
    for (const cell of cells) {
      occupancyGrid.remove(cell.pos.x, cell.pos.y);
      app.stage.removeChild(cell.sprite);
      cell.node.cell = null; // Unlink
    }
    // Light particles referencing this plant should be destroyed
    lightParticles.forEach((p) => {
      if (p.plant === this) p.destroy();
    });
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
    app.stage.addChild(this.sprite);

    // Register in grid
    occupancyGrid.set(x, y, this);

    // Link back: node knows its cell
    this.node.cell = this;
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
    if (!isInBounds(pos.x, pos.y)) return false;
    return !occupancyGrid.get(pos.x, pos.y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    const pos = this.getChildPosForSlot(slot);
    const facing = this.getChildFacing(slot);

    const child = new PlantCell(
      pos.x,
      pos.y,
      this.plant,
      childNode,
      this,
      facing
    );
    this.children.push(child);
    this.node.markChildGrown(slot);
  }

  getChildFacing(slot) {
    // Seeds face north, children rotate
    const facings = ["W", "N", "E"]; // left, up, right
    return facings[slot];
  }

  hasThreeOpenSpaces() {
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    let open = 0;
    for (const { dx, dy } of cardinals) {
      const nx = this.pos.x + dx;
      const ny = this.pos.y + dy;
      if (isInBounds(nx, ny) && !occupancyGrid.get(nx, ny)) {
        open++;
      }
    }
    return open >= 3;
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
    node.cell = this;
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
    if (!isInBounds(pos.x, pos.y)) return false;
    return !occupancyGrid.get(pos.x, pos.y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    const pos = this.getChildPosForSlot(slot);
    const facing = this.getChildFacing(slot);

    const child = new PlantCell(
      pos.x,
      pos.y,
      this.plant,
      childNode,
      this,
      facing
    );
    this.children.push(child);
    this.node.markChildGrown(slot);
  }

  hasThreeOpenSpaces() {
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    let open = 0;
    for (const { dx, dy } of cardinals) {
      const nx = this.pos.x + dx;
      const ny = this.pos.y + dy;
      if (isInBounds(nx, ny) && !occupancyGrid.get(nx, ny)) {
        open++;
      }
    }
    return open >= 3;
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
  const chosen = new Set();

  while (chosen.size < NUM_STARTER_SEEDS) {
    const idx = randInt(cols * rows);
    chosen.add(idx);
  }

  for (const idx of chosen) {
    const x = idx % cols;
    const y = Math.floor(idx / cols);

    // Half get mutation, half stay default
    const genome =
      rand() < 0.5
        ? mutateGenome(DEFAULT_GENOME)
        : new Uint8Array(DEFAULT_GENOME);

    const plant = createPlant(genome, x, y);
    plants.push(plant);
  }
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
    if (paused) advanceTick();
  });

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

  textures.seed = createRectTexture(CONSTANTS.COLORS.SEED);
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
  app.stage.addChild(fpsText);

  particleCountText = new PIXI.Text("Particles: 0", style);
  particleCountText.x = 10;
  particleCountText.y = 30;
  app.stage.addChild(particleCountText);
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
  }

  update() {
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

function getAllCells(plant) {
  const cells = [];
  const stack = [plant.seed];

  while (stack.length > 0) {
    const cell = stack.pop();
    cells.push(cell);
    stack.push(...cell.children);
  }

  return cells;
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
    this.pos.x = Math.max(0, Math.min(cols - 1, this.pos.x + dir.dx));
    this.pos.y = Math.max(0, Math.min(rows - 1, this.pos.y + dir.dy));

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
          rand() < 0.5
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

  if (!paused && now - lastTickTime >= CONSTANTS.TICK_INTERVAL_MS) {
    advanceTick();
    lastTickTime = now;
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
      plant.age >= CONSTANTS.MAX_PLANT_AGE ||
      plant.ticksWithoutLight >= CONSTANTS.STARVATION_TICKS
    ) {
      plant.die();
      plants.splice(i, 1);
      continue;
    }

    if (plant.energy < 1 && plant.freeSproutUsed) continue;

    // Get frontier nodes (cells that can grow)
    const frontier = plant.getFrontierNodes();

    for (const { node, slot } of frontier) {
      if (plant.energy >= 1 || !plant.freeSproutUsed) {
        const pos = node.cell.getChildPosForSlot(slot);
        if (node.cell.canGrowAt(pos)) {
          node.cell.growChildInSlot(slot);

          if (plant.freeSproutUsed) {
            plant.energy--;
          } else {
            plant.freeSproutUsed = true;
          }

          break; // Only one cell per plant per tick
        } else {
          // Blocked - mark as attempted
          node.markChildGrown(slot);
        }
      }
    }
  }

  // 2. LIGHT ABSORPTION PHASE
  for (const plant of plants) {
    const allCells = getAllCells(plant);
    for (const cell of allCells) {
      if (cell.cooldown > 0) {
        cell.cooldown--;
        continue;
      }

      if (cell.hasThreeOpenSpaces()) {
        if (rand() < CONSTANTS.LIGHT_ABSORB_PROB) {
          const light = new LightParticle(cell);
          lightParticles.push(light);
          cell.cooldown = CONSTANTS.LIGHT_COOLDOWN;
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

  updateUI();
}

function updateUI() {
  if (!fpsText || !particleCountText) return;

  fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;

  let totalCells = 0;
  for (const plant of plants) {
    // Estimate cell count from plant energy/size or explicitly count
    // Explicit count is expensive every frame, maybe just count active entities
    // For now, let's count total cells tracked in occupancy grid? No, that's O(N) scanning grid.
    // Better: Count via traversal or maintain count.
    // Let's count light particles + seeds + plants for now.
    // Or just sum up traveling seeds + light particles.
  }

  // Actually, let's just count the dynamic entities for "Particles"
  // or do a periodic heavy count.
  // Let's just show dynamic particles count + number of plants.
  particleCountText.text = `Plants: ${plants.length} | Seeds: ${travelingSeeds.length} | Light: ${lightParticles.length}`;
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

  if (e.key === "r" || e.key === "R") {
    // Print stats
    console.log("=== STATS ===");
    console.log("Frame:", frame);
    console.log("Plants:", plants.length);
    console.log("Traveling seeds:", travelingSeeds.length);
    console.log("Light particles:", lightParticles.length);

    for (const plant of plants) {
      const cellCount = getAllCells(plant).length;
      console.log(
        `Plant ${plant.id}: ${cellCount} cells, ${plant.energy} energy`
      );
    }
  }
}

function onResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);

  // Re-calculate grid size?
  // For now, we keep the grid fixed or would need to migrate/recreate grid.
  // Since this is a CA, usually resizing the window might just show more/less or scale.
  // Following aestheedlings pattern, we might just reload or accept that new areas are empty.
  // For simplicity in V1, we won't dynamically resize the simulation grid data structure.
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
