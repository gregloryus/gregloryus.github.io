let x;
let y;
let runningCount = 1;

const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let lines = [];

let superFast = false;
let newSize = 1;
let newBranch = 1;
let newTerm = 2;
let newDense = 1;
let newFade = 1;
let newHor = 2;
let newSat = 2;
let newStarSize = 30;
let newStarPts = 11;

function setup() {
  createCanvas(vw, vh);
  background(0);
  let line1 = new Tracer();
  lines.push(line1);
  applyButton = createButton("Apply changes");
  applyButton.mousePressed(restartDrawing);
  createP(`Check this box to go super fast`);
  speedBox = createCheckbox("", false);
  createP(`Size of lines (1-25)`);
  sizeSlider = createSlider(1, 25, 1);
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
  createP(`Starburst size (0-100)`);
  starSizeSlider = createSlider(0, 100, 30);
  createP(`Starburst points (2-33)`);
  starPtsSlider = createSlider(2, 33, 11);

  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
}

function restartDrawing() {
  lines = [];
  background(0);
  lines.push(new Tracer());
  superFast = speedBox.checked();
  newSize = sizeSlider.value();
  newBranch = branchSlider.value();
  newTerm = termSlider.value();
  newFade = fadeSlider.value();
  newDense = denseSlider.value();
  newHor = horSlider.value();
  newSat = satSlider.value();
  newStarSize = starSizeSlider.value();
  newStarPts = starPtsSlider.value();
}

function draw() {
  if (superFast === true) {
    noLoop();
    setInterval(redraw, 0);
  }
  colorMode(HSB, 100);
  let hue = floor(100 * ((frameCount / 10) % 100)) / 100;
  let saturation = 10 + (lines.length * newSat) / 2;
  if (saturation > 100) {
    saturation = 100;
  }
  let brightness = 100;
  let c = color(hue, saturation, brightness);
  stroke(c);
  strokeWeight(newSize);
  textSize(16);
  text(
    `
    lines: ${lines.length}
    stalks: ${runningCount}
    hue: ${hue}
    saturation: ${saturation}
    `,
    width - width / 3,
    height / 10
  );

  for (line of lines) {
    line.move();
    line.display();
  }
}

class Tracer {
  constructor(y = height, x = width / 2) {
    this.x = x;
    this.y = y;
  }
  move() {
    let z = newDense;
    // let xDistance = random((100 / lines.length)/2)
    // let yDistance = random((100 / lines.length)/2)
    let xDistance = z * floor(random(1, newHor));
    let yDistance = z;
    const roll = floor(random(1, 12));
    if (roll === 1 || roll === 2) {
      // ++ Right-Down
      this.x = this.x + xDistance;
      this.y = this.y + yDistance;
    }
    if (roll === 3 || roll === 4 || roll == 5) {
      // -- Left-Up
      this.x = this.x - xDistance;
      this.y = this.y - yDistance;
    }
    if (roll === 6 || roll === 7 || roll === 8) {
      // +- Right-Up
      this.x = this.x + xDistance;
      this.y = this.y - yDistance;
    }
    if (roll === 9 || roll === 10) {
      // -+ Left-Down
      this.x = this.x - xDistance;
      this.y = this.y + yDistance;
    }
    if (roll === 11) {
      const reroll = random(100);
      if (reroll < newBranch) {
        const firstTracer = new Tracer(this.y, this.x);
        lines.push(firstTracer);
        let strokeW = 1;
        console.log("lines: " + lines.length);
        console.log("stroke: " + strokeW);
        if (lines.length > 1000) {
          lines = [];
          background(0);
          const nextTracer = new Tracer(height, random(width));
          lines.push(nextTracer);
        }
      }
      if (reroll > 100 - newTerm) {
        colorMode(RGB, 100, 100, 100, 1);
        stroke(color(100, 100, 100, 0.01));
        star(
          this.x, // x location
          this.y, // y location
          1, // inner radius
          newStarSize, // outer radius
          newStarPts // number of points
        );
        lines.pop(this);
        console.log("pop");
        if (lines.length === 0) {
          background(0, 0, 0, newFade / 20);
          const nextTracer = new Tracer(height, random(width));
          lines.push(nextTracer);
          runningCount++;
        }
      }
    }
    if (this.y > height) {
      this.y = 0;
    }
    if (this.y < 0) {
      this.y = height;
    }
    if (this.x > width) {
      this.x = 0;
    }
    if (this.x < 0) {
      this.x = width;
    }
  }
  display() {
    point(this.x, this.y);
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
