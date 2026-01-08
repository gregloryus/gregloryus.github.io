# Generative Art Project Catalog

*Generated: January 6, 2026*
*Last structural scan: January 6, 2026*

This document catalogs all generative art coding projects in this repository, organized by project family with chronological timelines. It's intended to help future development sessions (human or AI) quickly understand what exists and where to find reusable code.

---

## Overview Timeline

```
2020 ──────────────────────────────────────────────────────────────────────
Jun   Jul   Aug   Sep   Oct   Nov   Dec
│     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼
Early p5.js explorations: simple-starburst, kelp-galaxy, center-circle,
cactus-supernova, offset, flower-farming, line-evolution
                         ▲ alternating-spirals
                                        ▲ water series (water-lamp, etc.)

2021 ──────────────────────────────────────────────────────────────────────
Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
│     │     │     │     │     │     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
water-lamp-coral        ▲plantEvo(1-6)  ▲play-water  ▲falling-sand
                                       stonks       tinyrain
                                                         ▲farming-plants
                                                                  ▲elements

2022 ──────────────────────────────────────────────────────────────────────
Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct
│     │     │     │     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
elements-16    Godot sand sim        Rust/macroquad experiments
               ▲spring-fall-sand-garden (28→40)    ▲touch-rain-push

2023 ──────────────────────────────────────────────────────────────────────
May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
│     │     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
pixelplantsim (13→15, june, sf, train)    ▲monochromagic (1-12)
                        auraplants        ▲rbgrps (1-6)  ▲magmasim (1-4)

2024 ──────────────────────────────────────────────────────────────────────
Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
│     │     │     │     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
triplebittrees (Mar)   magmasim (5→15)
pixiching (1→28, Mar-Dec)                              ▲cellspring begins

2025 ──────────────────────────────────────────────────────────────────────
Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
│     │     │     │     │     │     │     │     │     │     │     │
▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
cellspring (1→24)                             absorption (1→18)
sunsweeper (1→11)                                    ▲urn-plants (1→8)
aestheedlings (1→8)    treemap                           ▲rgbfields (1→12)
                                                              ▲simplant (1-11)
```

---

## Overarching Artistic Goals

These goals inform most projects (from the creator's notes):

- **Discrete and legible**: you can follow every step
- **Emergent**: produces unexpected complexity
- **Dramatic**: emotionally resonant rises and falls
- **Ambient**: no choice required, relaxing, unending
- **Evolves**: natural selection via fitness
- **Biophilic**: resembling or reminiscent of plants
- **Dynamic balance**: searches for homeostasis
- **Probabilistic and deterministic**: pseudo-RNG + seed
- **Tapestry aesthetic**: crowded but non-overlapping (like unicorn tapestries)
- **Shapes the environment**: environment encodes history
- **Diverse**: different adaptations for a given environment
- **Local**: particles interact locally only
- **Closed conserved system**: like global weather
- **Self-propagating, cyclical**

---

## Individual Project Profiles

### 1. simplant (Nov–Dec 2025) — *Most Recent*

**Files:** 11 versions + zone brief + design docs
**Tech:** PIXI.js with multi-zone support
**Modified:** Nov 25 → Dec 2, 2025

**What it is:** "Simple plant simulation" using triple-bit genetic encoding with multi-zone vertical stacking for parallel evolution experiments.

**Key documentation:**
- `simplant-brief.md` — Project specification
- `simplant-zone-brief.md` — Multi-zone architecture with per-zone RNG
- `simplant-coding-plan-claude.md` / `simplant-coding-plan-chatgpt.md`

**Borrowable components:**
- Multi-zone vertical stacking system
- Per-zone RNG for reproducible experiments
- Zone-aware coordinate wrapping
- Tetris-style line clearing per zone

---

### 2. rgbfields (Sept–Nov 2025)

**Files:** 12 versions + multiple design docs
**Tech:** Pure field-based CA (no OOP particles)
**Modified:** Sept 22 → Nov 14, 2025

**What it is:** Three-field cellular automaton (R=heat, G=life, B=water). Extremely performance-focused design targeting 10k×10k grids.

**Key documentation:**
- `RGB_Field_CA_Design.md` — Core concept
- `RGB-Fields-MVP-NoSun.md` — Green field (life) design
- `rgbfields-7-plan.md` — Divisible water + heat-graded motion
- `RBGplans86.md` — Additional planning

**Borrowable components:**
- Heat-graded direction schedules (water moves differently at different temperatures)
- Surface tension transfer rules (`canTransfer()` function)
- Serpentine scan with parity flip (performance optimization)
- Uint8Array field storage

**Performance target:** 10k×10k grids, O(N) per tick

---

### 3. urn-plants (August 2025)

**Files:** 9 versions
**Tech:** PIXI.js
**Modified:** Aug 22–26, 2025
**Size evolution:** ~15KB → 43KB

**What it is:** Urn-based genetics where growth decisions draw 0/1 from urns with learning intensity. Features "five-spot" collision rule.

**Key documentation:** `urn-plants-5-plan.md`

**Borrowable components:**
- Urn-based probabilistic gene system
- Learning intensity parameter (genes reinforce over generations)
- Card-based UI for manual gene selection
- Biased random walk for seed dispersal

---

### 4. absorption (July 2025)

**Files:** 18 versions + HTML + supporting MD files
**Tech:** p5.js with PIXI.js hybrid, layered occupancy grid
**Modified:** July 5–14, 2025
**Size evolution:** 22KB → 67KB (3x growth)

**What it is:** Plant evolution simulation with sophisticated resource flow (water up, energy down), bidirectional distribution, photosynthesis/respiration cycle, crown shyness, seed dispersal.

**Key documentation:**
- `absorption-growth-logic.md` — Analysis of different growth approaches
- `complete_plant_sim_brief.md` — 455+ line technical specification (MOST COMPREHENSIVE)
- `a15-improvement-suggestions.md` — Patch instructions for resource slots
- `borrowing-recs.md` — Which older projects to borrow from
- `recs-for-next-session.md` — Debug notes and path forward

**Borrowable components:**
- Layered occupancy grid system (plant/water/energy layers)
- Bidirectional resource flow with priority system
- Plant cell type hierarchy (SEED→BUD→STEM→NODE→LEAFBUD→LEAF→FLOWER)
- Visual saturation feedback system
- Explicit resource ownership (plantId prevents decay)

**Note:** Most technically sophisticated and best documented project.

---

### 5. aestheedlings (Feb–July 2025)

**Files:** 8 versions
**Tech:** p5.js or PIXI.js with OccupancyGrid
**Modified:** Feb 19 → July 14, 2025

**What it is:** Mobile bud system where buds physically move upward, leaving stems behind. Beautiful growth mechanics.

**Borrowable components:**
- `OccupancyGrid` class — **HIGH PRIORITY BORROWING TARGET**
- Crown shyness logic (`checkEmptyMooreNeighborhoodExcludingParent`)
- Mobile bud movement mechanics
- 7-cell leaf pattern (3×3 minus corners)

---

### 6. treemap (Mar 2025)

**Files:** 3 versions + HTML + GeoJSON data (~45MB)
**Tech:** Mapbox GL JS (not Leaflet)
**Modified:** Mar 14–16, 2025

**What it is:** Interactive map of real trees in Evanston, IL using city open data. Features GPS location, compass orientation, genus-based color coding, scientific/common name toggle, and "find biggest tree" feature.

**Note:** Practical utility project (urban forestry/GIS app), NOT generative art.

---

### 7. sunsweeper (Feb 2025)

**Files:** 11 versions
**Tech:** PIXI.js
**Modified:** Feb 14–19, 2025

**What it is:** Plant simulation with dual celestial body lifecycle system. Sun and Moon scan screen in configurable patterns (snake/sweep, horizontal/vertical). Moon triggers germination on first pass and death on second; Sun triggers reproduction. Year = cols × rows ticks. See Addendum for full details.

---

### 8. cellspring (Dec 2024–Feb 2025)

**Files:** 24 versions
**Tech:** PIXI.js
**Modified:** Dec 31, 2024 → Feb 14, 2025

**What it is:** Energy-based plant growth with explicit parent/child connections. Key mechanics:
- Energy collection from empty cardinal neighbors (sunlight proxy)
- Maintenance cost (periodic energy drain)
- Energy distribution to connected neighbors
- Reproduction when ALL cells have excess energy
- Cell lifespan and death mechanics
- Crown shyness (Moore neighborhood check)

**Borrowable components:**
- Energy collection system (`collectEnergy()`)
- Maintenance cost system
- Parent/child connection tracking
- Simple parameter-based genetics (`internodeSpacing`, `budGrowthLimit`)

**Best version:** `cellspring-22-working.js`

**Note:** 24 versions in ~6 weeks = intense iteration period.

---

### 9. pixiching (Mar–Dec 2024)

**Files:** 28+ versions + optimized variants
**Tech:** PIXI.js
**Modified:** Mar 19, 2024 → Dec 29, 2024

**What it is:** PIXI-based particle system with elemental transformation cycles inspired by Wu Xing (Chinese five elements). Particles transform between types based on neighbors:
- VAPOR → WATER (condensation near water/vapor)
- VAPOR → PLANT (absorption near plant/earth)
- PLANT → EARTH (when ungrounded)
- EARTH → WATER (dissolution)
- WATER → VAPOR (evaporation)

**Borrowable components:**
- Elemental transformation logic with tunable rates
- Particle mode system
- Fast-forward capability
- Grid-based movement methods

**Best version:** `pixiching-optimized-7-ff-working.js` — **RECOMMENDED BASE FOR NEW PROJECTS**

---

### 10. triplebittrees (Mar 2024)

**Files:** 7 versions
**Tech:** p5.js with QuadTree
**Modified:** Mar 10–15, 2024

**What it is:** Probabilistic 3-slot tree growth system. Each particle ("live edge") has 3 potential growth slots (left/up/right relative to facing direction) with 50% probability per slot. Tracks facing direction (north/east/south/west) and rotates slots accordingly. Measures tree sizes, tracks records, auto-restarts on maturation.

**Key documentation:** `triple_bit_trees.md`

**Borrowable components:**
- 3-slot growth with facing direction (`getDirectionsByFacing()`)
- Rotation-aware slot mapping (left/up/right → global direction)
- Extended Moore neighborhood check per facing direction
- Auto-advance interval with tree size tracking

**Core concept:** L-system-like fractal trees with probabilistic branching and facing-direction awareness.

---

### 11. magmasim (Nov 2023–Mar 2024)

**Files:** 16 versions
**Tech:** p5.js with QuadTree
**Modified:** Nov 24, 2023 → Mar 10, 2024

**What it is:** Temperature-driven convection simulation. Particles have temperature (0–100) that affects vertical force (cold falls, hot rises). Features:
- Heating zones at bottom, cooling zones at top
- Temperature averaging with neighbors
- Temperature-based attraction/repulsion (similar temps attract, different repel)
- Force distribution to neighbors when blocked
- Color gradient from red (cold) to yellow (hot)

**Borrowable components:**
- Temperature force system (`applyTemperatureForces()`)
- Zone-based heating/cooling (`updateTemperature()`)
- Temperature-based attraction (`applyAttraction()`)

---

### 12. monochromagic (July 2023–Mar 2024)

**Files:** 12 versions
**Tech:** p5.js
**Modified:** July 12, 2023 → Mar 26, 2024

**What it is:** Particle simulation with good water physics.

**Borrowable components:**
- Direction persistence (`fallingDirection`) — water remembers which diagonal it came from
- Movement priority logic

**Best version:** `monochromagic-10.js` for water physics

---

### 13. rbgrps (Oct–Nov 2023)

**Files:** 6 versions
**Tech:** p5.js
**Modified:** Oct 15 → Nov 21, 2023

**What it is:** RGB-based cellular automaton, precursor to rgbfields.

---

### 14. pixelplantsim (May–July 2023)

**Files:** ~15 versions (multiple naming: 13, 15, june, sf, train, chi)
**Tech:** p5.js or PIXI
**Modified:** May–July 2023

**What it is:** Pixel-based plant simulation with multiple parallel explorations.

---

### 15. auraplants (July–Oct 2023)

**Files:** 1 version
**Tech:** p5.js
**Modified:** July 28 → Oct 23, 2023

**What it is:** Plant simulation with aura/glow effects.

---

### 16. spring-fall-sand-garden (Mar–Sept 2022)

**Files:** Versions 28, 37, 40, 40-train
**Tech:** p5.js
**Modified:** Mar 28 → Sept 29, 2022
**Size:** 45–54KB (large files)

**What it is:** Falling sand with plant growth and seasonal mechanics.

**Borrowable components:**
- Growth execution and plant lifecycle
- Multiple specialized bud types (ApicalBud, FlowerBud, etc.)
- Probabilistic local growth decisions

**Best version:** `spring-fall-sand-garden-40.js`

---

### 17. farming-plants (Oct 2021–Mar 2022)

**Files:** Versions 14–19 + autoevo + gene-archive
**Tech:** p5.js
**Modified:** Oct 3, 2021 → Mar 14, 2022

**What it is:** Deterministic blueprint-based plant genetics with 3-slot patterns.

**Borrowable components:**
- Simple binary gene arrays: `[[0,1,0], [0,1,0], ...]`
- **Recency-based mutation algorithm** — EXCELLENT BORROWING TARGET
- Global fitness tracking with visual feedback (flashing winner)
- Generation-based evolution with clean reset

**Key pattern — Recency mutation:**
```javascript
mutateGenes() {
  let geneRecencyCounter = 1;
  for (var i = this.genes.length - 1; i >= 0; i--) {
    geneRecencyCounter++;
    if (random() < 1 / geneRecencyCounter) {
      this.genes.length = i;  // Truncate recent genes more often
    }
  }
}
```

**Best version:** `farming-plants-19.js`

---

### 18. falling-sand (July–Oct 2021)

**Files:** Versions 10, 11, 16, 17, 17-2
**Tech:** p5.js
**Modified:** July 6 → Oct 2, 2021

**What it is:** Classic falling sand simulation, foundation for later sand mechanics.

**Borrowable components:**
- Vapor phase transitions (`falling-sand-16.js`)

---

### 19. plantEvo (Apr–July 2021)

**Files:** 6 versions + walker modules (generic, light, plant, water)
**Tech:** p5.js
**Modified:** Apr 15 → July 7, 2021

**What it is:** Modular plant evolution with separate "walker" classes.

**Notable:** Multi-file architecture with touch controls — rare modular approach.

---

### 20. elements-particles (Dec 2021–Jan 2022)

**Files:** Versions 5, 8, 12, 13, 16 + sketch files
**Tech:** p5.js
**Modified:** Dec 29, 2021 → Jan 3, 2022

**What it is:** Element-based particle simulation.

---

### 21. Water series (Dec 2020–Jan 2021)

**Files:** water.js, water-lamp.js, water-lamp-coral.js, water-colors.js, water-colors-sphere.js
**Tech:** p5.js
**Modified:** Dec 29, 2020 → Jan 10, 2021

**What it is:** Early water simulation experiments.

---

### 22. Early explorations (June–Oct 2020)

**Files:** simple-starburst, kelp-galaxy, cactus-supernova, center-circle, offset, flower-farming, line-evolution, alternating-spirals, red-light-green-light
**Tech:** p5.js
**Modified:** June–Oct 2020

**What it is:** Earliest generative art experiments — simple algorithmic drawings and growth patterns.

---

## External Projects (outside gregloryus.github.io)

### macroquad2 (July–Sept 2022)

**Location:** `/Users/greg/Documents/GitHub/macroquad2`
**Tech:** Rust + macroquad library
**Files:** Multiple main.rs versions for different particle counts (30k, 300k, 1M)

**What it is:** Performance-focused falling sand in Rust.

---

### Sand-Sim-Godot (Jan 2022)

**Location:** `/Users/greg/Documents/GitHub/Sand-Sim-Godot`
**Tech:** Godot engine with GDScript and C#

**What it is:** Sand simulation with level editor in game engine.

---

### SelfAvoidance (June 2020)

**Location:** `/Users/greg/Documents/GitHub/SelfAvoidance`
**Tech:** Python + matplotlib

**What it is:** Self-avoiding random walks visualizer.
**Note:** This is Troy P. Kling's project (cloned, not original work).

---

## Quick Reference: Best Versions to Borrow From

| Component | Best Source | File |
|-----------|-------------|------|
| Base particle system | pixiching | `pixiching-optimized-7-ff-working.js` |
| OccupancyGrid | aestheedlings | `aestheedlings-8.js` |
| Water physics | monochromagic | `monochromagic-10.js` |
| Genetics (simple) | farming-plants | `farming-plants-19.js` |
| Genetics (triple-bit) | triplebittrees | `triple_bit_trees.md` + code |
| Resource flow | cellspring | `cellspring-22-working.js` |
| Plant lifecycle | spring-fall | `spring-fall-sand-garden-40.js` |
| Performance patterns | rgbfields | `rgbfields-7-plan.md` |
| Crown shyness | aestheedlings | `aestheedlings-8.js` |
| Mutation algorithm | farming-plants | `farming-plants-19.js` |
| Multi-zone architecture | simplant | `simplant-zone-brief.md` |
| Complete design spec | absorption | `complete_plant_sim_brief.md` |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total project families | ~22 |
| Total JS/HTML files | ~220 |
| Time span | June 2020 – December 2025 (5.5 years) |
| Most iterated | cellspring (24 versions), pixiching (28+ versions) |
| Most documented | absorption, simplant, rgbfields |
| Technologies | p5.js, PIXI.js, Rust/macroquad, Godot, Python |

---

## Versioning Convention

Files typically follow the pattern: `projectname-N.js` where N increments after significant changes. Files with `-working` suffix indicate stable milestones. This is used instead of Git branches.

---

## Key Borrowable Code Patterns (Deep Read Results)

### 1. OccupancyGrid — Flat Array Grid System
**Source:** `aestheedlings-8.js`, `cellspring-22-working.js`, `pixiching-optimized-7-ff-working.js`

```javascript
class OccupancyGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(cols * rows).fill(null);
  }
  getIndex(x, y) { return y * this.cols + x; }
  set(x, y, particle) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = particle;
    }
  }
  get(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      return this.grid[this.getIndex(x, y)];
    }
    return null;
  }
  isOccupied(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
    return this.get(x, y) !== null;
  }
}
```

### 2. LayeredOccupancyGrid — Multi-layer System
**Source:** `absorption-18.js`

For simulations with overlapping particle types (plants + water + energy):
```javascript
class LayeredOccupancyGrid {
  constructor(cols, rows) {
    this.plantLayer = new Array(cols * rows).fill(null);
    this.waterLayer = new Array(cols * rows).fill(null);
    this.energyLayer = new Array(cols * rows).fill(null);
    // Per-cell slot flags for resource capacity
    this.hasFixedWater = new Uint8Array(cols * rows);
    this.hasExcessWater = new Uint8Array(cols * rows);
  }
}
```

### 3. Water Physics with Direction Persistence
**Source:** `monochromagic-10.js`, `rgbfields-12.js`

```javascript
updateWater() {
  if (!this.downOccupied()) {
    this.moveDown();
    this.fallingDirection = null; // reset when moving down
  } else {
    if (this.fallingDirection === null) {
      this.fallingDirection = Math.random() < 0.5 ? "left" : "right";
    }
    if (this.fallingDirection === "left") {
      if (!this.downLeftOccupied()) this.moveDownLeft();
      else if (!this.leftOccupied()) this.moveLeft();
      else this.fallingDirection = "right"; // switch
    } else {
      if (!this.downRightOccupied()) this.moveDownRight();
      else if (!this.rightOccupied()) this.moveRight();
      else this.fallingDirection = "left";
    }
  }
}
```

### 4. Recency-Based Mutation
**Source:** `farming-plants-19.js`

Genes at end of genome mutate more frequently (newer = less stable):
```javascript
mutateGenes() {
  let geneRecencyCounter = 1;
  for (var i = this.genes.length - 1; i >= 0; i--) {
    geneRecencyCounter++;
    if (random() < 1 / geneRecencyCounter) {
      this.genes.length = i; // truncate from this point
    }
  }
}
```

### 5. Crown Shyness (Moore Neighborhood Check)
**Source:** `aestheedlings-8.js`, `cellspring-22-working.js`

```javascript
isEmptyMooreNeighborhood(x, y) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
      if (this.get(nx, ny)) return false;
    }
  }
  return true;
}
```

### 6. PIXI.js Fast-Forward Loop
**Source:** `pixiching-optimized-7-ff-working.js`, `absorption-18.js`

```javascript
let fastForward = false;
let fastForwardFactor = 10;

function customLoop() {
  const updatesThisFrame = fastForward ? fastForwardFactor : 1;
  for (let i = 0; i < updatesThisFrame; i++) {
    frame++;
    particles.forEach(p => p.update());
  }
  app.renderer.render(app.stage);
  requestAnimationFrame(customLoop);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "f") fastForward = !fastForward;
});
```

### 7. Energy Collection from Empty Neighbors
**Source:** `cellspring-22-working.js`

```javascript
collectEnergy() {
  const emptySpaces = occupancyGrid.getCardinalNeighbors(this.pos.x, this.pos.y);
  for (let i = 0; i < emptySpaces * LEAF_MULTIPLIER; i++) {
    if (Math.random() < COLLECTION_CHANCE) {
      this.currentEnergy++;
    }
  }
}
```

### 8. Heat-Graded Direction Schedules
**Source:** `rgbfields-12.js`

Water movement varies by temperature (0=frozen, 8+=vapor-like):
```javascript
function buildDirections(x, y, heat, W_src) {
  const dirs = [];
  if (heat === 0) return dirs; // frozen
  if (heat >= 8) { dirs.push({dx:0,dy:-1}); } // up first (hot)
  dirs.push({dx:-1,dy:1}, {dx:1,dy:1}); // diagonals
  if (heat >= 4) dirs.push({dx:-1,dy:0}, {dx:1,dy:0}); // sides
  dirs.push({dx:0,dy:1}); // down last
  return dirs;
}
```

### 9. Bound/Unbound Particle States
**Source:** `absorption-18.js`

```javascript
const ParticleState = {
  UNBOUND: "UNBOUND", // free-floating
  BOUND: "BOUND",     // attached to plant, follows flow rules
};

bindToPlant(plantId) {
  this.state = ParticleState.BOUND;
  this.plantId = plantId;
  this.claimSlotFlags(this.pos.x, this.pos.y);
  // Remove from unbound layer
  occupancyGrid.setWater(this.pos.x, this.pos.y, null);
}
```

### 10. Plant Lifecycle with Age/Death
**Source:** `spring-fall-sand-garden-40.js`, `cellspring-22-working.js`

```javascript
// In Seed class
this.ageLimit = 1200 * this.maxHeightPercentage;

killPlant() {
  for (var child of this.children) {
    let replacement = new Dirt(child.pos.x, child.pos.y);
    replacement.color = child.color; // preserve color
    particles.splice(particles.indexOf(child), 1, replacement);
  }
  // Spawn new seed at highest point
  let seed = new Seed(this.highestChild.pos.x, this.highestChild.pos.y - 3);
  particles.push(seed);
}
```

---

## Evolution of Techniques (Chronological)

| Era | Key Technique Introduced | First Appeared |
|-----|-------------------------|----------------|
| 2020 | Basic p5.js particle loops | water-lamp |
| 2021 | QuadTree spatial partitioning | farming-plants |
| 2022 | Density-based swapping | spring-fall-sand-garden |
| 2023 | Direction persistence | monochromagic |
| 2024 | PIXI.js migration, Fast-forward | pixiching |
| 2024 | Triple-bit genetics | triplebittrees |
| 2025 | OccupancyGrid (flat array) | aestheedlings |
| 2025 | Layered grids, Bound states | absorption |
| 2025 | Heat-graded CA | rgbfields |
| 2025 | Multi-zone architecture | simplant |

---

*Catalog updated: January 6, 2026 — Deep read complete*

---

## Addendum: Overlooked Novel Mechanics

### pixiching — Elemental Transformation Cycles
**Not just performance work.** Particles transform between types based on neighbors:
```
VAPOR → WATER (condensation near water/vapor)
VAPOR → PLANT (absorption near plant/earth)
PLANT → EARTH (when ungrounded)
EARTH → WATER (dissolution)
WATER → VAPOR (evaporation)
```
Inspired by Wu Xing / classical elements. Identity is fluid, not fixed.

### rbgrps — Rock-Paper-Scissors Dynamics
**Distinct from rgbfields despite similar name.** Red→Lime→Blue→Red cycle. On contact, winner converts loser to its color. Creates territorial waves and eventual convergence. Game theory emergence, not physics.

### urn-plants — Pólya Urn Path-Keyed Genetics ⭐
**Most philosophically novel mechanic.** Key insight: decisions are keyed to *graph paths*, not spatial positions.

- Each decision point has a key like `seed/up/up/right/node/fwd`
- Outcomes are appended to an urn for that exact path
- **Affects offspring, not current plant** — if parent chose "1" at path X, offspring following path X have higher chance of "1"
- Two plants at position (2,2) via different paths have *independent* probabilities
- Self-reinforcing across generations: history becomes destiny

**Card UI:** User picks facedown cards (0 or 1 hidden). Creates perceived synchronicity—felt agency without actual information. Bridges 0-player simulation and interactive game.

```javascript
// Path-keyed, not position-keyed
const key = `seed/up/up/right/node/fwd`;  // exact graph path
genes.append(key, outcome);  // reinforces for offspring on same path
```

### sunsweeper — Dual Celestial Bodies with Lifecycle Triggers ⭐
**More sophisticated than initially described.** Two scanning particles (Sun + Moon) offset by half a cycle:

- **Sun:** Triggers reproduction when passing over mature seeds
- **Moon:** Triggers germination on first pass, *death* on second pass (if mature)
- **Half-cycle offset:** Sun and moon always on opposite sides → day/night phases
- **Two sweep modes:** "snake" (reverses at edges) or "sweep" (typewriter-style reset)
- **Configurable axis:** Horizontal or vertical scanning
- **Year = cols × rows ticks:** One complete sweep is a "year"
- **Lifespan tied to year:** `DEFAULT_LIFESPAN = rows * cols + 1` (plants survive ~1 year)

**Lifecycle created:**
1. Moon passes seed → germinate
2. Plant grows during "year"
3. Sun passes mature seed → reproduce (spawn airborne seed)
4. Moon passes again → plant dies

**Emergent behavior:** Different screen regions experience "seasons" at different times based on sweep position. Row-by-row advancement creates latitudinal climate zones.

### bitwise-rng-spec.md
Architectural spec for entity-specific seeded PRNG with timeline control. Extends xorshift pattern already in simplant with save/load and batch ops. Useful for replays; not essential otherwise.

*This catalog was generated by analyzing file timestamps, reading documentation files, and understanding project relationships. It should be updated as new projects are added.*
