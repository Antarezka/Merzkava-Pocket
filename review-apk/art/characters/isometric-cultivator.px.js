// Merzkava Pocket — isometric wuxia character family.
// Built as a real 3D-posed pixel rig: PXL renders every heading and every animation frame.
// No SVG, bitmap tracing, or mirrored one-view shortcuts are used for character art.

include("./_pxl-dress.px.js")

const FRAME_W = 34
const FRAME_H = 48
const PIVOT = [17, 46]
const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const LIGHT = { soft: 0.55 }

// Field-sprite proportions: a compact head, clear shoulders, close arms, a layered torso,
// separate legs and visible feet. The floor line remains identical in every direction.
const BODY = {
  h: 36, heads: 3.05, hip: 12.2, torso: 10.7, neck: 7.2,
  thigh: 5.5, shin: 5.3, upper: 3.6, fore: 3.2, ankle: 1.2,
  hips: 2.1, shoulders: [0.55, 4.55, -1.05]
}
const GAIT_TUNING = {
  front: { lift: [0, 0, 0, 0, 0, 1, 3, 1] }
}
const walk = (i, yaw) => {
  const g = gait(i / 8, { heading: 180 - yaw, ...GAIT_TUNING })
  const phase = (2 * Math.PI * i) / 8
  const side = g.view === "profile" || g.view === "diagonal"
  const feet = g.feet.map(([forward], k) => [forward, k ? 2.1 : -2.1])
  const lift = g.feet.map(([, up]) => up)
  const hands = g.hands.map(([forward, up], k) => [
    forward,
    side ? (k ? 0.8 - 0.6 * g.a : -0.8 + 0.6 * g.a) : k ? 1 : -1,
    -7 + up
  ])
  return side
    ? { feet, lift, down: g.bob, lean: 4, trail: 1 + 0.3 * Math.abs(Math.sin(phase - 0.8)), sway: Math.sin(phase - 0.8) * (1 - g.a), hands }
    : { feet, lift, down: g.bob, lean: 2, trail: 0.4, sway: Math.sin(phase), hands }
}
const idle = (i) => ({
  feet: [[0, -2.35], [0, 2.35]], lift: [0, 0], down: [0, 1, 1, 0][i],
  lean: 1, trail: 0.15, sway: 0, hands: [[0, -1, -7], [0, 1, -7]]
})
const MOVES = {
  idle: { frames: 4, ms: 260, pose: (i) => idle(i) },
  walk: { frames: 8, ms: 110, pose: (i, heading) => walk(i, 180 - heading) }
}

// Five coherent outfit palettes keep the existing appearance choices and save IDs.
// The base anatomy and lighting stay consistent; cloth, trim, hair and silhouette details vary.
const STYLES = [
  {
    id: "chibi", scale: 0.92, head: 1.12, hair: "short", robeLength: 12, cape: 0.45,
    cloak: "cC", lining: "N", inner: "vW", outer: "wW", belt: "gG", pants: "RPp",
    sleeve: "cC", fore: "wW", skin: "zsS",
    palette: {
      k:"#211a1b", z:"#9e624d", s:"#d89d7c", S:"#f1c8a7", L:"#ffe0bf",
      J:"#24151c", j:"#3b2528", h:"#65403b", H:"#94624d",
      E:"#252a36", e:"#b77a37", G:"#fff0c8",
      n:"#294a42", N:"#172f2b", c:"#537e69", C:"#8eaf86",
      v:"#5a4a3c", w:"#927454", W:"#c4a47a", p:"#6c5547",
      P:"#49372f", R:"#302723", d:"#70502f", D:"#48321f", l:"#927250",
      g:"#bd8d45", B:"#b36b50", T:"#7d4540"
    }
  },
  {
    id: "classic", scale: 1, head: 1, hair: "long", robeLength: 17, cape: 0.85,
    cloak: "nNcC", lining: "N", inner: "vW", outer: "wW", belt: "gG", pants: "RPp",
    sleeve: "nNc", fore: "cC", skin: "zsS",
    palette: {
      k:"#1c1920", z:"#8e5948", s:"#c98c70", S:"#edbea0", L:"#ffe0c3",
      J:"#151b22", j:"#26323a", h:"#485760", H:"#71838a",
      E:"#202638", e:"#d2a04a", G:"#fff2d3",
      n:"#253f43", N:"#16272e", c:"#456c69", C:"#83a39a",
      v:"#50505a", w:"#8e9b98", W:"#c6d0c3", p:"#4e5261",
      P:"#353846", R:"#252936", d:"#67513a", D:"#3c3028", l:"#8d7151",
      g:"#c3a063", B:"#8e574f", T:"#623a3b"
    }
  },
  {
    id: "slim", scale: 0.98, head: 0.96, hair: "tail", robeLength: 18, cape: 0.65,
    cloak: "pPR", lining: "R", inner: "wW", outer: "vW", belt: "gG", pants: "RPP",
    sleeve: "pPR", fore: "wW", skin: "zsS",
    palette: {
      k:"#181c28", z:"#95634e", s:"#d2a080", S:"#f1c8a8", L:"#ffe5ca",
      J:"#111a2a", j:"#202c43", h:"#3c5070", H:"#7184a0",
      E:"#1c2737", e:"#a98c4c", G:"#fff2d9",
      n:"#2e526d", N:"#1c344b", c:"#527e99", C:"#96b6c8",
      v:"#4c5365", w:"#8a9bae", W:"#c4d2dc", p:"#555a71",
      P:"#343c56", R:"#202a40", d:"#756044", D:"#493b2e", l:"#9b805d",
      g:"#bda36c", B:"#7d5877", T:"#4e3f63"
    }
  },
  {
    id: "ornate", scale: 1.04, head: 1.02, hair: "bun", robeLength: 18, cape: 1.15,
    cloak: "TtBb", lining: "T", inner: "vW", outer: "wW", belt: "gG", pants: "RPP",
    sleeve: "TtB", fore: "bB", skin: "zsS",
    palette: {
      k:"#21161e", z:"#975943", s:"#d08c6c", S:"#f0bd99", L:"#ffe0bf",
      J:"#1e1219", j:"#39202a", h:"#603543", H:"#8f5960",
      E:"#2c1d28", e:"#e0b35c", G:"#fff0ce",
      n:"#542c3b", N:"#2f1a2a", c:"#864351", C:"#bd7771", t:"#8c4b58", b:"#d68e82",
      v:"#57404b", w:"#98766f", W:"#d2a98b", p:"#594052",
      P:"#3b293d", R:"#241b2c", d:"#80552c", D:"#51351f", l:"#a17a45",
      g:"#d2a14e", B:"#b45f52", T:"#743a3c"
    }
  },
  {
    id: "painterly", scale: 1, head: 1, hair: "flow", robeLength: 16, cape: 1.35,
    cloak: "nNcC", lining: "N", inner: "vW", outer: "wW", belt: "gG", pants: "RPp",
    sleeve: "nNc", fore: "cC", skin: "zsS",
    palette: {
      k:"#1c1b18", z:"#94624d", s:"#c99070", S:"#eebd99", L:"#ffe0c0",
      J:"#1a1c19", j:"#2b3028", h:"#475344", H:"#77836a",
      E:"#24281f", e:"#b38a42", G:"#fff0cf",
      n:"#30453a", N:"#1b2c27", c:"#5c7657", C:"#9aa47a",
      v:"#54483a", w:"#897657", W:"#c0a77c", p:"#5b5145",
      P:"#3a352e", R:"#28261f", d:"#755535", D:"#49351f", l:"#96724a",
      g:"#bc9656", B:"#95604b", T:"#67443a"
    }
  }
]

const FACE = {
  s: [
    "...............",
    "...............",
    "...............",
    "...............",
    "...............",
    "....SS...SS....",
    "...SkkSSSkkS...",
    "...SGESSSEGS...",
    "...sSSSLSSSs...",
    "....sSSzSSs...."
  ].join("\n"),
  sw: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "...SSSSSS.......",
    "...SkSSkk.......",
    "....ESSEG.s.....",
    "....SLLeS.z.....",
    ".....SzSs......."
  ].join("\n"),
  w: [
    ".................",
    ".................",
    ".................",
    ".................",
    ".................",
    "...SSS...........",
    "..SkkSSs.........",
    "..SEGSSzs........",
    "kSLSSSss.........",
    "...SSss..........",
    "....zss.........."
  ].join("\n")
}
const HEAD_ANCHOR = { s:[7,5], sw:[8,5], w:[6,5], nw:[7,5], n:[7,5] }
const HEAD_LIGHT = { soft:0.55 }

function headField(style) {
  const skull = sdf.ellipsoid([5.0 * style.head, 5.2 * style.head, 5.0 * style.head]).mat("zsSL")
  const cap = sdf.ellipsoid([5.5 * style.head, 5.8 * style.head, 5.4 * style.head]).at(0, -0.5, 1.2)
    .subtract(
      sdf.ellipsoid([4.4 * style.head, 4.8 * style.head, 4.5 * style.head]).at(0, 4, -2.3),
      sdf.capsule([-0.9, 4.4, 4.6], [-0.7, -1.5, 5.6], 0.45),
      { smooth:0.4 }
    )
  const short = style.hair === "short"
  const long = style.hair === "long" || style.hair === "flow"
  const tail = style.hair === "tail"
  const sideEnd = short ? -2.8 : long ? -5.2 : tail ? -4.0 : -3.5
  const locks = sdf.union(
    sdf.capsule([-2.4, 3.4, 3.8], [-2.8, 4.9, sideEnd], 0.9, 0.5),
    sdf.capsule([0.6, 3.8, 4], [1, 5.1, sideEnd], 0.9, 0.5),
    sdf.capsule([2.7, 3.2, 3.7], [3.1, 4.5, sideEnd], 0.9, 0.5),
    sdf.capsule([-4.5, 0, 2], [-4.4, 0.3, short ? -1.5 : -3.8], 1, 0.7),
    sdf.capsule([4.5, 0, 2], [4.4, 0.3, short ? -1.5 : -3.8], 1, 0.7),
    { smooth:0.6 }
  )
  let hair = sdf.union(cap, locks, { smooth:0.6 })
    .noise({ amp:0.35, scale:1.2, seed:style.id.length + 2 }).mat("JjhH")
  if (style.hair === "bun") {
    const bun = sdf.ellipsoid([2.6, 2.2, 2.4]).at(0, -6.2, 0).mat("JjhH")
    const pin = sdf.capsule([-0.3, -7.7, 1.4], [0.3, -9.2, 3.6], 0.28).mat("gG")
    hair = sdf.union(hair, bun, pin, { smooth:0.45 })
  } else if (tail) {
    const tailLock = sdf.capsule([0, -4.6, -1], [0.5, -7.2, -4.8], 1.0, 0.6).mat("JjhH")
    hair = sdf.union(hair, tailLock, { smooth:0.5 })
  } else if (long) {
    const leftLock = sdf.capsule([-4.4, -0.2, 1], [-3.8, -0.2, -5.7], 1.15, 0.75).mat("JjhH")
    const rightLock = sdf.capsule([4.4, -0.2, 1], [3.8, -0.2, -5.7], 1.15, 0.75).mat("JjhH")
    hair = sdf.union(hair, leftLock, rightLock, { smooth:0.55 })
  }
  return sdf.union(skull, hair)
}

function makeOutfit(style) {
  const scale = style.scale
  const outfit = {
    r: {
      leg:dress.r.leg.map(v => v * scale),
      arm:dress.r.arm.map(v => v * scale),
      body:dress.r.body.map(v => v * scale),
      hand:dress.r.hand * scale,
      foot:dress.r.foot.map(v => v * scale)
    },
    legs: (far) => ({
      tr: far ? "RRP" : style.pants,
      shin: far ? "DDd" : "Ddl",
      foot: far ? "DDd" : "Ddl"
    }),
    cuff:0.43,
    drapes: [{
      top:(j) => j.chest[2] + 0.6,
      len:style.robeLength,
      out:style.cloak,
      in:style.lining,
      trail:style.cape,
      keep:(h,a) => Math.abs(a) > 1.42,
      radius:(h,a) => {
        const open = Math.abs(Math.sin(a))
        return (3.9 + 1.2 * (1 - h)) * (1 - open * 0.17) + 0.35 * (1 - h)
      }
    }],
    skirt:(h,a,out) => out ? style.outer : style.inner,
    body:(h,a,out) => h < 0.14 ? style.belt : (out ? style.outer : style.inner),
    over:[],
    sleeve:(far) => far ? "vvw" : style.sleeve,
    fore:(far) => far ? "vvw" : style.fore,
    hand:(far) => far ? "zzs" : style.skin,
    creases:true
  }
  return outfit
}

for (const style of STYLES) {
  pal(style.palette)
  const headName = "_" + style.id + "_cultivator_head"
  views(headName, headField(style), {
    ink:"k", jaw:["D", "zsSL"], surface:HEAD_LIGHT,
    anchor:HEAD_ANCHOR, retouch:FACE
  })
  const moves = Object.fromEntries(Object.entries(MOVES).map(([name, move]) => [
    name,
    { frames:move.frames, ms:move.ms, dirs:DIRS, pose:move.pose }
  ]))
  const body = {
    ...BODY,
    h:BODY.h * style.scale,
    hip:BODY.hip * style.scale,
    torso:BODY.torso * style.scale,
    neck:BODY.neck * style.scale,
    thigh:BODY.thigh * style.scale,
    shin:BODY.shin * style.scale,
    upper:BODY.upper * style.scale,
    fore:BODY.fore * style.scale,
    ankle:BODY.ankle * style.scale,
    hips:BODY.hips * style.scale,
    shoulders:[BODY.shoulders[0] * style.scale, BODY.shoulders[1] * style.scale, BODY.shoulders[2] * style.scale]
  }
  rig3d(style.id, {
    body, w:FRAME_W, h:FRAME_H, pivot:PIVOT, ink:"k", surface:LIGHT,
    n:8, head:headName, parts:dress(makeOutfit(style)), moves
  })
  card(style.id, {
    is:"Merzkava wuxia field character, 8-way pixel rig, layered cultivation robe",
    cells:{ "pocket/8-way":"✓", "pocket/idle-walk":"✓" }
  })
}

sheet("pocket_isometric_characters", STYLES.map(style => style.id + "_*"), { rows:"tag", pad:1 })
