# brainstorm-HANDOFF (2026-07-08) — the ultimate handoff

You are a fresh instance. This doc memorializes an unusually productive
high-level brainstorming session with Greg. Your job is NOT to build
anything: it is to absorb this context and then brainstorm radically new
project ideas with Greg — wide-aperture, conceptual, conversational.

## PROTOCOL (this is what finally worked — follow it exactly)

- **READ ONLY.** No Bash, no node, no git, no edits, no file creation,
  unless Greg explicitly approves that specific action. Never `git push`
  (terminal auth broken; Greg pushes via GitHub Desktop).
- **One file at a time, then RETURN to Greg and wait.** Do not chain
  "I'll now read the other files." Read one thing, come back, talk, ask
  permission for the next. This gives Greg recovery points — sessions
  keep getting killed by false-positive safeguards mid-stream.
- **Do NOT attempt to read `green-ideas.md`.** It reliably trips the
  safeguards and kills the session. Its sober distillation is
  `colorless-green-ideas.md` — read that instead.
- Check in frequently, quickly, substantively. Greg loves a partner who
  returns with one sharp thought over one who disappears into ten steps.
- Greg versions by filename (`-2`, `-3`); commits only at his checkpoints.

## WHAT GREG IS ULTIMATELY AFTER (the real north star — it's not any doc)

An open-ended generative-art project — cellular-automaton / falling-sand
genre, explicitly NOT real biology — that achieves:

- **Emergent, local-rules-only** evolution: survival of the fittest,
  ideally CO-evolution.
- **Performant at massive scale** (typed arrays, huge grids).
- **Environment encodes the history** — the world is a record of what
  happened in it.
- **Conservation of mass**, if not energy (the sun IRL pours energy in;
  that's allowed — captured or dissipated — but matter should cycle).
- **Profound and a little mystical**: interdependence, interpenetration
  of beings/events/history/influence/identity. It should feel like
  *uncovering something preexisting and real in its own right*, not like
  operating a machine you built.
- Longstanding goal list (PROJECT-CATALOG.md): discrete & legible,
  dramatic, ambient, biophilic, tapestry aesthetic (crowded but
  non-overlapping), diverse, probabilistic+deterministic (seeded),
  self-propagating & cyclical.

Note `plant_simulation_project_intent.md` is NOT the north star (Greg was
explicit). The north star is the list above.

## THE MASTER DIAGNOSIS (the single biggest insight of the session)

Greg's 5.5-year catalog (~22 project families — see PROJECT-CATALOG.md)
oscillates between two poles that have never successfully fused:

- **Physics-worlds** (falling-sand, magmasim, monochromagic, rgbfields,
  lava lamps): conserved matter, transport, flow — but nothing has
  identity or lineage.
- **Genetics-worlds** (farming-plants, triplebittrees, urn-plants,
  simplant, millefleur): heredity, selection, legible form — but on
  blank, passive grids.

Every attempted marriage (absorption, cellspring, evo-engine Phase 1,
matter-plants) **died of complexity** — that is THE recurring failure
mode. Millefleur is the most successful genetics-pole project precisely
because it stopped trying to marry them and amputated matter entirely.

**The open frontier: fuse the poles at millefleur-level austerity — one
law, no economy. Not "add matter to genetics" but find the single
substance where matter and lineage are the same thing.** Everything in
the "new ideas" section below is an attack on this frontier.

## DESIGN PRINCIPLES DISTILLED THIS SESSION

1. **One-law austerity.** Rule-stacking is how projects die. Each new
   mechanic must be a consequence, not an addition.
2. **Arrow vs. cycle decides genre.** Millefleur is an arrow (space spent
   once → COMPLETE → finished artwork). A cycle (matter returns) makes an
   ecology that runs forever. Neither is wrong — know which you're making.
   A directed cycle is the minimum unit of perpetual aliveness
   (rbgrps RPS triangle, pixiching Wu Xing).
3. **Transformation + Transport + Reinforcement** — the three-mechanism
   checklist from colorless-green-ideas §3; if one is missing the system
   stalls.
4. **The urn-erosion isomorphism** (colorless-green-ideas §5): event
   modifies substrate → substrate biases future events. The environment
   itself can be the genetic memory; diffusion/decay is the forgetting.
5. **A reframe can substitute for a mechanic.** Millefleur "fixed" its
   missing death/catastrophe by reframing the output as a finished
   tapestry instead of an ongoing ecology.
6. **Say the engineering thing.** Mysticism must be load-bearing in the
   rules, not decoration. Aesthetic quality doubles as a diagnostic (if
   it looks muddy, the dynamics are wrong).

## STATE OF THE LIVE PROJECT (millefleur — parked, healthy)

`evo-engine-millefleur-2.js/.html` at HEAD. Single center founder, global
genome uniqueness, strict self-avoidance (parent/grandparent/sibling
contact only — the minimal non-degenerate set), P_CLONE=0 (repeats must be
convergent), soft additive lineage coloring, self-completes at ~25–27%
fill (the packing limit). Full rationale: `millefleur-HANDOFF.md`; index:
`millefleur-HANDOFF-2.md`.

Sharp code-level findings from this session:
- **Selection is weaker than designed.** Seeds are emitted from a
  UNIFORMLY RANDOM immortal — no differential reproduction at all.
  Fitness = "fully unfolded once," then every immortal is an equal
  fountain forever. (The intended gradient — space fragmentation — barely
  acts: ~94% of flowers immortalize in the early open phase, which is why
  the size gradient runs BACKWARDS: later flowers are bigger.)
- **Failure is traceless.** Blocked plants vanish entirely; the world
  remembers only winners.
- **"Up" does not exist in the ontology** (random facing at germination)
  — relevant to any upward-bias idea.
- Tiny genomes are combinatorially scarce under global uniqueness, so
  tiny gaps stay empty; ~25–27% fill is structural, not tunable.

## PARKED IDEAS (canonical file: `parked-ideas-2026-07.md` — read it)

Millefleur sub-projects: cyclical millefleur via death of immortals —
**decay of the fruitless** is Greg's favored death rule (persist only
while your lineage keeps succeeding; you exist as long as you matter to
the future); **displacement was REJECTED** (Greg spotted it: letting
growers pass through immortals removes the only obstacle that makes
unfolding a fitness test → total churn); emission weighting; upward bias;
failure residue; big-canvas zoom UI; 1px=1cell mode; environmental
fitness bands.

The three radically-new concepts (all Greg-approved, in rising heat):

1. **MATTER AS A LOAN** — one conserved substance; grow by borrowing it
   from the cells you occupy, die by returning it where you fall. To live
   is to borrow matter into a shape. Fork: substrate inert (austere) vs.
   moving (alive — physics risk). Greg wants to see both eventually.
2. **STRATA** — the world only accretes; corpses compress into ground and
   the surface rises. Life is a thin film on top; the artwork is the CORE
   SAMPLE, not the final frame. Topography emerges from success — life
   builds the hills it must then live on. UI is archaeology (scroll down
   = deep time).
3. **THE TWO KINGDOMS (Greg's favorite)** — two interleaved kingdoms,
   each running millefleur's exact unfold-or-vanish law, but each can
   only grow on what the other's dead leave behind (ash → flower → loam
   → mycelium → ash). Co-evolution is STRUCTURAL: each kingdom is the
   other's environment. Failure feeds the cycle (aborted matter converts
   forward — the world remembers failures as food). Boom/bust
   predator-prey oscillation falls out of pure conservation. Shapes echo
   shapes: each kingdom's morphology traces the other's ghosts.
   - **Composition sketch (strongest image of the session):** TWO
     KINGDOMS on STRATA — plants grow up into air, mycelium grows down
     through the buried strata of the plants' dead; the surface is a
     membrane between two interpenetrating worlds, itself made of time.
     Flagged complexity risk: how freed matter returns upward.

## YOUR MISSION AS THE FRESH INSTANCE

Greg wants you to take a FRESH look at brainstorming radically new ideas
with all of the above as context — not to iterate on millefleur (though
its sub-projects are legitimately parked, not dead), and not to be bound
by the three concepts above. Aim for something as distilled, elegant,
self-evident, emergent, and beautiful as possible. The frontier is the
matter/lineage fusion at one-law austerity; the standard is "feels like
uncovering something preexisting."

Suggested reading queue (ONE AT A TIME, returning to Greg between each,
asking approval first): this file's pointers as needed →
`parked-ideas-2026-07.md` → `millefleur-HANDOFF-2.md` →
`colorless-green-ideas.md` → `PROJECT-CATALOG.md` → `PROJECT-IDEAS.md` →
(optionally) `millefleur-HANDOFF.md`, `evo-engine-millefleur-2.js`.
NEVER `green-ideas.md`.
