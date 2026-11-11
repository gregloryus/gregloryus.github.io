// coadapt-1-tests.js — Stage 2a acceptance fixtures. node coadapt-1-tests.js; nonzero on fail.
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
let pass=0,fail=0;
function check(name,ok,detail){
  if(ok){pass++;console.log('  ok  '+name);}
  else{fail++;console.log('FAIL  '+name+(detail?' — '+detail:''));}
}
function runSim(cfg,ticks){ const sim=new C1.Sim(cfg); for(let i=0;i<ticks;i++) sim.step(); return sim; }
function stateStr(sim){ return JSON.stringify(sim.toJSON()); }

// 1. replay identity
{
  const cfg=()=>Object.assign(C1.defaults(),{worldSeed:7});
  const a=runSim(cfg(),1000),b=runSim(cfg(),1000);
  check('1 replay identity',stateStr(a)===stateStr(b));
}
// 2. snapshot-restore identity
{
  const cfg=()=>Object.assign(C1.defaults(),{worldSeed:7});
  const a=runSim(cfg(),500);
  const snap=JSON.parse(JSON.stringify(a.toJSON()));
  const b=C1.Sim.fromJSON(cfg(),{},snap);
  for(let i=0;i<500;i++){a.step();b.step();}
  check('2 snapshot identity',stateStr(a)===stateStr(b));
}
// 3. ledger conservation: kept+emitted=influx; absorbed+dissipated=emitted; absorbed>=0
{
  const sim=new C1.Sim(Object.assign(C1.defaults(),{worldSeed:7}));
  let ok=true,msg='';
  for(let t=1;t<=1000;t++){
    sim.step();
    const l=sim.ledger;
    if(Math.abs(l.kept+l.emitted-l.influx)>1e-6*(l.influx||1)){ok=false;msg='split t'+t;break;}
    if(Math.abs(l.absorbed+l.dissipated-l.emitted)>1e-6*(l.emitted||1)){ok=false;msg='fate t'+t;break;}
    if(l.absorbed<0||l.absorbed>l.emitted+1e-9){ok=false;msg='bounds t'+t;break;}
  }
  check('3 energy ledger',ok,msg);
}
// 4. exchange is anti-reflexive and kin-worthless; antipodal pays
{
  const cfg=Object.assign(C1.defaults(),{worldSeed:1,bodyMode:'point',initN:0});
  const sim=new C1.Sim(cfg,{},{skipInit:true});
  // same hue adjacent
  sim.makeOrg('a',C1.newNode(),0.3,0,10,10,0,null);
  sim.makeOrg('b',C1.newNode(),0.3,0,11,10,0,null);
  // antipodal pair far away
  sim.makeOrg('c',C1.newNode(),0.1,0,40,40,0,null);
  sim.makeOrg('d',C1.newNode(),0.6,0,41,40,0,null);
  sim.step();
  const o=id=>sim.orgs.find(x=>x.id===id);
  const kin=o('a').pool===cfg.keep&&o('b').pool===cfg.keep;           // kin byproduct worth 0
  const pair=Math.abs(o('c').pool-(cfg.keep+cfg.emit))<1e-9
           &&Math.abs(o('d').pool-(cfg.keep+cfg.emit))<1e-9;          // full capture at m=1
  check('4 kin-worthless / antipodal-full exchange',kin&&pair,
    'pools '+['a','b','c','d'].map(i=>o(i).pool).join(','));
}
// 5. TBT world layout: genome 010,000 facings 0..3 land where expected
{
  const t010=()=>{const g=C1.newNode(); g.c[1]=C1.newNode(); return g;};
  const cases=[[0,[10,10],[10,9]],[1,[10,10],[11,10]],[2,[10,10],[10,11]],[3,[10,10],[9,10]]];
  let ok=true,msg='';
  for(const [f,root,child] of cases){
    const cfg=Object.assign(C1.defaults(),{worldSeed:1,initN:0});
    const sim=new C1.Sim(cfg,{},{skipInit:true});
    const o=sim.makeOrg('x',t010(),0.2,f,root[0],root[1],0,null);
    for(let i=0;i<12;i++) sim.step(); // builds the child with pool income
    const idxs=[...o.built.values()].sort((a,b)=>a-b);
    const want=[root[1]*cfg.W+root[0],child[1]*cfg.W+child[0]].sort((a,b)=>a-b);
    if(JSON.stringify(idxs)!==JSON.stringify(want)){ok=false;msg='facing '+f;break;}
  }
  check('5 TBT facings',ok,msg);
}
// 6. neutral control: emit=0 (keep=2) -> hue has no fitness effect -> no contact assortment
{
  let ok=true,msg='';
  for(const ws of [7,8]){
    const sim=new C1.Sim(Object.assign(C1.defaults(),{worldSeed:ws,emit:0,keep:2}));
    for(let t=1;t<=5000;t++) sim.step();
    const {cA}=C1.contactAssort(sim);
    if(Math.abs(cA)>=0.05){ok=false;msg='ws'+ws+' cA='+cA.toFixed(3);break;}
    if(sim.population()===0){ok=false;msg='ws'+ws+' extinct';break;}
  }
  check('6 neutral control (emit=0)',ok,msg);
}
// 7. point-body mode: everyone stays single-cell
{
  const sim=runSim(Object.assign(C1.defaults(),{worldSeed:7,bodyMode:'point'}),2000);
  let ok=sim.population()>0;
  for(const o of sim.orgs) if(o.built.size!==1||o.planSize!==1) ok=false;
  check('7 point bodies',ok);
}
// 8. bookkeeping: occ consistent with built cells; no two orgs share a cell
{
  const sim=new C1.Sim(Object.assign(C1.defaults(),{worldSeed:7}));
  let ok=true,msg='';
  for(let t=1;t<=2000;t++){
    sim.step();
    if(t%200) continue;
    const seen=new Map();
    for(const o of sim.orgs) for(const idx of o.built.values()){
      if(seen.has(idx)){ok=false;msg='overlap t'+t;break;}
      seen.set(idx,o);
      if(sim.occ[idx]!==o){ok=false;msg='occ mismatch t'+t;break;}
    }
    let occCount=0;
    for(const c of sim.occ) if(c) occCount++;
    if(occCount!==seen.size){ok=false;msg='stale occ t'+t;break;}
    if(!ok) break;
  }
  check('8 occupancy bookkeeping',ok,msg);
}
// 9. mutation sanity: depth-weighted urn prefers deep sites; trees stay self-consistent
{
  const cfg=C1.defaults();
  const rng=C1.dice(1,'fixture9');
  let okTree=true,grew=0,cut=0;
  for(let i=0;i<2000;i++){
    const g=C1.decodeBits('010000');
    const r=C1.mutateTree(g,rng,cfg);
    if(r.t==='grow')grew++; else if(r.t==='cut')cut++;
    const lay=C1.layoutTree(g);
    const pos=new Set();
    for(const c of lay.cells){ const k=c.px+','+c.pz; if(pos.has(k)){okTree=false;break;} pos.add(k); }
    if(!okTree) break;
  }
  check('9 mutation self-consistency',okTree&&grew>0&&cut>0,'grew '+grew+' cut '+cut);
}

console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
