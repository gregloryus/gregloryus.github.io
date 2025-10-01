# Triple Bit Trees: A Framework for Emergent Plant Growth

## Overview

Triple Bit Trees are a minimalist simulation framework for modeling
plant-like structures in a pixel-based grid. Each plant is composed of
**particles (cells)**, and each particle contains a simple genetic
instruction represented as a **3-bit binary sequence** (e.g., `010`,
`111`, `000`). These bits determine whether a particle generates
children in its **left**, **up**, or **right** slots relative to its own
orientation.

The framework is designed for emergent, field-based growth without
requiring object-oriented tracking of parent--child relationships.
Instead, plants evolve locally through deterministic rules.

------------------------------------------------------------------------

## Core Principles

### 1. Particle Orientation

-   Each particle has a **facing direction**: `north`, `east`, `south`,
    or `west`.
-   Facing is global---it determines how the particle's slots (left, up,
    right) map onto the grid.

### 2. Growth Slots

-   Every particle has **three potential growth slots**:
    -   **Left slot** → offset from the particle's position to its left
        side.
    -   **Up slot** → directly ahead of the particle (its main growth
        axis).
    -   **Right slot** → offset to its right side.
-   The **down slot** is reserved for the particle's parent and never
    spawns growth.

### 3. Triple Bit Encoding

-   Each particle's **3-bit gene** encodes which of its slots will
    generate children:
    -   First bit → left slot
    -   Second bit → up slot
    -   Third bit → right slot
-   Example genes:
    -   `010` → only spawns an upward child.
    -   `111` → spawns children in all three slots.
    -   `000` → sterile particle (no children).

### 4. Expansion Order

-   Children always expand in **left → up → right order** when
    interpreting genes.
-   A breadth-first or depth-first traversal of the gene array can
    reconstruct the full tree without explicit parent references.

------------------------------------------------------------------------

## How Growth Works in Simulation

1.  **Initialization**
    -   The simulation begins with a **seed particle** at the grid
        center, facing `north`.
    -   Its growth behavior is defined by its 3-bit gene.
2.  **Particle Growth**
    -   When growth is triggered, each live particle attempts to create
        new children based on its gene and orientation.
    -   For example, a particle at `(10, 10)` facing `east` with gene
        `101` would try to grow:
        -   Left slot (north of parent) → new particle facing `north`.
        -   Up slot (east of parent) → new particle facing `east`.
        -   Right slot (south of parent) → blocked, since the third bit
            is `0`.
3.  **Collision Prevention**
    -   Before a new particle is added, its slot is checked using
        **`isOccupied`**, which tests:
        -   The proposed slot cell (must be empty).
        -   Two horizontal neighbors relative to facing.
        -   The three cells directly in front (ahead, up-left,
            up-right).
    -   This prevents overlapping or invalid trees.
4.  **Tree Maturation**
    -   Growth proceeds until all live edges (particles with growth
        potential) have attempted to spawn children.\
    -   When no live edges remain, the tree is considered **mature**.

------------------------------------------------------------------------

## Genetic Representation of a Tree

### Encoding a Tree

-   A **mature tree** can be represented as a **1D array of genes**.

-   Example:

        [111, 010, 000, 011, 100]

-   Interpreted as:

    -   The root (`111`) spawns three children (left, up, right).
    -   Next genes (`010`, `000`, `011`) map in order to those children.
    -   Last gene (`100`) belongs to the right child's subtree.

### Decoding a Tree

-   To reconstruct a tree:
    -   Traverse the gene array in **depth-first order**.
    -   Each gene dictates how many children follow and in what slot
        order (left → up → right).

------------------------------------------------------------------------

## Simulation Flow

1.  **Growth Cycle**
    -   Growth is triggered manually (e.g., mouse click) or
        automatically (timed loop).
    -   Live edges attempt to grow new particles.
2.  **Maturity Check**
    -   If the particle count does not increase and no live edges remain
        → the tree is mature.
3.  **Recording Results**
    -   The mature tree's particle count is logged.
    -   The gene sequence can be extracted for record-keeping.
4.  **Winner Tracking**
    -   If the mature tree's size exceeds the current record, its genes
        are saved as a **"winner."**
    -   Otherwise, the simulation resets and tries again.

------------------------------------------------------------------------

## Example Gene Walkthrough

Consider the gene array:

    [111, 010, 000]

-   **Root (111, facing north)**
    -   Spawns three children: left (west), up (north), right (east).
-   **First child (010, facing west)**
    -   Only spawns an upward child (westward on the grid).
-   **Second child (000, facing north)**
    -   Sterile, no further growth.
-   **Third child not specified** → tree ends here.

This process builds a branching tree deterministically.

------------------------------------------------------------------------

## Key Advantages

-   **Simplicity**: Each particle needs only 3 bits of genetic data.
-   **Emergence**: Complex plant-like structures arise from minimal
    rules.
-   **Determinism**: Gene arrays encode trees in a reproducible way
    without tracking parent-child objects.
-   **Extensibility**: Mutation, crossover, or selection can be applied
    for evolutionary simulations.

------------------------------------------------------------------------

## Future Directions

-   **Evolutionary Experiments**: Select winners across generations and
    mutate genes.\
-   **Visualization Improvements**: Dynamic scaling, color-coding by
    depth, animated growth.\
-   **Biological Analogies**: Explore phenomena like apical dominance,
    branching density, and resource competition.

------------------------------------------------------------------------

This document explains the **Triple Bit Trees framework** in plain
English, with pictographic 3-bit gene encoding. It provides the
foundation for deterministic, emergent plant simulations in a
pixel-based environment.
