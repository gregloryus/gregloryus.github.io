// NEW GOAL: Plant logic
let targetFrameRate = 105;
let particles = [];
let clickType = "Seed";
let columns = 256;
let rows = 256;

let depthLimit = 5;
let growthAngle = 30;
let growthLimit = 0; // inter-node length, number of steps
let maxSpeed = 2; // velocity per step
let leafSize = 1;
let waitTime = 10;

let numOfDirt = 5000;
let numOfWater = 1000;
let numOfSeeds = 7;

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
let genePool = [
  // 0 = nothing
  // 1 = stem
  // 2 = leaf
  [
    [0, 1, 0], // simple symmetrical
    [2, 1, 2],
  ],
  [
    [0, 1, 0],
    [2, 1, 0], // simple alternating
    [0, 1, 2],
  ],
  [
    // WORKING PINNATELY COMPOUND
    [1, 1, 0], // main stem, branch left
    [2, 1, 2], // left branch flair
    [0, 1, 1], // main stem, branch right
    [2, 2, 2], // left branch terminate
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
// let grid = [[]];
let quadTree;
let attempt = 0;
let attemptDraw = 0;

let canvas;
let canvasContext;

let paused = false;

//Creates variables for the viewport w/h
const vw = Math.max(
  document.documentElement.clientWidth || 0,
  window.innerWidth || 0
);
const vh = Math.max(
  document.documentElement.clientHeight || 0,
  window.innerHeight || 0
);
// console.log(vw, vh);

// //turns off descriptive errors that add computing costs
// p5.disableFriendlyErrors = true;

// SLIDERS
let scaleNum = Math.floor(Math.min(vw, vh) / rows);
// console.log(scaleNum);

let grid;
let nextGrid;

// ORIGINAL
function setup() {
  let p5canvas = createCanvas(Math.min(vw, vh), Math.min(vw, vh));
  width = Math.floor(width / scaleNum);
  height = Math.floor(height / scaleNum);

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

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles
  // to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  setFrameRate(targetFrameRate);
  colorMode(HSB, 1, 1, 1, 1);

  //establishes quadtree
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, width, height));

  // creates a border of immovable stones
  for (i = 0; i < rows; i++) {
    let top = new Stone(i, rows - 1);
    top.falling = false;
    particles.push(top);

    let bottom = new Stone(i, 0);
    bottom.falling = false;
    particles.push(bottom);

    let left = new Stone(0, rows - 1 - i);
    left.falling = false;
    particles.push(left);

    let right = new Stone(rows - 1, rows - 1 - i);
    right.falling = false;
    particles.push(right);
  }

  for (i = 0; i < numOfDirt / 2; i++) {
    let sand = new Dirt(
      Math.floor(noise(i / 500) * rows),
      Math.floor(random(rows * 0.65, rows * 0.9))
    );
    sand.falling = true;
    particles.push(sand);
  }
  for (i = 0; i < numOfDirt / 2; i++) {
    let sand = new Dirt(
      Math.floor(noise(i / 500 + 500) * rows),
      Math.floor(random(rows * 0.65, rows * 0.9))
    );
    sand.falling = true;
    particles.push(sand);
  }

  for (i = 0; i < numOfWater; i++) {
    let sand = new Water(
      Math.floor(random(rows * 0.1, rows * 0.9)),
      Math.floor(random(10, rows * 0.25))
    );
    sand.falling = true;
    particles.push(sand);
  }

  for (i = 0; i < numOfSeeds; i++) {
    let seed = new Seed(Math.floor(random(columns * 0.05, columns * 0.95)), 8);
    particles.push(seed);
  }

  background(0);
  angleMode(DEGREES);
}

function draw() {
  if (paused) {
    return;
  }
  // clears the quadtree and adds particles
  quadTree.clear();
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      nextGrid[x][y] = [];
    }
  }

  background(0, 0, 0, 10);

  for (var particle of particles) {
    particle.update();
    particle.snap();
    particle.show();
  }

  grid = nextGrid;

  textAlign(CENTER);
  stroke(1, 0, 1, 1);
  fill(0, 0, 0, 0);
  text(
    `
  FPS: ${Math.floor(frameRate())}
  Particles: ${particles.length} (${particles.length - 1024})
  Create: ${clickType}
  `,
    (rows * scaleNum) / 2,
    (columns * scaleNum) / 20
  );
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = maxSpeed;

    //qualities
    this.size = 1;
    this.falling = true;

    //visuals
    this.color = random(colors);
    this.hue = 0.17;
    this.sat = 1;
    this.brightness = 1;
    this.opacity = 1;
  }

  smartFall() {
    if (!this.falling) {
      return;
    }
    // if (
    //   this.pos.y > 98 ||
    //   this.pos.x > 98 ||
    //   this.pos.y < 1 ||
    //   this.pos.x < 1
    // ) {
    //   return;
    // }

    if (
      grid[this.pos.x][this.pos.y + 1].length == 0 &&
      nextGrid[this.pos.x][this.pos.y + 1].length == 0
    ) {
      this.pos.y = this.pos.y + 1;
    } else {
      // flips a coin to see if it should check left/right first
      let roll = random();
      // check left, then right
      if (roll > 0.5) {
        if (
          grid[this.pos.x - 1][this.pos.y + 1].length == 0 &&
          nextGrid[this.pos.x - 1][this.pos.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else if (
          grid[this.pos.x + 1][this.pos.y + 1].length == 0 &&
          nextGrid[this.pos.x + 1][this.pos.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else {
          // this.falling = false;
        }
      } else {
        // check right, then left
        if (
          grid[this.pos.x + 1][this.pos.y + 1].length == 0 &&
          nextGrid[this.pos.x + 1][this.pos.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else if (
          grid[this.pos.x - 1][this.pos.y + 1].length == 0 &&
          nextGrid[this.pos.x - 1][this.pos.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else {
          // this.falling = false;
        }
      }
    }
  }

  update() {
    // if (this.pos.y > 98) {
    //   this.pos.y = 98;
    // }
    // if (this.pos.x > 98) {
    //   this.pos.x = 98;
    // }
  }

  snap() {
    this.pos.x = Math.floor(this.pos.x);
    this.pos.y = Math.floor(this.pos.y);
    // console.log(grid[this.pos.x][this.pos.y]);
    nextGrid[this.pos.x][this.pos.y].push(this);
    // if (attempt < 1) {
    //   console.log(`snapped into x:${this.pos.x}, y:${this.pos.y}`);
    //   console.log(grid[this.pos.x][this.pos.y]);
    //   attempt++;
    // }
  }

  show() {
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleNum,
      this.pos.y * scaleNum,
      scaleNum,
      scaleNum
    );
  }

  // newShow(ctx, scaleNum) {
  //   // Using native javascript for drawing on the canvas is faster than
  //   // using p5's methods
  //   ctx.fillStyle = this.color;
  //   ctx.fillRect(this.x * scaleNum, this.y * scaleNum, scaleNum, scaleNum);
  // }

  // show() {
  //   colorMode(HSB, 1, 1, 1, 1);
  //   //applies the color
  //   let c = color(this.hue, this.sat, this.brightness, this.opacity);
  //   stroke(c);
  //   //sets the size
  //   strokeWeight(this.size);
  //   //prints a point
  //   point(this.pos.x, this.pos.y);
  // }
}

class Sand extends Particle {
  constructor(x, y) {
    super(x, y);
    this.falling = true;
    this.sand = true;
    this.water = false;
    this.color = random(sandColors);
  }

  update() {
    super.update();
    if (this.falling) {
      this.smartFall();
    }
  }
  show() {
    super.show();
  }
}

class Water extends Sand {
  constructor(x, y) {
    super(x, y);
    this.falling = true;
    this.sand = false;
    this.water = true;
    this.color = random(waterColors);
  }

  smartFall() {
    if (!this.falling) {
      return;
    }

    if (grid[this.pos.x][this.pos.y + 1].length == 0) {
      this.pos.y = this.pos.y + 1;
    } else {
      let roll = random();
      if (roll > 0.5) {
        if (grid[this.pos.x - 1][this.pos.y + 1].length == 0) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x + 1][this.pos.y + 1].length == 0) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else if (grid[this.pos.x - 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x + 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x + 1;
        } else {
          // this.falling = false;
        }
      } else {
        if (grid[this.pos.x + 1][this.pos.y + 1].length == 0) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else if (grid[this.pos.x - 1][this.pos.y + 1].length == 0) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x + 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x + 1;
        } else if (grid[this.pos.x - 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        } else {
          // this.falling = false;
        }
      }
    }

    if (grid[this.pos.x][this.pos.y + 1].length == 0) {
      this.pos.y = this.pos.y + 1;
    } else {
      let roll = random();
      if (roll > 0.5) {
        if (grid[this.pos.x - 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x + 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x + 1;
        }
      } else {
        if (grid[this.pos.x + 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x + 1;
        } else if (grid[this.pos.x - 1][this.pos.y + 1].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        }
      }
    }
  }
}

class Dirt extends Sand {
  constructor(x, y) {
    super(x, y);
    this.falling = true;
    this.sand = true;
    this.stone = true;
    this.dirt = true;
    this.water = false;
    this.color = random(dirtColors);
  }
}

class Stone extends Sand {
  constructor(x, y) {
    super(x, y);
    this.falling = false;
    this.sand = true;
    this.stone = true;
    this.water = false;
    this.color = random(stoneColors);
  }

  smartFall() {
    if (!this.falling || this.falling) {
      return;
    }
  }
}

function doubleClicked() {
  // console.log(
  //   grid[Math.floor(mouseX / scaleNum)][Math.floor(mouseY / scaleNum)]
  // );
  if (!paused) {
    paused = true;
  } else if (paused) {
    paused = false;
  }
}

function mouseClicked() {
  if (mouseX > rows * scaleNum || mouseY > columns * scaleNum) {
    return;
  }
  if (clickType == "Dirt") {
    for (i = 0; i < 10; i++) {
      let sand = new Dirt(
        Math.floor(mouseX / scaleNum + random(-3, 3)),
        Math.floor(mouseY / scaleNum + random(-7, 7))
      );
      particles.push(sand);
    }
  } else if (clickType == "Water") {
    for (i = 0; i < 10; i++) {
      let sand = new Water(
        Math.floor(mouseX / scaleNum + random(-3, 3)),
        Math.floor(mouseY / scaleNum + random(-7, 7))
      );
      particles.push(sand);
    }
  } else if (clickType == "Seed") {
    let seed = new Seed(
      Math.floor(mouseX / scaleNum),
      Math.floor(mouseY / scaleNum)
    );
    seed.seed = true;
    seed.core.energy = 0;
    seed.core.leafCount = 0;
    seed.core.growingCount = 0;
    seed.down = [seed];
    particles.push(seed);
  }
}

// function mouseClicked() {
//   console.log(grid);
// }

function make2DArray(columns, rows) {
  let arr = new Array(columns);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
  }
  return arr;
}

function keyPressed() {
  if (keyCode === 67) {
    if (clickType == "Dirt") {
      clickType = "Seed";
    } else if (clickType == "Seed") {
      clickType = "Water";
    } else if (clickType == "Water") {
      clickType = "Dirt";
    }
  }
}

class Plent extends Particle {
  constructor(x, y) {
    super(x, y);
  }
}

class Plant extends Particle {
  constructor(x, y) {
    super(x, y);
    this.plant = true;
    this.seed = false;
    this.leaf = false;
    this.dead = false;
    this.falling = false;
    this.growing = true;
    this.sand = false;
    this.stone = false;
    this.dirt = false;
    this.water = false;
    this.color = "ForestGreen";
    this.id = 1;
    //Plant stats
    this.depth = 1;
    this.leafSize = 1;
    this.growthCount = 0;

    // relations
    this.up = []; // child node, up
    this.left = []; // child node, left
    this.right = []; // child node, right
    this.down = []; // parent node
    this.core = this; // organism core

    this.vel = createVector(0, -1);
    this.vel.setMag(this.maxSpeed);

    this.waitCounter = waitTime;
  }

  grow() {
    // console.log("falling check?");
    if (this.falling || !this.growing) {
      return;
    }
    if (
      grid[this.pos.x][this.pos.y - 1].length == 0 &&
      nextGrid[this.pos.x][this.pos.y - 1].length == 0
    ) {
      // console.log(`${this.pos.y}`);
      let plantNode = new Plant(this.pos.x, this.pos.y - 1);
      // console.log("still trying to grow...");
      // console.log(particles.length);

      particles.push(plantNode);
      // console.log(particles.length);
      // console.log(`${this.pos.y} stopped growing`);
      this.growing = false;
    }
  }

  photosynthesize() {
    if (this.leaf) {
      this.core.energy++;
    }
  }

  update() {
    super.update();

    if (this.dead) {
      //lower brightness by 1
      this.brightness = this.brightness - 0.01;
      if (this.brightness < 0.1) {
        particles.splice(particles.indexOf(this), 1);
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

    //if actively growing, move position
    if (this.growing) {
      if (this.falling) {
        return;
      }
      if (this.waitCounter > 0) {
        this.waitCounter = this.waitCounter - 1;
        return;
      }
      this.vel.limit(this.maxSpeed);
      if (this.stem) {
        this.vel.setMag(1);
      } else {
        this.vel.setMag(2);
      }
      this.pos.add(this.vel);
      this.acc.set(0, 0);

      this.growthCount++;
      if (this.growthCount >= this.core.nodeLength) {
        this.growing = false;
        this.core.growingCount = this.core.growingCount - 1;
      }

      //if leaf, photosynthesize
      if (this.leaf) {
        this.photosynthesize();
      }
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
          let leafL = new Plant(this.pos.x, this.pos.y);
          leafL.core = this.core;
          leafL.leaf = true;
          leafL.down.push(this);
          leafL.depth = this.depth;
          leafL.vel = this.vel.copy();
          leafL.vel.rotate(-this.core.growthAngle / this.depth);
          leafL.growing = true;
          this.core.growingCount++;
          leafL.growthCount = 0;
          leafL.id = particles.length + 1;
          leafL.up = ["nub"];
          leafL.right = ["nub"];
          leafL.left = ["nub"];
          leafL.growthCount = growthLimit - growthLimit / this.depth;
          leafL.leafSize = this.leafSize - leafL.depth * 2;
          leafL.color = this.core.leafColor;
          particles.push(leafL);
          this.left.push(leafL);
          this.core.leafCount++;

          break;
        case 1:
          let stemL = new Plant(this.pos.x, this.pos.y);
          stemL.core = this.core;
          stemL.stem = true;
          stemL.down.push(this);
          stemL.vel = this.vel;
          stemL.depth = this.depth + 1;
          stemL.vel.rotate(-this.core.growthAngle / this.depth);
          stemL.growing = true;
          this.core.growingCount++;
          stemL.id = particles.length + 1;
          stemL.growthCount = growthLimit - growthLimit / this.depth;
          particles.push(stemL);
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
          let leafU = new Plant(this.pos.x, this.pos.y);
          leafU.core = this.core;
          leafU.leaf = true;
          leafU.down.push(this);
          leafU.vel = this.vel.copy();
          leafU.vel.rotate(random(-3, 3));
          leafU.growing = true;
          this.core.growingCount++;
          leafU.id = particles.length + 1;
          leafU.up = ["nub"];
          leafU.right = ["nub"];
          leafU.left = ["nub"];
          leafU.depth = this.depth;
          leafU.growthCount = growthLimit - growthLimit / this.depth;
          leafU.leafSize = this.leafSize - leafU.depth * 2;
          leafU.color = this.core.leafColor;
          particles.push(leafU);
          this.up.push(leafU);
          this.core.leafCount++;
          break;
        case 1:
          // MAKE STEM
          let stem = new Plant(this.pos.x, this.pos.y);
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
          // stem.vel.rotate(random(-10, 10));
          stem.growing = true;
          this.core.growingCount++;
          stem.id = particles.length + 1;

          stem.growthCount = growthLimit - growthLimit / this.depth;
          particles.push(stem);
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
          let leafR = new Plant(this.pos.x, this.pos.y);
          leafR.core = this.core;
          leafR.leaf = true;
          leafR.down.push(this);
          leafR.depth = this.depth;
          leafR.vel = this.vel.copy();
          leafR.vel.rotate(this.core.growthAngle / this.depth);
          leafR.growing = true;
          this.core.growingCount++;
          leafR.id = particles.length + 1;
          leafR.up = ["nub"];
          leafR.right = ["nub"];
          leafR.left = ["nub"];

          leafR.growthCount = growthLimit - growthLimit / this.depth;
          leafR.leafSize = this.leafSize - leafR.depth * 2;
          leafR.color = this.core.leafColor;
          particles.push(leafR);
          this.right.push(leafR);
          this.core.leafCount++;
          break;
        case 1:
          let stemR = new Plant(this.pos.x, this.pos.y);
          stemR.core = this.core;
          stemR.stem = true;
          stemR.down.push(this);
          //   stemR.vel = this.vel;
          stemR.vel.rotate(this.core.growthAngle / this.depth);
          stemR.growing = true;
          this.core.growingCount++;
          stemR.id = particles.length + 1;
          stemR.depth = this.depth + 1;
          stemR.growthCount = growthLimit - growthLimit / this.depth;
          particles.push(stemR);
          this.right.push(stemR);
          break;
        default:
          console.log(`${this.id} of ${this.core.id} missing genes?`);
      }
    }

    // ORIGINAL
    // //chance to grow
    // if (this.growing) {
    //   let roll = random();
    //   if (roll < 0.01) {
    //     // console.log("attempting to grow...");
    //     this.grow();
    //     // console.log("grew!");
    //     // console.log(particles.length);
    //   }
    // }
  }
}

class Seed extends Plant {
  constructor(x, y) {
    super(x, y);

    //Plant ids
    this.seed = true;
    this.plant = true;
    this.sand = false;
    this.stone = false;
    this.dirt = false;
    this.water = false;
    this.color = "GreenYellow";
    this.falling = true; // seeds are falling

    //Plant stats
    this.depth = 1;
    this.leafSize = 1;
    this.growthCount = 0;

    //genes
    this.geneIterator = 0;
    this.genes = random(genePool);
    this.nodeLength = growthLimit;
    this.growthAngle = growthAngle;
    this.leafColor = random(leafColors);

    // relations
    this.up = []; // child node, up
    this.left = []; // child node, left
    this.right = []; // child node, right
    this.down = []; // parent node
    this.core = this; // organism core
  }

  update() {
    super.update();
    if (this.falling) {
      this.smartFall();
    }

    //stop falling if can't move down
    if (grid[this.pos.x][this.pos.y + 1].length !== 0) {
      this.falling = false;
    }
  }
}
