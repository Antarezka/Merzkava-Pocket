// The Guanghuan (V15 section 17): an empty plain halo above the head once Origin Awakening has opened the gateway; it gains patterns, runes, colour, motion and radial reach as Origins
// are absorbed and the Realm advances, ending as a vast floating orbital crown centred on the head. Each absorbed Origin is one orbital layer; the layers hang at DIFFERENT vertical
// levels (above and below the head) and always stay clear of the body - they never descend onto or touch the character.  Colour comes from the character's own Origin, never from age.
// Every layer is drawn in two passes (back half behind the hero, front half in front) so the orbit wraps around the sprite.
const PATTERNS = ["rune", "bead", "lotus", "kite", "spark", "tomoe"];
const hash = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
const rgb = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const mix = (hex, to, k) => { const f = (i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + parseInt(to.slice(i, i + 2), 16) * k); return `rgb(${f(1)},${f(3)},${f(5)})`; };
export function originLook(origin) { const x = hash(origin.id || "origin"); return { pat: PATTERNS[x % PATTERNS.length], n: 8 + origin.grade + ((x >> 3) % 5), size: 0.85 + ((x >> 7) % 5) * 0.08, phase: ((x >> 11) % 628) / 100 }; }

/** vertical level of each layer, in body heights relative to the head centre (negative = above).  Alternating above / below so the stack reads as separate levels in space. */
const LEVEL = [-0.34, -0.12, -0.6, 0.12, -0.86, 0.34, -1.12, 0.56, -1.38];
const RADIUS = (k) => 0.36 + 0.17 * k;                    // radial reach grows layer by layer; the low layers are wide enough to clear the shoulders

/** items for the renderer: the plain shell (always, once awakened), the absorbed layers in slot order, and the Origin being absorbed fading in on the next layer */
export function guanghuanItems(cult, prog = null) {
  if (!cult?.innate) return null;
  const layers = []; let k = 0;
  for (const o of cult.slots || []) if (o) { layers.push({ origin: o, k, dir: k % 2 ? -1 : 1, alpha: 1 }); k++; }
  if (cult.absorb) layers.push({ origin: cult.absorb.origin, k, dir: k % 2 ? -1 : 1, alpha: 0.22 + 0.78 * (prog ?? 0), absorbing: true, prog: prog ?? 0 });
  return { layers, realms: Math.max(0, (cult.slots || []).filter(Boolean).length), col: cult.innateCol || "#ffe9a8" };
}

function shape(c, pat, u, ta, oa, fill, edge) {
  c.fillStyle = fill; c.strokeStyle = edge; c.lineWidth = 1;
  if (pat === "rune") { c.rotate(ta); c.fillRect(-u * 1.7, -u * 0.38, u * 3.4, u * 0.76); c.fillRect(-u * 0.3, -u * 0.95, u * 0.6, u * 1.9); }
  else if (pat === "bead") { c.beginPath(); c.arc(0, 0, u * 0.85, 0, 6.3); c.fill(); c.fillStyle = "rgba(255,255,255,.75)"; c.beginPath(); c.arc(-u * 0.25, -u * 0.3, u * 0.28, 0, 6.3); c.fill(); }
  else if (pat === "lotus") { c.rotate(oa); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(u * 1.5, -u * 1.15, u * 2.7, 0); c.quadraticCurveTo(u * 1.5, u * 1.15, 0, 0); c.fill(); c.globalAlpha *= 0.7; c.stroke(); }
  else if (pat === "kite") { c.beginPath(); c.moveTo(0, -u * 1.8); c.lineTo(u * 0.95, 0); c.lineTo(0, u * 1.8); c.lineTo(-u * 0.95, 0); c.closePath(); c.fill(); c.stroke(); }
  else if (pat === "spark") { c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? u * 0.4 : u * 1.7, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); }
  else { c.beginPath(); c.arc(0, 0, u * 0.7, 0, 6.3); c.fill(); c.beginPath(); c.lineWidth = 1.4; c.arc(0, 0, u * 1.25, ta, ta + 1.9); c.stroke(); }   // tomoe: a bead with a curling tail
}

/** (hx, hy) = head centre, unit = body height in world px.  half = "back" | "front".  flare 0..1 brightens everything for a moment (breakthrough, Origin Surge). */
export function drawGuanghuan(c, hx, hy, unit, items, T, half, flare = 0) {
  if (!items) return; const base = items.col, R = items.realms;
  // the plain shell: a thin pale halo above the head; it grows runes (one per absorbed Origin) and a slow shimmer as the Guanghuan matures
  { const rx = unit * 0.3, ry = rx * 0.3, y = hy + LEVEL[0] * unit * 0.6;
    c.save(); c.globalAlpha = 0.85 + flare * 0.15; c.lineCap = "round"; c.strokeStyle = rgb("#fff3d0", 0.65 + flare * 0.3); c.lineWidth = Math.max(1, unit * 0.014) + flare * 1.2; c.shadowColor = base; c.shadowBlur = 4 + R * 1.5 + flare * 10;
    c.beginPath(); if (half === "back") c.ellipse(hx, y, rx, ry, 0, Math.PI, Math.PI * 2); else c.ellipse(hx, y, rx, ry, 0, 0, Math.PI); c.stroke(); c.shadowBlur = 0;
    for (let j = 0; j < R; j++) { const a = T * 0.5 + j * 6.2832 / Math.max(R, 1), s = Math.sin(a), co = Math.cos(a); if ((s >= 0) !== (half === "front")) continue; c.fillStyle = rgb(base, 0.9); c.fillRect(hx + co * rx - 1.2, y + s * ry - 1.2, 2.4, 2.4); }
    c.restore(); }
  for (const it of items.layers) {
    const o = it.origin, look = originLook(o), rx = RADIUS(it.k) * unit, ry = rx * 0.3, cy = hy + LEVEL[Math.min(8, it.k + 1)] * unit, q = (o.quality || 50) / 100;
    const speed = (0.8 / (1 + 0.12 * it.k)) * (it.absorbing ? 1 + 1.4 * (1 - it.prog) : 1) * it.dir, a0 = look.phase + T * speed, tint = mix(base, "#ffffff", 0.15 + 0.35 * q), edge = "#ffffff";
    c.save(); c.globalAlpha = Math.min(1, it.alpha * (1 + flare * 0.3)); c.lineCap = "round";
    c.strokeStyle = rgb(base, 0.45 + 0.3 * q + flare * 0.3); c.lineWidth = Math.max(1, unit * 0.012) + o.grade * 0.12 + flare * 1.5; c.shadowColor = base; c.shadowBlur = 4 + o.grade * 1.6 + flare * 12;
    c.beginPath(); if (half === "back") c.ellipse(hx, cy, rx, ry, 0, Math.PI, Math.PI * 2); else c.ellipse(hx, cy, rx, ry, 0, 0, Math.PI); c.stroke(); c.shadowBlur = 0;
    for (let j = 0; j < look.n; j++) {
      const a = a0 + j * 6.2832 / look.n, s = Math.sin(a), co = Math.cos(a); if ((s >= 0) !== (half === "front")) continue;
      c.save(); c.translate(hx + co * rx, cy + s * ry); const u = Math.max(2, unit * 0.03) * look.size * (0.82 + 0.22 * s) * (1 + o.grade * 0.06); c.globalAlpha *= 0.55 + 0.45 * (0.5 + 0.5 * s);
      shape(c, look.pat, u, Math.atan2(ry * co, -rx * s), Math.atan2(s * ry, co * rx), tint, edge); c.restore();
    }
    c.restore();
  }
}
