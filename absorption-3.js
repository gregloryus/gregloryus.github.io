// === SECTION 1: INITIALIZATION AND CONSTANTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size as per brief: 256x144 cells
  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 144;
  const SCALE_SIZE = 3;

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
      P_ENERGY: 0.05, // Increased from 0.01 to 0.05 (5% chance) for more energy spawning
      WATER_DIAGONAL_CHANCE: 0.1,
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
      INITIAL_WATER_COUNT: 1000,
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

  // Core simulation parameters
  let particles = [];
  let frame = 0;
  let fastForward = false;
  let fastForwardFactor = 10;
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
        this.energyLayer[index] = particle;

        // Create/remove visual overlay
        if (particle && !this.energyOverlays[index]) {
          const overlay = new PIXI.Graphics();
          overlay.beginFill(0xffff00, 0.3); // 30% alpha yellow
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
      app.stage.addChild(this.sprite);

      // Log first-time energy particle creation
      if (this.mode === Mode.ENERGY && !this.hasLoggedFirstRender) {
        console.log(`⚡ Energy particle created at (${x}, ${y})`);
        this.hasLoggedFirstRender = true;
      }

      // Initialize seed with stored energy (cotyledons) for bootstrap growth
      if (this.mode === Mode.SEED) {
        this.storedEnergy = 10; // Seeds start with 10 energy for initial growth
        console.log(
          `🌰 Seed created with ${this.storedEnergy} stored energy at (${x}, ${y})`
        );
      }

      // Set in appropriate occupancy grid layer
      if (this.isPlantPart()) {
        occupancyGrid.setPlant(x, y, this);
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
        console.log(
          `🔄 MODE CHANGE: ${oldMode} → ${mode} at (${this.pos.x}, ${this.pos.y})`
        );
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

      switch (this.mode) {
        case Mode.WATER:
          this.updateWater();
          break;
        case Mode.VAPOR:
          this.updateVapor();
          break;
        case Mode.ENERGY:
          this.updateEnergy();
          break;
        case Mode.SEED:
          this.updateSeed();
          break;
        case Mode.BUD:
          this.updateBud();
          break;
        case Mode.STEM:
        case Mode.LEAF:
        case Mode.NODE:
          this.updatePlantPart();
          break;
        case Mode.FLOWER:
          this.updateFlower();
          break;
      }
    }

    // === PARTICLE MOVEMENT METHODS ===
    moveRel(x, y) {
      // Handle vertical torus wrapping
      let newY = this.pos.y + y;
      if (newY < 0) {
        newY = rows - 1;
      } else if (newY >= rows) {
        newY = 0;
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

      // Update occupancy grid for plant parts
      if (this.isPlantPart()) {
        occupancyGrid.removePlant(this.pos.x - x, this.pos.y - y);
        occupancyGrid.setPlant(this.pos.x, this.pos.y, this);
      }

      return true;
    }

    // === FLUX PARTICLE UPDATES ===
    updateWater() {
      // Water physics with vertical torus topology
      if (this.isFalling) {
        // 1% chance to try diagonal movement first to help water find seeds
        if (Math.random() < 0.01) {
          const diagonalChoice = Math.random() < 0.5 ? "left" : "right";
          if (diagonalChoice === "left" && this.moveRel(-1, 1)) {
            this.fallingDirection = "left";
            return; // Successfully moved diagonally
          } else if (diagonalChoice === "right" && this.moveRel(1, 1)) {
            this.fallingDirection = "right";
            return; // Successfully moved diagonally
          }
          // If diagonal failed, continue with normal logic below
        }

        // Try to move down first
        if (this.moveRel(0, 1)) {
          this.fallingDirection = null;
        } else {
          // If can't move down, try diagonal
          if (this.fallingDirection === null) {
            this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
          }

          if (this.fallingDirection === "left") {
            if (!this.moveRel(-1, 1)) {
              if (!this.moveRel(-1, 0)) {
                this.fallingDirection = "right";
              }
            }
          } else {
            if (!this.moveRel(1, 1)) {
              if (!this.moveRel(1, 0)) {
                this.fallingDirection = "left";
              }
            }
          }
        }
      }

      // Check if water is in same space as plant - seeds and all plant parts can absorb water
      const plant = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (plant && plant.plantId) {
        // Only log if this is the first water particle absorbed by this plant cell
        const alreadyHasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);
        if (!alreadyHasWater) {
          console.log(
            `💧 Water absorbed by ${plant.mode} at (${this.pos.x}, ${this.pos.y})`
          );
        }

        // Remove water particle and add to water layer (all plant parts can only hold 1 water)
        occupancyGrid.setWater(this.pos.x, this.pos.y, this);
        this.sprite.visible = false; // Hide the particle sprite
        this.isFalling = false;

        // Start local water flow from this cell
        plant.tryFlowWater();
      }
    }

    updateEnergy() {
      // Energy can be absorbed by LEAF particles (photosynthesis) and SEED particles (cotyledons)
      const plant = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (
        plant &&
        plant.plantId &&
        (plant.mode === Mode.LEAF || plant.mode === Mode.SEED)
      ) {
        const hasEnergyAlready = occupancyGrid.hasEnergy(
          this.pos.x,
          this.pos.y
        );
        const hasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

        // Seeds can store multiple energy (cotyledons), other plant parts can only store 1
        const canAbsorbEnergy =
          plant.mode === Mode.SEED
            ? !plant.storedEnergy || plant.storedEnergy < 10 // Seeds can store up to 10 energy
            : !hasEnergyAlready && hasWater; // Leaves need water for photosynthesis

        if (canAbsorbEnergy) {
          if (plant.mode === Mode.SEED) {
            // SEED: Store multiple energy particles (cotyledons)
            console.log(
              `⚡ Energy stored in seed at (${this.pos.x}, ${this.pos.y})`
            );

            // Initialize stored energy if needed
            if (!plant.storedEnergy) plant.storedEnergy = 0;
            plant.storedEnergy++;

            // Destroy the energy particle (it's now stored in the seed)
            this.destroy();
          } else if (plant.mode === Mode.LEAF) {
            // LEAF: Photosynthesis with respiration
            console.log(
              `⚡ Energy absorbed by ${plant.mode} at (${this.pos.x}, ${this.pos.y}) - creating vapor`
            );

            // RESPIRATION: Energy absorption consumes water
            const waterParticle = occupancyGrid.getWater(
              this.pos.x,
              this.pos.y
            );
            if (waterParticle) {
              // Remove water and create vapor
              occupancyGrid.setWater(this.pos.x, this.pos.y, null);

              // Create vapor particle
              const vapor = new Particle(this.pos.x, this.pos.y, Mode.VAPOR);
              particles.push(vapor);

              // Remove water particle from the simulation
              if (waterParticle && waterParticle.destroy) {
                waterParticle.destroy();
              }
            }

            // Move energy particle to plant cell
            occupancyGrid.setEnergy(this.pos.x, this.pos.y, this);
            this.sprite.visible = false; // Hide the particle sprite

            // Try to flow energy through the plant
            const flowSuccessful = plant.tryFlowEnergy();

            // If energy couldn't flow (plant saturated), mark this energy for twinkling
            if (!flowSuccessful) {
              this.twinkleCountdown = 5; // Will fade out over 5 frames
              console.log(
                `✨ Plant saturated - energy will twinkle out at (${this.pos.x}, ${this.pos.y})`
              );
            }
          }
        }
      } else {
        // Energy particle not on a leaf - check for fade-out due to saturation
        if (this.twinkleCountdown !== undefined) {
          this.twinkleCountdown--;

          // Create twinkling effect by changing opacity
          if (this.sprite) {
            this.sprite.alpha = Math.max(0.1, this.twinkleCountdown / 5);
          }

          // Fade out completely
          if (this.twinkleCountdown <= 0) {
            console.log(
              `✨ Energy particle twinkled out at (${this.pos.x}, ${this.pos.y})`
            );
            this.destroy();
          }
        } else {
          // Regular energy particle aging - fade out if too old and not absorbed
          if (this.age > 100) {
            console.log(
              `🗑️ Old energy particle despawning at (${this.pos.x}, ${this.pos.y})`
            );
            this.destroy();
          }
        }
      }
    }

    // === LOCAL SATURATION FLOW SYSTEM ===

    tryFlowEnergy(visitedCells = new Set()) {
      // Prevent infinite recursion
      const cellKey = `${this.pos.x},${this.pos.y}`;
      if (visitedCells.has(cellKey)) return false;
      visitedCells.add(cellKey);

      // Only flow if this cell has energy
      if (!occupancyGrid.hasEnergy(this.pos.x, this.pos.y)) return false;

      // Get the energy particle at this position
      const energyParticle = occupancyGrid.getEnergy(this.pos.x, this.pos.y);

      // Energy flows DOWNWARD: from leaves to seed (extremities to root)
      const neighbors = this.getEnergyFlowNeighbors();

      for (const neighbor of neighbors) {
        if (!occupancyGrid.hasEnergy(neighbor.x, neighbor.y)) {
          // Found empty space - flow energy there
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
          occupancyGrid.setEnergy(neighbor.x, neighbor.y, energyParticle);
          console.log(
            `⚡ Energy flowed DOWN from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y})`
          );

          // Try to continue flowing from the new position
          neighbor.plant.tryFlowEnergy(visitedCells);
          return true;
        } else {
          // Neighbor has energy - ask it to try shifting first
          if (neighbor.plant.tryFlowEnergy(visitedCells)) {
            // Neighbor made space - now we can flow there
            occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
            occupancyGrid.setEnergy(neighbor.x, neighbor.y, energyParticle);
            console.log(
              `⚡ Energy flowed DOWN from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) after neighbor shifted`
            );
            return true;
          }
        }
      }

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
          console.log(
            `💧 Water flowed UP from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y})`
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
            console.log(
              `💧 Water flowed UP from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) after neighbor shifted`
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
      // Energy flows DOWNWARD: only to parent (from extremities to root)
      let neighbors = [];

      // Add parent (if exists) - energy flows DOWN
      if (this.parent && this.parent.isPlantPart && this.parent.isPlantPart()) {
        neighbors.push({
          x: this.parent.pos.x,
          y: this.parent.pos.y,
          plant: this.parent,
        });
      }

      // Add adjacent plant cells from same plant that are lower (higher y value)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && ny > this.pos.y) {
            // Only flow to lower positions
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
        // Convert back to water
        const water = new Particle(this.pos.x, this.pos.y, Mode.WATER);
        particles.push(water);
        this.destroy();
      }
    }

    // === PLANT UPDATES ===
    updateSeed() {
      // Seed logic - try to sprout when it has enough energy
      // Simple sprouting condition - just try to sprout after some time
      if (this.age > 100 && !this.hasAttemptedSprout) {
        console.log(
          `🌱 Seed at (${this.pos.x}, ${this.pos.y}) attempting to sprout`
        );
        this.hasAttemptedSprout = true;
        this.sprout();
      }
    }

    updateBud() {
      // Bud growth logic
      if (!this.genetics) {
        if (!this.hasLoggedNoGenetics) {
          console.log(
            `❌ Bud at (${this.pos.x}, ${this.pos.y}) has no genetics in update`
          );
          this.hasLoggedNoGenetics = true;
        }
        return;
      }

      // If this bud has been converted to a flower, stop trying to grow
      if (this.mode !== Mode.BUD) {
        return;
      }

      const hasEnergy = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      const hasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      if (!this.hasLoggedResourceCheck) {
        console.log(
          `💧⚡ Bud at (${this.pos.x}, ${this.pos.y}) resource check: water=${hasWater}, energy=${hasEnergy}`
        );
        this.hasLoggedResourceCheck = true;
      }

      // Periodic resource status updates (every 200 frames)
      if (frame % 200 === 0) {
        console.log(
          `📊 Bud at (${this.pos.x}, ${this.pos.y}) status: water=${hasWater}, energy=${hasEnergy}`
        );
      }

      // If bud has water but no energy, try to request energy from parent
      if (hasWater && !hasEnergy && this.parent) {
        if (this.requestEnergyFromParent()) {
          console.log(
            `🔋 Bud at (${this.pos.x}, ${this.pos.y}) successfully requested energy from parent`
          );
        }
      }

      // Check if bud has energy and water to grow
      const hasEnergyNow = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      if (hasEnergyNow && hasWater) {
        if (!this.hasAttemptedGrow) {
          console.log(
            `🌱 Bud at (${this.pos.x}, ${this.pos.y}) has energy + water, attempting growth`
          );
          this.hasAttemptedGrow = true;
        }
        this.grow();
      }
    }

    requestEnergyFromParent() {
      // Bud requests energy from its parent (seed or stem)
      if (!this.parent) return false;

      // Check if parent is a seed with stored energy
      if (this.parent.mode === Mode.SEED && this.parent.storedEnergy > 0) {
        // Transfer 1 energy from seed to bud
        this.parent.storedEnergy--;

        // Create energy particle at bud position
        const energyParticle = new Particle(
          this.pos.x,
          this.pos.y,
          Mode.ENERGY
        );
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, energyParticle);
        energyParticle.sprite.visible = false; // Hide since it's in plant cell
        particles.push(energyParticle);

        console.log(
          `🔋 Energy transferred from seed (${this.parent.pos.x}, ${this.parent.pos.y}) to bud (${this.pos.x}, ${this.pos.y}). Seed energy remaining: ${this.parent.storedEnergy}`
        );
        return true;
      }

      // Check if parent has energy in its cell and can pass it along
      if (occupancyGrid.hasEnergy(this.parent.pos.x, this.parent.pos.y)) {
        const parentEnergy = occupancyGrid.getEnergy(
          this.parent.pos.x,
          this.parent.pos.y
        );
        if (parentEnergy) {
          // Move energy from parent to bud
          occupancyGrid.setEnergy(this.parent.pos.x, this.parent.pos.y, null);
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, parentEnergy);

          console.log(
            `🔋 Energy transferred from parent (${this.parent.pos.x}, ${this.parent.pos.y}) to bud (${this.pos.x}, ${this.pos.y})`
          );
          return true;
        }
      }

      return false; // No energy available from parent
    }

    updatePlantPart() {
      // Plant parts just exist and process resources
      // Resource absorption is handled by the flux particles
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
      console.log(
        `🔍 SPROUTING: Seed at (${this.pos.x}, ${this.pos.y}) mode=${this.mode} attempting to sprout`
      );

      // Check if space above is free
      const budX = this.pos.x;
      const budY = this.pos.y - 1;

      if (budY < 0 || occupancyGrid.isPlantOccupied(budX, budY)) {
        console.log(
          `🚫 Sprouting blocked - no space above seed at (${budX}, ${budY})`
        );
        return;
      }

      console.log(`✅ Space available for bud at (${budX}, ${budY})`);

      // Create genetics for this plant
      this.genetics = new PlantGenetics();
      this.plantId = this.id;

      console.log(`🧬 Genetics created for plant ${this.plantId}`);

      // Create NEW bud particle above the seed
      console.log(
        `🆕 Creating NEW bud particle at (${budX}, ${budY}) - this should NOT change the seed`
      );
      const bud = new Particle(budX, budY, Mode.BUD);
      bud.genetics = this.genetics;
      bud.plantId = this.plantId;
      bud.parent = this; // Seed is the bud's parent

      // Set up parent-child relationship
      this.children.push(bud);

      // Add bud to particles array
      particles.push(bud);

      console.log(
        `🌿 SUCCESS: Bud created at (${budX}, ${budY}) from seed at (${this.pos.x}, ${this.pos.y})`
      );
      console.log(
        `🔍 After sprouting: Seed mode=${this.mode}, position=(${this.pos.x}, ${this.pos.y}), Bud mode=${bud.mode}, position=(${bud.pos.x}, ${bud.pos.y})`
      );
    }

    grow() {
      // Bud growth implementation
      if (!this.genetics) {
        console.log(
          `❌ Bud at (${this.pos.x}, ${this.pos.y}) has no genetics - cannot grow`
        );
        return;
      }

      const genes = this.genetics.genes;
      console.log(
        `🔍 Bud at (${this.pos.x}, ${this.pos.y}) attempting growth with genetics:`,
        genes
      );

      // Check growth limit - primitive plants max 15 cells
      const currentCellCount = countPlantCells(this.plantId);
      if (currentCellCount >= 15) {
        if (!this.hasReachedMaturity) {
          console.log(
            `🏁 Plant ${this.plantId} has reached maturity with ${currentCellCount} cells - converting bud to flower`
          );
          this.hasReachedMaturity = true;
          this.setMode(Mode.FLOWER);
        }
        return; // Stop growing when limit reached
      }

      // Check space above
      const newY = this.pos.y - 1;
      if (newY < 0 || occupancyGrid.isPlantOccupied(this.pos.x, newY)) {
        if (!this.hasLoggedBlocked) {
          console.log(
            `🚫 Bud at (${this.pos.x}, ${
              this.pos.y
            }) blocked - can't grow upward (newY=${newY}, occupied=${occupancyGrid.isPlantOccupied(
              this.pos.x,
              newY
            )}). Plant has ${currentCellCount} cells.`
          );
          this.hasLoggedBlocked = true;

          // If blocked and close to maturity, convert to flower
          if (currentCellCount >= 10) {
            console.log(
              `🌸 Converting blocked bud to flower - plant has ${currentCellCount} cells`
            );
            this.setMode(Mode.FLOWER);
          }
        }
        return; // Can't grow
      }

      console.log(
        `📈 Bud growing from (${this.pos.x}, ${this.pos.y}) to (${this.pos.x}, ${newY})`
      );
      console.log(
        `🔧 Before growth: Current bud position (${this.pos.x}, ${this.pos.y}), moving to (${this.pos.x}, ${newY})`
      );

      // Move bud up, create stem below
      occupancyGrid.removePlant(this.pos.x, this.pos.y);

      // Create stem in current position
      const stem = new Particle(this.pos.x, this.pos.y, Mode.STEM);
      stem.plantId = this.plantId;
      stem.genetics = this.genetics;
      stem.parent = this.parent;

      // Move bud up
      this.pos.y = newY;
      if (this.sprite) {
        this.sprite.y = newY * scaleSize;
      }
      occupancyGrid.setPlant(this.pos.x, this.pos.y, this);

      // Update relationships
      this.parent = stem;
      stem.children.push(this);
      particles.push(stem);

      if (!this.hasLoggedStemCreation) {
        console.log(
          `🌿 Stem created at (${this.pos.x}, ${this.pos.y + 1}) by bud growth`
        );
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
      if (stem && stem.mode === Mode.STEM) {
        stem.setMode(Mode.NODE);

        // Create leaf buds on sides
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

  // Initialize seeds
  let seedsCreated = 0;
  for (let i = 0; i < CONSTANTS.SIMULATION.INITIAL_SEED_COUNT; i++) {
    let x = Math.floor(Math.random() * cols);
    let y = Math.floor(Math.random() * rows);
    if (!occupancyGrid.isPlantOccupied(x, y)) {
      let particle = new Particle(x, y, Mode.SEED);
      particles.push(particle);
      seedsCreated++;
    }
  }
  console.log(`🌰 Initialized ${seedsCreated} seeds on ${cols}x${rows} grid`);

  // === SECTION 6: MAIN LOOP ===
  function mainLoop() {
    const updatesThisFrame = fastForward ? fastForwardFactor : 1;

    for (let i = 0; i < updatesThisFrame; i++) {
      frame++;

      // Periodic status report
      if (frame % 500 === 0) {
        const plantCount = particles.filter((p) => p.isPlantPart()).length;
        const waterCount = particles.filter(
          (p) => p.mode === Mode.WATER
        ).length;
        const energyCount = particles.filter(
          (p) => p.mode === Mode.ENERGY
        ).length;
        console.log(
          `📊 Frame ${frame}: ${plantCount} plant parts, ${waterCount} water, ${energyCount} energy`
        );
      }

      // Spawn energy particles near leaves that can photosynthesize
      if (Math.random() < CONSTANTS.FLUX.P_ENERGY) {
        const leaves = particles.filter((p) => p.mode === Mode.LEAF);

        if (leaves.length > 0) {
          const leaf = leaves[Math.floor(Math.random() * leaves.length)];

          // Only spawn energy if the leaf has water and doesn't already have energy
          const hasWater = occupancyGrid.hasWater(leaf.pos.x, leaf.pos.y);
          const hasEnergy = occupancyGrid.hasEnergy(leaf.pos.x, leaf.pos.y);

          if (!hasWater) {
            if (frame % 100 === 0) {
              // Log occasionally to avoid spam
              console.log(
                `💧❌ Leaf at (${leaf.pos.x}, ${leaf.pos.y}) has no water - energy won't spawn`
              );
            }
          }

          if (hasWater && !hasEnergy) {
            const x = leaf.pos.x + Math.floor(Math.random() * 3) - 1;
            const y = leaf.pos.y + Math.floor(Math.random() * 3) - 1;

            if (x >= 0 && x < cols && y >= 0 && y < rows) {
              const energy = new Particle(x, y, Mode.ENERGY);
              particles.push(energy);
              console.log(
                `⚡ Energy spawned at (${x}, ${y}) near leaf at (${leaf.pos.x}, ${leaf.pos.y})`
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

    // Update display
    const now = performance.now();
    const fps = 1000 / (now - lastRenderTime);
    lastRenderTime = now;

    fpsText.text = `FPS: ${Math.round(fps)}`;
    particleCountText.text = `Particles: ${particles.length}`;
    fastForwardText.text = fastForward
      ? `Fast Forward: ${fastForwardFactor}x`
      : "";

    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }

  // Start the simulation
  mainLoop();

  // === SECTION 7: CONTROLS ===
  document.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") {
      fastForward = !fastForward;
      console.log("Fast-forward is now:", fastForward);
    }
    if (e.key === "+" || e.key === "=") {
      fastForwardFactor = Math.min(50, fastForwardFactor + 1);
      console.log("Fast-forward factor:", fastForwardFactor);
    }
    if (e.key === "-" || e.key === "_") {
      fastForwardFactor = Math.max(1, fastForwardFactor - 1);
      console.log("Fast-forward factor:", fastForwardFactor);
    }
  });

  // End of DOMContentLoaded event listener
});
