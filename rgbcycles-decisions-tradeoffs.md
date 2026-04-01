# RGBcycles: key decisions + trade-offs (Feb 17, 2026)

This doc captures the *decisions you actually need to make*, plus the main consequences and “why this feels confusing” points we hit in the thread.

---

## 0) Terms (so we stop talking past each other)

- **Field**: one layer (R / G / B) with an excitation present or absent per cell (plus optional tiny memory like direction).
- **Coupling**: a *process-state* where multiple field excitations co-occupy a cell and (optionally) behave like a composite that moves together until it decouples. (“Processes are not objects.”)
- **Transmutation**: a rule that converts excitation type (e.g. G → R) while conserving some chosen global quantity.
- **Per-field conservation**: each of R, G, B has a fixed total count (no cross-field conversion).
- **Phase-based (total) conservation**: total (R+G+B) is conserved, but excitations can convert among fields (R ↔ G ↔ B).

---

## 1) The core architectural decision

### Decision 1: What is conserved?

**Option A — Per-field conservation (independently conserved R, G, B)**
- Allowed:
  - R, G, B move around; can co-occupy; can couple; can decouple.
  - “Fire spread” (if it exists) can only happen via *transfer* of R from one G to another (since R cannot be created from G).
- Disallowed:
  - Any G → R chain reaction.
  - Any true R → B condensation, B → G growth, etc.

**Option B — Phase-based conservation (R+G+B conserved; allow conversions)**
- Allowed:
  - The cycle: **G → R (burn), R → B (condense/boil), B → G (absorb/grow)**.
  - Clear “fuel gets used up” semantics *without* adding a 4th “ash/fuel” bit.
  - A natural place for **LIFE = (R+G+B)** as a special stable coupling process (optional, but coherent).

---

## 2) Why per-field conservation feels weird for “fire” (your ash re-ignition objection)

If you model “burn” as **R transfers from G to adjacent G**, then:
- The *source* cell becomes “ash” (G-only),
- But it’s still just **G**, so the new adjacent BURN can immediately transfer back and “re-ignite” the old cell.

This is not “wrong” mathematically — it’s a consequence of “G has no internal state” — but it *does* fight the intuition that “spent fuel” becomes refractory.

You explicitly dislike “add a fuel/ash bit,” which would fix it but adds a fourth hidden element.

So if you choose Option A (per-field), you need **one** of these *non-4th-element* fixes:

- **A1: Spatial displacement as the ‘spent’ mechanism**
  - When R transfers to ignite a neighbor, the old G is forced (if possible) to *move away* (down via gravity, or sideways) in the same step.
  - The “ash” is not chemically different; it’s just physically moved so immediate re-ignition is harder.

- **A2: Wetness-as-refractory via existing B**
  - Burning transfers tend to leave/attract B into recently burned regions (no new B created; it just gets redistributed).
  - Then “burning requires dry G” means most ash becomes non-burnable *because it’s usually wet*, not because it has a new bit.

- **A3: Minimal directional memory only for the R-part of BURN**
  - A BURN composite has a momentum/heading bias so it “moves on” rather than ping-ponging.
  - This is still extra state, but it’s “motion memory,” not “fuel/ash identity.”

If you refuse all three, then “ash is still flammable” is basically unavoidable under strict per-field conservation.

---

## 3) The “Toggle A” confusion (what it *actually* is)

There isn’t a real “toggle” called “decouple vs transmute.”

In the current phase-transmutation conception (and in your rgbcycles v3 UI), **decoupling and transmutation are separate stochastic processes** that can both be enabled:
- Decoupling rates: per coupled-state (BURN/BOIL/FREEZE/LIFE) “1/n per tick.”
- Transmutation rates: per coupled-state “1/n per tick” converting one field into another.

So “BURN has a chance to both decouple and transmute” just means:
- In one tick, a BURN cell might decouple,
- In another tick (or the same tick, depending on ordering), it might transmute G→R,
- These aren’t mutually exclusive design philosophies; they’re just two knobs.

---

## 4) Binary vs small integers (what actually has to change)

### The crisp answer
- **You can keep R as pure binary.**
- **You can keep B and G as “binary existence + tiny auxiliary memory,”** rather than full multi-level intensities.

That’s already reflected in the design notes:
- B really wants a direction/momentum bit for pooling-like lateral behavior when blocked.
- G really wants a few bits for “heading” if you want vascular-like channeling.

So you do **not** need “R/G/B ∈ {0..8}” unless you specifically want:
- Per-cell “pressure/temperature/wetness” gradients,
- Multi-unit stacking within one cell,
- Continuous-ish diffusion rather than discrete particle motion.

### If you *did* want the simplest non-binary scale
- **2 levels**: basically binary again.
- **3–4 levels**: enough for “dry / wet / saturated” or “cool / warm / hot” *but* it’s the start of semantic bloat.
- My take: only introduce multi-level if you can name each level with a very crisp mechanical meaning, not vibes.

---

## 5) Pooling: what I meant (and why it’s not “water-only” in principle)

“Pooling” wasn’t “water must pool because physics.”
It was shorthand for: **do you want B to form coherent basins and surfaces rather than jittery grains?**

In a gravity side-view CA:
- **Binary B can still pool** (a pool is just many B cells stacked).
- The extra “momentum” bit makes pools feel less like random noise and more like liquid flow (spreads consistently when blocked).

So pooling is not a new priority; it’s just one of the aesthetic/behavioral consequences of “does B have momentum memory or not.”

---

## 6) Coupling semantics (your preference)

You want:
- Co-occupancy to imply a **composite** that can move as one entity,
- And composite movement to feel like a *composition* of constituent movement rules,
- With decoupling meaning they can later move independently again.

That is compatible with both Option A and Option B.

The point of Option B isn’t “coupling only exists to trigger transmutation.”
It’s: **coupling is the thing; transmutation is one possible slow reaction while coupled.**

---

## 7) Complexity / performance / emergence: A vs B (rough, but actionable)

### Option A (per-field conserved + vascular G; no explicit LIFE = RGB)
- **Complexity**: medium-high if vascular G is real (needs G heading rules, R/B channeling, stability).
- **Performance**: great (no extra passes needed beyond movement + coupling/decoupling).
- **Emergent pattern odds**:
  - High for *interesting flow fields* (convection-ish, channeling, standing-wave-ish).
  - Lower for “self-propagating organisms with selection” unless you add a strong “organism boundary” mechanism.
- **Main risk**: you get beautiful motion but it never locks into durable “entities.”

My credence: ~0.55 that you’ll get “cool visuals,” ~0.25 that you’ll get “organism-like persistence” without adding additional structure.

### Option B (phase transmutation + LIFE as special tri-coupling)
- **Complexity**: medium (because the rules are conceptually clean even if there are more of them).
- **Performance**: still good; you’ll do a couple passes (move, decouple, transmute) but it’s all O(N).
- **Emergent pattern odds**:
  - High for “self-sustaining oscillators,” patch mosaics, and SOC-ish cascades.
  - Higher chance of “selection pressure” because staying in LIFE can literally be survival.

My credence: ~0.7 that you’ll get “interesting emergent cycles” quickly, ~0.45 that you can get proto-organisms once LIFE is tuned.

### My opinion (with the caveat I can reframe neutrally)
If your goal is *synthesizing* the themes into a single coherent ecosystem, **Option B is the cleaner spine**. It resolves your ash/flame confusion without introducing a 4th bit, and it gives you obvious levers for stability/selection.

---

## 8) The “protected G chain connected to LIFE” idea

As stated (“any G connected via an unbroken chain to LIFE becomes protected”), it’s **non-local**:
- You’d need connectivity queries (flood fill / union-find) each tick, which is expensive and conceptually breaks the “local rules” vibe.

The local approximation that keeps the spirit:
- **Only protect G that is adjacent to LIFE** (von Neumann neighborhood).
- Or: LIFE locally reduces decoupling and/or transmutation rates in a 1-cell radius.

This captures “LIFE stabilizes its vasculature” without global graph traversal.

---

## 9) Gravity strength: do you need it?

If your rule is “if empty below, fall 1 cell per tick,” gravity strength is effectively 1.

A “strength” parameter only matters if you want:
- Probabilistic falling (fall with probability p),
- Multi-cell per tick falling (accelerating),
- Or density-based swapping between particle types.

So: you can ignore “gravity strength” for now and just define per-field fall priorities.

---

## 10) The “super simple branch” you proposed (and how it relates)

Your simplified sketch:
- R: unbiased random walk
- B: down / down-diagonals / lateral spread
- G: straight-down sand (optionally latches)
- Vascular aspiration/transpiration-like behavior emerges via biases (top of G “vents” B to R-like vapor; top of G attracts R down; etc.)

This is extremely close in spirit to:
- Your existing “proto-ecosystem” work (rgbfields / absorption style) where simple biases create persistent flow structures.

If you want a **fast iterate / fast delight** subproject, this is a great branch.
If you want the **big synthesis**, it’s also a good “movement + coupling baseline” that you can later add phase-transmutation onto.

---

## 11) The shortlist of decisions (what to choose next)

1) **Conservation model**
- Pick A (per-field) or B (phase-based total).

2) **Coupling model**
- Co-moving composite (your preference) vs superposition-only.

3) **State representation**
- Pure binary-only vs binary + minimal auxiliary bits (momentum for B, heading for G).

4) **LIFE**
- Do we explicitly define LIFE = (R+G+B) as a stable, selection-bearing process?

5) **Vascular G**
- Do we implement G heading/channeling now, or postpone until the base cycle is fun?

---

## 12) My recommended “least regret” path (2-stage)

Stage 1 (get fun fast):
- Option B (phase transmutation), binary presence + minimal aux bits, local-only rules, tune decouple/transmute until cycles are visually legible.

Stage 2 (add your signature):
- Add vascular G heading *as a bias on movement* (not as a new connectivity system).
- Then add genetics that modulate the biases and probabilities, so selection has something to act on.
