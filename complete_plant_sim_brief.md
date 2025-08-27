# Plant Evolution Simulation - Complete Technical Brief

## 1 · Canvas & Topology

- **Grid:** 256 × 144 cells (X = 256, Y = 144)
- **Topology:** Vertical torus (N/S wrap); horizontal edges remain closed
- **Update Rate:** 30–60 Hz target; one full update = "tick"

## 2 · Cell States (single-byte enum)

1. **VOID** – empty air/soil
2. **PLANT** – living tissue (ID pointer to plant object)
3. **SUN** – flux particle (yellow, 50% opacity)
4. **WATER** – flux particle (blue, 50% opacity)
5. **VAPOR** – water vapor (white, 10% opacity)
6. **SOIL/DEAD** (optional) – decayed tissue

## 3 · Adjacency Ownership & Crown Shyness

- Every **PLANT** cell **claims** its 4-way neighboring VOID cells as "owned territory"
- Claimed spaces count as **OCCUPIED** for all other plants' collision detection, creating 1-pixel halo
- Same-plant claims can overlap; inter-plant collisions block growth
- Goal: Natural gaps between different plants (crown shyness effect)

## 4 · Flux System

### 4.1 Sunlight Mechanics

- Each claimed void has probability `p_sun` (≈ 2%) per tick to spawn a **SUN** particle owned by that plant
- SUN drifts straight toward the owning PLANT cell; if intercepted by another PLANT cell first, it vanishes (shade effect)
- On entering a leaf cell, SUN is routed down stored parent links to the seed, adding **+1 sun credit**
- **Visual Saturation**: Plant cells show sunlight absorption (80% alpha = unsaturated, 100% alpha = fully saturated)
- **Oversaturation Effect**: When plant at full sunlight saturation, generated SUN particles linger in place and fade out over 3-5 frames (twinkling effect indicating full health)

### 4.2 Water Mechanics (Finite Pool)

- **Initialization:** Start with finite number `N_water0` of **WATER** particles (no ongoing rain probability)
- **Movement Rules per Tick:**
  1. Try ↓; if occupied, try ↓L or ↓R (pick the direction last moved if possible, else random)
  2. If all downward paths blocked, move laterally L/R continuing previous momentum if free
  3. If fully surrounded, remain stationary but check neighbors next tick
- **Absorption:** If WATER occupies a claimed void adjacent to a plant's seed **and the seed is "thirsty"** (see respiration), WATER is absorbed, giving **+1 water credit** and removing the particle
- **Visual Absorption**: Water absorbed anywhere it can be into plant cells, similar mechanic to sunlight

### 4.3 Respiration & Vapor Cycle

- **Respiration Trigger:** When a SUN particle _spawns_ next to (4-way) a leaf or stem cell, that PLANT consumes **1 stored water** (if available) and emits a **VAPOR** particle into that adjacent void
- This decrements the seed's water store, creating **negative pressure** (thirst flag)
- **VAPOR Behavior:** Random walk each tick, ignoring all occupancies/collision detection. Upon reaching the top row, converts to new **WATER** particle and begins falling under normal WATER rules
- **Net Effect:** Closed hydrological loop with visible transpiration plumes and condensation

## 5 · Plant Data Model

### Plant Object Fields

- `genome[]` (operation sequence)
- `pc` (program counter for growth)
- `cells[]` (coordinate list)
- `parent[]` (parent links toward seed for resource routing)
- `stored_sun`, `stored_water` (resource accumulation)
- `thirst` flag (from respiration)
- `age`, `mature` flag
- `flower_pos`, `flower_hue` (reproduction data)
- Seed coordinates serve as implicit "root"

### Genome Operations (Deterministic)

1. **STEP dir** (up/UL/UR) - grow in direction
2. **BUD** - create lateral meristem + leaf
3. **LEAF** - create leaf cell
4. **FLOWER** - create flower for reproduction
5. **NOP/END** - no operation/end growth

### Mutation System

- **Mutation Rate:** Per-opcode `p_mutate` 1–5% chance per generation
- **Mutation Types:** Bit flip, rotate direction, insert/delete operations, hue drift
- Plants with identical genes produce identical shapes but respond independently to local environments

## 6 · Per-Tick Life Cycle

1. **Flux Update:** Move SUN, WATER, VAPOR particles; handle absorption & condensation
2. **Growth:** While `stored_sun ≥1` **AND** `stored_water ≥1` **AND** `pc < genome.length`:
   - Consume one of each credit, execute next genome operation (respect occupancy rules)
3. **Maturity:** On **FLOWER** operation, start `flower_timer`; flower casts seeds after delay `T_seed`
4. **Seed Dispersal:** k-step random walk from flower; first VOID cell becomes new seed (genome ± mutation)
5. **Senescence:** Optional per-tick death post-flower, converting cells to SOIL and freeing claims

## 7 · Plant Health Visualization

- **Health Display:** Fully healthy cells = bright green with maximum resource saturation
- **Resource Visualization Options:**
  - RGB values changing: healthy bright green with maximum values of both B (water) and R (sun)
  - OR combining blue and yellow values to create green intensity
- **Visual Feedback:** Plant cells visually show resource absorption levels through color/alpha changes

## 8 · Fitness & Selection

### Fitness Factors

- **Resource Access:** Environmental adaptation (water/sunlight access, suitable spacing)
- **Color Uniqueness:** Flowers with most unique colors receive disproportionate fitness bonus
- **Seed Budget:** Scales with integrated SUN plus **color rarity bonus** (`global_max_freq / hue_freq`)

### Selection Pressures

- Shade competition, water routing efficiency, crown space claims
- Plants better adapted to local conditions survive and reproduce more
- Unsuccessful plants die out, creating space for new variants

## 9 · User Interaction

- **Only Control:** Manual removal of specific plants (pruning/weeding)
  - **Prune:** Click/tap PLANT cell → delete entire plant
  - **Highlight:** Outline on hover/tap, show genome hash & flux metrics
- No direct planting, resource manipulation, or genetic editing
- Evolution guided indirectly by creating space and removing undesired variants

## 10 · Technical Requirements

### State Management

- **Save/Load:** RNG seed + per-plant state ({genome, seed x, seed y, pc, age, hue}); Base64 string for copy-paste
- Track individual plant genetics, ages, resource levels (water/sunlight saturation per cell)
- Monitor population genetics and evolutionary trends

### Performance Considerations

- `uint8_t` grids for cell-type & occupancy
- Flux particles in pooled arrays; parent links pre-computed
- Target: ≤ 1000 concurrent flux particles = smooth 60 fps on mid-range devices
- Efficient collision detection with owned empty space system

### Resource Flow Visualization

- Water: blue particles flowing down with described movement rules, white vapor rising up
- Sunlight: yellow particles moving from owned empty spaces to plant cells, with twinkling fade-out when oversaturated
- Plant growth: requires surplus water + sunlight resources
- Particle fade-out animations for oversaturated conditions

## 11 · Visual Design Goals

- **Inspiration:** Unicorn Tapestries (dense, unique vegetation filling space) + cross-stitch floral patterns
- Plants should be functional and process-based with legible behavioral patterns
- Clear visual distinction between different plant types while maintaining density
- Natural-looking spacing and growth patterns
- **Note:** No visual root development initially - seed acts as the root to avoid visual complexity

## 12 · Stretch Goals (Toggleable)

- Seasonal oscillations (alter `p_sun`, condensation altitude)
- Soil nutrients and true roots (phase-2)
- Mycorrhizal trade network
- Disease or disturbance waves to keep canopy dynamic

## 13 · Open Questions / Implementation Decisions

1. Tune `N_water0`, `p_sun`, respiration rate, mutation rate through testing
2. Define exact leaf vs. stem distinction for SUN spawning probability
3. Decide collision outcome when multiple same-plant claims overlap
4. Design visual cues for VAPOR plumes and water absorption without clutter
5. Versioning for save files as mechanics evolve
6. Temporal dynamics: growth rates, generation timing, plant lifespans
7. Seed dispersal mechanics: distance, success probability, placement rules

## Core Philosophy

Create a self-sustaining ecosystem where meaningful evolutionary patterns emerge from simple rules, user intervention is minimal but impactful, and the visual result resembles dense, natural botanical illustrations with clear functional logic. The simulation balances genetic determinism with environmental adaptation, creating emergent complexity from simple cellular automata rules.

---

**Use this brief verbatim with Cursor or any AI coding copilot to scaffold data structures, update loop, and rendering. It reflects all current design decisions, including finite-water + vapor cycle, seed-as-root simplification, visual feedback systems, and complete technical specifications.**

Extra thought:

More issues and an idea:

- The water is correctly looping vertically, and there does not seem to be any vapor -- great!
- The seeds are still not sprouting, at least not visually, I don't see any bud or anything. Here's the console log:
  `absorption-3.js:496 Seed at (100, 34) has energy: 5
absorption-3.js:501 Seed sprouting with energy: 5
absorption-3.js:552 Seed sprouted! Now a BUD with plantId: 100
absorption-3.js:496 Seed at (120, 7) has energy: 5
absorption-3.js:501 Seed sprouting with energy: 5
absorption-3.js:552 Seed sprouted! Now a BUD with plantId: 101
absorption-3.js:496 Seed at (110, 30) has energy: 5
absorption-3.js:501 Seed sprouting with energy: 5
absorption-3.js:552 Seed sprouted! Now a BUD with plantId: 102`
- What about the fixed canvas size, wasn't it supposed to be 144x256? That seems like a foundational step.
- I think it may make sense to have a separate occupancyGrid (if we're still using that) for Water and for Sunlight, which we should now rename as Energy for clarity. There can only ever be one water particle (or one energy particle) in a given cell, but there should be water cells overlaid anywhere there is a plant cell. So they're inhabiting the same cell space, but in different layers (water layer, plant layer, energy layer). So, as per the brief I believe, a plant that's fully healthy should be fully overlaid with water and energy. Water cells should put on 20% alpha blue on top, so they're visible in empty squares and on top of plants. Dehydrated plants/cells wouldn't have a water cell in that cell space. This is also how the negative pressure of respiration is supposed to work. Functioning just on local operations, a plant should ferry water up from the seed up to fill the extremities, from parent cell to child cell; similarly, a plant should ferry energy down, from leave extremities down to the seed. However, in both directions, the flow should work such that they pile up and become saturated. So all the water is pushed up the furthest extremities. If ever cell is filled with water, it can't absorb any more. Similarly with energy, and the energy should be able to flow in to any empty sapces, even if its not in the original direction. e.g., say a higher leaf isn't generating any energy, but a lower leaf is; it should try to send that energy down, but if it's totally filled (the energy grid is occupied there), it should flow up until the plant is fully saturated. Does that make sense? It's very important that while water generally flows up and energy genreally flows down, it will appropriately redirect the flow to fill up the whole of the plant to the point of complete saturation.
- Relatedly, a plant can't absorb an energy cell that appears in an adjacent empty space unless it's hydrated: if it successfully absorbs the energy, the water particle there should vaporize as part of respiration, and then that plant particle should be momentarily dehydrated -- until the plant is able to absorb more water and have it fill in this empty space. So that's the mechanism of negative pressure sucking up the water from the bottom via respiration on the leaves, fairly realistic!
  It should also try to include these changes:

✅ Straightforward Fixes:
Energy spawning targets LEAVES only - Changed from buds to leaves for realistic photosynthesis
Fixed water absorption logging spam - Now only logs once per cell instead of per particle
Energy absorption only by LEAVES (and SEEDS) - Proper biological photosynthesis model
Seed multi-energy storage - Seeds can store up to 5 energy particles (cotyledons)
✅ Sophisticated Local Saturation Flow System:
🔄 Cascading Resource Flow:
When energy/water is absorbed, cells call tryFlowEnergy()/tryFlowWater()
If neighbors are occupied, they recursively try to shift their own resources first
Creates natural chain reactions where cells "make room" for new resources
Flow continues until plant is saturated or resources are placed
🌱 Bidirectional Smart Flow:
Energy flows generally DOWN (leaves → seed) but can flow UP to fill empty branches
Water flows generally UP (seed → extremities) but can flow DOWN to fill empty spaces
Uses parent/child relationships for proper plant structure flow
Completely emergent - no global scanning required
✨ Saturation Detection & Twinkling:
When tryFlow() returns false = plant is locally saturated
Excess energy particles enter "twinkle mode" - fade out over 5 frames with opacity effects
Perfect visual feedback for healthy, fully-saturated plants
🧬 Advanced Plant Biology:
Seeds: Store multiple energy (cotyledons), don't require respiration
Leaves: Single energy + water → photosynthesis → creates vapor (respiration)
All plant parts: Can only hold 1 water, but water flows throughout plant structure
The system now works exactly as you described - local interactions create emergent saturation behavior, resources flow intelligently in any direction to fill empty spaces, and oversaturated plants show beautiful twinkling effects!

## 14 · Implementation Clarifications (Added Post-Development)

### 14.1 Resource Absorption Specificity

- **Energy Absorption**: Only **LEAF** cells can absorb energy from adjacent claimed empty spaces (photosynthesis)
- **Water Absorption**: Only **SEED** cells can absorb water from adjacent claimed empty spaces (root uptake)
- **Internal Transfer**: All plant cells can accept and move energy/water internally through plant structure
- **Respiration Requirement**: Leaf cells need both water and energy for photosynthesis; energy absorption consumes water and creates vapor

### 14.2 Resource Storage Limits

- **Seeds**: Can store up to 10 energy particles (cotyledons for initial growth)
- **All Other Plant Cells**: Maximum 1 energy and 1 water each
- **Bootstrap Growth**: Seeds start with sufficient energy to grow to first leaf without external energy input

### 14.3 Claimed Territory Energy Spawning

- **Claiming Rule**: All plant cells claim their 4-way neighboring empty spaces
- **Energy Generation**: Only empty spaces claimed by **LEAF** cells can spawn energy (~2% per tick)
- **Water Access**: Only empty spaces claimed by **SEED** cells allow water absorption
- **Crown Shyness**: Claims from different plants block each other's growth, creating natural spacing

### 14.4 Deterministic Growth Pattern

- **Internode Spacing**: Buds create nodes every N cells based on genetics
- **Maturity Limit**: Buds have maximum cell count before converting to flower buds
- **Node Function**: Node cells create leafbuds on alternating sides
- **Growth Requirements**: Buds need 1 energy + 1 water to move and create stem behind them

### 14.5 Leaf Pattern Specification

When a LEAFBUD cell grows, it creates a 7-cell pattern in a 3×3 area:

```
_LL    (empty, leaf, leaf)
LBL    (leaf, leafbud center, leaf)
BL_    (leafbud/leaf, leaf, empty)
```

- Total: 5 leaf cells + 1-2 leafbud cells
- Diagonal corners remain empty for natural leaf shape
- Pattern borrowed from aestheedlings-8.js with modifications

### 14.6 Plant Cell Type Hierarchy

- **SEED** → creates initial BUD
- **BUD** → moves upward, creates STEM behind, occasionally creates NODE
- **STEM** → structural support, static
- **NODE** → creates LEAFBUD on alternating sides
- **LEAFBUD** → creates 7-cell leaf pattern
- **LEAF** → photosynthesis, energy generation in claimed spaces
- **FLOWER** → reproduction, eventual seed dispersal

### 14.7 Layered Occupancy Grid System

- **Plant Layer**: Tracks plant cell positions and types
- **Water Layer**: Tracks water distribution throughout plant structure
- **Energy Layer**: Tracks energy distribution throughout plant structure
- **Visual Overlays**: 20% alpha blue for water, 30% alpha yellow for energy
- **Saturation Visualization**: Fully saturated plants show both overlays simultaneously

### 14.8 Resource Flow Mechanics

- **Bidirectional Flow**: Water generally flows up (seed → leaves), energy generally flows down (leaves → seed)
- **Adaptive Redirection**: Resources flow to fill empty spaces in any direction when direct path is blocked
- **Local Saturation**: Flow stops when all connected plant cells are filled
- **Overflow Effects**: Excess energy particles "twinkle out" with fading opacity when plant is fully saturated

### 14.9 Canvas Dimensions

- **Fixed Size**: Exactly 256×144 cells as specified in Section 1
- **No Dynamic Scaling**: Canvas size remains constant regardless of window dimensions
- **Pixel Scaling**: Each cell renders at 3×3 pixels for visibility

### 14.10 Bootstrap Sequence

Expected growth sequence from seed with initial energy:

1. **Seed** (10 energy) → creates **BUD** (1 energy + 1 water needed)
2. **BUD** moves up → creates **STEM** behind
3. **BUD** creates **NODE** → **NODE** creates **LEAFBUD**
4. **LEAFBUD** → creates 7-cell **LEAF** pattern
5. **LEAF** cells begin photosynthesis → claim empty spaces → generate energy
6. Plant becomes self-sustaining through photosynthesis cycle

This sequence ensures plants can bootstrap from stored seed energy to self-sustaining photosynthesis without external energy input during initial growth phase.

## 15 · Development Session Refinements (Latest Updates)

### 15.1 Manual Simulation Control for Study

- **Default State**: Simulation starts **paused** for controlled observation
- **Step Control**: Spacebar or mouse click advances exactly one tick when paused
- **Toggle Control**: 'P' key toggles between paused and running modes
- **Report Generation**: 'R' key generates detailed console report with particle counts and coordinates
- **Study Environment**: 64×64 grid with single seed placed at center bottom (32, 59) for controlled observation

### 15.2 Water Physics Refinements

- **Vertical Topology**: Water no longer wraps vertically - accumulates at bottom instead of looping to top
- **Collision Detection**: Water particles cannot stack on each other (max one water per cell)
- **Movement Priority**: Uses simplified collision detection borrowed from monochromagic - down first, then diagonal, then lateral
- **Natural Flow**: Water spreads horizontally when blocked vertically, creating realistic pooling behavior

### 15.3 Enhanced Visual Feedback System

- **Plant Cell Alpha**: All plant particles render at **50% alpha** and are painted first (background layer)
- **Energy Particle Alpha**: Reduced to **10% alpha** with **5% alpha 3×3 aura** for subtle visual feedback
- **Water Absorption Overlays**:
  - **20% alpha blue overlay** for water particles absorbed by plants
  - **10% alpha 3×3 blue aura** around absorbed water particles
  - Only applies to water particles coexisting with plant particles in layered grid
- **Resource Saturation Visualization**: Fully saturated plants display both water and energy overlays simultaneously

### 15.4 Console Logging Strategy

- **Eliminated Spam**: Removed all per-tick console logging for performance
- **Real-time Events**: Log energy generation, energy movement, water absorption, and water flow only when events occur
- **Movement-Only Logging**: Only log actual particle movement, not static frames
- **Detailed Reports**: 'R' key provides comprehensive simulation state including:
  - Frame number and particle counts by type
  - Coordinates and Plant IDs for all plant particles
  - Coordinates for all energy particles
  - Complete system status without ongoing spam

### 15.5 Seeds as Special Energy Storage Architecture

- **Exception to One-Per-Cell Rule**: Seeds allow **multiple energy particles** to stack at same position
- **Unidirectional Energy Flow**: Energy can only flow **OUT** of seeds once sprouted (no backflow to seeds)
- **Bootstrap Energy System**: Seeds start with stored energy particles that visibly flow out to plant cells during growth
- **Cotyledon Simulation**: Multiple energy particles on seed represent stored cotyledon energy for initial growth
- **Visual Storage Indicator**: Multiple stacked energy particles on seeds provide clear visual feedback of stored energy reserves
- **Flow Dynamics**: As plant grows, energy particles **visibly disperse** from seed to plant cells that can hold them (empty energy layer positions)

### 15.6 Controlled Study Environment Setup

- **Fixed Canvas**: 64×64 cells for manageable observation scope
- **Centered Seed Placement**: Single seed at (32, 59) - horizontally centered, near bottom
- **Water Accumulation**: Water particles fall and accumulate at bottom near seed location
- **Step-by-Step Analysis**: Manual tick advancement allows frame-by-frame study of plant growth mechanics
- **Resource Flow Observation**: Clear visual tracking of water and energy distribution throughout plant structure

### 15.7 Layered Resource System Implementation

- **Three-Layer Grid**: Plant layer, Water layer, Energy layer operate independently
- **Overlapping Occupancy**: Resources can occupy same coordinates as plants in different layers
- **Visual Overlay System**: Resources render as colored overlays on top of plant base layer
- **Saturation Detection**: Complete plant saturation occurs when both water and energy layers fill all plant cell positions
- **Flow Redirection**: Resources use bidirectional flow (water UP, energy DOWN) with adaptive redirection to achieve complete saturation

### 15.8 Performance and Debug Optimizations

- **Eliminated Console Spam**: Removed per-tick debug output that was impacting performance
- **Event-Driven Logging**: Only log significant events (absorption, generation, movement) as they occur
- **Detailed Status Reports**: Manual report generation provides comprehensive system state without ongoing performance impact
- **Visual Feedback Priority**: Rely on visual overlays rather than console output for real-time system monitoring

### 14.11 Layered Occupancy Grid System

- **Three-layer grid**: Plant layer, Water layer, Energy layer
- **Overlapping occupancy**: Plant and water/energy particles can share same cell coordinates in different layers
- **Visual overlays**: 20% alpha blue for water layer, 30% alpha yellow for energy layer
- **Saturation visualization**: Fully saturated plants show both water and energy overlays simultaneously
- **Bidirectional resource flow**: Water generally flows UP (seed → leaves), energy generally flows DOWN (leaves → seed), but both can flow in reverse or lateral directions via parent/child relationships to ensure complete plant saturation
- **Flow redirection**: Resources use any available direction to fill empty spaces when natural flow path is blocked

### 14.12 Energy Absorption and Respiration

- **Leaf-only energy absorption**: Only LEAF cells can absorb energy from adjacent claimed empty spaces
- **Hydration requirement**: Leaves must have water present to absorb energy (photosynthesis)
- **Respiration mechanism**: Energy absorption consumes water particle, creating vapor
- **Negative pressure**: Water consumption creates temporary dehydration until plant refills from seed
- **Bootstrap energy**: Seeds start with sufficient energy to grow first leaves without external input

### 14.13 Claimed Territory Energy Generation

- **Leaf claims only**: Only empty spaces claimed by LEAF cells can spawn energy (~2% per tick)
- **Crown shyness enforcement**: Different plants' claims block each other, creating natural spacing
- **Saturation feedback**: Energy spawns near leaves but stays put if plant cannot absorb it
- **Twinkling effect**: Unabsorbed energy particles fade out over 20-45 frames with opacity animation

### 14.14 Water Absorption Root System

- **Seed-only water absorption**: Only SEED cells can absorb water from adjacent claimed empty spaces
- **Root simulation**: Seeds represent root system without visual root complexity
- **Water distribution**: Absorbed water flows up through plant structure to fill all cells
- **Finite water conservation**: Water particles move/transform but total count remains constant

### 14.15 Plant Growth Requirements

- **Dual resource requirement**: Buds need both 1 energy + 1 water to move and create stem
- **Resource proximity**: Growth only possible when resources are available at bud location
- **Energy source transition**: Seeds provide initial energy, then leaves take over via photosynthesis
- **Growth failure death**: Plants die if growth blocked and cannot redistribute resources

### 14.16 Particle Lifecycle Management

- **Water-vapor cycle**: Water ↔ Vapor transformations preserve total particle count via setMode()
- **Energy twinkling**: Excess energy fades out over frames rather than disappearing instantly
- **Mode switching**: Particles change properties via setMode() rather than creation/deletion
- **Occupancy consistency**: Grid updates synchronized with particle position changes

### 14.17 Resource Flow Mechanics

- **Natural flow preference**: Water UP (seed → leaves), Energy DOWN (leaves → seed)
- **Adaptive redirection**: Resources flow laterally or reverse direction when direct path is blocked
- **Complete saturation goal**: Flow continues until every plant cell has both water and energy
- **Local pressure mechanics**: Resources push existing resources ahead to make space
- **Flow failure triggers twinkling**: When no flow possible, excess energy enters fade-out mode

---

## 16 · Core Design Principles (Refined)

**_NOTE:_** _The following principles were derived during a developmental session that encountered significant implementation challenges. While they represent theoretical breakthroughs, they should be taken with a grain of salt and validated against a working simulation._

This section clarifies core mechanics based on implementation breakthroughs, superseding any conflicting language in earlier sections.

### 16.1 Resource Allocation, Not Consumption

- **Clarification:** During growth, resources (water, energy) are **allocated** to new plant cells, not "consumed" or "destroyed".
- **Mechanism:** When a bud grows, the water and energy particles at its location are transferred to the newly created stem/node cell beneath it. The total resource count within the plant remains constant during growth.

### 16.2 Explicit Resource Ownership

- **Clarification:** A distinction must be made between free-floating environmental resources and resources that are part of a plant.
- **Mechanism:** When a plant absorbs a resource particle (water at the seed, energy at a leaf), the particle is assigned the plant's unique `plantId`. This "owned" particle is considered part of the plant's internal economy, is stable, and is not subject to environmental decay (e.g., twinkling/fading out). Only particles with no `plantId` can decay.

### 16.3 True Bidirectional Resource Flow

- **Clarification:** While resources have a primary "natural" flow direction (water up, energy down), they must be able to flow in any direction to fill unsaturated parts of the plant structure. This ensures the entire plant can reach full saturation.
- **Mechanism:** The resource distribution logic should follow a priority system for finding a neighbor to push to:
  1.  **Priority 1 (Natural Flow):** Attempt to push to the natural destination (e.g., a stem pushing water to its child bud).
  2.  **Priority 2 (Back-Flow):** If the natural path is blocked, attempt to push "backwards" (e.g., a bud pushing water back to its parent stem if the stem has a different unsaturated child branch).
  3.  **Priority 3 (Lateral Flow):** If all other paths are blocked, attempt to push to any adjacent cell of the same plant that is unsaturated.
