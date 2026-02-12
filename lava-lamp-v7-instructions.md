INSTRUCTIONS A
<<

> > v7 MD instruction / code plan (start from hybrid-6)

Below is a “pass-this-to-another-AI” spec. It’s detailed, exhaustive, but tries to stay concise.

⸻

Lava Lamp DPLBM Hybrid v7 — Implementation Plan

Goals
• Preserve the core design: local discrete “units” per cell + temperature-dependent capacity as the main thermodynamic engine.
• Keep the system:
• strictly local (only neighbor interactions)
• mass-conserving (units move, never created/destroyed)
• simple + emergent (few terms, clear interpretations)
• Improve correctness and controllability of cohesion/rounding without reintroducing:
• mist/dissolution
• obvious lattice artifacts
• global volume constraints

Non-negotiable invariants
• units[i] ∈ {0..maxUnits} integer
• temp[i] ∈ [0..1] float
• Only move 1 unit at a time from src → dest where dest is 4-neighbor (cardinal) of src
• The only state changes per transfer:
• units[src] -= 1, units[dest] += 1
• temperatures updated locally (see below)

Key v7 changes (highest leverage)

1. Fix the destTemp bug (important correctness)

Problem: using temp[dest] || srcTemp treats valid 0 as falsy.
Fix: handle empties explicitly.

Spec:
• If units[dest] === 0 (empty), define destTemp = srcTemp (wax “brings its temperature” into newly occupied cell)
• Else destTemp = temp[dest] exactly

Also ensure empty cells’ temp is always defined (initialize to 0 and maintain it).

2. Make adhesion ΔH actually local-correct at the interface

This is the most important “fresh eyes” correctness fix.

Current pattern (likely): compute adhesion energy only for src and dest.
But when a cell flips 0↔1 occupancy, it changes boundary terms for neighbors.

v7 requirement: ΔH must include the local neighborhood that is affected.

Choose one of these approaches (A strongly preferred):

A) Switch to edge-based boundary energy (preferred for simplicity + correctness)
Define a purely local interface energy on neighbor pairs.
• Let present(i) = units[i] > 0
• For each cell i, consider 4-neighbor edges (or 8-neighbor if you really want, but 4 is cleaner).
• Define boundary energy per edge (i,j):
• E*edge(i,j) = J * w(i,j) \_ (present(i) XOR present(j))
• w(i,j) options (pick one):
• simplest: w = 1
• density-scaled: w = 0.5 \* (units[i] + units[j]) / maxUnits (more “surface tension” for fuller wax)

Then total adhesion energy for a move is computed by summing only edges incident to src and dest (at most 8 edges if 4-neighbor), before and after.

This makes ΔH exact and very local.

B) Keep “empty neighbor count” but include neighbor cells in ΔH (acceptable)
If you keep your old formulation (count empties in 8-neighborhood), then when occupancy flips, you must include:
• src, dest
• all 8-neighbors of src
• all 8-neighbors of dest

Compute total adhesion energy over that local set before vs after.

This is still local, just a bit heavier.

3. Add optional “under-capacity pull” (weak, gated)

Implement a mild “desire to fill new capacity” when cooling increases cap(T).

Add a second capacity term:
• cap(i) = round( lerp(coldCapacity, hotCapacity, temp[i]) )
• Overfill penalty (keep):
• H_over(i) = lambdaOver \* max(0, units[i] - cap(i))^2

Add underfill penalty (new, optional):
• H_under(i) = lambdaUnder \* max(0, cap(i) - units[i])^2
• Gate to prevent weird long-range creep / nucleation:
• Only apply underfill penalty if units[i] > 0 OR hasWaxNeighbor(i) == true
• hasWaxNeighbor(i) uses 4-neighbors and returns true if any neighbor has units>0

Default parameter:
• lambdaUnder = 0 (off)
• Recommended starting value:
• lambdaUnder ≈ 0.05 \* lambdaOver (very weak)
• If you see tails not snapping back, increase slowly.

This stays purely local and conserves mass.

⸻

Transfer proposal & acceptance

Neighborhood
• Transfers are cardinal only (N/S/E/W).
(You can still compute adhesion on 4 edges; don’t move diagonally.)

Proposal selection (keep your current “holistic best” feel)

Because you’re not seeing the nasty angular artifact problem in v2/v6, don’t overcomplicate:

v7 should support two modes:

Mode 1: Greedy-best (current behavior)
• For a given src, evaluate each of 4 neighbors dest
• Skip if destUnits == maxUnits
• Compute a “score” = velBias - ΔH
• Pick best score direction
• Accept via Metropolis-style probability

Mode 2: Metropolis proposal (optional toggle; often looks more organic)
• Choose dest randomly, optionally biased by velocity direction:
• Example: 70% choose the most velocity-aligned cardinal direction, 30% choose random cardinal
• Accept/reject based only on ΔH (and a temperature/noise parameter)

Even if you keep Mode 1 as default, implement Mode 2 as a debug knob. It’s useful to test whether “tails” are caused by proposal greediness vs energy terms.

Acceptance rule

Use a standard local probabilistic accept:
• If ΔH <= 0: accept
• Else accept with probability exp(-ΔH / noiseTemp)

(Where noiseTemp is your stochasticity control; keep small.)

⸻

Temperature update rule (local + physically legible)

When a unit moves src → dest:
• If destUnits_before == 0:
• temp[dest] = temp[src] (wax “carries” temperature into new cell)
• Else:
• Use mass-weighted mixing:
• temp[dest] = (temp[dest]*destUnits_before + temp[src]*1) / (destUnits_before + 1)

When srcUnits_after == 0:
• temp[src] = 0 (or keep but irrelevant; better to set to 0 for clarity)

This prevents weird temperature discontinuities from empty-cell temps.

⸻

Forces / velocity field (leave mostly as-is; keep local)

Keep your DPLBM-ish local velocity field and buoyancy scheme intact, but ensure:
• Buoyancy depends on:
• wax presence (units>0)
• temperature (hot rises, cold falls)
• optionally small baseGravity (fine)
• Viscosity / damping stays local.

The unit-transfer layer should only read:
• local velocity at src
• local temps at src/dest
• local units around src/dest for energy

Do not introduce any nonlocal pressure solves.

⸻

Optional “tail snapback” helpers (only if needed)

If after fixing ΔH correctness and (optionally) adding weak underfill pull you still see stringy tails:

Option A: Neck / filament penalty (purely local)

Add an energy penalty if a move creates a “degree-2 chain” shape.

Local heuristic (cheap):
• Define waxNeighborCount4(i) (# of wax cells among 4-neighbors)
• Add H_filament(i) when units[i]>0 and waxNeighborCount4(i)==2 and those two neighbors are opposite (N+S or E+W)
• Weight with lambdaFilament small

This discourages long 1-cell-wide bridges.

Default:
• lambdaFilament = 0 (off)
• Turn on only if needed.

Option B: Encourage curvature (a.k.a. “rounding”)

Use 8-neighbor count as curvature proxy:
• penalize wax cells with too few neighbors (spiky)
• keep weight small

⸻

Performance constraints (keep it fast, still local)
• No per-tick array allocations inside hot loops.
• Precompute neighbor index arrays for cardinal and (if needed) 8-neighbor.
• Keep energy calculations strictly local around src/dest (edge-based makes this easiest).

⸻

Implementation checklist (what the other AI should actually do) 1. Branch from lava-lamp-dplbm-hybrid-6.html → create lava-lamp-dplbm-hybrid-7.html 2. Fix destTemp logic:
• replace any temp[dest] || temp[src] patterns with explicit empty/non-empty logic 3. Refactor adhesion energy to edge-based boundary energy:
• Implement present(i)
• Implement edgeEnergyAround(i) that sums edges (i, neighbor) for 4-neighbors
• Implement deltaAdhesionForMove(src, dest) by computing affected edges before/after 4. Implement two capacity terms:
• H_over (existing)
• H_under (new, gated, optional; default off) 5. Update calcEnergyDelta() to include:
• ΔH_over(src,dest) + ΔH_under(src,dest) + ΔH_adhesion(src,dest)
• Ensure ΔH is computed “before/after” consistently with the move 6. Keep transfer proposal behavior as in v6 by default, but add toggles:
• proposalMode = "greedy" | "metropolis" 7. Implement temperature update as mass-weighted mixing + empty reset 8. Expose new parameters in UI with sensible ranges:
• lambdaUnder (default 0)
• proposalMode
• adhesionMode if you want to keep compatibility (edge vs countEmpty)
• lambdaFilament (default 0) 9. Add a small on-screen debug readout (optional but helpful):
• total units
• % wax cells
• average units per wax cell
• average ΔH accepted / acceptance rate
This helps tune without guesswork.

⸻

Suggested default parameter starting points for v7
• Keep your v6 defaults, plus:
• lambdaUnder = 0
• If tails feel too persistent, try:
• lambdaUnder = 0.05 \* lambdaOver
• proposalMode = greedy (since it’s already “good enough” visually)
• Only add lambdaFilament if tails become bridges.

⸻

What “success” looks like (quick sanity tests)

Run each for ~10k–30k ticks:
• Hot blob at bottom should:
• expand / shed units upward
• detach into a blob (not forever tail)
• Midwater blobs should:
• remain cohesive (no mist)
• round out after detach (tails retract)
• Cooling near top should:
• increase local capacity and modestly “pull” nearby wax inward if lambdaUnder>0
• cause falling blobs that don’t leave long wisps

> > END OF INSTRUCTIONS A

INSTRUCTION B
<<
DPLBM Hybrid v7 — Implementation Plan (from hybrid-6)

0. Goals

Primary goals
• Preserve and maximize the “local units + capacity(T)” mechanism:
• hot capacity smaller (e.g. 6), cold capacity larger (e.g. 8)
• transfer 1 unit at a time
• pressure emerges from deviation from local capacity
• Keep everything local:
• only neighbor interactions (4- or 8-neighborhood)
• no global volume constraints
• no global shuffles required for correctness (still allowed if desired)
• Improve “physical feel” without adding complexity:
• blobs stay blob-like
• tails tend to retract / snap without needing brittle hacks
• convection remains plausible

Non-goals (explicitly avoid)
• No global CPM volume penalty
• No global rebalancing / flood fills
• No expensive topology checks (simple-point etc.) unless absolutely necessary
• Don’t over-index on “grid-artifact” fixes if hybrid-6 already looks good

⸻

1. Start point
   • Copy lava-lamp-dplbm-hybrid-6.html → new file lava-lamp-dplbm-hybrid-7.html.
   • Preserve:
   • LBM velocity field + buoyancy/gravity
   • units[i] ∈ [0..maxUnits]
   • temperature diffusion + heating/cooling zones
   • isolation penalty logic (the v6 fix)

⸻

2. Critical correctness fix: “destTemp = temp[destI] || srcTemp” bug

Problem

In JS, 0 is falsy, so temp[destI] || srcTemp incorrectly replaces valid 0 temps with srcTemp.

Fix

Replace in calcEnergyDelta() (and anywhere else it appears):
• Current:
• const destTemp = temp[destI] || srcTemp;
• Replace with:
• const destTemp = (destUnits === 0 ? srcTemp : temp[destI]);

This keeps the “inherit temp if dest is empty” rule, without falsy bugs.

⸻

3. Make ΔH locally correct (the biggest improvement)

Why this matters

Your adhesion energy (calcAdhesionEnergy) depends on whether neighbors are empty.
So when a transfer causes:
• srcUnits: 1 → 0 (cell disappears), or
• destUnits: 0 → 1 (cell appears),

…it changes the adhesion energy of neighbors of src/dest, not just src/dest.

Right now, v6 ΔH only recomputes energy for src and dest, so interface decisions are slightly “blind.” This is exactly where cohesion realism comes from.

v7 approach: compute local energy over a small neighborhood set

Implement a helper that computes total local energy over:
• S = {src, dest} ∪ N8(src) ∪ N8(dest)
(unique indices, in-bounds for y, wrap x as you already do)

Then:
• E*before = Σ*{i∈S} E*cell(i, units_current, temp_current)
• E_after = Σ*{i∈S} E_cell(i, units_with_override, temp_with_override)
• ΔH = E_after - E_before + isolationPenalty(if triggered)

Implementation details (important)

You want this to stay fast and local without mutating arrays.

3.1) Add an accessor for overridden units/temp
In calcEnergyDeltaLocal(srcX,srcY,destX,destY):
• Define local overrides:
• srcUnitsAfter = srcUnits - 1
• destUnitsAfter = destUnits + 1
• destTempAfter = (destUnits === 0 ? srcTemp : temp[destI])
• Define:
• getUnits(i) returns:
• srcUnitsAfter if i===srcI
• destUnitsAfter if i===destI
• else units[i]
• getTemp(i) returns:
• destTempAfter if i===destI
• else temp[i]

3.2) Rewrite adhesion energy to use getUnits for neighbors
Create a version:
• calcAdhesionEnergyWithAccessor(x,y,cellUnits,getUnits)
that counts empty neighbors by checking getUnits(neighborIndex) === 0.

Do not read units[] directly inside this “ΔH” path.

3.3) Capacity energy stays local
Use:
• cap = getCapacity(t)
• (see section 4 for optional underfill “pull”)
• return capacity energy based only on this cell’s cellUnits and t

3.4) E_cell(i) should be pure + local
Make:
• cellEnergy(i, getUnits, getTemp) that does:
• if u=0 return 0
• E = adhesion(u, neighbors) + capacity(u,t) (+ any extra local terms)

Then ΔH is correct for all boundary changes within S.

⸻

4. Add your “under-capacity pull” idea — but do it safely

You asked:

when hot (6/6) → cold (6/8), it should “want” to fill the new void quickly (negative pressure)

Current behavior (v6)
• Capacity energy is one-sided:
• penalizes only max(0, u - cap(T))²
• So cooling increases cap, but there is no explicit incentive to fill up (beyond adhesion/flow).

Is it worth implementing?

My view:
• It’s potentially important if you want:
• faster contraction/filling when cooling
• fewer persistent low-density pockets inside blobs
• tails that “retract” more naturally
• But symmetric underfill penalties can also cause:
• over-eager spreading into empty space
• “vacuum hunger” at surfaces
• instability if too strong

So implement it as an optional, gated, local term.

v7 recommended implementation: “bulk-weighted underfill”

Add a second parameter:
• underfillLambda (default small, e.g. 0.05 if capacityLambda=0.5)

Compute:
• cap = getCapacity(t)
• over = max(0, u - cap)
• under = max(0, cap - u)

Then:
• E*capacity = capacityLambda * over² + underfillLambda \_ w_bulk \* under²

Where w_bulk is a local “interior-ness” weight to prevent surfaces from desperately filling:
• waxNeighbors = count of N8 neighbors with getUnits>0
• w_bulk = clamp((waxNeighbors - 2) / 6, 0, 1)
• near surface (few neighbors) → ~0 → little/no underfill pull
• in interior → ~1 → stronger pull to reach cap

This keeps the effect:
• local
• emergent
• mostly inside blobs (where it makes physical sense)

UI additions

Add:
• Underfill (λ_under) numeric input
• maybe a note in comments: “small values only; 0 disables”

⸻

5. Movement selection: keep your existing scheme, but improve it minimally (optional)

You said connectors aren’t a major issue in hybrid-2/6. Agreed. So don’t overhaul unless you want.

Still, there’s one improvement that usually helps tails retract without adding complexity:

Optional change: stop choosing “bestDir” greedily

Current:
• evaluates all 4 dirs
• chooses max(score)
• then accept/reject

Greedy choice can keep narrow tails longer than needed because it repeatedly picks the locally best advective direction.

Minimal alternative (still local, still simple):
• pick a direction stochastically biased by velocity, then accept/reject by ΔH.

Implementation: 1. Build candidate dirs (valid dest, not full) 2. Compute weights:
• w*dir = exp(velBias * velProj)
• set velBias small (e.g. 1–4 depending on velocity magnitude) 3. Sample one direction 4. Compute ΔH (local-correct, with your new function) 5. Accept rule:
• Δ = ΔH - velScale \_ velProj
• if Δ <= 0 accept
• else accept with exp(-Δ / noiseTemp)

If you want to keep things stable for v7, you can also defer this to v8. The ΔH fix alone is already a big step.

⸻

6. Keep the isolation penalty, but apply it inside the new ΔH function

v6’s wouldCreateIsolation(...) is good — keep it.

In new ΔH:
• after computing ΔH = E_after - E_before
• if isolation would occur, add:
• ΔH += adhesionJ \* isolationMultiplier
• keep isolationMultiplier = 20 default

⸻

7. Sanity checks + debug metrics (cheap, very helpful)

Keep the mass check you already print. Add 2 more cheap diagnostics:
• “cells with units>0 but waxNeighbors==0” count (true isolated)
• “tailiness” proxy:
• count cells with units>0 and waxNeighbors<=1

These help tune:
• adhesionJ
• underfillLambda
• isolation penalty multiplier
• noiseTemp

No visuals needed; just stats text is fine.

⸻

8. Parameter defaults for v7 (starting guesses)

Keep your current v6 defaults, add:
• underfillLambda = 0.05 (or 0 to start, if you want to isolate effects)
• bulkWeightMinNeighbors = 2 (implicit in formula)
• if you implement stochastic direction sampling:
• velBias = 2.0 (small)

⸻

9. Acceptance / testing recipe (so the implementing AI can verify quickly)

After implementing v7: 1. Run at default params for ~10k–30k ticks 2. Verify:
• Mass stays exactly constant
• Blobs form and move
• Cooling regions show contraction / densification inside blobs (if underfill enabled) 3. If blobs spread too much / become “puffy”:
• decrease underfillLambda
• increase adhesionJ slightly
• increase bulk gating (make w_bulk smaller near surfaces) 4. If tails don’t retract:
• slightly increase adhesionJ
• slightly increase underfillLambda (but only if bulk-weighted)
• optionally reduce noiseTemp a bit

⸻

Summary of the v7 change list (for the other AI)

Implement v7 by making these edits to hybrid-6:
• Fix destTemp falsy bug (use explicit destUnits===0 ? srcTemp : temp[destI])
• Replace ΔH calculation with local neighborhood energy difference:
• compute energy over {src,dest} ∪ N8(src) ∪ N8(dest)
• ensure adhesion energy for those cells uses an accessor (getUnits) so neighbor contributions are included
• Add optional bulk-weighted underfill pressure:
• underfillLambda _ w_bulk _ max(0,cap-u)²
• Keep isolation penalty but apply it on top of new ΔH
• (Optional) replace greedy best-dir with velocity-biased random proposal + Metropolis acceptance

> > END OF INSTRUCTOINS B
