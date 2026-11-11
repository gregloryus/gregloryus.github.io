// evo-engine-millefleur-5.js — FORK of evo-engine-millefleur-4.js.
// THE GROWING WORLD (2026-07-25).
//
// Naming unchanged: the ORGANISM is a "plant"; "flower" means only the
// flower ORGAN.
//
// ONE THESIS: plants never finish growing. -4 asked every offspring a
// pass/fail question — unfold your whole genome into empty space or be
// annihilated — and P(unfold) dominated fecundity and longevity so
// completely that four rounds of tuning could not make complexity pay.
// -5 deletes the question. A plant is a set of growth sites that get built
// whenever the plant can afford them and there is room. Blocked is not
// fatal; blocked is just not-yet.
//
// THE FIVE RULES (this is the whole model)
//  1. CONTINUOUS GROWTH. No maturity gate, no immortalization. The genome
//     is a growth POLICY, not a blueprint: gene i says which slots a cell
//     MAY produce. It produces them when it can pay and there is space.
//  2. BLOCKED IS A LOCAL NO-OP. A growth attempt that fails the placement
//     rules costs nothing and stays in the queue. It will be retried
//     forever — so a branch lost to a crowded neighbor can GROW BACK when
//     that neighbor dies. All of -4's placement discipline is retained
//     verbatim (strict skeleton self-avoidance, inter-plant outline gap,
//     organ halos); it just no longer executes the plant.
//  3. LIVE INCOME. Every cell earns from its OWN currently-open cardinal
//     sides, maintained incrementally as neighbors arrive and leave.
//     Nothing is frozen at maturity. Shading and crowding are continuous
//     local facts. Leaf tissue earns LEAF_ENERGY_MULT per exposure point,
//     everything else NONLEAF_ENERGY_MULT — tissue differentiation, not a
//     complexity bounty.
//  4. STARVATION IS THE ONLY DEATH. Income minus UPKEEP_PER_CELL × cells
//     goes into a live bank. Bank below zero → shed the DEEPEST expendable
//     unit (a leaf's outer blade stage, then its inner stage, then a petal
//     ring, then a terminal cell) and clear the debt. Keep shedding on
//     following ticks; when the root itself is shed, the plant dies. An
//     overtopped plant RETREATS before it dies, and regrows if the light
//     comes back.
//  5. SEEDS COST REAL ENERGY. SEED_ENERGY_COST out of the bank, of which
//     SEED_ENDOWMENT rides along inside the seed. Reproduction is an
//     investment in a child that starts with a working capital reserve.
//
// DELETED FROM -4 (all of it existed to compensate for all-or-nothing
// unfolding): the maturity gate · immortalize() · the frozen static
// energyRate and emission metronome · LIFESPAN_PER_GENE and the death
// clock · decay-of-the-fruitless · completion detection and failStreak ·
// the standing-genome uniqueness registry · GERM_CLEAR_RADIUS as a knob
// (germination now needs exactly the outline gap: an empty cell with an
// empty 8-halo, which is the minimum a seedling needs to be legal) ·
// Plant.fail() and the whole plantFails statistic.
//
// KEPT VERBATIM FROM -4: the triplebit genome + organ genes (8 = LEAF,
// 9 = FLOWER), FORCE_SEED_STALK, symmetric amputating mutation, P_CLONE,
// the aestheedlings two-stage teardrop, the 8-ring bloom, the organ-halo
// legibility rule, the palette, the camera, the founder genome.
//
// KNOBS ARE LIVE NOW. In -4 every constant was baked in at immortalization
// so a knob had to restart the run. Here income, upkeep, and every cost
// are read fresh each tick, so hotkeys apply to the STANDING world: press
// K a few times and watch a drought roll through as plants shed from the
// tips inward. Press 1 to restart on the same seed when you want the
// controlled comparison instead.
//
// Run modes:
//   browser:  evo-engine-millefleur-5.html
//   headless: node evo-engine-millefleur-5.js [seed] [maxTicks] [cols] [rows] [pClone]

const IS_BROWSER = typeof window !== "undefined";

const GENE_LEAF = 8;
const GENE_FLOWER = 9;

const CONSTANTS = {
  SCALE_SIZE: 4,
  RNG_SEED: 14, // headless default; browser randomizes unless ?seed=
  NUM_STARTER_SEEDS: 1, // always a single founder; everything descends by mutation
  AIRBORNE_STEPS: 64, // seed flight length — longer = farther dispersal (s/S)

  // --- heredity (unchanged from -4) ---
  P_CLONE: 0.5, // P(seed is an exact copy); the rest carry >= 1 mutation
  EXTRA_MUTATION_PROB: 0.35, // P(one more mutation) — geometric tail
  P_ORGANIFY: 0.5, // P(a mutation landing on a bare twig makes it an organ)

  // --- live economy ---
  ABSORB_COEFF: 0.02, // energy per graduated exposure point per tick (e/E)
  ABSORB_TABLE: [0, 0.5, 1.0, 1.5, 1.5], // value by OPEN cardinal sides
  LEAF_ENERGY_MULT: 2.0, // leaf tissue's exposure is worth this much (l/L).
  // NOT a complexity bounty — without it a teardrop earns exactly what an
  // equal-length stem chain earns and foliage never evolves. This is the
  // one line that makes "leaf" a functional category rather than a shape.
  NONLEAF_ENERGY_MULT: 0.6, // stems, petals, centers. Tuned so a straight
  // stem cell (2 open sides) is a hair above upkeep on its own: stems are
  // scaffolding that roughly pays its own way and profits only by carrying
  // leaves out into open space. A buried stem is a net loss and gets shed.
  UPKEEP_PER_CELL: 0.01, // per living cell per tick (k/K). THE central
  // knob: it sets how hard shade has to bite before a plant retreats.

  // --- construction ---
  CELL_BUILD_COST: 0.5, // per cell placed (b/B); a leaf stage is 3×, a
  // petal ring 8×
  GROWTH_RESERVE: 2, // never spend down to zero on growth — without a
  // buffer a marginal plant flutters (build a tip, go negative, shed it,
  // repeat) instead of settling
  P_SKELETON_FIRST: 0.8, // bias site choice toward skeleton over organs, so
  // the designed form usually builds in the -4 order (stems, then leaves
  // and blooms) — but a plant whose skeleton is permanently blocked still
  // gets its organs up instead of deadlocking
  SHED_COOLDOWN: 300, // after shedding, no growth for this long. Makes
  // retreat sticky rather than jittery, and is what produces gnarled forms

  // --- reproduction ---
  SEED_ENERGY_COST: 40, // paid out of the bank per seed (w/W). Absolute
  // pacing sets density; the RATIO between body plans sets selection
  SEED_ENDOWMENT: 8, // energy the seed carries to its landing site, so a
  // seedling can build its first leaf before it has to earn anything
  ENERGY_CAP_MULT: 3, // bank ceiling = SEED_ENERGY_COST × this

  // --- presentation ---
  FADE_TICKS: 90, // fade-out of a plant that lost its last cell
  DIM_ALPHA: 0.55, // a plant inside its shed cooldown renders faint — the
  // visible signal for "this one is losing ground"
  ENABLE_RANDOM_FACING: false, // every plant germinates facing UP
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
// family-colored neighborhoods.
function plantColorFromGenome(genome) {
  let sum = 0;
  for (let i = 0; i < genome.length; i++) sum += genome[i] + (i % 7);
  return hsvToRgbInt((sum * 0.013) % 1, 0.8, 0.95);
}

// Leaves: same soft-hash idea, confined to a green band so foliage reads as
// foliage; the full-spectrum lineage color lives in the petals.
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

// One point mutation (unchanged from -4). Position biased toward newer
// genes (max of two draws); gene 0 is FORCE_SEED_STALK — pinned to 0b010
// and exempt, so the first cell above the seed always grows straight up.
// Organ-aware ops:
// - on an organ gene: flip type (leaf<->flower) or demote to a bare twig;
// - on a bare twig (gene 0): P_ORGANIFY makes it a leaf/flower, else the
//   normal slot-bit mutation (twigs are the stepping-stone to organs);
// - on a stem: the classic slot-bit flip. A bit-clear AMPUTATES the whole
//   subtree beneath it — growth adds one gene at a time, shedding drops a
//   branch at a time, so there is no length ratchet.
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
      rand() < 0.5
        ? targetNode.geneBits === GENE_LEAF
          ? GENE_FLOWER
          : GENE_LEAF
        : 0;
    return encodeTreeToGenome(root);
  }
  if (targetNode.geneBits === 0 && rand() < CONSTANTS.P_ORGANIFY) {
    targetNode.geneBits = rand() < 0.5 ? GENE_LEAF : GENE_FLOWER;
    return encodeTreeToGenome(root);
  }
  const bitIdx = randInt(3);
  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;
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
let plants = [], // every living plant — no growing/immortal split any more
  fading = [], // plants that lost their last cell, mid fade-out
  travelingSeeds = [];
let pClone = CONSTANTS.P_CLONE;
let frame = 0,
  idCounter = 0;

const stats = {
  germinated: 0,
  seedDeaths: 0, // seeds that landed somewhere they could not germinate
  clones: 0,
  blooms: 0,
  emitted: 0,
  sheds: 0, // die-back events
  deaths: 0, // plants that shed their last cell
  ages: [], // lifespan of each dead plant, in death order
  deathCells: [], // peak-ish size of each dead plant
  deathGenomeLens: [],
};

// Founder: seed stalk, two side leaves, a flower on top. Pre-order:
// root(010) -> stem(111){ left=LEAF, fwd=stem chain(010 x4){ fwd=FLOWER },
// right=LEAF }. Four stems between the branch point and the flower so the
// petal ring's halo clears the teardrop blades. 29 cells fully built.
const DEFAULT_GENOME = new Uint8Array([
  0b010,
  0b111,
  GENE_LEAF,
  0b010,
  0b010,
  0b010,
  0b010,
  GENE_FLOWER,
  GENE_LEAF,
]);

// ---------------------------------------------------------------- Exposure
// Live income, maintained incrementally. Every occupied cell tracks how
// many of its four cardinal sides are open; each plant keeps the running
// sums of ABSORB_TABLE[openSides] for its leaf tissue and its other
// tissue. Placing or removing one cell touches at most 5 cells, so income
// is O(1) per plant per tick no matter how big the world gets.
//
// The two sums stay UNWEIGHTED so LEAF_ENERGY_MULT / NONLEAF_ENERGY_MULT /
// ABSORB_COEFF can all be live hotkeys — nothing is baked in anywhere.
//
// Out-of-bounds does not count as open (matching -4), so the world edge is
// mildly poor ground.
function bumpExposure(c, sign) {
  const v = sign * CONSTANTS.ABSORB_TABLE[c.openSides];
  if (c.isLeafTissue) c.plant.expLeaf += v;
  else c.plant.expOther += v;
}

function attachCell(c) {
  const x = c.x,
    y = c.y;
  let open = 0;
  const nbs = [];
  if (y > 0) {
    const n = grid[(y - 1) * cols + x];
    if (n) nbs.push(n);
    else open++;
  }
  if (y < rows - 1) {
    const n = grid[(y + 1) * cols + x];
    if (n) nbs.push(n);
    else open++;
  }
  if (x > 0) {
    const n = grid[y * cols + x - 1];
    if (n) nbs.push(n);
    else open++;
  }
  if (x < cols - 1) {
    const n = grid[y * cols + x + 1];
    if (n) nbs.push(n);
    else open++;
  }
  c.openSides = open;
  grid[y * cols + x] = c;
  bumpExposure(c, 1);
  for (let i = 0; i < nbs.length; i++) {
    const n = nbs[i];
    bumpExposure(n, -1);
    n.openSides--;
    bumpExposure(n, 1);
  }
}

function detachCell(c) {
  const x = c.x,
    y = c.y,
    gi = y * cols + x;
  if (grid[gi] !== c) return;
  grid[gi] = null;
  bumpExposure(c, -1);
  if (y > 0) {
    const n = grid[(y - 1) * cols + x];
    if (n) {
      bumpExposure(n, -1);
      n.openSides++;
      bumpExposure(n, 1);
    }
  }
  if (y < rows - 1) {
    const n = grid[(y + 1) * cols + x];
    if (n) {
      bumpExposure(n, -1);
      n.openSides++;
      bumpExposure(n, 1);
    }
  }
  if (x > 0) {
    const n = grid[y * cols + x - 1];
    if (n) {
      bumpExposure(n, -1);
      n.openSides++;
      bumpExposure(n, 1);
    }
  }
  if (x < cols - 1) {
    const n = grid[y * cols + x + 1];
    if (n) {
      bumpExposure(n, -1);
      n.openSides++;
      bumpExposure(n, 1);
    }
  }
  if (c.sprite) {
    cellPool.release(c.sprite);
    c.sprite = null;
  }
  if (c.node) c.node.cell = null;
}

// ---------------------------------------------------------------- Cells
// Roles come straight from the gene value: 8 = leaf anchor, 9 = flower
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
    this.depth = parent ? parent.depth + 1 : 0;
    const geneBits = node.geneBits;
    this.role =
      geneBits === GENE_FLOWER
        ? ROLE_FLOWER
        : geneBits === GENE_LEAF
        ? ROLE_LEAF
        : ROLE_STEM;
    this.isLeafTissue = this.role === ROLE_LEAF;
    this.organCells = []; // blades (leaf anchor) or petals (flower center)
    this.leafStage = 0; // leaf anchors: how many 3-cell blade stages are up
    this.bloomed = false; // flower centers: is the petal ring up
    this.openSides = 0;
    this.sprite = null;
    node.cell = this;
    plant.cells.push(this);
    if (this.role === ROLE_FLOWER) plant.flowerCells.push(this);
    else if (this.role === ROLE_LEAF) plant.leafAnchors.push(this);
    attachCell(this);
    if (IS_BROWSER && cellPool) {
      // the root keeps the seed's cream so the cell each plant grew from
      // stays visible in the standing form
      const tint = isRoot
        ? CONSTANTS.COLORS.SEED_DOT
        : this.role === ROLE_FLOWER
        ? CONSTANTS.COLORS.FLOWER_CENTER
        : this.role === ROLE_LEAF
        ? plant.leafColor
        : CONSTANTS.COLORS.STEM;
      this.sprite = cellPool.acquire(
        x,
        y,
        tint,
        plant.starving ? CONSTANTS.DIM_ALPHA : 1
      );
    }
  }
}

// Organ tissue (petals, leaf blades): plant matter outside the genome tree
// — no node, no growth sites, no children. Solid, grid-blocking tissue like
// any cell. `organOwner` is the anchor/center cell it belongs to; the
// organ-halo rule uses it to tell same-organ contact (fine) from
// organ-organ fusion (illegible, forbidden), and die-back uses it to shed
// a whole blade stage or petal ring as one unit.
class OrganCell {
  constructor(x, y, plant, tint, isLeaf, owner, stage) {
    this.x = x;
    this.y = y;
    this.plant = plant;
    this.node = null;
    this.parent = null;
    this.organOwner = owner;
    this.stage = stage;
    this.isLeafTissue = isLeaf;
    this.depth = owner.depth + 1 + stage;
    this.openSides = 0;
    this.sprite = null;
    plant.cells.push(this);
    owner.organCells.push(this);
    attachCell(this);
    if (IS_BROWSER && cellPool)
      this.sprite = cellPool.acquire(
        x,
        y,
        tint,
        plant.starving ? CONSTANTS.DIM_ALPHA : 1
      );
  }
}

// ---------------------------------------------------------------- Plants
const SITE_CELL = 0,
  SITE_LEAF = 1,
  SITE_BLOOM = 2;

class Plant {
  constructor(genome, x, y, parentPlant, endowment) {
    this.id = idCounter++;
    this.genome = genome;
    this.key = genomeKey(genome);
    this.color = plantColorFromGenome(genome);
    this.leafColor = leafColorFromGenome(genome);
    this.rootNode = decodeGenomeToTree(genome);
    this.cells = [];
    this.flowerCells = [];
    this.leafAnchors = [];
    this.expLeaf = 0; // running sums of ABSORB_TABLE[openSides],
    this.expOther = 0; // unweighted so the multipliers stay live
    this.energy = endowment === undefined ? CONSTANTS.SEED_ENDOWMENT : endowment;
    this.sites = null; // growth-site cache; null = rebuild on next use
    this.starving = false;
    this.lastShedTick = -1e9;
    this.dead = false;
    this.born = frame;
    this.peakCells = 1;
    this.parentPlant = parentPlant || null;
    this.directSuccesses = 0;
    // facing 0 = forward is UP: the seed is the bottom of the form
    const facing = CONSTANTS.ENABLE_RANDOM_FACING ? randInt(4) : 0;
    this.root = new Cell(x, y, this, this.rootNode, null, facing, true);
  }

  // ---- income, upkeep, and the one decision per tick -------------------
  step() {
    const C = CONSTANTS;
    const income =
      (this.expLeaf * C.LEAF_ENERGY_MULT +
        this.expOther * C.NONLEAF_ENERGY_MULT) *
      C.ABSORB_COEFF;
    this.energy += income - C.UPKEEP_PER_CELL * this.cells.length;
    if (this.energy < 0) {
      this.shedOne();
      return;
    }
    const cap = C.SEED_ENERGY_COST * C.ENERGY_CAP_MULT;
    if (this.energy > cap) this.energy = cap;
    if (this.starving && frame - this.lastShedTick >= C.SHED_COOLDOWN)
      this.setStarving(false);
    if (!this.starving) this.tryGrow();
    this.trySeed();
    if (this.cells.length > this.peakCells) this.peakCells = this.cells.length;
  }

  // ---- growth sites ----------------------------------------------------
  // Derived from the genome tree + organ state, so it is always correct
  // after a die-back: shedding nulls node.cell, which makes that site
  // reappear here, which is how a plant regrows a branch it lost.
  getSites() {
    if (this.sites) return this.sites;
    const s = [];
    const cells = this.cells;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.organOwner !== undefined) continue; // blade/petal: never a site
      if (c.role === ROLE_LEAF) {
        if (c.leafStage < 2) s.push({ kind: SITE_LEAF, cell: c });
        continue;
      }
      if (c.role === ROLE_FLOWER) {
        if (!c.bloomed) s.push({ kind: SITE_BLOOM, cell: c });
        continue;
      }
      const node = c.node;
      if (!node) continue;
      for (let slot = 0; slot < 3; slot++) {
        const ch = node.children[slot];
        if (ch && !ch.cell) s.push({ kind: SITE_CELL, node, slot });
      }
    }
    this.sites = s;
    return s;
  }

  // One growth attempt per tick. A blocked attempt costs NOTHING and is
  // simply retried on a later tick — that is the whole design.
  tryGrow() {
    const C = CONSTANTS;
    const sites = this.getSites();
    if (sites.length === 0) return;
    // usually build skeleton before organs (the -4 order, without a gate);
    // fall through to the full list so a blocked skeleton never deadlocks
    let pick = null;
    if (rand() < C.P_SKELETON_FIRST) {
      let n = 0;
      for (let i = 0; i < sites.length; i++)
        if (sites[i].kind === SITE_CELL) n++;
      if (n > 0) {
        let k = randInt(n);
        for (let i = 0; i < sites.length; i++) {
          if (sites[i].kind !== SITE_CELL) continue;
          if (k-- === 0) {
            pick = sites[i];
            break;
          }
        }
      }
    }
    if (!pick) pick = sites[randInt(sites.length)];
    const B = C.CELL_BUILD_COST;
    if (pick.kind === SITE_CELL) {
      if (this.energy < B + C.GROWTH_RESERVE) return;
      if (this.placeCell(pick.node, pick.slot)) this.energy -= B;
    } else if (pick.kind === SITE_LEAF) {
      if (this.energy < 3 * B + C.GROWTH_RESERVE) return;
      if (this.unfoldLeafStage(pick.cell)) this.energy -= 3 * B;
    } else {
      if (this.energy < 8 * B + C.GROWTH_RESERVE) return;
      if (this.bloom(pick.cell)) this.energy -= 8 * B;
    }
  }

  // Skeleton placement. Every rule is -4's, unchanged; the only difference
  // is that a violation returns false instead of killing the plant.
  //
  // Self-avoidance: the new cell may touch (8-way) only same-plant cells
  // that are topologically NEAR it — its parent, its grandparent (inside of
  // a turn), or a sibling (crotch of a fork). Contact with any farther
  // same-plant cell means a branch has looped back or is running alongside
  // itself: that is the blob. Contact with another plant violates the
  // inter-plant outline gap. Contact with this plant's own organ tissue is
  // the mush Greg reverted the overlap build over — also refused. (That
  // last one is new only in that organs can now exist while the skeleton is
  // still growing; the rule itself is the same one the blades obey.)
  placeCell(node, slot) {
    const cell = node.cell;
    if (!cell) return false;
    const fidx = cell.facingIdx * 3 + slot;
    const nx = cell.x + DIR_DX[fidx];
    const ny = cell.y + DIR_DY[fidx];
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
    if (grid[ny * cols + nx]) return false;
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
        if (nb.plant !== this) return false;
        if (nb.organOwner !== undefined) return false;
        if (nb !== parentCell && nb !== grandCell && nb.parent !== parentCell)
          return false;
      }
    }
    const childNode = node.children[slot];
    const newFacing = ROTATIONS_FLAT[cell.facingIdx * 3 + slot];
    new Cell(nx, ny, this, childNode, cell, newFacing, false);
    this.sites = null;
    return true;
  }

  // Aestheedlings teardrop: anchor L plus two 3-cell stages along U+D,
  // where U = the stem's forward and D = the slot direction (a forward-slot
  // leaf leans deterministically left). Stage cells must be in bounds,
  // empty, and clear of OTHER plants' 8-way halo (the outline gap). Within
  // the plant, blades may hug the SKELETON (the blade runs up alongside its
  // stem by design) and their own leaf's tissue, but never another organ's
  // tissue — leaf-leaf and leaf-petal fusion read as mush. All-or-nothing
  // per stage; a refused stage is retried later, not fatal.
  unfoldLeafStage(L) {
    const P = L.parent;
    if (!P) return false;
    const ux = FACING_DX[P.facingIdx],
      uy = FACING_DY[P.facingIdx];
    let dx = L.x - P.x,
      dy = L.y - P.y;
    if (dx === ux && dy === uy) {
      dx = DIR_DX[P.facingIdx * 3];
      dy = DIR_DY[P.facingIdx * 3];
    }
    const stage = L.leafStage;
    const bx = stage === 0 ? L.x : L.x + ux + dx;
    const by = stage === 0 ? L.y : L.y + uy + dy;
    const targets = [
      bx + ux,
      by + uy,
      bx + dx,
      by + dy,
      bx + ux + dx,
      by + uy + dy,
    ];
    for (let i = 0; i < 6; i += 2) {
      const px = targets[i],
        py = targets[i + 1];
      if (px < 0 || px >= cols || py < 0 || py >= rows) return false;
      if (grid[py * cols + px]) return false;
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          const mx = px + ddx,
            my = py + ddy;
          if (mx < 0 || mx >= cols || my < 0 || my >= rows) continue;
          const nb = grid[my * cols + mx];
          if (!nb) continue;
          if (nb.plant !== this) return false;
          if (nb.organOwner !== undefined && nb.organOwner !== L) return false;
        }
      }
    }
    for (let i = 0; i < 6; i += 2)
      new OrganCell(
        targets[i],
        targets[i + 1],
        this,
        this.leafColor,
        true,
        L,
        stage
      );
    L.leafStage++;
    this.sites = null;
    return true;
  }

  // All-or-nothing petal ring: every 8-neighbor slot around the flower cell
  // (minus the stem attachment) must be claimable — in bounds, empty, and
  // with an empty 8-way halo. The ONLY permitted halo contacts are the
  // geometrically necessary ones: the flower center, its stem, and that
  // stem's parent (the ring's bottom corners graze it diagonally). Anything
  // else — other plants, own branches, leaf blades, other rings — refuses
  // the bloom, so every flower reads as a distinct medallion.
  bloom(F) {
    const P = F.parent;
    const G = P ? P.parent : null;
    const targets = [];
    for (let ddx = -1; ddx <= 1; ddx++) {
      for (let ddy = -1; ddy <= 1; ddy++) {
        if (ddx === 0 && ddy === 0) continue;
        const px = F.x + ddx,
          py = F.y + ddy;
        if (P && px === P.x && py === P.y) continue; // stem attachment
        if (px < 0 || px >= cols || py < 0 || py >= rows) return false;
        if (grid[py * cols + px]) return false;
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
          if (nb && nb !== F && nb !== P && nb !== G) return false;
        }
      }
    }
    for (let i = 0; i < targets.length; i += 2)
      new OrganCell(targets[i], targets[i + 1], this, this.color, false, F, 0);
    F.bloomed = true;
    this.sites = null;
    stats.blooms++;
    return true;
  }

  // ---- reproduction ----------------------------------------------------
  trySeed() {
    const C = CONSTANTS;
    if (this.energy < C.SEED_ENERGY_COST) return;
    let n = 0;
    for (let i = 0; i < this.flowerCells.length; i++)
      if (this.flowerCells[i].bloomed) n++;
    if (n === 0) return; // flowerless or unbloomed: sterile, not dying
    let k = randInt(n),
      F = null;
    for (let i = 0; i < this.flowerCells.length; i++) {
      if (!this.flowerCells[i].bloomed) continue;
      if (k-- === 0) {
        F = this.flowerCells[i];
        break;
      }
    }
    this.energy -= C.SEED_ENERGY_COST;
    emitSeed(this, F, makeChildGenome(this.genome));
  }

  // ---- die-back --------------------------------------------------------
  // Shed exactly one unit, deepest first, then clear the debt. Units, in
  // the order depth naturally produces them: a leaf's outer blade stage,
  // then its inner stage, then a petal ring, then a terminal cell. So a
  // shaded plant drops its foliage and its bloom before it loses structure,
  // and only dies when the root itself is the last thing standing.
  shedOne() {
    let bestDepth = -1,
      bestKind = 0,
      bestCell = null;
    const cells = this.cells;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.organOwner !== undefined) continue; // shed via its owner
      let d = -1,
        kind = 0;
      if (c.role === ROLE_LEAF && c.leafStage > 0) {
        d = c.depth + c.leafStage; // outermost stage sheds first
        kind = 1;
      } else if (c.role === ROLE_FLOWER && c.bloomed) {
        d = c.depth + 1;
        kind = 2;
      } else if (this.isTerminal(c)) {
        d = c.depth;
        kind = 3;
      }
      if (d > bestDepth) {
        bestDepth = d;
        bestKind = kind;
        bestCell = c;
      }
    }
    if (!bestCell) {
      // unreachable in a tree (the deepest cell is always terminal), but
      // never leave a plant stuck in permanent debt
      this.die();
      return;
    }
    if (bestKind === 1) {
      const stage = bestCell.leafStage - 1;
      this.removeOrganTissue(bestCell, stage);
      bestCell.leafStage = stage;
    } else if (bestKind === 2) {
      this.removeOrganTissue(bestCell, -1);
      bestCell.bloomed = false;
    } else {
      const wasRoot = bestCell.isRoot;
      this.removeCell(bestCell);
      if (wasRoot || this.cells.length === 0) {
        this.die();
        return;
      }
    }
    this.energy = 0; // the debt is paid by the loss, not carried forward
    this.sites = null;
    this.lastShedTick = frame;
    this.setStarving(true);
    stats.sheds++;
  }

  // stage -1 = all of it (a petal ring); otherwise just that blade stage
  removeOrganTissue(owner, stage) {
    const keep = [];
    for (let i = 0; i < owner.organCells.length; i++) {
      const oc = owner.organCells[i];
      if (stage === -1 || oc.stage === stage) {
        detachCell(oc);
        oc.removed = true;
      } else keep.push(oc);
    }
    owner.organCells = keep;
    this.compactCells();
  }

  removeCell(c) {
    detachCell(c);
    c.removed = true;
    this.compactCells();
  }

  compactCells() {
    const out = [];
    for (let i = 0; i < this.cells.length; i++)
      if (!this.cells[i].removed) out.push(this.cells[i]);
    this.cells = out;
    const f = [];
    for (let i = 0; i < this.flowerCells.length; i++)
      if (!this.flowerCells[i].removed) f.push(this.flowerCells[i]);
    this.flowerCells = f;
    const l = [];
    for (let i = 0; i < this.leafAnchors.length; i++)
      if (!this.leafAnchors[i].removed) l.push(this.leafAnchors[i]);
    this.leafAnchors = l;
  }

  isTerminal(c) {
    if (c.organCells.length > 0) return false;
    const node = c.node;
    if (!node) return false;
    for (let slot = 0; slot < 3; slot++) {
      const ch = node.children[slot];
      if (ch && ch.cell) return false;
    }
    return true;
  }

  setStarving(v) {
    if (this.starving === v) return;
    this.starving = v;
    if (!IS_BROWSER) return;
    const a = v ? CONSTANTS.DIM_ALPHA : 1;
    for (let i = 0; i < this.cells.length; i++)
      if (this.cells[i].sprite) this.cells[i].sprite.alpha = a;
  }

  die() {
    this.dead = true;
    stats.deaths++;
    stats.ages.push(frame - this.born);
    stats.deathCells.push(this.peakCells);
    stats.deathGenomeLens.push(this.genome.length);
    if (this.cells.length === 0) return; // nothing left to fade
    this.fadeStart = frame;
    fading.push(this);
  }
}

function removeAllMatter(plant) {
  for (let i = 0; i < plant.cells.length; i++) detachCell(plant.cells[i]);
  plant.cells = [];
}

// ---------------------------------------------------------------- Seeds
// Clone with pClone, else always >= 1 mutation with geometric extras.
function makeChildGenome(parentGenome) {
  if (rand() < pClone) {
    stats.clones++;
    return new Uint8Array(parentGenome);
  }
  let g = mutateGenome(parentGenome);
  while (rand() < CONSTANTS.EXTRA_MUTATION_PROB) g = mutateGenome(g);
  return g;
}

function emitSeed(parent, flowerCell, genome) {
  const ts = {
    x: flowerCell.x,
    y: flowerCell.y,
    steps: 0,
    parentPlant: parent,
    genome: genome,
    sprite: null,
    dead: false,
  };
  if (IS_BROWSER && CONSTANTS.SHOW_TRAVELING_SEEDS)
    ts.sprite = seedPool.acquire(ts.x, ts.y, CONSTANTS.COLORS.SEED_DOT, 0.45);
  travelingSeeds.push(ts);
  stats.emitted++;
}

// Germination needs exactly what a legal one-cell plant needs: an empty
// cell with an empty 8-halo (the inter-plant outline gap). Nothing more —
// a bigger clearance requirement is what silently makes space-packing the
// dominant fitness criterion, which is the thing this build exists to undo.
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

function stepSeed(ts) {
  if (ts.steps >= CONSTANTS.AIRBORNE_STEPS) {
    if (germSpotClear(ts.x, ts.y)) {
      plants.push(
        new Plant(ts.genome, ts.x, ts.y, ts.parentPlant, CONSTANTS.SEED_ENDOWMENT)
      );
      stats.germinated++;
      if (ts.parentPlant) ts.parentPlant.directSuccesses++;
    } else stats.seedDeaths++;
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

// ---------------------------------------------------------------- Setup
function initializeStarters() {
  const base = canonical(DEFAULT_GENOME);
  for (let i = 0; i < CONSTANTS.NUM_STARTER_SEEDS; i++) {
    let genome = base;
    for (let m = 0; m < i; m++) genome = mutateGenome(genome);
    let placed = false;
    if (i === 0) {
      const cx = (cols / 2) | 0,
        cy = (rows / 2) | 0;
      if (germSpotClear(cx, cy)) {
        plants.push(new Plant(genome, cx, cy, null, CONSTANTS.SEED_ENDOWMENT));
        placed = true;
      }
    }
    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const x = randInt(cols),
        y = randInt(rows);
      if (!germSpotClear(x, y)) continue;
      plants.push(new Plant(genome, x, y, null, CONSTANTS.SEED_ENDOWMENT));
      placed = true;
    }
  }
}

// ---------------------------------------------------------------- Tick
function advanceTick() {
  frame++;

  // 1. every plant: income, upkeep, then one growth attempt / one shed
  for (let i = plants.length - 1; i >= 0; i--) {
    const p = plants[i];
    p.step();
    if (p.dead) {
      plants[i] = plants[plants.length - 1];
      plants.pop();
    }
  }

  // 2. traveling seeds
  for (let i = travelingSeeds.length - 1; i >= 0; i--) {
    const ts = travelingSeeds[i];
    stepSeed(ts);
    if (ts.dead) {
      if (ts.sprite) seedPool.release(ts.sprite);
      travelingSeeds[i] = travelingSeeds[travelingSeeds.length - 1];
      travelingSeeds.pop();
    }
  }

  // 3. the last remains of dead plants fade out (still blocking space)
  for (let i = fading.length - 1; i >= 0; i--) {
    const pl = fading[i];
    const t = (frame - pl.fadeStart) / CONSTANTS.FADE_TICKS;
    if (t >= 1) {
      removeAllMatter(pl);
      fading[i] = fading[fading.length - 1];
      fading.pop();
    } else if (IS_BROWSER) {
      const a = 1 - t;
      for (let j = 0; j < pl.cells.length; j++)
        if (pl.cells[j].sprite) pl.cells[j].sprite.alpha = a;
    }
  }

  // 4. safety: total wipeout — reseed
  if (plants.length === 0 && travelingSeeds.length === 0) initializeStarters();
}

// ---------------------------------------------------------------- Reporting
function occupiedCells() {
  let n = 0;
  for (let i = 0; i < plants.length; i++) n += plants[i].cells.length;
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

// THE headline metric for this build. If development is now contingent on
// local conditions, then two plants with an IDENTICAL genome should end up
// materially different sizes — big in an early gap, stunted in a crowd.
// Returns the mean within-genome coefficient of variation of cell count
// across every genome standing in >= 2 copies, plus the population CV for
// comparison. Near zero = the thesis failed and development is still
// effectively deterministic.
function cloneDivergence() {
  const byKey = new Map();
  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    let a = byKey.get(p.key);
    if (!a) byKey.set(p.key, (a = []));
    a.push(p.cells.length);
  }
  let cvSum = 0,
    groups = 0,
    all = [];
  for (const a of byKey.values()) {
    for (let i = 0; i < a.length; i++) all.push(a[i]);
    if (a.length < 2) continue;
    let m = 0;
    for (let i = 0; i < a.length; i++) m += a[i];
    m /= a.length;
    if (m <= 0) continue;
    let v = 0;
    for (let i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m);
    cvSum += Math.sqrt(v / a.length) / m;
    groups++;
  }
  let pm = 0;
  for (let i = 0; i < all.length; i++) pm += all[i];
  pm /= all.length || 1;
  let pv = 0;
  for (let i = 0; i < all.length; i++) pv += (all[i] - pm) * (all[i] - pm);
  const popCv = pm > 0 ? Math.sqrt(pv / (all.length || 1)) / pm : 0;
  return {
    withinCv: groups ? cvSum / groups : 0,
    popCv,
    groups,
    distinct: byKey.size,
  };
}

function sizeHistogram() {
  const edges = [1, 5, 10, 20, 40, 80, 160];
  const bins = new Array(edges.length + 1).fill(0);
  for (let i = 0; i < plants.length; i++) {
    const n = plants[i].cells.length;
    let b = edges.length;
    for (let e = 0; e < edges.length; e++)
      if (n < edges[e]) {
        b = e;
        break;
      }
    bins[b]++;
  }
  const labels = ["<1", "1-4", "5-9", "10-19", "20-39", "40-79", "80-159", "160+"];
  const out = [];
  for (let i = 1; i < bins.length; i++)
    if (bins[i]) out.push(`${labels[i]}:${bins[i]}`);
  return out.join(" ");
}

// ================================================================ HEADLESS
if (!IS_BROWSER) {
  const args = process.argv.slice(2);
  const seed = parseInt(args[0] || "14", 10);
  const maxTicks = parseInt(args[1] || "200000", 10);
  cols = parseInt(args[2] || "240", 10);
  rows = parseInt(args[3] || "135", 10);
  if (args[4]) pClone = parseFloat(args[4]);
  runSeed = seed;
  rngState = seed >>> 0;
  grid = new Array(cols * rows).fill(null);

  console.log(
    `millefleur-5 headless: seed=${seed} maxTicks=${maxTicks} ` +
      `world=${cols}x${rows} pClone=${pClone}`
  );
  const t0 = Date.now();
  initializeStarters();
  while (frame < maxTicks) {
    advanceTick();
    if (frame % 20000 === 0) {
      const fill = ((occupiedCells() / (cols * rows)) * 100).toFixed(1);
      let cellSum = 0;
      for (let i = 0; i < plants.length; i++) cellSum += plants[i].cells.length;
      console.log(
        `t=${frame} plants=${plants.length} ` +
          `meanCells=${(cellSum / (plants.length || 1)).toFixed(1)} ` +
          `fill=${fill}% emitted=${stats.emitted} sheds=${stats.sheds} ` +
          `deaths=${stats.deaths}`
      );
    }
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const fill = ((occupiedCells() / (cols * rows)) * 100).toFixed(1);
  console.log(`\n=== TICK LIMIT ===`);
  console.log(`ticks=${frame} (${elapsed}s) plants=${plants.length} fill=${fill}%`);
  console.log(
    `germinated=${stats.germinated} seedDeaths=${stats.seedDeaths} ` +
      `emitted=${stats.emitted} clones=${stats.clones} blooms=${stats.blooms} ` +
      `sheds=${stats.sheds} deaths=${stats.deaths}`
  );

  let cellSum = 0,
    leafSum = 0,
    flowerSum = 0,
    bloomedSum = 0,
    energySum = 0,
    genomeSum = 0,
    starving = 0,
    sterile = 0,
    biggest = 0;
  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    cellSum += p.cells.length;
    leafSum += p.leafAnchors.length;
    flowerSum += p.flowerCells.length;
    genomeSum += p.genome.length;
    energySum += p.energy;
    if (p.starving) starving++;
    let b = 0;
    for (let j = 0; j < p.flowerCells.length; j++)
      if (p.flowerCells[j].bloomed) b++;
    bloomedSum += b;
    if (b === 0) sterile++;
    if (p.cells.length > biggest) biggest = p.cells.length;
  }
  const n = plants.length || 1;
  console.log(
    `standing: cells/plant=${(cellSum / n).toFixed(1)} (max ${biggest}) ` +
      `leaves/plant=${(leafSum / n).toFixed(2)} ` +
      `flowers/plant=${(flowerSum / n).toFixed(2)} ` +
      `(bloomed ${(bloomedSum / n).toFixed(2)}) ` +
      `genomeLen=${(genomeSum / n).toFixed(1)}`
  );
  console.log(
    `energy/plant=${(energySum / n).toFixed(1)} ` +
      `starving=${((starving / n) * 100).toFixed(0)}% ` +
      `sterile=${((sterile / n) * 100).toFixed(0)}%`
  );
  console.log(`size histogram: ${sizeHistogram()}`);

  const cd = cloneDivergence();
  console.log(
    `CLONE DIVERGENCE: within-genome CV=${cd.withinCv.toFixed(3)} ` +
      `(population CV=${cd.popCv.toFixed(3)}) over ${cd.groups} repeated ` +
      `genomes / ${cd.distinct} distinct`
  );
  const ag = quartileMeans(stats.ages);
  if (ag)
    console.log(
      `age at death (first quartile -> last): ${ag[0].toFixed(0)} -> ${ag[1].toFixed(0)}`
    );
  const fp = quartileMeans(stats.deathCells);
  if (fp)
    console.log(
      `peak size gradient (first quartile -> last): ` +
        `${fp[0].toFixed(1)} -> ${fp[1].toFixed(1)}`
    );
  const gl = quartileMeans(stats.deathGenomeLens);
  if (gl)
    console.log(
      `genome-length gradient (first quartile -> last): ` +
        `${gl[0].toFixed(1)} -> ${gl[1].toFixed(1)}`
    );

  const pass = plants.length > 0 && stats.emitted > 0 && stats.blooms > 0;
  console.log(pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
}

// ================================================================ BROWSER
let app,
  textures = {},
  cellPool = null,
  seedPool = null;
let worldContainer = null;
let dragging = false,
  dragLastX = 0,
  dragLastY = 0;
let paused = false,
  fastForward = true,
  fastForwardFactor = 10;
let fastForwardLevels = [1, 10, 100, 1000],
  fastForwardIndex = 1,
  lastTickTime = 0;
let statusText, knobText;
let uiUpdateCounter = 0;
const UI_UPDATE_INTERVAL = 15;
let urlSeed = null;

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
  if (params.has("clone")) {
    const c = parseFloat(params.get("clone"));
    if (isFinite(c) && c >= 0 && c <= 1) pClone = c;
  }
  if (params.has("scale")) {
    const s = parseInt(params.get("scale"), 10);
    if (isFinite(s) && s >= 1 && s <= 32) CONSTANTS.SCALE_SIZE = s;
  }
  if (params.has("upkeep")) {
    const u = parseFloat(params.get("upkeep"));
    if (isFinite(u) && u >= 0) CONSTANTS.UPKEEP_PER_CELL = u;
  }
  if (params.has("seedcost")) {
    const s = parseFloat(params.get("seedcost"));
    if (isFinite(s) && s > 0) CONSTANTS.SEED_ENERGY_COST = s;
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
  console.log(
    `millefleur-5: seed=${runSeed} world=${cols}x${rows} ` +
      `scale=${CONSTANTS.SCALE_SIZE} pClone=${pClone} ` +
      `(replay with ?seed=${runSeed})`
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
  knobText.y = 78;
  knobText.zIndex = 1000;
  app.stage.addChild(knobText);
  app.stage.sortableChildren = true;

  initializeStarters();

  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", () =>
    app.renderer.resize(window.innerWidth, window.innerHeight)
  );

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

function fitView() {
  const worldW = cols * CONSTANTS.SCALE_SIZE;
  const worldH = rows * CONSTANTS.SCALE_SIZE;
  const s = Math.min(1, app.renderer.width / worldW, app.renderer.height / worldH);
  worldContainer.scale.set(s);
  worldContainer.x = ((app.renderer.width - worldW * s) / 2) | 0;
  worldContainer.y = ((app.renderer.height - worldH * s) / 2) | 0;
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

function abbrev(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return "" + n;
}

function updateUI() {
  const occ = occupiedCells();
  const fill = ((occ / (cols * rows)) * 100).toFixed(1);
  let starving = 0,
    biggest = 0;
  for (let i = 0; i < plants.length; i++) {
    if (plants[i].starving) starving++;
    if (plants[i].cells.length > biggest) biggest = plants[i].cells.length;
  }
  const mean = plants.length ? (occ / plants.length).toFixed(1) : "0";
  statusText.text =
    `Frame: ${abbrev(frame)}  Seed: ${runSeed}` +
    (paused ? "  PAUSED" : "") +
    `\nPlants: ${plants.length}  Cells/plant: ${mean} (max ${biggest})` +
    `  Seeds: ${travelingSeeds.length}` +
    `\nFill: ${fill}%  Starving: ${starving}  Sheds: ${abbrev(stats.sheds)}` +
    `  Deaths: ${abbrev(stats.deaths)}  Emitted: ${abbrev(stats.emitted)}`;
  knobText.text = knobLine() + "\n[live: e/E k/K w/W b/B l/L o/O s/S · 1 restart · 0 new]";
}

function resetSimulation(keepSeed) {
  for (let i = 0; i < plants.length; i++)
    for (let j = 0; j < plants[i].cells.length; j++)
      if (plants[i].cells[j].sprite) cellPool.release(plants[i].cells[j].sprite);
  for (let i = 0; i < fading.length; i++)
    for (let j = 0; j < fading[i].cells.length; j++)
      if (fading[i].cells[j].sprite) cellPool.release(fading[i].cells[j].sprite);
  for (let i = 0; i < travelingSeeds.length; i++)
    if (travelingSeeds[i].sprite) seedPool.release(travelingSeeds[i].sprite);
  plants = [];
  fading = [];
  travelingSeeds = [];
  grid = new Array(cols * rows).fill(null);
  frame = 0;
  idCounter = 0;
  stats.germinated = 0;
  stats.seedDeaths = 0;
  stats.clones = 0;
  stats.blooms = 0;
  stats.emitted = 0;
  stats.sheds = 0;
  stats.deaths = 0;
  stats.ages = [];
  stats.deathCells = [];
  stats.deathGenomeLens = [];
  if (!keepSeed) runSeed = newRunSeed();
  rngState = runSeed >>> 0;
  console.log(`millefleur-5 reset: seed=${runSeed} (replay with ?seed=${runSeed})`);
  initializeStarters();
}

// Knobs are LIVE. Nothing in this build is baked in at construction —
// income, upkeep, and every cost are read from CONSTANTS each tick — so a
// hotkey changes the STANDING world rather than requiring a restart. Push
// K a few times to cause a drought and watch die-back roll through from
// the tips inward; push k to let it rain again and watch the survivors
// regrow into the space the dead left. Key 1 restarts on the same seed
// when you want a controlled before/after instead.
function knob(msg) {
  console.log(`knob t=${frame}: ${msg}`);
}
function knobLine() {
  const C = CONSTANTS;
  return (
    `E(nergy):${C.ABSORB_COEFF} | K(eep):${C.UPKEEP_PER_CELL.toFixed(4)} | ` +
    `W(seed):${C.SEED_ENERGY_COST.toFixed(0)} | B(uild):${C.CELL_BUILD_COST.toFixed(2)} | ` +
    `L(eaf):${C.LEAF_ENERGY_MULT.toFixed(2)} | O(rganify):${C.P_ORGANIFY.toFixed(2)} | ` +
    `S(teps):${C.AIRBORNE_STEPS}`
  );
}

function onKeyDown(e) {
  const C = CONSTANTS;
  if (e.key === " " || e.code === "Space") {
    if (paused) {
      advanceTick();
      syncVisuals();
    }
    e.preventDefault();
  }
  if (e.key === "p" || e.key === "P") paused = !paused;
  if (e.key === "f" || e.key === "F") fastForward = !fastForward;
  if (e.key === "0") resetSimulation(false);
  if (e.key === "1") resetSimulation(true);
  if (e.key === "c" || e.key === "C") fitView();

  // --- live knobs (lowercase down, uppercase up) ---
  // income per exposure point
  if (e.key === "e")
    knob(`ABSORB_COEFF -> ${(C.ABSORB_COEFF = Math.max(0.0025, C.ABSORB_COEFF / 2))}`);
  if (e.key === "E")
    knob(`ABSORB_COEFF -> ${(C.ABSORB_COEFF = Math.min(4, C.ABSORB_COEFF * 2))}`);
  // upkeep — the drought lever
  if (e.key === "k")
    knob(
      `UPKEEP_PER_CELL -> ${(C.UPKEEP_PER_CELL = Math.max(
        0,
        +(C.UPKEEP_PER_CELL / 1.5).toFixed(5)
      ))}`
    );
  if (e.key === "K")
    knob(
      `UPKEEP_PER_CELL -> ${(C.UPKEEP_PER_CELL = Math.min(
        1,
        +(C.UPKEEP_PER_CELL * 1.5).toFixed(5)
      ))}`
    );
  // seed cost — absolute pacing, which sets density
  if (e.key === "w")
    knob(
      `SEED_ENERGY_COST -> ${(C.SEED_ENERGY_COST = Math.max(
        1,
        +(C.SEED_ENERGY_COST / 1.5).toFixed(2)
      ))}`
    );
  if (e.key === "W")
    knob(
      `SEED_ENERGY_COST -> ${(C.SEED_ENERGY_COST = Math.min(
        4000,
        +(C.SEED_ENERGY_COST * 1.5).toFixed(2)
      ))}`
    );
  // construction cost per cell
  if (e.key === "b")
    knob(
      `CELL_BUILD_COST -> ${(C.CELL_BUILD_COST = Math.max(
        0.01,
        +(C.CELL_BUILD_COST / 1.5).toFixed(3)
      ))}`
    );
  if (e.key === "B")
    knob(
      `CELL_BUILD_COST -> ${(C.CELL_BUILD_COST = Math.min(
        64,
        +(C.CELL_BUILD_COST * 1.5).toFixed(3)
      ))}`
    );
  // how much more a leaf earns than anything else
  if (e.key === "l")
    knob(
      `LEAF_ENERGY_MULT -> ${(C.LEAF_ENERGY_MULT = Math.max(
        0.05,
        +(C.LEAF_ENERGY_MULT / 1.5).toFixed(3)
      ))}`
    );
  if (e.key === "L")
    knob(
      `LEAF_ENERGY_MULT -> ${(C.LEAF_ENERGY_MULT = Math.min(
        64,
        +(C.LEAF_ENERGY_MULT * 1.5).toFixed(3)
      ))}`
    );
  // mutation: chance a bare twig becomes an organ
  if (e.key === "o")
    knob(`P_ORGANIFY -> ${(C.P_ORGANIFY = Math.max(0, +(C.P_ORGANIFY - 0.1).toFixed(2)))}`);
  if (e.key === "O")
    knob(`P_ORGANIFY -> ${(C.P_ORGANIFY = Math.min(1, +(C.P_ORGANIFY + 0.1).toFixed(2)))}`);
  // dispersal distance
  if (e.key === "s")
    knob(`AIRBORNE_STEPS -> ${(C.AIRBORNE_STEPS = Math.max(4, C.AIRBORNE_STEPS >> 1))}`);
  if (e.key === "S")
    knob(
      `AIRBORNE_STEPS -> ${(C.AIRBORNE_STEPS = Math.min(4096, C.AIRBORNE_STEPS * 2))}`
    );

  if (e.key === "r" || e.key === "R") {
    const cd = cloneDivergence();
    let cellSum = 0,
      leaf = 0,
      flower = 0,
      starving = 0;
    for (let i = 0; i < plants.length; i++) {
      cellSum += plants[i].cells.length;
      leaf += plants[i].leafAnchors.length;
      flower += plants[i].flowerCells.length;
      if (plants[i].starving) starving++;
    }
    const n = plants.length || 1;
    console.log(
      `seed=${runSeed} t=${frame} plants=${plants.length} ` +
        `cells/plant=${(cellSum / n).toFixed(1)} ` +
        `leaves/plant=${(leaf / n).toFixed(2)} flowers/plant=${(flower / n).toFixed(2)} ` +
        `starving=${starving} sheds=${stats.sheds} deaths=${stats.deaths} ` +
        `| clone divergence within=${cd.withinCv.toFixed(3)} pop=${cd.popCv.toFixed(3)} ` +
        `distinct=${cd.distinct}\n  size histogram: ${sizeHistogram()}`
    );
  }
}

if (IS_BROWSER) {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initBrowser);
  else initBrowser();
}
