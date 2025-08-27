# HOW TO APPLY ITEMS 1-6 TO `absorption-15.js` (CURSOR AI-FRIENDLY PLAIN TEXT)

This file is _one_ continuous Markdown block. Copy everything between the triple back-ticks into a new "patch-instructions.md" file, then feed that file to Cursor AI. Cursor can execute the edits as written but will not invent missing steps—so follow every instruction exactly.

────────────────────────────────────────────────────────────────────────
GENERAL RULES FOR ALL STEPS

1. **Do not** create or delete files—only change `absorption-15.js`.
2. Keep existing indentation style (2 spaces for JS blocks).
3. When inserting code **inside an existing list or object**, mind commas:
   • If you add the last item, omit the trailing comma.  
   • Otherwise include a trailing comma to avoid syntax errors.
4. Where the instructions say _"place anywhere inside class body"_, insert
   immediately after the last method in that class unless told otherwise.
5. After each edit, save the file; no build or run steps are needed here.

────────────────────────────────────────────────────────────────────────
STEP 1 – ADD RESOURCE LIMIT CONSTANTS  
• Search for the line that begins with `GROWTH:` inside the big `CONSTANTS`
object (around line 190).  
• Directly **after** the entire `GROWTH:` block (but before `SEED:`) insert:

      // Per-cell resource slot limits
      RESOURCE: {
        MAX_FIXED_PER_CELL: 1,      // one fixed water or energy
        MAX_EXCESS_PER_CELL: 1      // one excess water or energy
      },

• Ensure this new block is aligned with the other top-level keys (WORLD,
VISUAL, PHYSICS, etc.) and ends with a trailing comma because more blocks
follow.

────────────────────────────────────────────────────────────────────────
STEP 2 – ADD FLAG ARRAYS & HELPERS TO `LayeredOccupancyGrid`  
A. **Add arrays**  
 • In class `LayeredOccupancyGrid` constructor, locate the line that creates
`this.energyOverlays`.  
 • **Immediately after** that line, insert:

         // Per-cell fixed/excess flags (Uint8Arrays = fast byte arrays)
         this.hasFixedWater   = new Uint8Array(cols * rows);
         this.hasExcessWater  = new Uint8Array(cols * rows);
         this.hasFixedEnergy  = new Uint8Array(cols * rows);
         this.hasExcessEnergy = new Uint8Array(cols * rows);

B. **Add helper methods**  
 • Still inside the `LayeredOccupancyGrid` class (anywhere below existing
methods, before the class ends), insert the four helpers:

         setFixed(x, y, mode, val) {
           const arr = mode === Mode.WATER ? this.hasFixedWater : this.hasFixedEnergy;
           arr[this.getIndex(x, y)] = val ? 1 : 0;
         }

         setExcess(x, y, mode, val) {
           const arr = mode === Mode.WATER ? this.hasExcessWater : this.hasExcessEnergy;
           arr[this.getIndex(x, y)] = val ? 1 : 0;
         }

         cellHasFixed(x, y, mode) {
           if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
           const arr = mode === Mode.WATER ? this.hasFixedWater : this.hasFixedEnergy;
           return arr[this.getIndex(x, y)] === 1;
         }

         cellHasExcess(x, y, mode) {
           if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
           const arr = mode === Mode.WATER ? this.hasExcessWater : this.hasExcessEnergy;
           return arr[this.getIndex(x, y)] === 1;
         }

────────────────────────────────────────────────────────────────────────
STEP 3 – ADD FAST HELPER FUNCTIONS (GLOBAL)  
• Find the global helper `function countPlantCells(plantId)` (about line 670).
• **Immediately after** that whole function insert the two new helpers:

      // --- Fast helpers for slot logic & performance -----------------
      function hasBoundParticleAt(x, y, mode) {
        return particles.some(
          (p) =>
            p.state === ParticleState.BOUND &&
            p.mode  === mode &&
            p.pos.x === x &&
            p.pos.y === y
        );
      }

      function countExcessParticlesAt(x, y, mode) {
        return particles.filter(
          (p) =>
            p.state === ParticleState.BOUND &&
            p.mode  === mode &&
            !p.isFixed &&
            p.pos.x === x &&
            p.pos.y === y
        ).length;
      }

────────────────────────────────────────────────────────────────────────
STEP 4 – UPDATE `Particle` CLASS WITH FLAGS & UTILS  
A. **New boolean flag**  
 • In `Particle` constructor, locate the line `this.isFixed = false;`.  
 • **Immediately below** insert:

         this.isExcess = false;       // second slot if fixed already taken

B. **Utility methods**  
 • Somewhere inside the `Particle` class but outside any other method
(ideal place: just before `bindToPlant()`), insert:

         clearSlotFlags(oldX, oldY) {
           if (this.isFixed)  occupancyGrid.setFixed(oldX,  oldY,  this.mode, false);
           if (this.isExcess) occupancyGrid.setExcess(oldX, oldY, this.mode, false);
         }

         claimSlotFlags(newX, newY) {
           if (!occupancyGrid.cellHasFixed(newX, newY, this.mode)) {
             this.isFixed = true;  this.isExcess = false;
             occupancyGrid.setFixed(newX, newY, this.mode, true);
           } else if (!occupancyGrid.cellHasExcess(newX, newY, this.mode)) {
             this.isFixed = false; this.isExcess = true;
             occupancyGrid.setExcess(newX, newY, this.mode, true);
           } else {
             // both slots taken; this particle should not remain bound here
             this.isFixed = this.isExcess = false;
           }
         }

────────────────────────────────────────────────────────────────────────
STEP 5 – REPLACE `bindToPlant` METHOD BODY  
• In class `Particle`, find the existing `bindToPlant(plantId)` method.  
• Select everything from its opening brace `{` to its closing brace `}` and
**replace** with the following code _exactly_:

      bindToPlant(plantId) {
        // Refuse to bind if target cell already full
        if (
          occupancyGrid.cellHasFixed(this.pos.x, this.pos.y, this.mode) &&
          occupancyGrid.cellHasExcess(this.pos.x, this.pos.y, this.mode)
        ) {
          return; // caller must relocate particle first
        }

        this.state   = ParticleState.BOUND;
        this.plantId = plantId;

        // allocate slot flags
        this.claimSlotFlags(this.pos.x, this.pos.y);

        this.createAura();

        // remove from unbound layers
        if (this.mode === Mode.ENERGY) occupancyGrid.setEnergy(this.pos.x, this.pos.y, null);
        if (this.mode === Mode.WATER)  occupancyGrid.setWater (this.pos.x, this.pos.y, null);

        // Debug
        console.log(`🔗 ${this.mode} bound (${this.isFixed ? 'fixed' : 'excess'}) at ${this.pos.x},${this.pos.y}`);
      }

────────────────────────────────────────────────────────────────────────
STEP 6 – MAINTAIN FLAGS ON MOVE / UNBIND / DESTROY  
A. **`moveToCell` edits**  
 • Inside `moveToCell(x, y)`, locate the very first lines; replace the
current `const wasFixed = this.isFixed;` with:

         const wasFixed  = this.isFixed;
         const wasExcess = this.isExcess;
         this.clearSlotFlags(this.pos.x, this.pos.y);

• After the position update section (just after aura/sprite moves) insert:

         // attempt to reclaim in new cell
         this.claimSlotFlags(x, y);

B. **`unbindFromPlant` edits**  
 • At the very top of `unbindFromPlant()`, insert:

         this.clearSlotFlags(this.pos.x, this.pos.y);

• Immediately after that new call, ensure the following lines exist (they
already do, just confirm order):

         this.state     = ParticleState.UNBOUND;
         this.plantId   = null;
         this.isFixed   = false;
         this.isExcess  = false;

C. **`destroy` edits**  
 • Inside `destroy()`, near the top where other cleanup happens, add:

         this.clearSlotFlags(this.pos.x, this.pos.y);

• Make sure this call occurs _before_ any arrays or grids remove the
particle to avoid stale flags.

────────────────────────────────────────────────────────────────────────
COMPLETION CHECKLIST
✓ File saves with no red squiggles.  
✓ `CONSTANTS.RESOURCE` appears exactly once.  
✓ `LayeredOccupancyGrid` now has four Uint8Array fields + four new helpers.  
✓ `Particle` has `isExcess`, two slot helpers, updated `bindToPlant`, and flag
maintenance in `moveToCell`, `unbindFromPlant`, `destroy`.  
✓ No other code touched.  
Run the simulation; water/energy per cell should never exceed 2 (1 fixed + 1
excess) except at seeds, and console logs will identify binding status.

END OF FILE
