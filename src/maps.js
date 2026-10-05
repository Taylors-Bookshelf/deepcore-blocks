// The daily world map: a generator (pure, runs in Node too) and a canvas renderer.
// Every Pacific-time day gets a different surface (weather, scenery, trees) and a different set of tunnels, but always the same
// 20 boards plus a strip-mine branch per zone. The cave is dug open board by board as the player clears them.
(function(root){
const D=(typeof require!=='undefined'&&typeof module!=='undefined')?require('./data.js'):root.DeepcoreData;
const COLS=10, ROWS=49, ZONE_TOP=[0,13,22,31,40], SURFACE=6;          // rows 0-5 sky, row 6 grass line
const zoneAt=row=> row<13?0 : row<22?1 : row<31?2 : row<40?3 : 4;
const WEATHER=['clear','clear','cloudy','overcast','rain','snow','sunset','dusk'];
const SCENERY=['mountains','hills','lake','meadow','mountains','lake','hills'];
const TREES=['oak','pine','birch','mixed','autumn','mixed'];
const FEATURES=[ ['roots','pebbles','burrow'], ['rails','mushrooms','pool','bones'], ['crystals','pool','rails','fossil','mushrooms'], ['crystals','geode','pool','crystals'], ['lavafall','embers','bones','crystals'] ];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------------------------------------------------------------- generator
function genMap(day){
  const rnd=D.rng(D.hashStr('map:'+day)+3), pick=a=>a[Math.floor(rnd()*a.length)], rr=(a,b)=>a+rnd()*(b-a);
  const m={day, weather:pick(WEATHER), scenery:pick(SCENERY), trees:pick(TREES), leaf:rnd(), nodes:[], segs:[], strip:[], tunnelW:[], features:[], lightSlots:[], trees_list:[], clouds:[], peaks:[], lake:null};
  // ---- node positions: a random walk down the shaft, a different shape every day
  const depth=[[0,0,0,0],[8.1+rr(-.5,.5),9.9+rr(-.3,.3),11.6+rr(-.3,.3)],
    [15+rr(-.4,.4),16.6+rr(-.3,.3),18.2+rr(-.3,.3),20.4+rr(-.3,.3)],[24+rr(-.4,.4),25.6+rr(-.3,.3),27.2+rr(-.3,.3),29.4+rr(-.3,.3)],
    [33+rr(-.4,.4),34.6+rr(-.3,.3),36.2+rr(-.3,.3),38.4+rr(-.3,.3)],[42+rr(-.4,.4),43.4+rr(-.2,.2),44.8+rr(-.2,.2),46.2+rr(-.2,.2)]];
  const ys=[5.4, ...depth[1], ...depth[2], ...depth[3], ...depth[4], ...depth[5]];
  let x=rr(1.4,8.6), dir=rnd()<.5?-1:1;
  for(let i=0;i<20;i++){
    if(i>0){ let step=dir*rr(2,4.2); let nx=x+step; if(nx<1.5||nx>8.5){ dir=-dir; nx=x+dir*rr(2,4.2); } x=clamp(nx,1.5,8.5); if(rnd()<.3) dir=-dir; }
    m.nodes.push({x:+x.toFixed(2),y:+ys[i].toFixed(2)});
  }
  // ---- tunnels between nodes: straight, elbow or wiggle, with a width per zone
  for(let z=0;z<5;z++) m.tunnelW.push(pick([.5,.7,.95]));
  for(let i=1;i<20;i++){
    const a=m.nodes[i-1], b=m.nodes[i], z=Math.floor(i/4), style=i===1?'diag':pick(['diag','elbowV','elbowH','wiggle','diag']);
    let pts=[[a.x,a.y],[b.x,b.y]];
    if(style==='elbowV') pts=[[a.x,a.y],[a.x,b.y],[b.x,b.y]];
    if(style==='elbowH') pts=[[a.x,a.y],[b.x,a.y],[b.x,b.y]];
    if(style==='wiggle'){ const mx=(a.x+b.x)/2+rr(-1.2,1.2), my=(a.y+b.y)/2; pts=[[a.x,a.y],[clamp(mx,.8,9.2),my],[b.x,b.y]]; }
    m.segs.push({from:i-1,to:i,pts,w:m.tunnelW[z]});
  }
  // ---- strip-mine branch: sideways from each zone's third board, at the same depth
  for(let z=0;z<5;z++){
    const p=m.nodes[z*4+2]; let best=null;
    for(let t=0;t<30&&!best;t++){
      const side=(t%2===0?(p.x<5?1:-1):(p.x<5?-1:1)), sx=clamp(p.x+side*rr(2.4,3.6),1.1,8.9), sy=+(p.y+(z===0?.15:rr(-.1,.45))).toFixed(2);
      const clear=m.nodes.every((n,i)=>i===z*4+2||Math.hypot(n.x-sx,n.y-sy)>=1.7) && Math.abs(sx-p.x)>=2 && m.strip.every(o=>Math.hypot(o.x-sx,o.y-sy)>=1.7);
      if(clear||t===29) best={x:+sx.toFixed(2),y:sy,from:z*4+2,side,zone:z};
    }
    m.strip.push(best);
  }
  // ---- two lamp spots beside each zone's gate tunnel (board 3 -> board 4)
  for(let z=0;z<5;z++){
    const a=m.nodes[z*4+2], b=m.nodes[z*4+3]; const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, off=m.tunnelW[z]+.7;
    m.lightSlots.push([{x:mx-off,y:my-.2},{x:mx+off,y:my+.4}].map(p=>({x:+clamp(p.x,.3,9.7).toFixed(2),y:+p.y.toFixed(2)})));
  }
  // ---- decorations in the rock
  for(let z=0;z<5;z++){ const kinds=[pick(FEATURES[z]),pick(FEATURES[z]),pick(FEATURES[z])]; const top=z===0?7.5:ZONE_TOP[z]+.5, bot=(z===4?46:ZONE_TOP[z+1])-.8;
    kinds.forEach(k=>{ for(let n=0;n<4;n++) m.features.push({type:k,zone:z,x:+rr(.3,9.5).toFixed(2),y:+rr(top,bot).toFixed(2),s:rnd()}); }); }
  // ---- surface
  m.scale=rnd();
  m.sun={x:rr(1,9),y:rr(.9,1.9)};
  const nc=m.weather==='clear'?3:m.weather==='cloudy'?7:m.weather==='overcast'?9:m.weather==='rain'?8:m.weather==='snow'?7:4;
  for(let i=0;i<nc;i++) m.clouds.push({x:rr(-1,9.5),y:rr(.3,3.2),w:rr(1.6,3.6),s:rnd()});
  const px=m.nodes[0].x;
  if(m.scenery==='lake'){ let w=rr(2.6,3.8), x0=px<5?rr(5,6.6):rr(.6,2.2); m.lake={x0:+Math.max(.2,x0).toFixed(2),x1:+Math.min(9.8,x0+w).toFixed(2)}; }
  for(let i=0;i<4;i++) m.peaks.push({x:rr(-.5,10),h:rr(1.6,3.4),w:rr(1.8,3.6)});
  for(let tx=rr(.2,.9); tx<9.9; tx+=rr(.95,2.1)){
    if(Math.abs(tx-px)<.8) continue; if(m.lake&&tx>m.lake.x0-.2&&tx<m.lake.x1+.2) continue;
    m.trees_list.push({x:+tx.toFixed(2),h:+rr(1.7,3.4).toFixed(2),kind:m.trees==='mixed'?pick(['oak','pine','birch']):m.trees==='autumn'?'oak':m.trees,tone:rnd()});
  }
  return m;
}

// ---------------------------------------------------------------- renderer
const HEX=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
// st: {dug:(nodeIdx)=>bool, stripOpen:(z)=>bool, stripDone:(z)=>bool, lights:{z:count}, maxY:deepest dug depth}
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
    const zi=zoneAt(row); let tex=zi===0?(row===SURFACE?'grass':'dirt'):zi===1?'stone':zi===2?'deep':zi===3?'obsidian':'ember';
    x.drawImage(TEX[tex],col*ts,row*ts,ts,ts);
    if(m.weather==='snow'&&row===SURFACE){ x.fillStyle='rgba(245,250,255,.82)'; x.fillRect(col*ts,row*ts,ts,ts*.34); }
  }
  // ore flecks scattered through the walls
  for(let row=SURFACE+2;row<ROWS;row++) for(let col=0;col<COLS;col++){ const zi=zoneAt(row), z=D.ZONES[zi]; if(zi>0&&R()<.1&&z.ores.length){ const o=z.ores[Math.floor(R()*z.ores.length)]; x.drawImage(TEX[o+'@'+z.rock],col*ts,row*ts,ts,ts); } }
  x.fillStyle='rgba(0,0,0,.26)'; x.fillRect(0,(SURFACE+1)*ts,W,(ROWS-SURFACE-1)*ts);
  if(m.lake){ const w0=m.lake.x0*ts, w1=m.lake.x1*ts; x.fillStyle=m.weather==='snow'?'#bfd8ea':'#2f7fc4'; x.fillRect(w0,(SURFACE+.06)*ts,w1-w0,.94*ts); x.fillStyle='rgba(255,255,255,.28)'; for(let k=0;k<7;k++) x.fillRect(w0+R()*(w1-w0-ts*.7),(SURFACE+.2+R()*.55)*ts,ts*(.4+R()*.4),q);
    x.fillStyle='#2f6b22'; for(let k=0;k<5;k++){ const rx=(k%2?w0:w1)+(R()-.5)*ts*.4; x.fillRect(rx,(SURFACE-.45)*ts,q*1.4,.5*ts); } }

  // ---- tunnels: only what has been dug
  const carve=new Set(), lit=[];
  const brush=(px,py,r)=>{ for(let dy=-r;dy<=r;dy+=.4) for(let dx=-r;dx<=r;dx+=.4){ if(dx*dx+dy*dy>r*r+.25) continue; const cx=Math.floor(px+dx), cy=Math.floor(py+dy); if(cy>=SURFACE+1&&cx>=0&&cx<COLS) carve.add(cy*COLS+cx); } };
  const walk=(pts,w)=>{ for(let k=1;k<pts.length;k++){ const [ax,ay]=pts[k-1],[bx,by]=pts[k]; const len=Math.hypot(bx-ax,by-ay); for(let s=0;s<=len;s+=.18){ const t=len?s/len:0; brush(ax+(bx-ax)*t,ay+(by-ay)*t,w); } } };
  m.segs.forEach(sg=>{ if(st.dug(sg.to)) walk(sg.pts,sg.w); });
  m.nodes.forEach((n,i)=>{ if(st.dug(i)&&n.y>SURFACE+.8) brush(n.x,n.y,1.05); });
  m.strip.forEach((s,z)=>{ if(!st.stripOpen(z)) return; const p=m.nodes[z*4+2]; walk([[p.x,p.y],[s.x,p.y],[s.x,s.y]],.5); brush(s.x,s.y,st.stripDone(z)?1.9:1.15); });
  const lamps=[]; Object.entries(st.lights||{}).forEach(([z,n])=>{ for(let k=0;k<Math.min(2,n);k++) lamps.push({z:+z,k,...m.lightSlots[+z][k]}); });
  lamps.forEach(l=>brush(l.x,l.y,.25));
  carve.forEach(k=>{ const row=Math.floor(k/COLS), col=k%COLS, zi=zoneAt(row); x.fillStyle=zi===0?'rgba(24,14,8,.86)':'rgba(8,6,4,.88)'; x.fillRect(col*ts,row*ts,ts,ts); });
  // decorations (only in rock near dug ground, never inside a tunnel)
  const reveal=st.maxY;
  m.features.forEach(f=>{ if(f.y>reveal+3.5||f.y<SURFACE+1.5) return; const col=Math.floor(f.x), row=Math.floor(f.y); if(carve.has(row*COLS+col)) return; drawFeature(x,f,ts,q); });
  // rails + supports along dug tunnels in the stone zones
  m.segs.forEach(sg=>{ const z=Math.floor(sg.to/4); if(!st.dug(sg.to)||!(z===1||z===2)||!m.features.some(f=>f.zone===z&&f.type==='rails')) return; const [ax,ay]=sg.pts[0],[bx,by]=sg.pts[sg.pts.length-1];
    for(let t=.15;t<.9;t+=.2){ const px=ax+(bx-ax)*t, py=ay+(by-ay)*t; F(px-.5,py-.12,1,.06,'#6a4a2a'); F(px-.5,py-.78,.08,.7,'#6a4a2a'); F(px+.42,py-.78,.08,.7,'#6a4a2a'); F(px-.5,py-.82,1,.07,'#7a5a34'); } });
  // lamps with a warm halo: lit tunnels glow, so the way you've lit is easy to see
  lamps.forEach(l=>{ const gr=x.createRadialGradient(l.x*ts,l.y*ts,0,l.x*ts,l.y*ts,ts*2.4); gr.addColorStop(0,'rgba(255,196,90,.55)'); gr.addColorStop(1,'rgba(255,150,40,0)'); x.fillStyle=gr; x.fillRect((l.x-2.4)*ts,(l.y-2.4)*ts,4.8*ts,4.8*ts);
    if(l.z===0) drawTorch(x,(l.x-.5)*ts,(l.y-.55)*ts,ts); else drawLantern(x,(l.x-.5)*ts,(l.y-.5)*ts,ts); });
  // trees and surface details
  m.trees_list.forEach(t=>drawTree(x,t,m,ts,q,TEX));
  // roots into the dirt tunnels
  for(let col=0;col<COLS;col++) if(R()<.5){ x.fillStyle='#4a3420'; x.fillRect((col+R()*.8)*ts,(SURFACE+1)*ts,ts*.06,ts*(.3+R()*.8)); }
  // route line (only through dug ground)
  x.strokeStyle='rgba(255,226,140,.75)'; x.lineWidth=Math.max(2,ts*.08); x.setLineDash([ts*.18,ts*.18]);
  m.segs.forEach(sg=>{ if(!st.dug(sg.to)) return; x.beginPath(); sg.pts.forEach(([px,py],k)=>{ if(k===0) x.moveTo(px*ts,py*ts); else x.lineTo(px*ts,py*ts); }); x.stroke(); });
  m.strip.forEach((s,z)=>{ if(!st.stripOpen(z)) return; const p=m.nodes[z*4+2]; x.beginPath(); x.moveTo(p.x*ts,p.y*ts); x.lineTo(s.x*ts,p.y*ts); x.lineTo(s.x*ts,s.y*ts); x.stroke(); }); x.setLineDash([]);
  // strip mine chambers get ore piles once cleared
  m.strip.forEach((s,z)=>{ if(!st.stripDone(z)) return; for(let k=0;k<5;k++){ const ox=s.x+(R()-.5)*2.4, oy=s.y+.55+R()*.3; F(ox-.22,oy-.14,.44,.2,'#2a2218'); F(ox-.16,oy-.2,.32,.14,D.ZONES[z].ores[0]==='coal'?'#3a3a3e':'#c9a050'); }
    F(s.x-.5,s.y-.7,1,.06,'#7a5a34'); F(s.x-.5,s.y-.7,.06,.7,'#6a4a2a'); F(s.x+.44,s.y-.7,.06,.7,'#6a4a2a'); });
  // fog: below the deepest dug board the mine is unexplored
  const fy=(reveal+3.2)*ts, fg=x.createLinearGradient(0,fy,0,fy+4.5*ts); fg.addColorStop(0,'rgba(10,7,5,0)'); fg.addColorStop(1,'rgba(10,7,5,.97)');
  x.fillStyle=fg; x.fillRect(0,fy,W,H-fy); x.fillStyle='rgba(10,7,5,.97)'; x.fillRect(0,fy+4.5*ts,W,H);
  // the underworld's lava lake, once you have dug down to it
  if(reveal>41.5){ const lake=X=>47.3+.28*Math.sin(X*1.3+m.scale*6)+.12*Math.sin(X*3.1);
    const glow=x.createLinearGradient(0,45.4*ts,0,47.6*ts); glow.addColorStop(0,'rgba(255,120,30,0)'); glow.addColorStop(1,'rgba(255,120,30,.45)'); x.fillStyle=glow; x.fillRect(0,45.4*ts,W,2.2*ts);
    drawLava(x,0,46.9,10,2.1,ts,R,lake); }
  return {carve};
}
function drawFeature(x,f,ts,q){
  const X=f.x*ts, Y=f.y*ts, P=(a,b,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+a*q,Y+b*q,w*q,h*q); };
  switch(f.type){
    case 'pebbles': P(0,4,3,2,'#9a8a78'); P(5,5,2,2,'#7a6a5a'); P(9,3,2,2,'#b0a090'); break;
    case 'burrow': P(0,0,5,4,'#120c08'); P(1,-1,3,1,'#120c08'); P(5,3,2,1,'#6a4a34'); break;
    case 'roots': P(0,0,1,7,'#4a3420'); P(1,3,2,1,'#4a3420'); P(-1,5,2,1,'#4a3420'); break;
    case 'mushrooms': P(2,0,5,2,'#d9573a'); P(3,2,3,3,'#efe4d0'); P(3,0,1,1,'#fff'); P(8,3,3,1,'#c8a0d8'); P(9,4,1,2,'#efe4d0'); break;
    case 'pool': P(0,0,10,4,'#1f5f9a'); P(1,0,5,1,'#5fb0e8'); P(0,4,10,1,'#10304e'); break;
    case 'bones': P(0,2,8,1,'#e8e2d0'); P(0,1,2,3,'#e8e2d0'); P(6,1,2,3,'#e8e2d0'); P(3,5,5,1,'#cfc8b4'); break;
    case 'fossil': P(0,0,6,6,'#6b5332'); P(1,1,4,4,'#d9c9a0'); P(2,2,2,2,'#6b5332'); break;
    case 'crystals': { const c=f.s<.33?['#7fe8ff','#c8f6ff']:f.s<.66?['#d98cff','#f0d0ff']:['#7dff9a','#d0ffd8']; P(1,2,2,6,c[0]); P(0,5,1,3,c[0]); P(3,0,2,8,c[0]); P(3,0,1,5,c[1]); P(5,3,2,5,c[0]); P(1,2,1,3,c[1]); break; }
    case 'geode': P(1,0,8,8,'#5a4a6a'); P(2,1,6,6,'#8a4ad0'); P(3,2,4,4,'#d9a8ff'); P(4,3,2,2,'#fff'); break;
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
const api={genMap,drawMap,drawTorch,drawLantern,COLS,ROWS,ZONE_TOP,zoneAt,WEATHER,SCENERY,TREES};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreMaps=api;
})(typeof self!=='undefined'?self:globalThis);
