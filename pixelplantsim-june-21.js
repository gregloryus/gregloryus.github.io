// Define canvas dimensions
const canvasWidth = 800;
const canvasHeight = 600;

// Create canvas element and add to DOM
const canvas = document.createElement("canvas");
canvas.width = canvasWidth;
canvas.height = canvasHeight;
document.body.appendChild(canvas);

// Get canvas context
const ctx = canvas.getContext("2d");

// Define Particle class
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.color = {
      r: random(255),
      g: random(255),
      b: random(255),
      a: 255,
    };
    this.density = 0.5;
    this.isLight = false;
    this.radius = 5;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
    ctx.fill();
  }

  checkCollision(particles) {
    // TODO: Implement collision detection using QuadTree
  }
}

// Define QuadTree class
class QuadTree {
  constructor(bounds, capacity) {
    this.bounds = bounds;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  subdivide() {
    // TODO: Implement QuadTree subdivision
  }

  insert(point) {
    // TODO: Implement QuadTree insertion
  }

  query(range, found) {
    // TODO: Implement QuadTree range query
  }
}

// Create array of particles
const particles = [];
for (let i = 0; i < 1000; i++) {
  particles.push(new Particle(random(canvasWidth), random(canvasHeight)));
}

// Update and render particles each frame
function update() {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Update particles
  for (const particle of particles) {
    particle.update();
    particle.show();
  }

  // Request next frame
  requestAnimationFrame(update);
}

// Start animation loop
requestAnimationFrame(update);
