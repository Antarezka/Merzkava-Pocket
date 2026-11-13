// Procedural 2.5D painted character renderer. Logical cell 128x176, feet baseline y=168, centre x=64.
import { shade, mix, rgba, softEllipse, smoothPath, TAU, clamp, lerp } from "../paint.js";
import { optionOf, normalizeAppearance } from "./options.js";

export const CELL = { w: 128, h: 176 };
const FY = 168, CX = 64, LINE = "#3a2a3c";
const S = Math.sin, C = Math.cos;

// ------------------------------------------------------------------ helpers
function catmull(pts, n) {
  const out = [], m = pts.length;
  if (m < 3) { for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([lerp(pts[0][0], pts[m - 1][0], t), lerp(pts[0][1], pts[m - 1][1], t)]); } return out; }
  const at = i => pts[clamp(i, 0, m - 1)];
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * (m - 1), k = Math.min(m - 2, Math.floor(u)), t = u - k;
    const p0 = at(k - 1), p1 = at(k), p2 = at(k + 1), p3 = at(k + 2), t2 = t * t, t3 = t2 * t;
    out.push([0, 1].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
  }
  return out;
}
const outline = (ctx, a = 0.55, w = 1.1) => { ctx.strokeStyle = rgba(LINE, a); ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.stroke(); };
function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([t, c]) => g.addColorStop(t, c)); return g; }
function hairFill(ctx, H, y0 = H.hy - H.ry, y1 = H.hipY) {
  return vgrad(ctx, y0, y1, [[0, mix(H.c.color, H.c.light, 0.5)], [0.28, H.c.color], [1, H.c.shadow]]);
}
/** tapered ribbon lock along control points */
function lock(ctx, H, ctrl, w0, w1, o = {}) {
  const n = 12, pts = catmull(ctrl, n), sw = (o.sway ?? 1) * H.sway;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = [pts[i][0] + sw * t ** 1.6, pts[i][1]];
    pts[i] = p;
  }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, t) * (1 + (o.bulge || 0) * S(Math.PI * t)) / 2;
    L.push([p[0] - dy / len * w, p[1] + dx / len * w]); R.push([p[0] + dy / len * w, p[1] - dx / len * w]);
  }
  ctx.beginPath(); smoothPath(ctx, [...L, ...R.reverse()], true);
  ctx.fillStyle = o.fill || hairFill(ctx, H, o.gy0, o.gy1); ctx.globalAlpha = o.alpha ?? 1; ctx.fill(); ctx.globalAlpha = 1; outline(ctx, 0.5, 1);
  if (o.sheen !== false) {
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = rgba(H.c.light, 0.55); ctx.lineWidth = Math.max(1, Math.min(w0, 12) * 0.16);
    ctx.beginPath(); for (let i = 1; i < n - 3; i++) { const p = pts[i], a = pts[i - 1], dx = p[0] - a[0], dy = p[1] - a[1], len = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (n - 1)) * 0.2; const x = p[0] - dy / len * w * (o.sheenSide || 1), y = p[1] + dx / len * w * (o.sheenSide || 1); i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
  }
  return pts;
}
function panel(ctx, H, pts, o = {}) {
  ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fillStyle = o.fill || hairFill(ctx, H, o.gy0, o.gy1); ctx.fill(); outline(ctx, 0.5, 1);
  if (o.sheens) {
    ctx.save(); ctx.lineCap = "round";
    for (const [x0, y0, x1, y1, bend = 0, a = 0.5] of o.sheens) { ctx.strokeStyle = rgba(H.c.light, a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1 + (H.sway * 0.5), y1); ctx.stroke(); }
    ctx.restore();
  }
}
function bun(ctx, H, x, y, r, o = {}) {
  ctx.beginPath(); ctx.ellipse(x, y, r, r * (o.sy || 0.92), 0, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.05); g.addColorStop(0, H.c.light); g.addColorStop(0.45, H.c.color); g.addColorStop(1, H.c.shadow);
  ctx.fillStyle = g; ctx.fill(); outline(ctx, 0.55, 1);
  ctx.strokeStyle = rgba(H.c.shadow, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.4, 3.2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.55, 2, 0, 0, TAU); ctx.fillStyle = o.tie || "#c9a05c"; ctx.fill();
}
function tie(ctx, x, y, w, color = "#c43b4a") { ctx.beginPath(); ctx.ellipse(x, y, w, 2.2, 0, 0, TAU); ctx.fillStyle = color; ctx.fill(); outline(ctx, 0.5, 0.8); }

// ------------------------------------------------------------------ geometry
function makeGeom(A, view, pose) {
  const body = optionOf("body", A.body), head = optionOf("head", A.head), male = A.gender === "male";
  const W = view === "side" ? 0.56 : 1;
  const g = { A, view, male, body, head, pose, W };
  g.cx = CX; g.legLen = 34 * body.leg; g.torsoLen = 37 * body.torso;
  g.hipY = FY - g.legLen - pose.bob; g.shY = g.hipY - g.torsoLen;
  g.shW = (male ? 17.5 : 14.8) * body.sh * W; g.waistW = (male ? 12.6 : 9.8) * body.waist * W; g.hipW = (male ? 13 : 13.4) * body.hip * W;
  g.limb = (male ? 5.2 : 4.4) * body.limb; g.neck = 5;
  g.rx = 19 * head.w * (male ? 1.03 : 1); g.ry = 21 * head.h;
  g.hcy = g.shY - g.neck - g.ry + 4;
  g.armLen = 31 * (0.5 * body.torso + 0.5 * body.leg);
  return g;
}

// ------------------------------------------------------------------ outfit / body
function drawLegs(ctx, g, of) {
  const { cx, hipY, A } = g, p = of.palette, pose = g.pose, lenFrac = of.len, hemY = hipY + g.legLen * lenFrac;
  const pants = mix(p.sash, "#222030", 0.35), boot = "#2c2530", sk = optionOf("skin", A.skin);
  const lift = [Math.max(0, pose.stride) * 3.6, Math.max(0, -pose.stride) * 3.6];
  const sideSwing = g.view === "side" ? pose.stride * 9 : 0;
  for (const s of [-1, 1]) {
    const li = s < 0 ? 0 : 1, fx = g.view === "side" ? cx + (s < 0 ? -1 : 1) * sideSwing : cx + s * g.hipW * 0.38;
    const hx = g.view === "side" ? cx : cx + s * g.hipW * 0.38, fy = FY - lift[li] * (g.view === "side" ? 0.8 : 1);
    ctx.lineCap = "round";
    // trouser leg
    ctx.strokeStyle = pants; ctx.lineWidth = g.limb * 2.5; ctx.beginPath(); ctx.moveTo(hx, hipY + 2); ctx.lineTo(fx, fy - 6); ctx.stroke();
    if (lenFrac < 0.8 && g.view !== "up") { /* visible calf wrap */ ctx.strokeStyle = shade(pants, 0.12); ctx.lineWidth = g.limb * 1.4; ctx.beginPath(); ctx.moveTo(hx, hipY + g.legLen * 0.55); ctx.lineTo(fx, fy - 6); ctx.stroke(); }
    // boot
    const fwd = g.view === "side" ? 3 : 0;
    ctx.fillStyle = boot; ctx.beginPath(); ctx.ellipse(fx + fwd, fy - 2.5, g.limb * 1.45 + (g.view === "side" ? 3 : 0), 4.4, 0, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.9);
    ctx.fillStyle = rgba("#fff", 0.18); ctx.beginPath(); ctx.ellipse(fx + fwd - 1, fy - 4, g.limb * 0.8, 1.2, 0, 0, TAU); ctx.fill();
  }
}
function robeHem(g, of) { return g.hipY + g.legLen * of.len; }
function drawTorso(ctx, g, of) {
  const { cx, shY, hipY, shW, waistW, hipW, A } = g, p = of.palette, torso = g.torsoLen, W = g.W;
  const hemY = robeHem(g, of), sway = g.pose.sway, hemW = (hipW + (of.len > 0.8 ? 11 : 4)) * (g.view === "side" ? 1.05 : 1);
  // skirt / lower robe
  const skirt = [[cx - waistW, hipY - torso * 0.32], [cx - hipW, hipY], [cx - hemW + sway * 0.4, hemY], [cx + hemW + sway * 0.4, hemY], [cx + hipW, hipY], [cx + waistW, hipY - torso * 0.32]];
  ctx.beginPath(); smoothPath(ctx, skirt, true);
  ctx.fillStyle = ctx.createLinearGradient(cx - hemW, 0, cx + hemW, 0); const sg = ctx.fillStyle; sg.addColorStop(0, shade(p.base, -0.22)); sg.addColorStop(0.35, p.base); sg.addColorStop(0.7, shade(p.base, 0.1)); sg.addColorStop(1, shade(p.base, -0.28)); ctx.fill(); outline(ctx);
  // pleats
  ctx.strokeStyle = rgba(shade(p.base, -0.4), 0.28); ctx.lineWidth = 1;
  if (g.view !== "side") for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * waistW * 0.3, hipY + 2); ctx.quadraticCurveTo(cx + i * hipW * 0.42 + sway * 0.2, (hipY + hemY) / 2, cx + i * hemW * 0.28 + sway * 0.4, hemY - 1); ctx.stroke(); }
  // hem trim
  ctx.strokeStyle = p.trim; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx - hemW + sway * 0.4 + 1, hemY - 1.2); ctx.quadraticCurveTo(cx + sway * 0.4, hemY + 2.4, cx + hemW + sway * 0.4 - 1, hemY - 1.2); ctx.stroke();
  // upper body
  const top = [[cx - shW * 0.42, shY - 1.5], [cx - shW, shY + 3.2], [cx - shW * 0.92, shY + torso * 0.36], [cx - waistW, shY + torso * 0.68], [cx - hipW * 0.95, hipY + 1], [cx + hipW * 0.95, hipY + 1], [cx + waistW, shY + torso * 0.68], [cx + shW * 0.92, shY + torso * 0.36], [cx + shW, shY + 3.2], [cx + shW * 0.42, shY - 1.5]];
  ctx.beginPath(); smoothPath(ctx, top, true);
  const tg = ctx.createLinearGradient(cx - shW, 0, cx + shW, 0); tg.addColorStop(0, shade(p.base, -0.18)); tg.addColorStop(0.4, shade(p.base, 0.08)); tg.addColorStop(1, shade(p.base, -0.22)); ctx.fillStyle = tg; ctx.fill(); outline(ctx);
  if (g.view === "up") { // back: collar line & sash only
    ctx.strokeStyle = p.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - shW * 0.4, shY); ctx.quadraticCurveTo(cx, shY + 5, cx + shW * 0.4, shY); ctx.stroke();
  } else if (g.view === "side") {
    ctx.strokeStyle = p.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + shW * 0.25, shY - 0.5); ctx.lineTo(cx + shW * 0.05, shY + torso * 0.55); ctx.stroke();
  } else { // front: inner collar + crossing lapels
    ctx.fillStyle = p.inner; ctx.beginPath(); ctx.moveTo(cx - shW * 0.36, shY - 1.2); ctx.lineTo(cx, shY + torso * 0.42); ctx.lineTo(cx + shW * 0.36, shY - 1.2); ctx.quadraticCurveTo(cx, shY + 3.5, cx - shW * 0.36, shY - 1.2); ctx.fill(); outline(ctx, 0.35, 0.8);
    ctx.strokeStyle = p.trim; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - shW * 0.42, shY - 0.8); ctx.lineTo(cx + waistW * 0.55, shY + torso * 0.66); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx + shW * 0.42, shY - 0.8); ctx.lineTo(cx - waistW * 0.2, shY + torso * 0.66); ctx.stroke();
    ctx.strokeStyle = rgba("#fff", 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - shW * 0.4, shY + 1); ctx.lineTo(cx + waistW * 0.5, shY + torso * 0.6); ctx.stroke();
  }
  // sash
  const sy = shY + torso * 0.66, sh = 5.6;
  ctx.fillStyle = vgrad(ctx, sy - sh / 2, sy + sh / 2, [[0, shade(p.sash, 0.15)], [1, shade(p.sash, -0.25)]]);
  ctx.beginPath(); ctx.roundRect(cx - waistW - 1.5, sy - sh / 2, (waistW + 1.5) * 2, sh, 2); ctx.fill(); outline(ctx, 0.5, 0.9);
  if (g.view !== "up") { ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(cx + (g.view === "side" ? 0 : waistW * 0.35), sy, 2.4, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.7);
    ctx.strokeStyle = p.accent; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + waistW * 0.35, sy + 2); ctx.quadraticCurveTo(cx + waistW * 0.5 + sway * 0.3, sy + 10, cx + waistW * 0.4 + sway * 0.6, sy + 15); ctx.stroke(); }
  else { ctx.fillStyle = shade(p.sash, 0.1); ctx.beginPath(); ctx.ellipse(cx, sy + 2, 5, 3.5, 0, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.8); }
}
function drawArms(ctx, g, of, behind) {
  const { cx, shY, shW, armLen, limb, A } = g, p = of.palette, sk = optionOf("skin", A.skin), pose = g.pose, wide = of.sleeve;
  const sides = g.view === "side" ? (behind ? [-1] : [1]) : (behind ? [] : [-1, 1]);
  for (const s of sides) {
    const swing = g.view === "side" ? pose.stride * 9 * s * (behind ? 1 : -1) : pose.stride * 5 * (s < 0 ? 1 : -1);
    const sx = g.view === "side" ? cx + (behind ? -1.5 : 1.5) : cx + s * (shW - 1.5);
    const sY = shY + 4, hx = g.view === "side" ? sx + swing * 0.9 : sx + s * 3.5, hy = sY + armLen + (g.view === "side" ? -Math.abs(swing) * 0.15 : swing * 0.5);
    const sw = pose.sway * 0.5;
    // sleeve ribbon (wider at cuff)
    const pts = catmull([[sx, sY], [(sx + hx) / 2 + s * 1, (sY + hy) / 2], [hx + sw * 0.3, hy - 3]], 8), wTop = limb * 2.1, wBot = limb * 2 * wide;
    const L = [], R = [];
    pts.forEach((q, i) => { const t = i / 7, a = pts[Math.max(0, i - 1)], b = pts[Math.min(7, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = lerp(wTop, wBot, t ** 1.4) / 2; L.push([q[0] - dy / len * w, q[1] + dx / len * w]); R.push([q[0] + dy / len * w, q[1] - dx / len * w]); });
    // hand
    ctx.fillStyle = sk.color; ctx.beginPath(); ctx.ellipse(hx + sw * 0.2, hy + 1.5, limb * 0.95, limb * 1.15, 0, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.9);
    ctx.beginPath(); smoothPath(ctx, [...L, ...R.reverse()], true);
    const sg = ctx.createLinearGradient(sx - 8, 0, sx + 8, 0); sg.addColorStop(0, shade(p.base, g.view === "side" && behind ? -0.3 : -0.12)); sg.addColorStop(1, shade(p.base, g.view === "side" && behind ? -0.4 : -0.2)); ctx.fillStyle = sg; ctx.fill(); outline(ctx);
    // cuff
    const q = pts[7]; ctx.strokeStyle = p.trim; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(L[7][0], L[7][1]); ctx.lineTo(R[0][0], R[0][1]); ctx.stroke();
    // shoulder cap highlight
    ctx.fillStyle = rgba("#fff", 0.12); ctx.beginPath(); ctx.ellipse(sx, sY + 1.5, limb * 1.1, limb * 0.8, 0, 0, TAU); ctx.fill();
  }
}

// ------------------------------------------------------------------ head & face
function headPath(ctx, g, cx = g.cx, hcy = g.hcy) {
  const { rx, ry, head } = g, jaw = head.jaw, ch = head.cheek;
  ctx.beginPath();
  ctx.moveTo(cx, hcy - ry);
  ctx.bezierCurveTo(cx + rx * 0.98, hcy - ry, cx + rx * 1.02, hcy - ry * 0.35, cx + rx * ch, hcy + ry * 0.12);
  ctx.bezierCurveTo(cx + rx * ch * 0.98, hcy + ry * 0.56, cx + rx * jaw * 0.62, hcy + ry * 0.94, cx + rx * jaw * 0.2, hcy + ry * 1.0);
  ctx.quadraticCurveTo(cx, hcy + ry * 1.05, cx - rx * jaw * 0.2, hcy + ry * 1.0);
  ctx.bezierCurveTo(cx - rx * jaw * 0.62, hcy + ry * 0.94, cx - rx * ch * 0.98, hcy + ry * 0.56, cx - rx * ch, hcy + ry * 0.12);
  ctx.bezierCurveTo(cx - rx * 1.02, hcy - ry * 0.35, cx - rx * 0.98, hcy - ry, cx, hcy - ry);
  ctx.closePath();
}
function drawHead(ctx, g) {
  const { cx, hcy, rx, ry, shY, A } = g, sk = optionOf("skin", A.skin), side = g.view === "side";
  // neck
  ctx.fillStyle = vgrad(ctx, shY - 8, shY + 2, [[0, sk.shadow], [1, mix(sk.shadow, sk.color, 0.2)]]);
  ctx.beginPath(); ctx.roundRect(cx - 5.2 * (side ? 0.8 : 1), hcy + ry * 0.7, 10.4 * (side ? 0.8 : 1), shY - hcy - ry * 0.7 + 3, 3); ctx.fill();
  const hx = side ? cx - rx * 0.05 : cx;
  // ears
  if (g.view !== "up") for (const s of side ? [-1] : [-1, 1]) { const ex = hx + s * rx * (side ? 0.2 : 0.98); ctx.fillStyle = sk.color; ctx.beginPath(); ctx.ellipse(ex, g.hcy + ry * 0.16, 3.2, 5, 0, 0, TAU); ctx.fill(); outline(ctx, 0.45, 0.8); ctx.fillStyle = rgba(sk.shadow, 0.6); ctx.beginPath(); ctx.ellipse(ex, g.hcy + ry * 0.18, 1.3, 2.6, 0, 0, TAU); ctx.fill(); }
  // face
  headPath(ctx, g, hx);
  const fg = ctx.createRadialGradient(hx - rx * 0.25, hcy - ry * 0.2, ry * 0.2, hx, hcy + ry * 0.1, ry * 1.25); fg.addColorStop(0, mix(sk.color, "#fffaf0", 0.28)); fg.addColorStop(0.55, sk.color); fg.addColorStop(1, mix(sk.color, sk.shadow, 0.8));
  ctx.fillStyle = fg; ctx.fill(); outline(ctx, 0.6, 1.2);
  if (side) { ctx.fillStyle = sk.color; ctx.beginPath(); ctx.moveTo(hx + rx * 0.9, hcy + ry * 0.12); ctx.lineTo(hx + rx * 1.12, hcy + ry * 0.38); ctx.lineTo(hx + rx * 0.88, hcy + ry * 0.48); ctx.closePath(); ctx.fill(); outline(ctx, 0.5, 0.9); }
  // chin shadow
  ctx.save(); headPath(ctx, g, hx); ctx.clip(); softEllipse(ctx, hx, hcy + ry * 1.12, rx * 0.8, ry * 0.3, sk.shadow, 0.55); ctx.restore();
}
function eye(ctx, g, ex, ey, sg, E, ec, ex2, flip) {
  const { rx, ry, A } = g, ew = rx * 0.3 * E.w * (g.view === "side" ? 0.8 : 1), eh = ry * 0.255 * E.h * (1 - E.lid * 0.4) * Math.max(0.55, ex2.eye);
  const inX = ex - sg * ew, outX = ex + sg * ew, outY = ey - E.tilt * ew * 0.55, inY = ey + 0.4;
  const female = A.gender !== "male", sk = optionOf("skin", A.skin);
  const lashW = (1.6 + E.lash * 0.9) * (female ? 1 : 0.8);
  if (flip === "wink") {
    ctx.strokeStyle = rgba(LINE, 0.95); ctx.lineWidth = lashW + 0.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(inX, ey + 1); ctx.quadraticCurveTo(ex, ey - eh * 1.3, outX, outY); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(outX, outY); ctx.lineTo(outX + sg * ew * 0.35, outY - 2 - E.lash * 1.5); ctx.stroke(); return;
  }
  const up = (x, k) => [x, ey - eh * k];
  const path = () => { ctx.beginPath(); ctx.moveTo(inX, inY); ctx.bezierCurveTo(ex - sg * ew * 0.5, ey - eh * 1.55, ex + sg * ew * 0.45, ey - eh * 1.45, outX, outY); ctx.bezierCurveTo(ex + sg * ew * 0.5, ey + eh * 0.75, ex - sg * ew * 0.4, ey + eh * 0.95, inX, inY); ctx.closePath(); };
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = "#fbf6f0"; ctx.fillRect(ex - ew * 1.5, ey - eh * 2, ew * 3, eh * 4);
  ctx.fillStyle = rgba(sk.shadow, 0.45); ctx.fillRect(ex - ew * 1.5, ey - eh * 2, ew * 3, eh * 1.1); // lid shadow
  const ir = Math.min(eh * E.iris * 1.1, ew * 0.78), ix = ex + sg * ew * (ex2.look || 0) * 0.25 + (ex2.sideGlance ? ew * 0.3 : 0), iy = ey + eh * 0.02;
  const ig = ctx.createLinearGradient(0, iy - ir, 0, iy + ir); ig.addColorStop(0, shade(ec, -0.55)); ig.addColorStop(0.55, ec); ig.addColorStop(1, shade(ec, 0.42));
  ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.92, ir * 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c1620"; ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.42, ir * 0.55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ix - ir * 0.32, iy - ir * 0.38, Math.max(0.9, ir * 0.3), 0, TAU); ctx.fill();
  ctx.fillStyle = rgba("#fff", 0.8); ctx.beginPath(); ctx.arc(ix + ir * 0.34, iy + ir * 0.42, Math.max(0.5, ir * 0.14), 0, TAU); ctx.fill();
  ctx.restore();
  // lid line (thick upper), lower line, flick
  ctx.lineCap = "round"; ctx.strokeStyle = rgba(LINE, 0.95); ctx.lineWidth = lashW;
  ctx.beginPath(); ctx.moveTo(inX, inY); ctx.bezierCurveTo(ex - sg * ew * 0.5, ey - eh * 1.55, ex + sg * ew * 0.45, ey - eh * 1.45, outX, outY); ctx.stroke();
  ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(outX, outY); ctx.lineTo(outX + sg * ew * (0.3 + E.lash * 0.35), outY - 1.2 - E.lash * 2.2 - (ex2.lashes ? 1.5 : 0)); ctx.stroke();
  if (female || ex2.lashes) { ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ex + sg * ew * 0.4, ey - eh * 1.2); ctx.lineTo(ex + sg * ew * 0.7, ey - eh * 1.45 - 1.2); ctx.stroke(); }
  ctx.strokeStyle = rgba(LINE, 0.38); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(inX + sg * 1, inY); ctx.bezierCurveTo(ex - sg * ew * 0.4, ey + eh * 0.95, ex + sg * ew * 0.5, ey + eh * 0.75, outX, outY); ctx.stroke();
}
function brow(ctx, g, ex, by, sg, X, color, thick, extraUp = 0) {
  const { rx } = g, ew = rx * 0.34;
  const inX = ex - sg * ew * 0.9, outX = ex + sg * ew * 1.25, inY = by - X.tilt * 3.2 - extraUp, outY = by + X.tilt * 1.4 - extraUp * 0.4;
  const mid = [(inX + outX) / 2, Math.min(inY, outY) - X.arch * 2.6];
  const pts = catmull([[inX, inY], mid, [outX, outY]], 8), L = [], R = [];
  pts.forEach((q, i) => { const t = i / 7, a = pts[Math.max(0, i - 1)], b = pts[Math.min(7, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = thick * (0.45 + 0.75 * S(Math.PI * (0.15 + 0.7 * t))) / 2; L.push([q[0] - dy / len * w, q[1] + dx / len * w]); R.push([q[0] + dy / len * w, q[1] - dx / len * w]); });
  ctx.beginPath(); smoothPath(ctx, [...L, ...R.reverse()], true); ctx.fillStyle = color; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
}
function drawFace(ctx, g, X) {
  const { cx, hcy, rx, ry, A } = g, E = optionOf("eyes", A.eyes), ec = optionOf("eyeColor", A.eyeColor).color, sk = optionOf("skin", A.skin), hair = optionOf("hairColor", A.hairColor), male = A.gender === "male";
  const side = g.view === "side";
  const ey = hcy + ry * 0.14;
  const browColor = X.aged ? mix(hair.color, "#d8d8de", 0.65) : mix(hair.color, "#2a2030", 0.35), thick = male ? 3 : 2.1;
  const eyes = side ? [[cx + rx * 0.5, 1]] : [[cx - rx * 0.46, -1], [cx + rx * 0.46, 1]];
  for (const [ex, sg] of eyes) {
    const flip = X.wink === (sg > 0 ? "r" : "l") ? "wink" : null;
    eye(ctx, g, ex, ey, side ? -1 : sg, E, ec, X, flip);
    brow(ctx, g, ex, hcy - ry * 0.3 + X.brow, side ? -1 : sg, X, browColor, thick, X.browAsym && sg > 0 ? 2.2 : 0);
    if (X.aged) { ctx.strokeStyle = rgba(sk.shadow, 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(ex + sg * rx * 0.33, ey - 1); ctx.lineTo(ex + sg * rx * 0.46, ey - 3); ctx.moveTo(ex + sg * rx * 0.33, ey + 0.5); ctx.lineTo(ex + sg * rx * 0.48, ey + 1.5); ctx.moveTo(ex - sg * rx * 0.1, ey + 5.5); ctx.quadraticCurveTo(ex, ey + 7, ex + sg * rx * 0.2, ey + 5.5); ctx.stroke(); }
    if (X.tear && sg < 0) { ctx.fillStyle = rgba("#a8d4f0", 0.85); ctx.beginPath(); ctx.moveTo(ex - 1, ey + 7); ctx.quadraticCurveTo(ex - 3.2, ey + 11, ex - 1, ey + 12.5); ctx.quadraticCurveTo(ex + 1.2, ey + 11, ex - 1, ey + 7); ctx.fill(); }
  }
  if (X.scowl && !side) { ctx.strokeStyle = rgba(LINE, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 1.6, hcy - ry * 0.3 + 1); ctx.lineTo(cx - 1.2, hcy - ry * 0.05); ctx.moveTo(cx + 1.6, hcy - ry * 0.3 + 1); ctx.lineTo(cx + 1.2, hcy - ry * 0.05); ctx.stroke(); }
  if (X.aged) { ctx.strokeStyle = rgba(sk.shadow, 0.55); ctx.lineWidth = 0.9; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - rx * 0.4, hcy - ry * (0.62 - i * 0.07)); ctx.quadraticCurveTo(cx, hcy - ry * (0.68 - i * 0.07), cx + rx * 0.4, hcy - ry * (0.62 - i * 0.07)); ctx.stroke(); }
    if (!side) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * rx * 0.24, hcy + ry * 0.38); ctx.quadraticCurveTo(cx + s * rx * 0.36, hcy + ry * 0.55, cx + s * rx * 0.26, hcy + ry * 0.68); ctx.stroke(); } }
  const nx = side ? cx + rx * 0.9 : cx, ny = hcy + ry * 0.42;
  ctx.strokeStyle = rgba(sk.shadow, 0.9); ctx.lineWidth = 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(nx - 1.8, ny + 1); ctx.quadraticCurveTo(nx, ny + 2.8, nx + 1.8, ny + 1); ctx.stroke();
  ctx.fillStyle = rgba("#fff", 0.45); ctx.beginPath(); ctx.ellipse(nx - 0.3, ny - 2.2, 0.9, 1.6, 0, 0, TAU); ctx.fill();
  // blush
  if (X.blush > 0) for (const s of side ? [1] : [-1, 1]) softEllipse(ctx, cx + s * rx * (side ? 0.42 : 0.58), hcy + ry * 0.45, rx * 0.26, rx * 0.17, "#ff6f7d", clamp(X.blush * 0.32, 0, 0.6));
  // mouth
  const mx = side ? cx + rx * 0.6 : cx, my = hcy + ry * 0.68, mw = rx * 0.22 * X.mouth[3] * (side ? 0.55 : 1);
  const yL = my + X.mouth[0], yR = my + X.mouth[1], cy0 = (my + 0.8 - 0.25 * (yL + yR)) / 0.5, open = X.mouth[2];
  ctx.lineCap = "round";
  if (open > 0.25) {
    const bottom = my + open * mw * 1.3 + 1.5;
    ctx.beginPath(); ctx.moveTo(mx - mw, yL); ctx.quadraticCurveTo(mx, cy0, mx + mw, yR); ctx.quadraticCurveTo(mx, bottom + (bottom - my), mx - mw, yL); ctx.closePath();
    ctx.fillStyle = X.teeth ? "#f6f2ee" : "#6e2a3a"; ctx.fill();
    if (!X.teeth) { ctx.save(); ctx.clip(); ctx.fillStyle = "#d8707e"; ctx.beginPath(); ctx.ellipse(mx, bottom + 1, mw * 0.6, 2.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    else { ctx.strokeStyle = rgba(LINE, 0.5); ctx.lineWidth = 0.7; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(mx + i * mw * 0.35, my); ctx.lineTo(mx + i * mw * 0.35, bottom + 1); ctx.stroke(); } }
    ctx.strokeStyle = rgba(LINE, 0.9); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(mx - mw, yL); ctx.quadraticCurveTo(mx, cy0, mx + mw, yR); ctx.stroke();
  } else {
    if (!male) { ctx.fillStyle = rgba("#d65a6c", 0.55); ctx.beginPath(); ctx.ellipse(mx, my + 2, mw * 0.72, 1.7, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = rgba(male ? "#6a3340" : "#8a2f44", 0.92); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx - mw, yL); ctx.quadraticCurveTo(mx, cy0, mx + mw, yR); ctx.stroke();
  }
}

// ------------------------------------------------------------------ hair
function makeH(g) {
  const c = optionOf("hairColor", g.A.hairColor);
  return { c, cx: g.cx, hy: g.hcy, rx: g.rx, ry: g.ry, sy: g.shY, hipY: g.hipY, hem: g.hipY + g.legLen * 0.6, shW: g.shW / g.W, view: g.view, sway: g.pose.sway, torso: g.torsoLen, g };
}
const BACK = {
  long_straight(ctx, H, o) { const { cx, hy, rx, ry, sy, hipY, shW } = H, b = hipY + 2;
    panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.3], [cx - rx * 1.14, hy + ry * 0.6], [cx - shW * 1.02, sy + 12], [cx - shW * 0.95 + H.sway * 0.3, b], [cx + shW * 0.95 + H.sway * 0.6, b], [cx + shW * 1.02, sy + 12], [cx + rx * 1.14, hy + ry * 0.6], [cx + rx * 0.95, hy - ry * 0.3], [cx, hy - ry * 1.05]], { sheens: [[cx - 8, sy, cx - 9, b - 4, -2], [cx + 6, sy + 2, cx + 7, b - 6, 2, 0.35]] }); },
  low_tail(ctx, H) { const { cx, hy, rx, ry, sy, hipY, shW } = H; lock(ctx, H, [[cx + 3, hy + ry * 0.5], [cx + shW * 0.78, sy + 6], [cx + shW * 0.9, sy + 30], [cx + shW * 0.7, hipY + 6]], 12, 7, { bulge: 0.3 }); tie(ctx, cx + 4, hy + ry * 0.56, 5); },
  high_tail(ctx, H) { const { cx, hy, rx, ry, sy, hipY, shW } = H; lock(ctx, H, [[cx + 2, hy - ry * 1.05], [cx + rx * 0.9, hy - ry * 1.55], [cx + rx * 1.5, hy - ry * 0.4], [cx + shW * 0.95, sy + 18], [cx + shW * 0.7, sy + 40]], 14, 5, { bulge: 0.35, sway: 1.3 }); tie(ctx, cx + 3, hy - ry * 1.05, 5); },
  topknot(ctx, H) { const { cx, hy, ry, sy } = H; lock(ctx, H, [[cx, hy - ry * 0.4], [cx, hy + ry * 0.7], [cx + 2, sy + 22]], 9, 4); bun(ctx, H, cx, hy - ry * 1.2, 8.5); },
  double_bun(ctx, H) { const { cx, hy, rx, ry } = H; for (const s of [-1, 1]) { lock(ctx, H, [[cx + s * rx * 0.85, hy - ry * 0.5], [cx + s * rx * 1.25, hy + ry * 0.5], [cx + s * rx * 1.1, hy + ry * 1.3]], 7, 3); bun(ctx, H, cx + s * rx * 0.82, hy - ry * 0.98, 9.5); } },
  half_up(ctx, H) { BACK.long_straight(ctx, H); bun(ctx, H, H.cx, H.hy - H.ry * 1.18, 7.5); },
  long_braid(ctx, H) { const { cx, hy, rx, ry, sy, hipY } = H; panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.2], [cx - rx * 1.05, hy + ry * 0.6], [cx - 6, sy + 6], [cx + 6, sy + 6], [cx + rx * 1.05, hy + ry * 0.6], [cx + rx * 0.95, hy - ry * 0.2], [cx, hy - ry * 1.05]]); },
  twin_braids(ctx, H) { const { cx, hy, rx, ry, sy } = H; panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.2], [cx - rx * 1.05, hy + ry * 0.7], [cx + rx * 1.05, hy + ry * 0.7], [cx + rx * 0.95, hy - ry * 0.2], [cx, hy - ry * 1.05]]); },
  hime_cut(ctx, H) { const { cx, hy, rx, ry, sy, torso } = H, b = sy + torso * 0.55;
    panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.3], [cx - rx * 1.2, hy + ry * 0.8], [cx - rx * 1.2, b], [cx - rx * 0.3 + H.sway * 0.2, b + 1], [cx + rx * 0.3 + H.sway * 0.3, b + 1], [cx + rx * 1.2 + H.sway * 0.4, b], [cx + rx * 1.2, hy + ry * 0.8], [cx + rx * 0.95, hy - ry * 0.3], [cx, hy - ry * 1.05]], { gy1: b, sheens: [[cx - 8, hy + ry * 0.6, cx - 9, b - 3, -2]] }); },
  wolf_cut(ctx, H) { const { cx, hy, rx, ry, sy } = H, b = sy + 10;
    panel(ctx, H, [[cx - rx * 1.0, hy - ry * 0.3], [cx - rx * 1.3, hy + ry * 0.5], [cx - rx * 1.55 + H.sway * 0.2, hy + ry * 1.2], [cx - rx * 1.0, b - 6], [cx - rx * 0.78, b + 5], [cx - rx * 0.4, b - 3], [cx, b + 7], [cx + rx * 0.4, b - 3], [cx + rx * 0.78, b + 5], [cx + rx * 1.0, b - 6], [cx + rx * 1.55 + H.sway * 0.3, hy + ry * 1.2], [cx + rx * 1.3, hy + ry * 0.5], [cx + rx * 1.0, hy - ry * 0.3], [cx, hy - ry * 1.1]], { gy1: b, sheens: [[cx - 8, hy, cx - 10, b - 6, -2], [cx + 7, hy + 2, cx + 9, b - 8, 2, 0.35]] }); },
  bob(ctx, H) { const { cx, hy, rx, ry } = H, b = hy + ry * 1.0;
    panel(ctx, H, [[cx - rx * 1.0, hy - ry * 0.3], [cx - rx * 1.28, hy + ry * 0.45], [cx - rx * 1.2, b - 1], [cx - rx * 0.6, b + 4], [cx + rx * 0.6, b + 4], [cx + rx * 1.2, b - 1], [cx + rx * 1.28, hy + ry * 0.45], [cx + rx * 1.0, hy - ry * 0.3], [cx, hy - ry * 1.08]], { gy1: b + 4, sheens: [[cx - 9, hy, cx - 10, b - 2, -1]] }); },
  layered_long(ctx, H) { const { cx, hy, rx, ry, sy, hipY, shW } = H, b = hipY - 6;
    panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.3], [cx - rx * 1.2, hy + ry * 0.6], [cx - shW * 1.08, sy + 10], [cx - shW * 1.0, b - 12], [cx - shW * 0.6, b], [cx - shW * 0.25 + H.sway * 0.2, b - 9], [cx + 2 + H.sway * 0.3, b + 3], [cx + shW * 0.3 + H.sway * 0.4, b - 8], [cx + shW * 0.65, b + 1], [cx + shW * 1.0, b - 14], [cx + shW * 1.08, sy + 10], [cx + rx * 1.2, hy + ry * 0.6], [cx + rx * 0.95, hy - ry * 0.3], [cx, hy - ry * 1.05]], { sheens: [[cx - 9, sy, cx - 11, b - 8, -3], [cx + 8, sy + 4, cx + 10, b - 10, 3, 0.35]] }); },
  twin_tails(ctx, H) { const { cx, hy, rx, ry, sy } = H; for (const s of [-1, 1]) { lock(ctx, H, [[cx + s * rx * 0.85, hy - ry * 0.55], [cx + s * (rx + 14), hy - ry * 0.1], [cx + s * (rx + 17), hy + ry * 1.4], [cx + s * (rx + 10), sy + 40]], 11, 4, { bulge: 0.35 }); tie(ctx, cx + s * rx * 0.85, hy - ry * 0.55, 4.5, "#e9627a"); } },
  pixie(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 0.98, hy - ry * 0.2], [cx - rx * 0.9, hy + ry * 0.6], [cx, hy + ry * 0.75], [cx + rx * 0.9, hy + ry * 0.6], [cx + rx * 0.98, hy - ry * 0.2], [cx, hy - ry * 1.08]]); },
  curly(ctx, H) { const { cx, hy, rx, ry, sy } = H; const bl = [[-1.2, 0.1, 13], [1.2, 0.1, 13], [-1.38, 0.9, 12], [1.38, 0.9, 12], [-1.1, 1.65, 12], [1.1, 1.65, 12], [-0.6, 1.9, 10], [0.6, 1.9, 10], [0, 1.0, 14], [-1.5, 0.4, 11], [1.5, 0.4, 11]];
    for (const [fx, fy, r] of bl) bun(ctx, H, cx + fx * rx * 0.82 + H.sway * 0.2 * (fy > 1 ? 1 : 0), hy + fy * ry * 0.7, r, { tie: "rgba(0,0,0,0)" }); },
  mullet(ctx, H) { const { cx, hy, rx, ry, sy } = H; lock(ctx, H, [[cx - rx * 0.4, hy + ry * 0.4], [cx - 2, hy + ry * 0.95], [cx + 1, sy + 22]], rx * 1.5, 6, { bulge: 0.15 }); },
  short_messy(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 1.0, hy - ry * 0.2], [cx - rx * 0.95, hy + ry * 0.5], [cx + rx * 0.95, hy + ry * 0.5], [cx + rx * 1.0, hy - ry * 0.2], [cx, hy - ry * 1.08]]); },
};
const FRONT_BACK = new Set(["long_braid", "twin_braids"]); // locks drawn over shoulders after body
function drawBraidFront(ctx, H, id) {
  const { cx, hy, rx, ry, sy, hipY, shW } = H, segs = 9;
  const one = (x0, y0, x1, y1) => { const dx = (x1 - x0) / segs, dy = (y1 - y0) / segs; for (let i = 0; i < segs; i++) { const t = i / segs, w = lerp(6.2, 3.2, t), x = x0 + dx * i + H.sway * t ** 1.5, y = y0 + dy * i; ctx.beginPath(); ctx.ellipse(x, y, w, 4.1, i % 2 ? 0.4 : -0.4, 0, TAU); const g = ctx.createLinearGradient(x - w, y, x + w, y); g.addColorStop(0, H.c.light); g.addColorStop(0.5, H.c.color); g.addColorStop(1, H.c.shadow); ctx.fillStyle = g; ctx.fill(); outline(ctx, 0.55, 0.9); } tie(ctx, x1 + H.sway, y1 + 3, 4.5, "#c43b4a"); };
  if (id === "long_braid") one(cx + shW * 0.62, sy + 2, cx + shW * 0.6, hipY + 8);
  else { one(cx - shW * 0.7, sy + 2, cx - shW * 0.78, hipY - 4); one(cx + shW * 0.7, sy + 2, cx + shW * 0.78, hipY - 4); }
}
function drawCap(ctx, H, id) {
  const { cx, hy, rx, ry, view } = H, short = ["pixie", "short_messy", "mullet", "topknot", "high_tail", "double_bun"].includes(id), vol = id === "wolf_cut" ? 3 : id === "curly" ? 4 : id === "short_messy" ? 2 : 0;
  const drop = short ? -0.02 : 0.22;
  ctx.beginPath();
  if (view === "up") { ctx.ellipse(cx, hy + ry * 0.02, rx + 2 + vol, ry + 3 + vol, 0, 0, TAU); }
  else {
    ctx.moveTo(cx - rx * 0.99, hy + ry * drop);
    ctx.bezierCurveTo(cx - rx * 1.16 - vol, hy - ry * 0.55, cx - rx * 0.78, hy - ry * 1.18 - vol, cx, hy - ry * 1.12 - vol);
    ctx.bezierCurveTo(cx + rx * 0.78, hy - ry * 1.18 - vol, cx + rx * 1.16 + vol, hy - ry * 0.55, cx + rx * 0.99, hy + ry * drop);
    ctx.bezierCurveTo(cx + rx * 0.97, hy - ry * 0.12, cx + rx * 0.8, hy - ry * 0.3, cx + rx * 0.5, hy - ry * 0.4);
    ctx.bezierCurveTo(cx + rx * 0.3, hy - ry * 0.6, cx + rx * 0.1, hy - ry * 0.62, cx, hy - ry * 0.6);
    ctx.bezierCurveTo(cx - rx * 0.1, hy - ry * 0.62, cx - rx * 0.3, hy - ry * 0.6, cx - rx * 0.5, hy - ry * 0.4);
    ctx.bezierCurveTo(cx - rx * 0.8, hy - ry * 0.3, cx - rx * 0.97, hy - ry * 0.12, cx - rx * 0.99, hy + ry * drop);
  }
  ctx.closePath(); ctx.fillStyle = hairFill(ctx, H, hy - ry * 1.1, hy + ry * 0.4); ctx.fill(); outline(ctx, 0.5, 1);
  // sheen band + strand lines
  ctx.save(); ctx.clip(); ctx.strokeStyle = rgba(H.c.light, 0.55); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.beginPath(); ctx.ellipse(cx - rx * 0.1, hy - ry * 0.45, rx * 0.72, ry * 0.62, 0, 3.55, 5.1); ctx.stroke();
  ctx.strokeStyle = rgba(H.c.shadow, 0.5); ctx.lineWidth = 0.9; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx + i * rx * 0.12, hy - ry * 1.05); ctx.quadraticCurveTo(cx + i * rx * 0.28, hy - ry * 0.75, cx + i * rx * 0.46, hy - ry * 0.32); ctx.stroke(); }
  ctx.restore();
  if (id === "short_messy" || id === "wolf_cut" || id === "pixie") for (let i = -3; i <= 3; i++) { const x = cx + i * rx * 0.3, h = 4 + ((i * 7) & 3) * 1.5; ctx.beginPath(); ctx.moveTo(x - 4, hy - ry * 1.06); ctx.lineTo(x + (i % 2 ? 2 : -2), hy - ry * 1.06 - h - vol); ctx.lineTo(x + 4, hy - ry * 1.04); ctx.closePath(); ctx.fillStyle = H.c.color; ctx.fill(); outline(ctx, 0.5, 0.8); }
}
const SIDE_DRAW = {
  none() {},
  hime(ctx, H, s) { const { cx, hy, rx, ry, sy, torso } = H; lock(ctx, H, [[cx + s * rx * 0.88, hy - ry * 0.45], [cx + s * rx * 1.05, hy + ry * 0.3], [cx + s * rx * 1.06, hy + ry * 1.1], [cx + s * rx * 0.98, sy + torso * 0.45]], 8, 6.5, { sway: 0.5, sheenSide: s }); },
  short(ctx, H, s) { const { cx, hy, rx, ry } = H; lock(ctx, H, [[cx + s * rx * 0.86, hy - ry * 0.45], [cx + s * rx * 1.02, hy + ry * 0.1], [cx + s * rx * 0.98, hy + ry * 0.72]], 7, 3, { sway: 0.2, sheenSide: s }); },
  braid(ctx, H, s) { const { cx, hy, rx, ry, sy, torso } = H, x0 = cx + s * rx * 1.04, y0 = hy + ry * 0.1, y1 = sy + torso * 0.35; lock(ctx, H, [[cx + s * rx * 0.88, hy - ry * 0.45], [x0, y0]], 6, 4, { sheen: false });
    for (let i = 0; i < 7; i++) { const t = i / 6, x = x0 + s * 1.5 * t + H.sway * 0.3 * t * t, y = y0 + (y1 - y0) * t, w = lerp(3.6, 2.2, t); ctx.beginPath(); ctx.ellipse(x, y, w, 3, i % 2 ? 0.45 : -0.45, 0, TAU); ctx.fillStyle = i % 2 ? H.c.color : mix(H.c.color, H.c.light, 0.3); ctx.fill(); outline(ctx, 0.5, 0.8); } tie(ctx, x0 + s * 1.5 + H.sway * 0.3, y1 + 3, 3.4, "#e0b25a"); },
  ringlet(ctx, H, s) { const { cx, hy, rx, ry } = H, pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([cx + s * (rx * 1.02 + S(t * TAU * 2.2) * 5.5), hy - ry * 0.4 + t * ry * 1.9]); } lock(ctx, H, pts, 6.5, 3, { sway: 0.4, sheenSide: s }); },
  tucked(ctx, H, s) { const { cx, hy, rx, ry } = H; lock(ctx, H, [[cx + s * rx * 0.8, hy - ry * 0.5], [cx + s * rx * 1.03, hy - ry * 0.1], [cx + s * rx * 0.9, hy + ry * 0.18]], 6, 2.5, { sway: 0, sheenSide: s }); },
  ribbon(ctx, H, s) { SIDE_DRAW.hime(ctx, H, s); const { cx, hy, rx, ry } = H, x = cx + s * rx * 1.05, y = hy + ry * 0.9; ctx.fillStyle = "#d8485c"; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 7, y - 5, x + k * 8, y + 2); ctx.quadraticCurveTo(x + k * 5, y + 5, x, y); ctx.fill(); outline(ctx, 0.5, 0.7); } ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); },
  loop(ctx, H, s) { const { cx, hy, rx, ry } = H, x = cx + s * (rx * 1.08 + 3), y = hy + ry * 0.5; lock(ctx, H, [[cx + s * rx * 0.88, hy - ry * 0.45], [cx + s * rx * 1.04, hy + ry * 0.05]], 6, 5, { sheen: false }); ctx.strokeStyle = H.c.color; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.ellipse(x, y, 5, 8.5, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = rgba(H.c.light, 0.55); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(x, y, 5, 8.5, 0, 3.6, 5.2); ctx.stroke(); ctx.strokeStyle = rgba(LINE, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y, 7.4, 10.8, 0, 0, TAU); ctx.stroke(); tie(ctx, x - s * 2, y - 8, 3.2, "#e0b25a"); },
  wisp(ctx, H, s) { const { cx, hy, rx, ry, sy, torso } = H; for (const [k, d] of [[0, 0], [1, 5], [2, -4]]) lock(ctx, H, [[cx + s * rx * (0.86 + k * 0.02), hy - ry * 0.4], [cx + s * (rx * 1.05 + d), hy + ry * 0.6], [cx + s * (rx * 1.0 + d * 1.5), sy + torso * 0.4 + k * 4]], 4.6, 0.8, { sway: 0.6, sheenSide: s }); },
  spike(ctx, H, s) { const { cx, hy, rx, ry } = H; lock(ctx, H, [[cx + s * rx * 0.86, hy - ry * 0.45], [cx + s * rx * 1.08, hy + ry * 0.15], [cx + s * rx * 1.12, hy + ry * 0.9]], 8, 0.8, { sway: 0.1, sheenSide: s }); },
};
const FRINGE_DRAW = {
  none() {},
  blunt(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 0.97, hy - ry * 0.18], [cx - rx * 0.6, hy - ry * 0.26], [cx, hy - ry * 0.27], [cx + rx * 0.6, hy - ry * 0.26], [cx + rx * 0.97, hy - ry * 0.18], [cx + rx * 0.9, hy - ry * 0.7], [cx, hy - ry * 0.85], [cx - rx * 0.9, hy - ry * 0.7]], { gy0: hy - ry, gy1: hy }); },
  hime(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 0.99, hy - ry * 0.02], [cx - rx * 0.5, hy - ry * 0.08], [cx + rx * 0.5, hy - ry * 0.08], [cx + rx * 0.99, hy - ry * 0.02], [cx + rx * 0.95, hy - ry * 0.7], [cx, hy - ry * 0.9], [cx - rx * 0.95, hy - ry * 0.7]], { gy0: hy - ry, gy1: hy + ry * 0.2 }); },
  air(ctx, H) { const { cx, hy, rx, ry } = H; for (let i = -6; i <= 6; i++) { const x = cx + i * rx * 0.15; lock(ctx, H, [[x, hy - ry * 0.75], [x + i * 0.3, hy - ry * 0.45], [x + i * 0.9, hy - ry * 0.16 + Math.abs(i) * 0.5]], 5.5, 1.6, { sway: 0, alpha: 0.78, sheen: false }); } },
  curtain(ctx, H) { const { cx, hy, rx, ry } = H; for (const s of [-1, 1]) panel(ctx, H, [[cx + s * 1, hy - ry * 0.78], [cx + s * rx * 0.45, hy - ry * 0.7], [cx + s * rx * 0.95, hy - ry * 0.35], [cx + s * rx * 1.0, hy + ry * 0.18], [cx + s * rx * 0.72, hy - ry * 0.08], [cx + s * rx * 0.34, hy - ry * 0.3], [cx + s * rx * 0.1, hy - ry * 0.5]], { gy0: hy - ry, gy1: hy + ry * 0.2 }); },
  sweep_l(ctx, H, flip = 1) { const { cx, hy, rx, ry } = H, m = flip; panel(ctx, H, [[cx + m * rx * 0.5, hy - ry * 0.8], [cx - m * rx * 0.3, hy - ry * 0.88], [cx - m * rx * 0.97, hy - ry * 0.4], [cx - m * rx * 1.02, hy + ry * 0.2], [cx - m * rx * 0.62, hy - ry * 0.05], [cx - m * rx * 0.1, hy - ry * 0.18], [cx + m * rx * 0.28, hy - ry * 0.42], [cx + m * rx * 0.55, hy - ry * 0.6]], { gy0: hy - ry, gy1: hy + ry * 0.2, sheens: [[cx, hy - ry * 0.7, cx - m * rx * 0.7, hy - ry * 0.2, -1]] }); },
  sweep_r(ctx, H) { FRINGE_DRAW.sweep_l(ctx, H, -1); },
  wispy(ctx, H) { const { cx, hy, rx, ry } = H; for (let i = -4; i <= 4; i++) { const x = cx + i * rx * 0.2; lock(ctx, H, [[x, hy - ry * 0.78], [x + i * 1.3, hy - ry * 0.42], [x + i * 2.4, hy - ry * (0.1 + (i % 2 ? 0.12 : 0)) + Math.abs(i)]], 6, 0.6, { sway: 0, sheen: false }); } },
  long_split(ctx, H) { const { cx, hy, rx, ry } = H; for (const s of [-1, 1]) lock(ctx, H, [[cx + s * 1.5, hy - ry * 0.86], [cx + s * rx * 0.55, hy - ry * 0.5], [cx + s * rx * 0.82, hy + ry * 0.2], [cx + s * rx * 0.76, hy + ry * 0.72]], 12, 2, { sway: 0.2, bulge: 0.2, sheenSide: s }); },
  micro(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 0.95, hy - ry * 0.4], [cx - rx * 0.4, hy - ry * 0.46], [cx, hy - ry * 0.44], [cx + rx * 0.4, hy - ry * 0.46], [cx + rx * 0.95, hy - ry * 0.4], [cx + rx * 0.9, hy - ry * 0.75], [cx, hy - ry * 0.88], [cx - rx * 0.9, hy - ry * 0.75]], { gy0: hy - ry, gy1: hy - ry * 0.3 }); },
  arch(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx - rx * 0.98, hy + ry * 0.06], [cx - rx * 0.6, hy - ry * 0.18], [cx, hy - ry * 0.36], [cx + rx * 0.6, hy - ry * 0.18], [cx + rx * 0.98, hy + ry * 0.06], [cx + rx * 0.95, hy - ry * 0.7], [cx, hy - ry * 0.88], [cx - rx * 0.95, hy - ry * 0.7]], { gy0: hy - ry, gy1: hy }); },
  eye_cover(ctx, H) { const { cx, hy, rx, ry } = H; panel(ctx, H, [[cx + rx * 0.2, hy - ry * 0.82], [cx - rx * 0.4, hy - ry * 0.85], [cx - rx * 0.98, hy - ry * 0.3], [cx - rx * 1.02, hy + ry * 0.38], [cx - rx * 0.62, hy + ry * 0.32], [cx - rx * 0.22, hy + ry * 0.08], [cx + rx * 0.05, hy - ry * 0.22], [cx + rx * 0.3, hy - ry * 0.5]], { gy0: hy - ry, gy1: hy + ry * 0.4 }); },
};
function drawAccessory(ctx, H, id, g) {
  const { cx, hy, rx, ry } = H, p = optionOf("outfit", g.A.outfit).palette, gold = "#d9b45c";
  if (id === "hairpin") { ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx + rx * 0.2, hy - ry * 1.05); ctx.lineTo(cx + rx * 1.18, hy - ry * 0.25); ctx.stroke(); ctx.fillStyle = "#e8486a"; ctx.beginPath(); ctx.arc(cx + rx * 1.18, hy - ry * 0.25, 2.6, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.7);
    ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + rx * 1.18, hy - ry * 0.18); ctx.lineTo(cx + rx * 1.2 + H.sway * 0.3, hy + ry * 0.5); ctx.stroke(); ctx.fillStyle = "#6fd0b0"; ctx.beginPath(); ctx.arc(cx + rx * 1.2 + H.sway * 0.3, hy + ry * 0.56, 1.9, 0, TAU); ctx.fill(); }
  else if (id === "guan") { const y = hy - ry * 1.16; ctx.fillStyle = vgrad(ctx, y - 6, y + 4, [[0, "#f3dc8a"], [1, "#b8892f"]]); ctx.beginPath(); ctx.roundRect(cx - 7, y - 6, 14, 9, 3); ctx.fill(); outline(ctx, 0.6, 0.9); ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 13, y + 0.5); ctx.lineTo(cx + 13, y - 1.5); ctx.stroke(); ctx.fillStyle = "#e8486a"; ctx.beginPath(); ctx.arc(cx, y - 2, 1.8, 0, TAU); ctx.fill(); }
  else if (id === "ribbon") { const x = cx + rx * 0.7, y = hy - ry * 0.88; ctx.fillStyle = "#e0485e"; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 12, y - 9, x + k * 13, y + 2); ctx.quadraticCurveTo(x + k * 8, y + 7, x, y); ctx.fill(); outline(ctx, 0.55, 0.8); } ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fillStyle = "#b8283c"; ctx.fill(); ctx.fillStyle = "#e0485e"; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x - 5 + H.sway * 0.4, y + 14); ctx.lineTo(x - 1, y + 12); ctx.lineTo(x + 3, y + 15 + H.sway * 0.4); ctx.closePath(); ctx.fill(); }
  else if (id === "flower") { const x = cx - rx * 0.78, y = hy - ry * 0.62; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; ctx.fillStyle = i % 2 ? "#f08aa8" : "#f7a6bd"; ctx.beginPath(); ctx.ellipse(x + C(a) * 5, y + S(a) * 5, 4.6, 3.6, a, 0, TAU); ctx.fill(); outline(ctx, 0.4, 0.6); } ctx.fillStyle = "#f6d472"; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); ctx.fillStyle = "#4f9a62"; ctx.beginPath(); ctx.ellipse(x + 8, y + 6, 5, 2.4, 0.6, 0, TAU); ctx.fill(); }
  else if (id === "headband") { ctx.strokeStyle = p.accent; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx - rx * 1.0, hy - ry * 0.28); ctx.quadraticCurveTo(cx, hy - ry * 0.62, cx + rx * 1.0, hy - ry * 0.28); ctx.stroke(); ctx.strokeStyle = rgba("#fff", 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - rx * 0.9, hy - ry * 0.34); ctx.quadraticCurveTo(cx, hy - ry * 0.68, cx + rx * 0.9, hy - ry * 0.34); ctx.stroke(); ctx.fillStyle = p.accent; ctx.beginPath(); ctx.moveTo(cx + rx, hy - ry * 0.28); ctx.lineTo(cx + rx + 6 + H.sway * 0.5, hy + ry * 0.2); ctx.lineTo(cx + rx + 1, hy + ry * 0.1); ctx.closePath(); ctx.fill(); }
  else if (id === "earrings" && H.view !== "up") for (const s of H.view === "side" ? [-1] : [-1, 1]) { const x = (H.view === "side" ? cx - rx * 0.25 : cx + s * rx * 0.99), y = hy + ry * 0.3; ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4); ctx.stroke(); ctx.fillStyle = "#5fcf9f"; ctx.beginPath(); ctx.ellipse(x, y + 7, 2.2, 3.4, 0, 0, TAU); ctx.fill(); outline(ctx, 0.5, 0.7); ctx.fillStyle = rgba("#fff", 0.6); ctx.beginPath(); ctx.arc(x - 0.6, y + 5.8, 0.8, 0, TAU); ctx.fill(); }
}

// ------------------------------------------------------------------ main entry
const OUTFIT_SHAPE = { moonlit: { len: 0.96, sleeve: 2.3 }, crimson: { len: 0.96, sleeve: 2 }, jade: { len: 0.78, sleeve: 1.9 }, midnight: { len: 0.82, sleeve: 1.6 }, sunrise: { len: 0.97, sleeve: 2.1 }, wanderer: { len: 0.38, sleeve: 1.05 } };
const withTransform = (ctx, cx, sx, dx, fn) => { ctx.save(); ctx.translate(cx + dx, 0); ctx.scale(sx, 1); ctx.translate(-cx, 0); fn(); ctx.restore(); };

/** Draws the character into a 128x176 logical cell with origin at ctx's current transform. */
export function drawCharacter(ctx, appearance, o = {}) {
  const A = normalizeAppearance(appearance), view = o.view || "down", phase = o.phase || 0, walking = !!o.walking;
  const t = phase * TAU, pose = walking ? { stride: S(t), bob: Math.abs(C(t)) * 1.7, sway: -S(t - 0.9) * 3.2 } : { stride: 0, bob: S(t) * 0.7 + 0.7, sway: S(t - 0.7) * 1.3 };
  const g = makeGeom(A, view, pose), H = makeH(g), X = { ...optionOf("expression", o.expression || A.expression) };
  const of = { ...optionOf("outfit", A.outfit), ...OUTFIT_SHAPE[A.outfit] };
  const back = BACK[A.hairBack] || BACK.long_straight, sideMode = view === "side", up = view === "up";
  ctx.save(); ctx.lineJoin = "round";
  if (o.shadow !== false) { softEllipse(ctx, CX, FY - 1, 30 * g.W + 6, 7, "#1a1626", 0.32); }
  // 1. back hair (behind body); in back view hair hangs in front of the body instead
  if (!up && !FRONT_BACK.has(A.hairBack)) { if (sideMode) withTransform(ctx, g.cx, 0.72, -g.rx * 0.5, () => back(ctx, H)); else back(ctx, H); }
  // 2. body
  if (sideMode) drawArms(ctx, g, of, true);
  drawLegs(ctx, g, of); drawTorso(ctx, g, of);
  if (!up || true) drawArms(ctx, g, of, false);
  // 3. head
  drawHead(ctx, g);
  if (!up) withTransform(ctx, g.cx, 1, 0, () => drawFace(ctx, g, X));
  // 4. hair over face
  if (up) { drawCap(ctx, H, A.hairBack); if (!FRONT_BACK.has(A.hairBack)) back(ctx, H); else { BACK[A.hairBack]?.(ctx, H); drawBraidFront(ctx, H, A.hairBack); } }
  else {
    if (sideMode) {
      withTransform(ctx, g.cx, 0.92, -g.rx * 0.2, () => drawCap(ctx, H, A.hairBack));
      withTransform(ctx, g.cx, 0.6, -g.rx * 0.02, () => (SIDE_DRAW[A.sideL] || SIDE_DRAW.none)(ctx, H, -1));
      withTransform(ctx, g.cx, 0.55, g.rx * 0.42, () => (FRINGE_DRAW[A.fringe] || FRINGE_DRAW.none)(ctx, H));
    } else {
      if (FRONT_BACK.has(A.hairBack)) { BACK[A.hairBack]?.(ctx, H); }
      drawCap(ctx, H, A.hairBack);
      (SIDE_DRAW[A.sideL] || SIDE_DRAW.none)(ctx, H, -1); (SIDE_DRAW[A.sideR] || SIDE_DRAW.none)(ctx, H, 1);
      (FRINGE_DRAW[A.fringe] || FRINGE_DRAW.none)(ctx, H);
      if (FRONT_BACK.has(A.hairBack)) drawBraidFront(ctx, H, A.hairBack);
    }
  }
  if (sideMode) withTransform(ctx, g.cx, 0.9, -g.rx * 0.2, () => drawAccessory(ctx, H, A.accessory, g)); else drawAccessory(ctx, H, A.accessory, g);
  ctx.restore();
  return g;
}
export const headCenter = A => { const g = makeGeom(normalizeAppearance(A), "down", { stride: 0, bob: 0, sway: 0 }); return { x: g.cx, y: g.hcy, rx: g.rx, ry: g.ry }; };
