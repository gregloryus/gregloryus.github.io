// NOTES ON NEXT INTENTIONS: direction? energy simplification -- doesn't need to be one light per cell... adds up too quickly, should be more stable, just barely hanging on. I still ike the idea of buds being able to grow in one of 4 directions from a stem, but that they're able to freely move between the 3 Moore neigbhor spaces in that direction. For example, a stem growing up above a seed can be up, up-left, or up-right relative to the seed. A stem on top of the parent stem can be up, up-left, or up-right relative to the parent stem. A lateral bud growing up the right of a node can occupy the right, but also the up-right and down-right positions. Does that make sense? Each direction has 3 Moore spots in that direction. When the plant is at it's healthiest (full energy?) the plant should prefer to stand straight up / or at right angles. And it can droop when it lacks water or energy.

// UPDATED CONSTANTS

const CONSTANTS = {
  // Energy-related parameters
  ENERGY: {
    INITIAL_SEED_ENERGY: 1000,
    SPROUT_ENERGY_THRESHOLD: 200,
    BUD_INITIAL_ENERGY: 200,
    GROWTH_ENERGY_COST: 5,
    BASE_MAINTENANCE_COST: 1,
  },

  // Light collection parameters
  LIGHT: {
    LEAF_LIGHT_MULTIPLIER: 1.5,
    STEM_LIGHT_MULTIPLIER: 0.5,
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
    DEFAULT: 10, // Much simpler number to work with
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
    BASE_CHANCE: 0.02,
    LEAF_MULTIPLIER: 1.5,
    STEM_MULTIPLIER: 1.0, // Fixed from 0.5 to 1.0
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
    if (e.key === "f") {
      fastForward = !fastForward;
      console.log("Fast-forward:", fastForward);
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
    console.log(`Total System Energy: ${Math.round(totalEnergy)}`);
  });
});

function mainLoop() {
  const updatesThisFrame = fastForward ? fastForwardFactor : 1;

  for (let i = 0; i < updatesThisFrame; i++) {
    frame++;
    cells.forEach((cell) => cell.update());
  }

  // Process queued events each frame
  eventQueue.processEvents();

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

class EventQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.frameEvents = new Map(); // Track events by frame
  }

  addEvent(cell, type, priority, data = {}) {
    const event = {
      cell,
      type,
      priority,
      data,
      frame,
      id: `${frame}-${cell.id}-${type}`, // Unique event ID
    };

    // Coalesce similar events
    const existingEventIndex = this.queue.findIndex(
      (e) => e.cell === cell && e.type === type && e.frame === frame
    );

    if (existingEventIndex >= 0) {
      // Update existing event with new data
      this.queue[existingEventIndex].data = {
        ...this.queue[existingEventIndex].data,
        ...data,
      };
      return;
    }

    this.queue.push(event);
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  processEvents() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event.cell && !event.cell.isDead) {
        try {
          event.cell.handleEvent(event);
        } catch (error) {
          console.error("Error processing event:", error, event);
        }
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

    // Standardized energy system
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;
    this.currentEnergy = Math.floor(this.energyCapacity / 2);
    this.state = "HEALTHY";

    // Add energy text display with simple white text
    const style = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: Math.floor(scaleSize * 0.8),
      fill: "white",
      align: "center",
      resolution: 2, // Higher resolution for sharper text
    });

    this.energyText = new PIXI.Text("5", style);
    this.energyText.anchor.set(0.5);
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
    app.stage.addChild(this.energyText);

    console.log(`Created ${type} cell at (${x}, ${y})`);

    this.lastUpdateFrame = frame;
    this.id = idCounter++;
    this.isDead = false;
    this.pendingStateChange = false;
  }

  handleEvent(event) {
    switch (event.type) {
      case CONSTANTS.EVENTS.STATE_CHANGE:
        this.handleStateChange(event.data);
        break;
      case CONSTANTS.EVENTS.RESOURCE_CHANGE:
        this.handleResourceChange(event.data);
        break;
      case CONSTANTS.EVENTS.STRUCTURE_CHANGE:
        this.handleStructureChange(event.data);
        break;
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        this.handlePeriodicCheck(event.data);
        break;
    }
  }

  handleStateChange(data) {
    if (this.pendingStateChange) return; // Prevent cascading updates
    this.pendingStateChange = true;

    const oldState = this.state;
    this.updateState();

    if (oldState !== this.state) {
      // Notify connected cells
      this.propagateStateChange();
    }

    this.pendingStateChange = false;
  }

  handleResourceChange(data) {
    const oldEnergy = this.currentEnergy;
    this.distributeEnergy();

    if (Math.abs(this.currentEnergy - oldEnergy) > 1) {
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.STATE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { cause: "energy_change" }
      );
    }
  }

  handleStructureChange(data) {
    // Handle physical changes (position, connections)
    if (data.positionChanged) {
      this.updatePosition();
      this.notifyNeighbors();
    }

    if (data.connectionsChanged) {
      this.validateConnections();
      this.propagateStructureChange();
    }
  }

  handlePeriodicCheck(data) {
    const framesSinceUpdate = frame - this.lastUpdateFrame;
    if (framesSinceUpdate >= CONSTANTS.UPDATE_INTERVALS.ENERGY_CHECK_INTERVAL) {
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.LOW,
        { periodicCheck: true }
      );
    }
  }

  propagateStateChange() {
    // Notify parent
    if (this.parent) {
      eventQueue.addEvent(
        this.parent,
        CONSTANTS.EVENTS.STATE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { source: this.id }
      );
    }

    // Notify children
    this.children.forEach((child) => {
      eventQueue.addEvent(
        child,
        CONSTANTS.EVENTS.STATE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { source: this.id }
      );
    });
  }

  update() {
    // Convert current update logic to event-based
    if (frame % CONSTANTS.UPDATE_INTERVALS.STATE_CHECK_INTERVAL === 0) {
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.PERIODIC_CHECK,
        CONSTANTS.EVENT_PRIORITIES.LOW
      );
    }

    // Visual updates can still happen every frame
    this.updateVisuals();
  }

  distributeEnergy() {
    const connections = [this.parent, ...this.children].filter(
      (cell) => cell !== null
    );

    connections.forEach((neighbor) => {
      const energyDiff = this.currentEnergy - neighbor.currentEnergy;

      if (energyDiff !== 0) {
        const transferAmount = Math.sign(energyDiff);

        if (
          this.currentEnergy - transferAmount >= 0 &&
          neighbor.currentEnergy + transferAmount <= neighbor.energyCapacity
        ) {
          this.currentEnergy -= transferAmount;
          neighbor.currentEnergy += transferAmount;

          this.updateState();
          this.updateVisuals();
          neighbor.updateState();
          neighbor.updateVisuals();
        }
      }
    });
  }

  updateState() {
    const energyRatio = this.currentEnergy / this.energyCapacity;

    if (energyRatio >= 0.8) this.state = "THRIVING";
    else if (energyRatio >= 0.5) this.state = "HEALTHY";
    else if (energyRatio >= 0.2) this.state = "STRESSED";
    else this.state = "DYING";
  }

  updateVisuals() {
    const energyRatio = this.currentEnergy / this.energyCapacity;
    this.sprite.alpha = 0.6 + energyRatio * 0.4;

    // Update energy display
    const energyValue = Math.round(this.currentEnergy);
    this.energyText.text = energyValue >= 10 ? "*" : energyValue.toString();

    // Ensure text stays centered on the cell
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
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
    this.isDead = true;
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.currentEnergy = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
    this.energyCapacity = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
    this.landed = false;
    this.growing = false;
    this.fallSpeed = 0;
    this.fallAcceleration = 0.1;
    console.log(
      `Seed created at (${x}, ${y}) with ${this.currentEnergy} energy`
    );
  }

  update() {
    if (!this.landed) {
      this.fall();
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

  fall() {
    this.fallSpeed += this.fallAcceleration;
    const newY = this.pos.y + this.fallSpeed;

    if (newY >= rows - 1) {
      this.pos.y = rows - 1;
      this.landed = true;
      this.sprite.y = this.pos.y * scaleSize;
      console.log(`Seed landed at (${this.pos.x}, ${this.pos.y})`);
    } else {
      this.pos.y = newY;
      this.sprite.y = Math.floor(this.pos.y * scaleSize);
    }
  }

  startGrowing() {
    if (this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_ENERGY_THRESHOLD) {
      console.log(`Seed starting to grow from (${this.pos.x}, ${this.pos.y})`);
      this.growing = true;

      // Create first stem
      const stemPos = { x: this.pos.x, y: this.pos.y - 1 };
      const stem = new StemCell(stemPos.x, stemPos.y, this);
      this.children.push(stem);
      cells.push(stem);

      // Create first bud
      const bud = new BudCell(stemPos.x, stemPos.y, stem);
      stem.children.push(bud);
      cells.push(bud);

      console.log(`Created first bud at (${stemPos.x}, ${stemPos.y})`);

      this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;
    }
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
    console.log(
      `NODE at (${this.pos.x}, ${this.pos.y}) attempting to create leaf buds`
    );

    // Create left leaf bud
    console.log(`Creating LEAF_BUD at (${this.pos.x - 1}, ${this.pos.y})`);
    const leftBud = new LeafBudCell(this.pos.x - 1, this.pos.y, this);
    this.children.push(leftBud);
    cells.push(leftBud);

    // Create right leaf bud
    console.log(`Creating LEAF_BUD at (${this.pos.x + 1}, ${this.pos.y})`);
    const rightBud = new LeafBudCell(this.pos.x + 1, this.pos.y, this);
    this.children.push(rightBud);
    cells.push(rightBud);
  }
}

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
      if (!this.reachedLimit) {
        console.log(`BUD: Growth limit reached at height ${this.pos.y}`);
        this.reachedLimit = true;
        this.die(); // Remove the bud once it's done growing
      }
      return;
    }

    if (this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) {
      this.growthCount++;

      // Create new stem cell
      const newY = this.pos.y - 1;

      // Every few cells, create a node instead of a stem
      if (this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0) {
        const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
        this.parent.children = this.parent.children.filter(
          (child) => child !== this
        );
        this.parent.children.push(node);
        cells.push(node);

        // Move bud up
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = newY;
        this.sprite.y = this.pos.y * scaleSize;
        occupancyGrid.set(this.pos.x, this.pos.y, this);

        // Create leaf buds on node
        node.createLeafBuds();

        console.log(
          `Placed NODE at (${this.pos.x}, ${this.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
        );
      } else {
        // Create regular stem cell
        const stem = new StemCell(this.pos.x, this.pos.y, this.parent);
        this.parent.children = this.parent.children.filter(
          (child) => child !== this
        );
        this.parent.children.push(stem);
        cells.push(stem);

        // Move bud up
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = newY;
        this.sprite.y = this.pos.y * scaleSize;
        occupancyGrid.set(this.pos.x, this.pos.y, this);

        console.log(
          `Placed STEM at (${this.pos.x}, ${this.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
        );
      }

      // Update parent reference
      const newParent = occupancyGrid.get(this.pos.x, this.pos.y + 1);
      if (newParent) {
        this.parent = newParent;
        newParent.children.push(this);
      }

      this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;
      console.log(
        `BUD: Cell ${this.growthCount}/${CONSTANTS.GROWTH.BUD_GROWTH_LIMIT} placed.`
      );
    }
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
    // Start with full energy like other cells
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
    console.log(
      `LEAF_BUD at (${this.pos.x}, ${this.pos.y}) growing leaf pattern`
    );

    // Direction from stem (-1 for left bud, +1 for right bud)
    const direction = Math.sign(this.pos.x - this.parent.pos.x);

    // Create three leaves in an L pattern
    const leafPositions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];

    leafPositions.forEach((pos) => {
      console.log(`Creating LEAF at (${pos.x}, ${pos.y})`);
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
