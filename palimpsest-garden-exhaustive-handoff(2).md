# Palimpsest Garden: Exhaustive Project Handoff

**Date:** August 18, 2026  
**Status:** Two browser prototypes exist. The second is substantially more legible and aesthetically successful, but the long-horizon ecological substrate is not yet reliable.  
**Audience:** A future AI iteration or collaborator who may have none of the prior conversation.  

## 0. Prime directive to the next iteration

You are not inheriting a sacred architecture. You are inheriting a problem.

You may preserve, revise, or discard any previous mechanism, representation, file, visual style, or plan. You are explicitly authorized to radically reinvent or rewrite the entire project from scratch if that gives the three coequal goals a better chance of being achieved.

Do not become attached to the current prototype because it is attractive, because a particular seed survived a test, or because substantial effort went into it. Equally, do not discard useful breakthroughs merely to appear novel. Preserve mechanisms only when they continue to earn their place.

The user has repeatedly attempted versions of this project. Incremental elaboration of a weak substrate is one of the central failure modes. Diagnose at the architectural level.

The user invoked the ideal of a pragmatic fusion of Dave Ackley and Terence Tao:

- Ackley-like insistence on local, robust, indefinitely scalable causal rules;
- Tao-like clarity about definitions, invariants, counterexamples, proof obligations, and which conjectures have actually been established;
- enough pragmatism to ship working artifacts rapidly rather than projecting weeks of preliminary work before anything exists.

The current informed recommendation is:

- preserve the second prototype's one-view visual contract, compact controls, visible resource packets, deterministic replay, headless core, and finite meristem insight;
- strongly consider rewriting the ecological physics around conserved, shape-bearing matter and a closed or explicitly accounted hydrologic cycle;
- remain free to replace even the graph-and-meristem model if a better minimal substrate emerges.

## 1. The user's three coequal highest-priority goals

These are equally important. Success on one does not excuse failure on another.

### Goal 1: Legibility

The simulation should be easy to understand moment by moment from the world itself.

Required qualities:

- extremely simple, elegant rules;
- local interactions;
- few or no hidden causal states;
- visible cause and effect;
- no reliance on a large dashboard, statistics, inspector, documentation panel, or multiple visualization modes to understand what is happening;
- the primary scene should communicate the complete causal picture at ordinary scale;
- analytical instrumentation may exist in the console or in offline reports, but it must not become a crutch for an illegible world.

The user emphatically rejected the first prototype's seven switchable views. Needing to tab among light, water, matter, support, and other fields was taken as evidence that the underlying design was not legible.

The user also rejected layouts requiring scrolling. The entire running simulation and its minimal controls must fit in the current viewport simultaneously.

The acceptable persistent UI is approximately:

- tick;
- seed;
- dimensions;
- compact pause/speed/new/replay controls;
- perhaps one compact scale control.

Detailed reports should be available through a keyboard command such as `R`, printed to the developer console rather than occupying world space.

### Goal 2: Evolution, coevolution, history, isolation, contact, invasion, and renewed homeostasis

The baseline should be a zero-player world that advances without user input.

Desired phenomena:

- genuine natural selection rather than a decorative genetic algorithm or external fitness function;
- many lineages descending from one simpler common ancestor;
- persistent heritable variation and differential reproduction;
- reciprocal coevolution among descendant lineages, not merely independent adaptation in the same world;
- organisms shaping their local environment and being shaped by it;
- the environment retaining consequential traces of local history;
- naturally arising or ordinary ecological separation among populations;
- long periods of local adaptation and community history;
- occasional natural erosion of barriers, bridge formation, range expansion, dispersal, or habitat collision;
- invasive-like dynamics when historically separate lineages and communities meet;
- possible displacement, resistance, exploitation, mutual incorporation, collapse, or chimeric successor communities;
- further evolution toward a new bounded but moving ecological regime after disruption.

The user originally mentioned lowering gates but explicitly withdrew that as a baseline feature. An artificial separate-and-reintroduce operation remains a valid scientific assay. It is not the desired zero-player narrative.

The desired stability is dynamic. The user's image was an ecosystem tending toward homeostasis while continually outrunning it, like a planet perpetually falling toward the sun while orbiting it. The ecological term `homeorhesis` may be more accurate than static homeostasis.

Predator/prey labels, trophic levels, native/invasive status, and species identities should not be causal flags. Ideally ecological roles emerge from universal resource and interface physics.

### Goal 3: Functional, biophilic form

The user wants evolution to discover recognizable and beautiful plantlike forms without an explicit beauty objective and without scripting the complete final forms.

Desired possibilities include:

- branching and hierarchical axes;
- functional light-capturing leaves or leaf analogues;
- substrate-contacting roots or root analogues;
- transport structures, thickening, widening, and narrowing;
- propagules and seeds;
- reproductive structures, plumes, catkins, flowers, or flower analogues;
- varied, attractive mature body plans;
- forms whose function can be demonstrated by ablation rather than inferred from appearance.

The user repeatedly gravitates toward buds or meristems that grow while leaving structural or transport tissue behind. That recurrence may reflect a genuinely useful abstraction. It must not be reused automatically if it recreates past failures.

Beauty should arise from useful geometry, development, resource flow, reproduction, interaction, and historical adaptation.

## 2. The central intuition and scientific ambition

The user believes a very small set of readable elements can generate an immense evolutionary possibility space, analogous to the combinatorial immensity of a shuffled deck.

The corrected form of that intuition is:

- a small alphabet can indeed encode an astronomical number of forms;
- raw cardinality is not the bottleneck;
- evolution walks through nearby heritable variants;
- therefore the key is a connected, redundant, modular, navigable viable neighborhood rather than merely a huge genome space.

The system should seek a small basis of physical moves rather than a catalog of finished organs. Candidate low-resolution moves include:

- extend;
- turn or orient;
- branch or copy a growth front;
- allocate structural matter;
- thicken or reinforce;
- create a thin or broad collection surface;
- detach a reserve-bearing descendant;
- set an interface state;
- wait, repair, senesce, or terminate.

Candidate environmental dimensions originally raised were water, light, soil, empty space, time, heat, attraction/repulsion, pressure, velocity, and acceleration. The project should not include all of them by default. Add only dimensions that create a causal opportunity unavailable in the smaller system.

## 3. Product and interaction contract

The browser artifact should be a standalone HTML file that can be downloaded and opened directly, including on a phone where practical.

Non-negotiable interaction requirements learned from the prototypes:

- No vertical or horizontal page scrolling while the simulation runs.
- The canvas automatically occupies all space below a very small header.
- No sidebar.
- No permanent running ecology dashboard.
- No required inspector.
- No multiple resource “views.”
- The canonical scene must simultaneously show the materially important processes.
- A user can enter an exact numeric seed and replay it.
- `New` must use genuine browser entropy rather than advancing the deterministic simulation RNG from a fixed initial sequence.
- Refreshing or repeatedly choosing `New` must not reliably cycle through the same worlds.
- A console report may be printed with `R`.
- Keyboard shortcuts should remain optional conveniences, not required knowledge.

### Requested canvas and scale controls for the next version

The latest feedback asks for compact input or knobs for canvas/world size.

The strongest interpretation is:

- the displayed canvas always fits the current available viewport;
- expose a `pixels per cell` or equivalent visual scale, default approximately `4`;
- derive logical world dimensions from the current canvas size and scale;
- changing the scale creates a new logical world dimension that fills the same visible area;
- keep the resulting dimensions visible in the minimal header;
- optionally allow explicit width and height, but avoid turning the header into a settings panel.

Important implementation decision still needed:

- On an ordinary browser resize, should the existing world be stretched temporarily, expanded/cropped, or restarted at the same seed with newly derived dimensions?
- A conservative design is to preserve the running world during incidental resize and apply new derived dimensions on `New`, `Replay`, or an explicit `Fit` action.
- A more literal auto-fit design can restart the same seed after a debounced resize, but unexpected world resets may be worse than slight temporary scaling.

Do not ask the user to decide unless the choice materially blocks implementation. Make a thoughtful default and keep it reversible.

## 4. Project chronology

### Stage A: Fresh research request

The user asked for a fresh attempt after many earlier failures, emphasizing novelty and the three coequal goals. They requested deep prior-art research, a clear plan, and first a requirements document containing only their asks.

Created:

- `emergent-coevolution-requirements-brief.md`
- `palimpsest-garden-research-plan.md`

### Stage B: Independent plan and comparative review

The user supplied another AI's proposal:

- `alife-plan.md`

That proposal emphasized:

- a 2D lattice;
- separate matter and water;
- light and dissipating sugar;
- distributed reactive plant cells;
- adaptive-resolution rule tables;
- a slow climate “species pump”;
- disturbance and gap dynamics;
- environmental memory from tissue density and decay;
- a scientific invasion assay and explicit metrics.

The comparative review identified several strong corrections:

- test the mutational neighborhood before elaborate ecology;
- distinguish possibility-space size from evolvability;
- use ablation to establish organ function;
- keep the action alphabet physical rather than nominal;
- keep matter and water separate;
- treat gap dynamics as load-bearing because asymmetric light competition otherwise tends toward a single winner;
- do not assume showy flowers without a coevolving pollinator guild;
- wind-pollinated plumes, catkins, feathery capture structures, and pappus are more plausible early reproductive morphology;
- accessible flux, not total stored matter, is the relevant resource “slack” for invasibility;
- avoid false numerical precision about compute or scientific confidence;
- a flat adaptive table is hard to recombine when parents partition conditions differently; subtree-based representations are more coherent;
- environmental memory matters only if organisms can physically respond to it.

The first plan's universal interface-tag mechanism was retained as a particularly valuable idea:

- visible structural faces carry a small tag;
- compatible faces can bond and exchange resources without ancestry checks;
- the same affordance could support internal transport, grafting, mutualism, parasitism, exclusion, and detrital specialization.

Created:

- `palimpsest-garden-research-plan-2.md`

### Stage C: Debate over meristems and distributed cells

The plans debated three representations:

- a moving or sequential meristem carrying a word and cursor;
- a fully distributed reactive rule table, perhaps with inherited birth rank;
- an active meristem cell with a small visible developmental phase and adaptive rules.

The important unresolved point was that pure reactive cells produce plasticity but struggle to make species-typical sequential architecture, while freely active cells can become undifferentiated mats.

The synthesis favored visible meristem cells rather than a ghostly moving controller:

- passive structure remains physical;
- only active fronts evaluate development;
- developmental state is small and localized;
- no owner ID is required for contact physics.

### Stage D: Pressure to build immediately

The user rejected a projected timeline of weeks for an abstract representation tournament and asked for a working MVP in the next turn. This is important context for future planning: scientific discipline matters, but the user reasonably expects modern coding agents to produce executable experiments quickly.

### Stage E: First MVP and failure

Created:

- `public/palimpsest-garden-mvp.html`

It had seven switchable views and a side-heavy interface. Most seeds died after a few hundred ticks. Seed `714377144` appeared to sustain life indefinitely and was singled out for headless analysis.

That analysis revealed the “successful” seed was a pathological counterexample, not an ecosystem.

### Stage F: Second MVP / Palimpsest Garden II

The biological core was replaced rather than tuned.

Created:

- `public/palimpsest-garden-2.html`
- `scripts/analyze-garden.mjs`
- `tests/garden-core.test.mjs`

The new version uses a full-screen single view, visible resource packets, finite meristems, functional leaves and roots, seeds, reproduction, senescence, litter, and rare root partnerships.

The user now reports that it is much more legible and aesthetically successful, but:

- dead plants do not add convincing matter or shape to soil;
- most observed runs appear to go extinct around tick 30,000–50,000;
- insufficient or irreversibly lost water may be involved;
- canvas/world scale controls are desired;
- the next iteration should not overfit seed `714377144`;
- complete reinvention remains explicitly welcome.

## 5. Artifact map

If these files are available in the workspace, inspect them. If not, ask the user to attach the relevant ones. This document is intended to remain sufficient to reason without them.

### Requirements and plans

- `emergent-coevolution-requirements-brief.md`
  - The user's goals and exploratory input, intentionally without assistant-proposed solutions.
- `palimpsest-garden-research-plan.md`
  - First Palimpsest Garden research plan.
- `palimpsest-garden-research-plan-2.md`
  - Revised plan synthesizing the independent critique.
- `alife-plan.md`
  - Independent proposal supplied by the user for comparison.

### First prototype and its analyzer

- `public/palimpsest-garden-mvp.html`
  - The first browser MVP with seven views; biologically and visually unsuccessful.
- `headless-palimpest-analysis.mjs`
  - Scratch headless harness used to evaluate the exact first engine.

### Current prototype

- `public/palimpsest-garden-2.html`
  - Standalone current prototype and the most important implementation file.
- `app/page.tsx`
  - Thin full-viewport wrapper loading the standalone HTML in an iframe.
- `app/globals.css`
  - Prevents wrapper scrolling and makes the iframe fill the viewport.
- `app/layout.tsx`
  - Page metadata.
- `scripts/analyze-garden.mjs`
  - Extracts and executes the exact browser core headlessly.
- `tests/garden-core.test.mjs`
  - Determinism and short-panel lifecycle tests.
- `tests/rendered-html.test.mjs`
  - Site wrapper rendering check.

### Current hosted version

- `https://palimpsest-garden-mvp.greglorious.chatgpt.site`

The downloadable standalone file is named:

- `palimpsest-garden-2.html`

## 6. First MVP: exact diagnosis and lessons

### 6.1 What it looked like

The world was visually dominated by masses of living material and dead matter shifting between them. Seven separate visualization modes were needed to inspect causal fields. It did not read as a plant ecology.

### 6.2 What seed 714377144 actually did

The exact first engine was run headlessly to tick 10,000.

Key observations:

- It began with seven living cells and seven tips.
- The last propagule birth occurred at tick `458`.
- Only two lineages ever existed.
- By tick `2,000`, one lineage remained.
- At tick `10,000`, there were `4,206` living cells but no evolutionary activity.
- `99.4%` of living cells belonged to one connected component.
- More than `91%` were in dense neighborhoods.
- Only about `1.2%` were morphological endpoints.
- There had been `21,166` cell deaths, causing the visual churn of dead matter.
- All interface tags remained tag `0`.
- Cross-lineage exchange stopped once the ancestor lineage died.

The decisive mutation occurred at tick `458`.

The ancestor's above-ground program eventually:

- extended;
- forked for a limited phase;
- extended again;
- then detached a propagule when mature and sufficiently resourced.

The mutant's above-ground program became effectively:

- extend while young;
- fork forever after maturity.

Its underground program continued extending indefinitely.

One subtree deletion removed the terminal differentiation and reproduction stage. The mutant never reproduced again, yet it won by vegetative cellular expansion.

### 6.3 Why the exploit worked

- Developmental competence was copied freely.
- A fork turned one active frontier into two without splitting a conserved developmental capacity.
- Root expansion inherited most available resources from occupied soil cells, creating a resource windfall.
- Water was required for photosynthesis but not consumed or transpired, so it acted catalytically.
- All initial structures used the same compatibility tag and automatically fused, producing a superorganism-like network.
- Every exposed living cell could photosynthesize.
- Every substrate-contacting cell could absorb.
- Filled mats therefore outperformed differentiated organs.
- The viability smoke test counted persistent growth or an active tip as success. It did not require repeated reproduction.

### 6.4 Control panel

Twelve deterministic controls were run to tick `2,000`:

- four were fully extinct;
- six had only `1–30` cells and `1–2` tips and appeared terminal or nearly terminal;
- only two remained plausibly reproductive and diverse;
- those two were not proven indefinite.

The lesson is not merely “tune mortality.” The substrate rewarded deletion of the lifecycle and cellular spread.

### 6.5 Invariants learned from the failure

- A viable genotype must produce children that themselves produce descendants repeatedly.
- Persistent biomass is not Darwinian viability.
- Competent growth fronts cannot duplicate for free.
- Soil contact cannot grant an instantaneous stock windfall.
- Compatible contact cannot mean unconditional whole-network fusion.
- Conservation without accessibility constraints does not create meaningful scarcity.
- A world that needs seven overlays is architecturally illegible even if every field is technically visible somewhere.

## 7. Current MVP: Palimpsest Garden II

### 7.1 What it successfully changed

The user explicitly likes the new aesthetic and finds it much more legible.

The scene simultaneously shows:

- sky and day/night light;
- rain;
- terrain and soil moisture speckles;
- above-ground stems and leaves;
- below-ground roots;
- active buds;
- small reproductive structures and seed heads;
- airborne or resting seeds;
- blue water packets moving through structures;
- gold sugar packets moving through structures;
- purple root partnerships when compatible lineages connect;
- senescing leaves and falling litter.

The interface is a 44-pixel header containing:

- title;
- tick;
- dimensions;
- editable seed;
- Replay;
- New;
- pause;
- speed.

It has no sidebar, no inspector, no multiple views, and no page scroll.

### 7.2 Seed behavior

- The simulation itself is deterministic for a supplied 32-bit seed.
- Entering a seed and pressing Replay recreates it.
- The URL records the seed.
- New uses `crypto.getRandomValues` when available rather than the deterministic world RNG.
- Three tested consecutive New operations produced distinct seeds.

Keyboard shortcuts:

- `Space`: pause/resume;
- `N`: new random world;
- `R`: print a detailed report to the console.

### 7.3 Spatial and organism representation

The current world is not a cellular automaton in the strict sense. It is a continuous-coordinate branching graph rendered over gridded environmental fields.

Default logical dimensions are hard-coded to:

- width `144`;
- height `80`.

The renderer scales this logical world to fill the current canvas. This is why pixels-per-cell is not currently user-adjustable.

Each plant contains graph nodes connected by parent/child links. Nodes may be:

- crown;
- stem;
- root;
- terminal root tip.

Additional objects represent:

- active or dormant buds;
- leaves;
- flowers or reproductive heads;
- seeds;
- resource-flow packets;
- root grafts;
- falling litter.

### 7.4 Finite developmental potential

Each active bud has a finite `potential` value.

When an apical bud extends:

- competence transfers to the new child node;
- potential decreases;
- the previous node becomes passive structure.

When it branches:

- a fraction of remaining potential is assigned to a dormant lateral bud;
- the apical bud keeps the rest;
- total potential is divided rather than freely duplicated.

When shoot potential is exhausted:

- the axis becomes a reproductive structure.

When root potential is exhausted:

- the axis becomes an absorptive root tip and may seek a compatible partner.

This universal terminal lifecycle is not an evolvable opcode. Ordinary mutation cannot delete reproduction the way the first prototype's subtree deletion did.

### 7.5 Functional resource system

Leaves locally produce sugar according to:

- their area;
- locally computed light;
- age and senescence.

Roots gradually withdraw water from nearby soil moisture.

Each structural node stores small scalar quantities of:

- sugar;
- water.

Resources diffuse locally across adjacent graph edges. Visible packet animations sample those transfers.

Growth requires sugar and water at the active bud.

Light is occluded by leaves using a gridded light field.

Soil moisture is a gridded field affected by:

- rain input;
- evaporation;
- downward percolation;
- some lateral movement;
- rock/permeability;
- humus retention.

### 7.6 Genome and mutation

All twelve founders begin with copies of one common ancestor genome.

The genome is currently a vector of named numeric traits rather than an open-ended developmental program. Traits include:

- hue;
- shoot and root developmental budgets;
- pace;
- branching interval and allocation;
- branch angle;
- leaf interval, size, and angle;
- turn bias and phototropism;
- root spread and moisture bias;
- bud dormancy;
- seed mass and dispersal;
- woodiness;
- reproductive cost;
- graft tag, intent, and exchange bias.

Each seed receives at least one small mutation, with occasional additional mutations. A tag mutation occurs separately with low probability.

This produces robust incremental phenotypic variation, but it is bounded and highly structured by designer-supplied traits. It is not an open-ended genotype–phenotype map.

### 7.7 Reproduction

Terminal shoot axes accumulate locally transported sugar and water.

When their reproductive investment threshold is reached, they release several seeds. Seed number trades off against genetically controlled seed mass.

Seeds:

- disperse under gravity and wind;
- land on terrain;
- wait in a visible seed bank;
- germinate according to moisture, light, and local space;
- expire after a finite time if they fail.

### 7.8 Turnover and disturbance

Leaves age and fall.

Structural nodes have age, integrity, and genetically influenced longevity. After a maximum age, integrity declines. Parent disconnection accelerates failure. Wind gusts can damage elevated weak stems.

This produces structural death and gap reopening.

### 7.9 Direct interlineage interaction

Four graft tags exist.

Roots with neighboring, complementary tags may form a costly local partnership. The current compatibility rule accepts tag differences of one step around the four-state ring.

A graft allows local sugar and water exchange according to gradients and genome biases. It is rendered as a purple connection or nodule.

This avoids automatic fusion among all founders. It creates a channel for ecological interaction, but no reciprocal coevolution has yet been scientifically demonstrated.

### 7.10 Environmental history in the current build

Leaves fall as litter. Landed litter slowly increments a soil `humus` field and writes a tag value. Expired seeds also add some humus.

Humus affects water retention, evaporation, and permeability and is rendered as subtle historical coloration.

However, this mechanism is incomplete and does not satisfy the original palimpsest vision. The latest user observation is correct: dead structural plants do not visibly or materially become soil shape.

## 8. What current testing established—and did not establish

### 8.1 Established

The exact browser core can be extracted and run headlessly.

Verified properties:

- deterministic reproduction of the same seed;
- successful browser rendering without application errors;
- no horizontal or vertical scrolling at the tested desktop viewport;
- distinct entropy-backed New seeds;
- exact seed replay;
- repeated propagule production and germination over short horizons;
- finite branching rather than dense mat expansion;
- structural turnover;
- occasional cross-lineage root partnerships.

A short deterministic panel tested seeds:

- `1`;
- `17`;
- `99173`;
- `714377144`;
- `3908754034`;
- `2376395851`.

Each remained alive and reproduced by tick `2,700`.

The exact current seed `714377144` was run to tick `10,000` with final results approximately:

- `97` reported living plants;
- `1,254` living structural nodes;
- `86` living leaves;
- `185` active buds;
- `139` airborne or banked seeds;
- maximum generation `4`;
- `430` propagules released;
- `115` germinations;
- last propagule around tick `9,927`;
- last germination around tick `9,997`;
- `1,170` structural deaths;
- `9` root grafts;
- dense-node fraction under `1%`.

This established that the replacement fixed the first prototype's immediate failure modes through tick `10,000`.

### 8.2 Not established

The tests did not establish:

- reliable survival to tick `30,000`, `50,000`, `100,000`, or beyond;
- a closed water cycle;
- matter conservation;
- environmental mass accumulation;
- sustained evolutionary novelty;
- meaningful species formation;
- reciprocal coevolution;
- local adaptation;
- autonomous long-term population isolation and renewed contact;
- invasive-like community coalescence;
- recovery into a new dynamic regime;
- emergent organ identity;
- functional flowers;
- a robust distribution of outcomes across many seeds.

The user's longer observational runs are more informative than the earlier `10,000`-tick showcase. Most apparently die by `30,000–50,000` ticks. Treat this as a real failed robustness criterion until disproven headlessly.

### 8.3 Metric caveat

The current `plants` count may overstate ecological viability because a plant remains “alive” while any of its structural nodes remain alive. An inert plant with no active reproductive route may still be counted.

Future viability must be lifecycle-based:

- recent successful reproduction;
- descendants producing descendants;
- continuing genealogical turnover;
- accessible resource flux;
- active establishment, not merely persistent tissue.

## 9. Latest user feedback: treat as authoritative

The user's reaction to Palimpsest Garden II:

> this is much better and much more legible! i like the aesthetic changes.

This means the second prototype's presentation direction is worth preserving unless a new design clearly improves it.

The user then identified three substantive shortcomings.

### 9.1 Dead plants do not become ground

> dead plants didn't seem to add any matter/shape to the soil on the ground, which was odd.

This is not merely decorative polish. It cuts directly against the environmental-history goal. Bodies should become subsequent habitat, obstruction, fertility, water retention, topography, attachment opportunity, or resource stock.

### 9.2 Long-horizon extinction

> it seemed like most runs all life died by 30-50k or so, maybe from not enough water?

The next iteration must reproduce and quantify this before calling the system robust.

### 9.3 Dynamic world dimensions

> add input/knobs for canvas size ... automatically fit to current window size ... expose pixel-per-cell, with a default value of 4 or something, so you could change pixel size and it'd make a new dimension to fill the space

This should be implemented compactly and without violating the one-viewport contract.

### 9.4 Do not overfit the famous seed

> you may have overindexed a little too much about that specific run i called out

Seed `714377144` was useful as a forensic instrument. It is not a design target, benchmark seed, mascot, or privileged ecology.

Use distributions across independently generated seeds. Include 714 as a regression case only.

### 9.5 Radical reinvention remains welcome

> feel free to complete re-invent and rewrite the entire project if you have a better idea you think is truly more likely to achieve the goals

This permission should be carried forward verbatim in spirit. Do not ask the user for permission again before an architecture-level rewrite inside the project's established scope.

## 10. Likely causes of 30–50k extinction in the current code

These are code-grounded hypotheses, not yet proven by the necessary long panel.

### 10.1 There is no conserved structural matter

The current model does not have a matter account from which stems, roots, leaves, seeds, and soil are all constructed.

Growth spends abstract sugar and water but creates graph nodes without debiting conserved mass. When nodes die, they do not become equivalent soil mass.

Consequences:

- dead bodies cannot accumulate topography;
- the environment cannot truly inherit bodily geometry;
- “humus” is a scalar modifier rather than transformed organism matter;
- material accounting cannot constrain growth or close the ecological loop.

### 10.2 Dead structural water is lost

When a structural node dies, its stored water is not returned to nearby soil or atmosphere. The node simply becomes dead for rendering and later disappears from practical interactions.

This is an unaccounted hydrologic sink.

### 10.3 Water percolates below reachable roots

Rain adds moisture near the surface. Moisture moves primarily downward, with limited lateral movement. Roots have finite developmental depth. Water that percolates deep into the world may become functionally inaccessible.

There is no robust capillary return, water-table fluctuation, or deep-to-surface cycling mechanism.

### 10.4 Transpiration and rainfall are disconnected

Plants absorb water, but there is no visible local transpiration returning it to an atmospheric phase. Rain is an external mathematical input rather than redistribution of a conserved water inventory.

The system can therefore lose biologically stored water while independently receiving a climate-driven trickle. A small imbalance can take tens of thousands of ticks to become fatal.

### 10.5 The seed bank has a hard expiration

Seeds expire after roughly `5,600` ticks. A sufficiently long drought or establishment gap can erase the reproductive buffer.

### 10.6 Structural senescence is unconditional in the long run

After a genetically influenced maximum age, node integrity declines. Function and resource throughput can slow failure but do not indefinitely renew an organism. This is useful for turnover, but dangerous when recruitment fails during a hydrologic bottleneck.

### 10.7 Mutation load may accumulate

Every seed receives at least one mutation. This ensures visible evolution but may impose continual drift away from a viable ancestor without a sufficiently robust neutral neighborhood.

The current trait vector prevents catastrophic deletion of the lifecycle, but high mandatory mutation can still ratchet morphology, timing, seed mass, root allocation, or flower cost toward extinction, especially in small late populations.

### 10.8 Humus formation is too weak and incomplete

Leaves and expired seeds add humus. Dead stems and roots do not. The most substantial body mass therefore contributes no long-term soil memory.

### 10.9 The apparent single defect may unify both user observations

The missing dead-body-to-soil transition and the probable water shortage are likely two aspects of one architectural omission:

**The world lacks a closed transformation among living body, dead structure, shape-bearing soil matter, stored water, and atmospheric redistribution.**

Confidence in that unification: high, approximately `85%`, pending a long accounting run.

## 11. The strongest new synthesis: corpses become geography

The user's newest observation may point toward a mechanism more central than a cosmetic fix.

If dead structures physically fall, pile, dam, wick, decay, and erode into soil, the same mechanism can serve many goals:

- visible death and recycling;
- conserved matter;
- environmental memory;
- soil-shape accumulation;
- local fertility and water retention;
- alteration of light and establishment space;
- temporary barriers;
- bridges formed by fallen material;
- channels redirected by roots and debris;
- habitats that reflect lineage-specific tissue investment and tags;
- eventual erosion and reconnection;
- invasion outcomes that depend on recipient history.

This is exactly the kind of rule compression the project seeks: one physically intuitive process doing many jobs.

A possible architectural slogan is:

> Bodies do not disappear; they become the geography against which descendants evolve.

This is a proposal, not a user requirement. Test it against simpler alternatives.

## 12. Recommended strategic choice for the next implementation

### 12.1 What is worth keeping

High-confidence reusable pieces:

- the one-view, full-viewport aesthetic;
- minimal header and seed replay;
- entropy-backed New;
- exact deterministic headless core;
- visible water and sugar movement along actual structures;
- distinct visible roots, shoots, buds, leaves, reproductive structures, seeds, rain, and litter;
- finite developmental potential divided among branches;
- universal terminal reproduction that ordinary mutation cannot delete;
- dormant lateral buds rather than free equal-tip multiplication;
- short-scale gap creation through senescence and breakage;
- console-only diagnostic reports;
- tests that execute the exact browser core.

### 12.2 What should not be preserved merely for continuity

- the hard-coded `144×80` world;
- a nonconserved scalar moisture field with unaccounted biological sinks;
- graph nodes that vanish without becoming matter;
- a designer-authored vector of approximately twenty named plant traits as the final hereditary representation;
- supplied `leaf`, `root`, and `flower` object classes if the next substrate can make comparable function more emergent;
- mandatory mutation on every seed;
- external rainfall unrelated to plant transpiration or world water inventory;
- any benchmark centered on seed 714;
- claims of coevolution based solely on nine grafts;
- claims of environmental inheritance based solely on a humus tint.

### 12.3 Current recommendation

My present recommendation is a **selective rewrite**, not a superficial patch:

- retain the renderer and interaction principles;
- retain or adapt the finite visible meristem idea;
- replace the ecological accounting and death/soil system;
- reconsider the genome representation after the closed lifecycle is robust;
- remain willing to replace the graph plant body if conserved granular matter cannot integrate cleanly with it.

Confidence that simple parameter tuning alone will satisfy the original goals: low, roughly `10–20%`.

Confidence that the current visual/meristem ideas can contribute to a stronger rewritten substrate: moderate to high, roughly `75%`.

## 13. Candidate next substrate: a concise physical constitution

This is a promising proposal, not a binding specification.

### 13.1 Accounts

Use three conceptually distinct accounts:

- **matter:** conserved body and soil substance;
- **water:** conserved within a visible soil–plant–air cycle, or else all sources and sinks explicitly accounted;
- **usable energy:** produced from light under appropriate local conditions and dissipated through work and maintenance.

Sugar can be the visible carrier of usable energy.

### 13.2 Body construction

Every segment, lamina, reserve, and propagule embodies matter.

More matter investment can visibly produce:

- thickness;
- strength;
- storage;
- slower decay;
- greater construction cost;
- greater maintenance or transport burden.

Avoid a nominal `WOOD` trait when investment can generate woody behavior.

### 13.3 Death and soil

When tissue dies:

- its matter and water remain local;
- unsupported pieces fall or settle;
- pieces retain geometry, density, and perhaps interface tag while weathering;
- fragmentation creates smaller detritus;
- detritus eventually joins granular soil or humus;
- decay timing depends on physical investment and local water, not a cleanup timer alone;
- later roots, seeds, water, and organisms physically encounter the residue.

The terrain surface should therefore change over history.

### 13.4 Water cycle

A particularly legible cycle could be:

- blue water occupies soil pores or visible packets;
- roots absorb it locally;
- water moves upward along physical connections;
- exposed surfaces transpire some of it as visible vapor or droplets;
- vapor condenses or is redistributed into visible rain;
- dead tissue releases stored water locally;
- gravity and capillarity redistribute soil water;
- rock, pore structure, humus, and roots alter flow.

Only sunlight must be an unbounded external input. Water need not be.

If a fully conserved atmospheric phase proves visually or computationally excessive, use an explicitly balanced reservoir with a displayed or console-auditable ledger. Do not silently delete node water.

### 13.5 Development

One candidate retains finite active meristems:

- a bud is a visible local growth front;
- competence transfers forward;
- a lateral bud receives a divided reserve of developmental potential;
- physical resources, not a global plant pool, must reach it;
- an axis eventually becomes determinate;
- propagule production resets developmental potential only by paying for a new protected meristem.

This keeps the anti-mat insight while allowing hierarchical botanical architecture.

### 13.6 Functional surfaces rather than nominal organs

The current prototype uses explicit leaf objects. A more emergent compromise could supply only a small physical basis:

- axis segments;
- thin lamina or membrane deposits;
- dense bonds;
- detachable reserve-bearing fronts.

Selection determines where, how large, how repeated, and how durable each becomes.

A lamina qualifies as a leaf analogue only when removing it reduces light-derived energy and descendant success.

### 13.7 Interfaces

Keep ancestry-blind local contact.

Possible rule:

- structures expose small visible interface tags;
- contact alone does not automatically fuse networks;
- a costly, discrete handshake constructs a bond;
- compatible tags permit conductance;
- transfer remains locally visible;
- dead tagged material retains temporary ecological significance;
- tags can influence attachment or decomposition only through direct physical contact.

### 13.8 Isolation and contact

Do not add a gate.

Candidate endogenous mechanisms include:

- debris berms and dams;
- soil ridges accumulated from dead bodies;
- canopy shade;
- waterlogged and dry zones generated by altered flow;
- limited seed dispersal;
- incompatible conditioned substrate;
- disturbance and erosion reopening corridors;
- fallen structures creating temporary bridges;
- lineages evolving around or through a barrier.

The detector may recognize isolation and contact events after the fact. It must not cause them.

## 14. Representation and evolvability

The second prototype deliberately chose a safe trait vector to ship quickly. It should not be mistaken for the final breakthrough.

Three broad future choices remain:

### Option A: Keep a bounded trait genome

Advantages:

- robust;
- easy to mutate;
- fast;
- easy to render and analyze;
- can support substantial ecological evolution.

Disadvantages:

- designer preselects all dimensions of novelty;
- leaf, root, branch, and reproductive architectures remain substantially supplied;
- open-ended structural innovation is limited.

This may still be scientifically valuable if the principal question becomes coevolution, history, and invasion rather than open-ended morphology.

### Option B: Adaptive condition/action tree in meristems

Advantages:

- local environmental responsiveness;
- capacity can grow through behavior-preserving splits;
- subtree mutation can produce modular variation;
- physical actions need not name organs.

Risks:

- mutation can still amputate lifecycle stages;
- recombination is difficult;
- phase/cursor state can become opaque;
- rule complexity may outgrow legibility.

Crucial safeguard:

- reproduction or renewal cannot be just another deletable action if long-term Darwinian viability requires it;
- mutational viability must be defined through repeated descendant reproduction, not biomass.

### Option C: A small developmental grammar or word

Advantages:

- reliable sequential body plans;
- recursion and modular repetition;
- compact expression of branching architecture.

Risks:

- brittle insertion/deletion neighborhood;
- opaque cursor behavior;
- local environment may become secondary to scripted sequence;
- easy to create decorative L-system plants rather than ecological organisms.

### Recommendation

Do not stage a multi-week abstract tournament. Implement the cheapest exact headless prototypes rapidly and compare them over a day of agent work, not weeks of human evenings.

Measure:

- viable grandchildren under mutation;
- phenotype-distance distribution;
- neutral-walk length;
- ability to alter one trait while retaining others;
- rate of catastrophic lifecycle loss;
- causal explanation length;
- morphology and environment interaction.

## 15. Long-horizon validation protocol

The next version must not be declared successful from a beautiful ten-thousand-tick run.

### 15.1 Gate A: accounting

For at least one million headless ticks with life disabled or controlled:

- matter drift is exactly zero or formally bounded;
- water drift equals only declared boundary flux;
- every death returns the correct accounts;
- no resource is duplicated through branching, grafting, collision, or update order;
- no deep-water sink is silently inaccessible forever unless that is intended and reversible geologically.

### 15.2 Gate B: closed lifecycle

For each tested lineage:

- founders produce offspring;
- offspring produce grandchildren;
- this continues across many measured generations;
- recent propagule and germination times remain finite;
- inert persistent tissue does not count as success.

### 15.3 Gate C: seed panel

Use at least `30` independently generated seeds for serious robustness testing.

Suggested horizons:

- quick development check: `5,000` ticks;
- ecological check: `50,000` ticks;
- serious persistence check: `100,000+` ticks;
- occasional million-tick tests after performance permits.

Report distributions, not anecdotes:

- extinction time;
- last successful reproduction;
- maximum and current generation;
- living reproductive lineages;
- active propagule bank;
- matter and water ledger;
- morphology and spatial packing;
- gap and patch-age distribution;
- resource accessibility;
- fraction of runs with continuing evolution.

Do not tune directly on all evaluation seeds. Maintain holdout seeds.

### 15.4 Gate D: no exploit

Explicitly search for:

- reproduction-deleting vegetative immortality;
- free competence duplication;
- root resource windfalls;
- catalytic water;
- universal fusion;
- construction from nothing;
- persistent dead structures counted as living;
- a single panmictic mat;
- smallest-genome or fastest-copy monopolies;
- mutation rates that guarantee eventual error catastrophe.

### 15.5 Gate E: environmental inheritance

Take a deterministic checkpoint and clone it.

Compare:

- intact living community and history;
- organisms removed but residue retained;
- residue erased while current abiotic inputs remain;
- dead-body geometry retained but chemical/tag state reset;
- foreign community residue substituted.

The environment encodes history only if these interventions change later establishment or selection.

### 15.6 Gate F: organ function

For a candidate structure:

- remove it in a cloned replay;
- preserve everything else;
- measure predicted loss of light capture, water uptake, transport, stability, dispersal, or reproduction.

Do not call a star-shaped glyph a flower if it has no selected reproductive function.

### 15.7 Gate G: coevolution

Grafting, exchange, and coexistence are not sufficient.

Use:

- frozen-partner controls;
- partner removal;
- past/present/future time-shift pairings;
- reciprocal performance measurements.

Demonstrate that change in A alters selection on B and evolved change in B alters selection on A.

### 15.8 Gate H: isolation and community coalescence

Measure lineage-relative gene flow and establishment connectivity.

Require:

- many generations of low exchange;
- regional phenotypic or ecological divergence;
- naturally renewed contact;
- low-abundance establishment or failure at a recipient edge;
- measurable recipient change;
- possible new bounded regime afterward.

Artificial transplant assays are useful controls but not baseline events.

## 16. Invasion hypotheses worth preserving

Do not preregister one simplistic story. Compare several explanations.

- **Accessible resource release:** establishment rises when locally capturable light, water, matter, or attachment opportunity is high.
- **Palimpsest match:** recipient geometry, tags, residue, and history predict success beyond current resource flux.
- **Coevolutionary escape:** an arrival succeeds against historically naive residents but fares worse against later adapted residents.
- **Interface exploitation:** direct tapping or use of resident detritus allows establishment even where free resource flux is low.
- **Disturbance interaction:** a lineage succeeds in a gap but fails in an intact network despite similar total stored resources.
- **Propagule pressure:** arrival number and timing may explain apparent invasiveness and must be controlled.

Accessible flux is not the same as total conserved stock. Water in deep unreachable substrate and matter locked in durable wood are not immediate invasion opportunity.

## 17. Legibility test for the next viewer

Before adding an overlay, ask whether the base scene can show the causal fact directly.

Desired direct encodings:

- water: blue particles, droplets, or visibly wet pores;
- usable energy/sugar: warm pulses along conduits;
- matter investment: actual thickness or visible density;
- wear: cracking, sagging, desaturation, or thinning;
- competence: a visible bud or meristem;
- dormancy: a visibly closed bud;
- death: loss of color and structural support;
- decay: fragmentation and incorporation into soil;
- environmental memory: altered ground shape, texture, moisture behavior, or retained tags;
- grafting: a discrete visible junction and pulses crossing it;
- seeds: visible propagules whose movement and establishment can be followed.

Analytical overlays can exist for ancestry, inferred species, gene flow, or counterfactual results. They must not be required to follow the ordinary ecology.

## 18. Performance and scaling

Do not repeat the earlier false precision that assumed enormous full-grid sweep rates without defining a tick.

First define:

- what one tick updates;
- which elements are active;
- maximum local work per event;
- how visual animation relates to biological time.

Then benchmark.

Useful engineering ideas:

- active-frontier or event-driven updates;
- sparse spatial indexing;
- environmental tiles updated at slower justified rates;
- deterministic fixed RNG streams;
- exact browser core also callable headlessly;
- separate simulation state from rendering;
- snapshots at meaningful ecological events;
- native/WASM implementation only after the substrate earns scaling effort.

Pixel-per-cell affects both legibility and compute:

- larger pixels create smaller, more readable worlds;
- smaller pixels create larger worlds with more ecological regions;
- world dimensions should derive from the actual canvas and selected scale;
- test that changing scale does not alter local physics except through world extent and boundary effects.

## 19. Failure modes to keep visible

- **Seven-view relapse:** the base scene becomes incomprehensible without toggles.
- **Dashboard relapse:** statistics substitute for visible causality.
- **Mat collapse:** repeated equal forking or all-cell growth fills space.
- **Vertical-stick monoculture:** anti-mat rules become so strong that every plant is one unbranched stalk.
- **Decorative botany:** leaves and flowers are supplied glyphs without causal necessity.
- **Frozen cemetery:** history accumulates but prevents further history.
- **Vanishing cemetery:** death leaves no consequential trace.
- **Water ratchet:** water moves to an inaccessible or deleted state until life inevitably ends.
- **Mutation ratchet:** mandatory mutation eventually destroys viable strategies.
- **Founder dependence:** only hand-tuned ancestor morphology works.
- **Lucky-seed dependence:** a showcase seed hides low robust success.
- **Universal fusion:** tag compatibility creates one superorganism.
- **Decorative tags:** tag colors never affect reciprocal selection.
- **Scripted pump:** a global timer manufactures isolation and contact.
- **Permanent panmixia:** dispersal prevents regional history.
- **Permanent isolation:** communities never meet.
- **Resource-stock fallacy:** inaccessible matter is counted as ecological slack.
- **Inert-tissue viability:** a nonreproductive skeleton counts as living.
- **Generalist monopoly:** one genome cheaply performs every role.
- **Premature scaling:** eons amplify a broken rule rather than creating insight.
- **Premature polish:** attractive screenshots stop architectural revision.

## 20. Scientific definitions

### Evolution

Heritable variation plus differential descendant production under the local physical economy.

### Reciprocal coevolution

Evolutionary change in lineage A changes selection on B, and evolutionary change in B changes selection on A.

### Environmental inheritance

A maker's environmental effect persists after the maker and changes later survival, behavior, or selection.

### Local adaptation

A regional lineage performs differently in home and foreign environments for reasons attributable to evolved traits, partners, or history, under controlled initial conditions.

### Invasive-like dynamics

A historically separate lineage increases while rare after contact, spreads beyond the arrival point, and measurably reorganizes a recipient community or its resource flows.

### Dynamic homeostasis

After disturbance, ecological observables return to a bounded but continually changing regime rather than a fixed state.

### Functional organ

A structure whose controlled removal measurably reduces the function attributed to it.

### Species

An analytical cluster inferred from genealogy, phenotype, ecology, persistence, and perhaps reproductive connectivity. Never a causal field.

## 21. Prior-art foundations

The full conjunction has not been located in published prior art. Useful partial precedents include:

- **Biomaker CA**: plantlike cellular morphogenesis and evolution, but opaque neural cell state and supplied roles.
- **Flow-Lenia**: local mass conservation and emergent evolutionary dynamics, but continuous blobby morphology and limited botanical legibility.
- **DISHTINY**: local multicellular life histories and ecological transitions, but not this plant/history/invasion conjunction.
- **Stringmol and adjacent-possible artificial chemistries**: evolvable local interactions and novelty, but not a directly legible plant ecology.
- **Movable Feast Machine / robust-first computing**: locality, relative addressing, best-effort operation, and indefinite scalability as a constitutional ideal.
- **Functional-structural plant models and evolving L-systems**: plant architectural and life-history tradeoffs, but usually with high-level supplied grammar, physiology, optimization, or fitness.
- **Hallé–Oldeman architectural models**: many tree forms arise from a small basis of branching, orientation, rhythmic growth, and reproductive placement.
- **Díaz global plant spectrum**: much real plant variation concentrates along a small number of tradeoff axes; useful comparator, not a target to hard-code.
- **ABC flower model**: small combinatorial developmental codes specify floral identity, but identity alone does not produce a selected display.
- **Niche construction and outsourced memory**: persistent modifications can influence later evolution, but persistence is useless when organisms cannot respond to it.
- **Community coalescence**: the ecological frame for collisions among historically organized communities.
- **Davis–Grime–Thompson fluctuating-resource theory of invasibility**: a strong but incomplete hypothesis about accessible opportunity.
- **Plant–soil feedback literature**: historical conditioning can promote resistance, negative feedback, or invasional amplification.
- **Falster–Westoby height games**: asymmetric light competition frequently predicts a single height strategy unless gaps reopen.
- **RNA neutral networks and evolvability theory**: viable connectivity and redundancy matter more than total genotype count.
- **Species-pump hypotheses**: climate-driven isolation and contact are useful comparative treatments, but a global sine wave should not masquerade as endogenous separation.

Primary references are listed in the three research-plan files.

## 22. Questions that remain open but do not block action

- Should matter be granular lattice cells, quantities attached to continuous segments, or both?
- Can graph-based plant bodies fall and become terrain without introducing nonlocal structural physics?
- Is a visible atmosphere necessary for a closed water cycle, or is an auditable reservoir sufficient?
- How much developmental sequence state is necessary for recognizable body plans?
- Can laminae and conduits emerge from investment geometry without named organs?
- What mutation rate avoids both stagnation and error catastrophe?
- Can interface tags support reciprocal ecology without universal fusion or frozen incompatibility?
- What local disturbance process produces coexistence without scripting diversity?
- Can deadfall, erosion, and hydrology create barriers and bridges on the correct generational timescale?
- Is clonal divergence sufficient for the intended species story, or is sex eventually required?
- Do visually attractive reproductive structures require a second mobile guild?
- What is the smallest world that supports multiple long-lived regional histories?
- What duration of environmental memory is consequential without clogging the world?

Resolve these through cheap discriminating implementations, not prolonged preference polling.

## 23. Suggested immediate work for the next iteration

### Step 1: Reproduce the newly reported extinction

Use the exact current browser core headlessly.

Run at least `20–30` seeds to `50,000` ticks, and a smaller panel to `100,000`.

Add ledgers for:

- soil moisture by depth;
- water in living nodes;
- declared rain input and evaporation loss;
- water deleted by death;
- accessible root-zone water;
- seed-bank age and size;
- viable reproductive plants;
- last propagule and last germination;
- mutation load and trait drift.

Classify extinction rather than guessing.

### Step 2: Decide salvage versus rewrite

Use this decision rule:

- If one narrow accounting leak explains extinction and the substrate otherwise shows robust ecological opportunity, repair it.
- If closing the leak still leaves hard-coded morphology, no consequential history, or no path to reciprocal evolution, rewrite the core while preserving presentation.
- If integrating conserved shape-bearing matter into the graph model requires layers of exceptions, replace the graph model too.

### Step 3: Build the smallest closed loop

Before elaborate evolution, demonstrate one fixed ancestor that:

- constructs matter-bearing structure;
- moves water visibly;
- photosynthesizes;
- reproduces;
- dies;
- falls or settles;
- returns water and matter;
- visibly changes soil shape and water behavior;
- supports a descendant growing differently because of that residue.

### Step 4: Re-enable evolution

Use conservative, not mandatory, mutation at first.

Require repeated grandchild production across a seed panel.

### Step 5: Scale dimensions from the viewport

Add the compact pixel-per-cell control and derived world dimensions without adding a settings dashboard or scroll.

### Step 6: Only then pursue regional history and invasion

Do not claim the grand narrative until the closed ecology survives.

## 24. Final handoff summary

The project is searching for a rare conjunction:

- rules simple enough to watch causally;
- evolution robust enough to traverse nearby possibilities;
- morphology plantlike because geometry performs real work;
- multiple descendants interacting and recursively changing one another's selection;
- bodies and interactions writing persistent but erasable history into the world;
- ecological history producing regional adaptation;
- ordinary world dynamics separating and reconnecting those histories;
- renewed contact sometimes behaving like invasion;
- disrupted worlds capable of finding a new moving regime.

The first MVP failed because its most successful mutant deleted reproduction and became a fused, fork-forever mat. The second MVP made a real breakthrough in legibility and botanical presentation by using visible local resource packets and finite divided meristems. It also restored short-horizon reproduction and turnover.

But the second MVP still does not have a closed material ecology. Dead structure largely vanishes instead of becoming ground, and most user-observed runs apparently die by `30,000–50,000` ticks. Earlier ten-thousand-tick success must not be used to wave that away.

The likely next breakthrough is to make death, soil formation, hydrology, environmental memory, barriers, and reconnection aspects of one local transformation: **organisms becoming geography**.

Treat that as a hypothesis. Test it ruthlessly. Preserve the beautiful one-view legibility. And rewrite anything else that stands between the world and the actual goals.
