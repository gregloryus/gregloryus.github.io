Yes: with the per-zone RNG approach I described, you can do what you want.

If you log something like:
• world size (cols, rows),
• which zone index you care about (e.g. z = 3),
• that zone’s height (zoneHeight),
• starter seed position for that zone (x = cols/2, y = some value),
• and that zone’s initial RNG seed (e.g. zoneRngState[3] = 1337),

then you can later spin up a single-zone build with:
• rows = zoneHeight,
• one seed at the same relative position,
• zoneRngState[0] = 1337,

and you’ll get the same sequence of random decisions and the same evolution, as long as:
• you use the same update order for plants/particles, and
• all randomness inside that zone uses randForZone(z) (not a shared global RNG).

Below is a self-contained code plan in Markdown you can hand to Cursor. It assumes your current single-zone Simplant is working and you want to add:
• stacked vertical zones,
• per-zone terrain + Tetris,
• per-zone RNG with reproducible zone behavior.

⸻

# Simplant Multi-Zone + Per-Zone RNG Design

## Goals

1. **Multiple vertical “zones”** stacked in one canvas:
   - Horizontal wrapping is still global (toroidal in X).
   - Each zone is a horizontal band with its own ground, Tetris clears, and extinction.
2. **Zones start with identical initial conditions**:
   - Same starter genome,
   - Same horizontal position (middle column),
   - Same relative vertical position within each band.
3. **Zones are _dynamically independent_ but _reproducible_**:
   - Each zone has its **own PRNG stream**.
   - Given:
     - zone height,
     - starter seed position,
     - per-zone RNG seed,
   - you can extract a single zone into a one-zone world and replay the exact same evolution.
4. **Minimal disruption to existing architecture**:
   - Keep:
     - one global `plants[]`,
     - one global `travelingSeeds[]`,
     - one global `fallingSand[]`,
     - one global `lightParticles[]`,
     - one global `OccupancyGrid`,
     - one global `sandGrid`.
   - Add:
     - zone metadata,
     - per-zone terrain and PRNG,
     - thin helper functions.
   - No need to introduce a full `Zone` class right now.

---

## Step 0 – Assumptions About Existing Code

The plan assumes:

- You already have:

  - `CONSTANTS.SCALE_SIZE`
  - `cols`, `rows` computed as:  
    `cols = floor(canvasWidth / SCALE_SIZE)`  
    `rows = floor(canvasHeight / SCALE_SIZE)`
  - A single `groundHeight[x]` used for terrain height.
  - A Tetris clear like `checkTetrisClear()` + `shiftWorldDown()`.
  - Global particle arrays: `plants`, `travelingSeeds`, `fallingSand`, `lightParticles`.
  - A global RNG along the lines of:

    ```js
    let rngState = CONSTANTS.RNG_SEED >>> 0;
    function rand() {
      rngState ^= rngState << 13;
      rngState ^= rngState >>> 17;
      rngState ^= rngState << 5;
      return (rngState >>> 0) / 0x100000000;
    }
    function randInt(n) {
      return Math.floor(rand() * n);
    }
    ```

- You can search for `rand(` or similar to find all randomness sites.

If any of this differs, adjust names, but keep the structure.

---

## Step 1 – New Constants and Globals

### 1.1. Zone layout constants

Add near your other `CONSTANTS`:

```js
const CONSTANTS = {
  // ...existing constants...

  // Minimum vertical cell height of a zone, in *grid cells*,
  // NOT pixels. If SCALE_SIZE = 2 pixels, this corresponds
  // to 200 pixels of vertical height.
  MIN_ZONE_HEIGHT_CELLS: 100,

  // Optional: cap max number of zones (to avoid 20 tiny bands on tall displays)
  MAX_ZONES: 4,
};

1.2. Zone state globals

Add near your global variables:

// --- Multi-zone layout ---
let numZones = 1;           // number of vertical bands
let zoneHeight = 0;         // nominal height of each band in cells
let zoneBounds = [];        // [{ topY, bottomY }, ...], in global grid coords

// Per-zone terrain heights: groundHeight[z][x] = number of terrain cells in this column inside this zone
let groundHeightZones = []; // 2D: [zoneIndex][x]

// --- Per-zone RNG state ---
let zoneRngState = [];      // zoneRngState[z] = uint32 PRNG state for that zone

Note: we’ll keep your existing global rngState for now if you use it anywhere else, but all zone-local randomness (growth, light, seeds, mutation) will go through per-zone RNG.

⸻

Step 2 – Zone Layout in init()

In your init() (or wherever you currently compute cols and rows), after rows and cols are set, compute the zone layout:

function init() {
  // ... existing PIXI setup ...

  cols = Math.floor(app.view.width / CONSTANTS.SCALE_SIZE);
  rows = Math.floor(app.view.height / CONSTANTS.SCALE_SIZE);

  computeZones();
  initPerZoneTerrain();
  initPerZoneRng();

  // ... textures, UI ...

  initializeSeeds();

  // ... ticker, event listeners ...
}

Add the helper functions:

function computeZones() {
  // Minimum zone height in cells
  const minZoneCells = CONSTANTS.MIN_ZONE_HEIGHT_CELLS;

  // How many zones fit if each has at least minZoneCells?
  const possibleZones = Math.floor(rows / minZoneCells);

  numZones = Math.max(1, possibleZones);
  if (CONSTANTS.MAX_ZONES && numZones > CONSTANTS.MAX_ZONES) {
    numZones = CONSTANTS.MAX_ZONES;
  }

  // Nominal height if we split evenly
  zoneHeight = Math.floor(rows / numZones);

  zoneBounds = [];
  for (let z = 0; z < numZones; z++) {
    const topY = z * zoneHeight;
    const isLast = (z === numZones - 1);
    const bottomY = isLast ? (rows - 1) : (topY + zoneHeight - 1);

    zoneBounds.push({ topY, bottomY });
  }
}

function initPerZoneTerrain() {
  groundHeightZones = [];
  for (let z = 0; z < numZones; z++) {
    groundHeightZones[z] = new Array(cols).fill(0);
  }
}

function initPerZoneRng() {
  zoneRngState = [];

  // You can derive this from URL params or a constant
  const baseSeed = (CONSTANTS.RNG_SEED >>> 0) || 1;

  for (let z = 0; z < numZones; z++) {
    // Use a different initial seed per zone,
    // but deterministic and easy to log.
    const seed = (baseSeed + (z + 1) * 0x9e3779b9) >>> 0;
    zoneRngState[z] = seed;
  }
}


⸻

Step 3 – Coordinate Helpers

3.1. Get zone index from a global y

Add:

function getZoneIndexFromY(y) {
  // Simple version: use zoneHeight, clamp to [0, numZones-1].
  // This assumes vertical bands are contiguous & in order.
  const z = Math.floor(y / zoneHeight);
  if (z < 0) return 0;
  if (z >= numZones) return numZones - 1;
  return z;
}

You can also choose to use zoneBounds explicitly if you prefer, but this is fine given we constructed bands with even heights, and the last band eats the remainder.

3.2. Zone-aware wrapping

Keep your existing global wrapCoords if other code uses it, but add a zone-aware version for entities that are confined to a zone:

function wrapCoordsInZone(x, y, zoneIndex) {
  const wx = (x + cols) % cols;

  const { topY, bottomY } = zoneBounds[zoneIndex];
  let wy = y;
  if (wy < topY) wy = topY;
  if (wy > bottomY) wy = bottomY;

  return { x: wx, y: wy };
}

Use this for:
	•	Seed random walk,
	•	Plant child placement,
	•	Any per-zone random motion.

⸻

Step 4 – Per-Zone RNG Functions

Replace zone-local uses of rand() and randInt() with per-zone versions. Keep rand() if you need it for truly global stuff, but don’t use it for plant/seed/light behavior.

Add:

function randForZone(z) {
  let s = zoneRngState[z] >>> 0;
  // xorshift32
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  zoneRngState[z] = s >>> 0;
  return (s >>> 0) / 0x100000000;
}

function randIntForZone(z, n) {
  return Math.floor(randForZone(z) * n);
}

Replay note:
The initial seed for each zone (zoneRngState[z] after initPerZoneRng) is exactly what you’ll log if you want to replay zone z later.

⸻

Step 5 – Terrain Helpers (Per Zone)

Replace your existing single-terrain logic with zone-aware functions.

5.1. Checking terrain at (x, y)

function isTerrain(x, y) {
  if (y < 0 || y >= rows) return false;

  const gx = (x + cols) % cols;
  const z = getZoneIndexFromY(y);
  const { topY, bottomY } = zoneBounds[z];

  const zoneHeightCells = bottomY - topY + 1;
  const localHeight = groundHeightZones[z][gx]; // 0..zoneHeightCells

  if (localHeight <= 0) return false;

  const terrainStartLocal = zoneHeightCells - localHeight;
  const terrainStartGlobal = topY + terrainStartLocal;

  return y >= terrainStartGlobal;
}

5.2. First empty cell above terrain in a given zone and column

function firstEmptyAboveTerrainInZone(z, x) {
  const gx = (x + cols) % cols;
  const { topY, bottomY } = zoneBounds[z];
  const zoneHeightCells = bottomY - topY + 1;
  const localHeight = groundHeightZones[z][gx];

  if (localHeight === 0) {
    // No terrain yet, root can sit at bottomY
    return bottomY;
  }

  const terrainStartLocal = zoneHeightCells - localHeight;
  const rootLocal = terrainStartLocal - 1;
  if (rootLocal < 0) return -1; // no space above terrain

  return topY + rootLocal; // global y
}

5.3. Height above terrain

If you need it:

function heightAboveTerrain(x, y) {
  const gx = (x + cols) % cols;
  const z = getZoneIndexFromY(y);
  const { topY, bottomY } = zoneBounds[z];
  const zoneHeightCells = bottomY - topY + 1;
  const localHeight = groundHeightZones[z][gx];

  if (localHeight === 0) return Infinity;

  const terrainStartLocal = zoneHeightCells - localHeight;
  const terrainStartGlobal = topY + terrainStartLocal;
  return y - terrainStartGlobal; // >= 0 means above terrain
}


⸻

Step 6 – Drawing Terrain Per Zone

Replace your old drawTerrain() with a zone-aware version:

function drawTerrain() {
  if (!terrainGfx) return;

  terrainGfx.clear();
  terrainGfx.beginFill(CONSTANTS.COLOR_TERRAIN);

  for (let z = 0; z < numZones; z++) {
    const { topY, bottomY } = zoneBounds[z];
    const zoneHeightCells = bottomY - topY + 1;

    for (let x = 0; x < cols; x++) {
      const h = groundHeightZones[z][x];
      if (h === 0) continue;

      const startLocal = zoneHeightCells - h;
      const startY = topY + startLocal;

      terrainGfx.drawRect(
        x * CONSTANTS.SCALE_SIZE,
        startY * CONSTANTS.SCALE_SIZE,
        CONSTANTS.SCALE_SIZE,
        h * CONSTANTS.SCALE_SIZE
      );
    }
  }

  terrainGfx.endFill();
}


⸻

Step 7 – Add zoneIndex to Entities

7.1. Plant

In Plant class:

class Plant {
  constructor(genome, seedCell, zoneIndex) {
    this.id = idCounter++;
    this.genome = genome;
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell;
    this.energy = 0;
    this.freeSproutUsed = false;

    this.zoneIndex = zoneIndex; // NEW

    // existing fields: cells, frontier, etc.
  }
}

7.2. SeedCell

class SeedCell {
  constructor(x, y, plant) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = plant.rootNode;
    this.parent = null;
    this.children = [];
    this.cooldown = 0;

    this.zoneIndex = plant.zoneIndex; // NEW

    // sprite: x,y in global coords
    // occupancyGrid registration: use global grid as before
  }

  // When computing child positions:
  getChildPosForSlot(slot) {
    // existing offsets...
  }

  canGrowAt(pos) {
    const { x, y } = wrapCoordsInZone(pos.x, pos.y, this.zoneIndex);
    return isCellEmpty(x, y); // uses global occupancyGrid
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return;

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoordsInZone(rawPos.x, rawPos.y, this.zoneIndex);

    const facing = this.getChildFacing(slot);

    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  hasClearForward5() {
    const offsets = [
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 0 },
    ];

    for (const { dx, dy } of offsets) {
      const { x: nx, y: ny } = wrapCoordsInZone(
        this.pos.x + dx,
        this.pos.y + dy,
        this.zoneIndex
      );
      if (!isCellEmpty(nx, ny)) return false;
    }
    return true;
  }
}

7.3. PlantCell

class PlantCell {
  constructor(x, y, plant, node, parent, facing) {
    this.pos = { x, y };
    this.plant = plant;
    this.node = node;
    this.parent = parent;
    this.facing = facing;
    this.children = [];
    this.cooldown = 0;

    this.zoneIndex = plant.zoneIndex; // NEW

    // sprite & occupancy registration as before
  }

  // In canGrowAt, growChildInSlot, hasClearForward5:
  canGrowAt(pos) {
    const { x, y } = wrapCoordsInZone(pos.x, pos.y, this.zoneIndex);
    return isCellEmpty(x, y);
  }

  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    if (!childNode) return;

    const rawPos = this.getChildPosForSlot(slot);
    const { x, y } = wrapCoordsInZone(rawPos.x, rawPos.y, this.zoneIndex);

    const facing = this.getChildFacing(slot);
    const child = new PlantCell(x, y, this.plant, childNode, this, facing);
    this.children.push(child);
  }

  // hasClearForward5: same pattern as SeedCell, but with direction-aware offsets,
  // always using wrapCoordsInZone(..., this.zoneIndex)
}

7.4. TravelingSeed

class TravelingSeed {
  constructor(plant, childGenome) {
    this.state = "attached";
    this.parentPlant = plant;
    this.childGenome = childGenome;
    this.currentNode = plant.rootNode;

    this.zoneIndex = plant.zoneIndex; // NEW

    this.pos = null;
    this.stepsTaken = 0;
    this.maxSteps = CONSTANTS.AIRBORNE_STEPS;
    this.sprite = null;
  }

  updateAttached() {
    // ... as before ...
    const childCells = this.currentNode.children.filter(
      (child) => child && child.cell
    );

    if (childCells.length > 0) {
      const z = this.zoneIndex;
      const idx = randIntForZone(z, childCells.length);
      const next = childCells[idx];
      this.currentNode = next;
    } else {
      this.becomeAirborne();
    }
  }

  becomeAirborne() {
    this.state = "airborne";
    this.pos = {
      x: this.currentNode.cell.pos.x,
      y: this.currentNode.cell.pos.y,
    };
    this.stepsTaken = 0;

    // sprite setup...
  }

  updateAirborne() {
    if (this.stepsTaken >= this.maxSteps) {
      this.tryLand();
      return;
    }

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    const z = this.zoneIndex;
    const dir = dirs[randIntForZone(z, dirs.length)];

    const { x, y } = wrapCoordsInZone(
      this.pos.x + dir.dx,
      this.pos.y + dir.dy,
      z
    );
    this.pos.x = x;
    this.pos.y = y;

    // sprite.x/y updates...

    this.stepsTaken++;
  }

  tryLand() {
    const x = this.pos.x;
    const y = this.pos.y;
    const z = this.zoneIndex;

    // Optionally ensure y is still inside this zone:
    if (getZoneIndexFromY(y) !== z) {
      this.destroy();
      return;
    }

    // Example: ensure root + neighbors are empty
    const rootY = firstEmptyAboveTerrainInZone(z, x);
    if (rootY < 0 || !isCellEmpty(x, rootY)) {
      this.destroy();
      return;
    }

    // etc; finally:
    const plant = createPlant(this.childGenome, x, rootY, z);
    plants.push(plant);

    this.destroy();
  }
}

7.5. FallingSand

class FallingSand {
  constructor(x, y) {
    this.col = (x + cols) % cols;
    this.y = y;
    this.zoneIndex = getZoneIndexFromY(y); // NEW

    // sprite + sandGrid registration...
    this.dead = false;
    this.settleTicks = CONSTANTS.SAND_SETTLE_DELAY;
  }

  deposit() {
    sandGrid.remove(this.col, this.y);

    const z = this.zoneIndex;
    const { topY, bottomY } = zoneBounds[z];
    const zoneHeightCells = bottomY - topY + 1;

    if (groundHeightZones[z][this.col] < zoneHeightCells) {
      groundHeightZones[z][this.col] += 1;
      drawTerrain();
    }

    this.dead = true;
    app.stage.removeChild(this.sprite);
  }
}


⸻

Step 8 – createPlant and Seed Initialization Per Zone

8.1. createPlant

Update createPlant to accept zoneIndex:

function createPlant(genome, x, y, zoneIndex) {
  const plant = new Plant(genome, null, zoneIndex);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

8.2. initializeSeeds() – one seed per zone

Replace your single-seed initializer with:

function initializeSeeds() {
  plants.length = 0;

  for (let z = 0; z < numZones; z++) {
    const { topY, bottomY } = zoneBounds[z];
    const x = Math.floor(cols / 2);

    let rootY = firstEmptyAboveTerrainInZone(z, x);
    if (rootY < 0) rootY = bottomY;

    const genome = new Uint8Array(DEFAULT_GENOME);
    const plant = createPlant(genome, x, rootY, z);
    plants.push(plant);
  }
}


⸻

Step 9 – Per-Zone Tetris

9.1. checkTetrisClear() per zone

Replace your old single-world Tetris check:

function checkTetrisClear() {
  if (frame % CONSTANTS.TETRIS_CHECK_INTERVAL !== 0) return;

  for (let z = 0; z < numZones; z++) {
    let minH = Infinity;
    for (let x = 0; x < cols; x++) {
      if (groundHeightZones[z][x] < minH) {
        minH = groundHeightZones[z][x];
      }
    }

    if (minH > 0 && minH < Infinity) {
      shiftWorldDownInZone(z);
    }
  }
}

9.2. shiftWorldDownInZone(z)

Implement something analogous to your existing shiftWorldDown, but limited to the band:

function shiftWorldDownInZone(z) {
  const { topY, bottomY } = zoneBounds[z];

  // 1. Reduce terrain one cell
  for (let x = 0; x < cols; x++) {
    if (groundHeightZones[z][x] > 0) {
      groundHeightZones[z][x]--;
    }
  }
  drawTerrain();

  // 2. Clear occupancy + sandGrid; we'll rebuild them from entities
  occupancyGrid.grid.fill(null);
  sandGrid.grid.fill(null);

  // 3. Move plant cells in this zone down by 1
  for (let i = plants.length - 1; i >= 0; i--) {
    const plant = plants[i];
    if (plant.zoneIndex !== z) {
      // Re-register cells for other zones as-is
      for (const cell of plant.cells) {
        occupancyGrid.set(cell.pos.x, cell.pos.y, cell);
      }
      continue;
    }

    let plantDead = false;
    for (const cell of plant.cells) {
      cell.pos.y += 1;
      cell.sprite.y += CONSTANTS.SCALE_SIZE;

      if (cell.pos.y > bottomY) {
        plantDead = true;
      }
    }

    if (plantDead) {
      plant.die();
      plants.splice(i, 1);
      continue;
    }

    for (const cell of plant.cells) {
      occupancyGrid.set(cell.pos.x, cell.pos.y, cell);
    }
  }

  // 4. Move falling sand in this zone
  for (let i = fallingSand.length - 1; i >= 0; i--) {
    const sand = fallingSand[i];
    if (sand.zoneIndex !== z) {
      sandGrid.set(sand.col, sand.y, sand);
      continue;
    }

    sand.y += 1;
    sand.sprite.y += CONSTANTS.SCALE_SIZE;

    if (sand.y > bottomY) {
      sand.dead = true;
      app.stage.removeChild(sand.sprite);
      fallingSand.splice(i, 1);
    } else {
      sandGrid.set(sand.col, sand.y, sand);
    }
  }

  // 5. Move traveling seeds in this zone
  for (const s of travelingSeeds) {
    if (!s.pos) continue;
    if (s.zoneIndex !== z) continue;

    s.pos.y += 1;
    if (s.sprite) {
      s.sprite.y = s.pos.y * CONSTANTS.SCALE_SIZE;
    }

    if (s.pos.y > bottomY) {
      s.destroy();
    }
  }

  // 6. Light particles: snap to their cells' positions
  for (const lp of lightParticles) {
    if (lp.cell) {
      lp.sprite.x = lp.cell.pos.x * CONSTANTS.SCALE_SIZE;
      lp.sprite.y = lp.cell.pos.y * CONSTANTS.SCALE_SIZE;
    }
  }
}


⸻

Step 10 – Zone-Based Extinction and Reseeding

10.1. Zone activity detection

In updateUI() (or a similar periodic function), after you compute counts, add:

function updateUI() {
  // ... existing FPS / particle text ...

  const zoneHasActivity = new Array(numZones).fill(false);

  // Plants
  for (const p of plants) {
    if (p.cells && p.cells.length > 0) {
      zoneHasActivity[p.zoneIndex] = true;
    }
  }

  // Traveling seeds
  for (const s of travelingSeeds) {
    if (!s.pos) continue;
    const z = s.zoneIndex;
    zoneHasActivity[z] = true;
  }

  // Falling sand
  for (const sand of fallingSand) {
    const z = sand.zoneIndex;
    zoneHasActivity[z] = true;
  }

  // Light particles (tie to their cell)
  for (const lp of lightParticles) {
    if (!lp.cell) continue;
    const z = lp.cell.zoneIndex;
    zoneHasActivity[z] = true;
  }

  // Reseed any dead zones
  for (let z = 0; z < numZones; z++) {
    if (!zoneHasActivity[z]) {
      spawnSeedInZone(z);
    }
  }

  // Optional: global hard reset if literally *nothing* is active
  const anyActivity = zoneHasActivity.some((v) => v);
  if (!anyActivity) {
    hardResetAllZones();
  }
}

10.2. spawnSeedInZone(z)

function spawnSeedInZone(z) {
  const { bottomY } = zoneBounds[z];
  const x = Math.floor(cols / 2);

  let rootY = firstEmptyAboveTerrainInZone(z, x);
  if (rootY < 0) rootY = bottomY;

  const genome = new Uint8Array(DEFAULT_GENOME);
  const plant = createPlant(genome, x, rootY, z);
  plants.push(plant);

  // Optional: tweak this zone's RNG seed after reseed
  // so a reset reuses a different random subsequence.
  // zoneRngState[z] = (zoneRngState[z] + 0x9e3779b9) >>> 0;
}

10.3. hardResetAllZones()

function hardResetAllZones() {
  frame = 0;

  // Clear terrain
  for (let z = 0; z < numZones; z++) {
    groundHeightZones[z].fill(0);
  }
  drawTerrain();

  // Remove all sprites
  for (const p of plants) {
    p.die();
  }
  for (const s of fallingSand) {
    app.stage.removeChild(s.sprite);
  }
  for (const lp of lightParticles) {
    app.stage.removeChild(lp.sprite);
  }
  for (const ts of travelingSeeds) {
    if (ts.sprite) app.stage.removeChild(ts.sprite);
  }

  plants.length = 0;
  fallingSand.length = 0;
  lightParticles.length = 0;
  travelingSeeds.length = 0;

  occupancyGrid = new OccupancyGrid(cols, rows);
  sandGrid = new OccupancyGrid(cols, rows);

  // Reinitialize RNG per zone if desired
  initPerZoneRng();

  initializeSeeds();
}


⸻

Step 11 – Route Randomness Through Per-Zone RNG

Search the code for all uses of your global RNG (rand, randInt, Math.random if any) that affect:
	•	plant growth / branching,
	•	light absorption spawning,
	•	reproduction (mutation decisions),
	•	seed drifting.

For each one:
	1.	Identify the zone index to use:
	•	If inside a plant method: const z = this.zoneIndex; or this.plant.zoneIndex.
	•	If inside a seed or sand method: const z = this.zoneIndex;.
	2.	Replace:

if (rand() < CONSTANTS.LIGHT_ABSORB_PROB) { ... }

with:

const z = this.zoneIndex; // or cell.zoneIndex / plant.zoneIndex
if (randForZone(z) < CONSTANTS.LIGHT_ABSORB_PROB) { ... }


	3.	Replace:

const idx = randInt(children.length);

with:

const idx = randIntForZone(z, children.length);


	4.	In mutateGenome, add a zoneIndex parameter and do:

function mutateGenome(genome, zoneIndex) {
  const newGenome = new Uint8Array(genome);

  let geneIdx = randIntForZone(zoneIndex, newGenome.length);
  // apply FORCE_SEED_STALK logic if needed, still using randIntForZone

  // when choosing new geneBits, also use randIntForZone(zoneIndex, 8)
}

And call it from reproduction as:

const z = plant.zoneIndex;
const mutated = mutateGenome(plant.genome, z);



This guarantees:
	•	Zone z uses only zoneRngState[z] for its randomness.
	•	Other zones cannot perturb that RNG stream.

⸻

Step 12 – Replaying a Single Zone

To replay a specific zone (say z = 3) that you observed in a multi-zone run:
	1.	Log the following when the run starts (or when you notice the interesting behavior):
	•	rows, cols,
	•	numZones,
	•	zoneHeight and zoneBounds[z],
	•	the starter seed coordinates for zone 3 (x0, y0),
	•	the initial RNG seed for zone 3: zoneRngState[3] right after initPerZoneRng() (and any reseed adjustments, if you add them).
	2.	To build a single-zone replay:
	•	Set up a version of the sim that uses numZones = 1 and rows = heightOfZone3 (e.g. zoneBounds[3].bottomY - zoneBounds[3].topY + 1).
	•	Use the same code for growth, Tetris, reproduction, etc., but:
	•	zoneIndex will always be 0.
	•	Initialize zoneRngState[0] to the logged seed that belonged to zone 3.
	•	Place the starter seed at the same relative coordinates:
	•	x = same x0,
	•	y = same offset inside the zone (i.e. y0 - topY_of_zone3 if you remapped to a single band starting at 0).
	3.	As long as:
	•	You iterate plants/seeds in the same deterministic order each tick.
	•	All randomness uses randForZone(0).
The replay will follow the same sequence of random decisions and reproduce the same evolution you saw in zone 3 of the multi-zone run.

⸻
```
