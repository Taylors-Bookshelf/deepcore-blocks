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

// ---------- ambient music: a light, unhurried acoustic-style tune (plucked notes over a soft pad, major pentatonic) ----------
// Generated live, no audio files: a slow four-chord loop (C G Am F) that never plays the same melody twice.
function createMusic(ctx,dest){
  let nodes=[], timers=[], on=false;
  const BEAT=.78;                                              // about 77 beats per minute: relaxed, walking pace
  const root=261.63;                                           // C4
  const hz=semi=>root*Math.pow(2,semi/12);
  const chords=[{r:0,tones:[0,4,7,12]},{r:-5,tones:[-5,-1,2,7]},{r:-3,tones:[-3,0,4,9]},{r:-7,tones:[-7,-3,0,5]}];   // C, G, Am, F
  const scale=[0,2,4,7,9];                                     // major pentatonic: every note sounds right over every chord
  const note=i=>scale[((i%5)+5)%5]+12*Math.floor(i/5);
  function start(){
    if(on) return; on=true;
    const out=ctx.createGain(); out.gain.value=0; out.connect(dest); out.gain.linearRampToValueAtTime(.32,ctx.currentTime+2.5);   // well under the sound effects
    const dry=ctx.createGain(); dry.gain.value=.8; dry.connect(out);
    const echo=ctx.createDelay(1.5); echo.delayTime.value=BEAT*.75; const fb=ctx.createGain(); fb.gain.value=.3;
    const elp=ctx.createBiquadFilter(); elp.type='lowpass'; elp.frequency.value=1400; echo.connect(elp); elp.connect(fb); fb.connect(echo); elp.connect(out);
    const send=ctx.createGain(); send.gain.value=.5; send.connect(echo);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1500; lp.Q.value=.3; lp.connect(dry); lp.connect(send);
    nodes=[out,dry,echo,fb,elp,send,lp];
    const voice=(freq,t,len,type,peak,bright)=>{ const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
      o.type=type; o.frequency.value=freq; f.type='lowpass'; f.frequency.value=bright; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+.025);
      g.gain.exponentialRampToValueAtTime(.0001,t+len); o.connect(f); f.connect(g); g.connect(dry); g.connect(send); o.start(t); o.stop(t+len+.05); };
    const pluck=(semi,t,peak)=>{ voice(hz(semi),t,1.5,'triangle',peak,1200); voice(hz(semi),t,1.8,'sine',peak*.6,900); };   // a soft, round marimba-like tone (no bright overtone)
    const pad=(c,t,len)=>{ c.tones.slice(0,3).forEach((s,k)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.value=hz(s-12); o.detune.value=(k-1)*5;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.07,t+1.4); g.gain.setValueAtTime(.07,t+len-1.6); g.gain.linearRampToValueAtTime(0,t+len+.4);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t+len+.5); }); };
    let bar=0, step=0, pos=6, next=ctx.currentTime+.4;
    const plan=()=>{
      if(!on) return;
      while(next<ctx.currentTime+2.5){
        const c=chords[Math.floor(bar/2)%4], beatInBar=step%4;
        if(step%8===0) pad(c,next,BEAT*8);
        if(beatInBar===0) pluck(c.r-12,next,.16);                                         // low root on the first beat
        if(beatInBar===2) pluck(c.r-5,next,.11);                                          // and its fifth halfway
        const quiet=(Math.floor(bar/2)%4===3&&step%8>=4);                                 // let the music breathe at the end of each loop
        if(!quiet){
          [0,.5].forEach(off=>{ if(Math.random()<(off?.28:.62)){
            const goal=4+Math.round(Math.random()*4);                                     // wander gently around the middle of the range
            pos+=Math.max(-2,Math.min(2,Math.round((goal-pos)*.4+(Math.random()*3-1.5)))); pos=Math.max(2,Math.min(9,pos));
            pluck(note(pos),next+off*BEAT,.07+Math.random()*.03); } });
        }
        step++; if(step%4===0) bar++; next+=BEAT;
      }
      timers.push(setTimeout(plan,900));
    };
    plan();
  }
  function stop(){ if(!on) return; on=false; timers.forEach(clearTimeout); timers=[]; const [out]=nodes; try{ out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0,ctx.currentTime,.4); }catch(e){}
    const old=nodes; nodes=[]; setTimeout(()=>old.forEach(n=>{ try{ n.disconnect(); }catch(e){} }),2500); }
  return {start,stop,isOn:()=>on};
}

const api={RANKS,rankFor,newLife,prevDay,touchStreak,streakNow,msUntilReset,resetText,shareText,encodeSave,decodeSave,LOG,discovered,createMusic};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DeepcoreMeta=api;
})(typeof self!=='undefined'?self:globalThis);
