// Initializing various things
let coralStrokeSize = 2;
let coralDist = 2;

let pos;
let prev;
let walker;
let center;
let resetCounter = 1;
let sun;
let releaseSpeed = 5;
let frozen = false;

// Creating array that will hold lines
let lines = [];
let tree = [];

// Parameters for sliders/adjustments
let newSize = 1; // stroke size
let newOpacity = 40; // opacity of lines
let numOfLines = 512;

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
  sun.r = width / 20;
  lines.push(sun);

  for (i = 0; i < 10; i++) {
    coral = new Walker(width / 2, height - i);
    coral.water = false;
    coral.fire = false;
    coral.stuck = true;
    coral.rand = random(100);
    tree.push(coral);
  }

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
  if (frozen) {
    return;
  }

  // // This part makes it go super fast, comment out to go back to normal
  // noLoop();
  // setInterval(redraw, 0);

  // if (frameCount % 500 === 499) {
  //   // console.log("500 draws")
  //   // console.log(lines)
  // }

  if (frameCount % releaseSpeed === 1 && lines.length < numOfLines) {
    walker = new Walker(width / 2, height/2);
    lines.push(walker);
  }

  for (walker of lines) {
    walker.update();
    walker.show();
  }

  for (walker of tree) {
    walker.show();
    if (walker.pos.y < height / 4) {
      frozen = true;
      stroke(51, 100, 100, 100);
      strokeWeight(4);
      line(0, 0, width, 0);
      line(width, 0, width, height);
      line(width, height, 0, height);
      line(0, height, 0, 0);
    }
  }

  for (var i = 0; i < lines.length; i++) {
    for (var j = 0; j < tree.length; j++) {
      if (
        checkDist(lines[i].pos, tree[j].pos) &&
        lines[i].pos.y > height / 4 - 2
      ) {
        lines[i].stuck = true;
        lines[i].rand = random(100);
        tree.push(lines[i]);
        lines.splice(i, 1);
        lines.push(new Walker(random(width), 0));
      }
    }
  }
  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  if (frameCount % 20 === 1) {
    background(0, 0, 0, 5);
    // stroke(100, 0, 0, 100);
    // line(0, height, width, height);
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
    this.stuck = false;
    this.rand = Math.random();
  }

  update() {
    if (this.stuck) {
      return;
    }

    //if you're in the upper 3/4 of the canvas, you lose heat faster as your height rises
    if (this.pos.y < (height / 4) * 3) {
      this.temp = this.temp - (height - this.pos.y) / height / 2;
    }

    //if you're in the bottom 4thth of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + (((this.pos.y - (height / 4) * 3) / height / 4) * 3) / 2;
    }

    // if you're near the sun, you get hotter
    if (this.water) {
      this.sunDist = this.pos.dist(lines[0].pos);
      if (this.sunDist < lines[0].r * 3) {
        this.temp = this.temp + (width / 4 - this.sunDist) / 1000;
        if (this.sunDist < lines[0].r * 2) {
          this.temp = this.temp + (width / 4 - this.sunDist) / 200;
          if (this.sunDist < lines[0].r + 1) {
            this.temp = this.temp + (width / 4 - this.sunDist) / 150;
          }
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
      if (this.pos.x > (width / 10) * 4.5 && this.pos.x < (width / 10) * 5.5) {
        this.stuck = true;
        tree.push(this);
        lines.push(new Walker(width / 2, height / 2));
        return;
      }
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
      strokeWeight(this.r * 2);
      point(this.pos.x, this.pos.y);
    } else {
      // let hue = 50 + Math.abs(15 - (frameCount/50 % 30))
      let hue = this.hue;
      let saturation = 100;
      // let saturation = 100 - this.vel.magSq() * 25;
      let brightness = 100;
      let opacity = newOpacity;

      if (this.stuck) {
        colorMode(HSB, 360, 100, 100, 100);
        hue = 4.11;
        saturation = 50 + Math.abs(25 - ((frameCount + this.rand) % 150));
        brightness = 100;
        opacity = 100;
      }

      let c = color(hue, saturation, brightness, opacity);
      stroke(c);
      strokeWeight(newSize);
      if (this.stuck) {
        strokeWeight(coralStrokeSize - random(2));
      }
      if (this.stuck) {
        point(this.pos.x, this.pos.y);
      } else {
        point(this.pos.x, this.pos.y);
      }
    }
  }
}

function checkDist(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  if (Math.abs(dx) <= coralDist && Math.abs(dy) <= coralDist) {
    return true;
  }
}

function mouseClicked() {
  let sun = lines[0];
  lines = [];
  lines.push(sun);
  tree = [];
  for (i = 0; i < 10; i++) {
    coral = new Walker(width / 2, height - i);
    coral.water = false;
    coral.fire = false;
    coral.stuck = true;
    tree.push(coral);
  }
  frozen = false;
}
