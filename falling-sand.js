let particles = [];
let quadTree;

// let canvas;
// let canvasContext;

let paused = false;

//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

// //turns off descriptive errors that add computing costs
// p5.disableFriendlyErrors = true;

// SLIDERS
let scaleNum = Math.min(vw, vh) / 100;

// DECLARATIONS

// ORIGINAL
function setup() {
  createCanvas(vw, vh);
  width = width / scaleNum;
  height = height / scaleNum;

  // frameRate(5);
  colorMode(HSB, 1, 1, 1, 1);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  for (i = 0; i < 100; i++) {
    let sand = new Sand(random(width), random(height));
    particles.push(sand);
  }

  background(0);
  angleMode(DEGREES);
}

function draw() {
  scale(scaleNum);
  // scale(10);
  // noSmooth();

  // clears the quadtree and adds particles
  quadTree.clear();
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  background(0, 0, 0, 10);
  for (var particle of particles) {
    particle.update();
    particle.show();
  }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    //qualities
    this.size = 1;
    this.falling = false;

    //visuals
    this.hue = 0.17;
    this.sat = 1;
    this.brightness = 1;
    this.opacity = 1;
  }

  update() {
    this.pos.x = Math.floor(this.pos.x);
    this.pos.y = Math.floor(this.pos.y);
    if (this.pos.y > height) {
      this.pos.y = height;
      this.falling = false;
    }
  }

  show() {
    colorMode(HSB, 1, 1, 1, 1);
    //applies the color
    let c = color(this.hue, this.sat, this.brightness, this.opacity);
    stroke(c);
    //sets the size
    strokeWeight(1);
    //prints a point
    point(this.pos.x, this.pos.y);
  }
}

class Sand extends Particle {
  constructor(x, y) {
    super(x, y);
    this.falling = true;
    this.sand = true;
  }

  fall() {
    // if (!this.falling) {
    //   return;
    // }
    this.pos.y = this.pos.y + 1;

    let perceptionRadius = this.size;
    let perceptionCount = 5;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y + 1,
      perceptionRadius,
      perceptionCount
    )) {
      if (other.sand) {
        this.falling = false;
      }
    }
  }

  update() {
    super.update();
    if (this.falling) {
      this.fall();
    }
  }
  show() {
    super.show();
  }
}

function mouseClicked() {
  for (i = 0; i < 25; i++) {
    let sand = new Sand(random(width), random(height));
    particles.push(sand);
  }
}
