//WHERE I LEFT OFF
// Just starting to create plants, only clicking into existence now
// Need to make them grow and share calories from the core

//SLIDERS

//Amounts
let numOfPlants = 7;
let lightCals = 1000; // calories/energy that each photon gives (100)
let growthCost = 0.1; // cost of growing once (1)
let growthRate = 0.01; // ACTUALLY SCALE?! magnitude of each velocity step applied to position (0.00001, four 0s)
let heliotropismFadeRate = 0.999; //acceleration divided by this amount each frame (0.999)
let ageToProduce = 1000;
let leafChance = 20; // % chance to produce a leaf OR BRANCH instead of a normal stem (20%)
let leafSize = 3;
let branchChance = 80;
let startingNodeLength = 300;
let startingSplitChance = 20;
let startingBranchChance = 0;
let helioLimit = 0.01; // limit on heliotropism force (0.005)
let caloricFadeRate = 0.95;
let seedChance = 50;
let seedWindLength = 4;
let canPhotoAmount = 2000;
let wetPlus = 1000;
let wetMinus = 1;

//LEGACY SLIDERS
let prune80 = false;
let blightChance = 80;
let record = [];
let winner = {};
let newRecord = false;
let tallestPlantHeight = 0;
let tallestPlant = 1000;
let pruned = false;
let time = 0;
let fastestTime = 1000000;
let prevAgeToProduce;
let prevLeafChance;
let prevBranchChance;
let generation = 1;
let terminalHeight = 0.66;
let overheat = 100000;

class Plant extends Walker {
  constructor(x, y) {
    super(x, y);
    this.plant = true;
    this.size = 2;
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
    this.flash = 100; // counts down to dim flash that's applied during photosynthesis
    this.leafStem = false;
    this.dead = false;
    this.growthRate = 0.0333;
    this.ageToProduce = startingNodeLength;
    this.leafChance = startingSplitChance;
    this.branchChance = startingBranchChance;
    this.mutant = false;
    this.brightnessFade = 0.1;
    this.helioLimit = 0.01;
    this.wetness = 0;
    this.lightAbsorbCount = 0;
    this.waterAbsorbCount = 0;
  }

  dry() {
    //if not a seed, return
    if (!this.seed) {
      return;
    }
    this.wetness = this.wetness - wetMinus;
    // if (this.wetness % 1000 == 0) {
    //   console.log(`${this.wetness}`);
    // }
    if (this.wetness < -1000) {
      //if too dry, kill the core
      this.core.dead = true;
    }
  }

  absorb() {
    //if not a seed, return
    if (!this.seed) {
      return;
    }
    let perceptionRadius = this.size;
    let perceptionCount = 10;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      //if collide with water, add up wetness, wet count, mark water absorbed
      if (other.water) {
        this.wetness = this.wetness + wetPlus;
        // console.log(`${this.wetness}`);

        other.absorbed = true;
        other.core = this.core;
        this.core.waterAbsorbCount++;
      }
    }
  }

  photosynthesize() {
    //photosynthesis

    if (!this.seed && this.canPhoto < 1) {
      return;
    }
    if (!this.seed) {
      this.canPhoto = this.canPhoto - 1;

      //when it can't photosynethize, it'll be 75% transparent
      // this.sat = map(this.canPhoto, 0, 1000, 75, 100);
      this.brightness = map(this.canPhoto, 0, canPhotoAmount, 50, 100);
      this.hue = map(this.canPhoto, 0, 2000, 36, 33);
    }

    let perceptionRadius = this.size;
    let perceptionCount = 10;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other.light && !other.sun) {
        this.core.lightAbsorbCount++;
        //the light is tagged to return to the sun
        other.return = true;

        //the light is absorbed, connects to the core
        other.absorbed = true;
        other.core = this.core;

        //the light remembers where it was absorbed, so it can release later
        other.absorbedX = this.pos.x;
        other.absorbedY = this.pos.y;

        //adds a count to the core of the plant (not the particle itself)
        if (this.seed) {
          this.core.calories += lightCals / 10;
        } else {
          this.core.calories += lightCals * 10;
        }

        //heliotropism
        this.core.acc.add(p5.Vector.sub(other.pos, this.pos));
        this.core.acc.limit(this.core.helioLimit);

        //flash
        this.flash = 100;
        this.core.flash = 40;

        //refresh canPhoto
        this.canPhoto = canPhotoAmount;
      }
    }
  }

  grow() {
    if (this.seed && this.stuck && this.children.length < 1) {
      this.produce();
    }

    //if not stuck, use up one light calorie, move the position
    if (!this.stuck) {
      //subtracts a light cal from the core
      this.core.calories -= growthCost;

      //advances the growth age
      this.growthAge++;
      // if (this.leafStem) {
      //   this.growthAge += 0.5;
      // }

      //give growth an upwards direction
      this.vel = p5.Vector.fromAngle(TWO_PI * 0.75, 1);

      // //gives upward growth random left/right pushes
      // this.vel.add(p5.Vector.fromAngle(PI, random(-0.5, 0.5)));

      this.acc.add(this.core.acc);

      //adds acceleration to velocity
      this.vel.add(this.acc);

      // modulates growth rate, i.e. velocity (number less than 1.0 so always diminishing)
      this.vel.mult(this.core.growthRate);

      //adds velocity to position
      this.pos.add(this.vel);

      //if pos is over the top, kill plant and drop seed
      //start of seedFall
      if (this.pos.y < 0) {
        this.core.dead = true;
        this.core.deadX = this.pos.x;
        this.core.deadY = this.pos.y;
        this.core.deadSpot = this.pos;
        console.log("died");
        let seed = new Plant(this.pos.x, this.pos.y);
        seed.seed = true;
        seed.size = 4;
        seed.hue = 13;
        seed.sat = 100;
        seed.fallLimit = 0.25 + random();
        seed.vel = p5.Vector.fromAngle(TWO_PI * 0.25, 1); //downwards
        seed.offset = random(1000000);
        seed.leaf = false;
        seed.stuck = false;
        seed.randomizeGenes();
        lines.push(seed);
        // let waterSeed = new Water(this.pos.x, this.pos.y);
        // waterSeed.size = 10;
        // waterSeed.hue = 1;
        // lines.push(waterSeed);
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
      //if no children
      if (this.children.length < 1) {
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
        // this.stuck = true;
        // this.leaf = false;
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

  seedFall() {
    if (!this.seed || this.stuck) return;
    this.pos.add(this.vel);
    this.pos.x =
      this.pos.x -
      seedWindLength +
      seedWindLength * 2 * noise((frameCount + this.offset) / 100);
    //seed gets wet

    let perceptionRadius = this.size;
    let perceptionCount = 5;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other.water) {
        this.stuck = true;
        this.leaf = true;
        this.sat = 100;
        this.hue = 1;
        this.size = 10;
      }
    }
  }

  update() {
    //if dead, fade until eventually spliced out
    if (this.dead) {
      //lower brightness by 1
      this.brightness = this.brightness - 1 * this.core.brightnessFade;
      if (this.brightness < 10) {
        lines.splice(lines.indexOf(this), 1);
      }
      return;
    }

    //if seed, absorb and dry
    if (this.seed) {
      this.absorb();
      this.dry();
    }

    //if core is dead, you're dead
    if (this.core.dead) {
      this.dead = true;
    }

    //if leaf, photosynthesize
    if (this.leaf) {
      this.photosynthesize();
    }

    //if seed, lose calories
    if (this.seed) {
      this.core.calories = this.core.calories * caloricFadeRate;
    }

    //if seed and not stuck, fall
    if (this.seed && !this.stuck) {
      this.seedFall();
    }

    //if the plant has calories, grow
    if (this.core.calories < 1) {
      return;
    } else {
      this.grow();
    }

    // stems of a certain age with less than 3 children produce a child
    if (
      this.stem &&
      this.children.length < 3 &&
      this.growthAge > this.core.ageToProduce
    ) {
      if (this.leafStem) {
        //turn into a branch instead of a leaf
        if (random(100) < this.core.branchChance) {
          // console.log("branch");
          this.leafStem = false;
          this.stem = true;
          return;
        } else {
          // console.log("leaf"); // leaf made here
          this.leaf = true;
          this.size = leafSize;
          this.stuck = true;
          this.leafStem = false;
          this.stem = false;

          this.canPhoto = canPhotoAmount;

          // // drain calories
          // this.core.calories = 0;
        }
      } else {
        this.produce();
      }
    }

    // reduce the acceleration each frame
    this.acc.mult(heliotropismFadeRate);
  }

  show() {
    if (this.flash > 0) {
      stroke(17, 100, 100, this.flash);
      strokeWeight(this.size + this.flash / 10);
      point(this.pos.x, this.pos.y);
      this.flash -= 1;
    }

    if (this.seed && !this.stuck) {
      this.hue = (frameCount / 1) % 100;
    }

    if (this.seed && this.stuck) {
      push();
      strokeWeight(1);
      stroke(17, 100, 100, 100);
      noFill();
      text(`${Math.floor(this.core.calories)}`, this.pos.x + 25, this.pos.y);
      stroke(70, 30, 100, 100);
      text(
        `${Math.floor(this.core.wetness)}`,
        this.pos.x + 25,
        this.pos.y + 25
      );
      stroke(17, 100, 100, 100);
      noFill();
      text(
        `${Math.floor(this.core.lightAbsorbCount)}`,
        this.pos.x - 25,
        this.pos.y
      );
      stroke(70, 30, 100, 100);
      text(
        `${Math.floor(this.core.waterAbsorbCount)}`,
        this.pos.x - 25,
        this.pos.y + 25
      );

      pop();
    }

    super.show();
    // if (this.seed) {
    //   return;
    // }
    // if (this.stem && this.stuck) {
    //   this.brightness = 100;
    // }

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

  randomizeGenes() {
    this.ageToProduce = this.ageToProduce * random(0.5, 1.25); // 1000;
    this.growthRate = this.growthRate * random(0.75, 1.25);
    this.helioLimit = this.helioLimit * random(0.75, 1.25);
  }

  notPassGenes() {
    for (i = 0; i < numOfPlants; i++) {
      let seed = new Plant(
        width / 10 + (((width / 10) * 8) / numOfPlants) * i,
        (height / 100) * 99
      );
      seed.seed = true;
      seed.size = 4;
      seed.leaf = true;
      seed.ageToProduce = prevAgeToProduce;
      seed.leafChance = prevLeafChance;
      seed.branchChance = prevBranchChance;
      if (random(100) < 80) {
        seed.randomizeGenes();
        seed.mutant = true;
      }

      lines.push(seed);
    }
  }

  passGenes() {
    for (i = 0; i < numOfPlants; i++) {
      let seed = new Plant(
        width / 10 + (((width / 10) * 8) / numOfPlants) * i,
        (height / 100) * 99
      );
      seed.seed = true;
      seed.size = 4;
      seed.leaf = true;
      seed.ageToProduce = this.core.ageToProduce;
      seed.leafChance = this.core.leafChance;
      seed.branchChance = this.core.branchChance;
      if (random(100) < 50) {
        seed.randomizeGenes();
        seed.mutant = true;
      }

      lines.push(seed);
    }
  }

  blight() {
    if (random(100) < blightChance) {
      this.dead = true;
      console.log("plant dead");
    }
  }

  die() {
    this.dead = true;
    this.brightness = 50;
  }
}

function restartEco() {
  console.log("blight befell the leaves");
  killAllPlants();
  reSeed();
}

function killAllPlants() {
  for (walker of lines) {
    walker.die();
  }
}

function reSeed() {
  for (i = 0; i < numOfPlants; i++) {
    plant = new Plant(random(width), (height / 4) * 3 + random(height / 4));
    plant.seed = true;
    plant.size = 10;
    plant.hue = 1;
    plant.leaf = true;
    lines.push(plant);
  }
}
