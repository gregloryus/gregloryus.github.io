# millefleur — HANDOFF 5 (the honest-baseline round, 2026-07-12)

Read `millefleur-HANDOFF-2.md` (project map) first; skim `-3` (functional
organs design) and `-4` (v2 build + overlap experiment) for lineage. This doc
records the 2026-07-12 session: a large simplification of the economy and
mutation system in **`evo-engine-millefleur-4.js`** (edited in place at
Greg's direction — no fork), the empirical findings, and — the main payload —
**the ideas discussed but NOT implemented**, so a fresh session can present
Greg his options.

Housekeeping (unchanged): version by filename; commit at checkpoints;
**never `git push`** (Greg pushes via GitHub Desktop); prose design talk
BEFORE code; small checkpoints, check in often. The organism is a "plant";
"flower" means only the flower organ. Committed through `c250070`.

---

## What changed in -4 this session (all committed, all headless-PASS)

1. **Organ overlap REVERTED** (Greg: illegible). Blades/petals are solid,
   grid-blocking tissue again; all overlay machinery deleted.
2. **Economy simplified to a metronome.** At immortalization every cell's
   open cardinal sides are scored by the graduated table; that static
   `energyRate` is never spent, recomputed, or multiplied by age. Each
   flower emits a seed every `SEED_ENERGY_COST / rate` ticks. Two flowers =
   double the seeds. No banking, no ledger. The old two-phase
   conceive/launch cycle and `rate × age − spent` arithmetic are gone.
3. **Leaf-dominated income.** `LEAF_ENERGY_MULT 2` (the enforced
   aestheedlings teardrop is the designed form — it pays a deliberate 2×
   bonus) and `NONLEAF_ENERGY_MULT 0.1` (stems/petals/centers earn a token
   fraction). Leaves are worth 20× per exposure point: stems become
   scaffolding, worth building only to mount organs. This doubled
   leaves/plant when introduced (0.71 → 1.3–1.7) before the later changes
   below reshaped the regime again.
4. **Organ-halo legibility rule** (Greg: petals/leaves were fusing into
   mush). Petal rings may touch ONLY their flower center, its stem, and
   that stem's parent — anything else in the ring's 8-halo (own branches,
   blades, other rings, other plants) fails the plant. Leaf blades may hug
   their own plant's SKELETON (the aestheedlings blade runs up alongside
   its stem by design) and their own leaf, but never another organ's
   tissue. Founder stalk grew to 4 stems (29 cells mature) so its ring
   clears its teardrops. Side effect worth knowing: stacked same-side
   branches now conflict via blade halos → a natural vertical-spacing
   (internode) pressure emerged un-designed.
5. **Decay-of-the-fruitless DELETED** (lineage clock, ancestor-chain
   refresh, scan mask all gone). Replaced by **lifespan = LIFESPAN_PER_GENE
   (600) × genome length** — simplant's longevity reward, restored at
   Greg's request to reward complexity. Death = fade + free space AND
   genome. `?life=N` per-gene, `?life=0` = immortal → the old completion
   mode still works (verified: genuinely COMPLETEs).
6. **Uniqueness toggleable, DEFAULT OFF** (hotkey `u`, `?radius=N`
   restores). The registry code is intact but `uniqRadius = 0` skips it:
   identical genomes may coexist anywhere.
7. **P_CLONE 0.5** — half of seeds are exact copies, half carry ≥1 mutation
   (+ geometric extras, unchanged).
8. **Symmetric mutation.** The simplant-inherited guard ("a bit-clear under
   a non-empty subtree is a no-op") is deleted: a bit-clear now AMPUTATES
   the whole subtree. Growth adds gene-by-gene, shedding drops
   branch-by-branch. Deep amputations stay rare via the
   newer-genes-mutate-more bias; clones keep backup copies of fit forms.
9. Recalibrations forced along the way: `SEED_ENERGY_COST` 40 → 20 (after
   the non-leaf nerf halved rates and the ecology couldn't take off) → 10
   (after the halo rule made ~97% of germinations fail). Lesson learned
   twice: **the absolute pacing sets density; the RATE RATIO between body
   plans sets selection.** The ecology self-organizes to ~replacement, so
   after any rule that changes P(unfold) or rates, expect to re-center
   pacing.

## Headless regimes at 200k ticks, 240×135, seeds 14 & 42

| regime | plants / fill | leaves/pl | flowers/pl | footprint | genome len |
|---|---|---|---|---|---|
| uniform economy, uniq on | ~250 / 22% | 0.71 | 1.11 | 23→27 | 12→15 |
| leaf-dominated, uniq on | ~180 / 20% | 1.3–1.5 | ~1.1 | 27→33 | 13→17 |
| + organ halos | ~100–140 / 15% | 1.4–1.7 | 0.82–0.87 | 26→40 | 14→25 |
| + uniq OFF, clones, symmetric mut, life/gene | ~350–380 / 24% | 0.97 | 0.64–0.73 | 21→20 flat | ~9 flat |

**THE session finding (Greg's own hypothesis, confirmed):** the
genome-length climb in the earlier regimes was largely an ARTIFACT — the
standing-genome uniqueness registry (small forms all "claimed", newcomers
pushed outward) plus the one-way mutation ratchet (easy to add, nearly
impossible to shed). With both removed, genomes settle at founder-size ~9
and stay flat. The current default is therefore an **honest baseline**:
what wins, wins on merit. And what wins on merit is still SMALL — P(fully
unfold) still dominates the fecundity (leaves) and longevity (genome
length) multipliers at current settings. Greg has NOT yet visually
reviewed this newest regime in the browser.

## Knobs / URL params (browser)

`e/E` ABSORB_COEFF ÷2/×2 · `g/G` GERM_CLEAR_RADIUS ±1 · `o/O` P_ORGANIFY
±0.1 · `s/S` AIRBORNE_STEPS ÷2/×2 · `u` uniqueness on/off · `[`/`]`
lifespan-per-gene ÷/×1.5 · `d` mortality on/off (immortal = completion
mode) · plus space/p/f/0/c/r as ever. Each knob restarts on the SAME seed.
URL: `?seed= &radius= &clone= &life= &cols= &rows= &scale=`.

---

## NOT IMPLEMENTED — the options shelf for next session

Discussed with Greg this session (or carried forward), in rough order of
how warmly he spoke of them. Present these; let him pick. Prose design
talk before code, always.

1. **Fertility-from-death** (goal: local, history-encoding conditions —
   Greg's "co-evolve with specific local conditions" ask). When a plant
   dies, the cells it occupied get enriched (a per-cell float, maybe slowly
   evaporating); the enrichment boosts the energy rate (or lifespan) of
   whatever matures there later. Each run's fertility map becomes a record
   of its own stochastic history; with short dispersal, lineages camp on
   ancestral ground and locally adapt. Cheap: one array, touched at death
   and at maturity. Fits the austere frozen-at-maturity principle (the
   ground remembers; the score stays static). My recommendation as the
   next structural step, and Claude-recommended pairing with the honest
   baseline (it makes "better" location-dependent rather than global).
2. **Threshold fecundity** (goal: more leaves via existential pressure).
   Set cost/lifespan so a 1-leaf plant emits only a handful of seeds per
   life while the survival lottery demands more — 2–3 leaves become
   necessary for persistence, a gradient-shaped gate. The replacement-
   equilibrium finding (above) says the RATIO is what selects, so this
   may need the superlinear backup: income ∝ leaves^1.5. Untested.
3. **Raise LIFESPAN_PER_GENE** (`]` key) — somewhere above 600 there may be
   a crossover where longevity finally beats P(unfold) and big forms win.
   Cheap to explore in-browser; no code needed.
4. **Repeat/segment operator in the genome grammar** (goal: emergent
   phyllotaxis — alternate/opposite leaves, internode rhythm). Today every
   cell costs one gene, so a 6-leaf symmetric form needs a long, fragile
   genome. A "repeat the previous motif" gene would make patterned forms
   cheap to discover. A real genome-language change — hold until the
   current economy has shown what it selects. (Note the organ-halo rule
   already created a mild un-designed internode pressure.)
5. **Directional light** (Greg's earlier weakly-held idea, still on
   record): sunlight falls straight down, worth more, attenuating through
   plants. Unresolved tension he flagged himself: top-down light implies a
   side-view world, but the Fra Angelico 3/4 perspective means light
   should fall equally everywhere. Also fights frozen-at-maturity (a
   neighbor's death changes shading). Fertility-from-death (option 1)
   delivers similar locality without either problem.
6. **Stricter leaf halo** — blades may currently touch their own plant's
   stems/branches (geometrically required for the stem-hugging teardrop).
   If side branches pressed against leaf outer edges still read as mush in
   Greg's browser review, forbid specifically non-adjacent skeleton
   contact; one-predicate change in `unfoldLeafStage`.
7. **Uniqueness as an aesthetic knob** — `u` restores every-flower-unique
   (the original millefleur conceit) at the cost of muddying the honest
   evolutionary signal; `?radius=64` gives the in-between (local
   uniqueness, motifs recur at distance). Now cheap to explore.
8. Old aesthetic knobs still on the shelf: 4-cell single-stage leaf
   fallback, diagonal-X petal variant, petals-exempt-from-one-law flag
   (code still factored for it), P_ORGANIFY tuning.

## Next session's first move

Greg reviews `evo-engine-millefleur-4.html` in the CURRENT default regime
(uniqueness off, 50% clones, per-gene lifespan, organ halos, leaf-dominated
economy — dense ~24% fill with recurring identical forms clustering into
lineage patches). Key questions for him:
- Does the organ-halo rule fix the legibility complaint? (If not: option 6.)
- Do recurring clone-forms read as pleasing millefleur repetition or as
  monotony? (If monotony: option 7, or lower P_CLONE.)
- Small still wins — which complexity lever appeals: 1, 2, 3, or 4?

The one-off inspector tooling (organ census, ASCII champion renders) from
prior sessions was session-scratchpad only; recreate via `vm` shim if
needed (~80 lines, see HANDOFF-4 §last).
