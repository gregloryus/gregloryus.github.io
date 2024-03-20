let particles = [];
let scaleSize = 1;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
let allowGrowth = false; // Flag to control growth on each click
let idCounter = 1;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);
  for (let i = 0; i < 50000; i++) {
    addParticle(floor(random(cols)), floor(random(rows)));
  }
}

function draw() {
  background(0, 0, 0, 100); // Clear the screen at the start of every draw call

  quadTree.clear();
  particles.forEach((particle) =>
    quadTree.addItem(particle.pos.x, particle.pos.y, particle)
  );

  particles.forEach((particle) => particle.update());
  particles.forEach((particle) => particle.show());

  fill(255, 0, 0);
  textSize(16);
  text("FPS: " + frameRate().toFixed(2), 10, height - 10);
}

function addParticle(x, y) {
  let particle = new Particle(x, y); // Pass the next available ID
  quadTree.addItem(x, y, particle); // Add to QuadTree for spatial tracking
  particles.push(particle); // Keep in particles array for rendering
}

class Particle {
  constructor(x, y) {
    this.id = idCounter++;
    this.pos = { x, y };
    this.color = "rgb(255, 255, 0)"; // Yellow
  }

  update() {
    // Random movement within bounds
    // Random movement logic
    this.pos.x += Math.floor(Math.random() * 3) - 1;
    this.pos.y += Math.floor(Math.random() * 3) - 1;
    this.pos.x = Math.min(Math.max(this.pos.x, 0), cols - 1);
    this.pos.y = Math.min(Math.max(this.pos.y, 0), rows - 1);
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
  let items = quadTree.getItemsInRadius(x, y, 1, 10);
  for (const item of items) {
    if (item.pos.x === x && item.pos.y === y) {
      return true;
    }
  }
}
