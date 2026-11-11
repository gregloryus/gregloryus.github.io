// coadapt-1-exp.js — Stage 2a N01 factorial: does geometry contribute to exchange ecology?
// Arms: bodyMode {tree, point} x emission {e0: keep2/emit0, e1: keep1/emit1, e15: keep0.5/emit1.5}.
// Predictions: cA>0 only when emit>0; tree arms should beat point arms on fluxShare if
// anatomy (boundary bandwidth) matters beyond mere adjacency; e0 arms are the neutral floor.
// Usage: node coadapt-1-exp.js shard <ws>   (one world seed's 6 arms)
//        node coadapt-1-exp.js report
'use strict';
const fs=require('fs'),path=require('path');
function loadCore(){
  const src=fs.readFileSync(path.join(__dirname,'coadapt-1.html'),'utf8');
  const m=src.match(/\/\/ ==== COADAPT1 CORE BEGIN ====([\s\S]*?)\/\/ ==== COADAPT1 CORE END ====/);
  const mod={exports:{}};
  new Function('module','exports',m[1])(mod,mod.exports);
  return mod.exports;
}
const C1=loadCore();
const ROOT=path.join(__dirname,'coadapt1-runs');
const T=30000,SEEDS=[1,2,3];
const ARMS=[
  {name:'tree-e0', cfg:{bodyMode:'tree', keep:2, emit:0 }},
  {name:'tree-e1', cfg:{bodyMode:'tree', keep:1, emit:1 }},
  {name:'tree-e15',cfg:{bodyMode:'tree', keep:0.5,emit:1.5}},
  {name:'point-e0', cfg:{bodyMode:'point',keep:2, emit:0 }},
  {name:'point-e1', cfg:{bodyMode:'point',keep:1, emit:1 }},
  {name:'point-e15',cfg:{bodyMode:'point',keep:0.5,emit:1.5}},
  // v2: per-cell intake cap (size matters) + lower density (seedCost 128)
  {name:'tree-v2',  cfg:{bodyMode:'tree', keep:0.5,emit:1.5,absorbCap:0.75,seedCost:128}},
  {name:'point-v2', cfg:{bodyMode:'point',keep:0.5,emit:1.5,absorbCap:0.75,seedCost:128}},
  {name:'tree-v2u', cfg:{bodyMode:'tree', keep:0.5,emit:1.5,seedCost:128}}, // uncapped control
  // v3: cap == emit — binds only multi-partner intake, single perfect interface unclipped
  {name:'tree-v3',  cfg:{bodyMode:'tree', keep:0.5,emit:1.5,absorbCap:1.5,seedCost:128}},
  {name:'point-v3', cfg:{bodyMode:'point',keep:0.5,emit:1.5,absorbCap:1.5,seedCost:128}},
];
function doRun(arm,ws){
  const id=arm.name+'-ws'+ws,dir=path.join(ROOT,id);
  if(fs.existsSync(path.join(dir,'summary.json'))){ console.log('skip '+id); return; }
  fs.mkdirSync(dir,{recursive:true});
  const cfg=Object.assign(C1.defaults(),arm.cfg,{worldSeed:ws});
  const sim=new C1.Sim(cfg);
  const t0=Date.now(),lines=[];
  for(let t=1;t<=T;t++){
    sim.step();
    if(t%500===0) lines.push(JSON.stringify(C1.metricsOf(sim)));
    if(sim.population()===0) break;
  }
  fs.writeFileSync(path.join(dir,'metrics.jsonl'),lines.join('\n')+'\n');
  // final body dump for rendering + assays: per org root/hue/tree/built cell idxs
  fs.writeFileSync(path.join(dir,'final.json'),JSON.stringify({tick:sim.tick,W:sim.W,H:sim.H,
    orgs:sim.orgs.map(o=>({hue:+o.hue.toFixed(4),tree:C1.encodeBits(o.tree),
      cells:[...o.built.values()]}))}));
  const fin=C1.metricsOf(sim);
  const summary={id,arm:arm.name,ws,T:sim.tick,extinct:sim.population()===0,final:fin,
    wallSec:(Date.now()-t0)/1000};
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,1));
  console.log(id+'  orgs '+fin.orgs+'  mean '+fin.meanCells.toFixed(1)+'  cA '+fin.cA.toFixed(3)
    +'  flux '+(100*fin.fluxShare).toFixed(1)+'%  R2 '+fin.R2.toFixed(2)+'  R1 '+fin.R1.toFixed(2)
    +'  '+summary.wallSec.toFixed(0)+'s');
}
const mode=process.argv[2];
if(mode==='shard'){
  const ws=+process.argv[3];
  for(const arm of ARMS) doRun(arm,ws);
} else if(mode==='report'){
  const rows=[];
  for(const arm of ARMS) for(const ws of SEEDS){
    const p=path.join(ROOT,arm.name+'-ws'+ws,'summary.json');
    if(fs.existsSync(p)) rows.push(JSON.parse(fs.readFileSync(p,'utf8')));
  }
  const byArm=new Map();
  for(const r of rows){
    let a=byArm.get(r.arm); if(!a){a={n:0,cA:0,flux:0,mean:0,R2:0,R1:0,orgs:0,ext:0};byArm.set(r.arm,a);}
    a.n++; a.cA+=r.final.cA; a.flux+=r.final.fluxShare; a.mean+=r.final.meanCells;
    a.R2+=r.final.R2; a.R1+=r.final.R1; a.orgs+=r.final.orgs; if(r.extinct)a.ext++;
  }
  console.log('arm         n  cA      flux%   meanCells orgs   R2    R1    extinct');
  for(const arm of ARMS){
    const a=byArm.get(arm.name); if(!a) continue;
    console.log(arm.name.padEnd(11),a.n,(a.cA/a.n).toFixed(3).padStart(7),
      (100*a.flux/a.n).toFixed(1).padStart(7),(a.mean/a.n).toFixed(1).padStart(9),
      String(Math.round(a.orgs/a.n)).padStart(5),(a.R2/a.n).toFixed(2).padStart(6),
      (a.R1/a.n).toFixed(2).padStart(6),a.ext);
  }
  fs.writeFileSync(path.join(ROOT,'factorial-report.json'),JSON.stringify(rows,null,1));
} else { console.log('usage: shard <ws> | report'); process.exit(1); }
