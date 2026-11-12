# coadapt-1 — Stage 1.5 + Stage 2a findings (2026-11-11)

Continuation of `coadapt-0-findings.md`. Code: `coadapt-1.html` (core+viewer, COADAPT1 CORE
markers), `coadapt-1-tests.js` (9 fixtures green), `coadapt-1-exp.js` (factorial harness),
results in `coadapt1-runs/` (+ `factorial-report.json`). Archipelago lives in coadapt-0.

## Stage 1.5 — archipelago (convention mosaic): works

Islands (habitability mask) + `longJump` wind dispersal added to coadapt-0, defaults off,
fixture 11. Demo (4×4 islands, longJump 0.003, 200k ticks, 2 seeds): islands hold **distinct
conventions persistently** — cross-island axis spread ≈ 0.12 (0.25 = uncorrelated, 0 =
homogenized) — with occasional convention takeovers (6 in one seed, 0 in the other).
Migration rate is the dial between one world-convention and a patchwork of them.
Watch: `coadapt-0.html?cfg={"islandsNx":4,"islandsNy":4,"longJump":0.003,"s":8,"D":1,"mu":0.05,"sigma":0.1,"initN":400}`

## Stage 2a — bodies + byproduct exchange

Substrate: TBT-tree bodies (godsroll machinery, flat torus, no gravity/shade). Each tissue
cell produces `keep`+`emit` energy per tick; `emit` is byproduct split among FOREIGN adjacent
tissue cells, valued by the receiver at hue antipodality. Kin byproduct is worth exactly 0
(T1/T2 enforced by physics, not rules); nothing is minted at interfaces (ledger fixture);
shared boundary = bandwidth. `bodyMode:'point'` is the geometry-off control; `emit:0` the
exchange-off control.

### Factorial results (3 seeds × 30k ticks each, 96²)

| arm | cA | flux% | meanCells | orgs | R2 | R1 |
|---|---|---|---|---|---|---|
| tree-e0 (no exchange) | −0.029 | 0.0 | 2.1 | 4005 | 0.06 | 0.20 |
| tree-e1 | −0.001 | 14.0 | 2.4 | 3188 | 0.42 | 0.04 |
| tree-e15 | 0.008 | 24.9 | 2.5 | 3002 | 0.65 | 0.02 |
| point-e15 | 0.003 | 26.2 | 1.0 | 6636 | 0.70 | 0.01 |
| tree-v2 (cap 0.75, cost 128) | −0.009 | 9.0 | **6.8** | 960 | 0.17 | 0.06 |
| point-v2 | **0.155** | 0.9 | 1.0 | **108** | 0.12 | 0.05 |
| tree-v2u (cost 128 only) | −0.005 | 20.8 | 3.5 | 1806 | 0.62 | 0.05 |
| **tree-v3 (cap 1.5 = emit)** | 0.009 | **19.6** | 3.9 | 1627 | 0.59 | 0.07 |
| **point-v3** | 0.020 | **11.8** | 1.0 | 1688 | 0.31 | 0.02 |

(cA = contact assortment vs org-hue permutation null; flux% = share of the world's entire
energy influx flowing through complementary interfaces; R2/R1 = pair structure vs monoculture.)

### What was learned

1. **Hue coadaptation transfers to bodies.** Exchange off → hue-neutral (R2 ≈ 0.04, the
   predeclared floor). Exchange on → antipodal pair structure (R2 up to 0.70, R1 ≈ 0.02) with
   a quarter of the global economy flowing through complementary contacts, under mutation of
   both hue AND body-plan simultaneously.
2. **Surface exchange alone rewards pointness.** v1's clean negative: points slightly beat
   trees (26.2% vs 24.9% flux) because a single cell is the maximal surface-to-volume body.
   Under pure boundary economics the optimal organism is a degenerate finger.
3. **A per-cell intake ceiling makes anatomy pay — if it's set right.** cap < single-contact
   share (v2, 0.75 < 1.5) clips the best matches, flattening the matching gradient itself
   (R2 collapses to 0.17) even as bodies triple (6.8 cells). cap = emit (v3, 1.5) binds only
   multi-partner gluttony: **trees then beat points 19.6% vs 11.8% flux — a 66% energetic
   dividend for having a body — with pair structure intact** (R2 0.59 vs 0.31) and bodies at
   3.9 cells and growing. The dial between "shape is irrelevant" and "shape is the economy"
   is one number with a principled setting.
4. **Accidental find — obligate-mutualism collapse.** point-v2 (harsh cap + high seedCost) is
   barely viable alone: the population crashed to ~108 survivors, and the survivors are
   matched couples (cA = 0.155, by far the highest spatial assortment seen in any arm).
   Survivorship under obligate partnership produces exactly "only the glove-fits persist."
   As a *regime* this is a legible, dramatic world: sparse, nearly-empty, inhabited by pairs.
5. **Open: spatial partner-choice is still weak in viable regimes** (cA ≈ 0.01–0.02). The
   histogram adapts; bodies profit from exchange; but at 50–80% density organisms press
   against whoever is there. Lower density, longer horizons, tip-launched seeds (so where
   you drop a seed depends on your shape), or seeds that preferentially establish beside
   complementary tissue (U22's glom-on) are the candidate mechanisms for making *arrangement*
   itself evolve. That is the next experiment.

## Where this leaves the program

- Stage 1 (hue circle): coadaptation, contingency, specificity, lock-in, twirl — all shown.
- Stage 1.5 (archipelago): convention mosaic + takeovers — shown.
- Stage 2a (bodies + exchange): exchange ecology on evolving bodies — shown; geometry
  dividend — shown (v3); interlocking *arrangement* — not yet (the live frontier).
- Not yet run on coadapt-1: transplant/specificity assays (S1-style, use match-based metrics
  per Stage 1's lesson — saturated-arena birth rates are fitness-blind), archipelago on
  bodies, obligate-mutualism regime explored deliberately rather than accidentally.

## Addendum (2026-11-11, same session): legibility + body-shape laws

Viewer: organism silhouettes, glowing flux seams (brightness = match quality), root dots,
dials panel + cfg paste box. New physics dials (all default-off): `exposurePow` (production ×
(openFaces/4)^pow — punishes flabby interiors), `upkeep` (per-cell per-tick cost; starvation
death — makes enclosure lethal, not just unprofitable), `lifespanPerCell` (big bodies live
longer; the risk is the long immature build), `seedFrom:'tip'` (reach disperses further).

Probe lessons: a production tax alone cannot create space in a space-limited world (packing
returned, monoculture drifted back, flux died); upkeep too high → extinction cascade (packing
outruns hue-sorting, everyone starves together). The balanced **vine regime**:
`{"keep":0.75,"emit":1.5,"absorbCap":1.5,"seedCost":96,"lifespan":192,"lifespanPerCell":12,"exposurePow":1,"upkeep":0.05,"seedFrom":"tip"}`
→ open faces/cell = 1.97 (straight-vine density exactly 2.0), R1 ≈ 0.05 (no monoculture),
R2 0.32–0.44, cA up to 0.024 — the best spatial partner-assortment in any viable regime so
far. Upkeep is doing the pruning that halos did in godsroll, but through energy rather than
prohibition. Candidate refinement: starvation die-back (drop deepest cells when pool < 0
instead of whole-organism death) would open space smoothly and remove the extinction cliff.

## Addendum 2 (2026-11-11, late session): frontier results, the matched-face law, Stage 3

**Frontier experiments** (`coadapt-1-frontier.js`, results `coadapt1-runs/frontier-*.json`):
at equilibrium (30–100k ticks) the original vine regime degraded — world re-packed
(open/cell → 1.0), monoculture drift returned (R1 > R2), flux fell to 1–4%, and dockReserve
did not rescue it. Bodies DID elaborate (mean 25–28 cells, tree depth to 23 at 100k — the
economy does grow anatomy). Body transplants were inconclusive in that degraded regime
(deficit uncorrelated with Δφ — consistent with monoculture-drifted sources).

**The realization that fixed it:** exposure and exchange were fighting over the same faces —
the exposure law taxed contact, exactly what exchange rewards. THE MATCHED-FACE LAW: a face
counts as living surface if empty OR foreign-weighted-by-match (kin/self contact smothers; a
complementary interface breathes). One change aligns anti-flab pressure with partnership:
mismatched packing starves, matched packing thrives. Equilibrium at 40k (2 seeds): flux
12.6–13.2% (from 1–4%), R2 0.53–0.55 with R1 0.06–0.19 (no monoculture), ~520 organisms of
mean 11 cells. This is the current best body-world regime and the coadapt-2 default.

**Stage 3 shipped: `coadapt-2.html` + `coadapt-2-ui.js`** — the excavation build. Snapshots
every 500 ticks, rewind scrubber, click-to-select with lineage/ancestor chain, reroll genes or
journey on any organism (keyed per-event dice; reroll counters per birth identity), replay from
before the birth, and a GHOST overlay rendering the abandoned timeline at the same tick so the
divergence is visible. `coadapt-2-tests.js` (5 fixtures green) pins the reroll contract:
no-reroll replay identical; past-invariance; locality at the birth tick; stream independence
(journey reroll leaves genes unchanged); snapshot round-trip under rerolls. Two lawful
subtleties the fixtures encode: a reroll may resample the SAME outcome (~40%: the mutation
gate rolls "copy" again), and a divergent variant that dies young can leave zero trace —
timelines can lawfully RECONVERGE (no litter in this world). If reconvergence should be rare,
add a litter/memory channel (godsroll has one; port it in a later pass).

## Addendum 3 (2026-11-11): nursery gate results, R2-drift clarification

**R2 under emit=0 is population-size-dependent** (user observation confirmed): default dials
(pop ~3,600) hold neutral R2 at 0.04–0.08 through 150k ticks; sparse regimes (pop 200–500)
drift to R2 0.2–0.45 with no selection at all. Read R1 beside R2 always (drift: R1≈R2;
selection: R1≪R2); flux is the direct selection meter.

**Nursery gate (`germBase`/`germDock`: germination requires docking beside complementary
tissue) — two new failure modes, both kept as dials (default off):**
1. Strong gate (base ≤ 0.15): bootstrap collapse — gated births bottleneck the population,
   drift destroys the diversity the gate needs, monoculture locks (R1 0.93), extinction or
   stasis. Third instance of the session's deepest pattern: **obligate partnership cannot
   precede sorted diversity; mutualism must start facultative** (cf. handoff R15 — the
   establishment problem).
2. Mild gate (base 0.3–0.4): **sibling crowding** — offspring of the same parent compete for
   the same attractive dock sites and pile up around good partners, generating masses of
   kin-kin contact edges: cA went NEGATIVE (−0.05 to −0.155). Propagule crowding, emergent.
   Diagnosis: the missing ingredient for spatial partner-assortment is sibling DISPERSION
   (scatter same-parent seeds apart), not stronger docking attraction. Untested; top of the
   next-session queue. Also consider a partnered-fraction metric (share of organisms with ≥1
   strong-match contact) — cA punishes sibling adjacency and may understate partner-choice.

The shipped default regime remains matched-face + vine dials (flux ~13%, R1 low, stable).

## Suggested immediate next steps

1. Partner-choice mechanism: seeds launch from tips (shape → dispersal pattern) and/or a
   germination bonus adjacent to high-m tissue — then measure whether cA rises above the
   v3 floor at viable densities.
2. Push one world long (200k+) at tree-v3 dials to see if body plans elaborate (meanCells
   trend, genome depth) once the economy rewards interface area.
3. S1-style transplants between coadapt-1 worlds (match-metric, growth-phase window).
4. The obligate regime (point-v2 dials, or tree equivalent) as a deliberate "sparse world of
   couples" — likely the most immediately *legible* coadaptation display the project has.
