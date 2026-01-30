// Simplant v20: Deferred Visuals + O(1) Removal
// Key changes:
// - Swap-and-pop for O(1) array removal (no more splice)
// - Sprite positions only updated on final tick of batch
// - Minimal work during fast-forward ticks

console.log("Simplant v20: Deferred visuals + O(1) removal");

const CONSTANTS = {
  SCALE_SIZE: 4,
  TICK_INTERVAL_MS: 1,
  RNG_SEED: 14,
  PLANT_TINT_STRENGTH: 0.5,
  COLORS: {
    SEED_IDLE: 0x8b4513,
    SEED_READY: 0xff0000,
    SEED_CHARGED: 0xffffff,
    SEED: 0x8b4513,
    STEM: 0x228b22,
    LIGHT: 0xffff00,
    BG: 0x000000,
  },
  THEMES: [
    {
      NAME: "Original",
      COLORS: {
        SEED_IDLE: 0x8b4513,
        SEED_READY: 0xff0000,
        SEED_CHARGED: 0xffffff,
        SEED: 0x8b4513,
        STEM: 0x228b22,
        LIGHT: 0xffff00,
        BG: 0x000000,
      },
    },
    {
      NAME: "Bioluminescent Abyss",
      COLORS: {
        SEED_IDLE: 0xffaa00,
        SEED_READY: 0xff00ff,
        SEED_CHARGED: 0xffffff,
        SEED: 0xffaa00,
        STEM: 0x00ffff,
        LIGHT: 0xff0088,
        BG: 0x050510,
      },
    },
    {
      NAME: "Satellite Infrared",
      COLORS: {
        SEED_IDLE: 0x4b0082,
        SEED_READY: 0xffffff,
        SEED_CHARGED: 0xff0000,
        SEED: 0x4b0082,
        STEM: 0xff4500,
        LIGHT: 0xffff00,
        BG: 0x2f4f4f,
      },
    },
    {
      NAME: "Paper & Ink",
      COLORS: {
        SEED_IDLE: 0x2f2f2f,
        SEED_READY: 0x8b0000,
        SEED_CHARGED: 0x000000,
        SEED: 0x2f2f2f,
        STEM: 0x556b2f,
        LIGHT: 0x87ceeb,
        BG: 0xf5f5dc,
      },
    },
    {
      NAME: "Dark Ink",
      COLORS: {
        SEED_IDLE: 0x888888,
        SEED_READY: 0xff4444,
        SEED_CHARGED: 0xffffff,
        SEED: 0x888888,
        STEM: 0x6b8e23,
        LIGHT: 0xadd8e6,
        BG: 0x000000,
      },
    },
  ],
  LIGHT_ABSORB_PROB: 0.6,
  LIGHT_COOLDOWN: 30,
  LIGHT_ABSORPTION_PAUSE: 1,
  NUM_STARTER_SEEDS: 1,
  FORCE_SEED_STALK: true,
  ENABLE_RANDOM_FACING: false,
  AIRBORNE_STEPS: 40,
  MUTATION_RATE: 0.2,
  MAX_PLANT_AGE: 1000,
  STARVATION_TICKS: 200,
  GERMINATION_CLEAR_RADIUS: 3,
  GRADUATED_ABSORPTION: false,
  CHILD_STARTING_ENERGY: false,
  DISTANCE_BONUS: false,
  DISTANCE_BONUS_FACTOR: 0.1,
  // Visual toggles (for performance testing) - all OFF by default for max performance
  SHOW_LIGHT_PARTICLES: false, // [4] Toggle light particle visualization
  ENABLE_PLANT_TINT: false, // [5] Toggle plant tinting
  SHOW_TRAVELING_SEEDS: false, // [6] Toggle traveling seed visualization
};

let app,
  cols,
  rows,
  grid,
  textures = {},
  frame = 0;
let paused = true,
  fastForward = true,
  fastForwardFactor = 100;
let fastForwardLevels = [0.5, 1, 10, 100],
  fastForwardIndex = 3,
  lastTickTime = 0;
let lightParticles = [],
  travelingSeeds = [],
  plants = [];
let currentThemeIndex = 0;
let fpsText, particleCountText, experimentText;
let uiUpdateCounter = 0;
const UI_UPDATE_INTERVAL = 15;

// Sprite pools
class SpritePool {
  constructor(texture) {
    this.texture = texture;
    this.pool = [];
    this.activeCount = 0;
  }
  acquire(x, y, tint, alpha) {
    let sprite;
    if (this.activeCount < this.pool.length) {
      sprite = this.pool[this.activeCount];
    } else {
      sprite = new PIXI.Sprite(this.texture);
      sprite.scale.set(CONSTANTS.SCALE_SIZE);
      app.stage.addChild(sprite);
      this.pool.push(sprite);
    }
    sprite.x = x * CONSTANTS.SCALE_SIZE;
    sprite.y = y * CONSTANTS.SCALE_SIZE;
    sprite.tint = tint;
    sprite.alpha = alpha;
    sprite.visible = true;
    this.activeCount++;
    return sprite;
  }
  release(sprite) {
    sprite.visible = false;
    const idx = this.pool.indexOf(sprite);
    if (idx !== -1 && idx < this.activeCount) {
      this.activeCount--;
      this.pool[idx] = this.pool[this.activeCount];
      this.pool[this.activeCount] = sprite;
    }
  }
  updateTexture(t) {
    this.texture = t;
    for (let i = 0; i < this.pool.length; i++) this.pool[i].texture = t;
  }
}
let seedPool, stemPool, lightPool;

// PRNG
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(
  params.get("seed") || CONSTANTS.RNG_SEED.toString(),
  10
);
let rngState = (isFinite(seedParam) ? seedParam : CONSTANTS.RNG_SEED) >>> 0;

function rand() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0x100000000;
}
function randInt(n) {
  return (rand() * n) | 0;
}

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff,
    g1 = (c1 >> 8) & 0xff,
    b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff,
    g2 = (c2 >> 8) & 0xff,
    b2 = c2 & 0xff;
  return (
    (((r1 + (r2 - r1) * t + 0.5) | 0) << 16) |
    (((g1 + (g2 - g1) * t + 0.5) | 0) << 8) |
    ((b1 + (b2 - b1) * t + 0.5) | 0)
  );
}

function hsvToRgbInt(h, s, v) {
  const i = (h * 6) | 0,
    f = h * 6 - i;
  const p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return (
    (((r * 255 + 0.5) | 0) << 16) |
    (((g * 255 + 0.5) | 0) << 8) |
    ((b * 255 + 0.5) | 0)
  );
}

function plantColorFromGenome(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  return hsvToRgbInt((sum * 0.01) % 1, 0.85, 1.0);
}

// Genetics
class GeneNode {
  constructor(geneBits) {
    this.geneBits = geneBits;
    this.parent = null;
    this.children = [null, null, null];
    this.slotFromParent = null;
    this.cell = null;
    this.grownMask = 0;
  }
}

function decodeGenomeToTree(genome) {
  let index = 0;
  function buildNode() {
    if (index >= genome.length) return null;
    const geneBits = genome[index++];
    const node = new GeneNode(geneBits);
    for (let slot = 0; slot < 3; slot++) {
      if ((geneBits >> slot) & 1) {
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
    for (let slot = 0; slot < 3; slot++)
      if (node.children[slot]) traverse(node.children[slot]);
  }
  traverse(root);
  return new Uint8Array(result);
}

function mutateGenome(genome) {
  const newGenome = new Uint8Array(genome);
  const len = newGenome.length;
  let geneIdx = len > 1 ? Math.max(randInt(len), randInt(len)) : 0;
  if (len > 1 && CONSTANTS.FORCE_SEED_STALK && geneIdx === 0)
    geneIdx = randInt(len - 1) + 1;
  const bitIdx = randInt(3);
  const root = decodeGenomeToTree(newGenome);
  let current = 0,
    targetNode = null;
  function findNode(node) {
    if (!node || targetNode) return;
    if (current === geneIdx) {
      targetNode = node;
      return;
    }
    current++;
    for (let slot = 0; slot < 3; slot++)
      if (node.children[slot]) findNode(node.children[slot]);
  }
  findNode(root);
  if (!targetNode) return newGenome;
  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;
  if (
    wasBitSet &&
    targetNode.children[bitIdx] &&
    targetNode.children[bitIdx].geneBits > 0
  )
    return newGenome;
  targetNode.geneBits ^= bitMask;
  if (wasBitSet) targetNode.children[bitIdx] = null;
  else {
    const c = new GeneNode(0);
    targetNode.children[bitIdx] = c;
    c.parent = targetNode;
    c.slotFromParent = bitIdx;
  }
  return encodeTreeToGenome(root);
}

// Direction tables
const DIR_DX = new Int8Array([-1, 0, 1, 0, 1, 0, 1, 0, -1, 0, -1, 0]);
const DIR_DY = new Int8Array([0, -1, 0, -1, 0, 1, 0, 1, 0, 1, 0, -1]);
const ROTATIONS_FLAT = [3, 0, 1, 0, 1, 2, 1, 2, 3, 2, 3, 0];

let idCounter = 0;

class Plant {
  constructor(genome, startingEnergy = 0) {
    this.id = idCounter++;
    this.color = plantColorFromGenome(genome);
    this.stemTint = CONSTANTS.ENABLE_PLANT_TINT
      ? lerpColor(
          CONSTANTS.COLORS.STEM,
          this.color,
          CONSTANTS.PLANT_TINT_STRENGTH
        )
      : CONSTANTS.COLORS.STEM;
    this.genome = genome;
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = null;
    this.energy = startingEnergy;
    this.freeSproutUsed = false;
    this.cells = [];
    this.frontier = [];
    this.reproPhase = 0;
    this.childGenome = null;
    this.childGeneCount = 0;
    this.age = 0;
    this.ticksWithoutLight = 0;
    this.dead = false;
    this.lastVisualEnergy = -1;
  }

  registerCell(cell) {
    this.cells.push(cell);
    if (cell.node) {
      cell.node.cell = cell;
      const geneBits = cell.node.geneBits;
      for (let slot = 0; slot < 3; slot++) {
        if ((geneBits >> slot) & 1 && !((cell.node.grownMask >> slot) & 1)) {
          this.frontier.push(cell.node, slot);
        }
      }
    }
  }

  tryGrowOneStep() {
    if (this.energy < 1 && this.freeSproutUsed) return;
    const frontier = this.frontier;
    for (let i = frontier.length - 2; i >= 0; i -= 2) {
      const node = frontier[i],
        slot = frontier[i + 1];
      if (this.energy < 1 && this.freeSproutUsed) return;
      const cell = node.cell;
      const fidx = cell.facingIdx * 3 + slot;
      let nx = cell.x + DIR_DX[fidx],
        ny = cell.y + DIR_DY[fidx];
      if (nx < 0) nx += cols;
      else if (nx >= cols) nx -= cols;
      if (ny < 0) ny += rows;
      else if (ny >= rows) ny -= rows;
      if (!grid[ny * cols + nx]) {
        let blocked = false;
        for (let ddx = -1; ddx <= 1 && !blocked; ddx++) {
          for (let ddy = -1; ddy <= 1 && !blocked; ddy++) {
            if (ddx === 0 && ddy === 0) continue;
            let mx = nx + ddx,
              my = ny + ddy;
            if (mx < 0) mx += cols;
            else if (mx >= cols) mx -= cols;
            if (my < 0) my += rows;
            else if (my >= rows) my -= rows;
            const neighbor = grid[my * cols + mx];
            if (neighbor && neighbor.plant !== this) blocked = true;
          }
        }
        if (!blocked) {
          // Remove from frontier BEFORE creating child (which adds new frontier entries)
          frontier.splice(i, 2);
          const childNode = node.children[slot];
          if (childNode) {
            const newFacing = ROTATIONS_FLAT[cell.facingIdx * 3 + slot];
            const child = new PlantCell(
              nx,
              ny,
              this,
              childNode,
              cell,
              newFacing
            );
            cell.children.push(child);
          }
          if (this.freeSproutUsed) this.energy--;
          else this.freeSproutUsed = true;
          return;
        }
      }
      node.grownMask |= 1 << slot;
      frontier.splice(i, 2);
    }
  }

  die() {
    this.dead = true;
    const cells = this.cells;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      grid[cell.y * cols + cell.x] = null;
      if (cell.isSeed) seedPool.release(cell.sprite);
      else stemPool.release(cell.sprite);
      if (cell.node) cell.node.cell = null;
    }
    this.cells = [];
    this.frontier = [];
    for (let i = lightParticles.length - 1; i >= 0; i--) {
      if (lightParticles[i].plant === this) lightParticles[i].dead = true;
    }
  }

  updateVisuals() {
    if (!this.seed) return;
    const energyBucket = ((this.energy * 10) / this.genome.length) | 0;
    if (energyBucket === this.lastVisualEnergy) return;
    this.lastVisualEnergy = energyBucket;
    const G = this.genome.length;
    let color;
    if (this.reproPhase === 0) {
      color = lerpColor(
        CONSTANTS.COLORS.SEED_IDLE,
        CONSTANTS.COLORS.SEED_READY,
        Math.min(1, this.energy / G)
      );
    } else {
      color = lerpColor(
        CONSTANTS.COLORS.SEED_READY,
        CONSTANTS.COLORS.SEED_CHARGED,
        Math.min(1, (this.energy - G) / this.childGeneCount)
      );
    }
    this.seed.sprite.tint = color;
  }
}

class SeedCell {
  constructor(x, y, plant) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = plant.rootNode;
    this.parent = null;
    this.children = [];
    this.cooldown = 0;
    this.facingIdx = CONSTANTS.ENABLE_RANDOM_FACING ? randInt(4) : 0;
    this.isSeed = true;
    this.sprite = seedPool.acquire(x, y, CONSTANTS.COLORS.SEED_IDLE, 1);
    grid[y * cols + x] = this;
    plant.registerCell(this);
  }
}

class PlantCell {
  constructor(x, y, plant, node, parent, facingIdx) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facingIdx = facingIdx;
    this.children = [];
    this.cooldown = 0;
    this.isSeed = false;
    this.sprite = stemPool.acquire(x, y, plant.stemTint, 1);
    grid[y * cols + x] = this;
    plant.registerCell(this);
  }
}

// Light particles - minimal object, logic in advanceTick
function createLight(cell, baseEnergy) {
  const lp = {
    cell: cell,
    plant: cell.plant,
    baseEnergy: baseEnergy,
    steps: 0,
    dead: false,
    sprite: null,
    pauseTicks: CONSTANTS.LIGHT_ABSORPTION_PAUSE,
  };
  if (CONSTANTS.SHOW_LIGHT_PARTICLES) {
    lp.sprite = lightPool.acquire(cell.x, cell.y, CONSTANTS.COLORS.LIGHT, 0.5);
  }
  return lp;
}

// Traveling seeds - minimal object
function createTravelingSeed(plant, childGenome) {
  return {
    state: 0, // 0=attached, 1=airborne
    parentPlant: plant,
    childGenome: childGenome,
    currentNode: plant.rootNode,
    x: 0,
    y: 0,
    stepsTaken: 0,
    sprite: null,
    dead: false,
  };
}

const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

function createPlant(genome, x, y, startingEnergy = 0) {
  const plant = new Plant(genome, startingEnergy);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

function initializeSeeds() {
  const numSeeds = CONSTANTS.NUM_STARTER_SEEDS;
  const halfMutated = (numSeeds / 2) | 0;
  for (let i = 0; i < numSeeds; i++) {
    let x, y;
    if (numSeeds === 1) {
      x = (cols / 2) | 0;
      y = (rows / 2) | 0;
      if (grid[y * cols + x]) {
        x = randInt(cols);
        y = randInt(rows);
      }
    } else {
      let attempts = 0;
      do {
        x = randInt(cols);
        y = randInt(rows);
        attempts++;
      } while (grid[y * cols + x] && attempts < 1000);
      if (attempts >= 1000) continue;
    }
    plants.push(
      createPlant(
        i < numSeeds - halfMutated
          ? new Uint8Array(DEFAULT_GENOME)
          : mutateGenome(DEFAULT_GENOME),
        x,
        y
      )
    );
  }
}

function init() {
  console.log("Simplant v20: init");
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: CONSTANTS.COLORS.BG,
    antialias: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";
  app.renderer.roundPixels = true;
  cols = (window.innerWidth / CONSTANTS.SCALE_SIZE) | 0;
  rows = (window.innerHeight / CONSTANTS.SCALE_SIZE) | 0;
  grid = new Array(cols * rows).fill(null);
  createTextures();
  seedPool = new SpritePool(textures.seed);
  stemPool = new SpritePool(textures.stem);
  lightPool = new SpritePool(textures.light);
  createUI();
  initializeSeeds();
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  app.view.addEventListener("click", () => {
    if (paused) {
      advanceTick(true);
      syncVisuals();
    }
  });
  const btn = document.createElement("button");
  btn.id = "ff-btn";
  btn.innerText = `${fastForwardFactor}x`;
  btn.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:1000;padding:10px;background:#333;color:#fff;border:1px solid #fff;cursor:pointer";
  btn.onclick = () => {
    fastForwardIndex = (fastForwardIndex + 1) % fastForwardLevels.length;
    fastForwardFactor = fastForwardLevels[fastForwardIndex];
    btn.innerText = `${fastForwardFactor}x`;
    fastForward = fastForwardFactor > 1;
    if (fastForward) paused = false;
  };
  document.body.appendChild(btn);
  app.ticker.add(gameLoop);
  setTimeout(() => {
    if (frame === 0) paused = false;
  }, 1000);
}

function createTextures() {
  function rect(c) {
    const g = new PIXI.Graphics();
    g.beginFill(c);
    g.drawRect(0, 0, 1, 1);
    g.endFill();
    return app.renderer.generateTexture(g);
  }
  textures.seed = rect(0xffffff);
  textures.stem = rect(0xffffff);
  textures.light = rect(CONSTANTS.COLORS.LIGHT);
}

function createUI() {
  const style = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 14,
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 2,
  });
  fpsText = new PIXI.Text("FPS: 0", style);
  fpsText.x = 10;
  fpsText.y = 10;
  fpsText.zIndex = 1000;
  app.stage.addChild(fpsText);
  particleCountText = new PIXI.Text("", style);
  particleCountText.x = 10;
  particleCountText.y = 30;
  particleCountText.zIndex = 1000;
  app.stage.addChild(particleCountText);
  experimentText = new PIXI.Text("", style);
  experimentText.x = 10;
  experimentText.y = 50;
  experimentText.zIndex = 1000;
  app.stage.addChild(experimentText);
  updateExperimentText();
  app.stage.sortableChildren = true;
}

function updateExperimentText() {
  if (experimentText)
    experimentText.text = `[1]Grad:${
      CONSTANTS.GRADUATED_ABSORPTION ? "ON" : "OFF"
    } [2]ChildE:${CONSTANTS.CHILD_STARTING_ENERGY ? "ON" : "OFF"} [3]Dist:${
      CONSTANTS.DISTANCE_BONUS ? "ON" : "OFF"
    } [4]Light:${CONSTANTS.SHOW_LIGHT_PARTICLES ? "ON" : "OFF"} [5]Tint:${
      CONSTANTS.ENABLE_PLANT_TINT ? "ON" : "OFF"
    } [6]Seeds:${CONSTANTS.SHOW_TRAVELING_SEEDS ? "ON" : "OFF"}`;
}

function resetSimulation() {
  for (let i = 0; i < plants.length; i++) {
    const cells = plants[i].cells;
    for (let j = 0; j < cells.length; j++) {
      if (cells[j].isSeed) seedPool.release(cells[j].sprite);
      else stemPool.release(cells[j].sprite);
    }
  }
  plants = [];
  for (let i = 0; i < lightParticles.length; i++) {
    if (lightParticles[i].sprite) lightPool.release(lightParticles[i].sprite);
  }
  lightParticles = [];
  for (let i = 0; i < travelingSeeds.length; i++)
    if (travelingSeeds[i].sprite) seedPool.release(travelingSeeds[i].sprite);
  travelingSeeds = [];
  grid = new Array(cols * rows).fill(null);
  frame = 0;
  idCounter = 0;
  rngState = CONSTANTS.RNG_SEED >>> 0;
  initializeSeeds();
  updateExperimentText();
}

function gameLoop() {
  if (paused) return;
  if (fastForward) {
    const count = fastForwardFactor | 0;
    for (let i = 0; i < count; i++) advanceTick(false);
    syncVisuals();
  } else {
    const now = Date.now();
    const interval =
      fastForwardFactor < 1
        ? 1000 / 60 / fastForwardFactor
        : CONSTANTS.TICK_INTERVAL_MS;
    if (now - lastTickTime < interval) return;
    advanceTick(true);
    syncVisuals();
    lastTickTime = now;
  }
  if (++uiUpdateCounter >= UI_UPDATE_INTERVAL) {
    updateUI();
    uiUpdateCounter = 0;
  }
}

// Core simulation tick - NO sprite updates except new sprite creation
function advanceTick(updateSprites) {
  frame++;
  const graduated = CONSTANTS.GRADUATED_ABSORPTION;
  const absorbProb = CONSTANTS.LIGHT_ABSORB_PROB;
  const cooldownVal = CONSTANTS.LIGHT_COOLDOWN;
  const maxAge = CONSTANTS.MAX_PLANT_AGE;
  const starvation = CONSTANTS.STARVATION_TICKS;
  const distBonus = CONSTANTS.DISTANCE_BONUS;
  const distFactor = CONSTANTS.DISTANCE_BONUS_FACTOR;

  // 1. GROWTH & DEATH (swap-and-pop removal)
  let pLen = plants.length;
  for (let i = pLen - 1; i >= 0; i--) {
    const plant = plants[i];
    plant.age++;
    plant.ticksWithoutLight++;
    if (
      plant.age >= maxAge * plant.genome.length ||
      plant.ticksWithoutLight >= starvation
    ) {
      plant.die();
      pLen--;
      plants[i] = plants[pLen];
      plants.length = pLen;
      continue;
    }
    plant.tryGrowOneStep();
  }

  // 2. LIGHT ABSORPTION
  for (let p = 0; p < plants.length; p++) {
    const plant = plants[p],
      cells = plant.cells,
      seed = plant.seed;
    for (let c = 0, cLen = cells.length; c < cLen; c++) {
      const cell = cells[c];
      if (cell === seed) continue;
      if (cell.cooldown > 0) {
        cell.cooldown--;
        continue;
      }
      const cx = cell.x,
        cy = cell.y;
      let openCount = 0;
      let ny = cy - 1;
      if (ny < 0) ny += rows;
      if (!grid[ny * cols + cx]) openCount++;
      let ex = cx + 1;
      if (ex >= cols) ex -= cols;
      if (!grid[cy * cols + ex]) openCount++;
      let sy = cy + 1;
      if (sy >= rows) sy -= rows;
      if (!grid[sy * cols + cx]) openCount++;
      let wx = cx - 1;
      if (wx < 0) wx += cols;
      if (!grid[cy * cols + wx]) openCount++;

      let canAbsorb = false,
        baseEnergy = 1;
      if (graduated) {
        if (openCount >= 1) {
          canAbsorb = true;
          baseEnergy = openCount >= 3 ? 1.5 : openCount === 2 ? 1.0 : 0.5;
        }
      } else {
        if (openCount >= 3) canAbsorb = true;
      }

      if (canAbsorb) {
        rngState ^= rngState << 13;
        rngState ^= rngState >>> 17;
        rngState ^= rngState << 5;
        if ((rngState >>> 0) / 0x100000000 < absorbProb) {
          lightParticles.push(createLight(cell, baseEnergy));
          cell.cooldown = cooldownVal;
          plant.ticksWithoutLight = 0;
        }
      }
    }
  }

  // 3. LIGHT PROPAGATION (no sprite update during batch)
  let lpLen = lightParticles.length;
  for (let i = lpLen - 1; i >= 0; i--) {
    const lp = lightParticles[i];
    if (lp.dead) continue;
    if (lp.pauseTicks > 0) {
      lp.pauseTicks--;
      continue;
    }
    if (lp.cell.parent) {
      lp.cell = lp.cell.parent;
      lp.steps++;
    } else {
      let finalEnergy = lp.baseEnergy;
      if (distBonus) finalEnergy *= 1 + lp.steps * distFactor;
      lp.plant.energy += finalEnergy;
      lp.dead = true;
    }
  }
  // Remove dead (swap-and-pop)
  for (let i = lpLen - 1; i >= 0; i--) {
    if (lightParticles[i].dead) {
      if (lightParticles[i].sprite) lightPool.release(lightParticles[i].sprite);
      lpLen--;
      lightParticles[i] = lightParticles[lpLen];
      lightParticles.length = lpLen;
    }
  }

  // 4. REPRODUCTION
  for (let i = 0, len = plants.length; i < len; i++) {
    const plant = plants[i],
      G = plant.genome.length;
    if (plant.reproPhase === 0) {
      if (plant.energy >= G) {
        rngState ^= rngState << 13;
        rngState ^= rngState >>> 17;
        rngState ^= rngState << 5;
        plant.childGenome =
          (rngState >>> 0) / 0x100000000 < CONSTANTS.MUTATION_RATE
            ? mutateGenome(plant.genome)
            : new Uint8Array(plant.genome);
        plant.childGeneCount = plant.childGenome.length;
        plant.reproPhase = 1;
      }
    } else {
      if (plant.energy >= G + plant.childGeneCount) {
        travelingSeeds.push(createTravelingSeed(plant, plant.childGenome));
        plant.energy -= plant.childGeneCount;
        plant.reproPhase = 0;
        plant.childGenome = null;
        plant.childGeneCount = 0;
      }
    }
  }

  // 5. SEED TRANSPORT
  let tsLen = travelingSeeds.length;
  for (let i = tsLen - 1; i >= 0; i--) {
    const ts = travelingSeeds[i];
    if (ts.dead) continue;
    if (ts.state === 0) {
      if (!ts.currentNode.cell) {
        ts.dead = true;
        continue;
      }
      const children = ts.currentNode.children;
      let valid = null,
        validCount = 0;
      for (let s = 0; s < 3; s++) {
        if (children[s] && children[s].cell) {
          if (validCount === 0) valid = children[s];
          validCount++;
        }
      }
      if (validCount > 0) {
        const pick = randInt(validCount);
        let found = 0;
        for (let s = 0; s < 3; s++) {
          if (children[s] && children[s].cell) {
            if (found === pick) {
              ts.currentNode = children[s];
              break;
            }
            found++;
          }
        }
      } else {
        ts.state = 1;
        ts.x = ts.currentNode.cell.x;
        ts.y = ts.currentNode.cell.y;
        ts.stepsTaken = 0;
        if (CONSTANTS.SHOW_TRAVELING_SEEDS) {
          ts.sprite = seedPool.acquire(
            ts.x,
            ts.y,
            CONSTANTS.COLORS.SEED_IDLE,
            0.5
          );
        }
      }
    } else {
      if (ts.stepsTaken >= CONSTANTS.AIRBORNE_STEPS) {
        const tx = ts.x,
          ty = ts.y;
        if (grid[ty * cols + tx]) {
          ts.dead = true;
          continue;
        }
        let clear = true;
        const rad = CONSTANTS.GERMINATION_CLEAR_RADIUS;
        outer: for (let ddx = -rad; ddx <= rad; ddx++) {
          for (let ddy = -rad; ddy <= rad; ddy++) {
            if (ddx === 0 && ddy === 0) continue;
            let nx = tx + ddx,
              ny = ty + ddy;
            if (nx < 0) nx += cols;
            else if (nx >= cols) nx -= cols;
            if (ny < 0) ny += rows;
            else if (ny >= rows) ny -= rows;
            if (grid[ny * cols + nx]) {
              clear = false;
              break outer;
            }
          }
        }
        if (!clear) {
          ts.dead = true;
          continue;
        }
        plants.push(
          createPlant(
            ts.childGenome,
            tx,
            ty,
            CONSTANTS.CHILD_STARTING_ENERGY ? ts.childGenome.length : 0
          )
        );
        ts.dead = true;
      } else {
        const dir = randInt(4);
        if (dir === 0) {
          ts.x--;
          if (ts.x < 0) ts.x += cols;
        } else if (dir === 1) {
          ts.x++;
          if (ts.x >= cols) ts.x -= cols;
        } else if (dir === 2) {
          ts.y--;
          if (ts.y < 0) ts.y += rows;
        } else {
          ts.y++;
          if (ts.y >= rows) ts.y -= rows;
        }
        ts.stepsTaken++;
      }
    }
  }
  // Remove dead seeds (swap-and-pop)
  for (let i = tsLen - 1; i >= 0; i--) {
    if (travelingSeeds[i].dead) {
      if (travelingSeeds[i].sprite) seedPool.release(travelingSeeds[i].sprite);
      tsLen--;
      travelingSeeds[i] = travelingSeeds[tsLen];
      travelingSeeds.length = tsLen;
    }
  }
}

// Sync all visuals after batch of ticks
function syncVisuals() {
  const SCALE = CONSTANTS.SCALE_SIZE;
  // Update light particle positions (if visualization enabled)
  if (CONSTANTS.SHOW_LIGHT_PARTICLES) {
    for (let i = 0; i < lightParticles.length; i++) {
      const lp = lightParticles[i];
      if (lp.sprite) {
        lp.sprite.x = lp.cell.x * SCALE;
        lp.sprite.y = lp.cell.y * SCALE;
      }
    }
  }
  // Update traveling seed positions
  for (let i = 0; i < travelingSeeds.length; i++) {
    const ts = travelingSeeds[i];
    if (ts.sprite) {
      ts.sprite.x = ts.x * SCALE;
      ts.sprite.y = ts.y * SCALE;
    }
  }
  // Update plant visuals
  for (let i = 0; i < plants.length; i++) {
    plants[i].updateVisuals();
  }
}

function updateUI() {
  fpsText.text = `FPS: ${(app.ticker.FPS + 0.5) | 0}`;
  let cellCount = 0;
  for (let i = 0; i < plants.length; i++) cellCount += plants[i].cells.length;
  particleCountText.text = `Plants: ${plants.length} | Cells: ${cellCount} | Ticks: ${frame}`;
  if (plants.length === 0 && travelingSeeds.length === 0) {
    frame = 0;
    rngState = (rngState + 1337) >>> 0;
    initializeSeeds();
  }
}

function onKeyDown(e) {
  if (e.key === " " || e.code === "Space") {
    if (paused) {
      advanceTick(true);
      syncVisuals();
    }
    e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") paused = !paused;
  if (e.key === "f" || e.key === "F") fastForward = !fastForward;
  if (e.key === "o" || e.key === "O")
    CONSTANTS.ENABLE_RANDOM_FACING = !CONSTANTS.ENABLE_RANDOM_FACING;
  if (e.key === "c" || e.key === "C") {
    currentThemeIndex = (currentThemeIndex + 1) % CONSTANTS.THEMES.length;
    applyTheme(currentThemeIndex);
  }
  if (e.key === "r" || e.key === "R")
    console.log(
      "Frame:",
      frame,
      "Plants:",
      plants.length,
      "Light:",
      lightParticles.length,
      "Seeds:",
      travelingSeeds.length
    );
  if (e.key === "1") {
    CONSTANTS.GRADUATED_ABSORPTION = !CONSTANTS.GRADUATED_ABSORPTION;
    resetSimulation();
  }
  if (e.key === "2") {
    CONSTANTS.CHILD_STARTING_ENERGY = !CONSTANTS.CHILD_STARTING_ENERGY;
    resetSimulation();
  }
  if (e.key === "3") {
    CONSTANTS.DISTANCE_BONUS = !CONSTANTS.DISTANCE_BONUS;
    resetSimulation();
  }
  if (e.key === "4") {
    CONSTANTS.SHOW_LIGHT_PARTICLES = !CONSTANTS.SHOW_LIGHT_PARTICLES;
    updateExperimentText();
    console.log(
      "Light visualization:",
      CONSTANTS.SHOW_LIGHT_PARTICLES ? "ON" : "OFF"
    );
  }
  if (e.key === "5") {
    CONSTANTS.ENABLE_PLANT_TINT = !CONSTANTS.ENABLE_PLANT_TINT;
    updateExperimentText();
    updateAllPlantTints();
    console.log("Plant tints:", CONSTANTS.ENABLE_PLANT_TINT ? "ON" : "OFF");
  }
  if (e.key === "6") {
    CONSTANTS.SHOW_TRAVELING_SEEDS = !CONSTANTS.SHOW_TRAVELING_SEEDS;
    updateExperimentText();
    console.log(
      "Seed visualization:",
      CONSTANTS.SHOW_TRAVELING_SEEDS ? "ON" : "OFF"
    );
  }
  if (e.key === "0") resetSimulation();
}

function onResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
}

function updateAllPlantTints() {
  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    plant.stemTint = CONSTANTS.ENABLE_PLANT_TINT
      ? lerpColor(
          CONSTANTS.COLORS.STEM,
          plant.color,
          CONSTANTS.PLANT_TINT_STRENGTH
        )
      : CONSTANTS.COLORS.STEM;
    for (let j = 0; j < plant.cells.length; j++) {
      if (!plant.cells[j].isSeed) plant.cells[j].sprite.tint = plant.stemTint;
    }
  }
}

function applyTheme(index) {
  const theme = CONSTANTS.THEMES[index];
  Object.assign(CONSTANTS.COLORS, theme.COLORS);
  if (app && app.renderer) app.renderer.backgroundColor = CONSTANTS.COLORS.BG;
  createTextures();
  seedPool.updateTexture(textures.seed);
  stemPool.updateTexture(textures.stem);
  lightPool.updateTexture(textures.light);
  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    plant.stemTint = CONSTANTS.ENABLE_PLANT_TINT
      ? lerpColor(
          CONSTANTS.COLORS.STEM,
          plant.color,
          CONSTANTS.PLANT_TINT_STRENGTH
        )
      : CONSTANTS.COLORS.STEM;
    plant.lastVisualEnergy = -1;
    for (let j = 0; j < plant.cells.length; j++)
      if (!plant.cells[j].isSeed) plant.cells[j].sprite.tint = plant.stemTint;
    plant.updateVisuals();
  }
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();
