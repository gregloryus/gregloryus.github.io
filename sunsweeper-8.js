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
    AIRBORNE_STEPS: 34, // New constant for seed dispersal
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
    MOON: { r: 255, g: 255, b: 255, alpha: 1.0 }, // New color for moon
  },

  PERFORMANCE: {
    FAST_FORWARD_FACTOR: 10,
    FPS_TEXT_SIZE: 24,
    SLOW_MOTION_FPS: 6, // New constant for slow motion
    FADE_OVERLAY_ALPHA: 0.02, // New constant for fade overlay opacity
    CELESTIAL_AURA_ALPHA: 0.03, // Moon aura opacity
    SUN_AURA_ALPHA: 0.3, // Sun aura opacity (separate from moon)
  },

  SUN: {
    MOVEMENT_MODES: {
      SNAKE: "snake",
      SWEEP: "sweep",
    },
    DEFAULT_MODE: "sweep", // Change this to switch default
  },
};

// New constant: number of ticks a dying cell lingers before removal.
const DEATH_COUNTDOWN_TICKS = 100;

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter, fadeOverlay;
let rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;
let paused = false;
let slowMotion = false;
let lastUpdateTime = performance.now();
let showEnergyText = true; // New global setting
let sun, moon; // Add moon to global variables
let sunConfig = {
  mode: "sweep", // 'snake' or 'sweep'
  axis: "horizontal", // 'vertical' or 'horizontal'
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
    clearBeforeRender: false,
    preserveDrawingBuffer: true, // Ensures the drawing buffer is preserved
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Create a reusable Graphics object for the fade overlay
  fadeOverlay = new PIXI.Graphics();

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

  // Calculate total path length and moon offset
  const totalCells = cols * rows;
  const moonOffset = Math.floor(totalCells / 2);

  // Create sun first (now starts at 0,0)
  sun = new Sun(sunConfig);
  sun.updatePosition(0, 0); // Force initial position

  // Calculate moon's initial position
  let moonX = 0;
  let moonY = 0;
  let moonDirection = sunConfig.direction;

  // Simulate movement for moonOffset steps
  for (let i = 0; i < moonOffset; i++) {
    if (sunConfig.axis === "vertical") {
      moonY += moonDirection;
      if (moonY >= rows || moonY < 0) {
        if (sunConfig.mode === "snake") {
          moonDirection *= -1;
          moonX = (moonX + 1) % cols;
          moonY = moonY >= rows ? rows - 1 : 0;
        } else {
          moonX = (moonX + 1) % cols;
          moonY = moonDirection === 1 ? 0 : rows - 1;
        }
      }
    } else {
      moonX += moonDirection;
      if (moonX >= cols || moonX < 0) {
        if (sunConfig.mode === "snake") {
          moonDirection *= -1;
          moonY = (moonY + 1) % rows;
          moonX = moonX >= cols ? cols - 1 : 0;
        } else {
          moonY = (moonY + 1) % rows;
          moonX = moonDirection === 1 ? 0 : cols - 1;
        }
      }
    }
  }

  // Create moon with calculated position
  moon = new Moon({
    ...sunConfig,
    x: moonX,
    y: moonY,
    initialSteps: moonOffset,
  });

  // Create seed (now after both celestial bodies)
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
  constructor(x, y, productionParent, type) {
    super(x, y, type);
    this.children = [];
    this.isDying = false;
    this.dyingTicks = 0;
    this.age = 0;

    // --- NEW: Relationship fields ---
    // productionParent: the cell that directly produced this cell
    // physicalParent: the cell directly attached below this cell
    // seed: the root seed for this entire plant; a seed cell is its own seed.
    this.productionParent = productionParent;
    if (productionParent) {
      // Inherit the seed from the productionParent.
      this.seed = productionParent.seed;
      // Initially, set physicalParent to be the productionParent (this can be updated later).
      this.physicalParent = productionParent;
    } else {
      // For a seed cell (or if no production parent was provided), the seed is the cell itself.
      this.seed = this;
      this.physicalParent = null;
    }
    // -------------------------------

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
    this.lastEmptySpacesCount = null;
  }

  updateVisuals() {
    this.sprite.alpha = 1.0;
    if (this.energyText) {
      this.energyText.visible = false;
    }
  }

  checkEmptyMooreNeighborhood(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        const neighbor = occupancyGrid.get(nx, ny);
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false;
        }
      }
    }
    return true;
  }

  getPlantSeed() {
    return this.seed;
  }

  /**
   * Marks this cell as dying.
   * Immediately switches its texture to the dedicated DEAD (red) texture.
   */
  die() {
    if (this.isDying) return;
    this.sprite.texture = cellTextures.DYING;
    this.sprite.alpha = 1.0;
    this.isDying = true;
    this.dyingFrame = frame;
    this.dyingTicks = DEATH_COUNTDOWN_TICKS;
    this.hasPropagatedDeath = false;
  }

  // Updated processDeath() to delay neighbor propagation by one tick.
  processDeath() {
    if (
      !this.hasPropagatedDeath &&
      this.dyingTicks === DEATH_COUNTDOWN_TICKS - 1
    ) {
      this.hasPropagatedDeath = true;
      const neighbors = occupancyGrid.getMooreNeighbors(this.pos.x, this.pos.y);
      neighbors.forEach((neighbor) => {
        if (
          neighbor &&
          neighbor.getPlantSeed() === this.getPlantSeed() &&
          !neighbor.isDying
        ) {
          neighbor.die();
        }
      });
    }
    this.dyingTicks--;
    if (this.dyingTicks <= 0) {
      occupancyGrid.remove(this.pos.x, this.pos.y);
      if (this.sprite.parent) app.stage.removeChild(this.sprite);
      if (this.energyText && this.energyText.parent) {
        app.stage.removeChild(this.energyText);
      }
      if (this.extraOverlay && this.extraOverlay.parent) {
        app.stage.removeChild(this.extraOverlay);
        this.extraOverlay = null;
      }
      cells = cells.filter((cell) => cell !== this);
    }
  }

  update() {
    if (this.isDying) {
      if (frame === this.dyingFrame) {
        return;
      }
      this.processDeath();
      return;
    }
    this.age++;
    this.updateVisuals();
  }
}

class Seed extends PlantCell {
  constructor(x, y, airborne = false) {
    super(x, y, null, "SEED");
    this.airborne = airborne;
    this.stepsTaken = airborne ? 0 : CONSTANTS.ENERGY.AIRBORNE_STEPS;
    this.hasTriggeredGrowth = false;
    this.mature = false;
    this.hasReproduced = false;

    if (!this.airborne) {
      occupancyGrid.set(x, y, this);
    }

    this.genes = {
      internodeSpacing: 3,
      budGrowthLimit: 11,
      cellLifespan: CONSTANTS.ENERGY.DEFAULT_LIFESPAN,
    };
  }

  startGrowing() {
    if (!this.hasTriggeredGrowth) {
      let canGerminate = true;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx,
            ny = this.pos.y + dy;
          if (occupancyGrid.get(nx, ny)) {
            canGerminate = false;
            break;
          }
        }
        if (!canGerminate) break;
      }
      if (!canGerminate) {
        this.die();
        return;
      }
      this.hasTriggeredGrowth = true;
      this.tryCreateFirstBud();
    }
  }

  tryCreateFirstBud() {
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
    ];
    let budCreated = false;
    for (const dir of directions) {
      const newX = this.pos.x + dir.dx;
      const newY = this.pos.y + dir.dy;
      if (!occupancyGrid.get(newX, newY)) {
        const bud = new BudCell(newX, newY, this);
        bud.inheritGenes(this.genes);
        this.children.push(bud);
        cells.push(bud);
        occupancyGrid.set(newX, newY, bud);
        budCreated = true;
        break;
      }
    }
    if (!budCreated) {
      // No bud could be created.
    }
  }

  reproduce() {
    if (!this.hasReproduced) {
      this.hasReproduced = true;
      const newSeed = new Seed(this.pos.x, this.pos.y, true);
      cells.push(newSeed);
    }
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;

    if (this.airborne) {
      if (this.stepsTaken >= CONSTANTS.ENERGY.AIRBORNE_STEPS) {
        this.airborne = false;
        if (
          !occupancyGrid.get(this.pos.x, this.pos.y) &&
          this.checkNeighborsForLanding()
        ) {
          occupancyGrid.set(this.pos.x, this.pos.y, this);
        } else {
          this.die();
          return;
        }
        return;
      }
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const newX = Math.min(Math.max(0, this.pos.x + dir.dx), cols - 1);
      const newY = Math.min(Math.max(0, this.pos.y + dir.dy), rows - 1);
      this.updatePosition(newX, newY);
      this.stepsTaken++;
    }
    this.updateVisuals();
  }

  updateVisuals() {
    this.sprite.texture = cellTextures.SEED;
    this.sprite.alpha = 1.0;
    if (this.energyText) {
      this.energyText.visible = false;
    }
  }

  checkNeighborsForLanding() {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = occupancyGrid.get(this.pos.x + dx, this.pos.y + dy);
        if (neighbor instanceof PlantCell) {
          return false;
        }
      }
    }
    return true;
  }

  die() {
    if (this.isDying) return;
    this.sprite.tint = 0xff0000;
    this.sprite.alpha = 1.0;
    this.isDying = true;
    this.dyingTicks = DEATH_COUNTDOWN_TICKS;
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }

  die() {
    super.die();
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;
    this.updateVisuals();
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }

  createLeafBuds() {
    [-1, 1].forEach((dir) => {
      const newX = this.pos.x + dir;
      if (!occupancyGrid.get(newX, this.pos.y)) {
        const bud = new LeafBudCell(newX, this.pos.y, this);
        this.children.push(bud);
        cells.push(bud);
        occupancyGrid.set(newX, this.pos.y, bud);
      }
    });
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;
    this.updateVisuals();
  }
}

class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
    this.growthLimitReached = false;
    this.genes = {};
    this.restCounter = 0;
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }

  checkEmptyMooreNeighborhoodExcludingParent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (
          this.productionParent &&
          this.productionParent.pos.x === nx &&
          this.productionParent.pos.y === ny
        )
          continue;
        const neighbor = occupancyGrid.get(nx, ny);
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false;
        }
      }
    }
    return true;
  }

  die() {
    super.die();
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;
    if (!this.growthLimitReached) {
      this.grow();
    }
    if (!this.isDying) {
      this.updateVisuals();
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
    if (!occupancyGrid.get(this.pos.x, newY)) {
      if (this.checkEmptyMooreNeighborhoodExcludingParent(this.pos.x, newY)) {
        this.restCounter = 0;
        this.growthCount++;
        const oldX = this.pos.x,
          oldY = this.pos.y;
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = newY;
        this.sprite.y = this.pos.y * scaleSize;
        occupancyGrid.set(this.pos.x, this.pos.y, this);

        let newCell;
        if (this.growthCount % this.genes.internodeSpacing === 0) {
          newCell = new NodeCell(oldX, oldY, this);
          newCell.inheritGenes(this.genes);
          newCell.createLeafBuds();
        } else {
          newCell = new StemCell(oldX, oldY, this);
        }
        newCell.productionParent = this;
        newCell.seed = this.seed;
        newCell.physicalParent = this.physicalParent;
        this.physicalParent = newCell;
        if (newCell.physicalParent) {
          newCell.physicalParent.children.push(newCell);
        }
        this.children.push(newCell);

        cells.push(newCell);
        occupancyGrid.set(newCell.pos.x, newCell.pos.y, newCell);
      }
    }
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
    this.restCounter = 0;
    this.growthLimitReached = false;
  }

  checkEmptyMooreNeighborhoodExcludingParent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (
          this.physicalParent &&
          this.physicalParent.pos.x === nx &&
          this.physicalParent.pos.y === ny
        )
          continue;
        const neighbor = occupancyGrid.get(nx, ny);
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false;
        }
      }
    }
    return true;
  }

  growLeafPattern() {
    const direction = this.physicalParent
      ? Math.sign(this.pos.x - this.physicalParent.pos.x)
      : 1;
    const positions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];
    const allPositionsValid = positions.every(
      (pos) =>
        !occupancyGrid.get(pos.x, pos.y) &&
        this.checkEmptyMooreNeighborhoodExcludingParent(pos.x, pos.y)
    );
    if (allPositionsValid) {
      positions.forEach((pos) => {
        const leaf = new Leaf(pos.x, pos.y, this);
        this.children.push(leaf);
        cells.push(leaf);
        occupancyGrid.set(pos.x, pos.y, leaf);
      });
      this.hasGrown = true;
      this.growthLimitReached = true;
    } else {
      this.restCounter++;
      if (this.restCounter >= 10) {
        this.restCounter = 0;
      }
    }
  }

  die() {
    super.die();
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;
    if (!this.hasGrown && this.restCounter === 0) {
      this.growLeafPattern();
    }
    this.updateVisuals();
  }
}

class Leaf extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF");
  }

  die() {
    super.die();
  }

  update() {
    if (this.isDying) {
      this.processDeath();
      return;
    }
    this.age++;
    this.updateVisuals();
  }
}

// Modified Sun class
class Sun extends Particle {
  constructor(config) {
    super(config.x || 0, config.y || 0, "SUN");
    this.sprite.tint = 0xffff00;
    this.sprite.alpha = 0.9;

    this.aura = new PIXI.Graphics();
    this.aura.beginFill(0xffff00, CONSTANTS.PERFORMANCE.SUN_AURA_ALPHA);
    this.aura.drawRect(0, 0, 3 * scaleSize, 3 * scaleSize);
    this.aura.endFill();
    this.aura.x = this.sprite.x - scaleSize;
    this.aura.y = this.sprite.y - scaleSize;
    app.stage.addChild(this.aura);

    this.mode = config.mode;
    this.axis = config.axis;
    this.direction = config.direction;
    this.stepCount = 0;
  }

  updatePosition(newX, newY) {
    super.updatePosition(newX, newY);
    this.aura.x = newX * scaleSize - scaleSize;
    this.aura.y = newY * scaleSize - scaleSize;
  }

  update() {
    let { x, y } = this.getPosition();
    this.stepCount++;
    if (this.axis === "vertical") {
      y += this.direction;
    } else {
      x += this.direction;
    }
    if (this.mode === "snake") {
      if (this.axis === "vertical") {
        if (y >= rows || y < 0) {
          this.direction *= -1;
          x = (x + 1) % cols;
          y = y >= rows ? rows - 1 : 0;
        }
      } else {
        if (x >= cols || x < 0) {
          this.direction *= -1;
          y = (y + 1) % rows;
          x = x >= cols ? cols - 1 : 0;
        }
      }
    } else {
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
    x = Math.max(0, Math.min(x, cols - 1));
    y = Math.max(0, Math.min(y, rows - 1));
    this.updatePosition(x, y);

    const cell = occupancyGrid.get(x, y);
    if (cell instanceof Seed && !cell.airborne) {
      if (cell.hasTriggeredGrowth && !cell.mature) {
        cell.mature = true;
        cell.reproduce();
      }
    }
  }
}

class Moon extends Particle {
  constructor(config) {
    super(config.x || 0, config.y || 0, "MOON");
    this.sprite.tint = 0xffffff;
    this.sprite.alpha = 0.9;

    this.aura = new PIXI.Graphics();
    this.aura.beginFill(0xffffff, CONSTANTS.PERFORMANCE.CELESTIAL_AURA_ALPHA);
    this.aura.drawRect(0, 0, 3 * scaleSize, 3 * scaleSize);
    this.aura.endFill();
    this.aura.x = this.sprite.x - scaleSize;
    this.aura.y = this.sprite.y - scaleSize;
    app.stage.addChild(this.aura);

    this.mode = config.mode;
    this.axis = config.axis;
    this.direction = config.direction;
    this.stepCount = config.initialSteps || 0;
  }

  updatePosition(newX, newY) {
    super.updatePosition(newX, newY);
    this.aura.x = newX * scaleSize - scaleSize;
    this.aura.y = newY * scaleSize - scaleSize;
  }

  update() {
    let { x, y } = this.getPosition();
    this.stepCount++;
    if (this.axis === "vertical") {
      y += this.direction;
    } else {
      x += this.direction;
    }
    if (this.mode === "snake") {
      if (this.axis === "vertical") {
        if (y >= rows || y < 0) {
          this.direction *= -1;
          x = (x + 1) % cols;
          y = y >= rows ? rows - 1 : 0;
        }
      } else {
        if (x >= cols || x < 0) {
          this.direction *= -1;
          y = (y + 1) % rows;
          x = x >= cols ? cols - 1 : 0;
        }
      }
    } else {
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
    x = Math.max(0, Math.min(x, cols - 1));
    y = Math.max(0, Math.min(y, rows - 1));
    this.updatePosition(x, y);
    this.checkGermination();
  }

  checkGermination() {
    const currentCell = occupancyGrid.get(this.pos.x, this.pos.y);
    if (
      currentCell instanceof Seed &&
      !currentCell.airborne &&
      !currentCell.isDying
    ) {
      if (!currentCell.hasTriggeredGrowth) {
        currentCell.mature = false;
        currentCell.startGrowing();
      } else if (currentCell.mature) {
        currentCell.die();
      }
    }
  }
}

function mainLoop() {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

  if (cells.length === 0) {
    cells = [];
    occupancyGrid = new OccupancyGrid(cols, rows);
    frame = 0;
    const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
    cells.push(seed);
  }

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
      sun.update();
      moon.update();
      cells.forEach((cell) => {
        cell.update();
      });
    }
    lastUpdateTime = now;
  }

  const fps = 1000 / (now - lastRenderTime);
  lastRenderTime = now;

  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Particles: ${cells.length + 1}`;

  fadeOverlay.clear();
  fadeOverlay.beginFill(0x000000, CONSTANTS.PERFORMANCE.FADE_OVERLAY_ALPHA);
  fadeOverlay.drawRect(0, 0, app.screen.width, app.screen.height);
  fadeOverlay.endFill();
  if (!app.stage.children.includes(fadeOverlay)) {
    app.stage.addChildAt(fadeOverlay, 0);
  }
  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}

function resetSimulation() {
  cells.forEach((cell) => {
    app.stage.removeChild(cell.sprite);
    if (cell.energyText) app.stage.removeChild(cell.energyText);
  });
  cells = [];
  occupancyGrid = new OccupancyGrid(cols, rows);

  if (sun) {
    app.stage.removeChild(sun.sprite);
    app.stage.removeChild(sun.aura);
  }

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

  const totalCells = cols * rows;
  const moonOffset = Math.floor(totalCells / 2);

  let moonX = initialX;
  let moonY = initialY;
  let moonDirection = sunConfig.direction;

  for (let i = 0; i < moonOffset; i++) {
    if (sunConfig.axis === "vertical") {
      moonY += moonDirection;
      if (moonY >= rows || moonY < 0) {
        if (sunConfig.mode === "snake") {
          moonDirection *= -1;
          moonX = (moonX + 1) % cols;
          moonY = moonY >= rows ? rows - 1 : 0;
        } else {
          moonX = (moonX + 1) % cols;
          moonY = moonDirection === 1 ? 0 : rows - 1;
        }
      }
    } else {
      moonX += moonDirection;
      if (moonX >= cols || moonX < 0) {
        if (sunConfig.mode === "snake") {
          moonDirection *= -1;
          moonY = (moonY + 1) % rows;
          moonX = moonX >= cols ? cols - 1 : 0;
        } else {
          moonY = (moonY + 1) % rows;
          moonX = moonDirection === 1 ? 0 : cols - 1;
        }
      }
    }
  }

  moon = new Moon({
    ...sunConfig,
    x: moonX,
    y: moonY,
    initialSteps: moonOffset,
  });

  const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
  cells.push(seed);

  frame = 0;
}
