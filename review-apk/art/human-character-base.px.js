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
 {id:"long_waves",name:"Long Waves",kind:4},
 {id:"braided_crown",name:"Braided Crown",kind:5},
 {id:"low_chignon",name:"Low Chignon",kind:6},
 {id:"side_ponytail",name:"Side Ponytail",kind:7},
 {id:"twin_braids",name:"Twin Braids",kind:8},
 {id:"scholar_topknot",name:"Scholar Topknot",kind:9}
];
const OUTFITS=[
 {id:"black_hanfu",name:"Black Hanfu",shape:0},
 {id:"ivory_layers",name:"Ivory Layers",shape:1},
 {id:"jade_scholar",name:"Jade Scholar",shape:2},
 {id:"rose_ceremony",name:"Rose Ceremony",shape:3},
 {id:"traveller_robe",name:"Traveller Robe",shape:4},
 {id:"crimson_sect",name:"Crimson Sect Coat",shape:5},
 {id:"moon_priest",name:"Moon Priest Mantle",shape:6},
 {id:"iron_guard",name:"Iron Guard Armour",shape:7},
 {id:"wanderer_cloak",name:"Wanderer Cloak",shape:8},
 {id:"azure_artificer",name:"Azure Artificer",shape:9}
];
const OUTFIT_PALETTES={
 black_hanfu:{K:"#15171d",c:"#242833",C:"#3b414d",d:"#171c27",D:"#363e4c",g:"#9d7945",G:"#d5b477",a:"#65727b",A:"#abb6b1"},
 ivory_layers:{K:"#49423d",c:"#d4cdbd",C:"#f0e9d8",d:"#b5ad9e",D:"#e7dfcb",g:"#6d8b7e",G:"#a8c1ab",a:"#8f7d6a",A:"#c9bda8"},
 jade_scholar:{K:"#202d2a",c:"#405c51",C:"#789381",d:"#293f39",D:"#5e7d6c",g:"#9d8351",G:"#d3b87c",a:"#526d64",A:"#a8baa2"},
 rose_ceremony:{K:"#3d2a32",c:"#79505d",C:"#b37b83",d:"#573744",D:"#9a606f",g:"#ae8a58",G:"#e1c48e",a:"#ac9290",A:"#e0c2b3"},
 traveller_robe:{K:"#302a22",c:"#5b4d39",C:"#9b8158",d:"#403d30",D:"#786b49",g:"#a1814b",G:"#d2b779",a:"#637061",A:"#a8b098"},
 crimson_sect:{K:"#321a25",c:"#642b3a",C:"#a64b51",d:"#40202b",D:"#813b46",g:"#a9844d",G:"#dfbd78",a:"#6f3d42",A:"#c18c73"},
 moon_priest:{K:"#3e3e4b",c:"#c4c6ce",C:"#eee9e2",d:"#858b9c",D:"#d9d7d6",g:"#a28f65",G:"#e8d9a9",a:"#8a9da2",A:"#d4e3dd"},
 iron_guard:{K:"#1f292e",c:"#485963",C:"#8b9ca2",d:"#283941",D:"#64777d",g:"#9b7749",G:"#d0ae70",a:"#586a66",A:"#aab6a8"},
 wanderer_cloak:{K:"#29251f",c:"#594a39",C:"#92785a",d:"#39362d",D:"#766348",g:"#9b7644",G:"#d0ad70",a:"#53665a",A:"#a3ae91"},
 azure_artificer:{K:"#1f2a36",c:"#38536b",C:"#7697a7",d:"#283746",D:"#597688",g:"#ae8950",G:"#e1c27c",a:"#638d89",A:"#b7d0c3"}
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
 }else if(hair.kind===4){
   // Long grouped waves with stepped, alternating locks.
   rect(c,mx(CX-11),top+10,3,17,"K");rect(c,mx(CX+9),top+10,3,17,"K");
   line(c,mx(CX-10),top+17,mx(CX-8),top+21,"h");
   line(c,mx(CX-8),top+21,mx(CX-10),top+25,"H");
   line(c,mx(CX+10),top+17,mx(CX+8),top+21,"h");
   line(c,mx(CX+8),top+21,mx(CX+10),top+26,"H");
   oval(c,CX-9,top+27,2,3,"h");oval(c,CX+9,top+28,2,3,"h");
   if(back){oval(c,CX,top+17,9,8,"h");line(c,mx(CX-5),top+19,mx(CX+5),top+27,"H");}
 }else if(hair.kind===5){
   // Braided crown: broad wrapped braid with small alternating knots.
   oval(c,CX,top+5,10,5,"K");oval(c,CX,top+5,8,3,"H");
   for(const [x,y] of [[-7,4],[-3,2],[2,2],[6,4]]){oval(c,CX+x,top+y,2,2,"h");p(CX+x,top+y-1,"I");}
   rect(c,mx(CX-10),top+11,3,15,"K");rect(c,mx(CX+8),top+11,3,15,"K");
   line(c,mx(CX-9),top+17,mx(CX-9),top+24,"H");
   if(back){oval(c,CX,top+15,9,8,"h");line(c,mx(CX-7),top+17,mx(CX+7),top+17,"H");}
 }else if(hair.kind===6){
   // Low chignon: compact rear coil with tidy side locks.
   oval(c,CX,top+15,7,6,"K");oval(c,CX,top+15,5,4,"h");oval(c,CX+1,top+16,3,2,"H");
   rect(c,mx(CX-10),top+10,3,12,"K");rect(c,mx(CX+8),top+10,3,12,"K");
   line(c,mx(CX-9),top+15,mx(CX-9),top+20,"H");
   if(!back){line(c,mx(CX-8),top+7,mx(CX-2),top+11,"h");line(c,mx(CX-2),top+7,mx(CX+5),top+11,"H");}
 }else if(hair.kind===7){
   // Side ponytail: tied volume and one long directional lock.
   oval(c,CX+7,top+7,5,4,"K");oval(c,CX+7,top+7,3,2,"H");
   rect(c,mx(CX-10),top+10,3,13,"K");rect(c,mx(CX+8),top+10,3,13,"K");
   line(c,mx(CX+8),top+11,mx(CX+13),top+18,"h");line(c,mx(CX+13),top+18,mx(CX+15),top+27,"H");
   oval(c,CX+15,top+28,2,3,"h");
   if(back){line(c,mx(CX-5),top+18,mx(CX+11),top+25,"H");}
 }else if(hair.kind===8){
   // Twin braids: two thick stepped plaits, separate from the sleeves.
   rect(c,mx(CX-11),top+10,3,17,"K");rect(c,mx(CX+9),top+10,3,17,"K");
   for(let y=17;y<=28;y+=3){p(CX-10,y,"H");p(CX-9,y+1,"h");p(CX+10,y,"H");p(CX+9,y+1,"h");}
   line(c,mx(CX-10),top+27,mx(CX-8),top+31,"K");line(c,mx(CX+10),top+27,mx(CX+8),top+31,"K");
   if(back){oval(c,CX,top+16,8,7,"h");}
 }else{
   // Scholar topknot: tied crown, nape fall and a narrow ornament pin.
   oval(c,CX,top+1,5,4,"K");oval(c,CX,top+1,3,2,"H");
   line(c,mx(CX-4),top-1,mx(CX+5),top+4,"I");
   rect(c,mx(CX-10),top+10,3,17,"K");rect(c,mx(CX+8),top+10,3,17,"K");
   line(c,mx(CX-9),top+16,mx(CX-9),top+25,"H");line(c,mx(CX+9),top+16,mx(CX+9),top+25,"H");
   line(c,mx(CX+1),top-3,mx(CX+8),top+2,"G");
   if(back){oval(c,CX,top+15,8,7,"h");line(c,mx(CX-4),top+19,mx(CX+4),top+27,"H");}
 }
}
function drawFringe(c,hair,dir,flip,top){
 const mx=x=>flip?2*CX-x:x;
 const p=(x,y,k)=>c.px(mx(x),y,k);
 if(backView(dir)||sideView(dir))return;
 line(c,mx(CX-9),top+7,mx(CX-4),top+12,"h");
 line(c,mx(CX-4),top+7,mx(CX+1),top+13,"H");
 line(c,mx(CX+2),top+6,mx(CX+7),top+11,"h");
 p(CX-5,top+9,"I");p(CX+2,top+10,"H");
 if(hair.kind===2||hair.kind===3)p(CX,top+4,"G");
}

// Appearance slots are separate PXL layers. Their frame canvas and ground
// pivot match the human body so Phaser can compose them without baking every
// accessory or weapon into every hair/outfit combination.
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

function drawOutfit(c,outfit,front,back,side,flip,bodyTop,motion={}){
 const mx=x=>flip?2*CX-x:x;
 const p=(x,y,k)=>c.px(mx(x),y,k);
 const h=(x,y,w,k)=>c.hline(flip?2*CX-x-w+1:x,y,w,k);
 const y0=bodyTop,shape=outfit.shape;
 const arm=motion.arm||0,hem=motion.hem||0;
 // One shared robe construction; clothing variants change silhouette and trim only.
 const baseHalf=shape===3||shape===6?9:shape===1||shape===7?8:shape===4||shape===5||shape===9?7:shape===8?10:8;
 const flare=shape===3||shape===6||shape===8?6:shape===1||shape===7?5:shape===4||shape===5||shape===9?4:6;
 for(let y=y0+3;y<=61;y++){
   const f=(y-(y0+3))/(61-(y0+3));
   const half=baseHalf+Math.floor(f*flare);
   h(CX-half-1,y,2*half+2,"K");
   h(CX-half,y,2*half,(y%6===0)?"D":"c");
 }
 // Sleeves swing in opposition to the legs without widening the shoulder base.
 oval(c,CX-10,y0+7,6,5,"K");oval(c,CX+10,y0+7,6,5,"K");
 oval(c,CX-10-arm,y0+7+Math.abs(arm),5,4,"c");
 oval(c,CX+10+arm,y0+7-Math.abs(arm),5,4,"c");
 line(c,mx(CX-8),y0+6,mx(CX-17-arm),y0+17,"K");
 line(c,mx(CX-17-arm),y0+17,mx(CX-16-arm),y0+23,"K");
 line(c,mx(CX+8),y0+6,mx(CX+17+arm),y0+17,"K");
 line(c,mx(CX+17+arm),y0+17,mx(CX+16+arm),y0+23,"K");
 line(c,mx(CX-8),y0+7,mx(CX-15-arm),y0+17,"C");
 line(c,mx(CX+8),y0+7,mx(CX+15+arm),y0+17,"C");
 h(CX-18-arm,y0+22,5,"D");h(CX+14+arm,y0+22,5,"D");
 if(back){
   rect(c,mx(CX-6),y0+5,12,23,"d");
   line(c,mx(CX-5),y0+8,mx(CX-1),y0+26,"D");
   line(c,mx(CX+5),y0+8,mx(CX+1),y0+26,"D");
 }else{
   line(c,mx(CX-7),y0+1,mx(CX+1),y0+13,"K");
   line(c,mx(CX+7),y0+1,mx(CX-1),y0+13,"K");
   line(c,mx(CX-6),y0+2,mx(CX+1),y0+12,"C");
   line(c,mx(CX+6),y0+2,mx(CX-1),y0+12,"G");
   line(c,mx(CX+1),y0+12,mx(CX-3),y0+25,"D");
 }
 h(CX-8,y0+13,16,shape===0?"D":shape===3?"G":"g");
 h(CX-7,y0+14,14,"K");
 rect(c,mx(CX-2),y0+12,4,4,shape===0?"G":"D");p(CX,y0+14,"A");
 if(shape===0){
   line(c,mx(CX-2),y0+16,mx(CX-8+hem),60,"D");
   line(c,mx(CX+2),y0+16,mx(CX+8+hem),60,"G");
   h(CX-13+hem,59,26,"G");h(CX-10+hem,60,20,"K");
   p(CX-6,y0+19,"A");p(CX+6,y0+24,"D");
 }else if(shape===1){
   line(c,mx(CX-4),y0+15,mx(CX-10+hem),60,"G");
   line(c,mx(CX+4),y0+15,mx(CX+10+hem),60,"A");
   h(CX-13+hem,59,26,"G");h(CX-10+hem,60,20,"K");
   h(CX-5,y0+18,10,"A");
 }else if(shape===2){
   line(c,mx(CX-3),y0+15,mx(CX-7+hem),60,"G");
   line(c,mx(CX+3),y0+15,mx(CX+7+hem),60,"A");
   h(CX-12+hem,59,24,"G");h(CX-9+hem,60,18,"K");
   line(c,mx(CX+5),y0+19,mx(CX+8),y0+28,"D");
 }else if(shape===3){
   line(c,mx(CX-5),y0+14,mx(CX-12+hem),60,"G");
   line(c,mx(CX+5),y0+14,mx(CX+12+hem),60,"A");
   h(CX-15+hem,58,30,"G");h(CX-13+hem,60,26,"D");
   p(CX-9,y0+9,"A");p(CX+9,y0+9,"A");
 }else{
   line(c,mx(CX-4),y0+15,mx(CX-11+hem),60,"D");
   line(c,mx(CX+5),y0+16,mx(CX+8+hem),60,"A");
   line(c,mx(CX-8),y0+7,mx(CX-16-arm),y0+21,"G");
   h(CX-12+hem,59,24,"D");h(CX-9+hem,60,18,"K");
   p(CX-8,y0+18,"G");
 }
 // Additional outfits have their own construction details, not palette swaps.
 if(shape===5){
   // Crimson sect coat: short jacket, split side panels and a trailing shoulder sash.
   h(CX-8,y0+17,16,"K");h(CX-7,y0+18,14,"C");
   line(c,mx(CX-5),y0+17,mx(CX-10+hem),y0+42,"G");
   line(c,mx(CX+5),y0+17,mx(CX+8+hem),y0+42,"A");
   h(CX-10+hem,y0+42,8,"K");h(CX+2+hem,y0+42,8,"K");
   line(c,mx(CX+8),y0+4,mx(CX+17+arm),y0+22,"K");
   line(c,mx(CX+17+arm),y0+22,mx(CX+13+arm),y0+39,"G");p(CX+12+arm,y0+39,"A");
   h(CX-4,y0+24,8,"G");
 }else if(shape===6){
   // Moon priest mantle: layered collar, hanging panels and a centered moon seal.
   oval(c,CX-10,y0+7,7,6,"K");oval(c,CX+10,y0+7,7,6,"K");
   oval(c,CX-10,y0+7,6,5,"C");oval(c,CX+10,y0+7,6,5,"A");
   line(c,mx(CX-7),y0+15,mx(CX-10+hem),60,"G");line(c,mx(CX+7),y0+15,mx(CX+10+hem),60,"A");
   h(CX-12+hem,59,24,"G");p(CX,y0+22,"G");p(CX-1,y0+23,"A");p(CX+1,y0+23,"G");
   line(c,mx(CX-3),y0+21,mx(CX+3),y0+21,"A");h(CX-3,y0+25,6,"G");
 }else if(shape===7){
   // Iron guard: raised shoulder plates, hard chest cuirass and segmented waist guards.
   oval(c,CX-12,y0+7,7,5,"K");oval(c,CX+12,y0+7,7,5,"K");
   oval(c,CX-12,y0+7,5,3,"A");oval(c,CX+12,y0+7,5,3,"C");
   h(CX-8,y0+7,16,"K");h(CX-7,y0+8,14,"A");h(CX-6,y0+10,12,"c");
   line(c,mx(CX-5),y0+9,mx(CX-1),y0+17,"G");line(c,mx(CX+5),y0+9,mx(CX+1),y0+17,"G");
   h(CX-9,y0+17,18,"K");h(CX-7,y0+18,14,"C");
   for(let x=-8;x<=6;x+=4){h(CX+x,y0+27,3,"K");h(CX+x,y0+28,2,"A");}
   h(CX-10,y0+31,20,"G");h(CX-9,y0+32,18,"d");
   line(c,mx(CX-15),y0+14,mx(CX-17),y0+25,"K");line(c,mx(CX+15),y0+14,mx(CX+17),y0+25,"K");
 }else if(shape===8){
   // Wanderer cloak: asymmetric shoulder fall with a weathered split outer edge.
   line(c,mx(CX-7),y0+3,mx(CX-16),y0+20,"K");line(c,mx(CX-16),y0+20,mx(CX-13+hem),60,"D");
   line(c,mx(CX-6),y0+5,mx(CX-11+hem),58,"G");h(CX-15+hem,58,7,"K");p(CX-12+hem,54,"A");
   line(c,mx(CX+7),y0+5,mx(CX+12),y0+20,"K");h(CX+7,y0+20,5,"g");
   rect(c,mx(CX+5),y0+14,4,8,"D");p(CX+7,y0+17,"G");
 }else if(shape===9){
   // Azure artificer: fitted tunic, apron panel and visible trouser line.
   h(CX-7,y0+24,14,"K");h(CX-6,y0+25,12,"A");
   h(CX-8,y0+28,16,"G");h(CX-7,y0+29,14,"D");
   line(c,mx(CX-5),y0+29,mx(CX-5),y0+43,"K");line(c,mx(CX+5),y0+29,mx(CX+5),y0+43,"K");
   h(CX-5,y0+43,10,"K");h(CX-4,y0+44,8,"g");
   rect(c,mx(CX-12),y0+23,4,8,"K");rect(c,mx(CX-11),y0+24,2,6,"G");
   rect(c,mx(CX+8),y0+24,4,7,"K");rect(c,mx(CX+9),y0+25,2,5,"A");
   h(CX-8,y0+18,16,"G");h(CX-7,y0+19,14,"K");
 }
 if(!back){
   rect(c,mx(CX-17-arm),y0+22+Math.max(0,arm),3,4,"S");
   rect(c,mx(CX+15+arm),y0+22+Math.max(0,-arm),3,4,"S");
 }
 // Alternating stride with one-pixel foot lifts. The foot anchor remains y=62.
 const leftStep=motion.leftStep||0,rightStep=motion.rightStep||0;
 const leftLift=motion.leftLift||0,rightLift=motion.rightLift||0;
 rect(c,mx(CX-7+leftStep),60-leftLift,5,3,"K");
 rect(c,mx(CX+2+rightStep),60-rightLift,5,3,"K");
 p(CX-5+leftStep,62-leftLift,"S");p(CX+5+rightStep,62-rightLift,"S");
 // Tiny moving cloth glints make the lower panels read as fabric in motion.
 if(hem!==0){p(CX-11+hem,56,"D");p(CX+10+hem,58,"A");}
}
function drawHuman(c,hair,outfit,dir,move,frame=0,accessory="none",weapon="none"){
 const front=faceFront(dir),back=backView(dir),side=sideView(dir),flip=isLeft(dir);
 const walking=move==="walk",walkFrame=walking?frame%8:0;
 // Eight-step gait: contact, passing, lift, settle, then the opposite leg.
 const bob=walking?[0,-1,-1,0,0,-1,-1,0][walkFrame]:[0,0,1,0][frame%4];
 const motion=walking?{
   arm:[0,1,1,0,0,-1,-1,0][walkFrame],
   step:[0,1,2,1,0,-1,-2,-1][walkFrame],
   hem:[0,1,1,0,0,-1,-1,0][walkFrame],
   leftStep:[-1,0,1,1,0,-1,-1,-1][walkFrame],
   rightStep:[1,1,1,0,-1,-1,-1,0][walkFrame],
   leftLift:[0,0,0,1,0,0,0,1][walkFrame],
   rightLift:[0,1,0,0,0,1,0,0][walkFrame],
   hair:[0,0,1,1,0,0,-1,-1][walkFrame]
 }:{};
 const top=5+bob,headY=top+10;
 oval(c,CX,62,11,2,"K");
 if(front||side)rect(c,CX-2,top+19,4,4,"S");
 const bodyTop=top+19;
 if(weapon!=="none"&&WEAPONS.find(x=>x.id===weapon)?.layer==="back")drawWeapon(c,weapon,dir,frame,move);
 drawOutfit(c,outfit,front,back,side,flip,bodyTop,motion);
 if(weapon!=="none"&&WEAPONS.find(x=>x.id===weapon)?.layer!=="back")drawWeapon(c,weapon,dir,frame,move);
 // The human head remains the same 20x20 anatomy in every direction.
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
     c.px(CX,headY+6,"T");c.px(CX-1,headY+7,"S");c.px(CX+1,headY+7,"S");
   }else if(side||dir==="se"||dir==="sw"){
     const eyeX=flip?CX-4:CX+4;
     rect(c,eyeX,headY+2,2,3,"K");c.px(flip?CX-5:CX+6,headY+6,"T");
   }
 }
 drawFringe(c,hair,dir,flip,top);
 if(accessory!=="none")drawAccessory(c,accessory,dir,frame,move);
 if(walking){
   // Opposing arm beat remains small so the sprite does not jitter between steps.
   c.px(flip?CX+17-motion.arm:CX-17-motion.arm,bodyTop+21+Math.abs(motion.arm),"S");
   c.px(flip?CX-17+motion.arm:CX+17+motion.arm,bodyTop+22-Math.abs(motion.arm),"S");
   // A travelling highlight tracks the hair ends without changing hair volume.
   if(motion.hair!==0){
     c.px(CX-10+motion.hair,top+26,"H");
     c.px(CX+10+motion.hair,top+27,"I");
   }
 }
}
function preview(hair,outfit,name,accessory="none",weapon="none"){
 pal(PALETTE(outfit.id));
 sprite(name,{w:W,h:H,pivot:[CX,62]},c=>drawHuman(c,hair,outfit,"s","idle",0,accessory,weapon));
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
   anim(base+"_walk_"+dir,{w:W,h:H,frames:8,fps:10},c=>drawHuman(c,hair,outfit,dir,"walk",c.frame));
  }
 }
}

// Preview cards use the same body, hair and base outfit; only the selected
// accessory/weapon slot changes. Runtime overlays are rendered separately.
const previewHair=HAIR[0],previewOutfit=OUTFITS[0];
for(const item of ACCESSORIES){
 preview(previewHair,previewOutfit,"human_preview_accessory_"+item.id,item.id,"none");
}
for(const item of WEAPONS){
 preview(previewHair,previewOutfit,"human_preview_weapon_"+item.id,"none",item.id);
}
pal(PALETTE(previewOutfit.id));
for(const item of ACCESSORIES){
 for(const dir of DIRS){
  anim("accessory_"+item.id+"_idle_"+dir,{w:W,h:H,frames:4,fps:3},c=>drawAccessory(c,item.id,dir,c.frame,"idle"));
  anim("accessory_"+item.id+"_walk_"+dir,{w:W,h:H,frames:8,fps:10},c=>drawAccessory(c,item.id,dir,c.frame,"walk"));
 }
}
for(const item of WEAPONS){
 for(const dir of DIRS){
  anim("weapon_"+item.id+"_idle_"+dir,{w:W,h:H,frames:4,fps:3},c=>drawWeapon(c,item.id,dir,c.frame,"idle"));
  anim("weapon_"+item.id+"_walk_"+dir,{w:W,h:H,frames:8,fps:10},c=>drawWeapon(c,item.id,dir,c.frame,"walk"));
 }
}
