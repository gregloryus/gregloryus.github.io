// Evo Engine — Phase 0: chunked world with sleeping chunks
//
// The thesis of this file: simulation cost should scale with ACTIVITY, not
// world size. The world is divided into 64x64 chunks; a chunk is only
// processed on a tick if something moved in or near it last tick. A fully
// settled world costs ~zero per tick, no matter how large it is.
//
// Phase 0 content: soil (falls, piles, sinks through water) + water
// (monochromagic flow rules). Organisms (Phase 1) ride on this substrate.
//
// Runs two ways:
//   browser: evo-engine.html (PIXI rendering, interactive brushes)
//   node evo-engine.js  — headless self-test: rains, drains, verifies the
//                         interior sleeps (cost ∝ surface runners, not
//                         volume) and water is conserved.

"use strict";

// --- World ---
const W = 1024;
const H = 1024;
const N = W * H;
const SHIFT = 6; // chunk = 64x64
const CHUNK = 1 << SHIFT;
const CW = W >> SHIFT;
const CH = H >> SHIFT;
const NC = CW * CH;

const EMPTY = 0;
const SOIL = 1;
const WATER = 2;
const PLANT = 3;
const SEED_T = 4;

const RAIN_RATE = 64; // water cells spawned per tick while raining
const FF_FACTOR = 10;

// --- State (all flat typed arrays, no objects) ---
const type = new Uint8Array(N);
const flow = new Uint8Array(N); // direction persistence: 0 none, 1 left, 2 right
const lastMoved = new Uint32Array(N); // tick stamp: each cell acts at most once per tick
const shade = new Uint8Array(N); // baked per-cell render jitter
const owner = new Uint32Array(N); // plant id per PLANT cell (0 = none)
let activeNow = new Uint8Array(NC);
let activeNext = new Uint8Array(NC);
const drawDirty = new Uint8Array(NC);

let ticks = 0;
let waterCount = 0;
let raining = true;
let parity = 0;

// --- Seeded PRNG (LCG, same family as rgbfields/simplant) ---
let rngState = 1337 >>> 0;
function setSeed(s) {
  let x = s >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  rngState = (x ^ (x >>> 16)) >>> 0;
}
function rand() {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
}
function randInt(n) {
  return (rand() * n) | 0;
}

// --- Waking ---
// Waking a cell marks its chunk (and any chunk within 1 cell) for the next
// tick, so influence can cross chunk borders. At most 4 chunks per call.
function wakeCell(x, y) {
  const cx0 = (x > 0 ? x - 1 : x) >> SHIFT;
  const cx1 = (x < W - 1 ? x + 1 : x) >> SHIFT;
  const cy0 = (y > 0 ? y - 1 : y) >> SHIFT;
  const cy1 = (y < H - 1 ? y + 1 : y) >> SHIFT;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * CW + cx;
      activeNext[c] = 1;
      drawDirty[c] = 1;
    }
  }
}

// --- Water (monochromagic-10 rules, verbatim) ---
// Priority chain per mono: fall straight down (forget direction); else try
// ONLY the current direction's diagonal; else slide purely sideways in that
// direction; else flip direction, which costs the whole tick. Direction
// persistence is what makes water stream and slosh instead of dithering.
//
// Cost model: interior water and full flat surface rows are blocked on all
// sides — they flip a bit at most, never wake anything, and sleep. Only the
// partial top layer of each pool keeps "runners" bouncing forever, so the
// steady-state cost scales with pool SURFACE, not water volume.
function updateWater(x, y, i) {
  if (lastMoved[i] === ticks) return; // already acted this tick
  const hasBelow = y + 1 < H;
  const b = i + W;

  if (hasBelow && type[b] === EMPTY) {
    type[b] = WATER;
    type[i] = EMPTY;
    flow[b] = 0; // mono: falling straight down resets direction
    flow[i] = 0;
    lastMoved[b] = ticks;
    wakeCell(x, y);
    wakeCell(x, y + 1);
    return;
  }

  let dir = flow[i];
  if (dir === 0) {
    dir = 1 + randInt(2);
    flow[i] = dir;
  }
  const step = dir === 1 ? -1 : 1;
  const nx = x + step;

  if (nx >= 0 && nx < W) {
    if (hasBelow && type[b + step] === EMPTY) {
      const j = b + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir; // diagonal fall keeps direction
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y + 1);
      return;
    }
    if (type[i + step] === EMPTY) {
      const j = i + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir;
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y);
      return;
    }
  }

  flow[i] = 3 - dir; // blocked: switch direction, no move this tick (mono)
}

// --- Soil (classic sand) ---
// Falls into empty space; sinks through water by swapping (the displaced
// water rises), at half speed so it reads as heavier-than-liquid; slides
// down diagonals; never slides purely sideways, so it piles into slopes.
// A failed sink roll wakes its own cell — intent to move must keep the
// chunk awake, or the grain would freeze mid-water when the chunk sleeps.
function updateSoil(x, y, i) {
  if (lastMoved[i] === ticks) return;
  if (y + 1 >= H) return;
  const b = i + W;
  const tb = type[b];

  if (tb === EMPTY) {
    type[b] = SOIL;
    type[i] = EMPTY;
    lastMoved[b] = ticks;
    wakeCell(x, y);
    wakeCell(x, y + 1);
    return;
  }
  if (tb === WATER) {
    if (rand() < 0.5) {
      type[b] = SOIL;
      type[i] = WATER;
      flow[i] = 0;
      lastMoved[b] = ticks;
      lastMoved[i] = ticks;
      wakeCell(x, y);
      wakeCell(x, y + 1);
    } else {
      wakeCell(x, y); // still wants to sink: stay awake for next tick
    }
    return;
  }

  // Fast path: settled soil (solid below, solid diagonals) exits with no
  // rand() — awake chunks are dense with settled grains, so this dominates.
  const canL = x > 0 && (type[b - 1] === EMPTY || type[b - 1] === WATER);
  const canR = x < W - 1 && (type[b + 1] === EMPTY || type[b + 1] === WATER);
  if (!canL && !canR) return;

  const s = canL && canR ? (rand() < 0.5 ? -1 : 1) : canL ? -1 : 1;
  const j = b + s;
  if (type[j] === EMPTY) {
    type[j] = SOIL;
    type[i] = EMPTY;
    lastMoved[j] = ticks;
    wakeCell(x, y);
    wakeCell(x + s, y + 1);
    return;
  }
  if (rand() < 0.5) {
    type[j] = SOIL;
    type[i] = WATER;
    flow[i] = 0;
    lastMoved[j] = ticks;
    lastMoved[i] = ticks;
    wakeCell(x, y);
    wakeCell(x + s, y + 1);
  } else {
    wakeCell(x, y);
  }
}

// ==================== Phase 1: plants (simplant genetics on the grid) ====================
//
// Organisms are ownership patterns over grid cells: a PLANT cell belongs to
// the plant whose id is in owner[]. Per-plant records (genome, energy,
// frontier) are plain JS objects; there are NO per-cell objects or sprites.
//
// Economy: photosynthesis income scales with exposure (empty cardinal
// neighbors — air, not water), so crowding, burial, and flooding starve a
// plant through the light market, not through special rules. Every cell
// costs upkeep. Reproduction spends a multiple of genome length to launch a
// seed. Death converts every cell to SOIL — biomass is never deleted, so
// terrain is the fossil record.
//
// Cost model: plants update from a plant list, never via chunk scans. A
// mature plant (empty frontier) does zero work most ticks; its economy scan
// runs every ECON_INTERVAL ticks and touches only its own cells, waking
// nothing. The grid treats plant cells as static solids, so a standing
// forest leaves the chunk system as quiet as bare rock.

const ECON_INTERVAL = 8; // economy scan period per plant, staggered by id
const ABSORB_PER_SIDE = 0.5; // income per empty cardinal side per scan
const MAINT_PER_CELL = 0.5; // upkeep per cell per scan
const GROW_COST = 1; // energy per new cell
const REPRO_THRESHOLD = 5; // x genome length: energy needed to reproduce
const REPRO_COST = 4; // x genome length: energy spent per seed
const MUTATION_RATE = 0.2;
const MAX_AGE_PER_GENE = 600; // lifespan in ticks per gene
const AIRBORNE_STEPS = 40; // seed dispersal random-walk length
const GERMINATE_REST = 20; // ticks at rest before a seed may sprout
const SEED_MAX_AGE = 2000; // unsprouted seeds rot into soil
const DEFAULT_GENOME = Uint8Array.from([0b010, 0b010, 0b010, 0b000]);

// Gene slots 0/1/2 = left/forward/right relative to a cell's facing.
// facing: 0 up, 1 right, 2 down, 3 left. Sprouts face up. fidx = facing*3+slot.
const DIR_DX = new Int8Array([-1, 0, 1, 0, 1, 0, 1, 0, -1, 0, -1, 0]);
const DIR_DY = new Int8Array([0, -1, 0, -1, 0, 1, 0, 1, 0, 1, 0, -1]);
const ROT_FLAT = [3, 0, 1, 0, 1, 2, 1, 2, 3, 2, 3, 0];

let nextPlantId = 1;
const plants = [];
const plantById = new Map();
const seeds = [];
let births = 0;
let deaths = 0;
let seedsBorn = 0;
let seedsDied = 0;
let soilFromDeath = 0; // dead biomass converted to soil (conservation ledger)

function decodeGenome(genome) {
  let idx = 0;
  function build() {
    if (idx >= genome.length) return null;
    const bits = genome[idx++];
    const node = { bits, children: [null, null, null], cellIdx: -1, facing: 0 };
    for (let s = 0; s < 3; s++) {
      if ((bits >> s) & 1) node.children[s] = build();
    }
    return node;
  }
  return build();
}

function encodeGenome(root) {
  const out = [];
  (function walk(node) {
    if (!node) return;
    out.push(node.bits);
    for (let s = 0; s < 3; s++) walk(node.children[s]);
  })(root);
  return Uint8Array.from(out);
}

// Point mutation (simplant-20 rules): toggle one slot bit on one gene.
// Setting a bit grafts an empty leaf; clearing a bit prunes only a trivial
// subtree — never amputates a living branch design. Length drifts by ±1.
function mutateGenome(genome) {
  const len = genome.length;
  const geneIdx = len > 1 ? Math.max(randInt(len), randInt(len)) : 0;
  const bitIdx = randInt(3);
  const root = decodeGenome(genome);
  let current = 0;
  let target = null;
  (function find(node) {
    if (!node || target) return;
    if (current === geneIdx) {
      target = node;
      return;
    }
    current++;
    for (let s = 0; s < 3; s++) if (node.children[s]) find(node.children[s]);
  })(root);
  if (!target) return new Uint8Array(genome);
  const mask = 1 << bitIdx;
  const wasSet = (target.bits & mask) !== 0;
  if (wasSet && target.children[bitIdx] && target.children[bitIdx].bits > 0) {
    return new Uint8Array(genome);
  }
  target.bits ^= mask;
  target.children[bitIdx] = wasSet
    ? null
    : { bits: 0, children: [null, null, null], cellIdx: -1, facing: 0 };
  return encodeGenome(root);
}

// Lineage color: genome-hashed hue so related plants look related.
function genomeColor(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  const h = ((sum * 0.01) % 1) * 6;
  const sector = h | 0;
  const f = h - sector;
  const v = 230;
  const lo = 60;
  const q = (v - (v - lo) * f) | 0;
  const t = (lo + (v - lo) * f) | 0;
  switch (sector % 6) {
    case 0:
      return [v, t, lo];
    case 1:
      return [q, v, lo];
    case 2:
      return [lo, v, t];
    case 3:
      return [lo, q, v];
    case 4:
      return [t, lo, v];
    default:
      return [v, lo, q];
  }
}

function createPlantAt(idx, genome) {
  const root = decodeGenome(genome);
  if (!root) return null;
  const id = nextPlantId++;
  const col = genomeColor(genome);
  const p = {
    id,
    genome,
    root,
    energy: genome.length, // provisioning carried in the seed
    age: 0,
    phase: id & (ECON_INTERVAL - 1),
    cells: [idx],
    frontier: [], // flat [node, slot, ...] pairs
    dead: false,
    r: col[0],
    g: col[1],
    b: col[2],
  };
  root.cellIdx = idx;
  root.facing = 0;
  for (let s = 0; s < 3; s++) {
    if ((root.bits >> s) & 1 && root.children[s]) p.frontier.push(root, s);
  }
  type[idx] = PLANT;
  owner[idx] = id;
  plants.push(p);
  plantById.set(id, p);
  births++;
  wakeCell(idx % W, (idx / W) | 0);
  return p;
}

// Death is transformation: every cell becomes soil where it stands. The
// collapse (soil falling, piling) is then ordinary physics.
function killPlant(p) {
  const cells = p.cells;
  for (let k = 0; k < cells.length; k++) {
    const ci = cells[k];
    type[ci] = SOIL;
    owner[ci] = 0;
    wakeCell(ci % W, (ci / W) | 0);
  }
  soilFromDeath += cells.length;
  p.dead = true;
  plantById.delete(p.id);
  deaths++;
}

// One growth attempt per tick: scan the frontier from the end, prune entries
// blocked by anything solid or wet (evolution routes around losses), grow
// into the first empty target. Growing wakes the site so water and soil
// react to the new solid.
function growPlant(p) {
  const f = p.frontier;
  for (let i = f.length - 2; i >= 0; i -= 2) {
    const node = f[i];
    const slot = f[i + 1];
    const ci = node.cellIdx;
    const x = ci % W;
    const y = (ci / W) | 0;
    const fidx = node.facing * 3 + slot;
    const nx = x + DIR_DX[fidx];
    const ny = y + DIR_DY[fidx];
    f.splice(i, 2);
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    const j = ny * W + nx;
    if (type[j] !== EMPTY) continue; // blocked: branch abandoned for good
    const child = node.children[slot];
    if (!child) continue;
    type[j] = PLANT;
    owner[j] = p.id;
    child.cellIdx = j;
    child.facing = ROT_FLAT[fidx];
    p.cells.push(j);
    for (let s = 0; s < 3; s++) {
      if ((child.bits >> s) & 1 && child.children[s]) f.push(child, s);
    }
    p.energy -= GROW_COST;
    wakeCell(nx, ny);
    return;
  }
}

function emitSeed(p) {
  // Launch from directly above the plant's highest cell (min index = top row).
  const cells = p.cells;
  let top = cells[0];
  for (let k = 1; k < cells.length; k++) if (cells[k] < top) top = cells[k];
  if (top < W) return;
  const t = top - W;
  if (type[t] !== EMPTY) return; // canopy blocked; energy stays banked
  const childGenome =
    rand() < MUTATION_RATE ? mutateGenome(p.genome) : new Uint8Array(p.genome);
  type[t] = SEED_T;
  seeds.push({
    idx: t,
    genome: childGenome,
    airborne: AIRBORNE_STEPS,
    rest: 0,
    age: 0,
  });
  p.energy -= REPRO_COST * p.genome.length;
  seedsBorn++;
  wakeCell(t % W, (t / W) | 0);
}

function econScan(p) {
  const G = p.genome.length;
  p.age += ECON_INTERVAL;
  if (p.age >= MAX_AGE_PER_GENE * G) {
    killPlant(p);
    return;
  }
  const cells = p.cells;
  let exposure = 0;
  for (let k = 0; k < cells.length; k++) {
    const ci = cells[k];
    const x = ci % W;
    if (ci >= W && type[ci - W] === EMPTY) exposure++;
    if (ci < N - W && type[ci + W] === EMPTY) exposure++;
    if (x > 0 && type[ci - 1] === EMPTY) exposure++;
    if (x < W - 1 && type[ci + 1] === EMPTY) exposure++;
  }
  p.energy += exposure * ABSORB_PER_SIDE - cells.length * MAINT_PER_CELL;
  if (p.energy < -G) {
    killPlant(p); // starved past the debt ceiling
    return;
  }
  if (p.energy >= REPRO_THRESHOLD * G) emitSeed(p);
}

function updatePlants() {
  for (let i = plants.length - 1; i >= 0; i--) {
    const p = plants[i];
    if (p.dead) {
      plants[i] = plants[plants.length - 1];
      plants.pop();
      continue;
    }
    if ((ticks & (ECON_INTERVAL - 1)) === p.phase) econScan(p);
    if (p.dead) {
      plants[i] = plants[plants.length - 1];
      plants.pop();
      continue;
    }
    if (p.frontier.length > 0 && p.energy >= GROW_COST) growPlant(p);
  }
}

// Seeds are SEED grid cells driven from a list — transient and few, so they
// update every tick regardless of chunks, waking whatever they pass.
// Airborne drift first, then soil-like gravity, then rest; germination needs
// soil below and air above. Failures rot into soil.
function seedToSoil(s) {
  type[s.idx] = SOIL;
  soilFromDeath++;
  seedsDied++;
  wakeCell(s.idx % W, (s.idx / W) | 0);
}

function updateSeeds() {
  for (let i = seeds.length - 1; i >= 0; i--) {
    const s = seeds[i];
    s.age++;
    if (s.age > SEED_MAX_AGE) {
      seedToSoil(s);
      seeds[i] = seeds[seeds.length - 1];
      seeds.pop();
      continue;
    }
    const idx = s.idx;
    const x = idx % W;
    const y = (idx / W) | 0;
    if (s.airborne > 0) {
      s.airborne--;
      const d = randInt(4);
      const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const j = ny * W + nx;
        if (type[j] === EMPTY) {
          type[j] = SEED_T;
          type[idx] = EMPTY;
          s.idx = j;
          wakeCell(x, y);
          wakeCell(nx, ny);
        }
      }
      continue;
    }
    if (y + 1 < H) {
      const b = idx + W;
      if (type[b] === EMPTY) {
        type[b] = SEED_T;
        type[idx] = EMPTY;
        s.idx = b;
        s.rest = 0;
        wakeCell(x, y);
        wakeCell(x, y + 1);
        continue;
      }
      if (type[b] === WATER) {
        if (rand() < 0.5) {
          type[b] = SEED_T;
          type[idx] = WATER;
          flow[idx] = 0;
          s.idx = b;
          wakeCell(x, y);
          wakeCell(x, y + 1);
        } else {
          wakeCell(x, y); // still wants to sink: stay awake
        }
        s.rest = 0;
        continue;
      }
    }
    s.rest++;
    if (
      s.rest >= GERMINATE_REST &&
      y + 1 < H &&
      type[idx + W] === SOIL &&
      y > 0 &&
      type[idx - W] === EMPTY
    ) {
      createPlantAt(idx, s.genome);
      seeds[i] = seeds[seeds.length - 1];
      seeds.pop();
    }
  }
}

function rain() {
  for (let k = 0; k < RAIN_RATE; k++) {
    const x = randInt(W);
    const i = 2 * W + x;
    if (type[i] === EMPTY) {
      type[i] = WATER;
      waterCount++;
      wakeCell(x, 2);
    }
  }
}

// --- Tick ---
// Rows are processed globally bottom-up (so a cell falls at most once per
// tick), but within each row only the segments belonging to active chunks
// are touched. X direction serpentines by tick parity to avoid drift bias.
function tick() {
  ticks++; // increment first so the tick stamp is never 0
  const tmp = activeNow;
  activeNow = activeNext;
  activeNext = tmp;
  activeNext.fill(0);

  if (raining) rain();
  parity ^= 1;

  for (let y = H - 1; y >= 0; y--) {
    const cRow = (y >> SHIFT) * CW;
    const rowBase = y * W;
    if (parity === 0) {
      for (let cx = 0; cx < CW; cx++) {
        if (!activeNow[cRow + cx]) continue;
        const x1 = (cx << SHIFT) + CHUNK;
        for (let x = cx << SHIFT; x < x1; x++) {
          const i = rowBase + x;
          const t = type[i];
          if (t === WATER) updateWater(x, y, i);
          else if (t === SOIL) updateSoil(x, y, i);
        }
      }
    } else {
      for (let cx = CW - 1; cx >= 0; cx--) {
        if (!activeNow[cRow + cx]) continue;
        const x0 = cx << SHIFT;
        for (let x = x0 + CHUNK - 1; x >= x0; x--) {
          const i = rowBase + x;
          const t = type[i];
          if (t === WATER) updateWater(x, y, i);
          else if (t === SOIL) updateSoil(x, y, i);
        }
      }
    }
  }

  updatePlants();
  updateSeeds();
}

function countActive() {
  let c = 0;
  for (let k = 0; k < NC; k++) c += activeNext[k];
  return c;
}

function recountWater() {
  let c = 0;
  for (let i = 0; i < N; i++) if (type[i] === WATER) c++;
  return c;
}

function countType(t) {
  let c = 0;
  for (let i = 0; i < N; i++) if (type[i] === t) c++;
  return c;
}

// --- World gen: random-walk terrain with occasional cliffs ---
function initWorld() {
  let h = (H * 0.85) | 0;
  const hMin = (H * 0.7) | 0;
  const hMax = (H * 0.97) | 0;
  for (let x = 0; x < W; x++) {
    if (rand() < 0.01) h += randInt(21) - 10; // cliff
    const r = rand();
    if (r < 0.4) h--;
    else if (r > 0.6) h++;
    if (h < hMin) h = hMin;
    if (h > hMax) h = hMax;
    for (let y = h; y < H; y++) type[y * W + x] = SOIL;
  }
  for (let i = 0; i < N; i++) shade[i] = randInt(24);
  drawDirty.fill(1);
}

// ==================== Headless physics self-test (node evo-engine.js phys) ====================
function headlessTest() {
  const seed = parseInt(process.argv[3] || "1337", 10);
  setSeed(seed);
  console.log(`Evo Engine Phase 0 self-test — ${W}x${H}, seed ${seed}`);
  initWorld();

  const RAIN_TICKS = 600;
  raining = true;
  let t0 = performance.now();
  for (let k = 0; k < RAIN_TICKS; k++) tick();
  const rainMs = (performance.now() - t0) / RAIN_TICKS;
  raining = false;
  console.log(
    `rained ${RAIN_TICKS} ticks: ${waterCount} water cells, ` +
      `${rainMs.toFixed(2)} ms/tick, ${countActive()}/${NC} chunks active`
  );

  // Strict mono water never fully sleeps: each pool's partial top layer
  // keeps a few runners bouncing forever. The claim to verify is that the
  // steady state is interior-asleep with cost proportional to surface.
  for (let k = 0; k < 5000; k++) tick(); // level out

  const SAMPLE = 1000;
  t0 = performance.now();
  for (let k = 0; k < SAMPLE; k++) tick();
  const steadyMs = (performance.now() - t0) / SAMPLE;
  const activeSteady = countActive();
  let runners = 0;
  for (let i = 0; i < N; i++) if (lastMoved[i] === ticks) runners++;

  const recount = recountWater();
  const conserved = recount === waterCount;
  console.log(
    `steady state after ${ticks} ticks: ${activeSteady}/${NC} chunks awake, ` +
      `${runners} runners of ${waterCount} water cells, ` +
      `${steadyMs.toFixed(3)} ms/tick (vs ${rainMs.toFixed(2)} raining)`
  );
  console.log(
    `conservation: counter ${waterCount}, recount ${recount} — ${
      conserved ? "OK" : "LEAK"
    }`
  );

  // Soil drop: dump a 20x20 soil block over the deepest pool. It must sink,
  // displace the water upward, and the world must return to quiet.
  let bestX = 0;
  let bestC = 0;
  for (let x = 0; x < W; x++) {
    let c = 0;
    for (let y = 0; y < H; y++) if (type[y * W + x] === WATER) c++;
    if (c > bestC) {
      bestC = c;
      bestX = x;
    }
  }
  let soilBefore = 0;
  for (let i = 0; i < N; i++) if (type[i] === SOIL) soilBefore++;
  let placed = 0;
  for (let dy = 0; dy < 20; dy++) {
    for (let dx = 0; dx < 20; dx++) {
      const cx = Math.min(W - 1, Math.max(0, bestX - 10 + dx));
      const cy = 10 + dy;
      const ii = cy * W + cx;
      if (type[ii] === EMPTY) {
        type[ii] = SOIL;
        placed++;
        wakeCell(cx, cy);
      }
    }
  }
  for (let k = 0; k < 5000; k++) tick();
  let soilAfter = 0;
  for (let i = 0; i < N; i++) if (type[i] === SOIL) soilAfter++;
  const recount2 = recountWater();
  const active2 = countActive();
  const soilOk =
    soilAfter === soilBefore + placed && recount2 === waterCount;
  console.log(
    `soil drop: ${placed} cells over deepest pool (col ${bestX}, depth ${bestC}) — ` +
      `soil ${soilOk ? "conserved" : "LEAK"}, water ${
        recount2 === waterCount ? "conserved" : "LEAK"
      }, ${active2}/${NC} chunks awake after`
  );

  // Steady cost must stay well below the fully-active rain cost. It won't
  // be near zero: awake surface chunks still type-check all their cells,
  // and pool chunks are dense with settled interior water and soil.
  const ok =
    conserved && activeSteady < NC * 0.25 && steadyMs < rainMs * 0.75 &&
    soilOk && active2 < NC * 0.25;
  console.log(
    ok
      ? "PASS: interior asleep, steady cost scales with surface runners"
      : "FAIL: steady state too active or matter leaked"
  );
  process.exit(ok ? 0 : 1);
}

// ==================== Evolution harness (node evo-engine.js [seed] [ticks]) ====================
// Success criteria: plants germinate, grow, reproduce, mutate, and die over
// a long run — no extinction, no runaway; matter conserved by ledger; a
// world full of mature plants stays near the quiet steady-state cost.
function evolutionTest() {
  const seed = parseInt(process.argv[2] || "1337", 10);
  const TOTAL = parseInt(process.argv[3] || "100000", 10);
  setSeed(seed);
  console.log(
    `Evo Engine Phase 1 evolution harness — ${W}x${H}, seed ${seed}, ${TOTAL} ticks`
  );
  initWorld();

  // Rain briefly for pools, then drain and settle. Strict-mono water never
  // evaporates, so a long rain films the whole surface and leaves no dry
  // ground to germinate on — 120 ticks is enough water without drowning it.
  raining = true;
  for (let k = 0; k < 120; k++) tick();
  raining = false;
  for (let k = 0; k < 4000; k++) tick();
  const initialSoil = countType(SOIL);

  let t0 = performance.now();
  for (let k = 0; k < 500; k++) tick();
  const quietMs = (performance.now() - t0) / 500;

  // Busy baseline: force every chunk awake and measure — the "whole world
  // active at once" ceiling. The thesis is that real per-tick cost scales
  // with living activity and stays well under this world-size-bound number.
  t0 = performance.now();
  for (let k = 0; k < 60; k++) {
    activeNext.fill(1);
    tick();
  }
  const busyMs = (performance.now() - t0) / 60;
  const busyAwake = NC;
  activeNext.fill(0);
  for (let k = 0; k < 500; k++) tick(); // re-settle after the forced churn

  // Dry columns: topmost non-empty cell is soil. Plant starters evenly
  // across them.
  const dryCols = [];
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H && type[y * W + x] === EMPTY) y++;
    if (y > 0 && y < H && type[y * W + x] === SOIL) dryCols.push(y * W + x);
  }
  console.log(
    `substrate ready: ${waterCount} water, ${initialSoil} soil, ` +
      `${dryCols.length}/${W} dry columns, quiet ${quietMs.toFixed(3)} ms/tick ` +
      `(busy baseline ${busyMs.toFixed(2)} ms, ${busyAwake}/${NC} awake)`
  );

  let starters = 0;
  const NUM_STARTERS = 40;
  if (dryCols.length > 0) {
    const stride = Math.max(1, (dryCols.length / NUM_STARTERS) | 0);
    for (let k = 0; k < dryCols.length && starters < NUM_STARTERS; k += stride) {
      createPlantAt(dryCols[k] - W, new Uint8Array(DEFAULT_GENOME));
      starters++;
    }
  }
  console.log(
    `planted ${starters} starters (genome [${DEFAULT_GENOME.join(",")}])`
  );

  const WINDOW = 10000;
  const allGenomes = new Set();
  let maxPlants = 0;
  let maxCells = 0;
  let extinct = false;
  let finalMs = 0;
  for (let done = 0; done < TOTAL; ) {
    const n = Math.min(WINDOW, TOTAL - done);
    t0 = performance.now();
    for (let k = 0; k < n; k++) tick();
    const ms = (performance.now() - t0) / n;
    finalMs = ms;
    done += n;
    let cellCount = 0;
    let lenSum = 0;
    const genomesNow = new Set();
    for (let i = 0; i < plants.length; i++) {
      cellCount += plants[i].cells.length;
      lenSum += plants[i].genome.length;
      const key = plants[i].genome.join(",");
      genomesNow.add(key);
      allGenomes.add(key);
    }
    if (plants.length > maxPlants) maxPlants = plants.length;
    if (cellCount > maxCells) maxCells = cellCount;
    console.log(
      `t=${done}: ${plants.length} plants (${cellCount} cells, ` +
        `${genomesNow.size} genomes, mean len ${(plants.length
          ? lenSum / plants.length
          : 0
        ).toFixed(1)}), ${seeds.length} seeds | ` +
        `births ${births} deaths ${deaths} | ` +
        `${countActive()}/${NC} awake, ${ms.toFixed(3)} ms/tick`
    );
    if (plants.length === 0 && seeds.length === 0) {
      extinct = true;
      break;
    }
  }

  // Conservation ledger: water exact; soil = initial + dead biomass;
  // plant/seed grid recounts match the live records.
  const soilNow = countType(SOIL);
  const waterNow = recountWater();
  const plantNow = countType(PLANT);
  const seedNow = countType(SEED_T);
  let liveCells = 0;
  for (let i = 0; i < plants.length; i++) liveCells += plants[i].cells.length;
  const waterOk = waterNow === waterCount;
  const soilOk = soilNow === initialSoil + soilFromDeath;
  const plantOk = plantNow === liveCells;
  const seedOk = seedNow === seeds.length;
  console.log(
    `ledger: water ${waterOk ? "OK" : "LEAK"} | soil ${soilNow} = ` +
      `${initialSoil} initial + ${soilFromDeath} from deaths ${
        soilOk ? "OK" : "LEAK"
      } | plant cells ${plantNow}/${liveCells} ${
        plantOk ? "OK" : "LEAK"
      } | seeds ${seedNow}/${seeds.length} ${seedOk ? "OK" : "LEAK"}`
  );

  const awake = countActive();
  const alive = !extinct && plants.length >= 10;
  const reproduced = births - starters > 50;
  const evolved = allGenomes.size >= 3;
  const died = deaths > 0;
  const bounded = maxPlants < 20000 && maxCells < 150000;
  // The invariant: the substrate sleeps (few chunks awake) and the whole
  // living ecosystem still costs less than a fully-rained active substrate.
  const quiet = awake < NC * 0.25 && finalMs < busyMs;
  console.log(
    `alive ${alive} (pop ${plants.length}) | reproduced ${reproduced} ` +
      `(${births - starters} germinations of ${seedsBorn} seeds) | ` +
      `evolved ${evolved} (${allGenomes.size} genomes seen) | ` +
      `died ${died} (${deaths}) | bounded ${bounded} ` +
      `(max ${maxPlants} plants, ${maxCells} cells) | quiet ${quiet} ` +
      `(${awake}/${NC} awake, ${finalMs.toFixed(3)} vs busy ${busyMs.toFixed(
        2
      )} ms/tick)`
  );
  const ok =
    alive &&
    reproduced &&
    evolved &&
    died &&
    bounded &&
    quiet &&
    waterOk &&
    soilOk &&
    plantOk &&
    seedOk;
  console.log(ok ? "PASS: evolution criteria met" : "FAIL");
  process.exit(ok ? 0 : 1);
}

// ==================== Browser boot ====================
function boot() {
  const params = new URLSearchParams(window.location.search);
  setSeed(parseInt(params.get("seed") || "1337", 10) >>> 0);
  initWorld();

  const app = new PIXI.Application({
    width: W,
    height: H,
    backgroundColor: 0x000000,
    antialias: false,
    autoStart: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";

  const rgba = new Uint8Array(N * 4);
  const texture = PIXI.Texture.fromBuffer(rgba, W, H);
  app.stage.addChild(new PIXI.Sprite(texture));

  function paintChunk(c) {
    const x0 = (c % CW) << SHIFT;
    const y0 = ((c / CW) | 0) << SHIFT;
    for (let ly = 0; ly < CHUNK; ly++) {
      let i = (y0 + ly) * W + x0;
      let p = i * 4;
      for (let lx = 0; lx < CHUNK; lx++, i++, p += 4) {
        const t = type[i];
        const s = shade[i];
        if (t === SOIL) {
          rgba[p] = 84 + s;
          rgba[p + 1] = 60 + s;
          rgba[p + 2] = 38 + (s >> 1);
        } else if (t === WATER) {
          rgba[p] = 30;
          rgba[p + 1] = 90 + (s >> 1);
          rgba[p + 2] = 190 + s;
        } else if (t === PLANT) {
          const pl = plantById.get(owner[i]);
          if (pl) {
            rgba[p] = pl.r - (s >> 1);
            rgba[p + 1] = pl.g - (s >> 1);
            rgba[p + 2] = pl.b - (s >> 1);
          } else {
            rgba[p] = 40;
            rgba[p + 1] = 160;
            rgba[p + 2] = 60;
          }
        } else if (t === SEED_T) {
          rgba[p] = 210 - s;
          rgba[p + 1] = 180 - s;
          rgba[p + 2] = 80;
        } else {
          rgba[p] = 8;
          rgba[p + 1] = 9;
          rgba[p + 2] = 14;
        }
        rgba[p + 3] = 255;
      }
    }
  }

  function flushDraw() {
    let any = false;
    for (let c = 0; c < NC; c++) {
      if (drawDirty[c]) {
        paintChunk(c);
        drawDirty[c] = 0;
        any = true;
      }
    }
    if (any) texture.baseTexture.update();
  }

  // --- Fit canvas to window (CSS scale only; sim stays 1:1) ---
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    app.view.style.width = `${W * s}px`;
    app.view.style.height = `${H * s}px`;
  }
  fit();
  window.addEventListener("resize", fit);

  // --- Brushes ---
  let painting = false;
  let tool = WATER;
  const BRUSH = 4;
  function applyBrush(px, py) {
    const rect = app.view.getBoundingClientRect();
    const x = ((px - rect.left) / rect.width) * W;
    const y = ((py - rect.top) / rect.height) * H;
    if (tool === SEED_T) {
      // Drop a single default-genome seed; it falls and germinates on soil.
      const cx = x | 0;
      const cy = y | 0;
      if (cx >= 0 && cx < W && cy >= 0 && cy < H) {
        const i = cy * W + cx;
        if (type[i] === EMPTY) {
          type[i] = SEED_T;
          seeds.push({
            idx: i,
            genome: new Uint8Array(DEFAULT_GENOME),
            airborne: 0,
            rest: 0,
            age: 0,
          });
          wakeCell(cx, cy);
        }
      }
      return;
    }
    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
        const cx = (x + dx) | 0;
        const cy = (y + dy) | 0;
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        const i = cy * W + cx;
        if (tool === WATER && type[i] === EMPTY) {
          type[i] = WATER;
          waterCount++;
        } else if (tool === SOIL && type[i] === EMPTY) {
          type[i] = SOIL; // only into empty: soil displaces water by sinking
        } else if (tool === EMPTY && type[i] !== EMPTY) {
          const ti = type[i];
          if (ti === WATER) {
            waterCount--;
            type[i] = EMPTY;
            flow[i] = 0;
          } else if (ti === SOIL) {
            type[i] = EMPTY;
          } else if (ti === PLANT) {
            const pl = plantById.get(owner[i]);
            if (pl && !pl.dead) killPlant(pl); // fells the whole plant → soil
          } else {
            for (let k = seeds.length - 1; k >= 0; k--) {
              if (seeds[k].idx === i) {
                seeds[k] = seeds[seeds.length - 1];
                seeds.pop();
                break;
              }
            }
            type[i] = EMPTY;
          }
        } else {
          continue;
        }
        wakeCell(cx, cy);
      }
    }
  }
  app.view.addEventListener("pointerdown", (e) => {
    painting = true;
    applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    if (painting) applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", () => (painting = false));

  // --- Keys ---
  let paused = false;
  let ff = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "r") raining = !raining;
    if (e.key === "p") paused = !paused;
    if (e.key === "f") ff = !ff;
    if (e.key === "1") tool = WATER;
    if (e.key === "2") tool = SOIL;
    if (e.key === "3") tool = EMPTY;
    if (e.key === "4") tool = SEED_T;
    if (e.key === " ") {
      if (paused) tick();
      e.preventDefault();
    }
    if (e.key === "c") {
      const recount = recountWater();
      console.log(
        `tick ${ticks} | water counter ${waterCount}, recount ${recount} — ${
          recount === waterCount ? "conserved" : "LEAK"
        }`
      );
    }
  });

  // --- Main loop ---
  const hud = document.getElementById("hud");
  let tickMs = 0;
  let frames = 0;
  let fps = 0;
  let fpsTime = performance.now();

  function frame() {
    if (!paused) {
      const n = ff ? FF_FACTOR : 1;
      const t0 = performance.now();
      for (let k = 0; k < n; k++) tick();
      tickMs = tickMs * 0.95 + ((performance.now() - t0) / n) * 0.05;
    }
    flushDraw();
    app.renderer.render(app.stage);

    frames++;
    const now = performance.now();
    if (now - fpsTime >= 1000) {
      fps = frames;
      frames = 0;
      fpsTime = now;
      const toolName =
        tool === WATER
          ? "water"
          : tool === SOIL
          ? "soil"
          : tool === SEED_T
          ? "seed"
          : "erase";
      let plantCells = 0;
      for (let k = 0; k < plants.length; k++) plantCells += plants[k].cells.length;
      hud.textContent =
        `tick ${ticks} | ${fps} fps | ${tickMs.toFixed(2)} ms/tick | ` +
        `${countActive()}/${NC} chunks awake | water ${waterCount} | ` +
        `plants ${plants.length} (${plantCells} cells) | seeds ${seeds.length} | ` +
        `rain ${raining ? "ON" : "off"}${ff ? " | FF x" + FF_FACTOR : ""}${
          paused ? " | PAUSED" : ""
        }\n` +
        `[r]ain [p]ause [space]step [f]ast [c]onservation | ` +
        `brush: ${toolName} — [1]water [2]soil [3]erase [4]seed, drag to paint`;
    }
    requestAnimationFrame(frame);
  }
  frame();
}

if (typeof window === "undefined") {
  if (process.argv[2] === "phys") headlessTest();
  else evolutionTest();
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
