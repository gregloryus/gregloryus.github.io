// Urn-based plant growth simulator (PIXI). One decision per Space.
// 3-phase per decision: show odds -> show result -> apply result.
// Depth-first by generation (breadth-first across the plant): resolve all tips at depth d before any at d+1.

document.addEventListener("DOMContentLoaded", () => {
  // --- PIXI setup (full window) ---
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.getElementById("canvas-div").appendChild(app.view);

  // Resize handler
  window.addEventListener("resize", () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    recomputeGrid();
    // Update text positions
    infoText.x = app.screen.width / 2;
    actionText.x = app.screen.width / 2;
    actionText.y = app.screen.height - 20;
  });

  // --- Grid config ---
  let scaleSize = 8; // pixels per cell
  let cols = Math.floor(window.innerWidth / scaleSize);
  let rows = Math.floor(window.innerHeight / scaleSize);
  let simulationPaused = false;
  let tickCount = 0;

  function recomputeGrid() {
    cols = Math.floor(window.innerWidth / scaleSize);
    rows = Math.floor(window.innerHeight / scaleSize);
    overlayBg.clear();
    overlayBg.beginFill(0x000000, 0.35);
    overlayBg.drawRect(0, 0, app.screen.width, 60);
    overlayBg.endFill();
    // redraw card panel bg
    if (cardPanelBg) {
      cardPanelBg.clear();
      cardPanelBg.beginFill(0x000000, 0.6);
      const h = Math.floor(app.screen.height * CARD_PANEL_FRACTION);
      cardPanelBg.drawRect(0, app.screen.height - h, app.screen.width, h);
      cardPanelBg.endFill();
    }
    // reposition gene preview and auto button
    if (genePreview) {
      genePreview.y = 64;
      genePreview.x = Math.floor((app.screen.width - genePreview.width) / 2);
    }
    if (autoButton) {
      autoButton.x = app.screen.width - 120;
      autoButton.y = 10;
    }
    if (speedText) {
      speedText.x = app.screen.width - 120;
      speedText.y = 34;
    }
  }

  // --- Textures ---
  function makeTexture(color) {
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(0, 0, 1, 1);
    g.endFill();
    return app.renderer.generateTexture(g);
  }
  const textures = {
    SEED: makeTexture(0xffffff), // White for seeds
    STEM: makeTexture(0x00ff00),
    NODE: makeTexture(0x008000), // Darker green for nodes
    HILITE: makeTexture(0xffff00), // Yellow highlight
  };
  // extra UI textures
  textures.WHITE = makeTexture(0xffffff);
  textures.BLACK = makeTexture(0x000000);
  textures.RED = makeTexture(0xff0000);
  textures.BLUE = makeTexture(0x0000ff);
  textures.YELLOW = makeTexture(0xffff00);

  // --- Config ---
  const SEED_WALK_STEPS = 10;
  const AUTO_SPEEDS = [1, 2, 10]; // decisions per second
  const AUTO_DEFAULT_INDEX = 0;
  const CARD_PANEL_FRACTION = 0.25; // bottom panel height fraction
  const CARD_SIZE = 3; // base pixel size per card cell
  const CARD_GAP = 3;
  const CARD_BORDER = 1;
  const FLIP_MS = 100; // flip frame duration (ms)

  // Current highlight sprite
  let currentHighlight = null;

  // --- Overlay UI ---
  const textStyle = new PIXI.TextStyle({
    fontFamily: "Arial",
    fontSize: 18,
    fill: "white",
    align: "center",
  });
  const infoText = new PIXI.Text("", textStyle);
  infoText.anchor.set(0.5, 0);
  infoText.x = app.screen.width / 2;
  infoText.y = 20;
  const actionText = new PIXI.Text("", textStyle);
  actionText.anchor.set(0.5, 1);
  actionText.x = app.screen.width / 2;
  actionText.y = app.screen.height - 20;
  const overlayBg = new PIXI.Graphics();
  overlayBg.beginFill(0x000000, 0.35);
  overlayBg.drawRect(0, 0, app.screen.width, 80);
  overlayBg.endFill();
  app.stage.addChild(overlayBg);
  app.stage.addChild(infoText);
  app.stage.addChild(actionText);

  // UI containers
  const genePreview = new PIXI.Container();
  app.stage.addChild(genePreview);
  const cardPanelBg = new PIXI.Graphics();
  app.stage.addChild(cardPanelBg);
  const cardContainer = new PIXI.Container();
  app.stage.addChild(cardContainer);

  // Auto controls
  let autoEnabled = false;
  let autoSpeedIdx = AUTO_DEFAULT_INDEX;
  const autoButton = new PIXI.Text(
    "Auto: off",
    new PIXI.TextStyle({ fontFamily: "Arial", fontSize: 14, fill: "white" })
  );
  autoButton.eventMode = "static";
  autoButton.cursor = "pointer";
  autoButton.on("pointerdown", () => {
    autoEnabled = !autoEnabled;
    autoButton.text = autoEnabled ? "Auto: on" : "Auto: off";
  });
  app.stage.addChild(autoButton);
  const speedText = new PIXI.Text(
    "Speed: " + AUTO_SPEEDS[autoSpeedIdx] + "x",
    new PIXI.TextStyle({ fontFamily: "Arial", fontSize: 14, fill: "white" })
  );
  speedText.eventMode = "static";
  speedText.cursor = "pointer";
  speedText.on("pointerdown", () => {
    autoSpeedIdx = (autoSpeedIdx + 1) % AUTO_SPEEDS.length;
    speedText.text = "Speed: " + AUTO_SPEEDS[autoSpeedIdx] + "x";
  });
  app.stage.addChild(speedText);
  recomputeGrid();

  // --- Helpers ---
  const DIRS = ["up", "right", "down", "left"]; // absolute
  const DELTA = {
    up: { dx: 0, dy: -1 },
    right: { dx: 1, dy: 0 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
  };
  const REL_ORDER_NODE = ["left", "forward", "right"]; // per spec
  const REL_TO_ABS = {
    up: { left: "left", forward: "up", right: "right" },
    right: { left: "up", forward: "right", right: "down" },
    down: { left: "right", forward: "down", right: "left" },
    left: { left: "down", forward: "left", right: "up" },
  };

  function inBounds(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
  }

  // Sprite helper
  function makeSprite(tex, x, y, alpha = 1.0) {
    const s = new PIXI.Sprite(tex);
    s.x = x * scaleSize;
    s.y = y * scaleSize;
    s.scale.set(scaleSize, scaleSize);
    s.alpha = alpha;
    app.stage.addChild(s);
    return s;
  }

  // Rescale and reposition all sprites when scaleSize changes
  function rescaleAllSprites() {
    for (const pl of plants) {
      for (const c of pl.cells) {
        if (c.sprite) {
          c.sprite.x = c.pos.x * scaleSize;
          c.sprite.y = c.pos.y * scaleSize;
          c.sprite.scale.set(scaleSize, scaleSize);
        }
      }
    }
    for (const s of movingSeeds) {
      if (s.sprite) {
        s.sprite.x = s.pos.x * scaleSize;
        s.sprite.y = s.pos.y * scaleSize;
        s.sprite.scale.set(scaleSize, scaleSize);
      }
    }
    if (currentHighlight) {
      currentHighlight.x = currentHighlight.gridX * scaleSize;
      currentHighlight.y = currentHighlight.gridY * scaleSize;
      currentHighlight.scale.set(scaleSize, scaleSize);
    }
    // relayout cards if visible
    if (pending && pending.cards && pending.cards.length) relayoutCards();
  }

  function ensureFitsInBounds(nx, ny) {
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) return true;
    // try to shrink scaleSize until fits or reach 1
    let changed = false;
    while ((nx < 0 || nx >= cols || ny < 0 || ny >= rows) && scaleSize > 1) {
      scaleSize -= 1;
      changed = true;
      recomputeGrid();
    }
    if (changed) {
      rescaleAllSprites();
    }
    // recompute cols/rows reflect new scale
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) return true;
    // cannot fit even at scale 1
    simulationPaused = true;
    console.log(
      "Simulation paused: reached minimum scale and attempted to place out of bounds at (",
      nx,
      ",",
      ny,
      ")"
    );
    return false;
  }

  // --- Occupancy: per-plant and global ---
  class PlantOccupancy {
    constructor() {
      this.grid = new Map();
    }
    key(x, y) {
      return x + "," + y;
    }
    has(x, y) {
      return this.grid.has(this.key(x, y));
    }
    get(x, y) {
      return this.grid.get(this.key(x, y)) || null;
    }
    set(x, y, cell) {
      this.grid.set(this.key(x, y), cell);
    }
    clear() {
      this.grid.clear();
    }
  }

  class GlobalOccupancy {
    constructor() {
      this.map = new Map(); // key -> plantId
    }
    key(x, y) {
      return x + "," + y;
    }
    claim(x, y, plantId) {
      this.map.set(this.key(x, y), plantId);
    }
    release(x, y) {
      this.map.delete(this.key(x, y));
    }
    get(x, y) {
      return this.map.get(this.key(x, y));
    }
    isOccupiedByOther(x, y, plantId) {
      const v = this.get(x, y);
      return v !== undefined && v !== plantId;
    }
    mooreHasOther(x, y, plantId) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          const v = this.get(px, py);
          if (v !== undefined && v !== plantId) return true;
        }
      }
      return false;
    }
  }
  const globalOcc = new GlobalOccupancy();

  // --- Genes (explicit arrays, default implicit [0,1]) ---
  // Change this to experiment with different default ratios!
  const DEFAULT_URN = [0, 1]; // Try [1, 0, 1] for more growth bias, [0, 0, 1] for even more, etc.
  // Learning intensity controls how many copies of each realized outcome are added back into the urn.
  // A value of 1 reproduces the current behavior; higher values accelerate learning by reinforcing outcomes.
  const LEARNING_INTENSITY = 5;

  class GeneBank {
    constructor(copyFrom = null) {
      this.map = new Map();
      if (copyFrom) {
        for (const [k, v] of copyFrom.map.entries()) this.map.set(k, v.slice());
      }
    }
    // Show DEFAULT_URN if key absent; otherwise a copy of the stored array
    preview(key) {
      return this.map.has(key)
        ? this.map.get(key).slice()
        : DEFAULT_URN.slice();
    }
    // Draw from stored array if present, else from DEFAULT_URN
    sample(key) {
      const urn = this.map.get(key);
      const pool = urn ? urn : DEFAULT_URN;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    // Append realized outcome. If absent, create [DEFAULT_URN..., value].
    // Multiple copies of the outcome are added based on LEARNING_INTENSITY.
    append(key, value) {
      if (this.map.has(key)) {
        const arr = this.map.get(key);
        for (let i = 0; i < LEARNING_INTENSITY; i++) arr.push(value);
      } else {
        // Start with a copy of the default urn and append the result LEARNING_INTENSITY times
        const arr = DEFAULT_URN.slice();
        for (let i = 0; i < LEARNING_INTENSITY; i++) arr.push(value);
        this.map.set(key, arr);
      }
    }
  }

  // --- Cells ---
  const CellType = { SEED: "SEED", STEM: "STEM", NODE: "NODE" };

  class Cell {
    constructor(
      plant,
      type,
      x,
      y,
      hue,
      orientation = null,
      depth = 0,
      pathKey = ""
    ) {
      this.plant = plant;
      this.type = type;
      this.pos = { x, y };
      this.hue = hue;
      this.orientation = orientation; // for stems/nodes: absolute dir of incoming
      this.depth = depth; // distance from seed in particles
      this.pathKey = pathKey; // lineage path to this cell
      const tex =
        type === CellType.SEED
          ? textures.SEED
          : type === CellType.STEM
          ? textures.STEM
          : textures.NODE;
      this.sprite = makeSprite(tex, x, y, 0.92);
      if (type === CellType.NODE) {
        this.sideOutcomes = { left: null, forward: null, right: null };
      }
    }
  }

  // --- Plant ---
  let plantIdCounter = 1;
  class Plant {
    constructor(seedX, seedY, genesCopy = null) {
      this.id = plantIdCounter++;
      this.genes = new GeneBank(genesCopy);
      this.bornTick = tickCount;
      this.occ = new PlantOccupancy();
      // no neighbor counts needed under the new five-spot rule
      this.cells = [];
      this.hueCounter = Math.floor(Math.random() * 256);
      this.mature = false;
      this.reproduced = false;
      this.seedPos = { x: seedX, y: seedY };
      // growth frontier per depth: Map<depth, TipQueue[]>
      this.frontiers = new Map();
      // Create seed
      const seed = new Cell(
        this,
        CellType.SEED,
        seedX,
        seedY,
        this.nextHue(),
        null,
        0,
        ""
      );
      seed.bornTick = this.bornTick;
      this.addCell(seed);
      // five-spot rule does not require neighbor count updates
      // Seed attempts: forward (up), then right, behind, left clockwise
      const seedDirOrder = ["up", "right", "down", "left"];
      this.enqueue({
        kind: "seedTry",
        x: seedX,
        y: seedY,
        depth: 0,
        tryIndex: 0,
        dirOrder: seedDirOrder,
        phase: 0,
        pathKey: seed.pathKey,
      });
    }

    // no neighbor count helpers needed

    nextHue() {
      return 0; // All particles are pure green, no hue variation needed
    }
    addCell(cell) {
      this.cells.push(cell);
      this.occ.set(cell.pos.x, cell.pos.y, cell);
      globalOcc.claim(cell.pos.x, cell.pos.y, this.id);
    }

    enqueue(tip) {
      const d = tip.depth;
      if (!this.frontiers.has(d)) this.frontiers.set(d, []);
      this.frontiers.get(d).push(tip);
    }

    hasActiveTips() {
      for (const [, arr] of this.frontiers) if (arr.length) return true;
      return false;
    }

    minActiveDepth() {
      let min = null;
      for (const [d, arr] of this.frontiers.entries()) {
        if (arr.length) {
          if (min === null || d < min) min = d;
        }
      }
      return min;
    }
  }

  // --- Decision engine (global) ---
  const plants = [];
  // Start with one plant at center
  plants.push(new Plant(Math.floor(cols / 2), Math.floor(rows / 2)));
  // Allow the initial plant and its seed cell to act on the first tick
  plants[0].bornTick = -1;
  if (plants[0].cells && plants[0].cells.length) {
    for (const c of plants[0].cells) c.bornTick = -1;
  }

  // Pending decision & UI state
  let pending = null; // { plant, tip, key, urnPreview, sampled, cards? }
  let phase = 0; // 0=await selection, 1=show result
  let flipping = false;
  let autoAccumulator = 0; // for auto pacing

  // Seed walkers
  class SeedWalker {
    constructor(parentPlant, startX, startY, genesCopy, biasUrn) {
      this.parentId = parentPlant.id;
      this.pos = { x: startX, y: startY };
      this.genes = new GeneBank(genesCopy);
      this.biasUrn = biasUrn.slice();
      this.initialRemaining = SEED_WALK_STEPS;
      this.searchRemaining = SEED_WALK_STEPS;
      this.alive = true;
      this.sprite = makeSprite(textures.SEED, startX, startY, 0.9);
      this.attached = false;
      this.startTick = 0;
      this.order = 0;
      this.lastActedTick = -1;
    }
  }
  const movingSeeds = [];
  // Deterministic order and per-tick landing reservations
  let seedIdCounter = 0;
  let reservedLanding = new Set();

  // Initialize the first decision at load
  chooseNextDecision();

  function chooseNextDecision() {
    for (const pl of plants) {
      if (pl.mature) continue;
      if (pl.bornTick === tickCount) continue;
      const depths = Array.from(pl.frontiers.keys()).sort((a, b) => a - b);
      for (const d of depths) {
        const queue = pl.frontiers.get(d);
        if (!queue || queue.length === 0) continue;
        let attempts = queue.length;
        while (attempts-- > 0 && queue.length > 0) {
          const tip = queue.shift();
          const cell = pl.occ.get(tip.x, tip.y);
          if (cell && cell.bornTick === tickCount) {
            queue.push(tip);
            continue;
          }
          const k = computeKey(pl, tip);
          const urn = pl.genes.preview(k);
          pending = {
            plant: pl,
            tip,
            key: k,
            urnPreview: urn.slice(),
            sampled: null,
          };
          phase = 0;
          buildCardsUI(urn.slice());
          updateOverlay();
          return true;
        }
      }
    }
    plants.forEach((pl) => {
      if (!pl.mature && !pl.hasActiveTips()) {
        pl.mature = true;
        if (pl.reproReadyTick === undefined) pl.reproReadyTick = tickCount + 1;
      }
    });
    pending = null;
    updateOverlay();
    return false;
  }

  function computeKey(plant, tip) {
    if (tip.kind === "seedTry") {
      const dir = tip.dirOrder[tip.tryIndex];
      return `${tip.pathKey}/SLOT:${dir}`;
    }
    if (tip.kind === "stem") {
      return `${tip.pathKey}/CONT:${tip.dir}`;
    }
    if (tip.kind === "nodeSide") {
      return `${tip.pathKey}/NODE:${tip.inDir}:SIDE:${tip.rel}`;
    }
    return "unknown";
  }

  function updateHighlight(tip) {
    // Remove previous highlight
    if (currentHighlight) {
      app.stage.removeChild(currentHighlight);
      currentHighlight = null;
    }

    // Add new highlight at the target position
    if (tip) {
      let targetX = tip.x;
      let targetY = tip.y;

      if (tip.kind === "seedTry") {
        const dir = tip.dirOrder[tip.tryIndex];
        const d = DELTA[dir];
        targetX = tip.x + d.dx;
        targetY = tip.y + d.dy;
      } else if (tip.kind === "stem") {
        const d = DELTA[tip.dir];
        targetX = tip.x + d.dx;
        targetY = tip.y + d.dy;
      } else if (tip.kind === "nodeSide") {
        const abs = REL_TO_ABS[tip.inDir][tip.rel];
        const d = DELTA[abs];
        targetX = tip.x + d.dx;
        targetY = tip.y + d.dy;
      }

      if (ensureFitsInBounds(targetX, targetY)) {
        currentHighlight = makeSprite(textures.HILITE, targetX, targetY, 0.8);
        currentHighlight.gridX = targetX;
        currentHighlight.gridY = targetY;
      }
    }
  }

  function updateOverlay() {
    if (!pending) {
      // When nothing pending, prompt next action so user knows it's running
      const anySeeds = movingSeeds.some((s) => s.alive);
      const anyFrontiers = plants.some(
        (pl) => !pl.mature && pl.hasActiveTips()
      );
      if (anySeeds || anyFrontiers) {
        infoText.text = "";
        actionText.text = autoEnabled
          ? "Auto running"
          : "Press space / tap to step";
      } else {
        infoText.text = "Mature.";
        actionText.text = "";
      }
      updateHighlight(null);
      return;
    }
    const { key, urnPreview, sampled, tip } = pending;
    if (phase === 0) {
      // Showing cards, awaiting selection
      const readableKey = makeReadableKey(key);
      infoText.text = `Now divining:\n${readableKey}`;
      actionText.text = "Tap a card";
      updateHighlight(tip);
    } else if (phase === 1) {
      // Show the result and what it means
      const readableKey = makeReadableKey(key);
      const resultDesc = describeResult(key, sampled);
      infoText.text = `Now divining:\n${readableKey}\n\nDrew ${sampled}!\n${resultDesc}`;
      actionText.text = "Continue";
      updateHighlight(null);
    }
  }

  function makeReadableKey(key) {
    // Parse the full path structure and convert to human-readable format
    const parts = key.split("/");
    let result = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith("SLOT:")) {
        // Seed slot: /SLOT:up -> seed/up
        const dir = part.split("SLOT:")[1];
        result = `seed/${dir}`;
        break;
      } else if (part.startsWith("CONT:")) {
        // Stem continuation: /S:up/CONT:up -> seed/up-stem
        const dir = part.split("CONT:")[1];
        // Find the seed direction by looking backwards for S:
        let seedDir = "";
        for (let j = i - 1; j >= 0; j--) {
          if (parts[j].startsWith("S:")) {
            seedDir = parts[j].split("S:")[1];
            break;
          }
        }
        result = `seed/${seedDir}-stem`;
        break;
      } else if (part.startsWith("NODE:")) {
        // Node side: /S:up/T:up/NODE:up:SIDE:forward -> seed/up-stem/node/fwd
        const nodeInfo = part.split("NODE:")[1];
        const [inDir, side] = nodeInfo.split(":SIDE:");

        // Find the path prefix by looking backwards
        let pathPrefix = "";
        for (let j = i - 1; j >= 0; j--) {
          if (parts[j].startsWith("T:")) {
            // This is a node, so the prefix is the stem path
            const stemDir = parts[j].split("T:")[1];
            // Find the seed direction
            for (let k2 = j - 1; k2 >= 0; k2--) {
              if (parts[k2].startsWith("S:")) {
                const seedDir = parts[k2].split("S:")[1];
                pathPrefix = `seed/${seedDir}-stem`;
                break;
              }
            }
            break;
          }
        }

        // Convert side to readable format
        let readableSide = side;
        if (side === "forward") readableSide = "fwd";
        if (side === "left") readableSide = "left";
        if (side === "right") readableSide = "right";

        result = `${pathPrefix}/node/${readableSide}`;
        break;
      }
    }

    return result || key;
  }

  function describeResult(key, result) {
    if (key.includes("/SLOT:")) {
      const dir = key.split("/SLOT:")[1];
      return result === 1
        ? `seed grows stem ${dir}`
        : `seed fails to grow ${dir}`;
    }
    if (key.includes("/CONT:")) {
      return result === 1 ? `stem grows node` : `stem stops`;
    }
    if (key.includes("/NODE:")) {
      const parts = key.split("/NODE:")[1];
      const [inDir, side] = parts.split(":SIDE:");
      return result === 1 ? `node grows stem ${side}` : `node stops ${side}`;
    }
    return result === 1 ? `grows` : `stops`;
  }

  // --- Rule helpers for placement restrictions ---
  // Five-spot rule: block growth if any of the five positions (left, fwd-left, fwd, fwd-right, right)
  // relative to the facing direction of the new particle is already occupied by this plant.
  function canPlaceWithRules(pl, tip, tx, ty) {
    // Must fit (may shrink) and not be occupied by this plant
    if (!ensureFitsInBounds(tx, ty) || pl.occ.has(tx, ty)) return false;
    // Determine facing direction for this placement
    let facing;
    if (tip.kind === "seedTry") {
      facing = tip.dirOrder[tip.tryIndex];
    } else if (tip.kind === "stem") {
      facing = tip.dir;
    } else if (tip.kind === "nodeSide") {
      // For a node side, convert relative direction to absolute
      facing = REL_TO_ABS[tip.inDir][tip.rel];
    }
    if (facing) {
      // get mapping of relative directions (left, forward, right) to absolute
      const dirs = REL_TO_ABS[facing];
      const fwd = DELTA[dirs.forward];
      const left = DELTA[dirs.left];
      const right = DELTA[dirs.right];
      // diagonals
      const fwdLeft = { dx: fwd.dx + left.dx, dy: fwd.dy + left.dy };
      const fwdRight = { dx: fwd.dx + right.dx, dy: fwd.dy + right.dy };
      const positions = [left, fwdLeft, fwd, fwdRight, right];
      for (const d of positions) {
        const nx = tx + d.dx;
        const ny = ty + d.dy;
        if (pl.occ.has(nx, ny)) return false;
      }
    }
    // Global proximity vs other plants
    if (globalOcc.mooreHasOther(tx, ty, pl.id)) return false;
    return true;
  }

  // --- Main loop ---
  function render() {
    if (!simulationPaused) {
      // Auto mode driver (tick progression handled in step())
      driveAuto();
    }
    app.renderer.render(app.stage);
    requestAnimationFrame(render);
  }
  render();

  // Controls: Space or click/tap advances one phase/decision
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      step();
      e.preventDefault();
    }
  });

  // Click/tap support
  app.view.addEventListener("click", () => {
    step();
  });

  // Touch support for mobile
  app.view.addEventListener("touchstart", (e) => {
    e.preventDefault();
    step();
  });

  function step() {
    if (simulationPaused) return;
    // 1) Handle reproduction: attach seeds once and end the tick
    let reproduced = false;
    for (const pl of plants) {
      if (
        pl.mature &&
        !pl.reproduced &&
        pl.reproReadyTick !== undefined &&
        tickCount >= pl.reproReadyTick
      ) {
        spawnSeedsForPlant(pl);
        pl.reproduced = true;
        reproduced = true;
      }
    }
    if (reproduced) {
      incrementGlobalTick();
      return;
    }

    // 2) If a decision result is displayed (phase 1), clear it and queue the next one
    if (pending) {
      if (phase === 1) {
        pending = null;
        clearCardsUI();
        chooseNextDecision();
      }
      // In phase 0, wait for the user to select a card; do not advance tick
      return;
    }

    // 3) Try to move one seed in this global tick
    if (stepOneSeed()) {
      return;
    }

    // 4) No seeds moved: schedule the next plant decision (if any)
    if (chooseNextDecision()) {
      return;
    }

    // 5) Nothing else: end the tick
    incrementGlobalTick();
  }

  // removed unused canPlace; the five-spot rule is handled in canPlaceWithRules

  function applyDecision(pl, tip, key, val) {
    if (tip.kind === "seedTry") {
      const dir = tip.dirOrder[tip.tryIndex];
      const d = DELTA[dir];
      const nx = tip.x + d.dx,
        ny = tip.y + d.dy;
      if (!ensureFitsInBounds(nx, ny)) return;
      if (val === 1 && canPlaceWithRules(pl, tip, nx, ny)) {
        // grow stem and stop trying other sides
        const stem = new Cell(
          pl,
          CellType.STEM,
          nx,
          ny,
          pl.nextHue(),
          dir,
          tip.depth + 1,
          `${tip.pathKey}/S:${dir}`
        );
        stem.bornTick = tickCount;
        pl.addCell(stem);
        // enqueue stem continuation decision
        pl.enqueue({
          kind: "stem",
          x: nx,
          y: ny,
          dir,
          depth: tip.depth + 1,
          phase: 0,
          pathKey: stem.pathKey,
        });
      } else {
        // failure or blocked: record as 0 already handled via urn push; try next side
        if (val === 1) {
          // mark explicit failure when blocked
          pl.genes.append(key, 0);
        }
        const nextTry = tip.tryIndex + 1;
        if (nextTry < tip.dirOrder.length) {
          pl.enqueue({
            kind: "seedTry",
            x: tip.x,
            y: tip.y,
            depth: tip.depth,
            tryIndex: nextTry,
            dirOrder: tip.dirOrder,
            phase: 0,
            pathKey: tip.pathKey,
          });
        }
      }
      return;
    }

    if (tip.kind === "stem") {
      // continue forward into node or stop
      if (val === 1) {
        const d = DELTA[tip.dir];
        const nx = tip.x + d.dx,
          ny = tip.y + d.dy;
        if (!ensureFitsInBounds(nx, ny)) return;
        if (canPlaceWithRules(pl, tip, nx, ny)) {
          const nodeHue = pl.nextHue();
          const node = new Cell(
            pl,
            CellType.NODE,
            nx,
            ny,
            nodeHue,
            tip.dir,
            tip.depth + 1,
            `${tip.pathKey}/T:${tip.dir}`
          );
          node.bornTick = tickCount;
          pl.addCell(node);
          // enqueue node sides: left, forward, right
          for (const rel of REL_ORDER_NODE) {
            pl.enqueue({
              kind: "nodeSide",
              x: nx,
              y: ny,
              inDir: tip.dir,
              rel,
              depth: tip.depth + 1,
              baseHue: nodeHue,
              pathKey: node.pathKey,
            });
          }
        } else {
          // blocked counts as failure
          pl.genes.append(key, 0);
        }
      } else {
        // stop; nothing further
      }
      return;
    }

    if (tip.kind === "nodeSide") {
      const abs = REL_TO_ABS[tip.inDir][tip.rel];
      const d = DELTA[abs];
      const nx = tip.x + d.dx,
        ny = tip.y + d.dy;
      const nodeCell = tip && pending && pending.tip === tip ? null : null; // placeholder to keep structure
      if (val === 1 && canPlaceWithRules(pl, tip, nx, ny)) {
        // spawn a stem tip; children share node’s hue progression
        const hue = 0; // pure green
        const stem = new Cell(
          pl,
          CellType.STEM,
          nx,
          ny,
          hue,
          abs,
          tip.depth + 1,
          `${tip.pathKey}/N:${tip.inDir}:${tip.rel}`
        );
        stem.bornTick = tickCount;
        pl.addCell(stem);
        pl.enqueue({
          kind: "stem",
          x: nx,
          y: ny,
          dir: abs,
          depth: tip.depth + 1,
          pathKey: stem.pathKey,
        });
        // record side outcome on the node
        const nodeAt = pl.occ.get(tip.x, tip.y);
        if (nodeAt && nodeAt.type === CellType.NODE) {
          nodeAt.sideOutcomes[tip.rel] = { value: 1, forced: false };
        }
      } else {
        // mark failure on blockage
        if (val === 1) {
          pl.genes.append(key, 0);
          const nodeAt = pl.occ.get(tip.x, tip.y);
          if (nodeAt && nodeAt.type === CellType.NODE) {
            nodeAt.sideOutcomes[tip.rel] = { value: 0, forced: true };
          }
        } else {
          const nodeAt = pl.occ.get(tip.x, tip.y);
          if (nodeAt && nodeAt.type === CellType.NODE) {
            nodeAt.sideOutcomes[tip.rel] = { value: 0, forced: false };
          }
        }
      }
      return;
    }
  }

  // --- Card UI helpers ---
  function clearGenePreview() {
    genePreview.removeChildren();
  }
  function drawGenePreview(values) {
    clearGenePreview();
    let x = 0;
    const open = new PIXI.Text("[", {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
    });
    open.x = x;
    open.y = 0;
    genePreview.addChild(open);
    x += open.width;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const color = v === 1 ? 0xff0000 : 0x0000ff;
      const digit = new PIXI.Text(String(v), {
        fontFamily: "Arial",
        fontSize: 14,
        fill: color,
      });
      digit.x = x;
      digit.y = 0;
      genePreview.addChild(digit);
      x += digit.width;
      if (i < values.length - 1) {
        const comma = new PIXI.Text(",", {
          fontFamily: "Arial",
          fontSize: 14,
          fill: 0xffffff,
        });
        comma.x = x;
        comma.y = 0;
        genePreview.addChild(comma);
        x += comma.width;
      }
    }
    const close = new PIXI.Text("]", {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
    });
    close.x = x;
    close.y = 0;
    genePreview.addChild(close);
    genePreview.x = Math.floor((app.screen.width - genePreview.width) / 2);
    genePreview.y = 64;
  }

  function clearCardsUI() {
    cardContainer.removeChildren();
    cardPanelBg.clear();
  }

  function buildCardsUI(urn) {
    clearCardsUI();
    // shuffle a copy
    const shuffled = urn.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = t;
    }
    pending.cards = shuffled.map((v) => ({
      value: v,
      state: "down",
      gfx: null,
      highlighted: false,
    }));
    // panel bg
    const h = Math.floor(app.screen.height * CARD_PANEL_FRACTION);
    cardPanelBg.beginFill(0x000000, 0.6);
    cardPanelBg.drawRect(0, app.screen.height - h, app.screen.width, h);
    cardPanelBg.endFill();
    // layout
    const cardPx = 3 * scaleSize;
    const cardGapPx = cardPx;
    const maxPerRow = Math.floor(
      (app.screen.width - cardGapPx) / (cardPx + cardGapPx)
    );
    const rowsNeeded = pending.cards.length <= maxPerRow ? 1 : 2;
    const perRow =
      rowsNeeded === 1
        ? pending.cards.length
        : Math.ceil(pending.cards.length / 2);
    let cardIndex = 0;
    for (let r = 0; r < rowsNeeded; r++) {
      const countThisRow =
        r === 0
          ? Math.min(perRow, pending.cards.length)
          : pending.cards.length - perRow;
      const totalWidth = countThisRow * cardPx + (countThisRow + 1) * cardGapPx;
      let x = Math.floor((app.screen.width - totalWidth) / 2) + cardGapPx;
      const y = app.screen.height - h + CARD_GAP + r * (cardPx + cardGapPx);
      for (let i = 0; i < countThisRow; i++) {
        const card = pending.cards[cardIndex++];
        const g = new PIXI.Container();
        drawCardFace(g, card.state, card.value, card.highlighted);
        g.x = x;
        g.y = y;
        g.eventMode = "static";
        g.cursor = "pointer";
        g.on("pointerdown", () => onCardClicked(card));
        card.gfx = g;
        cardContainer.addChild(g);
        x += cardPx + cardGapPx;
      }
    }
    drawGenePreview(urn);
  }

  function drawCardFace(container, state, value, highlighted) {
    container.removeChildren();
    const cellSize = scaleSize;
    const centerUpTex = value === 1 ? textures.RED : textures.BLUE;
    // draw card face; edge state becomes 1x3 center column
    const widthCells = state === "edge" ? 1 : 3;
    const offsetX = state === "edge" ? 1 : 0;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < widthCells; x++) {
        const gx = x + offsetX;
        let tex;
        const isBorder = gx === 0 || gx === 2 || y === 0 || y === 2;
        if (isBorder) {
          tex = textures.WHITE;
        } else {
          if (state === "edge") tex = textures.WHITE; // center column line
          else if (state === "up") tex = centerUpTex;
          else tex = textures.BLACK;
        }
        const s = new PIXI.Sprite(tex);
        s.x = gx * cellSize;
        s.y = y * cellSize;
        s.scale.set(cellSize, cellSize);
        container.addChild(s);
      }
    }
    // add yellow outline around the card when highlighted (one cell thick outside the 3x3)
    if (highlighted) {
      // outer highlight adapts to current card width
      const leftEdge = offsetX - 1;
      const rightEdge = offsetX + widthCells;
      // top and bottom rows
      for (let x = leftEdge; x <= rightEdge; x++) {
        const top = new PIXI.Sprite(textures.YELLOW);
        top.x = x * cellSize;
        top.y = -1 * cellSize;
        top.scale.set(cellSize, cellSize);
        top.alpha = 0.5;
        container.addChild(top);
        const bot = new PIXI.Sprite(textures.YELLOW);
        bot.x = x * cellSize;
        bot.y = 3 * cellSize;
        bot.scale.set(cellSize, cellSize);
        bot.alpha = 0.5;
        container.addChild(bot);
      }
      // left and right columns (excluding corners already drawn)
      for (let y = 0; y <= 2; y++) {
        const left = new PIXI.Sprite(textures.YELLOW);
        left.x = leftEdge * cellSize;
        left.y = y * cellSize;
        left.scale.set(cellSize, cellSize);
        left.alpha = 0.5;
        container.addChild(left);
        const right = new PIXI.Sprite(textures.YELLOW);
        right.x = rightEdge * cellSize;
        right.y = y * cellSize;
        right.scale.set(cellSize, cellSize);
        right.alpha = 0.5;
        container.addChild(right);
      }
    }
  }

  let highlightedCard = null;
  function onCardClicked(card) {
    if (simulationPaused || !pending || phase !== 0 || flipping) return;
    if (highlightedCard === card) {
      // select
      flipAllCardsAndApply(card);
    } else {
      // clear previous highlight
      if (highlightedCard && highlightedCard.gfx) {
        highlightedCard.highlighted = false;
        drawCardFace(
          highlightedCard.gfx,
          highlightedCard.state,
          highlightedCard.value,
          highlightedCard.highlighted
        );
      }
      highlightedCard = card;
      card.highlighted = true;
      if (card.gfx)
        drawCardFace(card.gfx, card.state, card.value, card.highlighted);
    }
  }

  function flipAllCardsAndApply(selectedCard) {
    flipping = true;
    // Frame 1 already down
    // Frame 2 edge
    setTimeout(() => {
      for (const c of pending.cards) {
        c.state = "edge";
        if (c.gfx) drawCardFace(c.gfx, c.state, c.value, c.highlighted);
      }
      // Frame 3 up
      setTimeout(() => {
        for (const c of pending.cards) {
          c.state = "up";
          if (c.gfx) drawCardFace(c.gfx, c.state, c.value, c.highlighted);
        }
        // apply and immediately advance to next decision
        const pl = pending.plant;
        const tip = pending.tip;
        const value = selectedCard.value;
        pl.genes.append(pending.key, value);
        pending.sampled = value;
        applyDecision(pl, tip, pending.key, value);
        flipping = false;
        // clear current cards and proceed directly to the next decision
        pending = null;
        clearCardsUI();
        // Try to pick next decision immediately; if none eligible this tick, advance tick and try again
        if (!chooseNextDecision()) {
          incrementGlobalTick();
          chooseNextDecision();
        }
      }, FLIP_MS);
    }, FLIP_MS);
  }

  function driveAuto() {
    if (!autoEnabled || flipping) return;
    autoAccumulator += app.ticker.deltaMS / 1000;
    const targetInterval = 1 / AUTO_SPEEDS[autoSpeedIdx];
    if (autoAccumulator >= targetInterval) {
      autoAccumulator = 0;
      if (pending && phase === 0) {
        if (pending.cards && pending.cards.length > 0) {
          flipAllCardsAndApply(pending.cards[0]);
        }
      } else {
        step();
      }
    }
  }

  function relayoutCards() {
    if (!pending || !pending.cards) return;
    cardContainer.removeChildren();
    const h = Math.floor(app.screen.height * CARD_PANEL_FRACTION);
    cardPanelBg.clear();
    cardPanelBg.beginFill(0x000000, 0.6);
    cardPanelBg.drawRect(0, app.screen.height - h, app.screen.width, h);
    cardPanelBg.endFill();
    const cardPx = 3 * scaleSize;
    const cardGapPx = cardPx;
    const maxPerRow = Math.floor(
      (app.screen.width - cardGapPx) / (cardPx + cardGapPx)
    );
    const rowsNeeded = pending.cards.length <= maxPerRow ? 1 : 2;
    const perRow =
      rowsNeeded === 1
        ? pending.cards.length
        : Math.ceil(pending.cards.length / 2);
    let cardIndex = 0;
    for (let r = 0; r < rowsNeeded; r++) {
      const countThisRow =
        r === 0
          ? Math.min(perRow, pending.cards.length)
          : pending.cards.length - perRow;
      const totalWidth = countThisRow * cardPx + (countThisRow + 1) * cardGapPx;
      let x = Math.floor((app.screen.width - totalWidth) / 2) + cardGapPx;
      const y = app.screen.height - h + CARD_GAP + r * (cardPx + cardGapPx);
      for (let i = 0; i < countThisRow; i++) {
        const card = pending.cards[cardIndex++];
        const g = new PIXI.Container();
        drawCardFace(g, card.state, card.value, card.highlighted);
        g.x = x;
        g.y = y;
        g.eventMode = "static";
        g.cursor = "pointer";
        g.on("pointerdown", () => onCardClicked(card));
        card.gfx = g;
        cardContainer.addChild(g);
        x += cardPx + cardGapPx;
      }
    }
  }

  // --- Seeds subsystem ---
  function incrementGlobalTick() {
    tickCount++;
    reservedLanding.clear();
  }

  function stepOneSeed() {
    let candidate = null;
    for (const s of movingSeeds) {
      if (!s.alive) continue;
      if (
        s.lastActedTick < tickCount &&
        (!s.attached || tickCount > s.startTick)
      ) {
        if (candidate === null || s.order < candidate.order) candidate = s;
      }
    }
    if (!candidate) return false;
    const s = candidate;
    if (s.attached) s.attached = false;
    const dir = s.biasUrn[Math.floor(Math.random() * s.biasUrn.length)];
    const d = DELTA[dir];
    const nx = s.pos.x + d.dx;
    const ny = s.pos.y + d.dy;
    if (!ensureFitsInBounds(nx, ny)) {
      s.alive = false;
      if (s.sprite && s.sprite.parent) s.sprite.parent.removeChild(s.sprite);
      movingSeeds.splice(movingSeeds.indexOf(s), 1);
      s.lastActedTick = tickCount;
      return true;
    }
    s.pos.x = nx;
    s.pos.y = ny;
    if (s.sprite) {
      s.sprite.x = s.pos.x * scaleSize;
      s.sprite.y = s.pos.y * scaleSize;
    }
    if (s.initialRemaining > 0) {
      s.initialRemaining--;
      s.lastActedTick = tickCount;
      return true;
    }
    let blocked = false;
    for (let dy = -1; dy <= 1 && !blocked; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = s.pos.x + dx;
        const py = s.pos.y + dy;
        const key = `${px},${py}`;
        if (reservedLanding.has(key)) {
          blocked = true;
          break;
        }
        const occ = globalOcc.get(px, py);
        if (occ !== undefined) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      const child = new Plant(s.pos.x, s.pos.y, s.genes);
      child.bornTick = tickCount;
      plants.push(child);
      reservedLanding.add(`${s.pos.x},${s.pos.y}`);
      s.alive = false;
      if (s.sprite && s.sprite.parent) s.sprite.parent.removeChild(s.sprite);
      movingSeeds.splice(movingSeeds.indexOf(s), 1);
    } else {
      if (s.searchRemaining > 0) s.searchRemaining--;
      else {
        s.alive = false;
        if (s.sprite && s.sprite.parent) s.sprite.parent.removeChild(s.sprite);
        movingSeeds.splice(movingSeeds.indexOf(s), 1);
      }
    }
    s.lastActedTick = tickCount;
    return true;
  }
  function biasUrnFromVector(dx, dy) {
    const dirs = ["up", "right", "down", "left"]; // base
    const urn = dirs.slice();
    if (dx > 0) {
      urn.push("right", "right");
    }
    if (dx < 0) {
      urn.push("left", "left");
    }
    if (dy > 0) {
      urn.push("down", "down");
    }
    if (dy < 0) {
      urn.push("up", "up");
    }
    return urn;
  }

  function spawnSeedsForPlant(pl) {
    for (const c of pl.cells) {
      if (c.type !== CellType.NODE) continue;
      for (const rel of REL_ORDER_NODE) {
        const outcome = c.sideOutcomes && c.sideOutcomes[rel];
        if (outcome && outcome.value === 0 && outcome.forced === false) {
          const abs = REL_TO_ABS[c.orientation][rel];
          const d = DELTA[abs];
          const sx = c.pos.x + d.dx;
          const sy = c.pos.y + d.dy;
          // starting seed position is adjacent; no checks now
          const dx = sx - pl.seedPos.x;
          const dy = sy - pl.seedPos.y;
          const urn = biasUrnFromVector(dx, dy);
          if (!ensureFitsInBounds(sx, sy)) continue;
          const walker = new SeedWalker(pl, sx, sy, pl.genes, urn);
          walker.attached = true;
          walker.startTick = tickCount;
          walker.lastActedTick = -1;
          walker.order = seedIdCounter++;
          movingSeeds.push(walker);
        }
      }
    }
  }

  function updateSeeds() {
    // replaced by tick-based seed stepping
  }
});
