// Full-body character models traced from the reference sheets (front / side / back / three-quarter views).
// Each view is a packed PNG: R = tone index (0 = fixed ink), G = alpha, B = zone. Zones are recoloured from the player's choices.
import { drawFaceAt } from "./face.js";

export const ZONES = { skin: 1, hair: 2, outer: 4, collar: 5, hakama: 6, accent: 7 };
export const ZONE_LABEL = { 1: "Skin", 2: "Hair", 4: "Outer layer", 5: "Collar / inner", 6: "Hakama / skirt", 7: "Sash / accent" };
export const INK = [0x3b, 0x2c, 0x36], GAIN = 0.95;
export const CELL = { w: 256, h: 300, figH: 236, feet: 292 };
// chin line (fraction of figure height) used to split head / body for proportion shaping, hip line for the walk puppet
export const MODEL_INFO = {
  ronin_grey: { neck: 0.445, hip: 0.64 }, miko_white: { neck: 0.36, hip: 0.66 }, burgundy: { neck: 0.42, hip: 0.64 }, miko_blue: { neck: 0.44, hip: 0.64 }, ronin_black: { neck: 0.43, hip: 0.64 },
};

function mk(w, h) { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const imgCache = new Map();
function loadImage(url) { if (!imgCache.has(url)) imgCache.set(url, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + url)); i.src = url; })); return imgCache.get(url); }
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rgbHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hslRgb(h, s, l) { const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; } const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255)); }
function lutFor(levels, hex) { const [h, s, l] = rgbHsl(...hexRgb(hex)); return levels.map((lv) => (lv.ink ? INK : hslRgb(h, s, Math.min(1, Math.max(0, l + lv.dl * GAIN))))); }

async function decode(url) {
  const img = await loadImage(url), c = mk(img.width, img.height), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, img.width, img.height).data, n = img.width * img.height, idx = new Uint8Array(n), a = new Uint8Array(n), zone = new Uint8Array(n);
  for (let i = 0; i < n; i++) { idx[i] = d[i * 4]; a[i] = d[i * 4 + 1]; zone[i] = d[i * 4 + 2]; }
  return { w: img.width, h: img.height, idx, a, zone };
}

export class ModelKit {
  constructor(root) { this.root = root.replace(/\/$/, ""); this.models = {}; this._rc = new Map(); }
  async load(id) {
    if (this.models[id]) return this.models[id];
    const meta = await (await fetch(`${this.root}/models/${id}/model.json`)).json(), views = {};
    await Promise.all(Object.entries(meta.views).map(async ([k, v]) => { views[k] = { ...v, packed: await decode(`${this.root}/models/${id}/${v.file}`) }; }));
    return (this.models[id] = { id, meta, views, info: MODEL_INFO[id] || { neck: 0.44, hip: 0.64 }, base: meta.base });
  }
  defaults(id) { const m = this.models[id]; const b = m?.base || {}; return { 1: b[1] || "#f0d8cf", 2: b[2] || "#d8dce6", 4: b[4] || "#eeeef2", 5: b[5] || "#2a2c36", 6: b[6] || "#2a2c36", 7: b[7] || "#8a2b2f" }; }
  _recolor(model, vname, colors) {
    const key = model.id + vname + Object.values(colors).join(","); if (this._rc.has(key)) return this._rc.get(key);
    const v = model.views[vname], p = v.packed, luts = {}; for (const [z, lv] of Object.entries(v.levels)) luts[z] = lutFor(lv, colors[z] || "#cccccc");
    const c = mk(p.w, p.h), x = c.getContext("2d"), im = x.createImageData(p.w, p.h), o = im.data;
    for (let i = 0, n = p.w * p.h; i < n; i++) {
      const a = p.a[i]; if (!a) continue; const ix = p.idx[i]; let t; if (ix === 0) t = INK; else { const l = luts[p.zone[i]] || luts[4] || luts[1]; t = l ? l[Math.min(ix, l.length - 1)] : INK; }
      o[i * 4] = t[0]; o[i * 4 + 1] = t[1]; o[i * 4 + 2] = t[2]; o[i * 4 + 3] = a;
    }
    x.putImageData(im, 0, 0); this._rc.set(key, c); if (this._rc.size > 60) this._rc.delete(this._rc.keys().next().value); return c;
  }
  /** which source view / mirroring / squeeze gives direction d */
  plan(model, d) {
    const V = model.views, has = (k) => !!V[k], right3 = Object.keys(V).find((k) => V[k].facing === "right" && k !== "E" && !V[k].face?.single), left3 = Object.keys(V).find((k) => V[k].facing === "left" && k !== "E" && !V[k].face?.single);
    const se = right3 ? { view: right3 } : left3 ? { view: left3, mirror: true } : { view: "S", squeeze: 0.9, eyeShift: 0.04 };
    if (d === "S") return { view: "S" };
    if (d === "N") return { view: "N" };
    if (d === "SE") return se;
    if (d === "NE") return { view: "N", squeeze: 0.92 };
    if (d === "E") return has("E") ? { view: "E", mirror: V.E.facing === "left" } : { ...se, squeeze: (se.squeeze || 1) * 0.82, e: true };
    return { view: "S" };
  }
  /** returns a CELL-sized canvas. spec = { model, colors:{1,2,4,5,6,7}, face, shape } ; d in S SE E NE N (W/SW/NW are mirrored by the caller) */
  render(spec, d = "S") {
    const model = this.models[spec.model]; if (!model) return mk(CELL.w, CELL.h);
    const pl = this.plan(model, d), v = model.views[pl.view] || model.views.S, colors = { ...this.defaults(spec.model), ...(spec.colors || {}) };
    const src = this._recolor(model, pl.view in model.views ? pl.view : "S", colors), sc = CELL.figH / v.h, fw = v.w * sc, fh = CELL.figH, x0 = (CELL.w - fw) / 2, y0 = CELL.feet - fh;
    const cell = mk(CELL.w, CELL.h), x = cell.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(src, x0, y0, fw, fh);
    const L = v.face; if (L && d !== "N" && d !== "NE" && spec.face) {
      const eyes = L.single ? [{ x: x0 + L.eyeCx * fw, y: y0 + L.eyeY * fh }] : [{ x: x0 + (L.eyeCx - L.gap + (pl.eyeShift || 0) * 0.5) * fw, y: y0 + L.eyeY * fh }, { x: x0 + (L.eyeCx + L.gap + (pl.eyeShift || 0)) * fw, y: y0 + L.eyeY * fh }];
      drawFaceAt(x, spec.face, { eyes, w: Math.max(14, L.eyeW * fw * 1.05), mouth: L.mouthY && !L.single ? { x: x0 + L.mouthX * fw, y: y0 + L.mouthY * fh } : null });
    }
    let out = spec.shape ? this._shape(cell, spec.shape, model.info.neck) : cell;
    if (pl.mirror) { const f = mk(CELL.w, CELL.h), fx = f.getContext("2d"); fx.translate(CELL.w, 0); fx.scale(-1, 1); fx.drawImage(out, 0, 0); out = f; }
    if (pl.squeeze && pl.squeeze !== 1) { const f = mk(CELL.w, CELL.h), fx = f.getContext("2d"); fx.drawImage(out, CELL.w * (1 - pl.squeeze) / 2, 0, CELL.w * pl.squeeze, CELL.h); out = f; }
    return out;
  }
  _shape(src, s, neckFrac) {
    const { bodySx = 1, bodySy = 1, headSx = 1, headSy = 1 } = s; if (bodySx === 1 && bodySy === 1 && headSx === 1 && headSy === 1) return src;
    const cut = CELL.feet - CELL.figH * (1 - neckFrac), top = CELL.feet - CELL.figH, out = mk(CELL.w, CELL.h), x = out.getContext("2d"), cx = CELL.w / 2;
    const lowH = (CELL.h - cut) * bodySy, lowTop = CELL.feet + 8 - (CELL.feet + 8 - cut) * bodySy;
    x.drawImage(src, 0, cut, CELL.w, CELL.h - cut, cx - cx * bodySx, lowTop, CELL.w * bodySx, lowH);
    const hh = (cut - top + 6) * headSy; x.drawImage(src, 0, top - 6, CELL.w, cut - top + 6, cx - cx * headSx, lowTop + 2 - hh, CELL.w * headSx, hh);
    return out;
  }
}
