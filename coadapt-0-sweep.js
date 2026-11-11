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
    if(fs.existsSync(p)) rows.push(JSON.parse(fs.readFileSync(p,'utf8')));
  }
  // sweet spot: among anti-kernel sweep cells (s>0) with all seeds done and surviving,
  // maximize mean A; ties -> smaller D, then smaller s. Predeclared in spec §8/§9.
  const cells=new Map();
  for(const row of rows){
    if(row.id.startsWith('ctl-')) continue;
    const key=`s${row.cfg.s}-D${row.cfg.D}-mu${row.cfg.mu}`;
    let c=cells.get(key); if(!c){c={key,s:row.cfg.s,D:row.cfg.D,mu:row.cfg.mu,As:[],phis:[],extinct:0};cells.set(key,c);}
    c.As.push(row.final.A); c.phis.push(row.final.phi);
    if(row.extinct) c.extinct++;
  }
  let sweet=null;
  const cellRows=[];
  for(const c of cells.values()){
    const meanA=c.As.reduce((a,b)=>a+b,0)/c.As.length;
    // axis spread across seeds: mean pairwise axis distance (0.25 = uncorrelated axes = contingent)
    let ad=0,np=0;
    for(let i=0;i<c.phis.length;i++) for(let j=i+1;j<c.phis.length;j++){ ad+=CO.axisDist(c.phis[i],c.phis[j]); np++; }
    const axisSpread=np?ad/np:0;
    const complete=c.As.length===SEEDS.length&&!c.extinct;
    cellRows.push({...c,meanA,axisSpread,complete});
    if(complete&&(!sweet||meanA>sweet.meanA+1e-12||
       (Math.abs(meanA-sweet.meanA)<1e-12&&(c.D<sweet.D||(c.D===sweet.D&&c.s<sweet.s)))))
      sweet={...c,meanA,axisSpread};
  }
  const out={generated:new Date().toISOString(),done:rows.length,of:runs.length,
    sweetSpot:sweet?{s:sweet.s,D:sweet.D,mu:sweet.mu,meanA:sweet.meanA,axisSpread:sweet.axisSpread}:null,
    cells:cellRows.sort((a,b)=>b.meanA-a.meanA),
    controls:rows.filter(r=>r.id.startsWith('ctl-')).map(r=>({id:r.id,final:r.final,extinct:r.extinct}))};
  fs.mkdirSync(ROOT,{recursive:true});
  fs.writeFileSync(path.join(ROOT,'aggregate.json'),JSON.stringify(out,null,1));
  console.log('aggregated '+rows.length+'/'+runs.length+' runs');
  if(sweet) console.log('sweet spot: s='+sweet.s+' D='+sweet.D+' mu='+sweet.mu
    +'  meanA='+sweet.meanA.toFixed(3)+'  axisSpread='+sweet.axisSpread.toFixed(3));
}
const mode=process.argv[2];
if(mode==='shard'){
  const i=+process.argv[3],N=+process.argv[4];
  const runs=runList().filter((_,j)=>j%N===i);
  console.log('shard '+i+'/'+N+': '+runs.length+' runs');
  for(const r of runs) doRun(r);
} else if(mode==='aggregate') aggregate();
else { console.log('usage: shard <i> <N> | aggregate'); process.exit(1); }
