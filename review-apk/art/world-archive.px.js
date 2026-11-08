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
 q:"#6e7776",z:"#282e30",
 H:"#302321",h:"#5a382d",F:"#fff0d5",f:"#d4c3a4",
 V:"#efbd91",v:"#b97b5a",X:"#d87970",x:"#f3a18f",
 E:"#8f3d34",e:"#c75c48",N:"#f4ead6",n:"#c3b59c",
 J:"#d8ad72",j:"#f2cf97"
});

// Transparent portrait canvas: empty upper pixels become live sky.
// The perspective asphalt approach widens toward the viewer.
sprite("daily_login_shop_front",{w:360,h:640,pivot:[180,639]},c=>{
  // Traditional kawara roof: high ridge, deep layered tiles and gently raised eave ends.
  for(let y=126;y<220;y++){
    const half=Math.min(180,Math.floor(8+(y-126)*1.92));
    const left=180-half,right=180+half;
    const shade=y<145?"K":y%12<4?"B":y%12<8?"C":"q";
    c.hline(left,y,right-left+1,shade);
    if(y%6===0)c.hline(left+2,y+1,right-left-3,"K");
    if(y%9===0)c.hline(left+7,y+2,right-left-13,"s");
  }
  // Raised ridge cap with traditional round end ornaments.
  c.ellipse(180,128,23,7,"K");c.ellipse(180,126,19,4,"q");
  c.hline(158,126,44,"C");c.hline(164,124,32,"s");
  c.ellipse(158,128,5,4,"B");c.ellipse(202,128,5,4,"B");
  c.px(158,127,"L");c.px(202,127,"L");
  // Individual overlapping kawara courses; every other row shifts its joints.
  for(let row=0;row<14;row++){
    const y=137+row*5;
    const half=Math.min(180,Math.floor(8+(y-126)*1.92));
    const left=180-half,right=180+half;
    const offset=row%2?9:0;
    for(let x=left+5+offset;x<right-8;x+=18){
      c.hline(x,y,13,row%3===0?"q":"C");
      c.hline(x+1,y+1,11,"B");
      c.vline(x,y+1,3,"K");
      c.vline(x+12,y+1,3,"s");
      c.px(x+6,y,"l");
    }
  }
  // Deep curved eaves: fascia, under-roof rafters and ornamental tile tips.
  c.ellipse(8,216,17,8,"K");c.ellipse(352,216,17,8,"K");
  c.hline(0,216,360,"K");c.hline(4,218,352,"D");
  rect(c,0,221,360,18,"K");rect(c,4,223,352,10,"D");
  c.hline(4,224,352,"L");c.hline(4,231,352,"M");
  for(let x=10;x<355;x+=18){
    c.vline(x,222,10,"B");c.px(x+1,223,"l");
    if(x%36===10)c.hline(x-3,233,7,"g");
  }
  for(let x=16;x<350;x+=34){
    rect(c,x,233,7,16,"K");rect(c,x+2,235,3,12,"M");
    c.hline(x-3,235,13,"L");
  }
  c.ellipse(9,222,7,5,"L");c.ellipse(351,222,7,5,"L");

  // Wide, low facade: white plaster, charcoal framing, natural brown timber.
  rect(c,0,215,360,202,"K");rect(c,5,219,350,190,"W");
  rect(c,37,219,286,9,"I");rect(c,37,400,286,9,"w");
  rect(c,0,215,10,198,"B");rect(c,350,215,10,198,"B");
  rect(c,10,226,5,179,"D");rect(c,345,226,5,179,"D");
  rect(c,15,240,330,5,"M");rect(c,15,394,330,6,"M");
  c.hline(15,241,330,"l");c.hline(15,395,330,"D");

  // Small timber shop plaque beneath the eaves, centred above the noren.
  rect(c,142,242,76,15,"K");rect(c,146,244,68,10,"D");
  rect(c,149,246,62,6,"L");c.hline(150,246,60,"g");
  // Compact hand-painted soba mark, kept legible as blocky sign lettering.
  for(const [xx,yy] of [[157,247],[160,249],[164,247],[168,249],[174,247],[178,249],[184,247],[188,249],[194,247],[198,249]])c.px(xx,yy,"D");
  c.px(159,251,"H");c.px(180,251,"H");c.px(199,251,"H");

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

  // Covered entrance terrace, a broad stone step and a road that opens in correct perspective.
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
  for(let i=0;i<1080;i++){
    const seed=(i*73+19)%65521;
    const x=seed%360,y=426+((i*47+Math.floor(seed/17))%210);
    const half=Math.floor(34+((y-420)/220)*205);
    if(x>180-half+7&&x<180+half-7){
      const tone=i%7===0?"S":i%7===1?"p":i%7===2?"C":i%7===3?"z":i%7===4?"q":"P";
      c.px(x,y,tone);
      if(i%9===0)c.px(x+1,y,tone);
      if(i%31===0)c.px(x,y+1,"s");
    }else if(i%2===0){
      c.px(x,y,i%4===0?"g":i%4===2?"s":"r");
      if(i%7===0)c.px(x+1,y,"r");
      if(i%19===0)c.px(x,y+1,"D");
    }
  }
  for(const [x,y,rx] of [[29,431,4],[47,450,3],[80,443,4],[304,434,4],[324,453,3],[291,469,4],[24,501,4],[336,520,5],[46,557,4],[312,580,4],[13,612,5],[346,625,5]]){
    c.ellipse(x,y,rx,2,"s");c.px(x-1,y-1,"g");
  }

  // Quiet planters beside the facade.
  rect(c,15,385,32,15,"K");rect(c,18,387,26,9,"d");
  c.ellipse(31,377,12,9,"T");c.ellipse(25,372,7,7,"t");c.ellipse(37,373,7,7,"t");c.px(30,366,"u");
  rect(c,313,385,32,15,"K");rect(c,316,387,26,9,"d");
  c.ellipse(329,377,12,9,"T");c.ellipse(323,372,7,7,"t");c.ellipse(335,373,7,7,"t");c.px(328,366,"u");
});

// Freestanding roadside kanban: posts and feet are part of its own foreground sprite.
sprite("daily_login_kanban",{w:64,h:132,pivot:[32,128]},c=>{
  c.ellipse(32,128,23,3,"K");
  c.vline(18,70,55,"K");c.vline(45,70,55,"K");
  c.vline(20,72,51,"D");c.vline(43,72,51,"D");
  c.hline(12,122,40,"K");c.hline(15,123,34,"L");
  rect(c,5,6,54,78,"K");
  rect(c,8,9,48,72,"D");
  rect(c,11,12,42,66,"L");
  rect(c,14,15,36,60,"I");
  c.hline(14,15,36,"g");c.hline(14,74,36,"u");
  // Painted vertical lettering strokes; the Japanese label is overlaid by the UI.
  c.vline(21,24,36,"D");c.vline(36,24,36,"D");
  c.hline(21,24,15,"D");c.hline(21,40,15,"D");c.hline(21,59,15,"D");
  c.px(28,33,"u");c.px(31,48,"u");
  rect(c,1,4,7,10,"B");rect(c,56,4,7,10,"B");
  c.hline(17,87,30,"M");c.hline(20,89,24,"L");
  c.hline(18,98,28,"D");
});


// Pixel-RPG soba shop interior: a complete original cut-away room, built as layered material clusters.
sprite("daily_login_shop_interior",{w:360,h:800,pivot:[180,799]},c=>{
  // Outer frame, dark ceiling and warm plaster.
  rect(c,0,0,360,800,"K");
  rect(c,5,5,350,790,"D");
  rect(c,10,10,340,515,"W");
  rect(c,10,10,340,18,"B");
  rect(c,10,27,340,5,"L");
  for(let x=18;x<350;x+=42){
    rect(c,x,18,4,11,"D");
    c.vline(x+1,31,485,"w");
  }
  // Ceiling beams and roof timber visible inside the old shop.
  rect(c,10,45,340,10,"K");rect(c,10,48,340,4,"M");
  rect(c,10,156,340,9,"K");rect(c,10,159,340,3,"L");
  rect(c,10,317,340,8,"K");rect(c,10,320,340,3,"L");
  rect(c,10,505,340,13,"K");rect(c,10,509,340,4,"M");
  for(let x=24;x<350;x+=68){
    rect(c,x,55,6,450,"D");rect(c,x+2,58,2,442,"m");
    c.vline(x+5,64,425,"l");
  }
  // Plaster panel grain, kept sparse so it reads as aged lime plaster rather than noise.
  for(let i=0;i<260;i++){
    const x=15+(i*71)%330,y=70+(i*43)%425;
    if((x>28&&x<330)&&(y<145||y>175)){
      c.px(x,y,i%5===0?"i":i%5===1?"w":"W");
    }
  }

  // Large shoji window with night-blue glass, lattice and a lower timber sill.
  rect(c,112,83,116,166,"K");rect(c,118,89,104,154,"D");
  rect(c,124,95,92,140,"A");rect(c,128,99,84,132,"b");
  rect(c,131,102,78,126,"a");
  for(let x=140;x<209;x+=19){rect(c,x,101,4,126,"M");c.vline(x+1,108,110,"l");}
  for(let y=118;y<226;y+=22){rect(c,129,y,82,4,"M");c.hline(131,y+1,78,"l");}
  rect(c,112,83,116,7,"K");rect(c,116,86,108,3,"L");
  rect(c,108,242,124,10,"K");rect(c,113,244,114,4,"M");
  c.hline(115,245,110,"l");
  // Moon glow and faint silhouettes outside the shoji.
  c.ellipse(176,145,13,13,"s");c.ellipse(171,141,8,8,"G");
  c.ellipse(151,206,20,10,"T");c.ellipse(185,210,27,12,"t");c.ellipse(203,204,15,8,"T");
  c.hline(132,224,77,"D");

  // Upper-left plate shelf: stacked bowls, ceramic jars and a hand towel.
  rect(c,18,187,86,7,"K");rect(c,20,189,82,3,"L");
  rect(c,20,165,18,20,"K");rect(c,22,167,14,16,"w");c.hline(23,169,12,"I");
  c.ellipse(48,179,10,5,"K");c.ellipse(48,176,8,4,"I");c.ellipse(48,175,4,2,"G");
  c.ellipse(69,179,10,5,"K");c.ellipse(69,176,8,4,"w");c.ellipse(69,175,4,2,"g");
  rect(c,83,164,14,20,"K");rect(c,85,166,10,16,"d");rect(c,86,169,8,8,"U");
  rect(c,26,199,62,3,"D");c.hline(29,200,55,"m");

  // Menu board and hanging noren cloth on the right wall.
  rect(c,254,82,82,111,"K");rect(c,259,87,72,101,"D");
  rect(c,264,92,62,91,"A");rect(c,267,95,56,85,"z");
  rect(c,271,101,48,5,"L");rect(c,271,110,39,3,"u");
  rect(c,271,120,43,3,"u");rect(c,271,131,35,3,"u");
  rect(c,271,142,45,3,"u");rect(c,271,153,28,3,"u");
  rect(c,254,193,82,7,"K");rect(c,259,195,72,3,"L");
  // Little hanging cloth panels, with alternating indigo and cream stripes.
  rect(c,252,209,86,54,"K");rect(c,256,212,78,48,"A");
  for(let i=0;i<4;i++){
    const x=258+i*19;
    rect(c,x,215,15,40,i%2===0?"A":"B");
    c.hline(x,216,15,"L");
    for(let y=220;y<252;y+=8)c.hline(x+2,y,11,i%2===0?"b":"q");
  }
  rect(c,252,208,86,5,"M");rect(c,256,210,78,2,"u");

  // Hanging utensils and a small kitchen clock.
  rect(c,23,261,97,5,"K");rect(c,25,263,93,2,"L");
  for(let i=0;i<5;i++){
    const x=33+i*17;
    c.vline(x,267,22+i%2*5,"q");
    c.ellipse(x,291+i%2*5,4,6,"S");
    c.vline(x,270,15,"s");
  }
  c.ellipse(302,291,20,20,"K");c.ellipse(302,291,16,16,"I");
  c.ellipse(302,291,13,13,"w");c.vline(302,280,11,"D");c.hline(302,291,8,"D");
  c.px(302,289,"X");c.px(301,290,"X");

  // Kitchen exhaust flue, copper pans, ladles and a short noren over the prep pass.
  rect(c,55,300,36,40,"K");rect(c,59,304,28,34,"D");
  rect(c,65,293,16,15,"K");rect(c,68,287,10,11,"B");
  rect(c,71,280,4,11,"C");c.hline(67,279,12,"q");
  rect(c,146,302,88,6,"K");rect(c,149,304,82,3,"L");
  for(let i=0;i<3;i++){
    const x=157+i*24;
    c.vline(x,308,15,"q");c.ellipse(x,325,7,8,"K");
    c.ellipse(x,323,5,6,i===1?"J":"s");
    c.px(x,320,"F");c.vline(x,331,7,"D");
  }
  rect(c,239,310,92,7,"K");rect(c,242,312,86,3,"M");
  // Hanging indigo kitchen cloth with weighted lower hems.
  for(let i=0;i<4;i++){
    const x=245+i*21;
    rect(c,x,318,17,27,"K");rect(c,x+2,320,13,22,i%2===0?"A":"B");
    c.hline(x+2,321,13,"L");c.hline(x+3,340,11,"q");
  }
  // Spice shelf: ceramic jars, tea canisters and a small sake flask.
  rect(c,245,357,91,7,"K");rect(c,248,359,85,3,"L");
  rect(c,252,339,13,18,"K");rect(c,254,341,9,14,"W");
  rect(c,273,344,15,13,"K");rect(c,275,346,11,9,"e");
  rect(c,296,337,12,20,"K");rect(c,298,339,8,16,"T");
  rect(c,316,345,13,12,"K");rect(c,318,347,9,8,"J");
  c.hline(251,343,14,"g");c.px(278,347,"Y");c.px(300,342,"t");

  // Stove niche, iron range and stock pot with lid.
  rect(c,20,337,116,94,"K");rect(c,25,342,106,83,"D");
  rect(c,30,347,96,72,"B");rect(c,34,351,88,64,"z");
  rect(c,38,394,80,20,"K");rect(c,42,397,72,13,"H");
  rect(c,49,408,58,6,"M");c.hline(52,409,52,"L");
  rect(c,48,364,57,37,"K");rect(c,53,368,47,29,"S");
  rect(c,56,370,41,24,"C");rect(c,60,372,33,18,"s");
  c.ellipse(76,371,22,5,"K");c.ellipse(76,369,18,4,"q");c.ellipse(76,368,13,2,"J");
  rect(c,69,357,14,5,"D");rect(c,72,354,8,4,"M");
  rect(c,43,386,6,8,"B");rect(c,102,386,6,8,"B");
  c.ellipse(76,388,8,3,"Y");c.hline(70,388,12,"j");
  // Firebox with warm embers.
  rect(c,53,399,45,10,"K");rect(c,57,401,37,6,"D");
  c.px(65,403,"X");c.px(73,402,"Y");c.px(82,404,"e");c.px(89,403,"J");

  // Long serving counter, dark timber edge, worn grain and repeated front panels.
  rect(c,9,428,229,112,"K");rect(c,14,434,219,17,"D");
  rect(c,17,437,213,10,"M");c.hline(19,438,207,"L");
  for(let x=21;x<229;x+=36){
    rect(c,x,451,4,83,"D");rect(c,x+5,451,27,83,"m");
    rect(c,x+7,456,22,72,"d");
    c.vline(x+10,460,63,"M");
    c.hline(x+8,477,19,"L");c.hline(x+8,511,19,"D");
  }
  rect(c,10,532,230,9,"K");rect(c,15,534,220,4,"L");
  // Counter top highlight and a small ceramic service rail.
  c.hline(14,432,219,"g");c.hline(18,449,211,"B");
  rect(c,16,421,218,8,"K");rect(c,19,423,212,4,"u");
  c.hline(21,424,208,"J");

  // Soba noodle board, rolling pin, knife and fresh noodle strands.
  rect(c,145,385,78,8,"K");rect(c,148,387,72,4,"J");
  rect(c,151,377,61,8,"D");rect(c,154,379,55,4,"L");
  for(let x=159;x<207;x+=6){c.vline(x,380,3,"g");c.px(x+1,379,"F");}
  rect(c,162,373,44,3,"K");c.hline(163,374,42,"G");
  rect(c,179,366,5,9,"D");rect(c,181,365,2,9,"s");
  rect(c,210,385,22,5,"K");rect(c,212,386,18,2,"s");
  // Flour dust and loose noodle loops.
  for(let i=0;i<38;i++){const x=151+(i*13)%70,y=371+(i*7)%15;c.px(x,y,i%3===0?"F":"g");}
  c.ellipse(202,382,10,3,"I");c.ellipse(202,381,7,2,"F");

  // Bowls, tea kettle, soy and spice bottles on the pass.
  c.ellipse(40,417,13,7,"K");c.ellipse(40,414,11,5,"I");c.ellipse(40,413,7,2,"Y");
  c.ellipse(76,417,12,7,"K");c.ellipse(76,414,10,5,"e");c.ellipse(76,413,6,2,"J");
  rect(c,105,409,13,20,"K");rect(c,108,411,7,15,"w");rect(c,109,413,5,9,"L");
  rect(c,123,409,10,19,"K");rect(c,125,411,6,15,"T");rect(c,126,414,4,9,"t");
  rect(c,139,411,8,17,"K");rect(c,141,413,4,13,"X");
  rect(c,25,407,5,18,"D");rect(c,27,404,2,4,"M");
  rect(c,224,409,8,19,"K");rect(c,226,411,4,15,"R");

  // Rice tub, flour sack and stacked zaru baskets beneath the prep counter.
  rect(c,254,450,52,60,"K");rect(c,258,454,44,52,"D");
  rect(c,262,458,36,42,"M");rect(c,265,461,30,35,"m");
  c.hline(263,462,32,"L");c.hline(263,489,32,"D");
  rect(c,271,447,18,7,"K");rect(c,273,448,14,4,"J");
  c.ellipse(279,459,12,3,"g");c.ellipse(279,457,9,2,"F");
  rect(c,310,464,27,43,"K");rect(c,313,467,21,37,"W");
  c.ellipse(323,468,11,4,"I");c.ellipse(323,466,8,2,"F");
  for(let y=474;y<499;y+=5)c.hline(316,y,14,"w");
  c.ellipse(326,512,12,3,"K");c.ellipse(326,510,9,2,"s");
  c.ellipse(326,501,12,3,"K");c.ellipse(326,499,9,2,"q");
  c.ellipse(326,490,12,3,"K");c.ellipse(326,488,9,2,"S");

  // A small dining table and bench sit in front-right of the room.
  rect(c,245,556,100,14,"K");rect(c,250,558,90,8,"M");
  for(let x=254;x<339;x+=15)c.vline(x,559,5,"L");
  rect(c,257,571,8,59,"D");rect(c,323,571,8,59,"D");
  rect(c,246,628,98,7,"K");rect(c,251,630,88,3,"L");
  // Tea cup and a tiny tray.
  c.ellipse(289,550,11,5,"K");c.ellipse(289,548,9,4,"I");c.ellipse(289,547,5,2,"G");
  rect(c,304,548,18,4,"K");rect(c,306,549,14,2,"u");
  rect(c,266,543,5,9,"D");rect(c,268,541,3,3,"M");

  // Wooden floor with plank seams, tatami edging and scuffed traffic wear.
  rect(c,10,545,340,244,"K");
  rect(c,14,550,332,235,"d");
  for(let y=554;y<785;y+=24){
    rect(c,15,y,330,2,"K");
    c.hline(17,y+2,326,"M");
    for(let x=22+(y%3)*13;x<338;x+=58){
      c.vline(x,y+4,17,"D");
      c.vline(x+1,y+5,15,"m");
    }
  }
  // Tatami runner rug in front of the kitchen.
  rect(c,22,666,215,88,"K");rect(c,27,671,205,78,"T");
  rect(c,31,675,197,70,"t");
  for(let x=36;x<225;x+=11){
    rect(c,x,678,2,64,"T");
    c.vline(x+1,680,60,"L");
  }
  rect(c,22,666,215,7,"D");rect(c,22,747,215,7,"D");
  rect(c,24,675,5,66,"J");rect(c,230,675,5,66,"J");

  // Scattered floor reflections and small wood wear marks.
  for(let i=0;i<180;i++){
    const x=16+(i*37)%328,y=558+(i*53)%225;
    if(i%4===0)c.px(x,y,"L");
    else if(i%7===0)c.px(x,y,"s");
    else if(i%11===0)c.px(x,y,"D");
  }
  // Footwear scuffs and a little threshold highlight.
  c.hline(14,786,332,"K");c.hline(18,783,324,"L");
});

// 2.5-head chibi soba cook: bold readable silhouette, rounded face, small hands and a clear chef cap.
anim("daily_login_chef_idle",{w:64,h:96,frames:4,fps:5},c=>{
  const frame=c.frame%4;
  const bob=[0,1,0,-1][frame];
  const hand=[0,1,2,1][frame];
  c.ellipse(32,92,17,2,"K");

  // Shoes and short legs.
  rect(c,22,79+bob,9,7,"K");rect(c,24,80+bob,5,4,"D");
  rect(c,34,79+bob,9,7,"K");rect(c,35,80+bob,5,4,"D");
  c.hline(20,85+bob,12,"H");c.hline(33,85+bob,12,"H");
  c.px(22,85+bob,"L");c.px(35,85+bob,"L");

  // Jacket body and sleeves.
  rect(c,17,52+bob,30,29,"H");
  rect(c,19,54+bob,26,25,"N");
  rect(c,21,55+bob,21,22,"W");
  rect(c,16,57+bob,8,18,"H");rect(c,18,59+bob,6,13,"N");
  rect(c,41,56+bob,8,18,"H");rect(c,43,58+bob,5,13,"N");
  c.hline(20,56+bob,23,"F");
  line(c,31,57+bob,26,68+bob,"n");line(c,32,57+bob,38,68+bob,"f");
  rect(c,27,69+bob,10,4,"D");c.hline(28,70+bob,8,"L");

  // Apron, waist ties and small embroidered mark.
  rect(c,21,67+bob,23,17,"H");rect(c,23,69+bob,19,13,"E");
  rect(c,25,70+bob,15,10,"e");c.hline(24,70+bob,16,"x");
  rect(c,18,66+bob,7,3,"D");rect(c,40,66+bob,7,3,"D");
  c.px(32,74+bob,"F");c.px(33,74+bob,"J");
  c.hline(26,81+bob,13,"H");

  // Neck, soft jaw and round face.
  rect(c,27,48+bob,10,8,"H");rect(c,29,49+bob,6,6,"V");
  c.ellipse(32,35+bob,17,17,"H");
  c.ellipse(32,35+bob,15,15,"V");
  c.ellipse(32,39+bob,13,10,"v");
  c.ellipse(28,32+bob,8,8,"V");c.ellipse(37,32+bob,8,8,"V");
  // Hair framing the face and peeking from beneath the cap.
  rect(c,17,25+bob,7,20,"H");rect(c,19,27+bob,4,15,"h");
  rect(c,40,25+bob,7,20,"H");rect(c,41,27+bob,4,15,"h");
  rect(c,20,19+bob,24,9,"H");
  rect(c,22,20+bob,19,5,"h");
  c.px(23,25+bob,"H");c.px(28,27+bob,"H");c.px(37,26+bob,"H");
  // Big, clear eyes with warm highlights and small blush pixels.
  rect(c,22,35+bob,4,5,"H");rect(c,38,35+bob,4,5,"H");
  c.px(23,35+bob,"F");c.px(39,35+bob,"F");
  c.px(24,39+bob,"V");c.px(40,39+bob,"V");
  c.hline(19,42+bob,5,"X");c.hline(40,42+bob,5,"X");
  c.px(30,46+bob,"H");c.hline(31,47+bob,3,"H");
  c.px(31,48+bob,"x");c.px(32,48+bob,"X");

  // Tall white chef cap with a folded band and a small knot.
  rect(c,17,11+bob,30,11,"H");
  rect(c,20,6+bob,24,13,"F");
  rect(c,22,8+bob,20,9,"N");
  rect(c,17,17+bob,30,6,"H");
  rect(c,19,18+bob,26,3,"f");
  rect(c,21,18+bob,22,2,"F");
  c.hline(24,9+bob,15,"W");c.px(40,12+bob,"F");
  rect(c,29,3+bob,6,5,"H");rect(c,30,4+bob,4,3,"J");

  // Serving bowl in the left hand, with a steaming broth highlight.
  c.ellipse(12,65+bob,12,7,"H");c.ellipse(12,63+bob,10,5,"W");
  c.ellipse(12,62+bob,7,3,"G");c.hline(6,62+bob,12,"F");
  c.px(10,61+bob,"J");c.px(15,62+bob,"e");
  c.vline(7,69+bob,4,"D");c.vline(17,69+bob,4,"D");
  // Right hand and a short wooden ladle shift gently in the idle cycle.
  rect(c,45,66+bob-hand,8,7,"H");rect(c,47,67+bob-hand,5,4,"V");
  c.vline(51,50+bob-hand,19,"D");c.vline(52,51+bob-hand,16,"M");
  c.ellipse(51,49+bob-hand,4,3,"K");c.ellipse(51,48+bob-hand,3,2,"L");
  c.px(53,51+bob-hand,"J");
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
