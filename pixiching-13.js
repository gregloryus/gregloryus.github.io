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

  let perceptionRadius = 1;
  let perceptionCount = 9;

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

  let MISTtoRAIN = 0.1; // % chance of MIST turning into RAIN
  let RAINtoMIST = 0.001; // % chance of RAIN turning into MIST

  let scaleSize = 4;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let NUM_OF_STARTER_PARTICLES = 1000;
  // let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 100);
  let elapsed = 0;
  let idCounter = 1;
  let quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  // const graphics = new PIXI.Graphics();
  // graphics.rect(0, 0, scaleSize, scaleSize); // Assuming a 10x10 particle size
  // graphics.fill(0xffff00); // Yellow color for the particle
  // const texture = app.renderer.generateTexture(graphics);

  // returns true if there's a particle that currently occupies this spot
  function isOccupied(x, y) {
    x = (cols + x) % cols;
    y = (rows + y) % rows;
    let itemCount = 0;
    for (const other of quadTree.getItemsInRadius(
      x,
      y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other && other.pos.x == x && other.pos.y == y) {
        itemCount++;
        break;
      }
    }

    if (itemCount > 0) {
      return true;
    } else if (itemCount == 0) {
      return false;
    }
  }

  class Particle {
    constructor(x, y) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = Mode.MIST;
      this.isFalling = true;
      this.fallingDirection = null;
      this.moved = false;
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = x * scaleSize;
      this.sprite.y = y * scaleSize;
      this.sprite.scale.set(scaleSize, scaleSize);
      app.stage.addChild(this.sprite);
    }

    moveRel(x, y) {
      if (this.isStatic) {
        return;
      }
      this.pos.x = (cols + this.pos.x + x) % cols;
      this.pos.y = (rows + this.pos.y + y) % rows;
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

      let itemCount = 0;
      for (const other of quadTree.getItemsInRadius(
        xAbs,
        yAbs,
        perceptionRadius,
        perceptionCount
      )) {
        if (other && other.pos.x == xAbs && other.pos.y == yAbs) {
          itemCount++;
        }
      }

      if (itemCount > 0) {
        return true;
      } else if (itemCount == 0) {
        return false;
      }
    }

    selfOccupied() {
      let x = this.pos.x;
      let y = this.pos.y;
      let itemCount = 0;

      for (const other of quadTree.getItemsInRadius(
        x,
        y,
        perceptionRadius,
        perceptionCount
      )) {
        if (
          other &&
          other.id !== this.id &&
          other.pos.x == x &&
          other.pos.y == y
        ) {
          itemCount++;
        }
      }

      if (itemCount > 0) {
        return true;
      } else if (itemCount == 0) {
        return false;
      }
    }

    downOccupied() {
      let check = isOccupied(this.pos.x, this.pos.y + 1);
      return check;
    }

    upOccupied() {
      let check = isOccupied(this.pos.x, this.pos.y - 1);
      return check;
    }

    downLeftOccupied() {
      let check = isOccupied(this.pos.x - 1, this.pos.y + 1);
      return check;
    }

    downRightOccupied() {
      let check = isOccupied(this.pos.x + 1, this.pos.y + 1);
      return check;
    }

    upLeftOccupied() {
      let check = isOccupied(this.pos.x - 1, this.pos.y - 1);
      return check;
    }

    upRightOccupied() {
      let check = isOccupied(this.pos.x + 1, this.pos.y - 1);
      return check;
    }

    leftOccupied() {
      let check = isOccupied(this.pos.x - 1, this.pos.y);
      return check;
    }

    rightOccupied() {
      let check = isOccupied(this.pos.x + 1, this.pos.y);
      return check;
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
      // Randomly try to move in a new direction if the current spot is occupied
      let directions = [
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 0 },
        /* Current position excluded */ { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
      ];

      let attemptedDirections = [];
      let moved = false;

      while (!moved && attemptedDirections.length < directions.length) {
        let directionIndex = Math.floor(Math.random() * directions.length);
        // Ensure we do not repeat the same direction if it's already been attempted
        if (attemptedDirections.includes(directionIndex)) continue;

        attemptedDirections.push(directionIndex);
        let dir = directions[directionIndex];
        let newX = (cols + this.pos.x + dir.dx) % cols;
        let newY = (rows + this.pos.y + dir.dy) % rows;

        // Check if the new position is within bounds and not occupied
        if (!isOccupied(newX, newY)) {
          this.moveRel(dir.dx, dir.dy);
          moved = true; // Stop the loop, the particle has moved
        }
      }

      // Update sprite position
      this.sprite.x = this.pos.x * scaleSize;
      this.sprite.y = this.pos.y * scaleSize;

      // Within updateMist(), adjust MISTtoRAIN probability based on y position
      let heightFactor = this.pos.y / rows; // Fraction of height, 0 at top, 1 at bottom
      let adjustedMISTtoRAIN = MISTtoRAIN * heightFactor; // Lower at top, higher at bottom

      // Check for nearby particles for interaction logic
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );
      for (const item of items) {
        if (
          item.id !== this.id && // Ensure it's not the same particle
          Math.abs(item.pos.x - this.pos.x) <= 1 && // Check x within +/- 1
          Math.abs(item.pos.y - this.pos.y) <= 1 // Check y within +/- 1
        ) {
          // MIST TO RAIN TRANSITION WITH GATE
          if (Math.random() < adjustedMISTtoRAIN) {
            // Interaction logic for MIST
            this.setMode(Mode.RAIN);
          }
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
      // If water cannot fall straight down, it will try to fall/move in the current falling direction
      // If it cannot move in the current falling direction, it will switch direction
      if (this.isFalling == true && this.pos.y < rows - 1) {
        if (this.downOccupied() == false) {
          this.moveDown();
          this.fallingDirection = null; // reset the falling direction when moving down
        } else {
          if (this.fallingDirection === null) {
            // randomly choose a falling direction if none has been set
            this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
          }

          if (this.fallingDirection === "left") {
            if (this.downLeftOccupied() == false) {
              this.moveDownLeft();
            } else if (this.leftOccupied() == false) {
              this.moveLeft();
            } else {
              // switch direction if it cannot move left
              this.fallingDirection = "right";
            }
          } else {
            // fallingDirection === 'right'
            if (this.downRightOccupied() == false) {
              this.moveDownRight();
            } else if (this.rightOccupied() == false) {
              this.moveRight();
            } else {
              // switch direction if it cannot move right
              this.fallingDirection = "left";
            }
          }
        }
      }

      // Update sprite position accordingly
      this.sprite.x = this.pos.x * scaleSize;
      this.sprite.y = this.pos.y * scaleSize;

      // First, check if the space directly above is empty
      if (!this.upOccupied()) {
        // Then, apply the gate logic for possible transformation
        if (Math.random() < RAINtoMIST) {
          this.setMode(Mode.MIST);
        }
      }
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
