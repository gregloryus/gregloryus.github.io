# millefleur — design + first implementation (2026-07-07)

A **generative-art project**: a self-completing tapestry generator. This is a
step BACK from matter-plants (Greg didn't love where it went — too much
complexity).

## STATUS: IMPLEMENTED AND PASSING

`evo-engine-millefleur.js` + `evo-engine-millefleur.html` (Greg picked the
names). Runs in browser AND headless:
`node evo-engine-millefleur.js [seed] [maxTicks] [cols] [rows]`.

Headless acceptance (3 seeds, incl. browser-sized 480x270 world): all
COMPLETE genuinely, ~31–32% fill, zero duplicate genomes, e.g. 3082 unique
flowers in 392k ticks / 8.6s at 480x270. `node evo-engine.js 1337 10000`
still PASSes (Phase 1 untouched). Browser is NOT yet visually reviewed by
Greg — that's the next step.

Implementation decisions (revisit freely):
- **Blocked plants vanish immediately** (open decision #1 resolved: vanish,
  the moment any growth step is blocked).
- **Bounded world, not torus** — the frame acts like an immortal neighbor;
  growth hitting the edge fails there. Tapestry has a border.
- **Completion** = failure streak ≥ max(12000, 0.5×area) pauses seed
  emission; if all in-flight seeds/plants drain without a success →
  COMPLETE (a success resets the streak and resumes). Verified to trigger
  genuinely, not prematurely, on all test seeds.
- **Every seed carries ≥1 mutation** (a clone can never immortalize given
  the uniqueness registry), extra mutations geometric (p=0.35). Emission
  retries up to 12 mutations for a never-seen genome, else skips (doesn't
  count as a spatial failure).
- Genomes are always canonicalized (encode∘decode) so the uniqueness key
  ignores unreachable junk genes.
- FORCE_SEED_STALK dropped — gene 0 may mutate (rare, radical, allowed).
- Growing plants render at alpha 0.55, snap to alpha 1.0 on
  immortalization; root cell tinted toward white (bright flower center).
- Defaults: 4 seeds/tick from random immortal parents, AIRBORNE_STEPS=64
  (Greg's number), browser starts at 10x speed (button cycles 1/10/100/1000).

**Empirical surprise worth discussing with Greg:** the size gradient runs
OPPOSITE to prediction — later flowers are BIGGER (mean cells first→last
quartile: 10.3→15.4 at 480x270), because ~94% of flowers immortalize in the
early open-space phase while genome length drifts upward, and the world
saturates before small-flower selection dominates. Related: the uniqueness
rule makes tiny genomes combinatorially scarce (only a handful of distinct
2–3-cell canonical forms exist, each usable once), so tiny gaps mostly stay
empty. ~31% fill is near the packing limit imposed by the 1-cell outline
gap. Whether this reads as millefleur is a browser/aesthetic question.

## The one-line pitch

**Immortal plants competing for space.** A seed grows into its
genome-determined form; if it can *fully unfold its body plan* it becomes
immortalized (frozen forever, immovable) and starts dispersing mutant seeds.
Descendants compete for the shrinking gaps around their ancestors. When no
seed can fill any remaining space, the artwork is **complete** — a finished
millefleur tapestry.

## Why this produces millefleur mechanically

Early founders sprawl into open space and freeze. Space fragments, so
sprawling genomes now fail (can't fully unfold → never immortalize) while
compact genomes succeed. Each generation the gaps shrink and the winners get
tinier: a few large early forms surrounded by generations of ever-smaller
flowers packed into the interstices. With color hashed from the genome,
lineages cluster into family-colored neighborhoods. The selection gradient
(space fragmentation over time) is the mechanic itself.

## Core rules (as agreed)

1. **No economy, no death, no rain, no water, no gravity.** Delete all of it.
   The world is a flat grid of empty cells and plant tiles.
2. **Growth:** a seed germinates and unfolds its genome→branching-tree form
   tile by tile into empty cells (genome model ported from evo-engine Phase 1
   / simplant lineage).
3. **Immortalization:** ONLY a plant that fully unfolds its complete body
   plan is immortalized — frozen, immovable, permanent. A blocked plant does
   NOT immortalize (fate of blocked plants is open decision #1).
4. **Uniqueness:** an exact geneform is immortalized ONLY ONCE, ever. Every
   flower in the finished tapestry is genetically unique. (Needs a registry
   of immortalized genomes — hidden state is fine here; the matter-plants
   "no hidden values" law is explicitly traded away with this design.)
5. **Reproduction:** a mature (immortalized) plant disperses mutant seeds.
   Most differ by 1–2 bits; some very different but rare.
6. **Mutation gradient:** older/earlier genes are LESS likely to mutate,
   newer/later genes MORE likely — radical changes still possible but rare.
   Greg recalls an earlier project of his implemented exactly this — **check
   the latest simplant html/js** (not yet read this session; safeguards were
   tripping). It may also have seed-dispersal rules worth porting.
7. **Seed dispersal:** tunable magic number for now — e.g. a **64-step
   random walk** from the parent. Could become a genetic trait later, not
   now. Short-ish dispersal is what gives lineage-colored patches.
8. **Completion:** when no more space can be filled by any seed, the piece
   is done. Finished-artwork framing is the point — run, admire, reseed.
   (How to *detect* completion is open decision #2.)

## Perspective / rendering intent

Not pure top-down, not side view: a **3/4, pre-Renaissance perspective** —
like real millefleur tapestries or Fra Angelico. Lower on screen = closer,
higher = farther, but NO size change with distance (no vanishing point).
Open decision #3: whether this is rendering-only (draw order by y, lower
plants painted in front) or also affects mechanics. There is no gravity
either way.

## Fork: evo-engine-millefleur-2 (experiment branch, same date)

`evo-engine-millefleur-2.js/.html` — the -1 files stay frozen as baseline.
Changes: (a) **local uniqueness** — identical genomes conflict only within
`UNIQUENESS_RADIUS` (default 64, root-to-root), checked at germination, so
motifs can repeat at large intervals; (b) **P_CLONE = 0.35** — that fraction
of seeds are exact parent copies (only viable beyond the radius; set 0 for
mutants-only); (c) **random run seed each load**, shown in the status bar
and console; reset (key 0) rolls a new one. URL params:
`?seed=N&radius=64&clone=0.35` — a pinned seed replays exactly.
Headless takes them positionally: `node ... [seed] [ticks] [cols] [rows]
[radius] [pClone]`.

**Key empirical finding: repetition ∝ dispersal/radius ratio.** A 64-step
random walk nets only ~8–16 cells of displacement, so with radius 64 clones
almost never escape the parent's exclusion zone (16 repeats/921 flowers);
radius 16 gives 209/1070. To see repeating motifs, lower `?radius=` or
raise AIRBORNE_STEPS. All configs verified: zero same-genome pairs within
radius.

**Update — P_CLONE now defaults to 0 (Greg's call):** repeats must be
CONVERGENT — the same canonical genome re-derived by mutation, never a
copied clone. Still happens naturally: 33 convergent repeats/1002 flowers
at radius 64, 82/1077 at radius 24 (clone=0). ?clone= can re-enable copies.

**Color is deterministic per canonical geneform (was already; hash now
strengthened).** `plantColorFromGenome` = FNV-1a over the genome bytes →
hue+sat+val. Identical forms ALWAYS share the exact color, so convergent
evolution is spottable by eye; distinct forms almost never collide. Cost:
the old similar-genome-similar-color lineage gradient is gone (a strong
hash deliberately scatters neighbors). -1 keeps the old soft-hash gradient.

## Strict self-avoidance (millefleur-2, Greg's request)

Old rule let a plant's own branches bundle together into filled BLOBS (the
only self-constraint was "target cell empty"). New rule in
`growOneStep`: a new cell may touch (8-way) only same-plant cells that are
topologically NEAR — its **parent, grandparent (inside of a turn), or a
sibling (crotch of a fork)**. Contact with any farther same-plant cell =
a branch looping back or running alongside itself = aborts the plant.
O(1) check: `nb === parentCell || nb === grandCell || nb.parent === parentCell`.

IMPORTANT nuance for future sessions: a LITERAL "no diagonal self-touch"
rule is degenerate — every turn's corner touches the grandparent diagonally
and every Y-fork's arms touch each other diagonally, so forbidding all
diagonal self-contact collapses plants to straight lines. The parent/
grandparent/sibling allowance is the minimal set that keeps turns + forks
while forbidding real self-intersection (2x2 blob needs a distance-3 tree
contact → caught). Plants are now provably self-avoiding trees.

Impact (radius 64, clone 0): fill 30.2%→26.3% (240x135), flowers
1002→814; big world 480x270 ~27% fill, 3011 flowers. Self-colliding
genomes now abort (plantFails up) instead of blobbing. Not degenerate.

## Open decisions

1. **Fate of blocked plants** — a plant that can't fully unfold never
   immortalizes; does it vanish, wither in place, or hold its cells until
   outcompeted? (Vanishing is simplest and keeps gaps fillable.)
2. **Completion detection** — "no seed can ever succeed" is nonlocal.
   Practical options: quiescence timeout (N seeds in a row all fail), or a
   frontier/free-space check. Decide when implementing.
3. **3/4 perspective mechanics** — rendering-only vs. affecting overlap.
4. **What exactly counts as "fully unfolds"** — genome tree completely
   executed, presumably; pin down when porting the genome decoder.

## Findings from simplant-20.js (read 2026-07-07 — this is the file to port from)

`simplant.html` loads `simplant-20.js`; it contains both mechanics Greg
remembered:

- **Mutation gradient** (`mutateGenome`, ~line 299):
  `geneIdx = Math.max(randInt(len), randInt(len))` — max of two uniform
  draws over a pre-order-encoded genome biases mutation linearly toward
  later/newer genes; root mutations (radical) are rare but possible.
  `FORCE_SEED_STALK` exempts gene 0 entirely. Safety rule (~318): a
  bit-clear that would delete a NON-empty subtree is a no-op — pruning only
  removes empty leaf branches. Port all of this as-is.
- **Seed dispersal**: traveling seed crawls root→random tip along the
  parent's own branches, then random-walks `AIRBORNE_STEPS = 40` cardinal
  steps on a torus, then tries to germinate. (Greg's "64 steps" memory =
  this knob at 40.) Keep the crawl-to-tip phase — seeds launch from
  extremities.
- **`GERMINATION_CLEAR_RADIUS = 3` is ANTI-millefleur** — requires an empty
  7×7 to germinate, enforcing sparseness. Drop to ~0; the fully-unfold rule
  is the real filter and lets tiny genomes claim tiny gaps.
- **Blocked growth is silently abandoned** (~line 435): a blocked frontier
  slot is dropped, so "frontier empty" = finished OR gave up. For the
  immortalization test add a per-plant `wasBlocked` flag to distinguish.
- **Keep the 1-cell-gap rule**: growth requires no 8-way neighbor belonging
  to a different plant → guaranteed outline gap between flowers (reads like
  tapestry outlining).
- Portable as-is: 3-bit gene → left/forward/right tree decoder
  (`decodeGenomeToTree`/`encodeTreeToGenome`), facing/rotation tables
  (`DIR_DX`/`DIR_DY`/`ROTATIONS_FLAT`), genome-hashed HSV color
  (`plantColorFromGenome`), frontier-based one-cell-per-tick growth.
- Delete: light particles, energy/absorption, cooldowns, starvation,
  `MAX_PLANT_AGE`, reproduction energy phases.
- Note: simplant-20 mutates at most ONE gene per child (`MUTATION_RATE`
  0.2). Millefleur wants "most 1–2 bits, some very different" — e.g. draw
  mutation count from a geometric distribution instead.

## Relationship to existing code

- **Base to port from: evo-engine Phase 1** (`evo-engine.js`, tag
  `phase1-complete` — leave intact): genome→tree decoder, mutation, seeds,
  color hashing. Delete energy/income/upkeep/end-of-life entirely. The chunk
  sleep system fits perfectly — frozen plants never wake; the world gets
  cheaper as it fills.
- ~~First research step: read the latest simplant html/js~~ — DONE, see
  "Findings from simplant-20.js" above.
- `matter-plants-1.js`/`.html` stay as-is (parked, never executed headlessly).
  Its HANDOFF-2 candidate directions are superseded by this pivot.
- New code goes in NEW files (Greg versions by filename — suggest
  `millefleur-1.js` + `.html`).

## Housekeeping

- Commit at checkpoints, frequently. **Never `git push`** — terminal auth is
  broken; Greg pushes via GitHub Desktop.
- Shell/tooling safeguards kept tripping this session (and prior ones);
  nothing here has been executed. Verify `node evo-engine.js 1337 10000` is
  still green before porting, if shell access works.
