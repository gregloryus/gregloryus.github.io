// === ABSORPTION-9.JS: SIMPLE ENERGY FLOW (CELLSPRING APPROACH) ===
// Back to basics with proven working energy distribution from cellspring-22-working.js

document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size - 64x64 for testing
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

    // Energy parameters (simplified like cellspring)
    ENERGY: {
      DEFAULT_CAPACITY: 10,
      SEED_ENERGY: 10,
      SPROUT_THRESHOLD: 5,
      GROWTH_COST: 3,
      P_ENERGY: 0.08, // 8% chance for energy spawning
    },

    // Growth parameters
    GROWTH: {
      MIN_ENERGY_TO_GROW: 10, // Must be at capacity to grow
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
    BUD: 0x90ee90,
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
  let paused = true;
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

  // === SECTION 2: SIMPLE OCCUPANCY GRID ===
  class LayeredOccupancyGrid {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;

      // Separate layers for different particle types
      this.plantLayer = new Array(cols * rows).fill(null);
      this.waterLayer = new Array(cols * rows).fill(null);
      this.energyLayer = new Array(cols * rows).fill(null);

      // Visual overlays
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
          overlay.beginFill(0x0066ff, 0.2);
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

        // Special handling for seeds (allow energy stacking)
        const plantAtPosition = this.getPlant(x, y);
        if (
          particle &&
          this.energyLayer[index] !== null &&
          plantAtPosition &&
          plantAtPosition.mode === Mode.SEED
        ) {
          return; // Keep first energy accessible for seeds
        }

        this.energyLayer[index] = particle;

        // Create/remove visual overlay
        if (particle && !this.energyOverlays[index]) {
          const overlay = new PIXI.Graphics();
          overlay.beginFill(0xffff00, 0.1);
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

    // Utility methods
    isPlantOccupied(x, y) {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
      return this.getPlant(x, y) !== null;
    }

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
        internodeSpacing: 3 + Math.floor(Math.random() * 4), // 3-6
        budGrowthLimit: 8 + Math.floor(Math.random() * 8), // 8-15
        leafNodePattern: [1, 1, 0, 1], // Default phyllotaxis
        branchingNodes: [5, 8], // Which nodes branch
        branchAngle: 45, // Angle of branches
        leafDelay: 2, // Ticks before leaf buds activate
        floweringHeight: 8, // Height to start flowering
        energyThreshold: 8, // Energy needed for growth
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
      if (Math.random() < 0.1) {
        // 10% mutation rate
        const keys = Object.keys(this.genes);
        const mutKey = keys[Math.floor(Math.random() * keys.length)];

        if (typeof this.genes[mutKey] === "number") {
          const change = (Math.random() - 0.5) * 2 * 0.2; // 20% mutation strength
          this.genes[mutKey] = Math.max(1, this.genes[mutKey] * (1 + change));
        }
      }
    }

    calculateFitness() {
      const spacing = this.genes.internodeSpacing;
      const height = this.genes.budGrowthLimit;
      const energy = this.genes.energyThreshold;

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

  // === SECTION 4: PARTICLE CLASS WITH CELLSPRING ENERGY SYSTEM ===
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

      // NEW: Energy system like cellspring
      this.currentEnergy = 0;
      this.energyCapacity = CONSTANTS.ENERGY.DEFAULT_CAPACITY;

      // Movement properties
      this.isFalling = true;
      this.fallingDirection = null;

      // Logging flags
      this.hasAttemptedSprout = false;
      this.hasLoggedBlocked = false;

      // Create sprite
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);

      if (this.isPlantPart()) {
        this.sprite.alpha = 0.5;
      }

      app.stage.addChild(this.sprite);

      // Initialize energy for seeds
      if (this.mode === Mode.SEED) {
        this.currentEnergy = CONSTANTS.ENERGY.SEED_ENERGY;
        this.energyCapacity = CONSTANTS.ENERGY.SEED_ENERGY;
      }

      // Create aura for energy particles
      if (this.mode === Mode.ENERGY && !this.auraSprite) {
        this.auraSprite = new PIXI.Graphics();
        this.auraSprite.beginFill(0xffff00, 0.05);
        this.auraSprite.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        this.auraSprite.endFill();
        this.auraSprite.x = (x - 1) * scaleSize;
        this.auraSprite.y = (y - 1) * scaleSize;
        app.stage.addChildAt(this.auraSprite, 0);
        this.sprite.alpha = 0.1;
      }

      // Set in appropriate occupancy grid layer
      if (this.isPlantPart()) {
        occupancyGrid.setPlant(x, y, this);
      } else if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(x, y, this);
      } else if (this.mode === Mode.WATER) {
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

        if (this.sprite) {
          this.sprite.texture = modeTextures[mode];
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
      } else if (this.isPlantPart()) {
        this.updatePlantPart();
      }
    }

    // === NEW: CELLSPRING-STYLE ENERGY DISTRIBUTION ===
    distributeEnergy() {
      // Get valid connections - exclude null and dead cells
      const connections = [this.parent, ...this.children].filter(
        (cell) => cell !== null && cell.isPlantPart()
      );

      // Balance energy with neighbors
      for (const neighbor of connections) {
        const diff = this.currentEnergy - neighbor.currentEnergy;
        if (Math.abs(diff) >= 2) {
          const transfer = Math.sign(diff);
          this.currentEnergy -= transfer;
          neighbor.currentEnergy += transfer;

          console.log(
            `⚡ Energy transfer: ${this.mode} (${
              this.currentEnergy + transfer
            }) -> ${neighbor.mode} (${neighbor.currentEnergy - transfer})`
          );
        }
      }
    }

    collectEnergy() {
      // Only leaves can collect energy from energy particles
      if (this.mode !== Mode.LEAF) return;

      // Check for energy particles in adjacent spaces
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const x = this.pos.x + dx;
          const y = this.pos.y + dy;

          const energyParticle = occupancyGrid.getEnergy(x, y);
          if (energyParticle && this.currentEnergy < this.energyCapacity) {
            // Absorb the energy particle
            occupancyGrid.setEnergy(x, y, null);
            energyParticle.destroy();
            this.currentEnergy++;

            console.log(
              `🍃 Leaf at (${this.pos.x}, ${this.pos.y}) collected energy, now has ${this.currentEnergy}/${this.energyCapacity}`
            );
            break; // Only collect one per tick
          }
        }
      }
    }

    // === PARTICLE MOVEMENT METHODS ===
    moveRel(x, y) {
      let newY = this.pos.y + y;
      if (newY < 0) {
        newY = 0;
      } else if (newY >= rows) {
        newY = rows - 1;
      }

      let newX = this.pos.x + x;
      if (newX < 0 || newX >= cols) {
        return false;
      }

      this.pos.x = newX;
      this.pos.y = newY;

      if (this.sprite) {
        this.sprite.x = Math.floor(this.pos.x * scaleSize);
        this.sprite.y = Math.floor(this.pos.y * scaleSize);
      }

      // Update occupancy grid
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

    // === PARTICLE UPDATE METHODS ===
    isPositionOccupied(x, y) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
      if (occupancyGrid.isPlantOccupied(x, y)) return true;

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

      if (this.mode === Mode.ENERGY) {
        for (const particle of particles) {
          if (
            particle !== this &&
            particle.mode === Mode.ENERGY &&
            particle.pos.x === x &&
            particle.pos.y === y
          ) {
            const plantAtPosition = occupancyGrid.getPlant(x, y);
            if (plantAtPosition && plantAtPosition.mode === Mode.SEED) {
              return false; // Allow stacking on seeds
            }
            return true;
          }
        }
      }

      return false;
    }

    updateWater() {
      // Simple water physics
      if (this.isFalling && this.pos.y < rows - 1) {
        if (!this.isPositionOccupied(this.pos.x, this.pos.y + 1)) {
          this.moveRel(0, 1);
          this.fallingDirection = null;
        } else {
          if (this.fallingDirection === null) {
            this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
          }

          if (this.fallingDirection === "left") {
            if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y + 1)) {
              this.moveRel(-1, 1);
            } else if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y)) {
              this.moveRel(-1, 0);
            } else {
              this.fallingDirection = "right";
            }
          } else {
            if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y + 1)) {
              this.moveRel(1, 1);
            } else if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y)) {
              this.moveRel(1, 0);
            } else {
              this.fallingDirection = "left";
            }
          }
        }
      } else if (this.pos.y >= rows - 1) {
        this.isFalling = false;
      }

      // Water absorption by seeds (root uptake)
      const plant = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (plant && plant.plantId && plant.mode === Mode.SEED) {
        const alreadyHasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

        if (!alreadyHasWater) {
          occupancyGrid.setWater(this.pos.x, this.pos.y, this);
          this.sprite.visible = false;
          this.isFalling = false;

          console.log(
            `💧 Water absorbed by SEED (root uptake) at (${this.pos.x}, ${this.pos.y})`
          );
        }
      }
    }

    updateEnergy() {
      // Energy in empty space ages and decays
      const plantAtPosition = occupancyGrid.getPlant(this.pos.x, this.pos.y);

      // Energy bound to plant matter is stable
      if (
        plantAtPosition &&
        (plantAtPosition.plantId || plantAtPosition.mode === Mode.SEED)
      ) {
        return;
      }

      // Energy twinkling for saturation effect
      if (this.twinkleCountdown !== undefined) {
        this.twinkleCountdown--;
        if (this.sprite) {
          this.sprite.alpha = Math.max(0.1, this.twinkleCountdown / 30);
        }
        if (this.auraSprite) {
          this.auraSprite.alpha = Math.max(
            0.01,
            (this.twinkleCountdown / 30) * 0.3
          );
        }
        if (this.twinkleCountdown <= 0) {
          this.destroy();
        }
      } else {
        if (!this.unusedFrames) this.unusedFrames = 0;
        this.unusedFrames++;
        if (this.unusedFrames > 60) {
          // 2 seconds
          this.twinkleCountdown = 45;
        }
      }
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
        this.setMode(Mode.WATER);
        this.isFalling = true;
        this.fallingDirection = null;
      }
    }

    updatePlantPart() {
      // PLANT PART UPDATE WITH CELLSPRING ENERGY SYSTEM
      if (this.mode === Mode.SEED) {
        this.updateSeed();
      } else if (this.mode === Mode.BUD) {
        this.updateBud();
      } else if (this.mode === Mode.LEAF) {
        this.collectEnergy(); // Leaves collect energy
      } else if (this.mode === Mode.FLOWER) {
        this.updateFlower();
      }

      // All plant parts distribute energy
      if (this.isPlantPart()) {
        this.distributeEnergy();
      }
    }

    updateSeed() {
      // Seed sprouting logic
      if (
        !this.hasAttemptedSprout &&
        this.currentEnergy >= CONSTANTS.ENERGY.SPROUT_THRESHOLD
      ) {
        this.hasAttemptedSprout = true;
        this.sprout();
      }
    }

    updateBud() {
      // BUD GROWTH WITH SIMPLE ENERGY CHECK (like cellspring)
      if (!this.genetics) return;
      if (this.mode !== Mode.BUD) return;

      // Simple cellspring approach: grow when energy is at capacity
      if (this.currentEnergy >= CONSTANTS.GROWTH.MIN_ENERGY_TO_GROW) {
        console.log(
          `🌱 Bud at (${this.pos.x}, ${this.pos.y}) has enough energy (${this.currentEnergy}/${this.energyCapacity}), growing`
        );
        this.grow();
      }
    }

    updateFlower() {
      if (this.currentEnergy >= this.energyCapacity && Math.random() < 0.01) {
        this.reproduce();
      }
    }

    // === PLANT GROWTH METHODS ===
    sprout() {
      const budX = this.pos.x;
      const budY = this.pos.y - 1;

      if (budY < 0 || occupancyGrid.isPlantOccupied(budX, budY)) {
        return;
      }

      this.genetics = new PlantGenetics();
      this.plantId = this.id;

      const bud = new Particle(budX, budY, Mode.BUD);
      bud.genetics = this.genetics;
      bud.plantId = this.plantId;
      bud.parent = this;

      occupancyGrid.setPlant(budX, budY, bud);
      this.children.push(bud);
      particles.push(bud);

      console.log(`🌱 Seed sprouted at (${this.pos.x}, ${this.pos.y})`);
    }

    grow() {
      if (!this.genetics) return;

      const genes = this.genetics.genes;
      const currentCellCount = countPlantCells(this.plantId);

      if (currentCellCount >= 15) {
        if (!this.hasReachedMaturity) {
          this.hasReachedMaturity = true;
          this.setMode(Mode.FLOWER);
        }
        return;
      }

      const newY = this.pos.y - 1;
      if (newY < 0 || occupancyGrid.isPlantOccupied(this.pos.x, newY)) {
        if (!this.hasLoggedBlocked) {
          this.hasLoggedBlocked = true;
          if (currentCellCount >= 10) {
            this.setMode(Mode.FLOWER);
          }
        }
        return;
      }

      // Consume energy for growth (like cellspring)
      this.currentEnergy -= CONSTANTS.ENERGY.GROWTH_COST;

      // Growth mechanics
      const oldParent = this.parent;
      const oldX = this.pos.x;
      const oldY = this.pos.y;

      occupancyGrid.removePlant(this.pos.x, this.pos.y);
      this.pos.y = newY;
      if (this.sprite) {
        this.sprite.y = newY * scaleSize;
      }
      occupancyGrid.setPlant(this.pos.x, this.pos.y, this);

      const stem = new Particle(oldX, oldY, Mode.STEM);
      stem.plantId = this.plantId;
      stem.genetics = this.genetics;
      stem.parent = oldParent;

      if (oldParent) {
        const budIndex = oldParent.children.indexOf(this);
        if (budIndex !== -1) {
          oldParent.children[budIndex] = stem;
        }
      }

      this.parent = stem;
      stem.children.push(this);
      particles.push(stem);

      if (this.age % genes.internodeSpacing === 0) {
        this.createNode();
      }

      console.log(
        `🌱 Bud grew from (${oldX}, ${oldY}) to (${this.pos.x}, ${this.pos.y}), energy remaining: ${this.currentEnergy}`
      );
    }

    createNode() {
      const stem = this.parent;
      if (stem && (stem.mode === Mode.STEM || stem.mode === Mode.NODE)) {
        if (stem.mode === Mode.STEM) {
          stem.setMode(Mode.NODE);
        }

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
      const seed = new Particle(this.pos.x, this.pos.y + 1, Mode.SEED);
      seed.genetics = new PlantGenetics(this.genetics);
      particles.push(seed);
    }

    destroy() {
      if (this.mode === Mode.ENERGY && this.auraSprite) {
        app.stage.removeChild(this.auraSprite);
        this.auraSprite = null;
      }

      if (this.isPlantPart()) {
        occupancyGrid.removePlant(this.pos.x, this.pos.y);
      }

      if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
      }
      if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
      }

      if (this.sprite && this.sprite.parent) {
        app.stage.removeChild(this.sprite);
      }

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

  // Initialize single seed in center near bottom
  const seedX = Math.floor(cols / 2);
  const seedY = rows - 5;
  const seed = new Particle(seedX, seedY, Mode.SEED);
  particles.push(seed);

  console.log(
    `🌰 Placed seed at center (${seedX}, ${seedY}) with cellspring energy system on ${cols}x${rows} grid`
  );

  // === SECTION 6: MAIN LOOP ===
  function advanceTick() {
    frame++;

    // Spawn energy particles near leaves
    if (Math.random() < CONSTANTS.ENERGY.P_ENERGY) {
      const leaves = particles.filter((p) => p.mode === Mode.LEAF);

      if (leaves.length > 0) {
        const target = leaves[Math.floor(Math.random() * leaves.length)];
        const hasWater = occupancyGrid.hasWater(target.pos.x, target.pos.y);

        if (hasWater) {
          // Look for empty spaces adjacent to the leaf
          const spawnPositions = [];

          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const x = target.pos.x + dx;
              const y = target.pos.y + dy;

              if (x >= 0 && x < cols && y >= 0 && y < rows) {
                const hasPlant = occupancyGrid.isPlantOccupied(x, y);
                const hasEnergyHere = occupancyGrid.hasEnergy(x, y);

                if (!hasPlant && !hasEnergyHere) {
                  spawnPositions.push({ x, y });
                }
              }
            }
          }

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
      if (paused) {
        advanceTick();
      }
      e.preventDefault();
    }
    if (e.key === "p" || e.key === "P") {
      paused = !paused;
      console.log(paused ? "PAUSED - Press SPACE to step" : "RUNNING");
    }
    if (e.key === "r" || e.key === "R") {
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

      const plants = particles.filter((p) => p.isPlantPart());
      if (plants.length > 0) {
        console.log("\n🌱 Plant Particles:");
        plants.forEach((p) => {
          console.log(
            `  ${p.mode} at (${p.pos.x}, ${p.pos.y}) - Plant ID: ${p.plantId} - Energy: ${p.currentEnergy}/${p.energyCapacity}`
          );
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

  console.log(
    "🚀 ABSORPTION-9.JS: Back to basics with cellspring energy system!"
  );
});
