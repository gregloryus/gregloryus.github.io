// CONSTANTS
const CONSTANTS = {
  // Core energy parameters
  ENERGY: {
    DEFAULT_CAPACITY: 10,
    SEED_ENERGY: 10,
    SEED_CAPACITY: 10,
    SPROUT_THRESHOLD: 5,
    GROWTH_COST: 3,
    MAINTENANCE_INTERVAL: 60,
    MAINTENANCE_COST: 1,
    COLLECTION_CHANCE: 0.03, // Approximately 1/33.7
    LEAF_MULTIPLIER: 3,
    AIRBORNE_STEPS: 100, // New constant for seed dispersal
    DEFAULT_LIFESPAN: 1000, // Default lifespan in frames
    REPRODUCTION_ENERGY_KEEP_RATIO: 0.3, // Keep 30% of energy after reproduction
    REPRODUCTION_ENERGY_MINIMUM: 3, // Minimum energy to keep after reproduction
  },

  // Growth parameters
  GROWTH: {
    MIN_ENERGY_TO_GROW: 5,
  },

  // Visual parameters
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 },
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 },
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 },
    NODE: { r: 20, g: 160, b: 20, alpha: 1.0 },
    DYING: { r: 255, g: 80, b: 80, alpha: 1.0 },
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 },
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 },
    DYING_FLASH: { r: 255, g: 0, b: 0, alpha: 1.0 }, // New color for death flash
    SUN: { r: 255, g: 255, b: 0, alpha: 1.0 }, // Ensure this exists
  },

  PERFORMANCE: {
    FAST_FORWARD_FACTOR: 10,
    FPS_TEXT_SIZE: 24,
    SLOW_MOTION_FPS: 6, // New constant for slow motion
  },

  SUN: {
    MOVEMENT_MODES: {
      SNAKE: "snake",
      SWEEP: "sweep",
    },
    DEFAULT_MODE: "sweep", // Change this to switch default
  },
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;
let paused = false;
let slowMotion = false;
let lastUpdateTime = performance.now();
let showEnergyText = true; // New global setting
let sun; // Add sun reference
let sunConfig = {
  mode: "sweep", // 'snake' or 'sweep'
  axis: "vertical", // 'vertical' or 'horizontal'
  direction: 1, // 1 or -1
};

// Initialize global variables
idCounter = 1;
fastForward = false;
fastForwardFactor = CONSTANTS.PERFORMANCE.FAST_FORWARD_FACTOR;
frame = 0;

// Add this constant near your other CONSTANTS or global variable declarations.
const NUM_STARTER_SEEDS = 1; // Change this number to start with a different number of seeds

function addInitialSeeds(numSeeds) {
  // Calculate spacing: seeds will be positioned at x = i * (cols / (numSeeds + 1))
  const spacing = cols / (numSeeds + 1);
  for (let i = 1; i <= numSeeds; i++) {
    const x = Math.floor(i * spacing);
    const seed = new Seed(x, 0);
    cells.push(seed);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Helper function to convert RGB values to hex
  function rgbToHex(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }

  // Generate textures
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

  // Setup performance monitoring
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
  lastRenderTime = performance.now();

  // Calculate grid dimensions
  cols = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);

  // Log world details
  const ticksPerYear = cols * rows;
  const totalSeconds = ticksPerYear / 60; // Assuming 60 ticks/second
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  console.log(`World initialized:
  - Dimensions: ${cols}x${rows} cells
  - Year length: ${ticksPerYear} ticks (${minutes}m ${seconds}s)
  - Cell size: ${scaleSize}px`);

  // Create sun first (now starts at 0,0)
  sun = new Sun(sunConfig);
  sun.updatePosition(0, 0); // Force initial position

  // Create seed (now second particle)
  const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
  cells.push(seed);

  mainLoop();

  // Add keyboard listener for fast-forward
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      fastForward = !fastForward;
    }
    if (e.key === "s") {
      slowMotion = !slowMotion;
      paused = false; // Unpause when toggling slow motion
    }
    if (e.key === " ") {
      // Spacebar
      if (paused) {
        // Advance one frame when paused
        frame++;
        cells.forEach((cell) => cell.update());
      }
      paused = !paused;
      e.preventDefault(); // Prevent page scrolling
    }
    if (e.key === "t") {
      // New handler for toggling energy text
      showEnergyText = !showEnergyText;
      // Update visibility of all existing energy text
      cells.forEach((cell) => {
        if (cell.energyText) {
          cell.energyText.visible = showEnergyText;
        }
      });
    }
    if (e.key === "m") {
      // Press M to toggle movement mode
      sun.toggleMovementMode();
    }
    if (e.key === "w") {
      sunConfig.mode = sunConfig.mode === "snake" ? "sweep" : "snake";
      resetSimulation();
    }
    if (e.key === "v") {
      sunConfig.axis =
        sunConfig.axis === "vertical" ? "horizontal" : "vertical";
      resetSimulation();
    }
    if (e.key === "r") {
      // Reverse direction
      sunConfig.direction *= -1;
      resetSimulation();
    }
  });

  // Add click handler for cell inspection
  app.view.addEventListener("click", (e) => {
    // Get all unique seeds (plants)
    const seeds = [...new Set(cells.map((cell) => cell.getPlantSeed()))];

    seeds.forEach((seed) => {
      const plantCells = cells.filter((cell) => cell.getPlantSeed() === seed);

      console.log("\n=== Plant Report ===");
      console.log("Plant Details:", {
        seedAge: seed.age,
        maturityAge: seed.maturityAge,
        maturitySize: seed.maturitySize,
        currentSize: plantCells.length,
        position: { x: seed.pos.x, y: seed.pos.y },
        genes: seed.genes,
      });

      console.log("Cell Details:");
      plantCells.forEach((cell) => {
        console.log(`- ${cell.type}:`, {
          position: cell.pos,
          energy: cell.currentEnergy,
          isExtra: cell.isExtra ? cell.isExtra() : "N/A",
          children: cell.children.length,
          parent: cell.parent ? cell.parent.type : "none",
        });
      });
    });
  });
});

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

  // Get all neighbors (for energy distribution)
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

  // Get just cardinal neighbors (for energy collection)
  getCardinalNeighbors(x, y) {
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    let emptySpaces = 0;
    cardinals.forEach(({ dx, dy }) => {
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        if (!this.get(nx, ny)) emptySpaces++;
      }
    });
    return emptySpaces;
  }
}

// New base class
class Particle {
  constructor(x, y, textureKey) {
    this.pos = { x, y };

    // Visual setup
    this.sprite = new PIXI.Sprite(cellTextures[textureKey]);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);
  }

  // Common interface methods
  getPosition() {
    return this.pos;
  }

  updatePosition(newX, newY) {
    this.pos.x = newX;
    this.pos.y = newY;
    this.sprite.x = newX * scaleSize;
    this.sprite.y = newY * scaleSize;
  }

  // To be overridden by subclasses
  update() {
    throw new Error("Update method must be implemented by subclass");
  }
}

// Modified PlantCell to extend Particle
class PlantCell extends Particle {
  constructor(x, y, parent = null, type) {
    super(x, y, type);
    this.parent = parent;
    this.children = [];

    // Energy system
    this.energyCapacity = CONSTANTS.ENERGY.DEFAULT_CAPACITY;
    this.currentEnergy = 1;
    this.lastMaintenanceTick = frame;

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
    this.energyText.visible = showEnergyText;
    app.stage.addChild(this.energyText);

    this.extraOverlay = null;
    this.dead = false;
    this.age = 0;
    this.lifespan = parent
      ? parent.getPlantSeed().genes.cellLifespan
      : CONSTANTS.ENERGY.DEFAULT_LIFESPAN;

    // Add tracking for last empty spaces count
    this.lastEmptySpacesCount = null;
  }

  isExtra() {
    return this.currentEnergy > this.energyCapacity;
  }

  getPlantSeed() {
    let cell = this;
    while (cell.parent) {
      cell = cell.parent;
    }
    return cell;
  }

  collectEnergy() {
    // Count empty cardinal spaces
    const emptySpaces = occupancyGrid.getCardinalNeighbors(
      this.pos.x,
      this.pos.y
    );

    // Each empty space has base collection chance, multiplied for leaves
    for (let i = 0; i < emptySpaces * CONSTANTS.ENERGY.LEAF_MULTIPLIER; i++) {
      if (Math.random() < CONSTANTS.ENERGY.COLLECTION_CHANCE) {
        // Check if plant is mature before allowing excess energy
        const seed = this.getPlantSeed();
        const buds = cells.filter(
          (cell) =>
            (cell instanceof BudCell || cell instanceof LeafBudCell) &&
            cell.getPlantSeed() === seed
        );
        const isFullyGrown =
          buds.length > 0 && buds.every((bud) => bud.growthLimitReached);

        // Only increment if below capacity or plant is fully grown
        if (this.currentEnergy < this.energyCapacity || isFullyGrown) {
          this.currentEnergy++;
        }
      }
    }
  }

  payMaintenanceCost() {
    if (
      frame - this.lastMaintenanceTick >=
      CONSTANTS.ENERGY.MAINTENANCE_INTERVAL
    ) {
      this.currentEnergy -= CONSTANTS.ENERGY.MAINTENANCE_COST;
      this.lastMaintenanceTick = frame;
    }
  }

  distributeEnergy() {
    // Get valid connections - exclude null and dead cells
    const connections = [this.parent, ...this.children].filter(
      (cell) => cell !== null && cell instanceof PlantCell && !cell.dead
    );

    // Check if ANY bud in the plant is still growing
    const seed = this.getPlantSeed();
    const buds = cells.filter(
      (cell) =>
        (cell instanceof BudCell || cell instanceof LeafBudCell) &&
        cell.getPlantSeed() === seed
    );

    // Plant must have at least one bud and all buds must be fully grown
    const isFullyGrown =
      buds.length > 0 && buds.every((bud) => bud.growthLimitReached);
    const canStoreExcess = isFullyGrown;

    // First handle excess energy - distribute ALL excess
    if (canStoreExcess && this.isExtra()) {
      const excess = this.currentEnergy - this.energyCapacity;
      for (let i = 0; i < excess; i++) {
        const needyNeighbors = connections.filter((n) => !n.isExtra());
        if (needyNeighbors.length > 0) {
          const neighbor =
            needyNeighbors[Math.floor(Math.random() * needyNeighbors.length)];
          this.currentEnergy--;
          neighbor.currentEnergy++;
        } else {
          break; // No needy neighbors left
        }
      }
    }

    // Then balance energy with neighbors
    for (const neighbor of connections) {
      const diff = this.currentEnergy - neighbor.currentEnergy;
      if (Math.abs(diff) >= 2) {
        const transfer = Math.sign(diff);
        this.currentEnergy -= transfer;
        neighbor.currentEnergy += transfer;
      }
    }
  }

  checkDeath() {
    if (
      this.currentEnergy <= 0 ||
      (this.type !== "SEED" && this.age >= this.lifespan)
    ) {
      const seed = this.getPlantSeed();
      if (seed) {
        seed.deathReason =
          this.currentEnergy <= 0
            ? "energy depletion"
            : `cell age limit (${this.age} frames)`;
      }
      this.die();
    }
  }

  die() {
    if (this.dead) return;

    // Flash red before dying
    this.sprite.tint = 0xff0000; // Set to red
    this.sprite.alpha = 1.0; // Full opacity

    // Use setTimeout to remove after flash
    setTimeout(() => {
      const seed = this.getPlantSeed();
      if (seed) {
        seed.die();
      } else {
        // Fallback cleanup
        this.dead = true;
        occupancyGrid.remove(this.pos.x, this.pos.y);
        app.stage.removeChild(this.sprite);
        app.stage.removeChild(this.energyText);
        if (this.extraOverlay) {
          app.stage.removeChild(this.extraOverlay);
          this.extraOverlay = null;
        }
        cells = cells.filter((cell) => cell !== this);
      }
    }, 100); // 100ms flash duration
  }

  updateVisuals() {
    const energyRatio = this.currentEnergy / this.energyCapacity;
    this.sprite.alpha = 0.6 + Math.min(energyRatio, 1) * 0.4;

    const percentage = (this.currentEnergy / this.energyCapacity) * 100;
    this.energyText.text =
      percentage >= 100 ? "*" : Math.floor(percentage / 10).toString();
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
    this.energyText.visible = showEnergyText;

    if (this.isExtra()) {
      if (!this.extraOverlay) {
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0xffff00, 0.16);
        overlay.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        overlay.endFill();
        overlay.x = this.sprite.x - scaleSize;
        overlay.y = this.sprite.y - scaleSize;
        this.extraOverlay = overlay;
        app.stage.addChild(overlay);
      }
    } else if (this.extraOverlay) {
      app.stage.removeChild(this.extraOverlay);
      this.extraOverlay = null;
    }
  }

  checkEmptyMooreNeighborhood(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        const neighbor = occupancyGrid.get(nx, ny);
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false; // Found a neighbor from a different plant
        }
      }
    }
    return true; // No disallowed neighbors found
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.airborne = true;
    this.stepsTaken = 0;
    this.age = 0;
    this.maturityAge = null;
    this.maturitySize = null;
    this.dead = false;
    this.deathReason = null; // Add this to track death reason

    this.genes = {
      internodeSpacing: 3,
      budGrowthLimit: 11,
      cellLifespan: CONSTANTS.ENERGY.DEFAULT_LIFESPAN,
    };
  }

  canReproduce() {
    // Get all non-seed cells belonging to this plant
    const plantCells = cells.filter(
      (cell) => cell.getPlantSeed() === this && cell.type !== "SEED"
    );

    // Check if there are any buds and if they've all reached their limits
    const buds = plantCells.filter(
      (cell) => cell instanceof BudCell || cell instanceof LeafBudCell
    );

    // Plant must have at least one bud and all buds must be fully grown
    const isFullyGrown =
      buds.length > 0 && buds.every((bud) => bud.growthLimitReached);

    // Check if ALL cells are extra energized AND plant is fully grown
    return isFullyGrown && plantCells.every((cell) => cell.isExtra());
  }

  startGrowing() {
    // TEMPORARILY DISABLED
    // const budPos = { x: this.pos.x, y: this.pos.y - 1 };
    // if (!occupancyGrid.get(budPos.x, budPos.y)) {
    //   const bud = new BudCell(budPos.x, budPos.y, this);
    //   bud.inheritGenes(this.genes);
    //   this.children.push(bud);
    //   cells.push(bud);
    // } else {
    //   this.die();
    // }
  }

  checkNeighborsForLanding() {
    // Check all 8 surrounding positions (Moore neighborhood)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = this.pos.x + dx;
        const ny = this.pos.y + dy;
        if (occupancyGrid.get(nx, ny)) {
          return false; // Found a neighbor
        }
      }
    }
    return true; // No neighbors found
  }

  update() {
    if (this.dead) return;

    this.age++;

    // Handle airborne movement
    if (this.airborne) {
      if (this.stepsTaken >= CONSTANTS.ENERGY.AIRBORNE_STEPS) {
        this.airborne = false;
        // Check both occupancy and neighbors when landing
        if (
          !occupancyGrid.get(this.pos.x, this.pos.y) &&
          this.checkNeighborsForLanding()
        ) {
          occupancyGrid.set(this.pos.x, this.pos.y, this);
          this.startGrowing();
        } else {
          this.die();
          return;
        }
        return;
      }

      // Random walk without occupancy checks
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];

      const newX = Math.min(Math.max(0, this.pos.x + dir.dx), cols - 1);
      const newY = Math.min(Math.max(0, this.pos.y + dir.dy), rows - 1);

      this.pos.x = newX;
      this.pos.y = newY;
      this.sprite.x = newX * scaleSize;
      this.sprite.y = newY * scaleSize;

      this.stepsTaken++;
    } else {
      // If not airborne and has no children (failed to grow), die
      if (this.children.length === 0) {
        this.die();
        return; // Stop processing immediately
      }
    }

    // Check for reproduction if not airborne
    if (!this.airborne && this.canReproduce()) {
      // Get all non-seed cells belonging to this plant
      const plantCells = cells.filter(
        (cell) => cell.getPlantSeed() === this && cell.type !== "SEED"
      );
      const plantSize = plantCells.length;

      // Record maturity stats if this is the first reproduction
      if (this.maturityAge === null) {
        this.maturityAge = this.age;
        this.maturitySize = plantSize;
      }

      // Create new seed
      const newSeed = new Seed(this.pos.x, this.pos.y);
      newSeed.genes = { ...this.genes }; // Inherit genes
      cells.push(newSeed);

      // Drain energy from existing plant more gradually
      plantCells.forEach((cell) => {
        const energyToKeep = Math.max(
          Math.ceil(
            cell.currentEnergy * CONSTANTS.ENERGY.REPRODUCTION_ENERGY_KEEP_RATIO
          ),
          CONSTANTS.ENERGY.REPRODUCTION_ENERGY_MINIMUM
        );
        cell.currentEnergy = energyToKeep;
      });
    }

    if (!this.dead) {
      // Only update visuals if still alive
      this.updateVisuals();
    }
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }

  update() {
    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.checkDeath();
    this.updateVisuals();
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }

  update() {
    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.checkDeath();
    this.updateVisuals();
  }

  createLeafBuds() {
    [-1, 1].forEach((dir) => {
      const newX = this.pos.x + dir;
      if (!occupancyGrid.get(newX, this.pos.y)) {
        const bud = new LeafBudCell(newX, this.pos.y, this);
        this.children.push(bud);
        cells.push(bud);
      }
    });
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }
}

class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
    this.growthLimitReached = false;
    this.genes = {}; // Will be set by inheritGenes
    this.restCounter = 0; // Add rest counter
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }

  isExtra() {
    // A bud that hasn't grown should never be extra
    if (this.growthCount === 0) {
      return false;
    }
    return this.currentEnergy > this.energyCapacity;
  }

  update() {
    if (this.dead) return;

    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();

    // Cap energy at capacity if haven't grown yet
    if (this.growthCount === 0 && this.currentEnergy > this.energyCapacity) {
      this.currentEnergy = this.energyCapacity;
    }

    this.distributeEnergy();

    // Check if we can grow
    if (this.currentEnergy >= this.energyCapacity) {
      this.grow();
    }

    if (!this.dead) {
      this.checkDeath();
      if (!this.dead) {
        this.updateVisuals();
      }
    }
  }

  grow() {
    if (this.growthCount >= this.genes.budGrowthLimit) {
      if (!this.growthLimitReached) {
        this.growthLimitReached = true;
      }
      return;
    }

    const newY = this.pos.y - 1;
    if (newY < 0) return;

    // Basic occupancy check first
    if (!occupancyGrid.get(this.pos.x, newY)) {
      // Then check Moore neighborhood
      if (this.checkEmptyMooreNeighborhood(this.pos.x, newY)) {
        this.restCounter = 0; // Reset counter on successful growth
        this.growthCount++;

        // Store old position
        const oldX = this.pos.x;
        const oldY = this.pos.y;

        // Move bud up
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = newY;
        this.sprite.y = this.pos.y * scaleSize;
        occupancyGrid.set(this.pos.x, this.pos.y, this);

        // Create new cell in old position
        let newCell;
        if (
          this.growthCount > 0 &&
          this.growthCount % this.genes.internodeSpacing === 0
        ) {
          newCell = new NodeCell(oldX, oldY, this.parent);
          newCell.inheritGenes(this.genes);
          newCell.createLeafBuds();
        } else {
          newCell = new StemCell(oldX, oldY, this.parent);
        }

        // Update relationships
        if (this.parent) {
          this.parent.children = this.parent.children.filter(
            (child) => child !== this
          );
          this.parent.children.push(newCell);
        }
        newCell.parent = this.parent;
        this.parent = newCell;
        newCell.children.push(this);

        cells.push(newCell);
        this.currentEnergy -= CONSTANTS.ENERGY.GROWTH_COST;
      } else {
        this.restCounter++;
        if (this.restCounter >= 10) {
          this.restCounter = 0;
        }
      }
    } else {
      this.restCounter++;
      if (this.restCounter >= 10) {
        this.restCounter = 0;
      }
    }
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
    this.restCounter = 0;
    this.growthLimitReached = false; // Initialize it
  }

  growLeafPattern() {
    const direction = Math.sign(this.pos.x - this.parent.pos.x);
    const positions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];

    // Check if ALL target positions are empty and have empty neighborhoods
    const allPositionsValid = positions.every(
      (pos) =>
        !occupancyGrid.get(pos.x, pos.y) &&
        this.checkEmptyMooreNeighborhood(pos.x, pos.y)
    );

    if (allPositionsValid) {
      this.restCounter = 0; // Reset counter on successful growth
      positions.forEach((pos) => {
        const leaf = new Leaf(pos.x, pos.y, this);
        this.children.push(leaf);
        cells.push(leaf);
      });
      this.hasGrown = true;
      this.growthLimitReached = true; // Set this when leaves are grown
    } else {
      // If any position is invalid, rest
      this.restCounter++;
      if (this.restCounter >= 10) {
        this.restCounter = 0; // Reset counter after rest period
      }
    }
  }

  update() {
    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.checkDeath();

    if (
      !this.hasGrown &&
      this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW &&
      this.restCounter === 0
    ) {
      // Only try to grow when not resting
      this.growLeafPattern();
    }

    this.updateVisuals();
  }
}

class Leaf extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF");
  }

  update() {
    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.checkDeath();
    this.updateVisuals();
  }
}

// Modified Sun class
class Sun extends Particle {
  constructor(config) {
    super(config.x || 0, config.y || 0, "SUN");
    this.sprite.tint = 0xffff00;
    this.sprite.alpha = 0.9;

    // Add aura overlay
    this.aura = new PIXI.Graphics();
    this.aura.beginFill(0xffff00, 0.5); // Yellow with 50% alpha
    this.aura.drawRect(0, 0, 3 * scaleSize, 3 * scaleSize);
    this.aura.endFill();
    this.aura.x = this.sprite.x - scaleSize;
    this.aura.y = this.sprite.y - scaleSize;
    app.stage.addChild(this.aura);

    // Apply config
    this.mode = config.mode;
    this.axis = config.axis;
    this.direction = config.direction;
  }

  distributeSunEnergy() {
    const { x: sunX, y: sunY } = this.getPosition();

    // Check 3x3 grid with wrapping
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = (sunX + dx + cols) % cols;
        const checkY = (sunY + dy + rows) % rows;

        const cell = occupancyGrid.get(checkX, checkY);
        if (cell instanceof PlantCell) {
          const energy = dx === 0 && dy === 0 ? 2 : 1;
          cell.currentEnergy = Math.min(
            cell.currentEnergy + energy,
            cell.energyCapacity
          );
        }
      }
    }
  }

  updatePosition(newX, newY) {
    super.updatePosition(newX, newY);
    // Update aura position to stay centered on sun
    this.aura.x = newX * scaleSize - scaleSize;
    this.aura.y = newY * scaleSize - scaleSize;
  }

  update() {
    let { x, y } = this.getPosition();

    // Apply basic movement
    if (this.axis === "vertical") {
      y += this.direction;
    } else {
      x += this.direction;
    }

    // Handle boundaries
    if (this.mode === "snake") {
      if (this.axis === "vertical") {
        if (y >= rows || y < 0) {
          this.direction *= -1; // Reverse direction
          x = (x + 1) % cols; // Move to next column
          y = y >= rows ? rows - 1 : 0; // Keep within bounds
        }
      } else {
        // horizontal
        if (x >= cols || x < 0) {
          this.direction *= -1; // Reverse direction
          y = (y + 1) % rows; // Move to next row
          x = x >= cols ? cols - 1 : 0; // Keep within bounds
        }
      }
    } else {
      // SWEEP MODE
      if (this.axis === "vertical") {
        if (y >= rows || y < 0) {
          x = (x + 1) % cols;
          y = this.direction === 1 ? 0 : rows - 1;
        }
      } else {
        if (x >= cols || x < 0) {
          y = (y + 1) % rows;
          x = this.direction === 1 ? 0 : cols - 1;
        }
      }
    }

    // Final position clamping
    x = Math.max(0, Math.min(x, cols - 1));
    y = Math.max(0, Math.min(y, rows - 1));

    this.updatePosition(x, y);
    this.distributeSunEnergy();
  }
}

function mainLoop() {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

  // Check if all cells are gone and restart if needed
  if (cells.length === 0) {
    console.log("\n=== Scene Reset ===\nCreating new seed in center of grid");

    // Reset core simulation parameters
    cells = [];
    occupancyGrid = new OccupancyGrid(cols, rows);
    frame = 0;

    // Create new seed in center
    const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
    cells.push(seed);
  }

  // Determine if we should update this frame
  let shouldUpdate = false;
  if (!paused) {
    if (slowMotion) {
      shouldUpdate =
        timeSinceLastUpdate >= 1000 / CONSTANTS.PERFORMANCE.SLOW_MOTION_FPS;
    } else {
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    const updatesThisFrame = fastForward ? fastForwardFactor : 1;

    for (let i = 0; i < updatesThisFrame; i++) {
      frame++;

      // Update sun first
      sun.update();

      // Then update cells (but prevent growth)
      const livingCells = cells.filter((cell) => !cell.dead);
      livingCells.forEach((cell) => {
        if (!cell.dead) {
          // TEMPORARY: Completely disable seed logic
          if (cell instanceof Seed) {
            cell.airborne = false; // Force land
            cell.age++;
            cell.updateVisuals();
            return; // Skip all other processing
          }

          cell.age++;
          cell.updateVisuals();
        }
      });
    }

    lastUpdateTime = now;
  }

  // Always update FPS counter and render
  const fps = 1000 / (now - lastRenderTime);
  lastRenderTime = now;

  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Particles: ${cells.length + 1}`; // +1 for sun (fixed position)

  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}

// Modified reset function
function resetSimulation() {
  // Clear existing cells
  cells.forEach((cell) => {
    app.stage.removeChild(cell.sprite);
    if (cell.energyText) app.stage.removeChild(cell.energyText);
  });
  cells = [];
  occupancyGrid = new OccupancyGrid(cols, rows);

  // Recreate sun with proper initial position
  if (sun) {
    app.stage.removeChild(sun.sprite);
    app.stage.removeChild(sun.aura); // Remove old aura
  }

  // Calculate initial position based on direction and axis
  let initialX = 0;
  let initialY = 0;

  if (sunConfig.mode === "snake") {
    if (sunConfig.axis === "vertical") {
      initialY = sunConfig.direction === 1 ? 0 : rows - 1;
    } else {
      initialX = sunConfig.direction === 1 ? 0 : cols - 1;
    }
  }

  sun = new Sun({
    ...sunConfig,
    x: initialX,
    y: initialY,
  });

  // Create new seed
  const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
  cells.push(seed);

  // Reset frame counter
  frame = 0;
}
