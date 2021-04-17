//SLIDERS

//Amounts
let numOfWater = 40; // number of water particles (100)
let touchRadius = 100; // touching water

//Light effects
let lightHeat = 1500 / numOfLight; // how much light heats up water

//WALKER CLASS

class Water extends Walker {
  constructor(x, y) {
    super(x, y);
    //move this to water
    this.water = true;
    this.temp = 0;
    this.size = 6;
    this.opacity = 40;
  }

  update() {
    //edges, if particle goes off-screen, warp left/right, stay up/down
    if (this.pos.y > height - 1) {
      this.pos.y = height - 1;
    }
    if (this.pos.y < height * -0.5) {
      this.pos.y = height * -0.5;
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
    this.uplift = p5.Vector.fromAngle(TWO_PI * 0.75, 1);
    this.downlift = p5.Vector.fromAngle(TWO_PI * 0.25, 1);

    // creates vector pointing in random direction, normalizes it
    this.vel = p5.Vector.random2D();
    this.vel.normalize();
    this.vel.setMag(1);

    //sets a vector field along x and y axes
    let waterCurrent = noise(frameCount / 500 + this.pos.y * 0.05);
    let gravCurrent = noise(12345 + frameCount / 500 + this.pos.x * 0.05);

    //creates a vector pointing left/right/up/down with noisy magnitudes
    let noisyLeft = p5.Vector.fromAngle(TWO_PI * 0.5, 1 + waterCurrent);
    let noisyRight = p5.Vector.fromAngle(TWO_PI * 1.0, 2 - waterCurrent);
    let noisyUp = p5.Vector.fromAngle(TWO_PI * 0.75, 1 + gravCurrent);
    let noisyDown = p5.Vector.fromAngle(TWO_PI * 0.25, 2 - gravCurrent);

    //adds vector waves to the velocity, adds modulated downwards force
    this.vel.add(noisyLeft.add(noisyRight));
    this.vel.add(noisyUp.add(noisyDown));
    this.vel.add(this.downlift.setMag(0.5));

    // if you're in the upper 9/10th, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + ((this.pos.y - (height / 4) * 3) / height / 4) * 3;
    }

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

    // //if you're in the right 4th, get pushed left the righter you go
    // if (this.pos.x > width - width / 4) {
    //   let up = p5.Vector.fromAngle(TWO_PI * 0.5, 1);
    //   up.setMag(1 * (this.pos.x / width - 0.75));
    //   this.vel.add(up);
    // }

    // if (this.pos.x < width / 4) {
    //   let up = p5.Vector.fromAngle(TWO_PI * 1.0, 1);
    //   up.setMag(1 * ((width - this.pos.x) / width - 0.75));
    //   this.vel.add(up);
    // }

    //if your temp is over 100, you go up -- if it's under, you go down
    this.vel.add(this.uplift.setMag(this.temp / 100 - 1));

    // sets the hue according to the temperature
    this.hue = 50 + this.temp / 8;

    //adds acceleration to velocity
    this.vel.add(this.acc);

    //diminishes acceleration over time
    this.acc.mult(0.99);

    //modulates velocity (looks too crazy at full speed)
    this.vel.mult(0.5);

    //adds velocity to position
    this.pos.add(this.vel);
  }

  show() {
    super.show();
  }
}
