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
      minEnergy: 8,
      energyDelta: 1.5,
      color: 0x00ff00,
    },
    HEALTHY: {
      minEnergy: 5,
      energyDelta: 1.0,
      color: 0x008000,
    },
    STRESSED: {
      minEnergy: 2,
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
    INTERNODE_SPACING: 5,
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

  // Energy capacities
  ENERGY_CAPACITIES: {
    DEFAULT: 10,
  },

  // Energy Flow Parameters
  ENERGY_FLOW: {
    UPWARD_FLOW_RATIO: 0.2,
    DOWNWARD_FLOW_RATIO: 0.3,
    STORAGE_THRESHOLD: 0.8,
    REQUEST_THRESHOLD: 0.4,
    EMERGENCY_THRESHOLD: 0.1,
  },

  // Collection rates
  COLLECTION: {
    BASE_CHANCE: 0.02,
    LEAF_MULTIPLIER: 1.5,
    STEM_MULTIPLIER: 1.0,
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

  // Colors
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 },
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 },
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 },
    NODE: { r: 20, g: 160, b: 20, alpha: 1.0 },
    DYING: { r: 255, g: 80, b: 80, alpha: 1.0 },
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 },
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 },
  },
};

// Global variables
let app;
let cells = [];
let frame = 0;
let eventQueue;
let occupancyGrid;
let columns, rows;
let scaleSize = 10;
let idCounter = 0;
let cellTextures = {};

class EventQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.frameEvents = new Map();

    // Performance metrics
    this.metrics = {
      totalEvents: 0,
      coalescedEvents: 0,
      processingTime: 0,
      eventTypes: new Map(),
      lastFrameMetrics: null,
    };
  }

  addEvent(cell, type, priority, data = {}) {
    this.metrics.totalEvents++;

    const event = {
      cell,
      type,
      priority,
      data,
      frame,
      id: `${frame}-${cell.id}-${type}`,
      timestamp: performance.now(),
    };

    // Track event types
    this.metrics.eventTypes.set(
      type,
      (this.metrics.eventTypes.get(type) || 0) + 1
    );

    // Coalesce similar events
    const existingEventIndex = this.queue.findIndex(
      (e) => e.cell === cell && e.type === type && e.frame === frame
    );

    if (existingEventIndex >= 0) {
      this.metrics.coalescedEvents++;
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

    const startTime = performance.now();
    let processedCount = 0;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      processedCount++;

      if (event.cell && !event.cell.isDead) {
        try {
          event.cell.handleEvent(event);
        } catch (error) {
          console.error("Error processing event:", error, event);
        }
      }
    }

    const endTime = performance.now();
    this.metrics.processingTime += endTime - startTime;

    // Store frame metrics
    this.metrics.lastFrameMetrics = {
      frame,
      processedEvents: processedCount,
      processingTime: endTime - startTime,
      queueLength: this.queue.length,
      coalescedEvents: this.metrics.coalescedEvents,
    };

    this.processing = false;
  }

  getMetrics() {
    const coalesceRate = (
      (this.metrics.coalescedEvents / this.metrics.totalEvents) *
      100
    ).toFixed(2);
    const avgProcessingTime = (this.metrics.processingTime / frame).toFixed(2);

    return {
      ...this.metrics,
      coalesceRate: `${coalesceRate}%`,
      avgProcessingTime: `${avgProcessingTime}ms`,
      eventsPerType: Object.fromEntries(this.metrics.eventTypes),
      lastFrame: this.metrics.lastFrameMetrics,
    };
  }

  resetMetrics() {
    this.metrics = {
      totalEvents: 0,
      coalescedEvents: 0,
      processingTime: 0,
      eventTypes: new Map(),
      lastFrameMetrics: null,
    };
  }
}

class PlantCell {
  constructor(x, y, parent, type) {
    this.id = idCounter++;
    this.pos = { x, y };
    this.parent = parent;
    this.children = [];
    this.type = type;
    this.isDead = false;
    this.state = "HEALTHY";
    this.currentEnergy = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT;

    // Create sprite
    this.sprite = new PIXI.Sprite(cellTextures[type]);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    this.sprite.width = scaleSize;
    this.sprite.height = scaleSize;
    app.stage.addChild(this.sprite);

    // Register in occupancy grid
    occupancyGrid.set(x, y, this);
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
    const oldState = this.state;

    // Update state based on energy levels
    if (this.currentEnergy >= CONSTANTS.CELL_STATES.THRIVING.minEnergy) {
      this.state = "THRIVING";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.HEALTHY.minEnergy) {
      this.state = "HEALTHY";
    } else if (this.currentEnergy >= CONSTANTS.CELL_STATES.STRESSED.minEnergy) {
      this.state = "STRESSED";
    } else {
      this.state = "DYING";
    }

    if (oldState !== this.state) {
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { stateChanged: true, oldState, newState: this.state }
      );
    }
  }

  handleResourceChange(data) {
    // Check if energy state needs updating
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.STATE_CHANGE,
      CONSTANTS.EVENT_PRIORITIES.HIGH,
      { cause: "resource_change" }
    );
  }

  handleStructureChange(data) {
    if (data.positionChanged) {
      this.updatePosition(data.newPos);
    }
  }

  handlePeriodicCheck(data) {
    // Schedule next state check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.STATE_CHANGE,
      CONSTANTS.EVENT_PRIORITIES.LOW,
      { periodic: true }
    );
  }

  updatePosition(newPos) {
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos = newPos;
    occupancyGrid.set(this.pos.x, this.pos.y, this);
    this.sprite.x = this.pos.x * scaleSize;
    this.sprite.y = this.pos.y * scaleSize;
  }

  die() {
    if (this.isDead) return;

    this.isDead = true;
    this.state = "DYING";

    // Notify parent
    if (this.parent) {
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
    }

    // Kill children
    this.children.forEach((child) => child.die());

    // Remove from grid and stage
    occupancyGrid.remove(this.pos.x, this.pos.y);
    app.stage.removeChild(this.sprite);
    cells = cells.filter((cell) => cell !== this);
  }

  updateVisuals() {
    const color = CONSTANTS.CELL_STATES[this.state].color;
    this.sprite.tint = color;
  }

  update() {
    // Base update just handles visuals
    this.updateVisuals();
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.currentEnergy = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
    this.energyCapacity = CONSTANTS.ENERGY.INITIAL_SEED_ENERGY;
    this.landed = false;
    this.sprouted = false;

    // Start falling
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "fall_check" }
    );
  }

  handleEvent(event) {
    super.handleEvent(event);

    switch (event.type) {
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        if (event.data.type === "fall_check" && !this.landed) {
          this.fall();
        } else if (event.data.type === "sprout_check" && !this.sprouted) {
          this.attemptSprout();
        }
        break;
    }
  }

  fall() {
    const nextY = this.pos.y + 1;

    if (nextY >= rows || occupancyGrid.get(this.pos.x, nextY)) {
      this.landed = true;
      console.log(`Seed landed at (${this.pos.x}, ${this.pos.y})`);

      // Schedule sprout check
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.PERIODIC_CHECK,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { type: "sprout_check" }
      );
      return;
    }

    // Update position
    this.updatePosition({ x: this.pos.x, y: nextY });

    // Schedule next fall check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "fall_check" }
    );
  }

  attemptSprout() {
    if (this.currentEnergy < CONSTANTS.ENERGY.SPROUT_ENERGY_THRESHOLD) {
      // Schedule another check later
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.PERIODIC_CHECK,
        CONSTANTS.EVENT_PRIORITIES.LOW,
        { type: "sprout_check" }
      );
      return;
    }

    console.log(`Seed starting to grow from (${this.pos.x}, ${this.pos.y})`);

    // Create first stem segment
    const stemPos = { x: this.pos.x, y: this.pos.y - 1 };
    if (!occupancyGrid.get(stemPos.x, stemPos.y)) {
      const stem = new StemCell(stemPos.x, stemPos.y, this);
      this.children.push(stem);
      cells.push(stem);

      // Create first bud
      const bud = new BudCell(stemPos.x, stemPos.y, stem);
      stem.children.push(bud);
      cells.push(bud);
      console.log(`Created first bud at (${stemPos.x}, ${stemPos.y})`);

      this.sprouted = true;
      this.currentEnergy -= CONSTANTS.GROWTH.STEM_COST;

      // Trigger resource change event
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { cause: "sprouting" }
      );
    }
  }

  update() {
    super.update();
  }
}

class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
    this.growthLimit = CONSTANTS.GROWTH.BUD_GROWTH_LIMIT;

    // Schedule first growth check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "growth_check" }
    );
  }

  handleEvent(event) {
    super.handleEvent(event);

    switch (event.type) {
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        if (event.data.type === "growth_check") {
          this.attemptGrowth();
        }
        break;
    }
  }

  attemptGrowth() {
    if (this.growthCount >= this.growthLimit) {
      console.log(`BUD: Growth limit reached at height ${this.pos.y}`);
      this.die();
      return;
    }

    if (this.currentEnergy < CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) {
      // Schedule another growth check later
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.PERIODIC_CHECK,
        CONSTANTS.EVENT_PRIORITIES.LOW,
        { type: "growth_check" }
      );
      return;
    }

    // Determine if this should be a node or stem segment
    const shouldCreateNode =
      this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0;
    const newY = this.pos.y - 1;

    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) {
      return;
    }

    if (shouldCreateNode) {
      const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
      this.parent.children.push(node);
      cells.push(node);

      // Move bud up
      this.updatePosition({ x: this.pos.x, y: newY });
      console.log(
        `Placed NODE at (${node.pos.x}, ${node.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
      );
    } else {
      const stem = new StemCell(this.pos.x, this.pos.y, this.parent);
      this.parent.children.push(stem);
      cells.push(stem);

      // Move bud up
      this.updatePosition({ x: this.pos.x, y: newY });
      console.log(
        `Placed STEM at (${stem.pos.x}, ${stem.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
      );
    }

    this.growthCount++;
    this.currentEnergy -= CONSTANTS.GROWTH.GROWTH_ENERGY_COST;
    console.log(`BUD: Cell ${this.growthCount}/${this.growthLimit} placed.`);

    // Schedule next growth check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "growth_check" }
    );
  }

  update() {
    super.update();
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
    this.hasCreatedLeafBuds = false;

    // Schedule leaf bud creation check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "leaf_bud_check" }
    );
  }

  handleEvent(event) {
    super.handleEvent(event);

    switch (event.type) {
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        if (event.data.type === "leaf_bud_check" && !this.hasCreatedLeafBuds) {
          this.createLeafBuds();
        }
        break;
    }
  }

  createLeafBuds() {
    console.log(
      `NODE at (${this.pos.x}, ${this.pos.y}) attempting to create leaf buds`
    );

    // Create left leaf bud
    const leftPos = { x: this.pos.x - 1, y: this.pos.y };
    if (!occupancyGrid.get(leftPos.x, leftPos.y)) {
      console.log(`Creating LEAF_BUD at (${leftPos.x}, ${leftPos.y})`);
      const leftBud = new LeafBudCell(leftPos.x, leftPos.y, this);
      this.children.push(leftBud);
      cells.push(leftBud);
    }

    // Create right leaf bud
    const rightPos = { x: this.pos.x + 1, y: this.pos.y };
    if (!occupancyGrid.get(rightPos.x, rightPos.y)) {
      console.log(`Creating LEAF_BUD at (${rightPos.x}, ${rightPos.y})`);
      const rightBud = new LeafBudCell(rightPos.x, rightPos.y, this);
      this.children.push(rightBud);
      cells.push(rightBud);
    }

    this.hasCreatedLeafBuds = true;
  }

  update() {
    super.update();
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;

    // Schedule growth check
    eventQueue.addEvent(
      this,
      CONSTANTS.EVENTS.PERIODIC_CHECK,
      CONSTANTS.EVENT_PRIORITIES.NORMAL,
      { type: "growth_check" }
    );
  }

  handleEvent(event) {
    super.handleEvent(event);

    switch (event.type) {
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        if (event.data.type === "growth_check" && !this.hasGrown) {
          this.growLeafPattern();
        }
        break;
    }
  }

  growLeafPattern() {
    console.log(
      `LEAF_BUD at (${this.pos.x}, ${this.pos.y}) growing leaf pattern`
    );

    const leafPositions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x - 1, y: this.pos.y },
      { x: this.pos.x - 1, y: this.pos.y - 1 },
    ];

    if (this.pos.x > this.parent.pos.x) {
      // Right side leaf pattern
      leafPositions[1].x = this.pos.x + 1;
      leafPositions[2].x = this.pos.x + 1;
    }

    leafPositions.forEach((pos) => {
      if (!occupancyGrid.get(pos.x, pos.y)) {
        console.log(`Creating LEAF at (${pos.x}, ${pos.y})`);
        const leaf = new LeafCell(pos.x, pos.y, this);
        this.children.push(leaf);
        cells.push(leaf);
      }
    });

    this.hasGrown = true;
  }

  update() {
    super.update();
  }
}

class LeafCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF");
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT * 2;
    this.currentEnergy = this.energyCapacity / 2;
  }

  update() {
    super.update();
    // Leaves collect energy and distribute it
    this.collectEnergy();
  }

  collectEnergy() {
    if (
      Math.random() <
      CONSTANTS.COLLECTION.BASE_CHANCE * CONSTANTS.COLLECTION.LEAF_MULTIPLIER
    ) {
      const energyGained = CONSTANTS.COLLECTION.BATCH_SIZE;
      this.currentEnergy = Math.min(
        this.currentEnergy + energyGained,
        this.energyCapacity
      );

      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { energyGained }
      );
    }
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
    this.energyCapacity = CONSTANTS.ENERGY_CAPACITIES.DEFAULT * 1.5;
    this.currentEnergy = this.energyCapacity / 2;
  }

  update() {
    super.update();
    // Stems can collect a small amount of energy
    this.collectEnergy();
  }

  collectEnergy() {
    if (
      Math.random() <
      CONSTANTS.COLLECTION.BASE_CHANCE * CONSTANTS.COLLECTION.STEM_MULTIPLIER
    ) {
      const energyGained = CONSTANTS.COLLECTION.BATCH_SIZE / 2;
      this.currentEnergy = Math.min(
        this.currentEnergy + energyGained,
        this.energyCapacity
      );

      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { energyGained }
      );
    }
  }
}

// Initialize the game when the DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Initialize game variables
  columns = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);
  eventQueue = new EventQueue();
  occupancyGrid = new OccupancyGrid(columns, rows);

  // Initialize cell textures
  cellTextures = {
    SEED: PIXI.Texture.WHITE,
    STEM: PIXI.Texture.WHITE,
    NODE: PIXI.Texture.WHITE,
    BUD: PIXI.Texture.WHITE,
    LEAF_BUD: PIXI.Texture.WHITE,
    LEAF: PIXI.Texture.WHITE,
  };

  // Create initial seed
  const seed = new Seed(Math.floor(columns / 2), 0);
  cells.push(seed);
  console.log(`Created SEED cell at (${seed.pos.x}, ${seed.pos.y})`);

  // Start game loop
  app.ticker.add(() => {
    frame++;
    cells.forEach((cell) => cell.update());
    eventQueue.processEvents();
  });
});
