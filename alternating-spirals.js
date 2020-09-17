// Initializing various things
let pos;
let prev;
let walker;
let center;
let resetCounter = 1;

// Creating array that will hold lines
let lines = [];

// Parameters for sliders/adjustments
let newSize = 1; // stroke size
let newOpacity = 100; // opacity of lines
let newBranch = 7; // chance of branching
let newTerm = 3; // chance of terminiating
let newDense = 1; // multiplying velocity magnitude
let newFade = 5; // how quickly old stalks fade
let newSat = 5; // how quickly saturation rises
let newStarSize = 11; // starburst size
let newStarPts = 11; // starburst points

// Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

// p5 setup, runs once when page is loaded
function setup() {
  createCanvas(vw, vh);
  walker = new Walker(vw / 2, vh / 2);
  lines.push(walker);
  background(0);
  noLoop();
  setInterval(redraw, 10); // where 10 is the minimum time between frames in ms
}

// p5 draw, loops infinitely
function draw() {
  // // This part makes it go super fast, comment out to go back to normal
  // noLoop();
  // setInterval(redraw, 0);

  for (walker of lines) {
    walker.update();
    walker.show();
  }

  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  background(0, 0, 0, 1 + lines.length / 1000);
  text(`${lines.length * Math.pow(-1, resetCounter + 1)}`, vw / 2, vh / 2);
}

class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.in = 1;
  }

  update() {
    // creates vector pointing in random direction
    this.vel = p5.Vector.random2D();
    this.vel.normalize();
    this.vel.setMag(1);
    // multiplies vel length/magnitude
    this.vel.mult(newDense);
    // sets a vector located at the middle of the screen
    center = createVector(vw / 2, vh / 2);
    // try to create vector pointing from center to current position
    this.outgrowth = center.sub(this.pos);
    this.outgrowth.mult(-0.007);
    this.outgrowth.mult(this.in);

    const roll = random(100);

    if (roll > 5) {
      this.vel.add(this.outgrowth);
      if (roll > 50) {
        this.vel.rotate(
          90 * Math.pow(-1, 1 + resetCounter) * Math.pow(this.in, resetCounter)
        );
      }
      this.pos.add(this.vel);
    } else {
      const reroll = random(100);
      if (reroll < newBranch) {
        const newWalker = new Walker(this.pos.x, this.pos.y);
        lines.push(newWalker);
        console.log("new walker attempted");
        if (lines.length > 10000) {
          lines = [];
          background(0);
          resetCounter++;
          const nextWalker = new Walker(vw / 2, vh / 2);
          lines.push(nextWalker);
        }
      }
      if (reroll > 100 - newTerm) {
        colorMode(RGB, 100, 100, 100, 1);
        stroke(color(100, 100, 100, 0.01));
        star(
          this.pos.x, // x location
          this.pos.y, // y location
          1, // inner radius
          random(newStarSize) + lines.length / 10, // outer radius
          random(newStarPts) + lines.length / 20 // number of points
        );
        lines.pop(this);
        console.log("pop");
        if (lines.length === 0) {
          background(0, 0, 0, newFade / 20);
          const nextWalker = new Walker(vw / 2, vh / 2);
          lines.push(nextWalker);
        }
      }
    }
    // if (
    //   this.pos.y > height ||
    //   this.pos.y < 0 ||
    //   this.pos.x > width ||
    //   this.pos.x < 0
    // ) {
    //   lines = [];
    //   background(0, 0, 0, newFade / 20);
    //   const nextWalker = new Walker(vw / 2, vh / 2);
    //   lines.push(nextWalker);
    // }
    if (this.pos.y > height) {
      this.pos.y = 0;
      this.in = -1;
    }
    if (this.pos.y < 0) {
      this.pos.y = height;
      this.in = -1;
    }
    if (this.pos.x > width) {
      this.pos.x = 0;
      this.in = -1;
    }
    if (this.pos.x < 0) {
      this.pos.x = width;
      this.in = -1;
    }
    if (this.in === -1) {
      if (
        this.pos.y < height / 2 + height / 25 &&
        this.pos.y > height / 2 - height / 25 &&
        this.pos.x < width / 2 + width / 25 &&
        this.pos.x > width / 2 - width / 25
      ) {
        this.in = 1;
      }
    }
  }

  show() {
    colorMode(HSB, 100, 100, 100, 100);
    let hue = floor(100 * ((frameCount / 5) % 100)) / 100;
    let saturation = 20 + (lines.length * newSat) / 2;
    if (saturation > 100) {
      saturation = 100;
    }
    let brightness = 100;
    let opacity = newOpacity;
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(newSize);
    point(this.pos.x, this.pos.y);
  }
}
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}
