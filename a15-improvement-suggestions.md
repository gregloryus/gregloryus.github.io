Below is one single, continuous code-block you can drop into a scratch file or your issue tracker.
It spells out every edit needed to introduce the “1 fixed + 1 excess per cell” rule (seed keeps its 10-energy reserve) and folds in the quick perf helpers you liked.
All line numbers are approximate—search for the shown anchors.

────────────────────────────────────────────────────────────────────────
FILE: absorption-15.js
────────────────────────────────────────────────────────────────────────

1.  ░░░ ADD GLOBAL CONSTANTS
    ────────────────────────────────────────────────────────────────────
    // Inside the big CONSTANTS object, **after** the GROWTH: block add:

    - // Per-cell resource slot limits
    - RESOURCE: {
    -      MAX_FIXED_PER_CELL: 1,      // one fixed water or energy
    -      MAX_EXCESS_PER_CELL: 1      // one excess water or energy
    - },

2.  ░░░ LAYERED OCCUPANCY GRID – SLOT FLAGS
    ────────────────────────────────────────────────────────────────────
    // In class LayeredOccupancyGrid constructor, **after** energyOverlays:

    -      // Per-cell fixed/excess flags  (Uint8Array for perf)
    -      this.hasFixedWater   = new Uint8Array(cols * rows);
    -      this.hasExcessWater  = new Uint8Array(cols * rows);
    -      this.hasFixedEnergy  = new Uint8Array(cols * rows);
    -      this.hasExcessEnergy = new Uint8Array(cols * rows);

    // Then append helpers (place anywhere inside the class body):

    - setFixed(x, y, mode, val) {
    -      const arr = mode === Mode.WATER ? this.hasFixedWater : this.hasFixedEnergy;
    -      arr[this.getIndex(x, y)] = val ? 1 : 0;
    - }
    - setExcess(x, y, mode, val) {
    -      const arr = mode === Mode.WATER ? this.hasExcessWater : this.hasExcessEnergy;
    -      arr[this.getIndex(x, y)] = val ? 1 : 0;
    - }
    - cellHasFixed(x, y, mode) {
    -      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    -      const arr = mode === Mode.WATER ? this.hasFixedWater : this.hasFixedEnergy;
    -      return arr[this.getIndex(x, y)] === 1;
    - }
    - cellHasExcess(x, y, mode) {
    -      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    -      const arr = mode === Mode.WATER ? this.hasExcessWater : this.hasExcessEnergy;
    -      return arr[this.getIndex(x, y)] === 1;
    - }

3.  ░░░ FAST HELPER FUNCTIONS
    ────────────────────────────────────────────────────────────────────
    // Locate countPlantCells() helper and **immediately after** add:

    - // --- Fast helpers for slot logic & performance -----------------
    - function hasBoundParticleAt(x, y, mode) {
    - return particles.some(
    -      (p) =>
    -        p.state === ParticleState.BOUND &&
    -        p.mode  === mode &&
    -        p.pos.x === x &&
    -        p.pos.y === y
    - );
    - }
    -
    - function countExcessParticlesAt(x, y, mode) {
    - return particles.filter(
    -      (p) =>
    -        p.state === ParticleState.BOUND &&
    -        p.mode  === mode &&
    -        !p.isFixed &&
    -        p.pos.x === x &&
    -        p.pos.y === y
    - ).length;
    - }

4.  ░░░ PARTICLE CLASS – NEW FLAG & UTILS
    ────────────────────────────────────────────────────────────────────
    // In Particle.constructor (after this.isFixed = false;)

    -      this.isExcess = false;       // second slot if fixed already taken

    // ADD two small helpers inside Particle (anywhere):

    - clearSlotFlags(oldX, oldY) {
    -      if (this.isFixed)  occupancyGrid.setFixed(oldX,  oldY,  this.mode, false);
    -      if (this.isExcess) occupancyGrid.setExcess(oldX, oldY, this.mode, false);
    - }
    - claimSlotFlags(newX, newY) {
    -      if (!occupancyGrid.cellHasFixed(newX, newY, this.mode)) {
    -        this.isFixed = true;  this.isExcess = false;
    -        occupancyGrid.setFixed(newX, newY, this.mode, true);
    -      } else if (!occupancyGrid.cellHasExcess(newX, newY, this.mode)) {
    -        this.isFixed = false; this.isExcess = true;
    -        occupancyGrid.setExcess(newX, newY, this.mode, true);
    -      } else {
    -        // Should never bind if both slots taken
    -        this.isFixed = this.isExcess = false;
    -      }
    - }

5.  ░░░ REWRITE bindToPlant()
    ────────────────────────────────────────────────────────────────────
    // Replace the entire method body with:

        bindToPlant(plantId) {
          // Refuse if target cell already full
          if (
            occupancyGrid.cellHasFixed(this.pos.x, this.pos.y, this.mode) &&
            occupancyGrid.cellHasExcess(this.pos.x, this.pos.y, this.mode)
          ) {
            return; // caller must relocate particle first
          }

          this.state   = ParticleState.BOUND;
          this.plantId = plantId;

          // allocate slot
          this.claimSlotFlags(this.pos.x, this.pos.y);

          this.createAura();
          // remove from unbound layers
          if (this.mode === Mode.ENERGY) occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
          if (this.mode === Mode.WATER)  occupancyGrid.setWater (this.pos.x, this.pos.y, null);

          // Debug
          console.log(`🔗 ${this.mode} bound (${this.isFixed ? 'fixed' : 'excess'}) at ${this.pos.x},${this.pos.y}`);
        }

6.  ░░░ SLOT MAINTENANCE ON MOVE / UNBIND / DESTROY
    ────────────────────────────────────────────────────────────────────
    // a) In moveToCell() **before** position update:

    -      const wasFixed = this.isFixed;

    *      const wasFixed  = this.isFixed;
    *      const wasExcess = this.isExcess;
    *      this.clearSlotFlags(this.pos.x, this.pos.y);

    // b) still inside moveToCell(), **after** updating pos:

    -      // attempt to reclaim in new cell
    -      this.claimSlotFlags(x, y);

    // c) In unbindFromPlant():

    -      this.clearSlotFlags(this.pos.x, this.pos.y);
          this.state     = ParticleState.UNBOUND;
          this.plantId   = null;
          this.isFixed   = false;
          this.isExcess  = false;

    // d) In destroy():

    -      this.clearSlotFlags(this.pos.x, this.pos.y);

7.  ░░░ CAPACITY GUARD IN updateBoundParticle()
    ────────────────────────────────────────────────────────────────────
    // Inside Particle.updateBoundParticle() replace block getting targets:

        const wantsChild = this.mode === Mode.WATER; // water up, energy down

    - // local helper
    - const capacityReached = (cx, cy) =>
    -      occupancyGrid.cellHasFixed(cx, cy, this.mode) &&
    -      occupancyGrid.cellHasExcess(cx, cy, this.mode);

      let targets = needy(wantsChild ? "child" : "parent")

    *      .filter((n) => !capacityReached(n.x, n.y));

    -      .filter((n) => !capacityReached(n.x, n.y));

      if (targets.length === 0 && !this.isFixed) {
      targets = neighbors
      .filter((n) => !this.hasFixedAt(n.x, n.y, this.mode))

    *       .filter((n) => !capacityReached(n.x, n.y));

    -       .filter((n) => !capacityReached(n.x, n.y));
      }

8.  ░░░ LEAF ABSORPTION CAPACITY CHECK
    ────────────────────────────────────────────────────────────────────
    // In Particle.updateEnergy() where you build adjacentLeaves list,
    // replace the hasEnergy logic:

        const hasWater     = this.countBoundParticlesAt(nx, ny, Mode.WATER)  > 0;

    - const hasEnergy = this.countBoundParticlesAt(nx, ny, Mode.ENERGY) > 0;

    * const leafFull =
    *      occupancyGrid.cellHasFixed(nx, ny, Mode.ENERGY) &&
    *      occupancyGrid.cellHasExcess(nx, ny, Mode.ENERGY);

    - if (hasWater && !hasEnergy) {

    * if (hasWater && !leafFull) {

9.  ░░░ SEED WATER CAPACITY FIX
    ────────────────────────────────────────────────────────────────────
    // In absorbWaterFromEnvironment() change seedCapacity calc:

    - const seedCapacity = 1;

    * const seedCapacity = CONSTANTS.RESOURCE.MAX_FIXED_PER_CELL + CONSTANTS.RESOURCE.MAX_EXCESS_PER_CELL;

10. ░░░ NEED-FLAG SHORTCUT
    ────────────────────────────────────────────────────────────────────
    // In updatePlantPart() non-seed branch replace:
    this.needsWater = !hasBoundParticleAt(this.pos.x, this.pos.y, Mode.WATER);
    this.needsEnergy = !hasBoundParticleAt(this.pos.x, this.pos.y, Mode.ENERGY);

────────────────────────────────────────────────────────────────────────
END OF PATCH
────────────────────────────────────────────────────────────────────────

### What this delivers

- **Hard cap:** Every non-seed cell may hold **exactly one fixed + one excess** per resource;
  seed still stores 10 fixed energy but never excess.
- **True excess migration:** Once both slots in a cell are full, any further bound particles
  must move on; they’ll automatically promote to fixed if they land in a vacant cell.
- **Perf boost:** Several hottest `.filter(...).length` scans swapped for O(1) flag checks.
- **Minimal visuals impact:** Overlay logic unchanged; if you’d like different alpha/tint for
  fixed vs excess we can add that later.

### Open to confirm

1. Fixed particles are _immobile_; only excess moves. OK?
2. Promotion rule (excess → fixed when slot empty) matches intention?
3. Any visual distinction needed now? (default = none)

Apply, test, and let me know which follow-ups you’d like before merging!
