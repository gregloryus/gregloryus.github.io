# Red–Blue CA (Field‑Only, Local Rules)

> **Scope:** Only red (heat) and blue (water). Fully local, field‑based, no hidden state, cardinal neighbors only. Integer heat with cap 8; water is binary. Designed to scale without OOP particles.


## 0) State & Rendering
- **Grid:** 2D lattice; 4-neighbor (N/E/S/W) interactions only.
- **Fields per cell:**
  - `R ∈ {0..8}` — integer heat units (**also your temperature**).
    - **Render:** map `0..8` → `0..255` in 8 steps: `0, 31, 63, 95, 127, 159, 191, 223, 255`.
  - `B ∈ {0,1}` — water present? `1 = water`, `0 = air` (air is just “no blue”).
    - **Render:** `0 → 0`, `1 → 255` in the blue channel.
- **Conservation:** unless a rule says otherwise, total heat `ΣR` is conserved.


## 1) Core Heat Transfer (random‑walk diffusion)
- **Idea:** every tick, heat tries to move **one unit** from a donor cell to **one randomly chosen** cardinal neighbor *if* that neighbor is cooler.
- **Cooling test:** neighbor is eligible if `R_neighbor < R_donor` **and** `R_neighbor < 8` (can accept one more unit).
- **Ping‑pong permitted:** equal temps don’t move; near‑equal regions may flicker, which is intentional.


## 2) Medium Speeds (air fast, water slow)
Set a single tunable constant:
- `WATER_TICK_PROB = 0.10` (or `0.01` etc.)

**Donor gate (first check, based only on the donor):**
- **Air donor (`B=0`):** attempts **every tick** (prob = 1).
- **Water donor (`B=1`):** attempts **with probability** `WATER_TICK_PROB`.

This alone makes diffusion in water much slower than in air.


## 3) Cross‑Boundary Balance (air ↔ water)
Use a **recipient gate only for air→water** so crossings are balanced without extra bookkeeping:

- When an **air donor** (`B=0`) tries to give one unit to a **water neighbor** (`B=1`), require the **recipient** to pass the same gate: with probability `WATER_TICK_PROB`, the water cell “accepts” the unit; otherwise the transfer fails.
- Other pairings use only the donor gate:
  - **air→air:** donor gate only (always attempts; succeeds if neighbor cooler),
  - **water→water:** donor gate only (prob = `WATER_TICK_PROB`),
  - **water→air:** donor gate only (prob = `WATER_TICK_PROB`).

**Why this works:** effective crossing rate air→water is `1 × WATER_TICK_PROB`; water→air is `WATER_TICK_PROB × 1`. They match, so no hidden bias at equal conditions.


## 4) Blue Movement Carries Red (advection; still field‑only)
When a water cell moves from `i → j` during a tick, it can transport some of the local heat **without** any object memory. Pick one of these strictly local carry modes:

- **(4A) Fractional carry from the source (recommended)**
  - `carry = round(β * R[i])`, with `β ∈ [0,1]` (e.g., `β=0.5`).
  - Deposit into `j` up to capacity:  
    `space = 8 - R[j]`; `moved = min(carry, space)`;  
    `R[i] -= moved`; `R[j] += moved`.
  - **Remainder handling (to conserve ΣR):**
    - `remainder = carry - moved`.
    - Try to **spill** remainder to `j`’s cooler neighbors (one unit at a time). If no neighbor can accept, **return** the remainder to `i` (i.e., leave it behind).

- **(4B) Probabilistic per‑unit pickup (granular look)**
  - For each of the `R[i]` units, move it with probability `β_unit` (e.g., `0.5`), subject to the capacity/overflow rule above.

- **(4C) Quota carry (bounded multi‑unit)**
  - Move up to `CARRY_MAX` units from `i` (e.g., `CARRY_MAX=3`) each time the blue moves, ignoring units above that quota this tick; obey capacity/overflow.

> **Notes**
> - All options are **purely local** (only `R[i]`, `R[j]`, and `j`’s immediate neighbors for spill).
> - No special handling is needed for water→water vs water→air moves; the carry is tied to **B’s movement**, not the medium you’re entering.
> - Place the carry step **before** diffusion each tick (see §6). The next tick, if blue moves again, it can carry whatever is now in its current cell—so heat “follows” the moving water naturally.


## 5) What happens when blue moves through ambient diffuse heat?
- **Uniform low background (`R≈1–2` everywhere):**
  - With `β` moderate/high, blue **skims** heat along its path, leaving a **slightly cooler wake** and a **warmer streak** that moves with it; diffusion in air gradually fills the wake.
  - With small `β` or quota carry, you get a gentle **smear** instead of a deep wake.
  - With probabilistic pickup, the trail looks **speckled** but averages to the same effect.

- **Crossing a gradient (hot→cold):**
  - Carry amplifies apparent advection: a **warm lobe** rides with blue into the colder region; subsequent diffusion blurs it.
  - Since ΣR is conserved and there’s no source/sink, the global field still tends toward **uniform `R`** if blue eventually stops or wanders ergodically.

- **Steady transit (blue keeps moving forever):**
  - In the lab frame, you’ll see a **traveling warm feature** plus a faint cool wake; in the moving frame (co‑moving with blue), the pattern is quasi‑steady.


## 6) Exact Per‑Tick Procedure (updated)
For each tick (randomized donor order recommended; or synchronous with a delta buffer):

1) **Move blue** (apply your own blue motion rule). For each `i→j` move, apply **one** carry mode from §4 (A/B/C). Handle capacity and remainder locally.
2) **Diffuse red** via §1 and §2 (donor gate by medium) + §3 (recipient gate only for air→water).
3) **Clamp**: enforce `R ∈ [0..8]` after all writes. If you implemented “spill,” you should not need to discard heat; otherwise, leave the unplaced remainder at the source to conserve ΣR.


## 7) Constants & Defaults (easy to tweak)
- `WATER_TICK_PROB = 0.10`  (set to `0.01` for ~100× slowdown)
- **Carry:** choose one mode; defaults:
  - `β = 0.5` for Fractional carry (4A), *or*
  - `β_unit = 0.5` for Probabilistic (4B), *or*
  - `CARRY_MAX = 3` for Quota (4C)
- Random neighbor choice for diffusion = uniform over {N,E,S,W}
- Heat cap per cell = 8
- Rendering (R): `0,31,63,95,127,159,191,223,255`
- Rendering (B): `0` or `255`


## 8) Tiny Pseudocode Snippet (carry + diffusion)

```pseudo
// ---- 1) blue movement + carry (mode 4A shown) ----
for each blue move i -> j this tick:
  carry = round(β * R[i])
  space = 8 - R[j]
  moved = min(carry, space)
  R[i] -= moved
  R[j] += moved
  remainder = carry - moved
  while remainder > 0:
    n = pick_random_neighbor_of(j)
    if n != OUT and R[n] < 8 and R[n] < R[j]:
      R[n] += 1; remainder -= 1
    else:
      // no local sink found this attempt; break and leave remainder at i
      break
  // if remainder still > 0: R[i] += remainder  // keep conservation

// ---- 2) red diffusion (donor-gated; recipient gate only for air->water) ----
for cells in random order:
  if R[i] == 0: continue
  if B[i]==1 and rand() >= WATER_TICK_PROB: continue  // donor gate

  dir = random_choice([N,E,S,W]); j = neighbor(i, dir)
  if j == OUT: continue
  if R[j] >= R[i] or R[j] >= 8: continue

  if B[i]==0 and B[j]==1 and rand() >= WATER_TICK_PROB: continue  // recipient gate

  R[i] -= 1; R[j] += 1

// ---- 3) clamp (should be no-ops if capacity checks are correct) ----
for all cells: R[i] = clamp(R[i], 0, 8)
```

**Result:** Heat remains a field with integer units; water movement *advects* heat locally (multi‑unit if you choose), and diffusion continues to smooth, all without hidden state or OOP particles.
