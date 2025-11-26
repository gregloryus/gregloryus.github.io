# Simplant Coding Plan

A design for a simple plant simulation on a 2D grid with triple-bit genetics, light-driven growth, and seed-based reproduction.

---

## 0. High-Level Overview

- **Paradigm**: 2D cellular automaton style on a rectangular grid.
- **Tick model**: One universal tick; can advance one tick at a time or run continuously.
- **Entities**:
  - Plants with genomes and energy.
  - Cells that occupy grid positions (seed and plant cells).
  - Light particles (energy packets).
  - Traveling seeds (reproductive propagules).
- **Determinism**: All randomness is via a seeded pseudo-RNG so runs are reproducible.
- **Performance goal**: Scalable to large grids (hundreds of thousands of cells) using simple data structures and O(1) local rules.

---

## 1. World, Rendering, and RNG

### 1.1 Grid and dimensions

- Define constants:
  - `COLS`, `ROWS` – grid size (either fixed like 64×64 or computed from window size and cell scale).
  - `SCALE` – pixel size of one cell (e.g., 4–8).
  - `TICK_INTERVAL_MS` – base interval between ticks (e.g., 50–100 ms).
  - `NUM_STARTER_SEEDS` – initial number of seeds.
- Store occupancy in:
  - `grid: (SeedCell | PlantCell | null)[]` – flat array of length `COLS * ROWS`.

Helpers:

- `ix(x, y): number` → `y * COLS + x`.
- `inBounds(x, y): boolean` → checks 0 ≤ x < COLS and 0 ≤ y < ROWS.

### 1.2 Seeded RNG

- Parse an optional `?seed=1234` query parameter from the URL.
- Implement a deterministic PRNG, e.g. xorshift32:

  - Internal state `rngState: number`.
  - `rng(): number` → float in [0, 1).
  - `randInt(n: number): number` → integer in [0, n).

- All randomness (seed placement, mutation bit selection, random child gene, light absorption events, branch selection, random walk directions) must use this RNG.

### 1.3 Rendering with PixiJS

- Initialize a `PIXI.Application` that covers the grid area.
- Create textures:
  - `plantTexture` – solid green rectangle.
  - `seedTexture` – visually distinct from plant cells (e.g., brown or white).
  - `lightTexture` – yellow; light sprites use this with `alpha = 0.5`.
- For each cell / particle type, attach a `PIXI.Sprite` scaled to `SCALE × SCALE` and positioned at `x * SCALE`, `y * SCALE`.
- The main loop:
  - Updates the simulation state on each tick.
  - Calls `app.renderer.render(app.stage)` after state updates.

### 1.4 Controls

- Keyboard:
  - `P`/`p` – toggle `paused`.
  - `Space` – when paused, advance exactly one tick.
- Optional:
  - `R` – reset simulation with new random seed.
  - `S` – re-seed using the same RNG seed but new initial positions.

---

## 2. Core Data Structures

### 2.1 Orientation

- Represent orientation as an integer `0..3`:
  - 0 = North (0, −1)
  - 1 = East (+1, 0)
  - 2 = South (0, +1)
  - 3 = West (−1, 0)
- Local directions relative to `orientation o`:
  - Up: orientation `o` (forward).
  - Left: orientation `(o + 3) & 3` (−90°).
  - Right: orientation `(o + 1) & 3` (+90°).

### 2.2 Plant

A logical organism, not a grid cell.

Fields:

- `id: number`
- `root: SeedCell` – the root cell on the grid.
- `genome: Uint8Array` – array of 3-bit genes, one per node.
- `rootNode: GeneNode` – decoded tree from the genome.
- `energy: number` – accumulated energy at the seed.
- `geneCount: number` – `genome.length`.
- Reproduction state:
  - `reproPhase: 'idle' | 'planningChild' | 'chargingChild'`
  - `childGenome: Uint8Array | null`
  - `childGeneCount: number`
- `freeSproutUsed: boolean` – has the free germination sprout been used.

### 2.3 GeneNode

Represents one gene in the tree of growth instructions.

Fields:

- `geneBits: number` – 0..7; bits encode children:
  - Bit 0 (1) = left child.
  - Bit 1 (2) = up child.
  - Bit 2 (4) = right child.
- `children: [GeneNode | null, GeneNode | null, GeneNode | null]`
  - Index 0: left child.
  - Index 1: up child.
  - Index 2: right child.
- `parent: GeneNode | null`
- `slotFromParent: 0 | 1 | 2 | null`
- `cell: PlantCell | SeedCell | null` – actual grown cell corresponding to this node (if grown).
- `grownMask: number` – 3 bits marking which children have been instantiated as cells on the grid (for growth progress).

### 2.4 SeedCell (grid entity)

A cell that is the root of a plant on the grid.

Fields:

- `x, y: number`
- `plant: Plant`
- `node: GeneNode` – should be `plant.rootNode`.
- `parent: null`
- `orientation: number` – default 0 (North).
- `isSeed = true`
- `hasGerminated: boolean`
- `cooldown: number` – light absorption cooldown (like other cells).

Rendering:

- `sprite` using `seedTexture`.

### 2.5 PlantCell (grid entity)

A non-seed plant cell.

Fields:

- `x, y: number`
- `plant: Plant`
- `node: GeneNode`
- `parent: PlantCell | SeedCell | null`
- `orientation: number` – 0..3
- `cooldown: number` – ticks until can absorb light again.
- Optional:
  - `hasLightHere: boolean` – can be derived from presence of a `LightParticle` but may be cached.

Rendering:

- `sprite` using `plantTexture`.

### 2.6 LightParticle

Represents an energy packet moving up a plant.

Fields:

- `plant: Plant`
- `cell: PlantCell | SeedCell`
- `sprite`:
  - Uses `lightTexture`.
  - Positioned at `cell.x, cell.y`.
  - `alpha = 0.5`.

Behavior:

- Each tick moves from `cell` to `cell.parent`.
- When it reaches the seed (no `parent`), it increments `plant.energy` and is destroyed.

### 2.7 TravelingSeed

Represents a seed in transit during reproduction, before it becomes a new SeedCell.

Fields:

- `state: 'attached' | 'airborne'`
- `plant: Plant` – parent plant.
- `childGenome: Uint8Array` – genome of the new plant to create.
- Attached mode:
  - `currentNode: GeneNode` – which node of the plant we are on.
- Airborne mode:
  - `x, y: number`
  - `stepsTaken: number`
  - `maxSteps: number` – e.g., 40.
  - `sprite` using `seedTexture` or a different appearance.

---

## 3. Genome and Triple-Bit Tree Logic

### 3.1 Genome representation

- The genome is a `Uint8Array` of length `N`.
- Each element is a 3-bit integer 0..7 where bits represent child directions:
  - Bit 0 (1) → left child exists.
  - Bit 1 (2) → up child exists.
  - Bit 2 (4) → right child exists.
- Example default genome:
  - `[0b010, 0b010, 0b010, 0b000]`.

### 3.2 Decoding genome to GeneNode tree

Implement `decodeGenome(genome: Uint8Array): GeneNode`:

- Use a recursive DFS that consumes the `genome` array in order.
- Start at index 0:
  - Create `rootNode`.
  - Recursively build children using bits in `geneBits`.
- For each node at index `i`:
  - Let `geneBits = genome[i]`.
  - For `slot` in 0,1,2:
    - If bit `1 << slot` is set:
      - Next unused index in the genome becomes the child’s index.
      - Recursively create child node.
      - Set parent/child links and `slotFromParent`.
- Return the `rootNode` (and optionally an array of all nodes if needed for debugging).

### 3.3 Encoding GeneNode tree back to genome

Implement `encodeGenome(root: GeneNode): Uint8Array`:

- Traverse the tree in DFS order:
  - Visit node.
  - Compute its `geneBits` based on which of its `children[0..2]` are non-null.
  - Append `geneBits` to an array.
  - Recurse in order: left → up → right.
- Convert that array to a `Uint8Array` and return.

### 3.4 Single-bit mutation on a genome

Implement a mutation step that flips a single bit in the genome and updates the tree structure accordingly.

Steps:

1. Choose a random `geneIndex` in `[0, genome.length)`.
2. Choose a random `slotIndex` in `{0, 1, 2}`.
3. Inspect the current bit:
   - If bit is 1 (flipping 1 → 0):
     - Decode the genome to a GeneNode tree.
     - Find the node corresponding to `geneIndex`.
     - For `slotIndex`, remove that child:
       - Set `children[slotIndex] = null`.
       - Discard the subtree rooted at that child.
     - Encode the tree back to a new genome.
   - If bit is 0 (flipping 0 → 1):
     - Decode the genome to a GeneNode tree.
     - Ensure `children[slotIndex]` is currently null.
     - Create a new `GeneNode` with a random `geneBits` in `[0..7]`.
     - Attach it as `children[slotIndex]`.
     - Encode tree back to a new genome.

This preserves depth-first ordering and ensures the genome matches the tree structure after mutation.

---

## 4. Growth Rules

### 4.1 Mapping GeneNodes to grid positions

For a grown node with a cell:

- Let `cell` have `(x, y)` and `orientation o`.
- For each slot:
  - Left (0): orientation `oL = (o + 3) & 3`.
  - Up (1): orientation `oU = o`.
  - Right (2): orientation `oR = (o + 1) & 3`.
- Global step per orientation:
  - `o = 0 (N)`: `(0, −1)`
  - `o = 1 (E)`: `(1, 0)`
  - `o = 2 (S)`: `(0, 1)`
  - `o = 3 (W)`: `(−1, 0)`
- Child position is `x + dx`, `y + dy` using the orientation-appropriate `(dx, dy)`.

Children inherit orientation:

- Left child’s `orientation = oL`.
- Up child’s `orientation = oU`.
- Right child’s `orientation = oR`.

### 4.2 Choosing cells to grow each tick

Goal: each plant grows at most one new cell per tick.

Per plant per tick:

1. If the plant is not yet germinated (only root seed present but not in the main loop), skip. Germination is handled separately.
2. If the plant has not used its free sprout and is at germination stage, handle that separately (see section 6).
3. Otherwise:
   - If `plant.energy < 1`, no growth this tick.
   - Else:
     - Call `tryGrowOneCell(plant)`:
       - This function finds the first suitable frontier node (in a stable traversal order, such as DFS from the root).
       - A frontier node is one whose `node.cell` exists and which has at least one child slot with:
         - `node.children[slot] !== null`, and
         - `childNode.cell === null`, and
         - target grid cell is in bounds and empty.
       - For the first such node/slot:
         - Instantiate a new `PlantCell` at the computed position.
         - Set its `plant`, `node` (child node), `parent` (parent cell), `orientation`.
         - Put that cell into `grid[ix]`.
         - `plant.energy -= 1`.
         - Set the corresponding bit in `parentNode.grownMask`.
         - Stop; the plant has created its one new cell for this tick.

Collision handling:

- If the target cell is out of bounds or occupied, skip that child slot.
- Optionally:
  - mark that slot as permanently blocked (pruning that subtree), or
  - keep open the possibility to try again later. For a simple first version, treat it as “cannot grow here now” and retry in future ticks.

---

## 5. Light and Energy System

### 5.1 Light absorption condition

For each `SeedCell` and `PlantCell` each tick:

1. Count open cardinal neighbors:
   - Offsets: `(0, −1)`, `(1, 0)`, `(0, 1)`, `(−1, 0)`.
   - For each neighbor that is in bounds and has `grid[ix] === null`, add 1 to `openCount`.
2. Check conditions:
   - `openCount ≥ 3`.
   - `cell.cooldown === 0`.
3. If conditions hold:
   - With probability `LIGHT_ABSORB_PROB` (e.g., 1/100), spawn a light particle at that cell.

Optional refinement (later):

- Restrict absorption to “tips” where the node has no ungrown children and/or has few plant neighbors.

### 5.2 Spawning a light particle

When a cell absorbs light:

- Create a `LightParticle`:
  - `plant = cell.plant`.
  - `cell = cell`.
  - `sprite` at `cell.x, cell.y`.
- Add it to a global `lightParticles` array.
- Set `cell.cooldown = LIGHT_COOLDOWN_TICKS`.

### 5.3 Propagating light particles

Each tick, for each `LightParticle`:

1. If `cell.parent` is non-null:
   - Set `cell = cell.parent`.
   - Update sprite position.
2. Else (no parent):
   - This is the seed:
     - Increment `cell.plant.energy`.
   - Remove the `LightParticle`:
     - Remove its sprite from the stage.
     - Remove it from the global `lightParticles` array.

---

## 6. Germination and Initial Growth

### 6.1 Initial starter seeds

During initialization:

1. Choose `NUM_STARTER_SEEDS` distinct grid indices at random.
2. For each:
   - Start with the default primitive genome `[0b010, 0b010, 0b010, 0b000]`.
   - With probability 0.5, apply a pre-growth mutation (using the single-bit mutation rule).
   - Decode the final genome into a `rootNode`.
   - Create a `Plant` with:
     - `genome`, `geneCount = genome.length`.
     - `rootNode`, `energy = 0`.
     - `reproPhase = 'idle'`.
   - Create a `SeedCell` at that grid position:
     - `plant = this Plant`.
     - `node = rootNode`.
     - `orientation = 0` (North).
     - `hasGerminated = true`.
   - Set `rootNode.cell = seedCell`.
   - Insert the `SeedCell` into `grid[ix]`.

These initial seeds are considered already present and can immediately absorb light and grow.

### 6.2 Germination of new seeds

New seeds are created by reproduction via TravelingSeed objects (see section 7). When a TravelingSeed successfully lands:

1. Create a new `Plant`:
   - `genome = childGenome` from TravelingSeed.
   - `geneCount = genome.length`.
   - Decode `genome` into `rootNode`.
   - Set `rootNode.cell = null` for now.
   - `energy = 0`.
2. Create a `SeedCell` at the TravelingSeed’s `(x, y)`:
   - `plant` = new Plant.
   - `node = rootNode`.
   - `parent = null`.
   - `orientation = 0` (North).
   - `hasGerminated = true`.
3. Insert the `SeedCell` into `grid[ix]`.
4. Immediately grow the first sprout for free:
   - Inspect `rootNode.geneBits`:
     - If its Up bit (bit 1) is set, compute child position one cell north of the seed (or “up” according to orientation).
     - If the position is in bounds and empty, grow a `PlantCell` there:
       - `plant` = new plant.
       - `node` = `rootNode.children[1]` (Up child), if present.
       - `parent` = seed.
       - `orientation = 0` (North).
     - Set `plant.freeSproutUsed = true`.

After this free sprout, any further growth must spend 1 unit of energy per new cell.

---

## 7. Reproduction and Traveling Seeds

### 7.1 Energy thresholds for reproduction

Let `G = plant.geneCount`.

Per plant each tick:

1. If `plant.reproPhase === 'idle'` and `plant.energy ≥ G`:
   - Plan a child:
     - Create `childGenome` as a clone of `genome`.
     - With probability 0.5, apply a single-bit mutation to `childGenome`.
     - `childGeneCount = childGenome.length`.
   - Set:
     - `plant.childGenome = childGenome`.
     - `plant.childGeneCount = childGeneCount`.
     - `plant.reproPhase = 'chargingChild'`.
2. If `plant.reproPhase === 'chargingChild'` and `plant.energy ≥ G + childGeneCount`:
   - Create a `TravelingSeed`:
     - `state = 'attached'`.
     - `plant = this plant`.
     - `childGenome = plant.childGenome`.
     - `currentNode = plant.rootNode`.
     - `maxSteps = SEED_AIRBORNE_STEPS` (e.g., 40).
   - Subtract the cost of creating the seed:
     - `plant.energy -= childGeneCount`.
   - Reset:
     - `plant.reproPhase = 'idle'`.
     - `plant.childGenome = null`.

### 7.2 TravelingSeed in attached mode

Each tick, for each `TravelingSeed` where `state === 'attached'`:

1. Inspect `currentNode.children`:
   - Collect all child nodes where `childNode.cell !== null`.
2. If the list of child nodes is non-empty:
   - Select one uniformly at random using `randInt(list.length)`.
   - Set `currentNode = chosenChild`.
3. If the list is empty:
   - Switch to airborne:
     - `state = 'airborne'`.
     - `x = currentNode.cell.x`.
     - `y = currentNode.cell.y`.
     - `stepsTaken = 0`.
     - Initialize or show a TravelingSeed sprite at `(x, y)`.

The seed thus travels along the plant’s existing geometry, going deeper towards tips before being released.

### 7.3 TravelingSeed in airborne mode

Each tick, for each `TravelingSeed` where `state === 'airborne'`:

1. If `stepsTaken >= maxSteps`:
   - Attempt to land:
     - Check the Moore neighborhood of `(x, y)`:
       - For `dx` in −1..1 and `dy` in −1..1, skipping `(0, 0)`:
         - If any neighbor is out of bounds or `grid[ix] !== null`, landing fails.
     - If all neighbors are in bounds and empty:
       - Germinate a new plant at `(x, y)` using `childGenome` (see section 6.2).
     - If landing fails:
       - Destroy this `TravelingSeed` without creating a plant.
   - Remove its sprite and the TravelingSeed object.
2. Else:
   - Take one random step:
     - Choose one of four cardinal directions uniformly:
       - `(0, −1)`, `(1, 0)`, `(0, 1)`, `(−1, 0)`.
     - Move:
       - `x = clamp(x + dx, 0, COLS − 1)`.
       - `y = clamp(y + dy, 0, ROWS − 1)`.
     - Update sprite position.
     - `stepsTaken++`.

---

## 8. Tick Pipeline

Each tick (if not paused), apply the following steps in order:

1. **Light cooldowns**
   - For every `SeedCell` and `PlantCell`:
     - If `cooldown > 0`, decrement `cooldown--`.
2. **Growth phase**
   - For each plant:
     - If appropriate (plant has germinated, `freeSproutUsed` handled), call `tryGrowOneCell(plant)`.
3. **Light absorption**
   - For each grid cell that is a `SeedCell` or `PlantCell`:
     - Evaluate absorption predicates and possibly spawn one or more `LightParticle` objects for that tick.
4. **Light propagation**
   - For each `LightParticle`, move it one step towards the seed by following `cell.parent`. At the seed, increment energy and destroy the light.
5. **Reproduction (plan child then charge and launch)**
   - For each plant:
     - If `reproPhase === 'idle'`, check threshold and possibly plan a child genome.
     - If `reproPhase === 'chargingChild'`, check energy and possibly create a `TravelingSeed`.
6. **Traveling seeds**
   - For each `TravelingSeed`:
     - If `state === 'attached'`, move it along the plant.
     - If `state === 'airborne'`, random walk and possibly attempt landing.
7. **Rendering**
   - Draw all sprites (seeds, plant cells, light particles, traveling seeds).

---

## 9. Initialization Flow

On page load:

1. Parse parameters:
   - `seed` for RNG.
   - Optional overrides for `COLS`, `ROWS`, `NUM_STARTER_SEEDS`, etc.
2. Initialize RNG, `grid`, global arrays:
   - `plants: Plant[] = []`.
   - `lightParticles: LightParticle[] = []`.
   - `travelingSeeds: TravelingSeed[] = []`.
3. Create initial plants:
   - While the count of starter seeds is less than `NUM_STARTER_SEEDS`:
     - Pick a random index.
     - If `grid[ix]` is empty, place a starter seed as described in section 6.1.
4. Start tick loop:
   - Using `setInterval` or `requestAnimationFrame`:
     - If not paused, call `tick()` and then render.

---

## 10. Performance and Tuning Notes

- **Grid representation**:
  - `grid` as a flat array keeps memory access coherent.
- **Complexity per tick**:
  - Growth: proportional to number of plants, with constant work per plant (one potential cell).
  - Light: proportional to number of plant cells plus number of light particles.
  - Seeds: proportional to number of traveling seeds.
- **Optimizations (optional, later)**:
  - Maintain arrays of plant cells per plant to avoid scanning the whole grid for growth / absorption.
  - Use typed arrays for per-cell scalars (e.g., `cooldown`) instead of fields on JS objects if profiling suggests it.
- **Tunable parameters**:
  - `LIGHT_ABSORB_PROB`.
  - `LIGHT_COOLDOWN_TICKS`.
  - `SEED_AIRBORNE_STEPS`.
  - `NUM_STARTER_SEEDS`.
  - Energy thresholds for starting and completing reproduction (currently described as `G` and `G + childGeneCount`).

---

## 11. Suggested Implementation Phases

1. **Phase 1 – Skeleton**
   - Implement PixiJS setup, grid, RNG, tick loop, and basic controls.
2. **Phase 2 – Genetics & Tree**
   - Implement genome encoding/decoding and mutation logic.
   - Unit-test tree ↔ genome invariants.
3. **Phase 3 – Static Growth**
   - Implement `Plant`, `SeedCell`, `PlantCell`.
   - Let plants grow to full encoded shapes without energy constraints (for debugging).
4. **Phase 4 – Light & Energy**
   - Add light absorption, `LightParticle`s, and energy.
   - Gate growth on `plant.energy >= 1`.
5. **Phase 5 – Reproduction**
   - Add reproduction thresholds.
   - Implement `TravelingSeed` attached and airborne phases, landing, and germination.
6. **Phase 6 – Tuning & Profiling**
   - Adjust parameters for visually interesting behavior.
   - Profile performance at larger grid sizes and refine data structures if needed.
