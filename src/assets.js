// Sprite loader. The design package's 16x16 PNGs are loaded before the game starts (index.html loads game.js once `ready` resolves).
// If an image is missing or fails, game.js falls back to its own procedural art for that sprite.
(function(){
const NAMES=['blocks/topsoil','blocks/wood-bark','blocks/limestone','blocks/granite','blocks/slate','blocks/basalt','blocks/magmastone',
  'ores/coal','ores/iron','ores/copper','ores/gold','gems/ruby','gems/emerald','gems/diamond','specials/blast-charge','specials/sledgehammer','ui/anvil'];
const A={ img:{}, names:NAMES };
A.ready=Promise.all(NAMES.map(n=>new Promise(res=>{ const i=new Image(); i.onload=()=>{ A.img[n]=i; res(); }; i.onerror=()=>res(); i.src='assets/'+n+'.png'; })));
window.DeepcoreAssets=A;
})();
