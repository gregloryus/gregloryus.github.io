# Design Document: LBM-CPM Hybrid Lava Lamp (v2)

**Project:** Discrete Lava Lamp Simulation
**Date:** January 31, 2026
**Status:** Working Prototype
**File:** `lava-lamp-dplbm-hybrid-2.html`
**Previous Attempts:** `lava-lamp-dplbm-cohesion.html`, `lava-lamp-dplbm-twophase.html`, `lava-lamp-dplbm-hybrid.html`

---

## 1. Executive Summary

This simulation combines two computational physics approaches:

1. **Lattice Boltzmann Method (LBM)** - D2Q9 lattice for computing fluid velocity fields
2. **Cellular Potts Model (CPM)** - Energy-based acceptance for deciding particle movement

The result: wax particles follow convection currents (from LBM) while maintaining cohesive blob structure (from CPM energy minimization).

---

## 2. The Key Innovation: Partial Cells with Capacity

Unlike binary cell models (wax or empty), each cell contains:

- **Units** (`u`): Integer [0..maxUnits]. The actual amount of wax substance.
- **Temperature** (`T`): Float [0.0..1.0]. Physical heat.
- **Capacity** (`C(T)`): Derived integer. How many units "fit comfortably."
  - Hot (T=1.0): capacity = 6 (expanded, less dense)
  - Cold (T=0.0): capacity = 8 (contracted, more dense)

### Why This Matters

When wax heats up:
1. Its capacity drops (8 → 6)
2. It becomes "over-capacity" (has more units than comfortable)
3. The energy cost of being over-capacity drives units outward
4. This creates **thermal expansion** without explicit expansion rules

---

## 3. The Dual-System Architecture

### System A: LBM Velocity Field

Standard D2Q9 Lattice Boltzmann computes a velocity field across the grid:

- **Collision step**: Relaxes distributions toward equilibrium
- **Streaming step**: Propagates distributions to neighbors
- **Force injection**: Buoyancy (hot rises) and gravity

The velocity field `(fluidUx, fluidUy)` tells us which way fluid "wants" to flow.

### System B: CPM Energy-Based Movement

Instead of directly moving particles along velocity, we use energy minimization:

```
H_total = H_adhesion + H_capacity
```

**Adhesion Energy** - Penalizes wax-empty boundaries (surface tension):
```javascript
H_adhesion = J × (empty neighbors) × (units / maxUnits)
```
- More empty neighbors = higher surface energy
- System minimizes surface area → blobs form

**Capacity Energy** - Penalizes being over-capacity:
```javascript
H_capacity = λ × max(0, units - capacity(T))²
```
- Only penalizes EXCESS units (over-capacity)
- Under-capacity is fine (boundary cells don't need to be full)
- Hot cells shed units, cold cells can accept them

### The Integration

For each potential unit transfer:

1. Calculate energy change (ΔH) from adhesion and capacity
2. Calculate velocity projection toward destination (velScore)
3. Combined score = velScore - ΔH
4. Accept using Boltzmann probability: P = exp(-effectiveEnergy / noiseTemp)

The velocity field BIASES movement direction, but energy PERMITS or REJECTS it.

---

## 4. Critical Bug Fixes (This Session)

### Bug 1: Capacity Energy Penalized Under-Capacity

**Problem:** The original formula penalized both over AND under-capacity:
```javascript
// BROKEN
const deviation = cellUnits - cap;
return λ * deviation * deviation;
```

A boundary cell with 1 unit and capacity 8 had energy = λ × 49. Massive penalty for being partially filled, causing total gridlock.

**Fix:** Only penalize over-capacity:
```javascript
// FIXED
const overCapacity = Math.max(0, cellUnits - cap);
return λ * overCapacity * overCapacity;
```

### Bug 2: No Expansion Room

**Problem:** With `maxUnits = 8` and `coldCapacity = 8`, interior cells couldn't expand. All neighbors were at 8/8 (full), so transfers were blocked.

**Fix:** Increased `maxUnits` to 10, giving 2 units of "headroom" for expansion. Cells start at `coldCapacity` (8), not `maxUnits`.

---

## 5. Parameter Guide

### Energy Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| `adhesionJ` | 1.5 | Surface tension strength. Higher = rounder blobs, less stringy. |
| `capacityLambda` | 0.5 | Expansion pressure. Higher = stronger thermal expansion. |
| `noiseTemp` | 1.0 | Boltzmann temperature. Higher = more random acceptance, more fluid. Lower = more deterministic. |

### Capacity Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| `maxUnits` | 10 | Absolute maximum units per cell. Must be > coldCapacity for expansion. |
| `hotCapacity` | 6 | Comfortable units when fully hot (T=1.0). |
| `coldCapacity` | 8 | Comfortable units when cold (T=0.0). |

### Movement Parameters

| Parameter | Default | Recommended | Effect |
|-----------|---------|-------------|--------|
| `velScale` | 3 | **1** | How much velocity influences direction. High values cause angular movement. |
| `transfersPerTick` | 1 | 1 | Units transferred per cell per frame. |

---

## 6. Observed Behavior

With current defaults (velScale=1 recommended):

- **Blobbiness**: Real cohesive blob behavior emerges from adhesion energy
- **Thermal cycling**: Hot wax rises, cools, sinks - proper convection
- **Mass conservation**: Perfect - units transfer, never created/destroyed
- **Stringiness**: Still somewhat stringy/liquidy. Tuning adhesionJ upward may help.

---

## 7. Comparison to Previous Approaches

| Approach | File | Problem |
|----------|------|---------|
| Cohesion forces | `dplbm-cohesion.html` | Forces bias but don't guarantee cohesion. Particles escape. |
| Coordinated swaps | `dplbm-twophase.html` | Simple point test causes "wireflow" - wax unfolds into wire structures. |
| Hybrid v1 (binary) | `dplbm-hybrid.html` | Binary cells only. No thermal expansion mechanism. Particles escape. |
| **Hybrid v2 (units)** | `dplbm-hybrid-2.html` | **Partial cells + capacity = working thermal expansion and cohesion.** |

---

## 8. Technical Details

### Unit Transfer Algorithm

```
For each wax cell (random order):
  For each cardinal direction (up, down, left, right):
    If destination is full (≥ maxUnits): skip

    Calculate:
      - ΔH_adhesion: Change in surface energy
      - ΔH_capacity: Change in capacity penalty
      - velScore: Velocity projection × velScale
      - Isolation penalty: If creating isolated unit, add 10×J

    Combined score = velScore - ΔH

  Pick direction with best score

  Accept probability:
    If effectiveEnergy ≤ 0: accept (100%)
    Else: accept with P = exp(-effectiveEnergy / noiseTemp)

  If accepted:
    Transfer 1 unit from source to dest
    Blend temperatures proportionally
```

### Capacity Interpolation

```javascript
function getCapacity(t) {
    return Math.round(coldCapacity - (coldCapacity - hotCapacity) * t);
}
// t=0.0 → 8, t=0.5 → 7, t=1.0 → 6
```

---

## 9. Future Tuning Directions

To reduce stringiness and increase blobbiness:

1. **Increase adhesionJ** (try 2.0-3.0): Stronger surface tension
2. **Decrease noiseTemp** (try 0.5-0.8): Less random movement, more energy-driven
3. **Adjust capacity range**: Smaller range (7-8) = less aggressive expansion
4. **Add thickness penalty**: Extra energy cost for thin (1-2 cell wide) structures

---

## 10. Files

- `lava-lamp-dplbm-hybrid-2.html` - Current working implementation
- `lava-lamp-dplbm-hybrid.html` - Previous version (binary cells, broken)
- `lava-lamp-hybrid-notes.md` - This document
- `lava-lamp-cpm-notes.md` - Original CPM design notes
- `lava-lamp-wireflow-notes.md` - Documentation of wireflow discovery
