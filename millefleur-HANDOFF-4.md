# millefleur — HANDOFF 4 (v2 built: functional organs, 2026-07-11)

Read `millefleur-HANDOFF-2.md` (map) and `millefleur-HANDOFF-3.md` (the v2
design rationale + simplant 1M-tick findings) first. This doc records the
implementation of that decided design in **`evo-engine-millefleur-4.js/.html`**
(fresh fork; `-3` stays frozen as the topology-roles baseline) and the
clarifications Greg gave on the open items.

Housekeeping (unchanged): version by filename; commit at checkpoints;
**never `git push`** (Greg pushes via GitHub Desktop); prose design talk
BEFORE code; small checkpoints, check in often.

**NAMING RULE (Greg): the organism is a "plant"; "flower" means only the
flower organ.** UI and docs updated accordingly.

## What -4 implements (HANDOFF-3 items 1–8, all built)

- Organ genes: terminal gene values **8 = LEAF, 9 = FLOWER** grafted onto
  the triplebit alphabet; decode treats >= 8 as childless terminals (guard
  needed: 9 = 0b1001 would otherwise decode a phantom left child).
- Gene 0 pinned to 0b010 and mutation-exempt (FORCE_SEED_STALK): the first
  cell above the seed always grows straight up; the root's forward bit can
  therefore never be pruned, so genomes never shrink below length 2.
- Leaf = aestheedlings' two-stage teardrop: anchor + two 3-cell stages
  along U+D where U = stem's forward, D = slot direction; forward-slot
  leaves lean deterministically left. All-or-nothing per stage.
- Flower = unchanged all-or-nothing 8-ring bloom (petal code kept factored
  for the future "petals exempt from the one law" flag).
- Maturity gate order: skeleton (one cell/tick) → leaf stages (one 3-cell
  stage/tick) → blooms (one ring/tick) → immortalize → only then energy.
- Economy (austere, per Greg's clarification): **energy is computed ONCE
  at immortalization** — each leaf cell's open cardinal sides scored by the
  graduated table [0, .5, 1, 1.5, 1.5] × ABSORB_COEFF 0.02 (≈ simplant's
  expected income) → a static `energyRate`. Banked energy thereafter is
  `rate × age − spent`, pure arithmetic, nothing iterated per tick.
  Exposure is frozen at maturity: later crowding doesn't dim an old plant
  (accepted trade-off). Graduated (not the ≥3-open rule) because tapestry
  density means partial exposure must pay, else dense forms are sterile.
- Reproduction: each flower runs simplant's two-phase cycle against the
  plant's shared bank — conceive child genome at energy ≥ G, launch at
  ≥ G + childG paying childG (else-if, so ≥ 2 ticks per seed per flower).
  Seeds launch airborne straight FROM their flower; crawl-to-tip dropped.
  Multiple flowers = parallel cycles = real throughput. Global
  SEEDS_PER_TICK scheduler + rejection sampling deleted;
  directSuccesses bookkeeping kept (feeds the decay clock).
- **One clock, one death:** decay-of-the-fruitless is the only mortality —
  ON by default now (auto window = 2 × world area; `?decay=0` restores
  completion mode, `?decay=N` sets the window; key `d` toggles). Leafless
  (rate 0) or flowerless plants are simply sterile; their lineage clock
  never refreshes and decay reclaims them. No starvation clock.
- Mutation, organ-aware: on an organ gene 50% flip type / 50% demote to
  bare twig (0); on a bare twig P_ORGANIFY=0.5 promotes to leaf/flower
  (50/50), else normal slot-bit mutation; stems get the classic bit flip.
  Amputation safety unchanged — a bit-clear under a non-empty child
  (organs count, geneBits > 0) is a no-op, so organs are removed via
  demote-then-prune, mirroring the twig stepping-stone on the way in.
- Founder `[2, 7, 8, 2, 2, 9, 8]`: stalk, two side leaves, flower on top
  (tall enough that the ring clears the teardrops). 27 cells mature.
- Palette DECIDED (open item c): keep the soft additive full-spectrum hash
  (similar genomes ≈ similar colors). Petals carry the lineage color;
  leaves hashed within a green band; stems olive; centers cream.

## Headless results (240×135 unless noted; all PASS)

Endless ecology (default decay), 400k ticks, seeds 14/42/777:
- Steady state ~330–370 standing plants, ~29% fill, ~1.6–1.8 seeds
  emitted/tick, 760–810 decayed per run, zero uniqueness violations,
  ~4–5s wall time.
- Organ census (seed 14): flowers/plant 0 × 70, 1 × 255, 2 × 5; leaves
  0 × 20, 1 × 168, 2 × 109, 3 × 30, 4 × 3. So ~21% of standing plants are
  sterile dead-ends awaiting the decay clock — by design, but a number to
  watch aesthetically.
- Champions (most direct successes) are minimal economical bodies: 3–4
  stem stalk, ONE basal teardrop leaf, ONE crowning flower (~19 cells,
  rate ≈ 0.08/tick). Multi-flower forms exist but haven't won yet — ring
  clearance is expensive. Same pressure v1 had, now economic not absolute.
- Genome-length ratchet is tame here (~12 → ~13 over the run) — space +
  fully-unfold law check simplant's unbounded growth, as predicted.

Completion mode (`decay=0`), seed 14: genuinely COMPLETEs at 229,625 ticks,
325 plants, 27.3% fill — the -3 completion machinery is intact. Note the
footprint/genome gradients run bigger-later (22 → 30 cells) as in v1.

Browser is NOT yet visually reviewed by Greg — that's the next step.

## FUTURE — Greg's weakly-held thoughts (recorded 2026-07-11, NOT decisions)

Goal stays: softly encourage more complex plant forms. The only
local-environment forcing function today is physically fitting the space.
Candidate future lever: **directional light** — e.g. sunlight falls
straight down, worth 2 energy, attenuating (to 1?) when it passes through
another plant on the way down. Tension Greg flagged himself: top-down
sunlight implies a straight side-view world, but the Fra Angelico 3/4
perspective means light should fall equally on every pixel — the two
framings conflict, unresolved. Explicitly weakly-held options, not
directives; nothing to build yet.

## Open / next

- Greg's visual review of `evo-engine-millefleur-4.html` (fresh eyes on
  leaf shape, bloom clearance, decay churn, palette).
- Aesthetic knobs if wanted after viewing: sterile-plant share (~21%),
  P_ORGANIFY, ABSORB_COEFF pacing, decay window, 4-cell single-stage leaf
  fallback, diagonal-X petal variant.
- The one-off vm inspector (organ census + ASCII champion renders) lives in
  the session scratchpad only; ~80 lines, trivial to recreate (eval the
  source in `vm` with fake `process.argv`, then query `immortals`).
