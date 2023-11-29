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
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    if (!isOccupied(x, y, -1)) {
      // Pass -1 to indicate no particle to exclude
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
    this.needsUpdate = true;

    // Initial application of gravity
    this.addForce("gravity", this.gravity);
  }

  update() {
    if (this.needsUpdate) {
      this.resolveForces();
      this.calculateNextPosition();
      if (this.canMoveToNextPosition()) {
        this.pos.set(this.nextPos); // Move particle if the next position is not occupied
      } else {
        this.applyForceToOtherParticles();
        this.needsUpdate = false; // Reset update flag
      }
      this.flagNeighborsForUpdate();
    }
  }

  show() {
    // Calculate color based on the magnitude of the net force
    let forceMagnitude = this.netForce.mag() * 1000;
    let redValue = 255;
    let greenValue = max(165 - forceMagnitude / 3.3, 0);
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
    let displayMagnitude = Math.min(forceMagnitude, 999);
    canvasContext.fillStyle = "black";
    canvasContext.font = "7px Arial";
    canvasContext.textAlign = "center";
    canvasContext.fillText(
      displayMagnitude.toFixed(0),
      this.pos.x * scaleSize + scaleSize / 2,
      this.pos.y * scaleSize + scaleSize / 2 + 3
    );

    // Draw a line indicating the direction of the net force
    this.drawForceDirection();
  }

  canMoveToNextPosition() {
    return !isOccupied(this.nextPos.x, this.nextPos.y, this.id);
  }

  drawForceDirection() {
    const lineLength = 5;
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
    // Check if the sourceId is not already included and if the force is different
    const existingIndex = this.allForcesIDs.indexOf(sourceId);
    if (existingIndex === -1 || !this.allForces[existingIndex].equals(force)) {
      if (existingIndex !== -1) {
        // Replace the existing force from the same source
        this.allForces[existingIndex] = force;
      } else {
        // Add new force and its source ID
        this.allForces.push(force);
        this.allForcesIDs.push(sourceId);
      }
      console.log(
        `Particle ${this.id} added/updated force from ${sourceId}: `,
        force
      );
      this.needsUpdate = true; // Flag for update due to new/changed force
    }
  }

  resolveForces() {
    this.netForce = createVector(0, 0);
    for (const force of this.allForces) {
      this.netForce.add(force);
    }
  }

  calculateNextPosition() {
    let direction = this.netForce.heading();
    this.nextPos = createVector(this.pos.x, this.pos.y);
    this.nextPosCCW = createVector(this.pos.x, this.pos.y);
    this.nextPosCW = createVector(this.pos.x, this.pos.y);

    // Logic to calculate the next position based on the force direction
    if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
      this.nextPos.x += 1; // Right
      // Set CCW and CW positions
    } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
      this.nextPos.x += 1;
      this.nextPos.y += 1; // Down-Right
      // Set CCW and CW positions
    } else if (
      direction >= (3 * Math.PI) / 8 &&
      direction < (5 * Math.PI) / 8
    ) {
      this.nextPos.y += 1; // Down
      // Set CCW and CW positions
    } else if (
      direction >= (5 * Math.PI) / 8 &&
      direction < (7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y += 1; // Down-Left
      // Set CCW and CW positions
    } else if (
      direction >= (7 * Math.PI) / 8 ||
      direction < (-7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1; // Left
      // Set CCW and CW positions
    } else if (
      direction >= (-7 * Math.PI) / 8 &&
      direction < (-5 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y -= 1; // Up-Left
      // Set CCW and CW positions
    } else if (
      direction >= (-5 * Math.PI) / 8 &&
      direction < (-3 * Math.PI) / 8
    ) {
      this.nextPos.y -= 1; // Up
      // Set CCW and CW positions
    } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
      this.nextPos.x += 1;
      this.nextPos.y -= 1; // Up-Right
      // Set CCW and CW positions
    }
  }

  applyForceToOtherParticles() {
    let mainParticle = getParticleAt(this.nextPos.x, this.nextPos.y);
    if (mainParticle) {
      let directForce = p5.Vector.mult(this.netForce, DIRECT_TRANSFER_PERCENT);
      mainParticle.addForce(this.id, directForce);
    }

    let ccwParticle = getParticleAt(this.nextPosCCW.x, this.nextPosCCW.y);
    if (ccwParticle) {
      let ccwForce = p5.Vector.mult(this.netForce, INDIRECT_TRANSFER_PERCENT);
      ccwParticle.addForce(this.id, ccwForce);
    }

    let cwParticle = getParticleAt(this.nextPosCW.x, this.nextPosCW.y);
    if (cwParticle) {
      let cwForce = p5.Vector.mult(this.netForce, INDIRECT_TRANSFER_PERCENT);
      cwParticle.addForce(this.id, cwForce);
    }
  }

  flagNeighborsForUpdate() {
    let neighbors = getParticles(this.pos.x, this.pos.y, perceptionRadius);
    for (let neighbor of neighbors) {
      if (neighbor.id !== this.id) {
        neighbor.needsUpdate = true; // Flag neighbor for update
      }
    }
  }
}

function isOccupied(x, y, excludingParticleId) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return true; // Position is outside the grid
  }

  let items = quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  );
  for (const item of items) {
    if (
      item &&
      item.pos.x == x &&
      item.pos.y == y &&
      item.id !== excludingParticleId
    ) {
      return true; // Position is occupied by a different particle
    }
  }
  return false; // Position is not occupied
}

function getParticleAt(x, y) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return null;
  }

  const items = quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  );
  for (const item of items) {
    if (item.pos.x == x && item.pos.y == y) {
      return item;
    }
  }

  return null;
}

function getParticles(x, y, radius) {
  let itemsArray = [];
  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    radius,
    perceptionCount
  )) {
    if (other) {
      itemsArray.push(other);
    }
  }
  return itemsArray;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Additional global functions (if needed) go here
// END
