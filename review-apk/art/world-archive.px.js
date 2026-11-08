// Merzkava Pocket — World Archive Home Base asset source.
// The five selectable character families use visibly distinct silhouettes and original Merzkava-inspired cultivation clothing.
const W=32,H=42;
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const STYLES=[
 {id:"chibi",head:13,body:10,robe:0},
 {id:"classic",head:10,body:13,robe:1},
 {id:"slim",head:9,body:11,robe:2},
 {id:"ornate",head:11,body:17,robe:3},
 {id:"painterly",head:10,body:14,robe:4}
];
const rect=(c,x,y,w,h,k)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)c.px(xx,yy,k);};
const oval=(c,cx,cy,rx,ry,k)=>{for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if(x*x/(rx*rx)+y*y/(ry*ry)<=1)c.px(cx+x,cy+y,k);};
const line=(c,x1,y1,x2,y2,k)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)c.px(Math.round(x1+(x2-x1)*i/n),Math.round(y1+(y2-y1)*i/n),k);};
function drawCharacter(c,style,dir,move,frame=0){
 const front=["s","se","sw"].includes(dir),back=["n","ne","nw"].includes(dir),side=!front&&!back,left=["w","nw","sw"].includes(dir);
 const mx=x=>left?W-1-x:x,walk=move==="walk",phase=[0,1,2,1][frame%4],bob=walk?[0,1,0,1][frame%4]:(frame===1?1:0);
 const cx=15,headTop=2+bob,headH=style.id==="chibi"?12:style.id==="painterly"?10:9,headW=style.head;
 const bodyTop=headTop+headH-1,legTop=style.id==="chibi"?31:style.id==="slim"?31:30,shift=walk?(phase===1?1:phase===2?-1:0):0;
 oval(c,15,40,7,1,"K");
 if(style.id==="chibi"){
  rect(c,mx(10+shift),legTop,4,6,"K");rect(c,mx(18-shift),legTop,4,6,"K");
  rect(c,mx(9+shift),37,6,3,"B");rect(c,mx(18-shift),37,6,3,"B");
 }else{
  rect(c,mx(11+shift),legTop,4,8,"K");rect(c,mx(18-shift),legTop,4,8,"K");
  rect(c,mx(10+shift),37,6,3,"B");rect(c,mx(18-shift),37,6,3,"B");
 }
 const half=Math.floor(style.body/2),leftX=cx-half;
 // Five independent garment constructions: short layered robe, crossed everyday robe,
 // long scholar robe, formal mantle, and asymmetric traveller coat.
 if(style.robe===0){
  rect(c,mx(leftX-2),bodyTop+2,style.body+4,10,"K");
  rect(c,mx(leftX-1),bodyTop+3,style.body+2,8,"c");
  rect(c,mx(leftX+1),bodyTop+4,Math.max(3,style.body-2),6,"C");
  rect(c,mx(leftX-3),bodyTop+3,3,5,"K");rect(c,mx(leftX+style.body),bodyTop+3,3,5,"K");
  rect(c,mx(leftX-2),bodyTop+12,style.body+4,3,"D");
  line(c,mx(cx),bodyTop+4,mx(cx-3),bodyTop+10,"g");
  rect(c,mx(cx-1),bodyTop+12,2,5,"d");
 }else if(style.robe===1){
  for(let y=bodyTop+1;y<38;y++){const spread=Math.floor((y-bodyTop)*.18);rect(c,mx(leftX-spread),y,style.body+spread*2,1,y>34?"D":"d");}
  rect(c,mx(leftX-3),bodyTop+2,4,7,"K");rect(c,mx(leftX+style.body-1),bodyTop+2,4,7,"K");
  rect(c,mx(leftX-2),bodyTop+3,3,5,"C");rect(c,mx(leftX+style.body),bodyTop+3,3,5,"c");
  line(c,mx(cx+3),bodyTop+1,mx(cx-3),bodyTop+9,"S");
  line(c,mx(cx-3),bodyTop+9,mx(cx+1),bodyTop+16,"C");
  rect(c,mx(leftX-1),bodyTop+12,style.body+2,2,"D");
  rect(c,mx(cx-1),bodyTop+13,3,7,"g");
 }else if(style.robe===2){
  for(let y=bodyTop;y<39;y++){const spread=Math.floor((y-bodyTop)*.28);rect(c,mx(leftX-spread),y,style.body+spread*2,1,(y%5===0)?"D":"d");}
  rect(c,mx(leftX-5),bodyTop+2,5,9,"K");rect(c,mx(leftX+style.body),bodyTop+2,5,9,"K");
  rect(c,mx(leftX-4),bodyTop+3,3,7,"C");rect(c,mx(leftX+style.body+1),bodyTop+3,3,7,"c");
  line(c,mx(cx+4),bodyTop+1,mx(cx-2),bodyTop+10,"S");
  line(c,mx(cx-2),bodyTop+10,mx(cx+2),bodyTop+18,"C");
  rect(c,mx(cx-1),bodyTop+13,3,2,"G");
  line(c,mx(cx-4),bodyTop+16,mx(cx-8),37,"D");
  line(c,mx(cx+3),bodyTop+16,mx(cx+8),38,"C");
 }else if(style.robe===3){
  for(let y=bodyTop;y<39;y++){const spread=3+Math.floor((y-bodyTop)*.26);rect(c,mx(cx-spread),y,spread*2,1,(y%4===0)?"D":"d");}
  rect(c,mx(cx-10),bodyTop+1,7,8,"K");rect(c,mx(cx+3),bodyTop+1,7,8,"K");
  rect(c,mx(cx-9),bodyTop+2,5,6,"C");rect(c,mx(cx+4),bodyTop+2,5,6,"c");
  line(c,mx(cx+4),bodyTop+1,mx(cx-2),bodyTop+12,"G");
  line(c,mx(cx-2),bodyTop+12,mx(cx+4),bodyTop+20,"S");
  rect(c,mx(cx-7),bodyTop+13,14,3,"G");rect(c,mx(cx-1),bodyTop+13,3,3,"B");
  line(c,mx(cx-7),bodyTop+17,mx(cx-10),38,"C");line(c,mx(cx+7),bodyTop+17,mx(cx+10),38,"c");
  rect(c,mx(cx-12),bodyTop+3,2,5,"D");rect(c,mx(cx+10),bodyTop+3,2,5,"D");
 }else{
  for(let y=bodyTop;y<39;y++){const spread=3+Math.floor((y-bodyTop)*.17);rect(c,mx(cx-spread),y,spread*2,1,(y%6===0)?"D":"d");}
  rect(c,mx(cx-10),bodyTop+2,6,8,"K");rect(c,mx(cx+4),bodyTop+1,6,9,"K");
  rect(c,mx(cx-9),bodyTop+3,4,6,"C");rect(c,mx(cx+5),bodyTop+2,4,7,"c");
  line(c,mx(cx+3),bodyTop+1,mx(cx-3),bodyTop+11,"S");
  line(c,mx(cx-3),bodyTop+11,mx(cx+1),bodyTop+19,"C");
  line(c,mx(cx-8),bodyTop+10,mx(cx-13),36,"D");
  line(c,mx(cx+7),bodyTop+13,mx(cx+12),37,"d");
  rect(c,mx(cx-2),bodyTop+14,5,2,"G");
 }
 // Crossed inner collar and waist sash keep every silhouette within the cultivation setting.
 rect(c,mx(cx-2),bodyTop-1,4,4,"s");
 line(c,mx(cx-4),bodyTop,mx(cx),bodyTop+5,"S");
 line(c,mx(cx+4),bodyTop,mx(cx),bodyTop+5,"G");
 const cy=headTop+Math.floor(headH/2);
 oval(c,cx,cy,Math.floor(headW/2)+1,Math.floor(headH/2)+1,"K");
 oval(c,cx,cy,Math.floor(headW/2),Math.floor(headH/2),"s");
 oval(c,cx-1,cy-2,Math.floor(headW/2),Math.max(2,Math.floor(headH/2)-1),"S");
 if(style.id==="chibi"){
  oval(c,cx,headTop+1,8,4,"h");oval(c,cx-7,headTop+5,3,6,"h");oval(c,cx+7,headTop+5,3,6,"h");
  oval(c,cx-6,headTop+1,3,3,"H");oval(c,cx+6,headTop+1,3,3,"H");
 }else if(style.id==="classic"){
  oval(c,cx,headTop+1,6,4,"h");rect(c,mx(cx-6),headTop+2,3,7,"h");rect(c,mx(cx+4),headTop+2,3,6,"h");
  line(c,mx(cx+4),headTop+1,mx(cx+10),headTop-2,"H");
 }else if(style.id==="slim"){
  oval(c,cx,headTop+1,6,4,"h");rect(c,mx(cx-6),headTop+3,3,13,"h");rect(c,mx(cx+4),headTop+3,3,12,"h");
  line(c,mx(cx+5),headTop+10,mx(cx+9),headTop+17,"H");
 }else if(style.id==="ornate"){
  oval(c,cx,headTop,7,4,"h");rect(c,mx(cx-6),headTop+2,3,10,"h");rect(c,mx(cx+4),headTop+2,3,10,"h");
  rect(c,mx(cx-2),headTop-3,5,3,"D");c.px(mx(cx),headTop-5,"G");
  line(c,mx(cx+6),headTop+2,mx(cx+11),headTop+10,"G");
 }else{
  oval(c,cx,headTop+1,6,4,"h");rect(c,mx(cx-6),headTop+2,3,14,"h");rect(c,mx(cx+4),headTop+2,3,9,"h");
  line(c,mx(cx+5),headTop+9,mx(cx+12),headTop+17,"H");
  line(c,mx(cx-5),headTop+12,mx(cx-10),headTop+18,"h");
 }
 if(front){
  c.px(mx(cx-3),cy+2,"K");c.px(mx(cx+3),cy+2,"K");
  if(style.id==="chibi"){c.px(mx(cx-4),cy+4,"H");c.px(mx(cx+4),cy+4,"H");}
  else{c.px(mx(cx-3),cy+4,"H");c.px(mx(cx+3),cy+4,"H");}
 }else if(side)c.px(mx(left?cx-3:cx+3),cy+2,"K");
 if(style.id==="classic"||style.id==="slim")line(c,mx(cx-2),bodyTop+5,mx(cx-5),bodyTop+11,"D");
 if(style.id==="ornate"){rect(c,mx(cx-1),bodyTop+5,3,2,"G");c.px(mx(cx),bodyTop+8,"S");}
 if(style.id==="painterly"){c.px(mx(cx-5),bodyTop+5,"G");c.px(mx(cx+5),bodyTop+7,"S");c.px(mx(cx-3),bodyTop+11,"C");}
 if(walk){const armY=bodyTop+4+(phase%2);c.px(mx(cx-9),armY,"S");c.px(mx(cx+9),armY+1,"s");}
}
const palettes={
 chibi:{K:"#18201f",s:"#d69c7a",S:"#f4c9a6",h:"#33252b",H:"#805348",c:"#587d70",C:"#9ab9a0",d:"#29443e",D:"#b08a55",B:"#54443b",g:"#ddbd72",G:"#f1df9b"},
 classic:{K:"#17201f",s:"#bd8063",S:"#eab28d",h:"#25252d",H:"#66505a",c:"#46636f",C:"#90aab1",d:"#293c4c",D:"#c0a06a",B:"#493b34",g:"#d9bd83",G:"#f2d99e"},
 slim:{K:"#182020",s:"#d7a27e",S:"#f0c5a0",h:"#26232b",H:"#715b54",c:"#5d584c",C:"#b1a27c",d:"#39372f",D:"#c6a16a",B:"#423b35",g:"#c69c55",G:"#f0d18d"},
 ornate:{K:"#171c20",s:"#d59b77",S:"#f3c39c",h:"#29232a",H:"#74505a",c:"#693e50",C:"#c17d86",d:"#3b293b",D:"#c7a36a",B:"#40363a",g:"#dcba70",G:"#f4dfab"},
 painterly:{K:"#171c1b",s:"#c78e70",S:"#edbb98",h:"#292824",H:"#8b6749",c:"#526d64",C:"#a0b18b",d:"#35423d",D:"#c49b61",B:"#4c4036",g:"#dfbd76",G:"#f5e4aa"}
};
for(const style of STYLES){
 pal(palettes[style.id]);
 sprite("style_preview_"+style.id,{w:W,h:H,pivot:[15,39]},c=>drawCharacter(c,style,"s","idle",2));
 for(const dir of DIRS){
  anim(style.id+"_idle_"+dir,{w:W,h:H,frames:4,fps:3},c=>drawCharacter(c,style,dir,"idle",c.frame));
  anim(style.id+"_walk_"+dir,{w:W,h:H,frames:4,fps:8},c=>drawCharacter(c,style,dir,"walk",c.frame));
 }
}
pal({K:"#18221f",g:"#5b7956",G:"#7d9869",L:"#a9b58a",d:"#806f50",D:"#a18c65",w:"#2d7180",W:"#3b93a0",B:"#74bec0",F:"#b3d9c9",s:"#b8a47a",S:"#d6c397",r:"#6a5847",R:"#947757",h:"#31453d",H:"#49664f",y:"#dbc88e",Y:"#f0dfaa"});
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
sprite("world_tree",{w:30,h:38,pivot:[15,36]},c=>{
  c.ellipse(15,36,11,2,"K");c.vline(13,23,12,"r");c.vline(16,22,13,"R");
  c.ellipse(15,12,11,10,"h");c.ellipse(11,11,7,7,"H");c.ellipse(19,13,7,7,"G");
  c.px(8,7,"L");c.px(17,6,"L");c.px(20,11,"G");
});
sprite("world_rock",{w:16,h:10,pivot:[8,9]},c=>{c.ellipse(8,7,7,3,"K");c.ellipse(7,6,5,2,"D");c.px(5,5,"S");});

// One shared pixel-art silhouette for all logs and one for all hoes; no per-tier art variants.
pal({K:"#171715",s:"#75533b",S:"#bc9062",h:"#59645f",H:"#aeb5a6",c:"#8c613d",C:"#bd8a53",d:"#402e22",D:"#d4aa6d",B:"#291f19",g:"#d3c095",G:"#f2e4c4",m:"#4b504b",n:"#81877b",o:"#d5d1bd",p:"#e9dfc8"});
sprite("item_wood_log",{w:32,h:32,pivot:[16,28]},c=>{
  c.ellipse(16,27,13,2,"K");rect(c,5,10,20,14,"d");rect(c,6,9,18,13,"c");
  c.hline(7,11,16,"S");c.vline(9,12,9,"C");c.vline(21,11,9,"s");line(c,10,12,10,21,"S");line(c,17,10,17,20,"S");
  c.ellipse(24,15,6,7,"B");c.ellipse(24,15,5,6,"S");c.ellipse(24,15,3,4,"C");c.ellipse(24,15,2,3,"s");c.ellipse(24,15,1,1,"D");
  c.px(7,22,"D");c.px(18,22,"S");c.hline(8,24,14,"B");
});
sprite("item_hoe",{w:32,h:32,pivot:[16,28]},c=>{
  c.ellipse(16,27,10,2,"K");line(c,8,27,22,8,"B");line(c,9,26,23,8,"c");line(c,10,25,22,10,"C");
  c.px(9,26,"D");c.px(12,22,"S");c.px(15,18,"S");c.hline(18,6,11,"B");c.vline(18,6,5,"B");c.hline(19,5,10,"h");c.vline(28,6,4,"H");
  c.px(27,10,"h");c.px(26,9,"H");c.px(20,7,"o");c.px(22,7,"H");c.px(24,7,"o");
});


// Daily Login — wide, set-back Japanese-modern shop with a quiet approach.
pal({
 K:"#171b1c",B:"#24292a",C:"#373c3d",c:"#4b504e",
 W:"#eeeae0",w:"#d7d2c8",I:"#f7f2e8",i:"#c6c0b5",
 D:"#493225",d:"#63422f",M:"#805638",m:"#a4774f",
 L:"#c09865",l:"#d8b685",G:"#e6d3ad",g:"#f2e4c9",
 A:"#1d282d",a:"#31444a",b:"#53666a",
 P:"#343838",p:"#454a49",S:"#666a67",s:"#85867e",
 R:"#918a7a",r:"#b0a795",T:"#46553c",t:"#6e7c53",
 U:"#a37a48",u:"#d4b57c",Y:"#f1dda2",y:"#fff0ca",
 q:"#6e7776",z:"#282e30"
});

// Transparent portrait canvas: empty upper pixels become live sky.
// The perspective asphalt approach widens toward the viewer.
sprite("daily_login_shop_front",{w:360,h:640,pivot:[180,639]},c=>{
  // Shallow Japanese roof and broad eaves.
  for(let y=145;y<204;y++){
    const half=Math.min(166,Math.max(0,Math.floor((y-145)*2.83)));
    if(half<2)continue;
    c.hline(180-half,y,half*2,"K");
    if(y>151)c.hline(180-half+3,y+1,half*2-6,(y%12<6)?"C":"B");
    if(y%8===0&&half>24)c.hline(180-half+11,y+2,half*2-22,"q");
  }
  for(let y=158;y<201;y+=7){
    const half=Math.floor((y-145)*2.83);
    for(let x=180-half+15+(y%14);x<180+half-12;x+=24){
      c.vline(x,y,3,"c");c.px(x+1,y,"s");
    }
  }
  rect(c,12,199,336,17,"K");rect(c,18,202,324,8,"C");
  c.hline(17,202,326,"s");c.hline(21,211,318,"D");
  for(let x=28;x<337;x+=26)c.vline(x,203,8,"B");

  // Wide, low facade: white plaster, charcoal framing, natural brown timber.
  rect(c,31,215,298,202,"K");rect(c,37,219,286,190,"W");
  rect(c,37,219,286,9,"I");rect(c,37,400,286,9,"w");
  rect(c,31,215,9,198,"B");rect(c,320,215,9,198,"B");
  rect(c,43,226,4,179,"D");rect(c,313,226,4,179,"D");
  rect(c,47,240,266,5,"M");rect(c,47,394,266,6,"M");
  c.hline(47,241,266,"l");c.hline(47,395,266,"D");

  // Timber lattice side bays.
  rect(c,54,265,73,117,"K");rect(c,58,269,65,109,"d");
  rect(c,61,273,59,101,"M");
  for(let x=64;x<120;x+=8){rect(c,x,275,3,96,"D");c.vline(x+1,281,83,"m");}
  for(let y=290;y<370;y+=20)c.hline(61,y,59,"c");
  c.hline(61,274,59,"l");c.hline(61,374,59,"D");
  rect(c,233,265,73,117,"K");rect(c,237,269,65,109,"d");
  rect(c,240,273,59,101,"M");
  for(let x=243;x<299;x+=8){rect(c,x,275,3,96,"D");c.vline(x+1,281,83,"m");}
  for(let y=290;y<370;y+=20)c.hline(240,y,59,"c");
  c.hline(240,274,59,"l");c.hline(240,374,59,"D");

  // White plaster returns around the recessed entrance.
  rect(c,128,254,9,142,"I");rect(c,223,254,10,142,"I");
  rect(c,130,257,5,136,"w");rect(c,226,257,4,136,"w");

  // Recessed doorway; the CSS shoji panel is the draggable door.
  rect(c,135,248,90,166,"K");rect(c,140,253,80,155,"D");
  rect(c,145,259,70,142,"A");rect(c,150,264,60,130,"a");
  c.hline(150,264,60,"g");
  // Warm but dim interior silhouette.
  rect(c,157,280,46,101,"z");rect(c,160,284,40,91,"a");
  c.hline(160,285,40,"l");
  rect(c,162,346,36,4,"d");rect(c,165,350,30,16,"B");
  c.ellipse(180,318,7,8,"B");rect(c,171,326,18,24,"B");
  rect(c,167,333,5,16,"B");rect(c,190,333,5,16,"B");
  c.ellipse(180,355,13,3,"D");c.hline(169,354,22,"g");
  c.ellipse(180,346,6,3,"L");c.hline(175,344,10,"Y");
  rect(c,130,405,100,10,"K");rect(c,135,407,90,5,"L");
  c.hline(137,408,86,"g");
  rect(c,113,413,134,7,"B");rect(c,118,415,124,3,"s");

  // Low-output paper lanterns on either side of the door.
  const lantern=(x,y)=>{
    rect(c,x+4,y,12,3,"B");rect(c,x,y+3,20,23,"K");
    rect(c,x+3,y+6,14,14,"u");rect(c,x+5,y+7,10,12,"Y");
    for(let yy=y+9;yy<y+18;yy+=4)c.hline(x+5,yy,10,"l");
    rect(c,x+2,y+21,16,3,"D");c.vline(x+9,y+24,4,"D");
  };
  lantern(113,293);lantern(227,293);

  // Freestanding DAILY kanban beside the roadside approach.
  rect(c,245,398,31,49,"K");rect(c,248,401,25,42,"D");
  rect(c,251,404,19,35,"I");
  const glyph={
    D:["110","101","101","101","110"],
    A:["010","101","111","101","101"],
    I:["111","010","010","010","111"],
    L:["100","100","100","100","111"],
    Y:["101","101","010","010","010"]
  };
  for(let n=0;n<5;n++){
    const rows=glyph["DAILY"[n]],yy=406+n*6;
    for(let gy=0;gy<5;gy++)for(let gx=0;gx<3;gx++)if(rows[gy][gx]==="1")c.px(258+gx,yy+gy,"B");
  }
  line(c,249,445,245,465,"B");line(c,271,445,277,465,"B");
  c.hline(243,464,35,"D");

  // Covered entrance terrace and a road that opens in correct perspective.
  rect(c,23,414,314,11,"B");rect(c,29,416,302,6,"s");
  for(let x=35;x<327;x+=27)c.vline(x,416,5,"c");
  for(let y=420;y<640;y++){
    const t=(y-420)/220;
    const half=Math.floor(34+t*205);
    const left=180-half,right=180+half;
    if(left>0)c.hline(0,y,left,"r");
    if(right<360)c.hline(right,y,360-right,"r");
    c.hline(Math.max(0,left),y,Math.min(360,right)-Math.max(0,left),"P");
    if(left>1)c.vline(left,y,1,"C");
    if(right<359)c.vline(right,y,1,"C");
  }

  // Fine asphalt grain and gravel shoulders; sparse stones keep it natural.
  for(let i=0;i<230;i++){
    const x=(i*73+19)%360,y=426+(i*47)%210;
    const half=Math.floor(34+((y-420)/220)*205);
    if(x>180-half+7&&x<180+half-7){
      const tone=i%5===0?"S":i%5===1?"p":i%5===2?"C":"P";
      c.px(x,y,tone);
      if(i%11===0)c.px(x+1,y,tone);
    }else if(i%2===0){
      c.px(x,y,i%4===0?"g":"s");
      if(i%7===0)c.px(x+1,y,"r");
    }
  }
  for(const [x,y,rx] of [[29,431,4],[47,450,3],[80,443,4],[304,434,4],[324,453,3],[291,469,4],[24,501,4],[336,520,5],[46,557,4],[312,580,4],[13,612,5],[346,625,5]]){
    c.ellipse(x,y,rx,2,"s");c.px(x-1,y-1,"g");
  }

  // Quiet planters beside the facade.
  rect(c,46,385,26,12,"K");rect(c,49,386,20,7,"d");
  c.ellipse(59,377,10,8,"T");c.ellipse(54,373,6,6,"t");c.ellipse(64,374,6,6,"t");c.px(58,368,"u");
  rect(c,288,385,26,12,"K");rect(c,291,386,20,7,"d");
  c.ellipse(301,377,10,8,"T");c.ellipse(296,373,6,6,"t");c.ellipse(306,374,6,6,"t");c.px(300,368,"u");
});

// Four equal rectangular noren panels, attached along their top edge.
anim("daily_login_noren_wave",{w:120,h:40,frames:4,fps:4},c=>{
  c.hline(4,5,112,"B");c.hline(5,6,110,"u");
  for(let i=0;i<4;i++){
    const x=7+i*27;
    const phase=(c.frame+i)%4;
    const tail=[0,1,0,-1][phase];
    for(let row=0;row<25;row++){
      const shift=Math.round(Math.sin(i*.9+c.frame*.7+row*.055)*1.2)+Math.round(tail*row/24);
      const left=x+shift;
      c.hline(left,8+row,22,"I");
      if(row<24)c.vline(left,8+row,1,"i");
      if(row<24)c.vline(left+21,8+row,1,"w");
      if(row%6===0)c.hline(left+3,8+row,15,"w");
    }
    c.hline(x+2,8,18,"g");
    c.hline(x+2+tail,31,18,"i");
  }
});
