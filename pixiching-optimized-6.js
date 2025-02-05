// === SECTION 1: INITIALIZATION AND SETUP ===
document.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.canvas);

  // Colors and mode definitions
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

  // FPS counter setup
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  const fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  // Particle counter setup
  const particleCountText = new PIXI.Text("Particles: 0", fpsTextStyle);
  particleCountText.x = 10;
  particleCountText.y = 40; // Position it below the FPS counter
  app.stage.addChild(particleCountText);

  // Core simulation parameters
  let perceptionRadius = 1;
  let perceptionCount = 9;
  let particles = [];
  let frame = 0;

  const Mode = {
    VAPOR: "VAPOR",
    PLANT: "PLANT",
    DECAY: "DECAY",
    FLAME: "FLAME",
    EARTH: "EARTH",
    WATER: "WATER",
  };

  // Transformation rates
  let VAPORtoWATER = 0.03;
  let WATERtoVAPOR = 0.1;
  let VAPORtoPLANT = 0.9;
  let PLANTtoEARTH = 0.001;
  let EARTHtoWATER = 0.01;
  let biasProbability = 0.0;

  // Grid setup
  let scaleSize = 3;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 10);
  let elapsed = 0;
  let idCounter = 1;

  // === SECTION 2: GRID SYSTEMS ===
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

    getNeighborsInRadius(x, y, radius) {
      let neighbors = [];
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          let nx = x + dx;
          let ny = y + dy;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            const particle = this.get(nx, ny);
            if (particle !== null) {
              neighbors.push(particle);
            }
          }
        }
      }
      return neighbors;
    }
  }

  // let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  let occupancyGrid = new OccupancyGrid(cols, rows);

  // === SECTION 3: PARTICLE CLASS CORE ===
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

    setMode(mode) {
      if (this.mode !== mode) {
        this.mode = mode;
        this.sprite.texture = modeTextures[mode];
      }
    }

    update() {
      switch (this.mode) {
        case Mode.VAPOR:
          this.updateVAPOR();
          break;
        case Mode.PLANT:
          this.updatePLANT();
          break;
        case Mode.DECAY:
          this.updateDECAY();
          break;
        case Mode.FLAME:
          this.updateFLAME();
          break;
        case Mode.EARTH:
          this.updateEARTH();
          break;
        case Mode.WATER:
          this.updateWATER();
          break;
      }
    }

    // === SECTION 4: PARTICLE MOVEMENT METHODS ===
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

    moveUp() {
      this.moveRel(0, -1);
    }
    moveDown() {
      this.moveRel(0, 1);
    }
    moveDownLeft() {
      this.moveRel(-1, 1);
    }
    moveDownRight() {
      this.moveRel(1, 1);
    }
    moveUpLeft() {
      this.moveRel(-1, -1);
    }
    moveUpRight() {
      this.moveRel(1, -1);
    }
    moveLeft() {
      this.moveRel(-1, 0);
    }
    moveRight() {
      this.moveRel(1, 0);
    }

    neighborOccupied(x, y) {
      let xAbs = (cols + this.pos.x + x) % cols;
      let yAbs = (rows + this.pos.y + y) % rows;
      return occupancyGrid.isOccupied(xAbs, yAbs);
    }

    selfOccupied() {
      return occupancyGrid.get(this.pos.x, this.pos.y) !== this;
    }

    downOccupied() {
      return occupancyGrid.isOccupied(this.pos.x, this.pos.y + 1);
    }
    upOccupied() {
      return occupancyGrid.isOccupied(this.pos.x, this.pos.y - 1);
    }
    downLeftOccupied() {
      return occupancyGrid.isOccupied(this.pos.x - 1, this.pos.y + 1);
    }
    downRightOccupied() {
      return occupancyGrid.isOccupied(this.pos.x + 1, this.pos.y + 1);
    }
    upLeftOccupied() {
      return occupancyGrid.isOccupied(this.pos.x - 1, this.pos.y - 1);
    }
    upRightOccupied() {
      return occupancyGrid.isOccupied(this.pos.x + 1, this.pos.y - 1);
    }
    leftOccupied() {
      return occupancyGrid.isOccupied(this.pos.x - 1, this.pos.y);
    }
    rightOccupied() {
      return occupancyGrid.isOccupied(this.pos.x + 1, this.pos.y);
    }

    // === SECTION 5: PARTICLE UPDATE METHODS ===
    updateVAPOR() {
      let directions = [
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
      ];

      let dir =
        this.lastDir !== null && Math.random() < biasProbability
          ? this.lastDir
          : directions[Math.floor(Math.random() * directions.length)];

      let newX = (cols + this.pos.x + dir.dx) % cols;
      let newY = (rows + this.pos.y + dir.dy) % rows;

      if (!occupancyGrid.isOccupied(newX, newY)) {
        this.moveRel(dir.dx, dir.dy);
        if (!(dir.dx === 0 && dir.dy === 0)) {
          this.lastDir = dir;
        }
      }

      let nearbyParticles = occupancyGrid.getNeighborsInRadius(
        this.pos.x,
        this.pos.y,
        1
      );

      for (const item of nearbyParticles) {
        if (
          item.id !== this.id &&
          Math.abs(item.pos.x - this.pos.x) <= 1 &&
          Math.abs(item.pos.y - this.pos.y) <= 1
        ) {
          if (
            (item.mode === Mode.VAPOR || item.mode === Mode.WATER) &&
            Math.random() < VAPORtoWATER
          ) {
            this.setMode(Mode.WATER);
            break;
          }

          if (item.mode === Mode.PLANT && Math.random() < VAPORtoPLANT) {
            this.setMode(Mode.PLANT);
          }
        }

        if (
          item.mode === Mode.EARTH &&
          item.pos.y === this.pos.y + 1 &&
          item.pos.x === this.pos.x &&
          Math.random() < VAPORtoPLANT
        ) {
          this.setMode(Mode.PLANT);
          break;
        }
      }
    }

    updatePLANT() {
      let grounded = false;
      let nearbyParticles = occupancyGrid.getNeighborsInRadius(
        this.pos.x,
        this.pos.y,
        1
      );

      for (const item of nearbyParticles) {
        if (
          item.id !== this.id &&
          Math.abs(item.pos.x - this.pos.x) <= 1 &&
          Math.abs(item.pos.y - this.pos.y) <= 1
        ) {
          if (item.mode === Mode.PLANT || item.mode === Mode.EARTH) {
            grounded = true;
            break;
          }
        }
      }

      if (!grounded || Math.random() < PLANTtoEARTH) {
        this.setMode(Mode.EARTH);
      }
    }

    updateDECAY() {
      // Movement and interaction logic for DECAY
    }

    updateFLAME() {
      // Movement and interaction logic for FLAME
    }

    updateEARTH() {
      if (this.pos.y >= rows - 1) {
        this.isFalling = false;
        return;
      }

      if (this.downOccupied()) {
        this.isFalling = false;
      } else {
        this.moveDown();
      }

      let nearbyParticles = occupancyGrid.getNeighborsInRadius(
        this.pos.x,
        this.pos.y,
        1
      );

      let isSupported = false;
      let transformToWater = false;
      let waterBelow = null;

      for (const item of nearbyParticles) {
        if (item.id !== this.id) {
          if (
            item.mode === Mode.EARTH &&
            Math.abs(item.pos.x - this.pos.x) <= 1 &&
            Math.abs(item.pos.y - this.pos.y) <= 1
          ) {
            isSupported = true;
          }

          if (
            item.mode === Mode.WATER &&
            ((item.pos.y === this.pos.y - 1 && item.pos.x === this.pos.x) ||
              (item.pos.y === this.pos.y &&
                Math.abs(item.pos.x - this.pos.x) === 1))
          ) {
            transformToWater = true;
          }

          if (
            item.mode === Mode.WATER &&
            item.pos.x === this.pos.x &&
            item.pos.y === this.pos.y + 1
          ) {
            waterBelow = item;
          }
        }
      }

      if (transformToWater && Math.random() < EARTHtoWATER) {
        this.setMode(Mode.WATER);
        this.isFalling = true;
      } else if (waterBelow && !isSupported) {
        let tempX = this.pos.x;
        let tempY = this.pos.y;

        occupancyGrid.remove(this.pos.x, this.pos.y);
        occupancyGrid.remove(waterBelow.pos.x, waterBelow.pos.y);

        this.pos.x = waterBelow.pos.x;
        this.pos.y = waterBelow.pos.y;
        waterBelow.pos.x = tempX;
        waterBelow.pos.y = tempY;

        occupancyGrid.set(this.pos.x, this.pos.y, this);
        occupancyGrid.set(waterBelow.pos.x, waterBelow.pos.y, waterBelow);

        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);
        waterBelow.sprite.x = Math.floor(waterBelow.pos.x * scaleSize);
        waterBelow.sprite.y = Math.floor(waterBelow.pos.y * scaleSize);

        this.isFalling = true;
      }
    }

    updateWATER() {
      if (this.pos.y >= rows - 1) {
        this.isFalling = false;
      } else {
        if (this.isFalling && this.pos.y < rows) {
          if (!this.downOccupied()) {
            this.moveDown();
            this.fallingDirection = null;
          } else {
            if (this.fallingDirection === null) {
              this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
            }

            if (this.fallingDirection === "left") {
              if (!this.downLeftOccupied()) {
                this.moveDownLeft();
              } else if (!this.leftOccupied()) {
                this.moveLeft();
              } else {
                this.fallingDirection = "right";
              }
            } else {
              if (!this.downRightOccupied()) {
                this.moveDownRight();
              } else if (!this.rightOccupied()) {
                this.moveRight();
              } else {
                this.fallingDirection = "left";
              }
            }
          }
        }

        if (!this.upOccupied() && Math.random() < WATERtoVAPOR) {
          this.setMode(Mode.VAPOR);
        }
      }
    }
  } // End of Particle class

  // === SECTION 6: MAIN LOOP AND INITIALIZATION ===
  // Initialize particles
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * (rows / 5));
    if (!occupancyGrid.isOccupied(x, y)) {
      let particle = new Particle(x, y);
      particle.setMode(Mode.VAPOR);
      particles.push(particle);
    }
  }

  // Initialize EARTH particles
  const centerSeventhStartX = Math.floor((cols / 7) * 3);
  const centerSeventhEndX = Math.floor((cols / 7) * 4);
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 10; i++) {
    let x =
      Math.floor(Math.random() * (centerSeventhEndX - centerSeventhStartX)) +
      centerSeventhStartX;
    let y = Math.floor(Math.random() * (rows / 5));
    if (!occupancyGrid.isOccupied(x, y)) {
      let particle = new Particle(x, y);
      particle.setMode(Mode.EARTH);
      particles.push(particle);
    }
  }

  // Main update loop
  app.ticker.add(() => {
    frame++;

    // Update FPS counter
    fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;

    // Update particle count
    particleCountText.text = `Particles: ${particles.length}`;

    // // Rebuild QuadTree every other frame
    // if (frame % 1 === 0) {
    //   quadTree.clear();
    //   particles.forEach((particle) => {
    //     quadTree.addItem(particle.pos.x, particle.pos.y, particle);
    //   });
    // }

    // Update particles
    particles.forEach((particle) => {
      particle.update();
    });
  });
});
// End of DOMContentLoaded event listener
