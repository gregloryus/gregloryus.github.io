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
    LEAF_MULTIPLIER: 1.5,
    AIRBORNE_STEPS: 16, // New constant for seed dispersal
    DEFAULT_LIFESPAN: 1000, // Default lifespan in frames
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
  },

  PERFORMANCE: {
    FAST_FORWARD_FACTOR: 10,
    FPS_TEXT_SIZE: 24,
    SLOW_MOTION_FPS: 6, // New constant for slow motion
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

  // Keep the center seed setup:
  cells = [];
  occupancyGrid = new OccupancyGrid(cols, rows);
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

class PlantCell {
  constructor(x, y, parent = null, type) {
    this.pos = { x, y };
    this.parent = parent;
    this.children = [];
    this.type = type;

    // Setup sprite
    this.sprite = new PIXI.Sprite(cellTextures[this.type]);
    this.sprite.x = Math.floor(x * scaleSize);
    this.sprite.y = Math.floor(y * scaleSize);
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);

    // Always register non-seed cells in the occupancy grid
    occupancyGrid.set(x, y, this);

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

    // Only log if the count has changed
    if (this.lastEmptySpacesCount !== emptySpaces) {
      console.log(
        `Cell at (${this.pos.x}, ${this.pos.y}) type ${this.type} found ${emptySpaces} empty spaces`
      );
      this.lastEmptySpacesCount = emptySpaces;
    }

    // Each empty space has base collection chance
    for (let i = 0; i < emptySpaces; i++) {
      if (Math.random() < CONSTANTS.ENERGY.COLLECTION_CHANCE) {
        this.currentEnergy++;
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

    // First handle excess energy - distribute ALL excess
    if (this.isExtra()) {
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
      this.die();
    }
  }

  die() {
    if (this.dead) return;

    console.log(
      `Cell at (${this.pos.x}, ${this.pos.y}) type ${this.type} dying. Stack trace:`,
      new Error().stack
    );

    // Instead of handling death locally, tell the seed to handle plant death
    const seed = this.getPlantSeed();
    if (seed) {
      seed.die();
    } else {
      // Fallback cleanup only if somehow disconnected from seed
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
  }

  updateVisuals() {
    const energyRatio = this.currentEnergy / this.energyCapacity;
    this.sprite.alpha = 0.6 + Math.min(energyRatio, 1) * 0.4;

    const percentage = (this.currentEnergy / this.energyCapacity) * 100;
    this.energyText.text =
      percentage >= 100 ? "*" : Math.floor(percentage / 10).toString();
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;

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
}

class Seed {
  constructor(x, y) {
    this.pos = { x, y };
    this.parent = null;
    this.children = [];
    this.type = "SEED";
    this.airborne = true;
    this.stepsTaken = 0;
    this.age = 0;
    this.maturityAge = null;
    this.maturitySize = null;
    this.dead = false;

    // Setup sprite (but don't register in occupancy grid yet)
    this.sprite = new PIXI.Sprite(cellTextures[this.type]);
    this.sprite.x = Math.floor(x * scaleSize);
    this.sprite.y = Math.floor(y * scaleSize);
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);

    this.genes = {
      internodeSpacing: 8,
      budGrowthLimit: 4,
      cellLifespan: CONSTANTS.ENERGY.DEFAULT_LIFESPAN,
    };
  }

  getPlantSeed() {
    return this; // Seeds always return themselves
  }

  canReproduce() {
    // Get all non-seed cells belonging to this plant
    const plantCells = cells.filter(
      (cell) => cell.getPlantSeed() === this && cell.type !== "SEED"
    );
    // Check if ALL cells are extra energized
    return plantCells.length > 1 && plantCells.every((cell) => cell.isExtra());
  }

  startGrowing() {
    const budPos = { x: this.pos.x, y: this.pos.y - 1 };
    if (!occupancyGrid.get(budPos.x, budPos.y)) {
      const bud = new BudCell(budPos.x, budPos.y, this);
      bud.inheritGenes(this.genes);
      this.children.push(bud);
      cells.push(bud);

      console.log(
        `Seed at (${this.pos.x}, ${this.pos.y}) creating bud at (${budPos.x}, ${budPos.y})`
      );
    } else {
      // If blocked from growing, the seed should die
      this.die();
    }
  }

  update() {
    if (this.dead) return; // Early return if dead

    this.age++;

    // Handle airborne movement
    if (this.airborne) {
      if (this.stepsTaken >= CONSTANTS.ENERGY.AIRBORNE_STEPS) {
        this.airborne = false;
        // Only check occupancy and register when landing
        if (!occupancyGrid.get(this.pos.x, this.pos.y)) {
          occupancyGrid.set(this.pos.x, this.pos.y, this);
          this.startGrowing();
        } else {
          this.die();
          return; // Stop processing immediately
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

      // console.log("New seed produced!", {
      //   parentAge: this.age,
      //   parentMaturityAge: this.maturityAge,
      //   parentMaturitySize: this.maturitySize,
      //   plantSize: plantSize,
      //   position: { x: this.pos.x, y: this.pos.y },
      // });

      // Drain energy from existing plant
      plantCells.forEach((cell) => {
        cell.currentEnergy = 1;
      });
    }

    if (!this.dead) {
      // Only update visuals if still alive
      this.updateVisuals();
    }
  }

  updateVisuals() {
    this.sprite.alpha = this.airborne ? 0.8 : 0.6;
  }

  die() {
    if (this.dead) return;

    console.log(
      `Plant dying at (${this.pos.x}, ${this.pos.y}). Stack trace:`,
      new Error().stack
    );

    // Immediately mark all plant cells as dead to prevent further updates
    const allPlantCells = cells.filter((cell) => cell.getPlantSeed() === this);
    console.log(`Found ${allPlantCells.length} cells to clean up`);

    allPlantCells.forEach((cell) => (cell.dead = true));

    // Remove from occupancy grid if landed
    if (!this.airborne) {
      occupancyGrid.remove(this.pos.x, this.pos.y);
    }

    // Remove visual elements
    app.stage.removeChild(this.sprite);

    // Clean up all cells belonging to this plant
    allPlantCells.forEach((cell) => {
      if (cell !== this) {
        // Skip seed since we're already handling it
        // Remove from occupancy grid
        occupancyGrid.remove(cell.pos.x, cell.pos.y);

        // Remove all visual elements
        app.stage.removeChild(cell.sprite);
        app.stage.removeChild(cell.energyText);
        if (cell.extraOverlay) {
          app.stage.removeChild(cell.extraOverlay);
          cell.extraOverlay = null;
        }

        // Clear references
        cell.children = [];
        cell.parent = null;
      }
    });

    // Remove all cells from the global cells array in one operation
    cells = cells.filter((cell) => !allPlantCells.includes(cell));

    this.dead = true;
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
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }

  update() {
    if (this.dead) return; // Early return if dead

    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();

    // First check if we can grow
    if (this.currentEnergy >= this.energyCapacity) {
      const canGrowUp =
        this.pos.y > 0 && !occupancyGrid.get(this.pos.x, this.pos.y - 1);

      if (!canGrowUp && this.growthCount > 0) {
        console.log(
          `Bud at (${this.pos.x}, ${this.pos.y}) blocked, plant dying. Growth count: ${this.growthCount}`
        );
        this.getPlantSeed().die();
        return; // Stop processing immediately
      }

      this.grow();
    }

    // Only check death if we haven't already died from being blocked
    if (!this.dead) {
      this.checkDeath();
      if (!this.dead) {
        // Only update visuals if still alive
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
    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) return;

    this.growthCount++;

    // Store old position
    const oldX = this.pos.x;
    const oldY = this.pos.y;

    // 1. First move the bud up
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y = newY;
    this.sprite.y = this.pos.y * scaleSize;
    occupancyGrid.set(this.pos.x, this.pos.y, this);

    // 2. Create new cell in old position
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

    // 3. Update all parent/child relationships
    if (this.parent) {
      // Remove bud from old parent's children
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      // Add new cell as child of old parent
      this.parent.children.push(newCell);
    }

    // Set new cell's parent (this was missing before)
    newCell.parent = this.parent;

    // Make new cell the bud's parent
    this.parent = newCell;
    // Add bud as child of new cell
    newCell.children.push(this);

    cells.push(newCell);
    this.currentEnergy -= CONSTANTS.ENERGY.GROWTH_COST;
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
  }

  update() {
    this.age++;
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.checkDeath();

    if (
      !this.hasGrown &&
      this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW
    ) {
      this.growLeafPattern();
    }

    this.updateVisuals();
  }

  growLeafPattern() {
    const direction = Math.sign(this.pos.x - this.parent.pos.x);
    const positions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];

    positions.forEach((pos) => {
      if (!occupancyGrid.get(pos.x, pos.y)) {
        const leaf = new Leaf(pos.x, pos.y, this);
        this.children.push(leaf);
        cells.push(leaf);
      }
    });

    this.hasGrown = true;
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

function mainLoop() {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

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

      // Create a snapshot of living cells before updates
      const livingCells = cells.filter((cell) => !cell.dead);

      // Update only those cells that were alive at start of frame
      livingCells.forEach((cell) => {
        if (!cell.dead) {
          // Double-check in case cell died during this frame
          cell.update();
        }
      });
    }

    lastUpdateTime = now;
  }

  // Always update FPS counter and render
  const fps = 1000 / (now - lastRenderTime);
  lastRenderTime = now;

  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Cells: ${cells.length}`;

  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}
