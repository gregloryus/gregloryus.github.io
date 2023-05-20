/*
 * A rectangle with `x` and `y` coordinates specifying the top-left corner and a `width` and `height`
 */
class Rect {
  // By default, positioned at [0, 0] with a width and height of 1
  constructor(x = 0, y = 0, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /*
   * Return a new rectangle instance with the same values
   */
  copy() {
    return new Rect(this.x, this.y, this.width, this.height);
  }
}
/*
 * Private class.
 * A container object used to hold user-defined data within a `QuadTreeBin`.
 * Stores it's position within the QuadTree domain.
 */
class QuadTreeItem {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.data = data;
  }
}

/*
 * Private class.
 * A spatial region of a QuadTree containing 0 or more `QuadTreeItem` instances and 0 or more other `QuadTreeBin` instances.
 */
class QuadTreeBin {
  /*
   * @param maxDepth The maximum number of permitted subdivisions.
   * @param maxItemsPerBin The maximum number of items in a single bin before it is subdivided.
   * @param extent A `Rect` instance specifying the bounds of this `QuadTreeBin` instance within the QuadTree domain.
   * @param depth For internal use only.
   */
  constructor(maxDepth, maxItemsPerBin, extent, depth = 0) {
    this.rect = extent.copy();
    this.bins = null;
    this.maxDepth = maxDepth;
    this.maxItemsPerBin = maxItemsPerBin;
    this.items = [];
    this.depth = depth;
  }

  /*
   * Check if a point is within the extent of a `QuadTreeBin` instance.
   * Returns true if so, false otherwise.
   * @param range Used to check if a point is within a radius of the extent border.
   */
  checkWithinExtent(x, y, range = 0) {
    return (
      x >= this.rect.x - range &&
      x < this.rect.x + this.rect.width + range &&
      y >= this.rect.y - range &&
      y < this.rect.y + this.rect.height + range
    );
  }

  /*
   * Adds an item to the `QuadTreeBin`.
   * @param item An instance of `QuadTreeItem`.
   */
  addItem(item) {
    if (this.bins === null) {
      this.items.push(item);
      if (
        this.depth < this.maxDepth &&
        this.items !== null &&
        this.items.length > this.maxItemsPerBin
      )
        this.subDivide();
    } else {
      const binIndex = this._getBinIndex(item.x, item.y);
      if (binIndex != -1) this.bins[binIndex].addItem(item);
    }
  }

  /*
   * Returns a list of items from the bin within the specified radius of the coordinates provided.
   */
  getItemsInRadius(x, y, radius, maxItems) {
    const radiusSqrd = radius ** 2;
    let items = [];

    if (this.bins) {
      for (let b of this.bins)
        if (b.checkWithinExtent(x, y, radius))
          items.push(...b.getItemsInRadius(x, y, radius, maxItems));
    } else {
      for (let item of this.items) {
        const distSqrd = (item.x - x) ** 2 + (item.y - y) ** 2;
        if (distSqrd <= radiusSqrd)
          items.push({ distSqrd: distSqrd, data: item.data });
      }
    }

    return items;
  }

  /*
   * Split a `QuadTreeBin` into 4 smaller `QuadTreeBin`s.
   * Removes all `QuadTreeItem`s from the bin and adds them to the appropriate child bins.
   */
  subDivide() {
    if (this.bins !== null) return;
    this.bins = [];
    let w = this.rect.width * 0.5,
      h = this.rect.height * 0.5;
    for (let i = 0; i < 4; ++i)
      this.bins.push(
        new QuadTreeBin(
          this.maxDepth,
          this.maxItemsPerBin,
          new Rect(
            this.rect.x + (i % 2) * w,
            this.rect.y + Math.floor(i * 0.5) * h,
            w,
            h
          ),
          this.depth + 1
        )
      );

    for (let item of this.items) {
      const binIndex = this._getBinIndex(item.x, item.y);
      if (binIndex != -1) this.bins[binIndex].addItem(item);
    }

    this.items = null;
  }

  /*
   * Renders the borders of the `QuadTreeBin`s within this `QuadTreeBin`.
   * For debugging purposes.
   */
  debugRender(renderingContext) {
    noFill();
    stroke("#aaa");
    strokeWeight(1);
    rect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    if (this.bins) for (let b of this.bins) b.debugRender(renderingContext);
  }

  /*
   * Private.
   */
  _getBinIndex(x, y, range = 0) {
    if (!this.checkWithinExtent(x, y)) return -1;
    let w = this.rect.width * 0.5,
      h = this.rect.height * 0.5;
    let xx = Math.floor((x - this.rect.x) / w);
    let yy = Math.floor((y - this.rect.y) / h);
    return xx + yy * 2;
  }
}

/*
 * A public class representing a QuadTree structure.
 */
class QuadTree {
  /*
   * @param maxDepth The maximum number of permitted subdivisions.
   * @param maxItemsPerBin The maximum number of items in a single bin before it is subdivided.
   * @param extent A `Rect` instance specifying the bounds of this `QuadTreeBin` instance within the QuadTree domain.
   */
  constructor(maxDepth, maxItemsPerBin, extent) {
    this.extent = extent.copy();
    this.maxDepth = maxDepth;
    this.maxItemsPerBin = maxItemsPerBin;
    this.clear();
  }

  /*
   * Remove all `QuadTreeItem`s and `QuadTreeBin`s from the QuadTree leaving it completely empty.
   */
  clear() {
    this.rootBin = new QuadTreeBin(
      this.maxDepth,
      this.maxItemsPerBin,
      new Rect(0, 0, this.extent.width, this.extent.height)
    );
  }

  /*
   * Add an item at a specified position in the `QuadTree`.
   * @param x The x coordinate of the item.
   * @param y The y coordinate of the item.
   * @param item The user-defined data structure to store in the `QuadTree`.
   */
  addItem(x, y, item) {
    this.rootBin.addItem(new QuadTreeItem(x, y, item));
  }

  /*
   * Returns a list of items within the specified radius of the specified coordinates.
   */
  getItemsInRadius(x, y, radius, maxItems) {
    if (maxItems === undefined) {
      return this.rootBin.getItemsInRadius(x, y, radius);
    } else {
      return this.rootBin
        .getItemsInRadius(x, y, radius)
        .sort((a, b) => a.distSqrd - b.distSqrd)
        .slice(0, maxItems)
        .map((v) => v.data);
    }
  }

  /*
   * Renders the borders of the `QuadTreeBin`s within this `QuadTree`.
   * For debugging purposes.
   */
  debugRender(renderingContext) {
    this.rootBin.debugRender(renderingContext);
  }
}

// MAGIC NUMBERS
let targetFrameRate = 60;
let SEED_LIFETIME = 1000;
let numOfLight = 100;
let numOfDirt = 0;
let numOfSeeds = 1;
let growthCountdown = 100;
let lightReqToSprout = 3;
let lightReqToSeed = 50;
let lightAlpha = 0.025; //0.005 = barely visible
let flashAlpha = 0.5;
let lightDeduction = 0.05;

let normalAlpha = 0.5;
let normalDim = 0.05;
let stemColorG = 150; // 0-255
let seedScatterX = 30;

let genePool = [1, 0]; // reformat at trigrams?
let particles = [];
let idCounter = 1;
let paused = false;

let dirtColors = [
  // { r: 194, g: 178, b: 128, a: 1 }, // sand dollar
  // { r: 210, g: 180, b: 140, a: 1 }, // tan
  { r: 139, g: 69, b: 19, a: 1 }, // saddle brown
  // { r: 130, g: 100, b: 30, a: 1 },
  // { r: 100, g: 50, b: 60, a: 1 },
];

let colorIncrement = 0;

let perceptionRadius = 2;
let perceptionCount = 27;

let scaleSize = 16;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
// console.log(`cols, rows: ${cols}, ${rows}`);

// GLOBAL SLIDERS

let maxSeed, maxScore, maxSeedGenome;

p5.disableFriendlyErrors = true;

let up, down, left, right;

let sproutCounter = 0;

// function doubleClicked() {
//   let x = Math.floor(mouseX / scaleSize);
//   let y = Math.floor(mouseY / scaleSize);
//   let seed = new Seed(x, y);
//   particles.push(seed);
//   console.log("seed added?");
// }

function mouseClicked() {
  let x = Math.floor(mouseX / scaleSize);
  let y = Math.floor(mouseY / scaleSize);
  let seed = new Seed(x, y);
  particles.push(seed);
  console.log(seed.genome);
}

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  //establishes quadtree (trying to divide width/height by scaleSize)
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  frameRate(targetFrameRate);
  // angleMode(DEGREES);

  let up = createVector(0, -1);
  let down = createVector(0, 1);
  let left = createVector(-1, 0);
  let right = createVector(1, 0);

  background(0, 0, 0, 255);

  for (i = 0; i < numOfLight; i++) {
    let x = 1 + Math.floor(Math.random() * (cols - 1));
    let y = 1 + Math.floor(Math.random() * (rows - 1));
    let light = new Light(x, y);
    particles.push(light);
  }

  // // distributes seeds randomly
  // for (i = 0; i < numOfSeeds; i++) {
  //   let x = 1 + Math.floor(Math.random() * (cols - 1));
  //   let y = 1 + Math.floor(Math.random() * (rows - 1));
  //   let seed = new Seed(x, y);
  //   particles.push(seed);
  // }

  for (i = 0; i < numOfDirt; i++) {
    let x = 1 + Math.floor(Math.random() * (cols - 1));
    let y = 1 + Math.floor(Math.random() * (rows - 1));
    let dirt = new Dirt(x, y);
    particles.push(dirt);
  }

  let x = Math.floor(cols / 2);
  let y = Math.floor(rows - 4);
  let seed = new Seed(x, y);
  particles.push(seed);

  // console.log(rows);
  console.log(
    // Log the rows and cols
    `rows: ${rows}, cols: ${cols}, scaleSize: ${scaleSize}`
  );
}

function draw() {
  // clears the quadtree and adds particles
  quadTree.clear();
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  // clears the background, sets it to black
  background(0, 0, 0, 255);

  for (var particle of particles) {
    particle.update();
    particle.show();
  }
  textSize(20);
  textAlign(LEFT);
  stroke(255, 0, 255, 50);
  fill(255, 0, 0, 50);
  text(
    `
    FPS: ${Math.floor(frameRate())}
    Particles: ${particles.length}
    `,
    (cols * scaleSize) / 2,
    (rows * scaleSize) / 20
  );
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.id = idCounter;
    idCounter++;
    this.color = {
      r: random(255),
      g: random(255),
      b: random(255),
      a: 255,
    };
    this.density = 0.5;
    this.isLight = false;
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

  update() {}

  show() {
    this.colorString = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
    canvasContext.fillStyle = this.colorString;
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
  // ...
  constructor(x, y) {
    super(x, y);
    this.isDirt = true;
    this.isFalling = true;
    this.color = random(dirtColors);
  }

  fall() {
    if (this.pos.y >= rows - 1) {
      this.isFalling = false;
      return;
    }
    let check = this.downOccupied();
    if (check == true) {
      // randomly either check down-left or down-right for unoccupied space; if unoccupied, move there; if occupied, check the other direction; if both are occupied, stop falling.
      let checkLeft = this.downLeftOccupied();
      let checkRight = this.downRightOccupied();
      if (checkLeft == false && checkRight == false) {
        let choice = Math.floor(Math.random() * 2);
        if (choice == 0) {
          this.moveDownLeft();
        } else if (choice == 1) {
          this.moveDownRight();
        }
      }
      if (checkLeft == false && checkRight == true) {
        this.moveDownLeft();
      }
      if (checkLeft == true && checkRight == false) {
        this.moveDownRight();
      }
      if (checkLeft == true && checkRight == true) {
        this.isFalling = false;
        return;
      }
    } else if (check == false) {
      this.isFalling = true;
      this.moveDown();
      return;
    }
  }

  update() {
    this.fall();
  }
}

class Light extends Particle {
  constructor(x, y) {
    super(x, y);
    this.isLight = true;
    this.isFalling = true;
    this.color.r = 255;
    this.color.g = 255;
    this.color.b = 0;
    this.color.a = lightAlpha;
  }

  flash() {
    this.color.a = flashAlpha;
    this.show();
  }

  reset() {
    this.color.a = lightAlpha;
    this.pos.y = 0;
    this.pos.x = 1 + Math.floor(Math.random() * (cols - 1));
  }
  update() {
    // if not falling, dim light and reset if dim enough
    if (!this.isFalling) {
      this.color.a = this.color.a - lightDeduction;
      if (this.color.a <= 0) {
        this.isFalling = true;
        this.reset();
        return;
      }
      return;
    }
    // if hit the bottom, stop falling
    if (this.pos.y >= rows - 1) {
      this.isFalling = false;
      return;
    }

    // use quadtree to check immediate surroundings for non-light particles
    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      // if other particle is not light....
      if (other && other.isLight == false) {
        // if other particle is plant within 1px, affect plant and stop falling
        if (
          other.isPlant &&
          ((other.pos.x - this.pos.x == 0 &&
            Math.abs(other.pos.y - this.pos.y) == 1) ||
            (other.pos.y - this.pos.y == 0 &&
              Math.abs(other.pos.x - this.pos.x) == 1))
        ) {
          // affecting plant
          // console.log("affecting plant");
          other.lightScore++;
          if (other.isSeed) {
            other.lightScore = 0;
          }
          other.color.a = 1.0;
          // stop falling
          this.isFalling = false; // false = stops light from falling after affecting plant
          this.flash();
          // this.reset();
          return;
        }
        // if other particle is directly below light, stop falling
        if (other.pos.x == this.pos.x && other.pos.y == this.pos.y + 1) {
          this.isFalling = false;
          this.reset();
          return;
        }
      }
    }

    // check if down is occupied
    let downOccupied = this.downOccupied();
    if (downOccupied) {
      this.isFalling = false;
      this.color.a = 255;
      return;
    } else if (!downOccupied) {
      this.isFalling = true;
      this.moveDown();
    }
  }

  show() {
    this.colorString = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
    canvasContext.fillStyle = this.colorString;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
  }
}

class Seed extends Particle {
  constructor(x, y) {
    super(x, y);
    this.evoDir = 1;
    this.isPlant = true;
    this.isSeed = true;
    this.isClone = false;
    this.isMutant = true;
    this.chanceToMutate = 0.9;
    this.color.r = 100;
    this.color.g = 50;
    this.color.b = 50;
    this.isFalling = true;
    this.hasSprouted = false;
    this.hasReproduced = false;
    // // setting up genes for 3 straight-up stems to start

    this.genome = new Genome([0, 1, 0]);
    this.genome.genomesOfChildren[1] = new Genome([0, 1, 0]);
    this.genome.genomesOfChildren[1].genomesOfChildren[1] = new Genome([
      0, 1, 0,
    ]);
    this.children = [null, null, null];
    this.plantParticles = [];
    this.age = 0;
    this.lifetime = SEED_LIFETIME;
    this.killCountdown = 10;
    this.hasMutated = false;
    this.canMutate = true;
    this.isMutant = true;
    this.isClone = false;

    // scoring system for fitness and energy
    this.energyScore = 0;
    // this.energyGen = 0;
    // this.energyCost = 2;
    // this.energyScore = this.energyGen - this.energyCost;

    this.lightScore = 0;
  }

  show() {
    super.show();
    noFill();
    stroke(255, 255, 255, 100);
    textSize(Math.floor((scaleSize / 3) * 2));
    text(
      this.lightScore,
      this.pos.x * scaleSize + scaleSize / 2,
      this.pos.y * scaleSize + (scaleSize / 4) * 3
    );
  }

  removePlant() {
    for (let i = 0; i < this.plantParticles.length; i++) {
      // console.log(`removing plant particle ${this.plantParticles[i].id}`);
      particles.splice(particles.indexOf(this.plantParticles[i]), 1);
    }

    // remove the seed itself
    particles.splice(particles.indexOf(this), 1);
  }

  replacePlant() {
    // remove all the plant particles, including the seed itself (not sure how/why seed is included)
    // console.log(`this.plantParticles.length: ${this.plantParticles.length}`);
    // console.log(`this.plantParticles: ${this.plantParticles}`);
    // console.log(this.plantParticles.length);
    for (let i = 0; i < this.plantParticles.length; i++) {
      // console.log(`removing plant particle ${this.plantParticles[i].id}`);
      let newParticle = new Dirt(
        this.plantParticles[i].pos.x,
        this.plantParticles[i].pos.y
      );
      particles.splice(
        particles.indexOf(this.plantParticles[i]),
        1,
        newParticle
      );
    }
    // replace the seed itself
    let newParticle = new Dirt(this.pos.x, this.pos.y);
    particles.splice(particles.indexOf(this), 1, newParticle);
  }

  dropANewSeed() {
    if (this.hasReproduced == false) {
      let newSeed = new Seed(
        this.pos.x + 7 * this.evoDir,
        Math.floor(Math.random() * (rows / 2))
      );
      newSeed.evoDir = this.evoDir;

      // MUTATION MUST HAPPEN HERE

      let newGenome = this.genome;
      // if this seed is a mutant, it can only produce clones
      if (this.isMutant) {
        newSeed.isClone = true;
        newSeed.isMutant = false;
        // new seed clone inherits identical genome from parent
        newSeed.genome = newGenome;
        particles.push(newSeed);
      } // if this seed is a clone, it has a chance to produce mutants
      else if (this.isClone) {
        if (Math.random() < this.chanceToMutate) {
          newSeed.isClone = false;
          newSeed.isMutant = true;
          // new seed mutant mutates inherited genome from parent
          newGenome.mutateGenome();
          newSeed.genome = newGenome;
          particles.push(newSeed);
        } else {
          newSeed.isClone = true;
          newSeed.isMutant = false;
          // new seed clone inherits identical genome from parent
          newSeed.genome = newGenome;
          particles.push(newSeed);
        }
      }
      // this.hasReproduced = true;
    }
  }

  update() {
    if (this.killed) {
      this.killCountdown--;
      if (this.killCountdown == 0) {
        this.removePlant();
        return;
      }
    }
    if (this.dead && !this.killed) {
      this.killed = true;
      // this.killPlant();
      this.replacePlant();
      return;
    }
    if (this.age < this.lifetime) {
      // console.log(this.age);
      this.age++;
      // console.log(this.age);
    } else if (this.age >= this.lifetime) {
      this.dead = true;
    }

    if (this.isFalling) {
      if (this.isMutant) {
        this.color.r = 255;
        this.color.g = 0;
        this.color.b = 0;
      }
      this.fall();
    } else if (this.hasSprouted == false) {
      this.sprout();
      this.hasSprouted = true;
    }

    if (this.lightScore % lightReqToSeed == lightReqToSeed - 1) {
      this.dropANewSeed();
      this.lightScore = 0;
      // this.replacePlant();
    }
  }

  checkDownForDirt() {
    let x = this.pos.x;
    let y = this.pos.y;
    let itemCount = 0;
    for (const other of quadTree.getItemsInRadius(
      x,
      y,
      perceptionRadius, // perceptionRadius of 3, instead of 2
      perceptionCount // perceptionCount of 100, instead of 10
    )) {
      // Check each neighboring cell in a cardinal direction to see if it is a stem particle that shares the same seed/core. If so, count it. If itemCount > 1, return true.
      if (
        other &&
        other.isDirt == true &&
        other.pos.x == x &&
        other.pos.y == y + 1
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

  fall() {
    if (this.pos.y >= rows - 1) {
      this.isFalling = false;
      this.age = 0;
      return;
    }
    let dirtCheck = this.checkDownForDirt();
    if (dirtCheck == true) {
      this.isFalling = false;
      this.age = 0;
      return;
    }

    this.float();
  }

  float() {
    // choose a random cardinal direction to check; if unoccupied, move there; if occupied, stay put
    let dir = Math.floor(Math.random() * 5);
    if (dir == 0) {
      let checkUp = this.upOccupied();
      if (checkUp == false) {
        this.moveUp();
      }
    } else if (dir == 1) {
      let checkRight = this.rightOccupied();
      if (checkRight == false) {
        this.moveRight();
      }
    } else if (dir == 2) {
      let checkLeft = this.leftOccupied();
      if (checkLeft == false) {
        this.moveLeft();
      }
    } else if (dir >= 3) {
      let checkDown = this.downOccupied();
      if (checkDown == false) {
        this.moveDown();
      }
    }
  }

  updateGenome() {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i] != null) {
        this.genome.genomesOfChildren[i] = this.children[i].genome;
      }
    }
  }

  // ORIGINAL SPROUT! IF SOMETHING MESSES UP, REVERT HERE!
  sprout() {
    let check = isOccupied(this.pos.x, this.pos.y - 1);
    if (check) {
      return;
    } else {
      let stem = new Stem(this.pos.x, this.pos.y - 1);
      if (this.genome.genomesOfChildren[1] != null) {
        // if seed has genome for middle child...
        stem.genome = this.genome.genomesOfChildren[1]; // ...give it to the middle child
      }
      stem.parent = this;
      stem.core = this;
      this.children[1] = stem;
      this.plantParticles = [stem];
      particles.push(stem);
      sproutCounter++;
    }
  }
}

class Stem extends Seed {
  constructor(x, y) {
    super(x, y);
    this.isSeed = false;
    this.isStem = true;
    this.color.r = 0;
    this.color.g = stemColorG;
    this.color.b = 0;
    this.color.a = normalAlpha;
    this.genome = new Genome();
    this.parent = particles[0];
    this.direction = createVector(0, -1);
    this.energyScore = 0;
    this.energyGen = 0;
    this.energyCost = 2;
    this.growthCountdown = growthCountdown;
    this.hasSprouted = false;
  }

  scoreSelf() {
    this.energyGen = 0;
    let checkUp = this.upOccupied();
    let checkLeft = this.leftOccupied();
    let checkRight = this.rightOccupied();
    if (checkUp == false) {
      this.energyGen += 2;
    }
    if (checkLeft == false) {
      this.energyGen += 1;
    }
    if (checkRight == false) {
      this.energyGen += 1;
    }
    this.energyScore = this.energyGen;
  }

  show() {
    this.colorString = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a})`;
    canvasContext.fillStyle = this.colorString;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
    noFill();
    stroke(255, 255, 255, 100);
    textSize(Math.floor((scaleSize / 3) * 2));
    text(
      this.lightScore,
      this.pos.x * scaleSize + scaleSize / 2,
      this.pos.y * scaleSize + (scaleSize / 4) * 3
    );
  }

  update() {
    if (this.color.a > normalAlpha) {
      this.color.a -= normalDim;
    } else if (this.color.a < normalAlpha) {
      this.color.a = normalAlpha;
    }
    // if (this.growthCountdown > 0) {
    //   this.growthCountdown--;
    //   // console.log(`${this.id} growth countdown: ${this.growthCountdown}`);
    // }

    // same as seed except no falling
    if (this.hasSprouted == false && this.lightScore >= lightReqToSprout) {
      this.lightScore = 0;
      this.hasSprouted = true;
      this.findHeading();
      this.sprout();
    }

    if (this.hasSprouted && this.lightScore > 0) {
      this.parent.lightScore++;
      this.lightScore--;
      this.parent.color.a = 1;
    }
  }

  findHeading() {
    // create a vector from the parent to the stem
    this.heading = createVector(
      this.pos.x - this.parent.pos.x,
      this.pos.y - this.parent.pos.y
    );
    this.heading.normalize();
    // console.log(this.heading);
  }

  sprout() {
    // console.log(`${this.id} sprouting`);
    // console.dir(this.genome.genes);
    // console.log(this.genome.genomesOfChildren);

    // don't sprout if below the last row
    if (this.pos.y >= rows - 1) {
      return;
    }

    // iterate through each of the 5 genes, and assign the particles accordingly;
    // index 0 is to the left of the parent particle (-1, 0)
    // index 1 is to the up-left of the parent particle (-1, 1)
    // index 2 is to the up of the parent particle (0, 1)
    // index 3 is to the up-right of the parent particle (1, 1)
    // index 4 is to the right of the parent particle (1, 0)

    // // if genes are null and seed can mutate, then mutate
    // if (
    //   this.genome.genomesOfChildren[0] == null &&
    //   this.genome.genomesOfChildren[1] == null &&
    //   this.genome.genomesOfChildren[2] == null &&
    //   this.genome.genomesOfChildren[3] == null &&
    //   this.genome.genomesOfChildren[4] == null &&
    //   this.core.canMutate &&
    //   this.core.hasMutated == false
    // ) {
    //   console.log("mutating");
    //   console.log(this.genome.genomesOfChildren);
    //   // randomzie all five genes
    //   for (let i = 0; i < this.genome.genes.length; i++) {
    //     this.genome.genes[i] = random(genePool);
    //   }
    //   scoreAllParticles();
    //   this.core.hasMutated = true;
    //   console.log(this.genome.genomesOfChildren);
    // }

    for (let i = 0; i < this.genome.genes.length; i++) {
      // at any position...
      switch (this.genome.genes[i]) {
        // ...if the gene is null, do nothing but log it
        case null:
          // console.log("case null happened!");
          // this.hasSprouted = false;
          break;
        // ...if the gene is 0, do nothing
        case 0:
          break;
        // ...if the gene is 1, create a new particle at the position of the stem
        case 1:
          // reset lifetime after a growth
          let seedIndex = particles.indexOf(this.core);
          let seed = particles[seedIndex];
          // console.log(seed.age);
          seed.age = 0;
          // console.log(seed.age);
          let up = createVector(0, -1);
          let angle = this.direction.angleBetween(up);
          switch (i) {
            // ... if the gene is index 0, create a new particle to the left of the stem
            case 0:
              // rotate the canvas to the heading of the stem
              push();
              rotate(angle);

              let check0 = isOccupied(this.pos.x - 1, this.pos.y);
              if (check0) {
                pop();
                break;
              }

              let checkNeighbor0 = this.checkCardForSelf(
                this.pos.x - 1,
                this.pos.y
              );
              if (checkNeighbor0) {
                pop();
                // console.log("checkNeighbor0 happened!");
                break;
              }

              let leftStem = new Stem(this.pos.x - 1, this.pos.y);
              if (this.genome.genomesOfChildren[i] != null) {
                leftStem.genome = this.genome.genomesOfChildren[i];
              }
              leftStem.direction = p5.Vector.rotate(this.direction, -PI / 2);
              leftStem.parent = this;
              leftStem.core = this.core;
              this.children[i] = leftStem;
              this.core.plantParticles.push(leftStem);
              particles.push(leftStem);
              pop();
              break;
            case 1:
              // stem straight forward
              push();
              rotate(angle);
              let check1 = isOccupied(this.pos.x, this.pos.y - 1);

              if (check1) {
                pop();
                break;
              }

              let checkNeighbor1 = this.checkCardForSelf(
                this.pos.x,
                this.pos.y - 1
              );
              if (checkNeighbor1) {
                pop();
                // console.log("checkNeighbor1 happened!");
                break;
              }

              let upStem = new Stem(this.pos.x, this.pos.y - 1);
              if (this.genome.genomesOfChildren[i] != null) {
                upStem.genome = this.genome.genomesOfChildren[i];
              }
              upStem.parent = this;
              upStem.core = this.core;
              this.children[i] = upStem;
              this.core.plantParticles.push(upStem);
              particles.push(upStem);
              pop();
              break;
            case 2:
              push();
              rotate(angle);
              let check2 = isOccupied(this.pos.x + 1, this.pos.y);
              if (check2) {
                pop();
                break;
              }
              let checkNeighbor2 = this.checkCardForSelf(
                this.pos.x + 1,
                this.pos.y
              );
              if (checkNeighbor2) {
                pop();
                // console.log("checkNeighbor2 happened!");
                break;
              }

              let rightStem = new Stem(this.pos.x + 1, this.pos.y);
              if (this.genome.genomesOfChildren[i] != null) {
                rightStem.genome = this.genome.genomesOfChildren[i];
              }
              rightStem.direction = p5.Vector.rotate(this.direction, PI / 2);
              rightStem.parent = this;
              rightStem.core = this.core;
              this.children[i] = rightStem;
              this.core.plantParticles.push(rightStem);
              particles.push(rightStem);
              pop();
              break;
          }
      }
    }
  }

  checkCardForSelf(x, y) {
    x = (cols + x) % cols;
    y = (rows + y) % rows;
    let itemCount = 0;
    for (const other of quadTree.getItemsInRadius(
      x,
      y,
      3, // perceptionRadius of 3, instead of 2
      100 // perceptionCount of 100, instead of 10
    )) {
      // Check each neighboring cell in a cardinal direction to see if it is a stem particle that shares the same seed/core. If so, count it. If itemCount > 1, return true.
      if (
        other &&
        other.isStem == true &&
        ((other.pos.x == x + 1 && other.pos.y == y) ||
          (other.pos.x == x - 1 && other.pos.y == y) ||
          (other.pos.x == x && other.pos.y == y + 1) ||
          (other.pos.x == x && other.pos.y == y - 1)) &&
        other.core == this.core
      ) {
        itemCount++;
      }
    }

    if (itemCount > 1) {
      return true;
    } else if (itemCount <= 1) {
      return false;
    }
  }
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
    if (other && other.pos.x == x && other.pos.y == y && !other.isLight) {
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

class Genome {
  constructor(genes = [null, null, null]) {
    this.genes = genes;
    this.genomesOfChildren = [null, null, null];
    for (let i = 0; i < this.genes.length; i++) {
      if (this.genes[i] === 1) {
        this.genomesOfChildren[i] = new Genome();
      }
    }
  }

  mutateGenome() {
    // Description of what this function does:
    // 1. If all genes are null, randomly assign genes
    // 2. If all genes are not null, check genomes of children
    // 3. If all genomes of children are null where there should be a child, mutate that genome of the child plant
    // first, check own genes; if all are null, randomly assign genes
    if (
      this.genes[0] === null &&
      this.genes[1] === null &&
      this.genes[2] === null
    ) {
      // randomzie all genes
      for (let i = 0; i < this.genes.length; i++) {
        // console.log("attempting to mutateGenome");
        // console.log(`genes: ${this.genes}`);
        this.genes[i] = random(genePool);
      }
      // Assign genomes to children
      for (let i = 0; i < this.genes.length; i++) {
        if (this.genes[i] === 1) {
          this.genomesOfChildren[i] = new Genome();
        }
      }
    } else {
      // if own genes aren't null, check genomes of children
      for (let i = 0; i < this.genomesOfChildren.length; i++) {
        if (this.genomesOfChildren[i] != null) {
          // LEFT OFF HERE, create a new genome for each child first... then mutate it
          this.genomesOfChildren[i].mutateGenome();
        }
      }
    }
  }
}

function doubleClicked() {}

function keyPressed() {}
