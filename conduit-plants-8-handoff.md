# conduit-plants: handoff for the -8 branches

Read this alongside `conduit-plants-7.html`. That file is the base. It is one
self-contained HTML file with a DOM-free sim core (`createSim`) and a renderer
below it, and it runs in a phone HTML preview — keep both properties.

Greg's standing constraint on this project, in his words: keep it **as simple,
elemental, emergent, primitive, local, and natural-selection-driven as
possible**. Nothing prescribed that could be emergent. No central body object,
no parent pointers, no global rules that a cell couldn't discover from its own
neighbourhood. Legibility means *the shapes are recognisable and you can see why
they changed* — not colour-coding, not charts.

---

## 1. What -7 is

- 200x140 lattice. Types: `AIR 0, SOIL 1, ROCK 2, CONDUIT 3, SEEDSITE 4`.
- Flat bedrock floor (3 rows). All soil in a run is dead plant tissue.
- Water is a fixed inventory of packets (default 800), starting as vapour.
  Vapour walks up, condenses, rains, pools, wicks through soil, and evaporates
  again off dry-air contact. Photosynthesis spends a water packet as vapour.
- Light is a top-down field with absorption and lateral blur, straight down.
- Tips are agents with a 64-way heading and sub-cell fixed-point position. They
  execute one module of the genome at a time and lay conduit behind them.
- Energy (sugar) and water packets random-walk inside a plant's own conduit,
  with no preferred direction.
- A cell dies when supply fails to reach it. There is no age clock
  (`SENESCE: 0`). Dead cells become soil, which falls like sand.
- Unsupported tissue falls straight down as a body (bottom-up sweep, no graph).
- `SPARE_WATER`: a leaf trades water for sugar only if a neighbouring cell of
  the same plant also holds water. This is the local stomatal rule and it is
  what stopped plants from drying themselves out.

### Genome
A growable list of modules. Each has `len, curve, reps, brEvery, brAngle,
paired, child, next, end, photo, grav, order`. `reps` is a ladder 1..8 with
"indefinite" one rung above 8. `end` is one of carry-on / fork / seed / stop.
Mutation happens once, at seed emission, on a copy: half of seeds get an edit,
92% of edits are a ±1 field step, 8% are a rewiring that steps a pointer to a
neighbouring index or walks `end` along its ladder. Duplication 0.05, deletion
0.025, cap 16 modules, floor 2. Clonal, no recombination.

### Reproduction
A module ending in `seed` converts the tip's cell to a seed site, which is
living tissue that banks sugar packets and emits a seed every 6. Seeds currently
**fall** (down, then down-diagonal, small drift), then try to germinate, then
roll one cell sideways and retry. Germination needs: empty unowned cell, no
adjacent plant tissue, contact with soil/rock/floor, not submerged and touching
dry air, and one water packet within reach, which it drinks. Two tips are born
at that cell — root down, shoot up — plus a 14-packet endosperm.

---

## 2. Diagnosis of -7 at 1M ticks (this is the problem to solve)

Measured, not guessed. Fresh 60k run plus Greg's 550k and 1M screenshots.

- **The phenotype saturates by ~60k ticks and then does not move.** Cells per
  plant 4.5 -> 7.4 and height 3.6 -> 5.0 over the first 50k; at 550k it is 5.2
  and ~7 cells; at 1M it is 5.5 and ~7 cells. 940k ticks and 460 generations
  bought nothing.
- **"Modules 14.7" is genome bloat, not body complexity.** Reachable modules
  (walked from `shootStart`/`rootStart`) measure ~2.0 and stay flat while total
  modules ratchet to the cap of 16. Duplication 0.05 vs deletion 0.025 pushes
  count up on its own, and unreachable modules are invisible to selection.
- **Branching % saturated at 100%** early and stopped being a signal.
- **Drift swamps selection.** ~0.47 mutations per generation in a population of
  ~60. At gen 800 that is ~380 mutations per lineage and 41-56 distinct plans
  among 60 plants — no strain is ever common enough to be a type.
- **Two hard ceilings pin total biomass, so there is no way to win:**
  - *Space*: germination needs an anchored, unflooded, unoccupied cell not
    touching another plant. On a 200-wide surface **line** that packs out at
    60-80 plants and sits there.
  - *Water*: plant size is its share of the 800-unit inventory, ~7 cells. And
    you cannot simply add water: at 2400 the world **went extinct by gen 3**,
    because ~2000 liquid units on a flat floor is ~10 rows of standing water and
    nowhere dry is left to germinate.
- **Light is free and infinite.** Nothing shades anything at 5 cells tall and 3
  apart, so height buys nothing. That is why the tall whips at 1M are as tall as
  evolution bothered to go.
- **Reproduction is a lottery.** 11,307 seeds made, ~60 plants alive. Fitness is
  mostly "did a seed find a rare legal site", not "was this a better body".

The single most useful frame: **a plant needs something to win that structure
can win.** Right now the only scarce thing is water, and it sits two cells below
the root, so a bigger body does not get you more of it.

---

## 3. Changes that belong in all three branches

1. **Seed scatter (Greg's request).** Replace fall-then-roll with a short random
   walk that ends when the seed hits something. Expose the step count as an
   input; default 6. Keep it short — long walks decorrelate parent and offspring
   position, which is fine for mixing but works directly against the patch
   inheritance 8c is meant to produce.
2. **Fix the module ratchet.** Make duplication and deletion symmetric (0.05 /
   0.05) so module count is not pushed up by mutation pressure alone.
3. **Fix the HUD metrics.** Replace raw "modules" and "branching %" with
   **reachable modules** and **cells per plant**. Complexity claims have to be
   measurable or the whole exercise is unfalsifiable. Keep the tap-to-inspect
   plan readout and the body-plan list; they work.
4. Keep: warp 1k/10k/100k, the water and soil-loss inputs, the DOM-free core,
   the single file, the CSS-driven canvas sizing.

### How to test
The core is DOM-free, so extract it and run headless:

```bash
python3 -c "
src=open('conduit-plants-7.html').read()
js=src.split('<script>')[1].split('</script>')[0]
open('core.js','w').write(js.split('/* ==== RENDERER ==== */')[0]+'\nmodule.exports={createSim};\n')
"
node -e "const {createSim}=require('./core.js'); const s=createSim({cols:200,rows:140,seed:1});
for(let n=0;n<20000;n++) s.step(); console.log(s.snapshot());"
```

Roughly 700-800 ticks/second. Always run 40-60k ticks across 2-3 seeds before
believing anything, and always report cells/plant, reachable modules,
population, generation rate and extinction. Several plausible-looking changes in
this project have caused silent extinctions.

---

## 4. Branch 8a — dead tissue topples

**Spec.** Dead tissue stops becoming soil immediately. It becomes a rigid dead
solid that obeys the same falling-sand rule the soil already uses (down, else
down-left / down-right), and only after a while crumbles into soil. A standing
dead plant then slumps sideways into a heap on its own. Living tissue that loses
support keeps its current straight-down body fall; only dead matter tumbles.
That distinction is worth keeping — it makes "cut off" look different from
"rotted".

**Answered by Greg.**
- **Rigidity lasts roughly one of the cell's own lifetimes**, or a rough
  approximation of it. This is directly available: `age[i]` already increments
  once per decay period while a cell lives and is not used for anything else
  now that senescence is off, so a cell's age at the moment of death *is* its
  lifetime. Carry that number into the dead cell and count it back down; when it
  reaches zero the cell crumbles to soil. No new bookkeeping, no global clock,
  and long-lived tissue leaves longer-standing snags, which is a nice
  consequence rather than a rule.
- **Crushing is approved.** At minimum, dead matter landing on living tissue
  shades and kills it; outright crushing is fine.
- Dead matter still blocks light while rigid.

**What to expect, honestly.** This will not change the evolutionary dynamics.
-7's plants are ~7 cells and ~5 tall; a 5-cell whip slumping is two or three
pixels of motion. Expect: heaps, occasional gap creation, a slightly higher
generation rate from the extra turnover, and no movement at all in the size or
height ceilings. It is worth building for the death mechanic and the disturbance
regime, but it does not touch the stagnation, and it should not be judged on
whether it does.

---

## 5. Branch 8b — the isometric plane (highest expected value)

**Spec, as Greg described it.** Plants "float" again. Vertical screen space is
read as ground receding behind the surface, as if viewed from an angle. Possibly
no soil at all for a first MVP. Water still flows. Light comes from a downward
angle, so shading reaches only the cell immediately below a plant, or within one
empty row — vertically separated plants both get full sun.

**Why this is the one that matters.** It removes the space ceiling. A 200x140
plane is 28,000 possible sites instead of a 200-cell line — a ~140x increase in
how many plants can coexist. That fixes the population problem, and with it the
statistics: effective population in the hundreds or thousands instead of 60
means selection stops being drowned by drift. That alone may produce visible
directional evolution for the first time in this project.

**Answered by Greg.**
- **Keep both shoots and roots.** They share the plane and differ in what they
  can enter and what they can absorb. `grav` has no meaning without an up, so
  retire it rather than leave a dead gene in the genome — or repurpose it as a
  bias toward or away from the plant's own origin, which is the only intrinsic
  axis a body has left in a plane.
- **Inside the conduits, water should flow preferentially toward the far end**
  rather than diffusing. Note this is a deliberate change from the original
  brief, which insisted packets have no inherent preferred direction and simply
  reverse at a tip — worth being explicit about, because it is the one
  first-principles rule in the project that is now being relaxed.
  The local way to get it: give a packet one step of memory and make it unlikely
  to step back into the cell it just came from. A persistent random walk moves
  directionally along a stem, still turns around at a dead end, and needs no
  global map, no source-sink table, and no per-plant state. Expose the
  back-step probability so the old undirected behaviour is still reachable at
  0.5.
- **Outside the plant, wind.** A very slow-moving noise field pushes rain,
  vapour and pooled water in different directions over time. Tunable, and it
  must be possible to set it to zero to see the world without it. A simplex
  implementation is not needed for this: a handful of sine terms with slowly
  drifting phase gives a low-frequency field that turns over time, in a few
  lines and with no library. Wind is the thing that will supply spatial
  heterogeneity in this branch — dry quarters and wet quarters that move — so it
  is doing the job relief used to do, without being imposed terrain.
- **Support and falling: off entirely.** Floating is the point of this branch,
  which is exactly why it should not be merged with 8a.
- With light nearly free, the scarce things are plane area and water. That is
  intended.

**What to expect.** Population in the hundreds. Competition becomes contact and
area occupancy, so the no-touch germination rule becomes the dominant selective
force. Expect selection for plans that ramify and tile the plane — which may
mean *more* complex bodies, since area now converts directly into resource
capture. Two risks worth watching: with light free everywhere the world may
converge on one space-filling mat strategy rather than diversifying, and with
gravitropism inert the plans may get **simpler** rather than richer. If either
shows up, the fix is a scarce resource with a spatial gradient (the sloped-water
option above), not more genes.

---

## 6. Branch 8c — conserved soil and a nutrient cycle

**Spec.** Soil is finite. A plant must take up a mineral unit from soil to build
a cell, carries it in that cell, and returns it to soil where the cell dies.
Carbon still comes from the air without limit; only the mineral is conserved.
Building a cell then costs sugar + water present + one mineral.

**Answered by Greg.**
- **Inventory is tunable, and starts at roughly the same amount as the water**
  (so ~800 by default, sharing the water number's role as the dial the whole run
  hangs on). Seed it as free mineral in and just above the floor rows so the
  first generations have something to mine.
- **Litter returns its mineral to soil where it falls and dies — it turns into
  sand, basically.** So a dead cell becomes a grain that carries the mineral it
  was built from, and that grain falls, piles and can be mined again by whatever
  roots reach it.
- Mineral as a **particle**, taken up by roots the way water is: consistent with
  the engine, and conservation stays exact and auditable in the HUD.

A consequence worth noticing: in this branch soil is no longer manufactured out
of thin air, so the world can never silt itself up the way -7 does with soil loss
at 0. The whole burial problem disappears, and it disappears for a reason rather
than by being switched off. The tradeoff is that total living biomass is now hard
capped near the mineral inventory (~800 cells against -7's usual ~430), so the
number needs to be generous enough that plants are competing over a real pool
rather than starving in one.

**What to expect.** An early boom as the free pool is taken up, then a steady
state where growth is rate-limited by death — turnover and succession become
the main dynamic rather than expansion. Selection should favour capturing
mineral fast (dense roots), holding it (durable tissue, longer-lived cells), and
placing offspring in your own enriched litter. Of the three branches this is the
one most likely to produce the local adaptation Greg has been asking for since
-6, because the environmental differences are made by the plants and are
heritable by proximity. Keep the seed walk short here or that inheritance washes
out.

---

## 7. Suggested order

8b first: it is the only one that lifts a hard ceiling, and everything else is
easier to judge in a world where selection is not drowned by drift. Build it with
wind at zero first, confirm the plane behaves, then turn wind up — otherwise two
unfamiliar systems are being judged at once. Then 8c,
which supplies the local gradient and the recycling. 8a last, and merged into
whichever branch has plants big enough to be worth toppling — on current sizes
it has nothing to knock over.

8a and 8c are compatible and mutually reinforcing (dead matter falls, piles,
then crumbles and returns its mineral where it lands). 8b is a different world
model and should stay its own branch, as Greg suspected.
