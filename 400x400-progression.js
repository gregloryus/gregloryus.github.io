let x;
let y;
let z = 7;
let xDistance = z;
let yDistance = z;

let lines = [];

function setup() {
  createCanvas(300, 300);
  background(0);
  let line1 = new Tracer();
  lines.push(line1);

}

function draw() {
  colorMode(HSB, 100);
  let hue = ((frameCount) % 100);
  let saturation = 2 + 1*lines.length
  let brightness = 100;
  let c = color(hue, saturation, brightness);
  const r = floor(random(4));
  stroke(c);
  strokeWeight(500/lines.length);
  frameRate()

  for (line of lines) {
    line.move();
    line.display()
  }

}

class Tracer {
  constructor(y = 0, x = width/2) {
    this.x = x
    this.y = y
  }
  move() {
    const roll = floor(random(1,6));
    if (roll === 1) { // ++ Right-Down
      this.x = this.x + xDistance
      this.y = this.y + yDistance
    }
    if (roll === 2) { // -- Left-Down
      this.x = this.x - xDistance
      this.y = this.y + yDistance
    }
    if (roll === 3) { // +- Right-Down
      this.x = this.x + xDistance
      this.y = this.y + yDistance
    }
    if (roll === 4) { // -+ Left-Down
      this.x = this.x - xDistance
      this.y = this.y + yDistance
    }
    if (roll === 5) {
      const reroll = random(100)
      if (reroll < 1) {
        const newTracer = new Tracer(this.y, this.x);
        lines.push(newTracer)
        console.log(lines.length)
        if (lines.length > 200) {
          lines = [];
          lines.push(newTracer)
        }
      }
    }
    if (this.y > height) {
      this.y = 0;
    }
    if (this.x > width) {
      this.x = 0
    }
    if (this.x < 0) {
      this.x = width;
  }

  }
  display() {
    point(this.x, this.y)
  }
}