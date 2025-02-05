// NOTES ON NEXT INTENTIONS: direction? energy simplification -- doesn't need to be one light per cell... adds up too quickly, should be more stable, just barely hanging on. I still ike the idea of buds being able to grow in one of 4 directions from a stem, but that they're able to freely move between the 3 Moore neigbhor spaces in that direction. For example, a stem growing up above a seed can be up, up-left, or up-right relative to the seed. A stem on top of the parent stem can be up, up-left, or up-right relative to the parent stem. A lateral bud growing up the right of a node can occupy the right, but also the up-right and down-right positions. Does that make sense? Each direction has 3 Moore spots in that direction. When the plant is at it's healthiest (full energy?) the plant should prefer to stand straight up / or at right angles. And it can droop when it lacks water or energy.

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let colors, rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;

// At the top of the file, after other global variables
const CONSTANTS = {
  // Energy-related
  INITIAL_SEED_ENERGY: 1000,
  SPROUT_ENERGY_THRESHOLD: 200,
  BUD_INITIAL_ENERGY: 200,
  GROWTH_ENERGY_COST: 5,

  // Light collection multipliers
  LEAF_LIGHT_MULTIPLIER: 1.5,
  STEM_LIGHT_MULTIPLIER: 0.5,

  // Growth parameters
  BUD_GROWTH_LIMIT: 34,
  INTERNODE_SPACING: 3,

  // Visual/Performance
  FAST_FORWARD_FACTOR: 10,
  FPS_TEXT_SIZE: 24,
  PERFORMANCE_LOG_INTERVAL: 100,

  // Cell States
  CELL_STATES: {
    THRIVING: {
      minEnergy: 100,
      energyDelta: 1.5,
      color: 0x00ff00, // Bright green
    },
    HEALTHY: {
      minEnergy: 50,
      energyDelta: 1.0,
      color: 0x008000, // Regular green
    },
    STRESSED: {
      minEnergy: 20,
      energyDelta: 0.5,
      color: 0x654321, // Brown
    },
    DYING: {
      minEnergy: 0,
      energyDelta: -1.0,
      color: 0x8b0000, // Dark red
    },
  },

  // Update Intervals
  STATE_CHECK_INTERVAL: 60, // frames between state checks
  ENERGY_UPDATE_INTERVAL: 30, // frames between energy updates

  // Energy Parameters
  BASE_MAINTENANCE_COST: 1,
  LEAF_ENERGY_CAPACITY: 150,
  STEM_ENERGY_CAPACITY: 100,
  NODE_ENERGY_CAPACITY: 200,
};

// Initialize global variables
idCounter = 1;
fastForward = false;
fastForwardFactor = CONSTANTS.FAST_FORWARD_FACTOR;
frame = 0;

document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Define core visual states
  colors = {
    SEED: 0x8b4513, // SaddleBrown
    BUD: 0x90ee90, // LightGreen
    STEM: 0x228b22, // ForestGreen
    NODE: 0x006400, // DarkGreen
    DYING: 0x8b0000, // DarkRed,
    LEAF: 0x90ee90, // LightGreen for leaves too
  };

  // Generate textures for each cell type
  cellTextures = Object.entries(colors).reduce((acc, [type, color]) => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);
    graphics.drawRect(0, 0, 1, 1);
    graphics.endFill();
    acc[type] = app.renderer.generateTexture(graphics);
    return acc;
  }, {});

  // Performance monitoring setup
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: CONSTANTS.FPS_TEXT_SIZE,
    fill: "white",
  });
  fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  countText = new PIXI.Text("Cells: 0", fpsTextStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  countText.x = 10;
  countText.y = 40;
  app.stage.addChild(fpsText);
  app.stage.addChild(countText);

  // Core simulation parameters
  scaleSize = 3;
  cols = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);
  cells = [];

  // Initialize occupancy grid
  occupancyGrid = new OccupancyGrid(cols, rows);

  // Initialize timing
  lastRenderTime = performance.now();

  // Add initial seed
  addInitialSeed();

  // Start the loop
  mainLoop();

  // Add keyboard listener for fast-forward
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      fastForward = !fastForward;
      console.log("Fast-forward:", fastForward);
    }
  });
});

function mainLoop() {
  const updatesThisFrame = fastForward ? fastForwardFactor : 1;

  for (let i = 0; i < updatesThisFrame; i++) {
    frame++;
    cells.forEach((cell) => cell.update());
  }

  // Performance metrics
  const now = performance.now();
  const fps = 1000 / (now - lastRenderTime);
  lastRenderTime = now;

  // Update display
  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Cells: ${cells.length}`;

  // Render
  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}

function addInitialSeed() {
  const seed = new Seed(Math.floor(cols / 2), 0);
  cells.push(seed);
  return seed;
}

// === CORE CLASSES ===
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

  getMooreNeighbors(x, y) {
    let neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          const cell = this.get(nx, ny);
          if (cell) neighbors.push(cell);
        }
      }
    }
    return neighbors;
  }
}

class PlantCell {
  constructor(x, y, seed) {
    this.pos = { x, y };
    this.seed = seed;
    this.plantId = seed ? seed.id : null;
    this.parent = null;
    this.children = [];
    this.sprite = new PIXI.Sprite(cellTextures[this.type || "STEM"]);
    this.sprite.x = Math.floor(x * scaleSize);
    this.sprite.y = Math.floor(y * scaleSize);
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);
    occupancyGrid.set(x, y, this);

    // Add new properties
    this.state = "HEALTHY";
    this.lastStateCheck = frame;
    this.lastEnergyUpdate = frame;
    this.energyCapacity = this.getEnergyCapacity();
    this.currentEnergy = this.energyCapacity * 0.5; // Start at 50% capacity
  }

  getEnergyCapacity() {
    switch (this.type) {
      case "LEAF":
        return CONSTANTS.LEAF_ENERGY_CAPACITY;
      case "STEM":
        return CONSTANTS.STEM_ENERGY_CAPACITY;
      case "NODE":
        return CONSTANTS.NODE_ENERGY_CAPACITY;
      default:
        return 100;
    }
  }

  handleStateChange(newState) {
    if (newState !== this.state) {
      const oldState = this.state;
      this.state = newState;

      // Update visuals
      this.sprite.tint = CONSTANTS.CELL_STATES[newState].color;

      // Propagate state change to connected cells
      this.propagateStateChange(oldState, newState);
    }
  }

  propagateStateChange(oldState, newState) {
    // Notify parent
    if (this.parent) {
      this.parent.onChildStateChange(this, oldState, newState);
    }

    // Notify children
    this.children.forEach((child) => {
      child.onParentStateChange(this, oldState, newState);
    });
  }

  onChildStateChange(child, oldState, newState) {
    // React to child state changes
    if (
      newState === "DYING" &&
      this.children.every((c) => c.state === "DYING")
    ) {
      this.checkState(); // Immediate state check if all children are dying
    }
  }

  onParentStateChange(parent, oldState, newState) {
    // React to parent state changes
    if (newState === "DYING") {
      this.checkState(); // Immediate state check if parent is dying
    }
  }

  checkState() {
    const energyRatio = this.currentEnergy / this.energyCapacity;
    let newState;

    if (energyRatio >= 0.8) newState = "THRIVING";
    else if (energyRatio >= 0.5) newState = "HEALTHY";
    else if (energyRatio >= 0.2) newState = "STRESSED";
    else newState = "DYING";

    this.handleStateChange(newState);
  }

  update() {
    // Only update state periodically
    if (frame - this.lastStateCheck >= CONSTANTS.STATE_CHECK_INTERVAL) {
      this.checkState();
      this.lastStateCheck = frame;
    }

    // Only update energy periodically
    if (frame - this.lastEnergyUpdate >= CONSTANTS.ENERGY_UPDATE_INTERVAL) {
      this.updateEnergy();
      this.lastEnergyUpdate = frame;
    }

    this.updatePosition();
    this.updateVisuals();
  }

  updateEnergy() {
    // Pay maintenance cost
    this.currentEnergy -= CONSTANTS.BASE_MAINTENANCE_COST;

    // Collect energy if conditions are right
    if (this.type === "LEAF" || this.type === "STEM") {
      const energyDelta = CONSTANTS.CELL_STATES[this.state].energyDelta;
      const collectedEnergy = this.calculateEnergyCollection() * energyDelta;

      // Store energy up to capacity, send excess to seed
      const spaceAvailable = this.energyCapacity - this.currentEnergy;
      const energyToStore = Math.min(collectedEnergy, spaceAvailable);
      const excessEnergy = collectedEnergy - energyToStore;

      this.currentEnergy += energyToStore;
      if (excessEnergy > 0 && this.seed) {
        this.seed.energy += excessEnergy;
      }
    }
  }

  calculateEnergyCollection() {
    let emptyNeighbors = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = this.pos.x + dx,
          ny = this.pos.y + dy;
        if (!occupancyGrid.get(nx, ny)) emptyNeighbors++;
      }
    }
    return this.type === "LEAF"
      ? emptyNeighbors * CONSTANTS.LEAF_LIGHT_MULTIPLIER
      : emptyNeighbors * CONSTANTS.STEM_LIGHT_MULTIPLIER;
  }

  collectLight() {
    let emptyNeighbors = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = this.pos.x + dx,
          ny = this.pos.y + dy;
        if (!occupancyGrid.get(nx, ny)) emptyNeighbors++;
      }
    }
    // Add energy directly to seed
    if (this.type === "LEAF") {
      this.seed.energy += emptyNeighbors * CONSTANTS.LEAF_LIGHT_MULTIPLIER;
    } else if (this.type === "STEM") {
      this.seed.energy += emptyNeighbors * CONSTANTS.STEM_LIGHT_MULTIPLIER;
    }
  }

  updatePosition() {
    if (!this.parent) return;

    let targetX = this.parent.pos.x + (this.idealOffset?.x || 0);
    let targetY = this.parent.pos.y + (this.idealOffset?.y || 0);

    if (this.pos.x !== targetX || this.pos.y !== targetY) {
      let dx = Math.sign(targetX - this.pos.x);
      let dy = Math.sign(targetY - this.pos.y);
      let newX = this.pos.x + dx;
      let newY = this.pos.y + dy;

      if (!occupancyGrid.get(newX, newY)) {
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.x = newX;
        this.pos.y = newY;
        occupancyGrid.set(newX, newY, this);
      }
    }
  }

  updateVisuals() {
    this.sprite.x = Math.floor(this.pos.x * scaleSize);
    this.sprite.y = Math.floor(this.pos.y * scaleSize);
    // No more color modulation needed
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null);
    this.type = "SEED";
    this.id = idCounter++;
    this.seed = this;
    this.energy = CONSTANTS.INITIAL_SEED_ENERGY;
    this.isFalling = true;
    this.hasSprouted = false;
    this.sprite.texture = cellTextures.SEED;

    console.log(`Seed created with ${this.energy} energy`);
  }

  update() {
    if (this.isFalling) {
      let nextY = this.pos.y + 1;
      if (nextY >= rows || occupancyGrid.get(this.pos.x, nextY)) {
        this.isFalling = false;
      } else {
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = nextY;
        occupancyGrid.set(this.pos.x, this.pos.y, this);
        this.sprite.y = this.pos.y * scaleSize;
      }
    } else if (
      !this.hasSprouted &&
      this.energy > CONSTANTS.SPROUT_ENERGY_THRESHOLD
    ) {
      this.sprout();
    }

    if (frame % CONSTANTS.PERFORMANCE_LOG_INTERVAL === 0) {
      console.log(`Seed energy: ${Math.floor(this.energy)}`);
    }
  }

  sprout() {
    if (this.hasSprouted || this.isFalling) return;

    if (!occupancyGrid.get(this.pos.x, this.pos.y - 1)) {
      let bud = new BudCell(this.pos.x, this.pos.y - 1, this);
      bud.parent = this;
      bud.currentEnergy = CONSTANTS.BUD_INITIAL_ENERGY;
      this.children.push(bud);
      cells.push(bud);
      this.hasSprouted = true;
    }
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed);
    this.type = "NODE";
    this.sprite.texture = cellTextures.NODE;
    this.canBranch = false; // Starts suppressed by apical dominance
    this.hasAttemptedBranch = false;
  }

  update() {
    super.update();
    // Only attempt branching if explicitly allowed
    if (this.canBranch && !this.hasAttemptedBranch) {
      this.attemptBranching();
    }
  }

  attemptBranching() {
    if (this.currentEnergy < 50) return;

    // Try to branch left or right
    let directions = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
    ];
    for (let dir of directions) {
      let newX = this.pos.x + dir.x;
      let newY = this.pos.y + dir.y;

      if (!occupancyGrid.get(newX, newY)) {
        let bud = new BudCell(newX, newY, this.seed);
        bud.parent = this;
        bud.idealOffset = dir;
        this.children.push(bud);
        cells.push(bud);
        this.currentEnergy -= 50;
      }
    }
    this.hasAttemptedBranch = true;
  }
}

// Leaf functionality
class LeafCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed);
    this.type = "LEAF";
    this.sprite.texture = cellTextures.LEAF;
    this.energyCapacity = 150;
    this.lightEfficiency = 3;
  }

  collectLight() {
    return super.collectLight() * this.lightEfficiency;
  }
}

class BudCell extends PlantCell {
  constructor(x, y, seed, direction = { x: 0, y: -1 }) {
    super(x, y, seed);
    this.type = "BUD";
    this.sprite.texture = cellTextures.BUD;
    this.growthCounter = 0;
    this.totalGrowth = 0;
    this.growthLimit = CONSTANTS.BUD_GROWTH_LIMIT;
    this.internodeSpacing = CONSTANTS.INTERNODE_SPACING;
    this.hasReachedLimit = false;
    this.direction = direction; // Added direction property
  }

  grow() {
    this.seed.energy -= CONSTANTS.GROWTH_ENERGY_COST;
    this.growthCounter++;
    this.totalGrowth++;

    if (this.growthCounter >= this.internodeSpacing) {
      this.growthCounter = 0;
      this.placeNode();
    } else {
      this.placeStem();
    }

    console.log(
      `BUD: Cell ${this.totalGrowth}/${
        this.growthLimit
      } placed. Seed energy: ${Math.floor(this.seed.energy)}`
    );
  }

  placeStem() {
    const targetX = this.pos.x + this.direction.x;
    const targetY = this.pos.y + this.direction.y;

    if (!occupancyGrid.get(targetX, targetY)) {
      let stem = new PlantCell(targetX, targetY, this.seed);
      stem.type = "STEM";
      stem.sprite.texture = cellTextures.STEM;

      // Update occupancy grid and BUD position
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.x = targetX;
      this.pos.y = targetY;
      occupancyGrid.set(this.pos.x, this.pos.y, this);

      this.updateVisuals();
      this.parent = stem; // Update parent relationship
      cells.push(stem);

      console.log(
        `Placed STEM at (${stem.pos.x}, ${stem.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
      );
    }
  }

  placeNode() {
    const targetX = this.pos.x + this.direction.x;
    const targetY = this.pos.y + this.direction.y;

    if (!occupancyGrid.get(targetX, targetY)) {
      let node = new NodeCell(targetX, targetY, this.seed);
      node.direction = { ...this.direction }; // Pass the direction to the node

      // Update occupancy grid and BUD position
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.x = targetX;
      this.pos.y = targetY;
      occupancyGrid.set(this.pos.x, this.pos.y, this);

      this.updateVisuals();
      this.parent = node; // Update parent relationship
      cells.push(node);

      console.log(
        `Placed NODE at (${node.pos.x}, ${node.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
      );
    }
  }

  update() {
    super.update();
    if (this.totalGrowth >= this.growthLimit) {
      if (!this.hasReachedLimit) {
        console.log(`BUD: Growth limit reached at height ${this.pos.y}`);
        this.hasReachedLimit = true;
      }
      return;
    }

    if (this.seed.energy >= CONSTANTS.GROWTH_ENERGY_COST) {
      this.grow();
    }
  }
}
