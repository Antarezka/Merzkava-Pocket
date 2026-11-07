import Phaser from "phaser";
import "./home-base.css";
import { openHomeBaseSession } from "./economy.js";

const STYLE_OPTIONS=[
  {id:"chibi",name:"Chibi",description:"A compact field silhouette with a short, layered cultivation robe."},
  {id:"classic",name:"Classic",description:"Balanced proportions with a crossed collar, waist sash and flowing jade robe."},
  {id:"slim",name:"Scholar",description:"A slender long robe with cool blue cloth and silver-blue details."},
  {id:"ornate",name:"Ceremonial",description:"A formal wine-red mantle, layered sleeves and a gold hair ornament."},
  {id:"painterly",name:"Wanderer",description:"A dark forest cloak over travel-worn layers and warm leather accents."}
];
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const DIR_VECTOR={n:[0,-1],ne:[1,-1],e:[1,0],se:[1,1],s:[0,1],sw:[-1,1],w:[-1,0],nw:[-1,-1]};
const TERRAIN=["ggggggggggww","gggggggggwww","ggppggggwwww","gppppgggwwwg","gpppggggwwgg","ggppddggwggg","gggggdgwwggg","ggggddwwgggg","ggggggwggggg","gggggggggggg"];
const STARTER_SPRITES={"pocket.starter.hut":"facility_starter_hut","pocket.starter.foraging":"facility_starter_foraging","pocket.starter.well":"facility_starter_well"};
const FAMILY_SPRITES=[
  [/farm|horticulture|garden|agriculture/i,"facility_farm"],
  [/water|sanitation|aquaculture|fish/i,"facility_starter_well"],
  [/storage|logistics/i,"facility_storage"],
  [/trade|commerce|market/i,"facility_market"],
  [/workshop|processing|textile|ceramic|medicine|herb/i,"facility_workshop"]
];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const locationOf=(col,row)=>({x:200+(col-row)*16,y:20+(col+row)*8+8});
const directionOf=(dx,dy)=>DIRS[Math.round((((Math.atan2(dx,-dy)+Math.PI*2)%(Math.PI*2))/(Math.PI/4)))%8];
const siteCanUse=(facility,col,row)=>{
  const req=(facility.location_requirements||[]).join(" ").toLowerCase(),tile=TERRAIN[row]?.[col]||"";
  if(!tile||tile==="w"||tile==="p"||tile==="d")return false;
  const nearWater=[[col-1,row],[col+1,row],[col,row-1],[col,row+1]].some(([x,y])=>["w","p"].includes(TERRAIN[y]?.[x]));
  if(/water|riverbank|lake|coast|groundwater/.test(req))return nearWater;
  if(/arable|garden|terrace|farm|pasture/.test(req))return tile==="g"||tile==="s";
  return tile==="g"||tile==="s";
};
const spriteForFacility=f=>{
  const id=f?.facility_id||"";
  if(STARTER_SPRITES[id])return STARTER_SPRITES[id];
  return FAMILY_SPRITES.find(([pattern])=>pattern.test((f?.family||"")+" "+(f?.name||"")))?.[1]||"facility_storage";
};

class HomeBaseScene extends Phaser.Scene{
  constructor(){super("HomeBase");this.style="classic";this.placement=null;this.facilityObjects=new Map();this.npcs=[];}
  preload(){
    this.load.image("home-map","/game-assets/pxl/scenes/home_base_map.png");
    ["facility_starter_hut","facility_starter_foraging","facility_starter_well","facility_farm","facility_workshop","facility_storage","facility_market","world_tree","world_rock"].forEach(id=>this.load.image(id,"/game-assets/pxl/sprites/"+id+".png"));
    this.load.spritesheet("water-glimmer","/game-assets/pxl/anims/water_glimmer.png",{frameWidth:32,frameHeight:16});
    STYLE_OPTIONS.forEach(style=>{
      DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
        const key=style.id+"_"+move+"_"+dir;
        this.load.spritesheet(key,"/game-assets/pxl/anims/"+key+".png",{frameWidth:34,frameHeight:48});
      }));
    });
  }
  create(){
    this.cameras.main.setBackgroundColor("#19251f");
    this.add.image(0,0,"home-map").setOrigin(0).setDepth(-1000);
    this.anims.create({key:"water-glimmer",frames:this.anims.generateFrameNumbers("water-glimmer",{start:0,end:3}),frameRate:5,repeat:-1});
    STYLE_OPTIONS.forEach(style=>DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const texture=style.id+"_"+move+"_"+dir;
      this.anims.create({key:style.id+":"+move+":"+dir,frames:this.anims.generateFrameNumbers(texture,{start:0,end:move==="walk"?7:3}),frameRate:move==="walk"?8:3,repeat:-1});
    })));
    [[344,74],[328,126],[300,169],[107,121],[134,154]].forEach(([x,y])=>this.add.sprite(x,y,"water-glimmer").setDepth(y+1).play("water-glimmer").setAlpha(.72));
    [[58,72,.9],[83,165,.82],[367,52,.9],[366,190,.8],[262,202,.74]].forEach(([x,y,scale])=>this.add.image(x,y,"world_tree").setOrigin(.5,1).setScale(scale).setDepth(y));
    [[75,109],[116,183],[291,216],[357,142]].forEach(([x,y])=>this.add.image(x,y,"world_rock").setOrigin(.5,1).setDepth(y));
    this.player=this.add.sprite(200,154,"classic_idle_s").setOrigin(.5,1).setDepth(156);
    this.player.play("classic:idle:s");
    this.addNpcs();this.drawFacilities();
    const cam=this.cameras.main,el=this.options.viewport;
    const coverZoom=Math.max(el.clientWidth/400,el.clientHeight/260);
    cam.setBounds(0,0,400,260);
    cam.setZoom(Math.min(2.12,Math.max(.92,coverZoom*.77)));
    cam.centerOn(this.player.x,this.player.y-4);
    cam.startFollow(this.player,true,.075,.075);
    this.events.on("update",()=>{if(this.player)this.player.setDepth(this.player.y+6);this.npcs.forEach(npc=>npc.setDepth(npc.y+5));});
    this.input.on("pointerdown",pointer=>{
      if(pointer.button!==0)return;
      const world=cam.getWorldPoint(pointer.x,pointer.y);
      if(this.placement){this.options.onPlacementTap?.(this.worldToTile(world.x,world.y),this.placement);return;}
      this.moveToTap(world.x,world.y);
    });
    this.input.on("pointermove",pointer=>{
      if(!this.placement)return;
      const world=cam.getWorldPoint(pointer.x,pointer.y),tile=this.worldToTile(world.x,world.y),pos=locationOf(tile.col,tile.row);
      this.placementGhost?.destroy();
      this.placementGhost=this.add.image(pos.x,pos.y,"facility_storage").setOrigin(.5,1).setAlpha(.38).setTint(0xb4d7a0).setDepth(pos.y+80);
    });
    this.events.once("shutdown",()=>this.placementGhost?.destroy());
    this.options.onReady?.(this);
  }
  addNpcs(){
    [[245,108,0xa9b98b],[286,148,0xc6a06d],[150,175,0x9aadb1]].forEach(([x,y,tint],i)=>{
      const npc=this.add.sprite(x,y,"classic_idle_s").setOrigin(.5,1).setDepth(y+2).setScale(.9).setTint(tint).setInteractive({useHandCursor:true});
      npc.play("classic:idle:"+["s","sw","e"][i]);
      npc.on("pointerdown",(pointer,localX,localY,event)=>{event?.stopPropagation?.();this.walkTo({x,y:y-4},()=>this.options.onNpcTap?.(i),{x,y:y-4});});
      this.npcs.push(npc);
    });
  }
  worldToTile(x,y){const b=(y-28)/8,a=(x-200)/16;return {col:Math.round((a+b)/2),row:Math.round((b-a)/2)};}
  drawFacilities(){
    if(!this.options?.session||!this.player)return;
    const facilities=this.options.session.snapshot().facilities||{};
    for(const [id,record] of Object.entries(facilities)){
      if(!record?.operational||!record.map_position)continue;
      const pos=locationOf(record.map_position.col,record.map_position.row),key=spriteForFacility(this.options.session.getFacility(id));
      const existing=this.facilityObjects.get(id);
      if(existing){existing.setPosition(pos.x,pos.y).setDepth(pos.y+1);continue;}
      const item=this.add.image(pos.x,pos.y,key).setOrigin(.5,1).setDepth(pos.y+1).setInteractive({useHandCursor:true});
      item.setData("facilityId",id);item.on("pointerdown",(pointer,localX,localY,event)=>{event?.stopPropagation?.();this.walkTo({x:pos.x,y:pos.y-7},()=>this.options.onFacilityTap?.(id),{x:pos.x,y:pos.y-7});});
      this.facilityObjects.set(id,item);
    }
  }
  setStyle(style){
    if(!STYLE_OPTIONS.some(x=>x.id===style))return;
    this.style=style;if(this.player)this.applySprite(this.player,this.lastDirection||"s",this.moving?"walk":"idle");
    this.npcs.forEach((npc,i)=>{const dir=["s","sw","e"][i];npc.setTexture(style+"_idle_"+dir).setTint([0xa9b98b,0xc6a06d,0x9aadb1][i]);npc.play(style+":idle:"+dir);});
  }
  applySprite(sprite,dir,move){const key=this.style+":"+move+":"+dir;sprite.play(this.anims.exists(key)?key:this.style+":idle:s",true);}
  moveToTap(x,y){
    if(!this.player||this.moving||this.placement)return;
    const tile=this.worldToTile(x,y),kind=TERRAIN[tile.row]?.[tile.col];
    if(!kind||!["g","s","d"].includes(kind)){this.options.onInvalidMove?.();return;}
    const target=locationOf(tile.col,tile.row);
    this.walkTo({x:target.x,y:target.y+5},null,{x,y});
  }
  showTapTrail(target,tapPoint){
    if(!this.player)return;
    const fx=this.add.graphics();
    fx.setDepth(5000);
    fx.lineStyle(1,0xe7d8ae,.19);
    fx.beginPath();fx.moveTo(this.player.x,this.player.y-8);fx.lineTo(target.x,target.y);fx.strokePath();
    fx.fillStyle(0xe7d8ae,.11);fx.fillCircle(tapPoint.x,tapPoint.y,7);
    fx.lineStyle(1,0xf0ddb0,.27);fx.strokeCircle(tapPoint.x,tapPoint.y,6);
    fx.fillStyle(0xf5e6bd,.32);fx.fillCircle(tapPoint.x,tapPoint.y,1.8);
    this.tweens.add({targets:fx,alpha:{from:.9,to:0},scaleX:1.08,scaleY:1.08,duration:920,ease:"Sine.Out",onComplete:()=>fx.destroy()});
  }
  walkTo(target,onArrive,tapPoint=null){
    if(!this.player)return;
    this.moving=true;const dx=target.x-this.player.x,dy=target.y-this.player.y,dir=directionOf(dx,dy);
    this.lastDirection=dir;this.applySprite(this.player,dir,"walk");
    if(tapPoint)this.showTapTrail(target,tapPoint);
    const distance=Math.hypot(dx,dy);this.tweens.killTweensOf(this.player);
    this.tweens.add({targets:this.player,x:target.x,y:target.y,duration:Math.max(360,Math.min(2600,distance*15)),ease:"Linear",onComplete:()=>{
      this.moving=false;this.applySprite(this.player,dir,"idle");onArrive?.();
    }});
  }
  startPlacement(facility){this.placement=facility;this.placementGhost?.destroy();}
  stopPlacement(){this.placement=null;this.placementGhost?.destroy();this.placementGhost=null;}
}

export async function mountHomeBase(root,identity,navigateBack,isActive=()=>true){
  if(!root)return ()=>{};
  let disposed=false,session,game=null,scene=null,snapshot=null,tick=null;
  let feedback="Tap a place to see what can be done here.";
  root.innerHTML="<div class='world-empty'>Opening the World Archive...</div>";
  const setFeedback=value=>{feedback=value;const node=root.querySelector("[data-world-feedback]");if(node)node.textContent=value;};
  try{session=await openHomeBaseSession(identity);}
  catch(error){if(isActive())root.innerHTML="<div class='world-empty'>Home Base could not open: "+esc(error.message)+"</div>";return ()=>{};}
  if(disposed||!isActive())return ()=>{};
  snapshot=session.snapshot();
  root.innerHTML=
    "<section class='home-base-page' data-world-shell>"+
      "<header class='world-topbar'><div class='world-title-wrap'><strong>HOME BASE</strong><small>WORLD ARCHIVE · PERSONAL LAND</small></div>"+
      "<div class='world-top-actions'><button type='button' data-world-appearance>CHARACTER</button></div></header>"+
      "<div class='world-statusline'><span>PRIVATE HOMESTEAD</span><span data-world-owned>3 STARTER FACILITIES</span><span>LOCAL SAVE</span></div>"+
      "<div class='world-viewport' data-world-viewport></div>"+
      "<div class='world-toolbar' aria-label='World actions'>"+
        "<button class='world-tool-button is-active' data-world-action='places' aria-label='Places'><span class='tool-symbol'>⌂</span><small>PLACES</small></button>"+
        "<button class='world-tool-button' data-world-action='build' aria-label='Build'><span class='tool-symbol'>＋</span><small>BUILD</small></button>"+
        "<button class='world-tool-button' data-world-action='appearance' aria-label='Character style'><span class='tool-symbol'>◇</span><small>STYLE</small></button>"+
      "</div>"+
      "<section class='world-drawer' data-world-drawer><div class='world-drawer-head'><strong data-world-heading>YOUR HOMESTEAD</strong><button type='button' data-world-close aria-label='Collapse panel'>−</button></div>"+
      "<div data-world-panel></div><p class='world-feedback' data-world-feedback>"+esc(feedback)+"</p></section>"+
      "</section>";
  const viewport=root.querySelector("[data-world-viewport]"),worldPanel=root.querySelector("[data-world-panel]");
  const drawer=root.querySelector("[data-world-drawer]"),heading=root.querySelector("[data-world-heading]");
  const renderPlaces=()=>{
    heading.textContent="YOUR HOMESTEAD";
    const owned=Object.entries(snapshot.facilities||{}).filter(([,v])=>v?.operational).length;
    root.querySelector("[data-world-owned]").textContent=owned+" FACILITIES OWNED";
    const rows=[
      ["pocket.starter.hut","Small Hut","Slow rest and a safe place to pause."],
      ["pocket.starter.foraging","Foraging Patch","A small tended patch for nearby wild gathering."],
      ["pocket.starter.well","Small Well","A local water point."]
    ];
    worldPanel.innerHTML="<p class='world-drawer-copy'>A quiet, open homestead with room to grow. Tap any building on the map to inspect it.</p>"+
      "<div class='world-card-grid'>"+rows.map(row=>"<button class='world-card' data-world-location='"+row[0]+"'><b>"+row[1]+"</b><small>"+row[2]+"</small><em>OWNED · LEVEL 1</em></button>").join("")+"</div>";
  };
  const renderAppearance=()=>{
    heading.textContent="CHARACTER STYLE";
    const current=session.getAppearance();
    worldPanel.innerHTML="<p class='world-drawer-copy'>Choose a visual family. The player and every resident use the selected proportions and animation set.</p>"+
      "<div class='world-style-grid'>"+STYLE_OPTIONS.map(s=>"<button class='world-style-card "+(current===s.id?"is-selected":"")+"' data-world-style='"+s.id+"'><i class='world-style-portrait' style='background-image:url(/game-assets/pxl/anims/"+s.id+"_idle_s.png)' aria-hidden='true'></i><span><b>"+s.name+"</b><small>"+s.description+"</small></span></button>").join("")+"</div>";
  };
  const renderBuild=()=>{
    heading.textContent="FACILITY ARCHIVE";
    const list=session.getBuildableFacilities().filter(f=>!snapshot.facilities?.[f.facility_id]?.operational);
    worldPanel.innerHTML="<p class='world-drawer-copy'>Select a facility, review its catalogue Requirements, then choose a suitable open tile. Materials, tools, builders, predecessor, fee and construction time remain required.</p>"+
      (list.length?"<div class='world-card-grid'>"+list.slice(0,30).map(f=>{
        const r=session.getBuildRecord(f.facility_id);
        return "<button class='world-card' data-world-facility='"+esc(f.facility_id)+"'><b>"+esc(f.name)+"</b><small>"+esc(f.family)+" · "+esc(session.currency(r.cost))+"</small><em>"+(r.ready?"READY TO PLACE":"REQUIREMENTS MISSING")+"</em></button>";
      }).join("")+"</div>":"<div class='world-empty'>No additional facility records are available.</div>");
  };
  const renderFacilityDetail=id=>{
    const f=session.getFacility(id),r=session.getBuildRecord(id);
    heading.textContent=f?.name||"FACILITY";
    const missing=[...(r.missingMaterials||[]).map(x=>(session.getItem(x.item_id)?.name||x.item_name)+" ×"+x.quantity),...(r.missingTools||[]).map(x=>"Tool: "+x),...(r.predecessors||[]).map(x=>"Predecessor: "+(session.getFacility(x)?.name||x))];
    worldPanel.innerHTML="<p class='world-drawer-copy'>"+esc(f?.location_requirements?.join(" · ")||"Owned home plot")+"</p>"+
      "<div class='world-requirements'><span>Build: "+esc(session.currency(r.cost))+"</span><span>Builders: "+r.builders+"/"+r.requiredBuilders+"</span><span>Materials missing: "+(r.missingMaterials||[]).length+"</span><span>Tools missing: "+(r.missingTools||[]).length+"</span></div>"+
      "<label class='world-drawer-copy'>Assigned builders <input type='number' min='0' max='50' step='1' data-world-builders='"+esc(id)+"' value='"+r.builders+"'></label>"+
      (missing.length?"<p class='world-drawer-copy'>Missing Requirements: "+esc(missing.join(", "))+"</p>":"<p class='world-drawer-copy'>All construction Requirements are met. Choose an eligible tile to place this facility.</p>")+
      "<div class='world-action-row'><button class='world-action' data-world-start-placement='"+esc(id)+"' "+(!r.ready?"disabled":"")+">PLACE ON MAP</button><button class='world-action secondary' data-world-open-build>BACK TO ARCHIVE</button></div>";
  };
  const renderLocation=id=>{
    const f=session.getFacility(id);
    if(id==="pocket.starter.hut"){
      heading.textContent="SMALL HUT";
      worldPanel.innerHTML="<p class='world-drawer-copy'>Resting here accrues a Pocket-only Satiety recovery credit slowly, at 1 point per real hour. The credit is applied only when a verified Satiety value is linked to this local save.</p>"+
        "<div class='world-action-row'><button class='world-action' data-world-rest>"+(session.isResting()?"STOP REST":"REST AT HUT")+"</button></div>"+
        (session.restCredit()>0?"<p class='world-drawer-copy'>Pending recovery credit: "+session.restCredit().toFixed(2)+" Satiety.</p>":"");
    }else if(id==="pocket.starter.foraging"){
      heading.textContent="FORAGING PATCH";
      worldPanel.innerHTML="<p class='world-drawer-copy'>A small starting patch. Gatherable items still follow their catalogue habitat, tool and output Requirements.</p><div class='world-action-row'><button class='world-action' data-world-forage>VIEW FORAGING</button></div>";
    }else if(id==="pocket.starter.well"){
      heading.textContent="SMALL WELL";
      worldPanel.innerHTML="<p class='world-drawer-copy'>A local water source. Water drawing uses the catalogue's matching bucket and location Requirements.</p><div class='world-action-row'><button class='world-action' data-world-water>VIEW WATER</button></div>";
    }else{
      heading.textContent=f?.name||"FACILITY";
      worldPanel.innerHTML="<p class='world-drawer-copy'>Level "+(snapshot.facilities[id]?.level||1)+" · "+esc(f?.family||"Pocket facility")+".</p>";
    }
  };
  const renderForage=async()=>{
    heading.textContent="FORAGING REQUIREMENTS";
    const data=await session.getCatalogue();
    const items=data.items.filter(x=>["foraging_or_hand_harvest","herb_foraging"].includes(x.acquisition?.method)&&x.acquisition?.locations?.some(s=>/meadow|forest floor/i.test(s))).slice(0,24);
    worldPanel.innerHTML="<p class='world-drawer-copy'>Pick an item matching the meadow or forest-floor habitat. Required tools must be in local inventory.</p>"+
      "<div class='world-card-grid'>"+items.map(item=>"<button class='world-card' data-world-gather='"+item.item_id+"'><b>"+esc(item.name)+"</b><small>"+esc(item.category)+" · "+esc((item.acquisition?.tool_requirements||[]).join(", "))+"</small><em>"+(session.canGather(item.item_id,"meadow").ready?"READY":"REQUIREMENTS MISSING")+"</em></button>").join("")+"</div>";
  };
  const renderWater=async()=>{
    heading.textContent="WATER DRAWING";
    const data=await session.getCatalogue(),item=data.items.find(x=>x.name==="Well Water");
    if(!item){worldPanel.innerHTML="<div class='world-empty'>The Well Water record was not found in the bundled catalogue.</div>";return;}
    const req=session.canGather(item.item_id,"well");
    worldPanel.innerHTML="<p class='world-drawer-copy'>"+esc(item.name)+" · "+esc((item.acquisition?.tool_requirements||[]).join(", "))+"</p>"+
      "<div class='world-action-row'><button class='world-action' data-world-gather='"+item.item_id+"' "+(!req.ready?"disabled":"")+">DRAW WATER</button></div>";
  };
  scene=new HomeBaseScene();
  const placeAt=(tile,facility)=>{
    if(disposed||!facility)return;
    const col=tile.col,row=tile.row;
    if(col<0||col>=12||row<0||row>=10||!siteCanUse(facility,col,row)){setFeedback("That tile does not meet this facility's land/location Requirements.");return;}
    const occupied=Object.values(session.snapshot().facilities||{}).some(v=>v?.map_position&&v.map_position.col===col&&v.map_position.row===row);
    if(occupied){setFeedback("That plot is already occupied. Choose another open tile.");return;}
    const site=facility.location_requirements?.[0]||"Owned home plot",result=session.placeFacility(facility.facility_id,site,{col,row});
    if(!result.ok){setFeedback(result.message);renderFacilityDetail(facility.facility_id);return;}
    scene.stopPlacement();snapshot=session.snapshot();scene.drawFacilities();renderBuild();
    setFeedback("Construction started. The location is saved and the building appears when its timer completes.");
  };
  scene.options={
    viewport,session,
    onReady:s=>{s.setStyle(session.getAppearance());},
    onInvalidMove:()=>setFeedback("That part of the ground is not walkable. Tap an open path or clearing."),
    onFacilityTap:id=>renderLocation(id),
    onNpcTap:i=>{
      heading.textContent=["RESIDENT","GARDENER","TRAVELLER"][i]||"RESIDENT";
      worldPanel.innerHTML="<p class='world-drawer-copy'>A local resident is here. Social details and NPC schedules will be connected to the character simulation records.</p>";
    },
    onPlacementTap:(tile,facility)=>placeAt(tile,facility)
  };
  game=new Phaser.Game({
    type:Phaser.AUTO,parent:viewport,width:Math.max(1,viewport.clientWidth),height:Math.max(1,viewport.clientHeight),
    backgroundColor:"#19251f",pixelArt:true,roundPixels:true,antialias:false,powerPreference:"low-power",
    audio:{noAudio:true},fps:{target:30,min:20,forceSetTimeOut:true},
    scale:{mode:Phaser.Scale.RESIZE,width:viewport.clientWidth,height:viewport.clientHeight},
    render:{pixelArt:true,antialias:false,roundPixels:true,clearBeforeRender:true,premultipliedAlpha:false},
    scene:[scene]
  });
  const updateClick=async event=>{
    const btn=event.target.closest("[data-world-action],[data-world-appearance],[data-world-build],[data-world-location],[data-world-facility],[data-world-start-placement],[data-world-open-build],[data-world-rest],[data-world-forage],[data-world-water],[data-world-gather],[data-world-style]");
    if(!btn)return;
    drawer.classList.remove("is-collapsed");
    if(btn.dataset.worldAction==="places"){scene.stopPlacement();renderPlaces();}
    else if(btn.dataset.worldAction==="build"||btn.hasAttribute("data-world-build"))renderBuild();
    else if(btn.dataset.worldAction==="appearance"||btn.hasAttribute("data-world-appearance"))renderAppearance();
    else if(btn.dataset.worldLocation){
      const id=btn.dataset.worldLocation,record=snapshot.facilities[id],pos=record?.map_position?locationOf(record.map_position.col,record.map_position.row):{x:200,y:154};
      scene.walkTo({x:pos.x,y:pos.y-7},()=>renderLocation(id));
    }else if(btn.dataset.worldFacility)renderFacilityDetail(btn.dataset.worldFacility);
    else if(btn.dataset.worldStartPlacement){
      const id=btn.dataset.worldStartPlacement,f=session.getFacility(id),r=session.getBuildRecord(id);
      if(!f||!r.ready){setFeedback("Construction Requirements are still missing.");return;}
      scene.startPlacement(f);setFeedback("Tap an open, suitable tile on the map to place "+f.name+".");
    }else if(btn.hasAttribute("data-world-open-build"))renderBuild();
    else if(btn.hasAttribute("data-world-rest")){
      session.toggleRest();snapshot=session.snapshot();renderLocation("pocket.starter.hut");
      setFeedback(session.isResting()?"Hut rest is active. Recovery accrues at a slow Pocket-only rate.":"Rest stopped. Unused recovery credit remains saved.");
    }else if(btn.hasAttribute("data-world-forage"))await renderForage();
    else if(btn.hasAttribute("data-world-water"))await renderWater();
    else if(btn.dataset.worldGather){
      const site=btn.textContent.includes("DRAW WATER")?"well":"meadow",result=session.startGather(btn.dataset.worldGather,site);
      setFeedback(result.ok?"Gathering started. Output is credited when the saved process completes.":result.message);snapshot=session.snapshot();
    }else if(btn.dataset.worldStyle){
      session.setAppearance(btn.dataset.worldStyle);scene.setStyle(btn.dataset.worldStyle);renderAppearance();
      setFeedback("Appearance saved for this player. Residents now use the same visual family.");
    }
  };
  const inputChange=event=>{
    const input=event.target.closest("[data-world-builders]");if(!input)return;
    session.setBuilders(input.dataset.worldBuilders,input.value);renderFacilityDetail(input.dataset.worldBuilders);
  };
  root.addEventListener("click",updateClick);root.addEventListener("change",inputChange);
  root.querySelector("[data-world-close]")?.addEventListener("click",()=>drawer.classList.toggle("is-collapsed"));
  renderPlaces();
  drawer.classList.add("is-collapsed");
  tick=window.setInterval(()=>{
    if(disposed)return;
    snapshot=session.snapshot();scene?.drawFacilities?.();
    if(heading.textContent==="SMALL HUT"&&session.isResting())renderLocation("pocket.starter.hut");
  },2500);
  return ()=>{
    disposed=true;if(tick!==null)window.clearInterval(tick);
    root.removeEventListener("click",updateClick);root.removeEventListener("change",inputChange);
    if(game)game.destroy(true);
  };
}
