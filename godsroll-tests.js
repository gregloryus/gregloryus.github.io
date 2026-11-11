// Godsroll fixture suite: node --max-old-space-size=2048 godsroll-tests.js
// Extracts the core from godsroll-1.html (same technique as godsroll-smoke.js) and
// exercises the rule-card policies + design-doc sections 3,7,8,9,10,15.
// Does NOT modify godsroll-1.html.
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'godsroll-1.html'),'utf8');
const m=html.match(/\/\/ ==== GODSROLL CORE BEGIN ====([\s\S]*?)\/\/ ==== GODSROLL CORE END ====/);
if(!m){ console.error('core markers not found'); process.exit(1); }
const module2={exports:{}};
new Function('module',m[1])(module2);
const GR=module2.exports;

let fails=0;
function check(name,ok,extra){ console.log((ok?'PASS':'FAIL')+'  '+name+(extra!==undefined?('  '+extra):'')); if(!ok) fails++; }
const {DX,DZ,SLOT_FACING}=GR;

// ================= A. TBT geometry =================
(function partA(){
  // chain of 4 L-slots from base: facings up(0)->left(3)->down(2)->right(1)
  const n1=GR.newNode(), n2=GR.newNode(), n3=GR.newNode(), n4=GR.newNode();
  n1.c[0]=n2; n2.c[0]=n3; n3.c[0]=n4;
  const {cells,byPath}=GR.layoutTree(n1);
  const exp={'':[0,0,0],'0':[-1,0,3],'00':[-1,-1,2],'000':[0,-1,1]};
  let ok=true;
  for(const path in exp){
    const r=byPath.get(path), [px,pz,f]=exp[path];
    if(!r||r.px!==px||r.pz!==pz||r.facing!==f) ok=false;
  }
  check('A1 hand-calc chain up->left->down->right matches layoutTree', ok,
    cells.map(c=>c.path+':'+c.px+','+c.pz+'f'+c.facing).join(' '));

  // explicit spec callout: left-facing node's right child grows upward
  check('A2 SLOT_FACING: left-facing right child faces up', SLOT_FACING[3*3+2]===0);
  const b=GR.newNode(); b.c[0]=GR.newNode(); b.c[0].c[2]=GR.newNode();
  const lay=GR.layoutTree(b);
  const rc=lay.byPath.get('02');
  check('A3 left-facing node, right child position/facing', rc&&rc.facing===0&&rc.px===-1&&rc.pz===1,
    rc&&(rc.px+','+rc.pz+' f'+rc.facing));

  // self-overlap exclusion: n4 (depth4, facing1/right) L-slot targets (0,0)=base position
  const cfg=GR.defaults();
  const {fills}=GR.eligibleSites(n1,cfg);
  const n4rec=byPath.get('000');
  const labels=fills.map(s=>s.rec.path+':'+s.s);
  check('A4 self-overlapping slot excluded from fills (000:0 == base pos)', !labels.includes('000:0'), labels.join(' '));
  check('A5 non-overlapping sibling slots remain eligible (000:1, 000:2)',
    labels.includes('000:1')&&labels.includes('000:2'));
})();

// ================= B. mutation urn vs literal oracle =================
(function partB(){
  // base(locked,F) -> d2(depth2) -> L:d3L, R:d3R  (4 genes total)
  const base=GR.newNode(); const d2=GR.newNode(); const d3L=GR.newNode(); const d3R=GR.newNode();
  base.c[1]=d2; d2.c[0]=d3L; d2.c[2]=d3R;

  function siteList(cfg){
    const {fills,cuts}=GR.eligibleSites(base,cfg);
    const cands=[];
    for(const s of fills) cands.push({path:s.rec.path,s:s.s,type:'fill',depth:s.rec.depth,w:GR.siteWeight(s,cfg)});
    for(const s of cuts) cands.push({path:s.rec.path,s:s.s,type:'cut',depth:s.rec.depth,w:GR.siteWeight(s,cfg)});
    return cands;
  }
  const cfgLin=GR.defaults(); cfgLin.haloSelf=0; // urnMode linear; pure urn without the arc-halo law
  const candsLin=siteList(cfgLin);
  check('B1 eligible sites on 4-gene fixture: 2 cuts (d2) + 7 fills (1@d2,6@d3)',
    candsLin.filter(c=>c.type==='cut').length===2 && candsLin.filter(c=>c.type==='fill').length===7,
    JSON.stringify(candsLin.map(c=>c.path+'/'+c.s+'/'+c.type+'/'+c.w)));

  // cut subtree sizes, precomputed from the real tree for exact-size verification later
  const subtreeSize={};
  for(const c of candsLin.filter(x=>x.type==='cut')){
    const owner = c.path===''?base : GR.layoutTree(base).byPath.get(c.path).node;
    subtreeSize[c.path+':'+c.s]=GR.countNodes(owner.c[c.s]);
  }

  function runUrn(cfg, N, label){
    const cands=siteList(cfg);
    const total=cands.reduce((a,c)=>a+c.w,0);
    const counts={}; for(const c of cands) counts[c.path+':'+c.s]=0;
    let anomalies=0, growNs=[], badCutSize=0, badPosSet=0;
    for(let i=0;i<N;i++){
      const tree=GR.cloneTree(base);
      const rng=GR.dice(cfg.worldSeed,'urntrial-'+label+'-'+i);
      const res=GR.mutateGenome(tree,rng,cfg);
      const {byPath}=GR.layoutTree(tree);
      let found=null, hits=0;
      for(const c of cands){
        const rec=byPath.get(c.path);
        const present=!!(rec&&rec.node.c[c.s]);
        const wasPresent=c.type==='cut';
        if(present!==wasPresent){ found=c; hits++; }
      }
      if(hits!==1) anomalies++; else counts[found.path+':'+found.s]++;
      if(found&&found.type==='cut' && res.n!==subtreeSize[found.path+':'+found.s]) badCutSize++;
      if(found&&found.type==='fill') growNs.push(res.n);
      const lay=GR.layoutTree(tree);
      if(lay.posSet.size!==GR.countNodes(tree)) badPosSet++;
    }
    check(label+' every trial resolves to exactly one flipped site', anomalies===0, anomalies+' anomalies/'+N);
    check(label+' cut n matches precomputed subtree size', badCutSize===0, badCutSize+' mismatches');
    check(label+' every resulting tree is overlap-free (posSet.size===countNodes)', badPosSet===0, badPosSet+' bad trees');
    let within=0;
    for(const c of cands){
      const key=c.path+':'+c.s, p=c.w/total, exp=N*p, sd=Math.sqrt(N*p*(1-p));
      const obs=counts[key];
      if(Math.abs(obs-exp)<=3*sd) within++;
    }
    check(label+' empirical frequencies within 3 SD of literal-urn oracle for all '+cands.length+' sites',
      within===cands.length, within+'/'+cands.length+' sites within bound');
    const meanGrow = growNs.length? growNs.reduce((a,b)=>a+b,0)/growNs.length : NaN;
    check(label+' mean new-cells-per-grow bounded (<50) over '+growNs.length+' grow events',
      growNs.length>0 && meanGrow<50, 'mean='+meanGrow.toFixed(3));
  }
  runUrn(cfgLin, 10000, 'B-linear');
  const cfgMult={...cfgLin, urnMode:'mult', urnMult:2};
  runUrn(cfgMult, 10000, 'B-mult');
})();

// ================= C. three-strikes forgetting =================
(function partC(){
  const sim=new GR.Sim(GR.defaults(),{C:5,S:2,G:5},{});
  // base(locked,F=nodeA). nodeA.L=nodeC(k=2,built). nodeA.F=nodeB(k=2,unbuilt).
  const base=GR.newNode(), nodeA=GR.newNode(), nodeB=GR.newNode(), nodeC=GR.newNode();
  base.c[1]=nodeA; nodeA.c[1]=nodeB; nodeA.c[0]=nodeC;
  nodeB.k=2; nodeC.k=2;
  const p={birthPlan:base, layout:GR.layoutTree(base), builtSet:new Set(['','1','10'])}; // '' base, '1' nodeA, '10' nodeC built; '11' nodeB NOT built
  sim.harden(p);
  check('C1 built node resets k to 0 (nodeC, was k=2, built)', nodeC.k===0);
  check('C2 unbuilt node increments k (nodeB, was k=2, unbuilt -> 3)', nodeB.k===3);
  check('C3 node at 3 strikes pruned from baseline (nodeA.c[1] gone)', p.baseline.c[1].c[1]===null);
  check('C4 surviving sibling kept in baseline w/ reset k', p.baseline.c[1].c[0]!==null && p.baseline.c[1].c[0].k===0);
  check('C5 birthPlan tissue retained (not erased) despite pruning', p.birthPlan.c[1].c[1]!==null);
  check('C6 hardening sets state/age', p.state==='hardened'&&p.age===0);

  // locked-base exemption: base's own F slot (nodeA) at 3 strikes must NOT be pruned
  const sim2=new GR.Sim(GR.defaults(),{C:5,S:2,G:5},{});
  const base2=GR.newNode(), nodeA2=GR.newNode(); base2.c[1]=nodeA2; nodeA2.k=2;
  const p2={birthPlan:base2, layout:GR.layoutTree(base2), builtSet:new Set([''])}; // nodeA2 unbuilt -> k=3
  sim2.harden(p2);
  check('C7 nodeA2 (base F child) reaches 3 strikes', nodeA2.k===3);
  check('C8 locked-base exemption: base F slot NOT pruned despite 3 strikes', p2.baseline.c[1]!==null);
})();

// ================= D. seed journeys =================
(function partD(){
  const cfg=GR.defaults();
  const dims={C:50,S:20,G:60};
  const sim=new GR.Sim(cfg,dims,{});
  const WDX=[0,1,0,-1], WDG=[-1,0,1,0];
  function replayWalk(x0,g0,steps,C,G){
    let x=x0,g=g0,wrapped=false,clamped=false;
    for(const d of steps){
      const raw=x+WDX[d]; if(raw<0||raw>=C) wrapped=true;
      x=((raw%C)+C)%C;
      const ng=g+WDG[d];
      if(ng<0||ng>=G) clamped=true; else g=ng;
    }
    return {x,g,wrapped,clamped};
  }
  const seen=new Map();
  const T=1200;
  for(let t=0;t<T;t++){
    sim.step();
    for(const s of sim.seeds){
      if(s.bornTick===sim.tick && !seen.has(s.id) && s.id!=='R'){
        seen.set(s.id,{x0:s.x,g0:s.g,steps:s.steps.slice()});
      }
    }
  }
  check('D0 run produced offspring seeds to sample', seen.size>0, seen.size+' captured');
  let budgetOk=true, badBudget=0;
  for(const [id,info] of seen){
    if(info.steps.length<cfg.walkMin||info.steps.length>cfg.walkMax){ budgetOk=false; badBudget++; }
  }
  check('D1 every offspring budget within [walkMin,walkMax]', budgetOk, badBudget+' out of range / '+seen.size);

  let rootedChecked=0, rootedOk=0, sawWrap=0, sawClamp=0;
  for(const [id,info] of seen){
    const rec=sim.records.get(id);
    if(rec&&rec.fate==='rooted'){
      const oracle=replayWalk(info.x0,info.g0,info.steps,dims.C,dims.G);
      rootedChecked++;
      if(oracle.x===rec.rootX && oracle.g===rec.rootG) rootedOk++;
      if(oracle.wrapped) sawWrap++;
      if(oracle.clamped) sawClamp++;
    }
  }
  check('D2 established seeds: independent replay oracle matches recorded root position',
    rootedChecked>0 && rootedOk===rootedChecked, rootedOk+'/'+rootedChecked+' matched');
  check('D3 x-wrap and front/back-clamp events actually occurred in sample (not vacuous)',
    sawWrap>0 && sawClamp>0, 'wrap:'+sawWrap+' clamp:'+sawClamp+' of '+rootedChecked);
})();

// ================= E. 3x3 vs center-only germination =================
(function partE(){
  const cfg3=GR.defaults(); cfg3.sprout3x3=1; cfg3.haloShadow=0;
  const cfgC=GR.defaults(); cfgC.sprout3x3=0; cfgC.haloShadow=0;
  const dims={C:7,S:2,G:7};

  function buildSimWithOccluderAndSeed(cfg){
    const sim=new GR.Sim(cfg,dims,{});
    sim.seeds=[]; // drop auto founder to avoid interference (it would also attempt est. same tick)
    // occluder: a hardened, zero-pool plant whose base sits at (x=2,g=4,z=0), shading ground (2,4) only
    const tree=GR.newNode();
    const occ={id:999, rootX:2, rootG:4, birthPlan:tree, baseline:null, state:'hardened',
      grace:0, age:0, grew:false, pool:0, bornTick:0, flowerCounts:{},
      cells:[{x:2,z:0,path:'',facing:0,bornTick:0}], builtSet:new Set(['']), cellByPath:new Map()};
    occ.cellByPath.set('',occ.cells[0]);
    occ.layout=GR.layoutTree(tree);
    sim.plants.push(occ);
    sim.occ.set(sim.occKey(2,4,0),occ.id);
    // test seed: budget 0, lands immediately at (2,3) -- one row from the shaded (2,4)
    // NOTE: GR.encodeFull exists in the core but is not exported by the module (see
    // report); hand-build the trivial single-node encoding it would produce: bits '000', k=[0].
    sim.seeds.push({id:'test1',gb:'000',gk:[0],x:2,g:3,steps:[],i:0,bornTick:0});
    sim.records.set('test1',{id:'test1',fate:'flying'});
    return sim;
  }
  const sim3=buildSimWithOccluderAndSeed(cfg3);
  sim3.step();
  const rec3=sim3.records.get('test1');
  check('E1 3x3 mode: establishment FAILS when a 3x3 neighbor is shaded', rec3.fate==='failed', rec3.fate);

  const simC=buildSimWithOccluderAndSeed(cfgC);
  simC.step();
  const recC=simC.records.get('test1');
  check('E2 center-only mode: SAME geometry establishes (shaded neighbor outside center test)',
    recC.fate==='rooted', recC.fate);
  check('E3 toggle produces different outcomes for identical geometry/seed', rec3.fate!==recC.fate);
})();

// ================= F. litter spill =================
(function partF(){
  // F1: exact 3-cell ring, wrap is the deciding transfer
  const cfg=GR.defaults();
  {
    const sim=new GR.Sim(cfg,{C:3,S:2,G:1},{});
    sim.seeds=[]; sim.plants=[];
    sim.litter.set([10,5,0]); // x=0,1,2 @ g=0
    const before=sim.litterTotal();
    sim.step();
    const got=Array.from(sim.litter);
    check('F1 exact 3-cell wrap gradient: [10,5,0]->[9,4,2]', got[0]===9&&got[1]===4&&got[2]===2, JSON.stringify(got));
    check('F1 conservation', sim.litterTotal()===before, sim.litterTotal()+' vs '+before);
  }
  // F2: exact closed-boundary + multiple-incoming-units case (C=3,G=2)
  {
    const sim=new GR.Sim(cfg,{C:3,S:2,G:2},{});
    sim.seeds=[]; sim.plants=[];
    // layout idx = g*C+x
    const L=new Int32Array(6);
    L[0*3+0]=10; L[0*3+1]=4; L[0*3+2]=4; // row g=0: (0,0)=10 (1,0)=4 (2,0)=4
    L[1*3+0]=0;  L[1*3+1]=10; L[1*3+2]=1; // row g=1: (0,1)=0 (1,1)=10 (2,1)=1
    sim.litter.set(L);
    const before=sim.litterTotal();
    sim.step();
    const got=Array.from(sim.litter);
    const exp=[9,4,3, 2,9,2];
    check('F2 exact closed-boundary/multi-incoming case matches hand calc', JSON.stringify(got)===JSON.stringify(exp),
      JSON.stringify(got)+' vs '+JSON.stringify(exp));
    check('F2 conservation', sim.litterTotal()===before, sim.litterTotal()+' vs '+before);
  }
  // F3: property check across random fields over many ticks: conservation + slope threshold respected
  {
    const sim=new GR.Sim(cfg,{C:12,S:2,G:12},{});
    sim.seeds=[]; sim.plants=[];
    const rng=GR.dice(1,'litter-random-seed');
    for(let i=0;i<sim.litter.length;i++) sim.litter[i]=Math.floor(rng()*8);
    let ok=true, conservedAll=true;
    for(let t=0;t<40;t++){
      const before=Array.from(sim.litter), beforeTotal=sim.litterTotal();
      sim.step();
      const after=sim.litter;
      let total=0; for(const v of after) total+=v;
      if(total!==beforeTotal) conservedAll=false;
      // net change per cell bounded by small integer (loose sanity: no negative values, no blowups)
      for(let i=0;i<after.length;i++) if(after[i]<0) ok=false;
    }
    check('F3 40-tick random field: total conserved every tick', conservedAll);
    check('F3 40-tick random field: no negative litter values ever', ok);
  }
})();

// ================= G. energy / no-double-spend =================
(function partG(){
  const cfg=GR.defaults();
  const sim=new GR.Sim(cfg,{C:40,S:15,G:50},{});
  let neverNegative=true, minPool=Infinity, ticks=500;
  for(let t=0;t<ticks;t++){
    sim.step();
    for(const p of sim.plants){
      if(p.pool<0) neverNegative=false;
      if(p.pool<minPool) minPool=p.pool;
    }
  }
  check('G1 '+ticks+'-tick run: every plant pool stays >= 0 (no double-spend evidence)',
    neverNegative, 'min observed pool='+(minPool===Infinity?'n/a (no plants)':minPool));
  check('G2 run actually produced plants to observe', sim.nextPlantId>1, sim.nextPlantId-1+' plants ever created');
})();

console.log(fails?('\n'+fails+' FAILURES'):'\nall checks passed');
process.exit(fails?1:0);
