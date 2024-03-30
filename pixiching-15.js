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
    MIST: "White",
    LIFE: 0x008000, // Green
    FUEL: 0xffff00, // Yellow
    FIRE: 0xff4500, // Red
    SOIL: 0x80461b, // Russet
    RAIN: "Aqua",
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
  let RAINtoMIST = 0.01; // % chance of RAIN turning into MIST

  // let verticalWindChance = 0.5; // % chance of vertical wind

  let scaleSize = 4;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  // let NUM_OF_STARTER_PARTICLES = 3000;
  let NUM_OF_STARTER_PARTICLES = Math.floor((cols * rows) / 10);
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
      // Randomly set mode to either RAIN or SOIL
      this.mode = Math.random() < 0.5 ? Mode.MIST : Mode.SOIL;
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
      let newX = this.pos.x + x;
      let newY = this.pos.y + y;

      // Prevent horizontal wrapping (if necessary, adjust or clarify as per actual behavior)
      if (newX >= 0 && newX < cols) {
        this.pos.x = newX;
      }

      // Prevent vertical wrapping
      if (newY >= 0 && newY < rows) {
        this.pos.y = newY;
      }
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

      // let heightFactor = this.pos.y / rows; // Calculates a value that increases from 0 (top) to 1 (bottom)
      // let adjustedMISTtoRAIN = MISTtoRAIN * heightFactor * 10; // Adjusts transformation chance, lower near the top, higher towards the bottom

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
          // If the other particle (i.e., item) is directly below (x, y+1) and is SOIL, transform into LIFE
          if (item.pos.x == this.pos.x && item.pos.y == this.pos.y + 1) {
            if (item.mode === Mode.SOIL) {
              this.setMode(Mode.LIFE);
            }
          }

          // If the other particle is LIFE, transform into LIFE
          if (item.mode === Mode.LIFE) {
            this.setMode(Mode.LIFE);
          }

          // MIST TO RAIN TRANSITION WITH GATE
          if (Math.random() < MISTtoRAIN) {
            // Interaction logic for MIST
            this.setMode(Mode.RAIN);

            // Ensure pos values are integers
            this.pos.x = Math.floor(this.pos.x);
            this.pos.y = Math.floor(this.pos.y);
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
      // Soil should simply fall down and stop when it hits another particle; it should swap places with water particles directly below it.
      // Check if the soil can move down
      if (this.pos.y < rows - 1 && !this.downOccupied()) {
        this.moveDown(); // Move soil directly down if the spot is not occupied
      } else {
        this.isFalling = false; // Stop falling if it hits the bottom or another particle
      }

      // Update the sprite's position to reflect the change
      this.sprite.x = this.pos.x * scaleSize;
      this.sprite.y = this.pos.y * scaleSize;
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

      // let heightFactor = 1 - this.pos.y / rows; // Inversely correlates with height: 1 at top, 0 at bottom
      // let adjustedRAINtoMIST = RAINtoMIST * heightFactor * 10; // Increases transformation chance the higher the particle is

      // First, check if the space directly above is empty
      if (!this.upOccupied()) {
        // Then, apply the gate logic for possible transformation
        if (Math.random() < RAINtoMIST) {
          this.setMode(Mode.MIST);
        }
      }
    }
  }

  // Generate NUM_OF_STARTER_PARTICLES particles of each mode, each located within a certain "zone" defined by cutting the canvas into 9 equal parts (3 x 3): MIST in one of the top 3 zones, RAIN in one of the middle 3 horizontal zones, and SOIL in one of the bottom 3 zones.
  // Determine the horizontal zone for MIST
  const mistZone = Math.floor(Math.random() * 3); // 0: left, 1: middle, 2: right
  const mistXStart = Math.floor(mistZone * (cols / 3));
  const mistXEnd = Math.floor(mistXStart + cols / 3);

  // Generate MIST particles in the chosen third
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 3; i++) {
    let x = Math.floor(Math.random() * (mistXEnd - mistXStart)) + mistXStart;
    let y = Math.floor(Math.random() * (rows / 3)); // Upper third for y
    let particle = new Particle(x, y);
    particle.setMode(Mode.MIST);
    particles.push(particle);
  }

  // Determine the horizontal zone for SOIL
  const soilZone = Math.floor(Math.random() * 3); // 0: left, 1: middle, 2: right
  const soilXStart = Math.floor(soilZone * (cols / 3));
  const soilXEnd = Math.floor(soilXStart + cols / 3);

  // Generate SOIL particles in the chosen third
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 3; i++) {
    let x = Math.floor(Math.random() * (soilXEnd - soilXStart)) + soilXStart;
    let y = Math.floor(Math.random() * (rows / 3)) + 2 * (rows / 3); // Bottom third for y
    let particle = new Particle(x, y);
    particle.setMode(Mode.SOIL);
    particles.push(particle);
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
