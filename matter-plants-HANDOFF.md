# matter-plants — ruleset sketch (next session: implement Phase A)

This is a **falling-sand cellular-automaton game** (coding/generative-art
project). Everything here is grid rules and typed arrays. Keep that framing.

## Where this came from

Brainstormed 2026-07-03 as a **radical simplification of the Phase 1 plant
system** in `evo-engine.js` (tag `phase1-complete` — leave that tag intact).
Phase 1 plants worked but were centrally managed: per-pattern records, a
pattern-level energy ledger, `owner[]` bookkeeping, separate update lists, a
staggered economy scan (a second scheduler), and all-at-once death events.

**Design law for this redesign — no hidden values.** Every rule reads only a
tile and its immediate neighbors. Every piece of state is visible on screen as
a tile. No energy numbers, no records, no owner array, no timers, no ages, no
remembered positions, no color genetics (all plants are just green for now).
If a proposed rule needs any of those, it's the failure mode — reject it.

## The one-line pitch

**Plants are transmuted matter.** Growth converts an adjacent water tile into
a plant tile ("drinking"). Death converts plant tiles back into soil that
falls. There is no economy — the water *becomes* the plant. Conservation is
what the rules do, not a ledger bolted on.

## Tile types (5)

`AIR`, `SOIL` (falls, existing rules), `WATER` (flows/ponds, existing rules),
`PLANT` (living, static solid), `DEAD` (dead plant / skeleton, static solid).

Static solids mean: soil piles ON plants, water ponds IN plant crooks. This is
what produces perched dunes and hanging gardens — matter *caught* on plant
lattices, physically supported, never "remembered."

## The rules (complete list)

All checks are the tile + its neighbors, evaluated only when the chunk is
awake. Probabilities are the tuning knobs — start with guesses, tune in
browser.

- **G — Grow (drink):** a `PLANT` tile with a `WATER` cardinal neighbor
  converts that water tile to `PLANT`, with probability `pGrow` per awake
  tick. (Each conversion is itself a disturbance → wakes the halo → pond
  water flows in to refill → growth self-sustains until local water is gone.)
- **L — Live/suffocate:** a `PLANT` tile touching no `AIR` and no `WATER`
  (all neighbors solid — soil, plant, or dead) becomes `DEAD` in place.
  Immortal otherwise. This is the ONLY intrinsic death: burial kills, and
  the cores of over-dense growth self-prune into interior skeletons (lace).
- **S — Sprout (genesis):** a `SOIL` tile touching both `WATER` and `AIR`
  becomes `PLANT` with tiny probability `pSprout` per awake tick. (Phase A
  has no seeds and no heredity — plants arise where wet soil meets air.)
- **F — Fall/crumble:** a `PLANT` or `DEAD` tile with **zero solid neighbors
  (8-way)** becomes a falling `SOIL` grain. (Deliberately permissive:
  mutually-touching clumps can float if severed — connectivity checks are
  nonlocal, and floating remnant clumps were judged charming, not a bug.
  See open decision #1 for the stricter alternative.)
- **R — Rot (optional, Phase A.5):** a `DEAD` tile adjacent to `WATER`
  becomes falling `SOIL` with small probability `pRot`. Gives skeletons a
  finite life near water; without it they persist until undermined.

That is the entire plant system. No other plant code should exist.

## Death choreography (why it looks good)

Immortal-until-disturbed: plants only die when something happens to them
(buried, drowned-into-solid, undermined, eroded). A big plant dies piecemeal —
skeleton stands at full height, crumbles grain by grain, falling grains get
caught on remaining lattice and living neighbors → perched dunes at height,
water threading through them; when the last support rots, the whole thing
avalanches via ordinary sand rules. No death event code at all.

## Conservation (trivially checkable)

Every rule is a 1:1 tile conversion, so **total non-air tile count is
constant** modulo explicit rain input. Ledger check for the harness:
`soil + water + plant + dead === initial + rained`. Note the world slowly
accretes matter over eons (rain in, water → plant → soil, no outflow).
Accepted for now — same accretion model Phase 1 used. Do not add evaporation;
it's been explicitly rejected as a direction.

## Performance model

One scheduler: the existing chunk wake system, nothing else. Every rule fires
only on wake events (water arriving, a conversion, a fall). A settled world —
even one crammed with mature plants — is fully asleep and costs ~zero.
Corollary worth stating: **growth only happens while water moves.** Plants
grow when it rains and go still in stillness. That's the performance
guarantee and the aesthetic, on purpose. No pattern lists, no staggered
scans, no lazy accrual — delete all of it.

## Expected emergent behaviors (what to look for in the spike)

Omnidirectional growth (no light rule → sideways creepers, overhang danglers,
pond-edge rings that drink ponds down), underwater growth (seaweed — rule L
counts water as breathable), self-pruned lacy interiors, standing skeletons,
perched dunes, avalanche collapses, stacked gardens on elevated pools.
Millefleur crowding should emerge from omnidirectional growth in the normal
side view — no top-down/isometric change needed (that idea was explored and
set aside; the seed-remembers-its-height variant was rejected as hidden
state).

## Open decisions (flagged, not resolved)

1. **Support rule strictness** — 8-way any-solid-neighbor (permissive,
   floating clumps allowed) vs. three-cells-below (strict, no overhanging
   growth survives). Start permissive; revisit visually.
2. **`pGrow` / `pSprout` / `pRot` values** — tune in browser first, then lock
   into the harness.
3. **Does DEAD crumble to soil or sometimes water?** Soil for now (dune
   aesthetic); water-return only if long runs starve hydrologically.

## Phase plan

- **Phase A (next session):** implement the 5 rules in a NEW file (Greg
  versions by filename — suggest `matter-plants-1.js` + `.html`), borrowing
  the chunk engine, sand/water rules, harness skeleton, and PIXI shell from
  `evo-engine.js`. Do not modify `evo-engine.js`. Headless acceptance: long
  run, conservation holds, chunks sleep at rest, no runaway solid-green fill
  (rule L should self-prune; verify).
- **Phase B (later):** minimal heredity — seed grains as a falling tile type
  carrying one small lineage integer; growth direction biased by
  `hash(lineage, neighborhood)`; mutation = bit flip on seed creation. ONE
  integer of non-visible state, added only after Phase A ecology looks right,
  and only with Greg's sign-off (it bends the no-hidden-values law).

## Housekeeping

- Commit at checkpoints, frequently. **Never `git push`** — terminal auth is
  broken; Greg pushes via GitHub Desktop.
- This session couldn't run shell commands at all (tooling safeguards kept
  tripping); nothing here has been executed or verified against the code.
  Next session: re-verify `node evo-engine.js 1337 10000` is still green
  before starting, if shell access works.
