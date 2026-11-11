// coadapt-0-assay.js — assays S1–S4 per coadapt-stage1-spec.md §9.
// Usage (in order; each stage skips work already on disk):
//   node coadapt-0-assay.js sources   6 S1 source worlds at the sweet spot (reads aggregate.json)
//   node coadapt-0-assay.js s1        transplant assays over all 15 world pairs
//   node coadapt-0-assay.js s2        pair-mode runs, both-evolve vs B-frozen, 3 seeds each
//   node coadapt-0-assay.js s3        time-shift assays from s2 both-evolve dumps
//   node coadapt-0-assay.js s4        ecology-without-evolution continuations of S1 sources
//   node coadapt-0-assay.js report    compute statistics -> coadapt-assays/report.json
//   node coadapt-0-assay.js all       everything in order
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
const ROOT=path.join(__dirname,'coadapt-assays');
const W=48,H=48,SRC_T=100000,SRC_SEEDS=[11,22,33,44,55,66],S2_SEEDS=[11,22,33];
const ARENA_T=5000,ARENA_N=400,ARENA_WIN=2500,DUMP_EVERY=10000,DELTAS=[10000,25000,50000];

function sweetCfg(){
  const agg=JSON.parse(fs.readFileSync(path.join(__dirname,'coadapt-runs','aggregate.json'),'utf8'));
  if(!agg.sweetSpot) throw new Error('no sweet spot in aggregate.json — finish the sweep first');
  return {s:agg.sweetSpot.s,D:agg.sweetSpot.D,mu:agg.sweetSpot.mu};
}
function dump(sim){ return {tick:sim.tick,W:sim.W,H:sim.H,
  cells:sim.individuals().map(o=>[o.y*sim.W+o.x,o.hue,o.tag])}; }
function writeJSON(p,o){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,JSON.stringify(o)); }
function readJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

// ---- evolve a world, dumping every DUMP_EVERY, with per-1k metrics ----
function evolve(name,cfg,T){
  const dir=path.join(ROOT,name);
  if(fs.existsSync(path.join(dir,'dump-'+T+'.json'))){ console.log('skip '+name); return; }
  fs.mkdirSync(dir,{recursive:true});
  const sim=new CO.Sim(cfg);
  const lines=[];
  for(let t=1;t<=T;t++){
    sim.step();
    if(t%1000===0) lines.push(JSON.stringify(CO.metricsOf(sim,t%10000===0)));
    if(t%DUMP_EVERY===0) writeJSON(path.join(dir,'dump-'+t+'.json'),dump(sim));
    if(sim.population()===0){ console.log(name+' EXTINCT at '+t); break; }
  }
  fs.writeFileSync(path.join(dir,'metrics.jsonl'),lines.join('\n')+'\n');
  console.log(name+' done, pop '+sim.population());
}

// ---- assay arena: mutation OFF, sampled founders, measure births/capita + mean match ----
// Samples WITH replacement; random distinct placement (genotypic complementarity only —
// inherited spatial neighborhoods deliberately destroyed).
function arena(name,baseCfg,samples){ // samples: [{cells, tagAs, n}]
  const cfg=Object.assign(CO.defaults(),baseCfg,
    {W,H,mu:0,initMode:'uniform',initN:0,worldSeed:9999});
  const sim=new CO.Sim(cfg,{},{skipInit:true});
  const rng=CO.dice(9999,'assay|'+name);
  let fi=0;
  for(const src of samples){
    for(let i=0;i<src.n;i++){
      const pick=src.cells[Math.floor(rng()*src.cells.length)];
      let idx; do{ idx=Math.floor(rng()*W*H); }while(sim.grid[idx]);
      sim.addFounder('F'+(fi++),idx%W,Math.floor(idx/W),pick[1],src.tagAs);
    }
  }
  let births=0,popSum=0,popN=0,mSum=0,mN=0;
  const recBase=sim.records.size;
  for(let t=1;t<=ARENA_T;t++){
    sim.step();
    if(t>ARENA_T-ARENA_WIN&&t%50===0){
      popSum+=sim.population(); popN++;
      const {mReal}=CO.assortment(sim,0?0:5); mSum+=mReal; mN++;
    }
    if(sim.population()===0) break;
  }
  for(const [,r] of sim.records) if(r.parentId&&r.bornTick>ARENA_T-ARENA_WIN) births++;
  const meanPop=popN?popSum/popN:0;
  return {name,perf:meanPop?births/(meanPop*ARENA_WIN)*1000:0, // births per capita per 1k ticks
    mReal:mN?mSum/mN:0,meanPop,founders:recBase,extinct:sim.population()===0};
}

function axisOf(cells){ return CO.nematic(cells.map(c=>c[1])); }

// ---- stages ----
function stageSources(){
  const sw=sweetCfg();
  for(const ws of SRC_SEEDS)
    evolve('src-ws'+ws,Object.assign(CO.defaults(),{worldSeed:ws,W,H},sw),SRC_T);
}
function stageS1(){
  const sw=sweetCfg();
  const dumps={},axes={};
  for(const ws of SRC_SEEDS){
    dumps[ws]=readJSON(path.join(ROOT,'src-ws'+ws,'dump-'+SRC_T+'.json')).cells;
    axes[ws]=axisOf(dumps[ws]);
  }
  const out=[];
  const symPerf={};
  for(const ws of SRC_SEEDS){
    const p=path.join(ROOT,'s1','sym-'+ws+'.json');
    if(fs.existsSync(p)){ symPerf[ws]=readJSON(p); }
    else{ symPerf[ws]=arena('sym-'+ws,sw,[{cells:dumps[ws],tagAs:'i',n:ARENA_N}]); writeJSON(p,symPerf[ws]); }
    console.log('SYM ws'+ws+' perf '+symPerf[ws].perf.toFixed(2)+' m '+symPerf[ws].mReal.toFixed(3));
  }
  for(let a=0;a<SRC_SEEDS.length;a++) for(let b=a+1;b<SRC_SEEDS.length;b++){
    const wi=SRC_SEEDS[a],wj=SRC_SEEDS[b];
    const p=path.join(ROOT,'s1','allo-'+wi+'-'+wj+'.json');
    let allo;
    if(fs.existsSync(p)) allo=readJSON(p);
    else{ allo=arena('allo-'+wi+'-'+wj,sw,
      [{cells:dumps[wi],tagAs:'i',n:ARENA_N/2},{cells:dumps[wj],tagAs:'j',n:ARENA_N/2}]); writeJSON(p,allo); }
    const dphi=CO.axisDist(axes[wi].phi,axes[wj].phi);
    const deficit=(symPerf[wi].perf+symPerf[wj].perf)/2-allo.perf;
    out.push({pair:[wi,wj],dphi,deficit,symI:symPerf[wi].perf,symJ:symPerf[wj].perf,
      allo:allo.perf,mAllo:allo.mReal,R2i:axes[wi].R2,R2j:axes[wj].R2});
    console.log('ALLO '+wi+'x'+wj+'  dphi '+dphi.toFixed(3)+'  deficit '+deficit.toFixed(2));
  }
  writeJSON(path.join(ROOT,'s1','pairs.json'),out);
}
function stageS2(){
  const sw=sweetCfg();
  for(const ws of S2_SEEDS){
    evolve('s2-free-ws'+ws,Object.assign(CO.defaults(),{worldSeed:ws,W,H,initMode:'pair'},sw),SRC_T);
    evolve('s2-frozen-ws'+ws,Object.assign(CO.defaults(),{worldSeed:ws,W,H,initMode:'pair',freezeTag:'B'},sw),SRC_T);
  }
}
function stageS3(){
  const sw=sweetCfg(),out=[];
  for(const ws of S2_SEEDS){
    const dir=path.join(ROOT,'s2-free-ws'+ws);
    const now=readJSON(path.join(dir,'dump-'+SRC_T+'.json')).cells;
    const nowA=now.filter(c=>c[2]==='A'),nowB=now.filter(c=>c[2]==='B');
    if(!nowA.length||!nowB.length){ console.log('s3 ws'+ws+': a tag went extinct, skipping'); continue; }
    const base=arena('s3-ws'+ws+'-d0',sw,
      [{cells:nowA,tagAs:'A',n:ARENA_N/2},{cells:nowB,tagAs:'B',n:ARENA_N/2}]);
    out.push({ws,delta:0,perf:base.perf,mReal:base.mReal});
    for(const d of DELTAS){
      const old=readJSON(path.join(dir,'dump-'+(SRC_T-d)+'.json')).cells.filter(c=>c[2]==='B');
      if(!old.length) continue;
      const r=arena('s3-ws'+ws+'-d'+d,sw,
        [{cells:nowA,tagAs:'A',n:ARENA_N/2},{cells:old,tagAs:'B',n:ARENA_N/2}]);
      out.push({ws,delta:d,perf:r.perf,mReal:r.mReal,deficit:base.perf-r.perf});
      console.log('s3 ws'+ws+' Δ'+d+'  perf '+r.perf.toFixed(2)+'  deficit '+(base.perf-r.perf).toFixed(2));
    }
  }
  writeJSON(path.join(ROOT,'s3','timeshift.json'),out);
}
function stageS4(){
  const sw=sweetCfg(),out=[];
  for(const ws of SRC_SEEDS){
    const d=readJSON(path.join(ROOT,'src-ws'+ws,'dump-'+SRC_T+'.json'));
    const cfg=Object.assign(CO.defaults(),{worldSeed:ws,W,H,mu:0},sw);
    const sim=CO.Sim.fromJSON(cfg,{},{tick:0,
      pop:d.cells.map((c,i)=>({id:'S'+i,x:c[0]%W,y:Math.floor(c[0]/W),hue:c[1],energy:0,
        bornTick:0,ord:0,tag:c[2],parentId:null}))});
    const A0=CO.assortment(sim).A;
    for(let t=1;t<=20000;t++){ sim.step(); if(sim.population()===0) break; }
    const fin=CO.metricsOf(sim);
    out.push({ws,A0,A20k:fin.A,pop:fin.pop,extinct:fin.pop===0});
    console.log('s4 ws'+ws+'  A0 '+A0.toFixed(3)+' -> '+fin.A.toFixed(3)+'  pop '+fin.pop);
  }
  writeJSON(path.join(ROOT,'s4','persistence.json'),out);
}
function spearman(xs,ys){
  const rank=a=>{const idx=a.map((v,i)=>[v,i]).sort((p,q)=>p[0]-q[0]);
    const r=new Array(a.length); idx.forEach((p,k)=>r[p[1]]=k+1); return r;};
  const rx=rank(xs),ry=rank(ys),n=xs.length;
  const mx=(n+1)/2;
  let num=0,dx=0,dy=0;
  for(let i=0;i<n;i++){ num+=(rx[i]-mx)*(ry[i]-mx); dx+=(rx[i]-mx)**2; dy+=(ry[i]-mx)**2; }
  return num/Math.sqrt(dx*dy);
}
function circDelta(a,b){ let d=b-a; d-=Math.round(d); return d; } // signed, [-0.5,0.5)
function stageReport(){
  const report={generated:new Date().toISOString()};
  // S1: deficit vs axis misalignment
  const pairs=readJSON(path.join(ROOT,'s1','pairs.json'));
  const rho=spearman(pairs.map(p=>p.dphi),pairs.map(p=>p.deficit));
  const meanDef=pairs.reduce((a,p)=>a+p.deficit,0)/pairs.length;
  report.s1={pairs:pairs.length,spearmanDphiDeficit:rho,meanDeficit:meanDef,
    pass:rho>=0.6&&meanDef>0,detail:pairs};
  // S2: tracking + wandering-axis-locked-spacing, from metrics tag means
  report.s2=[];
  for(const ws of S2_SEEDS){
    for(const arm of ['free','frozen']){
      const p=path.join(ROOT,'s2-'+arm+'-ws'+ws,'metrics.jsonl');
      if(!fs.existsSync(p)) continue;
      const ms=fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse)
        .filter(m=>m.tags&&m.tags.A&&m.tags.B);
      if(ms.length<20) continue;
      const thA=ms.map(m=>m.tags.A.mean),thB=ms.map(m=>m.tags.B.mean);
      const spacing=ms.map((m,i)=>CO.circDist(thA[i],thB[i]));
      const step=10; // displacements over 10k ticks (metrics are per 1k)
      const dA=[],dB=[];
      for(let i=step;i<ms.length;i+=step){ dA.push(circDelta(thA[i-step],thA[i])); dB.push(circDelta(thB[i-step],thB[i])); }
      const n=dA.length;
      const corr=(()=>{const ma=dA.reduce((a,b)=>a+b,0)/n,mb=dB.reduce((a,b)=>a+b,0)/n;
        let num=0,va=0,vb=0;
        for(let i=0;i<n;i++){num+=(dA[i]-ma)*(dB[i]-mb);va+=(dA[i]-ma)**2;vb+=(dB[i]-mb)**2;}
        return va&&vb?num/Math.sqrt(va*vb):0;})();
      const axisWander=Math.abs(dA.reduce((a,b)=>a+b,0)); // net drift of A cluster
      const meanSpacingErr=spacing.slice(Math.floor(spacing.length/2))
        .reduce((a,s)=>a+Math.abs(s-0.5),0)/Math.ceil(spacing.length/2);
      report.s2.push({ws,arm,tracking:corr,axisWander,meanSpacingErr,
        survivedA:ms[ms.length-1].tags.A.n,survivedB:ms[ms.length-1].tags.B.n});
    }
  }
  // S3: deficit growth with time shift
  const s3p=path.join(ROOT,'s3','timeshift.json');
  if(fs.existsSync(s3p)){
    const ts=readJSON(s3p).filter(r=>r.delta>0);
    report.s3={rows:ts,
      spearmanDeltaDeficit:ts.length>=3?spearman(ts.map(r=>r.delta),ts.map(r=>r.deficit)):null};
  }
  // S4
  const s4p=path.join(ROOT,'s4','persistence.json');
  if(fs.existsSync(s4p)){
    const s4=readJSON(s4p);
    report.s4={rows:s4,pass:s4.every(r=>!r.extinct&&Math.abs(r.A20k-r.A0)<=0.2*Math.max(Math.abs(r.A0),0.05))};
  }
  writeJSON(path.join(ROOT,'report.json'),report);
  console.log(JSON.stringify({s1:report.s1&&{rho:report.s1.spearmanDphiDeficit,meanDeficit:report.s1.meanDeficit,pass:report.s1.pass},
    s2:report.s2,s3:report.s3&&report.s3.spearmanDeltaDeficit,s4:report.s4&&report.s4.pass},null,1));
}

const mode=process.argv[2];
const stages={sources:stageSources,s1:stageS1,s2:stageS2,s3:stageS3,s4:stageS4,report:stageReport};
if(mode==='all'){ for(const k of ['sources','s1','s2','s3','s4','report']) stages[k](); }
else if(stages[mode]) stages[mode]();
else { console.log('usage: sources|s1|s2|s3|s4|report|all'); process.exit(1); }
