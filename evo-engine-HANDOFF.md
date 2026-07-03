# evo-engine — session handoff (Phase 1 done → Phase 2)

This is a **falling-sand cellular-automaton game**, a coding/generative-art
project. Everything below is grid rules, typed arrays, and per-tick cost
budgets — the "plant" tiles are just a growth automaton like the sand and
water tiles. Keep that framing.

## Where things stand

`evo-engine.js` / `evo-engine.html`. Tagged milestones:
- `phase0-complete` — soil + water falling-sand rules on a chunked, sleeping grid.
- `phase1-complete` — a growth automaton ("plant" tiles) with tiny bit-string
  rulesets that mutate and spread. **This is the current HEAD.**

Recent commits (local only — Greg pushes via GitHub Desktop, terminal auth is
broken, so **commit but never `git push`**):
- `9118820` Phase 1 growth automaton
- `f785759` harness baseline fix
- tag `phase1-complete`

## The engine in one paragraph

1024×1024 grid, divided into 64×64 chunks. A chunk is only processed on a tick
if something moved in/near it last tick (`activeNow`/`activeNext` double-buffer;
`wakeCell` marks a 3×3 chunk halo). A settled world costs ~zero per tick
regardless of size — this active-set/sleeping-chunk design is the core
performance win. All state is flat typed arrays, no per-cell objects.

Two run modes:
- `node evo-engine.js [seed] [ticks]` — headless growth harness with a
  matter-conservation ledger and pass/fail criteria (default 100000 ticks).
- `node evo-engine.js phys` — the phase-0 physics-only regression test.
- Browser: `evo-engine.html`, PIXI rendering, paint brushes on keys 1–4
  (1 water, 2 soil, 3 erase, 4 seed), r/p/space/f/c controls.

## What Phase 1 added

The growth tiles are **ownership patterns over the grid**: a `Uint32 owner[]`
array names which "plant" record owns each grown tile — there are NO per-cell
objects or sprites (the whole point).

- Ruleset = a triple-bit string decoded into a small branching tree (3 slots
  per node: left/forward/right relative to the tile's facing). Ported from
  `simplant-20.js` (`decodeGenomeToTree`, `mutateGenome` → renamed
  `decodeGenome`/`mutateGenome` in evo-engine).
- Point mutation toggles one slot bit; length drifts ±1. Color is hashed from
  the bit-string so related patterns look related.
- Economy (all in "energy" units): income = count of empty cardinal neighbors
  that are **air** (so water, burial, and crowding all reduce income through
  one uniform rule); flat upkeep per tile; each new tile costs energy; at an
  energy threshold the pattern spends 4× its bit-string length to launch a
  drifting "seed" tile.
- End-of-life: every tile of a pattern turns to SOIL in place — matter is a
  closed ledger, never deleted, so terrain accumulates history. Seeds that
  fail to sprout also become soil.
- Cost model: patterns + seeds update from **lists**, never chunk scans. The
  economy scan runs every 8 ticks, staggered by id, so a fully-grown static
  pattern is ~free. A world full of them leaves the chunk system as quiet as
  bare rock.

## Phase 1 acceptance (100k ticks, seed 1337) — PASSED

40 starters → 461 patterns (3486 tiles), 16003 spawns / 15542 end-of-life,
574 distinct bit-strings seen, mean length drifted 4.0→10.8, matter conserved
exactly (soil = 141851 initial + 121619 accumulated), 25/256 chunks awake,
0.46 ms/tick vs a 2.59 ms fully-active baseline. No die-off, no runaway.

## Known gotchas / open questions

- **Water never evaporates** (strict monochromatic flow rules), so sustained
  rain films the whole surface and blocks all sprouting (which needs
  soil-below + air-above). The harness rains only 120 ticks. Growth is
  currently confined to high/dry ground.
- **Population had not plateaued at 100k** — still climbing, capped only by the
  ~75 available dry columns. So the "mature static world at rest" steady-state
  is implied by the design but not directly exercised yet.

## Phase 2 candidates (pick one to start)

1. **Soil moisture + evaporation** — let water seep into soil and dry out,
   opening far more sproutable niche and closing the water/growth loop. Directly
   addresses the biggest current limitation.
2. **Richer resource model** — port the graded absorption from `absorption-18.js`
   (income tiers by exposure, distance bonuses) for more interesting selection.
3. **Path-keyed urn rulesets** — the more novel genetics mechanic from
   `urn-plants` / `colorless-green-ideas.md`, replacing the flat bit-string.
4. **Bounded carrying-capacity test** — fill a small world to saturation and
   verify the at-rest steady-state cost is truly ~zero between events.

North-star docs: `plant_simulation_project_intent.md`,
`colorless-green-ideas.md` (§7 resolved architecture), `PROJECT-CATALOG.md`.
