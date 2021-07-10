//SLIDERS

//Modes
let lightPulse = false;
let lightPulseMode = false;
let lightFree = true;
let sunMoveMode = false; // is the sun moving? if false, sun is fixed

//Amount sliders
let numOfLight = 100; // number of light particles
let lightSize = 2;
let lightOpacity = 10; //opacity of light (20 min)
let lightSpeed = 4; // speed of light
let lightPulseRate = 400; // how quickly light pulses (400 = chill)
let lightCals = 50; // amount of calories given by each photon

//Light affects water
let refractAngle = 2; // how much water refracts light (8, lower is bigger angles)
// (for lightHeat, see walker-water.js)

//Sun sliders
let sunSpeed = 1; //  speed of sun
let sunPathRadius = 100;
let sunAngle = 1;
let sunAngleSpeed = 0.001; // (0.0015)

//WALKER CLASS
class Light extends Walker {
  constructor(x, y) {
    super(x, y);
    this.light = true;
    this.size = lightSize;
    this.hue = 17;
    this.sat = 100;
    this.opacity = 40;
    this.vel = p5.Vector.random2D();
    this.return = false;
  }

  heat() {
    let perceptionRadius = this.size + 1;
    let perceptionCount = 4;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other.water) {
        //distance between mouse and particle
        let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);

        //heat and push particles, increasing magnitude the closer you are
        other.temp = other.temp + lightHeat;
        this.vel.rotate(-PI / (refractAngle * 2) + random(PI / refractAngle));
        this.refracted = true;
      }
    }
  }

  update() {
    if (this.sun && this.stuck) {
      return;
    }
    //releases light immediately if Free Light mode is on
    if (lightFree && !this.sun) {
      this.stuck = false;
      this.off = false;
    }

    //releases light in pulses if Pulse Light mode is on
    if (lightPulse && !this.sun) {
      this.stuck = false;
    }

    if (this.sun && sunMoveMode) {
      this.pos.x = this.start.x - this.start.x * cos(sunAngle);
      this.pos.y = this.start.y + this.start.y * sin(sunAngle);
      sunAngle = sunAngle + sunAngleSpeed;
    }

    //if light is stuck, stay with the sun
    if (this.stuck) {
      this.return = true;
    }

    //if tagged to return, return to the sun
    if (this.return) {
      // if (this.absorbed) {
      //   if ((this.core.dead = true)) {
      //     this.pos = createVector(lines[0].pos.x, lines[0].pos.y);
      //     this.vel = p5.Vector.random2D();
      //     this.stuck = true;
      //     this.off = true;
      //     this.return = false;
      //     console.log("light released");
      //   } else {
      //     this.pos.x = -500;
      //     this.pos.y = -500;
      //     return;
      //   }
      // } else {
      this.pos = createVector(lines[0].pos.x, lines[0].pos.y);
      this.vel = p5.Vector.random2D();
      this.stuck = true;
      this.off = true;
      this.return = false;
      this.absorbed = false;
      // console.log("light returned");
      // }
    }

    // sets a randon direction, sets the speeds
    // this.vel = p5.Vector.random2D();
    // this.vel.normalize();
    this.vel.setMag(lightSpeed);
    if (this.sun) {
      this.vel.setMag(sunSpeed);
    }

    //adds acceleration to velocity to position
    this.vel.mult(0.5);
    this.pos.add(this.vel);

    this.heat();

    //if light goes offscreen, return to the sun
    if (this.sun) {
      return;
    }
    if (
      this.pos.x > width ||
      this.pos.x < 0 ||
      this.pos.y > height ||
      this.pos.y < 0
    ) {
      this.return = true;
    }
  }

  show() {
    if (this.sun) {
      this.hue = map(this.pos.y, 0, height / 5, 17, 7);
      //   this.size = map(this.pos.y, 0, height / 5, 16, 32);
      //   this.opacity = map(this.pos.y, 0, height / 5, 100, 0);
      //   sunAngleSpeed = map(this.pos.y, 0, (height / 20) * 9, 0.001, 0.01);
      //   if (this.pos.y > (height / 30) * 9) {
      //     lightFree = false;
      //   } else {
      //     lightFree = true;
      //   }
      this.off = false;
    }

    if (this.off) {
      return;
    }

    // if (!this.refracted) {
    //   //sets the color mode; applies hue, saturation, brightness, opacity
    //   colorMode(HSB, 100, 100, 100, 100);
    //   let c = color(this.hue, this.sat, this.brightness, this.opacity);
    //   stroke(c);

    //   //sets the size
    //   strokeWeight(this.size);
    //   line(this.pos.x, this.pos.y, lines[0].pos.x, lines[0].pos.y);
    // }

    super.show();
  }
}
