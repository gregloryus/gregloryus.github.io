### Recommendations for the Next Session (from absorption-7.js)

The previous session ended with `absorption-7.js` being non-functional, despite multiple attempts to fix a persistent growth stall. The user has decided to revert to the `absorption-6.js` baseline. This is a wise decision, as `absorption-6.js` was the last known semi-stable state.

However, the work done in `absorption-7.js` contained several important conceptual breakthroughs that align with the `complete_plant_sim_brief.md` and should be salvaged. It is recommended that the next attempt starts with `absorption-6.js` as a base and carefully ports the following _concepts_ (not necessarily the exact code) from `absorption-7.js`, testing thoroughly after each integration.

**WARNING:** The resource distribution logic in `absorption-7.js`, specifically the `distributeResources()` function, is the primary source of the bugs. **DO NOT COPY IT DIRECTLY.** The core idea is sound, but the implementation is flawed.

---

#### 1. Implement a Death Mechanic

- **Concept:** Plants should have a finite lifespan and should die if they cannot sustain themselves. This is critical for creating a dynamic ecosystem.
- **Reference:** The `lifespan` property in the `Particle` class and the `die()` method in `absorption-7.js` are a good starting point. A plant's death should be triggered by the death of its seed, which in turn can be triggered by age or a critical failure (like a stalled bud).

#### 2. Implement Explicit Resource Ownership

- **Concept:** To prevent the plant's internal energy and water from decaying, they must be "owned."
- **Mechanism (`absorption-7.js`):**
  - When a particle is absorbed by a plant, it is assigned the plant's unique `plantId`.
  - The `updateEnergy` function was modified to check `if (this.plantId)` to determine stability. Only particles without a `plantId` are subject to decay.
- **Recommendation:** This is a robust and essential concept. Port this ownership logic carefully.

#### 3. Implement True Bidirectional Resource Flow (Conceptually)

- **Concept:** The brief requires resources to flow not just in one primary direction, but to any unsaturated part of the plant. This is necessary for complex growth.
- **Reference (`absorption-7.js`):** The `getWaterFlowNeighbors` and `getEnergyFlowNeighbors` functions contain the correct _prioritized logic_ for this.
  1.  Natural flow path (e.g., water to children).
  2.  Back-flow path (e.g., water to parent).
  3.  Lateral-flow path (e.g., water to any other adjacent part).
- **Recommendation:** Use these neighbor-finding functions as a blueprint, but rewrite the calling function (`distributeResources` in `absorption-7.js`) from scratch to correctly implement the distribution loop without the bugs that caused the stall.

#### 4. Implement a Robust Reproduction Cycle

- **Concept:** A mature plant's flower should produce a new, mobile seed that disperses before landing.
- **Reference (`absorption-7.js`):** The `reproduce()` method and the `updateFlower()` logic contain the foundation for this, including a `FLOWER_TIMER` and a k-step random walk for the new seed. This is a significant improvement over the simpler logic in `absorption-6.js`.

---

**Proposed Path Forward:**

1.  Start with a clean copy of `absorption-6.js`.
2.  Rename it to `absorption-8.js`.
3.  Integrate **Explicit Resource Ownership** first. Test thoroughly.
4.  Integrate the **Death Mechanic**. Test thoroughly.
5.  Carefully rewrite the **Resource Distribution** logic using the neighbor-finding concepts from `absorption-7.js`. This is the most critical and difficult step.
6.  Integrate the improved **Reproduction Cycle**.

This incremental approach, built upon a stable foundation, has the highest chance of success.
