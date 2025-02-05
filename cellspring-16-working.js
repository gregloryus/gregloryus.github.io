// CONSTANTS
const CONSTANTS = {
  // Core energy parameters
  ENERGY: {
    DEFAULT_CAPACITY: 10,
    SEED_ENERGY: 100,
    SEED_CAPACITY: 100,
    SPROUT_THRESHOLD: 5,
    GROWTH_COST: 3,
    MAINTENANCE_INTERVAL: 60,
    MAINTENANCE_COST: 1,
    COLLECTION_CHANCE: 0.01, // 1/100 chance per empty cardinal direction
    LEAF_MULTIPLIER: 1.5,
  },

  // Growth parameters
  GROWTH: {
    BUD_GROWTH_LIMIT: 16,
    INTERNODE_SPACING: 5,
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
  },
};

// Global variables
let app, cellTextures, cells, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fastForward, fastForwardFactor, lastRenderTime;
let fpsText, countText;

// Initialize global variables
idCounter = 1;
fastForward = false;
fastForwardFactor = CONSTANTS.PERFORMANCE.FAST_FORWARD_FACTOR;
frame = 0;

function addInitialSeed() {
  // Create the seed cell at the desired initial position.
  const seed = new Seed(Math.floor(cols / 2), 0);
  cells.push(seed);
  return seed;
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

  addInitialSeed();
  mainLoop();

  // Add keyboard listener for fast-forward
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      fastForward = !fastForward;
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
    this.energyCapacity =
      type === "SEED"
        ? CONSTANTS.ENERGY.SEED_CAPACITY
        : CONSTANTS.ENERGY.DEFAULT_CAPACITY;
    this.currentEnergy =
      type === "SEED"
        ? CONSTANTS.ENERGY.SEED_ENERGY
        : Math.floor(this.energyCapacity / 2);
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

    // Each empty space has base collection chance
    for (let i = 0; i < emptySpaces; i++) {
      if (
        Math.random() <
        CONSTANTS.ENERGY.COLLECTION_CHANCE *
          (this.type === "LEAF" ? CONSTANTS.ENERGY.LEAF_MULTIPLIER : 1)
      ) {
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
    const connections = [this.parent, ...this.children].filter(
      (cell) => cell !== null
    );

    // First handle excess energy
    if (this.isExtra()) {
      for (const neighbor of connections) {
        if (!neighbor.isExtra()) {
          this.currentEnergy--;
          neighbor.currentEnergy++;
          return;
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
}

class Seed extends PlantCell {
  constructor(x, y) {
    super(x, y, null, "SEED");
    this.landed = false;
    this.growing = false;
  }

  update() {
    if (!this.landed) {
      const newY = Math.floor(this.pos.y) + 1;
      if (newY >= rows - 1) {
        this.pos.y = rows - 1;
        this.landed = true;
        this.sprite.y = this.pos.y * scaleSize;
      } else {
        this.pos.y = newY;
        this.sprite.y = newY * scaleSize;
      }
    } else if (
      !this.growing &&
      this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_THRESHOLD
    ) {
      this.startGrowing();
    }

    this.updateVisuals();
  }

  startGrowing() {
    if (this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_THRESHOLD) {
      this.growing = true;
      const budPos = { x: this.pos.x, y: this.pos.y - 1 };
      if (!occupancyGrid.get(budPos.x, budPos.y)) {
        const bud = new BudCell(budPos.x, budPos.y, this);
        this.children.push(bud);
        cells.push(bud);
        this.currentEnergy -= CONSTANTS.ENERGY.GROWTH_COST;
      }
    }
  }

  updateVisuals() {
    this.energyText.text = String(Math.floor(this.currentEnergy));
    this.energyText.x = this.sprite.x + scaleSize / 2;
    this.energyText.y = this.sprite.y + scaleSize / 2;
    const energyRatio = this.currentEnergy / this.energyCapacity;
    this.sprite.alpha = 0.6 + Math.min(energyRatio, 1) * 0.4;
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
}

class BudCell extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "BUD");
    this.growthCount = 0;
  }

  update() {
    this.collectEnergy();
    this.payMaintenanceCost();
    this.distributeEnergy();

    if (this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) {
      this.grow();
    }

    this.updateVisuals();
  }

  grow() {
    if (this.growthCount >= CONSTANTS.GROWTH.BUD_GROWTH_LIMIT) {
      console.log(
        `Bud cell at (${this.pos.x}, ${this.pos.y}) has reached its growth limit.`
      );
      return;
    }

    const newY = this.pos.y - 1;
    if (newY < 0 || occupancyGrid.get(this.pos.x, newY)) return;

    this.growthCount++;

    if (
      this.growthCount > 0 &&
      this.growthCount % CONSTANTS.GROWTH.INTERNODE_SPACING === 0
    ) {
      const node = new NodeCell(this.pos.x, this.pos.y, this.parent);
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(node);
      cells.push(node);
      node.createLeafBuds();
    } else {
      const stem = new StemCell(this.pos.x, this.pos.y, this.parent);
      this.parent.children = this.parent.children.filter(
        (child) => child !== this
      );
      this.parent.children.push(stem);
      cells.push(stem);
    }

    occupancyGrid.remove(this.pos.x, this.pos.y);
    this.pos.y = newY;
    this.sprite.y = this.pos.y * scaleSize;
    occupancyGrid.set(this.pos.x, this.pos.y, this);

    const newParent = occupancyGrid.get(this.pos.x, this.pos.y + 1);
    if (newParent) {
      this.parent = newParent;
      newParent.children.push(this);
    }

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
      overlay.beginFill(0xffff00, 0.2);
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
  const updatesThisFrame = fastForward ? fastForwardFactor : 1;

  for (let i = 0; i < updatesThisFrame; i++) {
    frame++;
    cells.forEach((cell) => cell.update());
  }

  const now = performance.now();
  const fps = 1000 / (now - lastRenderTime);
  lastRenderTime = now;

  fpsText.text = `FPS: ${Math.round(fps)}`;
  countText.text = `Cells: ${cells.length}`;

  app.renderer.render(app.stage);
  requestAnimationFrame(mainLoop);
}
