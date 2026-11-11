# Addendum 1 to Coding Plan v2 — millefleur assessment and two ports

**August 2026.** Read alongside `tbt-oee-coding-plan-2.md`.

## Verdict: fork simplant-20, not millefleur-4

`evo-engine-millefleur-4.js` is the more evolved codebase but the wrong base for
this experiment. Its design decisions serve the tapestry goal and weaken it as an
evolution measurement:

- **Energy is not a live resource.** Unfolding is free; at immortalization every
  cell's open sides are scored once into a static rate that is never spent,
  recomputed, or aged. That is a fecundity multiplier computed from finished
  morphology — closer in shape to a fitness function than simplant's live budget,
  where plants earn, spend on growth, and starve.
- **Adults are frozen.** Skeleton → leaves → flowers → immortalize → seed →
  fade. No within-lifetime response to conditions; no ongoing interaction with
  neighbours beyond occupying space.
- **The economy rewards a chosen shape.** `LEAF_ENERGY_MULT` pays a deliberate
  bonus because the aestheedlings teardrop is the designed form. Defensible for
  the artwork; a thumb on the scale for "forms not hard-coded."

Simplant is cruder and more neutral: live energy, continuous mortality, no organ
bonuses, no target shape. Neutral is what the measurement needs.

## Port 1 — symmetric mutation (do this in build step 2)

`simplant-20.js` `mutateGenome`, around lines 320–325:

```js
if (wasBitSet && targetNode.children[bitIdx] &&
    targetNode.children[bitIdx].geneBits > 0)
  return newGenome;   // ← loaded bit-clear becomes a no-op
```

This is the length ratchet: easy to add a gene, nearly impossible to remove one.
millefleur-4 documents fixing exactly this. Delete the guard so a bit-clear
amputates the whole subtree beneath it, as millefleur's version does.

Root-adjacent amputations stay rare via the existing newer-genes-mutate-more bias
(`Math.max(randInt(len), randInt(len))`), which both files already share.

Watch `meanGenomeLen` in telemetry to confirm the ratchet is gone.

## Port 2 — frequency-dependence skeleton (build step 6)

millefleur's `immortalByKey` (a `Map` of genome key → root positions, with a
radius check) is most of the `FREQ_DEP` implementation already written. It is off
by default there (`uniqRadius = 0`) and keyed to exact genome match, which is the
v1 similarity rule specified in the plan.

Port the map-and-radius lookup pattern rather than writing it fresh. The
difference: millefleur uses it as a hard block on identical standing genomes;
here it becomes a graded germination failure probability.

## Not porting

Organ genes (8 = leaf, 9 = flower), organ halos, maturity gating, immortalization,
lifespan ∝ genome length. All stay out of v1 per the plan's scope discipline.
