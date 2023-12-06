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
let INTERACTION_SCALE_FACTOR = 2; // Adjust this factor as needed

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
    this.forceMap = new Map(); // Replaces allForces and allForcesIDs
    this.netForce = createVector(0, 0);
    this.momentumForce = createVector(0, 0); // ??? Maybe implement later; past force could be dampened by a factor of 0.9 or something
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
    this.applyForce("gravity", this.gravity);
  }

  update() {
    if (this.needsUpdate) {
      // Store the previous position
      this.previousPos = this.pos.copy();

      // Resolve forces from the forceMap
      this.resolveForces();
      this.calculateNextPosition();

      if (this.canMoveToNextPosition()) {
        // Move the particles
        this.pos.set(this.nextPos);

        // Distribute forces to neighbors at the new position
        this.distributeForcesToNeighbors();

        // Flag new neighbors for update
        this.flagNeighborsForUpdate();

        // Update forceMap for old neighbors since the particle has moved
        updateParticleForces(this);
      } else {
        // If the particle can't move, it has hit another particle
        this.distributeForcesToNeighbors(); // Transfer force once

        // The particle becomes static until further notice
        this.needsUpdate = false;
      }
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

    // Adjust font size based on scaleSize
    let fontSize = max(3, scaleSize / 3); // Adjust this as needed
    canvasContext.font = `${fontSize}px Arial`;
    canvasContext.fillStyle = "black";
    canvasContext.textAlign = "center";

    // Display the magnitude of the net force
    let displayMagnitude = Math.min(forceMagnitude, 999).toFixed(0);
    let textYOffset = this.pos.y * scaleSize + scaleSize / 2 - fontSize / 2;
    canvasContext.fillText(
      displayMagnitude,
      this.pos.x * scaleSize + scaleSize / 2,
      textYOffset
    );

    // Display the particle's ID
    let idYOffset = this.pos.y * scaleSize + scaleSize / 2 + fontSize;
    canvasContext.fillText(
      this.id,
      this.pos.x * scaleSize + scaleSize / 2,
      idYOffset
    );

    // Draw a line indicating the direction of the net force
    this.drawForceDirection();
  }

  canMoveToNextPosition() {
    return !isOccupied(this.nextPos.x, this.nextPos.y, this.id);
  }

  drawForceDirection() {
    const lineLength = 3;
    const centerX = this.pos.x * scaleSize + scaleSize / 2;
    const centerY = this.pos.y * scaleSize + scaleSize / 2;
    const endX = centerX + lineLength * Math.cos(this.netForce.heading());
    const endY = centerY + lineLength * Math.sin(this.netForce.heading());

    // Draw the line
    canvasContext.beginPath();
    canvasContext.moveTo(centerX, centerY);
    canvasContext.lineTo(endX, endY);
    canvasContext.strokeStyle = "rgba(255, 255, 255, 0.25)"; // Blue with 50% transparency
    canvasContext.lineWidth = 1;
    canvasContext.stroke();

    // Draw a bigger dot at the non-center end of the line
    const dotRadius = 1.25; // Adjust the size as needed
    canvasContext.beginPath();
    canvasContext.arc(endX, endY, dotRadius, 0, 2 * Math.PI);
    canvasContext.fillStyle = "rgba(255, 255, 255, 0.25)"; // Same color as the line
    canvasContext.fill();
  }

  calculateNextPosition() {
    let direction = this.netForce.heading();
    this.nextPos = createVector(this.pos.x, this.pos.y);
    this.nextPosCCW = createVector(this.pos.x, this.pos.y);
    this.nextPosCW = createVector(this.pos.x, this.pos.y);

    // Right
    if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
      this.nextPos.x += 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y - 1); // Up-Right
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y + 1); // Down-Right

      // Down-Right
    } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
      this.nextPos.x += 1;
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x - 1, this.nextPos.y); // Down
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y - 1); // Right

      // Down
    } else if (
      direction >= (3 * Math.PI) / 8 &&
      direction < (5 * Math.PI) / 8
    ) {
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x + 1, this.nextPos.y); // Down-Right
      this.nextPosCW.set(this.nextPos.x - 1, this.nextPos.y); // Down-Left

      // Down-Left
    } else if (
      direction >= (5 * Math.PI) / 8 &&
      direction < (7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y - 1); // Left
      this.nextPosCW.set(this.nextPos.x + 1, this.nextPos.y); // Down

      // Left
    } else if (
      direction >= (7 * Math.PI) / 8 ||
      direction < (-7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y + 1); // Down-Left
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y - 1); // Up-Left

      // Up-Left
    } else if (
      direction >= (-7 * Math.PI) / 8 &&
      direction < (-5 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x + 1, this.nextPos.y); // Up
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y + 1); // Left

      // Up
    } else if (
      direction >= (-5 * Math.PI) / 8 &&
      direction < (-3 * Math.PI) / 8
    ) {
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x - 1, this.nextPos.y); // Up-Left
      this.nextPosCW.set(this.nextPos.x + 1, this.nextPos.y); // Up-Right

      // Up-Right
    } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
      this.nextPos.x += 1;
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y + 1); // Right
      this.nextPosCW.set(this.nextPos.x - 1, this.nextPos.y); // Up
    }
  }

  distributeForcesToNeighbors() {
    let directForce = p5.Vector.mult(this.netForce, DIRECT_TRANSFER_PERCENT);
    let indirectForce = p5.Vector.mult(
      this.netForce,
      INDIRECT_TRANSFER_PERCENT
    );

    let mainParticle = getParticleAt(this.nextPos.x, this.nextPos.y);
    if (mainParticle && mainParticle.id !== this.id) {
      mainParticle.applyForce(this.id, directForce);
    }

    let ccwParticle = getParticleAt(this.nextPosCCW.x, this.nextPosCCW.y);
    let cwParticle = getParticleAt(this.nextPosCW.x, this.nextPosCW.y);
    [ccwParticle, cwParticle].forEach((particle) => {
      if (particle && particle.id !== this.id) {
        particle.applyForce(this.id, indirectForce);
      }
    });
  }

  // distributeForcesToNeighbors() {
  //   let neighbors = getMooreNeighbors(this);

  //   for (const neighbor of neighbors) {
  //     if (neighbor.id !== this.id) {
  //       let interactionForce = calculateInteractionForce(this, neighbor);
  //       this.forceMap.set(neighbor.id, interactionForce);
  //       neighbor.forceMap.set(this.id, interactionForce.copy().mult(-1)); // Equal and opposite force
  //     }
  //   }
  // }

  flagNeighborsForUpdate() {
    let neighbors = getParticles(this.pos.x, this.pos.y, perceptionRadius);
    for (let neighbor of neighbors) {
      if (neighbor.id !== this.id) {
        neighbor.needsUpdate = true; // Flag neighbor for update
      }
    }
  }

  applyForce(sourceId, force) {
    this.forceMap.set(sourceId, force);
  }

  removeForce(sourceId) {
    this.forceMap.delete(sourceId);
  }

  resolveForces() {
    this.netForce.set(0, 0);
    for (let force of this.forceMap.values()) {
      this.netForce.add(force);
    }
  }

  getMooreNeighbors() {
    this.mooreNeighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the particle itself
        let neighbor = getParticleAt(this.pos.x + dx, this.pos.y + dy);
        if (neighbor) {
          this.mooreNeighbors.push(neighbor);
        }
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

function getMooreNeighbors(particle) {
  let mooreNeighbors = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip the particle itself
      let neighbor = getParticleAt(particle.pos.x + dx, particle.pos.y + dy);
      if (neighbor) {
        mooreNeighbors.push(neighbor);
      }
    }
  }
  return mooreNeighbors;
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

// Call this when a particle moves
function updateParticleForces(particle) {
  // Remove particle's influence from old neighbors
  let oldNeighbors = getParticles(
    particle.previousPos.x,
    particle.previousPos.y,
    perceptionRadius
  );
  oldNeighbors.forEach((neighbor) => neighbor.removeForce(particle.id));

  // Apply new forces to current neighbors
  particle.distributeForcesToNeighbors();
}

// Call this when a particle is removed
function removeParticle(particleId) {
  particles = particles.filter((p) => p.id !== particleId);
  particles.forEach((p) => p.removeForce(particleId));
}

function mousePressed() {
  // Have each particle console log its component forces and ids
  for (const particle of particles) {
    // Have each particle flagged as needs update
    particle.needsUpdate = true;
    // Have each particle give a neatly formatted list of its forces, including an announcement of which particle it itself is first
    let forceList = [];
    for (const [id, force] of particle.forceMap.entries()) {
      forceList.push(`${id}: ${force}`);
    }
    console.log(
      `Particle ${particle.id} has the following forces: ${forceList.join(
        ", "
      )}`
    );
  }
}

function calculateInteractionForce(particle1, particle2) {
  // Combine net forces and scale them down
  let combinedForce = p5.Vector.add(particle1.netForce, particle2.netForce).div(
    INTERACTION_SCALE_FACTOR
  );
  return combinedForce;
}
