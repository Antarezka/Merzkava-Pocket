// PLACEHOLDER mob art, now RIGGED: every species is drawn as a few separate parts (body, face with open + closed eyes, ears / legs / arms / tail)
// so each body kind can animate on its own — breathing, blinking, hopping, walking, attacking, taking a hit, dying.
// Real mob art can replace buildRig() later; the combat code only talks to buildRig() / drawMob().
const INK = "#3b2c36";
const mk = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))))); return `rgb(${c[0]},${c[1]},${c[2]})`; }

let BLINK = false;   // while building the "closed eyes" variant of a face part
function eyes(x, ys, gap, r = 3.4, glow) {
  for (const s of [-1, 1]) {
    if (BLINK) { x.strokeStyle = INK; x.lineWidth = 2.2; x.lineCap = "round"; x.beginPath(); x.moveTo(ys.x + s * gap - r, ys.y); x.quadraticCurveTo(ys.x + s * gap, ys.y + r * 0.8, ys.x + s * gap + r, ys.y); x.stroke(); continue; }
    x.fillStyle = glow || INK; x.beginPath(); x.ellipse(ys.x + s * gap, ys.y, r, r * 1.25, 0, 0, 6.3); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(ys.x + s * gap + 1, ys.y - 1.4, r * 0.38, 0, 6.3); x.fill();
  }
}
function dot(x, px, py, r) { if (BLINK) { x.strokeStyle = INK; x.lineWidth = 2; x.lineCap = "round"; x.beginPath(); x.moveTo(px - r, py); x.lineTo(px + r, py); x.stroke(); } else { x.fillStyle = INK; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); } }
function body(x, tint, path) { const g = x.createLinearGradient(0, 20, 0, 90); g.addColorStop(0, shade(tint, 0.35)); g.addColorStop(0.55, tint); g.addColorStop(1, shade(tint, -0.22)); x.fillStyle = g; x.strokeStyle = INK; x.lineWidth = 3; x.lineJoin = "round"; path(); x.fill(); x.stroke(); }
const part = (id, z, draw, pivot, face) => ({ id, z, draw, pivot: pivot || [50, 94], face: !!face });

// every species faces RIGHT in its box (100 x 100, ground contact at y ~ 94); drawMob() mirrors it when it should face left.
const KIND = {
  slime: { top: 0.22, parts: (t) => [part("body", 1, (x) => {
    body(x, t, () => { x.beginPath(); x.moveTo(10, 82); x.bezierCurveTo(8, 52, 28, 24, 50, 24); x.bezierCurveTo(72, 24, 92, 52, 90, 82); x.quadraticCurveTo(90, 90, 80, 90); x.lineTo(20, 90); x.quadraticCurveTo(10, 90, 10, 82); x.closePath(); });
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(34, 44, 8, 5, -0.6, 0, 6.3); x.fill(); eyes(x, { x: 50, y: 64 }, 13, 4); x.strokeStyle = INK; x.lineWidth = 2.2; x.beginPath(); x.arc(50, 70, 5, 0.15, Math.PI - 0.15); x.stroke();
  }, [50, 90], true)] },
  critter: { top: 0.06, parts: (t) => {
    const ear = (s) => part(s < 0 ? "ear_l" : "ear_r", 0, (x) => { x.save(); x.translate(50 + s * 11, 24); x.rotate(s * 0.18); body(x, t, () => { x.beginPath(); x.ellipse(0, 0, 6.5, 17, 0, 0, 6.3); }); x.fillStyle = "rgba(255,170,190,.8)"; x.beginPath(); x.ellipse(0, 1, 2.6, 11, 0, 0, 6.3); x.fill(); x.restore(); }, [50 + s * 11, 38]);
    return [ear(-1), ear(1),
      part("body", 1, (x) => { body(x, t, () => { x.beginPath(); x.ellipse(50, 68, 30, 21, 0, 0, 6.3); }); body(x, t, () => { x.beginPath(); x.arc(50, 50, 21, 0, 6.3); }); eyes(x, { x: 50, y: 50 }, 8.5, 3.2); x.fillStyle = "#e58a8a"; x.beginPath(); x.ellipse(50, 57, 3, 2.2, 0, 0, 6.3); x.fill(); }, [50, 92], true),
      part("tail", 2, (x) => { x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(19, 72, 7, 0, 6.3); x.fill(); x.stroke(); }, [26, 72])];
  } },
  beast: { top: 0.22, parts: (t) => {
    const leg = (i, lx) => part("leg" + i, 0, (x) => body(x, shade(t, -0.12), () => { x.beginPath(); x.roundRect(lx - 4, 74, 9, 15, 3); }), [lx, 75]);
    return [leg(0, 28), leg(1, 40), leg(2, 58), leg(3, 70),
      part("body", 1, (x) => body(x, t, () => { x.beginPath(); x.moveTo(14, 70); x.bezierCurveTo(8, 50, 36, 40, 58, 42); x.bezierCurveTo(72, 44, 78, 56, 76, 74); x.lineTo(18, 78); x.closePath(); }), [40, 90]),
      part("tail", 2, (x) => body(x, t, () => { x.beginPath(); x.ellipse(11, 62, 7, 4, -0.5, 0, 6.3); }), [17, 65]),
      part("head", 3, (x) => {
        body(x, shade(t, 0.05), () => { x.beginPath(); x.arc(76, 52, 15, 0, 6.3); }); body(x, shade(t, 0.3), () => { x.beginPath(); x.ellipse(88, 58, 9, 7, 0, 0, 6.3); });
        for (const o of [-9, 4]) body(x, t, () => { x.beginPath(); x.moveTo(70 + o, 41); x.lineTo(74 + o, 24); x.lineTo(82 + o, 40); x.closePath(); });
        dot(x, 78, 50, 2.6); x.fillStyle = INK; x.beginPath(); x.arc(93, 56, 2.2, 0, 6.3); x.fill();
      }, [66, 62], true)];
  } },
  spirit: { top: 0.04, parts: (t) => [part("body", 1, (x) => {
    body(x, t, () => { x.beginPath(); x.moveTo(16, 70); x.bezierCurveTo(10, 30, 34, 14, 50, 14); x.bezierCurveTo(68, 14, 90, 30, 84, 70); for (let i = 0; i < 4; i++) x.quadraticCurveTo(80 - i * 18, 94, 66 - i * 17, 76); x.closePath(); });
    for (const s of [-1, 1]) body(x, shade(t, -0.3), () => { x.beginPath(); x.moveTo(50 + s * 10, 18); x.lineTo(50 + s * 18, 4); x.lineTo(50 + s * 20, 22); x.closePath(); });
    eyes(x, { x: 50, y: 46 }, 12, 5, shade(t, 0.75)); x.strokeStyle = INK; x.lineWidth = 2.2; x.beginPath(); x.arc(50, 58, 4, 0.2, Math.PI - 0.2); x.stroke();
  }, [50, 80], true)] },
  golem: { top: 0.08, parts: (t) => {
    const box = (x, tint, a, b, c, d, r) => body(x, tint, () => { x.beginPath(); x.roundRect(a, b, c, d, r); });
    return [
      part("arm_l", 0, (x) => box(x, shade(t, -0.1), 10, 46, 17, 34, 7), [18, 50]), part("arm_r", 0, (x) => box(x, shade(t, -0.1), 73, 46, 17, 34, 7), [82, 50]),
      part("body", 1, (x) => { box(x, t, 24, 32, 52, 56, 9); x.strokeStyle = shade(t, -0.4); x.lineWidth = 2; x.beginPath(); x.moveTo(40, 52); x.lineTo(48, 62); x.lineTo(44, 74); x.moveTo(62, 48); x.lineTo(58, 60); x.stroke(); }, [50, 90]),
      part("head", 2, (x) => { box(x, shade(t, 0.12), 34, 10, 32, 30, 8); eyes(x, { x: 50, y: 26 }, 8, 3.4, shade(t, 0.8)); }, [50, 40], true)];
  } },
};
function crown(x) { x.fillStyle = "#f0cf6a"; x.strokeStyle = INK; x.lineWidth = 2.4; x.beginPath(); x.moveTo(36, 22); x.lineTo(38, 6); x.lineTo(44, 14); x.lineTo(50, 2); x.lineTo(56, 14); x.lineTo(62, 6); x.lineTo(64, 22); x.closePath(); x.fill(); x.stroke(); x.fillStyle = "#e0553a"; x.beginPath(); x.arc(50, 15, 2.4, 0, 6.3); x.fill(); }
function horns(x) { for (const s of [-1, 1]) { x.fillStyle = "#f2e3c3"; x.strokeStyle = INK; x.lineWidth = 2.6; x.beginPath(); x.moveTo(50 + s * 14, 24); x.quadraticCurveTo(50 + s * 34, 20, 50 + s * 30, -2); x.quadraticCurveTo(50 + s * 22, 12, 50 + s * 8, 20); x.closePath(); x.fill(); x.stroke(); } }

/** -> rig { kind, tier, size, top, parts:[{id,z,pivot,canvas,canvasB,flash}] }  (parts are 2x-resolution canvases of the 100x100 design box) */
export function buildRig(kind, tint, size, tier = "mob") {
  const def = KIND[kind] || KIND.slime, S = Math.round(size * 2), parts = def.parts(tint).sort((a, b) => a.z - b.z);
  const paint = (p, blink) => {
    BLINK = blink; const c = mk(S, S), x = c.getContext("2d"); x.scale(S / 100, S / 100);
    p.draw(x);
    if (p.face && tier !== "mob") { x.save(); if (kind === "beast") x.translate(26, 14); if (tier === "boss") horns(x); crown(x); x.restore(); }
    BLINK = false; return c;
  };
  const out = parts.map((p) => ({ id: p.id, z: p.z, pivot: p.pivot, face: p.face, canvas: paint(p, false), canvasB: p.face ? paint(p, true) : null, flash: null }));
  return { kind, tier, size, top: def.top, parts: out };
}
function flashOf(p) { if (!p.flash) { const c = mk(p.canvas.width, p.canvas.height), x = c.getContext("2d"); x.drawImage(p.canvas, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); p.flash = c; } return p.flash; }

// ------------------------------------------------------------------ animation
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (k) => k * k * (3 - 2 * k), bump = (p, a, b) => Math.sin(clamp((p - a) / (b - a), 0, 1) * Math.PI);
/** per-kind pose: returns { sx, sy, lift, lean, dx, wob, wave, parts:{id:{r,dx,dy}} }.  a = { t (seconds, per-mob phase), mv (0..1 walking), atk (0..1 swing progress, <0 none), hit (0..1), id } */
const POSE = {
  slime(a) {
    const u = (a.t * (1 + 0.8 * a.mv)) % 1, o = { sx: 1, sy: 1, lift: 0, lean: 0, dx: 0, wob: 0, parts: {} };
    if (a.mv > 0.15) { const s = Math.sin(Math.PI * u), land = Math.max(0, 0.18 - u) / 0.18; o.lift = s * 12 * a.mv; o.sy = 1 + s * 0.1 * a.mv - land * 0.16 * a.mv; o.sx = 1 - s * 0.06 * a.mv + land * 0.14 * a.mv; o.wob = Math.sin(u * 6.283) * 0.9; }
    else { o.sy = 1 + 0.03 * Math.sin(a.t * 2.4 + 1); o.sx = 1 - 0.02 * Math.sin(a.t * 2.4 + 1); o.wob = 0.8 * Math.sin(a.t * 2.7); }
    return o;
  },
  critter(a) {
    const u = (a.t * 2) % 1, s = Math.sin(Math.PI * u), tw = Math.pow(Math.max(0, Math.sin(a.t * 0.83 + a.id)), 14) * Math.sin(a.t * 34) * 0.2, o = { sx: 1, sy: 1, lift: 0, lean: 0, dx: 0, wob: 0, parts: {} };
    if (a.mv > 0.15) { o.lift = s * 8 * a.mv; o.lean = (0.06 - s * 0.12) * a.mv; o.sy = 1 + (s - 0.4) * 0.06 * a.mv; }
    o.parts.ear_l = { r: -0.1 - s * 0.35 * a.mv + tw }; o.parts.ear_r = { r: 0.1 + s * 0.35 * a.mv - tw * 0.6 }; o.parts.tail = { r: a.mv > 0.15 ? Math.sin(a.t * 14) * 0.35 : Math.sin(a.t * 2.4) * 0.14 };
    return o;
  },
  beast(a) {
    const st = a.t * 3.6, sw = Math.sin(st) * 0.55 * a.mv, o = { sx: 1, sy: 1, lift: Math.abs(Math.sin(st)) * 2.5 * a.mv, lean: 0, dx: 0, wob: 0, parts: {} };
    o.parts.leg0 = { r: sw }; o.parts.leg3 = { r: sw }; o.parts.leg1 = { r: -sw }; o.parts.leg2 = { r: -sw };
    o.parts.tail = { r: Math.sin(a.t * (2.6 + a.mv * 3.4)) * 0.4 }; o.parts.head = { r: Math.sin(a.t * 1.9) * 0.05 + Math.sin(st * 2) * 0.05 * a.mv, dy: Math.sin(a.t * 1.7) * 0.8 };
    return o;
  },
  spirit(a) {
    return { sx: 1 - 0.02 * Math.sin(a.t * 1.9), sy: 1 + 0.03 * Math.sin(a.t * 1.9), lift: 6 + 4 * Math.sin(a.t * 1.9), lean: 0.07 * Math.sin(a.t * 1.3) + 0.1 * a.mv, dx: 0, wob: 0, wave: 3.4 + 1.6 * a.mv, parts: {} };
  },
  golem(a) {
    const st = a.t * 2.2, sw = Math.sin(st) * 0.38 * a.mv, o = { sx: 1, sy: 1, lift: Math.abs(Math.sin(st)) * 3 * a.mv, lean: 0.03 * Math.sin(st) * a.mv, dx: 0, wob: 0, parts: {} };
    o.parts.arm_l = { r: sw + 0.05 * Math.sin(a.t * 1.3) }; o.parts.arm_r = { r: -sw - 0.05 * Math.sin(a.t * 1.3 + 1) }; o.parts.head = { dy: Math.sin(a.t * 1.6) * 0.7 };
    return o;
  },
};
const ATK_PART = {   // what each kind does with its parts at the moment of the strike (k = 0..1..0)
  slime: () => ({}), critter: (k) => ({ ear_l: { r: 0.5 * k }, ear_r: { r: -0.5 * k } }), beast: (k) => ({ head: { r: 0.42 * k, dx: 4 * k }, tail: { r: -0.5 * k } }),
  spirit: () => ({}), golem: (k) => ({ arm_l: { r: -1.7 * k }, arm_r: { r: -1.7 * k }, head: { dy: 2 * k } }),
};

/**
 * Draw one mob.  s = { x, y (ground point), sz, face (+1 right / -1 left), t (anim seconds), mv, swing (0..1 progress or -1), hit (0..1), dead (0..1), born (0..1), flash(0..1) }
 */
export function drawMob(c, rig, s) {
  const sz = s.sz, k = sz / 100, a = { t: s.t, mv: s.mv || 0, atk: s.swing ?? -1, hit: s.hit || 0, id: s.id || 0 }, o = (POSE[rig.kind] || POSE.slime)(a), pr = a.atk;
  // attack: wind-up (back + squash) -> strike (lunge forward + stretch) -> recover.  f runs -1 .. +1 .. 0
  if (pr >= 0 && pr <= 1) {
    const f = pr < 0.25 ? -ease(pr / 0.25) : pr < 0.42 ? -1 + 2 * ease((pr - 0.25) / 0.17) : 1 - ease((pr - 0.42) / 0.58), strike = bump(pr, 0.25, 0.58);
    o.dx += f < 0 ? 4 * f : 18 * f; o.lean += f < 0 ? 0.1 * f : 0.2 * f; o.sy *= f < 0 ? 1 + 0.1 * f : 1 + 0.05 * f; o.sx *= f < 0 ? 1 - 0.08 * f : 1 - 0.04 * f;
    if (rig.kind === "critter" || rig.kind === "slime") o.lift += 7 * strike;
    const ex = (ATK_PART[rig.kind] || ATK_PART.slime)(strike); for (const [id, v] of Object.entries(ex)) o.parts[id] = { ...(o.parts[id] || {}), ...v, r: (o.parts[id]?.r || 0) + (v.r || 0) };
  }
  // hit: knocked back, squashed
  if (a.hit > 0) { o.dx -= 7 * a.hit; o.sy *= 1 - 0.12 * a.hit; o.sx *= 1 + 0.12 * a.hit; o.lean -= 0.12 * a.hit; }
  const born = s.born ?? 1, pop = born < 1 ? 0.55 + 0.45 * (1 + 2.7 * Math.pow(born - 1, 3) + 1.7 * Math.pow(born - 1, 2)) : 1, dead = s.dead || 0, blink = (((s.t * 0.27 + (s.id || 0) * 0.37) % 1) < 0.035) && !dead;
  if (dead) { const e = ease(clamp(dead, 0, 1)); o.sy *= 1 - 0.82 * e; o.sx *= 1 + 0.4 * e; o.lean += 0.55 * e * (rig.kind === "slime" || rig.kind === "golem" ? 0 : 1); o.lift *= 1 - e; }
  { const lf = clamp(o.lift / 14, 0, 1), fade = dead ? clamp(1 - dead, 0, 1) : clamp((s.born ?? 1) * 1.6, 0, 1); c.save(); c.globalAlpha = 0.3 * (1 - lf * 0.45) * fade; c.fillStyle = "#1e1828"; c.beginPath(); c.ellipse(s.x - (s.face || 1) * o.dx * k * 0.3, s.y - 2, sz * 0.36 * (1 - lf * 0.22) * (1 + 0.1 * (o.sx - 1) * 4), sz * 0.1 * (1 - lf * 0.2), 0, 0, 6.3); c.fill(); c.restore(); }
  c.save(); c.translate(s.x, s.y); c.scale(s.face || 1, 1); c.translate(-sz / 2, -sz + 4); c.scale(k, k);
  c.globalAlpha *= dead ? clamp(1 - dead * dead, 0, 1) : clamp(born * 1.6, 0, 1);
  c.translate(50 + o.dx, 94 - o.lift); c.rotate(o.lean); c.scale(o.sx * pop, o.sy * pop); c.translate(-50, -94);
  const passes = s.flash > 0.02 ? 2 : 1;
  for (let pass = 0; pass < passes; pass++) {
    for (const p of rig.parts) {
      const q = o.parts[p.id] || {}, img = pass ? flashOf(p) : (p.face && blink && p.canvasB) || p.canvas; c.save();
      if (pass) c.globalAlpha *= clamp(s.flash, 0, 1) * 0.6;
      c.translate(p.pivot[0] + (q.dx || 0), p.pivot[1] + (q.dy || 0)); if (q.r) c.rotate(q.r); c.translate(-p.pivot[0], -p.pivot[1]);
      if ((rig.kind === "slime" && p.id === "body") || (rig.kind === "spirit" && p.id === "body")) strips(c, img, rig.kind === "slime" ? 12 : 14, rig.kind === "slime" ? (tf) => o.wob * tf * tf * 4 : (tf, y) => Math.sin(a.t * 3.1 + y * 0.09) * o.wave * Math.max(0, (y - 38) / 56) ** 1.4 - 0.0);
      else c.drawImage(img, 0, 0, 100, 100);
      c.restore();
    }
  }
  c.restore();
}
/** draw a 100x100 box image as horizontal strips, each shifted sideways (jelly wobble / tail wave); off(tFromBottomToTop 0..1 at the top, boxY) -> px */
function strips(c, img, n, off) {
  const ih = img.height, sh = ih / n, dh = 100 / n;
  for (let i = 0; i < n; i++) { const y = i * dh, tf = 1 - (i + 0.5) / n, last = i === n - 1; c.drawImage(img, 0, i * sh, img.width, last ? ih - i * sh : Math.min(sh + 1.5, ih - i * sh), off(tf, y + dh / 2), y, 100, last ? dh : dh + 0.8); }
}
