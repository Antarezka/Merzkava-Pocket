import Phaser from "phaser";
import "./home-base.css";
import { openHomeBaseSession } from "./economy.js";

const STYLE_OPTIONS=[
  {id:"chibi",name:"Chibi",description:"A round, expressive silhouette in a short layered cultivation robe."},
  {id:"classic",name:"Classic",description:"Balanced proportions, crossed collar, sash and long everyday robe."},
  {id:"slim",name:"Scholar",description:"Tall flowing scholar silhouette with long sleeves and hanging ribbons."},
  {id:"ornate",name:"Ceremonial",description:"Broad layered mantle, ornamental hairpiece and formal robe details."},
  {id:"painterly",name:"Wanderer",description:"Asymmetric travelling mantle with textured fabric and rugged layers."}
];
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
  if(seed<7)return "r";
  if(seed<15)return "s";
  if(seed<23)return "d";
  return "g";
}).join(""));
const RESERVED_CELLS=new Set(["5,4","6,6","7,4","6,5","9,5","10,7","4,8"]);
const STARTER_SPRITES={"pocket.starter.hut":"hd-facility-hut","pocket.starter.foraging":"hd-facility-foraging","pocket.starter.well":"hd-facility-well"};
const FAMILY_SPRITES=[
  [/farm|horticulture|garden|agriculture/i,"hd-facility-farm"],
  [/water|sanitation|aquaculture|fish/i,"hd-facility-well"],
  [/storage|logistics/i,"hd-facility-storage"],
  [/trade|commerce|market/i,"hd-facility-market"],
  [/workshop|processing|textile|ceramic|medicine|herb/i,"hd-facility-workshop"]
];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const locationOf=(col,row)=>({x:MAP_ORIGIN_X+(col-row)*TILE_W/2,y:MAP_ORIGIN_Y+(col+row)*TILE_H/2+8});
const groundOf=(col,row)=>{const p=locationOf(col,row);return {x:p.x,y:p.y+8};};
const directionOf=(dx,dy)=>DIRS[Math.round((((Math.atan2(dx,-dy)+Math.PI*2)%(Math.PI*2))/(Math.PI/4)))%8];
const inWorld=(col,row)=>col>=0&&row>=0&&col<WORLD_COLS&&row<WORLD_ROWS;
const terrainAt=(col,row)=>inWorld(col,row)?TERRAIN[row][col]:"";
const walkable=(col,row)=>["g","s","d"].includes(terrainAt(col,row));
const tileKey=(col,row)=>col+","+row;
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
  constructor(){super("HomeBase");this.style="classic";this.placement=null;this.facilityObjects=new Map();this.npcs=[];this.moving=false;this.playerTile={col:6,row:5};}
  preload(){
    const objects=["tree","rock","facility_hut","facility_foraging","facility_well","facility_farm","facility_workshop","facility_storage","facility_market"];
    objects.forEach(id=>this.load.image("hd-"+id.replace("facility_","facility-"),"/game-assets/hd/objects/"+id+".svg"));
    STYLE_OPTIONS.forEach(style=>{
      this.load.image("preview-"+style.id,"/game-assets/hd/previews/style-preview-"+style.id+".svg");
      DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
        const key=style.id+"_"+move+"_"+dir;
        this.load.spritesheet(key,"/game-assets/hd/characters/"+key+".svg",{frameWidth:128,frameHeight:160});
      }));
    });
  }
  create(){
    this.cameras.main.setBackgroundColor("#18261e");
    STYLE_OPTIONS.forEach(style=>DIRS.forEach(dir=>["idle","walk"].forEach(move=>{
      const texture=style.id+"_"+move+"_"+dir;
      const key=style.id+":"+move+":"+dir;
      if(!this.anims.exists(key))this.anims.create({key,frames:this.anims.generateFrameNumbers(texture,{start:0,end:11}),frameRate:move==="walk"?12:10,repeat:-1});
    })));
    this.drawWorld();
    this.addWorldDecorations();
    this.playerTile={col:6,row:5};
    const spawn=groundOf(this.playerTile.col,this.playerTile.row);
    this.playerShadow=this.add.ellipse(spawn.x,spawn.y-2,40,11,0x050a08,.34).setDepth(spawn.y+2);
    this.player=this.add.sprite(spawn.x,spawn.y,"classic_idle_s").setOrigin(.5,1).setScale(.72).setDepth(spawn.y+8);
    this.player.play("classic:idle:s");
    this.addNpcs();this.drawFacilities();
    const cam=this.cameras.main,el=this.options.viewport;
    cam.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    const fit=Math.min(el.clientWidth/320,el.clientHeight/360);
    cam.setZoom(Math.max(.78,Math.min(1.32,fit)));
    cam.centerOn(this.player.x,this.player.y-18);
    this.lastDirection="s";
    this.events.on("update",()=>{
      if(this.player){this.player.setDepth(this.player.y+8);this.playerShadow?.setPosition(this.player.x,this.player.y-2).setDepth(this.player.y+2);}
      this.npcs.forEach(npc=>{npc.setDepth(npc.y+8);npc.shadow?.setPosition(npc.x,npc.y-2).setDepth(npc.y+2);});
    });
    this.dragState=null;this.pointerConsumed=false;
    this.input.on("pointerdown",pointer=>{
      this.pointerConsumed=false;this.skipObjectTapId=null;
      this.dragState={id:pointer.id,x:pointer.x,y:pointer.y,lastX:pointer.x,lastY:pointer.y,moved:false};
    });
    this.input.on("pointermove",pointer=>{
      if(!this.dragState||pointer.id!==this.dragState.id)return;
      const dx=pointer.x-this.dragState.lastX,dy=pointer.y-this.dragState.lastY;
      if(!this.dragState.moved&&Math.hypot(pointer.x-this.dragState.x,pointer.y-this.dragState.y)>7){
        this.dragState.moved=true;
        this.cameras.main.stopFollow();
      }
      if(this.dragState.moved){
        cam.scrollX-=dx/cam.zoom;cam.scrollY-=dy/cam.zoom;
      }
      this.dragState.lastX=pointer.x;this.dragState.lastY=pointer.y;
      if(this.placement&&!this.dragState.moved){
        const world=cam.getWorldPoint(pointer.x,pointer.y),tile=this.worldToTile(world.x,world.y),pos=locationOf(tile.col,tile.row);
        this.placementGhost?.destroy();
        if(inWorld(tile.col,tile.row))this.placementGhost=this.add.image(pos.x,pos.y+8,"hd-facility-storage").setOrigin(.5,1).setAlpha(.38).setTint(0xb4d7a0).setDepth(pos.y+40);
      }
    });
    this.input.on("pointerup",pointer=>{
      const drag=this.dragState;this.dragState=null;
      if(drag?.moved)this.skipObjectTapId=pointer.id;
      if(!drag||pointer.id!==drag.id||drag.moved||this.pointerConsumed)return;
      const world=cam.getWorldPoint(pointer.x,pointer.y),tile=this.worldToTile(world.x,world.y);
      if(this.placement){this.options.onPlacementTap?.(tile,this.placement);return;}
      this.moveToTap(world.x,world.y);
    });
    this.input.on("wheel",(pointer,gameObjects,deltaX,deltaY)=>{
      const next=Phaser.Math.Clamp(cam.zoom*(deltaY>0?.9:1.1),.72,1.6);
      cam.setZoom(next);
    });
    this.events.once("shutdown",()=>this.placementGhost?.destroy());
    this.options.onReady?.(this);
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
  addWorldDecorations(){
    for(let row=0;row<WORLD_ROWS;row++)for(let col=0;col<WORLD_COLS;col++){
      const kind=terrainAt(col,row),seed=(col*31+row*47+col*row*3)%97,pos=groundOf(col,row);
      if(RESERVED_CELLS.has(tileKey(col,row)))continue;
      if(kind==="r"&&seed%3===0){
        this.add.image(pos.x,pos.y,"hd-rock").setOrigin(.5,1).setScale(.72+((seed%5)*.035)).setDepth(pos.y+2);
      }else if(kind==="g"&&seed%19===0&&((col<4||col>15)||(row>12))){
        this.add.image(pos.x,pos.y,"hd-tree").setOrigin(.5,1).setScale(.68+((seed%5)*.045)).setDepth(pos.y+3);
      }
    }
  }
  addNpcs(){
    const residents=[
      {tile:{col:9,row:5},style:"slim",dir:"s"},
      {tile:{col:10,row:8},style:"ornate",dir:"sw"},
      {tile:{col:4,row:8},style:"painterly",dir:"e"}
    ];
    residents.forEach((record,i)=>{
      const pos=groundOf(record.tile.col,record.tile.row),texture=record.style+"_idle_"+record.dir;
      const shadow=this.add.ellipse(pos.x,pos.y-2,36,10,0x050a08,.3).setDepth(pos.y+2);
      const npc=this.add.sprite(pos.x,pos.y,texture).setOrigin(.5,1).setScale(.68).setDepth(pos.y+8).setInteractive({useHandCursor:true});
      npc.shadow=shadow;
      npc.play(record.style+":idle:"+record.dir);npc.setData("tile",record.tile);npc.setData("residentIndex",i);
      npc.on("pointerdown",()=>{this.pointerConsumed=true;});
      npc.on("pointerup",(pointer,localX,localY,event)=>{
        if(this.dragState?.moved||this.skipObjectTapId===pointer.id){this.skipObjectTapId=null;return;}event?.stopPropagation?.();this.pointerConsumed=true;
        const approach=this.findApproachTile(record.tile);
        if(approach)this.walkToTile(approach,()=>this.options.onNpcTap?.(i));
      });
      this.npcs.push(npc);
    });
  }
  worldToTile(x,y){
    const a=(x-MAP_ORIGIN_X)/(TILE_W/2),b=(y-(MAP_ORIGIN_Y+8))/(TILE_H/2);
    return {col:Math.round((a+b)/2),row:Math.round((b-a)/2)};
  }
  drawFacilities(){
    if(!this.options?.session||!this.player)return;
    const facilities=this.options.session.snapshot().facilities||{};
    for(const [id,record] of Object.entries(facilities)){
      if(!record?.operational||!record.map_position)continue;
      const {col,row}=record.map_position;if(!inWorld(col,row))continue;
      const pos=groundOf(col,row),key=spriteForFacility(this.options.session.getFacility(id));
      const existing=this.facilityObjects.get(id);
      if(existing){existing.setPosition(pos.x,pos.y).setDepth(pos.y+2);continue;}
      const item=this.add.image(pos.x,pos.y,key).setOrigin(.5,1).setDepth(pos.y+2).setInteractive({useHandCursor:true});
      item.setData("facilityId",id);item.setData("tile",{col,row});
      item.on("pointerdown",()=>{this.pointerConsumed=true;});
      item.on("pointerup",(pointer,localX,localY,event)=>{
        if(this.dragState?.moved||this.skipObjectTapId===pointer.id){this.skipObjectTapId=null;return;}event?.stopPropagation?.();this.pointerConsumed=true;
        const approach=this.findApproachTile({col,row});
        if(approach)this.walkToTile(approach,()=>this.options.onFacilityTap?.(id));
      });
      this.facilityObjects.set(id,item);
    }
  }
  setStyle(style){
    if(!STYLE_OPTIONS.some(x=>x.id===style))return;
    this.style=style;
    if(this.player)this.applySprite(this.player,this.lastDirection||"s",this.moving?"walk":"idle");
  }
  applySprite(sprite,dir,move,style=this.style){
    const key=style+":"+move+":"+dir;
    sprite.play(this.anims.exists(key)?key:style+":idle:s",true);
  }
  blockedCells(){
    const blocked=new Set();
    const facilities=this.options?.session?.snapshot?.().facilities||{};
    for(const record of Object.values(facilities))if(record?.map_position)blocked.add(tileKey(record.map_position.col,record.map_position.row));
    for(const npc of this.npcs){const tile=npc.getData("tile");if(tile)blocked.add(tileKey(tile.col,tile.row));}
    return blocked;
  }
  isTileBlocked(col,row,blocked){
    return !walkable(col,row)||(blocked?.has(tileKey(col,row))??false);
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
    const targetPos=groundOf(target.col,target.row);
    if(tapPoint)this.showTapTrail(targetPos,tapPoint);
    let index=1;
    const step=()=>{
      if(index>=path.length){
        this.playerTile={col:target.col,row:target.row};this.moving=false;
        this.applySprite(this.player,this.lastDirection||"s","idle");onArrive?.();return;
      }
      const tile=path[index++],pos=groundOf(tile.col,tile.row),dx=pos.x-this.player.x,dy=pos.y-this.player.y;
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
  root.innerHTML="<div class='world-empty'>Opening the World Archive...</div>";
  const setFeedback=value=>{feedback=value;const node=root.querySelector("[data-world-feedback]");if(node)node.textContent=value;};
  try{session=await openHomeBaseSession(identity);}
  catch(error){if(isActive())root.innerHTML="<div class='world-empty'>Home Base could not open: "+esc(error.message)+"</div>";return ()=>{};}
  if(disposed||!isActive())return ()=>{};
  snapshot=session.snapshot();
  root.innerHTML=
    "<section class='home-base-page' data-world-shell>"+
      "<header class='world-topbar'><div class='world-title-wrap'><strong>HOME BASE</strong><small>WORLD ARCHIVE · PERSONAL LAND</small></div>"+
      "<div class='world-top-actions'><button type='button' data-world-zoom-out aria-label='Zoom out'>−</button><button type='button' data-world-zoom-in aria-label='Zoom in'>＋</button><button type='button' data-world-appearance>CHARACTER</button></div></header>"+
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
    worldPanel.innerHTML="<p class='world-drawer-copy'>Choose the Player silhouette. Residents keep their own authored outfits and proportions.</p>"+
      "<div class='world-style-grid'>"+STYLE_OPTIONS.map(s=>"<button class='world-style-card "+(current===s.id?"is-selected":"")+"' data-world-style='"+s.id+"'><img src='/game-assets/hd/previews/style-preview-"+s.id+".svg' alt=''><span><b>"+s.name+"</b><small>"+s.description+"</small></span></button>").join("")+"</div>";
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
    if(!inWorld(col,row)||!siteCanUse(facility,col,row)){setFeedback("That tile does not meet this facility's land/location Requirements.");return;}
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
    backgroundColor:"#18261e",pixelArt:false,roundPixels:false,antialias:true,powerPreference:"low-power",
    audio:{noAudio:true},fps:{target:30,min:20,forceSetTimeOut:true},
    scale:{mode:Phaser.Scale.RESIZE,width:viewport.clientWidth,height:viewport.clientHeight},
    render:{pixelArt:false,antialias:true,roundPixels:false,clearBeforeRender:true,premultipliedAlpha:false},
    scene:[scene]
  });
  const updateClick=async event=>{
    const btn=event.target.closest("[data-world-action],[data-world-appearance],[data-world-zoom-in],[data-world-zoom-out],[data-world-build],[data-world-location],[data-world-facility],[data-world-start-placement],[data-world-open-build],[data-world-rest],[data-world-forage],[data-world-water],[data-world-gather],[data-world-style]");
    if(!btn)return;
    if(btn.dataset.worldZoomIn){scene.zoomBy(1.15);return;}
    else if(btn.dataset.worldZoomOut){scene.zoomBy(.87);return;}
    drawer.classList.remove("is-collapsed");
    if(btn.dataset.worldAction==="places"){scene.stopPlacement();renderPlaces();}
    else if(btn.dataset.worldAction==="build"||btn.hasAttribute("data-world-build"))renderBuild();
    else if(btn.dataset.worldAction==="appearance"||btn.hasAttribute("data-world-appearance"))renderAppearance();
    else if(btn.dataset.worldLocation){
      const id=btn.dataset.worldLocation,record=snapshot.facilities[id];
      const target=scene.findApproachTile(record?.map_position||{col:6,row:5});if(target)scene.walkToTile(target,()=>renderLocation(id));
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
      setFeedback("Appearance saved for the Player. Residents retain their own silhouettes.");
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
