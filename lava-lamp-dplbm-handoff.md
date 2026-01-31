# DPLBM Lava Lamp - Handoff Brief

## Goal
Create a lava lamp simulation with:
- Discrete integer wax units (perfect mass conservation)
- LBM-driven fluid dynamics
- Cohesive blob behavior like `lava-lamp-lbm-1.html` (Shan-Chen) but without its mass dissolution issues

## Current State
- `lava-lamp-dplbm-1.html` through `dplbm-6.html` exist
- Core architecture: Single-phase D2Q9 LBM computes velocity field, discrete wax particles move via probabilistic swaps

## The Problem
Wax particles move as individuals, not cohesive blobs. Various attempts failed:
- v3: Velocity smoothing + separation resistance (band-aids, didn't work)
- v4: Laplacian surface tension force (didn't work even at high values)
- v5: Interface resistance (blocks ALL wax-empty swaps, too blunt)
- v6: Void prevention (check if swap creates interior void) - still no visible change

## Key Reference
`lava-lamp-lbm-1.html` - Full Shan-Chen LBM with emergent surface tension. Blobs stay cohesive. But has mass dissolution issues with small blobs (fundamental to Shan-Chen diffuse interface).

## User's Full Feedback (verbatim)

> I'm not really seeing those desired behavior changes. Even with Interface Resist set to 1 and Temp softening set to 0, there's no movement at all (just warming), and if I change the temp softening to 0.1 or 0.01, then little pieces will start flying off. While this disparate nature is what more easily allows flows and convection, it's not at all desired. In theory, with Resist set to 1 and 0 softening, my naive intuition would be that the wax should still move... but I guess logically it makes sense that it would never swap places with an empty cell. So that makes sense, but not exactly desired. Let's think more carefully and critically and thoughtfully about this, like we're extremely erudite programmers. So ideally we'd have some sort of surface tension that'd act more like lbm-1.html, though not suggesting we revert to that fully at all. What I mean is that yes, I want wax to swap easily internally (and maybe we should tune down diffusion of heat so we can see those swaps more), but ideally wax should still be able to rise into empty space... it's just as if, e.g., a center bulge was to rise, it should pull in the wax on the sides to fill any voids it would have created. So, the system should resist creating new bubbles or holes in the wax (ie an empty cell surrounded by wax) and that vacuum force pull should propogate to local neighbors emergently. Maybe this all happens within the same tick, unless that'd be extremely expensive or cause more racing/timing issues. But let's say a particle on the center surface wants to move up, but by going up it would create a bubble void in the wax, that initial central surface particle shouldn't move up until it knows the void will be instnatly filled by a neighbor its applying negative pressure to? I'm trying to brainstorm different solutions but am relying on you to critically interrogate them and decide on the best course of action. I was also thinking, and this might be unrelated, that like water in a falling sand sim, wax should naturally try to spread out horizontally whenever it can due to gravity, but surface tension wil lkeep it more blobbly -- if that's a promising method I'd rather overcorrect and get extra wide horizontal blobs instead of lumpy columns. Though to be clear, the current simulation doesn't have any lumpy columns, on the contract there's lots of chaotic convection which is desired, so maybe this isn't relevant at all. I was just thinknig that when a surface central particle tries to move up, it'll probably be less energy for the wax particles on the left and right of the would-be void bubble to fill in the void, rather than the wax under the void. Help me think through this and find the best rigorous elegant holistic emergent performant solution here. You can give multiple options or recommend that you research more or whatever you think. We could even memorialize the challenge in an MD and get other AIs to collaborate and suggest solutions.

## Promising Unexplored Directions

1. **Chain swaps**: Only allow movement if a complete chain of swaps maintains blob integrity (A→empty, B→A, C→B...). Atomic multi-swap.

2. **Incompressibility constraint**: Treat wax as incompressible. Movement at surface must conserve local wax volume.

3. **Negative pressure propagation**: When a cell wants to move, it creates "suction" that propagates to neighbors within same tick.

4. **Falling-sand style water**: Horizontal spreading under gravity, surface tension as cohesion bias.

5. **Rethink the coupling**: Maybe LBM velocity shouldn't directly drive swap probability. Maybe LBM should create pressure gradients that the wax responds to differently.

## Files
- Working: `lava-lamp-dplbm-1.html` through `dplbm-6.html`
- Reference: `lava-lamp-lbm-1.html` (Shan-Chen, good cohesion, bad mass conservation)
- All in `/Users/greg/Documents/GitHub/gregloryus.github.io/`
