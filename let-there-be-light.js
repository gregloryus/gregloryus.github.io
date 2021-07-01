// creates the lines array where all particles will dwell
let lines = [];
let numOfLight = 10000;
let lightSize = 2;
let lightOpacity = 100; //opacity of light (20 min)
let lightSpeed = 4; // speed of light

//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

function setup() {
  createCanvas(vw, vh);

  // creates the light
  for (i = 0; i < numOfLight; i++) {
    let light = new Walker(-100, -100);
    light.offscreen = true;
    lines.push(light);
    console.log("light made");
  }
}

function draw() {
  background(0);

  for (var walker of lines) {
    walker.update();
    walker.show();
  }
}

//WALKER CLASS
class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y); // location
    this.hue = 17;
    this.sat = 100;
    this.brightness = 100;
    this.opacity = lightOpacity;
    this.size = lightSize;
    this.stuck = false;
    this.vel = p5.Vector.random2D();
    this.return = false;
  }

  update() {
    if (mouseIsPressed) {
      if (this.offscreen) {
        this.pos = createVector(mouseX, mouseY);
        this.offscreen = false;
        this.vel = p5.Vector.random2D();
      }
    } else {
      if (this.offscreen) {
        return;
      }
    }

    this.vel.setMag(lightSpeed);
    this.pos.add(this.vel);

    if (
      (!this.offscreen && this.pos.x > width) ||
      this.pos.x < 0 ||
      this.pos.y > height ||
      this.pos.y < 0
    ) {
      this.offscreen = true;
    }
  }

  show() {
    //sets the color mode; applies hue, saturation, brightness, opacity
    colorMode(HSB, 100, 100, 100, 100);
    let c = color(this.hue, this.sat, this.brightness, this.opacity);
    stroke(c);

    //sets the size
    strokeWeight(this.size);

    //prints a point
    point(this.pos.x, this.pos.y);
  }
}
