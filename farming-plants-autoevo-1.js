// //cool leafy pattern
// 0: (3) [1, 1, 0]
// 1: (3) [1, 0, 1]
// 2: (3) [1, 0, 1]
// 3: (3) [1, 0, 1]
// 4: (3) [0, 1, 0]
// 5: (3) [0, 0, 0]
// 6: (3) [0, 1, 0]
// 7: (3) [0, 1, 0]
// 8: (3) [0, 1, 1]
// 9: (3) [0, 1, 1]
// 10: (3) [1, 1, 1]
// 11: (3) [0, 1, 1]
// 12: (3) [0, 0, 0]
// 13: (3) [1, 1, 1]
// 14: (3) [0, 1, 0]
// 15: (3) [0, 1, 0]
// 16: (3) [1, 1, 0]
// 17: (3) [1, 0, 1]
// 18: (3) [0, 0, 1]
// 19: (3) [1, 0, 0]
// 20: (3) [0, 0, 0]

let lastFinishedCounter = 0;
let readyForNextGen = false;
let auto = true;
let quadTree;
let canvas;
let paused = false;
let updateCounter = 0;
let canvasContext;
let counter = 0;
let highestEnergy = -100;
let highestEnergyColor;
let highestEnergyRed = 100;
let highestEnergyBlue = 200;
let highestEnergyGreen = 255;
let highestEnergyGenes = [
  // GJ shape!
  [0, 1, 0],
  [0, 1, 0],
  // [0, 1, 0],
];

const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let particles = [];
let columns = vw;
let rows = vh;

// let numOfSeeds = Math.floor((rows * columns) / 5000);
let originalNumOfSeeds = 100;
let numOfSeeds = originalNumOfSeeds;

//SLIDERS
leafSize = 1;
depthLimit = 5;
heightLimit = 6;
growthLimit = 100;
deathAge = 300;

deathLogEnergy = [];

//turns off descriptive errors that add computing costs
p5.disableFriendlyErrors = true;

let grid;
let nextGrid;
let prevGrid;

grid = make2DArray(columns, rows);
for (let x = 0; x < columns; x++) {
  for (let y = 0; y < rows; y++) {
    grid[x][y] = [];
  }
}

nextGrid = make2DArray(columns, rows);
for (let x = 0; x < columns; x++) {
  for (let y = 0; y < rows; y++) {
    grid[x][y] = [];
  }
}

countGrid = make2DArray(columns, rows);
for (let x = 0; x < columns; x++) {
  for (let y = 0; y < rows; y++) {
    countGrid[x][y] = [];
  }
}

let genePool = [];

let geneElements = [
  // 0 = nothing
  // 1 = stem
  // 2 = leaf

  //all 8 binary genes
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

// ORIGINAL
function setup() {
  // frameRate(6);
  let p5canvas = createCanvas(vw, vh);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  colorMode(HSB, 1, 1, 1, 1);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  background(0);
  angleMode(DEGREES);

  updateCounter = 0;
  //create new seed
  let particle = new Plant(Math.floor(width / 2), Math.floor(height / 2));
  particle.seed = true;
  particle.seedMarker = true;
  particle.oldSeed = true;
  particle.growing = true;
  particle.id = particles.length + 1;
  particles.push(particle);
  grid[particle.pos.x][particle.pos.y].push(particle);
}

function draw() {
  // numOfSeeds = Math.floor(map(highestEnergy, 0, 1000, originalNumOfSeeds, 12));

  lastFinishedCounter = lastFinishedCounter - 1;
  if (!readyForNextGen && lastFinishedCounter < 1) {
    readyForNextGen = true;
    lastFinishedCounter = 10000;
  }
  if (auto && readyForNextGen) {
    readyForNextGen = false;
    mouseReleased();
  }
  // clears the quadtree and adds particles
  quadTree.clear();

  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  //clears the next grid
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      nextGrid[x][y] = [];
    }
  }
  background(0);

  if (particles.length < 1000000) {
    for (var particle of particles) {
      particle.update();
      particle.show();
    }

    for (var particle of particles) {
      if (particle.readyToRecordGenes) {
        particle.readyToRecordGenes = false;
        lastFinishedCounter = 50;

        if (particle.energyCount > highestEnergy) {
          particle.flashing = true;
          highestEnergy = particle.energyCount;
          highestEnergyGenes = particle.genes;
          // highestEnergyColor = particle.color;
          highestEnergyBlue = particle.blue;
          highestEnergyRed = particle.red;
          highestEnergyGreen = particle.green;
          // console.log("new high!");
          //   let geneticRecord = particle.genes;
          genePool = [JSON.parse(JSON.stringify(highestEnergyGenes))];
          console.log(`new high: ${highestEnergy}`);
        }

        // if (particle.energyCount < highestEnergy) {
        //   particle.core.opacity = map(
        //     particle.energyCount,
        //     highestEnergy / 2,
        //     highestEnergy,
        //     0,
        //     100
        //   );
        // }
      }
    }

    for (var particle of particles) {
      if (particle.core.dead && particle.energyReport === false) {
        particle.energyReport = true;
        particle.setEnergyValue();
        particle.core.energyCount += particle.energy;
        // console.log(`
        // cell ${particle.id}
        // reporting ${particle.energy} energy
        // core now has ${particle.core.energyCount}`);
        particle.core.readyToRecordGenes = true;
      }
    }
  }

  // if (this.readyToRecordGenes) {
  //   this.readyToRecordGenes = false;

  //   console.log(`${this.id} has ${this.core.energyCount} energy`);
  //   // console.log(this.genes);
  //   let geneticRecord = this.genes;
  //   genePool.push(geneticRecord);
  //   // console.log(genePool);
  // }

  // if (this.core.dead && this.energyReport == false) {
  //   this.energyReport = true;
  //   this.returnEnergyValue();
  //   // console.log(`energy count: ${this.core.energy}`);
  //   this.core.readyToRecordGenes = true;
  // }

  // for (var particle of particles) {
  //   if (particle.readyToRecordGenes) {
  //     particle.readyToRecordGenes = false;
  //     console.log(`${particle.id} has ${particle.energyCount} energy`);
  //     console.log(particle.genes);
  //     let geneticRecord = particle.genes;
  //     genePool.push(geneticRecord);
  //     console.log(genePool);
  //   }
  // }

  // for (var particle of particles) {
  //   // particle.snap();

  // }

  // grid = nextGrid;

  // COUNTGRID TABULATED HERE

  // for (let x = 0; x < columns; x++) {
  //   for (let y = 0; y < rows; y++) {
  //     // if (grid[x][y].length > 0) {
  //     //   console.log(`${grid[x][y].length}`);
  //     // }
  //     countGrid[x][y].push(grid[x][y].length);
  //     // console.log(countGrid);
  //   }
  // }

  textAlign(CENTER);
  stroke(1, 0, 1, 0.3);
  fill(0, 0, 0, 0);
  //  FPS: ${Math.floor(frameRate())}
  //   Particles: ${particles.length}

  text(
    `
  High score: ${highestEnergy} `,
    vw / 2,
    vh / 20
  );

  // paused = true;
  updateCounter++;
  // console.log(updateCounter);
}

class Particle {
  constructor(x, y) {
    //location
    this.pos = createVector(x, y);
    this.grid = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    //qualities
    this.size = 1;
    this.density = 0.5; // 1 = super heavy, 0 = super light

    this.offset = random(1000000);
    this.offset2 = random(1000000);
    this.offset3 = random(1000000);

    //visuals
    this.hue = 0.17;
    this.sat = 1;
    this.brightness = 1;
    this.red = 250;
    this.green = 150;
    this.blue = 50;
    this.opacity = 0.1;

    //movement chances
    this.childUp = 0.0;
    this.childLeft = 0.0;
    this.childRight = 0.0;
    this.childOfDown = 0.9;

    //identity
    this.seed = false;
  }
}

class Plant {
  constructor(x, y) {
    //location
    this.pos = createVector(x, y);
    this.grid = createVector(x, y);

    this.plant = true;

    // relations
    this.childUp = []; // child node, up
    this.childLeft = []; // child node, left
    this.childRight = []; // child node, right
    this.childOfDown = []; // parent node
    this.core = this; // organism core

    this.age = 0;
    this.cellCount = 0;
    this.growingCount = 10;
    this.energyCount = 0;

    //types
    this.seed = false;
    this.seedMarker = false;
    this.stem = false;
    this.leaf = false;
    this.twig = false;
    this.light = false;
    this.winner = false;
    this.dead = false;
    this.growing = false;
    this.oldSeed = false;
    this.dormant = false;
    this.isGrowing = true;
    this.finalReport = false;
    this.energyReport = false;
    this.readyToRecordGenes = false;
    this.faded = false;
    this.flashing = false;

    this.xOffset = 0;
    this.yOffset = 0;
    this.xFrontset = 0;
    this.yFrontset = 0;
    //genes
    this.genes = [
      // GJ shape!
      [0, 1, 0],
      [0, 1, 0],
      // [0, 1, 0],
    ];
    this.geneIterator = 0;
    this.dormantCount = 2;

    //status and id
    this.id = 1;
    this.size = 1;
    this.orientation = 2; // up; 0 = down, 1 = left, 2 = up, 3 = right

    //genes
    this.energy = 0;

    //colors
    this.red = Math.floor(random(255));
    this.green = Math.floor(random(255));
    this.blue = Math.floor(random(255));
    this.opacity = 1;
  }

  mutateGenes() {
    let geneRecencyCounter = 1;
    for (var i = this.genes.length - 1; i >= 0; i--) {
      geneRecencyCounter++;
      if (random() < 1 / geneRecencyCounter) {
        this.genes.length = i;
      }
    }

    // console.log(this.genes);
    // let geneRecencyCounter = 1;
    // for (var i = this.genes.length - 1; i >= 0; i--) {
    //   geneRecencyCounter++;
    //   if (random() < 1 / geneRecencyCounter) {
    //     this.genes[i] = random(geneElements);
    //   }
    //   for (var gene of this.genes[i]) {
    //     //genes in newest strand have 50% chance; 2nd newest, 25%; 3rd, 12.5%, etc.
    //     if (random() < 0.5) {
    //       if (gene === 1) {
    //         gene = 0;
    //         //   console.log("1 turned 0");
    //       } else if (gene === 0) {
    //         gene = 1;
    //         //   console.log("0 turned 1");
    //       }
    //     }
    //   }
    //   // geneRecencyCounter = geneRecencyCounter + 0.1;
    // }
  }

  setEnergyValue() {
    this.energy = 0;
    // if up is empty, +1 energy
    if (grid[this.grid.x][this.grid.y - 1].length == 0) {
      this.energy++;
    }
    // if down is empty, +1 energy
    if (grid[this.grid.x][this.grid.y + 1].length == 0) {
      this.energy++;
    }
    // if left is empty, +1 energy
    if (grid[this.grid.x - 1][this.grid.y].length == 0) {
      this.energy++;
    }
    // if right is empty, +1 energy
    if (grid[this.grid.x + 1][this.grid.y].length == 0) {
      this.energy++;
    }

    if (this.energy < 3) {
      this.energy = 0;
    }

    // if (this.energy < 2) {
    //   this.energy = -1;
    // }

    return this.energy;
  }

  grow() {
    if (this.isGrowing && this.core.growingCount > 0) {
      this.core.growingCount -= 1;
    }
    if (
      this.seedMarker &&
      this.oldSeed &&
      this.isGrowing &&
      this.growingCount < 1
    ) {
      // console.log(this.id);
      // console.log(
      //   `#${this.id} stopped growing with ${this.cellCount}/${this.core.cellCount} cells`
      // );
      // console.log(this.cellCount);
      // console.log(this.core);
      // console.log(str(this.cellCount));
      // console.log(this.core.cellCount);
      // console.log(this.core.genes);
      // console.log(
      //   `this id:${this.id} core id: ${this.core.id} ${this.core.cellCount}`
      // );
      this.isGrowing = false;

      if (this.core.growingCount < 1 && !this.core.finalReport) {
        this.core.finalReport = true;
        // console.log(
        //   `#${this.core.id} stopped growing with ${
        //     this.core.cellCount + 1
        //   } cells`
        // );
        // console.log(this.core);
        this.core.dead = true;
      }
    }

    if (this.growing === false || this.core.cellCount > 1000) {
      return;
    }
    // console.log(this.orientation);
    switch (this.orientation) {
      case 0:
        this.xOffset = +1;
        this.yOffset = 0;
        this.xFrontset = 0;
        this.yFrontset = 1;
        // console.log("orientation 0 set");
        break;

      case 1:
        this.xOffset = 0;
        this.yOffset = 1;
        this.xFrontset = -1;
        this.yFrontset = 0;
        // console.log("orientation 1 set");

        break;

      case 2:
        this.xOffset = -1;
        this.yOffset = 0;
        this.xFrontset = 0;
        this.yFrontset = -1;
        // console.log("orientation 2 set");

        break;

      case 3:
        this.xOffset = 0;
        this.yOffset = -1;
        this.xFrontset = 1;
        this.yFrontset = 0;
        // console.log("orientation 3 set");

        break;

      default:
        console.log("no orientation?");
    }

    // console.log(`attempting to grow... 1 frame ${frameCount}. id: ${this.id}`);
    if (
      // typeof grid[this.grid.x][this.grid.y - 1] == "undefined" ||
      grid[this.grid.x + this.xFrontset][this.grid.y + this.yFrontset]
        .length !== 0 || // check up (in ori 2)
      grid[this.grid.x + this.xOffset][this.grid.y + this.yOffset].length !==
        0 || // check left (in ori 2)
      grid[this.grid.x - this.xOffset][this.grid.y + this.yOffset].length !== 0 // check right (in ori 2)
    ) {
      // console.log("catch #224");
      return;
    }
    // console.log("attempting to grow... 2");
    // console.log(this.orientation);

    // if all 3 slots are filled, do nothing
    if (
      this.childUp.length !== 0 &&
      this.childLeft.length !== 0 &&
      this.childRight.length !== 0
    ) {
      return;
    }
    // console.log("attempting to grow... 3");
    // if all 3 slots are open, grow
    if (
      this.childUp.length == 0 &&
      this.childRight.length == 0 &&
      this.childLeft.length == 0
    ) {
      // console.log("attempting to grow... 4");
      // create a new gene if there's no next step (if the geneIterator exceeds the length of the genes)
      if (this.core.geneIterator >= this.core.genes.length) {
        // this.growing = false;
        // return;
        let newGene = random(geneElements);
        this.core.genes.push(newGene);
        // return;
        // // let newGene = [random([0, 1]), random([0, 1]), random([0, 1])];
        // return;
      }

      //follow genetic instructions...
      let geneticPlan = this.core.genes[this.core.geneIterator];
      // this.core.genes[this.core.geneIterator % this.core.genes.length];
      this.core.geneIterator++;

      //passed all tests, subtract energy
      // this.core.energy -= energyCost;
      // console.log(this.core.energy);

      //set directions according to orientation
      // console.log(this.orientation);

      switch (
        geneticPlan[0] // LEFT slot
      ) {
        case 0:
          this.childLeft = ["nub"];
          break;
        case 1:
          // typeof grid[this.grid.x - 1][this.grid.y + 1] == "undefined" ||
          //   grid[this.grid.x - 1][this.grid.y + 1].length !== 0;

          // //check if area is open
          // if (
          //   typeof grid[this.pos.x - 1][this.pos.y] == "undefined" ||
          //   grid[this.pos.x - 1][this.pos.y].length !== 0
          // ) {
          //   return;
          // }

          // //creates new stem on the left slot
          // let stemL = new Plant(this.pos.x - 1, this.pos.y);

          typeof grid[this.grid.x + this.xOffset][this.grid.y + this.yOffset] ==
            "undefined" ||
            grid[this.grid.x + this.xOffset][this.grid.y + this.yOffset]
              .length !== 0;

          //check if area is open
          if (
            typeof grid[this.grid.x + this.xOffset][
              this.grid.y + this.yOffset
            ] == "undefined" ||
            grid[this.grid.x + this.xOffset][this.grid.y + this.yOffset]
              .length !== 0
          ) {
            return;
          }

          //creates new stem on the left slot
          let stemL = new Plant(
            this.grid.x + this.xOffset,
            this.grid.y + this.yOffset
          );

          //identity
          stemL.stem = true;
          stemL.growing = true;
          stemL.id = particles.length + 1;
          stemL.orientation = this.orientation - 1;

          if (stemL.orientation === -1) {
            // up; 0 = down, 1 = left, 2 = up, 3 = right
            stemL.orientation = 3;
          }

          // console.log(
          //   `left turn? this.ori: ${this.orientation}, stemL.ori: ${stemL.orientation}`
          // );

          //inheritence
          stemL.core = this.core;
          this.core.cellCount++;
          // console.log(this.core.cellCount);
          // console.log(
          //   `this id: ${this.id} core id: ${this.core.id} ${this.core.cellCount}`
          // );

          this.core.growingCount++;

          stemL.childOfDown.push(this);
          stemL.depth = this.depth + 1;
          stemL.red = this.red;
          stemL.green = this.green;
          stemL.blue = this.blue;

          // stemL.dormantCount = 100;

          //advance core count
          // this.core.growingCount++;

          //insert new cell
          particles.push(stemL);
          this.childLeft.push(stemL);
          grid[stemL.pos.x][stemL.pos.y].push(stemL);
          break;
        default:
        // console.log(`${this.id} of ${this.core.id} missing genes?`);
      }

      switch (
        geneticPlan[1] // MIDDLE/UP slot
      ) {
        case 0:
          this.childUp = ["nub"];
          break;
        case 1:
          typeof grid[this.grid.x + this.xFrontset][
            this.grid.y + this.yFrontset
          ] == "undefined" ||
            grid[this.grid.x + this.xFrontset][this.grid.y + this.yFrontset]
              .length !== 0;

          //check if area is open
          if (
            typeof grid[this.grid.x + this.xFrontset][
              this.grid.y + this.yFrontset
            ] == "undefined" ||
            grid[this.grid.x + this.xOffset][this.grid.y + this.yOffset]
              .length !== 0
          ) {
            return;
          }

          //creates new stem on the middle slot
          let stemM = new Plant(
            this.grid.x + this.xFrontset,
            this.grid.y + this.yFrontset
          );

          // console.log(`#2: ${this.pos.x} + ${this.pos.y - this.stemDistance}`);

          //identity
          stemM.stem = true;
          stemM.growing = true;
          stemM.id = particles.length + 1;
          stemM.orientation = this.orientation;

          //inheritence
          stemM.core = this.core;
          this.core.cellCount++;
          // console.log(this.core.cellCount);
          // console.log(
          //   `this id:${this.id} core id: ${this.core.id} ${this.core.cellCount}`
          // );
          this.core.growingCount++;
          stemM.childOfDown.push(this);
          stemM.red = this.red;
          stemM.green = this.green;
          stemM.blue = this.blue;
          // stemM.depth = this.depth + 1;
          // stemM.dormantCount = 100;

          //advance core count
          // this.core.growingCount++;

          //insert new cell
          particles.push(stemM);
          this.childUp.push(stemM);
          grid[stemM.pos.x][stemM.pos.y].push(stemM);
          break;
        default:
        // console.log(`${this.id} of ${this.core.id} missing genes?`);
      }

      switch (
        geneticPlan[2] // RIGHT slot
      ) {
        case 0:
          this.childRight = ["nub"];
          break;
        case 1:
          // //check if area is open
          // if (
          //   typeof grid[this.pos.x + 1][this.pos.y] == "undefined" ||
          //   grid[this.pos.x + 1][this.pos.y].length !== 0
          // ) {
          //   return;
          // }

          // //creates new stem on the left slot
          // let stemR = new Plant(this.pos.x + 1, this.pos.y);

          typeof grid[this.grid.x - this.xOffset][this.grid.y + this.yOffset] ==
            "undefined" ||
            grid[this.grid.x - this.xOffset][this.grid.y - this.yOffset]
              .length !== 0;

          //check if area is open
          if (
            typeof grid[this.grid.x - this.xOffset][
              this.grid.y - this.yOffset
            ] == "undefined" ||
            grid[this.grid.x - this.xOffset][this.grid.y - this.yOffset]
              .length !== 0
          ) {
            return;
          }

          //creates new stem on the left slot
          let stemR = new Plant(
            this.grid.x - this.xOffset,
            this.grid.y - this.yOffset
          ); //identity
          stemR.stem = true;
          stemR.growing = true;
          stemR.id = particles.length + 1;
          stemR.orientation = (this.orientation + 1) % 4; // up; 0 = down, 1 = left, 2 = up, 3 = right

          // console.log(
          //   `right turn? this.ori: ${this.orientation}, stemR.ori: ${stemR.orientation}`
          // );

          //inheritence
          stemR.core = this.core;
          this.core.cellCount++;
          this.core.growingCount++;
          // console.log(this.core.cellCount);
          // console.log(
          //   `this id: ${this.id} core id: ${this.core.id} ${this.core.cellCount}`
          // );

          stemR.childOfDown.push(this);
          stemR.depth = this.depth + 1;
          stemR.red = this.red;
          stemR.green = this.green;
          stemR.blue = this.blue;
          // stemR.dormantCount = 100;

          //advance core count
          // this.core.growingCount++;

          //insert new cell
          particles.push(stemR);
          this.childRight.push(stemR);
          grid[stemR.pos.x][stemR.pos.y].push(stemR);
          break;
        default:
        // console.log(`${this.id} of ${this.core.id} missing genes?`);
      }
    }
    // this.growing = false;
    // this.core.growingCount = this.core.growingCount - 1;
  }

  recordGenes() {}

  update() {
    if (this.dormantCount > 0) {
      this.dormant = true;
      this.dormantCount -= 1;
    }
    if (this.dormantCount < 1) {
      this.dormant = false;
    }
    if (this.dormant) {
      return;
    }

    this.grow();

    // if (this.isGrowing && this.seedMarker && this.growingCount < 1) {
    //   console.log()
    // }

    // if (this.readyToRecordGenes) {
    //   this.readyToRecordGenes = false;

    //   console.log(`${this.id} has ${this.core.energyCount} energy`);
    //   // console.log(this.genes);
    //   let geneticRecord = this.genes;
    //   genePool.push(geneticRecord);
    //   // console.log(genePool);
    // }

    // if (this.core.dead && this.energyReport == false) {
    //   this.energyReport = true;
    //   this.returnEnergyValue();
    //   // console.log(`energy count: ${this.core.energy}`);
    //   this.core.readyToRecordGenes = true;
    // }

    // this.growing = false;
    // if (this.seedMarker && this.isGrowing && this.growingCount < 1) {
    //   console.log(
    //     `#${this.id} stopped rowing with ${this.cellCount}/${this.core.cellCount} cells`
    //   );
    // }
  }

  show() {
    if (this.core.flashing) {
      if (frameCount % 40 < 20) {
        this.opacity = 0;
      } else {
        this.opacity = 1;
      }
    }
    // if (this.core.faded) {
    //   this.opacity = this.core.opacity;
    // }
    this.color = `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.opacity})`;
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(this.grid.x, this.grid.y, 1, 1);
  }
}

function mouseReleased() {
  // console.log(genePool);
  grid = make2DArray(columns, rows);
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      grid[x][y] = [];
    }
  }
  particles = [];
  //create new seed
  let winner = new Plant(Math.floor(width / 2), Math.floor(height / 8));
  winner.seed = true;
  winner.seedMarker = true;
  winner.oldSeed = true;
  winner.growing = true;
  winner.id = particles.length + 1;
  winner.red = highestEnergyRed;
  winner.green = highestEnergyGreen;
  winner.blue = highestEnergyBlue;
  winner.opacity = 1;
  winner.genes = JSON.parse(JSON.stringify(highestEnergyGenes));
  particles.push(winner);
  grid[winner.pos.x][winner.pos.y].push(winner);
  for (i = 0; i < Math.floor(numOfSeeds); i++) {
    let particle = new Plant(
      Math.floor(width / 8 + random(width / 2 + width / 4)),
      Math.floor(height / 4 + random(height / 2 + height / 8))
    );
    // particle.orientation = random([0, 1, 2, 3]);
    particle.seed = true;
    particle.seedMarker = true;
    particle.oldSeed = true;
    particle.growing = true;
    particle.id = particles.length + 1;
    particle.genes = JSON.parse(JSON.stringify(highestEnergyGenes));
    particle.mutateGenes();
    particles.push(particle);
    grid[particle.pos.x][particle.pos.y].push(particle);
  }
}

function keyPressed() {
  if (auto) {
    auto = false;
  } else if (!auto) {
    auto = true;
  }
}

function make2DArray(columns, rows) {
  let arr = new Array(columns);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
  }
  return arr;
}

function checkCellDefined(x, y) {
  if (typeof grid[x][y] == "undefined") {
    // console.log(`grid cell [${x}, ${y}] undefined`)
    return false;
  } else {
    return true;
  }
}

function checkCellEmpty(x, y) {
  if (grid[x][y].length == 0) {
    // console.log(`grid cell [${x}, ${y}] empty`)
    return true;
  } else if (grid[x][y].length > 0) {
    // console.log(`grid cell [${x}, ${y}] has ${grid[x][y].length} occupants`)
    return false;
  }
}
