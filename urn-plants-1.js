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

  function recomputeGrid() {
    cols = Math.floor(window.innerWidth / scaleSize);
    rows = Math.floor(window.innerHeight / scaleSize);
    overlayBg.clear();
    overlayBg.beginFill(0x000000, 0.35);
    overlayBg.drawRect(0, 0, app.screen.width, 60);
    overlayBg.endFill();
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
    SEED: makeTexture(0x00ff00),
    STEM: makeTexture(0x00ff00),
    NODE: makeTexture(0x00ff00),
    HILITE: makeTexture(0xffff00), // Yellow highlight
  };

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

  // --- Occupancy: per-plant only (no global collisions) ---
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
  }

  // --- Genes (explicit arrays, default implicit [0,1]) ---
  class GeneBank {
    constructor(copyFrom = null) {
      this.map = new Map();
      if (copyFrom) {
        for (const [k, v] of copyFrom.map.entries()) this.map.set(k, v.slice());
      }
    }
    // Show [0,1] if key absent; otherwise a copy of the stored array
    preview(key) {
      return this.map.has(key) ? this.map.get(key).slice() : [0, 1];
    }
    // Draw from stored array if present, else from [0,1]
    sample(key) {
      const urn = this.map.get(key);
      const pool = urn ? urn : [0, 1];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    // Append realized outcome. If absent, create [0,1,value]
    append(key, value) {
      if (this.map.has(key)) this.map.get(key).push(value);
      else this.map.set(key, [0, 1, value]);
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
      this.sprite.tint = 0x00ff00; // Pure green (RGB: 0,255,0)
    }
  }

  // --- Plant ---
  let plantIdCounter = 1;
  class Plant {
    constructor(seedX, seedY, genesCopy = null) {
      this.id = plantIdCounter++;
      this.genes = new GeneBank(genesCopy);
      this.occ = new PlantOccupancy();
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
      this.addCell(seed);
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

    nextHue() {
      return 0; // All particles are pure green, no hue variation needed
    }
    addCell(cell) {
      this.cells.push(cell);
      this.occ.set(cell.pos.x, cell.pos.y, cell);
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

  // Pending decision is a small object with 3-phase processing
  let pending = null; // { plant, tip, key, urnPreview, sampled }
  let phase = 0; // 0=show odds, 1=show result, 2=apply

  // Initialize the first decision
  chooseNextDecision();

  function chooseNextDecision() {
    // Choose the plant that still has active tips; depth priority: smallest depth first
    for (const pl of plants) {
      if (pl.mature) continue;
      const d = pl.minActiveDepth();
      if (d !== null) {
        const tip = pl.frontiers.get(d).shift();
        if (!tip) continue;
        const k = computeKey(pl, tip);
        const urn = pl.genes.preview(k);
        pending = {
          plant: pl,
          tip,
          key: k,
          urnPreview: urn.slice(),
          sampled: null,
        };
        phase = 0; // show odds
        updateOverlay();
        return true;
      }
    }
    // If no active tips remain for any plant: mark mature
    plants.forEach((pl) => {
      if (!pl.mature && !pl.hasActiveTips()) pl.mature = true;
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

      if (inBounds(targetX, targetY)) {
        currentHighlight = makeSprite(textures.HILITE, targetX, targetY, 0.8);
      }
    }
  }

  function updateOverlay() {
    if (!pending) {
      infoText.text = "Mature.";
      actionText.text = "Divine next plant";
      updateHighlight(null);
      return;
    }
    const { key, urnPreview, sampled, tip } = pending;
    if (phase === 0) {
      // Show the human-readable decision point and odds
      const readableKey = makeReadableKey(key);
      infoText.text = `Now divining:\n${readableKey}\n\nReady to draw\n[${urnPreview.join(
        ", "
      )}]`;
      actionText.text = "Draw";
      updateHighlight(tip);
    } else if (phase === 1) {
      // Show the result and what it means
      const readableKey = makeReadableKey(key);
      const resultDesc = describeResult(key, sampled);
      infoText.text = `Now divining:\n${readableKey}\n\nDrew ${sampled}!\n${resultDesc}`;
      actionText.text = "Divine next particle";
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
            for (let k = j - 1; k >= 0; k--) {
              if (parts[k].startsWith("S:")) {
                const seedDir = parts[k].split("S:")[1];
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

  function step() {
    if (!pending) {
      // Check if any mature plant needs to reproduce
      for (const pl of plants) {
        if (pl.mature && !pl.reproduced) {
          // Remove mature plant cells from display
          for (const cell of pl.cells) {
            if (cell.sprite && cell.sprite.parent) {
              cell.sprite.parent.removeChild(cell.sprite);
            }
          }
          pl.cells = [];

          // Place new seed in center
          const centerX = Math.floor(cols / 2);
          const centerY = Math.floor(rows / 2);
          const child = new Plant(centerX, centerY, pl.genes);
          plants.push(child);
          pl.reproduced = true;

          // Start the new plant's first decision
          chooseNextDecision();
          return;
        }
      }
      if (!chooseNextDecision()) return; // nothing to do
    }
    const pl = pending.plant;
    const tip = pending.tip;

    if (phase === 0) {
      // Sample, apply, and show result all at once
      const result = pl.genes.sample(pending.key);
      pl.genes.append(pending.key, result);
      pending.sampled = result;
      applyDecision(pl, tip, pending.key, result);
      phase = 1;
      updateOverlay();
      return;
    }
    // phase === 1, move to next decision
    pending = null;
    chooseNextDecision();
  }

  function canPlace(pl, x, y) {
    return inBounds(x, y) && !pl.occ.has(x, y);
  }

  function applyDecision(pl, tip, key, val) {
    if (tip.kind === "seedTry") {
      const dir = tip.dirOrder[tip.tryIndex];
      const d = DELTA[dir];
      const nx = tip.x + d.dx,
        ny = tip.y + d.dy;
      if (val === 1 && canPlace(pl, nx, ny)) {
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
        if (val === 1 && !canPlace(pl, nx, ny)) {
          // also add an explicit failure mark to make it clear; spec says failed placement adds 0
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
        if (canPlace(pl, nx, ny)) {
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
      if (val === 1 && canPlace(pl, nx, ny)) {
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
        pl.addCell(stem);
        pl.enqueue({
          kind: "stem",
          x: nx,
          y: ny,
          dir: abs,
          depth: tip.depth + 1,
          pathKey: stem.pathKey,
        });
      } else {
        // mark failure on blockage
        if (val === 1 && !canPlace(pl, nx, ny)) pl.genes.append(key, 0);
      }
      return;
    }
  }

  // --- Main loop ---
  function render() {
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
});
