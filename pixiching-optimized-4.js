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
  fastForwardButton.style.padding = "10px";
  fastForwardButton.style.backgroundColor = "#4CAF50";
  fastForwardButton.style.color = "white";
  fastForwardButton.style.border = "none";
  fastForwardButton.style.borderRadius = "5px";
  fastForwardButton.style.cursor = "pointer";
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

    // Add setMode method directly to the Particle class
    setMode(mode) {
      if (this.mode !== mode) {
        this.mode = mode;
        this.sprite.texture = modeTextures[mode];
      }
    }

    // [Rest of the Particle class methods remain the same as in the previous complete version]
    // ... (moveRel, moveUp, moveDown, etc. methods)

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

      // Get nearby particles for interactions
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );

      for (const item of items) {
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
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );

      for (const item of items) {
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
      // Placeholder for future implementation
    }

    updateFLAME() {
      // Placeholder for future implementation
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
    fastForwardButton.style.backgroundColor = fastForwardMode
      ? "#FF5722"
      : "#4CAF50";
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
