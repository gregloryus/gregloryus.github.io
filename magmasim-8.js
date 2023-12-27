let particles = [];

let scaleSize = 8;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 100;
let maxForce = 1;
let idCounter = 0;
let numofStarterParticles = 1111;
let perceptionRadius = 2;
let perceptionCount = 27;
let DIRECT_TRANSFER_PERCENT = 0.5;
let INDIRECT_TRANSFER_PERCENT = 0.25;
let INTERACTION_SCALE_FACTOR = 1; // Adjust this factor as needed
let ATTRACTION_FORCE_MAGNITUDE = 0.0; // Adjust this factor as needed
let frameRate = 60;
let heatingRate = 0.1; // Adjust as needed, higher means faster heating
let coolingRate = 0.15; // Adjust as needed, higher means faster cooling
let INTERACTION_FORCE_DECAY = 0.95; // Decay factor for interaction forces (e.g., 0.95 means 5% decay per frame)
let FORCE_LINE_LENGTH = 10; // Adjust as needed

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
  // set the framerate in p5js
  quadTree.clear();
  for (let particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }
  background(0, 0, 0, fadeFactor);

  // // First, handle interactions for all particles
  // for (let particle of particles) {
  //   particle.handleInteractions();
  // }

  // Then, update (move) all particles
  for (let particle of particles) {
    particle.update();
  }

  // Finally, display all particles
  for (let particle of particles) {
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
    // Apply decay to all interaction forces before recalculating
    for (let [sourceId, force] of this.forceMap.entries()) {
      if (sourceId !== "gravity" && sourceId !== "temp") {
        force.mult(INTERACTION_FORCE_DECAY);
        this.forceMap.set(sourceId, force);
      }
    }

    // Reset net force to zero at the start of each update
    this.netForce.set(0, 0);

    // Calculate and apply all relevant forces
    this.resolveForces();

    // Calculate the next position based on net force
    this.calculateNextPosition();

    // Calculate the chance of moving based on the force magnitude
    let moveChance = min(1, this.netForce.mag() / maxForce); // maxForce is a threshold for maximum realistic force

    // Move the particle only if the random number is less than the move chance
    if (random() < moveChance) {
      // Attempt to move the particle
      if (this.canMoveToNextPosition()) {
        this.pos.set(this.nextPos);
      }
    } else {
      // Distribute forces to neighbors even if not moving
      this.distributeForcesToNeighbors();
    }

    this.applyTemperatureForces();
    this.updateTemperature();
  }

  handleInteractions() {
    // Resolve forces based on current state
    this.resolveForces();
    // console.log(`Particle ${this.id} resolved forces:`, this.netForce);
  }

  show() {
    // Map temperature to red value (0 to 100 temperature maps to 0 to 255 in red value)
    let redValue = map(this.temp, 0, 100, 0, 255);

    // Map net force magnitude to blue value (0 to 500 force magnitude maps to 0 to 255 in blue value)
    let forceMagnitude = this.netForce.mag() * 1000;
    // let blueValue = map(min(forceMagnitude, 500), 0, 500, 0, 255);
    let blueValue = 100;
    // Set green value (can be minimal or fixed)
    let greenValue = 0;

    // Set the color
    this.color = `rgb(${redValue}, ${greenValue}, ${blueValue})`;

    // Draw the particle
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );

    // // Adjust font size based on scaleSize
    // let fontSize = max(4, scaleSize / 4); // Adjust this as needed
    // canvasContext.font = `${fontSize}px Arial`;
    // canvasContext.fillStyle = "white";
    // canvasContext.textAlign = "center";

    // // Display the magnitude of the net force
    // let forceTextYOffset =
    //   this.pos.y * scaleSize + scaleSize / 2 - fontSize / 2;
    // let displayMagnitude = Math.min(forceMagnitude, 999).toFixed(0);
    // canvasContext.fillText(
    //   `P:${displayMagnitude}`,
    //   this.pos.x * scaleSize + scaleSize / 2,
    //   forceTextYOffset
    // );

    // // Display the temperature
    // let tempTextYOffset = this.pos.y * scaleSize + scaleSize / 2 + fontSize / 2;
    // canvasContext.fillText(
    //   `T:${this.temp}`,
    //   this.pos.x * scaleSize + scaleSize / 2,
    //   tempTextYOffset
    // );

    // // Draw a line indicating the direction of the net force
    // this.drawForceDirection();
  }

  canMoveToNextPosition() {
    return !isOccupied(this.nextPos.x, this.nextPos.y, this.id);
  }

  drawForceDirection() {
    const lineLength = FORCE_LINE_LENGTH;
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
    const forceThreshold = 1e-10; // Threshold for negligible forces

    let directForce = p5.Vector.mult(this.netForce, DIRECT_TRANSFER_PERCENT);

    // If directForce is negligible, exit the function
    if (directForce.magSq() < forceThreshold * forceThreshold) {
      return; // Exit the function early
    }

    // Apply direct force to the main particle
    let mainParticle = getParticleAt(this.nextPos.x, this.nextPos.y);
    if (mainParticle && mainParticle.id !== this.id) {
      mainParticle.applyForce(this.id, directForce);
    }

    // Angles for rotation (45 degrees in radians)
    const angleCCW = -PI / 4;
    const angleCW = PI / 4;

    [this.nextPosCCW, this.nextPosCW].forEach((pos, index) => {
      let particle = getParticleAt(pos.x, pos.y);
      if (particle && particle.id !== this.id) {
        let indirectForce = p5.Vector.mult(
          this.netForce,
          INDIRECT_TRANSFER_PERCENT
        );

        // Apply rotation
        let rotationAngle = index === 0 ? angleCCW : angleCW;
        indirectForce.rotate(rotationAngle);

        // Apply indirect force if it's significant
        if (indirectForce.magSq() >= forceThreshold * forceThreshold) {
          particle.applyForce(this.id, indirectForce);
        }
      }
    });
  }

  flagNeighborsForUpdate() {
    let neighbors = getParticles(this.pos.x, this.pos.y, perceptionRadius);
    for (let neighbor of neighbors) {
      if (neighbor.id !== this.id) {
        neighbor.needsUpdate = true; // Flag neighbor for update
      }
    }
  }

  applyForce(sourceId, force) {
    const forceThreshold = 1e-10; // Threshold for negligible forces

    // If the magnitude of the force is below the threshold, set it to zero
    if (force.magSq() < forceThreshold * forceThreshold) {
      force.set(0, 0, 0);
    }

    this.forceMap.set(sourceId, force);
  }

  removeForce(sourceId) {
    this.forceMap.delete(sourceId);
  }

  resolveForces() {
    const forceThreshold = 1e-10; // Threshold for negligible forces

    this.netForce.set(0, 0, 0);
    for (let [sourceId, force] of this.forceMap.entries()) {
      // Check if the force is negligible
      if (force.magSq() < forceThreshold * forceThreshold) {
        // Remove the force from the forceMap if it's negligible
        this.forceMap.delete(sourceId);
      } else {
        // Add the force to the net force if it's significant
        this.netForce.add(force);
      }
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

  // Call this method in the update() method
  applyTemperatureForces() {
    if (this.temp > 50) {
      // Adjust the scaling to make the initial force weaker
      let upForceMagnitude = map(this.temp, 51, 100, 0.005, 1.0); // Adjust these values as needed
      let upForce = createVector(0, -upForceMagnitude);
      this.applyForce("temp", upForce);
    }
  }

  updateTemperature() {
    // Define the range for heating effect (bottom 5 rows)
    let heatingRangeBottom = rows - 5;
    let heatingRangeTop = rows;

    // Check if the particle is within the bottom 5 rows
    if (this.pos.y >= heatingRangeBottom && this.pos.y <= heatingRangeTop) {
      // Invert mapping: higher heatChance at bottom, lower at top of the heating range
      let heatChance = map(
        this.pos.y,
        heatingRangeBottom,
        heatingRangeTop,
        0.2,
        1.0
      );

      // Apply heating based on heatChance and heatingRate
      if (random() < heatChance * heatingRate) {
        this.temp = min(this.temp + 1, 100); // Cap the temperature at 100
      }
    } else {
      // Apply cooling outside the heating range
      if (random() < coolingRate) {
        this.temp = max(this.temp - 1, 0); // Ensure temperature doesn't go below 0
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
  oldNeighbors.forEach((neighbor) => {
    if (neighbor.id !== particle.id) {
      neighbor.removeForce(`${particle.id}Impacted`);
      neighbor.removeForce(`${particle.id}Attracted`);
    }
  });

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
      `Particle ${particle.id} has the following forces:\n${forceList.join(
        ",\n"
      )}`
    );
  }
}
