
# 🌈 RGB Field Cellular Automaton (CA) — Full Design Summary

## 🌐 Overall Concept
- Each pixel/cell holds three **fields** using RGB values:
  - **Red (R)**: Represents **energy** (diffusive gas-like field).
  - **Green (G)**: Represents **plant matter** (structured life field).
  - **Blue (B)**: Represents **water** (fluid field with flow and pooling behavior).
- Fields **interact locally only** (no global counters, timers, or awareness).
- All updates happen **in discrete ticks** with **synchronous state application** (calculate, then apply).

## 🔴 Red Field (Energy)
- **Behavior**:
  - Passively seeks equilibrium: spreads outward from high to low concentration.
  - Red cells **transfer 1 unit** per tick to any neighboring cell with less red.
- **Interaction with Other Fields**:
  - Blue field (water) can **absorb red energy**, acting as a transport medium.
  - Green field (plant) consumes red to grow, and may release it back when decaying.
- **Design Notes**:
  - Treated like heat or radiation: gas-like diffusion.
  - No active intent or influence—just passive equalization.
  - Optionally: red diffuses faster than blue or green for elegant flow.

## 🔵 Blue Field (Water)
- **Behavior**:
  - **Gravity-like rule**: flows down if possible.
  - If blocked below, spreads sideways.
  - Pools when surrounded; doesn't pile up.
- **Interaction with Other Fields**:
  - Carries some red energy when moving (e.g., absorbs some R, transfers it to neighbor).
  - Plants (green) can only grow when enough water is nearby.
- **Additional Option**:
  - Blue decays slowly via evaporation if isolated and surrounded by dry space.

## 🟢 Green Field (Plant)
- **Binary state**: 1 = plant present, 0 = no plant.
- **Growth Rule**:
  - A green pixel may appear if:
    - At least N units of **blue (water)** and M units of **red (energy)** are adjacent.
    - It’s adjacent to an existing green cell (or a defined "seed" cell).
- **Decay Rule**:
  - If red or blue falls below threshold, the plant:
    - Dies, and is replaced by:
      - Red and Blue returned to the grid (same amounts it cost to grow).
      - Optionally: leaves behind a “soil” state that stabilizes future growth.
- **Geometric Growth**:
  - Grows in predictable symmetric patterns (e.g., cross-shaped from node).
  - Grows in cardinal directions only (no diagonals unless specified).

## ♻️ Conservation Logic
- **Resource Recycling**:
  - When green dies, it returns red and blue it used back into the environment.
  - Nothing is created or destroyed—just **converted and relocated**.
- **Stabilization**:
  - Green fields "lock" water and energy into place, slowing chaos.
  - Prevents runaway feedback by capping expansion to available resources.

## 🧠 Update Mechanism
- **Synchronous Update** (all updates occur after scan of current grid state).
- **Local only**: Each cell can only “see” its immediate neighbors (Moore or Von Neumann).
- **Tie-breaking rule**:
  - When multiple cells want to move into the same space (e.g., blue falling):
    - Deterministic (e.g., leftmost first) or randomized per tick.

## 📏 Simplifications / Variants (Optional)
- Use just **two channels** (e.g., red & blue) to simplify simulation further.
- Convert RGB floats to 8-bit integers (0–255) for visual elegance and GPU-compatibility.
- Add a **decay field** (alpha channel or grayscale) for dead matter or environmental scars.

## 📈 Emergent Patterns Expected
- **Energy halos** around water pools.
- **Plant rings** forming around nutrient convergence zones.
- **Wave-like pulse events** as energy and water move out of sync.
- Self-organizing structures that **oscillate, stabilize, or spiral**.
