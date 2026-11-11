# SAMPLER — handoff

**Read this whole file before writing a line of code.**

This project is the most successful attempt Greg has made at a coevolutionary
plant-ecosystem simulation across dozens of tries over several years. He said
so explicitly. Do not restart it, do not redesign it, do not "improve" the
architecture. Continue it.

Part 1 is Greg's own prompts, verbatim and in order. He asked for these
rather than a summary, because the way he arrived at the design matters more
than the design's final state. Read them first and read them properly. Almost
every good decision in this project came from him correcting me.

---

# PART 1 — GREG'S PROMPTS, VERBATIM

## [1] Opening

> I'm going to give you a couple similar briefs, but I don't want you to follow them beyond the 3 goals and other aims / preferences, to which I want to add.
>
> we've tried this a bunch of times and i'm almost always disappointed with the output, especially aesthetically. so i thought maybe this time i should be much more restrictive and constrained with the aesthetic requirement and then natural forms can emerge from those formal constraints.
>
> i think palimpsest 2 came closest aesthetically, though i think i'd still prefer it to be visibly pixelated. in fact, let's use pixel art as an explicit inspiration. see these example images i've uploaded, like from this Susan Kare tapestry piece https://www.ycrootaccess.com/p/susan-kare-on-designing-the-original; see the other images I uploaded, in which I'm meaning to indicate the smaller grass like plants with clear discrete connected bodies. (not the more abstracted tree)
>
> so in our grammar of possible life shapes, let's constrain it like we're Susan Kare pixel artist: a plant cell must be connected to another plant cell in moore neighborhood to make a legible connected shape. i feel like the whole pixel art and aesthetic focus of this session is all in service of making it more LEGIBLE, clear, simple, easy to follow.
>
> So, take all this and help me brainstorm a new brief / plan that i'll ask you to code an MVP prototype after we agree on it.
>
> i feel like simplant and spring-fall had a closer aesthetic to what we're going for in this session. all that said, we still need to achieve all 3 of the goals. just especially focusing on aesthetics as the primary one in this session.
>
> IF YOU CANNOT ACCESS ALL OF THE FILES IVE ATTACHED LET ME KNOW IMMEDIATELY BEFORE THINKING MORE. BEFORE READING CLOSELY PLEASE JUST CONFIRM YOU CAN ACCESS ALL I UPLOADED

*(Attached: `palimpsest-garden-2.html`, `palimpsest-garden-research-plan.md`,
`alife-plan-2.md`, `simplant-20.js`, `spring-fall-sand-garden-40.js`,
`emergent-coevolution-requirements-brief.md`, and four pixel-art reference
images — the Susan Kare tapestry full and cropped, plus two screenshots of
pixel-art plants.)*

## [2]

> yes. please read and inspect everything i uploaded now. you can skim later parts of the alife and palimpsest briefs as i think those got too complex and were immediately illegible which is why i want to focus on aesthetics to achieve all the requirements  (requirements are more important). but read the other files in full

## [3]

> 1. yes i like the strokes decision, feels like the right thing to constrain!
> 2. i think keep things to 1-3 cells thick max. and i still like the idea of it being a kinda isomorphic angle so that the entire canvas is ground it's just that the lower area is "closer" to us, though relative sizes won't change, as if we're looking at a flattened telephoto lens shot from very far away. and i like how light is then taken as an abundant nearly endless external resource added to the system via open sides. so 3-thick would be absolute maximum possible, but i imagine natural selection would tend away from 3-thick unless it's serving a specific function bc the middle cell layer wouldn't be absorbing any light so it'd be extra expensive.
> 3. i think we can still have gravity while still having the isomorphic angle. so the sides don't have to loop around torus-like right now, but we can still have water flow down/side maybe, if that makes sense. so the whole canvas is ground but still keep gravity.
> 4. lets keep it simpler and legible one shared palette for all life; genetic drift should be legible from morphology not color.
> 5. fast forward evolutionary time with option to slow.
>
> also i dont love colored soil or nutrients in the soil. it's always hurt legibility and simplicity. if its just dead soil, it could maybe be a super desaturated version of the color it was alive, but beyond that it shouldn't act differently or be distinguishable from any other block of soil.

## [4]

> 1. yes, your open sides reading is basically right. i envisioned it conceptually slightly different but operationally the same: i imagined it that the seed is "touching" the empty ground (or soil), and then i imagine the plant growing up from that in a z direction such that empty spaces next to it are what i'd call empty air in relation to the plant but empty ground in relation to the seed, if that makes sense. so when a seed stops it's random walk, as long as it stops surrounded by empty spaces, that spot will be considered the ground (the whole canvas is the ground as i said), while the plant then grows "up" in the z direction rather than slithering flat on the ground. but of course this is in 2D so you're right to say surrounded by empty spaces = open side, just a bit of semantics.
> 2. yes water contact makes sense. in previous iteration we had energy and water flow like conduits throughout the plant and often have water respire in order to create energy so water turns to vapor and does a random walk for a while before either hitting another vapor or just spending enough time and turns back to falling water. i like this but don't want it to add too much complexity or obscure the legibility. i do like how that respiration and vapor can create little clouds or self-feedback-loops of more humid areas, etc.
> 3. to start they can all be one flower color (ie non green/stem/leaf color) -- let's say pink for now. but eventually (prob not mvp unless you think feasible), i'd love to bloom color to offer a fitness advantage. this is one idea that's not as local and is a little more artificial, but i like it: if all the other flowers currently on screen are the same or similar colors, a novel / distinct color would get a reproduction reward proportionate to the distance of color difference. so it could even be a simple 1D measure of hue like is HSL/HSB or maybe it makes sense to map it in 2D space (hue + brightness? hue + saturation?) but it'd get a larger reward for the bigger difference in hue to existing average (or maybe avg within some larger-but-still-local radius??). so more unique colors get rewarded and i think that could when cool evolutionary / co-evolutionary effect, or at least add a new dimension to fitness which could increase robustness and complexity à la Dave Ackley. And yes in this system a green flower would possible too, but maybe start the default color as far away as possible from stem green, for legibility as things start.
>
> 4. field size, i do want it to be adjustable/settable (through mostly hidden ui or url slug params) but i think by default should be 4px per cell and fill window size maximum cell dimensions as possible for that window. and could change to 3px or 1px per cell! for the sake of evolution and giving it immense time and space, i do think 1px per cell would be cool to see and help increase evolutionary / generational reps.

## [5]

> 1 and 2 and 4 look perfect.
> 3: i agree we do a simple single color for mvp, but I'd like the notes to note the future state vision. i tend to like the local radius idea i proposed and maybe have it weighted by distance too (radius could even be as big as half or whole canvas or more) so that the reward is strongest if a sharper difference to plants closeup. i'm imagining this would sorta be abstracting the effects of a pollinator without having to actually introduce a premade designed life form into the mix. i'm also very intrigued by the idea of color as mate compatibility! though it makes me realize, i don't know if we've locked down genetics or mating will work... i was thinking for mvp it might be just clonal children with reasonably high mutation rate (i think around 0.2-0.5 was ideal for rapid evolution in simplant or similar sims)... that seems most legible to me, but im definitely open to actual mating especially if it's more likely to drive real natural selection and co-evolution and speciation, maybe the phenotype effects will be legible and simple enough even if the exact logistics of genetic reproduction aren't as visible...

## [6]

> perfect as is, build it

## [7]

> you hit a limit, please continue but prioritize giving me a html file asap

## [8]

> seems right to me. here's how it looks as loaded and after sowing some extra seeds. please continue to next phase

*(Attached two screenshots of Phase 0 running on iPhone.)*

## [9]

> Great job, the field and motion looks legible as desired! Please continue, and add phone friendly UI

## [10]

> It's looking very good! But I'm confused about a few things:
> - Minor bug, but it seems like plant populations in a lot of runs tend to only shift down and eventually only exist at the bottom of the canvas along the surface of the water. My guess is maybe seeds have a minor downwards bias, maybe due to unintended interaction with the rain? We can consider seeds in flight as their own occupancy grid, ie ignoring anything else until they land.
> - What is litter? I don't remember asking for that, and I probably missed it in your planning doc. Is it soil, ie dead plant matter?
> - What is grafting and how does that work? You referred to it earlier. Is it just within normal clonal reproduction, a mutation can happen that doubles a body part? That seems good, if so. Or do you mean something closer to actual tree grafting ie a plant can grow on another plant that doesn't share its genetics? That seems less legible / interesting to me right now.
> - Can you add a x512 and x1024?
> - What's all the yellow static dots, are those failed seeds? If so, let's have them disappear much faster. Maybe fade away and disappear after failing to germinate.
> - Recap the next planned steps under the presumption that I didn't read the plan closely -- what's next, simply but in detail?
> - The default background color seems to be dark blue, but let's make it perfect black.
> - When the sim starts, there are several starter plants, but they're all already partially unfolded with a left leaf already. Why can't they just start as seeds and emerge like any other seed? And can we make the starter plant as simple as possible while still giving it all the ingredients/potential to eventually evolve into any shape allowable by the physical rules we already established?
> - Also it seems like rain begins at various levels of the canvas. What if it always starts from the very top?
> - What are "packets"? I don't remember asking for that either but it's probably just an unfamiliar term.
> - Maybe rain should cause dead plant matter to decay/disappear faster.
> - Can you display the prng seed of the run? And just to confirm, the reset button sets a new rng seed, right? Or does everything happen perfectly deterministically such that's there's no need for a world rng seed?

## [11]

> It's looking really really good so, the best ever after doing dozens of attempted projects across years!
>
> Some questions, clarifications, requests:
> - Do flowers currently provide any benefit or purpose/function at all? Are they just a latent genetic potential waiting for a mutation to happen upon it? (I realize they're more impactful in the next phase, I'm just genuinely asking about where we are currently). One idea I had, though I'm not sold on it, is that a plant would have to flower in order to produce a seed. How does a plant produce a seed now - just enough energy accumulation? And where does the seed release from? I was thinking it'd release from the flower head, so a plant with two flower heads would release twice as many seeds. And that could end up emergently affecting how families / generations of plants move across the canvas, since a plant with a very left-facing flower / a single flower on a far out left branch might end up mechanically tending to have children to the left of their own seed's starting position.
> - Could we make water a little darker, like closer to being black? It tends to dominate the screen when there's a lot of it, but I'd rather it be a little subtler.
> - How do leaves work? Are they a different type of tissue that absorb light energy more efficiently? A latent genetic possibility waiting to be stumbled upon via mutation? Or are they just described by shape alone and act the same as any other plant tissue, aside from flowers?
> - Re: a reason to be tall... don't build this yet, I'm just thinking out loud. What if we really took the z direction of plants seriously, such that you'd consider the top of a plant that's 10 straight-up pixels tall to be at z=10 for the x,y of the seed? even though in our 2D render, it'd appear to be 10 grid cells above (y-10) the  seed. And then that plant would shade up to 10 cells in different directions, depending on where we model the sun to be... I really don't want to sacrifice legibility to add too much complexity. Would this be basically creating a full minecraft 3D world but only rendering in 2D from a certain angle, or would it be more like its own 2.5D with its own particular rules that emerge from that 2.5D? I think it's the latter which seems cooler to me.

## [12]

> Make the water even darker. And implement the flower requirement, make the starter plant a short stroke with a flower.
>
> And you never answered my two direct repeated questions: are leaves and flowers latent genetic options that evolution had to happen upon? Are leaves genetically distinct? Your answer that leaves are a "swelling" stroke clarified nothing. What is a "swelling" stroke?
>
> Don't implement shade yet. Next message, I'll give you the go ahead to move forward with the planned next steps.

## [13]

> What is a "mass mark"? You keep introducing jargon that I never used. And please start incrementing file names! I'm saving the latest as -3.html !

## [14]

> Yes, eliminate any unneeded jargon. And proceed to make -4, implement as much as possible as makes sense.

## [15]

> you've built it twice and each time i get a console script error

## [16]

> it seems like flowers are able to deformed? they "evolve" into weird shapes, i think if they're not a proper shape they shouldn't work... and i'm not sure i like the shade, it's not super legible. i guess try making seeds darker/browner and you can make the ground empty space very very dark brown

## [17]

> i think you're understanding the shadows wrongly. you have a tall unadorned stalk casting a triangle shadow. i'm saying that at most, each plant cell should shade one other cell. so for a plant 5 cells tall (seed + 5 stems directly up) would shade at absolute most 5 cells elsewhere, a variously angled (depending on the sun) shadow image that also starts from the seed. does that make sense? if so, can you fix and create an exhaustive handoff md i can bring to a new instance? since this was really the most successful exploration in years, I'd love you to start with my exact prompts to get the next instance along the exact same lines rather than a summary of it.

---

# PART 2 — WHERE THE BUILD IS

Current file: **`sampler-8.html`**. Single self-contained HTML file, no
dependencies. Greg saves each build locally by number — **always increment the
filename**, never reuse one.

Companion documents: `sampler-mvp-brief.md` (the agreed design, still
authoritative) and `sampler-glossary.md` (plain-language meanings of every
term, written because Greg objected to unexplained jargon — see [13]).

Phases 0 through 3 are complete:

- **Phase 0** — the mark grammar, palette, renderer, rim light. Greg approved.
- **Phase 1** — water, gravity, seasonal rain, the visible metabolism loop.
  Greg approved.
- **Phase 2** — seeds, mutation, death, litter, evolution, touch UI. Greg
  approved.
- **Phase 3** — flowering required for seed, 2.5D height, sun and shadow,
  shade-driven limb shedding, dark brown earth.

Latest 60k-tick run: 16–38 plants, up to 18 distinct forms, generation 20,
average body 14 cells, every flower head intact, zero diagonal chains.

---

# PART 3 — HOW IT WORKS

## The three goals (unchanged, from Greg's own requirements brief)

1. **Legibility** — simple local rules, no hidden state, followable moment by
   moment.
2. **Evolution** — real selection, one common ancestor, coevolution,
   environmental history, eventual invasion dynamics.
3. **Biophilic form** — functional, varied, recognisably plantlike structures
   that are not hard-coded.

Aesthetics leads this attempt. The bet, from [1], is that hard formal
constraints produce natural form — the opposite of previous attempts, which
left form free and got fuzz.

## The aesthetic constitution (hard rules — a rule beats a feature)

1. **Strokes, not cells.** The smallest thing that grows is a whole mark.
2. **Eight directions only.** Horizontals, verticals, 45s.
3. **Bodies 1–3 cells thick.** The economy enforces this; the cap is insurance.
4. **One shared palette**, 16 fixed colours. Drift must read from **morphology,
   not colour** — Greg was explicit about this in [3].
5. **Clear negative space.** Every plant is its own silhouette.
6. **Rim light is metabolism.** The lit edge is exactly the earning part.
7. **Dark ground, bright figures.**
8. **Nothing hidden.** Anything causal is a visible pixel.

## The grammar — two marks, and only two

- **`S(turn, len, prof, ...children)`** — a stroke. `turn` is relative to the
  parent (−3..3, so eight directions); `len` 2–7; `prof` is `FLAT` (one cell
  wide) or `SWELL` (bulges to three across the middle stretch, making a blade).
- **`F(turn, shape)`** — a flower. `PLUS`, `RING`, or `BLOCK`, capped at 3×3.
  Terminal, never has children.

**There is no leaf and no leaf tissue.** A blade is a stroke whose `prof` bit
is `SWELL`, and it behaves identically to any other tissue. Greg asked this
twice and I dodged it twice ([11], [12]) — do not repeat that. The precise
answer: the SWELL bit exists in every stroke gene from tick zero, so blades
were never latent; a flower is a genuinely different kind of gene, so it *was*
latent and had to be found by mutation.

## The ancestor

```js
const ANCESTOR = S(0,3,FLAT, F(0,PLUS));
```

Deliberately the minimal *viable* organism: a short stroke wearing a flower.
Everything else is earned. It needs the flower because flowering is now
required to set seed. The root stroke always heads up — that anchor is what
makes plants stand rather than sprawl radially.

## The world

Whole canvas is ground, viewed at a flattened top-down angle. Screen-y does
double duty as both ground-depth and plant-height — the tapestry convention,
which the eye accepts. Edges do not wrap.

Cell kinds: `OPEN`, `LIVE`, `DEAD`, `WATER`, `VAPOR`, `SEED_CELL`.
Roles inside `LIVE`: `TISSUE`, `PETAL`, `CORE`.

Gravity acts on water only. Water falls, runs downhill, and leaves through a
**spillway** at the low edge — it drains only once the pool at that column is
deep enough. That single rule is what keeps a pond through drought without
flooding in the wet (see Part 4).

## The economy

A cell's income is **the number of its eight neighbours that are open ground,
minus three**, minus its shade. Counting only the four orthogonal neighbours is
a trap — see bug 13. Upkeep is per cell per tick. Ageing is a **separate,
size-independent cost** rising faster than linearly, so every plant eventually
starves.

| position | open of 8 | light | feeds? |
|---|---|---|---|
| tip of a 1-thick stroke | 7 | 4 | yes |
| middle of a 1-thick stroke | 6 | 3 | yes |
| flower petal | 5 | 2 | yes |
| flower centre | 4 | 1 | no |
| cell in a 2-thick stroke | 3 | 0 | no |
| middle of a 3-thick mass | 0 | −3 | no |

So thinness is *paid for*, not imposed. Crowding and income are the same
number with opposite sign: a neighbour growing flush against you takes one of
your faces. That is the entire competition model.

## The metabolism loop (all visible)

1. A cell touching water absorbs it → a **blue drop of sap** climbs the body.
2. At a cell with enough open faces, water + light → energy. A **gold drop**
   descends to the base. A **white vapour mote** is released.
3. Vapour drifts, then condenses into falling water.

Blue up, gold down, white away. Humid microclimates fall out free.

## Shade — the rule Greg corrected in [17]

**Every plant cell blocks exactly one cell's worth of light. No more.**

A cell standing `z` above its own seed throws its shadow `z` steps along the
sun's ground direction, measured from the seed's row:

```js
tx = cellX + z * SUN_X
ty = rootY[cell] + z * SUN_Y
```

So the shadow on the ground is the plant's own silhouette, sheared by the sun
angle, anchored at the seed, and containing exactly as many cells as the plant
has above ground level. A five-cell stalk casts a five-cell diagonal line.

**This is not a heightfield sweep.** I originally built it as one — a shadow
horizon decaying with distance — which treats the plant as an opaque column
and produces a filled triangle. Greg rejected that. Do not reintroduce it.

`high[j]` is a cell's height (how far up-screen from its own seed, floor 0).
`rootY[j]` is its seed's row. Both are written when a cell is placed. Growing
up gains height, sideways holds it, back down toward the seed loses it — which
is exactly what makes a runner a runner.

Sun position is two constants, `SUN_X` and `SUN_Y`, currently `(1,-1)`: the sun
sits behind the viewer, so shadows fall away from us, back into the field.
Note that `(0,-1)` — sun exactly behind — is degenerate: a cell at height z is
already drawn z rows up, so its shadow would land precisely under it and be
invisible. The sun needs some sideways offset. Changing it is a one-line edit.

## Heredity

Clonal. All reproduction routes through `breed(parents[])`, which today always
receives one parent — **structured this way on purpose so pollen can be added
as a patch rather than a rewrite.** The subtree-crossover operator is the
obvious next step and belongs inside `breed`.

Mutation operators:

- **perturb** — nudge one field (direction, length, the FLAT/SWELL bit, or
  convert a childless stroke tip into a flower and back).
- **graft** — copy a subtree of the plant's own genome and attach it elsewhere
  **in that same genome**. Gene duplication and divergence. Greg checked in
  [10] that this is not cross-organism grafting. It is not.
- **prune** — delete a subtree.

Graft is the operator that builds complexity: one lineage evolved a compound
plant made of repeated copies of its own ancestral module.

## Flowers

Flowering is required to set seed. Each flower head is an independent launch
site, paying the seed cost on its own — so more heads means more *throughput*,
which only pays if the plant has surplus. Seeds launch from the head's
position, so a lineage whose only head sits on a far-left branch really does
creep leftward over generations. That was Greg's prediction in [11] and it
works.

**A flower is whole or it is not a flower.** It is placed one step clear of the
stem tip so no petal is ever swallowed, and it is fitted *strictly* — every
cell must be free ground or it does not build. Petals are exempt from
shade-shedding. If the stem holding a head is shed, the whole head falls
together and stops counting.

## Litter

Dead plant matter. It keeps its cells, still blocks growth, still steals
neighbours' open faces, still casts shadow, and rots away — five times faster
when wet. **This is the only way the ground remembers what grew there.** It
exists because Greg rejected coloured soil and soil nutrients in [3]: history
is recorded as geometry, not chemistry.

## Rendering

One `Uint32Array` framebuffer written directly and blitted once per frame. No
sprite objects, so 1px-per-cell scales fine. URL params: `?px= &w= &h= &seed=
&tps= &n= &rain= &recolonise=`.

Everything routes through one seeded PRNG, so a run is reproducible tick for
tick from its seed. The seed is shown in the readout. Reset picks a new one.

---

# PART 4 — EVERY BUG, AND WHY IT HAPPENED

These cost real time. Do not rediscover them.

**1. Striped diagonal blades.** Widening a diagonal stroke with its
*perpendicular diagonals* produces three separate parallel lines with gaps. A
diagonal must widen with its two flanking **orthogonals**, which fill the
staircase steps into a solid band.

**2. Every flower silently failed to build.** A flower centred one cell past
its parent's tip always has one petal landing *on* that tip, so a strict fit
check rejected it. First fixed by letting marks pass through the plant's own
tissue — which built flowers but *deformed* ones. Correct fix: place the head
one step further along so it clears the stem, then fit strictly.

**3. Immortal bodiless plants.** A plant whose first mark could not fit had
zero cells — and zero cells means zero upkeep, so it never starved and never
died. The world filled with two thousand ghosts. A seed now becomes a plant
only if its root actually takes; otherwise it stays a seed and waits.

**4. Newborns killed before their first tick.** The fix for (3), applied in the
wrong order, judged plants before they had grown. Grow first, then judge.

**5. Water flooded the world.** Rain was a pure source. A flat per-cell drain
on the bottom row saturates at one row's worth however much is upstream, so no
rate both keeps a pool and prevents flooding. The spillway — drain only when
the pool at that column is deep enough — fixes it. Water now swings between
roughly 1,900 cells wet and 40 dry, stable over 60k ticks.

**6. Transient raindrops killed marks permanently.** Water was impassable, so a
drop sitting where a mark wanted to go discarded that branch forever. Only 2 of
40 plants ever flowered. Growth now displaces water, and the drop is drunk.

**7. Plants missed the rain passing through them.** `drink()` sampled one
random cell per tick. It scans the whole body now.

**8. Everything collapsed to 3-cell sticks.** Two causes, both economic. Water
absorption had a floor of one unit per tick, so a tiny plant drank as fast as a
large one — a free lunch for being small. And senescence *multiplied* the
size-based upkeep, so a small plant aged into a still-tiny cost and never died;
generation stalled for 35,000 ticks because nothing could germinate. Absorption
now scales with contact area, and ageing is a cost in its own right.

**9. Flowers were purged by selection.** Measured: 3 of 105 survivors carried
one. A flower cost cells and did nothing, so drift removed it. Fixed by making
flowering required — now 44 of 45.

**10. Seeds drifted downhill.** I had written a 35% straight-down bias into
dispersal. Greg spotted the symptom in [10]. Flight is now isotropic and
ignores the grid entirely until landing.

**11. The rename broke the flower constructor.** A regex rename changed the
placement check but not the string literal it compared against, so no flower
ever built and the world went sterile.

**13. Evolution grew enormous straight 45-degree lines.** Light was counted
over the four orthogonal neighbours. A diagonal staircase touches its own body
only at the corners, so it read as nearly unoccupied and earned **1.93x** what
a straight stalk earned for the same upkeep — a lattice artefact of using a
four-neighbour count with an eight-direction grammar. Now counted over all
eight neighbours, minus three. Two knock-on effects when fixing this: flower
petals lose income too (they were only "thin" under the four-count), and the
whole economy needs rebalancing — `UPKEEP` at 0.004 is the sweet spot, and
lowering it *further* makes things worse because long-lived plants block
succession. Also removed a fallback that quietly credited 2 energy to a cell
yielding nothing, which was rewarding buried cells and masking the real
balance.

**12. `ReferenceError` killed the render loop — and I shipped it twice.**
`drawHud` referenced a variable whose declaration patch had silently failed to
match. It threw on the first frame. **The real failure was my test harness**:
it stubbed the DOM and cut everything after `boot()`, so it never executed
`render()`, `drawHud()`, `syncBar()`, or any handler. I was testing the half of
the program that wasn't broken and reporting it verified.

## Run the smoke test before shipping anything

`smoke.js` loads the real script and calls boot, 1,200 ticks, render, the
readout, the button sync, all six buttons, all five keys, a canvas tap, and a
resize. It catches the entire class of bug above. Recreate it if it is missing:
stub `document.getElementById`/`createElement` returning objects with
`classList`, `dataset`, `textContent`, `offsetHeight`, `children`, `closest`,
`getContext`, `getBoundingClientRect`, and an `addEventListener` that captures
handlers so you can invoke them.

Also keep a headless simulation harness that runs 40–60k ticks and reports
plants, seeds, distinct forms, generation, births, deaths, litter, water,
average body size, shed events, and intact-versus-deformed flower heads.
Population health is not visible in a screenshot.

---

# PART 5 — HOW TO WORK WITH GREG

- **He is right more often than I was.** Every significant correction in this
  project came from him: the seed drift, the deformed flowers, the shadow
  model, the jargon. When he pushes back, he has usually seen something real.
- **Answer the question he actually asked.** He had to ask twice about leaves
  and twice about jargon. Do not restate a term in other invented words.
- **Never introduce vocabulary he did not use.** If a thing is a flower, call
  it a flower — in prose *and* in the source.
- **Increment the filename on every build.** He saves them locally by number.
- **Never use tappable multiple-choice questions.** Plain text questions only;
  he often has more to say than options allow.
- **Prose before code** at each checkpoint, and ask rather than guess when
  uncertain. He said so up front and it has worked.
- **Report findings honestly, including ones that undercut the work.** The
  selection-toward-smallness finding and the now-inert shed mechanic are both
  more useful to him than a clean story.
- He is on mobile much of the time. Keep replies scannable.

---

# PART 6 — WHAT'S NEXT

**Open right now:** shade is correct but limb shedding has become nearly inert
— 5 events in 40k ticks, down from 936, because a sheared line casts far less
shadow than the old wedge. Either lower the shed threshold or drop the
mechanic. Greg's call. He has also said twice that he is unsure about shade
generally; be prepared to cut it.

Then, in the order agreed:

1. **The pollinator field.** Greg's idea, and he prefers his own version: a
   bloom's reproductive advantage rises with how different its colour is from
   nearby blooms, **distance-weighted so a sharp difference from close
   neighbours pays most**, radius possibly half the canvas or larger. He frames
   it as the abstracted effect of a pollinator we decline to model — a physics
   of the world rather than a score on the organism, which is what reconciles
   it with the no-fitness-function rule. Implementation note: keep a coarse
   block-grid of running hue sums, updated on bloom birth and death, blurred,
   sampled O(1) per bloom. Do not compute it naively.
2. **Pollen and real mating.** Heads emit pollen motes on short walks; a mote
   landing on another plant's head makes that head's next seed a recombinant.
   Isolation-by-distance comes free. An isolated plant self-fertilises.
   `breed()` already takes a list of parents for this.
3. **Colour as mate compatibility.** Pollen only takes on a similar-coloured
   head. This is what makes a later encounter read as two species meeting
   rather than one lineage displacing another — which is what goal 2's invasion
   scenario actually wants.
4. **Terrain.** Ridges and basins deepen the wet/dry gradient into separated
   habitats, so a dry band is a barrier and a wet season is a bridge. Both
   arise from water physics already present — no scripted event, no user gate.

**Also unresolved:** blooms are still a single pink. Any bloom-colour work
must be squared with Greg's rule from [3] that drift reads from morphology,
not colour. His own framing (colour as a pollinator signal, not a lineage
marker) is the reconciliation, but confirm it with him before building.

---

# PART 7 — THINGS NOT TO DO

- Do not restart, redesign, or "clean up" the architecture.
- Do not reintroduce the heightfield shadow sweep.
- Do not add a fitness function, novelty score, or beauty score.
- Do not add coloured soil, humus, or nutrient fields.
- Do not hard-code leaf, root, flower, predator, or prey into the physics.
  Marks are marks; function is earned.
- Do not use continuous coordinates, bezier curves, gradients, or
  anti-aliasing.
- Do not give a lineage ID any power in the physics.
- Do not add user-triggered events or gates. The world runs itself.
- Do not ship without running the smoke test.
