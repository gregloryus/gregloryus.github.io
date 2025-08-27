## Updated exhaustive brief for **Cursor AI**

_(This replaces the earlier version; differences are flagged with \***\*NEW\*\***)_

---

### Context

Cursor already has:

- `complete_plant_sim_brief.md`, `absorption-5.js`, and helper demos (`aestheedlings-8`, `cellspring-22-working`, `monochromagic-12`, `pixiching-optimized-7-ff-working`, `farming-plants-19`, `spring-fall-sand-garden-40-train`).

### 1 Fix the water-leaking / top-down-fill anomalies

1. **Neighbour priority review**
   - `getWaterFlowNeighbors()` now lists children first, then higher neighbors. Keep that.
   - **But** the recursion can bounce water back and forth, occasionally letting a higher leaf “borrow” the root’s particle before lower stems fill, giving the illusion of top-down fill.
   - **Action**: import `flowWater()` from **cellspring-22** (push-then-shift cascade). It guarantees a stable upward march without ping-pong.

2. **Absorption gating**
   - At every tick, a bud’s `pullResources()` can re-demand water even if the seed hasn’t finished filling the path.
   - After the cascade import, throttle `seed.absorbWaterFromEnvironment()` to **once every 6–8 ticks** or until the seed is empty again.

3. **Overlay clean-up**
   - When water leaves a plant cell, `updateWaterOverlay()` runs, but the sprite aura may remain on the old cell during a shift. After cascade import, ensure `waterParticle.updateWaterOverlay()` is called **after** `moveRel()` inside the cascade loop.

### 2 Performance upgrade: local push-then-shift mechanics

**Why current code is slow**

- Each tick calls `particles.find()` (O(N²) on large grids) to locate destinations for water or energy.
- Recursive back-tracking can re-visit cells multiple times.

**Borrow exactly this mechanism**

- Copy `flowEnergy()` and `flowWater()` DFS cascade from `cellspring-22-working.js`.
- Replace the old recursion in `tryFlowEnergy/Water()` with a one-liner call to the cascade:
  ```js
  this.flowWaterCascade(visitedCells);
  ```
  (Rename functions as you like.)
- Remove the `Array.find()` scans—they’re now obsolete.
- Keep the brief’s _negative-pressure_ semantics: a resource tries to move only when its **caller** demands space; the cascade is just the plumbing.

### 3 Other essential fixes / imports

- **Crown-shyness enforcement**
  - Call `occupancyGrid.isEmptyMooreNeighborhood()` before **every** leaf, node, or new bud placement in `grow()` and `createNode()`. Abort growth if the claim fails.
- **Bud orientation limiter**
  - Port `prevXOption` / `checkCounter` logic from `spring-fall-sand-garden-40-train.js` into your Bud class. This stops zig-zag stems without randomness.
- **Recency-weighted mutation**
  - Replace `PlantGenetics.mutate()` with the 10-line biased mutator from `farming-plants-19.js`.
- **Grid size**
  - Change `GRID_WIDTH = 256; GRID_HEIGHT = 144; SCALE_SIZE = 3;`. Update the PIXI canvas accordingly.
- **Leaf stencil**
  - Insert the 7-pixel pattern (hard-code from `aestheedlings` doc) when a leaf is created; this prevents single-pixel “nubs”.
- **NEW Deterministic first seed genetics**
  - Add an optional `PlantGenetics.fixed()` constructor that returns:
    ```js
    {
      internodeSpacing: 4,
      budGrowthLimit: 12,
      leafNodePattern: [1,1,0,1],
      branchingNodes: [6,10],
      branchAngle: 45,
      leafDelay: 2,
      floweringHeight: 12,
      energyThreshold: 8,
      droughtTolerance: 0.7,
      coldTolerance: 0.7
    }
    ```
  - Instantiate the very first seed with this genome and set `MUTATION_RATE = 0` until the plant flowers, then restore normal mutation. This guarantees reproducible tests.

### 4 Implementation order

1. **Deterministic seed genetics** (easy flag).
2. **Grid resize** and canvas rescale.
3. **Import cascade functions**; patch `tryFlowWater/Energy`.
4. **Throttle seed absorption** (absorb every 6 ticks).
5. **Crown-shyness checks** on growth.
6. **Bud orientation limiter**.
7. **Leaf stencil insertion**.
8. **Recency-weighted mutation** reinstated.
9. Verify overlays update correctly after cascade moves.

### 5 Definition of done

- Water ascends in a continuous column with **no drips** and never appears above the highest hydrated leaf.
- With the cascade, average FPS ≥ 30 on a 256 × 144, 2021-era laptop.
- The first ten test runs show identical plant morphology through node 12 (because genetics are fixed).
- After re-enabling mutation, distinct phenotypes appear within five minutes at 16× fast-forward.
- No console log spam of “requesting water” loops once cascade and throttling are in.

_(End brief)_

---

#### Notes from the console trace

- Repeated “💧 Bud … requesting water” lines prove buds issue the demand faster than the root can deliver; the cascade plus the 6-tick absorption gate should quiet this.
- Energy ping-pong (“flowed from A to B … B to A”) indicates the same missing cascade on the energy side.
- Colour shifts on apical buds correspond to random fitness tinting; static genetics removes that variability for debugging.

Everything above now matches the live state of **absorption-5.js** and extends the earlier advice with the **deterministic genetics** requirement.
