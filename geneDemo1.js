//SLIDERS

let numOfSeeds = 1;
let numOfLights = 100;
let growthAngle = 45;
let growthLimit = 40; // inter-node length
let leafSize = 10;
let depthLimit = 5;
let leafCost = 0;
let heightLimit = 6; // height / heightLimit = how high plants can grow// v4 accomplishment: got efficiency working, and created a new efficiency model where leaves have a finite cost (instead of energy/leafCount)
let frameRateSetting = 20;

let nodes = [];
let lights = [];
let quadTree;
let chromosomes = [
  // ALL 27 PERMUATIONS
  [0, 0, 0], //
  [0, 0, 1], //
  [0, 0, 2], //
  [0, 1, 0], //
  [0, 1, 1], // abb
  [0, 1, 2], // abc
  [0, 2, 0], // aca
  [0, 2, 1], // acc
  [0, 2, 2], // acc
  [1, 0, 0], // baa
  [1, 0, 1], // bab
  [1, 0, 2], // bac
  [1, 1, 0], // bba
  [1, 1, 1], // bbb
  [1, 1, 2], // bbc
  [1, 2, 0], // bca
  [1, 2, 1], // bcb
  [1, 2, 2], // bcc
  [2, 0, 0], //
  [2, 0, 1], //
  [2, 0, 2], //
  [2, 1, 0], //
  [2, 1, 1], //
  [2, 1, 2], //
  [2, 2, 0], //
  [2, 2, 1], //
  [2, 2, 2], //
];
let messyGenePool = [];
let genePool = [
  // 0 = nothing
  // 1 = stem
  // 2 = leaf
  // [
  //   [0, 1, 0], // simple symmetrical
  //   [2, 1, 2],
  // ],
  // [
  //   [2, 1, 0], // simple alternating
  //   [0, 1, 2],
  // ],

  // WORKING PINNATELY COMPOUND
  [
    [1, 1, 0], // main stem, branch left
    [2, 1, 2], // left branch flair
    [0, 1, 1], // main stem, branch right
    [2, 2, 2], // left branch terminate
    [0, 1, 0], // main stem
    [2, 1, 2], // right branch flair
    [2, 2, 2], // right branch terminate
  ],
  //   [
  //     [0, 1, 0],
  //     [1, 1, 0],
  //     [2, 1, 2],
  //     [2, 1, 2],
  //     [2, 2, 2],
  //   ],
  // Pinnately compound: [010], [110], [212], [212], [222], [010]

  // Pinnately compound: [001], [101], [221], [221], [222], [001]

  //simple opposite
];

//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);

let day = 0;
let generationCount = 0;

function setup() {
  createCanvas(vw, vh);
  frameRate(frameRateSetting);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  background(0);
  angleMode(DEGREES);

  //   let numOfSeeds = Math.floor(width / seedSpacing);

  for (i = 0; i < numOfSeeds; i++) {
    plant = new Node(
      width / numOfSeeds / 2 + (width / numOfSeeds) * i,
      height * 0.9
    );
    //genes
    plant.core.nodeLength = growthLimit;
    plant.core.growthAngle = growthAngle;

    plant.seed = true;
    plant.core.energy = 0;
    plant.core.leafCount = 0;
    plant.core.growingCount = 0;
    plant.down = [plant];
    plant.id = nodes.length + 1;
    // plant.genes = frankensteinGenes(plant); // console.log(`plant #${plant.id}, genes:  ${plant.genes}`);
    nodes.push(plant);
  }

  let sun = new Light(width / 2 - 1, height / 10);
  sun.sun = true;
  sun.size = 40;
  sun.vel = createVector(-1, 0);
  sun.speed = 1;
  lights.push(sun);

  for (i = 0; i < numOfLights; i++) {
    let light = new Light(lights[0].pos.x, lights[0].pos.y);
    light.vel = p5.Vector.random2D();
    lights.push(light);
  }
}

function draw() {
  //clears the quadtree and adds particles
  quadTree.clear();
  // for (const node of nodes) {
  //   quadTree.addItem(node.pos.x, node.pos.y, node);
  // }
  for (const light of lights) {
    quadTree.addItem(light.pos.x, light.pos.y, light);
  }

  background(0, 0, 0, 20);
  for (var node of nodes) {
    node.update();
    node.show();
  }

  //   for (var light of lights) {
  //     light.update();
  //     light.show();
  //   }
  text(
    `
  ${nodes.length}`,
    width * 0.5,
    length * 0.1
  );
}

class Light {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    //visuals
    this.hue = 17;
    this.sat = 100;
    this.brightness = 100;
    this.opacity = 10;

    this.size = 2;
    this.light = true;
    this.sun = false;
    this.return = 0;

    this.speed = 2;
  }

  update() {
    if (this.sun) {
      this.return = 0;
      this.vel = createVector(-1, 0);
      this.vel.setMag(this.speed);
      this.pos.add(this.vel);
      if (this.pos.x < 0) {
        this.pos.x = width;
      }
      if (this.pos.x == width / 2) {
        // this.pos.x = width;
        day++;
        // survivalOfTheFittest();
      }
      return;
    }

    if (!this.sun) {
      this.vel.setMag(this.speed);
    }
    this.pos.add(this.vel);
    // this.acc.set(0, 0);

    if (this.pos.y < 0) {
      this.return = 10;
    }

    if (this.pos.y > height) {
      this.return = 10;
    }

    if (this.pos.x > width) {
      this.pos.x = 0;
      this.return++;
    }

    if (this.pos.x < 0) {
      this.pos.x = width;
      this.return++;
    }

    // if (
    //   !this.sun &&
    //   this.pos.y < height / 2 &&
    //   (this.pos.x < 0 || this.pos.x > width)
    // ) {
    //   this.return = 10;
    // }

    if (this.return == 1) {
      this.opacity = 50;
    }

    if (this.return >= 2 && !this.sun) {
      this.pos.x = lights[0].pos.x;
      this.pos.y = lights[0].pos.y;
      this.vel = p5.Vector.random2D();
      this.return = 0;
    }
  }
  show() {
    colorMode(HSB, 100, 100, 100, 100);
    let c = color(this.hue, this.sat, this.brightness, this.opacity);
    stroke(c);

    // //sets the size
    strokeWeight(this.size);

    if (this.sun || !this.sun) {
      //prints a point
      point(this.pos.x, this.pos.y);
    }

    // if (!this.sun) {
    //   stroke(color(this.hue, this.sat, this.brightness, 1));

    //   //print a line to parent
    //   line(this.pos.x, this.pos.y, lights[0].pos.x, lights[0].pos.y);
    // }
  }
}

class Node {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, -1);
    this.acc = createVector(0, 0);
    this.maxSpeed = 1;

    //types
    this.seed = false;
    this.stem = false;
    this.leaf = false;
    this.twig = false;
    this.light = false;
    this.winner = false;
    this.dead = false;
    this.geneIterator = 0;
    //genes
    this.genes = random(genePool);

    //status and id
    this.id = 1;
    this.depth = 1;
    this.stuck = true;
    this.size = 1;
    this.leafSize = leafSize;
    this.rendered = false;
    this.growing = false;
    this.growthCount = 0;
    this.efficiency = 0;

    //genes
    this.nodeLength = 100;
    this.growthAngle = 45;

    //visuals
    this.hue = 33;
    this.sat = 100;
    this.brightness = 100;
    this.opacity = 4;

    // relations
    this.up = []; // child node, up
    this.left = []; // child node, left
    this.right = []; // child node, right
    this.down = []; // parent node
    this.core = this; // organism core
    //
  }
  photosynthesize() {
    let perceptionRadius = this.leafSize / 2;
    let perceptionCount = 10;

    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (!other.light) {
        return;
      } else {
        // console.log("light on leaf!!");
      }
      if (other.light && !other.sun) {
        this.core.energy++;
        other.return = 10;
        // this.hue = this.hue - 0.5;
      }
    }
  }

  update() {
    //if dead, fade until eventually spliced out
    if (this.dead) {
      //lower brightness by 1
      this.brightness = this.brightness - 1;
      if (this.core.winner) {
        this.brightness = this.brightness + 0.75;
      }
      if (this.brightness < 10) {
        nodes.splice(nodes.indexOf(this), 1);
      }
      return;
    }

    //if core is dead, you're dead
    if (this.core.dead) {
      this.dead = true;
    }

    //limit how many layers deep the branches can get
    if (this.depth > depthLimit) {
      return;
    }

    if (nodes.length > 1000) {
      return;
    }

    //sets height limit
    if (this.pos.y < height / heightLimit) {
      return;
    }

    //if actively growing, move position
    if (this.growing) {
      this.vel.limit(this.maxSpeed);
      this.pos.add(this.vel);
      this.acc.set(0, 0);

      this.growthCount++;
      if (this.growthCount >= this.core.nodeLength) {
        this.growing = false;
        this.core.growingCount = this.core.growingCount - 1;
      }

      if (this.pos.y < 0) {
        window.location.reload();
      }
    }

    //if leaf, photosynthesize
    if (this.leaf) {
      this.photosynthesize();
    }

    // if all 3 slots are filled, do nothing
    if (
      this.up.length !== 0 &&
      this.left.length !== 0 &&
      this.right.length !== 0
    ) {
      return;
    }

    if (
      this.up.length == 0 &&
      this.right.length == 0 &&
      this.left.length == 0 &&
      !this.growing
    ) {
      //follow genetic instructions...
      let geneticPlan =
        this.core.genes[this.core.geneIterator % this.core.genes.length];
      this.core.geneIterator++;

      switch (
        geneticPlan[0] // LEFT slot
      ) {
        case 0:
          this.left = ["nub"];
          break;
        case 2:
          let leafL = new Node(this.pos.x, this.pos.y);
          leafL.core = this.core;
          leafL.leaf = true;
          leafL.down.push(this);
          leafL.depth = this.depth;
          leafL.vel = this.vel.copy();
          leafL.vel.rotate(-this.core.growthAngle / this.depth);
          leafL.growing = true;
          this.core.growingCount++;
          leafL.growthCount = 0;
          leafL.id = nodes.length + 1;
          leafL.up = ["nub"];
          leafL.right = ["nub"];
          leafL.left = ["nub"];
          leafL.growthCount = growthLimit - growthLimit / this.depth;
          leafL.leafSize = this.leafSize - leafL.depth * 2;
          nodes.push(leafL);
          this.left.push(leafL);
          this.core.leafCount++;

          break;
        case 1:
          let stemL = new Node(this.pos.x, this.pos.y);
          stemL.core = this.core;
          stemL.stem = true;
          stemL.down.push(this);
          stemL.vel = this.vel;
          stemL.depth = this.depth + 1;
          stemL.vel.rotate(-this.core.growthAngle / this.depth);
          stemL.growing = true;
          this.core.growingCount++;
          stemL.id = nodes.length + 1;
          stemL.growthCount = growthLimit - growthLimit / this.depth;
          nodes.push(stemL);
          this.left.push(stemL);
          break;
        default:
          console.log(`${this.id} of ${this.core.id} missing genes?`);
      }

      switch (
        geneticPlan[1] // MIDDLE/UP slot
      ) {
        case 0:
          this.up = ["nub"];
          break;
        case 2:
          // MAKE LEAF
          let leafU = new Node(this.pos.x, this.pos.y);
          leafU.core = this.core;
          leafU.leaf = true;
          leafU.down.push(this);
          leafU.vel = this.vel.copy();
          leafU.vel.rotate(random(-3, 3));
          leafU.growing = true;
          this.core.growingCount++;
          leafU.id = nodes.length + 1;
          leafU.up = ["nub"];
          leafU.right = ["nub"];
          leafU.left = ["nub"];
          leafU.depth = this.depth;
          leafU.growthCount = growthLimit - growthLimit / this.depth;
          leafU.leafSize = this.leafSize - leafU.depth * 2;
          nodes.push(leafU);
          this.up.push(leafU);
          this.core.leafCount++;
          break;
        case 1:
          // MAKE STEM
          let stem = new Node(this.pos.x, this.pos.y);
          stem.core = this.core;
          stem.stem = true;
          stem.down.push(this);
          stem.depth = this.depth;
          if (this.depth > 1) {
            // if you're on a branch, match branch's vel
            stem.vel = this.vel;
          } else {
            // if you're the main stem
          }
          stem.vel.rotate(random(-10, 10));
          stem.growing = true;
          this.core.growingCount++;
          stem.id = nodes.length + 1;

          stem.growthCount = growthLimit - growthLimit / this.depth;
          nodes.push(stem);
          this.up.push(stem);
          break;
        default:
          console.log(`${this.id} of ${this.core.id} missing genes?`);
      }

      switch (
        geneticPlan[2] // RIGHT slot
      ) {
        case 0:
          this.right = ["nub"];
          break;
        case 2:
          let leafR = new Node(this.pos.x, this.pos.y);
          leafR.core = this.core;
          leafR.leaf = true;
          leafR.down.push(this);
          leafR.depth = this.depth;
          leafR.vel = this.vel.copy();
          leafR.vel.rotate(this.core.growthAngle / this.depth);
          leafR.growing = true;
          this.core.growingCount++;
          leafR.id = nodes.length + 1;
          leafR.up = ["nub"];
          leafR.right = ["nub"];
          leafR.left = ["nub"];

          leafR.growthCount = growthLimit - growthLimit / this.depth;
          leafR.leafSize = this.leafSize - leafR.depth * 2;
          nodes.push(leafR);
          this.right.push(leafR);
          this.core.leafCount++;
          break;
        case 1:
          let stemR = new Node(this.pos.x, this.pos.y);
          stemR.core = this.core;
          stemR.stem = true;
          stemR.down.push(this);
          //   stemR.vel = this.vel;
          stemR.vel.rotate(this.core.growthAngle / this.depth);
          stemR.growing = true;
          this.core.growingCount++;
          stemR.id = nodes.length + 1;
          stemR.depth = this.depth + 1;
          stemR.growthCount = growthLimit - growthLimit / this.depth;
          nodes.push(stemR);
          this.right.push(stemR);
          break;
        default:
          console.log(`${this.id} of ${this.core.id} missing genes?`);
      }

      //   let roll = random();
      //   if (roll >= 0.5) {
      //     this.right = ["nub"];
      //     this.left = ["nub"];
      //     // console.log(`${this.id} nubbed (right)`);
      //   } else if (roll >= 0.25) {
      //     // MAKE LEAFS
      //     let leafR = new Node(this.pos.x, this.pos.y);
      //     leafR.core = this.core;
      //     leafR.leaf = true;
      //     leafR.down.push(this);
      //     leafR.vel.rotate(this.core.growthAngle);

      //     leafR.growing = true;
      //     leafR.id = nodes.length + 1;
      //     leafR.up = ["nub"];
      //     leafR.right = ["nub"];
      //     leafR.left = ["nub"];
      //     leafR.depth = this.depth + 1;
      //     leafR.growthCount = growthLimit - growthLimit / (this.depth + 1);
      //     leafR.leafSize = this.leafSize - leafR.depth * 2;
      //     nodes.push(leafR);
      //     this.right.push(leafR);
      //     this.core.leafCount++;
      //     // console.log(`${this.id} leafed ${leafR.id} (right)`);

      //     let leafL = new Node(this.pos.x, this.pos.y);
      //     leafL.core = this.core;
      //     leafL.leaf = true;
      //     leafL.down.push(this);
      //     leafL.vel.rotate(-this.core.growthAngle);
      //     leafL.growing = true;
      //     leafL.growthCount = 0;
      //     leafL.id = nodes.length + 1;
      //     leafL.up = ["nub"];
      //     leafL.right = ["nub"];
      //     leafL.left = ["nub"];
      //     leafL.depth = this.depth + 1;
      //     leafL.growthCount = growthLimit - growthLimit / (this.depth + 1);
      //     leafL.leafSize = this.leafSize - leafL.depth * 2;
      //     nodes.push(leafL);
      //     this.left.push(leafL);
      //     this.core.leafCount++;
      //     // console.log(`${this.id} leafed ${leafL.id} (left)`);
      //   } else {
      //     // MAKE STEM
      //     let stemR = new Node(this.pos.x, this.pos.y);
      //     stemR.core = this.core;
      //     stemR.stem = true;
      //     stemR.down.push(this);
      //     stemR.vel.rotate(this.core.growthAngle);
      //     stemR.growing = true;
      //     stemR.id = nodes.length + 1;
      //     stemR.depth = this.depth + 1;
      //     stemR.growthCount = growthLimit - growthLimit / (this.depth + 1);
      //     nodes.push(stemR);
      //     this.right.push(stemR);
      //     // console.log(`${this.id} stemmed ${stemR.id} (right)`);

      //     let stemL = new Node(this.pos.x, this.pos.y);
      //     stemL.core = this.core;
      //     stemL.stem = true;
      //     stemL.down.push(this);
      //     stemL.vel.rotate(-this.core.growthAngle);
      //     stemL.growing = true;
      //     stemL.id = nodes.length + 1;
      //     stemL.depth = this.depth + 1;
      //     stemL.growthCount = growthLimit - growthLimit / (this.depth + 1);
      //     nodes.push(stemL);
      //     this.left.push(stemL);
      //     // console.log(`${this.id} stemmed ${stemL.id} (left)`);
      //   }
    }
  }
  show() {
    //sets the color mode; applies hue, saturation, brightness, opacity
    colorMode(HSB, 100, 100, 100, 100);
    let c = color(this.hue, this.sat, this.brightness, this.opacity);
    stroke(c);

    // //sets the size
    strokeWeight(1);

    //prints a point
    point(this.pos.x, this.pos.y);

    //print a line to parent
    line(this.pos.x, this.pos.y, this.down[0].pos.x, this.down[0].pos.y);

    if (this.left[0] == "nub" && !this.growing) {
      let c = color(1, this.sat, this.brightness, this.opacity);
      stroke(c);
      strokeWeight(1);
      line(this.pos.x - 3, this.pos.y + 1, this.pos.x - 3, this.pos.y - 1);
    }

    if (this.right[0] == "nub" && !this.growing) {
      let c = color(1, this.sat, this.brightness, this.opacity);
      stroke(c);
      strokeWeight(1);
      line(this.pos.x + 3, this.pos.y + 1, this.pos.x + 3, this.pos.y - 1);
    }

    if (this.up[0] == "nub" && !this.growing) {
      let c = color(1, this.sat, this.brightness, this.opacity);
      stroke(c);
      strokeWeight(1);
      line(this.pos.x - 3, this.pos.y - 1, this.pos.x + 3, this.pos.y - 1);
    }

    if (this.leaf && !this.growing) {
      let c = color(this.hue, this.sat, this.brightness, this.opacity);
      stroke(c);
      strokeWeight(this.leafSize);
      // console.log(this.leafSize);
      point(this.pos.x, this.pos.y);
    }

    if (this.seed) {
      fill(this.hue, this.sat, this.brightness, this.opacity);
      text(
        `
        next gene:
        ${this.genes[this.geneIterator % this.genes.length]}`,
        this.pos.x,
        this.pos.y + 20
      );
      // text(`${this.leafCount}`, this.pos.x, this.pos.y + 30);
      //   text(
      //     `${Math.floor(this.efficiency * 10) / 10}`,
      //     this.pos.x,
      //     this.pos.y + 40
      //   );
    }
  }
}

function frankensteinGenes() {
  let genes = [];
  let j = Math.floor(random(1, 6));
  for (i = 0; i < j; i++) {
    let newChromosome = random(chromosomes);
    genes.push(newChromosome);
  }
  return genes;
}

// NOTES

// 0 = nub, 1 = stem, 2 = leaf
// [ABC] A = left, R = right, C = up
// Simple genes: [001], [201], [021], [001]
// Pinnately compound: [001], [101], [221], [221], [222], [001]
// Twice pinnately compound: [001], [001]

// Only relevent configurations:
// 001 = stem
// 111 = 3 stems
// 101 = 2 stems
