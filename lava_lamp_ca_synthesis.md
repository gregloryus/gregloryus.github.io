# Minimal, elegant “lava lamp” CA sim (1000×1000 @ decent FPS) — synthesis + critique

You want: **wax heats at bottom → becomes buoyant → pinches off and rises as a blob → cools at top → falls as a blob → reheats and re-merges**. On a 2D lattice, that loop emerges reliably only if you include a small set of “physics-like” ingredients _and_ structure the GPU pipeline to avoid race conditions.

This doc:

- **critiques the two AI proposals** you shared (Claude + Gemini),
- **keeps the best ideas**, and
- **recommends a minimal architecture** with two viable “tracks” (simple CA vs fluid-on-lattice), tuned specifically for _blobs_ and _convection cycles_.

---

## 1) Critical take on Claude vs Gemini

### Claude: “Skip LBM; use local buoyancy + velocity + advection”

**What’s good**

- Correct that the **core loop is temperature → density inversion → buoyancy**.
- Correct that **GPU ping‑pong textures** are the standard pattern at 1e6 cells.
- Correct that you can often **avoid a global pressure solve** for plausible visuals.

**What’s risky / incomplete**

- Storing `vx, vy` and updating them from local density gradients **does not automatically give you incompressibility** or coherent convection cells. It tends to:
  - accumulate divergence (compress/expand artifacts),
  - create noisy drift rather than smooth rolls,
  - and—most importantly for you—**it won’t keep wax as blobs** without an explicit “surface tension / anti-diffusion” mechanism.
- “Branchless” shader advice is directionally fine, but in practice on modern GPUs:
  - a couple of conditionals are okay if they’re coherent,
  - bandwidth is usually the limiter, not branching.

**Bottom line**
Claude’s approach is a good _skeleton_ but underspecifies the one thing you care about most: **cohesive blobs that detach and re-merge**.

---

### Gemini: “LBM D2Q9 + scalar wax concentration + sharpening”

**What’s good**

- LBM is indeed _the_ “lattice-native fluid” approach: local stencil, massively parallel, easy on GPU.
- The **Boussinesq buoyancy force** coupling temperature to vertical acceleration is a clean way to generate convection.
- The key gem: treating wax as a **passively advected scalar field C** _plus_ an **edge-preserving / sharpening step** (Cahn‑Hilliard-ish “phase field” logic) to keep blobs crisp.

**What’s risky / overconfident**

- “Runs easily at 60fps” depends on:
  - how many textures/passes you use,
  - whether you use float16 vs float32,
  - how aggressively you sample neighbors,
  - and your platform (Metal compute is great; WebGL fragment-only is tighter).
- “You must use GPU compute shaders” is overstated:
  - WebGL2 can do this fine with fragment shaders + FBO ping‑pong.
  - Metal compute is nicer, not mandatory.

**Bottom line**
Gemini’s proposal is **closest to a reliable lava lamp**: convection from a real-ish velocity field + blobs from phase-field/sharpening. The “true Shan‑Chen multiphase” is awesome but _not_ minimum viable.

---

## 2) The _actual_ minimum ingredients (non-negotiables)

If I had to bet on what you’ve been missing in prior attempts: **a blob-preserving mechanism** (surface tension / anti-diffusion / cohesion energy). Without it, wax becomes fog or foam.

Minimum fields (per cell):

1. **Temperature `T`**
   - heated at bottom boundary, cooled at top boundary
   - diffuses slowly (thermal inertia)
2. **Wax “concentration” `C`** (0..1)
   - 1 = wax, 0 = carrier fluid
   - must stay sharp-edged (surface tension surrogate)
3. **A flow field** (either explicit velocity `u = (ux, uy)` _or_ implicit “swap rules”)
   - needed for convection rolls and coherent transport

You can get the cycle with:

- **Boussinesq buoyancy**: warm regions experience upward force; cool regions downward.
- **Edge-preserving `C` dynamics**: to form and keep blobs.
- **Viscosity/damping**: to avoid jitter and explosive turbulence.

---

## 3) Two viable architecture tracks

### Track A — “Pure CA blobs” (simplest; most elegant; less “fluid”)

If you want a _cellular-automata vibe_ and are okay with convection being “suggested” rather than physically accurate:

State per cell:

- `T` (8–16-bit fixed)
- `C` (8–16-bit fixed)
- optional: `m` (1 byte momentum/cooldown)

Update idea:

- Use **biased local swaps** (like falling-sand), but bias wax movement up/down based on `T` and enforce cohesion.

Core trick: moves are scored by a cheap “energy”:

- Buoyancy wants warm wax to go up.
- Gravity wants cool wax to go down.
- Cohesion wants wax to move where it gains wax neighbors (reduces perimeter).

This can absolutely produce:

- detaching blobs,
- rising/falling,
- re-merging,
  but convection rolls will be less “fluid-dynamical” and more “life-like slime”.

When Track A is ideal:

- You care most about _emergence + simplicity_.
- You want minimal state and minimal math.
- You’re okay with tuning a few heuristic weights.

---

### Track B — “Lattice fluid + phase field” (most reliable lava-lamp loop)

This is the best synthesis of Claude + Gemini:

- Use a **lattice-native fluid** for `u`:
  - simplest robust choice: **LBM D2Q9** (BGK collision).
- Advect `T` and `C` as scalars in that flow.
- Add:
  - **buoyancy force** from `T` into the fluid,
  - **phase-field / sharpening** to keep `C` blob-like.

When Track B is ideal:

- You care most about **elegant convection cycles** and “real” rolls.
- You want blobs that look like wax, not fog.
- You’re okay with a bit more state (still local and very GPU-friendly).

---

## 4) Final recommendation (what I’d build first)

If your goal is “minimum things to consider” + “works at 1000×1000 on iPhone/Mac”:

**Start with Track B, but the _cheapest version_:**

- LBM D2Q9 for velocity (not Shan‑Chen multiphase)
- Scalar wax `C` + scalar temp `T`
- A _single_ sharpening step each tick (phase-field-lite)
- Heat bottom / cool top
- Render iso-surface of `C`

This hits your exact lava-lamp narrative with the fewest “mystery knobs”.

Certainty (Bayesian):

- 0.8 that Track B gets you to satisfying lava behavior fastest.
- 0.6 that Track A can match it with enough tuning, but with more “why is it doing that?” debugging.

---

## 5) Minimal update loop (Track B)

Think in **passes** over the grid (GPU-friendly, ping‑pong buffers).

### Pass 0 — boundary conditions (cheap, fused if possible)

- Bottom band: `T = 1`
- Top band: `T = 0`
- Optionally: side boundaries periodic, or reflective.

### Pass 1 — LBM collision + forcing (buoyancy)

- Compute macroscopic `rho` and `u` from distributions `f0..f8`.
- Apply buoyancy force:
  - `Fy = beta * (T - T_ref)`
  - `Fx = 0` (or tiny noise)
- Update equilibrium and relax via BGK with viscosity via `tau`.

### Pass 2 — LBM streaming

- Shift `fi` to neighbor in direction `ei` (classic D2Q9 stream).

### Pass 3 — Advect scalars `T` and `C`

- Semi-Lagrangian backtrace with `u`:
  - `x' = x - u * dt`
  - sample `T(x')`, `C(x')` (bilinear)
- Add thermal diffusion for `T` (very small stencil) or a cheap Laplacian term.
- Add mild diffusion for `C` (optional; sharpening will counter it).

### Pass 4 — Sharpen / surface-tension surrogate for `C`

This is the “keep blobs crisp” step.

Minimum viable “phase-field-lite”:

- Compute a Laplacian `L = laplace(C)`
- Apply:
  - `C += k1 * L` (diffusion)
  - `C -= k2 * laplace(L)` (anti-diffusion / interface sharpening)

That second term is the key: it’s the cheap flavor of Cahn–Hilliard without doing a full solver. It tends to:

- pull `C` toward 0/1,
- keep interfaces thin,
- encourage blob-like domains.

Clamp `C` to [0,1].

(If you want even cheaper: a “compression” heuristic that nudges `C` toward {0,1} based on neighbor average, but the Laplace–biLaplace combo behaves better.)

### Render

- Shade by `C` (wax amount) and optionally `T` (glow).
- Optional: compute normals from ∇C for a blobby “gel” look.

---

## 6) Minimal update loop (Track A)

If you decide you want _pure CA_:

Per tick:

1. Update `T` (diffuse + boundary).
2. For each cell in a checkerboard pattern (to avoid conflicts):
   - If `C > 0.5` (wax cell), pick a candidate move among {up, up-diag, down, down-diag, sideways}.
   - Score move by:
     - `+ w_buoy * buoyancy(T)` if moving up
     - `+ w_grav * (1 - buoyancy(T))` if moving down
     - `+ w_cohesion * (neighbors_wax_after - neighbors_wax_before)`
     - `- w_shear` if it would thin a neck (optional)
   - Execute swap if score > threshold and RNG gate passes (viscosity).
3. Optional: tiny smoothing step on `C` + re-thresholding (a crude surface tension).

This can be extremely fast and very “emergent”, but the tuning space is more artisanal.

---

## 7) Performance checklist for 1000×1000

### Non-negotiable: ping‑pong buffers

- Never read and write the same texture in a pass.
- Maintain `A` and `B` textures for each state field.

### Keep passes low

- Target **3–5 full-grid passes** per tick.
- Fuse where practical (e.g., boundary + diffusion).

### Prefer float16 where possible

- `RGBA16F` often gives a big bandwidth win vs float32.
- For Track A you can pack into `RGBA8`/`RGBA16` easily.

### Neighbor taps budget

- Each pass should try to stay near:
  - 5-tap (von Neumann) or 9-tap (Moore)
- Phase-field sharpening can be the most expensive; keep it tight.

### Avoid race conditions

- Track B: ping‑pong solves it naturally.
- Track A: use checkerboard updates or a two-step “propose then apply”.

### Practical platform note

- If you’re in JS + Pixi/WebGL: fragment shader CA is the sweet spot.
- If you’re native iOS/macOS: Metal compute is the sweet spot.
- WebGPU is great if you’re already there, but not required.

---

## 8) The tuning knobs that matter (and what they do)

Start with these, and only these:

- `heatBottom` / `coolTop`: sets cycle frequency
- `thermalDiffusion`: higher = mushier heat, slower detach; lower = snappier detaches
- `beta` (buoyancy strength): higher = stronger rise/fall, more turbulence
- `viscosity` (LBM via `tau`, or CA via mobility/damping): higher = blobbier, slower, less breakup
- `sharpenStrength` (`k2` in bi-Laplacian step): higher = cleaner blobs, too high = “crystalline” artifacts
- `dt`: too high blows up advection; keep small

What you’re aiming for:

- convection rolls that are slower than blob motion,
- blobs that can stretch but not atomize,
- detach events when a neck gets thin + buoyancy is high.

---

## 9) Common failure modes (so you can diagnose fast)

1. **Wax turns into fog**

- `C` is diffusing with no sharpening / surface tension surrogate.

2. **Wax becomes one vertical column and never pinches off**

- Too much cohesion / surface tension; too little shear/neck instability.
- Or too low thermal gradient: everything rises as one mass.

3. **Everything jitters / explodes**

- Too high buoyancy or dt.
- Too low viscosity/damping.

4. **Convection is weak or absent**

- Buoyancy not coupled into fluid properly (Track B),
- or you’re not maintaining a coherent flow field (Track A).

---

## 10) What I’d do in your shoes (a pragmatic plan)

1. Implement **Track B minimal**:
   - LBM D2Q9 + buoyancy forcing
   - advect `T` and `C`
   - add phase-field-lite sharpening
2. Get _any_ blob cycle working at 256×256.
3. Scale to 512×512 and tune for stability.
4. Scale to 1000×1000 and optimize:
   - reduce passes,
   - reduce taps,
   - move to float16,
   - fuse passes where possible.

Once it works, you can decide whether the added elegance of true multiphase (Shan‑Chen) is worth it.

---

## 11) Quick questions (only if you feel like answering)

Not required, but if you answer these, I can give you a much more concrete “do this, not that” parameter set:

- Are you implementing in **WebGL/Pixi** or **Metal**?
- Do you want wax to be strictly binary (0/1) or allow intermediate `C` for smooth rendering?
- Do you want boundaries: **periodic sides** (torus) or a glass container (no-slip walls)?

### OUTPUT FROM GEMINI PASTED BELOW:

I apologize for the glitch. Since the download failed, here is the full specification directly. You can copy-paste this into your own `.md` file or just use it as your implementation blueprint.

---

# Emergent Lava Lamp: High-Performance CA Architecture

This specification outlines the most elegant, performant approach to simulating a "lava lamp" on a 1000x1000 grid using modern GPU shaders. It bypasses complex fluid dynamics (Navier-Stokes) in favor of **statistical mechanics** (Kawasaki Dynamics).

### 1. The Core Concept: Energy Minimization

Instead of calculating forces and velocities, we calculate **Energy Cost**. The system evolves by randomly swapping pixels to lower its total energy.

The total Energy () of a pixel is determined by three factors:

1. **Gravity:** Wax wants to be at the bottom (Energy increases with height ).
2. **Buoyancy:** Hot Wax wants to be at the top (Energy decreases with height if is high).
3. **Surface Tension:** Wax hates touching Oil (Energy increases for every unlike neighbor).

### 2. The Data Structure

You need **Double Buffering** (Ping-Pong textures). You read from `Texture A` and write to `Texture B`, then swap.

**Texture Format:** `RGBA16F` (Float16 is sufficient and faster).

- **R (Phase):** `1.0` = Wax, `0.0` = Oil.
- **G (Temperature):** `0.0` to `1.0`.
- **B (Visuals):** A temporal smoother (running average of R) for rendering, so it looks like liquid, not sand.
- **A (Unused):** Padding.

### 3. The Parallelism Strategy: Checkerboard Update

To avoid race conditions (two pixels swapping into the same spot), we update the grid in a **Checkerboard Pattern** (Red/Black).

- **Frame N (Red Pass):** Only process pixels where `(x+y) % 2 == 0`.
- **Frame N (Black Pass):** Only process pixels where `(x+y) % 2 != 0`.

### 4. The Algorithm (Per Frame)

#### Pass 1: Thermal Diffusion (Compute or Fragment Shader)

_Simple heat transfer. No swapping yet._

1. Sample `Temperature` from self and 4 neighbors (Up, Down, Left, Right).
2. Apply standard diffusion: `NewT = T + k * (AverageNeighborT - T)`.
3. **Boundary Conditions:**

- If `y == 0` (Bottom): Force `T = 1.0` (Heater).
- If `y == 1000` (Top): Force `T = 0.0` (Cooler).

#### Pass 2: Phase Transition (The "Move")

_This is the magic step. Run this on Red pixels, then Black pixels._

For the current pixel `P`, pick **one random neighbor** `N` (Up, Down, Left, or Right).
If `P.Phase == N.Phase`, **do nothing**.
If they are different (one Wax, one Oil), calculate the **Change in Energy ()** if they were to swap.

**The Energy Formula:**

1. **Gravity/Buoyancy Term:**

- Base gravity pulls Wax down.
- Temperature pushes Wax up.
-
- _Logic:_ If moving UP decreases Energy (because it's hot), the swap is favored.

2. **Surface Tension Term (The Ising Model):**

- Count how many _unlike_ neighbors `P` currently has ().
- Count how many _unlike_ neighbors `P` would have if it moved to `N`'s spot ().
-
- _Logic:_ If moving makes me surrounded by more friends (Wax touching Wax), Energy goes down.

**The Swap Decision (Metropolis Condition):**

- If (Energy decreases): **SWAP 100%.**
- If (Energy increases): **SWAP with probability .**
- _Note:_ This "Temperature" here refers to system noise (randomness), distinct from the fluid heat. Usually, keep this low or zero for sharp blobs.

### 5. Shader Logic (Pseudo-Code)

```glsl
// Fragment Shader running on Red/Black checkerboard pixels
void main() {
    ivec2 self_coord = gl_FragCoord.xy;
    ivec2 neighbor_coord = get_random_neighbor(self_coord, time_seed);

    vec4 self_data = texelFetch(StateTexture, self_coord, 0);
    vec4 neighbor_data = texelFetch(StateTexture, neighbor_coord, 0);

    float self_phase = self_data.r;
    float neighbor_phase = neighbor_data.r;
    float self_temp = self_data.g;

    // Optimization: If phases are same, no need to calculate physics
    if (self_phase == neighbor_phase) {
        FragColor = self_data;
        return;
    }

    // 1. Calculate Buoyancy Force
    // Wax (1.0) wants to go up if Hot, down if Cold.
    // We simplify: Effective Gravity = Base_G - (Lift_Coeff * self_temp)
    float eff_gravity = 0.05 - (0.08 * self_temp);

    // Height difference (1 if neighbor is above, -1 if below)
    float dy = float(neighbor_coord.y - self_coord.y);
    float d_energy_grav = dy * eff_gravity * (self_phase - neighbor_phase);

    // 2. Calculate Surface Tension (Hamiltonian)
    // Count unlike neighbors at current spot vs target spot
    float current_tension = count_unlike_neighbors(self_coord, self_phase);
    float future_tension = count_unlike_neighbors(neighbor_coord, self_phase);
    float d_energy_surf = 1.2 * (future_tension - current_tension);

    // 3. Total Energy Change
    float dE = d_energy_grav + d_energy_surf;

    // 4. Swap Logic
    bool swap = false;
    if (dE < 0.0) {
        swap = true; // Always swap if energy improves
    } else {
        // Occasional random swap against logic (simulates "Brownian motion")
        float noise_temp = 0.1;
        if (random_float() < exp(-dE / noise_temp)) swap = true;
    }

    // Output
    if (swap) {
        // I become the neighbor
        FragColor = neighbor_data;
    } else {
        // I stay myself
        FragColor = self_data;
    }
}

```

### 6. Tuning & "Magic Numbers"

To get the "Lava Lamp" look, tune these specifically:

- **Grid Size:** 1000 x 1000
- **Time Step:** Run 4-8 swap passes per rendered frame for smoothness.
- **Coupling ():** Make sure the Lift force at Max Temp is _stronger_ than Gravity.
- _Example:_ Gravity = 0.05, Lift at Max Temp = 0.08. Net upward force = -0.03.

- **Surface Tension ():** This is the most critical value.
- _Too Low:_ Wax dissolves into "grey noise" or mist.
- _Too High:_ Wax forms perfect squares/circles and refuses to deform or detach.
- _Sweet Spot:_ The wax should "wobble." It needs to struggle slightly against surface tension to pinch off.

### 7. Why This Wins

1. **No Pressure Solver:** The most expensive part of fluids (solving Poisson equations) is deleted.
2. **Scalable:** It runs at O(1) per pixel. 1000x1000 is trivial for a modern GPU.
3. **Emergent Topology:** You don't have to program "detachment" or "merging." It happens naturally because minimizing surface area () naturally favors circles, and pulling them apart naturally creates a "neck" that snaps.
