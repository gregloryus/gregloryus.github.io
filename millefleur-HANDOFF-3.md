# millefleur — HANDOFF 3 (the functional-organs pivot, 2026-07-10)

Read `millefleur-HANDOFF-2.md` first for the project map, then this. This doc
memorializes the decisions from the 2026-07-10 session: what got built in
`evo-engine-millefleur-3.js/.html` (v1, committed `f186d9f`), what Greg's
review found, and the agreed redesign for the next round (v2 of `-3`,
edit-in-place unless it balloons — ask).

Housekeeping (unchanged, plus one new rule):
- Version by filename; commit at checkpoints; **never `git push`** (Greg
  pushes via GitHub Desktop).
- **Work in small checkpoints and check in with Greg often.** Talk design
  through in prose BEFORE coding. Don't batch four features and present a
  fait accompli — that was this session's process lesson.

---

## Where -3 v1 stands (committed, working, superseded in design)

All four directions from the session's first half were built and pass
headless (`node evo-engine-millefleur-3.js [seed] [ticks] [cols] [rows]
[radius] [pClone] [decayWindow]`; seeds 14/42/777 COMPLETE+PASS):

- Upward growth via germination facing = north.
- Cell roles derived from tree TOPOLOGY: forward-slot terminal = flower
  (blooms an 8-neighbor petal ring, all-or-nothing, after the skeleton
  finishes), side-slot terminal = 1-cell leaf, else stem. REQUIRE_BLOOM
  makes flowerless plans fail.
- Emission weighted by direct descendant success (`1 + k·directSuccesses`,
  rejection sampling).
- Decay of the fruitless (off by default; `?decay=1` or key `d`): an
  immortal whose whole lineage goes a window without a success fades and
  frees space + genome. Verified endless churn.
- Camera: `?cols=&rows=&scale=`, wheel zoom at cursor, drag pan, `c` refits;
  `scale=1` = 1px cells. Palette: olive stems, hashed-green leaves,
  full-spectrum hashed petals, cream centers.

Keep: emission-success bookkeeping, decay mode, camera, upward germination.
The ROLE/ORGAN system below replaces the topology-role + REQUIRE_BLOOM design.

## Greg's review of v1 (what prompted the redesign)

1. Leaves too small — wants the **aestheedlings leaf** (see reference notes).
2. Plants still droop downward (two same-side turns face south).
3. Asked how flower colors work (answer recorded below; palette still open).
4. **No branching anywhere.** Diagnosis (verified in test runs, 0.46
   blooms/plant before REQUIRE_BLOOM): not an encoding problem — an
   ECONOMICS problem. All-or-nothing 8-petal rosettes + REQUIRE_BLOOM make
   flowers the expensive organ; branches multiply flowers; two tips within
   2 cells have colliding rosettes = death; so evolution collapses to bare
   stalks with one top rosette. Explicit role genes alone would NOT fix
   this — the redesign fixes it by making flowers an ADVANTAGE (seed
   sources) instead of only a cost.

---

## DECIDED — the redesign for -3 v2

1. **Seed grows only up: reinstate simplant's `FORCE_SEED_STALK`.** Gene 0
   is pinned to `0b010` (forward-only) and exempt from mutation, so the
   first cell above the seed is always straight up. Everything after may
   droop — that's organic character, no ground-line rule. (Greg: "just the
   first cell.")

2. **Topology-derived roles are ABANDONED.** The main stem branches freely,
   exactly like triplebittrees / simplant. Side terminals are just bare
   tips again.

3. **Leaves and flowers are dedicated SHAPES, explicitly encoded** as new
   terminal gene values grafted onto the triplebit alphabet. Proposal:
   gene byte 0–7 = stem slot-bits (as ever), **8 = LEAF, 9 = FLOWER** —
   organ genes are terminals occupying a child slot like any child.
   Mutation gets organ-aware operators (insert organ at empty slot, flip
   organ type, remove organ; exact mix TBD at implementation). Canonical
   encode/decode and the uniqueness key extend naturally.
   - Leaf shape: aestheedlings-8's two-stage teardrop, 7 cells, angled
     up-and-away in the slot's direction (a 4-cell single-stage variant is
     the fallback knob if 7 proves too fat).
   - Flower shape: petal rosette around the flower cell; final geometry
     (full ring vs diagonal X) is an open aesthetic/economics knob.

4. **Organs are functional — a simplant-style economy at millefleur
   austerity:**
   - **Leaves absorb energy** (exposure-based, like simplant's graduated
     absorption). Energy banks on the plant.
   - **Seeds emit only from flowers**, paid for with energy — the most
     energetic (well-leafed, well-placed) plants reproduce fastest, and
     multiple flowers = more emission points. This REPLACES the artificial
     REQUIRE_BLOOM: a flowerless plant may immortalize but is sterile — a
     natural evolutionary dead end. Likewise leafless plants starve into
     sterility. The economy does the selecting.
   - Seeds launch FROM their flower (the crawl-to-tip phase becomes
     redundant — flowers are the extremities; drop or keep TBD).
   - Greg: "the way simplant evolves right now is pretty dang cool" — the
     evolution FEEL of simplant is the target; millefleur adds the
     immortal-tapestry frame around it.

## OPEN — decide with Greg before/while implementing v2

a. **Genre: do immortals metabolize but never die (artwork), or can they
   starve/age out (ecology)?** Frozen-in-form + metabolizing (absorb, bank,
   emit) preserves the tapestry-that-completes; starvation death makes it
   an endless ecology and overlaps with decay-of-the-fruitless. Also decide
   how the decay mode composes with energy (e.g. decay window as the only
   death, energy only as pacing).
b. **Energy model granularity.** Simplant's per-cell absorption + light
   particles crawling the parent chain (visualizable, heavier) vs an
   austere abstraction (per-leaf exposure count × rate, no particles).
   Also: does GROWTH cost energy (simplant: 1/cell, first free) or is
   unfolding free and energy only paces emission? Leaning: unfolding free
   (keeps fully-unfold-or-vanish pure), energy paces emission only.
c. **Global emission scheduler goes away?** Per-flower energy-paced
   emission replaces `SEEDS_PER_TICK` + weighted parent pick. The
   descendant-success weighting may become redundant (energy already
   selects) — keep the bookkeeping, maybe drop the sampling. Completion
   detection via failure streak should still work; verify emission decays
   to ~zero in a packed world so completion can trigger.
d. **Flower petal geometry** (ring vs X) and **hard vs soft organs**
   (leaning hard: one law, fully unfold or vanish — organs included).
e. **Flower colors / palette.** Current: soft additive hash → full-spectrum
   hue (similar genomes = similar hues = lineage neighborhoods), fixed
   cream centers. Candidates: keep; or quantize hash into a curated
   tapestry palette (whites/reds/blues/golds); or constrain sat/value only.
   Greg hasn't picked yet.
f. **Do bare terminals (gene 0) still exist in v2?** Presumably yes — bare
   twig tips are fine and are the mutation stepping-stone to organs.

## Reference notes (so next session needn't re-read the sources)

**simplant-20.js** (`simplant.html` loads it; 1134 lines):
- Absorption: every non-seed cell, cooldown 30/cell, P=0.6; graduated mode:
  ≥3 open cardinal sides = 1.5 energy, 2 = 1.0, 1 = 0.5. Absorption spawns
  a light particle that crawls cell→parent to the seed, then banks
  (optional distance bonus 1 + steps×factor). Starvation clock resets on
  ANY absorption.
- Growth: 1 energy/cell (first sprout free); frontier is a persistent list,
  blocked slots get a `grownMask` bit and are skipped (silently abandoned —
  no fully-unfold test in simplant!).
- Reproduction: phase 0 → energy ≥ G conceives child genome (mutation
  P=0.2 else clone); phase 1 → energy ≥ G + childG launches traveling
  seed, costs childG. Seed crawls root→tip, 40 airborne steps, needs
  GERMINATION_CLEAR_RADIUS=3 (7×7 empty — anti-millefleur, drop).
- Death: age ≥ MAX_PLANT_AGE(1000) × genome length, or STARVATION_TICKS
  (200) without absorption. Whole plant freed at once.
- `FORCE_SEED_STALK: true` = gene 0 exempt from mutation (the "seed grows
  up" mechanism to port). Torus world; no uniqueness/immortality/completion.

**aestheedlings-8.js** (`aestheedlings.html` loads it): the leaf to port.
LeafBud spawns diagonally off the stem at (stem.x±1, stem.y−1), alternating
sides, then two-stage unfold: primary bud grows [above, away, diag-away]
with the diagonal a SECONDARY bud, which grows [above, away, diag] as pure
leaf cells. Total 7 cells in an up-and-away teardrop. All-or-nothing per
stage (all 3 target cells must be empty). Single-stage = 4-cell variant.

**Flower color (current -3 code):** `plantColorFromGenome` =
sum(genome bytes + i%7) × 0.013 mod 1 → hue, S=0.8, V=0.95. Additive, so
one mutation nudges the hue — lineages form color families. Leaves:
same idea confined to a green band. Centers fixed cream `0xf7ecc8`.

**Fresh-start instructions for a next session:** read HANDOFF-2 (map),
this doc, then skim `evo-engine-millefleur-3.js`. Don't code until the
OPEN items above are settled with Greg. Small checkpoints, always.
