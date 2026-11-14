// Procedural puppet animation applied to a composed 384x512 character sprite (any direction).
// walk: body bob + sway, legs lifted alternately (and swung front/back on side views). idle: slow breathing.
import { BASE } from "./charkit.js";

const HIP = 372;          // crotch row in the base sprite
const mk = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/**
 * @param sprite composed sprite canvas (BASE.w x BASE.h)
 * @param dir    "S","SE","E","NE","N","NW","W","SW"
 * @param mode   "idle" | "walk"
 * @param t      phase in [0,1)
 */
export function poseSprite(sprite, dir, mode, t) {
  const out = mk(BASE.w, BASE.h), x = out.getContext("2d"), cx = BASE.cx, W = BASE.w, H = BASE.h;
  const sideways = dir === "E" || dir === "W", diag = dir.length === 2;
  const ph = t * Math.PI * 2;
  if (mode === "idle") {
    const br = Math.sin(ph) * 0.5 + 0.5;
    x.drawImage(sprite, 0, HIP, W, H - HIP, 0, HIP, W, H - HIP);
    x.save(); x.translate(cx, HIP); x.scale(1 + br * 0.008, 1 + br * 0.014); x.translate(-cx, -HIP);
    x.drawImage(sprite, 0, 0, W, HIP, 0, 0, W, HIP); x.restore();
    return out;
  }
  const bob = -Math.abs(Math.sin(ph)) * 9, sway = Math.sin(ph) * 0.028 * (sideways ? 0.4 : 1), squash = 1 - Math.abs(Math.sin(ph)) * 0.012;
  // legs: split at the centre line (front/back views) or swing by stride (side views)
  const L = Math.max(0, Math.sin(ph)), R = Math.max(0, -Math.sin(ph)), lift = 15;
  const legH = H - HIP;
  if (sideways) {
    // two leg "slices": back leg & front leg swing opposite ways around the hip
    const stride = Math.sin(ph) * 24;
    for (const k of [-1, 1]) {
      const lifted = (k > 0 ? L : R) * lift;
      x.save(); x.beginPath(); x.rect(0, HIP + bob * 0.4, W, legH + 20); x.clip();
      x.translate(cx, HIP); x.transform(1, 0, (k * stride) / legH * 1.0, 1, 0, 0); x.translate(-cx, -HIP);
      x.beginPath(); x.rect(k > 0 ? cx - 6 : 0, HIP, k > 0 ? W : cx + 6, legH + 4); x.clip();
      x.drawImage(sprite, 0, 0, W, H, 0, bob * 0.4 - lifted, W, H); x.restore();
    }
  } else {
    for (const k of [-1, 1]) {
      const lifted = (k < 0 ? L : R) * lift, spread = (k < 0 ? L : R) * 2;
      x.save(); x.beginPath(); x.rect(k < 0 ? 0 : cx, HIP, k < 0 ? cx : W - cx, legH + 20); x.clip();
      x.drawImage(sprite, 0, 0, W, H, k * spread, bob * 0.4 - lifted, W, H); x.restore();
    }
  }
  // torso/head: bob, sway around the hip
  x.save(); x.beginPath(); x.rect(0, 0, W, HIP + 6); x.clip();
  x.translate(cx, HIP + bob); x.rotate(sway); x.scale(1, squash); x.translate(-cx, -HIP);
  x.drawImage(sprite, 0, 0); x.restore();
  return out;
}

/** build a full sprite sheet: rows = 8 directions, columns = frames (idle first, then walk). Returns canvas + layout. */
export function buildSheet(kit, spec, { idleFrames = 4, walkFrames = 8 } = {}) {
  const dirs = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"], cols = idleFrames + walkFrames, sheet = mk(BASE.w * cols, BASE.h * dirs.length), sx = sheet.getContext("2d");
  dirs.forEach((d, r) => {
    const spr = kit.render(spec, d);
    for (let i = 0; i < idleFrames; i++) sx.drawImage(poseSprite(spr, d, "idle", i / idleFrames), i * BASE.w, r * BASE.h);
    for (let i = 0; i < walkFrames; i++) sx.drawImage(poseSprite(spr, d, "walk", i / walkFrames), (idleFrames + i) * BASE.w, r * BASE.h);
  });
  return { canvas: sheet, frame: [BASE.w, BASE.h], dirs, idleFrames, walkFrames };
}
