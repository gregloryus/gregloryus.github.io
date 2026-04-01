# RGBcycles Design Document

## Project Overview

**RGBcycles** is a field-based cellular automaton where three binary fields (R, G, B) interact through local rules to produce emergent ecological cycles. The key innovation is that **G (Green/Carbon/Biomass)** doesn't consume R and B but rather **constrains and channels their movement**, like vascular structures in plants.

**Processes are not objects** - they are dynamic couplings of fields. When R and G occupy the same cell, they become "Burning" - a coupled entity that moves together until they decouple.

The project draws from:
- `rgbfields-17.js` - Field architecture with typed arrays and buffer textures
- `absorption-18.js` - Demand-driven flow, particle binding, directional bias
- `monochromagic-12.js` - Water physics with momentum
- `simplant.js` - Triple-bit-tree gene encoding, G cell headings
- `wireflow` - Topological connectivity, simple-point test
- `colorless-green-ideas.md` - The RPS cycling philosophy

---

## Critical Philosophical Tension: Conservation vs. RPS Cycling

**This is the most important open question and must be resolved before implementation.**

### The Tension

**Conservation approach** (current assumption):
- R, G, B are each independently conserved
- No transmutation (R cannot become G, etc.)
- Elements only move, never created or destroyed

**RPS cycling approach** (from green-ideas.md / colorless-green-ideas.md):
- Fire (R) **consumes** Earth (G) → G is destroyed/converted
- Water (B) **consumes** Fire (R) → R is destroyed/converted
- Earth (G) **consumes** Water (B) → B is destroyed/converted
- This creates the prairie fire / rock-paper-scissors dynamic

### The Problem

With strict conservation, how does fire "spread"? If an ember (R+G) lands on dry G and "ignites" it, the R transfers to the new G... but that means the original ember goes out (loses its R). Fire can move but not multiply.

With RPS consumption, fire could spread by converting G to R (or to nothing), creating chain reactions. But this violates conservation.

### Possible Harmonizations

1. **Coupling, not consumption**: R+G is a coupled state. Fire "spreads" when R transfers from one G to an adjacent G. The original G becomes ash. Fire doesn't multiply - it transfers. Chain reactions happen because one R can sequentially ignite many G cells as it bounces through a dry forest.

2. **Phase-based conservation**: Total "stuff" is conserved, but elements can convert. R+G+B total is constant, but R can become G (ash falls, becomes earth), G can become R (burning releases heat), etc. This is closer to real thermodynamics.

3. **Separate conservation domains**: R is conserved within "energy domain", G+B are conserved within "matter domain". Fire converts G to R (matter→energy) and eventually R condenses back to G (energy→matter).

4. **Accept non-conservation for now**: Start with strict conservation to keep things simple, observe what dynamics emerge, then consider adding controlled transmutation later if the system feels "stuck".

**Decision needed**: Which approach? Leaning toward #1 (coupling/transfer) to preserve strict conservation while still allowing dynamic fire spread.

---

## Core Principles (Non-Negotiable)

These constraints are fixed:

### 1. Locality
- Each cell can only see and affect its immediate neighbors
- **Cosmic speed limit**: Any element moves at most 1 cell per tick
- No global state, counters, or awareness

### 2. Discreteness
- Grid-based cellular automaton
- Synchronous updates (calculate all changes, then apply)
- Integer/binary values (no floating point fields for now)

### 3. Determinism with Seeded RNG
- All randomness comes from a seeded PRNG
- Same seed = same simulation (reproducible)

### 4. Conservation (Conditional)
- **If strict conservation**: R, G, B counts each remain constant
- **If RPS consumption**: R+G+B total remains constant, but individual counts can change
- **Decision pending** (see Philosophical Tension above)

---

## Current Design Decisions (Flexible)

### Field Representation
**Current choice**: Binary (0 or 1) per channel per cell
**Flexibility**: Open to discrete gradients (0-7, 0-255) if binary proves too limiting
**Note**: May need gradients for G to track heading, or for R/B to track "intensity"

### Neighborhood
**Current choice**: Von Neumann (4-connected: N, E, S, W) for movement
**Flexibility**: Moore (8-connected) for certain operations
**Leaning**: Cardinal for simplicity, but open to either

### Grid Size
**Current choice**: 128x128 (from rgbfields-17)
**Flexibility**: Can scale up/down based on performance

### Boundary Conditions
**Current choice**: Closed edges (no wrap)
**Flexibility**: Could add horizontal wrap if needed

---

## The Three Fields

### R (Red) - Fire / Heat / Energy

**Solo behavior (R alone in cell):**
- Dissipates and spreads in all directions
- Tries to move to adjacent cell without R
- Slight upward bias (heat rises) - or true Brownian

**Visual**: Bright red

### G (Green) - Carbon / Biomass / Structure

**Solo behavior (G alone in cell):**
- Falls downward (like sand/earth/ash)
- Represents ash, dead matter, carbon, nutrients
- Inert and passive when alone

**Visual**: Green

**Critical property: Heading**
- Each G cell has a **heading** (N, E, S, or W) - a cardinal direction it "faces"
- Default heading is N (facing up)
- The heading determines how G biases R and B flow

### B (Blue) - Water / Moisture / Fluidity

**Solo behavior (B alone in cell):**
- Falls downward with gravity
- If blocked below, spreads laterally with momentum (monochromagic-style)
- Tracks a `fallingDirection` (left or right) for lateral spreading

**Visual**: Blue

---

## Process Mechanics: Coupling and Decoupling

**Key insight**: When R and G (or other combinations) occupy the same cell, they are **coupled** - they move together as a single unit until they **decouple**.

### R+G (Yellow) - Burning / Ember

**Coupling**: R and G occupy same cell, move as one unit

**Movement while coupled**:
- Chaotic, biased upward (flames/embers rise and drift)
- More vertical than horizontal movement

**Decoupling (fire goes out)**:
- Each tick, ~1/8 (12.5%) chance R decouples from G
- When R decouples, it moves to an adjacent cell without R
- Bias to decouple upward (R rises away)
- If all neighbors have R, R stays coupled (can't escape)

**Fire spreading**:
- While R+G is coupled and moving, R has **first priority** to transfer to any adjacent "dry G" (G with no R and no B)
- This IS the fire spread mechanic: R leaves its current G to ignite neighboring dry G
- The original G becomes solo (ash) and falls
- Chain reaction: R bounces through dry G cells rapidly

**Visual**: Yellow (255, 255, 0)

### R+B (Magenta) - Boiling / Steam

**Coupling**: R and B occupy same cell, move as one unit

**Movement while coupled**:
- Chaotic with more horizontal spread than Burning
- True Brownian: equal probability N, E, S, W
- Or slight downward bias (can't quite overcome gravity)

**Decoupling (cooling)**:
- Lower probability than R+G (water holds heat better)
- Maybe 1/16 or 1/32 chance per tick
- When R decouples, B becomes solo and falls normally

**Visual**: Magenta (255, 0, 255)

### G+B (Cyan) - Freezing / Ice / Sap

**Coupling**: G and B occupy same cell

**Movement while coupled**:
- Falls straight down (no lateral spreading)
- **Sticks to other G or G+B cells** - aggregates
- Can form icicles, stalagmites, stalactites
- Like diffusion-limited aggregation

**Stickiness**: When G+B is adjacent to another G (any state), it stops falling and adheres

**Visual**: Cyan (0, 255, 255)

### R+G+B (White) - Life

**Triple coupling**: R, G, and B all occupy same cell

**What it represents**: The process of living - a self-sustaining feedback loop that fights entropy

**Behavior**:
- Stable - doesn't move chaotically
- **Sticks to other G cells** - prefers adjacency (Von Neumann or Moore TBD)
- **Life is not an object** - it's a coincidence/coupling of three fields

**How Life "tries to survive"**:
- Life actively attracts/pulls R and B from adjacent cells toward itself
- Life tries to bring R and B to neighboring G cells, extending itself
- It's a self-encouraging feedback loop

**How Life "spreads"**:
- Life doesn't create new G (conservation)
- Life spreads by delivering R and B to adjacent G cells, converting them to Life
- If a G cell adjacent to Life receives both R and B, it becomes Life too

**What kills Life**:
- If R leaves (heat dissipates) → becomes G+B (Freezing)
- If B leaves (dries out) → becomes R+G (Burning)
- If both leave → becomes solo G (dead matter, falls)

**Visual**: White (255, 255, 255)

---

## G Structure: Two Approaches

### Approach A: Explicit Parent/Child (like simplant)

Each G cell tracks:
- `parent`: reference to the G cell it grew from
- `children`: references to G cells it spawned
- Forms a tree/graph structure

**Pros**:
- Clear organism boundaries
- Easy to track lineages
- Flow direction is explicit (R to parent, B to children)

**Cons**:
- More state per cell
- Less emergent
- Two "organisms" touching remain separate

### Approach B: Emergent Field-Based (preferred)

Each G cell has only:
- `heading`: which direction it faces (N, E, S, W)

**Flow is local and emergent**:
- R flows in the direction opposite to heading (if heading=N, R flows S)
- B flows in the direction of heading (if heading=N, B flows N)
- No explicit parent/child - just local vector field behavior

**Two organisms touching would merge**:
- If two separate G structures touch, their R/B would flow through the combined structure
- No concept of "separate organisms" - just connected G cells

**Pros**:
- More emergent
- Simpler state
- Merging/splitting happens naturally
- More like a true field

**Cons**:
- Harder to track "organisms" if we want to
- Flow direction depends on all G cells having consistent headings

**Current leaning**: Approach B (emergent field-based)

### Interesting implication of Approach B

If G tends to form wire-like structures (from wireflow dynamics), and R/B flow through based on heading, we'd see:
- R and B flowing through thicker G masses
- Interesting dynamics when multiple "branches" merge
- Emergent vascular-like behavior

---

## G's Heading and Flow Biasing

### The Flow Rules

**B (water) flow through G:**
- B enters G from any direction
- B is biased to exit in the direction of G's heading
- If heading is N: B tends to flow upward
- First priority: flow to "deprived" G cells (no B) before following heading

**R (heat) flow through G:**
- R enters G from any direction
- R is biased to exit in the **opposite** direction of G's heading
- If heading is N: R tends to flow downward (toward "roots")
- First priority: flow to "deprived" G cells (no R) before following heading

**Reference**: `absorption-18.js` has similar demand-driven flow logic

### Heading Initialization

**Decision**: All G starts with heading = N (up)
- Reference `absorption-18.js` and `simplant.js` for implementation patterns

---

## Movement Rules Summary

| State | Movement | Decoupling | Special Behavior |
|-------|----------|------------|------------------|
| R alone | Brownian, slight up bias | N/A | Seeks cells without R |
| G alone | Falls down | N/A | Inert ash/earth |
| B alone | Falls, spreads laterally | N/A | Momentum tracking |
| R+G (Burning) | Chaotic, up bias | ~1/8 per tick | Fire spreads to dry G |
| R+B (Boiling) | Brownian, horizontal | ~1/16 per tick | R stays longer |
| G+B (Freezing) | Falls straight | N/A | Sticks to G cells |
| R+G+B (Life) | Stable | Loses component → changes state | Pulls R/B, spreads to adjacent G |

---

## Stray Thoughts and Ideas (For Inspiration)

*Captured for later consideration - may or may not be implemented*

### On Fire Dynamics
- "R+G will fly around chaotically short-lived but if it lands on another dry G it sets off the chain reaction"
- Chain reactions could be visually dramatic - fire racing through dry brush
- Fire that can't find dry G just fizzles out (R dissipates upward)

### On Life and Entropy
- "Life 'tries' to act in such a way that perpetuates the conditions that give rise to Life"
- "A self-encouraging feedback loop against entropy"
- "Working to contain R and B on G"
- Life as a process that maintains its own existence - very philosophical

### On Merging Organisms
- "If two rows of G cells were to touch, the two formerly distinct 'organisms' would essentially become one single connected 'organism'"
- Organisms have no persistent identity - just patterns of connected G
- This is more like real ecology - mycelial networks, colonial organisms

### On Wire Structures
- "Could also be interesting to see how R and B will flow through thicker masses of G"
- "Even if G does preferentially spread out in wire structures kinda like wireflow.js"
- Tension between thick masses (more capacity) and thin wires (more surface area)

### On DLA Patterns
- G+B sticking could create diffusion-limited aggregation patterns
- Life sticking to G could create fractal branching
- Emergent tree-like structures from simple stickiness rules

### On Non-Binary Fields
- "It might be that we need to introduce divisions of RGB values rather than binary"
- "But if it's possible to figure out binary first, I think that'd be ideal"
- Start simple, add complexity only if needed

---

## Decisions Made

| Decision | Choice | Confidence |
|----------|--------|------------|
| G has heading | Yes, N/E/S/W | High |
| Default heading | N (up) | High |
| Processes are couplings | Yes, move as unit | High |
| G structure approach | Emergent field-based (Approach B) | Medium-High |
| Fire spread mechanic | R transfers to adjacent dry G | High |
| Initialization values | Experiment empirically | N/A |
| Neighborhood type | Von Neumann preferred, flexible | Medium |

---

## Decisions Pending

| Question | Options | Notes |
|----------|---------|-------|
| Conservation vs RPS | Strict conservation OR transmutation | Critical - affects everything |
| R decoupling probability | 1/8? 1/4? Tune empirically | Start with 1/8 |
| R+B decoupling probability | 1/16? 1/32? | Lower than R+G |
| G+B stickiness target | Any G? Only G+B? | Probably any G |
| Life stickiness neighborhood | Von Neumann or Moore | Open |
| Initial R/G/B amounts | % of grid each | Experiment |
| Initial distribution | Random? Zoned? | Experiment |
| Binary vs gradient fields | Binary first | Try binary, upgrade if stuck |

---

## Open Questions for Tomorrow

### Priority 1: The Big Philosophical Question
- **Conservation vs RPS consumption**: Can we harmonize strict conservation with dynamic fire spread and prairie-fire drama? Is coupling/transfer sufficient, or do we need transmutation?

### Priority 2: Life Mechanics
- How exactly does Life "pull" R and B?
- Does Life have a heading? (Probably yes, inherits from G)
- When Life spreads R/B to adjacent G, what triggers this?

### Priority 3: Flow Mechanics Details
- When R/B enters G, do they immediately try to exit? Or stay one tick?
- What happens when exit direction is blocked?
- How do we handle "deprived" cell detection efficiently?

### Priority 4: Implementation Approach
- Start with just R and B (no G) to test basic physics?
- Or start with just G (no R/B) to test heading/structure?
- Or dive into full system?

---

## Related Files for Reference

| File | Relevance |
|------|-----------|
| `rgbfields-17.js` | Field architecture, buffer textures, neighbor tables |
| `absorption-18.js` | **Critical**: demand-driven flow, directional bias, particle binding |
| `simplant.js` | Triple-bit-tree gene encoding, G cell headings |
| `monochromagic-12.js` | Water physics, momentum, falling sand style |
| `wireflow` | Topological connectivity, simple-point test |
| `colorless-green-ideas.md` | RPS cycling philosophy, phase diagram |
| `green-ideas.md` | Overarching goals, design principles |

---

## Next Session Checklist

When you return with clear eyes:

1. **Read the "Philosophical Tension" section** - make a decision on conservation vs RPS
2. **Review "Stray Thoughts"** - see if anything sparks new connections
3. **Decide on remaining pending decisions** - especially Life mechanics
4. **Finalize movement rules** - nail down exact probabilities
5. **Begin implementation** - probably start with simplest subset (R+B physics only?)

---

*Document created: February 2026*
*Version: 0.2 (Post-discussion, pre-implementation)*
*Last updated: Session 2 - late night brainstorm*
