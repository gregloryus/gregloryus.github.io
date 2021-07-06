// v4 accomplishment: got efficiency working, and created a new efficiency model where leaves have a finite cost (instead of energy/leafCount)

let nodes = [];
let lights = [];
let quadTree;
let spacing = 16;

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
let mostEfficientRate = 0;
let mostEfficientPlant = [];
let winners = [];
let winner;
let generationCount = 0;
let winningLength = 0;
let winningAngle = 0;
let prevWinningLength = 0;
let prevWinningAngle = 0;
let survivalCountdown = 0;
let streakCounter = 0;

//SLIDERS
// let numOfSeeds = 12;
let seedSpacing = 10;
let numOfLights = 400;
let growthAngle = 45;
let growthLimit = 100;
let depthLimit = 5;
let leafCost = 0;
let heightLimit = 3; // height / heightLimit = how high plants can grow

function setup() {
  createCanvas(vw, vh);
  // frameRate(5);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  background(0);
  angleMode(DEGREES);

  let numOfSeeds = Math.floor(width / seedSpacing);

  for (i = 0; i < numOfSeeds; i++) {
    plant = new Node(
      width / numOfSeeds / 2 + (width / numOfSeeds) * i,
      height * 0.9
    );
    //genes
    plant.core.nodeLength = random(20, 200);
    plant.core.growthAngle = random(5, 85);

    plant.seed = true;
    plant.core.energy = 0;
    plant.core.leafCount = 0;
    plant.down = [plant];
    plant.id = nodes.length + 1;
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

  background(0, 0, 0, 5);
  for (var node of nodes) {
    node.update();
    node.show();
  }

  for (var light of lights) {
    light.update();
    light.show();
  }

  text(
    `
  gen: ${generationCount}
  winning length: ${Math.floor(winningLength)}
  winning angle: ${Math.floor(winningAngle)}
  streak: ${streakCounter}`,
    width * 0.5,
    length * 0.1
  );
}

function survivalOfTheFittest() {
  survivalCountdown++;
  if (survivalCountdown < 1) {
    return;
  }
  console.log("survival starting...");
  generationCount++;
  let winner = nodes[0];
  for (i = 1; i < nodes.length; i++) {
    if (nodes[i].efficiency > winner.efficiency) {
      winner = nodes[i];
      // console.log(`${winner.id} is the new winner, ${winner.efficiency}`);
    }
  }
  console.log(`${winner.id} is the winner, ${winner.efficiency}`);
  winner.core.winner = true;
  prevWinningLength = winningLength;
  prevWinningAngle = winningAngle;
  winningLength = winner.core.nodeLength;
  winningAngle = winner.core.growthAngle;

  if (prevWinningAngle == winningAngle && prevWinningLength == winningLength) {
    streakCounter++;
  } else {
    streakCounter = 0;
  }

  for (var plant of nodes) {
    plant.core.dead = true;
  }

  let numOfSeeds = Math.floor(width / seedSpacing);

  for (i = 0; i < numOfSeeds / 4; i++) {
    plant = new Node(random(width), height * 0.9);
    //genes
    plant.core.nodeLength = winner.core.nodeLength;
    plant.core.growthAngle = winner.core.growthAngle;

    plant.seed = true;
    plant.core.energy = 0;
    plant.core.leafCount = 0;
    plant.down = [plant];
    plant.id = nodes.length + 1;
    nodes.push(plant);
  }

  for (i = 0; i < (numOfSeeds / 4) * 3; i++) {
    plant = new Node(random(width), height * 0.9);
    //genes
    plant.core.nodeLength = random(20, 200);
    plant.core.growthAngle = random(5, 85);

    plant.seed = true;
    plant.core.energy = 0;
    plant.core.leafCount = 0;
    plant.down = [plant];
    plant.id = nodes.length + 1;
    nodes.push(plant);
  }
  survivalCountdown = 0;
}

class Light {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    //visuals
    this.hue = 17;
    this.sat = 100;
    this.brightness = 100;
    this.opacity = 100;

    this.size = 2;
    this.light = true;
    this.sun = false;
    this.return = 0;

    this.speed = 4;
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
        survivalOfTheFittest();
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
    let c = color(this.hue, this.sat, this.brightness, 10);
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

    //status and id
    this.id = 1;
    this.depth = 1;
    this.stuck = true;
    this.size = 1;
    this.leafSize = 16;
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
    this.opacity = 100;

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
        this.hue = this.hue - 0.5;
      }
    }
  }

  update() {
    this.hue = this.hue + 0.01;
    if (this.seed && this.energy > 0) {
      // console.log(`energy: ${this.energy}, leafCount: ${this.leafCount}`);
      this.efficiency = this.energy - this.leafCount * leafCost;
      // this.efficiency = this.energy / this.leafCount;
    }
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

    if (this.depth > depthLimit) {
      return;
    }

    if (this.pos.y < height / heightLimit) {
      return;
    }

    if (this.growing) {
      this.vel.add(this.acc);
      this.vel.limit(this.maxSpeed);
      this.pos.add(this.vel);
      this.acc.set(0, 0);

      this.growthCount++;
      if (this.growthCount >= this.core.nodeLength) {
        this.growing = false;
      }

      if (this.pos.y < 0) {
        window.location.reload();
      }
    }

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

    if (this.right.length == 0 && this.left.length == 0 && !this.growing) {
      let roll = random();
      if (roll >= 0.5) {
        this.right = ["nub"];
        this.left = ["nub"];
        // console.log(`${this.id} nubbed (right)`);
      } else if (roll >= 0.25) {
        // MAKE LEAFS
        let leafR = new Node(this.pos.x, this.pos.y);
        leafR.core = this.core;
        leafR.leaf = true;
        leafR.down.push(this);
        leafR.vel.rotate(this.core.growthAngle);

        leafR.growing = true;
        leafR.id = nodes.length + 1;
        leafR.up = ["nub"];
        leafR.right = ["nub"];
        leafR.left = ["nub"];
        leafR.depth = this.depth + 1;
        leafR.growthCount = growthLimit - growthLimit / (this.depth + 1);
        leafR.leafSize = this.leafSize - leafR.depth * 2;
        nodes.push(leafR);
        this.right.push(leafR);
        this.core.leafCount++;
        // console.log(`${this.id} leafed ${leafR.id} (right)`);

        let leafL = new Node(this.pos.x, this.pos.y);
        leafL.core = this.core;
        leafL.leaf = true;
        leafL.down.push(this);
        leafL.vel.rotate(-this.core.growthAngle);
        leafL.growing = true;
        leafL.growthCount = 0;
        leafL.id = nodes.length + 1;
        leafL.up = ["nub"];
        leafL.right = ["nub"];
        leafL.left = ["nub"];
        leafL.depth = this.depth + 1;
        leafL.growthCount = growthLimit - growthLimit / (this.depth + 1);
        leafL.leafSize = this.leafSize - leafL.depth * 2;
        nodes.push(leafL);
        this.left.push(leafL);
        this.core.leafCount++;
        // console.log(`${this.id} leafed ${leafL.id} (left)`);
      } else {
        // MAKE STEM
        let stemR = new Node(this.pos.x, this.pos.y);
        stemR.core = this.core;
        stemR.stem = true;
        stemR.down.push(this);
        stemR.vel.rotate(this.core.growthAngle);
        stemR.growing = true;
        stemR.id = nodes.length + 1;
        stemR.depth = this.depth + 1;
        stemR.growthCount = growthLimit - growthLimit / (this.depth + 1);
        nodes.push(stemR);
        this.right.push(stemR);
        // console.log(`${this.id} stemmed ${stemR.id} (right)`);

        let stemL = new Node(this.pos.x, this.pos.y);
        stemL.core = this.core;
        stemL.stem = true;
        stemL.down.push(this);
        stemL.vel.rotate(-this.core.growthAngle);
        stemL.growing = true;
        stemL.id = nodes.length + 1;
        stemL.depth = this.depth + 1;
        stemL.growthCount = growthLimit - growthLimit / (this.depth + 1);
        nodes.push(stemL);
        this.left.push(stemL);
        // console.log(`${this.id} stemmed ${stemL.id} (left)`);
      }
    }

    if (this.up.length == 0 && !this.growing) {
      let roll = random();
      if (roll >= 0.95) {
        this.up = ["nub"];
        // console.log(`${this.id} nubbed (up)`);
      } else if (roll >= 0.25) {
        // MAKE LEAF
        let leafU = new Node(this.pos.x, this.pos.y);
        leafU.core = this.core;
        leafU.leaf = true;
        leafU.down.push(this);
        // leaf.vel.rotate(this.growthAngle);
        leafU.growing = true;
        leafU.id = nodes.length + 1;
        leafU.up = ["nub"];
        leafU.right = ["nub"];
        leafU.left = ["nub"];
        // leafU.depth = this.depth + 1;
        // leafU.growthCount = growthLimit - growthLimit / (this.depth + 1);
        leafU.leafSize = this.leafSize - leafU.depth * 2;
        nodes.push(leafU);
        this.up.push(leafU);
        this.core.leafCount++;
        // console.log(`${this.id} leafed ${leafU.id} (right)`);
      } else {
        // MAKE STEM
        let stem = new Node(this.pos.x, this.pos.y);
        stem.core = this.core;
        stem.stem = true;
        stem.down.push(this);
        // stem.vel.rotate(this.growthAngle);
        stem.growing = true;
        stem.id = nodes.length + 1;
        // stem.depth = this.depth + 1;
        // stem.growthCount = growthLimit - growthLimit / (this.depth + 1);
        nodes.push(stem);
        this.up.push(stem);
        // console.log(`${this.id} stemmed ${stem.id} (right)`);
      }
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

    if (this.seed && this.energy > 0) {
      fill(this.hue, this.sat, this.brightness, this.opacity);
      text(`${this.energy}`, this.pos.x, this.pos.y + 20);
      text(`${this.leafCount}`, this.pos.x, this.pos.y + 30);
      text(
        `${Math.floor(this.efficiency * 10) / 10}`,
        this.pos.x,
        this.pos.y + 40
      );
    }
  }
}

// NOTES

// Where I left off:
// -- Need to figure out a way to manage the rotations... maybe setting and querying the 'heading' of the vector?
// -- Need to prevent infinite loops, frameRate speeds up exponentially for some reason

// Fitness criteria:
// The plant that collected the most lights (divided by the number of segments??? or not?)

// 0 = nub, 1 = stem, 2 = leaf
// [ABC] A = left, R = right, C = up
// Simple genes: [001], [201], [021], [001]
// Pinnately compound: [001], [101], [221], [221], [222], [001]
// Twice pinnately compound: [001], [001]

// Only relevent configurations:
// 001 = stem
// 111 = 3 stems
// 101 = 2 stems
