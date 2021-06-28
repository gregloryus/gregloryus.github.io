//STONK CLASS
class Stonk {
  constructor(x, y) {
    // position
    this.pos = createVector(x, y);

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
    this.size = 4;

    // value

    this.value = 100;
    this.prevValue = this.value;
    this.startingValue = this.value;
    this.oldStartingValue = this.value;
    this.valueMultiplier = 1;

    // offset by random value
    this.offset = random(12345);

    // odds
    this.odds = 0.5;
    this.realOdds = 0.5;
    this.oddsEmoji = ``;

    this.x = false;
    this.y = true;
    // this.name = random(["🤡", "💀", "😹", "🤑", "🥵", "🥶", "😈"]);

    this.highlighted = false;
    this.paused = true;
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
        this.odds = (this.prevOdds + other.prevOdds) / 2;
        // if (d < perceptionRadius / 2) {
        //   this.odds += 0.01;
        //   console.log(`odds increased! new odds: ${this.odds * 100}%`);
        // }
      }
    }
  }

  update() {
    this.highlighted = false;
    if (highlightedIndex == this.index) {
      this.highlighted = true;
      this.size = 4;
    } else {
      this.highlighted = false;
      this.size = 2;
    }

    if (this.paused) {
      return;
    }
    counter++;
    // this.influence();

    // this.size = this.size * 0.9;
    // if (this.size < 1) {
    //   this.size = 1;
    // }

    // move forward in time one tick
    this.pos.x = this.pos.x + 1;

    // roll a random number
    let roll = Math.random();

    // if the roll is greater than your current odds, move up else down
    if (roll > this.realOdds) {
      if (this.y) {
        this.pos.y = this.pos.y + 1;
      }
      if (this.x) {
        this.pos.x = this.pos.x + 1;
      }
    } else {
      if (this.y) {
        this.pos.y = this.pos.y - 1;
      }
      if (this.x) {
        this.pos.x = this.pos.x - 1;
      }
    }

    // storing current odds before changing them
    this.prevOdds = this.odds;

    // changing current odds according to perlin noise
    this.odds = noise(this.offset + counter / 2000);
    this.realOdds = map(this.odds, 0, 1, 0.1, 0.9);
    if (this.realOdds > 0.6) {
      this.oddsEmoji = `🔥`;
    } else if (this.realOdds < 0.4) {
      this.oddsEmoji = `❄️`;
    } else {
      this.oddsEmoji = ``;
    }

    if (this.pos.y > height * 0.9) {
      this.pos.y = height * 0.9;
    }
    if (this.pos.y < height / 10) {
      this.pos.y = height / 10;
    }
    // if (this.pos.y > height || this.pos.y < 0) {
    //   this.pos.y = height / 2;
    // }

    if (this.pos.x > (width / 10) * 9) {
      this.oldStartingValue = this.startingValue;
      this.startingValue = this.value;

      this.pos.x = width / 10;
      this.pos.y = height / 2;
      this.paused = true;
      // this.odds = random(0.25, 0.75);
    }

    this.prevValue = this.value;
    // this.value = 100 - (this.pos.y / height) * 100;
    this.heightPercent = 100 - (this.pos.y / height) * 100;
    this.valueMultiplier = (this.heightPercent + 50) / 100;
    this.value = this.startingValue * this.valueMultiplier;
    // console.log(
    //   this.heightPercent,
    //   this.valueMultiplier,
    //   this.startingValue,
    //   this.value
    // );
  }

  show() {
    // sets the color mode to Hue Saturation Brightness and Opacity, each value being 0-100
    colorMode(HSB, 100, 100, 100, 100);

    if (this.highlighted) {
      this.hue = 17;
      this.sat = 100;
      if (holding) {
        this.hue = 33;
      } else if (shorting) {
        this.hue = 1;
      }
    } else {
      this.sat = 0;
    }

    let hue = this.hue % 100;
    let saturation = this.sat;
    let brightness = this.brightness;
    let opacity = this.opacity;

    let c = color(hue, saturation, brightness, opacity * 0.5);
    stroke(c);
    strokeWeight(this.size);
    point(this.pos.x, this.pos.y);
    // text(`${this.emoji}`, this.pos.x, this.pos.y);
    textAlign(RIGHT);
    // text(stonkmarket.indexOf(this), this.pos.x, this.pos.y);
    if (this.paused) {
      text(
        `${stonkmarket[this.index].name}: $${Math.floor(
          stonkmarket[this.index].value
        )}  ${
          Math.floor((this.startingValue / this.oldStartingValue) * 100) - 100
        }% ${this.oddsEmoji}`,
        (width / 5) * 4,
        (height / 10) * 2 + (height / 40) * this.index
      );
    } else if (!this.paused) {
      text(
        `${stonkmarket[this.index].name}: $${Math.floor(
          stonkmarket[this.index].value
        )}  ${Math.floor((this.value / this.startingValue) * 100) - 100}% ${
          this.oddsEmoji
        }`,
        (width / 5) * 4,
        (height / 10) * 2 + (height / 40) * this.index
      );
    }
  }
}
