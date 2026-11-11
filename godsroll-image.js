// Godsroll headless imaging: node godsroll-image.js <worldSeed> <haloSelf> <haloOthers> <tick1,tick2,...>
// Writes godsroll-s<seed>-h<halo>-t<tick>.bmp at iPhone portrait dims (390x844 css px, 4px cells).
const fs=require('fs'), path=require('path'), {execSync}=require('child_process');
const html=fs.readFileSync(path.join(__dirname,'godsroll-1.html'),'utf8');
const m=html.match(/\/\/ ==== GODSROLL CORE BEGIN ====([\s\S]*?)\/\/ ==== GODSROLL CORE END ====/);
const mod={exports:{}}; new Function('module',m[1])(mod); const GR=mod.exports;

const seed=+process.argv[2]||1, haloSelf=+process.argv[3], haloOthers=+process.argv[4];
const ticks=(process.argv[5]||'10000').split(',').map(Number).sort((a,b)=>a-b);
const cfg=GR.defaults(); cfg.worldSeed=seed; cfg.haloSelf=haloSelf; cfg.haloOthers=haloOthers;
let variant='';
if(process.argv[7]) variant='-'+process.argv[7];
if(process.argv[6]) for(const kv of process.argv[6].split(',')){ const [k,v]=kv.split('='); cfg[k]=+v; }
const dims=GR.dimsFromViewport(390,844,cfg.cellPx,cfg.skyFrac);
const {C,S,G}=dims, R=S+G, SCALE=3;

function writeBMP(file,sim){
  const W=C*SCALE, H=R*SCALE, rowBytes=W*4, imgSize=rowBytes*H;
  let lo=Infinity,hi=0;
  if(cfg.litterNorm){ for(const v of sim.litter){ if(v<lo)lo=v; if(v>hi)hi=v; } }
  const range=hi>lo?hi-lo:1;
  const b=Buffer.alloc(54+imgSize);
  b.write('BM',0); b.writeUInt32LE(54+imgSize,2); b.writeUInt32LE(54,10);
  b.writeUInt32LE(40,14); b.writeInt32LE(W,18); b.writeInt32LE(-H,22); // top-down
  b.writeUInt16LE(1,26); b.writeUInt16LE(32,28); b.writeUInt32LE(0,30); b.writeUInt32LE(imgSize,34);
  const px=(x,y,r,g,bl)=>{ const o=54+y*rowBytes+x*4; b[o]=bl; b[o+1]=g; b[o+2]=r; b[o+3]=255; };
  for(let row=0;row<R;row++) for(let x=0;x<C;x++){
    let r=0,g=0,bl=0;
    const i=row*C+x, fp=sim.frontP[i], fc=sim.frontC[i];
    if(fp){
      const t=(G-1-fp.rootG)/Math.max(1,G-1);
      const L=(a2,b2)=>Math.round(a2+(b2-a2)*t);
      if(GR.isTip(fp.layout.byPath.get(fc.path).node)){
        r=L(235,125);g=L(140,95);bl=L(185,125); }
      else { r=L(cfg.stemFrontR,cfg.stemBackR);g=L(cfg.stemFrontG,cfg.stemBackG);bl=L(cfg.stemFrontB,cfg.stemBackB); }
    } else if(row>=S){
      const v=sim.litter[(row-S)*C+x];
      const a=cfg.litterNorm?Math.max(0,Math.min(1,(v-lo)/range)):Math.min(1,v*cfg.litterAlpha);
      r=Math.round(cfg.litterR*a); g=Math.round(cfg.litterG*a); bl=Math.round(cfg.litterB*a);
    } else { bl=Math.round(255*cfg.skyAlpha); }
    for(let dy=0;dy<SCALE;dy++) for(let dx=0;dx<SCALE;dx++) px(x*SCALE+dx,row*SCALE+dy,r,g,bl);
  }
  for(const s of sim.seeds){
    const x=s.x,row=S+s.g,a=cfg.seedAlpha;
    for(let dy=0;dy<SCALE;dy++) for(let dx=0;dx<SCALE;dx++){
      const o=54+(row*SCALE+dy)*rowBytes+(x*SCALE+dx)*4;
      b[o]=Math.round(b[o]*(1-a)+64*a); b[o+1]=Math.round(b[o+1]*(1-a)+176*a); b[o+2]=Math.round(b[o+2]*(1-a)+255*a);
    }
  }
  fs.writeFileSync(file,b);
}

const sim=new GR.Sim(cfg,dims,{});
const t0=Date.now();
for(const target of ticks){
  while(sim.tick<target){
    sim.step();
    // keep memory flat on long runs: drop ended lineage records (observational only)
    if(sim.tick%2000===0){
      for(const [id,r] of sim.records) if(r.fate==='failed'||r.end) sim.records.delete(id);
    }
  }
  let cells=0; for(const p of sim.plants) cells+=p.cells.length;
  const tag=`godsroll-s${seed}-h${haloSelf}${haloOthers}${variant}-t${target}`;
  writeBMP(tag+'.bmp',sim);
  try{ execSync(`sips -s format png ${tag}.bmp --out ${tag}.png >/dev/null 2>&1 && rm ${tag}.bmp`); }catch(e){}
  console.log(`t${target}: ${sim.plants.length} plants, ${cells} cells, ${sim.seeds.length} seeds, ${Math.round((Date.now()-t0)/1000)}s elapsed -> ${tag}.png`);
}
