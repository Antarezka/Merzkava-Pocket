import { animate } from "animejs";
import "./daily-login.css";
const reducedMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;

export function dailyLoginMarkup(){
 return \`
 <main class="daily-login-scene" data-daily-login-root aria-label="Daily Login Japanese shop">
  <section class="dl-layer dl-outside" data-dl-outside aria-label="Kedai Jepang">
   <div class="dl-night-sky"><i class="dl-star dl-star-one"></i><i class="dl-star dl-star-two"></i><i class="dl-star dl-star-three"></i><span class="dl-moon"></span></div>
   <div class="dl-scene-title"><span>MERZKAVA POCKET</span><b>DAILY LOG-IN</b></div>
   <div class="dl-shop-scene">
    <div class="dl-bunting"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="dl-roof"><span class="dl-roof-tile"></span><span class="dl-roof-edge"></span><span class="dl-roof-support dl-roof-support-left"></span><span class="dl-roof-support dl-roof-support-right"></span></div>
    <div class="dl-shop-wall">
     <div class="dl-wall-lantern dl-wall-lantern-left"><i></i></div><div class="dl-wall-lantern dl-wall-lantern-right"><i></i></div>
     <div class="dl-shop-window dl-shop-window-left"><i></i><b></b></div><div class="dl-shop-window dl-shop-window-right"><i></i><b></b></div>
     <div class="dl-shop-front">
      <div class="dl-door-frame"><div class="dl-door-warm-light"></div><div class="dl-door-track dl-door-track-top"></div><div class="dl-door-track dl-door-track-bottom"></div>
       <button class="dl-door-panel" type="button" data-dl-door aria-label="Geser pintu kayu untuk masuk"><span class="dl-door-lattice"></span><i class="dl-door-handle"></i><span class="dl-door-caption">すべり戸</span></button>
      </div>
      <div class="dl-kanban" aria-label="Daily"><span>D</span><span>A</span><span>I</span><span>L</span><span>Y</span></div>
      <div class="dl-stoop"><i></i><i></i></div>
     </div>
     <div class="dl-shop-foundation"></div>
    </div>
   </div>
   <div class="dl-street"><i></i><i></i><i></i></div>
   <div class="dl-door-hint" data-dl-hint><span class="dl-hint-arrow">←</span> GESER PINTU UNTUK MASUK <span class="dl-hint-arrow">→</span></div>
  </section>
  <section class="dl-layer dl-interior" data-dl-interior aria-label="Dapur kedai Daily Login" aria-hidden="true" inert>
   <div class="dl-interior-wall">
    <div class="dl-interior-header"><span>DAILY LOG-IN</span><i>本日の食堂</i></div><div class="dl-paper-lamp"><i></i><b></b></div><div class="dl-interior-window"><span></span><i></i><b></b></div>
    <div class="dl-kitchen-shelf"><i></i><i></i><i></i><span></span><b></b></div><div class="dl-hanging-utensils"><i></i><i></i><i></i><i></i></div><div class="dl-floor-mat"></div>
    <div class="dl-kitchen-counter">
     <div class="dl-counter-top"></div><div class="dl-pot" data-dl-pot><span class="dl-pot-lid"></span><span class="dl-pot-body"><i></i><b></b></span><span class="dl-pot-handle dl-pot-handle-left"></span><span class="dl-pot-handle dl-pot-handle-right"></span><span class="dl-broth"></span><span class="dl-steam dl-steam-one"></span><span class="dl-steam dl-steam-two"></span><span class="dl-steam dl-steam-three"></span></div>
     <div class="dl-bowl-stack"><i></i><i></i><b></b></div><div class="dl-wooden-board"><span></span><i></i></div><div class="dl-counter-front"></div>
    </div>
    <div class="dl-table"><span class="dl-table-leg dl-table-leg-left"></span><span class="dl-table-leg dl-table-leg-right"></span><div class="dl-table-top"><i></i><b></b><span></span></div><div class="dl-tea-cup"></div></div>
    <div class="dl-chair"><span class="dl-chair-back"></span><span class="dl-chair-seat"></span><i class="dl-chair-leg dl-chair-leg-a"></i><i class="dl-chair-leg dl-chair-leg-b"></i></div>
    <div class="dl-chef-area">
     <div class="dl-dialogue" data-dl-dialogue hidden role="status" aria-live="polite"><span data-dl-dialogue-text></span><small data-dl-dialogue-hint>TAP KOKINYA LAGI</small></div>
     <button class="dl-chef" type="button" data-dl-chef aria-label="Tap koki untuk berbicara"><span class="dl-chef-shadow"></span><span class="dl-chef-hat"><i></i><b></b></span><span class="dl-chef-head"><i class="dl-chef-hair"></i><b class="dl-chef-eye dl-chef-eye-left"></b><b class="dl-chef-eye dl-chef-eye-right"></b><i class="dl-chef-cheek"></i><span></span></span><span class="dl-chef-neck"></span><span class="dl-chef-body"><i class="dl-chef-collar-left"></i><i class="dl-chef-collar-right"></i><b class="dl-chef-apron"></b><span class="dl-chef-sash"></span></span><span class="dl-chef-arm dl-chef-arm-left"></span><span class="dl-chef-arm dl-chef-arm-right"></span><span class="dl-chef-leg dl-chef-leg-left"></span><span class="dl-chef-leg dl-chef-leg-right"></span><span class="dl-chef-nameplate">おかみ</span></button>
     <span class="dl-chef-tap-note">TAP THE CHEF</span>
    </div>
    <div class="dl-retro-tv" aria-label="Daily Login status screen"><div class="dl-tv-antenna"><i></i><b></b></div><div class="dl-tv-shell"><div class="dl-tv-screen"><span class="dl-tv-kicker">DAILY RECORD / CLAIM</span><b class="dl-tv-status" data-dl-status>NOT VERIFIED</b><small data-dl-status-note>SERVER TIME CHECK REQUIRED</small><i class="dl-tv-scan" data-dl-tv-scan></i><i class="dl-tv-noise" data-dl-tv-noise></i></div><div class="dl-tv-controls"><i></i><i></i><span></span></div></div><div class="dl-tv-feet"><i></i><i></i></div></div>
    <div class="dl-interior-floor"><span class="dl-floor-board dl-floor-board-one"></span><span class="dl-floor-board dl-floor-board-two"></span><span class="dl-floor-board dl-floor-board-three"></span></div>
   </div>
  </section>
  <div class="dl-scene-vignette"></div><div class="dl-transition-veil" data-dl-veil></div><button class="dl-exit" type="button" data-dl-exit>KELUAR <span>↗</span></button><span class="dl-scene-footer">A LITTLE MEAL, A NEW DAY</span>
 </main>\`;
}

function playDoorSlideChime(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return;
 try{
  const ctx=playDoorSlideChime.ctx||(playDoorSlideChime.ctx=new AudioContextClass());if(ctx.state==="suspended")void ctx.resume();const now=ctx.currentTime;
  const length=Math.floor(ctx.sampleRate*.54),buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*(1-i/length);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=buffer;filter.type="lowpass";filter.frequency.setValueAtTime(1700,now);filter.frequency.exponentialRampToValueAtTime(390,now+.5);
  gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.055,now+.07);gain.gain.exponentialRampToValueAtTime(.0001,now+.52);src.connect(filter).connect(gain).connect(ctx.destination);src.start(now);src.stop(now+.54);
  const bell=(f,d,l,t)=>{const osc=ctx.createOscillator(),amp=ctx.createGain();osc.type="sine";osc.frequency.setValueAtTime(f,now+d);osc.frequency.exponentialRampToValueAtTime(f*.72,now+d+t);amp.gain.setValueAtTime(.0001,now+d);amp.gain.linearRampToValueAtTime(l,now+d+.018);amp.gain.exponentialRampToValueAtTime(.0001,now+d+t);osc.connect(amp).connect(ctx.destination);osc.start(now+d);osc.stop(now+d+t+.02);};
  bell(1318.5,.35,.043,.48);bell(1760,.39,.025,.58);bell(2093,.43,.012,.55);
 }catch{/* Decorative sound never blocks entry. */}
}

export function mountDailyLogin(scene,onExit){
 if(!scene)return ()=>{};
 const outside=scene.querySelector("[data-dl-outside]"),interior=scene.querySelector("[data-dl-interior]"),door=scene.querySelector("[data-dl-door]"),doorway=scene.querySelector(".dl-door-frame"),hint=scene.querySelector("[data-dl-hint]");
 const chef=scene.querySelector("[data-dl-chef]"),dialogue=scene.querySelector("[data-dl-dialogue]"),dialogueText=scene.querySelector("[data-dl-dialogue-text]"),dialogueHint=scene.querySelector("[data-dl-dialogue-hint]"),exit=scene.querySelector("[data-dl-exit]");
 const status=scene.querySelector("[data-dl-status]"),statusNote=scene.querySelector("[data-dl-status-note]"),tvNoise=scene.querySelector("[data-dl-tv-noise]"),tvScan=scene.querySelector("[data-dl-tv-scan]");
 const puffs=[...scene.querySelectorAll(".dl-steam")],animations=new Set(),motionReduced=reducedMotion();
 let opened=false,exiting=false,disposed=false,drag=null,dragOffset=0,dialogueIndex=-1;
 const track=a=>{if(a){animations.add(a);a.then?.(()=>animations.delete(a));}return a;};
 const animateIn=(target,params)=>{if(!motionReduced)track(animate(target,params));};
 scene.style.opacity="0";if(motionReduced)scene.style.opacity="1";else animateIn(scene,{opacity:[0,1],translateY:[7,0],duration:720,ease:"outCubic"});
 scene.querySelectorAll(".dl-bunting i").forEach((x,i)=>animateIn(x,{rotate:[i%2?1.3:-1.3,i%2?-1.3:1.3],duration:2200+i*65,loop:true,alternate:true,ease:"inOutSine"}));
 scene.querySelectorAll(".dl-wall-lantern i").forEach(x=>animateIn(x,{opacity:[.55,1,.7],scale:[.96,1.06,.96],duration:2300,loop:true,ease:"inOutSine"}));
 const refreshTv=()=>{if(!navigator.onLine){status.textContent="OFFLINE";statusNote.textContent="CLAIM NOT VERIFIED";}else{status.textContent="NOT VERIFIED";statusNote.textContent="SERVER TIME CHECK REQUIRED";}};
 refreshTv();const onOnline=()=>refreshTv(),onOffline=()=>refreshTv();window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);
 const startInterior=()=>{
  interior.classList.add("is-active");interior.inert=false;interior.setAttribute("aria-hidden","false");
  if(motionReduced)return;
  puffs.forEach((x,i)=>track(animate(x,{opacity:[0,.58,0],translateY:[5,-35-i*4],translateX:[0,(i-1)*8],scale:[.8,1.2],delay:i*360,duration:1760,loop:true,ease:"inOutSine"})));
  track(animate(chef,{translateY:[0,-2,0],duration:1900,loop:true,ease:"inOutSine"}));
  track(animate(scene.querySelector("[data-dl-pot]"),{translateY:[0,-1.3,0],duration:760,loop:true,ease:"inOutSine"}));
  // TV noise and scanline animation remains active for the whole interior visit.
  track(animate(tvNoise,{opacity:[.12,.28,.16,.32,.12],translateX:[0,-2,1,-1,0],duration:190,loop:true,ease:"linear"}));
  track(animate(tvScan,{translateY:["-100%","100%"],opacity:[.35,.8,.35],duration:1250,loop:true,ease:"linear"}));
  track(animate(scene.querySelector(".dl-paper-lamp"),{opacity:[.84,1,.9],duration:2100,loop:true,ease:"inOutSine"}));
 };
 const openShop=()=>{
  if(opened||exiting||disposed)return;opened=true;door.disabled=true;hint.hidden=true;playDoorSlideChime();interior.style.visibility="visible";startInterior();
  if(motionReduced){door.style.transform="translateX(110%)";outside.style.opacity="0";outside.style.visibility="hidden";interior.style.opacity="1";return;}
  const travel=Math.max(doorway.clientWidth*.92,door.clientWidth*1.5);
  track(animate(door,{translateX:[dragOffset,travel],opacity:[1,.92],duration:900,ease:"inOutCubic"}));
  track(animate(outside,{opacity:[1,0],duration:2000,ease:"inOutCubic",onComplete:()=>{outside.style.visibility="hidden";}}));
  track(animate(interior,{opacity:[0,1],duration:2000,ease:"inOutCubic"}));
 };
 const restoreDoor=()=>{
  if(motionReduced)door.style.transform="translateX(0)";else track(animate(door,{translateX:[dragOffset,0],duration:380,ease:"outBack(1.4)"}));
  dragOffset=0;hint.classList.remove("is-ready");hint.innerHTML='<span class="dl-hint-arrow">←</span> GESER PINTU UNTUK MASUK <span class="dl-hint-arrow">→</span>';hint.hidden=false;
 };
 const down=event=>{if(opened||exiting||disposed||drag||(event.pointerType==="mouse"&&event.button!==0))return;event.preventDefault();drag={id:event.pointerId,x:event.clientX,start:dragOffset,moved:false};try{door.setPointerCapture(event.pointerId);}catch{}door.classList.add("is-dragging");};
 const move=event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();const delta=event.clientX-drag.x,max=Math.max(doorway.clientWidth*.94,door.clientWidth*1.55);dragOffset=Math.max(0,Math.min(max,drag.start+delta));if(Math.abs(delta)>7)drag.moved=true;door.style.transform="translateX("+dragOffset+"px)";if(dragOffset>doorway.clientWidth*.14){hint.textContent="LEPASKAN UNTUK MASUK";hint.classList.add("is-ready");}else hint.classList.remove("is-ready");};
 const up=event=>{if(!drag||drag.id!==event.pointerId)return;const shouldOpen=drag.moved&&dragOffset>=doorway.clientWidth*.28;try{door.releasePointerCapture(event.pointerId);}catch{}drag=null;door.classList.remove("is-dragging");if(shouldOpen)openShop();else restoreDoor();};
 const keyboardOpen=event=>{if(event.detail===0&&!opened&&!exiting)openShop();};
 door.addEventListener("pointerdown",down);door.addEventListener("pointermove",move);door.addEventListener("pointerup",up);door.addEventListener("pointercancel",up);door.addEventListener("click",keyboardOpen);
 const dialogueLines=[["Ini Daily Login-mu.","TAP SEKALI LAGI"],["Meshiagare! (召し上がれ)","SILAKAN DINIKMATI"]];
 const talk=()=>{if(!opened||exiting||disposed)return;dialogueIndex=(dialogueIndex+1)%dialogueLines.length;dialogue.hidden=false;dialogueText.textContent=dialogueLines[dialogueIndex][0];dialogueHint.textContent=dialogueLines[dialogueIndex][1];if(motionReduced){dialogue.style.opacity="1";dialogue.style.transform="translateY(0) scale(1)";}else track(animate(dialogue,{opacity:[0,1],translateY:[11,0],scale:[.96,1],duration:350,ease:"outBack(1.2)"}));};
 chef.addEventListener("click",talk);
 const leave=()=>{if(exiting||disposed)return;exiting=true;exit.disabled=true;scene.inert=true;if(motionReduced){scene.style.opacity="0";onExit?.();return;}track(animate(scene,{opacity:[1,0],scale:[1,.992],duration:2000,ease:"inOutCubic",onComplete:()=>onExit?.()}));};
 exit.addEventListener("click",leave);
 return ()=>{disposed=true;animations.forEach(a=>a.pause?.());door.removeEventListener("pointerdown",down);door.removeEventListener("pointermove",move);door.removeEventListener("pointerup",up);door.removeEventListener("pointercancel",up);door.removeEventListener("click",keyboardOpen);chef.removeEventListener("click",talk);exit.removeEventListener("click",leave);window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);};
}
