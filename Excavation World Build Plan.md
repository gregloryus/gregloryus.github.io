# Excavation World Build Plan

Nov 9, 2026 · @Greg Lewis

## How to read this plan

Every behaviour in this plan is exact and prescriptive: what the world does, what plants and seeds do, what the player sees and can do. Build it as written.

Anything marked **Implementation note** is only a suggestion. The builder is free to find better or more novel ways to produce the same behaviour, and owns every under-the-hood decision this plan doesn't state.

Build from scratch. No earlier code needs to be read or reused; this plan plus its context is the whole brief.

Every number that tunes the world is a **dial**: adjustable from the interface, never hardcoded. The values in the Dials section are starting points to tune, not requirements.

Coordinates are written (x, y) in screen cells, with x counting columns left to right and y counting rows top to bottom.

## The idea

A small world of evolving plants runs by itself on fixed local rules. The player's only powers are to pause, rewind, and re-roll one chance event at a time (a seed's genes, or a seed's journey), then watch a different history play out. It is excavating possible worlds, not editing one.

Principles that govern every choice:

- **Minimal and simple.** As few rules and cell kinds as possible. The world should feel discovered rather than invented, like a geometric pattern that was always there.
- **Local.** Things act on their neighbours. Where a rule needs a whole plant to agree, a local signal passed through the body is preferred; plant-wide tracking is acceptable where it is much simpler or faster.
- **Emergent.** No outcome is scripted. Size, shape and spread come from the rules.
- **Legible.** A watcher can follow what happens and why. Prefer rules whose effects are visible.
- **Independent chance.** Every chance event has its own dice. Re-rolling one roll changes nothing else directly.
- **Every number is a dial.**

Form: one self-contained HTML file with no outside dependencies needed to run, working offline. Portrait phone first; it must also work on a desktop screen. Terrarium scale: small enough to follow individual plants and lineages, big enough for separate neighbourhoods to form.

## The world and the view

The world is a ground plane seen from the front and above through a telephoto lens, with the sun directly behind the viewer. There is no gravity.

**Size.** At startup, measure the screen and divide it into square cells of a set size (dial, 4 screen pixels). The world's size is then fixed for its whole life, because replays must be exact.

- Portrait: the top square of the screen (width × width) is sky; everything below it is ground. A 400 × 1000 pixel screen with 4-pixel cells gives 100 columns, 100 sky rows and 150 ground rows.
- Square or landscape: the top 25% of the screen is sky (dial).

**Rows are depth.** Each ground row is a strip of ground at a different distance. The bottom row is the front, nearest the viewer. The highest ground row, just under the sky, is the back row and the last row a seed can root in. Nothing roots in the sky.

**Plants are flat sheets.** A plant rooted at ground cell (x, r) stands in the upright plane of row r. Each of its cells has a column and a height above the ground (0 or more). A cell at height h in column x is drawn at screen cell (x, r − h). A plant rooted at (10, 10) with a stem 3 cells high is drawn at (10, 10), (10, 9), (10, 8) and (10, 7).

**Collisions happen only within a row.** Plants rooted in the same row share a plane, so they can't occupy the same spot. Plants rooted in different rows never block each other, even where they overlap on screen.

**Edges.** Left and right wrap: anything leaving one side continues on the other. Nothing grows below height 0. Nothing grows past the top edge of the screen. Plants may grow up into the sky band.

**Light: the viewer is the sun.** Light is all or nothing. Each tick, at each screen cell, only the front-most thing there is lit: of the plant cells drawn at that screen cell, the one whose plant is rooted in the row nearest the front. Everything behind it gets no light. Bare ground at a screen cell is lit only if no plant cell is drawn there.

So anything you can see is lit, and anything hidden is in full shade. Shadows never show, because each one falls exactly behind the thing that casts it. Example: a plant rooted at (10, 10) with a cell at height 1 is drawn at (10, 9). That cell shades the ground at (10, 9), so a seed there can't sprout. A stem 3 high shades ground 3 rows back.

**Implementation note:** one simple approach is a per-screen-cell record of the front-most row drawn there, rebuilt each tick, used for both drawing and light.

## Plant bodies and genes

A plant's body is a triple-bit tree: each cell carries a 3-bit gene saying which of its left, forward and right slots grow a child.

- **Facing.** Every cell faces one of four directions within its plane: up, right, down or left. Its gene's bits are read left, forward, right relative to its own facing: 010 is one child straight ahead, 111 is all three, 000 is a tip. A forward child keeps its parent's facing; a left or right child turns 90° that way.
- **The base.** The seed becomes the base cell at height 0, facing up. By default the base's gene is always 010, one child straight up, for legibility. This is a toggle; when it's on, mutation and gene-dropping never change the base's gene.
- **The genome** is the list of genes in breadth-first order (a 111 is followed by its three children's genes, and so on), read as a tree. It fully decides where every cell would sit relative to the base.
- **No self-overlap.** A genome never places two of its own cells in the same spot. A slot whose spot is already taken by the genome's own layout is never filled, and mutation never creates one.
- **Depth.** The base is depth 1; each child is one deeper than its parent. Mutation uses depth.
- **Two kinds of cell, both green.** Tips (gene 000) are flowers; every other cell is stem. Every cell catches light the same way.
- **What can't grow.** A cell can only be built where the plant's plane is open: no cell of another plant rooted in the same row, height 0 or more, below the top screen edge. A spot below the ground or past the top edge can never be filled. A spot held by another plant waits and may open later (see Life cycle).

## Energy and growth

Plants build their bodies from sunlight alone: every lit plant cell catches the same energy each tick, and building a cell spends it. There is no soil to draw on and there are no roots.

- **Catching.** Each lit plant cell gains a fixed amount of energy per tick (dial). An unlit cell gains nothing. Tissue is made from this energy, not from the ground.
- **Storing.** Each cell holds at most a set amount (dial). Anything above that is lost; this is the only way energy leaves a living plant. There is no upkeep: a cell costs nothing once it's built.
- **Moving.** Energy moves through the body from cell to connected cell, so light caught in one place can feed growth and flowers elsewhere. Preferred: local movement, at most one cell per tick, so distance inside a plant matters. Acceptable: a single shared store per plant, if that is much simpler or faster.
- **Buds.** A bud is a built cell whose genes call for a child in a slot that is currently open. Any bud with enough energy for one cell (dial) builds that child this tick and spends the cost. Many buds on one plant can grow in the same tick; there is no plant-wide limit of one cell per tick. If a bud can afford fewer children than it has open slots, which one comes first is the builder's choice, as long as it never depends on processing order.
- **Contested spots.** If buds of two plants rooted in the same row reach for the same open spot in the same tick, one wins by abiotic dice (not re-rollable). The other keeps waiting.
- **Seeds cost more.** A flower spends a larger amount (dial) on each seed it releases. Only hardened plants release seeds (see Life cycle); energy can build up before then.
- **Seedlings** start with a set amount of stored energy (dial, starting value 0), so a new plant normally grows from what its lit base catches.

**Implementation note:** local movement could be each cell sharing part of its store with connected cells each tick, leaning toward cells that need it (buds and flowers). A shared store needs a fixed, order-free rule for which buds spend first.

## Life cycle

A plant sprouts, grows while it can, hardens, makes seeds for a fixed lifespan, then dies all at once. If it built less than half its body by the time it would harden, it dies instead.

&#91;embedded content: plant life cycle · 3 states, 2 checks\]

Every path out of the cycle ends in litter; only plants that pass both checks make seeds.

1. **Sprouting.** When a seed's walk ends, it roots only if the 3 × 3 block of ground cells centred on it is all lit (toggle: only its own cell must be lit). Lit ground also means nothing stands there. The seed becomes the base cell at height 0, facing up. Otherwise it dies and adds 1 to the ground map where it lies. Cells of the 3 × 3 block that fall beyond the front or back row are skipped; left and right wrap. If two seeds would root on the same cell in the same tick, one wins by abiotic dice and the other dies.
2. **Growing.** Each tick, buds grow as their energy allows (see Energy and growth). A spot held by another plant isn't given up; the bud keeps waiting in case it opens.
3. **Grace period.** A plant hardens once it has gone a set number of ticks (dial) without adding a cell, whatever the reason: blocked spots, no energy, or nothing left to build. Adding any cell restarts the count. Until then it keeps growing into any spot that opens where its genes call for a cell.
4. **Hardening, or the half rule.** At the moment it would harden, a plant that has built fewer than half (dial) of the cells its genes call for dies instead. A starved or crowded generation dies rather than maturing as a stub of its intended shape. Genes that can never be built (below ground, past the top edge) count as unbuilt.
5. **Mature life.** A hardened plant never grows again, even if spots open. Its flowers release seeds whenever they have enough energy. It lives exactly a set number of ticks from hardening (dial), so a big plant's longer growing time doesn't shorten its seeding life.
6. **Death.** The whole plant dies at once. Each of its cells adds 1 to the ground map at its footprint: the ground cell directly below it in its own row. Every cell of a plant rooted at (10, 10) lands in row 10; a cell drawn at (9, 6) adds to (9, 10). Stored energy vanishes. Plants don't die any other way.

**Local signalling (preferred).** Whether a plant is still growing, how many cells it has built, and the outcome (harden or die) should ideally travel through the body cell to cell. For example, a "still growing" signal and a built-cell count pass from the tips toward the base, and the base sends the outcome back out, so hardening sweeps from base to tips over a few ticks. Tracking these per plant is acceptable if much simpler or faster.

## Seeds and their journeys

Each seed wanders the ground for a random number of steps, touching nothing, then sprouts only if it ends in light.

- **Release.** A hardened plant's flower (a built tip, gene 000) releases a seed whenever it has the seed's energy cost. A flower can release many seeds over the plant's life.
- **Start.** The seed starts on the ground cell at the flower's screen position. A flower drawn at screen cell (9, 6) on a plant rooted in row 10 starts its seed at ground cell (9, 6), not (9, 10). Seeds don't travel in three dimensions. If the flower is drawn in the sky band, the seed starts on the back row in the same column.
- **The walk.** One step per tick, to one of the four neighbouring ground cells, chosen by the seed's own journey dice. Left and right wrap. A step that would leave the front or back row still counts, but the seed stays put.
- **Length.** The number of steps is drawn uniformly between a minimum and maximum (dials, 10 and 100), also from the journey dice.
- **Nothing in the way.** A walking seed doesn't interact with or get blocked by anything.
- **The end.** On its last step the seed is on the ground and sprouts or dies as described in Life cycle. A seed that dies adds 1 to the ground map where it lies.
- **What a seed carries.** Its genome, with each gene's strike count (see Inheritance), and its identity: its parent, which flower, and which seed of that flower. Its genes are settled at release.
- **The first seed** is placed directly on the centre ground cell at the start of the world, with genes 010 then 000 (one stem cell topped by one flower). It doesn't walk, and its genes and position are fixed.

## Inheritance and mutation

A seed inherits its parent's genome, minus any gene left unbuilt three generations in a row, and one time in four its genes change.

**Three strikes.** Every gene carries a count of how many generations in a row it went unbuilt.

- When a plant hardens, each gene it built goes back to 0, and each gene it didn't build goes up by 1. A gene under an unbuilt gene is unbuilt too.
- A gene whose count reaches 3 (dial) is dropped from every seed that plant makes, together with everything beyond it, and its parent's bit for that slot is cleared.
- With the base locked at 010, the base's one child is never dropped.
- Unbuilt genes that haven't reached 3 strikes are passed on as they are, so a seed isn't a plain copy of its parent's body.

**Mutation.** Each seed's genes change with a set chance (dial, 1 in 4), decided by that seed's genes dice. Dropping happens first, then mutation. When a change happens:

1. **Grow or cut.** A coin picks one (toggle). If that kind has no possible site, the other is used. With the coin off, grow and cut sites share one urn.
2. **Where.** An urn picks the site, weighted by the depth of the cell that owns the slot. Linear (the default): depth d gets d tickets. Multiplying: each depth gets N times the tickets of the one above (dial, N = 2). Flat: every site gets one ticket. Grow sites are empty slots whose spot isn't taken by the genome's own layout; cut sites are existing children. Sites include genes the parent never built. With the base locked, the base's slots are never sites.
3. **Grow.** A new cell is added in that slot. Then each of the new cell's three slots sprouts with a set chance (dial, 1 in 3), if its spot is free in the layout, and so on outward for every new cell, until no new slot sprouts. There is no size limit.
4. **Cut.** That child and everything beyond it are removed.

New genes start with 0 strikes; surviving genes keep their counts. Each seed records what its genes roll did (no change, grew N cells at depth d, or cut N cells at depth d) for the lineage view.

## The ground map

The ground map holds one whole number per ground cell, counting the litter that has landed there. For now it only changes how the ground looks.

- **Starts at 0** everywhere.
- **Adds** 1 for each dead plant cell at its footprint (in the plant's own row), and 1 for each seed that dies where it lies.
- **Spills by slope.** Each tick, a ground cell whose value is higher than a neighbour's (of its four) by at least a set difference (dial, 2) passes one unit to its lowest such neighbour. At most one unit leaves a cell per tick. Ties between equally low neighbours are settled by abiotic dice. Left and right wrap; the front and back edges hold, so nothing spills off. Litter lands in a plant's own row as a tall pile, then spreads into the rows in front of and behind it.
- **Order-free.** Spilling must give the same result whatever order cells are processed in.
- **No effect on life yet.** Nothing reads the map: not plants, not seeds. It is not height, so piles don't shade anything. Later it may mean fertility, height, or a path for water.
- **No limit.** Values keep counting even after the colour is saturated.
- **Colour.** Ground starts pure black. Each unit adds a set opacity (dial, 1%) of the litter colour (dial, white) over the black, reaching full opacity at 100 units with the starting values. The litter colour is a setting so it can later move toward a ground colour.

## Colours and drawing

Each screen cell shows only the front-most thing there, which is also the only thing there that is lit. Plants hidden behind others are invisible.

| Element | Colour |
| --- | --- |
| Sky band | Pure blue at 20% opacity over black (dial) |
| Ground | Black, lightened by litter (see The ground map) |
| Plant cells rooted in the front row | Pure green, (0, 255, 0) |
| Plant cells rooted further back | One more unit of blue per row back, capped at 255: k rows back is (0, 255, k) |
| Flowers (tips) | A subtle pink, getting bluer by the same one unit per row back (starting colour is a dial) |
| Seeds | Amber at low opacity |

Seeds may be drawn on top of everything. Hiding seeds behind plants in front is fine only if it costs little. A plant's colour tells you which row it's rooted in, so overlapping plants from different rows stay distinguishable.

## Chance, re-rolls and histories

Every chance event rolls its own dice, so re-rolling one seed's genes or one seed's journey changes that roll and nothing else directly. Everything after it follows from the rules.

**Two kinds of chance.**

- **Re-rollable by the player:** a seed's genes roll (whether it changes, the coin, the site, every sprouting slot) and a seed's journey roll (its number of steps and every step's direction). Each can be re-rolled separately.
- **Abiotic, never re-rollable:** ties between plants reaching for the same spot, ties between seeds rooting on the same cell, spill ties, and any other incidental chance. These are still random and independent, keyed to where and when they happen.

**Independence.** Each event's dice come from the world number plus that event's own identity (whose seed, which roll, which attempt), never from a shared stream of random numbers. Outcomes never depend on the order things are processed in.

**Identity by birth.** A seed is known by its parent's identity, which flower released it, and which of that flower's seeds it was. That lets "the same seed" be recognised across histories.

**Exact replays.** The same world number, world size and set of re-rolls always produce the identical world, tick for tick.

**Rewinding.** The player can go back to any earlier tick and see that exact moment, then play forward again.

**Re-rolling.** Re-rolling a seed's genes or journey starts a new history at the moment that seed was released. The world is identical up to then; from there, that one roll is different. Re-rolling the same seed again gives its next roll. A new history keeps the re-rolls of earlier events from the history it came from and drops re-rolls of later events, since those belonged to a future that no longer happens.

**Histories.** Every history is kept. Each remembers which history it came from and what was re-rolled.

**Implementation note:** keyed hashing (world number, identity, kind of roll, attempt number) gives independent dice; periodic snapshots plus replay give fast rewinding.

## What the interface must allow

The interface stays minimal: the world fills the screen, and the few controls stay out of its way. It must let the player:

- **Watch.** Play, pause, step one tick, and change speed, from slow enough to follow a seed step by step to as fast as the device allows.
- **Move through time.** Go back to any earlier tick of the current history and play forward again.
- **Trace a lineage.** Tap a visible plant or seed (the front-most one at that spot) and see every seed it came from, back to the first. For each ancestor seed: a small picture of its body plan, its generation, what its genes roll did, where its journey went, and how it ended.
- **Re-roll.** From any seed in a lineage, re-roll its genes or its journey, or jump back to the moment it was released to watch.
- **Compare.** See what differs between the current history and the one it came from at the same tick, and briefly view that other history.
- **Catch up.** Fast-forward to a chosen tick, for example back to where the player was before a re-roll.
- **Switch histories.** See every history, which one each came from and what it re-rolled, and move between them.
- **Tune.** Change every dial, and start a new world with a chosen world number.
- **Know what's happening.** A short status line (tick, number of plants and similar counts), and a clear message if all life dies, pointing to rewinding and re-rolling.

## Dials

Every value below is a proposed starting point, untested in this design, to be tuned by watching the world. With these numbers the first plant (2 cells, both lit) should harden around tick 30 and make roughly five seeds in its life.

| Dial | What it sets | Starting value |
| --- | --- | --- |
| World number | Every roll of chance in the world | 1 |
| Cell size | Screen pixels per cell side | 4 |
| Sky (portrait) | Top square of the screen | width × width |
| Sky (square or landscape) | Share of screen height | 25% |
| Sky opacity | Pure blue over black | 20% |
| Sunlight | Energy a lit cell catches per tick | 1 |
| Cell cost | Energy to build one cell | 8 |
| Seed cost | Energy a flower spends per seed | 96 |
| Cell store | Most energy one cell can hold | 128 |
| Seedling energy | Energy a new plant starts with | 0 |
| Grace period | Ticks without growth before hardening | 16 |
| Half rule | Share of its cells a plant must have built to harden | 0.5 |
| Lifespan | Ticks a plant lives after hardening | 256 |
| Walk length | Fewest and most steps in a seed's walk | 10 to 100 |
| Sprouting check | Lit block a seed needs | 3 × 3 (toggle: single cell) |
| Base gene locked | Base always 010 | On |
| Mutation chance | Chance a seed's genes change | 1 in 4 |
| Grow-or-cut coin | Coin picks grow or cut first | On |
| Depth urn | How depth weights mutation sites | Linear |
| Multiplier N | Tickets per depth step in multiplying mode | 2 |
| New slot chance | Chance each slot of new growth sprouts | 1 in 3 |
| Strikes | Unbuilt generations in a row before a gene is dropped | 3 |
| Spill difference | Difference in litter count that makes a unit spill | 2 |
| Litter opacity | Lightening per unit of litter | 1% |
| Litter colour | Colour litter brightens toward | White |
| Flower colour | Front-row flower colour | (235, 140, 185) |
| Seed colour | Seed colour and opacity | Amber (255, 176, 64) at 40% |

## Things to watch, and ideas set aside

**Watch for these once it runs.**

- **The front row's advantage.** Nothing can ever shade the front row, while plants further back must grow taller to reach light past the ones in front. That may produce a natural gradient (short at the front, tall at the back), or the front rows may dominate.
- **Carpets of tiny plants.** Earlier versions drifted toward tiny, fast plants covering the ground. The half rule, hardening, lifespan counted from hardening, and the 3 × 3 sprouting check are meant to push against this.
- **Early die-off.** A world starts from a single seed and can die out early. Rewinding and re-rolling is the remedy, but the default world number should survive.
- **Litter saturation.** Litter only accumulates, so after long runs the ground may brighten to white. The values keep counting; what to do about it is for later.
- **Telling rows apart.** One unit of blue per row is subtle. Check that overlapping plants from neighbouring rows stay readable.
- **Speed.** Aim for thousands of ticks per second on a desktop and smooth play on a phone. Local energy movement costs more than a shared store per plant; either is allowed.

**Set aside for later, not in this build.**

- A ring-shaped world where plants root on the screen's edges or on other plants and grow toward the centre, with each layer's lifespan half its host's.
- Reading the ground map as height (piles that shade), fertility, or paths for water.
- Plants that let part of the light through instead of blocking all of it.
- Specialised leaf cells that catch more light.
- A movable camera that shows the world from other angles, with shadows visible.
