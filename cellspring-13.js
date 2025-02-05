// UPDATED CONSTANTS

const CONSTANTS = {
  // Energy-related parameters
  ENERGY: {
    INITIAL_SEED_ENERGY: 10,
    SPROUT_ENERGY_THRESHOLD: 5,
    BUD_INITIAL_ENERGY: 1,
    GROWTH_ENERGY_COST: 8,
    BASE_MAINTENANCE_COST: 1,
  },

  // Light collection parameters
  LIGHT: {
    LEAF_LIGHT_MULTIPLIER: 1.5,
    STEM_LIGHT_MULTIPLIER: 1.0,
  },

  // Cell States
  CELL_STATES: {
    THRIVING: {
      minEnergy: 8, // 80% of 10
      energyDelta: 1.5,
      color: 0x00ff00,
    },
    HEALTHY: {
      minEnergy: 5, // 50% of 10
      energyDelta: 1.0,
      color: 0x008000,
    },
    STRESSED: {
      minEnergy: 2, // 20% of 10
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
    INTERNODE_SPACING: 5, // Unified internode spacing value for buds
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
    FAST_FORWARD_FACTOR: 10,
    FPS_TEXT_SIZE: 24,
    PERFORMANCE_LOG_INTERVAL: 100,
  },

  // Update intervals (frames)
  UPDATE_INTERVALS: {
    STATE_CHECK_INTERVAL: 60,
    ENERGY_UPDATE_INTERVAL: 30,
    STRUCTURE_CHECK_INTERVAL: 30,
    ENERGY_CHECK_INTERVAL: 45,
    GROWTH_CHECK_INTERVAL: 90,
  },

  // Simplify energy capacities
  ENERGY_CAPACITIES: {
    DEFAULT: 10, // Changed capacity: now cells have a maximum of 10 energy.
  },

  // Energy Flow Parameters
  ENERGY_FLOW: {
    UPWARD_FLOW_RATIO: 0.2,
    DOWNWARD_FLOW_RATIO: 0.3,
    STORAGE_THRESHOLD: 0.8,
    REQUEST_THRESHOLD: 0.4,
    EMERGENCY_THRESHOLD: 0.1,
  },

  // Fix collection rates
  COLLECTION: {
    BASE_CHANCE: 0.1,
    LEAF_MULTIPLIER: 1.5,
    STEM_MULTIPLIER: 1.0,
    BUD_MULTIPLIER: 1.2,
    NODE_MULTIPLIER: 1.0,
    BATCH_SIZE: 10,
  },

  // Apical Dominance
  APICAL_DOMINANCE: {
    STRENGTH: 0.8,
    DECAY_PER_NODE: 0.2,
    MIN_DISTANCE: 2,
  },

  // Event Types and Priorities
  EVENTS: {
    STRUCTURE_CHANGE: "structure_change",
    STATE_CHANGE: "state_change",
    RESOURCE_CHANGE: "resource_change",
    PERIODIC_CHECK: "periodic_check",
  },

  EVENT_PRIORITIES: {
    IMMEDIATE: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
  },

  // Add COLORS to our main CONSTANTS object
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 }, // A warm, bright, cartoonish brown
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 }, // A fresh, vibrant pastel green
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 }, // A vivid, saturated green for stems
    NODE: { r: 20, g: 160, b: 20, alpha: 1.0 }, // A slightly darker, bold green for nodes
    DYING: { r: 255, g: 80, b: 80, alpha: 1.0 }, // A striking, bright red to show distress
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 }, // A lively, full green for healthy leaves
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 }, // A light, playful lime green for leaf buds
  },
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let colors, rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;

// NEW: Simulation mode variables
// simulationMode can be 'normal', 'slow', or 'step'
let simulationMode = "normal";
let stepRequested = false; // When in "step" mode, we only run a tick when this flag is set.
let lastSimUpdateTime = performance.now();

// Initialize global variables
idCounter = 1;
fastForward = false;
fastForwardFactor = CONSTANTS.PERFORMANCE.FAST_FORWARD_FACTOR;
frame = 0;

document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Helper function to convert RGB values to a single hex number
  function rgbToHex(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }

  // Generate textures using these cartoon colors
  cellTextures = Object.entries(CONSTANTS.COLORS).reduce(
    (acc, [type, { r, g, b, alpha }]) => {
      const graphics = new PIXI.Graphics();
      const hexColor = rgbToHex(r, g, b);
      graphics.beginFill(hexColor, alpha);
      graphics.drawRect(0, 0, 1, 1);
      graphics.endFill();
      acc[type] = app.renderer.generateTexture(graphics);
      return acc;
    },
    {}
  );

  // Performance monitoring setup
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
    if (e.key === "f" && simulationMode === "normal") {
      fastForward = !fastForward;
    } else if (e.key === "s") {
      // Toggle slow-motion mode. When enabled, disable single-step or fast-forward.
      simulationMode = simulationMode === "slow" ? "normal" : "slow";
      if (simulationMode === "slow") {
        fastForward = false;
        stepRequested = false;
      }
    } else if (e.key === " ") {
      // Spacebar for single-step
      if (simulationMode !== "step") {
        // First spacebar press enables single-step mode (pausing automatic updates)
        simulationMode = "step";
        fastForward = false;
      } else {
        // Subsequent spacebar press requests one simulation tick.
        stepRequested = true;
      }
    }
  });

  // Add this in the DOMContentLoaded event listener, after other event listeners
  document.addEventListener("click", () => {
    console.group("Cell Energy Status");
    cells.forEach((cell) => {
      const energyRatio = cell.currentEnergy / cell.energyCapacity;
      const alpha = cell.sprite.alpha;
      console.log(
        `${cell.type} at (${cell.pos.x}, ${cell.pos.y}):`,
        `\n  Energy: ${Math.round(cell.currentEnergy)}/${cell.energyCapacity}`,
        `\n  Ratio: ${energyRatio.toFixed(2)}`,
        `\n  Alpha: ${alpha.toFixed(2)}`,
        `\n  State: ${cell.state || "N/A"}`
      );
    });
    console.groupEnd();

    // Also log total system energy
    const totalEnergy = cells.reduce(
      (sum, cell) => sum + cell.currentEnergy,
      0
    );
  });
});

function mainLoop() {
  const now = performance.now();

  if (simulationMode === "slow") {
    // In slow-motion mode, update only 6 ticks per second.
    if (now - lastSimUpdateTime >= 1000 / 6) {
      lastSimUpdateTime = now;
      simulationTick();
    }
  } else if (simulationMode === "step") {
    // In single-step mode, only update if a tick was requested.
    if (stepRequested) {
      simulationTick();
      stepRequested = false;
    }
  } else {
    // Normal mode: process exactly one simulation tick per frame.
    simulationTick();
  }

  // Performance metrics update.
  const nowRender = performance.now();
  const fps = 1000 / (nowRender - lastRenderTime);
  lastRenderTime = nowRender;

  // Update display.
  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Cells: ${cells.length}`;

  // Render the stage.
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

class EventQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  addEvent(cell, type, priority, data = {}) {
    this.queue.push({
      cell,
      type,
      priority,
      data,
      frame: frame,
    });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  processEvents() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event.cell) {
        event.cell.handleEvent(event);
      }
    }

    this.processing = false;
  }
}

// Create global event queue
const eventQueue = new EventQueue();

class PlantCell {
  constructor(x, y, parent = null, type) {
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

    // Each new cell (other than SEED) starts with 10 energy.
    // (SEED will set its own value in its constructor.)
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;
    this.currentEnergy =
      this.type === "SEED" ? CONSTANTS.ENERGY.INITIAL_SEED_ENERGY : 10;
    this.state = "HEALTHY";

    // Energy text display
    const style = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: Math.floor(scaleSize * 0.8),
      fill: "white",
      align: "center",
      resolution: 2,
    });
    this.energyText = new PIXI.Text("0", style);
    this.energyText.anchor.set(0.5);
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
    app.stage.addChild(this.energyText);

    // Container for extra energy overlay (if present)
    this.extraOverlay = null;
  }

  // Helper: climb the parent chain to return the seed (the plant's root).
  getPlantSeed() {
    let cell = this;
    while (cell.parent) {
      cell = cell.parent;
    }
    return cell;
  }

  // Returns true if this cell is holding an extra unit.
  isExtra() {
    return this.currentEnergy > this.energyCapacity;
  }

  // New fluid-like energy distribution based on local (Moore) neighbors.
  distributeEnergy() {
    // Look up all adjacent cells.
    const neighbors = occupancyGrid
      .getMooreNeighbors(this.pos.x, this.pos.y)
      .filter(
        (nbr) =>
          nbr.getPlantSeed() === this.getPlantSeed() && nbr.type !== "SEED"
      );

    // For each neighbor, try to transfer one unit if there is at least a 2-unit difference.
    for (const neighbor of neighbors) {
      const diff = this.currentEnergy - neighbor.currentEnergy;
      // If this cell has ≥2 more energy than neighbor, attempt to transfer 1 unit.
      if (diff >= 2) {
        const neighborMax =
          neighbor.energyCapacity + (neighbor.isExtra() ? 0 : 1);
        if (neighbor.currentEnergy < neighborMax) {
          this.currentEnergy -= 1;
          neighbor.currentEnergy += 1;
        }
      }
      // Conversely, if this cell has ≥2 less energy than neighbor, receive 1 unit.
      else if (diff <= -2) {
        const myMax = this.energyCapacity + (this.isExtra() ? 0 : 1);
        if (this.currentEnergy < myMax) {
          neighbor.currentEnergy -= 1;
          this.currentEnergy += 1;
        }
      }
    }
  }

  updateVisuals() {
    const energyRatio = this.currentEnergy / this.energyCapacity;
    // Cap the alpha calculation at full capacity.
    this.sprite.alpha = 0.6 + Math.min(energyRatio, 1) * 0.4;

    // Compute a percentage value: if 100% or more, display "*", else show the tens digit.
    const percentage = (this.currentEnergy / this.energyCapacity) * 100;
    if (percentage >= 100) {
      this.energyText.text = "*";
    } else {
      const digit = Math.floor(percentage / 10);
      this.energyText.text = digit.toString();
    }
    // Re-center the text.
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;

    // Draw an overlay if the cell is extra-energized.
    if (this.isExtra()) {
      if (!this.extraOverlay) {
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0xffff00, 0.2);
        // Draw a rectangle 3 cells wide/high.
        overlay.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        overlay.endFill();
        // Position the overlay so it's centered over the cell.
        overlay.x = this.sprite.x - scaleSize;
        overlay.y = this.sprite.y - scaleSize;
        this.extraOverlay = overlay;
        app.stage.addChild(overlay);
      }
    } else {
      if (this.extraOverlay) {
        app.stage.removeChild(this.extraOverlay);
        this.extraOverlay = null;
      }
    }
  }

  updateState() {
    if (this.currentEnergy >= this.energyCapacity) {
      this.state = "THRIVING";
    } else if (this.currentEnergy >= 0.5 * this.energyCapacity) {
      this.state = "HEALTHY";
    } else if (this.currentEnergy >= 0.2 * this.energyCapacity) {
      this.state = "STRESSED";
    } else {
      this.state = "DYING";
    }
  }

  update() {
    // First, let this cell distribute its energy with its neighbors.
    this.distributeEnergy();

    // Update the cell's state.
    this.updateState();

    // Update the visuals to reflect current energy and state.
    this.updateVisuals();
  }

  die() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
    }
    cells = cells.filter((cell) => cell !== this);
    occupancyGrid.remove(this.pos.x, this.pos.y);
    app.stage.removeChild(this.sprite);
    app.stage.removeChild(this.energyText);
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    // Set the seed's energy values according to the new spec.
    this.currentEnergy = 100;
    this.energyCapacity = 100;
    this.landed = false;
    this.growing = false;
  }

  update() {
    if (!this.landed) {
      // Discrete falling: move exactly one unit downward per tick.
      const newY = Math.floor(this.pos.y) + 1;
      if (newY >= rows - 1) {
        this.pos.y = rows - 1;
        this.landed = true;
        this.sprite.y = this.pos.y * scaleSize;
      } else {
        this.pos.y = newY;
        this.sprite.y = newY * scaleSize;
      }
    } else if (
      !this.growing &&
      this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_ENERGY_THRESHOLD
    ) {
      this.startGrowing();
    }
    this.distributeEnergy();
    this.updateState();
    this.updateVisuals();
  }

  startGrowing() {
    if (this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_ENERGY_THRESHOLD) {
      this.growing = true;
      // Create first bud only (so that on the next tick, the bud spawns a stem above itself)
      const budPos = { x: this.pos.x, y: this.pos.y - 1 };
      const bud = new BudCell(budPos.x, budPos.y, this);
      this.children.push(bud);
      cells.push(bud);
      this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;
    }
  }

  updateVisuals() {
    // For the seed, always display its numeric energy value centered over its sprite.
    this.energyText.text = String(Math.floor(this.currentEnergy));
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
    const energyRatio = this.currentEnergy / this.energyCapacity;
    this.sprite.alpha = 0.6 + Math.min(energyRatio, 1) * 0.4;
  }

  distributeEnergy() {
    // Seed is inert in terms of energy transfers after sprouting.
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }

  update() {
    this.distributeEnergy();
    this.updateState();
    this.updateVisuals();
  }

  createLeafBuds() {
    const leftBud = new LeafBudCell(this.pos.x - 1, this.pos.y, this);
    this.children.push(leftBud);
    cells.push(leftBud);

    const rightBud = new LeafBudCell(this.pos.x + 1, this.pos.y, this);
    this.children.push(rightBud);
    cells.push(rightBud);
  }
}

class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    // Use the bud initial energy from the ENERGY section if desired, or default to 10.
    this.currentEnergy = CONSTANTS.ENERGY.BUD_INITIAL_ENERGY;
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;
    this.growthCount = 0; // Initialize growth counter
  }

  update() {
    // Distribute energy as usual.
    this.distributeEnergy();

    // For each empty cardinal adjacent cell, small chance to gain 1 energy unit.
    const cardinalOffsets = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];
    cardinalOffsets.forEach((offset) => {
      const nx = this.pos.x + offset.dx;
      const ny = this.pos.y + offset.dy;
      if (!occupancyGrid.get(nx, ny)) {
        if (Math.random() < 0.01) {
          this.currentEnergy = Math.min(
            this.currentEnergy + 1,
            this.energyCapacity
          );
        }
      }
    });

    // When energy is high enough, trigger growth.
    if (this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) {
      this.grow();
    }

    this.updateState();
    this.updateVisuals();
  }

  // Helper: place a stem then move the bud upward.
  placeStem(newY) {
    const stem = new StemCell(this.pos.x, this.pos.y, this.parent);
    // Replace this bud in the parent's children list.
    this.parent.children = this.parent.children.filter(
      (child) => child !== this
    );
    this.parent.children.push(stem);
    cells.push(stem);

    // Move the bud upward.
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y = newY;
    this.sprite.y = this.pos.y * scaleSize;
    occupancyGrid.set(this.pos.x, this.pos.y, this);
  }

  // Helper: place a node then move the bud upward, then create its leaf buds.
  placeNode(newY) {
    const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
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
  }

  // Growth method now alternates between stem and node.
  grow() {
    if (this.growthCount >= CONSTANTS.GROWTH.BUD_GROWTH_LIMIT) {
      this.die();
      return;
    }

    // Determine new Y position (one cell up).
    const newY = this.pos.y - 1;
    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) {
      return;
    }

    // Force the very first growth (growthCount === 0) to produce a stem.
    if (
      this.growthCount > 0 &&
      this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0
    ) {
      this.placeNode(newY);
      this.currentEnergy -= CONSTANTS.GROWTH.NODE_COST;
    } else {
      this.placeStem(newY);
      this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;
    }

    this.growthCount++;

    // (Optional) Update parent reference if needed.
    const newParent = occupancyGrid.get(this.pos.x, this.pos.y + 1);
    if (newParent) {
      this.parent = newParent;
      newParent.children.push(this);
    }
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
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

function simulationTick() {
  frame++;
  cells.forEach((cell) => cell.update());
  eventQueue.processEvents();
}
