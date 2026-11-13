import { shade } from "../paint.js";

const o = (id, name, extra = {}) => ({ id, name, ...extra });
const skin = (id, name, color) => ({ id, name, color, shadow: shade(color, -0.26) });
const hc = (id, name, color) => ({ id, name, color, shadow: shade(color, -0.38), light: shade(color, 0.4) });

export const BODY = [
  o("slender", "Slender", { desc: "Light and graceful", leg: 1.08, torso: 1, sh: 0.9, waist: 0.82, hip: 0.92, limb: 0.85 }),
  o("balanced", "Balanced", { desc: "Even proportions", leg: 1, torso: 1, sh: 1, waist: 1, hip: 1, limb: 1 }),
  o("sturdy", "Sturdy", { desc: "Strong frame", leg: 0.95, torso: 1.02, sh: 1.15, waist: 1.12, hip: 1.05, limb: 1.2 }),
  o("tall", "Tall & Lean", { desc: "Long legs, narrow build", leg: 1.2, torso: 1.1, sh: 0.95, waist: 0.88, hip: 0.95, limb: 0.9 }),
  o("petite", "Petite", { desc: "Small and quick", leg: 0.84, torso: 0.9, sh: 0.9, waist: 0.9, hip: 0.95, limb: 0.9 }),
  o("warrior", "Broad Warrior", { desc: "Wide shoulders", leg: 1, torso: 1.06, sh: 1.32, waist: 1.15, hip: 1.05, limb: 1.32 }),
  o("willowy", "Willowy", { desc: "Slim waist, flowing hips", leg: 1.14, torso: 0.98, sh: 0.86, waist: 0.78, hip: 1.1, limb: 0.82 }),
  o("stout", "Stout", { desc: "Short and sturdy", leg: 0.8, torso: 1, sh: 1.1, waist: 1.32, hip: 1.2, limb: 1.1 }),
];
// w/h = head scale, jaw = chin-width ratio (smaller = more pointed), cheek = cheek fullness
export const HEAD = [
  o("oval", "Oval", { desc: "Classic", w: 1, h: 1, jaw: 0.62, cheek: 0.96 }),
  o("round", "Round", { desc: "Soft and youthful", w: 1.06, h: 0.96, jaw: 0.8, cheek: 1 }),
  o("heart", "Heart", { desc: "Pointed chin", w: 1.02, h: 1, jaw: 0.4, cheek: 1 }),
  o("square", "Square", { desc: "Firm jaw", w: 1.04, h: 0.98, jaw: 0.92, cheek: 0.98 }),
  o("long", "Long", { desc: "Tall face", w: 0.94, h: 1.1, jaw: 0.6, cheek: 0.94 }),
  o("melon", "Melon Seed", { desc: "Slim, delicate", w: 0.93, h: 1.04, jaw: 0.34, cheek: 0.92 }),
  o("moon", "Full Moon", { desc: "Wide and gentle", w: 1.12, h: 0.98, jaw: 0.74, cheek: 1.04 }),
  o("diamond", "Diamond", { desc: "High cheekbones", w: 1, h: 1.02, jaw: 0.46, cheek: 1.04 }),
];
export const SKIN = [
  skin("porcelain", "Porcelain", "#f8e4d6"), skin("fair", "Fair", "#f1d2b8"), skin("peach", "Peach", "#ebc09f"), skin("warm", "Warm Beige", "#dba97c"),
  skin("honey", "Honey", "#c98f60"), skin("tan", "Sun Tan", "#b07548"), skin("brown", "Chestnut", "#8b5a3a"), skin("deep", "Deep Umber", "#5f3d2b"),
];
// tilt: outer corner raise (+up) ; lid: upper-lid cover 0..1 ; w/h: relative size ; iris: iris size ; lash: lash flick
export const EYES = [
  o("almond", "Almond", { w: 1, h: 0.9, tilt: 0.1, lid: 0.18, iris: 0.62, lash: 0.4 }),
  o("phoenix", "Phoenix", { w: 1.12, h: 0.72, tilt: 0.42, lid: 0.28, iris: 0.58, lash: 0.9 }),
  o("round", "Round", { w: 0.92, h: 1.1, tilt: 0, lid: 0.06, iris: 0.72, lash: 0.2 }),
  o("doe", "Doe", { w: 1, h: 1.28, tilt: -0.05, lid: 0.04, iris: 0.82, lash: 0.5 }),
  o("droopy", "Droopy", { w: 1, h: 0.95, tilt: -0.34, lid: 0.18, iris: 0.66, lash: 0.3 }),
  o("sharp", "Sharp", { w: 1.08, h: 0.62, tilt: 0.3, lid: 0.34, iris: 0.5, lash: 0.7 }),
  o("sleepy", "Sleepy", { w: 1, h: 0.76, tilt: -0.08, lid: 0.5, iris: 0.62, lash: 0.3 }),
  o("cat", "Cat", { w: 1.06, h: 0.86, tilt: 0.52, lid: 0.22, iris: 0.7, lash: 1 }),
];
export const EYE_COLOR = [
  { id: "ink", name: "Ink Black", color: "#2b2230" }, { id: "brown", name: "Brown", color: "#6a4028" }, { id: "amber", name: "Amber", color: "#b0782a" },
  { id: "jade", name: "Jade", color: "#3f9070" }, { id: "azure", name: "Azure", color: "#3f78b8" }, { id: "violet", name: "Violet", color: "#8452b4" },
  { id: "crimson", name: "Crimson", color: "#b83a4c" }, { id: "gold", name: "Gold", color: "#d4a93a" }, { id: "silver", name: "Silver", color: "#8f99aa" },
];
// brow: y offset (+ lower), tilt: inner-end raise (+ = worried), arch, eye: openness mult, mouth: [leftCornerDy, rightCornerDy, open, width], blush, extra flags
export const EXPRESSION = [
  o("neutral", "Neutral", { brow: 0, tilt: 0, arch: 0.3, eye: 1, mouth: [0, 0, 0, 0.8], blush: 0 }),
  o("smile", "Smile", { brow: -0.5, tilt: -0.05, arch: 0.5, eye: 0.88, mouth: [-2.4, -2.4, 0.15, 1.15], blush: 0.5, smileEyes: 0.3 }),
  o("wink", "Wink", { brow: -0.5, tilt: 0, arch: 0.5, eye: 1, mouth: [-2.2, -2.8, 0.2, 1.1], blush: 0.5, wink: "r" }),
  o("fierce", "Fierce", { brow: 1.6, tilt: -0.6, arch: 0.1, eye: 0.78, mouth: [1.6, 1.6, 0.35, 1], blush: 0, teeth: true, scowl: true }),
  o("elder", "Elder", { brow: 0.4, tilt: 0.12, arch: 0.15, eye: 0.7, mouth: [0.8, 0.8, 0, 0.7], blush: 0, aged: true }),
  o("coy", "Coquettish", { brow: -1, tilt: 0.08, arch: 0.7, eye: 0.82, mouth: [-1.8, -3.2, 0.1, 0.8], blush: 0.9, lashes: 1, sideGlance: 1 }),
  o("cool", "Handsome", { brow: 0.6, tilt: -0.25, arch: 0.15, eye: 0.92, mouth: [0, -1.4, 0, 0.9], blush: 0, cool: true }),
  o("shy", "Shy", { brow: -0.3, tilt: 0.3, arch: 0.4, eye: 0.9, mouth: [-0.6, -0.6, 0, 0.5], blush: 1.3, look: 0.6 }),
  o("sleepy", "Sleepy", { brow: 0.6, tilt: 0.1, arch: 0.2, eye: 0.38, mouth: [0, 0, 0.1, 0.6], blush: 0.2 }),
  o("smirk", "Smirk", { brow: 0, tilt: -0.3, arch: 0.4, eye: 0.88, mouth: [0.4, -2.8, 0, 0.9], blush: 0.1, browAsym: 1 }),
  o("surprised", "Surprised", { brow: -1.6, tilt: 0.1, arch: 0.8, eye: 1.2, mouth: [0, 0, 0.9, 0.5], blush: 0.2 }),
  o("sad", "Sad", { brow: 0.2, tilt: 0.55, arch: 0.3, eye: 0.92, mouth: [1.8, 1.8, 0, 0.7], blush: 0.2, tear: true }),
];
export const FRINGE = [
  o("none", "None", { group: "open" }), o("blunt", "Blunt", { group: "straight" }), o("hime", "Hime Blunt", { group: "straight" }),
  o("air", "Air Bangs", { group: "light" }), o("curtain", "Curtain", { group: "parted" }), o("sweep_l", "Side-swept L", { group: "swept" }),
  o("sweep_r", "Side-swept R", { group: "swept" }), o("wispy", "Wispy", { group: "light" }), o("long_split", "Long Split", { group: "parted" }),
  o("micro", "Micro", { group: "short" }), o("arch", "Arched", { group: "straight" }), o("eye_cover", "Eye Cover", { group: "swept" }),
];
export const SIDE = [
  o("none", "None", { group: "open" }), o("hime", "Hime Lock", { group: "long" }), o("short", "Short Lock", { group: "short" }),
  o("braid", "Thin Braid", { group: "braided" }), o("ringlet", "Ringlets", { group: "curl" }), o("tucked", "Tucked Behind Ear", { group: "short" }),
  o("ribbon", "Ribboned Lock", { group: "long" }), o("loop", "Tied Loop", { group: "tied" }), o("wisp", "Long Wisps", { group: "long" }),
  o("spike", "Sharp Lock", { group: "short" }),
];
export const HAIR_BACK = [
  o("long_straight", "Long Straight", { group: "eastern" }), o("low_tail", "Low Ponytail", { group: "eastern" }), o("high_tail", "High Ponytail", { group: "eastern" }),
  o("topknot", "Topknot", { group: "eastern" }), o("double_bun", "Double Buns", { group: "eastern" }), o("half_up", "Half-up with Pin", { group: "eastern" }),
  o("long_braid", "Long Braid", { group: "eastern" }), o("twin_braids", "Twin Braids", { group: "eastern" }),
  o("hime_cut", "Hime Cut", { group: "modern" }), o("wolf_cut", "Wolf Cut", { group: "modern" }), o("bob", "Bob", { group: "modern" }),
  o("layered_long", "Layered Long", { group: "modern" }), o("twin_tails", "Twin Tails", { group: "modern" }), o("pixie", "Pixie Crop", { group: "short" }),
  o("curly", "Curly Waves", { group: "modern" }), o("mullet", "Undercut Mullet", { group: "short" }), o("short_messy", "Short Messy", { group: "short" }),
];
export const HAIR_COLOR = [
  hc("black", "Ink Black", "#221c28"), hc("darkbrown", "Dark Brown", "#43302c"), hc("chestnut", "Chestnut", "#6e4230"), hc("auburn", "Auburn", "#8f4430"),
  hc("honey", "Honey", "#bb8a4c"), hc("blonde", "Pale Gold", "#dcc27e"), hc("silver", "Silver", "#cdd2dc"), hc("snow", "Snow White", "#eceef4"),
  hc("sakura", "Sakura", "#eba1b8"), hc("rose", "Rose", "#cf6784"), hc("indigo", "Indigo", "#3d4a92"), hc("azure", "Azure", "#4f8acb"),
  hc("teal", "Teal", "#3a9288"), hc("jade", "Jade", "#4fa273"), hc("violet", "Violet", "#8d5cbc"), hc("crimson", "Crimson", "#b42c3c"), hc("flame", "Flame", "#d9692c"),
];
const outfit = (id, name, base, trim, accent, inner, sash) => ({ id, name, palette: { base, trim, accent, inner, sash } });
export const OUTFIT = [
  outfit("moonlit", "Moonlit Hanfu", "#e6edf8", "#5776b0", "#cfa65c", "#ffffff", "#5776b0"),
  outfit("crimson", "Crimson Robe", "#b52d3d", "#f0d58c", "#e8c25c", "#f4e6d4", "#7a1d2c"),
  outfit("jade", "Jade Scholar", "#4f7f66", "#d9e6c8", "#d1b25c", "#eef2e0", "#35584a"),
  outfit("midnight", "Midnight Cultivator", "#2b2e49", "#d8b45a", "#d8b45a", "#4a4f78", "#1c1e33"),
  outfit("sunrise", "Sunrise Ruqun", "#ee9f6a", "#fff0d6", "#c4683a", "#fff6e6", "#c4683a"),
  outfit("wanderer", "Wanderer Tunic", "#8c6c46", "#d9c391", "#5b7c53", "#e9dcc0", "#5b4630"),
];
export const ACCESSORY = [o("none", "None"), o("hairpin", "Hairpin"), o("guan", "Guan Crown"), o("ribbon", "Ribbon"), o("flower", "Peony"), o("headband", "Headband"), o("earrings", "Jade Earrings")];
export const GENDER = [o("female", "Female"), o("male", "Male")];

export const CHARACTER_OPTIONS = {
  gender: GENDER, body: BODY, head: HEAD, skin: SKIN, eyes: EYES, eyeColor: EYE_COLOR, expression: EXPRESSION,
  fringe: FRINGE, sideL: SIDE, sideR: SIDE, hairBack: HAIR_BACK, hairColor: HAIR_COLOR, outfit: OUTFIT, accessory: ACCESSORY,
};
export const SLOT_LIST = Object.keys(CHARACTER_OPTIONS);
const first = k => CHARACTER_OPTIONS[k][0].id;
const has = (k, id) => CHARACTER_OPTIONS[k].some(x => x.id === id);

export function defaultAppearance(gender = "female") {
  const f = gender !== "male";
  return f
    ? { gender: "female", body: "willowy", head: "oval", skin: "fair", eyes: "almond", eyeColor: "brown", expression: "smile", fringe: "curtain", sideL: "hime", sideR: "hime", hairBack: "long_straight", hairColor: "black", outfit: "moonlit", accessory: "hairpin" }
    : { gender: "male", body: "balanced", head: "square", skin: "peach", eyes: "almond", eyeColor: "ink", expression: "cool", fringe: "sweep_l", sideL: "short", sideR: "short", hairBack: "topknot", hairColor: "black", outfit: "midnight", accessory: "guan" };
}
export function normalizeAppearance(a) {
  const d = defaultAppearance(a?.gender === "male" ? "male" : "female"), out = { ...d };
  for (const k of SLOT_LIST) if (a && has(k, a[k])) out[k] = a[k];
  return out;
}
export function randomAppearance(seed = 1) {
  let s = (seed >>> 0) || 1; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const out = defaultAppearance(rnd() < 0.5 ? "female" : "male");
  for (const k of SLOT_LIST) if (k !== "gender") { const arr = CHARACTER_OPTIONS[k]; out[k] = arr[Math.floor(rnd() * arr.length)].id; }
  return out;
}
export const optionOf = (slot, id) => CHARACTER_OPTIONS[slot].find(x => x.id === id) || CHARACTER_OPTIONS[slot][0];
