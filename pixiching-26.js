// TO DO NEXT:
// - Refine the EARTH --> WATER process, since it's way over-simplified right now;
// - Expand on the PLANT --> EARTH process, ideally making it somewhat contagious, if it'd be too impractical to literally track parents and children...
// - Play around with starting positions of particles
// - While keeping EARTH physics simple, allow it to stop falling as long as there's another EARTH in the neighborhood which isn't falling

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
    VAPOR: "White",
    PLANT: 0x008000, // Green
    DECAY: 0xffff00, // Yellow
    FLAME: 0xff4500, // Red
    EARTH: 0x80461b, // Russet
    WATER: "Aqua",
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
    VAPOR: "VAPOR",
    PLANT: "PLANT",
    DECAY: "DECAY",
    FLAME: "FLAME",
    EARTH: "EARTH",
    WATER: "WATER",
  };

  let VAPORtoWATER = 0.01; // % chance of VAPOR turning into WATER
  let WATERtoVAPOR = 0.01; // % chance of WATER turning into VAPOR
  let VAPORtoPLANT = 0.5; // % chance of VAPOR turning into PLANT
  let PLANTtoEARTH = 0.001; // % chance of PLANT turning into EARTH
  let EARTHtoWATER = 0.001; // % chance of EARTH turning into WATER

  // Chance that VAPOR will continue to move in the same direction
  let biasProbability = 0.0; // 70% chance to move in the same direction

  // let verticalWindChance = 0.5; // % chance of vertical wind

  let scaleSize = 3;
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
      // Randomly set mode to either WATER or EARTH
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
    }

    // updateQuadTree() {
    //   // Add new position to quadtree; let old position remain, as the entire quadtree is cleared each frame.
    //   quadTree.addItem(this.pos.x, this.pos.y, this);
    // }

    moveRel(x, y) {
      // let newX = this.pos.x + x;
      // let newY = this.pos.y + y;

      let newX = (cols + this.pos.x + x) % cols;
      let newY = (rows + this.pos.y + y) % rows;

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

          // Transform VAPOR into WATER if adjacent to VAPOR or WATER, applying VAPORtoWATER gate
          if (
            (item.mode === Mode.VAPOR || item.mode === Mode.WATER) &&
            Math.random() < VAPORtoWATER
          ) {
            this.setMode(Mode.WATER);
            break; // Exit after transforming to WATER
          }

          // Specific checks when adjacent particle is PLANT
          if (item.mode === Mode.PLANT) {
            if (Math.random() < VAPORtoPLANT) {
              this.setMode(Mode.PLANT);
            }
          }
        }

        // Transform VAPOR into PLANT when there is EARTH directly below, applying VAPORtoPLANT gate
        if (
          item.mode === Mode.EARTH &&
          item.pos.y === this.pos.y + 1 &&
          item.pos.x === this.pos.x
        ) {
          if (Math.random() < VAPORtoPLANT) {
            this.setMode(Mode.PLANT);
            break; // Exit after transforming to PLANT
          }
        }
      }
    }

    updatePLANT() {
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

          if (item.mode === Mode.PLANT || item.mode === Mode.EARTH) {
            // Found a PLANT or EARTH neighbor, no immediate transformation to EARTH
            grounded = true;
            break; // Exit loop since a neighbor was found
          }
        }
      }

      // If no PLANT or EARTH neighbors were found, transform into EARTH immediately
      if (!grounded) {
        this.setMode(Mode.EARTH);
      } else if (Math.random() < PLANTtoEARTH) {
        // Otherwise, apply the PLANTtoEARTH chance to possibly transform into EARTH
        this.setMode(Mode.EARTH);
      }

      // Roll a random chance against the PLANTtoEARTH gate
      if (Math.random() < PLANTtoEARTH) {
        // If the chance is within the gate, transform this particle into EARTH
        this.setMode(Mode.EARTH);
      }
      // Any additional logic for PLANT particles can be added here
    }

    updateDECAY() {
      // Movement and interaction logic for DECAY
    }

    updateFLAME() {
      // Movement and interaction logic for FLAME
    }

    updateEARTH() {
      // First, check if the EARTH particle is at the bottom of the simulation area.
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

      let items = quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      );

      let isSupported = false;
      let transformToWater = false;
      let waterBelow = null; // Reference to water directly below for possible swapping

      for (const item of items) {
        if (item.id !== this.id) {
          // Checking for lateral EARTH support and WATER adjacency
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

          // Looking for WATER directly below for swapping
          if (
            item.mode === Mode.WATER &&
            item.pos.x === this.pos.x &&
            item.pos.y === this.pos.y + 1
          ) {
            waterBelow = item;
          }
        }
      }

      // Perform transformation into WATER, ensuring the particle is set to falling
      if (transformToWater && Math.random() < EARTHtoWATER) {
        this.setMode(Mode.WATER);
        this.isFalling = true; // Ensure the particle is marked as falling
      } else if (waterBelow && !isSupported) {
        // Execute swapping with WATER below only if not supported laterally
        let tempX = this.pos.x;
        let tempY = this.pos.y;
        this.pos.x = waterBelow.pos.x;
        this.pos.y = waterBelow.pos.y;
        waterBelow.pos.x = tempX;
        waterBelow.pos.y = tempY;
        this.isFalling = true; // Mark as falling after swapping
      }

      // Update sprite position as usual
      this.sprite.x = Math.floor(this.pos.x * scaleSize);
      this.sprite.y = Math.floor(this.pos.y * scaleSize);
    }

    updateWATER() {
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
        // let adjustedWATERtoVAPOR = WATERtoVAPOR * heightFactor * 10; // Increases transformation chance the higher the particle is

        // First, check if the space directly above is empty
        if (!this.upOccupied()) {
          // Then, apply the gate logic for possible transformation
          if (Math.random() < WATERtoVAPOR) {
            this.setMode(Mode.VAPOR);
          }
        }
      }
    }
  }

  // Setting up the simulation environment for VAPOR and EARTH particles

  // Calculate the horizontal range to confine particles within the middle seventh of the canvas
  const centerSeventhStartX = Math.floor((cols / 7) * 3);
  const centerSeventhEndX = Math.floor((cols / 7) * 4);

  // Generate VAPOR particles within this center seventh, placed in the upper third of the canvas
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 2; i++) {
    let x =
      Math.floor(Math.random() * (centerSeventhEndX - centerSeventhStartX)) +
      centerSeventhStartX;
    let y = Math.floor(Math.random() * (rows / 3)); // Positions Y within the upper third
    let particle = new Particle(x, y);
    particle.setMode(Mode.VAPOR);
    particles.push(particle);
  }

  // Generate EARTH particles
  // Adjust the number of particles to 1/5 of the original division by 10
  for (let i = 0; i < NUM_OF_STARTER_PARTICLES / 10; i++) {
    let x =
      Math.floor(Math.random() * (centerSeventhEndX - centerSeventhStartX)) +
      centerSeventhStartX;
    // Limit Y to just 1/5 of the way down from the top of the screen
    let y = Math.floor(Math.random() * (rows / 5)); // Adjusted to 1/5 from the top
    let particle = new Particle(x, y);
    particle.setMode(Mode.EARTH);
    particles.push(particle);
  }

  // The application's ticker, handling simulation updates
  app.ticker.add(() => {
    quadTree.clear(); // Clears the quadTree for the new frame
    particles.forEach((particle) => {
      // Add each particle to the quadtree with updated positions
      quadTree.addItem(particle.pos.x, particle.pos.y, particle);
    });
    particles.forEach((particle) => {
      // Update each particle's behavior based on its mode
      particle.update();
    });
  });
});
