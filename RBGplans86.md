# RGB Fields: Green (Life) Field Design Document

## Vision and Goals

RGB Fields is a cellular automata simulation designed to be:

- **Extremely local and field-based** (not object-oriented particle tracking)
- **Highly performant** (able to scale to 10k×10k grids or 1 billion ticks)
- **Emergent rather than artificial** (complexity arises from simple local rules)
- **Biophilic and life-like** (vaguely resembling living systems)
- **Dynamic and endlessly interesting** (worth running ambiently in background)
- **Based on feedback loops** (local agents reacting to individual environments)

## The Three Fields

### R (Heat - Red Channel)

- Integer field: 0..8 units per cell (mapped to 0,31,63,...,255 for rendering)
- Wants to dissipate in all directions (cardinal neighbors only)
- Diffuses via random-walk to cooler neighbors
- Slower diffusion in water (donor/recipient gates at WATER_TICK_PROB)
- Already implemented in rgbfields-10.js

### B (Water - Blue Channel)

- Integer field: 0..4 units per cell (mapped to 0,63,127,191,255 for rendering)
- Wants to flow downward and across
- Falling-sand style movement with diagonal/lateral options
- Heat influences flow direction (heat-graded schedules at different R levels)
- Already implemented in rgbfields-10.js

### G (Life - Green Channel)

- **Binary field: 0 or 1** (not yet implemented)
- Created when sufficient R and B are present
- Grows in plant-like structures
- Consumes and stores R and B
- Dies when resources depleted

## The Core Tension: Local Rules vs Plant-Like Behavior

### The Problem

True plant behavior (directed growth, branching, reproduction with traits) requires:

- Memory of past states
- Direction and purpose
- Heritable information

Pure local field rules are:

- Stateless (no memory beyond current field values)
- Symmetric (same rules everywhere)
- Limited to immediate neighborhood information

### What Works: Neighbor-Based Role Inference

G cells can infer their role from Moore neighborhood topology:

- **0 G neighbors** = ungerminated seed (dormant)
- **1 G neighbor below** = bud (actively growing upward)
- **2 G neighbors (above and below)** = stem (transport only)
- **1 G neighbor above** = root/anchor or failed bud
- **3+ G neighbors** = node (intersection point)

**Key insight**: The act of growing changes the grower's own neighborhood.

Example:

```
Tick N:
  (x, y-1): empty
  (x, y):   G=1 with one neighbor south → infers "I'm a bud" → grows north
  (x, y+1): G=1 (parent)

Tick N+1:
  (x, y-1): NEW G=1, sees one neighbor south → infers "I'm a bud"
  (x, y):   OLD G=1, NOW sees two neighbors (N and S) → infers "I'm a stem"
  (x, y+1): G=1 (parent)
```

The topology correctly updates roles as the plant grows.

### What Doesn't Work: Timing and Triggers

Neighbor topology tells cells their **role** but not **when to act**:

- What triggers branching? (stems look identical regardless of age)
- What stops infinite growth? (buds keep seeing one neighbor forever)
- What triggers reproduction? (no way to distinguish "mature" from "young")

## The Elegant Solution: Resource-Based Flow

### Core Concept

Don't add explicit state (age, direction flags, etc.). Instead, let resource availability and consumption drive all behavior naturally.

### Resource Storage

G cells don't need separate storage structures. The existing R and B field values at G cells **are** the storage. No additional arrays needed.

### Resource Flow Rules

**1. Capture and Transport**

- R and B at G=1 cells don't diffuse to non-G neighbors (or diffuse very slowly)
- R and B **can** diffuse freely between adjacent G cells
- G cells can actively pull R/B from adjacent non-G cells (absorption)

**2. Pressure-Based Flow (Emergent, Not Imposed)**

- R and B diffuse normally within the G network
- When a bud creates a new G cell, it consumes R and B at that location (e.g., -4 R, -2 B)
- This creates a local deficit/vacuum at the growth point
- Normal diffusion pulls R/B from neighboring G cells toward the deficit
- The "bubble" propagates down through the plant structure
- Eventually reaches the root/seed which absorbs from environment
- Flow direction emerges from where consumption happens

**Why this is elegant:**

- No imposed directional bias (except gravity on B, which is natural)
- Active branches get more resources automatically
- Tall structures are naturally harder to maintain (long transport distance)
- Height limit emerges from pipeline pressure

### Resource Effects on G

**G captures R and B:**

- When R or B diffuses into a G cell from a non-G neighbor, it gets "trapped"
- Resources accumulate at G cells
- Internal plant transport moves them between G cells

**R and B sustain G:**

- G cells need continuous R and B to survive
- Maintenance cost: slowly consume R and B each tick?
- When R=0 or B=0 at a G cell, that cell dies (G becomes 0)

## Birth, Growth, and Death

### G Birth (Spontaneous Generation)

When a non-G cell has:

- R ≥ 6 (or some threshold like R ≥ 4)
- B ≥ 3 (or B ≥ 2)
- Small chance per tick (~1%) to spontaneously create G=1

Alternative: Require even higher thresholds to make G rarer and more precious.

### G Growth

**When a bud cell (G=1 with one neighbor below) has:**

- R ≥ 4
- B ≥ 2

**It can create a new G cell:**

1. Check the space above (y-1)
2. If empty (G=0), create G=1 there
3. Consume resources: R-4 and B-2 at the new cell location
4. The bud's topology changes (now has 2 neighbors, becomes a stem)
5. The new cell has 1 neighbor below (becomes the new bud)

**Growth direction inference:**

- Bud with parent below → grows up
- Bud with parent to side → grows in same direction? (for branches)
- Or: always try to grow up first (simpler)

### G Death

**Individual cell death:**

- When R=0 or B=0 at a G cell
- G becomes 0
- Release remaining R/B back to environment (diffuse normally)

**Death propagation options:**

1. **Isolated**: Only that cell dies
2. **Cascade**: When a G cell dies, check neighbors; if they now have insufficient support (isolated), they die too
3. **Whole-plant**: When any G cell in a connected structure starves, the whole structure dies (simulate vascular failure)

Isolated death is simplest and most local. Cascade could be interesting but requires connected-component checking.

### Branching

**Option 1: Resource-triggered**

- Stem cells (2 opposite neighbors) with R>6 and B>3
- Small chance per tick to create G=1 laterally (left or right)
- Consumes extra resources

**Option 2: Topology-triggered**

- Node cells (3+ neighbors) have different branching behavior
- Or: stems occasionally become nodes by growing laterally

**Option 3: No branching**

- Start simple with just upward growth
- Single-strand plants that compete for space

## Reproduction: The Fundamental Limit

### Why True Reproduction Is Impossible With Pure Fields

Without state beyond G=0/1 and resource values:

- Can't distinguish lifecycle stages (young vs mature)
- Can't encode genetic information
- Can't create inheritable traits
- Offspring would be identical to spontaneous generation

### The Decision: Ephemeral Strands

**Accepted approach for first implementation:**

- G arises spontaneously where R and B are abundant
- Grows while resources available
- Dies when resources depleted or consumed
- Death releases R/B back to environment
- This creates interesting spatial cycles and competition
- No evolution, but interesting emergent ecology

**What you get:**

- Patches of high R/B spawn G
- G grows and consumes local resources
- Resource depletion limits height/spread
- Death creates new resource-rich patches
- New G spawns in those patches
- Cyclical, dynamic patterns

**What you don't get:**

- Heredity
- Evolution
- Distinct "species"
- Optimized growth strategies
- True reproduction

### Future Options If You Want Reproduction

If you later decide to add minimal state:

**Option A: G as 0-255**

- 0 = no life
- 1-50 = seed stage (dormant)
- 51-150 = vegetative growth
- 151-255 = reproductive (can spawn new seeds)
- Still single field, still local rules

**Option B: Add a fourth field (Genome)**

- Small integer encoding growth parameters
- Passed from parent to offspring with mutation
- Enables evolution

## Critical Design Decisions

### 1. G Birth Conditions

- **Threshold**: R ≥ ? and B ≥ ? (suggestions: 6 and 3, or 4 and 2)
- **Probability**: ~1% per tick? Lower makes G rarer
- **Location**: Any non-G cell meeting conditions

### 2. G Growth Consumption

- **Cost to create new cell**: How much R and B consumed?
  - Suggestion: -4 R, -2 B from new cell location
  - Or: split cost between parent and child?

### 3. G Maintenance Cost

- **Do G cells consume R/B just to exist?**
  - Option A: Yes, small amount per tick (makes tall plants hard)
  - Option B: No, only consumed during growth (simpler)
  - Suggestion: Start with Option B

### 4. G Death Behavior

- **Trigger**: R=0 OR B=0?
  - Or: R=0 AND B=0? (more forgiving)
- **Propagation**: Isolated, cascade, or whole-plant?
  - Suggestion: Start with isolated
- **Resource release**: Remaining R/B released to environment

### 5. Resource Diffusion Rates Within G

- **Same as normal diffusion?** Or modified?
- **Active transport bias?** Or purely pressure-based?
  - Suggestion: Pure pressure (local gradients only)

### 6. Branching

- **Include in first version?** Or save for later?
  - Suggestion: Start without, add later
- **Trigger mechanism**: Resources, topology, or random?

### 7. Resource Generation Effects

- **Photosynthesis**: Should G cells at top generate R?
  - Could create self-sustaining plants
  - Or breaks resource conservation
- **Root absorption**: Should G cells enhance B uptake?
  - Or just rely on natural B diffusion?

### 8. G Effect on Environment

- **Shadow**: G cells block R from reaching below?
- **Soil depletion**: G cells reduce environmental B nearby?
- **Nutrient cycling**: Dead G releases burst of R/B?

## Implementation Plan

### Starting from rgbfields-10.js

**Already have:**

- R field (Uint8Array, 0-8 units)
- B field (Uint8Array, 0-4 units)
- R diffusion with water gating
- B falling-sand flow with heat-influenced direction
- Rendering for R and B channels

**Need to add:**

1. **G field array**

   ```javascript
   let G0 = new Uint8Array(N); // Binary: 0 or 1
   let G1 = new Uint8Array(N); // Double buffer
   ```

2. **G birth function**

   ```javascript
   function birthGreen(R, B, G_dst) {
     for (let i = 0; i < N; i++) {
       if (G_dst[i] === 1) continue; // Already G
       if (R[i] >= 6 && B[i] >= 3 && rand() < 0.01) {
         G_dst[i] = 1;
       }
     }
   }
   ```

3. **G growth function**

   ```javascript
   function growGreen(R, B, G_src, G_dst) {
     G_dst.set(G_src);
     for (let y = 0; y < ROWS; y++) {
       for (let x = 0; x < COLS; x++) {
         const i = IX(x, y);
         if (G_src[i] !== 1) continue;

         // Check if this is a bud (one neighbor below)
         const below = neighborIndex(x, y, 0, 1);
         if (below >= 0 && G_src[below] === 1) {
           const above = neighborIndex(x, y, 0, -1);
           if (above >= 0 && G_src[above] === 0) {
             // Can grow if resources sufficient
             if (R[i] >= 4 && B[i] >= 2) {
               G_dst[above] = 1;
               R[above] -= 4; // Consume resources at new cell
               B[above] -= 2;
             }
           }
         }
       }
     }
   }
   ```

4. **G death function**

   ```javascript
   function killGreen(R, B, G_dst) {
     for (let i = 0; i < N; i++) {
       if (G_dst[i] === 1 && (R[i] === 0 || B[i] === 0)) {
         G_dst[i] = 0;
         // Resources already at 0, or could release partial
       }
     }
   }
   ```

5. **Modify R diffusion**

   - Check if source or target has G=1
   - Prevent or reduce diffusion from G to non-G
   - Allow diffusion between G cells

6. **Modify B flow**

   - Similar G-aware rules
   - G cells can "capture" falling B

7. **Update rendering**

   ```javascript
   for (let i = 0, j = 0; i < N; i++, j += 4) {
     const rByte = UNIT_TO_BYTE[R[i]];
     const bByte = WATER_TO_BYTE[B[i]];
     const gByte = G[i] === 1 ? 255 : 0;
     rgbaRB[j + 0] = rByte;
     rgbaRB[j + 1] = gByte;
     rgbaRB[j + 2] = bByte;
     rgbaRB[j + 3] = 255;
   }
   ```

8. **Tick order**
   ```javascript
   function advanceTick() {
     birthGreen(U0, W0, G1);
     growGreen(U0, W0, G0, G1);
     [G0, G1] = [G1, G0];

     flowWater(W0, W1, U0, ticks);
     [W0, W1] = [W1, W0];

     diffuseRed(U0, U1, W0, G0); // Modified to be G-aware
     [U0, U1] = [U1, U0];

     killGreen(U0, W0, G0);

     updateTextures(U0, W0, G0);
     ticks++;
   }
   ```

## Open Questions for Experimentation

1. **Birth threshold**: What R/B values feel right?
2. **Growth cost**: How expensive should creating G be?
3. **Diffusion rates**: Should G create strong barriers or weak ones?
4. **Death timing**: Immediate or gradual starvation?
5. **Initial conditions**: Start with some G, or wait for spontaneous birth?
6. **Visual appearance**: Pure green, or tinted by R/B values?

## Expected Emergent Behaviors

With these rules, you should see:

1. **Hotspot colonization**: G appears where R and B are both high
2. **Vertical structures**: Pressure-based flow favors upward growth
3. **Height limits**: Tall plants starve from long transport distance
4. **Resource competition**: Adjacent G structures steal from each other
5. **Boom-bust cycles**: Growth → depletion → death → regeneration
6. **Spatial patterns**: Stable configurations where birth rate matches death rate
7. **Clearings**: G depletes local R/B, preventing new G nearby
8. **Waves**: Death releases resources, triggering new birth

## Summary of Key Insights

1. **Neighbor topology can infer roles** (seed/stem/bud) without explicit state
2. **Pressure-based resource flow is more elegant** than imposed directional bias
3. **Resource fields double as storage** - no separate G storage needed
4. **Consumption creates vacuums** that naturally drive flow toward growth points
5. **True reproduction requires state** beyond pure binary fields
6. **Ephemeral strands are acceptable** for interesting emergent ecology
7. **Local rules can produce plant-like behavior** with resource-based timing

The vision: field-based, local, performant, emergent - with plant-like structures that arise, compete, and dissolve in endless dynamic patterns.
