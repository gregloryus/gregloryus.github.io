# Palimpsest Garden

## Research and Development Plan for a Legible, Zero-Player, Coevolutionary Plant-Ecosystem Simulation

**Status:** Conceptual plan only. No implementation has begun.

**Companion document:** `emergent-coevolution-requirements-brief.md` records the user's goals and constraints without proposed solutions. This document records the assistant's present proposed solution and research plan.

## 1. Provisional conclusion

No published or openly documented system located in the research review has demonstrated all of the desired properties together:

- extremely legible local causality with few hidden states;
- genuine natural selection and reciprocal coevolution;
- multiple lineages descended from a common ancestor;
- organisms that shape an environment which preserves ecological history;
- naturally arising population separation followed by naturally renewed contact and invasive-like dynamics;
- functional plantlike morphogenesis without explicit leaf, root, flower, predator, prey, or species classes;
- zero-player operation over long evolutionary and ecological timescales.

Existing systems demonstrate important subsets of these properties. The proposed project should therefore stand on existing building blocks while treating their conjunction as the research contribution.

The strongest current direction is provisionally called **Palimpsest Garden**.

## 2. Central thesis

The same visible local medium should serve four functions at once:

1. organism body;
2. resource-transport network;
3. ecological interface between lineages;
4. slowly fading record of environmental and biological history.

Living structures should not simply vanish when they die. They should become weathering material whose geometry, resources, and compatibility markings continue to affect later organisms. The environment therefore becomes a palimpsest: later ecosystems are written over the partially preserved consequences of earlier ones.

This proposal combines two especially important unifications:

- **Branching and reproduction use the same recursive copying operation.** A copied growing tip that remains attached is a branch; one that becomes detached is a propagule.
- **Internal transport and interspecies ecology use the same compatibility rule.** A local connection can support vascular transport, grafting, mutualism, parasitic tapping, decomposition, or exclusion depending on context. None of those relationships is named in advance.

These unifications are intended to reduce the number of rules while enlarging the space of possible evolved functions.

## 3. Non-negotiable design invariants

The project should be stopped or redesigned if it violates these principles:

- All causal interactions are local.
- There is no external fitness score, novelty reward, beauty score, or global planner.
- Reproductive success follows only from locally acquiring and spending resources to make descendants.
- No species, individual, native, invasive, predator, prey, parasite, mutualist, root, leaf, flower, or trophic-level label affects the physics.
- Organism and species identities may be reconstructed for analysis, but ancestry identifiers do not grant permissions or route resources.
- Resources do not teleport through parent-child links or organism-wide ownership graphs.
- Every causally relevant organism state is visible or directly inspectable.
- Matter is locally conserved and recycled, apart from explicitly open energy throughput such as incoming light and dissipated heat.
- Metrics observe evolution; they never become selection criteria.
- The baseline is a zero-player world. Population isolation, reconnection, invasion, collapse, and recovery are not triggered by a user.
- Every organismal and environmental structure eventually has a route to decay, recycling, or displacement. The world must not become permanently clogged.

## 4. Proposed minimal world

### 4.1 Spatial substrate

Begin with a two-dimensional lattice. Each position has one readily visible material condition drawn from a small set such as:

- empty space;
- granular or dead material;
- living structural material;
- active growing tip.

The exact set is not final. The objective is to avoid separate invisible layers of elaborate chemistry, organism ownership, internal neural state, or global physiology.

### 4.2 Two limiting currencies

Begin with only two ecologically important resources:

- **Light energy:** enters directionally, may follow a visible daily or seasonal cycle, is intercepted by exposed living surfaces, and eventually dissipates.
- **Wet mineral matter:** moves locally through granular material, can be incorporated into living structure, and returns to the environment through death and decay.

This creates an inherent spatial tension:

- light is most available in exposed upper or open regions;
- wet matter is most available in or near granular substrate;
- successful structures must acquire both and transport them through space.

Air is initially represented by empty space. Soil is granular or dead material plus wetness. Time is expressed through update, growth, cycling, and decay rather than stored as an additional environmental substance.

Temperature, pressure, attraction, repulsion, velocity, and additional chemical currencies should be deferred. One should be added only when a controlled experiment shows that it creates a qualitatively unavailable ecological opportunity.

### 4.3 Orthogonal transport

Light and wet matter must not compete for exclusive occupancy of the same moving-particle channel. Their flows should be independent and visibly distinguishable.

This requirement addresses a previous failure mode in which shared occupancy accidentally turned resource flow into traffic congestion. Any ecological consequence should arise from intended resource physics, not from particles unintentionally blocking one another.

### 4.4 Slowly decaying environmental memory

When living structure dies, it becomes detrital or granular material rather than blank space. It may temporarily retain:

- geometry;
- stored wet matter;
- shade or obstruction effects;
- local transport pathways;
- visible interface markings.

Its memory must fade. A useful qualitative condition is:

\[
1 \ll \frac{\tau_{memory}}{\tau_{generation}}
\ll \frac{\tau_{experiment}}{\tau_{generation}}.
\]

If memory decays within one lifetime, ecological inheritance is impossible. If it never decays, the world becomes a fossilized cemetery. The useful regime lies between them and should be found experimentally rather than presumed.

## 5. The universal interface rule

Each face or connection of living and recently dead structure carries one of a very small number of visible compatibility markings, provisionally imagined as approximately four colors or symbols.

Compatible adjacent faces may:

- form or preserve a physical bond;
- exchange light-derived energy and wet matter down local gradients;
- expose retained resources in dead material to later living structure.

Compatibility applies without reference to ancestry.

This one affordance is expected to create several possible ecological outcomes:

- reliable transport within a clonally grown body;
- accidental or selected grafting between lineages;
- exchange between differently specialized lineages;
- exploitation by a lineage that matches another's interface and draws from its network;
- shifts in compatibility that exclude an exploiter;
- specialization on locally common detrital markings;
- indirect historical effects when old community structures favor some later lineages over others.

The rule does not guarantee mutualism, parasitism, decomposition, or arms races. It creates a common local mechanism through which those relationships might evolve.

## 6. Developmental heredity

### 6.1 Active tips

The bud or meristem remains a promising abstraction. An active tip moves through the lattice and leaves structural cells behind. The resulting body is a historical trace of local developmental decisions.

Unlike earlier versions, the tip is not itself the proposed breakthrough. Its importance comes from its integration with physical copying, interface ecology, resource cost, and environmental memory.

### 6.2 A short visible developmental word

Each active tip locally carries:

- a short heritable instruction sequence;
- an instruction cursor;
- an orientation;
- locally held resources.

The sequence and active instruction must be inspectable and should be represented visually at sufficient zoom. There should be no globally shared genome pointer that silently controls distant structures.

A tentative minimal alphabet contains operations resembling:

- advance and deposit structure;
- turn;
- fork and locally copy the tip;
- set the next connection or interface marking;
- inspect a visible local condition and conditionally skip;
- cut, seal, pause, or terminate.

This alphabet is provisional. It should be chosen by mutational-neighborhood experiments, not by which initial demonstrations look prettiest.

### 6.3 Branching and reproduction

A tip-copying operation creates another locally embodied developmental process.

- If the copied tip remains physically connected, the event is interpreted as branching.
- If a connection later breaks or is cut and the copied tip can survive independently, the event is interpreted as propagation.

There is no separate `MAKE_BRANCH`, `MAKE_SEED`, or `REPRODUCE_ORGANISM` command.

Mutation occurs while the developmental word is physically copied. Substitution, insertion, and deletion may all be allowed if the encoding proves sufficiently robust.

Copying must cost time and material in proportion to sequence length. This makes longer genomes capable of more elaborate development while giving them an intrinsic reproductive disadvantage. It is intended to prevent genome bloat from masquerading as complexity.

## 7. Evolvability before ecology

The enormous number of possible genomes is not sufficient. Evolution moves primarily through nearby mutants, not by uniformly sampling all possible sequences.

The developmental encoding must therefore have a navigable mutational neighborhood:

- many one-edit mutants remain viable;
- many produce modest phenotypic differences;
- some are effectively neutral and preserve future options;
- a smaller fraction create substantial but potentially usable novelties;
- insertions, deletions, and recombinations do not almost always destroy development.

This should be tested before implementing a large ecosystem. If nearby variants are overwhelmingly dead, chaotic, or indistinguishable, no amount of simulated time will rescue the system.

## 8. How plantlike functions might emerge

Organs should be names assigned after observing function, not cell types supplied beforehand.

Candidate emergent functions include:

- **Leaf analogue:** a broad or repeated exposed surface whose removal measurably reduces light capture.
- **Root analogue:** a branched structure whose contact geometry measurably increases acquisition of wet matter.
- **Conduit or trunk analogue:** reinforced, parallel, or thickened transport paths whose severing deprives distal structures.
- **Seed analogue:** a detached, genome-bearing tip capable of surviving dispersal and beginning independent development.
- **Flower analogue:** a terminal reproductive or exchange structure whose shape improves the emission, interception, protection, or partner-mediated transfer of propagules or gametes.

Leaves, roots, branches, conduits, and seeds are plausible early targets because their functions follow directly from spatial resource acquisition and transport.

Convincing flowers are a later and less certain target. Much biological floral diversity was shaped by pollinators and other reproductive partners. Flowerlike complexity should not be expected until the system contains a functional partner-mediated reproduction or dispersal channel that can reward display, interception area, timing, or shape.

Morphological claims require ablation. A structure is not a leaf merely because it looks leaflike.

## 9. Emergent ecological relationships

Every lineage initially needs the same two currencies, but spatial position and developmental cost can favor specialization.

Examples of possible, non-prescribed outcomes include:

- a short genome specialized for exposed light collection joining a short genome specialized for substrate contact;
- a small lineage attaching to a larger network and drawing resources without providing a compensating flux;
- a lineage specializing on the tagged remains common in its native environment;
- hosts shifting interface markings in response to exploiters;
- exploiters evolving matching or more permissive interfaces;
- repeated exploitation producing higher-order trophic-like relationships;
- composite bodies formed from multiple lineages rather than one long generalist genome.

Genome copying cost is important here. Without a cost to encoding and maintaining multiple developmental capabilities, one generalist lineage may simply perform every role itself.

The possibility of ecological interaction is built into universal transport physics. The sign and identity of each relationship must be evolutionary outcomes.

## 10. Autonomous fragmentation and community coalescence

The baseline world is a zero-player metacommunity. It should sometimes divide populations and sometimes reconnect them without scheduled gates.

Potential ordinary causes of isolation include:

- accumulated dead structures or dense living growth;
- local exhaustion of wet matter;
- extended regions of shade;
- dry ridges, wet channels, or granular movement;
- incompatible conditioned substrate;
- distance exceeding current propagule range;
- ecological boundaries constructed by organisms themselves.

Potential ordinary causes of renewed contact include:

- decay or erosion of an obstructing structure;
- deposition that creates a traversable bridge;
- evolved changes in dispersal range;
- growth across a formerly hostile region;
- shifting resource distributions;
- expansion of two habitats until their communities collide.

There should be no `BARRIER`, `LOWER_GATE`, or `START_INVASION` instruction in the baseline simulation. Isolation and contact are changes in the connectivity of viable habitat.

Instrumentation may automatically recognize a coalescence event when lineages with negligible recent gene flow and sufficiently long independent histories renew ecological contact. Detection records the event but does not cause it.

An artificially separated-and-reintroduced experiment remains valuable as a controlled assay. It is not the desired default world.

## 11. Definitions and required tests

### 11.1 Evolution

Evidence requires heritable variation and differential reproduction under local resource constraints. Mutation alone, changing patterns, or an external evolutionary optimizer does not qualify.

### 11.2 Reciprocal coevolution

Coexistence and parallel adaptation do not qualify. Each lineage must undergo heritable change caused by the changing traits of another lineage.

Useful tests include:

- freezing one lineage while allowing the other to evolve;
- removing one partner;
- pairing focal organisms with partner populations sampled from the past, present, and future;
- demonstrating reciprocal rather than one-sided changes in performance or interaction.

### 11.3 Environmental inheritance

Environmental modification must persist after its maker is gone and alter later selection.

Compare descendants in:

- their intact historically conditioned environment;
- the same geometry after organisms are removed;
- an erased or reset environment;
- a foreign community's conditioned environment.

### 11.4 Local adaptation

Use reciprocal transplants. A lineage should perform differently in its home environment and a foreign environment for reasons traceable to evolved traits and historical environmental conditions.

### 11.5 Invasive-like dynamics

A lineage should be able to increase while initially rare after encountering a historically separate community and should measurably alter community composition, spatial structure, or resource throughput.

Not every contact should produce a successful invasion. Resistance, mutual incorporation, extinction, and chimeric successor communities are also legitimate outcomes.

### 11.6 Dynamic stability

The desired outcome is not convergence to a fixed state. After disturbance, the ecosystem may settle into a bounded but changing regime of living mass, resource throughput, diversity, and lineage turnover. This is better described as homeorhesis or dynamic resilience.

### 11.7 Functional morphology

Use targeted ablations and counterfactual replay. Removing or disrupting a claimed organ should reduce the function attributed to it.

### 11.8 Species

Species should be inferred after the fact from genealogy, reproductive or mutational connectivity, ecological behavior, and persistent clustering. Species membership must not be a field used by the world's physics.

## 12. Staged research program

### Phase 0: Freeze the scientific question

Produce a concise rule card and a falsification document.

The rule card should state every causal variable, material state, local operation, conservation law, update phase, and source of randomness. If the causal system cannot be described compactly, it is already failing the legibility goal.

### Phase 1: Test the genotype-phenotype map

Build only the smallest developmental interpreter or analytical model needed to examine mutation neighborhoods.

For many simple viable words:

- enumerate or sample one-edit descendants;
- measure survival and developmental continuity;
- distinguish neutral, incremental, substantial, catastrophic, and behaviorally redundant mutations;
- inspect whether complexity can accumulate without exponential fragility;
- test whether sequence length has a real, local copying cost.

**Go/no-go condition:** do not build the ecosystem if viable forms are surrounded mainly by lethal or meaningless mutations.

### Phase 2: Validate environmental physics without organisms

Implement and test only:

- light input and occlusion;
- wet-matter motion and conservation;
- granular structure;
- decay and recycling;
- interface-mediated local transport;
- naturally changing habitat connectivity.

Every transfer should be locally accountable. Test for stuck particles, accidental queues, duplicated resources, numerical leakage, and update-order artifacts.

**Go/no-go condition:** no organism work until long physics-only runs conserve what should be conserved and do not create accidental ecology through bugs.

### Phase 3: Grow one fixed ancestor

Use one non-mutating developmental word.

Demonstrate:

- reliable growth from a small propagule;
- local resource acquisition and transport;
- branching through copied tips;
- detachment and possible establishment;
- death and return to environmental material;
- development that responds legibly to local light and wetness.

Do not optimize beauty. Determine whether functional plantlike morphology is possible under the substrate.

### Phase 4: Establish Darwinian evolution in one region

Enable local genome copying with mutation. Begin with one ancestor and no external scoring.

Test:

- heritability;
- differential reproductive success;
- persistence of viable mutation neighborhoods;
- genome-length cost;
- resistance to universal fastest-growing goo;
- continued turnover rather than immediate fixation or extinction.

### Phase 5: Seek interface-mediated ecology

Allow multiple descendant lineages to encounter one another through the universal compatibility rule.

Look for grafting, exchange, exploitation, exclusion, litter specialization, and composite structures. Treat these as hypotheses, not required labels.

Apply frozen-lineage, removal, and time-shift tests.

**Go/no-go condition:** do not claim coevolution or proceed to grand invasion narratives until reciprocal adaptation is demonstrated experimentally.

### Phase 6: Test autonomous fragmentation

Run a sufficiently large zero-player world and measure the connectivity of viable habitat and gene flow through time.

Determine whether ordinary ecological and material dynamics produce:

- long-lived regional separation;
- divergent lineage histories;
- eventual unscheduled reconnection;
- a useful balance between total mixing and permanent isolation.

If natural fragmentation never occurs, adjust only substrate-level processes with independent physical justification. Do not add a periodic gate-opening script.

### Phase 7: Demonstrate ecological inheritance and local adaptation

Identify independently evolving regions descended from the common ancestor.

Run:

- reciprocal transplants;
- environment-reset controls;
- organism-removal controls;
- intact-history versus erased-history comparisons.

Determine how much local success is explained by current abiotic conditions, inherited environmental structure, and coevolved partners.

### Phase 8: Observe natural community coalescence

Automatically identify renewed contact between historically separated communities.

Measure:

- rare-lineage growth;
- displacement and extinction;
- changes in resource throughput;
- destruction or exploitation of prior ecological networks;
- formation of hybrid or chimeric communities;
- subsequent evolutionary response;
- recovery into a new dynamic regime or failure to recover.

Compare natural events with controlled artificial isolation and reintroduction experiments.

### Phase 9: Scale and presentation

Only after causal success should the project prioritize very large worlds, extremely long runs, mobile presentation, or aesthetic tuning.

Likely engineering requirements include:

- active-frontier or event-driven computation;
- deterministic seeded replay;
- compact lineage logging that does not affect physics;
- causal inspection of individual transfers and mutations;
- multiscale visualization of resources, interfaces, ancestry, and environmental history;
- snapshots and reports at biologically meaningful events rather than arbitrary attractive frames.

## 13. Legibility requirements for any eventual interface

At ordinary viewing scale, the user should be able to distinguish:

- empty, living, and dead material;
- active tips and their direction;
- light and wet-matter availability;
- resource transfer across a connection;
- interface compatibility;
- mutation, branching, detachment, and death;
- fading environmental memory.

At closer inspection, the user should be able to see:

- a tip's developmental word and current cursor;
- the local inputs that caused its last action;
- the resource costs and transfers involved;
- its recorded ancestry, explicitly marked as analytical rather than causal.

A deterministic causal replay should be able to explain any selected event through nearby states and the rule card.

## 14. Principal failure modes

### Brittle heredity

Most nearby mutants are dead, chaotic, or unrelated. This is the highest-priority risk and must be addressed before ecological elaboration.

### Fast-expanding goo

Selection converges on indiscriminate expansion. Relevant counterforces must arise from conservation, maintenance, copying cost, spatial obstruction, decay, and resource geometry rather than an anti-goo fitness penalty.

### Generalist monopoly

One lineage performs every function, preventing interlineage dependencies. Genome copying cost, spatial specialization, and interface economics must be tested as possible sources of division of labor.

### Frozen cemetery

Dead structures permanently fill the world. Decay and displacement must preserve history without preventing future history.

### Meaningless environmental fields

Organisms alter the environment, but the alterations do not change future selection. Every proposed memory channel needs a causal intervention test.

### Traffic-jam ecology

Resource particles accidentally block one another, creating strategies that exploit implementation artifacts rather than intended physics.

### Hidden organism identity

Ownership IDs, parent-child routing, or shared genome references silently determine interactions. These may be used in instrumentation but not causal dynamics.

### Decorative morphology

Shapes look botanical but have no demonstrated function. Require ablation.

### Decorative coevolution

Lineages coexist or change without reciprocal causal adaptation. Require frozen-lineage and time-shift controls.

### Scripted geological theater

A global timer creates barriers or forces invasions. Natural habitat fragmentation and reconnection must instead follow local world dynamics.

### Premature aesthetics and scale

Visual polish or enormous runs disguise a substrate that cannot accumulate viable evolutionary novelty.

## 15. Important unresolved decisions

The plan intentionally does not yet settle:

- exact lattice neighborhood and update schedule;
- whether updates are synchronous, checkerboard-phased, or deterministically asynchronous;
- exact number and semantics of developmental instructions;
- exact number and matching logic of interface markings;
- whether markings occur per cell, per edge, or per connection;
- how detached propagules move;
- whether gravity is sufficient or another universal local transport process is needed;
- the precise representation of wet matter and structural mass;
- environmental-memory decay law;
- whether sexual recombination or gamete-like particles are necessary for later flower analogues;
- how to distinguish organisms and species analytically without feeding those distinctions back into physics;
- the smallest world that can generate autonomous fragmentation and later reconnection;
- how much stochasticity is necessary and where it can remain fully reproducible.

These decisions should be resolved through the earliest discriminating experiment, not by intuition alone.

## 16. Current confidence

These are subjective research priors rather than promises:

- Greater than 95% confidence that a tiny developmental alphabet can contain more than enough raw combinatorial possibility.
- Approximately 70% confidence that an iterated version of this substrate can produce functional branching, rootlike acquisition, canopylike light collection, conduits, and propagules.
- Approximately 45% confidence that it can produce defensible reciprocal coevolution and history-conditioned invasive-like dynamics without named ecological roles.
- Lower confidence that autonomous fragmentation and reconnection will occur in the correct timescale window without requiring several substrate revisions.
- Approximately 15% confidence that the initial architecture produces indefinite open-ended complexification or convincing flowers without an additional coevolving reproductive guild.

The project need not solve universal open-ended evolution to succeed. A legible zero-player world that repeatedly generates reciprocal adaptation, environmental inheritance, autonomous community separation and coalescence, functional morphology, and invasion-like reorganization would already be a novel and valuable accomplishment.

## 17. Immediate next deliverable

If this direction survives comparison with other proposals, the next artifact should be a **rule-card and experiment specification**, not a working ecosystem.

It should contain:

- the smallest candidate state model;
- the candidate developmental alphabet;
- exact local transfer and decay rules;
- conservation invariants;
- a diagram of one tip action, one resource transfer, one death-to-detritus transition, and one tip-copy event;
- the mutation-neighborhood experiment;
- explicit falsification criteria for each major claim.

Only after that specification is criticized and revised should implementation begin.

## 18. Selected research precedents

- Biomaker CA: <https://arxiv.org/abs/2307.09320>
- Flow-Lenia, emergent evolutionary dynamics: <https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass>
- DISHTINY evolved multicellular life histories: <https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2022.750837/full>
- Stringmol and the adjacent possible: <https://pure.york.ac.uk/portal/en/publications/maximizing-the-adjacent-possible-in-automata-chemistries/>
- Evolutionary innovations and open-ended evolution: <https://arxiv.org/abs/1806.01883>
- Outsourcing memory through niche construction: <https://arxiv.org/abs/2209.00476>
- Community coalescence: <https://royalsocietypublishing.org/rstb/article/375/1798/20190252/42521/Community-coalescence-an-eco-evolutionary>
- Pollinator-driven divergent floral evolution: <https://www.nature.com/articles/ncomms14691>
- Genesis fitness-free evolution and niche-construction experiments: <https://arxiv.org/html/2607.21631v1>
- Wagner and Altenberg on evolvability: <https://dynamics.org/~altenber/PAPERS/CAEE/>

