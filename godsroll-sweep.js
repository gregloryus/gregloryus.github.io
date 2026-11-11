// Godsroll sweep harness: node godsroll-sweep.js '<json overrides>' <label> [ticks] [worldSeed]
// Runs headlessly at iPhone-portrait dims, writes sweep/<label>.json (time series + death
// histogram), sweep/<label>-mid.png and -end.png, and prints a one-line summary.
const fs=require('fs'), path=require('path'), {execSync}=require('child_process');
const html=fs.readFileSync(path.join(__dirname,process.env.GR_SRC||'godsroll-1.html'),'utf8');
const m=html.match(/\/\/ ==== GODSROLL CORE BEGIN ====([\s\S]*?)\/\/ ==== GODSROLL CORE END ====/);
const mod={exports:{}}; new Function('module',m[1])(mod); const GR=mod.exports;

const overrides=JSON.parse(process.argv[2]||'{}');
const label=(process.argv[3]||'run').replace(/[^\w.-]/g,'_');
const TICKS=+process.argv[4]||30000;
const cfg=GR.defaults(); Object.assign(cfg,overrides);
if(process.argv[5]) cfg.worldSeed=+process.argv[5];
const dims=GR.dimsFromViewport(390,844,cfg.cellPx,cfg.skyFrac);
const {C,S,G}=dims, R=S+G, SCALE=3;
fs.mkdirSync(path.join(__dirname,'sweep'),{recursive:true});

function png(sim,name){
  const W=C*SCALE,H=R*SCALE,rowBytes=W*4,imgSize=rowBytes*H;
  const b=Buffer.alloc(54+imgSize);
  b.write('BM',0);b.writeUInt32LE(54+imgSize,2);b.writeUInt32LE(54,10);
  b.writeUInt32LE(40,14);b.writeInt32LE(W,18);b.writeInt32LE(-H,22);
  b.writeUInt16LE(1,26);b.writeUInt16LE(32,28);b.writeUInt32LE(imgSize,34);
  let lo=Infinity,hi=0;
  for(const v of sim.litter){ if(v<lo)lo=v; if(v>hi)hi=v; }
  const range=hi>lo?hi-lo:1;
  for(let row=0;row<R;row++) for(let x=0;x<C;x++){
    let r=0,g=0,bl=0;
    const i=row*C+x, fp=sim.frontP[i], fc=sim.frontC[i];
    if(fp){
      const t=(G-1-fp.rootG)/Math.max(1,G-1), L=(a,b2)=>Math.round(a+(b2-a)*t);
      if(GR.isTip(fp.layout.byPath.get(fc.path).node)){ r=L(235,125);g=L(140,95);bl=L(185,125); }
      else { r=L(cfg.stemFrontR,cfg.stemBackR);g=L(cfg.stemFrontG,cfg.stemBackG);bl=L(cfg.stemFrontB,cfg.stemBackB); }
    } else if(row>=S){
      const v=sim.litter[(row-S)*C+x];
      const a=cfg.litterNorm?Math.max(0,Math.min(1,(v-lo)/range)):Math.min(1,v*cfg.litterAlpha);
      r=Math.round(cfg.litterR*a);g=Math.round(cfg.litterG*a);bl=Math.round(cfg.litterB*a);
    } else bl=Math.round(255*cfg.skyAlpha);
    for(let dy=0;dy<SCALE;dy++) for(let dx=0;dx<SCALE;dx++){
      const o=54+(row*SCALE+dy)*rowBytes+(x*SCALE+dx)*4;
      b[o]=bl;b[o+1]=g;b[o+2]=r;b[o+3]=255;
    }
  }
  const f=path.join(__dirname,'sweep',label+'-'+name);
  fs.writeFileSync(f+'.bmp',b);
  try{ execSync(`sips -s format png "${f}.bmp" --out "${f}.png" >/dev/null 2>&1 && rm "${f}.bmp"`); }catch(e){}
}

const sim=new GR.Sim(cfg,dims,{});
const deaths={}; let births=0, perTickDeaths=0;
const kill0=sim.kill.bind(sim);
sim.kill=(p,how,t)=>{ deaths[how]=(deaths[how]||0)+1; perTickDeaths++; kill0(p,how,t); };
const est0=sim.establish.bind(sim);
sim.establish=(...a)=>{ births++; est0(...a); };

const series=[], deathHist={};
const t0=Date.now();
for(let i=1;i<=TICKS;i++){
  perTickDeaths=0;
  sim.step();
  deathHist[perTickDeaths]=(deathHist[perTickDeaths]||0)+1;
  if(sim.tick%250===0){
    const gset=new Map(); let cells=0,planSum=0,maxPlan=0,hSum=0;
    for(const p of sim.plants){
      cells+=p.cells.length; planSum+=p.planSize; if(p.planSize>maxPlan)maxPlan=p.planSize;
      let mz=0; for(const c of p.cells) if(c.z>mz)mz=c.z; hSum+=mz;
      const k=GR.encodeBits(p.birthPlan); gset.set(k,(gset.get(k)||0)+1);
    }
    let dom=0; for(const v of gset.values()) if(v>dom)dom=v;
    const n=sim.plants.length;
    series.push({t:sim.tick,plants:n,cells,seeds:sim.seeds.length,genomes:gset.size,
      domShare:n?+(dom/n).toFixed(3):0,meanPlan:n?+(planSum/n).toFixed(1):0,maxPlan,
      meanH:n?+(hSum/n).toFixed(1):0,births,deaths:{...deaths},litter:sim.litterTotal()});
    for(const [id,r] of sim.records) if(r.fate==='failed'||r.end) sim.records.delete(id);
  }
  if(sim.tick===Math.max(250,Math.floor(TICKS/3))) png(sim,'mid');
  if(sim.plants.length===0&&sim.seeds.length===0){ png(sim,'extinct-t'+sim.tick); break; }
}
png(sim,'end');
fs.writeFileSync(path.join(__dirname,'sweep',label+'.json'),
  JSON.stringify({overrides,worldSeed:cfg.worldSeed,dims,series,deathHist},null,1));

const last=series[series.length-1]||{};
const tail=series.slice(Math.floor(series.length/2));
const mean=tail.reduce((s,r)=>s+r.plants,0)/Math.max(1,tail.length);
const sd=Math.sqrt(tail.reduce((s,r)=>s+(r.plants-mean)**2,0)/Math.max(1,tail.length));
const maxAv=Math.max(...Object.keys(deathHist).map(Number));
console.log(`${label}: t${sim.tick} plants=${last.plants||0} popCV=${(sd/Math.max(1,mean)).toFixed(3)} genomes=${last.genomes||0} dom=${last.domShare||0} meanPlan=${last.meanPlan||0} meanH=${last.meanH||0} maxDeathAvalanche=${maxAv} deaths=${JSON.stringify(deaths)} ${Math.round((Date.now()-t0)/1000)}s`);
