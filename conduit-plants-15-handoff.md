# conduit-plants: handoff at -15

Written Aug 15 2026, at the end of the session that produced -8a/-8b/-8c through -15.
Read this before touching anything. The short version: the world works, one
adaptation is real and replicates, and the central problem of the project is
still unsolved — but it is now diagnosed precisely enough to attack directly.

Greg's standing constraint, unchanged since -4, in his words: keep it **as
simple, elemental, emergent, primitive, local, and natural-selection-driven as
possible**. Nothing prescribed that could be emergent. Legibility means *the
shapes are recognisable and you can see why they changed* — not colour-coding,
not charts. His stated priority order, given explicitly this session:
**1. evolution / natural selection. 2. legibility. 3. forms that read like
simple stitched plants in a millefleur-style tapestry.** No explicit artificial
fitness function, ever.

Every file below is a single self-contained HTML file with a DOM-free sim core
(`createSim`) and a renderer below it, and runs in a phone HTML preview. Keep
both properties. **If a file is not attached to your conversation, ask Greg for
it by name** — he has all of them.

---

## 1. File inventory

### The live one
| File | What it is |
|---|---|
| `conduit-plants-15.html` | **Current head.** Day clock, unfold/refold, daily overhead, turning rain, seeds released from body tips. Stable, verified. Start here. |

### Its direct ancestors (each is a working, runnable world)
| File | What it is | Verdict |
|---|---|---|
| `conduit-plants-14.html` | -13 plus gradual retraction: bodies peel in one layer at a time instead of vanishing | Good. Fall back to this if -15's turning rain is unwanted |
| `conduit-plants-13.html` | -12 with three leaks closed and the daily overhead (`KEEP`) added | The version where size first paid |
| `conduit-plants-12.html` | First unfold/refold world, from Greg's own proposal. Has the orphan-tissue bug | Superseded — do not build on |
| `conduit-plants-11.html` | Plane, one tissue type, water falls and wraps vertically, no light/soil/gravity/wind | Superseded, but its water model is the one that survived into -15 |

### Dead ends, kept because their negative results are informative
| File | What it is | Why it died |
|---|---|---|
| `conduit-plants-10.html` | Plane with interleaving crowns | Greg rejected: interleaving is illegible |
| `conduit-plants-9.html` | Surface world, light-limited economy, shade-suppressed germination | Light competition impossible by construction (see §4) |
| `conduit-plants-8a.html` | Dead tissue topples: rigid dead solid, falls like sand, crushes, then crumbles | Works exactly as specified; changes nothing evolutionary |
| `conduit-plants-8b.html` | The isometric plane, no soil, wind, persistent-walk water | Converges on two-cell blobs; seed-fragile (extinct on seed 7 between 1k and 10k) |
| `conduit-plants-8c.html` | Conserved mineral cycle, exact conservation audited in HUD | Survives only with litter-loss ≥ 0.01 (default 0.02). Greg: the mineral is not legible enough |

### Inputs Greg supplied
| File | What it is |
|---|---|
| `conduit-plants-7.html` | The base everything descends from |
| `conduit-plants-8-handoff.md` | The previous handoff. Its -7 diagnosis is still accurate and worth re-reading |
| `threadplant-ecology-4.html` | Sibling prototype. Two ideas worth taking: a per-module **plasticity weight** that lets a tip score candidate cells by local conditions (never implemented here, still the best unused idea in the project), and an audited conservation total across every form water takes (implemented) |

### Renders (headless PNGs, 4x scale)
`15-20000.png`, `15-80000.png` · `14-20000.png`, `14-80000.png` ·
`13-20000.png`, `13-80000.png`, `13-240000.png` ·
`11-2000.png`, `11-20000.png`, `11-80000.png` ·
`10-1000.png`, `10-10000.png` ·
`8a-1000.png`, `8a-10000.png` · `8b-1000.png`, `8b-10000.png`, `8b-100000.png`
(the latter two are an empty world — genuine extinction, not a render failure) ·
`8c-1000.png`, `8c-10000.png`

Build scripts and test harnesses lived in a scratch container and are **gone**.
They are trivial to recreate; §5 has the recipe.

---

## 2. How -15 works

A plant is a **seed, a plan, and a bank**. Nothing else, and nothing is alive
between times.

- **The day.** `DAY` is 256 ticks. Each plant carries a `phase` gene: the hour it
  wakes. At its hour it unfolds its plan into a body, one cell per tick per tip,
  spending `BUILD` from bank per cell. It holds for `WINDOW` ticks, then reels
  itself back in one layer at a time, counted outward from the seed, until only
  the seed remains. Then it settles up: bank += what it caught, minus `KEEP`.
- **Mortality is structural.** No body survives its day, so nothing is immortal
  and every day is a generation. A plant dies when its hour comes and it cannot
  afford even one cell. Poverty is graded: a poor plant opens a smaller body,
  it is not struck down (this matters — see §3).
- **Water.** A fixed inventory, conserved exactly, forever. Droplets fall,
  deflect down-left/down-right then sideways around obstacles, and wrap
  vertically — off the bottom, back in at the top of the same column. A droplet
  that runs into living tissue is caught by it and breathed straight back out as
  vapour, which random-walks until it condenses. **Rain is the only income.**
- **The rain turns.** Slants one way in the morning, falls straight at midday,
  slants the other way by evening (`SLANT: 0` restores straight-down).
- **Seeds leave from the tips.** A terminal cell releases a seed as it folds in.
  So dispersal distance is the reach of a heritable body rather than a constant,
  and offspring per day is capped by how many ends the plant grew.
- **The genome** is the module grammar inherited from -7: `len, curve, reps,
  brEvery, brAngle, child, next, end`, plus `rot` (starting heading) and `phase`.
  Mutation at seed formation only: 90% a single ±1 field step, occasional
  pointer rewiring, duplication and deletion symmetric at 0.05.

### Parameters that matter
| Param | Default | Notes |
|---|---|---|
| `KEEP` | 12 | **The most important number in the project.** Fixed daily toll per seed |
| `WATER_TOTAL` | 1600 | Total income. Conserved |
| `WINDOW` | 96 | Ticks a body stays open. 56 keeps plans slightly richer |
| `BUILD` / `CATCH` | 1 / 1 | Cost per cell, income per droplet |
| `SEED_COST`/`SEED_BANK` | 26 / 30 | Making a seed, and its starting capital |
| `MAX_PLANTS` | 20000 | Effectively off. Do not let this bind — carrying capacity must be economic |
| `SLANT`, `SEED_FROM_TIPS` | 1, 1 | Set either to 0 to recover -14 behaviour |

---

## 3. What replicates

- **Adaptation to the direction of the weather.** Rain falls down, so a body
  earns by the columns it stands in and pays by the cells it has: the profitable
  shape is wide and thin, held across the rain. Starting heading is a gene; a
  random population scores 0.64 on `side-on` (mean |sin| of heading). Measured:
  **0.88–0.94**, replicated across seeds and configurations, holding for 1,250
  days and 350 generations. One run reached w×h = **19.6 × 1.3 at 0.979** — a
  twenty-cell body one cell thick, near-perfectly perpendicular to the rain.
  This is the strongest result in the project and it survived every subsequent
  change to the world around it.
- **Economies of scale produce large bodies.** A fixed daily toll, indifferent
  to size, means a large body spreads it over many earning cells and a tiny one
  cannot cover it. Sweep at -13:

  | `KEEP` | seeds | body (cells) | w×h |
  |---|---|---|---|
  | 0 | 6118 | 3.8 | 3.3×2.4 |
  | 3 | 1890 | 8.2 | 6.7×3.9 |
  | 6 | 1086 | 12.1 | 9.7×5.0 |
  | 12 | 396 | 21.2 | 13.3×6.9 |

  Above ~20 the world gets brittle; at 30 it goes extinct.
- **Graded poverty is required for any of this.** Every plant sits near
  subsistence, so instant death at bank ≤ 0 killed the entire population on the
  same day, from one shared shock. Making a bad day shrink you rather than kill
  you is what made the toll usable at all. Do not reintroduce a death cliff.
- **Stability.** -15 holds ~750–1000 seeds across 390 days on two seeds, water
  conserved to the packet, generation 50, forms 14–20 cells running as flat as
  19.9 × 3.6.

---

## 4. What failed, with the controls that showed it

Be sceptical of your own instruments. Two of my predictions this session looked
confirmed and were not.

- **Turning rain did NOT create species-by-hour.** The three thirds of the day
  showed clearly different mean tilt (morning −0.74, evening +0.62) — exactly
  the predicted split. But the `SLANT: 0` control, where rain falls straight
  down and there is no reason for the thirds to differ, shows the same split
  (−0.22 / 0.22 / 0.69). It is linkage and founder effect: `phase` and `rot` are
  inherited together and a few clones dominate each third. **Always run the
  control.**
- **Seeds-from-tips did NOT drive branching.** Prediction was that capping
  offspring at one-per-tip would make extra tips valuable. Tips held flat at
  0.8–0.9 per plant and expressed modules *fell* to 1.05. I hypothesised
  affordability was the real constraint and made offspring nearly three times
  cheaper: tips did not move. Growing a second end costs more than it returns.
- **Light competition was impossible by construction in the surface worlds**
  (-7 through -9). While a tip may not lay a cell touching another plant, and
  light comes straight down, every plant stands in its own private column of
  sky: a neighbour two columns over can never be shaded no matter how tall you
  get. No economic tuning can fix a geometry where the contest cannot occur.
  This is why -7 stagnated at 1M ticks.
- **-8b's plane collapsed to two-cell blobs** because germinating is a cheaper
  way to claim a cell than growing, and a seedling cannot be outcompeted when
  light is free. Removing the no-touch rule (-10) fixed the dynamics and Greg
  rejected it on legibility. -11 resolved that properly: competition does not
  need contact. If the resource arrives as a directional flux, a body takes rain
  that was on its way to whatever stands below it, and plants never touch.

### Bugs worth knowing about, because the class recurs
- **Orphaned tissue (-12).** Branch tips were created standing on a cell that
  was never laid, so limbs grew unattached and the fold — which walks outward
  from the seed through touching tissue — never reached them. They stayed
  forever, blocking ground and catching rain for nobody: **72% of all tissue by
  day 156**. This was the sole cause of what looked like a mis-tuned economy.
  Fixed, plus a daily sweep as backstop. If a world declines monotonically under
  a stabilising feedback, it is losing something — go find it before tuning.
- **Capital destroyed** when an offspring had nowhere to land (parent paid
  first). Pay on delivery.
- **Immortal dormant seeds** that could not afford to open sat forever holding
  ground. Anything that can persist without paying will.

---

## 5. How to test

The core is DOM-free, so extract and run headless. Roughly 900–1700 ticks/second.

```bash
python3 -c "
src=open('conduit-plants-15.html').read()
js=src.split('<script>')[1].split('</script>')[0]
open('core.js','w').write(js.split('/* ==== RENDERER ==== */')[0]+'\nmodule.exports={createSim};\n')
"
node -e "const {createSim}=require('./core.js');
const s=createSim({cols:200,rows:140,seed:1,params:{MAX_PLANTS:20000,KEEP:12}});
for(let n=1;n<=240000;n++){s.step();
 if(n%20000===0){const q=s.snapshot();
  console.log(q.day,q.plants,q.form.toFixed(1),q.wide.toFixed(1)+'x'+q.tall.toFixed(1),
  q.reach.toFixed(2),q.gen,q.sideOn.toFixed(3),q.waterTotal);}}"
```

Rules learned the hard way:
- **Run 80k–240k ticks across at least two seeds** before believing anything.
  Several plausible changes caused silent extinctions, and one config looked
  spectacular at day 156 and was extinct by day 312.
- **Always report `waterTotal`.** It must never move. It is the cheapest
  possible check that the physics is intact.
- **Always run the null control** for any claim about adaptation.
- Long runs get killed between conversation turns unless detached with
  `setsid nohup … &`, and even then are unreliable. Prefer several 80k runs.
- Useful snapshot fields: `form` (cells), `wide`/`tall`, `deep` (fold depth),
  `tips`, `reach` (expressed modules), `mods` (total modules), `sideOn`, `tilt`,
  `gen`, `strains`, `hours`, `waterTotal`.

---

## 6. The unsolved problem, stated precisely

**Across fifteen versions, expressed complexity never rose.** `reach` — modules
actually walked from the start module — sits at 1.0–1.9 in every world I built,
and *falls* over time in the best-performing ones, even while bodies get bigger,
flatter and measurably better adapted. Meanwhile total modules ratchet up to
5–10. Genomes bloat; expression simplifies.

I attacked this from the environment side six separate ways — shade, catchment,
plane area, daily overhead, folding cost, turning weather — and every time
selection found the answer inside a single module. That is now a strong enough
pattern to stop treating as bad luck.

The diagnosis: **the grammar's cheapest route to any target shape is one module
repeated.** `len` and `reps` buy size for free; branching costs cells and fold
depth and buys nothing the physics rewards. A plan of one module repeated is as
cheap to build and as cheap to inherit as a plan of six.

Three directions, in the order I would try them:

1. **Make the optimum unreachable by one module.** The turning rain was an
   attempt at this and it was too weak — a single arc still catches acceptably
   at all three angles. Something sharper is needed: a resource whose optimal
   interception geometry genuinely cannot be written as one repeated segment.
2. **Make expression itself cost something**, so a body assembled from one
   module repeated is not free relative to what it does. This is the least
   emergent option and should be a last resort, but it attacks the mechanism
   directly.
3. **Implement threadplant's plasticity weight**: a per-module gene that lets a
   tip score candidate cells by local conditions rather than following the plan
   blindly. It is the best unused idea in either prototype, it makes one genome
   produce different bodies in different places — which is what Greg has asked
   for since -3 — and it gives modules something to differ *in* beyond geometry.

One caution for whoever picks this up: it is very easy in this project to build
a more interesting world and mistake it for a more evolving one. The number that
matters is `reach` over time, across seeds, against a control. Everything else
can improve while nothing evolves.
