// STREAMLINED VERSION - CELLSPRING-14.JS

// UPDATED CONSTANTS (only those that are used)
const CONSTANTS = {
  // Energy-related parameters
  ENERGY: {
    INITIAL_SEED_ENERGY: 1000,
    SPROUT_ENERGY_THRESHOLD: 200,
    BUD_INITIAL_ENERGY: 200,
    GROWTH_ENERGY_COST: 5,
    BASE_MAINTENANCE_COST: 1,
  },

  // Cell States (used for visual state and dying behavior)
  CELL_STATES: {
    THRIVING: {
      minEnergy: 800, // using a scaled threshold for our high-energy cells
      energyDelta: 1.5,
      color: 0x00ff00,
    },
    HEALTHY: {
      minEnergy: 500,
      energyDelta: 1.0,
      color: 0x008000,
    },
    STRESSED: {
      minEnergy: 200,
      energyDelta: 0.5,
      color: 0x654321,
    },
    DYING: {
      minEnergy: 0,
      energyDelta: -1.0,
      color: 0x8b0000,
    },
  },

  // Growth-related parameters
  GROWTH: {
    BUD_GROWTH_LIMIT: 16,
    INTERNODE_SPACING: 5, // every nth growth becomes a node
    MIN_ENERGY_TO_GROW: 5,
    STEM_COST: 3,
    NODE_COST: 5,
    LEAF_COST: 4,
    BRANCH_COST: 8,
    LEAF_CHANCE: 1,
    BRANCH_SUPPRESSION_DISTANCE: 3,
  },

  // Visual/Performance parameters
  PERFORMANCE: {
    FAST_FORWARD_FACTOR: 10, // number of simulation ticks per frame when fast-forward is on
    FPS_TEXT_SIZE: 24,
    PERFORMANCE_LOG_INTERVAL: 100,
  },

  // Energy capacity for all cells (for simplicity)
  ENERGY_CAPACITIES: {
    DEFAULT: 10,
  },

  // Energy collection rates for leaves
  COLLECTION: {
    BASE_CHANCE: 0.02,
    LEAF_MULTIPLIER: 1.5,
    STEM_MULTIPLIER: 1.0,
    BUD_MULTIPLIER: 1.2,
    NODE_MULTIPLIER: 1.0,
    BATCH_SIZE: 10,
  },

  // COLORS for rendering cell textures
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 }, // warm cartoonish brown
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 }, // vibrant pastel green
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 }, // vivid saturated green for stems
    NODE: { r: 20, g: 160, b: 20, alpha: 1.0 }, // darker bold green for nodes
    DYING: { r: 255, g: 80, b: 80, alpha: 1.0 }, // bright red for dying/distress
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 }, // lively full green for healthy leaves
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 }, // playful lime green for leaf buds
  },
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fastForward; // When true, simulate multiple ticks per frame.
let fpsText, countText;
let lastRenderTime;

// --------------------------
// DOMContentLoaded Setup
// --------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Create PIXI application
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Helper: Convert RGB to hex number
  function rgbToHex(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }

  // Generate cell textures from constant COLORS
  cellTextures = Object.entries(CONSTANTS.COLORS).reduce(
    (acc, [type, { r, g, b, alpha }]) => {
      const graphics = new PIXI.Graphics();
      graphics.beginFill(rgbToHex(r, g, b), alpha);
      graphics.drawRect(0, 0, 1, 1);
      graphics.endFill();
      acc[type] = app.renderer.generateTexture(graphics);
      return acc;
    },
    {}
  );

  // Set up performance (FPS/Cell count) texts
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: CONSTANTS.PERFORMANCE.FPS_TEXT_SIZE,
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
  scaleSize = 16;
  cols = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);
  cells = [];
  idCounter = 1;
  fastForward = false;
  frame = 0;
  lastRenderTime = performance.now();

  // Initialize occupancy grid
  occupancyGrid = new OccupancyGrid(cols, rows);

  // Add the initial seed
  addInitialSeed();

  // Start the simulation loop
  mainLoop();

  // Keyboard listener for fast‑forward toggle
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      fastForward = !fastForward;
      console.log("Fast-forward:", fastForward);
    }
  });
});

// --------------------------
// Main Loop and Simulation Tick
// --------------------------
function mainLoop() {
  // If fastForward is on, run several simulation ticks per animation frame.
  const ticks = fastForward ? CONSTANTS.PERFORMANCE.FAST_FORWARD_FACTOR : 1;
  for (let i = 0; i < ticks; i++) {
    simulationTick();
  }

  // Update performance metrics.
  const nowRender = performance.now();
  const fps = 1000 / (nowRender - lastRenderTime);
  lastRenderTime = nowRender;
  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Cells: ${cells.length}`;

  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}

function simulationTick() {
  frame++;
  // Update each cell.
  // (Cells that die remove themselves from the global cells array.)
  cells.forEach((cell) => cell.update());
}

// Adds the initial seed at the middle-top of the screen.
function addInitialSeed() {
  const seed = new Seed(Math.floor(cols / 2), 0);
  cells.push(seed);
  return seed;
}

// --------------------------
// Occupancy Grid (for spatial tracking)
// --------------------------
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

  // Get neighboring cells (Moore neighborhood)
  getMooreNeighbors(x, y) {
    let neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
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

// --------------------------
// Base Plant Cell and Subclasses
// --------------------------
class PlantCell {
  constructor(x, y, parent, type) {
    this.pos = { x, y };
    this.parent = parent;
    this.children = [];
    this.type = type;
    this.sprite = new PIXI.Sprite(cellTextures[this.type]);
    this.sprite.x = Math.floor(x * scaleSize);
    this.sprite.y = Math.floor(y * scaleSize);
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);
    occupancyGrid.set(x, y, this);
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;

    // Seed gets special energy; other cells start with a default value (10)
    this.currentEnergy =
      this.type === "SEED" ? CONSTANTS.ENERGY.INITIAL_SEED_ENERGY : 10;

    this.state = "HEALTHY";
  }

  update() {
    this.distributeEnergy();
    this.updateState();
    this.updateVisuals();
  }

  distributeEnergy() {
    // For now, we do not implement energy sharing between cells.
    // (This is a placeholder for a future, more sophisticated model.)
  }

  updateState() {
    // Update cell state based on current energy.
    if (this.currentEnergy >= CONSTANTS.CELL_STATES.THRIVING.minEnergy) {
      this.state = "THRIVING";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.HEALTHY.minEnergy) {
      this.state = "HEALTHY";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.STRESSED.minEnergy) {
      this.state = "STRESSED";
    } else {
      this.state = "DYING";
    }
    if (this.state === "DYING") {
      this.die();
    }
  }

  updateVisuals() {
    // Update the cell's tint based on its state.
    let color;
    switch (this.state) {
      case "THRIVING":
        color = CONSTANTS.CELL_STATES.THRIVING.color;
        break;
      case "HEALTHY":
        color = CONSTANTS.CELL_STATES.HEALTHY.color;
        break;
      case "STRESSED":
        color = CONSTANTS.CELL_STATES.STRESSED.color;
        break;
      case "DYING":
        color = CONSTANTS.CELL_STATES.DYING.color;
        break;
      default:
        color = 0xffffff;
    }
    this.sprite.tint = color;
  }

  die() {
    // Remove the cell from the occupancy grid and stage.
    occupancyGrid.remove(this.pos.x, this.pos.y);
    app.stage.removeChild(this.sprite);
    // Remove the cell from the global array.
    cells = cells.filter((c) => c !== this);
  }
}

// A Seed is a PlantCell that starts with special energy.
class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    // Ensure seed uses the constant initial energy.
    this.currentEnergy = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
  }
}

// StemCell is a basic plant cell representing a stem.
class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }
}

// NodeCell represents a branch node that can create leaf buds.
class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }
  update() {
    super.update();
  }
  createLeafBuds() {
    // Create two leaf buds (left and right) relative to the node.
    const leftBud = new LeafBudCell(this.pos.x - 1, this.pos.y, this);
    const rightBud = new LeafBudCell(this.pos.x + 1, this.pos.y, this);
    this.children.push(leftBud, rightBud);
    cells.push(leftBud, rightBud);
  }
}

// BudCell is responsible for growing upward, eventually transforming into either a stem or a node.
class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
    this.reachedLimit = false;
  }
  update() {
    this.distributeEnergy();
    if (
      !this.reachedLimit &&
      this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW
    ) {
      this.grow();
    }
    this.updateState();
    this.updateVisuals();
  }
  grow() {
    if (this.growthCount >= CONSTANTS.GROWTH.BUD_GROWTH_LIMIT) {
      this.reachedLimit = true;
      this.die();
      return;
    }
    this.growthCount++;
    const newY = this.pos.y - 1; // grow upward

    // Every nth growth, transform into a NodeCell; otherwise become a StemCell.
    if (this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0) {
      const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
      // Replace this bud with a node in parent's children.
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(node);
      cells.push(node);

      // Move the bud upward.
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.y = newY;
      this.sprite.y = this.pos.y * scaleSize;
      occupancyGrid.set(this.pos.x, this.pos.y, this);

      // Create leaf buds on the new node.
      node.createLeafBuds();
    } else {
      const stem = new StemCell(this.pos.x, this.pos.y, this.parent);
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(stem);
      cells.push(stem);

      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.y = newY;
      this.sprite.y = this.pos.y * scaleSize;
      occupancyGrid.set(this.pos.x, this.pos.y, this);
    }
    this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;
  }
}

// LeafBudCell creates leaves when it has sufficient energy.
class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
    // Start with full energy.
    this.currentEnergy = this.energyCapacity;
  }
  update() {
    this.distributeEnergy();
    if (
      !this.hasGrown &&
      this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW
    ) {
      this.growLeafPattern();
    }
    this.updateState();
    this.updateVisuals();
  }
  growLeafPattern() {
    // Create three leaves in an "L" pattern.
    const direction = Math.sign(this.pos.x - this.parent.pos.x);
    const leafPositions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];
    leafPositions.forEach((pos) => {
      const leaf = new Leaf(pos.x, pos.y, this);
      this.children.push(leaf);
      cells.push(leaf);
    });
    this.hasGrown = true;
  }
}

// Leaf cells can collect energy.
class Leaf extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF");
  }
  update() {
    this.collectEnergy();
    this.distributeEnergy();
    this.updateState();
    this.updateVisuals();
  }
  collectEnergy() {
    if (this.currentEnergy < this.energyCapacity) {
      const collectionChance =
        CONSTANTS.COLLECTION.BASE_CHANCE * CONSTANTS.COLLECTION.LEAF_MULTIPLIER;
      if (Math.random() < collectionChance) {
        this.currentEnergy = Math.min(
          this.energyCapacity,
          this.currentEnergy + 1
        );
      }
    }
  }
}
