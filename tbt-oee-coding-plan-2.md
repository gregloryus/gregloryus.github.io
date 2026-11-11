# Minimal TBT Open-Endedness Experiment — Coding Plan

**Version 2 — August 2026**

Companion to `triple-bit-trees-oee-2.md`. That document specifies the TBT
encoding and the open-endedness research background; this one specifies what to
build.

**Changed in v2:** the build is now a fork of the existing `simplant-20.js`
rather than a from-scratch implementation, and the energy model is two
independent toggles rather than a single rule.

---

## Purpose

Build the smallest system that can answer one question with numbers:

> Does a legible TBT plant ecology sustain open-ended morphological novelty, and
> what makes the difference — the geometry of competition, or
> frequency-dependent selection?

This is an experiment, not a generative-art build. The visual output matters, but
the deliverable is a set of activity curves. Instrumentation is not a later
addition — it is the point.

---

## Starting point: fork `simplant-20.js`

Do not start from scratch. `simplant-20.js` already implements most of what is
needed, correctly:

| Already present | Where |
|---|---|
| TBT decode / encode / mutate | `decodeGenomeToTree`, `encodeTreeToGenome`, `mutateGenome` |
| Relative facing tables | `DIR_DX`, `DIR_DY`, `ROTATIONS_FLAT` |
| Intrinsic selection — no fitness function | energy in, growth and seeds out |
| Death by starvation and age | `STARVATION_TICKS`, `MAX_PLANT_AGE * genome.length` |
| Traveling seeds and germination | `createTravelingSeed`, `AIRBORNE_STEPS`, `GERMINATION_CLEAR_RADIUS` |
| Seeded PRNG throughout | xorshift on `rngState` — reproducible runs |
| Flag discipline | `GRADUATED_ABSORPTION`, `DISTANCE_BONUS`, `CHILD_STARTING_ENERGY` default off |
| Performance harness | PIXI sprite pooling, 100× fast-forward, visual toggles off |

The intrinsic-selection architecture is the hard part and it is already right.
The work is decoupling, extending the mutation operators, and instrumenting.

---

## Scope discipline

Deliberately absent: soil, water, nutrients, litter, pollen, seasons, minerals,
temperature, terrain, biomes, herbivores, decomposers, organs, barriers,
geographic isolation.

Every one of these is defensible. Every one costs legibility and adds a tuning
surface. None is required for the question above. **Do not add any of them until
the instrumented baseline has produced numbers.**

Geographic isolation is held back deliberately even though it is a project goal.
If the base system cannot sustain novelty in a uniform world, geography will not
rescue it; if it can, geography becomes a clean second experiment.

Organ genes (values ≥ 8) stay out of v1. They add phenotypic vocabulary but also
complicate the component tallies, and the OEE question does not need them.

---

## Element 1 — Energy: two independent toggles

The most consequential design decision, and the reason for v2.

```js
ENERGY_EXPOSURE: true,   // simplant's existing rule
ENERGY_SHADE:    false,  // new
```

**Constraint: at least one must be true.** Assert at startup and fail loudly if
both are off — a world with no energy source is not a valid configuration.

If both are on, a cell earns from each independently and the two sum.

### Exposure (already implemented)

A cell counts how many of its four orthogonal neighbours are empty. Under the
current default it absorbs when `openCount >= 3`; the `GRADUATED_ABSORPTION` flag
grades the yield by 1 / 2 / 3+ open neighbours instead.

Selective pressure: rewards thin, non-self-crowding forms. A cell buried inside
its own plant earns nothing, so this penalizes self-crowding as well as
neighbour-crowding. It pairs naturally with the clearance rule and produces the
crown-shyness look.

### Shade (to be added)

> A cell earns if every cell directly above it, to the top of the lattice, is
> empty.

Implement with a per-column highest-occupied-row cache updated on placement and
removal — O(1) lookup, no per-cell raycast. Note the existing world wraps
vertically as well as horizontally in places (`ny < 0 → ny += rows`); decide
explicitly whether shade respects the wrap or treats row 0 as sky, and document
the choice.

Selective pressure: rewards height, and creates an *asymmetry* — being under a
neighbour is worse than being beside one. Asymmetry is what generates
stratification and, plausibly, niches.

### Why both as toggles

These are different competition geometries, not variants of one rule. Exposure is
isotropic; shade is directional. The hypothesis worth testing is that directional
competition generates more spatial structure, and therefore more room for
divergent forms, than isotropic competition does.

Keeping them independent makes that a measurable axis rather than an assumption.

---

## Element 2 — Mutation operators

`mutateGenome` currently performs a single bit-flip. Add two operators, using the
existing decode/encode:

1. **Bit flip** (existing). Setting appends a terminal child; clearing amputates
   that subtree.
2. **Subtree duplication** (new). Pick a node, copy its whole subtree, graft the
   copy into an empty slot on some node. Skip if no empty slot exists.
3. **Subtree deletion** (new). Pick a non-root node, remove its subtree, clear
   the parent bit.

Weights configurable; start around 0.6 / 0.2 / 0.2.

Keep addition and deletion symmetric. A documented failure in a sibling project:
making a loaded bit-clear a no-op ratchets genomes longer — easy to add, nearly
impossible to remove.

Duplication is absent from every prior TBT build and is the valley-crossing
mechanism: a redundant copy is free to drift while the original keeps working.
Because TBT facings are relative, a grafted subtree stays coherent at any
attachment point — an encoding-specific advantage.

---

## Element 3 — Frequency-dependence (flag)

```js
FREQ_DEP: false,
FREQ_DEP_RADIUS: 12,
FREQ_DEP_K: 1.0,
```

> A seed fails to germinate with probability proportional to the number of
> genetically similar plants rooted within `FREQ_DEP_RADIUS`.

```
p_fail = min(1, K * similarCount / maxNeighbors)
```

Similarity: exact genome-hash match in v1. A graded version using shared-subtree
count is a later refinement.

One check in the germination path, local, no new state. **This is an independent
variable of the experiment** — it must toggle cleanly with zero other
behavioural difference between arms.

---

## Element 4 — Decoupling and headless mode

The core is PIXI-coupled: `plant.cells` hold sprite references and the tick loop
calls the sprite pools directly. Split into:

- `sim-core.js` — world, plants, growth, energy, reproduction, mutation. No DOM,
  no PIXI, no rendering.
- headless harness — node, runs N ticks, writes JSONL, no canvas.
- browser view — renders the same core, same seed.

Same seed must produce identical runs headless and rendered. The PRNG is already
seeded and threaded; preserve that discipline and add no `Math.random()`.

**Light particles.** The particle walk up `cell.parent` to the seed resolves
deterministically — energy always arrives. For long instrumented runs, credit the
plant directly and keep particles as a render-only flourish. This removes a
per-tick allocation from the hot path. If `DISTANCE_BONUS` is ever enabled the
step count matters, so compute depth once at growth time rather than by walking.

---

## Element 5 — Instrumentation

Built before the experimental flags are used. Not optional, not deferred.

Every `TELEMETRY_INTERVAL` ticks, append one JSONL line:

```json
{
  "tick": 12000,
  "pop": 341,
  "births": 27,
  "deaths": 24,
  "meanGenomeLen": 9.4,
  "genomes": {"<hash>": <count>, "...": 0},
  "subtrees": {"<hash>": <count>, "...": 0}
}
```

- **Genome hash** — the DFS array joined; the species-level component.
- **Subtree hashes** — every node's full subtree, canonicalized as its contiguous
  DFS slice, **excluding size-1 subtrees** (terminal `000` genes are numerous and
  would swamp the tally).

Keep raw counts. All activity statistics are computed offline from the JSONL so
the analysis can be revised without re-running the simulation.

### Offline analysis script

Separate file. Per component set:

1. Cumulative activity per component, reset on extinction.
2. Shadow model: mirror each real birth and death, but draw the component
   uniformly at random from the pool. Reset shadow to real state every 1000
   telemetry steps.
3. Normalized activity = real increment − shadow increment.
4. New activity: noise floor N = |most negative normalized activity|; select
   newly-appeared components above +N; sum and divide by live component count.

Output: CSV of tick, total cumulative, median normalized, new activity — for
genomes and subtrees separately.

**The shadow model must mirror the real run's births and deaths, not run its own
demography.** If it drifts into simulating a separate population, every number
downstream is meaningless. This is the load-bearing twenty lines of the whole
project.

---

## Build order

Checkpoint after each. Prose check-in before writing each one.

| # | Step | Done when |
|---|---|---|
| 1 | Decouple core from PIXI; headless node harness | existing sim runs headless, same seed matches rendered |
| 2 | Add duplication + deletion to `mutateGenome` | mean genome length does not ratchet monotonically |
| 3 | Telemetry: genome + subtree hash JSONL | a 1M-tick headless run completes and writes a file |
| 4 | Offline activity statistics | activity curves plot from a baseline run |
| 5 | Add `ENERGY_SHADE` | shade-only config runs and looks different from exposure-only |
| 6 | Add `FREQ_DEP` | all arms run identically except their flags |

**Step 4 must precede steps 5 and 6.** Instrument the existing system first, so
you know what null looks like in your own numbers before testing interventions
against it.

---

## The experiment

Two axes:

- **Energy geometry:** exposure only / shade only / both
- **Frequency-dependence:** off / on

Full factorial is 6 cells × 10 seeds = 60 runs. If that is too many, run the
reduced set first:

| Arm | Exposure | Shade | FreqDep |
|---|---|---|---|
| A (baseline) | on | off | off |
| B | on | off | on |
| C | off | on | off |
| D | off | on | on |

Adding the both-on configurations later tests whether the two geometries compose
or interfere. 3M ticks per run; identical PRNG seeds across arms.

### Reading the result — within a run

| Whole-genome | Subtree | Reading |
|---|---|---|
| unbounded | unbounded | compositional open-endedness |
| unbounded | flat | recombining a closed parts list |
| flat | unbounded | motifs accumulating without viable body plans |
| flat | flat | stasis |

### Reading the result — across arms

- **FreqDep arms sustain, baselines go null** → frequency-dependence is what
  sustains morphological novelty in a legible plant ecology.
- **Shade arms sustain, exposure arms go null** → directional competition
  geometry is what matters; the asymmetry generates niches.
- **Both effects present** → the more interesting two-factor result; report the
  interaction.
- **All null** → well-instrumented negative result with a clear diagnosis. Still
  a contribution in a field where almost nothing is measured.

---

## Anticipated failure modes

**Visual monotony.** Shade-only competition may produce tall thin stalks;
exposure-only may produce sprawling thin ones. This is information, not a bug.
Resist adding mechanisms until the numbers say what is wrong.

**Population collapse or explosion.** Adding shade changes the energy economy.
Retune `SEED_COST`, `MAX_PLANT_AGE`, and dispersal to hold population roughly
stable before running long — do this when shade lands in step 5, not later.

**Genome bloat.** If mean genome length climbs monotonically, the operators are
asymmetric. `meanGenomeLen` is in the telemetry for exactly this check.

**Diversity collapse in the baseline.** If genome diversity collapses to one hash
within 100k ticks in arm A, that is the expected baseline and precisely what the
other arms test against.

**Vertical wrap.** simplant wraps vertically in its neighbour checks. Shade is
meaningless in a vertically wrapped world. Resolve this explicitly in step 5.

---

## Working rules

- Version by filename; increment on every delivered build.
- Prose design discussion before code at each checkpoint.
- Commit at checkpoints. Never `git push` from the terminal.
- Seeded PRNG only; no `Math.random()` in `sim-core.js`.
- Flags default off; the baseline arm is the existing behaviour.
