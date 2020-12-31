// Initializing various things
let pos;
let prev;
let walker;
let center;
let resetCounter = 1;
let sun;
let releaseSpeed = 3;

// Creating array that will hold lines
let lines = [];

// Parameters for sliders/adjustments
let newSize = 1; // stroke size
let newOpacity = 10; // opacity of lines
let numOfLines = 999;

let newBranch = 0; // chance of branching
let newTerm = 5; // chance of terminiating
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

  sun = new Walker(width / 2, (height / 4) * 3);
  sun.water = false;
  sun.fire = true;
  sun.temp = 200;
  lines.push(sun);

  //   walker = new Walker(width/2, 0);
  //   lines.push(walker);

  background(0);
  noLoop();

  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
  // console.log("end setup")
  // console.log(lines)
}

// p5 draw, loops infinitely
function draw() {
  // // This part makes it go super fast, comment out to go back to normal
  // noLoop();
  // setInterval(redraw, 0);

  // if (frameCount % 500 === 499) {
  //   // console.log("500 draws")
  //   // console.log(lines)
  // }

  if (frameCount % releaseSpeed === 1 && lines.length < numOfLines) {
    walker = new Walker((width / 7) * 3 + random(width / 7), 0);
    lines.push(walker);
  }

  for (walker of lines) {
    walker.update();
    walker.show();
  }

  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  if (frameCount % 50 === 1) {
    background(0, 0, 0, 5);
    stroke(100, 0, 0, 100);
    line(0, height, width, height);
  }

  // text(`${floor(noise(frameCount/500)*1000)}`, vw / 2, vh / 4 * 3);
}

class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.water = true;
    this.fire = false;
    this.hue = 66;
    this.temp = 100;
    this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
    this.acc = 0;
  }

  update() {
    //if you're in the upper 3/4 of the canvas, you lose heat faster as your height rises
    if (this.pos.y < (height / 4) * 3) {
      this.temp = this.temp - (height - this.pos.y) / height / 3;
    }

    //if you're in the bottom 4thth of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + (((this.pos.y - (height / 4) * 3) / height / 4) * 3) / 2;
    }

    // if you're near the sun, you get hotter
    if (this.water) {
      if (this.pos.dist(lines[0].pos) < width / 4) {
        this.temp = this.temp + (width / 4 - this.pos.dist(lines[0].pos)) / 60;
        if (this.pos.dist(lines[0].pos) < width / 20) {
          this.temp =
            this.temp + (width / 5 - this.pos.dist(lines[0].pos)) / 200;
        }
      }
    }

    let waterCurrent = noise(frameCount / 500 + this.pos.y / 100);
    let gravCurrent = noise(12345 + frameCount / 500 + this.pos.x / 100);

    // this.hue = 100 - waterCurrent*30 - gravCurrent*30
    this.hue = 50 + this.temp / 8;

    let noisyLeft = p5.Vector.fromAngle(TWO_PI * 0.5, 1 + waterCurrent);
    let noisyRight = p5.Vector.fromAngle(TWO_PI * 1.0, 2 - waterCurrent);

    let noisyUp = p5.Vector.fromAngle(TWO_PI * 0.75, 0 + gravCurrent);
    let noisyDown = p5.Vector.fromAngle(TWO_PI * 0.25, 1 + 1 - gravCurrent);

    if (this.water) {
      // creates vector pointing in random direction
      this.vel = p5.Vector.random2D();
      this.vel.normalize();
      this.vel.setMag(1);
      // multiplies vel length/magnitude
      // this.vel.mult(newDense);
      // sets a vector located at the middle of the screen
      this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
      if (this.in === -1) {
        this.uplift = p5.Vector.fromAngle(TWO_PI * 0.25, 5);
      }
    }
    if (this.water) {
      this.tides = noisyLeft.add(noisyRight);
      this.vel.add(this.tides);
      this.gravity = noisyUp.add(
        noisyDown.setMag((height - this.pos.y) / height + (1 - gravCurrent))
      );

      this.vel.add(this.gravity);

      //if you're in the bottom 10th, get pushed up more the lower you go
      if (this.pos.y > height - height / 10) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
        up.setMag(1 * (this.pos.y / height - 0.9));
        this.vel.add(up);
      }

      //if you're in the right 4th, get pushed left the righter you go
      if (this.pos.x > width - width / 4) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.5, 1);
        up.setMag(1 * (this.pos.x / width - 0.75));
        this.vel.add(up);
      }

      if (this.pos.x < width / 4) {
        let up = p5.Vector.fromAngle(TWO_PI * 1.0, 1);
        up.setMag(1 * ((width - this.pos.x) / width - 0.75));
        this.vel.add(up);
      }

      //if your temp is over 100, you go up -- if it's under, you go down
      this.vel.add(this.uplift.setMag(this.temp / 100 - 1));
    }

    // this.wind = p5.Vector.random2D();
    // this.wind.normalize()
    // this.wind.setMag(1)

    // this.vel = this.vel * (1 + this.acc/100)
    // this.acc = this.acc - 1

    this.pos.add(this.vel);

    // else {
    //   const reroll = random(100);
    //   if (reroll < newBranch && this.in === 1) {
    //     const newWalker = new Walker(this.pos.x, this.pos.y);
    //     lines.push(newWalker);
    //     if (lines.length > 500) {
    //       lines = [];
    //       background(0);
    //       resetCounter++;
    //       const nextWalker = new Walker(vw / 2, vh);
    //       lines.push(nextWalker);
    //     }
    //   }
    //   if (reroll > 100 - newTerm) {
    //     colorMode(RGB, 100, 100, 100, 1);
    //     stroke(color(100, 100, 100, 0.01));
    //     star(
    //       this.pos.x, // x location
    //       this.pos.y, // y location
    //       1, // inner radius
    //       random(newStarSize) * 2 , // outer radius
    //       random(newStarPts)  * 2 // number of points
    //     );
    //     let newWalker = new Walker(this.pos.x, this.pos.y);
    //     lines.push(newWalker)
    //     lines.push(newWalker)
    //     console.log(`new lines, ${lines.length} lines`)
    //     lines.splice(lines.indexOf(this), 1)
    //     console.log(`lost line, ${lines.length} lines`);
    //     if (lines.length === 0) {
    //       background(0, 0, 0, 0.1);
    //       const nextWalker = new Walker(vw / 2, vh);
    //       lines.push(nextWalker);
    //     }
    //   }
    // }
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
      this.pos.y = height;
    }
    if (this.pos.y < 0) {
      this.pos.y = 0;
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
    if (this.fire === true) {
      let hue = 13;
      let saturation = 100;
      // let saturation = 100 - this.vel.magSq() * 25;
      let brightness = 100;
      let opacity = 5;
      let c = color(hue, saturation, brightness, opacity);
      stroke(c);
      strokeWeight(width / 10);
      point(this.pos.x, this.pos.y);
    } else {
      // let hue = 50 + Math.abs(15 - (frameCount/50 % 30))
      let hue = this.hue;
      let saturation = 100;
      // let saturation = 100 - this.vel.magSq() * 25;
      let brightness = 100;
      let opacity = newOpacity;
      let c = color(hue, saturation, brightness, opacity);
      stroke(c);
      strokeWeight(newSize);
      point(this.pos.x, this.pos.y);
    }
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

function mouseClicked() {
  walker = new Walker(
    lines[lines.length - 1].pos.x,
    lines[lines.length - 1].pos.y
  );
  lines.push(walker);
}
