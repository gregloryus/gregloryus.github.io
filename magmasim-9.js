let particles = [];
let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
let fadeFactor = 100,
  maxForce = 1,
  idCounter = 0;
let numofStarterParticles = 1111,
  perceptionRadius = 2,
  perceptionCount = 27;
let DIRECT_TRANSFER_PERCENT = 0.5,
  INDIRECT_TRANSFER_PERCENT = 0.25;
let heatingRate = 0.1,
  coolingRate = 0.1;
let INTERACTION_FORCE_DECAY = 0.5,
  FORCE_LINE_LENGTH = 10;
let TEMPERATURE_AVERAGING_FACTOR = 0.01; // Adjust as needed
let ATTRACTION_FORCE_MAGNITUDE = 0.1; // Adjust as needed
let heatingRangeHeight = Math.floor(rows / 2);

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  for (let i = 0; i < numofStarterParticles; i++) {
    let x = Math.floor(Math.random() * cols),
      y = Math.floor(Math.random() * rows);
    if (!isOccupied(x, y, -1)) particles.push(new Particle(x, y));
  }
}

function draw() {
  quadTree.clear();
  particles.forEach((particle) =>
    quadTree.addItem(particle.pos.x, particle.pos.y, particle)
  );
  background(0, 0, 0, fadeFactor);
  particles.forEach((particle) => particle.update());
  particles.forEach((particle) => particle.show());
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.nextPos = createVector(x, y);
    this.nextPosCCW = createVector(x, y);
    this.nextPosCW = createVector(x, y);
    this.forceMap = new Map();
    this.netForce = createVector(0, 0);
    (this.temp = 20), (this.mass = 1), (this.gravity = createVector(0, 0.1));
    (this.id = idCounter++), (this.r = 255), (this.g = 0), (this.b = 0);
    this.color = `rgb(${this.r}, ${this.g}, ${this.b})`;
    this.applyForce("gravity", this.gravity);
  }

  update() {
    for (let [sourceId, force] of this.forceMap.entries()) {
      if (sourceId !== "gravity" && sourceId !== "temp")
        force.mult(INTERACTION_FORCE_DECAY);
    }
    this.netForce.set(0, 0);
    this.resolveForces();
    this.calculateNextPosition();
    if (
      random() < min(1, this.netForce.mag() / maxForce) &&
      this.canMoveToNextPosition()
    )
      this.pos.set(this.nextPos);
    else this.distributeForcesToNeighbors();
    this.applyTemperatureForces();
    this.updateTemperature();
    this.applyAttraction();
  }

  resolveForces() {
    const forceThreshold = 1e-10;
    this.netForce.set(0, 0);
    for (let [sourceId, force] of this.forceMap.entries()) {
      if (force.magSq() < forceThreshold * forceThreshold)
        this.forceMap.delete(sourceId);
      else this.netForce.add(force);
    }
  }

  applyForce(sourceId, force) {
    const forceThreshold = 1e-10;
    if (force.magSq() < forceThreshold * forceThreshold) force.set(0, 0, 0);
    this.forceMap.set(sourceId, force);
  }

  canMoveToNextPosition() {
    return !isOccupied(this.nextPos.x, this.nextPos.y, this.id);
  }

  distributeForcesToNeighbors() {
    const forceThreshold = 1e-10;
    let directForce = p5.Vector.mult(this.netForce, DIRECT_TRANSFER_PERCENT);
    if (directForce.magSq() < forceThreshold * forceThreshold) return;
    let mainParticle = getParticleAt(this.nextPos.x, this.nextPos.y);
    if (mainParticle && mainParticle.id !== this.id)
      mainParticle.applyForce(this.id, directForce);
    const angleCCW = -PI / 4,
      angleCW = PI / 4;
    [this.nextPosCCW, this.nextPosCW].forEach((pos, index) => {
      let particle = getParticleAt(pos.x, pos.y);
      if (particle && particle.id !== this.id) {
        let indirectForce = p5.Vector.mult(
          this.netForce,
          INDIRECT_TRANSFER_PERCENT
        );
        indirectForce.rotate(index === 0 ? angleCCW : angleCW);
        if (indirectForce.magSq() >= forceThreshold * forceThreshold)
          particle.applyForce(this.id, indirectForce);
      }
    });
  }

  calculateNextPosition() {
    let direction = this.netForce.heading();
    this.nextPos = createVector(this.pos.x, this.pos.y);
    this.nextPosCCW = createVector(this.pos.x, this.pos.y);
    this.nextPosCW = createVector(this.pos.x, this.pos.y);

    // Logic for determining the next position based on the force direction
    if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
      this.nextPos.x += 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y - 1); // Up-Right
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y + 1); // Down-Right
    } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
      this.nextPos.x += 1;
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x - 1, this.nextPos.y); // Down
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y - 1); // Right
    } else if (
      direction >= (3 * Math.PI) / 8 &&
      direction < (5 * Math.PI) / 8
    ) {
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x + 1, this.nextPos.y); // Down-Right
      this.nextPosCW.set(this.nextPos.x - 1, this.nextPos.y); // Down-Left
    } else if (
      direction >= (5 * Math.PI) / 8 &&
      direction < (7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y += 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y - 1); // Left
      this.nextPosCW.set(this.nextPos.x + 1, this.nextPos.y); // Down
    } else if (
      direction >= (7 * Math.PI) / 8 ||
      direction < (-7 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y + 1); // Down-Left
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y - 1); // Up-Left
    } else if (
      direction >= (-7 * Math.PI) / 8 &&
      direction < (-5 * Math.PI) / 8
    ) {
      this.nextPos.x -= 1;
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x + 1, this.nextPos.y); // Up
      this.nextPosCW.set(this.nextPos.x, this.nextPos.y + 1); // Left
    } else if (
      direction >= (-5 * Math.PI) / 8 &&
      direction < (-3 * Math.PI) / 8
    ) {
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x - 1, this.nextPos.y); // Up-Left
      this.nextPosCW.set(this.nextPos.x + 1, this.nextPos.y); // Up-Right
    } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
      this.nextPos.x += 1;
      this.nextPos.y -= 1;
      this.nextPosCCW.set(this.nextPos.x, this.nextPos.y + 1); // Right
      this.nextPosCW.set(this.nextPos.x - 1, this.nextPos.y); // Up
    }
  }

  applyTemperatureForces() {
    if (this.temp > 50) {
      let upForceMagnitude = map(this.temp, 51, 100, 0.005, 1.0);
      let upForce = createVector(0, -upForceMagnitude);
      this.applyForce("temp", upForce);
    }
  }

  updateTemperature() {
    let heatingRangeBottom = rows - heatingRangeHeight,
      heatingRangeTop = rows;
    if (this.pos.y >= heatingRangeBottom && this.pos.y <= heatingRangeTop) {
      let heatChance = map(
        this.pos.y,
        heatingRangeBottom,
        heatingRangeTop,
        0.2,
        1.0
      );
      if (random() < heatChance * heatingRate)
        this.temp = min(this.temp + 1, 100);
    } else {
      if (random() < coolingRate) this.temp = max(this.temp - 1, 0);
    }

    // Get neighbors within a 1px radius
    let neighbors = this.getNeighbors(1);

    // Calculate average temperature with neighbors
    let totalTemp = this.temp;
    let count = 1; // Include this particle's temperature

    neighbors.forEach((neighbor) => {
      totalTemp += neighbor.temp;
      count++;
    });

    let averageTemp = totalTemp / count;

    // Adjust this particle's temperature towards the average
    this.temp += (averageTemp - this.temp) * TEMPERATURE_AVERAGING_FACTOR;
    this.temp = constrain(this.temp, 0, 100);
  }

  show() {
    let redValue = map(this.temp, 0, 100, 0, 255);
    // let forceMagnitude = this.netForce.mag() * 1000,
    let blueValue = 100;
    let greenValue = 0;
    this.color = `rgb(${redValue}, ${greenValue}, ${blueValue})`;
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
  }

  getNeighbors(radius) {
    let neighbors = [];
    const perceptionCount = (radius * 2 + 1) ** 2 - 1; // Calculate based on radius

    const items = quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      radius,
      perceptionCount
    );
    for (const item of items) {
      if (item !== this) {
        // Exclude this particle
        neighbors.push(item);
      }
    }

    return neighbors;
  }

  applyAttraction() {
    let neighbors = this.getNeighbors(2); // Get neighbors within a 2px radius

    neighbors.forEach((neighbor) => {
      let distance = p5.Vector.dist(this.pos, neighbor.pos);
      if (distance > 0 && distance <= 2) {
        let forceDirection = p5.Vector.sub(neighbor.pos, this.pos);
        let attractionForce = forceDirection.setMag(ATTRACTION_FORCE_MAGNITUDE);
        this.applyForce("attraction" + neighbor.id, attractionForce);
      }
    });
  }
}

function isOccupied(x, y, excludingParticleId) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
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
    )
      return true;
  }
  return false;
}

function getParticleAt(x, y) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
  const items = quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  );
  for (const item of items) {
    if (item.pos.x == x && item.pos.y == y) return item;
  }
  return null;
}
