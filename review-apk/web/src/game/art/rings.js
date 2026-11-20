// Spirit Ring orbits: every bound ring circles the hero on the ground in its own colour and pattern; neighbouring rings turn in opposite directions,
// and the ring being absorbed already circles on the next outer orbit (fading in as the absorption advances), settling there when it succeeds.
// Each ring is drawn in two passes (back half behind the hero, front half in front) so the orbit wraps around the sprite.
import { RING_TIERS } from "../data/realms.js";

const PATTERNS = ["rune", "bead", "lotus", "kite", "spark", "tomoe"];
const hash = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const rgb = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
export function ringLook(ring) { const x = hash(ring.id || "ring"); return { pat: PATTERNS[x % PATTERNS.length], n: 9 + ((x >> 3) % 9), size: 0.85 + ((x >> 7) % 5) * 0.08, phase: ((x >> 11) % 628) / 100 }; }

/** items for the orbit renderer: bound rings in slot order (k = 0 innermost), plus the ring being absorbed on the next orbit */
export function orbitItems(cult, prog = null) {
  const items = []; let k = 0; if (!cult) return items;
  for (const r of cult.rings || []) if (r) { items.push({ ring: r, k, dir: k % 2 ? -1 : 1, alpha: 1 }); k++; }
  if (cult.absorb) items.push({ ring: cult.absorb.ring, k, dir: k % 2 ? -1 : 1, alpha: 0.22 + 0.78 * (prog ?? 0), absorbing: true, prog: prog ?? 0 });
  return items;
}
export const orbitRadius = (k) => 30 + 12 * k;

function shape(c, pat, u, ta, oa, fill, edge) {
  c.fillStyle = fill; c.strokeStyle = edge; c.lineWidth = 1;
  if (pat === "rune") { c.rotate(ta); c.fillRect(-u * 1.7, -u * 0.38, u * 3.4, u * 0.76); c.fillRect(-u * 0.3, -u * 0.95, u * 0.6, u * 1.9); }
  else if (pat === "bead") { c.beginPath(); c.arc(0, 0, u * 0.85, 0, 6.3); c.fill(); c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(-u * 0.25, -u * 0.3, u * 0.28, 0, 6.3); c.fill(); }
  else if (pat === "lotus") { c.rotate(oa); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(u * 1.5, -u * 1.15, u * 2.7, 0); c.quadraticCurveTo(u * 1.5, u * 1.15, 0, 0); c.fill(); c.globalAlpha *= 0.7; c.stroke(); }
  else if (pat === "kite") { c.beginPath(); c.moveTo(0, -u * 1.8); c.lineTo(u * 0.95, 0); c.lineTo(0, u * 1.8); c.lineTo(-u * 0.95, 0); c.closePath(); c.fill(); c.stroke(); }
  else if (pat === "spark") { c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? u * 0.4 : u * 1.7, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
  else { c.beginPath(); c.arc(0, 0, u * 0.7, 0, 6.3); c.fill(); c.beginPath(); c.lineWidth = 1.4; c.arc(0, 0, u * 1.25, ta, ta + 1.9); c.stroke(); }   // tomoe: a bead with a curling tail
}

/** half = "back" (behind the hero) | "front".  flare 0..1 brightens every ring for a moment (breakthrough, Spirit Pressure). */
export function drawRingOrbits(c, x, y, items, T, half, flare = 0) {
  for (const it of items) {
    const t = RING_TIERS[it.ring.tier], look = ringLook(it.ring), rx = orbitRadius(it.k), ry = rx * 0.36, speed = (0.85 / (1 + 0.14 * it.k)) * (it.absorbing ? 1 + 1.4 * (1 - it.prog) : 1) * it.dir, a0 = look.phase + T * speed;
    const dark = t.id === "black", fill = dark ? "#352e4a" : t.col, edge = dark ? "#c4b4ff" : "#ffffff", glow = dark ? "#9a7cff" : t.col;
    c.save(); c.globalAlpha = Math.min(1, it.alpha * (1 + flare * 0.3)); c.lineCap = "round";
    c.strokeStyle = rgb(dark ? "#b9a8ff" : t.col, 0.5 + flare * 0.4); c.lineWidth = 1.4 + t.pct * 0.06 + flare * 1.5; c.shadowColor = glow; c.shadowBlur = 5 + it.ring.tier * 3 + flare * 12;
    c.beginPath(); if (half === "back") c.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2); else c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.stroke(); c.shadowBlur = 0;
    for (let j = 0; j < look.n; j++) {
      const a = a0 + j * 6.2832 / look.n, s = Math.sin(a), co = Math.cos(a); if ((s >= 0) !== (half === "front")) continue;
      c.save(); c.translate(x + co * rx, y + s * ry); const u = 3.2 * look.size * (0.82 + 0.22 * s) * (1 + it.ring.tier * 0.1); c.globalAlpha *= 0.55 + 0.45 * (0.5 + 0.5 * s);
      shape(c, look.pat, u, Math.atan2(ry * co, -rx * s), Math.atan2(s * ry, co * rx), fill, edge); c.restore();
    }
    c.restore();
  }
}
