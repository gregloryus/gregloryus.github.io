// === SECTION 1: INITIALIZATION AND CONSTANTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // Fixed canvas size as per brief: 256x144 cells
  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 144;
  const SCALE_SIZE = 3; // As per brief

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
      MUTATION_RATE: 0.1, // This will be toggled
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
  let mutationEnabled = false; // Start with mutation off for reproducible tests

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
    constructor(parentA = null, parentB = null, isFixed = false) {
      if (isFixed) {
        this.genes = PlantGenetics.fixed();
      } else if (parentA && parentB) {
        this.combineParents(parentA, parentB);
      } else if (parentA) {
        this.inheritFromParent(parentA);
      } else {
        this.generateRandom();
      }
    }

    static fixed() {
      return {
        internodeSpacing: 4,
        budGrowthLimit: 12,
        leafNodePattern: [1, 1, 0, 1],
        branchingNodes: [6, 10],
        branchAngle: 45,
        leafDelay: 2,
        floweringHeight: 12,
        energyThreshold: 8,
        droughtTolerance: 0.7,
        coldTolerance: 0.7,
      };
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
      if (!mutationEnabled) return; // Do not mutate if disabled

      const geneKeys = Object.keys(this.genes);

      // Recency-weighted mutation: higher chance to mutate "less critical" genes
      // And a small chance to revert a recent, complex mutation.
      const criticalGenes = [
        "internodeSpacing",
        "budGrowthLimit",
        "leafNodePattern",
      ];
      const tweakableGenes = geneKeys.filter((g) => !criticalGenes.includes(g));

      if (Math.random() < 0.1) {
        // 10% chance to revert a "tweakable" gene
        const geneToRevert =
          tweakableGenes[Math.floor(Math.random() * tweakableGenes.length)];
        const fixedVersion = PlantGenetics.fixed();
        if (fixedVersion[geneToRevert]) {
          this.genes[geneToRevert] = fixedVersion[geneToRevert];
          console.log(
            `🧬 Mutation reverted ${geneToRevert} to stable default.`
          );
          return;
        }
      }

      if (Math.random() < CONSTANTS.GENETICS.MUTATION_RATE) {
        const mutKey = geneKeys[Math.floor(Math.random() * geneKeys.length)];

        if (typeof this.genes[mutKey] === "number") {
          const change =
            (Math.random() - 0.5) * 2 * CONSTANTS.GENETICS.MUTATION_STRENGTH;
          this.genes[mutKey] = Math.max(1, this.genes[mutKey] * (1 + change));
        }
      }

      // Bud orientation limiter logic from spring-fall-sand-garden-40-train.js
      const directions = [];
      const up = { dx: 0, dy: -1 };
      const upLeft = { dx: -1, dy: -1 };
      const upRight = { dx: 1, dy: -1 };

      if (this.prevXOptions.includes(-1)) directions.push(upLeft);
      if (this.prevXOptions.includes(0)) directions.push(up);
      if (this.prevXOptions.includes(1)) directions.push(upRight);

      if (directions.length === 0) {
        // Failsafe if all options are somehow removed
        directions.push(up);
      }

      let moved = false;
      for (const dir of directions) {
        const newX = this.pos.x + dir.dx;
        const newY = this.pos.y + dir.dy;

        if (newY < 0 || !occupancyGrid.isEmptyMooreNeighborhood(newX, newY)) {
          continue;
        }

        // Update orientation limiter state
        this.checkCounter++;
        if (this.checkCounter > 5) {
          this.prevXOptions = [-1, 0, 1];
          this.checkCounter = 0;
        } else {
          this.prevXOptions = [dir.dx];
        }

        // Growth consumes both energy AND water
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

        const oldParent = this.parent;
        const oldX = this.pos.x;
        const oldY = this.pos.y;

        occupancyGrid.removePlant(oldX, oldY);
        this.pos = { x: newX, y: newY };
        if (this.sprite) {
          this.sprite.x = newX * scaleSize;
          this.sprite.y = newY * scaleSize;
        }
        occupancyGrid.setPlant(newX, newY, this);

        const stem = new Particle(oldX, oldY, Mode.STEM);
        stem.plantId = this.plantId;
        stem.genetics = this.genetics;
        stem.parent = oldParent; // Stem's parent is bud's old parent

        if (oldParent) {
          const budIndex = oldParent.children.indexOf(this);
          if (budIndex !== -1) {
            oldParent.children[budIndex] = stem;
          }
        }

        this.parent = stem;
        stem.children.push(this);
        particles.push(stem);

        moved = true;
        break; // Exit after successful move
      }

      if (!moved) {
        if (!this.hasLoggedBlocked) {
          this.hasLoggedBlocked = true;
          if (currentCellCount >= 10) {
            this.setMode(Mode.FLOWER);
          }
        }
        return;
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
          if (
            !occupancyGrid.isPlantOccupied(pos.x, pos.y) &&
            occupancyGrid.isEmptyMooreNeighborhood(pos.x, pos.y)
          ) {
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
      // When first plant reproduces, enable mutations for all subsequent plants
      if (!mutationEnabled) {
        console.log(
          "🌸 First flower! Enabling mutations for all subsequent generations."
        );
        mutationEnabled = true;
      }

      // Create new seed
      const seed = new Particle(this.pos.x, this.pos.y + 1, Mode.SEED, false);
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

  let firstSeed = true;

  // Initialize single seed in center of canvas near bottom for controlled study
  const seedX = Math.floor(cols / 2);
  const seedY = rows - 5; // Near bottom, 5 rows from bottom edge
  const seed = new Particle(seedX, seedY, Mode.SEED, true); // Mark as first seed
  particles.push(seed);

  // Initialize seed with bootstrap energy (cotyledons) - 10 energy particles stacked on seed
  const BOOTSTRAP_ENERGY_COUNT = 10;
  for (let i = 0; i < BOOTSTRAP_ENERGY_COUNT; i++) {
    const energy = new Particle(seedX, seedY, Mode.ENERGY);
    particles.push(energy);
  }

  console.log(
    `🌰 Placed seed at center (${seedX}, ${seedY}) with fixed genetics and ${BOOTSTRAP_ENERGY_COUNT} bootstrap energy particles on ${cols}x${rows} grid`
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
