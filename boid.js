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
    this.vapor = false
    this.age = 0
    this.ageLimit = 1000 + random(1000)
  }

  rain() {
    if (vaporCount < 20) {
      return
    }
    if (!rain) {
      return
    }
    let perceptionRadius = 2;
    let perceptionCount = 6;
    if (this.pos.y > height/4) {
      return
    }
    if (!this.vapor) {
      return
    }
      
    if (this.age < this.ageLimit) {
      return
    }

    for (const other of quadTree.getItemsInRadius(this.pos.x, this.pos.y, perceptionRadius, perceptionCount)) {

      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);

      if (other != this && d < perceptionRadius && other.vapor && other.age > other.ageLimit) {
        this.vapor = false
        this.temp = 0
        lines.splice(lines.indexOf(other), 1)
        console.log("splice attempted...vapor turned to water")
        vaporCount = vaporCount -2
      }
    }
  }
// if (rain) {
//   for (var i = 0; i < lines.length; i++) {
//     for (var j = 0; j < lines.length; j++) {
//       if (lines[j].vapor && lines[i].vapor && lines[i].pos.y < height/4 && lines[j].pos.y < height/4 && i !== j) {
//         if (checkDist(lines[i].pos, lines[j].pos)) {
//           lines[i].vapor = false
//           lines[i].temp = 0
//           lines.splice(j, 1)
//           console.log("vapor turned to water")
//           vaporCount = vaporCount -2
//         }
//       }
//     }
//   }
// }

  update() {
    this.age++
    //if your temp is over 125, turn into 2 vapors 
    if (this.temp > 150 && !this.vapor) {
      this.vapor = true
      this.age = 0
      vaporCount++
      this.temp = 300
      let newVapor = new Walker(this.pos.x, this.pos.y);
      newVapor.vapor = true
      vaporCount++
      newVapor.temp = 300
      lines.push(newVapor)
    }

    //if you're in the upper 9/10th of the canvas and not vapor, you lose heat faster as your height rises
    if (this.pos.y < (height / 10) * 9 && this.vapor === false) {
      this.temp = this.temp - (height - this.pos.y) / height;
    }

    //if you're in the bottom 3/4th of the canvas, you gain heat as you approach the bottom
    if (this.pos.y > (height / 4) * 3) {
      this.temp =
        this.temp + (((this.pos.y - (height / 4) * 3) / height / 4) * 3);
    }

    //if you're vapor below the top 10th, you gain heat
    if (this.pos.y > height / 10 && this.vapor) {
      this.temp = this.temp + 1
    }

    //if you're vapor within the top 10th, you lose heat
    if (this.pos.y < height / 10 && this.vapor) {
      this.temp = this.temp - 1
    }


    let waterCurrent = noise(frameCount / 500 + this.pos.y * .05);
    let gravCurrent = noise(12345 + frameCount / 500 + this.pos.x * .05);

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
      this.vel.add(noisyUp.add(noisyDown))

      this.vel.add(this.downlift.setMag(.5))

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

    // this.wind = p5.Vector.random2D();
    // this.wind.normalize()
    // this.wind.setMag(1)

    // this.vel = this.vel * (1 + this.acc/100)
    // this.acc = this.acc - 1
    
    this.vel.mult(0.5)

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
      this.temp = 0
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
      saturation = 0
      opacity = 1
    }
    if (!this.vapor) {
      saturation = this.sat
    }
    let c = color(hue, saturation, brightness, opacity);
    stroke(c);
    strokeWeight(width/100);
    // if (this.vapor) {
    //   stroke(66, 0, 100, 0.2)
    //   strokeWeight(1 + (height-this.pos.y)/10)
    // }
    point(this.pos.x, this.pos.y);
    if (this.vapor) {
      stroke(1, 0, 100, map(this.pos.y, 0, height, 0, 5))
      strokeWeight(map(this.pos.y, height, 0, 0, 100))
      point(this.pos.x, this.pos.y)
    }
    // text(`${floor(this.temp)}`, this.pos.x, this.pos.y)

  }
}