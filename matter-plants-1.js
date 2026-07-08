// matter-plants 1 — Phase A: plants as transmuted matter
//
// Falling-sand cellular automaton. Plants are not organisms with records —
// they are tiles. Growth converts an adjacent water tile into a plant tile
// ("drinking"); death converts plant tiles back into soil that falls. There
// is no economy: the water BECOMES the plant, so conservation is what the
// rules do, not a ledger bolted on.
//
// Design law — no hidden values. Every rule reads only a tile and its
// immediate neighbors. Every piece of state is visible on screen as a tile.
// No energy numbers, no plant records, no owner array, no timers, no ages.
//
// The complete plant system (there is no other plant code):
//   G — Grow:      PLANT with a WATER cardinal neighbor converts it to PLANT
//                  with probability P_GROW per awake tick.
//   L — Suffocate: PLANT touching no AIR and no WATER (all 4 cardinal
//                  neighbors solid) becomes DEAD in place. Only intrinsic
//                  death: burial kills, dense cores self-prune into lace.
//   S — Sprout:    SOIL touching both WATER and AIR becomes PLANT with tiny
//                  probability P_SPROUT per awake tick. No seeds in Phase A.
//   F — Crumble:   PLANT or DEAD with zero solid neighbors (8-way) becomes a
//                  falling SOIL grain. Permissive on purpose: severed clumps
//                  that mutually touch can float (judged charming).
//   R — Rot:       DEAD adjacent to WATER becomes falling SOIL with small
//                  probability P_ROT per awake tick.
//
// One scheduler: the existing chunk wake system. Rules fire only in awake
// chunks, so growth only happens while water moves — plants grow when it
// rains and go still in stillness. A settled world full of mature plants is
// fully asleep and costs ~zero.
//
// Substrate (chunks, water, soil, PRNG) is carried over from evo-engine.js
// Phase 0 unchanged. evo-engine.js itself is untouched (tag phase1-complete).
//
// Runs two ways:
//   browser: matter-plants-1.html (PIXI rendering, interactive brushes)
//   node matter-plants-1.js [seed] [ticks] — headless acceptance: storms
//     drive growth over a long run; verifies total non-air tile count equals
//     initial + rained, rule L self-prunes (no runaway solid-green fill),
//     and the world sleeps at rest.

"use strict";

// --- World ---
// Browser can shrink the world for legibility: matter-plants-1.html?size=128
// (snapped to the 64-cell chunk grid, min 64; cells CSS-scale to fill the
// window). The node harness always runs the full 1024.
let sizeReq = 1024;
if (typeof window !== "undefined") {
  const p = parseInt(
    new URLSearchParams(window.location.search).get("size") || "",
    10
  );
  if (p > 0) sizeReq = p;
}
const W = Math.max(64, Math.round(sizeReq / 64) * 64);
const H = W;
const N = W * H;
const SHIFT = 6; // chunk = 64x64
const CHUNK = 1 << SHIFT;
const CW = W >> SHIFT;
const CH = H >> SHIFT;
const NC = CW * CH;

const EMPTY = 0; // AIR
const SOIL = 1;
const WATER = 2;
const PLANT = 3; // living, static solid
const DEAD = 4; // dead plant / skeleton, static solid

const RAIN_RATE = Math.max(4, W >> 4); // water spawns per tick while raining, ∝ width
const FF_FACTOR = 10;

// --- Tuning knobs (guesses; tune in browser, then lock into the harness) ---
const P_GROW = 0.02; // drink roll per awake tick per plant tile
const P_SPROUT = 0.00005; // genesis roll per awake tick per wet+aired soil tile
const P_ROT = 0.005; // rot roll per awake tick per water-touching dead tile

// --- State (all flat typed arrays, no objects) ---
const type = new Uint8Array(N);
const flow = new Uint8Array(N); // direction persistence: 0 none, 1 left, 2 right
const lastMoved = new Uint32Array(N); // tick stamp: each cell acts at most once per tick
const shade = new Uint8Array(N); // baked per-cell render jitter
let activeNow = new Uint8Array(NC);
let activeNext = new Uint8Array(NC);
const drawDirty = new Uint8Array(NC);

let ticks = 0;
let raining = true;
let parity = 0;

// Running tile census, updated at every conversion site. Movement never
// changes it. The harness recounts the grid and demands an exact match, so
// any missed bookkeeping shows up as a LEAK.
const tally = new Int32Array(5);
let totalRained = 0; // the only matter input (plus brush edits in browser)
let matterIn = 0; // brush-painted tiles (browser only)
let matterOut = 0; // brush-erased tiles (browser only)

// Event counters (stats only — no rule reads these)
let grown = 0;
let sprouted = 0;
let suffocated = 0;
let crumbled = 0;
let rotted = 0;

// --- Seeded PRNG (LCG, same family as rgbfields/simplant) ---
let rngState = 1337 >>> 0;
function setSeed(s) {
  let x = s >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  rngState = (x ^ (x >>> 16)) >>> 0;
}
function rand() {
  rngState = (1664525 * rngState + 1013904223) >>> 0;
  return rngState / 4294967296;
}
function randInt(n) {
  return (rand() * n) | 0;
}

// --- Waking ---
// Waking a cell marks its chunk (and any chunk within 1 cell) for the next
// tick, so influence can cross chunk borders. At most 4 chunks per call.
function wakeCell(x, y) {
  const cx0 = (x > 0 ? x - 1 : x) >> SHIFT;
  const cx1 = (x < W - 1 ? x + 1 : x) >> SHIFT;
  const cy0 = (y > 0 ? y - 1 : y) >> SHIFT;
  const cy1 = (y < H - 1 ? y + 1 : y) >> SHIFT;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * CW + cx;
      activeNext[c] = 1;
      drawDirty[c] = 1;
    }
  }
}

// --- Water (monochromagic-10 rules, verbatim from evo-engine Phase 0) ---
// Priority chain per mono: fall straight down (forget direction); else try
// ONLY the current direction's diagonal; else slide purely sideways in that
// direction; else flip direction, which costs the whole tick. Direction
// persistence is what makes water stream and slosh instead of dithering.
function updateWater(x, y, i) {
  if (lastMoved[i] === ticks) return; // already acted this tick
  const hasBelow = y + 1 < H;
  const b = i + W;

  if (hasBelow && type[b] === EMPTY) {
    type[b] = WATER;
    type[i] = EMPTY;
    flow[b] = 0; // mono: falling straight down resets direction
    flow[i] = 0;
    lastMoved[b] = ticks;
    wakeCell(x, y);
    wakeCell(x, y + 1);
    return;
  }

  let dir = flow[i];
  if (dir === 0) {
    dir = 1 + randInt(2);
    flow[i] = dir;
  }
  const step = dir === 1 ? -1 : 1;
  const nx = x + step;

  if (nx >= 0 && nx < W) {
    if (hasBelow && type[b + step] === EMPTY) {
      const j = b + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir; // diagonal fall keeps direction
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y + 1);
      return;
    }
    if (type[i + step] === EMPTY) {
      const j = i + step;
      type[j] = WATER;
      type[i] = EMPTY;
      flow[j] = dir;
      flow[i] = 0;
      lastMoved[j] = ticks;
      wakeCell(x, y);
      wakeCell(nx, y);
      return;
    }
  }

  flow[i] = 3 - dir; // blocked: switch direction, no move this tick (mono)
}

// --- Soil (classic sand, verbatim from evo-engine Phase 0) ---
// Falls into empty space; sinks through water by swapping (the displaced
// water rises), at half speed so it reads as heavier-than-liquid; slides
// down diagonals; never slides purely sideways, so it piles into slopes.
// A failed sink roll wakes its own cell — intent to move must keep the
// chunk awake, or the grain would freeze mid-water when the chunk sleeps.
// PLANT and DEAD are static solids to soil: grains pile ON plant lattices,
// which is what makes perched dunes possible.
function updateSoil(x, y, i) {
  if (lastMoved[i] === ticks) return;
  if (y + 1 >= H) return;
  const b = i + W;
  const tb = type[b];

  if (tb === EMPTY) {
    type[b] = SOIL;
    type[i] = EMPTY;
    lastMoved[b] = ticks;
    wakeCell(x, y);
    wakeCell(x, y + 1);
    return;
  }
  if (tb === WATER) {
    if (rand() < 0.5) {
      type[b] = SOIL;
      type[i] = WATER;
      flow[i] = 0;
      lastMoved[b] = ticks;
      lastMoved[i] = ticks;
      wakeCell(x, y);
      wakeCell(x, y + 1);
    } else {
      wakeCell(x, y); // still wants to sink: stay awake for next tick
    }
    return;
  }

  // Fast path: settled soil (solid below, solid diagonals) exits with no
  // rand() — awake chunks are dense with settled grains, so this dominates.
  const canL = x > 0 && (type[b - 1] === EMPTY || type[b - 1] === WATER);
  const canR = x < W - 1 && (type[b + 1] === EMPTY || type[b + 1] === WATER);
  if (!canL && !canR) return;

  const s = canL && canR ? (rand() < 0.5 ? -1 : 1) : canL ? -1 : 1;
  const j = b + s;
  if (type[j] === EMPTY) {
    type[j] = SOIL;
    type[i] = EMPTY;
    lastMoved[j] = ticks;
    wakeCell(x, y);
    wakeCell(x + s, y + 1);
    return;
  }
  if (rand() < 0.5) {
    type[j] = SOIL;
    type[i] = WATER;
    flow[i] = 0;
    lastMoved[j] = ticks;
    lastMoved[i] = ticks;
    wakeCell(x, y);
    wakeCell(x + s, y + 1);
  } else {
    wakeCell(x, y);
  }
}

// ==================== The plant rules (G, L, S, F, R) ====================
//
// Neighborhood conventions: out-of-bounds counts as solid (the world border
// is bedrock — it supports, and it does not breathe). L/G/S/R read the 4
// cardinal neighbors; F reads all 8.

// F support check: any solid (SOIL/PLANT/DEAD) among the 8 neighbors.
function supported(x, y, i) {
  if (x === 0 || x === W - 1 || y === 0 || y === H - 1) return true;
  for (let dy = -W; dy <= W; dy += W) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = type[i + dy + dx];
      if (t === SOIL || t === PLANT || t === DEAD) return true;
    }
  }
  return false;
}

const drinkCand = new Int32Array(4); // scratch for rule G target selection

// PLANT tile: L (suffocate), else F (crumble), else G (drink).
function updatePlant(x, y, i) {
  if (lastMoved[i] === ticks) return; // grew into existence this tick
  const up = y > 0 ? type[i - W] : SOIL;
  const dn = y < H - 1 ? type[i + W] : SOIL;
  const lf = x > 0 ? type[i - 1] : SOIL;
  const rt = x < W - 1 ? type[i + 1] : SOIL;

  // L — Suffocate: no air and no water on any cardinal side. Water counts
  // as breathable, so submerged plants live (seaweed) and only fully
  // solid-encased cells die — burial kills, dense cores lace themselves.
  const breathes =
    up === EMPTY || up === WATER ||
    dn === EMPTY || dn === WATER ||
    lf === EMPTY || lf === WATER ||
    rt === EMPTY || rt === WATER;
  if (!breathes) {
    type[i] = DEAD;
    tally[PLANT]--;
    tally[DEAD]++;
    suffocated++;
    wakeCell(x, y);
    return;
  }

  // F — Crumble: nothing solid anywhere around → become a falling grain.
  if (!supported(x, y, i)) {
    type[i] = SOIL;
    tally[PLANT]--;
    tally[SOIL]++;
    crumbled++;
    wakeCell(x, y);
    return;
  }

  // G — Drink: convert one random cardinal water neighbor. A failed roll
  // still wakes the cell (like soil's failed sink) — intent to drink must
  // keep the chunk awake, so growth self-sustains until local water is gone.
  let n = 0;
  if (up === WATER) drinkCand[n++] = i - W;
  if (dn === WATER) drinkCand[n++] = i + W;
  if (lf === WATER) drinkCand[n++] = i - 1;
  if (rt === WATER) drinkCand[n++] = i + 1;
  if (n === 0) return; // nothing to drink: this tile may sleep
  if (rand() >= P_GROW) {
    wakeCell(x, y);
    return;
  }
  const j = n === 1 ? drinkCand[0] : drinkCand[randInt(n)];
  type[j] = PLANT;
  flow[j] = 0;
  lastMoved[j] = ticks; // newborn tile acts no earlier than next tick
  tally[WATER]--;
  tally[PLANT]++;
  grown++;
  wakeCell(x, y);
  wakeCell(j % W, (j / W) | 0);
}

// DEAD tile: F (crumble), else R (rot near water). A failed rot roll does
// NOT self-wake — skeletons erode only while water is moving against them,
// so a settled shoreline skeleton costs nothing until the next disturbance.
function updateDead(x, y, i) {
  if (!supported(x, y, i)) {
    type[i] = SOIL;
    tally[DEAD]--;
    tally[SOIL]++;
    crumbled++;
    wakeCell(x, y);
    return;
  }
  const wet =
    (y > 0 && type[i - W] === WATER) ||
    (y < H - 1 && type[i + W] === WATER) ||
    (x > 0 && type[i - 1] === WATER) ||
    (x < W - 1 && type[i + 1] === WATER);
  if (wet && rand() < P_ROT) {
    type[i] = SOIL;
    tally[DEAD]--;
    tally[SOIL]++;
    rotted++;
    wakeCell(x, y);
  }
}

// S — Sprout: settled wet soil that also touches air becomes a plant,
// rarely. Runs only on soil that didn't move this tick, only in awake
// chunks, and a failed roll does NOT self-wake — genesis rides on other
// disturbances (rain, flow), never keeps a shoreline awake by itself.
function trySprout(x, y, i) {
  const up = y > 0 ? type[i - W] : SOIL;
  const dn = y < H - 1 ? type[i + W] : SOIL;
  const lf = x > 0 ? type[i - 1] : SOIL;
  const rt = x < W - 1 ? type[i + 1] : SOIL;
  const wet = up === WATER || dn === WATER || lf === WATER || rt === WATER;
  if (!wet) return;
  const aired = up === EMPTY || dn === EMPTY || lf === EMPTY || rt === EMPTY;
  if (!aired) return;
  if (rand() >= P_SPROUT) return;
  type[i] = PLANT;
  tally[SOIL]--;
  tally[PLANT]++;
  sprouted++;
  wakeCell(x, y);
}

function rain() {
  for (let k = 0; k < RAIN_RATE; k++) {
    const x = randInt(W);
    const i = 2 * W + x;
    if (type[i] === EMPTY) {
      type[i] = WATER;
      tally[WATER]++;
      totalRained++;
      wakeCell(x, 2);
    }
  }
}

// --- Tick ---
// Rows are processed globally bottom-up (so a cell falls at most once per
// tick), but within each row only the segments belonging to active chunks
// are touched. X direction serpentines by tick parity to avoid drift bias.
function tick() {
  ticks++; // increment first so the tick stamp is never 0
  const tmp = activeNow;
  activeNow = activeNext;
  activeNext = tmp;
  activeNext.fill(0);

  if (raining) rain();
  parity ^= 1;

  for (let y = H - 1; y >= 0; y--) {
    const cRow = (y >> SHIFT) * CW;
    const rowBase = y * W;
    if (parity === 0) {
      for (let cx = 0; cx < CW; cx++) {
        if (!activeNow[cRow + cx]) continue;
        const x1 = (cx << SHIFT) + CHUNK;
        for (let x = cx << SHIFT; x < x1; x++) {
          const i = rowBase + x;
          const t = type[i];
          if (t === WATER) updateWater(x, y, i);
          else if (t === SOIL) {
            updateSoil(x, y, i);
            if (type[i] === SOIL && lastMoved[i] !== ticks) trySprout(x, y, i);
          } else if (t === PLANT) updatePlant(x, y, i);
          else if (t === DEAD) updateDead(x, y, i);
        }
      }
    } else {
      for (let cx = CW - 1; cx >= 0; cx--) {
        if (!activeNow[cRow + cx]) continue;
        const x0 = cx << SHIFT;
        for (let x = x0 + CHUNK - 1; x >= x0; x--) {
          const i = rowBase + x;
          const t = type[i];
          if (t === WATER) updateWater(x, y, i);
          else if (t === SOIL) {
            updateSoil(x, y, i);
            if (type[i] === SOIL && lastMoved[i] !== ticks) trySprout(x, y, i);
          } else if (t === PLANT) updatePlant(x, y, i);
          else if (t === DEAD) updateDead(x, y, i);
        }
      }
    }
  }
}

function countActive() {
  let c = 0;
  for (let k = 0; k < NC; k++) c += activeNext[k];
  return c;
}

function recountAll() {
  const counts = new Int32Array(5);
  for (let i = 0; i < N; i++) counts[type[i]]++;
  return counts;
}

// --- World gen: random-walk terrain with occasional cliffs ---
function initWorld() {
  let h = (H * 0.85) | 0;
  const hMin = (H * 0.7) | 0;
  const hMax = (H * 0.97) | 0;
  for (let x = 0; x < W; x++) {
    if (rand() < 0.01) h += randInt(21) - 10; // cliff
    const r = rand();
    if (r < 0.4) h--;
    else if (r > 0.6) h++;
    if (h < hMin) h = hMin;
    if (h > hMax) h = hMax;
    for (let y = h; y < H; y++) type[y * W + x] = SOIL;
  }
  for (let i = 0; i < N; i++) shade[i] = randInt(24);
  const counts = recountAll();
  tally.set(counts);
  drawDirty.fill(1);
}

// ==================== Headless acceptance (node matter-plants-1.js [seed] [ticks]) ====================
// Storms drive growth over a long run. Success criteria:
//   conserved — grid recount matches the running tally per type, AND total
//               non-air tiles === initial soil + total rained (every rule is
//               a 1:1 conversion, so this is exact, no tolerance);
//   sprouted / grew — genesis and drinking both actually fired;
//   pruned — rule L fired (dense cores self-prune: no runaway green fill);
//   bounded — living plant tiles stay a modest fraction of the world;
//   quiet — after a final settle, chunks awake and ms/tick are well under
//           the raining baseline (the world sleeps at rest).
function matterTest() {
  const seed = parseInt(process.argv[2] || "1337", 10);
  const TOTAL = parseInt(process.argv[3] || "30000", 10);
  setSeed(seed);
  console.log(
    `matter-plants Phase A acceptance — ${W}x${H}, seed ${seed}, ${TOTAL} ticks`
  );
  initWorld();
  const initialMatter = tally[SOIL];

  // Initial storm: pools form, shorelines wake, first sprouts appear.
  raining = true;
  const RAIN_TICKS = 300;
  let t0 = performance.now();
  for (let k = 0; k < RAIN_TICKS; k++) tick();
  const rainMs = (performance.now() - t0) / RAIN_TICKS;
  raining = false;
  for (let k = 0; k < 3000; k++) tick();
  console.log(
    `initial storm: ${totalRained} rained, ${sprouted} sprouts, ` +
      `${rainMs.toFixed(2)} ms/tick raining, ${countActive()}/${NC} awake after settle`
  );

  // Main run: a short storm at the top of every window, dry the rest.
  // Growth should happen during/after storms and go still between them.
  const WINDOW = 5000;
  const STORM = 200;
  let doneTotal = 0;
  while (doneTotal < TOTAL) {
    const n = Math.min(WINDOW, TOTAL - doneTotal);
    t0 = performance.now();
    for (let k = 0; k < n; k++) {
      raining = k < STORM;
      tick();
    }
    raining = false;
    const ms = (performance.now() - t0) / n;
    doneTotal += n;
    console.log(
      `t=${doneTotal}: soil ${tally[SOIL]} water ${tally[WATER]} ` +
        `plant ${tally[PLANT]} dead ${tally[DEAD]} | ` +
        `grown ${grown} sprouted ${sprouted} suffocated ${suffocated} ` +
        `crumbled ${crumbled} rotted ${rotted} | ` +
        `${countActive()}/${NC} awake, ${ms.toFixed(3)} ms/tick`
    );
  }

  // Final settle: no input, world should drink its reachable water and rest.
  for (let k = 0; k < 6000; k++) tick();
  const SAMPLE = 500;
  t0 = performance.now();
  for (let k = 0; k < SAMPLE; k++) tick();
  const steadyMs = (performance.now() - t0) / SAMPLE;
  const awake = countActive();

  // Conservation: exact, both per-type and in total.
  const rec = recountAll();
  const tallyOk =
    rec[SOIL] === tally[SOIL] &&
    rec[WATER] === tally[WATER] &&
    rec[PLANT] === tally[PLANT] &&
    rec[DEAD] === tally[DEAD];
  const totalNow = rec[SOIL] + rec[WATER] + rec[PLANT] + rec[DEAD];
  const totalOk = totalNow === initialMatter + totalRained;
  console.log(
    `ledger: recount soil ${rec[SOIL]} water ${rec[WATER]} plant ${rec[PLANT]} ` +
      `dead ${rec[DEAD]} vs tally ${tallyOk ? "OK" : "LEAK"} | ` +
      `total ${totalNow} = ${initialMatter} initial + ${totalRained} rained ${
        totalOk ? "OK" : "LEAK"
      }`
  );

  const didSprout = sprouted > 0;
  const didGrow = grown > 0;
  const pruned = suffocated > 0;
  const bounded = rec[PLANT] < N * 0.4;
  const quiet = awake < NC * 0.25 && steadyMs < rainMs * 0.75;
  console.log(
    `sprouted ${didSprout} (${sprouted}) | grew ${didGrow} (${grown}) | ` +
      `pruned ${pruned} (${suffocated} suffocations → no solid fill) | ` +
      `bounded ${bounded} (${rec[PLANT]} plant tiles) | quiet ${quiet} ` +
      `(${awake}/${NC} awake, ${steadyMs.toFixed(3)} vs rain ${rainMs.toFixed(2)} ms/tick)`
  );
  const ok = tallyOk && totalOk && didSprout && didGrow && pruned && bounded && quiet;
  console.log(ok ? "PASS: Phase A acceptance met" : "FAIL");
  process.exit(ok ? 0 : 1);
}

// ==================== Browser boot ====================
function boot() {
  const params = new URLSearchParams(window.location.search);
  setSeed(parseInt(params.get("seed") || "1337", 10) >>> 0);
  initWorld();
  const initialMatter = tally[SOIL];

  const app = new PIXI.Application({
    width: W,
    height: H,
    backgroundColor: 0x000000,
    antialias: false,
    autoStart: false,
  });
  document.getElementById("canvas-div").appendChild(app.view);
  app.view.style.imageRendering = "pixelated";

  const rgba = new Uint8Array(N * 4);
  const texture = PIXI.Texture.fromBuffer(rgba, W, H);
  app.stage.addChild(new PIXI.Sprite(texture));

  function paintChunk(c) {
    const x0 = (c % CW) << SHIFT;
    const y0 = ((c / CW) | 0) << SHIFT;
    for (let ly = 0; ly < CHUNK; ly++) {
      let i = (y0 + ly) * W + x0;
      let p = i * 4;
      for (let lx = 0; lx < CHUNK; lx++, i++, p += 4) {
        const t = type[i];
        const s = shade[i];
        if (t === SOIL) {
          rgba[p] = 84 + s;
          rgba[p + 1] = 60 + s;
          rgba[p + 2] = 38 + (s >> 1);
        } else if (t === WATER) {
          rgba[p] = 30;
          rgba[p + 1] = 90 + (s >> 1);
          rgba[p + 2] = 190 + s;
        } else if (t === PLANT) {
          rgba[p] = 36 + (s >> 1);
          rgba[p + 1] = 130 + s;
          rgba[p + 2] = 46 + (s >> 1);
        } else if (t === DEAD) {
          rgba[p] = 168 - s;
          rgba[p + 1] = 156 - s;
          rgba[p + 2] = 128 - s;
        } else {
          rgba[p] = 8;
          rgba[p + 1] = 9;
          rgba[p + 2] = 14;
        }
        rgba[p + 3] = 255;
      }
    }
  }

  function flushDraw() {
    let any = false;
    for (let c = 0; c < NC; c++) {
      if (drawDirty[c]) {
        paintChunk(c);
        drawDirty[c] = 0;
        any = true;
      }
    }
    if (any) texture.baseTexture.update();
  }

  // --- Fit canvas to window (CSS scale only; sim stays 1:1) ---
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    app.view.style.width = `${W * s}px`;
    app.view.style.height = `${H * s}px`;
  }
  fit();
  window.addEventListener("resize", fit);

  // --- Brushes ---
  let painting = false;
  let tool = WATER;
  const BRUSH = W >= 512 ? 4 : 2; // small worlds get a small brush
  function applyBrush(px, py) {
    const rect = app.view.getBoundingClientRect();
    const x = ((px - rect.left) / rect.width) * W;
    const y = ((py - rect.top) / rect.height) * H;
    for (let dy = -BRUSH; dy <= BRUSH; dy++) {
      for (let dx = -BRUSH; dx <= BRUSH; dx++) {
        if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
        const cx = (x + dx) | 0;
        const cy = (y + dy) | 0;
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        const i = cy * W + cx;
        const ti = type[i];
        if (tool === WATER && ti === EMPTY) {
          type[i] = WATER;
          tally[WATER]++;
          matterIn++;
        } else if (tool === SOIL && ti === EMPTY) {
          type[i] = SOIL; // only into empty: soil displaces water by sinking
          tally[SOIL]++;
          matterIn++;
        } else if (tool === PLANT && (ti === EMPTY || ti === WATER)) {
          // Painting into water is a hand-forced drink (conversion, not new
          // matter); painting into air is new matter. Lone tiles in open air
          // crumble by rule F — paint blobs or paint onto ground.
          if (ti === WATER) {
            tally[WATER]--;
            flow[i] = 0;
          } else {
            matterIn++;
          }
          type[i] = PLANT;
          tally[PLANT]++;
        } else if (tool === EMPTY && ti !== EMPTY) {
          type[i] = EMPTY;
          if (ti === WATER) flow[i] = 0;
          tally[ti]--;
          matterOut++;
        } else {
          continue;
        }
        wakeCell(cx, cy);
      }
    }
  }
  app.view.addEventListener("pointerdown", (e) => {
    painting = true;
    applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    if (painting) applyBrush(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", () => (painting = false));

  // --- Keys ---
  let paused = false;
  let ff = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "r") raining = !raining;
    if (e.key === "p") paused = !paused;
    if (e.key === "f") ff = !ff;
    if (e.key === "1") tool = WATER;
    if (e.key === "2") tool = SOIL;
    if (e.key === "3") tool = EMPTY;
    if (e.key === "4") tool = PLANT;
    if (e.key === " ") {
      if (paused) tick();
      e.preventDefault();
    }
    if (e.key === "c") {
      const rec = recountAll();
      const tallyOk =
        rec[SOIL] === tally[SOIL] &&
        rec[WATER] === tally[WATER] &&
        rec[PLANT] === tally[PLANT] &&
        rec[DEAD] === tally[DEAD];
      const totalNow = rec[SOIL] + rec[WATER] + rec[PLANT] + rec[DEAD];
      const expected = initialMatter + totalRained + matterIn - matterOut;
      console.log(
        `tick ${ticks} | recount s${rec[SOIL]} w${rec[WATER]} p${rec[PLANT]} ` +
          `d${rec[DEAD]} vs tally ${tallyOk ? "OK" : "LEAK"} | total ${totalNow} ` +
          `vs expected ${expected} — ${totalNow === expected ? "conserved" : "LEAK"}`
      );
    }
  });

  // --- Main loop ---
  const hud = document.getElementById("hud");
  let tickMs = 0;
  let frames = 0;
  let fps = 0;
  let fpsTime = performance.now();

  function frame() {
    if (!paused) {
      const n = ff ? FF_FACTOR : 1;
      const t0 = performance.now();
      for (let k = 0; k < n; k++) tick();
      tickMs = tickMs * 0.95 + ((performance.now() - t0) / n) * 0.05;
    }
    flushDraw();
    app.renderer.render(app.stage);

    frames++;
    const now = performance.now();
    if (now - fpsTime >= 1000) {
      fps = frames;
      frames = 0;
      fpsTime = now;
      const toolName =
        tool === WATER
          ? "water"
          : tool === SOIL
          ? "soil"
          : tool === PLANT
          ? "plant"
          : "erase";
      hud.textContent =
        `tick ${ticks} | ${fps} fps | ${tickMs.toFixed(2)} ms/tick | ` +
        `${countActive()}/${NC} chunks awake | ` +
        `soil ${tally[SOIL]} water ${tally[WATER]} ` +
        `plant ${tally[PLANT]} dead ${tally[DEAD]} | ` +
        `rain ${raining ? "ON" : "off"}${ff ? " | FF x" + FF_FACTOR : ""}${
          paused ? " | PAUSED" : ""
        }\n` +
        `[r]ain [p]ause [space]step [f]ast [c]onservation | ` +
        `brush: ${toolName} — [1]water [2]soil [3]erase [4]plant, drag to paint`;
    }
    requestAnimationFrame(frame);
  }
  frame();
}

if (typeof window === "undefined") {
  matterTest();
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
