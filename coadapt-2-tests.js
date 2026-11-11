// coadapt-2-tests.js — excavation-layer fixtures: the reroll contract.
// node coadapt-2-tests.js; nonzero on fail.
'use strict';
const fs=require('fs'),path=require('path');
function loadCore(){
  const src=fs.readFileSync(path.join(__dirname,'coadapt-2.html'),'utf8');
  const m=src.match(/\/\/ ==== COADAPT2 CORE BEGIN ====([\s\S]*?)\/\/ ==== COADAPT2 CORE END ====/);
  const mod={exports:{}};
  new Function('module','exports',m[1])(mod,mod.exports);
  return mod.exports;
}
const C2=loadCore();
let pass=0,fail=0;
function check(name,ok,detail){
  if(ok){pass++;console.log('  ok  '+name);}
  else{fail++;console.log('FAIL  '+name+(detail?' — '+detail:''));}
}
const VINE={worldSeed:7,keep:0.75,emit:1.5,absorbCap:1.5,seedCost:96,lifespan:192,
  lifespanPerCell:12,exposurePow:1,upkeep:0.05,dieback:1,dockReserve:48,seedFrom:'tip'};
function runSim(rerolls,ticks){
  const sim=new C2.Sim(Object.assign(C2.defaults(),VINE),rerolls);
  for(let i=0;i<ticks;i++) sim.step();
  return sim;
}
function stateStr(sim){ return JSON.stringify(sim.toJSON()); }

// pick a reroll target: an organism born around tick ~800 in the baseline run
const base=runSim({},2000);
let target=null;
for(const [id,r] of base.records)
  if(r.parentId&&r.bornTick>=700&&r.bornTick<=1000){ target={id,born:r.bornTick}; break; }

// 1. empty-rerolls replay reproduces the baseline exactly
{
  const b2=runSim({},2000);
  check('1 no-reroll replay identical',stateStr(base)===stateStr(b2));
}
// 2. reroll leaves the past untouched: states at bornTick-1 identical with/without reroll
{
  const a=runSim({},target.born-1);
  const b=runSim({[target.id]:{g:1,j:0}},target.born-1);
  check('2 reroll past-invariance (t'+(target.born-1)+')',stateStr(a)===stateStr(b));
}
// 3. genes reroll changes only that birth's outcome at the birth tick: every other organism
//    alive at bornTick is identical. A reroll may legitimately resample the same outcome
//    (~40%: the mutation gate rolls "copy" again) — then the future must be identical too.
//    Find a target whose dice actually change and require causal divergence for it.
{
  const candidates=[];
  for(const [id,r] of base.records)
    if(r.parentId&&r.bornTick>=700&&r.bornTick<=1200) candidates.push({id,born:r.bornTick});
  const dump=s=>{const m={}; for(const o of s.toJSON().orgs) m[o.id]=JSON.stringify(o); return m;};
  let okLocal=true,diverger=null,sameOutcomeConsistent=true,msg='';
  for(const t of candidates.slice(0,6)){
    const a=runSim({},t.born),b=runSim({[t.id]:{g:1,j:0}},t.born);
    const da=dump(a),db=dump(b);
    for(const id in da){
      if(id===t.id) continue;
      if(da[id]!==db[id]){ okLocal=false; msg='nonlocal at '+t.id; break; }
    }
    const changed=da[t.id]!==db[t.id]||((t.id in da)!==(t.id in db));
    if(!changed){
      const c=runSim({[t.id]:{g:1,j:0}},2000);
      if(stateStr(c)!==stateStr(base)){ sameOutcomeConsistent=false; msg='ghost divergence at '+t.id; }
    } else if(!diverger){
      // a changed birth may still reconverge if the variant dies without trace (no litter
      // in this world) — legitimate physics. Require at least one PERSISTENT divergence.
      const c=runSim({[t.id]:{g:1,j:0}},2000);
      if(stateStr(c)!==stateStr(base)) diverger=t;
    }
    if(!okLocal) break;
  }
  check('3 reroll locality + lawful divergence',
    okLocal&&sameOutcomeConsistent&&!!diverger,
    msg||(diverger?'diverger '+diverger.id:'no persistent divergence in sample'));
}
// 4. journey reroll is independent of genes: j-reroll leaves the genome draw unchanged
{
  const b=runSim({[target.id]:{g:0,j:1}},target.born);
  const oa=base.records.get(target.id),ob=b.records.get(target.id);
  // same genome at birth (genes stream untouched); record exists either way
  check('4 journey/genes stream independence',
    !!ob&&oa.treeAtBirth!==undefined&&ob.treeAtBirth===oa.treeAtBirth&&ob.hueAtBirth===oa.hueAtBirth);
}
// 5. snapshot round-trip under rerolls: fromJSON mid-flight continues identically
{
  const rr={[target.id]:{g:1,j:0}};
  const a=runSim(rr,1500);
  const snap=JSON.parse(JSON.stringify(a.toJSON()));
  const b=C2.Sim.fromJSON(Object.assign(C2.defaults(),VINE),rr,snap);
  for(let i=0;i<500;i++){a.step();b.step();}
  check('5 snapshot identity under rerolls',stateStr(a)===stateStr(b));
}

console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
