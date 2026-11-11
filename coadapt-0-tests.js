// coadapt-0-tests.js — acceptance fixtures per coadapt-stage1-spec.md §7.
// node coadapt-0-tests.js  → exits nonzero on any failure. No experiment runs until green.
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
let pass=0,fail=0;
function check(name,ok,detail){
  if(ok){pass++;console.log('  ok  '+name);}
  else{fail++;console.log('FAIL  '+name+(detail?' — '+detail:''));}
}
function runSim(cfg,ticks){ const sim=new CO.Sim(cfg); for(let i=0;i<ticks;i++) sim.step(); return sim; }
function stateStr(sim){ return JSON.stringify(sim.toJSON()); }

// 1. replay identity
{
  const cfg=()=>Object.assign(CO.defaults(),{worldSeed:7});
  const a=runSim(cfg(),1000),b=runSim(cfg(),1000);
  check('1 replay identity',stateStr(a)===stateStr(b));
}
// 2. snapshot-restore identity
{
  const cfg=()=>Object.assign(CO.defaults(),{worldSeed:7});
  const a=runSim(cfg(),500);
  const snap=JSON.parse(JSON.stringify(a.toJSON()));
  const b=CO.Sim.fromJSON(cfg(),{},snap);
  for(let i=0;i<500;i++){a.step();b.step();}
  check('2 snapshot identity',stateStr(a)===stateStr(b));
}
// 3. stream independence
{
  const r1=CO.dice(1,'a|genes|0');
  const solo=[r1(),r1(),r1()];
  const r2=CO.dice(1,'a|genes|0'),rb=CO.dice(1,'b|genes|0');
  const inter=[r2(),rb(),r2(),rb(),r2()];
  check('3 stream independence',solo[0]===inter[0]&&solo[1]===inter[2]&&solo[2]===inter[4]);
}
// 4. anti-reflexivity
{
  let ok=true;
  const rng=CO.dice(1,'fixture4');
  for(const w of [0.25,0.5]){
    const cfg=Object.assign(CO.defaults(),{w});
    for(let i=0;i<100;i++){ const t=rng(); if(CO.matchK(t,t,cfg)!==0){ok=false;break;} }
  }
  check('4 anti-reflexivity m(x,x)===0',ok);
}
// 5. kernel values (w=0.25)
{
  const cfg=CO.defaults();
  const cases=[[0.10,0.60,1],[0.10,0.35,0],[0.90,0.15,0],[0.00,0.45,0.8],[0.95,0.45,1]];
  let ok=true,msg='';
  for(const [a,b,e] of cases){
    const v=CO.matchK(a,b,cfg);
    if(Math.abs(v-e)>1e-12){ok=false;msg='m('+a+','+b+')='+v+' expected '+e;break;}
  }
  check('5 kernel values',ok,msg);
}
// 6. bookkeeping over a 2000-tick default run
{
  const sim=new CO.Sim(Object.assign(CO.defaults(),{worldSeed:7}));
  let ok=true,msg='';
  for(let t=1;t<=2000;t++){
    sim.step();
    if(t%100) continue;
    const seen=new Set();
    for(let idx=0;idx<sim.grid.length;idx++){
      const o=sim.grid[idx]; if(!o) continue;
      if(o.y*sim.W+o.x!==idx){ok=false;msg='pos mismatch t'+t;break;}
      if(seen.has(o.id)){ok=false;msg='dup id t'+t;break;}
      seen.add(o.id);
      if(sim.tick-o.bornTick>=sim.cfg.lifespan){ok=false;msg='overage t'+t;break;}
      if(o.energy<0){ok=false;msg='negative energy t'+t;break;}
    }
    if(!ok) break;
  }
  check('6 bookkeeping',ok,msg);
}
// 7. mutation distribution (mu=1, 20k mutated births)
{
  const sim=new CO.Sim(Object.assign(CO.defaults(),{worldSeed:7,mu:1}));
  while(sim.records.size<20200&&sim.tick<20000) sim.step();
  const deltas=[];
  for(const [id,r] of sim.records){
    if(!r.parentId) continue;
    const pr=sim.records.get(r.parentId); if(!pr) continue;
    let d=r.hueAtBirth-pr.hueAtBirth;
    d-=Math.round(d); // wrap to [-0.5,0.5)
    deltas.push(d);
    if(deltas.length>=20000) break;
  }
  const n=deltas.length;
  const mean=deltas.reduce((a,b)=>a+b,0)/n;
  const sd=Math.sqrt(deltas.reduce((a,b)=>a+(b-mean)*(b-mean),0)/n);
  check('7 mutation distribution (n='+n+')',
    n>=20000&&Math.abs(mean)<=0.002&&sd>=0.0475&&sd<=0.0525,
    'mean='+mean.toFixed(5)+' sd='+sd.toFixed(5));
}
// 8. neutral control: s=0 → no spurious POSITIVE assortment.
// NOTE: neutral A is genuinely NEGATIVE (≈ −0.02): local dispersal clusters kin, kin share
// hues, and similar neighbors score below the permutation null under an antipodal kernel.
// Kin structure is the real neutral baseline; only positive A would indicate a bug.
{
  let ok=true,msg='';
  for(const ws of [7,8,9]){
    const sim=new CO.Sim(Object.assign(CO.defaults(),{worldSeed:ws,s:0}));
    for(let t=1;t<=20000;t++){
      sim.step();
      if(t>=5000&&t%1000===0){
        const {A}=CO.assortment(sim);
        if(A>=0.02||A<=-0.1){ok=false;msg='ws'+ws+' t'+t+' A='+A.toFixed(4);break;}
      }
    }
    if(!ok) break;
    if(sim.population()===0){ok=false;msg='ws'+ws+' extinct';break;}
    // neutral R2 drifts upward via coalescence (fewer ancestral lineages → hue concentration);
    // observed up to ~0.24 at 20k. R2 alone is NOT evidence of selection. Sanity bound only.
    const {R2}=CO.nematic(sim.individuals().map(o=>o.hue));
    if(R2>=0.5){ok=false;msg='ws'+ws+' R2='+R2.toFixed(3);break;}
  }
  check('8 neutral control (slow)',ok,msg);
}
// 9. founder clock: single founder's first birth at exactly tick 64
{
  const sim=new CO.Sim(Object.assign(CO.defaults(),{initMode:'single'}));
  let t63pop,t64pop;
  for(let t=1;t<=64;t++){ sim.step(); if(t===63)t63pop=sim.population(); }
  t64pop=sim.population();
  const rec=sim.records.get('R');
  check('9 founder clock',t63pop===1&&t64pop===2&&rec.birthsAttempted===1,
    'pop63='+t63pop+' pop64='+t64pop+' attempts='+rec.birthsAttempted);
}
// 10. instrumentation does not touch physics
{
  const cfg=()=>Object.assign(CO.defaults(),{worldSeed:7});
  const a=new CO.Sim(cfg()),b=new CO.Sim(cfg());
  for(let t=1;t<=2000;t++){
    a.step(); b.step();
    if(t%100===0){ CO.assortment(b); CO.metricsOf(b,true); } // b gets measured, a doesn't
  }
  check('10 instrumentation inert',stateStr(a)===stateStr(b));
}

// 11. archipelago: deterministic, nobody in the sea, and off-by-default changes nothing
{
  const icfg=()=>Object.assign(CO.defaults(),{worldSeed:7,islandsNx:4,islandsNy:4,islandGap:4,longJump:0.01});
  const a=runSim(icfg(),800),b=runSim(icfg(),800);
  let dry=true;
  for(let i=0;i<a.grid.length;i++) if(a.grid[i]&&!a.hab[i]) dry=false;
  const plain=runSim(Object.assign(CO.defaults(),{worldSeed:7}),300);
  const base=runSim(Object.assign(CO.defaults(),{worldSeed:7,islandGap:4}),300); // dial present but islands off
  check('11 archipelago',stateStr(a)===stateStr(b)&&dry&&a.population()>0
    &&stateStr(plain)===stateStr(base));
}

console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
