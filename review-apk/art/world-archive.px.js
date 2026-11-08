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
