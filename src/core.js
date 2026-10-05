// Pure game rules: the bitboard, the move solver and the piece dealer. No DOM, so it also runs in Node (tools/sim.mjs, tests).
(function(root){
// Board = two 32-bit ints: lo holds rows 0–3, hi holds rows 4–7 (bit = row*8+col).
const SHAPE_STRS=['#','##','#/#','###','#/#/#','####','#/#/#/#','#####','#/#/#/#/#','##/##','###/###/###','###/###','##/##/##',
 '#./##','.#/##','##/#.','##/.#',
 '#../#../###','..#/..#/###','###/#../#..','###/..#/..#',
 '#./#./##','.#/.#/##','##/#./#.','##/.#/.#','###/#..','###/..#','#../###','..#/###',
 '###/.#.','.#./###','#./##/#.','.#/##/.#',
 '##./.##','.##/##.','#./##/.#','.#/##/#.',
 '#./.#','.#/#.',
 '#../.#./..#','..#/.#./#..'];   // the last two (3-block diagonals) were added later: ids only ever append
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

// ---------- piece families ----------
// Every rotation and mirror image of a shape is one "family". Weights are set per family and shared equally
// between its orientations, so no variant of a piece (an L, an S, a diagonal pair) is ever more common than its mirror.
function dihedralKey(cells){
  const norm=cs=>{ const mr=Math.min(...cs.map(x=>x[0])), mc=Math.min(...cs.map(x=>x[1])); return cs.map(([r,c])=>(r-mr)+','+(c-mc)).sort().join(';'); };
  const out=[]; let cur=cells;
  for(let k=0;k<4;k++){ cur=cur.map(([r,c])=>[c,-r]); out.push(norm(cur)); out.push(norm(cur.map(([r,c])=>[r,-c]))); }
  return out.sort()[0];
}
const FAM={}, FAMSIZE={};
SHAPES.forEach(s=>{ const k=dihedralKey(s.cells); s.fam=k; FAMSIZE[k]=(FAMSIZE[k]||0)+1; });
// how much each family is liked, on top of its size weight: the big 3x3 corner is dialled down, diagonal pairs are a gentle spice
const famBias=s=>{ const str=SHAPE_STRS[s.id];
  if(str==='#../#../###'||str==='..#/..#/###'||str==='###/#../#..'||str==='###/..#/..#') return .6;
  if(s.cells.length<=3 && s.h>1 && s.w>1 && s.cells.length===s.h && s.cells.length===s.w) return .7;   // diagonal pairs/triples
  if(str==='#./.#'||str==='.#/#.') return .75;
  return 1; };
const FAMW=SHAPES.map(s=>famBias(s)/Math.pow(FAMSIZE[s.fam],.7));
function sizeWeight(s,d){
  if(s.n===1) return .45*(1-d)+.08;
  if(s.n===2) return .8-.4*d;
  if(s.n<=4) return 1.2-.45*d;
  if(s.n===5) return .6+.8*d;
  if(s.n===6) return .3+1.0*d;
  return .12+1.1*d;
}

function pickIdx(ws,rnd=Math.random){ const tot=ws.reduce((a,b)=>a+b,0); if(tot<=0) return 0; let v=rnd()*tot; for(let i=0;i<ws.length;i++){ v-=ws[i]; if(v<=0) return i; } return ws.length-1; }
// How many ways a set should be placeable (any order), by difficulty. The floor keeps late boards from hinging on one lucky placement.
const TUNE={waysFloor:8,waysExp:.78,assistExp:1.5,mercy:1,mercyStart:.35};   // the dealer's fairness knobs (sim.mjs can override them)
const targetWays=d=>Math.max(TUNE.waysFloor,Math.pow(400,1-d*TUNE.waysExp));
// Dealer assistance: 1 on the easiest board, fading with difficulty
const assistOf=d=>Math.pow(1-d,TUNE.assistExp);
const BIG_SET=[['###/###/###'],['###/###','##/##/##'],['#####','#/#/#/#/#']];
const BIG_IDS=BIG_SET.map(o=>o.map(x=>SHAPE_STRS.indexOf(x)));
// opts: {luck:0..1 (Luck Tonic), rnd}
function chooseSet(lo,hi,d,opts={}){
  const rnd=opts.rnd||Math.random, luck=opts.luck||0;
  // mercy: the more crowded the board, the more the dealer leans toward sets that help (completing lines, fitting pockets)
  const fill=(pc(lo)+pc(hi))/64, mercy=TUNE.mercy*Math.max(0,Math.min(1,(fill-TUNE.mercyStart)/.3));
  const A0=assistOf(d), A=Math.max(A0+(1-A0)*mercy,luck?.8:0);
  const {boost,exact}=pocketInfo(lo,hi);
  const fits=SHAPES.map(s=>s.pl.some(p=>!(lo&p.lo)&&!(hi&p.hi)));
  const ws=SHAPES.map((s,i)=>fits[i]?sizeWeight(s,d)*FAMW[i]*Math.pow(boost[i],A):0);
  // "completers": shapes that finish a row/column right now, or exactly fill a pocket
  const cw=SHAPES.map(()=>0);
  SHAPES.forEach((s,i)=>{ if(!fits[i]) return; let bl=0;
    for(const p of s.pl){ if((lo&p.lo)||(hi&p.hi)) continue; const l=applyMove(lo,hi,p.lo,p.hi)[2]; if(l>bl) bl=l; }
    cw[i]=(bl?bl*bl*2:0)+(exact.has(i)?4:0); if(cw[i]) cw[i]*=(.5+sizeWeight(s,d))*FAMW[i]*3; });
  const hasC=cw.some(x=>x>0);
  const target=targetWays(d)*(luck?3:1)*(1+mercy*3); let best=null;
  // draw three pieces; a second piece from the same family is much less likely
  const sample=()=>{ const out=[], fams=new Set();
    for(let k=0;k<3;k++){
      const base=(hasC && rnd()<A*(k===0?.95:.55)) ? cw : ws;
      const w=base.map((x,i)=>fams.has(SHAPES[i].fam)?x*.3:x);
      const sh=SHAPES[pickIdx(w,rnd)]; out.push(sh); fams.add(sh.fam); }
    return out; };
  const tries=(needHealthy,K)=>{
    for(let k=0;k<K;k++){
      const set=sample();
      const res=solveCount(lo,hi,set,400,20000,needHealthy,A>.1);
      if(!res.count) continue;
      const cnt=res.exhausted?Math.max(res.count,250):res.count;
      const tight=-Math.abs(Math.log(cnt)-Math.log(target));
      const help=res.maxLines*(luck?2.2:1.4) + (res.allClear?(luck?16:10):0) + set.filter(s=>exact.has(s.id)).length*2.5 + (luck&&res.maxLines>0?14:0);
      const sc=(1-A)*tight + A*help + rnd()*(.3+.9*(1-A));
      if(!best||sc>best.sc) best={set,sc};
    }
  };
  tries(true, luck?60:(A>.3?36:30));
  if(d>.45 && (!best || best.sc<-1)){ SHAPES.forEach((s,i)=>{ if(s.n>=4) ws[i]*=1.8; }); tries(true,30); }
  if(!best) tries(false,26);
  if(!best){
    const small=SHAPES.filter((s,i)=>fits[i]&&s.n<=3);
    outer: for(const a of small) for(const b of small) for(const c of small){
      if(solveCount(lo,hi,[a,b,c],1,30000,false,false).count){ best={set:[a,b,c]}; break outer; } }
  }
  if(!best){ const f=SHAPES.filter((s,i)=>fits[i]); best={set:[0,1,2].map(()=>f.length?f[0]:SHAPES[0])}; }
  return best.set.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}
// ---------- dressing a piece with materials ----------
const D=(typeof require!=='undefined'&&typeof module!=='undefined')?require('./data.js'):root.DeepcoreData;
function pickWeighted(items,rnd=Math.random){ const tot=items.reduce((a,x)=>a+x.w,0); if(tot<=0) return null; let v=rnd()*tot; for(const x of items){ v-=x.w; if(v<=0) return x; } return items[items.length-1]; }
function pickBase(def,rnd=Math.random){ return pickWeighted(Object.entries(def.base).map(([k,w])=>({k,w})),rnd).k; }
function veinCells(s,mats,count,rnd=Math.random){
  const free=s.cells.map((_,i)=>i).filter(i=>D.BASE_MATS.includes(mats[i]));
  if(!free.length) return [];
  const out=[free[Math.floor(rnd()*free.length)]];
  while(out.length<count){
    const nb=free.filter(i=>!out.includes(i) && out.some(j=>Math.abs(s.cells[i][0]-s.cells[j][0])+Math.abs(s.cells[i][1]-s.cells[j][1])===1));
    if(!nb.length) break; out.push(nb[Math.floor(rnd()*nb.length)]);
  }
  return out;
}
// o: {rnd, dealt (gem counts so far this board, mutated), specialBlocked (a special is already in play), oreBoost:{ore:multiplier}}
function dressPiece(s,def,o={}){
  const rnd=o.rnd||Math.random, dealt=o.dealt||{}, boost=o.oreBoost||def.oreBoost||{};
  const base=pickBase(def,rnd), mats=s.cells.map(()=>base);
  for(const ore of def.ores){
    const {p,vein}=D.ORES[ore];
    if(rnd()<Math.min(.9,p*(boost[ore]||1))){ const count=vein[0]+Math.floor(rnd()*(vein[1]-vein[0]+1)); veinCells(s,mats,Math.min(count,s.n),rnd).forEach(i=>mats[i]=ore); }
  }
  for(const [g,{p,cap}] of Object.entries(def.gems||{})){
    if((dealt[g]||0)>=cap || rnd()>=p) continue;
    const c=veinCells(s,mats,1,rnd); if(c.length){ mats[c[0]]=g; dealt[g]=(dealt[g]||0)+1; }
  }
  const rate=D.SPECIAL_RATE[D.tierOf(def.d)];
  if(rate && !o.specialBlocked && rnd()<rate){
    mats[Math.floor(rnd()*s.n)]=pickWeighted(Object.entries(D.SPECIAL_MIX).map(([k,w])=>({k,w})),rnd).k;
  }
  return {cells:s.cells,h:s.h,w:s.w,mats,sid:s.id};
}
const api={TUNE,pickWeighted,pickBase,veinCells,dressPiece,N:8,NB,SHAPE_STRS,SHAPES,SHAPE_BY_KEY,CHECK3,FAMSIZE,FAMW,pc,ROWM,COLM,bitOf,getBit,applyMove,countHoles,hasLockedHole,healthy,solveCount,pocketInfo,
  sizeWeight,pickIdx,targetWays,assistOf,BIG_SET,BIG_IDS,chooseSet};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreCore=api;
})(typeof self!=='undefined'?self:globalThis);
