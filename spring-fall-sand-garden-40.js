// TO DO NEXT:
// Idea: Make seed longevity tied to the height of the seed: if the seed is at the top of the screen, it will last longer
// Idea: floating plants?
// Assign each plant cell to a seed / core
// Let cells swap based on density
// Make petals less dense than dirt
// Make plants move through stages in unison
// Make growth stages cycle with a modulo

// RECENT CHANGE LOG:
// Flower petals that fall are turned to colored dirt when plant dies

let particles = [];
let idCounter = 1;
let leftRightChoices = [-1, 1];
let threeChoices = [-1, 0, 1];
let paused = false;
let pauseFlagged;

let perceptionRadius = 2;
let perceptionCount = 27;

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

// GLOBAL SLIDERS
// let targetFrameRate = 4;
let numOfDirt = cols * 0;
let numOfWater = cols * 0;
// let numOfSeeds = Math.floor(cols / 10);
let numOfSeeds = 1;
// Global sliders written into genes
let fallChance = 0.2; // written into genes
let selfCheckChance = 0.5; // written into genes
let chanceToMove = 1; // non-operative? written into genes

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  //establishes quadtree (trying to divide width/height by scaleSize)
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  background(0, 0, 0, 255);
  // Place first dirt particles randomly
  for (i = 0; i < numOfWater; i++) {
    let water = new Water(
      // // x-axis: center 9th of the screen
      // Math.floor((cols / 9) * 4) + Math.floor(random(cols / 9)),
      // // y-axis: upper third
      // Math.floor(random(rows / 3))
      Math.floor(random(cols)),
      Math.floor((rows / 3) * 2 + random(rows / 3))
    );
    particles.push(water);
  }

  // Place first dirt particles randomly
  for (i = 0; i < numOfDirt; i++) {
    let noiseIterator = 0;
    let dirt = new Dirt(
      // // x-axis: center 3rd of the screen
      // Math.floor(cols / 3) + Math.floor(random(cols / 3)),
      // // y-axis: lower third
      // Math.floor((rows / 3) * 2) + Math.floor(random(rows / 3))

      Math.floor(noise(i) * cols),
      //     Math.floor(random(rows * 0.65, rows * 0.9))
      //   );
      //   sand.falling = true;
      //   particles.push(sand);
      // }
      Math.floor(rows / 3 + random(rows / 3))
    );
    particles.push(dirt);
  }

  for (i = 0; i < numOfSeeds; i++) {
    let seed = new Seed(
      Math.floor(cols / 10 + (random(cols) / 10) * 8),
      Math.floor(rows / 3 + random(rows / 3)) // this sets the y
    );
    particles.push(seed);
  }
}

function draw() {
  if (frameCount % 1000 == 10) {
    console.log(frameCount);
  }
  // if (paused) {
  //   return;
  // }
  // clears the quadtree and adds particles
  quadTree.clear();
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  background(0, 0, 0, 255);

  // Have each particle calculates its next move based on the current grid
  for (var particle of particles) {
    particle.update();
  }

  // Show each particle on canvas
  for (var particle of particles) {
    particle.show();
  }

  textAlign(CENTER);
  stroke(255, 0, 255, 255);
  fill(255, 0, 0, 0);
  text(
    `
    FPS: ${Math.floor(frameRate())}
    Particles: ${particles.length} 
    `,
    (cols * scaleSize) / 2,
    (rows * scaleSize) / 20
  );
  // paused = true;

  particles = shuffle(particles);
}

// END OF LOOP

function make2DArray(w, h) {
  let arr = new Array(w);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(h);
  }
  return arr;
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.id = idCounter;
    idCounter++;
    this.r = 255;
    this.g = 0;
    this.b = 0;
    this.a = 255;
    this.color = random(colors);

    // physical qualities
    this.density = 0.5;

    this.selfCheckChance = selfCheckChance;
    this.fallChance = fallChance;
    this.chanceToMove = chanceToMove;

    // this.canLoopVertically = false;
  }

  swapPlaces(particle) {
    if (this.isStatic || particle.isStatic) {
      return;
    }
    let thisOldX = this.pos.x;
    let thisOldY = this.pos.y;
    this.pos.x = particle.pos.x;
    this.pos.y = particle.pos.y;
    particle.pos.x = thisOldX;
    particle.pos.y = thisOldY;
    particle.updated = true;
  }

  moveIfCrowded() {}

  update() {
    let selfOccupied = this.selfOccupied();
    if (selfOccupied == true && Math.random() < this.selfCheckChance) {
      this.moveUp();
      return;
    }
  }

  show() {
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
  }

  moveRel(x, y) {
    if (this.isStatic) {
      return;
    }
    this.pos.x = (cols + this.pos.x + x) % cols;
    this.pos.y = (rows + this.pos.y + y) % rows;
  }
  moveUp() {
    this.moveRel(0, -1);
  }
  moveDown() {
    this.moveRel(0, 1);
  }

  moveDownLeft() {
    this.moveRel(-1, 1);
  }
  moveDownRight() {
    this.moveRel(1, 1);
  }

  moveUpLeft() {
    this.moveRel(-1, -1);
  }
  moveUpRight() {
    this.moveRel(1, -1);
  }
  moveLeft() {
    this.moveRel(-1, 0);
  }
  moveRight() {
    this.moveRel(1, 0);
  }

  neighborOccupied(x, y) {
    let xAbs = (cols + this.pos.x + x) % cols;
    let yAbs = (rows + this.pos.y + y) % rows;

    let itemCount = 0;
    for (const other of quadTree.getItemsInRadius(
      xAbs,
      yAbs,
      perceptionRadius,
      perceptionCount
    )) {
      if (other && other.pos.x == xAbs && other.pos.y == yAbs) {
        itemCount++;
      }
    }

    if (itemCount > 0) {
      return true;
    } else if (itemCount == 0) {
      return false;
    }
  }

  selfOccupied() {
    let x = this.pos.x;
    let y = this.pos.y;
    let itemCount = 0;

    for (const other of quadTree.getItemsInRadius(
      x,
      y,
      perceptionRadius,
      perceptionCount
    )) {
      if (
        other &&
        other.id !== this.id &&
        other.pos.x == x &&
        other.pos.y == y
      ) {
        itemCount++;
      }
    }

    if (itemCount > 0) {
      return true;
    } else if (itemCount == 0) {
      return false;
    }
  }

  downOccupied() {
    let check = isOccupied(this.pos.x, this.pos.y + 1);
    return check;
  }

  upOccupied() {
    let check = isOccupied(this.pos.x, this.pos.y - 1);
    return check;
  }

  downLeftOccupied() {
    let check = isOccupied(this.pos.x - 1, this.pos.y + 1);
    return check;
  }

  downRightOccupied() {
    let check = isOccupied(this.pos.x + 1, this.pos.y + 1);
    return check;
  }

  upLeftOccupied() {
    let check = isOccupied(this.pos.x - 1, this.pos.y - 1);
    return check;
  }

  upRightOccupied() {
    let check = isOccupied(this.pos.x + 1, this.pos.y - 1);
    return check;
  }

  leftOccupied() {
    let check = isOccupied(this.pos.x - 1, this.pos.y);
    return check;
  }

  rightOccupied() {
    let check = isOccupied(this.pos.x + 1, this.pos.y);
    return check;
  }

  fall() {
    if (this.pos.y >= rows - 1) {
      this.isFalling = false;
      return;
    }
    let check = this.downOccupied();
    if (check == true) {
      this.isFalling = false;
      return;
    } else if (check == false) {
      this.isFalling = true;
      this.moveDown();
    }
  }
}

class Dirt extends Particle {
  constructor(x, y) {
    super(x, y);
    this.isFalling = true;
    this.isDirt = true;
    this.isWater = false;
    this.color = random(dirtColors);
    this.fallChance = fallChance;

    // physical qualities
    this.density = 0.6;

    this.canLoopVertically = false;
  }

  update() {
    super.update();
    if (this.isFalling) {
      this.fall();
    } else if (this.isFalling == false && Math.random() < this.fallChance) {
      this.isFalling = true; // turned off in -17, Mar13 1030pm
      this.fall();
    }
  }

  // adjusted fall for dirt so it tries down-left/down-right and swaps places with water anywhere it tries to move
  fall() {
    // if (this.isFalling == false) {
    //   return;
    // } // turned off in -17, Mar13 1030pm

    // this part controls whether Dirt loops around the bottom or stops at the ground
    if (this.pos.y >= rows - 1 && this.canLoopVertically == false) {
      let selfOccupied = this.selfOccupied();
      if (selfOccupied == true) {
        this.moveUp();
        return;
      }
      this.isFalling = false;
      return;
    }

    // check if below is occupied
    let downOccupied = this.downOccupied();
    // if empty, move
    if (downOccupied == false) {
      this.isFalling = true;
      this.fallCounter = 0;
      this.moveDown();
      return;
      // if down is occupied, try left or right
    } else if (downOccupied == true) {
      // check if below is water
      let below = getParticles(this.pos.x, this.pos.y + 1);
      // if there's only 1 particle below and less dense, swap places
      if (below.length >= 1 && below[0].density < this.density) {
        this.swapPlaces(below[0]);
        return;
      }
      // start checking down-left or down-right
      let downLeftOrRight = random(leftRightChoices);
      // try down-left first
      if (downLeftOrRight == -1) {
        let downLeftOccupied = this.downLeftOccupied();
        // if empty, move in
        if (downLeftOccupied == false) {
          this.isFalling = true;
          this.fallCounter = 0;
          this.moveDownLeft();
          return;
          // if down-left is occupied, check if it's water
        } else if (downLeftOccupied == true) {
          let belowLeft = getParticles(this.pos.x - 1, this.pos.y + 1);
          // if there's only 1 particle below and it's water, swap places
          if (belowLeft.length >= 1 && belowLeft[0].density < this.density) {
            this.swapPlaces(belowLeft[0]);
            return;
          }
          // if it's not water, try down-right
          let downRightOccupied = this.downRightOccupied();
          if (downRightOccupied == false) {
            this.isFalling = true;
            this.fallCounter = 0;
            this.moveDownRight();
            return;
          } else if (downRightOccupied == true) {
            let belowRight = getParticles(this.pos.x + 1, this.pos.y + 1);
            // if there's only 1 particle below and it's water, swap places
            if (
              belowRight.length >= 1 &&
              belowRight[0].density < this.density
            ) {
              this.swapPlaces(belowRight[0]);
              return;
            }
          }
        }
      }
      // try down-right first
      if (downLeftOrRight == 1) {
        let downRightOccupied = this.downRightOccupied();
        // if empty, move in
        if (downRightOccupied == false) {
          this.isFalling = true;
          this.fallCounter = 0;
          this.moveDownRight();
          return;
          // if down-right occupied, try down-left
        } else if (downRightOccupied == true) {
          let belowRight = getParticles(this.pos.x + 1, this.pos.y + 1);
          // if there's only 1 particle below and it's water, swap places
          if (belowRight.length >= 1 && belowRight[0].density < this.density) {
            this.swapPlaces(belowRight[0]);
            return;
          }
          let downLeftOccupied = this.downLeftOccupied();
          // if empty, move in
          if (downLeftOccupied == false) {
            this.isFalling = true;
            this.fallCounter = 0;
            this.moveDownLeft();
            return;
          } else if (downLeftOccupied == true) {
            let belowLeft = getParticles(this.pos.x - 1, this.pos.y + 1);
            // if there's only 1 particle below and it's water, swap places
            if (belowLeft.length >= 1 && belowLeft[0].density < this.density) {
              this.swapPlaces(belowLeft[0]);
              return;
            }
          }
        }
      }
      let selfOccupied = this.selfOccupied();
      if (selfOccupied == true && Math.random() < this.selfCheckChance) {
        this.moveUp();
        return;
      }
      this.isFalling = false;
      return;
    }
  }

  // // adjusted fall so it swaps places with water
  // fall() {
  //   if (this.pos.y >= rows - 1) {
  //     this.isFalling = false;
  //     return;
  //   }
  //   let check = this.downOccupied();
  //   // if down is occupied, check to see if it's water
  //   if (check == true) {
  //     let below = getParticles(this.pos.x, this.pos.y + 1);
  //     // if there's only 1 particle below and it's water, swap places
  //     if (below.length == 1 && below[0].isWater == true) {
  //       this.swapPlaces(below[0]);
  //       return;
  //     } else if (below.length == 1 && below[0].isDirt) {
  //       this.isFalling = false;
  //       return;
  //     }
  //   } else if (check == false) {
  //     this.isFalling = true;
  //     this.moveDown();
  //   }
  // }
}

class Water extends Dirt {
  constructor(x, y) {
    super(x, y);
    this.isFalling = true;
    this.isDirt = false;
    this.isWater = true;
    this.color = random(waterColors);
    this.fallCounter = 0;
    this.fallChance = fallChance;

    // physical qualities
    this.density = 0.4;

    this.canLoopVertically = true;
  }

  update() {
    if (this.isFalling) {
      this.fall();
    } else if (this.isFalling == false && Math.random() < this.fallChance) {
      this.fall();
    }
  }

  fall() {
    // stop falling if you hit bottom
    if (this.pos.y >= rows - 1 && this.canLoopVertically == false) {
      this.isFalling = false;
      return;
    }

    // stop falling if you've tried 10 times without success
    if (this.fallCounter > 10) {
      this.isFalling = false;
      return;
    }

    // check if below is occupied
    let downOccupied = this.downOccupied();
    // if empty, move
    if (downOccupied == false) {
      this.isFalling = true;
      this.fallCounter = 0;
      this.moveDown();
      return;
      // if down is occupied, try left or right
    } else if (downOccupied == true) {
      let downLeftOrRight = random(leftRightChoices);
      // try down-left first
      if (downLeftOrRight == -1) {
        let downLeftOccupied = this.downLeftOccupied();
        // if empty, move in
        if (downLeftOccupied == false) {
          this.isFalling = true;
          this.fallCounter = 0;
          this.moveDownLeft();
          return;
          // if down-left is occupied, try down-right
        } else if (downLeftOccupied == true) {
          let downRightOccupied = this.downRightOccupied();
          if (downRightOccupied == false) {
            this.isFalling = true;
            this.fallCounter = 0;
            this.moveDownRight();
            return;
          }
        }
      }
      // try down-right first
      if (downLeftOrRight == 1) {
        let downRightOccupied = this.downRightOccupied();
        // if empty, move in
        if (downRightOccupied == false) {
          this.isFalling = true;
          this.fallCounter = 0;
          this.moveDownRight();
          return;
          // if down-right occupied, try down-left
        } else if (downRightOccupied == true) {
          let downLeftOccupied = this.downLeftOccupied();
          // if empty, move in
          if (downLeftOccupied == false) {
            this.isFalling = true;
            this.fallCounter = 0;
            this.moveDownLeft();
            return;
          }
        }
      }
      // if you still haven't found a spot, try left or right
      let leftOrRight = random(leftRightChoices);

      // option 1: try left first
      if (leftOrRight == -1) {
        let leftOccupied = this.leftOccupied();
        // if empty, move in
        if (leftOccupied == false) {
          this.isFalling = true;
          this.fallingCount = 0;
          this.moveLeft();
          return;
          // if left is occupied, try right
        } else if (leftOccupied == true) {
          let rightOccupied = this.rightOccupied();
          // if empty, move in
          if (rightOccupied == false) {
            this.isFalling = true;
            this.fallingCount = 0;
            this.moveRight();
            return;
          }
        }
      }
      // option 2: try right first
      if (leftOrRight == 1) {
        let rightOccupied = this.rightOccupied();
        // if empty, move in
        if (rightOccupied == false) {
          this.isFalling = true;
          this.fallingCount = 0;
          this.moveRight();
          return;
          // if right occupied, try left
        } else if (rightOccupied == true) {
          let leftOccupied = this.leftOccupied();
          // if empty, move in
          if (leftOccupied == false) {
            this.isFalling = true;
            this.fallingCount = 0;
            this.moveLeft();
            return;
          }
        }
      }
      let selfOccupied = this.selfOccupied();
      if (selfOccupied == true && Math.random() < this.selfCheckChance) {
        this.moveUp();
        return;
      }
      this.fallingCount++;
    }
  }
}

class Plant extends Dirt {
  constructor(x, y) {
    super(x, y);
    this.isFalling = true;
    this.isDirt = false;
    this.isWater = false;
    this.isPlant = true;
    this.color = random(plantColors);

    // relations
    this.up = []; // child
    this.left = []; // child
    this.right = []; // child
    this.down = []; // parent
    // this.core = this;

    // plant qualities
    this.isStatic = true;
    this.hasSprouted = false;
    this.heightFromCore = this.heightFromBottom;
    // plant subclasses
    this.isSeed = false;
    this.isBud = false;
    this.isLeaf = false;
    this.isStem = false;
    this.isHub = false;
    this.isBranch = false;

    // plant odds
    this.photoChance = 0.001; // not operative
    this.chanceToSprout = 0.01;
    this.chanceToHub = 0.001;

    this.heightFromBottom = rows - this.pos.y;
  }

  tryPhotosynthesize() {
    if (Math.random() < this.photoChance) {
      this.photosynthesize;
    }
  }

  photosynthesize() {
    // photosynthesize here...
  }

  show() {
    super.show();
    if (this.isDead) {
    }
  }

  update() {
    super.update();
  }

  // update() {}
}

class Seed extends Plant {
  constructor(x, y) {
    super(x, y);

    this.density = 0.2;

    // plant qualities
    this.isStatic = false;
    this.isDead = false;

    // plant subclasses
    this.isSeed = true;
    this.isBud = false;
    this.isLeaf = false;
    this.isStem = false;
    this.isHub = false;
    this.isBranch = false;

    this.chanceToSprout = 0.1;

    this.age = 0;
    this.ageLimit = 1600;

    //seed qualities
    this.children = [];

    this.color = "White";
    this.hasKilled = false;

    // maxHeightPotential limits the height of the bud; 1 = bud can reach top of screen, 0 = bud cannot grow past the bottom of the screen
    this.maxHeightPotential = 0.95; // percentage of the screen height it can fill from the bottom up
    this.maxHeight =
      rows - Math.floor(Math.random() * this.maxHeightPotential * rows);

    this.maxHeightPercentage = (rows - this.maxHeight) / rows;
    this.ageLimit = this.ageLimit * this.maxHeightPercentage;
  }

  killPlant() {
    console.log("killing");
    // let seed = new Seed(this.pos.x, this.maxHeight);
    // particles.push(seed);
    console.log(this.children.length);
    this.highestChildHeight = 999999;
    if (this.children.length > 0) {
      for (var child of this.children) {
        if (child.pos.y < this.highestChildHeight) {
          this.highestChildHeight = child.pos.y;
          this.highestChild = child;
        }
        let dirtReplacement = new Dirt(child.pos.x, child.pos.y);
        if (
          child.isFlowerPetal
          // ||child.isApicalBud
          // || (child.isApicalStem && Math.random() > 0.8)
        ) {
          // dirtReplacement = new FlowerPetal(child.pos.x, child.pos.y);
          dirtReplacement.color = child.color;
          // dirtReplacement.density = child.density;
          // dirtReplacement.isFlowerPetal = true;
          dirtReplacement.isFalling = true;
          dirtReplacement.isStatic = false;
          // dirtReplacement.isAttached = false;
        }
        particles.splice(particles.indexOf(child), 1, dirtReplacement);
      }
    }
    let seed = new Seed(this.highestChild.pos.x, this.highestChild.pos.y - 3);
    particles.push(seed);
    console.dir(seed);
    this.isDead = true;
    this.color = "Grey";
  }

  update() {
    super.update();
    if (this.isDead) {
      return;
    }
    if (this.hasSprouted) {
      this.age++;
    }
    if (this.age > this.ageLimit && !this.hasKilled) {
      this.killPlant();
      this.hasKilled = true;
    }
    // if it hasn't sprouted, roll a chance to sprout
    if (
      !this.isFalling &&
      !this.hasSprouted &&
      Math.random() < this.chanceToSprout
    ) {
      this.sprout();
      this.isStatic = true;
    }
  }

  sprout() {
    let upOccupied = this.upOccupied();
    if (!upOccupied) {
      let apicalBud = new ApicalBud(this.pos.x, this.pos.y - 1);
      apicalBud.isFalling = false; // is this neccesary?
      apicalBud.isStraight = false;
      apicalBud.core = this;
      this.children.push(apicalBud);
      particles.push(apicalBud);
      this.hasSprouted = true;
      // console.log(`seed sprouted!`);
    }
  }
}

class Bud extends Plant {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isSeed = false;
    this.isBud = true;
    this.isLeaf = false;
    this.isStem = false;
    this.isHub = false;
    this.isBranch = false;

    this.color = "YellowGreen";
    this.chanceToSprout = 0.1;

    // bud qualities
    this.isStatic = false;
    this.isFalling = false;
    this.hasTerminated = false;
    this.yDirectionOfGrowth = -1; // up
  }
  update() {
    // super.update();
    // roll a chance to sprout

    if (this.hasTerminated && frameCount % 1000 == 10) {
      let selfOccupied = this.selfOccupied();
      if (selfOccupied == true && Math.random() < this.selfCheckChance) {
        this.moveUp();
      }
    }

    if (!this.hasTerminated && Math.random() < this.chanceToSprout) {
      this.sprout();
      // if this y position is less than the max y position, terminate
      if (this.pos.y <= this.core.maxHeight) {
        this.hasTerminated = true;
        // console.log(this.maxHeight, this.maxHeightPotential);
      }
    }
  }

  sprout() {
    if (this.isLeftBud || this.isRightBud) {
      if (this.isLeftBud) {
        let upLeftOccupied = this.upLeftOccupied();
        if (!upLeftOccupied) {
          let stem = new Stem(this.pos.x, this.pos.y);
          this.moveUpLeft();
          stem.core = this.core;
          this.core.children.push(stem);
          particles.push(stem);

          // console.log(`left bud sprouted`);
        }
      }
      if (this.isRightBud) {
        let upRightOccupied = this.upRightOccupied();
        if (!upRightOccupied) {
          let stem = new Stem(this.pos.x, this.pos.y);
          this.moveUpRight();
          stem.core = this.core;
          this.core.children.push(stem);
          particles.push(stem);
          // console.log(`right bud sprouted`);
        }
      }
      return;
    }
    let upOccupied = this.upOccupied();
    if (!upOccupied) {
      if (Math.random() > this.chanceToHub) {
        let stem = new Stem(this.pos.x, this.pos.y);
        this.moveUp();
        stem.core = this.core;
        this.core.children.push(stem);
        particles.push(stem);
        // console.log(`bud sprouted stem`);
      } else {
        let stem = new Hub(this.pos.x, this.pos.y);
        this.moveUp();
        stem.core = this.core;
        this.core.children.push(stem);
        particles.push(stem);
        // console.log(`bud sprouted *hub*!!!`);
      }
    } else if (upOccupied) {
      this.hasTerminated = true;
    }
  }
}

class FlowerBud extends Bud {
  constructor(x, y) {
    super(x, y);

    // flowerBud genes
    this.isFlowerBud = true;
    this.color = "Yellow";

    this.growthStage = random([0, 0, -1, -1, -2, -2]);
    this.chanceToSprout = 0.001;
    this.chancesToSprout = 0;
    // this.sproutsAttempted = 0
    this.sproutChanceLimit = 10000;
    this.chanceToMature = 0.01; // odds of rolling to mature
    this.chancesToMature = 0;
    this.matureChanceLimit = 10000; // number of max rolls to mature
    this.hasTerminated = false;

    this.prevFlowerStemDirection = 0;
    this.selfCheckChance = 1;

    this.petals = [];

    this.selfCheckRate = 1000;
    this.selfCheckRateOffset = Math.floor(Math.random() * this.selfCheckRate);

    // this.upOccupied = this.upOccupied();
    // this.leftOccupied = this.leftOccupied();
    // this.rightOccupied = this.rightOccupied();
    // this.downOccupied = this.downOccupied();
  }

  dropPetals() {
    if (this.petals.length > 0) {
      for (var petal of this.petals) {
        petal.isAttached = false;
        petal.isFalling = true;
        petal.isStatic = false;
      }
    }
  }

  update() {
    super.update();
    if (this.isFalling) {
      this.fall();
    }
    // // every 1000th frame, check if there's more than one particle in the current space; if the current space is occupied, move up
    // if ((frameCount + this.selfCheckRateOffset) % this.selfCheckRate == 10) {
    //   let selfOccupied = this.selfOccupied();
    //   if (selfOccupied == true && Math.random() < this.selfCheckChance) {
    //     this.moveUp();
    //   }
    // }

    // if still growing and has fewer than maximum petals, roll a chance to mature
    // why is 16 the max petals length?
    if (!this.hasTerminated && this.petals.length < 16) {
      // rolls a chance to mature to the next level
      // if the growth stage is greater than or equal to 1, roll a chance to mature to the next level
      if (this.growthStage >= 1 && Math.random() < this.chanceToMature) {
        // advance growth stage
        this.growthStage++;
        // reset chances to mature
        this.chancesToMature = 0;
      } else {
        // if roll to mature was unsusscessful, increment chances to mature
        this.chancesToMature++;
        // if chances to mature is greater than the limit, terminate
        if (this.chancesToMature > this.matureChanceLimit) {
          this.hasTerminated = true;
        }
      }

      // if growth stage is greater than or equal to 5, drop petals and reset growth stage to 1
      if (this.growthStage >= 5) {
        this.dropPetals();
        this.growthStage = 1;
        this.chancesToMature = 0;
      }

      // if growth stage equals 4, fill out lower petals (down, down-left, down-right)
      if (this.growthStage == 4) {
        let downLeftOccupied = this.downLeftOccupied();
        let downRightOccupied = this.downRightOccupied();
        let downOccupied = this.downOccupied();
        if (!downLeftOccupied) {
          let petal = new FlowerPetal(this.pos.x - 1, this.pos.y + 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
        if (!downRightOccupied) {
          let petal = new FlowerPetal(this.pos.x + 1, this.pos.y + 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
        if (!downOccupied) {
          let petal = new FlowerPetal(this.pos.x, this.pos.y + 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
      }

      // if growth stage equals 3, fill out upper corner petals (up-left, up-right)
      if (this.growthStage == 3) {
        let upLeftOccupied = this.upLeftOccupied();
        let upRightOccupied = this.upRightOccupied();
        if (!upLeftOccupied) {
          let petal = new FlowerPetal(this.pos.x - 1, this.pos.y - 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
        if (!upRightOccupied) {
          let petal = new FlowerPetal(this.pos.x + 1, this.pos.y - 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
      }

      // if growth stage equals 2, fill out cardinal petals (up, left, right)
      if (this.growthStage == 2) {
        let upOccupied = this.upOccupied();
        let leftOccupied = this.leftOccupied();
        let rightOccupied = this.rightOccupied();
        if (!upOccupied) {
          let petal = new FlowerPetal(this.pos.x, this.pos.y - 1);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
        if (!leftOccupied) {
          let petal = new FlowerPetal(this.pos.x - 1, this.pos.y);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
        if (!rightOccupied) {
          let petal = new FlowerPetal(this.pos.x + 1, this.pos.y);
          petal.core = this.core;
          this.core.children.push(petal);
          particles.push(petal);
          this.petals.push(petal);
        }
      }
      // before growth stage 1, flower bud grows laterally and creates new stems (lower the growth stage, longer the stem -- e.g., starting at growth stage -2 gets 3 lengths of stems)
      if (this.growthStage < 1) {
        let upLeftOccupied = this.upLeftOccupied();
        let upRightOccupied = this.upRightOccupied();
        // if there's a previous direction on record...
        if (this.prevFlowerStemDirection !== 0) {
          if (this.prevFlowerStemDirection == 1) {
            if (!upRightOccupied) {
              let flowerStem = new Stem(this.pos.x, this.pos.y);
              flowerStem.isFlowerStem = true;
              flowerStem.color = "Chartreuse";
              this.moveUpRight();
              this.prevFlowerStemDirection = 1;
              flowerStem.core = this.core;
              this.core.children.push(flowerStem);
              particles.push(flowerStem);

              this.growthStage++;
            }
          } else if (this.prevFlowerStemDirection == -1) {
            // console.log("previous path recognized, left");
            if (!upLeftOccupied) {
              let flowerStem = new Stem(this.pos.x, this.pos.y);
              flowerStem.isFlowerStem = true;
              flowerStem.color = "Chartreuse";
              this.moveUpLeft();
              this.prevFlowerStemDirection = -1;
              flowerStem.core = this.core;
              this.core.children.push(flowerStem);
              particles.push(flowerStem);
              this.growthStage++;
            }
          }
          return;
        }
        if (this.prevFlowerStemDirection == 0) {
          if (!upLeftOccupied || !upRightOccupied) {
            if (!upRightOccupied) {
              let flowerStem = new Stem(this.pos.x, this.pos.y);
              flowerStem.isFlowerStem = true;
              flowerStem.color = "Chartreuse";
              this.moveUpRight();
              // console.log(`flower bud ${this.id} moved up right, first time`);
              this.prevFlowerStemDirection = 1;
              flowerStem.core = this.core;
              this.core.children.push(flowerStem);
              particles.push(flowerStem);
            }
            if (!upLeftOccupied && this.prevFlowerStemDirection == 0) {
              let flowerStem = new Stem(this.pos.x, this.pos.y);
              flowerStem.isFlowerStem = true;
              flowerStem.color = "Chartreuse";
              this.moveUpLeft();
              // console.log(`flower bud ${this.id} moved up left, first time`);
              this.prevFlowerStemDirection = -1;
              flowerStem.core = this.core;
              this.core.children.push(flowerStem);
              particles.push(flowerStem);
            }
            this.growthStage++;
          }
        }
      }
    }
  }
}

class ApicalBud extends Bud {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isApicalBud = true;
    this.isStraight = true; // only straight apical buds can branch
    this.xOptions = [-1, 0, 0, 1]; // extra up option
    this.currentXOption = random(this.xOptions);
    this.prevXOption = false; // doesn't exist yet
    this.checkCounter = 0; // counts the number of consecutive occupied checks
    this.checkLimit = 10; // limits number of consecutive occupied checks

    this.chanceToSprout = 0.5;
  }

  update() {
    super.update();
    if (this.isFalling) {
      this.fall();
    }
  }

  sprout() {
    if (this.isStraight) {
      // only straight apical buds can branch
      let upOccupied = this.upOccupied();
      if (!upOccupied) {
        // chance to grow a hub
        if (Math.random() > this.chanceToHub) {
          let stem = new ApicalStem(this.pos.x, this.pos.y);
          this.moveUp();
          stem.core = this.core;
          this.core.children.push(stem);
          particles.push(stem);
          // console.log(`bud sprouted stem`);
        } else {
          let stem = new Hub(this.pos.x, this.pos.y);
          this.moveUp();
          stem.core = this.core;
          this.core.children.push(stem);
          particles.push(stem);
          // console.log(`bud sprouted *hub*!!!`);
        }
      } else if (upOccupied) {
        this.hasTerminated = true;
      }
    }
    if (this.isStraight == false) {
      // roll a random direction
      this.currentXOption = random(this.xOptions);

      // if prev X option exists and current option is exact opposite, re-roll
      if (this.prevXOption && this.currentXOption * -1 == this.prevXOption) {
        this.sprout();
      }

      let neighborOccupied = this.neighborOccupied(
        this.currentXOption,
        this.yDirectionOfGrowth
      );
      if (neighborOccupied) {
        this.checkCounter++;
        if (this.checkCounter > this.checkLimit) {
          this.hasTerminated = true;
          return;
        }
      } else if (!neighborOccupied) {
        let stem = new ApicalStem(this.pos.x, this.pos.y);
        this.moveRel(this.currentXOption, this.yDirectionOfGrowth);
        this.prevXOption = this.currentXOption;
        stem.core = this.core;
        this.core.children.push(stem);
        particles.push(stem);
      }
    }
  }
}

class FlowerPetal extends Plant {
  constructor(x, y) {
    super(x, y);
    // console.dir(this.core);
    this.isFlowerPetal = true;
    this.heightFromBottomPercentage = this.heightFromBottom / rows;
    // this.color = `rgb(
    //   ${Math.floor(512 - (this.pos.y / rows) * 512)},
    //   ${Math.floor(random(255))},
    //   ${Math.floor((this.pos.y / rows) * 255)})`;

    // this.isFalling = false;
    // this.isStatic = true;

    // physical qualities
    this.density = 0.2;

    // movement choices
    this.xOptions = [-1, 0, 1];
    this.currentXOption = random(this.xOptions);
    this.prevXOption = false; // doesn't exist yet

    this.color = false;

    // flower petal specific qualities
    this.isAttached = true;
    this.fallChance = 0.5;
    this.fallRate = 4;
    this.fallOffset = Math.floor(Math.random() * this.fallRate);
    this.fallCheckRate = 4;
    this.fallCheckOffset = Math.floor(Math.random() * this.fallCheckRate);

    this.canLoopVertically = false;
  }

  update() {
    if (!this.color) {
      this.r = Math.floor(
        512 -
          ((rows - this.core.maxHeight - this.heightFromBottom) /
            (rows - this.core.maxHeight)) *
            512
      );
      this.g = Math.floor(random(140));
      this.b = Math.floor(
        ((rows - this.core.maxHeight - this.heightFromBottom) /
          (rows - this.core.maxHeight)) *
          255
      );

      // Set this.color to a color based on the height of the petal relative to the max height of the core
      this.color = `rgb(${this.r},${this.g},${this.b})`;
    }

    if (this.isFalling && !this.isStatic) {
      if ((frameCount + this.fallOffset) % this.fallRate == 0) {
        this.fall();
      }
    }

    // if petal is not attached, once every 100 frames check if down, left, and right are occupied; if any are unoccupied, set to petal to isFalling and isStatic to false
    if (
      !this.isAttached &&
      (frameCount + this.fallCheckOffset) % this.fallCheckRate == 0
    ) {
      let downOccupied = this.downOccupied();
      let leftOccupied = this.leftOccupied();
      let rightOccupied = this.rightOccupied();

      if (!downOccupied || !leftOccupied || !rightOccupied) {
        this.isFalling = true;
        this.isStatic = false;
      } else {
        this.isFalling = false;
        // this.isStatic = true;
      }
    }
  }

  fall() {
    super.fall();
    // if you still haven't found a spot, try left or right
    let leftOrRight = random(this.xOptions);

    // option 1: try left first
    if (leftOrRight == -1) {
      let leftOccupied = this.leftOccupied();
      // if empty, move in
      if (leftOccupied == false) {
        this.isFalling = true;
        this.fallingCount = 0;
        this.moveLeft();
        return;
        // if left is occupied, try right
      } else if (leftOccupied == true) {
        let rightOccupied = this.rightOccupied();
        // if empty, move in
        if (rightOccupied == false) {
          this.isFalling = true;
          this.fallingCount = 0;
          this.moveRight();
          return;
        }
      }
    }
    // option 2: try right first
    if (leftOrRight == 1) {
      let rightOccupied = this.rightOccupied();
      // if empty, move in
      if (rightOccupied == false) {
        this.isFalling = true;
        this.fallingCount = 0;
        this.moveRight();
        return;
        // if right occupied, try left
      } else if (rightOccupied == true) {
        let leftOccupied = this.leftOccupied();
        // if empty, move in
        if (leftOccupied == false) {
          this.isFalling = true;
          this.fallingCount = 0;
          this.moveLeft();
          return;
        }
      }
    }
    // let selfOccupied = this.selfOccupied();
    // if (selfOccupied == true && Math.random() < this.selfCheckChance) {
    //   this.moveUp();
    //   return;
    // }
    this.fallingCount++;
  }
}

class Leaf extends Plant {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isSeed = false;
    this.isBud = false;
    this.isLeaf = true;
    this.isStem = false;
    this.isHub = false;
    this.isBranch = false;

    this.color = "DarkGreen";

    // chance to photosynthesize
    this.photoChance = 0.01;
  }
}

class Stem extends Plant {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isSeed = false;
    this.isBud = false;
    this.isLeaf = false;
    this.isStem = true;
    this.isHub = false;
    this.isBranch = false;

    this.color = "Green";
  }
  update() {
    super.update();
    // if it hasn't sprouted, roll a chance to sprout
    // if (!this.hasSprouted && Math.random() < this.chanceToSprout) {
    //   this.sprout();
    // }
  }

  // sprout() {
  //   let upOccupied = this.upOccupied();
  //   if (!upOccupied) {
  //     let sprout = new Bud(this.pos.x, this.pos.y - 1);
  //     sprout.isFalling = false;

  //     particles.push(sprout);
  //     this.hasSprouted = true;
  //     console.log(`stem sprouted!`);
  //   }
  // }
}

class ApicalStem extends Stem {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isApicalStem = true;
    this.hasTerminated = false;
    this.hasSprouted = false;
    this.chanceToSprout = 0.002;
    this.chancesToSprout = 0;
    this.sproutChanceLimit = 500;
  }

  update() {
    super.update();
    // if haven't terminated, check up
    if (!this.hasTerminated) {
      // if up is unoccupied, take a chance to sprout
      if (Math.random() < this.chanceToSprout) {
        this.sprout();
      } else {
        this.chancesToSprout++;

        // check up every 10 chances
        if (this.chancesToSprout % 10 == 9) {
          let upOccupied = this.upOccupied();
          if (upOccupied) {
            this.hasTerminated = true;
          }
        }

        // terminate after too many chances
        if (this.chancesToSprout > this.sproutChanceLimit) {
          // console.log("too many attempts to sprout");
          this.hasTerminated = true;
          this.color = "DarkGreen";
        }
      }
    }
  }

  sprout() {
    let upOccupied = this.upOccupied();
    if (upOccupied) {
      this.hasTerminated = true;
      return;
    } else if (!upOccupied) {
      let flowerBud = new FlowerBud(this.pos.x, this.pos.y - 1);
      this.hasSprouted == true;
      this.hasTerminated == true;
      flowerBud.core = this.core;
      this.core.children.push(flowerBud);
      particles.push(flowerBud);
    }
    // if (!upOccupied) {
    //   // chance to grow a hub
    //   if (Math.random() > this.chanceToHub) {
    //     let stem = new Stem(this.pos.x, this.pos.y);
    //     this.moveUp();
    //     particles.push(stem);
    //     // console.log(`bud sprouted stem`);
    //   } else {
    //     let stem = new Hub(this.pos.x, this.pos.y);
    //     this.moveUp();
    //     particles.push(stem);
    //     // console.log(`bud sprouted *hub*!!!`);
    //   }
    // } else if (upOccupied) {
    //   this.hasTerminated = true;
    // }
  }
}

class Hub extends Stem {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isSeed = false;
    this.isBud = false;
    this.isLeaf = false;
    this.isStem = false;
    this.isHub = true;
    this.isBranch = false;
  }
  update() {
    super.update();
    // if it hasn't sprouted, roll a chance to sprout
    if (!this.hasSprouted && Math.random() < this.chanceToSprout) {
      this.sprout();
    }
  }

  sprout() {
    let leftOccupied = this.leftOccupied();
    if (!leftOccupied) {
      let sprout = new Bud(this.pos.x - 1, this.pos.y);
      sprout.isLeftBud = true;
      sprout.isRightBud = false;
      sprout.isFalling = false;
      sprout.chanceToSprout = 0.01;
      sprout.core = this.core;
      this.core.children.push(sprout);
      particles.push(sprout);
    }
    let rightOccupied = this.rightOccupied();
    if (!rightOccupied) {
      let sprout = new Bud(this.pos.x + 1, this.pos.y);
      sprout.isLeftBud = false;
      sprout.isRightBud = true;
      sprout.isFalling = false;
      sprout.chanceToSprout = 0.01;
      sprout.core = this.core;
      this.core.children.push(sprout);
      particles.push(sprout);
    }
    this.hasSprouted = true;
    // console.log(`stem sprouted!`);
  }
}
class Branch extends Stem {
  constructor(x, y) {
    super(x, y);
    // plant subclasses
    this.isSeed = false;
    this.isBud = false;
    this.isLeaf = false;
    this.isStem = false;
    this.isHub = false;
    this.isBranch = true;

    this.depth = this.down[0].depth + 1;
  }
}

// function mouseClicked() {
//   let seed = new Seed(
//     Math.floor(mouseX / scaleSize),
//     Math.floor(mouseY / scaleSize)
//   );
//   particles.push(seed);
// }

// // mouseClicked function to console log the contents of the area clicked
// function mouseClicked() {
//   let x = Math.floor(mouseX / scaleSize);
//   let y = Math.floor(mouseY / scaleSize);
//   for (let i = 0; i < particles.length; i++) {
//     if (particles[i].pos.x == x && particles[i].pos.y == y) {
//       console.log(particles[i]);
//     }
//   }
// }
// // p5 function for when touch screen is tapped
function touchStarted() {
  let seed = new Seed(
    Math.floor(mouseX / scaleSize),
    Math.floor(mouseY / scaleSize)
  );
  particles.push(seed);
}

// function doubleClicked() {
//   let seed = new Seed(
//     Math.floor(mouseX / scaleSize),
//     Math.floor(mouseY / scaleSize)
//   );
//   particles.push(seed);
// }

function doubleClicked() {
  let seed = new Seed(
    Math.floor(mouseX / scaleSize),
    Math.floor(mouseY / scaleSize)
  );
  particles.push(seed);

  //   // NEW DOUBLECLICKED, MAKES PLANTS ADVANCE TO NEXT GROWTH STAGE
  //   for (var particle of particles) {
  //     if (particle.isFlowerBud) {
  //       particle.growthStage++;
  //       console.log(`${particle.id} grew to stage ${particle.growthStage}`);
  //     }
  //   }

  // OLD DOUBLECLICKED, RETURNS PARTICLE YOU CLICKED ON
  //   let x = Math.floor(mouseX / scaleSize);
  //   let y = Math.floor(mouseY / scaleSize);
  //   for (let i = 0; i < particles.length; i++) {
  //     if (particles[i].pos.x == x && particles[i].pos.y == y) {
  //       console.log(particles[i]);
  //     }
  //   }
}
function touchStarted() {
  for (var particle of particles) {
    if (particle.isFlowerBud) {
      particle.growthStage++;
      console.log(`${particle.id} grew to stage ${particle.growthStage}`);
    }
  }
}

function mouseDragged() {
  // // gradually generate new flower petal particles at the position of the mouse
  // if (frameCount % 10 == 1) {
  //   console.log("attempting to generate petal");
  //   let petal = new FlowerPetal(
  //     Math.floor(mouseX / scaleSize),
  //     Math.floor(mouseY / scaleSize)
  //   );
  //   petal.isFalling = true;
  //   petal.isStatic = false;
  //   particles.push(petal);
  // }
}

// function cloneGrid(grid) {
//   // Clone the 1st dimension (column)
//   const newGrid = [...grid];
//   // Clone each row
//   newGrid.forEach((row, rowIndex) => (newGrid[rowIndex] = [...row]));
//   return newGrid;
// }

// returns any particles in the specified area, from Quadtree
function getParticles(x, y, perceptionRadius = 2, perceptionCount = 27) {
  let itemsArray = [];

  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  )) {
    if (other) {
      if (other.pos.x == x && other.pos.y == y) {
        itemsArray.push(other);
      }
    }
  }
  return itemsArray;
}

// shuffles array in place
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    // swap elements array[i] and array[j]
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// returns true if there's a particle that currently occupies this spot
function isOccupied(x, y) {
  x = (cols + x) % cols;
  y = (rows + y) % rows;
  let itemCount = 0;
  for (const other of quadTree.getItemsInRadius(
    x,
    y,
    perceptionRadius,
    perceptionCount
  )) {
    if (other && other.pos.x == x && other.pos.y == y) {
      itemCount++;
      break;
    }
  }

  if (itemCount > 0) {
    return true;
  } else if (itemCount == 0) {
    return false;
  }
}

let sandColors = [
  "AntiqueWhite",
  "Beige",
  "Bisque",
  "BlanchedAlmond",
  "BurlyWood",
  "Cornsilk",
  "DarkGoldenRod",
  "Gold",
  "GoldenRod",
  "Khaki",
  "LightGoldenRodYellow",
  "LemonChiffon",
  "PaleGoldenRod",
  "Moccasin",
  "NavajoWhite",
  "PeachPuff",
  "SandyBrown",
  "Tan",
  "Wheat",
];
let waterColors = [
  "Aqua",
  // "Aquamarine",
  // "Blue",
  // "CadetBlue",
  // "CornflowerBlue",
  "Cyan",
  // "DarkCyan",
  // "DarkTurquoise",
  "DeepSkyBlue",
  "DodgerBlue",
  // "LightSkyBlue",
  // "LightSeaGreen",
  // "MediumAquaMarine",
  // "MediumSeaGreen",
  // "MediumBlue",
  "MediumTurquoise",
  // "RoyalBlue",
  // "SkyBlue",
  // "SteelBlue",
  // "Teal",
  "SteelBlue",
  "Turquoise",
];
let stoneColors = [
  "DarkGray",
  "DimGray",
  "Gray",
  "Gainsboro",
  "GhostWhite",
  "FloralWhile",
  "AntiqueWhite",
  "Ivory",
  "Lavender",
  "LavenderBlush",
  "LightGray",
  "LightSlateGray",
  "Linen",
  "MintCreme",
  "OldLace",
  "Silver",
  "SlateGray",
];
let dirtColors = [
  "SaddleBrown",
  "Sienna",
  // "SandyBrown",
  "#964B00",
  "#A47551",
  "#523A28",
  "#654321",
  "#51361a",
  "#5d3a1a",
  "#402A15",
  // "PastelBrown",
  // "PaleBrown",
  // "Flattery",
  // "OtterBrown",
];
let leafColors = [
  "Crimson",
  "DarkGoldenRod",
  "DarkGreen",
  "DarkMagenta",
  "DarkRed",
  "DarkSalmon",
  "DarkOrchid",
  "DarkViolet",
  "DarkSlateBlue",
  "DeepPink",
  "FireBrick",
  "Gold",
  "Fuschsia",
  "HotPink",
  "IndianRed",
  "Indigo",
  "LawnGreen",
  "LightPink",
  "MediumOrchid",
  "Magenta",
  "Maroon",
  "MediumPurple",
  "MediumVioletRed",
  "Orchid",
  "OliveDrab",
  "PaleVioletRed",
  "Pink",
  "Plum",
  "Purple",
  "Thistle",
  "Violet",
];
let plantColors = [
  // "AliceBlue",
  // "AntiqueWhite",
  // "Aqua",
  // "Aquamarine",
  // "Azure",
  // "Beige",
  // "Bisque",
  // "Black",
  // "BlanchedAlmond",
  // "Blue",
  // "BlueViolet",
  // "Brown",
  // "BurlyWood",
  // "CadetBlue",
  "Chartreuse",
  // "Chocolate",
  // "Coral",
  // "CornflowerBlue",
  // "Cornsilk",
  // "Crimson",
  // "Cyan",
  // "DarkBlue",
  // "DarkCyan",
  // "DarkGoldenRod",
  // "DarkGray",
  // "DarkGrey",
  "DarkGreen",
  // "DarkKhaki",
  // "DarkMagenta",
  // "DarkOliveGreen",
  // "DarkOrange",
  // "DarkOrchid",
  // "DarkRed",
  // "DarkSalmon",
  // "DarkSeaGreen",
  // "DarkSlateBlue",
  // "DarkSlateGray",
  // "DarkSlateGrey",
  // "DarkTurquoise",
  // "DarkViolet",
  // "DeepPink",
  // "DeepSkyBlue",
  // "DimGray",
  // "DimGrey",
  // "DodgerBlue",
  // "FireBrick",
  // "FloralWhite",
  // "ForestGreen",
  // "Fuchsia",
  // "Gainsboro",
  // "GhostWhite",
  // "Gold",
  // "GoldenRod",
  // "Gray",
  // "Grey",
  "Green",
  "GreenYellow",
  // "Honeydew",
  // "HotPink",
  // "IndianRed",
  // "Indigo",
  // "Ivory",
  // "Khaki",
  // "Lavender",
  // "LavenderBlush",
  "LawnGreen",
  // "LemonChiffon",
  // "LightBlue",
  // "LightCoral",
  // "LightCyan",
  // "LightGoldenRodYellow",
  // "LightGray",
  // "LightGrey",
  "LightGreen",
  // "LightPink",
  // "LightSalmon",
  // "LightSeaGreen",
  // "LightSkyBlue",
  // "LightSlateGray",
  // "LightSlateGrey",
  // "LightSteelBlue",
  // "LightYellow",
  "Lime",
  "LimeGreen",
  // "Linen",
  // "Magenta",
  // "Maroon",
  // "MediumAquaMarine",
  // "MediumBlue",
  // "MediumOrchid",
  // "MediumPurple",
  "MediumSeaGreen",
  // "MediumSlateBlue",
  "MediumSpringGreen",
  // "MediumTurquoise",
  // "MediumVioletRed",
  // "MidnightBlue",
  // "MintCream",
  // "MistyRose",
  // "Moccasin",
  // "NavajoWhite",
  // "Navy",
  // "OldLace",
  // "Olive",
  // "OliveDrab",
  // "Orange",
  // "OrangeRed",
  // "Orchid",
  // "PaleGoldenRod",
  "PaleGreen",
  // "PaleTurquoise",
  // "PaleVioletRed",
  // "PapayaWhip",
  // "PeachPuff",
  // "Peru",
  // "Pink",
  // "Plum",
  // "PowderBlue",
  // "Purple",
  // "RebeccaPurple",
  // "Red",
  // "RosyBrown",
  // "RoyalBlue",
  // "SaddleBrown",
  // "Salmon",
  // "SandyBrown",
  "SeaGreen",
  // "SeaShell",
  // "Sienna",
  // "Silver",
  // "SkyBlue",
  // "SlateBlue",
  // "SlateGray",
  // "SlateGrey",
  // "Snow",
  "SpringGreen",
  // "SteelBlue",
  // "Tan",
  // "Teal",
  // "Thistle",
  // "Tomato",
  // "Turquoise",
  // "Violet",
  // "Wheat",
  // "White",
  // "WhiteSmoke",
  // "Yellow",
  "YellowGreen",
];
let colors = [
  "AliceBlue",
  "AntiqueWhite",
  "Aqua",
  "Aquamarine",
  "Azure",
  "Beige",
  "Bisque",
  "Black",
  "BlanchedAlmond",
  "Blue",
  "BlueViolet",
  "Brown",
  "BurlyWood",
  "CadetBlue",
  "Chartreuse",
  "Chocolate",
  "Coral",
  "CornflowerBlue",
  "Cornsilk",
  "Crimson",
  "Cyan",
  "DarkBlue",
  "DarkCyan",
  "DarkGoldenRod",
  "DarkGray",
  "DarkGrey",
  "DarkGreen",
  "DarkKhaki",
  "DarkMagenta",
  "DarkOliveGreen",
  "DarkOrange",
  "DarkOrchid",
  "DarkRed",
  "DarkSalmon",
  "DarkSeaGreen",
  "DarkSlateBlue",
  "DarkSlateGray",
  "DarkSlateGrey",
  "DarkTurquoise",
  "DarkViolet",
  "DeepPink",
  "DeepSkyBlue",
  "DimGray",
  "DimGrey",
  "DodgerBlue",
  "FireBrick",
  "FloralWhite",
  "ForestGreen",
  "Fuchsia",
  "Gainsboro",
  "GhostWhite",
  "Gold",
  "GoldenRod",
  "Gray",
  "Grey",
  "Green",
  "GreenYellow",
  "HoneyDew",
  "HotPink",
  "IndianRed",
  "Indigo",
  "Ivory",
  "Khaki",
  "Lavender",
  "LavenderBlush",
  "LawnGreen",
  "LemonChiffon",
  "LightBlue",
  "LightCoral",
  "LightCyan",
  "LightGoldenRodYellow",
  "LightGray",
  "LightGrey",
  "LightGreen",
  "LightPink",
  "LightSalmon",
  "LightSeaGreen",
  "LightSkyBlue",
  "LightSlateGray",
  "LightSlateGrey",
  "LightSteelBlue",
  "LightYellow",
  "Lime",
  "LimeGreen",
  "Linen",
  "Magenta",
  "Maroon",
  "MediumAquaMarine",
  "MediumBlue",
  "MediumOrchid",
  "MediumPurple",
  "MediumSeaGreen",
  "MediumSlateBlue",
  "MediumSpringGreen",
  "MediumTurquoise",
  "MediumVioletRed",
  "MidnightBlue",
  "MintCream",
  "MistyRose",
  "Moccasin",
  "NavajoWhite",
  "Navy",
  "OldLace",
  "Olive",
  "OliveDrab",
  "Orange",
  "OrangeRed",
  "Orchid",
  "PaleGoldenRod",
  "PaleGreen",
  "PaleTurquoise",
  "PaleVioletRed",
  "PapayaWhip",
  "PeachPuff",
  "Peru",
  "Pink",
  "Plum",
  "PowderBlue",
  "Purple",
  "RebeccaPurple",
  "Red",
  "RosyBrown",
  "RoyalBlue",
  "SaddleBrown",
  "Salmon",
  "SandyBrown",
  "SeaGreen",
  "SeaShell",
  "Sienna",
  "Silver",
  "SkyBlue",
  "SlateBlue",
  "SlateGray",
  "SlateGrey",
  "Snow",
  "SpringGreen",
  "SteelBlue",
  "Tan",
  "Teal",
  "Thistle",
  "Tomato",
  "Turquoise",
  "Violet",
  "Wheat",
  "White",
  "WhiteSmoke",
  "Yellow",
  "YellowGreen",
];

// if (paused && !pauseFlagged) {
//   // console.log("paused!");
//   pauseFlagged = true;
//   return;
// } else if (paused && pauseFlagged) {
//   return;
// } else if (!paused) {
//   // console.log("unpaused!");
//   pauseFlagged = false;
// }
