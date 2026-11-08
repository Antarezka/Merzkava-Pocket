import { animate } from "animejs";
import "./daily-login.css";

const reducedMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;

export function dailyLoginMarkup(){
 return `
 <main class="daily-login-scene" data-daily-login-root aria-label="Daily Login Japanese shop">
  <section class="dl-layer dl-outside" data-dl-outside aria-label="Bagian depan kedai Jepang">
   <div class="dl-night-sky" aria-hidden="true"><i class="dl-star dl-star-one"></i><i class="dl-star dl-star-two"></i><i class="dl-star dl-star-three"></i><span class="dl-moon"></span></div>
   <div class="dl-shop-scene">
    <div class="dl-art-stage">
     <img class="dl-shop-art" src="/game-assets/pxl/sprites/daily_login_shop_front.png" alt="" draggable="false">
     <div class="dl-kanban-pxl" aria-hidden="true"><img src="/game-assets/pxl/sprites/daily_login_kanban.png" alt="" draggable="false"><span>そば</span><small>手打ち</small></div>
     <div class="dl-noren-pxl" aria-hidden="true"></div>
     <div class="dl-lantern-glow dl-lantern-glow-left" aria-hidden="true"></div>
     <div class="dl-lantern-glow dl-lantern-glow-right" aria-hidden="true"></div>
     <div class="dl-door-frame">
      <div class="dl-door-warm-light"></div>
      <div class="dl-door-track dl-door-track-top"></div>
      <div class="dl-door-track dl-door-track-bottom"></div>
      <button class="dl-door-panel" type="button" data-dl-door aria-label="Pintu masuk kedai">
       <span class="dl-door-lattice"></span><i class="dl-door-handle"></i>
      </button>
     </div>
    </div>
   </div>
   <button class="dl-back" type="button" data-dl-back aria-label="Kembali ke menu">KEMBALI <span>↙</span></button>
  </section>

  <section class="dl-layer dl-interior" data-dl-interior aria-label="Bagian dalam kedai Daily Login" aria-hidden="true" inert>
   <div class="dl-interior-wall">
    <img class="dl-interior-art" src="/game-assets/pxl/sprites/daily_login_shop_interior.png" alt="" draggable="false">
    <div class="dl-interior-header"><span>DAILY LOG-IN</span><i>本日の食堂</i></div>
    <div class="dl-paper-lamp"><i></i><b></b></div>
    <div class="dl-bulb-lamp"><span></span><i></i><b></b></div>
    <div class="dl-cooking-steam" aria-hidden="true"><i class="dl-steam dl-steam-one"></i><i class="dl-steam dl-steam-two"></i><i class="dl-steam dl-steam-three"></i></div>
    <div class="dl-chef-area">
     <div class="dl-dialogue" data-dl-dialogue hidden role="status" aria-live="polite"><span data-dl-dialogue-text></span></div>
     <button class="dl-chef" type="button" data-dl-chef aria-label="Ketuk koki untuk berbicara">
      <span class="dl-chef-sprite" aria-hidden="true"></span>
      <span class="dl-chef-nameplate">そば職人</span>
     </button>
     <span class="dl-chef-tap-note">TAP THE CHEF</span>
    </div>
    <div class="dl-choice" data-dl-choice hidden aria-live="polite">
     <p>WAIT HERE?</p>
     <div class="dl-choice-actions">
      <button type="button" data-dl-stay>STAY</button>
      <button type="button" data-dl-leave>LEAVE SHOP</button>
     </div>
    </div>
    <div class="dl-retro-tv" aria-label="Televisi tabung dengan noise">
     <div class="dl-tv-antenna"><i></i><b></b></div>
     <div class="dl-tv-shell">
      <div class="dl-tv-screen"><i class="dl-tv-static" data-dl-tv-static></i><i class="dl-tv-scan" data-dl-tv-scan></i><i class="dl-tv-noise" data-dl-tv-noise></i></div>
      <div class="dl-tv-controls"><i></i><i></i><span></span></div>
     </div>
     <div class="dl-tv-feet"><i></i><i></i></div>
    </div>
   </div>
  </section>
  <div class="dl-scene-vignette"></div>
 </main>`;
}
function playDoorSlideChime(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)return;
 try{
  const ctx=playDoorSlideChime.ctx||(playDoorSlideChime.ctx=new AudioContextClass());
  if(ctx.state==="suspended")void ctx.resume();
  const now=ctx.currentTime,length=Math.floor(ctx.sampleRate*.54);
  const buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*(1-i/length);
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=buffer;filter.type="lowpass";filter.frequency.setValueAtTime(1700,now);filter.frequency.exponentialRampToValueAtTime(390,now+.5);
  gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.055,now+.07);gain.gain.exponentialRampToValueAtTime(.0001,now+.52);
  src.connect(filter).connect(gain).connect(ctx.destination);src.start(now);src.stop(now+.54);
  const bell=(frequency,delay,level,duration)=>{
   const osc=ctx.createOscillator(),amp=ctx.createGain();osc.type="sine";
   osc.frequency.setValueAtTime(frequency,now+delay);osc.frequency.exponentialRampToValueAtTime(frequency*.72,now+delay+duration);
   amp.gain.setValueAtTime(.0001,now+delay);amp.gain.linearRampToValueAtTime(level,now+delay+.018);amp.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
   osc.connect(amp).connect(ctx.destination);osc.start(now+delay);osc.stop(now+delay+duration+.02);
  };
  bell(1318.5,.35,.043,.48);bell(1760,.39,.025,.58);bell(2093,.43,.012,.55);
 }catch{/* Decorative sound must never block entry. */}
}

export function mountDailyLogin(scene,onBack){
 if(!scene)return ()=>{};
 const outside=scene.querySelector("[data-dl-outside]");
 const interior=scene.querySelector("[data-dl-interior]");
 const door=scene.querySelector("[data-dl-door]");
 const doorway=scene.querySelector(".dl-door-frame");
 const back=scene.querySelector("[data-dl-back]");
 const chef=scene.querySelector("[data-dl-chef]");
 const dialogue=scene.querySelector("[data-dl-dialogue]");
 const dialogueText=scene.querySelector("[data-dl-dialogue-text]");
 const choice=scene.querySelector("[data-dl-choice]");
 const stay=scene.querySelector("[data-dl-stay]");
 const leave=scene.querySelector("[data-dl-leave]");
 const tvNoise=scene.querySelector("[data-dl-tv-noise]");
 const tvScan=scene.querySelector("[data-dl-tv-scan]");
 const bulb=scene.querySelector(".dl-bulb-lamp");
 const puffs=[...scene.querySelectorAll(".dl-steam")];
 const animations=new Set(),interiorAnimations=new Set(),motionReduced=reducedMotion();
 const dialogueLines=["Ai-yo!","Makanan masih dipersiapkan!","Mohon tunggu!"];
 let interiorMotionStarted=false;
 let opened=false,leaving=false,disposed=false,drag=null,dragOffset=0,dialogueIndex=-1,choiceOpen=false;
 let pointerLastX=0,doorRattleAudio=null,dragHapticSent=false;

 const track=animation=>{
  if(animation){animations.add(animation);animation.then?.(()=>animations.delete(animation));}
  return animation;
 };
 const trackInterior=animation=>{
  if(animation)interiorAnimations.add(animation);
  return track(animation);
 };
 const animateUnlessReduced=(target,params)=>{
  if(!motionReduced)track(animate(target,params));
 };
 const refreshSky=()=>{
  const now=new Date();
  const hour=now.getHours()+now.getMinutes()/60;
  const phase=hour>=5&&hour<7?"dawn":hour>=7&&hour<11?"morning":hour>=11&&hour<16?"day":hour>=16&&hour<18.5?"golden":hour>=18.5&&hour<20.5?"dusk":"night";
  outside.dataset.dlTimeOfDay=phase;
 };
 refreshSky();
 const skyTimer=window.setInterval(refreshSky,30000);
 const onVisibilityChange=()=>{if(document.visibilityState==="visible")refreshSky();};
 document.addEventListener("visibilitychange",onVisibilityChange);

 scene.style.opacity="0";
 if(motionReduced)scene.style.opacity="1";
 else animateUnlessReduced(scene,{opacity:[0,1],translateY:[5,0],duration:620,ease:"outCubic"});

 const lampGlow=scene.querySelectorAll(".dl-lantern-glow");
 lampGlow.forEach((lamp,index)=>animateUnlessReduced(lamp,{
  opacity:[.25,.58,.34],scale:[.96,1.05,.98],duration:2400+index*180,loop:true,ease:"inOutSine"
 }));

 const startInterior=()=>{
  interior.classList.add("is-active");
  interior.inert=false;
  interior.setAttribute("aria-hidden","false");
  if(motionReduced)return;
  if(interiorMotionStarted){interiorAnimations.forEach(animation=>animation.play?.());return;}
  interiorMotionStarted=true;
  puffs.forEach((puff,index)=>trackInterior(animate(puff,{
   opacity:[0,.58,0],translateY:[5,-35-index*4],translateX:[0,(index-1)*8],scale:[.8,1.2],
   delay:index*360,duration:1760,loop:true,ease:"inOutSine"
  })));
  trackInterior(animate(chef,{translateY:[0,-1.5,0],duration:2100,loop:true,ease:"inOutSine"}));
  // CRT interference is deliberately the only thing on the TV: no login status
  // is shown until the actual local login/claim system exists.
  trackInterior(animate(tvNoise,{opacity:[.12,.32,.16,.28,.12],translateX:[0,-2,1,-1,0],duration:190,loop:true,ease:"linear"}));
  trackInterior(animate(tvScan,{translateY:["-100%","100%"],opacity:[.28,.78,.28],duration:1250,loop:true,ease:"linear"}));
  trackInterior(animate(scene.querySelector(".dl-paper-lamp"),{opacity:[.78,.96,.84,.92,.76],duration:2900,loop:true,ease:"inOutSine"}));
  trackInterior(animate(bulb,{opacity:[.58,.82,.64,.76,.56],scale:[.99,1.015,.995,1.01,.99],duration:3600,loop:true,ease:"inOutSine"}));
 };

 const playDoorRattle=()=>{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  try{
   const ctx=doorRattleAudio||(doorRattleAudio=new AudioContextClass());
   if(ctx.state==="suspended")void ctx.resume();
   const now=ctx.currentTime;
   const tap=(frequency,delay,level,duration)=>{
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type="triangle";
    osc.frequency.setValueAtTime(frequency,now+delay);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45,frequency*.64),now+delay+duration);
    amp.gain.setValueAtTime(.0001,now+delay);
    amp.gain.linearRampToValueAtTime(level,now+delay+.008);
    amp.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now+delay);osc.stop(now+delay+duration+.01);
   };
   tap(155,.0,.018,.085);tap(112,.035,.011,.105);tap(205,.09,.007,.07);
  }catch{/* The visual door motion must work even when audio is unavailable. */}
 };
 const settleDoor=(fromX,toX,duration=420,onComplete)=>{
  doorway.classList.add("is-rattling");
  door.classList.remove("is-dragging");
  if(motionReduced){
   door.style.transform="translate3d("+toX+"px,0,0)";
   doorway.classList.remove("is-rattling");
   onComplete?.();
   return;
  }
  track(animate(door,{
   translateX:[fromX,toX,toX-0.7,toX+0.45,toX],
   translateY:[0,.7,-.45,.25,0],
   rotate:[0,.12,-.09,.04,0],
   duration,ease:"outCubic",
   onComplete:()=>{
    door.style.transform="translate3d("+toX+"px,0,0)";
    doorway.classList.remove("is-rattling");
    onComplete?.();
   }
  }));
 };
 const openShop=()=>{
  if(opened||leaving||disposed)return;
  opened=true;
  door.disabled=true;
  back.hidden=true;
  playDoorSlideChime();
  playDoorRattle();
  interior.style.visibility="visible";
  startInterior();
  const travel=Math.max(doorway.clientWidth*1.08,door.clientWidth*1.15);
  const finishDoor=()=>{
   doorway.classList.remove("is-rattling");
   outside.style.visibility="hidden";
  };
  if(motionReduced){
   door.style.transform="translate3d("+(-travel)+"px,0,0)";
   outside.style.opacity="0";outside.style.visibility="hidden";
   interior.style.opacity="1";
   finishDoor();
   return;
  }
  doorway.classList.add("is-rattling");
  track(animate(door,{
   translateX:[dragOffset,-travel,-travel-1.1,-travel+.6,-travel],
   translateY:[0,.8,-.55,.25,0],
   rotate:[0,.13,-.08,.03,0],
   duration:760,ease:"outCubic",onComplete:finishDoor
  }));
  track(animate(outside,{opacity:[1,0],duration:2000,ease:"inOutCubic"}));
  track(animate(interior,{opacity:[0,1],duration:2000,ease:"inOutCubic"}));
 };

 const resetDoor=()=>{
  const from=dragOffset;
  dragOffset=0;
  playDoorRattle();
  settleDoor(from,0,420);
 };
 const pointerDown=event=>{
  if(opened||leaving||disposed||drag||(event.pointerType==="mouse"&&event.button!==0))return;
  event.preventDefault();
  drag={id:event.pointerId,x:event.clientX,start:dragOffset,moved:false};
  pointerLastX=event.clientX;
  try{door.focus({preventScroll:true});door.setPointerCapture(event.pointerId);}catch{}
  dragHapticSent=false;
  door.classList.add("is-dragging");
  doorway.classList.add("is-rattling");
 };
 const pointerMove=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  event.preventDefault();
  const delta=event.clientX-drag.x;
  const step=event.clientX-pointerLastX;
  pointerLastX=event.clientX;
  // The shoji only opens left. A rightward drag returns it toward its closed stop.
  const max=Math.max(doorway.clientWidth*1.08,door.clientWidth*1.15);
  // The wooden shoji has weight: finger travel is slightly resisted by the track.
  dragOffset=Math.max(-max,Math.min(0,drag.start+delta*.82));
  if(Math.abs(delta)>4)drag.moved=true;
  if(drag.moved&&!dragHapticSent){navigator.vibrate?.(9);dragHapticSent=true;}
  const rattle=Math.sin(step*.34)*Math.min(1.8,Math.abs(step)*.16);
  const tilt=Math.sin(step*.24)*Math.min(.28,Math.abs(step)*.022);
  door.style.transform="translate3d("+dragOffset+"px,"+rattle.toFixed(2)+"px,0) rotate("+tilt.toFixed(3)+"deg)";
 };
 const pointerUp=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const fullyOpened=drag.moved&&dragOffset<=-doorway.clientWidth*.78;
  try{door.releasePointerCapture(event.pointerId);}catch{}
  drag=null;
  door.classList.remove("is-dragging");
  doorway.classList.remove("is-rattling");
  if(fullyOpened)openShop();
  else resetDoor();
 };
 const keyboardOpen=event=>{
  if(event.detail===0&&!opened&&!leaving)openShop();
 };
 door.addEventListener("pointerdown",pointerDown);
 door.addEventListener("pointermove",pointerMove);
 door.addEventListener("pointerup",pointerUp);
 door.addEventListener("pointercancel",pointerUp);
 door.addEventListener("click",keyboardOpen);

 const talk=()=>{
  if(!opened||leaving||disposed||choiceOpen)return;
  dialogueIndex=(dialogueIndex+1)%dialogueLines.length;
  chef.classList.add("is-speaking");
  dialogue.hidden=false;
  dialogueText.textContent=dialogueLines[dialogueIndex];
  if(motionReduced){dialogue.style.opacity="1";dialogue.style.transform="translateY(0) scale(1)";}
  else track(animate(dialogue,{opacity:[0,1],translateY:[11,0],scale:[.96,1],duration:350,ease:"outBack(1.2)"}));
  if(dialogueIndex===2){
   choice.hidden=false;
   choiceOpen=true;
   if(motionReduced){choice.style.opacity="1";choice.style.transform="translateY(0)";}
   else track(animate(choice,{opacity:[0,1],translateY:[8,0],delay:470,duration:360,ease:"outCubic"}));
  }
 };
 const stayInside=()=>{
  if(!choiceOpen||leaving||disposed)return;
  choiceOpen=false;
  choice.hidden=true;
  dialogueIndex=-1;
 };
 const leaveShop=()=>{
  if(!opened||!choiceOpen||leaving||disposed)return;
  leaving=true;
  choice.hidden=true;
  dialogue.hidden=true;
  choiceOpen=false;
  chef.classList.remove("is-speaking");
  interior.inert=true;
  interiorAnimations.forEach(animation=>animation.pause?.());
  outside.style.visibility="visible";
  outside.style.opacity="0";
  back.hidden=true;
  door.disabled=true;

  const finishOutside=()=>{
   interior.classList.remove("is-active");
   interior.style.visibility="hidden";
   interior.style.opacity="0";
   interior.setAttribute("aria-hidden","true");
   outside.style.visibility="visible";
   outside.style.opacity="1";
   door.disabled=false;
   door.style.transform="translate3d(0,0,0)";
   door.style.opacity="1";
   doorway.classList.remove("is-rattling");
   dragOffset=0;
   back.hidden=false;
   back.disabled=false;
   opened=false;
   leaving=false;
   dialogueIndex=-1;
  };

  if(motionReduced){finishOutside();return;}
  track(animate(interior,{opacity:[1,0],duration:2000,ease:"inOutCubic"}));
  track(animate(outside,{opacity:[0,1],duration:2000,ease:"inOutCubic",onComplete:finishOutside}));
 };
 chef.addEventListener("click",talk);
 stay.addEventListener("click",stayInside);
 leave.addEventListener("click",leaveShop);

 const returnToMenu=()=>{
  if(opened||leaving||disposed)return;
  leaving=true;back.disabled=true;
  if(motionReduced){scene.style.opacity="0";onBack?.();return;}
  track(animate(scene,{opacity:[1,0],duration:2000,ease:"inOutCubic",onComplete:()=>onBack?.()}));
 };
 back.addEventListener("click",returnToMenu);

 return ()=>{
  disposed=true;
  animations.forEach(animation=>animation.pause?.());
  door.removeEventListener("pointerdown",pointerDown);
  door.removeEventListener("pointermove",pointerMove);
  door.removeEventListener("pointerup",pointerUp);
  door.removeEventListener("pointercancel",pointerUp);
  door.removeEventListener("click",keyboardOpen);
  chef.removeEventListener("click",talk);
  stay.removeEventListener("click",stayInside);
  leave.removeEventListener("click",leaveShop);
  back.removeEventListener("click",returnToMenu);
  window.clearInterval(skyTimer);
  document.removeEventListener("visibilitychange",onVisibilityChange);
  doorRattleAudio?.close?.();
 };
}
