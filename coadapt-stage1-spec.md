# Coadapt Stage 0+1 — executor specification (v1, 2026-11-10)

Companion to `coadaptation-attack-plan.md` (read its §1–§5 for rationale; this file is the
build contract). Audience: a capable implementing model (Opus/Sonnet class) that should NOT
re-derive design decisions. Everything here is prescriptive unless marked "dial" or "optional."
Where this spec is silent, choose the simplest auditable option and leave a `// SPEC-GAP:` comment.

**Prime directive:** this is an *experiment*, not a product. The deliverable is trustworthy
numbers. Code must be boring, deterministic, and fixture-tested before any experiment runs.

## 0. Deliverables, in build order

1. `coadapt-0.js` — headless core, same packaging as `godsroll-3.html` lines 40–535: an IIFE
   exporting a namespace, `module.exports` guard at the end so Node can require it. No DOM.
2. `coadapt-0-tests.js` — the fixtures of §7. `node coadapt-0-tests.js` exits nonzero on any
   failure. **No experiment may run until all fixtures pass. Do not weaken a fixture to make
   it pass; a failing fixture means the core is wrong.**
3. `coadapt-0-sweep.js` — phase-diagram protocol of §8. Writes JSONL + PNGs under `coadapt-runs/`.
4. `coadapt-0-assay.js` — assays S1–S4 of §9.
5. `coadapt-0.html` — browser viewer (§11). Loads the same core file (fetch + eval or inline copy
   with a `COADAPT CORE BEGIN/END` marker pair, godsroll-style, so core and viewer can't drift).

## 1. Determinism contract (non-negotiable)

- **RNG:** copy `cyrb128`, `sfc32`, `dice(worldSeed,key)` **verbatim** from `godsroll-3.html`
  lines 76–88. `Math.random()` must not appear anywhere in core, sweep, assay, or analysis code.
  Analysis-time nulls (shuffles) also use keyed dice (keys prefixed `null|`).
- **Identity by birth:** founder ids are `'R'` (single-founder mode) or `'RA'`,`'RB'`
  (two-founder mode). Offspring id = `h[0].toString(36)+'-'+h[1].toString(36)` of
  `cyrb128(parentId + '·' + ordinal)` where `ordinal` is the parent's lifetime birth counter
  (0-based), exactly as godsroll-3 line 356. Never derive identity from genome, position, or tick.
- **Event streams:** per-offspring genes stream `dice(worldSeed, id+'|genes|'+rr.g)`; placement
  stream `dice(worldSeed, id+'|place|'+rr.j)`; destination contests `dice(worldSeed,
  'claim|'+tick+'|'+destCellIndex)`. `rr` = reroll counters, default `{g:0,j:0}`; Stage 1 never
  sets them, but the plumbing must exist (Stage 3 ports this to the reroll game).
- **Canonical order:** wherever iteration order can affect outcomes, iterate individuals by
  ascending cell index (`y*W+x`), and within a tick follow the phase order of §3 exactly.
- **Snapshot law:** `toJSON`/`fromJSON` like godsroll-3. Observational records (§5) live
  OUTSIDE snapshots and are never read by physics.

## 2. World and state

- Torus, `W=96`, `H=96` (dials). One individual per cell, or empty.
- Individual: `{id, x, y, hue, energy, bornTick, ordinalCounter, founderTag, parentId}`.
  - `hue` ∈ [0,1), a point on a circle. The ONLY heritable trait.
  - `founderTag` inherited unchanged from parent ('A'/'B'/'R'). **Physics never reads it.**
- Config defaults (every one a dial):
  `{worldSeed:1, W:96, H:96, b0:1, s:4, w:0.25, seedCost:64, lifespan:256, D:4, mu:0.01,
    sigma:0.05, initMode:'uniform', initN:200, kernelMode:'anti', E0:0}`

## 3. Laws — one tick, three phases

**Phase 1 — income.** For each individual (canonical order), active only if `bornTick < t`:
`energy += b0 + s * Σ_nbr m(hue_self, hue_nbr)` over the 4-neighborhood (von Neumann radius 1,
x and y wrap). Neighbors must also be active. Interaction radius is fixed at 1 — not a dial;
dispersal `D` is the swept locality variable.

**Phase 2 — reproduction.** Each active individual with `energy >= seedCost` makes exactly one
attempt: `energy -= seedCost` (spent whether or not the birth succeeds — no refunds; failed
placement is a real cost and the density regulator). Offspring identity per §1. Target cell:
uniform draw from the `(2D+1)² − 1` cells within Chebyshev radius `D` of the parent (placement
stream; one draw → index). Hue: copy parent; then with probability `mu` (genes stream) mutate
`hue' = (hue + sigma·gauss + 1) mod 1`, where `gauss` is Box–Muller:
`z = sqrt(-2·ln(1-u1))·cos(2π·u2)` with `u1,u2` the next two genes-stream draws.
Collect all attempts; group by destination; a destination that is occupied (by anyone alive at
phase start) fails all its attempts. For an empty destination with multiple contenders, sort
contenders by id (string order) and pick the winner with the contest stream (godsroll root-contest
pattern, lines 391–397). Winner's offspring is placed with `energy = E0`, `bornTick = t`.

**Phase 3 — death.** Any individual with `t − bornTick >= lifespan` dies; cell empties this tick.
Deterministic; no dice. (No starvation, no upkeep: selection acts ONLY through fecundity
differences. Do not add survival selection.)

**Match kernel** (the heart of the experiment — get this exactly right):
`d(a,b) = min(|a−b|, 1−|a−b|)` ∈ [0, 0.5] (circular distance).
- `kernelMode:'anti'` (default): `m = max(0, 1 − |d − 0.5|/w)`. Peaks at antipodal (d=0.5),
  zero for d ≤ 0.5−w. **Anti-reflexivity (plan theorem T1) requires w ≤ 0.5; assert this at
  construction.** m(x,x) = 0 identically.
- `kernelMode:'self'` (control only): `m = max(0, 1 − d/w)`. Peaks at identity. This is the
  deliberate T1-violation control; the prediction is monoculture collapse (§10).

**Initialization** (`initMode`):
- `'uniform'`: `initN` individuals at keyed-dice random distinct cells, hues uniform from stream
  `dice(worldSeed,'init')`. Default for the sweep — measures *organization*.
- `'single'`: one founder `'R'` at (W/2,H/2), hue 0.0. Measures *origination* (slow bootstrap,
  see §10 estimate).
- `'pair'`: founders `'RA'` at (W/4,H/2) hue 0.0 and `'RB'` at (3W/4,H/2) hue 0.5. For S2/S3.

## 4. Derived viability — check before running anything

A lone individual (no partners) earns `b0` per tick, so lifetime solo births =
`floor(lifespan·b0/seedCost)` = floor(256/64) = **4** at defaults. This must be ≥ 2 or the world
dies before interaction structure can form; keep it modest (2–6) so the partner channel
(up to `1+4s` = 17×solo at defaults with four perfect partners) dominates selection.
If you change `b0`, `seedCost`, or `lifespan`, recompute this and keep both properties.
The dimensionless interaction strength is **s/b0** — report it, not raw s.

## 5. Instrumentation (observational; physics-blind)

- Per-individual records map (id → {parentId, founderTag, bornTick, deathTick, birthsSucceeded,
  birthsAttempted, hueAtBirth}), godsroll-records style, outside snapshots.
- Population dumps every `dumpEvery` (default 10,000) ticks to
  `coadapt-runs/<runId>/dump-<tick>.json`: array of `{id, x, y, hue, founderTag, bornTick}`,
  hues at full double precision.
- Metrics every 1,000 ticks appended to `coadapt-runs/<runId>/metrics.jsonl` (one JSON per line):
  tick, population, and the §6 statistics.

## 6. Core statistics (exact formulas)

Let the active population be hues θ₁…θ_N at positions p₁…p_N.

- **Assortment index A** (THE order parameter): mean of `m(θᵢ,θⱼ)` over all realized interacting
  pairs (adjacent occupied cells, each unordered pair once) MINUS the same mean after hues are
  randomly permuted over the occupied positions (20 permutations, keys `null|<tick>|<k>`,
  averaged). Positive A = complementarity is spatially organized beyond what the hue histogram
  alone gives. A ≈ 0 under neutrality (fixture 8).
- **Period-1 resultant R₁ and bimodality** (added 2026-11-10 after first sweep logs): R₂ alone
  cannot distinguish two antipodal clusters (a matched pair) from ONE cluster (monoculture via
  coalescence) — a single tight cluster also has R₂ ≈ 1. Compute `R₁ = |Σ exp(2πiθ)|/N`;
  a true pair cancels (R₁ ≪ R₂), a monoculture doesn't (R₁ ≈ R₂). **Bimodality = R₂ − R₁** is
  the pair-structure indicator; the sweet-spot rule requires meanBimod > 0.2.
- **Nematic order R₂ and axis φ** (this is why the hue model is analyzable: under an antipodal
  kernel the population is a nematic — hues θ and θ+0.5 are the *same* matched structure, so the
  order parameter has period ½):
  `R₂ = |Σⱼ exp(i·4π·θⱼ)| / N`, `φ = arg(Σⱼ exp(i·4π·θⱼ)) / (4π)`, reported mod 0.5.
  R₂ → 1 means the population sits on one antipodal axis; φ is WHICH axis — the arbitrary,
  historically contingent quantity. Misalignment of two worlds:
  `Δφ = min(|φ₁−φ₂|, 0.5−|φ₁−φ₂|) ∈ [0, 0.25]`, 0.25 = maximal mismatch.
- **Local mosaic:** mean local R₂ computed per occupied cell over Chebyshev-radius-8
  neighborhoods, population-averaged. `localR₂ ≫ globalR₂` = geographic mosaic: coexisting
  domains with different axes inside one world (the "local pockets" outcome — report it
  prominently if seen).
- **Cluster means** (two-founder runs): circular mean hue per founderTag; track per 1k ticks.

## 7. Acceptance fixtures (`coadapt-0-tests.js`) — all must pass first

1. **Replay identity:** two fresh runs, same cfg (defaults, worldSeed 7), 1,000 ticks → identical
   JSON-stringified `toJSON()` output.
2. **Snapshot identity:** run to 500, `toJSON`→`fromJSON`, both continued to 1,000 → identical.
3. **Stream independence:** interleaving draws from `dice(1,'a|genes|0')` and `dice(1,'b|genes|0')`
   yields the same sequences as consuming each alone. (True by construction; test it anyway.)
4. **Anti-reflexivity:** `m(θ,θ) === 0` exactly, for 100 keyed-random θ, both kernel widths
   {0.25, 0.5}.
5. **Kernel values** (w=0.25): m(0.10,0.60)=1; m(0.10,0.35)=0; m(0.90,0.15)=0;
   m(0.00,0.45)=0.8; m(0.95,0.45)=1 (wraparound). Exact to 1e-12.
6. **Bookkeeping:** at every 100th tick of a 2,000-tick default run: population === number of
   occupied cells === number of distinct occupied positions; no individual's age exceeds
   lifespan; energy never negative.
7. **Mutation distribution:** 20,000 mutated births (force mu=1) → wrapped circular mean of
   (child−parent) within ±0.002 of 0; circular std within 5% of sigma.
8. **Neutral control:** s=0, initMode 'uniform', 3 seeds {7,8,9}, 20,000 ticks → population
   persists; A < 0.02 (and > −0.1) at every measured tick after 5,000; R₂ < 0.2 at 20,000.
   Spurious POSITIVE A means selection is leaking in through a bug (ordering, refunds,
   placement bias). **Empirical finding (2026-11-10 run): neutral A is genuinely negative,
   ≈ −0.02 — local dispersal clusters kin, kin share hues, and similar-hued neighbors score
   below the permutation null under an antipodal kernel. Kin structure IS the neutral
   baseline. Therefore every sweep/assay A must be read against the matched s=0 control, not
   against zero; selection for complementarity has to overcome kin clustering before A even
   reaches 0.** This also means positive A is a conservative signature. **Second empirical
   finding: neutral R₂ drifts upward by coalescence (observed 0.24 at 20k ticks, seed 9) —
   fewer surviving ancestral lineages concentrate the hue distribution with no selection at
   all. R₂ alone is never evidence of selection; use A and the assays. Fixture bound is a
   sanity R₂ < 0.5.**
9. **Founder clock:** initMode 'single', defaults → founder's first birth attempt occurs at
   exactly tick 64 (income ticks 1–64 at b0=1 reach seedCost 64; reproduction is phase 2 of the
   same tick).
10. **Determinism across dials:** changing `dumpEvery` or metrics cadence changes no state hash
   (instrumentation must not touch physics).

## 8. Phase-diagram protocol (Stage 1 main result)

Main sweep, `initMode:'uniform'`, kernel 'anti', T = 50,000 ticks:
- `s ∈ {0.5, 1, 2, 4, 8}` (b0 fixed at 1, so s = s/b0)
- `D ∈ {1, 2, 4, 8, 16}`
- `mu ∈ {0.002, 0.01, 0.05}`, sigma fixed 0.05
- worldSeeds `{101, 202, 303}` — 225 runs.

Controls: s=0 × 3 seeds (neutral); kernelMode 'self' at (s=4, D=4, mu=0.01) × 3 seeds (T1
violation); initMode 'single' at (s=4, D=4, mu=0.01) × 3 seeds (origination story).

Per run record final A, R₂, localR₂, φ, population, plus full metrics.jsonl. Aggregate to
`coadapt-runs/aggregate.json` and render: heatmap grid of final A over (s, D) per mu (PNG, the
godsroll-sweep pattern), plus one hue-field PNG per run at T (render each occupied cell at its
actual hue, HSL(hue·360, 80%, 55%)).

**Checkpoint rule: after the sweep, STOP and report the phase diagram before building anything
further.** (Collab contract: small checkpoints, prose findings, no feature creep.)

## 9. Assays (`coadapt-0-assay.js`) — operational definitions

All assay arenas: 48×48 torus, **mutation OFF** (we measure the ecology of evolved genotypes,
not re-adaptation), same kernel/dials as the source runs, 5,000 ticks, seeded with 400
individuals at keyed-random distinct cells (`assay|<name>` streams), sampled uniformly WITH
replacement from stored dumps. Performance = (a) births-per-capita over the final 2,500 ticks,
(b) mean realized match m over interacting pairs in the same window.

- **S1 Transplant / specificity.** Sources: K=6 worlds (seeds 11,22,33,44,55,66) at the sweet-spot
  dials chosen from the phase diagram, T=100,000, initMode 'uniform'. Conditions per world pair
  (i,j), i<j: `SYM_i` (all 400 from i), `SYM_j`, `ALLO_ij` (200+200). Deficit(i,j) =
  mean(perf SYM_i, perf SYM_j) − perf ALLO_ij. **Quantitative prediction (the rotation-invariance
  signature):** the laws care only about hue *differences*, so each world's equilibrium is an
  arbitrary rotation of the same antipodal structure; the deficit must therefore increase with
  axis misalignment Δφ(i,j). Pass = Spearman ρ(Δφ, deficit) ≥ 0.6 over the 15 pairs AND mean
  deficit > 0. If all cross-pairings perform equally well AND Δφ values cluster near 0, the
  system converged to one universal solution — fit without history; report as such, not as
  failure of the code.
- **S2 Reciprocity / frozen partner.** initMode 'pair', dials from phase diagram, 3 seeds × 2
  arms: both-evolve vs B-frozen (descendants of 'RB' get mu=0 — the ONE sanctioned use of
  founderTag, and it is an experimental clamp, not physics). Track cluster means θ_A(t), θ_B(t).
  Metrics: (a) tracking — correlation of per-10k-tick displacements Δθ_A vs Δθ_B (both-evolve
  arm; expect strongly positive: the pair drifts as a couple); (b) axis variance across seeds
  grows with t while |spacing − 0.5| stays small — **the "wandering axis, locked spacing"
  signature: WHERE on the circle is arbitrary history, THAT they are opposite is maintained by
  selection. This is coadaptation made visible, and the headline Stage 1 figure.** In the frozen
  arm, θ_A should converge to antipode of the clamp and stop wandering. If both arms look
  identical in dynamics, there is adaptation but no reciprocity — report honestly.
- **S3 Time-shift.** From the both-evolve S2 runs' dumps: assay contemporary A(T)×B(T) vs
  time-shifted A(T)×B(T−Δ), Δ ∈ {10k, 25k, 50k} (200+200 sampling by founderTag). Prediction
  under wandering-axis: deficit grows monotonically with Δ — partners must continually track
  each other even with no antagonism (a neutral Red Queen driven by mutation pressure alone).
  Flat deficit = static equilibrium; still a valid finding.
- **S4 Ecology-without-evolution.** Continue each S1 source world 20,000 ticks with mu=0.
  Pass = persistence and A within 20% of its T value (the relationship is an ecology, not a
  mutation artifact).

Predeclare everything above; run held-out seeds {77,88} only if a result looks marginal; report
extinctions and all arms, including nulls.

## 10. Predictions and interpretation table (read before interpreting anything)

| Observation | Meaning |
|---|---|
| A ≈ 0 everywhere in sweep | Premise fails at these scales — raise s or lower seedCost before concluding; if robust, Stage 2 geometry inherits the burden of proof |
| A > 0, high global R₂, φ differs across seeds (uniform Δφ) | Main expected result: contingent, world-specific coadaptation — proceed to S1 |
| localR₂ ≫ globalR₂ at small D | Geographic mosaic: multiple axis-domains in one world — Greg's "local pockets"; report with hue-field images and domain boundaries |
| kernel 'self' control → single tight hue cluster, high A by kinship | T1 demonstrated: self-compatible matching collapses to monoculture (this control SHOULD "succeed" at clustering — that's the point) |
| 'single' founder: long flat epoch then organization | Bootstrap is mutation-limited; population hue spread ≈ sigma·√(mu·generations), so matched pairs need roughly mu·g ≈ 1 → ~100 generations ≈ 6–10k ticks at defaults. Do not abort early runs as "dead" before ~3× that |
| S2 both arms identical | Adaptation without reciprocity — the honest negative; headline anyway |
| S1 deficit uncorrelated with Δφ but positive | Specificity exists but not via the axis — investigate before claiming anything |

## 11. Viewer (`coadapt-0.html`)

Minimal, godsroll-gallery aesthetic: canvas rendering each occupied cell at its hue
(HSL(hue·360, 80%, 55%)) on near-black; HUD line with tick, population, A, R₂, localR₂, φ;
an "axis clock" — a small circle plotting each individual's hue as a point on the rim (the
nematic condensation and its slow wander are directly watchable there); pause/step/speed;
`?cfg=` URL overrides (godsroll pattern). Complementary partners appear as literally
complementary colors adjacent on screen — the entire result should be legible with no dashboard.

## 12. Executor pitfalls (each of these has silently killed a prior experiment)

- No `Math.random()`, anywhere, including analysis shuffles.
- No fitness term may read id, founderTag, ancestry, or any record. (S2's clamp reads a tag to
  set a mutation rate in an experimental arm; nothing else, ever.)
- Do not refund failed-birth energy. Do not normalize income by neighbor count. Do not add
  upkeep, starvation, or survival selection. Do not cap population except by space.
- Do not "improve" the kernel into rewarding similarity, or widen w past 0.5 (breaks T1).
- Do not seed assay arenas with preserved spatial blocks (that smuggles in inherited
  neighborhoods; random placement isolates genotypic complementarity). A blocks-preserved
  variant is a legitimate optional follow-up, clearly labeled.
- String RNG keys need explicit separators (`|`, `·`) — concatenating bare integers collides.
- If a run goes extinct, that is data. Record it and move on; do not retune and silently rerun.
- Resist adding features. The deliverable is the phase diagram, four assays, and honest prose.
