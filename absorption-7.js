// === SECTION 1: INITIALIZATION AND CONSTANTS ===
document.addEventListener("DOMContentLoaded", async () => {
  // Grid settings for controlled testing environment
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
    WORLD: {
      SCALE_SIZE: SCALE_SIZE,
      TICK_INTERVAL: 40,
      COLS: GRID_WIDTH,
      ROWS: GRID_HEIGHT,
    },
    FLUX: {
      P_ENERGY: 0.08,
      WATER_DIAGONAL_CHANCE: 0.3,
    },
    GENETICS: {
      MUTATION_RATE: 0.1,
      MUTATION_STRENGTH: 0.15, // Reduced strength for more stable evolution
      CELL_LIFESPAN_BASE: 20000, // Lifespan in ticks
    },
    GROWTH: {
      ENERGY_TO_GROW: 5,
      GROWTH_COST: 3,
      MAX_ENERGY: 20,
      SEED_ABSORPTION_THROTTLE: 6, // Absorb water every 6 ticks
    },
    SIMULATION: {
      INITIAL_WATER_COUNT: 400,
      INITIAL_SEED_COUNT: 1,
      SEED_BOOTSTRAP_ENERGY: 10,
    },
    REPRODUCTION: {
      FLOWER_ENERGY_COST: 15, // Energy needed to create a seed
      FLOWER_TIMER: 120, // Ticks a flower lives before trying to reproduce
      SEED_DISPERSAL_STEPS: 15, // How far a new seed travels
    },
  };

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

  // --- UI & DEBUG ---
  const fpsTextStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 14,
    fill: "white",
  });
  const fpsText = new PIXI.Text("FPS: 0", fpsTextStyle);
  fpsText.x = 10;
  fpsText.y = 10;
  app.stage.addChild(fpsText);

  const particleCountText = new PIXI.Text("Particles: 0", fpsTextStyle);
  particleCountText.x = 10;
  particleCountText.y = 30;
  app.stage.addChild(particleCountText);

  const statusText = new PIXI.Text("PAUSED", fpsTextStyle);
  statusText.x = 10;
  statusText.y = 50;
  app.stage.addChild(statusText);

  // Visual Debugger Containers
  const waterDebugContainer = new PIXI.Container();
  waterDebugContainer.x = 10;
  waterDebugContainer.y = 80;
  app.stage.addChild(waterDebugContainer);
  const waterDebugLabel = new PIXI.Text("Plant 1 Water", {
    ...fpsTextStyle,
    fontSize: 12,
  });
  waterDebugContainer.addChild(waterDebugLabel);

  const energyDebugContainer = new PIXI.Container();
  energyDebugContainer.x = GRID_WIDTH * SCALE_SIZE - 100;
  energyDebugContainer.y = 80;
  app.stage.addChild(energyDebugContainer);
  const energyDebugLabel = new PIXI.Text("Plant 1 Energy", {
    ...fpsTextStyle,
    fontSize: 12,
  });
  energyDebugContainer.addChild(energyDebugLabel);

  // Core simulation parameters
  let particles = [];
  let frame = 0;
  let fastForward = false;
  let fastForwardFactor = 10;
  let paused = true;
  let lastRenderTime = performance.now();
  let idCounter = 1;
  let mutationEnabled = false; // Start with mutation off for deterministic first plant

  let scaleSize = CONSTANTS.WORLD.SCALE_SIZE;
  let cols = CONSTANTS.WORLD.COLS;
  let rows = CONSTANTS.WORLD.ROWS;

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
      this.plantLayer = new Array(cols * rows).fill(null);
      this.waterLayer = new Array(cols * rows).fill(null);
      this.energyLayer = new Array(cols * rows).fill(null);
      this.waterOverlays = new Array(cols * rows).fill(null);
      this.energyOverlays = new Array(cols * rows).fill(null);
    }

    getIndex(x, y) {
      return y * this.cols + x;
    }

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

    setWater(x, y, particle = null) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);
        this.waterLayer[index] = particle;
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

    setEnergy(x, y, particle = null) {
      if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
        const index = this.getIndex(x, y);
        this.energyLayer[index] = particle;
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

    isPlantOccupied(x, y) {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
      return this.getPlant(x, y) !== null;
    }

    isEmptyMooreNeighborhood(x, y, plantIdToIgnore = null) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx,
            ny = y + dy;
          const plant = this.getPlant(nx, ny);
          if (plant && plant.plantId !== plantIdToIgnore) {
            return false;
          }
        }
      }
      return true;
    }
  }

  let occupancyGrid = new LayeredOccupancyGrid(cols, rows);

  function countPlantCells(plantId) {
    return particles.filter((p) => p.isPlantPart() && p.plantId === plantId)
      .length;
  }

  // === SECTION 3: PLANT GENETICS SYSTEM ===
  class PlantGenetics {
    constructor(parentGenetics = null) {
      if (parentGenetics) {
        this.genes = JSON.parse(JSON.stringify(parentGenetics.genes));
        if (mutationEnabled) {
          this.mutate();
        }
      } else {
        this.generateRandom();
      }
    }

    static fixed() {
      const fixedGenetics = new PlantGenetics();
      fixedGenetics.genes = {
        internodeSpacing: 4,
        budGrowthLimit: 12,
        leafNodePattern: [1, 1, 0, 1],
        branchingNodes: [6, 10],
        branchAngle: 45, // Note: branchAngle is not used by current growth logic
        leafDelay: 2, // Note: leafDelay is not used by current growth logic
        floweringHeight: 12,
        energyThreshold: 8,
        droughtTolerance: 0.7, // Note: droughtTolerance is not used
        coldTolerance: 0.7, // Note: coldTolerance is not used
        cellLifespan: CONSTANTS.GENETICS.CELL_LIFESPAN_BASE,
        sideCounterMax: 4, // From spring-fall logic
      };
      return fixedGenetics;
    }

    generateRandom() {
      this.genes = {
        internodeSpacing: 3 + Math.floor(Math.random() * 4), // 3-6
        budGrowthLimit: 8 + Math.floor(Math.random() * 8), // 8-15
        leafNodePattern: [1, 1, 0, 1].sort(() => 0.5 - Math.random()),
        branchingNodes: [5, 8],
        branchAngle: 30 + Math.random() * 30,
        leafDelay: 2,
        floweringHeight: 10 + Math.floor(Math.random() * 5),
        energyThreshold: 8,
        droughtTolerance: 0.5 + Math.random() * 0.5,
        coldTolerance: 0.5 + Math.random() * 0.5,
        cellLifespan:
          CONSTANTS.GENETICS.CELL_LIFESPAN_BASE * (0.8 + Math.random() * 0.4),
        sideCounterMax: 3 + Math.floor(Math.random() * 4),
      };
    }

    mutate() {
      if (Math.random() > CONSTANTS.GENETICS.MUTATION_RATE) return;

      const keys = Object.keys(this.genes);
      const mutKey = keys[Math.floor(Math.random() * keys.length)];
      const gene = this.genes[mutKey];

      if (typeof gene === "number") {
        const change =
          (Math.random() - 0.5) * 2 * CONSTANTS.GENETICS.MUTATION_STRENGTH;
        // Ensure mutation is significant but not runaway
        this.genes[mutKey] = Math.max(1, gene + change * gene);
        if (
          [
            "internodeSpacing",
            "budGrowthLimit",
            "floweringHeight",
            "sideCounterMax",
          ].includes(mutKey)
        ) {
          this.genes[mutKey] = Math.round(this.genes[mutKey]);
        }
      } else if (Array.isArray(gene)) {
        // Mutate arrays (leaf pattern, branching nodes)
        if (Math.random() < 0.5 && gene.length > 1) {
          // Swap two elements
          const i = Math.floor(Math.random() * gene.length);
          let j = Math.floor(Math.random() * gene.length);
          if (i === j) j = (j + 1) % gene.length;
          [gene[i], gene[j]] = [gene[j], gene[i]];
        } else {
          // Flip a bit in the pattern
          const i = Math.floor(Math.random() * gene.length);
          if (mutKey === "leafNodePattern") {
            gene[i] = 1 - gene[i];
          }
        }
      }
    }

    calculateFitness() {
      // Basic fitness for color, can be expanded
      const { internodeSpacing, budGrowthLimit, energyThreshold } = this.genes;
      return (
        10 -
        Math.abs(internodeSpacing - 4) +
        (15 - Math.abs(budGrowthLimit - 12)) +
        (10 - Math.abs(energyThreshold - 8))
      );
    }

    getColor() {
      const fitness = this.calculateFitness();
      if (fitness > 30) return 0xffd700;
      if (fitness > 25) return 0xffa500;
      if (fitness > 20) return 0x32cd32;
      return 0x228b22;
    }
  }

  // === SECTION 4: PARTICLE CLASS ===
  class Particle {
    constructor(x, y, mode = Mode.WATER) {
      this.pos = { x, y };
      this.id = idCounter++;
      this.mode = mode;
      this.age = 0;
      this.lifespan = Infinity;

      // Plant-specific properties
      this.plantId = null;
      this.genetics = null;
      this.parent = null;
      this.children = [];

      this.isFalling = true;
      this.fallingDirection = null;

      this.sprite = new PIXI.Sprite(modeTextures[this.mode]);
      this.sprite.x = Math.floor(x * scaleSize);
      this.sprite.y = Math.floor(y * scaleSize);
      this.sprite.scale.set(scaleSize, scaleSize);

      if (this.isPlantPart()) {
        this.sprite.alpha = 0.5;
      }
      app.stage.addChild(this.sprite);

      if (frame > 0) {
        console.log(
          `[Particle Created] ID: ${this.id}, Mode: ${this.mode}, Pos: (${x},${y})`
        );
      }

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
        console.log(
          `[Mode Change] ID: ${this.id}, From: ${oldMode}, To: ${mode}`
        );
        if (this.sprite) {
          this.sprite.texture = modeTextures[mode];
          if (this.isPlantPart() && this.genetics) {
            this.sprite.tint = this.genetics.getColor();
          }
        }
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
      if (this.age > this.lifespan) {
        this.die();
        return;
      }

      if (this.isPlantPart()) {
        this.distributeResources();
      }

      switch (this.mode) {
        case Mode.WATER:
          this.updateWater();
          break;
        case Mode.ENERGY:
          this.updateEnergy();
          break;
        case Mode.VAPOR:
          this.updateVapor();
          break;
        case Mode.SEED:
          this.updateSeed();
          break;
        case Mode.BUD:
          this.updateBud();
          break;
        case Mode.FLOWER:
          this.updateFlower();
          break;
      }
    }

    distributeResources() {
      if (occupancyGrid.hasWater(this.pos.x, this.pos.y)) {
        const water = occupancyGrid.getWater(this.pos.x, this.pos.y);
        const neighbors = this.getWaterFlowNeighbors();
        for (const neighbor of neighbors) {
          if (!occupancyGrid.hasWater(neighbor.x, neighbor.y)) {
            occupancyGrid.setWater(this.pos.x, this.pos.y, null);
            water.moveRel(neighbor.x - this.pos.x, neighbor.y - this.pos.y);
          }
        }
      }
      if (occupancyGrid.hasEnergy(this.pos.x, this.pos.y)) {
        const energy = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
        const neighbors = this.getEnergyFlowNeighbors();
        for (const neighbor of neighbors) {
          if (!occupancyGrid.hasEnergy(neighbor.x, neighbor.y)) {
            occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
            energy.moveRel(neighbor.x - this.pos.x, neighbor.y - this.pos.y);
          }
        }
      }
    }

    moveRel(dx, dy) {
      const oldX = this.pos.x;
      const oldY = this.pos.y;

      let newY = this.pos.y + dy;
      if (newY < 0 || newY >= rows) {
        // Vertical wrapping is off for testing
        return false;
      }

      let newX = this.pos.x + dx;
      if (newX < 0 || newX >= cols) {
        return false;
      }

      this.pos.x = newX;
      this.pos.y = newY;

      if (this.sprite) {
        this.sprite.x = this.pos.x * scaleSize;
        this.sprite.y = this.pos.y * scaleSize;
      }
      if (this.auraSprite) {
        this.auraSprite.x = (this.pos.x - 1) * scaleSize;
        this.auraSprite.y = (this.pos.y - 1) * scaleSize;
      }

      if (this.isPlantPart()) {
        occupancyGrid.removePlant(oldX, oldY);
        occupancyGrid.setPlant(newX, newY, this);
      } else if (this.mode === Mode.ENERGY) {
        occupancyGrid.setEnergy(oldX, oldY, null);
        occupancyGrid.setEnergy(newX, newY, this);
      } else if (this.mode === Mode.WATER) {
        occupancyGrid.setWater(oldX, oldY, null);
        occupancyGrid.setWater(newX, newY, this);
        this.updateWaterOverlay();
      }
      return true;
    }

    updateWaterOverlay() {
      // This logic is now handled by the LayeredOccupancyGrid's setWater method
      // but we need to call it when a particle moves.
      const waterParticle = occupancyGrid.getWater(this.pos.x, this.pos.y);
      occupancyGrid.setWater(this.pos.x, this.pos.y, null);
      occupancyGrid.setWater(this.pos.x, this.pos.y, waterParticle);
    }

    isPositionOccupied(x, y) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
      if (occupancyGrid.isPlantOccupied(x, y)) return true;
      // Simplified check, assumes one particle type per layer
      if (
        this.mode === Mode.WATER &&
        occupancyGrid.getWater(x, y) &&
        occupancyGrid.getWater(x, y) !== this
      )
        return true;
      if (
        this.mode === Mode.ENERGY &&
        occupancyGrid.getEnergy(x, y) &&
        occupancyGrid.getEnergy(x, y) !== this
      )
        return true;
      return false;
    }

    updateWater() {
      if (this.isFalling && this.pos.y < rows - 1) {
        if (!this.isPositionOccupied(this.pos.x, this.pos.y + 1)) {
          this.moveRel(0, 1);
          this.fallingDirection = null;
        } else {
          if (this.fallingDirection === null) {
            this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
          }
          if (this.fallingDirection === "left") {
            if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y + 1))
              this.moveRel(-1, 1);
            else if (!this.isPositionOccupied(this.pos.x - 1, this.pos.y))
              this.moveRel(-1, 0);
            else this.fallingDirection = "right";
          } else {
            if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y + 1))
              this.moveRel(1, 1);
            else if (!this.isPositionOccupied(this.pos.x + 1, this.pos.y))
              this.moveRel(1, 0);
            else this.fallingDirection = "left";
          }
        }
      } else if (this.pos.y >= rows - 1) {
        this.isFalling = false;
      }
    }

    updateEnergy() {
      if (this.plantId) return; // Energy belonging to a plant is stable.

      const plantAtPosition = occupancyGrid.getPlant(this.pos.x, this.pos.y);
      if (plantAtPosition) return; // Also stable if it's just landed on a plant part but not absorbed

      const adjacentLeaves = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx,
            ny = this.pos.y + dy;
          const plant = occupancyGrid.getPlant(nx, ny);
          if (
            plant &&
            plant.mode === Mode.LEAF &&
            occupancyGrid.hasWater(nx, ny) &&
            !occupancyGrid.hasEnergy(nx, ny)
          ) {
            adjacentLeaves.push({ plant, x: nx, y: ny });
          }
        }
      }

      if (adjacentLeaves.length > 0) {
        const { plant: leaf, x: leafX, y: leafY } = adjacentLeaves[0];

        this.plantId = leaf.plantId; // Assign plantId on absorption

        const oldX = this.pos.x,
          oldY = this.pos.y;
        this.moveRel(leafX - oldX, leafY - oldY);

        // RESPIRATION
        const waterParticle = occupancyGrid.getWater(leafX, leafY);
        if (waterParticle && Math.random() < 0.3) {
          occupancyGrid.setWater(leafX, leafY, null);
          waterParticle.destroy();
          particles.push(new Particle(leafX, leafY, Mode.VAPOR));
        }
        leaf.flowEnergyCascade();
        return;
      }

      if (this.twinkleCountdown === undefined) this.twinkleCountdown = 0;
      this.twinkleCountdown++;
      if (this.twinkleCountdown > 60) {
        console.log(
          `[Energy Decay] Destroying energy particle ${this.id} at (${this.pos.x}, ${this.pos.y}). No plant part found.`
        );
        this.destroy();
      }
    }

    // --- CASCADE RESOURCE FLOW ---
    // This is now handled by distributeResources()
    flowWaterCascade() {}
    flowEnergyCascade() {}

    getWaterFlowNeighbors() {
      const neighbors = [];
      const added = new Set();

      // Priority 1: Children (natural upward flow)
      for (const child of this.children) {
        if (child && !added.has(child.id)) {
          neighbors.push({
            x: child.pos.x,
            y: child.pos.y,
            plant: child,
            priority: 1,
          });
          added.add(child.id);
        }
      }

      // Priority 2: Parent (for back-flow to fill lower branches)
      if (this.parent && !added.has(this.parent.id)) {
        neighbors.push({
          x: this.parent.pos.x,
          y: this.parent.pos.y,
          plant: this.parent,
          priority: 2,
        });
        added.add(this.parent.id);
      }

      // Priority 3: Any adjacent same-plant cell (for horizontal/complex branches)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;
          const plant = occupancyGrid.getPlant(nx, ny);
          if (plant && plant.plantId === this.plantId && !added.has(plant.id)) {
            neighbors.push({ x: nx, y: ny, plant: plant, priority: 3 });
            added.add(plant.id);
          }
        }
      }
      return neighbors.sort((a, b) => a.priority - b.priority);
    }

    getEnergyFlowNeighbors() {
      const neighbors = [];
      const added = new Set();

      // Priority 1: Parent (natural downward flow)
      if (this.parent && !added.has(this.parent.id)) {
        neighbors.push({
          x: this.parent.pos.x,
          y: this.parent.pos.y,
          plant: this.parent,
          priority: 1,
        });
        added.add(this.parent.id);
      }

      // Priority 2: Children (for upward flow to fill unsaturated leaves)
      for (const child of this.children) {
        if (child && !added.has(child.id)) {
          neighbors.push({
            x: child.pos.x,
            y: child.pos.y,
            plant: child,
            priority: 2,
          });
          added.add(child.id);
        }
      }

      // Priority 3: Any adjacent same-plant cell (for horizontal/complex branches)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx;
          const ny = this.pos.y + dy;
          const plant = occupancyGrid.getPlant(nx, ny);
          if (plant && plant.plantId === this.plantId && !added.has(plant.id)) {
            neighbors.push({ x: nx, y: ny, plant: plant, priority: 3 });
            added.add(plant.id);
          }
        }
      }
      return neighbors.sort((a, b) => a.priority - b.priority);
    }

    updateVapor() {
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: -1 }, // Bias upwards
        { dx: -1, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 },
      ];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      this.moveRel(dir.dx, dir.dy);
      if (this.pos.y === 0) {
        this.setMode(Mode.WATER);
        this.isFalling = true;
        this.fallingDirection = null;
      }
    }

    // === PLANT UPDATES ===
    updateSeed() {
      if (frame % CONSTANTS.GROWTH.SEED_ABSORPTION_THROTTLE === 0) {
        this.absorbWaterFromEnvironment();
      }

      if (!this.hasAttemptedSprout) {
        const energyCount = particles.filter(
          (p) =>
            p.mode === Mode.ENERGY &&
            p.pos.x === this.pos.x &&
            p.pos.y === this.pos.y
        ).length;
        if (energyCount >= 3) {
          this.sprout();
          this.hasAttemptedSprout = true;
        }
      }

      if (
        this.hasAttemptedSprout &&
        occupancyGrid.hasWater(this.pos.x, this.pos.y)
      ) {
        // This cascade logic is now handled by distributeResources()
      }
    }

    absorbWaterFromEnvironment() {
      if (occupancyGrid.hasWater(this.pos.x, this.pos.y)) return;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = this.pos.x + dx,
            ny = this.pos.y + dy;
          const waterInSpace = particles.find(
            (p) => p.mode === Mode.WATER && p.pos.x === nx && p.pos.y === ny
          );
          if (waterInSpace) {
            occupancyGrid.setWater(this.pos.x, this.pos.y, waterInSpace);
            waterInSpace.moveRel(this.pos.x - nx, this.pos.y - ny);
            return;
          }
        }
      }
    }

    updateBud() {
      if (!this.genetics) return;

      // Death check
      const seed = particles.find((p) => p.id === this.plantId);
      if (!seed || this.age > this.genetics.genes.cellLifespan) {
        this.die();
        return;
      }

      const hasEnergy = occupancyGrid.hasEnergy(this.pos.x, this.pos.y);
      const hasWater = occupancyGrid.hasWater(this.pos.x, this.pos.y);

      if (hasEnergy && hasWater) {
        this.grow();
      } else {
        // No longer pulling, relying on autonomous distribution
      }
    }

    // pullResources() is no longer needed and will be removed.

    updateFlower() {
      this.flowerTimer = (this.flowerTimer || 0) + 1;
      if (this.flowerTimer > CONSTANTS.REPRODUCTION.FLOWER_TIMER) {
        const energyCount = particles.filter(
          (p) => p.mode === Mode.ENERGY && p.plantId === this.plantId
        ).length;
        if (energyCount > CONSTANTS.REPRODUCTION.FLOWER_ENERGY_COST) {
          this.reproduce();
        }
        this.die(); // Flower dies after attempting reproduction
      }
    }

    sprout() {
      const budX = this.pos.x,
        budY = this.pos.y - 1;
      if (budY < 0 || occupancyGrid.isPlantOccupied(budX, budY)) return;

      this.genetics =
        this.id === 1 ? PlantGenetics.fixed() : new PlantGenetics();
      this.plantId = this.id;
      this.lifespan = this.genetics.genes.cellLifespan * 2; // Seeds live longer

      const bud = new Particle(budX, budY, Mode.BUD);
      bud.genetics = this.genetics;
      bud.plantId = this.plantId;
      bud.parent = this;
      bud.lifespan = this.genetics.genes.cellLifespan;
      bud.prevGrowthSide = Math.random() < 0.5 ? -1 : 1;
      bud.sideCounter = 0;

      this.children.push(bud);
      particles.push(bud);

      // --- FIX: Immediately provide the first bud with resources ---
      // Move one water particle from seed to bud
      if (occupancyGrid.hasWater(this.pos.x, this.pos.y)) {
        const water = occupancyGrid.getWater(this.pos.x, this.pos.y);
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
        water.moveRel(bud.pos.x - this.pos.x, bud.pos.y - this.pos.y);
        console.log(
          `[Sprout] Seed ${this.id} pushed WATER to new Bud ${bud.id}`
        );
      }

      // Move one energy particle from seed to bud
      if (occupancyGrid.hasEnergy(this.pos.x, this.pos.y)) {
        const energy = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        energy.moveRel(bud.pos.x - this.pos.x, bud.pos.y - this.pos.y);
        console.log(
          `[Sprout] Seed ${this.id} pushed ENERGY to new Bud ${bud.id}`
        );

        // Make next stacked energy particle accessible
        const nextEnergy = particles.find(
          (p) =>
            p.mode === Mode.ENERGY &&
            p.pos.x === this.pos.x &&
            p.pos.y === this.pos.y
        );
        if (nextEnergy) {
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, nextEnergy);
        }
      }
    }

    grow() {
      if (!this.genetics) return;
      const { genes } = this.genetics;
      const currentCellCount = countPlantCells(this.plantId);

      console.log(
        `[Grow Attempt] Bud ${this.id} at (${this.pos.x}, ${
          this.pos.y
        }). HasWater: ${occupancyGrid.hasWater(
          this.pos.x,
          this.pos.y
        )}, HasEnergy: ${occupancyGrid.hasEnergy(this.pos.x, this.pos.y)}`
      );

      if (currentCellCount >= genes.budGrowthLimit) {
        console.log(`[Grow Stop] Bud ${this.id} reached growth limit.`);
        this.setMode(Mode.FLOWER);
        return;
      }

      // --- Bud Orientation Limiter ---
      if (this.sideCounter >= genes.sideCounterMax) {
        this.prevGrowthSide *= -1;
        this.sideCounter = 0;
      }
      const directions = [
        { dx: 0, dy: -1 }, // Straight up
        { dx: this.prevGrowthSide, dy: -1 }, // Preferred diagonal
        { dx: -this.prevGrowthSide, dy: -1 }, // Other diagonal
      ];

      let moved = false;
      for (const dir of directions) {
        const newX = this.pos.x + dir.dx;
        const newY = this.pos.y + dir.dy;
        if (newY < 0) continue;

        const canGrowHere =
          occupancyGrid.isEmptyMooreNeighborhood(newX, newY, this.plantId) &&
          !occupancyGrid.getPlant(newX, newY);
        if (!canGrowHere) {
          console.log(
            `[Grow Blocked] Bud ${this.id} cannot move to (${newX}, ${newY}) - neighborhood not empty.`
          );
          continue;
        }

        if (canGrowHere) {
          // ALLOCATE resources, don't destroy them.
          const energy = occupancyGrid.getEnergy(this.pos.x, this.pos.y);
          const water = occupancyGrid.getWater(this.pos.x, this.pos.y);

          // Clear resources from bud's current location
          occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
          occupancyGrid.setWater(this.pos.x, this.pos.y, null);

          const oldParent = this.parent;
          const oldX = this.pos.x,
            oldY = this.pos.y;

          this.moveRel(dir.dx, dir.dy);
          if (dir.dx !== 0) this.sideCounter++;

          const stem = new Particle(oldX, oldY, Mode.STEM);
          stem.plantId = this.plantId;
          stem.genetics = this.genetics;
          stem.parent = oldParent;
          stem.lifespan = genes.cellLifespan;

          if (oldParent) {
            const budIndex = oldParent.children.indexOf(this);
            if (budIndex > -1) oldParent.children[budIndex] = stem;
          }
          this.parent = stem;
          stem.children.push(this);
          particles.push(stem);

          // Transfer resources to the new stem cell
          if (energy) {
            energy.moveRel(oldX - energy.pos.x, oldY - energy.pos.y);
            occupancyGrid.setEnergy(oldX, oldY, energy);
          }
          if (water) {
            water.moveRel(oldX - water.pos.x, oldY - water.pos.y);
            occupancyGrid.setWater(oldX, oldY, water);
          }

          // Check for node/leaf creation
          const height = oldParent ? oldParent.pos.y - this.pos.y : 1;
          if (height % genes.internodeSpacing === 0) {
            stem.setMode(Mode.NODE);
            this.createLeafPattern(stem);
          }

          moved = true;
          console.log(
            `[Grown] Bud ${this.id} moved to (${newX}, ${newY}), created Stem ${stem.id}`
          );
          break;
        }
      }
    }

    createLeafPattern(node) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const stencil = [
        { dx: side, dy: 0 },
        { dx: side * 2, dy: 0 },
        { dx: side, dy: -1 },
        { dx: side * 2, dy: -1 },
        { dx: side, dy: 1 },
        { dx: side * 2, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      for (const pos of stencil) {
        const x = node.pos.x + pos.dx;
        const y = node.pos.y + pos.dy;
        if (
          x >= 0 &&
          x < cols &&
          y >= 0 &&
          y < rows &&
          !occupancyGrid.isPlantOccupied(x, y)
        ) {
          const leaf = new Particle(x, y, Mode.LEAF);
          leaf.plantId = this.plantId;
          leaf.genetics = this.genetics;
          leaf.parent = node;
          leaf.lifespan = this.genetics.genes.cellLifespan;
          node.children.push(leaf);
          particles.push(leaf);
        }
      }
    }

    reproduce() {
      if (!mutationEnabled) mutationEnabled = true; // Enable mutation after first reproduction

      const seed = new Particle(this.pos.x, this.pos.y, Mode.SEED);
      seed.genetics = new PlantGenetics(this.genetics);
      seed.airborneSteps = 0;
      seed.isAirborne = true;

      const dispersalLoop = () => {
        if (seed.airborneSteps >= CONSTANTS.REPRODUCTION.SEED_DISPERSAL_STEPS) {
          seed.isAirborne = false;
          if (occupancyGrid.isPlantOccupied(seed.pos.x, seed.pos.y)) {
            seed.destroy(); // Landing failed
          } else {
            particles.push(seed);
          }
          return;
        }
        const dir = {
          dx: Math.floor(Math.random() * 3) - 1,
          dy: Math.floor(Math.random() * 3 - 1),
        };
        seed.moveRel(dir.dx, dir.dy);
        seed.airborneSteps++;
        requestAnimationFrame(dispersalLoop);
      };
      dispersalLoop();
    }

    die() {
      const seed = particles.find((p) => p.id === this.plantId);
      if (seed && !seed.isDying) {
        console.log(
          `[Plant Death] Initiated for Plant ID ${this.plantId} by particle ${this.id}`
        );
        seed.isDying = true; // Prevent recursion
        const plantParticles = particles.filter(
          (p) => p.plantId === this.plantId
        );
        plantParticles.forEach((p) => p.destroy());
      } else {
        this.destroy(); // Is a seed or part of a dying plant
      }
    }

    destroy() {
      if (this.isDestroyed) return;
      this.isDestroyed = true;
      console.log(`[Destroy] ID: ${this.id}, Mode: ${this.mode}`);

      if (this.auraSprite) app.stage.removeChild(this.auraSprite);
      if (this.isPlantPart()) occupancyGrid.removePlant(this.pos.x, this.pos.y);
      if (this.mode === Mode.WATER)
        occupancyGrid.setWater(this.pos.x, this.pos.y, null);
      if (this.mode === Mode.ENERGY)
        occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
      if (this.sprite) app.stage.removeChild(this.sprite);

      const index = particles.indexOf(this);
      if (index > -1) particles.splice(index, 1);
    }
  }

  // === SECTION 5: INITIALIZATION ===
  for (let i = 0; i < CONSTANTS.SIMULATION.INITIAL_WATER_COUNT; i++) {
    particles.push(
      new Particle(
        Math.floor(Math.random() * cols),
        Math.floor(Math.random() * rows),
        Mode.WATER
      )
    );
  }

  const seedX = Math.floor(cols / 2);
  const seedY = rows - 5;
  const seed = new Particle(seedX, seedY, Mode.SEED);
  seed.plantId = seed.id; // Seed is the root of its own plant
  particles.push(seed);

  for (let i = 0; i < CONSTANTS.SIMULATION.SEED_BOOTSTRAP_ENERGY; i++) {
    const energy = new Particle(seedX, seedY, Mode.ENERGY);
    energy.plantId = seed.id; // Assign bootstrap energy to the seed's plant
    particles.push(energy);
  }

  // === SECTION 6: MAIN LOOP ===
  function advanceTick() {
    frame++;

    if (Math.random() < CONSTANTS.FLUX.P_ENERGY) {
      const leaves = particles.filter((p) => p.mode === Mode.LEAF);
      if (leaves.length > 0) {
        const target = leaves[Math.floor(Math.random() * leaves.length)];
        if (
          occupancyGrid.hasWater(target.pos.x, target.pos.y) &&
          !occupancyGrid.hasEnergy(target.pos.x, target.pos.y)
        ) {
          const spawnPositions = [];
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const x = target.pos.x + dx,
                y = target.pos.y + dy;
              if (
                x >= 0 &&
                x < cols &&
                y >= 0 &&
                y < rows &&
                !occupancyGrid.isPlantOccupied(x, y) &&
                !occupancyGrid.hasEnergy(x, y)
              ) {
                spawnPositions.push({ x, y });
              }
            }
          }
          if (spawnPositions.length > 0) {
            const pos =
              spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
            particles.push(new Particle(pos.x, pos.y, Mode.ENERGY));
          }
        }
      }
    }

    [...particles].forEach((particle) => {
      if (!particle.isDestroyed) particle.update();
    });
  }

  function updateDebugVisuals() {
    if (waterDebugContainer.children.length > 1) {
      waterDebugContainer.removeChildren(1); // Keep label
    }
    if (energyDebugContainer.children.length > 1) {
      energyDebugContainer.removeChildren(1); // Keep label
    }

    const firstSeed = particles.find((p) => p.mode === Mode.SEED && p.plantId);
    if (!firstSeed) return;
    const firstPlantId = firstSeed.plantId;

    const plantParticles = particles.filter(
      (p) => p.plantId === firstPlantId && p.isPlantPart()
    );

    const labelOffset = 20; // Space for the label text
    const miniMapScale = 2; // Each cell in the debug view is 2x2 pixels

    plantParticles.forEach((p) => {
      // Water debugger
      if (occupancyGrid.hasWater(p.pos.x, p.pos.y)) {
        const rect = new PIXI.Graphics();
        rect.beginFill(0x0066ff, 0.8);
        rect.drawRect(
          p.pos.x * miniMapScale,
          p.pos.y * miniMapScale + labelOffset,
          miniMapScale,
          miniMapScale
        );
        rect.endFill();
        waterDebugContainer.addChild(rect);
      }
      // Energy debugger
      if (occupancyGrid.hasEnergy(p.pos.x, p.pos.y)) {
        const rect = new PIXI.Graphics();
        rect.beginFill(0xffff00, 0.8);
        rect.drawRect(
          p.pos.x * miniMapScale,
          p.pos.y * miniMapScale + labelOffset,
          miniMapScale,
          miniMapScale
        );
        rect.endFill();
        energyDebugContainer.addChild(rect);
      }
    });
  }

  function mainLoop() {
    if (!paused) {
      const updatesThisFrame = fastForward ? fastForwardFactor : 1;
      for (let i = 0; i < updatesThisFrame; i++) {
        advanceTick();
      }
    }

    const now = performance.now();
    const fps = 1000 / (now - lastRenderTime);
    lastRenderTime = now;

    fpsText.text = `FPS: ${Math.round(fps)}`;
    particleCountText.text = `Particles: ${particles.length}`;
    statusText.text = paused
      ? `PAUSED - Tick ${frame}`
      : `RUNNING - Tick ${frame}`;

    if (frame % 5 === 0) {
      // Update debug visualizer less frequently
      updateDebugVisuals();
    }

    app.renderer.render(app.stage);
    requestAnimationFrame(mainLoop);
  }

  mainLoop();

  // === SECTION 7: CONTROLS ===
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      if (paused) advanceTick();
      e.preventDefault();
    }
    if (e.key === "p" || e.key === "P") {
      paused = !paused;
    }
    if (e.key === "r" || e.key === "R") {
      console.log(`\n--- REPORT @ Tick ${frame} ---`);
      console.log(`Particles: ${particles.length}`);
      const plants = [
        ...new Set(particles.filter((p) => p.plantId).map((p) => p.plantId)),
      ];
      console.log(`Active plants: ${plants.length}`);
      plants.forEach((id) => {
        const seed = particles.find((p) => p.id === id);
        if (seed)
          console.log(
            `  Plant ${id}: Age ${seed.age}, Lifespan ${
              seed.lifespan
            }, Cells ${countPlantCells(id)}`
          );
      });
    }
    if (e.key === "f" || e.key === "F") fastForward = !fastForward;
  });

  app.view.addEventListener("click", () => {
    if (paused) advanceTick();
  });
});
