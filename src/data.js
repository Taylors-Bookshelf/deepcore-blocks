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
// Points for mining each block: deeper rock is worth more, ore far more, gems most
// Internal block ids keep their old names so saves stay valid: stone = limestone, deep = slate, obsidian = basalt, ember = magmastone.
const VAL = { grass:2, log:2, dirt:2, sand:2, stone:4, deep:5, granite:6, obsidian:8, ember:10, crust:12,
  coal:15, bone:15, copper:20, iron:30, ruby:30, gold:50, meteorite:60, prismore:80, emerald:150, diamond:200 };
// Specials: per-piece chance by difficulty tier, and how often each type is picked
const SPECIAL_RATE = {Easy:0, Medium:.01, Hard:.02, Expert:.03};
const SPECIAL_MIX = {prism:.4, fossil:.32, treasure:.28}; // random-only specials (prism = the Geode); blast, sledgehammer, rescue and luck are craft-only

const DROPS = {
  dirt:['Topsoil','dirt'], sand:['Sand','sand'], wood:['Wood','log'], stone:['Limestone','stone'], granite:['Granite','granite'], deep:['Slate','deep'],
  ember:['Magmastone','ember'], obsidian:['Basalt','obsidian'], crust:['Crust rock','crust'],
  coal:['Coal','coal'], copper:['Copper','copper'], ruby:['Ruby','ruby'], iron:['Iron','iron'], gold:['Gold','gold'], diamond:['Diamond','diamond'], emerald:['Emerald','emerald'],
  bone:['Bone','bone'], meteorite:['Meteorite','meteorite'], prismore:['Prism Ore','prismore'],
};
const tierOf=d=> d<.2?'Easy' : d<.5?'Medium' : d<.8?'Hard' : 'Expert';
// The descent: one row per layer, dug in order over several days. boards: how many boards the layer has; d: dealer difficulty from its
// first board to its last; pre: starter blocks; target: score to clear its first board (+growth per board); mixes: base blocks, first board to last.
const ZONES=[
  {name:'The Forest', rock:'dirt', boards:4, d:[0,.14], pre:[0,1], mixes:[{log:1,grass:1},{log:.7,grass:1,dirt:.5},{log:.5,dirt:2,grass:.6},{dirt:1,log:.2}], ores:['bone','coal'], oreFrom:{coal:1}, boost:{coal:1.6,bone:1.4}, target:340, growth:.22,
   names:['Birch Glade','Mossy Hollow','Fern Ridge','Old Stump','Sandy Bank','Pine Clearing','Root Cellar','Brook Bend']},
  {name:'Limestone Caves', rock:'stone', boards:6, d:[.2,.34], pre:[2,4], mixes:[{dirt:1,stone:1},{stone:2,dirt:.8},{stone:3,dirt:.5},{stone:6,dirt:.25}], ores:['coal','copper','ruby'], boost:{coal:1.1,copper:1.15}, target:800, growth:.14,
   names:['Echo Tunnel','Coal Face','Drip Gallery','Lantern Shaft','Chalk Bend','Bat Roost','Copper Seam','Rubble Hall']},
  {name:'Slate Caverns', rock:'deep', boards:6, d:[.32,.46], pre:[4,6], mixes:[{stone:1,deep:1},{deep:2,stone:.8},{deep:3,stone:.5},{deep:6,stone:.25}], ores:['coal','copper','iron','ruby'], boost:{iron:4.2,copper:.8,coal:.9}, target:1050, growth:.12,
   names:['Split Seam','Silent Chasm','Iron Stair','Grey Shelf','Slate Stair','Hollow Deep','Layer Walk','Pale Grotto']},
  {name:'Granite Halls', rock:'granite', boards:6, d:[.44,.58], pre:[5,7], mixes:[{deep:1,granite:1},{granite:2,deep:.8},{granite:3,deep:.5},{granite:6,deep:.25}], ores:['coal','iron','copper','ruby','gold'], boost:{coal:1.25,iron:4.3,copper:.6}, target:1300, growth:.12, gems:{emerald:{p:.008,cap:1}},
   names:['Pink Vein','Mica Gallery','Feldspar Ledge','Granite Gate','Heavy Stone','Blush Hollow','Pillar Walk','Grey Atrium']},
  {name:'Basalt Depths', rock:'obsidian', boards:6, d:[.56,.7], pre:[6,8], mixes:[{granite:1,obsidian:1},{obsidian:2,granite:.8},{obsidian:3,granite:.5},{obsidian:6,granite:.25}], ores:['coal','iron','gold','ruby','meteorite'], boost:{meteorite:1.85,iron:1.4,coal:.8}, target:1550, growth:.12, gems:{emerald:{p:.014,cap:2}, diamond:{p:.01,cap:1}},
   names:['Column Hall','Glass Vault','Star Fall','Dark Facet','Basalt Shelf','Sky Iron','Black Lens','Comet Cradle']},
  {name:'Magmastone', rock:'ember', boards:30, camps:[10,20], d:[.66,.76], pre:[7,9], mixes:[{obsidian:1,ember:1},{ember:2,obsidian:.6},{ember:4,obsidian:.3},{ember:6,obsidian:.15}], ores:['coal','gold','ruby','prismore'], boost:{prismore:1.3,coal:.6}, target:1900, growth:.015, gems:{emerald:{p:.016,cap:2}, diamond:{p:.012,cap:2}},
   names:['Ember Gate','Ash Bridge','Magma Gallery','Ruby Spire','Cinder Throne','Molten Steps','Sulfur Hall','Flame Rift','Glow Vault','Prism Lode','Heat Shimmer','Lava Lattice']},
  {name:'The Crust', rock:'crust', boards:3, d:[.82,.88], pre:[9,10], mixes:[{ember:1,crust:1},{crust:3,ember:.5},{crust:1}], ores:['gold','prismore'], boost:{prismore:1.25,gold:.6}, target:2300, growth:.06,
   names:['Searing Gate','White Heat','Last Wall']},
  {name:'Ancient Core', rock:'crust', boards:1, core:true, d:[0,0], pre:[0,0], mixes:[{crust:1}], ores:[], target:0, names:['The Ancient Core']},
];
// board numbering: every board of the descent has one index, layer after layer
const Z_START=[]; { let n=0; ZONES.forEach((z,i)=>{ Z_START[i]=n; n+=z.boards; }); }
const BOARD_COUNT=ZONES.reduce((a,z)=>a+z.boards,0), STRIP_BASE=BOARD_COUNT;   // side tunnels are numbered BOARD_COUNT + layer
const CORE_IDX=BOARD_COUNT-1, CRUST_Z=6, MAGMA_Z=5;
const zoneOfIdx=i=>{ if(i>=STRIP_BASE) return i-STRIP_BASE; let z=0; for(let k=0;k<ZONES.length;k++) if(i>=Z_START[k]) z=k; return z; };
const jOfIdx=i=>i-Z_START[zoneOfIdx(i)];
const idxOf=(z,j)=>Z_START[z]+j;
// Tools: the pick you carry decides how deep you can dig. Layer z needs tool tier z (the Forest needs the branch tools you start with).
const TOOLS=[
  {id:'branch',  name:'Branch tools',       short:'Branch',       cost:{}},
  {id:'bone',    name:'Bone tools',         short:'Bone',         cost:{bone:12, wood:6}},
  {id:'copper',  name:'Copper tools',       short:'Copper',       cost:{copper:20, wood:10}},
  {id:'iron',    name:'Iron tools',         short:'Iron',         cost:{iron:20, wood:10}},
  {id:'steel',   name:'Steel tools',        short:'Steel',        cost:{iron:25, coal:25}},
  {id:'galaxy',  name:'Galaxy Alloy tools', short:'Galaxy Alloy', cost:{meteorite:15, iron:10}},
];
const toolNeeded=z=>Math.min(z,TOOLS.length-1);
// Galaxy Alloy wears down in the deepest rock. Prism ore mends it: in Magmastone one prism ore mends it completely,
// in the Crust each one mends PRISM_MEND points; each prism ore in the stash mends STASH_MEND at the forge.
const WEAR={ember:.04, crust:.62}, PRISM_MEND=7, STASH_MEND=12, DUR_MAX=100, DUR_AFTER_BREAK=60;
// Craftable specials (anvil). Never spawn randomly.
const RECIPES=[
  {m:'blast',      cost:{coal:12, iron:3},                                  desc:'Explodes when its line clears, breaking the 8 blocks around it and mining their ore.'},
  {m:'sledgehammer', cost:{copper:10, ruby:8, iron:8, gold:4},            desc:'Swing it to shake the remaining blocks into a fresh arrangement with no trapped gaps.'},
  {m:'rescue',     cost:{ruby:20, emerald:1},                           desc:'Used automatically on a cave-in: undoes your last placement and deals a fresh set of pieces.'},
  {m:'luck',       cost:{ruby:12, diamond:1},                           desc:'Tap to drink. For the next 7 sets, the dealer leans toward pieces that clear rows, columns, and even the whole board.'},
];
// One twist per Pacific day, chosen from the date. They shift resources, never the rules of clearing a board.
const MODIFIERS=[
  {id:'gold_rush',    name:'Gold Rush',    desc:'Gold ore turns up 3 times as often today.',                                   ore:{gold:3}},
  {id:'ruby_rain',    name:'Ruby Rain',    desc:'Rubies are twice as common today.',                                            ore:{ruby:2}},
  {id:'gem_fever',    name:'Gem Fever',    desc:'Emeralds and diamonds are much more common today.',                            gemMul:1.8, gemCapAdd:1},
  {id:'treasure_day', name:'Treasure Day', desc:'Prism Stones, Fossils and Buried Treasure turn up 3 times as often.',          specialMul:3},
  {id:'coal_seams',   name:'Coal Seams',   desc:'Coal is 50% more common today.',                                               ore:{coal:1.5}},
  {id:'forge_day',    name:'Forge Day',    desc:'Tools cost 25% less to forge today.',                                         toolMul:.75},
];
const modifierFor=day=>MODIFIERS[hashStr('mod:'+day)%MODIFIERS.length];
// what forging a tool costs on a given day
const toolCost=(tier,mod)=>{ const m=(mod&&mod.toolMul)||1; return Object.fromEntries(Object.entries(TOOLS[tier].cost).map(([k,v])=>[k,Math.ceil(v*m)])); };
// Stars: the clear itself is 1 star. 2 and 3 stars come from how much ore and gems you mined on the board ("yield"), so you
// cannot blaze through on combos alone. Each star after the first is worth 10% of the target in bonus points.
const YIELD_W={coal:1,bone:1,copper:1,iron:2,ruby:2,gold:3,meteorite:3,prismore:4,emerald:5,diamond:6};            // wood does not count: it is not mined ore
// a board with no ore at all (the first Forest board) counts wood instead, so its stars are still reachable
const yieldOf=(got,wood)=>Object.entries(YIELD_W).reduce((t,[k,w])=>t+w*((got&&got[k])||0),0)+(wood?((got&&got.wood)||0):0);
const WOOD_STARS=[30,42];                                                             // [2 stars, 3 stars] in wood on an ore-free board
// [2 stars, 3 stars] on the first board of each zone, set from tools/stars.mjs (about 1.25x and 1.75x what a typical player has at the clear); later boards scale with their target
const STAR_YIELD=[[8,12],[20,27],[25,35],[34,48],[29,41],[28,39],[9,12],[0,0]];
const starsFromYield=(y,at)=>1+(y>=at[0]?1:0)+(y>=at[1]?1:0);
const starBonus=(stars,target)=>Math.max(0,stars-1)*Math.round(target*.1/10)*10;
// Combo bonuses also pay out ore: a multi-line clear, a long combo or an All Clear adds a share of the ore mined in that play.
const BONUS_LINES=[0,0,.25,.5,.75,1];
const bonusPct=(lines,combo,allClear)=>Math.min(1.5,BONUS_LINES[Math.min(lines,5)]+(combo>=5?.25:combo>=3?.1:0)+(allClear?1:0));
const RARE_GEMS=['emerald','diamond'];
function bonusOre(counts,pct,wood){
  const out={}; if(pct<=0) return out;
  [...Object.keys(YIELD_W),...(wood?['wood']:[])].forEach(k=>{ const v=(counts&&counts[k])||0; if(!v) return;
    let b=Math.round(v*pct); if(pct>=.5&&b<1) b=1; if(RARE_GEMS.includes(k)) b=Math.min(b,1); if(b>0) out[k]=b; });
  return out;
}
const STASH_KEYS=['wood','bone','coal','copper','iron','gold','meteorite','prismore','ruby','emerald','diamond'];
const GEM_KEYS=['ruby','emerald','diamond'];


const BASE_MATS=['grass','dirt','sand','log','stone','granite','deep','ember','obsidian','crust'];   // bulk filler blocks (everything else on the board is ore, a gem or a special)
// Everything that defines a board from the zone table, shared by the game and the simulator
function boardParams(zi,j,mod){
  const z=ZONES[zi], n=z.boards, f=n>1?j/(n-1):0;
  const oreBoost={...(z.boost||{})}; if(mod&&mod.ore) Object.entries(mod.ore).forEach(([k,v])=>{ oreBoost[k]=(oreBoost[k]||1)*v; });
  const gems={}; Object.entries(z.gems||{}).forEach(([k,g])=>{ gems[k]=mod&&mod.gemMul?{p:g.p*mod.gemMul,cap:g.cap+(mod.gemCapAdd||0)}:g; });
  const tg=Math.round(z.target*(1+(z.growth===undefined?.2:z.growth)*j)/10)*10, sc=z.target?tg/z.target:1;
  const ores=z.ores.filter(k=>((z.oreFrom&&z.oreFrom[k])||0)<=j), starWood=!ores.length&&!Object.keys(z.gems||{}).length&&!z.core;
  const base=z.mixes[Math.min(z.mixes.length-1,Math.round(f*(z.mixes.length-1)))];
  return { zone:zi, j, starWood, starAt:starWood?WOOD_STARS.slice():STAR_YIELD[zi].map(v=>Math.round(v*sc)), zoneName:z.name, rock:z.rock, base, ores, oreBoost, gems, specialMul:(mod&&mod.specialMul)||1,
    target:tg, core:!!z.core, d:Math.min(.97,z.d[0]+(z.d[1]-z.d[0])*f), pre:Math.round(z.pre[0]+(z.pre[1]-z.pre[0])*f) };
}
// Points for clearing n lines at once with a combo of c. Doubles and better pay extra (called Double / Triple / Quad / Mega).
const lineScore=(n,c)=> n*10*n*c + (n>=2 ? 25*n*(n-1) : 0);
const lineName=n=> n>=5?'Mega!' : n===4?'Quad!' : n===3?'Triple!' : n===2?'Double!' : '';
const api={MODIFIERS,modifierFor,toolCost,TOOLS,toolNeeded,WEAR,PRISM_MEND,STASH_MEND,DUR_MAX,DUR_AFTER_BREAK,Z_START,CORE_IDX,CRUST_Z,MAGMA_Z,zoneOfIdx,jOfIdx,idxOf,YIELD_W,yieldOf,WOOD_STARS,STAR_YIELD,starsFromYield,starBonus,BONUS_LINES,bonusPct,bonusOre,lineScore,lineName,STRIP_BASE,GEM_KEYS,boardParams,BASE_MATS,rng,hashStr,ORES,VAL,SPECIAL_RATE,SPECIAL_MIX,DROPS,tierOf,ZONES,BOARD_COUNT,RECIPES,STASH_KEYS};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreData=api;
})(typeof self!=='undefined'?self:globalThis);
