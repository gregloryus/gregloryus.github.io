document.addEventListener("DOMContentLoaded", async () => {
  const app = new PIXI.Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.canvas);

  // Define colors for each mode
  const colors = {
    MIST: 0xadd8e6, // Light blue
    LIFE: 0x008000, // Green
    FUEL: 0xffff00, // Yellow
    FIRE: 0xff4500, // Red
    SOIL: 0x80461b, // Russet
    RAIN: 0x0000ff, // Dark blue
  };

  const modeTextures = Object.entries(colors).reduce((acc, [mode, color]) => {
    const graphics = new PIXI.Graphics();
    graphics.rect(0, 0, 1, 1);
    graphics.fill(color);
    acc[mode] = app.renderer.generateTexture(graphics);
    return acc;
  }, {});

  // Rest of your initialization code...

  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  const fpsText = new PIXI.Text({ text: "FPS: 0", fpsTextStyle });
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  // The rest of your PixiJS logic here
  let particles = [];

  const Mode = {
    MIST: "MIST",
    LIFE: "LIFE",
    FUEL: "FUEL",
    FIRE: "FIRE",
    SOIL: "SOIL",
    RAIN: "RAIN",
  };

  let scaleSize = 8;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 33);
  let elapsed = 0;
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  // const graphics = new PIXI.Graphics();
  // graphics.rect(0, 0, scaleSize, scaleSize); // Assuming a 10x10 particle size
  // graphics.fill(0xffff00); // Yellow color for the particle
  // const texture = app.renderer.generateTexture(graphics);

  function isOccupied(x, y) {
    let items = quadTree.getItemsInRadius(x, y, 0.5, 10);
    for (const item of items) {
      if (item.pos.x === x && item.pos.y === y) {
        return true;
      }
    }
    return false;
  }

  class Particle {
    constructor(x, y) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = Mode.MIST;
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = x * scaleSize;
      this.sprite.y = y * scaleSize;
      this.sprite.scale.set(scaleSize, scaleSize);
      app.stage.addChild(this.sprite);
    }

    setMode(mode) {
      if (this.mode !== mode) {
        this.mode = mode;
        this.sprite.texture = modeTextures[mode];
      }
    }

    update() {
      switch (this.mode) {
        case Mode.MIST:
          this.updateMist();
          break;
        case Mode.LIFE:
          this.updateLife();
          break;
        case Mode.FUEL:
          this.updateFuel();
          break;
        case Mode.FIRE:
          this.updateFire();
          break;
        case Mode.SOIL:
          this.updateSoil();
          break;
        case Mode.RAIN:
          this.updateRain();
          break;
      }
    }

    updateMist() {
      // Movement and interaction logic for MIST
      let dx = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1
      let dy = Math.floor(Math.random() * 3) - 1; // Results in -1, 0, or 1

      this.pos.x = Math.min(Math.max(this.pos.x + dx, 0), cols - 1);
      this.pos.y = Math.min(Math.max(this.pos.y + dy, 0), rows - 1);

      this.sprite.x = this.pos.x * scaleSize; // Ensure sprite position aligns with grid
      this.sprite.y = this.pos.y * scaleSize;

      // Check for nearby particles
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        scaleSize,
        10
      );
      for (const item of items) {
        if (
          item.id !== this.id && // Ensure it's not the same particle
          Math.abs(item.pos.x - this.pos.x) <= 1 && // Check x within +/- 1
          Math.abs(item.pos.y - this.pos.y) <= 1 // Check y within +/- 1
        ) {
          // Interaction logic for MIST
          // Set mode to FIRE
          this.setMode(Mode.RAIN);
        }
      }
    }

    updateLife() {
      // Movement and interaction logic for LIFE
    }

    updateFuel() {
      // Movement and interaction logic for FUEL
    }

    updateFire() {
      // Movement and interaction logic for FIRE
    }

    updateSoil() {
      // Movement and interaction logic for SOIL
    }

    updateRain() {
      let newX = this.pos.x;
      let newY = this.pos.y + 1; // Prefer moving straight down

      // Explicitly check if the down position is occupied
      let checkDown = isOccupied(newX, newY) || newY >= rows;
      let checkDownLeft =
        !isOccupied(newX - 1, newY) && newX - 1 >= 0 && !checkDown;
      let checkDownRight =
        !isOccupied(newX + 1, newY) && newX + 1 < cols && !checkDown;

      if (!checkDown) {
        newY = this.pos.y + 1;
      } else if (checkDownLeft) {
        newX -= 1;
        newY = this.pos.y + 1;
      } else if (checkDownRight) {
        newX += 1;
        newY = this.pos.y + 1;
      } else {
        // Check left and right only if moving down or diagonally down is not possible
        let checkLeft = !isOccupied(newX - 1, this.pos.y) && newX - 1 >= 0;
        let checkRight = !isOccupied(newX + 1, this.pos.y) && newX + 1 < cols;

        if (checkLeft) {
          newX -= 1;
        } else if (checkRight) {
          newX += 1;
        }
        // No need to change newY as moving horizontally
      }

      // Update position if it's within bounds
      if (newX >= 0 && newX < cols) {
        this.pos.x = newX;
        this.pos.y = Math.min(newY, rows - 1); // Ensure newY doesn't exceed bounds
      }

      // Update sprite position
      this.sprite.x = this.pos.x * scaleSize;
      this.sprite.y = this.pos.y * scaleSize;
    }
  }

  // Generate 1000 particles in random positions
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
    particles.push(
      new Particle(
        Math.floor(Math.random() * cols),
        Math.floor(Math.random() * rows)
      )
    );
  }

  // Update and render loop
  app.ticker.add(() => {
    quadTree.clear();
    particles.forEach((particle) => {
      // Add each particle to the quadtree with updated position
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
    });
    particles.forEach((particle) => {
      particle.update();
    });

    // Update FPS counter every second
    elapsed += app.ticker.deltaMS;
    if (elapsed >= 1000) {
      fpsText.text = `FPS: ${Math.round(app.ticker.FPS)}`;
      elapsed = 0;
    }
  });
});
