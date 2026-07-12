// evo-engine-millefleur-4.js — FORK of evo-engine-millefleur-3.js.
// The functional-organs round (v2 of the -3 design; see millefleur-HANDOFF-3).
//
// Naming: the ORGANISM is a "plant"; "flower" means only the flower ORGAN.
//
// Changes from -3:
// - ORGAN GENES: the triplebit alphabet gains two terminal gene values —
//   8 = LEAF, 9 = FLOWER — occupying a child slot like any child. The
//   topology-derived roles (and REQUIRE_BLOOM) are gone; stems branch
//   freely and bare twig tips (gene 0) are the mutation stepping-stone.
// - LEAF: aestheedlings' two-stage teardrop — the anchor cell plus two
//   3-cell stages angled up-and-away (7 cells). All-or-nothing per stage.
// - FLOWER: unchanged full 8-ring petal bloom, all-or-nothing.
// - FORCE_SEED_STALK: gene 0 is pinned to 0b010 (forward-only) and exempt
//   from mutation — the first cell above the seed always grows straight up.
// - ECONOMY (austere): unfolding is free; energy exists only as fitness.
//   At immortalization each leaf cell's open cardinal sides set a static
//   income rate (graduated table); banked energy = rate × age − spent, pure
//   arithmetic, no per-tick accumulation. Each flower runs simplant's
//   two-phase cycle against the shared bank: conceive a child genome at
//   energy ≥ G, launch it (paying childG) at energy ≥ G + childG. Seeds
//   launch airborne straight from their flower (crawl-to-tip dropped).
//   Leafless or flowerless plants are simply sterile — the economy selects.
// - MATURITY GATE: skeleton unfolds fully → leaves unfold → flowers bloom →
//   immortalize; only then does energy accrue and seeding begin.
// - ENDLESS ECOLOGY: decay of the fruitless is ON by default (auto window =
//   2 × world area; ?decay=0 disables and restores completion detection).
//   One clock, one death: a lineage that goes a window without a descendant
//   success fades out; energy only paces reproduction.
// - Global emission scheduler (SEEDS_PER_TICK + weighted parent pick) is
//   gone; per-flower energy pacing replaces it. Descendant-success
//   bookkeeping stays (it feeds the decay clock).
//
// Carried over from -3: upward germination, camera (?cols=&rows=&scale=,
// wheel zoom, drag pan, c refits), palette (olive stems, hashed-green
// leaves, full-spectrum hashed petals, cream centers), local/global
// uniqueness (?radius=), P_CLONE (?clone=), random run seed (?seed=),
// strict self-avoidance on the skeleton (parent/grandparent/sibling only;
// leaf blades and petals may nestle against their own plant but keep the
// 1-cell outline gap against every other plant).
//
// Run modes:
//   browser:  evo-engine-millefleur-4.html
//   headless: node evo-engine-millefleur-4.js [seed] [maxTicks] [cols] [rows] [radius] [pClone] [decayWindow]
//             (decayWindow: omitted = auto 2×area, 0 = off, N = N ticks)

const IS_BROWSER = typeof window !== "undefined";

const GENE_LEAF = 8;
const GENE_FLOWER = 9;

const CONSTANTS = {
  SCALE_SIZE: 4,
  RNG_SEED: 14, // headless default; browser randomizes unless ?seed=
  NUM_STARTER_SEEDS: 1, // always a single founder; everything descends by mutation
  AIRBORNE_STEPS: 64,
  UNIQUENESS_RADIUS: 99999, // >= any canvas => GLOBAL uniqueness. Lower it
  // (e.g. ?radius=64) for local uniqueness where forms may repeat at distance.
  P_CLONE: 0, // P(seed is exact copy). 0 => repeats are convergent only.
  EXTRA_MUTATION_PROB: 0.35, // P(one more mutation) — geometric tail
  P_ORGANIFY: 0.5, // P(a mutation landing on a bare twig makes it an organ)
  ABSORB_COEFF: 0.02, // energy/tick per graduated exposure point
  // (≈ simplant's expected income: P=0.6 per 30-tick cooldown)
  ABSORB_TABLE: [0, 0.5, 1.0, 1.5, 1.5], // energy value by open cardinal sides
  GERM_CLEAR_RADIUS: 1, // a seed needs an empty (2R+1)² box to germinate;
  // 1 = cell + 8 neighbors (dense). Higher spaces plants out, which favors
  // bigger forms (tiny plants can no longer tile tiny gaps) at the cost of
  // fill — an aesthetic/complexity lever (hotkeys g/G).
  COMPLETION_STREAK: 12000, // min consecutive failures that pause emission
  COMPLETION_STREAK_PER_CELL: 0.5, // scales the threshold with world area
  ENABLE_RANDOM_FACING: false, // every plant germinates facing UP
  DECAY_WINDOW_AUTO_FACTOR: 2, // auto decay window = factor × world area
  DECAY_SCAN_MASK: 31, // decay scan runs when (frame & mask) === 0
  FADE_TICKS: 300, // fade-out length of a decaying plant
  GROWING_ALPHA: 0.55,
  SHOW_TRAVELING_SEEDS: true,
  TICK_INTERVAL_MS: 1,
  COLORS: {
    BG: 0x0b0e08,
    SEED_DOT: 0xf0e6c8,
    STEM: 0x556b2f,
    FLOWER_CENTER: 0xf7ecc8,
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

// Soft additive hash: deterministic per genome (convergent twins share a
// color) AND similar genomes get similar colors, so lineages read as
// family-colored neighborhoods. Trade-off vs a strong hash: distinct forms
// can collide onto the same hue.
function plantColorFromGenome(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  return hsvToRgbInt((sum * 0.013) % 1, 0.8, 0.95);
}

// Leaves: same soft-hash idea, but confined to a green band so foliage
// reads as foliage; the full-spectrum lineage color lives in the petals.
function leafColorFromGenome(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] * 3 + (i % 5);
  return hsvToRgbInt(0.24 + ((sum * 0.017) % 1) * 0.14, 0.62, 0.72);
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

// Organ genes (8/9) are terminals: they occupy a child slot but have no
// slot bits of their own, so decode never recurses into them. (Necessary
// guard: 9 = 0b1001 would otherwise read bit 0 as a left child.)
function decodeGenomeToTree(genome) {
  let index = 0;
  function buildNode() {
    if (index >= genome.length) return null;
    const geneBits = genome[index++];
    const node = new GeneNode(geneBits);
    if (geneBits < 8) {
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

// One point mutation. Position biased toward newer genes (max of two
// draws); gene 0 is FORCE_SEED_STALK — pinned to 0b010 and exempt, so the
// first cell above the seed always grows straight up. Organ-aware ops:
// - on an organ gene: flip type (leaf<->flower) or demote to a bare twig;
// - on a bare twig (gene 0): P_ORGANIFY makes it a leaf/flower, else the
//   normal slot-bit mutation (twigs are the stepping-stone to organs);
// - on a stem: the classic slot-bit flip. A bit-clear that would amputate
//   a non-empty subtree (organs included, geneBits > 0) is a no-op.
function mutateGenome(genome) {
  const newGenome = new Uint8Array(genome);
  const len = newGenome.length;
  if (len < 2) return newGenome; // only the pinned seed stalk: nothing to do
  let geneIdx = Math.max(randInt(len), randInt(len));
  if (geneIdx === 0) geneIdx = randInt(len - 1) + 1;
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
  if (targetNode.geneBits >= 8) {
    targetNode.geneBits =
      rand() < 0.5 ? (targetNode.geneBits === GENE_LEAF ? GENE_FLOWER : GENE_LEAF) : 0;
    return encodeTreeToGenome(root);
  }
  if (targetNode.geneBits === 0 && rand() < CONSTANTS.P_ORGANIFY) {
    targetNode.geneBits = rand() < 0.5 ? GENE_LEAF : GENE_FLOWER;
    return encodeTreeToGenome(root);
  }
  const bitIdx = randInt(3);
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
// facing index -> world vector (0=N, 1=E, 2=S, 3=W)
const FACING_DX = new Int8Array([0, 1, 0, -1]);
const FACING_DY = new Int8Array([-1, 0, 1, 0]);

// ---------------------------------------------------------------- World state
let cols, rows, grid;
let growing = [], // plants still unfolding
  immortals = [], // completed, frozen (until decay claims them)
  travelingSeeds = [];
// local uniqueness: key -> positions/plants, checked within uniqRadius
let immortalByKey = new Map(), // key -> [{x, y}] root positions
  growingByKey = new Map(); // key -> [Plant]
let uniqRadius = CONSTANTS.UNIQUENESS_RADIUS;
let pClone = CONSTANTS.P_CLONE;
let decayWindow = -1; // -1 = auto (2 × area), 0 = off, N = N ticks
let fading = []; // immortals mid-fade (decay); they still block space
let frame = 0,
  failStreak = 0,
  complete = false,
  idCounter = 0,
  completionStreak = CONSTANTS.COMPLETION_STREAK;

function computeCompletionStreak() {
  completionStreak = Math.max(
    CONSTANTS.COMPLETION_STREAK,
    (cols * rows * CONSTANTS.COMPLETION_STREAK_PER_CELL) | 0
  );
}

const stats = {
  germinated: 0,
  seedDeaths: 0,
  dupeFails: 0, // germinations rejected by the local-uniqueness rule
  plantFails: 0,
  clones: 0, // seeds emitted as exact copies
  blooms: 0, // petal rings successfully placed
  emitted: 0, // seeds launched from flowers
  decayed: 0, // plants removed by decay of the fruitless
  footprints: [], // cell count of each immortal, in immortalization order
  genomeLens: [],
};

// Founder: seed stalk, two side leaves, a flower on top. Pre-order:
// root(010) -> stem(111){ left=LEAF, fwd=stem(010){ fwd=stem(010){
// fwd=FLOWER } }, right=LEAF }. Tall enough that the petal ring clears
// the leaf teardrops.
const DEFAULT_GENOME = new Uint8Array([
  0b010,
  0b111,
  GENE_LEAF,
  0b010,
  0b010,
  GENE_FLOWER,
  GENE_LEAF,
]);

// true if an identical genome is rooted (or unfolding) within uniqRadius
function keyConflictNear(key, x, y) {
  const r2 = uniqRadius * uniqRadius;
  const imm = immortalByKey.get(key);
  if (imm) {
    for (let i = 0; i < imm.length; i++) {
      const dx = imm[i].x - x,
        dy = imm[i].y - y;
      if (dx * dx + dy * dy <= r2) return true;
    }
  }
  const grow = growingByKey.get(key);
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
  let arr = growingByKey.get(plant.key);
  if (!arr) {
    arr = [];
    growingByKey.set(plant.key, arr);
  }
  arr.push(plant);
}

function unregisterGrowing(plant) {
  const arr = growingByKey.get(plant.key);
  if (!arr) return;
  const i = arr.indexOf(plant);
  if (i !== -1) {
    arr[i] = arr[arr.length - 1];
    arr.pop();
  }
  if (arr.length === 0) growingByKey.delete(plant.key);
}

// ---------------------------------------------------------------- Cells
// Roles come straight from the gene value now: 8 = leaf anchor, 9 = flower
// center, anything else is stem.
const ROLE_STEM = 0,
  ROLE_LEAF = 1,
  ROLE_FLOWER = 2;

class Cell {
  constructor(x, y, plant, node, parent, facingIdx, isRoot) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facingIdx = facingIdx;
    this.isRoot = isRoot;
    const geneBits = node.geneBits;
    this.role =
      geneBits === GENE_FLOWER
        ? ROLE_FLOWER
        : geneBits === GENE_LEAF
        ? ROLE_LEAF
        : ROLE_STEM;
    this.sprite = null;
    node.cell = this;
    grid[y * cols + x] = this;
    plant.cells.push(this);
    if (this.role === ROLE_FLOWER) plant.flowerCells.push(this);
    else if (this.role === ROLE_LEAF) {
      plant.leafAnchors.push(this);
      plant.leafSurface.push(this);
    } else {
      for (let slot = 0; slot < 3; slot++) {
        if ((geneBits >> slot) & 1 && node.children[slot]) {
          plant.frontier.push(node, slot);
        }
      }
    }
    if (IS_BROWSER && cellPool) {
      const tint =
        this.role === ROLE_FLOWER
          ? CONSTANTS.COLORS.FLOWER_CENTER
          : this.role === ROLE_LEAF
          ? plant.leafColor
          : CONSTANTS.COLORS.STEM;
      this.sprite = cellPool.acquire(x, y, tint, CONSTANTS.GROWING_ALPHA);
    }
  }
}

// Organ tissue (petals, leaf blades): grid-blocking plant matter, but not
// part of the genome tree — no node, never on the frontier, no children.
class OrganCell {
  constructor(x, y, plant, tint, isLeaf) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = null;
    this.parent = null;
    this.sprite = null;
    grid[y * cols + x] = this;
    plant.cells.push(this);
    if (isLeaf) plant.leafSurface.push(this);
    if (IS_BROWSER && cellPool)
      this.sprite = cellPool.acquire(x, y, tint, CONSTANTS.GROWING_ALPHA);
  }
}

// ---------------------------------------------------------------- Plants
class Plant {
  constructor(genome, x, y, parentPlant) {
    this.id = idCounter++;
    this.genome = genome;
    this.key = genomeKey(genome);
    this.color = plantColorFromGenome(genome);
    this.leafColor = leafColorFromGenome(genome);
    this.rootNode = decodeGenomeToTree(genome);
    this.cells = [];
    this.frontier = []; // flat pairs: node, slot
    this.flowerCells = []; // flower centers awaiting their petal ring
    this.leafAnchors = []; // leaf anchor cells awaiting their teardrop
    this.leafSurface = []; // every leaf cell (anchor + blades): energy income
    this.leafIndex = 0; // next leaf to unfold
    this.leafStage = 0; // 0 or 1 within that leaf
    this.bloomIndex = 0;
    this.mature = false;
    this.failed = false;
    this.parentPlant = parentPlant || null;
    this.directSuccesses = 0; // children that immortalized (stats/decay)
    this.lastLineageSuccessTick = frame; // decay clock
    // energy economy — set once at immortalization
    this.energyRate = 0;
    this.energySpent = 0;
    this.matureTick = 0;
    this.flowerRepro = null; // per-flower two-phase reproduction state
    // facing 0 = forward is UP: the seed is the bottom of the form
    const facing = CONSTANTS.ENABLE_RANDOM_FACING ? randInt(4) : 0;
    this.root = new Cell(x, y, this, this.rootNode, null, facing, true);
    registerGrowing(this);
  }

  growOneStep() {
    const f = this.frontier;
    if (f.length === 0) {
      // maturity gate: skeleton done -> unfold leaves (one stage per tick)
      // -> bloom flowers (one per tick) -> immortalize
      if (this.leafIndex < this.leafAnchors.length) {
        this.unfoldLeafStage();
        return;
      }
      if (this.bloomIndex < this.flowerCells.length) {
        this.bloomOne();
        return;
      }
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
    if (grid[ny * cols + nx]) {
      this.fail();
      return;
    }
    // Self-avoidance: the new cell may touch (8-way) only same-plant cells
    // that are topologically NEAR it — its parent, its grandparent (inside
    // of a turn), or a sibling (crotch of a fork). Contact with any farther
    // same-plant cell means a branch has looped back or is running alongside
    // itself: that is the "blob" and it aborts the plant. Any other-plant
    // contact aborts too (the inter-plant outline gap). Leaf blades and
    // petals don't exist yet during skeleton growth, so they never trip this.
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
    // note: even a fully-unfolded skeleton waits for the next tick's
    // leaf/bloom/immortalize pass at the top of growOneStep
  }

  // Aestheedlings teardrop: anchor L plus two 3-cell stages along U+D,
  // where U = the stem's forward and D = the slot direction (a forward-slot
  // leaf leans deterministically left). Stage cells must be in bounds,
  // empty, and clear of OTHER plants' 8-way halo (the outline gap); they
  // may nestle against their own plant. All-or-nothing per stage — one law,
  // fully unfold or vanish, organs included.
  unfoldLeafStage() {
    const L = this.leafAnchors[this.leafIndex];
    const P = L.parent;
    const ux = FACING_DX[P.facingIdx],
      uy = FACING_DY[P.facingIdx];
    let dx = L.x - P.x,
      dy = L.y - P.y;
    if (dx === ux && dy === uy) {
      dx = DIR_DX[P.facingIdx * 3];
      dy = DIR_DY[P.facingIdx * 3];
    }
    const bx = this.leafStage === 0 ? L.x : L.x + ux + dx;
    const by = this.leafStage === 0 ? L.y : L.y + uy + dy;
    const targets = [bx + ux, by + uy, bx + dx, by + dy, bx + ux + dx, by + uy + dy];
    for (let i = 0; i < 6; i += 2) {
      const px = targets[i],
        py = targets[i + 1];
      if (px < 0 || px >= cols || py < 0 || py >= rows) {
        this.fail();
        return;
      }
      if (grid[py * cols + px]) {
        this.fail();
        return;
      }
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          const mx = px + ddx,
            my = py + ddy;
          if (mx < 0 || mx >= cols || my < 0 || my >= rows) continue;
          const nb = grid[my * cols + mx];
          if (nb && nb.plant !== this) {
            this.fail();
            return;
          }
        }
      }
    }
    for (let i = 0; i < 6; i += 2)
      new OrganCell(targets[i], targets[i + 1], this, this.leafColor, true);
    if (++this.leafStage === 2) {
      this.leafStage = 0;
      this.leafIndex++;
    }
  }

  // All-or-nothing petal ring: every 8-neighbor slot around the flower cell
  // (minus the stem attachment) must be claimable — in bounds, empty, and
  // clear of OTHER plants' 8-way halo (the tapestry outline gap). Petals
  // may nestle against their own plant. Any blocked petal fails the WHOLE
  // plant: the bloom is part of the body plan.
  bloomOne() {
    const F = this.flowerCells[this.bloomIndex];
    const P = F.parent;
    const targets = [];
    for (let ddx = -1; ddx <= 1; ddx++) {
      for (let ddy = -1; ddy <= 1; ddy++) {
        if (ddx === 0 && ddy === 0) continue;
        const px = F.x + ddx,
          py = F.y + ddy;
        if (P && px === P.x && py === P.y) continue; // stem attachment
        if (px < 0 || px >= cols || py < 0 || py >= rows) {
          this.fail();
          return;
        }
        if (grid[py * cols + px]) {
          this.fail();
          return;
        }
        targets.push(px, py);
      }
    }
    for (let i = 0; i < targets.length; i += 2) {
      const px = targets[i],
        py = targets[i + 1];
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          const mx = px + ddx,
            my = py + ddy;
          if (mx < 0 || mx >= cols || my < 0 || my >= rows) continue;
          const nb = grid[my * cols + mx];
          if (nb && nb.plant !== this) {
            this.fail();
            return;
          }
        }
      }
    }
    for (let i = 0; i < targets.length; i += 2)
      new OrganCell(targets[i], targets[i + 1], this, this.color, false);
    this.bloomIndex++;
    stats.blooms++;
  }

  fail() {
    this.failed = true;
    unregisterGrowing(this);
    failStreak++;
    stats.plantFails++;
    removePlantMatter(this);
    this.frontier = [];
  }

  immortalize() {
    this.mature = true;
    unregisterGrowing(this);
    let arr = immortalByKey.get(this.key);
    if (!arr) {
      arr = [];
      immortalByKey.set(this.key, arr);
    }
    this.keyEntry = { x: this.root.x, y: this.root.y };
    arr.push(this.keyEntry);
    immortals.push(this);
    failStreak = 0;
    // lineage credit: the success refreshes the decay clock of the whole
    // ancestor chain
    this.lastLineageSuccessTick = frame;
    const p = this.parentPlant;
    if (p) {
      p.directSuccesses++;
      for (let a = p; a; a = a.parentPlant) a.lastLineageSuccessTick = frame;
    }
    // energy: computed ONCE from the mature form. Each leaf cell's open
    // cardinal sides pay per the graduated table; banked energy thereafter
    // is rate × age − spent, pure arithmetic.
    let rate = 0;
    const table = CONSTANTS.ABSORB_TABLE;
    for (let i = 0; i < this.leafSurface.length; i++) {
      const c = this.leafSurface[i];
      let open = 0;
      if (c.y > 0 && !grid[(c.y - 1) * cols + c.x]) open++;
      if (c.y < rows - 1 && !grid[(c.y + 1) * cols + c.x]) open++;
      if (c.x > 0 && !grid[c.y * cols + c.x - 1]) open++;
      if (c.x < cols - 1 && !grid[c.y * cols + c.x + 1]) open++;
      rate += table[open];
    }
    this.energyRate = rate * CONSTANTS.ABSORB_COEFF;
    this.matureTick = frame;
    this.energySpent = 0;
    this.flowerRepro = [];
    for (let i = 0; i < this.flowerCells.length; i++)
      this.flowerRepro.push({ phase: 0, childGenome: null });
    stats.footprints.push(this.cells.length);
    stats.genomeLens.push(this.genome.length);
    if (IS_BROWSER) {
      for (let i = 0; i < this.cells.length; i++)
        this.cells[i].sprite.alpha = 1;
    }
  }
}

// Free every grid cell / sprite a plant occupies (fail or decay removal).
function removePlantMatter(plant) {
  const cells = plant.cells;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    grid[cell.y * cols + cell.x] = null;
    if (cell.node) cell.node.cell = null;
    if (cell.sprite) cellPool.release(cell.sprite);
  }
  plant.cells = [];
}

function unregisterImmortalKey(plant) {
  const arr = immortalByKey.get(plant.key);
  if (!arr) return;
  const i = arr.indexOf(plant.keyEntry);
  if (i !== -1) {
    arr[i] = arr[arr.length - 1];
    arr.pop();
  }
  if (arr.length === 0) immortalByKey.delete(plant.key);
}

// ---------------------------------------------------------------- Seeds
// Clone with pClone (exact copies can only take root beyond uniqRadius of
// the parent), else always >= 1 mutation with geometric extras.
function makeChildGenome(parentGenome) {
  if (rand() < pClone) {
    stats.clones++;
    return new Uint8Array(parentGenome);
  }
  let g = mutateGenome(parentGenome);
  while (rand() < CONSTANTS.EXTRA_MUTATION_PROB) g = mutateGenome(g);
  return g;
}

// Seeds launch airborne straight from their flower — flowers ARE the
// extremities, so the old crawl-to-tip phase is gone.
function emitSeed(parent, flowerCell, genome) {
  const ts = {
    x: flowerCell.x,
    y: flowerCell.y,
    steps: 0,
    parentPlant: parent, // lineage link for the decay clock
    genome: genome,
    key: genomeKey(genome),
    sprite: null,
    dead: false,
  };
  if (IS_BROWSER && CONSTANTS.SHOW_TRAVELING_SEEDS) {
    ts.sprite = seedPool.acquire(ts.x, ts.y, CONSTANTS.COLORS.SEED_DOT, 0.45);
  }
  travelingSeeds.push(ts);
  stats.emitted++;
}

function stepSeed(ts) {
  if (ts.steps >= CONSTANTS.AIRBORNE_STEPS) {
    // germination: cell + 8 neighbors empty, no identical genome in radius
    const tx = ts.x,
      ty = ts.y;
    let clear = !grid[ty * cols + tx];
    if (clear) {
      const R = CONSTANTS.GERM_CLEAR_RADIUS;
      outer: for (let ddx = -R; ddx <= R; ddx++) {
        for (let ddy = -R; ddy <= R; ddy++) {
          if (ddx === 0 && ddy === 0) continue;
          const nx = tx + ddx,
            ny = ty + ddy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (grid[ny * cols + nx]) {
            clear = false;
            break outer;
          }
        }
      }
    }
    if (!clear) {
      failStreak++;
      stats.seedDeaths++;
    } else if (keyConflictNear(ts.key, tx, ty)) {
      failStreak++;
      stats.dupeFails++;
    } else {
      growing.push(new Plant(ts.genome, tx, ty, ts.parentPlant));
      stats.germinated++;
    }
    ts.dead = true;
    return;
  }
  // one random cardinal step; steps out of bounds are spent but not taken
  const dir = randInt(4);
  if (dir === 0 && ts.x > 0) ts.x--;
  else if (dir === 1 && ts.x < cols - 1) ts.x++;
  else if (dir === 2 && ts.y > 0) ts.y--;
  else if (dir === 3 && ts.y < rows - 1) ts.y++;
  ts.steps++;
}

// ---------------------------------------------------------------- Setup
function germSpotClear(x, y) {
  if (grid[y * cols + x]) return false;
  for (let ddx = -1; ddx <= 1; ddx++) {
    for (let ddy = -1; ddy <= 1; ddy++) {
      if (ddx === 0 && ddy === 0) continue;
      const nx = x + ddx,
        ny = y + ddy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (grid[ny * cols + nx]) return false;
    }
  }
  return true;
}

function initializeStarters() {
  let base = canonical(DEFAULT_GENOME);
  for (let i = 0; i < CONSTANTS.NUM_STARTER_SEEDS; i++) {
    let genome = base;
    for (let m = 0; m < i; m++) genome = mutateGenome(genome);
    let placed = false;
    // the first founder always germinates dead center; any extras scatter
    if (i === 0) {
      const cx = (cols / 2) | 0,
        cy = (rows / 2) | 0;
      if (germSpotClear(cx, cy) && !keyConflictNear(genomeKey(genome), cx, cy)) {
        growing.push(new Plant(genome, cx, cy));
        placed = true;
      }
    }
    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const x = randInt(cols),
        y = randInt(rows);
      if (!germSpotClear(x, y)) continue;
      if (keyConflictNear(genomeKey(genome), x, y)) {
        genome = mutateGenome(genome);
        continue;
      }
      growing.push(new Plant(genome, x, y));
      placed = true;
    }
  }
}

// ---------------------------------------------------------------- Tick
function advanceTick() {
  if (complete) return;
  frame++;

  // 1. growth (one action per plant per tick); swap-and-pop finished/failed
  let gLen = growing.length;
  for (let i = gLen - 1; i >= 0; i--) {
    const plant = growing[i];
    plant.growOneStep();
    if (plant.failed || plant.mature) {
      gLen--;
      growing[i] = growing[gLen];
      growing.length = gLen;
    }
  }

  // 2. traveling seeds
  let tsLen = travelingSeeds.length;
  for (let i = tsLen - 1; i >= 0; i--) {
    const ts = travelingSeeds[i];
    stepSeed(ts);
    if (ts.dead) {
      if (ts.sprite) seedPool.release(ts.sprite);
      tsLen--;
      travelingSeeds[i] = travelingSeeds[tsLen];
      travelingSeeds.length = tsLen;
    }
  }

  // 3. reproduction — per-plant, energy-paced. Each flower runs simplant's
  // two-phase cycle against the plant's shared bank: conceive a child
  // genome at energy >= G, launch it (paying childG) at energy >= G +
  // childG. Banked energy = rate × age − spent. Leafless (rate 0) or
  // flowerless plants are sterile: the economy does the selecting. With
  // decay off, emission pauses on a long failure streak so completion can
  // drain and trigger (the -3 behavior).
  if (decayWindow > 0 || failStreak < completionStreak) {
    for (let i = 0; i < immortals.length; i++) {
      const pl = immortals[i];
      if (pl.energyRate === 0 || pl.flowerCells.length === 0) continue;
      let avail = (frame - pl.matureTick) * pl.energyRate - pl.energySpent;
      const G = pl.genome.length;
      if (avail < G) continue;
      const fr = pl.flowerRepro;
      for (let s = 0; s < fr.length; s++) {
        const st = fr[s];
        if (st.phase === 0) {
          st.childGenome = makeChildGenome(pl.genome);
          st.phase = 1;
        } else if (avail >= G + st.childGenome.length) {
          emitSeed(pl, pl.flowerCells[s], st.childGenome);
          pl.energySpent += st.childGenome.length;
          avail -= st.childGenome.length;
          st.phase = 0;
          st.childGenome = null;
        }
      }
    }
  }

  // 3.5 decay of the fruitless: a plant whose lineage has gone decayWindow
  // ticks without ANY descendant success starts fading; after FADE_TICKS
  // its space AND its genome are freed. A success anywhere downstream
  // refreshes the whole ancestor chain (see immortalize).
  if (decayWindow > 0) {
    if ((frame & CONSTANTS.DECAY_SCAN_MASK) === 0) {
      for (let i = immortals.length - 1; i >= 0; i--) {
        const pl = immortals[i];
        if (frame - pl.lastLineageSuccessTick > decayWindow) {
          pl.fadeStart = frame;
          fading.push(pl);
          immortals[i] = immortals[immortals.length - 1];
          immortals.pop();
        }
      }
    }
    for (let i = fading.length - 1; i >= 0; i--) {
      const pl = fading[i];
      const t = (frame - pl.fadeStart) / CONSTANTS.FADE_TICKS;
      if (t >= 1) {
        removePlantMatter(pl);
        unregisterImmortalKey(pl);
        stats.decayed++;
        fading[i] = fading[fading.length - 1];
        fading.pop();
      } else if (IS_BROWSER) {
        const a = 1 - t;
        const cells = pl.cells;
        for (let j = 0; j < cells.length; j++)
          if (cells[j].sprite) cells[j].sprite.alpha = a;
      }
    }
  }

  // 4. completion: streak exceeded and everything in flight has drained.
  // Only reachable with decay off — the endless ecology never completes.
  if (
    decayWindow === 0 &&
    immortals.length > 0 &&
    failStreak >= completionStreak &&
    growing.length === 0 &&
    travelingSeeds.length === 0
  ) {
    complete = true;
  }

  // 5. safety: total wipeout before any immortal — reseed
  if (
    immortals.length === 0 &&
    growing.length === 0 &&
    travelingSeeds.length === 0
  ) {
    initializeStarters();
  }
}

function occupiedCells() {
  let n = 0;
  for (let i = 0; i < immortals.length; i++) n += immortals[i].cells.length;
  for (let i = 0; i < growing.length; i++) n += growing[i].cells.length;
  for (let i = 0; i < fading.length; i++) n += fading[i].cells.length;
  return n;
}

function quartileMeans(arr) {
  if (arr.length < 4) return null;
  const q = (arr.length / 4) | 0;
  let a = 0,
    b = 0;
  for (let i = 0; i < q; i++) a += arr[i];
  for (let i = arr.length - q; i < arr.length; i++) b += arr[i];
  return [a / q, b / q];
}

// ================================================================ HEADLESS
if (!IS_BROWSER) {
  const args = process.argv.slice(2);
  const seed = parseInt(args[0] || "14", 10);
  const maxTicks = parseInt(args[1] || "400000", 10);
  cols = parseInt(args[2] || "240", 10);
  rows = parseInt(args[3] || "135", 10);
  if (args[4]) uniqRadius = parseInt(args[4], 10);
  if (args[5]) pClone = parseFloat(args[5]);
  if (args[6] !== undefined) decayWindow = parseInt(args[6], 10);
  if (decayWindow === -1)
    decayWindow = (cols * rows * CONSTANTS.DECAY_WINDOW_AUTO_FACTOR) | 0;
  runSeed = seed;
  rngState = seed >>> 0;
  grid = new Array(cols * rows).fill(null);
  computeCompletionStreak();

  console.log(
    `millefleur-4 headless: seed=${seed} maxTicks=${maxTicks} ` +
      `world=${cols}x${rows} radius=${uniqRadius} pClone=${pClone} ` +
      `decay=${decayWindow || "off"}`
  );
  const t0 = Date.now();
  initializeStarters();
  while (frame < maxTicks && !complete) {
    advanceTick();
    if (frame % 20000 === 0) {
      const fill = ((occupiedCells() / (cols * rows)) * 100).toFixed(1);
      console.log(
        `t=${frame} plants=${immortals.length} growing=${growing.length} ` +
          `seeds=${travelingSeeds.length} emitted=${stats.emitted} ` +
          `decayed=${stats.decayed} fill=${fill}%`
      );
    }
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const fill = ((occupiedCells() / (cols * rows)) * 100).toFixed(1);
  console.log(`\n=== ${complete ? "COMPLETE" : "TICK LIMIT"} ===`);
  console.log(
    `ticks=${frame} (${elapsed}s) plants=${immortals.length} fill=${fill}%`
  );
  console.log(
    `germinated=${stats.germinated} seedDeaths=${stats.seedDeaths} ` +
      `dupeFails=${stats.dupeFails} plantFails=${stats.plantFails} ` +
      `clones=${stats.clones} blooms=${stats.blooms} emitted=${stats.emitted} ` +
      `decayed=${stats.decayed}`
  );
  let flowerOrgans = 0,
    leafOrgans = 0,
    rateSum = 0;
  for (let i = 0; i < immortals.length; i++) {
    flowerOrgans += immortals[i].flowerCells.length;
    leafOrgans += immortals[i].leafAnchors.length;
    rateSum += immortals[i].energyRate;
  }
  const n = immortals.length || 1;
  console.log(
    `standing plants: flowers/plant=${(flowerOrgans / n).toFixed(2)} ` +
      `leaves/plant=${(leafOrgans / n).toFixed(2)} ` +
      `mean energyRate=${(rateSum / n).toFixed(3)}/tick`
  );
  const fp = quartileMeans(stats.footprints);
  if (fp)
    console.log(
      `footprint gradient (mean cells, first quartile -> last): ` +
        `${fp[0].toFixed(1)} -> ${fp[1].toFixed(1)}`
    );
  const gl = quartileMeans(stats.genomeLens);
  if (gl)
    console.log(
      `genome-length gradient (first quartile -> last): ` +
        `${gl[0].toFixed(1)} -> ${gl[1].toFixed(1)}`
    );
  // distinct vs repeats, and verify no same-key pair within the radius
  const r2 = uniqRadius * uniqRadius;
  let violations = 0;
  for (const list of immortalByKey.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const dx = list[i].x - list[j].x,
          dy = list[i].y - list[j].y;
        if (dx * dx + dy * dy <= r2) violations++;
      }
    }
  }
  console.log(
    `distinct genomes=${immortalByKey.size} ` +
      `repeats=${immortals.length + fading.length - immortalByKey.size} ` +
      `radius violations=${violations}`
  );
  // decay runs pass by sustaining an ecology; decay-off runs by completing
  const pass =
    violations === 0 &&
    stats.emitted > 0 &&
    (decayWindow > 0
      ? immortals.length + growing.length > 0
      : immortals.length > 0);
  console.log(pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
}

// ================================================================ BROWSER
let app,
  textures = {},
  cellPool = null,
  seedPool = null;
let worldContainer = null; // camera: pan/zoom the world, UI stays put
let dragging = false,
  dragLastX = 0,
  dragLastY = 0;
let paused = false,
  fastForward = true,
  fastForwardFactor = 10;
let fastForwardLevels = [1, 10, 100, 1000],
  fastForwardIndex = 1,
  lastTickTime = 0;
let statusText, knobText, completeText;
let uiUpdateCounter = 0;
const UI_UPDATE_INTERVAL = 15;
let urlSeed = null; // ?seed= pins the run; reset replays it

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
      worldContainer.addChild(sprite);
      this.pool.push(sprite);
    }
    sprite.__pi = this.activeCount;
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
    const i = sprite.__pi;
    this.activeCount--;
    const last = this.pool[this.activeCount];
    this.pool[i] = last;
    last.__pi = i;
    this.pool[this.activeCount] = sprite;
    sprite.__pi = this.activeCount;
  }
}

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
  if (params.has("clone")) {
    const c = parseFloat(params.get("clone"));
    if (isFinite(c) && c >= 0 && c <= 1) pClone = c;
  }
  if (params.has("scale")) {
    const s = parseInt(params.get("scale"), 10);
    if (isFinite(s) && s >= 1 && s <= 32) CONSTANTS.SCALE_SIZE = s;
  }
  if (params.has("decay")) {
    // default is auto; ?decay=0 disables (completion mode), ?decay=1 auto,
    // ?decay=N a window of N ticks
    const d = parseInt(params.get("decay"), 10);
    if (isFinite(d) && d >= 0) decayWindow = d === 1 ? -1 : d;
  }
  runSeed = newRunSeed();
  rngState = runSeed >>> 0;

  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: CONSTANTS.COLORS.BG,
    antialias: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";
  app.renderer.roundPixels = true;
  // world size defaults to the window; ?cols=&rows= decouple it (explore
  // a big world through the camera)
  cols = (window.innerWidth / CONSTANTS.SCALE_SIZE) | 0;
  rows = (window.innerHeight / CONSTANTS.SCALE_SIZE) | 0;
  if (params.has("cols")) {
    const c = parseInt(params.get("cols"), 10);
    if (isFinite(c) && c >= 16) cols = c;
  }
  if (params.has("rows")) {
    const r = parseInt(params.get("rows"), 10);
    if (isFinite(r) && r >= 16) rows = r;
  }
  grid = new Array(cols * rows).fill(null);
  computeCompletionStreak();
  if (decayWindow === -1)
    decayWindow = (cols * rows * CONSTANTS.DECAY_WINDOW_AUTO_FACTOR) | 0;
  console.log(
    `millefleur-4: seed=${runSeed} world=${cols}x${rows} ` +
      `scale=${CONSTANTS.SCALE_SIZE} radius=${uniqRadius} pClone=${pClone} ` +
      `decay=${decayWindow || "off"} (replay with ?seed=${runSeed})`
  );

  worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  const g = new PIXI.Graphics();
  g.beginFill(0xffffff);
  g.drawRect(0, 0, 1, 1);
  g.endFill();
  textures.cell = app.renderer.generateTexture(g);
  cellPool = new SpritePool(textures.cell);
  seedPool = new SpritePool(textures.cell);

  const style = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 14,
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 2,
  });
  statusText = new PIXI.Text("", style);
  statusText.x = 10;
  statusText.y = 10;
  statusText.zIndex = 1000;
  app.stage.addChild(statusText);
  knobText = new PIXI.Text("", style);
  knobText.x = 10;
  knobText.y = 30;
  knobText.zIndex = 1000;
  app.stage.addChild(knobText);
  const completeStyle = new PIXI.TextStyle({
    fontFamily: "Georgia",
    fontSize: 28,
    fill: "#f0e6c8",
    stroke: "#000000",
    strokeThickness: 4,
  });
  completeText = new PIXI.Text("", completeStyle);
  completeText.zIndex = 1001;
  app.stage.addChild(completeText);
  app.stage.sortableChildren = true;

  initializeStarters();

  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", () =>
    app.renderer.resize(window.innerWidth, window.innerHeight)
  );

  // camera: wheel zooms at the cursor, drag pans, fitView centers the world
  app.view.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    },
    { passive: false }
  );
  app.view.addEventListener("pointerdown", (e) => {
    dragging = true;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    worldContainer.x += e.clientX - dragLastX;
    worldContainer.y += e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
  });
  window.addEventListener("pointerup", () => (dragging = false));
  fitView();

  const btn = document.createElement("button");
  btn.innerText = `${fastForwardFactor}x`;
  btn.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:1000;padding:10px;background:#333;color:#fff;border:1px solid #fff;cursor:pointer";
  btn.onclick = () => {
    fastForwardIndex = (fastForwardIndex + 1) % fastForwardLevels.length;
    fastForwardFactor = fastForwardLevels[fastForwardIndex];
    btn.innerText = `${fastForwardFactor}x`;
    fastForward = fastForwardFactor > 1;
  };
  document.body.appendChild(btn);
  app.ticker.add(gameLoop);
}

function zoomAt(sx, sy, factor) {
  const w = worldContainer;
  const newScale = Math.min(32, Math.max(0.05, w.scale.x * factor));
  const k = newScale / w.scale.x;
  w.x = sx - (sx - w.x) * k;
  w.y = sy - (sy - w.y) * k;
  w.scale.set(newScale);
}

// scale + center the world to the window (start view, and key c)
function fitView() {
  const worldW = cols * CONSTANTS.SCALE_SIZE;
  const worldH = rows * CONSTANTS.SCALE_SIZE;
  const s = Math.min(1, app.renderer.width / worldW, app.renderer.height / worldH);
  worldContainer.scale.set(s);
  worldContainer.x = ((app.renderer.width - worldW * s) / 2) | 0;
  worldContainer.y = ((app.renderer.height - worldH * s) / 2) | 0;
}

function gameLoop() {
  if (!paused && !complete) {
    if (fastForward) {
      const count = fastForwardFactor | 0;
      for (let i = 0; i < count && !complete; i++) advanceTick();
    } else {
      const now = Date.now();
      if (now - lastTickTime >= CONSTANTS.TICK_INTERVAL_MS) {
        advanceTick();
        lastTickTime = now;
      }
    }
    syncVisuals();
  }
  if (++uiUpdateCounter >= UI_UPDATE_INTERVAL) {
    updateUI();
    uiUpdateCounter = 0;
  }
}

function syncVisuals() {
  const SCALE = CONSTANTS.SCALE_SIZE;
  for (let i = 0; i < travelingSeeds.length; i++) {
    const ts = travelingSeeds[i];
    if (ts.sprite) {
      ts.sprite.x = ts.x * SCALE;
      ts.sprite.y = ts.y * SCALE;
    }
  }
}

function updateUI() {
  const fill = ((occupiedCells() / (cols * rows)) * 100).toFixed(1);
  const repeats = immortals.length + fading.length - immortalByKey.size;
  const rLabel = uniqRadius >= cols + rows ? "global" : uniqRadius;
  statusText.text =
    `Seed: ${runSeed} | R: ${rLabel} | Plants: ${immortals.length} ` +
    `(${repeats} repeats) | Growing: ${growing.length} | ` +
    `Seeds: ${travelingSeeds.length} | Emitted: ${stats.emitted} | ` +
    `Fill: ${fill}% | Ticks: ${frame}` +
    (decayWindow > 0
      ? ` | Decay: ${decayWindow} (${stats.decayed})`
      : ` | Streak: ${failStreak}`) +
    (paused ? " | PAUSED" : "");
  knobText.text = knobLine() + "  [e/E g/G o/O  [ ]]";
  if (complete && !completeText.text) {
    completeText.text = `❀ complete — ${immortals.length} plants, seed ${runSeed} ❀`;
    completeText.x = ((app.renderer.width - completeText.width) / 2) | 0;
    completeText.y = ((app.renderer.height - completeText.height) / 2) | 0;
  }
}

function resetSimulation(keepSeed) {
  for (let i = 0; i < immortals.length; i++) {
    const cells = immortals[i].cells;
    for (let j = 0; j < cells.length; j++)
      if (cells[j].sprite) cellPool.release(cells[j].sprite);
  }
  for (let i = 0; i < growing.length; i++) {
    const cells = growing[i].cells;
    for (let j = 0; j < cells.length; j++)
      if (cells[j].sprite) cellPool.release(cells[j].sprite);
  }
  for (let i = 0; i < fading.length; i++) {
    const cells = fading[i].cells;
    for (let j = 0; j < cells.length; j++)
      if (cells[j].sprite) cellPool.release(cells[j].sprite);
  }
  for (let i = 0; i < travelingSeeds.length; i++)
    if (travelingSeeds[i].sprite) seedPool.release(travelingSeeds[i].sprite);
  growing = [];
  immortals = [];
  travelingSeeds = [];
  fading = [];
  immortalByKey = new Map();
  growingByKey = new Map();
  grid = new Array(cols * rows).fill(null);
  frame = 0;
  failStreak = 0;
  complete = false;
  idCounter = 0;
  stats.germinated = 0;
  stats.seedDeaths = 0;
  stats.dupeFails = 0;
  stats.plantFails = 0;
  stats.clones = 0;
  stats.blooms = 0;
  stats.emitted = 0;
  stats.decayed = 0;
  stats.footprints = [];
  stats.genomeLens = [];
  completeText.text = "";
  if (!keepSeed) runSeed = newRunSeed();
  rngState = runSeed >>> 0;
  console.log(`millefleur-4 reset: seed=${runSeed} (replay with ?seed=${runSeed})`);
  initializeStarters();
}

// Knob hotkeys: adjust a magic number by a sensible discrete step, then
// restart on the SAME seed so the change is what you're seeing, not a new
// run. Values are read live from CONSTANTS (immortalize / mutateGenome /
// stepSeed all consult it each time), so a reset is all that's needed.
function bumpKnob(msg) {
  console.log(`knob: ${msg} — restarting seed ${runSeed}`);
  resetSimulation(true);
}
function knobLine() {
  return (
    `E(nergy):${CONSTANTS.ABSORB_COEFF} | G(erm):${CONSTANTS.GERM_CLEAR_RADIUS} | ` +
    `O(rganify):${CONSTANTS.P_ORGANIFY.toFixed(2)} | ` +
    `Decay:${decayWindow > 0 ? decayWindow : "off"}`
  );
}

function onKeyDown(e) {
  if (e.key === " " || e.code === "Space") {
    if (paused && !complete) {
      advanceTick();
      syncVisuals();
    }
    e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") paused = !paused;
  if (e.key === "f" || e.key === "F") fastForward = !fastForward;
  if (e.key === "0") resetSimulation();
  if (e.key === "c" || e.key === "C") fitView();
  // --- knob hotkeys (lowercase down, uppercase up; each restarts on seed) ---
  // energy income: geometric ×/÷ 2, clamp [0.0025, 4]
  if (e.key === "e")
    bumpKnob(
      `ABSORB_COEFF -> ${(CONSTANTS.ABSORB_COEFF = Math.max(
        0.0025,
        CONSTANTS.ABSORB_COEFF / 2
      ))}`
    );
  if (e.key === "E")
    bumpKnob(
      `ABSORB_COEFF -> ${(CONSTANTS.ABSORB_COEFF = Math.min(
        4,
        CONSTANTS.ABSORB_COEFF * 2
      ))}`
    );
  // germination clearance radius: integer ±1, clamp [1, 6]
  if (e.key === "g")
    bumpKnob(
      `GERM_CLEAR_RADIUS -> ${(CONSTANTS.GERM_CLEAR_RADIUS = Math.max(
        1,
        CONSTANTS.GERM_CLEAR_RADIUS - 1
      ))}`
    );
  if (e.key === "G")
    bumpKnob(`GERM_CLEAR_RADIUS -> ${++CONSTANTS.GERM_CLEAR_RADIUS}`);
  // organify probability: ±0.1, clamp [0, 1]
  if (e.key === "o")
    bumpKnob(
      `P_ORGANIFY -> ${(CONSTANTS.P_ORGANIFY = Math.max(
        0,
        +(CONSTANTS.P_ORGANIFY - 0.1).toFixed(2)
      ))}`
    );
  if (e.key === "O")
    bumpKnob(
      `P_ORGANIFY -> ${(CONSTANTS.P_ORGANIFY = Math.min(
        1,
        +(CONSTANTS.P_ORGANIFY + 0.1).toFixed(2)
      ))}`
    );
  // decay window: geometric ×/÷ 1.5, clamp [1000, 20×area]; [ shorter, ] longer
  if (e.key === "[") {
    if (decayWindow <= 0) decayWindow = (cols * rows) | 0;
    decayWindow = Math.max(1000, (decayWindow / 1.5) | 0);
    bumpKnob(`decayWindow -> ${decayWindow}`);
  }
  if (e.key === "]") {
    if (decayWindow <= 0) decayWindow = (cols * rows) | 0;
    decayWindow = Math.min((cols * rows * 20) | 0, (decayWindow * 1.5) | 0);
    bumpKnob(`decayWindow -> ${decayWindow}`);
  }
  if (e.key === "d" || e.key === "D") {
    // toggle decay of the fruitless mid-run (auto window when turning on)
    decayWindow =
      decayWindow > 0
        ? 0
        : (cols * rows * CONSTANTS.DECAY_WINDOW_AUTO_FACTOR) | 0;
    if (complete && decayWindow > 0) {
      complete = false; // wake a finished piece into the endless ecology
      completeText.text = "";
    }
    console.log(`decay: ${decayWindow > 0 ? decayWindow + " ticks" : "off"}`);
  }
  if (e.key === "r" || e.key === "R") {
    const fp = quartileMeans(stats.footprints);
    console.log(
      `seed=${runSeed} t=${frame} plants=${immortals.length} ` +
        `distinct=${immortalByKey.size} growing=${growing.length} ` +
        `seeds=${travelingSeeds.length} emitted=${stats.emitted} ` +
        `decayed=${stats.decayed} ` +
        `fails=${stats.plantFails}/${stats.seedDeaths} dupes=${stats.dupeFails}` +
        (fp ? ` footprint ${fp[0].toFixed(1)}->${fp[1].toFixed(1)}` : "")
    );
  }
}

if (IS_BROWSER) {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initBrowser);
  else initBrowser();
}
