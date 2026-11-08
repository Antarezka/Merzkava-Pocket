// Merzkava Pocket — transparent appearance overlays only.
// No character body, hair, robe silhouette, or base animation is drawn here.
// All human anatomy and five-by-five wardrobe art comes from claude-today1.
const W=48,H=64,CX=24;
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const LAYER_PALETTE={K:"#1d1620",S:"#f0c19f",A:"#b9c3cc",C:"#615b86",D:"#3f3b5b",g:"#9b7a43",G:"#d5b477"};
const faceFront=dir=>["s","se","sw"].includes(dir);
const backView=dir=>["n","ne","nw"].includes(dir);
const sideView=dir=>dir==="e"||dir==="w";
const isLeft=dir=>["w","nw","sw"].includes(dir);
const rect=(c,x,y,w,h,k)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)c.px(xx,yy,k);};
const oval=(c,x,y,rx,ry,k)=>{for(let yy=-ry;yy<=ry;yy++)for(let xx=-rx;xx<=rx;xx++)if(xx*xx/(rx*rx)+yy*yy/(ry*ry)<=1)c.px(x+xx,y+yy,k);};
const line=(c,x1,y1,x2,y2,k)=>{const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)c.px(Math.round(x1+(x2-x1)*i/n),Math.round(y1+(y2-y1)*i/n),k);};
const faceFront=dir=>["s","se","sw"].includes(dir);
const backView=dir=>["n","ne","nw"].includes(dir);
const sideView=dir=>dir==="e"||dir==="w";
const isLeft=dir=>["w","nw","sw"].includes(dir);
const ACCESSORIES=[
 {id:"jade_pin",name:"Jade Hairpin",description:"A slim jade-and-gold hairpin.",layer:"front"},
 {id:"phoenix_comb",name:"Phoenix Comb",description:"A warm-gold comb with a small feather crest.",layer:"front"},
 {id:"cloth_headband",name:"Cloth Headband",description:"A practical wrapped forehead band.",layer:"front"},
 {id:"scholar_crown",name:"Scholar Crown",description:"A compact formal crown and finial.",layer:"front"},
 {id:"round_glasses",name:"Round Glasses",description:"Small round reading glasses.",layer:"front"},
 {id:"half_mask",name:"Half Mask",description:"A fitted lower-face travel mask.",layer:"front"},
 {id:"bead_tassel",name:"Bead Tassel",description:"A jade bead chain with a silk tassel.",layer:"front"},
 {id:"forehead_gem",name:"Forehead Gem",description:"A small centered spirit-gem ornament.",layer:"front"},
 {id:"moon_veil",name:"Moon Veil",description:"A light veil falling beside the face.",layer:"front"},
 {id:"travel_goggles",name:"Travel Goggles",description:"Leather-rimmed travel goggles.",layer:"front"},
 {id:"ribbon_bow",name:"Ribbon Bow",description:"A tied silk ribbon at the side of the hair.",layer:"front"},
 {id:"earring_chains",name:"Earring Chains",description:"Fine chains and small jade drops.",layer:"front"}
];
const WEAPONS=[
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
const drawAccessory=(c,id,dir,frame=0,move="idle")=>{
 const flip=isLeft(dir),front=faceFront(dir),back=backView(dir),side=sideView(dir);
 const mx=x=>flip?2*CX-x:x,p=(x,y,k)=>c.px(mx(x),y,k);
 const bob=move==="walk"?[0,-1,-1,0,0,-1,-1,0][frame%8]:[0,0,1,0][frame%4];
 const top=5+bob,hy=top+10,sway=move==="walk"?[0,0,1,1,0,-1,-1,0][frame%8]:0;
 if(id==="jade_pin"){
   line(c,mx(26),top+5,mx(34),top-1,"G");line(c,mx(26),top+6,mx(33),top+1,"g");oval(c,34,top-1,2,2,"A");
 }else if(id==="phoenix_comb"){
   line(c,mx(18),top+5,mx(30),top+4,"G");
   for(let i=0;i<4;i++){line(c,mx(21+i*2),top+4,mx(22+i*2),top,"g");p(22+i*2,top,"A");}
 }else if(id==="cloth_headband"){
   line(c,mx(14),top+8,mx(33),top+8,"K");line(c,mx(15),top+7,mx(32),top+7,"G");
   line(c,mx(31),top+8,mx(35+sway),top+14,"g");p(35+sway,top+15,"G");
 }else if(id==="scholar_crown"){
   line(c,mx(18),top+3,mx(30),top+3,"K");line(c,mx(19),top+2,mx(29),top+2,"G");
   line(c,mx(20),top+2,mx(20),top-2,"g");line(c,mx(24),top+2,mx(24),top-4,"G");
   line(c,mx(28),top+2,mx(28),top-2,"g");p(24,top-5,"A");
 }else if(id==="round_glasses"&&!back){
   for(const cx of (front?[19,29]:[flip?20:28])){
     for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
       const d=dx*dx+dy*dy;if(d>=7&&d<=11)p(cx+dx,hy+2+dy,"K");
     }
   }
   if(front)line(c,mx(22),hy+2,mx(26),hy+2,"K");
 }else if(id==="half_mask"&&!back&&!side){
   const y=hy+4;line(c,mx(17),y,mx(31),y,"K");line(c,mx(18),y+1,mx(30),y+1,"A");
   line(c,mx(19),y+2,mx(29),y+2,"g");p(24,y+1,"G");
 }else if(id==="bead_tassel"){
   line(c,mx(31),top+5,mx(35),top+11,"g");p(35,top+12,"A");p(35,top+14,"G");
   line(c,mx(35),top+15,mx(34+sway),top+20,"g");p(34+sway,top+21,"G");
 }else if(id==="forehead_gem"&&!back&&!side){
   p(24,hy-2,"G");p(23,hy-1,"A");p(24,hy-1,"G");p(25,hy-1,"g");p(24,hy,"G");
 }else if(id==="moon_veil"){
   line(c,mx(16),top+5,mx(13),top+18,"A");line(c,mx(13),top+18,mx(16+sway),top+27,"C");
   line(c,mx(32),top+5,mx(35),top+18,"A");line(c,mx(35),top+18,mx(32-sway),top+27,"C");
   if(front&&!side){p(16,top+13,"G");p(32,top+13,"G");}
 }else if(id==="travel_goggles"){
   line(c,mx(17),top+9,mx(31),top+9,"K");
   for(const cx of (front?[20,28]:[flip?20:28])){line(c,mx(cx-3),hy+1,mx(cx+3),hy+1,"D");p(cx,hy+1,"G");}
   line(c,mx(20),hy+4,mx(28),hy+4,"g");
 }else if(id==="ribbon_bow"){
   oval(c,34,top+8,3,2,"G");oval(c,29,top+7,3,2,"g");
   line(c,mx(32),top+9,mx(36+sway),top+17,"G");line(c,mx(33),top+9,mx(31-sway),top+16,"A");
   p(32,top+8,"K");
 }else if(id==="earring_chains"){
   if(!back){const x=flip?15:33;line(c,mx(x),hy+5,mx(x),hy+12,"G");p(x,hy+13,"A");p(x,hy+14,"G");
     if(front){line(c,mx(15),hy+4,mx(14),hy+9,"g");line(c,mx(33),hy+4,mx(34),hy+9,"g");}}
 }
};
const drawWeapon=(c,id,dir,frame=0,move="idle")=>{
 const flip=isLeft(dir),mx=x=>flip?2*CX-x:x,p=(x,y,k)=>c.px(mx(x),y,k);
 const sway=move==="walk"?[0,0,1,1,0,-1,-1,0][frame%8]:0;
 const top=5+(move==="walk"?[0,-1,-1,0,0,-1,-1,0][frame%8]:0),base=top+24;
 const shaft=(x1,y1,x2,y2,edge="K",core="G")=>{line(c,mx(x1),y1,mx(x2),y2,edge);line(c,mx(x1)+1,y1,mx(x2)+1,y2,core);};
 if(id==="straight_sword"){
   shaft(16,base-7,31,base+23,"K","A");line(c,mx(15),base-8,mx(18),base-4,"G");
   line(c,mx(12),base-6,mx(20),base-2,"G");p(31,base+23,"G");
 }else if(id==="crescent_dao"){
   const x=34+sway;shaft(x,base-2,x,base+19,"K","g");line(c,mx(x-4),base+1,mx(x+4),base+1,"G");
   line(c,mx(x),base-2,mx(x+4),base-7,"A");line(c,mx(x+4),base-7,mx(x+2),base-13,"G");
   line(c,mx(x+2),base-13,mx(x-2),base-8,"A");p(x,base-1,"D");
 }else if(id==="twin_blades"){
   shaft(14,base-2,19,base+18,"K","A");shaft(34,base-2,29,base+18,"K","A");
   line(c,mx(12),base-4,mx(21),base-1,"G");line(c,mx(27),base-1,mx(36),base-4,"G");
 }else if(id==="spear"){
   shaft(34+sway,top+7,31+sway,61,"K","D");line(c,mx(34+sway),top+7,mx(37+sway),top+1,"K");
   line(c,mx(37+sway),top+1,mx(31+sway),top+1,"G");line(c,mx(31+sway),top+1,mx(34+sway),top+7,"A");
 }else if(id==="jade_staff"){
   shaft(15-sway,top+7,18-sway,61,"K","g");oval(c,15-sway,top+5,3,4,"K");oval(c,15-sway,top+4,2,2,"A");p(15-sway,top+3,"G");
 }else if(id==="recurve_bow"){
   line(c,mx(15),top+8,mx(10),base+4,"K");line(c,mx(10),base+4,mx(14),61,"G");line(c,mx(15),top+8,mx(21),base+4,"K");
   line(c,mx(15),top+8,mx(15),61,"A");line(c,mx(10),base+4,mx(15),61,"g");
 }else if(id==="war_fan"){
   const x=35+sway,y=base+1;line(c,mx(x),y,mx(x-5),y-7,"K");line(c,mx(x),y,mx(x+5),y-7,"K");
   line(c,mx(x-5),y-7,mx(x+5),y-7,"G");for(let k=-4;k<=4;k+=2)line(c,mx(x),y,mx(x+k),y-6,"A");p(x,y,"g");
 }else if(id==="closed_umbrella"){
   shaft(34+sway,top+5,32+sway,61,"K","D");
   line(c,mx(29+sway),top+8,mx(34+sway),top+1,"K");line(c,mx(34+sway),top+1,mx(39+sway),top+8,"K");
   line(c,mx(29+sway),top+8,mx(39+sway),top+8,"G");line(c,mx(32+sway),top+3,mx(36+sway),top+7,"A");
 }else if(id==="short_sword"){
   shaft(35+sway,base+1,33+sway,base+17,"K","A");line(c,mx(29+sway),base+2,mx(38+sway),base+2,"G");
   line(c,mx(33+sway),base-1,mx(36+sway),base-5,"K");p(33+sway,base+17,"G");
 }else if(id==="moon_polearm"){
   shaft(13-sway,top+7,18-sway,61,"K","D");line(c,mx(13-sway),top+8,mx(7-sway),top+2,"K");
   line(c,mx(7-sway),top+2,mx(5-sway),top+9,"G");line(c,mx(5-sway),top+9,mx(11-sway),top+14,"A");
   line(c,mx(11-sway),top+14,mx(13-sway),top+8,"K");
 }else if(id==="scroll_case"){
   rect(c,9,base-1,5,18,"K");rect(c,10,base,3,16,"D");line(c,mx(9),base+4,mx(14),base+4,"G");
   oval(c,11,base-1,3,2,"g");oval(c,11,base+17,3,2,"g");p(11,base+8,"A");
 }else if(id==="lantern_staff"){
   shaft(34+sway,top+10,32+sway,61,"K","g");rect(c,30+sway,top+5,7,9,"K");rect(c,31+sway,top+6,5,7,"G");
   line(c,mx(31+sway),top+8,mx(35+sway),top+8,"A");p(33+sway,top+9,"S");
 }
};
const OPT={w:W,h:H,pivot:[CX,62]};
pal(LAYER_PALETTE);
for(const item of ACCESSORIES){
  sprite("human_preview_accessory_"+item.id,OPT,c=>drawAccessory(c,item.id,"s",0,"idle"));
  for(const dir of DIRS){
    anim("accessory_"+item.id+"_idle_"+dir,{...OPT,frames:4,fps:3},c=>drawAccessory(c,item.id,dir,c.frame,"idle"));
    anim("accessory_"+item.id+"_walk_"+dir,{...OPT,frames:8,fps:10},c=>drawAccessory(c,item.id,dir,c.frame,"walk"));
  }
}
for(const item of WEAPONS){
  sprite("human_preview_weapon_"+item.id,OPT,c=>drawWeapon(c,item.id,"s",0,"idle"));
  for(const dir of DIRS){
    anim("weapon_"+item.id+"_idle_"+dir,{...OPT,frames:4,fps:3},c=>drawWeapon(c,item.id,dir,c.frame,"idle"));
    anim("weapon_"+item.id+"_walk_"+dir,{...OPT,frames:8,fps:10},c=>drawWeapon(c,item.id,dir,c.frame,"walk"));
  }
}
