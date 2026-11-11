# Coadaptation attack plan — proposal, 2026-11-10

> Executor build contract for Stage 0+1: `coadapt-stage1-spec.md` (exact laws, fixtures, assay
> operationalizations, phase-diagram protocol). Hand that file to the implementing model.

Written by Claude Code after reading `godsroll_exhaustive_handoff_2026-11-10.md` (§§0–2, Appendix A
first, then §§4–13 as evidence) and `godsroll-session-bridge.md`. This is a proposal, not an
approved design. The brief is U21–U23: arbitrary lineages becoming visibly, specifically
complementary through unintentional local natural selection — not Godsroll tuning, not authored
symbiosis.

## 1. The goal in my own words

Greg wants to watch history make meaning: traits that are arbitrary in themselves becoming
specifically valuable because of who they lived beside, over thousands of generations, until two
lineages fit like a glove — and for that fit to be *discovered by the system*, not prescribed.
The game premise (reroll/excavation) and the research question meet exactly here: a reroll is most
meaningful when **relationships**, not just individuals, are historically contingent. Reroll an
interface mutation and a partnership that defined a neighborhood fails to form, or a different one
arises.

## 2. Why Godsroll cannot show it (diagnosis in one sentence)

In Godsroll every plant affects every other plant through a single **anonymous, symmetric,
zero-sum channel: shade**. You cannot coadapt *to* shade — the only evolutionary response is more
height and less overlap, which is why dial-space was dynamically dead (bridge memo finding 1) and
shape-space selectively neutral (finding 2). Coadaptation requires an interaction channel that is:

- **trait-specific** — the effect depends on *which* neighbor (its heritable state), not merely
  that space is occupied;
- **potentially positive-sum** — so there is something to fit toward, not only away from;
- **graded** — partial match gives partial benefit, so selection has a slope to climb.

The fix is not more dials. It is adding a non-anonymous interaction channel. That is the entire
design problem.

## 3. What reciprocal selection requires, mechanically

Five conditions, all necessary (this is my independent synthesis; it agrees with the coevolution
literature the handoff cites — R12–R15, R17):

1. **Relational fitness with a degenerate optimum set.** Fitness must depend on a *relation*
   between A's heritable trait and B's (complementarity), and many (a,b) pairs must be equally
   good. If trait space has one global optimum ("be tall"), you get convergence or an arms race,
   never arbitrary-but-matched. Degeneracy is what makes the outcome contingent — which matched
   pair you get is history.
2. **Gradient.** Partial fits must pay partially (handoff §11.2: test exact gates eventually, but
   the attack starts graded).
3. **Repeated local pairing across generations.** Low dispersal / spatial persistence so lineage
   A's descendants keep meeting lineage B's descendants. **Dispersal is the single most important
   dial for specificity** — high dispersal averages the partner into a population mean and you
   get diffuse adaptation, not pairwise coadaptation. (Geographic-mosaic theory says the same.)
4. **Interaction strength above the drift/competition floor.** The partner channel must be a
   first-order fitness component. A fit bonus grafted onto Godsroll's light economy would be
   noise under 71–77% shade-death. In the testbed, the partner channel should be the primary
   route to reproduction.
5. **Lineage distinctness must be protected by the physics** — see the two design theorems below,
   which I consider the sharpest contribution of this document.

## 4. Two design theorems (hold me to these)

**T1 — The complementarity relation must be anti-reflexive: matches(x, x) = 0 by construction.**
If a genotype can match itself (or its clones), evolution will always find selfing/monoculture,
because your own lineage is the one partner guaranteed to be genetically present nearby. This is
the deep reason the "one universal tiny connector" failure mode (handoff §8.8) wins: a universal
joint is self-compatible. Opposite-color complementarity (U22) has anti-reflexivity *built in* —
nothing is its own opposite. Pure lock-and-key shape matching does not automatically have it.

**T2 — The benefit of matching must be worthless between kin.** T1 can still be dodged at the
lineage level: one genome evolves to produce two alternating complementary forms (template-style
A→inverse(A)→A, handoff §11.1 — one hereditary system, not two coadapting lineages). The
countermeasure is to make the matched benefit a **metabolic** one: what you receive is only
valuable if the partner's metabolism *differs* from yours. Your kin's byproduct is your byproduct
— useless to you. Then self-matching and kin-matching pay nothing, automatically, with no rule
about identity or ancestry. This is why the byproduct idea (§8.7) is load-bearing rather than
decorative: **metabolic complementarity makes monoculture solutions unprofitable by construction.**

## 5. Measurement before mechanism: the coadaptation scorecard

You cannot see coadaptation in a screenshot (§4.4). Before any substrate is built, fix the assays
and score every candidate identically. Four signatures (all map onto §9's methods; the move is to
make the harness the *first deliverable*):

- **S1 Partner-specificity (transplant assay).** Coevolved pair (A₁,B₁) from run 1, (A₂,B₂) from
  run 2 (different world seeds, same laws). Common-garden: A₁×B₁ vs A₁×B₂. Coadaptation +
  contingency predicts sympatric > allopatric. If cross-pairings work equally well, the system
  converged to a universal solution — fit without history (the §11.4 trap).
- **S2 Reciprocity (frozen-partner control).** Both-evolving vs A-evolving-against-frozen-B. If
  frozen-partner runs reach the same fit, there is adaptation but no *co*-adaptation.
- **S3 Red Queen (time-shift assay).** Contemporary pairing vs pairing with the partner's
  ancestor from 50k/100k ticks earlier. Sign and magnitude of the time-shift effect distinguish
  mutualistic refinement from antagonistic chase.
- **S4 Ecology-vs-evolution split (mutation-off, Windrose-style).** Does the relationship persist
  ecologically when evolution stops? Separates a stable exchange ecology from ongoing reciprocal
  selection.

Plus the experiential standard (§9): a new viewer can point at the matched structures. Predeclare
seeds and horizons; report extinctions.

## 6. The staged attack

### Stage 0 — Scorecard + harness spec (half a day)
Write the assay harness interface once, mechanism-agnostic: any substrate exposes
`{step, population, pairWith(partnerPopulation), fitness measures}` headlessly under Node (the
godsroll-sweep pattern already on disk). Deliverable: a runnable scorecard that any Stage 1/2
world plugs into.

### Stage 1 — Minimal coupling testbed: "two dials finding each other" (1–2 days)
The smallest system that can possibly show S1–S3. A 2D lattice (or even 1D ring) of sessile
individuals; each has **one heritable trait on a circle** (hue). Reproduction into nearby empty
cells; fecundity scales with complementarity to physical neighbors: benefit ∝ how close the hue
difference is to 180°, graded. Local dispersal. No bodies, no TBT, no light. Sweep three dials:
interaction strength vs. dispersal distance vs. mutation rate.

Purpose — NOT the product:
- **Cheapest falsification of the whole premise.** If even the frictionless version can't show
  partner-specificity, no geometric dressing will rescue it.
- **Phase diagram**: in what (selection, dispersal, mutation) regime does local pairing lock in?
  Every later geometric version must land inside that region — this converts "would a fit bonus
  register in Godsroll?" from a vibe into a number.
- **Direct test of T1**: variant where self-matching is allowed vs. forbidden — watch the selfing
  collapse (or be surprised).
- Expected money shot, cheaply: run 1 settles on a red/cyan axis, run 2 on green/magenta; both
  internally matched, cross-run transplants mismatch. Arbitrary-but-matched, visible as color.

### Stage 2a — Exchange ecology on simple bodies (the mechanism candidate, held loosely)
Flat 2D for the experiment (resolving §11.6 in favor of real physical contact; the 2.5D baseline
stays for the game). One conserved energy currency (light or equivalent influx). Each organism's
metabolism is tagged by a **heritable hue**; using energy releases a fixed fraction as **byproduct
at its tissue surface**, tagged with its hue. Byproduct usefulness to a consumer ∝ hue
antipodality (graded, anti-reflexive, kin-worthless — T1+T2 satisfied). Conservation: byproduct is
energy already paid for, re-released — no minting on match (loophole §8.8 closed).

"Opposite colors" (U22) then becomes an *evolved outcome* — neighboring lineages drift to
antipodal hues because exchange pays — not a rule about labels (§11.3 respected). Cheating is
possible within the same laws: absorb much, emit little (exploitation), and defense is re-rolling
your hue away — Red Queen for free, no authored predator.

### Stage 2b — Geometry as bandwidth (the glove-fit layer)
Adopt N01's factorial directly: cross {geometry matters / doesn't} × {exchange matters / doesn't}
— four conditions, so we learn whether visible fitting *contributes* or merely correlates.
Mechanism: byproduct transfers across **adjacent surface cells**; shared boundary length = exchange
bandwidth. Now architecture evolves around the partner's architecture — interdigitated canopies,
crevice occupancy, TBT or Windrose-style bud-word bodies (bud-words mutate more coherently;
bridge finding 3). The target image: two interlocked bodies in complementary colors, where the
interlocking is load-bearing. Specificity lives in hue; geometry sets bandwidth — so a "universal
tiny connector" can't carry specificity (risk §8.8 contained). Docking seeds (U22's glom-on
strategy) slot in here as the attachment/dispersal mechanism if persistence of pairs needs help.

### Stage 3 — Port to the excavation game
Whatever passes the scorecard gets embedded in the reroll substrate (keyed per-event dice,
snapshot/replay all exist in godsroll-1). N03's contact-history witness (observational provenance
of which transfers built each seed) is the bridge: it is exactly the tool for finding the hinge
events the reroll game wants players to excavate.

## 7. Alternatives considered and set aside (not forbidden)

- **Pure lock-and-key shape matching as the fitness relation**: no automatic anti-reflexivity;
  coarse mutation steps make the gradient cliff-like; universal-joint risk. Geometry re-enters as
  bandwidth (2b), which is safer and still visibly shape-driven.
- **Explicit template inverse (A builds inverse-A)**: one hereditary system reproducing itself —
  template copying, not two coadapting lineages (§11.1). Legitimate separate experiment.
- **Two named resources / division of labor (§8.6)**: near-predetermined roles; the continuous hue
  circle gives infinitely many "divisions" and lets the system pick one contingently.
- **Discrete RPS 3-class cycle (U23's example)**: an authored 3-cycle under §11.3's own warning.
  The hue circle *permits* cycles (three lineages at 120° mutually semi-matched) without
  prescribing them — if a waste cycle emerges, it will have been found, which is the whole point.

## 8. Positions on the handoff's open questions (§2)

- **Continue Godsroll vs isolated experiment** → deliberately isolated experiment; Godsroll
  untouched; port later (Stage 3).
- **2.5D vs flat 2D** → flat 2D for the science; 2.5D remains the game baseline.
- **What "complement" means** → layered: hue antipodality (continuous, anti-reflexive, specific) ×
  contact geometry (access/bandwidth). N01's factorial decides whether geometry earns its keep.
- **Seed form** → defer to 2b; docking seeds are the natural fit there.
- **Absolute match vs graded** → graded throughout the attack; exact gates testable later.
- **First relationship type** → exchange with exploitation *possible*; engineer neither mutualism
  nor antagonism, measure which arises (S3 distinguishes them).
- **Explicit cross-feeding cycle** → never explicit; permitted by the hue circle.
- **Resource count** → one conserved currency + hue-tagged byproduct. Not two resources.
- **Baseline details retained** → keyed dice / replay / urn mutation machinery: yes. Light/shade
  economy, grace/hardening, litter: not in the testbed; revisit at Stage 3.

## 9. Honest risks

- Hue is 1D; specificity may saturate at "everyone pairs antipodally" with no finer structure —
  then the glove-fit burden falls entirely on Stage 2b geometry, which may select contact *amount*
  not contact *shape* (N04's shuffle test is the probe for exactly this).
- Mutualism may equilibrate (fit achieved, then stasis) — the spiral Greg wants twirling may need
  the exploitation channel to stay live; if cheating is too cheap, the exchange economy collapses
  instead. The cheat-cost dial is likely the hardest tuning problem.
- Stage 1 could succeed trivially (assortative pairing is easy) and mislead; the scorecard's S2
  frozen-partner control is what keeps us honest about reciprocity.
- Thousands of generations × locality = compute; headless-first, browser-second (already the
  repo's pattern).

## 10. What I'd build first, if approved

Stage 0 + Stage 1 in one sitting: `coadapt-0.js` (headless lattice, hue-circle complementarity,
scorecard built in: transplant, frozen-partner, time-shift, mutation-off) + a tiny
`coadapt-0.html` viewer so the color story is visible. Checkpoint with Greg on the phase diagram
before any geometry. Per the collab style: prose first (this doc), small checkpoints, frequent
check-ins.
