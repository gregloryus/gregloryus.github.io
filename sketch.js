let x;
let y;


let lines = [];

function setup() {
  createCanvas(500, 500);
  background(0);
  let line1 = new Tracer();
  lines.push(line1);

}

function draw() {
  colorMode(HSB, 100);
  let hue = ((frameCount) % 100);
  let saturation = lines.length
  let brightness = 100;
  let c = color(hue, saturation, brightness);
  const r = floor(random(4));
  let strokeW = (300 / lines.length)
  stroke(c);
  strokeWeight(strokeW);

  frameRate()

  for (line of lines) {
    line.move();
    line.display()
  }

}

class Tracer {
  constructor(y = height/2, x = width/2) {
    this.x = x
    this.y = y
  }
  move() {
    let z = 1;
    let xDistance = random((300 / lines.length)/2) 
    let yDistance = random((300 / lines.length)/2)
    // let xDistance = random(25);
    // let yDistance = random(35);
    const roll = floor(random(1,6));
    if (roll === 1) { // ++ Right-Down
      this.x = this.x + xDistance * 2
      this.y = this.y + yDistance
    }
    if (roll === 2) { // -- Left-Down
      this.x = this.x - xDistance * 2
      this.y = this.y - yDistance * 2
    }
    if (roll === 3) { // +- Right-Down
      this.x = this.x + xDistance * 2
      this.y = this.y - yDistance * 2
    }
    if (roll === 4) { // -+ Left-Down
      this.x = this.x - xDistance * 2
      this.y = this.y + yDistance
    }
    if (roll === 5) {
      const reroll = random(100)
      if (reroll < 1) {
        const newTracer = new Tracer(this.y - random(25), this.x);
        lines.push(newTracer)
        let strokeW = (300 / lines.length)
        console.log("lines: " + lines.length)
        console.log("stroke: " + strokeW)
        if (lines.length > 500) {
          lines = [];
          lines.push(newTracer)
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
