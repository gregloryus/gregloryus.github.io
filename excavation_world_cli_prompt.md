# Build Excavation World from the attached specification

Read `excavation_world_design.md` in full. It is the authoritative, self-contained behavior specification for this task. Build a working prototype from those desired behaviors; no historical source files or earlier interface are dependencies.

Treat mandatory behaviors and approved initial defaults as requirements. Clearly marked proposed numerical values are starting points for transparent calibration. Implementation notes are suggestions: choose effective data structures, rendering, energy accounting, scheduling, and replay methods that preserve the requirements. Prefer local communication, with the plant-wide abstractions explicitly permitted by the specification. Do not silently replace an outcome-changing rule with a different one as a performance optimization.

Deliver runnable software rather than another proposal. The preferred output is one self-contained browser HTML file, with focused tests and a concise verification note separately. Keep the interface minimal and choose its layout around the tasks specified in the document.

Before implementing, write a short executable rule card stating the selected timing, resource/conflict policies, causal state, and intervention identities. Resolve routine implementation choices autonomously. Test small coordinate, lifecycle, inheritance, mutation, visibility, dispersal, and litter fixtures before tuning population dynamics. Use the verification requirements in the specification; report failed runs and genuine limits.

In particular, mutation selects a depth-weighted eligible child slot and flips it. There is no separate grow/cut coin. Additions recursively sample new descendant slots from [0,0,1]. Preserve independent inheritance and journey chance, deterministic three-generation forgetting, the pre-pruning viability check, and exact rewind/replay.

Keep the feature scope to the specified projected-depth world. Do not add deferred ecological features, hidden reseeding, target forms, or artificial diversity rewards. Find and document one ordinary-run fork that another person can reconstruct, and exercise the actual delivered interface. State what was observed without claiming open-ended evolution or biological realism.
