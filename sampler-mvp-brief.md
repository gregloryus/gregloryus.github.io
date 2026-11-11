# SAMPLER

## MVP Brief — aesthetic-first coevolutionary plant ecology

*Working title. A sampler is an embroidered practice cloth of flowers and letters, worked on a grid — cross-stitch is pixel art on fabric. Change it freely.*

---

## 1. The bet

Three coequal goals carry over unchanged from the requirements brief:

1. **Legibility** — simple local rules, few or no hidden states, followable moment by moment.
2. **Evolution** — real selection, one common ancestor, coevolution, environmental history, eventual invasion dynamics.
3. **Biophilic form** — functional, varied, recognizably plantlike structures that are not hard-coded.

What changes this time is the method. Previous attempts left form free and hoped natural shapes would emerge from cell-level rules; they produced staircase fuzz. This attempt **constrains the drawing grammar as hard as a pixel artist would** and lets natural form emerge from those formal limits.

The diagnosis behind it: every prior build let the genome place one cell at a time. On a lattice that yields fuzz, because there is no unit of intention larger than a pixel. No pixel artist draws that way. Kare made Chicago legible by restricting herself to horizontals, verticals, and 45-degree angles — she drew *strokes*.

---

## 2. The aesthetic constitution

These are hard rules. Where a rule and a feature conflict, the rule wins.

1. **Strokes, not cells.** The smallest thing that can grow is a whole mark. Fuzz becomes structurally impossible.
2. **Eight directions only.** Horizontals, verticals, 45s. A stroke holds its direction for its whole length.
3. **Bodies 1–3 cells thick.** Hard cap, but the economy is the real enforcer (§4).
4. **One shared palette.** ~16 fixed colors. Genetic drift must be legible from **morphology, not color**.
5. **Clear negative space.** Every plant reads as its own silhouette against the ground.
6. **Rim light is metabolism.** The lit edge of a body is exactly the set of cells earning income.
7. **Dark ground, bright figures.** High figure-ground contrast.
8. **Nothing hidden.** Every causally relevant thing is a visible pixel. No moisture fields, no soil chemistry, no ownership graphs, no scores.

---

## 3. The world

A flattened top-down view. **The entire canvas is ground.** Lower on screen reads as nearer the viewer; relative sizes never change, as though shot through a long lens from far away. Screen-y does double duty as both ground-depth and plant-height — the medieval tapestry convention, which the eye accepts without complaint.

A seed lands touching open ground. The plant then grows *up out of the ground plane*, so cells beside it are empty air relative to the plant and empty ground relative to the seed. Operationally: an empty neighbor is an open face.

Edges are open. No wrapping.

**Cell types** — the complete list:

| Cell | Meaning |
|---|---|
| `OPEN` | ground / air |
| `LIVE` | living plant tissue |
| `DEAD` | litter — still occupies space, earns nothing |
| `WATER` | free water on the ground |
| `VAPOR` | drifting moisture |
| `SEED` | dispersing or dormant propagule |

Plus two transient in-body packets: `WATER_PACKET` (blue) and `ENERGY_PACKET` (gold).

**Gravity acts on water only.** Water tries down, then down-left / down-right, falling-sand style. So the lower canvas is wet and the upper is dry, and that single gradient produces real habitat difference with zero invisible state. Rain cycles seasonally to replenish.

There is no underground, no soil layer, no nutrients. Dead soil is soil.

---

## 4. The economy

A cell's income is **the number of its four faces touching `OPEN`**. Upkeep is 1 per cell per tick.

| Position | Open faces | Net |
|---|---|---|
| Tip of a 1-thick stroke | 3 | **+2** |
| Middle of a 1-thick stroke | 2 | **+1** |
| Cell in a 2-thick stroke | 1 | **0** |
| Middle of a 3-thick mass | 0 | **−1** |

The thinness rule therefore does not need enforcing — it is paid for. Three-thick survives only where the mass buys something, like a bloom or a seed store. The hard cap stays as insurance.

This also means **crowding and income are the same number with opposite sign**. A neighbor growing flush against you does not trigger a shading calculation; it takes one of your faces. That single fact is the whole competition model.

**Water is contact-only.** A `LIVE` cell orthogonally adjacent to a `WATER` cell may absorb it. Nothing drinks at a distance. This is what forces plants to send reaching strokes toward moisture — a root, without our ever naming one.

**Senescence.** Upkeep is multiplied by a slowly rising factor with plant age, so every plant eventually starves. No age timer, no size cap; death stays economic.

---

## 5. The metabolism loop

Fully visible, matter conserved:

1. A cell touching `WATER` absorbs it → a **blue packet** enters the body and climbs toward the tips.
2. At a cell with open faces, water + light → energy. A **gold packet** descends to the seed. A **white vapor** mote is released.
3. Vapor random-walks, then condenses into a falling `WATER` cell.

Blue up, gold down, white away — a circulatory system you can follow with your eye. Humid microclimates fall out free: a dense stand respires more, so more vapor condenses nearby, so that patch stays wet. Real niche construction, no hidden field.

*If it reads as too busy in practice, the gold return-packet is the first thing to cut; energy can credit the seed silently.*

---

## 6. The plant

### Marks

Two, and two only:

- **`STROKE(dir, length, profile)`** — `dir` is one of 8; `length` 2–7; `profile` is flat (1 cell) or swelling (1→3→1). Covers stems, grass blades, leaves, roots, runners, spines.
- **`MASS(index)`** — fills the Moore ring outward in stages, capped at 3×3. Covers flower heads, seed capsules, thickened nodes.

Checked against every reference image: the seaweed is chained short flat strokes; a grass tuft is one node with three stroke children; a violet's leaves are swelling strokes; its flower is a `MASS` with a contrasting center; a basal rosette is one node with six swelling strokes.

**This is not hard-coding organs.** A stroke is a mark, not a meaning. Whether one functions as a leaf, a root, a petal spine, or a runner depends on where it goes and whether it pays for itself. Organ names remain things we say about the output.

### Genome

A tree of marks (the structure simplant used, one level up in granularity). Each node holds a mark plus its children.

**Frame:** the seed's first stroke goes **up**; every stroke after is relative to its parent's direction. Without that anchor plants sprawl radially and stop reading as standing. Downward and sideways strokes remain fully legal and are where reaching-for-water happens.

**Growth:** one mark at a time, paid for in energy, placed only if every cell of it fits — no overlap with anything, and no cell landing in the Moore neighborhood of a foreign plant. That second condition is what guarantees readable silhouettes; it is also a hard version of a pressure the economy already applies softly, so it carries a toggle for later experiment.

**Maturity** is declared by the body: no affordable unplaced mark remains.

### Mutation

Per child, probability ≈ 0.35 of exactly one edit, with a small chance of two. Operators:

| Operator | Effect |
|---|---|
| `perturb` | change one field of one mark (dir ±1, length ±1, profile, kind) |
| `graft` | duplicate a subtree onto a free child slot |
| `prune` | delete a subtree |

`graft` is the important one — it is gene duplication followed by divergence, so complexity grows by differentiating modules that already work rather than by insertion into a sequence where one edit shifts everything downstream.

---

## 7. Life cycle

Germinate on open ground with clear space → grow marks while energy allows → at maturity convert income into seeds → seeds random-walk a short distance and settle → senescence raises upkeep until the plant cannot pay → whole plant turns `DEAD` (desaturated) → litter persists, still blocking light and growth → slow decay back to `OPEN`.

**Litter is the environmental memory.** Not chemistry — geometry. A place where something large grew holds a fading skeleton the next generation must grow around. That is more literally a palimpsest than stained soil ever was, and it needs no new state, no new color, and no new rule.

*Whole-plant death for MVP. Per-branch death (self-pruning of shaded limbs) is a natural extension and would look better; it needs per-cell energy accounting rather than per-plant.*

---

## 8. Genetics

**MVP: clonal.** One parent, one mutated copy. Maximally legible; lineages traceable by eye.

**Built sex-ready.** All reproduction routes through a single `reproduce(parentGenomes[])` that always receives length 1 in MVP. The subtree-crossover operator is written and unit-tested but not wired up.

The reasoning for that ordering: if the genotype–phenotype map is poor, sex will not rescue it; if it is good, we will want sex almost immediately, and it is then a patch rather than a rewrite.

---

## 9. Deliberately absent

No continuous coordinates. No bezier curves, gradients, or anti-aliasing. No per-lineage color hash. No soil chemistry, humus, or nutrient fields. No species, predator, prey, parasite, root, leaf, or flower categories in the physics. No fitness function, novelty score, or beauty score. No lineage ID that grants any permission. No global planner. No user-triggered events.

---

## 10. Build order and the checks that decide it

**Phase 0 — the whole bet, cheaply.** Grid, palette, `ImageData` renderer, one hand-authored genome, one plant grown from it, rim-light shading.

> **Visual check A:** does a single hand-built plant read as a legible tapestry figure? If it does not look like the reference images here, stop and fix the grammar. Nothing downstream saves this.

**Phase 1 — the field.** Water, gravity, rain, the metabolism loop, forty clones of one ancestor.

> **Visual check B:** does the field read like the tapestry ground — distinct figures, clear negative space, visible circulation?

**Phase 2 — evolution.** Seeds, mutation, death, litter, fast-forward controls.

> **Visual check C:** after a long run, are there visibly distinct morphologies descended from the one ancestor, distinguishable by silhouette alone?

Each phase ends at a committed checkpoint. Prose before code at each one.

**Technical shape:** single self-contained HTML file. Plain canvas, one `Uint32Array` framebuffer written directly and blitted per frame — no sprite objects, so 1px-per-cell scales fine. Typed arrays for the grid, seeded deterministic PRNG, an active list of only cells that can act rather than a full-grid scan. Defaults: 4px per cell, fill window. URL params `?px= &w= &h= &seed=`.

---

## 11. Extension path

**1. The pollinator field.** Bloom color gains a reproductive advantage proportional to its hue distance from nearby blooms, distance-weighted so sharp difference from close neighbors pays most; radius potentially half the canvas or more. This is the abstracted effect of a pollinator we decline to model, rather than a score on the organism — a physics of the world. Implementation note: maintain a coarse block-grid of running hue sums updated on bloom birth and death, blurred, sampled O(1) per bloom. Do not compute it naively per bloom per tick.

**2. Pollen and real mating.** A mature bloom emits pollen motes on a short random walk; a mote landing on another plant's bloom makes that bloom's next seed a recombinant. Isolation-by-distance falls out automatically. An isolated plant self-fertilizes, so nothing dies for want of a mate.

**3. Color as mate compatibility.** Pollen only takes on a bloom within some hue distance. Spatial separation then produces genetic incompatibility, which is what makes a later encounter read as two species meeting rather than one lineage displacing another.

**4. Terrain and invasion.** Ridges and basins deepen the wet/dry gradient into genuinely separated habitats. A dry band few can cross is a barrier; a wet season that floods it is a bridge. Both arise from the water physics already present — no scripted event, no user gate.

**5. Per-branch death**, giving self-pruning of shaded limbs.
