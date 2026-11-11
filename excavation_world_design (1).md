# Excavation World: standalone behavior specification

10 November 2026 · Projected-depth plant world · Approved rules with clearly marked starting values

## 1. Purpose and authority

Build a small artificial-life world that runs without intervention and is interesting to observe. The player's only intervention in its history is to revisit and reroll an allowed chance event. The player discovers another history that could have occurred under the same laws; they do not directly edit organisms, place resources, or select destinations.

The desired experience is to recognize a form, follow its descendants, locate a consequential chance event, and watch a changed outcome propagate through ordinary interactions. Local neighborhoods and natural selection should arise from growth, shading, dispersal, reproduction, and death. Do not assign territories, target organisms, diversity rewards, or global fitness scores.

The world should feel elemental: square cells, three child slots, simple inheritance, sunlight, energy, seeds, and traces of previous lives. Repeated geometry supplies the vocabulary. Do not impose ornamental symmetry or manufacture complexity. Sustained novelty, reciprocal adaptation, and open-ended evolution are aspirations, not results this specification claims or requires the first prototype to demonstrate.

This document is self-contained. Build from these desired behaviors; no historical source files, interfaces, or implementations are dependencies.

### Required behavior versus implementation freedom

Sections describing rules, geometry, probabilities, lifecycle, and player abilities are prescriptive. Preserve their meaning. Approved defaults are the initial settings; expose the specified dials and toggles. Numerical values explicitly marked **proposed starting values** may be calibrated and reported without changing the underlying rules.

Methods are suggestions. Choose data structures, language, rendering techniques, indexing, inheritance storage, routing, scheduling, caching, and replay architecture that achieve the requirements. Local energy flow and local completion communication are preferred; plant-wide energy pooling and plant-wide lifecycle tracking are explicitly permitted for simplicity or performance. Do not add a one-growth-per-plant throttle to simplify bookkeeping.

Some unspecified choices affect physical outcomes, including resource arbitration and the detailed timing of transfers. Resolve those minimally, record them in a short executable rule card, and keep them fixed within a history. Exact replay is required within the chosen implementation; different compliant implementations need not produce identical ecosystems. Do not describe an outcome-changing rule change as merely an optimization.

The preferred delivery is one self-contained HTML file that runs in a modern phone or desktop browser without runtime network dependencies. JavaScript and Canvas are suitable suggestions, not required internal technologies. Supporting tests and a short verification note may be separate files.

## 2. World, coordinates, and initial condition

Use a discrete square lattice. The world has a two-dimensional ground map and elevation above that ground. Every plant occupies a vertical plane at the ground row where it germinated. Its body branches horizontally and vertically within that plane; its ground row does not change as it grows.

For explaining the rules, use:

- `x`: horizontal position, wrapping left to right;
- `g`: ground row, with 0 at the back/horizon and increasing toward the front;
- `z`: elevation, with 0 at the ground plane and increasing upward;
- `S`: the number of sky rows above the horizon.

The required default projection is:

```text
screen column = x
screen row    = S + g - z
```

Equivalent internal coordinates are welcome. These relationships must remain the same. Ground-map values do not change `z`; they are not terrain elevation in this version.

### Screen sizing

At creation, measure the available simulation viewport and derive a fixed world using a configurable cell size, initially **4 logical screen pixels per cell**. CSS pixels are a suitable interpretation of logical screen pixels; display-resolution scaling must not multiply the physical cell count accidentally.

- Portrait: reserve a top square for sky. In lattice units, sky rows equal the number of columns.
- Square or landscape: reserve **25% of the vertical extent** for sky by default.
- The remainder is ground rows. The backmost ground row lies immediately below the sky and is the farthest row where seeds can establish.
- For a 400 × 1000 simulation viewport with 4-pixel cells: 100 columns, 250 total rows, 100 sky rows, and 150 ground rows.

Record the resulting world dimensions in the history. Resizing, rotating, inspecting, zooming, or replaying on another device changes presentation, not the physical world or its chance results. Choose a practical framing strategy that preserves this distinction.

### Initial condition

Begin with an empty litter field and **one seed already landed at the center of the ground rectangle**. Its genome is exactly `010,000`: an ordinary base cell and one upright terminal above it. It must establish through the same light/occupancy requirements as other seeds. There are no other founders or supplied adult plants.

The founder's placement and genome are fixed initial conditions. The offspring dispersal rule does not move the founder away from the center. Do not add rescue reseeding, population floors, or automatic restarts after extinction.

## 3. Triple Bit Tree bodies

A genome is a finite branching tree. Each gene corresponds to a possible cell and specifies three child slots: **left, forward, right**, relative to that cell's facing. A child faces in the direction of the edge that created it. The initial facing is upward in the plant's vertical plane.

Printed bits are in L/F/R order:

- `100`: left child;
- `010`: forward child;
- `001`: right child;
- `000`: natural terminal.

For communicating genomes, preorder traversal in L/F/R order is the suggested convention. Any internal representation is acceptable if these forms, relationships, depths, and inheritance behaviors are unambiguous.

Examples:

- From an upward-facing cell, left is horizontal left and forward is upward.
- From a left-facing cell, its right slot points upward.
- `010,100,000` describes the base, one cell above it, and a terminal to the left of that upper cell.

The complete potential blueprint must avoid intrinsic self-overlap, including unexpressed parts. Preserve the unchanged inherited blueprint when checking a newly added branch. Do not impose extra clearance halos, forced crown symmetry, or an arbitrary gene-count/depth cap.

Physical expression is separately limited by space, boundaries, energy, and hardening. Instructions that cannot be expressed remain hereditary until the forgetting rule removes them. Intrinsically valid instructions do not guarantee a fully expressible organism at every landing site.

### Optional locked base

The default is **first gene locked at `010`** for legibility. Provide a toggle to disable this restriction for new experimental histories. While enabled, hereditary changes must preserve the base's `010` mask and its required first child. The first child's own gene can change. This is an explicit exception to general mutability; no other basal protection is required.

### Physical collisions and boundaries

Plants wrap horizontally. No cell can be built below ground level or beyond the top screen edge. The sky is available for projected plant growth, although seeds cannot establish in sky rows. Actual growth must never put two living cells into the same physical position, including two cells of the same plant. Wrapping cannot overwrite an existing cell.

Bodies at different ground rows may overlap in projection because they occupy different physical planes. Bodies in the same ground row can physically collide. An occupied physical target blocks growth; a shared screen pixel alone does not.

## 4. The default viewer looks from the sun

Use a fixed parallel viewing direction aligned with the incoming sunlight. Every living plant cell is fully opaque to this direct light. Light is **all-or-nothing** in this version.

At each projected screen location, the nearest living cell along the sun/view ray is visible and receives direct sunlight. All living cells behind it receive none. Depth must determine this order, not creation order or container iteration. With the coordinate convention above, larger `g` is nearer along a shared projected ray.

A ground location is lit when no living plant cell obscures it in this aligned projection. A living base occupying that ground position covers the ground there. Flying seeds are excluded from light occlusion, so a seed does not disqualify itself by casting a shadow on its own germination test.

Example with flat ground: a plant anchored at `(x=10,g=10)` has cells at elevations 1, 2, and 3. They appear over ground rows 9, 8, and 7, respectively, and shade those locations. A cell at `(10,10,2)` and a cell at `(10,9,1)` share a projected pixel, but only the former is lit and normally visible.

The shadows are hidden behind their occluders from the default viewpoint. Retain the hidden living cells: hidden is not dead. They may have stored energy or receive energy from exposed parts of their plant. When an occluder dies, existing background tissue can become visible and illuminated.

Ground-map values have no elevation and cast no shadows. Their brightness has no effect on plant lighting or energy.

An optional inspection overlay may identify shaded tissue. A future alternate viewing angle would move only the camera, leaving sunlight fixed; it is not required in the initial prototype. Observation never changes the simulation.

## 5. Energy, growth, and reproduction

All exposed living cells collect the same amount of energy per tick. There are no specialized leaves or absorption bonuses for terminal cells. Row colour, ancestry, genome size, and litter value do not grant energy bonuses.

Building a cell costs energy. Producing a seed costs more energy than building one cell. There are **no upkeep costs for existing cells**, no earth uptake, no carried construction grains, and no material conduction. Roots have no separate role: the base is an ordinary living cell and the organism's positional origin.

Incoming sunlight supplies the energy used to create biomass. Dead biomass later increments the litter field. This is an open material model; do not impose an earth-to-body material budget or require litter to be spent on growth.

### Energy availability

Prefer transfer through actual neighboring parent/child connections. A plant-wide energy pool is explicitly acceptable, especially for performance gains. Either way, a growth or reproductive event must pay its cost, and simultaneous events must not spend the same energy twice. Energy captured in one part of a plant may support another part. Do not transfer energy directly between separate plants.

Storage, routing, capacities, transfer rates, and fair arbitration are implementation choices to declare and tune. Account for incoming energy, stored energy, work, and any discarded overflow/death energy; a heat field is not required. Do not create hidden energy gifts to sustain a struggling lineage.

### Concurrent growth

Any immature bud with an inherited child instruction, a free physical target, and sufficient available energy may build. Many buds of one plant can grow in the same tick. There is no one-cell-per-tick-per-plant growth limit. Resource accounting and local readiness determine which attempts can succeed.

A one-tick activation delay for newly built cells is a suggested starting schedule, not a required implementation technique. Choose a deterministic scheduling/conflict policy and state its physical timing. It must preserve the required concurrent growth and paid-energy behavior.

### Seeds and flowers

Only built cells whose actual hereditary gene is `000` are reproductive tips. A nonterminal blocked by an obstacle does not turn into a flower. A tip can set seed only after its plant has hardened and enough energy is available. Many flowers may reproduce in the same tick if their costs can be paid.

There is no need for a physically empty release neighbor: a newly formed seed enters the non-interacting journey described below. Current illumination is how energy is acquired; stored or conducted energy can still fund a shaded part. Do not add an extra requirement that every flower be directly illuminated at emission.

Seed-production frequency is an exposed tuning choice, with one opportunity per terminal per tick suggested initially. Do not insert an undocumented whole-plant reproductive cap.

## 6. Development, viability, hardening, and death

A plant cannot reproduce while immature. It can retry genetically instructed growth that is temporarily blocked or unaffordable during development.

### Grace period

- Adding any cell restarts the plant's grace clock.
- Every tick without successful growth advances the clock, whatever the cause, including insufficient energy.
- If the full inherited plan is expressed, the plant can harden immediately.
- Otherwise, expiry of the no-growth grace period triggers the viability check below.

The base appearing at germination is the first developmental progress event. Local communication of completion/progress is preferred conceptually; somewhat abstract plant-wide tracking is explicitly allowed. The data structure and signal algorithm are not prescribed.

### Minimum expression before maturity

At the end of the grace period, compute:

```text
expression fraction = number of built living cells / number of cells in the full inherited plan
```

Include the base in both counts. The denominator is the individual's inherited plan, including its random mutation, before that individual performs any maturity-time forgetting.

- If the fraction is below the configured minimum, **the entire plant dies while immature**.
- If the fraction is at least the minimum, it hardens.
- The approved starting minimum is **50%**, exposed as a dial. Exactly 50% passes.
- Do not prune unbuilt genes first to make a failing plant pass.

This is a minimum-expression guard, not a guarantee of morphological similarity or fitness. It prevents a severely underexpressed fraction from immediately reproducing as a tiny substitute. Report whether it works as intended; do not silently remove it to improve population persistence.

### Adult phase

Hardening freezes the realized body. Openings that appear later do not restart growth. A viable hardened plant may now reproduce and its fixed adult lifespan starts. **The lifespan clock does not run during development.** Do not subtract development time from the approved adult lifespan.

Ordinary death occurs when the configured adult lifespan expires. The whole plant dies at once, not tip by tip. There is no separate starvation-death or upkeep mechanism. Already released seeds remain independent offspring when their parent dies.

There is no arbitrary genome-size penalty or reward. Larger forms naturally require more construction energy and time and may intercept more light. Preserve these consequences rather than imposing a global size score. Test whether the chosen energy tuning gives large plans an overwhelming default advantage; change tuning transparently rather than adding hidden fitness rules.

## 7. Inheritance and three-generation forgetting

At hardening, record which hereditary cells were expressed. For each inherited gene in that individual's lineage:

- A built cell resets its consecutive unexpressed-generation count to 0.
- An unbuilt cell increments that count once for this generation.
- On the third consecutive unbuilt generation, that gene and its entire descendant subtree are removed from the plan available to offspring. Clear the corresponding parent child-slot bit.

Count once per hardened generation, not once per seed and not once per tick. Identical DNA in different lineages may carry different expression histories. Newly introduced genes have no earlier misses. Descendants removed with a pruned ancestor are removed even if their own counters are younger. The locked-base invariant takes precedence while its toggle is enabled.

The adult's recorded birth plan and realized body remain available for inspection. Forgetting defines its hereditary baseline for offspring; it does not erase actual tissue or retroactively shrink the viability denominator. The adult cannot grow again after hardening.

An immature plant that fails viability produces no offspring. Its unexpressed genes are not passed through a special rescue path.

### Random mutation is separate from forgetting

Each new seed inherits the parent's post-forgetting baseline, then has a **1-in-4 chance of one additional random mutation** by default. Otherwise that baseline is copied without random editing. Deterministic forgetting can therefore change inheritance even when the random mutation gate does not open.

Retained unexpressed genes remain eligible for mutation. Do not restrict mutation to expressed tissue or the current growth frontier.

## 8. Slot-first mutation and the depth urn

**There is no separate grow-versus-cut coin.** First select one eligible child slot in the retained hereditary plan, using the depth-weighted urn. Then flip that selected bit:

- **1 → 0:** remove the child and its entire subtree.
- **0 → 1:** create the child and generate its new descendants using the rule below.

Here a mutation site is one slot of one gene. It does not mean resampling all three bits of an existing gene. The selected bit flips; the [0,0,1] sampling applies to the newly created descendants' slots.

A filled slot is eligible for cutting unless protected by the locked base. An empty slot is eligible for growing when the new child would not overlap the inherited blueprint. Exclude protected or intrinsically impossible sites before sampling. Retain eligible sites in unexpressed genetic material.

Grow/cut frequencies consequently depend on the eligible zero and one slots and their weights. They need not be 50/50. With the base locked, the minimal `010,000` body has eligible additions but no removable upper branch that preserves its locked structure; mutation can still occur normally.

### Exact weighting

The base has depth 1. Depth is the number of parent links plus one, not screen height, array order, gene age, or plant age.

Each eligible slot at depth `d` gets:

- **Default linear curve:** `d` tickets: 1, 2, 3, 4, … by depth.
- **Optional multiplying curve:** `B^(d-1)` tickets, with a proposed initial multiplier of 2: 1, 2, 4, 8, … .

These are per-slot weights. A depth with more eligible slots has more total tickets. Every eligible site has positive probability. Sampling must reproduce this urn's distribution; do not substitute the two-candidate/deeper-wins method or silently round small probabilities to zero.

Weighted scans, depth buckets, cumulative intervals, arbitrary-precision integer tickets, and cached eligibility are possible methods. Literal duplicated arrays are not required. JavaScript BigInt is one possible tool for exact large integer weights, not a required language or architecture.

### Recursively generating an addition

The newly added child is present. Independently sample each of its left, forward, and right slots from **[0,0,1] with replacement**: absent with probability 2/3, present with probability 1/3. Every accepted new descendant repeats this process. Sample these genes once at mutation; subsequent growth and inheritance use the sampled result.

Prevent collisions with the full unchanged inherited blueprint and between new descendants. Blocked intrinsic targets stay absent. Use a fixed, documented construction/conflict convention so creation and replay agree. Breadth-first L/F/R reservation is one possible method, not a mandate. Do not add clearance halos or an arbitrary genetic size/depth cutoff.

## 9. Seed journeys and establishment

### Launch position

Convert the flower's **drawn position** to a ground-map launch location, not its vertical footprint beneath the plant. Under the coordinate convention above, a flower at `(x,g,z)` starts a ground walk at `(x,g-z)`.

- If this row is behind the backmost ground row because the flower is drawn in the sky, clamp launch to ground row 0, keeping its horizontal position.
- Apply horizontal wrapping.
- Example: ignoring the sky offset, a flower drawn at `(9,6)` on a plant rooted in row 10 launches at ground `(9,6)`, not `(9,10)`.

This is an intentional dispersal abstraction. It is not a three-dimensional fall. Taller flowers can shift the mean launch position toward the back; record and test this consequence rather than treating dispersal as height-neutral.

### Private walk

At seed formation, choose an integer step budget uniformly from **10 through 100 inclusive**, with both endpoints configurable. For each step, choose uniformly among the four cardinal directions. Take **one step per simulation tick**.

- Left/right edges wrap.
- A step beyond the front or back ground row counts against the budget but leaves the seed in place.
- A seed does not collide, establish, block light, consume resources, or influence other organisms during its walk.
- Seeds may overlap each other and living tissue in transit.
- Rendering them as low-alpha amber motes over the scene is allowed. These are non-occluding visual markers, not an exception that lets tissue see through opaque tissue.

The entire budget and direction sequence form that seed's independently rerollable journey. A journey reroll samples both again. It does not choose a destination directly.

### Endpoint test

Only after its allotted steps does a seed attempt establishment. Its destination must be a physically free ground-level cell.

By default, require the **3 × 3 ground neighborhood centered on the seed to be lit**. Provide a toggle to check only the center cell. Neighbor columns wrap; at the front/back edges check only ground cells that exist, so edge rows remain germinable. The surrounding requirement is a ground-illumination test, not an additional three-dimensional clearance halo around a hypothetical mature body.

The candidate seed does not shadow its own test. Do not reject establishment merely because parts of the inherited adult plan might later be blocked.

- On success, establish the base at that ground location and begin development.
- On failure, the seed dies and adds **one unit** to that destination's ground value. Do not retry elsewhere or extend its walk to find a favorable landing.
- Contested simultaneous establishment at one physical cell must resolve deterministically without overwriting tissue; losing attempts fail and deposit their litter once.

## 10. Litter field and local spilling

Store a nonnegative integer value for every ground cell. It represents accumulated litter values, not physical height, usable construction matter, water, or a fertilizer bonus in this version. Its direct effects are its visual trace and its own redistribution.

When a plant dies, each actual built cell adds one unit at its horizontal position in its original ground row:

```text
dead cell at (x,g,z) → increment ground value at (x,g)
```

All tissue from one plant therefore initially deposits in one ground row, while lateral branches spread deposits across columns. This applies to adult expiry and immature failure. Count built cells, not all planned genes. Deposits are credited once; established tissue does not leave behind an extra failed-seed deposit.

Spilling can subsequently cross rows:

- A cell can send **at most one unit per tick** to one cardinal neighbor whose value is lower by at least the configured difference.
- Default required difference: **2**, exposed as a dial.
- Left/right neighbors wrap. Front/back boundaries are closed: absent neighbors do not receive spilled units.
- Debit the source and credit the destination exactly. Multiple incoming units are allowed.
- Do not use a four-units-at-once toppling rule or an absolute-height threshold.

Selecting a lowest eligible neighbor with independently keyed random tie-breaking is a suggested starting policy. Any alternative must still obey the slope, locality, outflow-rate, accounting, and replay requirements and be recorded with the history. Abiotic randomness is not editable by the player.

There is no decay or boundary outflow to add for now. Keep full counts even when display brightness saturates. High average values do not by themselves force spilling: high, nearly equal neighbors can be stable. Long-term interpretation and reuse of this field are deferred.

With zero initial litter, verify this account:

```text
total ground value = deposited dead plant cells + failed seeds
```

Spilling preserves that total. Living biomass is created using energy and is not withdrawn from the ground field.

## 11. Visual behavior

The main view should remain quiet and legible at phone scale. All visible cell geometry is square and unambiguous. Inspection may add annotations, but decorative effects must not obscure which organism occupies a location.

- Ground starts pure black. Composite a configurable tint according to `clamp(value × alphaPerUnit, 0, 1)`. Start with white as the tint and **0.01 alpha per unit**. A value of 100 reaches white under this initial scale; larger values remain stored. Redistribution can darken a source and lighten its neighbors.
- Sky is subtle dark blue: initially pure blue at **20% alpha over black**.
- A plant rooted in the frontmost ground row has body colour **(0,255,0)**. Add **1 blue-channel unit per row toward the back**, capped at 255. Colour depends on the rooting row, not the cell's projected screen row or elevation.
- Natural terminal tips can be subtly pink to indicate flowers, with the same tendency toward more blue for farther rooting rows. The exact pink is a proposed tuning choice; colour does not change absorption or costs.
- Seeds are amber and low alpha. Overlay rendering is acceptable for performance. Their visual opacity does not affect the physical sunlight test.
- Normal rendering shows the frontmost opaque tissue. Inspection must make it possible to understand a selected shaded organism without granting it light or deleting its occluder.

The ground tint/alpha, sky tint/alpha, depth-blue increment, flower tint, seed tint/alpha, and cell size belong in configuration rather than scattered literal constants.

## 12. Chance, history, and player agency

The world must be deterministic given its initial state, recorded configuration, and intervention history. Rendering rate, playback speed, wall-clock timing, incidental container order, and observational statistics must not change its physics.

Give independent, reproducible chance to unrelated events. Changing one outcome must not shift a shared random stream for other seeds, organisms, or environmental events. Stable event identity must survive a selected seed's inheritance reroll; it cannot be derived from the changed genome. The internal PRNG, identities, streams, hashes, and record format are implementation choices subject to this contract.

Player-editable event categories are:

- **Inheritance:** reroll the seed's random mutation event, including the mutation gate, selected slot, and newly generated descendants. Deterministic pruning is not separately rerollable.
- **Journey:** reroll that seed's step budget and cardinal direction sequence independently of its genome.

Abiotic chance remains independently reproducible but uneditable. Every reroll samples the relevant ordinary distribution and may repeat an outcome. Do not force every inheritance reroll to create a mutation or a visibly different body.

Rewind to the appropriate event, apply its revised chance, and replay under the same laws. Preserve real downstream effects on shading, expression, later gene pruning, energy, offspring, and litter. Preserve earlier interventions, and do not silently impose unrelated edits from an abandoned later future. The two categories can be combined for the same seed while remaining independent.

Light occlusion, energy sharing, and seed launches have the causal reach explicitly permitted by this model. Plant-wide pooling is an allowed abstraction; do not claim a universal one-cell-per-tick causal bound while using it. The required independence is that unrelated dice are not reshuffled and changed physical states have explanations under the chosen rules.

## 13. Minimal interface capabilities

Choose a fresh minimal interface that serves these tasks; no earlier layout is required:

- Watch without playing; pause, single-step, and change playback speed.
- Navigate recorded time, rewind, and replay forward.
- Select a plant or seed, inspect its inheritance and ancestry, and locate its seed-formation event.
- Distinguish growing, hardened, immature-failed, shaded, and dead states; compare the inherited plan with realized tissue and understand retained unexpressed genes.
- Reroll inheritance or the seed journey, and compare the changed history with its parent at the **same simulation tick**.
- Inspect small or hidden forms without changing the world or sunlight. Fit the whole world by default; offer simple closer inspection where needed.
- Save and load enough information to reconstruct a history reproducibly.
- Adjust dials/toggles for a new experimental run. Keep the recorded laws fixed during ordinary rewind/reroll comparisons.

A current branch and its parent comparison are enough. No general multiverse editor, full branch-management product, score system, missions, or prescribed target creature is required. Let the user discover consequences.

## 14. Configuration and starting values

Keep simulation constants in one documented configuration. Record the complete effective settings, world dimensions, and chosen physical policies with each history. Changing laws starts a new run; it does not silently rewrite an existing history. Interface playback/inspection settings may change without changing laws.

### Approved initial defaults

- Cell size: **4 logical screen pixels**.
- Portrait sky rows: **equal to world columns**; otherwise **25%** of total rows.
- Founder: one landed seed at the ground center, genome **010,000**.
- Locked first gene `010`: **on**, with an off toggle.
- Sunlight: **opaque/all-or-nothing**; every exposed cell absorbs equally.
- Minimum expression for hardening: **0.50**.
- Unexpressed-generation forgetting threshold: **3**.
- Additional random mutation probability per seed: **0.25**.
- Mutation weighting: **linear by depth**, with multiplying weighting optional.
- New-descendant slot probability: **1/3**, the [0,0,1] urn.
- Walk budget: uniform integer **10–100 inclusive**, both endpoints adjustable.
- Walk rate: **one cardinal step per tick**.
- Germination exposure: **3 × 3**, with a center-only toggle.
- Ground spill difference: **2**, adjustable.
- Spill outflow limit: **one unit per cell per tick**.
- Ground tint: **white**, alpha increment **0.01 per current value unit**.
- Sky: **blue**, alpha **0.20 over black**.
- Front-row body: **(0,255,0)**; depth blue increment **1 per row**, capped.

### Proposed starting values, not validated biological constants

Use these to begin small lifecycle checks. They are independent dials, not coupled laws or evidence of persistence:

- Energy captured per exposed cell per tick: **1**.
- Energy to build one cell: **4**.
- Energy to form one seed: **32**, always greater than the cell build cost.
- No-growth grace period: **32 ticks**.
- Adult lifespan after hardening: **256 ticks**.
- Optional local energy capacity, if finite storage is used: **64 per cell** as a first trial. For a plant-wide pool, choose and report a compatible storage policy rather than applying this suggestion as an unexplained global growth throttle.
- Optional local transport rate: **1 energy unit per connection per tick** as a first trial.
- Reproductive opportunities: **one per eligible terminal per tick**, subject to energy.
- Optional multiplying depth factor: **2**.
- Flower tint suggestion: **(255,144,176)**, adjusted subtly for depth.
- Seed tint suggestion: **(255,191,0)** at **0.30 alpha**.

Expose other necessary rates/capacities if the chosen architecture uses them. Avoid adding unrelated controls or mechanisms solely to make every listed suggestion meaningful.

## 15. Verification and completion

Deliver runnable software, focused checks, and a concise verification note. A single deterministic core shared between browser and headless checks is a useful method, not a requirement to copy any existing architecture.

Require evidence for the following behaviors:

- Hand-calculated TBT coordinates in all four facings, especially a left-facing node whose right child grows upward. Check intrinsic self avoidance and physical collisions separately.
- Different ground rows can overlap on screen without collision; only the nearest opaque cell receives light. Foreground death exposes retained background tissue. Ground values and flying seed markers do not occlude.
- Linear/exponential mutation tickets match a small independent literal-urn oracle. Deep valid sites retain positive probability. Slot selection precedes grow/cut; there is no separate coin. Check whole-subtree cuts, recursive [0,0,1] additions, dormant-site eligibility, and the locked-base toggle.
- Three consecutive misses prune the gene/subtree; expression resets the streak. Independent lineages with identical DNA do not share counters. New genes do not inherit an old deleted locus's miss history.
- Parallel buds can grow in one tick without resource double-spending. All exposed cell types capture equally. There is no upkeep charge or whole-plant single-growth bottleneck.
- Any successful growth resets grace; energy shortage advances it. Exactly 50% expression passes and a smaller fraction fails, measured before pruning. Adult age begins only at hardening. Hardened bodies never resume growth, and blocked nonterminal buds never become flowers automatically.
- One founder starts landed at the ground center. Offspring budgets are uniform and inclusive, walks are cardinal and one step per tick, horizontal wrapping and front/back stays are correct, sky launches clamp, and the last step is followed by exactly one establishment attempt.
- The 3 × 3/center toggle works, including horizontal wrapping and partial front/back neighborhoods. Endpoint conflicts do not overwrite plants. Failed seeds deposit once.
- All actual tissue from a dead plant deposits at its lateral positions in its original ground row. Immature deaths are included. Spill transfers preserve the litter ledger, obey the slope threshold, and send at most one unit per source per tick. Large stored values survive display saturation.
- Untouched replay, snapshot restoration, save/load, and different playback/render schedules yield identical full causal state. Resizing is observational. A selected seed's inheritance reroll preserves its private journey; a journey reroll preserves its genome. Other chance streams remain unchanged unless the relevant event itself is causally different.

Before tuning, predeclare a small seed set and multi-generation horizon, with some seeds held out. Include a zero-random-mutation founder control as well as ordinary mutation runs. Report all final runs, including extinction. Measure actual expressed bodies and reproduction, not just DNA length. Do not sustain the world with unreported reseeding or abundance bonuses.

Find one genuine reproducible fork from an ordinary run, recording world seed, configuration, intervention, event identity, and observation tick. Explain the first changed causes and later consequences. Controlled fixtures establish correctness; they do not replace this demonstration.

Exercise the actual delivered interface in a browser, including portrait layout, selection, hidden-organism inspection, both rerolls, same-tick comparison, and save/load. Report tick throughput, replay delay, and memory on the tested environment. Label emulation honestly; do not claim physical-phone validation or ecological results that were not observed.

No numeric lifecycle proposal here has yet been validated for this combined model. If the initial tuning fails, diagnose and adjust exposed starting values transparently. Do not silently replace mandatory behaviors. The final note should state the chosen scheduling/resource policies, effective constants, commands or reproduction steps, observed outcomes, and remaining limitations.

## 16. Deferred scope

Do not add water, evaporation, specialized high-absorption leaves, physical terrain elevation, litter nutrition, underground roots, earth-material construction, rim-only germination, inward growth toward a central sun, plants growing on other plants, support-collapse forests, or a rotating-camera feature to the initial build. These remain possible future directions, not missing requirements to fill in.

Success is a small readable world with viable life cycles, inherited variation, coherent shading and depth, meaningful chance interventions, and trustworthy replay. Whether its histories are compelling remains a playtest question. Do not claim open-ended evolution, reciprocal coevolution, self-organized criticality, or biological realism without separate evidence.
