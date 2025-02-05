# BitwiseRNG System Specification

## Overview

A deterministic random number generator using bitwise operations for high performance and reproducibility. Designed for simulations, games, and generative art where both speed and determinism are crucial.

## Core Features

- Deterministic randomness from a master key
- Timeline-based progression
- Entity-specific values
- Batch processing
- State save/load
- Multiple independent instances
- High performance bitwise operations

## API Design

### Constructor

```javascript
const rng = new BitwiseRNG(masterKey, options);
```

#### Options

```javascript
{
  resolution: 256,      // Default 8-bit resolution
  timeScale: 1,        // How many bits to shift per tick
  hashFunction: 'xor'  // Default hash method
}
```

### Core Methods

#### Single Value Generation

```javascript
// Get next random value (0-1) for entity
next(entityId): number

// Test against threshold (more efficient)
test(entityId, threshold): boolean

// Get integer in range
nextInt(entityId, min, max): number

// Get value with gaussian distribution
nextGaussian(entityId): number
```

#### Batch Operations

```javascript
// Get array of N values
nextBatch(entityId, count): number[]

// Test N thresholds efficiently
testBatch(entityId, thresholds): boolean[]

// Get N integers in range
nextIntBatch(entityId, min, max, count): number[]
```

#### Timeline Control

```javascript
// Advance timeline
tick(frames = 1): void

// Set specific frame
setFrame(frame): void

// Reset to initial state
reset(): void
```

#### State Management

```javascript
// Get current state
getState(): BitwiseRNGState

// Restore previous state
setState(state: BitwiseRNGState): void

// Create independent copy
clone(): BitwiseRNG
```

## Implementation Details

### Hash Generation

```javascript
private generateHash(entityId, frame = this.frame): number {
  // Primary hash combining masterKey, frame, and entityId
  let hash = (this.masterKey ^ frame ^ entityId) & this.mask;

  // Optional additional mixing for better distribution
  hash = hash ^ (hash << 13);
  hash = hash ^ (hash >> 17);
  hash = hash ^ (hash << 5);

  return hash & this.mask;
}
```

### Performance Optimizations

1. Use bitwise operations exclusively
2. Pre-compute masks and constants
3. Minimize object creation
4. Batch similar operations
5. Cache frequently used values

## Usage Examples

### Basic Usage

```javascript
const rng = new BitwiseRNG(12345);

// Simple random checks
if (rng.test(entity.id, 0.1)) {
  // 10% chance event
}

// Random value in range
const damage = rng.nextInt(entity.id, 5, 10);
```

### Batch Processing

```javascript
// Process multiple frames at once
const lightValues = rng.nextBatch(plant.id, 60);
const totalLight = lightValues.reduce((sum, v) => sum + v, 0);
```

### Multiple Systems

```javascript
// Independent systems with different seeds
const weatherRNG = new BitwiseRNG(seed1);
const geneticsRNG = new BitwiseRNG(seed2);
const combatRNG = new BitwiseRNG(seed3);
```

### Save/Load System

```javascript
// Save game state
const saveData = {
  rngState: rng.getState(),
  // ... other game state
};

// Load game state
rng.setState(saveData.rngState);
```

## Performance Considerations

### Optimal Use Cases

1. Many entities needing random values
2. Need for reproducible results
3. Frequent random checks
4. Batch processing capability
5. Timeline manipulation

### Memory Usage

- Constant memory per instance
- No growing state
- Efficient batch operations
- Minimal object creation

### CPU Usage

- O(1) for single operations
- O(n) for batch operations
- No floating point operations in core logic
- Cache-friendly memory access

## Integration Guidelines

### System Integration

1. Create global instance for shared timeline
2. Use separate instances for independent systems
3. Integrate with existing random number calls
4. Add state save/load to persistence system

### Best Practices

1. Use consistent entity IDs
2. Batch similar operations
3. Use test() for threshold checks
4. Save state with game saves
5. Reset when starting new games

## Future Considerations

### Potential Enhancements

1. Additional distribution types
2. Custom hash functions
3. Parallel processing support
4. WebAssembly implementation
5. Stream-based API

### Compatibility

1. TypeScript definitions
2. CommonJS/ES6 module support
3. Browser/Node.js compatibility
4. WebWorker safety
5. Framework integrations
