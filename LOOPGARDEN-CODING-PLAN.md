# Loopgarden

## Standalone comprehensive coding, validation, and research plan

**Status:** unimplemented design specification. Do not describe any proposed emergence as an observed result.  
**Date:** 2026-08-22  
**Project posture:** clean-slate implementation; do not modify or inherit the biology of `sampler-24.html`  
**First prototype:** `loopgarden-00-flow-proof.html`  
**First evolutionary build:** `loopgarden-02-evolution.html`  
**Delivery format:** one self-contained HTML file per milestone, with no imports, CDN dependencies, package installation, compilation, server requirement, or build step  
**Default viewport:** 440×735 simulation pixels at one device-independent simulation pixel per world pixel; scale only with CSS for display  

---

## 0. Instructions to the implementing instance

Build Loopgarden as a new system. The old projects are useful controls and historical context, not a code base to preserve.

The central instruction is:

> Do not build plants that sit on top of a chemistry. Build plants whose bodies are the transport network through which the chemistry must move.

Morphology, metabolism, ecological interaction, and visual explanation must all be different readings of the same sparse graph. If a proposed feature does not strengthen at least one of the three goals without obscuring another, omit it.

Do not begin by implementing mutation and evolution. First prove that the physical substrate is visually intelligible and supports a hand-authored solitary life cycle plus a hand-authored complementary grafted cycle. Evolution cannot rescue an illegible or nonviable substrate.

At every milestone:

- preserve exact R, G, and B totals;
- use only local state to cause biological events;
- keep plant or lineage identity out of chemical and routing decisions;
- make every persistent state either visible in the default rendering or inspectable by clicking it;
- keep the core deterministic for a given seed and configuration;
- expose headless stepping and complete state export from the beginning;
- retain failed seeds and parameter sets in the research record rather than quietly discarding them.

The intended contribution is not a clever animation. The project only becomes scientifically interesting if a common ancestor evolves repeatable, causally demonstrated ecological differentiation or shared physiological organization under the rules below.

---

## 1. The three coequal goals

### Goal 1: legibility

A viewer should be able to watch individual material parcels and correctly narrate important events:

- a free parcel was captured;
- it traveled down this branch;
- this node exchanged one colored token with it;
- the node was consequently discharged;
- another parcel later restored that node;
- the carrier crossed a graft or was rejected by a chemical gate;
- the parcel became tissue, a flower component, a seed, or free material again.

There must be no global fitness score, novelty reward, organism-level energy total, invisible light field, neural policy, or hidden species-specific interaction table. Debug overlays can reveal more detail, but the ordinary view must already communicate the causal structure.

### Goal 2: genuine evolution and ecology

The running world must contain:

- physical reproduction;
- heritable mutation;
- differential reproductive success;
- persistent descent records;
- finite conserved matter;
- spatially local environmental modification;
- the possibility of several persistent lineages descended from one ancestral genome;
- the possibility of complementarity, exploitation, partner filtering, invasion, extinction, and reciprocal evolutionary response.

No value named `fitness`, `score`, `winner`, `beauty`, `complexity`, or `novelty` may influence survival, growth, routing, seed production, or mutation.

### Goal 3: simple, functional, biophilic form

Organisms should resemble spare botanical line drawings: connected stems, turns, branches, junctions, loops, active tips, and simple cross-shaped flowers.

Form must be functional rather than rewarded for resemblance. Branch number, angle, length, junction position, chemical zoning, grafting, and loops must alter capture, transport, transformation, retention, maintenance, and reproduction.

The strongest design criterion is that all three goals use the same mechanism:

> Bright conserved parcels move through evolving plantlike graphs. The graph makes causality visible, determines reproductive success, and is itself the morphology under selection.

---

## 2. Core research hypothesis

Loopgarden combines three constraints:

1. **Stoichiometric debt:** every useful color transformation changes both the moving parcel and a real tissue parcel. A node that processes a carrier becomes chemically discharged and needs a complementary future flow to restore it.
2. **Topological transport:** matter must physically traverse the organism's evolved graph. Branches expose capture ports; paths order reactions; junctions route compositions; loops retain material; bottlenecks restrict it.
3. **Reproductive conflict inside shared circulation:** when plants graft, parcels have no owner and may cross several genomes' tissues, but each flower still produces the genome of its own plant.

The intended evolutionary opening is not merely “organism A produces waste used by organism B.” It is:

> Descendants may become components of multi-owner vascular networks whose complementary chemistry and topology maintain material circulation, while their separate flowers continue to compete over the network's output.

This permits mutualism, cross-feeding, physiological merger, parasitism, partner choice, and policing without naming those strategies in code.

Conservation makes specialization self-limiting but does not guarantee coexistence. Network sharing creates an opportunity for cooperation but does not guarantee it. The empirical question is which regimes evolution actually discovers.

---

## 3. Non-goals and prohibited shortcuts

The first complete build must not include:

- sunlight, shade, rain, soil fertility, litter layers, or seasons;
- a scalar energy or health currency;
- hard-coded producers, consumers, pollinators, parasites, species, sexes, or guilds;
- special rules for self versus foreign tissue;
- a penalty for simple genomes or reward for complex ones;
- beauty, symmetry, height, branching, diversity, or novelty rewards;
- neural networks, reinforcement learning, gradient optimization, or external evolutionary algorithms;
- spontaneous creation, destruction, replenishment, or transmutation of R, G, or B;
- pre-scripted community cycles;
- sexual reproduction or pollen in the initial implementation;
- dense full-screen chemistry that reads as colored static;
- 3D rendering, perspective, occlusion, decorative sprites, or particle effects that obscure state.

The world is an abstract, externally driven stochastic transport system. It conserves colored matter exactly; it is not a claim to thermodynamic realism. Do not add a fake thermodynamic vocabulary unless an explicit energy carrier and dissipation law are later implemented.

---

## 4. System overview

The world is a bounded two-dimensional fixed-point plane.

It contains a fixed population of physical material parcels. Every parcel has exactly three elemental slots selected from R, G, and B. A parcel is always in exactly one state:

- `FREE`: drifting through open space;
- `CARRIER`: moving through a vascular edge or waiting at a node;
- `BOUND`: embodied as a plant node or flower petal;
- `SEED`: carrying one offspring genome while drifting or germinating.

Plants are sparse embedded graphs:

- graph nodes contain bound material parcels;
- graph edges are vascular bonds and contain no matter of their own;
- active meristems extend graphs by binding carrier parcels as new nodes;
- terminal ports capture nearby free parcels;
- moving carriers exchange tokens with bound node parcels;
- chemical gates and local geometry determine routing;
- tips that encounter existing nodes form grafts under the same rule whether the node belongs to the same plant or another;
- unused bonds weaken and break;
- flowers consume several parcels and produce exactly one physical seed.

Each seed creates a new plant identity and carries a possibly mutated genome. Grafting does not merge genomes or ownership. It only joins transport graphs.

---

## 5. Non-negotiable invariants

### 5.1 Elemental conservation

For the entire run:

```text
totalR(t) = totalR(0)
totalG(t) = totalG(0)
totalB(t) = totalB(0)
```

This includes free parcels, carriers, tissue, flower material, and seeds.

### 5.2 Parcel conservation

The number of parcels is fixed. State transitions move a parcel between state lists; they never allocate or destroy one.

### 5.3 Graph integrity

- Every live edge has two live endpoint nodes.
- Adjacency is symmetric.
- Node degree never exceeds four.
- Every bound plant node has exactly one parcel.
- Every bound parcel points back to exactly one node.
- A carrier references either a valid edge plus progress or a valid node, never both.

### 5.4 Local causation

A biological action may inspect only:

- the acting entity;
- its graph neighbors;
- parcels or nodes within a fixed local spatial radius;
- its immutable inherited genome;
- fixed world constants;
- deterministic pseudorandom draws assigned to that event.

No action may inspect population-wide abundance, lineage success, average morphology, global chemical scarcity, or a future growth feasibility test.

### 5.5 Owner neutrality

Chemical exchange, carrier admission, routing, capture, graft formation, and bond maintenance must not branch on `plantId`, `genomeId`, kinship, or lineage distance.

Ownership is allowed only for:

- selecting the developmental genome expressed by an active tip;
- assigning a flower's offspring genome;
- bookkeeping, rendering overlays, logging, and analysis.

### 5.6 No duplicated flow

A carrier entering a junction takes one route. Branches may route different carriers differently, but one carrier is never copied.

### 5.7 Reproduction consumes physical matter

A seed must be an existing parcel delivered to a completed flower. Mutation creates information, not matter.

---

## 6. Why three RGB slots are adopted

Use exactly three unordered elemental slots per parcel.

The ten compounds are:

- `RRR`
- `RRG`
- `RRB`
- `RGG`
- `RGB`
- `RBB`
- `GGG`
- `GGB`
- `GBB`
- `BBB`

Three slots are preferable to two because:

- one exchange changes one-third rather than one-half of a parcel;
- mutation can traverse the color simplex in smaller viable steps;
- the balanced `RGB` state supplies a natural generalist ancestor;
- ten states are enough for diverse paths while remaining visually learnable;
- pure primaries and intermediate hues remain literal composition colors;
- tissue discharge and restoration can be read as small color steps.

Do not expose two slots as a UI option in the initial build. Implement it later as a scientific ablation after the three-slot system works.

Do not add a fourth element. It would produce twenty three-slot compounds, exceed easy visual memorability, and break the literal correspondence between conserved elements and screen channels.

---

## 7. Compound representation and exchange algebra

Use compact integer codes:

```js
const EMPTY_MAT = 0;
const RRR = 1, RRG = 2, RRB = 3, RGG = 4, RGB = 5;
const RBB = 6, GGG = 7, GGB = 8, GBB = 9, BBB = 10;

const COUNTS = [
  [0,0,0],
  [3,0,0], [2,1,0], [2,0,1], [1,2,0], [1,1,1],
  [1,0,2], [0,3,0], [0,2,1], [0,1,2], [0,0,3]
];
```

Precompute:

- `ENCODE[r | g<<2 | b<<4] -> compound`;
- `DIST[a*11+b] -> minimum one-token substitutions`, where distance is half the L1 difference between count vectors;
- every valid unlike one-token swap between two compounds;
- the neighboring compounds at distance one for mutation.

The only material transformation is a reciprocal swap:

```text
parcel A gives element X and receives Y
parcel B gives element Y and receives X
X != Y
```

All runtime chemistry must call one audited exchange function. Never directly assign a biological reaction product.

### 7.1 Reversible buffer rule

Every ordinary vascular node inherits:

- `home`: its preferred tissue compound;
- `target`: the compound toward which it tends to move carriers;
- `gate`: the compound it tends to admit or route toward itself;
- `gateTolerance`: initially zero or one color-simplex step;
- two local geometric route preferences;
- `routeKey`: the carrier composition that switches between those preferences.

The node's actual parcel composition is mutable and always rendered.

When a carrier arrives:

1. Enumerate every valid one-token swap between the carrier and node parcel.
2. If the node is not at `home`, retain only swaps that strictly reduce the node's distance to `home`.
3. Among those restorative swaps, prefer the result that leaves the carrier closest to `target`.
4. If the node is at `home`, retain only swaps that strictly reduce the carrier's distance to `target`.
5. A productive home-state swap discharges the node by one simplex step.
6. If no eligible swap exists, do nothing.
7. Resolve exact ties with a deterministic integer hash of run seed, tick, node ID, and carrier parcel ID. Do not always prefer the lowest compound code.

Pseudocode:

```js
function exchangeAtNode(carrierCode, nodeCode, home, target, tieKey) {
  const candidates = SWAPS[carrierCode][nodeCode];
  if (!candidates.length) return NO_EXCHANGE;

  if (nodeCode !== home) {
    const oldHomeDist = dist(nodeCode, home);
    return chooseLexicographically(
      candidates.filter(x => dist(x.nodeAfter, home) < oldHomeDist),
      x => [dist(x.nodeAfter, home), dist(x.carrierAfter, target)],
      tieKey
    );
  }

  const oldTargetDist = dist(carrierCode, target);
  return chooseLexicographically(
    candidates.filter(x => dist(x.carrierAfter, target) < oldTargetDist),
    x => [dist(x.carrierAfter, target), dist(x.nodeAfter, home)],
    tieKey
  );
}
```

This makes a node a reversible cofactor or buffer, not an unchanged magical catalyst. Useful processing leaves a visible local debt. A later complementary carrier must repay it.

Do not allow a discharged node to keep pushing carriers toward its target. Restoration has priority.

---

## 8. Deterministic fixed-point geometry

The core simulation must not use floating-point state.

Use signed 32-bit fixed-point coordinates:

```js
const FP = 256;
const pxToFp = x => x * FP;
const fpToPx = x => (x + 128) >> 8;
```

Hard-code sixteen unit direction vectors as integer pairs. Do not compute trigonometric values at runtime. A meristem heading is an integer from 0 through 15.

Recommended initial geometry:

- node step: `3 * FP`;
- free-parcel step: approximately `0.75 * FP` per free-motion opportunity;
- capture radius: approximately 2.25 pixels;
- graft target radius: approximately 1.5 pixels;
- maximum node degree: four;
- reflecting world boundaries, not wrapping boundaries.

The simulation graph is off-lattice even though rendering is rasterized. Proposed bonds are checked with deterministic Bresenham traversal against a pixel-resolution bond occupancy buffer.

Rules for visual topology:

- Ordinary bonds may not cross existing bonds.
- A crossing becomes a connection only when growth terminates at an existing node and creates a graft edge.
- Shared endpoints are allowed.
- Parallel overlapping edges are forbidden.
- If two proposed targets are equally near, use stable ID order rotated by an event tie hash.

This preserves readable connected forms while avoiding four-direction and forty-five-degree morphological lock-in.

---

## 9. Physical parcel data model

Use a structure-of-arrays layout with fixed capacity equal to `PARCEL_COUNT`.

Required parcel arrays:

```js
parcelState       Uint8Array   // FREE, CARRIER, BOUND, SEED
parcelCompound    Uint8Array   // 1..10
parcelX           Int32Array   // fixed point
parcelY           Int32Array
parcelHeading     Uint8Array   // free or seed motion heading
parcelNode        Int32Array   // bound node or carrier-at-node, else -1
parcelEdge        Int32Array   // carrier edge, else -1
parcelEdgeT       Uint16Array  // 0..65535 progress
parcelIncoming    Int32Array   // previous edge at node, else -1
parcelGenome      Int32Array   // seeds only, else -1
parcelPlant       Int32Array   // seeds only; new ID assigned at germination
parcelAge         Uint16Array  // seed opportunities, not global ticks
```

Maintain dense active-ID lists and inverse positions for each parcel state. State transitions must be O(1) swap-removals, with a single audited function responsible for changing lists and sentinel fields.

Parcel IDs are stable for the entire run. Logs must be able to reconstruct a parcel's full history across free, carrier, tissue, and seed states.

The full material inventory should initially contain approximately 18,000 parcels at 440×735, about 5.6 percent of screen pixels if all were spatially separated. Treat this as a calibration starting point, not a sacred constant. The acceptable visual range should be established in Phase 0 before biology is written.

---

## 10. Graph data model

The maximum possible number of nodes is the number of parcels. Use typed arrays plus free lists.

Required node arrays:

```js
nodeAlive          Uint8Array
nodeParcel         Int32Array
nodeX              Int32Array
nodeY              Int32Array
nodePlant          Int32Array
nodeGenome         Int32Array
nodeModule         Uint8Array
nodeRole           Uint8Array  // ordinary, active tip, flower core, petal
nodeHome           Uint8Array
nodeTarget         Uint8Array
nodeGate           Uint8Array
nodeGateTolerance  Uint8Array
nodeRouteKey       Uint8Array
nodeRouteNear      Uint8Array
nodeRouteFar       Uint8Array
nodeDegree         Uint8Array
nodeNbr0..3        Int32Array
nodeEdge0..3       Int32Array
```

Store inherited node chemistry directly on the node when it is created. Existing tissue does not change its developmental identity if its owner's genome later produces a mutated offspring.

Required edge arrays:

```js
edgeAlive          Uint8Array
edgeA              Int32Array
edgeB              Int32Array
edgeOwnerA         Int32Array  // provenance only
edgeOwnerB         Int32Array  // provenance only; differs for graft
edgeDryMisses      Uint16Array
edgePerfused       Uint8Array
edgeFlowCount      Uint32Array
edgeLastFlowTick   Uint32Array
edgeKind           Uint8Array  // ordinary, graft, temporary flower bond
```

Plant ownership and physiological connectivity are deliberately separate:

- a seed creates one `plantId`;
- every node grown by one meristem inherits that `plantId`;
- a graft edge can connect two plant IDs;
- carriers have no owner;
- a connected component may contain many plant IDs and genome IDs;
- a flower still produces the genome associated with its own core node.

Do not continuously recompute connected components during simulation. Compute them at checkpoints and on demand for analysis. Local rules need only adjacency.

---

## 11. Spatial indexes

Use separate indexes for separate purposes:

- a fixed-resolution bond raster for collision and rendering occupancy;
- a uniform spatial hash for nearby free parcels, capture ports, tips, and nodes;
- dense active lists for scheduler sampling.

Recommended spatial-hash bucket width: four simulation pixels.

The hash must support:

- move/remove/insert for free parcels and seeds;
- query nearest eligible capture port within radius;
- query nearest eligible node for a possible graft;
- query local clearance for germination and flower petals.

Do not rebuild the entire spatial index every tick.

---

## 12. Free parcel motion

Free parcels follow a locally correlated deterministic random walk:

1. On their own movement opportunity, turn left one heading step, continue, or turn right one heading step using fixed integer probabilities.
2. Advance by the fixed-point free step.
3. Reflect heading and position at boundaries.
4. Update the spatial hash.
5. Query for capture ports within `CAPTURE_RADIUS`.
6. If several ports qualify, select nearest first and use a deterministic tie hash.

Recommended initial turn probabilities:

- seven eighths continue;
- one sixteenth turn left;
- one sixteenth turn right.

Released plant material inherits an initial heading aligned with the bond or carrier direction that released it. This produces visible local effluent structure without a global flow field.

Free parcels may overlap in subpixel space. If raster overlap becomes visually common at the chosen density, add only a very short local exclusion check; do not turn the world into a dense falling-sand lattice.

There is no global stratification, gravity, rain, replenishment, or preferred vertical direction in the first build.

---

## 13. Capture ports and carrier entry

Every exposed non-flower terminal node is a potential port. An active tip is simultaneously a port and a possible consumer of arriving material.

A nearby free parcel becomes a carrier when captured:

- state changes from `FREE` to `CARRIER`;
- its current node is the port;
- its incoming edge is `-1`;
- its fixed-point position snaps to the node for simulation purposes;
- its stable parcel ID and compound are unchanged;
- a `capture` event is logged.

Capture depends only on distance and port availability. It does not inspect whether the parcel will eventually be useful.

This is important: organisms may capture useless or harmful material. Selection acts on graph chemistry and routing rather than an omniscient acquisition filter.

---

## 14. Carrier movement and routing

Carrier motion alternates between two substates:

- `AT_NODE`: exchange, binding, flowering, or route selection may occur;
- `ON_EDGE`: an event advances integer progress toward the destination.

Recommended starting speed: four carrier opportunities per ordinary three-pixel edge.

On arrival at a node:

1. Perform at most one reversible buffer exchange.
2. Mark the arrival and exchange in the parcel trace.
3. If the node is an active tip and the developmental job can consume this compound, offer it to growth before routing.
4. If the node is an active flower core, offer it to the next flower-construction requirement.
5. Otherwise choose one outgoing edge.
6. If no outgoing edge admits it, release it to free space at the node.

### 14.1 Chemical admission

An outgoing edge leads to a neighboring node. That destination admits the carrier when:

```text
distance(carrierCompound, destination.gate) <= destination.gateTolerance
```

The gate is chemical, local, inherited, and visible on inspection. It never compares owner or lineage.

### 14.2 Geometry-conditioned routing

At a junction, classify candidate edges relative to the incoming direction as approximately straight, left, right, or reverse.

The current node has:

- `routeKey`;
- `routeNear`, a preferred geometric order used when the carrier is near the key;
- `routeFar`, an order used otherwise.

For example, one node may route R-rich carriers left-first and other carriers straight-first. This provides evolvable local valves without a lookup table over global states.

Routing order:

1. Exclude the incoming edge if any admitted alternative exists.
2. Filter to chemically admitted destinations.
3. Select the preferred geometric class.
4. Prefer the chemically closest destination gate within that class.
5. Resolve exact ties deterministically.
6. If there is no admitted destination, exit to free space.

Do not copy carriers at branches. Do not route toward “the owner's flower” or any global destination.

Multiple carriers may initially share an edge. Edge capacity and congestion are legitimate later experiments, but they add queuing behavior that could obscure the first causal test.

---

## 15. Developmental genome

Use a small mutation-robust recursive meristem grammar, not an arbitrary program.

Each immutable genome contains at most twelve modules. Module zero is the root module.

Each module contains:

```js
steps             // 1..12 growth nodes before transition
curve             // -1, 0, or +1 heading step applied per growth
branchStep        // 0..steps-1, or NONE
leftModule        // 0..11, or NONE
rightModule       // 0..11, or NONE
leftAngle         // 1..4 heading steps
rightAngle        // -1..-4 heading steps
nextModule        // 0..11, or NONE
terminalFlower    // boolean

home              // 1..10
target            // 1..10
gate              // 1..10
gateTolerance     // initially 0..1
routeKey          // 1..10
routeNear         // geometric route enum
routeFar          // geometric route enum

petalHome         // 1..10, used if terminalFlower
seedHome          // 1..10, used if terminalFlower
```

An active meristem stores:

```js
tipNode
plantId
genomeId
moduleId
stepInModule
heading
branchDepth
pendingJobs
failedOpportunities
```

### 15.1 Development sequence

When a compatible carrier reaches a tip:

1. If a branch child is pending, attempt that child first.
2. Otherwise propose the next node at one fixed node step in the current heading.
3. Apply the module's curve after each successful extension.
4. At `branchStep`, enqueue left and right child tips whose modules are not `NONE`.
5. On completion, transition to `nextModule`, create a flower, or stop growth.

Each child requires its own physical carrier parcel. Branching instructions do not create tissue.

Branch calls increase `branchDepth`; ordinary `nextModule` transitions do not. Use a global safety limit of eight branch levels and a per-plant safety cap of 1,024 nodes. These are crash protections, not intended ecological pressures. Log every attempted safety-cap rejection and verify that successful mature runs rarely approach them.

### 15.2 Compatible material for growth

A tip may bind a carrier as its next node only when the carrier compound exactly equals the current module's `home` compound.

The carrier parcel becomes the new node's physical parcel. The new node inherits the module's home, target, gate, and routing genes. No helper parcel is consumed, and no material is synthesized.

The existing tip becomes an ordinary node unless it still has pending branch jobs. The new terminal becomes the continuation tip.

### 15.3 Developmental failure

A failed tip waits. Its `failedOpportunities` increments only when that tip itself receives a development opportunity, never with global ticks.

After a generous local threshold, the current pending job is abandoned. The tip remains a passive terminal port. This avoids immortal blocked jobs without creating population-density-dependent deadlines.

Do not check whether a seed or tip could fully unfold its inherited body plan before permitting germination or growth.

---

## 16. Grafting and loop formation

When a tip proposes a new node position:

1. Check the bond raster for a clear path.
2. Query existing nodes within `GRAFT_RADIUS` of the proposed endpoint.
3. If the nearest eligible node has degree below four and no existing edge to the tip, create a bond to that node instead of binding a new parcel.
4. Apply exactly the same rule for self, clone, relative, and unrelated descendant.
5. The carrier that triggered the attempt remains a carrier and is routed through the new connection if admitted; grafting does not create or consume a parcel.
6. The active meristem completes that pending growth job.

A graft edge records both endpoint owners for analysis but owner identity is not consulted by the rule.

One self-graft can create a loop within an individual. A foreign graft can create a multi-owner component. Neither outcome is specially rewarded.

Do not initially add a graft compatibility tag. Chemical admission at endpoint gates already supplies a heritable, visible form of partner filtering. Add a separate contact-affinity gene only if indiscriminate structural fusion remains the dominant failure after gate evolution has been tested.

---

## 17. Bond perfusion, weakening, and release

Maintenance belongs to edges, because transport makes bonds useful.

Every edge stores:

- a one-bit `perfused` flag set by carrier traversal;
- `dryMisses`, counting that edge's own maintenance opportunities without perfusion;
- cumulative and recent flow counts for rendering and analysis.

On an edge-maintenance opportunity:

1. If `perfused` is set, clear it and reset or substantially reduce `dryMisses`.
2. Otherwise increment `dryMisses`.
3. Above a warning threshold, render the edge progressively dimmer.
4. At the break threshold, delete the bond.
5. Any carrier currently on the deleted edge becomes free at its interpolated position.
6. Any resulting isolated ordinary node releases its bound parcel as free material.
7. Active tips on isolated nodes are canceled before release.

Dryness advances only when that edge is sampled for maintenance. A larger population therefore does not make each plant age faster relative to its flow opportunities.

Recommended starting values:

- warning at 24 dry maintenance opportunities;
- break at 48;
- a perfused check resets dryness to zero.

These values must be calibrated in the hand-authored flow proof.

### 17.1 Known loophole: persistent closed circulation

A carrier trapped in a perfectly routed loop could perpetually perfuse it. Do not conceal this. In a finite conserved world, the loop sequesters matter and produces no offspring unless it eventually consumes or releases carriers, so persistence alone is not reproductive success.

Measure this behavior before changing it. If inert one-carrier rings accumulate and obscure ecology, the least invasive remedy is a small mandatory, visibly documented leakage probability at node visits. Do not introduce an invisible carrier lifespan or delete loops merely because they persist.

---

## 18. Flowers and physical reproduction

Flowers are deliberately simple fixed crosses. Do not evolve petal shape in the first build.

A terminal flower consists of:

- one vascular core node owned by the producing plant;
- four one-parcel petals placed north, east, south, and west in screen coordinates if those positions are clear;
- one later carrier parcel that becomes the seed.

The flower is assembled locally:

1. A completed terminal module changes its tip into an active flower core.
2. Four separate carriers matching `petalHome` are bound one at a time as petals.
3. If a petal location is blocked, the flower waits; it does not search globally or rotate to a hidden feasible orientation.
4. Once all petals exist, a carrier matching `seedHome` becomes a seed parcel.
5. The seed detaches carrying a mutated copy of the core owner's genome.
6. That flower can never make another seed.
7. The four petal parcels and core are released after a short sequence measured in that flower's own opportunities, unless the core remains part of a continuing vascular path.

“One flower, one seed” prevents a single static flower from emitting hundreds of seeds. Additional reproduction requires additional physical flower construction.

Flower state is local and inspectable. A core may wait for petal one through four, wait for seed material, complete, or senesce.

---

## 19. Seeds and germination

A seed is one physical parcel plus one genome reference.

Seeds perform a slightly slower correlated random walk than free parcels. There is no soil, falling direction, or hidden suitable-ground class.

After a short maturation period measured in the seed's own movement opportunities:

1. Check a small local clearance radius.
2. If the location is clear, bind the seed parcel as the root node of a new plant and activate module zero.
3. Assign a new `plantId` and a lineage record pointing to the parent plant, parent genome, birth flower, birth tick, and seed parcel ID.
4. If blocked, continue drifting and try again on later seed opportunities.
5. After a generous maximum number of its own attempts, release the parcel as ordinary free material.

Do not reject germination because the mature inherited morphology would overlap something later. Only immediate local space matters.

Recommended starting values:

- maturation: eight seed opportunities;
- maximum age: 128 seed opportunities;
- clearance radius: two pixels.

---

## 20. Heredity and mutation

Genomes are immutable, interned byte arrays. Every unique genome receives:

- stable `genomeId`;
- canonical hash;
- parent genome ID;
- originating plant and seed;
- birth tick;
- mutation description;
- first and last observed tick;
- cumulative births and extant plants for analysis only.

None of those abundance fields may influence simulation rules.

### 20.1 Mutation distribution

At seed creation:

- draw point-mutation count from a small Poisson-like integer distribution with mean approximately 0.35;
- independently allow a structural mutation with probability approximately 0.02;
- permit zero-mutation offspring;
- apply mutations to the copied genome before interning it.

Initial point mutations:

- `steps`: ±1 within 1..12;
- `curve`: adjacent value within -1..1;
- `branchStep`: ±1 or toggle between none and a valid position;
- angle: ±1 heading step within bounds;
- module references: move to an adjacent module index or toggle none;
- compound genes: move to a uniformly selected distance-one neighbor on the ten-compound simplex;
- gate tolerance: toggle 0 or 1;
- route enums: move to an adjacent enum.

Initial structural mutations:

- duplicate one module into an unused slot and redirect one reference to it;
- delete an unreferenced module;
- duplicate or remove one branch reference;
- change one terminal between stop and flower.

Do not randomly replace a compound with any of the other nine. Adjacent chemical mutation is essential to viable evolutionary paths.

### 20.2 No explicit genome cost

Do not penalize module count, branching instructions, or chemical diversity. Complexity already costs physical matter, construction time, and maintenance flow when expressed. Unexpressed DNA has no first-build cost.

### 20.3 Operational species

The first build is asexual. Do not claim reproductive species.

Use the terms:

- genotype or lineage for genealogical identity;
- ecotype for a persistent heritable ecological cluster;
- morphotype for a recurrent body-plan cluster;
- physiological consortium for a multi-owner connected component.

Sexual reproduction can be considered only after ecological differentiation is demonstrated.

---

## 21. The common ancestor

The ancestor must be viable alone. Community dependence must evolve rather than being imposed.

Recommended hand-designed ancestral genome:

- a short central module of three to five RGB-home nodes;
- one symmetric left and right branch near the terminal portion;
- one simple flower at each branch tip or one terminal flower after a Y split;
- all node `home`, `target`, `gate`, `routeKey`, `petalHome`, and `seedHome` initially `RGB`;
- gate tolerance one;
- neutral straight-first routing;
- no owner-sensitive behavior.

This ancestor can preferentially process mixed carriers toward common RGB material while its nodes visibly discharge and require restoration.

Use several spatially separated copies of the same ancestral genome for engineering and early evolutionary runs. This prevents immediate stochastic extinction while preserving a common ancestral genotype.

For the strongest later result, repeat the experiment from one physical ancestral seed after the viability range is established. Report clearly whether a run began from one individual or several identical clones.

Founders and seeds must be selected from the conserved parcel pool. Do not create special seed matter.

---

## 22. Exact initialization

For `P` parcels, create exactly `P` R tokens, `P` G tokens, and `P` B tokens, totaling `3P` tokens.

Use the seeded PRNG to Fisher-Yates shuffle the token bag, group it into triples, sort each triple, and encode its compound. This naturally yields the multinomial compound distribution while preserving exact equality.

Then:

1. Select existing RGB parcels for ancestral seeds.
2. Place seed and free parcels at deterministic pseudorandom fixed-point positions with modest local separation.
3. Assign free headings.
4. Initialize every active list and spatial index.
5. Store initial elemental totals and state hash.
6. Assert the complete inventory before tick zero.

Do not independently sample compounds. That would produce only approximate global conservation.

---

## 23. Atomic event scheduler

One simulation tick is exactly one scheduled atomic opportunity. This makes one-million-tick runs practical and gives “tick” an unambiguous meaning.

Event classes:

- free-parcel motion;
- carrier advancement or node processing;
- tip development;
- edge maintenance;
- flower construction or senescence;
- seed motion or germination.

At each tick, choose an event class with integer weight proportional to:

```text
classWeight * numberOfActiveEntitiesInClass
```

Then choose one entity fairly from that class.

Recommended initial integer weights:

- free parcel: 1;
- carrier: 10;
- active tip: 2;
- live edge maintenance: 1;
- active flower: 2;
- seed: 2.

These are relative physical timescales, not fixed total event budgets.

### 23.1 Fair entity selection

Do not repeatedly select entities with unconstrained replacement. Maintain a shuffled epoch list or rotating permutation cursor for each active class:

1. Visit every entity in a class once in a seeded shuffled order.
2. Reshuffle when the epoch is exhausted.
3. When entities enter or leave mid-epoch, update safely without duplicate or lost IDs.

This limits starvation and makes per-entity opportunities auditable.

### 23.2 Local clocks only

All biological waiting and aging counters advance on the entity's own opportunities:

- edge dryness advances on edge-maintenance opportunities;
- tip patience advances on tip opportunities;
- seed age advances on seed opportunities;
- flower waiting advances on flower opportunities.

Never compare those processes to absolute global ticks.

This prevents a larger population from making each organism age faster merely because it receives a smaller share of a fixed global budget.

### 23.3 Deterministic PRNG

Use a small audited 32-bit generator such as `xoshiro128**` implemented with `Math.imul` and integer rotation.

- Seed its four words deterministically from the user seed.
- Never call `Math.random`.
- Store PRNG state in checkpoints.
- Use simulation PRNG only inside scheduled events.
- Rendering must never consume simulation randomness.
- Analysis and UI randomness, if any, must use separate generators.

---

## 24. Rendering grammar

Render directly into one `ImageData` pixel buffer. Avoid thousands of canvas path calls.

### 24.1 Composition palette

Derive color from actual compound counts. Normalize the largest nonzero channel to 255 while preserving ratios:

```js
const max = Math.max(r, g, b);
display = [255*r/max, 255*g/max, 255*b/max];
```

This makes `RRG` bright orange rather than muddy brown and makes `RGB` white.

### 24.2 Brightness encodes physical state

- empty space: black;
- free parcels: approximately 20 percent value;
- vascular bonds: approximately 40 to 65 percent, decreasing with dryness;
- bound node parcels: approximately 80 percent;
- carriers: 100 percent at their interpolated positions;
- active meristems and seeds: 100 percent with a minimal local glyph;
- flowers: a literal five-pixel cross colored by their actual parcels.

Chemistry determines hue. State determines brightness or glyph. Do not recolor the default world by lineage.

### 24.3 Visible processes

- A carrier visibly moves along its edge over several carrier events.
- A token exchange changes both carrier and node color immediately.
- At low speed, a short non-state-changing ring flash may mark the exchange.
- A dry edge progressively fades before breaking.
- A graft junction is marked by a sparse neutral corner glyph, not a replacement hue.
- A completed seed visibly detaches from the flower core.

At 64× and faster:

- disable transient reaction flashes;
- throttle rendering independently of simulation;
- render current state rather than every intermediate event;
- never alter physical rules or PRNG consumption.

### 24.4 Optional debug overlays

Provide toggles for:

- owner or genome color;
- actual versus inherited home chemistry;
- gates and targets;
- carrier paths;
- recent flow intensity;
- dry-bond state;
- physiological connected components;
- self versus foreign graft edges;
- flower ownership;
- selected parcel trace.

Debug overlays are for explanation and analysis. The default view remains chemistry-first.

### 24.5 Inspectors

Clicking or tapping an entity pauses or selects it and shows concise state:

- parcel ID and full history;
- current compound and count vector;
- node actual, home, target, and gate compounds;
- plant, genome, and module provenance;
- edge endpoints, flow, and dryness;
- flower construction state;
- recent local events.

Use small composition swatches plus text codes such as `RRG`; never rely on color alone.

---

## 25. Mobile-first single-file interface

The HTML must open directly on desktop and phone.

Use plain scripts rather than module imports. Avoid layout assumptions that previously caused zero-height canvases in mobile previews.

Required CSS principles:

```css
html, body {
  width: 100%;
  height: 100%;
  height: 100dvh;
  margin: 0;
  overflow: hidden;
  background: #000;
}
canvas {
  display: block;
  width: 100vw;
  height: 100dvh;
  object-fit: contain;
  image-rendering: pixelated;
}
```

The canvas's internal width and height remain the simulation dimensions. CSS may letterbox but never resize simulation state.

Default controls should be one compact overlay:

- pause/run;
- single step;
- speed: 1×, 4×, 16×, 64×, 128×, 256×;
- current tick;
- current seed;
- seed input and restart;
- export button;
- inspector/debug toggle.

Everything must fit without scrolling. Put detailed diagnostics in a collapsible overlay and the console/API, not permanent panels.

Use explicit startup markers and a visible fatal-error overlay so a mobile script failure never appears as an unexplained blank canvas.

---

## 26. Code organization inside the single HTML file

Keep one file but preserve strict conceptual modules with comment banners and narrow APIs:

1. constants and schema versions;
2. deterministic PRNG and integer utilities;
3. compound algebra and precomputed tables;
4. typed-array allocators and active sets;
5. parcel state transitions;
6. graph allocation, adjacency, and bond raster;
7. spatial hash;
8. free and seed motion;
9. carrier exchange and routing;
10. meristem grammar and growth;
11. grafting;
12. flowers and reproduction;
13. mutation, genome interning, and lineage records;
14. scheduler;
15. metrics and event recording;
16. renderer and inspectors;
17. serialization and headless API;
18. UI and animation loop;
19. startup self-tests.

Use strict mode. Avoid per-tick object allocation, closures inside hot loops, JSON construction during normal simulation, and array `.filter()` or `.map()` in event handlers. The explanatory pseudocode in this plan is not a performance prescription.

Keep debug assertions behind a configuration flag, but run them by default in Phase 0 and Phase 1.

---

## 27. Public headless and programmatic API

Expose a stable API as `window.loopgarden`:

```js
window.loopgarden = {
  schemaVersion,
  buildVersion,
  ready,
  reset(options),
  step(eventCount = 1),
  runTo(targetTick, options),
  pause(),
  render(),
  getConfig(),
  getStats(),
  getEntity(type, id),
  traceParcel(parcelId),
  snapshot(options),
  exportScene(options),
  exportCheckpoint(),
  importCheckpoint(blobOrBuffer),
  exportEventLog(options),
  assertInvariants(level),
  stateHash(),
  capturePNG(),
};
```

Also expose:

```js
window.__LOOPGARDEN_READY__ = true;
window.__LOOPGARDEN_FATAL__ = null;
```

`runTo` must:

- step without animation delays;
- optionally render only at requested milestones;
- yield periodically to avoid locking the browser;
- return a promise with tick, state hash, elapsed time, and invariant status;
- produce exactly the same state as repeated calls to `step(1)`.

Support URL parameters such as:

```text
?seed=1&width=440&height=735&headless=1&until=1000000
```

No core state update may depend on `requestAnimationFrame`, actual elapsed milliseconds, display refresh rate, device pixel ratio, or whether the tab is visible.

---

## 28. Saveable analytical artifacts

The system should be designed from the first prototype to produce an AI-readable evidence bundle.

At ticks 10, 100, 1,000, 10,000, 100,000, and 1,000,000, produce:

- a pixel-perfect PNG at 440×735;
- an AI-readable scene JSON describing everything visible and all biologically important hidden state;
- a deterministic state hash;
- aggregate metrics since the previous checkpoint;
- the genome and lineage tables needed to interpret the scene;
- a compact event slice around the checkpoint;
- optional full binary checkpoint for exact continuation.

For a standard three-seed experiment, use a directory such as:

```text
loopgarden-seeds-1-2-3/
  loopgarden.html
  README.md
  manifest.json
  seed-1/
    tick-0000010.png
    tick-0000010.scene.json
    ...
    summary.json
    lineages.csv
    morphotypes.csv
    chemistry-flux.csv
    network-components.csv
    notable-parcel-traces.json
  seed-2/
  seed-3/
  cross-run-summary.csv
```

### 28.1 Scene JSON

Each checkpoint scene should contain:

- configuration and schema version;
- seed, tick, PRNG state, and state hash;
- global R/G/B totals and parcel-state totals;
- compound abundance by state;
- every live node and edge, with coordinates and chemistry;
- every carrier, with compound, path, and progress;
- seeds and flowers;
- plant and genome summaries;
- physiological connected components and cycle rank;
- recent chemical flux and cross-owner transfer;
- notable events since the prior checkpoint;
- renderer palette and brightness rules.

This is the preferred format for downstream AI analysis. A screenshot shows phenotype; scene JSON explains exactly what was rendered.

### 28.2 Event log

Support two modes:

- normal: aggregate all events, retain all births, deaths, mutations, grafts, flower completions, edge breaks, and reactions, plus a bounded ring buffer of routine movement;
- forensic: write every event to NDJSON, optionally compressed with `CompressionStream` when available.

Every event record begins with:

```js
{
  schema: 1,
  tick,
  type,
  entityId,
  causeEventId,
  localIds: [...]
}
```

Reaction records must include carrier and node parcel IDs, both compounds before and after, node home and target, plant and genome provenance, and edge of arrival.

Carrier ownership must never be inferred. Instead record the sequence of owner tissues traversed by its stable parcel ID.

### 28.3 Full checkpoint

The continuation checkpoint includes:

- all typed arrays through their active capacities;
- active lists and permutation cursors;
- free lists;
- genome byte arrays and lineage records;
- PRNG state;
- scheduler state;
- world configuration;
- tick;
- schema and build version.

Import must reproduce the same subsequent state hash as uninterrupted execution.

---

## 29. Metrics that must be collected but never used as rewards

### 29.1 Evolution

- births, germinations, flower failures, and extinctions;
- extant plants, genomes, and genealogical depth;
- genotype abundance and turnover;
- mutation types and survival times;
- descendant reproductive success measured retrospectively;
- diversity at fixed genealogical distance thresholds.

### 29.2 Morphology

- nodes and edges per plant;
- bounding width and height;
- total bond length;
- branch-angle distribution;
- degree distribution;
- terminal-port count;
- tortuosity;
- branch-order distribution;
- bilateral or radial symmetry descriptors;
- self-loop count and cycle rank;
- foreign graft count;
- flowers per body and flower placement;
- flow-weighted versus unweighted morphology.

Cluster morphology only after runs, never during selection. Save representative plant crops for every common morphotype and major outlier.

### 29.3 Chemistry

- compound abundance by free, carrier, bound, and seed state;
- full directed pair-exchange matrix;
- node discharge and restoration rates;
- compound-resolved capture, exit, growth, flower, and seed flux;
- target and gate gene distributions;
- local spatial chemical autocorrelation at several radii;
- parcel residence times in each plant and physiological component.

### 29.4 Network ecology

- connected-component owner count;
- component cycle rank, defined as `E - V + C`;
- self versus foreign graft flux;
- directed carrier transfer between plant IDs and genome clusters;
- amount and composition of material entering and leaving each owner;
- fraction of reproduction supplied by parcels previously processed by another lineage;
- knockout-predicted dependency edges;
- duration and turnover of multi-owner components;
- disparity between reproductive ownership and physiological component membership.

### 29.5 Legibility

- number of simultaneously visible free parcels and carriers;
- overlap rate at raster pixels;
- percentage of important events visible without overlays;
- number of rule verbs required to explain sampled clips;
- viewer accuracy on local event explanations.

---

## 30. Assertions and automated tests

### 30.1 Conservation test

Recount every parcel's compound and assert exact initial R/G/B totals after initialization and at configurable intervals.

Maintain incremental counters for speed, but periodically verify them from raw parcel state.

### 30.2 Parcel exclusivity test

Every parcel appears in exactly one state list. Sentinel fields match its state. Every bound parcel and node point to one another.

### 30.3 Graph integrity test

Check edge endpoints, symmetric adjacency, degree bounds, duplicate edges, dead references, raster occupancy, and forbidden crossings.

### 30.4 Exchange test

Exhaustively test all compound pairs and eligible swaps:

- one unlike token exchanged;
- no elemental total changes;
- home-state nodes only discharge when carrier approaches target;
- discharged nodes only take restorative swaps;
- deterministic tie behavior is unbiased across rotated keys.

### 30.5 Determinism test

Run the same seed and config twice to each milestone. Assert identical state hashes, metrics, JSON scenes, and PNG byte hashes.

Run `step(1)` repeatedly and `runTo(N)` in batches. Assert identical states.

### 30.6 Scheduler fairness test

In a no-op test world, give each class and entity many opportunities. Verify observed counts against the integer target rates and confirm no entity is starved across permutation epochs.

Add and remove entities mid-epoch and confirm no duplicate or skipped list corruption.

### 30.7 Density-independence test

Clone a focal plant into worlds with different amounts of inert population. Express waiting in each focal entity's opportunities and verify its local life cycle remains statistically comparable.

### 30.8 Owner-neutrality test

Create geometrically and chemically identical nodes with different ownership labels. With identical event tie keys, chemical, routing, grafting, and maintenance outcomes must match.

Add a source audit that flags uses of `plantId`, `genomeId`, `lineage`, `fitness`, `score`, `winner`, `novelty`, and `beauty` inside rule functions.

### 30.9 Serialization test

Checkpoint, restore into a fresh page, run another fixed number of events, and compare against uninterrupted execution.

### 30.10 Mobile startup test

Test direct opening and preview embedding on iOS-sized viewports. Assert nonzero canvas dimensions, startup marker, active ticks, working touch controls, and a visible fatal-error message on deliberate failure.

---

## 31. Required implementation sequence

Do not collapse these phases into one large build.

### Phase 0: visual and physical proof

Output: `loopgarden-00-flow-proof.html`

Implement only:

- fixed-point geometry;
- parcels and exact conservation;
- two or three hand-authored graphs;
- carrier capture and movement;
- reversible node exchanges;
- routing and gates;
- one self-loop and one foreign graft;
- edge fading and breakage;
- one hand-triggered flower and seed;
- rendering, inspectors, stepping, and state export.

No genomes, mutation, or autonomous development are required except hard-authored metadata.

Phase 0 passes only if:

- the static full-screen composition is not RGB noise;
- moving carriers are trackable at normal speed;
- a nontechnical viewer can explain sampled capture, exchange, restoration, graft crossing, rejection, fading, and seed detachment events;
- exact conservation and graph tests pass;
- a complementary two-owner loop visibly behaves differently from either isolated graph.

If it fails visually, adjust free-material density, brightness, spacing, and carrier speed before writing evolution.

### Phase 1: viable solitary ancestor

Output: `loopgarden-01-ancestor.html`

Add:

- developmental modules;
- active meristems;
- physical growth;
- flowers;
- seed germination;
- local clocks;
- ancestral genome;
- plant and lineage bookkeeping;
- full headless API.

Keep mutation disabled.

Phase 1 passes only if at least 80 percent of twenty tested seeds produce populations persisting for one hundred descendant generations across a declared viable parameter range, without grafts being necessary.

Diagnose failures through parcel traces and event counts. Do not hide them with extra starting matter or guaranteed seed placement.

### Phase 2: evolution without foreign grafts

Output: `loopgarden-02-evolution.html`

Enable mutation but temporarily permit only same-rule self-grafting or disable all graft completion as an experimental switch.

Establish:

- persistent mutation and descent;
- differential reproductive success;
- multiple recurrent morphologies;
- functional effects of morphology interventions;
- chemical specialization or stable generalism;
- no scheduler or cap artifact dominating outcomes.

This isolates whether morphology and chemistry can evolve before shared networks complicate interpretation.

### Phase 3: full Loopgarden

Output: `loopgarden-03.html`

Enable the owner-neutral graft rule.

Run preregistered seeds and collect:

- multi-owner component formation;
- cross-owner carrier flux;
- persistence and turnover;
- lineage divergence;
- emerging gate, route, and chemical complementarity;
- exploitation and response;
- morphology-topology change.

Do not add sexual reproduction, context catalysts, extra elements, or energy during this phase.

### Phase 4: causal research build

Output: `loopgarden-04-research.html`

Add experimental controls and automated transplant, knockout, rescue, replay, and competition protocols. The world rules remain those of Phase 3.

Only after Phase 4 evidence should new biology be considered.

---

## 32. Parameter calibration order

Calibrate in this order so later knobs do not mask earlier failures:

1. **Static legibility:** parcel density, palette, tissue brightness, and empty-space fraction.
2. **Carrier visibility:** edge length, carrier speed, render rate, and exchange flash duration.
3. **Physical timescales:** free motion, capture frequency, carrier movement, and edge drying.
4. **Solitary viability:** ancestral home compounds, body size, flower cost, seed maturation, and tip patience.
5. **Morphological opportunity:** branch capture advantage, path transformation advantage, and loop retention.
6. **Mutation supply:** birth rate, point mutation rate, structural mutation rate, and extinction risk.
7. **Graft ecology:** contact frequency, flow across mixed networks, and gate selectivity.

Do not tune parameters to make a particular evolved lineage win. Tune only broad physical regimes using the ancestor and hand-authored controls, then freeze the preregistered research configuration.

For every calibrated parameter, record:

- tested range;
- failure observed at each extreme;
- reason for the final choice;
- whether it was selected before or after evolutionary runs were inspected.

---

## 33. Goal-level success criteria

### 33.1 Engineering success

- One-million-event runs complete without crash or state corruption.
- Conservation and graph assertions pass.
- Seeds reproduce and lineages persist.
- Identical seeds reproduce exactly.
- Headless artifacts explain the rendered frame.

### 33.2 Legibility success

Use blinded short clips and still-plus-trace examples.

Success requires most viewers to correctly identify:

- which parcel moved;
- which two parcels exchanged matter;
- why a node could or could not act;
- whether a carrier crossed or failed a gate;
- which material became tissue or a seed;
- why a branch faded and broke.

The default full-screen view must resemble a sparse living diagram, not static, confetti, or an opaque tangle.

### 33.3 Evolution and ecology success

Require:

- sustained reproduction and mutation from the common ancestral genome;
- multiple persistent heritable lineages or ecotypes;
- differential reproductive consequences explained by local flow and chemistry;
- environmental modification that affects descendants;
- invasion or frequency-dependent tests showing that success is not merely intrinsic growth speed;
- no selection-relevant global bookkeeping.

### 33.4 Functional biophilic-form success

Require:

- at least three recurrent, visually distinguishable connected body plans across replicated runs;
- plantlike stems, turns, branches, loops, tips, and fixed cross flowers remain easy to parse;
- morphology interventions change capture, chemical throughput, maintenance, or reproduction;
- graph-shuffled controls perform differently while preserving chemistry and amount of tissue;
- successful form is not merely the smallest possible stalk or an indiscriminate dense mesh.

---

## 34. What counts as coevolution

Coexistence, cross-feeding, and correlated change are not sufficient.

Claim reciprocal coevolution only when:

1. Two or more descendant lineages interact repeatedly through shared or sequential material flow.
2. A heritable change in lineage A alters the selective environment of lineage B.
3. B subsequently evolves a heritable response specifically advantageous against the derived A environment.
4. A then experiences a changed selective environment because of derived B, with either a measurable response or demonstrated reciprocal fitness effect.
5. Ancestral-versus-derived pairings, competition assays, or time-shift experiments support that interpretation.
6. The mechanism is visible in parcel, gate, route, and network records.

Useful tests include:

- ancestor A with ancestor B;
- derived A with ancestor B;
- ancestor A with derived B;
- derived A with derived B;
- each lineage alone;
- pairings on fresh material distributions;
- pairings on historically modified material distributions.

Use retrospective reproductive rate only as an outcome measure in these experiments, never as a rule.

---

## 35. What would count as a serious breakthrough

The strongest target phenomenon is an **evolved multi-owner physiological individual**.

Evidence should show:

1. A solitary common ancestor was viable.
2. Descendants diverged into chemical, routing, gating, or architectural ecotypes.
3. Mixed grafted networks established a reproducible material circulation absent or weaker in monocultures.
4. Each member made a distinct measurable contribution to carrier processing or topology.
5. At least one lineage lost some autonomous capacity and became dependent on the shared network.
6. A cheating or diversion strategy arose without being encoded as a role.
7. Partners evolved a heritable gate, route, chemistry, or morphology response.
8. Removing one lineage or critical graft disrupted a visible compound-resolved flow.
9. Restoring it rescued the flow and reproductive output.
10. Physiological component boundaries persisted across turnover and no longer aligned cleanly with reproductive plant IDs.

A weaker but still publishable result might be:

- spontaneous evolution of partner-selective chemical gates;
- repeatable tree-to-loop topological transitions preceding division of labor;
- evolved conflict between physiological integration and reproductive ownership;
- novel ecological succession caused by the release of old network matter;
- a demonstrable relationship between graph topology and stable cross-feeding not reducible to abundance.

Do not claim novelty merely because:

- colored matter is conserved;
- plants graft;
- cross-feeding occurs once;
- an R/G/B elemental loop can be enumerated;
- several genotypes coexist;
- the result looks attractive.

The novelty would be the repeatable emergent phenomenon plus causal evidence.

---

## 36. Required controls and ablations

Run the same preregistered seeds when possible.

### Core mechanism controls

- grafts disabled;
- all gates open;
- routing frozen to geometry-only;
- node chemistry frozen while morphology evolves;
- morphology frozen while chemistry evolves;
- node discharge disabled so nodes act as unchanged catalysts;
- exchanges disabled while transport remains;
- bond pruning disabled;
- graph topology shuffled at checkpoints while preserving node chemistry and degree as closely as possible;
- carrier histories shuffled in analysis to test whether apparent cross-lineage contribution exceeds chance.

### Conservation and granularity controls

- two-slot RGB parcels after the three-slot system succeeds;
- externally replenished chemostat matter as a contrast, not the main model;
- locally remixed death matter versus historically placed released matter.

### Ecological-history controls

- derived lineages on fresh terrain;
- derived lineages on historical terrain;
- ancestral lineages on derived historical terrain;
- isolated monocultures;
- mixed communities without physical grafts;
- grafted communities with carrier passage blocked;
- knockout and rescue of individual lineages or grafts.

### Scheduler controls

- alternate fair permutation seeds;
- reversed class evaluation order where logically equivalent;
- doubled and halved all relative rates together;
- focal-lineage tests at different total population sizes.

### Founder controls

- several identical ancestral clones;
- one physical ancestor;
- independently initialized material fields with identical global totals;
- independently mutated replicate histories.

---

## 37. Likely failure modes and disciplined responses

### The world resembles colored static

First reduce parcel density, not tissue brightness. Then increase spatial separation, reduce free brightness, and confirm that carriers remain visible. Do not proceed to evolution until the full screen reads cleanly.

### The graph becomes an illegible hairball

Verify that forbidden crossings, degree four, physical matter cost, and edge weakening work. Reduce graft radius or node step only after those checks. Do not add a self/foreign exclusion rule.

### The ancestor cannot reproduce

Inspect exact parcel traces from capture through failed flower construction. Adjust physical timescales and ancestral chemistry before mutation. Do not add free energy, guaranteed useful captures, or global resource teleportation.

### Minimal stalks dominate

Measure whether extra terminal ports increase capture and whether longer ordered paths increase usable carrier flux. If neither is true, the substrate does not reward morphology. Correct the transport geometry or timescales; do not reward branching or beauty directly.

### Dense branching explodes

Check physical parcel consumption, port competition, flow division, and edge maintenance. Safety caps should rarely bind. If caps determine outcomes, the ecology is not yet valid.

### One RGB generalist fixes

Measure local chemical debt and spatial persistence. Slower free mixing, stricter gates, and stronger dependence on ordered node processing are principled adjustments. Do not penalize generalism by gene count.

### Pure-color specialists simply starve

Verify adjacent chemical mutation and that multi-node paths can actually construct their home material. Consider wider gate tolerance before adding new reaction types.

### Grafts never form

Measure geometric encounter frequency with mutation disabled. Adjust founder spacing, branch reach, and graft radius using neutral clones. Do not reward foreign contact.

### Every contact grafts into one global network

Confirm chemical gates affect actual flow even when structure connects. If structural tangles remain universal, make graft completion depend on reciprocal endpoint gate admission, still without owner identity.

### Grafts form but do nothing

Compare carrier residence, exchange order, node restoration, and reproductive material delivery with the graft cut. If topology does not alter those, fix the transport model before adding ecological complexity.

### Single-carrier loops persist forever

Measure whether they reproduce, sequester material, or merely survive. Treat nonreproductive persistent loops as ecological reservoirs or fossils unless they overwhelm the view. If necessary, add a small universal node leakage rate and render it explicitly.

### One lineage parasitizes every consortium

That may be a valid result. Test invasion from rarity, gate evolution, and long-run collapse versus stabilization before intervening.

### Apparent coevolution is only sorting

Run ancestral-derived time-shift pairings, transplant tests, and reciprocal invasions. Do not use cross-correlation alone.

### Attractive shapes are developmentally hard-coded

Compare mutated grammar outcomes and morphology interventions. Fixed cross flowers are allowed; recurrent mature body plans must vary and affect flow.

### Results depend on a safety cap or scheduler artifact

Report failure. Increase capacity or change implementation, then repeat. Do not interpret cap-selected minimalism as natural selection.

---

## 38. Scholarly positioning

Individual ingredients have substantial precedents:

- evolving plantlike cellular systems: [Biomaker CA](https://arxiv.org/abs/2307.09320);
- mass-conserving emergent evolutionary dynamics: [Flow-Lenia](https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass);
- evolvable self-reproducing artificial cells: [Hutton](https://direct.mit.edu/artl/article/13/1/11/2549/Evolvable-Self-Reproducing-Cells-in-a-Two);
- spatial coexistence in autocatalytic ecosystems: [Plum et al.](https://arxiv.org/abs/2212.14445);
- local adaptive transport topology without a global optimizer: [Hu and Cai](https://link.aps.org/doi/10.1103/PhysRevLett.111.138701);
- topology-dependent division of labor: [Yanni et al.](https://elifesciences.org/articles/54348);
- evolutionary stability of waste-product cross-feeding: [Zachar et al.](https://www.nature.com/articles/s41598-023-27421-w);
- filamentary evolving digital organisms: [Microcosmos](https://arxiv.org/html/2607.02954v1).

Therefore the defensible research claim is not that Loopgarden invented conservation, plant morphology, cross-feeding, adaptive networks, or digital evolution.

The prospective contribution is the integration of:

- individually traceable conserved material;
- visibly reversible tissue chemistry;
- evolved plantlike transport topology;
- owner-neutral grafting;
- separate reproductive ownership within shared circulation;
- rigorous causal interventions.

Literature review must be refreshed before publication. Treat the links above as orientation, not an exhaustive novelty search.

---

## 39. First-build default configuration

These are disciplined starting values, not conclusions:

```js
WORLD_W = 440
WORLD_H = 735
FP = 256
PARCEL_COUNT = 18000
FOUNDER_CLONES = 16
HEADING_COUNT = 16
NODE_STEP_FP = 768
FREE_STEP_FP = 192
CAPTURE_RADIUS_FP = 576
GRAFT_RADIUS_FP = 384
MAX_NODE_DEGREE = 4
MAX_MODULES = 12
MAX_BRANCH_DEPTH = 8
MAX_NODES_PER_PLANT_SAFETY = 1024

WEIGHT_FREE = 1
WEIGHT_CARRIER = 10
WEIGHT_TIP = 2
WEIGHT_EDGE_MAINTENANCE = 1
WEIGHT_FLOWER = 2
WEIGHT_SEED = 2

CARRIER_PROGRESS_PER_OPPORTUNITY = 16384
EDGE_DRY_WARN = 24
EDGE_DRY_BREAK = 48
TIP_FAILED_JOB_LIMIT = 96
SEED_MATURATION = 8
SEED_MAX_AGE = 128

MUTATION_POINT_MEAN = 0.35
MUTATION_STRUCTURAL_PROBABILITY = 0.02
```

Every value must live in one immutable configuration object included in exports. Do not scatter biological constants throughout functions.

---

## 40. Final acceptance checklist for the implementing instance

Before calling a milestone complete, answer yes to all applicable questions.

### Physics and bookkeeping

- Are parcel and elemental totals exact?
- Can a stable parcel ID be traced through every state?
- Can every chemical result be reproduced as one reciprocal swap?
- Are graph crossings and degree limits enforced?
- Does checkpoint restoration reproduce future hashes?

### Causality

- Is every biological decision local?
- Does any rule consult owner identity when it should not?
- Does any statistic influence selection?
- Can a viewer see both sides of a chemical exchange?
- Does branch topology alter actual parcel paths?

### Evolution

- Is the common ancestor viable without partners?
- Does every seed consume a real parcel?
- Are mutations incremental and heritable?
- Are lineage metrics observational only?
- Can multiple descendants interact without named roles?

### Form

- Are bodies sparse connected botanical graphs?
- Are turns and branches not restricted to four or eight obvious lattice directions?
- Do unused bonds visibly fade before breaking?
- Is every flower a simple functional cross?
- Does morphology change capture, flow, chemistry, maintenance, or reproduction?

### Reproducibility and delivery

- Does the file run directly on phone and desktop?
- Does the full UI fit without scrolling?
- Do 1× through 256× controls work?
- Are high-speed visual flashes disabled without changing simulation state?
- Can a headless runner reach one million events and save PNG plus JSON checkpoints?
- Do identical runs produce byte-identical state artifacts?

---

## 41. Final implementation instruction

Build the smallest version that makes the central causal loop undeniable:

```text
free parcel
  -> captured carrier
  -> visible traversal of a plant graph
  -> reciprocal carrier/tissue color exchange
  -> node chemical debt
  -> complementary restoration
  -> growth, graft transfer, exit, or flower delivery
  -> physical seed or released matter
```

Then establish a solitary reproducing ancestor. Then enable mutation. Then enable owner-neutral grafting. Do not reverse that order.

The project has failed if its logs are fascinating but its screen is inscrutable. It has also failed if its screen is beautiful but morphology does not causally affect reproduction. It has not achieved coevolution merely because several colors coexist.

The intended breakthrough, if evolution finds it, is a world in which one can literally watch separate descendants become parts of a shared vascular metabolism while remaining reproductively distinct—and then demonstrate, through knockout, rescue, and time-shift experiments, that each lineage changed the evolutionary conditions of the others.

