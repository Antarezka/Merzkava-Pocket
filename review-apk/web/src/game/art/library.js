// Character creator library: every selectable option. Parts come from the traced reference sets in public/game-art/parts.
// New variants the user sends later are added by extracting a set (tools/art/extract_set.py) and listing it here.
export const SKINS = ["#fbe3d3", "#f2cdb8", "#e8b99a", "#d9a07a", "#c4845c", "#a8714f", "#8a5a3f", "#6b4330", "#f6dcd0", "#e9d2c0"];
export const HAIR_COLORS = ["#1d1d28", "#3a2a22", "#5a3a2a", "#8a5a3a", "#c9a24d", "#e7d9b0", "#e9e6ea", "#9aa0ad", "#c0392b", "#e7a8c4", "#6b3fa0", "#2e4a7d", "#2f7d6b"];
export const EYE_COLORS = ["#6b4a3a", "#3a2a22", "#2e7d9a", "#3a6ea5", "#2f8f6b", "#8a6a2f", "#7a3b8f", "#c0508a", "#c0392b", "#9aa0ad"];
export const CLOTH_COLORS = ["#f2eee6", "#e2d6bd", "#c9b08a", "#8a2b2f", "#6b1f3c", "#c0503a", "#d9a441", "#4f7f4f", "#2f7d6b", "#2e4a7d", "#3c4a8a", "#6b3fa0", "#3a3d48", "#23242c", "#6b6e70"];

export const GENDERS = [{ id: "female", label: "Female" }, { id: "male", label: "Male" }];
export const BODIES = [
  { id: "slim", label: "Slim", sx: 0.92, sy: 1.0 }, { id: "balanced", label: "Balanced", sx: 1, sy: 1 }, { id: "sturdy", label: "Sturdy", sx: 1.1, sy: 0.98 },
  { id: "petite", label: "Petite", sx: 0.94, sy: 0.9 }, { id: "tall", label: "Tall", sx: 0.96, sy: 1.09 }, { id: "stout", label: "Stout", sx: 1.16, sy: 0.94 },
];
export const HEADS = [
  { id: "round", label: "Round", sx: 1, sy: 1 }, { id: "oval", label: "Oval", sx: 0.93, sy: 1.07 }, { id: "wide", label: "Wide", sx: 1.1, sy: 0.95 },
  { id: "small", label: "Petite head", sx: 0.9, sy: 0.9 }, { id: "grand", label: "Big head", sx: 1.1, sy: 1.08 }, { id: "long", label: "Long face", sx: 0.9, sy: 1.14 },
];
export const EYE_SHAPE_LIST = [["round", "Round"], ["almond", "Almond"], ["narrow", "Narrow"], ["droopy", "Droopy"], ["cat", "Cat"], ["big", "Large"]];
export const EXPRESSION_LIST = [["neutral", "Calm"], ["smile", "Smile"], ["happy", "Beaming"], ["wink", "Wink"], ["fierce", "Fierce"], ["old", "Elder"], ["coy", "Coquettish"], ["handsome", "Dashing"], ["sleepy", "Sleepy"], ["surprised", "Surprised"], ["sad", "Wistful"]];

const H = (id, label, set, front, side, back) => ({ id, label, sets: [set], layers: [back && { set, part: back }, side && { set, part: side }, { set, part: front }].filter(Boolean) });
export const HAIR_STYLES = [
  H("wolf", "Messy Wolf Cut", "ronin_grey", "hair_messy_0", "hair_messy_1", "hair_messy_2"),
  H("wavebraid", "Wavy Side Braid", "ronin_grey", "hair_wavy_0", "hair_wavy_1", "hair_wavy_2"),
  H("longbraid", "Long Braid", "ronin_grey", "hair_wavy2_0", "hair_wavy2_1", "hair_wavy2_2"),
  H("bob", "Short Bob", "ronin_grey", "hair_short_0", "hair_short_1", "hair_short_2"),
  H("hime", "Hime Cut", "miko_white", "head_front_0", "hair_side", "hair_back"),
  H("himewing", "Hime Wings", "miko_white", "head_front_1", "hair_side", "hair_back2"),
  H("himelayer", "Layered Hime", "miko_white", "head_front_2", "hair_side", "hair_back"),
  H("spikelock", "Spiky Locks", "burgundy", "head_front_a", "hair_side", "hair_back"),
  H("bowtail", "Bow Back Hair", "burgundy", "head_front_b", "hair_side", "hair_back_bow"),
  H("fringe", "Short Fringe", "burgundy", "head_front_c", "hair_side", "hair_back"),
  H("archer", "Archer Bangs", "miko_blue", "head_front_a", "hair_side", "hair_back"),
  H("archerbow", "Archer Ribbon", "miko_blue", "head_front_b", "hair_side", "hair_back_bow"),
  H("archerlong", "Archer Long", "miko_blue", "head_front_c", "hair_side", "hair_back"),
  H("ronin", "Ronin Mane", "ronin_black", "head_front_a", "hair_side", "hair_back2"),
  H("roninflow", "Ronin Flow", "ronin_black", "head_front_b", "hair_side", "hair_back"),
  H("roninwild", "Ronin Wild", "ronin_black", "head_front_c", "hair_side", "hair_back2"),
];

const L = (set, part, label, color) => ({ set, part, label, color });
export const OUTFITS = [
  { id: "haori", label: "Ronin Haori", layers: [L("ronin_grey", "hakama_0", "Hakama", "#23242c"), L("ronin_grey", "robe_0", "Haori", "#f2eee6"), L("ronin_grey", "collar_0", "Collar", "#1d1d22"), L("ronin_grey", "sash_0", "Sash", "#8a2b2f")] },
  { id: "haorisimple", label: "Plain Haori", layers: [L("ronin_grey", "hakama_1", "Hakama", "#2e4a7d"), L("ronin_grey", "robe_1", "Haori", "#e2d6bd"), L("ronin_grey", "sash_1", "Sash", "#d9a441")] },
  { id: "ronin", label: "Black Ronin", layers: [L("ronin_black", "hakama_boots", "Hakama", "#25262e"), L("ronin_black", "jacket", "Jacket", "#2c2e38"), L("ronin_black", "collar", "Collar", "#2a2c36")] },
  { id: "mikoopen", label: "Miko Mantle", layers: [L("miko_white", "inner_skirt", "Skirt", "#3a3d48"), L("miko_white", "mantle_0", "Mantle", "#f2f2f8"), L("miko_white", "belt_tie", "Belt", "#2a2b33")] },
  { id: "mikoclosed", label: "Miko Dress", layers: [L("miko_white", "inner_skirt", "Skirt", "#3a3d48"), L("miko_white", "mantle_1", "Dress", "#f2f2f8"), L("miko_white", "shoulder_straps", "Straps", "#2a2b33")] },
  { id: "kosode", label: "Burgundy Kosode", layers: [L("burgundy", "hakama_front", "Hakama", "#6b6e70"), L("burgundy", "hakama_back", "Hakama (back)", "#6b6e70"), L("burgundy", "kosode_0", "Kosode", "#6b1f3c"), L("burgundy", "collar", "Collar", "#2c2f3a"), L("burgundy", "sash", "Sash", "#4a4d52")] },
  { id: "bluemiko", label: "Azure Miko", layers: [L("miko_blue", "hakama_front", "Hakama", "#3c4a8a"), L("miko_blue", "hakama_back", "Hakama (back)", "#3c4a8a"), L("miko_blue", "kosode", "Kosode", "#dfe6f7"), L("miko_blue", "sash", "Sash", "#3a3d7a"), L("miko_blue", "big_bow", "Bow", "#5a78c8")] },
];
export const ACCESSORIES = [
  { id: "none", label: "None", layers: [] },
  { id: "tassel", label: "Tassel charm", layers: [L("burgundy", "acc_tassel", "Tassel", "#8a2b2f")] },
  { id: "feather", label: "Feather charm", layers: [L("miko_blue", "feather_charm", "Feather", "#dfe6f7")] },
  { id: "charm", label: "Diamond charm", layers: [L("miko_white", "charm", "Charm", "#c9a06a")] },
];

export function defaultAppearance(gender = "female") {
  const f = gender === "female";
  return {
    gender, body: "balanced", head: "round", skin: SKINS[1], eyeShape: f ? "big" : "almond", eyeColor: f ? "#2e7d9a" : "#3a2a22", expression: "smile", browColor: null,
    hairStyle: f ? "hime" : "wolf", hairColor: f ? "#e9e6ea" : "#3a2a22", outfit: f ? "mikoopen" : "haori", outfitColors: {}, accessory: "none", accessoryColor: null,
  };
}
export function normalizeAppearance(a = {}) {
  const d = defaultAppearance(a.gender === "male" ? "male" : "female"), out = { ...d, ...a };
  const has = (list, id) => list.some((x) => (Array.isArray(x) ? x[0] : x.id) === id);
  if (!has(BODIES, out.body)) out.body = d.body; if (!has(HEADS, out.head)) out.head = d.head; if (!has(HAIR_STYLES, out.hairStyle)) out.hairStyle = d.hairStyle;
  if (!has(OUTFITS, out.outfit)) out.outfit = d.outfit; if (!has(ACCESSORIES, out.accessory)) out.accessory = "none"; if (!has(EYE_SHAPE_LIST, out.eyeShape)) out.eyeShape = d.eyeShape;
  if (!has(EXPRESSION_LIST, out.expression)) out.expression = d.expression;
  for (const k of ["skin", "eyeColor", "hairColor"]) if (!/^#[0-9a-f]{6}$/i.test(out[k] || "")) out[k] = d[k];
  out.outfitColors = out.outfitColors && typeof out.outfitColors === "object" ? out.outfitColors : {};
  return out;
}
/** appearance -> CharKit spec (+ set names to preload) */
export function appearanceToSpec(app) {
  const a = normalizeAppearance(app), hs = HAIR_STYLES.find((x) => x.id === a.hairStyle), of = OUTFITS.find((x) => x.id === a.outfit), ac = ACCESSORIES.find((x) => x.id === a.accessory);
  const layers = [], sets = new Set();
  for (const l of hs.layers) { layers.push({ ...l, color: a.hairColor }); sets.add(l.set); }
  of.layers.forEach((l, i) => { layers.push({ set: l.set, part: l.part, color: a.outfitColors[`${of.id}:${i}`] || l.color }); sets.add(l.set); });
  ac.layers.forEach((l, i) => { layers.push({ set: l.set, part: l.part, color: a.accessoryColor || l.color }); sets.add(l.set); });
  const body = BODIES.find((x) => x.id === a.body), head = HEADS.find((x) => x.id === a.head);
  return { spec: { skin: a.skin, face: { eyeShape: a.eyeShape, eyeColor: a.eyeColor, expression: a.expression, browColor: a.browColor || undefined }, layers, shape: { bodySx: body.sx, bodySy: body.sy, headSx: head.sx, headSy: head.sy } }, sets: [...sets] };
}
