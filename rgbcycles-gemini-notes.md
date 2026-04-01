# RGBcycles Vascular Architecture: Decisions & Insights

_Drafted: February 2026_

## 1. The Core Philosophy: Dual-Layer Mechanics

The simulation operates on a fundamental distinction between **Raw Physics** and **Biological Transport**. The transition between these two states is mediated entirely by local CA rules, without requiring global graph searches or object-oriented structures.

- **Raw Physics (The "Outside"):** When fields overlap outside of a living system, their behaviors are combined via strict vector summation of their first-order primitives. There are no explicit, hardcoded coupling rules (like a forced `moveBurn` or `moveFreeze` function). For example, if R (Brownian) overlaps raw G (Gravity/Down), the resulting behavior is simply Brownian with a downward bias. Processes are the literal sum of their components.
- **Biological Transport (The "Inside"):** When R or B enters a "Protected G" cell, they are confined to the vascular system. They cease their raw physics movement and instead flow preferentially according to the G cell's established heading.

## 2. The Vascular Pulse (LIFE and TTL)

To allow a connected structure of G cells to act as a unified living organism without global awareness, the system utilizes a **Pulse and TTL (Time-To-Live)** mechanic.

- **The Pacemaker:** A `LIFE` cell (the coincidence of R+G+B) acts as a pacemaker. Every _f_ ticks, it emits a "Protected" tag/pulse to cardinally adjacent G cells.
- **Propagation & Heading:** When a raw G cell receives this pulse, it becomes "Protected." If it doesn't already have a heading, it sets its heading to point _away_ from the pulse source. It then forwards the pulse to its own adjacent G cells (excluding the sender).
- **Graceful Decay:** Protected G cells have a TTL counter that decrements by 1 each tick. The TTL is reset to max whenever a new pulse washes over the cell.
- **Emergent Death:** If the core `LIFE` cell dies (or a branch is severed), the pulses stop. The TTLs of the disconnected branches will count down to zero, causing the tissue to revert to dead, raw G at a creeping rate of one cell per tick. This creates a highly dramatic, localized necrosis effect.

## 3. The Absorption Model: Fixed vs. Excess Slots

Inside the protected vascular network, cells must manage resource flow without overwriting each other or violating the 1-cell-per-tick speed limit. Borrowing from earlier absorption models, living G cells utilize capacity slots:

- **Fixed Slots:** A living G cell can hold "Fixed" R and B. These represent the resources currently being used to keep that specific cell alive and functioning.
- **Excess Slots:** A living G cell can also hold "Excess" R and B. These are the payloads actively being transported through the vascular network, passed from cell to cell following the G heading.
- **Protection limits:** This prevents resource pile-ups and allows "pass-through" behavior while maintaining the underlying structure.

## 4. Memory and Rendering Architecture

To accommodate the hidden states required for the vascular system (Headings, Protected flags, TTL counters, and Fixed/Excess slots) while maintaining high performance, the architecture separates logic from the visual buffer.

- **Data Arrays:** The system uses distinct `Uint8Array` buffers for R, G, and B logic.
- **Rendering:** The simulation reads these logic arrays once per tick to paint the PIXI `rgba` texture buffer. This ensures that hidden data (like a TTL ticking down) does not cause the visual pixels to strobe or fade, decoupling the rich internal state from the clean RGB output.

---

## 5. Bitwise Data Structure (`Uint8Array` Mapping)

By utilizing 1D `Uint8Array` buffers, we can store all logical states and hidden variables efficiently. Here is the exact bit allocation for each array.

### R Array (Requires 2 bits)

Since R only needs to represent 3 states, we use the first 2 bits (values 0-3).

- `00` (0): **Empty** \* `01` (1): **Fixed Heat** (Bound to G for life warmth)
- `10` (2): **Excess/Free Heat** (Flowing payload OR raw fire)

### B Array (Requires 2 bits)

B needs 4 states to store momentum for its raw physics falling behavior alongside vascular transport.

- `00` (0): **Empty**
- `01` (1): **Fixed Water** (Bound to G for cellular fluid)
- `10` (2): **Excess/Free Water (Left Momentum)** \* `11` (3): **Excess/Free Water (Right Momentum)**

### G Array (Requires up to 8 bits)

G acts as the structural foundation and carries the most complex hidden data. We can pack all of this into a single 8-bit integer per cell.

- **Bit 0 (1 bit): Existence**
  - `0`: Empty
  - `1`: G is present
- **Bit 1 (1 bit): Vascular/Protected Flag**
  - `0`: Raw, unprotected dead wood/fuel (subject to raw physics)
  - `1`: Living, protected vascular tissue
- **Bits 2-3 (2 bits): Heading**
  - Determines the flow direction for Excess R and Excess B.
  - `00` (0): North
  - `01` (1): East
  - `10` (2): South
  - `11` (3): West
- **Bits 4-7 (4 bits): TTL Counter**
  - A 4-bit integer allows values from 0 to 15.
  - Decrements by 1 each tick. When a pulse arrives, it resets to max (e.g., 10 or 15).
  - If it hits 0, Bit 1 (Protected Flag) is flipped back to `0`.
