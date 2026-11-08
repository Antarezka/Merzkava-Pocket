import { animate } from "animejs";
import "./daily-login.css";

const reducedMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;

export function dailyLoginMarkup(){
 return `
 <main class="daily-login-scene" data-daily-login-root aria-label="Daily Login Japanese shop">
  <section class="dl-layer dl-outside" data-dl-outside aria-label="Bagian depan kedai Jepang">
   <div class="dl-night-sky"><i class="dl-star dl-star-one"></i><i class="dl-star dl-star-two"></i><i class="dl-star dl-star-three"></i><span class="dl-moon"></span></div>
   <div class="dl-shop-scene">
    <img class="dl-shop-art" src="/game-assets/pxl/sprites/daily_login_shop_front.png" alt="" draggable="false">
    <div class="dl-bunting-pxl" aria-hidden="true"></div>
    <div class="dl-lantern-glow dl-lantern-glow-left" aria-hidden="true"></div>
    <div class="dl-lantern-glow dl-lantern-glow-right" aria-hidden="true"></div>
    <div class="dl-door-frame">
     <div class="dl-door-warm-light"></div>
     <div class="dl-door-track dl-door-track-top"></div>
     <div class="dl-door-track dl-door-track-bottom"></div>
     <button class="dl-door-panel" type="button" data-dl-door aria-label="Geser pintu kayu untuk masuk">
      <span class="dl-door-lattice"></span><i class="dl-door-handle"></i><span class="dl-door-caption">すべり戸</span>
     </button>
    </div>
   </div>
   <div class="dl-street"><i></i><i></i><i></i></div>
   <div class="dl-door-hint" data-dl-hint><span class="dl-hint-arrow">←</span> GESER PINTU UNTUK MASUK <span class="dl-hint-arrow">→</span></div>
   <button class="dl-back" type="button" data-dl-back aria-label="Kembali ke menu">KEMBALI <span>↙</span></button>
  </section>

  <section class="dl-layer dl-interior" data-dl-interior aria-label="Bagian dalam kedai Daily Login" aria-hidden="true" inert>
   <div class="dl-interior-wall">
    <div class="dl-interior-header"><span>DAILY LOG-IN</span><i>本日の食堂</i></div>
    <div class="dl-paper-lamp"><i></i><b></b></div>
    <div class="dl-interior-window"><span></span><i></i><b></b></div>
    <div class="dl-kitchen-shelf"><i></i><i></i><i></i><span></span><b></b></div>
    <div class="dl-hanging-utensils"><i></i><i></i><i></i><i></i></div>
    <div class="dl-floor-mat"></div>
    <div class="dl-kitchen-counter">
     <div class="dl-counter-top"></div>
     <div class="dl-pot" data-dl-pot>
      <span class="dl-pot-lid"></span><span class="dl-pot-body"><i></i><b></b></span>
      <span class="dl-pot-handle dl-pot-handle-left"></span><span class="dl-pot-handle dl-pot-handle-right"></span>
      <span class="dl-broth"></span><span class="dl-steam dl-steam-one"></span><span class="dl-steam dl-steam-two"></span><span class="dl-steam dl-steam-three"></span>
     </div>
     <div class="dl-bowl-stack"><i></i><i></i><b></b></div><div class="dl-wooden-board"><span></span><i></i></div><div class="dl-counter-front"></div>
    </div>
    <div class="dl-table"><span class="dl-table-leg dl-table-leg-left"></span><span class="dl-table-leg dl-table-leg-right"></span><div class="dl-table-top"><i></i><b></b><span></span></div><div class="dl-tea-cup"></div></div>
    <div class="dl-chair"><span class="dl-chair-back"></span><span class="dl-chair-seat"></span><i class="dl-chair-leg dl-chair-leg-a"></i><i class="dl-chair-leg dl-chair-leg-b"></i></div>
    <div class="dl-chef-area">
     <div class="dl-dialogue" data-dl-dialogue hidden role="status" aria-live="polite"><span data-dl-dialogue-text></span></div>
     <button class="dl-chef" type="button" data-dl-chef aria-label="Ketuk koki untuk berbicara">
      <span class="dl-chef-shadow"></span><span class="dl-chef-hat"><i></i><b></b></span>
      <span class="dl-chef-head"><i class="dl-chef-hair"></i><b class="dl-chef-eye dl-chef-eye-left"></b><b class="dl-chef-eye dl-chef-eye-right"></b><i class="dl-chef-cheek"></i><span></span></span>
      <span class="dl-chef-neck"></span><span class="dl-chef-body"><i class="dl-chef-collar-left"></i><i class="dl-chef-collar-right"></i><b class="dl-chef-apron"></b><span class="dl-chef-sash"></span></span>
      <span class="dl-chef-arm dl-chef-arm-left"></span><span class="dl-chef-arm dl-chef-arm-right"></span>
      <span class="dl-chef-leg dl-chef-leg-left"></span><span class="dl-chef-leg dl-chef-leg-right"></span><span class="dl-chef-nameplate">おかみ</span>
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
    <div class="dl-interior-floor"><span class="dl-floor-board dl-floor-board-one"></span><span class="dl-floor-board dl-floor-board-two"></span><span class="dl-floor-board dl-floor-board-three"></span></div>
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
 const hint=scene.querySelector("[data-dl-hint]");
 const back=scene.querySelector("[data-dl-back]");
 const chef=scene.querySelector("[data-dl-chef]");
 const dialogue=scene.querySelector("[data-dl-dialogue]");
 const dialogueText=scene.querySelector("[data-dl-dialogue-text]");
 const choice=scene.querySelector("[data-dl-choice]");
 const stay=scene.querySelector("[data-dl-stay]");
 const leave=scene.querySelector("[data-dl-leave]");
 const tvNoise=scene.querySelector("[data-dl-tv-noise]");
 const tvScan=scene.querySelector("[data-dl-tv-scan]");
 const puffs=[...scene.querySelectorAll(".dl-steam")];
 const animations=new Set(),motionReduced=reducedMotion();
 const dialogueLines=["Ai-yo!","Makanan masih dipersiapkan!","Mohon tunggu!"];
 let opened=false,leaving=false,disposed=false,drag=null,dragOffset=0,dialogueIndex=-1,choiceOpen=false;

 const track=animation=>{
  if(animation){animations.add(animation);animation.then?.(()=>animations.delete(animation));}
  return animation;
 };
 const animateUnlessReduced=(target,params)=>{
  if(!motionReduced)track(animate(target,params));
 };
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
  puffs.forEach((puff,index)=>track(animate(puff,{
   opacity:[0,.58,0],translateY:[5,-35-index*4],translateX:[0,(index-1)*8],scale:[.8,1.2],
   delay:index*360,duration:1760,loop:true,ease:"inOutSine"
  })));
  track(animate(chef,{translateY:[0,-2,0],duration:1900,loop:true,ease:"inOutSine"}));
  track(animate(scene.querySelector("[data-dl-pot]"),{translateY:[0,-1.3,0],duration:760,loop:true,ease:"inOutSine"}));
  // CRT interference is deliberately the only thing on the TV: no login status
  // is shown until the actual local login/claim system exists.
  track(animate(tvNoise,{opacity:[.12,.32,.16,.28,.12],translateX:[0,-2,1,-1,0],duration:190,loop:true,ease:"linear"}));
  track(animate(tvScan,{translateY:["-100%","100%"],opacity:[.28,.78,.28],duration:1250,loop:true,ease:"linear"}));
  track(animate(scene.querySelector(".dl-paper-lamp"),{opacity:[.84,1,.9],duration:2100,loop:true,ease:"inOutSine"}));
 };

 const openShop=()=>{
  if(opened||leaving||disposed)return;
  opened=true;
  door.disabled=true;
  back.hidden=true;
  hint.hidden=true;
  playDoorSlideChime();
  interior.style.visibility="visible";
  startInterior();
  if(motionReduced){
   door.style.transform="translateX(110%)";
   outside.style.opacity="0";outside.style.visibility="hidden";
   interior.style.opacity="1";
   return;
  }
  const travel=Math.max(doorway.clientWidth*.94,door.clientWidth*1.55);
  track(animate(door,{translateX:[dragOffset,travel],opacity:[1,.94],duration:900,ease:"inOutCubic"}));
  track(animate(outside,{opacity:[1,0],duration:2000,ease:"inOutCubic",onComplete:()=>{outside.style.visibility="hidden";}}));
  track(animate(interior,{opacity:[0,1],duration:2000,ease:"inOutCubic"}));
 };

 const resetDoor=()=>{
  if(motionReduced)door.style.transform="translateX(0)";
  else track(animate(door,{translateX:[dragOffset,0],duration:380,ease:"outBack(1.4)"}));
  dragOffset=0;
  hint.classList.remove("is-ready");
  hint.innerHTML='<span class="dl-hint-arrow">←</span> GESER PINTU UNTUK MASUK <span class="dl-hint-arrow">→</span>';
  hint.hidden=false;
 };
 const pointerDown=event=>{
  if(opened||leaving||disposed||drag||(event.pointerType==="mouse"&&event.button!==0))return;
  event.preventDefault();
  drag={id:event.pointerId,x:event.clientX,start:dragOffset,moved:false};
  try{door.setPointerCapture(event.pointerId);}catch{}
  door.classList.add("is-dragging");
 };
 const pointerMove=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  event.preventDefault();
  const delta=event.clientX-drag.x;
  const max=Math.max(doorway.clientWidth*.94,door.clientWidth*1.55);
  dragOffset=Math.max(0,Math.min(max,drag.start+delta));
  if(Math.abs(delta)>7)drag.moved=true;
  door.style.transform="translateX("+dragOffset+"px)";
  if(dragOffset>doorway.clientWidth*.14){hint.textContent="LEPASKAN UNTUK MASUK";hint.classList.add("is-ready");}
  else hint.classList.remove("is-ready");
 };
 const pointerUp=event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const shouldOpen=drag.moved&&dragOffset>=doorway.clientWidth*.28;
  try{door.releasePointerCapture(event.pointerId);}catch{}
  drag=null;door.classList.remove("is-dragging");
  if(shouldOpen)openShop();else resetDoor();
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
  scene.inert=true;
  if(motionReduced){scene.style.opacity="0";onBack?.();return;}
  track(animate(scene,{opacity:[1,0],duration:2000,ease:"inOutCubic",onComplete:()=>onBack?.()}));
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
 };
}
