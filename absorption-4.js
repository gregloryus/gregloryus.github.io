// === SECTION 1: INITIALIZATION AND CONSTANTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size as per brief: 256x144 cells
  const GRID_WIDTH = 64;
  const GRID_HEIGHT = 64;
  const SCALE_SIZE = 8;

  const app = new PIXI.Application({
    width: GRID_WIDTH * SCALE_SIZE,
    height: GRID_HEIGHT * SCALE_SIZE,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // === CONSTANTS ===
  const CONSTANTS = {
    // World parameters
    WORLD: {
      SCALE_SIZE: SCALE_SIZE,
      TICK_INTERVAL: 40,
      COLS: GRID_WIDTH,
      ROWS: GRID_HEIGHT,
    },

    // Particle modes and transformations
    FLUX: {
      P_ENERGY: 0.08, // Increased from 0.05 to 0.08 (8% chance) for more frequent energy spawning
      WATER_DIAGONAL_CHANCE: 0.3,
    },

    // Plant genetics parameters
    GENETICS: {
      GROWTH_ENERGY_THRESHOLD: 8,
      MUTATION_RATE: 0.1,
      MUTATION_STRENGTH: 0.2,
    },

    // Growth parameters
    GROWTH: {
      ENERGY_TO_GROW: 5,
      GROWTH_COST: 3,
      MAX_ENERGY: 20,
    },

    // Simulation parameters
    SIMULATION: {
      INITIAL_WATER_COUNT: 400,
      INITIAL_SEED_COUNT: 1,
    },
  };

  // Colors and mode definitions
  const colors = {
    ENERGY: 0xffff00,
    WATER: 0x0066ff,
    VAPOR: 0xc8ffff,
    SEED: 0x8b4513,
    STEM: 0x228b22,
    LEAF: 0x00ff00,
    BUD: 0x90ee90, // Light green - visible but natural
    NODE: 0x14a014,
    FLOWER: 0xff69b4,
  };

  const modeTextures = Object.entries(colors).reduce((acc, [mode, color]) => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(color);
    graphics.drawRect(0, 0, 1, 1);
    graphics.endFill();
    acc[mode] = app.renderer.generateTexture(graphics);
    return acc;
  }, {});

  // Performance monitoring setup
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: "white",
  });
  const fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  const particleCountText = new PIXI.Text("Particles: 0", fpsTextStyle);
  particleCountText.x = 10;
  particleCountText.y = 40;
  app.stage.addChild(particleCountText);

  const fastForwardText = new PIXI.Text("", fpsTextStyle);
  fastForwardText.x = 10;
  fastForwardText.y = 70;
  app.stage.addChild(fastForwardText);

  const statusText = new PIXI.Text(
    "PAUSED - Press SPACE to step | R for report",
    fpsTextStyle
  );
  statusText.x = 10;
  statusText.y = 100;
  app.stage.addChild(statusText);

  // Core simulation parameters
  let particles = [];
  let frame = 0;
  let fastForward = false;
  let fastForwardFactor = 10;
  let paused = true; // Start paused for controlled study
  let lastRenderTime = performance.now();
  let idCounter = 1;

  // Grid setup with fixed dimensions
  let scaleSize = CONSTANTS.WORLD.SCALE_SIZE;
  let cols = CONSTANTS.WORLD.COLS;
  let rows = CONSTANTS.WORLD.ROWS;

  // Particle modes
  const Mode = {
    ENERGY: "ENERGY",
    WATER: "WATER",
    VAPOR: "VAPOR",
    SEED: "SEED",
    STEM: "STEM",
    LEAF: "LEAF",
    BUD: "BUD",
    NODE: "NODE",
    FLOWER: "FLOWER",
  };

  // === SECTION 2: LAYERED OCCUPANCY GRIDS ===
  class LayeredOccupancyGrid {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;

      // Separate layers for different particle types
      this.plantLayer = new Array(cols * rows).fill(null);
      this.waterLayer = new Array(cols * rows).fill(null);
      this.energyLayer = new Array(cols * rows).fill(null);

      // Visual overlays for water and energy
      this.waterOverlays = new Array(cols * rows).fill(null);
      this.energyOverlays = new Array(cols * rows).fill(null);
    }

    getIndex(x, y) {
      return y * this.cols + x;
    }

    // Plant layer methods
    setPlant(x, y, particle) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this.plantLayer[this.getIndex(x, y)] = particle;
      }
    }

    getPlant(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.plantLayer[this.getIndex(x, y)];
      }
      return null;
    }

    removePlant(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        this.plantLayer[this.getIndex(x, y)] = null;
      }
    }

    // Water layer methods
    setWater(x, y, particle = null) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);
        this.waterLayer[index] = particle;

        // Create/remove visual overlay
        if (particle && !this.waterOverlays[index]) {
          const overlay = new PIXI.Graphics();
          overlay.beginFill(0x0066ff, 0.2); // 20% alpha blue
          overlay.drawRect(0, 0, scaleSize, scaleSize);
          overlay.endFill();
          overlay.x = x * scaleSize;
          overlay.y = y * scaleSize;
          app.stage.addChild(overlay);
          this.waterOverlays[index] = overlay;
        } else if (!particle && this.waterOverlays[index]) {
          app.stage.removeChild(this.waterOverlays[index]);
          this.waterOverlays[index] = null;
        }
      }
    }

    getWater(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.waterLayer[this.getIndex(x, y)];
      }
      return null;
    }

    hasWater(x, y) {
      return this.getWater(x, y) !== null;
    }

    // Energy layer methods
    setEnergy(x, y, particle = null) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);

        // Check if this position has a seed - seeds can stack multiple energy particles
        const plantAtPosition = this.getPlant(x, y);
        if (
          particle &&
          this.energyLayer[index] !== null &&
          plantAtPosition &&
          plantAtPosition.mode === Mode.SEED
        ) {
          // Seeds allow energy stacking but keep the first energy accessible in the layer
          // This way buds can still pull energy from seeds via getEnergy()
          console.log(
            `⚡ Energy particle stacking on seed at (${x}, ${y}) - keeping first energy accessible`
          );
          // Don't overwrite the first energy particle in the layer - keep it accessible
          return;
        }

        this.energyLayer[index] = particle;

        // Create/remove visual overlay
        if (particle && !this.energyOverlays[index]) {
          const overlay = new PIXI.Graphics();
          overlay.beginFill(0xffff00, 0.1); // 10% alpha yellow (reduced as per requirements)
          overlay.drawRect(0, 0, scaleSize, scaleSize);
          overlay.endFill();
          overlay.x = x * scaleSize;
          overlay.y = y * scaleSize;
          app.stage.addChild(overlay);
          this.energyOverlays[index] = overlay;
        } else if (!particle && this.energyOverlays[index]) {
          app.stage.removeChild(this.energyOverlays[index]);
          this.energyOverlays[index] = null;
        }
      }
    }

    getEnergy(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.energyLayer[this.getIndex(x, y)];
      }
      return null;
    }

    hasEnergy(x, y) {
      return this.getEnergy(x, y) !== null;
    }

    // Check if plant layer is occupied (for movement/growth)
    isPlantOccupied(x, y) {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
      return this.getPlant(x, y) !== null;
    }

    // Moore neighborhood check for crown shyness
    isEmptyMooreNeighborhood(x, y) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
          if (this.getPlant(nx, ny)) return false;
        }
      }
      return true;
    }

    // Get plant neighbors for resource flow
    getPlantNeighbors(x, y) {
      let neighbors = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          let nx = x + dx,
            ny = y + dy;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            const plant = this.getPlant(nx, ny);
            if (plant !== null) {
              neighbors.push({ plant, x: nx, y: ny });
            }
          }
        }
      }
      return neighbors;
    }
  }

  let occupancyGrid = new LayeredOccupancyGrid(cols, rows);

  // Helper function to count plant cells for a given plant ID
  function countPlantCells(plantId) {
    return particles.filter((p) => p.isPlantPart() && p.plantId === plantId)
      .length;
  }

  // === SECTION 3: PLANT GENETICS SYSTEM ===
  class PlantGenetics {
    constructor(parentA = null, parentB = null) {
      if (parentA && parentB) {
        this.combineParents(parentA, parentB);
      } else if (parentA) {
        this.inheritFromParent(parentA);
      } else {
        this.generateRandom();
      }
    }

    generateRandom() {
      this.genes = {
        // Growth pattern
        internodeSpacing: 3 + Math.floor(Math.random() * 4), // 3-6
        budGrowthLimit: 8 + Math.floor(Math.random() * 8), // 8-15
        leafNodePattern: [1, 1, 0, 1], // Default phyllotaxis

        // Branching pattern
        branchingNodes: [5, 8], // Which nodes branch
        branchAngle: 45, // Angle of branches

        // Timing & thresholds
        leafDelay: 2, // Ticks before leaf buds activate
        floweringHeight: 8, // Height to start flowering
        energyThreshold: 8, // Energy needed for growth

        // Survival traits
        droughtTolerance: 0.5 + Math.random() * 0.5,
        coldTolerance: 0.5 + Math.random() * 0.5,
      };
    }

    inheritFromParent(parent) {
      this.genes = JSON.parse(JSON.stringify(parent.genes));
      this.mutate();
    }

    combineParents(parentA, parentB) {
      this.genes = {};
      Object.keys(parentA.genes).forEach((key) => {
        this.genes[key] =
          Math.random() < 0.5 ? parentA.genes[key] : parentB.genes[key];
      });
      this.mutate();
    }

    mutate() {
      if (Math.random() < CONSTANTS.GENETICS.MUTATION_RATE) {
        const keys = Object.keys(this.genes);
        const mutKey = keys[Math.floor(Math.random() * keys.length)];

        if (typeof this.genes[mutKey] === "number") {
          const change =
            (Math.random() - 0.5) * 2 * CONSTANTS.GENETICS.MUTATION_STRENGTH;
          this.genes[mutKey] = Math.max(1, this.genes[mutKey] * (1 + change));
        }
      }
    }

    calculateFitness() {
      // Fitness based on balanced traits
      const spacing = this.genes.internodeSpacing;
      const height = this.genes.budGrowthLimit;
      const energy = this.genes.energyThreshold;

      // Prefer intermediate values for most traits
      return (
        10 -
        Math.abs(spacing - 4) +
        (15 - Math.abs(height - 12)) +
        (10 - Math.abs(energy - 8))
      );
    }

    getColor() {
      const fitness = this.calculateFitness();
      if (fitness > 30) return 0xffd700; // Gold
      if (fitness > 25) return 0xffa500; // Orange
      if (fitness > 20) return 0x32cd32; // Lime green
      return 0x228b22; // Forest green
    }
  }

  // === SECTION 4: PARTICLE CLASS ===
  class Particle {
    constructor(x, y, mode = Mode.WATER) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = mode;
      this.age = 0;

      // Plant-specific properties
      this.plantId = null;
      this.genetics = null;
      this.parent = null;
      this.children = [];
      this.hasAttemptedSprout = false; // Flag to prevent spam logging
      this.hasAttemptedGrow = false; // Flag to prevent spam logging
      this.hasLoggedBlocked = false; // Flag to prevent spam logging
      this.hasLoggedGrowth = false; // Flag to prevent spam logging
      this.hasLoggedStemCreation = false; // Flag to prevent spam logging
      this.hasLoggedFirstRender = false; // Flag for first-time energy particle render
      this.hasLoggedNoGenetics = false; // Flag to prevent spam logging
      this.hasLoggedResourceCheck = false; // Flag to prevent spam logging
      this.hasLoggedAbsorption = false; // Flag to prevent repeated logs for water absorption

      // Movement properties (for flux particles)
      this.isFalling = true;
      this.fallingDirection = null;

      // Always create sprite
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);

      // Set plant particles to 50% alpha (painted first, resources painted over)
      if (this.isPlantPart()) {
        this.sprite.alpha = 0.5;
      }

      app.stage.addChild(this.sprite);

      // Log first-time energy particle creation
      if (this.mode === Mode.ENERGY && !this.hasLoggedFirstRender) {
        this.hasLoggedFirstRender = true;
      }

      // Create aura for energy particles (subtle visual feedback)
      if (this.mode === Mode.ENERGY && !this.auraSprite) {
        this.auraSprite = new PIXI.Graphics();
        this.auraSprite.beginFill(0xffff00, 0.05); // 5% alpha yellow aura (subtle)
        this.auraSprite.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        this.auraSprite.endFill();
        // Center the 3x3 aura on the energy particle
        this.auraSprite.x = (x - 1) * scaleSize;
        this.auraSprite.y = (y - 1) * scaleSize;
        app.stage.addChildAt(this.auraSprite, 0); // Add behind other sprites

        // Make energy particle itself 10% alpha (subtle)
        this.sprite.alpha = 0.1;
      }

      // Seeds will get bootstrap energy during initialization
      // No automatic energy creation in constructor

      // Set in appropriate occupancy grid layer
      if (this.isPlantPart()) {
        occupancyGrid.setPlant(x, y, this);
      } else if (this.mode === Mode.ENERGY) {
        // Register energy particles in energy layer
        occupancyGrid.setEnergy(x, y, this);
      } else if (this.mode === Mode.WATER) {
        // Register water particles in water layer
        occupancyGrid.setWater(x, y, this);
      }
    }

    isPlantPart() {
      return [
        Mode.SEED,
        Mode.STEM,
        Mode.LEAF,
        Mode.BUD,
        Mode.NODE,
        Mode.FLOWER,
      ].includes(this.mode);
    }

    setMode(mode) {
      if (this.mode !== mode) {
        const oldMode = this.mode;
        this.mode = mode;

        // Update sprite texture
        if (this.sprite) {
          this.sprite.texture = modeTextures[mode];

          // Update sprite color based on genetics for plant parts
          if (this.isPlantPart() && this.genetics) {
            const color = this.genetics.getColor();
            this.sprite.tint = color;
          }
        }

        // Handle occupancy grid changes
        if (this.isPlantPart() && !this.wasPlantPart(oldMode)) {
          occupancyGrid.setPlant(this.pos.x, this.pos.y, this);
        } else if (!this.isPlantPart() && this.wasPlantPart(oldMode)) {
          occupancyGrid.removePlant(this.pos.x, this.pos.y);
        }
      }
    }

    wasPlantPart(mode) {
      return [
        Mode.SEED,
        Mode.STEM,
        Mode.LEAF,
        Mode.BUD,
        Mode.NODE,
        Mode.FLOWER,
      ].includes(mode);
    }

    update() {
      this.age++;

      // Update based on mode
      if (this.mode === Mode.WATER) {
        this.updateWater();
      } else if (this.mode === Mode.ENERGY) {
        this.updateEnergy();
      } else if (this.mode === Mode.VAPOR) {
        this.updateVapor();
      } else if (this.mode === Mode.SEED) {
        this.updateSeed();
      } else if (this.mode === Mode.BUD) {
        this.updateBud();
      } else if (this.mode === Mode.FLOWER) {
        this.updateFlower();
        this.updatePlantPart(); // Also update energy visuals
      } else if (this.isPlantPart()) {
        // All other plant parts (STEM, LEAF, NODE)
        this.updatePlantPart();
      }
    }

    // === PARTICLE MOVEMENT METHODS ===
    moveRel(x, y) {
      // Handle vertical bounds (no wrapping - water accumulates at bottom)
      let newY = this.pos.y + y;
      if (newY < 0) {
        newY = 0;
      } else if (newY >= rows) {
        newY = rows - 1;
      }

      // Handle horizontal bounds (closed edges)
      let newX = this.pos.x + x;
      if (newX < 0 || newX >= cols) {
        return false; // Can't move outside horizontal bounds
      }

      // Update position
      this.pos.x = newX;
      this.pos.y = newY;

      // Update sprite position
      if (this.sprite) {
        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);
      }

      // Update occupancy grid for all particle types
      if (this.isPlantPart()) {
        occupancyGrid.removePlant(this.pos.x - x, this.pos.y - y);
        occupancyGrid.setPlant(this.pos.x, this.pos.y, this);
      } else if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(this.pos.x - x, this.pos.y - y, null);
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, this);
      } else if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(this.pos.x - x, this.pos.y - y, null);
        occupancyGrid.setWater(this.pos.x, this.pos.y, this);
      }

      return true;
    }

    // === VISUAL OVERLAY METHODS ===
    createWaterOverlay() {
      // Only create overlay for water particles absorbed by plants
      if (this.mode !== Mode.WATER) return;

      // Create 20% alpha blue overlay for the water particle
      if (!this.waterOverlay) {
        this.waterOverlay = new PIXI.Graphics();
        this.waterOverlay.beginFill(0x0066ff, 0.2); // 20% alpha blue
        this.waterOverlay.drawRect(0, 0, scaleSize, scaleSize);
        this.waterOverlay.endFill();
        this.waterOverlay.x = this.pos.x * scaleSize;
        this.waterOverlay.y = this.pos.y * scaleSize;
        app.stage.addChild(this.waterOverlay); // Add on top of plant
      }

      // Create 10% alpha 3x3 aura for absorbed water
      if (!this.waterAura) {
        this.waterAura = new PIXI.Graphics();
        this.waterAura.beginFill(0x0066ff, 0.1); // 10% alpha blue aura
        this.waterAura.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        this.waterAura.endFill();
        // Center the 3x3 aura on the water particle
        this.waterAura.x = (this.pos.x - 1) * scaleSize;
        this.waterAura.y = (this.pos.y - 1) * scaleSize;
        app.stage.addChildAt(this.waterAura, 0); // Add behind other sprites
      }
    }

    updateWaterOverlay() {
      // Update water overlay position when water flows through plant
      if (this.waterOverlay) {
        this.waterOverlay.x = this.pos.x * scaleSize;
        this.waterOverlay.y = this.pos.y * scaleSize;
      }
      if (this.waterAura) {
        this.waterAura.x = (this.pos.x - 1) * scaleSize;
        this.waterAura.y = (this.pos.y - 1) * scaleSize;
      }
    }

    // === FLUX PARTICLE UPDATES ===
    // Helper method for simple collision detection (borrowed from monochromagic)
    isPositionOccupied(x, y) {
      // Check bounds
      if (x < 0 || x >= cols || y < 0 || y >= rows) return true;

      // Check if there's a plant at this position
      if (occupancyGrid.isPlantOccupied(x, y)) return true;

      // Check if there's already another water particle at this position
      for (const particle of particles) {
        if (
          particle !== this &&
          particle.mode === Mode.WATER &&
          particle.pos.x === x &&
          particle.pos.y === y
        ) {
          return true;
        }
      }

      // For energy particles, check for collision but allow stacking on seeds
      if (this.mode === Mode.ENERGY) {
        // Check if there's already another energy particle at this position
        for (const particle of particles) {
          if (
            particle !== this &&
            particle.mode === Mode.ENERGY &&
            particle.pos.x === x &&
            particle.pos.y === y
          ) {
            // Check if this position has a seed - seeds allow energy stacking
            const plantAtPosition = occupancyGrid.getPlant(x, y);
            if (plantAtPosition && plantAtPosition.mode === Mode.SEED) {
              return false; // Allow stacking on seeds
            }

            return true; // Block stacking on non-seed positions
          }
        }
      }

      return false;
    }

    updateWater() {
      // Simplified water physics borrowed from monochromagic-12.js
      if (this.isFalling && this.pos.y < rows - 1) {
        // Try to move down first
        if (!this.isPositionOccupied(this.pos.x, this.pos.y + 1)) {
          this.moveRel(0, 1);
          this.fallingDirection = null; // Reset falling direction when moving down
        } else {
          // Can't move down, try diagonal/lateral movement
          if (this.fallingDirection === null) {
            // Randomly choose a falling direction if none has been set
            this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
          }

          if (this.fallingDirection === "left") {
            // Try down-left first
            if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y + 1)) {
              this.moveRel(-1, 1);
            } else if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y)) {
              // Try left
              this.moveRel(-1, 0);
            } else {
              // Switch direction if it cannot move left
              this.fallingDirection = "right";
            }
          } else {
            // fallingDirection === 'right'
            // Try down-right first
            if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y + 1)) {
              this.moveRel(1, 1);
            } else if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y)) {
              // Try right
              this.moveRel(1, 0);
            } else {
              // Switch direction if it cannot move right
              this.fallingDirection = "left";
            }
          }
        }
      } else if (this.pos.y >= rows - 1) {
        // At bottom, stop falling
        this.isFalling = false;
      }

      // STRICT RULE: Only SEED cells can absorb water from falling particles (root uptake)
      // Water particles should NOT be absorbed by buds, stems, or leaves directly
      const plant = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (plant && plant.plantId && plant.mode === Mode.SEED) {
        // Only seeds can absorb water - check if seed already has water
        const alreadyHasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

        if (!alreadyHasWater) {
          // Seed can absorb this water particle (root uptake)
          occupancyGrid.setWater(this.pos.x, this.pos.y, this);
          this.sprite.visible = false; // Hide the particle sprite
          this.isFalling = false;

          // Create visual overlay for absorbed water
          this.createWaterOverlay();

          console.log(
            `💧 Water absorbed by SEED (root uptake) at (${this.pos.x}, ${this.pos.y})`
          );

          // Start water flow UP through the plant
          plant.tryFlowWater();
        }
        // If seed already has water, water particle continues falling (can't absorb more)
      }
    }

    updateEnergy() {
      // PHYSICAL RULE: Energy bound to plant matter is stable (like electrons in stable orbits)
      // Only energy in empty space ages and decays
      const plantAtPosition = occupancyGrid.getPlant(this.pos.x, this.pos.y);

      // If energy is attached to plant matter, it's stable - no aging, no decay
      // Seeds are special case - they don't need plantId to hold energy
      if (
        plantAtPosition &&
        (plantAtPosition.plantId || plantAtPosition.mode === Mode.SEED)
      ) {
        // Energy is physically bound to plant matter - completely stable
        return;
      }

      // Energy is in empty space - proceed with normal absorption logic

      // Check if energy is adjacent to a leaf that can photosynthesize
      const adjacentLeaves = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip center position
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const plant = occupancyGrid.getPlant(nx, ny);
            if (plant && plant.plantId && plant.mode === Mode.LEAF) {
              const hasWater = occupancyGrid.hasWater(nx, ny);
              // Only absorb if leaf itself has space - let flow system handle saturation
              if (hasWater && !occupancyGrid.hasEnergy(nx, ny)) {
                adjacentLeaves.push({ plant, x: nx, y: ny });
              }
              // If leaf already has energy, it can't absorb more (natural saturation)
            }
          }
        }
      }

      // Energy is in empty space - check for adjacent absorption by leaves
      if (adjacentLeaves.length > 0) {
        // Pick the first available leaf for absorption
        const { plant: leaf, x: leafX, y: leafY } = adjacentLeaves[0];

        // Move this energy particle from its current position to the leaf cell
        const oldX = this.pos.x;
        const oldY = this.pos.y;
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        occupancyGrid.setEnergy(leafX, leafY, this);

        // Update particle position and sprite
        this.pos.x = leafX;
        this.pos.y = leafY;
        this.sprite.x = leafX * scaleSize;
        this.sprite.y = leafY * scaleSize;
        if (this.auraSprite) {
          this.auraSprite.x = (leafX - 1) * scaleSize;
          this.auraSprite.y = (leafY - 1) * scaleSize;
        }

        console.log(
          `⚡ Energy absorbed by leaf: moved from (${oldX}, ${oldY}) to (${leafX}, ${leafY})`
        );

        // RESPIRATION: Create vapor when energy is stored in leaf
        // Reduced frequency: only 30% chance to create vapor
        const waterParticle = occupancyGrid.getWater(leafX, leafY);
        if (waterParticle && Math.random() < 0.3) {
          // Remove water and create vapor at leaf position
          occupancyGrid.setWater(leafX, leafY, null);

          // Create vapor particle at leaf position
          const vapor = new Particle(leafX, leafY, Mode.VAPOR);
          particles.push(vapor);

          // Remove water particle from the simulation
          if (waterParticle && waterParticle.destroy) {
            waterParticle.destroy();
          }
        }

        // Try to flow energy down the plant after storage
        try {
          const flowSuccessful = leaf.tryFlowEnergy(new Set());

          // If flow failed, the plant is saturated - start twinkling excess energy
          if (!flowSuccessful && this.twinkleCountdown === undefined) {
            this.twinkleCountdown = 30; // Twinkle for 30 frames (~1 second at 30fps)
          }
        } catch (error) {
          // Silent error handling
        }

        // Energy particle has been moved into leaf - don't destroy it, just return
        return;
      }

      // Energy particle not absorbed - check for twinkling (saturation effect)
      if (this.twinkleCountdown !== undefined) {
        this.twinkleCountdown--;

        // Create twinkling effect by changing opacity
        if (this.sprite) {
          this.sprite.alpha = Math.max(0.1, this.twinkleCountdown / 30);
        }
        if (this.auraSprite) {
          this.auraSprite.alpha = Math.max(
            0.01,
            (this.twinkleCountdown / 30) * 0.3
          );
        }

        // Fade out completely
        if (this.twinkleCountdown <= 0) {
          this.destroy();
        }
      } else {
        // If energy has been sitting unused for too long, start twinkling
        if (!this.unusedFrames) this.unusedFrames = 0;
        this.unusedFrames++;

        // Faster twinkling for immediate visual feedback when plants are saturated
        if (this.unusedFrames > 20) {
          // Reduced from 60 to 20 frames (about 0.7 seconds)
          this.twinkleCountdown = 45; // Longer twinkle duration for more beautiful effect
        }
      }
    }

    // === LOCAL SATURATION FLOW SYSTEM ===

    tryFlowEnergy(visitedCells = new Set()) {
      // PHYSICAL RULE: Seeds are energy wells - energy sticks to them like magnetic attraction
      // Energy only flows OUT of seeds when actively pulled by growing buds
      if (this.mode === Mode.SEED) {
        return false; // Seeds hold onto their energy
      }

      // Prevent infinite recursion
      const cellKey = `${this.pos.x},${this.pos.y}`;
      if (visitedCells.has(cellKey)) return false;
      visitedCells.add(cellKey);

      // Only flow if this cell has an energy particle
      if (!occupancyGrid.hasEnergy(this.pos.x, this.pos.y)) {
        return false;
      }

      // Get the energy particle at this position
      const energyParticle = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
      if (!energyParticle) return false;

      // QUICK FIX: Buds hold onto energy for a few frames before flowing
      if (this.mode === Mode.BUD) {
        if (!energyParticle.budHoldTime) {
          energyParticle.budHoldTime = 0;
        }
        energyParticle.budHoldTime++;

        // Hold energy for at least 3 frames to allow growth check
        if (energyParticle.budHoldTime < 3) {
          return false;
        }
      }

      // Energy flows DOWNWARD: preferentially toward the seed (bottom-up saturation)
      const neighbors = this.getEnergyFlowNeighbors();

      for (const neighbor of neighbors) {
        if (!occupancyGrid.hasEnergy(neighbor.x, neighbor.y)) {
          // Found empty space - flow energy there
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
          occupancyGrid.setEnergy(neighbor.x, neighbor.y, energyParticle);

          // Update energy particle position and aura
          energyParticle.pos.x = neighbor.x;
          energyParticle.pos.y = neighbor.y;
          energyParticle.sprite.x = neighbor.x * scaleSize;
          energyParticle.sprite.y = neighbor.y * scaleSize;
          if (energyParticle.auraSprite) {
            energyParticle.auraSprite.x = (neighbor.x - 1) * scaleSize;
            energyParticle.auraSprite.y = (neighbor.y - 1) * scaleSize;
          }

          console.log(
            `⚡ Energy flowed from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) in plant ${this.plantId}`
          );

          // Try to continue flowing from the new position
          neighbor.plant.tryFlowEnergy(visitedCells);
          return true;
        } else {
          // Neighbor has energy - ask it to try shifting first
          if (neighbor.plant.tryFlowEnergy(visitedCells)) {
            // Neighbor made space - now we can flow there
            if (!occupancyGrid.hasEnergy(neighbor.x, neighbor.y)) {
              occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
              occupancyGrid.setEnergy(neighbor.x, neighbor.y, energyParticle);

              // Update energy particle position and aura
              energyParticle.pos.x = neighbor.x;
              energyParticle.pos.y = neighbor.y;
              energyParticle.sprite.x = neighbor.x * scaleSize;
              energyParticle.sprite.y = neighbor.y * scaleSize;
              if (energyParticle.auraSprite) {
                energyParticle.auraSprite.x = (neighbor.x - 1) * scaleSize;
                energyParticle.auraSprite.y = (neighbor.y - 1) * scaleSize;
              }

              console.log(
                `⚡ Energy shifted from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) in plant ${this.plantId}`
              );
              return true;
            }
          }
        }
      }

      // No flow possible (log removed to reduce spam)
      return false; // No flow possible - locally saturated
    }

    tryFlowWater(visitedCells = new Set()) {
      // Prevent infinite recursion
      const cellKey = `${this.pos.x},${this.pos.y}`;
      if (visitedCells.has(cellKey)) return false;
      visitedCells.add(cellKey);

      // Only flow if this cell has water
      if (!occupancyGrid.hasWater(this.pos.x, this.pos.y)) return false;

      // Get the water particle at this position
      const waterParticle = occupancyGrid.getWater(this.pos.x, this.pos.y);

      // Water flows UPWARD: from parent to children only (seed pushes water up to extremities)
      const neighbors = this.getWaterFlowNeighbors();

      for (const neighbor of neighbors) {
        if (!occupancyGrid.hasWater(neighbor.x, neighbor.y)) {
          // Found empty space - flow water there
          occupancyGrid.setWater(this.pos.x, this.pos.y, null);
          occupancyGrid.setWater(neighbor.x, neighbor.y, waterParticle);

          // Update water particle position and overlays
          waterParticle.pos.x = neighbor.x;
          waterParticle.pos.y = neighbor.y;
          waterParticle.isFalling = false; // Stop water from falling when in plant system
          waterParticle.updateWaterOverlay();

          console.log(
            `💧 Water flowed from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) in plant ${this.plantId}`
          );

          // Try to continue flowing from the new position
          neighbor.plant.tryFlowWater(visitedCells);
          return true;
        } else {
          // Neighbor has water - ask it to try shifting first
          if (neighbor.plant.tryFlowWater(visitedCells)) {
            // Neighbor made space - now we can flow there
            occupancyGrid.setWater(this.pos.x, this.pos.y, null);
            occupancyGrid.setWater(neighbor.x, neighbor.y, waterParticle);

            // Update water particle position and overlays
            waterParticle.pos.x = neighbor.x;
            waterParticle.pos.y = neighbor.y;
            waterParticle.isFalling = false; // Stop water from falling when in plant system
            waterParticle.updateWaterOverlay();

            console.log(
              `💧 Water shifted from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) in plant ${this.plantId}`
            );
            return true;
          }
        }
      }

      return false; // No flow possible - locally saturated
    }

    getWaterFlowNeighbors() {
      // Water flows UPWARD: only to children (from root to extremities)
      let neighbors = [];

      // Add children (if any) - water flows UP
      if (this.children) {
        for (const child of this.children) {
          if (child.isPlantPart && child.isPlantPart()) {
            neighbors.push({
              x: child.pos.x,
              y: child.pos.y,
              plant: child,
            });
          }
        }
      }

      // Add adjacent plant cells from same plant that are higher (lower y value)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && ny < this.pos.y) {
            // Only flow to higher positions
            const plant = occupancyGrid.getPlant(nx, ny);
            if (plant && plant.plantId === this.plantId) {
              // Only add if not already in neighbors (avoid duplicates)
              const exists = neighbors.some((n) => n.x === nx && n.y === ny);
              if (!exists) {
                neighbors.push({ x: nx, y: ny, plant });
              }
            }
          }
        }
      }

      return neighbors;
    }

    getEnergyFlowNeighbors() {
      // Energy flows DOWNWARD: preferentially toward the seed (bottom-up saturation)
      // Priority order: parent (toward root) first, then children if parent saturated
      let neighbors = [];

      // FIRST PRIORITY: Flow to parent (toward seed/root)
      if (this.parent && this.parent.isPlantPart && this.parent.isPlantPart()) {
        neighbors.push({
          x: this.parent.pos.x,
          y: this.parent.pos.y,
          plant: this.parent,
          priority: 1, // Highest priority - toward root
        });
      }

      // SECOND PRIORITY: Flow to children (away from root) only if needed
      if (this.children) {
        for (const child of this.children) {
          if (child && child.isPlantPart && child.isPlantPart()) {
            neighbors.push({
              x: child.pos.x,
              y: child.pos.y,
              plant: child,
              priority: 2, // Lower priority - away from root
            });
          }
        }
      }

      // THIRD PRIORITY: Adjacent same-plant cells (for branch connections)
      // Only include adjacent cells that are LOWER (higher y value = closer to root)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const plant = occupancyGrid.getPlant(nx, ny);
            if (plant && plant.plantId === this.plantId) {
              // Only include if not already in neighbors (avoid duplicates)
              const exists = neighbors.some((n) => n.x === nx && n.y === ny);
              if (!exists) {
                // Priority 1 if cell is lower (toward root), priority 3 if higher
                const priority = ny > this.pos.y ? 1 : 3;
                neighbors.push({ x: nx, y: ny, plant, priority });
              }
            }
          }
        }
      }

      // Sort by priority: flow toward root first, then away from root
      neighbors.sort((a, b) => a.priority - b.priority);

      return neighbors;
    }

    updateVapor() {
      // Vapor movement with upward bias
      const directions = [
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: 0, dy: -1 }, // Extra upward bias
        { dx: -1, dy: 0 },
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: 1, dy: 1 },
      ];

      const dir = directions[Math.floor(Math.random() * directions.length)];
      this.moveRel(dir.dx, dir.dy);

      // Condensation at top row
      if (this.pos.y === 0) {
        // Convert existing vapor particle to water (no new particle creation)
        this.setMode(Mode.WATER);
        this.isFalling = true; // Reset water physics state
        this.fallingDirection = null; // Reset falling direction
      }
    }

    // === PLANT UPDATES ===
    updateSeed() {
      // SEEDS AS ROOTS: Absorb water from adjacent empty spaces
      this.absorbWaterFromEnvironment();

      // PHYSICAL RULE: Seeds sprout when they have sufficient stored energy
      // No artificial time delays - energy availability is the only requirement
      if (!this.hasAttemptedSprout) {
        // Count energy particles at seed position (stacked energy)
        const energyCount = particles.filter(
          (p) =>
            p.mode === Mode.ENERGY &&
            p.pos.x === this.pos.x &&
            p.pos.y === this.pos.y
        ).length;

        // Sprout when seed has at least 3 energy particles
        if (energyCount >= 3) {
          this.hasAttemptedSprout = true;
          this.sprout();
        }
      }

      // After sprouting, try to flow water UP to plant parts
      if (this.hasAttemptedSprout && this.children.length > 0) {
        this.tryFlowWater();
      }
    }

    absorbWaterFromEnvironment() {
      // PHYSICAL RULE: Seeds act as roots - absorb water from adjacent empty spaces
      // But only when plant needs water (demand-driven system)

      // Don't absorb if seed already has water
      if (occupancyGrid.hasWater(this.pos.x, this.pos.y)) {
        return;
      }

      // Only absorb if plant actually needs water (has children that are dehydrated)
      let plantNeedsWater = false;
      if (this.children && this.children.length > 0) {
        // Check if any children need water
        for (const child of this.children) {
          if (child && child.isPlantPart && child.isPlantPart()) {
            if (!occupancyGrid.hasWater(child.pos.x, child.pos.y)) {
              plantNeedsWater = true;
              break;
            }
          }
        }
      } else {
        // No children yet, seed can absorb some water for initial reserves
        plantNeedsWater = true;
      }

      if (!plantNeedsWater) {
        return; // Plant is fully hydrated, don't absorb more
      }

      // Check adjacent spaces for water particles (reduced frequency for performance)
      // Only check every 3rd tick to reduce excessive absorption
      if (this.age % 3 !== 0) return;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip center
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            // Look for water particles in adjacent empty spaces
            const waterInSpace = particles.find(
              (p) =>
                p.mode === Mode.WATER &&
                p.pos.x === nx &&
                p.pos.y === ny &&
                !occupancyGrid.isPlantOccupied(nx, ny)
            );

            if (waterInSpace) {
              // Absorb this water particle
              waterInSpace.pos.x = this.pos.x;
              waterInSpace.pos.y = this.pos.y;
              waterInSpace.sprite.x = this.pos.x * scaleSize;
              waterInSpace.sprite.y = this.pos.y * scaleSize;
              occupancyGrid.setWater(this.pos.x, this.pos.y, waterInSpace);
              waterInSpace.createWaterOverlay();

              console.log(
                `💧 Seed absorbed water from adjacent space (${nx}, ${ny}) - plant needs water`
              );
              return; // Only absorb one water particle per absorption cycle
            }
          }
        }
      }
    }

    updateBud() {
      // Bud growth logic
      if (!this.genetics) {
        if (!this.hasLoggedNoGenetics) {
          this.hasLoggedNoGenetics = true;
        }
        return;
      }

      // If this bud has been converted to a flower, stop trying to grow
      if (this.mode !== Mode.BUD) {
        return;
      }

      // DEMAND-DRIVEN GROWTH: Bud creates "negative pressure" EVERY TICK
      // Continuously demands BOTH energy AND water for ongoing growth
      const hasEnergyHere = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      const hasWaterHere = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      // Always try to pull resources first (creates demand pressure)
      this.pullResources();

      // Check again after pulling resources
      const hasEnergyAfterPull = occupancyGrid.hasEnergy(
        this.pos.x,
        this.pos.y
      );
      const hasWaterAfterPull = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      // PHYSICAL RULE: Growth requires co-location of both resources
      if (hasEnergyAfterPull && hasWaterAfterPull) {
        // Both resources present - can grow!
        console.log(
          `🌱 Bud at (${this.pos.x}, ${this.pos.y}) has both energy + water, growing`
        );
        this.grow();
      } else {
        // Debug: Log what resources are missing
        if (!hasEnergyAfterPull && !hasWaterAfterPull) {
          console.log(
            `⏳ Bud at (${this.pos.x}, ${this.pos.y}) waiting for both energy and water`
          );
        } else if (!hasEnergyAfterPull) {
          console.log(
            `⚡ Bud at (${this.pos.x}, ${this.pos.y}) waiting for energy`
          );
        } else if (!hasWaterAfterPull) {
          console.log(
            `💧 Bud at (${this.pos.x}, ${this.pos.y}) waiting for water`
          );
        }
      }
    }

    pullResources() {
      // LOCAL PHYSICAL RULE: Bud creates negative pressure to pull resources
      // This creates demand that triggers resource flow

      const hasEnergyHere = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      const hasWaterHere = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      // Find the seed by traversing up the plant hierarchy
      let seed = this.parent;
      while (seed && seed.mode !== Mode.SEED) {
        seed = seed.parent;
      }

      // If missing energy, try to pull it from the seed
      if (!hasEnergyHere && seed) {
        const seedEnergyParticle = occupancyGrid.getEnergy(
          seed.pos.x,
          seed.pos.y
        );
        if (seedEnergyParticle) {
          // Move energy from seed to bud
          occupancyGrid.setEnergy(seed.pos.x, seed.pos.y, null);
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, seedEnergyParticle);
          seedEnergyParticle.pos.x = this.pos.x;
          seedEnergyParticle.pos.y = this.pos.y;
          if (seedEnergyParticle.sprite) {
            seedEnergyParticle.sprite.x = this.pos.x * scaleSize;
            seedEnergyParticle.sprite.y = this.pos.y * scaleSize;
          }
          if (seedEnergyParticle.auraSprite) {
            seedEnergyParticle.auraSprite.x = (this.pos.x - 1) * scaleSize;
            seedEnergyParticle.auraSprite.y = (this.pos.y - 1) * scaleSize;
          }

          // Check if there are other energy particles stacked at seed position
          // If so, promote one to be accessible in the energy layer
          for (const particle of particles) {
            if (
              particle.mode === Mode.ENERGY &&
              particle.pos.x === seed.pos.x &&
              particle.pos.y === seed.pos.y &&
              particle !== seedEnergyParticle
            ) {
              // Found another energy particle at seed - make it accessible
              occupancyGrid.setEnergy(seed.pos.x, seed.pos.y, particle);
              break; // Only promote one
            }
          }

          console.log(
            `🔋 Bud at (${this.pos.x}, ${this.pos.y}) pulled energy from seed`
          );
        }
      }

      // If missing water, try to pull it from the seed
      if (!hasWaterHere && seed) {
        const seedWaterParticle = occupancyGrid.getWater(
          seed.pos.x,
          seed.pos.y
        );
        if (seedWaterParticle) {
          // Move water from seed to bud
          occupancyGrid.setWater(seed.pos.x, seed.pos.y, null);
          occupancyGrid.setWater(this.pos.x, this.pos.y, seedWaterParticle);
          seedWaterParticle.pos.x = this.pos.x;
          seedWaterParticle.pos.y = this.pos.y;
          seedWaterParticle.updateWaterOverlay();

          console.log(
            `💧 Bud at (${this.pos.x}, ${this.pos.y}) pulled water from seed`
          );
        } else {
          // Seed has no water - request that seed absorb water from environment
          console.log(
            `💧 Bud at (${this.pos.x}, ${this.pos.y}) requesting water from seed`
          );
          // Only trigger water absorption every few ticks to avoid excessive flow
          if (this.age % 5 === 0) {
            seed.absorbWaterFromEnvironment();
          }
        }
      }
    }

    updatePlantPart() {
      // Plants are static once placed - no special visual updates needed
      // Energy particles handle their own visuals with aura sprites
    }

    updateFlower() {
      // Flower reproduction logic
      if (
        occupancyGrid.hasEnergy(this.pos.x, this.pos.y) &&
        Math.random() < 0.01
      ) {
        this.reproduce();
      }
    }

    // === PLANT GROWTH METHODS ===
    sprout() {
      // Check if space above is free
      const budX = this.pos.x;
      const budY = this.pos.y - 1;

      if (budY < 0 || occupancyGrid.isPlantOccupied(budX, budY)) {
        return;
      }

      // Create genetics for this plant
      this.genetics = new PlantGenetics();
      this.plantId = this.id;

      // Create NEW bud particle above the seed
      const bud = new Particle(budX, budY, Mode.BUD);
      bud.genetics = this.genetics;
      bud.plantId = this.plantId;
      bud.parent = this; // Seed is the bud's parent

      // Register bud in plant layer
      occupancyGrid.setPlant(budX, budY, bud);

      // Set up parent-child relationship
      this.children.push(bud);

      // Add bud to particles array
      particles.push(bud);

      // When seed sprouts, energy particles stacked on the seed can now flow out
      // Find all energy particles at the seed position and trigger energy flow
      for (const particle of particles) {
        if (
          particle.mode === Mode.ENERGY &&
          particle.pos.x === this.pos.x &&
          particle.pos.y === this.pos.y
        ) {
          console.log(
            `🌱 Seed sprouted - energy at (${this.pos.x}, ${this.pos.y}) can now flow to plant parts`
          );
        }
      }
    }

    grow() {
      // Bud growth implementation
      if (!this.genetics) {
        return;
      }

      const genes = this.genetics.genes;
      // Growth attempt (genetics log removed to reduce spam)

      // Check growth limit - primitive plants max 15 cells
      const currentCellCount = countPlantCells(this.plantId);
      if (currentCellCount >= 15) {
        if (!this.hasReachedMaturity) {
          this.hasReachedMaturity = true;
          this.setMode(Mode.FLOWER);
        }
        return; // Stop growing when limit reached
      }

      // Check space above
      const newY = this.pos.y - 1;
      if (newY < 0 || occupancyGrid.isPlantOccupied(this.pos.x, newY)) {
        if (!this.hasLoggedBlocked) {
          this.hasLoggedBlocked = true;

          // If blocked and close to maturity, convert to flower
          if (currentCellCount >= 10) {
            this.setMode(Mode.FLOWER);
          }
        }
        return; // Can't grow
      }

      // PHYSICAL RULE: Growth consumes both energy AND water
      // Consume energy particle for growth
      const energyParticle = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
      if (energyParticle) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        energyParticle.destroy();
      }

      // Consume water particle for growth
      const waterParticle = occupancyGrid.getWater(this.pos.x, this.pos.y);
      if (waterParticle) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
        waterParticle.destroy();
      }

      // Store old parent and position for proper relationship management
      const oldParent = this.parent;
      const oldX = this.pos.x;
      const oldY = this.pos.y;

      // Remove bud from current position
      occupancyGrid.removePlant(this.pos.x, this.pos.y);

      // Move bud up to new position
      this.pos.y = newY;
      if (this.sprite) {
        this.sprite.y = newY * scaleSize;
      }
      occupancyGrid.setPlant(this.pos.x, this.pos.y, this);

      // Create stem at bud's old position
      const stem = new Particle(oldX, oldY, Mode.STEM);
      stem.plantId = this.plantId;
      stem.genetics = this.genetics;
      stem.parent = oldParent; // Stem's parent is bud's old parent

      // Update parent-child relationships to create proper hierarchy
      if (oldParent) {
        // Remove bud from old parent's children and add stem instead
        const budIndex = oldParent.children.indexOf(this);
        if (budIndex !== -1) {
          oldParent.children[budIndex] = stem;
        }
      }

      // Make stem the bud's new immediate parent (most recently created)
      this.parent = stem;
      stem.children.push(this);
      particles.push(stem);

      if (!this.hasLoggedStemCreation) {
        this.hasLoggedStemCreation = true;
      }

      // Check if we should create nodes/leaves
      if (this.age % genes.internodeSpacing === 0) {
        this.createNode();
      }
    }

    createNode() {
      // Convert stem to node and create leaf buds
      const stem = this.parent;
      // Allow nodes to create more leaves on alternating sides every internode
      if (stem && (stem.mode === Mode.STEM || stem.mode === Mode.NODE)) {
        // Convert STEM to NODE (only once)
        if (stem.mode === Mode.STEM) {
          stem.setMode(Mode.NODE);
        }

        // Create leaf buds on alternating sides every internode
        const leafPositions = [
          { x: stem.pos.x - 1, y: stem.pos.y },
          { x: stem.pos.x + 1, y: stem.pos.y },
        ];

        for (const pos of leafPositions) {
          if (!occupancyGrid.isPlantOccupied(pos.x, pos.y)) {
            const leaf = new Particle(pos.x, pos.y, Mode.LEAF);
            leaf.plantId = this.plantId;
            leaf.genetics = this.genetics;
            leaf.parent = stem;

            stem.children.push(leaf);
            particles.push(leaf);
          }
        }
      }
    }

    reproduce() {
      // Create new seed
      const seed = new Particle(this.pos.x, this.pos.y + 1, Mode.SEED);
      seed.genetics = new PlantGenetics(this.genetics);
      particles.push(seed);
    }

    destroy() {
      // Remove aura sprite if this is an energy particle
      if (this.mode === Mode.ENERGY && this.auraSprite) {
        app.stage.removeChild(this.auraSprite);
        this.auraSprite = null;
      }

      // Remove energy overlay if this is a plant part
      if (this.energyOverlay) {
        app.stage.removeChild(this.energyOverlay);
        this.energyOverlay = null;
      }

      // Remove from grid and stage
      if (this.isPlantPart()) {
        occupancyGrid.removePlant(this.pos.x, this.pos.y);
      }

      // Remove from water/energy layers
      if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
      }
      if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
      }

      if (this.sprite && this.sprite.parent) {
        app.stage.removeChild(this.sprite);
      }

      // Remove from particles array
      const index = particles.indexOf(this);
      if (index > -1) {
        particles.splice(index, 1);
      }
    }
  }

  // === SECTION 5: INITIALIZATION ===
  // Initialize water particles
  for (let i = 0; i < CONSTANTS.SIMULATION.INITIAL_WATER_COUNT; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    let particle = new Particle(x, y, Mode.WATER);
    particles.push(particle);
  }

  // Initialize single seed in center of canvas near bottom for controlled study
  const seedX = Math.floor(cols / 2);
  const seedY = rows - 5; // Near bottom, 5 rows from bottom edge
  const seed = new Particle(seedX, seedY, Mode.SEED);
  particles.push(seed);

  // Initialize seed with bootstrap energy (cotyledons) - 10 energy particles stacked on seed
  const BOOTSTRAP_ENERGY_COUNT = 10;
  for (let i = 0; i < BOOTSTRAP_ENERGY_COUNT; i++) {
    const energy = new Particle(seedX, seedY, Mode.ENERGY);
    particles.push(energy);
  }

  console.log(
    `🌰 Placed seed at center (${seedX}, ${seedY}) with ${BOOTSTRAP_ENERGY_COUNT} bootstrap energy particles on ${cols}x${rows} grid`
  );

  // === SECTION 6: MAIN LOOP ===
  function advanceTick() {
    frame++;

    // Spawn energy particles near leaves that can photosynthesize
    // STRICT RULE: Energy only generates near LEAF cells, never around other plant parts
    if (Math.random() < CONSTANTS.FLUX.P_ENERGY) {
      const leaves = particles.filter((p) => p.mode === Mode.LEAF);

      // ONLY leaves can generate energy - no exceptions for early growth
      const energyTargets = leaves;

      if (energyTargets.length > 0) {
        const target =
          energyTargets[Math.floor(Math.random() * energyTargets.length)];

        // Only spawn energy if the target has water and doesn't already have energy
        const hasWater = occupancyGrid.hasWater(target.pos.x, target.pos.y);
        const hasEnergy = occupancyGrid.hasEnergy(target.pos.x, target.pos.y);

        // Only spawn energy for plant parts that have water (photosynthesis requirement)
        if (hasWater && !hasEnergy) {
          // Look for empty spaces adjacent to the target for energy spawning
          const spawnPositions = [];

          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue; // Skip target position itself
              const x = target.pos.x + dx;
              const y = target.pos.y + dy;

              if (x >= 0 && x < cols && y >= 0 && y < rows) {
                // Check if position is empty (no plant and no existing energy)
                // Water is allowed - energy should spawn in spaces that water flows through
                const hasPlant = occupancyGrid.isPlantOccupied(x, y);
                const hasEnergyHere = occupancyGrid.hasEnergy(x, y);

                if (!hasPlant && !hasEnergyHere) {
                  spawnPositions.push({ x, y });
                }
              }
            }
          }

          // Spawn energy in a random position if available
          if (spawnPositions.length > 0) {
            const randomPos =
              spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
            const energy = new Particle(randomPos.x, randomPos.y, Mode.ENERGY);
            particles.push(energy);

            console.log(
              `⚡ Energy generated at (${randomPos.x}, ${randomPos.y}) near ${target.mode} at (${target.pos.x}, ${target.pos.y})`
            );
          }
        }
      }
    }

    // Update all particles
    particles.forEach((particle) => {
      particle.update();
    });

    // Remove destroyed particles
    particles = particles.filter((p) => p.sprite === null || p.sprite.parent);
  }

  function mainLoop() {
    if (!paused) {
      const updatesThisFrame = fastForward ? fastForwardFactor : 1;
      for (let i = 0; i < updatesThisFrame; i++) {
        advanceTick();
      }
    }

    // Update display
    const now = performance.now();
    const fps = 1000 / (now - lastRenderTime);
    lastRenderTime = now;

    fpsText.text = `FPS: ${Math.round(fps)}`;
    particleCountText.text = `Particles: ${particles.length}`;
    fastForwardText.text = fastForward
      ? `Fast Forward: ${fastForwardFactor}x`
      : "";
    statusText.text = paused
      ? `PAUSED - Tick ${frame} - Press SPACE to step | R for report`
      : `RUNNING - Tick ${frame} | R for report`;

    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }

  // Start the simulation
  mainLoop();

  // === SECTION 7: CONTROLS ===
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      // Spacebar - advance one tick when paused
      if (paused) {
        advanceTick();
      }
      e.preventDefault(); // Prevent page scrolling
    }
    if (e.key === "p" || e.key === "P") {
      // P - toggle pause/play mode
      paused = !paused;
      console.log(paused ? "PAUSED - Press SPACE to step" : "RUNNING");
    }
    if (e.key === "r" || e.key === "R") {
      // R - detailed simulation report
      console.log("\n=== 📊 DETAILED SIMULATION REPORT ===");
      console.log(`Frame: ${frame}`);

      const stats = {
        seeds: particles.filter((p) => p.mode === Mode.SEED).length,
        water: particles.filter((p) => p.mode === Mode.WATER).length,
        energy: particles.filter((p) => p.mode === Mode.ENERGY).length,
        plants: particles.filter((p) => p.isPlantPart()).length,
        total: particles.length,
      };
      console.log("Particle counts:", stats);

      // Plant details
      const plants = particles.filter((p) => p.isPlantPart());
      if (plants.length > 0) {
        console.log("\n🌱 Plant Particles:");
        plants.forEach((p) => {
          console.log(
            `  ${p.mode} at (${p.pos.x}, ${p.pos.y}) - Plant ID: ${p.plantId}`
          );
        });
      }

      // Energy details
      const energies = particles.filter((p) => p.mode === Mode.ENERGY);
      if (energies.length > 0) {
        console.log("\n⚡ Energy Particles:");
        energies.forEach((p) => {
          console.log(`  Energy at (${p.pos.x}, ${p.pos.y})`);
        });
      }

      console.log("=== END REPORT ===\n");
    }
    if (e.key === "f" || e.key === "F") {
      fastForward = !fastForward;
    }
    if (e.key === "+" || e.key === "=") {
      fastForwardFactor = Math.min(50, fastForwardFactor + 1);
    }
    if (e.key === "-" || e.key === "_") {
      fastForwardFactor = Math.max(1, fastForwardFactor - 1);
    }
  });

  // Mouse click - advance one tick when paused
  app.view.addEventListener("click", () => {
    if (paused) {
      advanceTick();
    }
  });

  // End of DOMContentLoaded event listener
});
