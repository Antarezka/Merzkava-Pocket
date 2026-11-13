import { makeLayer, TAU } from "./paint.js";
import { inkify } from "./ink.js";
import { CHARACTER_OPTIONS, defaultAppearance, randomAppearance, normalizeAppearance, optionOf } from "./character/options.js";
import { drawCharacter, headCenter, CELL } from "./character/draw.js";

export { CHARACTER_OPTIONS, defaultAppearance, randomAppearance, normalizeAppearance };

/** Front-view portrait fitted into {x,y,w,h}. bust:true crops head+shoulders. */
export function drawPortrait(ctx, appearance, opts = {}) {
  if (opts.raw) return drawPortraitRaw(ctx, appearance, opts);
  const { x = 0, y = 0, w = 128, h = 176, bust = false, expression } = opts, dpr = opts.dpr || (globalThis.devicePixelRatio || 1);
  const sc = Math.min(3, Math.max(1, Math.ceil(dpr))), k = Math.min(w / (bust ? 92 : CELL.w), h / (bust ? 92 : CELL.h)) * sc;
  const cw = Math.round((bust ? 92 : CELL.w) * k), ch = Math.round((bust ? 92 : CELL.h) * k);
  const [c, cx] = makeLayer(cw, ch);
  drawPortraitRaw(cx, appearance, { x: 0, y: 0, w: cw, h: ch, bust, expression });
  const { canvas, pad } = inkify(c, { outline: 1.6 * sc, pad: 5 * sc, grain: 0.2 });
  const dw = canvas.width / sc, dh = canvas.height / sc;
  ctx.drawImage(canvas, x + (w - cw / sc) / 2 - pad / sc, y + (h - ch / sc) / 2 - pad / sc, dw, dh);
}
function drawPortraitRaw(ctx, appearance, { x = 0, y = 0, w = 128, h = 176, bust = false, expression } = {}) {
  const A = normalizeAppearance(appearance);
  ctx.save();
  if (bust) {
    const hc = headCenter(A), sw = 92, sh = 92, sx = hc.x - sw / 2, sy = hc.y - hc.ry - 14;
    const s = Math.min(w / sw, h / sh);
    ctx.translate(x + (w - sw * s) / 2, y + (h - sh * s) / 2); ctx.scale(s, s); ctx.translate(-sx, -sy);
    ctx.beginPath(); ctx.rect(sx - 4, sy - 4, sw + 8, sh + 8); ctx.clip();
    drawCharacter(ctx, A, { view: "down", expression, shadow: false });
  } else {
    const s = Math.min(w / CELL.w, h / CELL.h);
    ctx.translate(x + (w - CELL.w * s) / 2, y + (h - CELL.h * s) / 2); ctx.scale(s, s);
    drawCharacter(ctx, A, { view: "down", expression });
  }
  ctx.restore();
}

const SWATCH = { skin: "color", eyeColor: "color", hairColor: "color" };
/** Square thumbnail of option `optionId` in `slot`, on top of the current appearance. */
export function drawPartThumb(ctx, slot, optionId, appearance, size = 72) {
  const A = normalizeAppearance({ ...appearance, [slot]: optionId });
  const opt = optionOf(slot, optionId);
  ctx.save();
  if (SWATCH[slot]) {
    const g = ctx.createRadialGradient(size * 0.38, size * 0.34, size * 0.05, size / 2, size / 2, size * 0.55);
    g.addColorStop(0, opt.light || "#ffffff"); g.addColorStop(0.45, opt.color); g.addColorStop(1, opt.shadow || opt.color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(58,42,60,.5)"; ctx.lineWidth = 1.2; ctx.stroke();
  } else if (slot === "body" || slot === "gender" || slot === "outfit") {
    drawPortrait(ctx, A, { x: 0, y: 0, w: size, h: size, bust: false });
  } else {
    const hc = headCenter(A);
    const zoom = slot === "eyes" || slot === "expression" ? { w: 58, dy: -2, cy: hc.y + hc.ry * 0.28 } : { w: 100, dy: 0, cy: hc.y - hc.ry * 0.28 };
    const s = size / zoom.w;
    ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.clip();
    ctx.translate(size / 2 - hc.x * s, size / 2 - zoom.cy * s); ctx.scale(s, s);
    const forced = slot === "expression" || slot === "eyes" ? { expression: slot === "expression" ? optionId : undefined } : {};
    drawCharacter(ctx, A, { view: "down", shadow: false, ...forced });
  }
  ctx.restore();
}

const ANIMS = [["idle_down", "down", false, 4], ["walk_down", "down", true, 6], ["idle_up", "up", false, 2], ["walk_up", "up", true, 6], ["idle_side", "side", false, 4], ["walk_side", "side", true, 6]];
/** Bakes a sprite sheet: one row per animation; side faces RIGHT. */
export function bakeSheet(appearance, { scale = 1 } = {}) {
  const A = normalizeAppearance(appearance), cw = Math.round(CELL.w * scale), ch = Math.round(CELL.h * scale), cols = 6;
  const [canvas, ctx] = makeLayer(cw * cols, ch * ANIMS.length);
  const anims = {};
  ANIMS.forEach(([name, view, walking, n], row) => {
    anims[name] = [];
    for (let i = 0; i < n; i++) {
      const [fc, fx] = makeLayer(cw, ch); fx.scale(scale, scale);
      drawCharacter(fx, A, { view, walking, phase: i / n });
      const ink = inkify(fc, { outline: 1.5 * scale + 0.5, pad: 3, grain: 0.2, seed: 5 + i });
      ctx.drawImage(ink.canvas, i * cw - ink.pad, row * ch - ink.pad);
      anims[name].push({ sx: i * cw, sy: row * ch });
    }
  });
  return { canvas, cell: { w: cw, h: ch }, pivot: { x: cw / 2, y: Math.round(168 * scale) }, anims };
}

const NPCS = {
  merchant: { gender: "male", body: "stout", head: "round", skin: "tan", eyes: "droopy", eyeColor: "brown", expression: "smile", fringe: "none", sideL: "none", sideR: "none", hairBack: "topknot", hairColor: "silver", outfit: "wanderer", accessory: "headband" },
  steward: { gender: "male", body: "tall", head: "long", skin: "fair", eyes: "sharp", eyeColor: "ink", expression: "elder", fringe: "none", sideL: "short", sideR: "short", hairBack: "topknot", hairColor: "snow", outfit: "jade", accessory: "guan" },
  villager_a: { gender: "female", body: "petite", head: "round", skin: "peach", eyes: "doe", eyeColor: "brown", expression: "shy", fringe: "blunt", sideL: "braid", sideR: "braid", hairBack: "twin_braids", hairColor: "chestnut", outfit: "sunrise", accessory: "ribbon" },
  villager_b: { gender: "male", body: "sturdy", head: "square", skin: "honey", eyes: "almond", eyeColor: "brown", expression: "smirk", fringe: "sweep_r", sideL: "short", sideR: "short", hairBack: "short_messy", hairColor: "darkbrown", outfit: "wanderer", accessory: "none" },
};
export function npcAppearance(id) { return normalizeAppearance(NPCS[id] || randomAppearance(id.length * 977)); }
