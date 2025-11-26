Simplant brief

I’d like your help building this simple plant simulation, likely by borrowing the foundations of previous projects, which I’ll attach. Please identify what, if anything, to borrow from each file to achieve the goals of the brief below. Some existing projects may already implement some if not all of the features requested. Ultimately, my request to you is to review all the notes and materials and then propose a detailed coding plan for how to build this.

SIMPLANT BRIEF

- 2D grid, CA-style simulation
- Universal tick, can advance by a single tick at a time or let it go continuously
- In this 2D world, we start with a number of seeds placed randomly on a canvas, either pre-defined (e.g. 64x64, 1000x1000) or scaled to the current window based on the scaleSize / pixel size of a single cell.
- Plants grow from their seeds at a max speed of one cell per tick, and only move in cardinal direction / Van Neumann neighborhood
- Plant genetics will be encoded via the triple-bit system, explained in the MD file attached.
- Half of the seeds should start with the default primitive genome: 010, 010, 010, 000; half of them should start with that same genome, but before the first tick, have a chance to mutate by flipping one random bit; if it turned a 1 into a 0, it also destroys any child-cells the cell indicated by the 1 has.; if it turned a 0 into a 1, it must also roll a random new triple-bit gene (000 to 111, all 8 options) to assign to the new child now initialized by the 1.
- If a plant cell has 3 open cardinal directions (checks global occupancy grid), it has a given chance per tick to absorb a sunlight (make this a variable that’s easy to tweak in the code); this creates a new 50% transparent yellow particle superimposed on the cell that absorbs it. The next tick, the plant cell that is sharing a space with the light passes it to its parent-cell, and the next tick the parent does the same until the light makes it back to the seed. The seed absorbs the light particle (it disappears visually) and tracks its total energy absorbed. Keep in mind there will be several plants on screen at once.
- After a 3-opening plant end absorbs a light, it should count down a 10 tick cooldown period before it can absorb again. Have this be an easy to tweak variable.
- Once the seed has absorbed at least 1 unit of energy for each of its genes in its total genome / in the genome of its intended child (e.g., a default starter plant with a genome of 010, 010, 010, 000 would have absorb 4 or more units of energy) then it starts producing a new seed. Once it accumulates 2x as much energy as its genome (e.g., 8 units for the starter plants), then it creates a new seed and subtracts one unit of energy for each gene in the child’s genome (so -4 for an identical clone of a starter plant) … so actually, a plant preparing to grow a need seed (i.e., once it reaches the number of energy as the length of its own genome), then it should have the chance to roll the genome of its child seed which will have a 50% chance of mutating, so it’ll know how many energy units it needs to produce it (might be more or fewer if a mutation occurred)
- Once the seed creates a new seed, it passes it to its child-cell which continues (randomly if multiple children available at a given stage) until there’s no child to give it to, at which point it detatches and takes a random walk of say 40 steps (make this an easy to tweak variable) before “landing” in whatever cell it is in at that point. If it surrounded by empty cells (8 empty Moore neighbors) it germinates and starts to grow.
- Seeds will grow their first sprout (010) upon germination, but then it needs to absorb one unit of energy for every new cell it grows.
- Plant cells can communicate non-locally with seeds if that makes things more efficient; I like the idea of it all being local, but don’t want that to be a barrier to getting something efficient and effective first.

I think absorption.js, maybe cellspring, might have very similar mechanics to what the brief requests, and rgbfields might have the most efficient visual rendering system. But don’t take my word for it, verify yourself and form your own opinion.

Also let me know if you have any questions at all or if anything is unclear, and call out any decisions that need to be made if you’re at an impasse.

OVERARCHING GOALS (these are general goals across all my recent coding projects, this particular project does NOT need to achieve all of them; it’s just an FYI)

- Discrete and legible: you can follow every step
- Emergent: produces unexpected complexity
- Dramatic: emotionally resonant rises and falls
- Ambient: no choice required, relaxing, unending
- Evolves: natural selection via fitness
- Biophilic: resembling or reminiscent of plants
- Dynamic balance: searches for homeostasis
- Probabilistic and deterministic (pseudo-RNG + seed)
- Resembles a tapestry/tableau (like the crowded but non-overlapping plants in the unicorn tapestry)
- Shapes the environment: the environment encodes the history of what happened (e.g., a plant dies and its cells become a dirt mound)
- Diverse: different adaptations for a given environment
- Local: particles interact locally only
- Closed conserved dynamic system, like global weather (water/heat overall conserved but shapes dynamic interactive interdependent forces)
- Self-propagating, cyclical
