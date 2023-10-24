let particles = [];

let scaleSize = 5;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 5;
let idCounter = 0;
let numofStarterParticles = Math.floor((cols * rows) / 10);
const randomColor = () => Math.floor(Math.random() * 256);
const randomRGB = () =>
  `rgb(${randomColor()}, ${randomColor()}, ${randomColor()})`;

const color1 = randomRGB();
const color2 = randomRGB();
const color3 = randomRGB();
const colorChoices = [color1, color2, color3];
// // let color1 = "rgb(132, 255, 201)";
// // let color2 = "rgb(170, 178, 255)";
// // let color3 = "rgb(236, 160, 255)";
// // let color1 = "DeepPink";
// // let color2 = "Yellow";
// let color3 = "Cyan";

// let colorChoices = [color1, color2, color3];

// let colorChoices = ["rgb(254, 33, 139)", "rgb(254, 215, 0)", "rgb(33,176,254)"];
let perceptionRadius = 2;
let perceptionCount = 27;
let frameCounter = 0;
let resetCounter = 0;
let frameInterval = 1;

p5.disableFriendlyErrors = true;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);

  // Add the canvas to the page
  p5canvas.parent("canvas-div");

  // Initialize native JS/HTML5 canvas object, since writing basic rectangles to it is faster than using p5
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");

  // Establishes quadtree (trying to divide width/height by scaleSize)
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));

  // Sets background to black
  background(0, 0, 0, 255);

  // Initializes any starter particle
  for (let i = 0; i < numofStarterParticles; i++) {
    let x = Math.floor(cols / 3 + (Math.random() * cols) / 3);
    let y = Math.floor(rows / 3 + (Math.random() * rows) / 3);
    let color = random(colorChoices);
    if (i > 0) {
      while (color === particles[i - 1].color) {
        color = random(colorChoices);
      }
    }
    particles.push(new Particle(x, y, color));
  }
}

function draw() {
  // Clears quadtree
  quadTree.clear();

  // Adds all particles to quadtree
  for (var particle of particles) {
    quadTree.addItem(particle.pos.x, particle.pos.y, particle);
  }

  // Sets background to black
  background(0, 0, 0, fadeFactor);

  // Have each particle calculates its next move based on the current grid
  for (var particle of particles) {
    particle.update();
  }
  // Show each particle on canvas
  for (var particle of particles) {
    particle.show();
  }
  // particles = shuffle(particles);

  frameCounter++;

  // Add particles one-by-one until desired number of particles is reached
  if (frameCounter % frameInterval == 0) {
    if (particles.length < numofStarterParticles) {
      let x = Math.floor(Math.random() * cols);
      let y = Math.floor(Math.random() * rows);
      let color = random(colorChoices);
      while (color == particles[particles.length - 1].color) {
        color = random(colorChoices);
      }
      particles.push(new Particle(x, y, color));
    }
  }

  // Check if all particles are the same color every 1000 frames
  if (particles.length == numofStarterParticles && frameCounter % 100 == 0) {
    let allSameColor = particles.every(
      (particle) => particle.color === particles[0].color
    );
    if (allSameColor) {
      // Reset scene with new conditions
      let dominantColor = particles[0].color;
      numofStarterParticles++;
      scaleSize--;
      if (scaleSize < 1) {
        scaleSize = 1;
      }
      resetScene(dominantColor);
      resetCounter++;
      console.log(`Scene reset ${resetCounter} times`);
    }
  }

  stroke(255, 255, 255, 255);
  fill(255, 0, 0, 0);
  text(
    `
      FPS: ${Math.floor(frameRate())}
      Particles: ${particles.length}
      `,
    (cols * scaleSize) / 2,
    (rows * scaleSize) / 20
  );
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
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.id = idCounter++;
    this.color = color;
  }

  move() {
    // Define movement directions and their probabilities
    const directions = [
      { dx: -1, dy: -1, prob: 0.1 }, // up-left
      { dx: 0, dy: -1, prob: 0.1 }, // up
      { dx: 1, dy: -1, prob: 0.1 }, // up-right
      { dx: -1, dy: 0, prob: 0.1 }, // left
      { dx: 0, dy: 0, prob: 0.1 }, // stay in place
      { dx: 1, dy: 0, prob: 0.1 }, // right
      { dx: -1, dy: 1, prob: 0.1 }, // down-left
      { dx: 0, dy: 1, prob: 0.1 }, // down
      { dx: 1, dy: 1, prob: 0.1 }, // down-right
    ];

    // Calculate total probability of all directions
    const totalProb = directions.reduce((acc, dir) => acc + dir.prob, 0);

    // Choose a random number between 0 and total probability
    const randomNum = Math.random() * totalProb;

    // Loop through directions to determine movement direction
    let probSum = 0;
    for (const dir of directions) {
      probSum += dir.prob;
      if (randomNum < probSum) {
        this.pos.x += dir.dx;
        this.pos.y += dir.dy;
        break;
      }
    }
  }

  interact() {
    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other) {
        if (other.id != this.id && other.color != this.color) {
          // console.log(`BEFORE this: ${this.color}, other: ${other.color}`);
          if (this.color == color1 && other.color == color2) {
            other.color = color1;
          } else if (this.color == color1 && other.color == color3) {
            this.color = color3;
          } else if (this.color == color3 && other.color == color1) {
            other.color = color3;
          } else if (this.color == color3 && other.color == color2) {
            this.color = color2;
          } else if (this.color == color2 && other.color == color3) {
            other.color = color2;
          } else if (this.color == color2 && other.color == color1) {
            this.color = color1;
          }
          // console.log(`AFTER this: ${this.color}, other: ${other.color}`);
        }
      }
    }
  }

  update() {
    this.interact();
    this.move();
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
    let newX = this.pos.x + x;
    let newY = this.pos.y + y;
    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
      this.pos.x = newX;
      this.pos.y = newY;
    }

    // this.pos.x = (cols + this.pos.x + x) % cols;
    // this.pos.y = (rows + this.pos.y + y) % rows;
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
}

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

// Resets the scene with new conditions
function resetScene(dominantColor) {
  particles = [];
  // numofStarterParticles *= 2; // double the number of particles
  // scaleSize = Math.ceil(scaleSize * 0.5); // decrease scaleSize by 10%, rounding up
  // scaleSize = Math.max(scaleSize, 1); // limit scaleSize at 1 and go no smaller

  particles.push(
    new Particle(Math.floor(cols / 2), Math.floor(rows / 2), dominantColor)
  );

  // for (let i = 1; i < numofStarterParticles; i++) {
  //   let x = Math.floor(Math.random() * cols);
  //   let y = Math.floor(Math.random() * rows);
  //   let color = random(colorChoices);
  //   while (color == particles[particles.length - 1].color) {
  //     color = random(colorChoices);
  //   }
  //   particles.push(new Particle(x, y, color));
  // }
  cols = Math.floor(window.innerWidth / scaleSize);
  rows = Math.floor(window.innerHeight / scaleSize);
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0, 0, 0, 255);
  console.log(
    `Scene reset with ${numofStarterParticles} particles and scaleSize ${scaleSize}`
  );
}
