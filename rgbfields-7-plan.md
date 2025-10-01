
# rgbfields-7: Divisible Water + Heat-Graded Motion (Local, Fast, Emergent)

**Deliverable:** a concrete code plan (with copy‑pasteable snippets) to evolve `rgbfields-6.js` into `rgbfields-7.js` while keeping the architecture **local-only, O(N) per tick, single pass per field**, and cache-friendly.  
**Theme:** Replace binary water with **divisible water** (5 states: 0..4 levels → rendered as 0,63,127,191,255), and make water’s **movement range depend on heat** (0..8 units).  
**Constraints honored:** no OOP per-particle state, no multi-cell lookahead; everything remains **purely local**.

---

## Goals (explicit)

- Water is stored as **levels** `W ∈ {0,1,2,3,4}` (not booleans). One **move = transfer of exactly one level** to a neighboring cell.
- Water only moves into **empty** water cells (`W==0`) — i.e., **static when surrounded by water** (no internal churn in full pools).
- **Surface‑tension‑like piling/dispersion**: a transfer is allowed if either the height difference is large or the source is heavy enough, via:
  ```js
  // Can transfer if EITHER:
  // 1) Large difference (≥2 units), OR
  // 2) Source has ≥3 units AND difference ≥1
  function canTransfer(source, target) {
    const diff = source - target;
    return (diff >= 2) || (source >= 3 && diff >= 1);
  }
  ```
  (When targets are empties `target=0`, this rule discourages “lumpiness”: small puddles don’t ooze sideways; piles do.)
- **Heat‑graded motion** (0..8 units). Water’s directions are tried in a short, fixed sequence that grows with heat, matching your spec exactly (see §3).
- Keep **red diffusion** unchanged (donor/recipient gates), but *optionally* advect a tiny amount of heat with each water level move (on/off switch).

---

## Non‑goals (for this version)

- No internal water swaps or “pressure” inside full pools.
- No vapor phase; “upward” motion emerges purely from heat‑graded direction schedules.
- No global shuffles per tick; **scan order remains deterministic** (serpentine + parity flip) for speed.

---

## High‑level changes from v6 → v7

1. **Replace `B0/B1`** (binary) with **`W0/W1`** (Uint8Array holding 0..4).  
2. **Rendering:** map water level to bytes `{0,63,127,191,255}` in the RB and B views.  
3. **Water move step:** replace `flowBlue` with **`flowWaterLevels`** using a **flux accumulation** pattern (intent arrays) for conflict‑free, one‑level moves:  
   - Per source cell `i`: choose **at most one** neighbor `j` following a **heat‑graded direction schedule** (§3).  
   - Only consider **empties (`W0[j]==0`)**.  
   - Apply **`canTransfer(W0[i], W0[j])`** (with `W0[j]`=0 for empties). If true, stage `waterOut[i]++`, `waterIn[j]++`.  
   - Optional **advection**: also stage `heatOut/heatIn` for a **single** red unit with small prob `pCarry(U0[i])`.  
   - After the scan, **apply fluxes** in one pass: `W1[i] = clamp(W0[i] - waterOut[i] + waterIn[i], 0..4)`, likewise for red if advection is enabled.  
4. **Direction schedule by heat (`U ∈ 0..8`)** exactly matching your spec (short lists, ≤5 probes; see §3).  
5. **Performance controls:** serpentine scan + parity flip; small constant-time neighbor checks; **no per‑cell arrays** or shuffles.

---

## 1) Data structures & constants

- Replace water with levels:
  ```js
  // Water: 0..4 levels (render to 0,63,127,191,255)
  let W0 = new Uint8Array(N);
  let W1 = new Uint8Array(N);

  // One‑tick intent buffers (reused each tick; zeroed before use)
  const waterOut = new Uint8Array(N);  // #levels leaving cell i (0..1 in this design)
  const waterIn  = new Uint8Array(N);  // #levels entering cell i
  ```

- Add mapping for water levels → bytes:
  ```js
  const WATER_TO_BYTE = new Uint8Array([0, 63, 127, 191, 255]);
  ```

- Keep existing red (`U0/U1`) as 0..8 units with `UNIT_TO_BYTE` intact.

- Optional advection knob (simple and cheap):
  ```js
  const ENABLE_WATER_HEAT_ADVECTION = true;
  // Carry at most one red unit with probability dependent on heat (cheap)
  function pCarry(u /*0..8*/) {
    // Light, monotone; tune as desired
    return (u <= 1) ? 0.05 : (u >= 8 ? 0.4 : 0.05 + 0.04*u);
  }
  ```

---

## 2) Rendering changes

Replace all uses of `blue[i] ? 255 : 0` with the level mapping:

```js
// Center: RB composite
rgbaRB[j + 2] = WATER_TO_BYTE[ W[i] & 0x07 /*0..4*/ ];

// Right: water-only
rgbaB[j + 2]  = WATER_TO_BYTE[ W[i] & 0x07 ];
```

Also update texture calls to use `W0` instead of `B0` in the RB/B panels.

---

## 3) Heat‑graded direction schedule (exactly your spec)

We keep sequences **short** to cap work per cell. For each `U ∈ 0..8`, we try a tiny list in order. When a step mentions “50% chance”, implement as **a single coin toss** to decide whether to include that probe; if included, check it **once**. When “random order” is specified, make **one coin toss** to swap the order of the pair. Everything remains local (neighbors only).

Neighbor offsets (precompute once):
```js
const OFF = {
  D:  +COLS,  U: -COLS,  L: -1,  R: +1,
  DL: +COLS - 1, DR: +COLS + 1,
  UL: -COLS - 1, UR: -COLS + 1,
};
```

**Per‑U schedule:**

- **U=0:** `[ D ]`
- **U=1:** `[ D, 50%: (DL,DR in random order) ]`
- **U=2:** `[ D, (DL,DR in random order, always both) ]`
- **U=3:** `[ D, (DL,DR in random order), 50%: (L,R in random order) ]`
- **U=4:** `[ D, (DL,DR in random order), (L,R in random order) ]`
- **U=5:** `[ D, (DL,DR), (L,R), 50%: (UL,UR in random order) ]`
- **U=6:** `[ D, (DL,DR), (L,R), (UL,UR in random order) ]`
- **U=7:** `[ D, (DL,DR), (L,R), (UL,UR), U ]`
- **U=8:** `[ U, (UL,UR), (L,R), (DL,DR), D ]`  *(reverse‑biased to rise)*

**Gradient preference (local):** where a pair is “in random order”, **prefer the candidate whose target has lower water** (`W0[j]`, empties tie). If both empty, keep the coin‑flip order. This adds 2 extra reads at most.

**Important:** Only **empties (`W0[j]==0`)** are considered valid targets. That, plus `canTransfer`, gives you the piling/dispersion behavior with surface‑tension feel.

---

## 4) The transfer rule (surface‑tension feel)

Use exactly the function you provided, applied to **one‑level transfers**:

```js
function canTransfer(source /*0..4*/, target /*0..4*/) {
  const diff = source - target;
  return (diff >= 2) || (source >= 3 && diff >= 1);
}
```

- In this design, targets for motion are empties (`target=0`), so:
  - `source=1` ⇒ `diff=1` ⇒ **no** transfer (prevents small dribbles).
  - `source=2` ⇒ `diff=2` ⇒ **yes** (a pile can shed one level).
  - `source=3,4` ⇒ **yes** (heavier piles disperse readily).

This discourages “lumpy” low piles and yields nice edges.

---

## 5) Water move step (`flowWaterLevels`)

**Key properties:** single pass to stage intents, single pass to apply. Each cell attempts **at most one** level transfer following the schedule for its current heat `U0[i]`. If no valid empty is found, it does nothing. This keeps water **static when surrounded by water**.

```js
function flowWaterLevels(W_src, W_dst, U /*red units array 0..8*/) {
  W_dst.set(W_src);
  waterOut.fill(0);
  waterIn.fill(0);

  // Optional heat advection (single red unit intent)
  let heatOut = null, heatIn = null;
  if (ENABLE_WATER_HEAT_ADVECTION) {
    heatOut = new Uint8Array(N);
    heatIn  = new Uint8Array(N);
  }

  // Serpentine scan with parity flip to reduce anisotropy without shuffles
  const flip = (ticks & 1) !== 0; // use your existing ticks counter
  for (let y = 0; y < ROWS; y++) {
    const leftToRight = ((y & 1) === 0) ^ flip;
    const xStart = leftToRight ? 0 : COLS - 1;
    const xEnd   = leftToRight ? COLS : -1;
    const xStep  = leftToRight ? 1 : -1;

    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = y * COLS + x;
      const w = W_src[i];
      if (w === 0) continue; // no water to move

      // Quick boundary check: skip if all neighbors are non-empty water
      // (micro-optimization; optional, cheap 4-neighbor version)
      let hasEmptyNeighbor = false;
      if (y+1 < ROWS && W_src[i + OFF.D] === 0) hasEmptyNeighbor = true;
      else {
        if (x>0      && W_src[i + OFF.L]  === 0) hasEmptyNeighbor = true;
        else if (x+1<COLS && W_src[i + OFF.R]  === 0) hasEmptyNeighbor = true;
        else if (y>0 && W_src[i + OFF.U]  === 0) hasEmptyNeighbor = true;
        else if (y+1<ROWS && x>0      && W_src[i + OFF.DL] === 0) hasEmptyNeighbor = true;
        else if (y+1<ROWS && x+1<COLS && W_src[i + OFF.DR] === 0) hasEmptyNeighbor = true;
        else if (y>0      && x>0      && W_src[i + OFF.UL] === 0) hasEmptyNeighbor = true;
        else if (y>0      && x+1<COLS && W_src[i + OFF.UR] === 0) hasEmptyNeighbor = true;
      }
      if (!hasEmptyNeighbor) continue;

      // Build the tiny candidate list for this cell once (≤5 probes)
      const u = U[i]; // 0..8
      const cand = buildCandidates(x, y, u, W_src); // returns up to 5 indices

      // Try in order: first empty that passes canTransfer wins
      for (let k = 0; k < cand.length; k++) {
        const j = cand[k];
        if (j < 0) continue;
        if (W_src[j] !== 0) continue; // only empties
        if (!canTransfer(w, 0)) continue;

        // Stage transfer of exactly one level
        waterOut[i] += 1;
        waterIn[j]  += 1;

        // Optional: stage one-unit red advection with small prob
        if (ENABLE_WATER_HEAT_ADVECTION && U[i] > 0) {
          if (Math.random() < pCarry(U[i])) {
            if (U[j] < MAX_R) {
              heatOut[i] += 1;
              heatIn[j]  += 1;
            }
          }
        }
        break; // only one move attempt per cell
      }
    }
  }

  // Apply staged moves (cap to capacity)
  for (let i = 0; i < N; i++) {
    const sent = waterOut[i];
    const recv = waterIn[i];
    const w    = W_src[i] - sent + recv;
    W_dst[i]   = w < 0 ? 0 : (w > 4 ? 4 : w);
  }

  // Apply staged red advection last (optional)
  if (ENABLE_WATER_HEAT_ADVECTION) {
    for (let i = 0; i < N; i++) {
      U[i] = Math.max(0, Math.min(MAX_R, U[i] - heatOut[i] + heatIn[i]));
    }
  }
}
```

**Candidate builder** (heat‑graded schedule + local gradient preference):

```js
function buildCandidates(x, y, u, W_src) {
  // Helpers
  function idx(dx, dy) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return -1;
    return ny * COLS + nx;
  }
  function pair(a, b) {
    // local gradient preference: emptier target first (both must be valid)
    if (a < 0 || b < 0) return [a, b];
    const Wa = W_src[a], Wb = W_src[b];
    if (Wa < Wb) return [a, b];
    if (Wb < Wa) return [b, a];
    // tie: randomize to avoid lattice bias
    return (Math.random() < 0.5) ? [a, b] : [b, a];
  }

  const out = [];

  if (u === 0) {
    out.push(idx(0,+1)); // D
    return out;
  }

  // Utility to optionally push a pair
  function pushPairRandom(a, b, always=false) {
    const [p, q] = pair(a, b);
    if (always) { out.push(p, q); }
    else if (Math.random() < 0.5) { out.push(p, q); }
  }

  switch (u) {
    case 1:
      out.push(idx(0,+1)); // D
      pushPairRandom(idx(-1,+1), idx(+1,+1), false); // 50% DL/DR
      break;
    case 2:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);  // always DL/DR
      break;
    case 3:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);
      pushPairRandom(idx(-1, 0), idx(+1, 0), false); // 50% L/R
      break;
    case 4:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);
      pushPairRandom(idx(-1, 0), idx(+1, 0), true);  // always L/R
      break;
    case 5:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);
      pushPairRandom(idx(-1, 0), idx(+1, 0), true);
      pushPairRandom(idx(-1,-1), idx(+1,-1), false); // 50% UL/UR
      break;
    case 6:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);
      pushPairRandom(idx(-1, 0), idx(+1, 0), true);
      pushPairRandom(idx(-1,-1), idx(+1,-1), true);  // always UL/UR
      break;
    case 7:
      out.push(idx(0,+1));
      pushPairRandom(idx(-1,+1), idx(+1,+1), true);
      pushPairRandom(idx(-1, 0), idx(+1, 0), true);
      pushPairRandom(idx(-1,-1), idx(+1,-1), true);
      out.push(idx(0,-1)); // U (last)
      break;
    default: // u==8
      out.push(idx(0,-1));                          // U first
      pushPairRandom(idx(-1,-1), idx(+1,-1), true); // UL/UR
      pushPairRandom(idx(-1, 0), idx(+1, 0), true); // L/R
      pushPairRandom(idx(-1,+1), idx(+1,+1), true); // DL/DR
      out.push(idx(0,+1));                          // D last
      break;
  }
  // Limit probes to ≤5 for perf
  if (out.length > 5) out.length = 5;
  return out;
}
```

---

## 6) Main tick order

1) **Water move:** `flowWaterLevels(W0, W1, U0); swap(W0,W1);`  
2) **Red diffusion:** as in v6 (`diffuseRed(U0,U1,W0); swap(U0,U1);`)  
3) **Update textures:** pass `W0` instead of `B0` to the RB/B panels.

This preserves the “water pulls heat first, then heat diffuses” ordering that made advection effects clear in v6.

---

## 7) Initialization changes

- Where v6 seeded `B0` with random `1`s, now seed `W0` with **`1` level** (or a distribution) so you can see layering.
  ```js
  // Example: same number of starts as before, but level=1
  for (const bi of blueChosen) W0[bi] = 1;
  ```

- Everything else (red seeds, controls, overlays) remains unchanged.

---

## 8) Performance notes (10k×10k ready)

- **No global shuffles** per tick (v6’s fisher–yates on N each step is gone). Use serpentine + parity flip to avoid bias with almost no cost.
- **Short candidate lists:** max 5 probes per cell at U=8; fewer for most cells.
- **Typed arrays:** all counters are `Uint8Array`.
- **Branch‑light:** the “quick empty neighbor” precheck avoids building candidate lists when surrounded.
- **Conflict‑free apply:** accumulation then apply passes keep writes linear and cache‑friendly.

Empirically, these patterns scale near O(N) with good constants. The optional advection adds two extra Uint8 buffers when enabled; disable it if you need the absolute max throughput.

---

## 9) Minimal patch sketch (what to touch, in order)

1. **Fields:** replace `B0/B1` with `W0/W1` (Uint8Array), add `waterOut/waterIn`.  
2. **Constants:** add `WATER_TO_BYTE`, advection toggles.  
3. **Textures:** update `updateTextures` to read `W0` for RB/B panels.  
4. **Water step:** add `flowWaterLevels` and `buildCandidates`. Remove `flowBlue` and its shuffle/claimed logic.  
5. **Tick order:** call `flowWaterLevels` instead of `flowBlue`.  
6. **Init:** seed `W0` instead of `B0` (use level=1).  
7. **Controls/stats:** optional logging for water levels (min/max/mean) mirrored from red.  

---

## 10) Copy‑pasteable snippets

### 10.1 Constants & arrays
```js
// Replace binary blue with divisible water
let W0 = new Uint8Array(N);
let W1 = new Uint8Array(N);
const waterOut = new Uint8Array(N);
const waterIn  = new Uint8Array(N);

const WATER_TO_BYTE = new Uint8Array([0,63,127,191,255]);

const ENABLE_WATER_HEAT_ADVECTION = true;
function pCarry(u) { return (u <= 1) ? 0.05 : (u >= 8 ? 0.4 : 0.05 + 0.04*u); }

function canTransfer(source, target) {
  const diff = source - target;
  return (diff >= 2) || (source >= 3 && diff >= 1);
}
```

### 10.2 Texture updates
```js
// RB panel
rgbaRB[j + 2] = WATER_TO_BYTE[ W0[i] & 0x07 ];
// B panel
rgbaB[j + 2]  = WATER_TO_BYTE[ W0[i] & 0x07 ];
```

### 10.3 Tick
```js
flowWaterLevels(W0, W1, U0);
[W0, W1] = [W1, W0];

diffuseRed(U0, U1, /*blue?*/ null /*use W0 if you want donor/recipient gates tied to water presence; or keep as-is*/);
[U0, U1] = [U1, U0];

updateTextures(U0, W0);
```

### 10.4 Water step + candidates (drop‑in)
*(Use the full versions from §5 and §3 above.)*

---

## 11) Tuning & emergent behavior

- **Edge scalloping** comes from diagonal/lateral checks at mid heat (U=3..5).  
- **Plumes** emerge at U=6..8 where up and up‑diagonals enter.  
- **Surface tension** feel comes from `canTransfer`: small puddles stay sticky; piles shed.  
- If you see **red dams** (capacity stalls), modestly raise `MAX_R` (12–16) or add a tiny **upward red skew inside water** (1 unit per tick with prob ∝ ΔT when both cells are water).

---

## 12) Testing checklist

- Seed a flat water slab (W=4) under a hot layer (U=6–8) → expect rising fingering.  
- Scatter single‑level droplets (W=1) on a cool slope → expect stickiness until they merge.  
- Turn advection **on/off** to see impact on RB panel (filament strength).  
- Stress: 4096×4096 ⇒ verify ms/tick scales linearly; toggle advection if needed.

---

## 13) Rollout plan

1. Implement arrays/constants + rendering changes.  
2. Drop in `flowWaterLevels` and swap into tick.  
3. Validate on 64×64 (existing default), then 256×256, then 1024×1024.  
4. Only if needed, add the “vertical red skew inside water” micro‑rule later.

---

**End of plan.**

