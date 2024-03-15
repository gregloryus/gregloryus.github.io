let particles = [];
let scaleSize = 16;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
let allowGrowth = false; // Flag to control growth on each click
let idCounter = 1;

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  // Initialize with a single particle in the center and make it visible
  console.log("Initializing with a single particle in the center.");
  addParticle(Math.floor(cols / 2), Math.floor(rows / 2), "up", true);
}

function draw() {
  background(0); // Clear the screen at the start of every draw call

  quadTree.clear();
  particles.forEach((particle) =>
    quadTree.addItem(particle.pos.x, particle.pos.y, particle)
  );

  if (allowGrowth) {
    console.log("Growth allowed, updating particles...");
    particles.forEach((particle) => particle.update());
    allowGrowth = false; // Reset flag after processing growth
  }

  particles.forEach((particle) => particle.show());
}

function mousePressed() {
  console.log("Mouse pressed, allowing growth.");
  allowGrowth = true; // Enable growth processing on the next draw cycle
}

function addParticle(x, y, facing, isLiveEdge) {
  if (isOccupied(x, y, undefined)) return; // Use undefined or a similar mechanism if needed

  let particle = new Particle(x, y, facing, isLiveEdge); // Pass the next available ID
  quadTree.addItem(x, y, particle); // Add to QuadTree for spatial tracking
  particles.push(particle); // Keep in particles array for rendering
}

class Particle {
  constructor(x, y, facing, isLiveEdge) {
    this.id = idCounter++;
    this.pos = { x, y };
    this.facing = facing;
    this.isLiveEdge = isLiveEdge;
    // Log the facing direction when a new particle is created
    console.log(
      `New particle created at (${x}, ${y}) with facing: ${facing}, ID: ${this.id}`
    );
    this.color = this.isLiveEdge ? "rgb(0, 255, 0)" : "rgb(0, 128, 0)";
  }

  update() {
    if (this.isLiveEdge) {
      this.tryGrow();
    }
  }

  show() {
    canvasContext.fillStyle = this.isLiveEdge
      ? "rgb(0, 255, 0)"
      : "rgb(0, 128, 0)";
    canvasContext.fillRect(
      this.pos.x * scaleSize,
      this.pos.y * scaleSize,
      scaleSize,
      scaleSize
    );
    let centerX = this.pos.x * scaleSize + scaleSize / 2;
    let centerY = this.pos.y * scaleSize + scaleSize / 2;
    canvasContext.save();
    canvasContext.translate(centerX, centerY);
    let rotationAngle = getRotationAngle(this.facing);
    canvasContext.rotate(rotationAngle);
    canvasContext.fillStyle = "red";
    canvasContext.font = `${scaleSize * 0.75}px Arial`;
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.fillText("A", 0, 0);
    canvasContext.restore();
  }

  tryGrow() {
    console.log(
      `Attempting to grow particle at (${this.pos.x}, ${this.pos.y}) facing ${this.facing}.`
    );
    const directions = getDirectionsByFacing(this.facing);

    // Correct the destructuring to match the object structure returned by getDirectionsByFacing
    directions.forEach((direction) => {
      // Remove array destructuring
      const { dx, dy, newFacing } = direction; // Destructure the object

      if (Math.random() < 0.5) {
        let newX = this.pos.x + dx;
        let newY = this.pos.y + dy;
        console.log(
          `Checking if new location (${newX}, ${newY}) is available for growth with facing: ${newFacing}.`
        );
        let occupied = isOccupied(newX, newY, this.id);
        if (!occupied) {
          console.log(
            `Location (${newX}, ${newY}) is not occupied. Adding new particle facing ${newFacing}.`
          );
          let particle = new Particle(newX, newY, newFacing, true); // Ensure the newFacing is correctly passed
          quadTree.addItem(newX, newY, particle);
          particles.push(particle);
        } else {
          console.log(`Location (${newX}, ${newY}) is occupied. No growth.`);
        }
      }
    });

    this.isLiveEdge = false;
  }
}

function isOccupied(x, y, excludingParticleId) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
  let items = quadTree.getItemsInRadius(
    x,
    y,
    3, // Adjusted PERCEPTION_RADIUS to be safely covering 3x3 grid.
    100 // Increased PERCEPTION_COUNT to ensure capturing all relevant items.
  );
  for (const item of items) {
    if (
      item &&
      item.id !== excludingParticleId &&
      (item.pos.x === x || item.pos.x === x + 1 || item.pos.x === x - 1) &&
      (item.pos.y === y || item.pos.y === y + 1 || item.pos.y === y - 1)
    ) {
      console.log(
        `HEY! Found an item (id: ${item.id}, vs. excluded id: ${excludingParticleId}) at (${item.pos.x}, ${item.pos.y}) near (${x}, ${y}) that is not the parent.`
      );
      return true;
    }
  }
  return false;
}

function getRotationAngle(facing) {
  switch (facing) {
    case "up":
      return 0; // No rotation
    case "right":
      return Math.PI / 2; // Rotate 90 degrees clockwise
    case "down":
      return Math.PI; // Rotate 180 degrees
    case "left":
      return -Math.PI / 2; // Rotate 90 degrees counter-clockwise
    default:
      return 0; // Default to no rotation if facing is undefined
  }
}

function getDirectionsByFacing(facing) {
  // Define the base directions for a particle facing "up"
  const baseDirections = [
    { dx: -1, dy: 0, newFacing: "left" }, // Grow to the left
    { dx: 0, dy: -1, newFacing: "up" }, // Grow upwards
    { dx: 1, dy: 0, newFacing: "right" }, // Grow to the right
  ];

  // Rotate the base directions based on the current facing
  switch (facing) {
    case "up":
      // No rotation needed
      return baseDirections;
    case "right":
      // Rotate 90 degrees clockwise
      return baseDirections.map((dir) => ({
        dx: dir.dy,
        dy: -dir.dx,
        newFacing: getNextFacing(dir.newFacing),
      }));
    case "down":
      // Rotate 180 degrees
      return baseDirections.map((dir) => ({
        dx: -dir.dx,
        dy: -dir.dy,
        newFacing: getNextFacing(getNextFacing(dir.newFacing)),
      }));
    case "left":
      // Rotate 270 degrees (or 90 degrees counter-clockwise)
      return baseDirections.map((dir) => ({
        dx: -dir.dy,
        dy: dir.dx,
        newFacing: getNextFacing(getNextFacing(getNextFacing(dir.newFacing))),
      }));
    default:
      console.log(`Unknown facing: ${facing}`);
      return []; // Should not happen
  }
}

// Helper function to get the next facing direction in a clockwise manner
function getNextFacing(facing) {
  switch (facing) {
    case "up":
      return "right";
    case "right":
      return "down";
    case "down":
      return "left";
    case "left":
      return "up";
    default:
      return facing; // Should not happen
  }
}
