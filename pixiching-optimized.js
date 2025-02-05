// All existing initialization code remains the same until particle system setup
document.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.canvas);

  // Colors and mode definitions remain the same
  const colors = {
    VAPOR: "Aqua",
    PLANT: 0x008000,
    DECAY: 0xffff00,
    FLAME: 0xff4500,
    EARTH: 0x80461b,
    WATER: "Blue",
  };

  const modeTextures = Object.entries(colors).reduce((acc, [mode, color]) => {
    const graphics = new PIXI.Graphics();
    graphics.rect(0, 0, 1, 1);
    graphics.fill(color);
    acc[mode] = app.renderer.generateTexture(graphics);
    return acc;
  }, {});

  // FPS counter setup remains the same
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  const fpsText = new PIXI.Text({ text: "FPS: 0", fpsTextStyle });
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  // Configuration remains the same
  let perceptionRadius = 1;
  let perceptionCount = 9;
  let particles = [];
  const Mode = {
    VAPOR: "VAPOR",
    PLANT: "PLANT",
    DECAY: "DECAY",
    FLAME: "FLAME",
    EARTH: "EARTH",
    WATER: "WATER",
  };

  // Transformation rates remain the same
  let VAPORtoWATER = 0.02;
  let WATERtoVAPOR = 0.1;
  let VAPORtoPLANT = 0.9;
  let PLANTtoEARTH = 0.001;
  let EARTHtoWATER = 0.01;
  let biasProbability = 0.0;

  let scaleSize = 3;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 10);
  let elapsed = 0;
  let idCounter = 1;
  let frame = 0;

  // NEW: Add occupancy grid
  class OccupancyGrid {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;
      this.grid = new Array(cols * rows).fill(null);
    }

    getIndex(x, y) {
      return y * this.cols + x;
    }

    set(x, y, particle) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this.grid[this.getIndex(x, y)] = particle;
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

    clear() {
      this.grid.fill(null);
    }

    isOccupied(x, y) {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
      return this.get(x, y) !== null;
    }
  }

  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  let occupancyGrid = new OccupancyGrid(cols, rows);

  // Modified isOccupied function to use grid
  function isOccupied(x, y) {
    return occupancyGrid.isOccupied(x, y);
  }

  // Particle class remains mostly the same but with optimized movement
  class Particle {
    constructor(x, y) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = Math.random() < 0.5 ? Mode.VAPOR : Mode.EARTH;
      this.isFalling = true;
      this.fallingDirection = null;
      this.moved = false;
      this.lastDir = null;
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);
      app.stage.addChild(this.sprite);
      occupancyGrid.set(x, y, this);
    }

    moveRel(x, y) {
      let newX = (cols + this.pos.x + x) % cols;
      let newY = (rows + this.pos.y + y) % rows;

      if (!occupancyGrid.isOccupied(newX, newY)) {
        occupancyGrid.remove(this.pos.x, this.pos.y);
        this.pos.x = newX;
        this.pos.y = newY;
        occupancyGrid.set(newX, newY, this);

        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);
        return true;
      }
      return false;
    }

    // Rest of particle methods remain the same, just use occupancyGrid for checks
    // ... (copy all other particle methods from original)
  }

  // Particle initialization
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * (rows / 5));
    if (!isOccupied(x, y)) {
      let particle = new Particle(x, y);
      particle.setMode(Mode.VAPOR);
      particles.push(particle);
    }
  }

  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 10; i++) {
    const centerSeventhStartX = Math.floor((cols / 7) * 3);
    const centerSeventhEndX = Math.floor((cols / 7) * 4);
    let x =
      Math.floor(Math.random() * (centerSeventhEndX - centerSeventhStartX)) +
      centerSeventhStartX;
    let y = Math.floor(Math.random() * (rows / 5));
    if (!isOccupied(x, y)) {
      let particle = new Particle(x, y);
      particle.setMode(Mode.EARTH);
      particles.push(particle);
    }
  }

  // Modified update loop
  app.ticker.add(() => {
    frame++;

    // Only rebuild QuadTree every other frame
    if (frame % 2 === 0) {
      quadTree.clear();
      particles.forEach((particle) => {
        quadTree.addItem(particle.pos.x, particle.pos.y, particle);
      });
    }

    particles.forEach((particle) => {
      particle.update();
    });
  });
});
