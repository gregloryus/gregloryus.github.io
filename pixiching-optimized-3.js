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
  const fpsText = new PIXI.Text({ text: "FPS: 0", fpsTextStyle });
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  // Fast forward button setup
  const fastForwardButton = document.createElement("button");
  fastForwardButton.textContent = "Fast Forward (10x)";
  fastForwardButton.style.position = "absolute";
  fastForwardButton.style.top = "50px";
  fastForwardButton.style.left = "10px";
  fastForwardButton.style.zIndex = "10";
  document.body.appendChild(fastForwardButton);

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

  // Transformation rates
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

  // Fast forward configuration
  let fastForwardMode = false;
  let fastForwardSkip = 9; // Update every 10th frame visually

  // Optimized occupancy grid
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

  class Particle {
    // [Previous Particle class code remains the same]

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

      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );

      let isSupported = false;
      let transformToWater = false;
      let waterBelow = null;

      for (const item of items) {
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
  }

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

  // Fast forward button event listener
  fastForwardButton.addEventListener("click", () => {
    fastForwardMode = !fastForwardMode;
    fastForwardButton.textContent = fastForwardMode
      ? "Normal Speed"
      : "Fast Forward (10x)";
  });

  // Main update loop
  app.ticker.add(() => {
    frame++;

    // If in fast forward mode, only update visual representation every 10th frame
    if (fastForwardMode) {
      // Calculate all updates, but only render every 10th frame
      for (let i = 0; i < 10; i++) {
        // Rebuild QuadTree every other virtual frame
        if ((frame + i) % 2 === 0) {
          quadTree.clear();
          particles.forEach((particle) => {
            quadTree.addItem(particle.pos.x, particle.pos.y, particle);
          });
        }

        particles.forEach((particle) => {
          particle.update();
        });
      }

      // Only update visual representation on the final (10th) iteration
      particles.forEach((particle) => {
        particle.sprite.x = Math.floor(particle.pos.x * scaleSize);
        particle.sprite.y = Math.floor(particle.pos.y * scaleSize);
      });
    } else {
      // Original update logic for normal speed
      if (frame % 2 === 0) {
        quadTree.clear();
        particles.forEach((particle) => {
          quadTree.addItem(particle.pos.x, particle.pos.y, particle);
        });
      }

      particles.forEach((particle) => {
        particle.update();
      });
    }
  });
});
