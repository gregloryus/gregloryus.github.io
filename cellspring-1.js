// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let colors, rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;

// Initialize global variables
idCounter = 1;
fastForward = false;
fastForwardFactor = 10;
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
    fontSize: 24,
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

class PlantCell {
  constructor(x, y, seed) {
    this.pos = { x, y };
    this.seed = seed;
    this.plantId = seed ? seed.id : null;
    this.parent = null;
    this.children = [];
    this.energyCapacity = 100;
    this.currentEnergy = 50; // Start with some energy
    this.maintenanceCost = 0.1; // Reduce maintenance cost
    this.idealOffset = { x: 0, y: -1 }; // Default: directly above parent
    this.sprite = new PIXI.Sprite(cellTextures[this.type || "STEM"]);
    this.sprite.x = Math.floor(x * scaleSize);
    this.sprite.y = Math.floor(y * scaleSize);
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);
    occupancyGrid.set(x, y, this);
  }

  update() {
    if (this.currentEnergy <= 0) {
      this.die();
      return;
    }
    this.processEnergy();
    this.updatePosition();
    this.updateVisuals();
  }

  die() {
    occupancyGrid.remove(this.pos.x, this.pos.y);
    app.stage.removeChild(this.sprite);
    cells.splice(cells.indexOf(this), 1);

    // Disconnect from parent/children
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
    }
    this.children.forEach((child) => {
      child.parent = null;
      child.currentEnergy -= 10; // Stress damage
    });
  }

  processEnergy() {
    // Pay maintenance
    this.currentEnergy -= this.maintenanceCost;

    // Collect energy if applicable
    if (this.type === "LEAF") {
      this.currentEnergy += this.collectLight() * 1.5;
    } else if (this.type === "STEM") {
      this.currentEnergy += this.collectLight() * 0.5;
    }

    // Flow excess downward
    if (this.currentEnergy > this.energyCapacity && this.parent) {
      let excess = this.currentEnergy - this.energyCapacity;
      this.parent.currentEnergy += excess;
      this.currentEnergy = this.energyCapacity;
    }

    // If parent has excess, draw some up
    if (
      this.parent &&
      this.parent.currentEnergy > this.parent.energyCapacity * 0.8
    ) {
      let draw = Math.min(
        (this.parent.currentEnergy - this.parent.energyCapacity * 0.8) * 0.1,
        this.energyCapacity - this.currentEnergy
      );
      this.currentEnergy += draw;
      this.parent.currentEnergy -= draw;
    }
  }

  collectLight() {
    let emptyNeighbors = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = this.pos.x + dx,
          ny = this.pos.y + dy;
        if (!occupancyGrid.get(nx, ny)) emptyNeighbors++;
      }
    }
    return emptyNeighbors;
  }

  updatePosition() {
    if (!this.parent) return;

    let targetX = this.parent.pos.x + this.idealOffset.x;
    let targetY = this.parent.pos.y + this.idealOffset.y;

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

    // Energy-based color modulation using the new PIXI.Color
    let energyRatio = this.currentEnergy / this.energyCapacity;
    let baseColor = new PIXI.Color(colors[this.type]);
    let rgbArray = baseColor.toRgbArray();
    let r = Math.floor(rgbArray[0] * 255 * (0.5 + 0.5 * energyRatio));
    let g = Math.floor(rgbArray[1] * 255 * (0.5 + 0.5 * energyRatio));
    let b = Math.floor(rgbArray[2] * 255 * (0.5 + 0.5 * energyRatio));
    this.sprite.tint = (r << 16) | (g << 8) | b;
  }
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null);
    this.type = "SEED";
    this.id = idCounter++;
    this.seed = this;
    this.energyCapacity = 1000;
    this.currentEnergy = 800;
    this.seedProductionThreshold = 800;
    this.hasSprouted = false;
    this.isFalling = true;
    this.sprite.texture = cellTextures.SEED;
  }

  update() {
    if (this.isFalling) {
      let nextY = this.pos.y + 1;

      // Check if we've hit bottom or there's something below us
      if (nextY >= rows || occupancyGrid.get(this.pos.x, nextY)) {
        this.isFalling = false;
        console.log("Seed landed at y:", this.pos.y);
      } else {
        // Move down
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.y = nextY;
        occupancyGrid.set(this.pos.x, this.pos.y, this);
        this.sprite.y = this.pos.y * scaleSize;
        console.log("Seed falling to y:", this.pos.y);
      }
    } else {
      // Normal update once landed
      super.update();
      if (!this.hasSprouted && this.currentEnergy > 200) {
        this.sprout();
      }
    }
  }

  sprout() {
    if (this.hasSprouted || this.isFalling) return;

    if (!occupancyGrid.get(this.pos.x, this.pos.y - 1)) {
      let bud = new BudCell(this.pos.x, this.pos.y - 1, this);
      bud.parent = this;
      bud.currentEnergy = 200; // Give it more starting energy
      this.children.push(bud);
      cells.push(bud);
      this.hasSprouted = true;
    }
  }
}

// Improved Node behavior
class NodeCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed);
    this.type = "NODE";
    this.sprite.texture = cellTextures.NODE;
    this.branchDelay = 30; // Wait frames before potentially branching
    this.hasAttemptedBranch = false;
  }

  update() {
    super.update();
    if (this.branchDelay > 0) {
      this.branchDelay--;
    } else if (!this.hasAttemptedBranch) {
      this.attemptBranching();
    }
  }

  attemptBranching() {
    if (this.currentEnergy < 50) return;

    // Try to branch left or right
    let directions = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
    ];
    for (let dir of directions) {
      let newX = this.pos.x + dir.x;
      let newY = this.pos.y + dir.y;

      if (!occupancyGrid.get(newX, newY)) {
        let bud = new BudCell(newX, newY, this.seed);
        bud.parent = this;
        bud.idealOffset = dir;
        this.children.push(bud);
        cells.push(bud);
        this.currentEnergy -= 50;
      }
    }
    this.hasAttemptedBranch = true;
  }
}

// Leaf functionality
class LeafCell extends PlantCell {
  constructor(x, y, seed) {
    super(x, y, seed);
    this.type = "LEAF";
    this.sprite.texture = cellTextures.LEAF;
    this.energyCapacity = 150;
    this.lightEfficiency = 3;
  }

  collectLight() {
    return super.collectLight() * this.lightEfficiency;
  }
}

class BudCell extends PlantCell {
  grow() {
    if (this.currentEnergy < 5) return; // Reduce energy requirement

    this.growthCounter++;
    if (this.growthCounter >= this.internodeSpacing) {
      this.growthCounter = 0;
      this.placeNode();
    } else {
      this.placeStem();
    }
  }

  placeStem() {
    let stem = new PlantCell(this.pos.x, this.pos.y, this.seed);
    stem.type = "STEM";
    stem.currentEnergy = 50; // Give starting energy
    this.parent = stem;
    stem.children.push(this);
    cells.push(stem);

    // Move bud up
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y--;
    occupancyGrid.set(this.pos.x, this.pos.y, this);
  }

  placeNode() {
    let node = new NodeCell(this.pos.x, this.pos.y, this.seed);
    node.currentEnergy = 50; // Give starting energy
    this.parent = node;
    node.children.push(this);
    cells.push(node);

    // Chance to place leaves
    if (Math.random() < 0.5) {
      let leafX = this.pos.x + (Math.random() < 0.5 ? -1 : 1);
      if (!occupancyGrid.get(leafX, this.pos.y)) {
        let leaf = new LeafCell(leafX, this.pos.y, this.seed);
        leaf.currentEnergy = 50; // Give starting energy
        leaf.parent = node;
        node.children.push(leaf);
        cells.push(leaf);
      }
    }

    // Move bud up
    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y--;
    occupancyGrid.set(this.pos.x, this.pos.y, this);
  }
}
