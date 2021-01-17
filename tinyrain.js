//DECLARATIONS

let lines = [];
let tree = [];
//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

//SLIDERS

let numOfLines = 244;
let releaseSpeed = 2;
let canvasSize = 333;
let scaleNum = Math.min(vw, vh) / 100;

let plantAge = 1000;

let fadeRate = 4;

let vaporCount = 0;
let rain = false;
let frozen = false;
let treeBuilt = false;

let rainStart = (numOfLines * 4) / 3;
let rainStop = numOfLines / 3;

let newOpacity = 100; // opacity of lines
let newSize = 1; // stroke size

//P5 STUFF

// p5 setup, runs once when page loads
function setup() {
  createCanvas(vw, vh);
  background(0);

  width = width / scaleNum;
  height = height / scaleNum;

  noLoop();
  setInterval(redraw, 0); // where 10 is the minimum time between frames in ms
}

// p5 draw, loops forever
function draw() {
  scale(scaleNum);

  line(width / 3, height, width / 3, (height / 10) * 9);
  line((width / 3) * 2, height, (width / 3) * 2, (height / 10) * 9);
  // translate(vw/2, vh/2)

  if (!treeBuilt) {
    for (i = 0; i < 5; i++) {
      coral = new Walker(width / 2, height - i);
      coral.water = false;
      coral.stuck = true;
      coral.rand = random(100);
      tree.push(coral);
      console.log("tree built?!");
    }
    treeBuilt = true;
  }

  tree[tree.length - 1].stuckAge = 1;

  //releases a set number of lines from the center of screen
  if (frameCount % releaseSpeed === 1 && lines.length < numOfLines) {
    walker = new Walker(width, (height / 10) * 9);
    lines.push(walker);
  }

  //determines when it rains
  if (vaporCount > rainStart) {
    rain = true;
  }
  if (vaporCount < rainStop) {
    rain = false;
  }

  //if it's raining, for every line, check it against every line, and if both lines are vapor and in the upper 4th and the lines aren't the same line, then condensate
  if (rain) {
    for (var i = 0; i < lines.length; i++) {
      for (var j = 0; j < lines.length; j++) {
        if (
          lines[j].vapor &&
          lines[i].vapor &&
          lines[i].pos.y < height / 4 &&
          lines[j].pos.y < height / 4 &&
          i !== j
        ) {
          if (checkDist(lines[i].pos, lines[j].pos)) {
            let roll = random(100);
            if (roll < 1) {
              lines[i].vapor = false;
              lines[i].temp = 0;
              lines.splice(j, 1);
              console.log("vapor turned to water");
              vaporCount = vaporCount - 2;
            }
          }
        }
      }
    }
  }

  //have each line update and show
  for (var walker of lines) {
    walker.update();
    walker.show();
  }

  for (walker of tree) {
    walker.show();
  }

  for (var i = 0; i < lines.length; i++) {
    for (var j = 0; j < tree.length; j++) {
      if (
        tree[j].stuckAge < plantAge &&
        checkDist(lines[i].pos, tree[j].pos) &&
        lines[i].pos.y > height / 2 &&
        lines[i].pos.x > 5 &&
        lines[i].pos.x < width - 5
      ) {
        lines[i].stuck = true;
        lines[i].rand = random(100);
        tree.push(lines[i]);
        lines.splice(i, 1);
        lines.push(new Walker(0, height));
        console.log("something stuck!!");
      }
    }
  }

  colorMode(RGB, 100, 100, 100, 100);
  stroke(color(100, 100, 100, 100));
  text(`${lines.length - vaporCount}`, width / 2, height / 2);
  text(`${vaporCount}`, width / 2, height / 2 - 20);
  if (frameCount % fadeRate === 1) {
    background(0, 0, 0, 5);
  }
  // background(0,0,0,3)
}

//WALKER CLASS
class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.water = true;
    this.fire = false;
    this.hue = 1;
    this.temp = 0;
    this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
    this.acc = 0;
    this.stuck = false;
    this.rand = Math.random();
    this.sat = 100;
    this.vapor = false;
    this.stuckAge = 0;
  }

  update() {
    if (this.stuck) {
      return;
    }
    //if your temp is over 125, turn into 2 vapors
    if (this.temp > 125 && !this.vapor) {
      let roll = random(10);
      if (roll < 1 + this.temp / 100) {
        this.vapor = true;
        vaporCount++;
        this.temp = 300;
        let newVapor = new Walker(this.pos.x, this.pos.y);
        newVapor.vapor = true;
        vaporCount++;
        newVapor.temp = 300;
        lines.push(newVapor);
      }
    }

    //if you're in the upper 9/10th of the canvas and not vapor, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9 && this.vapor === false) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 3;
    }

    //if you're vapor below the top 10th, you gain heat
    if (this.pos.y > height / 10 && this.vapor) {
      this.temp = this.temp + 1;
    }

    //if you're vapor within the top 10th, you lose heat
    if (this.pos.y < height / 10 && this.vapor) {
      this.temp = this.temp - 1;
    }

    let waterCurrent = noise(frameCount / 500 + this.pos.y * 0.05);
    let gravCurrent = noise(12345 + frameCount / 500 + this.pos.x * 0.05);

    this.hue = 50 + this.temp / 8;

    let noisyLeft = p5.Vector.fromAngle(TWO_PI * 0.5, 1 + waterCurrent);
    let noisyRight = p5.Vector.fromAngle(TWO_PI * 1.0, 2 - waterCurrent);

    let noisyUp = p5.Vector.fromAngle(TWO_PI * 0.75, 1 + gravCurrent);
    let noisyDown = p5.Vector.fromAngle(TWO_PI * 0.25, 2 - gravCurrent);

    // HEY HEY HEY I STOPPED AROUND HERE

    if (this.water) {
      // creates vector pointing in random direction
      this.vel = p5.Vector.random2D();
      this.vel.normalize();
      this.vel.setMag(1);
      this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
      this.downlift = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
    }
    if (this.water) {
      this.vel.add(noisyLeft.add(noisyRight));
      this.vel.add(noisyUp.add(noisyDown));

      this.vel.add(this.downlift.setMag(0.5));

      // if (this.temp < 1) {
      // }
      //if you're in the bottom 10th, get pushed up more the lower you go
      if (this.pos.y > height - height / 10) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
        up.setMag(10 * (this.pos.y / height - 0.9));
        this.vel.add(up);
      }

      if (this.pos.y > height / 10 && this.vapor) {
        let down = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
        down.setMag(10 * ((height - this.pos.y) / height - 0.9));
        this.vel.add(down);
      }

      if (this.pos.y > height / 2) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
        up.setMag(1.5 * (1 / this.pos.y));
        this.vel.add(up);
      }

      //if you're in the right 3rd, get pushed right the lefter you go
      if (!this.vapor && this.pos.x > (width / 3) * 2) {
        let up = p5.Vector.fromAngle(TWO_PI * 1.0, 1);
        up.setMag(1 - this.pos.x / width);
        this.vel.add(up);
      }

      //if you're in the left 3rd, get pushed left the righter you go; when you're totally left, no extra push
      if (!this.vapor && this.pos.x < width / 3) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.5, 1);
        up.setMag(this.pos.x / width);
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
    // }\\\

    //if you're liquid water and you're in the left quarter, you can't move right of the right-side-border of the left quarter
    if (
      !this.vapor &&
      this.pos.x < width / 3 &&
      this.pos.y > (height / 10) * 9
    ) {
      if (this.pos.x > width / 3 - 2) {
        this.pos.x = width / 3 - 2;
      }
    }
    if (
      !this.vapor &&
      this.pos.x > (width / 3) * 2 &&
      this.pos.y > (height / 10) * 9
    ) {
      if (this.pos.x < (width / 3) * 2 + 2) {
        this.pos.x = (width / 3) * 2 + 2;
      }
    }

    if (this.pos.y > height - 1) {
      this.pos.y = height - 1;
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
    if (this.temp < 0) {
      this.temp = 0;
    }
  }

  show() {
    colorMode(HSB, 100, 100, 100, 100);

    // let hue = 50 + Math.abs(15 - (frameCount/50 % 30))
    let hue = this.hue;
    let saturation = this.sat;
    // let saturation = 100 - this.vel.magSq() * 25;
    let brightness = 100;
    let opacity = newOpacity;

    if (this.stuck) {
      colorMode(HSB, 360, 100, 100, 100);
      hue = 144;
      saturation = 50 + Math.abs(25 - ((frameCount + this.rand) % 150));
      brightness = 30;
      if (this.stuckAge < plantAge) {
        this.stuckAge++;
        brightness = 100 - (this.stuckAge / plantAge) * 70;
      }
      opacity = 100;
    }

    if (this.vapor) {
      saturation = 0;
      opacity = 1;
    }
    if (!this.vapor && this.water) {
      saturation = this.sat;
    }
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(newSize);
    // if (this.vapor) {
    //   stroke(66, 0, 100, 0.2)
    //   strokeWeight(1 + (height-this.pos.y)/10)
    // }
    point(this.pos.x, this.pos.y);
    if (this.vapor) {
      stroke(1, 0, 100, 5 + (height - this.pos.y));
      strokeWeight(1);
      point(this.pos.x, this.pos.y);
    }
    // text(`${floor(this.temp)}`, this.pos.x, this.pos.y)
  }
}

function checkDist(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  if (Math.abs(dx) <= 1.1 && Math.abs(dy) <= 1.1) {
    return true;
  }
}
