This brief describes enhancements to build upon the existing urn‑plants‑5.js plant‑growth simulator. The goal is to provide a clear, comprehensive specification that can be handed to other developers or AI systems for evaluation. The full source of urn‑plants‑5.js should be supplied alongside this document so that implementers can reference the current codebase.

Current context

The existing simulator models plants as collections of particles growing on a 2D grid. Growth decisions are controlled by urn‑based genes: each decision point draws a 0 or 1 from an urn array, then reinserts that value into the urn according to a LEARNING_INTENSITY parameter (currently set to 5). A “five‑spot” rule prevents new particles from growing into spaces that would be adjacent (in any of five positions—left, forward‑left, forward, forward‑right, right) to existing particles of the same plant. A per‑clade gene memory allows plants to learn over time.

Enhancement summary

Two large feature areas need to be added: 1. Rule changes (biological logic) – Mature plants will reproduce seeds from certain node sides; seeds will take a biased random walk and germinate only under strict conditions; and plants must now avoid growing too close to any other plant via a global occupancy check. 2. User interface enhancements – A minimalist card‑based UI must be added so users can manually pick random gene outcomes, along with an auto‑mode that advances the simulation at user‑controlled speeds while still displaying the card flip animation.

Detailed requirements

1. Rule changes

   1. Seed production at maturity
      • Each node in a mature plant that has an empty side due to a randomly chosen 0 should produce exactly one seed on that side. If a side was forced to 0 because of growth restrictions, no seed should be produced there.
      • Seeds form one tick after the plant has matured and has been displayed intact for at least one tick.
      • Seeds inherit the entire gene state of their parent plant (copy the current urns for each clade).
   2. Random walk behaviour
      • After spawning, each seed takes a random walk for a configurable number of steps before attempting to land. Use a global constant (e.g. SEED_WALK_STEPS) to control the initial walk length; set this to 10 for now but allow easy adjustment.
      • Seeds do not check for collisions during these first SEED_WALK_STEPS; they simply step into empty space according to their walk distribution.
      • After the initial walk, the seed checks whether it can land on its current position. A landing spot is valid only if that cell and all eight neighbours (Moore neighbourhood) are empty on the global occupancy grid. If the spot is not empty, the seed continues taking one random step at a time, checking after each step.
      • If the seed fails to find a valid landing spot after an additional SEED_WALK_STEPS steps (total of 20 steps with a 10‑step initial delay), it dies and is removed.
      • Directional bias: The random walk’s direction urn should be biased away from the original seed at (0,0). Determine the vector from the parent seed to the new seed’s initial position and add two extra copies of each direction that increases the magnitude of that vector:
      • If both dx and dy are positive (upper‑right quadrant) add extra up and right steps.
      • If dx is negative and dy positive (upper‑left) add extra left and up steps.
      • If dx negative and dy negative (lower‑left) add extra left and down steps.
      • If dx positive and dy negative (lower‑right) add extra right and down steps.
      • If one component of the vector is zero (seed lies on an axis), add two extra steps in the non‑zero direction so the walk tends to move further along that axis. For example, a seed at (6,0) should bias towards moving further to the right; a seed at (0,6) should bias upwards.
      • Clarify that this is a guideline—the implementer should interpret “away” consistently. The example in the prompt uses [left, right, up, down, left, up] for an upper‑left seed; similar patterns should be derived for other quadrants.
   3. Global occupancy check
      • Maintain a data structure representing all occupied cells across all plants. A simple global map keyed by (x,y) is acceptable, but any efficient, scalable structure may be used.
      • Before any growth (new particle) or during seed landing, check the global occupancy map. A plant cannot grow into or land on a cell if that cell or any of its Moore neighbours is already occupied by another plant.
      • When growth is blocked by this global check, record the decision as if the plant had drawn 0 (append 0 to the appropriate gene urn) and do not grow a particle there.

2. User interface enhancements
   1. Card‑based gene selection panel
      • Reserve the bottom quarter of the canvas for a control panel. At each growth decision, display one card per entry in the current gene urn. These cards represent the possible 0/1 outcomes but are initially face‑down.
      • Card design: Each card is a 3×3 pixel square: eight white edge pixels and a single centre pixel. Face‑down cards have a black centre; face‑up cards reveal the centre colour—red for 1, blue for 0.
      • Randomly shuffle the cards before displaying them. Internally assign each card its gene value at this point.
      • Arrange cards horizontally, centred, with three pixels of padding between cards. If the row cannot fit on one line, break into two roughly equal rows.
      • Selection rules:
      • Tapping a face‑down card highlights it (show a yellow border). Tapping the highlighted card again selects it.
      • Tapping anywhere else deselects the highlighted card. Tapping a different card highlights that one.
      • Once a card is selected, flip all cards face up with a simple three‑frame animation: face‑down → on side (white line) → face‑up revealing red or blue.
      • Apply the selected card’s value to the growth logic. Use pure red and blue in the gene preview at the top of the canvas to mirror these values.
   2. Auto‑mode
      • Place an “Auto” toggle button in the top‑right of the canvas. The button is off by default. When toggled on, the simulation automatically advances through growth decisions.
      • In auto mode, always select the left‑most card when making a decision. The cards should still be displayed and flipped with the animation so the user can watch the process.
      • Allow the user to adjust the auto‑advance speed via a simple UI element (e.g. slider or dropdown) with options like 1×, 2×, 10× decisions per second.
      • Clicking the Auto button again returns to manual mode and stops automatic advancement.

Additional notes
• The existing LEARNING_INTENSITY constant in urn‑plants‑5.js controls how many copies of each gene result are added back into the urn; ensure any new logic leaves this mechanism intact.
• All seeds, particles and UI elements should still adhere to the “five‑spot” restriction and any global collision rules during growth and landing.
• The user interface should remain minimalist. Colour choices (pure red, pure blue, pure white, black) are intentional and should be preserved.
• Include the complete current urn‑plants‑5.js source file when distributing this brief so implementers can build on the existing codebase.
