# Godsroll — Overnight Sweep Findings

Nov 10, 2026. ~35 headless runs (20,000 ticks each unless noted), iPhone-portrait dims, via `godsroll-sweep.js` (dial sweeps) and `godsroll-exp.js` (new-law prototypes; patches a copy of the core — `godsroll-1.html` untouched). Metrics per run: population time series, popCV (coefficient of variation of plant count, back half — the oscillation signal; baseline 0.06), distinct genomes, dominant-genome share, mean genome size (meanPlan), mean height (meanH), deaths by cause, death-avalanche histogram. JSONs and PNGs in `sweep/`.

## Headline: the equilibrium is almost unbreakable by dials

Across lifespan 64→1024, seedCost 32→384, shadeGrace 2→128, grace/cost, dispersal ranges, sunlight 2×, center-only sprouting, fullSun off — **popCV stayed 0.04–0.12**. Shade-death is an instantaneous density-dependent regulator: any local surplus is culled within one shadeGrace. No dial regime produced boom-bust, waves, or succession. If you want dynamics, you need a *law* that stores and releases pressure (see fertility below). Honest negative result, strongly replicated.

Degenerate corners found: seedCost 384 → founder can't afford two seeds, world never starts. Fertility law without a grace window → extinction by t500 (no litter exists yet to root in).

## The star: gated litter-fertility (knife-edge worlds)

`{"fertilityLaw":1,"fertilityMin":5,"fertilityGateTick":1500}` via godsroll-exp.js — seeds can only establish where litter ≥ 5 (death feeds life), gate enforced after t1500.

- Seed 1: survives 20k ticks at ~209 plants with **popCV 0.188** (3× baseline) — visible population swells and dips; the ground develops a glowing patchy nebula where colonies cycle. `sweep/law2-f5-20k-end.png` is the best-looking render of the night: sparse legible glyphs over soft red glow with real clearings.
- Seed 7: **extinct at t1896** (popCV 0.538 on the way down).

That contingency is the point: this is the first regime where *the dice decide whether the world lives*. For a game whose only verb is rerolling chance, a near-critical ecology is arguably the correct setting — rerolls become rescues. fertilityMin is the criticality dial: 1–2 ≈ baseline-stable, 5 ≈ knife-edge, no-gate = dead.

## Terrain law works mechanically, underwhelms dynamically (so far)

`{"terrainLaw":1,"heightUnit":4}`: litter → real elevation; new plants root at terrain height; projection/shading follow. Runs stable (popCV 0.046), max elevation 5 steps (8 with combo). Aesthetic: genuinely nice — dark terraced topography under the vegetation (`sweep/law1-h4-shake-end.png`, `sweep/combo-20k-end.png` is rugged and rocky). The hoped-for ridge→shade→death→ridge feedback is weak because litterProjected already smears deposits and spill flattens piles. To make terrain *matter*, elevation needs a stronger coupling — e.g. heightUnit 2, or terrain raising established plants too, or slope blocking seed walks. Worth one more iteration before judging.

## Dials that genuinely change the world (all stable, but different)

- **Height race:** `{"shadeGrace":128}` — tolerance lets canopies form: meanH 15.3 (vs 6.3), meanPlan 60, giant draping sky-trees (`sweep/shade-lenient-end.png`). Dramatic but tangled; legibility cost. `{"fullSun":0}` similar (meanH 16.8).
- **Lineage dominance:** `{"mutationChance":0.05}` — diversity collapses toward dynasties (42 genomes, dom 0.20). The lineage-following gameplay reads best here; at default 0.25 there are 124+ genomes and no lineage stories stand out. 0.75 → 207 genomes of noise.
- **Genome gigantism:** `{"urnMode":"mult","urnMult":3}` — meanPlan 70.6, fewer/bigger designs (81 genomes, dom 0.09, popCV 0.10, the second-highest of any dial).
- **Striking forgetting:** `{"strikes":1}` — aggressive gene-loss selects lean tall plants (meanH 10.1, meanPlan 26). Elegant forms.
- `{"minExpression":0.9}` — no collapse, but brutal immature attrition (21k immature deaths) with zero dynamic payoff. Skip.

## Recommendations

1. **Promote gated fertility into godsroll-1.html as dials** (`fertilityLaw` off by default, `fertilityMin`, `fertilityGateTick`): it's the only found source of population dynamics and it strengthens the reroll premise. ~10 lines, matches the prototype exactly.
2. **Consider a "drama" preset**: fertilityMin 5 + mutationChance 0.1 + strikes 2 — knife-edge ecology + followable dynasties + lean forms. Untested as a combo; test first.
3. **Terrain**: keep the prototype, iterate the coupling before promoting.
4. The equilibrium-robustness finding means future "make it alive" efforts should target *laws that store energy/pressure over time* (fertility stores it in litter; water would store it in a cycle), not tuning.

Reproduce anything: `node godsroll-sweep.js '<overrides>' label 20000 [seed]` or `godsroll-exp.js` for the two laws. All runs deterministic.
