// Character kit: runtime recolouring + layered compositing of the tone-index parts.
// Packed PNG format (opaque, so no premultiplied-alpha loss): R = tone index, G = alpha, B = skin zone (1 = skin).
// Colour rule: HSL lightness of the chosen colour + (level.dl * GAIN); ink tones stay plum-brown.
import { drawFace } from "./face.js";
export const INK = [0x3b, 0x2c, 0x36];
export const GAIN = 0.95;
export const BASE = {
  w: 384, h: 512, cx: 191,
  head: { top: 8, chin: 240, w: 214 },
  neck: 236, shoulderY: 262, shoulderW: 164, waistY: 330, feetY: 504,
};
export const DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"];

const cache = new Map();
function loadImage(url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + url)); i.src = url; }));
  return cache.get(url);
}
function mk(w, h) { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

export function hexToRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255));
}
/** colour lookup table for one hex colour: one rgb per level */
export function makeLut(levels, hex, gain = GAIN) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex)), lut = [];
  for (const lv of levels) {
    if (lv.ink) lut.push(INK);
    else if (lv.soft) lut.push(INK.map((v, i) => Math.round(v * 0.55 + hexToRgb(hex)[i] * 0.45)));
    else lut.push(hslToRgb(h, s, Math.min(1, Math.max(0, l + lv.dl * gain))));
  }
  return lut;
}

/** decode a packed PNG: {w,h,idx,a,zone} */
export async function decodePacked(url) {
  const img = await loadImage(url), c = mk(img.width, img.height), x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, img.width, img.height).data, n = img.width * img.height;
  const idx = new Uint8Array(n), a = new Uint8Array(n), zone = new Uint8Array(n);
  for (let i = 0; i < n; i++) { idx[i] = d[i * 4]; a[i] = d[i * 4 + 1]; zone[i] = d[i * 4 + 2]; }
  return { w: img.width, h: img.height, idx, a, zone };
}
const _rc = new Map();
/** recoloured canvas; `skin` is used for pixels in the skin zone (and for the base body) */
export function recolor(packed, levels, color, skin) {
  const key = packed.id + "|" + color + "|" + skin;
  if (packed.id && _rc.has(key)) return _rc.get(key);
  const lut = makeLut(levels, color), lutS = skin ? makeLut(levels, skin) : lut, c = mk(packed.w, packed.h), x = c.getContext("2d"), im = x.createImageData(packed.w, packed.h), o = im.data;
  for (let i = 0, n = packed.w * packed.h; i < n; i++) {
    const a = packed.a[i]; if (!a) continue; const t = (packed.zone[i] ? lutS : lut)[packed.idx[i]] || lut[0];
    o[i * 4] = t[0]; o[i * 4 + 1] = t[1]; o[i * 4 + 2] = t[2]; o[i * 4 + 3] = a;
  }
  x.putImageData(im, 0, 0); if (packed.id) _rc.set(key, c); return c;
}

export class CharKit {
  constructor(root) { this.root = root.replace(/\/$/, ""); this.sets = {}; this.base = {}; this.baseMeta = null; }
  async init() {
    this.baseMeta = await (await fetch(`${this.root}/base/manifest.json`)).json();
    await Promise.all(DIRS.map(async (d) => { const p = await decodePacked(`${this.root}/base/dir_${d}_pk.png`); p.id = "base" + d; p.zone.fill(1); this.base[d] = p; }));
    return this;
  }
  async loadSet(name) {
    if (this.sets[name]) return this.sets[name];
    const meta = (await (await fetch(`${this.root}/parts/${name}/parts.json`)).json()).parts, parts = {};
    await Promise.all(Object.entries(meta).map(async ([k, m]) => { const p = await decodePacked(`${this.root}/parts/${name}/${m.file}`); p.id = name + "/" + k; parts[k] = { ...m, packed: p }; }));
    return (this.sets[name] = parts);
  }
  /**
   * spec = { skin:'#f2cdb8', layers:[{set, part, color, skinZone?:true, dx?, dy?, s?}] , slots... }
   * Layers draw in the given order for front dirs; back-facing dirs swap hair/clothing parts via `back` fallback.
   */
  /** visible face width (base px) left open by the chosen front hair, so eyes/brows are sized to fit under the bangs */
  _faceFit(spec, d) {
    const hl = spec.layers.find((l) => { const p = this.sets[l.set]?.[l.part]; return p && p.kind === "hair" && p.view === "S" && p.face; });
    if (!hl) return null; const p = this.sets[hl.set][hl.part], hw = BASE.head.w * 1.16 * (hl.s ?? 1);
    const top0 = BASE.head.top - 8, chin = BASE.head.chin - 4, sy = (chin - top0) / p.face[3] * (hl.s ?? 1);
    return { w: Math.max(110, (p.face[2] - p.face[0]) / p.w * hw), cx: BASE.cx + ((p.face[0] + p.face[2]) / 2 / p.w - 0.5) * hw, y0: top0 + p.face[1] * sy, color: hl.color };
  }
  /** scalp cap: hair-coloured fill over the bald skull wherever the front hair art leaves it open (not over the face window) */
  _cap(x, d, fit) {
    if (!fit || d === "N" || d === "NE") return;
    const b = this.base[d], lut = makeLut([{ dl: -0.2 }, { dl: -0.08 }], fit.color), cv = mk(BASE.w, BASE.h), cx = cv.getContext("2d"), im = cx.createImageData(BASE.w, BASE.h), o = im.data;
    const sq = d === "E" ? 0.55 : d === "SE" ? 0.86 : 1, sh = d === "E" ? 40 : d === "SE" ? 10 : 0, fl = BASE.cx + sh + (fit.cx - BASE.cx) * sq - fit.w * sq / 2, fr = fl + fit.w * sq;
    for (let y = 0; y < BASE.head.chin - 10; y++) for (let xx = 0; xx < BASE.w; xx++) {
      const i = y * BASE.w + xx; if (!b.a[i] || b.idx[i] < 2) continue;
      if (y >= fit.y0 && xx > fl && xx < fr) continue; if (d === "E" && y >= fit.y0) continue;
      const t = lut[y < fit.y0 + 30 ? 0 : 1]; o[i * 4] = t[0]; o[i * 4 + 1] = t[1]; o[i * 4 + 2] = t[2]; o[i * 4 + 3] = b.a[i];
    }
    cx.putImageData(im, 0, 0); x.drawImage(cv, 0, 0);
  }
  render(spec, dir = "S", { frame = null } = {}) {
    const flip = dir === "W" || dir === "SW" || dir === "NW", d = flip ? { W: "E", SW: "SE", NW: "NE" }[dir] : dir;
    const out = mk(BASE.w, BASE.h), x = out.getContext("2d");
    const front = d === "S" || d === "SE", back = d === "N" || d === "NE", side = d === "E";
    const squeeze = d === "E" ? 0.62 : d === "SE" || d === "NE" ? 0.86 : 1;
    const draw = (cv, w, h, cx, top, extra = {}) => {
      x.save(); x.translate(cx + (extra.dx || 0), top + (extra.dy || 0)); x.scale((extra.sx ?? 1) * (extra.sq ?? 1), 1); x.drawImage(cv, -w / 2, 0, w, h); x.restore();
    };
    const parts = (l) => this.sets[l.set]?.[l.part];
    const placed = [];
    const baseCv = recolor(this.base[d], this.baseMeta.levels, spec.skin, spec.skin);
    const stack = { hairBack: [], under: [], bottom: [], outer: [], sash: [], collar: [], hairFront: [], acc: [] };
    for (const l of spec.layers) {
      const p = parts(l); if (!p) continue;
      const kind = l.slot || p.kind;
      const view = p.view; // S = front-facing art, N = back-facing art, E = side art
      const cv = recolor(p.packed, p.levels, l.color, spec.skin), s = (l.s ?? 1);
      const cvw = p.packed.w, cvh = p.packed.h;
      const it = { l, p, cv, cvw, cvh, s, kind, view };
      (stack[{ hair: view === "N" ? "hairBack" : view === "E" ? "hairFront" : "hairFront", bottom: "bottom", outer: "outer", sash: "sash", collar: "collar", acc: "acc", trim: "acc", shoes: "acc", weapon: "acc", prop: "acc" }[kind] || "acc"]).push(it);
    }
    // --- back-facing parts shown only for N/NE; front-facing only for S/SE/E (side uses squeezed front)
    const has = (pred) => spec.layers.some((l) => { const p = parts(l); return p && pred(p, l); });
    const hasEHair = has((p) => p.kind === "hair" && p.view === "E"), hasBackCloth = (kind) => has((p) => (p.kind === kind) && p.view === "N");
    const show = (it) => {
      if (it.kind === "hair") { if (it.view === "N") return true; if (it.view === "E") return side; return side ? !hasEHair : !back; }
      if (it.view === "N") return back; if (it.view === "S") return !back || !hasBackCloth(it.kind); return true;
    };
    const place = (it) => {
      const { kind, cvw, cvh, s } = it, hw = BASE.head.w, sx = squeeze, cx = BASE.cx + (d === "SE" || d === "NE" ? 8 : 0), L = it.l;
      const fit = (w, top, anchorBottom = false) => { const sc = (w / cvw) * s, w2 = cvw * sc, h2 = cvh * sc; return { w: w2, h: h2, top: anchorBottom ? top - h2 : top }; };
      if (kind === "hair") {
        const chin = BASE.head.chin - 4, top0 = BASE.head.top - 8, fb = it.p.face;
        if (it.view === "N") { const sc = (hw * 1.16 / cvw) * s; return { w: cvw * sc, h: cvh * sc * 1.04, top: top0, cx, sq: Math.max(sx, 0.9) }; }
        if (it.view === "E") {
          // side art: fit the visible face box bottom to the chin and keep the part's aspect
          const sc = fb ? ((chin - top0) / fb[3]) * s : ((hw * 0.95) / cvw) * s; return { w: cvw * sc, h: cvh * sc, top: top0, cx: BASE.cx - 6, sq: 1 };
        }
        // front: width so the hair spans ~1.16 head widths, height so the chin line of the face box lands on the base chin
        const w2 = hw * 1.16 * s, h2 = fb ? cvh * ((chin - top0) / fb[3]) * s : cvh * (w2 / cvw);
        return { w: w2, h: h2, top: top0 - (s - 1) * 10, cx, sq: Math.max(sx, 0.9) };
      }
      if (kind === "outer") { const f = fit(BASE.shoulderW * 1.32, BASE.neck - 4); return { ...f, cx, sq: sx }; }
      if (kind === "collar") { const f = fit(BASE.shoulderW * 0.88, BASE.neck - 8); return { ...f, cx, sq: sx }; }
      if (kind === "bottom") { const f = fit(BASE.shoulderW * 0.98, BASE.feetY + 2, true); return { ...f, cx, sq: sx }; }
      if (kind === "sash") { const f = fit(BASE.shoulderW * 0.86, BASE.waistY - 14); return { ...f, cx, sq: sx }; }
      const f = fit(BASE.shoulderW * 0.6, BASE.waistY); return { ...f, cx, sq: sx };
    };
    // draw order: back hair, base, bottom, outer, sash, collar, front hair, acc
    x.save();
    const order = back ? ["BASE", "bottom", "outer", "collar", "sash", "hairBack", "hairFront", "acc"] : ["hairBack", "BASE", "bottom", "outer", "collar", "sash", "hairFront", "acc"];
    for (const k of order) {
      if (k === "BASE") { x.drawImage(baseCv, 0, 0); this._cap(x, d, this._faceFit(spec, d)); drawFace(x, { ...(spec.face || {}), fit: this._faceFit(spec, d) }, d); continue; }
      for (const it of stack[k]) { if (!show(it)) continue; const pl = place(it); draw(it.cv, pl.w, pl.h, pl.cx, pl.top, { sq: pl.sq, dx: it.l.dx, dy: it.l.dy }); }
    }
    x.restore();
    if (!flip) return out;
    const f = mk(BASE.w, BASE.h), fx = f.getContext("2d"); fx.translate(BASE.w, 0); fx.scale(-1, 1); fx.drawImage(out, 0, 0); return f;
  }
}
