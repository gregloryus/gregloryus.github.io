# Godsroll — Executable Rule Card

Nov 9, 2026. Fixed implementation policies for the MVP (`godsroll-1.html`). These are the choices the spec leaves open, declared before building. They are constants of a history: changing any of them starts a new run.

## Resolved design decisions (Greg, Nov 10, round 2)

- **Arc-halo law (`haloSelf`, default on):** a mutation may only add a gene whose forward arc — L, L-up, up, R-up, R relative to the new cell's facing — is clear in the blueprint at insertion time. Applies to the urn's fill eligibility and to recursive [0,0,1] descendants. Deliberate deviation from the spec's "no clearance halos," by Greg's instruction, for body legibility.
- **Crown-shyness law (`haloOthers`, default on):** physical growth requires the target's 8-neighborhood (same row) to contain no cell of another plant — the same rule sampler-24 and simplant-20 used. Blocked buds wait.
- **Sky is always the top 20% of the screen** (`skyFrac` 0.20); the portrait top-square rule is dropped.
- **Depth colour:** per-row-back shift is `depthBlueStep` 5 (blue up, capped) plus `depthGreenStep` 0.7 (green down, floored) so rows stay distinguishable past blue saturation.
- Lineage records live with the history, outside snapshots; physics never reads them. On branching, only records with releaseTick < branch tick are copied.

## Resolved design decisions (Greg, Nov 9)

- **Mutation:** slot-first, single depth-weighted urn over all eligible slots (empty and filled together); no grow/cut coin. A coin mode exists as a toggle, default OFF.
- **Starting dials:** Build Plan set — cell cost 8, seed cost 96, grace 16, store 128, lifespan 256, sunlight 1/tick.
- **Histories:** every history stored (world number + ordered reroll list each); UI is a flat history list plus current-vs-parent same-tick comparison. No tree visualization in MVP.
- **Energy:** plant-wide pool (explicitly permitted abstraction). Declared honestly: no claim of one-cell-per-tick causal locality.

## Tick phase order

Phases run in this order; each completes before the next. Within a phase, iteration is in canonical order (plants by id ascending; cells/buds/flowers in genome preorder L/F/R). All conflicts are resolved collect-then-commit so results are independent of iteration order.

1. **Occlusion.** Rebuild the per-screen-cell front map: at each screen cell, the living cell with the largest ground row g among those projecting there is lit; all others are shaded. Flying seeds never occlude.
2. **Capture.** Each lit living cell adds `sunlight` (1) to its plant's pool. Pool capacity = `cellStore` (128) × living cell count; overflow is discarded (the only energy loss from a living plant).
3. **Growth.** For each immature plant: every active bud (built cell, gene calls for a child in a slot, physical target free) is a candidate. Candidates are granted in canonical order while the pool covers `cellCost` (8). Cross-plant contests for one physical cell (same row): all attempts collected first, winner chosen by abiotic dice, losers wait without spending. New cells are inert this tick; they capture, occlude, bud, and count from the next tick (one-tick activation delay).
4. **Reproduction.** Each hardened plant, flowers in preorder, one attempt per flower per tick while the pool covers `seedCost` (96). The seed's genome is settled at release: parent's post-forgetting baseline (baked at hardening) + this seed's own mutation roll. Launch position derives from the flower's drawn position per spec §9.
5. **Seed journeys.** Every flying seed takes its next step (front/back over-steps consume budget in place; left/right wrap). Seeds whose budget is exhausted attempt establishment: 3×3 lit-ground test (or center-only per toggle). Contested cells: collect all attempts, abiotic dice picks one winner; each loser dies and deposits 1 litter once.
6. **Lifecycle.** Immature plants that built nothing in phase 3 advance their grace clock; any successful build resets it. Grace expiry (16) → viability: built / full inherited plan (incl. this individual's mutation, pre-forgetting) ≥ 0.5 → harden, else whole plant dies. At hardening: strike counts update (built→0, unbuilt→+1; 3 strikes prunes gene + subtree, clears parent bit; locked base exempt) and the offspring baseline is recorded. Hardened plants age 1/tick; at lifespan (256) the whole plant dies. Dead plants deposit 1 litter per built cell at (x, rootRow).
7. **Spill.** Computed entirely from the pre-phase field: each ground cell with a cardinal neighbor lower by ≥ `spillDiff` (2) sends exactly 1 unit to its lowest such neighbor (ties by abiotic dice). Debits and credits applied together after all decisions. Left/right wrap; front/back closed.

Tick counter increments after phase 7. "Same tick" comparisons mean identical post-phase-7 state.

## RNG and event identity

All randomness is `hash64(worldSeed, streamKey)` → per-event generator. No shared sequential stream anywhere.

- **Seed identity** (stable across histories and rerolls): the chain (parent seed's identity, flower's gene index in the parent's birth plan, ordinal of this seed among that flower's releases). The founder is identity ⟨root⟩. Identity never derives from genome content or tick number, so it survives an inheritance reroll.
- **Inheritance dice:** key = (seedId, "genes", rerollCount). Covers the ¼ mutation gate, urn draw, and all recursive [0,0,1] descendant sampling. rerollCount starts 0; each player reroll increments it.
- **Journey dice:** key = (seedId, "journey", rerollCount). Covers step budget and every direction.
- **Abiotic dice** (never rerollable): key = (tick, kind, physical location), e.g. ("grow-contest", x, g, z), ("root-contest", x, g), ("spill-tie", x, g). Keyed to where/when, so unrelated events are untouched across histories; a contest that happens differently in a new history is a genuine causal consequence, not stream drift.

## Causal state and replay

A history is exactly: config (all dials + world dimensions + this rule card's policies), world number, and its ordered reroll list (seedId, kind, rerollCount). Any tick is reconstructed by deterministic replay from tick 0; periodic in-memory snapshots (every ~512 ticks, tunable) make rewind fast. Save/load serializes the history definitions only, not world state. Rendering, playback speed, resize, and inspection never touch sim state.

## Declared deviations / interpretations

- Plant-wide pool replaces per-cell storage; spec's optional 64/cell local capacity is superseded by pool cap = 128 × cells (reported as such, not as the spec's local trial value).
- Growth grant order within one plant (canonical preorder when energy is scarce) is an arbitrary fixed convention, recorded here per spec §1 requirements.
- Mutation addition conflict convention: new descendants are reserved breadth-first in L/F/R order against the full inherited blueprint plus already-reserved new cells; blocked targets stay absent.
