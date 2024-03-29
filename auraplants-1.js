let particles = [];
let idCounter = 1;
let leftRightChoices = [-1, 1];
let threeChoices = [-1, 0, 1];
let paused = false;

let perceptionRadius = 2;
let perceptionCount = 27;

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 7;

let numOfSeeds = 1;

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  // Establishes quadtree (trying to divide width/height by scaleSize)
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  // Sets background to black
  background(0, 0, 0, 255);

  // Initializes any starter particles
  // START HERE
  // Initialize seeds at a random empty location
  for (let i = 0; i < numOfSeeds; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    let seed = new Seed(x, y);
    particles.push(seed);
  }
}

function draw() {
  // Clears quadtree
  quadTree.clear();

  // Adds all particles to quadtree
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  // Sets background to black
  background(0, 0, 0, fadeFactor);

  // Have each particle calculates its next move based on the current grid
  for (var particle of particles) {
    particle.update();
  }
  // Show each particle on canvas
  for (var particle of particles) {
    particle.show();
  }

  //   textAlign(CENTER);
  //   stroke(255, 255, 255, 255);
  //   fill(255, 0, 0, 0);
  //   text(
  //     `
  //     FPS: ${Math.floor(frameRate())}
  //     Particles: ${particles.length}
  //     All Walls Move: ${allWallsMove}
  //     `,
  //     (cols * scaleSize) / 2,
  //     (rows * scaleSize) / 20
  //   );

  //   particles = shuffle(particles);
}

// END OF LOOP

function make2DArray(w, h) {
  let arr = new Array(w);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(h);
  }
  return arr;
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.id = idCounter++;
    this.color = "White";
    this.typeModulo = 0;
    this.moduloOffset = Math.floor(Math.random() * this.typeModulo);
  }

  swapPlaces(particle) {
    if (this.isStatic || particle.isStatic) {
      return;
    }
    let thisOldX = this.pos.x;
    let thisOldY = this.pos.y;
    this.pos.x = particle.pos.x;
    this.pos.y = particle.pos.y;
    particle.pos.x = thisOldX;
    particle.pos.y = thisOldY;
    particle.updated = true;
  }

  update() {}

  show() {
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
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

  fall() {
    if (this.pos.y >= rows - 1) {
      this.isFalling = false;
      return;
    }
    let check = this.downOccupied();
    if (check == true) {
      this.isFalling = false;
      return;
    } else if (check == false) {
      this.isFalling = true;
      this.moveDown();
    }
  }

  fallLikeWater() {
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
    } else if (this.isFalling == true && this.pos.y >= rows - 1) {
      this.pos.y = 0; // loops vertically
    }
  }
}

// new plant particle class that extends Particle
class Plant extends Particle {
  constructor(x, y) {
    super(x, y);
    this.color = "Green";
  }
}

// new seed particle class extends Plant
class Seed extends Plant {
  constructor(x, y) {
    super(x, y);
    this.color = "Red";
    this.isFalling = true;
    this.hasSprouted = false;
  }

  update() {
    super.update();
    if (this.isFalling == true) {
      this.float();
    } else if (this.isFalling == false && this.hasSprouted == false) {
      this.sprout();
    }
  }

  float() {
    // seed checks below it; if occupied, it stops falling/floating; if not, it checks and if empty moves in a random cardinal direction
    if (this.pos.y < rows - 1) {
      let downCheck = this.downOccupied();
      if (downCheck) {
        this.isFalling = false;
      } else if (!downCheck) {
        // roll a random number, 20% chance to move left, 20% to move up, 20% to move right, 40% to move down
        let random = Math.random();
        if (random < 0.2) {
          // check if the space is occupied before moving
          let leftCheck = this.leftOccupied();
          if (leftCheck == false) {
            this.moveLeft();
          }
        } else if (random < 0.4) {
          let upCheck = this.upOccupied();
          if (upCheck == false) {
            this.moveUp();
          }
        } else if (random < 0.6) {
          let rightCheck = this.rightOccupied();
          if (rightCheck == false) {
            this.moveRight();
          }
        } else {
          this.moveDown();
        }
      }
    } else if (this.pos.y >= rows - 1) {
      this.isFalling = false;
    }
  }

  sprout() {
    // seed checks above it; if empty, it sprouts into a bud; if occupied, it has sprouted but failed to grow
    if (this.pos.y > 0) {
      let upCheck = this.upOccupied();
      if (upCheck == false) {
        let newBud = new Bud(this.pos.x, this.pos.y - 1);
        particles.push(newBud);
        this.hasSprouted = true;
      } else if (upCheck == true) {
        this.hasSprouted = true;
      }
    }
  }
}

// new stem particle class extends Plant
class Stem extends Plant {
  constructor(x, y) {
    super(x, y);
    this.color = "DarkGreen";
  }
}

// new bud particle class extends Plant
class Bud extends Plant {
  constructor(x, y) {
    super(x, y);
    this.color = "SpringGreen";
    this.isGrowing = true;
  }

  update() {
    super.update();
    if (this.isGrowing == true) {
      console.log("bud is growing");
      this.grow();
    }
  }

  grow() {
    // bud randomly checks up, up-left, or up-right; if empty, it moves there and leaves a stem in its place in the position it just left. If occupied, it stops growing
    let random = Math.random();
    if (random < 0.6) {
      let upCheck = this.upOccupied();
      if (upCheck == false) {
        let newStem = new Stem(this.pos.x, this.pos.y);
        this.moveUp();
        particles.push(newStem);
      } else if (upCheck == true) {
        this.isGrowing = false;
      }
    } else if (random < 0.8) {
      let upLeftCheck = this.upLeftOccupied();
      if (upLeftCheck == false) {
        let newStem = new Stem(this.pos.x, this.pos.y);
        this.moveUpLeft();
        particles.push(newStem);
      } else if (upLeftCheck == true) {
        this.isGrowing = false;
      }
    } else {
      let upRightCheck = this.upRightOccupied();
      if (upRightCheck == false) {
        let newStem = new Stem(this.pos.x, this.pos.y);
        this.moveUpRight();
        particles.push(newStem);
      } else if (upRightCheck == true) {
        this.isGrowing = false;
      }
    }
  }
}

// new leaf particle class extends Plant
class Leaf extends Plant {
  constructor(x, y) {
    super(x, y);
    this.color = "LightGreen";
  }
}

// new leaf-stem particle class extends leaf
class LeafStem extends Leaf {
  constructor(x, y) {
    super(x, y);
    this.color = "Green";
  }
}

// returns any particles in the specified area, from Quadtree
function getParticles(x, y, perceptionRadius = 2, perceptionCount = 27) {
  let itemsArray = [];

  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  )) {
    if (other) {
      if (other.pos.x == x && other.pos.y == y) {
        itemsArray.push(other);
      }
    }
  }
  return itemsArray;
}

// shuffles array in place
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    // swap elements array[i] and array[j]
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

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
