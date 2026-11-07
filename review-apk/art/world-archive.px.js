// Merzkava Pocket — World Archive Home Base asset source.
// Compiled by Augusto PXL during the Android build. All names and visual styles are original to Pocket.
const W = 22, H = 30;
const DIRS = ["n","ne","e","se","s","sw","w","nw"];
const STYLES = [
  { id:"chibi", head:10, headH:9, torso:7, torsoH:6, robe:false, detail:0 },
  { id:"classic", head:8, headH:7, torso:8, torsoH:8, robe:false, detail:1 },
  { id:"slim", head:7, headH:7, torso:7, torsoH:9, robe:true, detail:1 },
  { id:"ornate", head:8, headH:7, torso:9, torsoH:8, robe:true, detail:2 },
  { id:"painterly", head:9, headH:8, torso:8, torsoH:8, robe:false, detail:3 }
];
const drawRect=(c,x,y,w,h,k)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)c.px(xx,yy,k);};
const oval=(c,cx,cy,rx,ry,k)=>{for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if(x*x/(rx*rx)+y*y/(ry*ry)<=1)c.px(cx+x,cy+y,k);};
const drawLine=(c,x1,y1,x2,y2,k)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)c.px(Math.round(x1+(x2-x1)*i/n),Math.round(y1+(y2-y1)*i/n),k);};
function drawCharacter(c,style,dir,move,frame=0){
  const front=["s","se","sw"].includes(dir),back=["n","ne","nw"].includes(dir),side=!front&&!back;
  const left=["w","nw","sw"].includes(dir),fx=x=>left?W-1-x:x;
  const walking=move==="walk",step=walking?[0,1,2,1][frame%4]:0,bob=walking?[0,1,0,1][frame%4]:(frame%4===1?1:0);
  const cx=10,headTop=2+bob,headW=style.head,headH=style.headH;
  oval(c,10,28,5,1,"K");
  const bodyY=headTop+headH,legTop=bodyY+style.torsoH+1,legShift=walking?(step===1?1:step===2?-1:0):0;
  drawRect(c,fx(8+legShift),legTop,3,Math.max(2,27-legTop),"D");
  drawRect(c,fx(12-legShift),legTop+(walking&&step===2?1:0),3,Math.max(2,27-legTop),"D");
  drawRect(c,fx(7+legShift),26,4,2,"B");drawRect(c,fx(12-legShift),26,4,2,"B");
  const tw=style.torso,tl=cx-Math.floor(tw/2);
  drawRect(c,fx(tl-1),bodyY,tw+2,style.torsoH+1,"K");
  drawRect(c,fx(tl),bodyY,tw,style.torsoH,"d");
  drawRect(c,fx(tl+1),bodyY+1,Math.max(2,tw-2),Math.max(2,style.torsoH-2),"c");
  drawRect(c,fx(tl+1),bodyY+1,1,Math.max(2,style.torsoH-2),"C");
  const armY=bodyY+2+(walking&&step%2?1:0);
  drawRect(c,fx(tl-2),armY,2,4,"K");drawRect(c,fx(tl-1),armY,1,3,"C");
  drawRect(c,fx(tl+tw),armY,2,4,"K");drawRect(c,fx(tl+tw),armY,1,3,"c");
  c.px(fx(tl-1),armY+4,"s");c.px(fx(tl+tw),armY+4,"s");
  if(style.robe){
    drawRect(c,fx(tl-1),bodyY+style.torsoH-1,tw+2,2,"D");
    drawRect(c,fx(cx-1),bodyY+style.torsoH,2,2,"g");
    drawLine(c,fx(cx-2),bodyY+style.torsoH+1,fx(cx-4),27,"d");
    drawLine(c,fx(cx+2),bodyY+style.torsoH+1,fx(cx+4),27,"d");
  }else{drawRect(c,fx(tl),bodyY+style.torsoH-1,tw,1,"D");c.px(fx(cx),bodyY+style.torsoH-1,"g");}
  const cy=headTop+Math.floor(headH/2);
  oval(c,cx,cy,Math.floor(headW/2)+1,Math.floor(headH/2)+1,"K");
  oval(c,cx,cy,Math.floor(headW/2),Math.floor(headH/2),"s");
  oval(c,cx-1,cy-2,Math.floor(headW/2),Math.max(2,Math.floor(headH/2)-1),"h");
  drawRect(c,cx-Math.floor(headW/2),headTop+2,2,Math.max(2,headH-3),"h");
  drawRect(c,cx+Math.floor(headW/2)-1,headTop+2,2,Math.max(2,headH-3),"h");
  drawLine(c,cx-2,headTop+1,cx+2,headTop+1,"H");
  if(front){c.px(fx(cx-2),cy+1,"K");c.px(fx(cx+2),cy+1,"K");}
  else if(side)c.px(fx(left?cx-2:cx+2),cy+1,"K");
  if(style.id==="ornate"){drawRect(c,fx(cx-1),headTop-1,3,2,"g");c.px(fx(cx),headTop-2,"G");}
  if(style.id==="painterly"){c.px(fx(cx-3),headTop+3,"H");c.px(fx(cx+2),headTop+5,"h");c.px(fx(tl+2),bodyY+3,"C");c.px(fx(tl+tw-2),bodyY+5,"D");}
  if(style.id==="slim"||style.id==="ornate")c.px(fx(cx),bodyY+2,"g");
  if(style.detail>1){c.px(fx(tl+1),bodyY+5,"C");c.px(fx(tl+tw-2),bodyY+6,"d");}
}
const palettes={
  chibi:{K:"#18201f",s:"#d69c7a",S:"#f4c9a6",h:"#382a2d",H:"#725044",c:"#496d62",C:"#88a88a",d:"#29443e",D:"#b08a55",B:"#54443b",g:"#ddbd72",G:"#f1df9b"},
  classic:{K:"#17201f",s:"#bd8063",S:"#eab28d",h:"#302b30",H:"#66505a",c:"#46636f",C:"#7894a0",d:"#293c4c",D:"#c0a06a",B:"#493b34",g:"#d9bd83",G:"#f2d99e"},
  slim:{K:"#182020",s:"#d7a27e",S:"#f0c5a0",h:"#26282d",H:"#5b5150",c:"#5d584c",C:"#a19372",d:"#39372f",D:"#c6a16a",B:"#423b35",g:"#c69c55",G:"#f0d18d"},
  ornate:{K:"#171c20",s:"#d59b77",S:"#f3c39c",h:"#29232a",H:"#68505a",c:"#693e50",C:"#ac6877",d:"#3b293b",D:"#c7a36a",B:"#40363a",g:"#dcba70",G:"#f4dfab"},
  painterly:{K:"#171c1b",s:"#c78e70",S:"#edbb98",h:"#332a26",H:"#8b6749",c:"#5b665b",C:"#a0a77c",d:"#35423d",D:"#c49b61",B:"#4c4036",g:"#dfbd76",G:"#f5e4aa"}
};
for(const style of STYLES){
  pal(palettes[style.id]);
  sprite("style_preview_"+style.id,{w:W,h:H,pivot:[10,28]},c=>drawCharacter(c,style,"s","idle",2));
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
const TERRAIN=["ggggggggggww","gggggggggwww","ggppggggwwww","gppppgggwwwg","gpppggggwwgg","ggppggggwggg","gggggggwwggg","ggggggwwgggg","ggggggwggggg","gggggggggggg"];
scene("home_base_map",{w:400,h:260,bg:"#19251f"},c=>{
  for(let row=0;row<TERRAIN.length;row++)for(let col=0;col<TERRAIN[row].length;col++){
    const kind=TERRAIN[row][col],x=200+(col-row)*16,y=20+(col+row)*8;
    if(kind==="w")isoDiamond(c,x,y,"w","W","#245c69",col+row);
    else if(kind==="p")isoDiamond(c,x,y,"W","B","#245c69",col+row);
    else if(kind==="d")isoDiamond(c,x,y,"d","D","r",col+row);
    else if(kind==="s")isoDiamond(c,x,y,"s","S","D",col+row);
    else{const top=(col*7+row*3)%5===0?"G":"g";isoDiamond(c,x,y,top,"L","h",col+row);if((col*3+row*5)%7===0){c.px(x-8,y+7,"L");c.px(x-7,y+6,"G");}if((col*11+row*2)%9===0)c.px(x+6,y+10,"H");}
  }
  for(const [col,row] of [[4,7],[5,7],[5,6],[5,5],[4,5]]){const x=200+(col-row)*16,y=20+(col+row)*8;isoDiamond(c,x,y,"s","S","D",col+row);c.hline(x-3,y+7,6,"S");}
  for(const [x,y] of [[94,83],[109,100],[127,112],[320,93],[337,109],[351,127],[330,155],[310,170]]){c.vline(x,y,4,"H");c.px(x+1,y-1,"L");c.px(x-2,y+2,"G");}
  for(const [x,y] of [[109,128],[128,135],[337,179],[350,166],[304,111]]){c.ellipse(x,y,3,2,"D");c.px(x-1,y-1,"S");}
  for(let i=0;i<30;i++){const x=25+(i*47)%350,y=35+(i*29)%185;if(i%3===0){c.px(x,y,"L");c.px(x+1,y-1,"G");}else if(i%3===1){c.px(x,y,"H");c.px(x+1,y,"g");}}
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
