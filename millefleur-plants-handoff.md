# Evolving 2D Plants — Handoff (2026-08-16)

## Start here

The current working prototype is **`millefleur-plants-1.html`**, but it should be treated as a revealing failed prototype rather than a clean foundation. It produces legible, complete, non-overlapping inherited forms and survives million-tick tests, but the final audit found that this stability partly depends on an unintended particle-traffic mechanism: persistent lateral light packets share the material occupancy grid with rain and vapor, accumulate into ochre horizontal queues, and scatter/obstruct rain. When light is allowed to pass freely, the populations die before generation 1; broader collision-free experiments survive longer but still go extinct. Do not cosmetically hide this coupling.

If files are not attached to the next conversation, ask Greg to provide the exact filenames listed below. The most important minimum bundle is:

- `millefleur-plants-handoff.md`
- `millefleur-plants-1.html`
- `millefleur-1-headless.js`
- `millefleur-1-evolution-data.json`
- `millefleur-1-evolution-report.html`
- `millefleur-1-evolution-contact-sheet.png`
- `conduit-plants-8b.html`
- `simplant-20(2).js`

## Greg's priorities, in order

1. Genuine natural selection and long-horizon evolution; eventually co-evolution among descendant lineages from a common ancestor.
2. Immediate visual legibility: complete plant forms, no overlap, no extra inspection interface required to understand bodies.
3. Radical simplicity, local/discrete causal rules, deterministic seeded randomness, and performance over eons.
4. Only after those: strategically and aesthetically interesting forms resembling simple stitched plants in a millefleur tapestry.

Avoid explicit morphology, compactness, symmetry, branching, novelty, role, or beauty fitness functions. Demographic success should follow only from local physical/ecological consequences.

## Current build and support files

- `millefleur-plants-1.html` — current single-file browser build. Library identity: `libfile_7f380ced764081918b747cb39ce43359`, current saved version 2.
- `millefleur-1-headless.js` — deterministic Node runner and report assembler. Library identity: `libfile_e717c721b44c81919c41527da66d3ab1`, current saved version 2.
- `millefleur-1-evolution-data.json` — requested 1k/10k/100k two-seed results plus stability data. Library identity: `libfile_205eef227e688191a5159ad4786d6787`, saved version 1.
- `millefleur-1-evolution-report.html` — narrative report. Library identity: `libfile_0ec3a454655081919ef581e9efc4e897`, saved version 1. Its positive evolutionary interpretation is now overstated because it predates the final diagnosis of light/rain traffic coupling.
- `millefleur-1-evolution-contact-sheet.png` — world snapshots and enlarged representative inherited forms. Library identity: `libfile_9590e73efbdc8191a1ce6898d927b66b`, saved version 1.
- `millefleur-1-runs/` — per-seed JSON and PNG snapshots at 1k, 10k, 100k, and 1m for seeds `731927` and `99991`.
- `/workspace/millefleur-plants-1.html` — visualization fragment used by the in-chat module; should match the `<section id="millefleur1">…</section>` inside the standalone HTML.

### What the current build does well

- Rooted cardinal-tree genomes encode complete mature forms.
- Mutations add, prune, turn, or copy subtrees.
- Every accepted genome fits inside the same 15×15 upright territory.
- Plants remain fully expressed and non-overlapping; settlement does not reward compact bodies.
- Vertical water and horizontal light create two morphological axes without explicitly scoring shape.
- Two prior deterministic million-tick runs remained populated: seed `731927` reached 34 plants / generation 230; seed `99991` reached 33 plants / generation 235.
- Invariant audits found zero sugar particles outside registered living tissue.

### Final visual corrections already saved

- Magenta/mauve pixels are sampled propagules; they cannot catch water or consume resources.
- Propagules are rendered only on visually empty cells so they cannot cover plants, sap, sugar, water, vapor, or light and create false interactions.
- Orange sugar is rendered only when both `bodyOwner[pos]` and the exact `sapAt[pos]` registration agree.
- Gold seed cells remain part of living plants.

## Critical unresolved flaw

The ochre horizontal “articles” outside plants are **free light packets**, not sugar or seeds. They move left/right but share `fluidAt` with water and vapor. Consequently:

- light packets queue behind one another and around bodies;
- light queues can block or redirect rain;
- water's useful sideways scattering substantially depends on those queues;
- the apparent ecology is partly selection under an accidental traffic-jam medium.

This is not merely a rendering bug. Multiple rejected tests established the dependency:

- Letting all environmental particles cross one another removed invisible obstructions but caused extinction.
- Allowing different particle types to swap positions caused extinction around 14k–20k ticks.
- Removing only light from `fluidAt` caused both populations to die around 3.5k ticks before producing descendants.
- Making all non-seed tissue collect water did not rescue the light-independent ecology.
- Periodically vaporizing/re-randomizing rain produced many deliveries but still led to extinction around 170k–220k ticks.

These experimental edits were rejected and are **not** in the saved current build.

## Recommended successor, not another cosmetic patch

My opinionated recommendation is to fork to a new filename, probably `millefleur-plants-2.html`, and rebuild the resource/demography kernel while retaining the current genome, territory, rendering, PRNG, and assay infrastructure.

The clean target:

- No persistent material light objects. Use instantaneous horizontal photon/ray events, or photons that do not occupy/block lattice cells.
- Rain, vapor, seeds, and photons never act as solid obstacles to one another.
- Only visible plant tissue redirects or captures rain.
- Sugar exists only inside tissue and travels along the parent tree.
- Preserve exact vertical wrapping of rain and unbiased cardinal random-walk vapor.
- Solve demographic persistence explicitly through ecology, not a population floor or hidden rescue. Candidate mechanisms worth testing include a paid internal successor seed, territorial seed banks, asynchronous lifespans, or substantially larger populations; document whichever mechanism is chosen.
- Correct the mutation-cost loophole if present: a child should pay for its actual post-mutation genome, especially when subtree duplication can make it much larger than the parent.
- Require survival across at least two seeds through 1m ticks, zero overlaps, zero stray sugar, no safety-cap interventions, and visible nontrivial morphological divergence before making evolutionary claims.

Do not continue tuning the existing shared-particle grid merely to preserve its old metrics. The failed ablations are evidence that the metric success is not robust to the intended physics.

## Original four files that began this session

Ask Greg for all four if comparative context is missing:

- `threadplant-ecology-4(1).html`
- `conduit-plants-8a.html`
- `conduit-plants-8b.html`
- `conduit-plants-8c.html`

The strategic preference was to back **8b**: its larger open 2D area was judged more promising than a surface-only ecology, while removing soil improved legibility and focused attention on whole forms.

## Earlier synthesis and comparison artifacts

- `mattercycle-plants-1.html` — first synthesis MVP produced from the four-source comparison.
- `headless-evolution-comparison.js` — runner for the original four plus synthesis.
- `evolution-comparison-data.json`
- `evolution-comparison-report.html`
- `evolution-comparison-contact-sheet.png`
- `evolution-runs/` — 1k/10k/100k images and JSON for `8a`, `8b`, `8c`, `threadplant`, and `mattercycle`, each using seeds `731927` and `99991`.

## Intermediate open-plane lineage

- `openplane-plants-1.html`
- `openplane-headless.js`
- `openplane-evolution-data.json`
- `openplane-evolution-report.html`
- `openplane-evolution-contact-sheet.png`
- `openplane-runs/`
- `openplane-plants-2.html`
- `openplane-2-headless.js`
- `openplane-2-evolution-data.json`
- `openplane-2-evolution-report.html`
- `openplane-2-evolution-contact-sheet.png`
- `openplane-2-runs/`

`openplane-plants-2.html` is the most relevant predecessor to the current build. It established complete persistent bodies in equal territories and helped expose convergence toward simple horizontal or minimal fork forms.

## Important external/reference files

- `simplant-20(2).js` — important successful earlier plant-evolution reference. Use it to understand the desired clarity and inspect its genome/mutation/dispersal machinery.
- `Pliant-Garden-MVP.html` — flexible-body plant experiment; conceptually relevant but not the current base.
- `1D-plant-ideas.md` and `1D-plant-prototype.html` — earlier framing of 1D living bodies forming 2D structures, if Greg chooses to provide them.
- `threadplant-grammar.html` — earlier richer grammar/body-plan experiment, if available.
- `water-energy-mixed-lab.html` — resource-physics laboratory, useful only if a successor needs isolated water/light calibration.

There is also an older unrelated project handoff named `millefleur-HANDOFF.md` concerning immortal plants filling a tapestry. Do not confuse that older generative-art project with this current evolutionary ecology unless Greg explicitly wants to revisit it.

## Runner usage

From the directory containing the files:

```bash
node millefleur-1-headless.js --seed 731927
node millefleur-1-headless.js --seed 99991
node millefleur-1-headless.js --stability --seed 731927
node millefleur-1-headless.js --stability --seed 99991
node millefleur-1-headless.js --assemble
```

The runner expects a Node environment with `sharp` available through the configured runtime modules.

## Required audit checklist for the next build

- Read the complete simulation core and renderer before editing.
- Confirm every visible color maps unambiguously to one state.
- Track every particle registration: mobile occupancy, sap/sugar occupancy, and body ownership.
- Assert sugar never exists or renders outside living tissue.
- Assert seeds/propagules never participate in rain or resource physics.
- Audit every lateral water move: it must be caused by visible plant tissue or an explicitly intended water rule, never an unsampled particle.
- Verify resource conservation or document intentional creation/destruction.
- Run seeds `731927` and `99991` at 1k, 10k, 100k, and 1m.
- Reject any version that goes extinct, overlaps forms, violates equal territories, activates a population rescue/cap, or converges trivially in both seeds.
- Compare evolved populations against mutation-only controls before claiming selection on morphology.
- Do not claim co-evolution merely because neighbors affect shared resources; require reciprocal lineage-specific adaptation, ideally with archived-genome time-shift or invasion assays.

## Suggested opening prompt for the next instance

> Read `millefleur-plants-handoff.md` completely, then read every file in its minimum bundle completely. If any named file is unavailable, stop and ask me to attach it by exact filename. Treat `millefleur-plants-1.html` as a diagnosed prototype whose long-run stability depends on unintended light/rain particle congestion. Design a radically simple successor that preserves complete non-overlapping inherited forms and genuine long-horizon natural selection while eliminating all particle-particle solidity. Do not add an explicit morphology fitness function. Build it under a new filename, run two deterministic seeds through 1k/10k/100k and 1m, audit invariants, and report failures honestly.
