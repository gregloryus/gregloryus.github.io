# RGBcycles Detailed Design Document

## Version 0.1 - Pre-Implementation Specification

*Created: February 2026*
*Status: Awaiting approval before implementation*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Philosophical Foundation](#2-philosophical-foundation)
3. [The Three Fields](#3-the-three-fields)
4. [The Eight Cell States](#4-the-eight-cell-states)
5. [Movement Rules](#5-movement-rules)
6. [Coupling Rules](#6-coupling-rules)
7. [Decoupling Rules](#7-decoupling-rules)
8. [Transmutation Rules](#8-transmutation-rules)
9. [LIFE Mechanics (In Progress)](#9-life-mechanics-in-progress)
10. [Boundaries and Grid](#10-boundaries-and-grid)
11. [Update Order](#11-update-order)
12. [Constants and Tuning](#12-constants-and-tuning)
13. [Initial State](#13-initial-state)
14. [Expected Behavior](#14-expected-behavior)
15. [Implementation Notes](#15-implementation-notes)
16. [Open Questions](#16-open-questions)

---

## 1. Project Overview

**RGBcycles** is a field-based cellular automaton where three binary fields (R, G, B) interact through local rules to produce emergent ecological cycles.

### Core Concept

Inspired by quantum field theory: the fields themselves always exist, but the "excitations" (cells with value=1) can transfer between fields. Each field doesn't need a constant number of excitations, but **total energy across all fields is conserved**.

### Key Innovation

**Coupling vs. Transmutation**: When two fields overlap in a cell, they first form a *coupled state* (BURN, BOIL, FREEZE) with distinct movement behavior. Under certain conditions, *transmutation* occurs where excitation transfers from one field to another.

### Goals

- **Self-propagating cycle**: G → R → B → G without external forcing
- **Emergent drama**: Fire cascades, rain, regrowth
- **Conservation**: Total excitations remain constant
- **Simplicity**: Binary fields, local rules only, maximum 1 cell movement per tick

---

## 2. Philosophical Foundation

### Approach B: Total Mass Conservation with Transmutation

We chose transmutation over independent conservation because:

1. **Stakes**: Fire genuinely consumes biomass (G→R), creating real consequences
2. **Pressure**: Life must actively resist consumption, creating selection pressure
3. **Cycle**: The RPS dynamic creates self-correcting oscillation

### The RPS Triangle

- **R beats G**: Fire consumes biomass
- **G beats B**: Plants absorb water
- **B beats R**: Water quenches fire

The transformation direction follows the cycle: **G → R → B → G**

### Quantum Field Inspiration

- Fields are like quantum fields that always exist
- Excitations (value=1) are like particles - localized energy in the field
- Excitations can transfer between fields (transmutation)
- Total energy is conserved, but individual field totals can change

---

## 3. The Three Fields

Each field is a binary array (0 or 1 per cell).

| Field | Represents | When Alone | Movement |
|-------|-----------|------------|----------|
| **R** | Heat / Fire / Energy | Free heat, dissipating | Random (any cardinal direction) |
| **G** | Carbon / Biomass / Fuel | Dry fuel, dead matter | Falls if isolated, stationary if connected |
| **B** | Water / Moisture | Liquid water | Falls, spreads laterally |

### Conservation Law

```
sum(R) + sum(G) + sum(B) = CONSTANT
```

Any transmutation that decreases one field must increase another by the same amount.

---

## 4. The Eight Cell States

A cell's state is determined by which fields have excitations there:

| State | R | G | B | Name | Color (RGB) | Description |
|-------|---|---|---|------|-------------|-------------|
| 0 | 0 | 0 | 0 | Empty | (0,0,0) Black | No excitation |
| 1 | 0 | 0 | 1 | Water | (0,0,255) Blue | Liquid water, falls |
| 2 | 0 | 1 | 0 | Fuel | (0,255,0) Green | Dry biomass, can ignite |
| 3 | 0 | 1 | 1 | Freeze | (0,255,255) Cyan | Wet biomass, won't burn |
| 4 | 1 | 0 | 0 | Heat | (255,0,0) Red | Free heat, dissipates |
| 5 | 1 | 0 | 1 | Boil | (255,0,255) Magenta | Steam, rises chaotically |
| 6 | 1 | 1 | 0 | Burn | (255,255,0) Yellow | Active fire |
| 7 | 1 | 1 | 1 | Life | (255,255,255) White | Self-sustaining process |

### Color as Data

The RGB color values ARE the field values. No abstraction layer. The pixel you see is the cell's state.

---

## 5. Movement Rules

### Non-Negotiable Constraints

- **Locality**: Each cell can only see/affect cardinal neighbors (N, E, S, W)
- **Speed Limit**: Any excitation moves at most 1 cell per tick
- **Exclusivity**: An excitation can only move to a cell where that field is currently 0

### Solo Movement (Uncoupled Excitations)

**R (Heat) - Solo:**
- Moves to a random cardinal neighbor (N, E, S, W)
- Equal probability: 25% each direction
- Can only move if destination has R=0
- If blocked in chosen direction, stays put

**G (Biomass) - Solo:**
- If isolated (no G in any cardinal neighbor): tries to fall DOWN
- If connected to other G (any cardinal neighbor has G=1): stationary
- Can only move if destination has G=0

**B (Water) - Solo:**
- Priority: DOWN first
- If blocked below: spread laterally with momentum
  - Remember last lateral direction (left or right)
  - Try diagonal-down in that direction
  - If blocked, try pure lateral
  - If blocked, flip direction
- Can only move if destination has B=0

### Cardinal vs. Diagonal Movement

**Decision**: Use cardinal directions (4-connected) for most movement to keep things simple. Diagonal movement only for B's lateral spreading when falling is blocked.

**Rationale**:
- Cardinal is simpler to reason about
- Diagonal creates faster movement (√2 distance per tick), which could cause issues
- Water's diagonal-down for spreading feels natural and matches monochromagic-style physics

---

## 6. Coupling Rules

When multiple fields overlap in a cell, they form a **coupled state** and move together as a unit.

### BURN (R+G, no B)

**Movement behavior:**
- R and G move together to the same neighbor
- **Upward bias**: Higher probability of moving UP
- Suggested distribution: UP 40%, DOWN 20%, LEFT 20%, RIGHT 20%
- Still some horizontal wiggle (embers drift)

**Visual**: Yellow flames flickering upward

**Physical interpretation**: Burning ember, flame

### BOIL (R+B, no G)

**Movement behavior:**
- R and B move together
- **True Brownian**: More random/horizontal than BURN
- Suggested distribution: UP 30%, DOWN 20%, LEFT 25%, RIGHT 25%
- More horizontal spread than BURN

**Visual**: Magenta steam/vapor

**Physical interpretation**: Steam, evaporating water

### FREEZE (G+B, no R)

**Movement behavior:**
- G and B move together
- **Straight down**: Strong downward bias
- Suggested distribution: UP 5%, DOWN 70%, LEFT 12.5%, RIGHT 12.5%
- **Stickiness**: When adjacent to other G, tends to stay put (aggregation)

**Visual**: Cyan ice/wet matter

**Physical interpretation**: Wet biomass, ice, sap, mud

### LIFE (R+G+B)

**Movement behavior:**
- **Stable**: Does not move chaotically
- Resists movement (see Section 9 for full LIFE mechanics)

**Visual**: White

**Physical interpretation**: Living process, self-sustaining system

---

## 7. Decoupling Rules

Coupled states can spontaneously decouple - the excitations separate and move independently.

### BURN Decoupling

- **Probability**: `P_DECOUPLE_BURN` per tick (default: 1/8 = 12.5%)
- **What happens**:
  - R moves to a random cardinal neighbor with R=0
  - G stays in original cell (becomes Fuel)
- **Interpretation**: Fire goes out at this spot, ember flies away

### BOIL Decoupling

- **Probability**: `P_DECOUPLE_BOIL` per tick (default: 1/16 = 6.25%)
- **What happens**:
  - R moves to a random cardinal neighbor with R=0
  - B stays in original cell (becomes Water, will fall)
- **Interpretation**: Steam cools, water droplet forms

### FREEZE Decoupling

- **Probability**: `P_DECOUPLE_FREEZE` per tick (default: 1/32 = 3.125%)
- **What happens**:
  - B moves to a random cardinal neighbor with B=0
  - G stays in original cell (becomes dry Fuel)
- **Interpretation**: Water drains away, biomass dries out

### LIFE Decoupling

- **Does not spontaneously decouple**
- Can only lose components through external forces (neighbor stealing, transmutation)
- See Section 9 for details

---

## 8. Transmutation Rules

Transmutation is when excitation leaves one field and enters another. This is how the cycle flows: **G → R → B → G**

### 8.1 G → R (Burning Consumes Fuel)

**Trigger**: Cell is BURN state (R=1, G=1, B=0)

**Probability**: `P_TRANSMUTE_BURN` per tick (default: 1/100 = 1%)

**Effect**:
1. This cell: G becomes 0 (fuel consumed)
2. Target selection for new R:
   - Prefer neighbors with G=1 AND B=0 (fire spreads toward dry fuel)
   - If no such neighbor, pick any neighbor with R=0
   - **If completely surrounded by R=1**: transmutation blocked, cannot occur
3. Target cell: R becomes 1 (fire spreads)

**Conservation**: G count -1, R count +1. Net change = 0. ✓

**Interpretation**: Burning releases energy that spreads as new fire toward available fuel.

### 8.2 R → B (Condensation)

**Trigger A**: Cell has R=1 AND cell is at top row (y = 0)

**Trigger B**: Cell has R=1 AND all 4 cardinal neighbors have B=1 (completely surrounded by water)

**Trigger C**: Cell is BOIL state (R=1, B=1, G=0) - probabilistic

**Probability**:
- Trigger A: 100% (deterministic at top edge)
- Trigger B: 100% (deterministic when surrounded)
- Trigger C: `P_TRANSMUTE_BOIL` per tick (default: 1/100 = 1%)

**Effect**:
- This cell: R becomes 0, B becomes 1

**Conservation**: R count -1, B count +1. Net change = 0. ✓

**Interpretation**: Heat rises to top and condenses into rain. Heat surrounded by water is quenched. Steam occasionally condenses.

### 8.3 B → G (Absorption/Growth)

**Trigger**: Cell is FREEZE state (G=1, B=1, R=0)

**Probability**: `P_TRANSMUTE_FREEZE` per tick (default: 1/100 = 1%)

**Effect**:
- This cell: B becomes 0, G stays 1
- A neighbor that has G=0 AND B=0: G becomes 1 (growth!)
- If no valid neighbor for growth: B just disappears into existing G (absorbed, no growth)

**Conservation**: B count -1, G count +1 (if growth) or B count -1 (if just absorbed).

**Note**: If B is just absorbed without growth, we lose conservation. We should ensure growth always happens or handle this edge case. Options:
- Only allow transmutation if growth target exists
- B converts to G in same cell (but G is already 1...)
- Allow the B to just disappear (breaks conservation - not ideal)

**Preferred solution**: B→G only occurs if there's an empty neighbor to grow into. Otherwise, FREEZE stays stable.

**Interpretation**: Wet biomass absorbs water and grows outward.

### 8.4 LIFE Transmutation

**Rule**: LIFE (R=1, G=1, B=1) is **immune to transmutation**.

All three fields are present and balanced, creating stability. The presence of B prevents burning (G→R). The presence of G prevents pure condensation. The system maintains itself.

---

## 9. LIFE Mechanics (In Progress)

LIFE is the emergent "goal state" - a self-sustaining process that maintains its own existence. This section captures our thinking and deliberations.

### Current Decisions

1. **Stability**: LIFE doesn't move chaotically like other coupled states
2. **Immune to transmutation**: Won't spontaneously convert G→R or R→B
3. **Doesn't decouple randomly**: Unlike BURN/BOIL/FREEZE

### Open Design Questions

**Q: How does LIFE maintain itself?**

If LIFE is just passive, it will eventually be disrupted by neighbors. We want LIFE to actively resist entropy.

**Idea: Attraction/Stabilization**

LIFE could stabilize or attract nearby excitations:
- If LIFE has BURN (R+G) adjacent to the EAST, and single B to the WEST
- LIFE could "encourage" the B to move toward the BURN
- This would create more LIFE (BURN + B = R+G+B = LIFE)

**Implementation options:**
1. **Bias field**: LIFE creates a "pull" on R and B in adjacent cells, biasing their random movement toward LIFE
2. **Swap rule**: LIFE can swap positions with adjacent coupled states to create balance
3. **Transfer rule**: LIFE can "donate" one of its excitations to a neighbor that needs it, then pull replacement from another neighbor

**Concern**: Must keep it local. LIFE can only see/affect cardinal neighbors. No global awareness.

**Simplest approach for v1**: LIFE just stabilizes what touches it. Adjacent coupled states have reduced decoupling probability. Adjacent solo excitations have biased movement toward LIFE.

### LIFE as Emergent, Not Programmed

The goal is for LIFE to emerge from the rules, not be hardcoded as special. But some special handling may be needed to create the right conditions for emergence.

**v1 approach**: Keep LIFE simple (stable, immune to transmutation), observe what emerges, iterate.

---

## 10. Boundaries and Grid

### Grid Size

**Prototype**: 10×10 (for testing and debugging)

**Scalable**: Architecture should support any size. Eventually fill window with configurable cell size.

### Boundary Conditions

**Horizontal**: Wrapping (left edge ↔ right edge)
- Cell at x=0 has neighbor at x=cols-1
- Allows continuous horizontal flow

**Vertical**: Closed (no wrapping)
- Top row (y=0): R reaching here condenses to B
- Bottom row (y=rows-1): B/G accumulate here
- Nothing leaves through top or bottom

---

## 11. Update Order

Each tick proceeds in this order:

### Phase 1: Movement

Process all cells, apply movement rules:
1. **Solo R**: Move randomly to cardinal neighbor
2. **Solo B**: Move down, spread laterally if blocked
3. **Solo G**: Fall if isolated, stay if connected
4. **BURN**: Move together with upward bias
5. **BOIL**: Move together, Brownian
6. **FREEZE**: Move together downward, stick to G
7. **LIFE**: Stay put (stable)

**Implementation note**: To avoid order-dependent artifacts, use double-buffering (read from current state, write to next state, then swap).

### Phase 2: Decoupling

Process all coupled states, check for spontaneous decoupling:
1. BURN: `P_DECOUPLE_BURN` chance to separate R from G
2. BOIL: `P_DECOUPLE_BOIL` chance to separate R from B
3. FREEZE: `P_DECOUPLE_FREEZE` chance to separate B from G
4. LIFE: No random decoupling

### Phase 3: Transmutation

Process relevant states, check for transmutation:
1. **R at top row**: R→B (100%)
2. **R surrounded by B**: R→B (100%)
3. **BURN cells**: G→R with `P_TRANSMUTE_BURN` probability
4. **BOIL cells**: R→B with `P_TRANSMUTE_BOIL` probability
5. **FREEZE cells**: B→G with `P_TRANSMUTE_FREEZE` probability
6. **LIFE cells**: No transmutation (immune)

### Phase 4: Render

Update the display based on new field states.

---

## 12. Constants and Tuning

All probabilities should be easily adjustable constants at the top of the code.

### Movement Biases

```javascript
const MOVE = {
  // BURN movement (upward bias for flames)
  BURN_UP: 0.40,
  BURN_DOWN: 0.20,
  BURN_LEFT: 0.20,
  BURN_RIGHT: 0.20,

  // BOIL movement (more horizontal/random, like Brownian)
  BOIL_UP: 0.30,
  BOIL_DOWN: 0.20,
  BOIL_LEFT: 0.25,
  BOIL_RIGHT: 0.25,

  // FREEZE movement (strong downward)
  FREEZE_UP: 0.05,
  FREEZE_DOWN: 0.70,
  FREEZE_LEFT: 0.125,
  FREEZE_RIGHT: 0.125,
};
```

### Decoupling Probabilities

```javascript
const DECOUPLE = {
  BURN: 1/8,     // 12.5% - fire goes out relatively often
  BOIL: 1/16,   // 6.25% - steam is more stable
  FREEZE: 1/32, // 3.125% - ice/wet matter is very stable
};
```

### Transmutation Probabilities

```javascript
const TRANSMUTE = {
  BURN: 1/100,   // 1% - burning slowly consumes fuel
  BOIL: 1/100,   // 1% - steam slowly condenses
  FREEZE: 1/100, // 1% - wet biomass slowly absorbs water
};
```

### Efficiency Note

Using fractions like 1/8, 1/16, 1/32 allows for efficient bit-based random checks:
- `1/8`: `(rand() & 7) === 0`
- `1/16`: `(rand() & 15) === 0`
- `1/32`: `(rand() & 31) === 0`
- `1/256`: `(rand() & 255) === 0`

For 1/100, we need actual modulo: `rand() % 100 === 0`

Consider adjusting probabilities to powers of 2 for efficiency:
- 1/100 → 1/128 (0.78%)
- Or keep 1/100 if the behavior difference matters

---

## 13. Initial State

For 10×10 prototype:

```
Row 0: B B . . . . . . B B   (some moisture at top)
Row 1: . . . B . . B . . .
Row 2: . . . . . . . . . .
Row 3: . . . . . . . . . .
Row 4: . . . . . . . . . .
Row 5: . . . . . . . . . .
Row 6: . . . . . . . . . .
Row 7: . . . . . . . . . .
Row 8: G G G G G R G G G G   (fuel bed with spark)
Row 9: G G G G G G G G G G   (fuel bed)
```

- **G**: Bottom 2 rows filled (fuel bed)
- **R**: 1-2 cells in the fuel bed (sparks to start fire)
- **B**: Scattered in upper portion (moisture)

### Conservation Check

Count total excitations. This number must remain constant throughout the simulation.

---

## 14. Expected Behavior

### The Cycle

1. **Ignition**: R (spark) touches dry G. Forms BURN (yellow).

2. **Fire spreads**: BURN cells have G→R transmutation. New R appears in adjacent dry G cells. Chain reaction.

3. **Flames rise**: BURN cells move upward. Yellow flickers across the screen.

4. **Some flames decouple**: R separates from G. Free R continues rising. G left behind as ash/fuel.

5. **Heat condenses**: R reaching top row converts to B. Magenta briefly, then blue.

6. **Rain falls**: B moves downward, accumulating at bottom.

7. **Fuel gets wet**: B reaches G. Forms FREEZE (cyan). Wet fuel won't burn.

8. **Growth**: FREEZE cells occasionally have B→G transmutation. G spreads, fuel bed expands.

9. **Drying**: If FREEZE decouples, G becomes dry again. B continues falling or evaporating.

10. **Cycle repeats**: New sparks (from residual R) hit dry G. Fire spreads again.

### Visual Journey

- **Yellow wave** spreading across bottom (fire)
- **Red particles** rising (heat)
- **Magenta wisps** at top (steam)
- **Blue particles** appearing at top, falling (rain)
- **Cyan patches** at bottom (wet fuel)
- **Green recovering** where cyan was (regrowth)
- **Repeat**

### Emergent Properties

- Fire preferentially spreads through connected dry fuel
- Wet areas create firebreaks
- The system should oscillate without external input
- LIFE (white) may emerge where conditions are just right

---

## 15. Implementation Notes

### Architecture (from rgbfields-17)

- **Typed arrays**: `Uint8Array(N)` for each field (R, G, B)
- **Neighbor table**: Precomputed `Int32Array(N * 4)` for cardinal neighbors
- **Double buffering**: Read from current arrays, write to next arrays, swap
- **PIXI rendering**: Buffer texture, write RGBA directly

### Rendering

Color is determined directly from field values:
```javascript
rgba[i*4 + 0] = R[i] * 255;  // Red channel
rgba[i*4 + 1] = G[i] * 255;  // Green channel
rgba[i*4 + 2] = B[i] * 255;  // Blue channel
rgba[i*4 + 3] = 255;         // Alpha (always opaque)
```

### Random Number Generation

Use seeded PRNG for reproducibility:
```javascript
let rngState = SEED;
function rand() {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState;
}
```

For probability checks:
```javascript
// Efficient power-of-2 check
if ((rand() & 7) === 0) { /* 1/8 probability */ }

// General probability check
if ((rand() % 100) < 1) { /* 1% probability */ }
```

### Update Loop Structure

```javascript
function tick() {
  // Phase 1: Movement
  moveAllR();
  moveAllB();
  moveAllG();
  moveCoupledStates();

  // Phase 2: Decoupling
  checkDecoupling();

  // Phase 3: Transmutation
  checkCondensationAtTop();
  checkCondensationWhenSurrounded();
  checkBurnTransmutation();
  checkBoilTransmutation();
  checkFreezeTransmutation();

  // Phase 4: Render
  updateTexture();
}
```

---

## 16. Open Questions

### Resolved

- [x] Binary vs gradient fields → **Binary (0 or 1)**
- [x] Conservation approach → **Total mass conserved, transmutation allowed**
- [x] Cardinal vs diagonal → **Cardinal for most, diagonal only for B spreading**
- [x] Horizontal boundaries → **Wrapping**
- [x] Vertical boundaries → **Closed**
- [x] LIFE transmutation → **Immune**
- [x] Fire spread direction → **Prefer dry G neighbors**
- [x] Update order → **Movement, then decoupling, then transmutation**

### Still Considering

- [ ] LIFE active behavior: Should LIFE actively pull/stabilize neighbors?
- [ ] B→G edge case: What if no empty neighbor for growth?
- [ ] Optimal probability values (will need tuning)
- [ ] LIFE emergence: Will it emerge naturally or need help?

### Deferred to Future Versions

- [ ] G cell headings (directional bias for flow)
- [ ] Organisms as connected G structures
- [ ] Urn-based genetics
- [ ] Sound

---

## Appendix A: State Transition Diagram

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
    ┌─────────────────────────────────────┐              │
    │           HEAT (R only)              │              │
    │         Moves randomly               │              │
    └───────────────┬─────────────────────┘              │
                    │                                     │
         ┌──────────┼──────────┐                         │
         │          │          │                         │
         ▼          ▼          ▼                         │
    Hits top    Hits B     Hits G                        │
         │          │          │                         │
         │          │          │                         │
         ▼          ▼          ▼                         │
    ┌────────┐ ┌────────┐ ┌────────┐                     │
    │ R → B  │ │ BOIL   │ │ BURN   │                     │
    │Condense│ │ (R+B)  │ │ (R+G)  │                     │
    └───┬────┘ └───┬────┘ └───┬────┘                     │
        │          │          │                          │
        │     Decouple or     │                          │
        │     Transmute       │                          │
        │          │          │                          │
        ▼          ▼          ▼                          │
    ┌─────────────────────────────────────┐              │
    │           WATER (B only)             │              │
    │           Falls down                 │◄─────────────┤
    └───────────────┬─────────────────────┘              │
                    │                                     │
                Hits G                                    │
                    │                                     │
                    ▼                                     │
              ┌────────┐                                  │
              │ FREEZE │                                  │
              │ (G+B)  │                                  │
              └───┬────┘                                  │
                  │                                       │
             Transmute                                    │
             (B → G)                                      │
                  │                                       │
                  ▼                                       │
    ┌─────────────────────────────────────┐              │
    │           FUEL (G only)              │──────────────┘
    │         Stationary/Falls             │   Hits R
    └─────────────────────────────────────┘   (cycle)


    ┌─────────────────────────────────────┐
    │           LIFE (R+G+B)               │
    │         Stable, immune               │
    │      (emerges where all three        │
    │          fields overlap)             │
    └─────────────────────────────────────┘
```

---

## Appendix B: Conservation Verification

For each transmutation, verify conservation:

| Transmutation | Field Changes | R Δ | G Δ | B Δ | Total Δ |
|---------------|---------------|-----|-----|-----|---------|
| G → R (burn) | G-1, R+1 | +1 | -1 | 0 | 0 ✓ |
| R → B (condense) | R-1, B+1 | -1 | 0 | +1 | 0 ✓ |
| B → G (absorb/grow) | B-1, G+1 | 0 | +1 | -1 | 0 ✓ |

All transmutations conserve total excitation count.

---

## Appendix C: File Structure

```
rgbcycles-1.html    - Main HTML file with embedded JS
rgbcycles-1.js      - (Optional) Separate JS file if preferred
```

Dependencies:
- PIXI.js (loaded from CDN)

---

## 17. Field Bit Structure (Revision)

*Added after external review - February 2026*

The original design assumed pure binary (1 bit per field per cell). However, B and G require additional state to function correctly.

### R Field: 1 bit per cell

R remains pure binary:
- `0` = no heat excitation
- `1` = heat excitation present

R has no memory or direction. It moves randomly.

### B Field: 2 bits per cell

B needs to track momentum direction for proper water physics:

| Bit 0 | Bit 1 | Meaning |
|-------|-------|---------|
| 0 | X | No water excitation (bit 1 ignored) |
| 1 | 0 | Water present, momentum = LEFT |
| 1 | 1 | Water present, momentum = RIGHT |

**Behavior:**
- When B is blocked below, it tries to spread in its momentum direction
- If blocked in that direction, momentum flips
- Without this memory, "momentum" becomes "random lateral jitter" which changes the feel significantly

**Implementation:**
```javascript
// B field as Uint8Array, values 0-3
const B_NONE = 0;        // 00 - no water
const B_LEFT = 1;        // 01 - water, moving left  (but we only use 1 bit for existence)
const B_RIGHT = 2;       // 10 - water, moving right

// Or more simply: separate arrays
const B = new Uint8Array(N);      // 0 or 1 (existence)
const B_dir = new Uint8Array(N);  // 0=left, 1=right (momentum)
```

**Default momentum:** Even cells with B=0 have a latent direction. When B arrives, it inherits the cell's default or takes the direction it was traveling.

### G Field: 3 bits per cell

G needs to track heading for directional flow biasing:

| Bits | Meaning |
|------|---------|
| 000 | No biomass excitation |
| 1XX | Biomass present, heading encoded in XX |

Heading encoding (2 bits):
| XX | Heading |
|----|---------|
| 00 | North (up) |
| 01 | East (right) |
| 10 | South (down) |
| 11 | West (left) |

**Why G needs heading:**

From the original rgbcycles-design.md, G headings determine how R and B flow through biomass structures:

- **B flows in the direction of G's heading**: If heading=N, B tends to flow upward through the G structure (like sap rising)
- **R flows opposite to G's heading**: If heading=N, R tends to flow downward (like heat sinking to roots)

This creates emergent vascular behavior where G structures channel resources directionally.

**Implementation:**
```javascript
// G field as Uint8Array, values 0-7
const G_NONE = 0;           // 000 - no biomass
const G_NORTH = 0b100;      // 100 - biomass, heading N
const G_EAST = 0b101;       // 101 - biomass, heading E
const G_SOUTH = 0b110;      // 110 - biomass, heading S
const G_WEST = 0b111;       // 111 - biomass, heading W

// Helper functions
function hasG(cell) { return (cell & 0b100) !== 0; }
function getHeading(cell) { return cell & 0b011; }
```

**Default heading:** All G starts with heading = N (up). Heading may change based on growth direction or local conditions (future consideration).

### Revised Conservation Law

Conservation still holds, but we count excitations by checking the existence bit:

```javascript
const totalExcitations =
  countOnes(R) +           // R is pure binary
  countWhere(B, b => b > 0) +  // B exists if > 0
  countWhere(G, g => (g & 0b100) !== 0);  // G exists if bit 2 is set
```

---

## 18. Transmutation Preconditions (Critical Revision)

*Added after external review - February 2026*

**Key insight**: For any transmutation to occur, the TARGET field must have space (be 0) in the destination cell. Transmutation creates a new excitation somewhere - that somewhere must be empty in the target field.

### Revised Transmutation Rules

#### G → R (Burning)

**Preconditions:**
1. Source cell is BURN state (R=1, G≥1, B=0)
2. Must find a target cell where R=0 to place the new R excitation
3. Target preference: neighbors with G≥1 AND B=0 (fire spreads toward dry fuel)
4. Fallback: any neighbor with R=0
5. **If ALL neighbors have R=1**: Transmutation BLOCKED, cannot occur this tick

**Effect when successful:**
- Source cell: G becomes 0 (fuel consumed), R stays 1
- Target cell: R becomes 1 (fire spreads)

#### R → B (Condensation)

**Preconditions:**
1. Cell has R=1
2. Trigger condition met (at top row, OR surrounded by B, OR BOIL state + probability)
3. **The cell must have B=0** (can't condense into a cell that already has water)

**Effect when successful:**
- Same cell: R becomes 0, B becomes 1

**Edge case:** If R is at top row but B=1 already in that cell (somehow has both R and B = BOIL at top), what happens?
- Option A: R stays, can't condense (blocked)
- Option B: The existing B absorbs the R's energy, no change
- **Decision**: Option A - if B≥1, R cannot condense here. R would need to move sideways first or wait.

#### B → G (Growth)

**Preconditions:**
1. Source cell is FREEZE state (G≥1, B≥1, R=0)
2. Must find a target cell where G=0 to place the new G excitation
3. Target preference: empty neighbors adjacent to existing G (growth extends the structure)
4. **If NO neighbor has G=0**: Transmutation BLOCKED, FREEZE remains stable

**Effect when successful:**
- Source cell: B becomes 0, G remains
- Target cell: G becomes 1 (with heading, see Section 17)

**Note on heading for new G:** When B→G creates new G, what heading does it get?
- Option A: Inherit heading from the adjacent G that triggered growth
- Option B: Point toward the source cell (where the B came from)
- Option C: Default to North
- **Decision for v1**: Default to North. Heading inheritance is a future enhancement.

---

## 19. Collision Policy for Double-Buffering

*Added after external review - February 2026*

### The Problem

With double-buffering, we read from `current` state and write to `next` state. But multiple excitations might try to move into the same cell:

1. **Two R's targeting same empty cell**: Which one wins?
2. **Coupled move (BURN) needs both R and G slots free**: What if only one is free?
3. **Does "destination has R=0" mean current buffer or next buffer?**

### The Policy

#### Rule 1: First-Come-First-Served with Randomized Order

Process cells in random order each tick. When an excitation tries to move:
- Check **next buffer** for availability (not current)
- If available: write to next buffer, mark move complete
- If occupied: stay in place (write current position to next buffer)

```javascript
// Shuffle cell indices each tick
const order = shuffle([0, 1, 2, ..., N-1]);
for (const i of order) {
  processCell(i);
}
```

This prevents loop-order bias from creating systematic artifacts.

#### Rule 2: Check NEXT Buffer for Availability

"Exclusivity" (can only move where field=0) refers to the **next buffer**:

```javascript
function canMoveRTo(targetIndex) {
  return R_next[targetIndex] === 0;  // Check next buffer, not current
}
```

This means:
- Two R's from different cells CAN'T both move to the same target (first one claims it)
- An R CAN move into a cell that currently has R, if that R is moving out (will be 0 in next)

Wait, that second point is tricky. If we process in order and cell A moves its R to cell B, but cell B hasn't been processed yet, cell B's R is still in current buffer...

**Simpler approach**: Check CURRENT buffer, but mark moved excitations:

```javascript
const R_claimed = new Uint8Array(N);  // Track claimed destinations this tick

function tryMoveR(fromIndex, toIndex) {
  if (R_current[toIndex] === 1) return false;  // Occupied in current
  if (R_claimed[toIndex] === 1) return false;  // Already claimed this tick

  R_claimed[toIndex] = 1;
  R_next[toIndex] = 1;
  R_next[fromIndex] = 0;  // Will be overwritten if something else moves here
  return true;
}
```

#### Rule 3: Coupled Movement is Atomic

For BURN (R+G together), the move only succeeds if BOTH can move:

```javascript
function tryMoveBurn(fromIndex, toIndex) {
  // Both R and G must be free at target
  if (R_current[toIndex] !== 0 || R_claimed[toIndex]) return false;
  if (hasG(G_current[toIndex])) return false;
  if (G_claimed[toIndex]) return false;

  // Claim both
  R_claimed[toIndex] = 1;
  G_claimed[toIndex] = 1;

  // Move both
  R_next[toIndex] = 1;
  G_next[toIndex] = G_current[fromIndex];  // Preserve heading
  R_next[fromIndex] = 0;
  G_next[fromIndex] = 0;

  return true;
}
```

If only one slot is free, the coupled state stays put.

#### Rule 4: Failed Moves Stay In Place

If an excitation can't move (blocked), it stays:

```javascript
// After all movement attempts
for (let i = 0; i < N; i++) {
  // If R wasn't moved out and wasn't claimed by incoming, keep it
  if (R_current[i] === 1 && !R_movedOut[i]) {
    R_next[i] = 1;
  }
}
```

### Implementation Strategy

**Option A: Claim-based (described above)**
- Use "claimed" arrays to track pending moves
- Process cells in random order
- First mover wins

**Option B: Intention-gathering then resolution**
- Phase 1: Each cell declares intended destination
- Phase 2: For each destination with multiple claimants, randomly pick winner
- Phase 3: Execute winning moves, losers stay

Option B is cleaner conceptually but requires more passes. Option A is more efficient.

**Decision**: Use Option A (claim-based) with randomized processing order.

---

## 20. G Headings and Flow Biasing

*Added after external review - February 2026*

### Why Headings Matter

From original design discussions and rgbcycles-design.md, G cells with headings create emergent vascular behavior:

- **Without headings**: R and B flow through G randomly, no directionality
- **With headings**: R and B are biased to flow in specific directions through G structures, creating root-to-leaf and leaf-to-root transport

### Flow Rules Through G

When R or B is in a cell that also has G (i.e., BURN, FREEZE, or LIFE states), the G's heading influences where the R or B tries to exit:

**B (water) through G:**
- B is biased to exit in the direction of G's heading
- If G heading = N: B tends to flow UP (sap rises)
- First priority: flow to G neighbors that lack B ("demand-driven")

**R (heat) through G:**
- R is biased to exit OPPOSITE to G's heading
- If G heading = N: R tends to flow DOWN (heat sinks to roots)
- First priority: flow to G neighbors that lack R ("demand-driven")

### Implementation Sketch

```javascript
function getBiasedExitDirection(cellIndex, isR) {
  const gVal = G[cellIndex];
  if (!hasG(gVal)) return randomCardinal();  // No G, no bias

  const heading = getHeading(gVal);  // 0=N, 1=E, 2=S, 3=W

  if (isR) {
    // R flows opposite to heading
    return oppositeDirection(heading);
  } else {
    // B flows with heading
    return heading;
  }
}

function oppositeDirection(dir) {
  // N↔S, E↔W
  return (dir + 2) % 4;
}
```

### Demand-Driven Flow

Before following heading bias, check for "deprived" neighbors (G cells lacking the resource):

```javascript
function flowRThroughG(cellIndex) {
  const neighbors = getCardinalNeighbors(cellIndex);

  // Priority 1: G neighbors without R
  const deprived = neighbors.filter(n => hasG(G[n]) && R[n] === 0);
  if (deprived.length > 0) {
    return pickRandom(deprived);
  }

  // Priority 2: Follow heading bias (opposite for R)
  const biasDir = getBiasedExitDirection(cellIndex, true);
  const biasedNeighbor = getNeighborInDirection(cellIndex, biasDir);
  if (biasedNeighbor >= 0 && R[biasedNeighbor] === 0) {
    return biasedNeighbor;
  }

  // Priority 3: Any valid neighbor
  const valid = neighbors.filter(n => R[n] === 0);
  return valid.length > 0 ? pickRandom(valid) : -1;
}
```

### Heading Initialization and Propagation

**Default**: All G starts with heading = N

**Future consideration**: When G grows (B→G transmutation), the new G could inherit or derive its heading:
- Inherit from parent G (maintains consistency in structures)
- Point toward parent (creates convergent flow)
- Point away from parent (creates divergent flow)

**v1 decision**: All G heading = N. Heading propagation is a future enhancement.

### Relation to Wireflow

The wireflow project (lava-lamp-wireflow-notes.md) demonstrated emergent wire-like structures from connectivity constraints (simple-point test). If we want G to form similar connected structures:

- G might only grow into positions that maintain connectivity
- The simple-point test could prevent G from fragmenting
- Headings could be derived from the structure's topology

This is deferred to future versions but noted here for reference.

---

## 21. Deliberations Log

*Ongoing record of design discussions and considerations*

### LIFE Mechanics (Ongoing)

**Question**: Should LIFE actively influence its neighbors?

**Ideas discussed:**
1. LIFE could "pull" nearby R and B toward itself, biasing their movement
2. LIFE could stabilize adjacent coupled states (reduce their decoupling probability)
3. LIFE could facilitate "balance" - if BURN is to the East and lone B is to the West, encourage B to move toward BURN

**Concern**: Must remain local. LIFE can only see cardinal neighbors.

**Possible implementation:**
```javascript
function updateLIFEInfluence(cellIndex) {
  const neighbors = getCardinalNeighbors(cellIndex);

  for (const n of neighbors) {
    // Solo R or B adjacent to LIFE: bias movement toward LIFE
    if (R[n] === 1 && !hasG(G[n]) && B[n] === 0) {
      R_biasToward[n] = cellIndex;  // Mark bias
    }
    // BURN adjacent to LIFE: reduced decoupling
    if (isBurn(n)) {
      decouplingModifier[n] = 0.5;  // Half normal probability
    }
  }
}
```

**Status**: Not decided for v1. Starting with LIFE as simply stable + immune, observe emergence.

### B→G Edge Case

**Question**: What if FREEZE has no empty neighbor for growth?

**Options:**
1. Transmutation blocked, FREEZE remains stable
2. B is "absorbed" without creating new G (breaks conservation)
3. B converts to G in same cell (but G is already there)

**Decision**: Option 1 - transmutation only occurs if there's room to grow. This maintains conservation and creates interesting dynamics where saturated areas can't grow further.

### Probability Tuning

All probabilities are placeholders. Expect significant tuning once we see behavior:

| Parameter | Default | Notes |
|-----------|---------|-------|
| P_DECOUPLE_BURN | 1/8 | May need to be lower if fire dies too fast |
| P_DECOUPLE_BOIL | 1/16 | |
| P_DECOUPLE_FREEZE | 1/32 | |
| P_TRANSMUTE_BURN | 1/128 | Using power of 2 for efficiency |
| P_TRANSMUTE_BOIL | 1/128 | |
| P_TRANSMUTE_FREEZE | 1/128 | |

**Efficiency note**: Powers of 2 allow bitwise checks: `(rand() & 127) === 0` for 1/128.

---

## Appendix D: Revised State Encoding

With the new bit structures:

| Field | Bits | Values | Encoding |
|-------|------|--------|----------|
| R | 1 | 0-1 | 0=none, 1=heat |
| B | 2 | 0-2 | 0=none, 1=water+left, 2=water+right |
| G | 3 | 0-7 | 0=none, 4-7=biomass+heading |

**Combined cell state**: Could pack into single byte if needed:
```
Bit 7: unused
Bit 6: unused
Bit 5: G existence
Bit 4: G heading high
Bit 3: G heading low
Bit 2: B existence
Bit 1: B direction
Bit 0: R existence
```

But for clarity, keeping separate arrays is recommended for v1.

---

## Appendix E: References

- **rgbcycles-design.md**: Original design document with G heading concept
- **lava-lamp-wireflow-notes.md**: Wireflow connectivity constraints
- **absorption-18.js**: Demand-driven flow implementation reference
- **simplant.js**: G cell heading implementation reference
- **monochromagic-12.js**: Water momentum physics reference

---

## 22. Final Review: Corrections and Clarifications

*Added after final document review - February 2026*

### Correction 1: Section 3 vs Section 17 Inconsistency

Section 3 states "Each field is a binary array (0 or 1 per cell)" but Section 17 revises this to:
- R: 1 bit (truly binary)
- B: 2 bits (existence + momentum)
- G: 3 bits (existence + heading)

**Resolution**: Section 17 supersedes Section 3. The fields are NOT purely binary. However, for *conservation counting*, we only count existence bits, so conservation math still works.

### Correction 2: Wireflow Reference Clarification

Section 20 incorrectly implied wireflow was directly related to G headings.

**Clarification**: Wireflow (lava-lamp-wireflow-notes.md) demonstrates emergent wire-like/plant-like structures from connectivity constraints. This is *tangentially* relevant to rgbcycles (G could form similar stringy structures), but wireflow is NOT the source of the G heading concept.

**G heading source**: The G heading concept comes from **rgbcycles-design.md** (the original design notes), specifically lines 124-126, 245-266, and 283-300, where it's discussed extensively.

### Correction 3: Rendering Code Update

Section 15's rendering code needs to account for multi-bit fields:

```javascript
// BEFORE (incorrect for multi-bit fields):
rgba[i*4 + 0] = R[i] * 255;
rgba[i*4 + 1] = G[i] * 255;
rgba[i*4 + 2] = B[i] * 255;

// AFTER (correct):
rgba[i*4 + 0] = R[i] * 255;                    // R is still 0 or 1
rgba[i*4 + 1] = hasG(G[i]) ? 255 : 0;          // G existence check
rgba[i*4 + 2] = (B[i] > 0) ? 255 : 0;          // B existence check
rgba[i*4 + 3] = 255;
```

### Correction 4: Initial State Clarification

Section 13's initial state diagram shows:
```
Row 8: G G G G G R G G G G   (fuel bed with spark)
```

This is misleading. If R is in a cell with G, that's BURN (R+G), not solo R.

**Clarification**: The "R" in the diagram means the cell has both R=1 AND G=1 (it's a BURN state, shown yellow). This is intentional - a spark on fuel immediately creates fire.

### Clarification 5: Decoupling When Blocked

Section 7 says when BURN decouples, "R moves to a random cardinal neighbor with R=0."

**What if no neighbor has R=0?**

**Decision**: Decoupling is blocked. The coupled state stays coupled. This creates interesting dynamics where fire in a sea of fire can't decouple.

### Clarification 6: BOIL at Top Row

Section 18 establishes that R→B condensation requires B=0 in the cell. But what about BOIL (R+B) at the top row?

**Scenario**: BOIL reaches top. R wants to condense. But B=1 already.

**Resolution**: Condensation is blocked. BOIL at top stays as BOIL. It must either:
1. Move sideways (away from top row), or
2. Decouple (R moves sideways, B falls), or
3. Stay put as BOIL

This is intentional - you can't have "double B" in a cell with binary existence.

### Clarification 7: v1 Scope for G Headings

Given the complexity of G headings and flow biasing (Section 20), should this be in v1?

**Decision**: For rgbcycles-1.html (minimum viable prototype):
- G can have heading stored (3 bits)
- All G starts with heading = N
- **BUT**: Heading-based flow biasing is OPTIONAL for v1
- Without flow biasing, R and B in G cells just move normally (no directional preference)
- This simplifies v1 while keeping the data structure ready for v2

### Summary: What's In v1 vs Deferred

**In v1:**
- R: 1-bit, random movement
- B: 2-bit with momentum
- G: 3-bit with heading (stored but not used for flow biasing yet)
- All 8 cell states
- Coupling behaviors (BURN/BOIL/FREEZE/LIFE movement)
- Decoupling with probabilities
- Transmutation with preconditions
- LIFE: stable + immune (no active attraction yet)
- Conservation enforcement
- 10×10 prototype grid

**Deferred to v2+:**
- G heading-based flow biasing
- LIFE active attraction/stabilization
- Heading inheritance when G grows
- Wireflow-style connectivity constraints
- Larger grids / window-filling

---

## 23. Pre-Implementation Checklist

Before coding, verify understanding of:

- [ ] R moves randomly (25% each cardinal direction)
- [ ] B falls with momentum (remembers left/right)
- [ ] G falls if isolated, stationary if connected
- [ ] BURN moves together, upward bias (40% up)
- [ ] BOIL moves together, Brownian (30% up, more horizontal)
- [ ] FREEZE moves together, downward (70% down), sticks to G
- [ ] LIFE stays put
- [ ] Decoupling requires available neighbor slot
- [ ] Transmutation requires target field = 0
- [ ] G→R prefers dry fuel neighbors, blocked if surrounded by R
- [ ] R→B blocked if B already present
- [ ] B→G blocked if no empty G slot for growth
- [ ] Collision policy: claim-based, randomized order
- [ ] Conservation: count existence bits across all fields

---

*End of Design Document*

*Last updated: February 2026 - Final review complete*
