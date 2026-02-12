# Lava Lamp DPLBM/CPM Hybrid — Expert Analysis & Recommendations

**Date:** February 1, 2026  
**Scope:** handoff → dplbm-5 → wireflow → CPM notes → hybrid notes → hybrid-2 → hybrid-3  
**Focus:** Critical review, root cause of diagonal/axis-aligned artifacts, and concrete next steps.

---

## 1. Document-by-document takeaway

### 1.1 `lava-lamp-dplbm-handoff.md`
- **Goal:** Discrete wax + LBM + cohesive blobs (no mass dissolution like Shan–Chen).
- **dplbm-5:** Interface resistance (wax–empty swaps hard, wax–wax easy) + temp softening. Clean and tunable.
- **Verdict:** Handoff is accurate. dplbm-5 is the right “otherwise working” baseline: good convection, no topology hacks, but no cohesion mechanism beyond resistance.

### 1.2 `lava-lamp-dplbm-5.html`
- **Architecture:** Single-phase D2Q9 LBM → velocity field; discrete wax moves via probabilistic swaps in 4 cardinal directions only. Interface resistance and temp softening on wax–empty swaps.
- **Strength:** Simple, mass-conserving, convection looks good.
- **Limitation:** Cohesion is only “don’t break the interface easily”; there is no positive tendency to minimize surface area or round blobs, so you get spray/chaos when softening is turned up.

### 1.3 Wireflow notes + `lava-lamp-dplbm-wireflow.html`
- **Idea:** Wax–empty move only if a “filler” exists (coordinated swap) and filler is a simple point (no disconnection).
- **Outcome:** Preserves connectivity but not thickness → wire-like attractors. Notes correctly identify that every cell in a 1-cell-wide wire is a simple point.
- **Verdict:** Good context. Wireflow is the logical consequence of “coordination + simple point” on a square lattice, not a bug. It’s the wrong tool for blobs.

### 1.4 `lava-lamp-cpm-notes.md` — Critical review

**Where I agree**

- **Kinematic vs thermodynamic:** “Can I move?” (rules, topology) vs “Do I want to move?” (energy) is the right framing. Coordination + simple-point leads to gridlock or wireflow; energy-based acceptance is a better basis for cohesion.
- **Local units + capacity:** Local, parallel-friendly “units per cell” and capacity C(T) are a good way to get thermal expansion without global blob volume.
- **Metropolis-style acceptance** with a Hamiltonian (adhesion + capacity + buoyancy) is standard CPM and fits the goal.
- **References** (Glazier–Graner, CompuCell3D) are appropriate.

**Nuances / caveats**

- **“Abandon DPLBM”:** The notes say abandon coordinated swaps, not necessarily the LBM. Hybrid-2/3 correctly keep LBM for velocity and use CPM-style energy only for *acceptance* of transfers. So the pivot is “how we decide moves,” not “throw away LBM.”
- **Buoyancy in CPM:** The doc puts buoyancy in the Hamiltonian as g·y·u. In the hybrids, buoyancy is in the LBM (force → velocity); the particle layer only sees velocity bias. That’s a valid and often simpler choice: LBM does convection, CPM does cohesion + (optionally) capacity.
- **Capacity “causing horizontal spreading”:** Hybrid-3 removes capacity to fix “horizontal spreading instead of clean vertical convection.” That’s a tuning/implementation issue. In principle, capacity + strong adhesion can still give vertical rise (hot blob sheds units upward if that’s where energy drops). So “capacity is wrong” is too strong; “capacity was tuned in a way that over-emphasized sideways expansion” is more accurate.

**Verdict:** CPM notes are sound. The hybrid direction (LBM velocity + CPM energy for transfers) is consistent with them and doesn’t require abandoning LBM.

### 1.5 `lava-lamp-hybrid-notes.md` + `lava-lamp-dplbm-hybrid-2.html`

- **Hybrid-2:** Units per cell, capacity C(T), adhesion + capacity energy, velocity bias, Metropolis acceptance. Only over-capacity penalized; maxUnits > coldCapacity for expansion headroom.
- **Bug (hybrid-2):** In `calcEnergyDelta`, the “isolation penalty” block is wrong. It loops over dest’s neighbors and sets `hasWaxNeighbor = true` and breaks on *any* wax neighbor. So the penalty is *never* applied when dest has any wax neighbor—including the intended case “dest empty, only wax neighbor is src and src has 1 unit.” So isolation is almost never penalized. Fix: isolation = (dest empty) and (dest’s only wax neighbor is src) and (srcUnits === 1).
- **Strength:** Capacity gives a clear thermal expansion mechanism; adhesion + no under-capacity penalty avoids gridlock. Blobs and convection are in the right ballpark.

### 1.6 `lava-lamp-dplbm-hybrid-3.html` — What changed and why artifacts appear

**Design choices in hybrid-3**

1. **Capacity removed.** Only adhesion + velocity + noise. Rationale: “capacity caused horizontal spreading.”
2. **Eight transfer directions:** 4 cardinal + 4 diagonal; diagonal velocity scaled by 0.707.
3. **Adhesion:** 8-neighbor empty count only (no per-unit scaling).
4. **Stronger buoyancy/gravity**, lower adhesionJ (0.5), higher noiseTemp (1.5).

**Why you see 90° and 45° artifacts**

- **Lattice anisotropy:** On a square lattice, transfers can only occur along 8 discrete directions. So:
  - With **4 cardinal only** (e.g. hybrid-2): interfaces and tendrils align to axes → axis-aligned “strings.”
  - With **4 + 4 diagonal** (hybrid-3): you get both axis-aligned and diagonal strings. Two blobs can connect along a row/column or a diagonal because those are the only directions of motion.
- **Thin bridges:** A 1-cell-wide line of wax has every cell at the “surface” (many empty neighbors). Adhesion cost is high *per cell*, but if velocity/flow strongly favors that direction, the line can still form and then persist until flow or noise breaks it. So you get temporary bridges and voids that look awkward.
- **Literature:** CPM and lattice gases are known to produce lattice-aligned shape artifacts when the Hamiltonian or the neighborhood is tied to the grid (e.g. perimeter/surface terms on square lattices). Solutions include larger neighborhoods, hexagonal lattices, or extra terms that penalize “thin” or “stringy” shapes.

So the artifacts are not a single bug but a **structural** effect of discrete directions + adhesion that doesn’t penalize thinness per se.

**Other observations on hybrid-3**

- **wouldCreateIsolation:** Correct: dest empty, only wax neighbor is src, and srcUnits === 1.
- **Adhesion delta:** Logic for “src loses one unit to empty dest → src’s empty count drops by 1” is correct.
- **Diagonal scaling 0.707:** Correct for isotropic preference (diagonal distance √2).
- **Removing capacity:** Simplifies the model but removes the “hot blob wants to shed units” pressure. Rise then relies only on LBM buoyancy and velocity bias; that can work but makes convection more dependent on LBM and less on the particle-layer energy.

---

## 2. Root cause summary

| Factor | Effect |
|--------|--------|
| **Discrete transfer directions (4 or 8)** | Interfaces and bridges align to those directions → 90° and/or 45° lines. |
| **No penalty for “thin” structure** | 1-cell-wide tendrils/bridges are not extra-costly beyond normal adhesion. |
| **Velocity bias** | Strong flow in one direction can overcome adhesion along that direction and form lines. |
| **Diagonal moves (hybrid-3)** | Explicitly allow 45° streaks; without a thinness penalty they persist. |

---

## 3. Recommendations

### Option A: Fix hybrid-3 with minimal changes (recommended first step)

1. **Thinness / bridge penalty (main fix)**  
   In the energy (or in `calcEnergyDelta`), add a term that penalizes a cell that would become (or remain) a “bridge”: e.g. exactly 2 wax neighbors in opposite directions (or 2 neighbors total). For example:
   - After a transfer, if the destination cell has exactly 2 wax neighbors and they are opposite (e.g. N and S, or E and W, or on a diagonal), add an extra ΔH penalty (e.g. `bridgePenalty * J`).  
   This discourages extending 1-cell-wide lines.

2. **Reduce diagonal transfers**  
   - Either drop diagonal directions and go back to 4 cardinal only (fewer 45° streaks, more axis-aligned only), or  
   - Keep 8 directions but add a small **diagonal penalty** (e.g. multiply diagonal ΔH by 1.2 or add a fixed cost) so that cardinals are preferred when energy is similar. That keeps some diagonal motion but reduces diagonal bridges.

3. **Increase adhesion J**  
   Try J in 1.0–1.5 range (hybrid-2 used 1.5). Higher J makes new surface more expensive and helps round blobs and reduce stringiness.

4. **Optional: restore capacity with milder tuning**  
   If you want thermal expansion back in the particle layer, restore capacity (e.g. hot 6 / cold 8) with a **small** capacityLambda (e.g. 0.2–0.3) so expansion is gentle and doesn’t dominate over adhesion. This can help “hot blob rises” without the strong horizontal spreading that led hybrid-3 to remove it.

### Option B: Start from dplbm-5 and add only adhesion (no units)

- Keep dplbm-5’s swap logic (4 cardinal, interface resistance + temp softening).
- Add a **single** CPM-style term: when considering a wax–empty swap, add an energy cost proportional to the *increase* in total wax–empty contacts (e.g. count over 4- or 8-neighborhood). Accept/reject with Metropolis.
- No capacity, no unit transfers—just “swap whole cells, but bias against creating extra surface.”
- Pros: minimal change, no unit bookkeeping, no diagonal moves. Cons: no partial cells, so no fine-grained density or capacity-driven expansion.

### Option C: Deeper redesign (if you want to invest)

- **Hexagonal lattice** for the particle grid (or dual grid): 6-fold symmetry reduces axis-aligned/diagonal bias (see FHP-style lattice gases).
- **Larger neighborhood** for adhesion (e.g. next-nearest neighbors) so that “surface” is smoother and less tied to 4/8 directions.
- **Disordered / centroid-based CPM** (e.g. CompuCell3D-style or recent “CPM on disordered lattices”) to remove lattice artifacts at the cost of more implementation work.

For your current stack, Option A is the most practical: keep hybrid-3, add thinness/bridge penalty and optionally diagonal penalty, tune J (and optionally restore mild capacity).

---

## 4. Specific code-level fixes

### 4.1 hybrid-3: Add bridge/thinness penalty

In `calcEnergyDelta`, after computing the adhesion delta, you can add something like:

```javascript
// Optional: penalize transfer that creates/keeps a "bridge" cell (exactly 2 opposite wax neighbors)
function isBridgeLike(x, y, unitsAfterDest) {
    // Count wax neighbors; if exactly 2 and opposite, it's a bridge
    const neighbors = [];
    for (let k = 0; k < 8; k++) {
        const nx = wrapX(x + N8X[k]);
        const ny = y + N8Y[k];
        if (ny >= 0 && ny < H && units[ny * W + nx] > 0) neighbors.push(k);
    }
    if (neighbors.length !== 2) return false;
    const opposite = (k) => (k + 4) % 8;
    return neighbors.some(k => neighbors.includes(opposite(k)));
}
// In calcEnergyDelta, if transfer would make dest a bridge cell, delta += bridgePenalty * J
```

(You’d need to pass in “units after transfer” or recompute dest’s neighbor count assuming dest gains 1 unit.)

### 4.2 hybrid-3: Prefer cardinal over diagonal

When building `dirs`, give diagonal directions a small fixed energy penalty (e.g. `deltaH += 0.2 * J` for `dir.diag === true`) so that cardinals win when scores are close.

### 4.3 hybrid-2: Fix isolation penalty

In `calcEnergyDelta` (hybrid-2), replace the isolation check with:

- Dest is empty.
- Count dest’s neighbors that have wax. If the count is 1 and that neighbor is src and srcUnits === 1, then add isolation penalty.

---

## 5. Summary table

| File / idea | Verdict | Note |
|-------------|--------|------|
| handoff | Good | dplbm-5 is correct baseline. |
| dplbm-5 | Good | Clear, works; no cohesion beyond interface resistance. |
| wireflow | Correct | Explains why coordination + simple point → wires. |
| CPM notes | Agree | Thermodynamic acceptance + local units/capacity; keep LBM. |
| hybrid-2 | Good + bug | Isolation penalty logic wrong; capacity + adhesion otherwise sound. |
| hybrid-3 | Artifacts | 8 directions + no thinness penalty → 90° and 45° lines; no capacity. |
| Fix path | Option A | Add bridge/thinness penalty, optional diagonal penalty, tune J; optionally restore mild capacity. |

See `lava-lamp-dplbm-hybrid-4.html` for an implementation of Option A (bridge penalty + diagonal penalty + stronger J).
