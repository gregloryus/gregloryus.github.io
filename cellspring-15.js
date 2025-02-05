/**
 * CELLSPRING-15.JS - STREAMLINED AND FIXED
 *
 * In this version:
 * - The initial seed is placed at the bottom center.
 * - Seed automatically sprouts a bud upward once its energy exceeds its sprout threshold.
 * - Bud cells check for available space and grow upward, transforming themselves into StemCells or NodeCells.
 * - A small ambient energy gain is applied each tick so that cells can reach growth thresholds.
 */

// --------------------------
// CONSTANTS (only those used)
// --------------------------
const CONSTANTS = {
  // Energy-related parameters
  ENERGY: {
    INITIAL_SEED_ENERGY: 1000,
    SPROUT_ENERGY_THRESHOLD: 200,
    BUD_INITIAL_ENERGY: 200,
    GROWTH_ENERGY_COST: 5,
    BASE_MAINTENANCE_COST: 1,
  },

  // Cell States (for visuals and dying behavior)
  CELL_STATES: {
    THRIVING: {
      minEnergy: 800, // high-energy cells become thriving
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

  // Performance parameters
  PERFORMANCE: {
    FAST_FORWARD_FACTOR: 10, // simulation ticks per frame if fast-forward is on
    FPS_TEXT_SIZE: 24,
    PERFORMANCE_LOG_INTERVAL: 100,
  },

  // Energy capacity for all cells (for simplicity)
  ENERGY_CAPACITIES: {
    DEFAULT: 10,
  },

  // Energy collection rates (used by leaves)
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

// --------------------------
// Global variables
// --------------------------
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fastForward; // if true, simulate several ticks per frame
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

  // Generate cell textures from CONSTANTS.COLORS
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

  // Set up performance texts
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

  // Add the initial seed at the bottom center.
  addInitialSeed();

  // Start the simulation loop
  mainLoop();

  // Keyboard listener for fast‑forward toggle.
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
  // Call update on every cell.
  cells.forEach((cell) => cell.update());
}

// Add the initial seed at the bottom center.
function addInitialSeed() {
  // Place seed at (middle, last row)
  const seed = new Seed(Math.floor(cols / 2), rows - 1);
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
  // Returns cells in the Moore neighborhood (if any).
  getMooreNeighbors(x, y) {
    const neighbors = [];
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

// Base PlantCell: all cells have a position, energy, sprite, etc.
class PlantCell {
  constructor(x, y, parent, type) {
    this.pos = { x, y };
    this.parent = parent;
    this.type = type;
    this.children = [];
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;
    this.currentEnergy = 0;
    // Create PIXI sprite using appropriate texture.
    this.sprite = new PIXI.Sprite(cellTextures[type] || cellTextures["SEED"]);
    this.sprite.width = scaleSize;
    this.sprite.height = scaleSize;
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    app.stage.addChild(this.sprite);
    // Set initial occupancy.
    occupancyGrid.set(x, y, this);
  }

  // Default update: gain a little energy, then update state and visuals.
  update() {
    // Ambient energy gain.
    this.currentEnergy += 0.1;
    this.distributeEnergy();
    this.updateState();
    this.updateVisuals();
  }

  // (Stub) distributeEnergy could be improved later.
  distributeEnergy() {
    // For now, do nothing.
  }

  // Update state based on currentEnergy.
  updateState() {
    if (this.currentEnergy >= CONSTANTS.CELL_STATES.THRIVING.minEnergy) {
      this.state = "THRIVING";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.HEALTHY.minEnergy) {
      this.state = "HEALTHY";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.STRESSED.minEnergy) {
      this.state = "STRESSED";
    } else {
      this.state = "DYING";
    }
    // If dying, reduce energy further.
    if (this.state === "DYING") {
      this.currentEnergy = Math.max(
        0,
        this.currentEnergy + CONSTANTS.CELL_STATES.DYING.energyDelta
      );
      if (this.currentEnergy <= 0) {
        this.die();
      }
    }
  }

  // Update visuals by tinting the sprite according to state.
  updateVisuals() {
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

  // Remove cell from stage and occupancy grid.
  die() {
    occupancyGrid.remove(this.pos.x, this.pos.y);
    app.stage.removeChild(this.sprite);
    cells = cells.filter((c) => c !== this);
  }
}

// A Seed is a PlantCell that begins with high energy and sprouts a bud.
class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.currentEnergy = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
    this.sprouted = false;
  }
  update() {
    // Once the seed has enough energy, sprout a bud upward.
    if (
      !this.sprouted &&
      this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_ENERGY_THRESHOLD
    ) {
      // Spawn bud above (growing upward means decreasing y).
      const budY = this.pos.y - 1;
      if (budY >= 0 && !occupancyGrid.get(this.pos.x, budY)) {
        const bud = new BudCell(this.pos.x, budY, this);
        this.children.push(bud);
        cells.push(bud);
        this.sprouted = true;
      }
    }
    super.update();
  }
}

// StemCell represents a mature stem.
class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }
}

// NodeCell represents a branch node that spawns leaf buds.
class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }
  update() {
    super.update();
  }
  createLeafBuds() {
    // Create two leaf buds (to the left and right) if space is free.
    const leftX = this.pos.x - 1,
      rightX = this.pos.x + 1;
    if (leftX >= 0 && !occupancyGrid.get(leftX, this.pos.y)) {
      const leftBud = new LeafBudCell(leftX, this.pos.y, this);
      this.children.push(leftBud);
      cells.push(leftBud);
    }
    if (rightX < cols && !occupancyGrid.get(rightX, this.pos.y)) {
      const rightBud = new LeafBudCell(rightX, this.pos.y, this);
      this.children.push(rightBud);
      cells.push(rightBud);
    }
  }
}

// BudCell is responsible for upward growth.
class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
    this.reachedLimit = false;
    this.currentEnergy = CONSTANTS.ENERGY.BUD_INITIAL_ENERGY;
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
    const newY = this.pos.y - 1; // grow upward
    // Do not grow if off-screen or if target space is occupied.
    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) {
      return;
    }
    this.growthCount++;
    // Every nth growth, transform into a NodeCell; otherwise into a StemCell.
    if (this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0) {
      const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
      // Replace this bud in the parent's children.
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(node);
      cells.push(node);
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.y = newY;
      this.sprite.y = this.pos.y * scaleSize;
      occupancyGrid.set(this.pos.x, this.pos.y, this);
      // A node creates leaf buds.
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

// LeafBudCell creates leaves when possible.
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
    // Create leaves in an "L" pattern.
    const direction = Math.sign(this.pos.x - this.parent.pos.x) || 1;
    const leafPositions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];
    leafPositions.forEach((pos) => {
      if (
        pos.x >= 0 &&
        pos.x < cols &&
        pos.y >= 0 &&
        pos.y < rows &&
        !occupancyGrid.get(pos.x, pos.y)
      ) {
        const leaf = new Leaf(pos.x, pos.y, this);
        this.children.push(leaf);
        cells.push(leaf);
        occupancyGrid.set(pos.x, pos.y, leaf);
      }
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
