// Animated environment, shared by every map: wind, swaying trees / bushes / grass, moving shadows, flowing water, falling leaves, snow, fog.
// Everything except a prop's "kick" (lean away from the hero) is a pure function of time, so it costs no per-frame state and survives any frame rate.
const TAU = Math.PI * 2;
const mk = (w, h) => { if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h); const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hh = (a, b, s = 0) => { let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967295; };

/** travelling gust: -1..1, moves across the map like real wind (not the same phase everywhere) */
export const windAt = (x, y, t) => 0.5 * Math.sin(t * 0.9 - x * 0.006 + y * 0.0025) + 0.32 * Math.sin(t * 1.9 - x * 0.013 + 1.7) + 0.18 * Math.sin(t * 3.4 + x * 0.021);

/** sway profile by sprite name: a = sway of the top as a fraction of the sprite height, n = bend strips, r = leaf rustle */
export function swayOf(name = "") {
  if (/^(tree_pine|pine_)/.test(name)) return { a: 0.016, n: 9, r: 0.5 };
  if (/willow/.test(name)) return { a: 0.05, n: 12, r: 0.9 };
  if (/(dead_tree|ancient)/.test(name)) return { a: 0.008, n: 8, r: 0.1 };
  if (/^tree_/.test(name)) return { a: 0.03, n: 10, r: 1 };
  if (/^bush_|^shrub_/.test(name)) return { a: 0.05, n: 5, r: 1.2 };
  if (/^(plant_|grass_|reed_|pampas_|bamboo_|flower_)/.test(name)) return { a: 0.11, n: 4, r: 1 };
  if (name === "leaf_pile") return { a: 0.02, n: 2, r: 1 };
  return null;
}
export function shadowKindOf(name = "") {
  if (/^(tree_|pine_|willow|dead_tree|ancient)/.test(name)) return "tree";
  if (/^(rock_big|rock_tall|rock_cluster|rock_m|boulder|crystal_|ruin_|torii|lantern_|pagoda|shrine|wreck|ore_)/.test(name)) return "rock";
  if (/^(bush_|stump|log|mushroom_big|rock_s|rock_flat)/.test(name)) return "blob";
  return null;
}

// ------------------------------------------------------------------ silhouettes + strip bending
const silCache = new WeakMap();
function silhouette(img) {
  let s = silCache.get(img); if (s) return s;
  const iw = img.width, ih = img.height, k = Math.min(1, 110 / Math.max(iw, ih)), w = Math.max(2, Math.round(iw * k)), h = Math.max(2, Math.round(ih * k)), c = mk(w, h), x = c.getContext("2d");
  x.drawImage(img, 0, 0, w, h); x.globalCompositeOperation = "source-in"; x.fillStyle = "#1a1424"; x.fillRect(0, 0, w, h); silCache.set(img, c); return c;
}
/** draw img (w x h, pivot bottom-centre at the origin) as n horizontal strips; off(t) = sideways shift of a strip, t = 0 at the root .. 1 at the top */
function strips(c, img, w, h, n, off) {
  const iw = img.width, ih = img.height, sh = ih / n, dh = h / n;
  for (let i = 0; i < n; i++) { const t = 1 - (i + 0.5) / n, last = i === n - 1, sy = i * sh, sH = last ? ih - sy : Math.min(sh + 1.2, ih - sy); c.drawImage(img, 0, sy, iw, sH, -w / 2 + off(t), -h + i * dh, w, dh * sH / sh); }
}
function swayFn(pr, time, kick = 0, shake = 0) {
  const sw = pr.sway, f = pr.flip ? -1 : 1, A = sw.a * pr.h, ph = pr.ph || 0, wd = windAt(pr.x, pr.y, time + ph * 0.15), lean = 0.3 + 0.7 * wd;
  return (t) => f * A * (lean * Math.pow(t, 1.7) + 0.12 * sw.r * Math.sin(time * 3.3 + ph + t * 5) * Math.pow(t, 2.5) + 1.6 * kick * Math.pow(t, 1.3) + 0.9 * shake * Math.sin(time * 32) * t * t);
}

/** a prop: swaying if it has a sway profile (trees bend from the root, bushes and grass lean away from the hero) */
export function drawProp(c, pr, time, dt, hero) {
  if (pr.sway === undefined) pr.sway = swayOf(pr.name);
  c.save(); c.translate(pr.x, pr.y); if (pr.flip) c.scale(-1, 1);
  const sw = pr.sway;
  if (!sw) c.drawImage(pr.sprite, -pr.w / 2, -pr.h, pr.w, pr.h);
  else {
    let target = 0; if (hero && sw.n <= 5) { const r = pr.w * 0.45 + 26, dx = pr.x - hero.x, dy = pr.y - hero.y; if (Math.abs(dx) < r && Math.abs(dy) < 34) target = clamp(dx / r, -1, 1) * (1 - Math.abs(dx) / r) * 1.6; }
    pr.k = (pr.k || 0) + (target - (pr.k || 0)) * Math.min(1, dt * 9); if (pr.shake > 0) pr.shake = Math.max(0, pr.shake - dt * 1.3);
    strips(c, pr.sprite, pr.w, pr.h, sw.n, swayFn(pr, time, pr.k, pr.shake || 0));
  }
  c.restore();
}

// ------------------------------------------------------------------ shadows (they follow the sun and sway with the canopy)
const inView = (pr, v, padX = 160, padT = 80, padB = 260) => pr.x > v.x0 - padX && pr.x < v.x1 + padX && pr.y > v.y0 - padT && pr.y < v.y1 + padB;
export function drawShadows(c, world, time, view, sun, isHidden) {
  if (sun.a < 0.02) return;
  c.save();
  for (const pr of world.props) {
    if (pr.shk === undefined) pr.shk = shadowKindOf(pr.name); if (!pr.shk || !inView(pr, view)) continue; if (pr.node && isHidden?.(pr)) continue;
    const flick = 0.9 + 0.1 * Math.sin(time * 1.7 + (pr.ph || 0));
    if (pr.shk === "blob") { c.globalAlpha = sun.a * 0.2; c.fillStyle = "#1a1424"; c.beginPath(); c.ellipse(pr.x + sun.shx * pr.h * 0.25, pr.y - 1, pr.w * 0.42, Math.max(5, pr.h * 0.09), 0, 0, TAU); c.fill(); continue; }
    if (pr.sway === undefined) pr.sway = swayOf(pr.name);
    const L = pr.shk === "tree" ? 1 : 0.55; c.save(); c.translate(pr.x, pr.y); c.transform(1, 0, sun.shx * L, -sun.shy * L, 0, 0); if (pr.flip) c.scale(-1, 1);
    c.globalAlpha = sun.a * (pr.shk === "tree" ? 0.32 : 0.26) * flick; const sil = silhouette(pr.sprite);
    if (pr.sway && pr.shk === "tree") strips(c, sil, pr.w, pr.h, pr.sway.n, swayFn(pr, time, 0, pr.shake || 0)); else c.drawImage(sil, -pr.w / 2, -pr.h, pr.w, pr.h);
    c.restore();
  }
  c.restore();
}
/** shadow for a big static sprite (house, facility, cart): img = canvas, drawn with its pivot (x, y) at the bottom centre */
export function drawSilShadow(c, img, x, y, w, h, sun, len = 0.5) {
  if (sun.a < 0.02) return; c.save(); c.translate(x, y); c.transform(1, 0, sun.shx * len, -sun.shy * len, 0, 0); c.globalAlpha = sun.a * 0.26; c.drawImage(silhouette(img), -w / 2, -h, w, h); c.restore();
}

// ------------------------------------------------------------------ meadow grass
export function drawGrass(c, world, time, view) {
  const T = world.tile, g = world.grass; if (!g) return; const cols = world.cols, rows = world.rows, c0 = Math.max(0, Math.floor(view.x0 / T)), c1 = Math.min(cols - 1, Math.floor(view.x1 / T)), r0 = Math.max(0, Math.floor(view.y0 / T)), r1 = Math.min(rows - 1, Math.floor(view.y1 / T) + 1);
  const paths = {};
  c.save(); c.lineCap = "round"; c.lineWidth = 1.7; c.globalAlpha = 0.62;
  for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) {
    const spec = g[world.tiles[r * cols + cc]]; if (!spec) continue;
    for (let i = 0; i < spec[2]; i++) {
      const px = (cc + hh(cc, r, i * 7 + 1)) * T, py = (r + hh(cc, r, i * 7 + 2)) * T, h = 9 + hh(cc, r, i * 7 + 3) * 8, wd = windAt(px, py, time), lean = (0.3 + 0.7 * wd) * 6.5, col = spec[hh(cc, r, i * 7 + 4) < 0.5 ? 0 : 1];
      const p = paths[col] || (paths[col] = new Path2D());
      for (let b = -1; b <= 1; b++) { const bx = px + b * 3.2, tip = bx + b * 3 + lean * (0.8 + 0.2 * b) + Math.sin(time * 2.6 + px * 0.2 + b) * 0.8; p.moveTo(bx, py); p.quadraticCurveTo(bx + b * 1.5 + lean * 0.35, py - h * 0.55, tip, py - h + Math.abs(b) * 2); }
    }
  }
  for (const col in paths) { c.strokeStyle = col; c.stroke(paths[col]); }
  c.restore();
}

// ------------------------------------------------------------------ water: flowing streaks, glints, ripple slots, lapping foam, lily pads
export function drawWater(c, world, time, view) {
  const T = world.tile, cols = world.cols, rows = world.rows, W = new Set(world.waterTypes || [4, 5, 7]), tiles = world.tiles, at = (cc, r) => (cc < 0 || r < 0 || cc >= cols || r >= rows ? -1 : tiles[r * cols + cc]), isW = (cc, r) => W.has(at(cc, r));
  const c0 = Math.max(0, Math.floor(view.x0 / T) - 1), c1 = Math.min(cols - 1, Math.floor(view.x1 / T) + 1), r0 = Math.max(0, Math.floor(view.y0 / T) - 1), r1 = Math.min(rows - 1, Math.floor(view.y1 / T) + 1), fl = world.flow || [1, 0];
  c.save(); c.lineCap = "round"; c.lineJoin = "round"; const tint = world.waterHi || "235,248,245";
  // 1. flowing streaks on a 128 x 52 lattice, positions advance along the flow
  for (let cy = Math.floor(view.y0 / 52) - 1; cy <= Math.floor(view.y1 / 52) + 1; cy++) for (let cx = Math.floor(view.x0 / 128) - 2; cx <= Math.floor(view.x1 / 128) + 2; cx++) for (let i = 0; i < 2; i++) {
    if (hh(cx, cy, i + 20) > 0.62) continue; const sp = 16 + hh(cx, cy, i + 21) * 34, len = 30 + hh(cx, cy, i + 22) * 46, ph = hh(cx, cy, i + 23) * TAU;
    const bx = cx * 128 + hh(cx, cy, i + 24) * 128, by = cy * 52 + hh(cx, cy, i + 25) * 52, pond = at(Math.floor(bx / T), Math.floor(by / T)) === 7, mv = pond ? 0 : 1, d = ((time * sp * mv + hh(cx, cy, i + 26) * 600) % 300) - 70;
    const x = bx + d * fl[0] + (pond ? Math.sin(time * 0.6 + ph) * 8 : 0), y = by + d * fl[1] + Math.sin(time * 0.9 + ph) * 2;
    const a = isW(Math.floor((x - len / 2) / T), Math.floor(y / T)), b = isW(Math.floor((x + len / 2) / T), Math.floor(y / T)), m = isW(Math.floor(x / T), Math.floor(y / T)); if (!m) continue;
    const fade = (a ? 1 : 0.35) * (b ? 1 : 0.35) * (0.55 + 0.45 * Math.sin(time * 1.1 + ph)); if (x < view.x0 - 80 || x > view.x1 + 80 || y < view.y0 - 20 || y > view.y1 + 20) continue;
    c.strokeStyle = `rgba(${tint},${0.1 * fade})`; c.lineWidth = 5; c.beginPath(); c.moveTo(x - len / 2, y); c.quadraticCurveTo(x, y + 3 * Math.sin(time * 1.2 + ph), x + len / 2, y); c.stroke();
    c.strokeStyle = `rgba(${tint},${0.5 * fade})`; c.lineWidth = 1.5; c.stroke();
  }
  // 2. per water tile: twinkling glints + expanding ripple slots + shoreline foam
  for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++) {
    if (!isW(cc, r)) continue; const x0 = cc * T, y0 = r * T, t = at(cc, r), calm = t === 7 ? 1 : 0;
    if (hh(cc, r, 5) < 0.7) { const per = 2.4 + hh(cc, r, 6) * 3, u = ((time + hh(cc, r, 7) * per * 4) / per) % 1; if (u < 0.34) { const k = Math.sin(u / 0.34 * Math.PI), gx = x0 + hh(cc, r, 8) * T, gy = y0 + hh(cc, r, 9) * T, s = 2 + 5 * k; c.strokeStyle = `rgba(255,255,240,${0.9 * k})`; c.lineWidth = 1.3; c.beginPath(); c.moveTo(gx - s, gy); c.lineTo(gx + s, gy); c.moveTo(gx, gy - s * 1.2); c.lineTo(gx, gy + s * 1.2); c.stroke(); c.fillStyle = `rgba(255,255,255,${k})`; c.beginPath(); c.arc(gx, gy, 1.3, 0, TAU); c.fill(); } }
    if (hh(cc, r, 10) < (calm ? 0.28 : 0.1)) { const per = 3.4 + hh(cc, r, 11) * 2, u = ((time + hh(cc, r, 12) * per * 5) / per) % 1, rx = 3 + u * 24, gx = x0 + (0.2 + hh(cc, r, 13) * 0.6) * T, gy = y0 + (0.2 + hh(cc, r, 14) * 0.6) * T; c.strokeStyle = `rgba(${tint},${(1 - u) * 0.55})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(gx, gy, rx, rx * 0.4, 0, 0, TAU); c.stroke(); }
    // shoreline foam: short broken dashes that lap in and out (never a continuous tile-aligned line, the ground bake is soft-edged)
    const edges = [[0, -1, x0, y0, x0 + T, y0], [0, 1, x0, y0 + T, x0 + T, y0 + T], [-1, 0, x0, y0, x0, y0 + T], [1, 0, x0 + T, y0, x0 + T, y0 + T]];
    for (let e = 0; e < 4; e++) {
      const [dx, dy, ax, ay, bx, by] = edges[e]; if (isW(cc + dx, r + dy) || at(cc + dx, r + dy) === -1) continue;
      for (let i = 0; i < 2; i++) {
        const ph = hh(cc, r, 40 + e * 3 + i) * TAU, k = 0.5 + 0.5 * Math.sin(time * (calm ? 0.9 : 1.4) + ph), u = 0.18 + hh(cc, r, 50 + e * 3 + i) * 0.64, len = 9 + hh(cc, r, 60 + e * 3 + i) * 11;
        const px = ax + (bx - ax) * u + dx * -(4 + 5 * k) - dx * 0, py = ay + (by - ay) * u + dy * -(4 + 5 * k), tx = dy ? 1 : 0, ty = dx ? 1 : 0;
        c.strokeStyle = `rgba(255,255,255,${(calm ? 0.12 : 0.2) + 0.2 * k * (1 - 0.4 * k)})`; c.lineWidth = 1.8; c.beginPath(); c.moveTo(px - tx * len / 2, py - ty * len / 2); c.quadraticCurveTo(px + dy * 1.5, py + dx * 1.5 + Math.sin(time * 2 + ph) * 1.2, px + tx * len / 2, py + ty * len / 2); c.stroke();
      }
    }
  }
  // 3. foam slots around stepping stones
  for (const pr of world.props) { if (pr.kind !== "river_rock" || !inView(pr, view, 60, 40, 60)) continue; const k = 0.5 + 0.5 * Math.sin(time * 1.8 + (pr.ph || pr.uid)); c.strokeStyle = `rgba(255,255,255,${0.25 + 0.3 * k})`; c.lineWidth = 2; c.beginPath(); c.ellipse(pr.x, pr.y - 3, pr.w * 0.42 + 3 * k, pr.w * 0.14 + 1.5 * k, 0, 0, TAU); c.stroke(); }
  // 4. lily pads bob on ponds
  for (const l of world.lilies || []) { if (l.x < view.x0 - 40 || l.x > view.x1 + 40 || l.y < view.y0 - 40 || l.y > view.y1 + 40) continue; c.save(); c.translate(l.x, l.y + Math.sin(time * 0.9 + l.ph) * 1.6); c.rotate(Math.sin(time * 0.5 + l.ph) * 0.12 + l.rot); c.scale(1, 0.48);
    c.fillStyle = "#4f8f4e"; c.strokeStyle = "#2f5f3a"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, l.r, 0.45, TAU - 0.15); c.lineTo(0, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(-l.r * 0.2, -l.r * 0.25, l.r * 0.45, 0, TAU); c.fill();
    if (l.flower) { c.fillStyle = "#f4b9d0"; c.strokeStyle = "#c06c8a"; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * TAU); c.beginPath(); c.ellipse(0, -l.r * 0.32, l.r * 0.17, l.r * 0.34, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); } c.fillStyle = "#f6dc7a"; c.beginPath(); c.arc(0, 0, l.r * 0.15, 0, TAU); c.fill(); }
    c.restore(); }
  c.restore();
}

// ------------------------------------------------------------------ falling leaves / petals / snow / embers (screen-wrapped, stateless)
export function leafPath(c, s = 1) { c.beginPath(); c.moveTo(-6 * s, 0); c.quadraticCurveTo(-1 * s, -4.6 * s, 6.4 * s, -0.6 * s); c.quadraticCurveTo(0, 4.4 * s, -6 * s, 0); c.closePath(); }
export function drawLeaf(c, x, y, rot, s, col, flip = 1) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(flip, 1); c.fillStyle = col; leafPath(c, s); c.fill(); c.strokeStyle = "rgba(60,30,20,.45)"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-5 * s, 0); c.lineTo(5 * s, -0.4 * s); c.stroke(); c.restore(); }
export function drawAmbient(c, time, view, amb) {
  if (!amb) return; const W = view.x1 - view.x0, H = view.y1 - view.y0; c.save();
  const N = amb.count ?? 26, cols = amb.leaves, mode = amb.mode || "leaf";
  for (let i = 0; i < N; i++) {
    const P = (mode === "snow" ? 6 : 9) + (i % 7) * 1.7, u = ((time + i * 1.37) / P) % 1, y = -30 + u * (H + 60), drift = (mode === "snow" ? 10 : 18) + (i % 4) * 8, g = 0.6 + 0.5 * (0.5 + 0.5 * windAt(i * 50, i * 20, time));
    let x = (hh(i, 1) * (W + 200) + time * drift) % (W + 200) - 100 + Math.sin(time * 1.3 + i) * 16 * g, px = view.x0 + x, py = view.y0 + y; const dep = 0.7 + (i % 3) * 0.25;
    if (mode === "snow") { c.globalAlpha = 0.85; c.fillStyle = "#fff"; c.beginPath(); c.arc(px, py, 1.4 + (i % 3) * 0.7, 0, TAU); c.fill(); continue; }
    if (mode === "ember") { const yy = view.y0 + H + 20 - u * (H + 50); c.globalAlpha = 0.8 * (1 - u); c.fillStyle = i % 3 ? "#ff8a3a" : "#ffd27a"; c.beginPath(); c.arc(px, yy, 1.4 + (i % 2), 0, TAU); c.fill(); continue; }
    c.globalAlpha = 0.78; drawLeaf(c, px, py, time * (0.8 + (i % 3) * 0.4) + i, dep * (mode === "petal" ? 0.7 : 1), cols[i % cols.length], Math.cos(time * 2.2 + i));
  }
  c.restore();
}
const LEAF_WAY = { orange_light: "#eaa04a", orange_dark: "#d2742c", peach: "#f0b48a", rust: "#b5532f", olive: "#8e9a4a", gold: "#e3b83a", crimson: "#b33a3a", plum: "#8a4a6a", pink: "#f3b4cb", green: "#7fb05a" };
export const leafColourOf = (name) => { for (const k in LEAF_WAY) if (name.includes(k)) return LEAF_WAY[k]; return /sakura|blossom/.test(name) ? LEAF_WAY.pink : /green|lime/.test(name) ? LEAF_WAY.green : "#d99a44"; };
/** broadleaf trees shed a few leaves that drift to the ground */
export function drawTreeLeaves(c, world, time, view, isHidden) {
  let n = 0; c.save();
  for (const pr of world.props) {
    if (!/^tree_(round|dark|bonsai|blossom|amber|fruit|orange|red|sakura|purple|green|lime|gold)/.test(pr.name) || !inView(pr, view, 40, 160, 40)) continue; if (pr.node && isHidden?.(pr)) continue; if (++n > 28) break; const col = leafColourOf(pr.name);
    for (let k = 0; k < 2; k++) {
      const P = 7 + hh(pr.uid, k, 3) * 5, u = ((time + hh(pr.uid, k, 4) * P * 3) / P) % 1, g = 0.4 + 0.6 * (0.5 + 0.5 * windAt(pr.x, pr.y, time)), x0 = pr.x + (hh(pr.uid, k, 5) - 0.5) * pr.w * 0.5, y0 = pr.y - pr.h * (0.5 + 0.3 * hh(pr.uid, k, 6));
      c.globalAlpha = u < 0.08 ? u / 0.08 : u > 0.88 ? (1 - u) / 0.12 : 1; drawLeaf(c, x0 + 34 * u * g + 9 * Math.sin(u * 9 + k * 3), y0 + Math.pow(u, 1.25) * (pr.y - 6 - y0), time * 1.5 + u * 8 + k, 0.7, col, Math.cos(time * 2.4 + u * 7));
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ drifting fog / cloud shadows (soft blobs in world space)
const blobGrad = new Map();
function blobFor(c, rgb) { let g = blobGrad.get(rgb); if (!g) { g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.55, `rgba(${rgb},.55)`); g.addColorStop(1, `rgba(${rgb},0)`); blobGrad.set(rgb, g); } return g; }
export function drawBlobs(c, world, time, view, { n = 12, rgb = "235,240,245", a = 0.22, speed = 8, rx = 340, ry = 150, seed = 1, wob = 30 } = {}) {
  const WW = world.width, WH = world.height; c.save(); c.fillStyle = blobFor(c, rgb);
  for (let i = 0; i < n; i++) {
    const sx = rx * (0.7 + hh(i, seed, 1) * 0.7), sy = ry * (0.7 + hh(i, seed, 2) * 0.7), x = (hh(i, seed, 3) * (WW + sx * 2) + time * speed * (0.6 + hh(i, seed, 4) * 0.8)) % (WW + sx * 2) - sx, y = hh(i, seed, 5) * WH + Math.sin(time * 0.12 + i) * wob;
    if (x + sx < view.x0 || x - sx > view.x1 || y + sy < view.y0 || y - sy > view.y1) continue; c.globalAlpha = a * (0.65 + 0.35 * Math.sin(time * 0.25 + i * 2.1)); c.save(); c.translate(x, y); c.scale(sx, sy); c.fillRect(-1, -1, 2, 2); c.restore();
  }
  c.restore();
}
