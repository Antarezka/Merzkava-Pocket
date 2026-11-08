// Merzkava Pocket — Human Chibi Character Base.
// HARD VISUAL REFERENCE: Cotienlo pixel-cluster finish, human anatomy only.
// 48x64 px cell, eight directions, no animal ears and no tail.
// Editable source: Augusto Carvalho pxl (.px.js).
const W=48,H=64,CX=24;
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const HAIR=[
 {id:"long_black",name:"Long Straight",kind:0},
 {id:"soft_bob",name:"Soft Bob",kind:1},
 {id:"half_up",name:"Half-up Knot",kind:2},
 {id:"high_tie",name:"High Tie",kind:3},
 {id:"long_waves",name:"Long Waves",kind:4}
];
const OUTFITS=[
 {id:"black_hanfu",name:"Black Hanfu",shape:0},
 {id:"ivory_layers",name:"Ivory Layers",shape:1},
 {id:"jade_scholar",name:"Jade Scholar",shape:2},
 {id:"rose_ceremony",name:"Rose Ceremony",shape:3},
 {id:"traveller_robe",name:"Traveller Robe",shape:4}
];
const OUTFIT_PALETTES={
 black_hanfu:{K:"#15171d",c:"#242833",C:"#3b414d",d:"#171c27",D:"#363e4c",g:"#9d7945",G:"#d5b477",a:"#65727b",A:"#abb6b1"},
 ivory_layers:{K:"#49423d",c:"#d4cdbd",C:"#f0e9d8",d:"#b5ad9e",D:"#e7dfcb",g:"#6d8b7e",G:"#a8c1ab",a:"#8f7d6a",A:"#c9bda8"},
 jade_scholar:{K:"#202d2a",c:"#405c51",C:"#789381",d:"#293f39",D:"#5e7d6c",g:"#9d8351",G:"#d3b87c",a:"#526d64",A:"#a8baa2"},
 rose_ceremony:{K:"#3d2a32",c:"#79505d",C:"#b37b83",d:"#573744",D:"#9a606f",g:"#ae8a58",G:"#e1c48e",a:"#ac9290",A:"#e0c2b3"},
 traveller_robe:{K:"#302a22",c:"#5b4d39",C:"#9b8158",d:"#403d30",D:"#786b49",g:"#a1814b",G:"#d2b779",a:"#637061",A:"#a8b098"}
};
const PALETTE=outfit=>({
 K:"#292126",s:"#c98969",S:"#edb695",T:"#a96755",
 h:"#201b21",H:"#4c3d42",I:"#8b7270",
 ...OUTFIT_PALETTES[outfit]
});
const rect=(c,x,y,w,h,k)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)c.px(xx,yy,k);};
const oval=(c,x,y,rx,ry,k)=>{for(let yy=-ry;yy<=ry;yy++)for(let xx=-rx;xx<=rx;xx++)if(xx*xx/(rx*rx)+yy*yy/(ry*ry)<=1)c.px(x+xx,y+yy,k);};
const line=(c,x1,y1,x2,y2,k)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)c.px(Math.round(x1+(x2-x1)*i/n),Math.round(y1+(y2-y1)*i/n),k);};
const faceFront=dir=>["s","se","sw"].includes(dir);
const backView=dir=>["n","ne","nw"].includes(dir);
const sideView=dir=>dir==="e"||dir==="w";
const isLeft=dir=>["w","nw","sw"].includes(dir);
function drawHair(c,hair,back,side,flip,top,bob){
 const mx=x=>flip?2*CX-x:x;
 const p=(x,y,k)=>c.px(mx(x),y,k);
 // Rounded cap first: no pointed animal-ear silhouettes.
 oval(c,CX,top+8,11,10,"K");
 oval(c,CX,top+7,10,9,"h");
 oval(c,CX-1,top+5,8,4,"H");
 line(c,mx(CX-5),top+4,mx(CX-1),top+2,"I");
 if(back||side){
   oval(c,CX,top+10,10,8,"h");
   line(c,mx(CX-7),top+6,mx(CX+5),top+5,"H");
 }
 if(hair.kind===0){
   // Long, straight hair: paired broad locks to the upper waist.
   rect(c,mx(CX-11),top+10,3,16,"K");rect(c,mx(CX+9),top+10,3,16,"K");
   rect(c,mx(CX-10),top+11,2,14,"h");rect(c,mx(CX+9),top+11,2,14,"h");
   line(c,mx(CX-9),top+17,mx(CX-9),top+24,"H");
   line(c,mx(CX+10),top+16,mx(CX+10),top+23,"H");
   if(back){rect(c,mx(CX-7),top+15,14,13,"h");line(c,mx(CX-5),top+19,mx(CX+4),top+26,"H");}
 }else if(hair.kind===1){
   // Rounded short bob; clustered rounded ends, not thin strands.
   rect(c,mx(CX-11),top+10,3,10,"K");rect(c,mx(CX+9),top+10,3,10,"K");
   rect(c,mx(CX-10),top+11,2,8,"h");rect(c,mx(CX+9),top+11,2,8,"h");
   oval(c,CX-9,top+19,3,3,"h");oval(c,CX+9,top+19,3,3,"h");
   p(CX-9,top+18,"H");p(CX+9,top+18,"H");
   if(back)oval(c,CX,top+16,9,7,"h");
 }else if(hair.kind===2){
   // Half-up knot: compact gathered volume, no protruding ear shapes.
   oval(c,CX,top+1,4,3,"K");oval(c,CX,top+1,3,2,"H");
   rect(c,mx(CX-11),top+10,3,18,"K");rect(c,mx(CX+9),top+10,3,18,"K");
   rect(c,mx(CX-10),top+11,2,16,"h");rect(c,mx(CX+9),top+11,2,16,"h");
   line(c,mx(CX+4),top+12,mx(CX+8),top+19,"H");
   if(back){oval(c,CX,top+15,8,8,"h");line(c,mx(CX-5),top+19,mx(CX+5),top+26,"H");}
 }else if(hair.kind===3){
   // High tied hair with a short tied fall behind the head.
   oval(c,CX,top+1,5,4,"K");oval(c,CX,top+1,4,3,"h");
   p(CX,top-1,"I");
   rect(c,mx(CX-10),top+10,3,15,"K");rect(c,mx(CX+8),top+10,3,15,"K");
   rect(c,mx(CX-9),top+11,2,13,"h");rect(c,mx(CX+8),top+11,2,13,"h");
   line(c,mx(CX+3),top+3,mx(CX+6),top+9,"H");
   if(back){line(c,mx(CX+1),top+8,mx(CX+6),top+21,"h");}
 }else{
   // Long grouped waves with stepped, alternating locks.
   rect(c,mx(CX-11),top+10,3,17,"K");rect(c,mx(CX+9),top+10,3,17,"K");
   line(c,mx(CX-10),top+17,mx(CX-8),top+21,"h");
   line(c,mx(CX-8),top+21,mx(CX-10),top+25,"H");
   line(c,mx(CX+10),top+17,mx(CX+8),top+21,"h");
   line(c,mx(CX+8),top+21,mx(CX+10),top+26,"H");
   oval(c,CX-9,top+27,2,3,"h");oval(c,CX+9,top+28,2,3,"h");
   if(back){oval(c,CX,top+17,9,8,"h");line(c,mx(CX-5),top+19,mx(CX+5),top+27,"H");}
 }
}
function drawFringe(c,hair,dir,flip,top){
 const mx=x=>flip?2*CX-x:x;
 const p=(x,y,k)=>c.px(mx(x),y,k);
 if(back||sideView(dir))return;
 line(c,mx(CX-9),top+7,mx(CX-4),top+12,"h");
 line(c,mx(CX-4),top+7,mx(CX+1),top+13,"H");
 line(c,mx(CX+2),top+6,mx(CX+7),top+11,"h");
 p(CX-5,top+9,"I");p(CX+2,top+10,"H");
 if(hair.kind===2||hair.kind===3)p(CX,top+4,"G");
}
function drawOutfit(c,outfit,front,back,side,flip,bodyTop,phase){
 const mx=x=>flip?2*CX-x:x;
 const p=(x,y,k)=>c.px(mx(x),y,k);
 const h=(x,y,w,k)=>c.hline(flip?2*CX-x-w+1:x,y,w,k);
 const y0=bodyTop;
 const shape=outfit.shape;
 const baseHalf=shape===3?9:shape===1?8:shape===4?7:8;
 const flare=shape===3?6:shape===1?5:shape===4?4:6;
 // Long robe silhouette, laid down as stepped rows and a clean pixel hem.
 for(let y=y0+3;y<=61;y++){
   const f=(y-(y0+3))/(61-(y0+3));
   const half=baseHalf+Math.floor(f*flare);
   h(CX-half-1,y,2*half+2,"K");
   h(CX-half,y,2*half, (y%6===0)?"D":"c");
 }
 // Shoulders and wide sleeves: soft, layered masses with distinct cuffs.
 oval(c,CX-10,y0+7,6,5,"K");oval(c,CX+10,y0+7,6,5,"K");
 oval(c,CX-10,y0+7,5,4,"c");oval(c,CX+10,y0+7,5,4,"c");
 line(c,mx(CX-8),y0+6,mx(CX-17),y0+17,"K");
 line(c,mx(CX-17),y0+17,mx(CX-16),y0+23,"K");
 line(c,mx(CX+8),y0+6,mx(CX+17),y0+17,"K");
 line(c,mx(CX+17),y0+17,mx(CX+16),y0+23,"K");
 line(c,mx(CX-8),y0+7,mx(CX-15),y0+17,"C");
 line(c,mx(CX+8),y0+7,mx(CX+15),y0+17,"C");
 h(CX-18,y0+22,5,"D");h(CX+14,y0+22,5,"D");
 // Inner panel and back panel.
 if(back){
   rect(c,mx(CX-6),y0+5,12,23,"d");
   line(c,mx(CX-5),y0+8,mx(CX-1),y0+26,"D");
   line(c,mx(CX+5),y0+8,mx(CX+1),y0+26,"D");
 }else{
   // Crossed collar: broad panels, not a thin V-line.
   line(c,mx(CX-7),y0+1,mx(CX+1),y0+13,"K");
   line(c,mx(CX+7),y0+1,mx(CX-1),y0+13,"K");
   line(c,mx(CX-6),y0+2,mx(CX+1),y0+12,"C");
   line(c,mx(CX+6),y0+2,mx(CX-1),y0+12,"G");
   line(c,mx(CX+1),y0+12,mx(CX-3),y0+25,"D");
 }
 // Body-specific waist wrap and small knot.
 h(CX-8,y0+13,16, shape===0?"D":shape===3?"G":"g");
 h(CX-7,y0+14,14,"K");
 rect(c,mx(CX-2),y0+12,4,4,shape===0?"G":"D");
 p(CX,y0+14,"A");
 if(shape===0){
   // Black hanfu: ink-black outer robe, dark inner lapel, soft gold trim.
   line(c,mx(CX-2),y0+16,mx(CX-8),60,"D");
   line(c,mx(CX+2),y0+16,mx(CX+8),60,"G");
   h(CX-13,59,26,"G");h(CX-10,60,20,"K");
   p(CX-6,y0+19,"A");p(CX+6,y0+24,"D");
 }else if(shape===1){
   // Ivory layered robe with pale jade inner edge and warm cloth shadows.
   line(c,mx(CX-4),y0+15,mx(CX-10),60,"G");
   line(c,mx(CX+4),y0+15,mx(CX+10),60,"A");
   h(CX-13,59,26,"G");h(CX-10,60,20,"K");
   h(CX-5,y0+18,10,"A");
 }else if(shape===2){
   // Jade scholar: narrower sleeves, long straight panels, sash.
   line(c,mx(CX-3),y0+15,mx(CX-7),60,"G");
   line(c,mx(CX+3),y0+15,mx(CX+7),60,"A");
   h(CX-12,59,24,"G");h(CX-9,60,18,"K");
   line(c,mx(CX+5),y0+19,mx(CX+8),y0+28,"D");
 }else if(shape===3){
   // Rose ceremonial: broader outer mantle, layered collar and long hem bands.
   line(c,mx(CX-5),y0+14,mx(CX-12),60,"G");
   line(c,mx(CX+5),y0+14,mx(CX+12),60,"A");
   h(CX-15,58,30,"G");h(CX-13,60,26,"D");
   p(CX-9,y0+9,"A");p(CX+9,y0+9,"A");
 }else{
   // Traveller robe: asymmetric shoulder wrap, split lower panels, leather sash.
   line(c,mx(CX-4),y0+15,mx(CX-11),60,"D");
   line(c,mx(CX+5),y0+16,mx(CX+8),60,"A");
   line(c,mx(CX-8),y0+7,mx(CX-16),y0+21,"G");
   h(CX-12,59,24,"D");h(CX-9,60,18,"K");
   p(CX-8,y0+18,"G");
 }
 // Small hands peek below the sleeve line; tiny shoes remain under the robe hem.
 if(!back){
   rect(c,mx(CX-17),y0+22,3,4,"S");
   rect(c,mx(CX+15),y0+22,3,4,"S");
 }
 rect(c,mx(CX-7+phase),60,5,3,"K");
 rect(c,mx(CX+2-phase),60,5,3,"K");
 p(CX-5,62,"S");p(CX+5,62,"S");
}
function drawHuman(c,hair,outfit,dir,move,frame=0){
 const front=faceFront(dir),back=backView(dir),side=sideView(dir),flip=isLeft(dir);
 const bob=move==="walk"?[0,1,0,-1][frame%4]:[0,0,1,0][frame%4];
 const phase=move==="walk"?[0,1,0,-1][frame%4]:0;
 const top=5+bob;
 const headY=top+10;
 // Keep one shared ground anchor and head/body scale for all directions.
 oval(c,CX,62,11,2,"K");
 // Neck, short and mostly covered by the crossed collar.
 if(front||side)rect(c,CX-2,top+19,4,4,"S");
 const bodyTop=top+19;
 drawOutfit(c,outfit,front,back,side,flip,bodyTop,phase);
 // Head has a rounded human silhouette. No animal ears, horns or tail.
 drawHair(c,hair,back,side,flip,top,bob);
 oval(c,CX,headY,10,10,"K");
 if(back){
   oval(c,CX,headY,9,9,"h");
   oval(c,CX-1,headY-3,7,4,"H");
 }else{
   oval(c,CX,headY,9,9,"S");
   oval(c,CX-5,headY+2,3,5,"s");
   oval(c,CX+5,headY+2,3,5,"s");
   if(dir==="s"){
     const eyeY=headY+2;
     rect(c,CX-5,eyeY,2,3,"K");rect(c,CX+4,eyeY,2,3,"K");
     c.px(CX-4,eyeY,"A");c.px(CX+5,eyeY,"A");
     c.px(CX,headY+6,"T");
     c.px(CX-1,headY+7,"S");c.px(CX+1,headY+7,"S");
   }else if(side||dir==="se"||dir==="sw"){
     const eyeX=flip?CX-4:CX+4;
     rect(c,eyeX,headY+2,2,3,"K");
     c.px(flip?CX-5:CX+6,headY+6,"T");
   }
 }
 drawFringe(c,hair,dir,flip,top);
 if(move==="walk"){
   // Restrained arm swing and hem movement: no uncontrolled body wobble.
   c.px(flip?CX+17:CX-17,bodyTop+21+phase,"S");
   c.px(flip?CX-17:CX+17,bodyTop+22-phase,"S");
 }
}
function preview(hair,outfit,name){
 pal(PALETTE(outfit.id));
 sprite(name,{w:W,h:H,pivot:[CX,62]},c=>drawHuman(c,hair,outfit,"s","idle",0));
}
const baseHair=HAIR[0],baseOutfit=OUTFITS[0];
for(const hair of HAIR)preview(hair,baseOutfit,"human_preview_hair_"+hair.id);
for(const outfit of OUTFITS)preview(baseHair,outfit,"human_preview_outfit_"+outfit.id);
for(const hair of HAIR){
 for(const outfit of OUTFITS){
  pal(PALETTE(outfit.id));
  for(const dir of DIRS){
   const base="human_"+hair.id+"_"+outfit.id;
   anim(base+"_idle_"+dir,{w:W,h:H,frames:4,fps:3},c=>drawHuman(c,hair,outfit,dir,"idle",c.frame));
   anim(base+"_walk_"+dir,{w:W,h:H,frames:4,fps:8},c=>drawHuman(c,hair,outfit,dir,"walk",c.frame));
  }
 }
}
