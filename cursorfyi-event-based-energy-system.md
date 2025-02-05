# Event-Based Energy System Design

## Core Concept

Only recalculate cell energy states when meaningful events occur or after significant time has passed, rather than checking every frame.

## Trigger Events

1. Neighbor cell added/removed
2. Periodic interval check (every N frames)
3. Parent/child cell state changes
4. Cell position changes

## Cell States

```javascript
const CELL_STATES = {
  THRIVING: {
    minOpenSides: 3,
    energyDelta: +1,
    color: 0x00ff00, // Bright green
  },
  HEALTHY: {
    minOpenSides: 2,
    energyDelta: 0,
    color: 0x008000, // Regular green
  },
  STRESSED: {
    minOpenSides: 1,
    energyDelta: -1,
    color: 0x654321, // Brown
  },
  DYING: {
    minOpenSides: 0,
    energyDelta: -2,
    color: 0x8b0000, // Dark red
  },
};
```

## Implementation Details

- Cells maintain references to neighbors
- State changes propagate through connected cells
- Energy changes tied to state transitions
- Visual feedback immediate and state-based
- Most frames do no energy calculations
- Stable structures rarely need updates

## Benefits

1. Highly performant - minimal per-frame calculations
2. Natural propagation of changes
3. Stable structures become computationally "quiet"
4. Clear visual feedback
5. Event-driven energy changes
6. Memory efficient

## Emergent Behaviors

- Growing tips trigger recalculations
- Stable middle sections rarely update
- Death propagates through connected sections
- Structure changes can trigger recovery
- Natural balance between growth and decay
