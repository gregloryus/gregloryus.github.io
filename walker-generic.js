//WALKER CLASS
class Walker {
  constructor(x, y) {
    this.pos = createVector(x, y); // location
    this.hue = 1;
    this.sat = 100;
    this.brightness = 100;
    this.opacity = 100;
    this.size = 1;
    this.stuck = false;
    this.vel = createVector();
    this.acc = createVector();
  }

  update() {
    //nothing here lol
  }

  show() {
    //sets the color mode; applies hue, saturation, brightness, opacity
    colorMode(HSB, 100, 100, 100, 100);
    let c = color(this.hue, this.sat, this.brightness, this.opacity);
    stroke(c);

    //sets the size
    strokeWeight(this.size);

    //prints a point
    point(this.pos.x, this.pos.y);
  }
}
