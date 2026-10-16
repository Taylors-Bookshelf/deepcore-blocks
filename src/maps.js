// The daily world map: a generator (pure, runs in Node too) and a canvas renderer.
// Every Pacific-time day gets a different surface (weather, scenery, trees) and a different set of tunnels, but always the same
// 24 boards (6 zones of 4) plus a strip-mine branch per zone. The cave is dug open board by board as the player clears them.
(function(root){
const D=(typeof require!=='undefined'&&typeof module!=='undefined')?require('./data.js'):root.DeepcoreData;
// rows 0-5 sky, row 6 grass line; every layer below gets a band tall enough for its boards; the Ancient Core is a cavern at the bottom
const COLS=10, SURFACE=6, PITCH=1.55, CORE_ROWS=12;
const NZ=D.ZONES.length, NB=D.BOARD_COUNT;
const ZONE_TOP=[0]; D.ZONES.forEach((z,i)=>{ if(i===0) return; const prev=D.ZONES[i-1]; ZONE_TOP[i]=i===1?13:ZONE_TOP[i-1]+2.2+prev.boards*PITCH; });
ZONE_TOP.forEach((v,i)=>ZONE_TOP[i]=Math.round(v));
const ROWS=ZONE_TOP[NZ-1]+CORE_ROWS;
const zoneAt=row=>{ let z=0; for(let k=1;k<ZONE_TOP.length;k++) if(row>=ZONE_TOP[k]) z=k; return z; };
const WEATHER=['clear','clear','cloudy','overcast','rain','snow','sunset','dusk'];
const SCENERY=['mountains','hills','lake','meadow','mountains','lake','hills'];
const TREES=['oak','pine','birch','mixed','autumn','mixed'];
const FEATURES=[ ['pebbles','pebbles','pebbles'], ['rails','mushrooms','bones'], ['pebbles','rails','mushrooms'], ['geode','rails','bones'], ['crystals','geode','crystals'], ['lavafall','embers','crystals'], ['embers','embers','lavafall'], [] ];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------------------------------------------------------- generator
function genMap(seed,day){
  day=day||seed;
  const rnd=D.rng(D.hashStr('map:'+seed)+3), pick=a=>a[Math.floor(rnd()*a.length)], rr=(a,b)=>a+rnd()*(b-a);
  const sky=D.rng(D.hashStr('sky:'+day)+5), spick=a=>a[Math.floor(sky()*a.length)], sr=(a,b)=>a+sky()*(b-a);   // the surface changes every day
  const m={day, seed, weather:spick(WEATHER), scenery:spick(SCENERY), trees:spick(TREES), leaf:sky(), nodes:[], segs:[], strip:[], tunnelW:[], features:[], trees_list:[], clouds:[], peaks:[], lake:null, camps:[]};
  // ---- node positions: a random walk down the shaft, a different shape every run
  const ys=[5.4, 8.1+rr(-.5,.5), 9.9+rr(-.3,.3), 11.6+rr(-.3,.3)];
  for(let z=1;z<NZ;z++){ const n=D.ZONES[z].boards;
    if(D.ZONES[z].core){ ys.push(ZONE_TOP[z]+CORE_ROWS*.66-2.22); continue; }
    for(let k=0;k<n;k++) ys.push(ZONE_TOP[z]+1.6+k*PITCH+rr(-.2,.2)); }
  let x=rr(1.4,8.6), dir=rnd()<.5?-1:1;
  for(let i=0;i<NB;i++){
    if(D.ZONES[D.zoneOfIdx(i)].core){ m.nodes.push({x:5,y:+ys[i].toFixed(2)}); continue; }
    if(i>0){ let step=dir*rr(1.6,3.6); let nx=x+step; if(nx<1.5||nx>8.5){ dir=-dir; nx=x+dir*rr(1.6,3.6); } x=clamp(nx,1.5,8.5); if(rnd()<.3) dir=-dir; }
    m.nodes.push({x:+x.toFixed(2),y:+ys[i].toFixed(2)});
  }
  // ---- tunnels between nodes: straight, elbow or wiggle, with a width per zone
  for(let z=0;z<NZ;z++) m.tunnelW.push(D.ZONES[z].core?.9:pick([.45,.55,.65]));   // narrow, tidy tunnels
  for(let i=1;i<NB;i++){
    const a=m.nodes[i-1], b=m.nodes[i], z=D.zoneOfIdx(i), style=i===1||D.ZONES[z].core?'diag':pick(['diag','elbowV','elbowH','wiggle','diag']);
    let pts=[[a.x,a.y],[b.x,b.y]];
    if(style==='elbowV') pts=[[a.x,a.y],[a.x,b.y],[b.x,b.y]];
    if(style==='elbowH') pts=[[a.x,a.y],[b.x,a.y],[b.x,b.y]];
    if(style==='wiggle'){ const mx=(a.x+b.x)/2+rr(-1.2,1.2), my=(a.y+b.y)/2; pts=[[a.x,a.y],[clamp(mx,.8,9.2),my],[b.x,b.y]]; }
    m.segs.push({from:i-1,to:i,pts,w:m.tunnelW[z]});
  }
  // ---- side tunnel: sideways from each layer's third board, at the same depth (none for the Core)
  for(let z=0;z<NZ;z++){
    if(D.ZONES[z].core){ m.strip.push(null); continue; }
    const from=D.idxOf(z,2), p=m.nodes[from]; let best=null;
    for(let t=0;t<30&&!best;t++){
      const side=(t%2===0?(p.x<5?1:-1):(p.x<5?-1:1)), sx=clamp(p.x+side*rr(2.4,3.6),1.1,8.9), sy=+(p.y+(z===0?.15:rr(-.1,.35))).toFixed(2);
      const clear=m.nodes.every((n,i)=>i===from||Math.hypot(n.x-sx,n.y-sy)>=1.5) && Math.abs(sx-p.x)>=2 && m.strip.every(o=>!o||Math.hypot(o.x-sx,o.y-sy)>=1.5);
      if(clear||t===29) best={x:+sx.toFixed(2),y:sy,from,side,zone:z};
    }
    m.strip.push(best);
  }
  // ---- camps in Magmastone, beside the boards that end each stretch
  (D.ZONES[D.MAGMA_Z].camps||[]).forEach(c=>{ const n=m.nodes[D.idxOf(D.MAGMA_Z,c-1)]; m.camps.push({idx:D.idxOf(D.MAGMA_Z,c-1),x:+clamp(n.x+(n.x<5?1.1:-1.1),.6,9.4).toFixed(2),y:n.y}); });
  // ---- decorations in the rock
  for(let z=0;z<NZ;z++){ if(!FEATURES[z].length) continue; const top=z===0?7.5:ZONE_TOP[z]+.5, bot=(z===NZ-1?ROWS-3:ZONE_TOP[z+1])-.8, per=Math.max(4,Math.round((bot-top)/2.5));
    const kinds=[pick(FEATURES[z]),pick(FEATURES[z]),pick(FEATURES[z])];
    kinds.forEach(k=>{ for(let n=0;n<per/3;n++) m.features.push({type:k,zone:z,x:+rr(.3,9.5).toFixed(2),y:+rr(top,bot).toFixed(2),s:rnd()}); }); }
  // ---- surface
  m.scale=sky();
  m.sun={x:sr(1,9),y:sr(.9,1.9)};
  const nc=m.weather==='clear'?3:m.weather==='cloudy'?7:m.weather==='overcast'?9:m.weather==='rain'?8:m.weather==='snow'?7:4;
  for(let i=0;i<nc;i++) m.clouds.push({x:sr(-1,9.5),y:sr(.3,3.2),w:sr(1.6,3.6),s:sky()});
  const px=m.nodes[0].x;
  if(m.scenery==='lake'){ let w=sr(2.6,3.8), x0=px<5?sr(5,6.6):sr(.6,2.2); m.lake={x0:+Math.max(.2,x0).toFixed(2),x1:+Math.min(9.8,x0+w).toFixed(2)}; }
  for(let i=0;i<4;i++) m.peaks.push({x:sr(-.5,10),h:sr(1.6,3.4),w:sr(1.8,3.6)});
  for(let tx=sr(.2,.9); tx<9.9; tx+=sr(.95,2.1)){
    if(Math.abs(tx-px)<.8) continue; if(m.lake&&tx>m.lake.x0-.2&&tx<m.lake.x1+.2) continue;
    m.trees_list.push({x:+tx.toFixed(2),h:+sr(1.7,3.4).toFixed(2),kind:m.trees==='mixed'?spick(['oak','pine','birch']):m.trees==='autumn'?'oak':m.trees,tone:sky()});
  }
  return m;
}

// ---------------------------------------------------------------- renderer
const HEX=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
// st: {dug:(nodeIdx)=>bool, stripOpen:(z)=>bool, stripDone:(z)=>bool, maxY:deepest dug depth, now:ms for the core's shimmer}
function drawMap(cv,ts,m,st,TEX,dpr){
  const W=COLS*ts, H=ROWS*ts;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px';
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.imageSmoothingEnabled=false;
  const R=D.rng(D.hashStr('maptex:'+m.day)+9), q=ts/16;
  const F=(a,b,w,h,c)=>{ x.fillStyle=c; x.fillRect(a*ts,b*ts,w*ts,h*ts); };           // tile-unit rect
  const sky={clear:['#3b78cf','#a9d6f0'],cloudy:['#4b78b8','#bcd6e6'],overcast:['#66757f','#a9b4bb'],rain:['#44525f','#869aa8'],snow:['#8499b2','#dfe8f0'],sunset:['#3a2a6a','#ff9a5a'],dusk:['#1e2a5a','#8a74b0']}[m.weather];
  const g=x.createLinearGradient(0,0,0,SURFACE*ts); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); x.fillStyle=g; x.fillRect(0,0,W,SURFACE*ts);
  // sun, moon, stars
  if(m.weather==='clear'||m.weather==='cloudy'){ const c=m.weather==='clear'?'#fff4b0':'#f7ecc4'; x.fillStyle=c; x.fillRect((m.sun.x-.45)*ts,(m.sun.y-.45)*ts,.9*ts,.9*ts); x.fillStyle='rgba(255,244,176,.25)'; x.fillRect((m.sun.x-.75)*ts,(m.sun.y-.75)*ts,1.5*ts,1.5*ts); }
  if(m.weather==='sunset'){ x.fillStyle='#ffd27a'; x.fillRect((m.sun.x-.6)*ts,(SURFACE-1.25)*ts,1.2*ts,1.25*ts); x.fillStyle='rgba(255,170,90,.3)'; x.fillRect((m.sun.x-1.2)*ts,(SURFACE-2)*ts,2.4*ts,2*ts); }
  if(m.weather==='dusk'){ for(let i=0;i<26;i++) F(R()*10,R()*4.2,.07,.07,'#fff6d8'); x.fillStyle='#f4f0dc'; x.beginPath(); x.arc(m.sun.x*ts,1.3*ts,.5*ts,0,7); x.fill(); x.fillStyle=sky[0]; x.beginPath(); x.arc((m.sun.x+.22)*ts,1.2*ts,.45*ts,0,7); x.fill(); }
  // distant scenery: mountains or hills
  const ridge=(col,base,amp,seed,step)=>{ x.fillStyle=col; for(let c=0;c<W;c+=step){ const t=c/ts, h=amp*(.55+.45*Math.sin(t*1.7+seed)*Math.cos(t*.9+seed*2))+amp*.25*Math.sin(t*4.1+seed); x.fillRect(c,(base-Math.max(.1,h))*ts,step+1,Math.max(.1,h)*ts+1); } };
  if(m.scenery==='mountains'){ ridge(m.weather==='dusk'||m.weather==='sunset'?'#4b3f6e':'#7f94ad',SURFACE,2.6,m.peaks[0].x,q*2);
    m.peaks.forEach(p=>{ const px=p.x*ts; x.fillStyle=m.weather==='sunset'?'#6a4a7a':'#6f86a2'; for(let r=0;r<p.h*8;r++){ const wd=(p.w*ts)*(1-r/(p.h*8)); x.fillRect(px-wd/2,(SURFACE-r/8)*ts,wd,ts/8+1); }
      x.fillStyle='#f4f7fb'; for(let r=Math.floor(p.h*8*.72);r<p.h*8;r++){ const wd=(p.w*ts)*(1-r/(p.h*8)); x.fillRect(px-wd/2,(SURFACE-r/8)*ts,wd,ts/8+1); } }); }
  else if(m.scenery==='hills'){ ridge(m.weather==='dusk'?'#2f4a58':'#5d9a58',SURFACE,1.4,2.1,q*2); ridge(m.weather==='dusk'?'#27414a':'#4b8648',SURFACE,.9,5.3,q*2); }
  // clouds
  const cloudCol={clear:'rgba(255,255,255,.9)',cloudy:'rgba(255,255,255,.88)',overcast:'rgba(210,216,222,.95)',rain:'rgba(120,132,144,.95)',snow:'rgba(236,242,248,.95)',sunset:'rgba(255,196,170,.8)',dusk:'rgba(150,140,190,.7)'}[m.weather];
  m.clouds.forEach(c=>{ x.fillStyle=cloudCol; x.fillRect(c.x*ts,c.y*ts,c.w*ts,ts*.34); x.fillRect((c.x+.3)*ts,(c.y-.24)*ts,(c.w-.7)*ts,ts*.3); x.fillRect((c.x+c.w*.35)*ts,(c.y-.4)*ts,c.w*.3*ts,ts*.2); });
  if(m.weather==='rain'){ x.strokeStyle='rgba(190,214,236,.55)'; x.lineWidth=Math.max(1,q*.6); for(let i=0;i<70;i++){ const rx=R()*W, ry=R()*SURFACE*ts; x.beginPath(); x.moveTo(rx,ry); x.lineTo(rx-q*1.6,ry+q*4.2); x.stroke(); } }
  if(m.weather==='snow'){ x.fillStyle='#fff'; for(let i=0;i<60;i++) x.fillRect(R()*W,R()*SURFACE*ts,q*1.2,q*1.2); }
  // ground: grass line then dirt, with a lake cut into the surface if the day has one
  for(let row=SURFACE;row<ROWS;row++) for(let col=0;col<COLS;col++){
    const zi=zoneAt(row); let tex=zi===0?(row===SURFACE?'grass':'dirt'):D.ZONES[zi].rock;   // the Core's cavern is cut out of crust rock
    x.drawImage(TEX[tex],col*ts,row*ts,ts,ts);
    if(m.weather==='snow'&&row===SURFACE){ x.fillStyle='rgba(245,250,255,.82)'; x.fillRect(col*ts,row*ts,ts,ts*.34); }
  }
  // ore flecks scattered through the walls
  for(let row=SURFACE+2;row<ROWS;row++) for(let col=0;col<COLS;col++){ const zi=zoneAt(row), z=D.ZONES[zi]; if(zi>0&&R()<.1&&z.ores.length){ const o=z.ores[Math.floor(R()*z.ores.length)], t=TEX[o+'@'+z.rock]; if(t) x.drawImage(t,col*ts,row*ts,ts,ts); } }
  x.fillStyle='rgba(0,0,0,.26)'; x.fillRect(0,(SURFACE+1)*ts,W,(ROWS-SURFACE-1)*ts);
  if(m.lake){ const w0=m.lake.x0*ts, w1=m.lake.x1*ts; x.fillStyle=m.weather==='snow'?'#bfd8ea':'#2f7fc4'; x.fillRect(w0,(SURFACE+.06)*ts,w1-w0,.94*ts); x.fillStyle='rgba(255,255,255,.28)'; for(let k=0;k<7;k++) x.fillRect(w0+R()*(w1-w0-ts*.7),(SURFACE+.2+R()*.55)*ts,ts*(.4+R()*.4),q);
    x.fillStyle='#2f6b22'; for(let k=0;k<5;k++){ const rx=(k%2?w0:w1)+(R()-.5)*ts*.4; x.fillRect(rx,(SURFACE-.45)*ts,q*1.4,.5*ts); } }

  // ---- tunnels: only what has been dug
  const carve=new Set(), lit=[];
  const brush=(px,py,r,top=SURFACE+1)=>{ for(let dy=-r;dy<=r;dy+=.25) for(let dx=-r;dx<=r;dx+=.25){ if(dx*dx+dy*dy>r*r) continue; const cx=Math.floor(px+dx), cy=Math.floor(py+dy); if(cy>=top&&cx>=0&&cx<COLS) carve.add(cy*COLS+cx); } };
  const walk=(pts,w,top)=>{ for(let k=1;k<pts.length;k++){ const [ax,ay]=pts[k-1],[bx,by]=pts[k]; const len=Math.hypot(bx-ax,by-ay); for(let s=0;s<=len;s+=.18){ const t=len?s/len:0; brush(ax+(bx-ax)*t,ay+(by-ay)*t,w,top); } } };
  m.segs.forEach(sg=>{ if(st.dug(sg.to)) walk(sg.pts,sg.w,sg.from===0?SURFACE:SURFACE+1); });   // the first tunnel breaks through the grass: an open pit, not a roofed cave
  m.nodes.forEach((n,i)=>{ if(st.dug(i)&&n.y>SURFACE+.8) brush(n.x,n.y,.85); });
  m.strip.forEach((s,z)=>{ if(!s||!st.stripOpen(z)) return; const p=m.nodes[s.from]; walk([[p.x,p.y],[s.x,p.y],[s.x,s.y]],.5); brush(s.x,s.y,st.stripDone(z)?1.6:1.05); });
  // lamps light the way on their own: one beside every other dug board (torches in the Forest, lanterns below)
  const lamps=[]; m.nodes.forEach((n,i)=>{ const z=D.zoneOfIdx(i); if(i===0||D.ZONES[z].core||!st.dug(i)||(i%2&&D.jOfIdx(i)!==0)) return; const side=n.x<5?1:-1; lamps.push({z,x:+clamp(n.x+side*.95,.4,9.6).toFixed(2),y:n.y-.25}); });
  lamps.forEach(l=>brush(l.x,l.y,.3));
  (m.camps||[]).forEach(c=>{ if(st.dug(c.idx)) brush(c.x,c.y,.75); });
  carve.forEach(k=>{ const row=Math.floor(k/COLS), col=k%COLS, zi=zoneAt(row); x.fillStyle=zi===0?'rgba(24,14,8,.86)':'rgba(8,6,4,.88)'; x.fillRect(col*ts,row*ts,ts,ts); });
  // decorations (only in rock near dug ground, never inside a tunnel)
  const reveal=st.maxY;
  m.features.forEach(f=>{ if(f.y>reveal+3.5||f.y<SURFACE+1.5) return; const col=Math.floor(f.x), row=Math.floor(f.y); if(carve.has(row*COLS+col)) return; drawFeature(x,f,ts,q); });
  // rails + supports along dug tunnels in the stone zones
  m.segs.forEach(sg=>{ const z=D.zoneOfIdx(sg.to); if(!st.dug(sg.to)||!(z>=1&&z<=3)||!m.features.some(f=>f.zone===z&&f.type==='rails')) return; const [ax,ay]=sg.pts[0],[bx,by]=sg.pts[sg.pts.length-1];
    [.35,.75].forEach(t=>{ const px=ax+(bx-ax)*t, py=ay+(by-ay)*t; F(px-.42,py-.7,.12,.7,'#5a3d20'); F(px+.3,py-.7,.12,.7,'#5a3d20'); F(px-.5,py-.78,1,.12,'#6f4c28'); F(px-.5,py-.78,1,.04,'#8a6236'); }); });
  // lamps with a warm halo: lit tunnels glow, so the way you've lit is easy to see
  lamps.forEach(l=>{ const gr=x.createRadialGradient(l.x*ts,l.y*ts,0,l.x*ts,l.y*ts,ts*2.2); gr.addColorStop(0,'rgba(255,196,90,.42)'); gr.addColorStop(1,'rgba(255,150,40,0)'); x.fillStyle=gr; x.fillRect((l.x-2.2)*ts,(l.y-2.2)*ts,4.4*ts,4.4*ts);
    if(l.z===0) drawTorch(x,(l.x-.5)*ts,(l.y-.55)*ts,ts); else drawLantern(x,(l.x-.5)*ts,(l.y-.5)*ts,ts); });
  // trees and surface details
  m.trees_list.forEach(t=>drawTree(x,t,m,ts,q,TEX));
  // a past life: one tiny violet glint in the grass for every core fragment
  for(let k=0;k<(st.fragments||0);k++){ const gx=(m.nodes[0].x+(k%2?1:-1)*(1.3+k*.45))*ts, gy=(SURFACE+.1)*ts; x.fillStyle='#2a1a5a'; x.fillRect(gx-q*1.5,gy-q*1.5,q*3,q*3); x.fillStyle='#c8b8ff'; x.fillRect(gx-q*.5,gy-q*.5,q,q); x.fillStyle='rgba(200,184,255,.35)'; x.fillRect(gx-q*3,gy-q*.5,q*6,q); }
  // route line (only through dug ground)
  x.strokeStyle='rgba(255,226,140,.75)'; x.lineWidth=Math.max(2,ts*.08); x.setLineDash([ts*.18,ts*.18]);
  m.segs.forEach(sg=>{ if(!st.dug(sg.to)) return; x.beginPath(); sg.pts.forEach(([px,py],k)=>{ if(k===0) x.moveTo(px*ts,py*ts); else x.lineTo(px*ts,py*ts); }); x.stroke(); });
  (m.camps||[]).forEach(c=>{ if(st.dug(c.idx)) drawCamp(x,(c.x-.5)*ts,(c.y-.55)*ts,ts); });
  m.strip.forEach((s,z)=>{ if(!s||!st.stripOpen(z)) return; const p=m.nodes[s.from]; x.beginPath(); x.moveTo(p.x*ts,p.y*ts); x.lineTo(s.x*ts,p.y*ts); x.lineTo(s.x*ts,s.y*ts); x.stroke(); }); x.setLineDash([]);
  // strip mine chambers get ore piles once cleared
  m.strip.forEach((s,z)=>{ if(!s||!st.stripDone(z)) return; for(let k=0;k<5;k++){ const ox=s.x+(R()-.5)*2, oy=s.y+.55+R()*.3; F(ox-.22,oy-.14,.44,.2,'#2a2218'); F(ox-.16,oy-.2,.32,.14,k%2?'#3a3a3e':'#c9a050'); }
    F(s.x-.5,s.y-.7,1,.06,'#7a5a34'); F(s.x-.5,s.y-.7,.06,.7,'#6a4a2a'); F(s.x+.44,s.y-.7,.06,.7,'#6a4a2a'); });
  // fog: below the deepest dug board the mine is unexplored
  const fy=(reveal+3.2)*ts, fg=x.createLinearGradient(0,fy,0,fy+4.5*ts); fg.addColorStop(0,'rgba(10,7,5,0)'); fg.addColorStop(1,'rgba(10,7,5,.97)');
  x.fillStyle=fg; x.fillRect(0,fy,W,H-fy); x.fillStyle='rgba(10,7,5,.97)'; x.fillRect(0,fy+4.5*ts,W,H);
  // the Ancient Core: a cavern of sparkling magma with a temple in the middle, once you have dug down to it
  const cz=NZ-1, ct=ZONE_TOP[cz];
  if(reveal>ct-6){ drawCore(x,ct,ts,R,m,st); }
  return {carve};
}
function drawFeature(x,f,ts,q){
  const X=f.x*ts, Y=f.y*ts, P=(a,b,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+a*q,Y+b*q,w*q,h*q); };
  const PAT=(rows,cols)=>rows.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(cols[ch]) P(i,j,1,1,cols[ch]); }));
  switch(f.type){
    case 'pebbles': P(0,4,3,2,'#9a8a78'); P(5,5,2,2,'#7a6a5a'); P(9,3,2,2,'#b0a090'); break;
    case 'burrow': P(0,0,5,4,'#120c08'); P(1,-1,3,1,'#120c08'); P(5,3,2,1,'#6a4a34'); break;
    case 'roots': P(0,0,1,7,'#4a3420'); P(1,3,2,1,'#4a3420'); P(-1,5,2,1,'#4a3420'); break;
    case 'mushrooms': P(2,0,5,2,'#d9573a'); P(3,2,3,3,'#efe4d0'); P(3,0,1,1,'#fff'); P(8,3,3,1,'#c8a0d8'); P(9,4,1,2,'#efe4d0'); break;
    case 'pool': P(0,0,10,4,'#1f5f9a'); P(1,0,5,1,'#5fb0e8'); P(0,4,10,1,'#10304e'); break;
    case 'bones': P(0,2,8,1,'#e8e2d0'); P(0,1,2,3,'#e8e2d0'); P(6,1,2,3,'#e8e2d0'); P(3,5,5,1,'#cfc8b4'); break;
    case 'fossil': PAT(['.XXXX.','XYYYYX','XYXXYX','XYXYYX','XYYYXX','.XXXX.'],{X:'#6b5332',Y:'#d9c9a0'}); break;
    case 'crystals': { const c=f.s<.33?['#7fe8ff','#c8f6ff']:f.s<.66?['#d98cff','#f0d0ff']:['#7dff9a','#d0ffd8']; P(1,2,2,6,c[0]); P(0,5,1,3,c[0]); P(3,0,2,8,c[0]); P(3,0,1,5,c[1]); P(5,3,2,5,c[0]); P(1,2,1,3,c[1]); break; }
    case 'geode': PAT(['..XXX..','.XYYYX.','XYZZZYX','XYZWZYX','XYZZZYX','.XYYYX.','..XXX..'],{X:'#4a3a5a',Y:'#8a4ad0',Z:'#d9a8ff',W:'#ffffff'}); break;
    case 'lavafall': P(1,0,3,12,'#ff7a1f'); P(2,0,1,12,'#ffd23f'); P(0,12,5,2,'#ff7a1f'); break;
    case 'embers': P(0,0,2,2,'#ff9a3a'); P(5,3,2,2,'#ffd23f'); P(9,1,1,1,'#fff2b0'); break;
    case 'rails': break;
  }
}
function drawTree(x,t,m,ts,q,TEX){
  const base=SURFACE*ts, X=t.x*ts, h=t.h*ts, snow=m.weather==='snow', dusk=m.weather==='dusk'||m.weather==='sunset';
  const leaf=m.trees==='autumn'?[['#a8421a','#d9722a','#f2b43a'],['#8a3418','#c85a22','#e8962e']][t.tone<.5?0:1]:t.tone<.5?['#2f6b22','#3f8a2c','#57a83c']:['#2a5f2c','#387a36','#4f9a48'];
  const shadeC=c=>dusk?c:c;
  if(t.kind==='pine'){ x.fillStyle='#5a3d20'; x.fillRect(X-q*1.4,base-h*.28,q*2.8,h*.28);
    const tiers=4; for(let k=0;k<tiers;k++){ const ty=base-h*.2-k*h*.2, wd=(1.15-k*.22)*ts; x.fillStyle=k%2?'#2a5a34':'#1f4a2a'; x.fillRect(X-wd/2,ty-h*.22,wd,h*.22); x.fillStyle='#3a7a46'; x.fillRect(X-wd/2,ty-h*.22,wd,q*1.2); if(snow){ x.fillStyle='#f4f8fc'; x.fillRect(X-wd/2,ty-h*.22,wd,q*2); } } }
  else if(t.kind==='birch'){ x.fillStyle='#e8e4d6'; x.fillRect(X-q*1.4,base-h,q*2.8,h); x.fillStyle='#2a2a2a'; for(let k=0;k<5;k++) x.fillRect(X-q*1.4,base-h+k*h*.18+q,q*1.8,q);
    x.fillStyle=m.trees==='autumn'?'#e8b43a':'#6fb04a'; x.fillRect(X-.65*ts,base-h-.5*ts,1.3*ts,.9*ts); x.fillStyle=m.trees==='autumn'?'#f2cc5a':'#8fd062'; x.fillRect(X-.4*ts,base-h-.62*ts,.8*ts,.3*ts); if(snow){ x.fillStyle='#f4f8fc'; x.fillRect(X-.65*ts,base-h-.5*ts,1.3*ts,q*2); } }
  else { x.drawImage(TEX.log,X-ts*.2,base-h*.62,ts*.4,h*.62);
    x.fillStyle=leaf[0]; x.fillRect(X-.9*ts,base-h-.1*ts,1.8*ts,1.4*ts); x.fillStyle=leaf[1]; x.fillRect(X-.7*ts,base-h-.4*ts,1.4*ts,.8*ts); x.fillStyle=leaf[2]; x.fillRect(X-.4*ts,base-h-.5*ts,.6*ts,.35*ts);
    if(snow){ x.fillStyle='#f4f8fc'; x.fillRect(X-.7*ts,base-h-.4*ts,1.4*ts,q*2.4); } }
}
// a miners' camp in Magmastone: a small tent and a fire, where a missed day sends you back to
function drawCamp(x,X,Y,ts){
  const u=ts/16, P=(i,j,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+i*u,Y+j*u,w*u,h*u); };
  for(let j=0;j<7;j++){ P(7-j,4+j,2*j+2,1,j<1?'#e8d5a8':'#c9b07a'); } P(7,6,2,5,'#3a2a1a');
  P(1,11,14,1,'#2a1a10'); P(11,9,3,2,'#ff7a1a'); P(12,8,1,1,'#ffd23f'); P(11,11,3,1,'#5a3d20');
}
// the temple at the heart of the world: stepped stone, two pillars, and the empty socket where the portal piece goes
function drawCore(x,top,ts,R,m,st){
  const W=COLS*ts, u=ts/8, H=CORE_ROWS*ts, Y0=top*ts;
  const bg=x.createLinearGradient(0,Y0,0,Y0+H); bg.addColorStop(0,'#1a0d0a'); bg.addColorStop(.6,'#2a0f08'); bg.addColorStop(1,'#4a1406'); x.fillStyle=bg; x.fillRect(0,Y0+ts*.5,W,H);
  const lake=X=>top+CORE_ROWS*.72+.18*Math.sin(X*1.7+m.scale*5);
  drawLava(x,0,top+CORE_ROWS*.62,10,CORE_ROWS*.4,ts,R,lake);
  for(let k=0;k<40;k++){ const sx=R()*W, sy=(lake(sx/ts)+.2+R()*3)*ts; x.fillStyle=R()<.5?'#fff2b0':'#ffd0f5'; x.fillRect(sx,sy,u*.8,u*.8); }
  const cx=5*ts, base=(top+CORE_ROWS*.66)*ts;
  [[7,'#5a4a6a'],[5.6,'#6a5a7a'],[4.2,'#7a6a8a']].forEach(([w,c],k)=>{ x.fillStyle=c; x.fillRect(cx-w/2*ts,base-(k+1)*u*3,w*ts,u*3); x.fillStyle='rgba(255,255,255,.12)'; x.fillRect(cx-w/2*ts,base-(k+1)*u*3,w*ts,u*.6); });
  const py=base-u*9-ts*2.4; x.fillStyle='#8a7a9a'; x.fillRect(cx-1.9*ts,py,ts*.5,ts*2.4); x.fillRect(cx+1.4*ts,py,ts*.5,ts*2.4);
  x.fillStyle='#9d8db0'; x.fillRect(cx-2.3*ts,py-u*2,4.6*ts,u*2); x.fillStyle='#6a5a7a'; x.fillRect(cx-2.1*ts,py-u*3.4,4.2*ts,u*1.4);
  const g=x.createRadialGradient(cx,base-u*9-ts*1.1,0,cx,base-u*9-ts*1.1,ts*1.6); g.addColorStop(0,'rgba(200,170,255,.55)'); g.addColorStop(1,'rgba(120,80,200,0)'); x.fillStyle=g; x.fillRect(cx-1.6*ts,py,3.2*ts,2.4*ts);
  x.strokeStyle='#e8dcff'; x.lineWidth=Math.max(2,u*.8); x.setLineDash([u,u*.6]); x.strokeRect(cx-.5*ts,base-u*9-ts*1.6,ts,ts); x.setLineDash([]);
}
// a wall torch: wooden stick, layered flame, warm halo
function drawTorch(x,X,Y,ts){
  const u=ts/16, P=(i,j,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+i*u,Y+j*u,w*u,h*u); };
  P(7,7,2,8,'#7a5630'); P(8,7,1,8,'#5a3d20'); P(7,14,2,1,'#3a2610'); P(6,6,4,2,'#3a2a1a');
  P(6,2,4,4,'#ff7a1a'); P(7,1,2,1,'#ff9a2a'); P(7,3,2,3,'#ffc23a'); P(7,4,2,1,'#fff2b0'); P(8,0,1,1,'#ffb23a');
}
// a hanging lantern: iron cage, bright glass, a flame inside
function drawLantern(x,X,Y,ts){
  const u=ts/16, P=(i,j,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+i*u,Y+j*u,w*u,h*u); };
  P(7,0,2,2,'#3a3a40'); P(5,2,6,1,'#2a2a30'); P(4,3,8,9,'#2a2a30'); P(5,4,6,7,'#ffd86a'); P(6,5,4,5,'#fff2b0'); P(7,6,2,3,'#fffbe8');
  P(4,12,8,1,'#2a2a30'); P(6,13,4,1,'#3a3a40'); P(4,3,1,9,'#4a4a52'); P(11,3,1,9,'#1a1a20');
}
// molten lava painted per pixel, with a bright surface edge
function drawLava(x,x0,y0,w,h,ts,R,edgeRow){
  const u=ts/8, pal=['#6a1406','#a8260c','#e4481a','#ff7a1f','#ffb23a','#ffe58a'];
  for(let j=0;j<Math.ceil(h*8);j++) for(let i=0;i<Math.ceil(w*8);i++){
    const X=x0+i*u/ts, Y=y0+j*u/ts; if(Y<edgeRow(X)) continue;
    const v=Math.sin(X*2.1+Y*3.3)+Math.sin(Y*1.4-X*1.1)*.8+Math.sin((X+Y)*4.7)*.35+(R()-.5)*.5;
    let k=Math.max(0,Math.min(5,Math.floor((v+2.2)/4.4*6)));
    if(Y-edgeRow(X)<.14) k=5; if(R()<.035) k=0;
    x.fillStyle=pal[k]; x.fillRect(X*ts,Y*ts,Math.ceil(u),Math.ceil(u));
  }
}
const api={genMap,drawMap,drawTorch,drawLantern,COLS,ROWS,ZONE_TOP,CORE_ROWS,zoneAt,WEATHER,SCENERY,TREES,NZ,NB};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreMaps=api;
})(typeof self!=='undefined'?self:globalThis);
