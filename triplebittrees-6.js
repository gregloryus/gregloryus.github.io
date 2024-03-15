let particles = [];
let scaleSize = 4;
let cols = Math.floor(window.innerWidth / scaleSize);
let rows = Math.floor(window.innerHeight / scaleSize);
let allowGrowth = false; // Flag to control growth on each click
let idCounter = 1;

let currentRecord = 100; // Assume this is the highest number of particles reached by any tree
let previousParticleCount = 0; // Number of particles in the last frame
let isWinner = false; // Flag to indicate if the current tree is a winner

let autoAdvanceInterval; // Declare outside setup to have wider scope

function setup() {
  let p5canvas = createCanvas(window.innerWidth, window.innerHeight);
  p5canvas.parent("canvas-div");
  let canvas = document.getElementById("defaultCanvas0");
  canvasContext = canvas.getContext("2d");
  quadTree = new QuadTree(Infinity, 30, new Rect(0, 0, cols + 1, rows + 1));
  background(0);

  // Initialize with a single particle in the center and make it visible
  console.log("Initializing with a single particle in the center.");
  addParticle(Math.floor(cols / 2), Math.floor(rows / 2), "north", true);

  autoAdvanceInterval = setInterval(() => {
    checkAndProcessTree(); // Perform checks and process the tree

    if (!isWinner && particles.length > 0) {
      // Ensure there's at least one particle to grow from
      allowGrowth = true; // Explicitly allow growth for the next cycle
      console.log("Auto-advancing simulation.");
    } else {
      console.log("Auto-advancement paused."); // This might be because isWinner is true or no particles exist
    }
  }, 50); // Adjust timing as needed
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

// function keyPressed() {
//   console.log("Mouse pressed, allowing growth.");
//   allowGrowth = true; // Enable growth processing on the next draw cycle
// }

function addParticle(x, y, facing, isLiveEdge) {
  // if (isOccupied(x, y, undefined)) return; // Use undefined or a similar mechanism if needed

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
      `Attempting to grow particle from (${this.pos.x}, ${this.pos.y}) facing ${this.facing}.`
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
        let occupied = isOccupied(newX, newY, this.id, newFacing); // Use newFacing here
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

function isOccupied(x, y, excludingParticleId, facing) {
  let offsets;
  switch (facing) {
    case "north":
      offsets = [
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
      ];
      break;
    case "east":
      offsets = [
        { dx: 0, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
      ];
      break;
    case "south":
      offsets = [
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
      ];
      break;
    case "west":
      offsets = [
        { dx: 0, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: -1 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: 1 },
      ];
      break;
    default:
      console.log(`Unknown facing direction: ${facing}`);
      return true;
  }

  for (const { dx, dy } of offsets) {
    let checkX = x + dx;
    let checkY = y + dy;
    if (checkX < 0 || checkX >= cols || checkY < 0 || checkY >= rows) continue;

    let items = quadTree.getItemsInRadius(checkX, checkY, 0.5, 10);
    for (const item of items) {
      if (item.id !== excludingParticleId) {
        console.log(
          `Occupied by another particle at (${checkX}, ${checkY}) excluding ID: ${excludingParticleId}`
        );
        return true;
      }
    }
  }

  console.log(`Location (${x}, ${y}) with facing ${facing} is not occupied.`);
  return false;
}

function getRotationAngle(facing) {
  switch (facing) {
    case "north":
      return 0; // No rotation
    case "east":
      return Math.PI / 2; // Rotate 90 degrees clockwise
    case "south":
      return Math.PI; // Rotate 180 degrees
    case "west":
      return -Math.PI / 2; // Rotate 90 degrees counter-clockwise
    default:
      return 0; // Default to no rotation if facing is undefined
  }
}

function getDirectionsByFacing(facing) {
  // This maps the "slot" (left/up/right) based on the parent's facing direction to a global facing direction (north/east/south/west)
  switch (facing) {
    case "north":
      return [
        { dx: -1, dy: 0, newFacing: "west" }, // Left slot -> West
        { dx: 0, dy: -1, newFacing: "north" }, // Up slot -> North
        { dx: 1, dy: 0, newFacing: "east" }, // Right slot -> East
      ];
    case "east":
      return [
        { dx: 0, dy: -1, newFacing: "north" }, // Left slot -> North
        { dx: 1, dy: 0, newFacing: "east" }, // Up slot -> East
        { dx: 0, dy: 1, newFacing: "south" }, // Right slot -> South
      ];
    case "south":
      return [
        { dx: 1, dy: 0, newFacing: "east" }, // Left slot -> East
        { dx: 0, dy: 1, newFacing: "south" }, // Up slot -> South
        { dx: -1, dy: 0, newFacing: "west" }, // Right slot -> West
      ];
    case "west":
      return [
        { dx: 0, dy: 1, newFacing: "south" }, // Left slot -> South
        { dx: -1, dy: 0, newFacing: "west" }, // Up slot -> West
        { dx: 0, dy: -1, newFacing: "north" }, // Right slot -> North
      ];
    default:
      console.log(`Unknown facing: ${facing}`);
      return []; // Should not happen
  }
}

// // Helper function to get the next facing direction in a clockwise manner
// function getNextFacing(facing) {
//   switch (facing) {
//     case "up":
//       return "right";
//     case "right":
//       return "down";
//     case "down":
//       return "left";
//     case "left":
//       return "up";
//     default:
//       return facing; // Should not happen
//   }
// }

// function mousePressed() {
//   console.log("Mouse pressed, toggling growth.");
//   toggleAutoAdvance(); // Use a toggle function to pause or resume auto-advancement
// }

function keyPressed() {
  console.log("Key pressed, restarting simulatino.");
  restartSimulation(); // Use a function to restart the simulation
}

function toggleAutoAdvance() {
  if (autoAdvanceInterval) {
    console.log("Pausing auto-advancement.");
    clearInterval(autoAdvanceInterval); // Pause the auto-advancement
    autoAdvanceInterval = null;
  } else {
    console.log("Resuming auto-advancement.");
    autoAdvanceInterval = setInterval(() => {
      if (allowGrowth) {
        console.log("Auto-advancing paused due to ongoing growth.");
      } else {
        console.log("Auto-advancing simulation.");
        allowGrowth = true;
      }
    }, 200); // Resume auto-advancement
  }
}

function restartSimulation() {
  console.clear(); // Clear the console for a fresh start
  console.log("Restarting the simulation.");
  particles = []; // Clear the existing particles
  quadTree.clear(); // Reset the QuadTree
  idCounter = 1; // Reset the ID counter
  allowGrowth = false; // Reset the growth flag
  addParticle(Math.floor(cols / 2), Math.floor(rows / 2), "north", true); // Add the initial particle
}

function checkAndProcessTree() {
  const currentParticleCount = particles.length;

  // Check if there's been any growth
  if (currentParticleCount === previousParticleCount) {
    // No growth since last check, assume the tree is mature
    const isMature = !particles.some((p) => p.isLiveEdge);
    if (isMature) {
      // Tree is mature, check if it meets or exceeds the current record
      if (currentParticleCount >= currentRecord) {
        // New record or equals, update currentRecord and mark as winner
        currentRecord = currentParticleCount;
        isWinner = true; // Update global flag indicating the tree is a winner
        console.log(
          "New record or equal to current record. Pausing auto-advancement."
        );
        // Implement any logic for winners here
      } else {
        // Not a record, not a winner
        isWinner = false; // Ensure isWinner is correctly reset
        console.log(
          "Mature tree does not meet the record. Continuing auto-advancement."
        );
        restartSimulation(); // Restart if not using a manual trigger
      }
    }
  } else {
    // Update previousParticleCount for the next cycle
    previousParticleCount = currentParticleCount;
  }

  // Optionally, call a function to manually trigger growth here if not relying on draw()'s loop
}
