import Phaser from "phaser";
import "./home-base.css";
import { openHomeBaseSession } from "./economy.js";
import { createWardrobeShopTransaction } from "./wardrobe-shop.js";

const HAIR_OPTIONS=[
  {id:"long_black",name:"Long Straight",description:"Long, straight ink-black locks with sculpted strand highlights."},
  {id:"soft_bob",name:"Soft Bob",description:"A rounded bob with clean grouped ends and soft crown shading."},
  {id:"half_up",name:"Half-up Knot",description:"A gathered crown knot with long, layered side locks."},
  {id:"high_tie",name:"High Tie",description:"A high gathered style with a compact tie and falling tail."},
  {id:"long_waves",name:"Long Waves",description:"Long flowing waves with stepped locks and layered highlights."}
];
const OUTFIT_OPTIONS=[
  {id:"black_hanfu",name:"Black Hanfu",description:"Ink-dark layered hanfu with crossed lapels and restrained antique-gold trim."},
  {id:"ivory_layers",name:"Ivory Layers",description:"Warm ivory robe panels with pale jade lining and soft folds."},
  {id:"jade_scholar",name:"Jade Scholar",description:"A refined jade scholar robe with a narrow silhouette and gold accents."},
  {id:"rose_ceremony",name:"Rose Ceremony",description:"A formal rose mantle with broad sleeves and antique-gold detailing."},
  {id:"traveller_robe",name:"Traveller Robe",description:"An asymmetric travel robe with layered fabric, leather strap and pouch."}
];
const ACCESSORY_OPTIONS=[
  {id:"jade_pin",name:"Jade Hairpin",description:"A slim jade-and-gold hairpin."},
  {id:"phoenix_comb",name:"Phoenix Comb",description:"A warm-gold comb with a small feather crest."},
  {id:"cloth_headband",name:"Cloth Headband",description:"A practical wrapped forehead band."},
  {id:"scholar_crown",name:"Scholar Crown",description:"A compact formal crown and finial."},
  {id:"round_glasses",name:"Round Glasses",description:"Small round reading glasses."},
  {id:"half_mask",name:"Half Mask",description:"A fitted lower-face travel mask."},
  {id:"bead_tassel",name:"Bead Tassel",description:"A jade bead chain with a silk tassel."},
  {id:"forehead_gem",name:"Forehead Gem",description:"A small centered spirit-gem ornament."},
  {id:"moon_veil",name:"Moon Veil",description:"A light veil falling beside the face."},
  {id:"travel_goggles",name:"Travel Goggles",description:"Leather-rimmed travel goggles."},
  {id:"ribbon_bow",name:"Ribbon Bow",description:"A tied silk ribbon at the side of the hair."},
  {id:"earring_chains",name:"Earring Chains",description:"Fine chains and small jade drops."}
];
const WORLD_SCALE=1.5;
const CHARACTER_FRAME={width:48,height:64};
const NPC_APPEARANCES=[
  {hair:"soft_bob",outfit:"jade_scholar"},
  {hair:"half_up",outfit:"ivory_layers"},
  {hair:"long_waves",outfit:"traveller_robe"}
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
const locationOf=(col,row)=>({x:(200+(col-row)*16)*WORLD_SCALE,y:(20+(col+row)*8+8)*WORLD_SCALE});
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
  constructor(){
    super("HomeBase");
    this.hair="long_black";this.outfit="black_hanfu";
    this.placement=null;this.facilityObjects=new Map();this.npcs=[];
    this.comboReady=new Set();this.comboLoading=new Map();
    this.layerReady=new Set();this.layerLoading=new Map();this.queuedLayers=new Map();
    this.accessory="none";this.accessorySprite=null;
  }
  comboName(hair,outfit){return "human_"+hair+"_"+outfit;}
  textureName(hair,outfit,move,dir){return this.comboName(hair,outfit)+"_"+move+"_"+dir;}
  animationName(hair,outfit,move,dir){return this.comboName(hair,outfit)+":"+move+":"+dir;}
  layerTextureName(slot,id,move,dir){return slot+"_"+id+"_"+move+"_"+dir;}
  layerAnimationName(slot,id,move,dir){return slot+":"+id+":"+move+":"+dir;}
  queueLayer(slot,id){
    if(!id||id==="none")return;
    const tag=slot+":"+id;if(this.queuedLayers.has(tag))return;
    this.queuedLayers.set(tag,{slot,id});
    DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const key=this.layerTextureName(slot,id,move,dir);
      this.load.spritesheet(key,"/game-assets/pxl/anims/"+key+".png",{frameWidth:CHARACTER_FRAME.width,frameHeight:CHARACTER_FRAME.height});
    }));
  }
  registerLayer(slot,id){
    const tag=slot+":"+id;if(this.layerReady.has(tag))return;
    DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const texture=this.layerTextureName(slot,id,move,dir);
      if(!this.textures.exists(texture))return;
      const key=this.layerAnimationName(slot,id,move,dir);
      if(!this.anims.exists(key))this.anims.create({
        key,frames:this.anims.generateFrameNumbers(texture,{start:0,end:move==="walk"?7:3}),
        frameRate:move==="walk"?10:3,repeat:-1
      });
    }));
    this.layerReady.add(tag);
  }
  queueCombo(hair,outfit){
    const combo=this.comboName(hair,outfit);
    if(this.queuedCombos?.has(combo))return;
    this.queuedCombos??=new Map();this.queuedCombos.set(combo,{hair,outfit});
    DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const key=this.textureName(hair,outfit,move,dir);
      this.load.spritesheet(key,"/game-assets/pxl/anims/"+key+".png",{frameWidth:CHARACTER_FRAME.width,frameHeight:CHARACTER_FRAME.height});
    }));
  }
  registerCombo(hair,outfit){
    const combo=this.comboName(hair,outfit);
    if(this.comboReady.has(combo))return;
    DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const texture=this.textureName(hair,outfit,move,dir);
      if(!this.textures.exists(texture))return;
      const key=this.animationName(hair,outfit,move,dir);
      if(!this.anims.exists(key))this.anims.create({
        key,
        frames:this.anims.generateFrameNumbers(texture,{start:0,end:move==="walk"?7:3}),
        frameRate:move==="walk"?10:3,
        repeat:-1
      });
    }));
    this.comboReady.add(combo);
  }
  preload(){
    this.load.image("home-map","/game-assets/pxl/scenes/home_base_map.png");
    ["facility_starter_hut","facility_starter_foraging","facility_starter_well","facility_farm","facility_workshop","facility_storage","facility_market","world_tree","world_rock"].forEach(id=>this.load.image(id,"/game-assets/pxl/sprites/"+id+".png"));
    this.load.spritesheet("water-glimmer","/game-assets/pxl/anims/water_glimmer.png",{frameWidth:32,frameHeight:16});
    HAIR_OPTIONS.forEach(item=>this.load.image("preview-hair-"+item.id,"/game-assets/pxl/sprites/human_preview_hair_"+item.id+".png"));
    OUTFIT_OPTIONS.forEach(item=>this.load.image("preview-outfit-"+item.id,"/game-assets/pxl/sprites/human_preview_outfit_"+item.id+".png"));
    this.hair=this.options.session.getHair();this.outfit=this.options.session.getOutfit();
    this.accessory=this.options.session.getAccessory();
    this.queueCombo(this.hair,this.outfit);
    this.queueLayer("accessory",this.accessory);
    NPC_APPEARANCES.forEach(item=>this.queueCombo(item.hair,item.outfit));
  }
  create(){
    this.queuedCombos?.forEach(({hair,outfit})=>this.registerCombo(hair,outfit));
    this.queuedLayers?.forEach(({slot,id})=>this.registerLayer(slot,id));
    this.cameras.main.setBackgroundColor("#19251f");
    this.add.image(0,0,"home-map").setOrigin(0).setScale(WORLD_SCALE).setDepth(-1000);
    this.anims.create({key:"water-glimmer",frames:this.anims.generateFrameNumbers("water-glimmer",{start:0,end:3}),frameRate:5,repeat:-1});
    [[344,74],[328,126],[300,169],[107,121],[134,154]].forEach(([x,y])=>this.add.sprite(x*WORLD_SCALE,y*WORLD_SCALE,"water-glimmer").setScale(WORLD_SCALE).setDepth(y*WORLD_SCALE+1).play("water-glimmer").setAlpha(.72));
    [[58,72,.9],[83,165,.82],[367,52,.9],[366,190,.8],[262,202,.74]].forEach(([x,y,scale])=>this.add.image(x*WORLD_SCALE,y*WORLD_SCALE,"world_tree").setOrigin(.5,1).setScale(scale*WORLD_SCALE).setDepth(y*WORLD_SCALE));
    [[75,109],[116,183],[291,216],[357,142]].forEach(([x,y])=>this.add.image(x*WORLD_SCALE,y*WORLD_SCALE,"world_rock").setOrigin(.5,1).setScale(WORLD_SCALE).setDepth(y*WORLD_SCALE));
    this.player=this.add.sprite(200*WORLD_SCALE,154*WORLD_SCALE,this.textureName(this.hair,this.outfit,"idle","s")).setOrigin(.5,1).setDepth(156*WORLD_SCALE);
    this.player.play(this.animationName(this.hair,this.outfit,"idle","s"));
    if(this.accessory!=="none")this.accessorySprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("accessory",this.accessory,"idle","s")).setOrigin(.5,1).setDepth(this.player.depth+2);
    this.syncAppearanceLayers("s","idle");
    this.addNpcs();this.drawFacilities();
    const cam=this.cameras.main,el=this.options.viewport;
    // Preserve the former camera magnification; the world grid and every
    // non-character world asset now share the same 1.5x scale as the human base.
    const coverZoom=Math.max(el.clientWidth/400,el.clientHeight/260);
    cam.setBounds(0,0,400*WORLD_SCALE,260*WORLD_SCALE);
    cam.setZoom(Math.min(2.12,Math.max(.92,coverZoom*.77)));
    cam.centerOn(this.player.x,this.player.y-4*WORLD_SCALE);
    cam.startFollow(this.player,true,.075,.075);
    this.events.on("update",()=>{
      if(this.player){
        this.player.setDepth(this.player.y+6*WORLD_SCALE);
        this.accessorySprite?.setPosition(this.player.x,this.player.y).setDepth(this.player.depth+2);
      }
      this.npcs.forEach(npc=>npc.setDepth(npc.y+5*WORLD_SCALE));
    });
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
      this.placementGhost=this.add.image(pos.x,pos.y,"facility_storage").setOrigin(.5,1).setScale(WORLD_SCALE).setAlpha(.38).setTint(0xb4d7a0).setDepth(pos.y+80*WORLD_SCALE);
    });
    this.events.once("shutdown",()=>this.placementGhost?.destroy());
    this.options.onReady?.(this);
  }
  async ensureCombo(hair,outfit){
    const combo=this.comboName(hair,outfit);
    if(this.comboReady.has(combo))return true;
    if(this.comboLoading.has(combo))return this.comboLoading.get(combo);
    const pending=new Promise((resolve,reject)=>{
      const keys=[];
      DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
        const key=this.textureName(hair,outfit,move,dir);
        if(!this.textures.exists(key)){
          keys.push(key);
          this.load.spritesheet(key,"/game-assets/pxl/anims/"+key+".png",{frameWidth:CHARACTER_FRAME.width,frameHeight:CHARACTER_FRAME.height});
        }
      }));
      if(keys.length===0){this.registerCombo(hair,outfit);resolve(true);return;}
      this.load.once("complete",()=>{
        const missing=keys.filter(key=>!this.textures.exists(key));
        if(missing.length){reject(new Error("Character variant failed to load: "+missing[0]));return;}
        this.registerCombo(hair,outfit);resolve(true);
      });
      this.load.start();
    });
    this.comboLoading.set(combo,pending);
    try{return await pending;}finally{this.comboLoading.delete(combo);}
  }
  getAppearanceState(){
    return {hair:this.hair,outfit:this.outfit,accessory:this.accessory,weapon:"none"};
  }
  setAppearanceShopOpen(open){
    this.shopMode=!!open;
    if(this.input)this.input.enabled=!this.shopMode;
  }
  async setAppearance(hair,outfit){
    if(!HAIR_OPTIONS.some(x=>x.id===hair)||!OUTFIT_OPTIONS.some(x=>x.id===outfit))return false;
    await this.ensureCombo(hair,outfit);
    this.hair=hair;this.outfit=outfit;
    if(this.player)this.applySprite(this.player,this.lastDirection||"s",this.moving?"walk":"idle");
    return true;
  }
  async ensureLayer(slot,id){
    if(id==="none")return true;
    const tag=slot+":"+id;if(this.layerReady.has(tag))return true;
    if(this.layerLoading.has(tag))return this.layerLoading.get(tag);
    const pending=new Promise((resolve,reject)=>{
      const keys=[];
      DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
        const key=this.layerTextureName(slot,id,move,dir);
        if(!this.textures.exists(key)){keys.push(key);this.load.spritesheet(key,"/game-assets/pxl/anims/"+key+".png",{frameWidth:CHARACTER_FRAME.width,frameHeight:CHARACTER_FRAME.height});}
      }));
      if(!keys.length){this.registerLayer(slot,id);resolve(true);return;}
      this.load.once("complete",()=>{
        const missing=keys.filter(key=>!this.textures.exists(key));
        if(missing.length){reject(new Error("Appearance layer failed to load: "+missing[0]));return;}
        this.registerLayer(slot,id);resolve(true);
      });
      this.load.start();
    });
    this.layerLoading.set(tag,pending);
    try{return await pending;}finally{this.layerLoading.delete(tag);}
  }
  syncAppearanceLayers(dir=this.lastDirection||"s",move=this.moving?"walk":"idle"){
    if(this.accessory!=="none"&&this.accessorySprite){
      this.accessorySprite.setVisible(true).play(this.layerAnimationName("accessory",this.accessory,move,dir),true);
    }else this.accessorySprite?.setVisible(false);
  }
  async setAccessory(id){
    if(id!=="none"&&!ACCESSORY_OPTIONS.some(x=>x.id===id))return false;
    await this.ensureLayer("accessory",id);
    this.accessory=id;
    if(id!=="none"&&!this.accessorySprite)this.accessorySprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("accessory",id,"idle",this.lastDirection||"s")).setOrigin(.5,1);
    this.syncAppearanceLayers();
    return true;
  }
  addNpcs(){
    const dirs=["s","sw","e"];
    [[245,108,0xa9b98b],[286,148,0xc6a06d],[150,175,0x9aadb1]].forEach(([x,y,tint],i)=>{
      const appearance=NPC_APPEARANCES[i],dir=dirs[i],px=x*WORLD_SCALE,py=y*WORLD_SCALE;
      const npc=this.add.sprite(px,py,this.textureName(appearance.hair,appearance.outfit,"idle",dir)).setOrigin(.5,1).setDepth(py+2);
      npc.play(this.animationName(appearance.hair,appearance.outfit,"idle",dir));
      npc.setTint(tint).setInteractive({useHandCursor:true});
      npc.on("pointerdown",(pointer,localX,localY,event)=>{event?.stopPropagation?.();this.walkTo({x:px,y:py-4*WORLD_SCALE},()=>this.options.onNpcTap?.(i),{x:px,y:py-4*WORLD_SCALE});});
      this.npcs.push(npc);
    });
  }
  worldToTile(x,y){const localX=x/WORLD_SCALE,localY=y/WORLD_SCALE,b=(localY-28)/8,a=(localX-200)/16;return {col:Math.round((a+b)/2),row:Math.round((b-a)/2)};}
  drawFacilities(){
    if(!this.options?.session||!this.player)return;
    const facilities=this.options.session.snapshot().facilities||{};
    for(const [id,record] of Object.entries(facilities)){
      if(!record?.operational||!record.map_position)continue;
      const pos=locationOf(record.map_position.col,record.map_position.row),key=spriteForFacility(this.options.session.getFacility(id));
      const existing=this.facilityObjects.get(id);
      if(existing){existing.setPosition(pos.x,pos.y).setDepth(pos.y+1);continue;}
      const item=this.add.image(pos.x,pos.y,key).setOrigin(.5,1).setScale(WORLD_SCALE).setDepth(pos.y+1).setInteractive({useHandCursor:true});
      item.setData("facilityId",id);item.on("pointerdown",(pointer,localX,localY,event)=>{event?.stopPropagation?.();this.walkTo({x:pos.x,y:pos.y-7*WORLD_SCALE},()=>this.options.onFacilityTap?.(id),{x:pos.x,y:pos.y-7*WORLD_SCALE});});
      this.facilityObjects.set(id,item);
    }
  }
  applySprite(sprite,dir,move){
    const key=this.animationName(this.hair,this.outfit,move,dir);
    sprite.play(this.anims.exists(key)?key:this.animationName(this.hair,this.outfit,"idle","s"),true);
    if(sprite===this.player)this.syncAppearanceLayers(dir,move);
  }
  moveToTap(x,y){
    if(!this.player||this.moving||this.placement||this.shopMode)return;
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
  let shopDraft=null,shopConfirmPending=false,wardrobeShop=null,shopClosePromise=null;
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
  const applyShopDraft=async appearance=>{
    const bodyReady=await scene.setAppearance(appearance.hair,appearance.outfit);
    const accessoryReady=await scene.setAccessory(appearance.accessory||"none");
    if(!bodyReady||!accessoryReady)throw new Error("The new character base or accessory layer could not be applied.");
    return true;
  };
  const refreshShopPreview=()=>{
    shopDraft=wardrobeShop?.getDraft()??shopDraft;
    shopConfirmPending=wardrobeShop?.isConfirmPending()??shopConfirmPending;
    if(!shopDraft)return;
    const {hair,outfit,accessory}=shopDraft;
    const body=worldPanel.querySelector("[data-shop-body]");
    const accessoryLayer=worldPanel.querySelector("[data-shop-accessory]");
    if(body)body.style.backgroundImage="url('/game-assets/pxl/anims/human_"+hair+"_"+outfit+"_idle_s.png')";
    if(accessoryLayer)accessoryLayer.style.backgroundImage=accessory==="none"?"none":"url('/game-assets/pxl/anims/accessory_"+accessory+"_idle_s.png')";
    const title=worldPanel.querySelector("[data-shop-character-title]");
    if(title)title.textContent=OUTFIT_OPTIONS.find(x=>x.id===outfit)?.name||"Character";
    const labels=[
      ["hair",HAIR_OPTIONS.find(x=>x.id===hair)?.name],
      ["outfit",OUTFIT_OPTIONS.find(x=>x.id===outfit)?.name],
      ["accessory",ACCESSORY_OPTIONS.find(x=>x.id===accessory)?.name||"None"]
    ];
    for(const [slot,value] of labels){const node=worldPanel.querySelector("[data-shop-current='"+slot+"']");if(node)node.textContent=value||"—";}
    const confirm=worldPanel.querySelector("[data-shop-confirm]");
    if(confirm)confirm.hidden=!shopConfirmPending;
    const actions=worldPanel.querySelector("[data-shop-actions]");
    if(actions)actions.hidden=shopConfirmPending;
  };
  const renderShopCatalog=()=>{
    if(!shopDraft)return;
    const catalog=worldPanel.querySelector("[data-shop-sections]");
    if(!catalog)return;
    const sections=[
      {slot:"hair",title:"HAIRSTYLES",items:HAIR_OPTIONS,current:shopDraft.hair},
      {slot:"outfit",title:"OUTFITS",items:OUTFIT_OPTIONS,current:shopDraft.outfit},
      {slot:"accessory",title:"ACCESSORIES",items:ACCESSORY_OPTIONS,current:shopDraft.accessory}
    ];
    catalog.innerHTML=sections.map(group=>{
      const cards=group.items.map(item=>{
        const selected=group.current===item.id;
        const image="/game-assets/pxl/sprites/human_preview_"+group.slot+"_"+item.id+".png";
        const art=group.slot==="accessory"
          ? "<span class='world-shop-item-art world-shop-item-art-stack'><img class='world-shop-thumb-base' src='/game-assets/pxl/sprites/human_preview_hair_long_black.png' alt='' loading='lazy'><img class='world-shop-thumb-accessory' src='"+image+"' alt='' loading='lazy'></span>"
          : "<span class='world-shop-item-art'><img src='"+image+"' alt='' loading='lazy'></span>";
        return "<button type='button' class='world-shop-item "+(selected?"is-selected":"")+"' data-world-"+group.slot+"='"+item.id+"' aria-pressed='"+selected+"'>"+
          art+
          "<span class='world-shop-item-copy'><b>"+esc(item.name)+"</b><small>"+esc(item.description)+"</small></span>"+
          "<span class='world-shop-item-price'><small>PRICE</small><b>—</b></span>"+
          "<em>"+(selected?"PREVIEWING":"PREVIEW")+"</em></button>";
      }).join("");
      const none=group.slot==="accessory"
        ?"<button type='button' class='world-shop-item world-shop-none "+(group.current==="none"?"is-selected":"")+"' data-world-"+group.slot+"='none' aria-pressed='"+(group.current==="none")+"'>"+
          "<span class='world-shop-item-art world-shop-empty-art'>—</span>"+
          "<span class='world-shop-item-copy'><b>No accessory</b><small>Leave this slot empty.</small></span>"+
          "<span class='world-shop-item-price'><small>PRICE</small><b>—</b></span><em>"+(group.current==="none"?"PREVIEWING":"PREVIEW")+"</em></button>":"";
      return "<section class='world-shop-section' data-shop-section='"+group.slot+"'>"+
        "<header class='world-shop-section-head'><strong>"+group.title+"</strong><small>"+group.items.length+" ITEMS</small></header>"+
        "<div class='world-shop-section-track'>"+none+cards+"</div></section>";
    }).join("");
  };
  const renderAppearance=()=>{
    heading.textContent="WARDROBE SHOP";
    drawer.classList.add("is-shop");
    drawer.classList.remove("is-collapsed");
    if(!wardrobeShop?.open())return;
    shopDraft=wardrobeShop.getDraft();
    shopConfirmPending=false;
    scene.setAppearanceShopOpen(true);
    worldPanel.innerHTML=
      "<div class='world-shop-layout'>"+
        "<div class='world-shop-wallet'><span><small>WALLET</small><b data-shop-wallet>"+esc(session.currency(snapshot?.wallet_xc??0))+"</b></span><span><small>ITEM PRICES</small><b>—</b></span></div>"+
        "<section class='world-shop-preview'>"+
          "<div class='world-shop-avatar-stage' aria-label='Live full character preview'>"+
            "<div class='world-shop-avatar-layer world-shop-avatar-body' data-shop-body></div>"+
            "<div class='world-shop-avatar-layer world-shop-avatar-accessory' data-shop-accessory></div>"+
            "<span class='world-shop-preview-label'>LIVE PREVIEW</span>"+
          "</div>"+
          "<div class='world-shop-preview-details'><small>YOUR CHARACTER</small><strong data-shop-character-title></strong>"+
            "<div class='world-shop-current-grid'>"+
              "<span>HAIR <b data-shop-current='hair'></b></span>"+
              "<span>OUTFIT <b data-shop-current='outfit'></b></span>"+
              "<span>ACCESSORY <b data-shop-current='accessory'></b></span>"+
            "</div>"+
            "<p>Tap an item to preview it on your character. Nothing is saved until purchase is confirmed.</p>"+
          "</div>"+
        "</section>"+
        "<div class='world-shop-sections' data-shop-sections></div>"+
        "<div class='world-shop-footer' data-shop-actions>"+
          "<span class='world-shop-total'><small>SELECTED PRICE</small><b>—</b></span>"+
          "<button type='button' class='world-shop-buy' data-shop-buy>BUY</button>"+
          "<button type='button' class='world-shop-exit' data-shop-exit>EXIT</button>"+
        "</div>"+
        "<div class='world-shop-confirm' data-shop-confirm hidden>"+
          "<div><strong>CONFIRM PURCHASE?</strong><small>Prices are not configured yet. No currency will be charged. Confirm to save and equip this appearance.</small></div>"+
          "<button type='button' class='world-shop-buy' data-shop-confirm-buy>CONFIRM</button>"+
          "<button type='button' class='world-shop-exit' data-shop-cancel-buy>CANCEL</button>"+
        "</div>"+
      "</div>";
    renderShopCatalog();
    refreshShopPreview();
  };
  const exitAppearanceShop=({restore=true,collapse=false}={})=>{
    if(shopClosePromise)return shopClosePromise;
    shopClosePromise=(async()=>{
      if(restore&&wardrobeShop?.isOpen()){
        const restored=await wardrobeShop.exit();
        if(!restored){
          setFeedback("The original appearance could not be restored yet. The shop remains open; try EXIT again.");
          return false;
        }
      }else if(!restore){
        wardrobeShop?.abandon();
      }
      shopDraft=null;shopConfirmPending=false;
      scene.setAppearanceShopOpen(false);
      drawer.classList.remove("is-shop");
      if(collapse){drawer.classList.add("is-collapsed");}
      else renderPlaces();
      return true;
    })();
    return shopClosePromise.finally(()=>{shopClosePromise=null;});
  };
  const commitAppearanceShop=async()=>{
    if(!wardrobeShop?.isOpen())return false;
    const saved=await wardrobeShop.confirm();
    if(!saved){
      setFeedback("Appearance was not saved. Your preview is still open; check local storage and confirm again.");
      return false;
    }
    shopDraft=null;shopConfirmPending=false;
    scene.setAppearanceShopOpen(false);
    drawer.classList.remove("is-shop");
    setFeedback("Appearance saved and equipped. No currency was charged because prices are not configured.");
    renderPlaces();
    return true;
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
  wardrobeShop=createWardrobeShopTransaction({
    readAppearance:()=>scene.getAppearanceState(),
    previewAppearance:applyShopDraft,
    saveAppearance:appearance=>session.setAppearanceSlots(appearance)
  });
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
    onReady:s=>{s.setAppearance(session.getHair(),session.getOutfit());},
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
    const btn=event.target.closest("[data-shop-buy],[data-shop-exit],[data-shop-confirm-buy],[data-shop-cancel-buy],[data-world-action],[data-world-appearance],[data-world-build],[data-world-location],[data-world-facility],[data-world-start-placement],[data-world-open-build],[data-world-rest],[data-world-forage],[data-world-water],[data-world-gather],[data-world-hair],[data-world-outfit],[data-world-accessory]");
    if(!btn)return;
    if(btn.hasAttribute("data-shop-exit")){
      const closed=await exitAppearanceShop({restore:true});
      if(closed)setFeedback("Shop closed. Your original appearance has been restored.");
      return;
    }
    if(btn.hasAttribute("data-shop-buy")){
      if(wardrobeShop?.requestConfirmation())refreshShopPreview();
      return;
    }
    if(btn.hasAttribute("data-shop-cancel-buy")){
      wardrobeShop?.cancelConfirmation();refreshShopPreview();return;
    }
    if(btn.hasAttribute("data-shop-confirm-buy")){
      await commitAppearanceShop();return;
    }
    const isShopItem=btn.dataset.worldHair!==undefined||btn.dataset.worldOutfit!==undefined||btn.dataset.worldAccessory!==undefined;
    // Any route away from the open shop without a confirmed purchase is an exit.
    if(wardrobeShop?.isOpen()&&!isShopItem){
      const closed=await exitAppearanceShop({restore:true});
      if(!closed)return;
    }
    drawer.classList.remove("is-collapsed");
    if(btn.dataset.worldAction==="places"){scene.stopPlacement();drawer.classList.remove("is-shop");renderPlaces();}
    else if(btn.dataset.worldAction==="build"||btn.hasAttribute("data-world-build")){drawer.classList.remove("is-shop");renderBuild();}
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
    }else if(btn.dataset.worldHair){
      try{
        const next={...shopDraft,hair:btn.dataset.worldHair};
        const result=await wardrobeShop.select(next);shopDraft=wardrobeShop.getDraft();
        if(!result.ok){setFeedback("Hairstyle preview could not be loaded: "+esc(result.error?.message||"Unknown error."));return;}
        renderShopCatalog();refreshShopPreview();
        setFeedback("Hairstyle previewed. Confirm BUY to save it.");
      }catch(error){setFeedback("Hairstyle preview could not be loaded: "+esc(error.message));}
    }else if(btn.dataset.worldOutfit){
      try{
        const next={...shopDraft,outfit:btn.dataset.worldOutfit};
        const result=await wardrobeShop.select(next);shopDraft=wardrobeShop.getDraft();
        if(!result.ok){setFeedback("Outfit preview could not be loaded: "+esc(result.error?.message||"Unknown error."));return;}
        renderShopCatalog();refreshShopPreview();
        setFeedback("Outfit previewed. Confirm BUY to save it.");
      }catch(error){setFeedback("Outfit preview could not be loaded: "+esc(error.message));}
    }else if(btn.dataset.worldAccessory!==undefined){
      try{
        const next={...shopDraft,accessory:btn.dataset.worldAccessory};
        const result=await wardrobeShop.select(next);shopDraft=wardrobeShop.getDraft();
        if(!result.ok){setFeedback("Accessory preview could not be loaded: "+esc(result.error?.message||"Unknown error."));return;}
        renderShopCatalog();refreshShopPreview();
        setFeedback("Accessory previewed. Confirm BUY to save it.");
      }catch(error){setFeedback("Accessory preview could not be loaded: "+esc(error.message));}
    }

  };
  const inputChange=event=>{
    const input=event.target.closest("[data-world-builders]");if(!input)return;
    session.setBuilders(input.dataset.worldBuilders,input.value);renderFacilityDetail(input.dataset.worldBuilders);
  };
  const dismissUnconfirmedShop=event=>{
    if(!wardrobeShop?.isOpen())return;
    if(event?.type==="click"&&drawer.contains(event.target))return;
    void exitAppearanceShop({restore:true}).then(closed=>{
      if(closed)setFeedback("Shop closed without purchase. Your original appearance has been restored.");
    });
  };
  const onShopEscape=event=>{
    if(event.key!=="Escape"||!wardrobeShop?.isOpen())return;
    event.preventDefault();
    event.stopPropagation();
    void exitAppearanceShop({restore:true}).then(closed=>{
      if(closed)setFeedback("Shop closed without purchase. Your original appearance has been restored.");
    });
  };
  root.addEventListener("click",updateClick);root.addEventListener("change",inputChange);
  document.addEventListener("click",dismissUnconfirmedShop,true);
  document.addEventListener("keydown",onShopEscape,true);
  root.querySelector("[data-world-close]")?.addEventListener("click",async()=>{
    if(wardrobeShop?.isOpen()){
      const closed=await exitAppearanceShop({restore:true,collapse:true});
      if(closed)setFeedback("Shop closed. Your original appearance has been restored.");
      return;
    }
    drawer.classList.toggle("is-collapsed");
  });
  renderPlaces();
  drawer.classList.add("is-collapsed");
  tick=window.setInterval(()=>{
    if(disposed)return;
    snapshot=session.snapshot();scene?.drawFacilities?.();
    if(heading.textContent==="SMALL HUT"&&session.isResting())renderLocation("pocket.starter.hut");
  },2500);
  return ()=>{
    disposed=true;if(tick!==null)window.clearInterval(tick);
    wardrobeShop?.abandon();
    root.removeEventListener("click",updateClick);root.removeEventListener("change",inputChange);
    document.removeEventListener("click",dismissUnconfirmedShop,true);
    document.removeEventListener("keydown",onShopEscape,true);
    if(game)game.destroy(true);
  };
}
