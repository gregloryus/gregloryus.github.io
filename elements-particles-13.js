let earthInvisible = false;
let earthOpacity = 0.5;
let plantOpacity = 0.0;
let repelChance = 1;

// let minDem = Math.min(vw, vh);

//WALKER CLASS
class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.water = true;
    this.earth = false;
    this.fire = false;
    this.hue = 1;
    this.temp = random(150, 500);
    this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
    this.downlift = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
    this.acc = createVector();
    this.vel = p5.Vector.random2D();
    this.vel.normalize();
    this.vel.setMag(1);
    this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
    this.downlift = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
    this.stuck = false;
    this.rand = Math.random();
    this.sat = 100;
    this.vapor = false;
    this.age = 0;
    this.ageLimit = 1000 + random(1000);
    this.size = 1;

    this.brightness = 100;
    this.saturation = 100;
    this.opacity = 10;

    this.stuck = false;

    this.role = 0;
  }

  update() {
    // temp roles
    // if (this.role === 1) {
    //   this.temp = 0;
    // } else if (this.role === 2) {
    //   this.temp = 300;
    // }

    if (this.stuck) {
      return;
    }

    this.age++;

    // if you're in the upper 9/10th of the canvas and not vapor, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 15;
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
      // if (this.pos.y > height - height / 10) {
      //   let up = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
      //   up.setMag(10 * (this.pos.y / height - 0.9));
      //   this.vel.add(up);
      // }

      if (this.pos.y > height / 2) {
        let up = p5.Vector.fromAngle(TWO_PI * 0.25, 1);
        up.setMag(1 * (1 / this.pos.y));
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

    // VELOCITY ENGINE HERE

    this.vel.add(this.acc);
    this.acc.mult(0.99);
    this.vel.mult(0.5);

    this.pos.add(this.vel);

    if (this.pos.y > height - 1) {
      this.pos.y = 0;
    }
    if (this.pos.y < 0) {
      this.pos.y = height;
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
    this.hue = 50 + this.temp / 8;
    this.hue360 = map(this.hue, 0, 100, 0, 360);
    if (this.stuck) {
      this.hue360 = 116;
    }

    // colorMode(HSB, 100, 100, 100, 100);

    // water color = red per heat, green empty, blue full
    this.color = `hsl(${this.hue360},100%,50%,${waterOpacity})`;
    canvasContext.fillStyle = this.color;

    canvasContext.fillRect(this.pos.x, this.pos.y, 1, 1);
  }
}

class Plant extends Walker {
  constructor(x, y) {
    super(x, y);
    this.plant = true;
    this.water = false;
    this.hosting = 0;

    this.size = 1;
    this.age = 0;
  }

  findNewNode() {}

  grow() {
    if (this.hosting < 1) {
      let perceptionRadius = this.size * 3;
      let perceptionCount = 100;

      for (const other of quadTree.getItemsInRadius(
        this.pos.x,
        this.pos.y,
        perceptionRadius,
        perceptionCount
      )) {
        if (
          other !== this &&
          other.water &&
          // ensures the particle is at least 2 px away
          dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) > 2
        ) {
          if (checkNoNeighbors(this.pos.x, this.pos.y, 4, 4) > 1) {
            // first water particle in this radius is replaced with a plant, connected
            let newPlant = new Plant(other.pos.x, other.pos.y);
            lines.splice(lines.indexOf(other), 1);
            lines.push(newPlant);
            console.log("new plant?");
            this.hosting++;
          }
        }
      }
    }
  }

  growNode() {}

  update() {
    this.age++;
    if ((this.hosting < 1) & (this.age > 144)) {
      this.growNode();
    }
    if (this.hosting < 0 && this.age > 100) {
      this.grow();
    }
  }

  show() {
    this.hue360 = 116;
    // water color = red per heat, green empty, blue full
    this.color = `hsl(${this.hue360},100%,50%,${plantOpacity})`;
    canvasContext.fillStyle = this.color;

    canvasContext.fillRect(this.pos.x, this.pos.y, this.size, this.size);
  }
}

class Earth extends Walker {
  constructor(x, y) {
    super(x, y);
    this.earth = true;
    this.water = false;
    this.temp = random(0.4, 0.6);
    this.size = random(minDem / earthMin, minDem / earthMax);
    this.opacity = earthOpacity;
    this.brightness = 1;

    this.static = false;
    this.hosting = 0;
  }

  update() {
    if (Math.random() < repelChance) {
      this.repelWater();
    }
    if (this.static) {
      return;
    }

    // if (frameCount > 2000) {
    //   this.static = true;
    // }

    // if you're in the upper 9/10th of the canvas, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 3;
    }

    // // // earth gravity
    // this.acc.add(p5.Vector.fromAngle(TWO_PI * 0.25, 0.001));

    // VELOCITY ENGINE HERE

    this.vel.add(this.acc);
    this.acc.mult(0.99);
    this.vel.mult(0.5);

    this.pos.add(this.vel);

    // earth doesn't wrap up/down like water does
    // if (this.pos.y > height - 1) {
    //   this.pos.y = height - 1;
    // }

    if (this.pos.y + this.size > height - 1) {
      this.pos.y = height - 1 - this.size;
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

    // // earth repels water
    // this.repelWater();

    // earth repels water, randomly
  }

  repelWater() {
    let perceptionRadius = this.size * 0.5;
    let perceptionCount = 100;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      let dragForce = p5.Vector.sub(other.pos, this.pos);
      dragForce.mult(0.2);

      other.acc.add(dragForce);
      other.acc.mult((perceptionRadius - d) / perceptionRadius);
      other.acc.limit(10);

      if (other.water) {
        let pushForce = other.vel.copy();

        let rockWidth = minDem / this.size;

        // let rockWidthSq = rockWidth * rockWidth;

        pushForce.mult(0.002);

        pushForce.mult(rockWidth);

        this.vel.add(pushForce);
      }

      // //erosion happens here, water erodes rock, chance to shrink
      // if (other !== this && other.water) {
      //   if (Math.random() > 0.99) {
      //     this.size = this.size - 1;
      //     if (this.size < 4) {
      //       this.size = 4;
      //     }
      //   }
      // }

      // // creates a plant!

      // if (this.static && this.hosting < 10 && other !== this) {
      //   if (Math.random() > 0.99) {
      //     // deletes that water particle, replaces with plant particle
      //     let newPlant = new Plant(other.pos.x, other.pos.y);
      //     lines.splice(lines.indexOf(other), 1);
      //     lines.push(newPlant);
      //     console.log("new plant?");
      //     this.hosting++;
      //   }
      // }
    }
  }

  show() {
    // if (earthInvisible || frameCount < 10) {
    //   return;
    // }
    // if (this.vel.mag() < 0.1) {
    //   return;
    // }
    this.opacity = map(this.vel.mag(), 0, 0.01, 0, 1);

    // if (frameCount % 400 > 5) {
    //   return;
    // }
    // if (this.static) {
    //   return;
    // }
    colorMode(HSB, 360, 100, 100, 1);
    // water color = red per heat, green empty, blue full
    // this.color = `rgba(${Math.floor(
    //   map(this.temp, 0, 1000, 0, 255)
    // )},255,0,${earthOpacity})`;
    // canvasContext.fillStyle = this.color;
    // canvasContext.beginPath();
    // canvasContext.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
    // canvasContext.fill();
    // canvasContext.closePath();
    // canvasContext.fill();

    // canvasContext.fillRect(this.pos.x, this.pos.y, this.size, this.size);
    // this.hue = 10 + this.temp / 8;
    this.hue = 116;
    this.sat = 80;
    this.brightness = 10;
    let hue = this.hue;
    let saturation = this.sat;
    let brightness = this.brightness;
    let opacity = this.opacity;
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(0.1);
    // stroke();
    noFill();
    circle(this.pos.x, this.pos.y, this.size);

    // point(this.pos.x, this.pos.y);
  }
}

function checkNoNeighbors(x, y, rad, num) {
  let perceptionRadius = rad;
  let perceptionCount = num;

  let counter = 0;

  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  )) {
    counter++;
  }
  return counter;
}
