# Plant Simulation Enhancement Roadmap

## Current System Overview

Based on `absorption-16.js`, the current system features:

- **Particle-based simulation** with layered occupancy grids
- **Plant growth system** with seeds, stems, leaves, buds, nodes, and flowers
- **Resource flow mechanics** with bound water and energy particles
- **Genetics system** with basic inherited traits
- **Visual system** using PIXI.js with phantom debug images

---

## 1. 7-Particle Leaf System

### Current State

- Simple single-cell `LEAF` particles created by nodes
- Leaves collect energy and participate in resource flow
- No complex leaf structure or unfolding mechanism

### Proposed 7-Particle Leaf Architecture

#### Stage 1: Initial LeafBud Creation

```javascript
// Node creates lateral leafBud at same location as current simple leaves
const leafBud = new LeafBud(nodeX + direction, nodeY, parentNode);
```

#### Stage 2: Primary Leaf Growth (LeafBud → 4 particles total)

When leafBud has both energy and water:

```javascript
// LeafBud creates 3 new particles:
const positions = [
  { x: leafBudX + direction, y: leafBudY, type: "LEAF" }, // left OR right
  { x: leafBudX, y: leafBudY - 1, type: "LEAF" }, // directly up
  { x: leafBudX + direction, y: leafBudY - 1, type: "LEAF_BUD_SECONDARY" }, // diagonal corner
];
```

#### Stage 3: Secondary Leaf Growth (Secondary LeafBud → 7 particles total)

When secondary leafBud has both energy and water:

```javascript
// Secondary leafBud creates 3 final leaf particles:
const finalPositions = [
  { x: secondaryX, y: secondaryY - 1, type: "LEAF" }, // up from secondary
  { x: secondaryX + direction, y: secondaryY, type: "LEAF" }, // left OR right from secondary
  { x: secondaryX + direction, y: secondaryY - 1, type: "LEAF" }, // diagonal corner
];
```

#### Final 7-Particle Structure

1. **Original LeafBud** (transforms to stem or support structure)
2. **3 Primary Leaves** (from stage 2)
3. **Secondary LeafBud** (intermediate structure)
4. **3 Secondary Leaves** (from stage 3)

### Implementation Details

#### Growth Triggers

- **LeafBud growth**: Requires both water AND energy particles at leafBud location
- **Timing**: Follow aestheedlings sequence with rest counters and validation
- **Collision detection**: Use Moore neighborhood checks for each new particle placement

#### Energy Collection Rules

- **Only LEAF particles collect energy** (not leafBud particles)
- **Independent collection**: Each leaf particle collects energy separately
- **Flow integration**: Energy flows according to existing bound particle system

#### Growth Sequence Code Structure

```javascript
class LeafBud extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "LEAF_BUD");
    this.hasGrown = false;
    this.restCounter = 0;
    this.requiredResources = { water: true, energy: true };
  }

  update() {
    if (
      !this.hasGrown &&
      this.hasRequiredResources() &&
      this.restCounter === 0
    ) {
      this.attemptGrowth();
    }
  }

  hasRequiredResources() {
    const hasWater =
      this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.WATER) > 0;
    const hasEnergy =
      this.countBoundParticlesAt(this.pos.x, this.pos.y, Mode.ENERGY) > 0;
    return hasWater && hasEnergy;
  }
}

class SecondaryLeafBud extends LeafBud {
  // Similar structure but creates final 3 leaf particles
}
```

---

## 2. Flower Petal System

### Current State

- Plants can become `FLOWER` mode when they reach maturity
- No actual petal generation or flower structure

### Proposed Flower Petal Architecture

#### Flower Maturity Trigger

```javascript
// Trigger conditions (ALL must be true):
function canStartFlowering(plant) {
  const plantCells = getAllPlantCells(plant.plantId);
  const allBudsFinished = plantCells
    .filter((cell) => cell instanceof BudCell)
    .every((bud) => bud.growthLimitReached);

  const allCellsSaturated = plantCells.every((cell) => {
    const hasWater =
      countBoundParticlesAt(cell.pos.x, cell.pos.y, Mode.WATER) > 0;
    const hasEnergy =
      countBoundParticlesAt(cell.pos.x, cell.pos.y, Mode.ENERGY) > 0;
    return hasWater && hasEnergy;
  });

  const hasExcessEverywhere = plantCells.every((cell) => cell.isExtra());

  return allBudsFinished && allCellsSaturated && hasExcessEverywhere;
}
```

#### Petal Generation System

Adapt from `spring-fall-sand-garden-40-train.js` growth stages:

```javascript
class FlowerBud extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "FLOWER_BUD");
    this.growthStage = 0; // Start at stage 0
    this.petals = [];
    this.chanceToMature = 0.01;
    this.chancesToMature = 0;
    this.matureChanceLimit = 1000;
  }

  update() {
    if (this.growthStage < 4 && this.canGrowPetals()) {
      this.advanceGrowthStage();
    } else if (this.growthStage >= 4) {
      this.startSeedProduction();
    }
  }
}
```

#### Petal Growth Stages

1. **Stage 1**: No petals (flower bud establishment)
2. **Stage 2**: Cardinal petals (up, left, right) - 3 petals
3. **Stage 3**: Corner petals (up-left, up-right) - 2 more petals
4. **Stage 4**: Lower petals (down, down-left, down-right) - 3 more petals
5. **Complete**: Total of 8 petals + central flower bud

#### Petal Color System

```javascript
class FlowerPetal extends PlantCell {
  constructor(x, y, parent) {
    super(x, y, parent, "FLOWER_PETAL");
    this.color = this.generatePetalColor();
    this.density = 0.2; // Low density for future falling behavior
  }

  generatePetalColor() {
    const hue = Math.random() * 360; // Random hue 0-360°
    const saturation = 100; // Full saturation
    const brightness = 100; // Full brightness
    return { h: hue, s: saturation, b: brightness };
  }
}
```

### Petal Lifecycle

- **Attachment**: Petals remain attached indefinitely (no death system yet)
- **Energy flow**: Petals participate in energy distribution network
- **Visual persistence**: Petals stay visible until manual reset/restart

---

## 3. Seed Production & Dispersal System

### Seed Production Trigger

```javascript
// After all 8 petals are complete:
if (flowerBud.petals.length >= 8 && flowerBud.hasExcessEnergy()) {
  flowerBud.startSeedCreation();
}
```

### Seed Filling Process

```javascript
class DevelopingSeed extends Particle {
  constructor(x, y, parentPlant) {
    super(x, y, Mode.DEVELOPING_SEED);
    this.parentPlant = parentPlant;
    this.targetEnergy = parentPlant.genetics.seedEnergyCapacity; // default 10
    this.currentEnergy = 0;
    this.isReady = false;
    this.energyParticles = []; // Track bound energy particles
  }

  update() {
    this.pullEnergyFromPlant();
    if (this.currentEnergy >= this.targetEnergy) {
      this.release();
    }
  }

  pullEnergyFromPlant() {
    // Use existing energy flow mechanics to draw excess energy
    // from parent plant into developing seed
  }

  release() {
    const airborneSeed = new AirborneSeed(
      this.pos.x,
      this.pos.y,
      this.parentPlant.genetics
    );
    // Transfer energy and genetics to airborne seed
    // Remove developing seed from simulation
  }
}
```

### Airborne Seed Dispersal

Borrowing from `cellspring-22-working.js` and `sunsweeper-11.js`:

```javascript
class AirborneSeed extends Particle {
  constructor(x, y, genetics) {
    super(x, y, Mode.AIRBORNE_SEED);
    this.genetics = genetics;
    this.airborne = true;
    this.stepsTaken = 0;
    this.maxSteps = genetics.dispersalSteps; // genetically encoded (default 34)
    this.energy = genetics.seedEnergyCapacity; // starts with full energy
  }

  update() {
    if (this.airborne && this.stepsTaken < this.maxSteps) {
      this.randomWalk(); // No occupancy grid constraints during flight
      this.stepsTaken++;
    } else {
      this.attemptLanding();
    }
  }

  randomWalk() {
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 }, // Right
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
    ];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const newX = Math.min(Math.max(0, this.pos.x + dir.dx), cols - 1);
    const newY = Math.min(Math.max(0, this.pos.y + dir.dy), rows - 1);
    this.updatePosition(newX, newY);
  }

  attemptLanding() {
    if (
      this.checkEmptyMooreNeighborhood(this.pos.x, this.pos.y) &&
      !occupancyGrid.getPlant(this.pos.x, this.pos.y)
    ) {
      this.germinate();
    } else {
      this.die(); // Failed to find suitable landing spot
    }
  }

  germinate() {
    const newSeed = new Seed(this.pos.x, this.pos.y);
    newSeed.genetics = new PlantGenetics(this.genetics); // Inherit parent genetics
    newSeed.plantId = newSeed.id;

    // Transfer energy particles to new seed
    for (let i = 0; i < this.energy; i++) {
      const energyParticle = new Particle(this.pos.x, this.pos.y, Mode.ENERGY);
      energyParticle.bindToPlant(newSeed.plantId);
      energyParticle.sprite.visible = false;
      particles.push(energyParticle);
    }

    particles.push(newSeed);
    this.remove(); // Remove airborne seed
  }
}
```

---

## 4. Genetics & Mutation System

### Current Genetics Structure

```javascript
// From absorption-16.js PlantGenetics class:
this.genes = {
  internodeSpacing: CONSTANTS.GENETICS.INTERNODE_SPACING, // 4
  budGrowthLimit: CONSTANTS.GENETICS.BUD_GROWTH_LIMIT, // 10
};
```

### Proposed Expanded Genetics

```javascript
class PlantGenetics {
  constructor(parent = null) {
    this.genes = {
      // Growth traits
      internodeSpacing: 4, // Distance between nodes
      budGrowthLimit: 10, // Max height growth
      leafComplexity: "standard", // "simple", "standard", "complex"

      // Reproduction traits
      seedEnergyCapacity: 10, // Energy needed for mature seed
      dispersalSteps: 34, // Flight distance for seeds
      reproductionThreshold: 20, // Plant size needed to reproduce

      // Efficiency traits
      energyEfficiency: 1.0, // Multiplier for energy collection
      waterRetention: 1.0, // Multiplier for water retention
      growthRate: 1.0, // Speed of growth processes

      // Visual traits
      petalColorBase: 180, // Base hue for petal colors (0-360)
      petalColorVariation: 60, // Range of hue variation
      stemThickness: 1, // Visual thickness (future feature)

      // Evolution traits
      mutationRate: 0.05, // Base chance for each gene to mutate (5%)
      mutationStrength: 0.1, // How much genes change when mutating
    };

    if (parent) {
      this.inheritWithMutation(parent);
    } else {
      this.generateRandomTraits();
    }
  }

  inheritWithMutation(parent) {
    for (let trait in parent.genes) {
      if (Math.random() < this.genes.mutationRate) {
        this.genes[trait] = this.mutateGene(trait, parent.genes[trait]);
      } else {
        this.genes[trait] = parent.genes[trait];
      }
    }
  }

  mutateGene(traitName, currentValue) {
    switch (traitName) {
      case "internodeSpacing":
        return Math.max(
          2,
          Math.min(8, currentValue + (Math.random() - 0.5) * 2)
        );
      case "budGrowthLimit":
        return Math.max(
          5,
          Math.min(20, currentValue + (Math.random() - 0.5) * 4)
        );
      case "seedEnergyCapacity":
        return Math.max(
          5,
          Math.min(20, currentValue + (Math.random() - 0.5) * 3)
        );
      case "dispersalSteps":
        return Math.max(
          10,
          Math.min(100, currentValue + (Math.random() - 0.5) * 20)
        );
      case "petalColorBase":
        return (currentValue + (Math.random() - 0.5) * 60 + 360) % 360;
      // Add cases for other traits...
      default:
        if (typeof currentValue === "number") {
          const change =
            (Math.random() - 0.5) * this.genes.mutationStrength * currentValue;
          return Math.max(0.1, currentValue + change);
        }
        return currentValue;
    }
  }
}
```

### Implementation Strategy

1. **Phase 1**: Implement genetics WITHOUT mutation (clones only)
2. **Phase 2**: Add simple mutation system
3. **Phase 3**: Add environmental selection pressure

---

## 5. Dynamic Color System

### Current System

Fixed hex colors in constants:

```javascript
const colors = {
  ENERGY: 0xffff00, // Yellow
  WATER: 0x0066ff, // Blue
  SEED: 0x8b4513, // Brown
  STEM: 0x228b22, // Green
  LEAF: 0x00ff00, // Bright green
  // etc...
};
```

### Proposed RGB Density System

```javascript
function calculateDynamicCellColor(x, y) {
  const plant = occupancyGrid.getPlant(x, y);
  const waterCount = countBoundParticlesAt(x, y, Mode.WATER); // 0-2
  const energyCount = countBoundParticlesAt(x, y, Mode.ENERGY); // 0-2

  // Base colors for different cell types
  let baseColor = { r: 0, g: 0, b: 0 };
  if (plant) {
    baseColor = getPlantTypeBaseColor(plant.mode);
  }

  // Blue component: Water density (0-255)
  const blue = Math.floor((waterCount / 2) * 255);

  // Red component: Energy density with yellow effect
  const energyRatio = energyCount / 2;
  const red = Math.floor(energyRatio * 150); // Max 150 for yellow effect
  const yellowBoost = Math.floor(energyRatio * 105); // Green boost for yellow

  // Green component: Resource saturation + yellow boost
  const maxSlots = getMaxResourceSlots(x, y);
  const filledSlots = waterCount + energyCount;
  const saturationGreen = Math.floor((filledSlots / maxSlots) * 255);
  const green = Math.min(
    255,
    Math.max(baseColor.g, saturationGreen + yellowBoost)
  );

  // Alpha: Overall density (including plant)
  const totalPossibleSlots = 5; // plant + 2 water + 2 energy
  const totalFilledSlots = (plant ? 1 : 0) + filledSlots;
  const alpha = 0.2 + (totalFilledSlots / totalPossibleSlots) * 0.8;

  return {
    r: Math.min(255, Math.max(baseColor.r, red)),
    g: green,
    b: Math.min(255, Math.max(baseColor.b, blue)),
    a: alpha,
  };
}

function getPlantTypeBaseColor(plantMode) {
  switch (plantMode) {
    case Mode.SEED:
      return { r: 139, g: 69, b: 19 }; // Brown
    case Mode.STEM:
      return { r: 34, g: 139, b: 34 }; // Forest green
    case Mode.LEAF:
      return { r: 0, g: 100, b: 0 }; // Dark green
    case Mode.BUD:
      return { r: 144, g: 238, b: 144 }; // Light green
    case Mode.FLOWER:
      return { r: 255, g: 105, b: 180 }; // Hot pink
    default:
      return { r: 0, g: 0, b: 0 };
  }
}
```

### Performance Optimization

```javascript
class ColorCache {
  constructor() {
    this.cache = new Map();
    this.dirtyPositions = new Set();
  }

  markDirty(x, y) {
    this.dirtyPositions.add(`${x},${y}`);
  }

  getColor(x, y) {
    const key = `${x},${y}`;
    if (this.dirtyPositions.has(key) || !this.cache.has(key)) {
      const color = calculateDynamicCellColor(x, y);
      this.cache.set(key, color);
      this.dirtyPositions.delete(key);
      return color;
    }
    return this.cache.get(key);
  }
}
```

---

## 6. Rarity-Based Reproduction System

### Concept

Track flower petal color frequency across all plants and give reproduction bonuses to flowers with statistically rare color combinations.

### Color Distinctiveness Algorithm

```javascript
class FlowerRaritySystem {
  constructor() {
    this.flowerColors = []; // Array of all flower hues
    this.rarityCache = new Map();
    this.cacheInvalid = true;
  }

  registerFlower(petalColor) {
    this.flowerColors.push(petalColor.h); // Store hue value
    this.cacheInvalid = true;
  }

  calculateRarityScore(targetHue) {
    if (this.cacheInvalid) {
      this.updateRarityCache();
    }
    return this.rarityCache.get(Math.floor(targetHue)) || 1.0;
  }

  updateRarityCache() {
    this.rarityCache.clear();

    // For each possible hue (0-359), calculate distinctiveness
    for (let hue = 0; hue < 360; hue++) {
      let minDistance = 360;

      // Find minimum distance to any existing flower
      for (let existingHue of this.flowerColors) {
        const distance = this.hueDistance(hue, existingHue);
        minDistance = Math.min(minDistance, distance);
      }

      // Convert distance to rarity score (0-1, higher = rarer)
      const rarityScore = Math.min(1.0, minDistance / 180); // Max distance is 180°
      this.rarityCache.set(hue, rarityScore);
    }

    this.cacheInvalid = false;
  }

  hueDistance(hue1, hue2) {
    // Calculate shortest angular distance between two hues
    const diff = Math.abs(hue1 - hue2);
    return Math.min(diff, 360 - diff);
  }

  getRarityBonuses(flower) {
    const rarity = this.calculateRarityScore(flower.color.h);

    return {
      bonusSeedChance: rarity * 0.3, // Up to 30% chance for extra seed
      energyEfficiencyBonus: rarity * 0.25, // Up to 25% faster energy collection
      dispersalBonus: Math.floor(rarity * 10), // Up to 10 extra dispersal steps
    };
  }
}

// Global rarity system instance
const flowerRaritySystem = new FlowerRaritySystem();
```

### Integration with Reproduction

```javascript
// In FlowerBud seed production:
function createSeeds(flowerBud) {
  const rarityBonuses = flowerRaritySystem.getRarityBonuses(flowerBud);

  // Base seed creation
  const primarySeed = new DevelopingSeed(
    flowerBud.pos.x,
    flowerBud.pos.y,
    flowerBud.getPlantSeed()
  );

  // Bonus seed chance for rare flowers
  if (Math.random() < rarityBonuses.bonusSeedChance) {
    const bonusSeed = new DevelopingSeed(
      flowerBud.pos.x,
      flowerBud.pos.y,
      flowerBud.getPlantSeed()
    );
    particles.push(bonusSeed);
  }

  particles.push(primarySeed);
}
```

---

## Outstanding Questions Requiring Input

### 1. Leaf System Details

- **Growth timing**: Should secondary leafBud growth happen immediately after primary growth, or with a delay? ANSWER: It should be able to happen as soon as the secondary leafBud has an energy and a water particle. That may create a natural delay of a couple ticks as it receives the resources. At the very least, the leafBud should not create any particles within the same tick that it itself was created; it should sleep for the first tick.
- **Resource requirements**: Should secondary leafBuds need MORE energy/water than primary leafBuds? ANSWER: No, it should require the same amount as any other Bud particle producing a new particle.
- **Failure handling**: What happens if secondary leafBud can't complete growth due to space constraints? ANSWER: A leafBud should first check that all 3 of its target spaces are empty; if they aren't it shouldn't grow, and should stop checking.

### 2. Flower System Mechanics

- **Petal growth rate**: How many ticks between each petal stage advancement?
- **Energy requirements**: How much excess energy should be required to trigger each petal stage?
- **Flower positioning**: Should flowers only appear at the tips of main stems, or can they appear on branches?

### 3. Seed Dispersal Behavior

- **Flight pattern**: Should airborne seeds have any directional bias (wind simulation) or pure random walk?
- **Landing validation**: Should seeds check for water availability near landing site, or just empty space?
- **Multiple seeds**: If rare flowers produce multiple seeds, should they disperse in different directions?

### 4. Performance & Optimization

- **Color calculation frequency**: Should dynamic colors update every frame, every few frames, or only on cell changes?
- **Rarity system scale**: At what population size should the rarity bonuses start taking effect?
- **Memory management**: Should the system limit the number of tracked flower colors to prevent memory growth?

### 5. Genetic Trait Boundaries

- **Mutation limits**: What should be the absolute min/max values for each genetic trait?
- **Trait dependencies**: Should some genetic traits be linked (e.g., larger seeds require more dispersal steps)?
- **Lethal mutations**: Should some extreme mutations result in non-viable plants?

### 6. Visual & Debug Features

- **Debug displays**: Should there be visual indicators for genetic traits, energy levels, or rarity scores?
- **Color accessibility**: Should the dynamic color system have colorblind-friendly alternatives?
- **Performance monitoring**: Should there be FPS/particle count displays for the expanded system?

---

## Implementation Priority & Dependencies

### Phase 1: Foundation (Immediate)

1. **7-particle leaf system** - Extends current leaf mechanics
2. **Basic flower petal generation** - Establishes reproduction preparation

### Phase 2: Core Reproduction (Next)

3. **Seed production & filling** - Enables plant reproduction
4. **Airborne seed dispersal** - Completes reproduction cycle
5. **Genetics inheritance (no mutation)** - Ensures reproduction works with clones

### Phase 3: Evolution & Selection (Later)

6. **Genetic mutation system** - Introduces variation
7. **Flower rarity bonuses** - Creates selection pressure for diversity

### Phase 4: Polish & Optimization (Final)

8. **Dynamic color system** - Improves visual feedback and debugging
9. **Performance optimization** - Maintains smooth operation with complex features

Each phase should be fully functional before proceeding to the next, ensuring the simulation remains stable and playable throughout development.
