# Commonweave

## Research and build plan for a legible emergent coevolutionary garden

- **Status:** design document, research synthesis, and experimental roadmap
- **Revision:** v2 — porous ontogeny, attached mutated buds, and universal visible grafting
- **Current stopping point:** do not build the full garden yet
- **Primary recommendation:** advance one deliberately small, falsifiable substrate experiment before committing to another large simulation
- **Intended eventual artifact:** a deterministic, zero-player, saveable single-file browser simulation

---

## Executive thesis

The desired project is not simply a plant generator, an ecosystem toy, or an evolutionary animation. It asks one small and understandable artificial world to do three difficult things at once:

1. remain causally legible to a child or casual observer;
2. undergo genuine, long-running evolution and coevolution from a common ancestor, including historical isolation, invasion, and ecological reorganization;
3. produce beautiful plantlike forms whose recognizable structures are consequences of function rather than decorative templates.

I found no existing artificial-life system that convincingly satisfies this full conjunction. Different systems solve valuable pieces of it, but the combination remains close to the open frontier of artificial life. In particular, contemporary researchers still describe scalable complexity, evolvability, major transitions, and genuinely open-ended functional innovation as unresolved problems rather than solved engineering recipes. The 2024 Artificial Life special issue on open-ended evolution says as much directly, while Genelife reports ongoing genetic and spatial novelty but explicitly distinguishes that from functional biological innovation. ([Artificial Life special issue editorial](https://direct.mit.edu/artl/article/30/3/300/123431/Editorial-Introduction-to-the-2024-Special-Issue); [Genelife](https://direct.mit.edu/artl/article/30/3/356/119274/Open-Endedness-in-Genelife))

That means the project should be pursued as a sequence of scientific bets, not as a feature roadmap whose success can be assumed.

The most promising bet is this:

> **Make reproduction begin as a visible physical connection between two genomes, then let evolution decide whether they separate, exploit one another, cooperate, or become a larger individual.**

A new bud should copy and mutate its genome when it begins, while it is still physically attached to its parent. Gold energy then flows into the low-energy child through the same visible conduit used everywhere else. Detachment is an evolvable event, not the moment at which the child first comes into existence.

Any active growing tip that later touches living tissue may also graft to it. It does not need a matching numeric key, a mouth type, or an owner identity. The graft is drawn as an actual bridge, and energy pulses visibly across it.

“Self” may exist in genealogy and development, but it is not an inviolable rule in the physics. Every birth temporarily creates a two-genome body. This supplies a continuous evolutionary path from ordinary parental provisioning to prolonged attachment, dependence, exploitation, mutualism, coloniality, and potentially new higher-order individuals.

This creates a plausible path from one self-sufficient ancestor to:

- descendants that remain attached longer, discard expensive collection machinery, and draw energy from parents or other bodies;
- hosts that sever vulnerable branches, isolate exposed growth behind narrow low-flow necks, shed attachments, or change reproductive timing;
- dependents that counter-adapt through faster reproduction, multiple grafts, longer tendrils, mobility, or targeting young tissue;
- partners that contribute collection, transport, motion, structure, or dispersal and become mutually useful;
- higher-order connected communities whose functional boundaries no longer match their genealogical boundaries;
- repeated exchange displays and motile partners that could eventually support flower-and-visitor-like relationships without declaring “flowers,” “pollinators,” “predators,” or “prey” in advance.

This proposal is called **Commonweave** because all lineages inhabit and manipulate one shared fabric. The crucial novelty is not a new resource, third dimension, trophic layer, fitness function, or colored password. It is **porous ontogeny through attached genetically distinct buds and owner-neutral grafting**.

The immediate recommendation is therefore:

- do not continue elaborating Loopgarden in its current form;
- do not merely add more plant parts or resources to Sampler;
- retain Sampler’s visual immediacy, organism-scale cadence, and readable growth;
- retain the valuable aspiration behind Loopgarden’s universal exchange;
- replace both biological cores with a much smaller Commonweave experiment;
- prove that useful interaction can occur at a sparse, screenshot-legible density before beginning the evolutionary experiment;
- require that experiment to produce de novo dependence and counter-adaptation before building the archipelago or pursuing elaborate beauty.

If this core experiment fails decisively after disciplined parameter searches and ablations, the project should be tabled rather than hidden beneath more rules. If it succeeds, it would be a genuine conceptual breakthrough worth advancing.

---

## The complete project brief, crystallized

The following requirements are coequal. Success on one cannot excuse sacrificing the others.

### Goal 1: legibility

The world must be understandable as a world, not merely inspectable as software.

- Its causal rules should be extremely simple, elegant, and teachable.
- Important interactions should be local.
- A viewer should be able to follow growth, energy transfer, connection, reproduction, mutation, and death moment by moment.
- There should be few hidden states, and no hidden state should be causally important without a stable visual expression.
- Complexity should arise from visible interactions rather than hidden global optimization, opaque scoring, or population-wide replacement.
- The primary view must stand on its own. It should not require toggling among multiple overlays to understand what is happening.
- A screenshot, together with a compact fixed legend, should reveal the current bodies, functional tissues, energy pathways, inter-lineage relationships, propagules, deaths, geography, and major lineage identities.
- The ordinary play speed must show meaningful life events. The viewer should not need to click “+1M events” repeatedly before anything comprehensible changes.
- Acceleration should be expressed in generations or eras, not an implementation-specific event count.
- Deep analytics may exist, but they must never affect the world and must not be necessary to understand its ordinary causal story.

### Goal 2: evolution, coevolution, history, and invasion

The system must contain actual Darwinian ecology rather than a decorative genetic algorithm.

- Individuals must vary heritably.
- Reproduction must occur inside the world using locally acquired energy.
- Survival and reproductive success must arise from ordinary consequences of bodies and interactions.
- There must be no externally assigned fitness score, tournament, generation-wide culling step, novelty reward, or target form.
- Many generations must occur at useful speed. A lineage should visibly turn over, not simply expand one ancient body forever.
- Multiple persistent lineages should be able to descend from the same simpler ancestor.
- Ecological roles should be descriptions made after the fact, not classes supplied at initialization.
- Producer-like, parasite-like, mutualist-like, carrier-like, predator-like, prey-like, and decomposer-like strategies may be recognized if they emerge, but none may be granted a special rule merely because of that label.
- Organisms must alter the conditions encountered by future organisms.
- The environment should visibly embody some history of what lived, connected, died, stabilized, depleted, or built there.
- The baseline must be zero-player. The system advances, evolves, separates, reconnects, and changes without a user opening gates or introducing scripted invaders.
- Controlled manual isolation and reintroduction remain scientifically useful assays, but are not the desired baseline story.
- Natural barriers, habitat discontinuities, or equivalent separators should sometimes persist long enough for substantial independent evolution.
- Those barriers should sometimes erode, drift, rupture, or reconnect through ordinary visible world dynamics.
- Renewed contact should allow unfamiliar lineages to enter established communities.
- An “invasive” lineage must be an outcome—rapid spread and strong disruption in an evolutionarily unfamiliar community—not a flag.
- A “native” lineage must mean one shaped by the history of that region, not a privileged category in the code.
- Disturbed systems should remain capable of evolutionary reorganization and a new dynamic homeostasis.
- Recovery may not be guaranteed. Extinction, collapse, irreversible simplification, or replacement must remain possible, because guaranteed recovery would be another hidden design intervention.
- Stability should be dynamic: persistent organization amid turnover and motion, not a final frozen equilibrium.

The desired long-form scenario is:

1. several populations descend from the same ancestor;
2. ordinary world dynamics isolate them for long evolutionary periods;
3. each population coevolves with its partners, antagonists, local structures, and accumulated history;
4. barriers later change without user direction;
5. previously isolated biotas meet;
6. some newcomers fail, some coexist, and some spread invasively;
7. disruption changes the selective landscape;
8. survivors, newcomers, and their descendants may eventually form a different, still-changing ecology.

### Goal 3: functional, biophilic form

The world should become beautiful because useful organization becomes beautiful.

- Plantlike structures should not be imported as completed templates.
- Branching, extension, turning, thickening, narrowing, widening, repeated modules, and detachable propagules should be available as low-level developmental consequences.
- Leaflike surfaces should gather energy more effectively because of what their geometry does.
- Stemlike structures should conduct, support, or persist because of what their geometry does.
- Seedlike structures should be energy-bearing detachable offspring, not decorative icons.
- Flowerlike structures should, if they arise, be repeated exchange displays, grafting structures, partner-attraction structures, or reproductive arrangements that earn their form functionally.
- Motile visitor-like lineages should, if they arise, descend from the same ancestral substrate and gain their mobility through the same general mechanisms available to every lineage.
- Growth, extension, branching, widening, narrowing, thickening, varied terminal forms, and repeated symmetries should all be possible.
- Earlier bud-and-trail ideas remain potentially useful because an active tip leaving functional structure behind is a naturally legible developmental primitive.
- That idea should be retained only if it serves the new substrate; it should not drag the project back into an earlier architecture by habit.
- The renderer may make real functional geometry visually graceful, but it may not award reproductive success for looking attractive.

### Central aspiration

Find the smallest visible alphabet whose combinations produce an immense heritable possibility space.

The possibility space should be large for the same reason that permutations of a small deck become astronomical: compositional depth, reuse, branching, repetition, and interaction—not a large catalog of prewritten species or organs.

### Questions the project must answer

The project must discover, rather than assume, how small its useful basis can be.

For morphology:

- Is one universal tissue with different allocations enough?
- Are extension, turn, split, thicken, bud, graft, detach, move, and repeat sufficient developmental operations?
- Does a distinct leaf primitive add necessary function, or merely name a shape that could emerge from high capture allocation?
- Can functional surfaces, branches, seeds, and flowerlike repeated terminals arise from these operations?

For environment:

- Can one visible energy currency, one visible habitat state, living networks, and decaying structures supply enough ecological dimensionality?
- Which candidate dimensions—moisture, light, soil, air, time cycles, temperature, attraction, repulsion, pressure, velocity—actually create new evolutionary opportunities rather than merely more controls?
- Can environmental history be embodied in depleted energy, persistent dead structure, altered habitat boundaries, and living community composition before adding any extra field?

For microbiomes:

- Can many distinctive communities arise from one ancestor?
- Can their differences reflect historical contingency rather than different initial species lists?
- Can community members become complementary to the physical setting, to one another, and to the environmental consequences of one another?
- Can isolation, local adaptation, contact, invasion, disruption, and renewed adaptation all occur autonomously?

---

## What previous directions taught us

### Sampler’s strength

Sampler’s earlier versions made body-scale events visually immediate. A viewer could see an individual grow, branch, reproduce, and occupy a scene. Its simplicity gave it something scientifically important as well as aesthetically pleasing: a short causal distance between rule and appearance.

Sampler therefore contributes:

- the correct visual altitude;
- the correct temporal unit;
- a legible sense of development;
- a compact single-canvas presentation;
- a useful bud-and-trail intuition;
- the expectation that meaningful changes should happen at ordinary speed.

### Sampler’s limitation

Adding leaves, costs, or a few resource tradeoffs to Sampler would probably create adaptive variation among plant strategies. It would not by itself create the desired breakthrough.

The deeper limitations are:

- bodies are effectively private;
- roles begin plantlike and remain plantlike;
- interactions are dominated by crowding and available space;
- lineages optimize how they unfold into gaps;
- there is no general route by which descendants can abandon self-sufficiency and appropriate, complement, or defend one another’s machinery;
- ecological relationships therefore remain weak or prescribed.

A leaf particle that gathers energy efficiently but costs upkeep could be a good visible tradeoff. It is not enough to produce open-ended coevolution.

### Loopgarden’s strength

Loopgarden moved toward a more universal exchange substrate and toward ecology as a network of local processes. That instinct was directionally valuable.

### Loopgarden’s limitation

In practice, its causal altitude became microscopic and its temporal units ceased to match what a viewer recognizes as lives and generations. The result was difficult to read:

- a few founding structures appeared to expand for a very long time;
- generation turnover was not visually salient;
- meaningful differences required enormous event jumps;
- multiple overlays compensated for facts that the main picture did not express;
- internal scheduling and state obscured the evolutionary story.

That is not merely a user-interface defect. If the viewer cannot distinguish growth of an old body from reproduction of many descendants, the biological ontology itself is at the wrong scale for this project.

### Synthesis

Commonweave should use **Sampler as a presentation and temporal reference**, not as an ecology to patch. It should use **Loopgarden’s aspiration toward universal exchange**, not its scheduler or visual complexity.

The implementation should be fresh enough that neither prior architecture dictates the new rules. Reuse rendering techniques only when they preserve the new causal model.

### What Thicket actually established

Thicket is the strongest internal evidence that adding an exploitable relationship can keep an otherwise converged garden evolving.

In its initial two-seed comparison:

- mouth tissue supplied roughly 6–8% of total energy;
- effective signature diversity rose strongly with mouths enabled;
- bodies grew larger;
- dispersal increased;
- the mouths-off control settled into a static small-body optimum;
- the effect required roughly 55–57% occupancy.

This is encouraging evidence for the **ecological principle** that exploitability creates new frequency-dependent pressures. It is not evidence that Thicket’s numeric mouth key should be retained.

The diversity measure was largely diversity in the signature bins directly selected by the mouth mechanic. The experiment did not yet establish broad functional diversification, reciprocal coevolution, or a Red Queen cycle. Its own report correctly says that two seeds are only two seeds and that a cross-infection matrix is still required.

More importantly, Thicket exposed two structural failures:

1. mouths required accidental contact, and accidental contact required a dense, visually illegible mat;
2. the successful mouth needed an engineered neutral on-ramp: its key initially targeted its own kin before drifting toward other lineages.

The key was heritable and measurable, but it remained a hidden numeric compatibility rule. Coloring the corresponding tissue did not make the tolerance relation causally obvious in a screenshot. It also directed evolution toward a password-like scalar rather than toward the visible fittedness of bodies.

Commonweave v2 therefore borrows:

- the need for an evolutionarily continuous on-ramp;
- mouths-on/mouths-off-style causal controls;
- explicit measurement of transferred energy;
- the warning that contact ecology can become density ecology.

It rejects:

- mouth tissue as a prescribed trophic organ;
- numeric identity keys;
- exact or approximate hidden compatibility tolerances;
- dense occupancy as the way interactions become frequent.

---

## State of the field

### No reviewed system achieves the full conjunction

The relevant literature contains strong partial precedents:

- digital organisms with emergent parasitism and counter-adaptation;
- systems with long-running genetic and spatial novelty;
- systems with beautiful self-organized continuous forms;
- minimal cellular automata with emergent hierarchical replication;
- developmental grammars that generate convincing plants;
- experimental evolution in which a common ancestor diversifies into interacting ecotypes;
- metrics for evolutionary activity and phylogenetic change.

What is missing is their conjunction under a radically legible visual and causal grammar.

This is an inference from the reviewed literature, not a proof that no obscure system has ever done it. It is nevertheless strong enough to guide the project: the full objective should be treated as research.

### Tierra: the most important ecological precedent

Tierra’s digital organisms unexpectedly evolved parasitism, immunity, counter-immunity, hyperparasitism, cooperation, and cheating. The crucial affordance was not a “predator” class. Programs could search for and execute matching templates in neighboring code, so machinery useful to one organism was accessible to another that learned the same interface. ([review of creativity in digital evolution](https://direct.mit.edu/artl/article/26/2/274/93255/The-Surprising-Creativity-of-Digital-Evolution-A))

The lesson for Commonweave is exact:

> A system is more likely to invent ecology when self-useful machinery is also other-exploitable machinery.

Tierra is not visually plantlike or child-legible, but its ecological symmetry is the strongest precedent for the proposed substrate.

### Stringmol: binding, parasitism, resistance, and higher-order dependence

Stringmol gives all molecular agents access to a small instruction chemistry and a nontrivial binding relation. It has produced parasites, binding resistance, codependent hypercycles, and multispecies interactions. The authors emphasize that a rich “adjacent possible” depends on a substrate in which agents can act on one another through the same chemistry they use generally. ([Stringmol](https://direct.mit.edu/artl/article/22/1/49/2837/Maximizing-the-Adjacent-Possible-in-Automata))

Stringmol suggests one decisive design principle: binding and transfer should occur through a common chemistry rather than through protected organism ownership.

It also supplies a warning: fascinating molecular ecology can be very difficult to read visually. Commonweave should borrow the owner-neutral symmetry, not the representational opacity or a hidden sequence-matching system. If recognition evolves later, it should be physically embodied and visually interpretable rather than introduced as a numeric key.

### Avida and experimental microbial evolution: diversification from one ancestor is plausible

In Avida, frequency-dependent selection over mixed resources generated distinct phenotypic and phylogenetic groups even in a spatially homogeneous environment. ([adaptive radiation in digital organisms](https://pubmed.ncbi.nlm.nih.gov/15232105/))

Laboratory microbial evolution gives an even more relevant precedent. A single Escherichia coli ancestor can diversify into coexisting cross-feeding ecotypes, and the evolved consortium can use resources more productively than any component alone. ([evolved E. coli consortium](https://journals.asm.org/doi/10.1128/AEM.00051-20)) Long-term biofilm evolution has likewise produced reproducible ecological succession, cross-feeding, niche construction, and synergistic communities from initially undifferentiated populations. ([evolved biofilm succession](https://www.nature.com/articles/ismej2010136))

These results matter because the desired ecology does not require initially unrelated trophic groups. Complementarity can arise by divergence from one ancestor when the substrate exposes tradeoffs and reusable consequences.

### Genelife and open-ended evolution: novelty is not enough

Genelife reports ongoing novelty in genomes and spatial patterns, yet its authors say this falls short of functional biological innovation. ([Genelife](https://direct.mit.edu/artl/article/30/3/356/119274/Open-Endedness-in-Genelife))

Similarly, a system can satisfy some formal definitions of open-endedness while remaining behaviorally simple. Indefinite novelty is therefore not a sufficient success measure. ([Open-Endedness for the Sake of Open-Endedness](https://direct.mit.edu/artl/article/25/2/198/2923/Open-Endedness-for-the-Sake-of-Open-Endedness))

Commonweave must measure newly evolved **causal dependence, functional specialization, ecological interaction, and developmental organization**, not merely new bit strings or shapes.

### Flow-Lenia and Lenia: beauty without the required causal transparency

Flow-Lenia shows that mass-conservative continuous cellular automata can support localized creatures and embedded evolutionary parameters, while Lenia demonstrates a rich universe of lifelike moving forms. ([Flow-Lenia](https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass); [Lenia and Expanded Universe](https://direct.mit.edu/isal/article/doi/10.1162/isal_a_00297/98400/Lenia-and-Expanded-Universe))

These are powerful visual precedents. They are not the primary substrate here because continuous convolution kernels and distributed parameter fields make moment-to-moment causality difficult for a casual viewer to infer. They may later inform rendering or a separate artistic branch.

### Minimal cellular automata: few states can yield surprising replication

The Outlier binary cellular automaton produces emergent self-replication at multiple scales from sparse random conditions. It demonstrates that very small rule sets can contain unanticipated hierarchical organization. ([Outlier cellular automaton](https://direct.mit.edu/artl/article/31/1/96/124149/Emergence-of-Self-Replicating-Hierarchical))

It does not yet supply heredity-rich coevolution or plantlike functional morphology. Its value here is epistemic: minimal rules need not mean a small behavioral space.

### Plant developmental modeling: morphology can be a reusable grammar

L-systems and functional-structural plant models show that repeated local developmental operations can generate enormous morphological variety. L-PEACH is especially relevant because it couples a branching developmental representation to source–sink energy flow through a conductive network. ([L-PEACH](https://library.wur.nl/ojs/index.php/frontis/article/view/1378))

Traditional plant models usually encode authored organ types and developmental programs. Commonweave should borrow:

- tip-driven development;
- recursive branching;
- source–sink flow;
- repeated modules;
- local thickening and geometry.

It should not borrow:

- a fixed botanical catalog;
- species-specific growth rules;
- hand-authored leaves, flowers, and trees;
- a goal of matching a known plant.

### Metrics: phylogeny and ecology must be recorded from the start

The MODES toolbox demonstrates ways to measure evolutionary activity and novelty using phylogenetic data, while recent work shows that ecology, spatial structure, and selection pressure leave detectable phylogenetic signatures. ([MODES](https://direct.mit.edu/artl/article/25/1/50/2915/The-MODES-Toolbox-Measurements-of-Open-Ended); [ecological signatures in phylogeny](https://direct.mit.edu/artl/article/31/2/129/130570/Ecology-Spatial-Structure-and-Selection-Pressure))

This means genealogy cannot be retrofitted after the pretty simulation works. Every propagule birth, mutation, extinction, and cross-lineage connection must be recorded from the first prototype.

---

## The two proposed conceptual breakthroughs

### Breakthrough 1: porous ontogeny

Most simple evolutionary simulations decide that an offspring becomes a new organism only after it has detached. Before that moment, it is merely part of the parent; afterward, it is suddenly a protected independent unit. This makes individuality a software declaration rather than something evolution can alter.

Commonweave reverses the order:

> **A bud copies and mutates its genome when it begins, while it is still physically attached to its parent.**

The parent and child are genealogically distinct immediately but remain one connected energetic structure. Because the parent usually holds more energy than the new bud, gold naturally flows into the child through the ordinary local transfer rule. There is no special parental payment and no private body account.

While a visibly thinning neck still connects it to the parent, the child’s developmental tape determines whether and when it detaches. It may:

- detach quickly and become an ordinary self-sufficient propagule;
- remain attached longer while developing collectors;
- save the cost of self-sufficiency by continuing to draw parental energy;
- reproduce while still attached;
- create secondary grafts and a persistent dependent sublineage;
- contribute capture, conduction, structure, or movement and become beneficial;
- generate descendants that later graft onto unrelated bodies.

This supplies the missing neutral on-ramp. A mutant does not have to discard collection, detach, wander through empty space, find a host, and connect before starving. Dependence can evolve through many individually viable increments from a universally useful ancestral condition: every child begins attached.

The associated owner-neutral law is:

> **Any active growing tip that physically touches living tissue may form the same visible graft, and energy obeys the same transfer equation across parent–child bonds, within-lineage bonds, and cross-lineage grafts.**

There is no signature, matching tolerance, mouth type, self-recognition check, or foreign-body exception.

Genealogy remains real, but it is a measurement rather than a force. A physical connected component may contain one lineage or many. A genealogical lineage may inhabit several disconnected bodies. Every birth creates a temporary two-genome organism, allowing the boundary among offspring, parasite, symbiont, organ, and colony to evolve.

This creates visible possible counter-strategies:

- parents detach buds earlier;
- vulnerable distal branches become cheap and disposable;
- high-flow trunks retreat from the reachable perimeter while exposed branches become narrow, low-flow, disposable, or short-lived;
- dependents reproduce before being shed;
- dependents create several grafts rather than one;
- exploratory tips become longer, thinner, or more mobile;
- exploiters target young, thin, energy-rich tissue;
- attached lineages that contribute useful infrastructure are retained.

No predation verb or colored password is needed. Ecology begins as consequences of development and connection.

### Breakthrough 2: morphology is infrastructure

The second proposal is to stop separating “the pretty plant system” from “the ecological system.”

Every visible structure should be actual energetic infrastructure:

- broad tissue collects;
- thick tissue conducts and persists;
- connected tissue shares energy;
- terminal tissue grows;
- detached tissue disperses;
- growing tips can visibly graft onto touched tissue;
- dead tissue remains temporarily as scaffold and history.

A leaflike form is then a repeated region of high capture investment. A branch is a transport path. A seed is a detached energy-bearing developmental fragment. A flowerlike form is a repeated exchange or grafting display at a reproductive terminal. A visiting partner is a lineage whose small body can move efficiently and whose connection changes both lineages’ success.

This unification has three advantages:

1. every aesthetic mark has a causal meaning;
2. selection can shape visible form without an aesthetic objective;
3. the environment is partly made from the accumulated bodies and ruins of prior life.

These two breakthroughs are mutually reinforcing. Porous ontogeny creates an accessible evolutionary path into ecology; morphology-as-infrastructure makes that ecology visible and potentially biophilic.

---

## The Commonweave substrate

### One world, one currency, one universal lineage

The first substrate should be deliberately austere.

It contains:

- a two-dimensional continuous plane;
- a coarse local lattice holding visible ambient energy quanta;
- living modules connected into branching graphs;
- active growing tips that interpret heritable developmental tapes;
- genetically distinct buds that initially remain connected to their parents;
- universal visible grafts formed when active tips touch living tissue;
- temporary dead structure;
- later, a visible changing habitat boundary.

It does not initially contain:

- plant, animal, fungus, predator, prey, pollinator, parasite, or producer classes;
- water, soil, sunlight, temperature, oxygen, minerals, and separate nutrient cycles;
- brains or neural networks;
- global fitness;
- global population replacement;
- owner-protected transport;
- hard-coded aesthetic rewards;
- a third spatial dimension.

All descendants begin from the same compact, self-sufficient ancestor.

### Spatial representation

Use a continuous 2D plane for bodies and a spatial hash for local encounters. Body segments may take arbitrary angles, preserving Sampler’s graceful branching and avoiding the blockiness of a strict pixel automaton.

The only discretized world field is a coarse hexagonal energy lattice. Each local cell holds a small integer number of visible gold energy quanta. Quanta:

- arrive locally at a low uniform rate;
- diffuse to adjacent cells;
- are removed by nearby capture tissue;
- receive leaked energy from starving or dead tissue.

At ordinary speed, the viewer sees sparse gold motes or a gentle gold brightness. There is no separate energy overlay; the resource is part of the primary picture.

This is not light or shade. Bodies do not cast shadows. It is a deliberately abstract free-energy flux that creates local depletion and movement without requiring a catalog of environmental variables.

### The universal body module

Every living module uses the same mechanics. A module has:

- position and orientation;
- stored energy;
- structural investment;
- capture investment;
- age and maintenance cost;
- zero or more physical bonds;
- optional active-tip state;
- a lineage and genome identifier for measurement only.

Structural and capture investments are visible and costly.

- More capture investment creates a wider, thinner, translucent collecting surface. It acquires ambient energy efficiently but costs maintenance and is fragile.
- More structural investment creates a thicker, darker, persistent conduit. It carries energy with less loss, supports more connected mass, and survives longer, but costs more to build.
- Low-mass fragments move cheaply.
- High-mass connected bodies move very inefficiently.

The first prototype should use one explicit allocation tradeoff rather than a growing list of tissue types. If a single universal tissue cannot produce useful specialization, a second tissue channel may be added only after an ablation demonstrates the need.

### Energy

There is one currency.

Energy is:

- captured from the visible local field;
- stored in modules;
- transferred through bonds down local energy gradients;
- spent on maintenance, growth, genome copying, detachment, and motion;
- leaked locally when tissue is damaged, starves, or decays.

There is no central body bank and no owner account. Transfer happens between connected modules. This makes energy movement visible and prevents a hidden organism-level ledger from defining individuality.

Fixed resource input and unavoidable maintenance should bound biomass. The engine must not cull organisms merely because a population cap was reached. If a technical cap is reached, the run is invalid and should stop with a diagnostic rather than silently selecting winners.

### Budding and grafting: the critical rules

There is no mouth key, lock, signature, compatibility number, or hidden recognition tolerance in the MVP.

Two kinds of connection exist, but they obey identical transport physics:

1. **Developmental bond:** ordinary growth leaves connected tissue behind.
2. **Graft:** an active growing tip touches any living module and joins it.

A bud begins across a visibly narrowed developmental neck. The parent’s bud instruction determines how much costly structure is invested in that neck. The neck then thins at a fixed local rate and breaks when its visible width reaches zero; the child’s mutated tape may detach earlier. No hidden countdown is required. This gives both sides leverage without an identity check:

- descendants can delay voluntary detachment while the neck visibly remains;
- parent lineages can evolve thinner or thicker neck investment and therefore shorter or longer provisioning;
- dependent children can counter early abscission by reproducing sooner or creating secondary grafts;
- a viewer sees the narrowing and break.

Grafting does not require terminal-to-terminal coincidence. Restricting the target to tiny terminal points would recreate Thicket’s density problem. A growing tip can encounter any exposed living segment, making interaction frequency scale with visible body extent rather than occupied area alone.

Every bond:

- is drawn continuously;
- has visible width and finite carrying capacity;
- transfers energy down the same local gradient;
- may connect modules from the same or different genealogical lineages;
- is created without consulting lineage identity;
- can later disappear only through visible death, breakage, or a developmental abscission event.

A successful graft consumes the initiating active tip: that tip becomes the visible junction instead of continuing invisibly through the target. Passive segment crossings do not bind.

A cross-lineage graft should be visually unmistakable: differently hued tissue meets at a narrow bridge and gold pulses show the direction and magnitude of transfer.

The engine may record whether a bond crosses a lineage boundary, but that fact is forbidden from affecting conductance, durability, or formation.

If universal grafting later proves too indiscriminate, the next experiment should use visibly embodied mechanics—such as exposed-versus-thickened tissue, approach angle, contact length, or conduit width. It should not silently restore a numeric password.

### The developmental tape

Each active tip carries a short circular heritable tape. The tape is a sequence of local operations. The initial instruction alphabet should contain no more than:

1. extend;
2. turn;
3. split;
4. set capture-versus-structure allocation;
5. bud;
6. detach;
7. thrust;
8. wait or skip.

The tape loops. A split creates two active tips that can continue from different tape positions. This gives a short genome combinatorial depth:

- repetition creates modules;
- split plus offset creates branching programs;
- local allocation changes create functional differentiation;
- bud creates a genetically distinct child while preserving physical attachment;
- detach determines whether and when a connected child becomes independent;
- thrust creates motile phases;
- contact between an active tip and living tissue creates graft opportunities.

Every operation waits until the local tip can pay its energy cost. The genome does not receive a global fitness signal.

The initial prototype should avoid arbitrary scripting, neural networks, and dozens of sensory conditions. If conditional behavior is later necessary, add only two directly visible local predicates:

- enough energy / not enough energy;
- touching / not touching.

Any additional sensor requires a specific failed experiment that it repairs.

### Growth

An active tip spends local energy to execute the next developmental operation.

- Extend leaves a functional segment behind and moves the active tip.
- Turn changes the next extension direction.
- Split creates another tip.
- Allocation changes the real capture and structural properties of subsequent segments.
- Bud copies and mutates the tape into a new child tip without breaking the physical parent–child bond.
- Detach voluntarily breaks the child’s visible bud neck or another locally marked abscission neck.
- Thrust displaces the entire connected component at a cost proportional to its mass.

This preserves the attractive bud-and-trail idea in a stricter form: the bud is not an autonomous special agent class. It is simply the active frontier of the universal developmental graph.

### Reproduction and generations

Reproduction is a world event, not a scheduler event.

A new generation begins when a parent tip executes **bud**:

- the parent tape is copied and mutated immediately;
- the child receives a new genealogical identity and begins executing its own tape;
- the child remains physically joined to the parent through the already visible developmental bond;
- the parent-created neck visibly thins toward physical separation;
- energy continues to flow according to local gradients;
- the child may detach, remain connected through a long-lived neck or secondary grafts, or reproduce while attached.

This timing is essential. Genetic separation precedes physical separation, so individuality can evolve rather than being imposed at detachment.

The child inherits whatever energy and modules were physically allocated to its bud. Propagule size, parental investment, attachment duration, stored energy, dispersal time, and independence are therefore evolvable life-history traits.

Mutation occurs only during the bud copy:

- small parameter perturbation;
- instruction substitution;
- instruction insertion;
- instruction deletion;
- short sequence duplication;
- rare short sequence inversion.

There is no crossover in the first experiment. Sexual exchange should not be added until a reason emerges from the substrate.

The engine records:

- parent genome;
- child genome;
- bud initiation time;
- physical detachment time, if any;
- generation depth;
- region;
- phenotype summary;
- extinction time.

The viewer sees a generation counter based on actual parent–child depth, not raw simulation events.

### Motion, anchoring, and life-cycle evolution

All detached components experience slight visible drift. Any active tip may also execute thrust, which costs energy in proportion to connected mass.

This single rule creates a natural asymmetry:

- tiny propagules can move;
- large branched collectors are effectively stationary;
- a lineage can evolve a long motile phase, an immediate settling phase, or repeated movement;
- a motile lineage’s active tip can graft to a larger lineage;
- a motile partner may move a small attached propagule more cheaply than the parent could.

No organism is declared an animal or a plant.

Optional substrate anchoring may be introduced as a visible bond to habitat after the first exploitation experiment. It should use the same general connection concept and impose no taxonomic role.

### Death and visible history

A module that cannot pay maintenance loses integrity and dies.

Dead modules:

- turn gray immediately;
- stop active collection and development;
- retain physical shape and partial conductance for a limited time;
- leak stored energy into the local field;
- can be used as physical scaffold by any touching lineage;
- decay locally and eventually disappear.

This makes history literal. A community leaves:

- depleted and replenishing energy zones;
- living connections;
- abandoned conduits;
- attachment opportunities;
- physical obstacles and scaffolds;
- altered distributions of lineages.

The first prototype should test whether this is sufficient historical memory. A hidden soil chemistry should not be added preemptively.

### The ancestor

The common ancestor should be as small as possible while completing a self-sufficient life cycle.

It should:

- extend a short structural stalk;
- split into a few capture-bearing branches;
- accumulate energy;
- initiate one genetically distinct side bud while it remains physically connected;
- nourish that bud through ordinary energy flow;
- detach that propagule;
- allow the propagule to drift briefly;
- repeat.

Its genome should be short, visibly reconstructible, and deliberately imperfect. Its ordinary lifecycle should make both slightly earlier and slightly later detachment viable, so dependence has a continuous mutational on-ramp.

All initial populations should be clones of this ancestor unless a control explicitly says otherwise.

### Update cycle

One biological tick applies the following local operations:

1. inject and diffuse ambient energy among neighboring world cells;
2. let capture tissue remove local energy;
3. transfer stored energy along each bond using the same equation;
4. deduct local maintenance;
5. let affordable active tips execute one tape operation;
6. detect active tips touching any living segment and form universal grafts;
7. apply drift and paid thrust to detached components;
8. kill unsupported modules and decay dead structure;
9. record buds, detachments, deaths, transfers, mutations, grafts, and regional movement.

The simulation may process these operations in randomized local order using a seeded random generator. It must produce exactly the same result from the same seed and settings.

No stage asks which lineage is “fittest.”

---

## How ecological roles could emerge

These are pathways the substrate permits, not promised outcomes.

### Self-sufficient collectors

The ancestor and many descendants collect more ambient energy than they receive through foreign connections. They build branching collection networks and reproduce independently.

This is producer-like behavior, but “producer” is only an analytical label.

### Exploiters

A descendant initially remains attached slightly longer than its ancestor. Because parental energy continues to arrive, later descendants can reduce costly capture tissue without crossing an immediate lethal gap.

A possible sequence is:

1. ordinary child detaches after being provisioned;
2. mutant child delays detachment;
3. delayed child reallocates from collection toward faster budding;
4. attached child reproduces before separating;
5. dependent descendants form a persistent lineage on a collector body;
6. later motile descendants graft onto unrelated collectors.

The lineage eventually starves or reproduces sharply less when isolated. When attached to a collector, visible energy flow lets it grow and reproduce. It has become parasite-like without a predation rule or a prewritten mouth.

### Resistance and counter-resistance

A host lineage may:

- detach offspring earlier;
- shed distal tissue on a shorter cycle;
- place buds on cheap sacrificial branches;
- isolate exposed tissue behind narrow low-conductivity necks;
- keep high-flow trunks away from the reachable perimeter;
- shift energy away from a draining junction;
- change the timing or location of budding.

An exploiter lineage may:

- reproduce before abscission;
- form several grafts;
- grow long inexpensive searching tips;
- remain small and mobile;
- target young thin tissue;
- shift its arrival or reproductive timing.

Time-shift assays can determine whether this is genuine reciprocal adaptation rather than one-sided optimization.

### Mutual benefit

An attached lineage may contribute:

- additional capture area;
- lower-loss conduction;
- physical reinforcement;
- transport of a small connected propagule;
- access to a different local energy patch;
- reuse of dead scaffold.

If both partners reproduce better together than separately, and each contribution is costly, the relationship is mutualist-like. No cooperation bonus is required.

### Cheating

Within a mutually useful association, a mutant may reduce its costly contribution while retaining imported energy. That is cheating as an emergent strategy. Shedding, altered flow, spatial avoidance, and counter-cheating may follow.

### Higher trophic structure

An exploiter can itself be exploited because its active growth and living tissue obey the same universal grafting physics. A lineage may attach to a host through an intermediate lineage, or become dependent on a multispecies energy network.

This permits parasite, hyperparasite, mutualist, and mixed roles to arise on one substrate. It does not guarantee a rich food web. That is precisely what the experiments must test.

### Flower-and-visitor analogues

A plausible, difficult path is:

1. a stationary collector lineage evolves energy-rich detachable propagules;
2. dispersal limits its reproduction;
3. a small motile lineage attaches to energy-rich terminals and receives energy;
4. while attached, it moves or carries a small propagule farther;
5. collector descendants with more accessible repeated terminals encounter the motile lineage more often;
6. motile descendants with better timing, approach geometry, persistence, or graft placement extract energy more reliably;
7. both lineages become increasingly fitted to the interaction;
8. repeated radial or bilateral exchange displays become flowerlike because encounter and transfer reward that geometry.

This is the project’s highest-order aspiration, not the first milestone. If a flower is rendered before such a function exists, the project has cheated.

---

## Autonomous history, geography, and invasion

### Why this comes after porous ecology

Isolation and reconnection cannot create deep coevolution if lineages have little capacity to affect one another. Geography should therefore be phase three, not a substitute for the core ecological substrate.

### The visible archipelago

The proposed baseline landscape is a single 2D view containing habitat and void.

Living structures may grow and drift within habitat. Crossing void is costly or impossible for large bodies, while small propagules may occasionally cross short gaps.

Habitat boundaries change through a slow local rule:

- exposed habitat edges sometimes erode;
- concave void cells adjacent to several habitat cells sometimes accrete;
- dead and living anchored structure locally reduce erosion;
- rare local fluctuations prevent a permanently frozen coastline.

Every change is visible at the boundary. There is no user-operated gate, global migration event, or invisible island scheduler.

This rule should be tuned so that:

- narrow bridges sometimes disappear;
- nearby islands sometimes reconnect;
- large regions persist for many generations;
- the total habitat does not drift monotonically to all-land or all-void;
- organisms can modestly influence local persistence without controlling the whole map.

If local erosion/accretion cannot sustain useful geography without a hidden global area correction, the fallback is a visible slowly moving “tide front” whose motion is itself shown in the main view. This is less elegant and should be treated as a controlled compromise.

### Historical regional identity

A region’s identity is constituted by:

- its resident lineages;
- their evolved attachment, abscission, defense, and contribution strategies;
- their dependencies and antagonisms;
- its living transport networks;
- its dead scaffolds;
- its characteristic energy depletion and recovery patterns;
- its stabilized or eroded habitat edges.

No separate “biome ID” is needed.

### Operational definitions

**Native lineage:** a lineage whose recent ancestry has persisted and evolved within a region during a long interval of limited exchange.

**Introduced lineage:** a lineage whose ancestry crosses into a region after that interval.

**Invasive lineage:** an introduced lineage that, from low initial frequency, expands rapidly and produces a large change in resident abundance, diversity, energy flow, or network structure.

**Naturalized lineage:** an introduced lineage whose descendants become part of a persistent reorganized community after the initial disruption.

These are measurements derived from genealogy, geography, and effects. They never affect birth or survival.

### Dynamic homeostasis

Homeostasis should mean bounded organization under continuous turnover, not a fixed composition.

Possible evidence includes:

- total living energy remains within a broad range;
- energy throughput recovers after disruption;
- multiple lineages persist or are replaced by a new persistent set;
- interaction networks reorganize rather than simply disappearing;
- disturbance variance decays without returning to the exact prior state;
- extinction risk remains nonzero.

The desired image is indeed orbital: a system continually changing and continually constrained, never finished.

### The invasion experiment

After two or more regions have been isolated for thousands of median generations:

1. allow natural boundary motion to create a bridge or crossable gap;
2. record every natural migrant;
3. identify low-frequency establishment;
4. measure spread and effects without intervening;
5. preserve snapshots before contact;
6. replay counterfactual controls in which the same migrant is introduced into its home region, an earlier version of the recipient, and an already coevolved recipient;
7. continue long enough to observe collapse, rejection, coexistence, or reorganization.

The baseline story remains autonomous. Counterfactual replays are analytical copies and do not affect it.

---

## Why not 3D first

Three-dimensional space changes random-walk recurrence and gives bodies more routes around one another. It could reduce the dominance of narrow-gap packing and permit more complex contact networks.

It does not solve the central problem.

- It does not create exploitable machinery.
- It does not create reciprocal dependence.
- It does not accelerate generations.
- It makes occlusion and screenshot legibility much worse.
- It increases computation and parameter search costs.
- It can conceal rather than clarify interaction.

Commonweave should therefore begin in 2D with porous connections and with crossing filaments permitted when they do not explicitly bind. Space should constrain movement and contact, but it should not be the sole fitness function.

If 2D packing still dominates after the core ecology works, the first spatial expansion should be **three adjacent 2D sheets**, not free 3D. Each sheet would be shown simultaneously as a fixed triptych, with only local visible transfer points between neighboring sheets. This preserves a screenshot-readable topology and directly tests whether additional escape routes create new ecological strategies.

True 3D should be a later artistic or scientific branch.

---

## The legibility contract

Legibility is a simulation invariant, not a polish pass.

### The child-level rules

A first-time viewer should be able to understand the world from five sentences:

1. Gold appears in space, and broad tissue catches it.
2. Gold flows through anything that is visibly connected.
3. Growth, motion, copying, and staying alive spend gold.
4. Tips repeat inherited growth patterns, and copied patterns sometimes change.
5. New children begin attached, and any growing tip that touches living tissue can graft to it.

Death and decay are visually self-explanatory: gray tissue is no longer alive and slowly disappears.

### The single-view visual alphabet

The main view should always encode mechanics directly:

- **gold motes and pulses:** available and moving energy;
- **broad translucent tissue:** capture investment;
- **thick opaque tissue:** structural and conductive investment;
- **bright terminal point:** active developmental tip;
- **a hue change across an unbroken branch:** a genetically distinct child that remains attached;
- **visible bridge between different tissue hues:** cross-lineage connection;
- **small detached body:** propagule or motile fragment;
- **gray fading structure:** dead scaffold;
- **background habitat edge:** current geography;
- **tissue hue:** broad genealogical family.

No essential fact should require a heatmap mode.

Tissue hue identifies broad ancestry. An attached newborn should visibly take on its descendant hue at the exact bud boundary, while the continuous branch and gold pulses show that genetic separation has occurred before physical separation. No extra glyph is needed to explain compatibility because compatibility does not exist in the MVP.

### The screenshot standard

Every normal screenshot should contain:

- the complete living scene;
- the gold energy field;
- all active inter-lineage connections;
- visible propagules and deaths;
- habitat boundaries;
- a compact permanent legend;
- the current time and median generation depth;
- a thin always-present ancestry ribbon showing major extant clade splits and extinctions.

The ancestry ribbon is not an overlay switched on and off. It is a stable part of the composition, analogous to a scale bar on a map. It should occupy little space and use the same clade hues as the world.

A screenshot cannot contain every ancestral event, but it should let an attentive viewer infer:

- which forms gather energy;
- where energy is moving;
- which lineages are connected;
- which structures are growing, moving, reproducing, or dying;
- whether several clades exist;
- roughly how many generations have elapsed;
- whether the current community is old, newly invaded, or rapidly reorganizing.

### Time and speed

At 1×:

- tips should visibly grow every few seconds;
- new descendant hues should appear on still-attached buds;
- propagules should detach regularly;
- at least some lineages should complete lifecycles in tens of seconds, not hours;
- births and deaths should be apparent.

Acceleration controls should be:

- 1× Watch;
- 10× Grow;
- 100× Generations;
- 1,000× Evolve;
- Run to next notable event.

“Notable event” is a read-only analytical bookmark such as a new persistent clade, a newly dependent lineage, first counter-adaptation, bridge formation, or invasion. It must never alter selection.

The engine should retain a deterministic rolling replay buffer. When an important event is detected during fast-forward, the viewer can replay the preceding interval at watch speed and see the cause.

### User-interface restraint

The eventual MVP should have:

- one canvas;
- play/pause;
- speed;
- restart with seed;
- save/load state;
- a rules card;
- optional click inspection for exact numbers;
- no stack of visualization toggles.

Analytics belong in an exportable research log or a secondary details drawer, not in competing main views.

---

## Performance and generational depth

“Countless generations” is not achieved by displaying a huge event counter.

### Two clocks

The implementation should separate:

- the biological clock, which performs local simulation ticks;
- the presentation clock, which renders only enough frames for the selected speed.

Fast-forward should execute the same deterministic rules without drawing every intermediate state. It may run in a Web Worker so the interface remains responsive.

### Initial performance targets

These are engineering targets, not scientific definitions:

- ordinary mode: a recognizable lifecycle in roughly 10–30 seconds;
- watchable population: hundreds of simultaneous independent bodies or propagules;
- browser fast-forward: at least hundreds of median lineage generations per minute on a typical laptop;
- headless research mode: at least tens of thousands of generations per run without manual input;
- checkpoint and resume at any point;
- deterministic replay from seed plus settings.

The first exploitation experiment does not need a million visually rendered organisms. It needs enough independent births, deaths, and contact opportunities for mutations to be tested repeatedly.

### Data structures

The eventual implementation should use:

- packed arrays for modules, bonds, tips, and world energy;
- a spatial hash for local contacts;
- compact genome interning so identical tapes share storage;
- incremental connected-component tracking;
- a seeded pseudorandom generator;
- event logs summarized online rather than storing every tick forever;
- periodic full checkpoints plus a rolling fine-grained replay window.

Canvas 2D is preferable for the first legible prototype. If rendering, rather than simulation, becomes the bottleneck, instanced WebGL lines may be introduced without changing the mechanics.

---

## Experimental roadmap

The roadmap is ordered by existential risk. Beauty and geography do not deserve major investment until the substrate demonstrates autonomous ecological invention.

### Stage 0: the mechanics proof

**Question:** Can the common ancestor live, reproduce, mutate, and die under owner-neutral local energy rules?

Build only:

- one continuous plane;
- visible ambient energy;
- universal modules;
- developmental tape;
- bud-at-initiation reproduction;
- genetically distinct children that remain physically attached;
- universal tip-to-tissue grafting;
- drift and optional thrust;
- death and temporary scaffold;
- genealogy;
- deterministic fast-forward.

Do not build:

- changing geography;
- multiple resources;
- named species;
- flowers;
- custom invasion events;
- elaborate statistics in the interface.

Required invariants:

- energy accounting closes within numerical tolerance;
- every bond obeys the same transfer equation;
- no mechanics query lineage ownership;
- births occur at actual bud initiation, before optional detachment;
- an attached child executes its own mutated tape and is genealogically distinct;
- generation depth increments correctly;
- identical seeds replay identically;
- resource input and maintenance bound biomass without culling;
- the ancestor persists in a viable parameter range but can still go extinct.

Failure at this stage is an engineering defect, not an evolutionary result.

### Stage 0.5: the sparse-garden contact gate

**Question:** Can interaction opportunities occur often enough for selection while individual bodies remain visually separable?

This gate comes before the evolutionary exploitation experiment. Contact frequency may not be rescued by allowing the world to become a Thicket-like mat.

Run controlled populations of self-sufficient ancestor descendants at a presentation density where bodies remain recognizable. Initial operational targets:

- roughly 5–15% of the canvas covered by living tissue;
- at least 80% of mature bodies traceable as distinct forms by a naïve screenshot observer;
- parent–child energetic contact during every normal birth;
- a median of at least 0.25 non-parental tip-to-body encounter opportunities per mature lifetime;
- successful grafts distributed across the world rather than confined to one crowded knot.

The exact thresholds may be refined, but the test must simultaneously specify readability and interaction frequency.

Compare:

- terminal-to-terminal contact, expected to be too rare;
- active-tip-to-any-living-tissue grafting;
- short versus longer thin exploratory tips;
- with and without slight propagule drift;
- with and without nonbinding filament crossings.

Allowed repairs are visible changes to reach or motion:

- longer low-mass searching tips;
- small drifting or thrusting propagules;
- wider but still visibly thin encounter structures;
- nonbinding crossings that prevent empty space from becoming a hard wall.

Disallowed repairs:

- increasing occupancy into an illegible mat;
- hidden attack radii;
- invisible long-range energy theft;
- a global encounter lottery;
- numeric compatibility keys.

**Kill criterion:** if ecologically useful non-parental encounters require approximately 40–60% occupancy or an invisible interaction aura, stop before Stage 1 and redesign the contact substrate.

### Stage 1: the Attached Ancestor experiment

**Question:** Can descendants of one self-sufficient ancestor evolve along a continuous path from temporary attached childhood to heritable dependence, then begin colonizing non-parental bodies?

Start many identical seeded worlds from the same ancestor. Permit only mutations to the common developmental tape and parameters.

The experiment has two nested milestones.

**Milestone A — vertical dependence:**

- substantially reduced or absent ambient capture;
- longer attachment than the ancestor;
- positive net energy import from the parent lineage;
- successful reproduction while attached;
- failure or sharply reduced reproduction when experimentally isolated;
- descent from the self-sufficient ancestor through ordinary mutation;
- persistence for multiple generations rather than a one-off accident.

**Milestone B — horizontal ecology:**

- a dependent or facultatively dependent lineage detaches or produces a mobile descendant;
- an active tip grafts onto a non-parental collector;
- the lineage establishes and reproduces on that body;
- the relationship persists through repeated non-parental colonization;
- success depends on visible attachment, timing, or morphology rather than a hidden identity match.

Initial decision threshold:

- run at least 50 independent seeds;
- allow at least 20,000 median generations per viable seed;
- require repeatable vertically dependent lineages in at least 10 seeds before calling the on-ramp promising;
- require persistent non-parental colonization in at least three seeds before claiming emergent exploitation;
- require at least one lineage to persist for 100 dependent generations;
- rerun successful genomes under fresh spatial and resource seeds.

The exact numbers may be adjusted for computation, but the test must remain precommitted and difficult enough to prevent wishful interpretation.

Controls:

- mutation at bud initiation versus mutation only after detachment;
- evolvable versus fixed ancestral bud-neck investment and child detachment timing;
- normal parent–child flow versus forced severance immediately after budding;
- universal grafting versus non-parental grafting disabled;
- owner-protected flow, expected to suppress ecological dependence;
- no deletion/duplication mutation, testing whether genome architecture matters;
- no motion, testing contact dependence;
- infinite uniform energy, testing whether scarcity is necessary;
- partner-architecture swaps with equal biomass, testing whether visible form and timing matter.

**Kill criterion:** if broad parameter sweeps produce only self-sufficient collectors, undifferentiated permanent colonies, space-fillers, or transient drains that cannot form a distinct dependent lineage, do not add geography or aesthetics. Reconsider the substrate.

### Stage 2: reciprocal counter-adaptation

**Question:** Does dependence create an evolutionary dialogue?

Required evidence:

- host descendants reduce exploitative loss relative to their ancestors;
- abscission, tissue allocation, timing, topology, or energy-flow changes explain the reduction;
- later exploiter descendants regain access or shift hosts;
- each change improves success specifically against the contemporary counterpart;
- the pattern repeats in multiple independent seeds.

Use time-shift assays:

- contemporary host versus past, contemporary, and future exploiter;
- contemporary exploiter versus past, contemporary, and future host.

Look for a moving interaction optimum rather than monotonic general improvement.

Initial success threshold:

- at least three independent runs show two or more alternating host/exploiter adaptations;
- evolved exploiters are measurably worse on at least some historically unfamiliar or differently defended hosts;
- evolved host defenses carry a cost in the absence of exploitation or reduce internal developmental flexibility.

If every lineage evolves immediate detachment or complete avoidance of grafting, the substrate has found a trivial endpoint. Possible repairs, in order:

1. ensure attached development is genuinely useful to the ancestor;
2. ensure shedding, low-flow isolation, and early detachment carry visible energetic or reproductive costs;
3. allow several visible graft placements and searching morphologies;
4. preserve spatial refuges and low-density encounter opportunities;
5. only then consider an additional ecological dimension.

### Stage 3: complementarity, cheating, and higher-order networks

**Question:** Can attached lineages contribute distinct costly functions and become more successful together?

Do not add a mutualism rule. Continue the same substrate and search for:

- collector–carrier pairs;
- collector–conductor pairs;
- scaffold users;
- mixed networks with complementary capture locations;
- exploiters of exploiters;
- cheaters within beneficial associations.

Dependency assays:

- reproduce each lineage alone in the same physical environment;
- reproduce the intact association;
- ablate one partner’s contributed structures without altering the other;
- swap historical partners;
- compare energy capture, maintenance, propagule production, and persistence.

A mutualist-like result requires:

- both lineages descend from the common ancestor;
- each performs a costly function;
- each reproduces better with the evolved partner than alone;
- the benefit survives replay under new spatial seeds;
- at least one lineage becomes partially dependent;
- a reduced-contribution cheater is possible and changes selection.

This stage is the first point at which “emergent trophic structure” may be claimed, and even then only descriptively.

### Stage 4: autonomous archipelago and invasion

**Question:** Can local world dynamics generate long isolation, renewed contact, invasion, and later ecological reorganization?

Add the visible habitat/void coastline rule only after stages 1–2 succeed.

Required landscape behavior:

- regions remain isolated for evolutionarily meaningful spans;
- isolation is partial rather than absolute for every propagule;
- boundaries visibly change through local events;
- reconnection occurs without user action;
- organisms modestly influence erosion or stabilization;
- the landscape does not require a hidden scheduled gate.

Required evolutionary behavior:

- regional phylogenies diverge from the same ancestor;
- grafting, abscission, morphology, timing, and dependencies differ among regions;
- reciprocal transplant fitness depends on history;
- some natural migrants fail;
- at least one migrant expands strongly in an unfamiliar region;
- disruption is measurable;
- some disturbed runs later form a persistent new organization;
- other runs may collapse.

Controlled isolation and reintroduction should be run in parallel as an assay, but never substituted for the autonomous baseline.

### Stage 5: functional biophilic expansion

**Question:** Can the proven ecology express more varied useful morphology without losing legibility?

Only now consider:

- local thickening in response to sustained flow;
- duplication of repeated sub-branches;
- a visible developmental phase bit;
- visible abscission zones;
- variable graft persistence or carrying width;
- local curvature or branching angle mutations;
- energy storage swelling;
- structural reuse of dead tissue;
- one additional visible environmental consequence if an ablation justifies it.

The first morphology targets are functional:

- capture surfaces that improve energy return;
- conductive trunks that reduce transfer loss;
- detachable stored-energy propagules;
- repeated exchange displays that increase beneficial encounters;
- partner-carried propagules;
- branched forms that outperform simple radial growth for reasons other than narrow-gap packing.

Do not optimize a beauty score. Human aesthetic evaluation may compare outputs afterward, but must not select organisms inside the baseline.

### Stage 6: open-endedness and major transitions

This is a research horizon, not an MVP promise.

Possible evidence would include:

- persistent creation of new functional dependencies;
- increasing developmental modularity;
- new levels of individuality in multispecies connected networks;
- evolving life cycles with alternating attached and independent phases;
- expansion of grafting, abscission, transport, and partner-retention strategies;
- repeated niche construction and reuse;
- novelty that changes what subsequent evolution can do.

The field lacks a single decisive definition of open-ended evolution. Commonweave should report multiple measures and avoid claiming success merely because novelty continues.

---

## Assays and measurements

The visible world remains simple. The research log may be rigorous.

### Natural selection

Record:

- parent–child relationships;
- viable offspring per lineage;
- lifetime energy budget;
- age at first reproduction;
- propagule size;
- mutation effects;
- extinction and persistence.

Evidence for adaptation requires evolved descendants to outperform ancestors in the historical environment, with the causal trait identified when possible.

### Lineage diversification

Record:

- phylogenetic branching;
- phenotypic distance;
- attachment duration, grafting behavior, abscission strategy, and flow dependence;
- regional persistence;
- ecological dependence.

Do not define species solely by genome distance. A provisional species or ecotype is a persistent clade that is genealogically, phenotypically, or ecologically distinguishable.

### Coevolution

Use:

- host–partner time-shift assays;
- reciprocal transplant assays;
- graft frequency, placement, duration, and success trajectories;
- abscission, shedding, tissue-allocation, and reproductive-timing trajectories;
- changes in partner-specific energy flow;
- negative frequency dependence;
- counterfactual replays from stored checkpoints.

Coevolution requires reciprocal evolutionary change, not merely two lineages changing at once.

### Dependence and ecological role

For each lineage, partition energy gained from:

- ambient capture;
- same-lineage bonds;
- cross-lineage bonds;
- decaying scaffold leakage.

Then test reproductive success:

- alone;
- with its evolved partners;
- with ancestral partners;
- with unrelated contemporary lineages.

Post hoc labels may be assigned only from these effects.

### Morphological function

Measure:

- capture area and energy return;
- transport path length and loss;
- branching order;
- repeated motifs;
- allocation specialization among modules;
- structural persistence;
- propagule dispersal distance;
- encounter and successful graft rate at exchange displays;
- benefit of thickening or widening.

A recognizable form counts only when its removal or alteration changes function.

### Environmental history

Transplant the same frozen lineage into:

- a fresh world;
- its historical region with living community removed;
- its historical region with both community and dead scaffold preserved;
- another region of the same age;
- an earlier checkpoint of its own region.

Differences reveal whether history resides in physical traces, resident lineages, or both.

### Invasion

Measure:

- establishment probability from low frequency;
- spatial spread;
- biomass and energy-flow change;
- resident extinction;
- phylogenetic diversity;
- interaction-network reorganization;
- time to peak disruption;
- time to new bounded dynamics;
- failure, coexistence, replacement, or collapse.

Compare:

- naïve recipient;
- historically coevolved recipient;
- recipient after prior exposure;
- invader’s home region.

### Dynamic homeostasis

Use rolling measures of:

- total living energy;
- throughput;
- lineage richness;
- evenness;
- turnover;
- extinction rate;
- network connectivity;
- variance after disturbance;
- recovery to a range, not an exact state.

Do not collapse these into a fitness score used by evolution.

### Open-ended activity

Adapt ideas from MODES:

- new genotypes that persist;
- new phenotypic organizations that persist;
- phylogenetic activity;
- ecological interaction novelty;
- functional dependency novelty;
- expansion in developmental tape use;
- new levels of connected individuality.

Report the separate curves. A single “complexity” number would hide too much.

---

## Parameter search without designing the answer

A minimal rule set still has parameters. Searching them is legitimate if the target is a broad process rather than a desired organism.

### Acceptable search targets

- the ancestor can persist without exploding;
- biomass is bounded by energy;
- many generations occur;
- mutations are neither always lethal nor neutral;
- parent–child and non-parental contact happen often enough at screenshot-legible density;
- no single geometric packing strategy monopolizes all runs;
- the system is computationally tractable.

### Unacceptable search targets

- maximize number of flowers;
- maximize beauty;
- maximize predators;
- force exactly three trophic levels;
- reward invasions;
- reward recovery;
- reward novelty directly;
- select a screenshot because it resembles a designed garden and then claim emergence.

### Procedure

1. Define broad viable ranges using ancestor-only runs.
2. Freeze a preregistered parameter ensemble.
3. Run many seeds.
4. Classify outcomes using read-only assays.
5. inspect failures and successful mechanisms.
6. change a rule only when an ablation identifies a missing affordance.
7. rerun the full ensemble after every rule change.

Successful parameter values should occupy a region, not a single knife-edge point.

---

## What should be culled from the initial design

### Multiple environmental resources

Water, light, soil, heat, and nutrients can create niches, but each also adds hidden state and makes it easier to pre-author trophic roles. Start with one visible energy field.

A second resource should be added only if:

- porous ontogeny and universal grafting work;
- ecology still converges trivially;
- an experiment shows that a new conserved or transformed quantity creates qualitatively new strategies;
- the new quantity is visible in the same view.

If added, the preferred form is not “water” or “nitrogen.” It is a second generic byproduct created by using the first, because cross-feeding can then evolve from universal metabolism rather than assigned diets. Experimental and theoretical work shows that waste-product exchange and resource tradeoffs can generate diversification and mutual dependence. ([mutual waste-product ecology](https://pubmed.ncbi.nlm.nih.gov/15107227/); [cross-feeding diversification model](https://esj-journals.onlinelibrary.wiley.com/doi/10.1007/s101440200008))

### Light and shade

Do not add directional light or shadow in the first substrate. It would likely make vertical access and crowding the dominant selection pressure, recreating the narrow-gap problem in another form.

Broad tissue gathers a generalized local energy flux. Neighbors deplete that flux locally but do not cast hard shadows.

### Distinct leaf particles

Do not begin with a “leaf” body-part tag. Let capture allocation create broad functional tissue.

If this fails to produce spatial specialization, test one generic membrane operation that increases local capture area and fragility. Call it a membrane in the mechanics; call an evolved repeated membrane a leaf only after observing function.

### Hard-coded predation

Do not implement bite, kill, hunt, prey value, attack strength, or predator sensors.

Death may occur through energy loss, structural failure, or resource competition. A lineage that accelerates another’s death through universal connection physics may later deserve a predator-like description.

### Global generations

Do not periodically erase the world and spawn a selected next generation. Births and deaths must overlap in continuous ecological time.

### Owner checks

Do not use owner identity to:

- permit bonds;
- share energy;
- prevent theft;
- distinguish self from other;
- decide who may use scaffold;
- calculate maintenance.

Owner and lineage fields may exist solely for color, genealogy, and analysis.

### Numeric recognition keys

Do not implement:

- signatures that determine who can connect;
- mouth keys;
- lock-and-key integers;
- hidden similarity tolerances;
- hue distance as a permission rule.

Tissue hue may show ancestry, but it must not secretly decide conductance or attack. If universal grafting later needs selectivity, test visible physical variables first and require an ablation showing why they are necessary.

### Density as the encounter engine

Do not increase occupancy until interactions become frequent. That reproduces Thicket’s measured ecological activity at the cost of the project’s first goal.

The allowed encounter mechanisms are visible body extent, active searching growth, tip-to-any-tissue contact, brief mobility, and attached birth. If those do not support ecology in a sparse garden, the substrate has failed its legibility requirement.

### Guaranteed homeostasis

Do not stabilize diversity with a hidden balancing controller. Negative frequency dependence and recovery must arise from ecological feedback or not arise.

### Full 3D

Defer it. It is a costly answer to a secondary problem and conflicts directly with screenshot legibility.

### Many overlays

Do not solve invisible mechanics with visualization modes. Change the mechanics or rendering until the main view expresses them.

---

## Principal risks and repairs

### Risk: only self-sufficient collectors evolve

Likely causes:

- attachment too rare;
- children detach too quickly for reduced self-sufficiency to remain viable;
- non-parental contact remains too rare at legible density;
- capture too cheap;
- imported energy too weak;
- deletion mutations too destructive;
- host and stranger connections do not truly share physics.

Repairs should target those causes, not add a parasite class.

### Risk: exploiters appear and destroy everything

This is a scientifically meaningful result.

Possible substrate changes:

- allow earlier detachment, disposable low-flow branches, and shedding, each with visible costs;
- let connection conductance evolve;
- maintain spatial refuges;
- ensure small populations can recover;
- allow exploiters to suffer when hosts become rare;
- preserve local resource limitation.

Do not guarantee host survival.

### Risk: every lineage evolves immediate separation or complete contact avoidance

This indicates that attached development and graftability have no indispensable self-useful or beneficial function.

Repair the symmetry:

- make the ancestral attached juvenile phase genuinely useful;
- require growing tips to expose the same tissue through which grafting occurs;
- let avoidance, early detachment, and frequent shedding reduce capture, growth, repair, or reproductive speed;
- make beneficial attached partners physically possible;
- preserve visible spatial refuges so defense need not become universal avoidance.

### Risk: one space-filling geometry dominates

Repairs:

- permit nonbinding crossings;
- reduce collision as a hard stop;
- let local energy diffuse through occupied areas;
- keep capture return tied to actual local flux, not empty-space score;
- allow dead structures to decay;
- test three linked 2D sheets only after these changes.

### Risk: mutation produces a cloud, not lineages

Repairs:

- lower mutation rate;
- strengthen developmental modularity through short-sequence duplication;
- require costly reproduction;
- make propagule bottlenecks real;
- track ecological persistence rather than arbitrary genome thresholds.

### Risk: interesting ecology is visually illegible

Repairs:

- slow and replay causally important events;
- reduce concurrent population before adding an overlay;
- make energy transfer more visibly pulsed;
- enlarge cross-lineage junctions;
- collapse tiny transient mutations from the lineage ribbon;
- preserve one consistent encoding.

### Risk: forms are functional but ugly

This is not an immediate reason to alter selection.

First improve nondeceptive rendering:

- smooth real segment paths;
- render actual capture area as translucent lamina;
- taper structural width continuously;
- use restrained lineage palettes;
- show pulses rather than numbers;
- compose the habitat boundary gracefully.

If forms remain uninteresting, investigate whether development lacks reuse, symmetry, or modularity. Add gene duplication or repeated subprogram calls before adding plant templates.

### Risk: beautiful forms emerge but ecology is superficial

Reject the run as a core success. Beauty cannot substitute for dependence, reciprocal adaptation, and history.

### Risk: simulation is too slow for evolutionary evidence

Repairs:

- reduce module count;
- shorten lifecycles;
- compress inactive mature tissue;
- use event-driven maintenance;
- decouple rendering;
- use typed arrays and a worker;
- run research sweeps headlessly with identical mechanics;
- report generations, not events.

---

## Decision gates

### Gate A: legible life

Continue only if a naïve observer can correctly explain:

- where energy comes from;
- how it moves;
- what is growing;
- what counts as offspring;
- why something died;
- why two lineages connected.

The explanation should require the five-sentence rules card, not an overlay tutorial.

### Gate B: sparse interaction

Continue to evolutionary Stage 1 only if:

- mature bodies remain visually separable;
- parent–child energy transfer is obvious at every normal birth;
- non-parental graft opportunities occur at the preregistered readable density;
- useful interaction does not require an illegible mat, hidden range, or numeric key.

### Gate C: real generational evolution

Continue only if:

- hundreds of visually meaningful generations occur without manual stepping;
- multiple descendant clades replace or coexist with ancestors;
- frozen descendants differ heritably;
- selection can be demonstrated by replay and transplant.

### Gate D: porous ecology

Continue to the archipelago only if:

- at least one vertically dependent lineage evolves from the common ancestor;
- at least one descendant lineage repeatedly colonizes non-parental bodies;
- its dependence is causal and reproducible;
- host response and exploiter counter-response occur in multiple seeds.

### Gate E: historical ecology

Continue to expanded morphology only if:

- old and fresh regions affect the same genotype differently;
- regional isolation produces distinct interaction histories;
- natural reconnection yields history-dependent establishment.

### Gate F: biophilic function

Claim the third goal only if recognizable structures have measured function and evolved without aesthetic reward.

### Stop condition

If Gate D fails after:

- a correct implementation;
- broad viable parameter ensembles;
- attached genetically distinct buds;
- evolvable detachment;
- universal tip-to-tissue grafting;
- deletion and duplication mutation;
- successful Gate B contact and sufficient generations;
- the specified controls;

then table Commonweave. Do not rescue it by naming roles, injecting invaders, or multiplying hidden resources.

Returning to Sampler as a simpler evolutionary artwork would then be a good decision, not a failure.

---

## The next iteration to advance

The next iteration should be **Commonweave 0: Attached Ancestor**, not a complete garden.

### Its single research question

Can a lineage move continuously from ordinary attached childhood to heritable dependence, colonize non-parental bodies at sparse readable density, and provoke a costly visible defense?

### Its visual promise

Even before a breakthrough, the artifact should be pleasant and understandable:

- a dark or parchment-like habitat;
- sparse gold environmental energy;
- elegant branching colored lineages;
- visibly broad collectors and thick conduits;
- still-attached buds that change to a descendant hue at birth;
- gold pulses traveling across connections;
- small drifting propagules;
- gray fading ruins;
- one ancestry ribbon;
- one permanent legend.

### Its deliberate omissions

- no islands;
- no user invasion button;
- no light;
- no soil;
- no water;
- no flower templates;
- no predation;
- no 3D;
- no multiple dashboards;
- no claim of open-ended evolution.

### Why this is the right gamble

If it works, it establishes the missing causal engine for emergent ecological roles. Geography and biophilic elaboration then have something meaningful to amplify.

If it fails, it fails cheaply and informatively. Another year of adding rules to a substrate without reciprocal ecology would be avoided.

My subjective assessment, not a statistical estimate:

- vertical dependence through attached mutated buds: roughly 50–65%;
- persistent non-parental exploitation at legible density: roughly 30–45%;
- repeatable host–exploiter counter-adaptation through visible form or timing: roughly 20–35%;
- stable multi-lineage complementarity: roughly 10–25%;
- the complete flower-and-visitor, native–invasive, child-legible vision: roughly 10–18%.

These ranges express design confidence, not empirical frequencies. The full vision should not be promised. One iteration is justified because Gate D would itself be novel, valuable, and diagnostic.

---

## Alternative substrates if Commonweave fails

### Alternative A: the Molecular Loom

Use a Stringmol-like visible instruction chemistry:

- short strings bind approximately;
- bound strings execute transformations on one another;
- spatial clusters form bodies;
- energy limits copying;
- developmental structures are higher-order products.

Advantages:

- strongest precedent for emergent parasites, resistance, and hypercycles;
- extreme owner neutrality;
- large adjacent possible.

Disadvantages:

- much harder to make causally legible;
- plantlike form is several transitions away;
- screenshots would likely require explanation.

Advance this only if Commonweave proves too morphologically constrained but its porous-ontogeny hypothesis remains compelling.

### Alternative B: a mass-conservative continuous world

Use Flow-Lenia-like continuous mass with embedded hereditary parameters and local flow.

Advantages:

- beautiful and fluid forms;
- no rigid organism classes;
- rich self-organization.

Disadvantages:

- hidden mathematical machinery;
- difficult ancestry and generation semantics;
- difficult child-level causality;
- roles may remain pattern descriptions rather than functional histories.

This is a better art/research branch than the primary answer to the brief.

### Alternative C: minimal cellular-automaton discovery

Search tiny cellular-automaton rule spaces for self-replication, heredity, and interaction, following the spirit of Outlier.

Advantages:

- maximal rule simplicity;
- genuine surprise;
- no pre-authored forms.

Disadvantages:

- success is extremely sparse;
- no guaranteed heredity or evolvability;
- plantlike function and invasion are remote;
- interpretation may be harder than the rule count suggests.

This is a moonshot, not the recommended next iteration.

---

## Eventual implementation architecture

The user-facing MVP should ultimately be one saveable HTML file with no network dependency. During development, the logic should remain conceptually modular even if bundled into that file.

Suggested internal modules:

- **state:** packed module, bond, tip, energy, and terrain arrays;
- **random:** seeded deterministic random generator;
- **genome:** tape storage, copying, mutation, and hashing;
- **development:** instruction execution and active-tip lifecycle;
- **flow:** capture, energy transfer, maintenance, leakage;
- **grafting:** tip-to-tissue contact and owner-neutral bond formation;
- **movement:** drift, thrust, collision, spatial hash;
- **death:** failure, scaffold, and decay;
- **genealogy:** parentage, generations, clades, regions;
- **landscape:** later erosion, accretion, and habitat stabilization;
- **assays:** frozen replay, transplant, isolation, dependency tests;
- **metrics:** online summaries and event detection;
- **renderer:** one-view causal visual grammar;
- **persistence:** save, load, checkpoints, and export;
- **worker:** fast-forward using identical simulation code.

### Save format

The state should serialize:

- version;
- seed and random-generator state;
- tick and generation summaries;
- all living and dead modules;
- bonds;
- genomes;
- genealogy;
- energy field;
- terrain;
- analytical summaries;
- replay checkpoints.

The format should be versioned from the first prototype.

### Testing

Automated tests should cover:

- deterministic replay;
- energy conservation and input/output accounting;
- birth at bud initiation before physical separation;
- identical transfer physics across parent–child, same-lineage, and cross-lineage bonds;
- graft formation independent of lineage identity;
- absence of owner-dependent mechanics;
- correct budding, detachment, and generation records;
- no silent population culling;
- save/load identity;
- successful controlled dependent genotype;
- successful controlled resistance genotype;
- screenshot encoding presence.

A static source-code check should flag any mechanics branch that consults lineage identity.

---

## Research protocol and reporting

Every major claim should ship with:

- the exact single-file simulation version;
- seed and settings;
- a saved pre-event checkpoint;
- a deterministic replay;
- genealogy export;
- energy-flow evidence;
- dependency or transplant assay;
- a plain-language causal explanation;
- failure cases from the same parameter ensemble.

The project should distinguish:

- **observed:** happened in one run;
- **repeatable:** happened across seeds;
- **evolved:** arose by inherited variation and selection;
- **coevolved:** involved reciprocal heritable responses;
- **emergent role:** was not a class or rewarded target;
- **open-ended:** reserved for sustained expansion of functional possibilities, if ever justified.

This vocabulary prevents a visually exciting accident from being mistaken for the central goal.

---

## Final recommendation

Do not table the aspiration, but table the current implementation lineage.

Advance exactly one disciplined iteration:

> **Build the smallest Sampler-legible world in which a mutated child is born while visibly attached, detachment can evolve, and any active tip can visibly graft to touched living tissue—then test whether dependence and counter-adaptation emerge without keys, mouths, dense mats, or owner checks.**

This is the hinge.

If it succeeds, proceed in this order:

1. validate useful contact at sparse readable density;
2. validate vertical dependence and non-parental colonization;
3. validate reciprocal coevolution;
4. validate complementarity and cheating;
5. add autonomous visible geography;
6. demonstrate historical invasion and possible reorganization;
7. expand the developmental grammar only enough to deepen functional form;
8. pursue flower-and-visitor analogues as an emergent long-horizon result.

If it fails, stop. Return to Sampler with a clear conscience and make a simpler, exceptionally legible evolutionary garden without claiming the full coevolutionary breakthrough.

The most valuable possible result of the next iteration is not a prettier ecosystem. It is proof that a single common ancestor can split into lineages because birth begins as a shared body: descendants can evolve to separate, remain dependent, exploit, contribute, and defend themselves through the same visible developmental physics.

That would be an actual breakthrough.

---

## Annotated research sources

- [Editorial introduction to the 2024 special issue on open-ended evolution](https://direct.mit.edu/artl/article/30/3/300/123431/Editorial-Introduction-to-the-2024-Special-Issue) — current framing of the unresolved challenges of scalable complexity, evolvability, and major transitions.
- [Open-Endedness in Genelife](https://direct.mit.edu/artl/article/30/3/356/119274/Open-Endedness-in-Genelife) — ongoing genetic and spatial novelty, plus a useful explicit distinction between novelty and functional innovation.
- [The Surprising Creativity of Digital Evolution](https://direct.mit.edu/artl/article/26/2/274/93255/The-Surprising-Creativity-of-Digital-Evolution-A) — review of Tierra’s emergent parasitism, immunity, hyperparasitism, cooperation, and cheating.
- [Maximizing the Adjacent Possible in Automata Chemistries](https://direct.mit.edu/artl/article/22/1/49/2837/Maximizing-the-Adjacent-Possible-in-Automata) — Stringmol’s shared chemistry, approximate binding, parasites, resistance, and hypercycles.
- [Adaptive radiation in digital organisms](https://pubmed.ncbi.nlm.nih.gov/15232105/) — Avida diversification through frequency-dependent resource competition.
- [Fitness and Productivity Increase with Ecotypic Diversity among E. coli Strains](https://journals.asm.org/doi/10.1128/AEM.00051-20) — complementary cross-feeding ecotypes evolved from a single ancestor.
- [Ecological succession in long-term experimentally evolved biofilms](https://www.nature.com/articles/ismej2010136) — diversification, niche construction, cross-feeding, and synergistic communities from common ancestry.
- [On the De Novo Emergence of Ecological Interactions](https://www.journals.uchicago.edu/doi/10.1086/726895) — experimental evidence that environmental structure shapes the emergence of interactions during diversification.
- [Flow-Lenia](https://direct.mit.edu/artl/article/31/2/228/130572/Flow-Lenia-Emergent-Evolutionary-Dynamics-in-Mass) — mass-conservative continuous artificial life with localized creatures and embedded evolutionary dynamics.
- [Lenia and Expanded Universe](https://direct.mit.edu/isal/article/doi/10.1162/isal_a_00297/98400/Lenia-and-Expanded-Universe) — rich lifelike continuous forms and multichannel organization.
- [Emergence of Self-Replicating Hierarchical Structures in a Binary Cellular Automaton](https://direct.mit.edu/artl/article/31/1/96/124149/Emergence-of-Self-Replicating-Hierarchical) — evidence that minimal local rules can yield unanticipated replication at multiple scales.
- [L-PEACH](https://library.wur.nl/ojs/index.php/frontis/article/view/1378) — functional-structural plant modeling that couples branching development with source–sink flow.
- [The MODES Toolbox](https://direct.mit.edu/artl/article/25/1/50/2915/The-MODES-Toolbox-Measurements-of-Open-Ended) — phylogenetic and activity measures for open-ended evolutionary dynamics.
- [Ecology, Spatial Structure, and Selection Pressure Induce Strong Signatures in Phylogenetic Structure](https://direct.mit.edu/artl/article/31/2/129/130570/Ecology-Spatial-Structure-and-Selection-Pressure) — evidence that ecological history can be detected in phylogeny.
- [Open-Endedness for the Sake of Open-Endedness](https://direct.mit.edu/artl/article/25/2/198/2923/Open-Endedness-for-the-Sake-of-Open-Endedness) — warning that indefinite novelty does not establish meaningful biological complexity.
- [Mutual waste-product ecology](https://pubmed.ncbi.nlm.nih.gov/15107227/) — a minimal resource transformation capable of supporting mutual dependence and damped oscillation.
- [A model for the evolutionary dynamics of cross-feeding polymorphisms](https://esj-journals.onlinelibrary.wiley.com/doi/10.1007/s101440200008) — conditions under which cross-feeding can emerge gradually from one ancestral strain.
