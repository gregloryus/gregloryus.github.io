# Thicket

## Design v2 — corrections and first measured results

**Version:** v2 (supersedes v1)
**Date:** 2026-08-22
**Build:** `thicket-01.html`
**Status:** implemented and run headlessly. Everything in Part II below is measured. Part IV is still untested.

---

## Part I — What v1 got wrong

Two errors, both found by running it rather than by reading it.

### 1. The upkeep derivation was wrong

v1 said "a one-cell-thick line has ≈6 open neighbours, a two-thick slab ≈4," and set `upkeep = 5 × photo`. The first figure is right; the second is not. In a two-cell-wide ribbon an interior cell has five body neighbours, not four, so it sees **three** open, not four. And v1 forgot that a bloom earns nothing, so it drags the whole plant's margin down.

At `photo = 0.02, upkeep = 0.10` the ancestor's net margin was about `+0.08` per tick across nine cells — technically positive, but too thin to fund anything. Every plant went sterile and the world was extinct by tick 30.

Corrected prices:

```
photo  = 0.035
upkeep = 0.10

1-thick line, interior cell:   6 open →  0.21 vs 0.10  →  +0.11   comfortable
2-thick ribbon, interior:      3 open →  0.105 vs 0.10 →  +0.005  marginal
3-thick core, middle layer:    0 open →  0     vs 0.10 →  −0.10   lethal
```

The principle from v1 stands — *choose upkeep so the thinnest viable body is the aesthetic you want* — the arithmetic behind it just needed to be done against real configurations rather than an average.

### 2. The claim that bigger bodies pay was wrong

v1 argued: seeds cost energy, total seeds ≈ lifetime net energy, therefore bigger pays.

Total fecundity does scale with size. But **per-cell margin is flat with size**, so a small plant reaches its first bloom far sooner, and in a world with constant mortality the fast replicator wins. Measured: with no consumers, plants converge on **6.0–6.7 cells** and stay there for as long as you run it.

That is "small always wins" reappearing, and v1's reasoning about it was simply not correct. What v1 said about *why* it happens — one selective axis has one optimum — was right. The claimed fix was not.

---

## Part II — The A/B, measured

Same seed, same prices, same ancestor. The only difference is whether the mouth mechanic exists.
World 200×300 toroidal, `drain = 0.35`, 16,000 ticks, two seeds.

| | seed 1 · mouths off | seed 1 · mouths on | seed 7 · mouths off | seed 7 · mouths on |
|---|---|---|---|---|
| cells per plant | 6.0 → **6.5** | 8.4 → **12.5** | 6.4 → **6.7** | 9.3 → **12.2** |
| lineages (effective signature bins) | 1.64 → **1.83** | 3.17 → **7.12** | 1.80 → **1.89** | 5.37 → **5.96** |
| mean seed spread | 12.1 → **12.2** | 12.5 → **16.8** | 12.1 → **12.1** | 14.3 → **17.0** |
| plants carrying mouth tissue | — | 15% → **69%** | — | 41% → **48%** |
| key offset from self | — | 4.0 → **12.3** | — | 8.8 → **14.9** |
| energy entering via mouths | 0% | **7.3%** | 0% | **6.5%** |
| occupancy | ~56% | ~56% | ~57% | ~57% |

### What holds

**P1 — a trophic level appears and persists.** Energy taken from other organisms rises from zero to 6–8% of all income, and mouth-bearing plants go from a mutational curiosity to roughly half or more of the population.

**P2 — consumers increase diversity.** Signature diversity roughly quadruples with mouths on. Without them it barely moves off the ancestral value. This is the Janzen–Connell / negative frequency-dependence signature: nothing can hold ground against its own accumulated enemies.

**P3 — dispersal evolves upward.** Mean seed spread climbs from the ancestral 12 to 17 with consumers present, and does not move at all without them. This was the prediction I was least confident about, and it is the cleanest one in the table.

**The on-ramp works as designed.** Key offset starts at 0 — a new mouth targets its own kind, which is why the mutation is not immediately purged — and drifts to 12–15, meaning lineages move off self-targeting and onto their neighbours. That is the specific implementation detail v1 said the whole thing turned on, and it behaves.

**Size partly fixes itself.** Bodies roughly double once consumers exist. Not because I priced size differently — the prices are identical in both arms — but because a world with an antagonist stops having a single small optimum. That is the v1 thesis surviving the test I did not design it to pass.

### What the control arm shows

The mouths-off world **stops**. Plant count, size, dispersal, and diversity all flatline by tick 4,000 and sit there for another 12,000. It is not slowly improving; it is finished. That is the one-player-world diagnosis, reproduced on demand.

---

## Part III — What is unresolved

**Density fights legibility.** Mouths need contact, and contact needs density. The ecology only stirs at ~55% occupancy, which reads as a dense mat rather than as individual plants. Raising the drain price does *not* fix this — I swept it, and at 20% occupancy the limiter is contact, not price. This is the live tension in the design and I do not have an answer for it yet. Candidates: larger bodies (which mouths already push toward), or a cheaper way to make contact without packing.

**Is the flux oscillation Red Queen or noise?** Mouth flux does not climb monotonically — it goes 4 → 8 → 12 → 8 → 6%. That could be the cycling the design predicts, or it could be drift. Distinguishing them needs the cross-infection matrix and a longer series, neither of which is built.

**Nothing about barriers, isolation, or invasion has been tested.** P4 through P6 are untouched. Those need a much larger world, long runs, and instruments that do not exist yet.

**Two seeds is two seeds.** The direction and rough magnitude replicate. That is all that has been shown.

---

## Part IV — Bugs worth remembering

Four, none of which were visible by reading the code:

1. **Flowers starved before sap reached them.** A bloom earns nothing and was a purely passive sink, so it died within two ticks of opening, the plant went sterile, and the whole world died at once around tick 28. Fixed by making a bud fund the flower before opening it — a flower now ripens, and a plant that cannot afford one waits and eventually dies childless, which is a real selective filter rather than a patch.
2. **Transport was far too slow.** Sharing with one random connected neighbour per tick left a nine-cell plant with 1.9 energy at the base and 0.18 at the tip. Fixed by diffusing across every connected neighbour.
3. **A plant slot freed and reused within one tick landed in the active list twice**, so that plant grew at double rate and the ledger over-counted. Caught by the conservation assertion, which is the argument for having one.
4. **The live-cell list was in birth order.** Every access was a random hit into megabytes. Rebuilding it in grid order each tick was the single largest speedup — bigger than every algorithmic change combined.

---

## Part V — Next

1. **More seeds.** Five or six per arm before treating the table above as a result.
2. **Cross-infection matrix.** Sample lineages, test each consumer against each host in a clean arena. This is what separates coevolution from sorting, and it is the cheapest remaining high-value instrument.
3. **Attack the density/legibility tension directly** — it is the one thing that could make the whole approach unusable for what the field is supposed to look like.
4. **Only then scale up** for barriers, isolation, and invasion. Those need a world big enough for regions, and there is no point paying for that until the above is settled.

Nothing here yet says the invasion arc works. It says the engine that would drive it turns over, and that the same world without it does not move at all.
