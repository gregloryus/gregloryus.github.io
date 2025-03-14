// CONSTANTS
const CONSTANTS = {
  // Growth parameters
  GROWTH: {
    BRANCH_CHANCE: 0.01, // 1% chance to branch on diagonal
    LEAF_CHANCE: 0.05, // 5% chance to create a leaf bud
    DIAGONAL_GROWTH_WEIGHT: 0.1, // % chance to grow diagonally vs straight up
    BUD_GROWTH_DELAY: 5, // Ticks before stem can produce leaf buds
    TICK_INTERVAL: 100, // Milliseconds between ticks in play mode
  },

  // Visual parameters
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 },
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 },
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 },
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 },
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 },
    GLOW: { r: 255, g: 255, b: 0, alpha: 0.0 },
  },

  SCALE_SIZE: 8, // Size of each cell in pixels
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fpsText, countText;
let paused = true; // Start paused by default
let tickInterval;
let activeGlows = []; // Track active glow overlays

// Initialize global variables
idCounter = 1;
frame = 0;

// Number of starter seeds
const NUM_STARTER_SEEDS = 1;

function addInitialSeeds(numSeeds) {
  const placedPositions = new Set();

  for (let i = 0; i < numSeeds; i++) {
    let attempts = 0;
    let x, y;

    // Find empty position with no neighbors
    do {
      x = Math.floor(Math.random() * cols);
      y = Math.floor(rows - 1 - Math.floor(Math.random() * 5)); // Place near bottom
      attempts++;
    } while (
      (occupancyGrid.get(x, y) ||
        hasNeighbors(x, y) ||
        placedPositions.has(`${x},${y}`)) &&
      attempts < 1000
    );

    if (attempts < 1000) {
      const seed = new Seed(x, y);
      cells.push(seed);
      occupancyGrid.set(x, y, seed);
      placedPositions.add(`${x},${y}`);
    }
  }

  function hasNeighbors(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (occupancyGrid.get(x + dx, y + dy)) return true;
      }
    }
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    clearBeforeRender: true,
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
  const textStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  fpsText = new PIXI.Text("Paused", textStyle);
  countText = new PIXI.Text("Cells: 0", textStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  countText.x = 10;
  countText.y = 40;
  app.stage.addChild(fpsText);
  app.stage.addChild(countText);

  // Core simulation parameters
  scaleSize = CONSTANTS.SCALE_SIZE;
  cols = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);
  cells = [];

  // Initialize occupancy grid
  occupancyGrid = new OccupancyGrid(cols, rows);

  // Create seed
  addInitialSeeds(NUM_STARTER_SEEDS);

  // Log world details
  console.log(`World initialized:
  - Dimensions: ${cols}x${rows} cells
  - Cell size: ${scaleSize}px`);

  // Start paused but render first frame
  render();

  // Add event listeners
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      // Spacebar - advance one tick
      if (paused) {
        advanceTick();
      }
      e.preventDefault(); // Prevent page scrolling
    }
    if (e.key === "p" || e.key === "P") {
      // P - toggle pause
      paused = !paused;
      if (!paused) {
        startTickInterval();
        fpsText.text = "Running";
      } else {
        clearInterval(tickInterval);
        fpsText.text = "Paused";
      }
    }
  });

  // Add tap/click listener to advance one tick
  app.view.addEventListener("click", () => {
    if (paused) {
      advanceTick();
    }
  });
});

function startTickInterval() {
  clearInterval(tickInterval); // Clear any existing interval
  tickInterval = setInterval(() => {
    advanceTick();
  }, CONSTANTS.GROWTH.TICK_INTERVAL);
}

function advanceTick() {
  frame++;
  cells.forEach((cell) => cell.update());
  render();
}

function render() {
  countText.text = `Cells: ${cells.length}`;
  app.renderer.render(app.stage);
}

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

  // Get all neighbors
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

  // Check if all Moore neighborhood cells are empty
  isEmptyMooreNeighborhood(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        if (this.get(nx, ny)) return false;
      }
    }
    return true;
  }
}

// Base class for all particles
class Particle {
  constructor(x, y, textureKey) {
    this.id = idCounter++;
    this.pos = { x, y };

    // Visual setup
    this.sprite = new PIXI.Sprite(cellTextures[textureKey]);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);

    // Create glow effect
    this.createGlow();
  }

  createGlow() {
    // Create glow for 3x3 area
    this.glowOverlays = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = this.pos.x + dx;
        const ny = this.pos.y + dy;

        // Skip positions outside the grid
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;

        // Only create glow for empty spaces
        if (!occupancyGrid.get(nx, ny)) {
          const glow = new PIXI.Graphics();
          const { r, g, b, alpha } = CONSTANTS.COLORS.GLOW;
          glow.beginFill(rgbToHex(r, g, b), alpha);
          glow.drawRect(0, 0, scaleSize, scaleSize);
          glow.endFill();
          glow.x = nx * scaleSize;
          glow.y = ny * scaleSize;

          app.stage.addChildAt(glow, 0); // Add behind plants
          this.glowOverlays.push(glow);
          activeGlows.push(glow);
        }
      }
    }
  }

  updateGlow() {
    // Remove old glows
    if (this.glowOverlays) {
      this.glowOverlays.forEach((glow) => {
        if (glow.parent) {
          app.stage.removeChild(glow);
          activeGlows = activeGlows.filter((g) => g !== glow);
        }
      });
    }

    // Create new glows
    this.createGlow();
  }

  // Common interface methods
  getPosition() {
    return this.pos;
  }

  updatePosition(newX, newY) {
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.x = newX;
    this.pos.y = newY;
    this.sprite.x = newX * scaleSize;
    this.sprite.y = newY * scaleSize;
    occupancyGrid.set(newX, newY, this);
    this.updateGlow();
  }

  // To be overridden by subclasses
  update() {
    throw new Error("Update method must be implemented by subclass");
  }

  // Helper function to convert RGB values to hex
  rgbToHex(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }
}

class Seed extends Particle {
  constructor(x, y) {
    super(x, y, "SEED");
    this.hasGerminated = false;
    occupancyGrid.set(x, y, this);
    this.lastLeafSide = 0; // 0 = none, -1 = left, 1 = right
  }

  update() {
    if (
      !this.hasGerminated &&
      occupancyGrid.isEmptyMooreNeighborhood(this.pos.x, this.pos.y)
    ) {
      this.germinate();
    }
  }

  germinate() {
    const newY = this.pos.y - 1; // Bud appears directly above seed

    if (newY >= 0 && !occupancyGrid.get(this.pos.x, newY)) {
      // Create bud above the seed
      const bud = new Bud(this.pos.x, newY, this);
      cells.push(bud);
      occupancyGrid.set(bud.pos.x, bud.pos.y, bud);
      this.hasGerminated = true;
    }
  }
}

class Bud extends Particle {
  constructor(x, y, parent) {
    super(x, y, "BUD");
    this.parent = parent;
    this.growthTick = 0;
    this.firstMove = parent instanceof Seed; // Track if this is the first move from seed
  }

  update() {
    this.growthTick++;
    this.grow();
  }

  grow() {
    let directions;

    // For the first move from a seed, only move straight up
    if (this.firstMove) {
      directions = [{ dx: 0, dy: -1 }]; // Only up
      this.firstMove = false;
    } else {
      // Determine growth direction based on probabilities
      if (Math.random() < CONSTANTS.GROWTH.DIAGONAL_GROWTH_WEIGHT) {
        // Favor diagonal growth
        directions = [
          { dx: -1, dy: -1 }, // Up-left
          { dx: 1, dy: -1 }, // Up-right
          { dx: 0, dy: -1 }, // Up (least priority)
        ];
      } else {
        // Favor upward growth
        directions = [
          { dx: 0, dy: -1 }, // Up
          { dx: -1, dy: -1 }, // Up-left
          { dx: 1, dy: -1 }, // Up-right
        ];
      }
    }

    let moved = false;
    let oldX = this.pos.x;
    let oldY = this.pos.y;

    // Try each direction until one works
    for (const dir of directions) {
      const newX = this.pos.x + dir.dx;
      const newY = this.pos.y + dir.dy;

      // Check if position is valid and empty
      if (
        newX >= 0 &&
        newX < cols &&
        newY >= 0 &&
        newY < rows &&
        !occupancyGrid.get(newX, newY)
      ) {
        // Move bud to new position
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.x = newX;
        this.pos.y = newY;
        this.sprite.x = newX * scaleSize;
        this.sprite.y = newY * scaleSize;
        occupancyGrid.set(newX, newY, this);
        this.updateGlow();

        // Create stem in old position
        const stem = new Stem(oldX, oldY, this);
        cells.push(stem);
        occupancyGrid.set(stem.pos.x, stem.pos.y, stem);

        // Check for branching in opposite diagonal
        this.checkForBranching(oldX, oldY, dir);

        moved = true;
        break;
      }
    }

    // If can't move in any direction, bud has nowhere to go
    if (!moved) {
      // Convert to stem
      occupancyGrid.remove(this.pos.x, this.pos.y);
      const stem = new Stem(this.pos.x, this.pos.y, this);
      cells.push(stem);
      occupancyGrid.set(stem.pos.x, stem.pos.y, stem);

      // Remove bud
      if (this.sprite.parent) {
        app.stage.removeChild(this.sprite);
      }
      this.glowOverlays.forEach((glow) => {
        if (glow.parent) {
          app.stage.removeChild(glow);
          activeGlows = activeGlows.filter((g) => g !== glow);
        }
      });
      cells = cells.filter((cell) => cell !== this);
    }
  }

  checkForBranching(stemX, stemY, growthDir) {
    // Only branch if we grew diagonally
    if (growthDir.dx === 0) return;

    // 1% chance to branch in the opposite diagonal
    if (Math.random() <= CONSTANTS.GROWTH.BRANCH_CHANCE) {
      const oppositeDx = -growthDir.dx;
      const branchX = stemX + oppositeDx;
      const branchY = stemY - 1;

      // Check if the position is valid and empty
      if (
        branchX >= 0 &&
        branchX < cols &&
        branchY >= 0 &&
        branchY < rows &&
        !occupancyGrid.get(branchX, branchY)
      ) {
        // Create new bud at the branch position
        const branchBud = new Bud(branchX, branchY, this);
        cells.push(branchBud);
        occupancyGrid.set(branchX, branchY, branchBud);
      }
    }
  }
}

class Stem extends Particle {
  constructor(x, y, parent) {
    super(x, y, "STEM");
    this.parent = parent;
    this.budDistance = 0;
    this.hasCheckedForLeaves = false;
    this.creationFrame = frame;

    // Find the root seed for alternating leaf sides
    this.rootSeed = this.findRootSeed(parent);
  }

  findRootSeed(parent) {
    // Traverse up the parent chain to find the seed
    if (!parent) return null;
    if (parent instanceof Seed) return parent;
    return this.findRootSeed(parent.parent);
  }

  update() {
    // Check if enough time has passed to consider leaf growth
    if (
      !this.hasCheckedForLeaves &&
      frame - this.creationFrame >= CONSTANTS.GROWTH.BUD_GROWTH_DELAY
    ) {
      this.checkForLeafGrowth();
      this.hasCheckedForLeaves = true;
    }
  }

  checkForLeafGrowth() {
    if (!this.rootSeed) return;

    // Get the next side to grow a leaf (alternate sides)
    const nextLeafSide = this.rootSeed.lastLeafSide === 1 ? -1 : 1;

    // Position based on the next leaf side
    const leafX = this.pos.x + nextLeafSide;
    const leafY = this.pos.y;

    // Check if position is valid and empty
    if (
      leafX >= 0 &&
      leafX < cols &&
      leafY >= 0 &&
      leafY < rows &&
      !occupancyGrid.get(leafX, leafY)
    ) {
      // 5% chance to create a leaf bud
      if (Math.random() <= CONSTANTS.GROWTH.LEAF_CHANCE) {
        const leafBud = new LeafBud(leafX, leafY, this);
        cells.push(leafBud);
        occupancyGrid.set(leafX, leafY, leafBud);

        // Update the last leaf side on the root seed
        this.rootSeed.lastLeafSide = nextLeafSide;
      }
    }
  }
}

class LeafBud extends Particle {
  constructor(x, y, parent, isSecondary = false) {
    super(x, y, "LEAF_BUD");
    this.parent = parent;
    this.hasGrown = false;
    this.isSecondary = isSecondary; // Track if this is a primary or secondary bud

    // Direction is based on position relative to stem
    this.direction = Math.sign(this.pos.x - this.findStem().pos.x); // -1 for left, 1 for right
  }

  // Find the stem this leaf is attached to
  findStem() {
    if (this.parent instanceof Stem) {
      return this.parent;
    } else if (
      this.parent instanceof LeafBud &&
      this.parent.parent instanceof Stem
    ) {
      return this.parent.parent;
    }
    return this.parent; // Fallback
  }

  update() {
    if (!this.hasGrown) {
      this.growLeaf();
    }
  }

  growLeaf() {
    // Define growth positions based on direction and type
    const positions = [];
    const x = this.pos.x;
    const y = this.pos.y;

    // Position 1: Directly above
    positions.push({
      x: x,
      y: y - 1,
      type: "LEAF",
    });

    // Position 2: Directly away from stem
    positions.push({
      x: x + this.direction,
      y: y,
      type: "LEAF",
    });

    // Position 3: Diagonally up and away from stem
    positions.push({
      x: x + this.direction,
      y: y - 1,
      type: this.isSecondary ? "LEAF" : "LEAF_BUD", // Secondary buds make leaves, primary makes another bud
    });

    // Check if all positions are valid and empty
    let canGrow = true;
    for (const pos of positions) {
      if (
        pos.x < 0 ||
        pos.x >= cols ||
        pos.y < 0 ||
        pos.y >= rows ||
        occupancyGrid.get(pos.x, pos.y)
      ) {
        canGrow = false;
        break;
      }
    }

    // If all positions are valid, create the new cells
    if (canGrow) {
      for (const pos of positions) {
        if (pos.type === "LEAF") {
          const leaf = new Leaf(pos.x, pos.y, this);
          cells.push(leaf);
          occupancyGrid.set(pos.x, pos.y, leaf);
        } else {
          // Create secondary leaf bud
          const leafBud = new LeafBud(pos.x, pos.y, this, true);
          cells.push(leafBud);
          occupancyGrid.set(pos.x, pos.y, leafBud);
        }
      }
      this.hasGrown = true;
    }
  }
}

class Leaf extends Particle {
  constructor(x, y, parent) {
    super(x, y, "LEAF");
    this.parent = parent;
  }

  update() {
    // Leaves are static once created
  }
}

// Helper function for RGB to hex conversion
function rgbToHex(r, g, b) {
  return (r << 16) + (g << 8) + b;
}
