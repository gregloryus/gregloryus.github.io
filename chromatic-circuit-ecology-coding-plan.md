# Chromatic Circuit Ecology — Contingent Coding Plan

**Status:** working design proposal, not a binding specification  
**Date:** 2026-07-19  
**Working title:** Chromatic Circuit Ecology  

This document converts the current design conversation and earlier project experiments into a staged coding plan. Every mechanism remains revisable. The purpose is to make the current best hypothesis concrete enough to prototype, falsify, and redirect—not to preserve it against future decisions.

## 1. Project goal

Build an elemental, legible evolutionary ecology in which:

- organisms maintain themselves against continual local degradation;
- reproductive success emerges from survival and construction rather than an explicit fitness score;
- organisms modify persistent local conditions experienced by later generations;
- different lineages can create resources, hazards, and niches for one another;
- morphology is produced by a reusable developmental program rather than a cell-by-cell blueprint;
- larger or more organized bodies can sometimes gain real resilience, without receiving an arbitrary complexity bonus;
- simulation cost follows active matter and events rather than the full logical size of the universe;
- a viewer can understand why a particular organism grew, failed, repaired itself, or reproduced.

The central target is not maximum organism size or genome length. It is the emergence of functionally meaningful organization: transport, repair, buffering, redundancy, local specialization, ecological succession, and eventually cooperation or exploitation between lineages.

## 2. Core design hypothesis

The recommended system is a hybrid of two representations:

1. **A conservative cellular medium** stores environmental chemicals, detritus, and physical history in compact typed arrays.
2. **Sparse organism networks** consist of living nodes and conductive edges placed on a finer integer lattice.

Organisms metabolize local chemicals under an external energy flux. Metabolism generates internal charge, which moves through their networks and pays for growth, repair, reinforcement, and reproduction. Living nodes suffer unavoidable damage. Dead nodes become detritus and release chemically specific material into the medium.

The result is intended to make the environment a cumulative record of life:

> phenotype → metabolism → waste and detritus → altered local conditions → descendant and competitor adaptation

### 2.1 Decisions to confirm before implementation

The recommendations that most strongly determine the initial architecture are:

- **Space:** fine integer 2D coordinates, four structural depth layers, and a coarser environmental lattice.
- **Organism:** a sparse damageable graph, not a fully unfolded tree blueprint or continuous Lenia-like field.
- **Environment:** three conservative visible chemical channels plus chemically specific detritus.
- **Development:** a compact probabilistic rule controller, not one gene per body cell.
- **Longevity:** continual local damage and repair, with no fixed healthy lifespan.
- **Failure:** local node/edge death and fragmentation, never automatic deletion of the entire organism.
- **Time:** scheduled biological events plus slower field and transport updates.
- **Implementation:** headless TypeScript core with typed-array pools; rendering kept separate.

Choices deliberately deferred until controlled baselines exist are inherited somatic learning, foreign-organism fusion, full 3D, sexual recombination, and the final game role.

## 3. Design principles

### 3.1 No explicit fitness function

Do not calculate a fitness score or directly reward size, genome length, longevity, number of organs, or morphological complexity. A lineage succeeds by leaving viable descendants while its material organization is continually challenged.

### 3.2 Longevity means active maintenance

There is no fixed healthy lifespan and no lifespan multiplier based on genome length. Every living node accumulates damage. Persistence requires continued metabolic throughput and repair.

Dormancy may later evolve as a strategy, but dormant structures must still degrade slowly and cannot reproduce without resuming metabolism.

### 3.3 Space is a cost, not a binary body-plan examination

A blocked tip may turn, wait, fuse, or terminate. A collision does not invalidate the whole organism. Several networks may cross using a small number of depth layers. Congestion affects opportunity and resource access without making complete-body fitting the dominant fitness function.

### 3.4 Development is a program, not a blueprint

Genomes encode how active tips respond to local state. They do not enumerate every final node. Repeated and large forms are therefore genetically inexpensive, and the phenotype can respond to conditions encountered during growth.

### 3.5 Matter and history remain local

Chemicals are transferred, converted, diffused, advected, stored, or released. Death does not simply erase a body. Environmental state persists long enough for local ancestry and ecological succession to matter.

### 3.6 Legibility is a first-class constraint

The simulation should be inspectable at the level of local causes. A user should be able to select a tip or node and see:

- its lineage and genome;
- current controller state;
- sensed local conditions;
- available actions and their weights;
- the action selected;
- resource and damage state;
- recent causal events.

### 3.7 Performance architecture begins in the prototype

The first prototype should already separate simulation from rendering, use deterministic random streams, store bulk state in typed arrays, and support headless execution. It does not need to reach the final scale immediately, but it should not depend on object-per-pixel or sprite-per-particle architecture.

## 4. Recommended minimal world

### 4.1 Coordinate systems

Use two aligned spatial scales:

- **Fine coordinates:** integer positions for organism nodes and propagules.
- **Medium coordinates:** one environmental tile for each `FIELD_SCALE × FIELD_SCALE` block of fine positions.

Recommended initial value:

```text
FIELD_SCALE = 4
```

A logical 10,000 × 10,000 fine world therefore contains a 2,500 × 2,500 environmental field before chunk sparsity is considered.

### 4.2 Structural depth

Give organism nodes four discrete depth layers:

```text
STRUCTURE_LAYERS = 4
```

One node may occupy a fine `(x, y, layer)` position. Networks in different layers can cross without collision. Changing layer costs material and charge. The renderer differentiates layers through brightness, stroke width, or a slight screen offset.

This is a recommended 2.5D compromise: it reduces planar packing pressure while remaining causally and visually understandable.

### 4.3 Environmental channels

Each medium tile initially stores:

- `chemR`: red chemical units;
- `chemG`: green chemical units;
- `chemB`: blue chemical units;
- `detritusR`, `detritusG`, `detritusB`: slowly weathering bound material;
- `structure`: the amount of persistent physical residue;
- `permeability`: derived or cached effect on chemical movement;
- `activeFlags`: whether the tile needs field processing;
- `lastUpdateTime`: for lazy decay and inactive-chunk sleeping.

Use unsigned integer quantities, preferably `Uint16Array`, for chemical accounting. Integer state improves conservation tests, reproducibility, and cross-platform determinism.

### 4.4 External energy

External free energy is not a material chemical channel. It is a procedural function of position and simulation time:

```text
illumination = illuminationAt(x, y, time)
```

Recommended progression:

1. Begin with uniform illumination to validate metabolism and conservation.
2. Add weak, slowly moving broad fronts after the baseline works.
3. Later add intermittent patches, seasons, or disturbances.

Avoid a one-cell “sun cursor” that arbitrarily triggers lifecycle events. The energy field should modulate metabolic rates continuously or probabilistically.

## 5. Recommended minimal organism

An organism is a connected graph of living nodes. Individual identity is useful for statistics and reproduction, but physical survival belongs to graph components rather than an immortal root object.

### 5.1 Living node state

Each node stores:

- fine `x`, `y`, and `layer`;
- lineage ID and genome ID;
- component/organism ID;
- integrity;
- internal charge;
- construction-material channel and bound mass;
- age or birth time for diagnostics only;
- controller state if the node is an active tip;
- heading and recent turn history if it is an active tip;
- up to four edge indices;
- next scheduled biological event;
- flags for tip, reinforcing, dormant, dying, or detached state.

Recommended initial fixed limits:

```text
MAX_NODE_INTEGRITY = 255
MAX_NODE_CHARGE = 65535
MAX_NODE_DEGREE = 4
```

### 5.2 Edges

Edges connect nearby nodes and conduct charge. Initially:

- edges are undirected;
- transport is local pairwise equalization;
- each edge has integrity and conductance;
- broken edges are removed locally;
- loops are legal;
- self-fusion can create a new edge between compatible nearby nodes.

Do not begin with a global electrical-network solve. Local diffusion is cheaper, more legible, and makes topology and transport distance matter.

### 5.3 Active tips

Tips are nodes currently capable of developmental action. A tip senses local conditions, evaluates the inherited controller, and selects an action.

Recommended initial sensors:

- desired input chemical is locally available;
- local illumination is high;
- internal charge is above the growth reserve;
- connected component has a damage signal;
- forward position is blocked;
- nearby tissue is self/kin;
- nearby tissue is foreign;
- local detritus is high;
- current depth layer has spare capacity.

These should be quantized flags or small bins, not raw floating-point values.

Recommended initial actions:

- wait;
- extend left;
- extend forward;
- extend right;
- branch;
- change depth layer;
- reinforce current edge/node;
- self-fuse;
- construct a propagule.

Actions that are impossible in the current context should be masked before sampling. The controller may then choose from the remaining weighted actions.

### 5.4 Metabolism

The simplest initial genome specifies:

- one preferred input chemical channel;
- one output chemical channel;
- one construction chemical channel;
- sensitivity or tolerance to each local chemical channel;
- absorption rate;
- conversion efficiency;
- excretion rate;
- charge reserve thresholds for repair, growth, and reproduction.

A living node may perform metabolism when:

- its preferred input chemical exists in the corresponding medium tile;
- illumination is available;
- it has internal capacity;
- the medium can accept the output chemical.

One metabolic transaction:

1. removes input chemical units from the medium;
2. adds output chemical units to the medium;
3. adds internal charge to the node;
4. loses some free energy as unusable dissipation.

Chemical matter should balance exactly. Energy need not be conserved inside the simulated system because illumination is an explicit external low-entropy input and charge decay is an explicit sink.

Growth removes a fixed amount of the genome's construction chemical from the local medium and binds it into the new node. Each node therefore stores its construction channel and bound mass. Repair consumes charge plus a smaller amount of compatible local material. Death transfers the node's remaining bound mass into matching detritus channels. This closes the matter ledger across growth, repair, damage, and decay.

### 5.5 Charge transport

At each network transport step, every active edge proposes a bounded transfer from the higher-charge node to the lower-charge node. Transfers use a plan–accept–apply pass so one node cannot spend the same charge through multiple edges in one update.

This follows the conservative update style demonstrated in `rgbfields`.

### 5.6 Damage and repair

Every living node experiences stochastic integrity loss. Recommended initial hazard factors:

- a universal base damage rate;
- additional hazard from local chemical mismatch or toxic output;
- additional hazard from high congestion;
- optional later disturbances such as drought, heat fronts, or fire.

Repair is initially automatic rather than a separate tip action:

- if integrity falls below the genome’s repair threshold;
- and local charge exceeds its repair reserve;
- consume charge and restore integrity.

This gives evolution control over repair allocation without requiring every node to run a large controller every moment.

### 5.7 Local death

When integrity reaches zero:

1. remove the node’s living occupancy;
2. break its incident edges;
3. add chemically colored detritus to the medium;
4. release a defined portion of remaining charge as lost heat;
5. mark newly disconnected components for relabeling;
6. allow viable fragments to continue independently.

Do not kill the entire organism because one node failed.

### 5.8 Fragmentation

After a node or edge deletion, component labels may be stale. Avoid a full graph traversal on every break.

Recommended approach:

- mark the affected component `possiblySplit`;
- defer relabeling until a process needs component-level information;
- run bounded BFS/DFS from the affected neighbors;
- assign new component IDs only when a real split is confirmed.

A fragment remains alive if it contains living nodes. It can metabolize, repair, and potentially develop new tips. No permanent seed/root is required after establishment.

### 5.9 Reproduction

Reproduction is construction, not a timer.

A tip may construct a propagule only when:

- local/component charge exceeds the reproduction reserve;
- enough local chemical matter is available;
- the tip’s controller selects the action;
- the tip has a viable launch direction.

Construction deducts charge and matter. The propagule carries:

- a mutated or cloned genome reference;
- a small initial integrity reserve;
- a limited initial charge reserve;
- lineage ancestry metadata.

Initial dispersal should use a bounded biased random walk or sampled displacement kernel. It should not require a large empty square. Landing requires only a viable fine position and a compatible medium tile.

Propagules degrade while traveling and dormant.

## 6. Developmental genome

### 6.1 Representation

Use a small rule list inspired by the path-keyed urn system, but make contexts reusable.

Each rule contains:

- permitted controller state;
- required sensor-bit mask;
- forbidden sensor-bit mask;
- integer action weights;
- optional controller-state transition per selected action.

Evaluation:

1. calculate the tip’s sensor bits;
2. find the first or most-specific matching rule;
3. mask impossible actions;
4. sample an action proportional to its integer weights;
5. apply the corresponding controller-state transition.

Recommended limits for the first evolved version:

```text
CONTROLLER_STATES = 4
MAX_RULES = 12
ACTION_COUNT = 9
ACTION_WEIGHT_RANGE = 0..31
```

The source genome remains a compact, inspectable rule list. At genome creation, compile it into an efficient lookup or decision structure used by all organisms sharing that genome.

### 6.2 Mutation operators

Start with symmetric, bounded operators:

- increment or decrement one action weight;
- change one required or forbidden sensor bit;
- change a rule’s controller state;
- change one action’s next state;
- duplicate a rule;
- delete a rule;
- change input or output chemical channel;
- adjust one metabolic or reserve threshold;
- adjust dispersal parameters.

Deletion and simplification must be as accessible as expansion. Do not introduce a one-way genome-length ratchet.

Recommended child distribution:

- 60% exact clones;
- 35% one mutation;
- 5% two or more mutations with a short geometric tail.

These are starting values only. Mutation rate should be measured per generation and per effective rule, not only per emitted propagule.

### 6.3 Genome identity and storage

Canonicalize genomes and store them once in a `GenomePool`. Organisms keep an integer genome ID. Exact clones share the same compiled controller and metadata.

Use reference counts or epoch-based cleanup so extinct genomes can eventually be released without expensive per-tick registry scans.

### 6.4 Somatic learning and inherited acquired state

The urn project suggests allowing developmental outcomes to modify later probabilities. This is promising but should not be enabled in the baseline.

Design the controller so each organism can optionally maintain small somatic weight deltas. Later experiments can compare:

- no learning;
- within-lifetime reinforcement only;
- offspring inheriting a fraction of somatic deltas;
- offspring inheriting deltas only after successful reproduction.

This should be treated as an experimental axis, not silently mixed into ordinary genetic evolution.

## 7. Environmental field engine

### 7.1 Chunks

Recommended medium chunk dimensions:

```text
MEDIUM_CHUNK_SIZE = 64 × 64 medium tiles
FINE_SPAN_PER_CHUNK = 256 × 256 fine positions when FIELD_SCALE = 4
```

Each allocated chunk owns its field arrays and scratch buffers. Chunks are keyed by integer chunk coordinates, preferably packed into a numeric or BigInt key rather than string concatenation.

A chunk is active if it contains:

- non-equilibrium chemical gradients;
- detritus still weathering;
- living nodes;
- traveling propagules;
- an approaching environmental disturbance.

Inactive chunks sleep.

### 7.2 Chemical movement

Begin with slow cardinal diffusion between medium tiles. Use double buffers or explicit transfer scratch arrays.

Required invariants:

- no channel becomes negative;
- target capacity is never exceeded;
- total chemical mass changes only through logged boundary/input/output operations;
- update order does not systematically favor a scan direction;
- chunk boundaries behave identically to interior boundaries.

Later additions may include:

- gravity or moisture-like advection;
- permeability modified by detritus;
- directional flow fronts;
- different diffusion rates per chemical channel.

Do not add these until the baseline can demonstrate metabolic succession.

### 7.3 Detritus weathering

Detritus binds chemistry and changes physical conditions. At slow intervals:

- a fraction of colored detritus returns to the free chemical fields;
- `structure` decays;
- permeability moves toward its baseline;
- tiles with no remaining gradient or decay work may sleep.

Store `lastUpdateTime` so simple exponential or linear relaxation can be applied lazily when a dormant tile is reactivated.

### 7.4 Boundary conditions

Recommended default:

- bounded world;
- low chemical influx from a small number of broad boundary bands or rain-like events;
- explicit outflow or sequestration at selected boundaries;
- no toroidal wrap in the primary ecology.

Toroidal mode can remain available for controlled experiments. Bounded worlds make flow and ecological geography easier to interpret.

## 8. Time architecture

Use three time scales.

### 8.1 Field time

Active medium chunks update chemistry at a fixed coarse interval, for example every 8 or 16 biological time units.

### 8.2 Network time

Active edges perform charge transport at a fixed interval faster than environmental diffusion but slower than rendering.

### 8.3 Biological event time

Growth, metabolism, damage, repair, propagule movement, dormancy, and reproduction are scheduled events.

Use a bucketed event wheel:

- a circular array of time buckets;
- each event stores its due time and next-event index;
- processing a bucket ignores stale events through generation counters;
- bounded delays receive near-O(1) insertion and removal;
- far-future events use an overflow structure or hierarchical wheel.

Avoid a binary heap until measurement shows the event-delay distribution requires one.

### 8.4 Determinism

Simulation results must be replayable from:

- engine version;
- world seed;
- configuration hash;
- starting genomes;
- logged user disturbances.

Prefer independent deterministic PRNG streams for:

- each chunk’s environmental events;
- each genome or lineage’s mutation;
- organism decisions;
- global disturbances.

This prevents changes in one subsystem’s event count from completely scrambling every other random sequence.

## 9. Core code organization

Recommended implementation stack:

- TypeScript for the first complete prototype;
- Node-compatible headless core;
- browser renderer and controls as a separate package or entry point;
- typed-array pools inside the TypeScript core;
- Rust/WebAssembly only after profiling identifies a stable hot loop worth porting.

Suggested project layout:

```text
src/
  core/
    config.ts
    ids.ts
    prng.ts
    event-wheel.ts
    simulation.ts
    snapshot.ts
  medium/
    medium-chunk.ts
    chunk-map.ts
    chemistry.ts
    detritus.ts
    forcing.ts
    conservation.ts
  life/
    node-pool.ts
    edge-pool.ts
    component-index.ts
    tips.ts
    metabolism.ts
    transport.ts
    damage.ts
    repair.ts
    death.ts
    propagules.ts
    reproduction.ts
  genetics/
    genome.ts
    genome-pool.ts
    controller.ts
    compile-controller.ts
    mutation.ts
    lineage.ts
  spatial/
    coordinates.ts
    occupancy.ts
    neighborhood.ts
  observability/
    stats.ts
    event-log.ts
    experiments.ts
    inspectors.ts
  render/
    field-texture.ts
    network-buffer.ts
    camera.ts
    overlays.ts
    ui.ts
  headless/
    cli.ts
    reports.ts
tests/
benchmarks/
```

The simulation core must not import PIXI, browser globals, DOM APIs, or renderer objects.

## 10. Packed storage plan

### 10.1 Node pool

Use structure-of-arrays storage with integer handles. Candidate arrays:

```text
nodeAlive: Uint8Array
nodeGeneration: Uint16Array
nodeX: Int32Array
nodeY: Int32Array
nodeLayer: Uint8Array
nodeGenomeId: Uint32Array
nodeLineageId: Uint32Array
nodeComponentId: Uint32Array
nodeIntegrity: Uint8Array
nodeCharge: Uint16Array
nodeBodyChannel: Uint8Array
nodeBodyMass: Uint16Array
nodeFlags: Uint16Array
nodeControllerState: Uint8Array
nodeHeading: Uint8Array
nodeEdge0..3: Int32Array
nodeNextEvent: Uint32Array or event handle
```

Use free lists and generational handles so stale references can be detected without object allocation.

### 10.2 Edge pool

Candidate arrays:

```text
edgeAlive: Uint8Array
edgeGeneration: Uint16Array
edgeA: Uint32Array
edgeB: Uint32Array
edgeIntegrity: Uint8Array
edgeConductance: Uint8Array
edgeFlags: Uint8Array
```

### 10.3 Fine occupancy

Do not allocate a dense 10,000 × 10,000 × 4 object grid.

Recommended options:

- allocate fine occupancy arrays only inside chunks containing living structure;
- use one integer node handle per `(x, y, layer)` position;
- release an occupancy chunk when it has no nodes, propagules, or lingering collision state.

### 10.4 Rendering buffers

Do not create one sprite per node or chemical particle.

- Render medium fields from packed RGBA texture buffers.
- Render nodes and edges using instanced geometry or batched line/point buffers.
- Animate a sampled subset of charge transfers as cosmetic pulses.
- Update only visible or dirty chunks.

## 11. Phased implementation plan

### Phase 0 — Executable specification and harness

Goal: establish deterministic infrastructure before biological complexity.

Build:

- configuration schema and validation;
- deterministic PRNG streams;
- event wheel;
- headless CLI;
- snapshot serialization;
- run metadata and configuration hashing;
- benchmark harness;
- invariant/assertion framework.

Acceptance checks:

- identical seed and config produce byte-identical summary output;
- snapshot/restore produces the same continuation as an uninterrupted run;
- one million synthetic scheduled events execute without leaked or duplicated events;
- stale generational handles are detected.

### Phase 1 — Conservative environmental medium

Goal: produce an efficient, visually inspectable RGB chemical world without life.

Build:

- medium chunks and active-chunk map;
- three chemical channels;
- plan–accept–apply diffusion;
- boundary influx/outflow accounting;
- detritus weathering placeholder;
- texture rendering and field inspector;
- conservation ledger.

Acceptance checks:

- closed-world chemical totals remain exact over long runs;
- boundary transfers match ledger totals;
- chunk-edge behavior matches an equivalent single-chunk simulation;
- scan-direction reversal does not materially change aggregate diffusion;
- sleeping and waking a chunk produces the same result as continuous updating for supported lazy processes.

### Phase 2 — Fixed-genome living networks

Goal: validate metabolism, transport, damage, repair, and local death before evolution.

Build:

- node, edge, and occupancy pools;
- one hand-authored controller;
- one metabolism pair;
- charge generation and transport;
- stochastic damage;
- automatic repair thresholds;
- tip extension and branching;
- local node death and detritus creation;
- component split detection;
- network renderer and node inspector.

Acceptance checks:

- a metabolically active network can maintain itself under moderate damage;
- removing energy causes eventual decay;
- severing an edge produces correct components;
- loops route charge around a severed edge better than equivalent trees;
- a dead node becomes accounted environmental material;
- no whole-organism deletion occurs from an ordinary local failure.

The Phase 2 loop comparison may use hand-authored graph fixtures. The evolved self-fusion action remains disabled until Phase 5, so its later contribution can be measured independently.

### Phase 3 — Reproduction, genomes, and evolution

Goal: establish genuine heredity and mutation without yet requiring rich coevolution.

Build:

- compact rule-list genomes;
- compiled controllers;
- genome canonicalization and pooling;
- propagule construction, dispersal, landing, and decay;
- symmetric mutation operators;
- lineage tracking;
- genome and developmental-decision inspectors;
- extinction detection and explicit restart modes.

Acceptance checks:

- exact clones develop statistically similarly in equivalent environments;
- mutations can both add and remove rules or behavior;
- propagule matter and charge costs are fully accounted;
- no genotype uniqueness rule exists in the ecological baseline;
- lineage persistence can be measured without assigning a fitness score;
- at least several morphologies coexist under a deliberately heterogeneous control environment.

### Phase 4 — Historical chemistry and local adaptation

Goal: test the project’s defining claim that life creates locally inherited conditions.

Build:

- mutable input/output metabolic channels;
- lineage-colored detritus;
- slow persistent chemical residues;
- limited dispersal;
- weak initial environmental heterogeneity;
- reciprocal-transplant experiment runner;
- environment-reset and frozen-environment controls.

Acceptance checks:

- lineages change local chemical composition in reproducible directions;
- later community composition depends on earlier occupants;
- at least some lineages perform better in ancestral patches than randomized patches;
- resetting environmental history changes lineage performance while holding genomes fixed;
- disabling organism-driven environmental changes measurably reduces succession or niche differentiation.

Do not claim “local adaptation” from visual clustering alone. Require controlled transplants.

### Phase 5 — Resilience and ecological interaction

Goal: make increasing organization functionally useful.

Add one mechanism at a time:

1. self-fusion and loops;
2. edge reinforcement and variable conductance;
3. spatially intermittent energy fronts;
4. component-level storage or dormant buds;
5. foreign contact with an evolvable conductance/compatibility rule;
6. optional within-lifetime controller reinforcement;
7. optional partial inheritance of acquired controller changes.

Every addition requires an ablation comparison. In particular:

- loops should improve survival under random edge deletion;
- storage should improve survival under resource intermittency;
- foreign conductance should produce measurable exchange, exploitation, or mutual benefit;
- inherited learning should outperform both no-learning and learning-without-inheritance controls in temporally persistent environments.

### Phase 6 — Scale and world persistence

Goal: expand logical area and evolutionary duration without changing the rules.

Build and optimize:

- sparse chunk serialization;
- offscreen chunk sleeping;
- dirty visible-chunk rendering;
- incremental statistics;
- genome and lineage garbage collection;
- worker-thread or Web Worker execution;
- profiler-guided hot-loop rewrites;
- optional WASM module for stable dense kernels;
- long-run checkpoints and resumable experiments.

Scale gates should progress roughly as follows:

1. 512 × 512 fine world, tens of thousands of living nodes;
2. 2,048 × 2,048 logical world, hundreds of thousands of nodes;
3. sparse 10,000 × 10,000 logical world;
4. one million living nodes or an evidence-based lower practical ceiling;
5. millions of biological time units through sleeping and event scheduling.

Do not optimize toward 10,000 × 10,000 before profiling shows which state is genuinely dense.

### Phase 7 — Simulation/game interface

Goal: make the system understandable and meaningfully interactive without turning the user into the hidden fitness function.

Recommended first interaction model: **naturalist and experimentalist**, not breeder.

Features:

- pan, zoom, and time-speed controls;
- pause and single-event stepping;
- select node, network, lineage, genome, or medium tile;
- visualize chemical channels separately or combined;
- visualize charge flow, damage, repair, ancestry, and detritus age;
- display current rule match and action odds for a selected tip;
- replay the recent causal history of a selected death or reproduction;
- run controlled disturbances and save them in the replay log;
- launch reciprocal-transplant and environmental-reset experiments;
- bookmark notable lineages and ecological transitions.

Possible later game framing:

- preserve lineage diversity through changing climates;
- diagnose why an ecosystem is collapsing;
- create disturbances and predict succession;
- curate an evolving world without directly choosing winners.

## 12. Key decisions and recommendations

### Decision 1: Is the primary space a lattice, continuous plane, or full 3D volume?

**Recommendation:** fine integer 2D coordinates plus four structural layers and a coarser environmental lattice.

Why:

- deterministic and fast neighborhood queries;
- visually legible;
- compatible with sparse chunks;
- permits crossings and reduced packing pressure;
- avoids the memory and occlusion costs of full 3D.

Revisit full continuous geometry only if integer growth looks irreducibly rectilinear. Revisit sparse 3D only after the 2.5D ecology demonstrates meaningful organization.

### Decision 2: Are organisms trees, graphs, or undifferentiated fields?

**Recommendation:** explicit sparse graphs with legal cycles.

Trees are easy but make every connection a single point of failure. Graph cycles allow redundancy and make topology relevant to entropy resistance. Undifferentiated fields would move the project toward Lenia and reduce causal legibility.

### Decision 3: Does the genome encode a body or a developmental policy?

**Recommendation:** a reusable probabilistic developmental policy.

This removes the cell-per-gene size cost, permits plasticity, and makes repeated motifs cheap. Triple-bit trees may later be callable subroutines or motifs, not the entire genome.

### Decision 4: Should development be deterministic or stochastic?

**Recommendation:** weighted stochastic actions under deterministic replay.

This permits genetically identical organisms to respond differently while keeping action odds inspectable. A deterministic PRNG makes every run reproducible.

### Decision 5: Should acquired developmental changes be inherited?

**Recommendation:** not in the baseline; explicitly support it as a later controlled experiment.

Inherited learning could create powerful local historical adaptation, but it would confound ordinary mutation and selection if enabled from the beginning.

### Decision 6: What constitutes environmental memory?

**Recommendation:** chemically specific waste plus slowly weathering detritus, not a scalar fertility score.

A scalar makes every death universally beneficial. Multiple channels create lineage-dependent benefit, toxicity, cross-feeding, and succession.

### Decision 7: How many environmental chemical channels?

**Recommendation:** three.

Two channels tend toward a single opposition; four or more become difficult to see and reason about. RGB provides three-way differentiation and a direct visual encoding.

### Decision 8: Are chemical particles individually simulated?

**Recommendation:** no; store integer quantities in field tiles and nodes. Render only sampled cosmetic particles.

This retains visible causality without making performance proportional to every photon or water molecule.

### Decision 9: How is energy supplied?

**Recommendation:** procedural broad illumination/energy fields, initially uniform and later slowly moving or intermittent.

Energy should power metabolism, not directly trigger germination, reproduction, or death.

### Decision 10: Is there a fixed lifespan?

**Recommendation:** no healthy fixed lifespan. Nodes persist only through repair.

Optional age-dependent damage may later model senescence, but it should arise as a cost profile rather than a hard deletion timer.

### Decision 11: What happens when one part dies?

**Recommendation:** local death, graph fragmentation, and material return.

Whole-organism death should occur only when all viable components fail, not because a root object or arbitrary member dies.

### Decision 12: How should repair compete with growth?

**Recommendation:** evolvable charge reserve thresholds and automatic local repair in the MVP.

This creates an understandable growth-versus-maintenance tradeoff without making every node run the full developmental controller.

### Decision 13: How does reproduction work?

**Recommendation:** tips construct costly degradable propagules from real charge and local material.

Avoid reproduction clocks and emissions proportional to an abstract maturity score.

### Decision 14: How much empty space must a propagule find?

**Recommendation:** only the actual landing position and minimal local viability conditions.

Large empty-neighborhood requirements silently make space packing the dominant fitness criterion.

### Decision 15: Is self-fusion present from the beginning?

**Recommendation:** implement the edge/node architecture so it is possible, but first validate a tree-only fixed-genome baseline; turn self-fusion on in Phase 5.

This makes the value of loops experimentally measurable rather than assumed.

### Decision 16: Can unrelated organisms fuse or exchange resources?

**Recommendation:** defer foreign fusion until self-fusion, transport, and lineage accounting are stable.

When added, use one generic compatibility/conductance mechanic capable of producing isolation, exploitation, or cooperation rather than hard-coded ecological roles.

### Decision 17: Start from one founder or several?

**Recommendation:** use 16 lightly mutated descendants of one ancestral genome for the first ecological experiments; retain a single-founder mode.

This preserves common ancestry while reducing the probability that early stochastic extinction prevents testing. Single-founder runs become more meaningful once the system is demonstrably viable.

### Decision 18: Should the medium begin uniform?

**Recommendation:** use a weak reproducible procedural heterogeneity after the uniform correctness baseline.

The organism-created history should dominate eventually, but weak initial texture helps test local responses and prevents exact global symmetry.

### Decision 19: Closed or open matter system?

**Recommendation:** mostly conserved chemistry with explicitly audited, low-rate boundary influx and outflow.

A perfectly closed world may exhaust usable distributions and stop. An unaccounted open world makes ecological effects difficult to interpret. Every external transfer should enter a conservation ledger.

### Decision 20: Synchronous ticks or continuous time?

**Recommendation:** multirate hybrid time—coarse synchronous field updates, scheduled biological events, fixed-interval local transport.

This is easier to verify than a fully continuous solver and far cheaper than updating every world site every tick.

### Decision 21: JavaScript/TypeScript, Rust, or GPU first?

**Recommendation:** TypeScript headless core first, using packed typed arrays; profile before moving stable kernels to Rust/WASM or WebGPU.

Starting directly in GPU compute would slow design iteration and complicate sparse graph operations. Starting with ordinary object-oriented JavaScript would make later scale work unnecessarily disruptive.

### Decision 22: What should the player do?

**Recommendation:** initially observe, inspect, perturb, and conduct experiments—not manually choose reproductive winners.

Direct breeding would make the user the dominant fitness function and obscure whether the ecology itself generates adaptation.

## 13. Experimental measurements

### 13.1 Basic viability

- living node count;
- propagules produced and established;
- lineage persistence distribution;
- extinction rate;
- fraction of external energy converted to maintenance, growth, reproduction, and loss;
- chemical and detrital mass ledger.

### 13.2 Morphology and organization

- nodes and edges per component;
- degree distribution;
- number of independent cycles;
- transport diameter;
- branch and loop density;
- spatial extent and compactness;
- fraction of nodes acting as tips;
- resource-flow inequality across nodes;
- robustness after controlled node or edge deletion.

Avoid treating any single morphology statistic as fitness.

### 13.3 Evolution

- active genome diversity;
- rule count and effective rule usage;
- mutation survival rate;
- clone versus mutant establishment;
- lineage turnover;
- controller-state and action distributions;
- phenotype variance among exact clones.

### 13.4 Ecological inheritance and coevolution

- chemical composition by lineage neighborhood;
- correlation between ancestor metabolism and descendant environment;
- reciprocal-transplant performance;
- performance after environmental reset;
- community differences between live-history and frozen-environment controls;
- cross-feeding flux between lineages;
- frequency and direction of foreign resource transfer after that mechanic exists.

### 13.5 Open-endedness warning indicators

- prolonged collapse to one genome or one metabolism;
- monotonically shrinking bodies;
- monotonically expanding genomes with unused rules;
- increasing size without increased robustness or ecological function;
- stable equilibrium with no continuing niche turnover;
- reproduction dominated by a loophole such as dormant minimal propagules;
- selection dominated by landing-space probability.

## 14. Required controlled experiments

### Reciprocal transplant

Move or clone evolved propagules among:

- their ancestral patch;
- a patch engineered by a different lineage;
- a chemically randomized patch;
- a fresh baseline patch.

Compare establishment, maintenance duration, and reproduction.

### Environmental reset

Preserve organisms and genomes but reset chemicals and detritus. Compare the continuation with an unmodified checkpoint.

### Frozen environment

Let organisms read environmental chemistry but prevent them from changing it. Compare diversity, succession, and local adaptation with the normal ecology.

### Damage robustness

Apply identical random node/edge deletions to evolved networks and matched tree-like controls. Measure recovery, charge delivery, and reproduction.

### Space-pressure audit

Replay the same genomes under different structural-layer counts and landing rules. If evolutionary rankings change overwhelmingly, space has again become the hidden dominant criterion.

### Complexity ablation

For a successful complex lineage, remove one organizational feature at a time—loops, storage, controller state, reinforcement, or interaction—and test whether performance falls in the environment where it evolved.

Complexity should have demonstrated function, not merely appearance.

## 15. Performance targets and profiling gates

Treat scale figures as targets to test, not promises.

Initial headless targets:

- one million synthetic event-wheel operations without unbounded allocation;
- 512 × 512 fine world with tens of thousands of nodes at interactive speed;
- exact conservation checks enabled in debug mode;
- rendering disabled with no changes to simulation results.

Intermediate targets:

- hundreds of thousands of live nodes;
- thousands of active medium chunks;
- checkpoint and restore within practical interactive time;
- event and field processing dominate runtime, not statistics or rendering.

Long-run target:

- sparse logical world of at least 10,000 × 10,000 fine positions;
- millions of biological time units through event scheduling and sleeping;
- memory proportional to active chunks and living/dead history actually retained.

Profile before each architectural escalation. Likely hot loops are:

- medium diffusion and contention resolution;
- fine occupancy lookup;
- charge transport;
- controller evaluation at tips;
- component split detection;
- rendering buffer generation.

## 16. Major risks and mitigation

### Risk: minimal dormant forms dominate

Mitigation:

- propagules and dormant nodes continue to degrade;
- reproduction requires active metabolic throughput;
- resource availability is intermittent enough that buffering can matter;
- maintenance and construction costs are fully accounted.

### Risk: larger bodies are only more expensive

Mitigation:

- spatially intermittent energy and chemicals;
- internal charge transport;
- local damage and repair;
- loops and redundant routes;
- disturbances large enough that distributed networks can bridge unaffected patches.

Do not compensate with an arbitrary size bonus.

### Risk: chemical ecology becomes a simple rock–paper–scissors cycle

Mitigation:

- evolve rates and thresholds, not only input/output labels;
- include spatial structure, detritus, damage, and transport;
- later allow mixtures or conditional metabolism if the simple system saturates.

### Risk: organism identity becomes ambiguous after fusion and fragmentation

Mitigation:

- distinguish genome, lineage, component, and historical organism IDs;
- define resource exchange mechanically at edges;
- make statistics explicit about which identity level they use.

### Risk: the controller becomes opaque

Mitigation:

- small rule lists;
- integer action weights;
- inspectable sensors and state transitions;
- per-tip decision explanation;
- compiled controllers generated from a human-readable canonical genome.

### Risk: ecological memory is too weak or too strong

Mitigation:

- expose residue production, diffusion, and weathering timescales independently;
- measure ancestral-patch advantage;
- tune ratios of environmental persistence to generation time rather than isolated constants.

### Risk: asynchronous scheduling introduces hidden bias

Mitigation:

- deterministic ordering within equal-time buckets;
- randomized or rotated tie-breaking where appropriate;
- plan–accept–apply for contested transfers;
- invariance tests under ID permutation and scan reversal.

### Risk: performance optimizations change the rules

Mitigation:

- golden deterministic seeds;
- reference slow implementation for small worlds;
- property tests comparing optimized and reference kernels;
- versioned snapshots and configuration hashes.

## 17. Recommended first implementation milestone

The first milestone should not yet evolve.

Build a 512 × 512 fine world with:

- a 128 × 128 RGB chemical medium;
- uniform illumination;
- one fixed metabolism converting red to green;
- several hand-authored network organisms;
- local metabolism and charge generation;
- charge diffusion across edges;
- continual stochastic node damage;
- automatic local repair;
- tip extension and branching;
- local death into green-tinted detritus;
- headless deterministic execution;
- a renderer showing chemistry, networks, charge, damage, and causal events.

The milestone is successful when:

1. a connected network visibly gathers charge in one area and uses it to repair another;
2. a severed tree branch becomes isolated while a looped network continues transporting charge;
3. removing illumination causes orderly degradation into environmental material;
4. chemical totals and external energy accounting remain correct;
5. the same seed reproduces exactly;
6. simulation speed is independent of rendering speed.

Only then add propagules, mutation, and ecological evolution.

## 18. Immediate implementation sequence

1. Write a short executable rules specification containing quantities, units, invariants, and event ordering.
2. Scaffold a headless TypeScript project with no renderer dependency.
3. Implement deterministic PRNG streams and configuration hashes.
4. Implement medium chunks and RGB conservation tests.
5. Implement the event wheel and synthetic benchmarks.
6. Implement packed node and edge pools.
7. Implement fine occupancy chunks and local neighbor queries.
8. Implement fixed metabolism, charge transport, damage, repair, and local death.
9. Implement component splitting and loop robustness tests.
10. Add a minimal batched renderer and inspectors.
11. Profile and remove accidental allocation or global scans.
12. Freeze this as the non-evolving metabolic-network baseline.
13. Design the exact initial controller genome using evidence from the working baseline.
14. Add propagules, mutation, lineage tracking, and experimental controls.

## 19. Explicit non-decisions

This plan does not yet decide:

- the final project name;
- whether the visual world should resemble plants, fungi, circuitry, coral, or something more abstract;
- whether chemicals correspond to literal substances;
- whether foreign fusion ultimately becomes central;
- whether acquired developmental state should be inherited;
- whether sexual recombination or horizontal gene transfer should exist;
- whether the final experience is primarily artwork, simulation, game, scientific toy, or all four;
- whether a later high-performance core should use Rust/WASM, WebGPU, or native code;
- whether the world eventually expands into sparse full 3D.

Those decisions should be made after the minimal ecology reveals what its rules naturally produce.

## 20. Summary recommendation

The best current direction is not “millefleur at larger scale.” It is a new hybrid whose pieces are traceable to the strongest earlier experiments:

- conservative typed-array fields from `rgbfields`;
- resource-circuit bodies from `absorption` and `cellspring`;
- moving developmental tips from `aestheedlings`;
- probabilistic interpretable controllers from `urn-plants`;
- material afterlife from `spring-fall-sand-garden`;
- deterministic replay and practical batching lessons from `simplant`.

The recommended central wager is:

> If networks must continually transport energy to repair unreliable parts, if loops and distributed bodies can provide measurable resilience, and if every metabolism leaves chemically specific local history, then increasing organization can become useful without being rewarded directly.

That wager is concrete enough to test—and should be abandoned or revised if the controlled experiments do not support it.
