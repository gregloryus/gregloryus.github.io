let particles = [];

let scaleSize = 10;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
console.log(cols, rows);

let fadeFactor = 100;
let idCounter = 0;
let numofStarterParticles = 3;
// let numofStarterParticles = Math.floor((cols * rows) / 10); // 10% of the grid
let perceptionRadius = 2;
let perceptionCount = 27;

// gravity is a vector pointing down
// let color1 = "rgb(132, 255, 201)";

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
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    // first check that the spot is not already occupied
    if (!isOccupied(x, y)) {
      particles.push(new Particle(x, y));
    }
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
  //   particles = shuffle(particles);
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
    // physical
    this.pos = createVector(x, y);
    this.allForces = [];
    this.netForce = createVector(0, 0);
    this.temp = 20;
    this.mass = 1;
    // technical
    this.id = idCounter++;
    this.r = 100;
    this.g = 0;
    this.b = 0;
    this.color = `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  interact() {
    for (const other of quadTree.getItemsInRadius(
      this.pos.x,
      this.pos.y,
      perceptionRadius,
      perceptionCount
    )) {
      if (other) {
        // interaction happens here
      }
    }
  }

  applyGravity() {
    // gravity is a vector pointing down
    let gravity = createVector(0, 0.1);
    this.allForces.push(gravity);
  }

  resolveForces() {
    this.netForce = createVector(0, 0);
    for (const force of this.allForces) {
      this.netForce.add(force);
    }
  }

  moveIfNextSpaceEmpty() {
    // Determine the direction based on the net force
    const direction = this.netForce.heading(); // Assuming p5.Vector.heading()
    const nextPos = createVector(this.pos.x, this.pos.y);

    // Determine next position based on the direction
    if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
      nextPos.x += 1;
    } else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
      nextPos.x += 1;
      nextPos.y += 1;
    } else if (
      direction >= (3 * Math.PI) / 8 &&
      direction < (5 * Math.PI) / 8
    ) {
      nextPos.y += 1;
    } else if (
      direction >= (5 * Math.PI) / 8 &&
      direction < (7 * Math.PI) / 8
    ) {
      nextPos.x -= 1;
      nextPos.y += 1;
    } else if (
      direction >= (7 * Math.PI) / 8 ||
      direction < (-7 * Math.PI) / 8
    ) {
      nextPos.x -= 1;
    } else if (
      direction >= (-7 * Math.PI) / 8 &&
      direction < (-5 * Math.PI) / 8
    ) {
      nextPos.x -= 1;
      nextPos.y -= 1;
    } else if (
      direction >= (-5 * Math.PI) / 8 &&
      direction < (-3 * Math.PI) / 8
    ) {
      nextPos.y -= 1;
    } else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
      nextPos.x += 1;
      nextPos.y -= 1;
    }

    // Check if next position is empty
    if (!isOccupied(nextPos.x, nextPos.y)) {
      this.pos = nextPos; // Move into the next position if it's empty
    }
  }

  //   isNextSpaceEmpty() {
  //     // Determine the direction based on the net force
  //     const direction = this.netForce.heading(); // Assuming p5.Vector.heading()
  //     const nextPos = createVector(this.pos.x, this.pos.y);

  //     // Right
  //     if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
  //       nextPos.x += 1;
  //     }
  //     // Down-Right
  //     else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
  //       nextPos.x += 1;
  //       nextPos.y += 1;
  //     }
  //     // Down
  //     else if (direction >= (3 * Math.PI) / 8 && direction < (5 * Math.PI) / 8) {
  //       nextPos.y += 1;
  //     }
  //     // Down-Left
  //     else if (direction >= (5 * Math.PI) / 8 && direction < (7 * Math.PI) / 8) {
  //       nextPos.x -= 1;
  //       nextPos.y += 1;
  //     }
  //     // Left
  //     else if (direction >= (7 * Math.PI) / 8 || direction < (-7 * Math.PI) / 8) {
  //       nextPos.x -= 1;
  //     }
  //     // Up-Left
  //     else if (
  //       direction >= (-7 * Math.PI) / 8 &&
  //       direction < (-5 * Math.PI) / 8
  //     ) {
  //       nextPos.x -= 1;
  //       nextPos.y -= 1;
  //     }
  //     // Up
  //     else if (
  //       direction >= (-5 * Math.PI) / 8 &&
  //       direction < (-3 * Math.PI) / 8
  //     ) {
  //       nextPos.y -= 1;
  //     }
  //     // Up-Right
  //     else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
  //       nextPos.x += 1;
  //       nextPos.y -= 1;
  //     }

  //     // Use the isOccupied function to check the next position
  //     let check = isOccupied(nextPos.x, nextPos.y);
  //     if (check) {
  //       //   console.log("occupied");
  //       return false;
  //     } else {
  //       //   console.log("not occupied");
  //       return true;
  //     }
  //   }

  //   moveIntoNextSpace() {
  //     // Determine the direction based on the net force
  //     const direction = this.netForce.heading(); // Assuming p5.Vector.heading()
  //     const nextPos = createVector(this.pos.x, this.pos.y);

  //     // Right
  //     if (direction >= -Math.PI / 8 && direction < Math.PI / 8) {
  //       nextPos.x += 1;
  //     }
  //     // Down-Right
  //     else if (direction >= Math.PI / 8 && direction < (3 * Math.PI) / 8) {
  //       nextPos.x += 1;
  //       nextPos.y += 1;
  //     }
  //     // Down
  //     else if (direction >= (3 * Math.PI) / 8 && direction < (5 * Math.PI) / 8) {
  //       nextPos.y += 1;
  //     }
  //     // Down-Left
  //     else if (direction >= (5 * Math.PI) / 8 && direction < (7 * Math.PI) / 8) {
  //       nextPos.x -= 1;
  //       nextPos.y += 1;
  //     }
  //     // Left
  //     else if (direction >= (7 * Math.PI) / 8 || direction < (-7 * Math.PI) / 8) {
  //       nextPos.x -= 1;
  //     }
  //     // Up-Left
  //     else if (
  //       direction >= (-7 * Math.PI) / 8 &&
  //       direction < (-5 * Math.PI) / 8
  //     ) {
  //       nextPos.x -= 1;
  //       nextPos.y -= 1;
  //     }
  //     // Up
  //     else if (
  //       direction >= (-5 * Math.PI) / 8 &&
  //       direction < (-3 * Math.PI) / 8
  //     ) {
  //       nextPos.y -= 1;
  //     }
  //     // Up-Right
  //     else if (direction >= (-3 * Math.PI) / 8 && direction < -Math.PI / 8) {
  //       nextPos.x += 1;
  //       nextPos.y -= 1;
  //     }

  //     // Move into the next position
  //     this.pos = nextPos;
  //   }

  update() {
    this.applyGravity();
    this.resolveForces();
    // if the next space is empty, move into the next space
    this.moveIfNextSpaceEmpty();
    // if (this.isNextSpaceEmpty()) {
    //   this.moveIntoNextSpace();
    // }
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

// // shuffles array in place
// function shuffle(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     let j = Math.floor(Math.random() * (i + 1));
//     // swap elements array[i] and array[j]
//     let temp = array[i];
//     array[i] = array[j];
//     array[j] = temp;
//   }
//   return array;
// }

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
