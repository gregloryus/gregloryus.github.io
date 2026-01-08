# Project Ideas: Orthogonal Approaches for Tapestry-Style Plant Evolution

*Generated: January 6, 2026*

Based on the PROJECT-CATALOG.md and overarching artistic goals, here are **3 orthogonal approaches** that are each simple, scalable, and distinct from existing work:

---

## 1. PULSE GARDENS (Temporal Phase Competition)

**Core idea:** Competition happens in *time*, not just space.

- Each plant cell has a **pulse period** (inherited, mutable) — e.g., fires every 7 ticks
- Cells are ON or OFF based on `tick % period`
- When two adjacent cells from *different* plants are ON simultaneously → lower-fitness one dies
- Crown shyness emerges *temporally*: plants with similar periods sync up and kill each other; stable mosaics require relatively-prime rhythms

**Minimal state per cell:** `{period, phase, plantId}`

**Why it's orthogonal:** Existing work is spatially competitive. This makes *timing* the selection pressure. Plants that "get out of each other's way in time" coexist.

**Visual:** Flickering tapestry where lineages pulse together (similar periods = related). You can *see* the rhythms.

**Environment shaping:** Dead cells leave "phase ghosts" that decay over N ticks, creating temporal interference zones that influence where new growth can safely land.

---

## 2. GRADIENT WELLS (Conserved Field Depletion)

**Core idea:** Space itself is a conserved resource pool that plants drain.

- Single `Uint8` field (0-255) with constant inflow at edges
- Plants are **wells** — fixed points that pull field toward themselves via diffusion
- Growth: when accumulated mass > threshold, spawn new well in direction of highest gradient
- Death: if neighborhood stays depleted too long, well dies (releases mass back)
- Crown shyness emerges naturally from depletion zones

**Minimal state:** One field array + well positions with `{strength, spawnThreshold, plantId}`

**Why it's orthogonal:** Prior work treats resources as discrete packets flowing through plant structures. This inverts it: the *field* is primary, plants are just holes in it. No OOP particle tracking needed.

**Visual:** See "hunger halos" around each plant — rich zones glow, depleted zones dim. History is visible as terrain.

**Scalability:** Just diffusion + threshold checks. Trivially parallelizable. Could hit 10k×10k.

---

## 3. TAG-ANTITAG (Self-Recognition Death)

**Core idea:** Plants emit their own *kryptonite*. Identity is destiny.

- Each plant has a **tag** (8-bit string, inherited with bit-flip mutations)
- Plants emit **antitag** (complement) which diffuses outward
- If a cell is exposed to antitag matching its own tag → dies
- If exposed to *non-matching* antitag → thrives (can grow there)

**Key insight:** You can grow near *different* plants but not near *yourself*. Crown shyness is automatic self-incompatibility.

**Minimal state:** Tag per plant, diffusing antitag field (or simpler: just neighbor-tag checks)

**Why it's orthogonal:** Existing crown shyness is geometric (Moore neighborhood empty). This is *identity-based* — two plants with similar tags can't coexist even if spatially separated once their antitag fields overlap. Divergent tags are selected for.

**Visual:** Color = tag. Related plants (similar tags) have similar colors. You see families avoiding each other by color.

**Environment shaping:** Antitag persists after death, creating "no-go zones" for that lineage. Different lineages can colonize the dead zones.

---

## Comparison Matrix

| Approach | Competition Axis | Crown Shyness Via | Lineage Signal | Simplest State |
|----------|-----------------|-------------------|----------------|----------------|
| Pulse Gardens | Time (phase) | Rhythm interference | Pulse period | period, phase per cell |
| Gradient Wells | Resource (field) | Depletion zones | Well parameters | single Uint8 field |
| Tag-Antitag | Identity (bits) | Self-recognition | Tag similarity → color | 8 bits per plant |

All three produce crowded-but-non-overlapping tapestries through different mechanisms. **Gradient Wells** is probably the most immediately scalable; **Pulse Gardens** is the most visually novel; **Tag-Antitag** creates the most explicit "family drama" as lineages diverge and can recolonize each other's graves.

---

## 4. RGBFIELDS EVOLUTION (Triple-Bit Genetics in Field CA)

**Current state (rgbfields-13):** Sophisticated R/W physics with G layer that shapes resource flow:
- Heat (R) inside G biased DOWN (energy from leaves to roots)
- Water (W) inside G biased UP (transpiration)
- G-aware gating prevents resource leakage
- Resource-gated growth/death

**What's missing:** G cells are anonymous — no identity, branching, genetics, or reproduction.

---

### Integration: Triple-Bit-Tree Genetics

Borrow from `triple_bit_trees.md`: each cell has a 3-bit gene encoding which slots (left/up/right relative to facing) can spawn children. Down is always parent.

**Expand G from Uint8 to Uint16:**
```
Bits 0-1:   Facing direction (N=0, E=1, S=2, W=3)
Bits 2-4:   This cell's 3-bit gene (left/up/right growth enabled)
Bits 5-12:  Plant tag (8 bits — identity + lineage color)
Bits 13-15: Flags (depth? tip? reproductive?)
```

**Growth logic (local):**
1. Read own gene bits
2. For each enabled slot (relative to facing):
   - Compute world position
   - Check empty + crown shyness (no foreign tags in Moore neighborhood)
   - If passable and resources sufficient: spawn child with inherited tag, rotated facing, next gene from genome

**Genome storage:** Small global array `genome_by_tag[256]`, each entry a variable-length array of 3-bit genes (depth-first order). Only accessed during reproduction. ~8KB total.

**Reproduction:**
- Tip cells (no children yet grown) can spawn seeds when energy threshold met
- Seed disperses (random walk or ballistic), lands, germinates with inherited genome (possibly mutated)
- Mutation = flip 1 random bit in genome, or truncate/extend

---

### Avoiding Deterministic Convergence

**Problem:** If genomes deterministically produce shapes, the "best" shape wins every run.

**Solutions for path-dependent evolution:**

1. **Context-dependent fitness** — There's no universally optimal shape. What works depends on:
   - Where resources happen to be (randomized per run)
   - What shapes neighbors have (crown shyness interactions)
   - Who colonized first (territory matters)

2. **Probabilistic gene expression** — Even with same genome, growth isn't guaranteed:
   - Each slot has probability of actually growing (based on local R/W levels)
   - Same genome in different environments → different phenotypes

3. **Frequency-dependent selection** — Strategies that are good when rare become bad when common:
   - Tall narrow plants win in sparse fields, lose in dense ones
   - Wide branching wins when competing for lateral space, loses to height elsewhere

4. **Historical contingency via resource shaping:**
   - Dead plants leave resource imprints (depleted zones, nutrient deposits)
   - Early colonizers shape the landscape for everyone after
   - No two runs have the same history → different evolutionary trajectories

5. **Spatial heterogeneity:**
   - R and W sources aren't uniform — hot spots, wet zones
   - Different regions favor different strategies
   - Multiple niches → multiple coexisting solutions

---

### Minimal Implementation Path

**Phase 1: Identity + Branching**
- Expand G to Uint16 with facing + gene + tag
- Implement facing-aware growth slots
- Crown shyness by tag (different tags repel)
- Single hardcoded genome per tag initially

**Phase 2: Reproduction + Inheritance**
- Tip detection (G cell with no G children)
- Seed spawning when energy threshold met
- Genome inheritance with mutation
- Genome array storage

**Phase 3: Selection Pressure**
- Resource competition drives differential survival
- More cells = more resource capture = more reproduction
- But also more maintenance cost
- Balance emerges

**Scalability:** Uint16 doubles G storage but stays O(N). Genome array is O(256 × avg_genome_length) ≈ O(1). All per-cell operations remain local. Should still hit 4k×4k+ at 60fps.

---

### Visual Outcomes

- **Lineage colors:** Tag → hue. Related plants look similar. Divergent mutations shift color.
- **Shape diversity:** Different genomes → different branching patterns. Visible variety.
- **Crown shyness:** Plants avoid each other by identity, creating the "unicorn tapestry" gaps.
- **Succession waves:** Pioneer shapes colonize, get outcompeted, leave resource ghosts, new shapes fill in.

---

### Physical Gene Propagation (Proto-Cells)

**Problem:** Global genome lookup feels abstract, not physical. Want gene inheritance to propagate locally like real biological signals.

**Solution:** New cells are "born" at the seed, carry their gene, and physically travel through the plant to their destination.

**Mechanic:**

1. Seed reads next gene from its genome, spawns a **proto-cell** carrying:
   - Its 3-bit gene
   - Inherited tag
   - Path/destination info (or just "find next unclaimed tip")

2. Proto-cell becomes a "passenger" inside the seed cell

3. Each tick, proto-cell gets **pushed outward** through the plant structure:
   - Host cell passes it to one of its children (toward tips)
   - Follows depth-first order or explicit path encoding

4. When proto-cell reaches a **tip** (cell with unclaimed enabled growth slot):
   - It exits the slot and becomes a real G cell
   - Copies its gene locally — no global lookup needed
   - Gets facing based on which slot it exited from

**Data structure:**
```
G_passenger = Uint16Array(N)  // 0 = no passenger, else packed (gene + tag + path)
```

Or separate layer:
```
Proto_present = Uint8Array(N)   // 0 or 1
Proto_gene = Uint8Array(N)      // 0-7
Proto_tag = Uint8Array(N)       // 0-255
Proto_path = Uint16Array(N)     // encoded L/U/R sequence
```

**Routing options:**

1. **Explicit path:** Proto-cell carries address like `[L, U, R]` meaning "go left child, then up child, then right child." Computed from genome structure at spawn time.

2. **Greedy flow:** Proto-cell just flows toward any unclaimed tip. Cells track which slots are "reserved" by incoming proto-cells.

3. **Depth-first flooding:** Proto-cells spawned in genome order naturally fill tips in correct order if they all flow outward.

**Same-space handling:**
- G cells can have a "passenger" — not a collision, a contained signal
- Passenger is a separate layer overlaying G
- Multiple passengers could queue (like packets in a buffer)

**Visual bonus:**
- Proto-cells rendered as bright pulses traveling through the plant
- You see the "vascular system" working — signals flowing from seed to tips
- Growth becomes a visible two-phase process: pulse travels, then new cell appears

**Biological analogy:**
- Like phloem transport of sugars/signals in real plants
- Like cell migration during embryonic development
- Genome at seed = DNA in nucleus; proto-cells = mRNA/proteins being transported

**Scalability:**
- One extra Uint16Array for passengers: +2MB at 1M cells
- Proto-cells move one hop per tick — O(N) iteration
- No pathfinding needed if using greedy/flooding approach
- Stays fully local: each cell only checks its own passenger and children
