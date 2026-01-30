# Lava Lamp Simulation Design Document

## Overview

This document memorializes a design conversation for a 2D lattice-based lava lamp simulation. The goal is to create a browser-based simulation that exhibits realistic lava lamp behavior through purely local cellular interactions, without explicit "blob" tracking or global state.

The key innovation is a **discrete unit system** where wax cells hold 0-8 units, and temperature changes the cell's *capacity* (6-8 units), naturally modeling thermal expansion on a discrete lattice.

---

## Original Brief

> **UPDATED BRIEF:**
> 
> I've been trying to make a lava lamp simulation in a 2D lattice. You can see the lava lamp MD files for details, but really I don't want to retread those mistakes. We tried LBM and it worked okay in lava-lamp-lbm-1.html, but attempts to tune or fix it didn't work, and the most egregious error was that it would cause small droplets to seemingly dissolve into smaller and smaller until they disappeared, which I believe is unavoidable with Shin-Chen or whatever method it's called. I did like how the blobs snapped off and seemed to have a very realistic recoil effect on the blob form LBM, but I'm not sure if that's enough to make it worth it.
> 
> My naive intuition would be to make the wax a single density 1.0 so it's either in a cell or not, and have it heat up and cohere together but all this should happen locally ideally as a field to keep it as performant as possible on massive scales. The part of LBM that seems most unintuitive is that the wax doesn't dissolve like that into the water; we tried recoloring and two-substance immiscibility and all types of stuff but it was too involved and never actually worked. I know in a real lava lamp, it's not the heat that directly gives the wax upwards force, but the fact that the heat makes the wax expand slightly such that its density is now lighter than the wax whereas before at room temperature it was denser than the water, and thus buoyancy provides virtually all of the lifting force. That seems hard to do in this kind of 2D lattice sim, because a single particle of wax can't expand or contract by 10%; e.g. if the water density was 1.0 maybe cold wax density is 1.1 and hot wax is 0.9, but that's hard to simulate if every particle of wax only interacts locally with immediate neighbors. So as a workaround you could just have temperature apply an upwards force, and I'd be okay with that. Or if there was a way to efficiently performantly actually effect the density within a constrained 0.9-1.1 range, that'd be great and I'd be very open to that.
> 
> Can you research this and give me your best recommendation for my desired behavior? I'm totally happy to abandon LBM and try Navier Stokes or neither or something else entirely. See below for desired behavior — that should be your North Star; feel free to abandon or totally explore the means, what matters is the end goal behavior.
> 
> **ORIGINAL BRIEF:**
> It should be as elegant and performant as possible, it should exhibit behavior like the wax warming up a bit, going from frozen to blobby still on the bottom, allowing some areas to generate enough heat/buoyancy to discretely and locally create a new rising blob that breaks off and rises to the top where it cools gradually until it reaches a cool enough temperature to start falling back down; if a rising blob hits a cool falling blob, they should bounce, but if two hot blobs collide they should possibly merge to form a bigger blob. Most important aspect here is that the wax shouldn't all be incessantly moving all the time, it should take a while to heat up, gradually change behavior and then reach tipping points that trigger new behavior.
> 
> Also let's be consistent with our language: let's call the stuff that is more solid when cold and more blobby and liquidy when hot "wax"; and we'll call the negative space / anything that's not wax is "water"; we want to be simulating (within the constraints of a 2D lattice and discrete local movements) a real lava lamp: so the wax starts colder and solid, the heat is centralized below the wax and gradually warms it up, as the wax gets warmer it softens and becomes more blobby and liquidy, eventually a section gets hot enough that it can break off and be small enough to rise up to the top of the canvas, where it'll gradually solidify and cool and eventually fall back down; as it heats back up, it won't immediately merge into any existing wax blob on the bottom that's much warmer, but as the fallen piece warms up eventually it softens and eventually merges with the main piece on bottom. After the heat has been on a while, there's a solid blobby mass on bottom that frequently had a range of different sized blobs rising breaking off solidifying colliding and interacting with other blobs etc.

---

## Technical Constraints (User-Specified)

1. **Browser-based**, ideally with WebGL for best performance. WebAssembly would be great, as long as it could be uploaded to github.io and run on mobile Safari.
2. **Target resolution**: Flexible to browser window size, but ideally up to 10k×10k as an extremely aggressive goal. Realistically at least 1k×1k at decent performance.
3. **Interactivity**: Secondary feature. Precomputed and rendered passively would be fine for first draft. Nice-to-have: toggle heat source on/off.
4. **Priority**: Immersion and matching mental model over strict physical accuracy. The LBM dissolution problem was "totally unintuitive and doesn't match the mental model of the real lava lamp at all, it totally breaks immersion."

---

## The Core Innovation: Discrete Unit System with Variable Capacity

### User's Original Insight

> I think binary wax presence is preferred but also open to discrete rather than continuous sub-densities eg a cell can hold up to 8 units of wax. Maybe that could even be a way to achieve more accurate density! A cell of cold wax can hold 8 units of wax, a cell of medium temp wax can hold 7 units of wax, and a cell of hot wax can only hold 6 units of wax; when a cell has 8 units it sinks, when it has 7 units it's neutral, and when it has 6 units it's buoyant.

### Claude's Reflection

This is a genuinely elegant solution to the thermal expansion problem on a discrete lattice. The capacity change *is* the expansion: when a cell heats up and its capacity drops from 8→6, that "excess" wax has to go somewhere, which naturally creates the pressure/displacement that drives real convection.

**The expansion mechanics:**
- Cold cell: capacity 8, if full → density ~1.1 → sinks
- Warm cell: capacity 7, if full → density ~1.0 → neutral  
- Hot cell: capacity 6, if full → density ~0.9 → rises

When a cell with 8 units heats up to capacity 6, it now has 2 "excess" units that must redistribute. This creates outward pressure — the wax physically expands into neighboring cells.

---

## The Three Fundamental Forces

### 1. Concentration / Cohesion / Vacuum-Filling

**User's Description:**

> I think a third equally important force is the concentration / cohesion / vacuum-filling force, in that wax should always want to accumulate as much as it can within a given space, so any cell of wax should be aching to get to capacity individually. I almost think of it like each space has a hole of a certain depth (6-8 units) and once wax falls into it, it can't as easily escape it. So, for example, if there was a blob of 5-unit cells at all a 7-capacity temperature (or at 6-capacity temp or 8-capacity temp!), the wax would emergently concentrate into full capacity cells, and if that means it can reduce the total number of cells with any wax, that's great! That's a lower energy state so it wants to be there. So a big blob of 5-unit cells would collapse or visually "shrink" in area because they would concentrate so most of the cells were at capacity and just the edges would be partial cells. So it readily moves into a situation where a 16 cells each with 5 units of wax become (in 8-capacity temp) 10 cells each with 8 units of wax. And it resists and only under pressure moves into a situation where it has to increase the total number of cells that have any wax, because once you create that new cell with a little wax, all its neighbors will also have forces to equalize and fill those empty spaces. This might result with jiggling around the edges or recoil waves, and that's totally fine and maybe even desirable.

**Claude's Synthesis:**

- Wax wants to fill each cell to capacity (minimize energy)
- Creating new wax cells is energetically costly — resisted
- A blob of partial cells will "shrink" into fewer full cells
- Edge jiggling/recoil waves are acceptable side effects

### 2. Equalization

**User's Description:**

> Yes I think cells can have fewer than capacity, but wax should be attracted to itself so it always tries to occupy to capacity. But yes probably on the edges as a blob moves it'll have partial cells, but they're inherently imbalanced and dynamic.

**Claude's Clarification (confirmed by user):**

Within connected wax cells, units flow from higher-density to lower-density cells, trending toward uniform fill ratio. This happens on a per-cell level — there's no blob object or tracking in the code. For a wax cell with any adjacent wax cells, units flow from higher-density to lower-density.

This force interacts with and is balanced by the concentration force.

### 3. Buoyancy

**User's Critical Correction:**

> I don't like the "buoyancy doesn't move cells, it biases which direction pressure/equalization flows" idea that you introduced, and I don't agree with it. I think this is the idea that's obscuring the real vision. There pressure shouldn't redistribute preferentially upwards (that may/should happen emergently on the surface anyways since that's the only place it can expand). Buoyancy should provide a very real force in its own right! An upwards force that applies on each given cell of wax but the cell distributes that force to neighbors too because they want to stick together. But yes, buoyancy should be a real explicit force not just a bias.
> 
> So let's say we have 8 units of wax in one cell, and somehow this cell of wax has no neighbors (this should virtually NEVER happen in a real simulation setup, I'm just explaining the theory); so as it has 8 units of wax, it should be subject to gravity and try to move into an empty space directly downwards if possible, if not then check down-left and down-right and move into that empty space. As long as it has 8 units, it should have a mild gravity force applying on it.
> 
> Then let's say it heats up and can only hold 7 units; now it sheds one particle which sticks on the edge, so one cell of 7/7 and one adjacent cell of 1/7; and maybe that blob of two cells oscillates from 1/7-and-7/7, to 2/7-and-6/7, to 3/7-and-5/7, to 4/7-and-4/7, but I think ultimately the concentrating force should win out such that it's basically a 7/7-and-1/7 with the 1/7 existing as a perturbation on the edge that zips around the edge like an extra electron looking for an empty slot to fit into.
> 
> Now, that 7/7 should no longer be subject to any gravitational forces, and that 1/7 should have a very mild upwards lift because it's less dense, but it's being stuck attracted to the 7/7 cell. Now let's say -- this is the crucial part! -- that it further heats up to 6-capacity. It sheds one more so now there's effectively a 6/6-and-2/6 -- that 6/6 by itself should be applying an upwards lift now, even before you consider the 2/6 particle's uplift. The 6/6 particle should be generating the most uplift, and this is how things will move in the simulation for the most part! A 6/6 particle is more buoyant than any empty space (water) around it, so it should apply a very strong force up; of course, it'll still equalize that upwards force / share it with its adjacent cells, so it won't immediately detach itself -- the cohesion / concentration force is still stronger.

**User's Clarification on Force Magnitude:**

> Re: Buoyancy, yes a 4/6 cell has even MORE lift than 6/6 in one sense because it's less dense... but I also think it should apply somewhat less force because its only 4 units of mass/wax, so that should also dampen its force. Similarly / all the more with a 1/6 or 1/8 particle: yes it has a strong upwards force, but only multiplied by 1 unit; with a 6/6 unit, all 6 are giving a strong UP signal, so it should be even stronger, if that makes sense...? Now if you think I'm overcomplicating things or that's not needed, we can simplify.

**Claude's Formalization (confirmed by user):**

```
force_per_unit = (7 - capacity)  // negative for cold (down), positive for hot (up)
total_buoyancy = units * force_per_unit
```

Examples:
- 8/8 cold cell: `8 * (7-8) = -8` (strong down)
- 6/6 hot cell: `6 * (7-6) = +6` (strong up)  
- 4/6 hot cell: `4 * (7-6) = +4` (medium up)
- 7/7 neutral: `7 * (7-7) = 0` (neutral)

---

## Force Propagation and Movement

### User's Description:

> I would think in a theoretical vacuum, if there's just a 6/6 cell of wax surrounded by water, there should be a 100% chance it moves up, just like a 8/8 cell in a vacuum would 100% move down from gravity. But it won't just be a single cell of wax, it'll be lots of cells adjacent to each other, and I think they should be equalizing / propagating forces amongst each other since they want to stay together and cohere and concentrate, but buoyancy should give a 6/6 cell enough force to fully move that 6/6 up 1 into empty space in 1 tick, but maybe the force required to do that gets diminished or dampened by the force keeping it stuck to its neighbors, maybe they're 7/7 neighbors (so dead weight but still take a little push to get moving, dampens its acceleration which is expressed tick by tick as velocity which translates into discrete decision to move or not?) and maybe those 7/7 neighbors are stuck to cells that are still 8/8 and have the force of gravity, yknow, and those forces propagate and equalize across adjacent cells? So it's almost like the A, B, and C you described. But please challenge me if I'm describing contradictions! I think I was imagining forces behavior more (i) Literally; a blob of dozens of 6/6's should be able to carry and lift up a few 8/8 hangers-on.

### User's Confirmation of Force-Sharing Model:

Force sharing is **literal**: a 6/6 cell's upward force is shared/averaged with its neighbors, so a single hot cell surrounded by cold cells barely moves, but a blob of hot cells all contribute their forces and move together. A blob of dozens of 6/6's should be able to carry and lift up a few 8/8 hangers-on.

### Claude's Proposed Implementation:

Each wax cell carries a `velocity_y` value (and potentially `velocity_x` for horizontal movement) that:
1. Gets its local buoyancy added each tick
2. Averages with adjacent wax cells' velocities (this is the cohesion/sharing)
3. When a surface cell's velocity exceeds a threshold, it attempts to swap with adjacent empty space in that direction
4. Velocity is dampened somewhat each tick (viscosity/friction)

This way, a single 6/6 cell surrounded by 8/8 cells would have its upward velocity dampened by averaging with their downward velocities — it can't escape alone. But a blob of mostly 6/6 with a few 8/8 hangers-on would have net positive velocity and rise together.

### Movement Mechanics:

**User's Description:**

> Movement on the edge where an at-capacity cell moves upwards and swaps with an empty cell, but then that empty cell should be surrounded by wax and in that situation (fully surrounded) it should quickly absorb from adjacent wax as it equalized... so it's not exactly treated like a normal edge where wax resists spreading to it via equalization, the vacuum that's swapped in is quickly filled, creating a domino effect where units are ultimately pulled up from the bottom, but still filling in to capacity wherever possible.

**Claude's Synthesis:**

When a hot surface cell (say 6/6) is buoyant enough, it swaps with the empty cell above it. Now there's a void where it was — but that void is surrounded by wax, so it's immediately under pressure from equalization. Units flow into it from neighbors, who then pull from *their* neighbors, creating a chain reaction that propagates downward through the blob. The net effect: the blob's top surface advances upward, its bottom surface retreats upward, and the blob has risen — all through local operations.

The snap-off happens naturally: if a neck thins to where connecting cells are very partial (1-2 units), the concentration force wants to absorb them into one side or the other. Whichever blob is "hungrier" (has more capacity deficit nearby) wins, and the connection breaks.

---

## Pressure Relief / Overflow Mechanics

### User's Full Description:

> When a cell's capacity shrinks below its current unit, the excess units should preferentially push to the adjacent wax neighbor with the lowest density; if all are at capacity, it should keep trying to shed to any available neighbor (and if multiple neighbors always the lowest density one) every tick or every other tick. So it could be theoretically heated to capacity 6 yet still have 8 if it is surrounded by cells similarly at or over capacity. But for, say, particles on the surface, if they're surrounded by at-/over-capacity cells except for directly north where there's 0 wax (or generally an opening in any adjacent cell), it will put the excess wax in that empty cell. This should be one of the rare scenarios where wax forcibly pops into an otherwise empty cell just from density pressure; otherwise I think there should generally be a cohesion force that means wax wants to concentrate to capacity and sticks together, is attracted to immediate neighbors etc so they act as blobs and have surface tension. Once that new wax cell has been added though, say, before it had 0 wax cells next to occupied wax cells (it was an edge) and now it has 1 or 2 excess wax cells, it should pretty rapidly equalize with all of its adjacent cells, so now that there's a wax cell with a deficit, not only would any overloaded adjacent cells would immediately give some units of wax, even a cell with 5 units would give units to a neighbor with 1 or 2 units. Does that make sense?

### Claude's Synthesis:

Two distinct behaviors:

1. **Pressure relief**: Overloaded cells (units > capacity) *must* shed, preferentially to lowest-density wax neighbor, or failing that, spawn into an adjacent empty cell. This is one of the rare scenarios where wax forcibly expands into empty space.

2. **Equalization**: Even non-overloaded cells want to balance — a cell with 5 units will give to a neighbor with 2 units, trending toward uniform density within a connected blob. The interior stays equalized while surfaces are where the action happens.

---

## Water Representation

### User's Decision:

> Water cells I would guess it might be most performant to just treat water cells as 0 wax, right? But if it could be worth it, I'd be willing to try simulating it as 7 units of water in each space, and assuming 1 unit of water and 1 unit of wax is the same density, and water is just always 7. But for performance and simplicity, my intuition says just treat it as 0 for now.

### Claude's Agreement:

Start with water as just "not wax" (0 units). The key interactions are wax↔wax (equalization, cohesion) and wax↔empty (surface dynamics, overflow). Explicit water units can be added later if needed.

---

## Movement Determinism

### User's Specification:

> Movement, I think it would be both probabilistic / deterministic each tick like falling sand and also be pressure driven. so it should be deterministic first but when there are two equally desired options it randomly picks one.

### Claude's Interpretation:

Deterministic-first with random tiebreaking. This gives predictable behavior but avoids bias artifacts.

---

## Temperature / Heat System

### User's Specifications:

> I think the one thing I haven't fully articulated is how heat propagates. I do think the heat should stay with the wax, like if a 6/6 wax cell moves up, it should still be a 6/6 particle, it shouldn't suddenly become a 6/7 or 6/8 because the ambient temp in that cell was hotter. So heat is carried by and also equalizing among wax cells. Heat should also have a higher chance of shedding above the 50% canvas midpoint... or maybe heat is only lost via touching the very top of the canvas, that would encourage hot particles to rise all the way.... What do you think?

### User's Agreements on Claude's Proposals:

- **Heat source**: Only at the very bottom (and perhaps only the center of the very bottom)
- **Heat sink**: Only at the very top of the canvas
- **Heat equalization speed**: Medium — fast enough to form mostly uniform blobs, slow enough that a localized section can get hot and escape before the entire blob shares temperature

### Cooling Creates Capacity (Not Immediate Fill):

**User's Confirmation:**

> Re: cooling wax, I agree B, it should create more "room" (capacity) ie the hole is a little deeper, but the force to fill that room should be very strong, so it should almost immediately gain units from neighbors in effect, even if the neighbors aren't overloaded.

When wax cools from capacity-6 → capacity-7 → capacity-8, it gains more capacity but doesn't immediately gain units. However, the concentration force then kicks in strongly, so units flow in from neighbors to fill the new capacity almost immediately.

---

## Horizontal Forces

### User's Confirmation:

All three of these are potential causes of horizontal forces/velocities/accelerations:

1. **Collision/displacement**: If a rising blob encounters a falling blob, they need to push each other sideways to pass
2. **Pressure from expansion**: If wax in the center of a blob heats up and expands, that pressure pushes outward in all directions including horizontally
3. **Equalization imbalance**: In a network of connected cells, if one area has denser neighbors than another area, density equalizes horizontally

### User's Clarification:

> For 3. Equalization imbalance, you said "if one side of a cell" but I assume you meant "one side of a blob/collection-of-cells" because a cell itself doesn't have individuated sides like that. But yes, in a network of connected cells, if one left area of the network has denser neighbors than an area on the right, I would expect that density to equalize horizontally.

---

## Blob Collision Behavior

### User's Decision:

> Re: hot rising + cold falling, let's just let it happen organically for now; so assume they'll merge and equalize temp/densities, but we'll fine-tune it such that if they're big enough some portions might still keep traveling up/down... maybe later we can add mild repulsive forces among wax cells of very diff temps (or just between 6-capacity and 8-capacity)... but let's not worry about the repulsion now. That's a secondary goal, we don't need cold blobs to bounce of hot blobs right away, and I think it might happen emergently anyways.

---

## Important Design Principles

### No Explicit Surface Cell Designation:

> In the spirit of local interactions, the code shouldn't specifically designate surface cells that have diff behavior, wax cells should just exhibit diff behavior when they're in the environment of the surface vs. interior, if that makes sense.

### No Blob Objects or Tracking:

> When you were describing the 3 fundamental forces, for Equalization you said "Within a connected blob, units flow..." which is true but I wanted to emphasize that this happens on a per-cell level, there's no blob object or tracking in the code; so for a wax cell with any adjacent wax cells, units flow from higher-density to lower-density.

### Everything Local:

> Still, everything is local and there is no explicit "this blob should rise" logic or indeed no explicit abstraction of blobs as such in the code itself.

---

## Summary: Cell State and Per-Tick Operations

### Cell State:
- `units`: 0-8 integer (0 = water/empty)
- `capacity`: 6, 7, or 8 (derived from temperature)
- `temperature`: continuous value determining capacity
- `velocity_y`: accumulated vertical force/velocity
- `velocity_x`: accumulated horizontal force/velocity (if implementing full 2D forces)

### Per-Tick Operations (Proposed Order):

1. **Temperature update**:
   - Heat added at bottom
   - Heat lost at top
   - Heat equalizes among adjacent wax cells
   - Capacity recalculated from temperature

2. **Pressure relief**:
   - Cells with units > capacity shed excess to lowest-density wax neighbor
   - If no wax neighbor has room, spawn into adjacent empty cell

3. **Equalization**:
   - Units flow from higher-fill-ratio cells to lower-fill-ratio adjacent wax cells
   - Concentration force: partial cells also pull from neighbors toward capacity

4. **Buoyancy calculation**:
   - Each wax cell calculates `local_buoyancy = units * (7 - capacity)`
   - Velocity updated: `velocity_y += local_buoyancy`
   - Velocity averaged with adjacent wax cells' velocities (cohesion)
   - Velocity dampened (viscosity)

5. **Movement**:
   - Surface cells with sufficient velocity attempt to swap with adjacent empty space
   - Deterministic with random tiebreaking
   - Swapped-in voids rapidly fill via equalization (domino effect)

---

## Open Questions / Parameters to Tune

1. **Heat equalization rate**: How fast does temperature spread through connected wax?
2. **Unit equalization rate**: How fast do units redistribute among cells?
3. **Velocity damping**: How much friction/viscosity?
4. **Velocity threshold for movement**: How much accumulated force needed to trigger a swap?
5. **Concentration force strength**: How strongly do partial cells pull from neighbors?
6. **Neighbor stencil**: 4-neighbors (von Neumann) or 8-neighbors (Moore)?

---

## Previous Attempt: LBM Shan-Chen

The existing `lava-lamp-lbm-1.html` used D2Q9 Lattice Boltzmann Method with Shan-Chen pseudopotential. 

**What worked:**
- Blobs snapped off with realistic recoil effect

**What failed:**
- Small droplets would dissolve into smaller and smaller until they disappeared
- This is a structural limitation of Shan-Chen, not a bug — cells below numerical threshold effectively vanish
- Attempts at recoloring and two-substance immiscibility were "too involved and never actually worked"

The new discrete-unit approach solves this by construction: wax cells can move but cannot partially dissolve because units are explicitly tracked integers.
