# Lava Lamp — Fresh-Eyes Review & Proposals (July 2026)

Context: after reviewing all prior MDs and iterations. User verdict: lbm-11 best in practice (blobs rise, cohere, pop off, rejoin) but all versions are slow, work better in portrait, and form an awkward bridge ~5-10k ticks above the heat source.

## Diagnosis: why the bridge forms

The "awkward bridge" above the heater is the signature of three compounding issues, and every approach tried shares them:

1. **Under-resolved pinch-off.** Blob detachment is a Rayleigh–Plateau instability — the neck must thin below a critical radius and snap. Shan-Chen's interface is diffuse (~4–5 cells wide), so on a ~166×175 grid a neck is *thinner than the interface itself*. Surface tension gets smeared across the blur and there's nothing sharp enough to snap. Portrait orientation helps because pinch-off also needs vertical runway (several blob-diameters of neck length).
2. **Continuous heating sustains a plume.** A constantly-fed hot column is a steady-state jet, not a dripping faucet. Real lamps cycle because they run at *marginal* buoyancy — cold wax barely sinks, hot wax barely rises — so the supply is intermittent. The heat rates are strong enough to maintain the tether.
3. **Weak, uncontrollable surface tension.** In Shan-Chen, σ is an emergent side-effect of G, coupled to everything else. You can never independently say "more pinch, same everything else." That's the root of the tuning hell in the lbm notes.

The slowness is just CPU JavaScript — every serious option below is WebGPU compute, which buys 100x essentially for free.

## Proposals, ranked by (probability of success × fit to taste)

**1. Conservative Allen–Cahn phase-field LBM — the direct evolution.** This is what the field moved to *after* Shan-Chen, for exactly these two complaints. Two lattices: one solves a conservative phase-field equation (sharp interface, each phase's mass conserved *exactly* — no more dissolving blobs), one solves hydrodynamics. Surface tension σ and interface width are **direct input parameters**, decoupled from density and viscosity. Benchmarked in the literature on rising bubbles and Rayleigh–Taylor — literally this use case. Keeps the D2Q9 knowledge, Boussinesq buoyancy, and thermal coupling from v11. There's a [reference implementation tutorial in lbmpy](https://pycodegen.pages.i10git.cs.fau.de/lbmpy/notebooks/10_tutorial_conservative_allen_cahn_two_phase.html) to crib from. All-local stencils → clean WebGPU port.

**2. Color-gradient LBM — the conservative sibling.** Same family, different mechanism: two distribution sets with a "recoloring" step that actively re-segregates phases at interfaces each tick. Quantitative comparisons show it has [strict mass conservation, much lower small-droplet dissolution than Shan-Chen, lower spurious currents, and independently tunable surface tension](https://arxiv.org/abs/2110.05197), with a far wider stable parameter range. Slightly simpler to implement than phase-field. Either #1 or #2 kills the dissolution problem; #1 has the sharper interface.

**3. WebGPU particle wax: MLS-MPM or PBF with cohesion — the radical rethink.** The dplbm era failed because particles were shackled to grid-swaps. Proper particle dynamics (SPH cohesion kernels, or MLS-MPM) gives: exact mass conservation (particle count is fixed), *trivially emergent pinch-off and merging* (particles just separate and rejoin — no interface mathematics at all), temperature carried per-particle, and blobby rendering via metaballs/marching-squares over the density field. [MLS-MPM runs ~100k particles real-time in-browser on integrated graphics](https://80.lv/articles/check-out-this-real-time-3d-fluid-simulation-implemented-in-webgpu), and there are [open WebGPU SPH/FLIP references](https://github.com/jeantimex/fluid). This is emergent-from-local-rules in the purest sense — arguably *more* aligned with the stated taste than LBM, and pinch-off is its natural behavior rather than its hardest case.

**4. Sharp-interface VOF/level-set + simple Navier-Stokes.** The graphics/engineering standard: MAC-grid Stable Fluids solver, volume-of-fluid advection (machine-precision mass conservation), continuum surface force for tension, Boussinesq buoyancy. Full control, well-trodden, but the most code of any option and the least "cellular" in spirit.

**5. Regardless of method: run the lamp at marginal buoyancy.** A dimensionless-numbers insight that would improve even lbm-11 today: make cold wax *slightly denser* than water (the lbm notes flagged this as "asymmetric buoyancy" and never tried it), lower the heat rate so blobs launch from a barely-supercritical pool, and consider a duty-cycled heater. Real lamps drip; the sim jets. This is a 20-minute experiment on the existing file.

## Recommendation

**Phase-field LBM (#1) on WebGPU** is the highest-confidence path: it's the acknowledged fix for Shan-Chen's exact failure modes, and it preserves the hard-won thermal/buoyancy intuitions. But for the option most likely to be *beautiful* with the least tuning agony, **#3 (particle wax)** is the dark-horse pick — pinch-off and coalescence are free, and every one of the MD-documented desired behaviors is natural to it.

Quick wins meanwhile: try #5's marginal-buoyancy tuning on lbm-11, in portrait, before committing to a rewrite.

## Sources

- [Fakhari-family phase-field LBM (PRE)](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.97.033309)
- [lbmpy conservative Allen–Cahn tutorial](https://pycodegen.pages.i10git.cs.fau.de/lbmpy/notebooks/10_tutorial_conservative_allen_cahn_two_phase.html)
- [CG vs SC quantitative comparison](https://arxiv.org/abs/2110.05197)
- [free-surface vs conservative AC LBM comparison](https://www.sciencedirect.com/science/article/abs/pii/S0021999122008166)
- [WebGPU SPH/FLIP](https://github.com/jeantimex/fluid)
- [MLS-MPM in browser](https://80.lv/articles/check-out-this-real-time-3d-fluid-simulation-implemented-in-webgpu)
- [lava lamp as Rayleigh–Taylor](https://math3510edensmith.wordpress.com/2014/10/07/fluid-dynamics-of-a-lava-lamp/)
