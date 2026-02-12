# DPLBM Wireflow - Accidental Discovery

## What Is This?

`lava-lamp-dplbm-wireflow.html` is an accidental emergent behavior discovered while trying to create cohesive lava lamp blob physics. Instead of blobs, the simulation produces beautiful, intricate wire-like lattice structures that maintain connectivity while maximizing surface area.

## The Original Goal

We were trying to create a lava lamp simulation with:
- Discrete integer wax particles (perfect mass conservation)
- LBM-driven fluid dynamics for convection
- Cohesive blob behavior (wax stays together as unified masses)

The problem: wax particles kept flying off individually instead of moving as cohesive blobs.

## The Attempted Solution

We implemented "two-phase coordinated swaps":

1. **Wax-wax swaps**: Free (internal convection)
2. **Wax-empty swaps**: Only allowed if a "filler" wax cell simultaneously moves into the vacated position

The filler requirements:
- Must have velocity pointing toward the moving cell
- Must be at the surface (have an empty neighbor)
- Must be a "simple point" (its removal doesn't disconnect the wax)

The **simple point test** uses digital topology: count transitions around the 8-neighbor ring. If there are ≤2 transitions (wax→empty and empty→wax), the cell's neighbors form a single connected arc, so removing the cell won't disconnect them.

## Why Wires Form

The simple point constraint preserves **connectivity** but not **thickness**.

Key insight: **every cell in a wire is a simple point**. In a single-file chain:
```
. W .
. W .
. W .
```
Each W connects exactly two neighbors. The simple point test passes because when you remove a W, its neighbors (above and below) aren't disconnected from *each other* - they just become endpoints.

What happens over time:
1. Wax-wax swaps churn the interior (convection)
2. Surface cells with simple-point fillers can expand outward
3. The system gradually "unfolds" - spreading wax while maintaining connectivity
4. Wire structures are **stable attractors** - maximum surface area, every cell is a simple point
5. Convection continues to flow through the wire structure, creating subtle movements

## The Beautiful Result

The simulation produces:
- Intricate maze-like patterns
- All wax remains connected (no isolated particles)
- Convection still visible as the structure subtly shifts
- Temperature gradients visible (hot yellow at bottom, cool purple at top)
- Structures stabilize into equilibrium after ~10-15k ticks

With higher wax amounts (waxHeight ≥ 0.6), there isn't enough empty space to unfold into, so the wax stays as a dynamic compressed blob.

## Key Parameters

- `waxHeight`: 0.5 or less allows full unfolding; 0.6+ stays blobby
- `tempDiffusion`: Higher values create more uniform temperature
- `requireFiller`: Must be ON for wireflow behavior
- `allowIsolated`: Should be OFF

## Technical Details

### Simple Point Algorithm
```javascript
function isSimplePoint(x, y) {
    // Get 8 neighbors in clockwise order
    // Count transitions from wax to non-wax around the ring
    // If transitions ≤ 2, it's a simple point
}
```

### Coordinated Swap
When wax A wants to move into empty E:
1. Find filler B (wax neighbor of A, at surface, simple point, has velocity toward A)
2. Execute atomically: A→E, B→A's position, B's position→empty

### Why It's Stable
- No cell can escape (must have filler)
- No disconnection possible (filler must be simple point)
- Wire cells are all simple points, so they can participate as fillers
- System reaches equilibrium when convection forces balance

## Relation to Other Work

This is reminiscent of:
- Diffusion-limited aggregation (DLA)
- Percolation theory structures
- Minimal spanning trees
- Reaction-diffusion patterns

The key difference: this emerges from fluid dynamics + topology constraints, not from growth or diffusion rules.

## Files

- `lava-lamp-dplbm-wireflow.html` - The simulation
- `lava-lamp-wireflow-notes.md` - This document
- Screenshots: `Screenshot 2026-01-31 at 3.42.*.png` and `3.43.*.png`, `3.47.*.png`

## Future Exploration

Interesting directions:
- What happens with different initial configurations?
- Can we control the "wire density" with parameters?
- Does the final pattern depend on convection strength?
- What mathematical properties do the equilibrium structures have?
