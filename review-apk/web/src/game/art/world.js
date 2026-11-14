// Home-map world: painted ground bake, river/pond, props from the traced sprite set, shack + facility drawings.
// Terrain ids: 0 grass,1 meadow,2 dirt,3 mud,4 water,5 shallows,6 bank,7 pond,8 yard,9 road,10 forest-edge
import { createCanvas, mulberry32, fbm, hash2, parseHex, TAU, smoothstep } from "./paint.js";

export const WORLD = { tile: 64, cols: 28, rows: 42 };
const T = { GRASS: 0, MEADOW: 1, DIRT: 2, MUD: 3, WATER: 4, SHALLOW: 5, BANK: 6, POND: 7, YARD: 8, ROAD: 9, FOREST: 10 };
const COL = ["#8d9a55", "#b3a65c", "#b98f63", "#7d5c47", "#3f7f8f", "#7fb0a4", "#a39663", "#4c8c8c", "#bda27a", "#c4a67c", "#66713f"];
const COLB = ["#6c8247", "#9a9050", "#9f7a52", "#654837", "#2f6577", "#5d9a94", "#8b7d52", "#3c7478", "#a38a65", "#a98c66", "#4d5a31"];
const rgb = (h) => parseHex(h);

const TREE_SHAPES = ["tree_round", "tree_dark", "tree_bonsai", "tree_pine", "tree_willow", "tree_blossom"];
const WAYS = ["orange_light", "orange_dark", "peach", "rust", "olive", "gold", "crimson", "plum"];
const TARGET_H = { tree: 196, pine: 232, willow: 206, bush: 58, plant: 42, rock_s: 46, rock_m: 74, rock_big: 112, rock_tall: 96, stump: 54, log: 46, log_hollow: 54, branch: 46, mush: 26, fence: 58, pebble: 28, leaf: 38, sticks: 30 };
const FLOWER_PLANTS = ["plant_19", "plant_22"], REED_PLANTS = ["plant_20", "plant_24", "plant_16"], WEED_PLANTS = ["plant_17", "plant_18", "plant_21", "plant_23", "plant_25", "plant_26", "plant_27", "plant_45", "plant_46", "plant_47", "plant_50", "plant_51"];

/** names of every sprite the home world can use (for preloading) */
export function worldSpriteNames() {
  const n = new Set(["bush_a", "bush_b", "bush_flower_a", "bush_flower_b", "bush_orange", "branch_dead", "fence_end", "fence_post", "leaf_pile", "log", "log_hollow", "mushroom_big", "mushroom_brown", "mushroom_red", "pebble_big", "rock_big_moss", "rock_cluster", "rock_flat", "rock_m1", "rock_m2", "rock_s1", "rock_s2", "rock_tall", "sticks", "stump", "tree_amber", "tree_fruit"]);
  [...FLOWER_PLANTS, ...REED_PLANTS, ...WEED_PLANTS].forEach((p) => n.add(p));
  for (const s of TREE_SHAPES) for (const w of WAYS) n.add(`${s}_${w}`);
  return [...n];
}

// ------------------------------------------------------------------ terrain layout
function riverCentre(c) { return 10.6 + 1.7 * Math.sin(c * 0.43 + 0.8) + 0.8 * Math.sin(c * 0.97 + 2.1); }
function buildTiles(rnd) {
  const { cols, rows } = WORLD, tiles = new Uint8Array(cols * rows).fill(T.GRASS), at = (c, r) => r * cols + c;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let t = T.GRASS; const rc = riverCentre(c), d = r + 0.5 - rc;
    if (r <= 3) t = T.FOREST;
    else if (Math.abs(d) < 1.25) t = T.WATER;
    else if (Math.abs(d) < 2.0) t = T.SHALLOW;
    else if (Math.abs(d) < 2.9) t = T.BANK;
    else if (d < 0) t = fbmTile(c, r) > 0.62 ? T.MEADOW : T.GRASS;
    else if (Math.hypot((c + 0.5 - 14) / 9.8, (r + 0.5 - 19.6) / 3.9) < 1) t = T.YARD;
    else if (r >= 23 && r <= 36) t = fbmTile(c, r) > 0.45 ? T.MEADOW : T.GRASS;
    else if (r >= 38) t = T.ROAD;
    else t = T.GRASS;
    tiles[at(c, r)] = t;
  }
  // winding mud path: yard door -> field -> road
  let c = 14; for (let r = 21; r <= 38; r++) { c += Math.round(Math.sin(r * 0.55) * 0.9 + (rnd() - 0.5) * 0.8); c = Math.max(8, Math.min(18, c)); for (const dc of [-1, 0, 1]) if (tiles[at(c + dc, r)] !== T.ROAD) tiles[at(c + dc, r)] = T.MUD; }
  // pond
  for (let r = 28; r <= 32; r++) for (let cc = 19; cc <= 24; cc++) { const dd = Math.hypot((cc - 21.5) / 2.9, (r - 30) / 2.4); if (dd < 1) tiles[at(cc, r)] = dd < 0.7 ? T.POND : T.BANK; }
  return tiles;
}
const fbmTile = (c, r) => fbm(c * 0.35, r * 0.35, 77, 3);

// ------------------------------------------------------------------ ground bake
function bakeGround(tiles) {
  const { cols, rows, tile } = WORLD, W = cols * tile, H = rows * tile, S = 4, lw = W / S, lh = H / S, N = 11;
  const weights = [];
  for (let t = 0; t < N; t++) {
    const small = createCanvas(cols, rows), sx = small.getContext("2d"), im = sx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) { const v = tiles[i] === t ? 255 : 0; im.data[i * 4] = v; im.data[i * 4 + 3] = 255; }
    sx.putImageData(im, 0, 0);
    const big = createCanvas(lw, lh), bx = big.getContext("2d"); bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = "high";
    bx.filter = "blur(14px)"; bx.drawImage(small, -0.5 * S * 4 / S * 0 + 0, 0, lw, lh); bx.filter = "none";
    weights.push(bx.getImageData(0, 0, lw, lh).data);
  }
  const low = createCanvas(lw, lh), lx = low.getContext("2d"), out = lx.createImageData(lw, lh), cs = COL.map(rgb), cb = COLB.map(rgb);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const wx = x * S, wy = y * S, n1 = fbm(wx / 90, wy / 90, 5, 4), n2 = fbm(wx / 22, wy / 22, 9, 3), warp = (fbm(wx / 60, wy / 60, 31, 3) - 0.5) * 0.35;
    let sw = 0, r = 0, g = 0, b = 0; const k = (y * lw + x) * 4;
    for (let t = 0; t < N; t++) {
      let w = weights[t][k] / 255 + (t === T.WATER || t === T.SHALLOW ? warp * 0.5 : warp); if (w < 0.0001) continue; w = Math.pow(Math.max(w, 0), 5);
      const m = n1 * 0.55 + n2 * 0.45, c0 = cs[t], c1 = cb[t], mix = smoothstep(0.3, 0.75, m);
      r += w * (c0[0] + (c1[0] - c0[0]) * mix); g += w * (c0[1] + (c1[1] - c0[1]) * mix); b += w * (c0[2] + (c1[2] - c0[2]) * mix); sw += w;
    }
    if (sw === 0) { sw = 1; r = 120; g = 150; b = 90; }
    // soft cloud shadow + warm light from the upper-left
    const sh = 0.93 + 0.14 * fbm(wx / 300 + 3, wy / 300, 101, 3), warm = 1 + 0.05 * (1 - wx / W);
    out.data[k] = Math.min(255, r / sw * sh * warm); out.data[k + 1] = Math.min(255, g / sw * sh); out.data[k + 2] = Math.min(255, b / sw * sh * (2 - warm)); out.data[k + 3] = 255;
  }
  lx.putImageData(out, 0, 0);
  const ground = createCanvas(W, H), gx = ground.getContext("2d"); gx.imageSmoothingEnabled = true; gx.imageSmoothingQuality = "high"; gx.drawImage(low, 0, 0, W, H);
  // painterly dabs over the soft base: short grass strokes and speckles per tile type
  const rnd = mulberry32(4242);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = tiles[r * cols + c]; if (t === T.WATER || t === T.SHALLOW || t === T.POND) continue;
    const grassy = t === T.GRASS || t === T.MEADOW || t === T.FOREST || t === T.BANK, n = grassy ? 9 : 4;
    for (let i = 0; i < n; i++) {
      const x = (c + rnd()) * tile, y = (r + rnd()) * tile, dark = rnd() < 0.5;
      gx.strokeStyle = (dark ? COLB[t] : COL[t]); gx.globalAlpha = 0.35; gx.lineWidth = 1.4 + rnd() * 1.4; gx.lineCap = "round";
      if (grassy) { gx.beginPath(); gx.moveTo(x, y); gx.quadraticCurveTo(x + (rnd() - 0.5) * 6, y - 5 - rnd() * 5, x + (rnd() - 0.5) * 10, y - 8 - rnd() * 8); gx.stroke(); }
      else { gx.beginPath(); gx.arc(x, y, 1 + rnd() * 2.2, 0, TAU); gx.fillStyle = dark ? COLB[t] : COL[t]; gx.fill(); }
    }
  }
  gx.globalAlpha = 1;
  // pond/river shimmer base lines and darker depth in the middle of the river
  gx.globalAlpha = 0.18; gx.strokeStyle = "#102c3a"; gx.lineWidth = 26; gx.lineCap = "round"; gx.beginPath();
  for (let c = 0; c <= cols; c += 0.5) { const x = c * tile, y = riverCentre(c) * tile; c === 0 ? gx.moveTo(x, y) : gx.lineTo(x, y); } gx.stroke(); gx.globalAlpha = 1;
  return ground;
}

// ------------------------------------------------------------------ props
export function buildHomeWorld(sprites, seed = 1337) {
  const { cols, rows, tile } = WORLD, W = cols * tile, H = rows * tile, rnd = mulberry32(seed), tiles = buildTiles(rnd), at = (c, r) => r * cols + c;
  const blocked = new Uint8Array(cols * rows), props = [], occ = new Uint8Array(cols * rows); let uid = 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const t = tiles[at(c, r)]; if (t === T.WATER || t === T.POND || t === T.FOREST) blocked[at(c, r)] = 1; if (c === 0 || c === cols - 1 || r === rows - 1) { /* rim walkable only at exits */ } }
  // far bank (north of the river) can't be reached: block everything north of the bank line
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (r + 0.5 < riverCentre(c) - 1.25) blocked[at(c, r)] = 1;
  const spr = (name) => sprites[name];
  const heightFor = (name) => TARGET_H[name.startsWith("tree_pine") ? "pine" : name.startsWith("tree_willow") ? "willow" : name.startsWith("tree_") ? "tree" : name.startsWith("bush_") ? "bush" : name.startsWith("plant_") ? "plant" : name === "rock_s1" || name === "rock_s2" ? "rock_s" : name === "rock_tall" ? "rock_tall" : name === "rock_big_moss" || name === "rock_cluster" ? "rock_big" : name.startsWith("rock") ? "rock_m" : name.startsWith("mushroom") ? "mush" : name === "log_hollow" ? "log_hollow" : name === "log" ? "log" : name === "stump" ? "stump" : name === "branch_dead" ? "branch" : name.startsWith("fence") ? "fence" : name === "pebble_big" ? "pebble" : name === "leaf_pile" ? "leaf" : "sticks"] || 50;
  const add = (name, x, y, o = {}) => {
    const img = spr(name); if (!img) return null; const h = (o.h || heightFor(name)) * (o.s || 1), w = img.width * h / img.height, c = Math.floor(x / tile), r = Math.floor(y / tile);
    const p = { uid: uid++, kind: o.kind || "deco", variant: o.variant || name, name, x, y, w, h, sprite: img, c, r, blocking: !!o.blocking, node: o.node || null, removable: !!o.node, flip: !!o.flip };
    props.push(p); if (p.blocking && c >= 0 && r >= 0 && c < cols && r < rows) blocked[at(c, r)] = 1; return p;
  };
  const tileType = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? -1 : tiles[at(c, r)]);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const tree = (x, y, big = 1) => { const shape = rnd() < 0.18 ? "tree_pine" : pick(TREE_SHAPES), way = pick(WAYS); return add(`${shape}_${way}`, x, y, { kind: "tree", s: big * (0.88 + rnd() * 0.3), flip: rnd() < 0.5, blocking: true, node: { kind: "tree", variant: shape === "tree_pine" ? "pine" : "broadleaf" } }); };
  const home = { c: 12, r: 17, w: 5, h: 4 }; // starter shack footprint (tiles)
  const free = (c, r, pad = 0) => { for (let dr = -pad; dr <= pad; dr++) for (let dc = -pad; dc <= pad; dc++) { const t = tileType(c + dc, r + dr); if (t === T.WATER || t === T.POND || t === -1 || occ[at(c + dc, r + dr)]) return false; } return true; };
  const inHome = (c, r, m = 1) => c >= home.c - m && c < home.c + home.w + m && r >= home.r - m && r < home.r + home.h + m + 1;
  // forest wall (north) + far bank trees + river bank trees
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = tiles[at(c, r)], px = (c + 0.2 + rnd() * 0.6) * tile, py = (r + 0.6 + rnd() * 0.3) * tile;
    if (t === T.FOREST && rnd() < 0.62) tree(px, py, 1.15);
    else if (r + 0.5 < riverCentre(c) - 2.9 && r > 3 && (t === T.GRASS || t === T.MEADOW) && rnd() < 0.2) tree(px, py, 1.0);
  }
  // trees around the yard / field margins (leave a clear lane in the middle)
  for (let r = 16; r < 38; r++) for (let c = 0; c < cols; c++) {
    const edge = c <= 2 || c >= 25; const t = tileType(c, r); if (t === T.MUD || t === T.ROAD || t === T.POND || t === T.BANK || inHome(c, r, 2)) continue;
    if (edge && rnd() < 0.34) tree((c + 0.3 + rnd() * 0.4) * tile, (r + 0.8) * tile, 1.05);
  }
  // river: stepping stones from edge to edge, reeds on both banks, boulders
  for (let c = 0; c < cols; c += 1) { const y = riverCentre(c) * tile + (rnd() - 0.5) * 18, name = rnd() < 0.6 ? pick(["rock_s1", "rock_s2", "rock_flat", "pebble_big"]) : "rock_m1"; if (rnd() < 0.55) add(name, (c + rnd()) * tile, y, { kind: "river_rock", blocking: false }); }
  for (let c = 0; c < cols; c++) for (const side of [-1, 1]) if (rnd() < 0.45) { const y = (riverCentre(c) + side * (1.9 + rnd() * 0.8)) * tile; add(pick(REED_PLANTS), (c + rnd()) * tile, y, { kind: "reed", node: { kind: "reed", variant: "reed" } }); }
  // field clutter: weeds, rocks, logs, stumps, bushes, flowers
  for (let r = 23; r <= 37; r++) for (let c = 2; c <= 25; c++) {
    const t = tileType(c, r); if (t === T.MUD || t === T.ROAD || t === T.POND || t === T.BANK || occ[at(c, r)] || inHome(c, r, 1)) continue;
    const x = (c + 0.2 + rnd() * 0.6) * tile, y = (r + 0.55 + rnd() * 0.4) * tile, q = rnd();
    if (q < 0.30) add(pick(WEED_PLANTS), x, y, { kind: "weed", node: { kind: "weed", variant: "weed" } });
    else if (q < 0.355) add(pick(["rock_s1", "rock_s2", "rock_m1", "rock_m2"]), x, y, { kind: "rock", blocking: true, node: { kind: "rock", variant: "stone" } });
    else if (q < 0.375) add(pick(["rock_big_moss", "rock_cluster", "rock_tall"]), x, y, { kind: "boulder", blocking: true, node: { kind: "boulder", variant: "boulder" } });
    else if (q < 0.405) add(pick(["log", "log_hollow", "branch_dead", "sticks"]), x, y, { kind: "log", blocking: false, node: { kind: "log", variant: "log" } });
    else if (q < 0.43) add("stump", x, y, { kind: "stump", blocking: true, node: { kind: "stump", variant: "stump" } });
    else if (q < 0.46) add(pick(["bush_a", "bush_b", "bush_flower_a", "bush_flower_b", "bush_orange"]), x, y, { kind: "herb", node: { kind: "herb", variant: "bush" } });
    else if (q < 0.49) add(pick(FLOWER_PLANTS), x, y, { kind: "herb", node: { kind: "herb", variant: "flower" } });
    else if (q < 0.505) add(pick(["mushroom_red", "mushroom_brown", "mushroom_big"]), x, y, { kind: "herb", node: { kind: "herb", variant: "mushroom" } });
    else if (q < 0.53) add("leaf_pile", x, y, { kind: "deco" });
  }
  // yard decoration (fence posts around the shack, flowers) — kept sparse so facilities fit
  for (let c = 4; c <= 23; c += 1) if (c < home.c - 1 || c > home.c + home.w) { if (rnd() < 0.5) add("fence_post", (c + 0.5) * tile, 16.3 * tile, { kind: "deco" }); }
  for (let i = 0; i < 12; i++) { const c = 4 + Math.floor(rnd() * 20), r = 16 + Math.floor(rnd() * 7); if (!inHome(c, r, 1) && tileType(c, r) === T.YARD) add(pick(FLOWER_PLANTS), (c + rnd()) * tile, (r + 0.8) * tile, { kind: "deco" }); }
  // starter shack goes in as its own prop (drawn by drawHouse, placed by the engine)
  const homeDef = { uid: uid++, x: (home.c + home.w / 2) * tile, y: (home.r + home.h) * tile, c: home.c, r: home.r, fc: home.w, fr: home.h, doorC: home.c + 2, doorR: home.r + home.h };
  for (let r = home.r; r < home.r + home.h; r++) for (let c = home.c; c < home.c + home.w; c++) { blocked[at(c, r)] = 1; occ[at(c, r)] = 1; }
  // exits (placeholders, "coming soon")
  const exits = [{ id: "west", label: "Western Road", c0: 0, r0: 24, c1: 0, r1: 30 }, { id: "east", label: "Eastern Road", c0: cols - 1, r0: 24, c1: cols - 1, r1: 30 }, { id: "south", label: "Southern Road", c0: 9, r0: rows - 1, c1: 18, r1: rows - 1 }];
  for (const e of exits) for (let r = e.r0; r <= e.r1; r++) for (let c = e.c0; c <= e.c1; c++) blocked[at(c, r)] = 0;
  const fishSpots = []; for (let c = 3; c < cols - 3; c += 3) fishSpots.push({ c, r: Math.round(riverCentre(c) + 1.5) });
  const ground = bakeGround(tiles);
  // water ripples (animated overlay)
  const ripples = []; const rr = mulberry32(seed + 9);
  for (let i = 0; i < 90; i++) { const c = rr() * cols, y = (riverCentre(c) + (rr() - 0.5) * 2.2) * tile; ripples.push({ x: c * tile, y, ph: rr() * TAU, sp: 0.5 + rr() * 0.8, w: 18 + rr() * 26 }); }
  for (let i = 0; i < 14; i++) ripples.push({ x: (19.5 + rr() * 4) * tile, y: (28.5 + rr() * 3) * tile, ph: rr() * TAU, sp: 0.4 + rr(), w: 12 + rr() * 16 });
  const world = {
    cols, rows, tile, width: W, height: H, ground, tiles, blocked, props, home: homeDef, claim: { c0: 3, r0: 15, c1: 24, r1: 36 }, exits, spawn: { c: 14, r: 23 }, fishSpots,
    terrainAt: (c, r) => tileType(c, r),
    drawWater(ctx, time, camX, camY, vw, vh) {
      ctx.save(); ctx.strokeStyle = "rgba(235,248,240,0.55)"; ctx.lineCap = "round";
      for (const p of ripples) { const sx = p.x - camX, sy = p.y - camY; if (sx < -60 || sx > vw + 60 || sy < -30 || sy > vh + 30) continue; const k = (Math.sin(time * p.sp + p.ph) + 1) / 2; ctx.globalAlpha = 0.15 + 0.5 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - p.w / 2, sy + k * 3); ctx.quadraticCurveTo(sx, sy - 4 + k * 4, sx + p.w / 2, sy + k * 3); ctx.stroke(); }
      ctx.restore();
    },
    drawAmbient(ctx, time, camX, camY, vw, vh) {
      ctx.save(); for (let i = 0; i < 26; i++) { const sp = 12 + (i % 5) * 5, x = ((i * 137.5 + time * sp) % (vw + 80)) - 40, y = ((i * 91.3 + time * (6 + (i % 4) * 3) + Math.sin(time * 0.7 + i) * 30) % (vh + 60)) - 30; ctx.globalAlpha = 0.55; ctx.fillStyle = i % 3 ? "#e8a54e" : "#d0643a"; ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.8 + i); ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.1, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.restore();
    },
  };
  return world;
}

// ------------------------------------------------------------------ buildings (painted with canvas, gouache style)
function ink(ctx, w = 3) { ctx.strokeStyle = "rgba(58,42,60,0.8)"; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round"; }
function plank(ctx, x, y, w, h, base, seed) {
  const g = ctx.createLinearGradient(x, y, x, y + h); const [r, gg, b] = rgb(base); g.addColorStop(0, `rgb(${Math.min(255, r + 22)},${Math.min(255, gg + 18)},${Math.min(255, b + 14)})`); g.addColorStop(1, `rgb(${r - 18},${gg - 16},${b - 14})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "rgba(50,34,30,0.35)"; ctx.lineWidth = 1.4;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); ctx.stroke(); }
  for (let i = 0; i < 5; i++) { const px = x + hash2(i, seed, 3) * w, py = y + hash2(i, seed, 5) * h; ctx.fillStyle = "rgba(50,34,30,0.25)"; ctx.fillRect(px, py, 3, 1.5); }
}
function roofShape(ctx, x, y, w, h, c1, c2, tiles) {
  ctx.beginPath(); ctx.moveTo(x - w * 0.08, y + h); ctx.lineTo(x + w * 0.5, y); ctx.lineTo(x + w * 1.08, y + h); ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill(); ink(ctx, 3); ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle = "rgba(40,26,30,0.28)"; ctx.lineWidth = 1.6; for (let i = 1; i <= tiles; i++) { const yy = y + h * i / (tiles + 1); ctx.beginPath(); ctx.moveTo(x - 10, yy); ctx.lineTo(x + w + 10, yy); ctx.stroke(); } ctx.restore();
}
/** level 1 stilt shack, 2 cottage, 3 courtyard house. Pivot at bottom centre; footprint fc x fr tiles */
export function drawHouse(level = 1) {
  const T64 = 64, fc = 5, fr = 4, w = fc * T64 + 40, h = 330, c = createCanvas(w, h), x = c.getContext("2d");
  const cx = w / 2; x.save();
  // soft contact shadow
  x.fillStyle = "rgba(30,24,40,0.28)"; x.beginPath(); x.ellipse(cx + 12, h - 28, 150, 36, 0, 0, TAU); x.fill();
  const wall = level >= 2 ? "#c9b08a" : "#9d7a58", roof1 = level >= 3 ? "#9c4c3a" : level >= 2 ? "#a65a40" : "#7a8450", roof2 = level >= 3 ? "#6c3028" : level >= 2 ? "#74392c" : "#566038";
  const bx = cx - 108, by = h - 150, bw = 216, bh = 94;
  // stilts + deck
  for (const px of [bx + 8, bx + 62, bx + 154, bx + 206]) { plank(x, px - 6, by + bh - 4, 12, 46, "#7a5a40", px); ink(x, 2); x.strokeRect(px - 6, by + bh - 4, 12, 46); }
  plank(x, bx - 14, by + bh - 10, bw + 28, 14, "#a98660", 4); ink(x, 2.4); x.strokeRect(bx - 14, by + bh - 10, bw + 28, 14);
  // wall
  plank(x, bx, by, bw, bh, wall, 9); ink(x, 3); x.strokeRect(bx, by, bw, bh);
  // door + window
  x.fillStyle = "#4a3326"; x.beginPath(); x.roundRect(cx - 18, by + 26, 36, bh - 26, [18, 18, 0, 0]); x.fill(); ink(x, 2.6); x.stroke();
  x.fillStyle = "#f2d889"; x.globalAlpha = 0.85; x.fillRect(bx + 22, by + 26, 34, 30); x.globalAlpha = 1; ink(x, 2.4); x.strokeRect(bx + 22, by + 26, 34, 30); x.beginPath(); x.moveTo(bx + 39, by + 26); x.lineTo(bx + 39, by + 56); x.stroke();
  x.fillStyle = "#f2d889"; x.globalAlpha = 0.8; x.fillRect(bx + bw - 56, by + 26, 34, 30); x.globalAlpha = 1; x.strokeRect(bx + bw - 56, by + 26, 34, 30);
  // roof
  roofShape(x, bx - 20, by - 78, bw + 40, 84, roof1, roof2, 4);
  if (level >= 2) { x.fillStyle = "#5a4034"; x.fillRect(bx + bw - 40, by - 70, 20, 40); ink(x, 2.4); x.strokeRect(bx + bw - 40, by - 70, 20, 40); }
  // steps + lantern
  plank(x, cx - 24, by + bh + 4, 48, 10, "#a98660", 3); ink(x, 2); x.strokeRect(cx - 24, by + bh + 4, 48, 10);
  x.fillStyle = "#e9b04a"; x.beginPath(); x.arc(bx - 4, by + 50, 6, 0, TAU); x.fill(); ink(x, 2); x.stroke();
  x.restore(); return { canvas: c, w, h, fc, fr };
}
export function facilityFootprint(facility) { const n = `${facility?.name || ""} ${facility?.category || ""}`.toLowerCase(); return /(hall|manor|workshop|mill|forge|kiln|barn|stable)/.test(n) ? { w: 3, h: 2 } : /(shrine|pavilion|greenhouse|house)/.test(n) ? { w: 2, h: 2 } : { w: 1, h: 1 }; }
/** painted placeholder facility: roof + body in a family colour; pivot bottom centre */
export function drawFacility(facility, level = 1) {
  const fp = facilityFootprint(facility), seed = [...String(facility?.id || facility?.name || "f")].reduce((a, ch) => a + ch.charCodeAt(0), 0), pal = ["#a65a40", "#6d8a5a", "#4f7f8e", "#b08a3c", "#7a5a8a", "#8a4c4c"];
  const w = fp.w * 64 + 16, h = fp.h * 64 + 64 + level * 6, c = createCanvas(w, h), x = c.getContext("2d");
  x.fillStyle = "rgba(30,24,40,0.25)"; x.beginPath(); x.ellipse(w / 2 + 6, h - 14, w * 0.42, 14, 0, 0, TAU); x.fill();
  const bw = w - 24, bh = 38 + fp.h * 22;
  plank(x, 12, h - bh - 10, bw, bh, "#a98660", seed); ink(x, 2.6); x.strokeRect(12, h - bh - 10, bw, bh);
  roofShape(x, 4, h - bh - 62, w - 8, 62, pal[seed % pal.length], "#4b3436", 3);
  x.fillStyle = "#3d2b25"; x.beginPath(); x.roundRect(w / 2 - 12, h - 54, 24, 44, [12, 12, 0, 0]); x.fill(); ink(x, 2); x.stroke();
  return { canvas: c, w, h, fc: fp.w, fr: fp.h };
}
export function drawConstructionSite(fc, fr) {
  const w = fc * 64, h = fr * 64 + 80, c = createCanvas(w, h), x = c.getContext("2d"); ink(x, 3);
  for (let i = 0; i <= fc; i++) { const px = 8 + i * (w - 16) / fc; x.strokeStyle = "#7a5a40"; x.lineWidth = 5; x.beginPath(); x.moveTo(px, h - 8); x.lineTo(px, h - 70); x.stroke(); }
  x.strokeStyle = "#9d7a58"; x.lineWidth = 4; x.beginPath(); x.moveTo(8, h - 70); x.lineTo(w - 8, h - 70); x.moveTo(8, h - 36); x.lineTo(w - 8, h - 36); x.moveTo(8, h - 8); x.lineTo(w - 8, h - 70); x.stroke(); return c;
}
export function drawCart() {
  const w = 150, h = 120, c = createCanvas(w, h), x = c.getContext("2d");
  x.fillStyle = "rgba(30,24,40,0.28)"; x.beginPath(); x.ellipse(w / 2 + 6, h - 10, 62, 10, 0, 0, TAU); x.fill();
  roofShape(x, 14, 8, 118, 40, "#c0503a", "#8a3326", 2);
  plank(x, 24, 48, 98, 38, "#a98660", 11); ink(x, 2.6); x.strokeRect(24, 48, 98, 38);
  for (const px of [38, 108]) { x.fillStyle = "#5a4034"; x.beginPath(); x.arc(px, h - 22, 18, 0, TAU); x.fill(); ink(x, 2.4); x.stroke(); x.fillStyle = "#c8a46a"; x.beginPath(); x.arc(px, h - 22, 6, 0, TAU); x.fill(); }
  x.fillStyle = "#e2a64a"; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(36 + i * 18, 54, 7, 0, TAU); x.fill(); }
  return { canvas: c, w, h };
}
export function drawMarker(kind = "ping") { const s = 96, c = createCanvas(s, s), x = c.getContext("2d"); x.strokeStyle = kind === "target" ? "#f2d889" : "#fff4cf"; x.lineWidth = 4; x.beginPath(); x.ellipse(s / 2, s / 2, 30, 18, 0, 0, TAU); x.stroke(); if (kind === "sparkle") { x.fillStyle = "#fff4cf"; x.beginPath(); x.moveTo(s / 2, 14); x.lineTo(s / 2 + 6, s / 2); x.lineTo(s / 2, s - 14); x.lineTo(s / 2 - 6, s / 2); x.fill(); } return c; }
