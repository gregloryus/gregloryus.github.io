# Bitwise Light Absorption System

## Core Concept

Use bitwise operations to create deterministic but naturally random-like patterns for plant cell light absorption, driven by a master seed value.

## Key Properties

### Randomness

- True random-like behavior where any sequence is possible
- No forced patterns or cycles
- Allows for rare events like absorption streaks or droughts
- Probability distribution matches actual random chance

### Determinism

- Same seed always produces same sequence
- Different seeds produce different valid sequences
- No dependence on position or time
- Completely reproducible given same seed

### Performance

- Uses fast CPU-level bitwise operations
- No expensive random number generation
- Scales well with large numbers of cells
- Minimal per-frame computation

## Implementation Theory

1. Master seed defines the simulation's "timeline"
2. Each cell gets unique ID at creation
3. Each frame, the seed state evolves deterministically
4. Combine evolved seed with cell ID through bitwise operations
5. Result determines light absorption in a way that:
   - Appears random
   - Is unique to each cell
   - Has no forced periodicity
   - Can produce any possible sequence

## Advantages Over Other Approaches

- More natural randomness than modulo-based systems
- Better performance than Math.random()
- True save/load capability
- No artificial constraints on absorption patterns

## Use Cases

- Multiple simulations from same starting conditions
- Reproducible "interesting" growth patterns
- Efficient large-scale simulations
- Verifiable deterministic behavior for testing
