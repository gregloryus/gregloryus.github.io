# Bitwise Random System

## Core Concept

Use efficient bitwise operations to create deterministic but natural-feeling random patterns for light absorption.

## Key Components

### Master Seed System

1. Properties

   - 32-bit integer seed
   - Determines entire simulation timeline
   - Can be saved/restored
   - Creates different but valid patterns

2. Evolution
   - Deterministic state changes
   - No periodicity
   - Maintains randomness properties
   - Efficient updating

### Cell-Specific Randomization

1. Cell Properties

   - Unique cell ID
   - Local state value
   - Position independence
   - Temporal independence

2. Combination Method
   - Seed state + Cell ID
   - Multiple bit manipulations
   - Non-cyclic patterns
   - Natural distribution

## Random Properties

### True Random-Like Behavior

1. Possibilities

   - Can produce any sequence
   - Allows for rare events
   - No forced patterns
   - Natural clustering

2. Distribution
   - Matches true random
   - No artificial limits
   - Proper probability curve
   - Even long-term distribution

### Streak Handling

1. Allowed Patterns

   - Multiple hits possible
   - Long droughts possible
   - Natural clustering
   - No artificial bounds

2. Balance
   - Rare events possible
   - Natural feeling
   - No forced correction
   - Statistical validity

## Performance Optimizations

### Batch Processing

1. Multiple Frame Calculation

   - Process many frames at once
   - Efficient bit manipulation
   - Maintain randomness
   - Save computation

2. State Updates
   - Minimal state storage
   - Efficient evolution
   - Quick calculation
   - Easy reproduction

### Implementation Details

1. Bitwise Operations

   - Fast CPU operations
   - Simple combinations
   - Clear patterns
   - Easy to maintain

2. State Management
   - Small memory footprint
   - Quick updates
   - Easy serialization
   - Efficient storage

## Integration Points

### Event System Integration

1. Timing

   - When to calculate
   - How many frames
   - Update frequency
   - State preservation

2. Efficiency
   - Minimal recalculation
   - Proper batching
   - State caching
   - Result reuse

### Energy System Integration

1. Resource Management

   - Energy calculation
   - Distribution patterns
   - Growth control
   - Death handling

2. Balance
   - Growth rate
   - Survival rate
   - Resource flow
   - System stability
