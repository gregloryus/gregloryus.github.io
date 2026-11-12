# coadapt — handoff / entry point (updated 2026-11-12)

Start here. This is the routing doc for the coadaptation project (the successor line to
Godsroll — `coadapt-2` is functionally "godsroll-4": same reroll/keyed-dice/snapshot machinery,
new metabolism). Everything is committed on master, ~30 commits tagged "coadapt".

## The question

Greg's U21–U23 (see `~/Downloads/godsroll_exhaustive_handoff_2026-11-10.md`, Appendix A):
can arbitrary lineages become visibly, specifically complementary — "fit like a glove" —
through unintentional local natural selection, under shared simple laws, with the reroll /
possible-history game mechanic on top? Shape should be the main driver of fit; color a bonus.

## Reading order for a fresh instance

1. `coadaptation-attack-plan.md` — diagnosis (Godsroll's shade economy is anonymous/zero-sum,
   can't carry coadaptation), the two design theorems (T1 anti-reflexivity: nothing may match
   itself or selfing wins; T2 kin-worthlessness: the matched benefit must be metabolic), the
   4-assay scorecard, the staged plan.
2. `coadapt-0-findings.md` — Stage 1 (hue-circle testbed) results: selection/contingency/
   specificity/lock-in/twirl all demonstrated with controls; measurement lessons (saturated
   arenas are fitness-blind; never read R2 without R1; neutral baselines are nonzero and
   population-size-dependent).
3. `coadapt-1-findings.md` + addenda 1–3 — Stage 2a/2b (bodies + byproduct exchange):
   geometry dividend via absorbCap; matched-face exposure law; nursery-gate failure modes
   (obligate-before-sorted collapse; sibling crowding).
4. This file's "current best regime" below (the grip law postdates the findings addenda).
5. `coadapt-stage1-spec.md` — executor-grade spec patterns (fixtures, determinism contract,
   assay operationalizations) if building anything new.

## Artifacts

- `coadapt-0.html` — Stage 1 hue-lattice testbed + archipelago (viewer; core in COADAPT CORE
  markers). `coadapt-0-tests.js` (11 fixtures), `coadapt-0-sweep.js`, `coadapt-0-assay.js`,
  `coadapt-0-gallery.html` (self-contained), results in `coadapt-runs/`, `coadapt-assays/`.
- `coadapt-1.html` — Stage 2 body substrate (TBT-tree bodies, hue-tagged byproduct exchange,
  all laws as dials). `coadapt-1-tests.js` (10 fixtures), `coadapt-1-exp.js` (factorial),
  `coadapt-1-frontier.js`, results in `coadapt1-runs/`.
- `coadapt-2.html` + `coadapt-2-ui.js` — Stage 3 excavation build: snapshots, rewind scrubber,
  click-select + lineage chain, reroll genes/journey per birth, ghost overlay of the abandoned
  timeline. `coadapt-2-tests.js` (5 reroll-contract fixtures: past-invariance, locality,
  stream independence, snapshot-under-rerolls, lawful reconvergence).
- All three viewers: dials panel + paste-a-cfg box; seed box / restart / new world.

## Current best regime (coadapt-2 default) — the GRIP LAW

Transfer efficiency between two organisms = min(1, sharedFaces/gripN): one touching face
leaks, a body that conforms to its partner's outline earns full flux. Shape = magnitude of
reward, hue = sign (kin worth zero; T1 intact). Crucial co-requirement discovered: grip alone
only taxes — partnership quality can't evolve against transient partners. STEREOTYPED bodies
(muTree 0.05: shapes become persistent lineage-level targets) are the precondition (same
principle as Stage 1's "repeated local pairing," at the level of anatomy; cf. morphological
conservatism of real coevolved partners). Result at 40–50k ticks, 2 seeds: cA 0.030–0.057
(spatial partner-assortment, 2× best of any earlier regime), flux 12–15% of the whole economy
through complementary interfaces, R1 ≈ 0.05 (no monoculture), ~90 persistent forms,
paired% 25–36 (fraction of organisms holding a ≥3-face matched embrace).
Preset: `{"keep":0.75,"emit":1.5,"absorbCap":1.5,"seedCost":96,"lifespan":192,
"lifespanPerCell":12,"exposurePow":1,"upkeep":0.05,"dieback":1,"dockReserve":48,
"seedFrom":"tip","gripN":3,"muTree":0.05}`

## How to read a running world (hard-won)

- **flux%** = direct selection meter (can't drift; kin byproduct worth 0 by construction).
- **R1 beside R2 always**: drift gives R1 ≈ R2 (one hue blob); selection gives R1 ≪ R2
  (antipodal pair). Neutral R2 alone reaches 0.2–0.45 in small populations — never cite it.
- **paired%** = the glove-fit meter. **cA** = arrangement beyond the histogram (punishes
  sibling adjacency — a known limitation).
- Controls are one dial away: `emit:0` kills the economy; `gripN:0` removes the shape law;
  `kernelMode:"self"` demonstrates T1 by collapsing to monoculture.

## The recurring failure pattern (do not rediscover)

Three independent instances: strong upkeep → extinction cascade; strong nursery gate →
bootstrap collapse/monoculture; mild nursery gate → sibling crowding (kin pile at good dock
sites, cA negative). The law: **obligate partnership cannot precede sorted diversity —
mutualism must start facultative** (cf. handoff R15). Any new partner-dependence law must be
graded and survivable alone.

## Open frontier / queued next

1. Sibling dispersion (scatter same-parent seeds) — the tested diagnosis for the remaining
   kin-crowding drag on cA.
2. Long runs (200k+) in the grip regime: do conforming shapes visibly specialize per partner
   form? (The glove-fit image, finally literal.) Body transplant assays (S1-style, match-metric,
   growth-phase window) rerun in THIS regime — the earlier attempt used a degraded regime.
3. Litter/memory channel port from godsroll so rerolled histories can't silently reconverge.
4. Archipelago on bodies (exists only in coadapt-0).
5. Greg's aesthetic bar is the real target: worlds still read as dense mosaics, not couples.
   The obligate sparse regime (`coadapt-1-findings.md` addendum, point-v2) is the most legible
   "only matched pairs survive" display; a tree-bodied version is unexplored.

## Working style (non-negotiable)

Fixtures before experiments; controls before claims; predeclare pass criteria; extinction is
data; commit at every green checkpoint; prose findings docs per session; Greg's inputs are the
source of truth and all of the above is revisable against them.
