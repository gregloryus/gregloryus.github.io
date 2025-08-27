Core Foundation: pixiching-optimized-7-ff-working.js

Base particle system with modes
Main update loop structure
Fast-forward capability

Water Physics: monochromagic-10.js

Direction persistence (fallingDirection)
Movement priority logic

Genetics System (two-part):

spring-fall-sand-garden-40-train.js: Growth execution, plant lifecycle
farming-plants-19.js: Mutation algorithms, fitness tracking

Infrastructure: aestheedlings-8.js

OccupancyGrid class
Crown shyness logic (checkEmptyMooreNeighborhoodExcludingParent)
PIXI.js setup patterns

Resource System: cellspring-22-working.js

Parent/child connections
Resource distribution through plant network

Vapor Mechanics: Hybrid approach

Movement from pixiching-optimized-7-ff-working.js
Phase transitions from falling-sand-16.js

Implementation Order:

Start with pixiching as base
Replace its grid with aestheedlings' OccupancyGrid
Enhance water movement with monochromagic's logic
Add plant genetics from spring-fall-sand + farming-plants
Integrate resource flow from cellspring
Fine-tune vapor condensation from falling-sand

What to Explicitly Avoid:

Sun/Moon orbital mechanics (not in brief)
Force-based physics (too complex)
Multiple grid systems (prevGrid/nextGrid) - use single grid
Root visualization (brief specifies seed-as-root)

## DETAILED BORROWING ANALYSIS FROM farming-plants-19.js

### 🧬 Genetics System - HIGH PRIORITY BORROWING

**Current Problem**: absorption-4.js uses complex object-based genetics:

```javascript
this.genes = {
  internodeSpacing: 8,
  budGrowthLimit: 4,
  cellLifespan: 1000,
  // Complex parameters
};
```

**farming-plants-19.js Solution**: Simple binary arrays representing growth decisions:

```javascript
this.genes = [
  [0, 1, 0], // left, middle, right growth pattern
  [0, 1, 0], // next level decisions
  // Clean 3-slot binary decisions
];
```

**Borrowing Strategy**: Replace PlantGenetics class with simple 2D binary arrays. Each gene array represents a "growth step" with [left, forward, right] binary decisions. Much more evolvable and interpretable.

### 🔄 Mutation Algorithm - EXCELLENT BORROWING TARGET

**Current Problem**: absorption-4.js uses basic bit-flipping mutation without sophistication.

**farming-plants-19.js Solution**: Recency-based mutation with intelligent gene pruning:

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

**Why Superior**:

- Recent genetic additions are more likely to be pruned
- Creates natural pressure against excessive complexity
- Mimics real evolutionary pressure where recent mutations are tested first
- Much more elegant than random bit-flipping

**Borrowing Strategy**: Replace mutation logic in PlantGenetics.mutate() with this recency-based approach.

### 🏆 Global Fitness Tracking - PERFECT BRIEF ALIGNMENT

**Current Gap**: absorption-4.js lacks the global fitness tracking specified in Brief Section 8.

**farming-plants-19.js Implementation**:

```javascript
let highestEnergy = -100;
let highestEnergyGenes = [];
let highestEnergyColor;

// In draw loop:
if (particle.energyCount > highestEnergy) {
  particle.flashing = true; // Visual feedback
  highestEnergy = particle.energyCount;
  highestEnergyGenes = particle.genes;
  genePool = [JSON.parse(JSON.stringify(highestEnergyGenes))];
  console.log(`new high: ${highestEnergy}`);
}
```

**Brief Requirement Match**:

- "Fitness Factors: Resource Access, Environmental adaptation"
- "Color Uniqueness: Flowers with most unique colors receive disproportionate fitness bonus"
- "Seed Budget: Scales with integrated SUN plus color rarity bonus"

**Borrowing Strategy**: Add global fitness tracking variables and integrate with the resource accumulation system in absorption-4.js.

### 🌱 Generation-Based Evolution - CLEAN RESET SYSTEM

**Current Gap**: absorption-4.js has continuous evolution but no generational structure.

**farming-plants-19.js Solution**: Clean generation reset with winner propagation:

```javascript
function mouseReleased() {
  // Clear old generation
  grid = make2DArray(columns, rows);
  particles = [];

  // Create winner with best genes
  let winner = new Plant(Math.floor(width / 2), Math.floor(height / 8));
  winner.genes = JSON.parse(JSON.stringify(highestEnergyGenes));
  winner.red = highestEnergyRed;
  winner.green = highestEnergyGreen;
  winner.blue = highestEnergyBlue;

  // Create mutated population
  for (i = 0; i < numOfSeeds; i++) {
    let particle = new Plant(randomPosition);
    particle.genes = JSON.parse(JSON.stringify(highestEnergyGenes));
    particle.mutateGenes(); // Apply recency-based mutation
  }
}
```

**Borrowing Strategy**: Implement manual generation advancement (spacebar trigger) that:

1. Identifies highest-fitness plant
2. Clears current population
3. Seeds new generation with mutated winners

### ⚡ Environmental Fitness Calculation - SIMPLE & EFFECTIVE

**Current Complexity**: absorption-4.js has sophisticated energy flow but no environmental fitness scoring.

**farming-plants-19.js Simplicity**: Direct environmental assessment:

```javascript
setEnergyValue() {
  this.energy = 0;
  // Count empty neighbors = fitness potential
  if (grid[this.grid.x][this.grid.y - 1].length == 0) this.energy++;
  if (grid[this.grid.x][this.grid.y + 1].length == 0) this.energy++;
  if (grid[this.grid.x - 1][this.grid.y].length == 0) this.energy++;
  if (grid[this.grid.x + 1][this.grid.y].length == 0) this.energy++;
}
```

**Why Valuable**:

- Direct environmental pressure measurement
- Rewards space efficiency (crown shyness)
- Simple to calculate and debug
- Aligns with Brief Section 8 "Environmental adaptation"

**Borrowing Strategy**: Add environmental fitness calculation to each plant cell, accumulate to plant-level fitness score.

### 🎨 Visual Feedback Systems - GREAT UX PATTERNS

**farming-plants-19.js Features**:

```javascript
// Flashing winner indication
if (this.core.flashing) {
  if (frameCount % 40 < 20) {
    this.opacity = 0;
  } else {
    this.opacity = 1;
  }
}

// Automatic generation advancement
let readyForNextGen = false;
if (auto && readyForNextGen) {
  readyForNextGen = false;
  mouseReleased(); // Trigger next generation
}
```

**Borrowing Strategy**: Add visual feedback for:

- Highest-fitness plants (flashing effect)
- Automatic generation progression option
- Clear fitness score display

### 📊 Gene Pool Management - EVOLUTIONARY MEMORY

**farming-plants-19.js Pattern**:

```javascript
let genePool = [];

// When new high-fitness plant found:
genePool = [JSON.parse(JSON.stringify(highestEnergyGenes))];

// Deep copying to prevent reference issues
particle.genes = JSON.parse(JSON.stringify(highestEnergyGenes));
```

**Borrowing Strategy**: Implement gene pool tracking for:

- Historical best performers
- Diversity metrics
- Mutation tracking

### 🚫 What NOT to Borrow from farming-plants-19.js

**Growth System**:

- farming-plants uses primitive 4-direction orientation system
- absorption-4.js has superior bud movement and plant hierarchy
- Keep current sophisticated growth patterns

**Grid Management**:

- farming-plants uses simple 2D array grid
- absorption-4.js layered occupancy system is more advanced
- Don't regress to simpler grid system

**Particle Types**:

- farming-plants only has basic "Plant" class
- absorption-4.js has proper seed/bud/stem/leaf/node hierarchy
- Keep sophisticated plant cell differentiation

### 🔧 Implementation Priority Order

1. **Genetics Simplification**: Replace complex genetics with binary arrays
2. **Mutation Algorithm**: Implement recency-based mutation
3. **Global Fitness**: Add highest-fitness tracking with visual feedback
4. **Environmental Fitness**: Add space-efficiency scoring
5. **Generation System**: Add manual generation reset capability
6. **Gene Pool**: Add evolutionary memory and diversity tracking

### 💡 Integration Notes

**Compatibility with Brief**: All farming-plants-19.js systems align perfectly with Brief Section 8 (Fitness & Selection) requirements.

**Performance Impact**: Binary gene arrays and simple fitness calculations should improve performance over current complex genetics.

**Debugging Benefits**: Simple binary genetics much easier to debug and visualize than complex object-based genetics.

**Evolution Effectiveness**: Recency-based mutation proven effective in farming-plants-19.js evolution results.
