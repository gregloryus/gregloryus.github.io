let particles = [];
let scaleSize = 4;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
let paused = true; // Start with the simulation paused

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  // Initialize with a single particle in the center
  addParticle(Math.floor(cols / 2), Math.floor(rows / 2), "up", true);
  noLoop();
}

function draw() {
  if (paused) return;
  quadTree.clear();
  particles.forEach((particle) =>
    quadTree.addItem(particle.pos.x, particle.pos.y, particle)
  );
  background(0, 0, 0, 100);
  particles.forEach((particle) => particle.update());
  particles.forEach((particle) => particle.show());
}

function mousePressed() {
  paused = false;
  loop();
}

function isOccupied(x, y) {
  return quadTree.getItemsInRadius(x, y, 0, 1).length > 0;
}

class Particle {
  constructor(x, y, facing, isLiveEdge) {
    this.pos = { x, y };
    this.facing = facing;
    this.isLiveEdge = isLiveEdge; // Indicates the particle is currently determining its offspring
    this.color = "rgb(0, 255, 0)"; // Light green for live edges
  }

  update() {
    if (this.isLiveEdge) {
      let newParticles = this.tryGrow();
      particles = particles.concat(newParticles);
      this.isLiveEdge = false; // No longer a live edge after determining offspring
    }
  }

  show() {
    this.color = this.isLiveEdge ? "rgb(0, 255, 0)" : "rgb(0, 128, 0)"; // Update color based on isLiveEdge
    canvasContext.fillStyle = this.color;
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
  }

  tryGrow() {
    let growth = [];
    const directions = getDirectionsByFacing(this.facing);

    directions.forEach(([dx, dy, newFacing]) => {
      if (Math.random() < 0.5) {
        // Coin flip for growth
        let newX = this.pos.x + dx;
        let newY = this.pos.y + dy;
        if (!isOccupied(newX, newY) && canGrowAt(newX, newY, this)) {
          growth.push(new Particle(newX, newY, newFacing, true));
        }
      }
    });

    return growth;
  }
}

function canGrowAt(x, y, parentParticle) {
  let neighbors = quadTree.getItemsInRadius(x, y, 1.5, 9); // Retrieves particles within the neighborhood
  let filteredNeighbors = neighbors.filter(
    (neighbor) =>
      neighbor.pos.x !== parentParticle.pos.x ||
      neighbor.pos.y !== parentParticle.pos.y
  );
  return filteredNeighbors.length === 0; // Growth allowed if no other particles in the neighborhood
}

function getDirectionsByFacing(facing) {
  switch (facing) {
    case "up":
      return [
        [-1, 0, "left"],
        [0, -1, "up"],
        [1, 0, "right"],
      ];
    case "right":
      return [
        [0, -1, "up"],
        [1, 0, "right"],
        [0, 1, "down"],
      ];
    case "down":
      return [
        [1, 0, "right"],
        [0, 1, "down"],
        [-1, 0, "left"],
      ];
    case "left":
      return [
        [0, 1, "down"],
        [-1, 0, "left"],
        [0, -1, "up"],
      ];
    default:
      return []; // Should not happen
  }
}

function addParticle(x, y, facing, isLiveEdge) {
  if (isOccupied(x, y)) return; // Prevent overlapping particles
  let particle = new Particle(x, y, facing, isLiveEdge);
  quadTree.addItem(x, y, particle); // Add to QuadTree for spatial tracking
  particles.push(particle); // Keep in particles array for rendering
}
