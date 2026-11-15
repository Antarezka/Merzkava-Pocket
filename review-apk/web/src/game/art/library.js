// Character creator library: every selectable option. Looks are the fixed 8-direction reference models in public/game-art/modelss.
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
export const EYE_SHAPE_LIST = [["original", "Original"], ["round", "Round"], ["almond", "Almond"], ["narrow", "Narrow"], ["droopy", "Droopy"], ["cat", "Cat"], ["big", "Large"]];
export const EXPRESSION_LIST = [["original", "Original"], ["neutral", "Calm"], ["smile", "Smile"], ["happy", "Beaming"], ["wink", "Wink"], ["fierce", "Fierce"], ["old", "Elder"], ["coy", "Coquettish"], ["handsome", "Dashing"], ["sleepy", "Sleepy"], ["surprised", "Surprised"], ["sad", "Wistful"]];

/** Fixed 8-direction looks (more chibi models will be added here as the references arrive). Each has its own hairstyle, outfit and face proportions. */
export const LOOKS = [
  { id: "burgundy8", label: "Long hair · burgundy haori", zones: [2, 4, 5, 6, 3] },
  { id: "hoodie", label: "Bunny-ear hood robe", zones: [2, 4, 5, 6] },
  { id: "nohood", label: "Short hair · layered robe", zones: [2, 4, 5, 6] },
  { id: "oni", label: "Onmyoji · horned swordsman", zones: [1, 2, 4, 7], faceFixed: true },
  { id: "seer", label: "Blind seer · crow", zones: [2, 4, 5, 6, 7], faceFixed: true },
  { id: "skull", label: "Crimson kimono · hair ornament", zones: [2, 4, 5, 6], faceFixed: true },
];
export const ZONE_NAMES = { 1: "Skin", 2: "Hair", 3: "Eyes", 4: "Outer layer", 5: "Inner / trim", 6: "Hakama / skirt", 7: "Accent" };
export const LOOK_ZONE_LABELS = { burgundy8: { 2: "Hair", 4: "Haori (jacket)", 5: "Inner collar & ribbons", 6: "Hakama", 3: "Eyes" }, hoodie: { 2: "Hair & hood", 4: "Robe", 5: "Straps & trim", 6: "Skirt" }, nohood: { 2: "Hair", 4: "Robe", 5: "Straps & trim", 6: "Skirt" },
  oni: { 2: "Hair", 4: "Kimono & hakama", 7: "Horns & gold trim", 1: "Skin" }, seer: { 2: "Hair", 4: "Robe", 5: "Blindfold", 6: "Inner robe", 7: "Gold trim" }, skull: { 2: "Hair", 4: "Kimono", 5: "Hair ornament", 6: "Socks & skirt" } };

export function defaultAppearance(look = "burgundy8") {
  return { gender: "female", look, body: "balanced", skin: null, hairColor: null, eyeColor: null, eyeShape: "original", expression: "original", browColor: null, colors: {} };
}
export function normalizeAppearance(a = {}) {
  const look = LOOKS.some((l) => l.id === a.look) ? a.look : "burgundy8", d = defaultAppearance(look), out = { ...d, ...a, look };
  if (!BODIES.some((b) => b.id === out.body)) out.body = d.body;
  if (!EYE_SHAPE_LIST.some((e) => e[0] === out.eyeShape)) out.eyeShape = "original";
  if (!EXPRESSION_LIST.some((e) => e[0] === out.expression)) out.expression = "original";
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : null);
  out.skin = hex(out.skin); out.hairColor = hex(out.hairColor); out.eyeColor = hex(out.eyeColor); out.browColor = hex(out.browColor);
  const c = {}; for (const z of [4, 5, 6, 7]) { const v = hex(out.colors && out.colors[z]); if (v) c[z] = v; } out.colors = c;
  return out;
}
/** appearance -> ModelKit spec ({model, colors, face, shape}) */
export function appearanceToSpec(app) {
  const a = normalizeAppearance(app), body = BODIES.find((x) => x.id === a.body) || BODIES[1], colors = { ...a.colors };
  if (a.skin) colors[1] = a.skin; if (a.hairColor) colors[2] = a.hairColor; if (a.eyeColor) colors[3] = a.eyeColor;
  return { model: a.look, colors, face: { expression: a.expression, eyeShape: a.eyeShape, eyeColor: a.eyeColor || undefined, browColor: a.browColor || undefined }, shape: { sx: body.sx, sy: body.sy } };
}
