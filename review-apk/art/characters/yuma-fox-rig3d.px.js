// Merzkava Pocket — YUMA, Sakura Lantern Keeper.
// Production PXL character source. Augusto Carvalho pxl / rig3d.
// 48x64 gameplay cell; 48 px body, fox ears above the crown.
// 8 authored headings. Every frame is re-rendered as pixel art from the rig;
// no SVG, bitmap rotation, CSS animation, interpolation blur, or mixed pixel sizes.

pal({
  k:"#211a28",
  a:"#716b82", b:"#7f7896", c:"#b1a9c2", d:"#d9d3e0", e:"#f4f1f6",
  f:"#8c4a4a", g:"#d98f86", h:"#f5c4b0", i:"#ffe6d8",
  j:"#3b2230", J:"#7a2434", K:"#b03a48", L:"#fff8f2",
  m:"#a52e4e", n:"#c8344a", o:"#d9707f", p:"#f2a7b5", q:"#fbe3e6",
  r:"#2a5f66", s:"#3f8f87", t:"#6fbfa8", u:"#a8e0cf",
  v:"#2d2433", w:"#4a3a4e", x:"#8a3a2e", y:"#d84a3a",
  G:"#9b7044", H:"#c89e57", I:"#e8c27a", Q:"#f2c75c",
  R:"#8a3a2e", S:"#d84a3a", T:"#ed7655",
  U:"#f2c75c", V:"#fce7a3", W:"#fff8e8",
  X:"#5d806a", Y:"#94b18a", Z:"#d7a15e",
})
ramps("kabcde", "kfghi", "kjJKL", "kmnopq", "k rstu".replaceAll(" ",""), "kvwxy", "GHIQ", "RST", "UVW")

const { add, sub, mul, dot, len, cross, unit } = vec;
const rad = d => d * Math.PI / 180;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const ALL8 = ["n","ne","e","se","s","sw","w","nw"];
const W = 48, H = 64, OX = 24, OY = 62;
const HIP = 14, TORSO = 12, NECK = 2.5;
const THIGH = 7, SHIN = 6.5, UPPER = 4.7, FORE = 4.1;
const HIPW = 3.1, SHW = 5.2;
const SKIRT = 14.5, WAIST = 3.9;
const LIGHT3 = [-0.55,-0.45,0.70];

// The chest bow is drawn at 1x and attached as a decal to the model.
sprite("_yuma_chest_bow",{w:11,h:8,pivot:[5,3]},c=>{
  c.px(1,2,"n");c.px(2,1,"o");c.px(3,2,"p");c.px(2,3,"o");
  c.px(9,2,"n");c.px(8,1,"p");c.px(7,2,"o");c.px(8,3,"p");
  c.hline(4,2,3,"n");c.hline(4,3,3,"q");c.px(5,2,"q");
  c.vline(4,4,3,"n");c.px(4,6,"p");
  c.vline(7,4,3,"o");c.px(7,6,"q");
  c.px(5,1,"I");c.px(6,1,"I");
});

// A compact 3D head with a large fox-girl silhouette, soft hime-cut fringe,
// long side locks, two tapered ears, sakura pin and trailing bell ribbons.
const FOX_SKULL = sdf.ellipsoid([7.9,6.8,8.8]).mat("fghi");
const HAIR_CAP = sdf.ellipsoid([8.8,7.2,9.3]).at(0,-0.7,1.3)
  .subtract(
    sdf.ellipsoid([7.1,6.1,6.1]).at(0,4.8,-2.5),
    sdf.capsule([-0.9,4.8,5.4],[-0.9,-1.1,7.2],0.65),
    {smooth:0.5}
  );
const HAIR_NAPE = sdf.ellipsoid([7.5,5.0,5.2]).at(0,-3.1,-3.4);
const HAIR_LOCKS = sdf.union(
  sdf.capsule([-6.4,1.5,2.8],[-6.7,1.0,-10.8],2.2,1.35),
  sdf.capsule([-5.1,1.1,-4.0],[-6.0,0.4,-15.3],1.7,0.9),
  sdf.capsule([6.2,1.4,2.7],[6.7,0.7,-10.6],2.2,1.35),
  sdf.capsule([5.0,1.0,-4.2],[5.9,0.5,-14.5],1.7,0.85),
  sdf.capsule([-3.0,2.0,7.0],[-4.7,2.4,3.8],1.2,0.75),
  sdf.capsule([2.8,2.0,7.2],[4.8,2.3,4.0],1.2,0.75),
  {smooth:0.5}
);
const HAIR_FRINGE = sdf.union(
  sdf.capsule([-6.4,4.2,7.1],[-3.8,5.4,8.1],1.35,1.1),
  sdf.capsule([-3.8,5.0,8.0],[-1.2,5.7,7.6],1.15,0.9),
  sdf.capsule([-1.0,5.7,7.7],[1.7,5.5,7.7],1.0,1.1),
  sdf.capsule([1.6,5.4,7.7],[4.2,5.0,7.8],1.1,1.0),
  sdf.capsule([4.0,5.0,7.8],[6.7,4.0,6.7],1.0,0.7),
  {smooth:0.35}
);
const FOX_EARS = sdf.union(
  sdf.capsule([-5.0,-0.2,7.0],[-7.1,0.0,16.8],2.0,0.18),
  sdf.capsule([5.0,-0.2,7.0],[7.1,0.0,16.8],2.0,0.18),
  sdf.capsule([-5.7,1.35,8.6],[-7.0,1.45,14.2],0.85,0.10).mat("p"),
  sdf.capsule([5.7,1.35,8.6],[7.0,1.45,14.2],0.85,0.10).mat("p"),
  {smooth:0.22}
).mat("abcde");
const FOX_FLOWER = sdf.union(
  sdf.ellipsoid([1.25,0.85,1.25]).at(-7.4,3.1,4.8),
  sdf.ellipsoid([1.25,0.85,1.25]).at(-5.5,3.1,4.8),
  sdf.ellipsoid([0.9,0.9,1.0]).at(-6.45,3.1,6.1),
  sdf.ellipsoid([0.9,0.9,1.0]).at(-6.45,3.1,3.5),
  sdf.ellipsoid([1.25,0.85,1.1]).at(-6.45,3.1,4.8),
  {smooth:0.18}
).mat("pq");
const FOX_BELL = sdf.sphere(0.95).at(-5.5,2.8,1.6).mat("I");
const FOX_HEAD = sdf.union(FOX_SKULL,HAIR_CAP,HAIR_NAPE,HAIR_LOCKS,HAIR_FRINGE,FOX_EARS,FOX_FLOWER,FOX_BELL,{smooth:0.18}).noise({amp:0.10,scale:1.8,seed:17});

// Hand-painted face patches for five views. The skull and hair are modeled;
// eyes, lashes, mouth and blush are redrawn as pixel clusters per view.
const FACE_CALM = {
  s:[
    ".....................",".....................",
    ".......ccccc.........",".....cciiiiiic.......",
    "....fhhhhhhhhi f.....".replaceAll(" ",""),
    "...fhhhhhhhhhhif.....","...fjjj...jjjif......",
    "...fJKK...KKJif......","...fJKKL..LKKJf......",
    "...fjjj...jjjif......","....fhhhhhhhhi f.....".replaceAll(" ",""),
    ".....fhhhhhhi f......".replaceAll(" ",""),
    "......ffhhhff........","........ff............",
    ".....................",".....................",
    "....................."
  ].join("\n"),
  sw:[
    ".....................",".....................",
    "......ccccc..........","....cciiiiiic.........",
    "...fhhhhhhhhi f.......".replaceAll(" ",""),
    "..fhhhhhhhhhhif.......","..fjjj...jjJf.........",
    "..fJKK...KKJf.........","..fJKKL..LJf..........",
    "...fjjj...jjf.........","....fhhhhhhif.........",
    ".....fhhhhhif.........","......ffhhf...........",
    "........fff............",".....................",
    ".....................","....................."
  ].join("\n"),
  w:[
    ".....................",".....................",
    "......ccccc..........","....cciiiiiic.........",
    "...fhhhhhhhhif........",
    "..fhhhhhhhhhhif........",
    "..fjjj...jjJf..........",
    "..fJKK...KKJf..........",
    "...fJKKL.LJf...........",
    "....fjjj..jf............",
    ".....fhhhhif............",
    "......fhhf..............",
    ".......ff...............",
    ".....................",".....................",
    ".....................","....................."
  ].join("\n"),
  nw:[
    ".....................",".....................",
    "..........ccccc......",".........cciiiiiic....",
    "........fhhhhhhhhi f..".replaceAll(" ",""),
    ".......fhhhhhhhhhhif..",
    ".......fJjJ...jjjf....",
    ".......fJKK...KKJf....",
    "........fJKKL.LJf.....",
    ".........fjjj..jf.....",
    "..........fhhhhif.....",
    "...........fhhf.......",
    "............ff........",
    ".....................",".....................",
    ".....................","....................."
  ].join("\n"),
  n:[
    ".....................",".....................",
    ".......ccccc.........",".....ccdddddcc.......",
    "....cdddddddddcc.....","...cdddddddddddcc....",
    "...cdddddddddddcc....","....ccdddddddcc......",
    "......ccccc..........",".....................",
    ".....................",".....................",
    ".....................",".....................",
    ".....................",".....................",
    "....................."
  ].join("\n")
};
const FACE_LAUGH = {
  ...FACE_CALM,
  s:FACE_CALM.s.replace("........ff............","........fKKf.........."),
  sw:FACE_CALM.sw.replace("........fff............",".......fKKf............")
};
const FACE_SHOUT = {
  ...FACE_CALM,
  s:FACE_CALM.s.replace("........ff............",".......fKKKf.........."),
  sw:FACE_CALM.sw.replace("........fff............","......fKKKf............")
};
const FACE_BLINK = {
  ...FACE_CALM,
  s:FACE_CALM.s
    .replace("...fjjj...jjjif......","...fppp...pppif......")
    .replace("...fJKK...KKJif......","...fjjj...jjjif......")
    .replace("...fJKKL..LKKJf......","...fppp...pppJf......"),
  sw:FACE_CALM.sw
    .replace("..fjjj...jjJf.........","..fppp...ppJf.........")
    .replace("..fJKK...KKJf.........","..fjjj...jjJf.........")
    .replace("..fJKKL..LJf..........","..fppp...ppJf.........."),
  w:FACE_CALM.w
    .replace("..fjjj...jjJf..........","..fppp...ppJf..........")
    .replace("..fJKK...KKJf..........","..fjjj...jjJf.........."),
  nw:FACE_CALM.nw
    .replace(".......fJjJ...jjjf....",".......fppp...pppf....")
    .replace(".......fJKK...KKJf....",".......fjjj...jjJf....")
};
const FACE_SMILE = {
  ...FACE_CALM,
  s:FACE_CALM.s.replace("........ff............",".......fJpf..........."),
  sw:FACE_CALM.sw.replace("........fff............",".......fJpf............"),
  w:FACE_CALM.w.replace(".......ff...............","......fJpf.............."),
  nw:FACE_CALM.nw.replace("............ff........","...........fJpf.......")
};
const HEAD_OPTS = {
  pitch:12,light:LIGHT3,ink:"k",
  anchor:{s:[10,9],sw:[10,9],w:[10,9],nw:[10,9],n:[10,9]}
};
views("_yuma_head_calm",FOX_HEAD,{...HEAD_OPTS,retouch:FACE_CALM});
views("_yuma_head_smile",FOX_HEAD,{...HEAD_OPTS,retouch:FACE_SMILE});
views("_yuma_head_blink",FOX_HEAD,{...HEAD_OPTS,retouch:FACE_BLINK});
views("_yuma_head_laugh",FOX_HEAD,{...HEAD_OPTS,retouch:FACE_LAUGH});
views("_yuma_head_shout",FOX_HEAD,{...HEAD_OPTS,retouch:FACE_SHOUT});

// A compact hanging bow, a tiny gold flower centre and a waist knot.
sprite("_yuma_obi_knot",{w:9,h:8,pivot:[4,3]},c=>{
  c.hline(1,2,3,"n");c.hline(5,2,3,"o");
  c.px(2,1,"p");c.px(6,1,"q");
  c.hline(3,3,3,"q");c.hline(2,4,5,"n");
  c.px(3,5,"p");c.px(6,5,"o");
  c.px(4,6,"I");c.px(5,6,"I");
});
sprite("_yuma_sakura",{w:13,h:13,pivot:[6,6]},c=>{
  c.px(6,1,"q");c.hline(5,2,3,"p");c.px(3,4,"q");c.px(2,5,"p");
  c.hline(1,6,3,"q");c.px(3,8,"p");c.px(4,9,"q");
  c.hline(5,10,3,"p");c.px(8,9,"q");c.px(9,8,"p");
  c.px(10,6,"q");c.px(9,5,"p");c.px(8,4,"q");
  c.px(6,6,"I");c.px(6,7,"Q");c.px(4,5,"q");c.px(8,7,"q");
});

// Eight-frame idle: a quiet breath, a slow gaze and a tail response one beat late.
function idlePose(i,yaw){
  const breath=[0,0.25,0.6,1,0.8,0.35,0,-0.15][i%8];
  const tail=[-5,-3,0,3,5,4,1,-3][i%8];
  return {
    down:breath*0.45,lean:1+breath*0.25,twist:[0,0,1,1,0,-1,-1,0][i%8],
    head:[0,0,-2,-2,0,2,1,0][i%8],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[0,1,-7]],
    tail,tailLift:[0,0.3,0.8,1.1,0.9,0.5,0.1,0][i%8],
    skirt:[0,0.2,0.5,0.3,0,-0.2,-0.3,0][i%8],
    lantern:[0,0,-0.3,-0.6,-0.2,0,0.3,0][i%8],expression:i%32===25?"blink":"smile"
  };
}
function walkPose(i,yaw){
  const g=gait(i/8,{heading:180-yaw,front:{lift:[0,0,0,1,3,1,0,0]},diagonal:{bob:[0,0.4,1.1,0.5,0,0.5,1.1,0.4]}});
  const ph=2*Math.PI*i/8,side=g.view==="profile"||g.view==="diagonal";
  const feet=g.feet.map(([fwd],k)=>[fwd,k?HIPW:-HIPW]);
  const lift=g.feet.map(([,up])=>up);
  const hands=g.hands.map(([fwd,up],k)=>[fwd,side?(k?0.65-0.5*g.a:-0.65+0.5*g.a):(k?0.8:-0.8),-7+up]);
  return {
    feet,lift,hands,down:g.bob,lean:side?4:2.2,turn:0,
    sway:Math.sin(ph-0.8),trail:1+0.35*Math.abs(Math.sin(ph-0.8)),
    tail:[-9,-6,-1,5,9,7,2,-5][i%8],
    tailLift:[1,2,3,3,2,1,0,0][i%8],
    skirt:[-1,-0.3,0.8,1.6,1,0,-1,-1.5][i%8],
    lantern:[0,-0.2,-0.6,-0.2,0,0.3,0.5,0.2][i%8],
    expression:"smile"
  };
}
function runPose(i,yaw){
  const g=gait(i/8,{heading:180-yaw,front:{lift:[0,1,3,5,3,1,0,0]},diagonal:{bob:[0,1,2,1,0,1,2,1],lift:[0,1,3,4,3,1,0,0]}});
  const ph=2*Math.PI*i/8;
  const feet=g.feet.map(([fwd],k)=>[fwd*1.45,k?HIPW:-HIPW]);
  const lift=g.feet.map(([,up])=>up*1.25);
  const hands=g.hands.map(([fwd,up],k)=>[fwd*1.2,k?0.9:-0.9,-7+up*1.25]);
  return {
    feet,lift,hands,down:g.bob+1.2,lean:8,turn:0,
    sway:Math.sin(ph-1)*1.5,trail:2.2,air:i%8===1,
    tail:[-14,-10,-3,7,14,10,2,-9][i%8],
    tailLift:[4,5,6,6,5,3,2,3][i%8],
    skirt:[-2,-1,1,3,2,0,-2,-3][i%8],
    lantern:[-1,-2,-3,-2,0,1,0,-1][i%8],
    expression:"calm"
  };
}
function attackPose(i,yaw){
  const keys=[
    {turn:0,twist:-4,head:8,down:1,lean:1,hands:[[0,-1,-7],[0,1,-7]],feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],tail:-4,skirt:0,lantern:0,expression:"grit"},
    {turn:-8,twist:-18,head:18,down:3,lean:-2,hands:[[-2,-2,-4],[-3,2,-4]],feet:[[-1,-HIPW],[0,HIPW]],lift:[0,0],tail:-9,skirt:-1,lantern:-1,expression:"grit"},
    {turn:-14,twist:-32,head:22,down:4,lean:-4,hands:[[-3,-3,-2],[-5,3,-1]],feet:[[-2,-HIPW],[1,HIPW]],lift:[0,0],tail:-14,skirt:-2,lantern:-2,expression:"grit"},
    {turn:12,twist:18,head:-8,down:1,lean:10,hands:[[2,-3,-5],[8,3,-3]],feet:[[2,-HIPW],[-1,HIPW]],lift:[0,1],tail:12,skirt:3,lantern:2,expression:"shout"},
    {turn:25,twist:35,head:-12,down:0,lean:15,hands:[[3,-3,-6],[13,3,-3]],feet:[[4,-HIPW],[-2,HIPW]],lift:[0,0],tail:18,skirt:5,lantern:4,expression:"shout"},
    {turn:18,twist:22,head:-8,down:2,lean:9,hands:[[2,-2,-7],[10,2,-5]],feet:[[3,-HIPW],[-1,HIPW]],lift:[0,0],tail:15,skirt:4,lantern:3,expression:"shout"},
    {turn:8,twist:8,head:0,down:3,lean:4,hands:[[0,-1,-8],[4,1,-7]],feet:[[1,-HIPW],[0,HIPW]],lift:[0,0],tail:8,skirt:2,lantern:1,expression:"grit"},
    {turn:2,twist:0,head:0,down:2,lean:2,hands:[[0,-1,-7],[1,1,-7]],feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],tail:2,skirt:0,lantern:0,expression:"calm"},
    {turn:0,twist:0,head:0,down:1,lean:1,hands:[[0,-1,-7],[0,1,-7]],feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],tail:-2,skirt:-1,lantern:0,expression:"calm"},
    {turn:0,twist:0,head:0,down:0,lean:1,hands:[[0,-1,-7],[0,1,-7]],feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],tail:-1,skirt:0,lantern:0,expression:"calm"}
  ];
  return keys[i%keys.length];
}
function skillPose(i,yaw){
  const charge=[0,0.2,0.55,0.9,1,1,1,1,0.6,0.2,0,0,0,0,0,0][i%16];
  const release=[0,0,0,0,0,0,0.2,0.6,1,1,0.8,0.5,0.2,0,0,0][i%16];
  const hands=[[0,-1,-7],[0,1,-7]];
  hands[1]=[2+release*6,1,-7+charge*9-release*2];
  hands[0]=[1+release*3,-1,-7+charge*9-release*2];
  return {
    turn:[0,-2,-5,-9,-11,-10,-6,0,8,12,10,5,2,0,0,0][i%16],
    twist:[0,-8,-16,-24,-28,-25,-18,-5,15,25,18,9,2,0,0,0][i%16],
    head:[0,2,4,6,8,7,4,0,-4,-5,-3,0,0,0,0,0][i%16],
    down:2-charge*1.4+release,lean:-2+release*10,
    hands,feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    tail:[-2,-4,-7,-11,-14,-12,-8,-2,8,15,12,6,1,-2,-1,0][i%16],
    tailLift:[0,1,2,3,4,4,3,2,3,4,4,3,2,1,0,0][i%16],
    skirt:[0,-1,-2,-3,-3,-2,-1,1,4,5,3,1,0,-1,0,0][i%16],
    lantern:[0,-1,-2,-3,-4,-4,-3,-1,1,2,1,0,0,0,0,0][i%16],
    expression:i>=8&&i<=10?"shout":"grit",foxfire:release,elbow:charge*9-release*2>=0?[-1,0.5,-1]:[-1,0.5,0]
  };
}
function jumpPose(i,yaw){
  const lift=[0,1,3,5,6,5,3,0][i%8];
  const squash=[0,-1,-1,0,0,0,1,2][i%8];
  return {
    down:squash,lean:[0,2,4,3,0,-1,1,3][i%8],
    feet:[[0,-HIPW],[0,HIPW]],
    lift:[lift,lift*0.85],
    hands:[[1,-1,-7+lift*0.6],[-1,1,-7+lift*0.6]],
    tail:[-4,-8,-11,-8,-2,7,11,4][i%8],
    tailLift:[0,2,4,5,5,4,2,0][i%8],
    skirt:[0,1,2,3,2,1,-1,-2][i%8],
    lantern:[0,-1,-2,-3,-3,-2,-1,0][i%8],
    expression:"grit",air:true
  };
}
function lungePose(i,yaw){
  const g=gait(i/4,{heading:180-yaw});
  const keys=[
    {down:2,lean:-2,turn:-3,twist:-14,feet:[[0,-HIPW],[-1,HIPW]],lift:[0,0],hands:[[0,-1,-7],[-3,1,-5]],tail:-8,skirt:-1,lantern:-2},
    {down:3,lean:-6,turn:-8,twist:-24,feet:[[-2,-HIPW],[0,HIPW]],lift:[0,0],hands:[[-1,-1,-5],[1,1,-3]],tail:-12,skirt:-2,lantern:-3},
    {down:1,lean:12,turn:8,twist:22,feet:[[3,-HIPW],[-2,HIPW]],lift:[0,1],hands:[[2,-1,-6],[12,1,-4]],tail:15,skirt:4,lantern:3},
    {down:0,lean:16,turn:12,twist:30,feet:[[5,-HIPW],[-3,HIPW]],lift:[0,0],hands:[[3,-1,-7],[15,1,-4]],tail:18,skirt:5,lantern:4},
    {down:1,lean:9,turn:6,twist:16,feet:[[2,-HIPW],[-1,HIPW]],lift:[0,0],hands:[[2,-1,-7],[9,1,-6]],tail:13,skirt:3,lantern:2},
    {down:2,lean:5,turn:2,twist:8,feet:[[1,-HIPW],[0,HIPW]],lift:[0,0],hands:[[1,-1,-7],[3,1,-7]],tail:7,skirt:2,lantern:1},
    {down:1,lean:2,turn:0,twist:2,feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],hands:[[0,-1,-7],[1,1,-7]],tail:2,skirt:0,lantern:0},
    {down:0,lean:1,turn:0,twist:0,feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],hands:[[0,-1,-7],[0,1,-7]],tail:0,skirt:0,lantern:0}
  ];
  return keys[i%8];
}
function fishPose(i,yaw){
  const dip=[0,1,2,2,1,0,0,0][i%8];
  return {
    down:5+dip,lean:5,feet:[[1,-HIPW],[-1,HIPW]],lift:[0,0],
    hands:[[2,-1,-10],[7,1,-5+Math.sin(i*Math.PI/4)]],
    tail:[-3,-1,2,4,3,1,-1,-3][i%8],tailLift:1,
    skirt:[0,1,1,0,-1,-1,0,0][i%8],
    lantern:8,rod:true,expression:"calm"
  };
}
function meditatePose(i,yaw){
  return {
    down:10,lean:0,turn:0,feet:[[1,-2],[-1,2]],lift:[0,0],
    hands:[[0,-1,-11],[0,1,-11]],
    tail:[-4,-3,-1,1,3,2,0,-2][i%8],tailLift:3,
    skirt:[0,0.2,0.4,0.2,0,-0.2,-0.4,-0.2][i%8],
    lantern:12,expression:"calm",aura:true
  };
}
function interactPose(i,yaw){
  return {
    down:[0,1,2,1,0,0,1,0][i%8],lean:[0,2,4,2,0,0,1,0][i%8],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[1,1,-7-i%2]],
    tail:[0,1,2,1,0,-1,-2,-1][i%8],tailLift:0,
    lantern:[0,1,2,2,1,0,0,0][i%8],expression:"calm"
  };
}
function pickupPose(i,yaw){
  const reach=[0,0.4,0.8,1,0.8,0.4,0,0][i%8];
  return {
    down:reach*5,lean:reach*8,feet:[[2,-HIPW],[-1,HIPW]],lift:[0,0],
    hands:[[0,-1,-7+reach*4],[1,1,-7+reach*4]],elbow:[-1,0.5,0],
    tail:[-2,-4,-7,-8,-5,-2,0,1][i%8],tailLift:2,
    skirt:[0,1,2,2,1,0,-1,0][i%8],
    lantern:reach?8:0,expression:"calm"
  };
}
function bowPose(i,yaw){
  const amount=[0,0.35,0.7,1,0.7,0.3,0,0][i%8];
  return {
    down:amount*2,lean:amount*12,head:amount*12,twist:amount*4,
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7+amount*2],[0,1,-7+amount*2]],
    tail:[0,1,2,3,2,1,0,-1][i%8],tailLift:2,
    skirt:amount*2,lantern:amount*6,expression:"calm"
  };
}
function laughPose(i,yaw){
  return {
    down:[0,1,2,1,0,-1,0,1][i%8],lean:[0,1,2,1,0,-1,0,1][i%8],
    head:[0,-2,-3,-1,1,2,1,0][i%8],twist:[0,2,4,2,0,-2,-3,0][i%8],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[1,1,-7]],
    tail:[0,3,6,4,0,-4,-6,-2][i%8],tailLift:2,
    lantern:0,expression:"laugh"
  };
}
function hitPose(i,yaw){
  return {
    down:[0,-1,1,0][i%4],lean:[-5,-9,4,0][i%4],
    turn:[-3,-8,3,0][i%4],twist:[-8,-16,7,0][i%4],
    feet:[[0,-HIPW],[-1,HIPW]],lift:[0,0],
    hands:[[-2,-1,-4],[2,1,-3]],
    tail:[-12,-16,8,1][i%4],tailLift:[0,2,3,1][i%4],
    skirt:[-1,-2,2,0][i%4],lantern:[-2,-4,2,0][i%4],
    expression:"shout"
  };
}
function knockbackPose(i,yaw){
  return {
    down:[1,0,1,1,1,1][i%6],lean:[-4,-10,-14,-9,-3,0][i%6],
    turn:[0,-4,-8,-4,0,0][i%6],twist:[0,-12,-20,-10,0,0][i%6],
    feet:[[-1,-HIPW],[1,HIPW]],lift:[0,1],
    hands:[[-2,-2,-3],[2,2,-2]],
    tail:[-12,-16,-18,-10,0,3][i%6],tailLift:4,
    skirt:[-1,-3,-4,-2,0,0][i%6],lantern:[-1,-3,-4,-1,0,0][i%6],
    expression:"shout"
  };
}
function deathPose(i,yaw){
  return {
    down:[0,2,5,8,11,13,14,14,14,14][i%10],
    lean:[0,2,5,8,10,8,5,3,2,1][i%10],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[1,1,-7]],
    tail:[-2,-5,-8,-10,-8,-5,-2,0,0,0][i%10],tailLift:5,
    skirt:[0,1,2,3,4,4,3,2,1,0][i%10],
    lantern:[0,1,2,4,6,8,8,8,8,8][i%10],expression:"grit"
  };
}
function revivePose(i,yaw){
  return {
    down:[14,12,9,6,3,1,0,0,0,0][i%10],
    lean:[8,6,4,2,0,-2,-1,0,0,0][i%10],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[0,1,-7+([0,1,2,3,4,5,4,2,1,0][i%10])]],
    tail:[0,1,4,7,9,8,5,2,0,0][i%10],tailLift:5,
    skirt:[2,2,1,0,-1,-1,0,0,0,0][i%10],
    lantern:[8,7,5,3,1,-2,-3,-2,0,0][i%10],
    expression:"calm",foxfire:i>=5?1:0
  };
}
function lanternPose(i,yaw,raise){
  const f=raise?[0,0.3,0.65,1,1,1]:[1,1,0.7,0.35,0,0];
  const lift=f[i%6];
  return {
    down:0,lean:1,turn:0,twist:lift*4,
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7+lift*12],[1,1,-7+lift*12]],
    elbow:lift>0.6?[-1,0.5,-1]:[-1,0.5,0],
    tail:[0,1,2,2,1,0][i%6],tailLift:1,
    lantern:-lift*8,expression:"calm",foxfire:lift
  };
}
function sitPose(i,yaw){
  return {
    down:9,lean:0,feet:[[2,-2],[-2,2]],lift:[0,0],
    hands:[[0,-1,-10],[0,1,-10]],
    tail:[-3,-2,0,2,3,2,0,-2][i%8],tailLift:3,
    lantern:10,expression:"calm"
  };
}
function sleepPose(i,yaw){
  return {
    down:11,lean:-3,head:-8,
    feet:[[2,-2],[-2,2]],lift:[0,0],
    hands:[[0,-1,-11],[0,1,-11]],
    tail:[-4,-5,-6,-5,-4,-3,-2,-3][i%8],tailLift:4,
    lantern:14,expression:"calm"
  };
}
function victoryPose(i,yaw){
  return {
    down:[0,0,1,1,0,0,0,0][i%8],lean:[0,2,4,3,1,0,0,0][i%8],
    turn:[0,3,6,8,5,2,0,0][i%8],twist:[0,4,8,6,2,0,0,0][i%8],
    feet:[[0,-HIPW],[0,HIPW]],lift:[0,0],
    hands:[[0,-1,-7],[1,1,-7+([0,2,4,7,7,6,3,0][i%8])]],
    tail:[0,2,5,8,10,7,3,0][i%8],tailLift:4,
    lantern:[0,-2,-4,-7,-7,-5,-2,0][i%8],
    expression:"laugh",foxfire:i===3||i===4?1:0
  };
}
const MOVES = {
  idle:{frames:32,ms:140,pose:idlePose},
  walk:{frames:8,ms:110,pose:walkPose},
  run:{frames:8,ms:82,pose:runPose},
  attack:{frames:10,ms:76,pose:attackPose},
  skill:{frames:16,ms:90,pose:skillPose},
  jump:{frames:8,ms:90,pose:jumpPose},
  lunge:{frames:8,ms:75,pose:lungePose},
  fish:{frames:8,ms:150,pose:fishPose},
  meditate:{frames:8,ms:180,pose:meditatePose},
  interact:{frames:8,ms:120,pose:interactPose},
  pickup:{frames:8,ms:90,pose:pickupPose},
  gather:{frames:8,ms:105,pose:pickupPose},
  bow:{frames:8,ms:135,pose:bowPose},
  laugh:{frames:8,ms:145,pose:laughPose},
  hit:{frames:4,ms:75,pose:hitPose},
  knockback:{frames:6,ms:90,pose:knockbackPose},
  death:{frames:10,ms:130,pose:deathPose},
  revive:{frames:10,ms:120,pose:revivePose},
  lantern_raise:{frames:6,ms:120,pose:(i,h)=>lanternPose(i,h,true)},
  lantern_lower:{frames:6,ms:120,pose:(i,h)=>lanternPose(i,h,false)},
  sit:{frames:8,ms:180,pose:sitPose},
  sleep:{frames:8,ms:210,pose:sleepPose},
  victory:{frames:8,ms:125,pose:victoryPose},
  hurt:{frames:6,ms:85,pose:hitPose}
};

// Convert each movement into a directional rig3d clip. The pose is evaluated
// against the requested compass heading; PXL handles the turned skeleton,
// near/far limbs and the camera's 3/4 perspective.
const MOVES3 = Object.fromEntries(Object.entries(MOVES).map(([name,M])=>[
  name,{
    frames:M.frames,ms:M.ms,dirs:ALL8,
    pose:(i,h)=>M.pose(i,180-h),
    draw:(c,j,p)=>{
      const hand=j.arms[j.heading>180?0:1].hand;
      c.setSocket("lantern",...j.screen(hand));
      c.setSocket("hand",...j.screen(j.arms[j.heading>180?0:1].hand));
      c.setBox("hurt",10,11,28,49);
      if(["attack","lunge","skill"].includes(name)&&i>=3&&i<=6)c.setBox("hit",21,18,25,25);
      const head=p.expression==="laugh"?"_yuma_head_laugh":p.expression==="shout"||p.expression==="grit"?"_yuma_head_shout":"_yuma_head_calm";
      const [x,y]=j.screen(j.head).map(Math.round);
      c.stamp(head,x,y,{heading:j.hd.heading});
    }
  }
]));
// The complete PXL body: compact chibi skeleton, layered skirt, wide sleeves,
// crossed collar, obi, hair-tail overlap and a hand-held carved lantern.
const parts3 = (j,p) => {
  const yaw=rad(p.turn||0),tailAngle=rad(p.tail||0),tailLift=p.tailLift||0;
  const base=[j.pelvis[0],j.pelvis[1],0];
  const waist=j.pelvis[2]+1.1,hem=waist-SKIRT;
  const ellipse=(a,b,t)=>1/Math.hypot(Math.cos(t)/a,Math.sin(t)/b);
  const farLeg=j.depth(j.legs[0].hip)<j.depth(j.legs[1].hip)?0:1;
  const farArm=j.depth(j.arms[0].sh)<j.depth(j.arms[1].sh)?0:1;
  const out={};
  // Near/far legs, with short tabi socks and lacquer shoes.
  j.legs.forEach((L,i)=>{
    const far=i===farLeg;
    const trouser=far?"vww":"wvv";
    out["leg"+i]=[
      j.limb(L.hip,L.knee,2.15,1.9,trouser),
      j.limb(L.knee,L.ankle,1.85,1.55,far?"vww":"wvv"),
      j.limb(L.ankle,add(L.ankle,[0,0,-0.8]),1.55,1.35,"fghi"),
      j.ball(L.foot,[2.3,3.0,1.45],h=>h<0.3?"v":"wG")
    ];
  });
  // Bodice, a rounded compact chest with crossed inner lapels.
  out.bodice=j.sweep(base,j.pelvis[2]+1.5,j.chest[2],
    (h,a)=>ellipse(4.7+1.0*h,3.0+0.5*h,a-yaw*h),
    {shell:0.4,paint:(h,a,outer)=>{
      const front=Math.abs(a-yaw*h)<0.78;
      if(!outer)return "v";
      if(h<0.13)return front?"q":"n";
      if(front&&h<0.68)return h<0.38?"q":"p";
      return "npo";
    }});
  // Inner collar and the outer lapels, turned with the torso.
  out.collar=j.sweep(base,j.chest[2]-2.6,j.chest[2]+0.5,
    (h,a)=>ellipse(4.9,3.15,a-yaw),
    {shell:0.22,paint:(h,a,outer)=>{
      const edge=Math.abs(a-yaw);
      if(!outer)return "n";
      return edge<0.45?"q":edge<1.1?"p":"n";
    }});
  // Wide kimono sleeves and small hands; the forearm is narrower at the wrist.
  j.arms.forEach((A,i)=>{
    const far=i===farArm, sleeve=far?"mnop":"mnopq", arm=far?"fgh":"fghi";
    const elbowRadius=far?3.25:3.9;
    out["arm"+i]=[
      j.limb(A.sh,A.elbow,elbowRadius,3.25,sleeve),
      j.limb(A.elbow,A.hand,1.8,1.45,arm),
      j.ball(A.hand,1.65,far?"fgh":"fghi")
    ];
  });
  // Separate jade overskirt; the bell-shaped hem opens in a turn and follows
  // the pelvis a fraction late, with pleats and a second-colour lining.
  const fall=rad(12+Math.min(40,Math.abs(p.turn||0)*0.28)+Math.abs(p.skirt||0)*0.45);
  const lag=rad(clamp(-(p.tail||0)*0.32,-24,24));
  out.skirt=j.sweep(base,hem,waist,
    (h,a)=>WAIST+(1-h)*SKIRT*Math.sin(fall)+0.28*Math.sin((a+lag*(1-h))*8),
    {shell:0.46,paint:(h,a,outer)=>{
      const fold=Math.abs(Math.sin((a+lag*(1-h))*4));
      if(h<0.07)return outer?"v":"v";
      if(!outer)return "r";
      if(fold>0.79)return "r";
      if(fold>0.48)return "s";
      return h>0.78?"tu":"stu";
    }});
  // A narrow waist obi with antique-gold piping, sash tails and a centre knot.
  out.obi=j.sweep(base,waist-1.9,waist+1.3,
    (h,a)=>ellipse(4.4,3.1,a-yaw),
    {shell:0.22,paint:(h,a,outer)=>!outer?"v":h<0.3?"w":"GHI"});
  out.obiKnot=j.decal("_yuma_obi_knot",[j.pelvis[0]+j.f[0]*3.4,j.pelvis[1]+j.f[1]*3.4,j.pelvis[2]+1.0],{depth:2});
  out.chestBow=j.decal("_yuma_chest_bow",[j.chest[0]+j.f[0]*3.8,j.chest[1]+j.f[1]*3.8,j.chest[2]-2.1],{depth:3});
  // Long rear hair locks move behind the shoulders; the head's own side locks
  // remain fixed, while these trailing locks react to turns one frame late.
  const hairLag=rad(clamp(-(p.tail||0)*0.42,-35,35));
  const hairRoot=add(j.head,mul(j.hd.f,-4.0));
  const hairSide=mul(j.hd.r,Math.sin(hairLag)*2.3);
  const hairDown=[0,0,-1];
  out.hairRibbon=[
    j.limb(hairRoot,add(hairRoot,add(mul(j.hd.f,-1.4),add(hairSide,mul(hairDown,5.5)))),2.4,2.0,"abcde"),
    j.limb(add(hairRoot,add(mul(j.hd.f,-1.4),add(hairSide,mul(hairDown,5.5)))),
      add(hairRoot,add(hairSide,mul(hairDown,12.5))),2.0,1.0,"abcde")
  ];
  // The enormous fox tail: a 25 px flowing silhouette, 14-16 px wide.
  // Four overlapping tapered segments produce a soft fan and tufted tip.
  const root=add(j.pelvis,add(mul(j.f,-2.2),[0,0,0.5]));
  const sway=mul(j.r,Math.sin(tailAngle)*2.2);
  const side=mul(j.r,5.2+Math.sin(tailAngle)*2.0);
  const p1=add(root,add(side,[0,0,7.2+tailLift*0.25]));
  const p2=add(p1,add(mul(j.f,-1.7),[0,0,8.1+tailLift*0.35]));
  const p3=add(p2,add(sway,[0,0,6.0+tailLift*0.35]));
  const p4=add(p3,add(mul(j.r,-1.4),[0,0,3.0]));
  out.tail=[
    j.limb(root,p1,6.7,7.8,"abcde"),
    j.limb(p1,p2,7.8,6.6,"abcde"),
    j.limb(p2,p3,6.6,4.1,"bcde"),
    j.limb(p3,p4,4.1,0.35,"cde")
  ];
  // Directional cream fur planes and pointed tufts make the tail readable at 1x.
  out.tailTufts=[
    j.limb(p3,add(p3,add(mul(j.r,2.1),[0,0,3.0])),2.2,0.1,"cde"),
    j.limb(p3,add(p3,add(mul(j.r,-1.9),[0,0,2.7])),2.0,0.1,"cde")
  ];
  // The carried lantern is a small, rigid prop with roof, paper chamber,
  // gold corner rails, base cap and a separate warm flame.
  const held=j.arms[j.heading>180?0:1].hand;
  const carried=p.lantern!==undefined||p.lanternOffset!==undefined;
  const lift=typeof p.lantern==="number"?p.lantern:0;
  const anchor=carried?add(held,[0,0, -3.0-lift]):add(j.pelvis,add(mul(j.r,-5),[0,0,-1]));
  const LX=anchor[0],LY=anchor[1],LZ=anchor[2];
  out.lantern=[
    sdf.box([2.5,2.2,3.5],{round:0.28}).at(LX,LY,LZ).mat("RST"),
    sdf.box([1.85,1.65,2.55],{round:0.2}).at(LX,LY+0.05,LZ).mat("UVW"),
    sdf.cone(2.8,1.7,0.45).at(LX,LY,LZ+4.0).mat("RST"),
    sdf.cone(2.3,1.25,0.25).at(LX,LY,LZ-4.0).mat("RST"),
    sdf.capsule([LX-2.1,LY-1.7,LZ-3.0],[LX-2.1,LY-1.7,LZ+3.0],0.28).mat("GHI"),
    sdf.capsule([LX+2.1,LY-1.7,LZ-3.0],[LX+2.1,LY-1.7,LZ+3.0],0.28).mat("GHI"),
    sdf.capsule([LX-2.1,LY+1.7,LZ-3.0],[LX-2.1,LY+1.7,LZ+3.0],0.22).mat("GHI"),
    sdf.capsule([LX+2.1,LY+1.7,LZ-3.0],[LX+2.1,LY+1.7,LZ+3.0],0.22).mat("GHI"),
    sdf.ellipsoid([0.9,0.9,1.7]).at(LX,LY,LZ).mat("UVW")
  ];
  // Fishing rod appears only in the fishing action, but its slot stays present.
  const rodHand=j.arms[j.heading>180?0:1].hand;
  const rodTip=add(rodHand,add(mul(j.f,10),[0,0,18]));
  out.fishingRod=p.rod?[
    sdf.capsule(rodHand,rodTip,0.38,0.12).mat("GHI"),
    sdf.capsule(rodTip,add(rodTip,add(mul(j.f,2),[0,0,-14])),0.10,0.04).mat("I")
  ]:[];
  // Light scarf ribbons and hanging sleeves respond after the body turn.
  return out;
};

// The face stamp is kept crisp. The rig's volume handles all five views;
// hand-painted pixel clusters hold the eyes, hime fringe edge and expression.
const drawFace=(c,j,p)=>{
  const face=p.expression==="blink"?"_yuma_head_blink":p.expression==="smile"?"_yuma_head_smile":p.expression==="laugh"?"_yuma_head_laugh":p.expression==="shout"||p.expression==="grit"?"_yuma_head_shout":"_yuma_head_calm";
  const [x,y]=j.screen(j.head).map(Math.round);
  c.stamp(face,x,y,{heading:j.hd.heading});
  const hand=j.arms[j.heading>180?0:1].hand;
  c.setSocket("lantern",...j.screen(hand));
  c.setSocket("hand",...j.screen(hand));
  c.setBox("hurt",10,10,28,50);
  if(["attack","lunge","skill"].includes(p.move||"")&&p.hit)c.setBox("hit",17,16,29,28);
};

// Poses preserve the same foot anchor and proportions in every view.
// The tail, long hair and skirt have their own delayed secondary motion.
const FIG={body:{h:48,hip:HIP,torso:TORSO,neck:NECK,thigh:THIGH,shin:SHIN,upper:UPPER,fore:FORE,ankle:1.35,hips:HIPW,shoulders:[0,SHW,-1]},
  w:W,h:H,pivot:[OX,OY],ink:"k",surface:{soft:0.48}};
const RIG_MOVES=Object.fromEntries(Object.entries(MOVES).map(([name,M])=>[
  name,{
    frames:M.frames,ms:M.ms,dirs:ALL8,
    pose:(i,h)=>{const pose=M.pose(i,180-h);return {...pose,move:name,hit:name==="attack"||name==="skill"||name==="lunge",elbow:pose.elbow??[-1,0.5,0]};},
    draw:drawFace
  }
]));
rig3d("yuma",{...FIG,n:16,parts:parts3,blocks:true,moves:RIG_MOVES});
card("yuma",{is:"Yuma, a white-lavender fox-spirit lantern keeper in a layered rose-and-jade hanfu; 48 px chibi body, eight isometric headings, 24 authored actions",cells:{"iso/24ppm":"✓","hd2d/24ppm":"✓"},vary:{part:"hair ornaments, lantern prop and garment details"}});

// UI and combat support art. These are independent assets, not enlarged game sprites.
sprite("yuma_title_banner",{w:128,h:28,pivot:[64,14]},c=>{
  c.hline(7,2,114,"I");c.hline(4,4,120,"H");c.hline(4,23,120,"H");
  c.vline(3,5,17,"I");c.vline(124,5,17,"I");
  c.px(8,8,"p");c.px(9,7,"q");c.px(10,8,"p");c.px(9,9,"I");
  c.px(117,8,"p");c.px(118,7,"q");c.px(119,8,"p");c.px(118,9,"I");
  c.hline(18,12,92,"w");c.hline(27,16,74,"I");
});
sprite("yuma_fox_sigil",{w:32,h:32,pivot:[16,16]},c=>{
  c.ellipse(16,18,9,10,"a");c.ellipse(16,18,7,8,"b");
  c.line(9,12,5,3,"b");c.line(5,3,13,8,"d");
  c.line(23,12,27,3,"b");c.line(27,3,19,8,"d");
  c.ellipse(12,17,1,2,"j");c.ellipse(20,17,1,2,"j");
  c.px(12,16,"L");c.px(20,16,"L");
  c.hline(14,23,4,"f");c.px(16,24,"i");
  c.px(15,5,"p");c.px(16,4,"q");c.px(17,5,"p");
});
sprite("yuma_lantern_icon",{w:20,h:24,pivot:[10,23]},c=>{
  c.vline(8,2,4,"I");c.vline(12,2,4,"I");c.hline(8,2,5,"I");
  c.hline(5,6,10,"S");c.hline(6,7,8,"R");
  c.rect(6,9,8,9,"U");c.rect(8,9,4,8,"V");
  c.vline(6,8,11,"S");c.vline(13,8,11,"S");
  c.hline(5,18,10,"S");c.hline(7,20,6,"I");
  c.vline(10,20,3,"I");
});
anim("yuma_foxfire",{w:24,h:28,frames:8,fps:10},c=>{
  const f=c.frame;
  c.ellipse(12,18,4+(f%3),7+(f%2),"R");
  c.line(12,23,12+(f%3)-1,8,"S");
  c.ellipse(12+(f%3)-1,12,2,5,"U");
  c.px(11+(f%3),8,"W");c.px(14,14+(f%2),"V");
  if(f%2===0){c.px(5,12,"p");c.px(19,9,"q");}
});
anim("yuma_lantern_glow",{w:24,h:24,frames:8,fps:7},c=>{
  const f=c.frame,rx=[4,5,6,5,4,3,4,5][f];
  c.ellipse(12,12,rx,rx,"R");
  c.ellipse(12,12,3,5,"U");
  c.ellipse(12,11,2,3,"V");
  c.px(11,8,"W");c.px(15,14,"V");
});
anim("yuma_sakura_trail",{w:32,h:24,frames:8,fps:8},c=>{
  const f=c.frame;
  for(let i=0;i<5;i++){
    const x=4+(i*6+f*2)%25,y=4+(i*5+f*3)%16;
    c.px(x,y,"p");c.px(x+1,y-1,"q");c.px(x+2,y,"p");
  }
});

// Cleanly separated sheets keep the runtime selective and APK size reasonable.
sheet("yuma_locomotion",["yuma_idle_*","yuma_walk_*","yuma_run_*","yuma_jump_*"],{rows:"tag",pad:1});
sheet("yuma_combat",["yuma_attack_*","yuma_skill_*","yuma_lunge_*","yuma_hit_*","yuma_hurt_*","yuma_knockback_*"],{rows:"tag",pad:1});
sheet("yuma_social_life",["yuma_fish_*","yuma_meditate_*","yuma_interact_*","yuma_pickup_*","yuma_gather_*","yuma_bow_*","yuma_laugh_*","yuma_sit_*","yuma_sleep_*"],{rows:"tag",pad:1});
sheet("yuma_reactions",["yuma_death_*","yuma_revive_*","yuma_lantern_raise_*","yuma_lantern_lower_*","yuma_victory_*"],{rows:"tag",pad:1});
