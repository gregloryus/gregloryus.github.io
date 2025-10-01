# rgbfields-7.js: Hybrid Implementation Plan (Revised)

## Overview
Modify rgbfields-6.js to add divisible water (0-4 units) with gradient-based momentum and heat-dependent movement. This plan includes critical conservation fixes and performance optimizations for scaling to 10k×10k.

## Why Scan Order Matters

**The double-move problem:** Without careful ordering, water can move multiple cells in one tick.

Example:
```
Start: [W=2][W=0][W=0]
Naive left→right scan:
  1. Cell 0 moves to cell 1: [W=1][W=1][W=0]
  2. Cell 1 (now has water!) moves to cell 2: [W=1][W=0][W=1]
Result: Water traveled 2 cells in 1 tick!
```

**Solution:** Double buffering (read from src, write to dst) prevents this. With double buffering, we can use deterministic **serpentine scan** (left→right on even rows, right→left on odd rows, flipped each tick) instead of expensive random shuffles.

---

## Core Design Decisions

✅ Water transfers to water (allows gradients, merging, equalization)  
✅ **Two-pass capacity arbitration** (guarantees conservation)  
✅ Serpentine + parity scan (fast, unbiased, no shuffle)  
✅ Double buffering (read src, write dst)  
✅ Gradient-based momentum (uses integer indices, no object allocation)  
✅ Simple heat advection (probabilistic single-unit carry)  
✅ **One transfer per cell per tick** (not per water unit)  

---

## Change 1: Divisible Water Field (0-4 units)

### Data Structures
```javascript
// Replace binary B0/B1 with divisible W0/W1
let W0 = new Uint8Array(N);  // Water levels 0-4
let W1 = new Uint8Array(N);

const MAX_W = 4;
const MAX_R = 8; // Heat capacity (already exists)

// Exact integer rendering (no float rounding)
const WATER_TO_BYTE = new Uint8Array([0, 63, 127, 191, 255]);

// Persistent flux tracking arrays (allocated once, reused each tick)
const waterOut = new Uint8Array(N);  // Levels leaving
const waterIn = new Uint8Array(N);   // Levels entering
const heatOut = new Uint8Array(N);   // Heat advection out
const heatIn = new Uint8Array(N);    // Heat advection in

// Two-pass arbitration arrays (for conservation)
const choice = new Int32Array(N);    // Target chosen by each source (-1 = none)
const wantIn = new Uint8Array(N);    // Demand count per target
const accepted = new Uint8Array(N);  // Accepted transfers per target
const cap = new Uint8Array(N);       // Available capacity per cell
```

### Transfer Rule
```javascript
function canTransferWater(source, target) {
  if (target >= MAX_W) return false; // Target full
  const diff = source - target;
  return (diff >= 2) || (source >= 3 && diff >= 1);
}
```

**Behavior:**
- `1 → 0`: NO (surface tension - single droplet sticks)
- `2 → 0`: YES (diff=2, starts flowing)
- `2 → 1`: NO (diff=1 too small)
- `3 → 1`: YES (source≥3 and diff≥1)
- `4 → 2`: YES (large pools equalize)

### Rendering Changes
```javascript
// In updateTextures(), replace:
// rgbaRB[j + 2] = blue[i] ? 255 : 0;
// With:
rgbaRB[j + 2] = WATER_TO_BYTE[W0[i]];

// Same for rgbaB panel
rgbaB[j + 2] = WATER_TO_BYTE[W0[i]];
```

### Initialization
```javascript
// Replace: for (const bi of blueChosen) B0[bi] = 1;
// With:
for (const bi of blueChosen) W0[bi] = 2; // Start with 2 units for visibility
```

---

## Change 2: Heat-Graded Direction Schedules

### Direction Offset Constants
```javascript
// Add near top of file, after COLS/ROWS defined
const OFF = {
  D: COLS,       // Down
  U: -COLS,      // Up
  L: -1,         // Left
  R: 1,          // Right
  DL: COLS - 1,  // Down-left
  DR: COLS + 1,  // Down-right
  UL: -COLS - 1, // Up-left
  UR: -COLS + 1  // Up-right
};
```

### Schedule Builder Function
**IMPORTANT: Returns integer indices, not {x,y} objects**

```javascript
function buildDirections(x, y, heat, W_src) {
  // Returns list of neighbor INDICES (integers) to try, in order
  // No object allocation - uses flat integer indices for performance
  const dirs = [];
  
  // Helper: get valid neighbor index (returns -1 if out of bounds)
  function idx(dx, dy) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return -1;
    return ny * COLS + nx;
  }
  
  // Helper: prefer emptier target (gradient bias)
  // Returns [a, b] ordered by water amount (lower first)
  function orderPair(a, b) {
    if (a < 0 || b < 0) return [a, b];
    const Wa = W_src[a] || 0, Wb = W_src[b] || 0;
    if (Wa < Wb) return [a, b];      // a is emptier → try first
    if (Wb < Wa) return [b, a];      // b is emptier → try first
    return rand() < 0.5 ? [a, b] : [b, a]; // Equal → random
  }
  
  // Heat-graded schedule (builds list of up to ~8 indices)
  switch(heat) {
    case 0:
      dirs.push(idx(0, 1)); // Down only
      break;
      
    case 1:
      dirs.push(idx(0, 1)); // Down
      if (rand() < 0.5) { // 50% chance diagonal
        const [dl, dr] = orderPair(idx(-1, 1), idx(1, 1));
        dirs.push(dl, dr);
      }
      break;
      
    case 2:
      dirs.push(idx(0, 1)); // Down
      const [dl2, dr2] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl2, dr2);
      break;
      
    case 3:
      dirs.push(idx(0, 1));
      const [dl3, dr3] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl3, dr3);
      if (rand() < 0.5) { // 50% chance lateral
        const [l3, r3] = orderPair(idx(-1, 0), idx(1, 0));
        dirs.push(l3, r3);
      }
      break;
      
    case 4:
      dirs.push(idx(0, 1));
      const [dl4, dr4] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl4, dr4);
      const [l4, r4] = orderPair(idx(-1, 0), idx(1, 0));
      dirs.push(l4, r4);
      break;
      
    case 5:
      dirs.push(idx(0, 1));
      const [dl5, dr5] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl5, dr5);
      const [l5, r5] = orderPair(idx(-1, 0), idx(1, 0));
      dirs.push(l5, r5);
      if (rand() < 0.5) { // 50% chance up-diagonal
        const [ul5, ur5] = orderPair(idx(-1, -1), idx(1, -1));
        dirs.push(ul5, ur5);
      }
      break;
      
    case 6:
      dirs.push(idx(0, 1));
      const [dl6, dr6] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl6, dr6);
      const [l6, r6] = orderPair(idx(-1, 0), idx(1, 0));
      dirs.push(l6, r6);
      const [ul6, ur6] = orderPair(idx(-1, -1), idx(1, -1));
      dirs.push(ul6, ur6);
      break;
      
    case 7:
      dirs.push(idx(0, 1));
      const [dl7, dr7] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl7, dr7);
      const [l7, r7] = orderPair(idx(-1, 0), idx(1, 0));
      dirs.push(l7, r7);
      const [ul7, ur7] = orderPair(idx(-1, -1), idx(1, -1));
      dirs.push(ul7, ur7);
      dirs.push(idx(0, -1)); // Up
      break;
      
    default: // heat >= 8 (reverse order - rises!)
      dirs.push(idx(0, -1)); // Up first
      const [ul8, ur8] = orderPair(idx(-1, -1), idx(1, -1));
      dirs.push(ul8, ur8);
      const [l8, r8] = orderPair(idx(-1, 0), idx(1, 0));
      dirs.push(l8, r8);
      const [dl8, dr8] = orderPair(idx(-1, 1), idx(1, 1));
      dirs.push(dl8, dr8);
      dirs.push(idx(0, 1)); // Down last
      break;
  }
  
  // Cap to 5 candidates max (optimization for U=8 case)
  if (dirs.length > 5) dirs.length = 5;
  
  return dirs.filter(i => i >= 0); // Remove invalid (-1) neighbors
}
```

---

## Change 3: Water Flow with Two-Pass Conservation

**CRITICAL: This guarantees conservation when multiple sources target the same cell**

### Helper Function for Heat Advection Probability
```javascript
function pCarry(u) {
  // Heat-dependent carry probability (5-40%)
  return Math.min(0.4, 0.05 + 0.04 * u);
}
```

### Main Water Flow Function

**Replace entire `flowBlue()` function with:**

```javascript
function flowWater(W_src, W_dst, U /*heat field*/, tickCount) {
  W_dst.set(W_src);
  
  // Reset all flux arrays
  waterOut.fill(0);
  waterIn.fill(0);
  heatOut.fill(0);
  heatIn.fill(0);
  choice.fill(-1);
  wantIn.fill(0);
  accepted.fill(0);
  
  // Calculate capacity for each cell
  for (let i = 0; i < N; i++) {
    cap[i] = MAX_W - W_src[i];
  }
  
  // Serpentine scan pattern
  const flip = (tickCount & 1) !== 0;
  
  // ===== PASS 1: Each source chooses one target =====
  for (let y = 0; y < ROWS; y++) {
    const leftToRight = ((y & 1) === 0) ^ flip;
    const xStart = leftToRight ? 0 : COLS - 1;
    const xEnd = leftToRight ? COLS : -1;
    const xStep = leftToRight ? 1 : -1;
    
    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = y * COLS + x;
      const w = W_src[i];
      if (w === 0) continue; // No water here
      
      // Quick capacity precheck (optimization)
      // If all neighbors are full, skip candidate building
      let hasCapacity = false;
      const neighbors = [
        i + OFF.D, i + OFF.U, i + OFF.L, i + OFF.R,
        i + OFF.DL, i + OFF.DR, i + OFF.UL, i + OFF.UR
      ];
      for (let k = 0; k < neighbors.length; k++) {
        const n = neighbors[k];
        if (n >= 0 && n < N && W_src[n] < MAX_W) {
          hasCapacity = true;
          break;
        }
      }
      if (!hasCapacity) continue;
      
      const heat = U[i];
      const dirs = buildDirections(x, y, heat, W_src);
      
      // Try each direction until we find an acceptable target
      for (let k = 0; k < dirs.length; k++) {
        const j = dirs[k];
        if (j < 0) continue; // Invalid neighbor
        
        const targetW = W_src[j];
        if (canTransferWater(w, targetW)) {
          choice[i] = j;     // Record choice
          wantIn[j]++;       // Tally demand
          break;             // Only one choice per source
        }
      }
    }
  }
  
  // ===== PASS 2: Accept transfers up to capacity =====
  // Use same serpentine pattern for deterministic fairness
  for (let y = 0; y < ROWS; y++) {
    const leftToRight = ((y & 1) === 0) ^ flip;
    const xStart = leftToRight ? 0 : COLS - 1;
    const xEnd = leftToRight ? COLS : -1;
    const xStep = leftToRight ? 1 : -1;
    
    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = y * COLS + x;
      const j = choice[i];
      if (j < 0) continue; // No choice made
      
      // Accept if target has capacity
      if (accepted[j] < cap[j]) {
        accepted[j]++;
        waterOut[i] = 1;
        waterIn[j] = 1;
        
        // Stage heat advection (only for accepted moves)
        if (U[i] > 0 && U[j] < MAX_R && rand() < pCarry(U[i])) {
          heatOut[i] = 1;
          heatIn[j] = 1;
        }
      }
      // else: rejected, source keeps its water
    }
  }
  
  // ===== APPLY: Guaranteed conservation =====
  for (let i = 0; i < N; i++) {
    // Water transfer (no clamping needed - exact by construction)
    W_dst[i] = W_src[i] - waterOut[i] + waterIn[i];
    
    // Heat advection (needs clamping for capacity)
    U[i] = Math.max(0, Math.min(MAX_R, U[i] - heatOut[i] + heatIn[i]));
  }
}
```

---

## Change 4: Main Tick Update

```javascript
function advanceTick() {
  // 1) Water movement (replaces flowBlue call)
  flowWater(W0, W1, U0, ticks);
  [W0, W1] = [W1, W0];
  
  // 2) Heat diffusion (unchanged from v6, but pass W0 instead of B0)
  diffuseRed(U0, U1, W0);
  [U0, U1] = [U1, U0];
  
  // 3) Render (pass W0 instead of B0)
  updateTextures(U0, W0);
  
  ticks++;
}
```

---

## Optional Enhancement: Vertical Red Skew

**For thermoclines without water movement** (add after heat diffusion):

```javascript
// Optional: slight upward heat bias inside water (creates thermoclines)
const ENABLE_VERTICAL_RED_SKEW = false; // Toggle on to experiment
const VERTICAL_SKEW_PROB = 0.02; // 2% chance per tick

if (ENABLE_VERTICAL_RED_SKEW) {
  for (let y = 1; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      const above = (y - 1) * COLS + x;
      
      // If both cells have water and this one is hotter
      if (W0[i] > 0 && W0[above] > 0 && U0[i] > U0[above] + 1) {
        if (rand() < VERTICAL_SKEW_PROB) {
          // Move one heat unit upward
          if (U0[above] < MAX_R) {
            U0[i]--;
            U0[above]++;
          }
        }
      }
    }
  }
}
```

**Effect:** Creates stable temperature layers in still water without requiring water movement. Hot water "floats" heat upward over time.

---

## Critical Bug Fixes Summary

### 1. Conservation Bug (CRITICAL)
**Problem:** Multiple sources targeting same cell → overbook → clamp → water loss  
**Solution:** Two-pass arbitration accepts only up to capacity, rejects excess

### 2. Memory Allocation (PERFORMANCE)
**Problem:** Creating new Uint8Arrays each tick → GC thrashing  
**Solution:** Persistent arrays, reset with `.fill(0)` each tick

### 3. Unbounded Candidates (PERFORMANCE)
**Problem:** U=8 can generate 8+ directions → excessive work  
**Solution:** Cap to 5 candidates max

### 4. Inconsistent Randomness (CORRECTNESS)
**Problem:** Mixing rand() and Math.random() → unpredictable behavior  
**Solution:** Use fast LCG rand() everywhere

---

## Testing Checklist

### Conservation Tests (CRITICAL)
```javascript
// Test 1: Overbooking
// Setup: [W=4][W=3][W=4] with both sides trying to move to center
// Expected: Total water unchanged (11 → 11)

// Test 2: Plateau
// Setup: Large W=4 slab, verify total never changes
// Expected: Water redistributes but total constant
```

### Visual Tests
1. **Shading:** Water appears in 5 distinct shades (0, 63, 127, 191, 255)
2. **Droplets:** W=1 droplets stick until merging
3. **Gradient flow:** [4][3][2][1][0] flows right maintaining shape
4. **Convection:** Heat from below creates rising plumes

### Performance Tests
- 64×64: 60fps+
- 256×256: 60fps
- 1024×1024: 30-60fps
- Test with/without heat advection to verify impact

---

## Expected Emergent Behavior

**Thermal plumes:** Hot water (R≥7) creates rising columns

**Convection cells:** Circular flow in confined spaces (hot rises, cold sinks)

**Surface waves:** Gradient momentum creates oscillating flow

**Droplet coalescence:** W=1 + W=1 → W=2 which then flows

**Stratification:** Natural temperature layers (hot top, cold bottom)

**Fingering instability:** Hot water rising through cold creates fingers

**Thermoclines (with vertical skew):** Stable temperature layers in still water

---

## Performance Characteristics

**Time complexity:** O(N) per tick
- Pass 1: O(N) scan
- Pass 2: O(N) scan  
- Heat diffusion: O(N) scan
- Total: 3×O(N) = O(N)

**Space complexity:** O(N)
- 2×N for W0/W1 (water double buffer)
- 2×N for U0/U1 (heat double buffer)
- 8×N for flux arrays (persistent, reused)
- Total: 12×N bytes = 1.2GB for 10k×10k

**Cache efficiency:**
- Serpentine maintains spatial locality
- No pointer chasing or indirection
- All arrays are flat, sequential

---

## Implementation Checklist

1. ✅ Add MAX_W, WATER_TO_BYTE constants
2. ✅ Add OFF direction constants  
3. ✅ Replace B0/B1 with W0/W1
4. ✅ Add persistent flux arrays (waterOut/In, heatOut/In, choice, wantIn, accepted, cap)
5. ✅ Add canTransferWater function
6. ✅ Add buildDirections function (returns indices, not objects)
7. ✅ Add pCarry function
8. ✅ Replace flowBlue with two-pass flowWater
9. ✅ Update advanceTick to call flowWater
10. ✅ Update updateTextures to use W0 instead of B0
11. ✅ Update initialization to seed W0 instead of B0
12. ✅ Verify all randomness uses rand() not Math.random()
13. ✅ Optional: add vertical red skew

---

## Edge Cases to Test

1. **Overbooking:** Nearly full cell (W=3) with 4 neighbors trying to send
2. **Double-move:** Verify serpentine prevents two-cell travel per tick
3. **Empty plateau:** Flat W=4 slab with no capacity anywhere
4. **Hot chimney:** Narrow vertical void above hot patch
5. **Advection toggle:** Verify turning advection on/off doesn't break conservation
6. **Boundary conditions:** Edge/corner cells behave correctly

---

## Tuning Parameters

**Surface tension:**
```javascript
// More sticky (higher threshold)
return (diff >= 3) || (source >= 4 && diff >= 2);

// More fluid (lower threshold)  
return (diff >= 1);
```

**Convection strength:**
```javascript
// Stronger coupling (higher pCarry)
return Math.min(0.6, 0.1 + 0.06 * u);

// Weaker coupling (lower pCarry)
return Math.min(0.2, 0.02 + 0.02 * u);
```

**Visual contrast:**
```javascript
// High contrast
const WATER_TO_BYTE = new Uint8Array([0, 85, 127, 191, 255]);

// Low contrast
const WATER_TO_BYTE = new Uint8Array([0, 51, 102, 153, 204]);
```
