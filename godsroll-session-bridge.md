# Godsroll — session bridge memo (Nov 9–10, 2026)

Companion to `~/Downloads/godsroll_exhaustive_handoff_2026-11-10.md` (the other AI's handoff). That document covers the design history, prior-project catalog, and the new coadaptation research question. THIS memo lists what the Claude Code session that built Godsroll leaves on disk, so a fresh instance doesn't rediscover it.

## Artifacts (all in repo root unless noted)

- `godsroll-1.html` — the canonical rewind/reroll build per `godsroll-rule-card.md`. Full history/reroll machinery: keyed per-event dice (seed identity = hash of parent identity + flower path + ordinal; survives genome rerolls), snapshot+replay rewind, history branching with reroll inheritance, save/load, lineage panel, parent-compare at same tick. Laws accumulated during play-testing (all dials): fullSun+shadeGrace, haloShadow (dilated shadows), sunGrowth (no building into shade), haloSelf (arc-clear mutations), haloOthers (crown shyness), litterProjected, seedLitter off, fertilityLaw/terrainLaw (off by default), litterNorm rendering with smoothed bounds, aerial-perspective depth colors, `?cfg=` URL overrides.
- `godsroll-2.html` — adds exposureAbsorption (energy = lit × open faces) + upkeep 0.5/cell/tick (starvation death).
- `godsroll-3.html` — adds leaf/flower tip specialization (heritable y bit: leaves absorb ×3, cost ×3, don't reproduce). Organ differentiation confirmed (t5000: 3633 stems / 531 leaves / 392 flowers).
- `godsroll-smoke.js`, `godsroll-tests.js` — 49 headless checks: replay identity, snapshot-restore identity, reroll independence, litter ledger conservation, urn-vs-oracle statistics, TBT facing fixtures, forgetting, spill, journeys. All passing as of last run. `GR_SRC=godsroll-N.html` env selects the core under test (sweep harness only; smoke/tests read godsroll-1).
- `godsroll-sweep.js` — metrics harness (popCV, genomes, domShare, meanPlan/meanH, deaths-by-cause, avalanche hist) + PNG snapshots. `godsroll-exp.js` — legacy law-patch harness (its patches no longer match the current core; laws since promoted into godsroll-1).
- `sweep/` (~40 runs), `godsroll-gallery.html`, `godsroll2-gallery.html` — browsable results with live links.
- `godsroll-overnight-findings.md` — sweep conclusions.
- `godsroll-rule-card.md` — declared policies; partially stale (predates exposure/upkeep/organ laws; colors changed since).

## Empirical findings a fresh instance should not re-derive

1. **Dial-space is dynamically dead**: across ~35 configs, population CV stayed 0.04–0.12. Shade-death is an instant density regulator. Only *laws that store pressure* broke the flatline: gated fertility (fertilityMin 5 → CV 0.19, and world-seed-dependent extinction — a knife-edge regime that makes rerolls matter).
2. **Shape-space is mostly selectively neutral** in godsroll-1/2: every lit cell earns equally (v1) and even exposure-pay (v2) is weakened because the haloSelf arc law already forces airy bodies, and (pre-upkeep) inefficiency was never lethal. This matches the handoff's independent diagnosis.
3. **Why sampler/simplant forms look "intentional"** (from code): (a) genes are multi-cell strokes, not single cells; (b) sampler's top mutation (20%) is subtree *duplication* with a new angle — repetition motifs; (c) 8 directions. Recommended but unbuilt: duplication mutation (TBT-compatible), seasonal sunlight sine (~2k-tick period) for temporal strategies.
4. Terrain law (litter as elevation) works mechanically but the ridge→shade→death feedback is weak (spill flattens piles).
5. Abelian-sandpile geometric patterns won't appear under random spatial deposition + threshold-2 spill (user confirmed suspicion; it's noisy diffusion).

## Status of the user question driving the pivot

Greg's underwhelm is specifically about shapes lacking purpose and absent coevolution. The handoff's U21–U23 (complementary/glove-fit lineages) is the live research question. Nothing in this repo demonstrates it; closest prior art per the handoff is Millefleur Windrose (shape-routed shuttle ecology with mutation-off causal assays).
