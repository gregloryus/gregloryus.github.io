// TO DO NEXT:
// 1. Expand on the LIFE --> SOIL process, ideally making it somewhat contagious, if it'd be too impractical to literally track parents and children...
// 2. Refine the SOIL --> RAIN process, since it's way over-simplified right now;

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

  let MISTtoRAIN = 0.01; // % chance of MIST turning into RAIN
  let RAINtoMIST = 0.01; // % chance of RAIN turning into MIST
  let MISTtoLIFE = 0.5; // % chance of MIST turning into LIFE
  let LIFEtoSOIL = 0.001; // % chance of LIFE turning into SOIL
  let SOILtoRAIN = 0.1; // % chance of SOIL turning into RAIN

  // Chance that MIST will continue to move in the same direction
  let biasProbability = 0.0; // 70% chance to move in the same direction

  // let verticalWindChance = 0.5; // % chance of vertical wind

  let scaleSize = 4;
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  // let NUM_OF_STARTER_PARTICLES = 100;
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
    // x = (cols + x) % cols;
    // y = (rows + y) % rows;
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
      this.lastDir = null;
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);
      app.stage.addChild(this.sprite);
    }

    // updateQuadTree() {
    //   // Add new position to quadtree; let old position remain, as the entire quadtree is cleared each frame.
    //   quadTree.addItem(this.pos.x, this.pos.y, this);
    // }

    moveRel(x, y) {
      let newX = this.pos.x + x;
      let newY = this.pos.y + y;

      // let newX = (cols + this.pos.x + x) % cols;
      // let newY = (rows + this.pos.y + y) % rows;

      // Check if new position is within bounds and not occupied
      if (
        newX >= 0 &&
        newX < cols &&
        newY >= 0 &&
        newY < rows &&
        !isOccupied(newX, newY)
      ) {
        // Update position
        this.pos.x = newX;
        this.pos.y = newY;

        // Update sprite position
        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);

        // // Update position in quadtree immediately
        // this.updateQuadTree();
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

      // Bias probability for last direction
      let biasProbability = 0.0; // Example value

      // Apply bias towards last direction, or pick a new direction
      let dir =
        this.lastDir !== null && Math.random() < biasProbability
          ? this.lastDir
          : directions[Math.floor(Math.random() * directions.length)];

      // Attempt to move
      let newX = (cols + this.pos.x + dir.dx) % cols;
      let newY = (rows + this.pos.y + dir.dy) % rows;
      if (!isOccupied(newX, newY)) {
        this.moveRel(dir.dx, dir.dy);
        if (!(dir.dx === 0 && dir.dy === 0)) {
          // Update last direction if it moved
          this.lastDir = dir;
        }
      }

      // Update sprite position
      this.sprite.x = Math.floor(this.pos.x * scaleSize);
      this.sprite.y = Math.floor(this.pos.y * scaleSize);

      // Interaction logic with adjacent particles for transformation
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
          Math.abs(item.pos.y - this.pos.y) <= 1
        ) {
          // Check y within +/- 1

          // Transform MIST into RAIN if adjacent to MIST or RAIN, applying MISTtoRAIN gate
          if (
            (item.mode === Mode.MIST || item.mode === Mode.RAIN) &&
            Math.random() < MISTtoRAIN
          ) {
            this.setMode(Mode.RAIN);
            break; // Exit after transforming to RAIN
          }

          // Specific checks when adjacent particle is LIFE
          if (item.mode === Mode.LIFE) {
            if (Math.random() < MISTtoLIFE) {
              this.setMode(Mode.LIFE);
            }
          }
        }

        // Transform MIST into LIFE when there is SOIL directly below, applying MISTtoLIFE gate
        if (
          item.mode === Mode.SOIL &&
          item.pos.y === this.pos.y + 1 &&
          item.pos.x === this.pos.x
        ) {
          if (Math.random() < MISTtoLIFE) {
            this.setMode(Mode.LIFE);
            break; // Exit after transforming to LIFE
          }
        }
      }
    }

    updateLife() {
      let grounded = false;
      // Interaction logic with adjacent particles for transformation
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
          Math.abs(item.pos.y - this.pos.y) <= 1
        ) {
          // Check y within +/- 1

          if (item.mode === Mode.LIFE || item.mode === Mode.SOIL) {
            // Found a LIFE or SOIL neighbor, no immediate transformation to SOIL
            grounded = true;
            break; // Exit loop since a neighbor was found
          }
        }
      }

      // If no LIFE or SOIL neighbors were found, transform into SOIL immediately
      if (!grounded) {
        this.setMode(Mode.SOIL);
      } else if (Math.random() < LIFEtoSOIL) {
        // Otherwise, apply the LIFEtoSOIL chance to possibly transform into SOIL
        this.setMode(Mode.SOIL);
      }

      // Roll a random chance against the LIFEtoSOIL gate
      if (Math.random() < LIFEtoSOIL) {
        // If the chance is within the gate, transform this particle into SOIL
        this.setMode(Mode.SOIL);
      }
      // Any additional logic for LIFE particles can be added here
    }

    updateFuel() {
      // Movement and interaction logic for FUEL
    }

    updateFire() {
      // Movement and interaction logic for FIRE
    }

    updateSoil() {
      // First, check if the SOIL particle is at the bottom of the simulation area.
      if (this.pos.y >= rows - 1) {
        this.isFalling = false; // Stop falling because it's at the bottom.
        return; // Exit the function early since no further action is needed.
      }

      // If it's not at the bottom, check if the space directly below is occupied.
      const downCheck = this.downOccupied();

      if (downCheck) {
        this.isFalling = false; // Stop falling because the space below is occupied.
      } else {
        // If the space below is free, move the particle down.
        this.moveDown();
      }

      // Update sprite position
      this.sprite.x = Math.floor(this.pos.x * scaleSize);
      this.sprite.y = Math.floor(this.pos.y * scaleSize);

      // Interaction logic with adjacent particles for transformation
      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );
      if (items.length < 4) {
        // Check if there are less than 4 particles around this SOIL particle
        // If there are less than 4 particles around this SOIL particle, it will transform into RAIN
        if (Math.random() < SOILtoRAIN) {
          this.setMode(Mode.RAIN);
          this.isFalling = true; // Start falling again
        }
      }
      // Check directly below for RAIN
      for (const item of items) {
        if (
          item.id !== this.id && // Ensure it's not the same particle
          item.pos.x === this.pos.x && // Same x-coordinate
          item.pos.y === this.pos.y + 1 && // Directly below
          item.mode === Mode.RAIN
        ) {
          // this particle and the item particle swap locations, by directly changing the position
          let tempX = this.pos.x;
          let tempY = this.pos.y;
          this.pos.x = item.pos.x;
          this.pos.y = item.pos.y;
          item.pos.x = tempX;
          item.pos.y = tempY;
        }
      }
    }

    updateRain() {
      // Before trying to move down, check if we're at the bottom
      if (this.pos.y >= rows - 1) {
        this.isFalling = false; // Stop falling
        // Optional: Handle lateral movement or spreading here
      } else {
        // If water cannot fall straight down, it will try to fall/move in the current falling direction
        // If it cannot move in the current falling direction, it will switch direction
        if (this.isFalling == true && this.pos.y < rows) {
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

        // Update sprite position
        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);

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
  }

  // Generate NUM_OF_STARTER_PARTICLES particles of each mode, each located within a certain "zone" defined by cutting the canvas into 9 equal parts (3 x 3): MIST in one of the top 3 zones, RAIN in one of the middle 3 horizontal zones, and SOIL in one of the bottom 3 zones.
  // Determine the horizontal zone for MIST
  const mistZone = Math.floor(Math.random() * 3); // 0: left, 1: middle, 2: right
  const mistXStart = Math.floor(mistZone * (cols / 3));
  const mistXEnd = Math.floor(mistXStart + cols / 3);

  // Generate MIST particles in the chosen third
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 2; i++) {
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
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 2; i++) {
    let x = Math.floor(Math.random() * (soilXEnd - soilXStart)) + soilXStart;
    let y = Math.floor(Math.random() * (rows / 3) + 2 * (rows / 3)); // Bottom third for y, ensuring y is an integer
    let particle = new Particle(x, y);
    particle.setMode(Mode.SOIL);
    particles.push(particle);
  }

  app.ticker.add(() => {
    quadTree.clear();
    particles.forEach((particle) => {
      // Add each particle to the quadtree with updated position
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
    });
    particles.forEach((particle) => {
      particle.update();
    });
  });
});
