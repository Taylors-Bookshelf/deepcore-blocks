// Meta-game helpers: lifetime rank, streaks, the Pacific-midnight countdown, the share text, save codes, the discovery log catalogue
// and the ambient music engine. Pure logic (no DOM), so it also runs in Node for tests.
(function(root){
const D=(typeof require!=='undefined'&&typeof module!=='undefined')?require('./data.js'):root.DeepcoreData;

// ---------- lifetime rank ----------
const RANKS=[
  {name:'Rookie Miner',  at:0},
  {name:'Pick Swinger',  at:5000},
  {name:'Tunnel Digger', at:20000},
  {name:'Vein Finder',   at:60000},
  {name:'Deep Delver',   at:150000},
  {name:'Gem Hunter',    at:350000},
  {name:'Core Master',   at:750000},
];
function rankFor(points){
  let i=0; RANKS.forEach((r,k)=>{ if(points>=r.at) i=k; });
  const cur=RANKS[i], next=RANKS[i+1]||null;
  return {index:i, name:cur.name, next:next?next.name:null, toNext:next?next.at-points:0, progress:next?(points-cur.at)/(next.at-cur.at):1};
}

// ---------- the profile that lasts across days ----------
const newLife=()=>({v:1, firstDay:'', days:0, points:0, cleared:0, stars:0, caveIns:0, specialsCrafted:0, hints:0,
  streak:{cur:0,best:0,last:''}, mined:{}, seen:{}, zones:{}, twists:{}, tutorialDone:false,
  records:{bestBoard:0,bestCombo:0,bestLines:0,bestDay:0}});
const prevDay=day=>{ const [y,m,d]=day.split('-').map(Number); const t=new Date(Date.UTC(y,m-1,d)); t.setUTCDate(t.getUTCDate()-1); return t.toISOString().slice(0,10); };
// a day counts for the streak once you clear a board; consecutive Pacific days extend it
function touchStreak(life,today){
  const s=life.streak; if(s.last===today) return s;
  s.cur=(s.last===prevDay(today))?s.cur+1:1; s.last=today; if(s.cur>s.best) s.best=s.cur; return s;
}
// what the streak shows right now: it lapses if you did not clear anything yesterday or today
const streakNow=(life,today)=>{ const s=life.streak; return (s.last===today||s.last===prevDay(today))?s.cur:0; };

// ---------- time until the daily reset (midnight Pacific) ----------
const PT=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
function msUntilReset(now=new Date()){
  const p=Object.fromEntries(PT.formatToParts(now).map(x=>[x.type,x.value])); const sec=(+p.hour)*3600+(+p.minute)*60+(+p.second);
  return (86400-sec)*1000;
}
function resetText(now){ const ms=msUntilReset(now), h=Math.floor(ms/3600000), m=Math.floor(ms%3600000/60000); return h>0?`${h}h ${m}m`:`${Math.max(1,m)}m`; }

// ---------- the share text (a little grid of how the day went) ----------
const SQ={0:'⬛',1:'🟫',2:'🟧',3:'🟨'};
function shareText({day,mod,dayState,total,streak,url}){
  const st=dayState.stars||{}, rows=[];
  for(let z=0;z<D.ZONES.length;z++){ let row=''; for(let j=0;j<4;j++){ const i=z*4+j; row+=SQ[dayState.done.includes(i)?Math.max(1,st[i]||1):0]; } rows.push(row); }
  const [y,m,d]=day.split('-').map(Number), when=new Date(Date.UTC(y,m-1,d)).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  const head=`Deepcore Blocks · ${when}`;
  const line2=`${dayState.done.length}/${D.BOARD_COUNT} boards · ${total.toLocaleString()} pts`+(streak>1?` · ${streak}-day streak`:'');
  return [head,line2,`Twist: ${mod.name}`,...rows,url].join('\n');
}

// ---------- save codes: back up progress by copying a string, restore it on another device ----------
const b64=s=>typeof btoa==='function'?btoa(unescape(encodeURIComponent(s))):Buffer.from(s,'utf8').toString('base64');
const unb64=s=>typeof atob==='function'?decodeURIComponent(escape(atob(s))):Buffer.from(s,'base64').toString('utf8');
const sum=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(36); };
function encodeSave(data){ const body=b64(JSON.stringify(data)); return 'DC1.'+sum(body)+'.'+body; }
function decodeSave(code){
  try{ const m=/^DC1\.([a-z0-9]+)\.([A-Za-z0-9+/=]+)$/.exec(String(code).trim()); if(!m) return null; if(sum(m[2])!==m[1]) return null;
    const data=JSON.parse(unb64(m[2])); return (data&&typeof data==='object'&&data.profile)?data:null; }catch(e){ return null; }
}

// ---------- the discovery log: everything there is to find ----------
const LOG=[
  ...[['dirt','Topsoil'],['log','Wood'],['stone','Limestone'],['granite','Granite'],['deep','Slate'],['obsidian','Basalt'],['ember','Magmastone']].map(([id,name])=>({id,name,group:'Rock and earth',kind:'mined'})),
  ...[['coal','Coal'],['copper','Copper'],['iron','Iron'],['gold','Gold']].map(([id,name])=>({id,name,group:'Ore',kind:'mined'})),
  ...[['ruby','Ruby'],['emerald','Emerald'],['diamond','Diamond']].map(([id,name])=>({id,name,group:'Gems',kind:'mined'})),
  ...[['prism','Prism Stone'],['fossil','Fossil'],['treasure','Buried Treasure'],['blast','Blast Charge'],['sledgehammer','Sledgehammer'],['rescue','Rescue Potion'],['luck','Luck Tonic']].map(([id,name])=>({id,name,group:'Specials',kind:'seen'})),
  ...D.ZONES.map((z,i)=>({id:String(i),name:z.name,group:'Zones reached',kind:'zones'})),
  ...D.MODIFIERS.map(m=>({id:m.id,name:m.name,group:'Daily twists',kind:'twists'})),
];
const discovered=(life,e)=>e.kind==='mined'?(life.mined[e.id]||0)>0 : e.kind==='seen'?!!life.seen[e.id] : e.kind==='zones'?!!life.zones[e.id] : !!life.twists[e.id];

// ---------- ambient music: a soft cave drone with slow chords and the odd distant drip ----------
function createMusic(ctx,dest){
  let nodes=[], timers=[], on=false;
  const root=55, chords=[[0,7,12,16],[-2,5,10,14],[-5,2,7,12],[-3,4,9,12]];       // A minor-ish pads that drift
  const hz=(semi)=>root*Math.pow(2,semi/12);
  function start(){
    if(on) return; on=true;
    const out=ctx.createGain(); out.gain.value=0; out.connect(dest); out.gain.linearRampToValueAtTime(1,ctx.currentTime+3);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; lp.Q.value=.5; lp.connect(out);
    const delay=ctx.createDelay(1.5); delay.delayTime.value=.55; const fb=ctx.createGain(); fb.gain.value=.38; delay.connect(fb); fb.connect(delay); delay.connect(out);
    const pad=ctx.createGain(); pad.gain.value=.5; pad.connect(lp); pad.connect(delay);
    const oscs=[0,1,2,3].map(k=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=k%2?'triangle':'sine'; o.frequency.value=hz(chords[0][k]); o.detune.value=(k-1.5)*6; g.gain.value=.12; o.connect(g); g.connect(pad); o.start(); return o; });
    const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=.07; lg.gain.value=320; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    nodes=[out,lp,delay,fb,pad,...oscs,lfo,lg];
    let ci=0; const nextChord=()=>{ ci=(ci+1)%chords.length; const t=ctx.currentTime; oscs.forEach((o,k)=>{ o.frequency.cancelScheduledValues(t); o.frequency.setTargetAtTime(hz(chords[ci][k]),t,2.2); }); timers.push(setTimeout(nextChord,9000+Math.random()*3000)); };
    timers.push(setTimeout(nextChord,8000));
    const drip=()=>{ if(!on) return; const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.value=hz(chords[ci%4][Math.floor(Math.random()*4)]+24);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+1.6); o.connect(g); g.connect(delay); g.connect(out); o.start(t); o.stop(t+1.7);
      timers.push(setTimeout(drip,3500+Math.random()*6500)); };
    timers.push(setTimeout(drip,3000));
  }
  function stop(){ if(!on) return; on=false; timers.forEach(clearTimeout); timers=[]; const [out]=nodes; try{ out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0,ctx.currentTime,.4); }catch(e){}
    const old=nodes; nodes=[]; setTimeout(()=>old.forEach(n=>{ try{ if(n.stop) n.stop(); n.disconnect(); }catch(e){} }),1800); }
  return {start,stop,isOn:()=>on};
}

const api={RANKS,rankFor,newLife,prevDay,touchStreak,streakNow,msUntilReset,resetText,shareText,encodeSave,decodeSave,LOG,discovered,createMusic};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreMeta=api;
})(typeof self!=='undefined'?self:globalThis);
