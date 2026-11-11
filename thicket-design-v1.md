# Thicket

## A from-scratch design for the emergent coevolution brief

**Version:** v1
**Date:** 2026-08-22
**Status:** design only. Nothing here has been run. No claim below is an observed result.

---

## Part I — Assessment

### 1. The evaluation of Loopgarden is correct and, if anything, generous

Its three prescriptions — productive-flow maintenance, detritus-as-geography, grammar-built flowers — are each locally right. I would not argue with any of them individually.

I would argue with the plan they add up to, because they treat the symptom. Loopgarden's problem is not that maintenance is mispriced, or that geography is missing, or that the ancestor is too scripted. Those are consequences.

### 2. The actual diagnosis: it is a one-player world

In Loopgarden, and in every prior build in this lineage, the selective environment is essentially **abiotic and stationary**. Parcels drift. Light falls. Space is finite. Organisms compete for a fixed, unchanging resource under a fixed, unchanging rule.

A stationary fitness landscape has an optimum. Evolution finds it, and then stops. Everything downstream that keeps disappointing follows directly from that one fact:

| Observed disappointment | What it actually is |
|---|---|
| "Minimal stalks dominate" / "small always wins" | The optimum was found. It is small. |
| Morphology looks scripted because the ancestor is scripted | With one pressure, there is nothing for morphology to *answer*, so the only shapes that appear are the ones you wrote |
| No turnover, world accumulates persistent bodies | Nothing has an interest in your death |
| No coevolution | Coevolution requires a coevolver |
| Environment doesn't encode history | The environment is a physics, and physics has no memory |
| No invasion dynamics | Invasion means "arrives where its enemies aren't." No enemies, no invasion |

Six of the brief's hardest requirements are one requirement. It has been missing every time.

### 3. So the conceptual breakthrough the brief asks for is unglamorous

> **Make the environment alive.**
>
> Not "add an environment with more dimensions." Replace most of the environment with other organisms, so that the fitness landscape is itself an evolving object and can never be solved.

This is Van Valen's Red Queen, stated as an engineering requirement. It is also, I think, the only known way to keep a possibility space open indefinitely without an external novelty reward — and it means the artificial bloom-novelty bonus, which was added as a deliberate patch and is the one piece of the current system that is honestly a fitness function, can be **deleted and replaced by a real mechanism**.

The rest of this document is one specific, cheap way to do that.

---

## Part II — Thicket

### 4. The whole design in one rule

Every organism carries one heritable, visible number: its **signature**, σ, a value on a circle of 256.

Some cells are **mouths**. A mouth carries a **key** — an offset δ and a width w — and each tick it may drain energy from one adjacent living cell belonging to another organism, if and only if:

```
circularDistance( σ_target , σ_self + δ )  ≤  w
```

That is the entire addition. One number per organism, two numbers per genome, one comparison.

σ does three jobs at once:

1. **who can eat you** (a mouth's key must match your signature)
2. **who you can eat** (your mouths' keys point at signatures)
3. **who you can breed with** (crossing requires σ within a compatibility window)

In speciation theory a trait that is simultaneously under divergent ecological selection and controls assortative mating is called a **magic trait**, and it is the single easiest known route to speciation with gene flow. Here it is not an assumption imported from a model — it is one integer that happens to be read by three rules.

### 5. What falls out of that one rule, for free

Each of these is a named, well-studied ecological phenomenon that is a *mathematical consequence* of specific consumption plus local dispersal. None is coded.

**Red Queen / negative frequency-dependent selection.** Common signatures accumulate matching keys. Rare signatures escape. Keys then track. Neither side ever wins. This is the matching-allele model, and it is the engine of the "orbit, not equilibrium" the brief asks for.

**Janzen–Connell, and therefore environmental memory.** A patch where lineage A grew is now full of things whose keys match A. A's own seedlings do worst exactly where A did best. This is the leading explanation for tropical forest diversity, and it gives the brief its "environment that encodes local history" — but made of *living things*, present-tense and causal, not a sediment stamp. **The environment that remembers is not the soil. It is the local population of specialists that the previous occupant fed.**

**Coexistence instead of monodominance.** The same mechanism: no lineage can hold ground against its own accumulated enemies, so no lineage takes the world. The chronic "one strategy fixes and the screen goes uniform" failure has a structural fix here, not a parameter fix.

**Emergent trophic levels.** A mouth can key onto a lineage that is itself full of mouths. Second-order consumers, hyperparasites, and cross-feeding chains are the same rule applied twice. No trophic categories exist in code.

**Barriers, autonomously.** Three kinds, none authored:
- *occupancy* — a dense stand has no germination clearance in it
- *biotic* — a band where consumers keyed to σ are dense is uncrossable by σ, and freely crossable by anything else
- *distance* — a large torus with short dispersal

And all three erode without a script: stands thin from the inside as their enemy load builds; consumer bands collapse when their host does; gaps open corridors.

**Invasion, exactly as ecologists define it.** A lineage that spent a long time in an isolated pocket carries a signature that no local key matches. It arrives, and nothing can touch it. This is the **enemy release hypothesis**, which is the standard explanation for why introduced plants become invasive. Then local keys mutate onto it, predation pressure returns, and the system finds a new dynamic balance. **The entire arc the brief describes is one comparison operator plus time.**

**Speciation you can see.** Isolated populations drift in σ. Compatibility windows split. Reproductive isolation appears as a visible color gap.

### 6. Why this also fixes Goal 3, which is the non-obvious part

Real plant morphology is largely a record of defense. Bark, thorns, tough cuticles, chemical zonation, and a great deal of architecture exist because something was eating the plant. A garden with only a light gradient has one right answer and converges on it — which is precisely what has been observed, repeatedly, for years.

With a coevolving consumer there is no right answer, and structure that costs energy — thickened tissue, protected interiors, sacrificial outer layers — can finally *pay*. **Adding the enemy is not an ecological garnish bolted onto Goal 2. It is the mechanism that unsticks Goal 3.**

And heterotrophs here remain plants. Dodder, mistletoe, broomrape, and *Rafflesia* are real, beautiful, and immediately legible on screen: pale, leafless, thread-like things winding into a host. No animals are required, no second body plan, no second renderer.

---

## Part III — The substrate

### 7. Answers to the two open questions in the brief

**"How many fundamental plant moves are there?" — five.**

```
extend      lay tissue forward
turn        change heading
fork        split into two strokes
bloom       terminate as a reproductive site
role        set this stroke's tissue role
```

Thickening is parallel strokes. Widening and narrowing are stroke-length genes. A leaf is a role, not a shape.

**"How many cell roles?" — three.**

```
LEAF    earns from open space
MOUTH   earns from an adjacent foreign cell whose signature its key matches
RIND    earns nothing; cannot be drained
```

Producer, consumer, defense. That is a complete economy in three symbols.

**"How many environmental elements are needed?" — one.**

Open space.

Light is not a field. Light income is the count of a cell's empty neighbours, so **income and crowding are literally the same quantity with opposite sign**. There is no water, no soil, no nutrient layer, no shadow raycast, no seasons. Every one of those was tried in this project and every one cost more legibility than it paid.

The rest of the environment is alive. That is the radical part of the answer, and it is the direct reply to the brief's question about environmental dimensions: *the number is one, and everything else that shapes life is other life.*

### 8. World and physics

- Toroidal square lattice. One cell per tissue cell. Large — 768×512 or more at 1–2 px, so that deep time and real spatial isolation are both affordable.
- **Space is the conserved quantity.** Occupancy is zero-sum; carrying capacity is set by geometry, not by a bookkeeping invariant. Nothing else needs conserving.
- Each tick, per living cell: earn `photo × openNeighbours` (LEAF), or `drain` from one matched foreign neighbour (MOUTH), or nothing (RIND); pay `upkeep`; then equalize a fraction α of the store with connected same-organism neighbours.
- α < 1 matters. It means gradients persist, so a severed or shaded or interior region starves locally and dies locally. **Mortality is a consequence of failed physiology, not a timer.** There is no lifespan gene and no senescence constant.
- Death frees the cell. No corpse cell type.
- A BLOOM cell that reaches seed cost emits a seed carrying a mutated genome, dispersing a genetically-set distance, germinating on empty ground with clearance.

### 9. Set the parameters by derivation, not by taste

A one-cell-thick line has ≈6 open neighbours. A two-thick slab has ≈4. A three-thick body has ≈2 in its middle layer.

```
viable(k-thick)   ⟺   upkeep < photo × openNeighbours(k)
```

So choosing `upkeep = 5 × photo` makes one-thick viable, two-thick marginal, three-thick lethal. **The 1–3 cell body-thickness aesthetic is enforced economically rather than by fiat** — the constraint is a consequence of a price, which means evolution can push against it and occasionally win, which is what you want.

For mouths, set `drain ≈ 2 × upkeep`. A mouth then pays for itself only if it has contact roughly half the time. Heterotrophy is limited by *contact*, not by efficiency — so it can never be trivially dominant, and its viability is an ecological fact rather than a tuned number.

### 10. The mutational on-ramp, which is the detail the whole thing turns on

A mouth with a random key in a world of leaves is dead weight, and will be purged before it can be tuned. That valley has to be crossed or the ecology never starts.

Encode the key **relative to self**: a mouth drains cells whose signature is near `σ_self + δ`. Initialize `δ = 0`.

Then the first mouth mutation targets *its own signature* — its clone-mates and nearby kin. With transfer efficiency 1.0, that is very nearly **selectively neutral**: energy moves within the lineage instead of leaving it. The role survives as neutral variation. δ then drifts, and the first time it lands on a neighbouring lineage's σ, it pays immediately.

Neutral on-ramp, then a sharp adaptive jump. This is the single most important implementation detail in the document, and it is one line of initialization.

### 11. Genome

```
strokes[]        up to N, each: {heading, length, endAction, role}
                 endAction ∈ {continue, fork(L,R), bloom, stop}
                 role      ∈ {LEAF, MOUTH, RIND}
signature σ      0..255, circular
keyOffset δ      0..255, circular      (relative to σ)
keyWidth  w      0..64
compatWidth c    0..64                 (σ-distance permitted for crossing)
dispersal d      1..D
```

`c` being a gene is deliberate: the sharpness of the species boundary becomes an evolved property rather than a constant. If lineages evolve their own reproductive isolation, that is a result in itself.

Mutation: point mutation on any field, plus stroke duplication and deletion, so genome length is unbounded and the possibility space stays open.

### 12. On screen

Keep the shared pixel-art palette and the flat top-down view. Map σ through a **curated, muted ramp** so the whole field reads as one tapestry rather than a rainbow.

- LEAF: the lineage's hue at mid value
- MOUTH: the same hue, pale and desaturated — parasites are pale, and this is both true and instantly legible
- RIND: darker, greyed
- Each drain event draws a single bright pixel travelling from prey cell to mouth cell

The field then reads as: coloured patches that are lineages, pale threads winding through them that are parasites, and gaps that are disturbance. That is the millefleur/Kare tapestry, arrived at by function.

Zero hidden state in the ordinary view: role is glyph, energy is brightness, lineage is hue, connectivity is adjacency. The genome is the only non-spatial state, and it is small enough to render as a strip beside a selected organism.

---

## Part IV — Making it science instead of a screensaver

The sharpest line in the Loopgarden evaluation was that its ambitions were *possibilities, not consequences*. The fix is to commit to measurements and predictions **before** running.

### 13. Instruments

1. **Occupancy ledger.** Assert no cell leaks. (A leak of exactly this kind was already found and fixed once in this project.)
2. **Mutational viability spectrum.** Automated smoke test: take the dominant genome, generate 200 single mutants, germinate each alone in a clean arena, record the fraction reaching reproduction. Run it every checkpoint. If this is a cliff, the encoding is wrong and no parameter will save it.
3. **Trophic flux split.** Fraction of total energy entering the biosphere via light vs. via mouths, over time. This one number says whether an ecology happened.
4. **Cross-infection matrix.** Sample K lineages at time *t*; for each (consumer *i*, host *j*) pair, test in a standardized arena whether *i* can drain *j*.
5. **Time-shift assay.** The gold-standard empirical test of coevolution: consumers from time *t* against hosts from *t−Δ*, *t*, and *t+Δ*.
6. **Spatial differentiation.** Moran's I on σ; an F<sub>ST</sub>-like statistic between regions; measured gene flow across candidate boundaries.
7. **Barrier lifetime distribution.** How long does a given boundary block gene flow before it erodes?
8. **Invasion log.** On each contact event: the invader's pre-contact key coverage in the receiving region, subsequent biomass turnover, and time until local keys track.
9. **Janzen–Connell test.** Seedling establishment probability vs. distance to nearest conspecific adult.
10. Lineage richness, Shannon diversity, death rate, body-size distribution, mean dispersal gene.

### 14. Six predictions, committed in advance

- **P1** Trophic flux via mouths rises from zero to a nonzero sustained fraction.
- **P2** After mouths appear, lineage richness *increases* (the Janzen–Connell signature).
- **P3** After mouths appear, the mean dispersal gene *increases* — escaping your own enemy load selects for longer dispersal. Textbook, and a crisp falsifiable test.
- **P4** Cross-infection matrices show local adaptation: strong diagonal, no universally resistant host, no universally infective consumer.
- **P5** Contact events between long-isolated regions produce biomass turnover far above baseline, and the invader's pre-contact key coverage is near zero (enemy release).
- **P6** The σ frequency distribution never stops moving; its autocorrelation time stays bounded.

**P9** is the one I would most want to see: a quantitative replication of Janzen–Connell, from scratch, in a system that was never told about it.

### 15. Kill criteria

- **P1 fails** → the on-ramp is wrong. Fix the encoding of the key, not the prices.
- **P1 holds, P2 fails** → specificity is too broad; consumers are generalists and coexistence isn't stabilized. Narrow `w`'s mutational range, or raise the cost of width.
- **P4 fails** → this is sorting, not coevolution. Say so and stop.
- **σ diversity collapses to one value and stays there** → known risk (see §16). Enlarge the world and shorten dispersal before touching mechanics.
- **Barriers never persist >100 generations** → the biogeography leg failed. Only then consider static noise-generated bedrock, and label it a fallback.

---

## Part V — Building it

### 16. Risk register, honestly

**The Red Queen may fixate rather than cycle.** This is the real one. The literature is explicit that matching-allele coevolution in a well-mixed finite population does *not* reliably maintain variation — the cycles grow in amplitude and drift wins. Three mitigations are already structural here rather than bolted on: spatial structure with short dispersal, a *continuous* signature circle with small-step mutation (so neighbouring types convert and sweeps happen sequentially), and eco-evolutionary feedback because population sizes actually fluctuate. Diagnostic: instrument 10 and P6.

**Barrier formation is the weakest leg.** Occupancy and biotic barriers are plausible but unproven. Distance-based isolation on a large torus is guaranteed, which sets a floor.

**Overloading σ may rigidify things.** If assortative mating punishes rare signatures too hard, escape from consumers becomes unaffordable and the Red Queen stalls. Making `c` a gene lets the population settle its own balance.

**Mouths may be too good.** Contact-limitation should prevent it. If not, the diagnostic is a mouth-fraction runaway and the fix is lowering `drain`, not adding a rule.

**Performance.** Active-set updates over living cells only, typed arrays, no per-cell objects, headless mode with checkpointing. At 768×512 and ~15% occupancy that is ~59k live cells; on an M2 Air in plain JS, expect low-hundreds of ticks/sec headless. A weekend gets you ~10⁷ ticks. That is enough for the timescales in the brief.

### 17. Build order

Small checkpoints, version by filename, prose before code, and a named visual check at each stop.

- **Phase 0** — lattice, strokes, one hand-built organism, income/upkeep/equalization/death. No mutation, no seeds. **Stop and look at it.** If a single organism's life and death doesn't read cleanly here, nothing downstream saves it.
- **Phase 1** — seeds, mutation, LEAF only. Establish the baseline: viability spectrum, sustained population, morphological variety. Record all instruments. This is the control arm.
- **Phase 2** — add MOUTH, σ, δ, w. **This is the decision point.** Watch P1.
- **Phase 3** — add RIND and the dispersal gene. Measure P2–P4.
- **Phase 4** — scale the world 10×, run long, add σ-gated crossing. Measure P5–P6.
- **Phase 5** — ablations. Mouths off. Key width forced maximal (all generalists). σ frozen. Dispersal frozen. Each ablation should kill exactly one predicted phenomenon; if an ablation kills nothing, the mechanism was decorative.

### 18. The cheapest decisive experiment available

Everything above is reachable from Sampler in roughly a day: add σ, add δ and w, add the MOUTH role, initialize δ = 0, delete the bloom-novelty bonus.

Then run the same seed twice — mouths on, mouths off — and compare diversity, turnover, and morphological variety.

That single afternoon answers whether this entire thesis is right, and it is available *now*.

This cuts directly against the Loopgarden plan's instruction not to inherit Sampler's biology. I think that instruction was correct for Loopgarden and wrong for the current goal. Sampler is the best-performing substrate this project has produced; the thing it lacks is not chemistry, it's an antagonist. Building a third elaborate substrate before testing that hypothesis would be the expensive way to find out.

---

## Part VI — Positioning

Prior art for the individual ingredients is substantial and should be cited honestly:

- **Flow-Lenia** — mass conservation plus parameter localization producing multi-species evolutionary dynamics in a continuous medium. Beautiful; genotypes are hidden vectors, so it fails Goal 1.
- **Biomaker CA** — evolving plantlike organisms in a nutrient/light cellular automaton. Closest existing relative on Goals 1 and 3; no coevolving antagonist.
- **Hutton's self-reproducing artificial cells** — physically embodied heredity, exemplary legibility, no morphology.
- **Chromaria (Soros & Stanley)** — the minimal-criteria framing for open-endedness: require survival and reproduction, reward nothing.
- **Geb (Channon)** — the strongest evidence that *arms races* are what passes open-endedness tests. This is the direct precedent for the central bet here.
- **Ackley's Movable Feast Machine / robust-first computing** — the engineering stance: all state local, all addressing relative, best-effort asynchronous site events rather than synchronous sweeps. Worth adopting wholesale.
- **Matching-allele coevolution, Janzen–Connell, enemy release, magic traits** — the four ecological/evolutionary theories this design is quietly a spatial simulator of.

The defensible claim is not that any single mechanism is new. It is this:

> A zero-player artificial ecosystem in which a **single visible heritable scalar** simultaneously determines edibility, appetite, and reproductive compatibility, and in which specialization, coexistence, environmental memory, speciation, and invasion are all measured consequences of that one comparison rather than separate mechanisms.

If P1 through P6 hold, that is a real result. If P9 holds — Janzen–Connell reproduced quantitatively from an ancestor that was never told about pathogens — it is a genuinely interesting one.

And if P1 fails in Phase 2, you will know within a day, which is the main reason to do it this way.
