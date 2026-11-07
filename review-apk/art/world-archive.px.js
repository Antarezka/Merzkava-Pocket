// Merzkava Pocket — PXL source for all world, map and character raster assets.
include("./.pxl-lib/characters/crew.px.js", { as: "crew" })

const DIRS=["n","ne","e","se","s","sw","w","nw"];
const previewCharacter=(id,source)=>sprite("character_preview_"+id,{w:26,h:40,pivot:[13,38]},c=>c.stamp(source+"_idle_s",0,0,{frame:0}));
previewCharacter("tr","crew.tr");
previewCharacter("sai","crew.sai");
previewCharacter("dkb","crew.dkb");
previewCharacter("cmp","crew.cmp");
previewCharacter("off","crew.off");
previewCharacter("crn","crew.crn");

pal({K:"#18221f",g:"#5b7956",G:"#7d9869",L:"#a9b58a",d:"#806f50",D:"#a18c65",w:"#2d7180",W:"#3b93a0",B:"#74bec0",F:"#b3d9c9",s:"#b8a47a",S:"#d6c397",r:"#6a5847",R:"#947757",h:"#31453d",H:"#49664f",y:"#dbc88e",Y:"#f0dfaa"});

const tileDiamond=(c,base,edge,light)=>{
  for(let y=0;y<16;y++){
    const half=Math.min(y,16-y)*2;
    const width=Math.min(32,half*2+1),x0=Math.floor((32-width)/2);
    for(let x=0;x<width;x++){
      const k=x===0||x===width-1?edge:(y===1&&x<width/2?light:base);
      c.px(x0+x,y,k);
    }
  }
};
const tileGrass=(name,variant)=>sprite(name,{w:32,h:16,pivot:"center"},c=>{
  tileDiamond(c,"g","h","G");
  if(variant===0){
    for(const [x,y] of [[8,5],[9,4],[10,5],[22,10],[23,9],[24,10]]){c.px(x,y,"H");c.px(x+1,y-1,"G");}
    c.px(15,7,"L");c.px(16,8,"G");
  }else if(variant===1){
    for(const [x,y] of [[6,9],[7,8],[8,9],[19,4],[20,3],[21,4],[24,11]]){c.px(x,y,"G");c.px(x+1,y-1,"L");}
    c.px(13,5,"y");c.px(14,5,"Y");
  }else{
    for(const [x,y] of [[9,7],[10,6],[11,7],[20,9],[21,8],[22,9]]){c.px(x,y,"h");c.px(x+1,y-1,"H");}
    c.px(17,4,"G");c.px(18,5,"L");
  }
});
tileGrass("tile_grass_0",0);
tileGrass("tile_grass_1",1);
tileGrass("tile_grass_2",2);
sprite("tile_path",{w:32,h:16,pivot:"center"},c=>{
  tileDiamond(c,"d","r","D");
  for(const [x,y,k] of [[7,5,"R"],[8,5,"D"],[12,9,"r"],[13,8,"D"],[21,5,"R"],[23,10,"R"],[18,12,"D"],[10,11,"r"]])c.px(x,y,k);
  c.hline(14,4,3,"s");
});
sprite("tile_stone",{w:32,h:16,pivot:"center"},c=>{
  tileDiamond(c,"s","r","S");
  c.hline(8,7,5,"D");c.hline(20,10,4,"r");c.px(10,8,"R");c.px(22,9,"S");
});
sprite("tile_water",{w:32,h:16,pivot:"center"},c=>{
  tileDiamond(c,"w","h","W");
  c.hline(7,5,7,"W");c.hline(8,6,4,"B");
  c.hline(19,10,6,"B");c.hline(21,11,3,"F");
  c.px(14,4,"F");c.px(24,7,"W");
});
sprite("tile_water_deep",{base:"tile_water",swap:{w:"#245e70",W:"#2f8290",B:"#55a6aa",F:"#9bdbcd"}});
sprite("tile_rock_ground",{w:32,h:16,pivot:"center"},c=>{
  tileDiamond(c,"r","K","D");
  c.ellipse(9,7,4,2,"R");c.px(7,6,"S");c.px(11,6,"D");
  c.ellipse(22,9,5,3,"d");c.px(20,7,"S");c.hline(23,8,2,"D");
});
const drawFill=(c,x,y,w,h,k)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)c.px(xx,yy,k);};
const isoDiamond=(c,cx,cy,top,edge,shade,seed=0)=>{
  for(let y=0;y<16;y++){const half=y<8?2*(y+1):2*(16-y);c.hline(cx-half,cy+y,half*2,top);if(y>9){c.px(cx-half+2,cy+y,edge);c.px(cx+half-2,cy+y,shade);}}
  c.hline(cx-6,cy+7,12,edge);if(seed%3===0){c.px(cx-6,cy+5,"L");c.px(cx+4,cy+10,shade);}
};
const TERRAIN=["ggggggggggww","gggggggggwww","ggppggggwwww","gppppgggwwwg","gpppggggwwgg","ggppddggwggg","gggggdgwwggg","ggggddwwgggg","ggggggwggggg","gggggggggggg"];
const tilePos=(col,row)=>[200+(col-row)*16,20+(col+row)*8];
const isWater=(col,row)=>["w","p"].includes(TERRAIN[row]?.[col]||"");
const diamondFill=(c,cx,top,color)=>{
  for(let y=0;y<16;y++){
    const half=y<8?2*(y+1):2*(16-y);
    c.hline(cx-half,top+y,half*2,color);
  }
};
scene("home_base_map",{w:400,h:260,bg:"#19251f"},c=>{
  // A spacious continuous meadow with a clean isometric shoreline.
  for(let y=20;y<=196;y++){
    const half=Math.round(2*Math.min(y-20,196-y));
    if(half<=0)continue;
    const left=200-half;
    c.hline(left,y,half*2,"g");
    c.hline(left,y,Math.min(4,half),"h");
    c.hline(200+half-4,y,Math.min(4,half),"h");
  }
  // Low-contrast vegetation: small clusters, never a visible repeating grid.
  for(let i=0;i<96;i++){
    const x=36+(i*47)%328,y=28+(i*31)%160;
    const half=2*Math.min(y-20,196-y);
    if(half<26||x<200-half+10||x>200+half-10)continue;
    if(i%5===0){c.ellipse(x,y,4,2,"G");c.px(x+2,y-2,"L");}
    else if(i%5===1){c.px(x,y,"H");c.px(x+1,y-1,"G");c.px(x+2,y,"g");}
    else if(i%5===2){c.px(x,y,"L");c.px(x+1,y-1,"G");}
    else if(i%5===3){c.ellipse(x,y,3,1,"h");c.px(x,y-1,"G");}
  }
  // Dirt/stone patches and the footpath are filled diamonds rather than rounded stamps.
  for(let row=0;row<TERRAIN.length;row++)for(let col=0;col<TERRAIN[row].length;col++){
    const kind=TERRAIN[row][col],[x,y]=tilePos(col,row);
    if(kind==="d"){
      diamondFill(c,x,y,"d");
      if((col+row)%2===0)c.hline(x-5,y+8,10,"D");
    }else if(kind==="s"){
      diamondFill(c,x,y,"s");
      c.hline(x-5,y+7,10,"S");
    }
  }
  // Connected pond and winding stream: adjacent 2:1 diamonds meet without circular outlines.
  for(let row=0;row<TERRAIN.length;row++)for(let col=0;col<TERRAIN[row].length;col++){
    if(!isWater(col,row))continue;
    const [x,y]=tilePos(col,row),kind=TERRAIN[row][col];
    diamondFill(c,x,y,kind==="p"?"W":"w");
    if((col+row)%3===0)c.hline(x-7,y+7,8,"B");
    if((col*2+row)%4===0)c.hline(x+1,y+10,6,"F");
    if((col+row)%4===0)c.px(x+5,y+5,"B");
  }
  // A quiet stepping-stone trail from the shelter area toward the garden.
  for(const [col,row] of [[4,7],[5,7],[5,6],[5,5],[4,5]]){
    const [x,y]=tilePos(col,row);
    c.ellipse(x,y+8,5,2,"D");
    c.hline(x-3,y+7,6,"S");
  }
  // Reeds and small shore rocks make water edges feel inhabited.
  for(const [col,row,side] of [[2,3,-1],[4,4,1],[8,2,1],[9,3,-1],[8,6,-1],[7,7,1],[2,5,-1]]){
    const [x,y]=tilePos(col,row),rx=x+side*13;
    c.vline(rx,y-5,7,"H");c.vline(rx+2,y-3,5,"L");c.px(rx-2,y+2,"G");
  }
  for(const [x,y] of [[115,139],[141,146],[325,98],[350,132],[315,164],[88,95],[275,179]]){
    c.ellipse(x,y,3,2,"D");c.px(x-1,y-1,"S");
  }
});
anim("water_glimmer",{w:32,h:16,frames:4,fps:5},c=>{
  c.hline(8,7+(c.frame%2),8,"F");c.hline(20,10-((c.frame+1)%2),5,"B");
  c.px(12+(c.frame*3)%7,5,"F");c.px(25-(c.frame*2)%5,12,"B");
});
sprite("facility_starter_hut",{w:50,h:44,pivot:[25,42]},c=>{
  c.ellipse(25,41,18,2,"K");drawFill(c,11,21,28,17,"K");drawFill(c,13,22,24,14,"r");drawFill(c,14,23,22,12,"R");
  for(let y=3;y<22;y++)for(let x=0;x<50;x++){const half=Math.floor((y-3)*1.15);if(x>=25-half&&x<=25+half)c.px(x,y,y<8?"D":y<17?"d":"r");}
  c.hline(7,18,36,"D");c.hline(10,19,30,"R");drawFill(c,22,27,7,11,"K");drawFill(c,23,28,5,10,"d");c.px(27,33,"g");
  drawFill(c,14,25,5,5,"K");drawFill(c,15,26,3,3,"w");c.px(16,26,"F");c.hline(14,38,22,"D");c.px(8,20,"H");c.px(41,20,"H");
});
sprite("facility_starter_foraging",{w:38,h:24,pivot:[19,21]},c=>{
  c.ellipse(19,21,17,2,"K");for(let y=2;y<18;y++){const hw=y<9?2*(y+1):2*(18-y);c.hline(19-hw,y+2,hw*2,"r");}
  for(let row=0;row<3;row++){const yy=6+row*4;c.hline(9,yy,20,"D");c.hline(10,yy+1,18,"R");for(let x=12;x<27;x+=5){c.vline(x,yy-3,4,"H");c.px(x+1,yy-3,"L");}}
});
sprite("facility_starter_well",{w:28,h:34,pivot:[14,32]},c=>{
  c.ellipse(14,32,12,2,"K");drawFill(c,4,17,20,13,"K");drawFill(c,6,18,16,11,"D");drawFill(c,7,19,14,8,"S");
  c.ellipse(14,19,8,4,"K");c.ellipse(14,18,6,3,"w");c.vline(6,3,16,"r");c.vline(21,3,16,"r");c.hline(5,3,18,"D");
  c.hline(4,1,20,"K");c.hline(6,2,16,"R");c.vline(13,4,12,"D");c.hline(13,15,6,"D");
});
sprite("facility_farm",{w:42,h:30,pivot:[21,28]},c=>{
  c.ellipse(21,28,19,2,"K");drawFill(c,4,10,34,16,"K");drawFill(c,6,11,30,14,"r");
  for(let y=13;y<24;y+=4){c.hline(8,y,26,"D");for(let x=11;x<31;x+=6){c.vline(x,y-2,3,"H");c.px(x+1,y-2,"L");}}
});
sprite("facility_workshop",{w:48,h:42,pivot:[24,40]},c=>{
  c.ellipse(24,40,18,2,"K");drawFill(c,9,19,30,18,"K");drawFill(c,11,21,26,15,"r");
  for(let y=3;y<20;y++)for(let x=2;x<46;x++){const half=Math.floor((y-3)*1.05);if(x>=24-half&&x<=24+half)c.px(x,y,y<7?"D":"d");}
  c.hline(5,18,38,"D");drawFill(c,20,27,8,12,"K");drawFill(c,21,28,6,11,"R");c.vline(13,24,9,"D");c.hline(31,24,5,"S");
});
sprite("facility_storage",{w:42,h:36,pivot:[21,34]},c=>{
  c.ellipse(21,34,17,2,"K");drawFill(c,7,13,28,19,"K");drawFill(c,9,15,24,16,"r");
  for(let y=3;y<15;y++)for(let x=2;x<40;x++){const half=Math.floor((y-3)*1.15);if(x>=21-half&&x<=21+half)c.px(x,y,"d");}
  c.hline(4,14,34,"D");c.vline(13,17,12,"R");c.vline(29,17,12,"R");c.hline(12,22,18,"D");
});
sprite("facility_market",{w:44,h:36,pivot:[22,34]},c=>{
  c.ellipse(22,34,19,2,"K");drawFill(c,7,15,30,18,"K");drawFill(c,9,18,26,14,"R");
  c.hline(4,8,36,"K");c.hline(6,9,32,"D");drawFill(c,6,10,32,6,"c");for(let x=8;x<38;x+=8)c.vline(x,10,6,"G");
  c.hline(11,23,22,"D");c.vline(13,19,9,"D");c.vline(30,19,9,"D");
});
sprite("world_tree",{w:40,h:48,pivot:[20,46]},c=>{
  c.ellipse(20,43,12,3,"K");c.vline(17,28,15,"r");c.vline(20,27,16,"R");c.vline(22,30,12,"r");
  c.hline(16,36,8,"D");c.px(18,34,"S");
  c.ellipse(20,18,14,12,"K");
  c.ellipse(15,16,10,10,"h");c.ellipse(24,15,10,10,"h");
  c.ellipse(11,20,7,7,"H");c.ellipse(19,10,9,8,"G");c.ellipse(28,20,7,7,"H");
  c.ellipse(17,22,9,7,"g");c.ellipse(25,23,7,6,"g");
  c.ellipse(14,12,5,5,"L");c.ellipse(22,11,5,4,"L");c.ellipse(28,17,4,4,"G");
  for(const [x,y,k] of [[8,17,"G"],[12,8,"L"],[17,5,"L"],[23,7,"G"],[31,14,"G"],[30,23,"H"],[12,25,"H"],[20,27,"G"]])c.px(x,y,k);
  c.px(13,13,"Y");c.px(25,17,"L");c.px(18,20,"H");c.px(23,24,"H");
});
sprite("world_rock",{w:22,h:16,pivot:[11,15]},c=>{
  c.ellipse(11,14,10,2,"K");
  c.px(4,10,"K");c.px(5,7,"K");c.hline(6,5,7,"K");c.hline(13,6,5,"K");c.px(18,9,"K");
  c.hline(5,8,13,"D");c.hline(7,6,9,"S");c.hline(15,7,3,"D");
  c.vline(5,9,3,"r");c.vline(17,8,4,"r");c.hline(8,12,7,"R");
});