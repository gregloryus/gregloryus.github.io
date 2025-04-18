let x;
let y;
let runningCount = 1

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

let lines = [];

function setup() {
  createCanvas(vw, vh);
  background(0);
  let line1 = new Tracer();
  lines.push(line1);
  frameRate()
  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
}

function draw() {
  colorMode(HSB, 100);
  let hue = floor(100*(frameCount/10 % 100))/100;
  let saturation = 10 + lines.length*2;
  if (saturation > 100) {
    saturation = 100
  }
  let brightness = 100;
  let c = color(hue, saturation, brightness);
  const r = floor(random(4));
  let strokeW = 1
  stroke(c);
  strokeWeight(1);
  textSize(16)
  text(
    `
    lines: ${lines.length}
    hue: ${hue}
    saturation: ${saturation}
    count: ${runningCount}
    `, width - width/3, height/10)

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
      if (reroll < 1 + runningCount/5) {
        const firstTracer = new Tracer(this.y, this.x);
        lines.push(firstTracer)
        let strokeW = 1
        console.log("lines: " + lines.length)
        console.log("stroke: " + strokeW)
        if (lines.length > 10000) {
          lines = [];
          background(0);
        }
      }
      if (reroll > 97) {
        colorMode(RGB, 100, 100, 100, 1)
        stroke(color(100, 100, 100, .01))
        star(this.x, this.y, 1, 9 + runningCount*2, 11+runningCount%100)
        lines.pop(this)
        console.log("pop")
        if (lines.length === 0) {
          const nextTracer = new Tracer(height, random(width))
          lines.push(nextTracer)
          runningCount++
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
