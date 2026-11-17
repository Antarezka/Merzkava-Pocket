// Procedural puppet animation applied to a composed 384x512 character sprite (any direction).
// walk: body bob + sway, legs lifted alternately (and swung front/back on side views). idle: slow breathing.
import { BASE } from "./charkit.js";

const HIP0 = 372;          // crotch row in the base sprite
const mk = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/**
 * @param sprite composed sprite canvas (BASE.w x BASE.h)
 * @param dir    "S","SE","E","NE","N","NW","W","SW"
 * @param mode   "idle" | "walk"
 * @param t      phase in [0,1)
 */
export function poseSprite(sprite, dir, mode, t, o = {}) {
  const W = o.w ?? BASE.w, H = o.h ?? BASE.h, cx = o.cx ?? (o.w ? o.w / 2 : BASE.cx), HIP = o.hip ?? HIP0, K = H / BASE.h;
  const out = mk(W, H), x = out.getContext("2d");
  const sideways = dir === "E" || dir === "W", diag = dir.length === 2;
  const ph = t * Math.PI * 2;
  if (mode === "idle") {
    const br = Math.sin(ph) * 0.5 + 0.5;
    x.drawImage(sprite, 0, HIP, W, H - HIP, 0, HIP, W, H - HIP);
    x.save(); x.translate(cx, HIP); x.scale(1 + br * 0.008, 1 + br * 0.014); x.translate(-cx, -HIP);
    x.drawImage(sprite, 0, 0, W, HIP, 0, 0, W, HIP); x.restore();
    return out;
  }
  const bob = -Math.abs(Math.sin(ph)) * 9 * K, sway = Math.sin(ph) * 0.028 * (sideways ? 0.4 : 1), squash = 1 - Math.abs(Math.sin(ph)) * 0.012;
  // legs: split at the centre line (front/back views) or swing by stride (side views)
  const L = Math.max(0, Math.sin(ph)), R = Math.max(0, -Math.sin(ph)), lift = 15 * K;
  const legH = H - HIP;
  if (sideways) {
    // two leg "slices": back leg & front leg swing opposite ways around the hip
    const stride = Math.sin(ph) * 24 * K;
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
      x.drawImage(sprite, 0, 0, W, H, k * spread * K, bob * 0.4 - lifted, W, H); x.restore();
    }
  }
  // torso/head: bob, sway around the hip
  x.save(); x.beginPath(); x.rect(0, 0, W, HIP + 6); x.clip();
  x.translate(cx, HIP + bob); x.rotate(sway); x.scale(1, squash); x.translate(-cx, -HIP);
  x.drawImage(sprite, 0, 0); x.restore();
  return out;
}

/**
 * Sprite sheet for the engine: 8 rows (every direction is its own traced view), columns = idle frames then walk frames.
 * kit = ModelKit (models.js); spec = { model, colors, face, shape }
 */
export const SHEET_ROWS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"];
export function buildSheet(kit, spec, { idleFrames = 1, walkFrames = 6, scale = 0.8 } = {}) {
  const CW = kit.cell.w, CH = kit.cell.h, cw = Math.round(CW * scale), ch = Math.round(CH * scale), hip = kit.hipRow(spec.model), stride = kit.hasWalk?.(spec.model);
  if (stride) walkFrames = 4;   // models with a drawn walking pose: stride pose <-> passing pose, each with a small bob
  const cols = idleFrames + walkFrames, sheet = mk(cw * cols, ch * SHEET_ROWS.length), sx = sheet.getContext("2d"); sx.imageSmoothingQuality = "high";
  SHEET_ROWS.forEach((d, r) => {
    const spr = kit.render(spec, d), o = { w: CW, h: CH, hip };
    for (let i = 0; i < idleFrames; i++) sx.drawImage(spr, 0, 0, CW, CH, i * cw, r * ch, cw, ch);   // idle = the plain view; drawBreathing() animates it live
    if (stride) {
      const wk = kit.render(spec, d, "walk"), K = CH / 300, F = [[wk, 0, 1], [spr, -6 * K, 1.012], [wk, 0, 1], [spr, -6 * K, 1.012]];
      for (let i = 0; i < walkFrames; i++) {
        const [src, dy, sq] = F[i], c = mk(CW, CH), cx = c.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.translate(CW / 2, kit.cell.feet + dy); cx.scale(1 / sq, sq); cx.translate(-CW / 2, -kit.cell.feet); cx.drawImage(src, 0, 0);
        sx.drawImage(c, 0, 0, CW, CH, (idleFrames + i) * cw, r * ch, cw, ch);
      }
    } else for (let i = 0; i < walkFrames; i++) sx.drawImage(poseSprite(spr, d, "walk", i / walkFrames, o), 0, 0, CW, CH, (idleFrames + i) * cw, r * ch, cw, ch);
  });
  return { canvas: sheet, cell: [cw, ch], rows: SHEET_ROWS, idleFrames, walkFrames, scale, feet: CH ? kit.cell.feet / CH : 1, hip: hip / CH, stride: !!stride };
}

/**
 * Idle "breathing" for any character cell, drawn live (smooth, works for every model/direction).
 * The cell is split at the hip: legs stay planted, the torso+head rise/expand a little with each breath and drift a hair side to side.
 * (src, sx,sy,sw,sh) = source rect of one cell, (dx,dy,dw,dh) = destination rect, hip = hip row as a fraction of the cell height, t = seconds.
 */
export function drawBreathing(c, src, sx, sy, sw, sh, dx, dy, dw, dh, hip, t, amp = 1) {
  const b = (Math.sin(t * 2.3) + 1) / 2, hs = Math.max(1, Math.min(sh - 1, Math.round(sh * hip))), hd = dh * hs / sh;
  c.drawImage(src, sx, sy + hs, sw, sh - hs, dx, dy + hd, dw, dh - hd);
  c.save(); c.translate(dx + dw / 2, dy + hd); c.transform(1, 0, Math.sin(t * 1.3 + 0.7) * 0.007 * amp, 1, 0, 0); c.scale(1 + b * 0.01 * amp, 1 + b * 0.026 * amp);
  c.drawImage(src, sx, sy, sw, hs, -dw / 2, -hd, dw, hd); c.restore();
}
