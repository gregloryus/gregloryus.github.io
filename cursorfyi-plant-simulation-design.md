# Plant Simulation Design Document

## Core Systems Integration

Combining three key optimizations:

1. Event-based state changes
2. Bitwise pseudo-random generation
3. Batch processing for light absorption

## Event System

### Trigger Events

- Cell state changes (thriving/stressed/dying)
- New cell addition
- Cell death/removal
- Position changes
- Support structure changes

### Propagation Rules

- Upward: Always notify parent (stability affects up)
- Downward: Only if stability/energy flow affected
- Lateral: Only for physical space changes
- Limited Range: Changes stop at irrelevant cells

### Cell States

- THRIVING (3+ open sides, +energy)
- HEALTHY (2 open sides, neutral)
- STRESSED (1 open side, -energy)
- DYING (0 open sides, --energy)

## Energy System

### Core Requirements

- Each cell needs ~1 energy per 60 frames
- Light absorption chances should be truly random-like
- Rare events (streaks/droughts) should be possible
- Must be deterministic with seed

### Optimization Strategy

1. Cell only checks when:
   - Just placed/moved
   - Neighbors change
   - X frames passed since last check
2. When checking, batch process multiple frames
3. Use bitwise operations for speed
4. Calculate multiple absorption opportunities at once

## Bitwise Random System

### Properties

- Uses master seed for entire simulation
- Each cell has unique ID
- No position/time dependence
- Allows for true random-like patterns
- No forced periodicity
- Extremely fast computation

### Performance Benefits

- ~3-5x faster than Math.random()
- Combined with event system: 30-50x improvement
- Batch processing multiple frames
- CPU-efficient operations

## Implementation Notes

### Cell Structure

- Maintain neighbor references
- Track last check frame
- Store energy state
- Record event flags
- Hold unique ID for bitwise operations

### State Changes

- Must be event-driven
- Propagate efficiently
- Track stability changes
- Handle energy updates

### Light Absorption

- Batch process future frames
- Use bitwise operations
- Maintain true randomness
- Store results efficiently

### Resource Management

- Energy collection matches consumption rates
- Natural balance in stable structures
- Death from energy depletion
- Growth requires surplus

## Technical Considerations

1. Avoid checking every cell every frame
2. Batch process when possible
3. Use efficient data structures
4. Minimize event propagation
5. Cache calculations where possible

## Expected Behaviors

1. Growing tips frequently update
2. Stable sections rarely calculate
3. Death propagates naturally
4. Structure affects stability
5. Energy flows through system

## Optimization Goals

1. Minimize per-frame calculations
2. Efficient event propagation
3. Fast random-like behavior
4. Natural plant growth patterns
5. Performant at large scale
