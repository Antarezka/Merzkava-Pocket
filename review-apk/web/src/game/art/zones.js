// Hunting-area builder: one 24 x 40 tile map per zone, themed by a biome (palette, trees, clutter, weather, mood).
// No mobs live in the Home area; the Grinder only spawns in these maps.
import { createCanvas, mulberry32, fbm, TAU } from "./paint.js";
import { T, rgb, bakeGround, heightFor, TREE_SHAPES_ALL, WEED_PLANTS, FLOWER_PLANTS, REED_PLANTS } from "./world.js";
import { swayOf } from "./animate.js";
import { BIOMES, BIOME_OF_ZONE } from "../data/biomes.js";
import { ZONES, exitsOf, AREA_NAMES } from "../data/areas.js";

export const ZONE_DIM = { cols: 24, rows: 40, tile: 64 };
const dark = (h, k) => { const [r, g, b] = rgb(h); const m = (v) => Math.round(v * k).toString(16).padStart(2, "0"); return `#${m(r)}${m(g)}${m(b)}`; };
const recolourCache = new Map();
function recolour(img, filter, key) {
  if (!filter) return img; const k = key + "|" + filter; if (recolourCache.has(k)) return recolourCache.get(k);
  const c = createCanvas(img.width, img.height), x = c.getContext("2d"); if (!("filter" in x)) return img; x.filter = filter; x.drawImage(img, 0, 0); x.filter = "none"; recolourCache.set(k, c); return c;
}
/** every sprite name the zone maps can use (they are the same set as the Home map) */
export const ZONE_SPRITES = null;

export function buildZoneWorld(areaId, sprites, o = {}) {
  const seedBase = o.seed || 7, bid = o.biome || BIOME_OF_ZONE[areaId], zi = Math.max(0, ZONES.findIndex((z) => z.id === areaId)), zone = ZONES.find((z) => z.id === areaId) || null, B = BIOMES[bid], { cols, rows, tile } = ZONE_DIM, W = cols * tile, H = rows * tile;
  const rnd = mulberry32(seedBase * 977 + zi * 131), at = (c, r) => r * cols + c, tiles = new Uint8Array(cols * rows).fill(T.GRASS), blocked = new Uint8Array(cols * rows), props = [], occ = new Uint8Array(cols * rows);
  let uid = (zi + 2) * 1000;
  const noise = (c, r, s = 0.3, o = 11) => fbm(c * s, r * s, o + zi * 7, 3);
  // ---- terrain: meadow patches, forest wall, winding main road (south gate -> north gate)
  const roadC = (r) => 12 + 2.6 * Math.sin(r * 0.21 + zi) + 1.2 * Math.sin(r * 0.57 + 2 * zi);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let t = noise(c, r) > 0.58 ? T.MEADOW : T.GRASS; const edge = 1 + Math.floor(noise(c, r, 0.5, 40) * 2.2), top = 2 + Math.floor(noise(c, r, 0.5, 60) * 2);
    if (c <= edge || c >= cols - 1 - edge || r <= top) t = T.FOREST;
    if (B.water !== "none" && B.dirt) t = t; tiles[at(c, r)] = t;
  }
  // dirt patches (rockier biomes get more)
  const dirtK = /mountain|ashen|crimson/.test(bid) ? 0.62 : 0.74;
  for (let r = 4; r < rows - 2; r++) for (let c = 2; c < cols - 2; c++) if (tiles[at(c, r)] !== T.FOREST && noise(c, r, 0.22, 90) > dirtK) tiles[at(c, r)] = T.DIRT;
  // water
  const water = B.water, ford = (c, r) => Math.abs(c + 0.5 - roadC(r)) < 2.2;
  if (water === "river") {
    const rc = (c) => 15 + 1.6 * Math.sin(c * 0.4 + zi) + 0.7 * Math.sin(c * 0.95);
    for (let r = 4; r < rows - 4; r++) for (let c = 0; c < cols; c++) { const d = Math.abs(r + 0.5 - rc(c)); if (d < 1.3) tiles[at(c, r)] = ford(c, r) ? T.SHALLOW : T.WATER; else if (d < 2.0) tiles[at(c, r)] = T.SHALLOW; else if (d < 2.8 && tiles[at(c, r)] !== T.FOREST) tiles[at(c, r)] = T.BANK; }
  } else if (water === "pond") {
    const n = 1 + Math.floor(rnd() * 2); for (let k = 0; k < n; k++) { const pc = 4 + rnd() * (cols - 8), pr = 10 + rnd() * 18, rx = 2.2 + rnd() * 1.4, ry = 1.8 + rnd() * 1.2; if (Math.abs(pc - roadC(pr)) < rx + 3) continue;
      for (let r = Math.floor(pr - ry - 1); r <= pr + ry + 1; r++) for (let c = Math.floor(pc - rx - 1); c <= pc + rx + 1; c++) { if (c < 2 || c >= cols - 2 || r < 5 || r > rows - 5) continue; const d = Math.hypot((c + 0.5 - pc) / rx, (r + 0.5 - pr) / ry); if (d < 0.68) tiles[at(c, r)] = T.POND; else if (d < 1) tiles[at(c, r)] = T.BANK; } }
  } else if (water === "swamp") {
    for (let r = 5; r < rows - 4; r++) for (let c = 2; c < cols - 2; c++) { if (Math.abs(c + 0.5 - roadC(r)) < 2) continue; const n = noise(c, r, 0.26, 130); if (n > 0.66) tiles[at(c, r)] = T.POND; else if (n > 0.6) tiles[at(c, r)] = T.SHALLOW; else if (n > 0.5 && tiles[at(c, r)] !== T.FOREST) tiles[at(c, r)] = T.MUD; }
  }
  // road last, so it always cuts through
  for (let r = 0; r < rows; r++) { const rc = roadC(r); for (let c = 0; c < cols; c++) { const ct = tiles[at(c, r)]; if (ct === T.WATER || ct === T.POND || ct === T.SHALLOW) continue; const d = Math.abs(c + 0.5 - rc), w = r < 3 || r >= rows - 3 ? 2.6 : 1.5; if (d < w) tiles[at(c, r)] = r < 3 || r >= rows - 3 ? T.ROAD : (d < 0.9 ? T.ROAD : T.DIRT); } }
  { const e0 = exitsOf(areaId); for (let r = 18; r <= 24; r++) for (let k = 0; k < 5; k++) { if (e0.east) tiles[at(cols - 1 - k, r)] = k < 2 ? T.ROAD : T.DIRT; if (e0.west) tiles[at(k, r)] = k < 2 ? T.ROAD : T.DIRT; } }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const t = tiles[at(c, r)]; if (t === T.WATER || t === T.POND || t === T.FOREST) blocked[at(c, r)] = 1; }
  // ---- props
  const flt = B.trees.filter, bf = B.filter || flt || null, spr = (name) => { const i = sprites[name]; if (!i) return null; const f = /^tree_/.test(name) ? flt : bf; return f ? recolour(i, f, name) : i; };
  const add = (name, x, y, o = {}) => {
    const img = spr(name); if (!img) return null; const h = (o.h || heightFor(name)) * (o.s || 1), w = img.width * h / img.height, c = Math.floor(x / tile), r = Math.floor(y / tile);
    const p = { uid: uid++, kind: o.kind || "deco", variant: o.variant || name, name, x, y, w, h, sprite: img, c, r, blocking: !!o.blocking, node: o.node || null, removable: !!o.node, flip: !!o.flip, sway: swayOf(name), ph: ((uid * 2654435761) >>> 0) / 4294967295 * TAU };
    props.push(p); if (p.blocking && c >= 0 && r >= 0 && c < cols && r < rows) blocked[at(c, r)] = 1; return p;
  };
  const tt = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? -1 : tiles[at(c, r)]), pick = (a) => a[Math.floor(rnd() * a.length)];
  const tree = (x, y, big = 1) => { const shape = pick(B.trees.shapes), way = pick(B.trees.ways); return add(`${shape}_${way}`, x, y, { kind: "tree", s: big * (0.88 + rnd() * 0.3), flip: rnd() < 0.5, blocking: true, node: { kind: "tree", variant: shape === "tree_pine" ? "pine" : "broadleaf" } }); };
  const ex0 = exitsOf(areaId), gate = (c, r) => ((r <= 3 || r >= rows - 4) && Math.abs(c + 0.5 - roadC(r)) < 3.4) || ((ex0.east && c >= cols - 5 || ex0.west && c <= 4) && r >= 17 && r <= 25);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = tt(c, r), px = (c + 0.2 + rnd() * 0.6) * tile, py = (r + 0.6 + rnd() * 0.3) * tile; if (gate(c, r)) continue;
    if (t === T.FOREST) { if (rnd() < B.trees.wall) tree(px, py, 1.12); }
    else if (t !== T.ROAD && t !== T.POND && t !== T.WATER && t !== T.BANK && t !== T.SHALLOW && Math.abs(c + 0.5 - roadC(r)) > 2.4 && r > 4 && r < rows - 4 && rnd() < B.trees.inner) tree(px, py, 1.0);
  }
  const C = B.clutter, node = (kind, variant) => ({ kind, variant });
  for (let r = 5; r < rows - 3; r++) for (let c = 2; c < cols - 2; c++) {
    const t = tt(c, r); if (t === T.ROAD || t === T.POND || t === T.WATER || t === T.FOREST || t === T.SHALLOW || occ[at(c, r)] || Math.abs(c + 0.5 - roadC(r)) < 1.3) continue;
    const x = (c + 0.2 + rnd() * 0.6) * tile, y = (r + 0.55 + rnd() * 0.4) * tile; let q = rnd(), a = 0, hit = (p) => (q < (a += p || 0));
    if (hit(C.weed)) add(pick(WEED_PLANTS), x, y, { kind: "weed", node: node("weed", "weed") });
    else if (hit(C.rock)) add(pick(["rock_s1", "rock_s2", "rock_m1", "rock_m2"]), x, y, { kind: "rock", blocking: true, node: node("rock", "stone") });
    else if (hit(C.boulder)) add(pick(["rock_big_moss", "rock_cluster", "rock_tall"]), x, y, { kind: "boulder", blocking: true, node: node("boulder", "boulder") });
    else if (hit(C.log)) add(pick(["log", "log_hollow", "branch_dead", "sticks"]), x, y, { kind: "log", node: node("log", "log") });
    else if (hit(C.stump)) add("stump", x, y, { kind: "stump", blocking: true, node: node("stump", "stump") });
    else if (hit(C.bush)) add(pick(["bush_a", "bush_b", "bush_flower_a", "bush_flower_b", "bush_orange"]), x, y, { kind: "herb", node: node("herb", "bush") });
    else if (hit(C.flower)) add(pick(FLOWER_PLANTS), x, y, { kind: "herb", node: node("herb", "flower") });
    else if (hit(C.mush)) add(pick(["mushroom_red", "mushroom_brown", "mushroom_big"]), x, y, { kind: "herb", node: node("herb", "mushroom") });
    else if (hit(C.reed) && (t === T.BANK || t === T.MUD || t === T.MEADOW)) add(pick(REED_PLANTS), x, y, { kind: "reed", node: node("reed", "reed") });
    else if (hit(C.leaf)) add("leaf_pile", x, y, { kind: "deco" });
  }
  // stones across rivers / ponds
  if (water === "river") for (let c = 0; c < cols; c++) if (rnd() < 0.55) add(pick(["rock_s1", "rock_s2", "rock_flat", "pebble_big"]), (c + rnd()) * tile, (15 + 1.6 * Math.sin(c * 0.4 + zi) + 0.7 * Math.sin(c * 0.95)) * tile + (rnd() - 0.5) * 16, { kind: "river_rock" });
  // ---- exits (south = back, north = onward) and entry points
  const ex = exitsOf(areaId), exits = [], rc0 = Math.round(roadC(rows - 1)), rc1 = Math.round(roadC(0)), entries = { s: { c: Math.round(roadC(rows - 3)), r: rows - 3 }, n: { c: Math.round(roadC(3)), r: 3 }, e: { c: cols - 4, r: 21 }, w: { c: 3, r: 21 } };
  if (ex.south) exits.push({ id: "south", side: "s", to: ex.south, label: AREA_NAMES[ex.south], c0: rc0 - 2, r0: rows - 1, c1: rc0 + 2, r1: rows - 1 });
  if (ex.north) exits.push({ id: "north", side: "n", to: ex.north, label: AREA_NAMES[ex.north], c0: rc1 - 2, r0: 0, c1: rc1 + 2, r1: 0 });
  if (ex.east) exits.push({ id: "east", side: "e", to: ex.east, label: AREA_NAMES[ex.east], c0: cols - 1, r0: 19, c1: cols - 1, r1: 23 });
  if (ex.west) exits.push({ id: "west", side: "w", to: ex.west, label: AREA_NAMES[ex.west], c0: 0, r0: 19, c1: 0, r1: 23 });
  for (const e of exits) for (let r = e.r0; r <= e.r1; r++) for (let c = e.c0; c <= e.c1; c++) blocked[at(c, r)] = 0;
  if (zone && !ex.north) for (let c = rc1 - 3; c <= rc1 + 3; c++) for (let r = 0; r < 4; r++) blocked[at(c, r)] = 1;   // sealed gate in the last zone
  // ---- animated-environment data
  const lilies = []; if (!/frozen/.test(bid)) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (tt(c, r) === T.POND && tt(c - 1, r) === T.POND && tt(c, r - 1) === T.POND && rnd() < 0.35) lilies.push({ x: (c + 0.5) * tile, y: (r + 0.5) * tile, r: 10 + rnd() * 6, flower: rnd() < 0.2, ph: rnd() * 6, rot: rnd() * 6 });
  const col = B.pal, colb = col.map((h) => dark(h, 0.85)), lite = (h) => { const [r, g, b] = rgb(h); const m = (v) => Math.min(255, Math.round(v + (255 - v) * 0.22)); return `rgb(${m(r)},${m(g)},${m(b)})`; };
  const grass = { [T.GRASS]: [lite(col[0]), colb[0], 3], [T.MEADOW]: [lite(col[1]), colb[1], 3], [T.FOREST]: [lite(col[10]), colb[10], 2], [T.BANK]: [lite(col[6]), colb[6], 1] };
  if (/frozen|ashen|heaven/.test(bid)) for (const k in grass) grass[k][2] = 1;
  const ground = bakeGround(tiles, { dim: ZONE_DIM, col, colb, seed: zi });
  return {
    areaId, zone, biome: bid, mood: B.mood, noMobs: !zone, cols, rows, tile, width: W, height: H, ground, tiles, blocked, props, home: null, claim: null, exits, entries, spawn: entries.s, fishSpots: [],
    terrainAt: (c, r) => tt(c, r), lilies, grass, flow: [0.3, 1], waterTypes: [T.WATER, T.SHALLOW, T.POND], waterHi: /sunken|marsh/.test(bid) ? "190,255,240" : "235,248,245",
    amb: { ...B.amb, tone: B.tone || null }, roadC,
  };
}
