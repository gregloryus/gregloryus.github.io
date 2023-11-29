let particles = [];

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 100;
let idCounter = 0;
let numofStarterParticles = 100;
let perceptionRadius = 2;
let perceptionCount = 27;

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0, 0, 0, 255);

  for (let i = 0; i < numofStarterParticles; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    if (!isOccupied(x, y)) {
      particles.push(new Particle(x, y));
    }
  }
}

function draw() {
  quadTree.clear();
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }
  background(0, 0, 0, fadeFactor);
  for (var particle of particles) {
    particle.update();
  }
  for (var particle of particles) {
    particle.show();
  }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.allForces = [];
    this.allForcesIDs = []; // To keep track of forces' sources
    this.netForce = createVector(0, 0);
    this.temp = 20;
    this.mass = 1;
    this.id = idCounter++;
    this.r = 255;
    this.g = 0;
    this.b = 0;
    this.color = `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  applyGravity() {
    let gravity = createVector(0, 0.1);
    this.addForce("gravity", gravity);
  }

  addForce(sourceId, force) {
    if (!this.allForcesIDs.includes(sourceId)) {
      this.allForces.push(force);
      this.allForcesIDs.push(sourceId);
    }
  }

  resolveForces() {
    this.netForce = createVector(0, 0);
    for (const force of this.allForces) {
      this.netForce.add(force);
    }
  }

  moveIfNextSpaceEmpty() {
    const direction = this.netForce.heading();
    const nextPos = this.calculateNextPosition(direction);

    if (!isOccupied(nextPos.x, nextPos.y)) {
      this.pos = nextPos; // Move into the next position if it's empty
    } else {
      // If next space is occupied, apply force to the neighbor and its side neighbors
      this.applyForceToOccupiedSpace(nextPos, direction);
    }
  }

  calculateNextPosition(direction) {
    // Calculate the next position based on direction
    // Returns a p5.Vector for the next position
  }

  applyForceToOccupiedSpace(occupiedPos, direction) {
    // Identify the main occupied neighbor and the side neighbors based on direction
    // Apply 50% force to the main occupied neighbor
    // Apply 25% force to each of the side neighbors if they are occupied
    // Example for applying force:
    // let mainNeighbor = getParticleAt(occupiedPos.x, occupiedPos.y);
    // if (mainNeighbor) {
    //   let forceToApply = p5.Vector.mult(this.netForce, 0.5);
    //   mainNeighbor.addForce(this.id, forceToApply);
    // }
    // Similar logic for side neighbors
  }

  // moveIfNextSpaceEmpty() {
  //   const direction = this.netForce.heading();
  //   const nextPos = createVector(this.pos.x, this.pos.y);
  //   if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
  //     nextPos.x += 1;
  //   } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
  //     nextPos.x += 1;
  //     nextPos.y += 1;
  //   } else if (
  //     direction >= (3 * Math.PI) / 8 &&
  //     direction < (5 * Math.PI) / 8
  //   ) {
  //     nextPos.y += 1;
  //   } else if (
  //     direction >= (5 * Math.PI) / 8 &&
  //     direction < (7 * Math.PI) / 8
  //   ) {
  //     nextPos.x -= 1;
  //     nextPos.y += 1;
  //   } else if (
  //     direction >= (7 * Math.PI) / 8 ||
  //     direction < (-7 * Math.PI) / 8
  //   ) {
  //     nextPos.x -= 1;
  //   } else if (
  //     direction >= (-7 * Math.PI) / 8 &&
  //     direction < (-5 * Math.PI) / 8
  //   ) {
  //     nextPos.x -= 1;
  //     nextPos.y -= 1;
  //   } else if (
  //     direction >= (-5 * Math.PI) / 8 &&
  //     direction < (-3 * Math.PI) / 8
  //   ) {
  //     nextPos.y -= 1;
  //   } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
  //     nextPos.x += 1;
  //     nextPos.y -= 1;
  //   }
  //   if (!isOccupied(nextPos.x, nextPos.y)) {
  //     this.pos = nextPos;
  //   }
  // }

  update() {
    this.applyGravity();
    this.resolveForces();
    this.moveIfNextSpaceEmpty();
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
}

function isOccupied(x, y) {
  // Check to ensure x and y coordinates are within grid bounds
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return true; // Treat positions outside the grid as "occupied"
  }

  let itemCount = 0;
  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  )) {
    if (other && other.pos.x == x && other.pos.y == y) {
      itemCount++;
      break; // Break after finding the first occupied item
    }
  }
  return itemCount > 0; // Return true if occupied, else false
}

// Additional global functions (if needed) go here
// END
