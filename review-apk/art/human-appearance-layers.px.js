// Merzkava Pocket — detailed 48x64 accessory overlays for the claude-today1 human base.
// All pieces share the base's crisp pixel clusters, selective ink outline, and 3-4 tone material ramps.
// This file draws accessories only: the body, hair and outfits remain exclusively in human-character-base.px.js.
const W=48,H=64,CX=24;
const DIRS=["n","ne","e","se","s","sw","w","nw"];
const PAL={
  K:"#1d1620",K2:"#322632",K3:"#51404d",
  gold0:"#5e4527",gold1:"#9b7a43",gold2:"#d5b477",gold3:"#f3dfa6",
  jade0:"#25433d",jade1:"#3f6b5d",jade2:"#82ad91",jade3:"#d3e4d2",
  red0:"#512b38",red1:"#8f4658",red2:"#c7787e",red3:"#f0c2b2",
  cloth0:"#49313d",cloth1:"#795465",cloth2:"#b17c89",cloth3:"#e9c8bf",
  ivory0:"#8f7d6a",ivory1:"#c9bda8",ivory2:"#e8dfca",ivory3:"#fff3e4",
  leather0:"#392a27",leather1:"#75513a",leather2:"#ad7951",leather3:"#e0b982",
  glass0:"#263b49",glass1:"#547d89",glass2:"#a7d0d3",glass3:"#e7fbef",
  veil0:"#6d7184a0",veil1:"#a7b8c7a0",veil2:"#dce8e7b8",veil3:"#fff3e4c8"
};
const OPT={w:W,h:H,pivot:[CX,62]};
const front=dir=>["s","se","sw"].includes(dir);
const back=dir=>["n","ne","nw"].includes(dir);
const side=dir=>dir==="e"||dir==="w";
const left=dir=>["w","nw","sw"].includes(dir);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dot=(c,x,y,k)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<H)c.px(x,y,k);};
function line(c,x0,y0,x1,y1,k){
  const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*2));
  for(let i=0;i<=n;i++)dot(c,x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,k);
}
function polygon(c,pts,k){
  let x0=W,y0=H,x1=0,y1=0;
  for(const q of pts){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
  const inside=(x,y)=>{
    let hit=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const a=pts[i],b=pts[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  };
  for(let y=Math.max(0,Math.floor(y0));y<=Math.min(H-1,Math.ceil(y1));y++)
    for(let x=Math.max(0,Math.floor(x0));x<=Math.min(W-1,Math.ceil(x1));x++){
      let hits=0;
      for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++)if(inside(x+(sx+.5)/3,y+(sy+.5)/3))hits++;
      if(hits>=5)dot(c,x,y,k);
    }
}
function ellipseRing(c,cx,cy,rx,ry,edge,base,light){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,d=dx*dx+dy*dy;
    if(d<=1&&d>=.56)dot(c,x,y,edge);
  }
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,d=dx*dx+dy*dy;
    if(d<=1&&d>=.56){
      const hi=dx<-.25&&dy<-.15;
      dot(c,x,y,hi?light:base);
    }
  }
}
function bar(c,x0,y0,x1,y1,edge,base,light){
  line(c,x0,y0,x1,y1,edge);
  const dx=x1-x0,dy=y1-y0,len=Math.max(1,Math.hypot(dx,dy));
  const ox=Math.round(-dy/len),oy=Math.round(dx/len);
  line(c,x0+ox,y0+oy,x1+ox,y1+oy,base);
  if(Math.abs(dx)>Math.abs(dy))line(c,x0+ox,y0+oy-1,x1+ox,y1+oy-1,light);
  else line(c,x0+ox-1,y0+oy,x1+ox-1,y1+oy,light);
}
function gem(c,x,y,size=2,main="jade2"){
  const s=size;
  polygon(c,[[x,y-s-1],[x+s+1,y],[x,y+s+1],[x-s-1,y]],"K");
  polygon(c,[[x,y-s],[x+s,y],[x,y+s],[x-s,y]],"gold1");
  polygon(c,[[x,y-s],[x,y],[x-s,y]],"gold3");
  polygon(c,[[x,y-s+1],[x+s-1,y],[x,y+s-1],[x-1,y]],main);
  dot(c,x-1,y-1,"jade3");dot(c,x+1,y+1,"jade0");
}
function headBase(frame,move){
  const idle=[0,0,1,0],walk=[-1,-1,0,0,-1,-1,0,0];
  return 5+(move==="walk"?walk[frame%8]:idle[frame%4]);
}
function draw(c,id,dir,frame=0,move="idle"){
  const flip=left(dir),isFront=front(dir),isBack=back(dir),isSide=side(dir);
  const mirror=x=>flip?2*CX-x:x;
  const p=(x,y,k)=>dot(c,mirror(x),y,k);
  const L=(x0,y0,x1,y1,k)=>line(c,mirror(x0),y0,mirror(x1),y1,k);
  const P=(pts,k)=>polygon(c,pts.map(q=>[mirror(q[0]),q[1]]),k);
  const y=headBase(frame,move),walking=move==="walk";
  const phase=walking?[0,0,1,1,0,-1,-1,0][frame%8]:[0,0,1,0][frame%4];
  const sway=walking?[0,0,1,1,0,-1,-1,0][frame%8]:0;
  const hairline=y+8,eyeY=y+13,maskY=y+18;
  const visibleFace=!isBack;
  const temple=flip?15:33;
  const crownY=y+1;

  if(id==="jade_pin"){
    // Slender lacquered pin with a jade drop and a layered gold blossom.
    L(25,crownY+5,35,crownY-1,"K");L(25,crownY+4,34,crownY-2,"gold0");
    L(25,crownY+3,33,crownY-2,"gold2");L(27,crownY+3,35,crownY-1,"gold3");
    P([[32,crownY-5],[34,crownY-4],[35,crownY-2],[33,crownY-1],[31,crownY-2],[30,crownY-4]],"K");
    P([[32,crownY-4],[34,crownY-3],[34,crownY-2],[32,crownY-2],[31,crownY-3]],"gold1");
    p(32,crownY-4,"gold3");p(34,crownY-3,"gold2");
    gem(c,35,crownY,1,"jade2");
    p(27,crownY+5,"gold3");
  }else if(id==="phoenix_comb"){
    // Sculpted phoenix crest; feather plates step outward instead of a flat comb line.
    P([[17,crownY+5],[18,crownY+2],[22,crownY+2],[24,crownY-1],[27,crownY+1],[31,crownY+1],[33,crownY+5],[31,crownY+7],[19,crownY+7]],"K");
    P([[18,crownY+4],[20,crownY+2],[23,crownY+3],[25,crownY],[27,crownY+2],[30,crownY+2],[32,crownY+5],[29,crownY+6],[20,crownY+6]],"gold1");
    P([[20,crownY+3],[23,crownY+3],[25,crownY+1],[26,crownY+3],[23,crownY+5],[20,crownY+5]],"gold2");
    P([[27,crownY+2],[30,crownY+3],[31,crownY+5],[28,crownY+5]],"gold3");
    for(let i=0;i<4;i++){
      L(20+i*3,crownY+5,19+i*3,crownY+8,"gold0");
      p(19+i*3,crownY+8,"gold2");
    }
    gem(c,25,crownY+1,1,"red2");
  }else if(id==="cloth_headband"){
    // Folded silk band, dark binding, lit upper fold, and a small side knot.
    P([[14,hairline-1],[18,hairline-3],[24,hairline-2],[30,hairline-3],[34,hairline-1],[33,hairline+2],[28,hairline+1],[22,hairline+2],[16,hairline+2]],"K");
    P([[15,hairline],[19,hairline-2],[24,hairline-1],[29,hairline-2],[33,hairline],[32,hairline+1],[27,hairline],[22,hairline+1],[17,hairline+1]],"cloth1");
    L(17,hairline-1,24,hairline-2,"cloth3");L(25,hairline-2,31,hairline-1,"cloth2");
    L(16,hairline+1,32,hairline+1,"cloth0");
    P([[31,hairline],[35,hairline+1],[36,hairline+4],[33,hairline+5],[30,hairline+3]],"K");
    P([[32,hairline+1],[35,hairline+2],[34,hairline+4],[32,hairline+3]],"cloth2");
    p(33,hairline+1,"cloth3");
  }else if(id==="scholar_crown"){
    // Formal openwork crown with gold filigree, jade cabochon and hanging side tabs.
    P([[17,crownY+5],[18,crownY+1],[20,crownY+2],[22,crownY-2],[24,crownY+1],[26,crownY-3],[28,crownY+1],[30,crownY+2],[31,crownY+5],[29,crownY+7],[19,crownY+7]],"K");
    P([[18,crownY+4],[20,crownY+3],[22,crownY-1],[24,crownY+2],[26,crownY-2],[28,crownY+3],[30,crownY+4],[29,crownY+6],[19,crownY+6]],"gold1");
    L(20,crownY+4,22,crownY+1,"gold3");L(28,crownY+4,26,crownY+1,"gold2");
    L(22,crownY+4,26,crownY+4,"gold0");
    gem(c,24,crownY+1,2,"jade2");
    p(24,crownY-3,"gold3");p(19,crownY+5,"gold2");p(29,crownY+5,"gold3");
  }else if(id==="round_glasses"&&visibleFace){
    // Fine round metal rims with dark inner edges and individually placed lens glints.
    const eyes=isSide?[flip?20:28]:[20,28];
    for(const x of eyes){
      ellipseRing(c,mirror(x),eyeY,3.7,3.4,"K","gold1","gold3");
      p(x-2,eyeY-2,"gold3");p(x+2,eyeY+2,"gold0");
      p(x,eyeY,"glass1");p(x-1,eyeY-1,"glass3");
    }
    if(!isSide){
      L(23,eyeY,25,eyeY,"K");L(23,eyeY-1,25,eyeY-1,"gold2");
      L(16,eyeY-1,17,eyeY-2,"gold1");L(31,eyeY-2,32,eyeY-1,"gold1");
    }else{
      const x=flip?23:25;L(x,eyeY,x+1,eyeY,"gold2");
      L(flip?16:32,eyeY-1,flip?18:30,eyeY-1,"K");
    }
  }else if(id==="half_mask"&&visibleFace){
    // Shaped cloth mask with cheek contour, layered fold, tie and tiny stitch marks.
    if(isSide){
      P([[22,maskY-1],[28,maskY-2],[31,maskY],[30,maskY+4],[25,maskY+5],[22,maskY+2]],"K");
      P([[23,maskY],[28,maskY-1],[30,maskY+1],[29,maskY+3],[24,maskY+4]],"cloth1");
      L(25,maskY+1,29,maskY+1,"cloth3");L(24,maskY+3,28,maskY+3,"cloth0");
      L(29,maskY,34,maskY-2,"cloth0");
    }else{
      P([[15,maskY],[18,maskY-2],[24,maskY-1],[30,maskY-2],[33,maskY],[31,maskY+5],[25,maskY+7],[19,maskY+5]],"K");
      P([[16,maskY],[19,maskY-1],[24,maskY],[29,maskY-1],[32,maskY],[30,maskY+4],[25,maskY+6],[19,maskY+4]],"cloth1");
      P([[18,maskY],[23,maskY+1],[28,maskY],[30,maskY+1],[28,maskY+3],[23,maskY+3],[19,maskY+2]],"cloth2");
      L(19,maskY+3,23,maskY+4,"cloth3");L(25,maskY+4,29,maskY+3,"cloth0");
      L(16,maskY+1,13,maskY-1,"cloth0");L(32,maskY+1,35,maskY-1,"cloth0");
      p(20,maskY+2,"ivory2");p(28,maskY+2,"ivory1");
    }
  }else if(id==="bead_tassel"){
    // Bead chain with metal spacers and a silk tassel whose end moves by a pixel.
    const x=temple;
    L(x,crownY+5,x+2,crownY+11,"gold0");
    p(x,crownY+5,"gold3");p(x+1,crownY+7,"gold2");
    gem(c,x+2,crownY+10,1,"jade2");
    p(x+2,crownY+13,"gold3");p(x+2,crownY+15,"jade3");
    L(x+2,crownY+12,x+2+sway,crownY+19,"cloth1");
    L(x+1,crownY+16,x+sway,crownY+21,"K");
    L(x+2,crownY+17,x+2+sway,crownY+22,"cloth2");
    L(x+3,crownY+16,x+4+sway,crownY+20,"cloth3");
    p(x+2+sway,crownY+23,"gold2");
  }else if(id==="forehead_gem"&&visibleFace){
    // Raised setting and faceted jewel centred above the brows.
    P([[21,eyeY-5],[24,eyeY-8],[27,eyeY-5],[26,eyeY-2],[22,eyeY-2]],"K");
    P([[22,eyeY-5],[24,eyeY-7],[26,eyeY-5],[25,eyeY-3],[23,eyeY-3]],"gold2");
    gem(c,24,eyeY-5,2,"red2");
    p(24,eyeY-8,"gold3");p(22,eyeY-4,"jade3");
  }else if(id==="moon_veil"){
    // Veil attaches to both sides of the crown; translucent folds taper toward the shoulders.
    P([[16,crownY+3],[18,crownY+5],[17,crownY+15],[20,crownY+25],[18,crownY+29],[14,crownY+18],[13,crownY+9]],"veil0");
    P([[32,crownY+3],[30,crownY+5],[31,crownY+15],[28,crownY+25],[30,crownY+29],[34,crownY+18],[35,crownY+9]],"veil0");
    L(16,crownY+5,15,crownY+17,"veil3");L(15,crownY+17,18,crownY+26,"veil2");
    L(32,crownY+5,33,crownY+17,"veil3");L(33,crownY+17,30,crownY+26,"veil2");
    L(17,crownY+7,17,crownY+14,"veil1");L(31,crownY+7,31,crownY+14,"veil1");
    if(isFront){p(17,crownY+15,"gold2");p(31,crownY+15,"gold2");}
  }else if(id==="travel_goggles"&&visibleFace){
    // Leather bridge, reinforced rings, glass depth and separate pale reflections.
    const eyes=isSide?[flip?20:28]:[20,28];
    for(const x of eyes){
      ellipseRing(c,mirror(x),eyeY,4.1,3.6,"K","leather1","leather3");
      L(x-2,eyeY-2,x+1,eyeY-2,"leather3");
      p(x,eyeY,"glass0");p(x-1,eyeY-1,"glass2");p(x+1,eyeY+1,"glass1");
      p(x-2,eyeY+1,"gold1");
    }
    if(!isSide){
      L(23,eyeY,25,eyeY,"leather0");L(23,eyeY-1,25,eyeY-1,"leather3");
      L(15,eyeY-2,16,eyeY-2,"leather1");L(32,eyeY-2,33,eyeY-2,"leather1");
    }
  }else if(id==="ribbon_bow"){
    // Two padded silk loops, folded centre knot, and long stepped ribbon tails.
    P([[30,crownY+6],[33,crownY+2],[37,crownY+3],[38,crownY+7],[35,crownY+10],[31,crownY+9]],"K");
    P([[28,crownY+7],[29,crownY+3],[32,crownY+2],[34,crownY+5],[32,crownY+9]],"K");
    P([[31,crownY+6],[33,crownY+3],[36,crownY+4],[37,crownY+7],[34,crownY+9]],"red1");
    P([[29,crownY+6],[30,crownY+4],[32,crownY+3],[33,crownY+6],[31,crownY+8]],"red2");
    L(32,crownY+4,35,crownY+4,"red3");p(30,crownY+5,"cloth3");
    P([[32,crownY+8],[35,crownY+9],[37,crownY+17],[35,crownY+19],[33,crownY+13]],"K");
    P([[33,crownY+9],[35,crownY+10],[36,crownY+16],[35,crownY+17]],"red1");
    L(30,crownY+8,28,crownY+15,"red0");L(29,crownY+10,27,crownY+16,"red2");
    p(32,crownY+7,"gold2");
  }else if(id==="earring_chains"&&visibleFace&&!isBack){
    // Small ear hooks, graduated links, jade beads and carved pendant drops.
    const x=temple;
    L(x,crownY+13,x,crownY+18,"gold0");p(x,crownY+13,"gold3");
    p(x,crownY+16,"gold2");p(x+1,crownY+18,"gold3");
    L(x+1,crownY+19,x+2,crownY+22,"gold1");
    gem(c,x+2,crownY+23,1,"jade2");
    p(x+1,crownY+22,"gold3");p(x+2,crownY+25,"gold2");
    if(isFront){
      const other=flip?33:15;
      L(other,crownY+13,other,crownY+17,"gold0");p(other,crownY+13,"gold3");
      gem(c,other,crownY+20,1,"jade2");
      p(other,crownY+22,"gold2");
    }
  }
}
pal(PAL);
for(const item of [
  "jade_pin","phoenix_comb","cloth_headband","scholar_crown","round_glasses","half_mask",
  "bead_tassel","forehead_gem","moon_veil","travel_goggles","ribbon_bow","earring_chains"
]){
  sprite("human_preview_accessory_"+item,OPT,c=>draw(c,item,"s",0,"idle"));
  for(const dir of DIRS){
    anim("accessory_"+item+"_idle_"+dir,{...OPT,frames:4,fps:3},c=>draw(c,item,dir,c.frame,"idle"));
    anim("accessory_"+item+"_walk_"+dir,{...OPT,frames:8,fps:10},c=>draw(c,item,dir,c.frame,"walk"));
  }
}
