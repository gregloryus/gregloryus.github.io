// TO DO:
// - Connect plants as a chain; reset location relative to [down] at the start of every cycle, so that the plant can fall as one and so that it can wiggle at the base and shake all the other plant particles attached to it
// - Steam and respiration
// -
//
//
//
//

let targetFrameRate = 100;
let particles = [];
let clickType = "Water";
let columns = 100;
let rows = 100;

// let steamSpeed = 4;
let steamSpeed = 0.5;
let steamWhiteness = 0.75;
// let chanceOfEvap = 0.001;
let chanceOfEvap = 0;

let depthLimit = 5;
let growthAngle = 45;
let growthLimit = 0; // inter-node length, number of steps
let maxSpeed = 3; // velocity per step
let leafSize = 1;
let waitTime = 3;

let numOfDirt = 1000;
let numOfWater = 144;
let numOfSeeds = 1;

let rained = false;

let directions = [
  "up",
  "down",
  "left",
  "right",
  "upLeft",
  "upRight",
  "downLeft",
  "downRight",
];

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

prevGrid = make2DArray(columns, rows);
for (let x = 0; x < columns; x++) {
  for (let y = 0; y < rows; y++) {
    grid[x][y] = [];
  }
}

// ORIGINAL
function setup() {
  let p5canvas = createCanvas(Math.min(vw, vh), Math.min(vw, vh));
  width = Math.floor(width / scaleNum);
  height = Math.floor(height / scaleNum);

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
  for (i = 0; i < rows - 4; i++) {
    let bottom = new Stone(i + 4, rows - 4);
    bottom.falling = false;
    particles.push(bottom);

    let top = new Stone(i + 4, 4);
    top.falling = false;
    particles.push(top);

    let left = new Stone(4, rows - 4 - i);
    left.falling = false;
    particles.push(left);

    let right = new Stone(rows - 4, rows - 4 - i);
    right.falling = false;
    particles.push(right);
  }

  // STONE CIRCLE STARTS HERE

  let phaseShift = 1;
  let period = 0.01;
  let verticalShift = height * 0.5;
  // let amp = height * 0.386; // size of circle, safe = 0.25
  let amp = height * 0.39; // size of circle, safe = 0.25

  for (i = 0; i < rows * TWO_PI; i++) {
    let curve = new Stone(
      Math.floor(amp * cos(period * (i + phaseShift)) + verticalShift),
      Math.floor(amp * sin(period * (i + phaseShift)) + verticalShift)
    );
    curve.falling = false;
    particles.push(curve);
  }
  for (i = 0; i < rows * TWO_PI; i++) {
    let curves = new Stone(
      Math.floor(amp * cos(period * (i + phaseShift)) + verticalShift),
      Math.floor(amp * sin(period * (i + phaseShift)) + verticalShift) + 1
    );
    curves.falling = false;
    particles.push(curves);
  }
  for (i = 0; i < rows * TWO_PI; i++) {
    let curves = new Stone(
      Math.floor(amp * cos(period * (i + phaseShift)) + verticalShift) + 1,
      Math.floor(amp * sin(period * (i + phaseShift)) + verticalShift) + 1
    );
    curves.falling = false;
    particles.push(curves);
  }

  // STONE CIRCLE ENDS HERE

  for (i = 0; i < numOfDirt; i++) {
    let sand = new Dirt(
      Math.floor(random(rows * 0.3, rows * 0.7)),
      Math.floor(random(rows * 0.5, rows * 0.7))
    );
    sand.falling = true;
    particles.push(sand);
  }
  // for (i = 0; i < numOfDirt / 2; i++) {
  //   let sand = new Dirt(
  //     Math.floor(rows / 2.5 + (noise(i / 500 + 500) * rows) / 2),
  //     Math.floor(random(rows * 0.65, rows * 0.9))
  //   );
  //   sand.falling = true;
  //   particles.push(sand);
  // }

  // for (i = 0; i < numOfWater; i++) {
  //   let sand = new Water(
  //     Math.floor(random(rows * 0.4, rows * 0.6)),
  //     Math.floor(random(rows * 0.2, rows * 0.6))
  //   );
  //   sand.falling = true;
  //   particles.push(sand);
  // }

  for (i = 0; i < numOfSeeds; i++) {
    let seed = new Sed(
      Math.floor(random(columns * 0.05, columns * 0.95)),
      Math.floor(columns / 2)
    );
    particles.push(seed);
  }

  background(0);
  angleMode(DEGREES);
}

function draw() {
  let prevGrid = [...grid];
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

  // background(204 / 360, 0.7, 0.3, 1);
  background(0);

  if (!rained && frameCount == 100) {
    for (i = 0; i < numOfWater; i++) {
      let sand = new Water(
        Math.floor(random(rows * 0.4, rows * 0.6)),
        Math.floor(random(rows * 0.2, rows * 0.6))
      );
      sand.falling = true;
      particles.push(sand);
      let rained = true;
    }
  }

  for (var particle of particles) {
    particle.update();
    particle.snap();
    particle.show();
  }

  for (var seed of particles) {
    if (seed.seed) {
      seed.checkForWater();
    }
  }

  // if (frameCount % 9 == 0) {
  //   let waterStream = new Water(
  //     Math.floor(width / 2 + sin(frameCount) * (width / 4) + random(-30, 30)),
  //     Math.floor(height / 10)
  //   );
  //   particles.push(waterStream);
  // }

  // if (frameCount % 9 == 3) {
  //   let waterStream = new Water(
  //     Math.floor(
  //       width / 2 + sin(frameCount / 3) * (width / 4) + random(-30, 30)
  //     ),
  //     Math.floor(height / 10)
  //   );
  //   particles.push(waterStream);
  // }

  // if (frameCount % 9 == 6) {
  //   let waterStream = new Water(
  //     Math.floor(
  //       width / 2 + sin(frameCount / 2) * (width / 4) + random(-30, 30)
  //     ),
  //     Math.floor(height / 10)
  //   );
  //   particles.push(waterStream);
  // }

  grid = nextGrid;

  textAlign(CENTER);
  stroke(1, 0, 1, 1);
  fill(0, 0, 0, 0);
  text(
    `
  FPS: ${Math.floor(frameRate())}
  Particles: ${particles.length} (${
      particles.length - 1024 - numOfDirt - numOfWater
    })
  Create: ${clickType}
  `,
    (rows * scaleNum) / 2,
    (columns * scaleNum) / 20
  );
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.grid = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = maxSpeed;

    //qualities
    this.size = 1;
    this.falling = true;
    this.density = 0.5; // 1 = super heavy, 0 = super light

    //visuals
    this.color = random(colors);
    this.hue = 0.17;
    this.sat = 1;
    this.brightness = 1;
    this.opacity = 1;
  }

  smartFall() {
    // if (!this.falling) {
    //   return;
    // }
    // if (
    //   this.pos.y > 98 ||
    //   this.pos.x > 98 ||
    //   this.pos.y < 1 ||
    //   this.pos.x < 1
    // ) {
    //   return;
    // }

    if (
      // space below is empty
      grid[this.grid.x][this.grid.y + 1].length == 0 &&
      nextGrid[this.grid.x][this.grid.y + 1].length == 0
      // || grid[this.grid.x][this.grid.y + 1][0].density < this.density
    ) {
      this.pos.y = this.pos.y + 1;
    } else {
      // flips a coin to see if it should check left/right first
      let roll = random();
      // check left, then right
      if (roll > 0.5) {
        if (
          // check below-left
          grid[this.grid.x - 1][this.grid.y + 1].length == 0 &&
          nextGrid[this.grid.x - 1][this.grid.y + 1].length == 0
          // || grid[this.pos.x - 1][this.pos.y + 1][0].density < this.density
        ) {
          //move below-left
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else if (
          // check below-right
          grid[this.grid.x + 1][this.grid.y + 1].length == 0 &&
          nextGrid[this.grid.x + 1][this.grid.y + 1].length == 0
          // || grid[this.grid.x + 1][this.grid.y + 1][0].density < this.density
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else {
          // this.falling = false;
        }
      } else {
        // check right, then left
        if (
          grid[this.grid.x + 1][this.grid.y + 1].length == 0 &&
          nextGrid[this.grid.x + 1][this.grid.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x + 1;
        } else if (
          grid[this.grid.x - 1][this.grid.y + 1].length == 0 &&
          nextGrid[this.grid.x - 1][this.grid.y + 1].length == 0
        ) {
          this.pos.y = this.pos.y + 1;
          this.pos.x = this.pos.x - 1;
        } else {
          // this.falling = false;
        }
      }
    }
  }

  checkUp() {
    if (
      // space above is empty
      grid[this.grid.x][this.grid.y - 1].length == 0 &&
      nextGrid[this.grid.x][this.grid.y - 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkDown() {
    if (
      // space below is empty
      grid[this.grid.x][this.grid.y + 1].length == 0 &&
      nextGrid[this.grid.x][this.grid.y + 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkLeft() {
    if (
      // space left is empty
      grid[this.grid.x - 1][this.grid.y].length == 0 &&
      nextGrid[this.grid.x - 1][this.grid.y].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkRight() {
    if (
      // space right is empty
      grid[this.grid.x + 1][this.grid.y].length == 0 &&
      nextGrid[this.grid.x + 1][this.grid.y].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkUpLeft() {
    if (
      // space above-left is empty
      grid[this.grid.x - 1][this.grid.y - 1].length == 0 &&
      nextGrid[this.grid.x - 1][this.grid.y - 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkUpRight() {
    if (
      // space above-right is empty
      grid[this.grid.x + 1][this.grid.y - 1].length == 0 &&
      nextGrid[this.grid.x + 1][this.grid.y - 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkDownLeft() {
    if (
      // space below-left is empty
      grid[this.grid.x - 1][this.grid.y + 1].length == 0 &&
      nextGrid[this.grid.x - 1][this.grid.y + 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  checkDownRight() {
    if (
      // space below-right is empty
      grid[this.grid.x + 1][this.grid.y + 1].length == 0 &&
      nextGrid[this.grid.x + 1][this.grid.y + 1].length == 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  moveUp() {
    this.pos.y = this.pos.y - 1;
  }

  moveDown() {
    this.pos.y = this.pos.y + 1;
  }

  moveLeft() {
    this.pos.x = this.pos.x - 1;
  }

  moveRight() {
    this.pos.x = this.pos.x + 1;
  }

  moveUpLeft() {
    this.pos.y = this.pos.y - 1;
    this.pos.x = this.pos.x - 1;
  }

  moveUpRight() {
    this.pos.y = this.pos.y - 1;
    this.pos.x = this.pos.x + 1;
  }

  moveDownLeft() {
    this.pos.y = this.pos.y + 1;
    this.pos.x = this.pos.x - 1;
  }

  moveDownRight() {
    this.pos.y = this.pos.y + 1;
    this.pos.x = this.pos.x + 1;
  }

  betterFloat() {
    let directions = [
      "up",
      "down",
      "left",
      "right",
      "upLeft",
      "upRight",
      "downLeft",
      "downRight",
    ];
    let moveDir = random(directions);
    switch (moveDir) {
      case "up":
        if (this.checkUp()) {
          this.moveUp();
        }
        break;
      case "down":
        if (this.checkDown()) {
          this.moveDown();
        }
        break;
      case "left":
        if (this.checkLeft()) {
          this.moveLeft();
        }
        break;
      case "right":
        if (this.checkRight()) {
          this.moveRight();
        }
        break;
      case "upLeft":
        if (this.checkUpLeft()) {
          this.moveUpLeft();
        }
        break;
      case "upRight":
        if (this.checkUpRight()) {
          this.moveUpRight();
        }
        break;
      case "downLeft":
        if (this.checkDownLeft()) {
          this.moveDownLeft();
        }
        break;
      case "downRight":
        if (this.checkDownRight()) {
          this.moveDownRight();
        }
        break;
      default:
        return;
    }
  }

  betterRise() {
    let directions = [
      // up x6, down x3, left x5, right x5
      "up",
      "up",
      "up",
      "up",
      "up",
      "up",
      "up",
      "upLeft",
      "upLeft",
      "upRight",
      "upRight",
      "down",
      "down",
      "down",
      "downLeft",
      "downRight",
      "left",
      "left",
      "left",
      "left",
      "left",
      "right",
      "right",
      "right",
      "right",
      "right",
      // "up",
      // "down",
      // "left",
      // "right",
      // "upLeft",
      // "upRight",
      // "downLeft",
      // "downRight",
    ];
    let moveDir = random(directions);
    switch (moveDir) {
      case "up":
        if (this.checkUp()) {
          this.moveUp();
        }
        break;
      case "down":
        if (this.checkDown()) {
          this.moveDown();
        }
        break;
      case "left":
        if (this.checkLeft()) {
          this.moveLeft();
        }
        break;
      case "right":
        if (this.checkRight()) {
          this.moveRight();
        }
        break;
      case "upLeft":
        if (this.checkUpLeft()) {
          this.moveUpLeft();
        }
        break;
      case "upRight":
        if (this.checkUpRight()) {
          this.moveUpRight();
        }
        break;
      case "downLeft":
        if (this.checkDownLeft()) {
          this.moveDownLeft();
        }
        break;
      case "downRight":
        if (this.checkDownRight()) {
          this.moveDownRight();
        }
        break;
      default:
    }
  }

  smartRise() {
    if (!this.rising) {
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

    if (grid[this.pos.x][this.pos.y - 1].length == 0) {
      this.pos.y = this.pos.y - 1;
    } else {
      let roll = random();
      if (roll > 0.5) {
        if (grid[this.pos.x - 1][this.pos.y - 1].length == 0) {
          this.pos.y = this.pos.y - 1;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x + 1][this.pos.y - 1].length == 0) {
          this.pos.y = this.pos.y - 1;
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
        if (grid[this.pos.x + 1][this.pos.y - 1].length == 0) {
          this.pos.y = this.pos.y - 1;
          this.pos.x = this.pos.x + 1;
        } else if (grid[this.pos.x - 1][this.pos.y - 1].length == 0) {
          this.pos.y = this.pos.y - 1;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x - 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        } else if (grid[this.pos.x - 1][this.pos.y].length == 0) {
          this.pos.y = this.pos.y;
          this.pos.x = this.pos.x - 1;
        } else {
          // this.falling = false;
        }
      }
    }

    if (grid[this.pos.x][this.pos.y - 1].length == 0) {
      this.pos.y = this.pos.y - 1;
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

    if (this.pos.y < height / 2) {
      let heightPct = this.pos.y / height;
      let fallRoll = Math.random();
      if (fallRoll > heightPct) {
        if (
          // space below is empty
          grid[this.grid.x][this.grid.y + 1].length == 0 &&
          nextGrid[this.grid.x][this.grid.y + 1].length == 0
          // || grid[this.grid.x][this.grid.y + 1][0].density < this.density
        ) {
          this.pos.y = this.pos.y + Math.floor((1 - heightPct) * 3);
          // console.log("fell?");
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
    this.grid = this.pos.copy();
    this.grid.x = Math.floor(this.grid.x);
    this.grid.y = Math.floor(this.grid.y);

    nextGrid[this.grid.x][this.grid.y].push(this);

    // ORIGINAL
    // this.pos.x = Math.floor(this.pos.x);
    // this.pos.y = Math.floor(this.pos.y);
    // nextGrid[this.pos.x][this.pos.y].push(this);
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

  checkForWater() {
    if (
      // square below is filled with water
      (grid[this.grid.x][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x][this.grid.y + 1][0].water) ||
      // square below-right is water
      (grid[this.grid.x + 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y + 1][0].water) ||
      // square below-left is water
      (grid[this.grid.x - 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y + 1][0].water) ||
      // square left is water
      (grid[this.grid.x - 1][this.grid.y].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y][0].water) ||
      // square right is water
      (grid[this.grid.x + 1][this.grid.y].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y][0].water) ||
      // square above-right is water
      (grid[this.grid.x + 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y - 1][0].water) ||
      // square above-left is water
      (grid[this.grid.x - 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y - 1][0].water) ||
      // square above is water
      (grid[this.grid.x][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x][this.grid.y - 1][0].water)
    ) {
      return true;
    } else {
      return false;
    }
  }
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
    this.steam = false;
    this.color = random(waterColors);
    this.offset = Math.floor(Math.random() * 100);
  }
  refresh() {
    this.pos.y = this.pos.y - 150;
  }

  checkForWater() {
    if (
      // square below is filled with water
      (grid[this.grid.x][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x][this.grid.y + 1][0].water) ||
      // square below-right is water
      (grid[this.grid.x + 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y + 1][0].water) ||
      // square below-left is water
      (grid[this.grid.x - 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y + 1][0].water) ||
      // square left is water
      (grid[this.grid.x - 1][this.grid.y].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y][0].water) ||
      // square right is water
      (grid[this.grid.x + 1][this.grid.y].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y][0].water) ||
      // square above-right is water
      (grid[this.grid.x + 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y - 1][0].water) ||
      // square above-left is water
      (grid[this.grid.x - 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y - 1][0].water) ||
      // square above is water
      (grid[this.grid.x][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x][this.grid.y - 1][0].water)
    ) {
      return true;
    } else {
      return false;
    }
  }

  update() {
    super.update();
    // if (frameCount % 100 == 1) {
    //   console.log(this.pos);
    // }
    // if (frameCount % 500 == 1 && this.pos.y > (height / 4) * 3) {
    //   this.refresh();
    // }

    if (this.checkUp()) {
      let roll = Math.random();
      if (roll < chanceOfEvap) {
        if (!this.steam) {
          this.steam = true;
          this.falling = false;
          console.log("evaporated");
        }
      }
    }

    if (this.steam) {
      let steamSpeedRoll = Math.random();
      if (steamSpeedRoll > steamSpeed) {
        // let steamSpeedRoll = this.offset;
        // if ((frameCount + this.offset) % steamSpeed == 1) {
        this.betterRise();
      }

      if (
        (this.checkUp() && this.checkLeft() && this.checkRight()) ||
        this.checkForWater()
      ) {
        // return;
      } else {
        this.steam = false;
        this.falling = true;
        console.log("condensated");
        // this.rising = false;
      }
    }
  }

  show() {
    super.show();
    if (this.steam) {
      canvasContext.fillStyle = `rgba(0, 0, 0, ${steamWhiteness})`;
      canvasContext.fillRect(
        this.pos.x * scaleNum,
        this.pos.y * scaleNum,
        scaleNum,
        scaleNum
      );
    }
  }

  smartFall() {
    if (!this.falling) {
      return;
    }

    // console.log(this.pos);

    if (grid[this.grid.x][this.grid.y + 1].length == 0) {
      this.grid.y = this.grid.y + 1;
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

    if (grid[this.grid.x][this.grid.y + 1].length == 0) {
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

class Steam extends Water {
  constructor(x, y) {
    super(x, y);
    this.falling = false;
    // this.rising = true;
  }
  update() {
    super.update();
    let roll = Math.random();
    if (roll > 0.5) {
      this.betterRise();
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
  console.log(
    grid[Math.floor(mouseX / scaleNum)][Math.floor(mouseY / scaleNum)]
  );
  // if (!paused) {
  //   paused = true;
  // } else if (paused) {
  //   paused = false;
  // }
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
    for (i = 0; i < 1; i++) {
      let sand = new Water(
        Math.floor(mouseX / scaleNum + random(-3, 3)),
        Math.floor(mouseY / scaleNum + random(-7, 7))
      );
      particles.push(sand);
    }
  } else if (clickType == "Steam") {
    for (i = 0; i < 100; i++) {
      let sand = new Steam(
        Math.floor(mouseX / scaleNum + random(-3, 3)),
        Math.floor(mouseY / scaleNum + random(-7, 7))
      );
      particles.push(sand);
    }
  } else if (clickType == "Seed") {
    let seed = new Sed(
      Math.floor(mouseX / scaleNum),
      Math.floor(mouseY / scaleNum)
    );
    seed.seed = true;
    seed.core.energy = 0;
    seed.core.leafCount = 0;
    seed.core.growingCount = 0;
    seed.down = [seed];
    particles.push(seed);
  } else if (clickType == "Stone") {
    for (i = 0; i < 2; i++) {
      let stone = new Stone(
        Math.floor(mouseX / scaleNum + i),
        Math.floor(mouseY / scaleNum)
      );
      particles.push(stone);
    }
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
      clickType = "Steam";
    } else if (clickType == "Steam") {
      clickType = "Stone";
    } else if (clickType == "Stone") {
      clickType = "Dirt";
    }
  }
}

class Plent extends Particle {
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

    // relations
    this.up = []; // child node, up
    this.left = []; // child node, left
    this.right = []; // child node, right
    this.down = []; // parent node
    this.core = this; // organism core
    // this.core.wet = true;

    this.vel = createVector(0, -1);
    this.vel.setMag(this.maxSpeed);

    this.waitCounter = waitTime;
  }

  grow() {
    if (this.falling || !this.growing) {
      return;
    }
    // let roll = random(100);
    // if (roll < 1) {
    //   this.growing = false;
    //   console.log("natural terminus");
    //   return;
    // }

    if (
      //square above is empty
      (grid[this.grid.x][this.grid.y - 1].length == 0 &&
        nextGrid[this.grid.x][this.grid.y - 1].length == 0) ||
      //square above-left is empty
      (grid[this.grid.x - 1][this.grid.y - 1].length == 0 &&
        nextGrid[this.grid.x - 1][this.grid.y - 1].length == 0) ||
      //square above-right is empty
      (grid[this.grid.x + 1][this.grid.y - 1].length == 0 &&
        nextGrid[this.grid.x + 1][this.grid.y - 1].length == 0)
    ) {
      let growthDirections = [-1, 0, 1];
      let roll = random(growthDirections);

      switch (roll) {
        case 0:
          if (
            grid[this.grid.x][this.grid.y - 1].length == 0 &&
            nextGrid[this.grid.x][this.grid.y - 1].length == 0
          ) {
            // growing from the up slot
            let plant = new Plent(this.grid.x, this.grid.y - 1);
            plant.core = this.core; // share core
            plant.stem = true; // this is a stem
            plant.down.push(this); // this is it's parent

            plant.vel = this.vel; // maybe rotate it a little?
            plant.depth = this.depth; // inherets same depth, not an offshoot
            plant.growing = true;
            this.core.growingCount++; // keeps track of how many pieces are currently growing
            plant.id = particles.length + 1;
            plant.growthCount = growthLimit - growthLimit / this.depth; // growth length will be limited by depth
            particles.push(plant); // add new particle to the world
            this.up.push(plant); // assign it to this particle
            this.growing = false; // this particle stops growing
            // this.core.lastGrowthPosX = plant.pos.x;
            // this.core.lastGrowthPosY = plant.pos.y;
            this.core.lastGrowthPos = plant.pos.copy();
          }
          break;
        case 1:
          if (
            grid[this.grid.x + 1][this.grid.y - 1].length == 0 &&
            nextGrid[this.grid.x + 1][this.grid.y - 1].length == 0
          ) {
            let plant = new Plent(this.grid.x + 1, this.grid.y - 1);
            plant.core = this.core; // share core
            plant.stem = true; // this is a stem
            plant.down.push(this); // this is it's parent

            plant.vel = this.vel; // maybe rotate it a little?
            plant.depth = this.depth; // inherets same depth, not an offshoot
            plant.growing = true;
            this.core.growingCount++; // keeps track of how many pieces are currently growing
            plant.id = particles.length + 1;
            plant.growthCount = growthLimit - growthLimit / this.depth; // growth length will be limited by depth
            particles.push(plant); // add new particle to the world
            this.up.push(plant); // assign it to this particle
            this.growing = false; // this particle stops growing
            // this.core.lastGrowthPosX = plant.pos.x;
            // this.core.lastGrowthPosY = plant.pos.y;
            this.core.lastGrowthPos = plant.pos.copy();
          }
          break;

        case -1:
          if (
            grid[this.grid.x - 1][this.grid.y - 1].length == 0 &&
            nextGrid[this.grid.x - 1][this.grid.y - 1].length == 0
          ) {
            let plant = new Plent(this.grid.x - 1, this.grid.y - 1);
            plant.core = this.core; // share core
            plant.stem = true; // this is a stem
            plant.down.push(this); // this is it's parent

            plant.vel = this.vel; // maybe rotate it a little?
            plant.depth = this.depth; // inherets same depth, not an offshoot
            plant.growing = true;
            this.core.growingCount++; // keeps track of how many pieces are currently growing
            plant.id = particles.length + 1;
            plant.growthCount = growthLimit - growthLimit / this.depth; // growth length will be limited by depth
            particles.push(plant); // add new particle to the world
            this.up.push(plant); // assign it to this particle
            this.growing = false; // this particle stops growing
            // this.core.lastGrowthPosX = plant.pos.x;
            // this.core.lastGrowthPosY = plant.pos.y;
            this.core.lastGrowthPos = plant.pos.copy();
          }
          break;
        default:
          console.log("rolling isn't working");
      }

      // switch (
      //   geneticPlan[0] // LEFT slot
      // ) {
      //   case 0:
      //     this.left = ["nub"];
      //     break;
      //   case 2:
      //     let leafL = new Plant(this.pos.x, this.pos.y);
      //     leafL.core = this.core;
      //     leafL.leaf = true;
      //     leafL.down.push(this);
      //     leafL.depth = this.depth;
      //     leafL.vel = this.vel.copy();
      //     leafL.vel.rotate(-this.core.growthAngle / this.depth);
      //     leafL.growing = true;
      //     this.core.growingCount++;
      //     leafL.growthCount = 0;
      //     leafL.id = particles.length + 1;
      //     leafL.up = ["nub"];
      //     leafL.right = ["nub"];
      //     leafL.left = ["nub"];
      //     leafL.growthCount = growthLimit - growthLimit / this.depth;
      //     leafL.leafSize = this.leafSize - leafL.depth * 2;
      //     leafL.color = this.core.leafColor;
      //     particles.push(leafL);
      //     this.left.push(leafL);
      //     this.core.leafCount++;

      //     break;
      //   case 1:
      //     let stemL = new Plant(this.pos.x, this.pos.y);
      //     stemL.core = this.core;
      //     stemL.stem = true;
      //     stemL.down.push(this);
      //     stemL.vel = this.vel;
      //     stemL.depth = this.depth + 1;
      //     stemL.vel.rotate(-this.core.growthAngle / this.depth);
      //     stemL.growing = true;
      //     this.core.growingCount++;
      //     stemL.id = particles.length + 1;
      //     stemL.growthCount = growthLimit - growthLimit / this.depth;
      //     particles.push(stemL);
      //     this.left.push(stemL);
      //     break;
      //   default:
      //     console.log(`${this.id} of ${this.core.id} missing genes?`);
      // }
    }
  }

  update() {
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
    if (this.waitCounter > 0) {
      this.waitCounter = this.waitCounter - 1;
      return;
    }
    // this.core.checkForWater();
    //if actively growing, move position

    if (this.core.wet) {
      this.grow();
    }

    if (
      this.checkUp() == false &&
      this.checkForWater() == false &&
      frameCount % 2 == 1
    ) {
      this.core.dead = true;
      let sed = new Sed(this.grid.x, this.grid.y);
      sed.falling = true;
      particles.push(sed);
    }
  }
}

class Sed extends Plent {
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
    this.core = this; // organism core
    this.wet = true;
    // this.wet = false;
    // this.core.wet = false; // wet = near water
    this.lastGrowthPos = this.pos.copy();

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
  }

  absorbWater() {
    // console.log("checking for water in the function");
    // needs to check all 8 neighbor squares, not just 3 below
    if (
      // square below is filled with water
      grid[this.grid.x][this.grid.y + 1].length !== 0 &&
      grid[this.grid.x][this.grid.y + 1][0].water
    ) {
      grid[this.grid.x][this.grid.y + 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x][this.grid.y + 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x][this.grid.y + 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x][this.grid.y + 1][0].snap();
      grid[this.grid.x][this.grid.y + 1][0].steam = true;
      grid[this.grid.x][this.grid.y + 1][0].falling = false;
    } else if (
      // // square below-right is water
      grid[this.grid.x + 1][this.grid.y + 1].length !== 0 &&
      grid[this.grid.x + 1][this.grid.y + 1][0].water
    ) {
      grid[this.grid.x + 1][this.grid.y + 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x + 1][this.grid.y + 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x + 1][this.grid.y + 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x + 1][this.grid.y + 1][0].snap();
      grid[this.grid.x + 1][this.grid.y + 1][0].steam = true;
      grid[this.grid.x + 1][this.grid.y + 1][0].falling = false;
    } else if (
      // // square below-left is water
      grid[this.grid.x - 1][this.grid.y + 1].length !== 0 &&
      grid[this.grid.x - 1][this.grid.y + 1][0].water
    ) {
      grid[this.grid.x - 1][this.grid.y + 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x - 1][this.grid.y + 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x - 1][this.grid.y + 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x - 1][this.grid.y + 1][0].snap();
      grid[this.grid.x - 1][this.grid.y + 1][0].steam = true;
      grid[this.grid.x - 1][this.grid.y + 1][0].falling = false;
    } else if (
      // // square left is water
      grid[this.grid.x - 1][this.grid.y].length !== 0 &&
      grid[this.grid.x - 1][this.grid.y][0].water
    ) {
      grid[this.grid.x - 1][this.grid.y][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x - 1][this.grid.y][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x - 1][this.grid.y][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x - 1][this.grid.y][0].snap();
      grid[this.grid.x - 1][this.grid.y][0].steam = true;
      grid[this.grid.x - 1][this.grid.y][0].falling = false;
    } else if (
      // // square right is water
      grid[this.grid.x + 1][this.grid.y].length !== 0 &&
      grid[this.grid.x + 1][this.grid.y][0].water
    ) {
      grid[this.grid.x + 1][this.grid.y][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x + 1][this.grid.y][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x + 1][this.grid.y][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x + 1][this.grid.y][0].snap();
      grid[this.grid.x + 1][this.grid.y][0].steam = true;
      grid[this.grid.x + 1][this.grid.y][0].falling = false;
    } else if (
      // // square above-right is water
      grid[this.grid.x + 1][this.grid.y - 1].length !== 0 &&
      grid[this.grid.x + 1][this.grid.y - 1][0].water
    ) {
      grid[this.grid.x + 1][this.grid.y - 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x + 1][this.grid.y - 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x + 1][this.grid.y - 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x + 1][this.grid.y - 1][0].snap();
      grid[this.grid.x + 1][this.grid.y - 1][0].steam = true;
      grid[this.grid.x + 1][this.grid.y - 1][0].falling = false;
    } else if (
      // // square above-left is water
      grid[this.grid.x - 1][this.grid.y - 1].length !== 0 &&
      grid[this.grid.x - 1][this.grid.y - 1][0].water
    ) {
      grid[this.grid.x - 1][this.grid.y - 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x - 1][this.grid.y - 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x - 1][this.grid.y - 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x - 1][this.grid.y - 1][0].snap();
      grid[this.grid.x - 1][this.grid.y - 1][0].steam = true;
      grid[this.grid.x - 1][this.grid.y - 1][0].falling = false;
    } else if (
      // // square above is water
      grid[this.grid.x][this.grid.y - 1].length !== 0 &&
      grid[this.grid.x][this.grid.y - 1][0].water
    ) {
      grid[this.grid.x][this.grid.y - 1][0].pos =
        this.core.lastGrowthPos.copy();
      // grid[this.grid.x][this.grid.y - 1][0].pos.x = this.lastGrowthPosX;
      // grid[this.grid.x][this.grid.y - 1][0].pos.y = this.lastGrowthPosY; //RETURNHERE recall the saved position of the last growth
      grid[this.grid.x][this.grid.y - 1][0].snap();
      grid[this.grid.x][this.grid.y - 1][0].steam = true;
      grid[this.grid.x][this.grid.y - 1][0].falling = false;
    }
  }

  checkForWater() {
    // console.log("checking for water in the function");
    // needs to check all 8 neighbor squares, not just 3 below
    if (
      // square below is filled with water
      (grid[this.grid.x][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x][this.grid.y + 1][0].water) ||
      // square below-right is water
      (grid[this.grid.x + 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y + 1][0].water) ||
      // square below-left is water
      (grid[this.grid.x - 1][this.grid.y + 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y + 1][0].water) ||
      // square left is water
      (grid[this.grid.x - 1][this.grid.y].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y][0].water) ||
      // square right is water
      (grid[this.grid.x + 1][this.grid.y].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y][0].water) ||
      // square above-right is water
      (grid[this.grid.x + 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x + 1][this.grid.y - 1][0].water) ||
      // square above-left is water
      (grid[this.grid.x - 1][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x - 1][this.grid.y - 1][0].water) ||
      // square above is water
      (grid[this.grid.x][this.grid.y - 1].length !== 0 &&
        grid[this.grid.x][this.grid.y - 1][0].water)
    ) {
      // console.log("water found");
      this.wet = true;
      this.core.wet = true;
      this.absorbWater();
      return true;
      // this.wet = true;
      // return true;c

      // this.wet = true;
      // this.core.wet = true;
    } else {
      // console.log("water not found");
      // console.log(grid[this.pos.x][this.pos.y + 1]);
      // console.log(prevGrid[this.grid.x][this.grid.y + 1]);
      this.wet = false;
      this.core.wet = false;
      return false;
      // false;
      // this.wet = false;
    }
  }

  refresh() {
    let copy = new Sed(this.grid.x, this.grid.y);
    particles.push(copy);
  }

  update() {
    super.update();
    if (frameCount % 100 == 10) {
      // this.wet = false;
      // this.core.wet = false;
      // this.refresh();
    }
    if (frameCount % 100 == 90) {
      // this.wet = false;
      // this.core.wet = false;
      this.checkForWater();
      // this.absorbWater();
    }
    this.smartFall();

    // if (this.falling) {
    //   this.smartFall();
    // }

    //stop falling if can't move down
    if (grid[this.grid.x][this.grid.y + 1].length !== 0) {
      this.falling = false;
    }

    // this.checkForWater();
    // this.wet = this.checkForWater();
  }
}

// class Plant extends Particle {
//   constructor(x, y) {
//     super(x, y);
//     this.plant = true;
//     this.seed = false;
//     this.leaf = false;
//     this.dead = false;
//     this.falling = false;
//     this.growing = true;
//     this.sand = false;
//     this.stone = false;
//     this.dirt = false;
//     this.water = false;
//     this.color = "ForestGreen";
//     this.id = 1;
//     this.core = this; // organism core
//     this.core.wet = false;
//     this.wet = false;

//     //Plant stats
//     this.depth = 1;
//     this.leafSize = 1;
//     this.growthCount = 0;

//     // relations
//     this.up = []; // child node, up
//     this.left = []; // child node, left
//     this.right = []; // child node, right
//     this.down = []; // parent node

//     this.vel = createVector(0, -1);
//     this.vel.setMag(this.maxSpeed);

//     this.waitCounter = waitTime;
//   }

//   grow() {
//     // console.log("falling check?");
//     if (this.falling || !this.growing) {
//       return;
//     }
//     if (
//       grid[this.pos.x][this.pos.y - 1].length == 0 &&
//       nextGrid[this.pos.x][this.pos.y - 1].length == 0
//     ) {
//       // console.log(`${this.pos.y}`);
//       let plantNode = new Plant(this.pos.x, this.pos.y - 1);
//       // console.log("still trying to grow...");
//       // console.log(particles.length);

//       particles.push(plantNode);
//       // console.log(particles.length);
//       // console.log(`${this.pos.y} stopped growing`);
//       this.growing = false;
//     }
//   }

//   photosynthesize() {
//     if (this.leaf) {
//       this.core.energy++;
//     }
//   }

//   update() {
//     super.update();

//     if (this.dead) {
//       //lower brightness by 1
//       this.brightness = this.brightness - 0.01;
//       if (this.brightness < 0.1) {
//         particles.splice(particles.indexOf(this), 1);
//       }
//       return;
//     }

//     //if core is dead, you're dead
//     if (this.core.dead) {
//       this.dead = true;
//     }

//     //limit how many layers deep the branches can get
//     if (this.depth > depthLimit) {
//       return;
//     }

//     //if actively growing, move position
//     if (this.growing) {
//       if (this.falling || this.pos.y < 10) {
//         return;
//       }
//       if (this.waitCounter > 0) {
//         this.waitCounter = this.waitCounter - 1;
//         return;
//       }
//       this.vel.limit(this.maxSpeed);
//       // if (this.stem) {
//       //   this.vel.setMag(maxSpeed / 2);
//       // } else {
//       //   this.vel.setMag(maxSpeed);
//       // }
//       this.pos.add(this.vel);
//       this.acc.set(0, 0);

//       this.growthCount++;
//       if (this.growthCount >= this.core.nodeLength) {
//         this.growing = false;
//         this.core.growingCount = this.core.growingCount - 1;
//       }
//     }

//     //if leaf, photosynthesize
//     if (this.leaf) {
//       this.photosynthesize();
//     }
//     // if all 3 slots are filled, do nothing
//     if (
//       this.up.length !== 0 &&
//       this.left.length !== 0 &&
//       this.right.length !== 0
//     ) {
//       return;
//     }

//     if (
//       this.up.length == 0 &&
//       this.right.length == 0 &&
//       this.left.length == 0 &&
//       !this.growing
//     ) {
//       //follow genetic instructions...
//       let geneticPlan =
//         this.core.genes[this.core.geneIterator % this.core.genes.length];
//       this.core.geneIterator++;

//       switch (
//         geneticPlan[0] // LEFT slot
//       ) {
//         case 0:
//           this.left = ["nub"];
//           break;
//         case 2:
//           let leafL = new Plant(this.pos.x, this.pos.y);
//           leafL.core = this.core;
//           leafL.leaf = true;
//           leafL.down.push(this);
//           leafL.depth = this.depth;
//           leafL.vel = this.vel.copy();
//           leafL.vel.rotate(-this.core.growthAngle / this.depth);
//           leafL.growing = true;
//           this.core.growingCount++;
//           leafL.growthCount = 0;
//           leafL.id = particles.length + 1;
//           leafL.up = ["nub"];
//           leafL.right = ["nub"];
//           leafL.left = ["nub"];
//           leafL.growthCount = growthLimit - growthLimit / this.depth;
//           leafL.leafSize = this.leafSize - leafL.depth * 2;
//           leafL.color = this.core.leafColor;
//           particles.push(leafL);
//           this.left.push(leafL);
//           this.core.leafCount++;

//           break;
//         case 1:
//           let stemL = new Plant(this.pos.x, this.pos.y);
//           stemL.core = this.core;
//           stemL.stem = true;
//           stemL.down.push(this);
//           stemL.vel = this.vel;
//           stemL.depth = this.depth + 1;
//           stemL.vel.rotate(-this.core.growthAngle / this.depth);
//           stemL.growing = true;
//           this.core.growingCount++;
//           stemL.id = particles.length + 1;
//           stemL.growthCount = growthLimit - growthLimit / this.depth;
//           particles.push(stemL);
//           this.left.push(stemL);
//           break;
//         default:
//           console.log(`${this.id} of ${this.core.id} missing genes?`);
//       }

//       switch (
//         geneticPlan[1] // MIDDLE/UP slot
//       ) {
//         case 0:
//           this.up = ["nub"];
//           break;
//         case 2:
//           // MAKE LEAF
//           let leafU = new Plant(this.pos.x, this.pos.y);
//           leafU.core = this.core;
//           leafU.leaf = true;
//           leafU.down.push(this);
//           leafU.vel = this.vel.copy();
//           leafU.vel.rotate(random(-3, 3));
//           leafU.growing = true;
//           this.core.growingCount++;
//           leafU.id = particles.length + 1;
//           leafU.up = ["nub"];
//           leafU.right = ["nub"];
//           leafU.left = ["nub"];
//           leafU.depth = this.depth;
//           leafU.growthCount = growthLimit - growthLimit / this.depth;
//           leafU.leafSize = this.leafSize - leafU.depth * 2;
//           leafU.color = this.core.leafColor;
//           particles.push(leafU);
//           this.up.push(leafU);
//           this.core.leafCount++;
//           break;
//         case 1:
//           // MAKE STEM
//           let stem = new Plant(this.pos.x, this.pos.y);
//           stem.core = this.core;
//           stem.stem = true;
//           stem.down.push(this);
//           stem.depth = this.depth;
//           if (this.depth > 1) {
//             // if you're on a branch, match branch's vel
//             stem.vel = this.vel;
//           } else {
//             // if you're the main stem
//           }
//           // stem.vel.rotate(random(-10, 10));
//           stem.growing = true;
//           this.core.growingCount++;
//           stem.id = particles.length + 1;

//           stem.growthCount = growthLimit - growthLimit / this.depth;
//           particles.push(stem);
//           this.up.push(stem);
//           break;
//         default:
//           console.log(`${this.id} of ${this.core.id} missing genes?`);
//       }

//       switch (
//         geneticPlan[2] // RIGHT slot
//       ) {
//         case 0:
//           this.right = ["nub"];
//           break;
//         case 2:
//           let leafR = new Plant(this.pos.x, this.pos.y);
//           leafR.core = this.core;
//           leafR.leaf = true;
//           leafR.down.push(this);
//           leafR.depth = this.depth;
//           leafR.vel = this.vel.copy();
//           leafR.vel.rotate(this.core.growthAngle / this.depth);
//           leafR.growing = true;
//           this.core.growingCount++;
//           leafR.id = particles.length + 1;
//           leafR.up = ["nub"];
//           leafR.right = ["nub"];
//           leafR.left = ["nub"];

//           leafR.growthCount = growthLimit - growthLimit / this.depth;
//           leafR.leafSize = this.leafSize - leafR.depth * 2;
//           leafR.color = this.core.leafColor;
//           particles.push(leafR);
//           this.right.push(leafR);
//           this.core.leafCount++;
//           break;
//         case 1:
//           let stemR = new Plant(this.pos.x, this.pos.y);
//           stemR.core = this.core;
//           stemR.stem = true;
//           stemR.down.push(this);
//           //   stemR.vel = this.vel;
//           stemR.vel.rotate(this.core.growthAngle / this.depth);
//           stemR.growing = true;
//           this.core.growingCount++;
//           stemR.id = particles.length + 1;
//           stemR.depth = this.depth + 1;
//           stemR.growthCount = growthLimit - growthLimit / this.depth;
//           particles.push(stemR);
//           this.right.push(stemR);
//           break;
//         default:
//           console.log(`${this.id} of ${this.core.id} missing genes?`);
//       }
//     }

//     // ORIGINAL
//     // //chance to grow
//     // if (this.growing) {
//     //   let roll = random();
//     //   if (roll < 0.01) {
//     //     // console.log("attempting to grow...");
//     //     this.grow();
//     //     // console.log("grew!");
//     //     // console.log(particles.length);
//     //   }
//     // }
//   }
// }

// class Seed extends Plant {
//   constructor(x, y) {
//     super(x, y);

//     //Plant ids
//     this.seed = true;
//     this.plant = true;
//     this.sand = false;
//     this.stone = false;
//     this.dirt = false;
//     this.water = false;
//     this.color = "GreenYellow";
//     this.falling = true; // seeds are falling

//     //Plant stats
//     this.depth = 1;
//     this.leafSize = 1;
//     this.growthCount = 0;

//     //genes
//     this.geneIterator = 0;
//     this.genes = random(genePool);
//     this.nodeLength = growthLimit;
//     this.growthAngle = growthAngle;
//     this.leafColor = random(leafColors);

//     // relations
//     this.up = []; // child node, up
//     this.left = []; // child node, left
//     this.right = []; // child node, right
//     this.down = []; // parent node
//     this.core = this; // organism core
//   }

//   update() {
//     super.update();
//     if (this.falling) {
//       this.smartFall();
//     }

//     //stop falling if can't move down
//     if (grid[this.pos.x][this.pos.y + 1].length !== 0) {
//       this.falling = false;
//     }
//   }
// }
