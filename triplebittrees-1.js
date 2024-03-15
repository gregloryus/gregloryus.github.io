let particles = [];
let scaleSize = 10; // Adjust for visibility
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  // Start with a single particle in the middle of the canvas, facing up
  let x = Math.floor(cols / 2);
  let y = Math.floor(rows / 2);
  particles.push(new Particle(x, y, "up")); // Initial seed facing up

  noLoop(); // Stop the draw loop
}

function draw() {
  background(0);

  // Show each particle
  particles.forEach((particle) => {
    particle.show();
  });
}

function mousePressed() {
  let newParticles = [];
  particles.forEach((particle) => {
    const growth = particle.tryGrow();
    growth.forEach((p) => newParticles.push(p));
  });

  particles = particles.concat(newParticles); // Add the new particles
  redraw(); // Update the drawing
}

class Particle {
  constructor(x, y, facing) {
    this.pos = createVector(x, y);
    this.facing = facing;

    // Assign a color based on facing direction
    switch (facing) {
      case "up":
        this.color = "rgb(255, 255, 0)"; // Yellow for up
        break;
      case "right":
        this.color = "rgb(255, 0, 0)"; // Red for right
        break;
      case "down":
        this.color = "rgb(0, 255, 0)"; // Green for down
        break;
      case "left":
        this.color = "rgb(0, 0, 255)"; // Blue for left
        break;
      default:
        this.color = "rgb(255, 255, 255)"; // White for unspecified
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

  tryGrow() {
    let growth = []; // Store new particles here
    // Directions based on orientation
    const directions = {
      up: [
        [-1, 0, "left"],
        [0, -1, "up"],
        [1, 0, "right"],
      ],
      right: [
        [0, -1, "up"],
        [1, 0, "right"],
        [0, 1, "down"],
      ],
      down: [
        [1, 0, "right"],
        [0, 1, "down"],
        [-1, 0, "left"],
      ],
      left: [
        [0, 1, "down"],
        [-1, 0, "left"],
        [0, -1, "up"],
      ],
    };

    directions[this.facing].forEach(([dx, dy, newFacing]) => {
      if (random() < 0.5) {
        // 50% chance to sprout a new child
        let newX = this.pos.x + dx;
        let newY = this.pos.y + dy;
        // Check if the new position is within the canvas bounds
        if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
          let existing = particles.some(
            (p) => p.pos.x === newX && p.pos.y === newY
          );
          if (!existing) {
            growth.push(new Particle(newX, newY, newFacing));
          }
        }
      }
    });

    return growth;
  }
}
