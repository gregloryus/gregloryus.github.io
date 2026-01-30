# Lava Lamp Simulation Project - Handoff Document

## Project Goal

Create a performant, elegant 2D cellular automata-style lava lamp simulation that exhibits realistic behavior:

1. **Wax starts cold and solid** at the bottom of the canvas
2. **Heat source** (center 1/3 of bottom row) gradually warms the wax
3. **Gradual state change**: cold wax is rigid/solid, hot wax becomes fluid/blobby
4. **Discrete blob formation**: once hot enough, small sections should pinch off and rise
5. **Rising blobs cool** as they move up, eventually solidifying
6. **Cold blobs fall** back down
7. **Collision behavior**: hot+hot blobs can merge, hot+cold blobs bounce
8. **Key requirement**: Wax should NOT be constantly moving/jittering. It should be mostly still when cold, with gradual heating leading to tipping points that trigger movement.

## Files Created

- `lava-lamp-1.html` through `lava-lamp-8.html` - Progressive attempts
- `lava_lamp_ca_synthesis.md` - Initial synthesis from ChatGPT/Gemini on approaches

## Approaches Tried

### Approach 1: Kawasaki Dynamics / Energy Minimization (v1-v7)

**Concept**: Calculate energy for each potential swap between wax and water cells. Only swap if energy decreases. Energy = gravity/buoyancy + surface tension.

**Energy equation**:
```
ΔE = g_eff × (waxY - waterY) + J(T) × Δ(unlike_neighbors)

where:
- g_eff = G_GRAVITY - B_BUOYANCY × T
- J(T) = J_COLD × (1-T) + J_HOT × T (temperature-dependent surface tension)
```

**Problems encountered**:

| Version | Issue |
|---------|-------|
| v1-v2 | **Race condition**: Reading from `nextGrid` during swap evaluation while it was being modified. Fixed by reading from `currentGrid`. |
| v3 | **Gravity sign inverted**: Formula `dE = g_eff × (waterY - waxY)` was wrong. Should be `dE = g_eff × (waxY - waterY)` for hot wax rising to have negative (favorable) energy change. |
| v4-v5 | **Diffusion-based heat model**: Heat flow proportional to temperature difference caused asymptotic approach to equilibrium. Surface wax never got hot enough because heat leaked into surrounding water. |
| v6 | **Surface tension still too weak/strong**: Couldn't find balance where wax could move but not fragment. |
| v7 | **Changed to constant heat injection** (heater adds fixed heat per tick, not diffusion-based). **Surface tension too weak** → wax exploded into fragments when movement started. |

**Fundamental conflict**: Energy minimization requires balancing:
- Surface tension strong enough to prevent fragmentation
- Surface tension weak enough to allow movement

For a cell in the MIDDLE of a flat wax surface, moving up creates ~6 new interface edges. This cost is enormous. Only edge cells have lower costs, but once they move, they become isolated and fragment.

### Approach 2: Rule-Based with Cohesion Check (v8)

**Concept**: Abandon energy minimization. Use simple rules:
- Hot wax (T > RISE_THRESHOLD) tries to rise
- Cold wax (T < FALL_THRESHOLD) tries to fall
- **Cohesion check**: Cell can only move if it will still have ≥1 wax neighbor after moving

**Current state of v8**:
- Heat diffuses only between wax cells (not into water)
- Heater is bottom row, center 1/3
- Has UI for manually adjusting all parameters
- Checkerboard update pattern to avoid race conditions

**Current problems with v8**:
1. **Heat not accumulating**: Average temp plateaus at ~0.45-0.46 even with HEAT_LOSS=0 and HEAT_INPUT=10
2. **Only "simmering"**: Cells move up and down slightly but no coherent blob movement
3. **No rising blobs**: Despite high temps in some cells, no blobs actually rise to the top

## Heat Model Issues (Critical)

The heat is not accumulating properly. Even with:
- HEAT_INPUT = 10 (very high)
- HEAT_LOSS = 0 (no loss)
- COOL_RATE = 0.03

Average temperature plateaus at ~0.45. This suggests heat is leaking somewhere or the diffusion model is wrong.

**Current heat flow in v8**:
1. `applyHeat()`: Adds HEAT_INPUT to wax cells at bottom row in heater zone
2. `diffuseHeat()`: Laplacian diffusion between wax cells only
3. `applyHeat()` also subtracts HEAT_LOSS from all wax and COOL_RATE from top zone

**Possible issues**:
- Diffusion coefficient (0.5) might be too high, causing heat to spread and dissipate too fast
- Cool zone might be pulling too much heat out
- Something in the math might be wrong

## Key Insights from the Conversation

1. **Surface tension vs movement trade-off**: In energy-based approaches, these requirements fight each other.

2. **Flat surfaces are problematic**: A cell in the middle of a flat surface has ~4 same-phase neighbors. Moving it creates many new interface edges, costing a lot of energy.

3. **Heat must reach the SURFACE**: Only surface wax cells (touching water) can swap. Interior cells can't move. So the surface must get hot enough to trigger movement.

4. **Temperature-dependent surface tension**: The original synthesis recommended J(T) varying from high (cold/rigid) to low (hot/fluid). This is conceptually correct but hard to balance in practice.

5. **Cohesion check approach**: Explicitly preventing cells from becoming isolated (v8 approach) directly addresses fragmentation but may be too restrictive.

## Files to Cross-Reference

### `touch-rain-push.html`
- Contains a simpler fluid/lava-lamp-like dynamic with individual particles
- Particles heat up at bottom and cool as they rise
- **Different approach**: Individual particles, not cohesive blobs
- **May provide insight on**: How heat/velocity is handled, what makes particles rise/fall naturally

### `magmasim.js` files
- May have relevant swapping logic
- May handle density or pressure differently
- Worth reviewing for alternative approaches to fluid simulation

## Parameters in v8 (Current)

```javascript
CONFIG = {
    CELL_SIZE: 3,

    // Heat
    HEAT_INPUT: 0.2,        // Heat added per tick in heater zone
    HEAT_DIFFUSION: 0.5,    // How fast heat spreads within wax
    HEAT_LOSS: 0.0002,      // Ambient heat loss (very small)
    COOL_RATE: 0.03,        // Heat removed in cooler zone

    // Movement
    RISE_THRESHOLD: 0.5,    // T above which wax wants to rise
    FALL_THRESHOLD: 0.3,    // T below which wax wants to fall
    MOVE_PROBABILITY: 0.3,  // Probability of moving (viscosity)

    // Geometry
    HEATER_WIDTH_FRAC: 0.33,
    COOLER_HEIGHT: 5,
    WAX_HEIGHT_FRAC: 0.08,
    WAX_WIDTH_FRAC: 0.9,
}
```

## What the Desired Behavior Looks Like

1. **Initial state**: Flat wax layer at bottom, cold (dark color)
2. **Heating phase**: Center of wax (above heater) gradually brightens. This should take many ticks. No movement yet.
3. **Tipping point**: Once a section gets hot enough AND is geometrically able to detach (thin neck or protrusion), a blob pinches off
4. **Rising**: Small hot blob rises through the water
5. **Cooling at top**: Blob darkens as it approaches top/cooler zone
6. **Falling**: Cold blob sinks back down
7. **Steady state**: Continuous cycle with multiple blobs at various stages

## Potential Alternative Approaches to Explore

1. **Blob-based movement**: Track connected components (blobs) as entities. Calculate average temperature per blob. Move entire blobs based on net buoyancy. This avoids cell-by-cell energy calculations.

2. **Falling-sand with sticky cohesion**: Classic falling sand rules (gravity pulls down, buoyancy pushes up based on density/temp) but with a "stickiness" factor that makes cells prefer to stay adjacent to same-phase neighbors.

3. **Pressure/density model**: Instead of surface tension, model internal pressure in blobs. Hot wax expands (higher pressure), cold wax contracts. Pressure differentials drive movement.

4. **Two-phase approach**:
   - Phase 1: Heat simulation only (no movement) until critical temperature reached
   - Phase 2: Movement enabled, with strong cohesion forces

5. **Hybrid continuous/discrete**: Use continuous values for temperature but discrete (binary) for phase. Movement rules could be probabilistic based on temperature gradients.

## Questions for Next Instance

1. Why does heat plateau at ~0.45 even with no heat loss?
2. Is the diffusion formula correct? Should it be scaled differently?
3. Is the cohesion check too restrictive? Should it allow cells to detach under certain conditions (e.g., very high temperature)?
4. Would a completely different approach (blob-based, pressure-based) be more suitable?
5. How do touch-rain-push.html and magmasim.js handle similar problems?

## Summary

After 8 versions and multiple approaches, the simulation still doesn't achieve the desired lava lamp behavior. The main issues are:

1. **Heat accumulation**: Can't get the wax hot enough / heat doesn't accumulate properly
2. **Cohesive movement**: Either the wax fragments into chaos OR it barely moves at all
3. **No blob formation**: Haven't achieved the "pinch off and rise" behavior

The fundamental challenge is creating a system where:
- Wax stays together as cohesive blobs
- But can still deform and split under the right conditions
- Heat drives the behavior naturally without constant jittering

This may require rethinking the approach entirely rather than tweaking parameters.
