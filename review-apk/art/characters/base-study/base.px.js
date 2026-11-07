// One reusable character base. Wardrobe files may surround this body, never redefine it.
const STUDY_FRAME = { w: 36, h: 48 }
const STUDY_PIVOT = [18, 46]
const STUDY_DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]

// Slightly larger head, short visible neck, ordinary torso and limb lengths.
// Keep this anatomy identical in the neutral base and all five wardrobe renders.
const STUDY_BASE_BODY = {
  h: 36, heads: 2.85,
  hip: 12.2, torso: 10.7, neck: 7.0,
  thigh: 5.5, shin: 5.3, upper: 3.6, fore: 3.2,
  ankle: 1.2, hips: 2.1, shoulders: [0.55, 4.55, -1.05]
}

const STUDY_HEAD_ANCHOR = { s: [7, 5], sw: [8, 5], w: [6, 5], nw: [7, 5], n: [7, 5] }
const STUDY_HEAD_LIGHT = { soft: 0.55 }

// Hand-retouched face views. Keep the face quiet and readable at native sprite size.
const STUDY_FACE = {
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

const STUDY_BASE_PALETTE = {
  k:"#211b1c", z:"#95634e", s:"#d2a080", S:"#f1c8a8", L:"#ffe5ca",
  J:"#1b1820", j:"#2a242d", h:"#4a414b", H:"#756776",
  E:"#252b3a", e:"#a98c4c", G:"#fff2d9",
  n:"#46504d", N:"#303a38", c:"#66716a", C:"#8f998b",
  v:"#71685d", w:"#9a8d7a", W:"#c8b99b", p:"#69636a",
  P:"#4c4750", R:"#343139", d:"#755b42", D:"#49382c", l:"#9a7958",
  g:"#bda36c", B:"#95604b", T:"#67443a"
}

const STUDY_BASE_STYLE = {
  id: "base",
  label: "Neutral base",
  palette: STUDY_BASE_PALETTE,
  hair: "none",
  headAccessory: "none",
  top: {
    arm: [1.35, 1.2, 1.0], body: [3.75, 4.0],
    sleeve: "vW", fore: "wW", hand: "zsS",
    inner: "vW", outer: "wW", belt: "gG", skirt: "vW",
    drape: null, over: []
  },
  bottom: {
    leg: [1.7, 1.55, 1.4], tr: "RPp", shin: "DDd", foot: "Ddl",
    cuff: 0.48, drape: null
  },
  back: { type: "none" }
}
