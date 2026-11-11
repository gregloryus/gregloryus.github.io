# Triple Bit Trees, and What Open-Ended Evolution Would Require

**Version 2 — August 2026**

A reference document in two independent parts.

**Part I** specifies Triple Bit Trees (TBT) as an encoding: a genotype format and
its developmental interpretation. Nothing else. No mutation, no selection, no
ecology.

**Part II** covers open-ended evolution (OEE) — what the field means by it, how it
is measured, what the literature has and hasn't achieved, and what a system built
*around* a TBT genome would need in order to qualify.

The separation is deliberate and load-bearing. TBT is the DNA and the body plan.
Mutation operators, fitness, and ecology are separate systems that operate *on* a
TBT genome. Confusing the two obscures which design decisions belong to which
layer.

---

# PART I — Triple Bit Trees: the encoding

## 1. What it is

A genome format for branching bodies. Each cell carries a three-bit gene
specifying which of its three growth slots produce children. Slots are defined
**relative to the cell's own facing**, not to world coordinates.

The genome as a whole is a tree of such genes, serializable as a flat array.

## 2. Cell state

Every cell has:

- a **position** on the lattice
- a **facing**: north, east, south, or west
- a **three-bit gene**

## 3. Slots

Each cell has three growth slots, defined relative to its facing:

| Slot | Meaning |
|---|---|
| LEFT | 90° counter-clockwise from facing |
| UP | straight ahead along the facing axis |
| RIGHT | 90° clockwise from facing |

The **DOWN slot is reserved for the parent** and never produces growth. This is
what makes bodies trees rather than graphs.

## 4. Bit encoding

Reading the three bits left-to-right as LEFT, UP, RIGHT:

| Binary | Decimal | Grows |
|---|---|---|
| 000 | 0 | nothing (sterile / terminal) |
| 001 | 1 | RIGHT only |
| 010 | 2 | UP only |
| 011 | 3 | UP + RIGHT |
| 100 | 4 | LEFT only |
| 101 | 5 | LEFT + RIGHT |
| 110 | 6 | LEFT + UP |
| 111 | 7 | LEFT + UP + RIGHT |

Expansion order when interpreting a gene is always LEFT → UP → RIGHT.

## 5. Relative frames — the critical property

**A child's facing is determined by which slot it occupied.**

- A child in the UP slot inherits the parent's facing unchanged.
- A child in the LEFT slot faces 90° counter-clockwise from the parent.
- A child in the RIGHT slot faces 90° clockwise from the parent.

Consequently, the same gene means different things in world coordinates
depending on where in the body it sits. Worked example, genome `010, 001, 010`:

1. Seed faces NORTH, gene `010` → one child in the UP slot, facing NORTH.
2. That child's gene `001` → one child in the RIGHT slot. Right of north is
   east, so the child sits east and faces EAST.
3. That child's gene `010` → one child in its UP slot. Its "up" is east, so the
   child sits further east, facing EAST.

**This is the single most important property of the encoding.** It means a
subtree is *portable*: it can be attached anywhere in the body, at any
orientation, and still produce the same shape relative to its attachment point.
Encodings that use global directions lose this — a copied subtree scrambles when
moved. TBT does not.

Note: some earlier documentation describes facing as global. That is incorrect
and contradicts both the implementations and the intended design. Facing is
relative.

## 6. Serialization

A TBT genome is a tree. It is stored as a flat array by depth-first pre-order
traversal.

Decoding, in essence:

```
buildNode():
  gene = genome[index++]
  node = new Node(gene)
  for slot in 0..2:
    if (gene >> slot) & 1:
      node.children[slot] = buildNode()
  return node
```

Encoding is the mirror: emit the node's gene, then recurse into its children in
slot order.

**Subtree boundaries are computable, not stored.** A gene's popcount tells you
how many children follow; recursing gives you the size of each child's subtree.
Any node's entire subtree is therefore a contiguous slice of the flat array. This
is the structural fact that makes subtree-level operations — copying, grafting,
deleting, counting — cheap and well-defined.

### Worked decode

Genome `[111, 010, 000, 011, 100, 000, 000]`:

- `111` root, three children.
- LEFT child `010` → one child, `000` (terminal). Subtree = `[010, 000]`.
- UP child `011` → two children: `100` and `000`.
  - `100` → one child, `000`. Subtree = `[100, 000]`.
  - So UP subtree = `[011, 100, 000, 000]`.
- RIGHT child — the array is exhausted. Undefined children are treated as absent.

A caution for anyone documenting this: it is easy to mis-read the flat array as
"the next N genes are the N children." It is not. DFS means the next gene is the
*first child*, and that child's entire subtree comes before the second child
begins.

## 7. Development

Growth is local and incremental. A cell with an unfilled slot indicated by its
gene attempts to place a child there. Whether it succeeds depends on the
surrounding system — space, resources, whatever rules the host simulation
imposes. The encoding specifies *what* the body would be; the host simulation
determines whether it gets built.

Typical clearance rule (from the reference implementation): before placing a
child, check the target cell, its two lateral neighbours, and the three cells
ahead relative to the *child's* new facing. This prevents self-intersection and
produces natural spacing between branches — effectively crown shyness for free.

A body is **mature** when no cell has an unfilled, buildable slot remaining.

## 8. Properties of the encoding

**Unbounded.** Nothing in the format caps depth or length. A genome may be four
genes or four thousand.

**Tiny alphabet.** Eight gene values, four facings. Legible by inspection.

**Recursive.** Every child is itself a growth site with the same three slots, so
depth is unlimited by construction.

**Self-delimiting subtrees.** Any node plus its descendants is a well-defined,
contiguous, portable unit.

**Deterministic given space.** The same genome in the same conditions produces
the same body. Variation in outcome comes from the environment, not the decoder.

## 9. What TBT is not

TBT does not specify:

- how genomes mutate
- how organisms reproduce
- what determines survival
- what cells do besides grow (metabolism, organs, transport)
- anything about the environment

All of these are separate systems layered on top. TBT can serve as the body-plan
substrate for many different simulations with entirely different evolutionary
dynamics.

**Organ extension.** Implementations have extended the gene space beyond 0–7 to
mark cells as leaves or flowers (e.g. values ≥ 8 as sentinels). This is a host
extension, not part of the core encoding, but it is a natural one: it adds
phenotypic vocabulary per gene without changing the tree structure.

---

# PART II — Open-ended evolution

## 10. What OEE means

The field's working definition: a system that keeps producing genuinely novel,
adaptively significant forms indefinitely, where the novelty is not enumerated in
advance by the designer.

Packard et al. (2019) split this into four "Tokyo types":

1. interesting new kinds of entities and interactions
2. evolution of evolvability
3. major transitions
4. semantic evolution

Type 1 is the relevant target for a plant-ecology simulation.

## 11. The measurement — Channon's procedure

Channon (2024), *A Procedure for Testing for Tokyo Type 1 Open-Ended Evolution*,
Artificial Life 30(3):345–355. Built on Bedau & Packard's evolutionary activity
statistics.

### Components

The heritable units you track. This choice determines what the test can detect
and is the most consequential decision in the whole procedure.

### Step 1 — cumulative activity

For each component, at each timestep, score 1 if it exists in the population, 0
if not. A component's **cumulative activity** is the running sum, reset to zero
on extinction. **Total cumulative activity** is the sum across all living
components.

Test: is total cumulative activity bounded or unbounded? If unbounded, proceed.

This measures persistence of heritable structure — things that stick around
because they work.

### Step 2 — the shadow model

A parallel world that copies the real world's demography exactly: every real
birth causes a shadow birth, every real death a shadow death, same population
size, same turnover. But shadow births draw their component **uniformly at
random** from the component pool rather than inheriting from a parent.

The shadow is what the bookkeeping would look like with no heredity and no
selection. It is periodically reset to the real model's state (e.g. every 1000
steps) so it doesn't drift out of relevance.

### Normalized activity

Per component, per timestep:

```
normalized increment = (exists in real ? 1 : 0) − (exists in shadow ? 1 : 0)
```

| Real | Shadow | Increment | Reading |
|---|---|---|---|
| present | absent | +1 | selection keeps it beyond chance |
| present | present | 0 | chance explains it |
| absent | present | −1 | selection actively excludes it |
| absent | absent | 0 | — |

**Normalized cumulative activity** is the running sum of these per component. It
is the raw persistence counter with the chance-explained portion netted out — the
"is this adaptive?" number. It can be negative.

### Step 3 — the test

Compute **new activity**:

1. Find the most negative normalized activity in the system; take its absolute
   value. Call it N. This is the system's own noise floor.
2. Select components that are newly appeared *and* have normalized activity
   above +N. These are "newly adaptively significant."
3. Sum their normalized activity; divide by the number of components currently
   alive.

**The system passes if and only if** total and median normalized cumulative
activity are unbounded, **and** new activity is persistently positive.

Persistently positive new activity means: the system keeps producing things that
are both new and demonstrably favoured. Not churn, not diversity — adaptive
novelty that keeps arriving.

## 12. State of the field

| System | Visual | Intrinsic selection | Growable genome | OEE tested |
|---|---|---|---|---|
| Geb (Channon) | none | yes | yes (L-system) | **passes** |
| ToLSim (Sinapayen) | yes | yes | no (6 fixed traits) | fails step 3 |
| Flow Lenia | yes | yes | parameters only | not tested |
| ALIEN | yes | yes | yes (cell blueprints) | not tested |
| Biomaker CA | yes | outer-loop meta-evolution | no (NCA weights) | not tested |
| Avida | minimal | yes | yes (instruction strings) | classified, bounded |

**Geb** — recurrent neural networks encoded as context-free L-systems; selection
is biotic (survival and mating), no fitness function. The first and still only
system classified as open-ended under the enhanced Bedau/Packard scheme.
Channon's own stated weakness: it became impossible in practice to identify novel
behaviours as they emerged. Maximum open-endedness, zero legibility.

**ToLSim** — 50×50 grid, agents with six heritable traits, predation via sensor
matching. 20 runs × 2M steps. Step 1 passed in 8 runs, failed in 4, unclear in 8.
Step 3 failed in all 20: new activity was mostly null throughout. Normalized
totals went *negative*, because the population converged onto a narrow band of
gene values while the randomly-drawing shadow held more distinct values.

The authors' own caveats matter: they measured at the level of raw gene values,
and note the result might differ at the level of individuals or species. They
also cite Taylor et al. (2016) on the general limitation that pre-defining
components prevents detecting genuinely new kinds of component on the fly.

**Flow Lenia** — mass-conservative continuous CA where update-rule parameters are
embedded in the CA state itself, localized and heritable, flowing with the
matter. Enables multi-species worlds with locally coherent rules that blend on
contact. Speciation and ecosystem dynamics reported qualitatively. Never
subjected to activity statistics.

**The gap:** no system is both visually coherent and demonstrated open-ended.
Systems with rigorous classification have no visuals; systems with visuals have
no classification.

## 13. What is strictly required

**Required:** the genome must be able to gain heritable structure without bound.
Fixed-length parameter vectors fail definitionally — mutation can only relocate
within a pre-drawn space.

TBT satisfies this. Setting a bit appends a child node; clearing one removes a
subtree. Genome length is unbounded by construction.

**Also required in practice:** selection must be intrinsic. No external fitness
function, no outer optimization loop, no human choosing. The fitness landscape
must be a consequence of the current state of the world. Biomaker CA's headline
results come from meta-evolution and interactive selection, which is why it
scores poorly here despite excellent morphogenesis.

**Not required:** any particular mutation operator. Duplication, crossover,
recombination — none is a criterion.

## 14. What is helpful — mutation operators

*This section is recommendation, not criterion. It concerns the mutation system,
which is separate from and layered on top of TBT.*

A minimal mutation system for TBT is a single bit-flip: pick a gene, flip a bit.
Setting adds a child; clearing amputates a subtree. This is sufficient for
formal unboundedness. Two arguments say it is not sufficient in practice.

### Rate

Reaching a 40-gene body by single bit-flips requires roughly 40 sequential
mutations, each individually survivable. Over infinite time this is fine. Over a
weekend of compute it is the difference between seeing complexity accrue and
seeing nothing happen.

### Reachability — the stronger argument

Some forms are only reachable across a fitness valley: intermediates worse than
both endpoints. Single-bit mutation cannot cross valleys. **Duplication can**,
because it creates a redundant copy that is free to drift while the original
keeps working. This is the standard account of novel function in molecular
evolution, and it is an argument about which regions of the space are accessible
at all, not merely how fast they are reached.

### Why duplication suits TBT specifically

Because facings are relative, a copied subtree is portable — grafted anywhere, at
any orientation, it produces the same shape relative to its attachment point. In
a global-direction encoding the same operation scrambles the copy. And because
subtree boundaries are computable from popcount, extracting and grafting are
cheap given existing decode/encode routines.

### Suggested operator set

| Operator | Effect |
|---|---|
| bit flip | set (append child) or clear (amputate subtree) |
| subtree duplication | copy a subtree, graft into an empty slot |
| subtree deletion | remove a subtree without a bit-flip |
| point substitution | replace a gene value in place |

Keep addition and deletion symmetric. A known failure in prior implementations:
making a loaded bit-clear a no-op ratchets genomes longer — easy to add, nearly
impossible to remove.

**Crossover is genuinely optional.** Avida is asexual. Recombination is one
solution to combining innovations across lineages; duplication in an asexual
system is another.

## 15. What is helpful — ecology

*Also recommendation. This is a diagnosis of a specific recurring failure, not a
result from the literature.*

An unbounded representation under monotone selection gives you an infinite space
that evolution has no reason to enter. If fitness depends only on absolute
performance, the best design wins outright and selection becomes a permanently
narrowing force. This is what ToLSim's null result looks like from the inside.

**Frequency-dependence** is the countermeasure: being common must itself be
costly. In a plant system the natural mechanism is self-inhibition — a lineage's
seeds germinate poorly near its own kind, or near genomically similar plants.
Real ecology calls this Janzen–Connell; the biological mechanism is
species-specific soil pathogens and nutrient depletion.

Properties that make it a good fit: it is local, it is visible, it requires no
new cell types or hidden state, and it does double duty as environmental memory
(the ground records what grew there).

Frequency-dependence is worth testing explicitly rather than assuming: run with
and without it and compare.

## 16. Measurement, applied to TBT

The component-choice problem that limited ToLSim is unusually tractable here,
because TBT supplies two natural units at different levels rather than requiring
the analyst to invent one.

### 16.1 What not to use

**Gene values.** All eight exist at all times forever; cumulative activity
saturates immediately; new activity is permanently zero. This guarantees a
trivial failure and tests nothing.

**Arbitrary connected fragments.** "Gene 5 plus its left child but not its right"
is a connected subgraph, and there are exponentially many. Admitting these
reintroduces exactly the analyst-imposed choice this approach exists to avoid.

### 16.2 Definition: subtree

**A subtree is a node plus all of its descendants, to the termini.** Not some
descendants — all.

The beginning is defined by choosing a node; the end is not chosen at all, it is
determined by the structure. A genome of N genes therefore contains **exactly N
subtrees**, one rooted at each node. There is no arbitrariness in which slices
count.

Because DFS serialization emits a node immediately followed by its entire
subtree, the subtree rooted at index i is a **contiguous slice** beginning at i,
with length computable by recursing on popcount. Boundaries are structural.

Two edge cases:

- A terminal gene (`000`) is a subtree of size 1. These will be numerous and will
  dominate any tally by raw count. Exclude size-1 subtrees or report them
  separately.
- The subtree rooted at the seed is the whole genome. It appears in both
  component sets below; that is expected, not double-counting.

### 16.3 The two primary component sets

**Whole genomes — the species-level unit.**

This is what actually reproduces. A seed carries a complete genome; it is the
unit of inheritance, of selection, of birth and death. It is also the unit a
viewer perceives: novelty registers as "a kind of plant I have not seen before."
This is the level ToLSim's authors suggest they should have tried.

Its weakness is brittleness. A single bit-flip anywhere produces a genome that
has never existed and may never recur. In a freely mutating population this gives
high turnover and low persistence, and the activity statistic measures
persistence — so whole-genome activity can be null for reasons opposite to
ToLSim's but equally uninformative. Whole genomes work best where reproduction is
substantially clonal so identical genomes recur in numbers.

**Subtrees — the motif-level unit.**

Subtrees persist across mutation. When a lineage mutates at one branch, the other
subtrees pass intact into the descendant. A motif can therefore accumulate
hundreds of thousands of timesteps of activity while no individual genome lasts a
thousand. This is the level at which heritable structure actually sticks around,
which is what the statistic is built to detect.

Subtrees also answer a question whole genomes cannot: **is novelty compositional
or merely combinatorial?** If new whole genomes keep appearing while no new
subtree ever does, the system is reshuffling a closed vocabulary of parts — new
arrangements of old pieces. That is a real and interesting negative result, and
it is invisible if only whole genomes are counted.

Neither set replaces the other. Whole genomes are primary; subtrees reveal the
mechanism.

### 16.4 Optional third set

**Depth-capped subtrees** — the subtree rooted at a node, truncated at depth d.

This is explicitly an analytic construct, not a subtree in the strict sense: the
truncation is chosen by the analyst. It is worth running as a middle scale if the
whole-genome and full-subtree results disagree, but it should be reported as the
imposed choice it is.

### 16.5 Implementation

1. Per timestep, tally three component sets in parallel: whole-genome hashes,
   full-subtree hashes (size ≥ 2), and optionally depth-capped subtree hashes.
2. Canonicalize each to a string and hash it, so structurally identical units
   count as the same component. The DFS array is already canonical.
3. Run the shadow model against each set independently, with periodic resetting.
4. Compute cumulative, normalized, and new activity per set.
5. Run replicates. With stochastic development a single run establishes nothing.

### 16.6 Reading the results

| Whole-genome activity | Subtree activity | Reading |
|---|---|---|
| unbounded | unbounded | genuine compositional open-endedness |
| unbounded | flat | recombining a closed parts list |
| flat | unbounded | motifs accumulating without viable new body plans |
| flat | flat | stasis |

The second row is the most likely near-miss and the most useful thing to be able
to distinguish. Reporting at multiple levels is stronger practice than choosing
one; Channon's procedure does not forbid it, and the ToLSim authors explicitly
treat the level of analysis as a choice whose consequences they may have
underestimated.

### 16.7 Residual limitation

Enumerating subtrees exhaustively is not fully free of pre-definition. It fixes
the *kind* of unit in advance, even though it does not fix which particular units
exist. Detecting genuinely emergent units — motifs that become units because
lineages treat them as such — would require mining recurrent structure from the
population rather than enumerating structurally. That remains open, and is the
general problem Taylor et al. raise.

## 17. Where a contribution lies

A legible plant-morphology system whose genome structure supplies its own
measurement units.

The field's difficulty is not only that visual systems go unmeasured, but that
measurement requires choosing components somewhat arbitrarily — named by the
ToLSim authors as the likely flaw in their own null result. TBT's self-delimiting
subtrees narrow that problem considerably.

The result is publishable either way. A well-instrumented failure with a clear
diagnosis is a real contribution in a field where most systems are never measured
at all.

The most testable specific claim available: **frequency-dependent selection is
what sustains morphological novelty in a legible plant ecology.** Run with and
without self-inhibition; compare new-activity curves. A divergence between two
lines is a result; no divergence is also a result.

---

## References

- Channon, A. (2024). A Procedure for Testing for Tokyo Type 1 Open-Ended
  Evolution. *Artificial Life* 30(3), 345–355.
- Channon, A. (2006). Unbounded evolutionary dynamics in a system of agents that
  actively process and transform their environment. *Genetic Programming and
  Evolvable Machines* 7(3), 253–281.
- Channon, A. (2019). Maximum individual complexity is indefinitely scalable in
  Geb. *Artificial Life*.
- de Pinho, T. & Sinapayen, L. (2026). A speciation simulation that partly passes
  open-endedness tests. arXiv:2603.01701.
- Bedau, M., Snyder, E. & Packard, N. (1998). A Classification of Long-Term
  Evolutionary Dynamics. *Artificial Life VI*.
- Packard, N. et al. (2019). An overview of open-ended evolution. *Artificial
  Life* 25(2), 93–103.
- Taylor, T. et al. (2016). Open-ended evolution: perspectives from the OEE
  workshop in York. *Artificial Life* 22(3), 408–423.
- Plantec, E. et al. (2023). Flow-Lenia: Towards open-ended evolution in cellular
  automata through mass conservation and parameter localization. ALIFE 2023.
  arXiv:2212.07906.
- Randazzo, E. & Mordvintsev, A. (2023). Biomaker CA: a Biome Maker project using
  Cellular Automata. arXiv:2307.09320.
- Heinemann, C. ALIEN — Artificial Life Environment. alien-project.org
- Dolson, E. & Ofria, C. (2021). Digital Evolution for Ecology Research: A
  Review. *Frontiers in Ecology and Evolution*.
