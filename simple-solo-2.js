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
  let hue = ((lines.length*5  % 100))
  let saturation = 5 + lines.length*3;
  let brightness = 100;
  let c = color(hue, saturation, brightness);
  const r = floor(random(4));
  let strokeW = 1
  stroke(c);
  strokeWeight(1);

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
    let xDistance = z
    let yDistance = z
    const roll = floor(random(1,12));
    if (roll === 1 || roll === 2) { // ++ Right-Down
      this.x = this.x + xDistance
      this.y = this.y + yDistance
    }
    if (roll === 3 || roll === 4 || roll == 5) { // -- Left-Up
      this.x = this.x - xDistance 
      this.y = this.y - yDistance
    }
    if (roll === 6 || roll === 7 || roll === 8) { // +- Right-Up
      this.x = this.x + xDistance 
      this.y = this.y - yDistance
    }
    if (roll === 9 || roll === 10) { // -+ Left-Down
      this.x = this.x - xDistance 
      this.y = this.y + yDistance
    }
    if (roll === 11) {
      const reroll = random(100)
      if (reroll < 1) {
        const newTracer = new Tracer(this.y, this.x);
        lines.push(newTracer)
        let strokeW = 1
        console.log("lines: " + lines.length)
        console.log("stroke: " + strokeW)
        if (lines.length > 1000) {
          lines = [];
          background(0);
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
    Text("testing", width/2, height/2)
  }
}
