// Initializing various things
let pos;
let prev;
let walker;
let center;

// Creating array that will hold lines
let lines = [];

// Parameters for sliders/adjustments
let newSize = 1; // stroke size
let newOpacity = 100; // opacity of lines
let newBranch = 4; // chance of branching
let newTerm = 5; // chance of terminiating
let newDense = 2; // multiplying velocity magnitude
let newFade = 0; // how quickly old stalks fade
let newSat = 10; // how quickly saturation rises
let newStarSize = 30; // starburst size
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

  // NEXT STEPS: NEED TO CONNECT SLIDERS TO LIVE VARIABLES
  restartButton = createButton("Refresh canvas");
  restartButton.mousePressed(restartDrawing);
  saveButton = createButton("Publish seed");
  saveButton.mousePressed(saveDrawing);
  createP(`Name your settings`);
  nameInput = createInput();
  createP(`Size of lines (1-25)`);
  sizeSlider = createSlider(1, 25, 25);
  createP(`Chance of branching (0-5)`);
  branchSlider = createSlider(0, 5, 1);
  createP(`Chance of terminating (0-5)`);
  termSlider = createSlider(0, 5, 2);
  createP(`Fade old stalks (0-10)`);
  fadeSlider = createSlider(0, 10, 1);
  createP(`Line density (1-10)`);
  denseSlider = createSlider(1, 10, 1);
  createP(`Horizontal variance (1-10)`);
  horSlider = createSlider(2, 10, 2);
  createP(`Saturation added per line (0-10)`);
  satSlider = createSlider(0, 10, 2);
  createP(`Hue transition speed (1-10)`);
  hueSlider = createSlider(1, 10, 5);
  createP(`Starburst size (0-100)`);
  starSizeSlider = createSlider(0, 100, 30);
  createP(`Starburst points (2-33)`);
  starPtsSlider = createSlider(2, 33, 11);

  // noLoop();
  // setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
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
}

class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
  }

  update() {
    // creates vector pointing in random direction
    this.vel = p5.Vector.random2D();
    // multiplies vel length/magnitude
    this.vel.mult(newDense);
    // sets a vector located at the middle of the screen
    center = createVector(vw / 2, vh / 2);
    // try to create vector pointing from center to current position
    this.outgrowth = center.sub(this.pos);
    this.outgrowth.mult(-0.001);

    const roll = random(100);
    if (roll > 5) {
      this.vel.add(this.outgrowth);
      this.pos.add(this.vel);
    } else {
      const reroll = random(100);
      if (reroll < newBranch) {
        const newWalker = new Walker(this.pos.x, this.pos.y);
        lines.push(newWalker);
        console.log("new walker attempted");
        if (lines.length > 1000) {
          lines = [];
          background(0);
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
          newStarSize, // outer radius
          newStarPts // number of points
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

    if (this.pos.y > height) {
      this.pos.y = 0;
    }
    if (this.pos.y < 0) {
      this.pos.y = height;
    }
    if (this.pos.x > width) {
      this.pos.x = 0;
    }
    if (this.pos.x < 0) {
      this.pos.x = width;
    }
  }

  show() {
    colorMode(HSB, 100, 100, 100, 100);
    let hue = floor(100 * ((frameCount / 10) % 100)) / 100;
    let saturation = 10 + (lines.length * newSat) / 2;
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
