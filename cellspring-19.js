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
          isExtra: cell.isExtra(),
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

    occupancyGrid.set(x, y, this);

    // Energy system
    this.energyCapacity = CONSTANTS.ENERGY.DEFAULT_CAPACITY;
    this.currentEnergy = 1; // Start with 1 energy instead of half capacity
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

    this.age = 0; // Add age tracking

    // Get lifespan from genes if parent exists
    this.lifespan = parent
      ? parent.getPlantSeed().genes.cellLifespan
      : CONSTANTS.ENERGY.DEFAULT_LIFESPAN;
  }

  getPlantSeed() {
    let cell = this;
    while (cell.parent) {
      cell = cell.parent;
    }
    return cell;
  }

  isExtra() {
    return this.currentEnergy > this.energyCapacity;
  }

  collectEnergy() {
    if (this.type === "SEED") return;

    // Count empty cardinal spaces
    const emptySpaces = occupancyGrid.getCardinalNeighbors(
      this.pos.x,
      this.pos.y
    );

    // Add debug logging for a specific cell
    if (this.pos.x === 14 && this.pos.y === 10) {
      // adjust coordinates as needed
      console.log(
        `Frame ${frame}: Cell at (14,10) checking ${emptySpaces} empty spaces`
      );
    }

    // Each empty space has base collection chance
    for (let i = 0; i < emptySpaces; i++) {
      if (Math.random() < CONSTANTS.ENERGY.COLLECTION_CHANCE) {
        this.currentEnergy++;
        if (this.pos.x === 14 && this.pos.y === 10) {
          console.log(
            `Frame ${frame}: Energy collected! New energy: ${this.currentEnergy}`
          );
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
    const connections = [this.parent, ...this.children].filter(
      (cell) => cell !== null
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

  die() {
    if (this.dead) return; // Prevent multiple deaths
    this.dead = true;

    // Remove from occupancy grid
    occupancyGrid.remove(this.pos.x, this.pos.y);

    // Remove visual elements
    app.stage.removeChild(this.sprite);
    app.stage.removeChild(this.energyText);
    if (this.extraOverlay) {
      app.stage.removeChild(this.extraOverlay);
    }

    // Remove from parent's children
    if (this.parent) {
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
    }

    // Kill all children (they're now disconnected)
    this.children.forEach((child) => child.die());

    // Remove from cells array
    cells = cells.filter((cell) => cell !== this);

    // If this is a seed, check if all cells are dead
    if (this.type === "SEED") {
      const plantCells = cells.filter((cell) => cell.getPlantSeed() === this);
      if (plantCells.length === 0) {
        console.log("Plant has died completely");
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

  update() {
    // Add age check to all cell updates
    this.checkDeath();
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.updateVisuals();

    if (this.type !== "SEED") {
      // Don't age seeds
      this.age++;
    }
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
    this.genes = {
      internodeSpacing: 8,
      budGrowthLimit: 4,
      cellLifespan: CONSTANTS.ENERGY.DEFAULT_LIFESPAN, // Add lifespan to genes
    };

    // Remove energy-related properties entirely
    this.energyCapacity = 0;
    this.currentEnergy = 0;

    // Remove the energy text for seeds
    app.stage.removeChild(this.energyText);
    this.energyText = null;
  }

  // Override the visual update for seeds
  updateVisuals() {
    // Just update position and alpha, no energy display
    this.sprite.alpha = this.airborne ? 0.8 : 0.6; // Make airborne seeds slightly more visible
  }

  // Override all energy-related methods to do nothing
  collectEnergy() {}
  payMaintenanceCost() {}
  distributeEnergy() {}
  isExtra() {
    return false;
  }

  update() {
    this.age++;

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

      console.log("New seed produced!", {
        parentAge: this.age,
        parentMaturityAge: this.maturityAge,
        parentMaturitySize: this.maturitySize,
        plantSize: plantSize,
        position: { x: this.pos.x, y: this.pos.y },
      });

      // Drain energy from existing plant
      plantCells.forEach((cell) => {
        cell.currentEnergy = 1;
      });
    }

    // Continue with normal seed update
    if (this.airborne) {
      if (this.stepsTaken >= CONSTANTS.ENERGY.AIRBORNE_STEPS) {
        this.airborne = false;
        this.startGrowing();
        return;
      }

      // Random walk
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];

      const newX = Math.min(Math.max(0, this.pos.x + dir.dx), cols - 1);
      const newY = Math.min(Math.max(0, this.pos.y + dir.dy), rows - 1);

      // Update position
      occupancyGrid.remove(this.pos.x, this.pos.y);
      this.pos.x = newX;
      this.pos.y = newY;
      this.sprite.x = newX * scaleSize;
      this.sprite.y = newY * scaleSize;
      occupancyGrid.set(newX, newY, this);

      this.stepsTaken++;
    }

    this.updateVisuals();
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
    }
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }

  update() {
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.updateVisuals();
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }

  update() {
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
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
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();

    // Change growth condition to require full energy
    if (this.currentEnergy >= this.energyCapacity) {
      // Check if growth is possible in any direction
      const canGrowUp =
        this.pos.y > 0 && !occupancyGrid.get(this.pos.x, this.pos.y - 1);

      if (!canGrowUp && this.growthCount > 0) {
        console.log("Bud blocked, plant dying");
        this.getPlantSeed().die();
        return;
      }

      this.grow();
    }

    this.updateVisuals();
  }

  grow() {
    if (this.growthCount >= this.genes.budGrowthLimit) {
      if (!this.growthLimitReached) {
        console.log(
          `Bud cell at (${this.pos.x}, ${this.pos.y}) has reached its growth limit.`
        );
        this.growthLimitReached = true;
      }
      return;
    }

    const newY = this.pos.y - 1;
    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) return;

    this.growthCount++;

    // Create new cell (either node or stem)
    let newCell;
    if (
      this.growthCount > 0 &&
      this.growthCount % this.genes.internodeSpacing === 0
    ) {
      newCell = new NodeCell(this.pos.x, this.pos.y, this.parent);
      newCell.inheritGenes(this.genes);
      newCell.createLeafBuds();
    } else {
      newCell = new StemCell(this.pos.x, this.pos.y, this.parent);
    }

    // Update parent relationships
    if (this.parent) {
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(newCell);
    }
    newCell.children.push(this);
    this.parent = newCell;

    // Add to cells array
    cells.push(newCell);

    // Move bud up
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y = newY;
    this.sprite.y = this.pos.y * scaleSize;
    occupancyGrid.set(this.pos.x, this.pos.y, this);

    this.currentEnergy -= CONSTANTS.ENERGY.GROWTH_COST;
  }
}

class LeafBudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
  }

  update() {
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();

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
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();
    this.updateVisuals();
  }
}

// Common visual update function used by all cells
PlantCell.prototype.updateVisuals = function () {
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
};

function mainLoop() {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

  // Determine if we should update this frame
  let shouldUpdate = false;
  if (!paused) {
    if (slowMotion) {
      // In slow motion, update at 6 FPS
      shouldUpdate =
        timeSinceLastUpdate >= 1000 / CONSTANTS.PERFORMANCE.SLOW_MOTION_FPS;
    } else {
      // Normal speed, update every frame
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    const updatesThisFrame = fastForward ? fastForwardFactor : 1;

    for (let i = 0; i < updatesThisFrame; i++) {
      frame++;
      cells.forEach((cell) => cell.update());
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
