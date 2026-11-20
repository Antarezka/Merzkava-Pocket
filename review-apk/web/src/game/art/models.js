// Full-body character models traced from the fixed 8-direction reference sheets.
// Every direction is its own traced view (no mirroring/squeezing). A view is a packed PNG: R = tone index (0 = fixed ink), G = alpha, B = zone.
// Two files per facing view: the original art (baked face, eyes recolourable) and a "_b" copy with the face stripped,
// so a different expression/eye shape can be drawn at the position measured on that model's own reference (each hairstyle has its own face proportions).
import { drawFaceAt } from "./face.js";

export const DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"];
export const ZONE_LABEL = { 1: "Skin", 2: "Hair", 3: "Eyes", 4: "Outer layer", 5: "Collar / trim", 6: "Hakama / skirt", 7: "Accent" };
export const INK = [0x3b, 0x2c, 0x36], GAIN = 0.95;
export const CELL = { w: 288, h: 300, figH: 236, feet: 292 };
// hip = fraction of figure height where the walk puppet splits legs from torso
export const MODEL_INFO = { burgundy8: { hip: 0.8 }, hoodie: { hip: 0.78 }, nohood: { hip: 0.78 }, oni: { hip: 0.8 }, seer: { hip: 0.8 }, skull: { hip: 0.78 } };

function mk(w, h) { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const imgCache = new Map();
function loadImage(url) { if (!imgCache.has(url)) imgCache.set(url, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + url)); i.src = url; })); return imgCache.get(url); }
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rgbHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hslRgb(h, s, l) { const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; } const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255)); }
// Tone mapping: the reference tone is kept exactly when the chosen colour equals the reference colour; for other colours the shading is
// scaled proportionally into the available lightness headroom (so a near-white base can become a dark colour without clipping to black).
function lutFor(levels, hex, baseHex) {
  const [h, s, l] = rgbHsl(...hexRgb(hex)), lb = Math.max(0.04, Math.min(0.98, rgbHsl(...hexRgb(baseHex || hex))[2]));
  return levels.map((lv) => {
    if (lv.ink) return INK; const lt = lb + lv.dl; let o;
    if (lt <= lb) o = l * Math.max(0, lt) / lb; else o = l + (1 - l) * Math.min(1, (lt - lb) / (1 - lb));
    return hslRgb(h, s, Math.min(1, Math.max(0, o)));
  });
}

// Palette (painterly) models: every pixel keeps its original colour; a zone is recoloured by shifting hue/saturation/lightness from the zone's base colour to the chosen one.
function palShift(c, T, B) {
  const [hc, sc, lc] = rgbHsl(...c), [ht, st, lt] = rgbHsl(...hexRgb(T)), [hb, sb, lb0] = rgbHsl(...hexRgb(B)), lb = Math.max(0.04, Math.min(0.98, lb0));
  let h, sat;
  if (sb > 0.14) { h = (hc + (ht - hb) + 1) % 1; sat = Math.min(1, sc * (st / sb)); } else { h = ht; sat = st * (0.35 + 0.65 * Math.min(1, lc / Math.max(lb, 0.05))); }
  const lo = lc <= lb ? lt * (lc / lb) : lt + (1 - lt) * Math.min(1, (lc - lb) / (1 - lb));
  return hslRgb(h, sat, Math.min(1, Math.max(0, lo)));
}

async function decode(url) {
  const img = await loadImage(url), c = mk(img.width, img.height), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, img.width, img.height).data, n = img.width * img.height, idx = new Uint8Array(n), a = new Uint8Array(n), zone = new Uint8Array(n);
  for (let i = 0; i < n; i++) { idx[i] = d[i * 4]; a[i] = d[i * 4 + 1]; zone[i] = d[i * 4 + 2]; }
  return { w: img.width, h: img.height, idx, a, zone };
}

export class ModelKit {
  get cell() { return CELL; }
  constructor(root) { this.root = root.replace(/\/$/, ""); this.models = {}; this._rc = new Map(); }
  async load(id) {
    if (this.models[id]) return this.models[id];
    const meta = await (await fetch(`${this.root}/models/${id}/model.json`)).json(), views = {};
    await Promise.all(Object.entries(meta.views).map(async ([k, v]) => {
      const o = { ...v, packed: await decode(`${this.root}/models/${id}/${v.file}`) };
      if (v.blank) o.blankPacked = await decode(`${this.root}/models/${id}/${v.blank}`);
      views[k] = o;
    }));
    const walk = {};   // optional walking-pose views (one stride pose per direction, from the paired walking sheet)
    if (meta.walk) await Promise.all(Object.entries(meta.walk).map(async ([k, v]) => { walk[k] = { ...v, packed: await decode(`${this.root}/models/${id}/${v.file}`) }; }));
    return (this.models[id] = { id, meta, views, walk, info: MODEL_INFO[id] || { hip: 0.78 }, base: meta.base });
  }
  has(id) { return !!this.models[id]; }
  hasWalk(id) { const m = this.models[id]; return !!m && Object.keys(m.walk || {}).length > 0; }
  /** default colours of a model (the colours of the reference art) */
  defaults(id) { const b = this.models[id]?.base || {}, o = {}; for (let z = 1; z <= 7; z++) o[z] = b[z] || (z === 1 ? "#f0d8cf" : z === 2 ? "#e6e8f2" : "#8a8a96"); return o; }
  zonesOf(id) { const m = this.models[id]; return m ? Object.keys(m.base).map(Number) : []; }
  _recolor(model, vname, blank, colors, pose = "stand") {
    const key = model.id + pose + vname + (blank ? "b" : "") + Object.keys(colors).map((z) => colors[z]).join(","); if (this._rc.has(key)) return this._rc.get(key);
    const v = (pose === "walk" ? model.walk : model.views)[vname], p = blank ? v.blankPacked : v.packed, lv = blank ? v.blankLevels : v.levels, luts = {};
    if (v.pal) for (const z of Object.keys(model.base)) luts[z] = [INK, ...v.pal.map((c) => (colors[z] && colors[z] !== model.base[z] ? palShift(c, colors[z], model.base[z]) : c))];
    else for (const [z, l] of Object.entries(lv)) luts[z] = lutFor(l, colors[z] || "#cccccc", model.base[z]);
    const c = mk(p.w, p.h), x = c.getContext("2d"), im = x.createImageData(p.w, p.h), o = im.data;
    for (let i = 0, n = p.w * p.h; i < n; i++) {
      const a = p.a[i]; if (!a) continue; const ix = p.idx[i]; let t; if (ix === 0) t = INK; else { const l = luts[p.zone[i]] || luts[4] || luts[1]; t = l ? l[Math.min(ix, l.length - 1)] : INK; }
      o[i * 4] = t[0]; o[i * 4 + 1] = t[1]; o[i * 4 + 2] = t[2]; o[i * 4 + 3] = a;
    }
    x.putImageData(im, 0, 0); this._rc.set(key, c); if (this._rc.size > 80) this._rc.delete(this._rc.keys().next().value); return c;
  }
  /** true when the player's face needs the overlay (anything other than the reference face) */
  _custom(face) { return !!face && ((face.expression && face.expression !== "original") || (face.eyeShape && face.eyeShape !== "original")); }
  /** CELL-sized canvas of direction d.  spec = { model, colors:{1..7}, face:{expression,eyeShape,eyeColor,browColor,blushColor}, shape:{sx,sy} } */
  render(spec, d = "S", pose = "stand") {
    const model = this.models[spec.model]; if (!model) return mk(CELL.w, CELL.h);
    const set = pose === "walk" && model.walk?.[d] ? model.walk : model.views, vn = set[d] ? d : "S", v = set[vn] || model.views.S, ps = set === model.walk ? "walk" : "stand", colors = { ...this.defaults(spec.model), ...(spec.colors || {}) };
    const L = v.face, custom = !!L && this._custom(spec.face), src = this._recolor(model, vn, custom, colors, ps);
    const sc = CELL.figH / v.h, fw = v.w * sc, fh = CELL.figH, y0 = CELL.feet - fh, x0 = v.cx != null ? Math.max(0, Math.min(CELL.w - fw, CELL.w / 2 - v.cx * fw)) : (CELL.w - fw) / 2;
    const cell = mk(CELL.w, CELL.h), x = cell.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(src, x0, y0, fw, fh);
    if (custom) {
      const ew = L.eyeW * fw, face = { ...spec.face }; if (!face.eyeColor) face.eyeColor = colors[3];
      const far = L.facing === "right" ? 1 : L.facing === "left" ? 0 : -1, eyes = L.eyeX.map((ex, i) => ({ x: x0 + ex * fw, y: y0 + L.eyeY * fh, side: L.single ? (L.facing === "left" ? -1 : 1) : i === 0 ? -1 : 1, sx: i === far ? 0.82 : 1 }));
      drawFaceAt(x, face, { eyes, w: Math.max(12, ew * 0.78), mouth: L.mouthY && !L.single ? { x: x0 + L.mouthX * fw, y: y0 + L.mouthY * fh } : null });
    }
    const s = spec.shape; if (!s || (s.sx === 1 && s.sy === 1) || (s.sx == null && s.sy == null)) return cell;
    const out = mk(CELL.w, CELL.h), ox = out.getContext("2d"), sx = s.sx ?? 1, sy = s.sy ?? 1; ox.imageSmoothingQuality = "high";
    ox.translate(CELL.w / 2, CELL.feet); ox.scale(sx, sy); ox.translate(-CELL.w / 2, -CELL.feet); ox.drawImage(cell, 0, 0); return out;
  }
  /** large portrait canvas (height H) of one view - used for dialogue busts.  Same recolour + face overlay as render(), but at the model's own resolution. */
  renderBust(spec, d = "S", H = 560) {
    const model = this.models[spec.model]; if (!model) return mk(2, 2);
    const vn = model.views[d] ? d : "S", v = model.views[vn], colors = { ...this.defaults(spec.model), ...(spec.colors || {}) }, L = v.face, custom = !!L && this._custom(spec.face), src = this._recolor(model, vn, custom, colors, "stand");
    const fw = Math.round(v.w * H / v.h), c = mk(fw, H), x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, fw, H);
    if (custom) {
      const ew = L.eyeW * fw, face = { ...spec.face }; if (!face.eyeColor) face.eyeColor = colors[3];
      const far = L.facing === "right" ? 1 : L.facing === "left" ? 0 : -1, eyes = L.eyeX.map((ex, i) => ({ x: ex * fw, y: L.eyeY * H, side: L.single ? (L.facing === "left" ? -1 : 1) : i === 0 ? -1 : 1, sx: i === far ? 0.82 : 1 }));
      drawFaceAt(x, face, { eyes, w: Math.max(12, ew * 0.78), mouth: L.mouthY && !L.single ? { x: L.mouthX * fw, y: L.mouthY * H } : null });
    }
    return c;
  }
  hipRow(id) { return CELL.feet - CELL.figH * (1 - (MODEL_INFO[id]?.hip ?? 0.78)); }
}
