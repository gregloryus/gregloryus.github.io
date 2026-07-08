# millefleur — HANDOFF 2 (fresh-start index, 2026-07-08)

> **STOP — first-session instructions from Greg: READ ONLY.** Read this doc
> and the files it points to, and nothing else. Do **NOT** run Bash, `node`,
> the headless harnesses, git, or any command; do **NOT** edit or create
> files. We keep tripping tooling safeguards, so every action needs Greg's
> explicit go-ahead first. When you've finished reading, come back and talk
> to Greg — wait for direction before doing anything. (The "FAST START" and
> run commands below are reference for LATER, only once Greg approves.)

Read this first. It's the map: current state of the live project, the exact
files that matter, and a directory of every older handoff/design doc so you
don't have to rediscover them. **This is a falling-sand / cellular-automaton
generative-art project** — grid rules and typed arrays. Keep that framing.

Housekeeping that applies to everything below:
- Greg versions by **filename** (`-2`, `-3`, …). Big rule changes → new
  file; small tweaks → edit in place (ask if unsure).
- Commit at checkpoints, frequently. **Never `git push`** — terminal auth is
  broken; Greg pushes via GitHub Desktop.
- Shell + `node` DO work this session (earlier sessions couldn't run them).
  Both sims run headless AND in-browser (open the `.html` from disk — the
  script tags are plain `<script>`, not `type=module`, so `file://` works).

---

## THE LIVE THREAD: millefleur

A **self-completing tapestry generator**. A single founder plant grows from
the center; if a plant can fully unfold its genome-determined body plan into
empty space it becomes IMMORTAL (frozen, immovable) and starts dispersing
mutant seeds; descendants compete for the shrinking gaps. When no seed can
fill any remaining space, the piece is COMPLETE — a finished millefleur
tapestry. No energy, no death, no rain, no water, no gravity.

### Files (all in repo root)
- **`evo-engine-millefleur-2.js` / `.html`** — CURRENT working version.
  Run headless: `node evo-engine-millefleur-2.js [seed] [maxTicks] [cols]
  [rows] [radius] [pClone]`. Browser: open the `.html`; URL params
  `?seed=N&radius=64&clone=0.35`.
- `evo-engine-millefleur.js` / `.html` — the `-1` baseline (first
  implementation), left frozen for comparison. Global uniqueness, 7 random
  starters, no strict self-avoidance.
- **`millefleur-HANDOFF.md`** — the deep design + running changelog for
  millefleur. Full rationale for every rule and knob. Read it second.

### Where `-2` stands right now (defaults as committed, HEAD 310b1e6)
- **Single founder, dead center**; everything descends from it by mutation.
- **Global uniqueness** (an exact genome may immortalize only once anywhere;
  `UNIQUENESS_RADIUS=99999`). Lower via `?radius=` for LOCAL uniqueness where
  forms may recur at distance; status bar shows "global" when unbounded.
- **Strict self-avoidance** — a growing cell may touch (8-way) only its
  parent, grandparent (turn corner), or a sibling (fork crotch); any farther
  self-contact aborts the plant. No blobs/loops; turns & forks survive.
- **P_CLONE=0** — repeated forms must be CONVERGENT (same genome re-derived
  by mutation), never copied clones.
- **Soft additive color hash** — similar genomes get similar colors (lineage
  neighborhoods); still deterministic per genome.
- **Random run seed each load**, shown in UI + console; `?seed=N` replays.
- Genetics ported from `simplant-20.js`: 3-bit gene → left/forward/right
  tree, newer-genes-mutate-more gradient, crawl-to-tip + 64-step random-walk
  dispersal. Details and the empirical findings (size gradient runs OPPOSITE
  to prediction; ~25–27% fill is near the self-avoiding packing limit;
  repetition ∝ dispersal/radius ratio) are all in `millefleur-HANDOFF.md`.

### Open threads / things Greg may want next
- Fra Angelico 3/4 perspective (lower=closer, no size change) — still just an
  intent, not built. See `millefleur-HANDOFF.md` open decisions.
- Mutation-count distribution (currently ≥1 + geometric extras), dispersal as
  a genetic trait, completion-detection tuning.

---

## THE PARENT ENGINE: evo-engine (Phase 1, upstream of everything)

`evo-engine.js` / `evo-engine.html`. A chunked, sleeping falling-sand engine
(1024×1024, 64×64 chunks, flat typed arrays). Phase 1 added a genome-driven
growth automaton with an energy economy, mutation, and matter conservation.
millefleur is a radical SIMPLIFICATION of this (dropped the economy/ledger).
- Tags: `phase0-complete`, `phase0-water-settles`, `phase1-complete` (HEAD of
  that line). Leave tags intact.
- Still green: `node evo-engine.js 1337 10000` → PASS (verified last session).
- **`evo-engine-HANDOFF.md`** — Phase 1 → Phase 2 handoff. The engine in one
  paragraph, what Phase 1 added, acceptance numbers, Phase 2 candidates.

---

## DIRECTORY OF OLDER DOCS (context, not active work)

Falling-sand / plant lineage:
- `matter-plants-HANDOFF.md` — original "plants are transmuted matter" 5-rule
  sketch (no-hidden-values design law). A PARKED direction.
- `matter-plants-HANDOFF-2.md` — after first implementation; documents the
  design gap (blobs suffocate, plants never grow into air). Superseded by the
  millefleur pivot; `matter-plants-1.js` was never run headless.
- `PROJECT-CATALOG.md` — catalog of the whole repo's experiments.
- `plant_simulation_project_intent.md` — north-star intent doc.
- `colorless-green-ideas.md` — §7 has the "resolved architecture"; path-keyed
  urn genetics idea.
- `plant_enhancement_roadmap.md`, `complete_plant_sim_brief.md`,
  `cursorfyi-plant-simulation-design.md` — older briefs/roadmaps.

simplant lineage (the genetics millefleur borrows from):
- `simplant-20.js` / `simplant.html` — latest simplant; source of the tree
  decoder, gradient mutation, and dispersal. `simplant-2..19` are history.
- `simplant-brief.md`, `simplant-zone-brief.md`,
  `simplant-coding-plan-chatgpt.md`, `simplant-coding-plan-claude.md`.
- `urn-plants-5-plan.md` — the urn-genetics variant plan.

Unrelated side projects (ignore unless asked):
- `lava-lamp-project-handoff.md`, `lava-lamp-dplbm-handoff.md`.

---

## FAST START — ONLY after Greg says go (do not run these unprompted)
1. Read `millefleur-HANDOFF.md` for the full rule rationale before touching
   any rules.
2. (with approval) `node evo-engine-millefleur-2.js` (defaults) — should end
   COMPLETE, PASS.
3. (with approval) Open `evo-engine-millefleur-2.html` to watch it; grab the
   seed from the status bar to replay (`?seed=N`). Fork to `-3` for the next
   big experiment.

Until then: read everything, then return to Greg and wait.
