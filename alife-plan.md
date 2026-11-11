# Design Plan — A Zero-Player World for Native vs. Invasive Dynamics

**Working title:** *the pump*
**Author:** Claude, for Greg — Aug 18 2026
**Companion document:** `alife-brief.md` (Greg's requirements, unedited)

This is a proposal. Nothing here is settled. It represents one path, not the only one.

---

## 0. One-paragraph summary

A 2D lattice world with strict conservation of matter and water, light arriving from above, and
sugar as the only dissipating currency. Plants are not agents — every plant cell runs the same
readable rule table, and growth, transport and death are all local. Dead tissue returns to soil at a
rate set by how dense it was, so the ground accumulates a causal record of what grew there. One very
slow oscillation in water supply drives cycles of fragmentation and reconnection: vegetation itself
forms the barriers, disturbance opens the corridors. Lineages diverge in refugia and then collide,
with no player involved. Success is measured, not eyeballed.

---

## 1. Verdict on prior art

Every ingredient exists. The combination does not, and nobody has used it to answer a question.

| Work | Contributes | Missing |
|---|---|---|
| **Biomaker CA** (Randazzo & Mordvintsev 2023) | Plant-like organisms growing from seeds in a nutrient-starved 2D CA; GPU/JAX; reproduction with variation | Neural CA cell logic (illegible); headline results lean on outer-loop meta-evolution; no isolation |
| **Flow-Lenia** (Plantec et al. 2023) | Mass conservation localizes patterns, permits multi-species worlds, and *is itself* a selective pressure; rule parameters embedded locally | Continuous and blobby; no morphology, no environmental memory |
| **FSPM evolution** (Bornhofen & Lattaud) | Evolving L-system plants sorted into Grime's C/S/R strategies matching field data | Heavy 3D physiology; illegible; no conservation, no soil memory, no invasion |
| **Movable Feast Machine** (Ackley) | The architectural constitution: all-local, relative addressing, no global state, indefinitely scalable, best-effort | Not biology |
| **Niche construction ALife** (Chiba, Suzuki & Arita) | Ecological inheritance of built structures affects evolutionary diversity | Nest-building / predator–prey, not soil; not plants |

**The gap:** nobody has stacked (1) a human-readable evolvable genome inside a morphogenetic CA,
(2) an environment that accumulates what grew in it and feeds it back, and (3) endogenous
isolation → secondary contact running inside 1+2.

---

## 2. Three answers the botany literature already provides

**How many plant modules are there?** Fewer than intuition suggests.

- **Díaz et al. 2016 (*Nature*)** measured six traits across ~46,000 vascular plant species — height,
  stem specific density, leaf area, leaf mass per area, leaf nitrogen, seed mass. Three-quarters of
  all variation lies in a **two-dimensional plane**: a size axis, and a leaf-economics axis balancing
  construction cost against growth potential. Two axes is the design spec.
- **Hallé & Oldeman** generate all tree architecture from four switches — rhythmic vs. continuous
  growth; branching pattern; orthotropic vs. plagiotropic axes; terminal vs. lateral sexuality. The
  combinatorial space is large; **only 23 models occur in nature.** Exactly the "small discrete set of
  essential moves, sparsely occupied huge space" intuition.
- **ABC model** (Coen & Meyerowitz 1991): three gene classes specify four organ identities
  combinatorially — A → sepal, A+B → petal, B+C → stamen, C → carpel. **Do not build a flower organ.**
  Build a modified-leaf primitive plus a 3-bit identity code, and flowers become a consequence.

**How many environment elements?** Exactly enough to make the two Díaz axes *costly*:

| Element | Role | Conserved? |
|---|---|---|
| Matter | What tissue and soil are made of | Yes, strictly |
| Water | Drawn from below; drives the slow cycle | Yes, strictly |
| Light | Arrives from above, occluded by tissue | No — the only free lunch |
| Sugar | Light + water → sugar; spent on building, maintenance, genome | No — dissipates as heat |
| Clock | Fast (day), slow (season), very slow (the pump) | — |

Heat, pressure, velocity and acceleration are not needed as separate elements — they are either
consequences of the above or decoration. Attraction/repulsion is what conduits and structural support
already do.

---

## 3. Sharpening the card-shuffle intuition

The intuition is right about scale and wrong about which quantity matters. 52! is enormous but a deck
is not evolvable — no gradient, no neutrality, no modularity.

What governs whether evolution finds anything is not the size of genome space but the **connectivity
of the viable set under single mutations**. In RNA folding, sequence space turns out to be *percolated*
by neutral networks — large sets of sequences folding to the same structure, connected by point
mutations — and abundant phenotypes are more mutationally robust, which prevents those networks from
fragmenting and keeps the space navigable.

**Design consequence:** the target is high redundancy, most single mutations neutral or tiny, and a few
that add capacity. A genome in which one mutation flips short grass into an arching form has a
*fragmented* viable set. That is a representation failure, not a tuning failure.

---

## 4. The spine

### 4.1 No agents

Every plant cell runs the same genome. Growth is a cell filling a neighbour. Transport is local
diffusion through living tissue. No tip agent carrying hidden state; no global flow solve.

This deletes the bud-agent's failure modes rather than patching them: no hidden state to track, no
non-local machinery, no illegible fast-mover. It is also how plants actually work.

### 4.2 Two conserved pools, one flux, one dissipation

Matter and water are conserved to the bit. Light arrives from above and is strictly occluded — taller
tissue shades shorter tissue and never the reverse. Sugar is manufactured from light + water, spent,
and exits the world as heat.

**Conservation is what replaces the fitness function.** Competition, carrying capacity, boom–bust
oscillation and Lotka–Volterra-shaped dynamics all fall out of the accounting. Nothing is scored.

### 4.3 Genome = an adaptive-resolution rule table, priced in sugar

A cell reads a few coarse local buckets — light above, water below, crowding, structural support, own
reserve — and looks up what to become and where to build. The table renders as a small grid of glyphs:
you can *read* a plant's genome.

Three mutation operators:

- **Change** an entry — usually neutral or small (this is where the neutral network lives)
- **Split** a bucket into two — adds a discrimination, adds capacity
- **Merge** two buckets — simplifies

Table size costs sugar per tick. So genome complexity is under natural selection in the same currency
as everything else. This satisfies Soros & Stanley's fourth condition for open-ended evolution —
phenotypic complexity must not be bounded by the representation — without granting an unbounded free
lunch. **This is candidate breakthrough #1.** I could not find it in the ALife plant literature.

### 4.4 Soil memory from one rule: decay rate ∝ tissue density

Dead tissue returns its matter and water to the soil — slowly if it was dense, fast if it was thin.
Litter versus wood emerges from one number. A plant that builds slow tissue leaves a *different soil*
for its descendants than one that builds fast tissue.

This is not decorative. Plant–soil feedback is a leading real mechanism in invasion biology: invaders
condition soil in ways that favour further invaders rather than natives (the "invasional meltdown"
pattern). "The environment encodes history" becomes one line of code, causal and present-tense —
never a sediment stamp.

### 4.5 The pump replaces the gate

There is no user control. What drives isolation and contact is **one very slow oscillation in total
water supply.**

- **Wet phase** → water bodies swell, canopies close, populations fragment into refugia
- **Dry phase** → water retreats, disturbance rises, corridors open, lineages collide

This is the Pleistocene **species pump**: cyclic climatic oscillation periodically changes which
habitat is suitable, driving repeated cycles of expansion and contraction with isolation and secondary
contact. It is the mechanism behind most of the temperate world's flora, and it is *contested* — a
genome-wide study of 18 European butterfly sister-species pairs found most divergences predate the
Pleistocene entirely, arguing the pump refines rather than initiates divergence. Contested is good: it
means the world is modelling a live question. Cattails show the full arc in a plant — allopatric
divergence during climate-driven bottlenecks, then secondary contact, then a regionally invasive
hybrid.

One sine wave. Forever. No player.

### 4.6 Where barriers come from, with no designer

Three sources, cheapest first:

1. **The vegetation is the barrier.** Costs nothing new. Seeds disperse short distances; a closed dense
   canopy kills what lands beneath it. A band of forest is an ocean to a meadow forb. If pollen is a
   particle that living tissue absorbs, the same band blocks gene flow too — **one structure, both
   isolation channels.**
2. **Disturbance is the bridge-builder.** Already required (see §8.1). A fire or windthrow punching a
   corridor through a barrier band *is* the land bridge. Same mechanism, second job.
3. **Water is the slow geography.** Conserved water pools and dries; lakes drown corridors, drought
   exposes them. And because plants draw on the same pool, a forest that transpires hard can lower the
   water table and open its own bridge — niche construction that makes and unmakes its own barriers.

### 4.7 Sex, at the lowest legibility cost — staged in at P4

- **Haploid, not diploid.** No dominance, no heterozygosity, no hidden alleles.
- **Entry-wise recombination.** A child takes each genome entry from one parent or the other. The
  child's genome grid can then be **tinted by parent-of-origin** — you see the mosaic directly, and you
  see which clashing entries killed a hybrid. Dobzhansky–Muller incompatibilities become visible
  objects rather than a statistic.
- **Pollination is a visible event** — a brief arc drawn between two flowering plants at the moment it
  happens.
- **Flowering time is the isolating trait**, already in the genome. Divergent climates evolve divergent
  phenology; after contact, pollen simply doesn't co-occur. Reproductive isolation is emergent and
  prezygotic, never tagged.

*Honest risk:* gene flow can erase local adaptation. Pollen crossing a barrier defeats it even when
seeds cannot. Mitigated by short pollen range and tissue absorption — but it is a real failure mode,
which is why the world runs **clonal through P0–P3** and only adds sex when isolation is the point.

### 4.8 The neutral lineage dye

One inherited marker that nothing selects on. Colours the invasion front so it can be watched. Zero
mechanism cost, large legibility gain.

---

## 5. The real dial: a ratio of three timescales

The whole project reduces to arithmetic on three quantities:

- **τ_gen** — generation time
- **τ_barrier** — how long a barrier persists
- **τ_contact** — interval between reconnection events

Divergence requires **τ_barrier / τ_gen ≫ 1** — many generations of isolation. Interesting dynamics
require τ_contact rare but finite. Too short → one panmictic soup. Too long → stagnant independent
islands. There is a narrow window.

**These are measured, not set.** τ_gen can be read directly; τ_barrier and τ_contact are emergent. The
oscillation period is the single knob, tuned until the ratios land in the window. This is a far better
instrument than a gate slider, because it explains *why* a run is boring.

---

## 6. Measures, and the assay

### 6.1 Five measures

1. **Divergence depth** — trait and genome distance between the most-separated lineages over time.
   Should climb, not plateau.
2. **Isolation duration** — generations a lineage pair goes without gene flow. This is τ_barrier/τ_gen,
   measured rather than assumed.
3. **Trait-space occupancy** — every living plant plotted on size × tissue-economics. Does the cloud
   concentrate into a low-dimensional band the way Earth's does? *This is the single best test of
   whether we built a plant world or a pixel world.*
4. **Post-contact turnover and recovery** — when lineages naturally meet, what fraction of the resident
   community is replaced, and how long until diversity recovers? Homeostasis-then-outrun-it, quantified.
5. **The slack test** — measure unused resources per region before natural contact, then check whether
   it predicts who invades.

Measure 3 is **pass/fail** at the P3 checkpoint. The rest are diagnostics.

### 6.2 The assay (the gate, relocated)

The forced separate-and-reintroduce is not a feature — it is a **test instrument**. Take a checkpoint
at time *T*, clone the world offline, transplant lineage A's seeds into region B, and measure what
happens, while the main run continues untouched. The gate moves from the UI to the lab bench.

### 6.3 The falsifiable target

Davis, Grime & Thompson (2000) is the dominant theory of invasibility — a community becomes more
susceptible to invasion whenever unused resources increase — with 4,000+ citations and mixed field
support (a New Zealand tussock experiment found invasion did *not* accelerate under resource pulses).

**Prediction to state in advance:** invasion success is predicted by the *recipient's* resource slack,
not the *donor's* traits.

Under strict conservation, slack is computable exactly, which no field plot allows. Confirm it and this
is an ALife system that produced a real ecological result. Falsify it and it has found a boundary
condition on a major theory. Either way it is a result — and it gives the project the thing every
previous attempt lacked: **a definition of done.** "Beautiful and evolving" has no stopping condition,
which is why every version of such a project is simultaneously a success and a failure.
**This is candidate breakthrough #2.**

---

## 7. Compute budget and architecture

Target hardware: **M2 MacBook Air, weekend run.** Fanless, so sustained throughput matters more than
peak — assume thermal throttling on any 48-hour job.

### 7.1 The budget

| Quantity | Target | Notes |
|---|---|---|
| Lattice | 1024 × 512 = 524,288 cells | Big enough for multiple refugia |
| Cell state | ≤ 6 bytes (4B physics + 2B genome index) | ~3 MB world; two buffers fit in cache-friendly memory |
| Genome pool | ~10⁴ live genomes × ~256 B | ~2.5 MB, separate arena, generational indices |
| Throughput | ≥ 1,000 ticks/sec sustained | Achievable single-threaded native; 4-core gets ~3–5× |
| Weekend (48 h) | ~1.7 × 10⁸ ticks | |
| Generation | ~2 × 10³ ticks | → **~85,000 generations** |
| Pump period | ~3 × 10⁶ ticks | → **~55 isolation/contact cycles** |

For scale: Lenski's Long-Term Evolution Experiment has run ~80,000 generations since 1988. A weekend
on a laptop buys comparable depth. **The numbers work.**

The hard cell-state budget is not an optimization — it is the legibility discipline. If a cell's entire
state fits in a glyph the eye can read, there is no hidden state to hide in.

### 7.2 Architecture

- **Language:** Rust. One deterministic core compiled twice — native for weekend runs, WASM for a
  single-file HTML viewer. Preserves the ability to watch it on a phone without capping throughput.
- **Engine and theatre are separate.** Headless engine runs at speed and writes snapshots; the viewer
  replays them with a scrubbable timeline and per-cell "why did this fire." **Legibility lives in the
  inspectable replay, not in watching at 60fps.** This dissolves the fast-vs-legible tension.
- **Determinism is worth more than speed.** Seeded PRNG, fixed stream, replayable to the tick. Optimize
  only when P3 tuning demands it.
- **Update order: tile-local asynchronous.** Fully synchronous double-buffered updates make exact
  conservation awkward (two cells claim the same water packet) and produce lockstep pulsing that reads
  as artificial. Fully random site selection destroys cache locality. **Randomized order within tiles**
  gives near-async semantics, exact conservation (one cell acts at a time and *moves* things), Ackley's
  event-window idiom, and cache-friendly access — while staying deterministic under a seeded stream.
- **Alternative if throughput becomes binding:** Metal/WebGPU compute, with pull-only semantics (a cell
  only ever moves things *into* itself, with a deterministic rotating priority) to keep conservation
  exact under synchronous update. Roughly 5–10× faster; considerably harder to debug. Not phase 1.

---

## 8. Phased plan, with kill criteria

**P0 — Physics, no life.** One region, two conserved pools, light, clocks.
*Check:* totals bit-exact over 10⁶ ticks; the water cycle is watchable and comprehensible.
*Kill if:* you can't read it.

**P1 — One hand-written genome, no mutation.**
*Check:* a plant grows, transports, senesces, returns matter to soil, and the soil where it stood is
visibly different afterwards.
*Kill if:* it needs any non-local machinery to work.

**P2 — Mutation and selection, one region, clonal.**
*Check A:* do height and tissue density diverge into more than one *coexisting* strategy?
*Check B:* does a **spatial mosaic** form — patches of different strategy — or does one strategy tile
the world? Mosaic is the prerequisite for everything downstream.
*Kill if:* still collapsing after tuning disturbance frequency. The substrate is wrong; stop.

**P3 — Instrumentation, then the pump. Highest-risk phase.**
Build measures 1–3 *before* adding mechanism. Then add the slow oscillation and tune its period until
the three timescales land in the window.
*Pass/fail:* measure 3 — does trait space concentrate into a low-dimensional band?

**P4 — Sex and the assay harness.** Haploid, entry-wise, visible pollination.
*Check:* does phenology diverge between regions on its own, and does it produce assortative mating
without being told to?

**P5 — Run it long, and look at what the pump produced.** Measures 4 and 5. The falsifiable target.

**Ordering principle:** *instrumentation before mechanism.* Adding mechanism because something *looks*
wrong, before you can measure what wrong means, is the loop that eats projects like this one.

---

## 9. Known failure modes and antidotes

### 9.1 Single-strategy collapse ("green mat", "small always wins") — the likeliest killer

Falster & Westoby reviewed the game theory of plant height: **of fourteen models, only one predicts a
mixed height strategy coexisting**, though mixtures are a conspicuous feature of real vegetation.
Because taller plants capture disproportionate light relative to their biomass — size-asymmetric
competition — height races collapse to a single winner unless something reopens gaps.

**Antidote:** a disturbance regime creating patches. Its frequency becomes the main dial giving each
region its character. This is not optional, and it is probably the diagnosis of every previous stall.

### 9.2 Fragile genotype–phenotype map

**Antidote:** defaults for every unmatched condition; redundant encodings; split/merge operators; a
mutation spectrum where the overwhelming majority of changes are neutral or small. Verify empirically:
sample 1,000 single mutants of a healthy genome and plot the phenotype-distance distribution. It should
be heavily zero-weighted.

### 9.3 Too slow to reach eons

**Antidote:** §7 — separate engine from theatre; deterministic replay; hard state budget.

### 9.4 Gene flow erases local adaptation

**Antidote:** short pollen range; tissue absorbs pollen; sex deferred to P4 so its cost is observable
against a clonal baseline.

### 9.5 The pump never finds its window

**Antidote:** measure τ_barrier and τ_contact from P3 onward rather than guessing. If no oscillation
period produces the window, the barrier mechanism (§4.6) is too weak — escalate from vegetation-only
to water geography before abandoning.

---

## 10. Decisions not yet made

- Abiotic heterogeneity: one smooth global gradient (e.g. water input falling along one axis) versus
  fully endogenous heterogeneity from soil alone. A single smooth gradient is honest — Earth has a
  latitudinal one — and it is one line of code, but it is designer input.
- Whether roots and shoots are the same rule table read in two orientations, or two tables.
- Whether seeds are conserved matter (they should be) and how dispersal distance is genetically
  encoded.
- Disturbance form: fire (removes tissue, returns matter fast) versus windthrow (fells tissue, which
  then decays normally). Fire is simpler; windthrow is more legible.
- Whether a second trophic level is ever needed, or whether plant–plant + plant–soil coevolution
  suffices. Default: not needed, and not built.

---

## 11. Key references

- Díaz, S. et al. (2016). The global spectrum of plant form and function. *Nature* 529: 167–171.
- Hallé, F., Oldeman, R.A.A. & Tomlinson, P.B. (1978). *Tropical Trees and Forests: An Architectural Analysis.*
- Coen, E. & Meyerowitz, E. (1991). The war of the whorls — the ABC model of floral development.
- Falster, D.S. & Westoby, M. (2003). Plant height and evolutionary games. *TREE* 18: 337–343.
- Davis, M.A., Grime, J.P. & Thompson, K. (2000). Fluctuating resources in plant communities: a general theory of invasibility. *J. Ecology* 88: 528–534.
- Schuster, P. & Fontana, W. (1994 onward). Neutral networks in RNA genotype–phenotype maps.
- Soros, L.B. & Stanley, K.O. (2014). Identifying necessary conditions for open-ended evolution through the artificial life world of Chromaria. *ALIFE 14.*
- Plantec, E. et al. (2023). Flow-Lenia: mass conservation and parameter localization. *ALIFE 2023.*
- Randazzo, E. & Mordvintsev, A. (2023). Biomaker CA: a Biome Maker project using Cellular Automata.
- Ackley, D.H. & Cannon, D.C. (2011). Pursue robust indefinite scalability. *HotOS XIII.*
- Odling-Smee, F.J., Laland, K.N. & Feldman, M.W. (2003). *Niche Construction: The Neglected Process in Evolution.*
- Haffer, J. (1969) and successors — the Pleistocene species pump.
- Bornhofen, S. & Lattaud, C. — evolution of CSR life-history strategies in virtual plant communities.
