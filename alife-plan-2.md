# Design Plan v2 — Build Spec

**Working title:** *the pump*
**Author:** Claude, for Greg — Aug 18 2026
**Supersedes:** `alife-plan.md`
**Companion:** `alife-brief.md` (Greg's requirements, unedited)

This version is a **build spec**, not a research program. It exists to be implemented next.
It incorporates two rounds of cross-review against a competing plan ("Palimpsest Garden").
Everything the review got right has been folded in and is marked. Nothing is argued for twice.

---

## 0. What changed from v1, and why

| Change | Source | Reason |
|---|---|---|
| Interface tags on every cell; resources flow only between compatible faces | Review | v1 had no organism-to-organism channel at all, and its "diffusion along living tissue" secretly required a hidden owner ID |
| Litter retains its tag while weathering | Synthesis | Makes environmental memory idiosyncratic rather than scalar |
| **Tags are affordances, not passwords** | Review (correct against me) | If matching tags granted establishment, native/invasive would be hard-coded. Tags govern *bonding, conduction, and decomposition access* — never permission to live |
| Meristem = a cell with unspent developmental potential | Convergence | Removes the agent object without losing sequential development |
| Potential is split on division and must be *purchased* to increase | New | Structural guard against exponential growth fuzz; apical dominance emerges |
| Genome is a decision **tree**, not a flat table | Review | Flat tables can't be recombined once they partition conditions differently |
| Tissue density = matter actually present, not a declared trait | Review | One visible number does strength, cost, decay rate, memory duration, disturbance severity |
| Dimensionality ≤3 dropped as a pass criterion | Review (correct against me) | A monoculture is beautifully low-dimensional and would have passed |
| Slack redefined as *capturable flux*, not conserved matter | Review | A lake and locked wood hold matter that offers an invader nothing |
| H1–H4 hypothesis set replaces the single overclaim | Review | "Recipient slack rather than donor traits" ignored propagule pressure |
| Sine-wave pump demoted to a treatment arm | Review | Predictable wet-fragments/dry-connects scripts the narrative |
| Lineage dye moved out of physics into instrumentation | Review | The world should not recognize lineages |
| Compute budget replaced with measured numbers | Review | v1's figure was a hope stated as a budget |
| Petals and pollinator guild dropped from scope | Greg | Never essential to his goals |
| Gate 0 becomes an embedded smoke test, not a prelude | Greg + Review | v1's estimate assumed human evening work, not an automated harness |

**On convergence:** two independently developed plans arrived at the same core — conserved
currencies, interface-mediated exchange, litter as memory, competence-based development, an
adaptive-resolution genome, engine/theatre separation, and prove-the-map-first. That agreement is
weak evidence but it points one way, and it is the opposite of what would be fun to build. Time to
build.

---

## 1. The world

2D lattice. Wraps horizontally. Air above, bedrock below.
MVP spike: **256 × 128**. Long runs: **1024 × 512**.

### 1.1 Cell state (the legibility budget)

Every cell, whole state, nothing hidden:

| Field | Bits | Meaning |
|---|---|---|
| `kind` | 3 | AIR, SOIL, LITTER, LIVE, SEED |
| `matter` | 8 | The universal substance. In SOIL: mineral + organic. In LIVE: tissue investment. In LITTER: undecayed mass |
| `water` | 8 | |
| `sugar` | 7 | Meaningful in LIVE only |
| `potential` | 4 | Unspent developmental competence. `> 0` means this cell can still divide |
| `tag` | 2 | Interface tag (4 values) |
| `flags` | 4 | Age bucket, support state |
| `genome_id` | 16 | Index into genome pool |

≈ 7 bytes/cell. **If a cell's full state cannot be rendered as a readable glyph, the design is
wrong.** This is a constraint, not an optimization.

Tags are per-cell in v1. Per-face (4 × 2 bits) is the obvious v2 enrichment and is noted as a knob.

### 1.2 Currencies

| Currency | Conserved? | Notes |
|---|---|---|
| **Matter** | Yes, bit-exact | Total never changes. Soil ⇄ tissue ⇄ litter ⇄ soil |
| **Water** | Yes, bit-exact | Soil ⇄ tissue ⇄ atmosphere pool ⇄ rain |
| **Light** | No | Injected top-down each tick, attenuated by LIVE and LITTER it passes through |
| **Sugar** | No | Made from light + water, spent, dissipates as heat |

Conservation is what replaces the fitness function. Competition, carrying capacity, and
oscillation fall out of the accounting. **Nothing is ever scored.**

Assert bit-exact conservation of matter and water every tick in debug builds. A conservation
violation is a P0 bug, always.

---

## 2. Metabolism

Per LIVE cell per tick:

```
gain      = min(light_here, water_here, PHOTO_CAP)     # needs both
sugar    += gain
water    -= gain                                        # transpiration → atmosphere pool
sugar    -= MAINT_BASE + MAINT_MASS * matter            # heavy tissue costs more to keep
sugar    -= GENOME_COST * genome_nodes                  # complexity is paid for in the same currency
if sugar < 0: die → LITTER (matter and tag retained)
```

Three consequences worth naming, none of them coded:

- **Height vs. depth.** Light is above, water below. That tension generates the size axis.
- **Cheap-fast vs. dense-slow tissue.** Matter investment raises maintenance cost and lowers decay
  rate. That generates the economics axis.
- **Genome bloat has an intrinsic price.** No arbitrary parsimony penalty is needed.

---

## 3. Transport, and the tag mechanism

Between adjacent cells **with compatible tags**:

- Sugar and water diffuse down their local gradient
- Rate ∝ `min(matter_a, matter_b)` — thicker tissue conducts better

There is no organism ownership anywhere in the physics. There is no parent pointer, no plant ID, no
"my tissue." **A body is a connected set of compatibly-tagged cells.** That is the whole definition.

### 3.1 What tags do and do not do

**Do:** permit bonding, permit conduction, permit tapping matter out of adjacent LITTER
(decomposition).

**Do not:** decide who may establish, who wins, or who is native.

This distinction is the whole project. If tag-match granted establishment, invasion would be a
password check and the emergence claim would be false. Establishment is decided by the resource
economy alone; tag overlap merely *predicts* it, which is what makes H2 (§7.2) testable rather than
tautological.

### 3.2 What falls out for free

Grafting, mutualistic exchange, parasitic tapping, host–parasite recognition arms races,
decomposer specialization, and hyperparasitism — all from one affordance, with no predator, prey,
parasite, symbiont, native, or species category anywhere in the physics.

---

## 4. Development

### 4.1 The genome

A **decision tree**. Internal nodes test one local condition. Leaves specify one action.

**Conditions** (the only things a cell can read — all local, all visible):

- light arriving here — 3 levels
- water in me / adjacent soil — 3 levels
- crowding: occupied neighbours — 3 levels
- my matter — 3 levels
- my potential — 3 levels
- my sugar — 3 levels
- is an adjacent cell tag-compatible — 2 levels
- is adjacent LITTER tag-compatible — 2 levels

**Actions** (the whole alphabet):

| Action | Effect |
|---|---|
| `GROW(dir, split)` | Create a LIVE daughter. Costs matter + sugar. Splits potential per `split` |
| `THICKEN` | Add matter to self — stronger, slower-decaying, better-conducting, more expensive |
| `SET_TAG(t)` | Change own tag |
| `SEED(dir)` | Emit a detached SEED with a mutated genome copy. Costs heavily. Ends potential |
| `INVEST` | Spend a large sugar sum for `potential += 1` |
| `DIFFERENTIATE` | `potential = 0`. Permanently passive structure |
| `WAIT` | Nothing |

**There is no `MAKE_LEAF`, `MAKE_ROOT`, `MAKE_BRANCH`, or `MAKE_FLOWER`.** A leaf is thin tissue with
high light exposure. A root is tissue drawing water from soil. A trunk is thickened conductive
tissue. A branch is what a second growth direction is called afterwards. **Organ names are things we
say about the output, never things the genome can say.**

### 4.2 Meristems without agents

A meristem is **a cell that has not spent its developmental potential.** Not an object, not a class
in the physics — just `potential > 0`.

The review's objection was that this could re-encode a bud as "potential > 0" and still produce
exponential fuzz off every exposed cell. The guard is structural, not declared:

- A seed germinates with `potential = P0`
- `GROW` **splits** the parent's potential between parent and daughter, costing one unit
- Potential can only *increase* via `INVEST`, at a heavy sugar price

So total potential in a body is bounded by what the seed carried plus what the body has earned.
Branching is not free. **Apical dominance emerges** — a genome that hands most potential to the
daughter builds a long unbranched shoot; one that splits evenly builds a bush; neither is coded.

This is a refinement of the visible meristem, not its abolition. The review is right about that.
What it buys is that no agent object, ownership field, or separate physics class exists — and the
active set needed for performance is exactly the set of cells with `potential > 0`.

### 4.3 Mutation operators

| Operator | Effect |
|---|---|
| `perturb` | Change one leaf's action or parameter |
| `split` | Expand a leaf into an internal node testing a new condition, **both children copying the old action** — behaviour-preserving, adds capacity |
| `merge` | Collapse an internal node back to a leaf |
| `dup` | Duplicate a subtree (deferred to v2) |

`split` is the key operator: it is gene duplication followed by divergence, not insertion into a
sequential word where one edit shifts everything downstream. Complexity grows by **differentiation
of already-functional modules.**

---

## 5. Death, litter, and memory

- A LIVE cell dies (sugar exhausted, unsupported, or structural failure) → becomes **LITTER,
  retaining its matter and its tag**
- LITTER decays with probability ∝ `1/matter`. On decay it releases matter to adjacent SOIL
- LITTER blocks light, holds water, and locks matter behind a tag
- A LIVE cell with a compatible tag adjacent to LITTER can **tap** its matter — this is
  decomposition, and it is the only route to that locked matter

So the ground accumulates a tagged, geometric, fading record of exactly what grew there. That is
niche construction as externalized memory, and — critically — the genome **reads** it
(`adjacent LITTER tag-compatible` is a condition). Environmental modification that organisms cannot
sense is decoration; this closes the causal loop.

### 5.1 Structural support and disturbance

A cell needs support: matter below and diagonally-below must exceed a function of the mass above.
Fail → the column collapses into falling debris → LITTER.

**Disturbance therefore does not need to be a separate mechanism.** Large plants become
mechanically fragile, and treefall opens gaps. A small stochastic wear term is retained as a
tunable backstop, because gap dynamics are mandatory — of fourteen game-theoretic models of plant
height, only one predicts coexisting height strategies; size-asymmetric light competition otherwise
collapses to a single winner. Single-strategy collapse remains the likeliest killer of the whole
project.

---

## 6. Seeds, dispersal, isolation

- SEED = a detached cell carrying matter and a mutated genome
- It falls, with lateral scatter proportional to release height (taller plants disperse further —
  emergent, not coded)
- Germinates in soil with sufficient water
- Dispersal distance is short relative to world width. **This is what makes barriers possible.**

### 6.1 Barriers are lineage-relative

A dense canopy is a highway for its own shade-tolerant propagules and an ocean for an open-ground
lineage. Conditioned litter is a larder for a tag-compatible decomposer and dead weight to
everything else.

Therefore fragmentation is **measured through realized gene flow and successful establishment**, never
through geometric connected components.

### 6.2 The pump is a treatment, not the baseline

**Baseline (must work first):** fragmentation and reconnection arise from growth, collapse,
depletion, decay, dispersal limits, and shifting local resources. Nothing global says "fragment now."

**Treatment arm:** add a slow global moisture oscillation and compare divergence, contact,
hybridization, and invasion rates against the unpumped baseline.

That *tests* the species-pump hypothesis instead of building the answer in. Note the load-bearing
consequence: **spontaneous alternation between fragmentation and coalescence becomes a pass/fail
gate (P4)**, not decorative geography — and if the baseline cannot self-partition, the pump does not
rescue it, it conceals the failure.

---

## 7. Measurement

### 7.1 Success criteria, corrected

v1 proposed "effective dimensionality ≤ 3." That is wrong: a sterile monoculture is
zero-dimensional and would pass. Dimensionality is diagnostic, never a criterion.

The replacement, all three required together:

1. **Persistent coexistence** — N ≥ 3 distinct strategies co-occurring over many generations
2. **Trade-off structure** — reliable negative correlations between trait pairs (growth rate vs.
   persistence, height vs. root investment) rather than one blob or independent axes
3. **Recurrence** — the same strategy families appear across ≥ 3 independent seeds

And organs must pass **ablation**, not resemblance:

- remove the supposed leaf → light capture falls
- sever the supposed conduit → distal tissue starves
- remove the supposed root architecture → water acquisition declines

Function is demonstrated, never asserted from a screenshot.

### 7.2 The invasion hypotheses

- **H1 — Resource release.** Holding invader and propagule pressure constant, greater
  **capturable flux** at establishment sites raises establishment probability. *Capturable flux* =
  light reaching ground + water in the rooting zone + matter in decomposable form. Not matter locked
  in a lake, standing wood, or deep substrate.
- **H2 — Palimpsest matching.** Tag-overlap between invader and recipient litter explains outcomes
  *beyond* present capturable flux.
- **H3 — Coevolutionary escape.** Lineages invade partly by escaping coevolved exploiters; natives
  lose specialized advantages when transplanted.
- **H4 — Interface exploitation.** Matching a resident community's common tags permits invasion even
  where bulk slack is low.

This tests where fluctuating-resource theory (Davis, Grime & Thompson 2000 — 4,000+ citations,
mixed field support) holds and where eco-evolutionary history overrides it. Either outcome is a
result.

### 7.3 The assay

The zero-player run is never touched. At a checkpoint, clone the world offline and run controlled
counterfactuals: transplant A into B; erase B's environmental history but keep its resources; keep
history but remove residents; freeze evolution post-contact; hold propagule pressure constant.
Compare against naturally occurring contact events in the untouched run.

**The gate lives on the lab bench, not in the UI.**

### 7.4 Timescales — measured, never set

- **τ_gen** — generation time
- **τ_isolation** — duration of negligible realized gene flow
- **τ_contact** — interval between renewed contacts
- **τ_memory** — persistence of environmentally encoded history

Target regime: `τ_gen ≪ τ_isolation`, contact rare but finite, and `τ_memory` outlasting enough
generations to participate in selection without freezing succession.

This converts "nothing interesting happened" into a **diagnosis**: too much mixing / permanent
isolation / history erased too fast / history so persistent that succession stops.

### 7.5 Instrumentation is non-causal

Lineage colour is assigned retrospectively from logged ancestry. It is never a cell field. The world
must not recognize lineages.

---

## 8. Compute — measured, not promised

v1 asserted 1,000 sweeps/sec of a 1024×512 lattice. That is 5.2 × 10⁸ cell-updates/sec, about 6.7
cycles per update on an M2 core, which is not achievable for anything involving genome evaluation
and conserved transport. The review was right to call it.

**Measured** (this container, single core, Node 22): a trivial typed-array op over a 256×128 lattice
runs 65.5 M cell-ops/sec. A real update — genome tree walk, four resources, conservation, transport —
is 30–60× heavier, so ≈ 1–2 M cell-updates/sec in JS.

| Config | Full-lattice sweeps/sec | With active-set (~15% live) |
|---|---|---|
| JS, 256×128 | ~30–60 | ~200–400 |
| JS, 1024×512 | ~2–4 | ~15–25 |
| Rust ×4 cores, 1024×512 | — | **~300–500** |

Weekend at ~400 sweeps/sec ≈ **7 × 10⁷ ticks ≈ 35,000 generations** at ~2,000 ticks/generation. Lower
than v1's claim, same order, and this one is grounded.

**Definition of a tick:** one full pass over the active set, plus one physics pass (light, water,
decay, support). Generation counts derive from this and nothing else.

### 8.1 Architecture

- **One JS core.** Runs headless under Node for assays, and embedded in a single HTML file for
  watching. One implementation, not two — divergent engine/viewer implementations are a classic
  project-killer.
- **Rust port only when committing to weekend runs**, and only after the rule card is frozen.
- Engine and theatre stay separate: headless run → snapshots + event log → scrubbable replay with
  per-cell "why did this fire."
- Deterministic: seeded PRNG, fixed stream, replayable to the tick. **Determinism is worth more than
  speed** — it is what makes inspection possible.
- Update order: randomized within tiles. Near-async semantics, exact conservation (one cell acts and
  *moves* things), cache-friendly, deterministic.

---

## 9. Build plan

### Gate 0 — embedded smoke test (this session, not weeks)

Build the genome interpreter, minimal physics, and the mutation assay **together**, then in the same
session:

- hand-write one viable ancestor genome
- generate single mutants until the viability-fraction estimate stops moving (a few hundred to a few
  thousand; a stopping rule, not a power analysis)
- measure: viability fraction, phenotype-distance distribution (should be heavily zero-weighted with
  a tail), **neutral-walk length** — how far a random walk of neutral mutations travels before
  viability drops — and modularity retention (select for trait B, check trait A survives)
- render a contact sheet of mutant morphologies

**Only if this comes back bad or ambiguous** do we build alternative representations to compare. The
tournament is a contingency, not a prerequisite.

### P1 — vertical slice MVP

Everything in §1–§6 running, watchable, deterministic, zero-player: competence-based growth, adaptive
decision-tree genomes, light/water/matter/sugar, matter-invested structure, tagged litter, wear,
death, gaps, recycling, embedded assay, and enough inspection to explain any single growth event.

*Check:* a plant grows, transports, senesces, and leaves visibly altered ground.

### P2 — evolution in one region

*Check A:* do height and tissue investment diverge into more than one **coexisting** strategy?
*Check B:* does a spatial mosaic form, or does one strategy tile the world?
*Kill if:* still collapsing after tuning wear and gap frequency. The substrate is wrong; stop.

### P3 — interaction

*Check:* do tag-mediated relationships appear — grafting, tapping, decomposition specialization —
and do frozen-lineage / time-shift controls show **reciprocal** adaptation rather than parallel
adaptation to a shared environment?

### P4 — self-partitioning

*Pass/fail:* does the world spontaneously alternate between fragmentation and coalescence, measured
by realized gene flow?

### P5 — the pump as treatment, and the invasion assays

H1–H4. Reciprocal transplants. History-erasure controls.

**Ordering principle, unchanged:** *instrumentation before mechanism.* Adding mechanism because
something looks wrong, before you can measure what wrong means, is the loop that eats projects like
this one.

---

## 10. Scope explicitly out of v1

- **Petals and showy flowers.** ABC would hand the genome organ identities, which fails the emergence
  criterion. Real floral display evolved under animal pollinator selection; without a second
  co-evolving mobile lineage, expecting petals is expecting beauty without a cause. Dropped from
  scope at Greg's direction.
- **Sex and recombination.** Deferred until clonal ecology works. Subtree grafting defines an
  operation but does not guarantee semantic coherence across genomes that partitioned conditions
  differently. When it returns, wind-pollination morphology (plumes, catkins, feathery stigmas under
  selection for pollen capture) is reachable without any animal partner.
- **A second trophic level.** Not built. Tag-mediated tapping already permits parasitism and
  decomposition without a trophic variable.
- **Per-face tags, subtree duplication, GPU compute.** All v2 knobs.

---

## 11. Known failure modes

| Risk | Antidote |
|---|---|
| **Single-strategy collapse** (likeliest) | Mandatory gap dynamics via structural failure + wear backstop. P2 kill criterion |
| Fragile genotype–phenotype map | Behaviour-preserving `split`; defaults on every unmatched condition; Gate 0 measures it before anything else is built |
| Growth fuzz off every exposed cell | Potential splits on division and must be purchased. Tested, not declared |
| Tags become passwords | Tags grant affordances only; establishment decided by resource economy |
| Niche construction that nothing senses | Litter tags and litter presence are genome-readable conditions |
| Parallel adaptation mistaken for coevolution | Frozen-lineage and time-shift controls at P3 |
| Baseline never self-partitions | P4 is pass/fail *before* the pump exists. The pump would conceal this failure, not fix it |
| Compute promises outrunning evidence | Tick defined, benchmark measured, Rust port deferred until the rule card is frozen |

---

## 12. Key references

- Díaz, S. et al. (2016). The global spectrum of plant form and function. *Nature* 529: 167–171. *(Diagnostic vocabulary, not a target.)*
- Hallé, F., Oldeman, R.A.A. & Tomlinson, P.B. (1978). *Tropical Trees and Forests: An Architectural Analysis.* *(Descriptive classification, never the genome.)*
- Falster, D.S. & Westoby, M. (2003). Plant height and evolutionary games. *TREE* 18: 337–343.
- Davis, M.A., Grime, J.P. & Thompson, K. (2000). Fluctuating resources in plant communities: a general theory of invasibility. *J. Ecology* 88: 528–534.
- Schuster, P. & Fontana, W. (1994 onward). Neutral networks in RNA genotype–phenotype maps.
- Wagner, G.P. & Altenberg, L. (1996). Complex adaptations and the evolution of evolvability.
- Soros, L.B. & Stanley, K.O. (2014). Identifying necessary conditions for open-ended evolution. *ALIFE 14.*
- Plantec, E. et al. (2023). Flow-Lenia: mass conservation and parameter localization. *ALIFE 2023.*
- Randazzo, E. & Mordvintsev, A. (2023). Biomaker CA: a Biome Maker project using Cellular Automata.
- Ackley, D.H. & Cannon, D.C. (2011). Pursue robust indefinite scalability. *HotOS XIII.*
- Odling-Smee, F.J., Laland, K.N. & Feldman, M.W. (2003). *Niche Construction: The Neglected Process in Evolution.*
- Castledine, M. et al. (2020). Community coalescence.
- Moreno, M.A. & Ofria, C. (2022). DISHTINY — evolution of multicellular division of labor.
