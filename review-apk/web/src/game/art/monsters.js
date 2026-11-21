// Monster puppets: every species is one clean portrait illustration (public/game-art/monsters/<art>.png), animated procedurally —
// breathing, walk hop + tilt, wind-up / lunge / recover attack, hit recoil + white flash, topple-and-fade death, pop-in spawn.
// Recolours (zones 7+, sub bosses, bosses) are made once with a canvas filter (hue / saturation / brightness).
import { createCanvas } from "./paint.js";
import { ART } from "../data/mobs.js";

const store = new Map();   // key -> sprite | "loading" | null
const LIFT = { vampire_bat: 30 };    // hovering creatures
const keyOf = (sp) => `${sp.art}|${sp.hue || 0}|${sp.sat || 1}|${sp.bri || 1}`;
const loadImg = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });

function bake(img, sp) {
  const w = img.naturalWidth, h = img.naturalHeight, base = createCanvas(w, h), bx = base.getContext("2d");
  const tint = (sp.hue || sp.sat || sp.bri) && "filter" in bx;
  if (tint) bx.filter = `hue-rotate(${sp.hue || 0}deg) saturate(${sp.sat || 1}) brightness(${sp.bri || 1})`;
  bx.drawImage(img, 0, 0); bx.filter = "none";
  const white = createCanvas(w, h), wx = white.getContext("2d"); wx.drawImage(base, 0, 0); wx.globalCompositeOperation = "source-in"; wx.fillStyle = "#fff"; wx.fillRect(0, 0, w, h);
  return { img: base, white, w, h };
}
/** load (and recolour) the portraits for these species; resolves when every one is ready */
export function loadMonsterArt(base, species) {
  const root = base + "game-art/monsters/", jobs = [], raw = new Map();
  const getRaw = (art) => { if (!raw.has(art)) raw.set(art, loadImg(`${root}${art}.png`)); return raw.get(art); };
  for (const sp of species) { const k = keyOf(sp); if (store.get(k) && store.get(k) !== "loading") continue; store.set(k, "loading"); jobs.push(getRaw(sp.art).then((img) => store.set(k, img ? bake(img, sp) : null))); }
  return Promise.all(jobs);
}
export const monsterSprite = (sp) => { const s = store.get(keyOf(sp)); return s && s !== "loading" ? s : null; };

const ease = (k) => k * k * (3 - 2 * k), back = (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);

/** s = { x, y (feet), h (world height), face (+1 moving right), t, id, mv (0..1), swing (-1 | 0..1), hit (0..1), flash (0..1), born (0..1), dead (0..1), art } */
export function drawMonster(c, spr, s) {
  const art = ART[s.art] || { face: 1 }, k = Math.min(s.h / spr.h, (s.h * 2.0) / spr.w), w = spr.w * k, h = spr.h * k, tt = s.t + s.id * 3.1, mv = s.mv || 0, lift = (LIFT[s.art] || 0) * (s.h / (ART[s.art]?.h || s.h));
  const hover = lift ? lift + Math.sin(tt * 3.2) * 4 : 0, hop = Math.abs(Math.sin(tt * 8.4)) * mv;
  let sx = 1 + Math.sin(tt * 2.2 + 1) * -0.012, sy = 1 + Math.sin(tt * 2.2) * 0.026, rot = Math.sin(tt * 1.3) * 0.012, ox = 0, oy = -hop * Math.min(7, h * 0.07) * (lift ? 0 : 1) - hover;
  rot += Math.sin(tt * 8.4) * 0.045 * mv; sy *= 1 + (0.028 * Math.cos(tt * 16.8)) * mv;
  const sw = s.swing ?? -1;
  if (sw >= 0 && sw <= 1) {                              // wind-up -> lunge -> recover
    if (sw < 0.32) { const e = ease(sw / 0.32); ox -= 8 * e; rot -= 0.14 * e; sy *= 1 + 0.07 * e; sx *= 1 - 0.04 * e; }
    else if (sw < 0.55) { const e = ease((sw - 0.32) / 0.23); ox += -8 + 34 * e; rot += -0.14 + 0.34 * e; sx *= 0.96 + 0.18 * e; sy *= 1.07 - 0.14 * e; }
    else { const e = ease((sw - 0.55) / 0.45); ox += 26 * (1 - e); rot += 0.2 * (1 - e); sx *= 1.14 - 0.14 * e; sy *= 0.93 + 0.07 * e; }
  }
  if (s.hit > 0) { ox -= 9 * s.hit; rot -= 0.12 * s.hit; sy *= 1 - 0.07 * s.hit; sx *= 1 + 0.06 * s.hit; }
  let alpha = 1; const born = s.born ?? 1;
  if (born < 1) { const e = Math.max(0, back(Math.min(1, born))); sx *= 0.5 + 0.5 * e; sy *= 0.5 + 0.5 * e; alpha = Math.min(1, born * 2.2); }
  const d = s.dead || 0; if (d > 0) { const e = ease(d); sy *= 1 - 0.72 * e; sx *= 1 + 0.22 * e; rot += 0.35 * e; oy += 6 * e; alpha *= 1 - d * d; }
  // ground shadow
  c.save(); c.globalAlpha = 0.28 * alpha * (1 - hop * 0.35 - (lift ? 0.3 : 0)); c.fillStyle = "#1a1424"; c.beginPath(); c.ellipse(s.x, s.y - 2, w * 0.4 * (0.9 + 0.1 * sy) * (1 + 0.1 * d), Math.max(5, h * 0.09), 0, 0, 6.2832); c.fill(); c.restore();
  if (alpha <= 0.01) return;
  c.save(); c.globalAlpha = alpha; c.translate(s.x, s.y + oy); c.scale((s.face || 1) * (art.face || 1), 1); c.translate(ox, 0); c.rotate(rot); c.scale(sx, sy);
  c.imageSmoothingQuality = "high"; c.drawImage(spr.img, -w / 2, -h, w, h);
  if (s.flash > 0.02) { c.globalAlpha = alpha * Math.min(0.85, s.flash * 0.9); c.drawImage(spr.white, -w / 2, -h, w, h); }
  c.restore();
}
/** top of the body (world y) - used to place HP bars */
export const topOf = (s, h) => s.y - h - ((LIFT[s.art] || 0) * (h / (ART[s.art]?.h || h)));
