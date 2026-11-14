// Face features (eyes / brows / mouth / blush) drawn as smooth inked vector shapes on top of the blank chibi base.
// Everything is parametric so eye colour, brow colour, shape and expression are all player-selectable.
import { INK, hexToRgb } from "./charkit.js";

export const EYE_SHAPES = {
  round:   { w: 44, h: 52, slant: 0,  lid: 1.0 },
  almond:  { w: 52, h: 39, slant: 3,  lid: 1.0 },
  narrow:  { w: 55, h: 29, slant: 6,  lid: 1.1 },
  droopy:  { w: 47, h: 47, slant: -6, lid: 0.9 },
  cat:     { w: 55, h: 36, slant: 9,  lid: 1.2 },
  big:     { w: 49, h: 60, slant: 0,  lid: 0.9 },
};
export const EXPRESSIONS = {
  neutral:   { eyes: "open",   brow: [0, 0],    mouth: "line",   blush: 0 },
  smile:     { eyes: "open",   brow: [-2, 2],   mouth: "smile",  blush: 0.4 },
  happy:     { eyes: "arc",    brow: [-3, 3],   mouth: "open",   blush: 0.7 },
  wink:      { eyes: "wink",   brow: [-2, 2],   mouth: "smile",  blush: 0.4 },
  fierce:    { eyes: "fierce", brow: [9, -4],   mouth: "frown",  blush: 0 },
  old:       { eyes: "half",   brow: [4, -2],   mouth: "line",   blush: 0, wrinkles: true },
  coy:       { eyes: "coy",    brow: [-1, 4],   mouth: "cat",    blush: 1 },
  handsome:  { eyes: "sharp",  brow: [4, -3],   mouth: "smirk",  blush: 0 },
  sleepy:    { eyes: "half",   brow: [0, 0],    mouth: "line",   blush: 0.2 },
  surprised: { eyes: "wide",   brow: [-8, 8],   mouth: "o",      blush: 0 },
  sad:       { eyes: "droop",  brow: [-6, 6],   mouth: "frown",  blush: 0 },
};
const ink = () => `rgb(${INK[0]},${INK[1]},${INK[2]})`;
const shade = (hex, k) => { const [r, g, b] = hexToRgb(hex); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };

function path(x, fn) { x.beginPath(); fn(x); }
function openEye(x, s, side, iris, kind) {
  // side: -1 left, +1 right (screen). Outer corner is at +side*w/2.
  const { w, h, slant, lid } = s, hw = w / 2;
  const hh = kind === "half" ? h * 0.55 : kind === "wide" ? h * 1.1 : kind === "sharp" ? h * 0.7 : kind === "fierce" ? h * 0.65 : kind === "coy" ? h * 0.7 : kind === "droop" ? h * 0.85 : h;
  const outer = -(slant + (kind === "fierce" || kind === "sharp" ? 5 : kind === "droop" ? -6 : 0));
  x.save(); x.scale(side, 1);
  // eye white
  path(x, (c) => { c.moveTo(-hw, 0); c.quadraticCurveTo(0, -hh * 1.05 * lid, hw, outer); c.quadraticCurveTo(0, hh * 0.85, -hw, 0); c.closePath(); });
  x.fillStyle = "#fbf8f4"; x.fill();
  x.save(); x.clip();
  const ir = Math.min(hh * 0.52, hw * 0.72), ix = -hw * 0.08 * 0; // iris near centre
  const g = x.createLinearGradient(0, -ir, 0, ir); g.addColorStop(0, shade(iris, 0.62)); g.addColorStop(0.55, iris); g.addColorStop(1, shade(iris, 1.25));
  x.fillStyle = g; x.beginPath(); x.ellipse(ix, 0, ir * 0.82, ir * 1.02, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#2a1d26"; x.beginPath(); x.ellipse(ix, 1, ir * 0.38, ir * 0.5, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#ffffff"; x.beginPath(); x.ellipse(ix - ir * 0.3, -ir * 0.35, ir * 0.22, ir * 0.26, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(ix + ir * 0.3, ir * 0.3, ir * 0.1, ir * 0.1, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  // upper lid line (thick) + lash flick at outer corner, lower lid thin
  x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = ink();
  x.lineWidth = kind === "wide" ? 3 : 4.4; path(x, (c) => { c.moveTo(-hw - 1, 1); c.quadraticCurveTo(0, -hh * 1.05 * lid, hw + 1, outer); }); x.stroke();
  x.lineWidth = 6; path(x, (c) => { c.moveTo(hw - 6, outer - hh * 0.25); c.lineTo(hw + 6, outer - 4 + (kind === "coy" ? -6 : 0)); }); x.stroke();
  x.lineWidth = 1.8; path(x, (c) => { c.moveTo(-hw * 0.7, hh * 0.3); c.quadraticCurveTo(0, hh * 0.85, hw * 0.8, outer * 0.6 + hh * 0.2); }); x.stroke();
  if (kind === "half" || kind === "coy") { x.lineWidth = 3; path(x, (c) => { c.moveTo(-hw, -hh * 0.1); c.quadraticCurveTo(0, -hh * 0.25, hw, outer); }); x.stroke(); }
  x.restore();
}
function arcEye(x, s, side, up) {
  x.save(); x.scale(side, 1); x.strokeStyle = ink(); x.lineWidth = 4.6; x.lineCap = "round";
  const hw = s.w * 0.5; path(x, (c) => { c.moveTo(-hw, 4); c.quadraticCurveTo(0, up ? -s.h * 0.75 : s.h * 0.75, hw, 4 - s.slant * 0.5); }); x.stroke();
  x.lineWidth = 5; path(x, (c) => { c.moveTo(hw - 3, 2); c.lineTo(hw + 5, -3); }); x.stroke(); x.restore();
}
function brow(x, color, side, tilt, y) {
  x.save(); x.scale(side, 1); x.strokeStyle = color; x.lineCap = "round"; x.lineWidth = 5.2;
  path(x, (c) => { c.moveTo(-18, y + tilt * 0.4); c.quadraticCurveTo(0, y - 5 - Math.abs(tilt) * 0.2, 19, y - tilt * 0.9 + 1); }); x.stroke(); x.restore();
}
function mouth(x, kind, cx, y) {
  x.save(); x.translate(cx, y); x.strokeStyle = ink(); x.lineWidth = 3.4; x.lineCap = "round"; x.lineJoin = "round";
  const stroke = (fn) => { path(x, fn); x.stroke(); };
  if (kind === "line") stroke((c) => { c.moveTo(-9, 0); c.quadraticCurveTo(0, 3, 9, 0); });
  else if (kind === "smile") stroke((c) => { c.moveTo(-13, -2); c.quadraticCurveTo(0, 12, 13, -2); });
  else if (kind === "frown") stroke((c) => { c.moveTo(-11, 5); c.quadraticCurveTo(0, -3, 11, 5); });
  else if (kind === "smirk") stroke((c) => { c.moveTo(-9, 2); c.quadraticCurveTo(2, 4, 14, -5); });
  else if (kind === "cat") stroke((c) => { c.moveTo(-14, -2); c.quadraticCurveTo(-7, 8, 0, -1); c.quadraticCurveTo(7, 8, 14, -2); });
  else if (kind === "o") { path(x, (c) => c.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2)); x.fillStyle = "#7a2c3a"; x.fill(); x.stroke(); }
  else if (kind === "open") { path(x, (c) => { c.moveTo(-13, -3); c.quadraticCurveTo(0, 22, 13, -3); c.closePath(); }); x.fillStyle = "#8a2f40"; x.fill(); x.stroke(); x.fillStyle = "#f0828c"; x.beginPath(); x.ellipse(0, 8, 6, 3, 0, 0, Math.PI * 2); x.fill(); }
  x.restore();
}
/**
 * face = { eyeShape, expression, eyeColor, browColor, blushColor }
 * dir: "S" | "SE" | "E" (W/SW/SE-mirrored dirs are flipped by the caller). N/NE draw nothing.
 */
export function drawFace(x, face, dir, headCx = 191, eyeY = 168) {
  if (dir === "N" || dir === "NE") return;
  const shape = EYE_SHAPES[face.eyeShape] || EYE_SHAPES.round, ex = EXPRESSIONS[face.expression] || EXPRESSIONS.neutral;
  const eyeColor = face.eyeColor || "#6b4a3a", browColor = face.browColor || "#3b2c36", blush = face.blushColor || "#f08a8a";
  const fw = face.fit ? face.fit.w : 150, k = Math.max(0.55, Math.min(1, fw / 150));
  const squeeze = dir === "E" ? 0.55 : dir === "SE" ? 0.86 : 1, off = dir === "E" ? 40 : dir === "SE" ? 10 : 0, gap = 54;
  x.save(); x.translate(headCx + off, eyeY); x.scale(squeeze * k, k); x.translate(0, -eyeY); x.save(); x.translate(0, 0);
  const eyes = dir === "E" ? [1] : [-1, 1];
  for (const side of eyes) {
    x.save(); x.translate(side * gap, eyeY);
    const k = ex.eyes, wink = k === "wink" && side === 1;
    if (k === "arc" || wink) arcEye(x, shape, side, true);
    else openEye(x, shape, side, eyeColor, k === "open" ? "open" : k === "droop" ? "droop" : k);
    if (ex.wrinkles) { x.strokeStyle = ink(); x.lineWidth = 1.8; for (let i = 0; i < 2; i++) path(x, (c) => { c.moveTo(side * (24 + i * 3), 8 + i * 6); c.lineTo(side * (34 + i * 3), 10 + i * 6); }), x.stroke(); }
    x.restore();
    x.save(); x.translate(side * gap, eyeY); brow(x, browColor, side, ex.brow[side === -1 ? 0 : 1], -shape.h - 8 + (ex.eyes === "wide" ? -6 : 0)); x.restore();
    if (ex.blush) { x.save(); x.globalAlpha = 0.45 * ex.blush; x.fillStyle = blush; x.beginPath(); x.ellipse(side * (gap + 6), eyeY + 34, 15, 8, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
  }
  mouth(x, ex.mouth, dir === "E" ? 26 : 0, eyeY + 62);
  x.restore(); x.restore();
}
