// Godsroll EXPERIMENT harness: node godsroll-exp.js '<json overrides>' <label> [ticks] [worldSeed]
// Does NOT modify godsroll-1.html / godsroll-sweep.js / godsroll-smoke.js / godsroll-tests.js.
// Extracts the GODSROLL CORE source as a string, patches in two new laws via careful
// String.replace on distinctive snippets (asserting each match actually fired), evals the
// patched source, then runs the same metrics/PNG harness as godsroll-sweep.js.
//
// LAW 1 — terrainLaw: litter becomes real terrain. e(x,g) = floor((litter[g*C+x] -
//   globalMinLitter)/cfg.heightUnit). New plant's base cell gets z = e(rootX,rootG) instead
//   of z = 0 (clamped to the existing z<=S+g cap). Established plants do not move afterward;
//   everything else (projection, shading, halo, collisions) follows from z automatically
//   because scr()/occKey() already key off z.
//
// LAW 2 — fertilityLaw: establishment additionally requires litter[destination] >=
//   cfg.fertilityMin, but ONLY once sim.tick > 200 (world starts litter-zero, so the founder
//   and the opening wave are exempt by construction rather than by a special case).
//
// Both flags default OFF (0) so overrides must opt in explicitly.

const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const html = fs.readFileSync(path.join(__dirname, 'godsroll-1.html'), 'utf8');
const m = html.match(/\/\/ ==== GODSROLL CORE BEGIN ====([\s\S]*?)\/\/ ==== GODSROLL CORE END ====/);
if (!m) throw new Error('could not find GODSROLL CORE markers in godsroll-1.html');
let src = m[1];
const srcOrig = src;

function patch(label, oldStr, newStr) {
  if (src.indexOf(oldStr) === -1) throw new Error('PATCH FAILED (snippet not found): ' + label);
  const before = src;
  src = src.replace(oldStr, newStr);
  if (src === before) throw new Error('PATCH FAILED (no change): ' + label);
  console.error('patched: ' + label);
}

// ---- LAW 1: terrain-from-litter at establishment ----
patch('establish() base z = elevation',
`    this.addCell(p,'',seed.x,0,0,t); // base: elevation 0, facing up — first progress event`,
`    let __z0=0;
    if(this.cfg.terrainLaw){
      let __lo=Infinity; for(let __i=0;__i<this.litter.length;__i++) if(this.litter[__i]<__lo) __lo=this.litter[__i];
      if(__lo===Infinity) __lo=0;
      const __H=Math.max(1,this.cfg.heightUnit||4);
      __z0=Math.floor((this.litter[seed.g*this.C+seed.x]-__lo)/__H);
      const __cap=this.S+seed.g; if(__z0>__cap) __z0=__cap; if(__z0<0) __z0=0;
    }
    this.addCell(p,'',seed.x,__z0,0,t); // LAW1: base elevation from litter terrain, else 0`);

// ---- LAW 2: litter-fertility gate on establishment (exempt until tick>200) ----
patch('establishment fertility gate',
`      let ok=!this.occ.has(this.occKey(win.x,win.g,0));
      if(ok){ // lit-ground test (3×3 default / center-only toggle), wrap x, clip g
        const r=cfg.sprout3x3?1:0;
        outer: for(let dg=-r;dg<=r;dg++){ const gg=win.g+dg; if(gg<0||gg>=G) continue;
          for(let dx=-r;dx<=r;dx++){ const xx=(win.x+dx+C)%C, sc=xx+(S+gg)*C;
            if(this.frontG[sc]!==-1||this.litG[sc]>gg){ ok=false; break outer; } } }
      }`,
`      let ok=!this.occ.has(this.occKey(win.x,win.g,0));
      if(ok){ // lit-ground test (3×3 default / center-only toggle), wrap x, clip g
        const r=cfg.sprout3x3?1:0;
        outer: for(let dg=-r;dg<=r;dg++){ const gg=win.g+dg; if(gg<0||gg>=G) continue;
          for(let dx=-r;dx<=r;dx++){ const xx=(win.x+dx+C)%C, sc=xx+(S+gg)*C;
            if(this.frontG[sc]!==-1||this.litG[sc]>gg){ ok=false; break outer; } } }
      }
      // LAW2: fertility gate — seeds can only root where litter has accumulated, once the
      // world has had time to produce any (world starts litter-zero; exempt the opening wave).
      if(ok&&cfg.fertilityLaw&&t>cfg.fertilityGateTick&&this.litter[win.g*C+win.x]<cfg.fertilityMin) ok=false;`);

if (src === srcOrig) throw new Error('no patches applied — src unchanged');
console.error('core source patched OK, length ' + srcOrig.length + ' -> ' + src.length);

// inject defaults for the new config keys by wrapping defaults() after module load
const mod = { exports: {} };
new Function('module', src)(mod);
const GR = mod.exports;
const defaults0 = GR.defaults;
GR.defaults = function () {
  const d = defaults0();
  d.terrainLaw = 0; d.heightUnit = 4;
  d.fertilityLaw = 0; d.fertilityMin = 2; d.fertilityGateTick = 200;
  return d;
};

// sanity: determinism — no Math.random / Date usage in our injected code (by construction;
// both patches read only this.litter / this.cfg / this.occ / existing locals).

// ---------------- run harness (copied/adapted from godsroll-sweep.js) ----------------
const overrides = JSON.parse(process.argv[2] || '{}');
const label = (process.argv[3] || 'run').replace(/[^\w.-]/g, '_');
const TICKS = +process.argv[4] || 30000;
const cfg = GR.defaults(); Object.assign(cfg, overrides);
if (process.argv[5]) cfg.worldSeed = +process.argv[5];
const dims = GR.dimsFromViewport(390, 844, cfg.cellPx, cfg.skyFrac);
const { C, S, G } = dims, R = S + G, SCALE = 3;
fs.mkdirSync(path.join(__dirname, 'sweep'), { recursive: true });

function globalMinLitter(sim) {
  let lo = Infinity;
  for (let i = 0; i < sim.litter.length; i++) if (sim.litter[i] < lo) lo = sim.litter[i];
  return lo === Infinity ? 0 : lo;
}
function elevAt(sim, x, g, H, lo) {
  const v = sim.litter[g * sim.C + x];
  return Math.floor((v - lo) / H);
}
function maxElevation(sim) {
  if (!cfg.terrainLaw) return 0;
  const lo = globalMinLitter(sim), H = Math.max(1, cfg.heightUnit || 4);
  let mx = 0;
  for (let i = 0; i < sim.litter.length; i++) { const e = Math.floor((sim.litter[i] - lo) / H); if (e > mx) mx = e; }
  return mx;
}

function png(sim, name) {
  const W = C * SCALE, H = R * SCALE, rowBytes = W * 4, imgSize = rowBytes * H;
  const b = Buffer.alloc(54 + imgSize);
  b.write('BM', 0); b.writeUInt32LE(54 + imgSize, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(W, 18); b.writeInt32LE(-H, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(32, 28); b.writeUInt32LE(imgSize, 34);
  let lo = Infinity, hi = 0;
  for (const v of sim.litter) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const range = hi > lo ? hi - lo : 1;
  const terrainLo = cfg.terrainLaw ? globalMinLitter(sim) : 0;
  const terrainH = Math.max(1, cfg.heightUnit || 4);
  for (let row = 0; row < R; row++) for (let x = 0; x < C; x++) {
    let r = 0, g = 0, bl = 0;
    const i = row * C + x, fp = sim.frontP[i], fc = sim.frontC[i];
    if (fp) {
      const t = (G - 1 - fp.rootG) / Math.max(1, G - 1), L = (a, b2) => Math.round(a + (b2 - a) * t);
      if (GR.isTip(fp.layout.byPath.get(fc.path).node)) { r = L(235, 125); g = L(140, 95); bl = L(185, 125); }
      else { r = L(cfg.stemFrontR, cfg.stemBackR); g = L(cfg.stemFrontG, cfg.stemBackG); bl = L(cfg.stemFrontB, cfg.stemBackB); }
    } else if (row >= S) {
      if (cfg.terrainLaw) {
        // LAW1 render: discrete elevation steps, not normalized litter — each step visible
        const gg = row - S;
        const e = elevAt(sim, x, gg, terrainH, terrainLo);
        const br = Math.min(255, Math.max(0, e) * 36);
        r = Math.round(cfg.litterR / 255 * br); g = Math.round(cfg.litterG / 255 * br); bl = Math.round(cfg.litterB / 255 * br);
      } else {
        const v = sim.litter[(row - S) * C + x];
        const a = cfg.litterNorm ? Math.max(0, Math.min(1, (v - lo) / range)) : Math.min(1, v * cfg.litterAlpha);
        r = Math.round(cfg.litterR * a); g = Math.round(cfg.litterG * a); bl = Math.round(cfg.litterB * a);
      }
    } else bl = Math.round(255 * cfg.skyAlpha);
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const o = 54 + (row * SCALE + dy) * rowBytes + (x * SCALE + dx) * 4;
      b[o] = bl; b[o + 1] = g; b[o + 2] = r; b[o + 3] = 255;
    }
  }
  const f = path.join(__dirname, 'sweep', label + '-' + name);
  fs.writeFileSync(f + '.bmp', b);
  try { execSync(`sips -s format png "${f}.bmp" --out "${f}.png" >/dev/null 2>&1 && rm "${f}.bmp"`); } catch (e) {}
}

const sim = new GR.Sim(cfg, dims, {});
const deaths = {}; let births = 0, perTickDeaths = 0;
const kill0 = sim.kill.bind(sim);
sim.kill = (p, how, t) => { deaths[how] = (deaths[how] || 0) + 1; perTickDeaths++; kill0(p, how, t); };
const est0 = sim.establish.bind(sim);
sim.establish = (s, t) => { births++; est0(s, t); };

const series = [], deathHist = {};
let maxElevSeen = 0;
const t0 = Date.now();
for (let i = 1; i <= TICKS; i++) {
  perTickDeaths = 0;
  sim.step();
  deathHist[perTickDeaths] = (deathHist[perTickDeaths] || 0) + 1;
  if (sim.tick % 250 === 0) {
    const gset = new Map(); let cells = 0, planSum = 0, maxPlan = 0, hSum = 0;
    for (const p of sim.plants) {
      cells += p.cells.length; planSum += p.planSize; if (p.planSize > maxPlan) maxPlan = p.planSize;
      let mz = 0; for (const c of p.cells) if (c.z > mz) mz = c.z; hSum += mz;
      const k = GR.encodeBits(p.birthPlan); gset.set(k, (gset.get(k) || 0) + 1);
    }
    let dom = 0; for (const v of gset.values()) if (v > dom) dom = v;
    const n = sim.plants.length;
    const curMaxElev = maxElevation(sim);
    if (curMaxElev > maxElevSeen) maxElevSeen = curMaxElev;
    series.push({ t: sim.tick, plants: n, cells, seeds: sim.seeds.length, genomes: gset.size,
      domShare: n ? +(dom / n).toFixed(3) : 0, meanPlan: n ? +(planSum / n).toFixed(1) : 0, maxPlan,
      meanH: n ? +(hSum / n).toFixed(1) : 0, births, deaths: { ...deaths }, litter: sim.litterTotal(),
      maxElev: curMaxElev });
    for (const [id, r] of sim.records) if (r.fate === 'failed' || r.end) sim.records.delete(id);
  }
  if (sim.tick === Math.max(250, Math.floor(TICKS / 3))) png(sim, 'mid');
  if (sim.plants.length === 0 && sim.seeds.length === 0) { png(sim, 'extinct-t' + sim.tick); break; }
}
png(sim, 'end');
fs.writeFileSync(path.join(__dirname, 'sweep', label + '.json'),
  JSON.stringify({ overrides, worldSeed: cfg.worldSeed, dims, series, deathHist, maxElevSeen }, null, 1));

const last = series[series.length - 1] || {};
const tail = series.slice(Math.floor(series.length / 2));
const mean = tail.reduce((s, r) => s + r.plants, 0) / Math.max(1, tail.length);
const sd = Math.sqrt(tail.reduce((s, r) => s + (r.plants - mean) ** 2, 0) / Math.max(1, tail.length));
const maxAv = Math.max(...Object.keys(deathHist).map(Number));
console.log(`${label}: t${sim.tick} plants=${last.plants || 0} popCV=${(sd / Math.max(1, mean)).toFixed(3)} genomes=${last.genomes || 0} dom=${last.domShare || 0} meanPlan=${last.meanPlan || 0} meanH=${last.meanH || 0} maxDeathAvalanche=${maxAv} maxElevSeen=${maxElevSeen} deaths=${JSON.stringify(deaths)} ${Math.round((Date.now() - t0) / 1000)}s`);
