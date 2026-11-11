# coadapt-0 — Stage 1 findings (2026-11-10)

Checkpoint report per `coadaptation-attack-plan.md` / `coadapt-stage1-spec.md`. All code,
runs, and raw numbers are committed: core+viewer `coadapt-0.html`, fixtures
`coadapt-0-tests.js` (10/10 green), sweep `coadapt-runs/` (234 runs), assays
`coadapt-assays/`, browsable `coadapt-0-gallery.html`.

## Bottom line

The minimal testbed **passes its falsification gauntlet**. One heritable hue on a circle +
graded antipodal complementarity + local reproduction is enough to produce, from arbitrary or
even monochrome starting material, a world-specific complementary convention — contingent
(each world picks its own axis), self-stabilizing, ecologically stable without mutation, and
transplant-specific (mixing two independently evolved worlds degrades realized match in
proportion to how far their conventions differ). The glove-fit premise survives contact with
its cheapest possible test. Geometry (Stage 2) inherits a live hypothesis, not a hope.

## The six headline results

1. **T1 (anti-reflexivity) is load-bearing — confirmed by its violation.** The self-compatible
   kernel control collapsed to perfect monoculture (R1 = 1.00). Same laws, same dials, one sign
   flip in the kernel: no partner structure at all, ever. Self-matching ⇒ selfing wins.

2. **Origination: a lineage evolves its own complement.** From a single monochrome founder
   (hue 0), the population split into two antipodal clusters (R2 = 0.99, R1 = 0.03, near-50/50).
   No partner was provided; the lineage diverged into one.

3. **Contingency: every world picks its own arbitrary axis.** Pair structure (bimodality
   R2−R1 of 0.7–0.98) forms across most of dial space, but the axis φ differs across world
   seeds. The *relation* (antipodal) is law-driven; *which* hues is pure history.

4. **Specificity (S1 transplant): mismatch grows with convention misalignment.** Across 15
   world pairs, the realized-match deficit of mixed (allopatric) arenas correlates with the two
   worlds' axis misalignment Δφ at Spearman ρ = 0.679 (predeclared pass ≥ 0.6), mean deficit
   0.029 > 0, monotone: Δφ ≈ 0.02 → no deficit; Δφ ≈ 0.24 → maximal. This is the
   rotation-invariance signature predicted in the spec before any run.

5. **Lock-in: the convention freezes early and hard.** φ is stable to ±0.003 from tick ~1,000
   through 100,000 at N ≈ 2,250. Axis drift variance scales as 1/N (S2 measured wander
   0.0002–0.004 over 100k ticks — quantitatively consistent with drift theory). **Game
   implication: the hinge chance events that pick the convention live in the first ~1k ticks;
   late rerolls cannot flip a locked convention.** Like driving on the right: arbitrary,
   contingent, then self-enforcing.

6. **The twirl (wandering axis, locked spacing) — shown at small N.** At N ≈ 250 with hotter
   mutation (16², mu 0.05, sigma 0.1, 400k ticks), the axis wandered by up to 0.135 (half the
   maximal distance) while R2 stayed ≈ 0.87 and R1 ≈ 0: the convention drifts neutrally, the
   complementarity is continuously maintained by selection. U21's spiral, in one plot
   (`coadapt-assays/wander-demo.json`). Population size is the dial between "frozen
   convention" (large N) and "living twirl" (small N / subdivided worlds).

## Negative results and measurement lessons (as important)

- **Saturated arenas are fitness-blind.** Births-per-capita at spatial saturation equals the
  death rate (≈ 1000/lifespan = 3.9/1k) regardless of match quality — the original S1/S3
  demographic metric returned ≈ 3.80 everywhere. Fitness differences at saturation live in
  *who gets space*, not *how many births occur*. Assays must measure growth-phase rates,
  invasion shares, or realized match (which is what rescued S1).
- **A (assortment) is a transient of the sorting epoch.** It peaks (~0.10) around t = 8–15k
  while hue diversity still exists, then decays to the kin baseline as R2 → 0.98: once
  everyone sits at two tight antipodes, any spatial arrangement matches equally well — the
  histogram *is* the adaptation, and "organization beyond the histogram" rightly vanishes.
- **Neutral baselines are not zero.** Kin clustering makes neutral A ≈ −0.02 (positive A is
  conservative); coalescence drifts neutral R2 up to ~0.24 by 20k ticks (R2 alone never
  evidences selection); R1 is required to tell a matched pair (R1 ≪ R2) from a coalesced
  monoculture (R1 ≈ R2).
- **S3 (time-shift) was null at large N** — correctly so: the axis barely moves in 50k ticks
  at N ≈ 2,250, so ancestors are near-identical partners. The neutral Red Queen is real but
  its clock runs at ~N/mu generations; it shows at small N (result 6).
- **Spatial mixing at the sweet spot (s=8, D=1): ×0.92 of random** — selection nearly erases
  kin segregation (fine salt-and-pepper interleaving of complementary hues), rather than the
  predicted lamellar domains. Prediction partially wrong: interdigitation is even finer than
  block-copolymer stripes.

## What this buys Stage 2

- The phase diagram says where to live: strong s/b0 and tight dispersal D=1–2; mu ≈ 0.01.
- The measurement kit that actually discriminates: R1+R2+φ, match-based (not demographic)
  transplants, growth-phase assay windows, neutral controls at matched dials.
- Two regimes worth exposing as a design dial: large-N frozen conventions (history crystallized,
  legible, reroll-sensitive only early) vs small-N living twirl (ongoing visible coevolution).
  A metapopulation (archipelago of small patches) could give both at once — local twirls,
  global mosaic — and is the natural bridge to Stage 2b geometry.

## Immediate next steps (not started)

1. Stage 2a substrate: bodies on a lattice, hue-tagged byproduct exchange across contact
   surfaces (per attack plan §6), reusing this core's dice/identity/assay machinery.
2. N01 factorial (geometry × exchange) with the corrected assay metrics.
3. Optional cheap wins first: growth-phase S1 rerun (sharper than match-only), archipelago
   wander demo (several 16² islands, weak migration) to watch neighboring conventions diverge
   and collide — likely the single most game-relevant Stage 1 extension.
