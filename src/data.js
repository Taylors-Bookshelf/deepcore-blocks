// Game data: tables only, no DOM. Shared by the game, the tests and the simulator (tools/sim.mjs).
(function(root){
function rng(seed){ let s = seed>>>0 || 1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
function hashStr(s){ let h=2166136261; for(const ch of s){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
// Ore rarity: p = chance per piece that the piece carries this ore, vein = how many touching cells it fills.
// Each zone multiplies these with its own `boost`; rates are tuned with tools/run.mjs (a whole descent with a typical player).
// Emeralds and diamonds are handled per zone (rates and per-board caps live with the zones).
const ORES = {
  coal:{p:.185, vein:[1,3]}, copper:{p:.175, vein:[1,2]}, ruby:{p:.078, vein:[1,2]}, iron:{p:.033, vein:[1,2]}, gold:{p:.038, vein:[1,1]},
  bone:{p:.12, vein:[1,2]}, meteorite:{p:.05, vein:[1,1]}, prismore:{p:.04, vein:[1,1]},
};
// Value of each block (deeper rock more, ore far more, gems most). Since v2.0.4 mining gives no points; VAL only ranks resources.
// Internal block ids keep their old names so saves stay valid: stone = limestone, deep = slate, obsidian = basalt, ember = magmastone.
const VAL = { grass:2, log:2, dirt:2, sand:2, stone:4, deep:5, granite:6, obsidian:8, ember:10, crust:12,
  coal:15, bone:15, copper:20, iron:30, ruby:30, gold:50, meteorite:60, prismore:80, emerald:150, diamond:200 };
// Specials: per-piece chance by difficulty tier, and how often each type is picked
const SPECIAL_RATE = {Easy:.003, Medium:.006, Hard:.012, Expert:.018};   // Easy is the Forest: rarer there, same contents
const SPECIAL_MIX = {fossil:.32, treasure:.28}; // random-only specials; blast, sledgehammer, rescue and luck are craft-only

const DROPS = {
  dirt:['Topsoil','dirt'], sand:['Sand','sand'], wood:['Wood','log'], stone:['Limestone','stone'], granite:['Granite','granite'], deep:['Slate','deep'],
  ember:['Magmastone','ember'], obsidian:['Basalt','obsidian'], crust:['Crust rock','crust'],
  coal:['Coal','coal'], copper:['Copper','copper'], ruby:['Ruby','ruby'], iron:['Iron','iron'], gold:['Gold','gold'], diamond:['Diamond','diamond'], emerald:['Emerald','emerald'],
  bone:['Bone','bone'], meteorite:['Meteorite','meteorite'], prismore:['Prism Ore','prismore'],
};
const tierOf=d=> d<.2?'Easy' : d<.5?'Medium' : d<.8?'Hard' : 'Expert';
// The descent: one row per layer, dug in order over several days. boards: how many boards the layer has (8 each since v2.1.0); d: dealer difficulty from its
// first board to its last; pre: starter blocks; mixes: base blocks, first board to last.
const ZONES=[
  {name:'The Forest', rock:'dirt', boards:8, d:[0,.14], pre:[0,1], mixes:[{log:1,grass:1},{log:.7,grass:1,dirt:.5},{log:.5,dirt:2,grass:.6},{dirt:1,log:.2}], ores:['bone','coal'], oreFrom:{coal:1}, boost:{coal:1.6,bone:.8}},
  {name:'Limestone Caves', rock:'stone', boards:8, d:[.2,.34], pre:[2,4], mixes:[{dirt:1,stone:1},{stone:2,dirt:.8},{stone:3,dirt:.5},{stone:6,dirt:.25}], ores:['coal','copper','ruby'], boost:{coal:1.1,copper:1.15}},
  {name:'Slate Caverns', rock:'deep', boards:8, d:[.32,.46], pre:[4,6], mixes:[{stone:1,deep:1},{deep:2,stone:.8},{deep:3,stone:.5},{deep:6,stone:.25}], ores:['coal','copper','iron','ruby'], boost:{iron:4.2,copper:.8,coal:.9}},
  {name:'Granite Halls', rock:'granite', boards:8, d:[.44,.58], pre:[5,7], mixes:[{deep:1,granite:1},{granite:2,deep:.8},{granite:3,deep:.5},{granite:6,deep:.25}], ores:['coal','iron','copper','ruby','gold'], boost:{coal:1.25,iron:4.3,copper:.6}, gems:{emerald:{p:.008,cap:1}}},
  {name:'Basalt Depths', rock:'obsidian', boards:8, d:[.56,.7], pre:[6,8], mixes:[{granite:1,obsidian:1},{obsidian:2,granite:.8},{obsidian:3,granite:.5},{obsidian:6,granite:.25}], ores:['coal','iron','gold','ruby','meteorite'], boost:{meteorite:1.85,iron:1.4,coal:.8}, gems:{emerald:{p:.014,cap:2}, diamond:{p:.01,cap:1}}},
  {name:'Magmastone', rock:'ember', boards:8, d:[.66,.76], pre:[7,9], mixes:[{obsidian:1,ember:1},{ember:2,obsidian:.6},{ember:4,obsidian:.3},{ember:6,obsidian:.15}], ores:['coal','iron','gold','ruby','prismore'], boost:{prismore:1.3,coal:.6}, gems:{emerald:{p:.016,cap:2}, diamond:{p:.012,cap:2}}},
  {name:'The Crust', rock:'crust', boards:8, d:[.82,.88], pre:[9,10], mixes:[{ember:1,crust:1},{crust:3,ember:.5},{crust:1}], ores:['iron','gold','prismore'], boost:{prismore:1.25,gold:.6}},
  {name:'Ancient Core', rock:'crust', boards:1, core:true, d:[0,0], pre:[0,0], mixes:[{crust:1}], ores:[]},
];
// board numbering: every board of the descent has one index, layer after layer
const Z_START=[]; { let n=0; ZONES.forEach((z,i)=>{ Z_START[i]=n; n+=z.boards; }); }
const BOARD_COUNT=ZONES.reduce((a,z)=>a+z.boards,0);
const CORE_IDX=BOARD_COUNT-1, CRUST_Z=6, MAGMA_Z=5;
const zoneOfIdx=i=>{ let z=0; for(let k=0;k<ZONES.length;k++) if(i>=Z_START[k]) z=k; return z; };
const jOfIdx=i=>i-Z_START[zoneOfIdx(i)];
const idxOf=(z,j)=>Z_START[z]+j;
// Tools: the pick you carry decides how deep you can dig. Layer z needs tool tier z (the Forest needs the branch tools you start with).
const TOOLS=[
  {id:'branch',  name:'Branch tools',       short:'Branch',       cost:{}},
  // v2.1.0: costs sized so a typical player needs a few replays per layer on top of its 8 boards (about 2 in the Forest, rising to
  // about 6 in Basalt), measured with tools/experiments/income.mjs. Digging straight down is rarely enough (backlog F-11 builds on this).
  {id:'bone',    name:'Bone tools',         short:'Bone',         cost:{bone:24, wood:6}},
  {id:'copper',  name:'Copper tools',       short:'Copper',       cost:{copper:50, wood:10}},
  {id:'iron',    name:'Iron tools',         short:'Iron',         cost:{iron:40, wood:10}},
  {id:'steel',   name:'Steel tools',        short:'Steel',        cost:{iron:45, coal:90}},
  {id:'galaxy',  name:'Galaxy Alloy tools', short:'Galaxy Alloy', cost:{meteorite:26, iron:15}},
];
const toolNeeded=z=>Math.min(z,TOOLS.length-1);
// Galaxy Alloy wears down in the deepest rock. Prism ore mends it: in Magmastone one prism ore mends it completely,
// in the Crust each one mends PRISM_MEND points; each prism ore in the stash mends STASH_MEND at the forge.
// TOOL_WEAR is off since v2.1.0: wear could break the tools in the Crust with no warning. Backlog F-9 brings durability back for every
// layer, with repairs on the board and no lost progress; the numbers below are the old Galaxy Alloy rule, kept until then.
const TOOL_WEAR=false;
const WEAR={ember:.04, crust:.62}, PRISM_MEND=7, STASH_MEND=12, DUR_MAX=100, DUR_AFTER_BREAK=60;
// Craftable specials (anvil). Never spawn randomly.
// Bone is mined only in the Forest; below it, bone comes from Fossils (FOSSIL_BONE), so potions stay scarce
const FOSSIL_BONE=[4,8];
// Buried Treasure: [resource, least, most, weight above Granite, weight from Granite down]; deep down gems lean high
const TREASURE=[['iron',5,9,.35,.22],['gold',4,7,.30,.24],['emerald',2,4,.20,.29],['diamond',1,3,.15,.25]];
// what a random special pays when it is mined: {k: resource, n: how many, pts}
function specialHaul(m,zi,rnd){
  rnd=rnd||Math.random; const pts=0;   // random specials pay resources only (no points)
  if(m==='fossil') return {k:'bone', n:FOSSIL_BONE[0]+Math.floor(rnd()*(FOSSIL_BONE[1]-FOSSIL_BONE[0]+1)), pts};
  const deep=zi>=3, rows=TREASURE.map(([k,lo,hi,a,b])=>({k,lo,hi,w:deep?b:a})), tot=rows.reduce((t,r)=>t+r.w,0);
  let u=rnd()*tot, pick=rows[rows.length-1]; for(const r of rows){ if((u-=r.w)<0){ pick=r; break; } }
  let v=rnd(); if(deep&&(pick.k==='emerald'||pick.k==='diamond')) v=Math.pow(v,.55);
  return {k:pick.k, n:pick.lo+Math.min(pick.hi-pick.lo,Math.floor(v*(pick.hi-pick.lo+1))), pts};
}
// how many deals a Potion of Luck lasts (v2.1.2: was 7)
const LUCK_DEALS=5;
const RECIPES=[
  {m:'blast',      cost:{coal:12, iron:3},                                  desc:'Drag it onto the board: it blows up a 3×3 patch and mines everything in it.'},
  {m:'sledgehammer', cost:{copper:10, ruby:8, iron:8, gold:4},            desc:'Drag it onto the board: it shakes the blocks into a fresh arrangement with no trapped gaps.'},
  {m:'rescue',     cost:{ruby:20, emerald:1, bone:4},                         desc:'Used automatically on a cave-in: undoes your last placement and deals a fresh set of pieces.'},
  {m:'luck',       cost:{ruby:12, bone:4},                                desc:'Tap to drink. For the next '+LUCK_DEALS+' deals, the dealer leans toward pieces that clear rows, columns, and even the whole board.'},
];
// One twist per Pacific day, chosen from the date. They shift resources, never the rules of clearing a board.
const MODIFIERS=[
  {id:'gold_rush',    name:'Gold Rush',    desc:'Gold ore turns up 3 times as often today.',                                   ore:{gold:3}},
  {id:'ruby_rain',    name:'Ruby Rain',    desc:'Rubies are twice as common today.',                                            ore:{ruby:2}},
  {id:'gem_fever',    name:'Gem Fever',    desc:'Emeralds and diamonds are much more common today.',                            gemMul:1.8, gemCapAdd:1},
  {id:'treasure_day', name:'Treasure Day', desc:'Fossils and Buried Treasure turn up 3 times as often today.',          specialMul:3},
  {id:'coal_seams',   name:'Coal Seams',   desc:'Coal is 50% more common today.',                                               ore:{coal:1.5}},
  {id:'forge_day',    name:'Forge Day',    desc:'Tools cost 25% less to forge today.',                                         toolMul:.75},
];
const modifierFor=day=>MODIFIERS[hashStr('mod:'+day)%MODIFIERS.length];
// what forging a tool costs on a given day
const toolCost=(tier,mod)=>{ const m=(mod&&mod.toolMul)||1; return Object.fromEntries(Object.entries(TOOLS[tier].cost).map(([k,v])=>[k,Math.ceil(v*m)])); };
// ---------- Scoring and stars (v2.0.4, I-15): points come from play, never from resources ----------
// Skill shows in multi-line clears (combo), clears in a row (streak) and All Clears; the 10 points a block are the same for everyone.
// Numbers set with tools/experiments/score2.mjs (bots on the real dealer); re-check them after playtests.
const SCORE={
  block:10,                       // every block placed
  line:100,                       // every line cleared
  combo:[0,0,250,600,1200],       // extra for clearing 2 / 3 / 4+ lines with one placement (Double, Triple, Quad)
  streakStep:50, streakMax:500,   // a clearing placement right after another: +50 for each clear in the run after the first, up to +500
  allClear:250,                   // the board emptied, on top of the clear's own points
  special:{blast:200, sledgehammer:350, luck:-150, rescue:-250},   // crafted specials; random specials pay resources only
};
const comboBonus=n=>n<2?0:SCORE.combo[Math.min(n,SCORE.combo.length-1)];
const streakBonus=st=>st<2?0:Math.min(SCORE.streakMax,SCORE.streakStep*(st-1));
// points for one placement: cells placed, lines it cleared, streak = clearing placements in a row including this one
function placePoints(cells,lines,streak,allClear){
  const p={block:SCORE.block*cells, line:SCORE.line*lines, combo:comboBonus(lines), streak:lines?streakBonus(streak):0, allClear:lines&&allClear?SCORE.allClear:0};
  p.total=p.block+p.line+p.combo+p.streak+p.allClear; return p;
}
// A board is a fixed number of deals (3 pieces each). Place them all and the board is done; a cave-in before that fails it.
const DEALS=[4,5,5,6,6,7,7,0];
// Star lines in board points, per layer. 1 star is the pass mark; 3 stars sits at a skilled player's median deep down; 2 halfway.
// Board 1-1 (the tutorial board) has a lower 1-star line so it can't realistically fail.
const STAR_LINES=[[900,1000,1100],[1350,1550,1700],[1500,1700,1850],[2050,2300,2550],[2100,2400,2750],[2500,3000,3550],[2700,3150,3600],[]];
const FIRST_BOARD_STARS=[700,1000,1100];
const starsFromScore=(score,at)=>at.reduce((n,v)=>n+(score>=v?1:0),0);
// each star after the first adds 10% of the 1-star line to the day's points when the board is banked
const starBonus=(stars,line1)=>Math.max(0,stars-1)*Math.round(line1*.1/10)*10;
// Resources: each board deals a fixed budget of ore and gems (no luck in how much, only in where). Whole numbers are certain, the
// fraction is a chance per board (0.4 emerald = a 40% chance of one). Today's twist multiplies it. Wood comes from logs, not the budget.
// Set from the average haul per board in v2.0.3 (tools/experiments/alloc.mjs), then checked with npm run test:balance (Forest bone and
// Basalt meteorite raised: a share of every budget stays on the board unmined), so tools take about as long to forge as before.
const ORE_BUDGET=[
  {coal:6, bone:3},
  {coal:8, copper:6, ruby:2.5},
  {coal:8, copper:5, iron:4.5, ruby:2.5},
  {coal:11, iron:5, copper:4, ruby:2.5, gold:1, emerald:.2},
  {coal:8, iron:3, gold:1, ruby:2, meteorite:2.6, emerald:.4, diamond:.3},
  {coal:6, iron:1, gold:1, ruby:2.5, prismore:1.2, emerald:.5, diamond:.35},
  {iron:1, gold:.5, prismore:1},
  {},
];
const STAR_ORES=['coal','bone','copper','iron','ruby','gold','meteorite','prismore','emerald','diamond'];   // the ores and gems (not wood or rock)
const STASH_KEYS=['wood','bone','coal','copper','iron','gold','meteorite','prismore','ruby','emerald','diamond'];
const GEM_KEYS=['ruby','emerald','diamond'];


const BASE_MATS=['grass','dirt','sand','log','stone','granite','deep','ember','obsidian','crust'];   // bulk filler blocks (everything else on the board is ore, a gem or a special)
// Everything that defines a board from the zone table, shared by the game and the simulator
function boardParams(zi,j,mod){
  const z=ZONES[zi], n=z.boards, f=n>1?j/(n-1):0;
  const oreBoost={...(z.boost||{})}; if(mod&&mod.ore) Object.entries(mod.ore).forEach(([k,v])=>{ oreBoost[k]=(oreBoost[k]||1)*v; });
  const gems={}; Object.entries(z.gems||{}).forEach(([k,g])=>{ gems[k]=mod&&mod.gemMul?{p:g.p*mod.gemMul,cap:g.cap+(mod.gemCapAdd||0)}:g; });
  const ores=z.ores.filter(k=>((z.oreFrom&&z.oreFrom[k])||0)<=j);
  // this board's ore budget: only what the board can carry, times today's twist
  const budget={}; Object.entries(ORE_BUDGET[zi]||{}).forEach(([k,v])=>{ const gem=!!(z.gems&&z.gems[k]); if(!ores.includes(k)&&!gem) return;
    budget[k]=v*(gem?((mod&&mod.gemMul)||1):((mod&&mod.ore&&mod.ore[k])||1)); });
  const base=z.mixes[Math.min(z.mixes.length-1,Math.round(f*(z.mixes.length-1)))];
  const starAt=z.core?[]:(zi===0&&j===0?FIRST_BOARD_STARS:STAR_LINES[zi]).slice();
  return { zone:zi, j, starAt, deals:DEALS[zi], budget, zoneName:z.name, rock:z.rock, base, ores, oreBoost, gems, specialMul:(mod&&mod.specialMul)||1,
    target:starAt[0]||0, core:!!z.core, d:Math.min(.97,z.d[0]+(z.d[1]-z.d[0])*f), pre:Math.round(z.pre[0]+(z.pre[1]-z.pre[0])*f) };
}
const lineName=n=> n>=5?'Mega!' : n===4?'Quad!' : n===3?'Triple!' : n===2?'Double!' : '';
const api={TOOL_WEAR,LUCK_DEALS,SCORE,comboBonus,streakBonus,placePoints,DEALS,STAR_LINES,FIRST_BOARD_STARS,starsFromScore,ORE_BUDGET,FOSSIL_BONE,TREASURE,specialHaul,MODIFIERS,modifierFor,toolCost,TOOLS,toolNeeded,WEAR,PRISM_MEND,STASH_MEND,DUR_MAX,DUR_AFTER_BREAK,Z_START,CORE_IDX,CRUST_Z,MAGMA_Z,zoneOfIdx,jOfIdx,idxOf,STAR_ORES,starBonus,lineName,GEM_KEYS,boardParams,BASE_MATS,rng,hashStr,ORES,VAL,SPECIAL_RATE,SPECIAL_MIX,DROPS,tierOf,ZONES,BOARD_COUNT,RECIPES,STASH_KEYS};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreData=api;
})(typeof self!=='undefined'?self:globalThis);
