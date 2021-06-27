//STONK CLASS
class Stonk {
  constructor(x, y) {
    // position
    this.pos = createVector(x, y);
    // odds
    this.odds = random(0.25, 0.75);
    // odds in the previous frame
    this.prevOdds = 0.5;

    // hue
    this.hue = 1;
    // saturation
    this.sat = 0;
    // brightness
    this.brightness = 100;
    // opacity
    this.opacity = 100;

    // size
    this.size = 1;
  }

  influence() {
    let perceptionRadius = 10;
    let perceptionCount = 10;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);

      if (other != this && d < perceptionRadius) {
        this.size = 5 / d;
        // if (d < perceptionRadius / 2) {
        //   this.odds += 0.01;
        //   console.log(`odds increased! new odds: ${this.odds * 100}%`);
        // }
      }
    }
  }

  update() {
    // this.influence();

    // this.size = this.size * 0.9;
    // if (this.size < 1) {
    //   this.size = 1;
    // }

    // roll a random number
    let roll = Math.random();

    // if the roll is greater than your current odds, move up else down
    if (roll > this.odds) {
      this.pos.y = this.pos.y - 1;
    } else {
      this.pos.y = this.pos.y + 1;
    }

    // storing current odds before changing them
    this.prevOdds = this.odds;

    if (this.pos.y > height || this.pos.y < 0) {
      this.pos.y = height / 2;
      this.brightness = this.brightness * 0.5;
    }
  }

  show() {
    // sets the color mode to Hue Saturation Brightness and Opacity, each value being 0-100
    colorMode(HSB, 100, 100, 100, 100);

    let hue = this.hue % 100;
    let saturation = this.sat;
    let brightness = this.brightness;
    let opacity = this.opacity;

    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(this.size);
    point(this.pos.x, this.pos.y);
  }
}
