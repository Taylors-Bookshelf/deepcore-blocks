(function(){
const N = 8, T = 16;
const A = window.DCA || { track(){}, attempt(){}, setScreen(){}, setBoard(){}, isOn:()=>false, canConfigure:()=>false, setOptOut(){} };
const FONT_D = '"Silkscreen", "Courier New", monospace';

// ---------- texture helpers (procedural, original 16×16 pixel art) ----------
function rng(seed){ let s = seed>>>0 || 1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
function hex(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
function shade(rgb,f){ return rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*f)))); }

// palettes ordered dark → light
const PAL = {
  stone:   ['#656565','#717171','#7c7c7c','#878787','#939393'],
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
  deep:    {kind:'base', gen:'deep',   drop:'deep'},
  ember:   {kind:'base', gen:'ember',  drop:'ember'},
  obsidian:{kind:'base', gen:'obsidian', drop:'obsidian'},
  // ores — drawn on the level's host rock (stone, deep stone or ember rock)
  coal:    {kind:'ore', style:'blob',  ore:'#1e1e1e', hi:'#6e6e6e', dk:'#0a0a0a', rimDark:'#b3aca0', drop:'coal'},
  copper:  {kind:'ore', style:'blob',  ore:'#f08a3c', hi:'#ffc896', dk:'#2fbf9a', drop:'copper'},
  cinnabar:{kind:'ore', style:'blob',  ore:'#ff2e2e', hi:'#ffb0a0', dk:'#a01010', drop:'cinnabar'},
  iron:    {kind:'ore', style:'fleck', ore:'#e3cdb8', hi:'#ffffff', dk:'#9a8070', drop:'iron'},
  gold:    {kind:'ore', style:'fleck', ore:'#ffd21a', hi:'#fff6b0', dk:'#d27a00', spark:'#ffffff', drop:'gold'},
  // gems
  diamond: {kind:'gem', cut:'brilliant', ore:'#7fe8ff', hi:'#ffffff', facets:{X:'#0e3446',L:'#ffffff',H:'#c2f4ff',M:'#5cc8ee',D:'#2a86b8'}, drop:'diamond'},
  emerald: {kind:'gem', cut:'step', ore:'#22c25a', hi:'#b6ffc9', facets:{X:'#05301a',L:'#c8ffd6',H:'#4fe07f',M:'#17a64a',D:'#0a6a2c'}, drop:'emerald'},
  // special blocks — ultra-rare, Medium and up; trigger when their line clears
  blast:   {kind:'special', gen:'blast',    drop:null, name:'Blast charge',    pts:250},
  prism:   {kind:'special', gen:'prism',    drop:null, name:'Prism stone',       pts:400},
  fossil:  {kind:'special', gen:'fossil',   drop:null, name:'Fossil',          pts:1000},
  treasure:{kind:'special', gen:'treasure', drop:null, name:'Buried treasure', pts:0},
  jackhammer:{kind:'special', gen:'jackhammer', drop:null, name:'Jackhammer', pts:300},
  rescue:{kind:'potion', gen:'rescue', drop:null, name:'Rescue Potion', pts:0},
};
// Rarity: p = chance per piece that the piece carries this ore/gem · vein = cells it fills (always touching)
// Ore rarity: chance per piece that it carries this ore, and how many touching cells the vein fills.
// Emeralds and diamonds are handled per zone (rates and per-board caps live with the zones).
const ORES = {
  coal:{p:.16, vein:[1,2]}, copper:{p:.14, vein:[1,2]}, cinnabar:{p:.11, vein:[1,2]}, iron:{p:.06, vein:[1,2]}, gold:{p:.04, vein:[1,1]},
};
// Points for mining each block: deeper rock is worth more, ore far more, gems most
const VAL = { grass:2, log:2, dirt:2, sand:2, stone:4, deep:6, obsidian:8, ember:10,
  coal:15, copper:20, iron:30, cinnabar:30, gold:50, emerald:150, diamond:200 };
// Specials: per-piece chance by difficulty tier, and how often each type is picked
const SPECIAL_RATE = {Easy:0, Medium:.01, Hard:.02, Expert:.03};
const SPECIAL_MIX = {prism:.4, fossil:.32, treasure:.28}; // random-only specials; blast, jackhammer and rescue are craft-only

const DROPS = {
  dirt:['Dirt','dirt'], sand:['Sand','sand'], wood:['Wood','log'], stone:['Stone','stone'], deep:['Deep stone','deep'],
  ember:['Ember rock','ember'], obsidian:['Obsidian','obsidian'],
  coal:['Coal','coal'], copper:['Copper','copper'], cinnabar:['Cinnabar','cinnabar'], iron:['Iron','iron'], gold:['Gold','gold'], diamond:['Diamond','diamond'], emerald:['Emerald','emerald'],
};
const FX = {
  grass:['#5e9c37','#6a4b35'], dirt:['#79573d','#5b402d'], sand:['#ddd2a3','#cbbf8d'], log:['#5a4427','#3b2b17'],
  stone:['#7c7c7c','#656565'], deep:['#4a4a51','#36363d'], obsidian:['#43325e','#a98ad8'], ember:['#88312e','#561818'],
  blast:['#ffd23f','#ff6a1f'], prism:['#ff6ad5','#6ae3ff'], fossil:['#fbf3dc','#c6a066'], treasure:['#ffe36a','#f5c93c'], jackhammer:['#ffd23f','#9fb4cc'], rescue:['#ff6a9a','#ffd0e0'],
};
Object.entries(MATS).forEach(([k,m])=>{ if(!FX[k]) FX[k]=[m.ore,m.hi]; });

const NUGGETS = [
  [[0,0],[1,0],[0,1],[1,1]], [[1,0],[0,1],[1,1],[2,1],[1,2]], [[0,0],[1,0],[2,0],[1,1]],
  [[0,0],[1,0],[1,1],[2,1]], [[0,0],[0,1],[1,1]], [[1,0],[0,1],[1,1],[2,1]],
];
const ANCHORS = [[2,2],[9,1],[5,6],[11,7],[1,10],[7,11],[12,12]];

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
function makeTex(key, seedN, rock){
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
    if(rk==='stone'){ cluster('stone',.6); for(let n=0;n<6;n++){ const i=Math.floor(r()*14), j=Math.floor(r()*16); px(i,j,hex('#5d5d5d')); px(i+1,j,hex('#5d5d5d')); } }
    else if(rk==='deep'){ cluster('deep',.5); for(let j=1;j<T;j+=4) for(let i=0;i<T;i++) if(r()<.55) px(i,j,shade(get(i,j),.78)); }
    else if(rk==='obsidian'){ cluster('obsidian',.55);
      for(let n=0;n<5;n++){ let i=Math.floor(r()*T), j=Math.floor(r()*T); for(let s=0;s<4;s++){ px(i,j,hex(s===0?'#a98ad8':'#7a5cad')); i=(i+1)%T; j=(j+(r()<.5?1:0))%T; } } }
    else { cluster('ember',.5);
      for(let n=0;n<4;n++){ let i=Math.floor(r()*T), j=Math.floor(r()*T); for(let s=0;s<5;s++){ px(i,j,hex('#3e0f0f')); i=(i+(r()<.6?1:0))%T; j=(j+1)%T; } }
      for(let n=0;n<6;n++) px(Math.floor(r()*T),Math.floor(r()*T),hex('#b14a3c')); }
  };
  const DARK_ROCK = rock==='deep'||rock==='ember'||rock==='obsidian';
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
    case 'stone': case 'deep': case 'ember': case 'obsidian': rockBase(gen); break;
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
        const S = m.cut==='brilliant'
          ? ['.XXXXX.','XLHLHMX','XHHHMMX','.XHMMX.','..XMX..','...X...']
          : ['.XXXX.','XLLHHX','XLHHMX','XHHMMX','XHMMDX','XMMDDX','.XXXX.'];
        const spots = m.cut==='brilliant' ? [[1,2],[8,8]] : [[2,1],[9,8]];
        spots.forEach(([a,b])=>{ // dark socket shadow under each stone
          S.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(ch!=='.') px(a+i+1,b+j+1,shade(get(a+i+1,b+j+1),.55)); }));
          gem(S,m.facets,a,b); });
        sparkle(spots[0][0]+1,spots[0][1]+1,'#ffffff',m.facets.H);
        px(13,2,hex('#ffffff')); px(3,13,hex(m.facets.H));
      } else {
        inclusions(m.style||'blob', {ore:m.ore,hi:m.hi,dk:m.dk,spark:m.spark, rim:(m.rimDark&&DARK_ROCK)?m.rimDark:null});
      }
      break;
    case 'prism': {
      // night-violet rock with one big rainbow crystal
      const bg=['#140b26','#1b1031','#22153d','#2b1b4a'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.min(3,Math.floor((r()*.5+(1-Math.hypot(i-7.5,j-7.5)/11)*.7)*4))]);
      const hsl=(h,s,l)=>{ const a=s*Math.min(l,1-l), f=n=>{ const k=(n+h/30)%12; return l-a*Math.max(-1,Math.min(k-3,9-k,1)); }; return [f(0),f(8),f(4)].map(v=>Math.round(v*255)); };
      for(let j=0;j<T;j++)for(let i=0;i<T;i++){
        const dx=(i-7.5)/5.2, dy=(j-8)/7; const q=Math.abs(dx)+Math.abs(dy);
        if(q<1){ const facet=Math.floor((Math.atan2(dy,dx)+Math.PI)/(Math.PI/3));
          const h=(facet*60+j*6)%360, l=.5+.25*(1-q)-(dx+dy)*.08;
          px(i,j,hsl(h,.95,Math.max(.35,Math.min(.88,l)))); }
        else if(q<1.16) px(i,j,hex('#f2e8ff'));
      }
      for(let j=3;j<9;j++) px(6,j,hex('#ffffff'));
      sparkle(2,3,'#ffffff','#c9b4ff'); sparkle(13,12,'#ffffff','#9fe8ff'); px(12,3,hex('#ffffff')); px(3,12,hex('#ffd6f5'));
      break; }
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
    case 'jackhammer': {
      // pneumatic jackhammer: T-handle, yellow body, steel chisel bit
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
    case 'rescue': {
      // round glass flask with rose liquid and a cork
      const bg=['#1a1020','#20142a','#261832'].map(hex);
      for(let j=0;j<T;j++)for(let i=0;i<T;i++) px(i,j,bg[Math.floor(r()*3)]);
      for(let i=6;i<10;i++){ px(i,1,hex('#a8743c')); px(i,2,hex('#7a4f24')); }
      for(let j=3;j<6;j++){ px(6,j,hex('#cfe6ee')); px(9,j,hex('#8fb0bc')); px(7,j,hex('#e8f6fb')); px(8,j,hex('#bcd8e2')); }
      for(let j=5;j<15;j++) for(let i=2;i<14;i++){ const d=Math.hypot(i-7.5,j-9.5); if(d>5.6) continue;
        let col = d>4.9 ? '#cfe6ee' : j<8 ? '#3a2a44' : (d<2.4?'#ff9ab8':(i+j)%5===0?'#ff4f86':'#ff6a9a');
        px(i,j,hex(col)); }
      px(5,8,hex('#ffffff')); px(5,9,hex('#ffffff')); px(6,7,hex('#ffffff'));
      px(9,10,hex('#ffe0ea')); px(7,12,hex('#ffe0ea')); px(10,12,hex('#ffd0e0'));
      [[2,3],[13,4]].forEach(([a,b])=>{ px(a,b,hex('#ffffff')); px(a+1,b,hex('#ffb0c8')); px(a-1,b,hex('#ffb0c8')); px(a,b+1,hex('#ffb0c8')); px(a,b-1,hex('#ffb0c8')); });
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
  for(let i=0;i<T;i++){ px(i,0,shade(get(i,0),1.12)); px(0,i,shade(get(0,i),1.12)); px(i,T-1,shade(get(i,T-1),.68)); px(T-1,i,shade(get(T-1,i),.68)); }
  x.putImageData(img,0,0);
  return c;
}
const TEX = {};
Object.keys(MATS).forEach((k,i)=>{
  const m=MATS[k];
  if(m.kind==='ore'||m.kind==='gem') ['stone','deep','ember','obsidian'].forEach(rk=>TEX[k+'@'+rk]=makeTex(k,i,rk));
  else TEX[k]=makeTex(k,i);
});
const SLOT = (()=>{ const c=document.createElement('canvas'); c.width=c.height=T; const x=c.getContext('2d'); const r=rng(42);
  const pal=['#352c24','#31281f','#392f26','#2d251d'];
  for(let j=0;j<T;j++)for(let i=0;i<T;i++){ x.fillStyle=pal[Math.floor(r()*4)]; x.fillRect(i,j,1,1); }
  x.fillStyle='#4a3e33'; x.fillRect(0,0,T,1); x.fillRect(0,0,1,T);
  x.fillStyle='#17110c'; x.fillRect(0,T-1,T,1); x.fillRect(T-1,0,1,T); return c; })();

// ---------- tiers ----------
const tierOf=d=> d<.2?'Easy' : d<.5?'Medium' : d<.8?'Hard' : 'Expert';
const texOf=m=> (MATS[m].kind==='ore'||MATS[m].kind==='gem') ? TEX[m+'@'+levelDef(level).rock] : TEX[m];

// ---------- shapes & bitboards ----------  // CORE-START
// Board = two 32-bit ints: lo holds rows 0–3, hi holds rows 4–7 (bit = row*8+col).
const SHAPE_STRS=['#','##','#/#','###','#/#/#','####','#/#/#/#','#####','#/#/#/#/#','##/##','###/###/###','###/###','##/##/##',
 '#./##','.#/##','##/#.','##/.#',
 '#../#../###','..#/..#/###','###/#../#..','###/..#/..#',
 '#./#./##','.#/.#/##','##/#./#.','##/.#/.#','###/#..','###/..#','#../###','..#/###',
 '###/.#.','.#./###','#./##/#.','.#/##/.#',
 '##./.##','.##/##.','#./##/.#','.#/##/#.',
 '#./.#','.#/#.'];
const NB=8;
function pc(x){ x=x-((x>>>1)&0x55555555); x=(x&0x33333333)+((x>>>2)&0x33333333); return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24; }
const ROWM=[0,1,2,3].map(r=>((0xFF<<(r*8))>>>0));
const COLM=[0,1,2,3,4,5,6,7].map(c=>((0x01010101<<c)>>>0));
function bitOf(r,c){ return r<4 ? [((1<<(r*8+c))>>>0),0] : [0,((1<<((r-4)*8+c))>>>0)]; }
function getBit(lo,hi,r,c){ return r<4 ? (lo>>>(r*8+c))&1 : (hi>>>((r-4)*8+c))&1; }
const SHAPES=SHAPE_STRS.map((str,id)=>{
  const cells=[]; str.split('/').forEach((row,r)=>[...row].forEach((ch,c)=>{ if(ch==='#') cells.push([r,c]); }));
  let h=0,w=0; cells.forEach(([r,c])=>{h=Math.max(h,r+1);w=Math.max(w,c+1);});
  const key=cells.map(([r,c])=>r+','+c).sort().join(';');
  const inS=new Set(cells.map(([r,c])=>r+','+c));
  const pl=[];
  for(let r0=0;r0<=NB-h;r0++)for(let c0=0;c0<=NB-w;c0++){
    let lo=0,hi=0,nlo=0,nhi=0,border=0,nbN=0; const seen=new Set();
    cells.forEach(([r,c])=>{ const [a,b]=bitOf(r0+r,c0+c); lo|=a; hi|=b; });
    cells.forEach(([r,c])=>{ [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
      const R=r0+r+dr, C=c0+c+dc;
      if(inS.has((r+dr)+','+(c+dc))) return;
      if(R<0||C<0||R>=NB||C>=NB){ border++; return; }
      const k=R*8+C; if(seen.has(k)) return; seen.add(k); nbN++; const [a,b]=bitOf(R,C); nlo|=a; nhi|=b; }); });
    pl.push({lo:lo>>>0,hi:hi>>>0,nlo:nlo>>>0,nhi:nhi>>>0,border,nbN,r0,c0});
  }
  const unusual = cells.length>=4 && h>1 && w>1 && cells.length!==h*w;
  return {id,cells,h,w,n:cells.length,key,pl,unusual};
});
const SHAPE_BY_KEY={}; SHAPES.forEach(s=>SHAPE_BY_KEY[s.key]=s);
const CHECK3=SHAPES.filter(s=>['###','#/#/#','#./##','##/##'].includes(SHAPE_STRS[s.id]));

function applyMove(lo,hi,mlo,mhi){
  lo=(lo|mlo)>>>0; hi=(hi|mhi)>>>0; let cl=0,ch=0,lines=0;
  for(let r=0;r<4;r++){ const m=ROWM[r]; if(((lo&m)>>>0)===m){ cl|=m; lines++; } if(((hi&m)>>>0)===m){ ch|=m; lines++; } }
  for(let c=0;c<8;c++){ const m=COLM[c]; if(((lo&m)>>>0)===m && ((hi&m)>>>0)===m){ cl|=m; ch|=m; lines++; } }
  return [(lo&~cl)>>>0,(hi&~ch)>>>0,lines];
}
// empty cells walled in on all four sides (blocks or board edge)
function countHoles(lo,hi){
  let n=0;
  for(let r=0;r<NB;r++)for(let c=0;c<NB;c++){
    if(getBit(lo,hi,r,c)) continue;
    if((r===0||getBit(lo,hi,r-1,c)) && (r===NB-1||getBit(lo,hi,r+1,c)) && (c===0||getBit(lo,hi,r,c-1)) && (c===NB-1||getBit(lo,hi,r,c+1))) n++;
  }
  return n;
}
const hasLockedHole=(lo,hi)=>countHoles(lo,hi)>0;
// a board the player can keep going from: no new locked holes and room for a small piece
function healthy(lo,hi,baseHoles){
  if(countHoles(lo,hi)>baseHoles) return false;
  for(const s of CHECK3) for(const p of s.pl) if(!(lo&p.lo) && !(hi&p.hi)) return true;
  return false;
}
// Count the ways a set of pieces can all be placed (any order, with line clears between placements).
// Also reports the most lines any solution clears and whether the set can wipe the board.
function solveCount(lo,hi,set,cap,budget,needHealthy,ordered){
  let count=0,nodes=0,maxLines=0,allClear=false; const baseHoles=needHealthy?countHoles(lo,hi):0;
  const rec=(lo,hi,rem,lines)=>{
    if(!rem.length){ if(!needHealthy||(lo===0&&hi===0)||healthy(lo,hi,baseHoles)){ count++; if(lines>maxLines) maxLines=lines; } return; }
    const seen={};
    for(let i=0;i<rem.length;i++){
      const s=rem[i]; if(seen[s.id]) continue; seen[s.id]=1;
      const rest=rem.slice(0,i).concat(rem.slice(i+1));
      const moves=ordered?[]:null;
      for(const p of s.pl){
        if((lo&p.lo)||(hi&p.hi)) continue;
        if(++nodes>budget) return;
        const nb=applyMove(lo,hi,p.lo,p.hi); if(nb[0]===0&&nb[1]===0) allClear=true;
        if(ordered) moves.push(nb); else { rec(nb[0],nb[1],rest,lines+nb[2]); if(nodes>budget||count>=cap) return; }
      }
      if(ordered){ moves.sort((x,y)=>y[2]-x[2]); for(const nb of moves){ rec(nb[0],nb[1],rest,lines+nb[2]); if(nodes>budget||count>=cap) return; } }
    }
  };
  rec(lo>>>0,hi>>>0,set,0);
  return {count,exhausted:nodes>budget,maxLines,allClear};
}
// Shapes the open board is "asking for": exact enclosed pockets, and snug fits
function pocketInfo(lo,hi){
  const boost=SHAPES.map(()=>1), exact=new Set();
  const seen=new Uint8Array(64);
  for(let r=0;r<NB;r++)for(let c=0;c<NB;c++){
    if(getBit(lo,hi,r,c)||seen[r*8+c]) continue;
    const comp=[], st=[[r,c]]; seen[r*8+c]=1;
    while(st.length){ const [a,b]=st.pop(); comp.push([a,b]);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{ const A=a+dr,B=b+dc; if(A<0||B<0||A>=NB||B>=NB||seen[A*8+B]||getBit(lo,hi,A,B)) return; seen[A*8+B]=1; st.push([A,B]); }); }
    if(comp.length>=2 && comp.length<=9){
      const mr=Math.min(...comp.map(x=>x[0])), mc=Math.min(...comp.map(x=>x[1]));
      const s=SHAPE_BY_KEY[comp.map(([a,b])=>(a-mr)+','+(b-mc)).sort().join(';')];
      if(s){ exact.add(s.id); boost[s.id]*= s.unusual?10:6; }
    }
  }
  SHAPES.forEach(s=>{ if(s.n<3||exact.has(s.id)) return; let bestR=0;
    for(const p of s.pl){ if((lo&p.lo)||(hi&p.hi)) continue;
      const ratio=(p.border+pc(lo&p.nlo)+pc(hi&p.nhi))/(p.border+p.nbN); if(ratio>bestR) bestR=ratio; }
    if(bestR>=.85) boost[s.id]*= s.unusual?3:2; });
  return {boost,exact};
}
// CORE-END

// ---------- state ----------
let dealt={}, grid, pieces, score=0, combo=0, sinceClear=0, over=false, busy=false, level=1, collected={}, shownCol={}, since={};
let bank={}, crafted={}, moves=0, prospector=0, boardT0=0, lastAct=0;
// Difficulty setting: shifts every board's difficulty, starter blocks and goal sizes
const MODES=[
  {name:'Casual',    dMul:.6, dAdd:0,  pre:.5,  goals:.8, desc:'Gentle boards. The dealer helps a lot, fewer starter blocks, lower score targets. Never feels hopeless.'},
  {name:'Committed', dMul:1,  dAdd:0,  pre:1,   goals:1,  desc:'The intended curve: generous forest boards that tighten steadily until the deep zones demand planning.'},
  {name:'Hardened',  dMul:.8, dAdd:.2, pre:1.3, goals:1.2,desc:'Tighter from the start. Little dealer help, more starter blocks, higher score targets. The Underworld is unforgiving.'},
];
let mode=1; try{ const raw=localStorage.getItem('deepcore-mode'); if(raw!==null && ['0','1','2'].includes(raw)) mode=+raw; }catch(e){}

// ---------- daily world map: 5 zones × 4 boards, regenerated every Pacific-time day ----------
const ZONES=[
  {name:'The Forest', rock:'stone', d:[0,.12], pre:[0,1], mixes:[{log:1,grass:1},{log:.7,grass:1,dirt:.5},{log:.5,dirt:2,grass:.6},{dirt:1}], ores:[], target:300,
   names:['Birch Glade','Mossy Hollow','Fern Ridge','Old Stump','Sandy Bank','Pine Clearing','Root Cellar','Brook Bend']},
  {name:'Stone Caves', rock:'stone', d:[.16,.34], pre:[2,4], mixes:[{dirt:1,stone:1},{stone:2,dirt:.8},{stone:3,dirt:.5},{stone:6,dirt:.25}], ores:['coal','iron','copper'], target:700,
   names:['Echo Tunnel','Coal Face','Drip Gallery','Lantern Shaft','Granite Bend','Bat Roost','Iron Seam','Rubble Hall']},
  {name:'Deep Stone', rock:'deep', d:[.42,.6], pre:[5,7], mixes:[{stone:1,deep:1},{deep:2,stone:.8},{deep:3,stone:.5},{deep:6,stone:.25}], ores:['coal','copper','cinnabar','iron','gold'], target:1200, gems:{emerald:{p:.016,cap:2}, diamond:{p:.013,cap:2}},
   names:['Copper Vein','Silent Chasm','Red Seam','Gold Pocket','Basalt Stair','Hollow Deep','Cinder Gallery','Pale Grotto']},
  {name:'Gem Depths', rock:'obsidian', d:[.64,.8], pre:[7,9], mixes:[{deep:1,obsidian:1},{obsidian:2,deep:.8},{obsidian:3,deep:.5},{obsidian:6,deep:.25}], ores:['coal','copper','iron','gold'], target:1800, gems:{emerald:{p:.034,cap:4}, diamond:{p:.027,cap:3}},
   names:['Crystal Hollow','Glass Vault','Dark Facet','Star Pocket','Obsidian Shelf','Emerald Run','Black Lens','Gem Cradle']},
  {name:'The Underworld', rock:'ember', d:[.83,.95], pre:[9,11], mixes:[{obsidian:1,ember:1},{ember:2,obsidian:.8},{ember:3,obsidian:.5},{ember:6,obsidian:.25}], ores:['coal','cinnabar','iron','gold'], target:2500, gems:{emerald:{p:.042,cap:5}, diamond:{p:.034,cap:4}},
   names:['Ember Gate','Ash Bridge','Magma Gallery','Cinnabar Spire','Cinder Throne','Molten Steps','Sulfur Hall','Flame Rift']},
];
const BOARDS_PER_ZONE=4, BOARD_COUNT=ZONES.length*BOARDS_PER_ZONE;
// The world map resets at midnight Pacific time for everyone, wherever they are.
const PACIFIC=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
function todayKey(){ return PACIFIC.format(new Date()); }
let dayState={day:todayKey(),done:[],scores:{},prospector:false};
function hashStr(s){ let h=2166136261; for(const ch of s){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
const _bd={};
function boardDef(idx){
  const key=dayState.day+':'+idx+':'+mode; if(_bd[key]) return _bd[key];
  const z=ZONES[Math.floor(idx/BOARDS_PER_ZONE)], j=idx%BOARDS_PER_ZONE, f=j/(BOARDS_PER_ZONE-1);
  const R=rng(hashStr(dayState.day+'#'+idx)+1), M=MODES[mode];
  const base=z.mixes[j];
  // boards clear on score: the target climbs within each zone and across zones
  const target=Math.round(z.target*(1+.2*j)*M.goals/10)*10;
  const RZ=rng(hashStr(dayState.day+'#zone'+Math.floor(idx/BOARDS_PER_ZONE))+7); const names=z.names.slice().sort(()=>RZ()-.5);
  const baseD=z.d[0]+(z.d[1]-z.d[0])*f;
  return _bd[key]={ idx, zone:Math.floor(idx/BOARDS_PER_ZONE), zoneName:z.name, name:names[j], rock:z.rock, base, ores:z.ores, gems:z.gems||{}, goals:{}, target,
    d:Math.min(.97,baseD*M.dMul+M.dAdd), pre:Math.round((z.pre[0]+(z.pre[1]-z.pre[0])*f)*M.pre) };
}
function levelDef(L){ return boardDef(L-1); }
const boardLabel=idx=>`${Math.floor(idx/BOARDS_PER_ZONE)+1}-${idx%BOARDS_PER_ZONE+1}`;

// Smelting recipes: only these three can be crafted, and you can hold one of each at a time
const RECIPES=[
  {m:'blast',      cost:{coal:12, iron:4},                        desc:'Explodes when its line clears, breaking the 8 blocks around it and mining their ore.'},
  {m:'jackhammer', cost:{iron:12, gold:8, cinnabar:8, copper:8},    desc:'Shakes the remaining blocks into a fresh arrangement with no trapped gaps.'},
  {m:'rescue',     cost:{iron:16, gold:12, cinnabar:10, copper:10, diamond:2, emerald:2}, desc:'Used automatically on a cave-in: undoes your last placement and deals a fresh set of pieces.'},
];
const STASH_KEYS=['coal','copper','iron','cinnabar','gold','emerald','diamond'];

const emptyGrid=()=>Array.from({length:N},()=>Array(N).fill(null));
const difficulty=()=>levelDef(level).d;
function occBits(g){ let lo=0,hi=0; for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(g[r][c]){ const [a,b]=bitOf(r,c); lo|=a; hi|=b; } return [lo>>>0,hi>>>0]; }

// ---------- dealer: every set is solver-checked ----------
function sizeWeight(s,d){
  if(s.n===1) return .45*(1-d)+.08;
  if(s.n===2) return .8-.4*d;
  if(s.n<=4) return 1.2-.45*d;
  if(s.n===5) return .6+.8*d;
  if(s.n===6) return .3+1.0*d;
  return .12+1.1*d;
}
function pickWeighted(items){ const tot=items.reduce((a,x)=>a+x.w,0); if(tot<=0) return null; let v=Math.random()*tot; for(const x of items){ v-=x.w; if(v<=0) return x; } return items[items.length-1]; }
function pickIdx(ws){ const tot=ws.reduce((a,b)=>a+b,0); if(tot<=0) return 0; let v=Math.random()*tot; for(let i=0;i<ws.length;i++){ v-=ws[i]; if(v<=0) return i; } return ws.length-1; }
function needs(res){ const g=levelDef(level).goals[res]; return g!==undefined && (collected[res]||0)<g; }
function pickBase(){
  const def=levelDef(level);
  return pickWeighted(Object.entries(def.base).map(([k,w])=>({k,w}))).k;
}
function specialOnField(){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(grid[r][c] && MATS[grid[r][c]].kind==='special') return true;
  return (pieces||[]).some(p=>p && p.mats.some(m=>MATS[m].kind==='special'));
}
function veinCells(s,mats,count){
  const free=s.cells.map((_,i)=>i).filter(i=>MATS[mats[i]].kind==='base');
  if(!free.length) return [];
  const out=[free[Math.floor(Math.random()*free.length)]];
  while(out.length<count){
    const nb=free.filter(i=>!out.includes(i) && out.some(j=>Math.abs(s.cells[i][0]-s.cells[j][0])+Math.abs(s.cells[i][1]-s.cells[j][1])===1));
    if(!nb.length) break; out.push(nb[Math.floor(Math.random()*nb.length)]);
  }
  return out;
}
function dressPiece(s,setSoFar){
  const def=levelDef(level), base=pickBase(), mats=s.cells.map(()=>base);
  for(const ore of def.ores){
    const {p,vein}=ORES[ore];
    if(Math.random()<p){ const count=vein[0]+Math.floor(Math.random()*(vein[1]-vein[0]+1)); veinCells(s,mats,Math.min(count,s.n)).forEach(i=>mats[i]=ore); }
  }
  for(const [g,{p,cap}] of Object.entries(def.gems||{})){
    if((dealt[g]||0)>=cap || Math.random()>=p) continue;
    const c=veinCells(s,mats,1); if(c.length){ mats[c[0]]=g; dealt[g]=(dealt[g]||0)+1; }
  }
  const rate=SPECIAL_RATE[tierOf(def.d)];
  if(rate && !specialOnField() && !setSoFar.some(p=>p.mats.some(m=>MATS[m].kind==='special')) && Math.random()<rate){
    mats[Math.floor(Math.random()*s.n)]=pickWeighted(Object.entries(SPECIAL_MIX).map(([k,w])=>({k,w}))).k;
  }
  return {cells:s.cells,h:s.h,w:s.w,mats,sid:s.id};
}
// How many ways a set should be placeable, by difficulty: ~400 on Easy down to ~1–2 on Expert
const targetWays=d=>Math.pow(400,1-d);
// Dealer assistance: 1 on the easiest board, ~0.4 on Medium, ~0.1 on Hard, ~0 on Expert
const assistOf=d=>Math.pow(1-d,1.8);
const BIG_SET=[['###/###/###'],['###/###','##/##/##'],['#####','#/#/#/#/#']];
function chooseSet(lo,hi,d){
  const A=assistOf(d);
  const {boost,exact}=pocketInfo(lo,hi);
  const fits=SHAPES.map(s=>s.pl.some(p=>!(lo&p.lo)&&!(hi&p.hi)));
  const ws=SHAPES.map((s,i)=>fits[i]?sizeWeight(s,d)*Math.pow(boost[i],A):0);
  // "completers": shapes that finish a row/column right now, or exactly fill a pocket
  const cw=SHAPES.map(()=>0);
  SHAPES.forEach((s,i)=>{ if(!fits[i]) return; let bl=0;
    for(const p of s.pl){ if((lo&p.lo)||(hi&p.hi)) continue; const l=applyMove(lo,hi,p.lo,p.hi)[2]; if(l>bl) bl=l; }
    cw[i]=(bl?bl*bl*2:0)+(exact.has(i)?4:0); if(cw[i]) cw[i]*=.5+sizeWeight(s,d); });
  const hasC=cw.some(x=>x>0);
  const target=targetWays(d); let best=null;
  const sample=()=>[0,1,2].map(k=>SHAPES[pickIdx(hasC && Math.random()<A*(k===0?.95:.55) ? cw : ws)]);
  const tries=(needHealthy,K)=>{
    for(let k=0;k<K;k++){
      const set=sample();
      const res=solveCount(lo,hi,set,400,20000,needHealthy,A>.1);
      if(!res.count) continue;
      const cnt=res.exhausted?Math.max(res.count,250):res.count;
      const tight=-Math.abs(Math.log(cnt)-Math.log(target));
      const help=res.maxLines*1.4 + (res.allClear?10:0) + set.filter(s=>exact.has(s.id)).length*2.5;
      const sc=(1-A)*tight + A*help + Math.random()*(.3+.9*(1-A));
      if(!best||sc>best.sc) best={set,sc};
    }
  };
  tries(true, A>.3?36:26);
  if(d>.45 && (!best || best.sc<-1)){ SHAPES.forEach((s,i)=>{ if(s.n>=4) ws[i]*=1.8; }); tries(true,30); }
  if(!best) tries(false,26);
  if(!best){
    const small=SHAPES.filter((s,i)=>fits[i]&&s.n<=3);
    outer: for(const a of small) for(const b of small) for(const c of small){
      if(solveCount(lo,hi,[a,b,c],1,30000,false,false).count){ best={set:[a,b,c]}; break outer; } }
  }
  if(!best){ const f=SHAPES.filter((s,i)=>fits[i]); best={set:[0,1,2].map(()=>f.length?f[0]:SHAPES[0])}; }
  return best.set.sort(()=>Math.random()-.5);
}
let bigNext=false;
function dealSet(){
  const [lo,hi]=occBits(grid); let set;
  if(bigNext && lo===0 && hi===0){ set=BIG_SET.map(opts=>SHAPES[SHAPE_STRS.indexOf(opts[Math.floor(Math.random()*opts.length)])]).sort(()=>Math.random()-.5); bigNext=false; }
  else set=chooseSet(lo,hi,difficulty());
  const out=[]; set.forEach(s=>out.push(dressPiece(s,out))); pieces=out;
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
        g[r][c]=(commonOres.length&&Math.random()<.18)?commonOres[Math.floor(Math.random()*commonOres.length)]:pickBase();
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
let cell=40; const dpr=Math.max(1,window.devicePixelRatio||1);
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;

function layout(){
  const app=$('app');
  const w=Math.min(app.clientWidth-32,520), h=app.clientHeight-390;
  const size=Math.max(200,Math.min(w,h));
  cell=Math.floor(size/N); const px=cell*N;
  boardC.style.width=px+'px'; boardC.style.height=px+'px'; boardC.width=px*dpr; boardC.height=px*dpr;
  fxC.width=innerWidth*dpr; fxC.height=innerHeight*dpr;
  drawTray();
}
window.addEventListener('resize',layout);

function buildGoals(){
  $('goalsBar').innerHTML='<div class="pbar" role="progressbar" aria-label="Board score"><div class="pfill" id="pfill"></div><span class="ptxt" id="ptxt"></span></div>';
  updateBar();
}
function updateGoals(){}
function updateBar(){
  const el=$('pfill'); if(!el) return; const tg=levelDef(level).target, f=Math.min(1,shown/tg);
  el.style.width=(f*100)+'%'; $('ptxt').textContent=`${shown} / ${tg}`; el.parentElement.classList.toggle('full',f>=1);
  el.parentElement.setAttribute('aria-valuenow',shown); el.parentElement.setAttribute('aria-valuemax',tg);
}
let shown=0;
function updateHUD(){ $('best').textContent=Object.values(dayState.scores).reduce((a,b)=>a+b,0); $('level').textContent=boardLabel(level-1); const t=tierOf(difficulty()); $('tier').textContent=t; $('tier').dataset.t=t; }
function tickScore(){ if(shown<score){ shown+=Math.max(1,Math.ceil((score-shown)/8)); if(shown>score) shown=score; } else if(shown>score) shown=score; updateBar(); }

function drawPiece(ctx,p,cs,ox=0,oy=0,alpha=1){
  ctx.imageSmoothingEnabled=false; ctx.globalAlpha=alpha;
  p.cells.forEach(([r,c],k)=>ctx.drawImage(texOf(p.mats[k]),ox+c*cs,oy+r*cs,cs,cs));
  ctx.globalAlpha=1;
}
function fitsAt(p,r0,c0){ for(const [r,c] of p.cells){ const R=r0+r,C=c0+c; if(R<0||C<0||R>=N||C>=N||grid[R][C]) return false; } return true; }
function canPlaceAnywhere(p){ for(let r=0;r<=N-p.h;r++)for(let c=0;c<=N-p.w;c++) if(fitsAt(p,r,c)) return true; return false; }
function drawTray(){
  if(!pieces) return;
  // one fixed piece size for every piece, big enough to still fit a 1x5 bar inside its slot: nothing ever resizes
  const sw=slots[0].clientWidth; let cs=Math.floor(cell*.52);
  if(sw>0) cs=Math.min(Math.floor(cell*.62),Math.floor((sw-6)/5));
  cs=Math.max(14,cs);
  slots.forEach((s,i)=>{
    const cv=s.firstElementChild, p=pieces[i];
    if(!p){ cv.hidden=true; s.classList.remove('nofit','special'); return; }
    cv.hidden=false; cv.style.width=p.w*cs+'px'; cv.style.height=p.h*cs+'px';
    cv.width=p.w*cs*dpr; cv.height=p.h*cs*dpr;
    const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); drawPiece(ctx,p,cs);
    s.classList.toggle('nofit',!canPlaceAnywhere(p));
    s.classList.toggle('special',p.mats.some(m=>MATS[m].kind==='special'));
  });
}

// ---------- loose items (ore/gem freed from rock) ----------
const ITEM={};
(function makeItems(){
  const nug=[[[1,0],[0,1],[1,1],[2,1],[1,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]]];
  const spots=[[6,3],[2,9],[9,9]];
  const SPR={brilliant:['.XXXXX.','XLHLHMX','XHHHMMX','.XHMMX.','..XMX..','...X...'], step:['.XXXX.','XLLHHX','XLHHMX','XHHMMX','XHMMDX','XMMDDX','.XXXX.']};
  Object.entries(MATS).forEach(([k,m])=>{
    if(m.kind!=='ore'&&m.kind!=='gem') return;
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
function ring(x,y,col,maxR,D){
  const t0=performance.now();
  fxList.push({draw(ctx,now){ const t=(now-t0)/D; if(t>=1) return false;
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
  prism:{rays:['#ff6ad5','#6ae3ff','#ffe94a','#7dff9a'], parts:'spark', cols:['#ff6ad5','#6ae3ff','#ffe94a','#7dff9a','#ffffff']},
  fossil:{rays:['#fbf3dc','#e6c37a'], parts:'spark', cols:['#fffbe8','#ffe9a8','#e6c37a']},
  treasure:{rays:['#ffe36a','#f5b21c'], parts:'coin', cols:['#ffe36a','#f5c93c','#fff6c2']},
  jackhammer:{rays:['#ffd23f','#cfe8ff'], parts:'ember', cols:['#ffffff','#ffd23f','#9fb4cc','#7d8a9e']},
  rescue:{rays:['#ff6a9a','#ffd0e0'], parts:'spark', cols:['#ffffff','#ff9ab8','#ffd0e0']},
};
function hexA(hx,a){ return hx+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0'); }
// the grand moment: block rises to center in a burst of light, title card, themed particle show
function playSpecial(sp){
  const D=REDUCE?800:1800, t0=performance.now(), look=SPECIAL_LOOK[sp.m];
  let burstDone=false, extraDone=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1) return false;
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
      ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`700 ${Math.round((B.width*.095*pop)*.8)}px ${FONT_D}`;
      ctx.shadowColor=look.rays[0]; ctx.shadowBlur=18; ctx.lineWidth=6; ctx.strokeStyle='#120a04';
      ctx.strokeText(sp.title,cx,B.top+B.height*.17); ctx.fillStyle='#fff8e6'; ctx.fillText(sp.title,cx,B.top+B.height*.17);
      ctx.font=`600 ${Math.round((B.width*.06)*.8)}px ${FONT_D}`; ctx.shadowBlur=10;
      ctx.strokeText(sp.sub,cx,B.top+B.height*.84); ctx.fillStyle=look.rays[0]; ctx.fillText(sp.sub,cx,B.top+B.height*.84);
      ctx.restore(); }
    if(!burstDone && t>.2){ burstDone=true; spawnFxParts(look.parts,cx,cy,look.parts==='coin'?46:look.parts==='ember'?60:40,look.cols);
      if(sp.m==='blast'){ shake(true); spawnFxParts('ember',sx,sy,30,look.cols); } }
    if(!extraDone && t>.55){ extraDone=true;
      if((sp.m==='prism'||sp.m==='treasure') && sp.res){ const img=ITEM[sp.res];
        for(let q=0;q<Math.min(9,sp.n);q++) flyItem(img,sp.res,cx,cy,q*80,'#ffffff',()=>{ updateStash([sp.res]); blip(1200+q*120,.08,'sine',.05); },true); }
      if(sp.m==='treasure'||sp.m==='fossil') spawnFxParts(look.parts,cx,cy,30,look.cols); }
    return true; }});
  // fanfare
  if(sp.m==='blast'){ blip(60,.7,'sawtooth',.1); blip(45,.8,'square',.07,.05); }
  [523,659,784,1047,1319,1568].forEach((f,j)=>blip(f,.16,'triangle',.06,.25+j*.08));
  return D;
}
// brief title splash over the board
function playSplash(title,sub,key){
  const D=REDUCE?450:900, t0=performance.now(), look=SPECIAL_LOOK[key];
  let sparked=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1) return false;
    const B=boardC.getBoundingClientRect(), cx=B.left+B.width/2, cy=B.top+B.height/2;
    const a=Math.min(1,t/.15)*(t>.75?(1-t)/.25:1);
    ctx.fillStyle=`rgba(6,4,10,${.4*a})`; ctx.fillRect(B.left-8,B.top-8,B.width+16,B.height+16);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(cx,cy); ctx.rotate(now/800);
    for(let k=0;k<12;k++){ ctx.rotate(Math.PI/6); ctx.fillStyle=hexA(look.rays[k%look.rays.length],.16*a);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(B.width*.7,-B.width*.06); ctx.lineTo(B.width*.7,B.width*.06); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if(!sparked){ sparked=true; spawnFxParts('spark',cx,cy,24,look.cols); }
    const pop=1+.3*Math.max(0,1-t/.15);
    ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`700 ${Math.round((B.width*.1*pop)*.8)}px ${FONT_D}`; ctx.shadowColor=look.rays[0]; ctx.shadowBlur=18;
    ctx.lineWidth=6; ctx.strokeStyle='#120a04'; ctx.strokeText(title,cx,cy-B.height*.05); ctx.fillStyle='#fff8e6'; ctx.fillText(title,cx,cy-B.height*.05);
    ctx.font=`600 ${Math.round((B.width*.065)*.8)}px ${FONT_D}`; ctx.strokeText(sub,cx,cy+B.height*.08); ctx.fillStyle=look.rays[0]; ctx.fillText(sub,cx,cy+B.height*.08);
    ctx.restore(); return true; }});
  [784,988,1175,1568].forEach((f,j)=>blip(f,.12,'triangle',.05,j*.06));
  return D;
}
// golden wave across the empty board + title card
function playAllClear(pts){
  const D=REDUCE?600:1300, t0=performance.now();
  let sparked=false;
  fxList.push({draw(ctx,now){
    const t=(now-t0)/D; if(t>=1) return false;
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
    ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`700 ${Math.round((B.width*.13*pop)*.8)}px ${FONT_D}`;
    ctx.shadowColor='#ffd23f'; ctx.shadowBlur=24; ctx.lineWidth=7; ctx.strokeStyle='#1a0f04';
    ctx.strokeText('ALL CLEAR!',cx,B.top+B.height*.44); ctx.fillStyle='#fff3c4'; ctx.fillText('ALL CLEAR!',cx,B.top+B.height*.44);
    ctx.font=`600 ${Math.round((B.width*.07)*.8)}px ${FONT_D}`; ctx.shadowBlur=12;
    ctx.strokeText(`+${pts}`,cx,B.top+B.height*.58); ctx.fillStyle='#ffd23f'; ctx.fillText(`+${pts}`,cx,B.top+B.height*.58);
    ctx.restore(); return true; }});
  [659,784,988,1319,1568,1976].forEach((f,j)=>blip(f,.14,'square',.05,j*.06));
}
function renderFx(now){
  const w=innerWidth, h=innerHeight;
  fx.setTransform(dpr,0,0,dpr,0,0); fx.clearRect(0,0,w,h);
  const cur=fxList; fxList=[]; const keep=cur.filter(f=>f.draw(fx,now)); fxList=keep.concat(fxList);
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

// ---------- sound ----------
let comboQueue=[], comboBusy=false;
function showCombo(text){ comboQueue.push(text); if(!comboBusy) nextCombo(); }
function nextCombo(){ const t=comboQueue.shift(); if(!t){ comboBusy=false; return; } comboBusy=true;
  const el=$('combo'); el.textContent=t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); setTimeout(nextCombo,700); }
let ac=null, master=null, soundOn=true;
try{ if(localStorage.getItem('deepcore-sound')==='off') soundOn=false; }catch(e){}
function audioCtx(){
  if(!ac){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=2.2;
    const comp=ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination); }catch(e){ ac=null; } }
  return ac;
}
// iPhones keep Web Audio silent until a tap/touch starts it (and mute it with the ring switch unless the page asks for "playback" audio)
function unlockAudio(){
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  const c=audioCtx(); if(!c) return;
  if(c.state!=='running') c.resume().catch(()=>{});
  try{ const b=c.createBuffer(1,1,22050), src=c.createBufferSource(); src.buffer=b; src.connect(c.destination); src.start(0); }catch(e){}
}
['pointerdown','touchstart','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlockAudio,{capture:true,passive:true}));
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&ac&&ac.state!=='running') ac.resume().catch(()=>{}); });
function blip(freq,dur=.08,type='square',vol=.05,when=0){
  if(!soundOn) return;
  try{ const c=audioCtx(); if(!c) return; if(c.state!=='running'){ c.resume().catch(()=>{}); return; }
    const t=c.currentTime+when, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(freq*.6,t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(master); o.start(t); o.stop(t+dur); }catch(e){}
}
function setSoundUI(){ const b=$('sound'); b.setAttribute('aria-pressed',soundOn); b.title=soundOn?'Sound on':'Sound off'; }
setSoundUI();
$('sound').onclick=()=>{ soundOn=!soundOn; try{ localStorage.setItem('deepcore-sound',soundOn?'on':'off'); }catch(e){} setSoundUI(); A.track('setting_change',{setting:'sound',value:soundOn}); if(soundOn){ unlockAudio(); blip(660,.08,'triangle',.08); blip(990,.1,'triangle',.08,.08); } };
function shake(big){ if(REDUCE) return; const w=$('boardWrap'); w.classList.remove('shake','bigshake'); void w.offsetWidth; w.classList.add(big?'bigshake':'shake'); }

function showBanner(ms=2200){
  const def=levelDef(level);
  $('bLvl').textContent=`${def.zoneName} · Board ${boardLabel(level-1)} · ${tierOf(def.d)}`; $('bName').textContent=def.name;
  $('bGoals').textContent=`Score ${def.target} points to clear`;
  $('banner').classList.add('show'); setTimeout(()=>$('banner').classList.remove('show'),ms);
}

// ---------- game flow ----------
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
function startBoard(idx){
  const att=dayState.attempts=dayState.attempts||{}; att[idx]=(att[idx]||0)+1; saveDay();
  undo=null; dealt={}; level=idx+1; score=0; shown=0; collected={}; shownCol={}; since={}; bigNext=false; grid=emptyGrid(); pieces=null; combo=0; sinceClear=0; over=false; moves=0; busy=false;
  prefill();
  $('over').hidden=true; buildGoals(); updateHUD(); dealSet(); drawTray(); showBanner(); saveBoard();
  boardT0=lastAct=performance.now(); A.setBoard(boardLabel(idx));
  const d=levelDef(level); A.track('board_start',{idx,label:boardLabel(idx),zone:d.zoneName,tier:tierOf(d.d),target:d.target,mode:MODES[mode].name,attempt:att[idx],starter_blocks:d.pre});
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
  const m=grid[r][c]; if(!m) return; const M=MATS[m];
  burst(r,c,m,7); flashes.push({r,c,life:1});
  score+=VAL[m]||0;
  if(M.drop){
    const item=(M.kind==='ore'||M.kind==='gem'), res=M.drop;
    credit(ctx,res,1,true);
    if(item){
      bank[res]=(bank[res]||0)+1;
      if(ctx.flyers<16){ const [x,y]=cellScreen(r,c);
        flyItem(ITEM[m],res,x,y,ctx.flyers*35,FX[m][1]||'#fff',()=>{ updateStash([res]); blip(880+Math.random()*300,.05,'sine',.035); },true);
        ctx.flyers++; }
      else ctx.stash.push(res);
    }
    if(M.kind==='gem'){ ctx.gems++; ctx.msgs.push(`${DROPS[res][0]}! +${VAL[m]}`); }
  }
  grid[r][c]=null;
}
function flushCtx(ctx){ updateGoals(ctx.instant); updateStash(ctx.stash);
  if(ctx.gems) [988,1319,1568].forEach((f,j)=>blip(f,.16,'sine',.06,.25+j*.08)); }
// a non-blast special caught in a clear: work out its reward now, celebrate after
function specialHit(m,r,c,ctx){
  const M=MATS[m], goals=levelDef(level).goals, sp={m,r,c,title:M.name,sub:'',pts:0};
  if(m==='prism'){ sp.pts=M.pts;
    const def=levelDef(level), opts=[...def.ores.map(k=>({k,w:ORES[k].p})), ...Object.entries(def.gems||{}).map(([k,g])=>({k,w:g.p*3}))];
    const pick=opts.length?pickWeighted(opts).k:'coal';
    bank[pick]=(bank[pick]||0)+3; sp.res=pick; sp.n=3; sp.sub=`+3 ${DROPS[pick][0]} · +${M.pts}`; }
  if(m==='treasure'){ const z=levelDef(level).zone, deep=z>=3;
    const table=[['iron',5,9,deep?.22:.35],['gold',4,7,deep?.24:.30],['emerald',2,4,deep?.29:.20],['diamond',1,3,deep?.25:.15]];
    const pick=pickWeighted(table.map(([k,lo,hi,w])=>({k,lo,hi,w})));
    let u=Math.random(); if(deep && (pick.k==='emerald'||pick.k==='diamond')) u=Math.pow(u,.55);
    const n=pick.lo+Math.min(pick.hi-pick.lo,Math.floor(u*(pick.hi-pick.lo+1)));
    bank[pick.k]=(bank[pick.k]||0)+n; sp.res=pick.k; sp.n=n; sp.pts=200; sp.sub=`${n} ${DROPS[pick.k][0]} · +200`; }
  if(m==='fossil'){ sp.pts=M.pts; sp.sub=`+${M.pts}`; }
  if(m==='jackhammer'){ sp.pts=M.pts; sp.sub=`Board shaken up · +${M.pts}`; }
  score+=sp.pts; burst(r,c,m,18); grid[r][c]=null;
  return sp;
}
// blast charge: fuse flare on the board, then it bursts and breaks the 8 blocks around it
let fuse=null;
async function detonate(r,c,hit){
  fuse={r,c,t0:performance.now()}; blip(1400,.05,'square',.04); blip(1600,.05,'square',.04,.12); blip(1900,.05,'square',.05,.24);
  await sleep(REDUCE?120:420);
  fuse=null;
  const [sx,sy]=cellScreen(r,c), look=SPECIAL_LOOK.blast;
  ring(sx,sy,'#fff6b8',cell*1.6,300); ring(sx,sy,'#ffd23f',cell*2.6,480); ring(sx,sy,'#ff6a1f',cell*3.6,650);
  spawnFxParts('ember',sx,sy,55,look.cols); shake(true);
  blip(60,.6,'sawtooth',.11); blip(42,.7,'square',.08,.04); blip(120,.25,'triangle',.06,.02);
  boardFlash={r,c,t0:performance.now()};
  grid[r][c]=null; burst(r,c,'blast',24);
  const ctx=mineCtx(), chain=[];
  for(let a=r-1;a<=r+1;a++)for(let b=c-1;b<=c+1;b++){
    if(a<0||b<0||a>=N||b>=N||!grid[a][b]) continue;
    const m=grid[a][b];
    if(m==='blast'){ chain.push([a,b]); continue; }
    if(MATS[m].kind==='special'){ hit.push(specialHit(m,a,b,ctx)); continue; }
    mineCell(a,b,ctx);
  }
  flushCtx(ctx);
  let count=1;
  for(const [a,b] of chain){ await sleep(160); count+=await detonate(a,b,hit); }
  return count;
}
// All-clear: a nice bonus, but only 15% of the board's score target, so it can't win a board that was far from done
const allClearBonus=()=>Math.max(10,Math.round(levelDef(level).target*.15/10)*10);
let boardFlash=null;
// how special was that placement? counts the spots that keep the rest of the tray playable
function rateMove(i,r0,c0){
  const p=pieces[i], s=SHAPES[p.sid]; if(!s) return null;
  const [lo,hi]=occBits(grid), base=countHoles(lo,hi);
  const rest=pieces.filter((q,j)=>q&&j!==i).map(q=>SHAPES[q.sid]).filter(Boolean);
  const fits=s.pl.filter(q=>!(lo&q.lo)&&!(hi&q.hi));
  if(fits.length<4) return null;
  let good=[];
  if(rest.length){ for(const q of fits){ const nb=applyMove(lo,hi,q.lo,q.hi); if(countHoles(nb[0],nb[1])>base) continue; if(solveCount(nb[0],nb[1],rest,1,3000,true,false).count) good.push(q); } }
  else { let maxL=0; const ls=fits.map(q=>{ const nb=applyMove(lo,hi,q.lo,q.hi); const l=countHoles(nb[0],nb[1])>base?-1:nb[2]; if(l>maxL) maxL=l; return l; });
    if(maxL<1) return null; good=fits.filter((q,k)=>ls[k]===maxL); }
  const chosen=fits.find(q=>q.r0===r0&&q.c0===c0);
  if(!chosen||!good.includes(chosen)||good.length>3) return null;
  return good.length===1 ? {word:'Perfect!',pts:50,col:'#ffe36a'} : {word:'Great fit!',pts:25,col:'#9fe8ff'};
}
function floatText(x,y,text,col){
  const t0=performance.now(), D=900;
  fxList.push({draw(ctx,now){ const t=(now-t0)/D; if(t>=1) return false;
    const pop=1+.35*Math.max(0,1-t/.15);
    ctx.save(); ctx.globalAlpha=t>.7?(1-t)/.3:1; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`700 ${Math.round((cell*.55*pop)*.8)}px ${FONT_D}`; ctx.lineWidth=5; ctx.strokeStyle='#120a04'; ctx.shadowColor=col; ctx.shadowBlur=12;
    const yy=y-cell*.9*easeOut(t); ctx.strokeText(text,x,yy); ctx.fillStyle=col; ctx.fillText(text,x,yy); ctx.restore(); return true; }});
}
let undo=null;
async function place(i,r0,c0){
  const p=pieces[i];
  const rating=rateMove(i,r0,c0);
  undo=JSON.parse(JSON.stringify({grid,pieces,score,combo,sinceClear,collected,bank,since,bigNext,moves,dealt}));
  p.cells.forEach(([r,c],k)=>grid[r0+r][c0+c]=p.mats[k]);
  score+=p.cells.length; pieces[i]=null; blip(140,.07,'square',.06); moves++;
  if(rating){ score+=rating.pts; const B=boardC.getBoundingClientRect(); floatText(B.left+(c0+p.w/2)*cell,B.top+(r0+p.h/2)*cell,`${rating.word} +${rating.pts}`,rating.col); blip(1175,.08,'triangle',.05); blip(1568,.1,'triangle',.05,.07); }
  const {rows,cols}=linesNow(), n=rows.length+cols.length;
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
    score+=n*10*n*combo;
    flushCtx(ctx);
    { const B=boardC.getBoundingClientRect(); const cr=rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:3.5, cc=cols.length?cols.reduce((a,b)=>a+b,0)/cols.length:3.5;
      floatText(B.left+(cc+.5)*cell,B.top+(cr+.5)*cell,`+${score-clearStart}`,'#fff3c4'); }
    const msgs=ctx.msgs.slice(); if(n>1||combo>1) msgs.push(n>1 ? `${n} lines!${combo>1?'  ×'+combo:''}` : `Combo ×${combo}`);
    if(!hit.length && !blasts.length) msgs.slice(0,3).forEach(showCombo);
    [392,494,587,784].slice(0,Math.min(4,1+n)).forEach((f,j)=>blip(f*(1+Math.min(combo,6)*.06),.12,'triangle',.06,j*.06));
    shake(false);
    if(blasts.length){
      let count=0; for(const [r,c] of blasts) if(grid[r][c]==='blast') count+=await detonate(r,c,hit);
      const pts=MATS.blast.pts*count; score+=pts; A.track('special_triggered',{m:'blast',count});
      await sleep(REDUCE?100:350);
      await sleep(playSplash(count>1?`Blast charge ×${count}`:'Blast charge',`+${pts}`,'blast'));
    }
    for(const sp of hit){
      A.track('special_triggered',{m:sp.m,pts:sp.pts,res:sp.res||null,n:sp.n||0});
      await sleep(playSpecial(sp));
      if(sp.m==='jackhammer'){ doShake(); await sleep(REDUCE?400:900); }
    }
    if(grid.every(row=>row.every(v=>!v))){
      const ac=allClearBonus(); score+=ac; bigNext=true; A.track('all_clear',{bonus:ac,score_after:score,target:levelDef(level).target});
      playAllClear(ac); await sleep(REDUCE?600:1300);
    }
  } else { sinceClear++; if(sinceClear>=3) combo=0; }
  busy=false;
  if(score>=levelDef(level).target){ completeBoard(); return; }
  if(pieces.every(q=>!q)) dealSet();
  updateHUD(); drawTray();
  if(pieces.every(q=>!q||!canPlaceAnywhere(q))) gameOver();
  saveBoard(); saveProfile();
}
function completeBoard(){
  busy=true; const idx=level-1, bonus=150+50*Math.floor(idx/BOARDS_PER_ZONE)*2; score+=bonus;
  A.track('board_complete',{idx,label:boardLabel(idx),score,target:levelDef(level).target,moves,duration_ms:Math.round(performance.now()-boardT0),attempt:(dayState.attempts||{})[idx]||1,first_clear:!dayState.done.includes(idx)});
  showCombo(`Board mined! +${bonus}`);
  [523,659,784,1047].forEach((f,j)=>blip(f,.18,'triangle',.07,.1+j*.1));
  if(!dayState.done.includes(idx)) dayState.done.push(idx);
  dayState.scores[idx]=Math.max(dayState.scores[idx]||0,score);
  let earned=false;
  if(dayState.done.length>=BOARD_COUNT && !dayState.prospector){ dayState.prospector=true; prospector++; earned=true; }
  saveDay(); saveProfile(); clearBoardSave();
  setTimeout(()=>{
    shownCol={...collected}; updateGoals();
    for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(grid[r][c]){ burst(r,c,grid[r][c],4); grid[r][c]=null; }
    shake();
    setTimeout(()=>{ busy=false; pieces=null; showMap({justDone:idx, prospector:earned}); },900);
  },1100);
}
function gameOver(){
  if((crafted.rescue||0)>0){ setTimeout(useRescue,450); return; }
  const tg=levelDef(level).target;
  A.track('board_fail',{idx:level-1,label:boardLabel(level-1),score,target:tg,pct:Math.round(100*score/tg),moves,duration_ms:Math.round(performance.now()-boardT0),can_craft_rescue:canAfford(RESCUE()),attempt:(dayState.attempts||{})[level-1]||1});
  over=true; saveBoard(); setTimeout(()=>{ if(over) showOver(); },650);
}
const RESCUE=()=>RECIPES.find(r=>r.m==='rescue');
function useRescue(){
  A.track('rescue_used',{idx:level-1,score,moves});
  crafted.rescue=Math.max(0,(crafted.rescue||0)-1);
  if(undo){ ({grid,pieces,score,combo,sinceClear,collected,bank,since,bigNext,moves,dealt}=JSON.parse(JSON.stringify(undo))); shown=score; shownCol={...collected}; }
  undo=null; over=false; $('over').hidden=true;
  dealSet(); buildGoals(); updateHUD(); updateStash(); renderCrafted(); drawTray();
  busy=true; const d=playSplash('Rescue Potion','Last move undone · fresh pieces','rescue'); setTimeout(()=>{ busy=false; },d);
  saveBoard(); saveProfile();
}
function showOver(){
  $('finalScore').textContent=score;
  $('overWhy').textContent=`No room for the next block on board ${boardLabel(level-1)}.`;
  $('finalNote').textContent='Your stash and crafted specials are safe.';
  const can=canAfford(RESCUE()) && !(crafted.rescue>0);
  $('rescueBtn').hidden=!can;
  $('over').hidden=false; blip(110,.4,'sawtooth',.05);
}
$('retry').onclick=()=>{ A.attempt('retry_board',level-1,{score},120000); startBoard(level-1); };
$('rescueBtn').onclick=()=>{ const rc=RESCUE(); if(!canAfford(rc)) return; Object.entries(rc.cost).forEach(([k,v])=>bank[k]-=v); crafted.rescue=1; updateStash(Object.keys(rc.cost)); useRescue(); };
$('again').onclick=()=>{ clearBoardSave(); pieces=null; showMap({}); };

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

// ---------- stash, anvil, crafted specials ----------
const anvilIcon=(()=>{ const c=$('anvilIcon'), x=c.getContext('2d'); const P=(i,j,w,h,col)=>{ x.fillStyle=col; x.fillRect(i,j,w,h); };
  P(1,4,13,3,'#9aa3ad'); P(0,5,3,1,'#9aa3ad'); P(2,4,12,1,'#c9d0d8'); P(1,7,13,1,'#5f666e');
  P(6,8,4,3,'#7d858e'); P(6,8,1,3,'#9aa3ad'); P(3,11,10,3,'#7d858e'); P(3,11,10,1,'#9aa3ad'); P(3,14,10,1,'#4a5057');
  P(12,2,1,1,'#ffd23f'); P(13,1,1,1,'#ffb03a'); P(11,1,1,1,'#ffe08a'); return c; })();
function buildStash(){
  const box=$('stashItems'); box.innerHTML='';
  STASH_KEYS.forEach(k=>{ const d=document.createElement('div'); d.className='si'; d.dataset.k=k; d.title=DROPS[k][0];
    const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(ITEM[k],0,0);
    const n=document.createElement('span'); d.append(cv,n); box.append(d); });
  updateStash();
}
function updateAnvilGlow(){ const b=$('anvilBtn'); if(b) b.classList.toggle('afford',RECIPES.some(r=>owned(r.m)<1&&canAfford(r))); }
function updateStash(bumped=[]){
  document.querySelectorAll('.si').forEach(el=>{ const k=el.dataset.k, v=bank[k]||0; el.lastChild.textContent=v; el.classList.toggle('zero',!v);
    if(bumped.includes(k)){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } });
  updateAnvilGlow();
}
function onField(m){ let n=0; if(grid) for(const row of grid) for(const v of row) if(v===m) n++; (pieces||[]).forEach(p=>{ if(p) p.mats.forEach(v=>{ if(v===m) n++; }); }); return n; }
function owned(m){ return (crafted[m]||0)+onField(m); }
function renderCrafted(){
  const box=$('crafted'); box.innerHTML='';
  const list=RECIPES.map(r=>r.m).filter(m=>(crafted[m]||0)>0);
  if(!list.length){ const s=document.createElement('span'); s.className='hint'; s.textContent='Craft specials at the anvil. Drag a Blast Charge or Jackhammer onto a piece.'; box.append(s); return; }
  list.forEach(m=>{ const chip=document.createElement('div'); chip.className='chip'+(m==='rescue'?' passive':''); chip.dataset.m=m; chip.title=MATS[m].name;
    const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(TEX[m],0,0);
    const s=document.createElement('span'); s.textContent = m==='rescue' ? 'Ready' : MATS[m].name; chip.append(cv,s); box.append(chip);
    if(m!=='rescue') chip.addEventListener('pointerdown',e=>startSpecialDrag(e,m)); });
}
const canAfford=r=>Object.entries(r.cost).every(([k,v])=>(bank[k]||0)>=v);
function renderAnvil(){
  const box=$('recipes'); box.innerHTML='';
  RECIPES.forEach(rc=>{
    const row=document.createElement('div'); row.className='recipe';
    const big=document.createElement('canvas'); big.className='big'; big.width=big.height=T; big.getContext('2d').drawImage(TEX[rc.m],0,0);
    const mid=document.createElement('div');
    mid.innerHTML=`<div class="nm">${MATS[rc.m].name}</div><div class="ds">${rc.desc}</div>`;
    const cost=document.createElement('div'); cost.className='cost';
    Object.entries(rc.cost).forEach(([k,v])=>{ const sp=document.createElement('span'); const have=bank[k]||0; if(have<v) sp.className='short';
      const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(ITEM[k],0,0);
      sp.append(cv, document.createTextNode(`${Math.min(have,v)}/${v}`)); sp.title=DROPS[k][0]; cost.append(sp); });
    mid.append(cost);
    const right=document.createElement('div');
    const has=owned(rc.m)>0;
    const b=document.createElement('button'); b.type='button'; b.textContent=has?'Owned':'Craft'; b.className='go'; b.disabled=has||!canAfford(rc);
    b.onclick=()=>smelt(rc);
    const own=document.createElement('div'); own.className='owned'; own.textContent= has ? 'Limit 1' : (canAfford(rc)?'Ready to craft':'Need more');
    right.append(b,own); row.append(big,mid,right); box.append(row);
  });
}
function smelt(rc){
  if(!canAfford(rc) || owned(rc.m)>0) return;
  A.track('craft',{m:rc.m});
  Object.entries(rc.cost).forEach(([k,v])=>bank[k]-=v);
  crafted[rc.m]=1;
  updateStash(Object.keys(rc.cost)); renderCrafted(); renderAnvil(); saveProfile();
  [330,440,660,880,1320].forEach((f,j)=>blip(f,.1,j%2?'square':'triangle',.05,j*.06));
}

// ---------- field guide (the info panel): content is generated from the game's own tables so the numbers never go stale ----------
const RARITY={ coal:'Common', copper:'Common', cinnabar:'Common', iron:'Unusual', gold:'Rare', emerald:'Rare', diamond:'Rare' };
const BASE_INFO=[['dirt','Dirt','dirt'],['wood','Wood','log'],['stone','Stone','stone'],['deep','Deep stone','deep'],['obsidian','Obsidian','obsidian'],['ember','Ember rock','ember']];
function craftList(){ return RECIPES.map(r=>({name:MATS[r.m].name,cost:r.cost,mat:r.m,desc:r.desc})); }
function zonesFor(k){
  const names=ZONES.filter(z=>{ const mixes=z.mixes.some(m=>Object.keys(m).includes(k==='wood'?'log':k)); return mixes||z.ores.includes(k)||(z.gems&&z.gems[k]); }).map(z=>z.name);
  return names.length>3 ? names[0]+' to '+names[names.length-1] : names.join(', ');
}
function usesOf(k){ const u=craftList().filter(c=>c.cost[k]).map(c=>c.name); return u.length?'Used for: '+u.join(', '):'Points only'; }
function infoEl(tag,text,cls){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!==undefined) e.textContent=text; return e; }
function infoList(items){ const u=infoEl('ul'); items.forEach(t=>u.append(infoEl('li',t))); return u; }
function resRow(cv,name,rarity,pts,line1,line2){
  const row=infoEl('div',undefined,'irow'); row.append(cv); const d=infoEl('div');
  const nm=infoEl('div',name,'nm'); if(rarity){ nm.append(infoEl('span',rarity,'rar '+rarity)); } d.append(nm,infoEl('div',`${pts} points each`,'meta'),infoEl('div',line1,'meta')); if(line2) d.append(infoEl('div',line2,'meta')); row.append(d); return row;
}
function iconOf(src){ const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(src,0,0); return cv; }
const INFO_TABS={
  Play(b){
    b.append(infoEl('h3','THE GOAL'),infoEl('p',`Drag the three pieces onto the 8×8 board. Fill a whole row or column and it clears, mining every block in it. Earn enough points to fill the bar at the top and the board is cleared. Clear all 20 boards on the world map before the daily reset to earn the Prospector badge.`));
    b.append(infoEl('h3','CAVE-IN'),infoEl('p',`If none of your three pieces can fit anywhere, the cave collapses and the board ends. Ore you hauled on that attempt is lost, so keep your options open.`));
    b.append(infoEl('h3','SCORING'),infoList([`Every block you place scores a point, and every block you mine scores its value (see Resources).`,`Clearing several lines at once, or clearing on back-to-back turns, multiplies the bonus.`,`"Perfect!" (+50) means yours was the only placement that kept the whole tray playable. "Great fit!" (+25) means one of two or three.`,`All Clear (an empty board) pays a bonus worth 15% of the board's target, then deals a big easy set.`]));
    b.append(infoEl('h3','HOW TO GET BETTER'),infoList([`Look at all three pieces before you place any. Plan the order.`,`Keep one row and one column mostly open so long bars still fit.`,`Avoid sealing off single empty cells or tiny pockets; they can only be filled by a matching piece, if one ever comes.`,`Build rows and columns up to one piece away from full, then finish several at once for a combo.`,`Gold glow under your piece means the drop will clear a line.`,`Save Blast Charges and Jackhammers for tight spots, not to pad your score.`]));
    b.append(infoEl('h3','TOP BAR'),infoList([`TODAY is the total of your best scores on boards you've cleared since the last reset. BOARD is the one you're on, with its difficulty.`,`The map resets at midnight Pacific time. Every day brings a fresh set of 20 boards.`]));
  },
  Resources(b){
    b.append(infoEl('p',`Everything you mine counts toward your score. Ore and gems also go into your stash, which pays for crafting.`));
    b.append(infoEl('h3','ORE AND GEMS'));
    [...Object.keys(ORES),'emerald','diamond'].sort((a,c)=>VAL[a]-VAL[c]).forEach(k=>b.append(resRow(iconOf(ITEM[k]),DROPS[k][0],RARITY[k],VAL[k],usesOf(k),'Found in: '+zonesFor(k))));
    b.append(infoEl('h3','ROCK AND EARTH'));
    BASE_INFO.forEach(([d,name,m])=>b.append(resRow(iconOf(TEX[m]),name,'Common',VAL[m],d==='wood'?usesOf('wood'):'Points only','Found in: '+zonesFor(d==='wood'?'wood':d))));
  },
  Crafting(b){
    b.append(infoEl('h3','WHAT IS CRAFTING?'),infoEl('p',`The anvil (top of the screen, it glows when you can afford something) turns the ore in your stash into special blocks. You can hold one of each kind at a time.`));
    b.append(infoEl('h3','HOW'),infoList([`Tap the Anvil, then tap Craft on anything you can afford.`,`Drag a crafted Blast Charge or Jackhammer from the strip under your tray onto one of the three pieces. It replaces the block under your finger.`,`The special fires when the line it's in clears.`]));
    b.append(infoEl('h3','WHAT YOU CAN CRAFT'));
    craftList().forEach(c=>{ const row=infoEl('div',undefined,'irow'); row.append(iconOf(TEX[c.mat])); const d=infoEl('div'); d.append(infoEl('div',c.name,'nm'),infoEl('div',c.desc,'meta'),
      infoEl('div','Costs: '+Object.entries(c.cost).map(([k,v])=>`${v} ${DROPS[k][0]}`).join(', '),'meta')); row.append(d); b.append(row); });
    b.append(infoEl('h3','WHY IT HELPS'),infoList([`Blast Charge and Jackhammer rescue a crowded board and score big.`,`A Rescue Potion saves you from one cave-in: it undoes your last move and deals fresh pieces.`]));
  },
  Specials(b){
    b.append(infoEl('p',`These appear on their own inside pieces, now and then, from the Medium difficulty up. You can't craft them. When the line they sit in clears, they trigger.`));
    [['prism','Prism Stone',`Gives 3 of an ore or gem found in the current zone, plus ${MATS.prism.pts} points.`],['fossil','Fossil',`A flat ${MATS.fossil.pts} points.`],['treasure','Buried Treasure',`A haul of ore or gems, with a better chance of gems the deeper you are, plus 200 points.`]].forEach(([m,name,desc])=>{
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
$('anvilBtn').onclick=()=>{ if(busy||over) return; renderAnvil(); $('anvil').hidden=false; };
$('anvilClose').onclick=()=>{ $('anvil').hidden=true; };
$('anvil').addEventListener('pointerdown',e=>{ if(e.target.id==='anvil') $('anvil').hidden=true; });
const uiOpen=()=>screen!=='game' || !$('anvil').hidden || !$('info').hidden;

// drag a crafted special onto a tray piece; it replaces the block nearest your finger
let spDrag=null;
function startSpecialDrag(e,m){
  if(over||busy||uiOpen()||!(crafted[m]>0)) return;
  e.preventDefault(); unlockAudio();
  spDrag={m,touch:e.pointerType!=='mouse'};
  const s=Math.round(cell*.9); ghost.width=s*dpr; ghost.height=s*dpr; ghost.style.width=s+'px'; ghost.style.height=s+'px';
  gx.setTransform(dpr,0,0,dpr,0,0); gx.imageSmoothingEnabled=false; gx.clearRect(0,0,s,s); gx.drawImage(TEX[m],0,0,s,s);
  ghost.hidden=false; moveSpecialDrag(e);
}
function slotAt(x,y){ const el=document.elementFromPoint(x,y); return el && el.closest ? el.closest('.slot') : null; }
function moveSpecialDrag(e){
  if(!spDrag) return;
  const s=Math.round(cell*.9), lift=spDrag.touch?cell*1.2:0;
  ghost.style.transform=`translate(${e.clientX-s/2}px,${e.clientY-s/2-lift}px)`;
  spDrag.x=e.clientX; spDrag.y=e.clientY-lift;
  slots.forEach(sl=>sl.classList.remove('droptarget'));
  const sl=slotAt(spDrag.x,spDrag.y); if(sl && pieces && pieces[+sl.dataset.i]) sl.classList.add('droptarget');
}
function endSpecialDrag(){
  if(!spDrag) return; const d=spDrag; spDrag=null; ghost.hidden=true;
  slots.forEach(sl=>sl.classList.remove('droptarget'));
  const sl=slotAt(d.x,d.y); if(!sl||!pieces) return; const p=pieces[+sl.dataset.i]; if(!p) return;
  if(p.mats.some(m=>MATS[m].kind==='special')){ showCombo('One special per piece'); A.track('special_rejected',{m:d.m}); A.attempt('special_on_special',d.m); return; }
  const cv=sl.firstElementChild.getBoundingClientRect(), cs=cv.width/p.w;
  let bestK=0, bd=1e9; p.cells.forEach(([r,c],k)=>{ const cx=cv.left+(c+.5)*cs, cy=cv.top+(r+.5)*cs, dd=(cx-d.x)**2+(cy-d.y)**2; if(dd<bd){bd=dd;bestK=k;} });
  p.mats=p.mats.slice(); p.mats[bestK]=d.m; crafted[d.m]--; A.track('special_applied',{m:d.m,sid:p.sid});
  renderCrafted(); drawTray(); saveBoard();
  [880,1175,1568].forEach((f,j)=>blip(f,.1,'triangle',.05,j*.05));
}
window.addEventListener('pointermove',moveSpecialDrag);
window.addEventListener('pointerup',endSpecialDrag); window.addEventListener('pointercancel',endSpecialDrag);

// ---------- saving: profile (stash, specials, achievements), today's map, the board in progress ----------
const K_PROFILE='deepcore-profile', K_DAY='deepcore-day', K_BOARD='deepcore-board';
const lsGet=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const lsDel=k=>{ try{ localStorage.removeItem(k); }catch(e){} };
function saveProfile(){ lsSet(K_PROFILE,{bank,crafted,prospector}); }
function loadProfile(){ const p=lsGet(K_PROFILE); if(p){ bank=p.bank||{}; crafted=p.crafted||{}; prospector=p.prospector||0;
    // lapis and quartz were retired: swap any held for copper so nothing is lost
    ['lapis','quartz'].forEach(k=>{ if(bank[k]){ bank.copper=(bank.copper||0)+bank[k]; } delete bank[k]; }); } }
function saveDay(){ lsSet(K_DAY,dayState); }
// a new Pacific day wipes the map and any unfinished board
function checkDay(){
  const s=lsGet(K_DAY), today=todayKey();
  if(s && s.day===today) dayState=s;
  else { dayState={day:today,done:[],scores:{},prospector:false}; saveDay(); const b=lsGet(K_BOARD); if(b && b.day!==today) lsDel(K_BOARD); }
}
function saveBoard(){ if(!pieces) return; lsSet(K_BOARD,{day:dayState.day,idx:level-1,mode,grid,pieces,score,combo,sinceClear,collected,since,bigNext,moves,over,undo,dealt}); saveProfile(); }
function clearBoardSave(){ lsDel(K_BOARD); }
function savedBoard(){ const b=lsGet(K_BOARD); return (b && b.day===dayState.day && !b.over && b.moves>0) ? b : null; }
const okMat=m=>MATS[m]?m:'copper';   // blocks retired since the save was written
function restoreBoard(b){
  level=b.idx+1; ({grid,pieces,score,combo,sinceClear,collected}=b);
  grid=grid.map(row=>row.map(m=>m&&okMat(m))); pieces=pieces.map(p=>p&&{...p,mats:p.mats.map(okMat)});
  since=b.since||{}; bigNext=!!b.bigNext; moves=b.moves||0; over=!!b.over; undo=b.undo||null; dealt=b.dealt||{}; shownCol={...collected}; shown=score; busy=false;
  $('over').hidden=true; buildGoals(); updateHUD(); updateStash(); renderCrafted(); drawTray();
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
  if(screen!==which||which==='home') A.track('screen_view',{screen:which});
  screen=which; A.setScreen(which);
  $('home').hidden = which!=='home'; $('map').hidden = which!=='map'; $('anvil').hidden=true; $('info').hidden=true;
  if(which==='game'){ layout(); drawTray(); }
}
function homeView(v){ ['homeMain','homeSettings'].forEach(id=>$(id).hidden = id!==v); }
function showHome(){
  if(screen==='game') saveBoard();
  checkDay(); homeView('homeMain');
  const done=dayState.done.length;
  $('homeNote').textContent=`Today: ${done}/${BOARD_COUNT} boards mined`+(prospector?` · Prospector ×${prospector}`:'');
  show('home');
}
$('homeBtn').onclick=()=>showMap({});
$('mapBtn').onclick=()=>showMap({});
$('settingsBtn').onclick=()=>{ homeView('homeSettings'); setModeUI(); A.setScreen('settings'); };
$('settingsBack').onclick=()=>showHome();
$('privacyRow').hidden=!A.canConfigure(); $('shareData').checked=A.isOn(); $('verLine').textContent='Version '+(self.APP_VERSION||'dev');
$('shareData').addEventListener('change',e=>{ if(e.target.checked){ A.setOptOut(false); A.track('analytics_opt',{on:true}); } else { A.track('analytics_opt',{on:false}); A.setOptOut(true); } });
function setModeUI(){ $('modeRange').value=mode; document.querySelectorAll('.stops span').forEach(s=>s.classList.toggle('on',+s.dataset.i===mode)); $('modeDesc').textContent=MODES[mode].desc; }
$('modeRange').addEventListener('input',e=>{ mode=+e.target.value; A.track('setting_change',{setting:'difficulty',value:MODES[mode].name}); try{ localStorage.setItem('deepcore-mode',mode); }catch(err){} setModeUI(); });
(function homeStrip(){ const x=$('homeStrip').getContext('2d'); x.imageSmoothingEnabled=false;
  ['grass','stone','coal@stone','iron@deep','diamond@deep'].forEach((k,i)=>x.drawImage(TEX[k],i*16,0)); })();

// ---------- world map ----------
// node centres in tile units (10 tiles across): the first forest board on the surface, the rest dug into the dirt,
// then a winding mine down through each zone
const NODE_POS=[
  [1.6,5.4],[4.4,8.1],[7.3,9.9],[4.4,11.7],
  [8,15],[5,16.6],[2,18.2],[4.6,20.4],
  [2,24],[5,25.6],[8,27.2],[5.4,29.4],
  [8,33],[5,34.6],[2,36.2],[4.6,38.4],
  [2,42],[5,43.4],[8,44.8],[5,46.2],
];
const ZONE_TOP=[0,13,22,31,40], MAP_ROWS=49;
const unlocked=i=> i===0 || dayState.done.includes(i-1) || dayState.done.includes(i);
const zoneAt=row=> row<13?0 : row<22?1 : row<31?2 : row<40?3 : 4;
// a wall torch: wooden stick, layered flame, warm halo
function drawTorch(x,X,Y,ts){
  const u=ts/16;
  const g=x.createRadialGradient(X+8*u,Y+5*u,0,X+8*u,Y+5*u,ts*1.5); g.addColorStop(0,'rgba(255,190,90,.38)'); g.addColorStop(1,'rgba(255,150,40,0)');
  x.fillStyle=g; x.fillRect(X-ts,Y-ts,ts*3,ts*3);
  const P=(i,j,w,h,c)=>{ x.fillStyle=c; x.fillRect(X+i*u,Y+j*u,w*u,h*u); };
  P(7,7,2,8,'#7a5630'); P(8,7,1,8,'#5a3d20'); P(7,14,2,1,'#3a2610');
  P(6,6,4,2,'#3a2a1a');
  P(6,2,4,4,'#ff7a1a'); P(7,1,2,1,'#ff9a2a'); P(7,3,2,3,'#ffc23a'); P(7,4,2,1,'#fff2b0'); P(8,0,1,1,'#ffb23a');
}
// molten lava texture painted per pixel, with a bright surface edge
function drawLava(x,x0,y0,w,h,ts,R,edgeRow){
  const u=ts/8, pal=['#6a1406','#a8260c','#e4481a','#ff7a1f','#ffb23a','#ffe58a'];
  for(let j=0;j<Math.ceil(h*8);j++) for(let i=0;i<Math.ceil(w*8);i++){
    const X=x0+i*u/ts, Y=y0+j*u/ts; if(Y<edgeRow(X)) continue;
    const v=Math.sin(X*2.1+Y*3.3)+Math.sin(Y*1.4-X*1.1)*.8+Math.sin((X+Y)*4.7)*.35+(R()-.5)*.5;
    let k=Math.max(0,Math.min(5,Math.floor((v+2.2)/4.4*6)));
    if(Y-edgeRow(X)<.14) k=5;
    if(R()<.035) k=0;
    x.fillStyle=pal[k]; x.fillRect(X*ts,Y*ts,Math.ceil(u),Math.ceil(u));
  }
}
function drawMap(ts){
  const cv=$('mapCanvas'), W=10*ts, H=MAP_ROWS*ts;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px';
  const x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); x.imageSmoothingEnabled=false;
  const R=rng(hashStr('map'+dayState.day));
  // sky and clouds
  const sky=x.createLinearGradient(0,0,0,6*ts); sky.addColorStop(0,'#3d5a8a'); sky.addColorStop(1,'#a9c6d8');
  x.fillStyle=sky; x.fillRect(0,0,W,6*ts);
  x.fillStyle='rgba(255,255,255,.85)'; [[1,1.2,2.2],[6,.6,3],[4,2.4,1.6]].forEach(([a,b,w])=>{ x.fillRect(a*ts,b*ts,w*ts,ts*.35); x.fillRect((a+.3)*ts,(b-.25)*ts,(w-.6)*ts,ts*.3); });
  // tunnels between boards (everything below the grass)
  const tunnel=new Set();
  for(let i=1;i<NODE_POS.length;i++){ const [ax,ay]=NODE_POS[i-1], [bx2,by2]=NODE_POS[i];
    for(let s=0;s<=1;s+=.02){ const px=ax+(bx2-ax)*s, py=ay+(by2-ay)*s; if(py<6.9) continue;
      for(let dy=-.45;dy<=.45;dy+=.45) for(let dx=-.45;dx<=.45;dx+=.45) tunnel.add(Math.floor(py+dy)*10+Math.floor(px+dx)); } }
  for(let row=6;row<MAP_ROWS;row++) for(let col=0;col<10;col++){
    const zi=zoneAt(row);
    let tex = zi===0 ? (row===6?'grass':'dirt') : zi===1?'stone' : zi===2?'deep' : zi===3?'obsidian' : 'ember';
    const z=ZONES[zi]; if(zi>0 && R()<.12 && z.ores.length){ const o=z.ores[Math.floor(R()*z.ores.length)]; tex=o+'@'+z.rock; }
    x.drawImage(TEX[tex],col*ts,row*ts,ts,ts);
    x.fillStyle='rgba(0,0,0,.28)'; x.fillRect(col*ts,row*ts,ts,ts);
    if(tunnel.has(row*10+col)){ x.fillStyle = zi===0 ? 'rgba(26,16,9,.8)' : 'rgba(10,7,5,.82)'; x.fillRect(col*ts,row*ts,ts,ts); }
  }
  // roots dangling into the dirt tunnels
  for(let col=0;col<10;col++) if(R()<.5){ x.fillStyle='#4a3420'; const rx=(col+R()*.8)*ts; x.fillRect(rx,7*ts,ts*.06,ts*(.3+R()*.8)); }
  // trees on the surface
  [[0.4,3],[3,2.6],[5.2,3.2],[7.3,2.8],[9.4,3.3]].forEach(([tx,h])=>{
    const top=6-h; x.drawImage(TEX.log,(tx-.2)*ts,(top+1)*ts,ts*.4,(h-1)*ts);
    x.fillStyle='#2f6b22'; x.fillRect((tx-.9)*ts,(top-.2)*ts,1.8*ts,1.4*ts);
    x.fillStyle='#3f8a2c'; x.fillRect((tx-.7)*ts,(top-.5)*ts,1.4*ts,ts*.8);
    x.fillStyle='#57a83c'; x.fillRect((tx-.4)*ts,(top-.6)*ts,ts*.6,ts*.35); });
  // torches on rock walls beside each cave board (stone, deep stone, gem depths)
  for(let i=4;i<16;i++){ const [px,py]=NODE_POS[i];
    const spots=[[1,-1],[-1,-1],[1,0],[-1,0],[0,-1]];
    for(const [dx,dy] of spots){ const col=Math.floor(px)+dx, row=Math.floor(py)+dy;
      if(col<0||col>9||tunnel.has(row*10+col)||zoneAt(row)<1||zoneAt(row)>3) continue;
      drawTorch(x,col*ts,row*ts,ts); break; } }
  // the underworld: a glowing lava lake and a smaller pool
  const lake=X=>47.3+.28*Math.sin(X*1.3)+.12*Math.sin(X*3.1);
  const glow=x.createLinearGradient(0,45.4*ts,0,47.6*ts); glow.addColorStop(0,'rgba(255,120,30,0)'); glow.addColorStop(1,'rgba(255,120,30,.45)');
  x.fillStyle=glow; x.fillRect(0,45.4*ts,W,2.2*ts);
  drawLava(x,0,46.9,10,2.1,ts,R,lake);
  // dotted route
  x.strokeStyle='rgba(255,226,140,.75)'; x.lineWidth=Math.max(2,ts*.08); x.setLineDash([ts*.18,ts*.18]); x.beginPath();
  NODE_POS.forEach(([px,py],i)=>{ if(i===0) x.moveTo(px*ts,py*ts); else x.lineTo(px*ts,py*ts); }); x.stroke(); x.setLineDash([]);
}
function showMap(opts){
  if(screen==='game' && pieces && !opts.justDone){ saveBoard(); const tg=levelDef(level).target; A.track('board_leave',{idx:level-1,score,target:tg,pct:Math.round(100*score/tg),moves,over,duration_ms:Math.round(performance.now()-boardT0)}); }
  checkDay(); show('map'); $('nodeCard').hidden=true;
  const W=Math.min(window.innerWidth,520), ts=W/10;
  $('mapInner').style.width=W+'px'; $('mapInner').style.height=MAP_ROWS*ts+'px';
  drawMap(ts);
  const nodes=$('mapNodes'); nodes.innerHTML='';
  ZONES.forEach((z,zi)=>{ const lab=document.createElement('div'); lab.className='zlabel'; lab.textContent=z.name; lab.style.top=(ZONE_TOP[zi]+(zi===0?.4:.3))*ts+'px'; nodes.append(lab); });
  const sb=savedBoard();
  let current=-1;
  NODE_POS.forEach(([px,py],i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='node'; b.style.left=px*ts+'px'; b.style.top=py*ts+'px';
    const done=dayState.done.includes(i), open=unlocked(i);
    if(done) b.classList.add('done'); else if(open){ b.classList.add('open'); if(current<0) current=i; } else b.classList.add('locked');
    if(sb && sb.idx===i) b.classList.add('progress');
    if(opts.justDone===i) b.classList.add('fresh');
    b.innerHTML = done ? '<span>✓</span>' : open ? `<span>${i%BOARDS_PER_ZONE+1}</span>` : '<span class="lk"></span>';
    b.setAttribute('aria-label',`Board ${boardLabel(i)}${done?', mined':open?'':', locked'}`);
    b.onclick=()=>openCard(i);
    nodes.append(b);
  });
  const [py,pm,pd]=dayState.day.split('-').map(Number); $('mapDate').textContent=new Date(py,pm-1,pd).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
  $('mapProg').textContent=`${dayState.done.length}/${BOARD_COUNT} boards mined`;
  $('mapBadge').hidden=!prospector; $('mapBadge').textContent=`Prospector ×${prospector}`;
  const focus = opts.justDone!==undefined ? Math.min(BOARD_COUNT-1,opts.justDone+1) : (sb?sb.idx:(current<0?BOARD_COUNT-1:current));
  requestAnimationFrame(()=>{ const sc=$('mapScroll'); sc.scrollTop=Math.max(0,NODE_POS[focus][1]*ts - sc.clientHeight/2); });
  if(opts.prospector) setTimeout(showProspector,700);
}
function openCard(i){
  const def=boardDef(i), card=$('nodeCard'), done=dayState.done.includes(i), open=unlocked(i), sb=savedBoard();
  A.track('board_card_open',{idx:i,label:boardLabel(i),locked:!open,done}); if(!open) A.attempt('locked_board',i);
  $('ncZone').textContent=`${def.zoneName} · Board ${boardLabel(i)}`;
  $('ncName').textContent=def.name;
  const tier=tierOf(def.d); $('ncTier').textContent=tier; $('ncTier').dataset.t=tier;
  const g=$('ncGoals'); g.innerHTML='';
  const tgt=document.createElement('span'); tgt.className='tgt'; tgt.textContent=`Score ${def.target} to clear`; g.append(tgt);
  [...def.ores, ...Object.keys(def.gems||{})].forEach(res=>{ const s=document.createElement('span'); s.title=DROPS[res][0];
    const cv=document.createElement('canvas'); cv.width=cv.height=T; cv.getContext('2d').drawImage(ITEM[res],0,0); s.append(cv); g.append(s); });
  const go=$('ncGo'), note=$('ncNote');
  note.textContent='';
  if(!open){ go.disabled=true; go.textContent='Locked'; note.textContent=`Mine board ${boardLabel(i-1)} first.`; }
  else { go.disabled=false;
    go.textContent = (sb && sb.idx===i) ? 'Continue' : done ? 'Mine again' : 'Mine this board';
    if(done) note.textContent=`Mined today · ${dayState.scores[i]||0} points`;
    if(sb && sb.idx!==i) note.textContent=`Starting this board ends your run on ${boardLabel(sb.idx)}.`; }
  go.onclick=()=>{ $('nodeCard').hidden=true; const s2=savedBoard(); show('game');
    if(s2 && s2.idx===i){ if(s2.mode!==undefined && s2.mode!==mode){ mode=s2.mode; } restoreBoard(s2); } else { clearBoardSave(); startBoard(i); } };
  card.hidden=false;
}
$('ncClose').onclick=()=>{ $('nodeCard').hidden=true; };
$('mapHome').onclick=showHome;
function showProspector(){ $('prospector').hidden=false; $('pCount').textContent=`Earned ${prospector} time${prospector===1?'':'s'}`;
  [523,659,784,1047,1319,1568,2093].forEach((f,j)=>blip(f,.16,'triangle',.06,j*.09)); }
$('pOk').onclick=()=>{ $('prospector').hidden=true; };
(function medal(){ const x=$('pMedal').getContext('2d'); const P=(i,j,w,h,c)=>{ x.fillStyle=c; x.fillRect(i,j,w,h); };
  P(5,0,2,5,'#c0392b'); P(9,0,2,5,'#2a6fd6'); P(7,0,2,4,'#e8e8e8');
  P(4,5,8,8,'#d9a520'); P(5,4,6,10,'#d9a520'); P(5,5,6,8,'#f5c93c'); P(6,6,4,6,'#ffe08a');
  P(7,7,2,1,'#c2f4ff'); P(6,8,4,1,'#5cc8ee'); P(7,9,2,1,'#2a86b8'); P(7,10,1,1,'#0e3446'); P(6,5,1,1,'#ffffff'); })();

// ---------- drag ----------
let drag=null;
slots.forEach(s=>s.addEventListener('pointerdown',e=>{
  const i=+s.dataset.i; if(over||busy||uiOpen()||!pieces||!pieces[i]) return;
  e.preventDefault(); unlockAudio();
  const p=pieces[i]; drag={i,p,touch:e.pointerType!=='mouse',target:null,t0:performance.now(),x0:e.clientX,y0:e.clientY,moved:0,raw:null};
  ghost.width=p.w*cell*dpr; ghost.height=p.h*cell*dpr; ghost.style.width=p.w*cell+'px'; ghost.style.height=p.h*cell+'px';
  gx.setTransform(dpr,0,0,dpr,0,0); gx.clearRect(0,0,p.w*cell,p.h*cell); drawPiece(gx,p,cell);
  ghost.hidden=false; s.firstElementChild.style.opacity='0'; moveDrag(e);
}));
function moveDrag(e){
  if(!drag) return;
  // on touch the whole piece rides above the fingertip (bottom edge ~1 cell clear), centred on it, so both hands see all of it
  const p=drag.p;
  const gxp=e.clientX-p.w*cell/2, gyp=drag.touch ? e.clientY-cell*1.15-p.h*cell : e.clientY-p.h*cell/2;
  ghost.style.transform=`translate(${gxp}px,${gyp}px)`;
  const b=boardC.getBoundingClientRect();
  const c0=Math.round((gxp-b.left)/cell), r0=Math.round((gyp-b.top)/cell);
  drag.target = fitsAt(p,r0,c0) ? {r0,c0} : null; ghost.style.opacity=drag.target?'.3':'1'; drag.raw={r0,c0}; drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0));
}
window.addEventListener('pointermove',moveDrag);
function endDrag(cancelled){
  if(!drag) return; const d=drag; drag=null; ghost.hidden=true; ghost.style.opacity='1'; slots[d.i].firstElementChild.style.opacity='';
  if(cancelled===true){ A.track('drag_cancel',{sid:d.p.sid,touch:d.touch,drag_ms:Math.round(performance.now()-d.t0)}); return; }
  if(d.target){ place(d.i,d.target.r0,d.target.c0); return; }
  // released without a valid spot: a tap, a miss that was one cell away, or a drop outside the board
  const {r0,c0}=d.raw||{r0:0,c0:0}; let near=false;
  for(let dr=-1;dr<=1&&!near;dr++)for(let dc=-1;dc<=1&&!near;dc++) if(fitsAt(d.p,r0+dr,c0+dc)) near=true;
  const off=r0<-1||c0<-1||r0>N-d.p.h+1||c0>N-d.p.w+1;
  const kind=d.moved<10?'piece_tap':'drop_invalid';
  A.track(kind,{sid:d.p.sid,slot:d.i,touch:d.touch,reason:kind==='piece_tap'?'tap':off?'off_board':'blocked',near_valid:near,fits_somewhere:canPlaceAnywhere(d.p),r:r0,c:c0,drag_ms:Math.round(performance.now()-d.t0)});
  A.attempt('drop',d.p.sid+'@'+Math.round(r0/2)+','+Math.round(c0/2),{reason:off?'off_board':'blocked',near_valid:near});
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
function outlinePiece(ctx,p,ox,oy,cs,color,w){
  const set=new Set(p.cells.map(([r,c])=>r+','+c)); ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineJoin='round'; ctx.beginPath();
  p.cells.forEach(([r,c])=>{ const x=ox+c*cs, y=oy+r*cs;
    if(!set.has((r-1)+','+c)){ ctx.moveTo(x,y); ctx.lineTo(x+cs,y); } if(!set.has((r+1)+','+c)){ ctx.moveTo(x,y+cs); ctx.lineTo(x+cs,y+cs); }
    if(!set.has(r+','+(c-1))){ ctx.moveTo(x,y); ctx.lineTo(x,y+cs); } if(!set.has(r+','+(c+1))){ ctx.moveTo(x+cs,y); ctx.lineTo(x+cs,y+cs); } });
  ctx.stroke(); ctx.restore();
}
function render(now){
  now=now||0;
  const px=cell*N; bx.setTransform(dpr,0,0,dpr,0,0); bx.imageSmoothingEnabled=false; bx.clearRect(0,0,px,px);
  const pv = drag&&drag.target ? drag.target : null;
  const hl = pv ? previewLines(drag.p,pv.r0,pv.c0) : new Set();
  const glow=.45+.35*Math.sin(now/220), specials=[]; const scr=scrAnim;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const m0=grid[r][c], x=c*cell, y=r*cell; bx.drawImage(SLOT,x,y,cell,cell);
    const m = (scr && scr.targets.has(r*N+c)) ? null : m0;
    if(m){ bx.drawImage(texOf(m),x,y,cell,cell);
      if(MATS[m].kind==='special') specials.push([x,y,m,r,c]);
      if(hl.has(r*N+c)){ bx.fillStyle='rgba(255,230,170,.28)'; bx.fillRect(x,y,cell,cell); } }
  }
  specials.forEach(([x,y,m,r,c])=>drawSpecialGlow(bx,x,y,cell,m,now,r*N+c,glow));
  if(fuse){ const q=(now-fuse.t0)/420, x=fuse.c*cell, y=fuse.r*cell, s=cell*(1+.15*Math.sin(now/30)*q);
    bx.save(); bx.globalCompositeOperation='lighter'; const g=bx.createRadialGradient(x+cell/2,y+cell/2,0,x+cell/2,y+cell/2,cell*(1+q*1.4));
    g.addColorStop(0,`rgba(255,240,180,${.5+.5*q})`); g.addColorStop(1,'rgba(255,120,30,0)'); bx.fillStyle=g; bx.fillRect(x-cell*2,y-cell*2,cell*5,cell*5); bx.restore();
    bx.drawImage(TEX.blast,x+cell/2-s/2,y+cell/2-s/2,s,s); }
  if(boardFlash){ const q=(now-boardFlash.t0)/350; if(q>=1) boardFlash=null; else {
    bx.fillStyle=`rgba(255,230,160,${.7*(1-q)})`; bx.fillRect((boardFlash.c-1)*cell,(boardFlash.r-1)*cell,cell*3,cell*3); } }
  if(scr){ const t=Math.min(1,(now-scr.t0)/scr.D), e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    scr.moves.forEach(mv=>{ const x=(mv.fc+(mv.tc-mv.fc)*e)*cell, y=(mv.fr+(mv.tr-mv.fr)*e)*cell-Math.sin(Math.PI*t)*cell*.6*mv.lift;
      bx.drawImage(texOf(mv.m),x,y,cell,cell); });
    if(t>=1) scrAnim=null; }
  if(pv){ const pu=.75+.25*Math.sin(now/110);
    if(hl.size){ bx.fillStyle='rgba(255,226,110,.34)'; bx.strokeStyle=`rgba(255,250,200,${pu})`; bx.lineWidth=3;
      hl.forEach(k=>{ const r=Math.floor(k/N), c=k%N; bx.fillRect(c*cell,r*cell,cell,cell); bx.strokeRect(c*cell+2,r*cell+2,cell-4,cell-4); }); }
    bx.fillStyle='rgba(255,238,170,.4)'; drag.p.cells.forEach(([r,c])=>bx.fillRect((pv.c0+c)*cell,(pv.r0+r)*cell,cell,cell));
    drawPiece(bx,drag.p,cell,pv.c0*cell,pv.r0*cell,.92);
    outlinePiece(bx,drag.p,pv.c0*cell,pv.r0*cell,cell,'#000',Math.max(6,cell*.16));
    outlinePiece(bx,drag.p,pv.c0*cell,pv.r0*cell,cell,`rgba(255,250,215,${pu})`,Math.max(3,cell*.08)); }
  flashes=flashes.filter(f=>(f.life-=.06)>0);
  flashes.forEach(f=>{ bx.fillStyle=`rgba(255,240,200,${f.life*.7})`; bx.fillRect(f.c*cell,f.r*cell,cell,cell); });
  particles=particles.filter(q=>(q.life-=.022)>0);
  particles.forEach(q=>{ q.x+=q.vx; q.y+=q.vy; q.vy+=.35; bx.globalAlpha=Math.min(1,q.life*1.5); bx.fillStyle=q.col; bx.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s); });
  bx.globalAlpha=1; tickScore(); renderFx(now); requestAnimationFrame(render);
}

// ---------- boot ----------
function start(){
  loadProfile(); checkDay(); buildStash(); renderCrafted();
  grid=emptyGrid(); pieces=null; showHome();
  layout(); drawTray(); requestAnimationFrame(render);
  if(document.fonts&&document.fonts.load) Promise.all(['700 20px Silkscreen','600 16px "Barlow Semi Condensed"'].map(f=>document.fonts.load(f))).catch(()=>{});
}
// Test hooks exist only when the page is served from this machine with ?debug; they are never exposed on a published site.
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname) && /[?&]debug\b/.test(location.search)) window.__deepcore={TEX,MATS,ITEM,test:{
  place:(i,r,c)=>place(i,r,c), state:()=>({grid,pieces,score,busy,over,bank,crafted,dealt,screen,level,dayState}),
  fits:(p,r,c)=>fitsAt(p,r,c), setCell:(r,c,m)=>{grid[r][c]=m;}, setPieces:(ps)=>{pieces=ps; drawTray();},
  give:(b)=>{Object.assign(bank,b); updateStash();}, def:()=>levelDef(level), start:(i)=>{show('game'); startBoard(i);},
  setScore:(v)=>{score=v;}, allClearBonus, audioState:()=>ac?ac.state:'none',
}};
start();
})();
