//WALKER CLASS
class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.water = true;
    this.earth = false;
    this.fire = false;
    this.hue = 1;
    this.temp = random(150, 1000);
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
    this.opacity = 100;
  }

  update() {
    this.age++;

    // if you're in the upper 9/10th of the canvas and not vapor, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 3;
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
    if (this.vapor) {
      saturation = 0;
      opacity = 1;
    }
    if (!this.vapor) {
      saturation = this.sat;
    }
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(this.size);
    // if (this.vapor) {
    //   stroke(66, 0, 100, 0.2)
    //   strokeWeight(1 + (height-this.pos.y)/10)
    // }
    point(this.pos.x, this.pos.y);
    if (this.vapor) {
      stroke(1, 0, 100, map(this.pos.y, 0, height, 0, 10));
      strokeWeight(map(this.pos.y, height, 0, 0, 100));
      point(this.pos.x, this.pos.y);
    }
    // text(`${floor(this.temp)}`, this.pos.x, this.pos.y)
  }
}

class Earth extends Walker {
  constructor(x, y) {
    super(x, y);
    this.earth = true;
    this.water = false;
    this.temp = random(0.4, 0.6);
    this.size = random(8, 48);
    this.opacity = 10;
  }

  update() {
    this.age++;

    // if you're in the upper 9/10th of the canvas, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 3;
    }

    this.acc.add(p5.Vector.fromAngle(TWO_PI * 0.25, 0.01));

    // VELOCITY ENGINE HERE

    this.vel.add(this.acc);
    this.acc.mult(0.99);
    this.vel.mult(0.5);

    this.pos.add(this.vel);

    // earth doesn't wrap up/down like water does
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

    // earth repels water
    this.repelWater();
  }

  repelWater() {
    let perceptionRadius = this.size * 1.5;
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
    }
  }

  show() {
    colorMode(HSB, 100, 100, 100, 100);
    // this.hue = 10 + this.temp / 8;
    this.hue = 33;
    let hue = this.hue;
    let saturation = this.sat;
    let brightness = this.brightness;
    let opacity = this.opacity;
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(this.size);
    point(this.pos.x, this.pos.y);
  }
}
