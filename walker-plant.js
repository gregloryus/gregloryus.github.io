//WHERE I LEFT OFF
// Just starting to create plants, only clicking into existence now
// Need to make them grow and share calories from the core

//SLIDERS

//Amounts
let numOfPlants = 40;
let lightCals = 1000; // calories/energy that each photon gives (100)
let growthCost = 1; // cost of growing once (1)
let growthRate = 0.01; // ACTUALLY SCALE?! magnitude of each velocity step applied to position (0.00001, four 0s)
let heliotropismFadeRate = 0.999; //acceleration divided by this amount each frame (0.999)
let ageToProduce = 1000;
let leafChance = 20; // % chance to produce a leaf OR BRANCH instead of a normal stem (20%)
let leafSize = 6;
let branchChance = 80;
let tallestPlantHeight = 0;
let tallestPlant = 1000;

class Plant extends Walker {
  constructor(x, y) {
    super(x, y);
    this.plant = true;
    this.size = 4;
    this.hue = 33;
    this.stuck = true;
    this.core = this;
    this.leaf = false;
    this.stem = false;
    this.seed = false;
    this.calories = 0;
    this.children = [];
    this.parent = this;
    this.growthAge = 0;
    this.vel = p5.Vector.fromAngle(TWO_PI * 0.75, 1); //upwards
    this.acc = createVector();
    this.flash = 0; // counts down to dim flash that's applied during photosynthesis
    this.leafStem = false;
  }

  photosynthesize() {
    //photosynthesis

    let perceptionRadius = this.size;
    let perceptionCount = 10;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other.light) {
        //the light is tagged to return to the sun
        other.return = true;

        //adds a count to the core of the plant (not the particle itself)
        if (this.seed) {
          this.core.calories += lightCals / 10;
        } else {
          this.core.calories += lightCals;
        }

        //heliotropism
        this.acc.add(p5.Vector.sub(other.pos, this.pos));

        //flash
        this.flash = 100;
        this.core.flash = 40;
      }
    }
  }

  grow() {
    //seed setup
    if (this.seed && this.children.length < 1) {
      //creates first stem, identifies it as stem
      let stem = new Plant(this.pos.x, this.pos.y);
      stem.stem = true;

      //passes the core
      stem.core = this.core;

      //identifying the stem
      stem.leaf = false;
      stem.stuck = false;
      stem.brightness = 80;

      //parent and child save each other
      stem.parent = this;
      this.children.push(stem);

      //rotates new stems
      // stem.vel.rotate(0.5 - random());

      //push new stem to lines
      lines.push(stem);

      //seed stops or continues photosynthesizing
      this.leaf = true;
    }

    //use up one light calorie, move the position
    if (!this.stuck) {
      //subtracts a light cal from the core
      this.core.calories -= growthCost;

      //advances the growth age
      this.growthAge++;

      //give growth an upwards direction
      this.vel = p5.Vector.fromAngle(TWO_PI * 0.75, 1);

      // //gives upward growth random left/right pushes
      // this.vel.add(p5.Vector.fromAngle(PI, random(-0.5, 0.5)));

      //adds acceleration to velocity
      this.vel.add(this.acc);

      //modulates growth rate, i.e. velocity (number less than 1.0 so always diminishing)
      this.vel.mult(growthRate);

      //adds velocity to position
      this.pos.add(this.vel);

      if (this.pos.y < height * 0.6) {
        resetSketchWarning = true;
        if (this.pos.y < tallestPlant) {
          tallestPlant = this.pos.y;
          tallestPlantHeight = Math.floor(
            ((height - this.pos.y) / height) * 100
          );
        }
      }

      if (this.pos.y < height * 0.5) {
        resetSketch = true; // test
      }
    }
  }

  produce() {
    //seed producing first shoot
    if (this.seed && this.children.length < 1) {
      //creates first stem, identifies it as stem
      let stem = new Plant(this.pos.x, this.pos.y);
      stem.stem = true;

      //smaller stem
      stem.size = 2;

      //passes the core
      stem.core = this.core;

      //identifying the stem
      stem.leaf = false;
      stem.stuck = false;
      stem.brightness = 80;

      //parent and child save each other
      stem.parent = this;
      this.children.push(stem);

      //rotates new stems
      // stem.vel.rotate(0.5 - random());

      //push new stem to lines
      lines.push(stem);

      //seed (parent) stops or continues photosynthesizing
      this.leaf = true;
    }

    if (this.stem && !this.stuck) {
      // 20% chance of producing a leaf instead
      if (this.children.length < 1 && random(100) < leafChance) {
        //creates first stem, identifies it as stem
        let stemR = new Plant(this.pos.x, this.pos.y);
        stemR.stem = true;
        stemR.leafStem = true;

        //smaller stem
        stemR.size = 1;

        //passes the core
        stemR.core = this.core;

        //identifying the stem
        stemR.leaf = false;
        stemR.stuck = false;
        stemR.brightness = 100;
        stemR.size = 1;

        //parent and child save each other
        stemR.parent = this;
        this.children.push(stemR);

        //rotates new stems
        stemR.acc = p5.Vector.fromAngle(TWO_PI * 1.0, 1);
        this.right = true;

        //push new stem to lines
        lines.push(stemR);

        // DOES THE EXACT SAME THING, WITH ACC FLIPPED (can optimize lol)

        //creates first stem, identifies it as stem
        let stemL = new Plant(this.pos.x, this.pos.y);
        stemL.stem = true;
        stemL.leafStem = true;

        //smaller stem
        stemL.size = 1;

        //passes the core
        stemL.core = this.core;

        //identifying the stem
        stemL.leaf = false;
        stemL.stuck = false;
        stemL.brightness = 100;
        stemL.size = 1;

        //parent and child save each other
        stemL.parent = this;
        this.children.push(stemL);

        //rotates new stems
        stemL.acc = p5.Vector.fromAngle(TWO_PI * 0.5, 1);
        stemL.left = true;

        //push new stem to lines
        lines.push(stemL);

        //parent gets stuck, stops photosynthesizing
        this.stuck = true;
        this.leaf = false;
      } else {
        //STEM PRODUCTION
        //creates first stem, identifies it as stem
        let stem = new Plant(this.pos.x, this.pos.y);
        stem.stem = true;

        //smaller stem
        stem.size = 2;

        //passes the core
        stem.core = this.core;

        //identifying the stem
        stem.leaf = false;
        stem.stuck = false;
        stem.brightness = 80;

        //parent and child save each other
        stem.parent = this;
        this.children.push(stem);

        //rotates new stems
        // stem.vel.rotate(0.5 - random());

        //push new stem to lines
        lines.push(stem);
        // console.log(this);

        //parent gets stuck, stops photosynthesizing
        this.stuck = true;
        this.leaf = false;
      }
    }
  }

  update() {
    if (this.leaf) {
      this.photosynthesize();
    }

    //if the plant has calories, grow
    if (this.core.calories < 1) {
      return;
    } else if (this.seed && this.children.length < 1) {
      this.produce();
    } else {
      this.grow();
    }

    // stems of a certain age with less than 3 children produce a child
    if (
      this.stem &&
      this.children.length < 3 &&
      this.growthAge > ageToProduce
    ) {
      if (this.leafStem) {
        if (random(100) < branchChance) {
          console.log("branch");
          this.leafStem = false;
          this.stem = true;
          return;
        } else {
          console.log("leaf");
          this.leaf = true;
          this.size = leafSize;
          this.stuck = true;
          this.core.calories = Math.floor(this.core.calories / 2); // halfs out calories when new leaf
          this.leafStem = false;
          this.stem = false;

          // drain calories
          this.core.calories = 0;
        }
      } else {
        this.produce();
      }
    }

    //reduce the acceleration each frame
    this.acc.mult(heliotropismFadeRate);
  }

  show() {
    if (this.flash > 0) {
      stroke(17, 100, 100, this.flash);
      strokeWeight(this.size + this.flash / 10);
      point(this.pos.x, this.pos.y);
      this.flash -= 1;
    }

    if (this.seed) {
      this.hue = 1;
      this.brightness = 77;
    }

    if (this.stem && this.stuck) {
      this.brightness = 50;
    }

    if (this.leaf) {
      this.brightness = 100;
    }

    super.show();
    // if (this.seed) {
    //   return;
    // }
    if (this.stem && this.stuck) {
      this.brightness = 100;
    }

    strokeWeight(1);
    line(this.pos.x, this.pos.y, this.parent.pos.x, this.parent.pos.y);

    //if there's light, light up halo
    if (this.core.calories == 0 || this.stuck) {
      return;
    } else {
      // stroke(17, 100, 100, 40);
      stroke(25, 100, 100, 0);
      strokeWeight(1);
      noFill();
      circle(this.pos.x, this.pos.y, this.size + 1);
    }
  }
}
