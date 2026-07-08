# matter-plants — HANDOFF 2 (after first Phase A implementation)

Read this top to bottom; the original design sketch is embedded verbatim in
the appendix, so this file alone is full context. The project is a
**falling-sand cellular-automaton game** — grid rules and typed arrays only.

## Where things stand

**Phase A is implemented** in `matter-plants-1.js` + `matter-plants-1.html`
(new files; `evo-engine.js` untouched, tag `phase1-complete` intact). All 5
rules (G/L/S/F/R) from the sketch are in, as pure tile+neighbor checks inside
the chunk scan. Conservation is a running per-type tally updated only at
conversion sites; the headless harness recounts the grid and demands exact
equality plus `soil+water+plant+dead === initial + rained`.

- Headless acceptance: `node matter-plants-1.js [seed] [ticks]` (default
  30000; storms every 5000 ticks). **NEVER RUN — no shell access either
  session.** Run it first thing if the shell works.
- Browser: `matter-plants-1.html`, brushes 1 water / 2 soil / 3 erase /
  4 plant, keys r rain, p pause, f fast, space step, c conservation log.
- Small-world mode for legibility: `matter-plants-1.html?size=128` —
  size snaps to the 64-cell chunk grid (so 128 is the "100x100" mode),
  cells CSS-scale to fill the window; rain rate and brush scale down too.

Implementation choices made where the sketch was silent (revisit freely):

- **Wake semantics:** a plant's failed drink roll self-wakes (like soil's
  failed sink), so drinking self-sustains until local water is gone (finite —
  it consumes the water). Failed sprout (S) and rot (R) rolls do NOT
  self-wake, else every wet shoreline would stay awake forever; genesis and
  rot only fire while something else disturbs the chunk.
- **Rule L neighborhood is 4-cardinal** (matches G/S/R); F is 8-way as
  specced. World border counts as solid: it supports (F) but doesn't
  breathe (L).
- Knobs at top of file: `P_GROW = 0.02`, `P_SPROUT = 0.00005`,
  `P_ROT = 0.005`. All untested guesses.

## Greg's browser observations (2026-07-07) — THE DESIGN PROBLEM

Greg watched it in browser and reported:

1. Painting plant gives "a mostly yellow blob with maybe green on the edges."
2. When water settles it "slowly turns all yellow, spreading like a crystal
   or contagion."
3. "I don't see any plant growth — it just colonizes/converts the water in
   the existing shape."

Diagnosis (all three are the rules doing what the sketch says — the sketch
has a gap, this is not an implementation bug):

- The "yellow" is `DEAD` tiles (bone-beige `168,156,128` reads yellow next
  to green). Rule L fires **instantly**: any cell with all 4 cardinal
  neighbors solid dies the tick it's evaluated. A painted blob's whole
  interior suffocates immediately; only the air/water-touching rim stays
  green.
- The "crystal/contagion" is a pond being transmuted in place: plants drink
  the pond, the interior of the new plant mass is all-solid, L converts it
  to DEAD as fast as it forms. Self-pruning works, but with instant onset it
  reads as crystallization, not lace.
- **Plants never grow into air — the ruleset has no mechanism for it.**
  Rule G only converts WATER tiles, so a plant can only ever occupy the
  shape of the water body it drinks. Nothing rises, nothing branches into
  sky. The sketch's "omnidirectional growth / overhang danglers / creepers"
  never happens; you just get pond-shaped green-rimmed masses.

## Candidate directions for next session (not decided — talk to Greg)

1. **Growth into air ("drink-and-reach").** A local, conservation-preserving
   2-neighbor rule: a PLANT tile with BOTH a WATER cardinal neighbor and an
   AIR cardinal neighbor converts the air tile → PLANT and the water tile →
   AIR. Total non-air count unchanged; still reads only the tile and its
   immediate neighbors; the plant visibly grows upward/outward while the
   water level drops beside it. Could replace G or coexist with it
   (probability split: reach into air vs. fill into water). This directly
   answers observation 3 and honors the no-hidden-values law.
2. **Slow down L.** Give suffocation a probability (`P_CHOKE` per awake tick)
   instead of firing instantly, so interiors die gradually and lace forms
   visibly rather than "crystallizing." Cheap, worth doing regardless.
3. **Recolor DEAD.** Bone-beige reads yellow; try gray-brown driftwood
   (~`110,100,88`) so dead lattice doesn't dominate the palette.
4. Then re-tune `P_GROW` / `P_SPROUT` in the 128 world where cause and
   effect are visible.

## Acceptance still owed (unchanged from sketch)

Headless long run: conservation exact, chunks sleep at rest (< 25% awake,
steady ms/tick well under raining baseline), sprouted > 0, grown > 0,
suffocated > 0, no runaway solid-green fill. The harness in
`matter-plants-1.js` gates on exactly these; it has just never been run.

## Housekeeping

- Greg versions by filename (`matter-plants-2.js` if the rule changes are
  big; edits in place if small — ask him).
- Commit at checkpoints, frequently. **Never `git push`** — terminal auth is
  broken; Greg pushes via GitHub Desktop.
- Nothing in `matter-plants-1.js` has ever been executed. First thing, if
  shell works: `node matter-plants-1.js 1337 2000` as a smoke test, then the
  full 30000-tick acceptance, then `node evo-engine.js 1337 10000` to confirm
  Phase 1 is still green.

---

## Appendix: original design sketch (matter-plants-HANDOFF.md, verbatim)

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
