// coadapt-1-frontier.js — Stage 2b frontier: (A) docking A/B at vine dials, (B) long
// elaboration, (C) S1-style transplants on bodies (match-metric, growth-phase window).
// node coadapt-1-frontier.js all   (sequential; results -> coadapt1-runs/frontier-*.json)
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
const VINE={keep:0.75,emit:1.5,absorbCap:1.5,seedCost:96,lifespan:192,lifespanPerCell:12,
  exposurePow:1,upkeep:0.05,dieback:1,seedFrom:'tip'};
function probe(sim){
  const mm=C1.metricsOf(sim);
  let open=0,cells=0,depthMax=0;
  const occ=sim.occ,W=sim.W,H=sim.H;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(!occ[y*W+x])continue; cells++;
    for(const j of [y*W+(x+1)%W,y*W+(x+W-1)%W,((y+1)%H)*W+x,((y+H-1)%H)*W+x]) if(!occ[j])open++; }
  for(const o of sim.orgs) for(const p of o.built.keys()) if(p.length>depthMax) depthMax=p.length;
  return {...mm,openPerCell:cells?open/cells:0,depthMax};
}
function evolve(name,cfg,T,dumpFinal){
  const sim=new C1.Sim(cfg),lines=[];
  for(let t=1;t<=T;t++){
    sim.step();
    if(t%1000===0) lines.push(JSON.stringify(C1.metricsOf(sim)));
    if(sim.population()===0){ console.log(name+' EXTINCT t'+t); break; }
  }
  fs.mkdirSync(path.join(ROOT,name),{recursive:true});
  fs.writeFileSync(path.join(ROOT,name,'metrics.jsonl'),lines.join('\n')+'\n');
  if(dumpFinal&&sim.population()>0)
    fs.writeFileSync(path.join(ROOT,name,'final.json'),JSON.stringify({orgs:
      sim.orgs.map(o=>({hue:o.hue,tree:C1.encodeBits(o.tree)}))}));
  const p=sim.population()>0?probe(sim):null;
  console.log(name+(p?('  orgs '+p.orgs+' mean '+p.meanCells.toFixed(1)+' open '+p.openPerCell.toFixed(2)
    +' cA '+p.cA.toFixed(3)+' flux '+(100*p.fluxShare).toFixed(1)+'% R2 '+p.R2.toFixed(2)
    +' R1 '+p.R1.toFixed(2)+' depthMax '+p.depthMax):'  EXTINCT'));
  return {name,final:p};
}
// A: docking A/B — does the dowry raise spatial partner-assortment?
function stageA(){
  const out=[];
  for(const dock of [0,48,96]) for(const ws of [1,2])
    out.push(evolve('fr-dock'+dock+'-ws'+ws,
      Object.assign(C1.defaults(),VINE,{worldSeed:ws,dockReserve:dock}),30000,false));
  fs.writeFileSync(path.join(ROOT,'frontier-dock.json'),JSON.stringify(out,null,1));
}
// B: long elaboration — do bodies deepen once interfaces pay?
function stageB(){
  const out=[];
  for(const ws of [1,2])
    out.push(evolve('fr-long-ws'+ws,
      Object.assign(C1.defaults(),VINE,{worldSeed:ws,dockReserve:48}),100000,false));
  fs.writeFileSync(path.join(ROOT,'frontier-long.json'),JSON.stringify(out,null,1));
}
// C: transplants on bodies — specificity of evolved (hue+anatomy) communities
function stageC(){
  const SRC=[11,22,33,44],T=40000;
  const dumps={},axes={};
  for(const ws of SRC){
    const name='fr-src-ws'+ws;
    if(!fs.existsSync(path.join(ROOT,name,'final.json')))
      evolve(name,Object.assign(C1.defaults(),VINE,{worldSeed:ws,dockReserve:48}),T,true);
    const d=JSON.parse(fs.readFileSync(path.join(ROOT,name,'final.json'),'utf8')).orgs;
    dumps[ws]=d; axes[ws]=C1.nematic(d.map(o=>o.hue));
  }
  function arena(name,samples){ // growth-phase window: mContact over ticks 800-2400
    const cfg=Object.assign(C1.defaults(),VINE,{worldSeed:4242,dockReserve:48,W:64,H:64,
      muTree:0,muHue:0,initN:0});
    const sim=new C1.Sim(cfg,{},{skipInit:true});
    const rng=C1.dice(4242,'arena|'+name);
    let fi=0;
    for(const src of samples) for(let i=0;i<src.n;i++){
      const pick=src.orgs[Math.floor(rng()*src.orgs.length)];
      let idx; do{ idx=Math.floor(rng()*64*64); }while(sim.occ[idx]);
      sim.makeOrg('F'+(fi++),C1.decodeBits(pick.tree),pick.hue,Math.floor(rng()*4),
        idx%64,Math.floor(idx/64),0,null);
    }
    let mSum=0,mN=0,fluxSum=0;
    for(let t=1;t<=2400;t++){
      sim.step();
      if(t>=800&&t%50===0){ const {mContact}=C1.contactAssort(sim,0);
        mSum+=mContact; mN++; fluxSum+=sim.ledger.influx?sim.ledger.absorbed/sim.ledger.influx:0; }
      if(sim.population()===0) break;
    }
    return {m:mN?mSum/mN:0,flux:mN?fluxSum/mN:0,pop:sim.population()};
  }
  const sym={},pairs=[];
  for(const ws of SRC){ sym[ws]=arena('sym-'+ws,[{orgs:dumps[ws],n:140}]);
    console.log('SYM '+ws+' m '+sym[ws].m.toFixed(3)+' flux '+(100*sym[ws].flux).toFixed(1)+'%'); }
  for(let a=0;a<SRC.length;a++) for(let b=a+1;b<SRC.length;b++){
    const wi=SRC[a],wj=SRC[b];
    const al=arena('allo-'+wi+'-'+wj,[{orgs:dumps[wi],n:70},{orgs:dumps[wj],n:70}]);
    const dphi=C1.circDist(axes[wi].phi,axes[wj].phi)>0.25?0.5-C1.circDist(axes[wi].phi,axes[wj].phi):Math.min(Math.abs(axes[wi].phi-axes[wj].phi),0.5-Math.abs(axes[wi].phi-axes[wj].phi));
    const deficit=(sym[wi].m+sym[wj].m)/2-al.m;
    pairs.push({pair:[wi,wj],dphi,deficit,mAllo:al.m,fluxAllo:al.flux});
    console.log('ALLO '+wi+'x'+wj+' dphi '+dphi.toFixed(3)+' deficit '+deficit.toFixed(3));
  }
  fs.writeFileSync(path.join(ROOT,'frontier-transplant.json'),JSON.stringify({sym,pairs},null,1));
}
const mode=process.argv[2]||'all';
if(mode==='all'){ stageA(); stageB(); stageC(); }
else ({a:stageA,b:stageB,c:stageC})[mode]();
