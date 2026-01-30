// Simplant Headless Test Harness
// Strips PIXI rendering, runs pure simulation logic, outputs statistics

const CONFIGS = {
  baseline: {
    name: "Baseline (3+ cardinals only)",
    MIN_CARDINALS: 3,
    PROPORTIONAL_ABSORPTION: false,
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 3,
    MUTATION_RATE: 0.2,
    MAX_PLANT_AGE: 1000,
    STARVATION_TICKS: 200,
    AIRBORNE_STEPS: 40,
  },
  prop2card: {
    name: "2+ cardinals, proportional absorption",
    MIN_CARDINALS: 2,
    PROPORTIONAL_ABSORPTION: true, // 3 cardinals = 1.5x energy
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 3,
    MUTATION_RATE: 0.2,
    MAX_PLANT_AGE: 1000,
    STARVATION_TICKS: 200,
    AIRBORNE_STEPS: 40,
  },
  prop2card_lowRadius: {
    name: "2+ cardinals, proportional, radius=1",
    MIN_CARDINALS: 2,
    PROPORTIONAL_ABSORPTION: true,
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 1,
    MUTATION_RATE: 0.2,
    MAX_PLANT_AGE: 1000,
    STARVATION_TICKS: 200,
    AIRBORNE_STEPS: 40,
  },
  prop2card_highMutation: {
    name: "2+ cardinals, proportional, mutation=0.5",
    MIN_CARDINALS: 2,
    PROPORTIONAL_ABSORPTION: true,
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 3,
    MUTATION_RATE: 0.5,
    MAX_PLANT_AGE: 1000,
    STARVATION_TICKS: 200,
    AIRBORNE_STEPS: 40,
  },
  prop2card_combo: {
    name: "2+ cardinals, proportional, radius=2, mutation=0.4",
    MIN_CARDINALS: 2,
    PROPORTIONAL_ABSORPTION: true,
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 2,
    MUTATION_RATE: 0.4,
    MAX_PLANT_AGE: 1000,
    STARVATION_TICKS: 200,
    AIRBORNE_STEPS: 40,
  },
  longerLife: {
    name: "2+ cardinals, proportional, longer life (age=3000, starve=500)",
    MIN_CARDINALS: 2,
    PROPORTIONAL_ABSORPTION: true,
    LIGHT_ABSORB_PROB: 0.6,
    LIGHT_COOLDOWN: 30,
    GERMINATION_CLEAR_RADIUS: 3,
    MUTATION_RATE: 0.3,
    MAX_PLANT_AGE: 3000,
    STARVATION_TICKS: 500,
    AIRBORNE_STEPS: 40,
  },
};

// --- Simulation Parameters ---
const GRID_SIZE = 100; // 100x100 grid
const TARGET_TICKS = 1000000;
const LOG_INTERVAL = 50000;
const RNG_SEED = 14;

// --- Run a single configuration ---
function runSimulation(configKey) {
  const config = CONFIGS[configKey];
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RUNNING: ${config.name}`);
  console.log(`${"=".repeat(60)}`);

  // --- State ---
  let rngState = RNG_SEED >>> 0;
  let frame = 0;
  let plants = [];
  let lightParticles = [];
  let travelingSeeds = [];
  let idCounter = 0;
  let extinctionCount = 0;
  const cols = GRID_SIZE;
  const rows = GRID_SIZE;

  // Stats tracking
  let maxGenomeLenEver = 0;
  let longestGenomeEver = null;
  let totalReproductions = 0;
  const genomeLenHistory = [];

  // --- PRNG ---
  function rand() {
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return (rngState >>> 0) / 0x100000000;
  }
  function randInt(n) { return Math.floor(rand() * n); }

  // --- Grid ---
  const grid = new Array(cols * rows).fill(null);
  function idx(x, y) { return y * cols + x; }
  function wrap(x, y) {
    return { x: ((x % cols) + cols) % cols, y: ((y % rows) + rows) % rows };
  }
  function getCell(x, y) {
    const w = wrap(x, y);
    return grid[idx(w.x, w.y)];
  }
  function setCell(x, y, cell) {
    const w = wrap(x, y);
    grid[idx(w.x, w.y)] = cell;
  }
  function clearCell(x, y) {
    const w = wrap(x, y);
    grid[idx(w.x, w.y)] = null;
  }
  function isEmpty(x, y) { return !getCell(x, y); }

  function countOpenCardinals(x, y) {
    let count = 0;
    if (isEmpty(x, y - 1)) count++;
    if (isEmpty(x + 1, y)) count++;
    if (isEmpty(x, y + 1)) count++;
    if (isEmpty(x - 1, y)) count++;
    return count;
  }

  function hasOtherPlantNeighborMoore(x, y, plant) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const cell = getCell(x + dx, y + dy);
        if (cell && cell.plant !== plant) return true;
      }
    }
    return false;
  }

  function checkNeighborsEmpty(x, y, radius) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (!isEmpty(x + dx, y + dy)) return false;
      }
    }
    return true;
  }

  // --- Genetics ---
  class GeneNode {
    constructor(geneBits) {
      this.geneBits = geneBits;
      this.parent = null;
      this.children = [null, null, null];
      this.slotFromParent = null;
      this.cell = null;
      this.grownMask = 0;
    }
    hasChildInSlot(slot) { return (this.geneBits >> slot) & 1; }
    isChildGrown(slot) { return (this.grownMask >> slot) & 1; }
    markChildGrown(slot) { this.grownMask |= 1 << slot; }
  }

  function decodeGenomeToTree(genome) {
    let index = 0;
    function buildNode() {
      if (index >= genome.length) return null;
      const geneBits = genome[index++];
      const node = new GeneNode(geneBits);
      for (let slot = 0; slot < 3; slot++) {
        if (node.hasChildInSlot(slot)) {
          const child = buildNode();
          if (child) {
            node.children[slot] = child;
            child.parent = node;
            child.slotFromParent = slot;
          }
        }
      }
      return node;
    }
    return buildNode();
  }

  function encodeTreeToGenome(root) {
    const result = [];
    function traverse(node) {
      if (!node) return;
      result.push(node.geneBits);
      for (let slot = 0; slot < 3; slot++) {
        if (node.children[slot]) traverse(node.children[slot]);
      }
    }
    traverse(root);
    return new Uint8Array(result);
  }

  function getNodeAtIndex(root, index) {
    let current = 0;
    let result = null;
    function traverse(node) {
      if (!node || result) return;
      if (current === index) { result = node; return; }
      current++;
      for (let slot = 0; slot < 3; slot++) {
        if (node.children[slot]) traverse(node.children[slot]);
      }
    }
    traverse(root);
    return result;
  }

  function mutateGenome(genome) {
    const newGenome = new Uint8Array(genome);
    const len = newGenome.length;
    let geneIdx;
    if (len > 1) {
      const i1 = randInt(len);
      const i2 = randInt(len);
      geneIdx = Math.max(i1, i2);
      if (geneIdx === 0) geneIdx = randInt(len - 1) + 1;
    } else {
      geneIdx = 0;
    }
    const bitIdx = randInt(3);
    let root = decodeGenomeToTree(newGenome);
    const targetNode = getNodeAtIndex(root, geneIdx);
    if (!targetNode) return newGenome;
    const bitMask = 1 << bitIdx;
    const wasBitSet = (targetNode.geneBits & bitMask) !== 0;
    if (wasBitSet) {
      const childNode = targetNode.children[bitIdx];
      if (childNode && childNode.geneBits > 0) return newGenome;
    }
    targetNode.geneBits ^= bitMask;
    if (wasBitSet) {
      targetNode.children[bitIdx] = null;
    } else {
      const newChild = new GeneNode(0);
      targetNode.children[bitIdx] = newChild;
      newChild.parent = targetNode;
      newChild.slotFromParent = bitIdx;
    }
    return encodeTreeToGenome(root);
  }

  // --- Plant/Cell Classes ---
  const dirMap = {
    N: [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }],
    E: [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
    S: [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }],
    W: [{ dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }],
  };
  const rotations = {
    N: ["W", "N", "E"], E: ["N", "E", "S"], S: ["E", "S", "W"], W: ["S", "W", "N"],
  };

  class Cell {
    constructor(x, y, plant, node, parent, facing, isSeed = false) {
      this.pos = wrap(x, y);
      this.plant = plant;
      this.node = node;
      this.parent = parent;
      this.facing = facing;
      this.children = [];
      this.cooldown = 0;
      this.isSeed = isSeed;
      setCell(this.pos.x, this.pos.y, this);
      plant.registerCell(this);
    }

    getChildPosForSlot(slot) {
      const off = dirMap[this.facing][slot];
      return { x: this.pos.x + off.dx, y: this.pos.y + off.dy };
    }

    getChildFacing(slot) { return rotations[this.facing][slot]; }

    canGrowAt(pos) {
      const w = wrap(pos.x, pos.y);
      return isEmpty(w.x, w.y) && !hasOtherPlantNeighborMoore(w.x, w.y, this.plant);
    }

    growChildInSlot(slot) {
      const childNode = this.node.children[slot];
      if (!childNode) return;
      const rawPos = this.getChildPosForSlot(slot);
      const w = wrap(rawPos.x, rawPos.y);
      const facing = this.getChildFacing(slot);
      const child = new Cell(w.x, w.y, this.plant, childNode, this, facing);
      this.children.push(child);
    }
  }

  class Plant {
    constructor(genome, x, y) {
      this.id = idCounter++;
      this.genome = genome;
      this.rootNode = decodeGenomeToTree(genome);
      this.cells = [];
      this.frontier = [];
      this.energy = 0;
      this.freeSproutUsed = false;
      this.reproPhase = "idle";
      this.childGenome = null;
      this.childGeneCount = 0;
      this.age = 0;
      this.ticksWithoutLight = 0;
      this.dead = false;

      // Create seed cell
      this.seed = new Cell(x, y, this, this.rootNode, null, "N", true);
    }

    get geneCount() { return this.genome.length; }

    registerCell(cell) {
      this.cells.push(cell);
      if (cell.node) {
        cell.node.cell = cell;
        for (let slot = 0; slot < 3; slot++) {
          if (cell.node.children[slot] && !cell.node.isChildGrown(slot)) {
            this.frontier.push({ node: cell.node, slot });
          }
        }
      }
    }

    tryGrowOneStep() {
      if (this.energy < 1 && this.freeSproutUsed) return;
      for (let i = this.frontier.length - 1; i >= 0; i--) {
        const { node, slot } = this.frontier[i];
        if (this.energy < 1 && this.freeSproutUsed) return;
        const pos = node.cell.getChildPosForSlot(slot);
        if (node.cell.canGrowAt(pos)) {
          node.cell.growChildInSlot(slot);
          if (this.freeSproutUsed) this.energy--;
          else this.freeSproutUsed = true;
          this.frontier.splice(i, 1);
          return;
        } else {
          node.markChildGrown(slot);
          this.frontier.splice(i, 1);
        }
      }
    }

    die() {
      this.dead = true;
      for (const cell of this.cells) {
        clearCell(cell.pos.x, cell.pos.y);
        if (cell.node) cell.node.cell = null;
      }
      this.cells = [];
      this.frontier = [];
    }
  }

  // --- Light Particle ---
  class LightParticle {
    constructor(cell, energyValue) {
      this.cell = cell;
      this.plant = cell.plant;
      this.energyValue = energyValue;
      this.pauseTicks = 1;
      lightParticles.push(this);
    }

    update() {
      if (this.pauseTicks > 0) { this.pauseTicks--; return; }
      if (this.cell.parent) {
        this.cell = this.cell.parent;
      } else {
        this.plant.energy += this.energyValue;
        this.destroy();
      }
    }

    destroy() {
      const idx = lightParticles.indexOf(this);
      if (idx >= 0) lightParticles.splice(idx, 1);
    }
  }

  // --- Traveling Seed ---
  class TravelingSeed {
    constructor(plant, childGenome) {
      this.state = "attached";
      this.parentPlant = plant;
      this.childGenome = childGenome;
      this.currentNode = plant.rootNode;
      this.pos = null;
      this.stepsTaken = 0;
      travelingSeeds.push(this);
    }

    update() {
      if (this.state === "attached") {
        if (!this.currentNode.cell) { this.destroy(); return; }
        const childCells = this.currentNode.children.filter(c => c && c.cell);
        if (childCells.length > 0) {
          this.currentNode = childCells[randInt(childCells.length)];
        } else {
          this.state = "airborne";
          this.pos = { ...this.currentNode.cell.pos };
          this.stepsTaken = 0;
        }
      } else {
        if (this.stepsTaken >= config.AIRBORNE_STEPS) {
          this.tryGerminate();
          return;
        }
        const dirs = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }];
        const dir = dirs[randInt(4)];
        const w = wrap(this.pos.x + dir.dx, this.pos.y + dir.dy);
        this.pos = w;
        this.stepsTaken++;
      }
    }

    tryGerminate() {
      if (!isEmpty(this.pos.x, this.pos.y)) { this.destroy(); return; }
      if (!checkNeighborsEmpty(this.pos.x, this.pos.y, config.GERMINATION_CLEAR_RADIUS)) {
        this.destroy(); return;
      }
      const newPlant = new Plant(this.childGenome, this.pos.x, this.pos.y);
      plants.push(newPlant);
      totalReproductions++;
      this.destroy();
    }

    destroy() {
      const idx = travelingSeeds.indexOf(this);
      if (idx >= 0) travelingSeeds.splice(idx, 1);
    }
  }

  // --- Initialize ---
  const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);
  const startPlant = new Plant(DEFAULT_GENOME, Math.floor(cols / 2), Math.floor(rows / 2));
  plants.push(startPlant);

  // --- Main Loop ---
  function tick() {
    frame++;

    // Growth & death check
    for (let i = plants.length - 1; i >= 0; i--) {
      const plant = plants[i];
      plant.age++;
      plant.ticksWithoutLight++;

      if (plant.age >= config.MAX_PLANT_AGE * plant.geneCount ||
          plant.ticksWithoutLight >= config.STARVATION_TICKS) {
        plant.die();
        plants.splice(i, 1);
        // Clean up light particles for dead plant
        for (let j = lightParticles.length - 1; j >= 0; j--) {
          if (lightParticles[j].plant === plant) {
            lightParticles.splice(j, 1);
          }
        }
        continue;
      }
      plant.tryGrowOneStep();
    }

    // Light absorption
    for (const plant of plants) {
      for (const cell of plant.cells) {
        if (cell.isSeed) continue;
        if (cell.cooldown > 0) { cell.cooldown--; continue; }

        const openCardinals = countOpenCardinals(cell.pos.x, cell.pos.y);
        if (openCardinals >= config.MIN_CARDINALS) {
          if (rand() < config.LIGHT_ABSORB_PROB) {
            // Proportional absorption: 3 cardinals = 1.5x, 2 cardinals = 1x
            let energyValue = 1;
            if (config.PROPORTIONAL_ABSORPTION && openCardinals >= 3) {
              energyValue = 1.5;
            }
            new LightParticle(cell, energyValue);
            cell.cooldown = config.LIGHT_COOLDOWN;
            plant.ticksWithoutLight = 0;
          }
        }
      }
    }

    // Light propagation
    for (const light of [...lightParticles]) {
      light.update();
    }

    // Reproduction
    for (const plant of plants) {
      const G = plant.geneCount;
      if (plant.reproPhase === "idle") {
        if (plant.energy >= G) {
          plant.childGenome = rand() < config.MUTATION_RATE
            ? mutateGenome(plant.genome)
            : new Uint8Array(plant.genome);
          plant.childGeneCount = plant.childGenome.length;
          plant.reproPhase = "charging";
        }
      } else if (plant.reproPhase === "charging") {
        if (plant.energy >= G + plant.childGeneCount) {
          new TravelingSeed(plant, plant.childGenome);
          plant.energy -= plant.childGeneCount;
          plant.reproPhase = "idle";
          plant.childGenome = null;
          plant.childGeneCount = 0;
        }
      }
    }

    // Seed transport
    for (const seed of [...travelingSeeds]) {
      seed.update();
    }

    // Extinction restart
    if (plants.length === 0 && travelingSeeds.length === 0) {
      extinctionCount++;
      rngState = (rngState + 1337) >>> 0;
      const newPlant = new Plant(DEFAULT_GENOME, Math.floor(cols / 2), Math.floor(rows / 2));
      plants.push(newPlant);
    }
  }

  // --- Statistics ---
  function getStats() {
    if (plants.length === 0) {
      return { plantCount: 0, avgGenomeLen: 0, maxGenomeLen: 0, avgCells: 0, modeGenome: "N/A", modeCount: 0 };
    }

    let totalLen = 0;
    let totalCells = 0;
    let maxLen = 0;
    const genomeCounts = new Map();

    for (const p of plants) {
      totalLen += p.genome.length;
      totalCells += p.cells.length;
      if (p.genome.length > maxLen) maxLen = p.genome.length;
      if (p.genome.length > maxGenomeLenEver) {
        maxGenomeLenEver = p.genome.length;
        longestGenomeEver = new Uint8Array(p.genome);
      }

      const k = p.genome.toString();
      genomeCounts.set(k, (genomeCounts.get(k) || 0) + 1);
    }

    let maxCount = 0;
    let modeGenomeStr = "";
    for (const [k, count] of genomeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        modeGenomeStr = k;
      }
    }

    const modeGenomeBits = modeGenomeStr ?
      modeGenomeStr.split(",").map(n => parseInt(n).toString(2).padStart(3, "0")).join(" ") : "N/A";

    return {
      plantCount: plants.length,
      avgGenomeLen: (totalLen / plants.length).toFixed(2),
      maxGenomeLen: maxLen,
      avgCells: (totalCells / plants.length).toFixed(2),
      modeGenome: modeGenomeBits,
      modeLen: modeGenomeStr ? modeGenomeStr.split(",").length : 0,
      modeCount: maxCount,
    };
  }

  // --- Run simulation ---
  const startTime = Date.now();

  while (frame < TARGET_TICKS) {
    tick();

    if (frame % LOG_INTERVAL === 0) {
      const stats = getStats();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `Tick ${frame.toLocaleString().padStart(10)} | ` +
        `Plants: ${stats.plantCount.toString().padStart(4)} | ` +
        `AvgLen: ${stats.avgGenomeLen.padStart(5)} | ` +
        `MaxLen: ${stats.maxGenomeLen.toString().padStart(2)} | ` +
        `AvgCells: ${stats.avgCells.padStart(6)} | ` +
        `Mode(${stats.modeLen}): ${stats.modeGenome.substring(0, 30).padEnd(30)} x${stats.modeCount} | ` +
        `${elapsed}s`
      );
      genomeLenHistory.push({ tick: frame, avgLen: parseFloat(stats.avgGenomeLen), maxLen: stats.maxGenomeLen });
    }
  }

  // Final summary
  const finalStats = getStats();
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n--- FINAL RESULTS: ${config.name} ---`);
  console.log(`Total ticks: ${frame.toLocaleString()}`);
  console.log(`Runtime: ${totalTime}s`);
  console.log(`Extinctions: ${extinctionCount}`);
  console.log(`Total reproductions: ${totalReproductions.toLocaleString()}`);
  console.log(`Final plant count: ${finalStats.plantCount}`);
  console.log(`Final avg genome length: ${finalStats.avgGenomeLen}`);
  console.log(`Max genome length ever seen: ${maxGenomeLenEver}`);
  if (longestGenomeEver) {
    const longestBits = [...longestGenomeEver].map(n => n.toString(2).padStart(3, "0")).join(" ");
    console.log(`Longest genome: ${longestBits}`);
  }
  console.log(`Final avg cells per plant: ${finalStats.avgCells}`);
  console.log(`Dominant genome: ${finalStats.modeGenome} (${finalStats.modeCount} clones)`);

  // Trend analysis
  if (genomeLenHistory.length >= 4) {
    const early = genomeLenHistory.slice(0, Math.floor(genomeLenHistory.length / 4));
    const late = genomeLenHistory.slice(-Math.floor(genomeLenHistory.length / 4));
    const earlyAvg = early.reduce((s, x) => s + x.avgLen, 0) / early.length;
    const lateAvg = late.reduce((s, x) => s + x.avgLen, 0) / late.length;
    console.log(`Genome length trend: ${earlyAvg.toFixed(2)} → ${lateAvg.toFixed(2)} (${lateAvg > earlyAvg ? "INCREASING" : lateAvg < earlyAvg ? "DECREASING" : "STABLE"})`);
  }

  return {
    config: configKey,
    name: config.name,
    finalPlantCount: finalStats.plantCount,
    avgGenomeLen: parseFloat(finalStats.avgGenomeLen),
    maxGenomeLenEver,
    avgCells: parseFloat(finalStats.avgCells),
    extinctions: extinctionCount,
    reproductions: totalReproductions,
    runtime: parseFloat(totalTime),
    dominantGenome: finalStats.modeGenome,
  };
}

// --- Run all configs ---
const configsToRun = process.argv.slice(2);
const results = [];

if (configsToRun.length === 0) {
  // Run all
  for (const key of Object.keys(CONFIGS)) {
    results.push(runSimulation(key));
  }
} else {
  for (const key of configsToRun) {
    if (CONFIGS[key]) {
      results.push(runSimulation(key));
    } else {
      console.log(`Unknown config: ${key}`);
    }
  }
}

// --- Comparison summary ---
console.log(`\n${"=".repeat(80)}`);
console.log("COMPARISON SUMMARY");
console.log(`${"=".repeat(80)}`);
console.log("Config".padEnd(50) + "AvgLen  MaxLen  AvgCells  Extinctions");
console.log("-".repeat(80));
for (const r of results) {
  console.log(
    r.name.padEnd(50) +
    r.avgGenomeLen.toFixed(2).padStart(6) + "  " +
    r.maxGenomeLenEver.toString().padStart(6) + "  " +
    r.avgCells.toFixed(2).padStart(8) + "  " +
    r.extinctions.toString().padStart(11)
  );
}
