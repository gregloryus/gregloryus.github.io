let x;
let y;

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

let lines = [];

function setup() {
  createCanvas(vw, vh);
  background(0);
  let line1 = new Tracer();
  lines.push(line1);
}

function draw() {
  colorMode(HSB, 100);
  let hue = ((frameCount/2) % 100);
  let saturation = lines.length
  let brightness = 50 + lines.length;
  let c = color(hue, saturation, brightness);
  const r = floor(random(4));
  let strokeW = (vw/ lines.length)
  stroke(c);
  strokeWeight(strokeW);

  frameRate()

  for (line of lines) {
    line.move();
    line.display()
  }

}

class Tracer {
  constructor(y = height, x = width/2) {
    this.x = x
    this.y = y
  }
  move() {
    let z = 1;
    // let xDistance = random((100 / lines.length)/2) 
    // let yDistance = random((100 / lines.length)/2)
    let xDistance = 1
    let yDistance = 1
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
        const newTracer = new Tracer(this.y, this.x);
        lines.push(newTracer)
        let strokeW = (vw/ lines.length)
        console.log("lines: " + lines.length)
        console.log("stroke: " + strokeW)
        if (lines.length > 1000) {
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
