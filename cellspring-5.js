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

  // Event Types
  EVENTS: {
    STRUCTURE_CHANGE: "structure_change",
    STATE_CHANGE: "state_change",
    RESOURCE_CHANGE: "resource_change",
    PERIODIC_CHECK: "periodic_check",
  },

  // Event Priorities
  EVENT_PRIORITIES: {
    IMMEDIATE: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
  },

  // Update Intervals (frames)
  STRUCTURE_CHECK_INTERVAL: 30,
  ENERGY_CHECK_INTERVAL: 45,
  GROWTH_CHECK_INTERVAL: 90,

  // Energy Flow Parameters
  ENERGY_FLOW: {
    UPWARD_FLOW_RATIO: 0.2, // Max % of excess that flows up
    DOWNWARD_FLOW_RATIO: 0.3, // Max % of excess that flows down
    STORAGE_THRESHOLD: 0.8, // % of capacity before sharing
    REQUEST_THRESHOLD: 0.4, // % of capacity before requesting
    EMERGENCY_THRESHOLD: 0.1, // % of capacity for emergency requests
  },

  // Energy Collection Parameters
  COLLECTION: {
    BASE_CHANCE: 0.02, // 2% base chance per frame
    LEAF_MULTIPLIER: 1.5,
    STEM_MULTIPLIER: 0.5,
    BATCH_SIZE: 10, // Frames to batch for collection
  },

  GROWTH: {
    MIN_ENERGY_TO_GROW: 5,
    STEM_COST: 3,
    NODE_COST: 5,
    LEAF_COST: 4,
    BRANCH_COST: 8,
    INTERNODE_SPACING: 3,
    LEAF_CHANCE: 0.9,
    BRANCH_SUPPRESSION_DISTANCE: 3,
  },

  APICAL_DOMINANCE: {
    STRENGTH: 0.8, // How much main bud suppresses side branching
    DECAY_PER_NODE: 0.2, // How much suppression weakens per node
    MIN_DISTANCE: 2, // Minimum nodes before branching possible
  },
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
  constructor(x, y, seed, type) {
    this.pos = { x, y };
    this.seed = seed;
    this.plantId = seed ? seed.id : null;
    this.parent = null;
    this.children = [];
    this.sprite = new PIXI.Sprite(cellTextures[type || "STEM"]);
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

    // Add event-related properties
    this.lastStateCheck = frame;
    this.lastEnergyCheck = frame;
    this.lastStructureCheck = frame;
    this.eventState = {
      pendingStateChange: false,
      pendingEnergyUpdate: false,
      structureModified: false,
    };

    console.log(`Created ${type} cell at (${x}, ${y})`);

    // Ensure visual connection
    if (type === "STEM" && !this.parent) {
      // This is the first cell, ensure connection to seed
      this.connectToSeed = true;
    }
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

  handleStateChange(data) {
    this.eventState.pendingStateCheck = false;
    const oldState = this.state;

    // Calculate new state based on energy and structure
    const energyRatio = this.currentEnergy / this.energyCapacity;
    const openSides = this.countOpenSides();

    let newState;
    if (energyRatio >= 0.8 && openSides >= 3) {
      newState = "THRIVING";
    } else if (energyRatio >= 0.5 && openSides >= 2) {
      newState = "HEALTHY";
    } else if (energyRatio >= 0.2 && openSides >= 1) {
      newState = "STRESSED";
    } else {
      newState = "DYING";
    }

    if (newState !== oldState) {
      this.state = newState;
      this.updateVisuals(); // Update color based on state
      this.propagateStateChange(oldState, newState);
    }
  }

  handleResourceChange(data) {
    // Update energy levels
    const prevEnergy = this.currentEnergy;
    this.updateEnergy();

    // Check if energy change warrants state change
    if (Math.abs(this.currentEnergy - prevEnergy) / this.energyCapacity > 0.2) {
      this.scheduleStateCheck();
    }
  }

  handlePeriodicCheck(data) {
    // Comprehensive cell check
    this.checkState();
    this.updateEnergyPotential();
    this.checkGrowthPotential();
  }

  propagateStateChange(oldState, newState) {
    // Upward propagation (always notify parent)
    if (this.parent) {
      eventQueue.addEvent(
        this.parent,
        CONSTANTS.EVENTS.STATE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { childState: newState, oldChildState: oldState }
      );
    }

    // Downward propagation (only if state affects children)
    if (newState === "DYING" || newState === "STRESSED") {
      this.children.forEach((child) => {
        eventQueue.addEvent(
          child,
          CONSTANTS.EVENTS.STATE_CHANGE,
          CONSTANTS.EVENT_PRIORITIES.HIGH,
          { parentState: newState, oldParentState: oldState }
        );
      });
    }
  }

  checkStructuralIntegrity() {
    // Basic structural checks
    if (!this.parent && !this.seed) return false;
    if (this.parent && !this.isConnectedToParent()) return false;

    // Check for minimum energy requirements
    if (this.currentEnergy <= 0) return false;

    return true;
  }

  initiateStructuralFailure() {
    // Notify children first
    this.children.forEach((child) => {
      eventQueue.addEvent(
        child,
        CONSTANTS.EVENTS.STRUCTURE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.IMMEDIATE,
        { parentFailing: true }
      );
    });

    // Then handle own death
    this.die();
  }

  updateEnergyPotential() {
    const openSides = this.countOpenSides();
    const oldCapacity = this.energyCapacity;

    // Update capacity based on open sides and type
    this.energyCapacity = this.calculateEnergyCapacity(openSides);

    if (Math.abs(this.energyCapacity - oldCapacity) > oldCapacity * 0.2) {
      this.scheduleStateCheck();
    }
  }

  countOpenSides() {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = this.pos.x + dx,
          ny = this.pos.y + dy;
        if (!occupancyGrid.get(nx, ny)) count++;
      }
    }
    return count;
  }

  calculateEnergyCapacity(openSides) {
    const baseCapacity =
      this.type === "LEAF"
        ? CONSTANTS.LEAF_ENERGY_CAPACITY
        : CONSTANTS.STEM_ENERGY_CAPACITY;

    return baseCapacity * (0.5 + openSides / 8); // 8 is max possible open sides
  }

  die() {
    // Remove from grid
    occupancyGrid.remove(this.pos.x, this.pos.y);

    // Notify parent of death
    if (this.parent) {
      this.parent.removeChild(this);
    }

    // Mark for removal from particles array
    this.dead = true;
  }

  handleEvent(event) {
    switch (event.type) {
      case CONSTANTS.EVENTS.STRUCTURE_CHANGE:
        this.handleStructureChange(event.data);
        break;
      case CONSTANTS.EVENTS.STATE_CHANGE:
        this.handleStateChange(event.data);
        break;
      case CONSTANTS.EVENTS.RESOURCE_CHANGE:
        this.handleResourceChange(event.data);
        break;
      case CONSTANTS.EVENTS.PERIODIC_CHECK:
        this.handlePeriodicCheck(event.data);
        break;
    }
  }

  scheduleStateCheck() {
    if (!this.eventState.pendingStateCheck) {
      this.eventState.pendingStateCheck = true;
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.STATE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL
      );
    }
  }

  update() {
    // Replace frequent checks with periodic events
    if (frame - this.lastStateCheck >= CONSTANTS.STATE_CHECK_INTERVAL) {
      this.scheduleStateCheck();
      this.lastStateCheck = frame;
    }

    if (frame - this.lastEnergyCheck >= CONSTANTS.ENERGY_CHECK_INTERVAL) {
      eventQueue.addEvent(
        this,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL
      );
      this.lastEnergyCheck = frame;
    }

    // Update position and visuals still happen every frame
    this.updatePosition();
    this.updateVisuals();
  }

  updateEnergy() {
    // Deduct maintenance cost
    this.currentEnergy -= CONSTANTS.BASE_MAINTENANCE_COST;

    // Collect energy if applicable
    if (this.type === "LEAF" || this.type === "STEM") {
      this.collectAndDistributeEnergy();
    }

    // Handle energy distribution
    this.handleEnergyDistribution();

    // Check for emergency
    if (this.isInEnergyEmergency()) {
      this.requestEmergencyEnergy();
    }
  }

  collectAndDistributeEnergy() {
    const batchedCollection = this.calculateBatchedCollection();

    // Apply state multiplier
    const energyDelta = CONSTANTS.CELL_STATES[this.state].energyDelta;
    const collectedEnergy = batchedCollection * energyDelta;

    // Store what we can
    const spaceAvailable = this.energyCapacity - this.currentEnergy;
    const energyToStore = Math.min(collectedEnergy, spaceAvailable);
    const excessEnergy = collectedEnergy - energyToStore;

    this.currentEnergy += energyToStore;

    // Distribute excess
    if (excessEnergy > 0) {
      this.distributeExcessEnergy(excessEnergy);
    }
  }

  calculateBatchedCollection() {
    // Use frame count for batch processing
    const batchFrame = Math.floor(frame / CONSTANTS.COLLECTION.BATCH_SIZE);
    if (this.lastBatchFrame === batchFrame) {
      return this.lastBatchResult;
    }

    const openSides = this.countOpenSides();
    const baseChance = CONSTANTS.COLLECTION.BASE_CHANCE;
    const typeMultiplier =
      this.type === "LEAF"
        ? CONSTANTS.COLLECTION.LEAF_MULTIPLIER
        : CONSTANTS.COLLECTION.STEM_MULTIPLIER;

    // Calculate collection for the batch
    let totalCollection = 0;
    for (let i = 0; i < CONSTANTS.COLLECTION.BATCH_SIZE; i++) {
      if (Math.random() < baseChance * openSides) {
        totalCollection += typeMultiplier;
      }
    }

    // Cache result
    this.lastBatchFrame = batchFrame;
    this.lastBatchResult = totalCollection;
    return totalCollection;
  }

  handleEnergyDistribution() {
    const energyRatio = this.currentEnergy / this.energyCapacity;

    // Share excess if we have it
    if (energyRatio > CONSTANTS.ENERGY_FLOW.STORAGE_THRESHOLD) {
      const excess =
        this.currentEnergy -
        this.energyCapacity * CONSTANTS.ENERGY_FLOW.STORAGE_THRESHOLD;
      this.distributeExcessEnergy(excess);
    }

    // Request energy if we need it
    if (energyRatio < CONSTANTS.ENERGY_FLOW.REQUEST_THRESHOLD) {
      this.requestEnergy();
    }
  }

  distributeExcessEnergy(excess) {
    // Distribute upward first if parent needs it
    if (this.parent && this.parent.canAcceptEnergy()) {
      const upwardFlow = excess * CONSTANTS.ENERGY_FLOW.UPWARD_FLOW_RATIO;
      const accepted = this.parent.acceptEnergy(upwardFlow);
      excess -= accepted;
    }

    // Then distribute to children who need it
    if (excess > 0 && this.children.length > 0) {
      const energyPerChild =
        (excess * CONSTANTS.ENERGY_FLOW.DOWNWARD_FLOW_RATIO) /
        this.children.length;
      this.children.forEach((child) => {
        if (child.canAcceptEnergy()) {
          const accepted = child.acceptEnergy(energyPerChild);
          excess -= accepted;
        }
      });
    }

    // Store remaining excess in seed if possible
    if (excess > 0 && this.seed) {
      this.seed.energy += excess;
      this.currentEnergy -= excess;
    }
  }

  canAcceptEnergy() {
    return (
      this.currentEnergy <
      this.energyCapacity * CONSTANTS.ENERGY_FLOW.STORAGE_THRESHOLD
    );
  }

  acceptEnergy(amount) {
    const spaceAvailable =
      this.energyCapacity * CONSTANTS.ENERGY_FLOW.STORAGE_THRESHOLD -
      this.currentEnergy;
    const accepted = Math.min(amount, spaceAvailable);
    this.currentEnergy += accepted;
    return accepted;
  }

  requestEnergy() {
    if (this.parent) {
      eventQueue.addEvent(
        this.parent,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.NORMAL,
        { requestingEnergy: true, requester: this }
      );
    }
  }

  isInEnergyEmergency() {
    return (
      this.currentEnergy <
      this.energyCapacity * CONSTANTS.ENERGY_FLOW.EMERGENCY_THRESHOLD
    );
  }

  requestEmergencyEnergy() {
    if (this.parent) {
      eventQueue.addEvent(
        this.parent,
        CONSTANTS.EVENTS.RESOURCE_CHANGE,
        CONSTANTS.EVENT_PRIORITIES.HIGH,
        { emergencyEnergyRequest: true, requester: this }
      );
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

    // Add visual connection to seed if this is the first cell
    if (this.connectToSeed) {
      // Draw connection to seed
      // (Implementation depends on your rendering system)
    }
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.id = idCounter++;
    this.seed = this;
    this.energy = CONSTANTS.INITIAL_SEED_ENERGY;
    this.isFalling = true;
    this.hasSprouted = false;
    this.sprite.texture = cellTextures.SEED;
    this.landed = false;
    console.log(`Seed created at (${x}, ${y}) with ${this.energy} energy`);
  }

  update() {
    if (!this.landed) {
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

      if (this.hasLanded()) {
        this.landed = true;
        console.log(
          `Seed landed at (${Math.round(this.pos.x)}, ${Math.round(
            this.pos.y
          )})`
        );
        this.startGrowing();
      }
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

  startGrowing() {
    const seedX = Math.round(this.pos.x);
    const seedY = Math.round(this.pos.y);
    console.log(`Seed starting to grow from (${seedX}, ${seedY})`);

    // Create first stem cell IMMEDIATELY above seed
    const firstStem = new PlantCell(
      seedX,
      seedY - 1, // Directly above seed
      this,
      "STEM"
    );

    // Ensure proper connection
    firstStem.parent = null;
    firstStem.seed = this;
    occupancyGrid.set(seedX, seedY - 1, firstStem);
    cells.push(firstStem);

    // Create bud from first stem
    this.bud = new BudCell(seedX, seedY - 1, this);
    this.bud.parent = firstStem;
    cells.push(this.bud);
    console.log(`Created first bud at (${seedX}, ${seedY - 1})`);
  }

  hasLanded() {
    return !this.isFalling && !this.hasSprouted;
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed, "NODE");
    this.hasCreatedLeafBuds = false;
  }

  update() {
    super.update();
    if (!this.hasCreatedLeafBuds) {
      console.log(
        `NODE at (${this.pos.x}, ${this.pos.y}) attempting to create leaf buds`
      );
      this.createLeafBuds();
      this.hasCreatedLeafBuds = true;
    }
  }

  createLeafBuds() {
    if (Math.random() < CONSTANTS.GROWTH.LEAF_CHANCE) {
      // Try both left and right
      [-1, 1].forEach((dir) => {
        const budX = this.pos.x + dir;
        const budY = this.pos.y;

        if (!occupancyGrid.get(budX, budY)) {
          console.log(`Creating LEAF_BUD at (${budX}, ${budY})`);
          let leafBud = new LeafBudCell(budX, budY, this.seed);
          leafBud.parent = this;
          occupancyGrid.set(budX, budY, leafBud);
          cells.push(leafBud);
        }
      });
    }
  }
}

// Leaf functionality
class LeafCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed, "LEAF");
    this.energyCapacity = 150;
    this.lightEfficiency = 3;
  }

  collectLight() {
    return super.collectLight() * this.lightEfficiency;
  }
}

class BudCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed, "BUD");
    this.growthCounter = 0;
    this.totalGrowth = 0;
    this.growthLimit = CONSTANTS.BUD_GROWTH_LIMIT;
    this.internodeSpacing = CONSTANTS.GROWTH.INTERNODE_SPACING; // Use fixed spacing
    this.hasReachedLimit = false;
    this.direction = { x: 0, y: -1 };
    this.isMainBud = false;
    console.log(`Created BUD cell at (${x}, ${y})`);
  }

  grow() {
    if (this.seed.energy < CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) return;

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
      // Create stem cell
      let stem = new PlantCell(targetX, targetY, this.seed, "STEM");

      // Update positions and relationships
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.x = targetX;
      this.pos.y = targetY;
      occupancyGrid.set(this.pos.x, this.pos.y, this);

      // Set up parent-child relationship
      stem.children.push(this);
      this.parent = stem;

      // Add to cells array and deduct energy
      cells.push(stem);
      this.seed.energy -= CONSTANTS.GROWTH.STEM_COST;

      // Update visuals and log
      this.updateVisuals();
      console.log(
        `Placed STEM at (${stem.pos.x}, ${stem.pos.y}), BUD moved to (${this.pos.x}, ${this.pos.y})`
      );
    }
  }

  placeNode() {
    const targetX = this.pos.x + this.direction.x;
    const targetY = this.pos.y + this.direction.y;

    if (!occupancyGrid.get(targetX, targetY)) {
      console.log(`Creating NODE at (${targetX}, ${targetY})`);
      let node = new NodeCell(targetX, targetY, this.seed);
      occupancyGrid.set(targetX, targetY, node);
      cells.push(node);

      // Move bud up
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.x = targetX;
      this.pos.y = targetY - 1; // Move above the node
      occupancyGrid.set(this.pos.x, this.pos.y, this);

      // Set relationships
      node.children.push(this);
      this.parent = node;

      this.updateVisuals();
      console.log(`BUD moved to (${this.pos.x}, ${this.pos.y})`);
    }
  }

  tryPlaceLeaves(node) {
    // Single random check per node
    if (Math.random() < CONSTANTS.GROWTH.LEAF_CHANCE) {
      const leafDirections = [
        { x: -1, y: 0 }, // Left
        { x: 1, y: 0 }, // Right
      ];

      // If check succeeds, try both sides
      for (let dir of leafDirections) {
        const leafX = node.pos.x + dir.x;
        const leafY = node.pos.y;

        if (
          !occupancyGrid.get(leafX, leafY) &&
          this.seed.energy >= CONSTANTS.GROWTH.LEAF_COST
        ) {
          let leaf = new LeafCell(leafX, leafY, this.seed);
          occupancyGrid.set(leafX, leafY, leaf);
          leaf.parent = node;
          node.children.push(leaf);
          cells.push(leaf);
          this.seed.energy -= CONSTANTS.GROWTH.LEAF_COST;
          console.log(`Created LEAF at (${leafX}, ${leafY})`);
        }
      }
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

class LeafBudCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed, "LEAF_BUD");
    this.hasGrown = false;
  }

  update() {
    super.update();
    if (!this.hasGrown) {
      console.log(
        `LEAF_BUD at (${this.pos.x}, ${this.pos.y}) growing leaf pattern`
      );
      this.growLeafPattern();
      this.hasGrown = true;
    }
  }

  growLeafPattern() {
    // Create leaf above
    this.createLeafAt(this.pos.x, this.pos.y - 1);

    // Create leaf horizontal (away from stem)
    const dir = this.pos.x > this.parent.pos.x ? 1 : -1;
    this.createLeafAt(this.pos.x + dir, this.pos.y);

    // Create leaf diagonal
    this.createLeafAt(this.pos.x + dir, this.pos.y - 1);
  }

  createLeafAt(x, y) {
    if (!occupancyGrid.get(x, y)) {
      console.log(`Creating LEAF at (${x}, ${y})`);
      let leaf = new LeafCell(x, y, this.seed);
      leaf.parent = this;
      occupancyGrid.set(x, y, leaf);
      cells.push(leaf);
    }
  }
}
