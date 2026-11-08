// Merzkava Pocket - Human Chibi Character Base (pxl source of truth).
// Rendering recipe: the Pocket 48x64 human chibi, 3-4 tone cel shading with hue-shifted ramps,
// selective outline (pxl `selout`), crisp pixel clusters. Human anatomy only: no ears, no tail.
// Contract (docs/design/CHARACTER_PIXEL_BASE_EIGHT_DIRECTIONS.md):
//   cell 48x64, centreline x=24, foot anchor y=62, eight REAL directions (no mirroring),
//   idle = 4 frames, walk = 8 frames (contact, down, passing, up, then the opposite leg),
//   5 hairstyles x 5 outfits on one shared body.
// Output names: human_<hair>_<outfit>_<idle|walk>_<n|ne|e|se|s|sw|w|nw>
//               human_preview_hair_<hair>, human_preview_outfit_<outfit>
const W = 48, H = 64, CX = 24, FOOT = 62, N = W * H;
const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
// Heading in degrees: 0 faces the camera (s), 90 faces screen-right (e), 180 faces away (n).
const HEADING = { s: 0, se: 45, e: 90, ne: 135, n: 180, nw: 225, w: 270, sw: 315 };

const HAIR = [
  { id: "long_black", name: "Long Straight", kind: "long" },
  { id: "soft_bob", name: "Soft Bob", kind: "bob" },
  { id: "half_up", name: "Half-up Knot", kind: "halfup" },
  { id: "high_tie", name: "High Tie", kind: "hightie" },
  { id: "long_waves", name: "Long Waves", kind: "waves" }
];
// hem = half width of the robe hem (front view); sleeve = cuff width; extra = signature layer.
const OUTFITS = [
  { id: "black_hanfu", name: "Black Hanfu", hem: 13.5, sleeve: 7.2, extra: "none" },
  { id: "ivory_layers", name: "Ivory Layers", hem: 13.0, sleeve: 6.6, extra: "layers" },
  { id: "jade_scholar", name: "Jade Scholar", hem: 12.0, sleeve: 6.8, extra: "scholar" },
  { id: "rose_ceremony", name: "Rose Ceremony", hem: 15.0, sleeve: 8.4, extra: "mantle" },
  { id: "traveller_robe", name: "Traveller Robe", hem: 11.8, sleeve: 5.4, extra: "strap" }
];
// yb = lowest hair row, side = side-lock length below the head centre.
const HAIRP = {
  long: { yb: 44, side: 17, fringe: "hime" },
  bob: { yb: 29, side: 9, fringe: "blunt" },
  halfup: { yb: 42, side: 18, fringe: "part" },
  hightie: { yb: 0, side: 9, fringe: "swept" },
  waves: { yb: 46, side: 19, fringe: "side" }
};

// Shared colours. Skin, hair and face details are the same for every outfit.
const BASE_PAL = {
  K: "#1d1620",
  Z: "#84504e", T: "#b06f5e", s: "#d99a78", S: "#f0c19f", z: "#ffe2c8",
  h: "#241b27", H: "#3d303f", I: "#5f4c5d", i: "#93798a",
  e: "#2b1c27", o: "#a8603f", w: "#fff3e4", B: "#ee9a96", m: "#a85a5a",
  q: "#1d162070"
};
// Per-outfit colours. d c D C = cloth dark..light, y g G Y = trim, r R = sash, a A = lining.
const OUTFIT_PAL = {
  black_hanfu: { d: "#1a1724", c: "#2a2740", D: "#3f3b5b", C: "#615b86", y: "#5e4527", g: "#9b7a43", G: "#d5b477", Y: "#f3dfa6", a: "#6f7d8c", A: "#b9c3cc", r: "#6a1e32", R: "#9c3550" },
  ivory_layers: { d: "#aaa08e", c: "#d3c9b4", D: "#e8dfca", C: "#f6eedc", y: "#3f6254", g: "#6d8b7e", G: "#a8c1ab", Y: "#d3e4d2", a: "#8f7d6a", A: "#c9bda8", r: "#5a7a6b", R: "#86a897" },
  jade_scholar: { d: "#22352f", c: "#3d5a4f", D: "#5c7b6b", C: "#7c977f", y: "#6a5028", g: "#9d8351", G: "#d3b87c", Y: "#efdba4", a: "#4b655c", A: "#a8baa2", r: "#4a2a30", R: "#7d4a52" },
  rose_ceremony: { d: "#52333f", c: "#77505c", D: "#9a6270", C: "#b97f87", y: "#6e4f2d", g: "#ae8a58", G: "#e1c48e", Y: "#f6e3b8", a: "#a58a89", A: "#e0c2b3", r: "#6b2a3c", R: "#9d4a5b" },
  traveller_robe: { d: "#3a3629", c: "#5a4c38", D: "#786a48", C: "#9a8058", y: "#5a4126", g: "#a1814b", G: "#d2b779", Y: "#ecd9a3", a: "#5e6c5b", A: "#a8b098", r: "#5a3a2a", R: "#85583f" }
};
const setPalette = outfit => pal({ ...BASE_PAL, ...OUTFIT_PAL[outfit] });

// Part ramps: hi = lit rim, base, sh = shadow band, deep = last pixel of the shadow, line = inner separator,
// outer = silhouette outline (warm brown on skin, deep ink elsewhere; never pure black).
const SPEC = {
  skin: { hi: "z", base: "S", sh: "s", deep: "T", line: "T", outer: "Z" },
  hair: { hi: "I", base: "H", sh: "h", deep: "h", line: "h", outer: "K" },
  hairhl: { hi: "i", base: "I", sh: "I", deep: "I", line: "I", outer: "K" },
  hairlo: { hi: "h", base: "h", sh: "h", deep: "h", line: "h", outer: "K" },
  cloth: { hi: "C", base: "c", sh: "d", deep: "d", line: "d", outer: "K" },
  mantle: { hi: "C", base: "D", sh: "c", deep: "d", line: "d", outer: "K" },
  trim: { hi: "Y", base: "G", sh: "g", deep: "y", line: "y", outer: "K" },
  sash: { hi: "R", base: "r", sh: "r", deep: "r", line: "K", outer: "K" },
  lining: { hi: "A", base: "A", sh: "a", deep: "a", line: "a", outer: "K" },
  leather: { hi: "A", base: "a", sh: "a", deep: "a", line: "K", outer: "K" },
  shoe: { hi: "I", base: "h", sh: "h", deep: "K", line: "K", outer: "K" },
  sock: { hi: "A", base: "A", sh: "a", deep: "a", line: "a", outer: "K" }
};

// ---------------------------------------------------------------- masks ---
const r3 = v => Math.round(v * 1000) / 1000;
const lerp = (a, b, t) => a + (b - a) * t;
const newMask = () => new Uint8Array(N);
function mEll(cx, cy, rx, ry) {
  const m = newMask();
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(H - 1, Math.ceil(cy + ry)); y++)
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(W - 1, Math.ceil(cx + rx)); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m[y * W + x] = 1;
    }
  return m;
}
function mRect(x0, y0, x1, y1) {
  const m = newMask();
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++)
      if (x + 0.5 >= x0 && x + 0.5 < x1 && y + 0.5 >= y0 && y + 0.5 < y1) m[y * W + x] = 1;
  return m;
}
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function mPoly(pts) {
  const m = newMask();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
      let hit = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++)
        if (inPoly(pts, x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) hit++;
      if (hit >= 5) m[y * W + x] = 1;
    }
  return m;
}
function mLine(x0, y0, x1, y1) {
  const m = newMask(), n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(x0 + (x1 - x0) * i / n), y = Math.floor(y0 + (y1 - y0) * i / n);
    if (x >= 0 && x < W && y >= 0 && y < H) m[y * W + x] = 1;
  }
  return m;
}
const mAnd = (a, b) => { const m = newMask(); for (let i = 0; i < N; i++) m[i] = a[i] & b[i]; return m; };
const mOr = (a, b) => { const m = newMask(); for (let i = 0; i < N; i++) m[i] = a[i] | b[i]; return m; };
const mSub = (a, b) => { const m = newMask(); for (let i = 0; i < N; i++) m[i] = a[i] & (b[i] ? 0 : 1); return m; };

// -------------------------------------------------------------- painter ---
// Parts are painted back to front; each pixel keeps the id of the last part on it.
function Painter() {
  const P = new Int16Array(N), specs = [null], dots = [];
  return {
    paint(mask, ramp, o = {}) {
      const id = specs.length;
      specs.push({ r: SPEC[ramp], shade: o.shade === undefined ? 2 : o.shade, inline: o.inline !== false, lc: o.lc, band: o.band || 2 });
      for (let i = 0; i < N; i++) if (mask[i]) P[i] = id;
      return id;
    },
    dot(x, y, key, id) { dots.push([x, y, key, id]); },
    flush(c) {
      const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : P[y * W + x];
      const out = new Array(N).fill(null);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const id = P[y * W + x];
        if (!id) continue;
        const sp = specs[id];
        let k = sp.r.base;
        if (sp.shade >= 1) {
          if (at(x - 1, y - 1) === 0) k = sp.r.hi;
          if (at(x + sp.band, y + sp.band) !== id) k = sp.r.sh;
        }
        if (sp.shade >= 2 && at(x + 1, y + 1) !== id) k = sp.r.deep;
        if (sp.inline) {
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nb = at(x + d[0], y + d[1]);
            if (nb && nb < id) { k = sp.lc || sp.r.line; break; }
          }
        }
        out[y * W + x] = k;
      }
      for (const d of dots) if (at(d[0], d[1]) === d[3]) out[d[1] * W + d[0]] = d[2];
      // selective silhouette outline: an empty pixel beside a part takes the outer key of the topmost neighbour
      const ring = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (P[y * W + x]) continue;
        let top = 0;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) top = Math.max(top, at(x + d[0], y + d[1]));
        if (top) ring.push([x, y, specs[top].r.outer]);
      }
      for (const q of ring) out[q[1] * W + q[0]] = q[2];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y * W + x]) c.px(x, y, out[y * W + x]);
    }
  };
}

// ----------------------------------------------------------------- pose ---
function gaitPose(move, f, as) {
  if (move === "walk") {
    // Eight steps: 0 passing(L up) 1 down 2 contact(L fwd) 3 settle, 4..7 the same for the right leg.
    const ph = f / 8 * Math.PI * 2, S = Math.sin(ph), C = Math.cos(ph);
    const stride = 1.6 + 3.6 * as, arm = 1.0 + 2.6 * as;
    return {
      dy: [-1, -1, 0, 0, -1, -1, 0, 0][f], zL: stride * S, zR: -stride * S,
      liftL: Math.round(2 * Math.max(0, C)), liftR: Math.round(2 * Math.max(0, -C)),
      armL: -arm * S, armR: arm * S,
      hem: Math.round(1.3 * Math.sin(ph - 0.9)), hair: Math.round(1.2 * Math.sin(ph - 1.3))
    };
  }
  const k = f % 4;
  return { dy: [0, 0, 1, 0][k], zL: 0, zR: 0, liftL: 0, liftR: 0, armL: 0, armR: 0, hem: [0, 1, 0, -1][k] * 0 + [0, 0, 1, 0][k], hair: [0, 0, 1, 1][k] };
}

// ----------------------------------------------------------- the figure ---
function drawHuman(c, hair, outfit, dir, move, f) {
  groundShadow(c);
  const th = HEADING[dir] * Math.PI / 180, s = r3(Math.sin(th)), cs = r3(Math.cos(th));
  const ac = Math.abs(cs), as = Math.abs(s), cp = Math.max(cs, 0);
  const front = cs > -0.2;
  const pz = gaitPose(move, f, as);
  const dy = pz.dy, hy = 15 + dy, sway = pz.hem, hsw = pz.hair;
  const HP = HAIRP[hair.kind];
  const p = Painter();
  const proj = (bx, bz) => CX + bx * cs + bz * s;     // screen x of a body-frame point
  const depth = (bx, bz) => bz * cs - bx * s;         // larger = nearer the camera

  // ---- hair behind the body (front-facing views)
  const hairMass = (hxc, hw, hsw2) => {
    if (HP.yb === 0) return null;
    if (hair.kind === "bob") return mOr(mRect(hxc - hw, hy + 2, hxc + hw, HP.yb - 3), mEll(hxc + hsw2 * 0.5, HP.yb - 3, hw, 3.4));
    const yb = HP.yb, z = hair.kind === "waves" ? 1.6 : 0;
    return mPoly([[hxc - hw, hy + 2], [hxc + hw, hy + 2], [hxc + hw, yb - 5],
      [hxc + hw * 0.72 + hsw2 * 0.5, yb - 1 - z], [hxc + hw * 0.34 + hsw2, yb + 1.5 + z], [hxc + hsw2 * 1.1, yb - 0.5 - z],
      [hxc - hw * 0.34 + hsw2, yb + 1.5 + z], [hxc - hw * 0.72 + hsw2 * 0.5, yb - 1 - z], [hxc - hw, yb - 5]]);
  };
  const tieTail = () => {                               // high_tie: short tail hanging from the crown
    const tx = front ? CX - 5.4 * s : CX - 2.2 * s;
    return mPoly([[tx - 2.2, hy - 9], [tx + 2.2, hy - 9], [tx + 2.8 + hsw, hy + 11], [tx + hsw, hy + 14], [tx - 2.8 + hsw, hy + 11]]);
  };
  const backMass = front ? hairMass(CX - 3.4 * s, lerp(6.2, 10.4, ac), hsw) : hairMass(CX - 2.6 * s, 10.4, hsw);
  if (front) {
    if (backMass) p.paint(backMass, "hair");
    if (hair.kind === "hightie") p.paint(tieTail(), "hair");
  }

  // ---- feet, far one first
  const feet = [{ bx: 3.5, z: pz.zL, lift: pz.liftL }, { bx: -3.5, z: pz.zR, lift: pz.liftR }]
    .map(q => ({ ...q, d: depth(q.bx, q.z) })).sort((a, b) => a.d - b.d);
  for (const q of feet) {
    const fx = proj(q.bx, q.z) + 0.6 * s, w = 4.6 + 2.4 * as;
    const up = q.lift + (q.z < 0 ? Math.round(-q.z * 0.3 * ac) : 0);
    const y0 = 60 - up;
    p.paint(mRect(fx - 1.5, y0 - 2, fx + 1.5, y0), "sock", { shade: 0 });
    p.paint(mPoly([[fx - w / 2, y0 + 1], [fx - w / 2 + 1, y0], [fx + w / 2 - 1, y0], [fx + w / 2, y0 + 1], [fx + w / 2, y0 + 3], [fx - w / 2, y0 + 3]]), "shoe");
  }

  // ---- arms (sleeve + hand + cuff trim). Far arm before the robe, near arm after it.
  const shY = 28 + dy, waY = 40 + dy;
  const tw = 4.8 + 4.8 * ac, ww = 4.4 + 3.8 * ac, hh = outfit.hem * (0.62 + 0.38 * ac);
  const arm = (bx, swing) => {
    const sx = proj(bx, swing), up = Math.round(Math.max(0, swing) * 0.4 * ac);
    const cy = 45.5 + dy - up, cw = outfit.sleeve * (0.78 + 0.22 * ac), lean = (bx > 0 ? 0.8 : -0.8) * ac;
    const sl = mPoly([[sx - 1.8, shY + 0.6], [sx + 1.8, shY + 0.6], [sx + cw / 2 + lean, cy], [sx - cw / 2 + lean, cy]]);
    return { d: depth(bx, swing), sx, cy, sl, hand: mRect(sx - 1.3 + lean, cy - 0.6, sx + 1.3 + lean, cy + 2.7), cuff: mAnd(sl, mRect(0, cy - 1.2, W, cy)) };
  };
  const paintArm = a => {
    p.paint(a.hand, "skin", { shade: 1, lc: "T" });
    p.paint(a.sl, "cloth");
    p.paint(a.cuff, "trim", { shade: 0, inline: false });
  };
  const arms = [arm(9.2, pz.armL), arm(-9.2, pz.armR)].sort((a, b) => a.d - b.d);
  const farBehind = as > 0.5 && arms[0].d < 0;
  if (farBehind) paintArm(arms[0]);

  // ---- robe (shoulders to hem), one shared construction; the outfit changes silhouette and trim
  const mid = lerp(ww, hh, 0.5), hemC = 58.8, hemE = outfit.extra === "strap" ? 57.2 : 58.0 - 0.6 * ac;
  const robe = mPoly([[CX - tw, shY], [CX + tw, shY], [CX + ww + 0.6, waY], [CX + mid + sway * 0.35, 50],
    [CX + hh + sway, hemE], [CX + hh * 0.5 + sway, hemC], [CX - hh * 0.5 + sway, hemC], [CX - hh + sway, hemE],
    [CX - mid + sway * 0.35, 50], [CX - ww - 0.6, waY]]);
  p.paint(robe, "cloth");
  p.paint(mAnd(robe, mRect(0, 57.9, W, 60)), "trim", { shade: 0, inline: false });          // hem band, one row
  // folds: a few light strokes on the lower robe
  const fold = (bx, y0, y1, key) => p.paint(mAnd(robe, mLine(proj(bx, 0) + sway * 0.4, y0, proj(bx, 0) + sway, y1)), key, { shade: 0, inline: false });
  if (ac > 0.3) { fold(-hh * 0.46, 46, 55, "mantle"); fold(hh * 0.28, 47, 55, "cloth"); fold(hh * 0.62, 47, 54, "cloth"); }
  else fold(0, 46, 55, "mantle");

  if (front) p.paint(mRect(CX - 1.6, 24 + dy, CX + 1.6, 29 + dy), "skin", { shade: 1, lc: "T" });   // neck 3 px

  // ---- outfit layers
  if (outfit.extra === "layers") {
    const vest = mPoly([[CX - tw + 0.5, shY + 1], [CX + tw - 0.5, shY + 1], [CX + ww + 1, waY], [CX + mid, 51], [CX - mid, 51], [CX - ww - 1, waY]]);
    p.paint(vest, "mantle");
    p.paint(mAnd(vest, mRect(0, 49.5, W, 52)), "trim", { shade: 0, inline: false });
  }
  if (outfit.extra === "scholar" && front && cs > 0.15)
    p.paint(mAnd(robe, mLine(proj(0, 4.8) + 0.3 * s, 30 + dy, proj(0, 4.8) + 0.3 * s + sway, 57)), "trim", { shade: 0, inline: false });
  if (outfit.extra === "strap") {
    const bz = front ? 4.4 : -4.4;
    p.paint(mAnd(robe, mOr(mLine(proj(5, bz), 29 + dy, proj(-5, bz), 42 + dy), mLine(proj(5, bz) + 1, 29 + dy, proj(-5, bz) + 1, 42 + dy))), "leather", { shade: 1, lc: "K" });
    p.paint(mRect(proj(-6.5, bz * 0.6) - 1.6, 46 + dy, proj(-6.5, bz * 0.6) + 1.6, 50 + dy), "leather", { shade: 1 });   // hip pouch
  }

  // ---- sash, knot, streamers (front) or bow (back)
  const sash = mPoly([[CX - ww - 1.0, waY - 1.2], [CX + ww + 1.0, waY - 1.2], [CX + ww + 1.6, waY + 2.6], [CX - ww - 1.6, waY + 2.6]]);
  p.paint(sash, "sash");
  if (front) {
    const kx = CX + 4.4 * s + 0.6;
    for (const off of [-1.3, 1.3])
      p.paint(mPoly([[kx + off - 0.9, waY + 2.4], [kx + off + 0.9, waY + 2.4], [kx + off + 1.3 + sway * 0.5, 52], [kx + off - 0.7 + sway * 0.5, 53.5]]), "sash");
    p.paint(mRect(kx - 1.5, waY - 0.8, kx + 1.5, waY + 2.4), "trim");
  } else {
    const bx = CX - 4.4 * s;
    for (const off of [-1.6, 1.6])
      p.paint(mPoly([[bx + off - 1.0, waY + 2.4], [bx + off + 1.0, waY + 2.4], [bx + off + 1.3 + sway * 0.5, 52.5], [bx + off - 0.8 + sway * 0.5, 53.5]]), "sash");
    p.paint(mPoly([[bx - 5.4, waY - 2.2], [bx - 0.8, waY + 0.5], [bx - 5.4, waY + 3.2]]), "sash");
    p.paint(mPoly([[bx + 5.4, waY - 2.2], [bx + 0.8, waY + 0.5], [bx + 5.4, waY + 3.2]]), "sash");
    p.paint(mRect(bx - 1.3, waY - 0.6, bx + 1.3, waY + 2.0), "trim");
  }

  // ---- collar / crossed lapels
  if (front && cs > 0.15) {
    const k = 0.35 + 0.65 * cs, x0 = CX + 3.2 * s;
    p.paint(mPoly([[x0 + 4.4 * k, shY + 0.4], [x0 + 1.9 * k, shY + 0.4], [x0 - 1.2 * k, waY - 0.6], [x0 + 0.6 * k, waY - 0.6]]), "lining", { shade: 1, lc: "a" });
    const over = mPoly([[x0 - 4.4 * k, shY + 0.4], [x0 - 1.9 * k, shY + 0.4], [x0 + 1.4 * k, waY - 0.6], [x0 - 0.4 * k, waY - 0.6]]);
    p.paint(over, "lining", { shade: 1, lc: "a" });
    p.paint(mLine(x0 - 4.4 * k, shY + 0.6, x0 - 0.4 * k, waY - 0.8), "trim", { shade: 0, inline: false });   // gold edge on the over lapel
    if (outfit.extra === "scholar") p.paint(mRect(CX - 3.4, shY - 0.4, CX + 3.4, shY + 1.6), "trim", { shade: 1 });
  } else if (front) {
    p.paint(mRect(CX + 3.4 * s - 1.1, shY + 0.4, CX + 3.4 * s + 1.1, waY - 0.4), "lining", { shade: 1, lc: "a" });
  } else {
    p.paint(mRect(CX - 3.6 - 2.2 * s, shY - 0.4, CX + 3.6 - 2.2 * s, shY + 1.6), "lining", { shade: 1, lc: "a" });
  }

  // ---- near arm(s), then the shoulder mantle over them
  for (const a of arms) if (!(farBehind && a === arms[0])) paintArm(a);
  if (outfit.extra === "mantle") {
    const k = 0.58 + 0.42 * ac, mt = mPoly([[CX - (tw + 2.6) * k - 1, shY - 0.4], [CX + (tw + 2.6) * k + 1, shY - 0.4], [CX + (tw + 3.4) * k + 1, shY + 5.6],
      [CX + tw * 0.5, shY + 7.6], [CX - tw * 0.5, shY + 7.6], [CX - (tw + 3.4) * k - 1, shY + 5.6]]);
    p.paint(mt, "mantle");
    p.paint(mAnd(mt, mRect(0, shY + 5.2, W, shY + 8)), "trim", { shade: 0, inline: false });
  }

  // ---- head ---------------------------------------------------------------
  const capCx = CX, capCy = hy - 0.8, capRx = hair.kind === "waves" ? 11.6 : 11.2;
  if (!front) {
    if (backMass) p.paint(backMass, "hair");
    if (hair.kind === "hightie") p.paint(tieTail(), "hair");
  }
  const capMask = mEll(capCx, capCy, capRx, 10.4);
  p.paint(capMask, "hair");
  // crown light from the upper left: a crescent of lighter hair that the fringe and face later cut into
  p.paint(mAnd(capMask, mSub(mEll(CX - 2.4, hy - 5.6, 8.8, 5.0), mEll(CX - 0.6, hy - 3.0, 7.6, 4.6))), "hairhl", { shade: 0, inline: false });
  // strand lines on the long mass: dashed dark and light strokes that follow the fall of the hair
  if (backMass) {
    const hxc = front ? CX - 3.4 * s : CX - 2.6 * s, lines = newMask(), lo = newMask();
    for (let k = -3; k <= 3; k++) for (let y = hy + 9; y < HP.yb - 1; y++) {
      const x = Math.floor(hxc + k * 2.9 + hsw * (y - hy) / 40), t = (y + k * 3 + 12) % 8;
      if (x < 0 || x >= W) continue;
      if (t < 4) (k % 2 ? lines : lo)[y * W + x] = 1;
    }
    if (!front) for (let y = hy + 6; y < HP.yb - 2; y++) lo[y * W + Math.floor(hxc)] = 1;      // centre parting line
    p.paint(mAnd(backMass, mSub(lines, capMask)), "hairhl", { shade: 0, inline: false });
    p.paint(mAnd(backMass, mSub(lo, capMask)), "hairlo", { shade: 0, inline: false });
  }

  if (front) {
    const fx = CX + 6.2 * s, frx = 3.8 + 3.3 * cp, ey = Math.round(hy + 3.2);
    const fid = p.paint(mEll(fx, hy + 3.6, frx, 7.0), "skin", { shade: 1, lc: "T", band: 1 });
    // eyes: two when facing us, one in profile; the far eye is narrower in 3/4
    const eyeBmp = w => w === 3 ? ["eee", "ewe", "ooo"] : ["ee", "we", "oo"];
    const drawEye = (xc, w) => {
      const x0 = Math.round(xc - w / 2), bmp = eyeBmp(w);
      bmp.forEach((row, j) => [...row].forEach((ch, i) => p.dot(x0 + i, ey + j, ch, fid)));
    };
    const eyes = [-3.8, 3.8].map(bx => ({ x: proj(bx, 4.8), d: depth(bx, 4.8) })).sort((a, b) => b.d - a.d);
    drawEye(eyes[0].x, cs > 0.5 ? 3 : 2);
    if (cs >= 0.35) drawEye(eyes[1].x, cs > 0.9 ? 3 : 2);
    if (cs > 0.5) for (const bx of [-6.0, 6.0]) if (bx === -6.0 || cs > 0.9)
      for (let i = 0; i < 2; i++) p.dot(Math.round(proj(bx, 4.4)) - 1 + i, ey + 4, "B", fid);
    const mx = Math.floor(proj(0, 5.6) + 0.3 * s);
    p.dot(mx, Math.round(hy + 8.2), "m", fid);
    if (cs > 0.35) p.dot(mx - 1 + (s > 0 ? 0 : 1), Math.round(hy + 8.2), "m", fid);
    p.dot(Math.floor(proj(0, 6.0)), Math.round(hy + 6.4), cs > 0.35 ? "T" : "T", fid);
    if (cs < 0.35) p.dot(Math.floor(fx + frx * Math.sign(s)) - (s > 0 ? 0 : -1) + Math.sign(s), Math.round(hy + 6.4), "S", fid);   // nose tip past the profile line

    // fringe: lower edge height by hairstyle; tufts keep the forehead from reading as a bald dome
    const tuft = (x, period) => Math.abs(((x - fx + period / 2) % period + period) % period - period / 2) / (period / 2);
    const edge = x => {
      switch (HP.fringe) {
        case "hime": return hy + 0.4 + 1.8 * (1 - tuft(x, 4));
        case "blunt": return hy + 1.1 + 0.8 * (1 - tuft(x, 7));
        case "part": return hy - 2.0 + Math.min(Math.abs(x - fx) * 0.45, 3.4) + 0.9 * (1 - tuft(x, 4));
        case "swept": return hy - 3.0 + Math.max(0, x - fx + 6) * 0.22 + 0.8 * (1 - tuft(x, 5));
        default: return hy + 2.4 - (x - (fx - 7)) * 0.28 + 0.8 * (1 - tuft(x, 4));
      }
    };
    const fr = newMask();
    const cap = mEll(capCx, capCy, capRx, 10.4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cap[y * W + x] && y + 0.5 < edge(x + 0.5)) fr[y * W + x] = 1;
    p.paint(fr, "hair", { lc: "H" });

    // side locks hang beside the cheeks, near one first
    const locks = [-9.4, 9.4].map(bx => ({ bx, d: depth(bx, -1.0) })).sort((a, b) => a.d - b.d);
    for (const lk of locks) {
      if (lk.d < -0.3 && as >= 0.6) continue;                    // far lock hidden behind the head in profile
      const lx = proj(lk.bx, -1.0), wd = as >= 0.6 ? 3.2 : 3.0 - 0.6 * (lk.d < 0 ? 1 : 0), bot = hy + HP.side + hsw * 0.6;
      const wave = hair.kind === "waves" ? 1 : 0;
      const m = hair.kind === "bob"
        ? mOr(mRect(lx - wd / 2, hy + 0.5, lx + wd / 2, bot - 2), mEll(lx, bot - 2, wd / 2 + 0.6, 2.4))
        : mPoly([[lx - wd / 2, hy + 0.5], [lx + wd / 2, hy + 0.5], [lx + wd / 2 + wave * 0.6, hy + HP.side * 0.55], [lx + wd / 2 - wave * 0.6, bot - 2.5], [lx + hsw * 0.4, bot + 1.0], [lx - wd / 2 + wave * 0.6, bot - 2.5], [lx - wd / 2 - wave * 0.6, hy + HP.side * 0.55]]);
      p.paint(m, "hair", { lc: "H" });
    }
  }
  // knots on the crown
  if (hair.kind === "halfup") {
    const kx = CX - 1.5 * s;
    const bunId = p.paint(mEll(kx, hy - 11.4, 4.4, 3.4), "hair");
    p.dot(Math.floor(kx), Math.round(hy - 11), "G", bunId);
  } else if (hair.kind === "hightie") {
    const kx = CX - 2.6 * s;
    const tuftId = p.paint(mEll(kx, hy - 11.2, 3.6, 3.0), "hair");
    p.dot(Math.floor(kx), Math.round(hy - 9.6), "G", tuftId);
  }

  p.flush(c);
}

const groundShadow = c => {
  for (let y = 60; y < 64; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - CX) / 11.5, dyy = (y + 0.5 - 62.2) / 1.9;
    if (dx * dx + dyy * dyy <= 1) c.px(x, y, "q");
  }
};
const OPT = { w: W, h: H, pivot: [CX, FOOT] };

// ------------------------------------------------------------- exports ---
const basePreviewHair = HAIR[0], baseOutfit = OUTFITS[0];
for (const outfit of OUTFITS) {
  setPalette(outfit.id);
  sprite("human_preview_outfit_" + outfit.id, OPT, c => drawHuman(c, basePreviewHair, outfit, "s", "idle", 0));
  if (outfit === baseOutfit)
    for (const hair of HAIR)
      sprite("human_preview_hair_" + hair.id, OPT, c => drawHuman(c, hair, outfit, "s", "idle", 0));
  for (const hair of HAIR) for (const dir of DIRS) {
    const base = "human_" + hair.id + "_" + outfit.id;
    anim(base + "_idle_" + dir, { ...OPT, frames: 4, fps: 3 }, c => drawHuman(c, hair, outfit, dir, "idle", c.frame));
    anim(base + "_walk_" + dir, { ...OPT, frames: 8, fps: 10 }, c => drawHuman(c, hair, outfit, dir, "walk", c.frame));
  }
}
