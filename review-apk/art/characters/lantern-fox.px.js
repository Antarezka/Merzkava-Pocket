// Merzkava Pocket — Yunmiao, Sakura Lantern Keeper.
// Original fox-spirit character family. Authored for Augusto Carvalho pxl.
// Gameplay cell: 48x64. Pixel art only; no SVG, blur, dithering, or smooth scaling.
// Every direction and every animation is drawn independently from shared anatomy rules.

const W=48,H=64,CX=24,FOOT=62;
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const ACTIONS={
  idle:4, walk:8, run:8, attack:6, skill:8, lunge:4,
  fish:6, meditate:4, interact:4, pickup:4, gather:6, bow:4,
  laugh:4, hit:3, knockback:4, death:6, revive:6,
  lantern_raise:4, lantern_lower:4, sit:4, sleep:4, victory:6, hurt:4
};

// 34 authored colours: separate outline ramps for fur, skin, eye, fabric and metal.
// Upper-left light is maintained in every view. Brightest pixels are intentionally scarce.
const PALETTE={
  A:"#716b82", B:"#7f7896", C:"#b1a9c2", D:"#d9d3e0", E:"#f4f1f6",
  F:"#8c4a4a", G:"#d98f86", H:"#f5c4b0", I:"#ffe6d8",
  J:"#3b2230", K:"#7a2434", L:"#b03a48", M:"#fff8f2",
  N:"#d9707f", O:"#f2a7b5", P:"#fbe3e6", Q:"#c8344a",
  R:"#2a5f66", S:"#3f8f87", T:"#6fbfa8", U:"#a8e0cf",
  V:"#2d2433", W:"#4a3a4e", X:"#e8c27a",
  Y:"#8a3a2e", Z:"#d84a3a", "0":"#f2c75c", "1":"#fce7a3",
  "2":"#6d617d", "3":"#9d8294", "4":"#f8c8d2", "5":"#fff0f2",
  "6":"#5d806a", "7":"#94b18a", "8":"#f3d7a7", "9":"#d7a15e"
};
pal(PALETTE);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function px(c,x,y,k){
  x=Math.round(x);y=Math.round(y);
  if(x>=0&&x<W&&y>=0&&y<H)c.px(x,y,k);
}
function hline(c,x,y,n,k){for(let i=0;i<n;i++)px(c,x+i,y,k);}
function vline(c,x,y,n,k){for(let i=0;i<n;i++)px(c,x,y+i,k);}
function rect(c,x,y,w,h,k){
  for(let yy=0;yy<h;yy++)hline(c,x,y+yy,w,k);
}
function oval(c,cx,cy,rx,ry,k){
  rx=Math.max(1,rx);ry=Math.max(1,ry);
  for(let y=-ry;y<=ry;y++){
    const span=Math.floor(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))));
    hline(c,cx-span,cy+y,span*2+1,k);
  }
}
function line(c,x1,y1,x2,y2,k){
  const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);
  for(let i=0;i<=n;i++)px(c,x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,k);
}
function polygon(c,points,k){
  const minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))));
  const maxY=Math.min(H-1,Math.ceil(Math.max(...points.map(p=>p[1]))));
  for(let y=minY;y<=maxY;y++){
    const hits=[];
    for(let i=0;i<points.length;i++){
      const [x1,y1]=points[i], [x2,y2]=points[(i+1)%points.length];
      if(y1===y2)continue;
      const lo=Math.min(y1,y2),hi=Math.max(y1,y2);
      if(y<lo||y>=hi)continue;
      hits.push(x1+(y-y1)*(x2-x1)/(y2-y1));
    }
    hits.sort((a,b)=>a-b);
    for(let i=0;i+1<hits.length;i+=2){
      const left=Math.ceil(hits[i]),right=Math.floor(hits[i+1]);
      if(right>=left)hline(c,left,y,right-left+1,k);
    }
  }
}
function shape(c,points,fill,edge){
  polygon(c,points,fill);
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    line(c,a[0],a[1],b[0],b[1],edge);
  }
}
function multiLine(c,points,k){for(let i=0;i+1<points.length;i++)line(c,points[i][0],points[i][1],points[i+1][0],points[i+1][1],k);}
function dotCluster(c,points,k){for(const p of points)px(c,p[0],p[1],k);}
function scaled(c,scale,ox,oy){
  return {px:(x,y,k)=>{const xx=ox+x*scale,yy=oy+y*scale;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)c.px(xx+dx,yy+dy,k);}};
}

const frontView=d=>["s","se","sw"].includes(d);
const backView=d=>["n","ne","nw"].includes(d);
const sideView=d=>d==="e"||d==="w";
const leftFacing=d=>["w","nw","sw"].includes(d);
const faceSide=d=>["e","ne","se"].includes(d)?"right":"left";

// -----------------------------------------------------------------------------
// Silhouette layer 01 — fox tail. Each view has its own contour and tuft rhythm.
// The tail remains a separate silhouette behind the waist and skirt.
// -----------------------------------------------------------------------------
const TAILS={
  n:[[29,42],[33,38],[39,39],[43,44],[45,50],[43,56],[39,61],[34,59],[29,55],[27,49]],
  ne:[[4,42],[7,37],[13,37],[18,42],[19,49],[16,56],[11,61],[6,58],[3,52],[3,47]],
  e:[[3,41],[7,37],[13,38],[17,43],[17,50],[14,57],[9,61],[4,58],[2,52],[2,46]],
  se:[[3,42],[7,38],[13,39],[18,44],[18,51],[15,57],[10,61],[5,58],[2,52],[2,46]],
  s:[[30,41],[34,37],[40,39],[44,44],[46,50],[44,56],[40,61],[35,59],[30,55],[28,49]],
  sw:[[30,42],[34,38],[40,39],[45,45],[45,52],[42,58],[37,62],[32,59],[29,53],[28,47]],
  w:[[31,41],[35,37],[41,38],[45,43],[46,50],[43,57],[39,61],[34,58],[30,52],[29,46]],
  nw:[[29,42],[34,38],[40,39],[44,44],[45,51],[42,57],[37,62],[32,59],[29,53],[27,47]]
};
function drawTail(c,dir,m){
  const shift=m.tailX||0,lift=m.tailY||0;
  const pts=TAILS[dir].map(([x,y],i)=>[
    x+shift+(i>3&&i<8?(m.tailFan||0):0),
    y-lift
  ]);
  shape(c,pts,"B","A");
  const inset=pts.map(([x,y],i)=>[
    x+(x<CX?2:-2),
    y+(i<3?2:-1)
  ]);
  polygon(c,inset,"C");
  // Broad, grouped light planes; the tiny end glints describe silk-soft fox fur.
  if(faceSide(dir)==="right"){
    shape(c,[[33+shift,42-lift],[38+shift,41-lift],[42+shift,46-lift],[43+shift,50-lift],[39+shift,48-lift],[35+shift,47-lift]],"D","C");
    line(c,35+shift,45-lift,39+shift,48-lift,"E");
    dotCluster(c,[[41+shift,53-lift],[39+shift,56-lift],[37+shift,58-lift]],"E");
  }else{
    shape(c,[[6+shift,43-lift],[11+shift,41-lift],[15+shift,45-lift],[15+shift,49-lift],[11+shift,48-lift],[7+shift,47-lift]],"D","C");
    line(c,8+shift,45-lift,12+shift,48-lift,"E");
    dotCluster(c,[[5+shift,52-lift],[7+shift,56-lift],[10+shift,59-lift]],"E");
  }
  // Three-to-four readable pointed tufts, never loose orphan pixels.
  if(dir==="n"||dir==="s"||dir==="nw"||dir==="sw"||dir==="w"){
    shape(c,[[34+shift,56-lift],[37+shift,59-lift],[39+shift,55-lift],[38+shift,61-lift],[34+shift,60-lift]],"D","C");
  }else{
    shape(c,[[8+shift,55-lift],[11+shift,59-lift],[13+shift,55-lift],[12+shift,61-lift],[8+shift,59-lift]],"D","C");
  }
  if(m.tailSpark){
    px(c,dir==="e"||dir==="ne"||dir==="se"?8+shift:39+shift,44-lift,"E");
    px(c,dir==="e"||dir==="ne"||dir==="se"?12+shift:35+shift,48-lift,"U");
  }
}

// -----------------------------------------------------------------------------
// Silhouette layer 02 — legs, shoes, skirt and waist assembly.
// Gameplay anatomy stays compact: 12 px torso, 14 px lower-body group.
// -----------------------------------------------------------------------------
function drawShoes(c,m){
  const y=59+(m.crouch||0);
  const ls=m.leftStep||0,rs=m.rightStep||0,ll=m.leftLift||0,rl=m.rightLift||0;
  rect(c,18+ls,y-ll,5,3,"V");
  rect(c,27+rs,y-rl,5,3,"V");
  rect(c,19+ls,y-ll,3,1,"W");
  rect(c,28+rs,y-rl,3,1,"W");
  hline(c,19+ls,y-ll,2,"X");hline(c,28+rs,y-rl,2,"X");
}
function drawLegs(c,m){
  const y=56+(m.crouch||0),ls=m.leftStep||0,rs=m.rightStep||0;
  const ll=m.leftLift||0,rl=m.rightLift||0;
  rect(c,19+ls,y-ll,4,5+ll,"G");
  rect(c,27+rs,y-rl,4,5+rl,"G");
  vline(c,20+ls,y-ll,4,"H");vline(c,28+rs,y-rl,4,"H");
  drawShoes(c,m);
}
function drawSkirt(c,dir,m){
  const y=42+(m.crouch||0),shift=m.hem||0,side=sideView(dir);
  let outer,inner;
  if(side){
    const left=dir==="w";
    outer=left?[[22,y],[31,y+1],[34,y+9],[33+shift,y+16],[20,y+16],[18,y+8]]:
               [[16,y+1],[27,y],[30,y+8],[29+shift,y+16],[15,y+16],[14,y+8]];
    inner=left?[[23,y+2],[30,y+2],[32,y+9],[30+shift,y+14],[21,y+14],[20,y+8]]:
               [[17,y+2],[26,y+2],[28,y+9],[27+shift,y+14],[16,y+14],[15,y+8]];
  }else{
    outer=[[15,y],[32,y],[38+shift,y+8],[36+shift,y+16],[12+shift,y+16],[9+shift,y+8]];
    inner=[[16,y+2],[31,y+2],[35+shift,y+9],[34+shift,y+14],[14+shift,y+14],[12+shift,y+9]];
  }
  shape(c,outer,"R","R");
  polygon(c,inner,"T");
  // Upper mint panel and cool shadow fold planes.
  if(!side){
    shape(c,[[16,y+3],[23,y+4],[21+shift,y+14],[16+shift,y+14]],"U","T");
    shape(c,[[25,y+3],[31,y+3],[34+shift,y+12],[30+shift,y+14]],"S","R");
    line(c,22,y+5,20+shift,y+14,"S");
    line(c,25,y+5,27+shift,y+14,"S");
    line(c,29,y+5,32+shift,y+13,"U");
    line(c,18,y+6,15+shift,y+13,"U");
  }else{
    line(c,24,y+4,25+shift,y+14,"S");
    line(c,27,y+5,30+shift,y+13,"U");
    line(c,20,y+5,18+shift,y+13,"U");
  }
  // Thin antique-gold hem fragments are grouped at fold endpoints.
  hline(c,15+shift,y+15,5,"X");
  hline(c,26+shift,y+15,6,"X");
  px(c,22+shift,y+15,"X");px(c,34+shift,y+14,"X");
  // Inner underskirt glimpses below the outer pleats.
  hline(c,18+shift,y+13,3,"P");
  if(!side)hline(c,28+shift,y+12,3,"P");
}
function drawObi(c,dir,m){
  const y=39+(m.crouch||0),w=sideView(dir)?9:17,x=sideView(dir)?20:15;
  rect(c,x,y,w,5,"V");
  hline(c,x+1,y+1,w-2,"W");
  hline(c,x+1,y+3,w-2,"W");
  hline(c,x+2,y+4,w-4,"X");
  if(!sideView(dir)){
    shape(c,[[24,y-1],[28,y+2],[25,y+5],[21,y+2]],"W","V");
    polygon(c,[[24,y],[26,y+2],[24,y+4],[22,y+2]],"X");
    // Obi knot tails: two separate cloth tabs, not a single flat stripe.
    shape(c,[[22,y+3],[19,y+7],[21,y+8],[24,y+4]],"Q","N");
    shape(c,[[26,y+3],[29,y+7],[27,y+8],[24,y+4]],"O","N");
  }else{
    rect(c,dir==="e"?27:17,y+1,3,3,"X");
  }
}

// -----------------------------------------------------------------------------
// Costume layer — cross-lapel hanfu, broad sleeves, sash, pleated jade skirt.
// Each shape has a dedicated dark edge and three material values.
// -----------------------------------------------------------------------------
function drawSleeve(c,dir,m,near){
  const y=30+(m.crouch||0),side=sideView(dir),arm=m.arm||0;
  if(side){
    const x=dir==="e"?26:10;
    shape(c,[[x,y+2],[x+7,y+1],[x+9,y+6+arm],[x+6,y+12+arm],[x,y+10]],"N","Q");
    polygon(c,[[x+1,y+3],[x+6,y+3],[x+7,y+7+arm],[x+5,y+10+arm],[x+1,y+8]],"O");
    line(c,x+2,y+5,x+5,y+9+arm,"P");
    return;
  }
  const x=near?7:30, sign=near?-1:1;
  const points=near
    ?[[15,y+2],[11,y+1],[7+arm,y+4],[6+arm,y+10],[10,y+13],[16,y+10]]
    :[[32,y+2],[37,y+1],[41+arm,y+4],[42+arm,y+10],[38,y+13],[32,y+10]];
  shape(c,points,"N","Q");
  polygon(c,near?[[14,y+3],[11,y+3],[9+arm,y+6],[9+arm,y+9],[12,y+10],[15,y+8]]:
                  [[33,y+3],[36,y+3],[39+arm,y+6],[39+arm,y+9],[36,y+10],[33,y+8]],"O");
  line(c,near?11+arm:36+arm,y+5,near?10+arm:37+arm,y+9,"P");
  // Wide cuff, with one dark underside and one warm edge catch.
  if(near){
    hline(c,7+arm,y+10,5,"V");hline(c,8+arm,y+11,4,"P");
  }else{
    hline(c,37+arm,y+10,5,"V");hline(c,37+arm,y+11,4,"P");
  }
}
function drawTorso(c,dir,m){
  const y=29+(m.crouch||0),lean=m.lean||0,side=sideView(dir);
  // Back panel and compact torso; no long neck or adult shoulder proportions.
  if(side){
    shape(c,[[20+lean,y+1],[28+lean,y+2],[30+lean,y+8],[27+lean,y+14],[20+lean,y+13],[18+lean,y+7]],"N","Q");
    polygon(c,[[21+lean,y+3],[27+lean,y+3],[28+lean,y+8],[26+lean,y+12],[21+lean,y+11]],"O");
  }else{
    shape(c,[[17+lean,y+1],[31+lean,y+1],[34+lean,y+12],[29+lean,y+15],[18+lean,y+14],[14+lean,y+9]],"N","Q");
    polygon(c,[[18+lean,y+3],[30+lean,y+3],[31+lean,y+10],[28+lean,y+13],[19+lean,y+12],[16+lean,y+8]],"O");
    polygon(c,[[18+lean,y+3],[23+lean,y+4],[21+lean,y+11],[18+lean,y+9]],"P");
  }
  // Crossed inner collars; broad pixel panels remain visible at native scale.
  if(!backView(dir)){
    shape(c,[[17+lean,y],[23+lean,y+2],[26+lean,y+9],[23+lean,y+10],[18+lean,y+5]],"P","N");
    shape(c,[[31+lean,y],[25+lean,y+2],[22+lean,y+9],[25+lean,y+10],[30+lean,y+5]],"O","Q");
    line(c,22+lean,y+3,25+lean,y+8,"X");
    // Small chest bow: two wings, knot, and one ribbon tail.
    shape(c,[[20+lean,y+7],[16+lean,y+5],[16+lean,y+9],[21+lean,y+10]],"Q","N");
    shape(c,[[27+lean,y+7],[31+lean,y+5],[31+lean,y+9],[26+lean,y+10]],"O","N");
    rect(c,22+lean,y+7,4,3,"Q");
    px(c,23+lean,y+8,"P");px(c,25+lean,y+8,"P");
  }else{
    line(c,19+lean,y+4,29+lean,y+4,"P");
    line(c,20+lean,y+8,28+lean,y+8,"N");
  }
  // Gold seam at the shoulder and a tiny sleeve seam glint.
  line(c,17+lean,y+2,14+lean,y+7,"X");
  line(c,31+lean,y+2,34+lean,y+7,"X");
}
function drawHands(c,dir,m){
  const y=37+(m.crouch||0),arm=m.arm||0,side=sideView(dir),left=leftFacing(dir);
  if(side){
    const x=dir==="e"?35:9;
    rect(c,x,y+arm,3,4,"F");rect(c,x,y+arm,2,2,"H");
  }else{
    rect(c,8+arm,y+1,3,4,"F");rect(c,9+arm,y+1,2,3,"H");
    rect(c,37-arm,y+1,3,4,"F");rect(c,37-arm,y+1,2,3,"H");
  }
}

// -----------------------------------------------------------------------------
// Head and hair layers — 22 px face, two 9 px fox ears, hime-cut + long locks.
// Hair is a large grouped silhouette; one-pixel glints are used only as accents.
// -----------------------------------------------------------------------------
function drawEars(c,dir,m){
  const y=m.headY||10,side=sideView(dir),left=leftFacing(dir);
  if(side){
    const pts=dir==="e"
      ?[[22,y+5],[25,y-2],[30,y+1],[29,y+8],[26,y+11]]
      :[[18,y+5],[20,y-2],[25,y+1],[24,y+8],[21,y+11]];
    shape(c,pts,"B","A");
    polygon(c,dir==="e"?[[24,y+4],[26,y],[28,y+2],[27,y+7]]:[[19,y+4],[21,y],[23,y+2],[22,y+7]],"4");
    return;
  }
  const leftEar=[[14,y+5],[12,y-3],[17,y+1],[21,y+9],[18,y+12]];
  const rightEar=[[28,y+8],[32,y+1],[36,y-3],[34,y+7],[32,y+12]];
  shape(c,leftEar,"B","A");
  polygon(c,[[15,y+6],[13,y],[16,y+3],[18,y+8]],"4");
  line(c,15,y+3,17,y+8,"O");
  shape(c,rightEar,"D","A");
  polygon(c,[[31,y+7],[34,y],[34,y+4],[32,y+9]],"4");
  line(c,33,y+3,32,y+8,"O");
  // Ear-tip tufts: the three-pixel comb joins each ear to the scalp.
  dotCluster(c,[[14,y+4],[15,y+5],[16,y+6],[34,y+4],[33,y+5],[32,y+6]],"E");
}
function drawHairBack(c,dir,m){
  const y=m.headY||10,back=backView(dir),side=sideView(dir),left=leftFacing(dir);
  if(back){
    shape(c,[[14,y+8],[15,y+1],[20,y-2],[29,y-1],[34,y+5],[35,y+16],[33,y+27],[36,y+39],[31,y+43],[28,y+34],[24,y+39],[20,y+34],[16,y+44],[12,y+39],[15,y+27],[13,y+17]],"B","A");
    polygon(c,[[16,y+8],[20,y+2],[28,y+2],[32,y+8],[33,y+18],[30,y+30],[33,y+38],[29,y+39],[25,y+31],[21,y+37],[17,y+39],[15,y+30],[17,y+19]],"D");
    line(c,19,y+8,20,y+27,"C");line(c,24,y+6,24,y+30,"E");line(c,29,y+8,28,y+25,"C");
    // Long rear locks split into distinct stepped clumps down to the thigh.
    shape(c,[[15,y+22],[19,y+25],[18,y+40],[16,y+47],[12,y+45],[14,y+37]],"C","A");
    shape(c,[[28,y+22],[32,y+24],[34,y+40],[32,y+47],[28,y+45],[29,y+35]],"D","A");
    line(c,15,y+30,14,y+42,"E");line(c,31,y+30,32,y+42,"C");
  }else if(side){
    const near=left?10:26;
    shape(c,[[near,y+6],[near+5,y],[near+11,y+5],[near+10,y+18],[near+13,y+31],[near+9,y+42],[near+4,y+38],[near+5,y+24]],"B","A");
    polygon(c,[[near+3,y+8],[near+8,y+5],[near+8,y+19],[near+10,y+32],[near+7,y+38],[near+6,y+22]],"D");
    line(c,near+5,y+13,near+7,y+31,"E");
  }else{
    // Front three-quarter: rear volume behind the cheeks and shoulder locks.
    shape(c,[[13,y+9],[15,y+2],[20,y-1],[29,y],[35,y+8],[34,y+21],[31,y+30],[34,y+40],[29,y+43],[26,y+34],[21,y+38],[17,y+44],[13,y+40],[16,y+27],[13,y+18]],"B","A");
    polygon(c,[[16,y+8],[20,y+3],[28,y+3],[32,y+9],[31,y+20],[29,y+31],[31,y+38],[28,y+40],[24,y+32],[20,y+38],[16,y+40],[17,y+27]],"D");
    line(c,19,y+11,19,y+29,"C");line(c,29,y+11,29,y+30,"E");
  }
  // Directional sidelocks are separately shaped, not one full-body mirror.
  if(!back){
    if(left){
      shape(c,[[14,y+17],[18,y+17],[17,y+30],[15,y+39],[11,y+42],[12,y+32]],"B","A");
      line(c,14,y+23,13,y+38,"E");
    }else{
      shape(c,[[30,y+17],[34,y+17],[36,y+31],[35,y+41],[31,y+43],[31,y+30]],"C","A");
      line(c,33,y+22,34,y+38,"E");
    }
  }
}
function drawFace(c,dir,m){
  const y=m.headY||10,side=sideView(dir),back=backView(dir),left=leftFacing(dir);
  if(back){
    // Back views deliberately show the hair mass; the face is not pasted on.
    oval(c,CX,y+11,9,10,"B");
    oval(c,CX,y+9,8,7,"D");
    return;
  }
  if(side){
    const cx=dir==="e"?25:23;
    shape(c,[[cx-7,y+3],[cx+3,y+1],[cx+8,y+7],[cx+7,y+16],[cx+3,y+21],[cx-5,y+19],[cx-8,y+12]],"F","F");
    polygon(c,[[cx-6,y+5],[cx+2,y+3],[cx+6,y+8],[cx+5,y+15],[cx+1,y+19],[cx-4,y+17],[cx-6,y+11]],"H");
    rect(c,dir==="e"?27:19,y+9,3,5,"J");
    px(c,dir==="e"?28:20,y+10,"L");px(c,dir==="e"?28:20,y+9,"M");
    px(c,dir==="e"?33:15,y+15,"G");
    line(c,dir==="e"?30:18,y+19,dir==="e"?32:16,y+19,"F");
    return;
  }
  oval(c,CX,y+11,10,11,"F");
  oval(c,CX,y+10,9,10,"H");
  oval(c,CX-3,y+7,5,5,"I");
  polygon(c,[[15,y+12],[17,y+7],[22,y+6],[27,y+7],[33,y+12],[32,y+21],[29,y+29],[19,y+29],[16,y+23]],"H");
  // Cool shadow on the lower-right cheek; warm bounce light on the left.
  polygon(c,[[26,y+15],[32,y+14],[31,y+22],[28,y+27],[25,y+26]],"G");
  oval(c,18,y+18,2,2,"N");oval(c,30,y+18,2,2,"N");
  // Front eyes: 4x5 clusters, dark upper lash and two controlled glints.
  if(dir==="s"){
    rect(c,17,y+9,4,5,"J");rect(c,28,y+9,4,5,"J");
    rect(c,18,y+10,3,3,"K");rect(c,29,y+10,3,3,"L");
    rect(c,18,y+10,1,1,"M");rect(c,29,y+10,1,1,"M");
    px(c,20,y+13,"5");px(c,31,y+13,"5");
    line(c,17,y+8,20,y+8,"J");line(c,28,y+8,31,y+8,"J");
  }else{
    // Diagonal faces foreshorten the far eye by one pixel.
    const eyeX=left?16:28,farX=left?27:17;
    rect(c,eyeX,y+10,4,5,"J");rect(c,farX,y+11,3,4,"J");
    rect(c,eyeX+1,y+11,2,3,"K");rect(c,farX+1,y+12,1,2,"L");
    px(c,eyeX+1,y+11,"M");px(c,farX+1,y+12,"M");
    line(c,eyeX,y+9,eyeX+3,y+9,"J");
  }
  // Nose omitted by design. Tiny mouth and blush keep the face clean at 1x.
  if(m.openMouth){
    rect(c,23,y+22,3,3,"F");px(c,24,y+23,"Q");
  }else{
    hline(c,23,y+22,2,"F");
    px(c,24,y+23,"G");
  }
  dotCluster(c,[[15,y+19],[16,y+20],[32,y+19],[33,y+20]],"N");
  px(c,22,y+26,"I");px(c,25,y+26,"I");
}
function drawFrontHair(c,dir,m){
  if(backView(dir))return;
  const y=m.headY||10,side=sideView(dir),left=leftFacing(dir);
  if(side){
    const x=dir==="e"?17:11;
    shape(c,[[x,y+8],[x+4,y],[x+11,y+1],[x+14,y+7],[x+11,y+12],[x+8,y+10],[x+5,y+14]],"B","A");
    polygon(c,[[x+3,y+7],[x+7,y+3],[x+12,y+6],[x+10,y+9]],"D");
    line(c,x+5,y+5,x+9,y+7,"E");
    return;
  }
  // Hime fringe: flat central edge, stepped side locks, tiny tufts at the ends.
  shape(c,[[13,y+10],[15,y+3],[20,y-1],[28,y],[34,y+6],[35,y+13],[32,y+17],[29,y+14],[26,y+17],[23,y+14],[20,y+17],[17,y+14],[14,y+18],[12,y+14]],"B","A");
  polygon(c,[[16,y+7],[20,y+2],[28,y+3],[32,y+8],[31,y+12],[28,y+10],[25,y+14],[22,y+11],[19,y+14],[16,y+11]],"D");
  line(c,18,y+5,20,y+10,"E");line(c,27,y+4,29,y+9,"E");
  if(!left){polygon(c,[[14,y+13],[18,y+14],[17,y+25],[14,y+30],[12,y+26]],"C");}
  else{polygon(c,[[30,y+13],[34,y+14],[36,y+25],[33,y+30],[31,y+25]],"C");}
  // Small parting highlight cluster, not a continuous shiny stripe.
  dotCluster(c,[[21,y+5],[22,y+4],[23,y+5],[24,y+4]],"E");
}
function drawSakura(c,x,y,size=1){
  const r=size;
  oval(c,x,y-r*2,r,r,"4");
  oval(c,x-r*2,y,r,r,"4");
  oval(c,x+r*2,y,r,r,"4");
  oval(c,x-r,y+r*2,r,r,"4");
  oval(c,x+r,y+r*2,r,r,"4");
  px(c,x,y,"X");px(c,x,y+1,"1");
}
function drawHairOrnaments(c,dir,m){
  const x=sideView(dir)?(dir==="e"?17:30):(leftFacing(dir)?16:32),y=(m.headY||10)+9;
  drawSakura(c,x,y,1);
  line(c,x+1,y+3,x+3,y+8,"X");
  px(c,x+3,y+9,"X");px(c,x+4,y+10,"1");
  // Two petal-shaped ribbon ends and a tiny bronze bell.
  shape(c,[[x+2,y+5],[x+6,y+7],[x+5,y+12],[x+3,y+9]],"Q","N");
  shape(c,[[x+1,y+5],[x-2,y+8],[x,y+12],[x+3,y+9]],"O","N");
  oval(c,x+4,y+12,2,2,"X");px(c,x+4,y+12,"1");
}
function drawLantern(c,x,y,phase=0){
  // 10x12 signature hand lantern: handle, canopy, red frame, golden paper.
  line(c,x+3,y,x+3,y-2,"X");line(c,x+6,y,x+6,y-2,"X");
  hline(c,x+3,y-2,4,"X");px(c,x+2,y-1,"X");px(c,x+7,y-1,"X");
  shape(c,[[x+1,y+1],[x+8,y+1],[x+7,y+3],[x+2,y+3]],"Z","Y");
  shape(c,[[x+2,y+3],[x+7,y+3],[x+8,y+9],[x+1,y+9]],"Y","Y");
  rect(c,x+2,y+4,6,4,"0");rect(c,x+3,y+4,4,4,"1");
  vline(c,x+2,y+3,7,"Z");vline(c,x+7,y+3,7,"Z");
  px(c,x+4,y+4+(phase%3),"M");px(c,x+5,y+6-((phase+1)%2),"1");
  hline(c,x+1,y+9,8,"Z");hline(c,x+2,y+10,6,"Y");
  px(c,x+4,y+11,"X");px(c,x+5,y+11,"X");
}
function drawFishingRod(c,dir,phase){
  const left=leftFacing(dir),x=left?9:35;
  line(c,x,37,x+(left?-4:4),24,"W");
  line(c,x+(left?-4:4),24,x+(left?-9:9),16,"W");
  line(c,x+(left?-9:9),16,x+(left?-12:12),26,"X");
  line(c,x+(left?-12:12),26,x+(left?-13:13),34+(phase%2),"8");
  px(c,x+(left?-13:13),35+(phase%2),"0");
}
function drawHandGlow(c,x,y,phase){
  const r=phase%4;
  dotCluster(c,[[x,y-3],[x-3,y],[x+3,y],[x,y+3]],"4");
  px(c,x,y,"1");px(c,x-1,y,"0");px(c,x+1,y-1,"M");
  if(r===1){px(c,x-4,y-2,"4");px(c,x+4,y+2,"4");}
  if(r===3){px(c,x+3,y-3,"5");px(c,x-3,y+3,"5");}
}
function drawSakuraPetal(c,x,y,phase){
  const dx=[0,1,2,1,-1,-2,-1,0][phase%8];
  const dy=[0,1,1,2,2,1,0,-1][phase%8];
  shape(c,[[x+dx,y+dy],[x+dx+2,y+dy-1],[x+dx+3,y+dy+1],[x+dx+1,y+dy+2]],"4","O");
}
function drawActionFx(c,dir,action,frame,m){
  if(action==="skill"||action==="revive"||action==="victory"){
    for(let i=0;i<5;i++){
      const x=(dir==="w"||dir==="nw"||dir==="sw"?7:35)+((i*7+frame*3)%12);
      const y=18+((i*11+frame*4)%29);
      drawSakuraPetal(c,x,y,frame+i);
    }
    const fxX=dir==="w"||dir==="nw"||dir==="sw"?13:35;
    drawHandGlow(c,fxX,26+(frame%3),frame);
  }
  if(action==="attack"||action==="lunge"){
    const left=leftFacing(dir),base=left?7:37;
    for(let i=0;i<4;i++){
      const x=base+(left?i*2:-i*2),y=30+((frame+i)%4);
      px(c,x,y,i%2?"1":"5");
    }
  }
  if(action==="hit"||action==="hurt"||action==="knockback"){
    px(c,dir==="w"?35:12,18+(frame%3),"5");
    px(c,dir==="w"?38:9,23+((frame+1)%3),"4");
  }
}

// -----------------------------------------------------------------------------
// Pose engine — actions share anatomy but not timing, silhouette or prop height.
// A grounded foot anchor is preserved on locomotion cycles.
// -----------------------------------------------------------------------------
function poseFor(action,frame){
  const p={bob:0,arm:0,lean:0,hem:0,tailX:0,tailY:0,tailFan:0,crouch:0,
    leftStep:0,rightStep:0,leftLift:0,rightLift:0,lanternY:0,openMouth:false,
    rod:false,lantern:true,tailSpark:false,fx:false};
  const f=frame;
  if(action==="idle"){
    p.bob=[0,0,-1,0][f%4];p.tailX=[0,1,2,1][f%4];p.tailY=[0,0,1,0][f%4];
    p.arm=[0,0,1,0][f%4];p.lanternY=[0,0,-1,0][f%4];
  }else if(action==="walk"){
    p.bob=[0,-1,-1,0,0,-1,-1,0][f%8];
    p.arm=[0,1,1,0,0,-1,-1,0][f%8];
    p.leftStep=[-1,0,1,1,0,-1,-1,-1][f%8];
    p.rightStep=[1,1,1,0,-1,-1,-1,0][f%8];
    p.leftLift=[0,0,0,1,0,0,0,1][f%8];
    p.rightLift=[0,1,0,0,0,1,0,0][f%8];
    p.hem=[0,1,1,0,0,-1,-1,0][f%8];
    p.tailX=[0,1,2,1,0,-1,-2,-1][f%8];
    p.tailY=[0,1,1,0,0,1,1,0][f%8];
  }else if(action==="run"){
    p.bob=[-1,-2,-1,0,-1,-2,-1,0][f%8];p.lean=leftFacing("s")?1:1;
    p.arm=[-2,-1,0,1,2,1,0,-1][f%8];
    p.leftStep=[-2,-1,1,2,1,0,-1,-2][f%8];
    p.rightStep=[2,1,0,-1,-2,-1,0,1][f%8];
    p.leftLift=[0,1,2,1,0,1,2,1][f%8];
    p.rightLift=[2,1,0,1,2,1,0,1][f%8];
    p.hem=[-1,0,1,2,1,0,-1,-2][f%8];
    p.tailX=[-2,-1,0,1,2,1,0,-1][f%8];p.tailY=3;p.tailFan=1;
  }else if(action==="attack"){
    p.arm=[0,-1,-2,-1,1,0][f%6];p.lean=[0,0,1,2,1,0][f%6];
    p.hem=[0,1,2,1,0,-1][f%6];p.tailX=[0,-1,-2,-1,0,1][f%6];
    p.lanternY=[0,-2,-4,-2,1,0][f%6];p.fx=f===2||f===3;
  }else if(action==="skill"){
    p.arm=[1,0,-1,-2,-2,-1,0,1][f%8];p.lean=[0,-1,-1,-2,-1,0,0,0][f%8];
    p.lanternY=[0,-2,-5,-8,-8,-6,-3,0][f%8];p.tailY=[0,1,2,3,3,2,1,0][f%8];
    p.tailSpark=true;p.fx=true;
  }else if(action==="lunge"){
    p.lean=[0,1,2,0][f%4];p.arm=[0,-2,-1,1][f%4];p.hem=[0,2,3,-1][f%4];
    p.tailX=[0,-2,-3,1][f%4];p.tailY=[0,2,3,0][f%4];p.lanternY=[0,-2,-1,1][f%4];p.fx=f===2;
    p.leftStep=[0,1,2,0][f%4];p.rightStep=[0,-1,-2,0][f%4];
  }else if(action==="fish"){
    p.arm=[0,1,2,1,0,-1][f%6];p.rod=true;p.lantern=false;
    p.tailX=[0,1,1,0,-1,-1][f%6];p.bob=[0,0,-1,0,0,0][f%6];
  }else if(action==="meditate"||action==="sit"){
    p.crouch=6;p.tailX=[0,-1,-2,-1][f%4];p.tailY=3;p.bob=[0,-1,0,1][f%4];
    p.lanternY=13;p.arm=[0,0,-1,0][f%4];p.fx=action==="meditate";
  }else if(action==="interact"){
    p.lean=[0,1,2,0][f%4];p.arm=[0,1,2,0][f%4];p.lanternY=[0,2,4,0][f%4];p.crouch=[0,1,2,0][f%4];
  }else if(action==="pickup"||action==="gather"){
    p.crouch=[1,3,4,3,1,0][f%6];p.lean=[0,1,2,2,1,0][f%6];
    p.arm=[0,1,2,2,1,0][f%6];p.lanternY=10;p.tailY=2;p.lantern=false;
  }else if(action==="bow"){
    p.lean=[0,1,2,0][f%4];p.bob=[0,1,2,0][f%4];p.tailY=2;
    p.arm=[0,1,1,0][f%4];p.lanternY=6;
  }else if(action==="laugh"){
    p.bob=[0,-1,0,1][f%4];p.openMouth=true;p.tailX=[0,1,0,-1][f%4];p.arm=[0,-1,1,0][f%4];
  }else if(action==="hit"||action==="hurt"){
    p.lean=[0,-1,1,0][f%4];p.bob=[0,-1,1,0][f%4];p.arm=[-1,1,-1,0][f%4];
    p.tailX=[0,-2,-1,1][f%4];p.tailY=[0,1,0,0][f%4];p.lanternY=2;
  }else if(action==="knockback"){
    p.lean=[-2,-3,-1,0][f%4];p.arm=[-2,-1,1,0][f%4];p.tailX=[-3,-2,1,2][f%4];
    p.tailY=[2,3,1,0][f%4];p.bob=[-1,-2,-1,0][f%4];
  }else if(action==="death"){
    p.crouch=[0,2,4,7,9,10][f%6];p.lean=[0,1,2,3,4,4][f%6];
    p.bob=[0,1,2,3,4,4][f%6];p.tailY=[0,1,3,4,5,5][f%6];
    p.arm=[0,1,2,3,3,3][f%6];p.lanternY=[0,2,5,8,10,10][f%6];
  }else if(action==="revive"){
    p.crouch=[10,8,5,3,1,0][f%6];p.bob=[3,2,1,0,-1,0][f%6];
    p.tailY=[5,4,3,2,1,0][f%6];p.tailSpark=true;p.fx=true;p.arm=[2,1,0,-1,0,0][f%6];
  }else if(action==="lantern_raise"){
    p.arm=[1,0,-1,-2][f%4];p.lanternY=[0,-3,-7,-7][f%4];p.tailY=[0,0,1,1][f%4];
  }else if(action==="lantern_lower"){
    p.arm=[0,0,1,1][f%4];p.lanternY=[0,3,7,8][f%4];p.tailY=1;
  }else if(action==="sleep"){
    p.crouch=10;p.bob=[0,-1,0,1][f%4];p.tailY=6;p.tailX=[0,-1,-2,-1][f%4];
    p.lantern=false;
  }else if(action==="victory"){
    p.arm=[-1,-2,-3,-2,-1,0][f%6];p.bob=[0,-1,-2,-1,0,1][f%6];
    p.tailY=[0,1,2,2,1,0][f%6];p.tailSpark=true;p.fx=true;p.lanternY=-4;
  }
  return p;
}
function drawCharacter(c,dir,action,frame){
  const m=poseFor(action,frame),headY=10+(m.bob||0)-(m.crouch?Math.floor(m.crouch/4):0);
  m.headY=headY;
  // Some poses fold the lower body while preserving a consistent floor pivot.
  if(action==="death"&&frame>=3){
    drawTail(c,dir,{...m,tailY:m.tailY+2,tailX:m.tailX-1});
    oval(c,CX,56,12,4,"V");
    shape(c,[[13,50],[28,49],[37,54],[34,59],[17,60],[10,56]],"N","Q");
    oval(c,dir==="w"?15:33,47,7,7,"B");
    polygon(c,[[dir==="w"?9:27,44],[dir==="w"?14:32,41],[dir==="w"?20:38,46],[dir==="w"?17:35,52],[dir==="w"?10:28,51]],"D");
    drawEars(c,dir,m);drawHairBack(c,dir,m);drawFace(c,dir,m);drawFrontHair(c,dir,m);
    if(frame<5)drawLantern(c,dir==="w"?4:34,52,frame);
    return;
  }
  drawTail(c,dir,m);
  drawHairBack(c,dir,m);
  drawLegs(c,m);
  drawSkirt(c,dir,m);
  drawTorso(c,dir,m);
  drawSleeve(c,dir,m,true);
  drawSleeve(c,dir,m,false);
  drawObi(c,dir,m);
  drawHands(c,dir,m);
  drawEars(c,dir,m);
  drawFace(c,dir,m);
  drawFrontHair(c,dir,m);
  drawHairOrnaments(c,dir,m);
  if(m.rod)drawFishingRod(c,dir,frame);
  else if(m.lantern){
    const left=dir==="e"||dir==="ne"||dir==="se";
    const x=left?4:34,y=37+(m.lanternY||0)+(m.crouch||0);
    drawLantern(c,x,y,frame);
  }
  if(m.fx)drawActionFx(c,dir,action,frame,m);
  if(action==="sleep"&&(frame%2===0)){
    px(c,34,16,"5");px(c,38,12,"5");px(c,41,8,"4");
  }
  if(action==="meditate"){
    oval(c,24,57,11,2,"4");px(c,20,54,"X");px(c,28,54,"X");
  }
}

// -----------------------------------------------------------------------------
// Portrait and UI-only PXL assets. They are separate from gameplay frames.
// -----------------------------------------------------------------------------
function drawPortraitFrame(c){
  shape(c,[[2,7],[7,2],[88,2],[93,7],[93,88],[88,93],[7,93],[2,88]],"V","X");
  hline(c,8,4,80,"W");hline(c,8,91,80,"W");
  vline(c,4,9,78,"W");vline(c,91,9,78,"W");
  drawSakura(c,8,8,2);drawSakura(c,88,8,2);
  drawSakura(c,8,88,2);drawSakura(c,88,88,2);
  dotCluster(c,[[14,5],[18,5],[78,5],[82,5],[5,18],[5,78],[90,18],[90,78]],"X");
}
function drawPortrait(c,expression){
  const z=scaled(c,2,0,0);
  drawCharacter(z,"s",expression==="laugh"?"laugh":"idle",expression==="laugh"?1:0);
  drawPortraitFrame(c);
  // The portrait remains a portrait asset; name and progression are not baked in.
  if(expression==="laugh"){
    px(c,48,58,"5");px(c,50,58,"5");
  }
}
const FONT={
 A:["010","101","111","101","101"],B:["110","101","110","101","110"],
 C:["011","100","100","100","011"],D:["110","101","101","101","110"],
 E:["111","100","110","100","111"],F:["111","100","110","100","100"],
 G:["011","100","101","101","011"],H:["101","101","111","101","101"],
 I:["111","010","010","010","111"],J:["001","001","001","101","010"],
 K:["101","101","110","101","101"],L:["100","100","100","100","111"],
 M:["101","111","111","101","101"],N:["101","111","111","111","101"],
 O:["010","101","101","101","010"],P:["110","101","110","100","100"],
 Q:["010","101","101","011","001"],R:["110","101","110","101","101"],
 S:["011","100","010","001","110"],T:["111","010","010","010","010"],
 U:["101","101","101","101","111"],V:["101","101","101","101","010"],
 W:["101","101","111","111","101"],X:["101","101","010","101","101"],
 Y:["101","101","010","010","010"],Z:["111","001","010","100","111"],
 " ":["000","000","000","000","000"],"-":["000","000","111","000","000"]
};
function tinyText(c,value,x,y,k,scale=1){
  let at=x;
  for(const ch of value.toUpperCase()){
    const rows=FONT[ch]||FONT[" "];
    for(let yy=0;yy<5;yy++)for(let xx=0;xx<3;xx++)if(rows[yy][xx]==="1")rect(c,at+xx*scale,y+yy*scale,scale,scale,k);
    at+=4*scale;
  }
}
function drawTitleBanner(c){
  shape(c,[[2,7],[10,2],[117,2],[125,7],[120,14],[125,21],[117,25],[10,25],[2,20],[7,14]],"V","X");
  hline(c,13,5,101,"W");hline(c,13,22,101,"W");
  shape(c,[[6,9],[11,6],[117,6],[121,9],[117,18],[11,18],[6,15]],"W","X");
  tinyText(c,"SAKURA LANTERN",22,9,"1",1);
  tinyText(c,"KEEPER",48,16,"4",1);
  drawSakura(c,10,13,1);drawSakura(c,117,13,1);
}
function drawHandSigil(c){
  oval(c,12,12,7,7,"A");oval(c,12,12,5,5,"B");
  drawSakura(c,12,9,1);
  for(let i=0;i<5;i++){const x=4+i*4;line(c,x,20,x+2,15,"X");}
  dotCluster(c,[[5,7],[19,5],[20,18],[3,17]],"1");
}
function drawFootprints(c){
  // Two small tabi-foot silhouettes with a staggered 4-pixel stride.
  oval(c,6,6,2,4,"V");oval(c,6,4,1,2,"W");
  oval(c,15,12,2,4,"V");oval(c,15,10,1,2,"W");
  px(c,5,2,"X");px(c,14,8,"X");
}
function drawLanternAura(c,frame){
  const pulse=[0,1,2,1,0,-1,-2,-1][frame%8];
  oval(c,8,9,5+pulse,7+pulse,"Y");
  oval(c,8,9,3,5,"0");
  rect(c,7,5,3,8,"1");
  px(c,6,6,"M");px(c,10,11,"1");
  if(frame%2===0){px(c,2,4,"4");px(c,14,6,"5");px(c,3,14,"X");}
}
function drawFoxfire(c,frame){
  const drift=[0,1,2,1,0,-1,-2,-1][frame%8];
  shape(c,[[12,20],[8,16],[10,10],[13,5],[15,0],[18,7],[20,13],[18,19]],"Z","Y");
  polygon(c,[[13,18],[11,14],[14,8],[15,5],[17,11],[17,17]],"0");
  line(c,15,18,15+drift,9,"1");px(c,16+drift,8,"M");
  drawSakura(c,5,20,1);
}

// Base turnaround: eight distinct authored facings at exactly the Pocket cell size.
for(const dir of DIRS){
  pal(PALETTE);
  sprite("fox_stand_"+dir,{w:W,h:H,pivot:[CX,FOOT]},c=>drawCharacter(c,dir,"idle",0));
}
// Full action library, eight authored directions for every action.
// Frame counts and timing are intentionally differentiated by action.
for(const dir of DIRS){
  for(const [action,count] of Object.entries(ACTIONS)){
    const fps=action==="idle"||action==="meditate"||action==="sleep"?3:
      action==="walk"?9:action==="run"?12:
      action==="skill"||action==="attack"?10:
      action==="death"?5:8;
    anim("fox_"+action+"_"+dir,{w:W,h:H,frames:count,fps},c=>drawCharacter(c,dir,action,c.frame));
  }
}
sheet("fox_lantern_keeper_turnaround",["fox_stand_*"],{cols:4,pad:2});
sheet("fox_lantern_keeper_idle_directions",["fox_idle_*"],{cols:4,pad:2,rows:"tag"});
sheet("fox_lantern_keeper_walk_directions",["fox_walk_*"],{cols:4,pad:2,rows:"tag"});
sheet("fox_lantern_keeper_action_atlas",[
  "fox_run_s","fox_attack_s","fox_skill_s","fox_lunge_s","fox_fish_s",
  "fox_meditate_s","fox_interact_s","fox_pickup_s","fox_gather_s","fox_bow_s",
  "fox_laugh_s","fox_hit_s","fox_knockback_s","fox_death_s","fox_revive_s",
  "fox_lantern_raise_s","fox_lantern_lower_s","fox_sit_s","fox_sleep_s","fox_victory_s","fox_hurt_s"
],{cols:2,pad:2});
sprite("fox_portrait_normal",{w:96,h:96,pivot:[48,94]},c=>drawPortrait(c,"normal"));
sprite("fox_portrait_laugh",{w:96,h:96,pivot:[48,94]},c=>drawPortrait(c,"laugh"));
sprite("fox_title_banner",{w:128,h:28,pivot:[64,14]},c=>drawTitleBanner(c));
sprite("fox_hand_sakura_sigIl",{w:24,h:24,pivot:[12,12]},c=>drawHandSigil(c));
sprite("fox_footprint_trail",{w:22,h:18,pivot:[11,9]},c=>drawFootprints(c));
anim("fox_lantern_aura",{w:16,h:20,frames:8,fps:8},c=>drawLanternAura(c,c.frame));
anim("foxfire_burst",{w:24,h:24,frames:8,fps:10},c=>drawFoxfire(c,c.frame));
