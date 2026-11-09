import { animate } from "animejs";
import { openPocketGiftSession } from "./economy.js";
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
    <div class="dl-assistant-area">
     <div class="dl-assistant-bubble" data-dl-assistant-bubble role="status" aria-live="polite">
      <span data-dl-assistant-text>Hai! Aku menyiapkan hadiah untukmu selama Pocket berjalan.</span>
      <div class="dl-assistant-stamp"><span>NEXT HOURLY GIFT</span><b data-dl-hourly-countdown>60m 00s</b></div>
      <small class="dl-assistant-reward" data-dl-hourly-reward>Preparing a small surprise…</small>
      <button class="dl-hourly-claim" type="button" data-dl-hourly-claim disabled>GIFT NOT READY</button>
     </div>
     <button class="dl-assistant" type="button" data-dl-assistant aria-label="Talk to the kitchen assistant">
      <span class="dl-assistant-sprite" aria-hidden="true"></span>
      <span class="dl-assistant-nameplate">KITCHEN AIDE</span>
     </button>
     <span class="dl-assistant-tap-note">TAP ASSISTANT</span>
    </div>
    <div class="dl-retro-tv" aria-label="Televisi tabung dengan noise">
     <img class="dl-tv-art" src="/game-assets/pxl/sprites/daily_login_retro_tv.png" alt="" draggable="false">
     <div class="dl-tv-screen" aria-hidden="true"><i class="dl-tv-static" data-dl-tv-static></i><i class="dl-tv-scan" data-dl-tv-scan></i><i class="dl-tv-noise" data-dl-tv-noise></i></div>
    </div>
   </div>
   <button class="dl-reward-open" type="button" data-dl-reward-open>DAILY REWARDS · 1,000 DAYS</button>
   <div class="dl-reward-backdrop" data-dl-reward-backdrop hidden>
    <section class="dl-reward-calendar" role="dialog" aria-modal="true" aria-label="One thousand day reward calendar">
     <header class="dl-reward-calendar-head">
      <div><b>DAILY REWARD ARCHIVE</b><small>1,000 DAYS · RANDOM PROFILE REWARDS</small></div>
      <button type="button" data-dl-reward-close aria-label="Close reward calendar">×</button>
     </header>
     <div class="dl-daily-current" data-dl-daily-current>
      <small>TODAY'S SUPPLY</small><strong data-dl-daily-title>Opening today's reward…</strong>
      <span data-dl-daily-description></span>
      <button type="button" data-dl-daily-claim disabled>CLAIM TODAY'S REWARD</button>
     </div>
     <div class="dl-reward-calendar-tools">
      <button type="button" data-dl-reward-page="-1">← PREVIOUS</button>
      <span data-dl-reward-page-label>DAY 1–50 / 1000</span>
      <button type="button" data-dl-reward-page="1">NEXT →</button>
     </div>
     <div class="dl-reward-list" data-dl-reward-list></div>
    </section>
   </div>
   <div class="dl-choice-dim" data-dl-choice-dim hidden aria-hidden="true"></div>
   <div class="dl-choice" data-dl-choice hidden aria-live="polite">
    <p>WAIT HERE?</p>
    <div class="dl-choice-actions">
     <button type="button" data-dl-stay>STAY</button>
     <button type="button" data-dl-leave>LEAVE SHOP</button>
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

export function mountDailyLogin(scene,onBack,identity){
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
 const choiceDim=scene.querySelector("[data-dl-choice-dim]");
 const stay=scene.querySelector("[data-dl-stay]");
 const leave=scene.querySelector("[data-dl-leave]");
 const tvNoise=scene.querySelector("[data-dl-tv-noise]");
 const tvScan=scene.querySelector("[data-dl-tv-scan]");
 const bulb=scene.querySelector(".dl-bulb-lamp");
 const assistant=scene.querySelector("[data-dl-assistant]");
 const assistantText=scene.querySelector("[data-dl-assistant-text]");
 const hourlyCountdown=scene.querySelector("[data-dl-hourly-countdown]");
 const hourlyReward=scene.querySelector("[data-dl-hourly-reward]");
 const hourlyClaim=scene.querySelector("[data-dl-hourly-claim]");
 const rewardBackdrop=scene.querySelector("[data-dl-reward-backdrop]");
 const rewardList=scene.querySelector("[data-dl-reward-list]");
 const rewardPageLabel=scene.querySelector("[data-dl-reward-page-label]");
 const dailyTitle=scene.querySelector("[data-dl-daily-title]");
 const dailyDescription=scene.querySelector("[data-dl-daily-description]");
 const dailyClaim=scene.querySelector("[data-dl-daily-claim]");
 const animations=new Set(),interiorAnimations=new Set(),motionReduced=reducedMotion();
 let rewardSession=null,rewardPage=0,rewardTick=null,rewardMessageIndex=0;
 const dialogueLines=["Ai-yo!","Makanan masih dipersiapkan!","Mohon tunggu!"];
 const assistantLines=[
  "Hai! Aku menyiapkan hadiah kecil setiap satu jam Pocket aktif.",
  "Pocket sedang berjalan? Hitungan hadiah terus berlanjut meski kamu berpindah menu.",
  "Kalau app benar-benar ditutup, hitungannya berhenti. Hadiah yang sudah siap tetap tersimpan."
 ];
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

 const formatGiftTime=milliseconds=>{
  const seconds=Math.max(0,Math.ceil(Number(milliseconds||0)/1000));
  return Math.floor(seconds/60)+"m "+String(seconds%60).padStart(2,"0")+"s";
 };
 const refreshGiftUI=()=>{
  if(!rewardSession||disposed)return;
  const status=rewardSession.snapshot();
  if(status.hourly_pending>0){
   assistantText.textContent="Hadiah dari dapur sudah siap. Aku menyimpannya di nampan untukmu.";
   hourlyCountdown.textContent="READY";
   hourlyReward.textContent=rewardSession.describeReward(status.hourly_next_reward)||"Gift waiting";
   hourlyClaim.hidden=false;hourlyClaim.disabled=false;
   hourlyClaim.textContent=status.hourly_pending>1?"CLAIM GIFT · "+status.hourly_pending+" READY":"CLAIM HOURLY GIFT";
  }else if(status.hourly_complete){
   assistantText.textContent="Perjalanan hadiah per jam selama setahun aktif sudah selesai. Terima kasih sudah mampir!";
   hourlyCountdown.textContent="YEAR COMPLETE";
   hourlyReward.textContent="All 8,760 hourly cycles have been completed.";
   hourlyClaim.hidden=true;hourlyClaim.disabled=true;
  }else{
   assistantText.textContent=assistantLines[rewardMessageIndex%assistantLines.length];
   hourlyCountdown.textContent=formatGiftTime(status.hourly_remaining_ms);
   hourlyReward.textContent=status.hourly_next_reward?("Next: "+rewardSession.describeReward(status.hourly_next_reward)):"A small surprise is being prepared.";
   hourlyClaim.hidden=false;hourlyClaim.disabled=true;
   hourlyClaim.textContent="GIFT NOT READY";
  }
  if(status.daily_complete){
   dailyTitle.textContent="The 1,000-day reward journey is complete.";
   dailyDescription.textContent="All scheduled rewards have been archived.";
   dailyClaim.disabled=true;dailyClaim.textContent="REWARD JOURNEY COMPLETE";
  }else{
   dailyTitle.textContent="DAY "+status.current_day+" / 1,000 · "+status.day_date;
   dailyDescription.textContent=rewardSession.describeReward(status.daily_reward);
   dailyClaim.disabled=status.daily_claimed;
   dailyClaim.textContent=status.daily_claimed?"TODAY'S REWARD CLAIMED":"CLAIM TODAY'S REWARD";
  }
 };
 const renderRewardPage=()=>{
  if(!rewardSession||!rewardList)return;
  const status=rewardSession.snapshot(),pageCount=20;
  rewardPage=Math.max(0,Math.min(pageCount-1,rewardPage));
  const first=rewardPage*50+1,last=Math.min(1000,first+49);
  rewardPageLabel.textContent="DAY "+first+"–"+last+" / 1000";
  rewardList.innerHTML=Array.from({length:last-first+1},(_,offset)=>{
   const day=first+offset,reward=rewardSession.getDailyReward(day),isClaimed=rewardSession.getDailyClaimed(day);
   const isToday=day===status.current_day&&!status.daily_complete;
   const isPast=day<status.current_day||status.daily_complete;
   const stateLabel=isClaimed?"CLAIMED":isToday?"TODAY":isPast?"MISSED":"UPCOMING";
   const classes="dl-reward-row"+(isToday?" is-today":"")+(isClaimed?" is-claimed":"");
   return "<div class='"+classes+"'><strong>DAY "+day+"</strong><span><b>"+rewardSession.describeReward(reward)+"</b><small>"+rewardSession.getDayDate(day)+"</small></span><em>"+stateLabel+"</em></div>";
  }).join("");
  const previous=scene.querySelector("[data-dl-reward-page='-1']");
  const next=scene.querySelector("[data-dl-reward-page='1']");
  if(previous)previous.disabled=rewardPage===0;
  if(next)next.disabled=rewardPage===19;
  refreshGiftUI();
 };
 const openRewardCalendar=()=>{
  if(!rewardSession||!rewardBackdrop)return;
  rewardPage=Math.floor((Math.max(1,rewardSession.snapshot().current_day)-1)/50);
  rewardBackdrop.hidden=false;
  renderRewardPage();
 };
 const closeRewardCalendar=()=>{if(rewardBackdrop)rewardBackdrop.hidden=true;};
 const rewardClick=event=>{
  const open=event.target.closest("[data-dl-reward-open]");
  if(open){openRewardCalendar();return;}
  const close=event.target.closest("[data-dl-reward-close]");
  if(close){closeRewardCalendar();return;}
  if(event.target===rewardBackdrop){closeRewardCalendar();return;}
  const page=event.target.closest("[data-dl-reward-page]");
  if(page){rewardPage+=Number(page.dataset.dlRewardPage)||0;renderRewardPage();return;}
  const daily=event.target.closest("[data-dl-daily-claim]");
  if(daily&&rewardSession){
   const result=rewardSession.claimDaily(rewardSession.snapshot().current_day);
   assistantText.textContent=result.ok?"Terima kasih sudah menerima bekal hari ini!":"Hadiah hari ini sudah diambil atau belum tersedia.";
   renderRewardPage();return;
  }
  const hourly=event.target.closest("[data-dl-hourly-claim]");
  if(hourly&&rewardSession&&!hourly.disabled){
   const result=rewardSession.claimHourly();
   assistantText.textContent=result.ok?"Ini hadiah dapurmu: "+result.label+". Semoga berguna!":result.message;
   refreshGiftUI();if(rewardBackdrop&&!rewardBackdrop.hidden)renderRewardPage();return;
  }
  const aide=event.target.closest("[data-dl-assistant]");
  if(aide){
   rewardMessageIndex++;assistant.classList.add("is-speaking");refreshGiftUI();
  }
 };
 const onGiftUpdate=()=>{refreshGiftUI();};
 const onDailyRewardUpdate=()=>{refreshGiftUI();if(rewardBackdrop&&!rewardBackdrop.hidden)renderRewardPage();};
 scene.addEventListener("click",rewardClick);
 window.addEventListener("pocket:hourly-gift-update",onGiftUpdate);
 if(identity){
  void openPocketGiftSession(identity).then(session=>{
   if(disposed)return;
   rewardSession=session;refreshGiftUI();
  }).catch(error=>{
   if(disposed)return;
   assistantText.textContent="Hadiah dapur belum dapat dibuka: "+(error?.message||"local save unavailable");
   hourlyCountdown.textContent="UNAVAILABLE";
   hourlyClaim.disabled=true;
  });
 }
 rewardTick=window.setInterval(refreshGiftUI,1000);

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
  if(assistant)trackInterior(animate(assistant,{translateY:[0,-1,0],duration:2300,loop:true,ease:"inOutSine"}));
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
   choiceDim.hidden=false;
   choice.hidden=false;
   choiceOpen=true;
   if(motionReduced){choiceDim.style.opacity="1";choice.style.opacity="1";}
   else{
    track(animate(choiceDim,{opacity:[0,1],delay:250,duration:280,ease:"outCubic"}));
    // Keep the CSS viewport-centering transform untouched while fading the text in.
    track(animate(choice,{opacity:[0,1],delay:470,duration:360,ease:"outCubic"}));
   }
  }
 };
 const stayInside=()=>{
  if(!choiceOpen||leaving||disposed)return;
  choiceOpen=false;
  choice.hidden=true;
  choiceDim.hidden=true;
  dialogueIndex=-1;
 };
 const leaveShop=()=>{
  if(!opened||!choiceOpen||leaving||disposed)return;
  leaving=true;
  choice.hidden=true;
  choiceDim.hidden=true;
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
  scene.removeEventListener("click",rewardClick);
  window.removeEventListener("pocket:hourly-gift-update",onGiftUpdate);
  if(rewardTick!==null)window.clearInterval(rewardTick);
  closeRewardCalendar();
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
