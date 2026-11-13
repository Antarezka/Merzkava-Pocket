// Merzkava Pocket — shared painting helpers for the game-mode art pipeline.
// Zero dependencies. Everything here is deterministic (seeded) so baked art is reproducible.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createCanvas(w, h) {
  const width = Math.max(1, Math.round(w)), height = Math.max(1, Math.round(h));
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    return c;
  }
  return new OffscreenCanvas(width, height);
}
export const ctx2d = canvas => canvas.getContext("2d");

/** Create a canvas and return [canvas, ctx]. */
export function makeLayer(w, h) { const c = createCanvas(w, h); return [c, c.getContext("2d")]; }

// ---------- seeded randomness ----------
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function strSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, seed = 0, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) { sum += valueNoise(x * freq, y * freq, seed + i * 101) * amp; norm += amp; amp *= 0.5; freq *= 2; }
  return sum / norm;
}

// ---------- colour ----------
export function parseHex(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const toHex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
export function mix(a, b, t) {
  const A = parseHex(a), B = parseHex(b);
  return toHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
/** amount -1..1: negative darkens (towards a cool shadow), positive lightens (towards a warm light). */
export function shade(hex, amount) {
  return amount < 0 ? mix(hex, "#1c1a2e", -amount) : mix(hex, "#fff4d6", amount);
}
export function rgba(hex, alpha = 1) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------- brush primitives ----------
/** Irregular painted blob (organic silhouette). */
export function blob(ctx, x, y, rx, ry, fill, { jitter = 0.12, seed = 1, points = 14, alpha = 1, rotate = 0 } = {}) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rotate);
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU, j = 1 + (rnd() - 0.5) * 2 * jitter;
    pts.push([Math.cos(a) * rx * j, Math.sin(a) * ry * j]);
  }
  for (let i = 0; i < points; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % points];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    const p2 = pts[(i + 1) % points], p3 = pts[(i + 2) % points];
    ctx.quadraticCurveTo(p2[0], p2[1], (p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}
export function softDisc(ctx, x, y, r, color, alpha = 1, inner = 0) {
  const g = ctx.createRadialGradient(x, y, r * inner, x, y, r);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
export function softEllipse(ctx, x, y, rx, ry, color, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  softDisc(ctx, 0, 0, rx, color, alpha); ctx.restore();
}
/** Tapered brush stroke along a polyline of [x,y]. */
export function brushStroke(ctx, pts, width, color, { taper = 0.6, seed = 1, wobble = 0, alpha = 1 } = {}) {
  if (pts.length < 2) return;
  const rnd = mulberry32(seed);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0], dy = next[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    const t = i / (pts.length - 1);
    const w = width * (1 - taper * Math.abs(t * 2 - 1) ** 1.4) * (1 + (rnd() - 0.5) * wobble) / 2;
    left.push([p[0] - dy / len * w, p[1] + dx / len * w]);
    right.push([p[0] + dy / len * w, p[1] - dx / len * w]);
  }
  ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** Smooth curve through points (Catmull-Rom → bezier) appended to the current path. */
export function smoothPath(ctx, pts, closed = false) {
  const n = pts.length; if (n < 2) return;
  const at = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
/** Paper / canvas grain overlay for a painterly feel. amount ~0.02–0.08. */
export function paperGrain(ctx, w, h, seed = 7, amount = 0.05) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] === 0) continue;
    const n = (hash2(x, y, seed) - 0.5) * 2 * amount * 255 + (fbm(x / 6, y / 6, seed + 3, 2) - 0.5) * amount * 255;
    d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
}
/** Draw `source` into ctx with a soft contact shadow ellipse below a pivot point. */
export function contactShadow(ctx, x, y, rx, ry, alpha = 0.28) { softEllipse(ctx, x, y, rx, ry, "#1a1626", alpha); }
