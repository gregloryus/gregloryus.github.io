# Plant Simulation — Project Intent

## North Star

Build a **large-scale, 2D lattice plant simulation** with the legibility of a falling-sand game and the open-endedness of evolution.

The world should be simple enough to understand locally, but rich enough that distinct plant forms can emerge over many generations from different local conditions.

## Core Design Principles

- **Local, visible causality:** Every meaningful process should arise from nearby cells and visible conditions. Avoid hidden fitness scores, global planners, or unexplained spawning/despawning.
- **Conservation through transformation:** Matter should persist whenever possible. A living plant cell may become dead plant matter, soil, sand, or another visible state rather than disappearing.
- **Emergent morphology:** Plant shape should be a consequence of local interaction with light/energy, space, water, substrate, neighbors, and death—not a predefined “tree” or “grass” class.
- **Evolution without a target form:** Start from extremely minimal organisms (perhaps 3–5 cells). Mutation and inheritance should let locally successful traits persist across generations.
- **Divergence by place:** A single ancestral plant should be capable of evolving into different forms or strategies in different parts of the same world because their local environments differ.

## Scale Goals

- Support worlds on the order of **10,000 × 10,000 cells or larger**.
- Run for **millions of ticks** without the design collapsing under per-cell overhead.
- Permit large differences in organism scale: a tiny 4–5 cell “blade of grass” and a much larger, tree-like organism—potentially 100× larger—should coexist in principle.

## Candidate Biological Core

- Plants gain energy through local interaction with open neighboring space.
- A prior promising rule: cells with exposed sides can absorb energy, with different cell roles having different efficiency (for example, leaf-like cells outperforming stem-like cells).
- Growth, maintenance, reproduction, death, and decomposition should all draw from or transform visible resources.
- Genetics may use the earlier **triple-bit body-plan system**, with mutation altering local behavior or allocation rules rather than encoding a large explicit blueprint.

## Performance Commitments

- Favor **strictly local rules**, compact state, and data-oriented storage.
- Avoid scanning the entire world when only a small active frontier needs updating.
- Design around active cells/chunks, bounded local neighborhoods, and predictable memory access from the beginning.
- Treat visual richness as an emergent result of a small rule set, not a reason to add expensive special cases.

## Early Success Criteria

A first version succeeds if it can show:

1. Small plants that acquire energy and grow using only local rules.
2. Death and decay as visible state transitions rather than deletion.
3. Mutation and inheritance across generations.
4. Different local conditions selecting for visibly different plant forms.
5. A performance architecture that has a believable path to extremely large, long-running worlds.

## Deliberate Non-Goals at First

- Photorealistic botany.
- A fully realistic ecosystem.
- Complex global ecology, pathfinding, or centralized decision-making.
- Hidden “fitness” calculations that make outcomes hard to read from the simulation itself.

## Guiding Question

**Can a tiny set of local, conserved, visible rules produce plants whose bodies look like evidence of the environments that shaped them?**
