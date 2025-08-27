// === ABSORPTION-8.JS: PRESSURE-BASED RESOURCE FLOW SYSTEM ===
// Enhanced plant simulation with pressure-based water/energy flow inspired by magmasim
// Built on the solid foundation of absorption-5.js

document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size - 64x64 for testing (as per user preference)
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
      P_ENERGY: 0.08, // 8% chance for energy spawning
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

    // NEW: Pressure system parameters
    PRESSURE: {
      FORCE_DECAY: 0.95, // Forces decay slowly to build up pressure
      DIRECT_TRANSFER: 0.8, // 80% of force transferred directly to blocking particle
      INDIRECT_TRANSFER: 0.2, // 20% distributed to alternate paths
      MIN_FORCE_THRESHOLD: 0.05, // Lower threshold to trigger flow more easily
      MAX_FORCE: 15, // Higher maximum pressure force
      FLOW_PROBABILITY_MULTIPLIER: 0.5, // Higher probability = force * multiplier
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

  // === SECTION 2: ENHANCED LAYERED OCCUPANCY GRIDS ===
  class LayeredOccupancyGrid {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;

      // Separate layers for different particle types
      this.plantLayer = new Array(cols * rows).fill(null);
      this.waterLayer = new Array(cols * rows).fill(null);
      this.energyLayer = new Array(cols * rows).fill(null);

      // NEW: Pressure tracking layers
      this.waterPressure = new Array(cols * rows).fill(0);
      this.energyPressure = new Array(cols * rows).fill(0);

      // Visual overlays
      this.waterOverlays = new Array(cols * rows).fill(null);
      this.energyOverlays = new Array(cols * rows).fill(null);
    }

    getIndex(x, y) {
      return y * this.cols + x;
    }

    // Plant layer methods (unchanged)
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

    // NEW: Pressure methods
    addWaterPressure(x, y, force) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);
        this.waterPressure[index] = Math.min(
          this.waterPressure[index] + force,
          CONSTANTS.PRESSURE.MAX_FORCE
        );
      }
    }

    addEnergyPressure(x, y, force) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);
        this.energyPressure[index] = Math.min(
          this.energyPressure[index] + force,
          CONSTANTS.PRESSURE.MAX_FORCE
        );
      }
    }

    getWaterPressure(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.waterPressure[this.getIndex(x, y)];
      }
      return 0;
    }

    getEnergyPressure(x, y) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        return this.energyPressure[this.getIndex(x, y)];
      }
      return 0;
    }

    decayPressures() {
      // Decay all pressure forces each tick
      for (let i = 0; i < this.waterPressure.length; i++) {
        this.waterPressure[i] *= CONSTANTS.PRESSURE.FORCE_DECAY;
        this.energyPressure[i] *= CONSTANTS.PRESSURE.FORCE_DECAY;

        // Remove negligible forces
        if (this.waterPressure[i] < CONSTANTS.PRESSURE.MIN_FORCE_THRESHOLD) {
          this.waterPressure[i] = 0;
        }
        if (this.energyPressure[i] < CONSTANTS.PRESSURE.MIN_FORCE_THRESHOLD) {
          this.energyPressure[i] = 0;
        }
      }
    }

    // Enhanced water layer methods with pressure
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

    // Enhanced energy layer methods with pressure
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

    // Utility methods (unchanged)
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

  // === SECTION 3: PLANT GENETICS SYSTEM (unchanged from absorption-5) ===
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

  // === SECTION 4: ENHANCED PARTICLE CLASS WITH PRESSURE SYSTEM ===
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

      // Movement properties
      this.isFalling = true;
      this.fallingDirection = null;

      // NEW: Pressure system properties
      this.resourceDemand = new Map(); // Tracks resource demands for different sources
      this.lastFlowAttempt = 0; // Tracks when we last tried to flow

      // Logging flags
      this.hasAttemptedSprout = false;
      this.hasLoggedBlocked = false;
      this.hasLoggedFirstRender = false;

      // Create sprite
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);

      if (this.isPlantPart()) {
        this.sprite.alpha = 0.5;
      }

      app.stage.addChild(this.sprite);

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
      } else if (this.mode === Mode.SEED) {
        this.updateSeed();
      } else if (this.mode === Mode.BUD) {
        this.updateBud();
      } else if (this.mode === Mode.FLOWER) {
        this.updateFlower();
        this.updatePlantPart();
      } else if (this.isPlantPart()) {
        this.updatePlantPart();
      }
    }

    // === NEW: PRESSURE-BASED RESOURCE FLOW METHODS ===
    createResourceDemand(resourceType, force) {
      // Creates pressure/demand for a resource at this location
      if (resourceType === "water") {
        occupancyGrid.addWaterPressure(this.pos.x, this.pos.y, force);
      } else if (resourceType === "energy") {
        occupancyGrid.addEnergyPressure(this.pos.x, this.pos.y, force);
      }
    }

    tryPressureBasedFlow(resourceType) {
      // NEW: Pressure-based resource flow inspired by magmasim
      const isWater = resourceType === "water";
      const hasResource = isWater
        ? occupancyGrid.hasWater(this.pos.x, this.pos.y)
        : occupancyGrid.hasEnergy(this.pos.x, this.pos.y);

      if (!hasResource) return false;

      const pressure = isWater
        ? occupancyGrid.getWaterPressure(this.pos.x, this.pos.y)
        : occupancyGrid.getEnergyPressure(this.pos.x, this.pos.y);

      // Calculate flow probability based on pressure
      const flowProbability = Math.min(
        pressure * CONSTANTS.PRESSURE.FLOW_PROBABILITY_MULTIPLIER,
        1.0
      );

      // Only attempt flow if there's sufficient pressure
      if (pressure < CONSTANTS.PRESSURE.MIN_FORCE_THRESHOLD) {
        // Debug: Log why flow isn't happening
        if (pressure > 0) {
          console.log(
            `⚠️ ${this.mode} at (${this.pos.x}, ${
              this.pos.y
            }): ${resourceType} pressure ${pressure.toFixed(
              2
            )} below threshold ${CONSTANTS.PRESSURE.MIN_FORCE_THRESHOLD}`
          );
        }
        return false;
      }

      // Try to flow based on probability
      if (Math.random() < flowProbability) {
        console.log(
          `🔄 ${this.mode} at (${this.pos.x}, ${
            this.pos.y
          }) attempting ${resourceType} flow with pressure ${pressure.toFixed(
            2
          )}, probability ${flowProbability.toFixed(2)}`
        );
        return this.attemptResourceFlow(resourceType, pressure);
      }

      return false;
    }

    attemptResourceFlow(resourceType, pressure) {
      // Attempt to flow resource to neighboring plant cells
      const neighbors = this.getResourceFlowNeighbors(resourceType);

      for (const neighbor of neighbors) {
        const canFlow =
          resourceType === "water"
            ? !occupancyGrid.hasWater(neighbor.x, neighbor.y)
            : !occupancyGrid.hasEnergy(neighbor.x, neighbor.y);

        if (canFlow) {
          // Flow resource to neighbor
          const resource =
            resourceType === "water"
              ? occupancyGrid.getWater(this.pos.x, this.pos.y)
              : occupancyGrid.getEnergy(this.pos.x, this.pos.y);

          if (resource) {
            // Remove from current position
            if (resourceType === "water") {
              occupancyGrid.setWater(this.pos.x, this.pos.y, null);
              occupancyGrid.setWater(neighbor.x, neighbor.y, resource);
            } else {
              occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
              occupancyGrid.setEnergy(neighbor.x, neighbor.y, resource);
            }

            // Update resource particle position
            resource.pos.x = neighbor.x;
            resource.pos.y = neighbor.y;
            resource.sprite.x = neighbor.x * scaleSize;
            resource.sprite.y = neighbor.y * scaleSize;

            if (resource.auraSprite) {
              resource.auraSprite.x = (neighbor.x - 1) * scaleSize;
              resource.auraSprite.y = (neighbor.y - 1) * scaleSize;
            }

            console.log(
              `💧 ${resourceType} flowed from (${this.pos.x}, ${this.pos.y}) to (${neighbor.x}, ${neighbor.y}) via pressure`
            );
            return true;
          }
        } else {
          // Neighbor is blocked - distribute pressure
          this.distributePressureToNeighbor(neighbor, resourceType, pressure);
        }
      }

      return false;
    }

    distributePressureToNeighbor(neighbor, resourceType, pressure) {
      // Distribute pressure forces when flow is blocked (inspired by magmasim)
      const directForce = pressure * CONSTANTS.PRESSURE.DIRECT_TRANSFER;
      const indirectForce = pressure * CONSTANTS.PRESSURE.INDIRECT_TRANSFER;

      // Direct pressure to blocking neighbor
      if (resourceType === "water") {
        occupancyGrid.addWaterPressure(neighbor.x, neighbor.y, directForce);
      } else {
        occupancyGrid.addEnergyPressure(neighbor.x, neighbor.y, directForce);
      }

      // Indirect pressure to alternate paths
      const alternates = this.getAlternateFlowPaths(neighbor, resourceType);
      for (const alt of alternates) {
        if (resourceType === "water") {
          occupancyGrid.addWaterPressure(
            alt.x,
            alt.y,
            indirectForce / alternates.length
          );
        } else {
          occupancyGrid.addEnergyPressure(
            alt.x,
            alt.y,
            indirectForce / alternates.length
          );
        }
      }
    }

    getResourceFlowNeighbors(resourceType) {
      // Get neighbors for resource flow based on plant hierarchy and adjacency
      let neighbors = [];

      if (resourceType === "water") {
        // Water flows UPWARD: from parent to children (root to extremities)
        if (this.children) {
          for (const child of this.children) {
            if (child.isPlantPart && child.isPlantPart()) {
              neighbors.push({
                x: child.pos.x,
                y: child.pos.y,
                plant: child,
                priority: 1,
              });
            }
          }
        }

        // Also check adjacent plant cells that are higher (closer to extremities)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = this.pos.x + dx;
            const ny = this.pos.y + dy;

            if (
              nx >= 0 &&
              nx < cols &&
              ny >= 0 &&
              ny < rows &&
              ny < this.pos.y
            ) {
              const plant = occupancyGrid.getPlant(nx, ny);
              if (plant && plant.plantId === this.plantId) {
                const exists = neighbors.some((n) => n.x === nx && n.y === ny);
                if (!exists) {
                  neighbors.push({
                    x: nx,
                    y: ny,
                    plant: plant,
                    priority: 2,
                  });
                }
              }
            }
          }
        }
      } else {
        // Energy flows DOWNWARD: from children to parent (extremities to root)
        if (
          this.parent &&
          this.parent.isPlantPart &&
          this.parent.isPlantPart()
        ) {
          neighbors.push({
            x: this.parent.pos.x,
            y: this.parent.pos.y,
            plant: this.parent,
            priority: 1,
          });
        }

        if (this.children) {
          for (const child of this.children) {
            if (child.isPlantPart && child.isPlantPart()) {
              neighbors.push({
                x: child.pos.x,
                y: child.pos.y,
                plant: child,
                priority: 2,
              });
            }
          }
        }

        // Also check adjacent plant cells that are lower (closer to root)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = this.pos.x + dx;
            const ny = this.pos.y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const plant = occupancyGrid.getPlant(nx, ny);
              if (plant && plant.plantId === this.plantId) {
                const exists = neighbors.some((n) => n.x === nx && n.y === ny);
                if (!exists) {
                  // Priority 1 if cell is lower (toward root), priority 3 if higher
                  const priority = ny > this.pos.y ? 1 : 3;
                  neighbors.push({
                    x: nx,
                    y: ny,
                    plant: plant,
                    priority: priority,
                  });
                }
              }
            }
          }
        }
      }

      // Sort by priority
      neighbors.sort((a, b) => a.priority - b.priority);
      return neighbors;
    }

    getAlternateFlowPaths(blockedNeighbor, resourceType) {
      // Get alternate flow paths when primary path is blocked
      const alternates = [];

      // Check adjacent cells that are part of the same plant
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const plant = occupancyGrid.getPlant(nx, ny);
            if (
              plant &&
              plant.plantId === this.plantId &&
              (nx !== blockedNeighbor.x || ny !== blockedNeighbor.y)
            ) {
              alternates.push({ x: nx, y: ny, plant });
            }
          }
        }
      }

      return alternates;
    }

    // === ENHANCED PARTICLE MOVEMENT ===
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

    // === VISUAL OVERLAY METHODS ===
    createWaterOverlay() {
      if (this.mode !== Mode.WATER) return;

      if (!this.waterOverlay) {
        this.waterOverlay = new PIXI.Graphics();
        this.waterOverlay.beginFill(0x0066ff, 0.2);
        this.waterOverlay.drawRect(0, 0, scaleSize, scaleSize);
        this.waterOverlay.endFill();
        this.waterOverlay.x = this.pos.x * scaleSize;
        this.waterOverlay.y = this.pos.y * scaleSize;
        app.stage.addChild(this.waterOverlay);
      }

      if (!this.waterAura) {
        this.waterAura = new PIXI.Graphics();
        this.waterAura.beginFill(0x0066ff, 0.1);
        this.waterAura.drawRect(0, 0, scaleSize * 3, scaleSize * 3);
        this.waterAura.endFill();
        this.waterAura.x = (this.pos.x - 1) * scaleSize;
        this.waterAura.y = (this.pos.y - 1) * scaleSize;
        app.stage.addChildAt(this.waterAura, 0);
      }
    }

    updateWaterOverlay() {
      if (this.waterOverlay) {
        this.waterOverlay.x = this.pos.x * scaleSize;
        this.waterOverlay.y = this.pos.y * scaleSize;
      }
      if (this.waterAura) {
        this.waterAura.x = (this.pos.x - 1) * scaleSize;
        this.waterAura.y = (this.pos.y - 1) * scaleSize;
      }
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
      // Water physics with pressure awareness
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
          this.createWaterOverlay();

          console.log(
            `💧 Water absorbed by SEED (root uptake) at (${this.pos.x}, ${this.pos.y})`
          );

          // NEW: Create initial water pressure to start flow
          this.createResourceDemand("water", 2.0);
          plant.tryPressureBasedFlow("water");
        }
      }
    }

    updateEnergy() {
      // Energy physics with enhanced pressure system
      const plantAtPosition = occupancyGrid.getPlant(this.pos.x, this.pos.y);

      // Energy bound to plant matter is stable
      if (
        plantAtPosition &&
        (plantAtPosition.plantId || plantAtPosition.mode === Mode.SEED)
      ) {
        // Try pressure-based flow periodically
        if (this.age % 3 === 0) {
          // Every 3 ticks
          this.tryPressureBasedFlow("energy");
        }
        return;
      }

      // Energy in empty space - check for absorption
      const adjacentLeaves = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const plant = occupancyGrid.getPlant(nx, ny);
            if (plant && plant.plantId && plant.mode === Mode.LEAF) {
              const hasWater = occupancyGrid.hasWater(nx, ny);
              if (hasWater && !occupancyGrid.hasEnergy(nx, ny)) {
                adjacentLeaves.push({ plant, x: nx, y: ny });
              }
            }
          }
        }
      }

      if (adjacentLeaves.length > 0) {
        const { plant: leaf, x: leafX, y: leafY } = adjacentLeaves[0];

        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        occupancyGrid.setEnergy(leafX, leafY, this);

        this.pos.x = leafX;
        this.pos.y = leafY;
        this.sprite.x = leafX * scaleSize;
        this.sprite.y = leafY * scaleSize;
        if (this.auraSprite) {
          this.auraSprite.x = (leafX - 1) * scaleSize;
          this.auraSprite.y = (leafY - 1) * scaleSize;
        }

        console.log(
          `⚡ Energy absorbed by leaf: moved from (${this.pos.x}, ${this.pos.y}) to (${leafX}, ${leafY})`
        );

        // Respiration effect
        const waterParticle = occupancyGrid.getWater(leafX, leafY);
        if (waterParticle && Math.random() < 0.3) {
          occupancyGrid.setWater(leafX, leafY, null);
          const vapor = new Particle(leafX, leafY, Mode.VAPOR);
          particles.push(vapor);
          if (waterParticle && waterParticle.destroy) {
            waterParticle.destroy();
          }
        }

        // NEW: Create energy pressure to initiate flow
        this.createResourceDemand("energy", 2.0);
        leaf.tryPressureBasedFlow("energy");
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
        if (this.unusedFrames > 20) {
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

    updateSeed() {
      // Enhanced seed with pressure awareness
      this.absorbWaterFromEnvironment();

      if (!this.hasAttemptedSprout) {
        const energyCount = particles.filter(
          (p) =>
            p.mode === Mode.ENERGY &&
            p.pos.x === this.pos.x &&
            p.pos.y === this.pos.y
        ).length;

        if (energyCount >= 3) {
          this.hasAttemptedSprout = true;
          this.sprout();
        }
      }

      // Try pressure-based resource flow
      if (this.hasAttemptedSprout && this.children.length > 0) {
        this.tryPressureBasedFlow("water");
        this.tryPressureBasedFlow("energy");
      }
    }

    absorbWaterFromEnvironment() {
      if (occupancyGrid.hasWater(this.pos.x, this.pos.y)) return;

      let plantNeedsWater = false;
      if (this.children && this.children.length > 0) {
        for (const child of this.children) {
          if (child && child.isPlantPart && child.isPlantPart()) {
            if (!occupancyGrid.hasWater(child.pos.x, child.pos.y)) {
              plantNeedsWater = true;
              break;
            }
          }
        }
      } else {
        plantNeedsWater = true;
      }

      if (!plantNeedsWater) return;

      if (this.age % 3 !== 0) return;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const waterInSpace = particles.find(
              (p) =>
                p.mode === Mode.WATER &&
                p.pos.x === nx &&
                p.pos.y === ny &&
                !occupancyGrid.isPlantOccupied(nx, ny)
            );

            if (waterInSpace) {
              waterInSpace.pos.x = this.pos.x;
              waterInSpace.pos.y = this.pos.y;
              waterInSpace.sprite.x = this.pos.x * scaleSize;
              waterInSpace.sprite.y = this.pos.y * scaleSize;
              occupancyGrid.setWater(this.pos.x, this.pos.y, waterInSpace);
              waterInSpace.createWaterOverlay();

              // NEW: Create water pressure for flow initiation
              this.createResourceDemand("water", 1.5);

              console.log(
                `💧 Seed absorbed water from adjacent space (${nx}, ${ny})`
              );
              return;
            }
          }
        }
      }
    }

    updateBud() {
      // Enhanced bud with pressure-based resource pulling
      if (!this.genetics) return;
      if (this.mode !== Mode.BUD) return;

      // Create strong demand for both resources EVERY tick
      this.createResourceDemand("energy", 5.0);
      this.createResourceDemand("water", 5.0);

      // Enhanced resource pulling with pressure - try multiple times per tick
      for (let i = 0; i < 3; i++) {
        this.pullResourcesWithPressure();

        // Check if we have resources after each attempt
        const hasEnergy = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
        const hasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

        if (hasEnergy && hasWater) {
          console.log(
            `🌱 Bud at (${this.pos.x}, ${this.pos.y}) has both energy + water, growing`
          );
          this.grow();
          return;
        }
      }

      const hasEnergyAfterPull = occupancyGrid.hasEnergy(
        this.pos.x,
        this.pos.y
      );
      const hasWaterAfterPull = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      // Debug logging only every 10 ticks to reduce spam
      if (this.age % 10 === 0 && (!hasEnergyAfterPull || !hasWaterAfterPull)) {
        console.log(
          `⏳ Bud at (${this.pos.x}, ${this.pos.y}) waiting: energy=${hasEnergyAfterPull}, water=${hasWaterAfterPull}`
        );
      }
    }

    pullResourcesWithPressure() {
      // Enhanced resource pulling using pressure system
      const hasEnergyHere = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      const hasWaterHere = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      if (!hasEnergyHere) {
        // Create strong energy demand at bud location
        this.createResourceDemand("energy", 4.0);

        // Try to pull energy from immediate parent first
        if (this.parent && this.parent.isPlantPart()) {
          this.parent.tryPressureBasedFlow("energy");
        }

        // Also trigger flow from all plant parts in the hierarchy
        let current = this.parent;
        while (current) {
          if (current.isPlantPart && current.isPlantPart()) {
            current.tryPressureBasedFlow("energy");
          }
          current = current.parent;
        }
      }

      if (!hasWaterHere) {
        // Create strong water demand at bud location
        this.createResourceDemand("water", 4.0);

        // Try to pull water from immediate parent first
        if (this.parent && this.parent.isPlantPart()) {
          this.parent.tryPressureBasedFlow("water");
        }

        // Also trigger flow from all plant parts in the hierarchy
        let current = this.parent;
        while (current) {
          if (current.isPlantPart && current.isPlantPart()) {
            current.tryPressureBasedFlow("water");

            // Request seed to absorb more water if needed
            if (current.mode === Mode.SEED && this.age % 5 === 0) {
              current.absorbWaterFromEnvironment();
            }
          }
          current = current.parent;
        }
      }
    }

    updatePlantPart() {
      // Enhanced plant part with periodic pressure-based flow attempts
      if (this.age % 5 === 0) {
        // Every 5 ticks
        this.tryPressureBasedFlow("water");
        this.tryPressureBasedFlow("energy");
      }
    }

    updateFlower() {
      if (
        occupancyGrid.hasEnergy(this.pos.x, this.pos.y) &&
        Math.random() < 0.01
      ) {
        this.reproduce();
      }
    }

    // === PLANT GROWTH METHODS (enhanced with pressure) ===
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

      // NEW: Create initial flow pressure for newly sprouted plant
      this.createResourceDemand("water", 2.0);
      this.createResourceDemand("energy", 2.0);
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

      // Consume resources for growth
      const energyParticle = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
      if (energyParticle) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        energyParticle.destroy();
      }

      const waterParticle = occupancyGrid.getWater(this.pos.x, this.pos.y);
      if (waterParticle) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
        waterParticle.destroy();
      }

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

      if (this.energyOverlay) {
        app.stage.removeChild(this.energyOverlay);
        this.energyOverlay = null;
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

  // Bootstrap energy for seed
  const BOOTSTRAP_ENERGY_COUNT = 10;
  for (let i = 0; i < BOOTSTRAP_ENERGY_COUNT; i++) {
    const energy = new Particle(seedX, seedY, Mode.ENERGY);
    particles.push(energy);
  }

  console.log(
    `🌰 Placed seed at center (${seedX}, ${seedY}) with ${BOOTSTRAP_ENERGY_COUNT} bootstrap energy particles on ${cols}x${rows} grid`
  );

  // === SECTION 6: MAIN LOOP WITH PRESSURE SYSTEM ===
  function advanceTick() {
    frame++;

    // NEW: Decay pressure forces each tick
    occupancyGrid.decayPressures();

    // Spawn energy particles near leaves
    if (Math.random() < CONSTANTS.FLUX.P_ENERGY) {
      const leaves = particles.filter((p) => p.mode === Mode.LEAF);
      const energyTargets = leaves;

      if (energyTargets.length > 0) {
        const target =
          energyTargets[Math.floor(Math.random() * energyTargets.length)];
        const hasWater = occupancyGrid.hasWater(target.pos.x, target.pos.y);
        const hasEnergy = occupancyGrid.hasEnergy(target.pos.x, target.pos.y);

        if (hasWater && !hasEnergy) {
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
      ? `PAUSED - Tick ${frame} - Press SPACE to step | R for report | P to toggle pressure visualization`
      : `RUNNING - Tick ${frame} | R for report | P to toggle pressure visualization`;

    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }

  // Start the simulation
  mainLoop();

  // === SECTION 7: ENHANCED CONTROLS ===
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

      // NEW: Pressure report
      let totalWaterPressure = 0;
      let totalEnergyPressure = 0;
      for (let i = 0; i < occupancyGrid.waterPressure.length; i++) {
        totalWaterPressure += occupancyGrid.waterPressure[i];
        totalEnergyPressure += occupancyGrid.energyPressure[i];
      }
      console.log(`Total Water Pressure: ${totalWaterPressure.toFixed(2)}`);
      console.log(`Total Energy Pressure: ${totalEnergyPressure.toFixed(2)}`);

      const plants = particles.filter((p) => p.isPlantPart());
      if (plants.length > 0) {
        console.log("\n🌱 Plant Particles:");
        plants.forEach((p) => {
          console.log(
            `  ${p.mode} at (${p.pos.x}, ${p.pos.y}) - Plant ID: ${p.plantId}`
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
    "🚀 ABSORPTION-8.JS: Pressure-based resource flow system initialized!"
  );
});
