# Lava Lamp v8.2 - Comprehensive Tuning Guide

**Date:** February 1, 2026  
**Version:** v8.2 (Tuned)  
**Focus:** Understanding and tuning the capacity range for optimal behavior

---

## The Three Issues You Found

### Issue 1: Small Voids Appearing/Disappearing

**What you're seeing:**

> "oddly prone to creating 1 or 2-cell voids that appear and get reabsorbed within a few ticks"

**Root Cause:**
Underfill pressure (`underfillLambda = 0.03`) was too aggressive. Interior cells pull so hard they create temporary vacuum pockets:

```
Before:        After pull:     Reabsorbs:
[8][8][8]      [8][8][8]      [8][8][8]
[8][6][8]  →   [8][0][8]  →   [8][7][8]
[8][8][8]      [9][9][9]      [8][8][8]
```

The center cell pulled units outward so aggressively it temporarily emptied itself.

**v8.2 Fix:** Reduced `underfillLambda: 0.03 → 0.015` (50% reduction)

This makes the "negative pressure" gentler - still pulls, but not so hard it creates voids.

---

### Issue 2: Stringy/Watery Instead of Round

**What you're seeing:**

> "more stringy / watery, instead of round circlish blobs, except for the smallest ones"

**Root Cause:**
Surface tension (adhesion) was too weak relative to other forces:

```
Low adhesion:              High adhesion:
    [wax]                     [wax]
      |                      [wax][wax]
    [wax]                   [wax][wax][wax]
      |                      [wax][wax]
    [wax]                     [wax]
  (stringy)                  (round)
```

With `adhesionJ = 1.5`, the system didn't penalize stretched/stringy shapes enough.

**v8.2 Fix:** Increased `adhesionJ: 1.5 → 2.0` (33% increase)

This makes surface area more "expensive" energetically, so blobs minimize surface area → rounder shapes.

**Also:** Decreased `noiseTemp: 1.0 → 0.9` for less random jitter (more stable shapes).

---

### Issue 3: Capacity Range Tuning

**Your excellent question:**

> "what if hot wax could only hold 4 and cold could hold 8?"

This is the **heart of thermal expansion tuning**. Let me explain the physics:

---

## Understanding Capacity Range

### The Formula

Each cell's capacity depends on temperature:

```javascript
capacity(T) = coldCapacity - (coldCapacity - hotCapacity) × T

// Examples:
T = 0.0 (cold):  capacity = 8 - (8 - 6) × 0.0 = 8
T = 0.5 (warm):  capacity = 8 - (8 - 6) × 0.5 = 7
T = 1.0 (hot):   capacity = 8 - (8 - 6) × 1.0 = 6
```

### The Expansion Pressure

When a cell heats from cold→hot:

```
Before:  units=8, capacity=8, deviation=0  → energy = 0
After:   units=8, capacity=6, deviation=+2 → energy = λ × 2² = 2λ
```

The energy increase drives units outward. **Larger capacity range = stronger push.**

---

## Capacity Range Scenarios

### Scenario A: Moderate (Current Default)

```
hotCapacity = 6
coldCapacity = 8
Range = 2 (25% expansion)
```

**Behavior:**

- Moderate expansion when heating
- Gentle contraction when cooling
- Balanced dynamics
- Good for smooth, controlled lava lamp

**When to use:** General purpose, visually pleasing

---

### Scenario B: Aggressive (Your Suggestion)

```
hotCapacity = 4
coldCapacity = 8
Range = 4 (50% expansion!)
```

**Behavior:**

- **Very strong** expansion when heating
- Hot blobs push out dramatically
- More explosive rise
- Can create more stringiness (need higher adhesion to compensate)
- More "violent" convection

**When to use:** Dramatic effect, faster dynamics, larger screen

**Tuning needed:** Increase `adhesionJ` to 2.5-3.0 to prevent over-stretching

---

### Scenario C: Gentle

```
hotCapacity = 7
coldCapacity = 8
Range = 1 (12.5% expansion)
```

**Behavior:**

- Subtle expansion
- Slower, more "viscous" feel
- More stable blobs
- Less likely to break apart
- Smoother convection

**When to use:** Calm aesthetic, small screen, performance concerns

---

### Scenario D: Extreme

```
hotCapacity = 3
coldCapacity = 9
Range = 6 (67% expansion!)
```

**Behavior:**

- Explosive expansion
- Hot blobs almost "explode" upward
- Very difficult to keep cohesive
- Requires `adhesionJ ≥ 3.5` and high `capacityLambda`
- Can create interesting chaotic dynamics

**When to use:** Experimental, artistic, chaotic aesthetic

---

## The Physics of Range Selection

### What Happens When Heating (Cold → Hot)

```
Example with range=2 (6→8):
Cell at T=0.2 with 8 units → capacity=7.6 → slightly over → minor push
Cell at T=0.5 with 8 units → capacity=7.0 → over by 1 → moderate push
Cell at T=0.8 with 8 units → capacity=6.4 → over by 1.6 → strong push
Cell at T=1.0 with 8 units → capacity=6.0 → over by 2 → maximum push

Energy = λ × (units - capacity)²
With λ=0.5:
  deviation=1  → energy = 0.5
  deviation=2  → energy = 2.0  (4x more!)
```

### With Larger Range (e.g., 4→8):

```
Cell at T=1.0 with 8 units → capacity=4.0 → over by 4 → HUGE push
Energy = 0.5 × 4² = 8.0  (16x more than range=2!)
```

**The expansion force scales with the SQUARE of the range!**

---

## Optimal Ranges for Different Goals

### Goal: Realistic Lava Lamp

```
hotCapacity = 6
coldCapacity = 8
adhesionJ = 2.0
capacityLambda = 0.5
```

**Why:** Moderate expansion, stable blobs, smooth convection

### Goal: Fast, Dramatic Action

```
hotCapacity = 4
coldCapacity = 8
adhesionJ = 2.5-3.0  (need higher to counter stretching)
capacityLambda = 0.6
```

**Why:** Strong expansion creates energetic dynamics

### Goal: Calm, Viscous Flow

```
hotCapacity = 7
coldCapacity = 8
adhesionJ = 1.5-2.0
capacityLambda = 0.4
```

**Why:** Gentle expansion, less chaotic

### Goal: Tiny Tight Blobs

```
hotCapacity = 6
coldCapacity = 8
adhesionJ = 3.0-4.0  (very high surface tension)
capacityLambda = 0.5
underfillLambda = 0.05  (strong contraction)
```

**Why:** High adhesion + strong underfill = tight spheres

---

## Parameter Interactions

The capacity range doesn't work in isolation. Here's how it interacts:

### Capacity Range ↔ Adhesion

```
Large range + Low adhesion = Stringy, breakup-prone
Large range + High adhesion = Dramatic but cohesive
Small range + Low adhesion = Watery, dissolves
Small range + High adhesion = Stable, rigid
```

**Rule of thumb:**  
`adhesionJ ≈ 1.0 + (range × 0.25)`

Examples:

- Range=2: adhesionJ ≈ 1.5
- Range=4: adhesionJ ≈ 2.0-2.5
- Range=6: adhesionJ ≈ 2.5-3.0

### Capacity Range ↔ Velocity Scale

```
Large range + High velScale = Chaotic (too many forces)
Large range + Low velScale = Expansion-dominated
Small range + High velScale = Advection-dominated
Small range + Low velScale = Sluggish
```

**Rule of thumb:**  
`velScale ≈ 1.0 / range`

Examples:

- Range=2: velScale ≈ 1.0
- Range=4: velScale ≈ 0.5-0.7
- Range=6: velScale ≈ 0.3-0.5

### Capacity Range ↔ Heat Rate

```
Large range + Fast heating = Explosive rise
Large range + Slow heating = Gradual expansion
Small range + Fast heating = Still moderate
```

**Balanced heating:**  
`heatRate ≈ 0.005` regardless of range  
(The capacity system handles the expansion intensity)

---

## The Void Artifact (Detailed)

### Why Voids Form

When `underfillLambda` is too high:

```
Step 1: Interior cell cools (capacity 6→8, has 6 units)
        Under-capacity = 2, high energy

Step 2: All 4 cardinal neighbors transfer inward simultaneously
        Center: 6 + 4 = 10 units (over max!)

Step 3: System corrects by blocking some transfers
        But momentum creates temporary void

Step 4: Void refills next tick
```

The void is an artifact of discrete transfer timing + aggressive underfill.

### The Fix (v8.2)

Two approaches combined:

1. **Gentler underfill:** `0.03 → 0.015`

   - Pull is still there but less frantic
   - Cells fill gradually not all-at-once

2. **Weight by fullness:**
   ```javascript
   const weight = (waxNeighbors - 4) / 4;
   // 5 neighbors: weight = 0.25
   // 6 neighbors: weight = 0.5
   // 8 neighbors: weight = 1.0
   ```
   - Cells deep in interior pull hardest
   - Cells near surface pull gently
   - Reduces coordination issues

---

## Recommended Starting Points

### If You Want More Expansion (Your Suggestion)

```javascript
// Try this configuration:
hotCapacity: 4,
coldCapacity: 8,
adhesionJ: 2.5,           // Increased to handle stretching
capacityLambda: 0.6,      // Slightly higher to push harder
underfillLambda: 0.02,    // Moderate pull
noiseTemp: 0.8,           // Less random (more stable)
velScale: 0.6,            // Reduced (let expansion dominate)
```

**Expected behavior:**

- Hot blobs expand dramatically
- Strong upward push
- More energetic convection
- Blobs stay cohesive (high adhesion)
- Faster dynamics

### If You Want Rounder, More Stable Blobs

```javascript
// Try this configuration:
hotCapacity: 6,
coldCapacity: 8,
adhesionJ: 3.0,           // Very high surface tension
capacityLambda: 0.5,
underfillLambda: 0.03,    // Stronger pull (tighter contraction)
noiseTemp: 0.7,           // Low noise (less jitter)
velScale: 1.0,
```

**Expected behavior:**

- Very round blobs
- Minimal stringiness
- Smooth surfaces
- Slow, graceful convection
- Classic lava lamp aesthetic

### If You Want Calm, Gentle Flow

```javascript
// Try this configuration:
hotCapacity: 7,
coldCapacity: 8,
adhesionJ: 2.0,
capacityLambda: 0.4,      // Gentle expansion
underfillLambda: 0.01,    // Weak pull
noiseTemp: 1.2,           // More stochastic (fluid feel)
velScale: 1.5,            // Higher (advection matters more)
```

**Expected behavior:**

- Subtle expansion/contraction
- More water-like flow
- Smooth blending
- Gentle convection
- Meditative aesthetic

---

## Experimental Ranges (Advanced)

### Ultra-Wide Range

```
hotCapacity: 2
coldCapacity: 10
Range = 8 (80% expansion!)
```

**What happens:**

- Hot cells desperately shed units (8 over capacity!)
- Creates "bursting" effect
- Very hard to keep cohesive
- Requires `adhesionJ ≥ 4.0`
- Can create interesting explosion-like dynamics

### Inverted Range (Don't Try This)

```
hotCapacity: 8
coldCapacity: 6
Range = -2 (inverted!)
```

**What happens:**

- Hot cells hold MORE than cold
- Physics breaks (cold wax expands, hot contracts)
- Blobs sink when hot, rise when cold
- Anti-lava-lamp
- Interesting for artistic/experimental purposes

### Zero Range

```
hotCapacity: 8
coldCapacity: 8
Range = 0 (no thermal expansion)
```

**What happens:**

- No capacity-driven movement
- Pure adhesion + velocity dynamics
- Becomes more like traditional phase-field LBM
- Loses the innovation's main feature
- Still cohesive but no thermal expansion

---

## The Mathematical Relationship

### Expansion Force vs Range

The "push" when over-capacity scales quadratically:

```
Energy = λ × (deviation)²

For cell at capacity before heating:
Range=1: deviation=1, E = 1λ
Range=2: deviation=2, E = 4λ   (4x more!)
Range=4: deviation=4, E = 16λ  (16x more!)
Range=8: deviation=8, E = 64λ  (64x more!)
```

**This is why large ranges are so dramatic.**

### Balancing Adhesion

Surface tension must scale roughly linearly with range:

```
adhesionJ ≈ baseline + k × range

Where:
  baseline ≈ 1.0 (minimum for any cohesion)
  k ≈ 0.25-0.35 (scaling factor)

Examples:
  range=2: adhesionJ ≈ 1.5-1.7
  range=4: adhesionJ ≈ 2.0-2.4
  range=8: adhesionJ ≈ 3.0-3.8
```

This keeps the ratio of expansion force to surface tension roughly constant.

---

## Testing Different Ranges

### Quick Test Protocol

1. **Start with defaults** (hot=6, cold=8)
2. **Note behavior** (expansion speed, blob roundness, stability)
3. **Adjust ONE parameter** (e.g., hot=4)
4. **Observe for 30+ seconds** (let convection establish)
5. **Tune adhesion** if needed (too stringy → increase)
6. **Iterate**

### What to Watch For

**Good signs:**

- ✅ Smooth blob surfaces
- ✅ Predictable expansion/contraction
- ✅ Cohesive during convection
- ✅ No flying specks
- ✅ Stable convection pattern

**Bad signs:**

- ❌ Stringy tails that don't retract
- ❌ Blobs dissolving into mist
- ❌ Particles flying off
- ❌ Voids appearing/disappearing
- ❌ Chaotic unpredictable motion

---

## Current v8.2 Defaults (Balanced)

```javascript
hotCapacity: 6,        // Moderate hot capacity
coldCapacity: 8,       // Moderate cold capacity
Range: 2,              // Moderate expansion (25%)

adhesionJ: 2.0,        // Increased for roundness
capacityLambda: 0.5,   // Moderate push strength
underfillLambda: 0.015,// Gentle pull (reduced from 0.03)
noiseTemp: 0.9,        // Reduced jitter (from 1.0)
velScale: 1.0,         // Standard advection
```

**This configuration aims for:**

- Smooth round blobs
- Stable convection
- No artifacts (voids, spray)
- Classic lava lamp aesthetic
- Good performance

---

## Conclusion

The capacity range (hot vs cold) is **the main tuning knob for thermal expansion intensity.**

- **Smaller range (1-2):** Gentle, stable, calm
- **Medium range (2-4):** Balanced, realistic lava lamp
- **Larger range (4-6):** Dramatic, energetic, fast
- **Extreme range (6+):** Chaotic, explosive, experimental

**But:** It must be balanced with `adhesionJ` to maintain cohesion.

**v8.2 recommendation:** Start with defaults (6/8, adhesionJ=2.0), then experiment!

The beauty of the local-capacity architecture is that **all of this is tunable in real-time** - no recompilation needed. Just adjust the sliders and watch the physics emerge!

---

## Files

- `lava-lamp-dplbm-hybrid-8.html` → Now v8.2 with tuned defaults
- `lava-lamp-v8-tuning-guide.md` → This comprehensive guide

**Status:** Optimized for round blobs, fewer artifacts, tunable capacity range  
**Next:** Experiment with different ranges to find your ideal aesthetic!
