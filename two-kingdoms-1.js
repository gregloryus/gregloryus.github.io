// two-kingdoms-1.js — THE TWO KINGDOMS, first prototype.
// Design docs: parked-ideas-2026-07.md, brainstorm-HANDOFF.md.
// Engine lineage: evo-engine-millefleur-2.js (genetics, unfolding, seeds
// reused nearly verbatim).
//
// THE LAW: two interleaved kingdoms, each running millefleur's exact rule
// (a seed unfolds its genome-tree one cell per tick; any blocked step and
// the plant vanishes; only a fully unfolded plant is immortalized) — but
// each kingdom can only grow on what the other's dead leave behind.
//
// Matter cycles through four exclusive cell states, strictly forward:
//
//     ASH --(flora grows)--> FLORA BODY --(flora dies)--> LOAM
//     LOAM --(myco grows)--> MYCO BODY --(myco dies)--> ASH
//
// Nothing is created or destroyed; every cell is always exactly one of the
// four states, so conservation is structural, not enforced.
//
// Decisions taken on the questions the design docs left open:
// - Death of matures = DECAY OF THE FRUITLESS: an immortal persists only
//   while its lineage keeps succeeding — every new immortalization
//   refreshes the whole ancestor chain; an immortal with no successful
//   descendant for FRUITLESS_WINDOW ticks decays forward. ("You exist as
//   long as you matter to the future.") DEATH_RULE="lifespan" is the
//   boring fallback.
// - FAILURE FEEDS THE CYCLE: a blocked plant's partial body converts
//   FORWARD (aborted flora becomes loam anyway) — failures bridge and
//   reshape the other kingdom's continent instead of vanishing traceless.
// - Kingdoms INTERPENETRATE: substrate is the only cross-kingdom
//   constraint. Self-avoidance / contact-abort / germination-gap rules
//   apply within a kingdom only; the other kingdom's bodies are invisible
//   to them (you simply can't grow where matter is locked in a body,
//   because a body is not your food).
// - SYMMETRIC kingdoms: identical rules, identical founder genome. The
//   world starts as pure ash, so flora blooms first and the mycelium can
//   only arrive with the first deaths.
// - Local genome uniqueness (radius) instead of global: substrate
//   fragmentation selects hard for small forms, and small genomes are
//   combinatorially scarce — a local radius lets motifs repeat at
//   distance so the kingdoms can actually populate their mosaics.
// - Extinction safety: a kingdom with nothing alive and nothing in flight
//   re-founds itself on a random cell of its food, if any exists.
//
// Run modes:
//   browser:  two-kingdoms-1.html   (?seed=N&radius=64&window=20000&scale=4)
//   headless: node two-kingdoms-1.js [seed] [maxTicks] [cols] [rows] [radius] [window] [snapshot.ppm]

const IS_BROWSER = typeof window !== "undefined";

const CONSTANTS = {
  SCALE_SIZE: 4,
  RNG_SEED: 14, // headless default; browser randomizes unless ?seed=
  // Dispersal distance. LOCAL dispersal is load-bearing, not a tuning
  // nicety: it is what makes "B grows where A just died" spatially TRUE,
  // so a kingdom's forms trace the other's fresh ghosts and the boom/bust
  // reads as advancing/retreating fronts instead of world-wide confetti.
  AIRBORNE_STEPS: IS_BROWSER ? 20 : parseInt(process.env.AIR || "20", 10),
  SEEDS_PER_TICK_BASE: 1, // per kingdom, whenever any immortal exists
  // EVERY CELL OF A LIVING BODY IS AN EQUAL FOUNTAIN: seed flux scales
  // with the kingdom's embodied matter, and emitters are picked weighted
  // by body size. This is the differential-reproduction fix (millefleur's
  // documented weakness): without it, a 1-cell spore emits as much as a
  // 40-cell flower and evolution collapses into confetti-sized forms.
  SEEDS_PER_BODY_CELL: 0.004,
  UNIQUENESS_RADIUS: 32,
  P_CLONE: 0,
  EXTRA_MUTATION_PROB: 0.35,
  DEATH_RULE: "fruitless", // "fruitless" | "lifespan"
  FRUITLESS_WINDOW: 20000, // ticks without a descendant success -> decay.
  // Tuned headless 2026-07-09: 6000 gives fast churn but a thin ~5% living
  // film; 20000 roughly doubles standing biomass and still turns over;
  // 60000 accumulates more but the cycle visibly slows.
  LIFESPAN: 12000, // only used when DEATH_RULE === "lifespan"
  DEATH_SCAN_MASK: 31, // scan each kingdom's immortals every 32 ticks
  TICK_INTERVAL_MS: 1,
  COLORS: {
    ASH: 0x171c23, // cool dark — the mycelium's residue, flora's food
    LOAM: 0x2a1d10, // warm dark — the flora's residue, mycelium's food
  },
};

// ---------------------------------------------------------------- PRNG
let runSeed = CONSTANTS.RNG_SEED;
let rngState = runSeed >>> 0;
function rand() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0x100000000;
}
function randInt(n) {
  return (rand() * n) | 0;
}

// ---------------------------------------------------------------- Color
function hsvToRgbInt(h, s, v) {
  h = ((h % 1) + 1) % 1;
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

// 0xRRGGBB -> little-endian RGBA word for a Uint32 view on ImageData
function rgbToLE(c) {
  return (
    (0xff << 24) | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)
  );
}

// Soft additive hash into the kingdom's hue band: similar genomes get
// similar colors (lineages read as family-colored neighborhoods), and the
// two kingdoms can never be confused (warm band vs cool band).
function plantColorFromGenome(genome, kingdom) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  const t = (sum * 0.013) % 1;
  return hsvToRgbInt(kingdom.hueBase + t * kingdom.hueRange, 0.75, 0.95);
}

// ---------------------------------------------------------------- Genetics
class GeneNode {
  constructor(geneBits) {
    this.geneBits = geneBits;
    this.parent = null;
    this.children = [null, null, null];
    this.slotFromParent = null;
    this.cell = null;
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

function canonical(genome) {
  return encodeTreeToGenome(decodeGenomeToTree(genome));
}

// One point mutation. Position biased toward newer genes (max of two draws);
// a bit-clear that would amputate a non-empty subtree is a no-op.
function mutateGenome(genome) {
  const newGenome = new Uint8Array(genome);
  const len = newGenome.length;
  const geneIdx = len > 1 ? Math.max(randInt(len), randInt(len)) : 0;
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

function genomeKey(genome) {
  return genome.join(".");
}

// ---------------------------------------------------------------- Directions
// 4 facings x 3 slots (left, forward, right)
const DIR_DX = new Int8Array([-1, 0, 1, 0, 1, 0, 1, 0, -1, 0, -1, 0]);
const DIR_DY = new Int8Array([0, -1, 0, -1, 0, 1, 0, 1, 0, 1, 0, -1]);
const ROTATIONS_FLAT = [3, 0, 1, 0, 1, 2, 1, 2, 3, 2, 3, 0];

// ---------------------------------------------------------------- World state
const ASH = 0,
  LOAM = 1;

let cols, rows;
let grid; // Cell | null per cell — matter locked in a living/immortal body
let sub; // Uint8Array — substrate state, meaningful only where grid is null
let counts; // Int32Array(4): [ash, loam, floraBody, mycoBody]
let kingdoms;
let frame = 0,
  idCounter = 0;
let uniqRadius = CONSTANTS.UNIQUENESS_RADIUS;
let pClone = CONSTANTS.P_CLONE;
let fruitlessWindow = CONSTANTS.FRUITLESS_WINDOW;

const FOUNDER_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

function makeKingdom(id, name, food, hueBase, hueRange, seedColor) {
  return {
    id,
    name,
    food,
    residue: 1 - food,
    hueBase,
    hueRange,
    seedColor,
    seedColorLE: 0, // filled at init (needs no canvas, just consistency)
    growing: [],
    immortals: [],
    seeds: [],
    immortalByKey: new Map(), // key -> [{x, y, plant}]
    growingByKey: new Map(), // key -> [Plant]
    maxBody: 0, // largest living immortal's cell count (for emitter pick)
    stats: {
      germinated: 0,
      seedDeaths: 0,
      dupeFails: 0,
      plantFails: 0,
      deaths: 0, // immortal decays
      reseeds: 0,
      totalImmortalized: 0,
    },
  };
}

function initWorld() {
  const n = cols * rows;
  grid = new Array(n).fill(null);
  sub = new Uint8Array(n); // all ASH — the world before the first death
  counts = new Int32Array([n, 0, 0, 0]);
  kingdoms = [
    // flora: eats ash, leaves loam; warm band (magenta-red -> orange -> gold)
    makeKingdom(0, "flora", ASH, 0.93, 0.25, 0xffe9b8),
    // mycelium: eats loam, leaves ash; cool band (teal -> blue -> violet)
    makeKingdom(1, "myco", LOAM, 0.42, 0.33, 0xbfe6ff),
  ];
  for (const k of kingdoms) k.seedColorLE = rgbToLE(k.seedColor);
  frame = 0;
  idCounter = 0;
}

// true if an identical genome is rooted (or unfolding) within uniqRadius
function keyConflictNear(kingdom, key, x, y) {
  const r2 = uniqRadius * uniqRadius;
  const imm = kingdom.immortalByKey.get(key);
  if (imm) {
    for (let i = 0; i < imm.length; i++) {
      const dx = imm[i].x - x,
        dy = imm[i].y - y;
      if (dx * dx + dy * dy <= r2) return true;
    }
  }
  const grow = kingdom.growingByKey.get(key);
  if (grow) {
    for (let i = 0; i < grow.length; i++) {
      const dx = grow[i].root.x - x,
        dy = grow[i].root.y - y;
      if (dx * dx + dy * dy <= r2) return true;
    }
  }
  return false;
}

function registerGrowing(plant) {
  const map = plant.kingdom.growingByKey;
  let arr = map.get(plant.key);
  if (!arr) {
    arr = [];
    map.set(plant.key, arr);
  }
  arr.push(plant);
}

function unregisterGrowing(plant) {
  const map = plant.kingdom.growingByKey;
  const arr = map.get(plant.key);
  if (!arr) return;
  const i = arr.indexOf(plant);
  if (i !== -1) {
    arr[i] = arr[arr.length - 1];
    arr.pop();
  }
  if (arr.length === 0) map.delete(plant.key);
}

function sameKingdomNeighbor(kingdom, x, y) {
  for (let ddx = -1; ddx <= 1; ddx++) {
    for (let ddy = -1; ddy <= 1; ddy++) {
      if (ddx === 0 && ddy === 0) continue;
      const nx = x + ddx,
        ny = y + ddy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const nb = grid[ny * cols + nx];
      if (nb && nb.plant.kingdom === kingdom) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- Cells
class Cell {
  constructor(x, y, plant, node, parent, facingIdx, isRoot) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facingIdx = facingIdx;
    this.isRoot = isRoot;
    node.cell = this;
    const i = y * cols + x;
    grid[i] = this;
    // matter: one cell of this kingdom's food is borrowed into the body
    counts[plant.kingdom.food]--;
    counts[2 + plant.kingdom.id]++;
    plant.cells.push(this);
    const geneBits = node.geneBits;
    for (let slot = 0; slot < 3; slot++) {
      if ((geneBits >> slot) & 1 && node.children[slot]) {
        plant.frontier.push(node, slot);
      }
    }
  }
}

// ---------------------------------------------------------------- Plants
class Plant {
  constructor(kingdom, genome, x, y, parentImmortal) {
    this.id = idCounter++;
    this.kingdom = kingdom;
    this.genome = genome;
    this.key = genomeKey(genome);
    this.color = plantColorFromGenome(genome, kingdom);
    this.colorLE = rgbToLE(this.color);
    this.dimLE = rgbToLE(lerpColor(this.color, 0x000000, 0.5));
    this.rootLE = rgbToLE(lerpColor(this.color, 0xffffff, 0.5));
    this.rootNode = decodeGenomeToTree(genome);
    this.cells = [];
    this.frontier = []; // flat pairs: node, slot
    this.mature = false;
    this.failed = false;
    this.dead = false; // set when a mature immortal decays
    this.parentImmortal = parentImmortal || null;
    this.lastFruit = 0; // refreshed by every descendant immortalization
    this.immortalizedAt = 0;
    const facing = randInt(4);
    this.root = new Cell(x, y, this, this.rootNode, null, facing, true);
    registerGrowing(this);
  }

  growOneStep() {
    const f = this.frontier;
    if (f.length === 0) {
      this.immortalize();
      return;
    }
    const slot = f.pop();
    const node = f.pop();
    const cell = node.cell;
    const fidx = cell.facingIdx * 3 + slot;
    const nx = cell.x + DIR_DX[fidx];
    const ny = cell.y + DIR_DY[fidx];
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
      this.fail();
      return;
    }
    const ni = ny * cols + nx;
    // the one cross-kingdom law: you may only grow onto your food.
    // A body (either kingdom's) is not food; the other's residue is not
    // food; only what the other kingdom's dead left behind.
    if (grid[ni] || sub[ni] !== this.kingdom.food) {
      this.fail();
      return;
    }
    // Self-avoidance within the kingdom (millefleur's rule verbatim): the
    // new cell may touch (8-way) only same-plant cells that are
    // topologically NEAR it — parent, grandparent, or sibling. Contact
    // with any farther same-plant cell, or with any other plant OF THE
    // SAME KINGDOM, aborts. The other kingdom is invisible here: the
    // kingdoms interpenetrate, constrained only through the substrate.
    const parentCell = cell;
    const grandCell = cell.parent;
    for (let ddx = -1; ddx <= 1; ddx++) {
      for (let ddy = -1; ddy <= 1; ddy++) {
        if (ddx === 0 && ddy === 0) continue;
        const mx = nx + ddx,
          my = ny + ddy;
        if (mx < 0 || mx >= cols || my < 0 || my >= rows) continue;
        const nb = grid[my * cols + mx];
        if (!nb) continue;
        if (nb.plant.kingdom !== this.kingdom) continue;
        if (nb.plant !== this) {
          this.fail();
          return;
        }
        if (nb !== parentCell && nb !== grandCell && nb.parent !== parentCell) {
          this.fail();
          return;
        }
      }
    }
    const childNode = node.children[slot];
    const newFacing = ROTATIONS_FLAT[cell.facingIdx * 3 + slot];
    new Cell(nx, ny, this, childNode, cell, newFacing, false);
    if (this.frontier.length === 0) this.immortalize();
  }

  // FAILURE FEEDS THE CYCLE: the partial body converts FORWARD — an
  // aborted flora becomes loam anyway. This is what bridges and reshapes
  // the substrate mosaic over time; nothing is wasted.
  fail() {
    this.failed = true;
    unregisterGrowing(this);
    this.kingdom.stats.plantFails++;
    releaseBody(this);
  }

  immortalize() {
    this.mature = true;
    unregisterGrowing(this);
    const k = this.kingdom;
    let arr = k.immortalByKey.get(this.key);
    if (!arr) {
      arr = [];
      k.immortalByKey.set(this.key, arr);
    }
    arr.push({ x: this.root.x, y: this.root.y, plant: this });
    k.immortals.push(this);
    if (this.cells.length > k.maxBody) k.maxBody = this.cells.length;
    k.stats.totalImmortalized++;
    this.immortalizedAt = frame;
    this.lastFruit = frame;
    // decay of the fruitless: success is credited up the whole ancestor
    // chain — an ancestor lives as long as ANY line of its descendants
    // keeps immortalizing. Stop early if this frame already reached them.
    let p = this.parentImmortal;
    while (p && p.lastFruit !== frame) {
      p.lastFruit = frame;
      p = p.parentImmortal;
    }
  }
}

// return a plant's body to the world as this kingdom's residue
function releaseBody(plant) {
  const k = plant.kingdom;
  const cells = plant.cells;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const idx = cell.y * cols + cell.x;
    grid[idx] = null;
    sub[idx] = k.residue;
    cell.node.cell = null;
  }
  counts[2 + k.id] -= cells.length;
  counts[k.residue] += cells.length;
  plant.cells = [];
  plant.frontier = [];
}

function killImmortal(k, plant) {
  plant.dead = true;
  const arr = k.immortalByKey.get(plant.key);
  if (arr) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].plant === plant) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        break;
      }
    }
    if (arr.length === 0) k.immortalByKey.delete(plant.key);
  }
  releaseBody(plant);
  k.stats.deaths++;
}

function scanDeaths(k) {
  const arr = k.immortals;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    const expired =
      CONSTANTS.DEATH_RULE === "lifespan"
        ? frame - p.immortalizedAt > CONSTANTS.LIFESPAN
        : frame - p.lastFruit > fruitlessWindow;
    if (expired) {
      killImmortal(k, p);
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  }
}

// ---------------------------------------------------------------- Seeds
function makeChildGenome(parentGenome) {
  if (rand() < pClone) return new Uint8Array(parentGenome);
  let g = mutateGenome(parentGenome);
  while (rand() < CONSTANTS.EXTRA_MUTATION_PROB) g = mutateGenome(g);
  return g;
}

// The crawl to a random tip is instantaneous (the parent is frozen, so the
// path is static); only the airborne walk is animated.
function emitSeed(k, parent) {
  const genome = makeChildGenome(parent.genome);
  let node = parent.rootNode;
  for (;;) {
    const ch = node.children;
    let count = 0;
    for (let s = 0; s < 3; s++) if (ch[s] && ch[s].cell) count++;
    if (count === 0) break;
    let pick = randInt(count);
    let next = node;
    for (let s = 0; s < 3; s++) {
      const c = ch[s];
      if (c && c.cell) {
        if (pick === 0) {
          next = c;
          break;
        }
        pick--;
      }
    }
    node = next;
  }
  k.seeds.push({
    x: node.cell.x,
    y: node.cell.y,
    steps: 0,
    genome,
    key: genomeKey(genome),
    parent, // for the fruitless-decay credit chain
    dead: false,
  });
}

function stepSeed(k, ts) {
  if (ts.steps >= CONSTANTS.AIRBORNE_STEPS) {
    // germination: must land on this kingdom's food, with no same-kingdom
    // body among the 8 neighbors (the inter-form outline gap), and no
    // identical living genome within the uniqueness radius.
    const i = ts.y * cols + ts.x;
    if (grid[i] || sub[i] !== k.food || sameKingdomNeighbor(k, ts.x, ts.y)) {
      k.stats.seedDeaths++;
    } else if (keyConflictNear(k, ts.key, ts.x, ts.y)) {
      k.stats.dupeFails++;
    } else {
      k.growing.push(new Plant(k, ts.genome, ts.x, ts.y, ts.parent));
      k.stats.germinated++;
    }
    ts.dead = true;
    return;
  }
  const dir = randInt(4);
  if (dir === 0 && ts.x > 0) ts.x--;
  else if (dir === 1 && ts.x < cols - 1) ts.x++;
  else if (dir === 2 && ts.y > 0) ts.y--;
  else if (dir === 3 && ts.y < rows - 1) ts.y++;
  ts.steps++;
}

// size-weighted emitter pick by rejection sampling against the largest
// living body (k.maxBody may go stale downward when a giant dies — that
// only costs extra rejections, never biases the pick)
function pickEmitter(k) {
  const arr = k.immortals;
  const cap = k.maxBody > 0 ? k.maxBody : 1;
  for (let tries = 0; tries < 30; tries++) {
    const p = arr[randInt(arr.length)];
    if (randInt(cap) < p.cells.length) return p;
  }
  return arr[randInt(arr.length)];
}

// ---------------------------------------------------------------- Founding
// A kingdom with nothing alive and nothing in flight re-founds itself on a
// random cell of its food (if any exists). At t=0 this plants the flora
// founder on the all-ash world; the mycelium's founder can only land once
// the first deaths have made loam. After any total collapse, same story.
function reseedKingdom(k) {
  if (k.immortals.length || k.growing.length || k.seeds.length) return;
  if (counts[k.food] === 0) return;
  let genome = canonical(FOUNDER_GENOME);
  for (let attempt = 0; attempt < 300; attempt++) {
    const x = randInt(cols),
      y = randInt(rows);
    const i = y * cols + x;
    if (grid[i] || sub[i] !== k.food) continue;
    if (sameKingdomNeighbor(k, x, y)) continue;
    if (keyConflictNear(k, genomeKey(genome), x, y)) {
      genome = mutateGenome(genome);
      continue;
    }
    k.growing.push(new Plant(k, genome, x, y, null));
    k.stats.reseeds++;
    return;
  }
}

// ---------------------------------------------------------------- Tick
function advanceTick() {
  frame++;
  for (let ki = 0; ki < 2; ki++) {
    const k = kingdoms[ki];

    // 1. growth (one cell per plant per tick); swap-and-pop finished/failed
    const g = k.growing;
    for (let i = g.length - 1; i >= 0; i--) {
      const plant = g[i];
      plant.growOneStep();
      if (plant.failed || plant.mature) {
        g[i] = g[g.length - 1];
        g.pop();
      }
    }

    // 2. traveling seeds
    const ss = k.seeds;
    for (let i = ss.length - 1; i >= 0; i--) {
      const ts = ss[i];
      stepSeed(k, ts);
      if (ts.dead) {
        ss[i] = ss[ss.length - 1];
        ss.pop();
      }
    }

    // 3. emission — seed flux scales with the kingdom's embodied matter
    // (plus a small base rate so a lone founder isn't becalmed);
    // fractional expectation dithered; emitter picked weighted by size
    if (k.immortals.length > 0) {
      const expected =
        CONSTANTS.SEEDS_PER_TICK_BASE +
        CONSTANTS.SEEDS_PER_BODY_CELL * counts[2 + k.id];
      let emit = expected | 0;
      if (rand() < expected - emit) emit++;
      for (let e = 0; e < emit; e++) {
        emitSeed(k, pickEmitter(k));
      }
    }

    // 4. decay of the fruitless (staggered scans, cheap)
    if ((frame & CONSTANTS.DEATH_SCAN_MASK) === (ki === 0 ? 0 : 16)) {
      scanDeaths(k);
    }

    // 5. extinction safety
    reseedKingdom(k);
  }
}

// recount everything from scratch and compare with the running counters —
// conservation is structural, so any mismatch is a bug, not an imbalance
function auditCounts() {
  const c = new Int32Array(4);
  const n = cols * rows;
  for (let i = 0; i < n; i++) {
    const cell = grid[i];
    if (cell) c[2 + cell.plant.kingdom.id]++;
    else c[sub[i]]++;
  }
  for (let s = 0; s < 4; s++) if (c[s] !== counts[s]) return false;
  return c[0] + c[1] + c[2] + c[3] === n;
}

function stateLine() {
  const n = cols * rows;
  const pct = (x) => ((x / n) * 100).toFixed(1);
  const A = kingdoms[0],
    B = kingdoms[1];
  return (
    `ash ${pct(counts[ASH])}% | flora ${pct(counts[2])}% ` +
    `(${A.immortals.length} imm, ${A.growing.length} grw) | ` +
    `loam ${pct(counts[LOAM])}% | myco ${pct(counts[3])}% ` +
    `(${B.immortals.length} imm, ${B.growing.length} grw)`
  );
}

// ================================================================ HEADLESS
if (!IS_BROWSER) {
  const args = process.argv.slice(2);
  const seed = parseInt(args[0] || "14", 10);
  const maxTicks = parseInt(args[1] || "300000", 10);
  cols = parseInt(args[2] || "240", 10);
  rows = parseInt(args[3] || "135", 10);
  if (args[4]) uniqRadius = parseInt(args[4], 10);
  if (args[5]) fruitlessWindow = parseInt(args[5], 10);
  runSeed = seed;
  rngState = seed >>> 0;
  initWorld();

  console.log(
    `two-kingdoms-1 headless: seed=${seed} maxTicks=${maxTicks} ` +
      `world=${cols}x${rows} radius=${uniqRadius} window=${fruitlessWindow} ` +
      `death=${CONSTANTS.DEATH_RULE}`
  );
  const t0 = Date.now();
  // oscillation tracking: sample the four-state split after a warmup
  const warmup = (maxTicks * 0.25) | 0;
  let minFlora = Infinity,
    maxFlora = -Infinity,
    minMyco = Infinity,
    maxMyco = -Infinity;
  let audits = 0,
    auditFails = 0;
  while (frame < maxTicks) {
    advanceTick();
    if (frame % 2000 === 0 && frame > warmup) {
      if (counts[2] < minFlora) minFlora = counts[2];
      if (counts[2] > maxFlora) maxFlora = counts[2];
      if (counts[3] < minMyco) minMyco = counts[3];
      if (counts[3] > maxMyco) maxMyco = counts[3];
    }
    if (frame % 20000 === 0) {
      audits++;
      if (!auditCounts()) auditFails++;
      console.log(`t=${frame} ${stateLine()}`);
    }
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const A = kingdoms[0],
    B = kingdoms[1];
  const n = cols * rows;
  const pct = (x) => ((x / n) * 100).toFixed(1);
  console.log(`\n=== ${frame} ticks (${elapsed}s) ===`);
  console.log(stateLine());
  for (const k of kingdoms) {
    const s = k.stats;
    console.log(
      `${k.name}: immortalized=${s.totalImmortalized} deaths=${s.deaths} ` +
        `germinated=${s.germinated} plantFails=${s.plantFails} ` +
        `seedDeaths=${s.seedDeaths} dupes=${s.dupeFails} reseeds=${s.reseeds}`
    );
  }
  console.log(
    `flora body range (post-warmup): ${pct(minFlora)}%..${pct(maxFlora)}% | ` +
      `myco body range: ${pct(minMyco)}%..${pct(maxMyco)}%`
  );
  const conserved = auditFails === 0 && auditCounts();
  const bothLived = A.stats.totalImmortalized > 0 && B.stats.totalImmortalized > 0;
  const bothCycled = A.stats.deaths > 0 && B.stats.deaths > 0;
  const aliveNow =
    A.immortals.length + A.growing.length > 0 &&
    B.immortals.length + B.growing.length > 0;
  console.log(
    `conserved=${conserved} bothLived=${bothLived} bothCycled=${bothCycled} aliveAtEnd=${aliveNow}`
  );
  const pass = conserved && bothLived && bothCycled;
  console.log(pass ? "PASS" : "FAIL");
  // optional final-frame snapshot (same color mapping as the browser)
  if (args[6]) {
    const px = Buffer.alloc(cols * rows * 3);
    for (let i = 0; i < cols * rows; i++) {
      const cell = grid[i];
      let c;
      if (cell) {
        const plant = cell.plant;
        c = plant.mature
          ? cell.isRoot
            ? lerpColor(plant.color, 0xffffff, 0.5)
            : plant.color
          : lerpColor(plant.color, 0x000000, 0.5);
      } else {
        c = sub[i] === ASH ? CONSTANTS.COLORS.ASH : CONSTANTS.COLORS.LOAM;
      }
      px[i * 3] = (c >> 16) & 0xff;
      px[i * 3 + 1] = (c >> 8) & 0xff;
      px[i * 3 + 2] = c & 0xff;
    }
    require("fs").writeFileSync(
      args[6],
      Buffer.concat([Buffer.from(`P6\n${cols} ${rows}\n255\n`), px])
    );
    console.log(`snapshot written to ${args[6]}`);
  }
  process.exit(pass ? 0 : 1);
}

// ================================================================ BROWSER
let canvas, ctx, off, offCtx, imageData, buf32;
let SUB_LE;
let paused = false,
  fastForward = true,
  fastForwardFactor = 10;
let fastForwardLevels = [1, 10, 100, 1000],
  fastForwardIndex = 1,
  lastTickTime = 0;
let statusDiv;
let uiUpdateCounter = 0;
const UI_UPDATE_INTERVAL = 15;
let urlSeed = null;
let scaleSize = CONSTANTS.SCALE_SIZE;

function newRunSeed() {
  return urlSeed !== null ? urlSeed : (Math.random() * 0xffffffff) >>> 0;
}

function initBrowser() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("seed")) {
    const s = parseInt(params.get("seed"), 10);
    if (isFinite(s)) urlSeed = s >>> 0;
  }
  if (params.has("radius")) {
    const r = parseInt(params.get("radius"), 10);
    if (isFinite(r) && r >= 0) uniqRadius = r;
  }
  if (params.has("window")) {
    const w = parseInt(params.get("window"), 10);
    if (isFinite(w) && w > 0) fruitlessWindow = w;
  }
  if (params.has("scale")) {
    const sc = parseInt(params.get("scale"), 10);
    if (isFinite(sc) && sc >= 1) scaleSize = sc;
  }
  runSeed = newRunSeed();
  rngState = runSeed >>> 0;
  console.log(
    `two-kingdoms-1: seed=${runSeed} radius=${uniqRadius} ` +
      `window=${fruitlessWindow} (replay with ?seed=${runSeed})`
  );

  cols = (window.innerWidth / scaleSize) | 0;
  rows = (window.innerHeight / scaleSize) | 0;
  initWorld();

  canvas = document.createElement("canvas");
  canvas.width = cols * scaleSize;
  canvas.height = rows * scaleSize;
  canvas.style.imageRendering = "pixelated";
  document.getElementById("canvas-div").appendChild(canvas);
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  offCtx = off.getContext("2d");
  imageData = offCtx.createImageData(cols, rows);
  buf32 = new Uint32Array(imageData.data.buffer);
  SUB_LE = new Uint32Array([
    rgbToLE(CONSTANTS.COLORS.ASH),
    rgbToLE(CONSTANTS.COLORS.LOAM),
  ]);

  statusDiv = document.createElement("div");
  statusDiv.style.cssText =
    "position:absolute;top:10px;left:10px;z-index:1000;color:#fff;" +
    "font:12px/1.5 monospace;text-shadow:0 0 3px #000,0 0 3px #000;" +
    "pointer-events:none;white-space:pre";
  document.body.appendChild(statusDiv);

  const btn = document.createElement("button");
  btn.innerText = `${fastForwardFactor}x`;
  btn.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:1000;padding:10px;" +
    "background:#333;color:#fff;border:1px solid #fff;cursor:pointer";
  btn.onclick = () => {
    fastForwardIndex = (fastForwardIndex + 1) % fastForwardLevels.length;
    fastForwardFactor = fastForwardLevels[fastForwardIndex];
    btn.innerText = `${fastForwardFactor}x`;
    fastForward = fastForwardFactor > 1;
  };
  document.body.appendChild(btn);

  document.addEventListener("keydown", onKeyDown);
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (!paused) {
    if (fastForward) {
      const count = fastForwardFactor | 0;
      for (let i = 0; i < count; i++) advanceTick();
    } else {
      const now = Date.now();
      if (now - lastTickTime >= CONSTANTS.TICK_INTERVAL_MS) {
        advanceTick();
        lastTickTime = now;
      }
    }
  }
  render();
  if (++uiUpdateCounter >= UI_UPDATE_INTERVAL) {
    updateUI();
    uiUpdateCounter = 0;
  }
  requestAnimationFrame(gameLoop);
}

function render() {
  const n = cols * rows;
  for (let i = 0; i < n; i++) {
    const cell = grid[i];
    if (cell) {
      const plant = cell.plant;
      buf32[i] = plant.mature
        ? cell.isRoot
          ? plant.rootLE
          : plant.colorLE
        : plant.dimLE;
    } else {
      buf32[i] = SUB_LE[sub[i]];
    }
  }
  for (let ki = 0; ki < 2; ki++) {
    const k = kingdoms[ki];
    for (let i = 0; i < k.seeds.length; i++) {
      const ts = k.seeds[i];
      buf32[ts.y * cols + ts.x] = k.seedColorLE;
    }
  }
  offCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(off, 0, 0, cols, rows, 0, 0, cols * scaleSize, rows * scaleSize);
}

function updateUI() {
  const A = kingdoms[0],
    B = kingdoms[1];
  statusDiv.textContent =
    `Seed ${runSeed} | R ${uniqRadius} | window ${fruitlessWindow} | ` +
    `tick ${frame}${paused ? " | PAUSED" : ""}\n` +
    stateLine() +
    `\nflora deaths ${A.stats.deaths} reseeds ${A.stats.reseeds} | ` +
    `myco deaths ${B.stats.deaths} reseeds ${B.stats.reseeds} | ` +
    `seeds ${A.seeds.length}+${B.seeds.length}`;
}

function resetSimulation() {
  runSeed = newRunSeed();
  rngState = runSeed >>> 0;
  initWorld();
  console.log(
    `two-kingdoms-1 reset: seed=${runSeed} (replay with ?seed=${runSeed})`
  );
}

function onKeyDown(e) {
  if (e.key === " " || e.code === "Space") {
    if (paused) advanceTick();
    e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") paused = !paused;
  if (e.key === "f" || e.key === "F") fastForward = !fastForward;
  if (e.key === "0") resetSimulation();
  if (e.key === "r" || e.key === "R") {
    console.log(`seed=${runSeed} t=${frame} | ${stateLine()}`);
    for (const k of kingdoms) {
      const s = k.stats;
      console.log(
        `${k.name}: immortalized=${s.totalImmortalized} deaths=${s.deaths} ` +
          `fails=${s.plantFails} seedDeaths=${s.seedDeaths} ` +
          `dupes=${s.dupeFails} reseeds=${s.reseeds} audit=${auditCounts()}`
      );
    }
  }
}

if (IS_BROWSER) {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initBrowser);
  else initBrowser();
}
