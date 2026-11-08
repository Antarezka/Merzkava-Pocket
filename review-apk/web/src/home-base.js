import Phaser from "phaser";
import "./home-base.css";
import { openHomeBaseSession } from "./economy.js";
import { createWardrobeShopTransaction } from "./wardrobe-shop.js";

const HAIR_OPTIONS=[
  {id:"long_black",name:"Long Straight",description:"Long, smooth locks with a calm centre fringe."},
  {id:"soft_bob",name:"Soft Bob",description:"Rounded short hair with grouped pixel ends."},
  {id:"half_up",name:"Half-up Knot",description:"A compact tied crown with long side locks."},
  {id:"high_tie",name:"High Tie",description:"A high gathered hairstyle with a short falling tail of hair."},
  {id:"long_waves",name:"Long Waves",description:"Long layered waves with broad stepped locks."},
  {id:"braided_crown",name:"Braided Crown",description:"A broad wrapped braid with small crown knots."},
  {id:"low_chignon",name:"Low Chignon",description:"A compact low coil with neat side locks."},
  {id:"side_ponytail",name:"Side Ponytail",description:"A gathered side tie with one long lock."},
  {id:"twin_braids",name:"Twin Braids",description:"Two distinct thick braids with stepped ends."},
  {id:"scholar_topknot",name:"Scholar Topknot",description:"A formal tied crown with a narrow ornament pin."}
];
const OUTFIT_OPTIONS=[
  {id:"black_hanfu",name:"Black Hanfu",description:"Ink-black layered robe, crossed lapels and restrained gold edging."},
  {id:"ivory_layers",name:"Ivory Layers",description:"Warm ivory panels with pale jade lining."},
  {id:"jade_scholar",name:"Jade Scholar",description:"Long jade robe with a narrow scholar silhouette."},
  {id:"rose_ceremony",name:"Rose Ceremony",description:"A broad formal mantle with muted rose and antique gold."},
  {id:"traveller_robe",name:"Traveller Robe",description:"An asymmetric layered robe with leather-toned accents."},
  {id:"crimson_sect",name:"Crimson Sect Coat",description:"A short sect coat with split tails and a trailing sash."},
  {id:"moon_priest",name:"Moon Priest Mantle",description:"A pale layered mantle with a moon seal and broad collar."},
  {id:"iron_guard",name:"Iron Guard Armour",description:"A structured cuirass, shoulder plates and segmented guards."},
  {id:"wanderer_cloak",name:"Wanderer Cloak",description:"An asymmetric weather cloak with a travel strap."},
  {id:"azure_artificer",name:"Azure Artificer",description:"A fitted tunic, utility apron and tool pouches."}
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
const WEAPON_OPTIONS=[
  {id:"straight_sword",name:"Straight Sword",description:"A straight-backed sword carried diagonally.",layer:"back"},
  {id:"crescent_dao",name:"Crescent Dao",description:"A single-edged dao held at the side.",layer:"front"},
  {id:"twin_blades",name:"Twin Blades",description:"A matched pair of short back blades.",layer:"back"},
  {id:"spear",name:"Spear",description:"A long spear with a compact metal head.",layer:"front"},
  {id:"jade_staff",name:"Jade Staff",description:"A wood staff capped with jade.",layer:"front"},
  {id:"recurve_bow",name:"Recurve Bow",description:"A curved bow and taut string.",layer:"back"},
  {id:"war_fan",name:"War Fan",description:"A reinforced folding fan.",layer:"front"},
  {id:"closed_umbrella",name:"Closed Umbrella",description:"A reinforced closed umbrella carried like a cane.",layer:"front"},
  {id:"short_sword",name:"Short Sword",description:"A short side sword.",layer:"front"},
  {id:"moon_polearm",name:"Moon Polearm",description:"A crescent-bladed polearm.",layer:"back"},
  {id:"scroll_case",name:"Scroll Case",description:"A lacquered scroll case carried on the back.",layer:"back"},
  {id:"lantern_staff",name:"Lantern Staff",description:"A staff with a small hanging lantern.",layer:"front"}
];
const WORLD_SCALE=1;
const CHARACTER_FRAME={width:48,height:64};
const NPC_APPEARANCES=[{hair:"soft_bob",outfit:"jade_scholar"},{hair:"half_up",outfit:"ivory_layers"},{hair:"long_waves",outfit:"traveller_robe"}];
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const DIR_VECTOR={n:[0,-1],ne:[1,-1],e:[1,0],se:[1,1],s:[0,1],sw:[-1,1],w:[-1,0],nw:[-1,-1]};
const WORLD_COLS=24,WORLD_ROWS=20,TILE_W=32,TILE_H=16,MAP_ORIGIN_X=400,MAP_ORIGIN_Y=20,WORLD_WIDTH=800,WORLD_HEIGHT=440;
const BASE_TERRAIN=["ggggggggggww","gggggggggwww","ggppggggwwww","gppppgggwwwg","gpppggggwwgg","ggppddggwggg","gggggdgwwggg","ggggddwwgggg","ggggggwggggg","gggggggggggg"];
const TERRAIN=Array.from({length:WORLD_ROWS},(_,row)=>Array.from({length:WORLD_COLS},(_,col)=>{
 if(row<10&&col<12)return BASE_TERRAIN[row][col];
 const riverCol=19+Math.round(Math.sin((row+1)*.42)*1.3);
 if(col===riverCol&&row>=1&&row<=17)return "w";
 if(row===8&&col>=12&&col<=18)return "d";
 if(col===12&&row>=8&&row<=15)return "d";
 if(row>=15&&col>=13&&col<=21&&((row+col)%4!==0))return "d";
 const seed=(col*37+row*61+col*row*13)%101;
 if(seed<7)return "r";if(seed<15)return "s";if(seed<23)return "d";return "g";
}).join(""));
const RESERVED_CELLS=new Set(["5,4","6,6","7,4","6,5","9,5","10,7","10,8","4,8"]);
const STARTER_SPRITES={"pocket.starter.hut":"facility_starter_hut","pocket.starter.foraging":"facility_starter_foraging","pocket.starter.well":"facility_starter_well"};
const FAMILY_SPRITES=[[/farm|horticulture|garden|agriculture/i,"facility_farm"],[/water|sanitation|aquaculture|fish/i,"facility_starter_well"],[/storage|logistics/i,"facility_storage"],[/trade|commerce|market/i,"facility_market"],[/workshop|processing|textile|ceramic|medicine|herb/i,"facility_workshop"]];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const locationOf=(col,row)=>({x:MAP_ORIGIN_X+(col-row)*TILE_W/2,y:MAP_ORIGIN_Y+(col+row)*TILE_H/2+8});
const groundOf=(col,row)=>{const p=locationOf(col,row);return {x:p.x,y:p.y+8};};
const directionOf=(dx,dy)=>DIRS[Math.round((((Math.atan2(dx,-dy)+Math.PI*2)%(Math.PI*2))/(Math.PI/4)))%8];
const inWorld=(col,row)=>col>=0&&row>=0&&col<WORLD_COLS&&row<WORLD_ROWS;
const terrainAt=(col,row)=>inWorld(col,row)?TERRAIN[row][col]:"";
const walkable=(col,row)=>["g","s","d"].includes(terrainAt(col,row));
const tileKey=(col,row)=>col+","+row;
const siteCanUse=(facility,col,row)=>{
 const req=(facility.location_requirements||[]).join(" ").toLowerCase(),tile=terrainAt(col,row);
 if(!tile||tile==="w"||tile==="p"||tile==="d"||tile==="r")return false;
 const nearWater=[[col-1,row],[col+1,row],[col,row-1],[col,row+1]].some(([x,y])=>["w","p"].includes(terrainAt(x,y)));
 if(/water|riverbank|lake|coast|groundwater/.test(req))return nearWater;
 if(/arable|garden|terrace|farm|pasture/.test(req))return tile==="g"||tile==="s";
 return tile==="g"||tile==="s";
};
const spriteForFacility=f=>{
 const id=f?.facility_id||"";if(STARTER_SPRITES[id])return STARTER_SPRITES[id];
 return FAMILY_SPRITES.find(([pattern])=>pattern.test((f?.family||"")+" "+(f?.name||"")))?.[1]||"facility_storage";
};
class HomeBaseScene extends Phaser.Scene{
  constructor(){
    super("HomeBase");
    this.hair="long_black";this.outfit="black_hanfu";
    this.placement=null;this.facilityObjects=new Map();this.npcs=[];
    this.comboReady=new Set();this.comboLoading=new Map();
    this.layerReady=new Set();this.layerLoading=new Map();this.queuedLayers=new Map();
    this.accessory="none";this.weapon="none";this.accessorySprite=null;this.weaponSprite=null;
    this.decorCells=new Set();this.moving=false;this.playerTile={col:6,row:5};
    this.exploredCells=new Set();this.currentlyVisible=new Set();this.fogGraphics=null;
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
    ["facility_starter_hut","facility_starter_foraging","facility_starter_well","facility_farm","facility_workshop","facility_storage","facility_market","world_tree","world_rock"].forEach(id=>this.load.image(id,"/game-assets/pxl/sprites/"+id+".png"));
    this.load.spritesheet("water-glimmer","/game-assets/pxl/anims/water_glimmer.png",{frameWidth:32,frameHeight:16});
    HAIR_OPTIONS.forEach(item=>this.load.image("preview-hair-"+item.id,"/game-assets/pxl/sprites/human_preview_hair_"+item.id+".png"));
    OUTFIT_OPTIONS.forEach(item=>this.load.image("preview-outfit-"+item.id,"/game-assets/pxl/sprites/human_preview_outfit_"+item.id+".png"));
    this.hair=this.options.session.getHair();this.outfit=this.options.session.getOutfit();
    this.accessory=this.options.session.getAccessory();this.weapon=this.options.session.getWeapon();
    this.queueCombo(this.hair,this.outfit);
    this.queueLayer("accessory",this.accessory);this.queueLayer("weapon",this.weapon);
    NPC_APPEARANCES.forEach(item=>this.queueCombo(item.hair,item.outfit));
  }
  create(){
    this.queuedCombos?.forEach(({hair,outfit})=>this.registerCombo(hair,outfit));
    this.queuedLayers?.forEach(({slot,id})=>this.registerLayer(slot,id));
    this.cameras.main.setBackgroundColor("#19251f");this.drawWorld();this.addWorldDecorations();
    if(!this.anims.exists("water-glimmer"))this.anims.create({key:"water-glimmer",frames:this.anims.generateFrameNumbers("water-glimmer",{start:0,end:3}),frameRate:5,repeat:-1});
    const spawn=groundOf(this.playerTile.col,this.playerTile.row);
    this.playerShadow=this.add.ellipse(spawn.x,spawn.y-2,40,11,0x050a08,.34).setDepth(spawn.y+2);
    this.player=this.add.sprite(spawn.x,spawn.y,this.textureName(this.hair,this.outfit,"idle","s")).setOrigin(.5,1).setDepth(spawn.y+6);
    this.player.play(this.animationName(this.hair,this.outfit,"idle","s"));
    if(this.accessory!=="none")this.accessorySprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("accessory",this.accessory,"idle","s")).setOrigin(.5,1).setDepth(this.player.depth+2);
    if(this.weapon!=="none")this.weaponSprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("weapon",this.weapon,"idle","s")).setOrigin(.5,1).setDepth(this.player.depth-1);
    this.syncAppearanceLayers("s","idle");this.addNpcs();this.drawFacilities();
    this.exploredCells=new Set(this.options.session.getExploredCells?.()||[]);
    this.refreshFogOfWar();
    const cam=this.cameras.main,el=this.options.viewport;cam.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const fit=Math.min(el.clientWidth/320,el.clientHeight/360);cam.setZoom(Phaser.Math.Clamp(fit,.95,1.3));
    cam.centerOn(this.player.x,this.player.y-18);cam.startFollow(this.player,true,.075,.075);this.lastDirection="s";
    this.events.on("update",()=>{
      if(this.player){
        this.player.setDepth(this.player.y+6);this.playerShadow?.setPosition(this.player.x,this.player.y-2).setDepth(this.player.y+2);
        this.accessorySprite?.setPosition(this.player.x,this.player.y).setDepth(this.player.depth+2);
        const layer=WEAPON_OPTIONS.find(x=>x.id===this.weapon)?.layer||"back";
        this.weaponSprite?.setPosition(this.player.x,this.player.y).setDepth(this.player.depth+(layer==="back"?-1:1));
      }
      this.npcs.forEach(npc=>{npc.setDepth(npc.y+5);npc.shadow?.setPosition(npc.x,npc.y-2).setDepth(npc.y+2);});
    });
    this.input.addPointer(1);this.cameraPointers=new Map();this.dragState=null;this.pinchState=null;
    this.input.on("pointerdown",pointer=>{
      this.cameraPointers.set(pointer.id,{x:pointer.x,y:pointer.y,lastX:pointer.x,lastY:pointer.y});
      if(this.cameraPointers.size===1)this.dragState={id:pointer.id,x:pointer.x,y:pointer.y,lastX:pointer.x,lastY:pointer.y,moved:false};
      else if(this.cameraPointers.size>=2){
        const pair=Array.from(this.cameraPointers.values()).slice(0,2);
        this.pinchState={distance:Math.max(1,Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y)),zoom:cam.zoom};
        if(this.dragState)this.dragState.moved=true;cam.stopFollow();
      }
    });
    this.input.on("pointermove",pointer=>{
      const state=this.cameraPointers.get(pointer.id);if(!state)return;
      const dx=pointer.x-state.lastX,dy=pointer.y-state.lastY;state.x=pointer.x;state.y=pointer.y;state.lastX=pointer.x;state.lastY=pointer.y;
      if(this.cameraPointers.size>=2){
        const pair=Array.from(this.cameraPointers.values()).slice(0,2);
        if(!this.pinchState)this.pinchState={distance:Math.max(1,Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y)),zoom:cam.zoom};
        const distance=Math.max(1,Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y));
        cam.setZoom(Phaser.Math.Clamp(this.pinchState.zoom*distance/this.pinchState.distance,.72,1.6));
        if(this.dragState)this.dragState.moved=true;return;
      }
      if(!this.dragState||pointer.id!==this.dragState.id)return;
      if(!this.dragState.moved&&Math.hypot(pointer.x-this.dragState.x,pointer.y-this.dragState.y)>7){this.dragState.moved=true;cam.stopFollow();}
      if(this.dragState.moved){cam.scrollX-=dx/cam.zoom;cam.scrollY-=dy/cam.zoom;return;}
      if(this.placement){
        const world=cam.getWorldPoint(pointer.x,pointer.y),tile=this.worldToTile(world.x,world.y),pos=locationOf(tile.col,tile.row);
        this.placementGhost?.destroy();if(inWorld(tile.col,tile.row)&&this.currentlyVisible.has(tileKey(tile.col,tile.row)))this.placementGhost=this.add.image(pos.x,pos.y+8,"facility_storage").setOrigin(.5,1).setAlpha(.38).setTint(0xb4d7a0).setDepth(pos.y+80);
      }
    });
    this.input.on("pointerup",pointer=>{
      const wasPinch=this.cameraPointers.size>=2||!!this.pinchState,gesture=this.dragState;this.cameraPointers.delete(pointer.id);
      if(wasPinch){this.cameraPointers.clear();this.dragState=null;this.pinchState=null;return;}
      this.dragState=null;if(!gesture||pointer.id!==gesture.id||gesture.moved)return;
      const world=cam.getWorldPoint(pointer.x,pointer.y),tile=this.worldToTile(world.x,world.y);
      if(this.placement){this.options.onPlacementTap?.(tile,this.placement);return;}
      const npc=this.npcs.find(item=>{
        const pos=item.getData("tile");
        return pos&&this.currentlyVisible.has(tileKey(pos.col,pos.row))&&item.getBounds().contains(world.x,world.y);
      });
      if(npc){const approach=this.findApproachTile(npc.getData("tile"));if(approach)this.walkToTile(approach,()=>this.options.onNpcTap?.(npc.getData("residentIndex")));else this.options.onInvalidMove?.();return;}
      for(const [id,item] of this.facilityObjects){
        if(!item.getBounds().contains(world.x,world.y))continue;
        const pos=item.getData("tile");
        if(!pos||!this.currentlyVisible.has(tileKey(pos.col,pos.row)))continue;
        const approach=this.findApproachTile(pos);if(approach)this.walkToTile(approach,()=>this.options.onFacilityTap?.(id));else this.options.onInvalidMove?.();return;
      }
      this.moveToTap(world.x,world.y);
    });
    this.input.on("wheel",(pointer,gameObjects,deltaX,deltaY)=>cam.setZoom(Phaser.Math.Clamp(cam.zoom*(deltaY>0?.9:1.1),.72,1.6)));
    this.events.once("shutdown",()=>this.placementGhost?.destroy());this.options.onReady?.(this);
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
  async setAppearance(hair,outfit){
    if(!HAIR_OPTIONS.some(x=>x.id===hair)||!OUTFIT_OPTIONS.some(x=>x.id===outfit))return false;
    await this.ensureCombo(hair,outfit);
    this.hair=hair;this.outfit=outfit;
    if(this.player)this.applySprite(this.player,this.lastDirection||"s",this.moving?"walk":"idle");
    return true;
  }
  drawWorld(){
    const g=this.add.graphics();g.setDepth(-1000);
    const palette={g:[45,76,52],s:[105,112,94],d:[116,94,66],w:[36,104,113],p:[55,125,130],r:[104,102,88]};
    for(let row=0;row<WORLD_ROWS;row++)for(let col=0;col<WORLD_COLS;col++){
      const kind=terrainAt(col,row),pos=locationOf(col,row),rgb=palette[kind]||palette.g;
      const top={x:pos.x,y:pos.y-8},right={x:pos.x+16,y:pos.y},bottom={x:pos.x,y:pos.y+8},left={x:pos.x-16,y:pos.y};
      if(kind==="r"){
        g.fillStyle(0x343b31,.96);g.fillPoints([{x:left.x,y:left.y},{x:bottom.x,y:bottom.y},{x:bottom.x,y:bottom.y+7},{x:left.x,y:left.y+4}],true);
        g.fillStyle(0x4b5144,.98);g.fillPoints([{x:bottom.x,y:bottom.y},{x:right.x,y:right.y},{x:right.x,y:right.y+6},{x:bottom.x,y:bottom.y+7}],true);
      }
      g.fillStyle((rgb[0]<<16)|(rgb[1]<<8)|rgb[2],1);
      g.fillPoints([top,right,bottom,left],true);
      g.lineStyle(1,kind==="w"||kind==="p"?0xa4d2c8:0xd0c9a3,kind==="w"||kind==="p"?.12:.075);
      g.strokePoints([top,right,bottom,left],true);
      if(kind==="w"||kind==="p"){
        g.lineStyle(1,0xb8e3d7,.36);
        g.beginPath();g.moveTo(pos.x-7,pos.y-2);g.lineTo(pos.x+2,pos.y+1);g.strokePath();
      }else if(kind==="d"){
        g.fillStyle(0xd4b17c,.12);g.fillCircle(pos.x-3,pos.y+1,1.5);
        g.fillCircle(pos.x+5,pos.y-2,1);
      }else if(kind==="g"&&((col*7+row*11)%9===0)){
        g.lineStyle(1,0xa6b77e,.3);g.beginPath();g.moveTo(pos.x-3,pos.y+2);g.lineTo(pos.x-4,pos.y-1);g.moveTo(pos.x,pos.y+2);g.lineTo(pos.x+1,pos.y-2);g.strokePath();
      }
    }
    // A softly layered shoreline rim gives the map a clear playable edge.
    g.lineStyle(2,0x8f9d78,.2);g.beginPath();g.moveTo(...Object.values(locationOf(0,0)));g.lineTo(...Object.values(locationOf(WORLD_COLS-1,0)));g.lineTo(...Object.values(locationOf(WORLD_COLS-1,WORLD_ROWS-1)));g.lineTo(...Object.values(locationOf(0,WORLD_ROWS-1)));g.closePath();g.strokePath();
  }
  getAppearanceState(){
    return {hair:this.hair,outfit:this.outfit,accessory:this.accessory,weapon:this.weapon};
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
    if(this.weapon!=="none"&&this.weaponSprite){
      this.weaponSprite.setVisible(true).play(this.layerAnimationName("weapon",this.weapon,move,dir),true);
    }else this.weaponSprite?.setVisible(false);
  }
  async setAccessory(id){
    if(id!=="none"&&!ACCESSORY_OPTIONS.some(x=>x.id===id))return false;
    await this.ensureLayer("accessory",id);
    this.accessory=id;
    if(id!=="none"&&!this.accessorySprite)this.accessorySprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("accessory",id,"idle",this.lastDirection||"s")).setOrigin(.5,1);
    this.syncAppearanceLayers();
    return true;
  }
  async setWeapon(id){
    if(id!=="none"&&!WEAPON_OPTIONS.some(x=>x.id===id))return false;
    await this.ensureLayer("weapon",id);
    this.weapon=id;
    if(id!=="none"&&!this.weaponSprite)this.weaponSprite=this.add.sprite(this.player.x,this.player.y,this.layerTextureName("weapon",id,"idle",this.lastDirection||"s")).setOrigin(.5,1);
    this.syncAppearanceLayers();
    return true;
  }
  addWorldDecorations(){
    for(let row=0;row<WORLD_ROWS;row++)for(let col=0;col<WORLD_COLS;col++){
      const kind=terrainAt(col,row),seed=(col*31+row*47+col*row*3)%97,pos=groundOf(col,row);
      if(RESERVED_CELLS.has(tileKey(col,row)))continue;
      if(kind==="r"&&seed%3===0)this.add.image(pos.x,pos.y,"world_rock").setOrigin(.5,1).setScale(.9+((seed%5)*.035)).setDepth(pos.y+2);
      else if(kind==="g"&&seed%19===0&&((col<4||col>15)||(row>12))){
        this.decorCells.add(tileKey(col,row));this.add.image(pos.x,pos.y,"world_tree").setOrigin(.5,1).setScale(.78+((seed%5)*.045)).setDepth(pos.y+3);
      }
    }
  }
  addNpcs(){
    const residents=[{tile:{col:9,row:5},dir:"s"},{tile:{col:10,row:8},dir:"sw"},{tile:{col:4,row:8},dir:"e"}];
    residents.forEach((record,i)=>{
      const pos=groundOf(record.tile.col,record.tile.row),appearance=NPC_APPEARANCES[i];
      const shadow=this.add.ellipse(pos.x,pos.y-2,36,10,0x050a08,.3).setDepth(pos.y+2);
      const npc=this.add.sprite(pos.x,pos.y,this.textureName(appearance.hair,appearance.outfit,"idle",record.dir)).setOrigin(.5,1).setDepth(pos.y+6);
      npc.shadow=shadow;npc.play(this.animationName(appearance.hair,appearance.outfit,"idle",record.dir));
      npc.setData("tile",record.tile);npc.setData("residentIndex",i);this.npcs.push(npc);
    });
  }
  worldToTile(x,y){const a=(x-MAP_ORIGIN_X)/(TILE_W/2),b=(y-(MAP_ORIGIN_Y+8))/(TILE_H/2);return {col:Math.round((a+b)/2),row:Math.round((b-a)/2)};}
  drawFacilities(){
    if(!this.options?.session||!this.player)return;
    const facilities=this.options.session.snapshot().facilities||{};
    for(const [id,record] of Object.entries(facilities)){
      if(!record?.operational||!record.map_position)continue;
      const {col,row}=record.map_position;if(!inWorld(col,row))continue;
      const pos=groundOf(col,row),key=spriteForFacility(this.options.session.getFacility(id));
      const existing=this.facilityObjects.get(id);
      if(existing){existing.setPosition(pos.x,pos.y).setDepth(pos.y+2);continue;}
      const item=this.add.image(pos.x,pos.y,key).setOrigin(.5,1).setDepth(pos.y+2);
      item.setData("facilityId",id);item.setData("tile",{col,row});this.facilityObjects.set(id,item);
    }
  }
  applySprite(sprite,dir,move){
    const key=this.animationName(this.hair,this.outfit,move,dir);
    sprite.play(this.anims.exists(key)?key:this.animationName(this.hair,this.outfit,"idle","s"),true);
    if(sprite===this.player)this.syncAppearanceLayers(dir,move);
  }
  refreshFogOfWar(){
    const origin=this.playerTile||{col:6,row:5},visible=new Set(),exploredRadius=4.35,softRadius=5.25;
    for(let row=0;row<WORLD_ROWS;row++)for(let col=0;col<WORLD_COLS;col++){
      const distance=Math.hypot(col-origin.col,row-origin.row),key=tileKey(col,row);
      if(distance<=exploredRadius)visible.add(key);
      if(distance<=exploredRadius&&!this.exploredCells.has(key))this.exploredCells.add(key);
    }
    this.currentlyVisible=visible;
    if(this.options?.session?.setExploredCells)this.options.session.setExploredCells([...this.exploredCells]);
    if(!this.fogGraphics)this.fogGraphics=this.add.graphics().setDepth(100000);
    else this.fogGraphics.clear();
    const g=this.fogGraphics;
    for(let row=0;row<WORLD_ROWS;row++)for(let col=0;col<WORLD_COLS;col++){
      const key=tileKey(col,row),distance=Math.hypot(col-origin.col,row-origin.row);
      if(visible.has(key))continue;
      const pos=locationOf(col,row);
      const remembered=this.exploredCells.has(key);
      let alpha=remembered?.58:.985;
      if(!remembered&&distance<=softRadius)alpha=.78;
      g.fillStyle(remembered?0x26312a:0x030609,alpha);
      g.fillPoints([
        {x:pos.x,y:pos.y-22},
        {x:pos.x+22,y:pos.y},
        {x:pos.x,y:pos.y+22},
        {x:pos.x-22,y:pos.y}
      ],true);
    }
  }
  blockedCells(){
    const blocked=new Set();
    const facilities=this.options?.session?.snapshot?.().facilities||{};
    for(const record of Object.values(facilities))if(record?.map_position)blocked.add(tileKey(record.map_position.col,record.map_position.row));
    for(const npc of this.npcs){const tile=npc.getData("tile");if(tile)blocked.add(tileKey(tile.col,tile.row));}
    return blocked;
  }
  isTileBlocked(col,row,blocked){
    const key=tileKey(col,row);
    return !walkable(col,row)||!this.currentlyVisible.has(key)||(blocked?.has(key)??false)||this.decorCells.has(key);
  }
  findApproachTile(target){
    const blocked=this.blockedCells();
    const candidates=[];
    for(let radius=1;radius<=3;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
      const col=target.col+dx,row=target.row+dy;
      if(!inWorld(col,row)||this.isTileBlocked(col,row,blocked))continue;
      candidates.push({col,row,distance:Math.abs(dx)+Math.abs(dy)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const start=this.playerTile||{col:6,row:5};
    for(const candidate of candidates){
      if(this.findPath(start,candidate).length)return candidate;
    }
    return null;
  }
  findPath(start,target){
    const blocked=this.blockedCells();
    if(!inWorld(start.col,start.row)||!inWorld(target.col,target.row)||this.isTileBlocked(target.col,target.row,blocked))return [];
    const startKey=tileKey(start.col,start.row),goalKey=tileKey(target.col,target.row);
    const open=[{col:start.col,row:start.row,key:startKey}];
    const came=new Map(),cost=new Map([[startKey,0]]),closed=new Set();
    const heuristic=(col,row)=>Math.max(Math.abs(target.col-col),Math.abs(target.row-row))+(Math.SQRT2-1)*Math.min(Math.abs(target.col-col),Math.abs(target.row-row));
    const offsets=[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
    while(open.length){
      open.sort((a,b)=>(cost.get(a.key)+heuristic(a.col,a.row))-(cost.get(b.key)+heuristic(b.col,b.row)));
      const current=open.shift();
      if(current.key===goalKey){
        const path=[{col:current.col,row:current.row}];let key=current.key;
        while(came.has(key)){const previous=came.get(key);path.unshift({col:previous.col,row:previous.row});key=tileKey(previous.col,previous.row);}
        return path;
      }
      if(closed.has(current.key))continue;closed.add(current.key);
      for(const [dx,dy] of offsets){
        const col=current.col+dx,row=current.row+dy,key=tileKey(col,row);
        if(!inWorld(col,row)||closed.has(key)||this.isTileBlocked(col,row,blocked))continue;
        if(dx!==0&&dy!==0&&(this.isTileBlocked(current.col+dx,current.row,blocked)||this.isTileBlocked(current.col,current.row+dy,blocked)))continue;
        const next=cost.get(current.key)+(dx!==0&&dy!==0?Math.SQRT2:1);
        if(next>=(cost.get(key)??Infinity))continue;
        cost.set(key,next);came.set(key,{col:current.col,row:current.row});
        open.push({col,row,key});
      }
    }
    return [];
  }
  moveToTap(x,y){
    if(!this.player||this.moving||this.placement)return;
    const tile=this.worldToTile(x,y);
    const blocked=this.blockedCells();
    if(!inWorld(tile.col,tile.row)||this.isTileBlocked(tile.col,tile.row,blocked)){this.options.onInvalidMove?.();return;}
    this.walkToTile(tile,null,{x,y});
  }
  showTapTrail(target,tapPoint){
    if(!this.player)return;
    const fx=this.add.graphics();fx.setDepth(5000);
    fx.lineStyle(1,0xe7d8ae,.24);fx.beginPath();fx.moveTo(this.player.x,this.player.y-12);fx.lineTo(target.x,target.y);fx.strokePath();
    fx.fillStyle(0xe7d8ae,.14);fx.fillCircle(tapPoint.x,tapPoint.y,8);
    fx.lineStyle(1,0xf0ddb0,.32);fx.strokeCircle(tapPoint.x,tapPoint.y,7);
    this.tweens.add({targets:fx,alpha:{from:.9,to:0},scaleX:1.08,scaleY:1.08,duration:920,ease:"Sine.Out",onComplete:()=>fx.destroy()});
  }
  walkToTile(target,onArrive,tapPoint=null){
    if(!this.player||this.moving)return;
    const start=this.playerTile||this.worldToTile(this.player.x,this.player.y-8),path=this.findPath(start,target);
    if(!path.length){this.options.onInvalidMove?.();return;}
    this.moving=true;this.tweens.killTweensOf(this.player);
    this.cameras.main.startFollow(this.player,true,.075,.075);
    const targetPos=groundOf(target.col,target.row);
    if(tapPoint)this.showTapTrail(targetPos,tapPoint);
    let index=1;
    const step=()=>{
      if(index>=path.length){
        this.playerTile={col:target.col,row:target.row};this.refreshFogOfWar();this.moving=false;
        this.applySprite(this.player,this.lastDirection||"s","idle");onArrive?.();return;
      }
      const tile=path[index++],pos=groundOf(tile.col,tile.row),dx=pos.x-this.player.x,dy=pos.y-this.player.y;
      this.playerTile={col:tile.col,row:tile.row};this.refreshFogOfWar();
      this.lastDirection=directionOf(dx,dy);this.applySprite(this.player,this.lastDirection,"walk");
      const duration=Math.max(170,Math.min(390,Math.hypot(dx,dy)*10.5));
      this.tweens.add({targets:this.player,x:pos.x,y:pos.y,duration,ease:"Sine.InOut",onComplete:step});
    };
    step();
  }
  zoomBy(factor){
    const cam=this.cameras.main;cam.setZoom(Phaser.Math.Clamp(cam.zoom*factor,.72,1.6));
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
  const applyShopDraft=async appearance=>{
    const bodyReady=await scene.setAppearance(appearance.hair,appearance.outfit);
    const accessoryReady=await scene.setAccessory(appearance.accessory||"none");
    const weaponReady=await scene.setWeapon(appearance.weapon||"none");
    if(!bodyReady||!accessoryReady||!weaponReady)throw new Error("One or more appearance layers could not be applied.");
    return true;
  };
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

  const refreshShopPreview=()=>{
    shopDraft=wardrobeShop?.getDraft()??shopDraft;
    shopConfirmPending=wardrobeShop?.isConfirmPending()??shopConfirmPending;
    if(!shopDraft)return;
    const {hair,outfit,accessory,weapon}=shopDraft;
    const body=worldPanel.querySelector("[data-shop-body]");
    const accessoryLayer=worldPanel.querySelector("[data-shop-accessory]");
    const weaponBack=worldPanel.querySelector("[data-shop-weapon-back]");
    const weaponFront=worldPanel.querySelector("[data-shop-weapon-front]");
    if(body)body.style.backgroundImage="url('/game-assets/pxl/anims/human_"+hair+"_"+outfit+"_idle_s.png')";
    if(accessoryLayer)accessoryLayer.style.backgroundImage=accessory==="none"?"none":"url('/game-assets/pxl/anims/accessory_"+accessory+"_idle_s.png')";
    const weaponItem=WEAPON_OPTIONS.find(x=>x.id===weapon);
    if(weaponBack)weaponBack.style.backgroundImage=weapon!=="none"&&weaponItem?.layer==="back"?"url('/game-assets/pxl/anims/weapon_"+weapon+"_idle_s.png')":"none";
    if(weaponFront)weaponFront.style.backgroundImage=weapon!=="none"&&weaponItem?.layer!=="back"?"url('/game-assets/pxl/anims/weapon_"+weapon+"_idle_s.png')":"none";
    const title=worldPanel.querySelector("[data-shop-character-title]");
    if(title)title.textContent=OUTFIT_OPTIONS.find(x=>x.id===outfit)?.name||"Custom character";
    const labels=[
      ["hair",HAIR_OPTIONS.find(x=>x.id===hair)?.name],
      ["outfit",OUTFIT_OPTIONS.find(x=>x.id===outfit)?.name],
      ["accessory",ACCESSORY_OPTIONS.find(x=>x.id===accessory)?.name||"None"],
      ["weapon",WEAPON_OPTIONS.find(x=>x.id===weapon)?.name||"Unarmed"]
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
      {slot:"accessory",title:"ACCESSORIES",items:ACCESSORY_OPTIONS,current:shopDraft.accessory},
      {slot:"weapon",title:"WEAPONS & GEAR",items:WEAPON_OPTIONS,current:shopDraft.weapon}
    ];
    catalog.innerHTML=sections.map(group=>{
      const cards=group.items.map(item=>{
        const selected=group.current===item.id;
        const image="/game-assets/pxl/sprites/human_preview_"+group.slot+"_"+item.id+".png";
        return "<button type='button' class='world-shop-item "+(selected?"is-selected":"")+"' data-world-"+group.slot+"='"+item.id+"' aria-pressed='"+selected+"'>"+
          "<span class='world-shop-item-art'><img src='"+image+"' alt='' loading='lazy'></span>"+
          "<span class='world-shop-item-copy'><b>"+esc(item.name)+"</b><small>"+esc(item.description)+"</small></span>"+
          "<span class='world-shop-item-price'><small>PRICE</small><b>—</b></span>"+
          "<em>"+(selected?"PREVIEWING":"PREVIEW")+"</em></button>";
      }).join("");
      const none=group.slot==="accessory"||group.slot==="weapon"
        ?"<button type='button' class='world-shop-item world-shop-none "+(group.current==="none"?"is-selected":"")+"' data-world-"+group.slot+"='none' aria-pressed='"+(group.current==="none")+"'>"+
          "<span class='world-shop-item-art world-shop-empty-art'>—</span>"+
          "<span class='world-shop-item-copy'><b>"+(group.slot==="weapon"?"Unarmed":"No accessory")+"</b><small>Leave this slot empty.</small></span>"+
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
            "<div class='world-shop-avatar-layer world-shop-avatar-weapon world-shop-avatar-back' data-shop-weapon-back></div>"+
            "<div class='world-shop-avatar-layer world-shop-avatar-body' data-shop-body></div>"+
            "<div class='world-shop-avatar-layer world-shop-avatar-weapon world-shop-avatar-front' data-shop-weapon-front></div>"+
            "<div class='world-shop-avatar-layer world-shop-avatar-accessory' data-shop-accessory></div>"+
            "<span class='world-shop-preview-label'>LIVE PREVIEW</span>"+
          "</div>"+
          "<div class='world-shop-preview-details'><small>YOUR CHARACTER</small><strong data-shop-character-title></strong>"+
            "<div class='world-shop-current-grid'>"+
              "<span>HAIR <b data-shop-current='hair'></b></span>"+
              "<span>OUTFIT <b data-shop-current='outfit'></b></span>"+
              "<span>ACCESSORY <b data-shop-current='accessory'></b></span>"+
              "<span>WEAPON <b data-shop-current='weapon'></b></span>"+
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
    if(!inWorld(col,row)||!scene.currentlyVisible.has(tileKey(col,row))||!siteCanUse(facility,col,row)){setFeedback("That tile does not meet this facility's land/location Requirements or is not yet discovered.");return;}
    const key=tileKey(col,row),occupied=scene.blockedCells().has(key)||scene.decorCells.has(key)||(scene.playerTile.col===col&&scene.playerTile.row===row);
    if(occupied){setFeedback("That plot is already occupied. Choose another open tile.");return;}
    const site=facility.location_requirements?.[0]||"Owned home plot",result=session.placeFacility(facility.facility_id,site,{col,row});
    if(!result.ok){setFeedback(result.message);renderFacilityDetail(facility.facility_id);return;}
    scene.stopPlacement();snapshot=session.snapshot();scene.drawFacilities();renderBuild();
    setFeedback("Construction started. The location is saved and the building appears when its timer completes.");
  };
  scene.options={
    viewport,session,
    onReady:s=>{s.setAppearance(session.getHair(),session.getOutfit());s.setAccessory(session.getAccessory());s.setWeapon(session.getWeapon());},
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
    const btn=event.target.closest("[data-shop-buy],[data-shop-exit],[data-shop-confirm-buy],[data-shop-cancel-buy],[data-world-action],[data-world-appearance],[data-world-build],[data-world-location],[data-world-facility],[data-world-start-placement],[data-world-open-build],[data-world-rest],[data-world-forage],[data-world-water],[data-world-gather],[data-world-hair],[data-world-outfit],[data-world-accessory],[data-world-weapon]");
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
    const isShopItem=btn.dataset.worldHair!==undefined||btn.dataset.worldOutfit!==undefined||btn.dataset.worldAccessory!==undefined||btn.dataset.worldWeapon!==undefined;
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
      const id=btn.dataset.worldLocation,record=snapshot.facilities[id],target=record?.map_position||{col:6,row:5};
      const approach=scene.findApproachTile(target);if(approach)scene.walkToTile(approach,()=>renderLocation(id));
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
    }else if(btn.dataset.worldWeapon!==undefined){
      try{
        const next={...shopDraft,weapon:btn.dataset.worldWeapon};
        const result=await wardrobeShop.select(next);shopDraft=wardrobeShop.getDraft();
        if(!result.ok){setFeedback("Weapon or gear preview could not be loaded: "+esc(result.error?.message||"Unknown error."));return;}
        renderShopCatalog();refreshShopPreview();
        setFeedback("Weapon or gear previewed. Confirm BUY to save it.");
      }catch(error){setFeedback("Weapon or gear preview could not be loaded: "+esc(error.message));}
    }
  };
  const inputChange=event=>{
    const input=event.target.closest("[data-world-builders]");if(!input)return;
    session.setBuilders(input.dataset.worldBuilders,input.value);renderFacilityDetail(input.dataset.worldBuilders);
  };
  const dismissUnconfirmedShop=event=>{
    if(!wardrobeShop?.isOpen())return;
    if(event?.type==="click"&&drawer.contains(event.target))return;
    void exitAppearanceShop({restore:true}).then(closed=>{if(closed)setFeedback("Shop closed without purchase. Your original appearance has been restored.");});
  };
  const onShopEscape=event=>{
    if(event.key!=="Escape"||!wardrobeShop?.isOpen())return;
    event.preventDefault();event.stopPropagation();
    void exitAppearanceShop({restore:true}).then(closed=>{if(closed)setFeedback("Shop closed without purchase. Your original appearance has been restored.");});
  };
  root.addEventListener("click",updateClick);root.addEventListener("change",inputChange);
  document.addEventListener("click",dismissUnconfirmedShop,true);document.addEventListener("keydown",onShopEscape,true);
  root.querySelector("[data-world-close]")?.addEventListener("click",async()=>{
    if(wardrobeShop?.isOpen()){
      const closed=await exitAppearanceShop({restore:true,collapse:true});
      if(closed)setFeedback("Shop closed. Your original appearance has been restored.");return;
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
    disposed=true;if(tick!==null)window.clearInterval(tick);wardrobeShop?.abandon();
    root.removeEventListener("click",updateClick);root.removeEventListener("change",inputChange);
    document.removeEventListener("click",dismissUnconfirmedShop,true);document.removeEventListener("keydown",onShopEscape,true);
    if(game)game.destroy(true);
  };
}
