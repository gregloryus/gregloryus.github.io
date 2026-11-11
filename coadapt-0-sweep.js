// coadapt-0-sweep.js — Stage 1 phase-diagram protocol per coadapt-stage1-spec.md §8.
// Usage:
//   node coadapt-0-sweep.js shard <i> <N>   run every (j % N === i)th run of the predeclared list
//   node coadapt-0-sweep.js aggregate       scan summaries -> coadapt-runs/aggregate.json + sweet spot
// Sweep world is 48x48 (spec default 96 is the showcase size; compute scales 4x down, D=16
// remains a near-global dispersal endpoint on a 48 torus).
'use strict';
const fs=require('fs'),path=require('path');
function loadCore(){
  const src=fs.readFileSync(path.join(__dirname,'coadapt-0.html'),'utf8');
  const m=src.match(/\/\/ ==== COADAPT CORE BEGIN ====([\s\S]*?)\/\/ ==== COADAPT CORE END ====/);
  const mod={exports:{}};
  new Function('module','exports',m[1])(mod,mod.exports);
  return mod.exports;
}
const CO=loadCore();
const ROOT=path.join(__dirname,'coadapt-runs');
const T=50000, W=48, H=48, SEEDS=[101,202,303];

function runList(){
  const runs=[];
  for(const s of [0.5,1,2,4,8])
    for(const D of [1,2,4,8,16])
      for(const mu of [0.002,0.01,0.05])
        for(const ws of SEEDS)
          runs.push({id:`s${s}-D${D}-mu${mu}-ws${ws}`,cfg:{worldSeed:ws,W,H,s,D,mu}});
  for(const ws of SEEDS){
    runs.push({id:`ctl-s0-ws${ws}`,cfg:{worldSeed:ws,W,H,s:0,D:4,mu:0.01}});
    runs.push({id:`ctl-self-ws${ws}`,cfg:{worldSeed:ws,W,H,s:4,D:4,mu:0.01,kernelMode:'self'}});
    runs.push({id:`ctl-single-ws${ws}`,cfg:{worldSeed:ws,W,H,s:4,D:4,mu:0.01,initMode:'single'}});
  }
  return runs;
}
function finalDump(sim){ // compact: enough to reseed assay arenas and render hue fields
  return {tick:sim.tick,W:sim.W,H:sim.H,
    cells:sim.individuals().map(o=>[o.y*sim.W+o.x,+o.hue.toFixed(6),o.tag])};
}
function doRun(run){
  const dir=path.join(ROOT,run.id);
  if(fs.existsSync(path.join(dir,'summary.json'))){ console.log('skip '+run.id); return; }
  fs.mkdirSync(dir,{recursive:true});
  const cfg=Object.assign(CO.defaults(),run.cfg);
  const sim=new CO.Sim(cfg);
  const t0=Date.now();
  const lines=[];
  for(let t=1;t<=T;t++){
    sim.step();
    if(t%1000===0) lines.push(JSON.stringify(CO.metricsOf(sim,t%5000===0)));
    if(sim.population()===0) break; // extinction is data
  }
  fs.writeFileSync(path.join(dir,'metrics.jsonl'),lines.join('\n')+'\n');
  fs.writeFileSync(path.join(dir,'final.json'),JSON.stringify(finalDump(sim)));
  const fin=CO.metricsOf(sim,true);
  const summary={id:run.id,cfg:run.cfg,T:sim.tick,extinct:sim.population()===0,
    final:fin,wallSec:(Date.now()-t0)/1000};
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,1));
  console.log(run.id+'  pop '+fin.pop+'  A '+fin.A.toFixed(3)+'  R2 '+fin.R2.toFixed(3)
    +'  localR2 '+(fin.localR2||0).toFixed(3)+'  phi '+fin.phi.toFixed(3)
    +'  '+summary.wallSec.toFixed(0)+'s');
}
function aggregate(){
  const runs=runList(), rows=[];
  for(const r of runs){
    const p=path.join(ROOT,r.id,'summary.json');
    if(!fs.existsSync(p)) continue;
    const row=JSON.parse(fs.readFileSync(p,'utf8'));
    // R1 post hoc from the final dump: R1~R2 = one cluster (coalesced monoculture);
    // R1<<R2 = genuine antipodal pair. Older summaries may predate R1 in metricsOf.
    const fp=path.join(ROOT,r.id,'final.json');
    if(row.final.R1===undefined&&fs.existsSync(fp)){
      const cells=JSON.parse(fs.readFileSync(fp,'utf8')).cells;
      row.final.R1=CO.resultant1(cells.map(c=>c[1]));
    }
    row.final.bimod=row.final.R2-(row.final.R1||0);
    rows.push(row);
  }
  // sweet spot: among anti-kernel sweep cells (s>0) with all seeds done and surviving,
  // maximize mean A; ties -> smaller D, then smaller s. Predeclared in spec §8/§9.
  const cells=new Map();
  for(const row of rows){
    if(row.id.startsWith('ctl-')) continue;
    const key=`s${row.cfg.s}-D${row.cfg.D}-mu${row.cfg.mu}`;
    let c=cells.get(key); if(!c){c={key,s:row.cfg.s,D:row.cfg.D,mu:row.cfg.mu,As:[],phis:[],bimods:[],extinct:0};cells.set(key,c);}
    c.As.push(row.final.A); c.phis.push(row.final.phi); c.bimods.push(row.final.bimod);
    if(row.extinct) c.extinct++;
  }
  let sweet=null;
  const cellRows=[];
  for(const c of cells.values()){
    const meanA=c.As.reduce((a,b)=>a+b,0)/c.As.length;
    const meanBimod=c.bimods.reduce((a,b)=>a+b,0)/c.bimods.length;
    // axis spread across seeds: mean pairwise axis distance (0.25 = uncorrelated axes = contingent)
    let ad=0,np=0;
    for(let i=0;i<c.phis.length;i++) for(let j=i+1;j<c.phis.length;j++){ ad+=CO.axisDist(c.phis[i],c.phis[j]); np++; }
    const axisSpread=np?ad/np:0;
    const complete=c.As.length===SEEDS.length&&!c.extinct;
    cellRows.push({...c,meanA,meanBimod,axisSpread,complete});
    // sweet spot: maximize mean A among complete cells WITH genuine pair structure
    // (meanBimod > 0.2 excludes coalesced monocultures where R1 ~ R2); predeclared.
    if(complete&&meanBimod>0.2&&(!sweet||meanA>sweet.meanA+1e-12||
       (Math.abs(meanA-sweet.meanA)<1e-12&&(c.D<sweet.D||(c.D===sweet.D&&c.s<sweet.s)))))
      sweet={...c,meanA,meanBimod,axisSpread};
  }
  const out={generated:new Date().toISOString(),done:rows.length,of:runs.length,
    sweetSpot:sweet?{s:sweet.s,D:sweet.D,mu:sweet.mu,meanA:sweet.meanA,meanBimod:sweet.meanBimod,axisSpread:sweet.axisSpread}:null,
    cells:cellRows.sort((a,b)=>b.meanA-a.meanA),
    controls:rows.filter(r=>r.id.startsWith('ctl-')).map(r=>({id:r.id,final:r.final,extinct:r.extinct}))};
  fs.mkdirSync(ROOT,{recursive:true});
  fs.writeFileSync(path.join(ROOT,'aggregate.json'),JSON.stringify(out,null,1));
  console.log('aggregated '+rows.length+'/'+runs.length+' runs');
  if(sweet) console.log('sweet spot: s='+sweet.s+' D='+sweet.D+' mu='+sweet.mu
    +'  meanA='+sweet.meanA.toFixed(3)+'  axisSpread='+sweet.axisSpread.toFixed(3));
}
function gallery(){ // self-contained HTML (file:// has no fetch), data baked in
  const agg=JSON.parse(fs.readFileSync(path.join(ROOT,'aggregate.json'),'utf8'));
  const finals={};
  for(const r of runList()){
    const p=path.join(ROOT,r.id,'final.json');
    if(!fs.existsSync(p)) continue;
    const d=JSON.parse(fs.readFileSync(p,'utf8'));
    finals[r.id]={W:d.W,H:d.H,cells:d.cells.map(c=>[c[0],+(+c[1]).toFixed(3)])};
  }
  const html=`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>coadapt-0 gallery</title>
<style>
  body{margin:0;background:#0a0a0c;color:#9a9aa0;font:12px/1.5 monospace;padding:12px}
  h2{color:#ccc;font-size:14px;margin:18px 0 6px}
  table{border-collapse:collapse;margin:4px 0}
  td,th{border:1px solid #222;padding:3px 7px;text-align:center}
  th{color:#777}
  #detail{margin-top:14px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
  canvas{image-rendering:pixelated;border:1px solid #222}
  .clickable{cursor:pointer}
  #note{color:#666;max-width:70em}
</style>
</head>
<body>
<h1 style="font-size:15px;color:#ddd">coadapt-0 — Stage 1 phase diagram</h1>
<div id="note">Cell = mean assortment A over 3 seeds (positive = complementarity organized
beyond the hue histogram; neutral kin baseline ≈ −0.02). Parenthesis = mean bimodality R2−R1
(&gt;0.2 = genuine antipodal pair, not coalesced monoculture). Click a cell or control to view
final hue fields — matched partners are literally complementary colors. Sweet spot outlined.</div>
<div id="tables"></div>
<div id="detail"></div>
<script>
const AGG=${JSON.stringify(agg)};
const FINALS=${JSON.stringify(finals)};
const S=[0.5,1,2,4,8],D=[1,2,4,8,16],MU=[0.002,0.01,0.05],SEEDS=[101,202,303];
const byKey=new Map(); for(const c of AGG.cells) byKey.set(c.key,c);
const sw=AGG.sweetSpot;
function color(a){
  if(a===undefined) return '#111';
  const t=Math.max(-1,Math.min(1,a/0.3));
  return t>=0?\`rgb(20,\${40+170*t},40)\`:\`rgb(30,40,\${60-120*t})\`;
}
let html='';
for(const mu of MU){
  html+='<h2>mu='+mu+'</h2><table><tr><th>s\\\\D</th>'+D.map(d=>'<th>'+d+'</th>').join('')+'</tr>';
  for(const s of S){
    html+='<tr><th>'+s+'</th>';
    for(const d of D){
      const c=byKey.get('s'+s+'-D'+d+'-mu'+mu);
      const isSweet=sw&&sw.s===s&&sw.D===d&&sw.mu===mu;
      html+='<td class="clickable" data-k="s'+s+'-D'+d+'-mu'+mu+'" style="background:'+color(c&&c.meanA)
        +(isSweet?';outline:2px solid #fff':'')+'">'
        +(c?c.meanA.toFixed(3)+'<br>('+c.meanBimod.toFixed(2)+')':'—')+'</td>';
    }
    html+='</tr>';
  }
  html+='</table>';
}
html+='<h2>controls</h2><table><tr><th>run</th><th>A</th><th>R2</th><th>R1</th><th>pop</th></tr>'
  +AGG.controls.map(c=>'<tr><td class="clickable" data-r="'+c.id+'">'+c.id+'</td><td>'+c.final.A.toFixed(3)
    +'</td><td>'+c.final.R2.toFixed(2)+'</td><td>'+(c.final.R1!==undefined?c.final.R1.toFixed(2):'?')
    +'</td><td>'+c.final.pop+'</td></tr>').join('')+'</table>';
document.getElementById('tables').innerHTML=html;
const detail=document.getElementById('detail');
function showRuns(ids){
  detail.innerHTML='';
  for(const id of ids){
    const d=FINALS[id]; if(!d) continue;
    const px=4,cv=document.createElement('canvas');
    cv.width=d.W*px; cv.height=d.H*px;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#0a0a0c'; ctx.fillRect(0,0,cv.width,cv.height);
    for(const [idx,hue] of d.cells){
      ctx.fillStyle='hsl('+(hue*360)+',80%,55%)';
      ctx.fillRect((idx%d.W)*px,Math.floor(idx/d.W)*px,px,px);
    }
    const wrap=document.createElement('div');
    const cap=document.createElement('div'); cap.textContent=id;
    wrap.appendChild(cap); wrap.appendChild(cv); detail.appendChild(wrap);
  }
}
document.body.addEventListener('click',e=>{
  const k=e.target.closest('[data-k]'),r=e.target.closest('[data-r]');
  if(k) showRuns(SEEDS.map(ws=>k.dataset.k+'-ws'+ws));
  if(r) showRuns([r.dataset.r]);
});
showRuns(sw?SEEDS.map(ws=>'s'+sw.s+'-D'+sw.D+'-mu'+sw.mu+'-ws'+ws):[]);
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(__dirname,'coadapt-0-gallery.html'),html);
  console.log('wrote coadapt-0-gallery.html ('+(html.length/1e6).toFixed(1)+' MB, self-contained)');
}
const mode=process.argv[2];
if(mode==='shard'){
  const i=+process.argv[3],N=+process.argv[4];
  const runs=runList().filter((_,j)=>j%N===i);
  console.log('shard '+i+'/'+N+': '+runs.length+' runs');
  for(const r of runs) doRun(r);
} else if(mode==='aggregate') aggregate();
else if(mode==='gallery') gallery();
else { console.log('usage: shard <i> <N> | aggregate | gallery'); process.exit(1); }
