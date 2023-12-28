let particles = [];
let scaleSize = 4;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);

// Canvas and Particle Settings
const FADE_FACTOR = 100;
const MAX_FORCE = 50;

// Particle Initialization
const NUM_OF_STARTER_PARTICLES = 1111;
let idCounter = 0;

// Perception Parameters
const PERCEPTION_RADIUS = 2;
const PERCEPTION_COUNT = 100;

// Interaction Parameters
const DIRECT_TRANSFER_PERCENT = 0.5;
const INDIRECT_TRANSFER_PERCENT = 0.25;
const INTERACTION_FORCE_DECAY = 0.75;
const FORCE_LINE_LENGTH = 10;

// Temperature Control
let TEMPERATURE_FORCE_MAG = 10;
const HEATING_RATE = 0.5;
const COOLING_RATE = 0.5;
const TEMPERATURE_AVERAGING_FACTOR = 0.0001;

const bottomQuarter = rows * 0.51;
const topQuarter = rows * 0.49;

const TEMPERATURE_DIFFERENCE_THRESHOLD = 20; // Temperature difference threshold for changing attraction/repulsion behavior
const TEMPERATURE_CLOSE_THRESHOLD = 5; // Temperature difference threshold for stronger attraction
const TEMPERATURE_FAR_THRESHOLD = 10; // Temperature difference threshold for weaker attraction
const STRONG_ATTRACTION_MULTIPLIER = 10; // Multiplier for strong attraction
const WEAK_ATTRACTION_MULTIPLIER = 0.1; // Multiplier for weak attraction

// Attraction Force
const ATTRACTION_FORCE_MAGNITUDE = 1;
let ATTRACTION_RADIUS = 3;

// TWO NEW IDEAS:
// 1. Attraction force amplified if temperatures are similar
// 2. Attraction force is diminished at higher temperatures

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  for (let i = 0; i < NUM_OF_STARTER_PARTICLES; i++) {
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
  background(0, 0, 0, FADE_FACTOR);
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
    (this.temp = 50), (this.mass = 1), (this.gravity = createVector(0, 0.1));
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
      random() < min(1, this.netForce.mag() / MAX_FORCE) &&
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
    // Map the temperature to a force range, where 50 is neutral
    let tempForceMagnitude = map(
      this.temp,
      0,
      100,
      TEMPERATURE_FORCE_MAG,
      -1 * TEMPERATURE_FORCE_MAG
    );

    // Create a force vector with the calculated magnitude
    let tempForce = createVector(0, tempForceMagnitude);

    // Apply the temperature force
    this.applyForce("temp", tempForce);
  }

  updateTemperature() {
    // Determine if the particle is in the bottom quarter, top quarter, or the middle
    if (this.pos.y >= bottomQuarter) {
      // In the bottom quarter, apply heating
      let heatFactor = map(this.pos.y, bottomQuarter, rows, 0, 1);
      if (random() < HEATING_RATE * heatFactor) {
        this.temp = min(this.temp + 1, 100);
      }
    } else if (this.pos.y <= topQuarter) {
      // In the top quarter, apply cooling
      let coolFactor = map(this.pos.y, 0, topQuarter, 1, 0);
      if (random() < COOLING_RATE * coolFactor) {
        this.temp = max(this.temp - 1, 0);
      }
    }
    // No additional temperature change in the middle half

    // Average temperature with neighbors
    let neighbors = this.getNeighbors(1);
    let totalTemp = this.temp;
    let count = 1; // Include this particle's temperature
    neighbors.forEach((neighbor) => {
      totalTemp += neighbor.temp;
      count++;
    });
    let averageTemp = totalTemp / count;
    this.temp += (averageTemp - this.temp) * TEMPERATURE_AVERAGING_FACTOR;
    this.temp = constrain(this.temp, 0, 100);
  }

  show() {
    // Red value is higher when colder
    let redValue = map(this.temp, 0, 100, 150, 255);

    // Green value is higher when warmer, creating a yellowish color when combined with red
    let greenValue = map(this.temp, 0, 100, 0, 255);

    // Blue value remains minimal or zero for red to yellow transition
    let blueValue = 0;

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
    let neighbors = this.getNeighbors(ATTRACTION_RADIUS); // Get neighbors within attraction radius

    neighbors.forEach((neighbor) => {
      let distance = p5.Vector.dist(this.pos, neighbor.pos);
      if (distance > 0 && distance <= ATTRACTION_RADIUS) {
        let tempDifference = Math.abs(this.temp - neighbor.temp);
        let forceDirection = p5.Vector.sub(neighbor.pos, this.pos);

        // Determine force magnitude based on temperature difference
        let forceMagnitude;
        if (tempDifference <= TEMPERATURE_DIFFERENCE_THRESHOLD) {
          // Gradually increase attraction with closer temperatures
          forceMagnitude =
            ATTRACTION_FORCE_MAGNITUDE *
            (1 - tempDifference / TEMPERATURE_DIFFERENCE_THRESHOLD);
        } else {
          // Gradually increase repulsion with larger temperature differences
          forceMagnitude =
            -ATTRACTION_FORCE_MAGNITUDE *
            (tempDifference / TEMPERATURE_DIFFERENCE_THRESHOLD - 1);
        }

        let attractionRepulsionForce = forceDirection.setMag(forceMagnitude);
        this.applyForce("tempForce" + neighbor.id, attractionRepulsionForce);
      }
    });
  }
}

function isOccupied(x, y, excludingParticleId) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
  let items = quadTree.getItemsInRadius(
    x,
    y,
    PERCEPTION_RADIUS,
    PERCEPTION_COUNT
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
    PERCEPTION_RADIUS,
    PERCEPTION_COUNT
  );
  for (const item of items) {
    if (item.pos.x == x && item.pos.y == y) return item;
  }
  return null;
}
