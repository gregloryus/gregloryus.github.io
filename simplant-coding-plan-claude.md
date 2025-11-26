# Simplant: Comprehensive Coding Plan
### Reconciled from Two Planning Approaches

---

## Executive Summary

This plan synthesizes two complementary approaches:
- **Architecture & Genetics**: ChatGPT's superior Plant/GeneNode/Cell separation with pre-decoded tree structure
- **Implementation Details**: Claude's concrete file borrowing, rendering specifics, and PixiJS integration

The result is an elegant, maintainable system that cleanly separates genetic logic from spatial instantiation while being grounded in proven code patterns from existing projects.

---

## Part 1: Architecture Overview

### 1.1 Core Design Philosophy

**Three-Layer Separation:**
1. **Genetic Layer** (GeneNode tree): The blueprint - genome decoded into a tree structure
2. **Plant Layer** (Plant object): Per-plant state - energy, reproduction, lifecycle
3. **Spatial Layer** (PlantCell instances): Grid instantiation - actual cells occupying space

**Why This Matters:**
- Genetic operations (mutation, encoding/decoding) don't touch grid logic
- Growth logic walks the GeneNode tree to find what to instantiate next
- Clean separation enables unit testing each layer independently

### 1.2 Key Data Structures

```
Plant {
  id, genome, rootNode, energy, seed, reproPhase, childGenome
}
  ↓
GeneNode (tree) {
  geneBits, parent, children[3], cell, grownMask
}
  ↓
PlantCell (grid instances) {
  pos, plant, node, sprite, parent, cooldown
}
```

**Separate Concerns:**
- `TravelingSeed`: Airborne/attached seed during dispersal (not yet a plant)
- `SeedCell`: The root cell of an established plant
- `LightParticle`: Overlay sprites for energy flow (no grid ownership)

---

## Part 2: What to Borrow from Each File

### 2.1 From `aestheedlings-8.js` — SKELETON
**Use as base scaffold:**
- ✅ PixiJS initialization pattern (window-filling pixel grid)
- ✅ `OccupancyGrid` class (flat array, set/get/remove methods)
- ✅ Base `Particle` class pattern (pos, sprite, updatePosition)
- ✅ Global simulation structure:
  - `cells` array
  - `rows/cols` computed from window and `SCALE_SIZE`
  - `advanceTick()` pattern: update all → render
- ✅ Controls: P to pause, Space to single-step, Click to step when paused

**Why aestheedlings:**
- Cleanest CA-style skeleton
- Already object-based with minimal entanglement
- Good separation of update/render

### 2.2 From `rgbfields-12.js` — DETERMINISM & RENDERING
**Use for:**
- ✅ Seeded PRNG via URL param (`?seed=1337`)
  ```javascript
  let rngState = RNG_SEED;
  function rand() { /* xorshift32 */ }
  function randInt(n) { return Math.floor(rand() * n); }
  ```
- ✅ Efficient PixiJS rendering patterns:
  - Texture generation from graphics
  - Sprite scaling with `SCALE_SIZE`
  - `app.view.style.imageRendering = "pixelated"`
  - `app.renderer.roundPixels = true`
- ✅ Universal tick pattern separate from rendering
- ✅ Keyboard control patterns (all keys: p, space, r for stats, etc.)

**Why rgbfields:**
- Best determinism implementation
- Most polished rendering setup
- Proven performance patterns

### 2.3 From `cellspring-24.js` — PLANT RELATIONSHIPS
**Use conceptually:**
- ✅ Plant-level state pattern: energy tracked on root seed
- ✅ Parent-child references for tree traversal
  ```javascript
  class PlantCell {
    constructor(parent) {
      this.parent = parent;
      this.children = [];
      this.seed = this.getSeed(); // walk up to root
    }
    getSeed() {
      let cell = this;
      while (cell.parent) cell = cell.parent;
      return cell;
    }
  }
  ```
- ✅ Sprite management per cell (create on spawn, destroy on death)
- ✅ Root-based traversal for non-local operations

**Why cellspring:**
- Right object graph for per-plant bookkeeping
- Clean parent-child traversal patterns
- Proven cell lifecycle management

### 2.4 From `sunsweeper-10.js` — AIRBORNE SEEDS
**Use directly:**
- ✅ Airborne seed random walk pattern:
  ```javascript
  class TravelingSeed {
    constructor() {
      this.state = 'airborne'; // or 'attached'
      this.stepsTaken = 0;
      this.maxSteps = AIRBORNE_STEPS; // e.g., 40
    }
    updateAirborne() {
      // Random cardinal step, clamp to bounds
      // After maxSteps, try landing with Moore check
    }
  }
  ```
- ✅ Moore neighborhood empty check for landing:
  ```javascript
  checkMooreNeighborsEmpty(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (!isInBounds(x+dx, y+dy)) return false;
        if (occupancyGrid.get(x+dx, y+dy)) return false;
      }
    }
    return true;
  }
  ```

**Why sunsweeper:**
- Exactly matches the brief's seed dispersal
- Proven implementation ready to adapt

### 2.5 From `absorption-18.js` — LIGHT PARTICLES (Lightly)
**Use selectively:**
- ✅ Particle overlay pattern (no grid ownership)
  ```javascript
  class LightParticle {
    constructor(x, y) {
      this.sprite = new PIXI.Sprite(yellowTexture);
      this.sprite.alpha = 0.5;
      // Position but don't register in occupancy
    }
  }
  ```
- ✅ Parent-chain traversal for resource flow
- ❌ Don't use: layered grids, complex flow scheduling (overkill)

**Why selective use:**
- Need overlay particles for light visualization
- Parent-chain movement is perfect for our use case
- But its full system is too complex for our needs

### 2.6 From `triple_bit_trees.md` — GENETICS (Core)
**This is the heart:**
- ✅ 3-bit encoding [L, U, R] relative to facing direction
- ✅ 4 orientations (N, E, S, W) for spatial mapping
- ✅ Depth-first genome array interpretation
- ✅ Slot order: left → up → right (always)
- ✅ Mutation rules: flip bit → adjust tree structure

**Implementation approach:**
- Pre-decode genome into GeneNode tree at plant creation
- Tree manipulation functions for mutations
- Re-encode tree back to genome array after changes

---

## Part 3: Detailed Data Model

### 3.1 Core World State

```javascript
// Global state
let cols, rows, scaleSize;
let occupancyGrid; // PlantCell|SeedCell|null (flat array)
let plants = [];  // Plant[]
let travelingSeeds = []; // TravelingSeed[]
let lightParticles = []; // LightParticle[]
let frame = 0;
let paused = true;
let rngState = RNG_SEED;

// PIXI
let app;
let textures = {}; // seed, stem, light, etc.
```

### 3.2 Class Definitions

#### Plant (Per-plant state manager)
```javascript
class Plant {
  constructor(genome, seedCell) {
    this.id = idCounter++;
    this.genome = genome; // Uint8Array of 3-bit values
    this.rootNode = decodeGenomeToTree(genome);
    this.seed = seedCell; // SeedCell reference
    this.energy = 0;
    this.freeSproutUsed = false;
    
    // Reproduction state machine
    this.reproPhase = 'idle'; // 'idle' | 'planning' | 'charging'
    this.childGenome = null;
    this.childGeneCount = 0;
  }
  
  get geneCount() {
    return this.genome.length;
  }
  
  // Find all nodes that can grow
  getFrontierNodes() {
    const frontier = [];
    const stack = [this.rootNode];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node.cell) continue; // Not yet instantiated
      
      // Check each child slot
      for (let slot = 0; slot < 3; slot++) {
        if (node.children[slot] && !node.children[slot].cell) {
          // Child exists in genome but not yet grown
          if (!(node.grownMask & (1 << slot))) {
            frontier.push({node, slot});
          }
        }
      }
      
      // Continue traversing instantiated children
      node.children.forEach(child => {
        if (child && child.cell) stack.push(child);
      });
    }
    return frontier;
  }
}
```

#### GeneNode (Genetic blueprint)
```javascript
class GeneNode {
  constructor(geneBits) {
    this.geneBits = geneBits; // 0-7
    this.parent = null;
    this.children = [null, null, null]; // left, up, right
    this.slotFromParent = null; // 0, 1, or 2
    this.cell = null; // PlantCell when instantiated
    this.grownMask = 0; // Bits tracking which children are grown
  }
  
  hasChildInSlot(slot) {
    return (this.geneBits >> slot) & 1;
  }
  
  isChildGrown(slot) {
    return (this.grownMask >> slot) & 1;
  }
  
  markChildGrown(slot) {
    this.grownMask |= (1 << slot);
  }
}
```

#### SeedCell (Root of established plant)
```javascript
class SeedCell {
  constructor(x, y, plant) {
    this.pos = {x, y};
    this.plant = plant;
    this.node = plant.rootNode; // Root node
    this.parent = null; // Seeds have no parent
    this.children = [];
    this.cooldown = 0;
    
    // Sprite setup
    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.scale.set(scaleSize);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    app.stage.addChild(this.sprite);
    
    // Register in grid
    occupancyGrid.set(x, y, this);
    
    // Link back: node knows its cell
    this.node.cell = this;
  }
  
  getSeed() { return this; }
  
  germinate() {
    if (this.plant.freeSproutUsed) return;
    
    // Grow first sprout (010 = up only) for free
    const firstNode = this.node.children[1]; // up slot
    if (firstNode) {
      const pos = this.getChildPosForSlot(1);
      if (this.canGrowAt(pos)) {
        this.growChildInSlot(1);
        this.plant.freeSproutUsed = true;
      }
    }
  }
  
  getChildPosForSlot(slot) {
    // Seeds always face NORTH
    const offsets = [
      {dx: -1, dy: 0},  // left = west
      {dx: 0, dy: -1},  // up = north
      {dx: 1, dy: 0}    // right = east
    ];
    const off = offsets[slot];
    return {x: this.pos.x + off.dx, y: this.pos.y + off.dy};
  }
  
  canGrowAt(pos) {
    if (!isInBounds(pos.x, pos.y)) return false;
    return !occupancyGrid.get(pos.x, pos.y);
  }
  
  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    const pos = this.getChildPosForSlot(slot);
    const facing = this.getChildFacing(slot);
    
    const child = new PlantCell(pos.x, pos.y, this.plant, childNode, this, facing);
    this.children.push(child);
    this.node.markChildGrown(slot);
  }
  
  getChildFacing(slot) {
    // Seeds face north, children rotate
    const facings = ['W', 'N', 'E']; // left, up, right
    return facings[slot];
  }
}
```

#### PlantCell (Non-seed plant cells)
```javascript
class PlantCell {
  constructor(x, y, plant, node, parent, facing) {
    this.pos = {x, y};
    this.plant = plant;
    this.node = node;
    this.parent = parent; // SeedCell or PlantCell
    this.facing = facing; // 'N', 'E', 'S', 'W'
    this.children = [];
    this.cooldown = 0;
    
    // Sprite
    this.sprite = new PIXI.Sprite(textures.stem);
    this.sprite.scale.set(scaleSize);
    this.sprite.x = x * scaleSize;
    this.sprite.y = y * scaleSize;
    app.stage.addChild(this.sprite);
    
    // Register
    occupancyGrid.set(x, y, this);
    node.cell = this;
  }
  
  getSeed() {
    let cell = this;
    while (cell.parent) cell = cell.parent;
    return cell;
  }
  
  getChildPosForSlot(slot) {
    // Compute relative to facing
    const dirMap = {
      'N': [{dx: -1, dy: 0}, {dx: 0, dy: -1}, {dx: 1, dy: 0}],
      'E': [{dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}],
      'S': [{dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}],
      'W': [{dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 0, dy: -1}]
    };
    const off = dirMap[this.facing][slot];
    return {x: this.pos.x + off.dx, y: this.pos.y + off.dy};
  }
  
  getChildFacing(slot) {
    // Rotate based on slot
    const rotations = {
      'N': ['W', 'N', 'E'],
      'E': ['N', 'E', 'S'],
      'S': ['E', 'S', 'W'],
      'W': ['S', 'W', 'N']
    };
    return rotations[this.facing][slot];
  }
  
  canGrowAt(pos) {
    if (!isInBounds(pos.x, pos.y)) return false;
    return !occupancyGrid.get(pos.x, pos.y);
  }
  
  growChildInSlot(slot) {
    const childNode = this.node.children[slot];
    const pos = this.getChildPosForSlot(slot);
    const facing = this.getChildFacing(slot);
    
    const child = new PlantCell(pos.x, pos.y, this.plant, childNode, this, facing);
    this.children.push(child);
    this.node.markChildGrown(slot);
  }
  
  hasThreeOpenSpaces() {
    const cardinals = [
      {dx: 0, dy: -1}, {dx: 1, dy: 0},
      {dx: 0, dy: 1}, {dx: -1, dy: 0}
    ];
    let open = 0;
    for (const {dx, dy} of cardinals) {
      const nx = this.pos.x + dx;
      const ny = this.pos.y + dy;
      if (isInBounds(nx, ny) && !occupancyGrid.get(nx, ny)) {
        open++;
      }
    }
    return open >= 3;
  }
}
```

#### LightParticle (Energy visualization)
```javascript
class LightParticle {
  constructor(cell) {
    this.cell = cell; // Current cell position
    this.plant = cell.plant;
    
    // Sprite (overlay, no grid registration)
    this.sprite = new PIXI.Sprite(textures.light);
    this.sprite.alpha = 0.5;
    this.sprite.scale.set(scaleSize);
    this.sprite.x = cell.pos.x * scaleSize;
    this.sprite.y = cell.pos.y * scaleSize;
    app.stage.addChild(this.sprite);
  }
  
  update() {
    if (this.cell.parent) {
      // Move to parent
      this.cell = this.cell.parent;
      this.sprite.x = this.cell.pos.x * scaleSize;
      this.sprite.y = this.cell.pos.y * scaleSize;
    } else {
      // Reached seed
      this.plant.energy++;
      this.destroy();
    }
  }
  
  destroy() {
    app.stage.removeChild(this.sprite);
    lightParticles = lightParticles.filter(p => p !== this);
  }
}
```

#### TravelingSeed (Dispersing seed)
```javascript
class TravelingSeed {
  constructor(plant, childGenome) {
    this.state = 'attached'; // 'attached' | 'airborne'
    this.parentPlant = plant;
    this.childGenome = childGenome;
    this.currentNode = plant.rootNode; // Start at seed
    
    // Airborne properties (used later)
    this.pos = null;
    this.stepsTaken = 0;
    this.maxSteps = AIRBORNE_STEPS;
    this.sprite = null;
  }
  
  updateAttached() {
    // Find children with cells
    const childCells = this.currentNode.children
      .filter(child => child && child.cell);
    
    if (childCells.length > 0) {
      // Randomly pick one and move there
      const next = childCells[randInt(childCells.length)];
      this.currentNode = next;
    } else {
      // No children, become airborne
      this.becomeAirborne();
    }
  }
  
  becomeAirborne() {
    this.state = 'airborne';
    this.pos = {
      x: this.currentNode.cell.pos.x,
      y: this.currentNode.cell.pos.y
    };
    this.stepsTaken = 0;
    
    // Create sprite
    this.sprite = new PIXI.Sprite(textures.seed);
    this.sprite.alpha = 0.8;
    this.sprite.scale.set(scaleSize);
    this.sprite.x = this.pos.x * scaleSize;
    this.sprite.y = this.pos.y * scaleSize;
    app.stage.addChild(this.sprite);
  }
  
  updateAirborne() {
    if (this.stepsTaken >= this.maxSteps) {
      this.tryLand();
      return;
    }
    
    // Random cardinal step
    const dirs = [{dx:0,dy:-1}, {dx:1,dy:0}, {dx:0,dy:1}, {dx:-1,dy:0}];
    const dir = dirs[randInt(4)];
    this.pos.x = Math.max(0, Math.min(cols-1, this.pos.x + dir.dx));
    this.pos.y = Math.max(0, Math.min(rows-1, this.pos.y + dir.dy));
    
    this.sprite.x = this.pos.x * scaleSize;
    this.sprite.y = this.pos.y * scaleSize;
    this.stepsTaken++;
  }
  
  tryLand() {
    if (checkMooreNeighborsEmpty(this.pos.x, this.pos.y)) {
      // Create new plant!
      const newPlant = createPlant(this.childGenome, this.pos.x, this.pos.y);
      plants.push(newPlant);
      newPlant.seed.germinate();
    }
    
    // Either way, this seed is done
    this.destroy();
  }
  
  destroy() {
    if (this.sprite) {
      app.stage.removeChild(this.sprite);
    }
    travelingSeeds = travelingSeeds.filter(s => s !== this);
  }
}
```

---

## Part 4: Genetics System

### 4.1 Genome Encoding/Decoding

```javascript
// Decode flat genome array into GeneNode tree
function decodeGenomeToTree(genome) {
  let index = 0;
  
  function buildNode() {
    if (index >= genome.length) return null;
    
    const geneBits = genome[index++];
    const node = new GeneNode(geneBits);
    
    // Create children in L→U→R order
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

// Encode GeneNode tree back to flat array
function encodeTreeToGenome(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    result.push(node.geneBits);
    
    // Traverse children in L→U→R order
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) {
        traverse(node.children[slot]);
      }
    }
  }
  
  traverse(root);
  return new Uint8Array(result);
}
```

### 4.2 Mutation Functions

```javascript
function mutateGenome(genome) {
  // Clone genome
  const newGenome = new Uint8Array(genome);
  
  // Pick random bit to flip
  const geneIdx = randInt(newGenome.length);
  const bitIdx = randInt(3);
  
  // Decode to tree
  let root = decodeGenomeToTree(newGenome);
  
  // Find target node
  const targetNode = getNodeAtIndex(root, geneIdx);
  const bitMask = 1 << bitIdx;
  const wasBitSet = (targetNode.geneBits & bitMask) !== 0;
  
  // Flip the bit
  targetNode.geneBits ^= bitMask;
  
  if (wasBitSet) {
    // Was 1→0: remove child subtree
    targetNode.children[bitIdx] = null;
  } else {
    // Was 0→1: add new random child
    const newGeneBits = randInt(8); // 0-7
    const newChild = new GeneNode(newGeneBits);
    targetNode.children[bitIdx] = newChild;
    newChild.parent = targetNode;
    newChild.slotFromParent = bitIdx;
  }
  
  // Re-encode
  return encodeTreeToGenome(root);
}

function getNodeAtIndex(root, index) {
  let current = 0;
  let result = null;
  
  function traverse(node) {
    if (!node) return;
    if (current === index) {
      result = node;
      return;
    }
    current++;
    for (let slot = 0; slot < 3; slot++) {
      if (node.children[slot]) traverse(node.children[slot]);
    }
  }
  
  traverse(root);
  return result;
}
```

---

## Part 5: Main Loop & Systems

### 5.1 Tick Sequencing

```javascript
function advanceTick() {
  frame++;
  
  // 1. GROWTH PHASE
  for (const plant of plants) {
    if (plant.energy < 1 && plant.freeSproutUsed) continue;
    
    // Get frontier nodes (cells that can grow)
    const frontier = plant.getFrontierNodes();
    
    for (const {node, slot} of frontier) {
      if (plant.energy >= 1 || !plant.freeSproutUsed) {
        const pos = node.cell.getChildPosForSlot(slot);
        if (node.cell.canGrowAt(pos)) {
          node.cell.growChildInSlot(slot);
          
          if (plant.freeSproutUsed) {
            plant.energy--;
          }
          
          break; // Only one cell per plant per tick
        } else {
          // Blocked - mark as attempted
          node.markChildGrown(slot);
        }
      }
    }
  }
  
  // 2. LIGHT ABSORPTION PHASE
  for (const plant of plants) {
    const allCells = getAllCells(plant);
    for (const cell of allCells) {
      if (cell.cooldown > 0) {
        cell.cooldown--;
        continue;
      }
      
      if (cell.hasThreeOpenSpaces()) {
        if (rand() < LIGHT_ABSORB_PROB) {
          const light = new LightParticle(cell);
          lightParticles.push(light);
          cell.cooldown = LIGHT_COOLDOWN;
        }
      }
    }
  }
  
  // 3. LIGHT PROPAGATION
  for (const light of [...lightParticles]) {
    light.update();
  }
  
  // 4. REPRODUCTION PHASE
  for (const plant of plants) {
    updateReproduction(plant);
  }
  
  // 5. SEED TRANSPORT
  for (const seed of [...travelingSeeds]) {
    if (seed.state === 'attached') {
      seed.updateAttached();
    } else {
      seed.updateAirborne();
    }
  }
  
  // 6. RENDER
  app.renderer.render(app.stage);
}
```

### 5.2 Reproduction System

```javascript
function updateReproduction(plant) {
  const G = plant.geneCount;
  
  switch (plant.reproPhase) {
    case 'idle':
      if (plant.energy >= G) {
        // Start planning child
        plant.childGenome = (rand() < 0.5) 
          ? mutateGenome(plant.genome)
          : new Uint8Array(plant.genome);
        plant.childGeneCount = plant.childGenome.length;
        plant.reproPhase = 'charging';
      }
      break;
      
    case 'charging':
      if (plant.energy >= G + plant.childGeneCount) {
        // Spawn traveling seed
        const seed = new TravelingSeed(plant, plant.childGenome);
        travelingSeeds.push(seed);
        
        // Deduct cost
        plant.energy -= plant.childGeneCount;
        
        // Reset
        plant.reproPhase = 'idle';
        plant.childGenome = null;
        plant.childGeneCount = 0;
      }
      break;
  }
}
```

### 5.3 Helper Functions

```javascript
function getAllCells(plant) {
  const cells = [];
  const stack = [plant.seed];
  
  while (stack.length > 0) {
    const cell = stack.pop();
    cells.push(cell);
    stack.push(...cell.children);
  }
  
  return cells;
}

function isInBounds(x, y) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function checkMooreNeighborsEmpty(x, y) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!isInBounds(x+dx, y+dy)) return false;
      if (occupancyGrid.get(x+dx, y+dy)) return false;
    }
  }
  return true;
}
```

---

## Part 6: Initialization

### 6.1 Setup

```javascript
// Initialize PIXI (from aestheedlings/rgbfields patterns)
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
  antialias: false
});
document.getElementById('canvas-div').appendChild(app.view);

// Crisp pixels (from rgbfields)
app.view.style.imageRendering = 'pixelated';
app.renderer.roundPixels = true;

// Grid dimensions
const scaleSize = 8; // tweakable
const cols = Math.floor(window.innerWidth / scaleSize);
const rows = Math.floor(window.innerHeight / scaleSize);

// Occupancy grid
class OccupancyGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Array(cols * rows).fill(null);
  }
  
  getIndex(x, y) { return y * this.cols + x; }
  
  set(x, y, cell) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = cell;
    }
  }
  
  get(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      return this.grid[this.getIndex(x, y)];
    }
    return null;
  }
  
  remove(x, y) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[this.getIndex(x, y)] = null;
    }
  }
}

const occupancyGrid = new OccupancyGrid(cols, rows);
```

### 6.2 Textures

```javascript
// Generate textures (from rgbfields pattern)
const textures = {};

function createTexture(color, alpha = 1.0) {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(color, alpha);
  graphics.drawRect(0, 0, 1, 1);
  graphics.endFill();
  return app.renderer.generateTexture(graphics);
}

textures.seed = createTexture(0x8b4513);  // brown
textures.stem = createTexture(0x228b22);  // green
textures.light = createTexture(0xffff00); // yellow
```

### 6.3 PRNG (from rgbfields)

```javascript
// Seeded RNG
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(params.get('seed') || '1337', 10);
let rngState = (isFinite(seedParam) ? seedParam : 1337) >>> 0;

function rand() {
  // xorshift32
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return ((rngState >>> 0) / 0x100000000);
}

function randInt(n) {
  return Math.floor(rand() * n);
}
```

### 6.4 Initial Seeds

```javascript
// Tunable parameters
const NUM_STARTER_SEEDS = 64;
const DEFAULT_GENOME = new Uint8Array([0b010, 0b010, 0b010, 0b000]);

// Place starter seeds
function initializeSeeds() {
  const chosen = new Set();
  
  while (chosen.size < NUM_STARTER_SEEDS) {
    const idx = randInt(cols * rows);
    chosen.add(idx);
  }
  
  for (const idx of chosen) {
    const x = idx % cols;
    const y = Math.floor(idx / cols);
    
    // Half get mutation, half stay default
    const genome = (rand() < 0.5) 
      ? mutateGenome(DEFAULT_GENOME)
      : new Uint8Array(DEFAULT_GENOME);
    
    const plant = createPlant(genome, x, y);
    plants.push(plant);
  }
}

function createPlant(genome, x, y) {
  const plant = new Plant(genome, null);
  const seed = new SeedCell(x, y, plant);
  plant.seed = seed;
  return plant;
}

initializeSeeds();
```

---

## Part 7: Controls & UI

### 7.1 Keyboard Controls (from rgbfields pattern)

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    if (paused) advanceTick();
    e.preventDefault();
  }
  
  if (e.key === 'p' || e.key === 'P') {
    paused = !paused;
    console.log(paused ? 'PAUSED' : 'RUNNING');
  }
  
  if (e.key === 'r' || e.key === 'R') {
    // Print stats
    console.log('=== STATS ===');
    console.log('Frame:', frame);
    console.log('Plants:', plants.length);
    console.log('Traveling seeds:', travelingSeeds.length);
    console.log('Light particles:', lightParticles.length);
    
    for (const plant of plants) {
      const cellCount = getAllCells(plant).length;
      console.log(`Plant ${plant.id}: ${cellCount} cells, ${plant.energy} energy`);
    }
  }
});
```

### 7.2 Auto-tick Loop

```javascript
const TICK_INTERVAL_MS = 100; // tweakable

setInterval(() => {
  if (!paused) {
    advanceTick();
  }
}, TICK_INTERVAL_MS);

// Rendering loop (separate for smooth visuals)
function renderLoop() {
  app.renderer.render(app.stage);
  requestAnimationFrame(renderLoop);
}
renderLoop();
```

---

## Part 8: Tunable Constants

```javascript
// All constants in one place for easy tweaking
const CONSTANTS = {
  // World
  SCALE_SIZE: 8,
  NUM_STARTER_SEEDS: 64,
  
  // Genetics
  DEFAULT_GENOME: [0b010, 0b010, 0b010, 0b000],
  MUTATION_CHANCE: 0.5, // at reproduction
  PRE_MUTATION_CHANCE: 0.5, // for initial seeds
  
  // Energy
  LIGHT_ABSORB_PROB: 0.03,
  LIGHT_COOLDOWN: 10, // ticks
  
  // Seeds
  AIRBORNE_STEPS: 40,
  
  // Simulation
  TICK_INTERVAL_MS: 100,
  RNG_SEED: 1337
};
```

---

## Part 9: Implementation Order

### Phase 1: Foundation (Day 1)
1. Set up PIXI from aestheedlings pattern
2. Implement OccupancyGrid
3. Implement PRNG from rgbfields
4. Create basic textures

### Phase 2: Genetics (Day 1-2)
5. Implement GeneNode class
6. Implement decodeGenomeToTree()
7. Implement encodeTreeToGenome()
8. Test with simple genomes
9. Implement mutation functions
10. Unit test mutations

### Phase 3: Plant Structure (Day 2-3)
11. Implement Plant class
12. Implement SeedCell class
13. Implement PlantCell class
14. Test manual plant creation
15. Test getFrontierNodes()

### Phase 4: Growth (Day 3)
16. Implement growth tick logic
17. Test single plant growing
18. Test multiple plants
19. Test facing directions (N/E/S/W)
20. Test blocked growth

### Phase 5: Energy (Day 4)
21. Implement LightParticle class
22. Implement light absorption (3 open spaces check)
23. Implement light propagation up parent chain
24. Test energy accumulation

### Phase 6: Reproduction (Day 4-5)
25. Implement reproduction state machine
26. Implement TravelingSeed class (attached phase)
27. Implement TravelingSeed airborne phase
28. Test seed landing
29. Test germination

### Phase 7: Polish (Day 5)
30. Add keyboard controls
31. Add stats display
32. Tune constants
33. Add visual feedback (cooldown indicators, etc.)
34. Performance optimization if needed

---

## Part 10: Key Design Decisions

### Why GeneNode Tree?
- **Pro**: Clean separation of genetics from spatial instantiation
- **Pro**: Mutations operate on tree structure, not grid
- **Pro**: Easy to encode/decode for serialization
- **Con**: Extra memory overhead
- **Decision**: Worth it for maintainability

### Why TravelingSeed Separate from SeedCell?
- **Pro**: Clear lifecycle: traveling → landing → established plant
- **Pro**: Easier to visualize (different sprites)
- **Pro**: No confusion about which seeds are "real" plants
- **Decision**: Cleaner architecture

### Why One Cell Per Plant Per Tick?
- **Pro**: Matches brief exactly
- **Pro**: Creates natural growth pacing
- **Pro**: Prevents runaway growth
- **Decision**: Core constraint, non-negotiable

### Why Pre-decode Genome?
- **Pro**: Avoids complex index calculations
- **Pro**: Makes frontier finding simple
- **Pro**: Enables elegant mutation operations
- **Con**: Memory overhead
- **Decision**: Worth it for code clarity

---

## Part 11: Open Questions & Future Work

### Tweaking Knobs (Post-v1)
1. Should blocked growth be permanent or retry?
2. Should light only spawn at true tips (no ungrown children)?
3. Should there be initial seed energy bootstrap?
4. Should reproduction drain all energy or just cost?

### Performance Optimization (If Needed)
1. Spatial hashing for light absorption checks
2. Dirty flags to avoid checking static plants
3. Object pooling for particles
4. Uint8Array for cooldowns parallel to grid

### Future Features
1. Visual genome display
2. Plant aging/death
3. Seasonal cycles
4. Multiple plant "species" with different base genomes
5. Evolutionary statistics tracking
6. Replay system using RNG seed

---

## Conclusion

This plan synthesizes:
- **ChatGPT's superior architecture**: Plant/GeneNode/Cell separation, TravelingSeed, reproduction phases
- **Claude's concrete implementation**: Specific file borrowing, PixiJS details, PRNG, controls

The result is an elegant, maintainable system that cleanly separates genetic logic from spatial instantiation while being grounded in proven patterns from existing projects.

**Start with Phase 1-2** (foundation + genetics) to validate the core architecture, then build up systematically.
