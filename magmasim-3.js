let particles = [];

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 100;
let idCounter = 0;
let numofStarterParticles = 3;
let perceptionRadius = 2;
let perceptionCount = 27;
let DIRECT_TRANSFER_PERCENT = 0.5;
let INDIRECT_TRANSFER_PERCENT = 0.25;

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0, 0, 0, 255);

  for (let i = 0; i < numofStarterParticles; i++) {
    let x = 10;
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

  // Shuffle the particles array
  shuffle(particles);

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
    this.nextPos = createVector(x, y);
    this.nextPosCCW = createVector(x, y);
    this.nextPosCW = createVector(x, y);
    this.allForces = [];
    this.allForcesIDs = [];
    this.netForce = createVector(0, 0);
    this.temp = 20;
    this.mass = 1;
    this.gravity = createVector(0, 0.1);
    this.id = idCounter++;
    this.r = 255;
    this.g = 0;
    this.b = 0;
    this.color = `rgb(${this.r}, ${this.g}, ${this.b})`;

    // Initial application of gravity
    this.addForce("gravity", this.gravity);
  }

  update() {
    // Add up all forces, saved to this.force
    this.resolveForces();
    // Calculate the next position, saved to this.nextPos
    this.calculateNextPosition();
    // Move to the next position if it is not occupied
    if (!isOccupied(this.nextPos.x, this.nextPos.y)) {
      this.pos = this.nextPos;
    }
    // If the next position is occupied, apply force to the occupied space
    else {
      this.applyForceToOtherParticles();
    }
  }

  show() {
    // Calculate color based on the magnitude of the net force
    let forceMagnitude = this.netForce.mag() * 1000; // Scale factor of 1000
    let redValue = 255;
    let greenValue = max(165 - forceMagnitude / 3.3, 0); // Adjusted for new scale
    let blueValue = 0;

    this.color = `rgb(${redValue}, ${greenValue}, ${blueValue})`;

    // Draw the particle
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );

    // Display the magnitude of the net force in black for better readability
    let displayMagnitude = Math.min(forceMagnitude, 999); // Cap the displayed value at 999
    canvasContext.fillStyle = "black";
    canvasContext.font = "7px Arial";
    canvasContext.textAlign = "center";
    canvasContext.fillText(
      displayMagnitude.toFixed(0), // Display as an integer
      this.pos.x * scaleSize + scaleSize / 2,
      this.pos.y * scaleSize + scaleSize / 2 + 3
    );

    // Draw a line indicating the direction of the net force
    this.drawForceDirection();
  }

  drawForceDirection() {
    const lineLength = 5; // Adjust length as needed
    const centerX = this.pos.x * scaleSize + scaleSize / 2;
    const centerY = this.pos.y * scaleSize + scaleSize / 2;
    const endX = centerX + lineLength * Math.cos(this.netForce.heading());
    const endY = centerY + lineLength * Math.sin(this.netForce.heading());

    canvasContext.beginPath();
    canvasContext.moveTo(centerX, centerY);
    canvasContext.lineTo(endX, endY);
    canvasContext.strokeStyle = "blue";
    canvasContext.lineWidth = 1;
    canvasContext.stroke();
  }

  addForce(sourceId, force) {
    if (!this.allForcesIDs.includes(sourceId)) {
      this.allForces.push(force);
      this.allForcesIDs.push(sourceId);
      console.log(`Particle ${this.id} added force: `, force);
    }
  }

  resolveForces() {
    this.netForce = createVector(0, 0);
    for (const force of this.allForces) {
      this.netForce.add(force);
    }
  }

  calculateNextPosition() {
    // Calculate the next position based on direction
    let direction = this.netForce.heading();
    this.nextPos = createVector(this.pos.x, this.pos.y);
    this.nextPosCCW = createVector(this.pos.x, this.pos.y);
    this.nextPosCW = createVector(this.pos.x, this.pos.y);

    if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
      // Right
      this.nextPos.x += 1;
      this.nextPosCCW.set(this.pos.x + 1, this.pos.y - 1); // Up-Right
      this.nextPosCW.set(this.pos.x + 1, this.pos.y + 1); // Down-Right
    } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
      // Down-Right
      this.nextPos.set(this.pos.x + 1, this.pos.y + 1);
      this.nextPosCCW.set(this.pos.x + 1, this.pos.y); // Right
      this.nextPosCW.set(this.pos.x, this.pos.y + 1); // Down
    } else if (
      direction >= (3 * Math.PI) / 8 &&
      direction < (5 * Math.PI) / 8
    ) {
      // Down
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.pos.x + 1, this.pos.y + 1); // Down-Right
      this.nextPosCW.set(this.pos.x - 1, this.pos.y + 1); // Down-Left
    } else if (
      direction >= (5 * Math.PI) / 8 &&
      direction < (7 * Math.PI) / 8
    ) {
      // Down-Left
      this.nextPos.set(this.pos.x - 1, this.pos.y + 1);
      this.nextPosCCW.set(this.pos.x, this.pos.y + 1); // Down
      this.nextPosCW.set(this.pos.x - 1, this.pos.y); // Left
    } else if (
      direction >= (7 * Math.PI) / 8 ||
      direction < (-7 * Math.PI) / 8
    ) {
      // Left
      this.nextPos.x -= 1;
      this.nextPosCCW.set(this.pos.x - 1, this.pos.y + 1); // Down-Left
      this.nextPosCW.set(this.pos.x - 1, this.pos.y - 1); // Up-Left
    } else if (
      direction >= (-7 * Math.PI) / 8 &&
      direction < (-5 * Math.PI) / 8
    ) {
      // Up-Left
      this.nextPos.set(this.pos.x - 1, this.pos.y - 1);
      this.nextPosCCW.set(this.pos.x - 1, this.pos.y); // Left
      this.nextPosCW.set(this.pos.x, this.pos.y - 1); // Up
    } else if (
      direction >= (-5 * Math.PI) / 8 &&
      direction < (-3 * Math.PI) / 8
    ) {
      // Up
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.pos.x - 1, this.pos.y - 1); // Up-Left
      this.nextPosCW.set(this.pos.x + 1, this.pos.y - 1); // Up-Right
    } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
      // Up-Right
      this.nextPos.set(this.pos.x + 1, this.pos.y - 1);
      this.nextPosCCW.set(this.pos.x, this.pos.y - 1); // Up
      this.nextPosCW.set(this.pos.x + 1, this.pos.y); // Right
    }
  }

  applyForceToOtherParticles() {
    // Apply direct force to the main particle
    let mainParticle = getParticleAt(this.nextPos.x, this.nextPos.y);
    if (mainParticle) {
      let directForce = p5.Vector.mult(this.netForce, DIRECT_TRANSFER_PERCENT);
      mainParticle.addForce(this.id, directForce);
    }

    // Apply indirect force to the counter-clockwise neighbor
    let ccwParticle = getParticleAt(this.nextPosCCW.x, this.nextPosCCW.y);
    if (ccwParticle) {
      let ccwForce = p5.Vector.mult(this.netForce, INDIRECT_TRANSFER_PERCENT);
      ccwParticle.addForce(this.id, ccwForce);
    }

    // Apply indirect force to the clockwise neighbor
    let cwParticle = getParticleAt(this.nextPosCW.x, this.nextPosCW.y);
    if (cwParticle) {
      let cwForce = p5.Vector.mult(this.netForce, INDIRECT_TRANSFER_PERCENT);
      cwParticle.addForce(this.id, cwForce);
    }
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

function getParticleAt(x, y) {
  // Ensure the coordinates are within bounds
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return null;
  }

  // Get particles in the vicinity of (x, y)
  const items = quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  );
  for (const item of items) {
    if (item.pos.x == x && item.pos.y == y) {
      return item; // Return the first particle found at the exact position
    }
  }

  return null; // Return null if no particle is found at the position
}

// Helper function to shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

// Additional global functions (if needed) go here
// END
