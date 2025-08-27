// CONSTANTS
const CONSTANTS = {
  // World parameters
  WORLD: {
    WIDTH: 256, // Grid cells wide
    HEIGHT: 144, // Grid cells tall
    SCALE_SIZE: 3, // Size of each cell in pixels
    TICK_INTERVAL: 40, // Milliseconds between ticks in play mode
  },

  // Flux parameters
  FLUX: {
    P_SUN: 0.005, // Probability of sun spawning per claimed void per tick (dramatically slower)
    N_WATER_INITIAL: 50, // Initial number of water particles
    EVAPORATION_CHANCE: 0.001, // Water -> Vapor chance
    CONDENSATION_CHANCE: 0.01, // Vapor -> Water chance near other vapor
  },

  // Growth parameters
  GROWTH: {
    ENERGY_TO_GROW: 5, // Energy needed to grow
    GROWTH_COST: 3, // Energy consumed when growing
    MAX_ENERGY: 20, // Maximum energy a plant can store
  },

  // Visual parameters
  COLORS: {
    SUN: { r: 255, g: 255, b: 0, alpha: 0.8 },
    WATER: { r: 0, g: 100, b: 255, alpha: 0.8 },
    VAPOR: { r: 200, g: 255, b: 255, alpha: 0.6 },
    SEED: { r: 139, g: 69, b: 19, alpha: 1.0 },
    STEM: { r: 34, g: 139, b: 34, alpha: 1.0 },
    LEAF: { r: 0, g: 255, b: 0, alpha: 1.0 },
    FLOWER: { r: 255, g: 105, b: 180, alpha: 1.0 },
    SOIL: { r: 101, g: 67, b: 33, alpha: 1.0 },
  },

  // Genetics parameters
  GENETICS: {
    MUTATION_RATE: 0.1, // 10% chance of mutation per gene
    MUTATION_STRENGTH: 0.2, // How much genes can change (±20%)
    TRAIT_COUNT: 8, // Number of genetic traits
  },

  // Evolution parameters
  EVOLUTION: {
    REPRODUCTION_SUN: 25, // Sun energy needed to reproduce
    REPRODUCTION_WATER: 25, // Water energy needed to reproduce
    SEED_ENERGY: 8, // Energy given to each seed - enough to grow first stem and leaf
    MAX_SEEDS: 3, // Maximum seeds per reproduction
    LIFESPAN: 50000, // Maximum age before death (extremely long life)
  },
};

// Particle modes
const Mode = {
  SUN: "SUN",
  WATER: "WATER",
  VAPOR: "VAPOR",
  SEED: "SEED",
  STEM: "STEM",
  LEAF: "LEAF",
  FLOWER: "FLOWER",
  SOIL: "SOIL",
};

// Plant lifecycle stages
const PlantStage = {
  SEED: "SEED",
  GERMINATING: "GERMINATING",
  STEM_GROWTH: "STEM_GROWTH",
  LEAF_DEVELOPMENT: "LEAF_DEVELOPMENT",
  MATURE: "MATURE",
  FLOWERING: "FLOWERING",
  REPRODUCING: "REPRODUCING",
  DEAD: "DEAD",
};

// Global variables
let app, cellTextures, particles, occupancyGrid, scaleSize, idCounter;
let rows, cols, frame;
let fpsText, countText;
let paused = false; // Start unpaused by default
let tickInterval;

// Crown shyness - track claimed void cells by plant ID
let claimedCells = []; // Array to track which plant owns each void cell
let plantIdCounter = 1; // Separate counter for plant IDs

// Initialize global variables
idCounter = 1;
frame = 0;

// Simulation parameters
const NUM_INITIAL_WATER = 343; // Much more water for better distribution
const NUM_INITIAL_PLANTS = 5;

// Fast-forward settings
let fastForward = false;
let fastForwardFactor = 10;

document.addEventListener("DOMContentLoaded", async () => {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    clearBeforeRender: true,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Helper function to convert RGB values to hex
  function rgbToHex(r, g, b) {
    return (r << 16) + (g << 8) + b;
  }

  // Generate textures
  cellTextures = Object.entries(CONSTANTS.COLORS).reduce(
    (acc, [type, { r, g, b, alpha }]) => {
      const graphics = new PIXI.Graphics();
      const hexColor = rgbToHex(r, g, b);
      graphics.beginFill(hexColor, alpha);
      graphics.drawRect(0, 0, 1, 1);
      graphics.endFill();
      acc[type] = app.renderer.generateTexture(graphics);
      return acc;
    },
    {}
  );

  // Setup performance monitoring
  const textStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  fpsText = new PIXI.Text("Paused", textStyle);
  countText = new PIXI.Text("Cells: 0", textStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  countText.x = 10;
  countText.y = 40;
  app.stage.addChild(fpsText);
  app.stage.addChild(countText);

  // Core simulation parameters
  scaleSize = CONSTANTS.WORLD.SCALE_SIZE;
  cols = CONSTANTS.WORLD.WIDTH;
  rows = CONSTANTS.WORLD.HEIGHT;
  particles = [];

  // Initialize occupancy grid
  occupancyGrid = new OccupancyGrid(cols, rows);

  // Initialize claimed cells grid
  claimedCells = new Array(cols * rows).fill(null);

  // Initialize particles
  initializeSimulation();

  // Log world details
  console.log(`World initialized:
  - Dimensions: ${cols}x${rows} cells
  - Cell size: ${scaleSize}px
  - Initial water particles: ${NUM_INITIAL_WATER}
  - Initial plants: ${NUM_INITIAL_PLANTS}`);

  // Start simulation
  startMainLoop();
  fpsText.text = "Running";

  // Add event listeners
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      if (paused) {
        advanceTick();
      }
      e.preventDefault();
    }
    if (e.key === "p" || e.key === "P") {
      paused = !paused;
      fpsText.text = paused ? "Paused" : "Running";
    }
    if (e.key === "f" || e.key === "F") {
      fastForward = !fastForward;
    }
  });

  // Add click listener for debugging
  app.view.addEventListener("click", (e) => {
    const rect = app.view.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scaleSize);
    const y = Math.floor((e.clientY - rect.top) / scaleSize);

    const particle = occupancyGrid.get(x, y);
    if (particle) {
      console.log(`Particle at (${x},${y}):`, {
        mode: particle.mode,
        storedSun: particle.storedSun,
        storedWater: particle.storedWater,
        plantId: particle.plantId,
        id: particle.id,
      });
    } else {
      console.log(`Empty space at (${x},${y})`);
    }
  });
});

function initializeSimulation() {
  // Create initial water particles spread randomly across all unoccupied cells
  for (let i = 0; i < NUM_INITIAL_WATER; i++) {
    let attempts = 0;
    let x, y;

    do {
      x = Math.floor(Math.random() * cols);
      y = Math.floor(Math.random() * rows);
      attempts++;
    } while (occupancyGrid.isOccupied(x, y) && attempts < 100);

    if (attempts < 100) {
      const water = new Particle(x, y, Mode.WATER);
      particles.push(water);
      occupancyGrid.set(x, y, water);
    }
  }

  // Create initial seeds with random genetics - can be placed anywhere with empty space around them
  for (let i = 0; i < NUM_INITIAL_PLANTS; i++) {
    let attempts = 0;
    let x, y;

    do {
      x = Math.floor(Math.random() * cols);
      y = Math.floor(Math.random() * rows);
      attempts++;
    } while (
      (occupancyGrid.isOccupied(x, y) ||
        !occupancyGrid.isEmptyMooreNeighborhood(x, y)) &&
      attempts < 100
    );

    if (attempts < 100) {
      const seed = new Particle(x, y, Mode.SEED);
      seed.genetics = new PlantGenetics(); // Random first generation genetics
      seed.storedSun = CONSTANTS.EVOLUTION.SEED_ENERGY;
      seed.storedWater = CONSTANTS.EVOLUTION.SEED_ENERGY;
      particles.push(seed);
      occupancyGrid.set(x, y, seed);
    }
  }
}

function startMainLoop() {
  function mainLoop() {
    const updatesThisFrame = fastForward ? fastForwardFactor : 1;

    if (!paused) {
      for (let i = 0; i < updatesThisFrame; i++) {
        advanceTick();
      }
    }

    render();
    requestAnimationFrame(mainLoop);
  }

  mainLoop();
}

function advanceTick() {
  frame++;

  // Spawn sun particles
  spawnSunParticles();

  // Update all particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    if (particle && !particle.destroyed) {
      particle.update();
    }
  }

  // Remove destroyed particles
  particles = particles.filter((p) => !p.destroyed);
}

function spawnSunParticles() {
  // For each claimed void cell, check if it should spawn a sun particle
  for (let i = 0; i < claimedCells.length; i++) {
    const plantId = claimedCells[i];
    if (plantId !== null && Math.random() < CONSTANTS.FLUX.P_SUN) {
      const x = i % cols;
      const y = Math.floor(i / cols);

      // Make sure the cell is still void
      if (!occupancyGrid.get(x, y)) {
        const sun = new Particle(x, y, Mode.SUN);
        sun.targetPlantId = plantId;
        particles.push(sun);
        // Don't register sun in occupancy grid - it moves through cells
      }
    }
  }
}

function render() {
  const plantCount = particles.filter((p) =>
    [Mode.SEED, Mode.STEM, Mode.LEAF, Mode.FLOWER].includes(p.mode)
  ).length;
  countText.text = `Particles: ${particles.length} | Plants: ${plantCount} | Frame: ${frame}`;
  app.renderer.render(app.stage);
}

// Plant Genetics System
class PlantGenetics {
  constructor(parentA = null, parentB = null) {
    if (parentA && parentB) {
      // Sexual reproduction - combine traits from two parents
      this.traits = this.combineParents(parentA, parentB);
    } else if (parentA) {
      // Asexual reproduction - inherit from single parent
      this.traits = this.inheritFromParent(parentA);
    } else {
      // Random genesis - first generation
      this.traits = this.generateRandom();
    }

    // Apply mutations
    this.mutate();

    // Calculate fitness-based color
    this.calculateColor();
  }

  generateRandom() {
    return {
      growthSpeed: 0.5 + Math.random() * 0.5, // 0.5-1.0: How fast the plant grows
      energyEfficiency: 0.5 + Math.random() * 0.5, // 0.5-1.0: How efficiently it uses energy
      reproductionRate: 0.3 + Math.random() * 0.4, // 0.3-0.7: How quickly it reproduces
      leafCount: Math.floor(2 + Math.random() * 4), // 2-5: Number of leaves to grow
      stemHeight: Math.floor(3 + Math.random() * 5), // 3-7: Maximum stem height
      flowerSize: 0.5 + Math.random() * 0.5, // 0.5-1.0: Flower size affects seed count
      droughtTolerance: Math.random(), // 0-1: Tolerance to low water
      coldTolerance: Math.random(), // 0-1: Tolerance to harsh conditions
    };
  }

  inheritFromParent(parent) {
    return {
      growthSpeed: parent.traits.growthSpeed,
      energyEfficiency: parent.traits.energyEfficiency,
      reproductionRate: parent.traits.reproductionRate,
      leafCount: parent.traits.leafCount,
      stemHeight: parent.traits.stemHeight,
      flowerSize: parent.traits.flowerSize,
      droughtTolerance: parent.traits.droughtTolerance,
      coldTolerance: parent.traits.coldTolerance,
    };
  }

  combineParents(parentA, parentB) {
    // Simple genetic crossover - randomly pick traits from each parent
    return {
      growthSpeed:
        Math.random() < 0.5
          ? parentA.traits.growthSpeed
          : parentB.traits.growthSpeed,
      energyEfficiency:
        Math.random() < 0.5
          ? parentA.traits.energyEfficiency
          : parentB.traits.energyEfficiency,
      reproductionRate:
        Math.random() < 0.5
          ? parentA.traits.reproductionRate
          : parentB.traits.reproductionRate,
      leafCount:
        Math.random() < 0.5
          ? parentA.traits.leafCount
          : parentB.traits.leafCount,
      stemHeight:
        Math.random() < 0.5
          ? parentA.traits.stemHeight
          : parentB.traits.stemHeight,
      flowerSize:
        Math.random() < 0.5
          ? parentA.traits.flowerSize
          : parentB.traits.flowerSize,
      droughtTolerance:
        Math.random() < 0.5
          ? parentA.traits.droughtTolerance
          : parentB.traits.droughtTolerance,
      coldTolerance:
        Math.random() < 0.5
          ? parentA.traits.coldTolerance
          : parentB.traits.coldTolerance,
    };
  }

  mutate() {
    Object.keys(this.traits).forEach((trait) => {
      if (Math.random() < CONSTANTS.GENETICS.MUTATION_RATE) {
        const change =
          (Math.random() - 0.5) * 2 * CONSTANTS.GENETICS.MUTATION_STRENGTH;
        this.traits[trait] += change;

        // Clamp values to reasonable ranges
        if (trait === "leafCount" || trait === "stemHeight") {
          this.traits[trait] = Math.max(1, Math.floor(this.traits[trait]));
        } else {
          this.traits[trait] = Math.max(0.1, Math.min(1.0, this.traits[trait]));
        }
      }
    });
  }

  calculateColor() {
    // Calculate fitness score (higher is better)
    const fitness =
      (this.traits.growthSpeed +
        this.traits.energyEfficiency +
        this.traits.reproductionRate +
        this.traits.droughtTolerance +
        this.traits.coldTolerance) /
      5;

    // Color plants based on fitness - rare high-fitness plants get special colors
    if (fitness > 0.9) {
      this.color = { r: 255, g: 215, b: 0 }; // Gold for exceptional plants
    } else if (fitness > 0.8) {
      this.color = { r: 255, g: 165, b: 0 }; // Orange for high fitness
    } else if (fitness > 0.7) {
      this.color = { r: 0, g: 255, b: 0 }; // Bright green for good fitness
    } else {
      this.color = { r: 34, g: 139, b: 34 }; // Standard green for average fitness
    }
  }

  getFitness() {
    return (
      (this.traits.growthSpeed +
        this.traits.energyEfficiency +
        this.traits.reproductionRate +
        this.traits.droughtTolerance +
        this.traits.coldTolerance) /
      5
    );
  }
}

class OccupancyGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(cols * rows).fill(null);
  }

  getIndex(x, y) {
    return y * this.cols + x;
  }

  set(x, y, particle) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = particle;
    }
  }

  get(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      return this.grid[this.getIndex(x, y)];
    }
    return null;
  }

  remove(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = null;
    }
  }

  clear() {
    this.grid.fill(null);
  }

  isOccupied(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
    return this.get(x, y) !== null;
  }

  // Get all neighbors in radius (including empty spaces for energy calculation)
  getNeighborsInRadius(x, y, radius) {
    let neighbors = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          const particle = this.get(nx, ny);
          if (particle !== null) {
            neighbors.push(particle);
          }
        }
      }
    }
    return neighbors;
  }

  // Count empty cardinal neighbors (for energy collection)
  getCardinalEmptySpaces(x, y) {
    const cardinals = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    let emptySpaces = 0;
    cardinals.forEach(({ dx, dy }) => {
      const nx = x + dx,
        ny = y + dy;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        if (!this.get(nx, ny)) emptySpaces++;
      }
    });
    return emptySpaces;
  }

  // Check if all Moore neighborhood cells are empty
  isEmptyMooreNeighborhood(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        if (this.get(nx, ny)) return false;
      }
    }
    return true;
  }
}

// Evolutionary Angiosperm Particle class
class Particle {
  constructor(x, y, mode) {
    this.id = idCounter++;
    this.x = x;
    this.y = y;
    this.mode = mode;
    this.destroyed = false;
    this.energy = 0;
    this.plantId = null;
    this.targetPlantId = null;
    this.momentum = 0;
    this.age = 0;

    // Plant-specific properties
    this.genetics = null;
    this.plantStage = null;
    this.parentId = null;
    this.stemHeight = 0;
    this.leavesGrown = 0;
    this.reproductionCooldown = 0;
    this.bodyParts = []; // References to stem/leaf particles that belong to this plant
    this.storedSun = 0; // Separate sun energy storage
    this.storedWater = 0; // Separate water energy storage

    // Set up visual representation
    this.sprite = new PIXI.Sprite(cellTextures[mode]);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    this.sprite.scale.set(scaleSize, scaleSize);
    app.stage.addChild(this.sprite);

    // Initialize based on mode
    if (mode === Mode.SEED) {
      this.plantStage = PlantStage.SEED;
      this.plantId = plantIdCounter++;
    }
  }

  updatePlantColor() {
    // Update sprite color based on genetics if this is a plant part
    if (
      this.genetics &&
      [Mode.SEED, Mode.STEM, Mode.LEAF, Mode.FLOWER].includes(this.mode)
    ) {
      const color = this.genetics.color;
      this.sprite.tint = (color.r << 16) + (color.g << 8) + color.b;
    }
  }

  claimTerritory() {
    // Claim adjacent cells for crown shyness
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const { dx, dy } of directions) {
      const nx = this.x + dx;
      const ny = this.y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const index = ny * cols + nx;
        if (!occupancyGrid.get(nx, ny)) {
          claimedCells[index] = this.plantId;
        }
      }
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.sprite.parent) {
      app.stage.removeChild(this.sprite);
    }
    occupancyGrid.remove(this.x, this.y);

    // If this is a seed/main plant, destroy all body parts
    if (this.bodyParts && this.bodyParts.length > 0) {
      this.bodyParts.forEach((part) => {
        if (!part.destroyed) {
          part.destroy();
        }
      });
    }
  }

  moveTo(newX, newY) {
    occupancyGrid.remove(this.x, this.y);
    this.x = newX;
    this.y = newY;
    this.sprite.x = newX * scaleSize;
    this.sprite.y = newY * scaleSize;
    occupancyGrid.set(newX, newY, this);
  }

  update() {
    this.age++;

    switch (this.mode) {
      case Mode.WATER:
        this.updateWater();
        break;
      case Mode.SUN:
        this.updateSun();
        break;
      case Mode.VAPOR:
        this.updateVapor();
        break;
      case Mode.SEED:
        this.updateSeed();
        break;
      case Mode.STEM:
      case Mode.LEAF:
      case Mode.FLOWER:
        this.updatePlantPart();
        break;
      case Mode.SOIL:
        // Static
        break;
    }
  }

  updateWater() {
    // Water falls down, with momentum for fluid dynamics
    let moved = false;

    // 10% chance to move diagonally down instead of straight down
    const moveDirections = [];
    if (Math.random() < 0.1) {
      // Random diagonal movement - down-left or down-right
      const diagDir = Math.random() < 0.5 ? -1 : 1;
      moveDirections.push({ dx: diagDir, dy: 1 }); // Diagonal first
      moveDirections.push({ dx: 0, dy: 1 }); // Straight down as backup
    } else {
      // Normal downward movement
      moveDirections.push({ dx: 0, dy: 1 }); // Straight down first
      // Add diagonal options as backups
      if (this.momentum === -1) {
        moveDirections.push({ dx: -1, dy: 1 });
        moveDirections.push({ dx: 1, dy: 1 });
      } else if (this.momentum === 1) {
        moveDirections.push({ dx: 1, dy: 1 });
        moveDirections.push({ dx: -1, dy: 1 });
      } else {
        const randomDir = Math.random() < 0.5 ? -1 : 1;
        moveDirections.push({ dx: randomDir, dy: 1 });
        moveDirections.push({ dx: -randomDir, dy: 1 });
      }
    }

    // Try each movement direction with vertical torus topology
    for (const { dx, dy } of moveDirections) {
      const nextY = this.y + dy;
      const wrappedY = nextY >= rows ? 0 : nextY; // Wrap to top if at bottom
      const newX = this.x + dx;

      if (newX >= 0 && newX < cols && !occupancyGrid.get(newX, wrappedY)) {
        this.moveTo(newX, wrappedY);
        this.momentum = dx;
        moved = true;
        break;
      }
    }

    // If can't move down, try lateral movement
    if (!moved && this.momentum !== 0) {
      const newX = this.x + this.momentum;
      if (newX >= 0 && newX < cols && !occupancyGrid.get(newX, this.y)) {
        this.moveTo(newX, this.y);
        moved = true;
      }
    }

    // Check for absorption by plants
    this.checkWaterAbsorption();
  }

  checkWaterAbsorption() {
    // Check if we're in a claimed territory
    const index = this.y * cols + this.x;
    const plantId = claimedCells[index];

    if (plantId !== null) {
      // Find the seed/plant and give it water energy
      const plant = particles.find(
        (p) => p.plantId === plantId && p.mode === Mode.SEED
      );
      if (
        plant &&
        plant.genetics &&
        plant.storedWater < CONSTANTS.EVOLUTION.REPRODUCTION_WATER + 10
      ) {
        const waterValue = 1 * plant.genetics.traits.energyEfficiency;
        plant.storedWater += waterValue;
        this.destroy();
      }
    }
  }

  updateSun() {
    // Sun moves toward its target plant
    if (this.targetPlantId) {
      const targetPlant = particles.find(
        (p) => p.plantId === this.targetPlantId && p.mode === Mode.SEED
      );

      // If target plant no longer exists, destroy this sun particle
      if (!targetPlant) {
        this.destroy();
        return;
      }

      const dx = Math.sign(targetPlant.x - this.x);
      const dy = Math.sign(targetPlant.y - this.y);

      const newX = this.x + dx;
      const newY = this.y + dy;

      // Check if we hit any plant part
      const hitParticle = occupancyGrid.get(newX, newY);
      if (hitParticle && hitParticle.plantId === this.targetPlantId) {
        // Check if plant is oversaturated (has maximum sun energy)
        if (
          targetPlant.storedSun >=
          CONSTANTS.EVOLUTION.REPRODUCTION_SUN + 10
        ) {
          // Plant is oversaturated - create twinkling effect and destroy
          this.createTwinkleEffect();
          this.destroy();
          return;
        }

        // Give sun energy to the main seed/plant and trigger respiration
        if (targetPlant.genetics) {
          const sunValue = 1 * targetPlant.genetics.traits.energyEfficiency;
          targetPlant.storedSun += sunValue;

          // Trigger respiration if this sun hit a leaf
          if (hitParticle.mode === Mode.LEAF) {
            this.triggerRespiration(hitParticle);
          }
        }
        this.destroy();
        return;
      }

      // Check if we hit another plant (shadow effect)
      if (
        hitParticle &&
        [Mode.SEED, Mode.STEM, Mode.LEAF, Mode.FLOWER].includes(
          hitParticle.mode
        )
      ) {
        this.destroy();
        return;
      }

      // Move toward target
      if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
        this.x = newX;
        this.y = newY;
        this.sprite.x = newX * scaleSize;
        this.sprite.y = newY * scaleSize;
      } else {
        // Sun particle went out of bounds, destroy it
        this.destroy();
        return;
      }
    }

    // Age the sun particle and destroy if too old (prevents infinite buildup)
    if (this.age > 100) {
      this.destroy();
    }
  }

  createTwinkleEffect() {
    // Create a longer visual effect for oversaturated plants with opacity fade
    const twinkle = new PIXI.Graphics();
    twinkle.beginFill(0xffff00, 0.8); // Bright yellow
    twinkle.drawRect(0, 0, scaleSize, scaleSize);
    twinkle.endFill();
    twinkle.x = this.x * scaleSize;
    twinkle.y = this.y * scaleSize;

    app.stage.addChild(twinkle);

    // Fade out over 10 frames
    let frame = 0;
    const fadeInterval = setInterval(() => {
      frame++;
      const opacity = 0.8 * (1 - frame / 10); // Fade from 0.8 to 0
      twinkle.alpha = Math.max(0, opacity);

      if (frame >= 10) {
        clearInterval(fadeInterval);
        if (twinkle.parent) {
          app.stage.removeChild(twinkle);
        }
      }
    }, CONSTANTS.WORLD.TICK_INTERVAL);
  }

  triggerRespiration(leafParticle) {
    // Find the seed/plant that owns this leaf
    const plant = particles.find(
      (p) => p.plantId === leafParticle.plantId && p.mode === Mode.SEED
    );

    if (plant && plant.storedWater >= 1) {
      // Consume 1 water energy and emit vapor
      plant.storedWater -= 1;

      // Try to emit vapor in an adjacent empty space
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const nx = leafParticle.x + dx;
        const ny = leafParticle.y + dy;
        if (
          nx >= 0 &&
          nx < cols &&
          ny >= 0 &&
          ny < rows &&
          !occupancyGrid.get(nx, ny)
        ) {
          const vapor = new Particle(nx, ny, Mode.VAPOR);
          particles.push(vapor);
          break;
        }
      }
    }
  }

  updateVapor() {
    // Random walk with 2x upward bias
    const directions = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: -1 }, // Up (2x bias)
      { dx: 0, dy: 1 },
      { dx: 0, dy: 0 },
    ];

    const dir = directions[Math.floor(Math.random() * directions.length)];
    const newX = this.x + dir.dx;
    const newY = this.y + dir.dy;

    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
      this.x = newX;
      this.y = newY;
      this.sprite.x = newX * scaleSize;
      this.sprite.y = newY * scaleSize;
    }

    // Condense at top
    if (this.y <= 0) {
      const water = new Particle(this.x, 0, Mode.WATER);
      particles.push(water);
      occupancyGrid.set(this.x, 0, water);
      this.destroy();
    }
  }

  updateSeed() {
    // Seed lifecycle management
    if (this.age > CONSTANTS.EVOLUTION.LIFESPAN) {
      this.destroy();
      return;
    }

    switch (this.plantStage) {
      case PlantStage.SEED:
        if (
          this.storedSun >= 3 &&
          this.storedWater >= 3 &&
          occupancyGrid.isEmptyMooreNeighborhood(this.x, this.y)
        ) {
          this.plantStage = PlantStage.GERMINATING;
        }
        break;

      case PlantStage.GERMINATING:
        if (this.storedSun >= 3 && this.storedWater >= 3) {
          this.startStemGrowth();
        }
        break;

      case PlantStage.STEM_GROWTH:
        this.growStem();
        break;

      case PlantStage.LEAF_DEVELOPMENT:
        this.growLeaves();
        break;

      case PlantStage.MATURE:
        if (
          this.storedSun >= CONSTANTS.EVOLUTION.REPRODUCTION_SUN &&
          this.storedWater >= CONSTANTS.EVOLUTION.REPRODUCTION_WATER
        ) {
          this.plantStage = PlantStage.FLOWERING;
          this.createFlower();
        }
        break;

      case PlantStage.FLOWERING:
        this.reproductionCooldown--;
        if (this.reproductionCooldown <= 0) {
          this.reproduce();
        }
        break;
    }

    // Energy collection now handled by sun and water particle absorption
  }

  startStemGrowth() {
    this.plantStage = PlantStage.STEM_GROWTH;
    this.stemHeight = 0;
    this.claimTerritory();
  }

  growStem() {
    if (this.stemHeight >= this.genetics.traits.stemHeight) {
      this.plantStage = PlantStage.LEAF_DEVELOPMENT;
      this.leavesGrown = 0;
      return;
    }

    if (
      this.storedSun >= 1 &&
      this.storedWater >= 1 &&
      Math.random() < this.genetics.traits.growthSpeed * 0.2
    ) {
      const stemY = this.y - this.stemHeight - 1;

      if (stemY >= 0 && !occupancyGrid.get(this.x, stemY)) {
        const stem = new Particle(this.x, stemY, Mode.STEM);
        stem.genetics = this.genetics;
        stem.plantId = this.plantId;
        stem.parentId = this.id;
        stem.updatePlantColor();

        particles.push(stem);
        occupancyGrid.set(this.x, stemY, stem);
        this.bodyParts.push(stem);

        this.stemHeight++;
        this.storedSun -= 1;
        this.storedWater -= 1;

        // Extend territory from new stem position
        this.claimTerritoryAt(this.x, stemY);
      }
    }
  }

  growLeaves() {
    if (this.leavesGrown >= this.genetics.traits.leafCount) {
      this.plantStage = PlantStage.MATURE;
      return;
    }

    if (
      this.storedSun >= 1 &&
      this.storedWater >= 1 &&
      Math.random() < this.genetics.traits.growthSpeed * 0.25
    ) {
      // Place leaves alternately on left and right of stem
      const leafSide = this.leavesGrown % 2 === 0 ? -1 : 1;
      const stemLevel = Math.floor(this.leavesGrown / 2) + 1;
      const leafX = this.x + leafSide;
      const leafY = this.y - stemLevel;

      if (
        leafX >= 0 &&
        leafX < cols &&
        leafY >= 0 &&
        !occupancyGrid.get(leafX, leafY)
      ) {
        const leaf = new Particle(leafX, leafY, Mode.LEAF);
        leaf.genetics = this.genetics;
        leaf.plantId = this.plantId;
        leaf.parentId = this.id;
        leaf.updatePlantColor();

        particles.push(leaf);
        occupancyGrid.set(leafX, leafY, leaf);
        this.bodyParts.push(leaf);

        this.leavesGrown++;
        this.storedSun -= 1;
        this.storedWater -= 1;

        // Extend territory from new leaf position
        this.claimTerritoryAt(leafX, leafY);
      }
    }
  }

  createFlower() {
    const flowerY = this.y - this.stemHeight - 1;

    if (flowerY >= 0 && !occupancyGrid.get(this.x, flowerY)) {
      const flower = new Particle(this.x, flowerY, Mode.FLOWER);
      flower.genetics = this.genetics;
      flower.plantId = this.plantId;
      flower.parentId = this.id;
      flower.updatePlantColor();

      particles.push(flower);
      occupancyGrid.set(this.x, flowerY, flower);
      this.bodyParts.push(flower);

      this.reproductionCooldown = Math.floor(
        50 / this.genetics.traits.reproductionRate
      );
    }
  }

  reproduce() {
    const seedCount = Math.floor(
      this.genetics.traits.flowerSize * CONSTANTS.EVOLUTION.MAX_SEEDS
    );

    for (let i = 0; i < seedCount; i++) {
      // Try to place seeds nearby
      let attempts = 0;
      let seedX, seedY;

      do {
        const angle = Math.random() * 2 * Math.PI;
        const distance = 3 + Math.random() * 5;
        seedX = Math.floor(this.x + Math.cos(angle) * distance);
        seedY = Math.floor(this.y + Math.sin(angle) * distance);
        attempts++;
      } while (
        attempts < 20 &&
        (seedX < 0 ||
          seedX >= cols ||
          seedY < 0 ||
          seedY >= rows ||
          occupancyGrid.get(seedX, seedY))
      );

      if (attempts < 20) {
        const seed = new Particle(seedX, seedY, Mode.SEED);
        seed.genetics = new PlantGenetics(this.genetics); // Inherit with mutation
        seed.storedSun = CONSTANTS.EVOLUTION.SEED_ENERGY;
        seed.storedWater = CONSTANTS.EVOLUTION.SEED_ENERGY;
        seed.parentId = this.id;
        seed.updatePlantColor();

        particles.push(seed);
        occupancyGrid.set(seedX, seedY, seed);
      }
    }

    this.storedSun -= CONSTANTS.EVOLUTION.REPRODUCTION_SUN;
    this.storedWater -= CONSTANTS.EVOLUTION.REPRODUCTION_WATER;
    this.plantStage = PlantStage.MATURE; // Can reproduce again later
  }

  claimTerritoryAt(x, y) {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const index = ny * cols + nx;
        if (!occupancyGrid.get(nx, ny)) {
          claimedCells[index] = this.plantId;
        }
      }
    }
  }

  updatePlantPart() {
    // Plant parts don't do much on their own - they're managed by the seed
    // Respiration is now triggered by sun particles hitting leaves
  }
}

// Helper function for RGB to hex conversion
function rgbToHex(r, g, b) {
  return (r << 16) + (g << 8) + b;
}
