(function(){
const N = 8, T = 16;
const A = window.DCA || { track(){}, attempt(){}, setScreen(){}, setBoard(){}, isOn:()=>false, canConfigure:()=>false, setOptOut(){} };
const {TOOL_WEAR,POTION_MOVES,WORKSHOP,BELT_MAX,FOSSIL_BONE,specialHaul,rng,hashStr,ORES,VAL,SPECIAL_RATE,SPECIAL_MIX,DROPS,tierOf,ZONES,BOARD_COUNT,RECIPES,STASH_KEYS,GEM_KEYS,lineName,STAR_ORES,SCORE,placePoints,starsFromScore,starBonus,modifierFor,toolCost,TOOLS,toolNeeded,WEAR,PRISM_MEND,STASH_MEND,DUR_MAX,DUR_AFTER_BREAK,Z_START,CORE_IDX,CRUST_Z,MAGMA_Z,zoneOfIdx,jOfIdx,idxOf}=DeepcoreData;
const M=DeepcoreMaps, Meta=DeepcoreMeta;
const {SHAPES,SHAPE_STRS,SHAPE_BY_KEY,applyMove,countHoles,hasLockedHole,healthy,solveCount,pocketInfo,getBit,bitOf,chooseSet,chooseNext,chooseTray,BIG_IDS,pickWeighted,rankMoves,rampD,wildOf,orePiece,RAMP}=DeepcoreCore;
const FONT_D = '"Jersey 10", "Courier New", monospace';

// ---------- texture helpers (procedural, original 16×16 pixel art) ----------
function hex(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
function shade(rgb,f){ return rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*f)))); }

// palettes ordered dark → light
const PAL = {
  stone:   ['#656565','#717171','#7c7c7c','#878787','#939393'],
  granite: ['#8c7f84','#988b90','#a4979b','#b0a4a8','#bcb1b4'],
  deep:    ['#3b3f4d','#454a59','#4f5565','#5a6072','#666d80'],
  dirt:    ['#5b402d','#6a4b35','#79573d','#876246','#966e4f'],
  sand:    ['#cbbf8d','#d5ca98','#ddd2a3','#e4daad','#ebe2b9'],
  grass:   ['#477a29','#528b2f','#5e9c37','#69aa3f','#76b749'],
  ember:   ['#6a1d1b','#7d2522','#902e29','#a2382f','#b44436'],
  obsidian:['#2b1f3d','#36284d','#43325e','#503c70','#5f4884'],
  bark:    ['#3b2b17','#4b371f','#5a4427','#69502f','#775c38'],
};

// ---------- BLOCK CATALOG ----------
// kind: base (bulk filler) · ore · gem · special
const MATS = {
  // base blocks — the bulk of every piece; clearing mines their resource
  grass:   {kind:'base', gen:'grass',  drop:'dirt'},   // surface look of dirt
  dirt:    {kind:'base', gen:'dirt',   drop:'dirt'},
  sand:    {kind:'base', gen:'sand',   drop:'sand'},
  log:     {kind:'base', gen:'log',    drop:'wood'},
  stone:   {kind:'base', gen:'stone',  drop:'stone'},
  granite: {kind:'base', gen:'granite', drop:'granite'},
  deep:    {kind:'base', gen:'deep',   drop:'deep'},
  ember:   {kind:'base', gen:'ember',  drop:'ember'},
  obsidian:{kind:'base', gen:'obsidian', drop:'obsidian'},
  crust:   {kind:'base', gen:'crust',  drop:'crust'},
  // ores — drawn on the level's host rock (stone, deep stone or ember rock)
  coal:    {kind:'ore', style:'blob',  ore:'#1e1e1e', hi:'#6e6e6e', dk:'#0a0a0a', rimDark:'#b3aca0', drop:'coal'},
  copper:  {kind:'ore', style:'blob',  ore:'#f08a3c', hi:'#ffc896', dk:'#2fbf9a', drop:'copper'},
  ruby:    {kind:'gem', cut:'oval', ore:'#ff3b55', hi:'#ffd0d6', facets:{X:'#3a0610',L:'#ffd0d6',H:'#ff5a6e',M:'#d81e3a',D:'#8a0e24'}, drop:'ruby'},
  iron:    {kind:'ore', style:'fleck', ore:'#e3cdb8', hi:'#ffffff', dk:'#9a8070', drop:'iron'},
  gold:    {kind:'ore', style:'fleck', ore:'#ffd21a', hi:'#fff6b0', dk:'#d27a00', spark:'#ffffff', drop:'gold'},
  bone:    {kind:'ore', style:'shard', ore:'#efe6cf', hi:'#ffffff', dk:'#a89878', drop:'bone'},
  meteorite:{kind:'ore', style:'blob', ore:'#4a4466', hi:'#c8b8ff', dk:'#1a1828', spark:'#9fe8ff', drop:'meteorite'},
  prismore:{kind:'ore', style:'shard', ore:'#ff7ad9', hi:'#ffffff', dk:'#6ae3ff', spark:'#fff6b0', drop:'prismore'},
  // gems
  diamond: {kind:'gem', cut:'brilliant', ore:'#7fe8ff', hi:'#ffffff', facets:{X:'#0e3446',L:'#ffffff',H:'#c2f4ff',M:'#5cc8ee',D:'#2a86b8'}, drop:'diamond'},
  emerald: {kind:'gem', cut:'step', ore:'#22c25a', hi:'#b6ffc9', facets:{X:'#05301a',L:'#c8ffd6',H:'#4fe07f',M:'#17a64a',D:'#0a6a2c'}, drop:'emerald'},
  // special blocks — ultra-rare, Medium and up; trigger when their line clears
  blast:   {kind:'special', gen:'blast',    drop:null, name:'Blast Charge',    pts:0},   // points: SCORE.special
  fossil:  {kind:'special', gen:'fossil',   drop:null, name:'Fossil',          pts:0},   // random specials pay resources only
  treasure:{kind:'special', gen:'treasure', drop:null, name:'Buried treasure', pts:0},
  sledgehammer:{kind:'special', gen:'sledgehammer', drop:null, name:'Sledgehammer', pts:0},   // points: SCORE.special
  drill:{kind:'special', gen:'drill', drop:null, name:'Star Drill', pts:0},   // F-16: crafted only, dragged to an edge of the board (never on the board itself)
  rescue:{kind:'potion', gen:'rescue', drop:null, name:'Potion of Protection', pts:0},
  luck:{kind:'potion', gen:'luck', drop:null, name:'Potion of Luck', pts:0},
};
const FX = {
  grass:['#5e9c37','#6a4b35'], dirt:['#79573d','#5b402d'], sand:['#ddd2a3','#cbbf8d'], log:['#5a4427','#3b2b17'],
  stone:['#7c7c7c','#656565'], granite:['#a4979b','#8c7f84'], deep:['#4a4a51','#36363d'], obsidian:['#5a5f6e','#8a90a2'], ember:['#88312e','#561818'], crust:['#ffb04a','#5a1a0a'],
  blast:['#ffd23f','#ff6a1f'], fossil:['#fbf3dc','#c6a066'], treasure:['#ffe36a','#f5c93c'], sledgehammer:['#ffd23f','#9fb4cc'], drill:['#e8ecf2','#9aa0aa'], rescue:['#ff6a9a','#ffd0e0'], luck:['#7dff9a','#ffe36a'],
};
Object.entries(MATS).forEach(([k,m])=>{ if(!FX[k]) FX[k]=[m.ore,m.hi]; });


// Fixed inclusion layout per ore: 3 pieces, seeded only by the ore's name so every rock shows the same pattern
const INCL={};
const BIG_NUGGETS=[
  [[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2]],
  [[0,0],[1,0],[0,1],[1,1],[2,1],[1,2]],
  [[1,0],[0,1],[1,1],[2,1],[1,2],[2,2]],
  [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
  [[1,0],[0,1],[1,1],[2,1],[1,2]],
];
const FLECKS=[[[0,0],[1,0],[2,0],[1,1],[2,1],[2,2]],[[0,0],[0,1],[1,1],[2,1],[1,2],[2,2]],[[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]]];
const SHARDS=[[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3]],[[3,0],[2,0],[2,1],[1,1],[1,2],[0,2],[0,3]],[[0,0],[1,1],[1,0],[2,1],[2,2],[3,3],[3,2]]];
const LAYOUTS=[[[2,2],[10,4],[4,10]],[[9,1],[2,6],[9,10]],[[3,1],[10,7],[2,11]],[[2,3],[9,2],[7,10]],[[8,2],[2,8],[10,10]]];
function inclusionMask(key,style){
  if(INCL[key]) return INCL[key];
  let h=0; for(const ch of key) h=(h*31+ch.charCodeAt(0))>>>0;
  const ri=rng(h+77), lay=LAYOUTS[h%LAYOUTS.length];
  const shapes = style==='fleck'?FLECKS : style==='shard'?SHARDS : BIG_NUGGETS;
  const mask=new Map();
  lay.forEach(([ox,oy])=>{
    const shape=shapes[Math.floor(ri()*shapes.length)];
    const cells=shape.map(([a,b])=>[ox+a,oy+b]).filter(([a,b])=>a>=1&&b>=1&&a<T-1&&b<T-1);
    let lo=cells[0], hiC=cells[0]; cells.forEach(cc=>{ if(cc[0]+cc[1]<lo[0]+lo[1]) lo=cc; if(cc[0]+cc[1]>hiC[0]+hiC[1]) hiC=cc; });
    cells.forEach(cc=>mask.set(cc[0]+','+cc[1], cc===lo?'hi':cc===hiC?'dk':'ore'));
    if(MATS[key].spark){ const mid=cells[Math.floor(cells.length/2)]; if(mid!==lo&&mid!==hiC) mask.set(mid[0]+','+mid[1],'spark'); }
  });
  INCL[key]=mask; return mask;
}
function makeTex(key, seedN, rock, ov){
  const m = MATS[key], r = rng(7919*(seedN+5)+13);
  const c=document.createElement('canvas'); c.width=c.height=T;
  const x=c.getContext('2d'); const img=x.createImageData(T,T); const d=img.data;
  const px=(i,j,rgb)=>{ if(i<0||j<0||i>=T||j>=T) return; const k=(j*T+i)*4; d[k]=rgb[0];d[k+1]=rgb[1];d[k+2]=rgb[2];d[k+3]=255; };
  const get=(i,j)=>{ const k=(j*T+i)*4; return [d[k],d[k+1],d[k+2]]; };
  const cluster=(palName,mix=.55)=>{
    const p=PAL[palName].map(hex); const cl=[]; for(let k=0;k<64;k++) cl.push(r());
    for(let j=0;j<T;j++)for(let i=0;i<T;i++){ const v=mix*cl[(j>>1)*8+(i>>1)]+(1-mix)*r(); px(i,j,p[Math.min(p.length-1,Math.floor(v*p.length))]); }
  };
  const rockBase=(rk)=>{
    if(rk==='granite'){ cluster('granite',.5); for(let n=0;n<16;n++){ const i=Math.floor(r()*14), j=Math.floor(r()*15); px(i,j,hex(r()<.5?'#4d4347':'#e2d9da')); if(r()<.5) px(i+1,j,hex('#6b5f63')); } }
    else if(rk==='stone'){ cluster('stone',.6); for(let n=0;n<6;n++){ const i=Math.floor(r()*14), j=Math.floor(r()*16); px(i,j,hex('#5d5d5d')); px(i+1,j,hex('#5d5d5d')); } }
    else if(rk==='deep'){ cluster('deep',.5); for(let j=1;j<T;j+=4) for(let i=0;i<T;i++) if(r()<.55) px(i,j,shade(get(i,j),.78)); }
    else if(rk==='obsidian'){ cluster('obsidian',.55);
      for(let n=0;n<5;n++){ let i=Math.floor(r()*T), j=Math.floor(r()*T); for(let s=0;s<4;s++){ px(i,j,hex(s===0?'#a98ad8':'#7a5cad')); i=(i+1)%T; j=(j+(r()<.5?1:0))%T; } } }
    else if(rk==='crust'){ cluster('ember',.4); for(let n=0;n<5;n++){ let i=Math.floor(r()*T), j=Math.floor(r()*T); for(let s2=0;s2<6;s2++){ px(i,j,hex(s2%2?'#ffb04a':'#ffe58a')); i=(i+(r()<.5?1:-1)+T)%T; j=(j+1)%T; } } }
    else if(rk==='dirt'){ cluster('dirt',.45); }
    else { cluster('ember',.5);
      for(let n=0;n<4;n++){ let i=Math.floor(r()*T), j=Math.floor(r()*T); for(let s=0;s<5;s++){ px(i,j,hex('#3e0f0f')); i=(i+(r()<.6?1:0))%T; j=(j+1)%T; } }
      for(let n=0;n<6;n++) px(Math.floor(r()*T),Math.floor(r()*T),hex('#b14a3c')); }
  };
  const DARK_ROCK = rock==='deep'||rock==='ember'||rock==='obsidian'||rock==='crust';
  // ore inclusions: one fixed arrangement of 3 pieces per ore, identical on every host rock
  const inclusions=(style,col)=>{
    const mask=inclusionMask(key,style);
    const rim = col.rim ? hex(col.rim) : null;
    mask.forEach((_,k)=>{ const [a,b]=k.split(',').map(Number);
      [[1,0],[-1,0],[0,1],[0,-1],[1,1]].forEach(([dx,dy])=>{ const kk=(a+dx)+','+(b+dy); if(!mask.has(kk)){
        const isShadow = dx===1&&dy===1;
        px(a+dx,b+dy, rim ? (isShadow?shade(rim,.8):rim) : hex(isShadow?'#050302':'#140d08')); } }); });
    mask.forEach((t,k)=>{ const [a,b]=k.split(',').map(Number); px(a,b,hex(t==='spark'?col.spark:col[t])); });
  };
  // a faceted cut gem sprite: X outline, L/H/M/D light→dark facets
  const gem=(sprite,col,ox,oy)=>{ sprite.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(col[ch]) px(ox+i,oy+j,hex(col[ch])); })); };
  const sparkle=(a,b,c1,c2)=>{ px(a,b,hex(c1)); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>px(a+dx,b+dy,hex(c2))); };
  const gen = (m.kind==='ore'||m.kind==='gem') ? 'ore' : m.gen;
  switch(gen){
    case 'stone': case 'granite': case 'deep': case 'ember': case 'obsidian': case 'crust': rockBase(gen); break;
    case 'dirt': cluster('dirt',.45); for(let n=0;n<10;n++) px(Math.floor(r()*T),Math.floor(r()*T),hex(r()<.5?'#4a3424':'#a07a58')); break;
    case 'sand': cluster('sand',.3); for(let n=0;n<8;n++) px(Math.floor(r()*T),Math.floor(r()*T),hex('#bfb281')); break;
    case 'grass': {
      cluster('dirt',.45); for(let n=0;n<8;n++) px(Math.floor(r()*T),5+Math.floor(r()*11),hex('#4a3424'));
      const g=PAL.grass.map(hex);
      for(let i=0;i<T;i++){ let depth=3+(r()<.5?1:0); if(r()<.3) depth+=1+Math.floor(r()*2);
        for(let j=0;j<depth;j++) px(i,j,g[Math.min(4,Math.floor((j===0?.6:.25+r()*.75)*5))]);
        px(i,depth,shade(get(i,depth),.78)); }
      break; }
    case 'log': {
      const p=PAL.bark.map(hex);
      for(let i=0;i<T;i++){ let idx=1+((i*7+Math.floor(r()*3))%4), run=0;
        for(let j=0;j<T;j++){ if(run--<=0){ idx=Math.max(1,Math.min(4,idx+Math.round(r()*2-1))); run=2+Math.floor(r()*4); } px(i,j,p[idx]); } }
      for(let n=0;n<4;n++){ const i=Math.floor(r()*T), j0=Math.floor(r()*12), len=3+Math.floor(r()*5); for(let j=j0;j<Math.min(T,j0+len);j++) px(i,j,p[0]); }
      break; }
    case 'ore':
      rockBase(rock);
      if(m.kind==='gem'){
        const S = GEM_SPR[m.cut];
        const spots = m.cut==='brilliant' ? [[1,2],[8,8]] : m.cut==='oval' ? [[1,2],[7,8]] : [[2,1],[9,8]];
        spots.forEach(([a,b])=>{ // dark socket shadow under each stone
          S.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(ch!=='.') px(a+i+1,b+j+1,shade(get(a+i+1,b+j+1),.55)); }));
          gem(S,m.facets,a,b); });
        sparkle(spots[0][0]+1,spots[0][1]+1,'#ffffff',m.facets.H);
        px(13,2,hex('#ffffff')); px(3,13,hex(m.facets.H));
      } else {
        inclusions(m.style||'blob', {ore:m.ore,hi:m.hi,dk:m.dk,spark:m.spark, rim:(m.rimDark&&DARK_ROCK)?m.rimDark:null});
      }
      break;
    case 'blast': {
      // riveted iron casing around a white-hot core
      const steel=['#24242a','#2e2e35','#38383f'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,steel[Math.floor(r()*3)]);
      for(let i=1;i<T-1;i++){ px(i,1,hex('#5c5c66')); px(1,i,hex('#5c5c66')); px(i,T-2,hex('#17171b')); px(T-2,i,hex('#17171b')); }
      [[2,2],[13,2],[2,13],[13,13]].forEach(([a,b])=>{ px(a,b,hex('#9a9aa6')); px(a+1,b+1,hex('#111114')); });
      const ramp=['#ffffff','#fff6b8','#ffd23f','#ff9a1f','#e2481a','#8a1e10'];
      for(let j=3;j<13;j++)for(let i=3;i<13;i++){ const dd=Math.hypot(i-7.5,j-7.5)+(r()-.5)*.5; const k=Math.floor(dd/1.05); if(k<ramp.length) px(i,j,hex(ramp[k])); }
      // vents
      [[7,3],[8,3],[7,12],[8,12],[3,7],[3,8],[12,7],[12,8]].forEach(([a,b])=>px(a,b,hex('#ffb23a')));
      sparkle(13,5,'#fff6b8','#ff9a1f'); px(11,2,hex('#ffd23f'));
      break; }
    case 'fossil': {
      // sandstone with a ridged ammonite
      const sand=['#a8844e','#b8925a','#c6a066','#d2ad73'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,sand[Math.floor(r()*4)]);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++){
        const dx=i-7.5, dy=j-7.5, rr=Math.hypot(dx,dy); if(rr>6.7) continue;
        if(rr>6.0){ px(i,j,hex('#6b5332')); continue; }
        const th=Math.atan2(dy,dx); const u=rr/2.1 - (th+Math.PI)/(2*Math.PI); const fr=u-Math.floor(u);
        const rib=(Math.floor((th+Math.PI)/(Math.PI/7))%2)===0;
        let col = fr<.34 ? (fr<.17?'#5e4a2c':'#8a7148') : (dx+dy<-2 ? '#fbf3dc' : rib ? '#e9dcb8' : '#d9c9a0');
        px(i,j,hex(col));
      }
      sparkle(12,3,'#fffbe8','#ffe9a8'); px(3,12,hex('#fff4c8')); px(5,4,hex('#ffffff'));
      break; }
    case 'sledgehammer': {
      // fallback art (the design package's sprite is used when it loads)
      const bg=['#121826','#172033','#1c2740'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.floor(r()*3)]);
      for(let i=2;i<14;i++){ px(i,1,hex('#5a6270')); px(i,2,hex('#2e333c')); }
      [[2,1],[3,1],[12,1],[13,1]].forEach(([a,b])=>px(a,b,hex('#1a1d22'))); px(2,2,hex('#111316')); px(13,2,hex('#111316'));
      for(let j=3;j<11;j++) for(let i=5;i<11;i++) px(i,j,hex(i===5?'#ffe58a':i===10?'#b8860b':(j%3===0?'#c9960f':'#f2b81c')));
      for(let i=5;i<11;i++){ px(i,3,hex('#3a3f48')); px(i,10,hex('#3a3f48')); }
      px(7,6,hex('#2a2a2a')); px(8,6,hex('#2a2a2a')); px(7,7,hex('#2a2a2a')); px(8,7,hex('#2a2a2a'));
      for(let j=11;j<14;j++){ px(7,j,hex('#d8e2ee')); px(8,j,hex('#7d8a9e')); }
      px(7,14,hex('#ffffff')); px(8,14,hex('#b8c4d4')); px(7,15,hex('#e4ecf6'));
      [[2,10],[13,12],[12,5]].forEach(([a,b])=>{ px(a,b,hex('#fff6b8')); px(a+1,b,hex('#ffd23f')); px(a-1,b,hex('#ffd23f')); px(a,b+1,hex('#ffd23f')); px(a,b-1,hex('#ffd23f')); });
      break; }
    case 'drill': {
      // a classic miner's star drill: a long steel rod, the battered striking end bottom-left, the star-shaped bit top-right
      const bg=['#121826','#172033','#1c2740'].map(hex);
      if(!ov) for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.floor(r()*3)]);
      const pm=new Map(), P=(i,j,col)=>{ if(i>=0&&j>=0&&i<T&&j<T) pm.set(i+','+j,col); };
      for(let j=0;j<T;j++)for(let i=0;i<T;i++){ const sd=i+j, dd=i-j;
        if((sd===15||sd===16)&&dd>=-8&&dd<=6) P(i,j,sd===15?'#d8dce4':'#7e848e');
        if(sd>=13&&sd<=18&&dd>=-11&&dd<=-9) P(i,j,sd===13||sd===18||dd===-11?'#4a4e56':'#9aa0aa');
        if(dd>=7&&dd<=10&&sd>=13&&sd<=18&&Math.abs(sd-15.5)<=(11-dd)*.9) P(i,j,dd>=9?'#ffffff':'#c8ccd4');
        if(dd===11&&(sd===15||sd===16)) P(i,j,'#ffffff'); }
      P(13,2,'#ffe9a0'); P(14,1,'#ffe9a0');
      const rim=[]; pm.forEach((_,k)=>{ const [i,j]=k.split(',').map(Number); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{ const n=(i+a)+','+(j+b); if(!pm.has(n)&&i+a>=0&&j+b>=0&&i+a<T&&j+b<T) rim.push(n); }); });
      rim.forEach(n=>pm.set(n,'#140e0a')); pm.forEach((col,k)=>{ const [i,j]=k.split(',').map(Number); px(i,j,hex(col)); });
      break; }
    case 'rescue': {
      // round glass flask with rose liquid and a cork
      const bg=['#1a1020','#20142a','#261832'].map(hex);
      if(!ov) for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.floor(r()*3)]);
      for(let i=6;i<10;i++){ px(i,1,hex('#a8743c')); px(i,2,hex('#7a4f24')); }
      for(let j=3;j<6;j++){ px(6,j,hex('#cfe6ee')); px(9,j,hex('#8fb0bc')); px(7,j,hex('#e8f6fb')); px(8,j,hex('#bcd8e2')); }
      for(let j=5;j<15;j++) for(let i=2;i<14;i++){ const d=Math.hypot(i-7.5,j-9.5); if(d>5.6) continue;
        let col = d>4.9 ? '#cfe6ee' : j<8 ? '#3a2a44' : (d<2.4?'#ff9ab8':(i+j)%5===0?'#ff4f86':'#ff6a9a');
        px(i,j,hex(col)); }
      px(5,8,hex('#ffffff')); px(5,9,hex('#ffffff')); px(6,7,hex('#ffffff'));
      px(9,10,hex('#ffe0ea')); px(7,12,hex('#ffe0ea')); px(10,12,hex('#ffd0e0'));
      [[2,3],[13,4]].forEach(([a,b])=>{ px(a,b,hex('#ffffff')); px(a+1,b,hex('#ffb0c8')); px(a-1,b,hex('#ffb0c8')); px(a,b+1,hex('#ffb0c8')); px(a,b-1,hex('#ffb0c8')); });
      break; }
    case 'luck': {
      // round flask of green-gold liquid with a four-leaf clover
      const bg=['#0f1d17','#13251c','#182d22'].map(hex);
      if(!ov) for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.floor(r()*3)]);
      for(let i=6;i<10;i++){ px(i,1,hex('#a8743c')); px(i,2,hex('#7a4f24')); }
      for(let j=3;j<6;j++){ px(6,j,hex('#cfe6ee')); px(9,j,hex('#8fb0bc')); px(7,j,hex('#e8f6fb')); px(8,j,hex('#bcd8e2')); }
      for(let j=5;j<15;j++) for(let i=2;i<14;i++){ const d=Math.hypot(i-7.5,j-9.5); if(d>5.6) continue;
        let col = d>4.9 ? '#cfe6ee' : j<8 ? '#2a4034' : (d<2.4?'#b8ffcc':(i+j)%5===0?'#2fd870':'#4fe88a');
        px(i,j,hex(col)); }
      [[7,8],[8,8],[6,9],[9,9],[7,10],[8,10]].forEach(([a,b])=>px(a,b,hex('#1a7a3c'))); px(7,9,hex('#ffe36a')); px(8,9,hex('#ffe36a')); px(7,11,hex('#1a7a3c'));
      px(5,8,hex('#ffffff')); px(5,9,hex('#ffffff')); px(6,7,hex('#ffffff'));
      [[2,3],[13,4]].forEach(([a,b])=>{ px(a,b,hex('#ffffff')); px(a+1,b,hex('#ffe36a')); px(a-1,b,hex('#ffe36a')); px(a,b+1,hex('#ffe36a')); px(a,b-1,hex('#ffe36a')); });
      break; }
    case 'treasure': {
      // half-open chest spilling gold light
      const earth=['#24180f','#2d1f13','#362617'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,earth[Math.floor(r()*3)]);
      const wood=['#5e3a1c','#774a24','#8f5c2e','#a46c37'].map(hex), gold=hex('#f5c93c'), goldD=hex('#b07d12'), goldL=hex('#fff2a6');
      for(let j=3;j<7;j++) for(let i=(j===3?3:2);i<(j===3?13:14);i++) px(i,j, wood[j===3?3:2]);
      for(let i=2;i<14;i++){ px(i,7,hex('#fff7c2')); }
      for(let i=4;i<12;i++){ px(i,7,hex('#ffffff')); }
      for(let j=8;j<15;j++) for(let i=1;i<15;i++) px(i,j, wood[j===14?0:(j%3===2?1:2)]);
      for(let j=3;j<15;j++){ if(j!==7){ px(3,j,gold); px(12,j,goldD); } }
      for(let i=1;i<15;i++) px(i,14,goldD);
      for(let j=8;j<11;j++) for(let i=7;i<9;i++) px(i,j,gold); px(7,8,goldL); px(8,10,goldD);
      // light rays and coins above the lid
      [[5,1],[8,0],[11,1],[6,2],[10,2]].forEach(([a,b])=>px(a,b,hex('#ffe36a')));
      sparkle(8,1,'#ffffff','#ffe36a'); px(2,1,hex('#fff2a6')); px(14,4,hex('#fff2a6'));
      break; }
  }
  if(!ov) for(let i=0;i<T;i++){ px(i,0,shade(get(i,0),1.12)); px(0,i,shade(get(0,i),1.12)); px(i,T-1,shade(get(i,T-1),.68)); px(T-1,i,shade(get(T-1,i),.68)); }
  x.putImageData(img,0,0);
  return c;
}
const GEM_SPR={ brilliant:['.XXXXX.','XLHLHMX','XHHHMMX','.XHMMX.','..XMX..','...X...'], step:['.XXXX.','XLLHHX','XLHHMX','XHHMMX','XHMMDX','XMMDDX','.XXXX.'],
  oval:['..XXXX..','.XLHHMX.','XLHHMMMX','XHHMMMDX','XHMMMDDX','.XMMDDX.','..XXXX..'] };
const TEX = {}, OVERC = {}, ROCKC = {}, SPR = {};
// --- the design package's sprites (loaded by assets.js before this file runs); procedural art above is the fallback ---
const AIMG=(window.DeepcoreAssets&&window.DeepcoreAssets.img)||{};
function imgCanvas(name){ const im=AIMG[name]; if(!im) return null; const c=document.createElement('canvas'); c.width=c.height=T; const x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.drawImage(im,0,0,T,T); return c; }
const ROCKS=['dirt','stone','granite','deep','ember','obsidian','crust'];
const ROCK_ASSET={stone:'blocks/limestone',granite:'blocks/granite',deep:'blocks/slate',obsidian:'blocks/basalt',ember:'blocks/magmastone',crust:'blocks/crust'};
const BASE_ASSET={grass:'blocks/topsoil',log:'blocks/wood-bark',...ROCK_ASSET};
const OVER_ASSET={bone:'ores/bone',meteorite:'ores/meteorite',prismore:'ores/prism-ore',coal:'ores/coal',iron:'ores/iron',copper:'ores/copper',gold:'ores/gold',ruby:'gems/ruby',emerald:'gems/emerald',diamond:'gems/diamond',blast:'specials/blast-charge',sledgehammer:'specials/sledgehammer'};
function compose(base,over){ const c=document.createElement('canvas'); c.width=c.height=T; const x=c.getContext('2d'); x.drawImage(base,0,0); x.drawImage(over,0,0); return c; }
// plain dirt: the topsoil block with its grass painted over by soil from lower down
function dirtFromTopsoil(){
  const t=imgCanvas('blocks/topsoil'); if(!t) return null; const c=document.createElement('canvas'); c.width=c.height=T; const x=c.getContext('2d'); x.drawImage(t,0,0);
  x.drawImage(t,0,9,T,5,0,0,T,5); x.drawImage(t,0,10,T,3,0,5,T,3);
  x.fillStyle='rgba(255,255,255,.14)'; x.fillRect(0,0,T,1); return c;
}
Object.entries(OVER_ASSET).forEach(([k,n])=>{ const c=imgCanvas(n); if(c) OVERC[k]=c; });
ROCKS.forEach(rk=>{ ROCKC[rk]=(rk==='dirt'?dirtFromTopsoil():imgCanvas(ROCK_ASSET[rk]))||makeTex(rk,0); });
Object.keys(MATS).forEach((k,i)=>{
  const m=MATS[k];
  if(m.kind==='ore'||m.kind==='gem') ROCKS.forEach(rk=>{ TEX[k+'@'+rk]=OVERC[k]?compose(ROCKC[rk],OVERC[k]):makeTex(k,i,rk); });
  else if(OVERC[k]) TEX[k]=compose(ROCKC.deep,OVERC[k]);                       // blast charge, sledgehammer: shown on slate
  else if(ROCKC[k]) TEX[k]=ROCKC[k];
  else if(BASE_ASSET[k]&&imgCanvas(BASE_ASSET[k])) TEX[k]=imgCanvas(BASE_ASSET[k]);
  else if(k==='dirt') TEX[k]=dirtFromTopsoil()||makeTex(k,i);
  else TEX[k]=makeTex(k,i);
});
// transparent versions for the dock and strip: package overlays, or procedural potions without their background square
Object.keys(MATS).forEach((k,i)=>{ if(OVERC[k]) SPR[k]=OVERC[k]; else if(MATS[k].kind==='potion'||MATS[k].kind==='special') SPR[k]=makeTex(k,i,undefined,true); });
// glow, per the design tokens (values are for a 42px cell and scale with the cell)
const GLOWS={ meteorite:{c:'rgba(160,140,255,.7)',lo:3,hi:5,period:3600}, prismore:{c:'rainbow',lo:4,hi:7,period:2400}, gold:{c:'rgba(255,220,80,.70)',lo:2,hi:3,period:3200}, ruby:{c:'rgba(255,50,80,.75)',lo:4,hi:6,period:4000}, emerald:{c:'rgba(50,230,120,.70)',lo:4,hi:6,period:4000}, diamond:{c:'rgba(90,235,255,.75)',lo:4,hi:6,period:4000} };
function overlayGlow(ctx,m,x,y,size,now,dpr){
  const ov=OVERC[m]; if(!ov||!(MATS[m].kind==='ore'||MATS[m].kind==='gem')) return;
  const k=size/42, g=GLOWS[m]; ctx.save(); ctx.imageSmoothingEnabled=false;
  ctx.shadowColor=MATS[m].kind==='gem'?'rgba(255,255,255,.6)':'rgba(255,255,255,.55)'; ctx.shadowBlur=.8*k*dpr; ctx.drawImage(ov,x,y,size,size);
  if(g){ const ph=.5-.5*Math.cos(((now||0)%g.period)/g.period*Math.PI*2); ctx.shadowColor=g.c==='rainbow'?`hsla(${Math.round(((now||0)/12)%360)},100%,65%,.85)`:g.c; ctx.shadowBlur=(g.lo+(g.hi-g.lo)*ph)*k*dpr; ctx.drawImage(ov,x,y,size,size); }
  ctx.restore();
}

// ---------- tiers ----------
const texOf=m=> (MATS[m].kind==='ore'||MATS[m].kind==='gem') ? TEX[m+'@'+levelDef(level).rock] : TEX[m];


// ---------- state ----------
let dealt={}, grid, pieces, score=0, combo=0, sinceClear=0, over=false, busy=false, level=1, collected={}, shownCol={}, since={};
// the belt (F-13, v2.4.0): BELT_MAX slots shared by equipment and potions; specials[i] is what slot i holds (null = empty).
// A run starts with one slot; belt slots 2 and 3 are unlocked in Craft on the map. The workshop is kept for the run (dayState.wk), like tools.
let specials=[null,null,null];
const kindOf=m=>(RECIPES.find(r=>r.m===m)||{}).kind||'equip';
const wk=()=>dayState.wk||(dayState.wk={});
const beltCap=()=>Math.min(BELT_MAX,1+(wk().belt2?1:0)+(wk().belt3?1:0));
const beltFree=()=>{ for(let i=0;i<beltCap();i++) if(!specials[i]) return i; return -1; };
const dockCount=m=>specials.filter(x=>x===m).length;
const dockRemove=i=>{ if(i>=0&&i<BELT_MAX) specials[i]=null; };
// the belt always has BELT_MAX entries; anything in a locked slot moves to a free unlocked one, or goes back to the stash as its ore
function fitDock(){ let refund=false; const src=Array.isArray(specials)?specials:[], arr=Array(BELT_MAX).fill(null), cap=beltCap(), extra=[];
  src.forEach((m,i)=>{ if(!m||!RECIPES.some(r=>r.m===m)) return; if(i<cap) arr[i]=m; else extra.push(m); });
  extra.forEach(m=>{ const i=arr.findIndex((v,k)=>!v&&k<cap); if(i>=0) arr[i]=m; else { const rc=RECIPES.find(r=>r.m===m); Object.entries(rc.cost).forEach(([k,v])=>bank[k]=(bank[k]||0)+v); refund=true; } });
  specials=arr; if(refund) saveProfile(); return refund; }
let reached=false, reachScore=0, clearBonus=0, decided=true, hintInfo=null, sheetMode='';
let practice=false, bank={}, hand={}, luck=0, luckLive=false, prot=0, protLive=false, moves=0, fragments=0, boardT0=0, lastAct=0;

// ---------- the descent: one run from the Forest to the Ancient Core, kept from day to day ----------
// Days are Pacific-time days (the daily twist follows them). Clear at least one board a day to keep
// your progress; miss a whole day and you drop back to the start of the layer you're in, or to its camp (its first board).
const PACIFIC=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
function todayKey(){ return PACIFIC.format(new Date()); }
const freshRun=day=>({v:2, seed:day+'#'+Math.floor(Math.random()*1e9).toString(36), started:day, day, lastClear:'', days:0, done:[], scores:{}, stars:{}, attempts:{}, fails:{}, tool:0, dur:DUR_MAX, camp:0, notice:null, mined:{}});
let dayState=freshRun(todayKey());
const _bd={}; let curDiff=null;   // the difficulty of the board in play (v2.6.0)
function boardDef(idx){
  const df=(curDiff&&idx===level-1&&pieces)?curDiff:(settings.diff||'casual');   // a board keeps the difficulty it started with
  const key=dayState.seed+':'+dayState.day+':'+idx+':'+df; if(_bd[key]) return _bd[key];
  const zi=zoneOfIdx(idx), j=jOfIdx(idx), z=ZONES[zi];
  const nm=boardName(zi,j);
  return _bd[key]={ idx, name:nm, goals:{}, ...DeepcoreData.boardParams(zi,j,modifierFor(dayState.day),df) };
}
function levelDef(L){ return boardDef(L-1); }
// v2.1.1: boards are numbered within their layer ("Magmastone board #3"); the grid maps (F-11) will have far too many to name
function boardName(zi,j){ const z=ZONES[zi]; return z.core?'The Ancient Core':`${z.name.replace(/^The /,'')} board #${j+1}`; }
const boardLabel=idx=>idx===CORE_IDX?'Core':`${zoneOfIdx(idx)+1}-${jOfIdx(idx)+1}`;

const emptyGrid=()=>Array.from({length:N},()=>Array(N).fill(null));
const difficulty=()=>levelDef(level).d;
function occBits(g){ let lo=0,hi=0; for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(g[r][c]){ const [a,b]=bitOf(r,c); lo|=a; hi|=b; } return [lo>>>0,hi>>>0]; }

// ---------- dealer: every set is solver-checked ----------
function specialOnField(){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(grid[r][c] && MATS[grid[r][c]].kind==='special') return true;
  return (pieces||[]).concat([nextPiece]).some(p=>p && p.mats.some(m=>MATS[m].kind==='special'));
}
function pickBase(){ return DeepcoreCore.pickBase(levelDef(level)); }
function dressPiece(s,setSoFar){
  const def=levelDef(level), d2=luckLive?{...def,specialMul:(def.specialMul||1)*2}:def;   // a Potion of Luck doubles random specials
  return DeepcoreCore.dressPiece(s,d2,{dealt,budgeted:true,specialBlocked:specialOnField()||setSoFar.some(p=>p.mats.some(m=>MATS[m].kind==='special'))});
}
// both potions count placements (v2.3.0, the rolling tray): five pips, each worth three placements
function potionBadge(id,txt,left,word,last){
  const lit=Math.ceil(left/3), b=$(id); b.hidden=left<=0;
  b.querySelector('.pips').innerHTML=Array.from({length:Math.ceil(POTION_MOVES/3)},(_,i)=>`<i class="${i<lit?'on':''}"></i>`).join('');
  $(txt).textContent=left>1?`${word}: ${left} placements`:last; return left>0; }
function updateLuckUI(){
  luckLive=luck>0; protLive=prot>0;
  const a=potionBadge('luckBadge','luckTxt',luck,'Luck','Last lucky placement'), b=potionBadge('protBadge','protTxt',prot,'Protected','Last protected placement');
  $('potionBadges').classList.toggle('both',a&&b);
  $('tray').classList.toggle('lucky',luckLive); $('tray').classList.toggle('guarded',protLive);
}
// tap a potion in the dock to drink it: it lasts POTION_MOVES placements. Luck leans the pieces dealt in that time; Protection undoes any cave-in in it.
function drinkPotion(m){
  const i=specials.indexOf(m); if(busy||over||uiOpen()||i<0) return;
  if(m==='luck'&&luck>0 || m==='rescue'&&prot>0){ showCombo(m==='luck'?'Luck is already working':'You are already protected'); return; }
  dockRemove(i); score=Math.max(0,score+SCORE.special[m]); shown=score; updateBar();
  if(m==='luck') luck=POTION_MOVES; else prot=POTION_MOVES;
  renderDock(); updateLuckUI(); updateAnvilGlow(); saveProfile(); saveBoard();
  A.track(m==='luck'?'luck_drunk':'protection_drunk',{idx:level-1,score,moves}); life.seen[m]=true;
  busy=true; const d=m==='luck'?playSplash('Potion of Luck',`The next ${POTION_MOVES} placements favour you · ${SCORE.special.luck}`,'luck')
    :playSplash('Potion of Protection',`Safe from cave-ins for ${POTION_MOVES} placements · ${SCORE.special.rescue}`,'rescue');
  setTimeout(()=>{ busy=false; },d);
}
const drinkLuck=()=>drinkPotion('luck');
let bigNext=0;   // after an All Clear: the next few pieces dealt lean big (a count; old saves have true)
// after 2 cave-ins on the same board today the dealer starts leaning your way (0, 0, .35, .7, then .75)
const mercyTilt=()=>Math.min(.75,Math.max(0,((dayState.fails||{})[level-1]||0)-1)*.35);
// The rolling tray (v2.3.0) on endless boards (F-14, v2.4.0): each placement is refilled at once with the "next" piece shown above the board,
// and a new next piece is dealt so the tray plus it can all be placed, until the board has lasted its grace (about the old board length).
// After that the dealer hardens (C.rampD) and, more and more often, deals an awkward piece with no promise (C.wildOf), so boards end.
// dealtN counts the pieces dealt (tray and next); each piece carries its share of the layer's ore (C.orePiece, def.orePer).
let dealtN=0, nextPiece=null;
const dealOpts=()=>{ const dd=levelDef(level), g=dd.grace; return {luck:luck>0?1:0,tilt:mercyTilt(),big:bigNext>0,mercy:dd.ramp.mercy,wild:(luck>0?.5:1)*(1-mercyTilt())*wildOf(moves,g,dd.ramp)}; };
const dealD=()=>rampD(difficulty(),moves,levelDef(level).grace,levelDef(level).ramp);
function dealPiece(s){ dealtN++; const p=dressPiece(s,(pieces||[]).filter(Boolean)); orePiece(p,levelDef(level),dealt); return p; }
function dealOne(){
  const [lo,hi]=occBits(grid), held=(pieces||[]).filter(Boolean).map(p=>SHAPES[p.sid]);
  const s=chooseNext(lo,hi,held,dealD(),dealOpts()); if(bigNext>0) bigNext--;
  return dealPiece(s);
}
// a whole tray: the start of a board, or a fresh tray after a Protection save or a Lucky Dodge (always solvable)
function dealSet(){
  const [lo,hi]=occBits(grid); let set;
  if(tut.active&&tut.stage===0){ set=TUT_SET.map(str=>SHAPES[SHAPE_STRS.indexOf(str)]); tut.stage=1; }
  else set=chooseTray(lo,hi,3,dealD(),{...dealOpts(),wild:0});
  nextPiece=null; pieces=[null,null,null]; set.forEach((sh,i)=>{ pieces[i]=dealPiece(sh); });
  nextPiece=dealOne(); updateLuckUI();
}
// each placement uses up a placement of any potion working
function tickPotions(){
  if(luck>0&&!--luck){ showCombo('Potion of Luck wore off'); blip(330,.2,'sine',.05); }
  if(prot>0&&!--prot){ setTimeout(()=>showCombo('Protection wore off'),luck?0:200); blip(300,.2,'sine',.05); }
  updateLuckUI();
}
// Starter blocks: scattered clumps, never a locked hole or a tiny sealed pocket
function prefill(){
  const def=levelDef(level); if(!def.pre) return;
  const commonOres=def.ores.filter(k=>ORES[k].p>=.1);
  for(let attempt=0;attempt<80;attempt++){
    const g=emptyGrid(); let count=def.pre+Math.round(Math.random()*2-1);
    const rowN=Array(N).fill(0), colN=Array(N).fill(0);
    const ok=(r,c)=>r>=0&&c>=0&&r<N&&c<N&&!g[r][c]&&rowN[r]<4&&colN[c]<4;
    let guard=0;
    while(count>0&&guard++<200){
      let r=Math.floor(Math.random()*N), c=Math.floor(Math.random()*N); const clump=1+Math.floor(Math.random()*3);
      for(let k=0;k<clump&&count>0;k++){ if(!ok(r,c)) break;
        g[r][c]=pickBase();   // starter blocks are plain rock: all ore comes from the board's budget
        rowN[r]++; colN[c]++; count--;
        if(Math.random()<.5) r+=Math.random()<.5?1:-1; else c+=Math.random()<.5?1:-1; }
    }
    const [lo,hi]=occBits(g);
    if(hasLockedHole(lo,hi)) continue;
    // also reject sealed pockets of 2 cells
    let bad=false; const seen=new Uint8Array(64);
    for(let r=0;r<N&&!bad;r++)for(let c=0;c<N&&!bad;c++){ if(g[r][c]||seen[r*8+c]) continue;
      let size=0; const st=[[r,c]]; seen[r*8+c]=1;
      while(st.length){ const [a,b]=st.pop(); size++; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{ const A=a+dr,B=b+dc; if(A<0||B<0||A>=N||B>=N||seen[A*8+B]||g[A][B]) return; seen[A*8+B]=1; st.push([A,B]); }); }
      if(size<=2) bad=true; }
    if(bad) continue;
    grid=g; return;
  }
}

// ---------- DOM ----------
const $=id=>document.getElementById(id);
const boardC=$('board'), bx=boardC.getContext('2d'), ghost=$('ghost'), gx=ghost.getContext('2d');
const fxC=$('fx'), fx=fxC.getContext('2d');
const slots=[...document.querySelectorAll('.slot')];
const SEAM=2; let cell=44, bs=42, trayCell=20; const dpr=Math.max(1,window.devicePixelRatio||1);
const MEDIA_REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches; let REDUCE=MEDIA_REDUCE;

// Board geometry: `cell` is the pitch between blocks, `bs` the block size (pitch minus the 2px seam). 42px blocks on a 390pt screen.
const wide=()=>matchMedia('(orientation:landscape) and (min-aspect-ratio:13/10)').matches;
function layout(){
  const wrap=$('boardWrap'); wrap.style.flex=''; wrap.style.height='';           // measure the free space, then shrink the wrap to the board so spare room is shared evenly between the rows
  const availW=Math.min(wrap.clientWidth,820)-8, availH=wrap.clientHeight-8;   // v2.6.1: tablets get a bigger board
  const size=Math.max(200,Math.min(availW,availH));
  cell=Math.max(26,Math.min(96,Math.floor((size+SEAM)/N))); bs=cell-SEAM; const px=cell*N-SEAM;
  boardC.style.width=px+'px'; boardC.style.height=px+'px'; boardC.width=Math.round(px*dpr); boardC.height=Math.round(px*dpr);
  if(!wide()){ wrap.style.flex='none'; wrap.style.height=(px+8)+'px'; }   // on wide screens the board's grid cell keeps its full height
  fxC.width=innerWidth*dpr; fxC.height=innerHeight*dpr;
  drawTray();
}
window.addEventListener('resize',layout);
if(window.ResizeObserver) new ResizeObserver(()=>{ if(!$('app').clientHeight) return; layout(); }).observe($('app'));

function buildGoals(){
  $('goalsBar').innerHTML='<div id="scoreBox" aria-label="Board points"><b id="pscore">0</b><span id="pgoal"></span><span id="streakChip" hidden></span></div><div id="nextBox" aria-label="Next piece"><span>NEXT</span><div><canvas></canvas></div></div><div id="starChip" role="img" aria-label="Stars"><i>★</i><i>★</i><i>★</i></div>';
  updateBar();
}
function updateGoals(){}
const starAt=()=>levelDef(level).starAt;
// v2.0.4: stars come from the board's points (starsFromScore against its star lines); since v2.1.0 the stars are the progress meter
const yieldNow=()=>score;
const starsNow=()=>starsFromScore(score,starAt());
function updateBar(){
  const el=$('pscore'); if(!el) return; const dd=levelDef(level), at=starAt();
  el.textContent=shown.toLocaleString(); $('pgoal').textContent=dd.core?'':`${moves} placement${moves===1?'':'s'}`; updateCart();
  const chip=$('starChip'); if(chip&&at.length){ chip.hidden=false; updateStarMeter(chip,shown,at); } else if(chip) chip.hidden=true;
}
let shown=0;
// the cart bar (F-14): a mine cart rolls toward the exit as the points climb to the last star line; from the first star it lights up and a tap
// asks "Done here?" (leave with the haul). The third star ends the board on its own.
function updateCart(){ const b=$('cartBar'); if(!b) return; const at=starAt(), k=at.length?starsFromScore(shown,at):0, on=k>=1&&!over&&!reached&&screen==='game';
  b.classList.toggle('on',on); b.classList.toggle('off',!on); b.hidden=!at.length;
  const f=at.length?Math.max(0,Math.min(1,shown/at[2])):0, cart=b.querySelector('.cart'); if(cart) cart.style.left=`calc(12px + (100% - 82px) * ${f.toFixed(3)})`;
  if(b.dataset.on!==String(on)){ b.dataset.on=String(on); b.setAttribute('aria-label',on?`Leave the board with ${k} star${k>1?'s':''} and your haul`:'Leave the board (earn a star first)'); drawCartArt(on); if(on&&k===1) tipOnce('cart',()=>toast('You have a star! Tap the mine cart bar to leave with your haul, or keep mining for more.',5200)); } }
// the star meter: each star fills as the points climb from the previous star line to its own, and lights up once reached
let meterLit=0;
function updateStarMeter(chip,y,at){
  const k=starsFromScore(y,at);
  [...chip.children].forEach((st,i)=>{ const lo=i?at[i-1]:0, f=Math.max(0,Math.min(1,(y-lo)/Math.max(1,at[i]-lo)));
    st.style.setProperty('--f',(f*100).toFixed(0)+'%'); st.classList.toggle('lit',i<k); if(i<k&&i>=meterLit) { st.classList.remove('gain'); void st.offsetWidth; st.classList.add('gain'); } });
  meterLit=k;
  const txt=`${y.toLocaleString()} points. ${at[0].toLocaleString()} earns one star, ${at[1].toLocaleString()} two, ${at[2].toLocaleString()} three.`; chip.setAttribute('aria-label',`${k} of 3 stars. ${txt}`); chip.title=txt;
}
function updateComboMeter(){}   // the multiplier is shown with the points when lines clear, not as a permanent badge
function updateHUD(){   // two lines so long layer names fit beside the buttons: "Limestone Caves" over "Board #2"
  const zn=$('zoneName'), d=level?levelDef(level):null; zn.innerHTML=''; zn.setAttribute('aria-label',d?d.name:'');
  if(d){ const a=document.createElement('span'), b=document.createElement('b'); a.textContent=d.core?'':d.zoneName.replace(/^The /,''); b.textContent=d.core?d.name:`Board #${d.j+1}`; zn.append(a,b); }
  updateDur(); }   // the board header stays calm: details live in the pause sheet
function tickScore(){ updateHintBtn();   // v2.1.1: every frame, so Hint wakes up as soon as a splash or banner ends
  if(shown<score){ shown+=Math.max(1,Math.ceil((score-shown)/8)); if(shown>score) shown=score; } else if(shown>score) shown=score; updateBar(); }

// pitch = distance between blocks, size = block size (a seam shows between them when size < pitch)
function drawPiece(ctx,p,pitch,ox=0,oy=0,alpha=1,size=pitch){
  ctx.imageSmoothingEnabled=false; ctx.globalAlpha=alpha;
  p.cells.forEach(([r,c],k)=>{ const x=ox+c*pitch, y=oy+r*pitch; ctx.drawImage(texOf(p.mats[k]),x,y,size,size); overlayGlow(ctx,p.mats[k],x,y,size,3000,dpr); });
  ctx.globalAlpha=1;
}
function fitsAt(p,r0,c0){ for(const [r,c] of p.cells){ const R=r0+r,C=c0+c; if(R<0||C<0||R>=N||C>=N||grid[R][C]) return false; } return true; }
function canPlaceAnywhere(p){ for(let r=0;r<=N-p.h;r++)for(let c=0;c<=N-p.w;c++) if(fitsAt(p,r,c)) return true; return false; }
// the slot you just emptied takes the next piece with a small drop
function dropIn(i){ const sl=slots[i]; if(!sl) return; sl.classList.remove('drop'); void sl.offsetWidth; sl.classList.add('drop'); setTimeout(()=>sl.classList.remove('drop'),300); }
// the next piece, small, beside the score: it drops into the slot you empty with your next placement
function drawNext(){
  const box=$('nextBox'); if(!box) return; const cv=box.querySelector('canvas'), p=nextPiece;
  box.classList.toggle('none',!p); if(!p){ cv.hidden=true; return; }
  const pitch=Math.max(5,Math.min(12,Math.floor(66/p.w),Math.floor(43/p.h))), c=pitch-1, w=p.w*pitch-1, h=p.h*pitch-1;   // v2.4.0: bigger, filling its box
  cv.hidden=false; cv.style.width=w+'px'; cv.style.height=h+'px'; cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); drawPiece(ctx,p,pitch,0,0,1,c);
}
function drawTray(){
  drawNext();
  if(!pieces) return;
  // one fixed piece size for every piece (20pt on a 390pt screen), big enough that a 1x5 bar fits its slot: nothing ever resizes
  const sw=slots[0].clientWidth, sh=slots[0].clientHeight; trayCell=sw>0?Math.max(12,Math.min(20,Math.floor((sw-12)/5),Math.floor((sh-4)/5)-2)):20;
  const pitch=trayCell+2;
  slots.forEach((s,i)=>{
    const cv=s.firstElementChild, p=pieces[i];
    if(!p){ cv.hidden=true; s.classList.remove('nofit','special'); return; }
    const w=p.w*pitch-2, h=p.h*pitch-2;
    cv.hidden=false; if(!drag||drag.i!==i) cv.style.opacity=''; cv.style.width=w+'px'; cv.style.height=h+'px'; cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
    const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); drawPiece(ctx,p,pitch,0,0,1,trayCell);
    s.classList.toggle('nofit',!canPlaceAnywhere(p));
    s.classList.toggle('special',p.mats.some(m=>MATS[m].kind==='special'));
  });
}

// ---------- loose items (ore/gem freed from rock) ----------
const ITEM={};
(function makeItems(){
  const nug=[[[1,0],[0,1],[1,1],[2,1],[1,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]]];
  const spots=[[6,3],[2,9],[9,9]];
  const SPR=GEM_SPR;
  Object.entries(MATS).forEach(([k,m])=>{
    if(m.kind!=='ore'&&m.kind!=='gem') return;
    if(OVERC[k]){ ITEM[k]=OVERC[k]; return; }
    const c=document.createElement('canvas'); c.width=c.height=T; const x=c.getContext('2d');
    const P=(i,j,col)=>{ x.fillStyle=col; x.fillRect(i,j,1,1); };
    if(m.kind==='gem'){
      const S=SPR[m.cut], ox=Math.floor((T-S[0].length)/2), oy=Math.floor((T-S.length)/2);
      S.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(m.facets[ch]) P(ox+i,oy+j,m.facets[ch]); }));
    } else {
      // one chunky nugget: the biggest cluster of the ore's block art, doubled in size and centred, with a dark outline
      const mask=inclusionMask(k,m.style||'blob'), rim='#140e0a', seen=new Set(); let best=[];
      mask.forEach((_,kk)=>{ if(seen.has(kk)) return; const comp=[], st=[kk]; seen.add(kk);
        while(st.length){ const q=st.pop(); comp.push(q); const [a,b]=q.split(',').map(Number);
          [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].forEach(([dx,dy])=>{ const n=(a+dx)+','+(b+dy); if(mask.has(n)&&!seen.has(n)){ seen.add(n); st.push(n); } }); }
        if(comp.length>best.length) best=comp; });
      const pts=best.map(q=>q.split(',').map(Number)), x0=Math.min(...pts.map(q=>q[0])), y0=Math.min(...pts.map(q=>q[1]));
      const w=Math.max(...pts.map(q=>q[0]))-x0+1, h=Math.max(...pts.map(q=>q[1]))-y0+1, sc=Math.max(1,Math.min(2,Math.floor(12/Math.max(w,h))));
      const ox=Math.floor((T-w*sc)/2)-x0*sc, oy=Math.floor((T-h*sc)/2)-y0*sc, cells=new Set(pts.map(q=>q.join(',')));
      const R=(a,b,col)=>{ P(ox+a*sc+0,oy+b*sc+0,col); if(sc>1){ P(ox+a*sc+1,oy+b*sc,col); P(ox+a*sc,oy+b*sc+1,col); P(ox+a*sc+1,oy+b*sc+1,col); } };
      cells.forEach(kk=>{ const [a,b]=kk.split(',').map(Number); [[1,0],[-1,0],[0,1],[0,-1],[1,1]].forEach(([dx,dy])=>{ if(!cells.has((a+dx)+','+(b+dy))) R(a+dx,b+dy,rim); }); });
      cells.forEach(kk=>{ const [a,b]=kk.split(',').map(Number); const tp=mask.get(kk); R(a,b,tp==='spark'?m.spark:m[tp]); });
    }
    ITEM[k]=c;
  });
  // wood: a short log seen end-on with its rings, plus one lying behind it
  const w=document.createElement('canvas'); w.width=w.height=T; const wx=w.getContext('2d'); const WP=(i,j,col)=>{ wx.fillStyle=col; wx.fillRect(i,j,1,1); };
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){ const dx=i-7.5, dy=j-8, d=Math.hypot(dx,dy); if(d>6.4) continue;
    WP(i,j, d>5.6?'#140e0a' : d>4.6?'#5a3d20' : d>3.3?'#b88a52' : d>2.4?'#8f6838' : d>1.4?'#c79a62' : '#8f6838'); }
  WP(5,5,'#e8c892'); WP(6,5,'#e8c892'); WP(5,6,'#e8c892');
  ITEM.wood=w;
  // tools: an old miner's hammer crossed with a chisel. v2.6.0: each tier looks clearly better than the last: a twig mallet and a stick for
  // branch, bone, copper with rivets, iron with wrapped handles, polished steel with a leather grip and a glint, and diamond-tipped tools glowing
  // with a cyan outline and stars. Pixels are placed by their two diagonals (s=x+y, d=x-y).
  const TL={
    branch:{h:['#6b4a24','#8a6234','#4a3218'], c:['#7a5630','#9a7040','#4a3218'], wood:['#7a5630','#5a3d20'], head:4},
    bone:  {h:['#e6dcc2','#ffffff','#a89878'], c:['#e6dcc2','#ffffff','#a89878'], wood:['#a87444','#6a4520'], head:4, notch:true},
    copper:{h:['#e0803a','#ffc08a','#9a4a1a'], c:['#e0803a','#ffc08a','#9a4a1a'], wood:['#a87444','#6a4520'], head:5, rivets:'#5a2a0a'},
    iron:  {h:['#a8adb6','#e6e9ee','#5e636c'], c:['#b8bcc4','#eef0f4','#6e737c'], wood:['#a87444','#6a4520'], head:5, wraps:'#3a3a40', rivets:'#3a3f46'},
    steel: {h:['#7fa6cc','#f2f9ff','#3a5878'], c:['#9cc0e0','#ffffff','#4a6a8a'], wood:['#4a3020','#2e1d12'], head:5, wraps:'#1c1410', shine:true, glint:true},
    galaxy:{h:['#5fd8ff','#e8fbff','#1f7fb0'], c:['#7fe4ff','#ffffff','#2a8cc0'], wood:['#3a4250','#20262e'], head:5, wraps:'#7fe8ff', shine:true, glow:'#7fe8ff', stars:true},   // Diamond tools: icy, glowing, sparkling
  };
  TOOLS.forEach(t0=>{ const cc=document.createElement('canvas'); cc.width=cc.height=T; const cx=cc.getContext('2d'); const px=new Map(), L=TL[t0.id];
    const P=(i,j,col)=>{ if(i>=0&&j>=0&&i<T&&j<T) px.set(i+','+j,col); };
    const each=(f)=>{ for(let j=0;j<T;j++)for(let i=0;i<T;i++) f(i,j,i+j,i-j); };
    const [cm,cl,cd]=L.c, [hm,hl,hd]=L.h;
    // the chisel, bottom-left to top-right: a shank, an edge, a struck end
    each((i,j,s,d)=>{ const sh=s>=14&&s<=16&&d>=-7&&d<=9, tip=s===15&&d>=10&&d<=11; if(sh||tip) P(i,j, tip||d>=8?(L.shine?'#ffffff':cl) : s===14?cl:s===15?cm:cd); });
    each((i,j,s,d)=>{ if(s>=13&&s<=17&&d>=-11&&d<=-8) P(i,j, s===13||s===17||d===-11?cd:cm); });
    // the hammer's handle, top-left to bottom-right, with wraps on the better tools
    each((i,j,s,d)=>{ if((d===0||d===1)&&s>=10&&s<=27){ const wrap=L.wraps&&s>=18&&(s%3===0); P(i,j, wrap?L.wraps:d===0?L.wood[0]:L.wood[1]); } });
    if(t0.id==='branch'){ P(9,9,'#4a3218'); P(12,12,'#4a8a2c'); P(13,12,'#3a6a22'); }   // a knot and a leaf
    // the head across its top: wider for the metal tools
    const hw=L.head; each((i,j,s,d)=>{ if(s>=6&&s<=9&&Math.abs(d)<=hw) P(i,j, Math.abs(d)===hw||s===9?hd : s===6?hl:hm); });
    if(L.shine) each((i,j,s,d)=>{ if(s===6&&Math.abs(d)<=hw-1) P(i,j,'#ffffff'); });
    if(L.stars){ each((i,j,s,d)=>{ if(s>=7&&s<=8&&Math.abs(d)<=hw-1&&(d%3===0)) P(i,j,'#ffffff'); if(s===15&&d>=-6&&d<=8&&d%3===0) P(i,j,'#ffffff'); }); }   // Diamond: sparkling facets
    if(L.rivets){ P(3,4,L.rivets); P(6,1,L.rivets); }
    if(L.notch){ P(4,4,hd); }
    // outline: dark, or an icy glow for the Diamond tools
    const rim=[]; px.forEach((_,k)=>{ const [i,j]=k.split(',').map(Number); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{ const n=(i+a)+','+(j+b); if(!px.has(n)&&i+a>=0&&j+b>=0&&i+a<T&&j+b<T) rim.push(n); }); });
    rim.forEach(n=>px.set(n,L.glow?'#1f5f7a':'#140e0a'));
    if(L.glow){ const halo=[]; px.forEach((_,k)=>{ const [i,j]=k.split(',').map(Number); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{ const n=(i+a)+','+(j+b); if(!px.has(n)&&i+a>=0&&j+b>=0&&i+a<T&&j+b<T) halo.push(n); }); });
      halo.forEach(n=>px.set(n,'rgba(127,232,255,.45)')); }
    if(L.glint){ P(14,1,'#ffffff'); P(13,1,'#cfe8ff'); P(14,2,'#cfe8ff'); }
    if(L.stars){ [[1,1,'#ffffff'],[14,0,'#ffffff'],[15,4,'#bff6ff'],[0,9,'#ffffff'],[11,14,'#bff6ff'],[6,8,'#ffffff']].forEach(([i,j,c])=>px.set(i+','+j,c)); }
    px.forEach((col,k)=>{ const [i,j]=k.split(',').map(Number); cx.fillStyle=col; cx.fillRect(i,j,1,1); });
    ITEM['tool_'+t0.id]=cc; });
  // the portal piece for the Core: a violet ring around a white-hot heart
  { const cc=document.createElement('canvas'); cc.width=cc.height=T; const cx=cc.getContext('2d');
    for(let j=0;j<T;j++)for(let i=0;i<T;i++){ const d=Math.hypot(i-7.5,j-7.5); cx.fillStyle=d>7.4?'rgba(0,0,0,0)':d>6.2?'#2a1a5a':d>4.8?'#8a6aff':d>3.2?'#c8b8ff':d>1.8?'#f0e8ff':'#ffffff'; cx.fillRect(i,j,1,1); }
    ITEM.portal=cc; }
})();

// ---------- effects layer ----------
let particles=[], flashes=[], fxList=[], fxParts=[];
function burst(r,c,k,n=7){
  const f=FX[k]; const cx=(c+.5)*cell, cy=(r+.5)*cell;
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, sp=1.5+Math.random()*4;
    particles.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,s:cell*(.12+Math.random()*.14),col:f[Math.floor(Math.random()*2)],life:1}); }
}
const easeOut=t=>1-Math.pow(1-t,3), easeIn=t=>t*t*t;
function cellScreen(r,c){ const B=boardC.getBoundingClientRect(); return [B.left+(c+.5)*cell, B.top+(r+.5)*cell]; }
function targetFor(res,toStash){
  const el=(!toStash && document.querySelector(`.goal[data-k="${res}"] canvas`)) || document.querySelector(`.si[data-k="${res}"] canvas`) || $('goalsBar');
  const R=el.getBoundingClientRect(); return [R.left+R.width/2, R.top+R.height/2];
}
// an item pops out of its block, then flies to its goal counter (or the score)
function flyItem(img,res,x0,y0,delay,glowCol,onLand,toStash){
  const t0=performance.now()+delay, D=REDUCE?320:540;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t<0) return true;
    if(t>=1){ onLand&&onLand(); const [tx,ty]=targetFor(res,toStash); ring(tx,ty,glowCol,18,260); return false; }
    const [tx,ty]=targetFor(res,toStash); const pop=.28;
    let x,y,s;
    if(t<pop){ const e=easeOut(t/pop); x=x0; y=y0-cell*.35*e; s=cell*(.7+.6*e); }
    else { const e=easeIn((t-pop)/(1-pop)); const sx=x0, sy=y0-cell*.35;
      const cx=(sx+tx)/2+(sx<tx?-1:1)*cell*.6, cy=Math.min(sy,ty)-cell*1.4;
      x=(1-e)*(1-e)*sx+2*(1-e)*e*cx+e*e*tx; y=(1-e)*(1-e)*sy+2*(1-e)*e*cy+e*e*ty; s=cell*(1.3-.75*e); }
    ctx.save(); ctx.shadowColor=glowCol; ctx.shadowBlur=14; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,x-s/2,y-s/2,s,s); ctx.restore();
    return true; }});
}
// an item flies on an arc from one element to another (v2.1.1: the hint's coal, stash to Hint button)
function flyBetween(img,fromEl,toEl,delay,glowCol,onLand){
  const t0=performance.now()+delay, D=REDUCE?260:520, mid=e=>{ const R=e.getBoundingClientRect(); return [R.left+R.width/2,R.top+R.height/2]; };
  const [sx,sy]=mid(fromEl);
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t<0) return true; const [tx,ty]=mid(toEl);
    if(t>=1){ onLand&&onLand(); ring(tx,ty,glowCol,16,240); return false; }
    const e=easeIn(t), cx=(sx+tx)/2+(sx<tx?-1:1)*40, cy=Math.min(sy,ty)-60;
    const x=(1-e)*(1-e)*sx+2*(1-e)*e*cx+e*e*tx, y=(1-e)*(1-e)*sy+2*(1-e)*e*cy+e*e*ty, s=26*(1-.45*e);
    ctx.save(); ctx.shadowColor=glowCol; ctx.shadowBlur=12; ctx.imageSmoothingEnabled=false; ctx.drawImage(img,x-s/2,y-s/2,s,s); ctx.restore(); return true; }});
}
function ring(x,y,col,maxR,D){
  const t0=performance.now();
  fxList.push({draw(ctx,now){ const t=Math.max(0,(now-t0)/D); if(t>=1) return false;   // a frame's timestamp can be a little older than t0
    ctx.save(); ctx.strokeStyle=col; ctx.globalAlpha=1-t; ctx.lineWidth=3*(1-t)+1; ctx.beginPath(); ctx.arc(x,y,maxR*easeOut(t),0,Math.PI*2); ctx.stroke(); ctx.restore(); return true; }});
}
function spawnFxParts(kind,x,y,n,cols){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    let sp = kind==='ember'? 4+Math.random()*9 : kind==='coin'? 3+Math.random()*6 : 1+Math.random()*3;
    const p={kind,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:.008+Math.random()*.01,s:kind==='coin'?6+Math.random()*4:3+Math.random()*4,col:cols[Math.floor(Math.random()*cols.length)],spin:Math.random()*6};
    if(kind==='coin'){ p.vy=-(6+Math.random()*8); p.vx=(Math.random()-.5)*9; }
    if(kind==='spark'){ p.vy=-(.5+Math.random()*2); p.decay=.006+Math.random()*.008; }
    fxParts.push(p);
  }
}
const SPECIAL_LOOK={
  blast:{rays:['#ffd23f','#ff6a1f'], parts:'ember', cols:['#fff6b8','#ffd23f','#ff9a1f','#e2481a']},
  fossil:{rays:['#fbf3dc','#e6c37a'], parts:'spark', cols:['#fffbe8','#ffe9a8','#e6c37a']},
  treasure:{rays:['#ffe36a','#f5b21c'], parts:'coin', cols:['#ffe36a','#f5c93c','#fff6c2']},
  sledgehammer:{rays:['#ffd23f','#cfe8ff'], parts:'ember', cols:['#ffffff','#ffd23f','#9fb4cc','#7d8a9e']},
  drill:{rays:['#e8ecf2','#ffd23f'], parts:'ember', cols:['#ffffff','#e8ecf2','#ffd23f','#9aa0aa']},
  rescue:{rays:['#ff6a9a','#ffd0e0'], parts:'spark', cols:['#ffffff','#ff9ab8','#ffd0e0']},
  luck:{rays:['#7dff9a','#ffe36a'], parts:'spark', cols:['#ffffff','#7dff9a','#ffe36a','#c8ffd6']},
};
function hexA(hx,a){ return hx+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0'); }
// the grand moment: block rises to center in a burst of light, title card, themed particle show
function playSpecial(sp){
  const D=REDUCE?800:1800, t0=performance.now(), look=SPECIAL_LOOK[sp.m];
  let burstDone=false, extraDone=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1||skipFlag) return false;
    const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2, cy=B.top+B.height/2;
    const [sx,sy]=[B.left+(sp.c+.5)*cell, B.top+(sp.r+.5)*cell];
    const dim = t<.1? t/.1 : t>.84 ? (1-t)/.16 : 1;
    ctx.fillStyle=`rgba(6,4,10,${.62*dim})`; ctx.fillRect(B.left-8,B.top-8,B.width+16,B.height+16);
    if(t<.1){ ctx.fillStyle=`rgba(255,250,230,${.85*(1-t/.1)})`; ctx.fillRect(B.left-8,B.top-8,B.width+16,B.height+16); }
    const e=t<.22?easeOut(t/.22):1, px=sx+(cx-sx)*e, py=sy+(cy-sy)*e;
    const shrink=t>.84?1-(t-.84)/.16:1;
    const sz=cell*(1+1.8*e)*shrink*(1+.05*Math.sin(now/80));
    // light rays
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(px,py); ctx.rotate(now/700);
    const R=B.width*.85*e*dim;
    for(let k=0;k<16;k++){ ctx.rotate(Math.PI/8); ctx.fillStyle=hexA(look.rays[k%look.rays.length],.22*dim);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(R,-R*.09); ctx.lineTo(R,R*.09); ctx.closePath(); ctx.fill(); }
    const g=ctx.createRadialGradient(0,0,0,0,0,sz*1.3); g.addColorStop(0,hexA(look.rays[0],.7*dim)); g.addColorStop(1,hexA(look.rays[0],0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,sz*1.3,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // shockwave rings
    [.2,.3].forEach((st,i)=>{ if(t>st&&t<st+.35){ const q=(t-st)/.35; ctx.save(); ctx.strokeStyle=hexA(look.rays[i%look.rays.length],1-q); ctx.lineWidth=6*(1-q)+1;
      ctx.beginPath(); ctx.arc(cx,cy,B.width*.75*easeOut(q),0,Math.PI*2); ctx.stroke(); ctx.restore(); } });
    // the block itself
    ctx.save(); ctx.imageSmoothingEnabled=false; ctx.shadowColor=look.rays[0]; ctx.shadowBlur=30*dim;
    ctx.translate(px,py); ctx.rotate(Math.sin(now/160)*.06*e); ctx.drawImage(TEX[sp.m],-sz/2,-sz/2,sz,sz); ctx.restore();
    // title card
    if(t>.2){ const a=Math.min(1,(t-.2)/.08)*dim, pop=1+.3*Math.max(0,1-(t-.2)/.1);
      ctx.save(); ctx.globalAlpha=a;
      crispText(ctx,sp.title,cx,B.top+B.height*.17,Math.round(B.width*.095*pop*1.15),'#fff8e6',look.rays[0]);
      // the reward line on a dark plate so it reads cleanly over the rays
      { const fs=Math.round(B.width*.065*1.15); ctx.font=`700 ${fs}px ${FONT_D}`; const w=ctx.measureText(sp.sub).width+fs*.9, h=fs*1.25, y=B.top+B.height*.84;
        ctx.fillStyle='rgba(14,10,6,.82)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(cx-w/2,y-h/2,w,h,h*.3); else ctx.rect(cx-w/2,y-h/2,w,h); ctx.fill();
        crispText(ctx,sp.sub,cx,y,fs,'#fff3c4',null); }
      ctx.restore(); }
    if(!burstDone && t>.2){ burstDone=true; spawnFxParts(look.parts,cx,cy,look.parts==='coin'?46:look.parts==='ember'?60:40,look.cols);
      if(sp.m==='blast'){ shake(true); spawnFxParts('ember',sx,sy,30,look.cols); } }
    if(!extraDone && t>.55){ extraDone=true;
      if((sp.m==='treasure'||sp.m==='fossil') && sp.res){ const img=ITEM[sp.res];
        for(let q=0;q<Math.min(9,sp.n);q++) flyItem(img,sp.res,cx,cy,q*80,'#ffffff',()=>{ updateStash([sp.res]); blip(1200+q*120,.08,'sine',.05); },true); }
      if(sp.m==='treasure'||sp.m==='fossil') spawnFxParts(look.parts,cx,cy,30,look.cols); }
    return true; }});
  // fanfare
  if(sp.m==='blast'){ blip(60,.7,'sawtooth',.1); blip(45,.8,'square',.07,.05); }
  [523,659,784,1047,1319,1568].forEach((f,j)=>tone(f,.22,'triangle',.06,.25+j*.08));
  whoosh(.5,.07,.05); if(sp.m==='treasure'||sp.m==='fossil'){ coins(14,.6); tone(2093,.6,'sine',.05,.9); } buzz([30,40,60]);
  return D;
}
// brief title splash over the board
function playSplash(title,sub,key){
  const D=REDUCE?450:900, t0=performance.now(), look=SPECIAL_LOOK[key];
  let sparked=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1||skipFlag) return false;
    const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2, cy=B.top+B.height/2;
    const a=Math.min(1,t/.15)*(t>.75?(1-t)/.25:1);
    ctx.fillStyle=`rgba(6,4,10,${.4*a})`; ctx.fillRect(B.left-8,B.top-8,B.width+16,B.height+16);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(cx,cy); ctx.rotate(now/800);
    for(let k=0;k<12;k++){ ctx.rotate(Math.PI/6); ctx.fillStyle=hexA(look.rays[k%look.rays.length],.16*a);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(B.width*.7,-B.width*.06); ctx.lineTo(B.width*.7,B.width*.06); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if(!sparked){ sparked=true; spawnFxParts('spark',cx,cy,24,look.cols); }
    const pop=1+.3*Math.max(0,1-t/.15);
    ctx.save(); ctx.globalAlpha=a;
    crispText(ctx,title,cx,cy-B.height*.05,Math.round(B.width*.1*pop*1.15),'#fff8e6',look.rays[0]);
    crispText(ctx,sub,cx,cy+B.height*.08,Math.round(B.width*.065*1.15),look.rays[0],null,600);
    ctx.restore(); return true; }});
  [784,988,1175,1568].forEach((f,j)=>tone(f,.2,'triangle',.05,j*.06)); whoosh(.3,.06); blip(70,.35,'sine',.12); buzz(35);
  return D;
}
// v2.7.0: a line combo is a moment: a big DOUBLE / TRIPLE / QUAD banner sized to the combo, confetti bursting out of the cleared lines,
// the board's edge glowing in the combo's colour, a chord that grows with it, a shake and a buzz. It doesn't hold up play.
const COMBO_LOOK={2:['DOUBLE!','#7fe8ff'],3:['TRIPLE!','#ffd23f'],4:['QUAD!','#ff7ad9'],5:['MEGA!','#b8ff7a']};
function playCombo(n,rows,cols,pts){
  A.track('combo_shown',{lines:n});
  const [word,col]=COMBO_LOOK[Math.min(5,n)], D=REDUCE?500:1100, t0=performance.now(), B0=boardC.getBoundingClientRect();
  const lines=[...rows.map(r=>[B0.left+B0.width/2,B0.top+(r+.5)*cell,true]),...cols.map(c=>[B0.left+(c+.5)*cell,B0.top+B0.height/2,false])];
  lines.forEach(([x,y,row])=>{ for(let k=0;k<N;k++){ const px=row?B0.left+(k+.5)*cell:x, py=row?y:B0.top+(k+.5)*cell; spawnFxParts('spark',px,py,REDUCE?1:(n>=3?4:3),[col,'#ffffff','#fff3c4']); } });
  fxList.push({draw(ctx,now){ const t=(now-t0)/D; if(t>=1) return false; const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2, cy=B.top+B.height*.42;
    const a=t<.1?t/.1:t>.75?(1-t)/.25:1;
    ctx.save(); ctx.strokeStyle=hexA(col,.85*a); ctx.lineWidth=4+n*1.5; ctx.shadowColor=col; ctx.shadowBlur=18+n*6; ctx.strokeRect(B.left-6,B.top-6,B.width+12,B.height+12); ctx.restore();
    const pop=t<.18?.4+.9*easeOut(t/.18):1+.06*Math.sin((t-.18)*14)*(1-t); ctx.save(); ctx.globalAlpha=a; ctx.translate(cx,cy); ctx.rotate(-.06*(1-Math.min(1,t/.2)));
    crispText(ctx,word,0,0,Math.round(B.width*(.13+.02*Math.min(3,n-2))*pop),'#ffffff',col); crispText(ctx,`+${pts}`,0,B.width*.13,Math.round(B.width*.065),col,null,600);
    ctx.restore(); return true; }});
  const base=[523,659,784,1047,1319,1568]; base.slice(0,Math.min(6,2+n)).forEach((f,j)=>tone(f,.35,'triangle',.05,j*.05)); whoosh(.4,.06+.015*n);
  if(n>=3){ blip(80,.4,'sine',.12); coins(6+n*2,.2); } if(n>=4) tone(2093,.8,'sine',.05,.3);
  shake(n>=3); buzz(n>=4?[40,30,40,30,90]:n>=3?[40,30,70]:50);
}
// v2.7.0: the streak shows as a flame chip by the score that heats up as it grows, with a callout at 3, 5, 8 and 12 clears in a row
const STREAK_CALL={3:'On a roll!',5:'On fire!',8:'Unstoppable!',12:'Legendary!'};
function updateStreak(st,grew){ const el=$('streakChip'); if(!el) return; if(st<2){ if(!el.hidden){ el.classList.add('out'); setTimeout(()=>{ el.hidden=true; el.classList.remove('out'); },300); } return; }
  el.hidden=false; el.classList.remove('out'); el.textContent=`STREAK ×${st}`; el.dataset.heat=Math.min(4,Math.floor(st/2)); if(grew){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  if(grew&&STREAK_CALL[st]){ showCombo(STREAK_CALL[st]); [659,880,1175,1568].forEach((f,j)=>tone(f*(1+st*.02),.18,'square',.035,.15+j*.07)); buzz(30); } }
// golden wave across the empty board + title card
function playAllClear(pts){
  const D=REDUCE?600:1300, t0=performance.now();
  let sparked=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1||skipFlag) return false;
    const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2;
    const front=t*22-4;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const dd=Math.abs((r+c)-front); if(dd>3) continue;
      const a=(1-dd/3)*(t>.8?(1-t)/.2:1);
      ctx.fillStyle=`rgba(255,214,90,${.55*a})`; ctx.fillRect(B.left+c*cell+2,B.top+r*cell+2,cell-4,cell-4);
      ctx.fillStyle=`rgba(255,255,230,${.6*a*a})`; ctx.fillRect(B.left+c*cell+cell*.3,B.top+r*cell+cell*.3,cell*.4,cell*.4);
    }
    if(!sparked && t>.25){ sparked=true; spawnFxParts('spark',cx,B.top+B.height/2,50,['#fff6c2','#ffd23f','#ffffff']); }
    const a=Math.min(1,t/.12)*(t>.82?(1-t)/.18:1), pop=1+.35*Math.max(0,1-t/.15);
    ctx.save(); ctx.globalAlpha=a;
    crispText(ctx,'ALL CLEAR!',cx,B.top+B.height*.44,Math.round(B.width*.13*pop*1.15),'#fff3c4','#ffd23f');
    crispText(ctx,`+${pts}`,cx,B.top+B.height*.58,Math.round(B.width*.07*1.15),'#ffd23f',null,600);
    ctx.restore(); return true; }});
  [659,784,988,1319,1568,1976].forEach((f,j)=>tone(f,.3,'square',.04,j*.06)); whoosh(.6,.08); coins(10,.35); buzz([40,30,80]);
}
function renderFx(now){
  const w=innerWidth, h=innerHeight;
  fx.setTransform(dpr,0,0,dpr,0,0); fx.clearRect(0,0,w,h);
  const cur=fxList; fxList=[]; const keep=cur.filter(f=>{ fx.save(); try{ return f.draw(fx,now); }catch(e){ return false; }finally{ fx.restore(); } }); fxList=keep.concat(fxList);   // a broken effect is dropped: it must never stop the render loop
  fxParts=fxParts.filter(p=>(p.life-=p.decay)>0);
  fx.save(); fx.globalCompositeOperation='lighter';
  fxParts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.kind==='coin'){ p.vy+=.35; p.vx*=.99; } else if(p.kind==='ember'){ p.vx*=.94; p.vy=p.vy*.94+.12; } else { p.vx*=.97; p.vy*=.98; }
    fx.globalAlpha=Math.min(1,p.life*1.4); fx.fillStyle=p.col;
    if(p.kind==='coin'){ const wv=Math.abs(Math.cos(now/90+p.spin)); fx.fillRect(p.x-p.s*wv/2,p.y-p.s/2,Math.max(1,p.s*wv),p.s); }
    else if(p.kind==='spark'){ const tw=.5+.5*Math.sin(now/70+p.spin); const s=p.s*tw; fx.fillRect(p.x-s/2,p.y-s*1.5,s,s*3); fx.fillRect(p.x-s*1.5,p.y-s/2,s*3,s); }
    else fx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
  });
  fx.restore();
}

// ---------- settings and the lifetime profile (rank, streaks, records, discovery log) ----------
const K_SET='deepcore-settings', K_LIFE='deepcore-life', K_INST='deepcore-install';
let settings={sfxVol:70,musicVol:50,music:true,reduce:false,large:false,diff:'casual'}, life=Meta.newLife();
function saveSettings(){ lsSet(K_SET,settings); }
function loadSettings(){ const v=lsGet(K_SET); if(v){ Object.assign(settings,v); if(v.volume!==undefined&&v.sfxVol===undefined){ settings.sfxVol=v.volume; delete settings.volume; } } }   // one volume became two in v2.1.0
function saveLife(){ lsSet(K_LIFE,life); }
function loadLife(){ const v=lsGet(K_LIFE), base=Meta.newLife(); if(v&&v.v===1) life=Object.assign(base,v,{streak:{...base.streak,...v.streak},records:{...base.records,...v.records}}); else life=base; }
const runScore=()=>Object.values(dayState.scores).reduce((a,b)=>a+b,0)+(dayState.bonus||0);   // this descent's points so far
function applyDisplaySettings(){ REDUCE=MEDIA_REDUCE||settings.reduce; document.documentElement.classList.toggle('reduce',!!settings.reduce); document.documentElement.classList.toggle('large',!!settings.large); }
// two buses into the master: sound effects and music, each with its own volume (70 = the old default level)
const busLevel=v=>2.2*(v/70);
let sfxBus=null, musicBus=null;
function applyAudioSettings(){ if(sfxBus) sfxBus.gain.value=busLevel(settings.sfxVol); if(musicBus) musicBus.gain.value=busLevel(settings.musicVol); if(settings.music&&soundMusicWanted()) startMusic(); else stopMusic(); }
let music=null; const soundMusicWanted=()=>!!settings.music;
function startMusic(){ const c=audioCtx(); if(!c||!master) return; if(c.state!=='running'){ c.resume().catch(()=>{}); } if(!music) music=Meta.createMusic(c,musicBus); music.start(); }
function stopMusic(){ if(music) music.stop(); }

// ---------- sound ----------
let comboQueue=[], comboBusy=false;
function showCombo(text){ comboQueue.push(text); if(!comboBusy) nextCombo(); }
function nextCombo(){ const t=comboQueue.shift(); if(!t){ comboBusy=false; return; } comboBusy=true;
  const el=$('combo'); el.textContent=t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); setTimeout(nextCombo,700); }
let ac=null, master=null, soundOn=true;
try{ if(localStorage.getItem('deepcore-sound')==='off') soundOn=false; }catch(e){}
function audioCtx(){
  if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=1;
    sfxBus=ac.createGain(); musicBus=ac.createGain(); sfxBus.connect(master); musicBus.connect(master); applyAudioSettings();
    const comp=ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination); }catch(e){ ac=null; } }
  return ac;
}
// iPhones keep Web Audio silent until a tap/touch starts it (and mute it with the ring switch unless the page asks for "playback" audio)
function unlockAudio(){
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  const c=audioCtx(); if(!c) return;
  if(c.state!=='running') c.resume().then(()=>{ if(settings.music) startMusic(); }).catch(()=>{}); else if(settings.music&&(!music||!music.isOn())) startMusic();
  try{ const b=c.createBuffer(1,1,22050), src=c.createBufferSource(); src.buffer=b; src.connect(c.destination); src.start(0); }catch(e){}
}
['pointerdown','touchstart','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlockAudio,{capture:true,passive:true}));
// v2.6.1: coming back to the game (another app, a locked phone, Control Center) resumes the audio AND restarts the music if it should be playing;
// before, it only resumed and waited for your next tap. A light watchdog retries while visible; a tap anywhere still unlocks it (unlockAudio).
function wakeAudio(){ if(!ac||document.visibilityState!=='visible') return; const go=()=>{ if(settings.music&&(!music||!music.isOn())) startMusic(); };
  if(ac.state!=='running') ac.resume().then(go).catch(()=>{}); else go(); }
document.addEventListener('visibilitychange',()=>{ if(!ac) return; if(document.visibilityState==='visible') wakeAudio(); else if(settings.music) ac.suspend().catch(()=>{}); });
window.addEventListener('pageshow',wakeAudio); window.addEventListener('focus',wakeAudio);
setInterval(()=>{ if(ac&&settings.music&&document.visibilityState==='visible'&&(ac.state!=='running'||!music||!music.isOn())) wakeAudio(); },4000);
// v2.7.0 celebration sounds: a held tone, a filtered-noise whoosh, a coin shower; and a buzz on phones that support it (Android)
function tone(freq,dur=.25,type='triangle',vol=.05,when=0){ if(!soundOn) return;
  try{ const c=audioCtx(); if(!c||c.state!=='running') return; const t=c.currentTime+when, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.015); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t+dur+.02); }catch(e){} }
function whoosh(dur=.35,vol=.08,when=0,up=true){ if(!soundOn) return;
  try{ const c=audioCtx(); if(!c||c.state!=='running') return; const t=c.currentTime+when, n=Math.floor(c.sampleRate*dur), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain(); src.buffer=b; f.type='bandpass'; f.Q.value=1.2;
    f.frequency.setValueAtTime(up?400:2400,t); f.frequency.exponentialRampToValueAtTime(up?3200:300,t+dur); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f).connect(g).connect(sfxBus); src.start(t); }catch(e){} }
function coins(n=10,when=0){ for(let k=0;k<n;k++) tone(1800+Math.random()*1400,.09,'square',.025,when+k*.045+Math.random()*.02); }
function buzz(p){ try{ if(soundOn&&navigator.vibrate) navigator.vibrate(p); }catch(e){} }
// crisp title text: the glow is a soft halo behind the letters, never a blur on them (v2.7.0: treasure text looked fuzzy)
function crispText(ctx,text,x,y,px,fill,glow,weight=700){ ctx.save(); ctx.font=`${weight} ${px}px ${FONT_D}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  if(glow){ ctx.shadowColor=glow; ctx.shadowBlur=px*.5; ctx.globalAlpha*=.55; ctx.fillStyle=glow; ctx.fillText(text,x,y); ctx.globalAlpha/=.55; }
  ctx.shadowBlur=0; ctx.lineJoin='round'; ctx.lineWidth=Math.max(4,px*.16); ctx.strokeStyle='#120a04'; ctx.strokeText(text,x,y); ctx.fillStyle=fill; ctx.fillText(text,x,y); ctx.restore(); }
function blip(freq,dur=.08,type='square',vol=.05,when=0){
  if(!soundOn) return;
  try{ const c=audioCtx(); if(!c) return; if(c.state!=='running'){ c.resume().catch(()=>{}); return; }
    const t=c.currentTime+when, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(freq*.6,t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t+dur); }catch(e){}
}
// every speaker button (home, map, board) shows the same state: crossed out when both music and effects are off
function setSoundUI(){ const on=soundOn||!!settings.music;
  document.querySelectorAll('.soundBtn').forEach(b=>{ b.setAttribute('aria-pressed',on); b.title=on?'Sound':'Sound off'; });
  $('sfxOn').checked=soundOn; $('musicOn').checked=!!settings.music; $('sfxVol').value=settings.sfxVol; $('musicVol').value=settings.musicVol;
  $('sfxVol').disabled=!soundOn; $('musicVol').disabled=!settings.music; }
// the speaker opens a small drop-down under it: music and effects, each with a switch and a volume slider
function toggleSoundPop(btn){
  const pop=$('soundPop'); if(!pop.hidden){ pop.hidden=true; return; }
  setSoundUI(); const r=btn.getBoundingClientRect(); pop.style.top=(r.bottom+6)+'px'; pop.style.left=Math.max(8,Math.min(innerWidth-248,r.right-240))+'px'; pop.hidden=false; A.track('sound_open',{screen});
}
document.querySelectorAll('.soundBtn').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); unlockAudio(); toggleSoundPop(b); }));
document.addEventListener('pointerdown',e=>{ const pop=$('soundPop'); if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest('.soundBtn')) pop.hidden=true; },true);
$('sfxOn').addEventListener('change',e=>{ soundOn=e.target.checked; try{ localStorage.setItem('deepcore-sound',soundOn?'on':'off'); }catch(err){} setSoundUI(); A.track('setting_change',{setting:'sound',value:soundOn}); if(soundOn){ unlockAudio(); blip(660,.08,'triangle',.08); } });
$('musicOn').addEventListener('change',e=>{ settings.music=e.target.checked; saveSettings(); unlockAudio(); applyAudioSettings(); setSoundUI(); A.track('setting_change',{setting:'music',value:settings.music}); });
$('sfxVol').addEventListener('input',e=>{ settings.sfxVol=+e.target.value; saveSettings(); applyAudioSettings(); });
$('sfxVol').addEventListener('change',()=>{ A.track('setting_change',{setting:'sfx_volume',value:settings.sfxVol}); unlockAudio(); blip(660,.08,'triangle',.08); });
$('musicVol').addEventListener('input',e=>{ settings.musicVol=+e.target.value; saveSettings(); applyAudioSettings(); });
$('musicVol').addEventListener('change',()=>A.track('setting_change',{setting:'music_volume',value:settings.musicVol}));
function shake(big){ if(REDUCE) return; const w=$('boardWell'); w.classList.remove('shake','bigshake'); void w.offsetWidth; w.classList.add(big?'bigshake':'shake'); }

function showBanner(ms=2200){
  const def=levelDef(level);
  $('bLvl').textContent=def.core?'':`Layer ${def.zone+1} of ${ZONES.length-1}`; $('bName').textContent=def.name;
  $('bGoals').textContent=`${def.deals*3} placements · ${def.target.toLocaleString()} points for a star`;
  $('banner').classList.add('show'); setTimeout(()=>$('banner').classList.remove('show'),ms);
}

// ---------- game flow ----------
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
// the long celebrations (blast, specials, all-clear) can be skipped with a tap: waiting stops and their overlays end at once
let skipFlag=false, skipWaiters=[];
function skippable(ms){ return new Promise(res=>{ let to; const done=()=>{ clearTimeout(to); skipWaiters=skipWaiters.filter(w=>w!==done); res(); }; to=setTimeout(done,skipFlag?0:ms); skipWaiters.push(done); }); }
function requestSkip(){ if(!busy||screen!=='game'||skipFlag||!$('sheetScrim').hidden||!$('info').hidden) return; if(!$('skipHint').hidden){ skipFlag=true; $('skipHint').hidden=true; A.track('animation_skipped'); skipWaiters.slice().forEach(w=>w()); } }
document.addEventListener('pointerdown',requestSkip,true);
const showSkip=()=>{ if(!skipFlag) $('skipHint').hidden=false; };
function startBoard(idx){
  tut.active=!life.tutorialDone&&idx===0; tut.stage=0; tut.placed=0; $('tutor').hidden=true;
  practice=false; reached=false; reachScore=0; clearBonus=0; decided=true; clearHint(); closeSheet();   // replays give ore again: the stash is kept for the whole descent
  life.zones[boardDef(idx).zone]=true;
  const att=dayState.attempts=dayState.attempts||{}; att[idx]=(att[idx]||0)+1; saveDay();
  curDiff=settings.diff||'casual'; undo=null; hand={}; dealt={}; meterLit=0; dealtN=0; nextPiece=null; dodgeUsed=false; caveSettled=true; level=idx+1; score=0; shown=0; collected={}; shownCol={}; since={}; bigNext=0; grid=emptyGrid(); pieces=null; combo=0; sinceClear=0; over=false; moves=0; busy=false;
  prefill();
  updateStash(); $('over').hidden=true; buildGoals(); updateHUD(); dealSet(); drawTray(); showBanner(); saveBoard();
  if(tut.active) setTimeout(()=>{ if(tut.active&&screen==='game') tutorStart(); },2300);
  boardT0=lastAct=performance.now(); A.setBoard(boardLabel(idx));
  const d=levelDef(level); A.track('board_start',{idx,label:boardLabel(idx),zone:d.zoneName,tier:tierOf(d.d),target:d.target,practice,mod:modifierFor(dayState.day).id,attempt:att[idx],starter_blocks:d.pre});
}

function linesNow(){ const rows=[],cols=[]; for(let i=0;i<N;i++){ if(grid[i].every(Boolean)) rows.push(i); if(grid.every(row=>row[i])) cols.push(i);} return {rows,cols}; }
function previewLines(p,r0,c0){
  const o=grid.map(r=>r.map(Boolean)); p.cells.forEach(([r,c])=>o[r0+r][c0+c]=true); const hl=new Set();
  for(let i=0;i<N;i++){ if(o[i].every(Boolean)) for(let j=0;j<N;j++) hl.add(i*N+j); if(o.every(row=>row[i])) for(let j=0;j<N;j++) hl.add(j*N+i); }
  return hl;
}
// mining one block: debris, resource credit, and (for ore/gems) the item flying to its goal or the stash
function mineCtx(){ return {instant:[], stash:[], flyers:0, gems:0, msgs:[]}; }
function credit(ctx,res,amt,showNow){
  collected[res]=(collected[res]||0)+amt;
  if(showNow){ shownCol[res]=(shownCol[res]||0)+amt; if(!ctx.instant.includes(res)) ctx.instant.push(res); }
}
function mineCell(r,c,ctx){
  const m=grid[r][c]; if(!m) return; const M=MATS[m]; { const lm=m==='grass'?'dirt':m; life.mined[lm]=(life.mined[lm]||0)+1; }
  burst(r,c,m,7); flashes.push({r,c,life:1});
  dayState.mined[m]=(dayState.mined[m]||0)+1;   // mining gives no points (v2.0.4): points come from play
  // Galaxy Alloy wears in the deepest rock and prism ore mends it (Magmastone alone never wears it below 10%)
  if(toolBreakable()){ const z=zoneOfIdx(level-1);
    if(m==='prismore') dayState.dur=z===CRUST_Z?Math.min(DUR_MAX,dayState.dur+PRISM_MEND):DUR_MAX;
    else if(WEAR[m]) dayState.dur=z===CRUST_Z?dayState.dur-WEAR[m]:Math.max(Math.min(dayState.dur,10),dayState.dur-WEAR[m]); }
  if(M.drop&&!ctx.noLoot){
    const item=(M.kind==='ore'||M.kind==='gem'||M.drop==='wood')&&!practice, res=M.drop;
    credit(ctx,res,1,true);
    if(item){
      hand[res]=(hand[res]||0)+1;
      if(M.kind!=='base'&&!tut.active) tipOnce('haul',()=>toast('Ore and gems go to your haul (the green +numbers). Finish the board to keep them: they forge your next tools.',5200));
      if(ctx.flyers<16){ const [x,y]=cellScreen(r,c);
        flyItem(ITEM[res==='wood'?'wood':m],res,x,y,ctx.flyers*35,FX[m][1]||'#fff',()=>{ updateStash([res]); blip(880+Math.random()*300,.05,'sine',.035); },true);
        ctx.flyers++; }
      else ctx.stash.push(res);
    }
    if(M.kind==='gem'&&!ORES[res]){ ctx.gems++; ctx.msgs.push(`${DROPS[res][0]}!`); }
  }
  grid[r][c]=null;
}
function flushCtx(ctx){ updateGoals(ctx.instant); updateStash(ctx.stash);
  if(ctx.gems) [988,1319,1568].forEach((f,j)=>blip(f,.16,'sine',.06,.25+j*.08)); }
// a non-blast special caught in a clear: work out its reward now, celebrate after
function specialHit(m,r,c,ctx){
  life.seen[m]=true;
  const M=MATS[m], goals=levelDef(level).goals, sp={m,r,c,title:M.name,sub:'',pts:0};
  if(m==='treasure'||m==='fossil'){ const h=specialHaul(m,levelDef(level).zone); credit(ctx,h.k,h.n); if(!practice) hand[h.k]=(hand[h.k]||0)+h.n;
    sp.res=practice?null:h.k; sp.n=h.n; sp.pts=0; sp.sub=`+${h.n} ${DROPS[h.k][0]}`; }   // random specials: resources, no points
  if(m==='sledgehammer'){ sp.pts=SCORE.special.sledgehammer; sp.sub=`Board shaken up · +${sp.pts}`; }
  score+=sp.pts; burst(r,c,m,18); grid[r][c]=null;
  return sp;
}
// blast charge: fuse flare on the board, then it bursts and breaks the 8 blocks around it
let fuse=null;
async function detonate(r,c,hit){
  fuse={r,c,t0:performance.now()}; blip(1400,.05,'square',.04); blip(1600,.05,'square',.04,.12); blip(1900,.05,'square',.05,.24);
  await skippable(REDUCE?120:420);
  fuse=null;
  const [sx,sy]=cellScreen(r,c), look=SPECIAL_LOOK.blast;
  ring(sx,sy,'#fff6b8',cell*1.6,300); ring(sx,sy,'#ffd23f',cell*2.6,480); ring(sx,sy,'#ff6a1f',cell*3.6,650);
  spawnFxParts('ember',sx,sy,55,look.cols); shake(true);
  blip(60,.6,'sawtooth',.11); blip(42,.7,'square',.08,.04); blip(120,.25,'triangle',.06,.02);
  boardFlash={r,c,t0:performance.now()};
  grid[r][c]=null; burst(r,c,'blast',24);
  const ctx=mineCtx(), chain=[];   // v2.4.0: what the blast breaks is mined into the haul (it used to be lost)
  for(let a=r-1;a<=r+1;a++)for(let b=c-1;b<=c+1;b++){
    if(a<0||b<0||a>=N||b>=N||!grid[a][b]) continue;
    const m=grid[a][b];
    if(m==='blast'){ chain.push([a,b]); continue; }
    if(MATS[m].kind==='special'){ hit.push(specialHit(m,a,b,ctx)); continue; }
    mineCell(a,b,ctx);
  }
  flushCtx(ctx);
  let count=1;
  for(const [a,b] of chain){ await skippable(160); count+=await detonate(a,b,hit); }
  return count;
}
// All Clear: a flat bonus on top of the clear's own points (SCORE.allClear)
const allClearBonus=()=>SCORE.allClear;
let boardFlash=null;
// how special was that placement? counts the spots that keep the rest of the tray playable
function rateMove(i,r0,c0){
  const p=pieces[i], s=SHAPES[p.sid]; if(!s) return null;
  const [lo,hi]=occBits(grid), base=countHoles(lo,hi);
  const rest=pieces.filter((q,j)=>q&&j!==i).concat(nextPiece?[nextPiece]:[]).map(q=>SHAPES[q.sid]).filter(Boolean);   // the next piece drops in after this placement
  const fits=s.pl.filter(q=>!(lo&q.lo)&&!(hi&q.hi));
  if(fits.length<4) return null;
  let good=[];
  if(rest.length){ for(const q of fits){ const nb=applyMove(lo,hi,q.lo,q.hi); if(countHoles(nb[0],nb[1])>base) continue; if(solveCount(nb[0],nb[1],rest,1,3000,true,false).count) good.push(q); } }
  else { let maxL=0; const ls=fits.map(q=>{ const nb=applyMove(lo,hi,q.lo,q.hi); const l=countHoles(nb[0],nb[1])>base?-1:nb[2]; if(l>maxL) maxL=l; return l; });
    if(maxL<1) return null; good=fits.filter((q,k)=>ls[k]===maxL); }
  const chosen=fits.find(q=>q.r0===r0&&q.c0===c0);
  if(!chosen||!good.includes(chosen)||good.length>3) return null;
  return good.length===1 ? {word:'Perfect!',col:'#ffe36a'} : {word:'Great fit!',col:'#9fe8ff'};   // praise only: no points since v2.0.4
}
// points and bonuses that rise from a clear: crisp text on a dark plate, so it reads on any block colour
function floatText(x,y,text,col){
  const t0=performance.now(), D=1000;
  fxList.push({draw(ctx,now){ const t=(now-t0)/D; if(t>=1) return false;
    const pop=1+.25*Math.max(0,1-t/.12), fs=Math.round(cell*.62*pop);
    ctx.save(); ctx.globalAlpha=t>.75?(1-t)/.25:1; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`400 ${fs}px ${FONT_D}`;
    const yy=y-cell*.8*easeOut(t), w=ctx.measureText(text).width+fs*.7, h=fs*1.15;
    ctx.fillStyle='rgba(18,19,23,.86)'; const rx=x-w/2, ry=yy-h/2, rr=h*.3;
    ctx.beginPath(); ctx.moveTo(rx+rr,ry); ctx.arcTo(rx+w,ry,rx+w,ry+h,rr); ctx.arcTo(rx+w,ry+h,rx,ry+h,rr); ctx.arcTo(rx,ry+h,rx,ry,rr); ctx.arcTo(rx,ry,rx+w,ry,rr); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=col; ctx.globalAlpha*=.55; ctx.lineWidth=1.5; ctx.stroke(); ctx.globalAlpha=t>.75?(1-t)/.25:1;
    ctx.fillStyle='#000'; ctx.fillText(text,x,yy+2); ctx.fillStyle=col; ctx.fillText(text,x,yy); ctx.restore(); return true; }});
}
// placement stats (F-14): this run's placements by board (every attempt), by layer and in all; by shape (each rotation) placed and
// line-clearing, for this run and for the lifetime profile. Not shown yet apart from the counts on the board, the pause card and the map.
function countPlacement(sid,cleared){
  const pl=plStats(), idx=level-1, z=zoneOfIdx(idx); pl.t++; pl.z[z]=(pl.z[z]||0)+1; pl.b[idx]=(pl.b[idx]||0)+1;
  for(const o of [dayState.shapes||(dayState.shapes={}), life.shapes||(life.shapes={})]){ const r=o[sid]||(o[sid]=[0,0]); r[0]++; if(cleared) r[1]++; }
  saveDay();
}
let undo=null;
async function place(i,r0,c0){
  skipFlag=false; $('skipHint').hidden=true;
  const p=pieces[i];
  const rating=rateMove(i,r0,c0);
  undo=JSON.parse(JSON.stringify({grid,pieces,nextPiece,score,combo,sinceClear,collected,hand,since,bigNext,moves,dealt,dealtN}));
  p.cells.forEach(([r,c],k)=>grid[r0+r][c0+c]=p.mats[k]);
  score+=SCORE.block*p.cells.length; pieces[i]=null; blip(140,.07,'square',.06); moves++;
  if(rating){ const B=boardC.getBoundingClientRect(); floatText(B.left+(c0+p.w/2)*cell,B.top+(r0+p.h/2)*cell,rating.word,rating.col); blip(1175,.08,'triangle',.05); blip(1568,.1,'triangle',.05,.07); }
  const {rows,cols}=linesNow(), n=rows.length+cols.length;
  countPlacement(p.sid,n>0);
  if(combo>life.records.bestCombo) life.records.bestCombo=combo; if(n>life.records.bestLines) life.records.bestLines=n;
  { const now=performance.now(); let filled=0; grid.forEach(row=>row.forEach(v=>{ if(v) filled++; }));
    A.track('piece_place',{sid:p.sid,cells:p.cells.length,r:r0,c:c0,slot:i,lines:n,combo,rating:rating?rating.word:null,
      has_special:p.mats.some(m=>MATS[m].kind==='special'),think_ms:Math.round(now-lastAct),moves,filled,score_after:score});
    lastAct=now; }
  if(n){
    busy=true;
    combo++; sinceClear=0;
    const kill=new Set(); rows.forEach(r=>{for(let c=0;c<N;c++)kill.add(r*N+c)}); cols.forEach(c=>{for(let r=0;r<N;r++)kill.add(r*N+c)});
    const ctx=mineCtx(), blasts=[], hit=[]; const clearStart=score;
    kill.forEach(k=>{ const r=Math.floor(k/N), c=k%N, m=grid[r][c]; if(!m) return;
      if(m==='blast'){ blasts.push([r,c]); return; }
      if(MATS[m].kind==='special'){ hit.push(specialHit(m,r,c,ctx)); return; }
      mineCell(r,c,ctx); });
    // combo = clearing placements in a row, this one included (the streak); placePoints adds lines, the multi-line combo and the streak
    const pp=placePoints(0,n,combo,false); score+=pp.total;
    flushCtx(ctx);
    if(n<2){ const B=boardC.getBoundingClientRect(); const cr=rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:3.5, cc=cols.length?cols.reduce((a,b)=>a+b,0)/cols.length:3.5;   // combos show their points on the banner
      floatText(B.left+(cc+.5)*cell,B.top+(cr+.5)*cell,`+${score-clearStart}${combo>1?'  streak '+combo:''}`,'#fff3c4'); }
    const msgs=ctx.msgs.slice();
    if(!hit.length && !blasts.length) msgs.slice(0,3).forEach(showCombo);
    [392,494,587,784].slice(0,Math.min(4,1+n)).forEach((f,j)=>blip(f*(1+Math.min(combo,8)*.06),.12,'triangle',.06,j*.06));   // the pitch climbs with the streak
    const emptied=grid.every(row=>row.every(v=>!v));   // an All Clear has its own, bigger moment
    if(n>1&&!emptied) playCombo(n,rows,cols,score-clearStart); else shake(n>1);
    updateStreak(combo,true);
    if(blasts.length){
      life.seen.blast=true; let count=0; for(const [r,c] of blasts) if(grid[r][c]==='blast') count+=await detonate(r,c,hit);
      const pts=SCORE.special.blast*count; score+=pts; A.track('special_triggered',{m:'blast',count});
      await skippable(REDUCE?100:350);
      showSkip(); await skippable(playSplash(count>1?`Blast Charge ×${count}`:'Blast Charge',`+${pts}`,'blast'));
    }
    for(const sp of hit){
      A.track('special_triggered',{m:sp.m,pts:sp.pts,res:sp.res||null,n:sp.n||0});
      showSkip(); await skippable(playSpecial(sp));
      if(sp.m==='sledgehammer'){ doShake(); await skippable(REDUCE?400:900); }
    }
    if(grid.every(row=>row.every(v=>!v))){
      const ac=allClearBonus(); score+=ac; bigNext=3; A.track('all_clear',{bonus:ac,score_after:score,target:levelDef(level).target});
      showSkip(); playAllClear(ac); await skippable(REDUCE?600:1300);
    }
  } else { sinceClear++; combo=0; updateStreak(0); }   // the streak breaks on any placement that clears nothing
  busy=false; $('skipHint').hidden=true; skipFlag=false; updateDur();
  if(toolBreakable()&&dayState.dur<=0&&zoneOfIdx(level-1)===CRUST_Z){ toolBreak(); return; }
  // the rolling tray: the emptied slot takes the next piece and a new next piece is dealt; the third star ends the board (F-14)
  pieces[i]=nextPiece; nextPiece=dealOne(); if(pieces[i]) dropIn(i);
  if(starAt().length&&starsNow()>=3){ tickPotions(); drawTray(); updateHUD(); tutorAfterPlace(n); reachTarget(); return; }
  updateHUD(); drawTray(); updateComboMeter(); clearHint(); updateHintBtn(); tutorAfterPlace(n);
  if(pieces.every(q=>!q||!canPlaceAnywhere(q))){ gameOver(); saveBoard(); saveProfile(); return; }   // a protected cave-in is undone before the potion ticks
  tickPotions(); saveBoard(); saveProfile();
}
// Placing every piece of the board's last deal ends it (v2.0.4). Its stars come from its points against the layer's star lines.
// The results sheet offers CONTINUE (bank the haul, the points and the stars) or RETRY, a clean restart: this run's ore, points
// and stars are discarded. Below the 1-star line the board is not cleared: retry it, or leave for the map without the haul.
function reachTarget(){
  if(tut.active) tutorFinish(false);
  const dd=levelDef(level), stars=starsNow(); reached=true; reachScore=score; decided=false; busy=true; clearHint();
  A.track('board_target',{idx:level-1,label:boardLabel(level-1),stars,yield:yieldNow(),star_at:starAt(),score,target:dd.target,moves,duration_ms:Math.round(performance.now()-boardT0),attempt:(dayState.attempts||{})[level-1]||1});
  saveBoard();
  // v2.6.1: one celebration: the words, the jingle and the blocks breaking happen here, once; CONTINUE then goes straight to the map
  if(stars){ showCombo('Cave mined!'); [523,659,784,1047].forEach((f,j)=>blip(f,.18,'triangle',.07,.1+j*.1));
    for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(grid[r][c]){ burst(r,c,grid[r][c],4); grid[r][c]=null; } shake(); }
  else { showCombo('Not enough points'); [392,330,262].forEach((f,j)=>blip(f,.16,'triangle',.06,j*.1)); }
  const lv=level, still=()=>level===lv&&reached&&!decided&&screen==='game';   // the player may have left for another board in the meantime
  setTimeout(()=>{ if(still()) showResult(); },REDUCE?250:700);
}
function showResult(){
  const sh=$('sheet'); sh.innerHTML=''; sheetMode='result'; busy=true;
  const el=(tag,cls,txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!==undefined) e.textContent=txt; return e; };
  const at=starAt(), y=score, stars=starsFromScore(y,at);
  sh.append(el('div','shLabel',stars?'CAVE MINED':'NOT ENOUGH POINTS'),el('div','shTitle',stars?undefined:`${score.toLocaleString()} points`));
  if(stars){ const t=sh.lastChild; t.classList.add('shTitleStars'); t.setAttribute('aria-label',`${stars} of 3 stars`); t.append(el('span','on','★'.repeat(stars)),el('span','off','★'.repeat(3-stars))); }
  sh.append(el('div','shBody',stars
    ?`${score.toLocaleString()} points in ${moves} placements. Continue to keep your haul and stars, or retry for more stars: a retry starts over and this board's haul is not kept.`
    :`You placed every piece but scored too few points for a star, so the board is not cleared. Retry it: clear several lines at once and keep clearing on back-to-back moves. This run's haul is not kept.`));
  const row=el('div','shStars'); at.forEach((x,k)=>{ const b=el('div','shStar'+(y>=x?' got':'')); b.style.animationDelay=(.15+.18*k)+'s'; b.append(el('b',undefined,'★'.repeat(k+1)),el('span',undefined,`${x.toLocaleString()} pts`)); row.append(b); }); sh.append(row);
  const got=sortedEntries(hand).filter(([,v])=>v>0);
  if(got.length){ const hr=el('div','shHaul'); hr.setAttribute('aria-label','Haul from this run'); got.forEach(([k,v])=>{ const c=el('span'); c.title=DROPS[k][0]; c.append(iconOf(ITEM[k]),document.createTextNode(` ${v}`)); hr.append(c); }); sh.append(hr); }
  const btns=el('div','shBtns'), retry=el('button',stars?'alt':'go','RETRY'), other=stars?el('button','go','CONTINUE'):el('button','alt','MAP');
  retry.id='resRetry'; other.id=stars?'resGo':'resMap'; retry.type=other.type='button';
  if(stars){ other.style.flex='1.4'; btns.append(retry,other); } else { retry.style.flex='1.4'; btns.append(other,retry); }
  sh.append(btns);
  retry.onclick=retryBoard; other.onclick=stars?()=>{ closeSheet(); bankBoard(); }:leaveBoard;
  $('sheetScrim').classList.add('center'); sh.classList.add('pop'); sh.classList.add('result');   // v2.6.1: a centred card, no grab handle: it needs a choice, so it can't be swiped away
  $('sheetScrim').hidden=false;
}
// ---- pause (v2.1.1): a centred card with the board, the layer's stars, the next star line and three icon buttons ----
const ICON={
  play:'<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  restart:'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
  exit:'<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3.5h6.5v17H13"/><path d="M13 3.5 7.5 5v14l5.5 1.5z" fill="currentColor" fill-opacity=".18"/><path d="M10.5 12H2.5M5.5 9l-3 3 3 3"/></svg>'};
function openPause(){
  if(screen!=='game'||sheetMode||busy&&!over||!$('info').hidden||!$('askScrim').hidden) return;
  const sh=$('sheet'); sh.innerHTML=''; sheetMode='pause'; A.track('pause_open',{idx:level-1});
  const el=(tag,cls,txt)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(txt!==undefined) e.textContent=txt; return e; };
  const dd=levelDef(level), z=zoneOfIdx(level-1), zs=zoneStars(z), at=dd.starAt, k=starsFromScore(score,at);
  sh.append(el('div','shLabel','PAUSED'),el('div','shTitle',dd.name));
  const info=el('div','pauseInfo');
  const line=(k,v)=>{ const p=el('div'); p.append(document.createTextNode(k+' '),el('b',undefined,v)); info.append(p); };
  if(!dd.core) line('Placements on this board:',moves.toLocaleString());
  if(at.length&&k<3) line('Next star at:',at[k].toLocaleString()+' points');
  if(zs.max) line(`Stars in ${dd.zoneName.replace(/^The /,'')}:`,`${zs.got} of ${zs.max}`);
  sh.append(info);
  // v2.7.0: a legend of what this board is made of (rock, ore, gems), with names
  { const seen=new Set(); Object.keys(dd.base||{}).forEach(k=>seen.add(k)); grid.forEach(row=>row.forEach(m=>{ if(m&&MATS[m]&&MATS[m].kind!=='special'&&MATS[m].kind!=='potion') seen.add(m); }));
    [...(dd.ores||[]),...Object.keys(dd.gems||{})].forEach(k=>seen.add(k));
    const leg=el('div','legend'); leg.append(el('div','legLabel','ON THIS BOARD'));
    const box=el('div','legItems'); [...seen].sort((a,b)=>(MATS[a].kind==='base'?0:1)-(MATS[b].kind==='base'?0:1)||stashOrder(MATS[a].drop||a,MATS[b].drop||b)).forEach(m=>{ const it=el('span','legIt'); it.title=blockWhat(m); it.append(iconOf(texOf(m)||TEX[m]),document.createTextNode(blockName(m))); box.append(it); });
    leg.append(box,el('div','legHint','Tap any block on the board to see what it is.')); sh.append(leg); }
  const btns=el('div','pauseBtns');
  const mk=(id,icon,label,cls)=>{ const w=el('div','pbWrap'), b=el('button','pbtn '+cls); b.id=id; b.type='button'; b.innerHTML=ICON[icon]; b.setAttribute('aria-label',label); w.append(b,el('span',undefined,label)); btns.append(w); return b; };
  const quit=mk('pauseQuit','exit','Map','alt'), rst=mk('pauseRestart','restart','Restart','alt'), res=mk('pauseResume','play','Resume','go');   // v2.4.0: Map, Restart, Resume from left to right
  sh.append(btns);
  res.onclick=closeSheet;
  rst.onclick=async()=>{ if(!await ask('Restart this board?','Your points on this board start again from zero.','Restart')) return;
    closeSheet(); A.track('board_restart',{idx:level-1,score,moves}); startBoard(level-1); };
  quit.onclick=async()=>{ if(!await ask('Exit to map?','Your board is saved. Tap it on the map to carry on.','Exit')) return; closeSheet(); showMap({}); };
  $('sheetScrim').classList.add('center'); sh.classList.add('pop');
  $('sheetScrim').hidden=false; res.focus();
}
// a small centred yes/no dialog above everything else; resolves true for yes
let askDone=null;
function ask(title,text,yes='Yes',no='Cancel'){
  if(askDone) askDone(false);
  $('askTitle').textContent=title; $('askText').textContent=text||''; $('askText').hidden=!text; $('askYes').textContent=yes; $('askNo').textContent=no||''; $('askNo').hidden=!no;
  $('askScrim').hidden=false; $('askYes').focus();
  return new Promise(res=>{ askDone=v=>{ askDone=null; $('askScrim').hidden=true; res(v); }; });
}
$('askYes').onclick=()=>askDone&&askDone(true);
$('askNo').onclick=()=>askDone&&askDone(false);
$('askScrim').addEventListener('click',e=>{ if(e.target===$('askScrim')&&askDone) askDone(false); });
$('pauseBtn').onclick=openPause;
// RETRY: a clean restart, nothing from this run is kept
function retryBoard(){ if(!reached||decided) return; decided=true; closeSheet(); A.track('board_retry',{idx:level-1,stars:starsNow(),score,yield:yieldNow()}); hand={}; startBoard(level-1); }
// 0 stars, back to the map: the board stays uncleared and the haul is dropped
function leaveBoard(){ if(!reached||decided) return; decided=true; closeSheet(); A.track('board_leave_unstarred',{idx:level-1,score,yield:yieldNow()}); hand={}; busy=false; reached=false; pieces=null; clearBoardSave(); showMap({}); }
function recordClear(stars,pts){
  const idx=level-1, today=dayState.day; dayState.stars=dayState.stars||{};
  if(!life.firstDay) life.firstDay=today; Meta.touchStreak(life,today);
  if(!dayState.done.includes(idx)){ dayState.done.push(idx); life.cleared++; }
  if(dayState.lastClear!==today){ dayState.lastClear=today; dayState.days=(dayState.days||0)+1; life.days++; }
  { const prev=dayState.stars[idx]||0; if(stars>prev){ life.stars+=stars-prev; dayState.stars[idx]=stars; } }   // stars already earned stay
  { const before=dayState.scores[idx]||0; if(pts>before){ life.points+=pts-before; dayState.scores[idx]=pts; } }
  life.records.deepest=Math.max(life.records.deepest||0,zoneOfIdx(idx)); life.records.bestBoard=Math.max(life.records.bestBoard,pts);
  // the first board of every layer below the Forest is its camp: a missed day never sends you back past it
  const z=zoneOfIdx(idx), j=jOfIdx(idx), camps=dayState.campsMade=dayState.campsMade||[]; if(j===0&&z>0&&!ZONES[z].core&&!camps.includes(z)){ camps.push(z); campReached=z; }
}
let campReached=0;
function bankHand(){ const haul={...hand}; Object.entries(hand).forEach(([k,v])=>{ bank[k]=(bank[k]||0)+v; }); hand={}; updateStash(Object.keys(haul)); return haul; }
let banking=false;
// CONTINUE: the board is cleared with its stars, and the haul joins the stash
function bankBoard(){
  const stars=starsNow(); if(banking||!reached||stars<1) return; banking=true; setTimeout(()=>{ banking=false; },2500);
  decided=true; busy=true; const idx=level-1, dd=levelDef(level);
  clearBonus=150+100*zoneOfIdx(idx); const sb=starBonus(stars,dd.target), pts=score+clearBonus+sb, haul=bankHand();
  recordClear(stars,pts);
  A.track('board_complete',{stars,star_bonus:sb,haul:Object.values(haul).reduce((a,b)=>a+b,0),yield:yieldNow(),idx,label:boardLabel(idx),score,target:dd.target,moves,duration_ms:Math.round(performance.now()-boardT0),attempt:(dayState.attempts||{})[idx]||1});
  saveDay(); saveProfile(); clearBoardSave();
  shownCol={...collected}; updateGoals();
  setTimeout(()=>{ busy=false; pieces=null; const camp=campReached; campReached=0; showMap({justDone:idx, camp}); },REDUCE?100:300);
}
const completeBoard=bankBoard;
// a cave-in without a Potion of Protection: whatever you hauled on this attempt spills back out of the stash
function loseHand(){
  const entries=Object.entries(hand).filter(([,v])=>v>0); if(!entries.length) return 0;
  let total=0, topY=innerHeight;
  entries.forEach(([res,n])=>{ total+=n; const el=document.querySelector(`.si[data-k="${res}"] canvas`); if(!el) return; const R=el.getBoundingClientRect(); topY=Math.min(topY,R.top);
    const x0=R.left+R.width/2, y0=R.top+R.height/2;
    for(let q=0;q<Math.min(n,8);q++){ const t0=performance.now()+q*70, vx=(Math.random()-.5)*6; let x=x0,y=y0,vy=-(4+Math.random()*6);
      fxList.push({draw(ctx,now){ if(now<t0) return true; const age=(now-t0)/1000; if(age>1.2) return false; x+=vx; vy+=.55; y+=vy;
        ctx.save(); ctx.globalAlpha=Math.max(0,1-age/1.2); ctx.imageSmoothingEnabled=false; ctx.drawImage(ITEM[res],x-14,y-14,28,28); ctx.restore(); return true; }}); } });
  hand={}; updateStash(entries.map(e=>e[0]));
  floatText(innerWidth/2,topY-8,'Haul lost','#ff8a7a'); [330,262,196].forEach((f,j)=>blip(f,.16,'sawtooth',.05,j*.1));
  return total;
}
// a cave-in (v2.5.0): a failure. No stars, no haul: retry the board to earn them. Once per board a Lucky Dodge (F-15) trades half the haul
// for undoing the last placement with fresh pieces, so the haul only spills once the player decides.
let dodgeUsed=false, caveSettled=true;
const haulCount=()=>Object.values(hand).reduce((a,b)=>a+(b||0),0);
const canDodge=()=>!dodgeUsed&&!!undo&&haulCount()>0;
function gameOver(){
  if(protLive&&!reached){ busy=true; setTimeout(()=>useRescue('potion'),450); return; }
  if(reached) return;   // the board already ended at its target
  { const f=dayState.fails=dayState.fails||{}; f[level-1]=(f[level-1]||0)+1; saveDay(); life.caveIns++; }
  const tg=levelDef(level).target||1, st=starsNow();
  A.track('board_fail',{hand:haulCount(),stars:st,idx:level-1,label:boardLabel(level-1),score,target:tg,pct:Math.round(100*score/tg),moves,duration_ms:Math.round(performance.now()-boardT0),can_dodge:canDodge(),attempt:(dayState.attempts||{})[level-1]||1});
  over=true; caveSettled=false; if(!canDodge()) settleCaveIn(); saveBoard(); setTimeout(()=>{ if(over) showOver(); },650);
}
// the haul spills for good (on the cave-in itself, or once the player passes up the Lucky Dodge)
function settleCaveIn(){ if(caveSettled) return 0; caveSettled=true; const lost=loseHand(); saveProfile(); return lost; }
function luckyDodge(){
  if(!over||!canDodge()) return; dodgeUsed=true; const before={...hand};
  A.track('lucky_dodge',{idx:level-1,score,moves,haul:haulCount()});
  useRescue('dodge');
  // half the board's haul (rounded in your favour where it's odd) is the price: undo restored the haul from before the last placement
  const pay={}; Object.keys(before).forEach(k=>{ const v=hand[k]||0, give=Math.floor(v/2); if(give){ hand[k]=v-give; pay[k]=give; } });
  updateStash(Object.keys(pay)); saveBoard(); saveProfile(); life.seen.dodge=true;
}
const RESCUE=()=>RECIPES.find(r=>r.m==='rescue');
// The Crust wore the Galaxy Alloy tools through: the haul spills, and the descent drops back to the start of Magmastone
let toolBroke=false;
function toolBreak(){
  busy=true; over=true; const lost=loseHand();
  dayState.done=dayState.done.filter(i=>i<Z_START[MAGMA_Z]); dayState.camp=0; dayState.dur=DUR_AFTER_BREAK; saveDay(); clearBoardSave(); pieces=null;
  A.track('tools_broke',{idx:level-1,label:boardLabel(level-1),score,hand_lost:lost});
  shake(true); [220,180,140,110].forEach((f,j)=>blip(f,.2,'sawtooth',.06,j*.12));
  const d=playSplash('Tools shattered','Back to the start of Magmastone','blast');
  setTimeout(()=>{ busy=false; over=false; showMap({broke:true}); },Math.max(1600,d));
}
function updateDur(){ const c=$('durChip'); if(!c) return; const z=level?zoneOfIdx(level-1):0, show=toolBreakable()&&z>=MAGMA_Z&&screen==='game';
  c.hidden=!show; if(!show) return; c.textContent=`TOOLS ${Math.max(0,Math.round(dayState.dur))}%`; c.classList.toggle('low',dayState.dur<25); }
// a cave-in while protected: free (the potion paid its points when drunk), and the protection carries on.
// Nothing saves you after a cave-in has happened (v2.2.0): the cave-in screen offers only Retry and Map.
function useRescue(mode){
  A.track('rescue_used',{idx:level-1,score,moves,mode}); life.seen.rescue=true;
  if(undo){ ({grid,pieces,score,combo,sinceClear,collected,hand,since,bigNext,moves,dealt}=JSON.parse(JSON.stringify(undo))); nextPiece=undo.nextPiece||null; dealtN=undo.dealtN??dealtN; hand=hand||{}; shownCol={...collected}; }
  shown=score; undo=null; over=false; caveSettled=true; $('over').hidden=true; updateComboMeter();
  dealSet();   // fresh pieces replace the tray and the next piece
  buildGoals(); updateHUD(); updateStash(); renderDock(); drawTray();
  busy=true; const d=mode==='dodge'?playSaved('Lucky Dodge · half your haul for a second chance'):playSaved('Last move undone · fresh pieces'); setTimeout(()=>{ busy=false; },d);
  saveBoard(); saveProfile();
}
// the "saved you" moment: a shield snaps over the board, glows and fades, with a big SAVED!
function playSaved(sub){
  const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2, cy=B.top+B.height/2, R=B.width*.62, t0=performance.now(), D=REDUCE?500:1500;
  fxList.push({draw(ctx,now){ const t=(now-t0)/D; if(t>=1) return false; if(t<0) return true;
    const pop=t<.18?easeOut(t/.18)*1.08:t<.3?1.08-.08*((t-.18)/.12):1, a=t<.7?1:1-(t-.7)/.3, r=R*pop;
    ctx.save(); ctx.globalAlpha=a; ctx.translate(cx,cy);
    const path=()=>{ ctx.beginPath(); ctx.moveTo(0,-r); ctx.quadraticCurveTo(r*.95,-r*.95,r*.9,-r*.25); ctx.quadraticCurveTo(r*.8,r*.55,0,r); ctx.quadraticCurveTo(-r*.8,r*.55,-r*.9,-r*.25); ctx.quadraticCurveTo(-r*.95,-r*.95,0,-r); ctx.closePath(); };
    path(); ctx.fillStyle='rgba(255,154,184,.16)'; ctx.fill();
    ctx.shadowColor='#ff9ab8'; ctx.shadowBlur=24+12*Math.sin(now/90); ctx.lineWidth=5; ctx.strokeStyle='#ffd0e0'; ctx.stroke();
    ctx.shadowBlur=0; ctx.lineWidth=2; ctx.strokeStyle='#ffffff'; ctx.globalAlpha=a*.7; ctx.stroke();
    const sweep=(now-t0)/700%1; ctx.save(); path(); ctx.clip(); const g=ctx.createLinearGradient(-r,-r+2*r*sweep-40,r,-r+2*r*sweep+40); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.5,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(-r,-r,2*r,2*r); ctx.restore();
    ctx.restore(); return true; }});
  [[cx,cy-R*.9],[cx-R*.8,cy-R*.2],[cx+R*.8,cy-R*.2],[cx,cy+R*.9]].forEach(([x,y])=>spawnFxParts('spark',x,y,REDUCE?2:8,['#ffffff','#ff9ab8','#ffd0e0']));
  [523,659,784,1047,1319].forEach((f,j)=>blip(f,.12,'triangle',.06,j*.07));
  return Math.max(D,playSplash('Saved!',sub,'rescue'));
}
const TIPS=['Look at all three pieces before you place the first one.','A bright outline means that drop will clear a line.','Clear lines on back-to-back moves to build a combo.','A crafted Blast Charge or Sledgehammer can rescue a crowded board.'];
function caveInTip(){
  const [lo,hi]=occBits(grid); let filled=0; grid.forEach(r=>r.forEach(v=>{ if(v) filled++; }));
  const holes=countHoles(lo,hi), big=(pieces||[]).some(p=>p&&p.cells.length>=5);
  if(holes>=2) return 'Sealed single gaps ate your space. Try not to wall in lonely empty cells.';
  if(big&&filled>=36) return 'Long and wide pieces need open room. Keep one row or column free for them.';
  if(sinceClear>=4) return 'It had been several moves since your last clear. Build rows toward full so they clear before the board fills.';
  if(filled>=44) return 'The board was almost full. Clear lines earlier, even small ones, to keep room.';
  return TIPS[(moves+level)%TIPS.length];
}
function showOver(){
  const dd=levelDef(level), st=starsNow(), fails=(dayState.fails||{})[level-1]||0; $('finalScore').textContent=score.toLocaleString();
  $('overWhy').textContent=`The cave gave way after ${moves} placement${moves===1?'':'s'}.`;
  $('overBar').hidden=true;
  $('finalNote').textContent=st?`The board isn't cleared and your ${'★'.repeat(st)} and the ore you mined on it are lost: next time, haul out with the mine cart before it gets risky. Your stash and belt are safe.`:'The board isn\'t cleared and the ore you mined on it is lost. Your stash and belt are safe.';
  $('overTip').textContent=caveInTip()+(fails>=2?' The dealer will go easier on your next try.':'');
  if(dockCount('rescue')) $('overTip').textContent='You had a Potion of Protection on your belt. Tap it to drink it before you get stuck: it guards you for '+POTION_MOVES+' placements.';
  $('retry').textContent='Retry'; $('again').textContent='Return to map';
  const dg=$('dodge'), can=canDodge()&&!caveSettled; dg.hidden=!can; $('over').classList.toggle('dodging',can);
  if(can){ const h=haulCount(), give=Object.values(hand).reduce((a,v)=>a+Math.floor((v||0)/2),0); $('dodgeTxt').textContent=give?`Costs ${give} of your ${h} ore · undoes your last placement`:'Undoes your last placement'; }
  $('over').hidden=false; blip(110,.4,'sawtooth',.05);
}
$('dodge').onclick=()=>luckyDodge();
$('retry').onclick=()=>{ settleCaveIn(); A.attempt('retry_board',level-1,{score},120000); startBoard(level-1); };
$('again').onclick=()=>{ settleCaveIn(); clearBoardSave(); pieces=null; if(toolBroke){ toolBroke=false; showMap({broke:true}); return; } const camp=campReached; campReached=0; showMap(camp?{camp}:{}); };
// ---------- Hammer: shake the remaining blocks into a fresh, gap-free arrangement ----------
let scrAnim=null;
function shakeLayout(count){
  // Grow random clusters that favour busy rows/columns (but never fill one), then keep the best gap-free layout
  let best=null;
  const trayShapes=(pieces||[]).filter(Boolean).map(p=>SHAPES[p.sid]).filter(Boolean);
  for(let t=0;t<260;t++){
    const occ=new Uint8Array(64), rowN=new Array(N).fill(0), colN=new Array(N).fill(0); let placed=0;
    while(placed<count){
      const cand=[]; let tot=0;
      for(let k=0;k<64;k++){ if(occ[k]) continue; const r=k>>3, c=k&7; if(rowN[r]>=N-1||colN[c]>=N-1) continue;
        let adj=0; if(r>0&&occ[k-8]) adj++; if(r<N-1&&occ[k+8]) adj++; if(c>0&&occ[k-1]) adj++; if(c<N-1&&occ[k+1]) adj++;
        const w=(placed===0?1:.15)+adj*1.6+(rowN[r]+colN[c])*.35+Math.random()*.6; cand.push([k,w]); tot+=w; }
      if(!cand.length) break;
      let v=Math.random()*tot, pick=cand[0][0]; for(const [k,w] of cand){ v-=w; if(v<=0){ pick=k; break; } }
      occ[pick]=1; rowN[pick>>3]++; colN[pick&7]++; placed++;
    }
    if(placed<count) continue;
    let lo=0,hi=0; for(let k=0;k<64;k++) if(occ[k]){ const [a,b]=bitOf(k>>3,k&7); lo|=a; hi|=b; }
    lo>>>=0; hi>>>=0;
    if(countHoles(lo,hi)>0) continue;
    if(trayShapes.length && !solveCount(lo,hi,trayShapes,1,6000,true,false).count) continue;
    let sc=Math.random()*2;
    for(let i=0;i<N;i++){ if(rowN[i]>=5) sc+=rowN[i]*rowN[i]*.25; if(colN[i]>=5) sc+=colN[i]*colN[i]*.25; }
    if(!best||sc>best.sc) best={sc,occ};
  }
  return best && best.occ;
}
function doShake(){
  const cells=[]; for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(grid[r][c]) cells.push({m:grid[r][c],r,c});
  const occ=shakeLayout(cells.length);
  if(!occ){ showCombo('The board holds steady'); return; }
  const targets=[]; for(let k=0;k<64;k++) if(occ[k]) targets.push([k>>3,k&7]);
  const mats=cells.map(c=>c.m).sort(()=>Math.random()-.5);
  const ng=emptyGrid(), mv=[], tset=new Set();
  targets.forEach(([tr,tc],i)=>{ ng[tr][tc]=mats[i]; tset.add(tr*N+tc); const src=cells[i]; mv.push({m:mats[i],fr:src.r,fc:src.c,tr,tc,lift:.4+Math.random()*.8}); });
  grid=ng; scrAnim={moves:mv,targets:tset,t0:performance.now(),D:REDUCE?350:900};
  shake(true); [220,330,440,660].forEach((f,j)=>blip(f,.12,'square',.05,j*.09));
}

// ---------- stash, the belt and Craft ----------
const mkIcon=draw=>{ const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d'); x.imageSmoothingEnabled=false; draw(x,(i,j,w,h,col)=>{ x.fillStyle=col; x.fillRect(i,j,w,h); }); return c; };
const anvilIcon=mkIcon((x,P)=>{
  if(AIMG['ui/anvil']){ x.drawImage(AIMG['ui/anvil'],0,0,16,16); return; }
  P(1,4,13,3,'#9aa3ad'); P(0,5,3,1,'#9aa3ad'); P(2,4,12,1,'#c9d0d8'); P(1,7,13,1,'#5f666e');
  P(6,8,4,3,'#7d858e'); P(6,8,1,3,'#9aa3ad'); P(3,11,10,3,'#7d858e'); P(3,11,10,1,'#9aa3ad'); P(3,14,10,1,'#4a5057');
  P(12,2,1,1,'#ffd23f'); P(13,1,1,1,'#ffb03a'); P(11,1,1,1,'#ffe08a'); });
// the brewing table: a little cauldron on legs with pink brew and bubbles (drawn to match the 16px sprites; no PNG in the design package)
const brewIcon=mkIcon((x,P)=>{
  P(2,6,12,1,'#5f666e'); P(1,7,14,1,'#7d858e'); P(2,8,12,5,'#4a5057'); P(3,8,10,1,'#7d858e'); P(3,13,10,1,'#3a3f45'); P(3,14,2,2,'#3a3f45'); P(11,14,2,2,'#3a3f45');
  P(3,5,10,2,'#ff6a9a'); P(4,5,8,1,'#ffb0c8'); P(5,3,2,2,'#ffd0e0'); P(9,2,2,2,'#ffd0e0'); P(7,1,1,1,'#ffffff'); P(12,3,1,1,'#ff9ab8');
  P(4,9,1,3,'#5f666e'); P(6,13,4,1,'#ff8a3a'); P(7,14,2,1,'#ffd23f'); });
{ const c=$('craftIcon'); if(c) c.getContext('2d').drawImage(anvilIcon,0,0); }
// the cart bar's pixel art: a mine cart full of ore, and a timber-framed mine exit (dark, or lit once a star is earned)
function pixRows(cv,rows,pal){ const x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height); rows.forEach((r,j)=>[...r].forEach((ch,i)=>{ if(pal[ch]){ x.fillStyle=pal[ch]; x.fillRect(i,j,1,1); } })); }
const CART_ROWS=['...cc.gg.cc.o...','..cccoggcccooo..','kkkkkkkkkkkkkkkk','kbbbbbbbbbbbbbbk','kblllbbbbbbbbbdk','.kbbbbbbbbbbbdk.','.kbbbbbbbbbbbdk.','..kkkkkkkkkkkk..','..kwwk....kwwk..','..kwwk....kwwk..','...kk......kk...'];
const DOOR_ROWS=['tttttttttttttttt','tTTTTTTTTTTTTTTt','tttttttttttttttt','.pp..........pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pP.oooooooo.Pp.','.pp.oooooooo.pp.'];
function drawCartArt(on){ const b=$('cartBar'); if(!b) return;
  pixRows(b.querySelector('.cart'),CART_ROWS,{k:'#140e0a',b:'#7a5a3a',l:'#a8845a',d:'#4f3a26',w:'#6e737c',c:'#2b2b30',g:'#ffcf5c',o:'#d97a3a'});
  pixRows(b.querySelector('.door'),DOOR_ROWS,{t:'#5a3d20',T:'#8a6234',p:'#5a3d20',P:'#8a6234',o:on?'#ffcf5c':'#141416'}); }
drawCartArt(false);
$('cartBar').onclick=async()=>{ const k=starsNow(); if(k<1||busy||over||reached||screen!=='game'||uiOpen()) return;
  A.track('cart_tap',{idx:level-1,stars:k,score,moves});
  if(await ask('Done here?',`Leave with ${k} star${k>1?'s':''} and everything you mined on this board.`,'Yes','No')&&starsNow()>=1&&!busy&&!over&&!reached) reachTarget(); };
function buildStash(){
  const box=$('stashItems'); box.innerHTML='';
  STASH_KEYS.forEach((k,idx)=>{ if(GEM_KEYS.includes(k)&&!GEM_KEYS.includes(STASH_KEYS[idx-1])){ const dv=document.createElement('div'); dv.className='sdiv'; box.append(dv); }
    const d=document.createElement('div'); d.className='si'; d.dataset.k=k; d.title=DROPS[k][0];
    const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(ITEM[k],0,0);
    const t=document.createElement('div'); t.className='t'; const n=document.createElement('span'); n.className='n'; const pl=document.createElement('span'); pl.className='pl'; t.append(n,pl); d.append(cv,t); box.append(d); });
  updateStash();
}
const canAfford=r=>Object.entries(r.cost).every(([k,v])=>(bank[k]||0)>=v);
// the map's Craft button glows when something can be made now: an item with a free belt slot, the next tools, or an upgrade
const wsNext=()=>Object.values(WORKSHOP).filter(w=>!wk()[w.id]&&(!w.needs||wk()[w.needs]));
const canBuild=w=>w.stars?runStarGot()>=w.stars:canAfford(w);   // belt slots open with this run's stars (v2.5.0), the brewing table with ore
const canMake=()=>RECIPES.some(r=>(r.kind==='equip'||wk().table)&&beltFree()>=0&&canAfford(r)) || wsNext().some(w=>canBuild(w)) || (tool()<TOOLS.length-1&&canAfford({cost:tcost(tool()+1)}));
function updateAnvilGlow(){ const b=$('mapCraft'); if(b) b.classList.toggle('afford',canMake()); }
// v2.6.1: counts show the real number (the old 99+ cap hid every change after an hour of play); four digits fit the strip at 375pt,
// and a stash that big would be a balance problem anyway (the simulated typical player ends a run with at most ~220 of anything)
const cap99=n=>String(n);
// every list of resources uses the stash strip's order (STASH_KEYS): wood, bone, coal, copper, iron, gold, meteorite, prism ore, ruby, emerald, diamond
const stashOrder=(a,b)=>STASH_KEYS.indexOf(a)-STASH_KEYS.indexOf(b);
const sortedEntries=o=>Object.entries(o).sort((x,y)=>stashOrder(x[0],y[0]));
function updateStash(bumped=[]){
  // only what matters right now: anything you hold, plus what this board can give you
  const dd=screen==='game'&&level?levelDef(level):null, here=new Set(dd?[...(dd.ores||[]),...Object.keys(dd.gems||{}),...(dd.base&&dd.base.log?['wood']:[])]:STASH_KEYS);
  document.querySelectorAll('.si').forEach(el=>{ const k=el.dataset.k, v=bank[k]||0, h=hand[k]||0; el.querySelector('.n').textContent=cap99(v); el.querySelector('.pl').textContent=h?'+'+cap99(h):''; el.title=`${DROPS[k][0]}: ${v.toLocaleString()}${h?` (+${h} this board)`:''}`; el.classList.toggle('zero',!v&&!h); el.hidden=!v&&!h&&!here.has(k);
    if(bumped.includes(k)){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } });
  { const dv=document.querySelector('#stashItems .sdiv'); if(dv) dv.hidden=![...document.querySelectorAll('.si')].some(e=>!e.hidden&&GEM_KEYS.includes(e.dataset.k)); }
  updateAnvilGlow(); updateHintBtn();
}
const LOCK_SVG='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const spriteCv=(m,cls)=>{ const cv=document.createElement('canvas'); cv.className='px'+(cls?' '+cls:''); cv.width=cv.height=T; cv.getContext('2d').drawImage(SPR[m]||TEX[m],0,0); return cv; };
// one belt, drawn three ways: on the board (drag equipment, tap potions), on the map (a glance, not tappable) and in Craft (rearrange, unlock)
function beltSlots(box,mode){
  box.innerHTML=''; const cap=beltCap(), next=wsNext().find(w=>w.id.startsWith('belt'));
  for(let i=0;i<BELT_MAX;i++){
    const m=specials[i];
    if(i>=cap){ const glow=mode==='craft'&&next&&next.id==='belt'+(i+1);
      const e=document.createElement(mode==='map'?'div':'button'); if(mode!=='map') e.type='button'; e.className='tool locked'+(glow?' glow':''); e.innerHTML=LOCK_SVG; e.dataset.i=i;
      e.setAttribute('aria-label',`Locked belt slot ${i+1}`+(mode==='board'?': unlock it in Craft on the map':''));
      if(mode==='board') e.onclick=()=>toast('Unlock more belt slots in Craft, on the map.');
      if(mode==='craft') e.onclick=()=>beltTap(i);
      box.append(e); continue; }
    if(!m){ const e=document.createElement(mode==='craft'?'button':'div'); if(mode==='craft'){ e.type='button'; e.onclick=()=>beltTap(i); } e.className='tool empty'+(mode==='craft'&&beltSel>=0?' target':''); e.dataset.i=i; e.setAttribute('aria-label',`Empty belt slot ${i+1}`); box.append(e); continue; }
    const kind=kindOf(m), t=document.createElement(mode==='map'?'div':'button'); if(mode!=='map') t.type='button';
    t.className='tool '+kind+(mode==='craft'&&beltSel===i?' sel':''); t.dataset.m=m; t.dataset.slot=i;
    t.setAttribute('aria-label',MATS[m].name+(mode==='board'?(kind==='potion'?' (tap to drink)':' (drag onto the board)'):''));
    t.append(spriteCv(m,mode==='board'?(m==='sledgehammer'?'swing':kind==='potion'?'bob':''):''));
    if(mode==='board'&&m==='blast'){ const sp=document.createElement('span'); sp.className='spark'; t.append(sp); }
    if(mode==='board'){ if(kind==='potion') t.addEventListener('click',()=>drinkPotion(m)); else t.addEventListener('pointerdown',e=>startSpecialDrag(e,m,i)); }
    if(mode==='craft') t.onclick=()=>beltTap(i);
    box.append(t);
  }
}
function renderDock(){ const b=$('beltSlots'); if(b) beltSlots(b,'board'); const mb=$('mapBeltSlots'); if(mb) beltSlots(mb,'map'); if(!$('craftPanel').hidden) beltSlots($('craftBeltSlots'),'craft'); updateAnvilGlow(); }
function closeSheet(){ $('sheetScrim').hidden=true; $('sheetScrim').classList.remove('center'); $('sheet').classList.remove('pop'); $('sheet').innerHTML=''; sheetMode=''; }
$('sheetScrim').addEventListener('pointerdown',e=>{ if(e.target.id==='sheetScrim'&&sheetMode==='pause') closeSheet(); });
// ---- Craft (F-13, v2.4.0): one screen on the map for tools, equipment, potions and belt slots ----
// The belt stays at the top: tap an item to pick it up, then another slot to move it (or Drop it); tap the glowing locked slot to see
// what it costs. Each row is one tap: it asks before spending anything, or says why it can't.
let beltSel=-1;
const costText=cost=>sortedEntries(cost).map(([k,v])=>`${v} ${DROPS[k][0].toLowerCase()}`).join(', ');
function costChips(cost){ const c=document.createElement('div'); c.className='cost'; sortedEntries(cost).forEach(([k,v])=>{ const sp=document.createElement('span'), have=bank[k]||0; if(have<v) sp.className='short'; sp.append(iconOf(ITEM[k]),document.createTextNode(String(v))); sp.title=`${DROPS[k][0]}: costs ${v}, you have ${(have).toLocaleString()}`; c.append(sp); }); return c; }   // v2.6.1: just the cost, red when you're short; your totals are in Craft's stash at the top (the old min(have, cost)/cost hid spending)
function craftRow(icon,name,desc,cost,onTap,id,warnTool){
  const row=document.createElement('button'); row.type='button'; row.className='ci'; if(id) row.dataset.id=id;
  const ic=document.createElement('canvas'); ic.width=ic.height=T; ic.getContext('2d').drawImage(icon,0,0);
  const mid=document.createElement('div'); mid.innerHTML=`<div class="nm"></div><div class="ds"></div>`; mid.querySelector('.nm').textContent=name; mid.querySelector('.ds').textContent=desc;
  if(cost){ const cc=costChips(cost); mid.append(cc);
    if(warnTool){ const nx=tool()+1; if(nx<TOOLS.length){ const tc=tcost(nx); sortedEntries(cost).forEach(([k],n)=>{ if(tc[k]){ const sp=cc.children[n]; sp.classList.add('tooluse'); sp.title+=` · also needed for ${TOOLS[nx].name}`; } }); } } }
  row.append(ic,mid); if(onTap) row.onclick=onTap; else row.disabled=true; return row;
}
const say=(title,text)=>ask(title,text,'OK',null);
// v2.7.0: would this item eat into what the next tools need? (crafting specials can stall the descent)
function toolSqueeze(cost){ const nx=tool()+1; if(nx>=TOOLS.length) return null; const tc=tcost(nx);
  const hit=sortedEntries(cost).filter(([k,v])=>tc[k]&&(bank[k]||0)-v<tc[k]).map(([k,v])=>[k,Math.max(0,(bank[k]||0)-v),tc[k]]);
  return hit.length?{tool:TOOLS[nx],hit}:null; }
async function tryMake(verb,name,cost,doIt,needsBelt){
  if(!canAfford({cost})){ say('Not enough resources!',`${name} needs ${costText(cost)}. Replaying boards you have cleared gives ore too.`); return; }   // v2.5.0: before "belt full"
  if(needsBelt&&beltFree()<0){ say('Belt is full!','You need an empty belt slot for that!'); return; }
  const sq=needsBelt&&toolSqueeze(cost);
  if(sq){ const left=sq.hit.map(([k,have,need])=>`${have} of the ${need} ${DROPS[k][0].toLowerCase()}`).join(' and ');
    if(await ask(`${verb} ${name}?`,`Heads up: ${sq.tool.name} need ${costText(tcost(tool()+1))}. After this you'd have ${left}, so you'd need more mining before you can forge them.`,`${verb} anyway`,'Cancel')) doIt(); return; }
  if(await ask(`${verb} ${name}?`,`Uses ${costText(cost)}.${needsBelt?' It goes on your belt.':''}`,'Yes','No')) doIt();
}
function renderCraftStash(){ const box=$('craftStash'); if(!box) return; box.innerHTML=''; const have=STASH_KEYS.filter(k=>(bank[k]||0)>0);
  if(!have.length){ box.innerHTML='<span class="none">Your stash is empty: mine some ore first.</span>'; return; }
  have.forEach(k=>{ const sp=document.createElement('span'); sp.title=`${DROPS[k][0]}: ${(bank[k]||0).toLocaleString()}`; sp.dataset.k=k; sp.append(iconOf(ITEM[k]),document.createTextNode(cap99(bank[k]))); box.append(sp); }); }
function renderCraft(){
  closeBeltPop(); beltSlots($('craftBeltSlots'),'craft'); renderCraftStash();
  const body=$('craftBody'), top=body.scrollTop; body.innerHTML=''; const t=tool();
  const h3=x=>{ const e=document.createElement('h3'); e.textContent=x; body.append(e); };
  h3('TOOLS');
  // v2.6.0: one row of all six tools (no separate forge row). Forged ones are lit, the current one says so; the next one glows once you can
  // afford it and have reached its layer, and a tap forges it (it asks first). Under the row: what the next tools open and cost.
  { const rowT=document.createElement('div'); rowT.className='toolrow'; rowT.setAttribute('aria-label','Your tools');
    const nx=t+1<TOOLS.length?t+1:-1, reached=nx>0&&isDone(Z_START[nx]-1), nc=nx>0?tcost(nx):null;
    TOOLS.forEach((T0,k)=>{ const w=document.createElement('button'); w.type='button'; w.dataset.tier=k;
      w.className='tt'+(k<=t?' have':'')+(k===t?' cur':'')+(k===nx?' next':'')+(k===nx&&reached&&canAfford({cost:nc})?' ready':'');
      const c=document.createElement('canvas'); c.width=c.height=T; c.getContext('2d').drawImage(ITEM['tool_'+T0.id],0,0);
      const nm=document.createElement('span'); nm.className='tn'; nm.textContent=T0.short.replace(' Alloy','');
      const tag=document.createElement('span'); tag.className='tg'; tag.textContent=k===t?'Current':k===nx?'Next':k<t?'Forged':'';
      w.append(c,nm,tag); w.setAttribute('aria-label',`${T0.name}${k===t?', your current tools':k<t?', forged':k===nx?', next: tap to forge':', not forged yet'}`);
      w.onclick=()=>{ if(k===nx) tryMake('Forge',T0.name,nc,()=>forgeTool(nx)); else if(k<=t) say(T0.name,k===t?`Your current tools. ${k<TOOLS.length-1?`Good down to the end of ${ZONES[k].name}.`:'Strong enough for every layer.'}`:'You forged these earlier.'); else say(T0.name,`Forge ${TOOLS[nx].name} first.`); };
      rowT.append(w); });
    body.append(rowT);
    const info=document.createElement('div'); info.className='toolinfo';
    if(nx>0){ const p=document.createElement('div'); p.innerHTML=`<b></b> <span></span>`; p.querySelector('b').textContent=`Next: ${TOOLS[nx].name}`; p.querySelector('span').textContent=`· opens ${ZONES[nx].name}`; info.append(p,costChips(nc)); }
    else info.textContent='Your tools are strong enough for every layer.';
    body.append(info); }
  h3('MINING EQUIPMENT');
  { const nx=tool()+1; if(nx<TOOLS.length){ const tc=tcost(nx); if(RECIPES.some(r=>Object.keys(r.cost).some(k=>tc[k]))){ const n=document.createElement('p'); n.className='cnote'; n.innerHTML='<i></i>'; n.append(`Underlined costs are also needed for ${TOOLS[nx].name}: spending them now can slow your way down.`); body.append(n); } } }
  RECIPES.filter(r=>r.kind==='equip').forEach(rc=>body.append(craftRow(SPR[rc.m]||TEX[rc.m],MATS[rc.m].name,rc.desc,rc.cost,()=>tryMake('Craft',MATS[rc.m].name,rc.cost,()=>smelt(rc),true),rc.m,true)));
  h3('POTIONS');
  if(!wk().table){ const w=WORKSHOP.table; body.append(craftRow(brewIcon,w.name,w.desc,w.cost,()=>tryMake('Build',w.name,w.cost,()=>buildWorkshop('table')),'table')); }
  RECIPES.filter(r=>r.kind==='potion').forEach(rc=>{ const row=craftRow(SPR[rc.m]||TEX[rc.m],MATS[rc.m].name,rc.desc,rc.cost,()=>{ if(!wk().table){ say('Build the brewing table first','Potions are brewed at the brewing table, just above.'); return; } tryMake('Brew',MATS[rc.m].name,rc.cost,()=>smelt(rc),true); },rc.m,true); if(!wk().table) row.classList.add('off'); body.append(row); });
  body.scrollTop=top;
}
function closeBeltPop(){ const p=$('beltPop'); if(p) p.remove(); }
function beltPop(i,html){
  closeBeltPop(); const slot=document.querySelector(`#craftBeltSlots [data-i="${i}"],#craftBeltSlots [data-slot="${i}"]`), panel=$('craftPanel').querySelector('.panel'); if(!slot) return null;
  const pop=document.createElement('div'); pop.id='beltPop'; pop.className='spop'; pop.innerHTML=html; panel.append(pop);
  const r=slot.getBoundingClientRect(), pr=panel.getBoundingClientRect(), w=Math.min(250,pr.width-24), left=Math.max(12,Math.min(pr.width-w-12,r.left-pr.left+r.width/2-w/2));
  pop.style.width=w+'px'; pop.style.left=left+'px'; pop.style.top=(r.bottom-pr.top+12)+'px'; pop.style.setProperty('--ax',(r.left-pr.left+r.width/2-left-7)+'px'); return pop;
}
function beltTap(i){
  const cap=beltCap();
  if(i>=cap){ beltSel=-1; beltSlots($('craftBeltSlots'),'craft');
    const w=WORKSHOP['belt'+(i+1)], prevLocked=w.needs&&!wk()[w.needs];
    const pop=beltPop(i,`<div class="nm"></div><div class="ds"></div>`); if(!pop) return; pop.querySelector('.nm').textContent=w.name; pop.querySelector('.ds').textContent=prevLocked?'Unlock belt slot 2 first.':w.desc;
    if(!prevLocked){ const got=runStarGot(), sp=document.createElement('div'); sp.className='cost starcost'+(got<w.stars?' short':''); sp.textContent=`★ ${Math.min(got,w.stars)}/${w.stars} stars this run`; pop.append(sp);
      const b=document.createElement('button'); b.type='button'; b.className='go'; b.id='beltUnlock';
      const can=canBuild(w); b.textContent=can?'Unlock':`Earn ${w.stars-got} more star${w.stars-got===1?'':'s'}`; b.disabled=!can; b.onclick=async()=>{ closeBeltPop(); if(await ask(`Unlock ${w.name.toLowerCase()}?`,`You've earned ${got} stars this run. Stars aren't spent.`,'Yes','No')) buildWorkshop(w.id); }; pop.append(b); }
    return; }
  if(beltSel>=0){ if(beltSel!==i){ const a=specials[beltSel]; specials[beltSel]=specials[i]; specials[i]=a; saveProfile(); A.track('belt_move',{from:beltSel,to:i}); blip(660,.06,'triangle',.05); }
    beltSel=-1; closeBeltPop(); renderDock(); return; }
  if(!specials[i]) return;
  beltSel=i; beltSlots($('craftBeltSlots'),'craft'); const m=specials[i];
  const pop=beltPop(i,`<div class="nm"></div><div class="ds">Tap another slot to move it.</div><button type="button" class="alt" id="beltDrop">Drop</button>`); if(!pop) return;
  pop.querySelector('.nm').textContent=MATS[m].name;
  $('beltDrop').onclick=async()=>{ closeBeltPop(); const idx=beltSel; beltSel=-1; if(await ask(`Drop the ${MATS[m].name}?`,'It is gone for good: its ore is not refunded.','Drop','Keep')){ dockRemove(idx); saveProfile(); A.track('belt_drop',{m}); } renderDock(); };
}
function buildWorkshop(id){
  const w=WORKSHOP[id]; if(!w||wk()[id]||(w.needs&&!wk()[w.needs])||!canBuild(w)) return;
  Object.entries(w.cost).forEach(([k,v])=>bank[k]-=v); wk()[id]=1; saveDay(); fitDock(); saveProfile();
  A.track('workshop_built',{id,day:dayState.days,idx:level-1}); life.seen['ws_'+id]=true;
  updateStash(Object.keys(w.cost)); renderDock(); refreshCraft(); if(Object.keys(w.cost).length) spent(`${w.name} built`,w.cost);
  [392,523,659,784,1047,1319].forEach((f,j)=>blip(f,.12,'triangle',.06,j*.07));
  if(id==='table') toast(`Brewing table built! Brew potions here, then tap one on your belt during a board to drink it: it lasts ${POTION_MOVES} placements.`,5200);
  else showCombo(w.name+' unlocked!');
}
function refreshCraft(){ if(!$('craftPanel').hidden) renderCraft(); }
// after making something: what it cost, in words, and the spent counts pulse in Craft's stash (v2.6.1: spending used to be invisible)
function spent(what,cost){ toast(`${what}: −${sortedEntries(cost).map(([k,v])=>`${v} ${DROPS[k][0].toLowerCase()}`).join(', −')}`,2600);
  Object.keys(cost).forEach(k=>{ const e=document.querySelector(`#craftStash [data-k="${k}"]`); if(e){ e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } }); }
const tool=()=>dayState.tool||0;
const toolBreakable=()=>TOOL_WEAR&&tool()>=TOOLS.length-1;   // wear is off until backlog F-9 (see TOOL_WEAR)
const tcost=tier=>toolCost(tier,MOD());
function forgeTool(tier){
  if(tier!==tool()+1) return; const cost=tcost(tier); if(!canAfford({cost})) return;
  Object.entries(cost).forEach(([k,v])=>bank[k]-=v); dayState.tool=tier; if(tier===TOOLS.length-1) dayState.dur=DUR_MAX;
  life.seen['tool_'+TOOLS[tier].id]=true; saveDay(); saveProfile(); updateStash(Object.keys(cost));
  A.track('tool_forged',{tier,tool:TOOLS[tier].id,day:dayState.days});
  [392,523,659,784,1047].forEach((f,j)=>blip(f,.14,'triangle',.06,j*.08));
  refreshCraft(); spent(`${TOOLS[tier].name} forged`,cost); if(screen==='map') buildMap();
}
function mendTools(){
  if(!toolBreakable()) return; let used=0; while(dayState.dur<DUR_MAX&&(bank.prismore||0)>0){ bank.prismore--; used++; dayState.dur=Math.min(DUR_MAX,dayState.dur+STASH_MEND); }
  if(!used) return; saveDay(); saveProfile(); updateStash(['prismore']); A.track('tools_mended',{used,dur:Math.round(dayState.dur)});
  [659,880,1175].forEach((f,j)=>blip(f,.12,'triangle',.06,j*.07)); refreshCraft(); updateDur();
}
function openCraft(focus){ if(busy&&screen==='game') return; beltSel=-1; $('nodeCard').hidden=true; closeZonePop(); $('craftPanel').hidden=false; renderCraft(); A.track('craft_open',{screen});
  if(focus){ const r=focus==='tool'?document.querySelector('#craftBody .tt.next'):document.querySelector(`#craftBody [data-id="${focus}"]`); if(r){ r.scrollIntoView({block:'nearest'}); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); } }
  tipOnce('craft',()=>toast('Tap anything to make it. What you make goes on your belt, and your belt is all you carry into a board.',5200)); }
$('mapCraft').onclick=()=>openCraft();
$('craftClose').onclick=()=>{ closeBeltPop(); beltSel=-1; $('craftPanel').hidden=true; renderDock(); if(screen==='map') buildMap(); };
$('craftPanel').addEventListener('pointerdown',e=>{ if(e.target.id==='craftPanel') $('craftClose').onclick(); else if(!e.target.closest('#beltPop')&&!e.target.closest('#craftBeltSlots')) { if($('beltPop')){ closeBeltPop(); if(beltSel>=0){ beltSel=-1; beltSlots($('craftBeltSlots'),'craft'); } } } });
function smelt(rc){
  const i=beltFree(); if(!canAfford(rc)||i<0) return;
  A.track('craft',{m:rc.m}); life.specialsCrafted++;
  Object.entries(rc.cost).forEach(([k,v])=>bank[k]-=v);
  specials[i]=rc.m;
  updateStash(Object.keys(rc.cost)); renderDock(); refreshCraft(); saveProfile(); spent(`${MATS[rc.m].name} made`,rc.cost);
  { const t=document.querySelector(`#craftBeltSlots [data-slot="${i}"]`); if(t) t.classList.add('land'); }
  [330,440,660,880,1320].forEach((f,j)=>blip(f,.1,j%2?'square':'triangle',.05,j*.06));
}

// ---------- field guide (the info panel): content is generated from the game's own tables so the numbers never go stale ----------
const RARITY={ coal:'Common', copper:'Common', ruby:'Unusual', iron:'Unusual', gold:'Rare', emerald:'Rare', diamond:'Rare' };
const BASE_INFO=[['dirt','Topsoil','dirt'],['wood','Wood','log'],['stone','Limestone','stone'],['deep','Slate','deep'],['granite','Granite','granite'],['obsidian','Basalt','obsidian'],['ember','Magmastone','ember'],['crust','Crust rock','crust']];   // v2.7.0: the names the game uses (were old placeholder names)
function craftList(){ return [...RECIPES.map(r=>({name:MATS[r.m].name,cost:r.cost,mat:r.m,desc:r.desc})), ...Object.values(WORKSHOP).map(w=>({name:w.name,cost:w.cost,icon:w.id==='table'?brewIcon:anvilIcon,desc:w.desc})), ...TOOLS.slice(1).map((t,i)=>({name:t.name,cost:t.cost,item:'tool_'+t.id,desc:`Opens ${ZONES[i+1].name}.`}))]; }
function zonesFor(k){
  const names=ZONES.filter(z=>{ const mixes=z.mixes.some(m=>Object.keys(m).includes(k==='wood'?'log':k)); return mixes||z.ores.includes(k)||(z.gems&&z.gems[k]); }).map(z=>z.name);
  return names.length>3 ? names[0]+' to '+names[names.length-1] : names.join(', ');
}
function usesOf(k){ const u=craftList().filter(c=>c.cost[k]).map(c=>c.name); return u.length?'Used for: '+u.join(', '):'Not used for crafting yet'; }
function infoEl(tag,text,cls){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!==undefined) e.textContent=text; return e; }
function infoList(items){ const u=infoEl('ul'); items.forEach(t=>u.append(infoEl('li',t))); return u; }
function resRow(cv,name,rarity,pts,line1,line2){
  const row=infoEl('div',undefined,'irow'); row.append(cv); const d=infoEl('div');
  const nm=infoEl('div',name,'nm'); if(rarity){ nm.append(infoEl('span',rarity,'rar '+rarity)); } d.append(nm,infoEl('div',line1,'meta')); if(line2) d.append(infoEl('div',line2,'meta')); row.append(d); return row;
}
// v2.7.0: what each block is, in words (tap a block on the board; the pause card's legend)
function blockName(m){ if(!m) return ''; if(m==='grass') return 'Topsoil'; if(m==='log') return 'Wood'; return (MATS[m]&&MATS[m].name)||(DROPS[m]&&DROPS[m][0])||m; }
function blockWhat(m){ const M=MATS[m]; if(!M) return ''; if(m==='log') return 'Wood: kept in your haul. '+usesOf('wood')+'.';
  if(M.kind==='ore'||M.kind==='gem') return `${M.kind==='gem'?'A gem':'Ore'}: clear its line to mine it into your haul. ${usesOf(M.drop)}.`;
  if(m==='fossil') return 'A rare find: clear its line for a pile of bones.'; if(m==='treasure') return 'A rare find: clear its line for a haul of ore or gems.';
  if(M.kind==='special') return 'A special.'; return 'Plain rock: clear its line to make room. It is not kept.'; }
function iconOf(src){ const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(src,0,0); return cv; }
const INFO_TABS={
  Play(b){
    { const rb=document.createElement('button'); rb.type='button'; rb.id='guideTutor'; rb.className='go'; rb.textContent='Replay the tutorial'; rb.onclick=()=>replayTutorial(); b.append(rb); }
    b.append(infoEl('h3','THE GOAL'),infoEl('p',`Drag the three pieces onto the 8×8 board. Fill a whole row or column and it clears, mining every block in it. Each piece you place is replaced at once by the NEXT piece shown above the board, so you can plan ahead. A board has no set number of pieces: score points for stars, and leave whenever you have at least one. Board by board you dig down through seven layers to the Ancient Core at the heart of the world. It takes a couple of weeks of daily play.`));
    b.append(infoEl('h3','LEAVING A BOARD'),infoList([`The mine cart bar under your belt rolls toward the exit as you score. Once you have a star it lights up: tap it to leave with your haul.`,`Earn the third star and the board ends there, fully mined.`,`Or keep going for more stars and ore: the longer a board lasts, the more awkward the pieces get. Careless placements cave in fast.`]));
    b.append(infoEl('h3','CAVE-IN'),infoList([`If none of your three pieces fits anywhere, the cave collapses: the board isn't cleared, and the stars and ore you got on it are lost. Haul out with the mine cart before it gets risky.`,`Once per board the cave-in screen offers a Lucky Dodge: tap it to give up half of that board's haul, undo your last placement and keep mining.`,`A Potion of Protection undoes a cave-in for free while it lasts.`]));
    b.append(infoEl('h3','HAULING ORE'),infoList([`Ore, gems and wood you mine on a board show up in the stash strip as a green +number. That's your haul for this board.`,`Leave the board with a star and the haul joins your stash, which you keep for the whole descent. The longer you mine, the more you haul, and the more a cave-in costs.`,`Replaying a board you've already cleared gives ore too, so you can always gather more.`]));
    b.append(infoEl('h3','SCORING'),infoList([`Every block you place scores ${SCORE.block}. Every line you clear scores ${SCORE.line}. Mining ore and gems gives resources, not points.`,`Clear 2, 3 or 4 lines with one piece for a Double (+${SCORE.combo[2]}), Triple (+${SCORE.combo[3]}) or Quad (+${SCORE.combo[4]}).`,`Streak: clear on back-to-back placements. Each clear in a row after the first adds +${SCORE.streakStep}, up to +${SCORE.streakMax}. A placement that clears nothing ends the streak.`,`All Clear (an empty board) adds +${SCORE.allClear}, and the next pieces are big easy ones.`,`Star Drill +${SCORE.special.drill}, Blast Charge +${SCORE.special.blast}, Sledgehammer +${SCORE.special.sledgehammer}. A Potion of Luck costs ${-SCORE.special.luck} points and a Potion of Protection ${-SCORE.special.rescue}.`,`"Perfect!" means yours was the only placement that kept the whole tray playable; "Great fit!" one of two or three.`,`If you cave in twice on the same board, the dealer starts to go easier on you.`]));
    b.append(infoEl('h3','STARS'),infoList([`Your points on a board earn 0 to 3 stars; the star lines rise layer by layer. The three stars next to the score fill up as you score and light up as you earn them.`,`Deep down, stars come from combos and streaks: the blocks and the lines you have to clear anyway are not enough.`,`At the end, CONTINUE banks your haul and stars, or RETRY plays the board again. A retry starts over: that board's haul is not kept. Stars you already earned on a board stay.`,`Each star after the first adds bonus points to your day.`]));
    b.append(infoEl('h3','HINT AND DAILY TWIST'),infoList([`Hint, in the top bar, spends ${HINT_COST} coal to show a good move. It asks first.`,`Every day has one twist, such as Gold Rush or Forge Day. It's shown on the home screen and on each board's card.`]));
    b.append(infoEl('h3','HOW TO GET BETTER'),infoList([`Look at all three pieces before you place any. Plan the order.`,`Keep one row and one column mostly open so long bars still fit.`,`Avoid sealing off single empty cells or tiny pockets; they can only be filled by a matching piece, if one ever comes.`,`Build rows and columns up to one piece away from full, then finish several at once for a combo.`,`Gold glow under your piece means the drop will clear a line.`,`Save your belt for tight spots, not to pad your score.`]));
    b.append(infoEl('h3','EVERY DAY COUNTS'),infoList([`Clear at least one board each day (Pacific time) to keep your depth.`,`Miss a whole day and the cave settles: you drop back to your layer's camp (its first board, once you've cleared it). Your tools and stash are always kept.`,`Each day also brings a new twist.`]));
  },
  Resources(b){
    b.append(infoEl('p',`Everything you mine counts toward your score. Ore and gems also go into your stash, which pays for crafting.`));
    b.append(infoEl('h3','ORE AND GEMS'));
    [...Object.keys(ORES),'emerald','diamond'].sort((a,c)=>VAL[a]-VAL[c]).forEach(k=>b.append(resRow(iconOf(ITEM[k]),DROPS[k][0],RARITY[k],VAL[k],usesOf(k),'Found in: '+zonesFor(k))));
    b.append(infoEl('h3','ROCK AND EARTH'));
    BASE_INFO.forEach(([d,name,m])=>b.append(resRow(iconOf(TEX[m]),name,'Common',VAL[m],d==='wood'?usesOf('wood'):'Plain rock: clear it to make room. It is not kept.','Found in: '+zonesFor(d==='wood'?'wood':d))));
  },
  Crafting(b){
    b.append(infoEl('h3','CRAFT'),infoEl('p',`Everything is made in Craft, on the map (the Craft button at the end of your belt): tools, mining equipment and potions. Tap a row to make it; it asks first.`));
    b.append(infoEl('h3','YOUR BELT'),infoList([`What you make goes on your belt, and your belt is all you carry into a board: nothing can be made during a board.`,`You start with one belt slot, shared by equipment and potions. Belt slots 2 and 3 open with the stars you earn this run (${WORKSHOP.belt2.stars} and ${WORKSHOP.belt3.stars}): tap the glowing locked slot in Craft. Stars aren't spent.`,`In Craft, tap an item on your belt and then another slot to move it, or Drop it to make room.`,`Build the brewing table (${Object.entries(WORKSHOP.table.cost).map(([k,v])=>`${v} ${DROPS[k][0].toLowerCase()}`).join(', ')}) to brew potions.`,`On a board: drag a Star Drill to an edge of the board to mine a whole row or column (top or bottom edge for a column, left or right edge for a row), a Blast Charge onto the board to mine the 3×3 patch under it, or a Sledgehammer to shake the blocks into a fresh layout. Tap a potion to drink it: it lasts ${POTION_MOVES} placements.`]));
    b.append(infoEl('h3','WHAT YOU CAN CRAFT'));
    craftList().forEach(c=>{ const row=infoEl('div',undefined,'irow'); row.append(iconOf(c.icon||(c.item?ITEM[c.item]:(SPR[c.mat]||TEX[c.mat])))); const d=infoEl('div'); d.append(infoEl('div',c.name,'nm'),infoEl('div',c.desc,'meta'),
      infoEl('div','Costs: '+Object.entries(c.cost).map(([k,v])=>`${v} ${DROPS[k][0]}`).join(', '),'meta')); row.append(d); b.append(row); });
    b.append(infoEl('h3','TOOLS'),infoList([`Each layer is harder rock and needs better tools: branch tools for the Forest, then bone (from bones in the dirt), copper (Limestone), iron (Slate), steel (iron and coal from Granite) and diamond-tipped (meteorite and diamonds from Basalt).`,`Short of something? Replay boards you have already cleared: replays give ore too.`,`Each layer's 8 boards rarely give quite enough for the next tools on their own: replay a few cleared boards to make up the rest.`]));
    b.append(infoEl('h3','THE ANCIENT CORE'),infoList([`Below the Crust lies the Core: one piece, one spot. What happens next is for you to find out.`]));
    b.append(infoEl('h3','WHY IT HELPS'),infoList([`Star Drill (+${SCORE.special.drill}), Blast Charge (+${SCORE.special.blast}) and Sledgehammer (+${SCORE.special.sledgehammer}) rescue a crowded board and score points. What the drill and the blast break is mined into your haul.`,`Potion of Protection (${SCORE.special.rescue} points): for ${POTION_MOVES} placements, a cave-in undoes your last move and deals fresh pieces, and you keep your haul. Drink it before you get stuck.`,`Potion of Luck (${SCORE.special.luck} points): for ${POTION_MOVES} placements the dealer favours pieces that fill gaps and clear lines, and random specials turn up twice as often.`]));
  },
  Specials(b){
    b.append(infoEl('p',`These appear on their own inside pieces, now and then, more often the deeper you go. You can't craft them. When the line they sit in clears, they pay out resources (no points).`));
    [['fossil','Fossil',`A big find: ${FOSSIL_BONE[0]} to ${FOSSIL_BONE[1]} bones. Below the Forest, Fossils are the only source of bone for potions.`],['treasure','Buried Treasure',`A haul of ore or gems, with a better chance of gems the deeper you are.`]].forEach(([m,name,desc])=>{
      const row=infoEl('div',undefined,'irow'); row.append(iconOf(TEX[m])); const d=infoEl('div'); d.append(infoEl('div',name,'nm'),infoEl('div',desc,'meta')); d.firstChild.append(infoEl('span','Special','rar Special')); row.append(d); b.append(row); });
    b.append(infoEl('p',`Specials glow so you can spot them. Try to clear their line quickly.`));
  },
};
function renderInfo(tab){
  const tabs=$('infoTabs'); tabs.innerHTML='';
  Object.keys(INFO_TABS).forEach(t=>{ const bt=document.createElement('button'); bt.type='button'; bt.textContent=t; bt.setAttribute('role','tab'); bt.setAttribute('aria-selected',t===tab); bt.onclick=()=>{ A.track('info_tab',{tab:t}); renderInfo(t); }; tabs.append(bt); });
  const body=$('infoBody'); body.innerHTML=''; body.scrollTop=0; INFO_TABS[tab](body);
}
$('infoBtn').onclick=()=>{ if(busy) return; renderInfo('Play'); $('info').hidden=false; A.track('info_open'); };
$('infoClose').onclick=()=>{ $('info').hidden=true; };
$('info').addEventListener('pointerdown',e=>{ if(e.target.id==='info') $('info').hidden=true; });
const uiOpen=()=>screen!=='game' || !$('info').hidden || !$('sheetScrim').hidden || !$('askScrim').hidden;

// drag a crafted special straight onto the board: a Blast Charge blows up the 3×3 patch under your finger, a Sledgehammer shakes the board
let spDrag=null, spAim=null;
function startSpecialDrag(e,m,idx){
  if(over||busy||uiOpen()||specials[idx]!==m) return;
  e.preventDefault(); unlockAudio();
  spDrag={m,idx,touch:e.pointerType!=='mouse'};
  const s=Math.round(cell*.9); ghost.width=s*dpr; ghost.height=s*dpr; ghost.style.width=s+'px'; ghost.style.height=s+'px';
  gx.setTransform(dpr,0,0,dpr,0,0); gx.imageSmoothingEnabled=false; gx.clearRect(0,0,s,s); gx.drawImage(SPR[m]||TEX[m],0,0,s,s);
  ghost.hidden=false; moveSpecialDrag(e);
}
const boardCellAt=(x,y)=>{ const B=boardC.getBoundingClientRect(); const c=Math.floor((x-B.left)/cell), r=Math.floor((y-B.top)/cell); return (r>=0&&c>=0&&r<N&&c<N)?{r,c}:null; };
// v2.7.0: tap a block on the board to see what it is ("Is this slate or granite?")
let blockTipT=0;
function showBlockTip(r,c){ const m=grid&&grid[r]&&grid[r][c]; let tip=$('blockTip'); if(!tip){ tip=document.createElement('div'); tip.id='blockTip'; tip.setAttribute('role','status'); document.body.append(tip); }
  if(!m){ tip.hidden=true; return; } const B=boardC.getBoundingClientRect(), x=B.left+(c+.5)*cell, y=B.top+r*cell;
  tip.innerHTML='<b></b><span></span>'; tip.querySelector('b').textContent=blockName(m); tip.querySelector('span').textContent=blockWhat(m); tip.hidden=false;
  const w=Math.min(240,innerWidth-24); tip.style.width=w+'px'; tip.style.left=Math.max(12,Math.min(innerWidth-w-12,x-w/2))+'px';
  const h=tip.offsetHeight; tip.style.top=(y-h-8>8?y-h-8:y+cell+8)+'px'; clearTimeout(blockTipT); blockTipT=setTimeout(()=>{ tip.hidden=true; },2600);
  A.track('block_tip',{m}); }
boardC.addEventListener('click',e=>{ if(drag||spDrag||busy&&!over||screen!=='game') return; const at=boardCellAt(e.clientX,e.clientY); if(at) showBlockTip(at.r,at.c); });
document.addEventListener('pointerdown',e=>{ const t=$('blockTip'); if(t&&!t.hidden&&e.target!==boardC) t.hidden=true; },true);
function moveSpecialDrag(e){
  if(!spDrag) return;
  const s=Math.round(cell*.9), lift=spDrag.touch?cell*1.2:0;
  ghost.style.transform=`translate(${e.clientX-s/2}px,${e.clientY-s/2-lift}px)`;
  spDrag.x=e.clientX; spDrag.y=e.clientY-lift;
  const at=spDrag.m==='drill'?drillLineAt(spDrag.x,spDrag.y):boardCellAt(spDrag.x,spDrag.y); spAim=at?{...at,m:spDrag.m}:null;
}
// the Star Drill goes on an edge of the board (F-16): the edge nearest your finger picks the line, top or bottom for a column, left or right
// for a row. It works from just outside the board or from its outer two rings, never from the middle.
function drillLineAt(x,y){ const B=boardC.getBoundingClientRect(), m=cell*1.6, band=cell*2;
  if(x<B.left-m||x>B.right+m||y<B.top-m||y>B.bottom+m) return null;
  const d={top:y-B.top,bottom:B.bottom-y,left:x-B.left,right:B.right-x}, side=Object.keys(d).reduce((a,b)=>d[a]<=d[b]?a:b);
  if(d[side]>band) return null;
  const col=Math.max(0,Math.min(N-1,Math.floor((x-B.left)/cell))), row=Math.max(0,Math.min(N-1,Math.floor((y-B.top)/cell)));
  return side==='top'||side==='bottom'?{line:'col',k:col,side}:{line:'row',k:row,side}; }
function endSpecialDrag(){
  if(!spDrag) return; const d=spDrag; spDrag=null; ghost.hidden=true; spAim=null;
  const at=d.m==='drill'?drillLineAt(d.x,d.y):boardCellAt(d.x,d.y); if(!at||over||busy){ if(d.m==='drill'&&!at&&!over&&!busy) tipOnce('drillEdge',()=>toast('Drop the Star Drill on an edge of the board: top or bottom for a column, left or right for a row.',4800)); return; }
  if(d.m==='sledgehammer'&&!grid.some(row=>row.some(Boolean))){ showCombo('Nothing to shake'); return; }
  if(d.m==='drill'&&!Array.from({length:N},(_,j)=>at.line==='row'?grid[at.k][j]:grid[j][at.k]).some(Boolean)){ showCombo('Nothing to drill there'); return; }
  dockRemove(d.idx); renderDock(); A.track('special_used',{m:d.m,r:at.r??null,c:at.c??null,line:at.line||null,k:at.k??null,idx:level-1});
  if(d.m==='drill') useDrill(at.line,at.k); else useSpecial(d.m,at.r,at.c);
}
async function useSpecial(m,r,c){
  busy=true; skipFlag=false; undo=null; life.seen[m]=true;
  if(m==='blast'){
    const ctx=mineCtx(), hit=[]; if(grid[r][c]&&MATS[grid[r][c]].kind!=='special') mineCell(r,c,ctx); flushCtx(ctx);
    grid[r][c]='blast'; const count=await detonate(r,c,hit); const pts=SCORE.special.blast*count; score+=pts;
    for(const sp of hit){ showSkip(); await skippable(playSpecial(sp)); }
    showSkip(); await skippable(playSplash('Blast Charge',`+${pts}`,'blast'));
    if(grid.every(row=>row.every(v=>!v))){ const ac=allClearBonus(); score+=ac; bigNext=3; showSkip(); playAllClear(ac); await skippable(REDUCE?600:1300); }
  } else if(m==='sledgehammer'){
    score+=SCORE.special.sledgehammer; doShake(); showSkip(); await skippable(playSplash('Sledgehammer',`+${SCORE.special.sledgehammer}`,'sledgehammer')); await skippable(REDUCE?300:700);
  }
  busy=false; $('skipHint').hidden=true; skipFlag=false; updateDur();
  if(toolBreakable()&&dayState.dur<=0&&zoneOfIdx(level-1)===CRUST_Z){ toolBreak(); return; }
  updateHUD(); drawTray(); updateHintBtn();
  if(starAt().length&&starsNow()>=3){ reachTarget(); saveBoard(); saveProfile(); return; }
  if(pieces.every(q=>!q||!canPlaceAnywhere(q))) gameOver();
  saveBoard(); saveProfile();
}
// the Star Drill: every block in the line is mined into your haul; specials in it go off as they would in a clear
async function useDrill(line,k){
  busy=true; skipFlag=false; undo=null; life.seen.drill=true;
  const cells=Array.from({length:N},(_,j)=>line==='row'?[k,j]:[j,k]), ctx=mineCtx(), hit=[], blasts=[];
  for(const [r,c] of cells){ const [sx,sy]=cellScreen(r,c); spawnFxParts('spark',sx,sy,REDUCE?1:3,['#ffffff','#e8ecf2','#ffd23f']); }
  blip(1800,.05,'square',.05); blip(1500,.05,'square',.05,.06); blip(1200,.08,'sawtooth',.06,.12); shake(false);
  for(const [r,c] of cells){ const m=grid[r][c]; if(!m) continue; if(m==='blast'){ blasts.push([r,c]); continue; } if(MATS[m].kind==='special'){ hit.push(specialHit(m,r,c,ctx)); continue; } mineCell(r,c,ctx); }
  flushCtx(ctx); let pts=SCORE.special.drill; score+=pts;
  for(const [r,c] of blasts) if(grid[r][c]==='blast'){ const n=await detonate(r,c,hit); score+=SCORE.special.blast*n; pts+=SCORE.special.blast*n; }
  for(const sp of hit){ showSkip(); await skippable(playSpecial(sp)); if(sp.m==='sledgehammer'){ doShake(); await skippable(REDUCE?400:900); } }
  showSkip(); await skippable(playSplash('Star Drill',`+${pts}`,'drill'));
  if(grid.every(row=>row.every(v=>!v))){ const ac=allClearBonus(); score+=ac; bigNext=3; showSkip(); playAllClear(ac); await skippable(REDUCE?600:1300); }
  busy=false; $('skipHint').hidden=true; skipFlag=false;
  updateHUD(); drawTray(); updateHintBtn();
  if(starAt().length&&starsNow()>=3){ reachTarget(); saveBoard(); saveProfile(); return; }
  if(pieces.every(q=>!q||!canPlaceAnywhere(q))) gameOver();
  saveBoard(); saveProfile();
}
window.addEventListener('pointermove',moveSpecialDrag);
window.addEventListener('pointerup',endSpecialDrag); window.addEventListener('pointercancel',endSpecialDrag);

// ---------- saving: profile (stash, specials, achievements), today's map, the board in progress ----------
const K_PROFILE='deepcore-profile', K_DAY='deepcore-run', K_BOARD='deepcore-board';   // the run lives under deepcore-run (the old daily key was deepcore-day)
const lsGet=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
let noSave=false;   // set just before a reload that has rewritten the saved data (restore / reset), so the closing page cannot overwrite it
const lsSet=(k,v)=>{ if(noSave) return; try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const lsDel=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
function saveProfile(){ lsSet(K_PROFILE,{bank,belt:specials,fragments,luck,luckLive,prot,protLive}); saveLife(); }
function loadProfile(){ const p=lsGet(K_PROFILE); if(p){ bank=p.bank||{}; specials=Array.isArray(p.belt)?p.belt.slice():Array.isArray(p.specials)?p.specials.filter(m=>RECIPES.some(r=>r.m===m)).sort((x,y)=>(kindOf(x)==='equip'?0:1)-(kindOf(y)==='equip'?0:1)):[];   // before 2.4.0: a list, equipment first fragments=Math.min(5,p.fragments||0); luck=p.luck||0; luckLive=!!p.luckLive; prot=p.prot||0; protLive=!!p.protLive;
    // lapis and quartz were retired: swap any held for copper so nothing is lost
    ['lapis','quartz'].forEach(k=>{ if(bank[k]){ bank.copper=(bank.copper||0)+bank[k]; } delete bank[k]; }); } }
function saveDay(){ lsSet(K_DAY,dayState); }
// the furthest board you can reach: the first one of the descent you have not cleared yet
const frontier=()=>{ for(let i=0;i<BOARD_COUNT;i++) if(!dayState.done.includes(i)) return i; return BOARD_COUNT; };
// Miss a whole Pacific day (no board cleared yesterday or today) and the cave settles: you drop back to the start of the layer
// you are in, or to its camp (the layer's first board, once cleared). Tools and stash are kept.
function settle(today){
  const f=frontier(); if(f>=BOARD_COUNT) return;
  const z=zoneOfIdx(f), camp=z>0&&dayState.done.includes(Z_START[z]), start=Z_START[z]+(camp?1:0);
  const lost=dayState.done.filter(i=>i>=start); if(!lost.length) return;
  dayState.done=dayState.done.filter(i=>i<start);
  dayState.notice={kind:'missed',zone:z,lost:lost.length,camp};
  A.track('run_setback',{zone:z,lost:lost.length,camp});
}
function checkDay(){
  const s=lsGet(K_DAY), today=todayKey();
  if(!s||!s.seed){ dayState=freshRun(today); saveDay(); life.twists[modifierFor(today).id]=true; return; }
  dayState=Object.assign(freshRun(today),s);
  if(dayState.day!==today){
    if(dayState.lastClear && dayState.lastClear<Meta.prevDay(today)) settle(today);
    dayState.day=today; dayState.fails={}; dayState.attempts={};
    const b=lsGet(K_BOARD); if(b&&(b.seed!==dayState.seed||!unlocked(b.idx))) lsDel(K_BOARD);
    saveDay();
  }
  life.twists[modifierFor(today).id]=true;
}
function saveBoard(){ if(!pieces) return; lsSet(K_BOARD,{seed:dayState.seed,day:dayState.day,idx:level-1,practice,reached,reachScore,clearBonus,decided,grid,pieces,nextPiece,score,combo,sinceClear,collected,hand,since,bigNext,moves,over,undo,dealt,dealtN,dodgeUsed,diff:curDiff}); saveProfile(); }
function clearBoardSave(){ lsDel(K_BOARD); }
// a saved board is only trusted if it has the right shape; anything else (an old format, a damaged save) is discarded
function validBoard(b){
  try{ return b && Array.isArray(b.grid) && b.grid.length===N && b.grid.every(r=>Array.isArray(r)&&r.length===N) && Array.isArray(b.pieces) && b.pieces.length===3
    && b.pieces.every(p=>!p||(Array.isArray(p.cells)&&Array.isArray(p.mats)&&p.cells.length===p.mats.length&&Number.isInteger(p.sid)&&SHAPES[p.sid])) && Number.isInteger(b.idx) && b.idx>=0 && b.idx<BOARD_COUNT && typeof b.score==='number'; }catch(e){ return false; }
}
function savedBoard(){ const b=lsGet(K_BOARD); if(b&&!validBoard(b)){ lsDel(K_BOARD); return null; } return (b && b.seed===dayState.seed && !b.over && b.moves>0) ? b : null; }
const okMat=m=>MATS[m]?m:(m==='cinnabar'?'ruby':m==='jackhammer'?'sledgehammer':'copper');   // blocks retired since the save was written
function restoreBoard(b){
  curDiff=b.diff||'casual'; level=b.idx+1; ({grid,pieces,score,combo,sinceClear,collected}=b);
  grid=grid.map(row=>row.map(m=>m&&okMat(m))); pieces=pieces.map(p=>p&&{...p,mats:p.mats.map(okMat)});
  hand=b.hand||{}; practice=!!b.practice; reached=!!b.reached; reachScore=b.reachScore||0; clearBonus=b.clearBonus||0; decided=b.decided!==false; clearHint(); since=b.since||{}; bigNext=+b.bigNext||0; moves=b.moves||0; over=!!b.over; undo=b.undo||null; dealt=b.dealt||{}; dealtN=b.dealtN||0; dodgeUsed=!!b.dodgeUsed; caveSettled=true; nextPiece=b.nextPiece?{...b.nextPiece,mats:b.nextPiece.mats.map(okMat)}:null; if(!nextPiece&&!over&&!reached) nextPiece=dealOne();   // a pre-2.3.0 save gets its next piece now
  shownCol={...collected}; shown=score; busy=false;
  $('over').hidden=true; buildGoals(); updateHUD(); updateStash(); renderDock(); drawTray();
  updateLuckUI(); renderDock(); updateComboMeter(); if(reached&&!decided){ busy=true; setTimeout(()=>{ if(reached&&!decided&&screen==='game') showResult(); },500); }
  boardT0=lastAct=performance.now(); A.setBoard(boardLabel(b.idx)); A.track('board_resume',{idx:b.idx,label:boardLabel(b.idx),score,moves});
  if(over) showOver();
}
window.addEventListener('pagehide',()=>{ if(screen==='game') saveBoard(); saveProfile(); });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ if(screen==='game') saveBoard(); saveProfile(); } });

// ---------- UI interaction analytics: which buttons get used, and which get mashed ----------
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('button'); if(!b) return;
  const id=b.id||(b.className&&String(b.className).split(' ')[0])||'button', label=(b.textContent||'').trim().slice(0,24);
  A.track('ui_click',{id,label}); A.attempt('ui',id,{label},1500);
},true);
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest&&e.target.closest('button'); if(!b||!b.disabled) return;
  const id=b.id||(b.className&&String(b.className).split(' ')[0])||'button';
  A.track('ui_tap_disabled',{id,label:(b.textContent||'').trim().slice(0,24)}); A.attempt('disabled',id,{},4000);
},true);

// ---------- screens ----------
let screen='home';
function show(which){
  if(which!=='game'&&tut.active){ tut.active=false; $('tutor').hidden=true; }
  if(screen!==which||which==='home') A.track('screen_view',{screen:which});
  screen=which; A.setScreen(which); if(which!=='game') closeSheet();
  $('home').hidden = which!=='home'; $('map').hidden = which!=='map'; $('craftPanel').hidden=true; if(coachSteps){ $('coach').hidden=true; coachSteps=null; coachEndFn=null; } closeBeltPop(); $('info').hidden=true;
  if(which==='game'){ layout(); drawTray(); ensureLoop(); }
}
function homeView(v){ ['homeMain','homeSettings'].forEach(id=>$(id).hidden = id!==v); $('home').classList.toggle('sub',v!=='homeMain'); }
function showHome(){
  if(screen==='game') saveBoard();
  checkDay(); homeView('homeMain'); fillHome(); show('home'); showInstallHintIfDue();
}
const sbStr=sb=>sb?`Continue ${boardLabel(sb.idx)}`:'';
function fillHome(){
  const sb=savedBoard(), cont=$('contBtn'); cont.hidden=!sb; cont.textContent=sb?`Continue board ${boardLabel(sb.idx)}`:'';
  $('mapBtn').textContent=sb?'World map':'Play'; $('mapBtn').classList.toggle('go',!sb);
  $('hcWarn').hidden=!(dayState.lastClear&&dayState.lastClear!==dayState.day);
  { const m=modifierFor(dayState.day), t=$('homeTwist'); t.textContent=`Today: ${m.name}. ${m.desc}`; }   // the daily twist (shown here and on each board's card since 2.4.0)
  $('homeFrag').textContent='✦'.repeat(fragments); $('homeFrag').hidden=!fragments; $('homeFrag').title=fragments>=5?'Legendary':'';
}
// the Pacific day can end while the app sits open on the home or map screen: refresh into the new day
function refreshIfNewDay(){
  if(screen==='game'||dayState.day===todayKey()) return;
  if(screen==='map') showMap({}); else { checkDay(); fillHome(); }
}
setInterval(refreshIfNewDay,30000);
// coming back from sleep or another app: drop any drag the phone cut short, and rebuild the map's scroll area (iOS can leave it ignoring taps)
function onResume(){
  if(drag){ const d=drag; drag=null; ghost.hidden=true; ghost.style.transition=''; slots[d.i].firstElementChild.style.opacity=''; }
  if(spDrag){ spDrag=null; spAim=null; ghost.hidden=true; }
  slots.forEach(sl=>{ sl.firstElementChild.style.opacity=''; });
  refreshIfNewDay();
  if(screen==='map'){ const sc=$('mapScroll'), top=sc.scrollTop; sc.style.overflowY='hidden'; void sc.offsetHeight; buildMap(); requestAnimationFrame(()=>{ sc.style.overflowY=''; void sc.offsetHeight; sc.scrollTop=top; }); }
  if(screen==='game'){ layout(); drawTray(); }
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') onResume(); });
window.addEventListener('pageshow',e=>{ if(e.persisted) onResume(); });
window.addEventListener('focus',()=>{ if(screen==='map') onResume(); });
$('mapBtn').onclick=()=>showMap({});
$('contBtn').onclick=()=>{ const sb=savedBoard(); if(!sb){ showMap({}); return; } show('game'); restoreBoard(sb); A.track('continue_board',{idx:sb.idx}); };
$('settingsBtn').onclick=()=>{ homeView('homeSettings'); syncSettingsUI(); A.setScreen('settings'); };
$('settingsBack').onclick=()=>showHome();
$('privacyRow').hidden=!A.canConfigure(); $('shareData').checked=A.isOn(); $('verLine').textContent='Version '+(self.APP_VERSION||'dev');
$('shareData').addEventListener('change',e=>{ if(e.target.checked){ A.setOptOut(false); A.track('analytics_opt',{on:true}); } else { A.track('analytics_opt',{on:false}); A.setOptOut(true); } });

// ---- first-time tips: each one shows once per player (life.tips), the first time its moment comes up ----
function tipOnce(key,show){ if(!life.tips) life.tips={}; if(life.tips[key]) return false; life.tips[key]=true; saveLife(); A.track('tip_shown',{tip:key}); show(); return true; }
// what the next tools still need, for the map's top bar: "Copper tools · copper 12/20 · wood 10/10"
function nextToolsText(){ const t=tool(); if(t>=TOOLS.length-1) return depthText(); const c=tcost(t+1);
  return `${TOOLS[t+1].name} · `+Object.entries(c).map(([k,v])=>`${DROPS[k][0].toLowerCase()} ${Math.min(bank[k]||0,v)}/${v}`).join(' · '); }
// ---- toast ----
let toastTimer=0;
function toast(msg,ms=2200){ let t=document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 30px);transform:translateX(-50%);z-index:60;background:#2f3136;color:#fff;box-shadow:inset 0 0 0 1px #ffcf5c;border-radius:10px;padding:10px 16px;font-size:15px;font-weight:600;max-width:90%;text-align:center;pointer-events:none'; document.body.append(t); }
  t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },ms); }

// ---- settings screen ----
function syncSettingsUI(){ syncDiffUI(); $('reduceOn').checked=!!settings.reduce; $('largeOn').checked=!!settings.large; $('codeBox').hidden=true; resetArmed=false; $('resetBtn').textContent='Reset all progress'; }
// difficulty (v2.6.0): Casual (default) or Challenging; a board in progress keeps the one it started with
const DIFF_NOTE={casual:'The dealer is forgiving: pieces almost always fit with your tray.',challenging:'Careless placements cave in fast, and the star lines are set for it.'};
function syncDiffUI(){ const d=settings.diff||'casual'; document.querySelectorAll('.diffRow .seg button').forEach(b=>{ const on=b.dataset.d===d; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); }); $('diffNote').textContent=DIFF_NOTE[d]+(savedBoard()?' Your board in progress keeps its difficulty.':''); }
document.querySelectorAll('.diffRow .seg button').forEach(b=>b.addEventListener('click',()=>{ if(settings.diff===b.dataset.d) return; settings.diff=b.dataset.d; saveSettings(); syncDiffUI(); A.track('setting_change',{setting:'difficulty',value:settings.diff}); }));
$('reduceOn').addEventListener('change',e=>{ settings.reduce=e.target.checked; saveSettings(); applyDisplaySettings(); A.track('setting_change',{setting:'reduce_motion',value:settings.reduce}); });
$('largeOn').addEventListener('change',e=>{ settings.large=e.target.checked; saveSettings(); applyDisplaySettings(); A.track('setting_change',{setting:'large_text',value:settings.large}); });
$('tutorBtn').onclick=()=>replayTutorial();
let resetArmed=false;
$('resetBtn').onclick=()=>{
  if(!resetArmed){ resetArmed=true; $('resetBtn').textContent='Tap again to erase everything'; setTimeout(()=>{ resetArmed=false; $('resetBtn').textContent='Reset all progress'; },4000); return; }
  A.track('progress_reset'); noSave=true; try{ Object.keys(localStorage).filter(k=>k.startsWith('deepcore-')&&k!=='deepcore-aid'&&k!=='deepcore-analytics').forEach(k=>localStorage.removeItem(k)); }catch(e){}
  location.reload();
};
// ---- back up and restore with a save code ----
$('backupBtn').onclick=()=>{ saveProfile(); const code=Meta.encodeSave({profile:lsGet(K_PROFILE),life,settings,day:lsGet(K_DAY),schema:SCHEMA}); $('codeText').value=code; $('codeText').readOnly=true; $('codeApply').hidden=true; $('codeCopy').hidden=false; $('codeMsg').textContent='Copy this code and keep it somewhere safe. Pasting it into Restore on any device brings your progress back.'; $('codeBox').hidden=false; A.track('save_backup'); };
$('restoreBtn').onclick=()=>{ $('codeText').value=''; $('codeText').readOnly=false; $('codeApply').hidden=false; $('codeCopy').hidden=true; $('codeMsg').textContent='Paste a save code here. This replaces the progress on this device.'; $('codeBox').hidden=false; };
$('codeCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText($('codeText').value); toast('Code copied'); }catch(e){ $('codeText').select(); toast('Select the code and copy it'); } };
let restoreArmed=false;
$('codeApply').onclick=()=>{
  const data=Meta.decodeSave($('codeText').value); if(!data){ $('codeMsg').textContent="That code didn't look right. Check that you copied all of it."; return; }
  if(!restoreArmed){ restoreArmed=true; $('codeApply').textContent='Tap again to replace this device'; setTimeout(()=>{ restoreArmed=false; $('codeApply').textContent='Restore from this code'; },4000); return; }
  try{ lsSet(K_PROFILE,data.profile); if(data.life) lsSet(K_LIFE,data.life); if(data.settings) lsSet(K_SET,data.settings); if(data.day) lsSet(K_DAY,data.day); lsDel(K_BOARD); localStorage.setItem('deepcore-schema',String(data.schema||SCHEMA)); }catch(e){}
  noSave=true; A.track('save_restore'); location.reload();
};
// ---- feedback ----
let fbKind='Idea';
function openFeedback(){
  const chips=$('fbChips'); chips.innerHTML=''; ['Bug','Idea','Love it'].forEach(k=>{ const b=document.createElement('button'); b.type='button'; b.textContent=k; b.setAttribute('role','radio'); b.setAttribute('aria-checked',k===fbKind); b.onclick=()=>{ fbKind=k; chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-checked',x===b)); }; chips.append(b); });
  $('fbText').value=''; $('fbSend').disabled=false;
  const msg=$('fbMsg'); msg.textContent=''; if(!A.isOn()){ msg.innerHTML='Sending needs "Share anonymous play data" switched on in Settings. You can also open an issue on <a href="https://github.com/Taylors-Bookshelf/deepcore-blocks/issues/new" target="_blank" rel="noopener" style="color:#ffcf5c">GitHub</a>.'; }
  $('feedback').hidden=false;
}
$('feedbackBtn').onclick=openFeedback; $('fbClose').onclick=()=>{ $('feedback').hidden=true; };
$('fbSend').onclick=()=>{ const text=$('fbText').value.trim(); if(text.length<3){ $('fbMsg').textContent='Please write a few words first.'; return; } if(!A.isOn()){ openFeedback(); return; }
  A.track('feedback',{kind:fbKind,message:text.slice(0,500),version:self.APP_VERSION,screen,board:screen==='game'?boardLabel(level-1):'',day:dayState.day}); A.flush();
  $('fbSend').disabled=true; $('fbMsg').textContent='Thank you! Your note was sent.'; setTimeout(()=>{ $('feedback').hidden=true; },1400); };
// ---- add to home screen / install ----
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredInstall=e; });
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function showInstallHintIfDue(){
  const box=$('installHint'); box.hidden=true; if(standalone()) return;
  let last=0; try{ last=+localStorage.getItem(K_INST)||0; }catch(e){} if(Date.now()-last<14*86400000) return;
  if(isIOS()){ $('installText').textContent='Add Deepcore to your Home Screen to play full-screen and keep your progress safe: tap the Share button, then "Add to Home Screen".'; $('installBtn').hidden=true; box.hidden=false; A.track('install_hint_shown',{kind:'ios'}); }
  else if(deferredInstall){ $('installText').textContent='Install Deepcore for full-screen play and offline use.'; $('installBtn').hidden=false; box.hidden=false; A.track('install_hint_shown',{kind:'prompt'}); }
}
$('installClose').onclick=()=>{ try{ localStorage.setItem(K_INST,String(Date.now())); }catch(e){} $('installHint').hidden=true; A.track('install_hint_dismissed'); };
$('installBtn').onclick=async()=>{ if(!deferredInstall) return; deferredInstall.prompt(); try{ await deferredInstall.userChoice; }catch(e){} deferredInstall=null; $('installHint').hidden=true; };
window.addEventListener('beforeinstallprompt',()=>{ if(screen==='home'&&!$('homeMain').hidden) showInstallHintIfDue(); });
// ---- share ----
async function doShare(){
  const text=Meta.shareText({day:dayState.day,run:dayState,zone:ZONES[curZone()].name,tool:TOOLS[tool()].name,total:runScore(),streak:Meta.streakNow(life,dayState.day),fragments,url:location.origin+location.pathname.replace(/index\.html$/,'')});
  A.track('share',{boards:dayState.done.length,total:runScore()});
  if(navigator.share){ try{ await navigator.share({text}); return; }catch(e){ if(e&&e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(text); toast('Copied to your clipboard'); }catch(e){ window.prompt('Copy your result:',text); }
}
$('shareBtn').onclick=doShare; $('dayEndShare').onclick=doShare;
// ---- profile: rank, stats, records and the discovery log ----
let profTab='Stats';
function logIcon(e){
  const cv=document.createElement('canvas'); cv.width=cv.height=T; const x=cv.getContext('2d'); x.imageSmoothingEnabled=false;
  let src=null;
  if(e.kind==='mined') src=ITEM[e.id]||TEX[e.id]; else if(e.kind==='seen') src=SPR[e.id]||TEX[e.id]; else if(e.kind==='zones') src=TEX[ZONES[+e.id].rock==='stone'&&+e.id===0?'grass':ZONES[+e.id].rock];
  else { const m={gold_rush:'gold',ruby_rain:'ruby',gem_fever:'emerald',coal_seams:'coal'}[e.id]; src=m?ITEM[m]:TEX.treasure; }
  if(src) x.drawImage(src,0,0); return cv;
}
const PROF_TABS={
  Stats(b){
    const pts=life.points, rk=Meta.rankFor(pts), st=Meta.streakNow(life,dayState.day), deep=Math.max(life.records.deepest||0,curZone());
    const box=infoEl('div',undefined,'rankBox'); box.append(infoEl('div','Your rank','label'),infoEl('div',rk.name,'rankName'));
    const bar=infoEl('div',undefined,'rankBar'); bar.append(infoEl('div')); bar.firstChild.style.width=Math.round(rk.progress*100)+'%'; box.append(bar,infoEl('div',rk.next?`${rk.toNext.toLocaleString()} points to ${rk.next}`:'The highest rank',"fine")); b.append(box);
    const hero=infoEl('div',undefined,'heroTiles');
    [[pts.toLocaleString(),'Points'],[life.stars.toLocaleString(),'Stars'],[st,'Day streak']].forEach(([v,k])=>{ const d=infoEl('div',undefined,'stat'); d.append(infoEl('b',String(v)),infoEl('span',k)); hero.append(d); });
    b.append(hero,infoEl('h3','RECORDS'));
    const recs=infoEl('div',undefined,'recs'), icon=src=>{ const cv=document.createElement('canvas'); cv.width=cv.height=T; const x=cv.getContext('2d'); x.imageSmoothingEnabled=false; if(src) x.drawImage(src,0,0); return cv; };
    [[TEX[ZONES[deep].rock==='dirt'?'grass':ZONES[deep].rock],'Deepest layer',ZONES[deep].name.replace('The ','')],[ITEM.gold,'Best board',life.records.bestBoard.toLocaleString()],
     [ITEM.coal,'Longest streak of clears',life.records.bestCombo],[ITEM.iron,'Most lines at once',life.records.bestLines],[ITEM.wood,'Boards cleared',life.cleared.toLocaleString()],
     [ITEM.prismore,'Core fragments',fragments]].forEach(([src,k,v])=>{ const r=infoEl('div',undefined,'recRow'); r.append(icon(src),infoEl('span',k),infoEl('b',String(v))); recs.append(r); });
    b.append(recs);
  },
  Log(b){
    const total=Meta.LOG.length, got=Meta.LOG.filter(e=>Meta.discovered(life,e)).length;
    b.append(infoEl('p',`${got} of ${total} discovered. Mine, craft and dig deeper to fill the log.`));
    let group=''; let wrap=null;
    Meta.LOG.forEach(e=>{ if(e.group!==group){ group=e.group; b.append(infoEl('h3',group.toUpperCase())); wrap=infoEl('div',undefined,'logGrid'); b.append(wrap); }
      const have=Meta.discovered(life,e), it=infoEl('div',undefined,'logItem'+(have?'':' no')); it.append(logIcon(e),infoEl('span',have?e.name:'???'));
      if(have&&e.kind==='mined') it.append(infoEl('small',`×${(life.mined[e.id]||0).toLocaleString()}`)); wrap.append(it); });
  },
};
function renderProfile(tab){
  profTab=tab; const tabs=$('profTabs'); tabs.innerHTML='';
  Object.keys(PROF_TABS).forEach(t=>{ const bt=document.createElement('button'); bt.type='button'; bt.textContent=t==='Log'?'Discovery log':t; bt.setAttribute('role','tab'); bt.setAttribute('aria-selected',t===tab); bt.onclick=()=>{ A.track('profile_tab',{tab:t}); renderProfile(t); }; tabs.append(bt); });
  const body=$('profBody'); body.innerHTML=''; body.scrollTop=0; PROF_TABS[tab](body);
}
$('profileBtn').onclick=()=>{ renderProfile('Stats'); $('profile').hidden=false; A.track('profile_open'); };
$('profClose').onclick=()=>{ $('profile').hidden=true; };
(function homeStrip(){ const x=$('homeStrip').getContext('2d'); x.imageSmoothingEnabled=false;
  ['grass','stone','coal@stone','iron@deep','diamond@deep'].forEach((k,i)=>x.drawImage(TEX[k],i*16,0)); })();

// ---------- world map ----------
// One map per descent (see maps.js): the tunnels are fixed for the run, the surface weather changes every day.
// Boards open one after another; the first board of every layer also needs the right tools.
const isDone=i=>dayState.done.includes(i);
// stars earned in a layer, out of 3 per board (the Ancient Core has none)
function zoneStars(z){ const st=dayState.stars||{}; let got=0; for(let j=0;j<ZONES[z].boards;j++) got+=st[idxOf(z,j)]||0; return {got,max:ZONES[z].core?0:3*ZONES[z].boards}; }
const zoneStarText=z=>{ const s=zoneStars(z); return s.max?`★ ${s.got}/${s.max}`:''; };
const toolOk=i=>tool()>=toolNeeded(zoneOfIdx(i));
const unlocked=i=> i===0 || isDone(i) || (isDone(i-1) && (jOfIdx(i)!==0 || toolOk(i)));
const gateWaiting=i=> i>0 && jOfIdx(i)===0 && !isDone(i) && isDone(i-1) && !toolOk(i);
let MAP=null, mapKey='';
function mapState(){
  let maxY=5.4; MAP.nodes.forEach((n,i)=>{ if((unlocked(i)||gateWaiting(i))&&n.y>maxY) maxY=n.y; });
  return {dug:i=>unlocked(i), maxY, fragments};
}
const MOD=()=>modifierFor(dayState.day);
const curZone=()=>Math.min(ZONES.length-1,zoneOfIdx(Math.min(frontier(),BOARD_COUNT-1)));
// the run's stats in the map's top bar (F-14): stars earned of all there are, and every placement made this run
const runStarMax=()=>ZONES.reduce((a,z)=>a+(z.core?0:3*z.boards),0);
const runStarGot=()=>Object.values(dayState.stars||{}).reduce((a,b)=>a+(b||0),0);
const plStats=()=>dayState.pl||(dayState.pl={t:0,z:{},b:{}});
function updateMapDate(){ if(!dayState) return; $('runStars').innerHTML=`${runStarGot()}<small>/${runStarMax()}</small>`; $('runPlaced').textContent=plStats().t.toLocaleString();
  $('runStats').setAttribute('aria-label',`This run: ${runStarGot()} of ${runStarMax()} stars, ${plStats().t} placements`); }
// tap a layer's placements chip: its boards, with stars and placements for the cleared ones
function openZonePop(zi,chip){
  closeZonePop(); const z=ZONES[zi], pl=plStats(), pop=document.createElement('div'); pop.id='zonePop'; pop.className='zpop'; pop.setAttribute('role','dialog'); pop.setAttribute('aria-label',`${z.name}: boards and placements`);
  const cleared=Array.from({length:z.boards},(_,j)=>isDone(idxOf(zi,j))).filter(Boolean).length, f=frontier();
  const h=document.createElement('h3'); h.textContent=z.name; const sub=document.createElement('div'); sub.className='sub'; sub.innerHTML=`<b>${(pl.z[zi]||0).toLocaleString()}</b> placements so far · ${cleared} of ${z.boards} boards cleared`;
  pop.append(h,sub);
  for(let j=0;j<z.boards;j++){ const i=idxOf(zi,j), row=document.createElement('div'), st=(dayState.stars||{})[i]||0; row.className='zrow';
    const nm=document.createElement('span'); nm.textContent=`Board #${j+1}`; const stars=document.createElement('span'); stars.className='st'; const n=document.createElement('span'); n.className='n';
    if(isDone(i)){ stars.innerHTML='★'.repeat(st)+`<i>${'★'.repeat(3-st)}</i>`; n.textContent=pl.b[i]?pl.b[i].toLocaleString():'—'; }   // a dash: cleared before 2.4.0 counted placements
    else if(i===f&&unlocked(i)){ row.classList.add('cur'); n.textContent='NEXT'; } else { row.classList.add('lk'); n.textContent='—'; }
    row.append(nm,stars,n); pop.append(row); }
  $('map').append(pop); const r=chip.getBoundingClientRect(), top=Math.min(r.bottom+10,innerHeight-pop.offsetHeight-12);
  pop.style.top=Math.max(8,top)+'px'; pop.style.setProperty('--ax',Math.max(16,Math.min(r.left+r.width/2-16-7,pop.offsetWidth-30))+'px'); pop.classList.toggle('noarrow',top<r.bottom+10);
  A.track('zone_stats_open',{zone:zi});
}
function closeZonePop(){ const p=$('zonePop'); if(p) p.remove(); }
document.addEventListener('pointerdown',e=>{ if($('zonePop')&&!e.target.closest('#zonePop')&&!e.target.closest('.zchip')) closeZonePop(); },true);
function depthText(){ const f=frontier(); if(f>=BOARD_COUNT) return 'The Ancient Core'; const z=zoneOfIdx(f); return ZONES[z].core?'The Ancient Core':`${ZONES[z].name} · ${jOfIdx(f)}/${ZONES[z].boards} · ${zoneStarText(z)}`; }
function buildMap(){
  const key=dayState.seed+'|'+dayState.day; if(!MAP||mapKey!==key){ MAP=M.genMap(dayState.seed,dayState.day); mapKey=key; }
  const W=Math.min(window.innerWidth,520), ts=W/10;
  $('mapInner').style.width=W+'px'; $('mapInner').style.height=M.ROWS*ts+'px';
  M.drawMap($('mapCanvas'),ts,MAP,mapState(),TEX,Math.min(dpr,2));   // the map is tall: capped at 2x so phones can hold the canvas
  const nodes=$('mapNodes'); nodes.innerHTML='';
  ZONES.forEach((z,zi)=>{ if(zi>0&&!unlocked(Z_START[zi])&&!gateWaiting(Z_START[zi])) return; const lab=document.createElement('div'); lab.className='zlabel'; lab.textContent=z.name+(zoneStarText(zi)?'  '+zoneStarText(zi):''); lab.style.top=(M.ZONE_TOP[zi]+(zi===0?.4:.3))*ts+'px';
    if(!z.core){ const n=plStats().z[zi]||0, ch=document.createElement('button'); ch.type='button'; ch.className='zchip'; ch.innerHTML=`<b>${n.toLocaleString()}</b>placement${n===1?'':'s'}<span class="chev">›</span>`; ch.setAttribute('aria-label',`${z.name}: ${n} placements. Show its boards`);
      ch.onclick=e=>{ e.stopPropagation(); if($('zonePop')) closeZonePop(); else openZonePop(zi,ch); }; lab.append(document.createElement('br'),ch); }
    nodes.append(lab); });
  const sb=savedBoard(); let current=-1;
  const addNode=(i,pos)=>{ const b=document.createElement('button'); b.type='button'; b.className='node'; b.style.left=pos.x*ts+'px'; b.style.top=pos.y*ts+'px';
    if(i===CORE_IDX){ b.classList.add('core'); if(!isDone(i)&&current<0) current=i; b.append(iconOf(ITEM.portal)); b.setAttribute('aria-label','The Ancient Core'); }
    else if(gateWaiting(i)){ b.classList.add('gate'); if(current<0) current=i; b.append(iconOf(ITEM['tool_'+TOOLS[toolNeeded(zoneOfIdx(i))].id])); b.setAttribute('aria-label',`Board ${boardLabel(i)}, needs ${TOOLS[toolNeeded(zoneOfIdx(i))].name}`); }
    else { const done=isDone(i); if(done) b.classList.add('done'); else { b.classList.add('open'); if(current<0) current=i; }
      const st=(dayState.stars||{})[i]||0; b.innerHTML=done?`<span>✓</span>${st?`<i class="nstars">${'★'.repeat(st)}<em>${'★'.repeat(3-st)}</em></i>`:''}`:`<span>${jOfIdx(i)+1}</span>`; b.setAttribute('aria-label',`Board ${boardLabel(i)}${done?`, mined${st?`, ${st} star${st>1?'s':''}`:''}`:''}`); }
    if(sb&&sb.idx===i) b.classList.add('progress'); if(opts_.justDone===i) b.classList.add('fresh');
    b.onclick=()=>openCard(i); nodes.append(b); };
  let opts_=buildMap.opts||{};
  MAP.nodes.forEach((p,i)=>{ if(unlocked(i)||gateWaiting(i)) addNode(i,p); });
  updateMapDate();
  renderDock();
  $('mapBadge').hidden=!fragments; $('mapBadge').textContent='✦'.repeat(fragments); $('mapBadge').title=`Core fragments: ${fragments}`;
  return {current,sb};
}
function showMap(opts){
  if(screen==='game' && pieces && !opts.justDone){ saveBoard(); const dd=levelDef(level), tg=dd.target; A.track('board_leave',{idx:level-1,score,target:tg,pct:tg?Math.round(100*score/tg):0,moves,over,duration_ms:Math.round(performance.now()-boardT0)}); }
  checkDay(); show('map'); $('nodeCard').hidden=true; $('prospector').hidden=true; closeZonePop();
  buildMap.opts=opts; const {current,sb}=buildMap();
  const focusIdx = opts.justDone!==undefined ? Math.min(BOARD_COUNT-1,opts.justDone+1) : (sb?sb.idx:(current<0?Math.min(frontier(),BOARD_COUNT-1):current));
  const fp=MAP.nodes[focusIdx], ts=Math.min(window.innerWidth,520)/10;
  // iOS can leave a scroll area that was hidden unresponsive to taps until it is laid out again: rebuild its scrolling layer each time
  { const sc=$('mapScroll'); sc.style.overflowY='hidden'; void sc.offsetHeight;
    requestAnimationFrame(()=>{ sc.style.overflowY=''; void sc.offsetHeight; sc.scrollTop=Math.max(0,(fp?fp.y:6)*ts - sc.clientHeight/2); }); }
  // one message at a time: the tools broke, a missed day, a camp reached, or a new layer's tools to forge
  if(opts.broke) setTimeout(()=>mapNotice('broke'),500);
  else if(dayState.notice) setTimeout(()=>{ const n=dayState.notice; dayState.notice=null; saveDay(); mapNotice('missed',n); },500);
  else if(opts.camp) setTimeout(()=>mapNotice('camp',{camp:opts.camp}),600);
  else if(tourPending()) setTimeout(mapTour,700);
  else setTimeout(mapTips,600);
}
// the map's first-time tips: how the descent works, then what to do at the first locked layer
function mapTips(){ if(screen!=='map'||!$('prospector').hidden) return;
  const t=tool(), next=TOOLS[Math.min(t+1,TOOLS.length-1)], c=tcost(Math.min(t+1,TOOLS.length-1)), costTxt=Object.entries(c).map(([k,v])=>`${v} ${DROPS[k][0].toLowerCase()}`).join(' and ');
  if(tipOnce('map',()=>mapNotice('tip',{title:'Dig down',text:`Tap the glowing board to play it. Every board you clear digs the mine deeper. Each new layer needs better tools, forged in Craft from what you mine. Craft also makes the equipment and potions you carry on your belt.`,icon:ITEM.tool_branch}))) return;
  const f=frontier(); if(f<BOARD_COUNT&&gateWaiting(f)) tipOnce('gate',()=>mapNotice('tip',{title:`${next.name} needed`,text:`${ZONES[zoneOfIdx(f)].name} is too hard for your tools. Forge ${next.name} for ${costTxt}: tap the locked board, or Craft. Short of something? Replay boards you've cleared: replays give ore.`,icon:ITEM['tool_'+next.id]}));
}
function mapNotice(kind,n){
  const ic=$('pMedal').getContext('2d'); ic.clearRect(0,0,16,16);
  const set=(title,text,icon)=>{ $('pTitle').textContent=title; $('pText').textContent=text; $('pCount').textContent=''; if(icon) ic.drawImage(icon,0,0); $('prospector').hidden=false; };
  if(kind==='missed') set('The cave settled',`You missed a day, so ${n.lost} board${n.lost===1?'':'s'} in ${ZONES[n.zone].name} caved back in${n.camp?' (back to your camp)':''}. Your tools and stash are safe. Clear a board every day to keep your depth.`,ITEM.wood);
  if(kind==='tip') set(n.title,n.text,n.icon);
  if(kind==='camp') set('Camp made',`You made camp at the top of ${ZONES[n.camp].name}. If you miss a day, you'll only drop back to here.`,ITEM.wood);
  if(kind==='broke') set('Your tools shattered',`The Crust wore your Diamond tools down to nothing. You're back at the start of Magmastone with your tools patched to ${DUR_AFTER_BREAK}%. Mine prism ore to mend them, then try the Crust again.`,ITEM.tool_galaxy);
  [392,494,587].forEach((f,j)=>blip(f,.14,'triangle',.05,j*.1));
}
$('pOk').onclick=()=>{ $('prospector').hidden=true; };
function goalChips(g){ const wrap=document.createElement('div'); wrap.className='goals'; Object.entries(g).forEach(([k,v])=>{ const s=document.createElement('span'); s.title=DROPS[k][0]; s.append(iconOf(ITEM[k]),document.createTextNode(` ${v}`)); wrap.append(s); }); return wrap; }
function openCard(i){
  if(i===CORE_IDX&&unlocked(i)){ openCore(); return; }
  // one tap plays the next board (or resumes the one in progress); cleared, locked and gated boards open their card
  { const sb=savedBoard(); if(unlocked(i)&&!isDone(i)&&!gateWaiting(i)&&(!sb||sb.idx===i)){ A.track('board_card_open',{idx:i,label:boardLabel(i),quick:true}); show('game'); if(sb) restoreBoard(sb); else { clearBoardSave(); startBoard(i); } return; } }
  const z=zoneOfIdx(i), def=boardDef(i), card=$('nodeCard'), done=isDone(i), open=unlocked(i), gate=gateWaiting(i), sb=savedBoard();
  A.track('board_card_open',{idx:i,label:boardLabel(i),locked:!open&&!gate,gate,done}); if(!open&&!gate) A.attempt('locked_board',i);
  $('ncZone').textContent=`${def.zoneName} · Board ${boardLabel(i)}`;
  $('ncName').textContent=def.name;
  const g=$('ncGoals'); g.innerHTML='';
  const go=$('ncGo'), note=$('ncNote'); note.textContent=''; go.dataset.gate='';
  if(gate){
    const tier=toolNeeded(z), T0=TOOLS[tier], cost=tcost(tier), tgt=document.createElement('span'); tgt.className='tgt'; tgt.textContent=`Needs ${T0.name}`; g.append(tgt); g.append(costChips(cost));
    const can=canAfford({cost}), prevZ=z-1;
    go.disabled=false; go.textContent='Open Craft'; go.dataset.gate='craft';   // v2.5.0: tools are forged in Craft only, never from the board card
    note.textContent=can?`${ZONES[z].name} is too hard for your ${TOOLS[tool()].short.toLowerCase()} tools. You have what ${T0.name} cost: forge them in Craft.`
      :`${ZONES[z].name} is too hard for your ${TOOLS[tool()].short.toLowerCase()} tools. Forge ${T0.name} in Craft. Short of something? Replay boards in ${ZONES[prevZ].name} (replays give ore).`;
  } else {
    const tgt=document.createElement('span'); tgt.className='tgt'; tgt.textContent=`★ ${def.starAt.map(v=>v.toLocaleString()).join(' / ')}`; g.append(tgt);
    // v2.7.0: how much of each this board gives (from its rate per piece, today's twist included), most first, to help pick boards to farm
    { const rates={...def.orePer}; if(def.base&&def.base.log) rates.wood=1; const tier=v=>v>=.2?['Lots',3]:v>=.08?['Some',2]:v>=.025?['Few',1]:['Rare',0];
      const ab=document.createElement('div'); ab.className='abund'; ab.setAttribute('aria-label','What this board gives');
      Object.entries(rates).sort((a,b)=>b[1]-a[1]||stashOrder(a[0],b[0])).forEach(([res,v])=>{ const [word,n]=tier(v), it=document.createElement('span'); it.className='ab t'+n; it.title=`${DROPS[res][0]}: ${word.toLowerCase()}`;
        const pips=document.createElement('i'); pips.innerHTML='<b></b><b></b><b></b>'; [...pips.children].forEach((p,k)=>p.classList.toggle('on',k<n||(n===0&&k===0)));
        const nm=document.createElement('em'); nm.textContent=word; it.append(iconOf(ITEM[res]),pips,nm); ab.append(it); });
      g.append(ab); }
    { const tw=document.createElement('span'); tw.className='tgt twist'; tw.textContent=`Today: ${MOD().name}`; tw.title=MOD().desc; g.append(tw); }
    if(!open){ go.disabled=true; go.textContent='Locked'; note.textContent=`Mine board ${boardLabel(i-1)} first.`; }
    else { go.disabled=false; go.textContent=(sb&&sb.idx===i)?'Continue':done?'Mine again':'Mine this board';
      if(toolBreakable()&&z===CRUST_Z&&!done) note.textContent=`Crust rock wears your tools hard. Tools at ${Math.round(dayState.dur)}%; ${bank.prismore||0} prism ore in your stash to mend them at the Forge.`;
      if(done){ const st=(dayState.stars||{})[i]||1; note.textContent=`Mined · ${(dayState.scores[i]||0).toLocaleString()} points · ${'★'.repeat(st)}${'☆'.repeat(3-st)} · replays give ore`; }
      if(sb&&sb.idx!==i) note.textContent=`Starting this board ends your run on ${boardLabel(sb.idx)}.`; }
  }
  go.onclick=()=>{ $('nodeCard').hidden=true;
    if(gate){ openCraft('tool'); return; }
    const s2=savedBoard(); show('game');
    if(s2&&s2.idx===i){ restoreBoard(s2); } else { clearBoardSave(); startBoard(i); } };
  card.hidden=false;
}
// ---------- the Ancient Core: one piece, one spot, then the record and the credits ----------
let coreRaf=0, coreDone=false, coreT0=0, coreFlash=0;
function openCore(){
  A.track('core_open',{days:dayState.days,score:runScore()}); coreDone=false; coreFlash=0; coreT0=performance.now();
  $('core').hidden=false; $('coreTally').hidden=true; $('credits').hidden=true; $('coreHint').hidden=false;
  const pc=$('corePiece'); pc.hidden=false; pc.style.transform=''; pc.classList.remove('drag');
  { const x=pc.firstElementChild.getContext('2d'); x.clearRect(0,0,16,16); x.drawImage(ITEM.portal,0,0); }
  stopMusic(); [196,247,294,392].forEach((f,j)=>blip(f,.5,'sine',.05,j*.35));
  cancelAnimationFrame(coreRaf); const tick=now=>{ drawCoreScene(now); if(!$('core').hidden) coreRaf=requestAnimationFrame(tick); }; coreRaf=requestAnimationFrame(tick);
}
const coreSocket=()=>{ const cv=$('coreCv'), w=cv.clientWidth, h=cv.clientHeight, u=Math.min(w/10,h/16); return {x:w/2,y:h*.47-u*1.2,u,w,h}; };
function drawCoreScene(now){
  const cv=$('coreCv'), w=cv.clientWidth, h=cv.clientHeight, d=Math.min(dpr,2); if(cv.width!==Math.round(w*d)){ cv.width=Math.round(w*d); cv.height=Math.round(h*d); }
  const x=cv.getContext('2d'); x.setTransform(d,0,0,d,0,0); x.imageSmoothingEnabled=false;
  const S=coreSocket(), u=S.u, t=(now-coreT0)/1000;
  const bg=x.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#0c0614'); bg.addColorStop(.55,'#2a0d0a'); bg.addColorStop(1,'#5a1606'); x.fillStyle=bg; x.fillRect(0,0,w,h);
  // sparkling magma all around
  const sea=h*.62; for(let row=0;row*u*.5<h-sea;row++) for(let c=0;c*u*.5<w;c++){ const v=Math.sin(c*.9+t*1.3+row*.7)+Math.sin(row*1.3-t*.9+c*.3);
    x.fillStyle=['#6a1406','#a8260c','#e4481a','#ff7a1f','#ffb23a'][Math.max(0,Math.min(4,Math.floor((v+2)/4*5)))]; x.fillRect(c*u*.5,sea+row*u*.5,u*.5+1,u*.5+1); }
  for(let k=0;k<26;k++){ const sx=(k*97.3+Math.sin(t+k)*20)%w, sy=sea-u*.2+((k*53.1+t*40*(1+k%3))%(h-sea+u)); const a=.5+.5*Math.sin(t*4+k); x.fillStyle=k%3?`rgba(255,240,170,${a})`:`rgba(255,190,240,${a})`; x.fillRect(sx,sy,u*.18,u*.18); }
  // the temple: three stepped terraces, two pillars, a lintel, and the socket between them
  const cx=S.x, base=sea+u*.4;
  [[7.2,'#4a3a5a'],[5.8,'#5a4a6a'],[4.4,'#6a5a7c']].forEach(([wd,c],k)=>{ x.fillStyle=c; x.fillRect(cx-wd/2*u,base-(k+1)*u*.7,wd*u,u*.7); x.fillStyle='rgba(255,255,255,.12)'; x.fillRect(cx-wd/2*u,base-(k+1)*u*.7,wd*u,u*.12); });
  const top=base-u*2.1, ph=u*3.2; x.fillStyle='#7a6a8c'; x.fillRect(cx-2.1*u,top-ph,u*.6,ph); x.fillRect(cx+1.5*u,top-ph,u*.6,ph);
  x.fillStyle='#9d8db0'; x.fillRect(cx-2.6*u,top-ph-u*.35,5.2*u,u*.35); x.fillStyle='#5a4a6a'; x.fillRect(cx-2.3*u,top-ph-u*.6,4.6*u,u*.25);
  const pulse=.5+.5*Math.sin(t*2.4);
  const g=x.createRadialGradient(S.x,S.y,0,S.x,S.y,u*(coreDone?2.4+coreFlash*6:1.6)); g.addColorStop(0,`rgba(220,200,255,${coreDone?.95:.35+.25*pulse})`); g.addColorStop(1,'rgba(120,80,220,0)'); x.fillStyle=g; x.fillRect(S.x-u*8,S.y-u*8,u*16,u*16);
  if(!coreDone){ x.strokeStyle=`rgba(232,220,255,${.5+.5*pulse})`; x.lineWidth=2; x.setLineDash([u*.18,u*.12]); x.strokeRect(S.x-u*.6,S.y-u*.6,u*1.2,u*1.2); x.setLineDash([]); }
  else { const r=u*(.6+coreFlash*1.4); x.save(); x.translate(S.x,S.y); x.rotate(t*1.5); x.drawImage(ITEM.portal,-r,-r,r*2,r*2); x.restore();
    for(let k=0;k<12;k++){ const a=k/12*Math.PI*2+t; x.strokeStyle=`rgba(255,255,255,${.25*coreFlash})`; x.lineWidth=u*.12; x.beginPath(); x.moveTo(S.x,S.y); x.lineTo(S.x+Math.cos(a)*w,S.y+Math.sin(a)*w); x.stroke(); }
    if(coreFlash>.85){ x.fillStyle=`rgba(255,255,255,${(coreFlash-.85)/.15})`; x.fillRect(0,0,w,h); } }
}
{ const pc=$('corePiece'); let drag=null;
  pc.addEventListener('pointerdown',e=>{ if(coreDone) return; e.preventDefault(); unlockAudio(); const r=pc.getBoundingClientRect(); drag={dx:e.clientX-(r.left+r.width/2),dy:e.clientY-(r.top+r.height/2),x0:r.left+r.width/2,y0:r.top+r.height/2}; pc.classList.add('drag'); try{ pc.setPointerCapture(e.pointerId); }catch(_){} });
  pc.addEventListener('pointermove',e=>{ if(!drag) return; pc.style.transform=`translate(${e.clientX-drag.x0}px,${e.clientY-drag.y0-40}px)`; });
  const up=e=>{ if(!drag) return; const S=coreSocket(), cr=$('coreCv').getBoundingClientRect(), px=e.clientX, py=e.clientY-40; drag=null; pc.classList.remove('drag');
    if(Math.hypot(px-(cr.left+S.x),py-(cr.top+S.y))<S.u*1.6) placePortal(); else { pc.style.transition='transform .25s'; pc.style.transform=''; setTimeout(()=>pc.style.transition='',260); } };
  pc.addEventListener('pointerup',up); pc.addEventListener('pointercancel',()=>{ drag=null; pc.classList.remove('drag'); pc.style.transform=''; }); }
function placePortal(){
  coreDone=true; $('corePiece').hidden=true; $('coreHint').hidden=true; A.track('core_portal',{days:dayState.days});
  [262,330,392,523,659,784,1047,1319].forEach((f,j)=>blip(f,.6,'sine',.06,j*.18)); const t0=performance.now();
  const step=()=>{ coreFlash=Math.min(1,(performance.now()-t0)/(REDUCE?400:3600)); if(coreFlash<1) requestAnimationFrame(step); else setTimeout(showTally,REDUCE?100:500); }; requestAnimationFrame(step);
}
function runTally(){
  const res=Object.entries(dayState.mined||{}).filter(([k])=>STAR_ORES.includes(k)||k==='log'), resPts=res.reduce((a,[k,v])=>a+v*(VAL[k]||0),0);
  const stars=Object.values(dayState.stars||{}).reduce((a,b)=>a+b,0), boards=runScore();
  return {boards,resPts,stars,days:Math.max(1,dayState.days||1),total:boards+resPts};
}
function showTally(){
  const t=runTally(); $('coreTally').hidden=false;
  $('ctLine').textContent=`You reached the heart of the world in ${t.days} day${t.days===1?'':'s'}.`;
  const rows=$('ctRows'); rows.innerHTML=''; [['Board points',t.boards],['Ore and gems mined',t.resPts],['Stars earned',t.stars+' ★']].forEach(([k,v])=>{ const d=document.createElement('div'); d.innerHTML=`<span>${k}</span><b>${typeof v==='number'?v.toLocaleString():v}</b>`; rows.append(d); });
  $('ctTotal').textContent=t.total.toLocaleString(); $('ctName').value=life.lastName||'';
  A.track('run_complete',{total:t.total,days:t.days,stars:t.stars,fragments:fragments+1});
}
function tallyCard(){
  const t=runTally(), name=($('ctName').value||'Miner').trim().slice(0,18), c=document.createElement('canvas'); c.width=1080; c.height=1350; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  const g=x.createLinearGradient(0,0,0,1350); g.addColorStop(0,'#120a22'); g.addColorStop(1,'#4a1406'); x.fillStyle=g; x.fillRect(0,0,1080,1350);
  x.drawImage(ITEM.portal,390,120,300,300); x.textAlign='center'; x.fillStyle='#ffcf5c'; x.font=`96px ${FONT_D}`; x.fillText('Deepcore Blocks',540,540);
  x.fillStyle='#e8dcff'; x.font=`64px ${FONT_D}`; x.fillText('Reached the Ancient Core',540,630);
  x.font=`600 44px "Chakra Petch", sans-serif`; x.fillStyle='#ffffff'; x.fillText(name,540,740);
  x.fillStyle='#d6d8dd'; x.font=`500 38px "Chakra Petch", sans-serif`; x.fillText(`${t.days} days · ${t.stars} stars`,540,810);
  x.fillStyle='#ffcf5c'; x.font=`120px ${FONT_D}`; x.fillText(t.total.toLocaleString(),540,960);
  x.fillStyle='#d8c8ff'; x.font=`64px ${FONT_D}`; x.fillText('✦'.repeat(Math.min(5,fragments+1)),540,1080);
  x.fillStyle='#9a9da4'; x.font=`500 30px "Chakra Petch", sans-serif`; x.fillText(location.host+location.pathname.replace(/index\.html$/,''),540,1260);
  return c;
}
$('ctShare').onclick=async()=>{ const t=runTally(), name=($('ctName').value||'Miner').trim(); const text=`${name} reached the Ancient Core in Deepcore Blocks: ${t.total.toLocaleString()} points in ${t.days} days. ${'✦'.repeat(Math.min(5,fragments+1))}`;
  try{ const blob=await new Promise(r=>tallyCard().toBlob(r,'image/png')); const file=new File([blob],'deepcore-core.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],text}); return; }
    if(navigator.share){ await navigator.share({text,url:location.origin+location.pathname}); return; } await navigator.clipboard.writeText(text); toast('Copied to the clipboard'); }catch(e){} };
$('ctSave').onclick=()=>{ tallyCard().toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='deepcore-core.png'; document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); },'image/png'); A.track('core_download',{}); };
$('ctDone').onclick=()=>{ const t=runTally(), name=($('ctName').value||'Miner').trim().slice(0,18); life.lastName=name;
  life.hall=[...(life.hall||[]),{name,total:t.total,days:t.days,stars:t.stars,day:dayState.day}].slice(-10); life.runs=(life.runs||0)+1; life.records.bestRun=Math.max(life.records.bestRun||0,t.total);
  saveLife(); $('coreTally').hidden=true; rollCredits(); };
function rollCredits(){
  const legendary=fragments+1>=5, roll=$('credRoll');
  roll.innerHTML=`<div class="big">Deepcore Blocks</div><p>You reached the Ancient Core.</p>
    <h3>Design and direction</h3><p>Taylor's Bookshelf</p><h3>Built with</h3><p>Claude</p>
    <h3>Type</h3><p>Jersey 10 · Chakra Petch<br>(SIL Open Font License)</p><h3>Pixel art</h3><p>The Deepcore design system,<br>plus a few hand-placed pixels</p>
    <h3>Every block you placed</h3><p>${(life.cleared||0).toLocaleString()} boards cleared · ${(life.stars||0).toLocaleString()} stars</p>
    <h3>${legendary?'Legendary':'A fragment of the Core'}</h3><p>${legendary?'Five times to the heart of the world. There is nothing deeper.':'Something small comes back up with you.'}</p>
    <div class="big" style="margin-top:40px">${'✦'.repeat(Math.min(5,fragments+1))}</div><p style="margin-top:30px">Thanks for digging.</p>`;
  $('credits').hidden=false; const t0=performance.now(), dur=REDUCE?8000:60000;
  const step=now=>{ if($('credits').hidden) return; const k=Math.min(1,(now-t0)/dur), H=roll.offsetHeight+$('credits').clientHeight; roll.style.transform=`translateY(${-k*H}px)`; if(k<1) requestAnimationFrame(step); else finishRun(); };
  requestAnimationFrame(step);
}
$('credSkip').onclick=()=>finishRun();
// the descent starts again on the grass, with a core fragment (up to five) as the only sign you have been there before
function finishRun(){
  if($('core').hidden) return; $('credits').hidden=true; $('core').hidden=true; cancelAnimationFrame(coreRaf);
  fragments=Math.min(5,fragments+1); if(fragments>=5) life.seen.legendary=true;
  dayState=freshRun(todayKey()); saveDay(); bank={}; hand={}; specials=[]; saveProfile(); clearBoardSave(); renderDock(); updateStash(); MAP=null;
  A.track('run_reset',{fragments}); showHome();
}
$('ncClose').onclick=()=>{ $('nodeCard').hidden=true; };
$('mapHome').onclick=showHome;

// ---------- drag ----------
let drag=null;
slots.forEach(s=>s.addEventListener('pointerdown',e=>{
  const i=+s.dataset.i; if(over||busy||uiOpen()||!pieces||!pieces[i]) return;
  e.preventDefault(); unlockAudio();
  // a piece still gliding back to its slot must reappear now: cancelling that glide used to leave its slot looking empty until tapped
  clearTimeout(returnTimer); slots.forEach(sl=>{ sl.firstElementChild.style.opacity=''; }); ghost.style.transition=''; if(!tut.active) clearHint();
  const p=pieces[i]; drag={i,p,touch:e.pointerType!=='mouse',target:null,t0:performance.now(),x0:e.clientX,y0:e.clientY,moved:0,raw:null};
  { const cr=s.firstElementChild.getBoundingClientRect(); drag.cx=cr.left+cr.width/2; drag.cy=cr.top+cr.height/2; drag.k0=(trayCell+2)/cell; }
  const gw=p.w*cell-SEAM, gh=p.h*cell-SEAM; ghost.width=Math.round(gw*dpr); ghost.height=Math.round(gh*dpr); ghost.style.width=gw+'px'; ghost.style.height=gh+'px';
  gx.setTransform(dpr,0,0,dpr,0,0); gx.clearRect(0,0,gw,gh); drawPiece(gx,p,cell,0,0,1,bs);
  ghost.hidden=false; s.firstElementChild.style.opacity='0'; moveDrag(e);
}));
// pick-up animation: the piece grows from its tray size to board size while gliding from its slot to your finger (140ms)
let returnTimer=0;
function placeGhost(now){
  if(!drag||drag.tx===undefined) return;
  const k=easeOut(Math.min(1,Math.max(0,(now-drag.t0)/140)));
  const sx=drag.cx-drag.gw/2, sy=drag.cy-drag.gh/2;
  ghost.style.transform=`translate(${sx+(drag.tx-sx)*k}px,${sy+(drag.ty-sy)*k}px) scale(${drag.k0+(1-drag.k0)*k})`;
}
function moveDrag(e){
  if(!drag) return;
  // on touch the whole piece rides above the fingertip (bottom edge ~1 cell clear), centred on it, so both hands see all of it
  const p=drag.p;
  const gw=p.w*cell-SEAM, gh=p.h*cell-SEAM, gxp=e.clientX-gw/2, gyp=drag.touch ? e.clientY-cell*1.15-gh : e.clientY-gh/2;
  drag.tx=gxp; drag.ty=gyp; drag.gw=gw; drag.gh=gh; placeGhost(performance.now());
  const b=boardC.getBoundingClientRect();
  const c0=Math.round((gxp-b.left)/cell), r0=Math.round((gyp-b.top)/cell);
  drag.target = fitsAt(p,r0,c0) ? {r0,c0} : null; ghost.style.opacity=drag.target?'.3':'1'; drag.raw={r0,c0}; drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0));
}
window.addEventListener('pointermove',moveDrag);
function endDrag(cancelled){
  if(!drag) return; const d=drag; drag=null;
  // tutorial steps: only the glowing spot takes the piece; anything else glides back with a nudge (a stray drop used to stall the tutorial)
  if(d.target&&cancelled!==true&&tutorBlocks(d.i,d.target)){ flyBack(d); tutorNudge(); A.track('tutorial_off_target',{slot:d.i,r:d.target.r0,c:d.target.c0,step:tut.placed}); return; }
  if(d.target&&cancelled!==true){ ghost.hidden=true; ghost.style.opacity='1'; slots[d.i].firstElementChild.style.opacity=''; place(d.i,d.target.r0,d.target.c0); return; }
  flyBack(d);
  if(cancelled===true){ A.track('drag_cancel',{sid:d.p.sid,touch:d.touch,drag_ms:Math.round(performance.now()-d.t0)}); return; }
  // released without a valid spot: a tap, a miss that was one cell away, or a drop outside the board
  const {r0,c0}=d.raw||{r0:0,c0:0}; let near=false;
  for(let dr=-1;dr<=1&&!near;dr++)for(let dc=-1;dc<=1&&!near;dc++) if(fitsAt(d.p,r0+dr,c0+dc)) near=true;
  const off=r0<-1||c0<-1||r0>N-d.p.h+1||c0>N-d.p.w+1;
  const kind=d.moved<10?'piece_tap':'drop_invalid';
  A.track(kind,{sid:d.p.sid,slot:d.i,touch:d.touch,reason:kind==='piece_tap'?'tap':off?'off_board':'blocked',near_valid:near,fits_somewhere:canPlaceAnywhere(d.p),r:r0,c:c0,drag_ms:Math.round(performance.now()-d.t0)});
  A.attempt('drop',d.p.sid+'@'+Math.round(r0/2)+','+Math.round(c0/2),{reason:off?'off_board':'blocked',near_valid:near});
}
// a piece that was not placed glides back into its slot and shrinks to tray size
function flyBack(d){
  const cv=slots[d.i].firstElementChild, ms=REDUCE?1:190;
  ghost.style.opacity='1'; ghost.style.transition=`transform ${ms}ms cubic-bezier(.3,.7,.3,1)`;
  ghost.style.transform=`translate(${d.cx-d.gw/2}px,${d.cy-d.gh/2}px) scale(${d.k0})`;
  returnTimer=setTimeout(()=>{ ghost.hidden=true; ghost.style.transition=''; ghost.style.opacity='1'; cv.style.opacity=''; },ms+20);
}
window.addEventListener('pointerup',()=>endDrag()); window.addEventListener('pointercancel',()=>endDrag(true));

// ---------- render ----------
function drawSpecialGlow(ctx,x,y,cs,m,now,seed,glow){
  const [c1,c2]=FX[m];
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x+cs/2,y+cs/2,cs*.1,x+cs/2,y+cs/2,cs*.85);
  g.addColorStop(0,hexA(c1,0)); g.addColorStop(.55,hexA(c1,(40+60*glow)/255)); g.addColorStop(1,hexA(c2,0));
  ctx.fillStyle=g; ctx.fillRect(x-cs*.35,y-cs*.35,cs*1.7,cs*1.7);
  const step=Math.floor(now/260);
  for(let k=0;k<3;k++){
    const h=Math.sin(seed*13.7+k*91.3+step*7.1)*43758.5453, fr=h-Math.floor(h);
    const h2=Math.sin(seed*3.1+k*17.9+step*3.3)*12345.678, fr2=h2-Math.floor(h2);
    const sx=x+cs*(.1+.8*fr), sy=y+cs*(.1+.8*fr2), sz=Math.max(2,cs/16), life=1-((now/260)%1);
    ctx.fillStyle=`rgba(255,255,240,${.9*life})`; ctx.fillRect(sx-sz/2,sy-sz*1.5,sz,sz*3); ctx.fillRect(sx-sz*1.5,sy-sz/2,sz*3,sz);
  }
  ctx.restore();
  ctx.strokeStyle=`rgba(255,226,140,${glow})`; ctx.lineWidth=2; ctx.strokeRect(x+1,y+1,cs-2,cs-2);
}
function outlinePiece(ctx,p,ox,oy,pitch,size,color,w){
  const set=new Set(p.cells.map(([r,c])=>r+','+c)); ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineJoin='round'; ctx.beginPath();
  p.cells.forEach(([r,c])=>{ const x=ox+c*pitch, y=oy+r*pitch;
    if(!set.has((r-1)+','+c)){ ctx.moveTo(x,y); ctx.lineTo(x+size,y); } if(!set.has((r+1)+','+c)){ ctx.moveTo(x,y+size); ctx.lineTo(x+size,y+size); }
    if(!set.has(r+','+(c-1))){ ctx.moveTo(x,y); ctx.lineTo(x,y+size); } if(!set.has(r+','+(c+1))){ ctx.moveTo(x+size,y); ctx.lineTo(x+size,y+size); } });
  ctx.stroke(); ctx.restore();
}
// ---- hint: costs a little coal, glows the tray piece and outlines where the best placement is for a few seconds ----
let hintFlying=false;
const HINT_COST=5;   // v2.1.1: was 3; coal piles up over a descent
function clearHint(){ hintInfo=null; if(typeof slots!=='undefined') slots.forEach(sl=>sl.classList.remove('hint')); }
function updateHintBtn(){ const b=$('hintBtn'); if(!b) return; const off=!((bank.coal||0)>=HINT_COST&&!busy&&!over&&!hintFlying&&pieces&&pieces.some(Boolean)&&screen==='game'); if(b.disabled!==off) b.disabled=off; b.title=`Hint (${HINT_COST} coal)`; }
// asks first; on yes the coal flies from the stash into the Hint button, and the hint shows when the last piece lands
async function askHint(){
  if(busy||over||uiOpen()||!pieces||hintFlying) return;
  if((bank.coal||0)<HINT_COST){ showCombo(`A hint costs ${HINT_COST} coal`); return; }
  if(!await ask(`Use a hint for ${HINT_COST} coal?`,`You have ${bank.coal} coal. The best move glows for a few seconds.`,'Use hint')) return;
  if(busy||over||uiOpen()||!pieces||(bank.coal||0)<HINT_COST) return;
  hintFlying=true; bank.coal-=HINT_COST; saveProfile();
  const from=document.querySelector('.si[data-k="coal"] canvas')||$('stash'), to=$('hintBtn');
  let landed=0; const n=REDUCE?1:HINT_COST;
  for(let q=0;q<n;q++) flyBetween(ITEM.coal,from,to,q*70,'#ffd27a',()=>{ if(q===0) updateStash(['coal']); blip(700+q*90,.05,'sine',.04);
    if(++landed===n){ hintFlying=false; to.classList.remove('gulp'); void to.offsetWidth; to.classList.add('gulp'); useHint(true); } });
}
function useHint(paid){
  if(busy||over||(!paid&&uiOpen())||!pieces) return;
  if(!paid){ if((bank.coal||0)<HINT_COST){ showCombo(`A hint costs ${HINT_COST} coal`); return; } bank.coal-=HINT_COST; updateStash(['coal']); saveProfile(); }
  const [lo,hi]=occBits(grid), ranked=rankMoves(lo,hi,pieces.map(p=>p?SHAPES[p.sid]:null)); if(!ranked.length) return;
  const best=ranked[0]; clearHint();
  hintInfo={i:best.i,r0:best.pl.r0,c0:best.pl.c0}; slots[best.i].classList.add('hint'); updateHintBtn(); blip(988,.08,'triangle',.05); blip(1319,.1,'triangle',.05,.08);
  life.hints++; A.track('hint_used',{idx:level-1,score,moves,sid:pieces[best.i].sid,lines:best.nb[2]}); setTimeout(()=>{ if(hintInfo&&hintInfo.i===best.i) clearHint(); },4500);
}
$('hintBtn').onclick=askHint;
// ---- guided first board: a scripted first set that fills the bottom row, with the glowing hint and short captions ----
const tut={active:false,stage:0,placed:0}, TUT_SET=['###','###','##'], TUT_TARGETS=[[7,0],[7,3],[7,6]];
function showTutor(text,withNext){ $('tutorText').textContent=text; $('tutorNext').hidden=!withNext; $('tutor').style.top='calc(max(env(safe-area-inset-top,0px),14px) + 54px)'; $('tutor').hidden=false; }
function tutorHintFor(i){ const t=TUT_TARGETS[i]; if(!t||!pieces||!pieces[i]||!fitsAt(pieces[i],t[0],t[1])) return false; hintInfo={i,r0:t[0],c0:t[1]}; slots.forEach(sl=>sl.classList.remove('hint')); slots[i].classList.add('hint'); return true; }
function tutorStart(){ tut.active=true; tut.placed=0; showTutor('Drag a piece from the tray onto the glowing spot.',false); tutorHintFor(0); A.track('tutorial_start',{part:'board'}); }
function tutorFinish(skipped){ if(!tut.active&&life.tutorialDone) return; tut.active=false; life.tutorialDone=true; if(!life.tips) life.tips={}; life.tips.tour=1; saveLife(); $('tutor').hidden=true; if(coachSteps){ $('coach').hidden=true; coachSteps=null; coachEndFn=null; } clearHint(); A.track(skipped?'tutorial_skip':'tutorial_complete',{placed:tut.placed}); }
function tutorAfterPlace(n){
  if(!tut.active) return; tut.placed++;
  if(n>0){ $('tutor').hidden=true; clearHint(); setTimeout(()=>{ if(tut.active&&screen==='game') boardTour(); },500); return; }
  const next=tut.placed;   // the scripted pieces go in slot order; the slots they leave are refilled
  if(next<3&&tutorHintFor(next)) showTutor(tut.placed===1?'Nice! Fill the rest of the bottom row.':'One more piece completes the row.',false);
  else { clearHint(); showTutor('Fill a whole row or a whole column to clear it.',false); }
}
const tutorBlocks=(i,t)=>tut.active&&!!hintInfo&&(i!==hintInfo.i||t.r0!==hintInfo.r0||t.c0!==hintInfo.c0);
function tutorNudge(){ showTutor('Not there: drag the glowing piece onto the glowing spot.',false); $('tutor').classList.remove('nudge'); void $('tutor').offsetWidth; $('tutor').classList.add('nudge'); blip(220,.08,'triangle',.05); }
$('tutorNext').onclick=()=>tutorFinish(false); $('tutorSkip').onclick=async()=>{ if(await ask('Skip the tutorial?','You can replay it any time from the Guide or Settings.','Skip','Keep going')) tutorFinish(true); };
// ---------- the guided tour (v2.5.0): on the first play, the map, the belt and Craft, then board 1-1 hands-on, then the board's parts ----------
// coach(steps): each step spotlights one element ({sel, text, before, after}); Skip asks first. Replayable from the Guide and Settings.
let coachSteps=null, coachI=0, coachEndFn=null;
function coach(steps,onEnd){ coachSteps=steps; coachI=0; coachEndFn=onEnd; $('coach').hidden=false; coachShow(); }
function coachShow(){
  const st=coachSteps[coachI]; if(st.before) st.before();
  $('coachStep').textContent=`${st.group||'TUTORIAL'} · ${coachI+1} OF ${coachSteps.length}`; $('coachText').textContent=st.text; $('coachNext').textContent=st.next||(coachI===coachSteps.length-1?'Done':'Next');
  const place=()=>{ const el=st.sel&&document.querySelector(st.sel), hole=$('coachHole'), card=$('coachCard'); $('coach').classList.toggle('dim',!el);
    if(el){ const r=el.getBoundingClientRect(), pad=6; hole.style.left=(r.left-pad)+'px'; hole.style.top=(r.top-pad)+'px'; hole.style.width=(r.width+2*pad)+'px'; hole.style.height=(r.height+2*pad)+'px';
      const below=r.top+r.height/2<innerHeight/2; card.style.top=below?Math.min(innerHeight-card.offsetHeight-12,r.bottom+pad+14)+'px':''; card.style.bottom=below?'':Math.min(innerHeight-card.offsetHeight-12,innerHeight-r.top+pad+14)+'px'; }
    else { card.style.top='50%'; card.style.bottom=''; card.style.transform='translateY(-50%)'; }
    if(el) card.style.transform=''; };
  requestAnimationFrame(()=>requestAnimationFrame(place));
  A.track('tour_step',{group:st.group||'',i:coachI});
}
function coachEnd(skipped){ $('coach').hidden=true; const fn=coachEndFn; coachSteps=null; coachEndFn=null; if(fn) fn(skipped); }
$('coachNext').onclick=()=>{ if(!coachSteps) return; const st=coachSteps[coachI]; if(st.after) st.after(); coachI++; if(coachI>=coachSteps.length) coachEnd(false); else coachShow(); };
$('coachSkip').onclick=async()=>{ if(!coachSteps) return; if(await ask('Skip the tutorial?','You can replay it any time from the Guide or Settings.','Skip','Keep going')){ const st=coachSteps[coachI]; if(st.after) st.after(); coachEnd(true); } };
window.addEventListener('resize',()=>{ if(coachSteps) coachShow(); });
const tourPending=()=>!life.tutorialDone&&!(life.tips||{}).tour;
function mapTour(){
  if(screen!=='map'||coachSteps) return; if(!life.tips) life.tips={}; life.tips.tour=1; life.tips.map=1; life.tips.craft=1; saveLife(); A.track('tutorial_start',{part:'map'});
  const first=()=>document.querySelector('#mapNodes .node.open')?'#mapNodes .node.open':'#mapNodes .node';
  coach([
    {group:'THE MINE',sel:first(),text:'Welcome to Deepcore! Each circle is a board. Clear boards to dig down through seven layers of rock to the Ancient Core.'},
    {group:'THE MINE',sel:'#runStats',text:'Up here: the stars you have earned this run, and every piece you have placed.'},
    {group:'THE MINE',sel:'.zchip',text:'Each layer counts its placements too. Tap a layer\'s chip to see its boards and their stars.'},
    {group:'YOUR BELT',sel:'#mapBeltSlots',text:'This is your belt: the special items you carry into a board. You start with one slot; more open as you earn stars.'},
    {group:'CRAFT',sel:'#mapCraft',text:'Craft makes everything: better tools to open the next layer, mining equipment and potions. Nothing can be made during a board, so pack your belt first.'},
    {group:'CRAFT',sel:'.toolrow',before:()=>{ if($('craftPanel').hidden) openCraft(); },text:'Your tools: each layer needs the next ones. They cost ore you mine on the boards.'},
    {group:'CRAFT',sel:'#craftBody .ci[data-id="drill"]',text:'Tap any row to make it (it asks first). What you make goes straight onto your belt.',after:()=>{ $('craftClose').onclick(); }},
    {group:'THE MINE',sel:first(),text:'Let\'s dig! Your first board shows you the basics.',next:'Start board 1'},
  ],skipped=>{ if(skipped){ tutorFinish(true); return; } if(screen==='map'){ const sb=savedBoard(); show('game'); if(sb&&sb.idx===0) restoreBoard(sb); else { clearBoardSave(); startBoard(0); } } });
}
function boardTour(){
  coach([
    {group:'SCORING',sel:'#goalsBar',text:'Every block placed and every line cleared scores points. Points fill the three stars on the right.'},
    {group:'SCORING',sel:'#nextBox',text:'NEXT is the piece that replaces the one you place. Look at it before you choose: it helps you plan.'},
    {group:'SCORING',sel:'#boardWell',text:'Clear 2, 3 or 4 lines with one piece for a combo, and clear on back-to-back placements for a streak. That is how you reach three stars.'},
    {group:'HAULING',sel:'#stash',text:'Ore and gems you mine are your haul: the green +numbers. They pay for tools and items in Craft.'},
    {group:'HAULING',sel:'#cartBar',text:'Once you have a star the mine cart lights up: tap it to haul out and keep everything. Keep mining for more stars, but the longer a board runs, the trickier the pieces get. If the cave caves in, you lose the board and its haul.'},
    {group:'YOUR BELT',sel:'#dock',text:'Your belt: the items you crafted ride here. Drag a Star Drill to an edge of the board, a Blast Charge onto it, or a Sledgehammer to reshuffle it. Tap a potion to drink it.'},
    {group:'HELP',sel:'#hintBtn',text:'Stuck? Hint shows a good move for 5 coal. The Guide next to it explains everything, and can replay this tutorial.'},
    {group:'YOUR TURN',sel:null,text:'That\'s it! Score your first star, then tap the mine cart to haul out.',next:'Let\'s go'},
  ],skipped=>tutorFinish(skipped));
}
// replay from the Guide or Settings: board 1-1 is replayed (any board in progress elsewhere is given up, after asking)
async function replayTutorial(){
  const sb=savedBoard(); if(sb&&sb.idx!==0&&!await ask('Replay the tutorial?',`It plays board 1-1, which ends your board ${boardLabel(sb.idx)} in progress.`,'Replay','Cancel')) return;
  if(sb&&sb.idx!==0) clearBoardSave(); life.tutorialDone=false; if(!life.tips) life.tips={}; life.tips.tour=0; saveLife(); A.track('tutorial_replay');
  $('info').hidden=true; homeView('homeMain'); showMap({});
}
let looping=false;
function ensureLoop(){ if(!looping){ looping=true; requestAnimationFrame(render); } }
function render(now){
  if(screen!=='game' && !fxList.length && !fxParts.length && !particles.length){ looping=false; fx.setTransform(dpr,0,0,dpr,0,0); fx.clearRect(0,0,innerWidth,innerHeight); return; }
  now=now||0;
  const px=cell*N; bx.setTransform(dpr,0,0,dpr,0,0); bx.imageSmoothingEnabled=false; bx.clearRect(0,0,px,px);
  const pv = drag&&drag.target ? drag.target : null;
  const hl = pv ? previewLines(drag.p,pv.r0,pv.c0) : new Set();
  const glow=.45+.35*Math.sin(now/220), specials=[]; const scr=scrAnim;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const m0=grid[r][c], x=c*cell, y=r*cell; bx.fillStyle='#35383d'; bx.fillRect(x,y,bs,bs);
    const m = (scr && scr.targets.has(r*N+c)) ? null : m0;
    if(m){ bx.drawImage(texOf(m),x,y,bs,bs); overlayGlow(bx,m,x,y,bs,now,dpr);
      if(MATS[m].kind==='special') specials.push([x,y,m,r,c]);
      if(hl.has(r*N+c)){ bx.fillStyle='rgba(255,230,170,.28)'; bx.fillRect(x,y,bs,bs); } }
  }
  specials.forEach(([x,y,m,r,c])=>drawSpecialGlow(bx,x,y,bs,m,now,r*N+c,glow));
  if(fuse){ const q=(now-fuse.t0)/420, x=fuse.c*cell, y=fuse.r*cell, s=cell*(1+.15*Math.sin(now/30)*q);
    bx.save(); bx.globalCompositeOperation='lighter'; const g=bx.createRadialGradient(x+cell/2,y+cell/2,0,x+cell/2,y+cell/2,cell*(1+q*1.4));
    g.addColorStop(0,`rgba(255,240,180,${.5+.5*q})`); g.addColorStop(1,'rgba(255,120,30,0)'); bx.fillStyle=g; bx.fillRect(x-cell*2,y-cell*2,cell*5,cell*5); bx.restore();
    bx.drawImage(TEX.blast,x+cell/2-s/2,y+cell/2-s/2,s,s); }
  if(boardFlash){ const q=(now-boardFlash.t0)/350; if(q>=1) boardFlash=null; else {
    bx.fillStyle=`rgba(255,230,160,${.7*(1-q)})`; bx.fillRect((boardFlash.c-1)*cell,(boardFlash.r-1)*cell,cell*3,cell*3); } }
  if(scr){ const t=Math.min(1,(now-scr.t0)/scr.D), e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    scr.moves.forEach(mv=>{ const x=(mv.fc+(mv.tc-mv.fc)*e)*cell, y=(mv.fr+(mv.tr-mv.fr)*e)*cell-Math.sin(Math.PI*t)*cell*.6*mv.lift;
      bx.drawImage(texOf(mv.m),x,y,bs,bs); });
    if(t>=1) scrAnim=null; }
  if(pv){ const pu=.75+.25*Math.sin(now/110);
    if(hl.size){ bx.fillStyle='rgba(255,226,110,.34)'; bx.strokeStyle=`rgba(255,250,200,${pu})`; bx.lineWidth=3;
      hl.forEach(k=>{ const r=Math.floor(k/N), c=k%N; bx.fillRect(c*cell,r*cell,bs,bs); bx.strokeRect(c*cell+2,r*cell+2,bs-4,bs-4); }); }
    bx.fillStyle='rgba(255,238,170,.4)'; drag.p.cells.forEach(([r,c])=>bx.fillRect((pv.c0+c)*cell,(pv.r0+r)*cell,bs,bs));
    drawPiece(bx,drag.p,cell,pv.c0*cell,pv.r0*cell,.92,bs);
    outlinePiece(bx,drag.p,pv.c0*cell,pv.r0*cell,cell,bs,'#000',Math.max(6,cell*.16));
    outlinePiece(bx,drag.p,pv.c0*cell,pv.r0*cell,cell,bs,`rgba(255,250,215,${pu})`,Math.max(3,cell*.08)); }
  if(spAim){ const pu3=.55+.45*Math.sin(now/120); bx.fillStyle=spAim.m==='blast'?`rgba(255,120,40,${.28*pu3})`:`rgba(160,190,220,${.18*pu3})`;
    if(spAim.m==='blast'){ for(let a2=spAim.r-1;a2<=spAim.r+1;a2++)for(let b2=spAim.c-1;b2<=spAim.c+1;b2++) if(a2>=0&&b2>=0&&a2<N&&b2<N) bx.fillRect(b2*cell,a2*cell,bs,bs);
      bx.strokeStyle=`rgba(255,200,90,${pu3})`; bx.lineWidth=Math.max(2,cell*.06); bx.strokeRect(Math.max(0,spAim.c-1)*cell,Math.max(0,spAim.r-1)*cell,(Math.min(N-1,spAim.c+1)-Math.max(0,spAim.c-1)+1)*cell-SEAM,(Math.min(N-1,spAim.r+1)-Math.max(0,spAim.r-1)+1)*cell-SEAM); }
    else if(spAim.m==='drill'){ bx.fillStyle=`rgba(255,226,140,${.3*pu3})`; const row=spAim.line==='row', k=spAim.k;
      for(let j=0;j<N;j++) bx.fillRect((row?j:k)*cell,(row?k:j)*cell,bs,bs);
      bx.strokeStyle=`rgba(255,226,140,${pu3})`; bx.lineWidth=Math.max(2,cell*.06); bx.strokeRect(row?0:k*cell,row?k*cell:0,row?N*cell-SEAM:bs,row?bs:N*cell-SEAM); }
    else bx.fillRect(0,0,N*cell-SEAM,N*cell-SEAM); }
  if(hintInfo&&pieces&&pieces[hintInfo.i]){ const hp=pieces[hintInfo.i], pu2=.6+.4*Math.sin(now/180);
    bx.fillStyle=`rgba(255,207,92,${.2*pu2})`; hp.cells.forEach(([r,c])=>bx.fillRect((hintInfo.c0+c)*cell,(hintInfo.r0+r)*cell,bs,bs));
    drawPiece(bx,hp,cell,hintInfo.c0*cell,hintInfo.r0*cell,.4,bs); outlinePiece(bx,hp,hintInfo.c0*cell,hintInfo.r0*cell,cell,bs,`rgba(255,207,92,${pu2})`,Math.max(3,cell*.08)); }
  flashes=flashes.filter(f=>(f.life-=.06)>0);
  flashes.forEach(f=>{ bx.fillStyle=`rgba(255,240,200,${f.life*.7})`; bx.fillRect(f.c*cell,f.r*cell,bs,bs); });
  particles=particles.filter(q=>(q.life-=.022)>0);
  particles.forEach(q=>{ q.x+=q.vx; q.y+=q.vy; q.vy+=.35; bx.globalAlpha=Math.min(1,q.life*1.5); bx.fillStyle=q.col; bx.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s); });
  if(drag) placeGhost(now);
  bx.globalAlpha=1; tickScore(); renderFx(now); requestAnimationFrame(render);
}

// ---------- boot ----------
// Save format changes between versions. v2: granite zone added (boards renumbered) and cinnabar became ruby.
const SCHEMA=7;
function migrate(){
  let v=0; try{ v=+(localStorage.getItem('deepcore-schema')||0); }catch(e){}
  if(v>=SCHEMA) return;
  const p=lsGet(K_PROFILE);
  if(p&&p.crafted&&!p.specials){ const list=[]; Object.entries(p.crafted).forEach(([m,n])=>{ for(let k=0;k<(n||0);k++) list.push(m==='jackhammer'?'sledgehammer':m); }); p.specials=list.slice(0,3); delete p.crafted; lsSet(K_PROFILE,p); }
  if(p&&p.bank){ if(p.bank.cinnabar){ p.bank.ruby=(p.bank.ruby||0)+p.bank.cinnabar; } delete p.bank.cinnabar; lsSet(K_PROFILE,p); }
  // v4: the daily map became one long descent. Everyone starts a fresh run on the grass (lifetime profile, log and settings are kept).
  if(v<4){ lsDel('deepcore-day'); lsDel(K_DAY); lsDel(K_BOARD); if(p){ p.bank={}; p.specials=[]; lsSet(K_PROFILE,p); } }
  else { const b=lsGet(K_BOARD); if(b){ const fix=m=>m==='jackhammer'?'sledgehammer':m; b.grid=b.grid.map(r=>r.map(m=>m&&fix(m))); b.pieces=(b.pieces||[]).map(p=>p&&{...p,mats:p.mats.map(fix)}); b.undo=null; lsSet(K_BOARD,b); } }
  // v5 (2.1.0): every layer has 8 boards (was 4, 6, 6, 6, 6, 30, 3). The run keeps its depth: layers above the one you were in are
  // cleared, that layer keeps the same share of its boards, and stars and points move to the matching new board. Tools work again.
  if(v===4){ const d=lsGet(K_DAY); if(d&&Array.isArray(d.done)){
    const OLD=[4,6,6,6,6,30,3,1], OS=[]; let n=0; OLD.forEach((b,i)=>{ OS[i]=n; n+=b; });
    const zOf=i=>{ let z=0; while(z+1<OLD.length&&i>=OS[z+1]) z++; return z; };
    const conv=i=>{ const z=zOf(i), j=i-OS[z]; return Z_START[z]+(OLD[z]>1?Math.round(j*(ZONES[z].boards-1)/(OLD[z]-1)):0); };
    const had=new Set(d.done); let f=0; while(had.has(f)) f++;
    const fz=f>=n?OLD.length:zOf(f), share=fz<OLD.length?(f-OS[fz])/OLD[fz]:1, done=[];
    ZONES.forEach((z,i)=>{ const k=i<fz?z.boards:i===fz?Math.floor(share*z.boards):0; for(let j=0;j<k;j++) done.push(Z_START[i]+j); });
    const remap=o=>{ const out={}; Object.entries(o||{}).forEach(([k,v])=>{ const nk=conv(+k); out[nk]=Math.max(out[nk]||0,v); }); return out; };
    d.done=done; d.stars=remap(d.stars); d.scores=remap(d.scores); d.attempts=remap(d.attempts); d.fails={}; d.camp=0; d.dur=DUR_MAX;
    d.campsMade=ZONES.map((z,i)=>i).filter(i=>i>0&&!ZONES[i].core&&done.includes(Z_START[i]));
    lsSet(K_DAY,d); } lsDel(K_BOARD); }
  // v6 (2.2.0, F-10): equipment and potion slots. Anyone holding a potion keeps potion-making: their run gets the brewing table.
  // Specials beyond the new slots go back to the stash as their ore (fitDock, at boot).
  if(v>=4&&v<6){ const p6=lsGet(K_PROFILE), d6=lsGet(K_DAY);
    if(p6&&d6&&(p6.specials||[]).some(m=>m==='rescue'||m==='luck')){ d6.wk={...(d6.wk||{}),table:1}; lsSet(K_DAY,d6); } }
  // v7 (2.4.0, F-13/F-14): one shared belt replaces the equipment and potion slots (the profile's list becomes belt slots at boot, in
  // fitDock); a run that had built a second equipment or potion slot gets belt slot 2. Boards in progress are endless now: their
  // old piece count and ore budget are dropped, the board carries on.
  if(v>=4&&v<7){ const d7=lsGet(K_DAY); if(d7&&d7.wk&&(d7.wk.equip2||d7.wk.potion2)){ d7.wk.belt2=1; delete d7.wk.equip2; delete d7.wk.potion2; lsSet(K_DAY,d7); } }
  try{ localStorage.removeItem('deepcore-mode'); localStorage.setItem('deepcore-schema',String(SCHEMA)); }catch(e){}
}
function start(){
  window.__dcReady=true;
  migrate(); loadSettings(); loadLife(); applyDisplaySettings(); setSoundUI(); loadProfile(); checkDay(); fitDock(); buildStash(); renderDock(); updateLuckUI();
  grid=emptyGrid(); pieces=null; showHome();
  layout(); drawTray(); ensureLoop();
  if(document.fonts&&document.fonts.load) Promise.all(['20px "Jersey 10"','600 16px "Chakra Petch"'].map(f=>document.fonts.load(f))).catch(()=>{});
}
// Test hooks exist only when the page is served from this machine with ?debug; they are never exposed on a published site.
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname) && /[?&]debug\b/.test(location.search)) window.__deepcore={TEX,MATS,ITEM,test:{
  place:(i,r,c)=>place(i,r,c), state:()=>({reached,reachScore,clearBonus,decided,hintInfo,combo,sinceClear,grid,pieces,score,busy,over,bank,hand,luck,luckLive,specials,crafted:Object.fromEntries(RECIPES.map(r=>[r.m,dockCount(r.m)])),moves,dodgeUsed,dealt,screen,level,dayState}),
  fits:(p,r,c)=>fitsAt(p,r,c), setCell:(r,c,m)=>{grid[r][c]=m;}, setPieces:(ps)=>{pieces=ps; drawTray();},
  give:(b)=>{Object.assign(bank,b); updateStash();}, def:()=>levelDef(level), start:(i)=>{show('game'); startBoard(i);},
  setScore:(v)=>{score=v;}, bar:()=>{ shown=score; updateBar(); }, deals:()=>({dealt:dealtN,moves,next:nextPiece,grace:levelDef(level).grace,wild:wildOf(moves,levelDef(level).grace,levelDef(level).ramp),diff:levelDef(level).diff}), dodge:()=>luckyDodge(), canDodge:()=>canDodge(), setMoves:(n)=>{ moves=n; updateBar(); }, pl:()=>({...plStats(),shapes:dayState.shapes||{},life:life.shapes||{}}), cart:()=>{ $('cartBar').onclick(); }, leave:()=>{ if(starsNow()>=1&&!reached) reachTarget(); }, openCraft:(f)=>openCraft(f), beltTap:(i)=>beltTap(i), belt:()=>specials.slice(), zonePop:(z)=>openZonePop(z,document.querySelectorAll('.zchip')[z]||document.body), setNext:(p)=>{ nextPiece=p; drawTray(); }, tickPotions:(n=1)=>{ for(let k=0;k<n;k++) tickPotions(); }, setCollected:(o)=>{collected=o;}, collected:()=>collected, tickDay:()=>refreshIfNewDay(), fx:()=>({fxList:fxList.length,fxParts:fxParts.length,particles:particles.length}), setDayRaw:(d)=>{ dayState.day=d; saveDay(); }, musicOn:()=>!!(music&&music.isOn()), life:()=>life, settings:()=>settings, tut:()=>tut, fillHome:()=>fillHome(), showHome:()=>showHome(), resetText:()=>Meta.resetText(), share:()=>doShare(), reach:()=>reachTarget(), hint:()=>useHint(), mod:()=>modifierFor(dayState.day), tcost:(t)=>tcost(t), addSpecial:(m)=>{ const i=specials.findIndex((v,k)=>!v&&k<beltCap()); if(i>=0) specials[i]=m; else specials[beltCap()-1]=m; renderDock(); }, tilt:()=>mercyTilt(), practice:()=>practice, previewDay:(d)=>{ dayState.day=d; buildMap(); }, setTool:(t,dur)=>{ dayState.tool=t; if(dur!==undefined) dayState.dur=dur; saveDay(); }, run:()=>dayState, forge:(t)=>forgeTool(t), mend:()=>mendTools(), settle:()=>{ settle(dayState.day); saveDay(); }, setRun:(o)=>{ Object.assign(dayState,o); saveDay(); }, frontier:()=>frontier(), openCore:()=>openCore(), placePortal:()=>placePortal(), fragments:(n)=>{ if(n!==undefined){ fragments=n; saveProfile(); } return fragments; }, markDone:(a)=>{ dayState.done=a.slice(); saveDay(); }, openMap:()=>showMap({}), buildMap:()=>buildMap(), mapInfo:()=>({maxY:mapState().maxY,map:MAP}), newDay:(d)=>{ const s0=lsGet(K_DAY); if(s0){ s0.day=d; lsSet(K_DAY,s0); } checkDay(); }, history:()=>({}), setBank:(b)=>{ bank=b; updateStash(); }, craftTool:(t)=>forgeTool(t),    allClearBonus, gameOver:()=>gameOver(), giveHand:(h)=>{Object.assign(hand,h); updateStash();}, drink:(m)=>drinkPotion(m||'luck'), workshop:(id)=>{ if(id){ const w=WORKSHOP[id]; if(w&&!wk()[id]){ wk()[id]=1; saveDay(); renderDock(); } } return {...wk()}; }, build:(id)=>buildWorkshop(id), fitDock:()=>fitDock(), potions:()=>({luck,luckLive,prot,protLive}), deal:()=>dealSet(), complete:()=>{ if(!reached){ reached=true; reachScore=score; decided=false; } if(starsNow()<1) score=Math.max(score,starAt()[0]); bankBoard(); }, result:()=>showResult(), retry:()=>retryBoard(), audioState:()=>ac?ac.state:'none',
}};
start();
})();
