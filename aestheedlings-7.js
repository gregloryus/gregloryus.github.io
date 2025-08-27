// CONSTANTS
const CONSTANTS = {
  // Growth parameters
  GROWTH: {
    BRANCH_CHANCE: 0.5, // Increased for more branching
    LEAF_CHANCE: 0.9, // 80% chance to create a leaf bud
    DIAGONAL_GROWTH_WEIGHT: 0.25, // Lowered for less diagonal growth
    BUD_GROWTH_DELAY: 2, // More frequent leaves
    BRANCH_BUD_DELAY_MIN: 10, // Minimum delay for branch buds before growing
    BRANCH_BUD_DELAY_MAX: 30, // Maximum delay for branch buds (10 + 0-20 random)
    TICK_INTERVAL: 40, // Milliseconds between ticks in play mode
    TENDENCY_CHANGE_CHANCE: 0.08, // 8% chance to flip directional bias
    BUD_SIZE_LIMIT_MIN: 40, // Minimum particles a bud can create before maturing
    BUD_SIZE_LIMIT_MAX: 144, // Maximum particles a bud can create before maturing
  },

  // Visual parameters
  COLORS: {
    SEED: { r: 220, g: 110, b: 55, alpha: 1.0 },
    BUD: { r: 180, g: 240, b: 160, alpha: 1.0 },
    STEM: { r: 10, g: 100, b: 10, alpha: 1.0 },
    LEAF_BUD: { r: 0, g: 200, b: 0, alpha: 1.0 },
    LEAF: { r: 0, g: 240, b: 0, alpha: 1.0 },
    GLOW: { r: 255, g: 255, b: 0, alpha: 0.3 },
  },

  SCALE_SIZE: 4, // Size of each cell in pixels
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fpsText, countText;
let paused = false; // Start unpaused by default
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

  // Start unpaused and begin ticking
  startTickInterval();
  fpsText.text = "Running";

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
  constructor(x, y, parent, lastLeafSide = null, isBranch = false) {
    super(x, y, "BUD");
    this.parent = parent;
    this.growthTick = 0;
    this.firstMove = parent instanceof Seed; // Track if this is the first move from seed
    this.directionalBias = Math.random() < 0.5 ? -1 : 1;
    this.lastLeafSide =
      lastLeafSide !== null
        ? lastLeafSide
        : parent && typeof parent.lastLeafSide !== "undefined"
        ? parent.lastLeafSide
        : Math.random() < 0.5
        ? -1
        : 1;
    this.leafDelayCounter = 0; // For delay before creating a leaf
    this.isBranch = isBranch; // Track if this is a branch bud
    this.branchDelayCounter = 0; // Delay counter for branch buds
    this.branchDelayRequired = isBranch
      ? CONSTANTS.GROWTH.BRANCH_BUD_DELAY_MIN +
        Math.floor(
          Math.random() *
            (CONSTANTS.GROWTH.BRANCH_BUD_DELAY_MAX -
              CONSTANTS.GROWTH.BRANCH_BUD_DELAY_MIN +
              1)
        )
      : 0;
    this.lastMoveDirection = null; // Track last movement direction to prevent drastic changes
    this.particleCount = 0; // Count of particles this bud has created
    this.sizeLimit =
      CONSTANTS.GROWTH.BUD_SIZE_LIMIT_MIN +
      Math.floor(
        Math.random() *
          (CONSTANTS.GROWTH.BUD_SIZE_LIMIT_MAX -
            CONSTANTS.GROWTH.BUD_SIZE_LIMIT_MIN +
            1)
      );
    this.hasMaturedstopped = false; // Track if this bud has stopped growing due to size limit
    console.log(
      `[Bud Creation] New ${
        isBranch ? "branch " : ""
      }bud at (${x},${y}) with size limit: ${this.sizeLimit}`
    );
  }

  update() {
    this.growthTick++;

    // Check if this bud has reached its size limit
    if (this.particleCount >= this.sizeLimit) {
      if (!this.hasMaturedstopped) {
        console.log(
          `[Maturity] Bud at (${this.pos.x},${this.pos.y}) has matured after creating ${this.particleCount} particles (limit: ${this.sizeLimit})`
        );
        this.hasMaturedstopped = true;
        // Convert to a final stem
        this.matureToStem();
      }
      return; // Stop all growth
    }

    // Handle delay for branch buds
    if (this.isBranch) {
      this.branchDelayCounter++;
      if (this.branchDelayCounter < this.branchDelayRequired) {
        return; // Don't grow yet
      }
    }

    this.grow();
    // Wait a configurable number of ticks before attempting to grow a leafBud
    this.leafDelayCounter++;
    if (this.leafDelayCounter >= CONSTANTS.GROWTH.BUD_GROWTH_DELAY) {
      this.tryCreateLeafBud();
      this.leafDelayCounter = 0;
    }
  }

  grow() {
    // Occasionally flip directional bias for more lifelike growth
    if (Math.random() < CONSTANTS.GROWTH.TENDENCY_CHANGE_CHANCE) {
      this.directionalBias *= -1;
    }

    let directions = [];
    if (this.firstMove) {
      directions = [{ dx: 0, dy: -1 }];
      this.firstMove = false;
    } else {
      const straightUp = { dx: 0, dy: -1 };
      const diagLeft = { dx: -1, dy: -1 };
      const diagRight = { dx: 1, dy: -1 };

      // Constrain movement based on last direction to prevent drastic changes
      if (this.lastMoveDirection) {
        if (this.lastMoveDirection.dx === -1) {
          // Last move was up-left, can only go straight up or up-left again
          directions = [diagLeft, straightUp];
        } else if (this.lastMoveDirection.dx === 1) {
          // Last move was up-right, can only go straight up or up-right again
          directions = [diagRight, straightUp];
        } else {
          // Last move was straight up, can go in any direction
          if (Math.random() < CONSTANTS.GROWTH.DIAGONAL_GROWTH_WEIGHT) {
            if (this.directionalBias === 1) {
              directions = [diagRight, diagLeft, straightUp];
            } else {
              directions = [diagLeft, diagRight, straightUp];
            }
          } else {
            directions = [straightUp, diagLeft, diagRight];
          }
        }
      } else {
        // No previous direction recorded, use normal logic
        if (Math.random() < CONSTANTS.GROWTH.DIAGONAL_GROWTH_WEIGHT) {
          if (this.directionalBias === 1) {
            directions = [diagRight, diagLeft, straightUp];
          } else {
            directions = [diagLeft, diagRight, straightUp];
          }
        } else {
          directions = [straightUp, diagLeft, diagRight];
        }
      }
    }
    let moved = false;
    let oldX = this.pos.x;
    let oldY = this.pos.y;
    let growthDir = null;
    for (const dir of directions) {
      const newX = this.pos.x + dir.dx;
      const newY = this.pos.y + dir.dy;
      if (
        newX >= 0 &&
        newX < cols &&
        newY >= 0 &&
        newY < rows &&
        !occupancyGrid.get(newX, newY)
      ) {
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.x = newX;
        this.pos.y = newY;
        this.sprite.x = newX * scaleSize;
        this.sprite.y = newY * scaleSize;
        occupancyGrid.set(newX, newY, this);
        this.updateGlow();
        growthDir = dir;
        this.lastMoveDirection = { dx: dir.dx, dy: dir.dy }; // Record movement direction
        console.log(
          `[Growth] Bud moved from (${oldX},${oldY}) to (${newX},${newY}) with direction (${growthDir.dx},${growthDir.dy})`
        );
        // Create stem in old position
        const stem = new Stem(oldX, oldY, this);
        cells.push(stem);
        occupancyGrid.set(stem.pos.x, stem.pos.y, stem);
        this.particleCount++; // Count the stem we just created
        if (this.particleCount % 10 === 0) {
          console.log(
            `[Growth Progress] Bud at (${this.pos.x},${this.pos.y}) has created ${this.particleCount}/${this.sizeLimit} particles`
          );
        }
        this.checkForBranching(oldX, oldY, growthDir);
        moved = true;
        break;
      }
    }
    if (!moved) {
      occupancyGrid.remove(this.pos.x, this.pos.y);
      const stem = new Stem(this.pos.x, this.pos.y, this);
      cells.push(stem);
      occupancyGrid.set(stem.pos.x, stem.pos.y, stem);
      this.particleCount++; // Count the final stem
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

  tryCreateLeafBud() {
    // Alternate side for leaf bud
    const nextLeafSide = this.lastLeafSide === 1 ? -1 : 1;
    const leafX = this.pos.x + nextLeafSide;
    const leafY = this.pos.y - 1;
    if (
      leafX >= 0 &&
      leafX < cols &&
      leafY >= 0 &&
      leafY < rows &&
      !occupancyGrid.get(leafX, leafY)
    ) {
      if (Math.random() <= CONSTANTS.GROWTH.LEAF_CHANCE) {
        const leafBud = new LeafBud(leafX, leafY, this);
        cells.push(leafBud);
        occupancyGrid.set(leafX, leafY, leafBud);
        this.particleCount++; // Count the leaf bud
        // Update alternation state
        this.lastLeafSide = nextLeafSide;
      }
    }
  }

  checkForBranching(stemX, stemY, growthDir) {
    if (growthDir.dx === 0) {
      console.log("[Branching] Not diagonal move, skipping.");
      return;
    }
    const roll = Math.random();
    console.log(
      `[Branching] Considering branch: BRANCH_CHANCE=${
        CONSTANTS.GROWTH.BRANCH_CHANCE
      }, roll=${roll.toFixed(3)}, direction dx=${growthDir.dx}`
    );
    if (roll <= CONSTANTS.GROWTH.BRANCH_CHANCE) {
      const oppositeDx = -growthDir.dx;
      const branchX = stemX + oppositeDx;
      const branchY = stemY - 1;
      console.log(
        `[Branching] Attempting branch at (${branchX},${branchY}) from bud at (${this.pos.x},${this.pos.y})`
      );
      // Check 3x1 horizontal area: branch position and its left/right neighbors
      let canBranch = true;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = branchX + dx;
        const ny = branchY;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
          canBranch = false;
          break;
        }
        const occupied = occupancyGrid.get(nx, ny);
        console.log(
          `[Branching] Checking (${nx},${ny}): ${
            occupied ? "OCCUPIED" : "empty"
          }`
        );
        if (occupied) {
          canBranch = false;
          break;
        }
      }
      if (canBranch) {
        console.log(`[Branching] Branch created at (${branchX},${branchY})`);
        // Inherit alternation state from this bud, mark as branch
        const branchBud = new Bud(
          branchX,
          branchY,
          this,
          this.lastLeafSide,
          true
        );
        cells.push(branchBud);
        occupancyGrid.set(branchX, branchY, branchBud);
        this.particleCount++; // Count the branch bud
      } else {
        console.log(
          `[Branching] Branch position (${branchX},${branchY}) or neighbors not empty, branch not created.`
        );
      }
    } else {
      console.log("[Branching] Roll failed, no branch created.");
    }
  }

  matureToStem() {
    // Convert this bud to a final stem
    occupancyGrid.remove(this.pos.x, this.pos.y);
    const stem = new Stem(this.pos.x, this.pos.y, this);
    cells.push(stem);
    occupancyGrid.set(stem.pos.x, stem.pos.y, stem);

    // Remove this bud from the cells array and clean up its sprite
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

class Stem extends Particle {
  constructor(x, y, parent) {
    super(x, y, "STEM");
    this.parent = parent;
    // Stems are static
  }
  update() {
    // Stems are static
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
