// Game data: tables only, no DOM. Shared by the game, the tests and the simulator (tools/sim.mjs).
(function(root){
function rng(seed){ let s = seed>>>0 || 1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
function hashStr(s){ let h=2166136261; for(const ch of s){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
// Rates were tuned with tools/sim.mjs so a typical player mines enough coal and copper for most (not all) torch/lantern gates.
// Rarity: p = chance per piece that the piece carries this ore/gem · vein = cells it fills (always touching)
// Ore rarity: chance per piece that it carries this ore, and how many touching cells the vein fills.
// Emeralds and diamonds are handled per zone (rates and per-board caps live with the zones).
const ORES = {
  coal:{p:.185, vein:[1,3]}, copper:{p:.175, vein:[1,2]}, ruby:{p:.078, vein:[1,2]}, iron:{p:.033, vein:[1,2]}, gold:{p:.038, vein:[1,1]},
};
// Points for mining each block: deeper rock is worth more, ore far more, gems most
// Internal block ids keep their old names so saves stay valid: stone = limestone, deep = slate, obsidian = basalt, ember = magmastone.
const VAL = { grass:2, log:2, dirt:2, sand:2, stone:4, granite:5, deep:6, obsidian:8, ember:10,
  coal:15, copper:20, iron:30, ruby:30, gold:50, emerald:150, diamond:200 };
// Specials: per-piece chance by difficulty tier, and how often each type is picked
const SPECIAL_RATE = {Easy:0, Medium:.01, Hard:.02, Expert:.03};
const SPECIAL_MIX = {prism:.4, fossil:.32, treasure:.28}; // random-only specials; blast, sledgehammer, rescue and luck are craft-only

const DROPS = {
  dirt:['Topsoil','dirt'], sand:['Sand','sand'], wood:['Wood','log'], stone:['Limestone','stone'], granite:['Granite','granite'], deep:['Slate','deep'],
  ember:['Magmastone','ember'], obsidian:['Basalt','obsidian'],
  coal:['Coal','coal'], copper:['Copper','copper'], ruby:['Ruby','ruby'], iron:['Iron','iron'], gold:['Gold','gold'], diamond:['Diamond','diamond'], emerald:['Emerald','emerald'],
};
const tierOf=d=> d<.2?'Easy' : d<.5?'Medium' : d<.8?'Hard' : 'Expert';
// One row per zone. d: dealer difficulty from the zone's first board to its last; pre: starter blocks; target: score to clear board 1 (+growth per board)
const ZONES=[
  {name:'The Forest', rock:'stone', d:[0,.14], pre:[0,1], mixes:[{log:1,grass:1},{log:.7,grass:1,dirt:.5},{log:.5,dirt:2,grass:.6},{dirt:1}], ores:['coal'], oreFrom:{coal:1}, boost:{coal:1.9}, target:340, growth:.22,
   names:['Birch Glade','Mossy Hollow','Fern Ridge','Old Stump','Sandy Bank','Pine Clearing','Root Cellar','Brook Bend']},
  {name:'Limestone Caves', rock:'stone', d:[.22,.38], pre:[2,4], mixes:[{dirt:1,stone:1},{stone:2,dirt:.8},{stone:3,dirt:.5},{stone:6,dirt:.25}], ores:['coal','iron','copper'], boost:{coal:1.2,copper:1.3}, target:900,
   names:['Echo Tunnel','Coal Face','Drip Gallery','Lantern Shaft','Chalk Bend','Bat Roost','Iron Seam','Rubble Hall']},
  {name:'Granite Halls', rock:'granite', d:[.36,.52], pre:[4,6], mixes:[{stone:1,granite:1},{granite:2,stone:.8},{granite:3,stone:.5},{granite:6,stone:.25}], ores:['coal','copper','iron','ruby'], boost:{copper:1,coal:1}, target:1200,
   names:['Pink Vein','Mica Gallery','Feldspar Ledge','Granite Gate','Heavy Stone','Blush Hollow','Pillar Walk','Grey Atrium']},
  {name:'Slate Caverns', rock:'deep', d:[.5,.66], pre:[6,8], mixes:[{granite:1,deep:1},{deep:2,granite:.8},{deep:3,granite:.5},{deep:6,granite:.25}], ores:['coal','copper','ruby','iron','gold'], boost:{copper:.7,coal:.78}, target:1500, gems:{emerald:{p:.01,cap:1}, diamond:{p:.008,cap:1}},
   names:['Copper Vein','Silent Chasm','Red Seam','Gold Pocket','Slate Stair','Hollow Deep','Cinder Gallery','Pale Grotto']},
  {name:'Basalt Gem Depths', rock:'obsidian', d:[.64,.8], pre:[7,9], mixes:[{deep:1,obsidian:1},{obsidian:2,deep:.8},{obsidian:3,deep:.5},{obsidian:6,deep:.25}], ores:['coal','copper','iron','gold'], boost:{copper:.6,coal:.72}, target:1800, gems:{emerald:{p:.017,cap:2}, diamond:{p:.012,cap:2}},
   names:['Crystal Hollow','Glass Vault','Dark Facet','Star Pocket','Basalt Shelf','Emerald Run','Black Lens','Gem Cradle']},
  {name:'The Underworld', rock:'ember', d:[.83,.95], pre:[9,11], mixes:[{obsidian:1,ember:1},{ember:2,obsidian:.8},{ember:3,obsidian:.5},{ember:6,obsidian:.25}], ores:['coal','copper','ruby','iron','gold'], boost:{copper:.45,coal:.6}, target:2500, gems:{emerald:{p:.02,cap:2}, diamond:{p:.016,cap:2}},
   names:['Ember Gate','Ash Bridge','Magma Gallery','Ruby Spire','Cinder Throne','Molten Steps','Sulfur Hall','Flame Rift']},
];
const BOARDS_PER_ZONE=4, BOARD_COUNT=ZONES.length*BOARDS_PER_ZONE, STRIP_BASE=BOARD_COUNT;   // strip-mine boards are numbered BOARD_COUNT + zone
// Craftable specials (anvil). Never spawn randomly.
const RECIPES=[
  {m:'blast',      cost:{coal:12, iron:3},                                  desc:'Explodes when its line clears, breaking the 8 blocks around it and mining their ore.'},
  {m:'sledgehammer', cost:{copper:10, ruby:8, iron:8, gold:4},            desc:'Swing it to shake the remaining blocks into a fresh arrangement with no trapped gaps.'},
  {m:'rescue',     cost:{ruby:20, emerald:1},                           desc:'Used automatically on a cave-in: undoes your last placement and deals a fresh set of pieces.'},
  {m:'luck',       cost:{ruby:12, diamond:1},                           desc:'Tap to drink. For the next 7 sets, the dealer leans toward pieces that clear rows, columns, and even the whole board.'},
];
// Torches (forest) and lanterns (every deeper zone): two must be placed to open the fourth board of a zone.
const LIGHTS={ torch:{name:'Torch', plural:'torches', cost:{coal:10, wood:5}}, lantern:{name:'Lantern', plural:'lanterns', cost:{coal:20, copper:10}} };
const LIGHTS_NEEDED=2, lightKind=z=>z===0?'torch':'lantern';
// One twist per Pacific day, chosen from the date. They shift resources, never the rules of clearing a board.
const MODIFIERS=[
  {id:'gold_rush',    name:'Gold Rush',    desc:'Gold ore turns up 3 times as often today.',                                   ore:{gold:3}},
  {id:'ruby_rain',    name:'Ruby Rain',    desc:'Rubies are twice as common today.',                                            ore:{ruby:2}},
  {id:'gem_fever',    name:'Gem Fever',    desc:'Emeralds and diamonds are much more common today.',                            gemMul:1.8, gemCapAdd:1},
  {id:'treasure_day', name:'Treasure Day', desc:'Prism Stones, Fossils and Buried Treasure turn up 3 times as often.',          specialMul:3},
  {id:'coal_seams',   name:'Coal Seams',   desc:'Coal is 50% more common today.',                                               ore:{coal:1.5}},
  {id:'bright_lamps', name:'Bright Lamps', desc:'Torches and lanterns cost 25% less today.',                                    lightMul:.75},
];
const modifierFor=day=>MODIFIERS[hashStr('mod:'+day)%MODIFIERS.length];
// what a torch or lantern costs on a given day
const lightCost=(kind,mod)=>{ const m=(mod&&mod.lightMul)||1; return Object.fromEntries(Object.entries(LIGHTS[kind].cost).map(([k,v])=>[k,Math.ceil(v*m)])); };
// Stars: the clear itself is 1 star. 2 and 3 stars come from how much ore and gems you mined on the board ("yield"), so you
// cannot blaze through on combos alone. Each star after the first is worth 10% of the target in bonus points.
const YIELD_W={coal:1,copper:1,iron:2,ruby:2,gold:3,emerald:5,diamond:6};            // wood does not count: it is not mined ore
const yieldOf=got=>Object.entries(YIELD_W).reduce((t,[k,w])=>t+w*((got&&got[k])||0),0);
// [2 stars, 3 stars] on the first board of each zone, set from tools/stars.mjs (about 1.25x and 1.75x what a typical player has at the clear); later boards scale with their target
const STAR_YIELD=[[9,12],[20,28],[23,32],[26,36],[23,32],[36,50]];
const starsFromYield=(y,at)=>1+(y>=at[0]?1:0)+(y>=at[1]?1:0);
const starBonus=(stars,target)=>Math.max(0,stars-1)*Math.round(target*.1/10)*10;
// Combo bonuses also pay out ore: a multi-line clear, a long combo or an All Clear adds a share of the ore mined in that play.
const BONUS_LINES=[0,0,.25,.5,.75,1];
const bonusPct=(lines,combo,allClear)=>Math.min(1.5,BONUS_LINES[Math.min(lines,5)]+(combo>=5?.25:combo>=3?.1:0)+(allClear?1:0));
const RARE_GEMS=['emerald','diamond'];
function bonusOre(counts,pct){
  const out={}; if(pct<=0) return out;
  Object.keys(YIELD_W).forEach(k=>{ const v=(counts&&counts[k])||0; if(!v) return;
    let b=Math.round(v*pct); if(pct>=.5&&b<1) b=1; if(RARE_GEMS.includes(k)) b=Math.min(b,1); if(b>0) out[k]=b; });
  return out;
}
const STASH_KEYS=['wood','coal','iron','copper','gold','ruby','emerald','diamond'];
const GEM_KEYS=['ruby','emerald','diamond'];


const BASE_MATS=['grass','dirt','sand','log','stone','granite','deep','ember','obsidian'];   // bulk filler blocks (everything else on the board is ore, a gem or a special)
// Everything that defines a board from the zone table, shared by the game and the simulator
function boardParams(zi,j,mod){
  const z=ZONES[zi], f=j/(BOARDS_PER_ZONE-1);
  const oreBoost={...(z.boost||{})}; if(mod&&mod.ore) Object.entries(mod.ore).forEach(([k,v])=>{ oreBoost[k]=(oreBoost[k]||1)*v; });
  const gems={}; Object.entries(z.gems||{}).forEach(([k,g])=>{ gems[k]=mod&&mod.gemMul?{p:g.p*mod.gemMul,cap:g.cap+(mod.gemCapAdd||0)}:g; });
  const tg=Math.round(z.target*(1+(z.growth===undefined?.2:z.growth)*j)/10)*10, sc=tg/z.target;
  return { zone:zi, j, starAt:STAR_YIELD[zi].map(v=>Math.round(v*sc)), zoneName:z.name, rock:z.rock, base:z.mixes[j], ores:z.ores.filter(k=>((z.oreFrom&&z.oreFrom[k])||0)<=j), oreBoost, gems, specialMul:(mod&&mod.specialMul)||1,
    target:Math.round(z.target*(1+(z.growth===undefined?.2:z.growth)*j)/10)*10,
    d:Math.min(.97,z.d[0]+(z.d[1]-z.d[0])*f), pre:Math.round(z.pre[0]+(z.pre[1]-z.pre[0])*f) };
}
// Points for clearing n lines at once with a combo of c. Doubles and better pay extra (called Double / Triple / Quad / Mega).
const lineScore=(n,c)=> n*10*n*c + (n>=2 ? 25*n*(n-1) : 0);
const lineName=n=> n>=5?'Mega!' : n===4?'Quad!' : n===3?'Triple!' : n===2?'Double!' : '';
const api={MODIFIERS,modifierFor,lightCost,YIELD_W,yieldOf,STAR_YIELD,starsFromYield,starBonus,BONUS_LINES,bonusPct,bonusOre,lineScore,lineName,STRIP_BASE,GEM_KEYS,LIGHTS,LIGHTS_NEEDED,lightKind,boardParams,BASE_MATS,rng,hashStr,ORES,VAL,SPECIAL_RATE,SPECIAL_MIX,DROPS,tierOf,ZONES,BOARDS_PER_ZONE,BOARD_COUNT,RECIPES,STASH_KEYS};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreData=api;
})(typeof self!=='undefined'?self:globalThis);
