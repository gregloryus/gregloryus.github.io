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

## KNOB SWEEP — can tuning encourage complexity? (2026-07-11)

Greg asked for knob values that reward more leaves/flowers. Swept headless
(240×135, 250–300k ticks, seeds 14/42/777; complexity = leaves/plant, %
plants with ≥2 leaves, % "rich" 4+-organ plants, % sterile). **Finding: no
knob robustly raises complexity — seed-to-seed variance (±0.2 leaves/plant)
is as large as any knob's effect, and the deeper attractor wins.**

- **ABSORB_COEFF up = WORSE.** Abundant energy lets minimal plants
  reproduce freely, which fragments space harder and strengthens the pull
  toward small (coeff 2.0: n 329→510, fill 29%→36%, leaves/pl 1.42→1.04).
  The apparent win at coeff 0.1 was a seed-14 artifact — on seeds 42/777 it
  DROPPED leaves/pl to 1.03–1.11 (below baseline 1.26–1.35). Keep 0.02.
- **Shorter decay window / table shape / P_ORGANIFY:** all within seed noise.
- **Germination clearance radius** (force a bigger empty box to germinate so
  tiny forms can't tile tiny gaps — the one lever that attacks minimalism
  DIRECTLY rather than via energy): R=2 nets slightly positive on average
  (leaves/pl 1.34→1.41, rich 5%→7%, sterile 21%→20%, fill flat) but is
  still seed-dependent (seed 14 regresses, seed 42 jumps to 1.65). It
  spaces plants out — a real aesthetic change, sparser tapestry — which
  Greg is happy to treat as a knob. (NOTE: the "GERMINATION_CLEAR_RADIUS=3
  is anti-millefleur" line in millefleur-HANDOFF.md was a PRIOR SESSION's
  note, not Greg's; Greg likes more germination space aesthetically.)

**Root cause (confirms the HANDOFF-3 economics analysis):** fitness ≈
P(offspring fits AND fully unfolds) × emission rate. The P term is binary
(immortalize or vanish) and dominates the slow emission multiplier, so
small reliably beats rich. Energy tuning only changes how fast minimal
plants flood; it doesn't flip the ranking. The economy is a GATE (must have
≥1 leaf + ≥1 flower), not a gradient. **Robustly rewarding complexity needs
a STRUCTURAL change, not a knob** — candidates on the table, awaiting Greg's
aesthetic call: (1) size/richness-gated immortalization (must reach ≥N
organs to freeze); (2) germination clearance as an owned knob (done — see
below); (3) relax the spatial penalty on size (softer outline gap) so big
forms' emission edge can win. Each trades against the sparse-minimal look
differently — a visual judgment, so review `-4` in-browser before deciding.

## KNOB HOTKEYS (browser, added 2026-07-11)

Each adjusts a magic number by a discrete step and RESTARTS on the SAME seed
(so you see the knob's effect, not a fresh run). Live values + the key map
show on the second status line. Values read live from CONSTANTS, so a reset
is all that's needed.
- `e` / `E` — ABSORB_COEFF ÷2 / ×2 (clamp 0.0025–4)
- `g` / `G` — GERM_CLEAR_RADIUS −1 / +1 (min 1, no upper cap; 1 = dense, higher = sparser)
- `o` / `O` — P_ORGANIFY −0.1 / +0.1 (clamp 0–1)
- `[` / `]` — decayWindow ÷1.5 / ×1.5 (clamp 1000 – 20×area)
(Unchanged: space step, p pause, f fast-forward, 0 reset [new seed], c fit,
d decay on/off, r report.) New CONSTANT: `GERM_CLEAR_RADIUS` (default 1,
prior behavior); headless still PASS at the default.

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

## ORGAN OVERLAP ROUND (2026-07-11, same session as the knob sweep)

Greg picked the structural lever himself, from the aesthetic side: let
leaves and petals overlap at ~50% opacity while the stem rule keeps things
coherent. This is candidate (3) from the sweep section — relaxing the
spatial penalty — aimed at exactly the term the sweep proved dominant:
P(offspring fully unfolds). Built in `-4` in place (toggleable, so no fork):

- **ORGAN_OVERLAP (default ON, hotkey `x`):** leaf blades + petals are now
  "overlay tissue" — never written to the grid, exempt from the empty-cell
  and outline-gap checks (only out-of-bounds still fails the plant), drawn
  at ORGAN_ALPHA 0.5 so overlaps read as layering. The SKELETON (stems,
  leaf anchors, flower centers) keeps the one law unchanged: exclusive
  cells, strict self-avoidance, inter-plant outline gap.
- Accepted side effects: blades don't shade each other (exposure income
  reads only the skeleton grid, so leaf income roughly tripled); seeds can
  germinate under foliage; fill% counts overlay tissue so it reads high.
- Seed cell now visible: the root cell keeps the seed's cream (SEED_DOT)
  tint in the mature plant instead of stem olive (Greg noticed the seed a
  plant grew from vanished visually).
- New knob hotkey `s`/`S`: AIRBORNE_STEPS ÷2/×2 (clamp 4–4096) — seed
  flight length as a dispersal/sparseness lever alongside g/G.
- removePlantMatter now only clears a grid slot if that cell owns it
  (overlay tissue never claimed one); fade + immortalize alphas respect
  per-cell baseAlpha.

**Headless results (240×135, 400k ticks, seeds 14/42/777, all PASS):**
regime shift, complexity UP across the board — flowers/plant 1.25–1.35
(was ~1.0; multi-flower forms now hold real share), leaves/plant
1.42–1.58 (was 1.26–1.42), standing plants ~1040–1180 (was ~330–370),
fill ~88% (counts overlay), mean energyRate ~0.28 (was ~0.08), emission
~27 seeds/tick (was ~1.7), wall ~40s (was ~5s — 10× more plants doing
reproduction math; browser fast-forward 1000× may chug). Genome-length
gradient now ~8.2 → 7.7 (slightly SHRINKING — overlap made organs cheap,
so forms pack more organs into shorter genomes). Verified: overlap OFF
(`x`) reproduces the old baseline bit-for-bit on seed 14 (330 plants,
28.9% fill, flowers/plant 0.80). Completion mode (`decay=0`) still works,
now COMPLETEs at ~18k ticks (was 230k) since organs stop competing for
space.

**Deliberately deferred (Greg's other ideas, discussed this session):**
leaf-value/seeding-sparseness retune. Straight leaf-value increases can't
flip the ranking (linear economy — ratios between plants are unchanged by
scaling ABSORB_COEFF or seed cost); the promising version is a THRESHOLD:
scarce energy + tight decay window so 1-leaf plants can't bank a seed
inside the window but 2–3-leaf plants can. That combination was never
swept (knobs went one at a time, coeff only upward). Superlinear leaf
income (rate ∝ leaves^1.5) is the backup structural option. Both wait
until Greg has SEEN the overlap regime — it moved the ground under all
old sweep numbers, so any re-sweep must be from the new baseline.

## Open / next

- Greg's visual review of `evo-engine-millefleur-4.html` in the NEW overlap
  regime (translucent layering, ~88% density, seed-dot roots, decay churn).
  Key aesthetic question: is near-solid overlapping foliage the millefleur
  look, or does it want thinning (e/E energy down, g/G germ radius up, s/S
  longer flights all push sparser)?
- If overlap regime holds: re-sweep economy from the new baseline —
  threshold play (scarce energy × tight decay window) or superlinear leaf
  income, per the deferred section above.
- Aesthetic knobs if wanted after viewing: P_ORGANIFY, decay window,
  4-cell single-stage leaf fallback, diagonal-X petal variant.
- The one-off vm inspector (organ census + ASCII champion renders) lives in
  the session scratchpad only; ~80 lines, trivial to recreate (eval the
  source in `vm` with fake `process.argv`, then query `immortals`).
