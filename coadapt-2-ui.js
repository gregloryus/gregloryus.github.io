// coadapt-2-ui.js — excavation layer over the coadapt-2 core (C2).
// Snapshots every SNAP ticks; rewind scrubber; click-to-select; lineage panel;
// reroll genes/journey on any organism (keyed per-event dice => lawful causal divergence);
// ghost = the abandoned timeline rendered as pale outlines at the same tick.
'use strict';
(function(){
  const SNAP=500,MAXSNAPS=240;
  const VINE={keep:0.75,emit:1.5,absorbCap:1.5,seedCost:96,lifespan:192,lifespanPerCell:12,
    exposurePow:1,upkeep:0.05,dieback:1,dockReserve:48,seedFrom:'tip',initN:150};
  const cfg=Object.assign(C2.defaults(),VINE);
  const q=new URLSearchParams(location.search).get('cfg');
  if(q) Object.assign(cfg,JSON.parse(q));
  let rerolls={};
  let sim=new C2.Sim(cfg,rerolls);
  let snapshots=[],ghost=null,showGhost=false,ghostCache={};
  let selectedId=null,paused=false,speed=4,lastM=null;

  const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
  let px=Math.max(2,Math.floor(Math.min((innerWidth-300)/cfg.W,(innerHeight-160)/cfg.H)));
  canvas.width=cfg.W*px; canvas.height=cfg.H*px;
  const clock=document.getElementById('clock'),cctx=clock.getContext('2d');
  const hud=document.getElementById('hud'),selEl=document.getElementById('sel');
  const tl=document.getElementById('timeline'),tlabel=document.getElementById('tlabel');
  const ghostBtn=document.getElementById('ghostBtn');
  const seedBox=document.getElementById('seed');
  seedBox.value=cfg.worldSeed;

  function takeSnap(){
    snapshots.push({tick:sim.tick,data:JSON.stringify(sim.toJSON())});
    if(snapshots.length>MAXSNAPS) snapshots.splice(1,1); // thin oldest (keep the founder snap)
    tl.max=sim.tick;
  }
  function hardRestart(){
    rerolls={}; sim=new C2.Sim(cfg,rerolls);
    snapshots=[]; ghost=null; ghostCache={}; showGhost=false; ghostBtn.disabled=true;
    selectedId=null; selEl.style.display='none'; lastM=null;
    takeSnap();
  }
  function restoreTo(tick){ // rewind: restore nearest snapshot <= tick, replay to tick exactly
    let best=snapshots[0];
    for(const s of snapshots) if(s.tick<=tick&&s.tick>=best.tick) best=s;
    sim=C2.Sim.fromJSON(cfg,rerolls,JSON.parse(best.data),sim.records);
    while(sim.tick<tick) sim.step();
    snapshots=snapshots.filter(s=>s.tick<=sim.tick);
    if(!snapshots.length) takeSnap();
    lastM=null;
  }
  function orgById(id){ for(const o of sim.orgs) if(o.id===id) return o; return null; }
  function selectOrg(id){
    selectedId=id;
    renderSel();
  }
  function renderSel(){
    const rec=sim.records.get(selectedId);
    if(!selectedId||!rec){ selEl.style.display='none'; return; }
    const o=orgById(selectedId);
    const rr=rerolls[selectedId]||{g:0,j:0};
    let chain=[],pid=rec.parentId,n=0;
    while(pid&&n<8){ chain.push(pid); const pr=sim.records.get(pid); pid=pr?pr.parentId:null; n++; }
    selEl.style.display='block';
    selEl.innerHTML='<b style="color:hsl('+(rec.hueAtBirth*360)+',80%,60%)">■</b> '+selectedId
      +(o?' ('+o.state+', '+o.built.size+' cells)':' <i>(not alive now)</i>')
      +'<br>born t'+rec.bornTick+'  rerolls g'+(rr.g||0)+' j'+(rr.j||0)
      +'<br><button id="rrg">reroll genes</button> <button id="rrj">reroll journey</button>'
      +(chain.length?'<br>ancestors: '+chain.map(a=>'<span class="anc" data-a="'+a+'">'
        +a.slice(0,6)+'</span>').join(' → '):'');
    document.getElementById('rrg').onclick=()=>reroll('g');
    document.getElementById('rrj').onclick=()=>reroll('j');
    for(const el of selEl.querySelectorAll('.anc'))
      el.onclick=()=>{ if(sim.records.get(el.dataset.a)) selectOrg(el.dataset.a); };
  }
  function reroll(kind){
    const rec=sim.records.get(selectedId);
    if(!rec||rec.bornTick===0) return; // founders have no birth event to reroll
    // the abandoned timeline becomes the ghost
    ghost={snaps:snapshots.map(s=>({tick:s.tick,data:s.data})),lastTick:sim.tick};
    ghostCache={}; ghostBtn.disabled=false; showGhost=true; ghostBtn.textContent='ghost ✓';
    const rr=rerolls[selectedId]||{g:0,j:0};
    rerolls[selectedId]={g:rr.g+(kind==='g'?1:0),j:rr.j+(kind==='j'?1:0)};
    restoreTo(Math.max(0,rec.bornTick-1));
    paused=false;
  }
  // controls
  document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'play':'pause';};
  document.getElementById('step1').onclick=()=>{sim.step();draw(true);};
  document.getElementById('speed').onclick=e=>{speed=speed>=64?1:speed*4;e.target.textContent='speed x'+speed;};
  ghostBtn.onclick=()=>{showGhost=!showGhost;ghostBtn.textContent=showGhost?'ghost ✓':'ghost';};
  document.getElementById('go').onclick=()=>{cfg.worldSeed=+seedBox.value||1;hardRestart();};
  document.getElementById('reseed').onclick=()=>{cfg.worldSeed=Math.floor(Math.random()*1e9);seedBox.value=cfg.worldSeed;hardRestart();};
  tl.oninput=()=>{ tlabel.textContent='rewind to t'+tl.value; };
  tl.onchange=()=>{ restoreTo(+tl.value); tlabel.textContent=''; };
  canvas.onclick=e=>{
    const r=canvas.getBoundingClientRect();
    const x=Math.floor((e.clientX-r.left)/px),y=Math.floor((e.clientY-r.top)/px);
    const o=sim.occ[y*cfg.W+x];
    if(o) selectOrg(o.id);
  };
  // dials + paste (same pattern as coadapt-1)
  const DIALS=['keep','emit','absorbCap','exposurePow','upkeep','dieback','dockReserve',
    'cellCost','seedCost','lifespan','lifespanPerCell','seedFrom','D','muTree','muHue',
    'sigma','bodyMode','W','H','initN'];
  const dialsEl=document.getElementById('dials'),dialIn={};
  for(const k of DIALS){
    const lab=document.createElement('label'); lab.textContent=k; lab.style.color='#777';
    const inp=document.createElement('input');
    inp.value=typeof cfg[k]==='number'&&!isFinite(cfg[k])?'Infinity':String(cfg[k]);
    inp.style.width='100%';
    dialsEl.appendChild(lab); dialsEl.appendChild(inp); dialIn[k]=inp;
  }
  function applyCfg(patch){
    Object.assign(cfg,patch);
    for(const k of DIALS) dialIn[k].value=typeof cfg[k]==='number'&&!isFinite(cfg[k])?'Infinity':String(cfg[k]);
    px=Math.max(2,Math.floor(Math.min((innerWidth-300)/cfg.W,(innerHeight-160)/cfg.H)));
    canvas.width=cfg.W*px; canvas.height=cfg.H*px;
    hardRestart();
  }
  document.getElementById('apply').onclick=()=>{
    const patch={};
    for(const k of DIALS){
      const v=dialIn[k].value.trim();
      if(v==='Infinity') patch[k]=Infinity;
      else if(v!==''&&!isNaN(+v)) patch[k]=+v;
      else patch[k]=v;
    }
    applyCfg(patch);
  };
  document.getElementById('pasteGo').onclick=()=>{
    const t=document.getElementById('paste').value.trim(),msg=document.getElementById('pasteMsg');
    try{
      let j=t;
      const m=t.match(/cfg=([^&\s]+)/);
      if(m) j=decodeURIComponent(m[1]);
      applyCfg(JSON.parse(j));
      msg.textContent='loaded ✓';
    }catch(e){ msg.textContent='could not parse: '+e.message; }
  };

  function draw(force){
    ctx.fillStyle='#0a0a0c'; ctx.fillRect(0,0,canvas.width,canvas.height);
    for(const o of sim.orgs){
      ctx.fillStyle='hsl('+(o.hue*360)+',80%,'+(o.state==='hardened'?55:40)+'%)';
      for(const idx of o.built.values())
        ctx.fillRect((idx%cfg.W)*px,Math.floor(idx/cfg.W)*px,px,px);
    }
    // silhouettes + flux seams
    const occ=sim.occ,W=cfg.W,H=cfg.H,et=Math.max(1,Math.round(px/4));
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const o=occ[y*W+x]; if(!o) continue;
      const r=occ[y*W+((x+1)%W)],d=occ[((y+1)%H)*W+x];
      if(r!==o){
        const m=r?C2.matchK(o.hue,r.hue,cfg):0;
        ctx.fillStyle=r&&m>0?'rgba(255,255,255,'+(0.9*m)+')':'rgba(0,0,0,0.65)';
        ctx.fillRect((x+1)*px-et,y*px,et,px);
      }
      if(d!==o){
        const m=d?C2.matchK(o.hue,d.hue,cfg):0;
        ctx.fillStyle=d&&m>0?'rgba(255,255,255,'+(0.9*m)+')':'rgba(0,0,0,0.65)';
        ctx.fillRect(x*px,(y+1)*px-et,px,et);
      }
    }
    // ghost: the abandoned timeline at (nearest snapshot <=) the same tick, pale outlines
    if(showGhost&&ghost){
      let gs=null;
      for(const s of ghost.snaps) if(s.tick<=sim.tick&&(!gs||s.tick>gs.tick)) gs=s;
      if(gs){
        if(!ghostCache[gs.tick]) ghostCache[gs.tick]=JSON.parse(gs.data);
        ctx.strokeStyle='rgba(200,200,255,0.4)'; ctx.lineWidth=1;
        for(const o of ghostCache[gs.tick].orgs){
          const lay=C2.layoutTree(C2.decodeBits(o.tree));
          for(const p of o.builtPaths){
            const rec=lay.byPath.get(p); if(!rec) continue;
            const idx=C2.worldXY(rec.px,rec.pz,o.facing,o.rx,o.ry,W,H);
            ctx.strokeRect((idx%W)*px+0.5,Math.floor(idx/W)*px+0.5,px-1,px-1);
          }
        }
        ctx.fillStyle='rgba(200,200,255,0.7)';
        ctx.fillText('ghost t'+gs.tick,6,12);
      }
    }
    // selected organism highlight
    if(selectedId){
      const o=orgById(selectedId);
      if(o){
        ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2;
        for(const idx of o.built.values())
          ctx.strokeRect((idx%W)*px+1,Math.floor(idx/W)*px+1,px-2,px-2);
      }
    }
    if(force||sim.tick%60===0||!lastM) lastM=C2.metricsOf(sim);
    const m=lastM;
    hud.textContent='t '+sim.tick+'  orgs '+m.orgs+'  cells '+m.cells+'  mean '+m.meanCells.toFixed(1)
      +'  cA '+m.cA.toFixed(3)+'  flux '+(100*m.fluxShare).toFixed(1)+'%'
      +'  R2 '+m.R2.toFixed(2)+'  R1 '+m.R1.toFixed(2)+'  axis '+m.phi.toFixed(3)
      +'  rerolls '+Object.keys(rerolls).length;
    cctx.fillStyle='#0a0a0c'; cctx.fillRect(0,0,140,140);
    cctx.strokeStyle='#333'; cctx.beginPath(); cctx.arc(70,70,60,0,2*Math.PI); cctx.stroke();
    for(const o of sim.orgs){
      const a=2*Math.PI*o.hue;
      cctx.fillStyle='hsl('+(o.hue*360)+',80%,55%)';
      cctx.fillRect(70+58*Math.cos(a)-1,70+58*Math.sin(a)-1,2,2);
    }
    const pa=2*Math.PI*m.phi;
    cctx.strokeStyle='#888'; cctx.beginPath();
    cctx.moveTo(70+66*Math.cos(pa),70+66*Math.sin(pa));
    cctx.lineTo(70-66*Math.cos(pa),70-66*Math.sin(pa)); cctx.stroke();
    tl.max=Math.max(+tl.max,sim.tick); tl.value=sim.tick;
    if(selectedId&&sim.tick%30===0) renderSel();
  }
  function loop(){
    if(!paused){
      for(let i=0;i<speed;i++){
        sim.step();
        if(sim.tick%SNAP===0) takeSnap();
      }
    }
    draw();
    requestAnimationFrame(loop);
  }
  takeSnap();
  loop();
})();
