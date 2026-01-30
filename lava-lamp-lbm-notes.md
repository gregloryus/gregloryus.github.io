# Lava Lamp LBM Simulation - Development Notes

## Project Goal

Create a realistic lava lamp simulation where behavior emerges from **local, fundamental physical rules** rather than global pattern detection or bandaid fixes. The user strongly prefers elegant, emergent systems over hacked solutions.

Key desired behaviors:
- Wax heats at bottom, becomes buoyant, rises as blobs
- Blobs pinch off naturally with realistic "neck snap-back"
- Blobs cool at top, sink back down
- Surface tension creates round blob shapes
- Mass conservation
- Continuous cycling behavior

---

## Technical Foundation: Lattice Boltzmann Method (LBM)

### Why LBM?
After trying various discrete/cellular automata approaches (v1-v22 in earlier files), we pivoted to LBM because it can produce **emergent surface tension** through the Shan-Chen pseudopotential method. This creates natural blob/droplet behavior without explicit surface detection.

### D2Q9 Lattice
- 9 velocity directions per cell (rest + 8 neighbors)
- Velocities: `cx = [0, 1, 0, -1, 0, 1, -1, -1, 1]`, `cy = [0, 0, -1, 0, 1, -1, -1, 1, 1]`
- Weights: `w = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36]`
- Each cell stores 9 distribution functions representing particle populations moving in each direction

### Core LBM Steps (per tick)
1. **Compute macroscopic quantities**: density ρ = Σf_k, momentum = Σf_k·c_k
2. **Compute forces**: Shan-Chen interaction, gravity, thermal buoyancy
3. **Collision**: BGK relaxation toward equilibrium + Guo forcing scheme
4. **Streaming**: Move distributions to neighbor cells, bounce-back at walls

### Key Parameters
- **TAU (τ)**: Relaxation time. Controls viscosity via ν = (τ - 0.5)/3
  - Higher TAU = MORE viscous (counterintuitive!)
  - TAU must be > 0.5 for stability
  - TAU near 0.5 = very low viscosity but unstable

---

## Shan-Chen Multi-Phase Method

### Single-Component (v1-v6)
Uses density difference to create phase separation:
- "Wax" = high density regions (ρ ≈ 2.0)
- "Medium" = low density regions (ρ ≈ 0.1)

**Pseudopotential**: `ψ(ρ) = ρ₀(1 - e^(-ρ/ρ₀))`

**Interaction force**: `F = -G·ψ(x)·Σ w_k·ψ(x+c_k)·c_k`
- G < 0 creates attraction between similar densities → surface tension
- Typical value: G = -5.0

**Limitation**: Phase separation relies on density difference. Cannot have two fluids with similar densities that remain separate.

### Two-Component (v7)
Separate distribution functions for each fluid:
- `f_A` (wax), `f_B` (water) - 9 distributions each per cell
- Separate densities: `ρ_A`, `ρ_B`
- Separate pseudopotentials: `ψ_A`, `ψ_B`

**Three interaction parameters**:
- `G_AA`: Wax-wax cohesion (negative = attract)
- `G_BB`: Water-water cohesion (negative = attract)
- `G_AB`: Cross-repulsion (positive = immiscible)

**Force on wax**: `F_A = -ψ_A × (G_AA × Σψ_A_neighbors + G_AB × Σψ_B_neighbors)`

This allows wax and water to have similar densities (1.1 vs 1.0) while remaining immiscible via G_AB repulsion - matching real lava lamp physics where immiscibility comes from chemistry (polar vs nonpolar), not density.

---

## Thermal Buoyancy: The Right Approach

### What DOESN'T Work (v3 failure)
Modifying "effective density" for Shan-Chen based on temperature:
```javascript
// BAD - causes instability
const thermalFactor = 1 - THERMAL_EXPANSION * (t - NEUTRAL_TEMP);
const rhoEffective = r * thermalFactor;
psi[i] = computePsi(rhoEffective);
```
This creates asymmetric forces at hot/cold interfaces → NaN explosion, 45-degree artifacts.

### What DOES Work (v2, v5, v6, v7)
Direct thermal buoyancy force:
```javascript
// GOOD - physically correct derivation
const tempDiff = t - NEUTRAL_TEMP;
const thermalForce = -THERMAL_BUOYANCY * rho * tempDiff;
Fy += thermalForce;
```

**Why this is correct**: In a fixed-volume grid, we can't actually change cell volume (thermal expansion). The Boussinesq approximation treats density as constant except in the buoyancy term, where it appears as a body force. This IS the proper physics, not a hack.

---

## Version History

### v1 (lava-lamp-lbm-1.html)
- Initial D2Q9 + single-component Shan-Chen
- Weak thermal buoyancy
- Result: "Breathing" behavior, reaches equilibrium without real convection

### v2 (lava-lamp-lbm-2.html)
- **First major success!**
- Proper thermal buoyancy with direct force
- Blob rises, pinches off, neck snaps back realistically
- User: "Almost perfect... massive step change"

### v3 (lava-lamp-lbm-3.html)
- Attempted "more physical" temperature-modified effective density
- **Failed catastrophically**: NaN explosion, 45-degree artifacts, perfect mirror symmetry
- Lesson: Don't modify Shan-Chen density based on temperature

### v4 (lava-lamp-lbm-4.html)
- v2 + noise for symmetry breaking
- Added NOISE_AMPLITUDE to psi calculation

### v5 (lava-lamp-lbm-5.html)
- Full parameter UI exposed
- All magic numbers made configurable
- Heat/cool zones with vertical and horizontal falloff parameters
- Speed options: 1x, 10x, 100x

### v6 (lava-lamp-lbm-6.html)
- **Temperature-dependent viscosity**
- TAU_COLD (high, viscous) → TAU_HOT (low, runny)
- Interpolate based on local temperature
- Important: Higher TAU = MORE viscous (not less!)

### v7 (lava-lamp-lbm-7.html)
- **Two-component Shan-Chen**
- Separate wax and water fluids
- Cross-repulsion (G_AB) for immiscibility
- Similar densities possible (1.1 vs 1.0)
- More physically realistic but requires careful parameter tuning

---

## Current State (v7)

### Working
- Two-component phase separation
- Thermal buoyancy driving convection
- Temperature-dependent viscosity
- Mass conservation (both fluids tracked separately)
- Stability achieved after parameter tuning

### Current Default Parameters
```
G_AA: -3.0 (wax cohesion)
G_BB: -2.0 (water cohesion)
G_AB: 3.0 (cross-repulsion)
Wax density: 1.1
Water density: 1.0
TauWaxCold: 1.2
TauWaxHot: 0.8
TauWater: 1.0
Buoyancy: 0.005
Gravity: 0.0004
Heat rate: 0.015
Cool rate: 0.005
```

### Known Issues / Observations
1. **"Breathing" effect** at initialization - normal Shan-Chen interface equilibration, should dampen
2. **Slow blob formation** - may need stronger buoyancy/heating
3. **Blob hovering** instead of cycling - may need stronger gravity/cooling
4. **Some teleporting artifacts** - possibly from stability checks skipping cells

---

## Key Lessons Learned

### Physics
1. In fixed-volume grids, thermal buoyancy as a direct body force IS the correct physics (Boussinesq approximation)
2. Real lava lamp immiscibility comes from chemistry (polar/nonpolar), not density difference
3. Two-component Shan-Chen properly separates density from immiscibility

### LBM Specifics
1. TAU > 0.5 required for stability; higher TAU = MORE viscous
2. Shan-Chen has narrow stability windows for G parameters
3. Don't clamp densities in ways that add mass
4. Sharp initial interfaces cause oscillations; use smooth tanh transitions
5. Velocity magnitude checks can prevent NaN but may cause artifacts

### Parameter Tuning
1. G parameters are interconnected - change one, may need to adjust others
2. Thermal forces must overcome surface tension to create motion
3. Two-component is more complex but more physically accurate
4. Single-component v5/v6 may be "good enough" for visual results

---

## Files Reference

- `lava-lamp-lbm-1.html` - Initial LBM attempt
- `lava-lamp-lbm-2.html` - First working version (single-component)
- `lava-lamp-lbm-3.html` - Failed temperature-density experiment
- `lava-lamp-lbm-4.html` - v2 + symmetry-breaking noise
- `lava-lamp-lbm-5.html` - Full parameter UI, single-component
- `lava-lamp-lbm-6.html` - Temperature-dependent viscosity
- `lava-lamp-lbm-7.html` - Two-component Shan-Chen (current)

---

## Next Steps to Consider

1. **Parameter tuning** for v7 to achieve better cycling behavior
2. **Compare v6 vs v7** - is two-component worth the complexity?
3. **WebGL acceleration** if performance becomes an issue
4. **Visual polish** - rendering improvements, color schemes
5. **Initial conditions** - different wax arrangements, multiple blobs

---

## User Preferences (Important!)

- Prefers **emergent behavior from local rules** over global pattern detection
- Wants **fundamental physics** simulated, not bandaid fixes
- Values **elegant, minimal solutions**
- Appreciates understanding **why** something works, not just that it works
- Comfortable with complexity if it's the "right" approach

---

## Session 2 Updates (v8-v12)

### v8 (lava-lamp-lbm-8.html)
- **Sigmoid-based viscosity transition** instead of linear interpolation
  - Creates distinct solid/liquid phases with sharp transition at `TransT`
  - `softness = sigmoid(SHARPNESS * (t - TRANSITION_TEMP))`
  - `tauA = TAU_COLD * (1 - softness) + TAU_HOT * softness`
- **Temperature-dependent cohesion** for merge behavior
  - `effectiveG_AA = G_AA * (1 - TEMP_COHESION * temperature)`
  - Hot blobs have weaker cohesion → merge easier
  - Cold blobs maintain cohesion → bounce off each other
- **Velocity clamping** instead of skipping collision (preserves mass better)
- **Discrete heat spots** instead of uniform band (later reverted)
- **Stabilization period** with high viscosity (later removed as too artificial)

### v9 (lava-lamp-lbm-9.html)
- **Threshold-based buoyancy** - KEY INSIGHT from user's "gum in soda" analogy:
  - Real physics: bubbles accumulate gradually, but lift is SUDDEN when threshold crossed
  - Implementation: `buoyancyGate = sigmoid(BUOY_SHARPNESS * (temp - BUOY_THRESHOLD))`
  - Below threshold: wax sits, heating, no movement
  - Above threshold: strong lift kicks in abruptly
- **Removed render threshold** - was causing "teleporting" visual artifacts
  - Old: `if (rho_A > 0.15)` - arbitrary cutoff made low-density wax invisible
  - New: Show all wax densities with alpha proportional to density
- Back to centralized heating (like v1/v2 that worked)
- Parameters closer to working lbm-1 values

### v10 (lava-lamp-lbm-10.html)
Focused on fixing stability issues identified in screenshots:

**45-Degree Lattice Artifacts**
- Cause: τ values too close to instability boundary (0.5)
- Cause: Per-frame noise on pseudopotential amplified lattice modes
- Fix: Raised minimum τ to 0.9+ (`TAU_WAX_HOT: 0.9`, `TAU_WATER: 1.0`)
- Fix: Removed per-frame noise, only add noise at initialization

**Wax "Disappearing" (while mass conserved)**
- Cause: Two-component Shan-Chen allows partial mixing at interfaces
- Cause: G_AB = 3.0 wasn't strong enough for sharp phase boundaries
- Fix: Increased G_AB to 5.0 for stronger immiscibility
- Added interface sharpening (later removed as it caused dithering)

### v11 (lava-lamp-lbm-11.html) - CURRENT BEST VERSION
Comprehensive audit revealed critical bugs:

**CRITICAL BUG FIXED: Ambient Cooling**
```javascript
// OLD (v10) - This was killing blobs mid-rise!
if (rA > 0.05 && rho_B[i] > 0.2) {
    t -= COOL_RATE * 0.5;  // Cooled wax ANYWHERE in water
}
// Result: Blob loses ~0.5 temp rising through water, drops below buoyancy threshold

// NEW (v11) - Only cool in designated top zone
// Removed ambient cooling entirely
```
This was the main reason blobs only reached 50% height.

**Interface Sharpening Removed**
- Was causing dithering/checkerboard artifacts at mid-height
- The 0.4-0.6 "dead zone" created unstable flip-flopping between phases

**Color Rendering Fixed**
```javascript
// OLD (broken premultiplication)
data[pi] = r * alpha;  // Darkens colors incorrectly

// NEW (proper alpha blending)
const waxAlpha = min(1, rhoA / RHO_WAX);
r = background * (1 - waxAlpha) + waxColor * waxAlpha;
```

**Performance Optimizations**
- Pre-allocated ALL arrays (force arrays, newTemp) - no per-frame allocations
- Reusable temp canvas for rendering
- Inlined calculations (`i9 = i * 9`, `invTau = 1/tau`)
- Pre-allocated neighbor offset arrays

**Parameter Adjustments for Full-Height Travel**
```
Buoy: 0.008 → 0.012 (stronger lift)
BuoyT: 0.55 → 0.5 (lower threshold)
CoolY: 0.2 → 0.25 (larger top cooling zone)
Cool: 0.002 → 0.004 (faster cooling at top)
```

### v12 - NOT IMPLEMENTED
- Attempted WebGL but failed/incomplete - file deleted
- Full GPU LBM is complex due to:
  - 18 distribution values per cell (9 per fluid)
  - Streaming requires reading from 9 neighbor locations
  - WebGL 1 can only write to one texture at a time
  - Would need 6+ render passes per tick with ping-pong buffers
- **v11 remains the current best version**

---

## Critical Bugs Identified

### 1. Ambient Cooling (v10 and earlier)
**Symptom**: Blobs only rise to ~50% height, never reach top
**Cause**: Wax cooled whenever surrounded by water (always true when rising)
**Fix**: Remove ambient cooling, only cool in designated top zone

### 2. Per-Frame Noise on Psi
**Symptom**: 45-degree diagonal striations in water region
**Cause**: Random noise every frame amplifies lattice-aligned numerical modes
**Fix**: Add noise only at initialization for symmetry breaking

### 3. Low τ Values
**Symptom**: Lattice artifacts, numerical instability
**Cause**: τ < 0.9 approaches instability boundary
**Fix**: Minimum τ should be ~0.9 for stable simulation

### 4. Interface Sharpening
**Symptom**: Dithering/checkerboard patterns at wax/water interface
**Cause**: Threshold-based mass transfer creates oscillating states
**Fix**: Remove interface sharpening, rely on stronger G_AB instead

### 5. Render Threshold
**Symptom**: Wax appears to "teleport" or appear/disappear non-locally
**Cause**: Arbitrary density cutoff (e.g., rho > 0.15) hides low-density regions
**Fix**: Render all densities with alpha proportional to density

---

## Key Insights from Session 2

### The "Gum in Soda" Principle
User's brilliant analogy for threshold behavior:
- Gum sinks to bottom
- Bubbles accumulate gradually (like temperature rising)
- At critical point, buoyancy overcomes gravity ABRUPTLY
- Gum rises quickly (not proportionally with each bubble)
- Bubbles pop at top, gum sinks quickly

**Implementation**: Sigmoid-gated buoyancy instead of linear:
```javascript
const buoyancyGate = sigmoid(BUOY_SHARPNESS * (temp - BUOY_THRESHOLD));
const liftForce = BUOY * rhoA * buoyancyGate * (1 + excessTemp * 3);
```

### "Breathing" Oscillation Explained
The expand/contract visual behavior at initialization is normal Shan-Chen:
1. Initial interface isn't at mechanical equilibrium
2. Shan-Chen forces create pressure differences
3. Interface oscillates seeking equilibrium
4. High viscosity (τ) helps dampen faster
5. Visual area changes because render threshold crosses density values

### Why Two-Component?
Single-component (v1-v6) uses density for phase separation:
- Wax = high density (~2.0), Medium = low density (~0.1)
- Problem: Can't have similar densities remain separate

Two-component allows:
- Similar densities (wax 1.2, water 1.0)
- Immiscibility from G_AB repulsion, not density
- More physically accurate (real lava lamp wax/water are chemically immiscible)

---

## Recommended Parameters (v11)

```javascript
// Shan-Chen
G_AA: -5.0      // Wax cohesion (negative = attract)
G_AB: 5.0       // Cross-repulsion (positive = immiscible)
G_BB: 0         // Water doesn't need self-cohesion

// Density
RHO_WAX: 1.2
RHO_WATER: 1.0
WAX_HEIGHT_FRAC: 0.15

// Viscosity (CRITICAL: keep τ > 0.9)
TAU_WAX_COLD: 1.4   // High viscosity when cold (solid-like)
TAU_WAX_HOT: 0.9    // Lower viscosity when hot (but still stable!)
TAU_WATER: 1.0
TRANSITION_TEMP: 0.5
SHARPNESS: 15       // Sigmoid steepness for phase transition

// Forces
BUOYANCY: 0.012     // Thermal lift strength
GRAVITY: 0.0003     // Constant downward pull
BUOY_THRESHOLD: 0.5 // Temperature where buoyancy activates
BUOY_SHARPNESS: 20  // How abrupt the buoyancy activation is

// Temperature
HEAT_RATE: 0.005
COOL_RATE: 0.004
TEMP_DIFFUSION: 0.02
INIT_WAX_TEMP: 0.2
INIT_WATER_TEMP: 0.35

// Zones
HEAT_ZONE_START: 0.85  // Bottom 15% heats
COOL_ZONE_END: 0.25    // Top 25% cools
```

---

## Files Reference (Updated)

- `lava-lamp-lbm-1.html` - Initial LBM attempt
- `lava-lamp-lbm-2.html` - First working version (single-component)
- `lava-lamp-lbm-3.html` - Failed temperature-density experiment
- `lava-lamp-lbm-4.html` - v2 + symmetry-breaking noise
- `lava-lamp-lbm-5.html` - Full parameter UI, single-component
- `lava-lamp-lbm-6.html` - Temperature-dependent viscosity
- `lava-lamp-lbm-7.html` - Two-component Shan-Chen
- `lava-lamp-lbm-8.html` - Sigmoid viscosity, temp-dependent cohesion
- `lava-lamp-lbm-9.html` - Threshold buoyancy, removed render cutoff
- `lava-lamp-lbm-10.html` - Stability fixes (higher τ, stronger G_AB)
- `lava-lamp-lbm-11.html` - **CURRENT BEST** - Bug fixes, optimizations

---

## WebGL Implementation Notes

For a future WebGL/WebGPU implementation:

### Data Requirements
- 18 distribution values per cell (9 for wax, 9 for water)
- Plus: temperature, density (can be computed)
- Texture packing options:
  - 3 RGBA textures per fluid (f0-3, f4-7, f8+extras)
  - Or 5 RGBA textures total with careful packing

### Challenges
1. **Multiple render passes**: WebGL 1 writes to one texture at a time
2. **Ping-pong buffers**: Need read/write separation for streaming
3. **Neighbor access**: Streaming pulls from 9 different locations
4. **Boundary conditions**: Bounce-back requires opposite direction lookup

### Recommended Approach
1. **WebGL 2 with MRT** (Multiple Render Targets) - write multiple textures per pass
2. **Or WebGPU compute shaders** - more natural for this workload
3. **Texture layout**: Pack f_A and f_B into 6 RGBA float textures
4. **Passes**:
   - Pass 1: Collision (all cells, writes new f values)
   - Pass 2: Streaming (gather from neighbors)
   - Pass 3: Temperature update
   - Pass 4: Render

### Performance Expectation
- CPU version handles ~30k cells (166x175) adequately
- GPU would shine at 250k+ cells (500x500)
- Main benefit: parallel computation of all cells simultaneously

---

## Obvious Improvements to Consider

1. **Temperature should conduct through water too** (currently only through wax)
   - Rising blobs should cool from surrounding water, not just top zone
   - But make it much slower than wax-to-wax conduction

2. **Cohesion reduction could be stronger**
   - Currently `1 - 0.4 * sigmoid(...)` → max 40% reduction
   - Hot wax might need weaker cohesion to pinch off easier

3. **Consider asymmetric buoyancy**
   - Real lava lamps: wax slightly denser than water when cold
   - Rising is thermal buoyancy overcoming slight negative buoyancy
   - Could add `BASE_DENSITY_DIFF` term

4. **Multiple initial blobs or perturbations**
   - Current flat interface takes time to develop instabilities
   - Could initialize with slight bumps or pre-formed blob shapes

5. **Heat source should have slight randomness**
   - Real heaters aren't perfectly uniform
   - Could help break symmetry for more natural blob formation
