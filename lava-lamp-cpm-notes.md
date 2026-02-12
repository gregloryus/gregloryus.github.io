# Design Document: Thermal Cellular Potts Model (v3)

**Project:** Discrete Lava Lamp Simulation  
**Date:** January 31, 2026  
**Status:** Major Pivot / Architecture Definition  
**Previous Versions:** `lava-lamp-lbm` (Shan-Chen), `lava-lamp-dplbm` (Coordinated Swaps)

---

## 1. Executive Summary

This document memorializes a critical pivot in the simulation architecture.

**The Discovery:** The user has independently reinvented a localized, GPU-friendly variant of the **Cellular Potts Model (CPM)** (also known as the Glazier-Graner-Hogeweg model).

**The Pivot:** We are moving from a **Kinematic** approach (explicit rules: "move only if filler exists") to a **Thermodynamic** approach (energy rules: "move if it lowers system energy"). This solves the "gridlock" and "complex topology check" issues of previous versions while strictly conserving mass and maintaining blob cohesion.

---

## 2. The Core Problem: Kinematics vs. Thermodynamics

### Why `dplbm-twophase` Failed (The Kinematic Trap)

In the previous "Coordinated Swap" attempt, we tried to enforce cohesion through mechanical rules:

- _"A particle can only move if a neighbor fills its spot."_
- _"A particle cannot move if it breaks connectivity (is not a simple point)."_

**The Consequence:** This created **Gridlock**. The conditions required to move were so specific that particles mostly froze. When we relaxed the conditions, particles "leaked" and dissolved. It requires exponentially increasing complexity (checking 8-neighbor topology, finding paths) to solve simple movement.

### The Solution: The Cellular Potts Model (Thermodynamic)

Instead of asking "Can I move?", the particle asks "Do I _want_ to move?".

- We define an **Energy Function (Hamiltonian)** that describes what a "good" lava lamp looks like (clumped wax, buoyant hot spots).
- We pick random swaps and accept them if they lower the energy (or occasionally if they raise it, to simulate thermal jiggle).

**Why this wins:** \* **Cohesion is automatic:** We define a high energy cost for Wax-touching-Water. The system naturally minimizes surface area (forming blobs) to avoid this cost.

- **Movement is fluid:** There are no "lock" conditions. Particles can "jiggle" past each other.
- **Performance:** The logic is $O(1)$ per pixel. No pathfinding, no topology checks.

---

## 3. The "Secret Weapon": The Local Unit System

Standard CPM is hard to parallelize because calculating volume usually requires global knowledge (summing pixels of a blob).

**The User's Innovation:** By defining mass and volume **locally** within a cell (Units + Capacity), we create a "Local CPM" that is trivially parallelizable and shader-ready.

### The Cell State

Each lattice site $i$ contains:

- `Units` ($u$): Integer [0..8]. The actual amount of wax.
- `Temperature` ($T$): Float [0.0..1.0].
- `Capacity` ($C(T)$): Derived Integer [6..8]. How much wax "fits" comfortably.
  - Cold ($T=0$): $C=8$ (Dense)
  - Hot ($T=1$): $C=6$ (Expanded)

---

## 4. The Algorithm: Metropolis-Hastings Update

Instead of calculating forces and velocities, we run a **Monte Carlo** loop. This is the "Engine" of the simulation.

### The Loop (Per Frame)

Repeat $N$ times (where $N$ is roughly the number of pixels):

1.  **Pick a Target:** Select a random site $i$ (Source) and a random neighbor $j$ (Destination).
2.  **Propose Swap:** Imagine moving 1 Unit of wax from $i$ to $j$.
    - $u'_i = u_i - 1$
    - $u'_j = u_j + 1$
3.  **Calculate Energy Change ($\Delta H$):**
    - Does the new state look "better"? (See Section 5).
4.  **Accept/Reject:**
    - If $\Delta H < 0$ (Energy improved): **ACCEPT**.
    - If $\Delta H \ge 0$ (Energy worsened): Accept with probability $P = e^{-\Delta H / T_{noise}}$.
      - _$T_{noise}$ is a "simulation temperature" parameter, distinct from the physical heat._

---

## 5. The Energy Hamiltonian ($H$)

The total energy of the system is the sum of three terms. We only need to calculate the _change_ ($\Delta$) locally.

$$H = H_{adhesion} + H_{capacity} + H_{buoyancy}$$

### A. Adhesion (Surface Tension)

Encourages wax to stick to wax and avoid water.
$$H_{adhesion} = J \sum \text{neighbors where (Wax touches Water)}$$

- **Logic:** If a swap moves a wax unit from "surrounded by water" to "surrounded by wax," $\Delta H$ is large and negative (Good).
- **Result:** Emergent surface tension. Small droplets dissolve back into main blobs; blobs round out.

### B. Capacity (Volume/Pressure)

Encourages cells to match their thermally defined density.
$$H_{capacity} = \lambda \sum (u_i - C(T_i))^2$$

- **Logic:**
  - A **Cold** cell ($C=8$) with 8 units has $E=0$.
  - If it **Heats up** ($C \to 6$), it now has $E = (8-6)^2 = 4$. High Energy!
  - It _wants_ to shed 2 units to a neighbor to return to $E=0$.
- **Result:** This drives the **expansion**. Hot wax pushes units outward.

### C. Buoyancy (Gravity)

Encourages wax to settle or rise based on density.
$$H_{buoyancy} = g \sum y \cdot (u_i)$$

- **Logic:** Moving a unit from $y$ to $y+1$ costs energy $g$.
- **The Twist:** We modulate $g$ based on temperature relative to the medium.
  - Net Force $\approx (u_i - u_{medium})$.
  - Since we don't have explicit medium, we essentially bias the swap probability UP or DOWN based on if the unit is "Hotter" than neutral.

---

## 6. Implementation Strategy

### Phase 1: CPU Prototype (The Proof)

- **Data Structure:** Single 1D Int array for `Units`, Float array for `Temp`.
- **Loop:** Pure JavaScript `for` loop executing random swaps.
- **Goal:** Verify that a hot blob expands, sheds units, and rises without dissolving.

### Phase 2: GPU/Shader (The Scale)

- **Problem:** Shaders can't do random sequential updates (Race conditions).
- **Solution:** **Checkerboard Update (Red-Black Scheme).**
  - **Frame 1:** Update only "Red" squares (even X+Y). They define their swap target deterministically (e.g., always look Right).
  - **Frame 2:** Update "Black" squares.
  - **Frame 3-4:** Switch look direction (Left, Up, Down).
- **Logic:** The Shader calculates $\Delta H$ for a hypothetical swap with a specific neighbor and outputs the new state.

---

## 7. Key Resources & References

### Papers

1.  **Graner, F., & Glazier, J. A. (1992).** "Simulation of biological cell sorting using a two-dimensional extended Potts model." _Physical Review Letters_.
    - _The foundational paper. Read this for the Adhesion math._
2.  **Swat, M. H., et al. (2012).** "Multi-Scale Modeling of Tissues Using CompuCell3D."
    - _Modern overview of CPM capabilities._

### Concepts

- **Metropolis-Hastings Algorithm:** The statistical method used to accept/reject swaps.
- **Hamiltonian:** The fancy word for "Total Energy Function."
- **Checkerboard (Red-Black) Parallelization:** The standard technique for running Cellular Automata on GPUs.

---

## 8. Development Roadmap (For the Next AI)

1.  **Ingest this document.** Understand that we have abandoned "Coordinated Swaps" (DPLBM).
2.  **Implement the Hamiltonian.** Write the `calculateDeltaH()` function. This is the heart of the code.
3.  **Tune Parameters ($J, \lambda, T_{noise}$).**
    - $J$ (Adhesion) controls how "round" the blobs are.
    - $\lambda$ (Capacity) controls how "explosive" the expansion is.
    - $T_{noise}$ controls how "liquid" the movement is. Too high = static; Too low = frozen.
4.  **Visualize.** Map `Units` to Opacity and `Temp` to Color.
