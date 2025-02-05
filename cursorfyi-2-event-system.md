# Event-Based State Change System

## Core Concept

Minimize computation by only updating cells when meaningful events occur.

## Event Types

### Primary Events

1. Physical Structure Changes

   - New cell added
   - Cell removed/died
   - Cell position changed
   - Support structure modified

2. State Changes

   - Energy level crossed threshold
   - Cell begins dying
   - Cell enters growth phase
   - Change in light absorption capability

3. Resource Changes
   - Energy depletion
   - Energy surplus
   - Change in available light
   - Connection to resource flow altered

### Secondary Events

- Neighbor state changes
- Parent/child state changes
- Connected structure modifications
- Periodic check intervals

## Event Propagation Rules

### Vertical Propagation

1. Upward Propagation

   - Always notify parent of state changes
   - Critical for structural stability
   - Affects growth patterns
   - Energy flow disruptions

2. Downward Propagation
   - Notify children if stability affected
   - Energy availability changes
   - Growth potential modifications
   - Support structure changes

### Horizontal Propagation

1. Lateral Notification
   - Space availability changes
   - Resource competition updates
   - Support structure modifications
   - Local environment changes

### Propagation Limits

- Limited to relevant cell cluster
- Distance-based attenuation
- Priority-based processing
- State change thresholds

## Update Scheduling

1. Immediate Updates

   - Critical state changes
   - Structural modifications
   - Energy emergencies
   - Growth events

2. Deferred Updates
   - Non-critical state changes
   - Resource redistribution
   - Long-term adaptations
   - Regular maintenance checks

## Performance Considerations

1. Update Batching

   - Group similar updates
   - Process by region
   - Prioritize critical changes
   - Defer non-essential updates

2. State Tracking

   - Efficient state storage
   - Change detection
   - History tracking
   - Event queuing

3. Optimization Strategies
   - Event coalescing
   - Priority queuing
   - Update throttling
   - Cascade limiting
