// constants
const GRID_SIZE = 100;
const PARTICLE_TYPES = {
  EMPTY: 0,
  WATER: 1,
  ROCK: 2,
};

// grid for the particles
let grid = [];

// setup function for p5.js
function setup() {
  let cnv = createCanvas(100, 100);
  pixelDensity(1);

  // disable smoothing
  const ctx = drawingContext;
  ctx.imageSmoothingEnabled = false;

  // initialize the grid
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = new Array(GRID_SIZE).fill(PARTICLE_TYPES.EMPTY);
  }

  // add initial rock and water particles...
  initializeRockPlatforms();
  initializeWaterParticles();
}

// draw function for p5.js
function draw() {
  background(0);
  updateWaterParticles();
  shiftRockParticles();

  // handle water movement and rock shifting logic...

  // draw particles
  loadPixels();
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const idx = 4 * (i + j * width);
      switch (grid[i][j]) {
        case PARTICLE_TYPES.EMPTY:
          pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 0; // black
          break;
        case PARTICLE_TYPES.WATER:
          pixels[idx] = 0;
          pixels[idx + 1] = 0;
          pixels[idx + 2] = 255; // blue
          break;
        case PARTICLE_TYPES.ROCK:
          pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 100; // gray
          break;
      }
      pixels[idx + 3] = 255; // alpha
    }
  }
  updatePixels();
}

function updateWaterParticles() {
  for (let i = GRID_SIZE - 2; i >= 0; i--) {
    // skip the bottom-most row
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[j][i] === PARTICLE_TYPES.WATER) {
        if (grid[j][i + 1] === PARTICLE_TYPES.EMPTY) {
          // down
          grid[j][i] = PARTICLE_TYPES.EMPTY;
          grid[j][i + 1] = PARTICLE_TYPES.WATER;
        } else if (j > 0 && grid[j - 1][i + 1] === PARTICLE_TYPES.EMPTY) {
          // down-left
          grid[j][i] = PARTICLE_TYPES.EMPTY;
          grid[j - 1][i + 1] = PARTICLE_TYPES.WATER;
        } else if (
          j < GRID_SIZE - 1 &&
          grid[j + 1][i + 1] === PARTICLE_TYPES.EMPTY
        ) {
          // down-right
          grid[j][i] = PARTICLE_TYPES.EMPTY;
          grid[j + 1][i + 1] = PARTICLE_TYPES.WATER;
        } else {
          // left or right
          let left = (j - 1 + GRID_SIZE) % GRID_SIZE;
          let right = (j + 1) % GRID_SIZE;
          if (grid[left][i] === PARTICLE_TYPES.EMPTY) {
            // left with wrap-around
            grid[j][i] = PARTICLE_TYPES.EMPTY;
            grid[left][i] = PARTICLE_TYPES.WATER;
          } else if (grid[right][i] === PARTICLE_TYPES.EMPTY) {
            // right with wrap-around
            grid[j][i] = PARTICLE_TYPES.EMPTY;
            grid[right][i] = PARTICLE_TYPES.WATER;
          }
        }
      }
    }
  }
}

// Revise the below code so that it only creates a horizontal line of rock particles (with a few gaps) on about 20% of the possible rows. The rock particles should be placed on the bottom 20% of the grid.

function initializeRockPlatforms() {
  // Start from the 80th row (bottom 20% of the grid)
  for (let i = GRID_SIZE - GRID_SIZE / 5; i < GRID_SIZE; i++) {
    // Decide to fill a row with rocks or not (about 20% chance)
    if (Math.random() < 0.2) {
      for (let j = 0; j < GRID_SIZE; j++) {
        grid[j][i] =
          Math.random() < 0.7 ? PARTICLE_TYPES.ROCK : PARTICLE_TYPES.EMPTY; // 90% rock, 10% gap
      }
    }
  }
}

function initializeWaterParticles() {
  for (let i = 0; i < GRID_SIZE / 5; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (Math.random() < 0.2) {
        // 20% chance to spawn a water particle
        grid[j][i] = PARTICLE_TYPES.WATER;
      }
    }
  }
}

function shiftRockParticles() {
  // check if there's any water in the top half
  let hasWaterInTopHalf = false;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE / 2; j++) {
      if (grid[i][j] === PARTICLE_TYPES.WATER) {
        hasWaterInTopHalf = true;
        break;
      }
    }
    if (hasWaterInTopHalf) break;
  }

  if (!hasWaterInTopHalf) {
    // Shift all particles up
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 1; j++) {
        grid[i][j] = grid[i][j + 1];
      }
    }

    // Add new row at the bottom with 20% chance of being a rock platform row
    for (let i = 0; i < GRID_SIZE; i++) {
      if (Math.random() < 0.2) {
        // 20% chance of rock platform row
        grid[i][GRID_SIZE - 1] =
          Math.random() < 0.9 ? PARTICLE_TYPES.ROCK : PARTICLE_TYPES.EMPTY; // 90% rock, 10% gap
      } else {
        grid[i][GRID_SIZE - 1] = PARTICLE_TYPES.EMPTY;
      }
    }
  }
}

// You'll need to fill in the missing parts with your own logic for water movement, rock platform shifting, and initial particle placement. I've only given a rough skeleton, and there's still a lot to do! The missing parts can be quite complex, depending on how realistic you want the simulation to be.
