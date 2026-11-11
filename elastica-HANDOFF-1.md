# elastica — HANDOFF 1 (design + coding plan, 2026-07-25)

**Working name:** `elastica` (placeholder — rename freely)
**Status:** design approved in prose; nothing built yet. This document is the
build spec.

A **new** project. `simplant`, `millefleur`/`evo-engine`, `chromatic circuit
ecology`, and the `lava-lamp-dplbm-wireflow` accident were inspiration only.
Do not fork them, do not port from them, do not treat their constants as
priors. Where this document borrows a mechanism it says so and restates it
from scratch. Greg's instruction was explicit: prefer a dramatically simpler,
more elegant, more emergent design over reusing imperfect pieces.

Working rules (carried over, they're good): prose design talk BEFORE code;
version by filename; small checkpoints, check in often; commit at
checkpoints; **never `git push`** (Greg pushes via GitHub Desktop). The
organism is a "plant."

---

## 1. What this is

A zero-player evolutionary ecology on a 2D lattice. Plants are **living graphs
of cells** that grow into a fixed shape, then stay flexible for life: they can
be shoved, compressed, and bent by their neighbors, and they spring back
toward the shape they actually grew into.

The one-paragraph thesis:

> A plant's body is a graph. Each edge remembers which direction its child
> belongs in, *relative to the parent's own orientation*. That memory is
> written during growth, from where the cell actually managed to land — so the
> mature shape is a record of the conditions the plant developed in, not a
> blueprint it's failing to meet. After maturity the graph never changes, but
> the body is permanently elastic: cells hop stochastically toward positions
> of lower discomfort, where discomfort is strain against the remembered shape
> plus crowding by things that aren't part of you. Crowding is also negative
> income. So the function a body relaxes down within its lifetime is the same
> function selection explores across generations, and fitness is never
> computed anywhere.

### Design values this is accountable to

Elemental, elegant, emergent, local, legible, ambient. Organisms start simple
and grow complex. One common ancestor, no imposed species lines. Fitness must
be implicit — falling out of the mechanics, never a scoring function.
Homeostasis that stays slightly unbalanced.

---

## 2. The core representation — everything is integers mod 8

This is the central design decision and the reason the whole system is small.

Directions are indices `0..7` around the king-neighborhood (0 = N, 1 = NE,
2 = E, … 7 = NW). Every cell is adjacent to its parent, so every edge's offset
is exactly one king-step — **one direction index**.

- A cell's **frame** is the direction index from its parent to itself.
  It is *derived*, never stored. The root has a fixed frame (default 0 = N).
- An edge stores one integer: **`restDir`**, the child's rest direction
  *in the parent's frame*.
- The child's rest target is therefore
  `parent.pos + UNIT[(parent.frame + edge.restDir) mod 8]`.
- **Strain** of an edge is the circular distance between the child's *actual*
  direction from its parent and its rest direction:
  `strain = min(d, 8 - d)` where `d = (actualDir - restDir + 8) mod 8`.
  An integer in `0..4`. 0 = at rest, 1 = 45° off, 2 = 90° off, 4 = reversed.

Consequences worth understanding before touching code:

**Frames compose by addition, so bending propagates for free.** Displace a
cell and its frame changes, which moves every descendant's rest target with
it, which swings the whole distal structure. No propagation pass exists —
it's a consequence of deriving the frame.

**Strain is local to the bent edge.** A bend at the base costs strain only at
that one edge; everything above re-references off the new actual geometry and
is strain-free. This is why the bodies will read as locally floppy and
globally springy, like real stems, and it's the reason not to store a global
rest pose.

**Connectivity cannot break by motion.** Both actual and rest offsets are
king-steps by construction. Enforce `MAX_STRAIN` (default **2**, matching
Greg's spec that a cell "supposed" to be up may be pushed to up-left, or in
extreme cases left, but never two cells away) as a hard rejection on any move.
Severance is therefore impossible from motion — only death can break a graph.

**No floats anywhere in the simulation core.** Positions, directions, strain,
crowding, discomfort, and energy can all be integers or fixed-point. Determinism
and reproducibility come free. Keep it that way; it is worth defending.

---

## 3. Discomfort — the one scalar

For a cell `c` evaluated at a site `s`:

```
discomfort(c, s) = W_STRAIN × Σ strain(e) over c's incident edges
                 + W_CROWD  × foreignNeighbors(s)
```

`foreignNeighbors(s)` = the number of occupied king-neighbors of `s` that are
**not `c`'s own graph neighbors** (not its parent, not its children).

That exclusion is doing a lot of work and must not be dropped:

- A plant's own parent/child cells are *supposed* to touch, so they don't
  repel and the body doesn't blow itself apart.
- A plant's own non-adjacent branches *do* repel → self-avoidance emerges,
  rather than being a hand-written rule.
- Foreign plants repel → the inter-plant gap emerges, with width set by the
  `W_STRAIN / W_CROWD` ratio, which is one knob rather than a clearance
  constant.

**Verify this against the target behavior:** an isolated plant at rest has all
strains 0 and can't lower crowding by moving, so no move lowers discomfort and
it **sits still in its natural shape**. Two plants shoved into contact have
raised crowding, so they slide apart until strain cost balances. Buffer,
legibility, self-avoidance, and springback all come from this one expression
and no others.

### Motion

Stochastic hill-descent (annealing), never a solver — the probabilistic
character is what makes it look alive:

1. For each of the 4 cardinal directions, for each parity of `(x+y)`, sweep
   the grid. A `moved` bitmask prevents any cell participating twice per tick.
   (This checkerboard-with-mask scheduler is the one genuinely load-bearing
   idea taken from the wireflow accident; it is how simultaneous local swaps
   on an exclusive lattice avoid conflicting.)
2. For a cell `c` and the neighboring site `t` in the current sweep direction:
   - If `t` is empty: `ΔD = discomfort(c,t) − discomfort(c,current)`.
   - If `t` holds cell `d`: consider the mutual swap, `ΔD` = the sum of both
     cells' changes.
3. Reject if the move would push any incident edge of `c` (or `d`) past
   `MAX_STRAIN`.
4. Otherwise move with probability `p = TEMP_TABLE[clamp(ΔD)]` — a small
   lookup table, monotone decreasing, nonzero for small positive `ΔD` so the
   system can climb out of local traps.

One plant cell per grid site, always. Swaps conserve occupancy by construction.

---

## 4. Growth, and the new mechanic: growth can shove

Growth is the **only** active forcing in the world. Everything else is
relaxation. A plant grows until it matures, then stops permanently.

### Placement

A growth site is an unbuilt child slot on an existing cell. Its target is the
rest target from §2. Attempting it:

- **Target empty** → place the cell. Cost `BUILD_COST`.
- **Target occupied** → attempt a **push cascade**. Search outward from the
  target for the nearest empty site, up to `MAX_PUSH_DEPTH`, producing a path
  along which each occupant shifts one step. Sum the strain the whole cascade
  would add. If every shift respects `MAX_STRAIN` and the plant can pay
  `BUILD_COST + PUSH_COEFF × addedStrain`, execute the entire chain
  atomically. Otherwise the attempt fails.
- **Failure** increments a counter on that site. At `SITE_ABANDON_TRIES` the
  site is **abandoned permanently**.

Pushing is the mechanic no earlier project could have had. It turns
competition from *who claimed the space first* into **who can afford to
push** — a well-lit plant displaces its neighbors, a shaded one gets crowded
out of its own footprint. Price it carefully: underpriced and everything
becomes a bulldozer and the gaps vanish; overpriced and it never happens and
this reduces to a worse version of "blocked means wait."

### Rest offsets are written at birth

When a cell is placed, its edge's `restDir` is set from **where it actually
landed**, not from what the genome asked for. The genome proposes; physics
disposes; the body remembers what happened.

This is deliberate and load-bearing. A genomic rest pose would leave a plant
that developed in a crowd carrying permanent unpayable strain, fighting a
target it can never reach. With recorded offsets it settles into its own
history. It also means two clones in different neighborhoods have genuinely
different natural shapes.

### Maturity

**Maturity is declared by the body, not by a timer or a size cap:** a plant is
mature when no growth site remains that is both unabandoned and affordable.

At maturity:
- The graph is frozen. No cells are ever added again.
- Every abandoned site is simply gone — *if a branch couldn't unfold in some
  direction, the mature plant has no branch there.* Mature morphology is
  therefore condition-dependent by construction.
- The set of recorded `restDir` values is now the plant's permanent natural
  shape, and it remains **fully elastic for the rest of its life**.
- All surplus energy goes to reproduction.

Poor or crowded plants mature small and gnarled. Well-placed ones mature into
the full expression of their genome. Mature size becomes an ecological outcome
rather than a parameter.

---

## 5. Economy

Deliberately thin. Two flows, three sinks.

- **Income**, per cell per tick, from *open* king-neighbors — i.e. the exact
  complement of the crowding term in §3. Use a small graduated table so
  exposure has diminishing returns.
- **Upkeep**, per cell per tick. Sets how hard crowding has to bite before a
  plant is in trouble.
- **Sinks:** `BUILD_COST` per cell, push cost, and `SEED_COST`.
- **Death by starvation** when the bank stays negative. Death frees the cells
  and the space.

Income and crowding must be *literally the same quantity with opposite sign*.
That identity is the elegance of the whole design — do not let them drift into
two separately-tuned tables.

Deaths are the churn that keeps the world from crystallizing (see §9). If the
ecology stagnates, the first lever is mortality rate, not more forces.

### Reproduction

Mature plants accumulate to `SEED_COST` and emit a seed. The seed takes a
bounded random walk and germinates if its landing site is **empty** — nothing
more. Do not add a clearance-radius requirement; a large empty-neighborhood
condition silently makes space-packing the dominant fitness criterion, which
is the failure mode this design exists to avoid. The crowding term already
penalizes bad neighborhoods, continuously and locally.

---

## 6. Genome

A small **L-system-ish graph grammar**, not one gene per cell. The point is
that big and repeated forms must be genetically cheap, or morphological
complexity can never pay for itself.

Suggested minimal encoding:

- A short array of **rules**, one per symbol.
- Each rule is a list of `(restDirProposal, childSymbol)` pairs — the children
  a cell of that symbol tries to produce, in its own frame.
- One integer gene `MAX_DEPTH`: the recursion budget. `A → (forward, A)`
  yields a stem of length `MAX_DEPTH` from a single rule, so size is one
  mutable number rather than a long fragile genome.

Mutation operators must be **symmetric** — every operator needs its inverse,
or genome length ratchets upward and the evolutionary signal is an artifact:

- add / remove a child from a rule
- change a child's `restDirProposal` by ±1
- change a child's target symbol
- `MAX_DEPTH` ±1
- duplicate a rule / delete a rule

Child distribution: mostly exact clones, the rest one mutation with a short
geometric tail. Clones matter — they're the backup copies of forms that work,
and they're also what makes recurring motifs visible in the field.

Start from a **single founder**; everything descends by mutation.

---

## 7. Death, severance, fragments

Motion can never sever (§2). Death can. When a plant dies, or later if
per-cell death is added, a graph may split.

For v1: whole-plant death only, so no splitting occurs. Keep the door open —
do not write code that assumes one plant has exactly one root. When
fragmentation is added, the intended rule is: **a fragment survives if it can
maintain itself**, which yields vegetative propagation without a special
reproductive exception. Detect splits lazily — mark a body `possiblySplit`,
defer relabeling until something needs component identity, and run a bounded
search from the affected cells rather than traversing on every break.

---

## 8. Build phases

Each phase ends at a committed checkpoint with a specific thing to look at.
Do not proceed past a phase whose visual check fails.

**Phase 0 — lattice, graph, renderer, and a draggable plant.**
Grid, cells, parent/child edges, `restDir`, derived frames, rendering. One
hand-built plant, no growth, no economy, no evolution. Add mouse drag that
displaces cells directly.
*Check: drag the plant sideways and let go — does it spring back to its shape?
Does bending the base swing the whole top? Does it ever come apart?*
This is the single most important checkpoint in the project. If the
springback doesn't feel right here, nothing downstream will save it.

**Phase 1 — discomfort and stochastic motion.**
Implement §3 in full: the discomfort scalar, the checkerboard sweep, the
`moved` mask, `MAX_STRAIN` rejection. Two or three hand-built plants placed
deliberately overlapping.
*Check: do they push apart into a stable gap? Is the gap width responsive to
`W_STRAIN / W_CROWD`? Assert every tick that no edge exceeds `MAX_STRAIN` and
that occupancy count is conserved — put both in the HUD as a live ✓/⚠.*

**Phase 2 — growth, push cascades, maturity.**
Fixed hand-written genome, no economy yet (infinite energy), no reproduction.
Rest offsets recorded at birth. Site abandonment and maturity declaration.
*Check: grow the same genome in open space and in a deliberately boxed-in
corner. Are the two mature forms materially different? Does the boxed one
show missing branches rather than dying?*

**Phase 3 — economy.**
Income, upkeep, build and push costs, starvation death. Still no reproduction.
*Check: does a shaded plant actually run a deficit and die? Does maturity size
respond to local crowding? Is push spending a visible, meaningful fraction of
the budget, or is pushing either free or never happening?*

**Phase 4 — seeds, mutation, evolution. Headless harness.**
Single founder, seed dispersal, germination, symmetric mutation. Add a
headless node path sharing the same core, plus the metrics in §9.
*Check: does the population persist for 200k+ ticks without either dying out
or filling solid? What do genome length and mature size do over time?*

**Phase 5 — tuning and the ratio knobs.**
Live hotkeys for `W_STRAIN`, `W_CROWD`, upkeep, push coefficient, temperature,
`MAX_STRAIN`, mortality. Every knob restarts on the same seed for controlled
comparison, and also applies live to the standing world so drought and
crowding waves can be watched rolling through.

### Technical shape

Single JS file that runs in **both** browser and node from one core (branch on
`typeof window`), plain canvas + typed arrays, no framework. Deterministic
xorshift PRNG seeded from a URL param. Simulation strictly separate from
rendering. Nothing float in the core.

---

## 9. Metrics, and what failure looks like

Instrument from Phase 4:

- plants, fill %, mean cells per mature plant, mean genome length, `MAX_DEPTH`
- **mean strain across all edges** — is the world tense or slack?
- **mean gap width** between distinct plants
- **clone shape divergence** — the headline metric. Take genomes standing in
  ≥2 copies and measure how differently they matured. Near zero means
  development is effectively deterministic and the whole conditional-morphology
  thesis has failed.
- push attempts, push successes, energy spent on pushing
- abandoned sites per mature plant
- deaths, seeds emitted, germination success rate

### Named failure modes — check for these explicitly

1. **Crystallization.** Motion stops; the field becomes an evenly-spaced static
   lattice. Pretty, dead. Deaths are the churn; if this happens, mortality is
   too low or the temperature table is too cold.
2. **Elasticity is decorative.** Mean strain sits at ~0 forever — nothing is
   ever actually deformed, and the whole design is an expensive way to draw
   static plants. Means crowding is too weak relative to growth, or plants are
   too sparse to touch.
3. **Bulldozer regime.** Pushing is underpriced; one lineage shoves everything;
   gaps vanish and legibility goes with them.
4. **Small still wins.** Everything matures at 1–3 cells because minimal forms
   reproduce fastest. This killed four rounds of an earlier project — watch for
   it from the first evolutionary run, and look at the income/upkeep ratio and
   `SEED_COST` before adding any mechanism.
5. **Space-packing takes over.** If mature size correlates with nothing but
   available room, germination or crowding is over-tuned and the ecology is
   really just a packing problem.

---

## 10. Deliberately not in v1

Shelved on purpose. Do not add any of these until the §8 phases are all
green — several exist mainly to compensate for problems this design may not
have.

- **Differentiated tissue** (leaves, flowers as distinct organs). All cells are
  the same kind of cell in v1. Add only if undifferentiated bodies turn out to
  be visually monotonous or economically flat.
- **Shedding / retreat.** Starvation kills outright in v1. Progressive die-back
  from the tips is a natural later addition and pairs well with recorded rest
  offsets (a shed cell just leaves the remembered shape).
- **Per-cell death and fragment survival** (§7).
- **Evolvable stiffness**, per plant or per segment. Floppy bodies drape into
  available space; stiff ones defend their footprint. Needs a cost or
  everything goes maximally rigid. Attractive, but it doubles the tuning
  surface — wait.
- **A driving field** (wind). Growth and death should be sufficient forcing. If
  the world proves too static after mortality tuning, a slow global field is
  the next lever.
- **Directional light / shading.** Fights the ambient, orientation-neutral feel
  and reintroduces a global coupling. Crowding already delivers locality.
- **Toroidal wrap.** v1 is bounded. Decide deliberately later; wrap removes
  edge artifacts but makes dispersal statistics harder to reason about.
- **Any scalar "fertility" or soil-memory field.** A single scalar makes every
  death universally beneficial, which is a weaker idea than it sounds. If
  environmental memory is wanted later it should be typed, not scalar.

---

## 11. First session's opening move

Build Phase 0 and stop. One hand-built plant — a stem with two side branches
is enough — plus mouse drag. Get the springback feeling right, in the browser,
with Greg watching, before writing a single line of economy, growth, or
evolution. Everything in this document depends on that one interaction being
satisfying.
