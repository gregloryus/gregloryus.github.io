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
  constructor(x, y, parent, type) {
    super(x, y, type);
    this.parent = parent;
    this.children = [];
    // All energy-related properties removed
    this.dead = false;
    this.age = 0;
    this.lifespan = parent
      ? parent.getPlantSeed().genes.cellLifespan
      : CONSTANTS.ENERGY.DEFAULT_LIFESPAN;

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

    // Add tracking for last empty spaces count
    this.lastEmptySpacesCount = null;
  }

  updateVisuals() {
    // Always set full opacity and hide any energy text.
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
    let cell = this;
    while (cell.parent) {
      cell = cell.parent;
    }
    return cell;
  }

  // ADD A COMMON die() METHOD
  die() {
    if (this.dead) return;
    console.log(`🌑 Moon killed plant at (${this.pos.x},${this.pos.y})`);
    this.sprite.tint = 0xff0000;
    this.sprite.alpha = 1.0;
    this.dead = true;
    // Propagate death to children.
    this.children.forEach((child) => {
      if (child && typeof child.die === "function" && !child.dead) {
        child.die();
      } else {
        console.log("Child", child, "does not have die() method");
      }
    });
    setTimeout(() => {
      occupancyGrid.remove(this.pos.x, this.pos.y);
      if (this.sprite.parent) {
        app.stage.removeChild(this.sprite);
      }
      if (this.energyText && this.energyText.parent) {
        app.stage.removeChild(this.energyText);
      }
      cells = cells.filter((cell) => cell !== this);
      console.log(
        `Plant at (${this.pos.x},${this.pos.y}) has been removed after death.`
      );
    }, 100);
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

    // For landed seeds, add to the occupancy grid immediately.
    if (!this.airborne) {
      occupancyGrid.set(x, y, this);
      console.log(`📍 Seed registered in grid at (${x},${y})`);
    }
    console.log(`🌰 Seed created at (${x},${y}) - Landed: ${!this.airborne}`);

    this.genes = {
      internodeSpacing: 3,
      budGrowthLimit: 11,
      cellLifespan: CONSTANTS.ENERGY.DEFAULT_LIFESPAN,
    };
  }

  startGrowing() {
    if (!this.hasTriggeredGrowth) {
      // Check immediate Moore neighborhood (without excluding any neighbors).
      let canGerminate = true;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx,
            ny = this.pos.y + dy;
          if (occupancyGrid.get(nx, ny)) {
            canGerminate = false;
            console.log(
              `Seed at (${this.pos.x},${this.pos.y}) found neighbor at (${nx},${ny}) and cannot germinate.`
            );
            break;
          }
        }
        if (!canGerminate) break;
      }
      if (!canGerminate) {
        this.die();
        return;
      }

      console.log(`🌿 Seed at (${this.pos.x},${this.pos.y}) started growing`);
      this.hasTriggeredGrowth = true;
      this.tryCreateFirstBud();
    } else {
      console.log(
        `Seed at (${this.pos.x},${this.pos.y}) already triggered growth`
      );
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
        console.log(`🌱 Creating first bud at (${newX},${newY})`);
        const bud = new BudCell(newX, newY, this);
        // Inherit the seed's genes so that later growth uses the correct internode and bud limits.
        bud.inheritGenes(this.genes);
        this.children.push(bud);
        cells.push(bud);
        occupancyGrid.set(newX, newY, bud);
        budCreated = true;
        break;
      } else {
        console.log(
          `Cannot create bud at (${newX}, ${newY}); blocked by:`,
          occupancyGrid.get(newX, newY)
        );
      }
    }
    if (!budCreated) {
      console.log(
        `Seed at (${this.pos.x},${this.pos.y}) could not create a bud in any direction.`
      );
    }
  }

  reproduce() {
    if (!this.hasReproduced) {
      this.hasReproduced = true;
      console.log(`Seed at (${this.pos.x},${this.pos.y}) reproduced.`);
      const newSeed = new Seed(this.pos.x, this.pos.y, true);
      cells.push(newSeed);
    }
  }

  update() {
    if (this.dead) return;
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
    if (this.dead) return;
    console.log(`🌑 Moon killed plant at (${this.pos.x},${this.pos.y})`);
    this.sprite.tint = 0xff0000;
    this.sprite.alpha = 1.0;
    this.dead = true;
    // Instruct all children to die as well.
    this.children.forEach((child) => {
      if (child && !child.dead) {
        child.die();
      }
    });
    setTimeout(() => {
      occupancyGrid.remove(this.pos.x, this.pos.y);
      app.stage.removeChild(this.sprite);
      if (this.energyText) app.stage.removeChild(this.energyText);
      cells = cells.filter((cell) => cell !== this);
      console.log(
        `Plant at (${this.pos.x},${this.pos.y}) has been removed after death.`
      );
    }, 100);
  }
}

class StemCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "STEM");
  }

  update() {
    this.age++;
    this.updateVisuals();
  }
}

class NodeCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "NODE");
  }

  update() {
    this.age++;
    this.updateVisuals();
  }

  createLeafBuds() {
    [-1, 1].forEach((dir) => {
      const newX = this.pos.x + dir;
      if (!occupancyGrid.get(newX, this.pos.y)) {
        console.log(`🌿 Creating leaf bud at (${newX},${this.pos.y})`);
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
    this.genes = {}; // Will be set via inheritGenes.
    this.restCounter = 0;
  }

  inheritGenes(parentGenes) {
    this.genes = { ...parentGenes };
  }

  // Helper method modified to include boundary checks
  checkEmptyMooreNeighborhoodExcludingParent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx,
          ny = y + dy;

        // Check boundaries. If out-of-bound, skip the check.
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

        // Skip checking the parent's position.
        if (this.parent && this.parent.pos.x === nx && this.parent.pos.y === ny)
          continue;

        const neighbor = occupancyGrid.get(nx, ny);
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false;
        }
      }
    }
    return true;
  }

  update() {
    if (this.dead) return;
    this.age++;
    if (!this.growthLimitReached) {
      this.grow();
    }
    if (!this.dead) {
      this.updateVisuals();
    }
  }

  grow() {
    if (this.growthCount >= this.genes.budGrowthLimit) {
      if (!this.growthLimitReached) {
        console.log(`🛑 Growth limit reached at (${this.pos.x},${this.pos.y})`);
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
        // Move bud upward.
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = newY;
        this.sprite.y = this.pos.y * scaleSize;
        occupancyGrid.set(this.pos.x, this.pos.y, this);
        let newCell;
        // Every internodeSpacing steps, create a NodeCell that also spawns leaf buds.
        if (this.growthCount % this.genes.internodeSpacing === 0) {
          newCell = new NodeCell(this.pos.x, oldY, this.parent);
          newCell.inheritGenes(this.genes);
          newCell.createLeafBuds();
        } else {
          newCell = new StemCell(oldX, oldY, this.parent);
        }
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

  // Helper: Check empty Moore neighborhood (with boundaries) excluding the parent's cell.
  checkEmptyMooreNeighborhoodExcludingParent(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx,
          ny = y + dy;

        // Boundary checks: only check if (nx, ny) is within the grid.
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

        // Skip checking the parent's position.
        if (this.parent && this.parent.pos.x === nx && this.parent.pos.y === ny)
          continue;

        const neighbor = occupancyGrid.get(nx, ny);
        // Allow neighboring cells as long as they share the same seed.
        if (neighbor && neighbor.getPlantSeed() !== this.getPlantSeed()) {
          return false;
        }
      }
    }
    return true;
  }

  growLeafPattern() {
    const direction = Math.sign(this.pos.x - this.parent.pos.x);
    // The intended positions for leaves relative to the leaf bud.
    const positions = [
      { x: this.pos.x, y: this.pos.y - 1 },
      { x: this.pos.x + direction, y: this.pos.y },
      { x: this.pos.x + direction, y: this.pos.y - 1 },
    ];

    // Check that every target position is empty and that each target's Moore neighborhood is clear (excluding parent's cell).
    const allPositionsValid = positions.every(
      (pos) =>
        !occupancyGrid.get(pos.x, pos.y) &&
        this.checkEmptyMooreNeighborhoodExcludingParent(pos.x, pos.y)
    );

    if (allPositionsValid) {
      positions.forEach((pos) => {
        console.log(`🌿 Creating leaf at (${pos.x},${pos.y})`);
        // IMPORTANT: Create a Leaf particle, not a LeafBudCell.
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
        this.restCounter = 0; // Reset counter after the rest period.
      }
    }
  }

  update() {
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

  update() {
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

    // Create aura overlay (using the sun aura constant if desired)
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
    // Keep aura in sync
    this.aura.x = newX * scaleSize - scaleSize;
    this.aura.y = newY * scaleSize - scaleSize;
  }

  update() {
    let { x, y } = this.getPosition();
    this.stepCount++;

    // Basic movement logic (same as before)
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
      // SWEEP mode
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

    // NEW: Instead of distributing energy, check for a landed seed.
    const cell = occupancyGrid.get(x, y);
    if (cell instanceof Seed && !cell.airborne) {
      // If seed has already sprouted then the Sun promotes maturation.
      if (cell.hasTriggeredGrowth && !cell.mature) {
        cell.mature = true;
        cell.reproduce(); // Trigger seed reproduction (spawns a new airborne seed)
        console.log(`☀️ Sun matured seed at (${x},${y})`);
      }
    }
  }
}

class Moon extends Particle {
  constructor(config) {
    super(config.x || 0, config.y || 0, "MOON");
    this.sprite.tint = 0xffffff;
    this.sprite.alpha = 0.9;

    // Add aura overlay
    this.aura = new PIXI.Graphics();
    this.aura.beginFill(0xffffff, CONSTANTS.PERFORMANCE.CELESTIAL_AURA_ALPHA);
    this.aura.drawRect(0, 0, 3 * scaleSize, 3 * scaleSize);
    this.aura.endFill();
    this.aura.x = this.sprite.x - scaleSize;
    this.aura.y = this.sprite.y - scaleSize;
    app.stage.addChild(this.aura);

    // Apply config
    this.mode = config.mode;
    this.axis = config.axis;
    this.direction = config.direction;
    this.stepCount = config.initialSteps || 0; // Track total steps
  }

  updatePosition(newX, newY) {
    super.updatePosition(newX, newY);
    this.aura.x = newX * scaleSize - scaleSize;
    this.aura.y = newY * scaleSize - scaleSize;
  }

  update() {
    let { x, y } = this.getPosition();
    this.stepCount++;

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
      !currentCell.dead
    ) {
      if (!currentCell.hasTriggeredGrowth) {
        console.log(`🌱 Moon germinated seed at (${this.pos.x},${this.pos.y})`);
        currentCell.mature = false; // Initialize mature flag
        currentCell.startGrowing();
      } else if (currentCell.mature) {
        console.log(
          `☠️ Moon killing MATURE plant at (${this.pos.x},${this.pos.y})`
        );
        currentCell.die();
      }
    }
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
      sun.update();
      moon.update(); // Add moon update
      const livingCells = cells.filter((cell) => !cell.dead);
      livingCells.forEach((cell) => {
        if (!cell.dead) {
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
  countText.text = `Particles: ${cells.length + 1}`; // +1 for sun (fixed position)

  // --- FADE OVERLAY CODE ---
  fadeOverlay.clear();
  fadeOverlay.beginFill(0x000000, CONSTANTS.PERFORMANCE.FADE_OVERLAY_ALPHA);
  fadeOverlay.drawRect(0, 0, app.screen.width, app.screen.height);
  fadeOverlay.endFill();
  // Ensure the overlay is at the bottom of the display list:
  if (!app.stage.children.includes(fadeOverlay)) {
    app.stage.addChildAt(fadeOverlay, 0);
  }
  // --- END FADE OVERLAY CODE ---

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

  // Calculate total path length and moon offset
  const totalCells = cols * rows;
  const moonOffset = Math.floor(totalCells / 2);

  // Calculate moon's initial position by simulating sun movement
  let moonX = initialX;
  let moonY = initialY;
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

  moon = new Moon({
    ...sunConfig,
    x: moonX,
    y: moonY,
    initialSteps: moonOffset,
  });

  // Create new seed
  const seed = new Seed(Math.floor(cols / 2), Math.floor(rows / 2));
  cells.push(seed);

  // Reset frame counter
  frame = 0;
}
