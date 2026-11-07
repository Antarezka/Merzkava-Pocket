(function(){
 var root=document.documentElement,buttons=document.querySelectorAll("[data-theme]"),saved="dark";try{saved=localStorage.getItem("mp-review-theme")||"dark"}catch(e){}
 function setTheme(t){root.setAttribute("data-theme",t);buttons.forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.theme===t))});try{localStorage.setItem("mp-review-theme",t)}catch(e){}}
 setTheme(saved);buttons.forEach(function(b){b.addEventListener("click",function(){setTheme(b.dataset.theme)})});
 var pages={
 home:["HOME / OVERVIEW","Welcome back.","Your personal space between worlds. Continue where you left off.","YOUR SPACE","Home Base","Your journey, records and world access."],
 game:["GAME / WORLD ACCESS","Enter the world.","Your world navigation stays inside Game.","WORLD NAVIGATION","Home Base / City / World Map","World Map remains nested inside Game, not a separate main-menu item."],
 daily:["DAILY LOG-IN","A new day begins.","Your daily check-in belongs here.","DAILY RECORD","Daily Log-in","The reward and streak system can connect in a later build."],
 settings:["SETTINGS / APPEARANCE","Make it yours.","Switch between the two approved Pocket surfaces.","DISPLAY THEME","Dark / White","Black dominates Dark; white dominates White. Accent colours stay on outlines."]
 };
 document.querySelectorAll(".nav-item").forEach(function(btn){btn.addEventListener("click",function(){var p=pages[btn.dataset.page];if(!p)return;document.querySelectorAll(".nav-item").forEach(function(x){x.classList.remove("active");x.removeAttribute("aria-current")});btn.classList.add("active");btn.setAttribute("aria-current","page");["eyebrow","pageTitle","pageIntro","featureLabel","featureTitle","featureCopy"].forEach(function(id,i){document.getElementById(id).textContent=p[i]})})});
 var head=document.getElementById("tvHead"),path=document.getElementById("cordPath"),thread=document.getElementById("threadPath"),dock=document.getElementById("dockWrap"),active=null;
 function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
 function draw(dx,dy){var x=30+dx,y=104+dy,d="M30 0 Q"+(30+dx*.12)+" "+(40+dy*.25)+" "+(30+dx*.55)+" "+(75+dy*.65)+" T"+x+" "+y;path.setAttribute("d",d);thread.setAttribute("d",d);head.style.transform="translate("+dx+"px,"+dy+"px)"}
 function reset(){draw(0,0);head.style.transition="transform .38s cubic-bezier(.18,.8,.25,1.2)";head.style.transform="translate(0,0)";setTimeout(function(){head.style.transition="none"},410)}
 head.addEventListener("pointerdown",function(e){if(e.pointerType==="mouse"&&e.button!==0)return;active={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};head.setPointerCapture(e.pointerId)});
 head.addEventListener("pointermove",function(e){if(!active||active.id!==e.pointerId)return;var dx=clamp(e.clientX-active.x,-70,70),dy=clamp(e.clientY-active.y,-35,130);if(Math.abs(dx)+Math.abs(dy)>9)active.moved=true;draw(dx,dy)});
 function finish(e){if(!active||active.id!==e.pointerId)return;var moved=active.moved,rect=document.getElementById("app").getBoundingClientRect(),y=e.clientY-rect.top;active=null;if(moved&&y>rect.height*.76)dock.classList.toggle("hidden");reset()}
 head.addEventListener("pointerup",finish);head.addEventListener("pointercancel",function(e){if(active&&active.id===e.pointerId){active=null;reset()}});
})();
