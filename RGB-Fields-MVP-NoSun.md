
# RGB Fields — Minimal Viable Backbone (based on `absorption-18.js`)

> Target: a fast, deterministic, GPU-friendly cellular automaton with **R** (heat) and **B** (water) scalar fields (0–255), later adding **G** (plants) as a binary mask. Keep the backbone **dense-grid + typed arrays + single texture upload** each frame.

**Why base on `absorption-18.js`:** It already has the right grid scaffolding (fixed-size world, row/col, `getIndex()` pattern, layered occupancy concept, constant block, tick loop). We’ll **strip particles/sprites** and replace with **field planes + ping-pong buffers + one texture-from-buffer render**.

---

## 0) Quantization rules (global)
We will quantize after every arithmetic update to keep values stable and to compress state space.

- **G (plant/occupied)**: 0 or 255 (binary). We won’t use G in the MVP, but reserve a `Uint8Array` plane for later.  
- **B (water)**: quarter steps of 64 → `{0, 63, 127, 191, 255}`.  
- **R (heat/energy)**: sixteenth steps of 16 → `{0, 15, 31, 47, 63, 79, 95, 111, 127, 143, 159, 175, 191, 207, 223, 239, 255}`.

Helper functions:
```js
function quantizeQuarter(v){ // 0..255 -> {0,63,127,191,255}
  const q = Math.round(v/64);
  return Math.max(0, Math.min(4, q)) * 63;
}
function quantizeSixteenth(v){ // 0..255 -> 0,15,31,...,255
  const q = Math.round(v/16);
  return Math.max(0, Math.min(16, q)) * 16 - 1 + (q===0?0:0);
}
```
> Tip: a small 256-entry lookup table per quantizer is faster and branchless.

---

## 1) What to **keep** from `absorption-18.js`
1. **App boot & constants**: PIXI app init, fixed `COLS/ROWS`, scale, and a consolidated `CONSTANTS` block (trim it).  
2. **Grid indexing pattern**: `i = y*COLS + x`, plus `getIndex(x,y)` utility.  
3. **Main loop skeleton**: `advanceTick()` and RAF `mainLoop()` with a **tick rate param**.  
4. **Keyboard controls**: pause/step, simple report/debug text.  
5. **Layered occupancy idea**: keep the class name but **replace content** with our field planes.

> Everything else is removable: particle classes, per-cell sprites, overlays, auras/phantoms, bound/unbound logic, random walkers, object graphs.

---

## 2) Replace with **field planes** (typed arrays + ping-pong)
Create **double buffers** for each field, all `Uint8Array(length = COLS*ROWS)`:

```js
const N = COLS*ROWS;
let R0 = new Uint8Array(N), R1 = new Uint8Array(N); // heat
let B0 = new Uint8Array(N), B1 = new Uint8Array(N); // water
// Optional for later:
let G0 = new Uint8Array(N), G1 = new Uint8Array(N); // plants (0/255)

// Active/dirty helpers (optional, incremental updates):
let active = new Uint8Array(N); // 0/1; mark changed cells
```

Access helpers:
```js
const IX = (x,y)=> y*COLS + x;
function inBounds(x,y){ return x>=0 && x<COLS && y>=0 && y<ROWS; }
```

---

## 3) Rendering (single upload)
Render with **one** RGBA buffer/texture per frame; no sprites.

```js
const rgba = new Uint8ClampedArray(N*4);
const baseTex = PIXI.Texture.fromBuffer(rgba, COLS, ROWS);
const spr = new PIXI.Sprite(baseTex);
spr.scale.set(SCALE_SIZE, SCALE_SIZE);
app.stage.addChild(spr);

function packRGBA(){
  // For MVP: map B to blue channel and R to red, no gamma.
  for(let i=0, j=0; i<N; i++, j+=4){
    rgba[j+0] = R1[i];   // R
    rgba[j+1] = 0;       // G (unused for now)
    rgba[j+2] = B1[i];   // B
    rgba[j+3] = 255;     // A
  }
  baseTex.update(); // upload
}
```

> If you need more speed, reuse the same `Texture` and call `baseTex.update()`; avoid reallocations.

---

## 4) Tick order (full-frame O(N) passes)

**AdvanceTick() skeleton:**
```js
function advanceTick(){
  // 1) Drivers (external flux)
  injectHeat(R0);
  injectWater(B0);

  // 2) Physics updates (read 0 -> write 1)
  diffuseR(R0, R1);  // separable 4-neighbour diffusion with decay
  flowB(B0, B1);     // gravity-biased flow with lateral spread

  // 3) Quantize & clamp
  quantizeFields(R1, B1);

  // 4) Swap buffers
  [R0,R1] = [R1,R0];
  [B0,B1] = [B1,B0];

  // 5) Pack & render
  packRGBA();
}
```

### 4.1 Heat injection (stub)
```js
const HEAT_DOSE = 16; // pre-quantized
function injectHeat(R){
  const i = Math.floor(Math.random()*N);
  R[i] = Math.min(255, R[i] + HEAT_DOSE);
}
```

### 4.2 Water injection (stub)
```js
const WATER_DOSE = 64; // aligns with water quantization
function injectWater(B){
  if(Math.random()<0.05){
    const i = Math.floor(Math.random()*N);
    B[i] = Math.min(255, B[i] + WATER_DOSE);
  }
}
```

### 4.3 Heat diffusion (R): 4-neighbour averaging with loss
```js
function diffuseR(src, dst){
  for(let y=0; y<ROWS; y++){
    const yoff = y*COLS;
    for(let x=0; x<COLS; x++){
      const i = yoff + x;
      let acc = src[i]*4;
      if(y>0)       acc += src[i-COLS];
      if(y<ROWS-1)  acc += src[i+COLS];
      if(x>0)       acc += src[i-1];
      if(x<COLS-1)  acc += src[i+1];
      const v = (acc/8) * 0.98; // 2% loss
      dst[i] = v & 255;
    }
  }
}
```

### 4.4 Water flow (B): gravity + lateral spread (branch-light)
```js
function flowB(src, dst){
  dst.set(src);
  for(let y=ROWS-2; y>=0; y--){
    const yoff = y*COLS;
    for(let x=0; x<COLS; x++){
      const i = yoff + x;
      const here = dst[i];
      if(here===0) continue;

      const idn = i + COLS;
      if(src[idn] < here){
        const move = Math.min(here, 64);
        dst[i] = here - move;
        dst[idn] = Math.min(255, dst[idn] + move);
        continue;
      }
      if(x>0){
        const ild = i + COLS - 1;
        if(src[ild] + 64 < here){
          const move = Math.min(here, 32);
          dst[i] -= move; dst[ild] = Math.min(255, dst[ild]+move);
          continue;
        }
      }
      if(x<COLS-1){
        const ird = i + COLS + 1;
        if(src[ird] + 64 < here){
          const move = Math.min(here, 32);
          dst[i] -= move; dst[ird] = Math.min(255, dst[ird]+move);
          continue;
        }
      }
      if(x>0 && src[i-1] + 64 < here){ const mv=16; dst[i]-=mv; dst[i-1]+=mv; }
      if(x<COLS-1 && src[i+1] + 64 < here){ const mv=16; dst[i]-=mv; dst[i+1]+=mv; }
    }
  }
}
```

### 4.5 Quantization
```js
function quantizeFields(R, B){
  for(let i=0;i<N;i++){
    R[i] = quantizeSixteenth(R[i]);
    B[i] = quantizeQuarter(B[i]);
  }
}
```

---

## 5) Initialization
```js
const COLS = 256, ROWS = 256, SCALE_SIZE = 3;
R0.fill(0); B0.fill(0);
for(let i=0;i<N;i++){
  R0[i] = (Math.random()<0.01)? 31: 0;
  B0[i] = (Math.random()<0.01)? 63: 0;
}
```

---

## 6) Controls & determinism
- Replace `Math.random()` with a seeded PRNG for reproducibility.  
- Controls: `P` pause, `SPACE` single-step, `R` print min/max histograms of R/B.

---

## 7) Performance notes
- **No per-cell sprites.** One texture upload per frame.  
- **Avoid branches** in hot loops; prefer arithmetic min/max and lookups.  
- **Chunking (optional):** 64×64 tiles; keep an active mask per tile to skip empty regions.  
- **GPU path (later):** same structure maps to 2–3 full-screen fragment passes (R, B, pack).

---

## 8) Extension hooks (not in MVP)
- **G plane**: add binary plants as a mask that modulates water/heat uptake.  
- **Occlusion**: row/col prefix products for directional flux.  
- **Seeds/species**: add a `speciesID` plane and per-species parameters.

---

## 9) Migration steps from `absorption-18.js`
1. Copy **PIXI app init**, constants scaffold, `COLS/ROWS`, and the **RAF loop**.  
2. Delete **Particle classes**, per-cell sprites, overlays, auras, phantom sprites, bound/unbound logic, and global array scans.  
3. Implement **field planes** + **ping-pong** buffers.  
4. Implement **injectHeat**, **injectWater**, **diffuseR**, **flowB**, **quantizeFields**.  
5. Implement **packRGBA** and swap it into the render step.  
6. Verify performance on 256×256 and 512×512; tune `SCALE_SIZE` and doses.

---

## 10) Done-Definition (MVP)
- At 256×256, stable 60fps on a mid-range laptop.  
- R and B show visible dynamics (drivers; diffusion/flow).  
- Quantization visibly produces stepped plateaus.  
- Deterministic run with fixed seed.  
- Code < 500 lines, no per-cell sprites.

---

## 11) Minimal code order (for Cursor agent)
1. Create `constants`, grid dims, and PIXI app.  
2. Allocate `R0/R1, B0/B1, rgba`, sprite, and `Texture.fromBuffer`.  
3. Implement helpers (`IX`, `quantize*`, `packRGBA`).  
4. Implement drivers (`injectHeat`, `injectWater`).  
5. Implement updates (`diffuseR`, `flowB`, `quantizeFields`).  
6. Wire `advanceTick` and `mainLoop` (pause/step).  
7. Boot with small noise → run.

---

**Notes**  
- Keep arithmetic in `Uint8` domain; if you cast to float for averages, clamp then quantize back each pass.  
- For larger worlds, add **tiles + active masks** before considering WebGL kernels.

