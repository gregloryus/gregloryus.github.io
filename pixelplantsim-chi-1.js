let particles = [];
let idCounter = 1;
let leftRightChoices = [-1, 1];
let threeChoices = [-1, 0, 1];
let paused = false;
let pauseFlagged;

let perceptionRadius = 2;
let perceptionCount = 27;

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let growthOptions = [-1, 0, 0, 0, 1];

// GLOBAL SLIDERS
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

  // Initializes any starter particle seeds
  for (let i = 0; i < numOfSeeds; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    particles.push(new Seed(x, y));
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
  background(0, 0, 0, 255);

  // Have each particle calculates its next move based on the current grid
  for (var particle of particles) {
    particle.update();
  }

  // Show each particle on canvas
  for (var particle of particles) {
    particle.show();
  }

  textAlign(CENTER);
  stroke(255, 0, 255, 255);
  fill(255, 0, 0, 0);
  text(
    `
    FPS: ${Math.floor(frameRate())}
    Particles: ${particles.length}
    `,
    (cols * scaleSize) / 2,
    (rows * scaleSize) / 20
  );
  paused = true;

  particles = shuffle(particles);
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

    this.id = idCounter;
    idCounter++;

    this.color = "White";
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

  update() {
    let selfOccupied = this.selfOccupied();
    if (selfOccupied) {
      this.moveUp();
      return;
    }
  }

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
}

class Seed extends Particle {
  constructor(x, y) {
    super(x, y);
    this.color = "Red";
    this.isFalling = true;
    this.hasSprouted = false;
  }

  update() {
    super.update();
    if (this.isFalling) {
      this.fall();
    } else if (!this.hasSprouted) {
      this.sprout();
    }
  }

  sprout() {
    // Check if up if occupied; if not, sprout
    let check = this.upOccupied();
    if (check == false) {
      let bud = new Bud(this.pos.x, this.pos.y - 1);
      particles.push(bud);
      this.hasSprouted = true;
    }
  }
}

class Bud extends Particle {
  constructor(x, y) {
    super(x, y);
    this.color = "Chartreuse";
    this.isGrowing = true;
    this.growthCountdown = 10;
    this.lastGrowthDirection = 0;
  }

  update() {
    super.update();
    if (this.isGrowing && this.growthCountdown > 0) {
      if (this.growthCountdown > 1) {
        this.growthCountdown--;
        return;
      } else if (this.growthCountdown == 1) {
        this.growthCountdown--;
        this.grow();
      }
    }
  }

  grow() {
    // Choose a random direction from a pool of growth options (growthOptions)
    let growthDirection = random(growthOptions);

    // If growthDirection is not 0 and is the same as lastGrowthDirection, break
    if (growthDirection !== 0 && growthDirection == this.lastGrowthDirection) {
      return;
    }

    // Check if the chosen direction is occupied; if not, grow
    let check = isOccupied(this.pos.x + growthDirection, this.pos.y - 1);
    if (check == false) {
      this.color = "DarkGreen";
      this.isGrowing = false;
      this.lastGrowthDirection = growthDirection;
      let bud = new Bud(this.pos.x + growthDirection, this.pos.y - 1);
      particles.push(bud);
    }
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
