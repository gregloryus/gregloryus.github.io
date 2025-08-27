// === SECTION 1: INITIALIZATION AND CONSTANTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size as per brief: _x_ cells
  const GRID_WIDTH = 64;
  const GRID_HEIGHT = 64;
  const SCALE_SIZE = 8;

  const app = new PIXI.Application({
    width: GRID_WIDTH * SCALE_SIZE,
    height: GRID_HEIGHT * SCALE_SIZE,
    backgroundColor: 0x000000,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // === COMPREHENSIVE CONSTANTS SYSTEM ===
  const CONSTANTS = {
    // World and canvas parameters
    WORLD: {
      SCALE_SIZE: SCALE_SIZE,
      TICK_INTERVAL: 40,
      COLS: GRID_WIDTH,
      ROWS: GRID_HEIGHT,
      SEED_DISTANCE_FROM_BOTTOM: 5, // Seed placement: rows - _
    },

    // Visual appearance constants
    VISUAL: {
      // Alpha transparency values
      PLANT_ALPHA: 0.5, // Plant particles base transparency
      ENERGY_PARTICLE_ALPHA: 0.3, // Individual energy particles
      ENERGY_AURA_ALPHA: 0.3, // Energy particle _x_ aura
      WATER_AURA_ALPHA: 0.3, // Water particle aura when bound
      WATER_OVERLAY_ALPHA: 0.3, // Water layer overlays
      ENERGY_OVERLAY_ALPHA: 0.3, // Energy layer overlays
      PHANTOM_ALPHA: 1.0, // Debug phantom images

      // Sizes and dimensions
      AURA_SIZE: 3, // _x_ aura around particles
      PHANTOM_VERTICAL_OFFSET_RATIO: 0.5, // _/_ of canvas height
      PHANTOM_HORIZONTAL_OFFSET_RATIO: 0.1, // _/_ of canvas width

      // UI positioning
      UI_MARGIN: 10,
      TEXT_FONT_SIZE: 12,
      TEXT_LINE_HEIGHT: 30,
    },

    // Physics and movement constants
    PHYSICS: {
      // Bound particle flow probabilities
      BOUND_FLOW_PREFERRED_CHANCE: 0.9, // _% chance for preferred vs any direction in bound particle flow

      // Unbound water physics probabilities (monochromagic-style)
      WATER_LEFT_BIAS_CHANCE: 0.5, // _% chance unbound water chooses left vs right when blocked
      WATER_DIAGONAL_CHANCE: 0.3, // _% chance unbound water takes diagonal path vs lateral

      // Movement boundaries
      NEIGHBOR_OFFSET_MIN: -1,
      NEIGHBOR_OFFSET_MAX: 1,
      NEIGHBOR_OFFSET_CENTER: 0,
    },

    // Particle spawning and flux
    FLUX: {
      P_ENERGY: 0.5, // _% chance per tick for energy spawning near leaves
      FLOWER_REPRODUCTION_CHANCE: 0.01, // 1% chance per tick for flower reproduction
    },

    // Plant genetics and growth
    GENETICS: {
      INTERNODE_SPACING: 4, // Fixed spacing between nodes
      BUD_GROWTH_LIMIT: 10, // Maximum growth steps for buds
    },

    // Growth and maturity thresholds
    GROWTH: {
      ENERGY_TO_GROW: 5,
      GROWTH_COST: 3,
      MAX_ENERGY: 20,
      PLANT_MATURITY_SIZE: 15, // Plant becomes flower at this size
      PLANT_FALLBACK_MATURITY_SIZE: 10, // Fallback flower size when blocked
    },

    // Seed and bootstrap system
    SEED: {
      INITIAL_ENERGY_CAPACITY: 10, // Seed starts with capacity for _ energy
      BOOTSTRAP_ENERGY_COUNT: 10, // Number of _ particles to start with
      ENERGY_GIVEN_START: 0, // Initial energy given counter
    },

    // Resource flow timing
    FLOW: {
      FIXED_PARTICLE_UPDATE_FREQUENCY: 1, // Fixed particles move every _ ticks
      EXCESS_PARTICLE_UPDATE_FREQUENCY: 1, // Excess particles move every _ tick
      RANDOM_OFFSET_MAX: 10, // Maximum random offset for flow timing
    },

    // Simulation initialization
    SIMULATION: {
      INITIAL_WATER_COUNT: 400,
      INITIAL_SEED_COUNT: 1,
      FAST_FORWARD_FACTOR: 10,
      FRAME_START: 0,
      ID_COUNTER_START: 1,
    },

    // UI text positioning
    UI: {
      FPS_TEXT_X: 10,
      FPS_TEXT_Y: 10,
      PARTICLE_COUNT_X: 10,
      PARTICLE_COUNT_Y: 40,
      FAST_FORWARD_X: 10,
      FAST_FORWARD_Y: 70,
      STATUS_TEXT_X: 10,
      STATUS_TEXT_Y: 100,
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
    fontSize: CONSTANTS.VISUAL.TEXT_FONT_SIZE,
    fill: "white",
  });
  const fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  fpsText.x = CONSTANTS.UI.FPS_TEXT_X;
  fpsText.y = CONSTANTS.UI.FPS_TEXT_Y;
  app.stage.addChild(fpsText);

  const particleCountText = new PIXI.Text("Particles: 0", fpsTextStyle);
  particleCountText.x = CONSTANTS.UI.PARTICLE_COUNT_X;
  particleCountText.y = CONSTANTS.UI.PARTICLE_COUNT_Y;
  app.stage.addChild(particleCountText);

  const fastForwardText = new PIXI.Text("", fpsTextStyle);
  fastForwardText.x = CONSTANTS.UI.FAST_FORWARD_X;
  fastForwardText.y = CONSTANTS.UI.FAST_FORWARD_Y;
  app.stage.addChild(fastForwardText);

  const statusText = new PIXI.Text(
    "PAUSED - Press SPACE to step | R for report",
    fpsTextStyle
  );
  statusText.x = CONSTANTS.UI.STATUS_TEXT_X;
  statusText.y = CONSTANTS.UI.STATUS_TEXT_Y;
  app.stage.addChild(statusText);

  // Core simulation parameters
  let particles = [];
  let frame = CONSTANTS.SIMULATION.FRAME_START;
  let fastForward = false;
  let fastForwardFactor = CONSTANTS.SIMULATION.FAST_FORWARD_FACTOR;
  let paused = true; // Start paused for controlled study
  let lastRenderTime = performance.now();
  let idCounter = CONSTANTS.SIMULATION.ID_COUNTER_START;

  // Grid setup with fixed dimensions
  let scaleSize = CONSTANTS.WORLD.SCALE_SIZE;
  let cols = CONSTANTS.WORLD.COLS;
  let rows = CONSTANTS.WORLD.ROWS;

  // Particle modes and states
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

  const ParticleState = {
    UNBOUND: "UNBOUND", // Free-floating, can move anywhere
    BOUND: "BOUND", // Attached to plant, follows plant flow rules
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
          overlay.beginFill(0x0066ff, CONSTANTS.VISUAL.WATER_OVERLAY_ALPHA);
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
          overlay.beginFill(0xffff00, CONSTANTS.VISUAL.ENERGY_OVERLAY_ALPHA);
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
      for (
        let dx = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
        dx <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
        dx++
      ) {
        for (
          let dy = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
          dy <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
          dy++
        ) {
          if (
            dx === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER &&
            dy === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER
          )
            continue;
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
      for (
        let dx = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
        dx <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
        dx++
      ) {
        for (
          let dy = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
          dy <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
          dy++
        ) {
          if (
            dx === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER &&
            dy === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER
          )
            continue;
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
    constructor(parent = null) {
      if (parent) {
        this.inheritFromParent(parent);
      } else {
        this.generateRandom();
      }
    }

    generateRandom() {
      this.genes = {
        // Only keep properties that are actually used
        internodeSpacing: CONSTANTS.GENETICS.INTERNODE_SPACING,
        budGrowthLimit: CONSTANTS.GENETICS.BUD_GROWTH_LIMIT,
      };
    }

    inheritFromParent(parent) {
      this.genes = JSON.parse(JSON.stringify(parent.genes));
      // No mutation since we have fixed genetics
    }
  }

  // === SECTION 4: PARTICLE CLASS ===
  class Particle {
    constructor(x, y, mode = Mode.WATER) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = mode;
      this.age = 0;
      this.state = ParticleState.UNBOUND; // All particles start unbound

      // Plant-specific properties
      this.plantId = null;
      this.genetics = null;
      this.parent = null;
      this.children = [];
      this.hasAttemptedSprout = false;
      this.hasAttemptedGrow = false;
      this.hasLoggedBlocked = false;
      this.hasLoggedGrowth = false;
      this.hasLoggedStemCreation = false;
      this.hasLoggedFirstRender = false;
      this.hasLoggedNoGenetics = false;
      this.hasLoggedResourceCheck = false;
      this.hasLoggedAbsorption = false;

      // Movement properties (for flux particles)
      this.isFalling = true;
      this.fallingDirection = null;
      this.flowDirection = null; // For bound particle flow

      // Seed capacity tracking
      this.initialEnergyCapacity = CONSTANTS.SEED.INITIAL_ENERGY_CAPACITY;
      this.energyGiven = CONSTANTS.SEED.ENERGY_GIVEN_START;

      // Always create sprite
      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);

      // Set plant particles to specified alpha (painted first, resources painted over)
      if (this.isPlantPart()) {
        this.sprite.alpha = CONSTANTS.VISUAL.PLANT_ALPHA;
      }

      app.stage.addChild(this.sprite);

      // Create aura for bound particles
      if (this.state === ParticleState.BOUND) {
        this.createAura();
      }

      // Create aura for energy particles (subtle visual feedback)
      if (this.mode === Mode.ENERGY && !this.auraSprite) {
        this.auraSprite = new PIXI.Graphics();
        this.auraSprite.beginFill(0xffff00, CONSTANTS.VISUAL.ENERGY_AURA_ALPHA);
        this.auraSprite.drawRect(
          0,
          0,
          scaleSize * CONSTANTS.VISUAL.AURA_SIZE,
          scaleSize * CONSTANTS.VISUAL.AURA_SIZE
        );
        this.auraSprite.endFill();
        // Center the aura on the energy particle
        this.auraSprite.x = (x - 1) * scaleSize;
        this.auraSprite.y = (y - 1) * scaleSize;
        app.stage.addChildAt(this.auraSprite, 0); // Add behind other sprites

        // Make energy particle itself low alpha
        this.sprite.alpha = CONSTANTS.VISUAL.ENERGY_PARTICLE_ALPHA;
      }

      // Set in appropriate occupancy grid layer
      if (this.isPlantPart()) {
        occupancyGrid.setPlant(x, y, this);
      } else if (this.mode === Mode.ENERGY) {
        // Only register in energy layer if unbound
        if (this.state === ParticleState.UNBOUND) {
          occupancyGrid.setEnergy(x, y, this);
        }
      } else if (this.mode === Mode.WATER) {
        // Only register in water layer if unbound
        if (this.state === ParticleState.UNBOUND) {
          occupancyGrid.setWater(x, y, this);
        }
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

    createAura() {
      // Always create phantom image for bound particles, even if aura already exists
      if (!this.phantomSprite) {
        this.createPhantomImage();
      }

      if (this.auraSprite) return; // Already has aura

      const auraColor = this.mode === Mode.WATER ? 0x0066ff : 0xffff00;
      const auraAlpha =
        this.mode === Mode.WATER
          ? CONSTANTS.VISUAL.WATER_AURA_ALPHA
          : CONSTANTS.VISUAL.ENERGY_AURA_ALPHA;

      this.auraSprite = new PIXI.Graphics();
      this.auraSprite.beginFill(auraColor, auraAlpha);
      this.auraSprite.drawRect(
        0,
        0,
        scaleSize * CONSTANTS.VISUAL.AURA_SIZE,
        scaleSize * CONSTANTS.VISUAL.AURA_SIZE
      );
      this.auraSprite.endFill();
      this.auraSprite.x = (this.pos.x - 1) * scaleSize;
      this.auraSprite.y = (this.pos.y - 1) * scaleSize;
      app.stage.addChildAt(this.auraSprite, 0);

      // Aura created
    }

    createPhantomImage() {
      if (this.phantomSprite) return; // Already has phantom

      // Phantom offset in CELLS: configurable ratios of canvas dimensions
      const verticalOffset = Math.floor(
        CONSTANTS.WORLD.ROWS * CONSTANTS.VISUAL.PHANTOM_VERTICAL_OFFSET_RATIO
      );
      const horizontalOffset = Math.floor(
        CONSTANTS.WORLD.COLS * CONSTANTS.VISUAL.PHANTOM_HORIZONTAL_OFFSET_RATIO
      );

      // Energy = left, Water = right
      const phantomOffsetXCells =
        this.mode === Mode.ENERGY ? -horizontalOffset : horizontalOffset;
      const phantomOffsetYCells = -verticalOffset;

      // Convert to pixel offsets
      const phantomOffsetX = phantomOffsetXCells * scaleSize;
      const phantomOffsetY = phantomOffsetYCells * scaleSize;

      this.phantomSprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.phantomSprite.x = this.pos.x * scaleSize + phantomOffsetX;
      this.phantomSprite.y = this.pos.y * scaleSize + phantomOffsetY;
      this.phantomSprite.scale.set(scaleSize, scaleSize);
      this.phantomSprite.alpha = CONSTANTS.VISUAL.PHANTOM_ALPHA;
      this.phantomSprite.visible = true; // Always visible regardless of main sprite

      // Ensure phantom stays on screen by clamping position
      this.phantomSprite.x = Math.max(
        0,
        Math.min(this.phantomSprite.x, (CONSTANTS.WORLD.COLS - 1) * scaleSize)
      );
      this.phantomSprite.y = Math.max(
        0,
        Math.min(this.phantomSprite.y, (CONSTANTS.WORLD.ROWS - 1) * scaleSize)
      );

      app.stage.addChild(this.phantomSprite);

      // Phantom image created
    }

    updatePhantomPosition() {
      if (this.phantomSprite) {
        // Use same cell-based offsets as createPhantomImage
        const verticalOffset = Math.floor(
          CONSTANTS.WORLD.ROWS * CONSTANTS.VISUAL.PHANTOM_VERTICAL_OFFSET_RATIO
        );
        const horizontalOffset = Math.floor(
          CONSTANTS.WORLD.COLS *
            CONSTANTS.VISUAL.PHANTOM_HORIZONTAL_OFFSET_RATIO
        );

        const phantomOffsetXCells =
          this.mode === Mode.ENERGY ? -horizontalOffset : horizontalOffset;
        const phantomOffsetYCells = -verticalOffset;

        const phantomOffsetX = phantomOffsetXCells * scaleSize;
        const phantomOffsetY = phantomOffsetYCells * scaleSize;

        this.phantomSprite.x = this.pos.x * scaleSize + phantomOffsetX;
        this.phantomSprite.y = this.pos.y * scaleSize + phantomOffsetY;

        // Ensure phantom stays on screen by clamping position
        this.phantomSprite.x = Math.max(
          0,
          Math.min(this.phantomSprite.x, (CONSTANTS.WORLD.COLS - 1) * scaleSize)
        );
        this.phantomSprite.y = Math.max(
          0,
          Math.min(this.phantomSprite.y, (CONSTANTS.WORLD.ROWS - 1) * scaleSize)
        );
      }
    }

    removeAura() {
      if (this.auraSprite) {
        app.stage.removeChild(this.auraSprite);
        this.auraSprite = null;
      }
      if (this.phantomSprite) {
        app.stage.removeChild(this.phantomSprite);
        this.phantomSprite = null;
      }
    }

    bindToPlant(plantId) {
      this.state = ParticleState.BOUND;
      this.plantId = plantId;
      this.createAura();

      console.log(
        `🔗 ${this.mode} particle bound to plant ${plantId} at (${this.pos.x}, ${this.pos.y})`
      );

      // Remove from occupancy grid layers (bound particles don't use these)
      if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
      } else if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
      }
    }

    unbindFromPlant() {
      this.state = ParticleState.UNBOUND;
      this.plantId = null;
      this.removeAura();

      // Re-register in occupancy grid layers
      if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, this);
      } else if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(this.pos.x, this.pos.y, this);
      }
    }

    // Get current seed capacity (shrinks as energy is given out)
    getCurrentSeedCapacity() {
      if (this.mode !== Mode.SEED) return 1;
      return Math.max(1, this.initialEnergyCapacity - this.energyGiven);
    }

    // Count bound particles of a specific type at this position
    countBoundParticlesAt(x, y, particleMode) {
      return particles.filter(
        (p) =>
          p.state === ParticleState.BOUND &&
          p.mode === particleMode &&
          p.pos.x === x &&
          p.pos.y === y
      ).length;
    }

    // Get connected plant neighbors for bound particle flow
    getConnectedPlantNeighbors() {
      const neighbors = [];
      const plantHere = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (!plantHere || plantHere.plantId !== this.plantId) return neighbors;

      // Add parent
      if (plantHere.parent) {
        neighbors.push({
          x: plantHere.parent.pos.x,
          y: plantHere.parent.pos.y,
          plant: plantHere.parent,
          direction: "parent",
        });
      }

      // Add children
      plantHere.children.forEach((child) => {
        neighbors.push({
          x: child.pos.x,
          y: child.pos.y,
          plant: child,
          direction: "child",
        });
      });

      return neighbors;
    }

    // Find least crowded target among candidates
    findLeastCrowdedTarget(candidates) {
      if (candidates.length === 0) return null;

      // Sort by particle count (ascending)
      candidates.sort((a, b) => {
        const aCount = this.countBoundParticlesAt(a.x, a.y, this.mode);
        const bCount = this.countBoundParticlesAt(b.x, b.y, this.mode);
        return aCount - bCount;
      });

      return candidates[0];
    }

    // Simple preference for flow direction (no scoring)
    isPreferredFlowDirection(neighbor) {
      if (this.mode === Mode.WATER) {
        return neighbor.direction === "child"; // Water prefers moving up to children
      }
      if (this.mode === Mode.ENERGY) {
        return neighbor.direction === "parent"; // Energy prefers moving down to parent
      }
      return true;
    }

    // Bound particle flow logic - like water physics but for plant connections
    updateBoundParticle() {
      const localPressure = this.countBoundParticlesAt(
        this.pos.x,
        this.pos.y,
        this.mode
      );

      // Update frequency based on pressure with random offset (like your original plan)
      const updateFrequency =
        localPressure > 1
          ? CONSTANTS.FLOW.EXCESS_PARTICLE_UPDATE_FREQUENCY
          : CONSTANTS.FLOW.FIXED_PARTICLE_UPDATE_FREQUENCY;

      // Add random offset for fixed particles to prevent synchronization
      if (!this.randomOffset) {
        this.randomOffset = Math.floor(
          Math.random() * CONSTANTS.FLOW.RANDOM_OFFSET_MAX
        );
      }
      const randomOffset = localPressure > 1 ? 0 : this.randomOffset;
      if ((frame + randomOffset) % updateFrequency !== 0) return;

      // Get connected plant neighbors only
      const neighbors = this.getConnectedPlantNeighbors();
      if (neighbors.length === 0) return;

      // Initialize flow direction if needed (like water bouncing)
      if (!this.flowDirection) {
        this.flowDirection =
          Math.random() < CONSTANTS.PHYSICS.BOUND_FLOW_PREFERRED_CHANCE
            ? "preferred"
            : "any";
      }

      // Try preferred direction first (like water trying to go down first)
      if (this.flowDirection === "preferred") {
        const preferredNeighbors = neighbors.filter((n) =>
          this.isPreferredFlowDirection(n)
        );
        const target = this.findLeastCrowdedTarget(preferredNeighbors);

        if (
          target &&
          this.countBoundParticlesAt(target.x, target.y, this.mode) <
            localPressure
        ) {
          this.moveToCell(target.x, target.y);
          return;
        }
      }

      // If can't move in preferred direction, try any neighbor (like water going sideways)
      const target = this.findLeastCrowdedTarget(neighbors);
      if (
        target &&
        this.countBoundParticlesAt(target.x, target.y, this.mode) <
          localPressure
      ) {
        this.moveToCell(target.x, target.y);
      } else {
        // Switch direction when blocked (like water bouncing)
        this.flowDirection =
          this.flowDirection === "preferred" ? "any" : "preferred";
      }
    }

    setMode(mode) {
      if (this.mode !== mode) {
        const oldMode = this.mode;
        this.mode = mode;

        // Update sprite texture
        if (this.sprite) {
          this.sprite.texture = modeTextures[mode];
          // No color tinting since we removed genetics colors
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

      // Update based on state first
      if (this.state === ParticleState.BOUND) {
        this.updateBoundParticle();
      }

      // Update based on mode
      if (this.mode === Mode.WATER) {
        if (this.state === ParticleState.UNBOUND) {
          this.updateWater();
        }
      } else if (this.mode === Mode.ENERGY) {
        if (this.state === ParticleState.UNBOUND) {
          this.updateEnergy();
        }
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

      // Update aura position
      if (this.auraSprite) {
        this.auraSprite.x = (this.pos.x - 1) * scaleSize;
        this.auraSprite.y = (this.pos.y - 1) * scaleSize;
      }

      // Update occupancy grid for unbound particles only
      if (this.state === ParticleState.UNBOUND) {
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
      }

      return true;
    }

    // Move to specific cell (for bound particles)
    moveToCell(x, y) {
      const oldX = this.pos.x;
      const oldY = this.pos.y;

      // Update position
      this.pos.x = x;
      this.pos.y = y;

      // Update sprite position
      if (this.sprite) {
        this.sprite.x = Math.floor(x * scaleSize);
        this.sprite.y = Math.floor(y * scaleSize);
      }

      // Update aura position
      if (this.auraSprite) {
        this.auraSprite.x = (x - 1) * scaleSize;
        this.auraSprite.y = (y - 1) * scaleSize;
      }

      // Update phantom debug position
      this.updatePhantomPosition();

      // Removed noisy bound flow logs
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
          particle.state === ParticleState.UNBOUND &&
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
            particle.state === ParticleState.UNBOUND &&
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
      // Only update unbound water
      if (this.state === ParticleState.BOUND) return;

      // Unbound water physics (monochromagic-style) - environmental water movement
      if (this.isFalling && this.pos.y < rows - 1) {
        // Try to move down first
        if (!this.isPositionOccupied(this.pos.x, this.pos.y + 1)) {
          this.moveRel(0, 1);
          this.fallingDirection = null; // Reset falling direction when moving down
        } else {
          // Can't move down, try diagonal/lateral movement
          if (this.fallingDirection === null) {
            // Randomly choose a falling direction if none has been set
            this.fallingDirection =
              Math.random() < CONSTANTS.PHYSICS.WATER_LEFT_BIAS_CHANCE
                ? "left"
                : "right";
          }

          // Use WATER_DIAGONAL_CHANCE to prefer diagonal vs lateral movement
          const prefersDiagonal =
            Math.random() < CONSTANTS.PHYSICS.WATER_DIAGONAL_CHANCE;

          if (this.fallingDirection === "left") {
            if (prefersDiagonal) {
              // Try diagonal first, then lateral
              if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y + 1)) {
                this.moveRel(-1, 1);
              } else if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y)) {
                this.moveRel(-1, 0);
              } else {
                this.fallingDirection = "right";
              }
            } else {
              // Try lateral first, then diagonal
              if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y)) {
                this.moveRel(-1, 0);
              } else if (
                !this.isPositionOccupied(this.pos.x - 1, this.pos.y + 1)
              ) {
                this.moveRel(-1, 1);
              } else {
                this.fallingDirection = "right";
              }
            }
          } else {
            // fallingDirection === 'right'
            if (prefersDiagonal) {
              // Try diagonal first, then lateral
              if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y + 1)) {
                this.moveRel(1, 1);
              } else if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y)) {
                this.moveRel(1, 0);
              } else {
                this.fallingDirection = "left";
              }
            } else {
              // Try lateral first, then diagonal
              if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y)) {
                this.moveRel(1, 0);
              } else if (
                !this.isPositionOccupied(this.pos.x + 1, this.pos.y + 1)
              ) {
                this.moveRel(1, 1);
              } else {
                this.fallingDirection = "left";
              }
            }
          }
        }
      } else if (this.pos.y >= rows - 1) {
        // At bottom, stop falling
        this.isFalling = false;
      }

      // STRICT RULE: Only SEED cells can absorb water from falling particles (root uptake)
      const plant = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (plant && plant.plantId && plant.mode === Mode.SEED) {
        // Check if seed has capacity for water
        const currentWaterCount = this.countBoundParticlesAt(
          this.pos.x,
          this.pos.y,
          Mode.WATER
        );
        const seedCapacity = plant.getCurrentSeedCapacity();

        if (currentWaterCount < seedCapacity) {
          // Seed can absorb this water particle
          this.bindToPlant(plant.plantId);
          this.sprite.visible = false; // Hide the particle sprite
          this.isFalling = false;

          console.log(
            `💧 Water absorbed by SEED at (${this.pos.x}, ${this.pos.y})`
          );
        }
        // If seed is at capacity, water particle continues falling
      }
    }

    updateEnergy() {
      // Only update unbound energy
      if (this.state === ParticleState.BOUND) return;

      // Check if energy is adjacent to a leaf that can absorb it
      const adjacentLeaves = [];
      for (
        let dx = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
        dx <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
        dx++
      ) {
        for (
          let dy = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
          dy <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
          dy++
        ) {
          if (
            dx === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER &&
            dy === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER
          )
            continue; // Skip center position
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const plant = occupancyGrid.getPlant(nx, ny);
            if (plant && plant.plantId && plant.mode === Mode.LEAF) {
              // Check if leaf has water and no energy (can absorb)
              const hasWater =
                this.countBoundParticlesAt(nx, ny, Mode.WATER) > 0;
              const hasEnergy =
                this.countBoundParticlesAt(nx, ny, Mode.ENERGY) > 0;

              if (hasWater && !hasEnergy) {
                adjacentLeaves.push({ plant, x: nx, y: ny });
              }
            }
          }
        }
      }

      // Energy absorption by leaves
      if (adjacentLeaves.length > 0) {
        const { plant: leaf, x: leafX, y: leafY } = adjacentLeaves[0];

        // Move this energy particle to the leaf cell and bind it
        this.pos.x = leafX;
        this.pos.y = leafY;
        this.sprite.x = leafX * scaleSize;
        this.sprite.y = leafY * scaleSize;
        if (this.auraSprite) {
          this.auraSprite.x = (leafX - 1) * scaleSize;
          this.auraSprite.y = (leafY - 1) * scaleSize;
        }

        // Remove from energy layer and bind to plant
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        this.bindToPlant(leaf.plantId);

        // Energy absorbed by leaf

        // RESPIRATION: Convert water to vapor instantly
        const waterParticles = particles.filter(
          (p) =>
            p.state === ParticleState.BOUND &&
            p.mode === Mode.WATER &&
            p.pos.x === leafX &&
            p.pos.y === leafY
        );

        if (waterParticles.length > 0) {
          const waterParticle = waterParticles[0];
          waterParticle.setMode(Mode.VAPOR);
          waterParticle.unbindFromPlant();
          console.log(`💨 Water converted to vapor at (${leafX}, ${leafY})`);
        }

        return;
      }

      // Unabsorbed energy - check for twinkling
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
        // Convert existing vapor particle to water (no new particle creation)
        this.setMode(Mode.WATER);
        this.isFalling = true; // Reset water physics state
        this.fallingDirection = null; // Reset falling direction
        this.state = ParticleState.UNBOUND; // Ensure it's unbound
        // Re-register in water layer
        occupancyGrid.setWater(this.pos.x, this.pos.y, this);
        console.log(
          `💧 Vapor condensed to water at (${this.pos.x}, ${this.pos.y})`
        );
      }
    }

    // === PLANT UPDATES ===
    updateSeed() {
      // Seeds absorb water from environment (demand-driven)
      this.absorbWaterFromEnvironment();

      // Seeds sprout when they have sufficient energy
      if (!this.hasAttemptedSprout) {
        const energyCount = this.countBoundParticlesAt(
          this.pos.x,
          this.pos.y,
          Mode.ENERGY
        );
        if (energyCount >= 3) {
          this.hasAttemptedSprout = true;
          this.sprout();
        }
      }
    }

    absorbWaterFromEnvironment() {
      // Only absorb if plant needs water
      const currentWaterCount = this.countBoundParticlesAt(
        this.pos.x,
        this.pos.y,
        Mode.WATER
      );
      const seedCapacity = this.getCurrentSeedCapacity();

      if (currentWaterCount >= seedCapacity) {
        return; // Seed is at capacity
      }

      // Check if any plant parts need water
      let plantNeedsWater = false;
      if (this.children && this.children.length > 0) {
        for (const child of this.children) {
          if (child && child.isPlantPart && child.isPlantPart()) {
            const childWaterCount = this.countBoundParticlesAt(
              child.pos.x,
              child.pos.y,
              Mode.WATER
            );
            if (childWaterCount === 0) {
              plantNeedsWater = true;
              break;
            }
          }
        }
      } else {
        plantNeedsWater = true; // No children yet, can absorb for reserves
      }

      if (!plantNeedsWater) return;

      // Check every _rd tick to reduce frequency
      if (this.age % 3 !== 0) return;

      // Look for unbound water particles in adjacent spaces
      for (
        let dx = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
        dx <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
        dx++
      ) {
        for (
          let dy = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
          dy <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
          dy++
        ) {
          if (
            dx === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER &&
            dy === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER
          )
            continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const waterInSpace = particles.find(
              (p) =>
                p.mode === Mode.WATER &&
                p.state === ParticleState.UNBOUND &&
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
              waterInSpace.bindToPlant(this.plantId);
              waterInSpace.sprite.visible = false;

              console.log(`💧 Seed absorbed water from (${nx}, ${ny})`);
              return;
            }
          }
        }
      }
    }

    updateBud() {
      if (!this.genetics) {
        if (!this.hasLoggedNoGenetics) {
          this.hasLoggedNoGenetics = true;
        }
        return;
      }

      // Check if bud has both energy and water
      const hasEnergy =
        this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.ENERGY) > 0;
      const hasWater =
        this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.WATER) > 0;

      if (hasEnergy && hasWater) {
        console.log(
          `🌱 Bud at (${this.pos.x}, ${this.pos.y}) has both resources, growing`
        );
        this.grow();
      } else {
        this.pullResources();
      }
    }

    pullResources() {
      // Find the seed
      let seed = this.parent;
      while (seed && seed.mode !== Mode.SEED) {
        seed = seed.parent;
      }

      if (!seed) return;

      // Pull energy if missing
      const hasEnergy =
        this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.ENERGY) > 0;
      if (!hasEnergy) {
        const seedEnergyParticles = particles.filter(
          (p) =>
            p.state === ParticleState.BOUND &&
            p.mode === Mode.ENERGY &&
            p.pos.x === seed.pos.x &&
            p.pos.y === seed.pos.y
        );

        if (seedEnergyParticles.length > 0) {
          const energyParticle = seedEnergyParticles[0];
          energyParticle.moveToCell(this.pos.x, this.pos.y);
          seed.energyGiven++;
          console.log(
            `🔋 Bud pulled energy from seed (given: ${seed.energyGiven})`
          );
        }
      }

      // Pull water if missing
      const hasWater =
        this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.WATER) > 0;
      if (!hasWater) {
        const seedWaterParticles = particles.filter(
          (p) =>
            p.state === ParticleState.BOUND &&
            p.mode === Mode.WATER &&
            p.pos.x === seed.pos.x &&
            p.pos.y === seed.pos.y
        );

        if (seedWaterParticles.length > 0) {
          const waterParticle = seedWaterParticles[0];
          waterParticle.moveToCell(this.pos.x, this.pos.y);
          console.log(`💧 Bud pulled water from seed`);
        } else {
          // Request seed to absorb more water
          if (this.age % 5 === 0) {
            seed.absorbWaterFromEnvironment();
          }
        }
      }
    }

    updatePlantPart() {
      // Plants are static once placed - no special visual updates needed
      // Bound particles handle their own visuals with aura sprites
    }

    updateFlower() {
      // Flower reproduction logic
      const hasEnergy =
        this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.ENERGY) > 0;
      if (
        hasEnergy &&
        Math.random() < CONSTANTS.FLUX.FLOWER_REPRODUCTION_CHANCE
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
      bud.parent = this;

      // Register bud in plant layer
      occupancyGrid.setPlant(budX, budY, bud);

      // Set up parent-child relationship
      this.children.push(bud);
      particles.push(bud);

      console.log(`🌱 Seed sprouted at (${budX}, ${budY})`);
    }

    grow() {
      if (!this.genetics) return;

      // Check growth limit
      const currentCellCount = countPlantCells(this.plantId);
      if (currentCellCount >= CONSTANTS.GROWTH.PLANT_MATURITY_SIZE) {
        if (!this.hasReachedMaturity) {
          this.hasReachedMaturity = true;
          this.setMode(Mode.FLOWER);
        }
        return;
      }

      // Check space above
      const newY = this.pos.y - 1;
      if (newY < 0 || occupancyGrid.isPlantOccupied(this.pos.x, newY)) {
        if (!this.hasLoggedBlocked) {
          this.hasLoggedBlocked = true;
          if (
            currentCellCount >= CONSTANTS.GROWTH.PLANT_FALLBACK_MATURITY_SIZE
          ) {
            this.setMode(Mode.FLOWER);
          }
        }
        return;
      }

      // Store old position
      const oldX = this.pos.x;
      const oldY = this.pos.y;
      const oldParent = this.parent;

      // Remove bud from current position
      occupancyGrid.removePlant(this.pos.x, this.pos.y);

      // Move bud up
      this.pos.y = newY;
      if (this.sprite) {
        this.sprite.y = newY * scaleSize;
      }
      occupancyGrid.setPlant(this.pos.x, this.pos.y, this);

      // Create stem at old position (empty - resources will flow into it)
      const stem = new Particle(oldX, oldY, Mode.STEM);
      stem.plantId = this.plantId;
      stem.genetics = this.genetics;
      stem.parent = oldParent;

      // Update relationships
      if (oldParent) {
        const budIndex = oldParent.children.indexOf(this);
        if (budIndex !== -1) {
          oldParent.children[budIndex] = stem;
        }
      }

      this.parent = stem;
      stem.children.push(this);
      particles.push(stem);

      // Initialize growth count if not present
      if (!this.growthCount) {
        this.growthCount = 0;
      }
      this.growthCount++;

      // Check if we should create nodes/leaves based on ACTUAL growth steps, not age
      if (this.growthCount % this.genetics.genes.internodeSpacing === 0) {
        this.createNode();
      }

      console.log(
        `🌱 Bud grew from (${oldX}, ${oldY}) to (${this.pos.x}, ${this.pos.y}), growthCount: ${this.growthCount}`
      );
    }

    createNode() {
      const stem = this.parent;
      if (stem && (stem.mode === Mode.STEM || stem.mode === Mode.NODE)) {
        // Convert STEM to NODE
        if (stem.mode === Mode.STEM) {
          stem.setMode(Mode.NODE);
        }

        // Create leaf buds on alternating sides
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
      console.log(
        `💥 ${this.mode} particle destroyed at (${this.pos.x}, ${this.pos.y})`
      );

      // Remove aura sprite and phantom sprite
      this.removeAura();

      // Remove from grids
      if (this.isPlantPart()) {
        occupancyGrid.removePlant(this.pos.x, this.pos.y);
      }

      if (this.state === ParticleState.UNBOUND) {
        if (this.mode === Mode.WATER) {
          occupancyGrid.setWater(this.pos.x, this.pos.y, null);
        }
        if (this.mode === Mode.ENERGY) {
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        }
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

  // Initialize single seed in center of canvas near bottom
  const seedX = Math.floor(cols / 2);
  const seedY = rows - CONSTANTS.WORLD.SEED_DISTANCE_FROM_BOTTOM;
  const seed = new Particle(seedX, seedY, Mode.SEED);
  seed.plantId = seed.id; // Set plantId immediately for bootstrap energy
  particles.push(seed);

  // Initialize seed with bootstrap energy
  const BOOTSTRAP_ENERGY_COUNT = CONSTANTS.SEED.BOOTSTRAP_ENERGY_COUNT;
  for (let i = 0; i < BOOTSTRAP_ENERGY_COUNT; i++) {
    const energy = new Particle(seedX, seedY, Mode.ENERGY);
    energy.bindToPlant(seed.plantId);
    energy.sprite.visible = false; // Hide main sprite but phantom should still show
    particles.push(energy);
    // Bootstrap energy created
  }

  console.log(
    `🌰 Placed seed at (${seedX}, ${seedY}) with ${BOOTSTRAP_ENERGY_COUNT} bootstrap energy`
  );

  // === SECTION 6: MAIN LOOP ===
  function advanceTick() {
    frame++;

    // Spawn energy particles near leaves
    if (Math.random() < CONSTANTS.FLUX.P_ENERGY) {
      const leaves = particles.filter((p) => p.mode === Mode.LEAF);

      if (leaves.length > 0) {
        const target = leaves[Math.floor(Math.random() * leaves.length)];
        const hasWater =
          target.countBoundParticlesAt(target.pos.x, target.pos.y, Mode.WATER) >
          0;
        const hasEnergy =
          target.countBoundParticlesAt(
            target.pos.x,
            target.pos.y,
            Mode.ENERGY
          ) > 0;

        if (hasWater && !hasEnergy) {
          // Look for empty spaces adjacent to the leaf
          const spawnPositions = [];
          for (
            let dx = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
            dx <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
            dx++
          ) {
            for (
              let dy = CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MIN;
              dy <= CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_MAX;
              dy++
            ) {
              if (
                dx === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER &&
                dy === CONSTANTS.PHYSICS.NEIGHBOR_OFFSET_CENTER
              )
                continue;
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
              `⚡ Energy particle created at (${randomPos.x}, ${randomPos.y})`
            );
            // Environmental energy spawned
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
        bound: particles.filter((p) => p.state === ParticleState.BOUND).length,
        unbound: particles.filter((p) => p.state === ParticleState.UNBOUND)
          .length,
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

      // Bound resource details
      const boundResources = particles.filter(
        (p) => p.state === ParticleState.BOUND
      );
      if (boundResources.length > 0) {
        console.log("\n🔗 Bound Resources:");
        boundResources.forEach((p) => {
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

  // End of DOMContentLoaded event listener
});
