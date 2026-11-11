// Godsroll headless smoke test: node godsroll-smoke.js
// Extracts the core from godsroll-1.html and checks the determinism contract.
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'godsroll-1.html'),'utf8');
const m=html.match(/\/\/ ==== GODSROLL CORE BEGIN ====([\s\S]*?)\/\/ ==== GODSROLL CORE END ====/);
if(!m){ console.error('core markers not found'); process.exit(1); }
const module2={exports:{}};
new Function('module',m[1])(module2);
const GR=module2.exports;

let fails=0;
function check(name,ok,extra){ console.log((ok?'PASS':'FAIL')+'  '+name+(extra?('  '+extra):'')); if(!ok) fails++; }

const cfg=GR.defaults();
const dims={C:100,S:100,G:150}; // spec's 400x1000 portrait example
const N=3000;

// run A
const a=new GR.Sim(cfg,dims,{});
const popLog=[];
for(let i=0;i<N;i++){ a.step(); if(a.tick%500===0) popLog.push([a.tick,a.plants.length,a.seeds.length,a.litterTotal()]); }
console.log('tick/plants/seeds/litter:', popLog.map(r=>r.join('/')).join('  '));

// 1. fresh-run determinism
const b=new GR.Sim(cfg,dims,{});
for(let i=0;i<N;i++) b.step();
check('fresh replay identical at t'+N, JSON.stringify(a)===JSON.stringify(b));

// 2. snapshot restore -> continue == straight run
const c=new GR.Sim(cfg,dims,{});
let snap=null;
for(let i=0;i<N;i++){ c.step(); if(c.tick===1400) snap=JSON.stringify(c); }
const d=GR.Sim.fromJSON(cfg,dims,{},JSON.parse(snap));
while(d.tick<N) d.step();
check('snapshot@1400 restore+continue identical', JSON.stringify(c)===JSON.stringify(d));

// 3. litter ledger: total ground value == deposited dead cells + failed seeds
let deposited=0;
for(const r of a.records.values()){
  if(r.fate==='failed'&&cfg.seedLitter) deposited+=1;
  if(r.end) deposited+=r.cellsBuilt;
}
check('litter ledger conserved', a.litterTotal()===deposited, a.litterTotal()+' vs '+deposited);

// 4. reroll independence: history identical before the rerolled seed's release
let target=null;
for(const r of a.records.values()) if(r.id!=='R'&&r.releaseTick>200){ target=r; break; }
if(target){
  const rr={}; rr[target.id]={g:1,j:0,tick:target.releaseTick};
  const e=new GR.Sim(cfg,dims,rr), f=new GR.Sim(cfg,dims,{});
  while(e.tick<target.releaseTick-1) e.step();
  while(f.tick<target.releaseTick-1) f.step();
  check('reroll('+target.id+') leaves past identical (t'+(target.releaseTick-1)+')',
    JSON.stringify(e)===JSON.stringify(f));
  e.step(); f.step();
  const re=e.records.get(target.id), rf=f.records.get(target.id);
  check('rerolled seed exists in both at release', !!re&&!!rf);
  // journey must be untouched by a genes reroll
  check('genes reroll preserves journey', re&&rf&&re.budget===rf.budget);
} else check('found rerollable seed', false);

// 5. urn vs literal oracle on a small genome: base locked, 010,000
{
  const g=GR.newNode(); g.c[1]=GR.newNode();
  const {fills,cuts}=GR.eligibleSites(g,cfg);
  // locked base: no base sites; child (depth 2) has 3 empty slots, no cuts
  check('urn eligibility on founder genome', fills.length===3&&cuts.length===0,
    fills.length+' fills, '+cuts.length+' cuts');
  const w=fills.map(s=>GR.siteWeight(s,cfg));
  check('linear weights = owner depth', w.every(x=>x===2));
}

// 6. facing oracle: left-facing node's right child grows upward
{
  // base(up) -> left child faces left(3); its right slot faces (3+1)%4=0=up
  const f=GR.SLOT_FACING[3*3+2];
  check('left-facing right child faces up', f===0);
  const g=GR.newNode(); g.c[0]=GR.newNode(); g.c[0].c[2]=GR.newNode();
  const {cells}=GR.layoutTree(g);
  const deep=cells.find(r=>r.path==='02');
  check('100,001,000 layout: (-1,0) then (-1,1)', deep&&deep.px===-1&&deep.pz===1,
    deep&&(deep.px+','+deep.pz));
}

console.log(fails?('\n'+fails+' FAILURES'):'\nall checks passed');
process.exit(fails?1:0);
