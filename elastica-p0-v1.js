/* ===========================================================================
   elastica — PHASE 0
   lattice, graph, derived frames, recorded restDir, stochastic relaxation,
   renderer, draggable plant.

   Per HANDOFF-1 §8/§11: build Phase 0 and stop. No growth, no economy,
   no genome, no evolution, no seeds. One hand-built plant.

   Note on scope: §8 lists discomfort + the checkerboard sweep under Phase 1,
   but the Phase 0 visual check ("drag it and let go — does it spring back?")
   cannot be evaluated without relaxation dynamics, so the §3 motion machinery
   is here. What is genuinely still Phase 1: multiple plants, gap-width
   tuning against W_STRAIN/W_CROWD.

   Runs in browser (self-bootstraps a canvas) and in node (headless self-test).
   No floats in the simulation core. Integers only below the render layer.

   ---------------------------------------------------------------------------
   TWO FINDINGS FROM BUILDING THIS. Both belong in HANDOFF-2.

   1. The strain accounting in §3 is one level short, and it matters.
      strain(p -> c) reads three positions, not two: the rest direction is
      taken in the parent's frame and the parent's frame is derived from the
      GRANDPARENT. So a cell's position sets the strain of its own edge, its
      children's edges, AND its grandchildren's edges. Priced over only the
      first two, as "incident edges" implies, an isolated plant drifts off its
      remembered shape and stays there (measured: mean strain settles near 0.3
      with crowding switched off entirely; junction edges near 0.9). Counting
      three levels makes deltaD an exact difference of a global energy and the
      springback becomes real. Fixed here. See strainLoad().

   2. The "bending the base swings the whole top" claim is only half true,
      and this is the Phase 0 conversation.
      It is true that the base's frame change moves every descendant's rest
      target. It is not true that the body is driven into the rotated pose.
      The arm has a much cheaper option: one counter-kink at the next joint
      up, costing a single strain unit, versus rotating a dozen cells. The
      rotated pose IS the global minimum, but the path to it runs through
      iso-energetic states, so it is diffusive rather than driven. Cold enough
      to keep the plant quiet and it stays trapped in the kink; warm enough to
      escape and the tip's thermal wander grows as fast as the response.

      Numbers, 12 seeds, base held one step off, top's mean position measured
      against its own spread when nothing is held. Rigid rotation of this
      13-cell stem would move the top about 9 sites.
          defaults (soft .60, 4/3, maxStrain 2)   moves 2.7   spread 2.2
          colder  (soft .50)                      moves 2.7   spread 1.0
          warmer  (soft .70)                      moves 3.1   spread 3.3
          stiffer (8/6)                           moves 0.1   spread 0.3
          MAX_STRAIN 1                            moves 3.8   spread 1.4
      So the response is real, about a third of the geometric expectation,
      and never far clear of the noise. MAX_STRAIN 1 is the best corner and
      costs nothing — it is already a knob. Nothing else is built to address
      this; it is a design conversation, not a patch.
   --------------------------------------------------------------------------- */

'use strict';

/* --------------------------------------------------------------------------
   1. Directions — everything is integers mod 8
   0=N 1=NE 2=E 3=SE 4=S 5=SW 6=W 7=NW, clockwise, screen y grows downward.
-------------------------------------------------------------------------- */

const UNIT = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];

// DIR_OF[(dx+1)*3 + (dy+1)] -> direction index, or -1 if not a king step
const DIR_OF = new Int8Array(9).fill(-1);
for (let d = 0; d < 8; d++) DIR_OF[(UNIT[d][0] + 1) * 3 + (UNIT[d][1] + 1)] = d;

const CARDINALS = [0, 2, 4, 6];   // sweep directions
const ROOT_FRAME = 0;             // the root's frame is fixed; N
const BIG = 1 << 20;

/* --------------------------------------------------------------------------
   2. PRNG — xorshift32, seeded, deterministic
-------------------------------------------------------------------------- */

function makeRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s;
  };
}

/* --------------------------------------------------------------------------
   3. Defaults
-------------------------------------------------------------------------- */

const DEFAULTS = {
  GW: 40,            // lattice width
  GH: 30,            // lattice height
  W_STRAIN: 4,
  W_CROWD: 3,
  MAX_STRAIN: 2,     // hard rejection; this is what makes severance impossible
  SOFT: 2458         // temperature, as a decay ratio out of 4096 (2458 = 0.60)
};

const TEMP_LEN = 64;

// p(accept) out of 4096, indexed by clamped positive dD. Geometric, so it is
// monotone decreasing and never quite reaches zero — the body can always
// climb out of a local trap given time. Built with integer math only.
function makeTempTable(decay) {
  const t = new Int32Array(TEMP_LEN);
  t[0] = 4096;
  for (let i = 1; i < TEMP_LEN; i++) t[i] = (t[i - 1] * decay) >> 12;
  return t;
}

/* --------------------------------------------------------------------------
   4. World
-------------------------------------------------------------------------- */

class World {
  constructor(opts = {}) {
    const p = Object.assign({}, DEFAULTS, opts);
    this.GW = p.GW; this.GH = p.GH;
    this.W_STRAIN = p.W_STRAIN;
    this.W_CROWD = p.W_CROWD;
    this.MAX_STRAIN = p.MAX_STRAIN;
    this.setSoft(p.SOFT);
    this.seed = (p.seed >>> 0) || 1;
    this.rng = makeRng(this.seed);

    this.occ = new Int32Array(this.GW * this.GH);   // 0 = empty, else id+1

    const cap = 4096;
    this.cap = cap;
    this.cx = new Int16Array(cap);
    this.cy = new Int16Array(cap);
    this.par = new Int32Array(cap).fill(-1);
    this.rest = new Int8Array(cap);   // child's rest dir in the PARENT's frame
    this.plant = new Int32Array(cap);
    this.kids = [];
    this.moved = new Uint8Array(cap);
    this.n = 0;

    this.ticks = 0;
    this.pinned = -1;                 // cell held by the pointer, if any
  }

  /* ---- lattice ---- */
  inb(x, y) { return x >= 0 && y >= 0 && x < this.GW && y < this.GH; }
  at(x, y) { return this.occ[y * this.GW + x] - 1; }   // -1 if empty

  /* ---- graph ---- */

  addCell(x, y, parent, restDir, plantId) {
    const id = this.n++;
    this.cx[id] = x; this.cy[id] = y;
    this.par[id] = parent;
    this.rest[id] = restDir;
    this.plant[id] = plantId;
    this.kids[id] = [];
    if (parent >= 0) this.kids[parent].push(id);
    this.occ[y * this.GW + x] = id + 1;
    return id;
  }

  // A cell's frame is DERIVED from where it actually sits relative to its
  // parent. Never stored. This single line is why bending propagates.
  frame(c) {
    const p = this.par[c];
    if (p < 0) return ROOT_FRAME;
    const dx = this.cx[c] - this.cx[p], dy = this.cy[c] - this.cy[p];
    if (dx < -1 || dx > 1 || dy < -1 || dy > 1) return -1;
    return DIR_OF[(dx + 1) * 3 + (dy + 1)];
  }

  // Strain of the edge parent(c) -> c. -1 means the edge is invalid
  // (not a king step). Otherwise 0..4.
  edgeStrain(c) {
    const p = this.par[c];
    if (p < 0) return 0;
    const dx = this.cx[c] - this.cx[p], dy = this.cy[c] - this.cy[p];
    if (dx < -1 || dx > 1 || dy < -1 || dy > 1) return -1;
    const a = DIR_OF[(dx + 1) * 3 + (dy + 1)];
    if (a < 0) return -1;
    const f = this.frame(p);
    if (f < 0) return -1;
    const r = (f + this.rest[c]) & 7;
    const d = (a - r + 8) & 7;
    return d <= 4 ? d : 8 - d;
  }

  // Where the graph says c ought to be, given where its parent actually is.
  restSite(c) {
    const p = this.par[c];
    if (p < 0) return null;
    const f = this.frame(p);
    if (f < 0) return null;
    const d = (f + this.rest[c]) & 7;
    return [this.cx[p] + UNIT[d][0], this.cy[p] + UNIT[d][1]];
  }

  /* ---- discomfort (§3) ---- */

  // Occupied king-neighbours of c's current site that are NOT c's own
  // parent or children. Own graph-neighbours are supposed to touch; anything
  // else is crowding. Self-avoidance and inter-plant gaps both fall out here.
  foreign(c) {
    const x = this.cx[c], y = this.cy[c];
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + UNIT[k][0], ny = y + UNIT[k][1];
      if (!this.inb(nx, ny)) continue;
      const o = this.occ[ny * this.GW + nx] - 1;
      if (o < 0 || o === c) continue;
      if (this.par[c] === o || this.par[o] === c) continue;
      n++;
    }
    return n;
  }

  // The edges whose strain THIS cell's position determines.
  //
  // Deviation from HANDOFF-1 §3, deliberate and measured: the handoff says
  // "c's incident edges", i.e. the parent edge and the child edges. That is
  // one level short. strain(p -> c) reads three positions — grandparent,
  // parent, child — because the rest direction is taken in the parent's
  // frame and the parent's frame is derived from the grandparent. So moving
  // c also moves every GRANDCHILD's rest target.
  //
  // Left out, those grandchild edges are free to accumulate strain that no
  // move ever prices, and an isolated plant drifts off its remembered shape
  // and stays there (measured: mean strain settles near 0.3 with crowding
  // switched off entirely, junction edges near 0.9 — the springback is
  // visibly wrong). Counting all three levels makes deltaD an exact
  // difference of a global strain energy, so descent is real.
  //
  // Still local, still three levels, still no stored global rest pose:
  // great-grandchildren and above are genuinely unaffected.
  strainLoad(c) {
    let s = this.edgeStrain(c);
    if (s < 0) return BIG;
    const ks = this.kids[c];
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      const e = this.edgeStrain(k);
      if (e < 0) return BIG;
      s += e;
      const gs = this.kids[k];
      for (let j = 0; j < gs.length; j++) {
        const e2 = this.edgeStrain(gs[j]);
        if (e2 < 0) return BIG;
        s += e2;
      }
    }
    return s;
  }

  discomfort(c) {
    return this.W_STRAIN * this.strainLoad(c) + this.W_CROWD * this.foreign(c);
  }

  // Every edge c can affect must remain a king step and within MAX_STRAIN.
  legal(c) {
    const s = this.edgeStrain(c);
    if (s < 0 || s > this.MAX_STRAIN) return false;
    const ks = this.kids[c];
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      const e = this.edgeStrain(k);
      if (e < 0 || e > this.MAX_STRAIN) return false;
      const gs = this.kids[k];
      for (let j = 0; j < gs.length; j++) {
        const e2 = this.edgeStrain(gs[j]);
        if (e2 < 0 || e2 > this.MAX_STRAIN) return false;
      }
    }
    return true;
  }

  /* ---- motion ---- */

  _place(c, x, y) {
    this.occ[this.cy[c] * this.GW + this.cx[c]] = 0;
    this.cx[c] = x; this.cy[c] = y;
    this.occ[y * this.GW + x] = c + 1;
  }

  // Apply c -> (tx,ty), swapping with the occupant if there is one.
  // Returns the partner id (or -1), or null if out of bounds.
  _apply(c, tx, ty) {
    const sx = this.cx[c], sy = this.cy[c];
    const d = this.at(tx, ty);
    this.occ[sy * this.GW + sx] = 0;
    this.cx[c] = tx; this.cy[c] = ty;
    this.occ[ty * this.GW + tx] = c + 1;
    if (d >= 0) {
      this.cx[d] = sx; this.cy[d] = sy;
      this.occ[sy * this.GW + sx] = d + 1;
    }
    return d;
  }

  _revert(c, d, sx, sy, tx, ty) {
    this.cx[c] = sx; this.cy[c] = sy;
    this.occ[sy * this.GW + sx] = c + 1;
    if (d >= 0) {
      this.cx[d] = tx; this.cy[d] = ty;
      this.occ[ty * this.GW + tx] = d + 1;
    } else {
      this.occ[ty * this.GW + tx] = 0;
    }
  }

  setSoft(decay) {
    this.SOFT = decay;
    this.temp = makeTempTable(decay);
  }

  accept(dD) {
    if (dD <= 0) return true;
    const i = dD < TEMP_LEN ? dD : TEMP_LEN - 1;
    return (this.rng() & 4095) < this.temp[i];
  }

  // Stochastic hill descent. Never a solver.
  tryMove(c, dx, dy, force) {
    const sx = this.cx[c], sy = this.cy[c];
    const tx = sx + dx, ty = sy + dy;
    if (!this.inb(tx, ty)) return false;

    const peek = this.at(tx, ty);
    if (peek >= 0 && this.moved[peek] && !force) return false;

    const before = this.discomfort(c) + (peek >= 0 ? this.discomfort(peek) : 0);
    const d = this._apply(c, tx, ty);

    if (!this.legal(c) || (d >= 0 && !this.legal(d))) {
      this._revert(c, d, sx, sy, tx, ty);
      return false;
    }
    if (!force) {
      const after = this.discomfort(c) + (d >= 0 ? this.discomfort(d) : 0);
      if (!this.accept(after - before)) {
        this._revert(c, d, sx, sy, tx, ty);
        return false;
      }
    }
    this.moved[c] = 1;
    if (d >= 0) this.moved[d] = 1;
    return true;
  }

  // One tick: 4 cardinal directions x 2 parities, with a per-tick `moved`
  // mask so no cell participates twice. The checkerboard is what lets
  // simultaneous local swaps on an exclusive lattice avoid conflicting.
  tick() {
    this.moved.fill(0, 0, this.n);

    // shuffle the 4 directions so the lattice has no standing bias
    const order = CARDINALS.slice();
    for (let i = 3; i > 0; i--) {
      const j = this.rng() % (i + 1);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }

    for (let oi = 0; oi < 4; oi++) {
      const dir = order[oi];
      const dx = UNIT[dir][0], dy = UNIT[dir][1];
      for (let parity = 0; parity < 2; parity++) {
        for (let c = 0; c < this.n; c++) {
          if (this.moved[c] || c === this.pinned) continue;
          if (((this.cx[c] + this.cy[c]) & 1) !== parity) continue;
          this.tryMove(c, dx, dy, false);
        }
      }
    }
    this.ticks++;
  }

  /* ---- invariants, live in the HUD ---- */

  audit() {
    let occCount = 0;
    for (let i = 0; i < this.occ.length; i++) if (this.occ[i] !== 0) occCount++;

    let total = 0, max = 0, edges = 0, broken = 0;
    for (let c = 0; c < this.n; c++) {
      if (this.par[c] < 0) continue;
      const s = this.edgeStrain(c);
      edges++;
      if (s < 0 || s > this.MAX_STRAIN) { broken++; continue; }
      total += s;
      if (s > max) max = s;
    }
    return {
      cells: this.n,
      occCount,
      occOk: occCount === this.n,
      edges,
      broken,
      strainOk: broken === 0,
      maxStrain: max,
      meanStrain: edges ? total / edges : 0
    };
  }
}

/* --------------------------------------------------------------------------
   5. The hand-built plant (§11: a stem with two side branches is enough)

   Cells are placed at the rest target implied by the parent's frame, and
   restDir is then recorded from WHERE THE CELL ACTUALLY LANDED (§4). In open
   space that equals the proposal; the code path is the real one regardless.
-------------------------------------------------------------------------- */

function growLimb(w, from, proposals, plantId) {
  let cur = from;
  for (let i = 0; i < proposals.length; i++) {
    const f = w.frame(cur);
    if (f < 0) break;
    const d = (f + proposals[i]) & 7;
    const nx = w.cx[cur] + UNIT[d][0], ny = w.cy[cur] + UNIT[d][1];
    if (!w.inb(nx, ny) || w.at(nx, ny) >= 0) break;
    const actual = DIR_OF[(nx - w.cx[cur] + 1) * 3 + (ny - w.cy[cur] + 1)];
    cur = w.addCell(nx, ny, cur, (actual - f + 8) & 7, plantId);
  }
  return cur;
}

function buildTestPlant(w, rootX, rootY, plantId = 0) {
  const root = w.addCell(rootX, rootY, -1, 0, plantId);

  // main stem, straight up in its own frame
  const stem = [root];
  let cur = root;
  for (let i = 0; i < 13; i++) {
    cur = growLimb(w, cur, [0], plantId);
    stem.push(cur);
  }

  // two side branches, out at 90 degrees then curling up. The curl comes from
  // each cell's rest dir being read in its own frame, so it accumulates.
  growLimb(w, stem[4], [2, 1, 0, 1, 0, 0], plantId);
  growLimb(w, stem[9], [6, 7, 0, 7, 0, 0], plantId);

  return root;
}

/* --------------------------------------------------------------------------
   6. Browser
-------------------------------------------------------------------------- */

function boot() {
  const params = new URLSearchParams(location.search);
  const seed = parseInt(params.get('seed') || '', 10) || 20260726;

  /* palette — a specimen under low light. Warm graphite ground, bone-pale
     bodies, and the one loud thing in the design is the strain ramp on the
     edges: you are looking at how far the body is from what it remembers. */
  const C = {
    ground:  '#181b18',
    lattice: '#23271f',
    bone:    '#d8dccb',
    root:    '#8fa07d',
    ghost:   '#5c7183',
    // strain 0..4 — the one loud thing on screen
    strain:  ['#7d9a6a', '#cfa94f', '#c0703c', '#a8452f', '#8c2f22'],
    hud:     '#7f887a',
    hudHi:   '#d0b878'
  };

  document.title = 'elastica — phase 0';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}
    html,body{margin:0;height:100%;background:${C.ground};overscroll-behavior:none}
    body{display:flex;flex-direction:column;
         font:400 11px/1.5 ui-monospace,"SF Mono",Menlo,Consolas,monospace;
         color:${C.hud};-webkit-user-select:none;user-select:none}
    #stage{flex:1;position:relative;min-height:0;touch-action:none}
    canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    #hud{position:absolute;top:10px;left:12px;pointer-events:none;
         letter-spacing:.04em;white-space:pre;text-shadow:0 1px 2px #0007}
    #hud b{font-weight:400;color:${C.hudHi}}
    #hud .bad{color:#c0703c}
    #title{position:absolute;bottom:10px;left:12px;pointer-events:none;
           letter-spacing:.22em;text-transform:uppercase;opacity:.45}
    #bar{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;
         border-top:1px solid #262a24;background:#141713}
    button{font:inherit;letter-spacing:.06em;color:${C.hud};
           background:#1e221c;border:1px solid #2c3128;border-radius:2px;
           padding:6px 9px;cursor:pointer;min-width:30px}
    button:hover{color:${C.bone};border-color:#3d4437}
    button:focus-visible{outline:2px solid ${C.hudHi};outline-offset:1px}
    .grp{display:flex;align-items:center;gap:4px;
         padding-right:8px;margin-right:2px;border-right:1px solid #262a24}
    .grp span{opacity:.7}
  `;
  document.head.appendChild(style);

  const stage = document.createElement('div'); stage.id = 'stage';
  const cv = document.createElement('canvas');
  const hud = document.createElement('div'); hud.id = 'hud';
  const title = document.createElement('div'); title.id = 'title';
  title.textContent = 'elastica · phase 0 · drag a cell, then let go';
  stage.append(cv, hud, title);
  const bar = document.createElement('div'); bar.id = 'bar';
  document.body.append(stage, bar);

  const w = new World({ seed });
  buildTestPlant(w, (w.GW >> 1), w.GH - 6);

  let paused = false, ghosts = true, speed = 1;

  // the highest cell, and where it sat when the plant was built — the sway
  // readout is the number the Phase 0 conversation is actually about
  let swayCell = 0, swayX = 0, swayY = 0;
  function markSway() {
    swayCell = 0;
    for (let c = 0; c < w.n; c++) if (w.cy[c] < w.cy[swayCell]) swayCell = c;
    swayX = w.cx[swayCell]; swayY = w.cy[swayCell];
  }
  markSway();

  /* ---- controls ---- */
  function group(label, minus, plus, read) {
    const g = document.createElement('div'); g.className = 'grp';
    const s = document.createElement('span');
    const b1 = document.createElement('button'); b1.textContent = '\u2212';
    const b2 = document.createElement('button'); b2.textContent = '+';
    b1.setAttribute('aria-label', 'decrease ' + label);
    b2.setAttribute('aria-label', 'increase ' + label);
    b1.onclick = () => { minus(); sync(); };
    b2.onclick = () => { plus(); sync(); };
    g.append(s, b1, b2);
    bar.append(g);
    return () => { s.textContent = label + ' ' + read(); };
  }
  const syncs = [];
  syncs.push(group('strain', () => w.W_STRAIN = Math.max(0, w.W_STRAIN - 1),
                             () => w.W_STRAIN++, () => w.W_STRAIN));
  syncs.push(group('crowd',  () => w.W_CROWD = Math.max(0, w.W_CROWD - 1),
                             () => w.W_CROWD++, () => w.W_CROWD));
  syncs.push(group('soft',   () => w.setSoft(Math.max(410, w.SOFT - 205)),
                             () => w.setSoft(Math.min(3891, w.SOFT + 205)),
                             () => (w.SOFT / 4096).toFixed(2)));
  syncs.push(group('maxstr', () => w.MAX_STRAIN = Math.max(1, w.MAX_STRAIN - 1),
                             () => w.MAX_STRAIN = Math.min(4, w.MAX_STRAIN + 1),
                             () => w.MAX_STRAIN));
  syncs.push(group('speed',  () => speed = Math.max(0, speed - 1),
                             () => speed = Math.min(20, speed + 1), () => speed));

  function btn(label, fn) {
    const b = document.createElement('button');
    b.textContent = label; b.onclick = () => { fn(); sync(); };
    bar.append(b); return b;
  }
  const bPause = btn('pause', () => paused = !paused);
  const bGhost = btn('rest shape', () => ghosts = !ghosts);
  btn('reset', reset);

  function sync() {
    for (const f of syncs) f();
    bPause.textContent = paused ? 'run' : 'pause';
    bGhost.style.color = ghosts ? C.bone : C.hud;
  }

  function reset() {
    const nw = new World({ seed });
    buildTestPlant(nw, (nw.GW >> 1), nw.GH - 6);
    nw.W_STRAIN = w.W_STRAIN; nw.W_CROWD = w.W_CROWD;
    nw.MAX_STRAIN = w.MAX_STRAIN; nw.setSoft(w.SOFT);
    Object.assign(w, nw);
    markSway();
  }

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === ' ') { paused = !paused; e.preventDefault(); }
    else if (k === 'g') ghosts = !ghosts;
    else if (k === 'r') reset();
    else if (k === '[') w.W_STRAIN = Math.max(0, w.W_STRAIN - 1);
    else if (k === ']') w.W_STRAIN++;
    else if (k === '-') w.W_CROWD = Math.max(0, w.W_CROWD - 1);
    else if (k === '=') w.W_CROWD++;
    else return;
    sync();
  });

  /* ---- geometry ---- */
  let cs = 8, ox = 0, oy = 0, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    cs = Math.max(3, Math.floor(Math.min(r.width / w.GW, r.height / w.GH)));
    ox = Math.round((r.width - cs * w.GW) / 2);
    oy = Math.round((r.height - cs * w.GH) / 2);
  }
  addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(stage);
  const px = gx => ox + gx * cs + cs / 2;
  const py = gy => oy + gy * cs + cs / 2;

  /* ---- pointer: displace cells directly ---- */
  let target = null;
  function siteFromEvent(e) {
    const r = stage.getBoundingClientRect();
    return [Math.round((e.clientX - r.left - ox - cs / 2) / cs),
            Math.round((e.clientY - r.top - oy - cs / 2) / cs)];
  }
  stage.addEventListener('pointerdown', e => {
    const [gx, gy] = siteFromEvent(e);
    let best = -1, bd = 9;
    for (let c = 0; c < w.n; c++) {
      const d = Math.max(Math.abs(w.cx[c] - gx), Math.abs(w.cy[c] - gy));
      if (d < bd) { bd = d; best = c; }
    }
    if (best >= 0 && bd <= 3) {
      w.pinned = best; target = [gx, gy];
      stage.setPointerCapture(e.pointerId);
    }
  });
  stage.addEventListener('pointermove', e => {
    if (w.pinned >= 0) target = siteFromEvent(e);
  });
  const drop = () => { w.pinned = -1; target = null; };
  stage.addEventListener('pointerup', drop);
  stage.addEventListener('pointercancel', drop);

  function dragStep() {
    const c = w.pinned;
    if (c < 0 || !target) return;
    for (let i = 0; i < 2; i++) {
      const dx = Math.sign(target[0] - w.cx[c]);
      const dy = Math.sign(target[1] - w.cy[c]);
      if (!dx && !dy) return;
      // king step first; fall back to the components if the diagonal is illegal
      if (w.tryMove(c, dx, dy, true)) continue;
      if (dx && w.tryMove(c, dx, 0, true)) continue;
      if (dy && w.tryMove(c, 0, dy, true)) continue;
      return;
    }
  }

  /* ---- render ---- */
  const g = cv.getContext('2d');
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rw = cv.width / dpr, rh = cv.height / dpr;
    g.fillStyle = C.ground; g.fillRect(0, 0, rw, rh);

    // lattice
    g.fillStyle = C.lattice;
    const dot = Math.max(1, Math.round(cs / 9));
    for (let y = 0; y < w.GH; y++)
      for (let x = 0; x < w.GW; x++)
        g.fillRect(px(x) - dot / 2, py(y) - dot / 2, dot, dot);

    // the remembered shape: where each child's edge says it belongs
    if (ghosts) {
      g.strokeStyle = C.ghost; g.lineWidth = 1; g.globalAlpha = 0.55;
      for (let c = 0; c < w.n; c++) {
        const r = w.restSite(c);
        if (!r) continue;
        if (r[0] === w.cx[c] && r[1] === w.cy[c]) continue;
        g.beginPath();
        g.arc(px(r[0]), py(r[1]), cs * 0.30, 0, 6.2832);
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    // edges, coloured by strain
    g.lineCap = 'round';
    g.lineWidth = Math.max(1, cs * 0.30);
    for (let c = 0; c < w.n; c++) {
      const p = w.par[c];
      if (p < 0) continue;
      const s = w.edgeStrain(c);
      g.strokeStyle = C.strain[Math.max(0, Math.min(4, s))];
      g.beginPath();
      g.moveTo(px(w.cx[p]), py(w.cy[p]));
      g.lineTo(px(w.cx[c]), py(w.cy[c]));
      g.stroke();
    }

    // cells
    for (let c = 0; c < w.n; c++) {
      g.fillStyle = w.par[c] < 0 ? C.root : C.bone;
      g.beginPath();
      g.arc(px(w.cx[c]), py(w.cy[c]), cs * 0.26, 0, 6.2832);
      g.fill();
    }

    if (w.pinned >= 0) {
      g.strokeStyle = C.hudHi; g.lineWidth = 1.5;
      g.beginPath();
      g.arc(px(w.cx[w.pinned]), py(w.cy[w.pinned]), cs * 0.62, 0, 6.2832);
      g.stroke();
    }
  }

  function drawHud() {
    const a = w.audit();
    const ok = s => s ? '<b>\u2713</b>' : '<span class="bad">\u26a0</span>';
    hud.innerHTML =
      `tick   ${w.ticks}\n` +
      `cells  ${a.cells}   edges ${a.edges}\n` +
      `strain mean <b>${a.meanStrain.toFixed(2)}</b>  max ${a.maxStrain}\n` +
      `sway   ${Math.abs(w.cx[swayCell] - swayX) + Math.abs(w.cy[swayCell] - swayY)}\n` +
      `intact ${ok(a.strainOk)}   occupancy ${ok(a.occOk)}`;
  }

  function frame() {
    dragStep();
    if (!paused) for (let i = 0; i < speed; i++) w.tick();
    draw(); drawHud();
    requestAnimationFrame(frame);
  }

  resize(); sync(); frame();
}

/* --------------------------------------------------------------------------
   7. Node — headless self-test on the same core
-------------------------------------------------------------------------- */

function selfTest() {
  const w = new World({ seed: 20260726 });
  buildTestPlant(w, w.GW >> 1, w.GH - 6);
  const n0 = w.n;
  let fails = 0;
  const check = (name, cond, extra = '') => {
    if (!cond) fails++;
    console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : ''));
  };

  console.log('elastica phase 0 — headless self-test');
  console.log('built plant: ' + n0 + ' cells');

  let a = w.audit();
  check('starts at rest (mean strain 0)', a.meanStrain === 0);
  check('all edges intact', a.strainOk);

  let sum = 0;
  for (let i = 0; i < 3000; i++) { w.tick(); sum += w.audit().meanStrain; }
  const idle = sum / 3000;
  a = w.audit();
  check('cell count conserved', a.cells === n0, `${a.cells}/${n0}`);
  check('occupancy conserved', a.occOk, `${a.occCount} sites`);
  check('no edge past MAX_STRAIN', a.strainOk, `max ${a.maxStrain}`);
  check('isolated plant idles near its rest shape', idle < 0.35,
        'mean strain ' + idle.toFixed(3));
  check('but is not frozen solid', idle > 0.01,
        'mean strain ' + idle.toFixed(3));

  // Hold the base one step off, exactly as the pointer does, and watch the
  // top. There is no propagation pass: whatever the top does, it does because
  // the base's frame changed and moved every descendant's rest target.
  //
  // Mean displacement of the top under a held bend, against its own spread
  // when nothing is held. Finding 2 in the header: these come out roughly
  // equal, which is why this is reported rather than asserted.
  const arm = (seed, bend) => {
    const v = new World({ seed });
    buildTestPlant(v, v.GW >> 1, v.GH - 6);
    let top = 0;
    for (let c = 0; c < v.n; c++) if (v.cy[c] < v.cy[top]) top = c;
    const base = v.kids[0][0];
    if (bend) v.pinned = base;
    const goal = v.cx[base] + bend;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, ok = true;
    for (let i = 0; i < 3000; i++) {
      if (bend) {
        const dx = Math.sign(goal - v.cx[base]);
        if (dx) v.tryMove(base, dx, 0, true);
      }
      v.tick();
      const q = v.audit();
      if (!q.strainOk || !q.occOk) ok = false;
      if (i >= 1200) {
        n++; sx += v.cx[top]; sy += v.cy[top];
        sxx += v.cx[top] * v.cx[top]; syy += v.cy[top] * v.cy[top];
      }
    }
    return { x: sx / n, y: sy / n, ok,
             sd: Math.sqrt(Math.max(0, sxx / n - (sx / n) ** 2) +
                           Math.max(0, syy / n - (sy / n) ** 2)) };
  };

  let shift = 0, spread = 0, bendOk = true;
  for (let s = 1; s <= 4; s++) {
    const rest = arm(s, 0), bent = arm(s, 1);
    shift += Math.hypot(bent.x - rest.x, bent.y - rest.y);
    spread += (rest.sd + bent.sd) / 2;
    if (!rest.ok || !bent.ok) bendOk = false;
  }
  shift /= 4; spread /= 4;
  check('stays intact through a held bend', bendOk);
  console.log(`  OPEN   base bend moves the top ${shift.toFixed(1)} sites ` +
              `(rigid rotation would be ~9); idle spread ${spread.toFixed(1)}`);
  console.log('         see finding 2 in the header — wants a design call');

  // determinism
  const runHash = s => {
    const q = new World({ seed: s });
    buildTestPlant(q, q.GW >> 1, q.GH - 6);
    for (let i = 0; i < 500; i++) q.tick();
    let h = 0;
    for (let c = 0; c < q.n; c++) h = (h * 31 + q.cx[c] * 131 + q.cy[c]) | 0;
    return h;
  };
  check('deterministic for a given seed', runHash(7) === runHash(7));
  check('seed actually changes the run', runHash(7) !== runHash(8));

  console.log(fails ? `\n${fails} FAILED` : '\nall checks passed');
  return fails;
}

/* --------------------------------------------------------------------------
   8. Bootstrap
-------------------------------------------------------------------------- */

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();
} else if (typeof module !== 'undefined') {
  module.exports = { World, buildTestPlant, makeRng, UNIT, DIR_OF, selfTest };
  if (require.main === module) process.exit(selfTest() ? 1 : 0);
}
